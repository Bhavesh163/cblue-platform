import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from './property.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PropertyService', () => {
  let service: PropertyService;

  const mockPrisma = {
    property: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a property listing', async () => {
      const dto = {
        propertyType: 'CONDO' as const,
        listingType: 'SALE' as const,
        title: 'Condo in Bangkok',
        description: 'Beautiful condo near BTS',
        price: 3500000,
        area: 45,
        bedrooms: 1,
        bathrooms: 1,
        province: 'กรุงเทพมหานคร',
        district: 'วัฒนา',
        contactName: 'John',
        contactPhone: '0812345678',
      };
      const created = { id: 'prop-1', userId: 'user-1', ...dto, images: [] };
      mockPrisma.property.create.mockResolvedValue(created);

      const result = (await service.create("user-1", dto)) as any;
      expect(result).toEqual(created);
      expect(mockPrisma.property.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Condo in Bangkok',
          price: 3500000,
        }),
        include: { images: true },
      });
    });
  });

  describe('search', () => {
    it('should search properties with filters', async () => {
      const properties = [
        { id: 'prop-1', title: 'Condo A', price: 3000000, images: [] },
        { id: 'prop-2', title: 'Condo B', price: 4000000, images: [] },
      ];
      mockPrisma.property.findMany.mockResolvedValue(properties);
      mockPrisma.property.count.mockResolvedValue(2);

      const result = await service.search({
        propertyType: 'CONDO' as const,
        listingType: 'SALE' as const,
        minPrice: 2000000,
        maxPrice: 5000000,
      });

      expect(result.properties).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should search with keyword', async () => {
      mockPrisma.property.findMany.mockResolvedValue([]);
      mockPrisma.property.count.mockResolvedValue(0);

      const result = await service.search({ keyword: 'near BTS' });
      expect(result.properties).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should paginate results', async () => {
      mockPrisma.property.findMany.mockResolvedValue([]);
      mockPrisma.property.count.mockResolvedValue(50);

      const result = await service.search({ page: 3, limit: 10 });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('findById', () => {
    it('should find a property by id', async () => {
      const property = {
        id: 'prop-1',
        title: 'Condo A',
        images: [],
        user: { id: 'u1', name: 'John' },
      };
      mockPrisma.property.findUnique.mockResolvedValue(property);

      const result = await service.findById('prop-1');
      expect(result).toEqual(property);
    });

    it('should return null for non-existent property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      const result = await service.findById('not-found');
      expect(result).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should return user properties', async () => {
      const properties = [{ id: 'prop-1', userId: 'user-1', images: [] }];
      mockPrisma.property.findMany.mockResolvedValue(properties);

      const result = await service.findByUser('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update own property', async () => {
      const existing = { id: 'prop-1', userId: 'user-1' };
      const updated = { ...existing, title: 'Updated', images: [] };
      mockPrisma.property.findUnique.mockResolvedValue(existing);
      mockPrisma.property.update.mockResolvedValue(updated);

      const result = await service.update('prop-1', 'user-1', {
        title: 'Updated',
      });
      expect(result?.title).toBe('Updated');
    });

    it('should not update others property', async () => {
      const existing = { id: 'prop-1', userId: 'user-2' };
      mockPrisma.property.findUnique.mockResolvedValue(existing);

      const result = await service.update('prop-1', 'user-1', {
        title: 'Hack',
      });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft-delete own property', async () => {
      const existing = { id: 'prop-1', userId: 'user-1' };
      mockPrisma.property.findUnique.mockResolvedValue(existing);
      mockPrisma.property.update.mockResolvedValue({
        ...existing,
        status: 'REMOVED',
      });

      const result = await service.remove('prop-1', 'user-1');
      expect(result?.status).toBe('REMOVED');
    });

    it('should not delete others property', async () => {
      const existing = { id: 'prop-1', userId: 'user-2' };
      mockPrisma.property.findUnique.mockResolvedValue(existing);

      const result = await service.remove('prop-1', 'user-1');
      expect(result).toBeNull();
    });
  });
});
