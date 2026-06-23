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

    it('normalizes GPS-only service area before registration', async () => {
      const createdFixer = {
        id: 'fixer-gps',
        userId: 'user-1',
        user: { id: 'user-1' },
        skills: [],
      };
      prisma.fixer.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdFixer);
      prisma.user.update.mockResolvedValue({});
      prisma.fixer.create.mockResolvedValue(createdFixer);

      await service.register('user-1', {
        bio: 'Sukhumvit plumbing team',
        yearsExperience: 5,
        travelRadius: 15,
        address: {
          province: '',
          district: '',
          subdistrict: '',
          postalCode: '',
        },
        gpsCoords: { lat: 13.736717, lng: 100.560062 },
      } as never);

      expect(prisma.fixer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceProvince: 'กรุงเทพมหานคร',
            serviceDistrict: 'วัฒนา',
            servicePostalCode: '10110',
            gpsLat: 13.736717,
            gpsLng: 100.560062,
          }),
        }),
      );
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

    it('filters household fixers to 40 km from the customer GPS site before ranking', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'near-household',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Plumbing repair specialist',
          pastProjectType: 'household',
          bio: 'Home plumbing team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          gpsLat: 13.8063,
          gpsLng: 100.5018,
          priceList: [
            {
              service: 'plumbing',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Near Household', company: 'Near Household Co' },
          skills: [{ category: 'household', name: 'plumbing' }],
        },
        {
          id: 'far-household',
          tier: 'STANDARD',
          rating: 4.9,
          completedJobs: 20,
          yearsExperience: 7,
          description: 'Plumbing repair specialist',
          pastProjectType: 'household',
          bio: 'Home plumbing team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          gpsLat: 14.2063,
          gpsLng: 100.5018,
          priceList: [
            {
              service: 'plumbing',
              quantity: '1',
              unit: 'job',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Far Household', company: 'Far Household Co' },
          skills: [{ category: 'household', name: 'plumbing' }],
        },
      ]);

      const result = await service.matchFixers(
        'plumbing',
        'Pathum Wan',
        'Bangkok',
        'Need plumbing repair',
        undefined,
        undefined,
        13.7563,
        100.5018,
        'household',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toContain('near-household');
      expect(ids).not.toContain('far-household');
    });

    it('uses a 200 km radius for professional service matching', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'near-professional',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Legal contract specialist',
          pastProjectType: 'professional',
          bio: 'Legal team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          gpsLat: 15.1063,
          gpsLng: 100.5018,
          priceList: [
            {
              service: 'legal contract',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Near Professional', company: 'Near Professional Co' },
          skills: [{ category: 'professional', name: 'legal contract' }],
        },
        {
          id: 'far-professional',
          tier: 'STANDARD',
          rating: 4.9,
          completedJobs: 20,
          yearsExperience: 7,
          description: 'Legal contract specialist',
          pastProjectType: 'professional',
          bio: 'Legal team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          gpsLat: 16.0063,
          gpsLng: 100.5018,
          priceList: [
            {
              service: 'legal contract',
              quantity: '1',
              unit: 'job',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Far Professional', company: 'Far Professional Co' },
          skills: [{ category: 'professional', name: 'legal contract' }],
        },
      ]);

      const result = await service.matchFixers(
        'professional',
        'Pathum Wan',
        'Bangkok',
        'Need legal contract review',
        undefined,
        undefined,
        13.7563,
        100.5018,
        'professional',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toContain('near-professional');
      expect(ids).not.toContain('far-professional');
    });

    it('uses a 300 km radius for project team matching', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'near-project',
          tier: 'CORPORATE',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Office fitout specialist',
          pastProjectType: 'project',
          bio: 'Commercial project team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          gpsLat: 16.0063,
          gpsLng: 100.5018,
          priceList: [
            {
              service: 'office fitout',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Near Project', company: 'Near Project Co' },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
        {
          id: 'far-project',
          tier: 'CORPORATE',
          rating: 4.9,
          completedJobs: 20,
          yearsExperience: 7,
          description: 'Office fitout specialist',
          pastProjectType: 'project',
          bio: 'Commercial project team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          gpsLat: 17.0063,
          gpsLng: 100.5018,
          priceList: [
            {
              service: 'office fitout',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Far Project', company: 'Far Project Co' },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need office fitout',
        undefined,
        undefined,
        13.7563,
        100.5018,
        'project',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toContain('near-project');
      expect(ids).not.toContain('far-project');
    });

    it('should match service area by GPS-derived postal code', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'fixer-postal',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Plumbing repair specialist',
          pastProjectType: 'household',
          bio: 'Home plumbing team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Phra Khanong',
          servicePostalCode: '10110',
          priceList: [
            {
              service: 'plumbing',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Postal Pro', company: 'Postal Pro Co' },
          skills: [{ category: 'household', name: 'plumbing' }],
        },
        {
          id: 'fixer-other-area',
          tier: 'STANDARD',
          rating: 4.7,
          completedJobs: 9,
          yearsExperience: 4,
          description: 'Plumbing repair specialist',
          pastProjectType: 'household',
          bio: 'Home plumbing team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'plumbing',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Other Area Pro', company: 'Other Area Co' },
          skills: [{ category: 'household', name: 'plumbing' }],
        },
      ]);

      const result = await service.matchFixers(
        'plumbing',
        'Watthana',
        'Bangkok',
        'Need plumbing repair',
        undefined,
        '10110',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toContain('fixer-postal');
      expect(ids).not.toContain('fixer-other-area');
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

      expect(
        result.slice(0, 2).map((candidate: { id: string }) => candidate.id),
      ).toEqual(['suppadesh', 'bhavesh']);
    });

    it('should rank by the highest-value matched service group before cheaper lower-value groups', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Office build and digital delivery team',
          pastProjectType: 'fitout website chatbot',
          bio: 'Fitout, construction, website, and chatbot',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '30000',
            },
            {
              service: 'Reinstatement',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '10000',
            },
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '20000',
            },
            {
              service: 'Website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1000',
            },
            {
              service: 'Chatbot',
              quantity: '1',
              unit: 'FAQ',
              finalPrice: '100',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            company: 'Bhavesh Fungprasertsuk',
          },
          skills: [
            { category: 'project', name: 'fitout' },
            { category: 'project', name: 'website development' },
            { category: 'project', name: 'chatbot' },
          ],
        },
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: 'Office fitout reinstatement construction',
          pastProjectType: 'fitout construction',
          bio: 'Commercial site team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '25000',
            },
            {
              service: 'Reinstatement',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '5000',
            },
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '15000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            company: 'Suppadesh Funpgrsertsuk',
          },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
        {
          id: 'gatoru',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Website development and chatbot delivery',
          pastProjectType: 'digital',
          bio: 'Digital team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'Website Development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1200',
            },
            {
              service: 'Chatbot',
              quantity: '1',
              unit: 'FAQ',
              finalPrice: '20',
            },
          ],
          user: { name: 'Gatoru Sojo', company: 'Gatoru Sojo' },
          skills: [
            { category: 'project', name: 'website development' },
            { category: 'project', name: 'chatbot' },
          ],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'I want a team to carry out a 10 sq.m. office fit out, a 10 sq.m. reinstatement work, a 10 sq.m. office building construction and a 1000 page website development and a 1000 FAQ chatbot.',
      );

      expect(
        result.slice(0, 2).map((candidate: { id: string }) => candidate.id),
      ).toEqual(['bhavesh', 'gatoru']);
      expect(
        result.find((candidate: { id: string }) => candidate.id === 'suppadesh')
          ?.selectedReason,
      ).not.toMatch(/Cheapest/);
    });
  });
});
