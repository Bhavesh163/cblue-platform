import { Test, TestingModule } from '@nestjs/testing';
import { FixerService } from './fixer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
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
        findMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      fixerSkill: {
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
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
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: HttpService, useValue: { post: jest.fn() } },
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
      const createdFixer = {
        id: 'fixer-1',
        userId: 'user-1',
        user: { id: 'user-1' },
        skills: [],
      };
      prisma.fixer.findUnique
        .mockResolvedValueOnce(null) // first call: check existing
        .mockResolvedValueOnce(createdFixer); // second call: re-fetch
      prisma.user.update.mockResolvedValue({});
      prisma.fixer.create.mockResolvedValue(createdFixer);

      const result = await service.register('user-1', {
        bio: 'Experienced plumber',
        yearsExperience: 5,
        travelRadius: 15,
      });

      expect(result!.id).toBe('fixer-1');
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

  describe('matchFixers', () => {
    it('should use quantity-aware price list matching for fit-out projects', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'fixer-fitout',
          tier: 'CORPORATE',
          rating: 4.9,
          completedJobs: 24,
          yearsExperience: 8,
          description: 'Office interior and fitout specialist',
          pastProjectType: 'corporate',
          bio: 'Commercial renovation team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'office fitout',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '1200',
            },
          ],
          user: { name: 'Fitout Pro', company: 'Fitout Pro Co' },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
        {
          id: 'fixer-other',
          tier: 'STANDARD',
          rating: 4.4,
          completedJobs: 18,
          yearsExperience: 5,
          description: 'Painting and touch-up work',
          pastProjectType: 'none',
          bio: 'General works',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'painting',
              quantity: '1',
              unit: 'job',
              finalPrice: '15000',
            },
          ],
          user: { name: 'Painter Team', company: 'Painter Team Co' },
          skills: [{ category: 'project', name: 'painting' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need 1000 square meter office fit out work',
      );

      const fitoutCandidate = result.find(
        (candidate: { id: string }) => candidate.id === 'fixer-fitout',
      ) as
        | {
            id: string;
            estimatedTotal: number;
            price: number;
            estimatedUnit: string;
            estimatedQty: number;
          }
        | undefined;

      expect(fitoutCandidate).toBeDefined();
      expect(fitoutCandidate?.estimatedTotal).toBe(1200000);
      expect(fitoutCandidate?.price).toBe(1200000);
      expect(fitoutCandidate?.estimatedUnit).toBe('sqm');
      expect(fitoutCandidate?.estimatedQty).toBe(1000);
    });

    it('should rank cheapest candidates by important high-value scope instead of tiny partial offers', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'gatoru',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 2,
          yearsExperience: 2,
          description: 'Website and chatbot development',
          pastProjectType: 'digital',
          bio: 'Digital delivery team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1200',
            },
            {
              service: 'chatbot development',
              quantity: '100',
              unit: 'faq',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Gatoru Sojo', company: 'Gatoru Sojo' },
          skills: [{ category: 'project', name: 'website development' }],
        },
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 4.9,
          completedJobs: 20,
          yearsExperience: 20,
          description: 'Office fitout specialist',
          pastProjectType: 'fitout',
          bio: 'Commercial fitout team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'office fitout',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '27000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            company: 'Suppadesh Funpgrsertsuk',
          },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 4.8,
          completedJobs: 18,
          yearsExperience: 8,
          description: 'Office fitout and web team',
          pastProjectType: 'fitout',
          bio: 'Fitout and software delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'office fitout',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '33200',
            },
            {
              service: 'website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1200',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            company: 'Bhavesh Fungprasertsuk',
          },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'I want a team to carry out a 100 sq.m. office fit out, a 10 page website development and a 100 FAQ chatbot development.',
      );

      expect(result.slice(0, 2).map((candidate: { id: string }) => candidate.id)).toEqual([
        'suppadesh',
        'bhavesh',
      ]);
    });
  });
});
