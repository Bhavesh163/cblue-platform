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
  ServiceUnavailableException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { MatchingIntelligenceService } from './matching-intelligence.service';

describe('FixerService', () => {
  let service: FixerService;
  let prisma: {
    $transaction: jest.Mock;
    fixer: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    fixerSkill: Record<string, jest.Mock>;
    fixerAvailability: Record<string, jest.Mock>;
    image: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
  };
  let eventEmitter: { emit: jest.Mock };
  let configService: { get: jest.Mock };
  let httpService: { post: jest.Mock };
  let matchingIntelligence: { analyze: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((operation: (tx: unknown) => unknown) =>
        operation(prisma),
      ),
      fixer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ role: 'USER' }),
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
      order: {
        findFirst: jest.fn(),
      },
    };
    eventEmitter = { emit: jest.fn() };
    configService = { get: jest.fn() };
    httpService = { post: jest.fn() };
    matchingIntelligence = { analyze: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixerService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
        { provide: HttpService, useValue: httpService },
        {
          provide: MatchingIntelligenceService,
          useValue: matchingIntelligence,
        },
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
            contactPhone: undefined,
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

      expect(result.id).toBe('fixer-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'fixer.registered',
        expect.objectContaining({ fixerId: 'fixer-1' }),
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('preserves ADMIN authority when an administrator registers a fixer profile', async () => {
      const createdFixer = {
        id: 'fixer-admin',
        userId: 'admin-1',
        user: { id: 'admin-1', role: 'ADMIN' },
        skills: [],
      };
      prisma.fixer.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdFixer);
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.user.update.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
      prisma.fixer.create.mockResolvedValue(createdFixer);

      await service.register('admin-1', {
        bio: 'Administrator and verified provider',
        yearsExperience: 10,
        travelRadius: 100,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { role: 'ADMIN' },
      });
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
          tier: 'ECONOMY',
          status: 'PENDING',
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
          tier: 'ECONOMY',
          status: 'PENDING',
          aiTier: 'Specialist',
          aiCredentialStatus: 'verified',
          aiFlags: expect.arrayContaining([
            expect.objectContaining({
              type: 'warn',
              message: expect.stringContaining('Admin tier review required'),
            }),
          ]),
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
              message: expect.stringContaining('blue AI review:'),
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
          tier: 'ECONOMY',
          status: 'PENDING',
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
          tier: 'ECONOMY',
          status: 'PENDING',
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
    it('does not report an infrastructure failure as a valid zero-result match', async () => {
      prisma.fixer.findMany.mockRejectedValue(new Error('database offline'));

      await expect(
        service.matchFixers(
          'household',
          '??????????',
          '?????????????',
          '???????? 1 ???',
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
    it('matches a fixer by the resolved service subdistrict', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'saphan-song-fixer',
          tier: 'STANDARD',
          rating: 4.5,
          completedJobs: 3,
          yearsExperience: 4,
          description: 'Office fit-out team',
          bio: 'Office fit-out team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Wang Thonglang',
          serviceSubdistrict: 'Saphan Song',
          servicePostalCode: '10310',
          priceList: [],
          user: { name: 'Saphan Song Fixer', company: null },
          skills: [{ category: 'project', name: 'fit-out' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Wang Thonglang',
        'Bangkok',
        'office fit-out',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'Saphan Song',
      );

      expect(result.map((candidate: { id: string }) => candidate.id)).toContain(
        'saphan-song-fixer',
      );
    });

    it('should use quantity-aware price list matching for fit-out projects', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'fixer-fitout',
          publicDisplayName: 'Verified Fitout Company Limited',
          verifiedCompanyName: 'Verified Fitout Company Limited',
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
            alias: string;
            estimatedTotal: number;
            price: number;
            estimatedUnit: string;
            estimatedQty: number;
          }
        | undefined;

      expect(fitoutCandidate).toBeDefined();
      expect(fitoutCandidate?.alias).toBe('Verified Fitout Company Limited');
      expect(fitoutCandidate?.estimatedTotal).toBe(1200000);
      expect(fitoutCandidate?.price).toBe(1200000);
      expect(fitoutCandidate?.estimatedUnit).toBe('sqm');
      expect(fitoutCandidate?.estimatedQty).toBe(1000);
      expect((fitoutCandidate as any)?.matchTrace).toEqual(
        expect.objectContaining({
          eligible: true,
          service: expect.objectContaining({
            matched: true,
            source: 'price_list',
            requested: 'project',
          }),
          area: expect.objectContaining({
            matched: true,
            district: 'Pathum Wan',
            province: 'Bangkok',
          }),
          budget: expect.objectContaining({
            total: 1200000,
            breakdown: expect.arrayContaining([
              expect.objectContaining({
                service: 'office fitout',
                qty: 1000,
                total: 1200000,
              }),
            ]),
          }),
          typhoon: expect.objectContaining({ applied: false }),
        }),
      );
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
    it('keeps fit-out and website lines when quantity comes before each service phrase', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 4.9,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Office fitout and website development',
          pastProjectType: 'fitout website',
          bio: 'Commercial fitout and web delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'Fit-out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '30000',
            },
            {
              service: 'Website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1000',
            },
          ],
          user: {
            name: 'Bhavesh Fungprasertsuk',
            email: 'bhaveshfung@gmail.com',
          },
          skills: [
            { category: 'FITOUT', name: 'Fit-out' },
            { category: 'WEBSITE', name: 'Website development' },
          ],
        },
      ]);

      const result = await service.matchFixers(
        'SAFETY_OFFICER',
        '??????????',
        '?????????????',
        'I have a 1200 sq.m fit out and 100 page website development.',
        undefined,
        undefined,
        undefined,
        undefined,
        'professional',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'bhavesh',
          estimatedTotal: 36100000,
          price: 36000000,
          estimatedBreakdown: [
            {
              service: 'Fit-out',
              qty: 1200,
              unit: 'sq.m.',
              unitRate: 30000,
              total: 36000000,
            },
            {
              service: 'Website development',
              qty: 100,
              unit: 'page',
              unitRate: 1000,
              total: 100000,
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
    it('keeps deterministic Top-8 slots while accepting factual AI audit notes', async () => {
      enableTyphoonReview();
      httpService.post.mockReturnValue(
        of({
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rankedCandidateIds: [
                      'premium-fitout',
                      'ghost-provider',
                      'budget-fitout',
                    ],
                    notesByCandidateId: {
                      'premium-fitout':
                        'Best balance of rating and complete matched fit-out budget',
                      'ghost-provider':
                        'This hallucinated provider must be ignored',
                    },
                  }),
                },
              },
            ],
          },
        }),
      );
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'budget-fitout',
          tier: 'ECONOMY',
          rating: 4.6,
          completedJobs: 3,
          yearsExperience: 4,
          description: 'Budget office fitout team',
          pastProjectType: 'fitout',
          bio: 'Office fitout delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '25000',
            },
          ],
          user: { name: 'Budget Fitout', email: 'budget@example.com' },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'standard-fitout',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 10,
          yearsExperience: 8,
          description: 'Standard office fitout team',
          pastProjectType: 'fitout',
          bio: 'Office fitout delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '28000',
            },
          ],
          user: { name: 'Standard Fitout', email: 'standard@example.com' },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'premium-fitout',
          tier: 'CORPORATE',
          rating: 5,
          completedJobs: 20,
          yearsExperience: 12,
          description: 'Corporate office fitout team',
          pastProjectType: 'fitout',
          bio: 'Office fitout delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '32000',
            },
          ],
          user: { name: 'Premium Fitout', email: 'premium@example.com' },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'digital-only',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 30,
          yearsExperience: 6,
          description: 'Digital ads only',
          pastProjectType: 'marketing',
          bio: 'Marketing team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'image ads',
              quantity: '1',
              unit: 'image',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Digital Only', email: 'digital@example.com' },
          skills: [{ category: 'DIGITAL_MARKETING', name: 'image ads' }],
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

      expect(result.map((candidate: { id: string }) => candidate.id)).toEqual([
        'budget-fitout',
        'standard-fitout',
        'premium-fitout',
      ]);
      expect(
        result.map((candidate: { id: string }) => candidate.id),
      ).not.toContain('ghost-provider');
      expect(
        result.map((candidate: { id: string }) => candidate.id),
      ).not.toContain('digital-only');
      expect(result[2]?.selectedReason).toContain('blue AI: Best balance');
      expect((result[2] as any)?.matchTrace?.typhoon).toEqual(
        expect.objectContaining({
          applied: true,
          note: expect.stringContaining('Best balance'),
        }),
      );
    });

    it('uses deterministic Top-8 matching when Typhoon API key is missing', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'budget-fitout',
          tier: 'ECONOMY',
          rating: 4.6,
          completedJobs: 3,
          yearsExperience: 4,
          description: 'Budget office fitout team',
          pastProjectType: 'fitout',
          bio: 'Office fitout delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '25000',
            },
          ],
          user: { name: 'Budget Fitout', email: 'budget@example.com' },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
        },
        {
          id: 'premium-fitout',
          tier: 'CORPORATE',
          rating: 5,
          completedJobs: 20,
          yearsExperience: 12,
          description: 'Corporate office fitout team',
          pastProjectType: 'fitout',
          bio: 'Office fitout delivery',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          servicePostalCode: '10330',
          priceList: [
            {
              service: 'Fit out',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '32000',
            },
          ],
          user: { name: 'Premium Fitout', email: 'premium@example.com' },
          skills: [{ category: 'FITOUT', name: 'FITOUT' }],
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

      expect(httpService.post).not.toHaveBeenCalled();
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'budget-fitout',
          estimatedTotal: 25000000,
        }),
      );
    });
    it('excludes providers whose persisted location cannot establish service range', async () => {
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
      expect(ids).toEqual(['suppadesh']);
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

    it('matches shorthand plumbing requests to water pipe price-list rows', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'pipe-team',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Water pipe repair specialist',
          pastProjectType: 'plumbing',
          bio: 'Home water pipe team',
          serviceProvince:
            '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
          serviceDistrict:
            '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'water pipe repair',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Pipe Team' },
          skills: [{ category: 'household', name: 'water pipe repair' }],
        },
        {
          id: 'ads-team',
          tier: 'STANDARD',
          rating: 5,
          completedJobs: 20,
          yearsExperience: 8,
          description: 'Digital ads team',
          pastProjectType: 'marketing',
          bio: 'Image ads and social media',
          serviceProvince:
            '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
          serviceDistrict:
            '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'image ads',
              quantity: '1',
              unit: 'image',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Ads Team' },
          skills: [{ category: 'marketing', name: 'image ads' }],
        },
      ]);

      const result = await service.matchFixers(
        'home services',
        '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
        '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
        'Need plumb repair 3 jobs',
        undefined,
        '10310',
        undefined,
        undefined,
        'household',
      );

      expect(result.map((candidate: { id: string }) => candidate.id)).toContain(
        'pipe-team',
      );
      expect(
        result.find((candidate: { id: string }) => candidate.id === 'ads-team'),
      ).toBeUndefined();
      expect(
        result.find(
          (candidate: { id: string }) => candidate.id === 'pipe-team',
        ),
      ).toHaveProperty('estimatedBreakdown', [
        {
          service: 'water pipe repair',
          qty: 3,
          unit: 'job',
          unitRate: 2500,
          total: 7500,
        },
      ]);

      const thaiTypoResult = await service.matchFixers(
        'home services',
        '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
        '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
        '\u0e07\u0e32\u0e19\u0e1b\u0e1b\u0e23\u0e30\u0e1b\u0e32 3 \u0e07\u0e32\u0e19',
        undefined,
        '10310',
        undefined,
        undefined,
        'household',
      );

      expect(
        thaiTypoResult.map((candidate: { id: string }) => candidate.id),
      ).toContain('pipe-team');
    });

    it('matches expanded home-service typos to exact price-list items only', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'electric-team',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Electrical wiring specialist',
          pastProjectType: 'household',
          bio: 'Home electrical team',
          serviceProvince:
            '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
          serviceDistrict:
            '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'electrical wiring',
              quantity: '1',
              unit: 'job',
              finalPrice: '1800',
            },
          ],
          user: { name: 'Electric Team' },
          skills: [{ category: 'household', name: 'electrical wiring' }],
        },
        {
          id: 'roof-team',
          tier: 'STANDARD',
          rating: 4.7,
          completedJobs: 9,
          yearsExperience: 5,
          description: 'Roof leak and waterproofing specialist',
          pastProjectType: 'household',
          bio: 'Roofing repair team',
          serviceProvince:
            '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
          serviceDistrict:
            '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'roof leak waterproofing',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '900',
            },
          ],
          user: { name: 'Roof Team' },
          skills: [{ category: 'household', name: 'roof leak waterproofing' }],
        },
        {
          id: 'ads-team',
          tier: 'STANDARD',
          rating: 5,
          completedJobs: 20,
          yearsExperience: 8,
          description: 'Digital ads team',
          pastProjectType: 'marketing',
          bio: 'Image ads and social media',
          serviceProvince:
            '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
          serviceDistrict:
            '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
          servicePostalCode: '10310',
          priceList: [
            {
              service: 'image ads',
              quantity: '1',
              unit: 'image',
              finalPrice: '2000',
            },
          ],
          user: { name: 'Ads Team' },
          skills: [{ category: 'marketing', name: 'image ads' }],
        },
      ]);

      const result = await service.matchFixers(
        'home services',
        '\u0e27\u0e31\u0e07\u0e17\u0e2d\u0e07\u0e2b\u0e25\u0e32\u0e07',
        '\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e\u0e21\u0e2b\u0e32\u0e19\u0e04\u0e23',
        'Need electrial wirring 2 jobs and roof leak waterproofing 30 sq.m.',
        undefined,
        '10310',
        undefined,
        undefined,
        'household',
      );

      const ids = result.map((candidate: { id: string }) => candidate.id);
      expect(ids).toContain('electric-team');
      expect(ids).toContain('roof-team');
      expect(ids).not.toContain('ads-team');
      expect(
        result.find(
          (candidate: { id: string }) => candidate.id === 'electric-team',
        ),
      ).toHaveProperty('estimatedBreakdown', [
        {
          service: 'electrical wiring',
          qty: 2,
          unit: 'job',
          unitRate: 1800,
          total: 3600,
        },
      ]);
    });

    it('matches digital service typos without forcing unrelated lower-value offers', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'web-team',
          tier: 'STANDARD',
          rating: 4.9,
          completedJobs: 18,
          yearsExperience: 7,
          description: 'Website and chatbot delivery',
          pastProjectType: 'digital',
          bio: 'Web and automation team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1000',
            },
            {
              service: 'chatbot development',
              quantity: '100',
              unit: 'FAQ',
              finalPrice: '10000',
            },
          ],
          user: { name: 'Web Team' },
          skills: [{ category: 'project', name: 'website development' }],
        },
        {
          id: 'pipe-team',
          tier: 'STANDARD',
          rating: 4.8,
          completedJobs: 12,
          yearsExperience: 6,
          description: 'Water pipe repair specialist',
          pastProjectType: 'plumbing',
          bio: 'Home water pipe team',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Pathum Wan',
          priceList: [
            {
              service: 'water pipe repair',
              quantity: '1',
              unit: 'job',
              finalPrice: '2500',
            },
          ],
          user: { name: 'Pipe Team' },
          skills: [{ category: 'household', name: 'water pipe repair' }],
        },
      ]);

      const result = await service.matchFixers(
        'project',
        'Pathum Wan',
        'Bangkok',
        'Need webiste 10 pages and chat boot 100 FAQ.',
        undefined,
        undefined,
        undefined,
        undefined,
        'project',
      );

      expect(result.map((candidate: { id: string }) => candidate.id)).toEqual([
        'web-team',
      ]);
      expect(result[0]).toHaveProperty('estimatedBreakdown', [
        {
          service: 'website development',
          qty: 10,
          unit: 'page',
          unitRate: 1000,
          total: 10000,
        },
        {
          service: 'chatbot development',
          qty: 100,
          unit: 'FAQ',
          unitRate: 100,
          total: 10000,
        },
      ]);
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

    it('keeps construction and chatbot lines for mixed quantity-after-service phrases', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'bhavesh',
          tier: 'ECONOMY',
          rating: 5,
          completedJobs: 0,
          yearsExperience: 2,
          description: 'Office build and digital delivery team',
          pastProjectType: 'fitout website chatbot construction',
          bio: 'Fitout, reinstatement, construction, website, and chatbot',
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
              service: 'Reinstatement',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '10000',
            },
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sq.m.',
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
            { category: 'project', name: 'construction' },
            { category: 'project', name: 'website development' },
            { category: 'project', name: 'chatbot' },
          ],
        },
      ]);

      const result = await service.matchFixers(
        'LANDSCAPING',
        'Pathum Wan',
        'Bangkok',
        'I want a team to carry out a 600 sq.m. office fit out, a 300 sq.m. reinstatement work a 700 office building construction and a 10 page website development and a 100 FAQ chatbot development.',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('estimatedBreakdown', [
        {
          service: 'Fit-out',
          qty: 600,
          unit: 'sq.m.',
          unitRate: 30000,
          total: 18000000,
        },
        {
          service: 'Reinstatement',
          qty: 300,
          unit: 'sq.m.',
          unitRate: 10000,
          total: 3000000,
        },
        {
          service: 'Construction',
          qty: 700,
          unit: 'sq.m.',
          unitRate: 20000,
          total: 14000000,
        },
        {
          service: 'Website development',
          qty: 10,
          unit: 'page',
          unitRate: 1000,
          total: 10000,
        },
        {
          service: 'Chatbot',
          qty: 100,
          unit: 'FAQ',
          unitRate: 100,
          total: 10000,
        },
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({
          estimatedTotal: 35020000,
          price: 35000000,
        }),
      );
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

    it.each([
      [
        'Thai household',
        'household',
        'ต้องการทีมงานสำหรับดำเนินการออกแบบและตกแต่งภายในสำนักงานขนาด 1,000 ตร.ม., งานรื้อถอนและปรับสภาพพื้นที่เดิมขนาด 100 ตร.ม., งานก่อสร้างอาคารสำนักงานขนาด 100 ตร.ม., งานพัฒนาเว็บไซต์จำนวน 10 หน้า และงานพัฒนาแชตบอตตอบคำถามถาม-ตอบ (FAQ) จำนวน 100 ข้อ งานเขียนซอฟต์แวร์ 1 งาน',
      ],
      [
        'Thai project',
        'project',
        'ต้องการทีมงานสำหรับดำเนินการออกแบบและตกแต่งภายในสำนักงานขนาด 1,000 ตร.ม., งานรื้อถอนและปรับสภาพพื้นที่เดิมขนาด 100 ตร.ม., งานก่อสร้างอาคารสำนักงานขนาด 100 ตร.ม., งานพัฒนาเว็บไซต์จำนวน 10 หน้า และงานพัฒนาแชตบอตตอบคำถามถาม-ตอบ (FAQ) จำนวน 100 ข้อ งานเขียนซอฟต์แวร์ 1 งาน',
      ],
      [
        'Thai professional',
        'professional',
        'ต้องการทีมงานสำหรับดำเนินการออกแบบและตกแต่งภายในสำนักงานขนาด 1,000 ตร.ม., งานรื้อถอนและปรับสภาพพื้นที่เดิมขนาด 100 ตร.ม., งานก่อสร้างอาคารสำนักงานขนาด 100 ตร.ม., งานพัฒนาเว็บไซต์จำนวน 10 หน้า และงานพัฒนาแชตบอตตอบคำถามถาม-ตอบ (FAQ) จำนวน 100 ข้อ งานเขียนซอฟต์แวร์ 1 งาน',
      ],
      [
        'Simplified Chinese',
        'project',
        '办公室装修1000平方米、场地恢复100平方米、办公楼建设100平方米、网站开发10页、FAQ机器人开发100问答以及软件开发1项',
      ],
      [
        'Traditional Chinese',
        'project',
        '辦公室裝修1000平方米、場地復原100平方米、辦公樓建設100平方米、網站開發10頁、FAQ機器人開發100問答以及軟體開發1項',
      ],
    ])(
      'matches a multilingual multi-service %s request to exact price-list rows',
      async (_language, bookingType, description) => {
        prisma.fixer.findMany.mockResolvedValue([
          {
            id: 'bhavesh',
            tier: 'ECONOMY',
            rating: 5,
            completedJobs: 0,
            yearsExperience: 8,
            description:
              'Office fitout, reinstatement, construction, website, chatbot, and software development',
            pastProjectType:
              'fitout reinstatement construction website chatbot software development',
            bio: 'Commercial build and digital delivery team',
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
                service: 'Reinstatement',
                quantity: '1',
                unit: 'sq.m.',
                finalPrice: '10000',
              },
              {
                service: 'Construction',
                quantity: '1',
                unit: 'sq.m.',
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
              {
                service: 'Software development',
                quantity: '1',
                unit: 'job',
                finalPrice: '10000',
              },
            ],
            user: {
              name: 'Bhavesh Fungprasertsuk',
              company: 'Bhavesh Fungprasertsuk',
            },
            skills: [
              { category: 'project', name: 'fitout' },
              { category: 'project', name: 'construction' },
              { category: 'project', name: 'website development' },
              { category: 'project', name: 'chatbot' },
              { category: 'project', name: 'software development' },
            ],
          },
          {
            id: 'cafe',
            tier: 'ECONOMY',
            rating: 5,
            completedJobs: 0,
            yearsExperience: 2,
            description: 'Coffee cafe image ads',
            pastProjectType: 'digital marketing',
            bio: 'Cafe and image advertising',
            serviceProvince: 'Bangkok',
            serviceDistrict: 'Pathum Wan',
            priceList: [
              {
                service: 'Image ads',
                quantity: '1',
                unit: 'image',
                finalPrice: '2000',
              },
            ],
            user: { name: 'Cafe', company: 'Cafe' },
            skills: [{ category: 'marketing', name: 'image ads' }],
          },
        ]);

        const result = await service.matchFixers(
          'project',
          'Pathum Wan',
          'Bangkok',
          description,
          undefined,
          undefined,
          undefined,
          undefined,
          bookingType,
        );

        expect(result.map((candidate: { id: string }) => candidate.id)).toEqual(
          ['bhavesh'],
        );
        expect(result[0]).toEqual(
          expect.objectContaining({
            estimatedTotal: 33030000,
            estimatedBreakdown: [
              {
                service: 'Fit-out',
                qty: 1000,
                unit: 'sq.m.',
                unitRate: 30000,
                total: 30000000,
              },
              {
                service: 'Reinstatement',
                qty: 100,
                unit: 'sq.m.',
                unitRate: 10000,
                total: 1000000,
              },
              {
                service: 'Construction',
                qty: 100,
                unit: 'sq.m.',
                unitRate: 20000,
                total: 2000000,
              },
              {
                service: 'Website development',
                qty: 10,
                unit: 'page',
                unitRate: 1000,
                total: 10000,
              },
              {
                service: 'Chatbot',
                qty: 100,
                unit: 'FAQ',
                unitRate: 100,
                total: 10000,
              },
              {
                service: 'Software development',
                qty: 1,
                unit: 'job',
                unitRate: 10000,
                total: 10000,
              },
            ],
          }),
        );
      },
    );
    it('matches the reported Thai mixed-service GPS request within the provider travel radius', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'gps-mixed-service',
          tier: 'ECONOMY',
          rating: 4.9,
          completedJobs: 12,
          yearsExperience: 8,
          travelRadius: 60,
          description: 'Construction and website delivery',
          pastProjectType: 'construction website',
          bio: 'Build and digital team',
          serviceProvince: 'กรุงเทพมหานคร',
          serviceDistrict: 'วังทองหลาง',
          serviceSubdistrict: 'สะพานสอง',
          servicePostalCode: '10310',
          gpsLat: 14.29409,
          gpsLng: 100.60963,
          priceList: [
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '20000',
            },
            {
              service: 'Website development',
              quantity: '1',
              unit: 'page',
              finalPrice: '1000',
            },
          ],
          user: { name: 'GPS Mixed Service Partner' },
          skills: [
            { category: 'project', name: 'construction' },
            { category: 'project', name: 'website development' },
          ],
        },
      ]);

      const result = await service.matchFixers(
        'household',
        'วังทองหลาง',
        'กรุงเทพมหานคร',
        'ก่อสร้าง 500 ตารางเมตร และ ทำเวบไซต์ 20 หน้า',
        undefined,
        '10310',
        13.79409,
        100.60963,
        'household',
        'สะพานสอง',
        'economy',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'gps-mixed-service',
          estimatedTotal: 10020000,
          estimatedBreakdown: [
            {
              service: 'Construction',
              qty: 500,
              unit: 'sq.m.',
              unitRate: 20000,
              total: 10000000,
            },
            {
              service: 'Website development',
              qty: 20,
              unit: 'page',
              unitRate: 1000,
              total: 20000,
            },
          ],
        }),
      );
    });

    it('uses validated multilingual intelligence without changing authoritative eligibility or pricing', async () => {
      matchingIntelligence.analyze.mockResolvedValue({
        language: 'thai',
        semanticApplied: true,
        engineVersion: 'test-engine',
        intents: [
          {
            canonicalKey: 'construction',
            confidence: 0.96,
            method: 'semantic',
            quantity: 500,
            unit: 'sqm',
          },
        ],
      });
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'semantic-construction-partner',
          tier: 'ECONOMY',
          rating: 4.8,
          completedJobs: 20,
          yearsExperience: 10,
          travelRadius: 20,
          description: 'Commercial delivery team',
          pastProjectType: 'projects',
          bio: 'Commercial delivery team',
          serviceProvince: '?????????????',
          serviceDistrict: '??????????',
          serviceSubdistrict: '????????',
          servicePostalCode: '10310',
          gpsLat: 13.79409,
          gpsLng: 100.60963,
          priceList: [
            {
              service: 'Construction',
              quantity: '1',
              unit: 'sq.m.',
              finalPrice: '20000',
            },
          ],
          user: { name: 'Construction Partner' },
          skills: [{ category: 'project', name: 'construction' }],
        },
      ]);

      const result = await service.matchFixers(
        'household',
        '??????????',
        '?????????????',
        '????????????????????? 500 ?????????',
        undefined,
        '10310',
        13.79409,
        100.60963,
        'household',
        '????????',
        'economy',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'semantic-construction-partner',
          estimatedTotal: 10000000,
        }),
      );
      expect(matchingIntelligence.analyze).toHaveBeenCalledWith(
        expect.stringContaining('????????????????????? 500 ?????????'),
      );
    });

    it('fills six ranked candidates only from matched in-range services while preserving high-value priority', async () => {
      const candidate = (
        id: string,
        tier: 'ECONOMY' | 'STANDARD',
        offeredService: 'Construction' | 'Website development',
        unitPrice: number,
        options: {
          gps?: boolean;
          inRange?: boolean;
          persistedArea?: boolean;
          rating?: number;
        } = {},
      ) => {
        const hasGps = options.gps !== false;
        const hasArea = options.persistedArea !== false;
        return {
          id,
          tier,
          rating: options.rating ?? 4.5,
          completedJobs: 10,
          yearsExperience: 5,
          travelRadius: 20,
          description: offeredService,
          pastProjectType: 'project',
          bio: offeredService,
          serviceProvince: hasArea ? 'กรุงเทพมหานคร' : null,
          serviceDistrict: hasArea ? 'วังทองหลาง' : null,
          serviceSubdistrict: hasArea ? 'สะพานสอง' : null,
          servicePostalCode: hasArea ? '10310' : null,
          gpsLat: hasGps
            ? options.inRange === false
              ? 15.79409
              : 13.79409
            : null,
          gpsLng: hasGps ? 100.60963 : null,
          priceList: [
            {
              service: offeredService,
              quantity: '1',
              unit: offeredService === 'Construction' ? 'sq.m.' : 'page',
              finalPrice: String(unitPrice),
            },
          ],
          user: { name: id },
          skills: [{ category: 'project', name: offeredService }],
        };
      };

      prisma.fixer.findMany.mockResolvedValue([
        candidate('construction-important', 'ECONOMY', 'Construction', 20000),
        candidate(
          'website-upper-cheapest',
          'STANDARD',
          'Website development',
          900,
        ),
        candidate(
          'website-economy-cheapest',
          'ECONOMY',
          'Website development',
          1000,
        ),
        candidate(
          'website-upper-second',
          'STANDARD',
          'Website development',
          1100,
        ),
        candidate(
          'website-economy-second',
          'ECONOMY',
          'Website development',
          1200,
        ),
        candidate(
          'website-upper-third',
          'STANDARD',
          'Website development',
          1300,
        ),
        candidate(
          'website-out-of-range',
          'STANDARD',
          'Website development',
          100,
          { inRange: false },
        ),
        candidate(
          'website-without-area',
          'ECONOMY',
          'Website development',
          50,
          { gps: false, persistedArea: false },
        ),
      ]);

      const result = await service.matchFixers(
        'household',
        'วังทองหลาง',
        'กรุงเทพมหานคร',
        'ก่อสร้าง 500 ตารางเมตร และ ทำเวบไซต์ 20 หน้า',
        undefined,
        '10310',
        13.79409,
        100.60963,
        'household',
        'สะพานสอง',
        'economy',
      );

      expect(result.map((item) => item.id)).toEqual([
        'construction-important',
        'website-upper-cheapest',
        'website-economy-cheapest',
        'website-upper-second',
        'website-economy-second',
        'website-upper-third',
      ]);
      expect(result).toHaveLength(6);
      expect(
        result.every(
          (item) => item.selectedReason === 'Matched requested service',
        ),
      ).toBe(true);
      expect(result.map((item) => item.id)).not.toContain(
        'website-out-of-range',
      );
      expect(result.map((item) => item.id)).not.toContain(
        'website-without-area',
      );
      expect(result[0]?.estimatedBreakdown).toEqual([
        expect.objectContaining({
          service: 'Construction',
          qty: 500,
          total: 10000000,
        }),
      ]);
    });

    it('applies the authoritative tier-aware eight-slot policy and persisted returning partner', async () => {
      const candidate = (
        id: string,
        tier: 'ECONOMY' | 'STANDARD',
        price: number,
        rating: number,
        completedJobs: number,
      ) => ({
        id,
        tier,
        rating,
        completedJobs,
        yearsExperience: 5,
        travelRadius: 20,
        description: 'Construction team',
        pastProjectType: 'construction',
        bio: 'Construction team',
        serviceProvince: 'กรุงเทพมหานคร',
        serviceDistrict: 'วังทองหลาง',
        serviceSubdistrict: 'สะพานสอง',
        servicePostalCode: '10310',
        gpsLat: 13.79409,
        gpsLng: 100.60963,
        priceList: [
          {
            service: 'Construction',
            quantity: '1',
            unit: 'sq.m.',
            finalPrice: String(price),
          },
        ],
        user: { name: id },
        skills: [{ category: 'project', name: 'construction' }],
      });

      prisma.fixer.findMany.mockResolvedValue([
        candidate('economy-cheapest', 'ECONOMY', 100, 4, 5),
        candidate('economy-second', 'ECONOMY', 110, 4.1, 6),
        candidate('economy-rated-second', 'ECONOMY', 300, 4.8, 30),
        candidate('economy-rated-first', 'ECONOMY', 400, 4.9, 25),
        candidate('standard-cheapest', 'STANDARD', 1000, 4.6, 20),
        candidate('standard-rated', 'STANDARD', 1100, 5, 40),
        candidate('returning', 'ECONOMY', 500, 3.5, 2),
        candidate('nominated', 'ECONOMY', 600, 3.4, 1),
      ]);
      prisma.order.findFirst.mockResolvedValue({ fixerId: 'returning' });

      const result = await service.matchFixers(
        'household',
        'วังทองหลาง',
        'กรุงเทพมหานคร',
        'ก่อสร้าง 1 ตารางเมตร',
        'nominated',
        '10310',
        13.79409,
        100.60963,
        'household',
        'สะพานสอง',
        'economy',
        'customer-user-id',
      );

      expect(result.map((item) => item.id)).toEqual([
        'economy-cheapest',
        'economy-second',
        'economy-rated-second',
        'economy-rated-first',
        'standard-cheapest',
        'standard-rated',
        'returning',
        'nominated',
      ]);
      expect(result.map((item) => item.selectedReason)).toEqual([
        'Matched requested service',
        'Matched requested service',
        'Matched requested service',
        'Matched requested service',
        'Matched requested service',
        'Matched requested service',
        '🔄 Returning partner',
        '👤 Customer nomination',
      ]);
      expect(result[6]?.alias).toBe('★ returning');
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'customer-user-id',
            status: 'COMPLETED',
          }),
        }),
      );
    });
  });

  it('requires re-verification after a verified partner changes contact details', async () => {
    const fixer = {
      id: 'fixer-1',
      verified: true,
      companyAddress: { houseNumber: '1' },
      serviceProvince: 'กรุงเทพมหานคร',
      serviceDistrict: 'วัฒนา',
      servicePostalCode: '10110',
      travelRadius: 10,
      gpsLat: null,
      gpsLng: null,
      kycReverificationRequiredAt: null,
      kycReverificationReasons: null,
    };
    prisma.fixer.findUnique
      .mockResolvedValueOnce(fixer)
      .mockResolvedValueOnce({ ...fixer, user: {}, skills: [] });
    prisma.user.findUnique.mockResolvedValue({
      email: 'old@example.com',
      phone: '0811111111',
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    prisma.fixer.update.mockResolvedValue(fixer);
    jest.spyOn(service as any, 'evaluateFixerTier').mockResolvedValue({
      score: 50,
      tier: 'Economy',
      breakdown: [],
      flags: [],
      credentialStatus: 'partial',
    });

    await service.updateMyFixerProfile('user-1', {
      name: 'Partner',
      email: 'new@example.com',
      phone: '0822222222',
      travelRadius: 10,
      companyAddress: { houseNumber: '1' },
      address: {
        province: 'กรุงเทพมหานคร',
        district: 'วัฒนา',
        postalCode: '10110',
      },
      skills: [],
    } as never);

    expect(prisma.fixer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
          kycReverificationReasons: expect.arrayContaining([
            'EMAIL_CHANGED',
            'PHONE_CHANGED',
          ]),
        }),
      }),
    );
  });

  it('keeps a verified partner eligible after a price-list-only profile update', async () => {
    const fixer = {
      id: 'fixer-1',
      verified: true,
      companyAddress: {
        houseNumber: '86/6',
        building: '',
        province: 'กรุงเทพมหานคร',
        district: 'วังทองหลาง',
        subdistrict: 'สะพานสอง',
        postalCode: '10310',
      },
      serviceProvince: 'กรุงเทพมหานคร',
      serviceDistrict: 'วังทองหลาง',
      serviceSubdistrict: 'สะพานสอง',
      servicePostalCode: '10310',
      travelRadius: 100,
      gpsLat: 13.79409,
      gpsLng: 100.60963,
      kycReverificationRequiredAt: null,
      kycReverificationReasons: null,
    };
    prisma.fixer.findUnique
      .mockResolvedValueOnce(fixer)
      .mockResolvedValueOnce({ ...fixer, user: {}, skills: [] });
    prisma.user.findUnique.mockResolvedValue({
      email: 'partner@example.com',
      phone: '0819852846',
      role: 'ADMIN',
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    prisma.fixer.update.mockResolvedValue(fixer);
    jest.spyOn(service as any, 'evaluateFixerTier').mockResolvedValue({
      score: 50,
      tier: 'Economy',
      breakdown: [],
      flags: [],
      credentialStatus: 'partial',
    });

    await service.updateMyFixerProfile('user-1', {
      name: 'Partner',
      email: 'partner@example.com',
      phone: '081-985-2846',
      travelRadius: 100,
      companyAddress: {
        houseNumber: '86/6',
        province: ' กรุงเทพมหานคร ',
        district: 'วังทองหลาง',
        subdistrict: 'สะพานสอง',
        postalCode: '10310',
      },
      address: {
        province: 'กรุงเทพมหานคร',
        district: 'วังทองหลาง',
        subdistrict: 'สะพานสอง',
        postalCode: '10310',
      },
      gpsCoords: { lat: 13.7940904, lng: 100.6096304 },
      priceList: [
        {
          service: 'Website Development',
          unit: 'page',
          finalPrice: '1200',
        },
      ],
      skills: [],
    } as never);

    expect(prisma.fixer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ role: 'ADMIN' }),
    });
    expect(prisma.user.update.mock.calls.at(-1)?.[0].data).not.toHaveProperty(
      'phone',
    );
    expect(prisma.fixer.update.mock.calls.at(-1)?.[0].data.contactPhone).toBe(
      '081-985-2846',
    );
  });
});
