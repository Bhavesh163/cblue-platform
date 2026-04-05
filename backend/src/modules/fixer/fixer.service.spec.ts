import { Test, TestingModule } from '@nestjs/testing';
import { FixerService } from './fixer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('FixerService', () => {
  let service: FixerService;
  let prisma: {
    fixer: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    fixerSkill: Record<string, jest.Mock>;
    fixerAvailability: Record<string, jest.Mock>;
    image: Record<string, jest.Mock>;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      fixer: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      fixerSkill: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      fixerAvailability: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      image: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixerService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<FixerService>(FixerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if already registered', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });

      await expect(
        service.register('user-1', {
          bio: 'test',
          yearsExperience: 5,
          travelRadius: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register fixer and emit event', async () => {
      prisma.fixer.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({});
      prisma.fixer.create.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
        user: { id: 'user-1' },
      });

      const result = await service.register('user-1', {
        bio: 'Experienced plumber',
        yearsExperience: 5,
        travelRadius: 15,
      });

      expect(result.id).toBe('fixer-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'fixer.registered',
        expect.objectContaining({ fixerId: 'fixer-1' }),
      );
    });
  });

  describe('getProfile', () => {
    it('should throw NotFoundException if fixer not found', async () => {
      prisma.fixer.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return fixer with user, skills, availability', async () => {
      const fixer = {
        id: 'fixer-1',
        user: { id: 'user-1' },
        skills: [],
        availability: [],
      };
      prisma.fixer.findUnique.mockResolvedValue(fixer);

      const result = await service.getProfile('fixer-1');
      expect(result.id).toBe('fixer-1');
    });
  });

  describe('addSkill', () => {
    it('should add skill to fixer', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
      prisma.fixerSkill.create.mockResolvedValue({
        id: 'skill-1',
        category: 'plumbing',
        name: 'pipe repair',
      });

      const result = await service.addSkill('user-1', {
        category: 'plumbing',
        name: 'pipe repair',
      });
      expect(result.category).toBe('plumbing');
    });
  });

  describe('removeSkill', () => {
    it('should throw NotFoundException if skill not found', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
      prisma.fixerSkill.findFirst.mockResolvedValue(null);

      await expect(service.removeSkill('user-1', 'bad-skill')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setAvailability', () => {
    it('should reject if startTime >= endTime', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });

      await expect(
        service.setAvailability('user-1', {
          dayOfWeek: 'MONDAY' as never,
          startTime: '18:00',
          endTime: '08:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upsert availability', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
      prisma.fixerAvailability.upsert.mockResolvedValue({
        id: 'avail-1',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '18:00',
      });

      const result = await service.setAvailability('user-1', {
        dayOfWeek: 'MONDAY' as never,
        startTime: '08:00',
        endTime: '18:00',
      });
      expect(result.dayOfWeek).toBe('MONDAY');
    });
  });

  describe('uploadKyc', () => {
    it('should create KYC image record', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
      prisma.image.create.mockResolvedValue({
        id: 'img-1',
        type: 'kyc',
        fixerId: 'fixer-1',
      });

      const result = await service.uploadKyc('user-1', {
        url: 'https://cdn.example.com/kyc/1.jpg',
        key: 'kyc/1.jpg',
      });
      expect(result.type).toBe('kyc');
    });
  });

  describe('uploadPortfolio', () => {
    it('should create portfolio image record', async () => {
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
      prisma.image.create.mockResolvedValue({
        id: 'img-2',
        type: 'portfolio',
        fixerId: 'fixer-1',
      });

      const result = await service.uploadPortfolio('user-1', {
        url: 'https://cdn.example.com/portfolio/1.jpg',
        key: 'portfolio/1.jpg',
      });
      expect(result.type).toBe('portfolio');
    });
  });
});
