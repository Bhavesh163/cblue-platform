import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private async resolveLinkedUserIds(userRef: string) {
    const fallbackId = String(userRef || '').trim();
    if (!fallbackId) return [] as string[];

    const user = await this.prisma.user.findUnique({
      where: { id: fallbackId },
      select: { id: true, subscriberId: true, email: true },
    });

    if (!user) {
      const linkedIds = new Set<string>();

      const bySubscriberId = await this.prisma.user.findMany({
        where: { subscriberId: fallbackId },
        select: { id: true },
      });
      bySubscriberId.forEach((item) => linkedIds.add(item.id));

      const normalizedFallbackEmail = this.normalizeEmail(fallbackId);
      if (normalizedFallbackEmail) {
        const byEmail = await this.prisma.user.findMany({
          where: {
            email: {
              equals: normalizedFallbackEmail,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });
        byEmail.forEach((item) => linkedIds.add(item.id));
      }

      if (linkedIds.size === 0) linkedIds.add(fallbackId);
      return Array.from(linkedIds);
    }

    const linkedIds = new Set<string>([user.id]);

    if (user.subscriberId) {
      const bySubscriberId = await this.prisma.user.findMany({
        where: { subscriberId: user.subscriberId },
        select: { id: true },
      });
      bySubscriberId.forEach((item) => linkedIds.add(item.id));
    }

    const normalizedEmail = this.normalizeEmail(user.email);
    if (normalizedEmail) {
      const byEmail = await this.prisma.user.findMany({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      byEmail.forEach((item) => linkedIds.add(item.id));
    }

    return Array.from(linkedIds);
  }

  async create(
    currentUser: { id?: string; email?: string; phone?: string } | undefined,
    dto: CreatePropertyDto,
  ) {
    let userId = currentUser?.id?.trim() || '';
    try {
      try {
        userId = (await this.resolveCreateUserId(currentUser, dto)) || '';
      } catch (resolveError) {
        this.logger.error(
          `Error resolving user ID for property create: ${resolveError instanceof Error ? resolveError.message : String(resolveError)}`,
          resolveError instanceof Error ? resolveError.stack : undefined,
        );
        throw new BadRequestException(
          'Could not resolve your account. Please log out and log in again.',
        );
      }
      if (!userId) {
        throw new NotFoundException(
          'User account not found. Please log out and log in again.',
        );
      }

      // Verify the user exists before attempting insert (prevents FK constraint 500)
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!userExists) {
        throw new NotFoundException(
          'User account not found. Please log out and log in again.',
        );
      }
      const property = await this.prisma.property.create({
        data: {
          userId,
          propertyType: dto.propertyType,
          listingType: dto.listingType,
          tier: dto.tier,
          title: dto.title,
          description: dto.description ?? '',
          price: dto.price,
          area: dto.area,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          floors: dto.floors,
          province: dto.province ?? '',
          district: dto.district ?? '',
          subdistrict: dto.subdistrict,
          postalCode: dto.postalCode,
          addressLine: dto.addressLine,
          latitude: dto.latitude,
          longitude: dto.longitude,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          features: dto.features as Prisma.InputJsonValue,
          yearBuilt: dto.yearBuilt,
        },
        include: { images: true },
      });

      if (dto.images && dto.images.length > 0) {
        await this.prisma.propertyImage.createMany({
          data: dto.images.map((img, idx) => ({
            propertyId: property.id,
            url: img.url,
            key: img.key || `property/${property.id}/image-${idx + 1}`,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        });
        return this.prisma.property.findUnique({
          where: { id: property.id },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        });
      }

      return property;
    } catch (err) {
      // Re-throw HttpExceptions (NotFoundException, etc.) as-is
      if (err instanceof HttpException) throw err;

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `Prisma known error [${err.code}] creating property for user ${userId}: ${err.message}`,
        );
        if (err.code === 'P2003') {
          throw new BadRequestException(
            'Invalid user reference. Please log out and log in again.',
          );
        }
        throw new BadRequestException(
          `Database error [${err.code}]. Please try again or contact support.`,
        );
      }
      if (err instanceof Prisma.PrismaClientValidationError) {
        this.logger.error(
          `Prisma validation error for user ${userId}: ${err.message}`,
        );
        throw new BadRequestException(
          'Invalid property data. Please check all fields and try again.',
        );
      }
      // Any other unexpected error — log with type so we can diagnose from user reports
      const errType = err instanceof Error ? err.constructor.name : typeof err;
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Unexpected error [${errType}] creating property for user ${userId}: ${errMsg}`,
      );
      throw new InternalServerErrorException(
        `Property creation failed [${errType}]. Please try again or contact support.`,
      );
    }
  }

  private async resolveCreateUserId(
    currentUser: { id?: string; email?: string; phone?: string } | undefined,
    dto: CreatePropertyDto,
  ) {
    const currentUserId = currentUser?.id?.trim() || '';
    const currentEmail = currentUser?.email?.trim().toLowerCase() || '';
    const currentPhone = currentUser?.phone?.trim() || '';
    const contactEmail = dto.contactEmail?.trim().toLowerCase() || '';
    const contactPhone = dto.contactPhone?.trim() || '';

    const sameIdentity =
      (!!currentEmail && !!contactEmail && currentEmail === contactEmail) ||
      (!!currentPhone && !!contactPhone && currentPhone === contactPhone);

    if (!sameIdentity) {
      return currentUserId || null;
    }

    try {
      let subscriber = contactEmail
        ? await this.prisma.subscriber.findUnique({
            where: { email: contactEmail },
            select: {
              id: true,
              email: true,
              phone: true,
              name: true,
              company: true,
            },
          })
        : null;

      if (!subscriber && contactPhone) {
        const phoneMatches = await this.prisma.subscriber.findMany({
          where: { phone: contactPhone },
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            company: true,
          },
          take: 2,
        });

        if (phoneMatches.length > 1) {
          this.logger.warn(
            `Property create found ambiguous subscriber phone match for ${contactPhone}; keeping current user bridge`,
          );
          return currentUserId || null;
        }

        subscriber = phoneMatches[0] ?? null;
      }

      if (!subscriber) {
        return currentUserId || null;
      }

      let canonicalUser = await this.prisma.user.findUnique({
        where: { subscriberId: subscriber.id },
        select: {
          id: true,
          subscriberId: true,
          email: true,
          phone: true,
          name: true,
          company: true,
        },
      });

      if (!canonicalUser) {
        canonicalUser = await this.prisma.user.findUnique({
          where: { email: subscriber.email },
          select: {
            id: true,
            subscriberId: true,
            email: true,
            phone: true,
            name: true,
            company: true,
          },
        });
      }

      if (canonicalUser && canonicalUser.subscriberId !== subscriber.id) {
        try {
          canonicalUser = await this.prisma.user.update({
            where: { id: canonicalUser.id },
            data: {
              subscriberId: subscriber.id,
              email: canonicalUser.email || subscriber.email,
              phone: canonicalUser.phone || subscriber.phone || undefined,
              name: canonicalUser.name || subscriber.name,
              company: canonicalUser.company || subscriber.company,
            },
            select: {
              id: true,
              subscriberId: true,
              email: true,
              phone: true,
              name: true,
              company: true,
            },
          });
        } catch (error) {
          this.logger.warn(
            `Property create canonical bridge update retry for ${subscriber.email}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
          if (!canonicalUser.phone && subscriber.phone) {
            try {
              canonicalUser = await this.prisma.user.update({
                where: { id: canonicalUser.id },
                data: {
                  subscriberId: subscriber.id,
                  email: canonicalUser.email || subscriber.email,
                  name: canonicalUser.name || subscriber.name,
                  company: canonicalUser.company || subscriber.company,
                },
                select: {
                  id: true,
                  subscriberId: true,
                  email: true,
                  phone: true,
                  name: true,
                  company: true,
                },
              });
            } catch (retryError) {
              this.logger.warn(
                `Property create canonical bridge update without phone retry for ${subscriber.email}: ${retryError instanceof Error ? retryError.message : 'unknown error'}`,
              );
            }
          }
        }
      }

      if (!canonicalUser && currentUserId) {
        try {
          canonicalUser = await this.prisma.user.update({
            where: { id: currentUserId },
            data: {
              subscriberId: subscriber.id,
              email: currentEmail || subscriber.email,
              phone: currentPhone || subscriber.phone || undefined,
              name: subscriber.name,
              company: subscriber.company,
            },
            select: {
              id: true,
              subscriberId: true,
              email: true,
              phone: true,
              name: true,
              company: true,
            },
          });
        } catch (error) {
          this.logger.warn(
            `Property create bridge update retry for ${subscriber.email}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
          if (!currentPhone && subscriber.phone) {
            try {
              canonicalUser = await this.prisma.user.update({
                where: { id: currentUserId },
                data: {
                  subscriberId: subscriber.id,
                  email: currentEmail || subscriber.email,
                  name: subscriber.name,
                  company: subscriber.company,
                },
                select: {
                  id: true,
                  subscriberId: true,
                  email: true,
                  phone: true,
                  name: true,
                  company: true,
                },
              });
            } catch (retryError) {
              this.logger.warn(
                `Property create bridge update without phone retry for ${subscriber.email}: ${retryError instanceof Error ? retryError.message : 'unknown error'}`,
              );
            }
          }
        }
      }

      if (!canonicalUser) {
        try {
          canonicalUser = await this.prisma.user.create({
            data: {
              email: subscriber.email,
              phone: subscriber.phone || undefined,
              name: subscriber.name,
              company: subscriber.company,
              subscriberId: subscriber.id,
              role: 'USER',
            },
            select: {
              id: true,
              subscriberId: true,
              email: true,
              phone: true,
              name: true,
              company: true,
            },
          });
        } catch (error) {
          this.logger.warn(
            `Property create bridge create retry for ${subscriber.email}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
          try {
            canonicalUser = await this.prisma.user.create({
              data: {
                email: subscriber.email,
                name: subscriber.name,
                company: subscriber.company,
                subscriberId: subscriber.id,
                role: 'USER',
              },
              select: {
                id: true,
                subscriberId: true,
                email: true,
                phone: true,
                name: true,
                company: true,
              },
            });
          } catch (retryError) {
            this.logger.warn(
              `Property create bridge create without phone retry for ${subscriber.email}: ${retryError instanceof Error ? retryError.message : 'unknown error'}`,
            );
            canonicalUser = await this.prisma.user.findUnique({
              where: { subscriberId: subscriber.id },
              select: {
                id: true,
                subscriberId: true,
                email: true,
                phone: true,
                name: true,
                company: true,
              },
            });
            if (!canonicalUser) {
              canonicalUser = await this.prisma.user.findUnique({
                where: { email: subscriber.email },
                select: {
                  id: true,
                  subscriberId: true,
                  email: true,
                  phone: true,
                  name: true,
                  company: true,
                },
              });
            }
          }
        }
      }

      if (canonicalUser && canonicalUser.id !== currentUserId) {
        this.logger.warn(
          `Property create canonicalized ${contactEmail || contactPhone} from user ${currentUserId || 'missing'} to ${canonicalUser.id}`,
        );
      }

      return canonicalUser?.id || currentUserId || null;
    } catch (error) {
      // Final catch-all to prevent unhandled errors from causing 500
      this.logger.error(
        `Unexpected error in resolveCreateUserId: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return currentUserId || null;
    }
  }

  async search(dto: SearchPropertyDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: 'ACTIVE',
    };

    if (dto.propertyType) where.propertyType = dto.propertyType;
    if (dto.listingType) where.listingType = dto.listingType;
    if (dto.province) where.province = dto.province;
    if (dto.district) where.district = dto.district;
    if (dto.bedrooms) where.bedrooms = { gte: dto.bedrooms };
    if (dto.bathrooms) where.bathrooms = { gte: dto.bathrooms };

    if (dto.minPrice || dto.maxPrice) {
      where.price = {};
      if (dto.minPrice) where.price.gte = dto.minPrice;
      if (dto.maxPrice) where.price.lte = dto.maxPrice;
    }

    if (dto.minArea || dto.maxArea) {
      where.area = {};
      if (dto.minArea) where.area.gte = dto.minArea;
      if (dto.maxArea) where.area.lte = dto.maxArea;
    }

    if (dto.keyword) {
      where.OR = [
        { title: { contains: dto.keyword, mode: 'insensitive' } },
        { description: { contains: dto.keyword, mode: 'insensitive' } },
      ];
    }

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findByUser(userId: string) {
    const linkedUserIds = await this.resolveLinkedUserIds(userId);
    if (linkedUserIds.length === 0) return [];

    return this.prisma.property.findMany({
      where: {
        userId: { in: linkedUserIds },
        status: { not: 'REMOVED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: string, userId: string, data: Partial<CreatePropertyDto>) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    const linkedUserIds = new Set(await this.resolveLinkedUserIds(userId));

    if (!property || !linkedUserIds.has(property.userId)) {
      return null;
    }

    const { images, ...scalarData } = data;
    const scalarUpdateData: Record<string, unknown> = {
      ...scalarData,
    };
    if (scalarData.features !== undefined) {
      scalarUpdateData.features = scalarData.features as Prisma.InputJsonValue;
    } else {
      delete scalarUpdateData.features;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id },
        data: scalarUpdateData as Prisma.PropertyUpdateInput,
      });

      if (Array.isArray(images)) {
        await tx.propertyImage.deleteMany({ where: { propertyId: id } });

        const normalizedImages = images
          .map((img, idx) => ({
            url: String(img?.url || '').trim(),
            key: String(img?.key || `property/${id}/file-${idx + 1}`).trim(),
            sortOrder: idx,
            isPrimary: idx === 0,
          }))
          .filter((img) => Boolean(img.url));

        if (normalizedImages.length > 0) {
          await tx.propertyImage.createMany({
            data: normalizedImages.map((img) => ({
              propertyId: id,
              url: img.url,
              key: img.key,
              sortOrder: img.sortOrder,
              isPrimary: img.isPrimary,
            })),
          });
        }
      }

      return tx.property.findUnique({
        where: { id },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async remove(id: string, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    const linkedUserIds = new Set(await this.resolveLinkedUserIds(userId));

    if (!property || !linkedUserIds.has(property.userId)) {
      return null;
    }

    return this.prisma.property.update({
      where: { id },
      data: { status: 'REMOVED' },
    });
  }
}
