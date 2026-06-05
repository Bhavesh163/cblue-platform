import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: Record<string, jest.Mock>;
    address: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      address: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

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
      const codeOnlyDrift = Object.assign(new Error('Invalid Prisma invocation'), {
        code: 'P2022',
      });
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

    it('should rethrow non-schema errors', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('connection refused'));

      await expect(service.getProfile('user-1')).rejects.toThrow(
        'connection refused',
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated',
      });

      const result = await service.updateProfile('user-1', {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
    });
  });

  describe('createAddress', () => {
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
});
