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

  async create(
    currentUser: { id?: string; email?: string; phone?: string } | undefined,
    dto: CreatePropertyDto,
  ) {
    let userId = currentUser?.id?.trim() || '';
    try {
      userId = (await this.resolveCreateUserId(currentUser, dto)) || '';
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

    const subscriber = contactEmail
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
      : contactPhone
        ? await this.prisma.subscriber.findFirst({
            where: { phone: contactPhone },
            select: {
              id: true,
              email: true,
              phone: true,
              name: true,
              company: true,
            },
          })
        : null;

    if (!subscriber) {
      return currentUserId || null;
    }

    let canonicalUser = await this.prisma.user.findUnique({
      where: { subscriberId: subscriber.id },
      select: { id: true },
    });

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
          select: { id: true },
        });
      } catch (error) {
        this.logger.warn(
          `Property create bridge update retry for ${subscriber.email}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
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
          select: { id: true },
        });
      } catch (error) {
        this.logger.warn(
          `Property create bridge create retry for ${subscriber.email}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        canonicalUser = await this.prisma.user.findUnique({
          where: { subscriberId: subscriber.id },
          select: { id: true },
        });
      }
    }

    if (canonicalUser && canonicalUser.id !== currentUserId) {
      this.logger.warn(
        `Property create canonicalized ${contactEmail || contactPhone} from user ${currentUserId || 'missing'} to ${canonicalUser.id}`,
      );
    }

    return canonicalUser?.id || currentUserId || null;
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
          images: { where: { isPrimary: true }, take: 1 },
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
    return this.prisma.property.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
      },
    });
  }

  async update(id: string, userId: string, data: Partial<CreatePropertyDto>) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.userId !== userId) {
      return null;
    }

    // Destructure images out — Prisma update expects a nested relation input, not a DTO array.
    // Image updates are handled separately via the create() flow or a dedicated endpoint.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { images: _images, ...scalarData } = data;

    return this.prisma.property.update({
      where: { id },
      data: {
        ...scalarData,
        features: scalarData.features as Prisma.InputJsonValue,
      },
      include: { images: true },
    });
  }

  async remove(id: string, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.userId !== userId) {
      return null;
    }

    return this.prisma.property.update({
      where: { id },
      data: { status: 'REMOVED' },
    });
  }
}
