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
import { of } from 'rxjs';

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
  let configService: { get: jest.Mock };
  let httpService: { post: jest.Mock };

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
    configService = { get: jest.fn() };
    httpService = { post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixerService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
        { provide: HttpService, useValue: httpService },
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

  it('persists the evaluated Standard tier when minimum experience and certificate evidence qualify', async () => {
    const createdFixer = {
      id: 'fixer-standard',
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
      name: 'Standard Partner',
      email: 'standard@example.com',
      phone: '0812345678',
      company: 'Standard Co',
      bio: 'Experienced repair and project service provider.',
      description: 'Provides office repair and renovation services.',
      pastExperience:
        'More than three years experience with a professional certificate and completed one million baht project.',
      pastProjectType: 'corporate',
      yearsExperience: 4,
      travelRadius: 20,
      kycImageCount: 3,
      portfolioImageCount: 2,
      companyAddress: {
        province: 'Bangkok',
        district: 'Pathum Wan',
        houseNumber: '1',
      },
      address: { province: 'Bangkok', district: 'Pathum Wan' },
      skills: [
        { category: 'fitout', name: 'fitout' },
        { category: 'reinstatement', name: 'reinstatement' },
      ],
      priceList: [
        {
          service: 'fit out',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '30000',
        },
      ],
      portfolioDigest: {
        fallback: false,
        content_score: 80,
        total_text_length: 500,
        results: [
          {
            verification_hints: [
              'Professional certificate detected',
              'Million baht project completion certificate detected',
            ],
          },
        ],
      },
    } as never);

    expect(prisma.fixer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'STANDARD',
          aiTier: 'Standard',
          aiScore: expect.any(Number),
          aiCredentialStatus: expect.stringMatching(/partial|verified/),
          aiBreakdown: expect.arrayContaining([
            expect.objectContaining({ label: 'Experience', max: 25 }),
            expect.objectContaining({
              label: 'Credential Verification',
              max: 10,
            }),
          ]),
        }),
      }),
    );
  });

  it('does not persist Corporate when the score is high but corporate certificates are missing', async () => {
    const createdFixer = {
      id: 'fixer-high-score-no-corporate-cert',
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
      name: 'High Score Partner',
      email: 'high@example.com',
      phone: '0812345678',
      company: 'High Score Co',
      bio: 'Very detailed and complete provider profile for many scopes.',
      description:
        'Detailed profile with long project descriptions and many service areas but no corporate endorsed certificate.',
      pastExperience:
        '15 years experience, many projects, many skills, detailed profile, but no endorsed corporate certificate evidence.',
      pastProjectType: 'corporate',
      yearsExperience: 15,
      travelRadius: 50,
      kycImageCount: 3,
      portfolioImageCount: 6,
      companyAddress: {
        province: 'Bangkok',
        district: 'Pathum Wan',
        houseNumber: '1',
      },
      address: { province: 'Bangkok', district: 'Pathum Wan' },
      skills: [
        { category: 'fitout', name: 'fitout' },
        { category: 'reinstatement', name: 'reinstatement' },
        { category: 'green construction', name: 'green construction' },
        { category: 'mep', name: 'mep' },
        { category: 'interior', name: 'interior' },
      ],
      priceList: [
        {
          service: 'fit out',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '30000',
        },
        {
          service: 'reinstatement',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '7000',
        },
        {
          service: 'green construction',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '20000',
        },
      ],
      portfolioDigest: {
        fallback: false,
        content_score: 95,
        total_text_length: 1200,
        results: [
          {
            verification_hints: [
              'Portfolio photos and project descriptions detected',
              'No corporate endorsed certificate detected',
            ],
          },
        ],
      },
    } as never);

    expect(prisma.fixer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'ECONOMY',
          aiTier: 'Economy',
          aiFlags: expect.arrayContaining([
            expect.objectContaining({
              type: 'warn',
              message: expect.stringContaining('Corporate tier requires'),
            }),
          ]),
        }),
      }),
    );
  });

  it('persists Specialist only when corporate completion certificate evidence meets the gate', async () => {
    const createdFixer = {
      id: 'fixer-specialist',
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
      name: 'Specialist Partner',
      email: 'specialist@example.com',
      phone: '0812345678',
      company: 'Specialist Co',
      bio: 'Corporate project specialist with verified completion evidence.',
      description:
        'Specialist provider for large corporate office fit-out and reinstatement projects.',
      pastExperience:
        '10 years experience with five corporate client endorsed project completion certificates.',
      pastProjectType: 'corporate',
      yearsExperience: 10,
      travelRadius: 60,
      kycImageCount: 3,
      portfolioImageCount: 5,
      companyAddress: {
        province: 'Bangkok',
        district: 'Pathum Wan',
        houseNumber: '1',
      },
      address: { province: 'Bangkok', district: 'Pathum Wan' },
      skills: [
        { category: 'fitout', name: 'fitout' },
        { category: 'reinstatement', name: 'reinstatement' },
        { category: 'green construction', name: 'green construction' },
        { category: 'mep', name: 'mep' },
        { category: 'interior', name: 'interior' },
      ],
      priceList: [
        {
          service: 'fit out',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '30000',
        },
        {
          service: 'reinstatement',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '7000',
        },
        {
          service: 'green construction',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '20000',
        },
      ],
      portfolioDigest: {
        fallback: false,
        content_score: 95,
        total_text_length: 1600,
        results: [
          {
            verification_hints: [
              '5 corporate client endorsed project completion certificates detected',
              'SET-listed corporate client reference detected',
            ],
          },
        ],
      },
    } as never);

    expect(prisma.fixer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'SPECIALIST',
          aiTier: 'Specialist',
          aiCredentialStatus: 'verified',
        }),
      }),
    );
  });

  const enableTyphoonReview = () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'typhoon.apiKey': 'test-typhoon-key',
        'typhoon.baseUrl': 'https://api.opentyphoon.ai/v1',
        'typhoon.model': 'typhoon-v2.5-30b-a3b-instruct',
      };
      return values[key];
    });
  };

  it('keeps deterministic tier gates when Typhoon recommends an unsafe upgrade', async () => {
    enableTyphoonReview();
    httpService.post.mockReturnValue(
      of({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  credentialStatus: 'verified',
                  risk: 'low',
                  recommendedTier: 'Corporate',
                  notes: [
                    'Claims look polished but no corporate certificates were supplied',
                  ],
                }),
              },
            },
          ],
        },
      }),
    );
    const createdFixer = {
      id: 'fixer-unsafe-typhoon-upgrade',
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
      name: 'Unsafe Upgrade Partner',
      email: 'unsafe@example.com',
      phone: '0812345678',
      company: 'Unsafe Upgrade Co',
      bio: 'Detailed provider profile with a polished but unsupported corporate claim.',
      description:
        'Provider claims large corporate projects but has not uploaded corporate endorsed certificates.',
      pastExperience:
        'Two years experience with marketing language and no corporate client endorsed certificates.',
      yearsExperience: 2,
      travelRadius: 20,
      kycImageCount: 3,
      portfolioImageCount: 5,
      companyAddress: {
        province: 'Bangkok',
        district: 'Pathum Wan',
        houseNumber: '1',
      },
      address: { province: 'Bangkok', district: 'Pathum Wan' },
      skills: [{ category: 'fitout', name: 'fitout' }],
      priceList: [
        {
          service: 'fit out',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '30000',
        },
      ],
    } as never);

    expect(prisma.fixer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'ECONOMY',
          aiTier: 'Economy',
          aiCredentialStatus: 'unverified',
          aiFlags: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('Typhoon review:'),
            }),
          ]),
        }),
      }),
    );
  });

  it('parses fenced Typhoon JSON and allows risk review to downgrade credential status', async () => {
    enableTyphoonReview();
    httpService.post.mockReturnValue(
      of({
        data: {
          choices: [
            {
              message: {
                content:
                  '```json\n{"credentialStatus":"unverified","risk":"high","recommendedTier":"Economy","notes":["External credential evidence was not supplied"]}\n```',
              },
            },
          ],
        },
      }),
    );
    const createdFixer = {
      id: 'fixer-typhoon-downgrade',
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
      name: 'Downgrade Partner',
      email: 'downgrade@example.com',
      phone: '0812345678',
      company: 'Downgrade Co',
      bio: 'Experienced repair and project service provider.',
      description: 'Provides office repair and renovation services.',
      pastExperience:
        'More than three years experience with a professional certificate and completed one million baht project.',
      yearsExperience: 4,
      travelRadius: 20,
      kycImageCount: 3,
      portfolioImageCount: 2,
      companyAddress: {
        province: 'Bangkok',
        district: 'Pathum Wan',
        houseNumber: '1',
      },
      address: { province: 'Bangkok', district: 'Pathum Wan' },
      skills: [{ category: 'fitout', name: 'fitout' }],
      priceList: [
        {
          service: 'fit out',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '30000',
        },
      ],
    } as never);

    expect(prisma.fixer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'STANDARD',
          aiTier: 'Standard',
          aiCredentialStatus: 'unverified',
          aiFlags: expect.arrayContaining([
            expect.objectContaining({
              type: 'warn',
              message: expect.stringContaining('External credential evidence'),
            }),
          ]),
        }),
      }),
    );
  });

  it('ignores invalid Typhoon schema values instead of persisting them', async () => {
    enableTyphoonReview();
    httpService.post.mockReturnValue(
      of({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  credentialStatus: 'super_verified',
                  risk: 'severe',
                  recommendedTier: 'Owner',
                  notes: [
                    'Invalid enum values should not enter persisted AI fields',
                  ],
                }),
              },
            },
          ],
        },
      }),
    );
    const createdFixer = {
      id: 'fixer-invalid-typhoon-schema',
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
      name: 'Schema Partner',
      email: 'schema@example.com',
      phone: '0812345678',
      company: 'Schema Co',
      bio: 'Experienced repair and project service provider.',
      description: 'Provides office repair and renovation services.',
      pastExperience:
        'More than three years experience with a professional certificate and completed one million baht project.',
      yearsExperience: 4,
      travelRadius: 20,
      kycImageCount: 3,
      portfolioImageCount: 2,
      companyAddress: {
        province: 'Bangkok',
        district: 'Pathum Wan',
        houseNumber: '1',
      },
      address: { province: 'Bangkok', district: 'Pathum Wan' },
      skills: [{ category: 'fitout', name: 'fitout' }],
      priceList: [
        {
          service: 'fit out',
          quantity: '1',
          unit: 'sq.m.',
          finalPrice: '30000',
        },
      ],
    } as never);

    expect(prisma.fixer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'STANDARD',
          aiTier: 'Standard',
          aiCredentialStatus: 'partial',
          aiFlags: expect.not.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('Invalid enum values'),
            }),
          ]),
        }),
      }),
    );
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

    it('should only return Bangkok partners with a matching fit-out price-list service', async () => {
      prisma.fixer.findMany.mockResolvedValue([
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
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            company: 'Bhavesh Fungprasertsuk',
          },
          skills: [{ category: 'project', name: 'office fitout' }],
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
              service: 'Fit out',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '25000',
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
          completedJobs: 2,
          yearsExperience: 2,
          description: 'Office cleaning and maintenance',
          pastProjectType: 'maintenance',
          bio: 'Office maintenance team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'office cleaning',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '1200',
            },
          ],
          user: { name: 'Gatoru Sojo', company: 'Gatoru Sojo' },
          skills: [{ category: 'project', name: 'office cleaning' }],
        },
        {
          id: 'ghis-cafe',
          tier: 'STANDARD',
          rating: 4.7,
          completedJobs: 8,
          yearsExperience: 4,
          description: 'Office painting and cafe maintenance',
          pastProjectType: 'maintenance',
          bio: 'Office painting crew',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'office painting',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '15000',
            },
          ],
          user: { name: 'Ghis Cafe', company: 'Ghis Cafe' },
          skills: [{ category: 'project', name: 'office painting' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need 1200 sq.m. office fit out work',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toEqual(expect.arrayContaining(['bhavesh', 'suppadesh']));
      expect(ids).not.toContain('gatoru');
      expect(ids).not.toContain('ghis-cafe');
    });

    it('should normalize common fit-out typing mistakes before price-list matching', async () => {
      prisma.fixer.findMany.mockResolvedValue([
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
              service: 'Office painting',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '1200',
            },
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sqm',
              finalPrice: '25000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            company: 'Suppadesh Funpgrsertsuk',
          },
          skills: [{ category: 'project', name: 'office fitout' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need 1200 sq.m. office fiitout work',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'suppadesh',
          estimatedTotal: 30000000,
          estimatedUnit: 'sqm',
          estimatedQty: 1200,
          price: 30000000,
        }),
      );
      expect(result[0]).toHaveProperty('estimatedBreakdown', [
        {
          service: 'Fit out',
          qty: 1200,
          unit: 'sqm',
          unitRate: 25000,
          total: 30000000,
        },
      ]);
    });
    it('uses explicit fit-out description intent over a conflicting digital marketing category', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: 'Office fitout specialist',
          pastProjectType: 'fitout',
          bio: 'Commercial fitout team',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '28000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            email: 'suppadesh@yahoo.com',
          },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 4.9,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Can do fitout work',
          pastProjectType: 'fitout',
          bio: '',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            email: 'bhaveshfung@gmail.com',
          },
          skills: [{ category: 'FITOUT', name: 'Fit-out' }],
        },
        {
          id: 'ghis-cafe',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Digital marketing and image ads',
          pastProjectType: 'marketing',
          bio: 'Cafe marketing support',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'image ads',
              quantity: '600',
              unit: 'image',
              finalPrice: '1200000',
            },
          ],
          user: {
            name: 'Ghis Cafe',
            email: 'ghiscafe@gmail.com',
          },
          skills: [{ category: 'DIGITAL_MARKETING', name: 'image ads' }],
        },
      ]);

      const result = await service.matchFixers(
        'DIGITAL_MARKETING',
        'วังทองหลาง',
        'กรุงเทพมหานคร',
        'I have a 600 fitout work.',
        undefined,
        undefined,
        undefined,
        undefined,
        'professional',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toEqual(expect.arrayContaining(['suppadesh', 'bhavesh']));
      expect(ids).not.toContain('ghis-cafe');
      expect(result.find((candidate) => candidate.id === 'suppadesh')).toEqual(
        expect.objectContaining({
          estimatedTotal: 16800000,
          price: 16800000,
          estimatedBreakdown: [
            {
              service: 'Fit out',
              qty: 600,
              unit: 'sq.m.',
              unitRate: 28000,
              total: 16800000,
            },
          ],
        }),
      );
    });
    it('does not allow 8th nomination to bypass area and matched fit-out price-list filters', async () => {
      const fixture = [
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: 'Office fitout specialist',
          pastProjectType: 'fitout',
          bio: 'Commercial fitout team',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '28000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            email: 'suppadesh@yahoo.com',
          },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 4.9,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Can do fitout work',
          pastProjectType: 'fitout',
          bio: '',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            email: 'bhaveshfung@gmail.com',
          },
          skills: [{ category: 'FITOUT', name: 'Fit-out' }],
        },
        {
          id: 'ghis-cafe',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Digital marketing and image ads',
          pastProjectType: 'marketing',
          bio: 'Cafe marketing support',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'image ads',
              quantity: '600',
              unit: 'image',
              finalPrice: '1200000',
            },
          ],
          user: {
            name: 'Ghis Cafe',
            email: 'ghiscafe@gmail.com',
          },
          skills: [{ category: 'DIGITAL_MARKETING', name: 'image ads' }],
        },
        {
          id: 'far-fitout',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 4,
          description: 'Fitout team outside the requested area',
          pastProjectType: 'fitout',
          bio: 'Out of area fitout team',
          serviceProvince: 'เชียงใหม่',
          serviceDistrict: 'เมืองเชียงใหม่',
          servicePostalCode: '50000',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '10000',
            },
          ],
          user: {
            name: 'Far Fitout',
            email: 'far@example.com',
          },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
      ];

      for (const bookingType of ['household', 'project', 'professional']) {
        prisma.fixer.findMany.mockResolvedValueOnce(fixture);
        const result = await service.matchFixers(
          'DIGITAL_MARKETING',
          'วังทองหลาง',
          'กรุงเทพมหานคร',
          'I have a 600 fitout work.',
          'ghis',
          undefined,
          undefined,
          undefined,
          bookingType,
        );

        const ids = result.map((candidate: { id: string }) => candidate.id);
        expect(ids).toEqual(expect.arrayContaining(['suppadesh', 'bhavesh']));
        expect(ids).not.toContain('ghis-cafe');
        expect(ids).not.toContain('far-fitout');
      }
    });
    it('should include Bangkok project providers in another district when GPS is absent', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: '',
          pastProjectType: 'corporate',
          bio: '',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            email: 'suppadesh@yahoo.com',
          },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Can do fitout work',
          pastProjectType: 'specialist',
          bio: '',
          serviceProvince: '',
          serviceDistrict: '',
          servicePostalCode: '',
          gpsLat: 13.794067404742384,
          gpsLng: 100.60958770025377,
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            email: 'bhaveshfung@gmail.com',
          },
          skills: [{ category: 'FITOUT', name: 'Fit-out' }],
        },
        {
          id: 'gatoru',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 2,
          yearsExperience: 2,
          description: 'Website and chatbot development',
          pastProjectType: 'digital',
          bio: 'Digital delivery team',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'ปทุมวัน',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1200',
            },
          ],
          user: { name: 'Gatoru Sojo', email: 'gatoru@example.com' },
          skills: [{ category: 'project', name: 'website development' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need 1000 sq.m. office fitout work',
        undefined,
        undefined,
        undefined,
        undefined,
        'project',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toEqual(expect.arrayContaining(['suppadesh', 'bhavesh']));
      expect(ids).not.toContain('gatoru');
    });

    it('should fall back to stored Bangkok service area for project partners without GPS', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: '',
          pastProjectType: 'corporate',
          bio: '',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          gpsLat: null,
          gpsLng: null,
          priceList: [
            {
              service: 'fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            email: 'suppadesh@yahoo.com',
          },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'near-bhavesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Can do fitout work',
          pastProjectType: 'specialist',
          bio: '',
          serviceProvince: '',
          serviceDistrict: '',
          servicePostalCode: '',
          gpsLat: 13.794067404742384,
          gpsLng: 100.60958770025377,
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            email: 'bhaveshfung@gmail.com',
          },
          skills: [{ category: 'FITOUT', name: 'Fit-out' }],
        },
        {
          id: 'far-fitout',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Distant fitout team',
          pastProjectType: 'specialist',
          bio: '',
          serviceProvince: 'Chiang Mai',
          serviceDistrict: 'Mueang Chiang Mai',
          servicePostalCode: '50000',
          gpsLat: 18.7883,
          gpsLng: 98.9853,
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '29000',
            },
          ],
          user: { name: 'Far Fitout', email: 'far@example.com' },
          skills: [{ category: 'FITOUT', name: 'Fit-out' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need 1000 sq.m. office fitout work',
        undefined,
        undefined,
        13.7563,
        100.5018,
        'project',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toEqual(
        expect.arrayContaining(['suppadesh', 'near-bhavesh']),
      );
      expect(ids).not.toContain('far-fitout');
    });

    it('should match Thai fit-out synonyms to English fit-out price-list rows', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: '',
          pastProjectType: 'corporate',
          bio: '',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            email: 'suppadesh@yahoo.com',
          },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'ต้องการตกแต่งภายในออฟฟิศ 1000 ตรม.',
        undefined,
        undefined,
        undefined,
        undefined,
        'project',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'suppadesh',
          estimatedTotal: 30000000,
          estimatedUnit: 'sq.m.',
          estimatedQty: 1000,
        }),
      );
    });
    it('keeps selected-location household jobs in the same district outside province-wide exceptions', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'same-district-household',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Plumbing repair specialist',
          pastProjectType: 'household',
          bio: 'Home plumbing team',
          serviceProvince: 'Chiang Mai',
          serviceDistrict: 'Mueang Chiang Mai',
          priceList: [
            {
              service: 'plumbing',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Same District Household' },
          skills: [{ category: 'household', name: 'plumbing' }],
        },
        {
          id: 'other-district-household',
          tier: 'STANDARD',
          rating: 4.9,
          completedJobs: 20,
          yearsExperience: 7,
          description: 'Plumbing repair specialist',
          pastProjectType: 'household',
          bio: 'Home plumbing team',
          serviceProvince: 'Chiang Mai',
          serviceDistrict: 'Hang Dong',
          priceList: [
            {
              service: 'plumbing',
              quantity: '1',
              unit: 'job',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Other District Household' },
          skills: [{ category: 'household', name: 'plumbing' }],
        },
      ]);

      const result = await service.matchFixers(
        'plumbing',
        'Mueang Chiang Mai',
        'Chiang Mai',
        'Need plumbing repair',
        undefined,
        undefined,
        undefined,
        undefined,
        'household',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toContain('same-district-household');
      expect(ids).not.toContain('other-district-household');
    });

    it.each([
      ['Bangkok', 'Pathum Wan', 'Wang Thonglang'],
      ['Nonthaburi', 'Mueang Nonthaburi', 'Pak Kret'],
      ['Phuket', 'Mueang Phuket', 'Kathu'],
    ])(
      'matches selected-location household jobs by province in %s',
      async (province, district, otherDistrict) => {
        prisma.fixer.findMany.mockResolvedValue([
          {
            id: 'province-wide-household',
            tier: 'STANDARD',
            rating: 4.8,
            completedJobs: 12,
            yearsExperience: 6,
            description: 'Plumbing repair specialist',
            pastProjectType: 'household',
            bio: 'Home plumbing team',
            serviceProvince: province,
            serviceDistrict: otherDistrict,
            priceList: [
              {
                service: 'plumbing',
                quantity: '1',
                unit: 'job',
                finalPrice: '2500',
              },
            ],
            user: { name: 'Province Wide Household' },
            skills: [{ category: 'household', name: 'plumbing' }],
          },
        ]);

        const result = await service.matchFixers(
          'plumbing',
          district,
          province,
          'Need plumbing repair',
          undefined,
          undefined,
          undefined,
          undefined,
          'household',
        );

        const ids = result.map((candidate: { id: string }) => candidate.id);
        expect(ids).toContain('province-wide-household');
      },
    );
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

    it('matches each mixed project quantity only to its local service phrase', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'suppadesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 20,
          description: 'Office fitout and green construction specialist',
          pastProjectType: 'fitout green construction',
          bio: 'Commercial fitout and green construction team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '25000',
            },
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '20000',
            },
          ],
          user: {
            name: 'Suppadesh Funpgrsertsuk',
            company: 'Suppadesh Funpgrsertsuk',
          },
          skills: [{ category: 'project', name: 'fitout green construction' }],
        },
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Office fitout, green construction, and website',
          pastProjectType: 'fitout green construction website',
          bio: 'Commercial build and website team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '20000',
            },
            {
              service: 'Website Development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1000',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            company: 'Bhavesh Fungprasertsuk',
          },
          skills: [
            { category: 'project', name: 'fitout green construction' },
            { category: 'project', name: 'website development' },
          ],
        },
        {
          id: 'gatoru',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Website development',
          pastProjectType: 'website development',
          bio: 'Website team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'Website Development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1200',
            },
          ],
          user: { name: 'Gatoru Sojo', company: 'Gatoru Sojo' },
          skills: [{ category: 'project', name: 'website development' }],
        },
      ]);

      const result = await service.matchFixers(
        'INTERIOR',
        'Pathum Wan',
        'Bangkok',
        'fit out 1000 sq.m., green construction 100 sq.m., and website 10 pages',
      );

      expect(
        result.find(
          (candidate: { id: string }) => candidate.id === 'suppadesh',
        ),
      ).toHaveProperty('estimatedBreakdown', [
        {
          service: 'Fit out',
          qty: 1000,
          unit: 'sq.m.',
          unitRate: 25000,
          total: 25000000,
        },
        {
          service: 'Construction',
          qty: 100,
          unit: 'sq.m.',
          unitRate: 20000,
          total: 2000000,
        },
      ]);
      expect(
        result.find((candidate: { id: string }) => candidate.id === 'bhavesh'),
      ).toHaveProperty('estimatedBreakdown', [
        {
          service: 'Fit-out',
          qty: 1000,
          unit: 'sq.m.',
          unitRate: 30000,
          total: 30000000,
        },
        {
          service: 'Construction',
          qty: 100,
          unit: 'sq.m.',
          unitRate: 20000,
          total: 2000000,
        },
        {
          service: 'Website Development',
          qty: 10,
          unit: 'page',
          unitRate: 1000,
          total: 10000,
        },
      ]);
      expect(
        result.find((candidate: { id: string }) => candidate.id === 'gatoru'),
      ).toHaveProperty('estimatedBreakdown', [
        {
          service: 'Website Development',
          qty: 10,
          unit: 'page',
          unitRate: 1200,
          total: 12000,
        },
      ]);
    });
  });
});
