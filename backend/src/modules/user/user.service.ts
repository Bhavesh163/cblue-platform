import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';

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
      if (!this.isSchemaDriftError(error)) throw error;
      this.logger.warn(
        `Profile read hit live schema drift for user ${userId}; retrying with legacy-safe select: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      try {
        user = await this.getProfileLegacySafe(userId);
      } catch (legacyError) {
        if (!this.isSchemaDriftError(legacyError)) throw legacyError;
        this.logger.warn(
          `Legacy profile read still hit schema drift for user ${userId}; retrying with minimal fixer-safe select: ${
            legacyError instanceof Error ? legacyError.message : String(legacyError)
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
          user = await this.getProfileUltraSafe(userId);
        }
      }
    }
    if (!user) throw new NotFoundException('User not found');
    return this.decorateProfile(user);
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

    return {
      ...user,
      company: user.company ?? null,
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
            contactName: user.name,
            contactPhone: user.phone,
            companyName: user.company ?? null,
          }
        : null,
    };
  }

  private isSchemaDriftError(error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    if (/^P(?:1014|2021|2022)$/.test(code)) return true;

    const message = error instanceof Error ? error.message : String(error);
    return /\bP(?:1014|202[12])\b|column .*does not exist|table .*does not exist|relation .*does not exist|does not exist in the current database|no such (?:table|column)|Unknown field/i.test(
      message,
    );
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
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

    return this.prisma.address.create({
      data: { ...dto, userId },
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

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
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
    const ts = Date.now();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email: `deleted_${userId}_${ts}@cblue.co.th`,
        phone: null,
        company: null,
        isActive: false,
      },
    });
    // optionally deactivate fixer if exists
    const fixer = await this.prisma.fixer.findUnique({ where: { userId } });
    if (fixer) {
      await this.prisma.fixer.update({
        where: { userId },
        data: {
          bio: null,
          description: null,
          status: 'REJECTED',
        },
      });
    }
    return { success: true, message: 'Account deleted via PDPA' };
  }
}
