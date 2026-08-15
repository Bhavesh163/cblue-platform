import { Test } from '@nestjs/testing';
import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('UserService account closure', () => {
  let service: UserService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      user: { findUnique: jest.fn(), update: jest.fn() },
      subscriber: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      order: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() },
      propertyInquiry: { count: jest.fn().mockResolvedValue(0) },
      payment: { count: jest.fn().mockResolvedValue(0) },
      refreshSession: { updateMany: jest.fn() },
      fixer: { updateMany: jest.fn() },
      fixerSkill: { deleteMany: jest.fn() },
      fixerAvailability: { deleteMany: jest.fn() },
      image: { deleteMany: jest.fn() },
      property: { updateMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      address: { deleteMany: jest.fn(), updateMany: jest.fn() },
      kycDocument: { updateMany: jest.fn() },
      accountDeletionAudit: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (tx: any) => Promise<unknown>) => callback(prisma));
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UserService);
    (bcrypt.compare as jest.Mock).mockReset();
  });

  const account = () => ({
    id: 'user-1',
    email: 'customer@example.com',
    subscriberId: 'subscriber-1',
    isActive: true,
    legalHoldUntil: new Date('2027-08-15T00:00:00.000Z'),
    fixer: { id: 'fixer-1' },
  });
  const credential = {
    id: 'subscriber-1',
    email: 'customer@example.com',
    passwordHash: 'password-hash',
    status: 'ACTIVE',
  };

  function prepare() {
    prisma.user.findUnique.mockResolvedValue(account());
    prisma.subscriber.findUnique.mockResolvedValue(credential);
    prisma.subscriber.findFirst.mockResolvedValue(null);
    prisma.order.findMany.mockResolvedValue([{ addressId: 'retained-address' }]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  }

  it('rejects a wrong current password before opening a transaction', async () => {
    prepare();
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.closeAccount('user-1', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an account without an active login credential', async () => {
    prisma.user.findUnique.mockResolvedValue(account());
    prisma.subscriber.findUnique.mockResolvedValue(null);
    prisma.subscriber.findFirst.mockResolvedValue(null);

    await expect(service.closeAccount('user-1', 'correct-password')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['active order', 'order'],
    ['active property inquiry', 'propertyInquiry'],
    ['pending payment', 'payment'],
  ])('blocks closure when there is an %s', async (_label, delegate) => {
    prepare();
    prisma[delegate].count.mockResolvedValueOnce(1);

    await expect(service.closeAccount('user-1', 'correct-password')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('closes resolved work atomically and preserves the legal hold boundary', async () => {
    prepare();
    prisma.refreshSession.updateMany.mockResolvedValue({ count: 2 });
    prisma.order.findMany.mockResolvedValue([{ addressId: 'retained-address' }]);
    prisma.accountDeletionAudit.create.mockResolvedValue({ id: 'audit-1' });
    prisma.subscriber.delete.mockResolvedValue({ id: 'subscriber-1' });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await expect(service.closeAccount('user-1', 'correct-password')).resolves.toEqual({
      success: true,
    });

    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: {
        revokedAt: expect.any(Date),
        revocationReason: 'ACCOUNT_CLOSED',
      },
    });
    expect(prisma.address.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', id: { notIn: ['retained-address'] } },
    });
    expect(prisma.address.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', id: { in: ['retained-address'] } },
      data: expect.objectContaining({ street: null, latitude: null, longitude: null }),
    });
    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        submission: { fixerId: 'fixer-1' },
        OR: [
          { legalHoldUntil: null },
          { legalHoldUntil: { lte: expect.any(Date) } },
        ],
      },
      data: expect.objectContaining({
        isActive: false,
        lifecycleState: 'DELETE_PENDING',
      }),
    });
    expect(prisma.subscriber.delete).toHaveBeenCalledWith({
      where: { id: 'subscriber-1' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        subscriberId: null,
        isActive: false,
        name: 'Removed account',
        phone: null,
        company: null,
        deletedAt: expect.any(Date),
        deletionPolicyVersion: '2026-08-15',
      }),
    });

    const audit = prisma.accountDeletionAudit.create.mock.calls[0][0].data;
    expect(audit.subjectHash).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.retainedCategories).toEqual({
      orders: 0,
      propertyInquiries: 0,
      payments: 0,
    });
    expect(JSON.stringify(audit)).not.toContain('customer@example.com');
    expect(JSON.stringify(audit)).not.toContain('user-1');
  });

  it('returns a service-unavailable error when the transaction rolls back', async () => {
    prepare();
    prisma.accountDeletionAudit.create.mockRejectedValue(new Error('database unavailable'));

    await expect(service.closeAccount('user-1', 'correct-password')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
