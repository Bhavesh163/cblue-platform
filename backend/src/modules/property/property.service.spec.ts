import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from './property.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PropertyService', () => {
  let service: PropertyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      property: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      propertyImage: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => Promise.resolve(cb(prisma))),
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      subscriber: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('normalizes GPS-only property location before persisting', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.property.create.mockResolvedValue({ id: 'property-1' });

      await service.create({ id: 'user-1', email: 'owner@example.com' }, {
        propertyType: 'CONDO',
        listingType: 'RENT',
        title: 'Sukhumvit condo',
        price: 25000,
        province: '',
        district: '',
        subdistrict: '',
        postalCode: '',
        latitude: 13.736717,
        longitude: 100.560062,
        contactName: 'Owner',
        contactPhone: '+66812345678',
        contactEmail: 'owner@example.com',
      } as never);

      expect(prisma.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            province: 'กรุงเทพมหานคร',
            district: 'วัฒนา',
            subdistrict: 'คลองเตยเหนือ',
            postalCode: '10110',
            latitude: 13.736717,
            longitude: 100.560062,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('normalizes GPS-only property location before updating', async () => {
      prisma.property.findUnique.mockResolvedValue({
        id: 'property-1',
        userId: 'user-1',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.user.findMany.mockResolvedValue([]);
      prisma.subscriber.findUnique.mockResolvedValue(null);
      prisma.subscriber.findMany.mockResolvedValue([]);
      prisma.property.update.mockResolvedValue({ id: 'property-1' });

      await service.update('property-1', 'user-1', {
        province: '',
        district: '',
        subdistrict: '',
        postalCode: '',
        latitude: 13.736717,
        longitude: 100.560062,
      } as never);

      expect(prisma.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'property-1' },
          data: expect.objectContaining({
            province: 'กรุงเทพมหานคร',
            district: 'วัฒนา',
            subdistrict: 'คลองเตยเหนือ',
            postalCode: '10110',
          }),
        }),
      );
    });
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

    it('should search by province, district, subdistrict, postal code, and address keywords', async () => {
      prisma.property.findMany.mockResolvedValue([]);
      prisma.property.count.mockResolvedValue(0);

      await service.search({
        province: 'กรุงเทพมหานคร',
        district: 'เขตวัฒนา',
        subdistrict: 'คลองเตยเหนือ',
        keyword: '10110 Sukhumvit',
      } as any);

      const where = prisma.property.findMany.mock.calls[0][0].where;
      expect(where.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                province: expect.objectContaining({
                  contains: 'กรุงเทพมหานคร',
                }),
              }),
            ]),
          }),
          expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                district: expect.objectContaining({ contains: 'วัฒนา' }),
              }),
            ]),
          }),
          expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                subdistrict: expect.objectContaining({
                  contains: 'คลองเตยเหนือ',
                }),
              }),
            ]),
          }),
        ]),
      );
      expect(where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            postalCode: expect.objectContaining({ contains: '10110' }),
          }),
          expect.objectContaining({
            addressLine: expect.objectContaining({ contains: 'Sukhumvit' }),
          }),
        ]),
      );
    });

    it('keeps real active test-named listings while hiding diagnostic probe listings', async () => {
      const baseProperty = {
        userId: 'user-1',
        propertyType: 'HOUSE',
        listingType: 'RENT',
        status: 'ACTIVE',
        description: '',
        price: 400000,
        area: 400,
        bedrooms: 5,
        bathrooms: 5,
        floors: null,
        province: 'Bangkok',
        district: 'Wang Thonglang',
        subdistrict: 'Saphan Song',
        postalCode: '10310',
        addressLine: '',
        latitude: 13.794084,
        longitude: 100.609586,
        contactName: 'Bhavesh',
        contactPhone: '+66812345678',
        contactEmail: 'bhaveshfung@gmail.com',
        features: [],
        yearBuilt: null,
        tier: 'ECONOMY',
        images: [],
        createdAt: new Date('2026-06-23T09:00:00.000Z'),
        updatedAt: new Date('2026-06-23T09:00:00.000Z'),
      };

      prisma.property.findMany.mockResolvedValue([
        { ...baseProperty, id: 'real-house-test', title: 'House test' },
        { ...baseProperty, id: 'probe-townhouse', title: 'Probe townhouse' },
        { ...baseProperty, id: 'test-fixer', title: 'Test Fixer Account Prop' },
        { ...baseProperty, id: 'diag-test', title: 'Diag Test' },
        { ...baseProperty, id: 'test-property', title: 'Test Property' },
        { ...baseProperty, id: 'large-body-test', title: 'Large Body Test' },
        { ...baseProperty, id: 'cf-proxy-test', title: 'CF Proxy Test' },
      ]);
      prisma.property.count.mockResolvedValue(7);

      const result = await service.search({ limit: '20' } as any);

      expect(result.properties.map((property) => property.id)).toEqual([
        'real-house-test',
      ]);
      expect(prisma.property.findMany.mock.calls[0][0].where.NOT).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.objectContaining({ contains: 'Probe' }),
          }),
          expect.objectContaining({
            title: expect.objectContaining({ contains: 'CF Proxy' }),
          }),
        ]),
      );
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
            contactEmail: 'ghis@cblue.co',
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
            contactEmail: 'ghis@cblue.co',
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

    it('should fall back when Prisma relation hydration returns an inconsistent query error', async () => {
      prisma.property.findMany
        .mockRejectedValueOnce(
          new Error(
            'Inconsistent query result: Field images is required to return data, got null instead.',
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
            contactEmail: 'ghis@cblue.co',
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

    it('should rethrow non-schema search errors', async () => {
      prisma.property.findMany.mockRejectedValue(
        new Error('connection refused'),
      );
      prisma.property.count.mockResolvedValue(0);

      await expect(service.search({ limit: 20 } as any)).rejects.toThrow(
        'connection refused',
      );
    });
  });
  describe('findByUser', () => {
    it('lists only properties owned by linked user ids, not shared contact data', async () => {
      const ownProperty = {
        id: 'listing-1',
        userId: 'bhavesh-user',
        status: 'ACTIVE',
        title: 'Home Office near Yellow Line Lat Phrao Road',
        createdAt: new Date('2026-06-04T13:51:00.000Z'),
        images: [],
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'bhavesh-user',
        subscriberId: 'bhavesh-sub',
        email: 'bhaveshfung@gmail.com',
      });
      prisma.subscriber.findMany.mockResolvedValue([
        { id: 'bhavesh-sub', email: 'bhaveshfung@gmail.com' },
      ]);
      prisma.user.findMany
        .mockResolvedValueOnce([
          { id: 'bhavesh-user', email: 'bhaveshfung@gmail.com' },
        ])
        .mockResolvedValueOnce([{ id: 'bhavesh-user' }]);
      prisma.property.findMany.mockResolvedValue([ownProperty]);

      const result = await service.findByUser('bhavesh-user');

      expect(result).toEqual([ownProperty]);
      expect(prisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { not: 'REMOVED' },
            userId: { in: ['bhavesh-user'] },
          },
        }),
      );
      const whereJson = JSON.stringify(
        prisma.property.findMany.mock.calls[0][0].where,
      );
      expect(whereJson).not.toContain('contactEmail');
      expect(whereJson).not.toContain('contactPhone');
    });

    it('does not allow deleting another lister property through matching contact email or phone', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'bhavesh-user',
        subscriberId: 'bhavesh-sub',
        email: 'bhaveshfung@gmail.com',
      });
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'bhavesh-user',
          email: 'bhaveshfung@gmail.com',
          phone: '+66810000000',
          name: 'Bhavesh Fungprasertsuk',
          subscriberId: 'bhavesh-sub',
        },
      ]);
      prisma.subscriber.findMany.mockResolvedValue([
        {
          id: 'bhavesh-sub',
          email: 'bhaveshfung@gmail.com',
          phone: '+66810000000',
          name: 'Bhavesh Fungprasertsuk',
        },
      ]);
      prisma.subscriber.findUnique.mockResolvedValue({
        email: 'bhaveshfung@gmail.com',
        phone: '+66810000000',
        name: 'Bhavesh Fungprasertsuk',
      });
      prisma.property.findUnique.mockResolvedValue({
        id: 'other-listing',
        userId: 'other-user',
        contactEmail: 'bhaveshfung@gmail.com',
        contactPhone: '+66810000000',
        contactName: 'Bhavesh Fungprasertsuk',
        status: 'ACTIVE',
      });
      prisma.property.findMany.mockResolvedValue([]);

      const result = await service.remove('other-listing', 'bhavesh-user');

      expect(result).toBeNull();
      expect(prisma.property.update).not.toHaveBeenCalled();
    });
  });
});
