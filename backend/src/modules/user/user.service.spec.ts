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
        phone: '+66812345678',
        addresses: [],
        fixer: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('user-1');
      expect(result.id).toBe('user-1');
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
