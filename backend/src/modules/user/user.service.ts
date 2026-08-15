import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { normalizeThaiGpsLocation } from '../../common/thai-gps-location';
import { providerDisplayName } from '../../common/provider-display-name';
import { mergeReverificationReasons } from '../qualification/qualification-eligibility';
import { queueNotificationInTransaction } from '../notification/notification.service';

const normalizePhone = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/[^\d+]/g, '');

export type UserContactProfile = {
  id: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  companyIdentityVerified: boolean;
  profileComplete: boolean;
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          role: true,
          createdAt: true,
          addresses: {
            select: {
              id: true,
              label: true,
              building: true,
              street: true,
              unit: true,
              notes: true,
              province: true,
              district: true,
              subdistrict: true,
              postalCode: true,
              latitude: true,
              longitude: true,
              isDefault: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          },
          fixer: {
            select: {
              id: true,
              userId: true,
              status: true,
              tier: true,
              rating: true,
              completedJobs: true,
              responseTime: true,
              verified: true,
              publicDisplayName: true,
              verifiedCompanyName: true,
              companyIdentityVerifiedAt: true,
              aiTier: true,
              aiScore: true,
              aiBreakdown: true,
              aiFlags: true,
              aiCredentialStatus: true,
              bio: true,
              description: true,
              pastExperience: true,
              pastProjectType: true,
              yearsExperience: true,
              travelRadius: true,
              availableStartDate: true,
              serviceProvince: true,
              serviceDistrict: true,
              servicePostalCode: true,
              companyAddress: true,
              priceList: true,
              createdAt: true,
              skills: {
                select: {
                  id: true,
                  category: true,
                  name: true,
                },
              },
              availability: true,
              images: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Profile read failed for user ${userId}; retrying with legacy-safe select: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      try {
        user = await this.getProfileLegacySafe(userId);
      } catch (legacyError) {
        if (!this.isSchemaDriftError(legacyError)) throw legacyError;
        this.logger.warn(
          `Legacy profile read still hit schema drift for user ${userId}; retrying with minimal fixer-safe select: ${
            legacyError instanceof Error
              ? legacyError.message
              : String(legacyError)
          }`,
        );
        try {
          user = await this.getProfileFixerMinimalSafe(userId);
        } catch (minimalError) {
          if (!this.isSchemaDriftError(minimalError)) throw minimalError;
          this.logger.warn(
            `Minimal fixer-safe profile read still hit schema drift for user ${userId}; retrying with ultra-safe select: ${
              minimalError instanceof Error
                ? minimalError.message
                : String(minimalError)
            }`,
          );
          try {
            user = await this.getProfileUltraSafe(userId);
          } catch (ultraError) {
            if (!this.isSchemaDriftError(ultraError)) throw ultraError;
            this.logger.warn(
              `Ultra-safe profile read still hit schema drift for user ${userId}; retrying with bare select: ${
                ultraError instanceof Error
                  ? ultraError.message
                  : String(ultraError)
              }`,
            );
            user = await this.getProfileBareSafe(userId);
          }
        }
      }
    }
    if (!user) throw new NotFoundException('User not found');
    return this.decorateProfile(await this.hydrateAuthoritativePhone(user));
  }

  private async hydrateAuthoritativePhone(user: any) {
    if (String(user.phone || '').trim()) return user;
    const email = String(user.email || '').trim();
    if (!email) return user;

    const subscriber = await this.prisma.subscriber.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { phone: true },
    });
    const phone = String(subscriber?.phone || '').trim();
    if (!phone) return user;

    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phone },
      });
    } catch (error) {
      this.logger.warn(
        `Customer phone read repair could not persist for user ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { ...user, phone };
  }

  private async getProfileLegacySafe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        addresses: {
          select: {
            id: true,
            label: true,
            building: true,
            street: true,
            unit: true,
            notes: true,
            province: true,
            district: true,
            subdistrict: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
        fixer: {
          select: {
            id: true,
            userId: true,
            status: true,
            tier: true,
            rating: true,
            completedJobs: true,
            responseTime: true,
            verified: true,
            bio: true,
            yearsExperience: true,
            travelRadius: true,
            createdAt: true,
            skills: {
              select: {
                id: true,
                category: true,
                name: true,
              },
            },
            availability: true,
            images: true,
          },
        },
      },
    });

    return user ? { ...user, company: null } : null;
  }

  private async getProfileFixerMinimalSafe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        fixer: {
          select: {
            id: true,
            userId: true,
            status: true,
            tier: true,
            rating: true,
            completedJobs: true,
            responseTime: true,
            verified: true,
            bio: true,
            yearsExperience: true,
            travelRadius: true,
            createdAt: true,
          },
        },
      },
    });

    return user
      ? {
          ...user,
          company: null,
          addresses: [],
          fixer: user.fixer
            ? {
                ...user.fixer,
                skills: [],
                availability: [],
                images: [],
              }
            : null,
        }
      : null;
  }

  private async getProfileUltraSafe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return user
      ? {
          ...user,
          company: null,
          addresses: [],
          fixer: null,
        }
      : null;
  }

  private async getProfileBareSafe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return user
      ? {
          ...user,
          phone: null,
          company: null,
          createdAt: null,
          addresses: [],
          fixer: null,
        }
      : null;
  }

  private decorateProfile(user: any) {
    const fallbackFixer =
      !user.fixer && String(user.role || '').toUpperCase() === 'FIXER'
        ? {
            id: null,
            userId: user.id,
            status: 'APPROVED',
            tier: 'STANDARD',
          }
        : null;
    const fixer = user.fixer ?? fallbackFixer;
    const authoritativeProviderName = providerDisplayName(
      fixer ? { ...fixer, user } : { user },
      String(user.name || user.email || '').trim(),
    );

    return {
      ...user,
      company: user.company ?? null,
      legalName: user.name,
      providerDisplayName: authoritativeProviderName,
      fixer: fixer
        ? {
            aiTier: null,
            aiScore: null,
            aiBreakdown: null,
            aiFlags: null,
            aiCredentialStatus: null,
            description: null,
            pastExperience: null,
            pastProjectType: null,
            availableStartDate: null,
            serviceProvince: null,
            serviceDistrict: null,
            servicePostalCode: null,
            companyAddress: null,
            priceList: null,
            ...fixer,
            skills: fixer.skills ?? [],
            availability: fixer.availability ?? null,
            images: fixer.images ?? [],
            contactName: authoritativeProviderName,
            contactPhone: user.phone,
            companyName: fixer.verifiedCompanyName ?? null,
          }
        : null,
    };
  }

  async getContactProfile(userId: string): Promise<UserContactProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        fixer: {
          select: {
            contactPhone: true,
            publicDisplayName: true,
            verifiedCompanyName: true,
            companyIdentityVerifiedAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const hydratedUser = await this.hydrateAuthoritativePhone(user);
    const name = providerDisplayName(
      hydratedUser.fixer
        ? { ...hydratedUser.fixer, user: hydratedUser }
        : { user: hydratedUser },
      '',
    );
    const email = String(hydratedUser.email || '')
      .trim()
      .toLowerCase();
    const phone = String(
      hydratedUser.phone || hydratedUser.fixer?.contactPhone || '',
    ).trim();

    return {
      id: hydratedUser.id,
      name,
      legalName: String(hydratedUser.name || '').trim(),
      email,
      phone,
      role: String(hydratedUser.role || ''),
      createdAt: hydratedUser.createdAt.toISOString(),
      companyIdentityVerified: Boolean(
        hydratedUser.fixer?.verifiedCompanyName &&
        hydratedUser.fixer.companyIdentityVerifiedAt,
      ),
      profileComplete: Boolean(name && email && phone),
    };
  }

  private isSchemaDriftError(error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    if (/^P(?:1014|2021|2022)$/.test(code)) return true;

    const message = error instanceof Error ? error.message : String(error);
    return /\bP(?:1014|202[12])\b|column .*does not exist|table .*does not exist|relation .*does not exist|does not exist in the current database|no such (?:table|column)|Unknown field|Inconsistent query result|required to return data|Error converting field|Failed to convert/i.test(
      message,
    );
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const phone = String(dto.phone || '').trim();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        subscriberId: true,
        fixer: {
          select: {
            id: true,
            verified: true,
            contactPhone: true,
            kycReverificationRequiredAt: true,
            kycReverificationReasons: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const changed =
      normalizePhone(user.fixer?.contactPhone || user.phone) !==
      normalizePhone(phone);
    const requiresReverification = Boolean(user.fixer?.verified && changed);
    const newlyRequiresReverification = Boolean(
      requiresReverification && !user.fixer?.kycReverificationRequiredAt,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { phone },
        });
        await tx.subscriber.updateMany({
          where: user.subscriberId
            ? { id: user.subscriberId }
            : {
                email: {
                  equals: String(user.email || ''),
                  mode: 'insensitive',
                },
              },
          data: { phone },
        });

        if (user.fixer && changed) {
          await tx.fixer.update({
            where: { id: user.fixer.id },
            data: {
              contactPhone: phone,
              ...(requiresReverification
                ? {
                    qualificationEligibilityStatus:
                      'REVERIFICATION_REQUIRED' as const,
                    kycReverificationRequiredAt:
                      user.fixer.kycReverificationRequiredAt ?? new Date(),
                    kycReverificationReasons: mergeReverificationReasons(
                      user.fixer.kycReverificationReasons,
                      ['PHONE_CHANGED'],
                    ),
                    kycExpiryWarningSentAt: null,
                  }
                : {}),
            },
          });
        }

        if (newlyRequiresReverification && user.fixer) {
          const notification = {
            userId,
            title: 'Profile verification update required',
            body: 'Your approved profile remains eligible for new opportunities while you submit the requested identity update.',
            data: {
              fixerId: user.fixer.id,
              eligibilityStatus: 'REVERIFICATION_REQUIRED',
              reasons: ['PHONE_CHANGED'],
            },
          };
          await queueNotificationInTransaction(tx, {
            ...notification,
            type: NotificationType.IN_APP,
            dedupeKey: `customer-phone-reverification-in-app:${user.fixer.id}`,
          });
          await queueNotificationInTransaction(tx, {
            ...notification,
            type: NotificationType.EMAIL,
            dedupeKey: `customer-phone-reverification-email:${user.fixer.id}`,
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Phone number is already in use');
      }
      throw error;
    }

    return this.getProfile(userId);
  }

  // ── Address management ──

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    // If this is set as default, unset other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const normalizedLocation = normalizeThaiGpsLocation(dto);

    return this.prisma.address.create({
      data: { ...dto, ...normalizedLocation, userId },
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: CreateAddressDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const normalizedLocation = normalizeThaiGpsLocation(dto);

    return this.prisma.address.update({
      where: { id: addressId },
      data: { ...dto, ...normalizedLocation },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    return this.prisma.address.delete({ where: { id: addressId } });
  }

  async deleteAccount(userId: string) {
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, subscriberId: true },
    });
    if (!account) throw new NotFoundException('User not found');

    const deletedAt = new Date();
    const timestamp = deletedAt.getTime();
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: {
          revokedAt: deletedAt,
          revocationReason: 'ACCOUNT_DELETED',
        },
      });
      await tx.fixer.updateMany({
        where: { userId },
        data: {
          bio: null,
          description: null,
          status: 'REJECTED',
          verified: false,
          qualificationEligibilityStatus: 'PENDING',
          suspendedAt: deletedAt,
          suspensionReason: 'Account deleted',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted User',
          email: `deleted_${userId}_${timestamp}@cblue.co.th`,
          phone: null,
          company: null,
          isActive: false,
        },
      });
      if (account.subscriberId) {
        await tx.subscriber.update({
          where: { id: account.subscriberId },
          data: {
            email: `deleted_subscriber_${account.subscriberId}_${timestamp}@cblue.co.th`,
            name: 'Deleted User',
            phone: '',
            company: null,
            status: 'CANCELLED',
            serviceCategory: null,
            description: null,
            resetToken: null,
            resetTokenExpiry: null,
          },
        });
      }
    });
    return { success: true, message: 'Account deleted via PDPA' };
  }
}
