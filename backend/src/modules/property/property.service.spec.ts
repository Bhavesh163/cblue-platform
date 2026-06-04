import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from './property.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PropertyService', () => {
  let service: PropertyService;
  let prisma: {
    property: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      property: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertyService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should coerce string pagination values before querying Prisma', async () => {
      prisma.property.findMany.mockResolvedValue([]);
      prisma.property.count.mockResolvedValue(0);

      const result = await service.search({ page: '1', limit: '20' } as any);

      expect(prisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should fall back to a legacy-safe property select when newer schema fields are missing', async () => {
      prisma.property.findMany
        .mockRejectedValueOnce(
          new Error(
            'P2022: The column `properties.tier` does not exist in the current database.',
          ),
        )
        .mockResolvedValueOnce([
          {
            id: 'property-1',
            userId: 'user-1',
            propertyType: 'CONDO',
            listingType: 'RENT',
            status: 'ACTIVE',
            title: 'Sukhumvit condo',
            description: 'Near BTS',
            price: 25000,
            area: 48,
            bedrooms: 1,
            bathrooms: 1,
            floors: null,
            province: 'Bangkok',
            district: 'Watthana',
            subdistrict: 'Khlong Toei Nuea',
            postalCode: '10110',
            addressLine: 'Sukhumvit',
            latitude: null,
            longitude: null,
            contactName: 'Ghis',
            contactPhone: '+66812345678',
            contactEmail: 'ghis@example.com',
            features: [],
            yearBuilt: null,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ]);
      prisma.property.count.mockResolvedValue(1);

      const result = await service.search({ limit: '20' } as any);

      expect(prisma.property.findMany).toHaveBeenCalledTimes(2);
      expect(result.properties).toEqual([
        expect.objectContaining({
          id: 'property-1',
          tier: 'STANDARD',
          images: [],
        }),
      ]);
      expect(result.total).toBe(1);
    });

    it('should keep returning legacy-safe properties when fallback count also hits schema drift', async () => {
      prisma.property.findMany
        .mockRejectedValueOnce(
          new Error(
            'P2022: The column `properties.tier` does not exist in the current database.',
          ),
        )
        .mockResolvedValueOnce([
          {
            id: 'property-1',
            userId: 'user-1',
            propertyType: 'CONDO',
            listingType: 'RENT',
            status: 'ACTIVE',
            title: 'Sukhumvit condo',
            description: 'Near BTS',
            price: 25000,
            area: 48,
            bedrooms: 1,
            bathrooms: 1,
            floors: null,
            province: 'Bangkok',
            district: 'Watthana',
            subdistrict: 'Khlong Toei Nuea',
            postalCode: '10110',
            addressLine: 'Sukhumvit',
            latitude: null,
            longitude: null,
            contactName: 'Ghis',
            contactPhone: '+66812345678',
            contactEmail: 'ghis@example.com',
            features: [],
            yearBuilt: null,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
          },
        ]);
      prisma.property.count
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(
          new Error(
            'P2022: The column `properties.status` does not exist in the current database.',
          ),
        );

      const result = await service.search({ limit: '20' } as any);

      expect(result.properties).toEqual([
        expect.objectContaining({
          id: 'property-1',
          tier: 'STANDARD',
          images: [],
        }),
      ]);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should rethrow non-schema search errors', async () => {
      prisma.property.findMany.mockRejectedValue(new Error('connection refused'));
      prisma.property.count.mockResolvedValue(0);

      await expect(service.search({ limit: 20 } as any)).rejects.toThrow(
        'connection refused',
      );
    });
  });
});
