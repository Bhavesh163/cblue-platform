import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePropertyDto) {
    // Verify the user exists before attempting insert (prevents FK constraint 500)
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      throw new NotFoundException(
        'User account not found. Please log out and log in again.',
      );
    }
    const property = await this.prisma.property.create({
      data: {
        userId,
        propertyType: dto.propertyType,
        listingType: dto.listingType,
        tier: dto.tier,
        title: dto.title,
        description: dto.description ?? '',
        price: dto.price,
        area: dto.area,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        floors: dto.floors,
        province: dto.province ?? '',
        district: dto.district ?? '',
        subdistrict: dto.subdistrict,
        postalCode: dto.postalCode,
        addressLine: dto.addressLine,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        features: dto.features as Prisma.InputJsonValue,
        yearBuilt: dto.yearBuilt,
      },
      include: { images: true },
    });

    if (dto.images && dto.images.length > 0) {
      await this.prisma.propertyImage.createMany({
        data: dto.images.map((img, idx) => ({
          propertyId: property.id,
          url: img.url,
          key: img.key || `property/${property.id}/image-${idx + 1}`,
          sortOrder: idx,
          isPrimary: idx === 0,
        })),
      });
      return this.prisma.property.findUnique({
        where: { id: property.id },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    return property;
  }

  async search(dto: SearchPropertyDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: 'ACTIVE',
    };

    if (dto.propertyType) where.propertyType = dto.propertyType;
    if (dto.listingType) where.listingType = dto.listingType;
    if (dto.province) where.province = dto.province;
    if (dto.district) where.district = dto.district;
    if (dto.bedrooms) where.bedrooms = { gte: dto.bedrooms };
    if (dto.bathrooms) where.bathrooms = { gte: dto.bathrooms };

    if (dto.minPrice || dto.maxPrice) {
      where.price = {};
      if (dto.minPrice) where.price.gte = dto.minPrice;
      if (dto.maxPrice) where.price.lte = dto.maxPrice;
    }

    if (dto.minArea || dto.maxArea) {
      where.area = {};
      if (dto.minArea) where.area.gte = dto.minArea;
      if (dto.maxArea) where.area.lte = dto.maxArea;
    }

    if (dto.keyword) {
      where.OR = [
        { title: { contains: dto.keyword, mode: 'insensitive' } },
        { description: { contains: dto.keyword, mode: 'insensitive' } },
      ];
    }

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.property.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
      },
    });
  }

  async update(id: string, userId: string, data: Partial<CreatePropertyDto>) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.userId !== userId) {
      return null;
    }

    // Destructure images out — Prisma update expects a nested relation input, not a DTO array.
    // Image updates are handled separately via the create() flow or a dedicated endpoint.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { images: _images, ...scalarData } = data;

    return this.prisma.property.update({
      where: { id },
      data: {
        ...scalarData,
        features: scalarData.features as Prisma.InputJsonValue,
      },
      include: { images: true },
    });
  }

  async remove(id: string, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.userId !== userId) {
      return null;
    }

    return this.prisma.property.update({
      where: { id },
      data: { status: 'REMOVED' },
    });
  }
}
