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

  private normalizePhone(value?: string | null) {
    return String(value || '')
      .trim()
      .replace(/\D+/g, '');
  }

  private normalizePositiveInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
  }

  private normalizeNonNegativeNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return parsed;
  }

  private isSchemaDriftError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return /\bP(?:1014|202[12])\b|column .*does not exist|table .*does not exist|relation .*does not exist|does not exist in the current database|no such (?:table|column)|Unknown field|Inconsistent query result|required to return data|Error converting field|Failed to convert/i.test(
      message,
    );
  }

  private async resolveLinkedUserIds(userRef: string) {
    const fallbackId = String(userRef || '').trim();
    if (!fallbackId) return [] as string[];

    try {
    const linkedIds = new Set<string>();
    const subscriberIdCandidates = new Set<string>();
    const normalizedEmails = new Set<string>();

    const pushEmail = (value?: string | null) => {
      const normalized = this.normalizeEmail(value);
      if (normalized) normalizedEmails.add(normalized);
    };

    const user = await this.prisma.user.findUnique({
      where: { id: fallbackId },
      select: { id: true, subscriberId: true, email: true },
    });

    if (user) {
      linkedIds.add(user.id);
      if (user.subscriberId) subscriberIdCandidates.add(user.subscriberId);
      pushEmail(user.email);
    } else {
      const bySubscriberId = await this.prisma.user.findMany({
        where: { subscriberId: fallbackId },
        select: { id: true },
      });
      bySubscriberId.forEach((item) => linkedIds.add(item.id));

      const fallbackSubscriber = await this.prisma.subscriber.findUnique({
        where: { id: fallbackId },
        select: { id: true, email: true },
      });
      if (fallbackSubscriber?.id) subscriberIdCandidates.add(fallbackSubscriber.id);
      pushEmail(fallbackSubscriber?.email);

      if (fallbackId.includes('@')) pushEmail(fallbackId);
    }

    if (normalizedEmails.size > 0) {
      const subscribersByEmail = await this.prisma.subscriber.findMany({
        where: {
          OR: Array.from(normalizedEmails).map((email) => ({
            email: {
              equals: email,
              mode: 'insensitive',
            },
          })),
        },
        select: { id: true, email: true },
      });
      subscribersByEmail.forEach((item) => {
        subscriberIdCandidates.add(item.id);
        pushEmail(item.email);
      });
    }

    if (subscriberIdCandidates.size > 0) {
      const bySubscriberIds = await this.prisma.user.findMany({
        where: { subscriberId: { in: Array.from(subscriberIdCandidates) } },
        select: { id: true, email: true },
      });
      bySubscriberIds.forEach((item) => {
        linkedIds.add(item.id);
        pushEmail(item.email);
      });
    }

    if (normalizedEmails.size > 0) {
      const byEmail = await this.prisma.user.findMany({
        where: {
          OR: Array.from(normalizedEmails).map((email) => ({
            email: {
              equals: email,
              mode: 'insensitive',
            },
          })),
        },
        select: { id: true },
      });
      byEmail.forEach((item) => linkedIds.add(item.id));
    }

    if (linkedIds.size === 0) linkedIds.add(fallbackId);

    return Array.from(linkedIds);
    } catch (error) {
      this.logger.warn(
        `Falling back to single linked user id for ${fallbackId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [fallbackId];
    }
  }

  private async resolveLinkedEmails(userRef: string, linkedUserIds?: string[]) {
    const fallbackRef = String(userRef || '').trim();
    if (!fallbackRef) return [] as string[];

    try {
    const emails = new Set<string>();
    const addEmail = (value?: string | null) => {
      const normalized = this.normalizeEmail(value);
      if (normalized) emails.add(normalized);
    };

    const requesterIds =
      linkedUserIds && linkedUserIds.length > 0
        ? linkedUserIds
        : await this.resolveLinkedUserIds(fallbackRef);

    if (requesterIds.length > 0) {
      const linkedUsers = await this.prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { email: true, subscriberId: true },
      });

      const subscriberIds = new Set<string>();
      linkedUsers.forEach((user) => {
        addEmail(user.email);
        if (user.subscriberId) subscriberIds.add(user.subscriberId);
      });

      if (subscriberIds.size > 0) {
        const subscribers = await this.prisma.subscriber.findMany({
          where: { id: { in: Array.from(subscriberIds) } },
          select: { email: true },
        });
        subscribers.forEach((subscriber) => addEmail(subscriber.email));
      }
    }

    const fallbackSubscriber = await this.prisma.subscriber.findUnique({
      where: { id: fallbackRef },
      select: { email: true },
    });
    addEmail(fallbackSubscriber?.email);

    if (fallbackRef.includes('@')) addEmail(fallbackRef);

    return Array.from(emails);
    } catch (error) {
      this.logger.warn(
        `Falling back to empty linked emails for ${fallbackRef}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (fallbackRef.includes('@')) return [this.normalizeEmail(fallbackRef)].filter(Boolean);
      return [];
    }
  }

  private async resolveLinkedPhones(userRef: string, linkedUserIds?: string[]) {
    const fallbackRef = String(userRef || '').trim();
    if (!fallbackRef) return [] as string[];

    try {
    const phones = new Set<string>();
    const addPhone = (value?: string | null) => {
      const normalized = this.normalizePhone(value);
      if (normalized) phones.add(normalized);
    };

    const requesterIds =
      linkedUserIds && linkedUserIds.length > 0
        ? linkedUserIds
        : await this.resolveLinkedUserIds(fallbackRef);

    if (requesterIds.length > 0) {
      const linkedUsers = await this.prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { phone: true, subscriberId: true },
      });

      const subscriberIds = new Set<string>();
      linkedUsers.forEach((user) => {
        addPhone(user.phone);
        if (user.subscriberId) subscriberIds.add(user.subscriberId);
      });

      if (subscriberIds.size > 0) {
        const subscribers = await this.prisma.subscriber.findMany({
          where: { id: { in: Array.from(subscriberIds) } },
          select: { phone: true },
        });
        subscribers.forEach((subscriber) => addPhone(subscriber.phone));
      }
    }

    const fallbackSubscriber = await this.prisma.subscriber.findUnique({
      where: { id: fallbackRef },
      select: { phone: true },
    });
    addPhone(fallbackSubscriber?.phone);

    // Allow direct phone fallback when caller ID is a phone-like value.
    addPhone(fallbackRef);

    return Array.from(phones);
    } catch (error) {
      this.logger.warn(
        `Falling back to empty linked phones for ${fallbackRef}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private normalizeNameTokens(value?: string | null) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (!normalized) return [] as string[];

    const tokens = new Set<string>();
    tokens.add(normalized);

    const first = normalized.split(' ')[0] || '';
    if (first.length >= 2) tokens.add(first);

    return Array.from(tokens);
  }

  private async resolveLinkedNameTokens(userRef: string, linkedUserIds?: string[]) {
    const fallbackRef = String(userRef || '').trim();
    if (!fallbackRef) return [] as string[];

    try {
    const names = new Set<string>();
    const addName = (value?: string | null) => {
      this.normalizeNameTokens(value).forEach((token) => names.add(token));
    };

    const requesterIds =
      linkedUserIds && linkedUserIds.length > 0
        ? linkedUserIds
        : await this.resolveLinkedUserIds(fallbackRef);

    if (requesterIds.length > 0) {
      const linkedUsers = await this.prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { name: true, subscriberId: true },
      });

      const subscriberIds = new Set<string>();
      linkedUsers.forEach((user) => {
        addName(user.name);
        if (user.subscriberId) subscriberIds.add(user.subscriberId);
      });

      if (subscriberIds.size > 0) {
        const subscribers = await this.prisma.subscriber.findMany({
          where: { id: { in: Array.from(subscriberIds) } },
          select: { name: true },
        });
        subscribers.forEach((subscriber) => addName(subscriber.name));
      }
    }

    const fallbackSubscriber = await this.prisma.subscriber.findUnique({
      where: { id: fallbackRef },
      select: { name: true },
    });
    addName(fallbackSubscriber?.name);

    return Array.from(names);
    } catch (error) {
      this.logger.warn(
        `Falling back to empty linked name tokens for ${fallbackRef}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private isLikelySyntheticPropertyCandidate(property: {
    title?: string | null;
    description?: string | null;
    contactEmail?: string | null;
    listingType?: string | null;
    price?: number | null;
  }) {
    const haystack = `${property.title || ''} ${property.description || ''}`.toLowerCase();
    if (/\b(test|probe|debug|dummy|sample|qa)\b/i.test(haystack)) return true;
    if (this.normalizeEmail(property.contactEmail).endsWith('@example.com')) return true;
    if (String(property.listingType || '').toUpperCase() === 'SALE' && Number(property.price || 0) <= 1) {
      return true;
    }
    return false;
  }

  private hasLinkedPropertyAccess(
    property:
      | {
          userId: string;
          contactEmail?: string | null;
          contactPhone?: string | null;
          contactName?: string | null;
          title?: string | null;
          description?: string | null;
          listingType?: string | null;
          price?: number | null;
        }
      | null
      | undefined,
    linkedUserIds: string[],
    linkedEmails: string[],
    linkedPhones: string[],
    linkedNameTokens: string[],
  ) {
    if (!property) return false;

    const linkedUserIdSet = new Set(linkedUserIds);
    const linkedEmailSet = new Set(linkedEmails);
    const linkedPhoneSet = new Set(linkedPhones);
    const propertyEmail = this.normalizeEmail(property.contactEmail);
    const propertyPhone = this.normalizePhone(property.contactPhone);
    const propertyNameTokens = this.normalizeNameTokens(property.contactName);

    const hasDirectAccess =
      linkedUserIdSet.has(property.userId) ||
      (propertyEmail && linkedEmailSet.has(propertyEmail)) ||
      (propertyPhone && linkedPhoneSet.has(propertyPhone));

    const hasPhoneAndNameBridge =
      !!propertyPhone &&
      linkedPhoneSet.has(propertyPhone) &&
      linkedNameTokens.length > 0 &&
      propertyNameTokens.length > 0 &&
      linkedNameTokens.some((token) =>
        propertyNameTokens.some(
          (candidate) => candidate.includes(token) || token.includes(candidate),
        ),
      ) &&
      !this.isLikelySyntheticPropertyCandidate(property);

    return hasDirectAccess || hasPhoneAndNameBridge;
  }

  private async canAccessPropertyViaVisibleList(userId: string, propertyId: string) {
    if (!propertyId) return false;
    const visibleProperties = await this.findByUser(userId);
    return visibleProperties.some((item) => item.id === propertyId);
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
    const page = this.normalizePositiveInt(dto.page, 1);
    const limit = this.normalizePositiveInt(dto.limit, 20);
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: 'ACTIVE',
    };

    if (dto.propertyType) where.propertyType = dto.propertyType;
    if (dto.listingType) where.listingType = dto.listingType;
    if (dto.province) where.province = dto.province;
    if (dto.district) where.district = dto.district;
    const bedrooms = this.normalizeNonNegativeNumber(dto.bedrooms);
    const bathrooms = this.normalizeNonNegativeNumber(dto.bathrooms);
    if (bedrooms !== undefined) where.bedrooms = { gte: bedrooms };
    if (bathrooms !== undefined) where.bathrooms = { gte: bathrooms };

    const minPrice = this.normalizeNonNegativeNumber(dto.minPrice);
    const maxPrice = this.normalizeNonNegativeNumber(dto.maxPrice);
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const minArea = this.normalizeNonNegativeNumber(dto.minArea);
    const maxArea = this.normalizeNonNegativeNumber(dto.maxArea);
    if (minArea !== undefined || maxArea !== undefined) {
      where.area = {};
      if (minArea !== undefined) where.area.gte = minArea;
      if (maxArea !== undefined) where.area.lte = maxArea;
    }

    const keyword = String(dto.keyword || '').trim();
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    let properties: any[];
    let total: number;
    try {
      [properties, total] = await Promise.all([
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
    } catch (error) {
      if (!this.isSchemaDriftError(error)) throw error;
      this.logger.warn(
        `Property search hit live schema drift; retrying with legacy-safe select: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      properties = await this.prisma.property
        .findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            propertyType: true,
            listingType: true,
            status: true,
            title: true,
            description: true,
            price: true,
            area: true,
            bedrooms: true,
            bathrooms: true,
            floors: true,
            province: true,
            district: true,
            subdistrict: true,
            postalCode: true,
            addressLine: true,
            latitude: true,
            longitude: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
            features: true,
            yearBuilt: true,
            createdAt: true,
            updatedAt: true,
          },
        })
        .then((rows) =>
          rows.map((property) => ({
            ...property,
            tier: 'STANDARD',
            images: [],
          })),
        );
      try {
        total = await this.prisma.property.count({ where });
      } catch (countError) {
        if (!this.isSchemaDriftError(countError)) throw countError;
        this.logger.warn(
          `Property search fallback count hit live schema drift; using returned row count: ${
            countError instanceof Error ? countError.message : String(countError)
          }`,
        );
        total = skip + properties.length;
      }
    }

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
    try {
      return await this.findByUserWithLinkedIdentity(userId);
    } catch (error) {
      this.logger.warn(
        `Falling back to direct property lookup for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      try {
        return await this.findByUserDirectFallback(userId);
      } catch (fallbackError) {
        this.logger.warn(
          `Returning empty property list after lookup failed for ${userId}: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError)
          }`,
        );
        return [];
      }
    }
  }

  private async findByUserDirectFallback(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true },
      });
      const ownershipScopes: Prisma.PropertyWhereInput[] = [{ userId }];
      const email = this.normalizeEmail(user?.email);
      const phone = this.normalizePhone(user?.phone);
      if (email) ownershipScopes.push({ contactEmail: { equals: email, mode: 'insensitive' } });
      if (phone) ownershipScopes.push({ contactPhone: { equals: phone } });

      try {
        const properties = await this.prisma.property.findMany({
          where: { OR: ownershipScopes },
          orderBy: { createdAt: 'desc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
          },
        });
        return properties.filter((property) => String(property.status) !== 'REMOVED');
      } catch (error) {
        this.logger.warn(
          `Direct property lookup with images failed for ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        const properties = await this.prisma.property.findMany({
          where: { OR: ownershipScopes },
          orderBy: { createdAt: 'desc' },
        });
        return properties
          .filter((property) => String(property.status) !== 'REMOVED')
          .map((property) => ({ ...property, images: [] }));
      }
    } catch (error) {
      this.logger.warn(
        `Direct property fallback failed for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private async findByUserWithLinkedIdentity(userId: string) {
    const linkedUserIds = await this.resolveLinkedUserIds(userId);
    const linkedEmails = await this.resolveLinkedEmails(userId, linkedUserIds);
    const linkedPhones = await this.resolveLinkedPhones(userId, linkedUserIds);
    const linkedNameTokens = await this.resolveLinkedNameTokens(
      userId,
      linkedUserIds,
    );

    const ownershipScopes: Prisma.PropertyWhereInput[] = [];
    if (linkedUserIds.length > 0) {
      ownershipScopes.push({ userId: { in: linkedUserIds } });
    }
    ownershipScopes.push(
      ...linkedEmails.map((email) => ({
        contactEmail: { equals: email, mode: 'insensitive' as const },
      })),
    );
    ownershipScopes.push(
      ...linkedPhones.map((phone) => ({
        contactPhone: { equals: phone },
      })),
    );

    if (ownershipScopes.length === 0) return [];

    const ownedProperties = await this.prisma.property.findMany({
      where: {
        status: { not: 'REMOVED' },
        OR: ownershipScopes,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    const mergedById = new Map(ownedProperties.map((property) => [property.id, property]));
    const bridgePhones = new Set<string>([
      ...linkedPhones,
      ...ownedProperties
        .map((property) => this.normalizePhone(property.contactPhone))
        .filter(Boolean),
    ]);

    if (bridgePhones.size > 0 && linkedNameTokens.length > 0) {
      const bridgedCandidates = await this.prisma.property.findMany({
        where: {
          status: { not: 'REMOVED' },
          contactPhone: { in: Array.from(bridgePhones) },
          OR: linkedNameTokens.map((token) => ({
            contactName: {
              contains: token,
              mode: 'insensitive' as const,
            },
          })),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });

      for (const property of bridgedCandidates) {
        if (this.isLikelySyntheticPropertyCandidate(property)) continue;
        mergedById.set(property.id, property);
      }
    }

    return Array.from(mergedById.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async update(id: string, userId: string, data: Partial<CreatePropertyDto>) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    const linkedUserIds = await this.resolveLinkedUserIds(userId);
    const linkedEmails = await this.resolveLinkedEmails(userId, linkedUserIds);
    const linkedPhones = await this.resolveLinkedPhones(userId, linkedUserIds);
    const linkedNameTokens = await this.resolveLinkedNameTokens(
      userId,
      linkedUserIds,
    );
    let hasAccess = this.hasLinkedPropertyAccess(
      property,
      linkedUserIds,
      linkedEmails,
      linkedPhones,
      linkedNameTokens,
    );

    if (!hasAccess && property?.id) {
      hasAccess = await this.canAccessPropertyViaVisibleList(userId, property.id);
    }

    if (!hasAccess) {
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

    const linkedUserIds = await this.resolveLinkedUserIds(userId);
    const linkedEmails = await this.resolveLinkedEmails(userId, linkedUserIds);
    const linkedPhones = await this.resolveLinkedPhones(userId, linkedUserIds);
    const linkedNameTokens = await this.resolveLinkedNameTokens(
      userId,
      linkedUserIds,
    );
    let hasAccess = this.hasLinkedPropertyAccess(
      property,
      linkedUserIds,
      linkedEmails,
      linkedPhones,
      linkedNameTokens,
    );

    if (!hasAccess && property?.id) {
      hasAccess = await this.canAccessPropertyViaVisibleList(userId, property.id);
    }

    if (!hasAccess) {
      return null;
    }

    return this.prisma.property.update({
      where: { id },
      data: { status: 'REMOVED' },
    });
  }
}
