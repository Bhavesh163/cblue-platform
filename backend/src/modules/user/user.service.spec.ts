import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    $transaction: jest.Mock;
    user: Record<string, jest.Mock>;
    address: Record<string, jest.Mock>;
    fixer: Record<string, jest.Mock>;
    fixerSkill: Record<string, jest.Mock>;
    fixerAvailability: Record<string, jest.Mock>;
    image: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
    payment: Record<string, jest.Mock>;
    property: Record<string, jest.Mock>;
    propertyInquiry: Record<string, jest.Mock>;
    kycDocument: Record<string, jest.Mock>;
    accountDeletionAudit: Record<string, jest.Mock>;
    subscriber: Record<string, jest.Mock>;
    notification: Record<string, jest.Mock>;
    refreshSession: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      address: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      fixer: { update: jest.fn(), updateMany: jest.fn() },
      fixerSkill: { deleteMany: jest.fn() },
      fixerAvailability: { deleteMany: jest.fn() },
      image: { deleteMany: jest.fn() },
      order: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() },
      payment: { count: jest.fn().mockResolvedValue(0) },
      property: { updateMany: jest.fn() },
      propertyInquiry: { count: jest.fn().mockResolvedValue(0) },
      kycDocument: { updateMany: jest.fn() },
      accountDeletionAudit: { create: jest.fn() },
      subscriber: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      notification: { createMany: jest.fn(), deleteMany: jest.fn() },
      refreshSession: { updateMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user with addresses and fixer', async () => {
      const user = {
        id: 'user-1',
        name: 'Ghis',
        company: 'Ghis Cafe',
        phone: '+66812345678',
        addresses: [],
        fixer: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('user-1');
      expect(result.id).toBe('user-1');
    });

    it('projects the verified company name without replacing the legal user name', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-company',
        name: 'Bhavesh Fungprasertsuk',
        email: 'construction_blue@hotmail.com',
        phone: '0818544291',
        company: 'Construction Blue',
        role: 'FIXER',
        addresses: [],
        fixer: {
          id: 'fixer-company',
          publicDisplayName: 'Construction Blue',
          verifiedCompanyName: 'Construction Blue',
          companyIdentityVerifiedAt: new Date('2026-08-13T00:00:00.000Z'),
          skills: [],
          availability: null,
          images: [],
        },
      });

      const result = await service.getProfile('user-company');

      expect(result).toMatchObject({
        name: 'Bhavesh Fungprasertsuk',
        legalName: 'Bhavesh Fungprasertsuk',
        providerDisplayName: 'Construction Blue',
        fixer: {
          contactName: 'Construction Blue',
          companyName: 'Construction Blue',
        },
      });
    });

    it('returns a minimal authoritative contact profile for a verified company', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-company',
        name: 'Bhavesh Fungprasertsuk',
        email: 'construction_blue@hotmail.com',
        phone: null,
        role: 'FIXER',
        createdAt: new Date('2026-08-13T00:00:00.000Z'),
        updatedAt: new Date('2026-08-13T01:00:00.000Z'),
        fixer: {
          contactPhone: '0818544291',
          publicDisplayName: 'Construction Blue',
          verifiedCompanyName: 'Construction Blue',
          companyIdentityVerifiedAt: new Date('2026-08-13T00:00:00.000Z'),
        },
      });

      await expect(service.getContactProfile('user-company')).resolves.toEqual({
        id: 'user-company',
        name: 'Construction Blue',
        legalName: 'Bhavesh Fungprasertsuk',
        email: 'construction_blue@hotmail.com',
        phone: '0818544291',
        role: 'FIXER',
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T01:00:00.000Z',
        companyIdentityVerified: true,
        profileComplete: true,
      });
    });

    it('selects the persisted account creation date for the authoritative contact profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-customer',
        name: 'test1',
        email: 'test1@gmail.com',
        phone: '0812345678',
        role: 'USER',
        createdAt: new Date('2026-08-14T00:00:00.000Z'),
        fixer: null,
      });

      await expect(
        service.getContactProfile('user-customer'),
      ).resolves.toMatchObject({
        email: 'test1@gmail.com',
        phone: '0812345678',
        createdAt: '2026-08-14T00:00:00.000Z',
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-customer' },
        select: expect.objectContaining({ createdAt: true }),
      });
    });

    it('repairs a historical customer phone from the linked subscriber', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-customer',
        name: 'test1',
        email: 'test1@gmail.com',
        phone: null,
        role: 'USER',
        createdAt: new Date('2026-08-14T00:00:00.000Z'),
        addresses: [],
        fixer: null,
      });
      prisma.subscriber.findFirst.mockResolvedValue({ phone: '0812345678' });
      prisma.user.update.mockResolvedValue({ id: 'user-customer' });

      const result = await service.getProfile('user-customer');

      expect(result.phone).toBe('0812345678');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-customer' },
        data: { phone: '0812345678' },
      });
    });

    it('should fall back to a legacy-safe profile read when live schema columns are missing', async () => {
      const driftError = new Error(
        'P2022: The column `users.company` does not exist in the current database.',
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(driftError)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Suppadesh',
          email: 'suppadesh@example.com',
          phone: '+66812345678',
          role: 'FIXER',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          addresses: [],
          fixer: {
            id: 'fixer-1',
            userId: 'user-1',
            status: 'APPROVED',
            tier: 'STANDARD',
            rating: 4.8,
            completedJobs: 3,
            responseTime: '1 hour',
            verified: true,
            bio: 'Fit out partner',
            yearsExperience: 5,
            travelRadius: 20,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            skills: [],
            availability: null,
            images: [],
          },
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        id: 'user-1',
        company: null,
        fixer: {
          id: 'fixer-1',
          contactName: 'Suppadesh',
          contactPhone: '+66812345678',
          companyName: null,
          aiTier: null,
          priceList: null,
        },
      });
    });

    it('should preserve fixer access in ultra-safe profile fallback when the user role is FIXER', async () => {
      const companyDrift = new Error(
        'P2022: The column `users.company` does not exist in the current database.',
      );
      const nestedDrift = new Error(
        'P2022: The column `addresses.unit` does not exist in the current database.',
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(companyDrift)
        .mockRejectedValueOnce(nestedDrift)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Suppadesh',
          email: 'suppadesh@example.com',
          phone: '+66812345678',
          role: 'FIXER',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(3);
      expect(result).toMatchObject({
        id: 'user-1',
        company: null,
        addresses: [],
        fixer: {
          status: 'APPROVED',
          tier: 'STANDARD',
          contactName: 'Suppadesh',
          contactPhone: '+66812345678',
          companyName: null,
        },
      });
    });

    it('should still return a minimal profile when ultra-safe profile columns drift', async () => {
      const companyDrift = new Error(
        'P2022: The column `users.company` does not exist in the current database.',
      );
      const nestedDrift = new Error(
        'P2022: The column `addresses.unit` does not exist in the current database.',
      );
      const ultraDrift = new Error(
        'P2022: The column `users.phone` does not exist in the current database.',
      );
      const bareDrift = new Error(
        'P2022: The column `users.createdAt` does not exist in the current database.',
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(companyDrift)
        .mockRejectedValueOnce(nestedDrift)
        .mockRejectedValueOnce(ultraDrift)
        .mockRejectedValueOnce(bareDrift)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Ghis',
          email: 'ghiscafe@gmail.com',
          role: 'USER',
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(5);
      expect(result).toMatchObject({
        id: 'user-1',
        name: 'Ghis',
        email: 'ghiscafe@gmail.com',
        company: null,
        addresses: [],
        fixer: null,
      });
    });

    it('should keep fixer access when only nested fixer relations are missing', async () => {
      const nestedRelationDrift = new Error(
        'The table `public.fixer_availability` does not exist in the current database.',
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(nestedRelationDrift)
        .mockRejectedValueOnce(nestedRelationDrift)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Suppadesh',
          email: 'suppadesh@example.com',
          phone: '+66812345678',
          role: 'FIXER',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          fixer: {
            id: 'fixer-1',
            userId: 'user-1',
            status: 'APPROVED',
            tier: 'STANDARD',
            rating: 4.8,
            completedJobs: 3,
            responseTime: 60,
            verified: true,
            bio: 'Fit out partner',
            yearsExperience: 5,
            travelRadius: 20,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(3);
      expect(result).toMatchObject({
        id: 'user-1',
        company: null,
        addresses: [],
        fixer: {
          id: 'fixer-1',
          contactName: 'Suppadesh',
          contactPhone: '+66812345678',
          companyName: null,
          availability: [],
          images: [],
        },
      });
    });

    it('should treat Prisma code-only missing-column errors as schema drift', async () => {
      const codeOnlyDrift = Object.assign(
        new Error('Invalid Prisma invocation'),
        {
          code: 'P2022',
        },
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(codeOnlyDrift)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Suppadesh',
          email: 'suppadesh@example.com',
          phone: '+66812345678',
          role: 'FIXER',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          addresses: [],
          fixer: null,
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('user-1');
    });

    it('should fall back when Prisma relation hydration returns an inconsistent query error', async () => {
      const hydrationError = new Error(
        'Inconsistent query result: Field fixer is required to return data, got null instead.',
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(hydrationError)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Suppadesh',
          email: 'suppadesh@example.com',
          phone: '+66812345678',
          role: 'FIXER',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          addresses: [],
          fixer: null,
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        id: 'user-1',
        fixer: {
          userId: 'user-1',
          status: 'APPROVED',
          tier: 'STANDARD',
        },
      });
    });

    it('should retry safe profile reads when the primary select throws an unexpected error', async () => {
      const primarySelectError = new Error(
        'Cannot read properties of undefined while hydrating company profile.',
      );
      prisma.user.findUnique
        .mockRejectedValueOnce(primarySelectError)
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Ghis',
          email: 'ghiscafe@gmail.com',
          phone: '+66812345678',
          role: 'USER',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          addresses: [],
          fixer: null,
        });

      const result = await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        id: 'user-1',
        email: 'ghiscafe@gmail.com',
        company: null,
        addresses: [],
        fixer: null,
      });
    });

    it('should rethrow when every profile read fails with a non-schema error', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('connection refused'));

      await expect(service.getProfile('user-1')).rejects.toThrow(
        'connection refused',
      );
    });
  });

  describe('updateProfile', () => {
    it('updates only the customer phone in both account records', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'customer@example.com',
          phone: '0811111111',
          subscriberId: 'subscriber-1',
          fixer: null,
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Customer',
          email: 'customer@example.com',
          phone: '0822222222',
          role: 'USER',
          createdAt: new Date('2026-08-14T00:00:00.000Z'),
          addresses: [],
          fixer: null,
        });
      prisma.user.update.mockResolvedValue({ id: 'user-1' });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      prisma.subscriber.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateProfile('user-1', {
        phone: '0822222222',
      });

      expect(result.phone).toBe('0822222222');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: '0822222222' },
      });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'user-1' },
          phone: '0822222222',
          isActive: false,
        },
        data: { phone: null },
      });
      expect(prisma.subscriber.updateMany).toHaveBeenCalledWith({
        where: { id: 'subscriber-1' },
        data: { phone: '0822222222' },
      });
      expect(prisma.fixer.update).not.toHaveBeenCalled();
    });

    it('preserves partner eligibility while requiring phone re-verification', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'partner-1',
          email: 'partner@example.com',
          phone: '0811111111',
          subscriberId: 'subscriber-2',
          fixer: {
            id: 'fixer-1',
            verified: true,
            contactPhone: '0811111111',
            kycReverificationRequiredAt: null,
            kycReverificationReasons: null,
          },
        })
        .mockResolvedValueOnce({
          id: 'partner-1',
          name: 'Partner',
          email: 'partner@example.com',
          phone: '0833333333',
          role: 'FIXER',
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          addresses: [],
          fixer: null,
        });
      prisma.user.update.mockResolvedValue({ id: 'partner-1' });
      prisma.fixer.update.mockResolvedValue({ id: 'fixer-1' });
      prisma.subscriber.updateMany.mockResolvedValue({ count: 1 });
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      await service.updateProfile('partner-1', { phone: '0833333333' });

      expect(prisma.fixer.update).toHaveBeenCalledWith({
        where: { id: 'fixer-1' },
        data: expect.objectContaining({
          contactPhone: '0833333333',
          qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
          kycReverificationReasons: ['PHONE_CHANGED'],
        }),
      });
      expect(prisma.fixer.update.mock.calls[0][0].data).not.toHaveProperty(
        'verified',
      );
      expect(prisma.notification.createMany).toHaveBeenCalledTimes(2);
    });

    it('keeps an active account phone protected', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        phone: '0811111111',
        subscriberId: 'subscriber-1',
        fixer: null,
      });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.6.0',
          meta: { target: ['phone'] },
        }),
      );

      await expect(
        service.updateProfile('user-1', { phone: '0899999999' }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.subscriber.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('createAddress', () => {
    it('normalizes GPS-only address before creating it', async () => {
      prisma.address.create.mockResolvedValue({
        id: 'addr-gps',
        userId: 'user-1',
        province: 'กรุงเทพมหานคร',
      });

      await service.createAddress('user-1', {
        province: '',
        district: '',
        subdistrict: '',
        postalCode: '',
        latitude: 13.736717,
        longitude: 100.560062,
      } as never);

      expect(prisma.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          province: 'กรุงเทพมหานคร',
          district: 'วัฒนา',
          subdistrict: 'คลองเตยเหนือ',
          postalCode: '10110',
        }),
      });
    });

    it('should create address', async () => {
      prisma.address.create.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
        province: 'Bangkok',
      });

      const result = await service.createAddress('user-1', {
        province: 'Bangkok',
        district: 'Watthana',
        subdistrict: 'Khlong Toei Nuea',
        postalCode: '10110',
      } as never);

      expect(result.province).toBe('Bangkok');
    });

    it('should unset other defaults when creating a default address', async () => {
      prisma.address.updateMany.mockResolvedValue({ count: 1 });
      prisma.address.create.mockResolvedValue({
        id: 'addr-2',
        isDefault: true,
      });

      await service.createAddress('user-1', {
        province: 'Bangkok',
        district: 'Watthana',
        subdistrict: 'Khlong Toei Nuea',
        postalCode: '10110',
        isDefault: true,
      } as never);

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('deleteAddress', () => {
    it('should throw NotFoundException if address not found', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(service.deleteAddress('user-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete address', async () => {
      prisma.address.findFirst.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
      });
      prisma.address.delete.mockResolvedValue({ id: 'addr-1' });

      const result = await service.deleteAddress('user-1', 'addr-1');
      expect(result.id).toBe('addr-1');
    });
  });

  describe('deleteAccount', () => {
    it('does not perform unconfirmed deletion', async () => {
      await expect(service.deleteAccount('user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
