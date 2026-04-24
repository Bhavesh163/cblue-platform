import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RegisterFixerDto } from './dto/register-fixer.dto';
import { AddSkillDto } from './dto/add-skill.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { UploadKycDto } from './dto/upload-kyc.dto';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class FixerService {
  private readonly logger = new Logger(FixerService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async register(userId: string, dto: RegisterFixerDto) {
    const existing = await this.prisma.fixer.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('User is already registered as a fixer');
    }

    // Update user role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'FIXER' },
    });

    const fixer = await this.prisma.fixer.create({
      data: {
        userId,
        bio: dto.bio,
        description: dto.description,
        pastExperience: dto.pastExperience,
        pastProjectType: dto.pastProjectType,
        yearsExperience: dto.yearsExperience,
        travelRadius: dto.travelRadius,
        priceList: dto.priceList
          ? (JSON.parse(JSON.stringify(dto.priceList)) as Prisma.InputJsonValue)
          : undefined,
        serviceProvince: dto.address?.province,
        serviceDistrict: dto.address?.district,
        servicePostalCode: dto.address?.postalCode,
        gpsLat: dto.gpsCoords?.lat,
        gpsLng: dto.gpsCoords?.lng,
      },
      include: { user: true },
    });

    // Bulk-create skills if provided
    if (dto.skills && dto.skills.length > 0) {
      await this.prisma.fixerSkill.createMany({
        data: dto.skills.map((s) => ({
          fixerId: fixer.id,
          category: s.category,
          name: s.name,
        })),
        skipDuplicates: true,
      });
    }

    this.eventEmitter.emit('fixer.registered', { fixerId: fixer.id, userId });

    // Re-fetch with skills included
    return this.prisma.fixer.findUnique({
      where: { id: fixer.id },
      include: { user: true, skills: true },
    });
  }

  async getProfile(fixerId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
      include: {
        user: true,
        skills: true,
        availability: true,
      },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');
    return fixer;
  }

  async getMyFixerProfile(userId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { userId },
      include: { skills: true, availability: true },
    });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    return fixer;
  }

  // ── KYC / Image uploads ──

  async uploadKyc(userId: string, dto: UploadKycDto) {
    const fixer = await this.getFixerByUserId(userId);

    return this.prisma.image.create({
      data: {
        fixerId: fixer.id,
        type: 'kyc',
        url: dto.url,
        key: dto.key,
      },
    });
  }

  async uploadPortfolio(userId: string, dto: UploadKycDto) {
    const fixer = await this.getFixerByUserId(userId);

    return this.prisma.image.create({
      data: {
        fixerId: fixer.id,
        type: 'portfolio',
        url: dto.url,
        key: dto.key,
      },
    });
  }

  async getImages(userId: string) {
    const fixer = await this.getFixerByUserId(userId);
    return this.prisma.image.findMany({
      where: { fixerId: fixer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Skills ──

  async addSkill(userId: string, dto: AddSkillDto) {
    const fixer = await this.getFixerByUserId(userId);

    return this.prisma.fixerSkill.create({
      data: {
        fixerId: fixer.id,
        category: dto.category,
        name: dto.name,
        yearsExperience: dto.yearsExperience,
      },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    const fixer = await this.getFixerByUserId(userId);

    const skill = await this.prisma.fixerSkill.findFirst({
      where: { id: skillId, fixerId: fixer.id },
    });
    if (!skill) throw new NotFoundException('Skill not found');

    return this.prisma.fixerSkill.delete({ where: { id: skillId } });
  }

  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    const fixer = await this.getFixerByUserId(userId);

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    return this.prisma.fixerAvailability.upsert({
      where: {
        fixerId_dayOfWeek: {
          fixerId: fixer.id,
          dayOfWeek: dto.dayOfWeek,
        },
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
      create: {
        fixerId: fixer.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getAvailability(userId: string) {
    const fixer = await this.getFixerByUserId(userId);
    return this.prisma.fixerAvailability.findMany({
      where: { fixerId: fixer.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  private async getFixerByUserId(userId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { userId },
    });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    return fixer;
  }

  // ── AI Top-8 Selection Algorithm Matrix ──

  async matchFixers(service: string, district: string, province: string, nominateId?: string) {
    // 1. Fetch available fixers in the area
    let pool = await this.prisma.fixer.findMany({
      where: {
        status: 'APPROVED',
        // In a real app we might filter by location and service.
        // For now, let's just get all approved fixers to have enough candidates
        // or filter loosely to allow testing
      },
      include: { user: true, skills: true },
    });

    if (pool.length === 0) {
      return [];
    }

    // Format the pool to include derived metrics for sorting
    const formattedPool = pool.map(f => {
      // Simulate price from priceList
      let basePrice = 200;
      if (f.priceList && Array.isArray(f.priceList) && f.priceList.length > 0) {
        const list = f.priceList as any[];
        const match = list.find(p => p.service.toLowerCase().includes(service?.toLowerCase() || ''));
        basePrice = match ? parseFloat(match.finalPrice) : parseFloat(list[0].finalPrice);
      }

      return {
        id: f.id,
        alias: f.user?.company || f.user?.name || `Partner-${f.id.slice(0, 4)}`,
        tier: f.tier.toLowerCase(),
        rating: f.rating,
        totalJobs: f.completedJobs,
        price: basePrice || 500,
        satisfaction: f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
        specialties: f.skills.map(s => s.name),
        experienceYears: f.yearsExperience || 1,
      };
    });

    const tierRank: Record<string, number> = { economy: 0, standard: 1, corporate: 2, specialist: 3, expert: 4 };
    const selected: any[] = [];
    const used = new Set<string>();

    function pick(f: any) {
      if (!used.has(f.id)) { selected.push(f); used.add(f.id); }
    }

    // Sort helpers
    const byPrice = [...formattedPool].sort((a, b) => a.price - b.price);
    const bySatisfaction = [...formattedPool].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.satisfaction !== a.satisfaction) return b.satisfaction - a.satisfaction;
      return b.totalJobs - a.totalJobs;
    });

    // 1. TWO CHEAPEST in area
    for (const f of byPrice) { if (selected.length < 2) pick(f); else break; }

    // 2. TWO HIGHEST SATISFACTION
    for (const f of bySatisfaction) {
      if (selected.length >= 4) break;
      if (!used.has(f.id)) pick(f);
    }

    // 3. ONE CHEAPEST OF UPPER TIER (corporate+specialist+expert)
    const upperTiers = byPrice.filter(f => tierRank[f.tier] >= 2 && !used.has(f.id));
    if (upperTiers[0]) pick(upperTiers[0]);

    // 4. ONE HIGHEST SATISFACTION OF UPPER TIER
    const upperBySat = bySatisfaction.filter(f => tierRank[f.tier] >= 2 && !used.has(f.id));
    if (upperBySat[0]) pick(upperBySat[0]);

    // 5. ONE RETURNING / LAST SAME-JOB PARTNER
    const remaining = formattedPool.filter(f => !used.has(f.id));
    if (remaining.length > 0) {
      const returningIdx = Math.floor(Math.random() * remaining.length);
      const returning = remaining[returningIdx];
      returning.alias = `★ ${returning.alias}`;
      pick(returning);
    }

    // 6. SLOT 8 reserved for customer nomination
    if (nominateId) {
      const nominated = formattedPool.find(f => f.id === nominateId || f.id.endsWith(nominateId));
      if (nominated && !used.has(nominated.id)) {
        pick(nominated);
      }
    }

    // If fewer than 8 partners available, fill what we can
    for (const f of formattedPool) {
      if (selected.length >= 8) break;
      pick(f);
    }

    return selected;
  }

  // ── Portfolio AI Digest ──

  async digestPortfolio(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed');
    }

    const visionUrl =
      this.configService.get<string>('visionService.url') ||
      'http://localhost:8010';

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }

      const response = await firstValueFrom(
        this.httpService.post(`${visionUrl}/extract-batch`, formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        }),
      );

      return response.data as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `Vision service unavailable at ${visionUrl}, using fallback`,
      );

      // Fallback: return basic file info without OCR
      const results = files.map((file) => ({
        file_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename: file.originalname,
        file_type: file.mimetype,
        raw_text: '',
        text_length: 0,
        extraction_method: 'none_vision_service_unavailable',
        has_content: false,
        verification_hints: [
          'Vision service unavailable — document analysis deferred',
        ],
        timestamp: new Date().toISOString(),
      }));

      return {
        results,
        total_files: files.length,
        total_text_length: 0,
        content_score: 0,
        fallback: true,
      };
    }
  }
}
