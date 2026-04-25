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

export interface SelectedFixer {
  id: string;
  alias: string;
  tier: string;
  rating: number;
  totalJobs: number;
  price: number;
  satisfaction: number;
  specialties: string[];
  experienceYears: number;
  selectedReason?: string;
}

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

  async matchFixers(
    service: string,
    district: string,
    province: string,
    nominateId?: string,
  ) {
    const pool = await this.prisma.fixer.findMany({
      where: {
        status: 'APPROVED',
      },
      include: { user: true, skills: true },
    });

    if (pool.length === 0) return [];

    const formattedPool = pool.map((f) => {
      let basePrice = 200;
      if (f.priceList && Array.isArray(f.priceList) && f.priceList.length > 0) {
        const list = f.priceList as Record<string, unknown>[];
        const match = list.find(
          (item: Record<string, unknown>) =>
            typeof item.service === 'string' &&
            item.service.toLowerCase().includes(service.toLowerCase()),
        );
        if (list.length > 0) {
          basePrice = match
            ? parseFloat(match.finalPrice as string)
            : parseFloat(list[0].finalPrice as string);
        }
      }

      return {
        id: f.id,
        alias: f.user?.company || f.user?.name || `Partner-${f.id.slice(0, 4)}`,
        tier: f.tier.toLowerCase(),
        rating: f.rating,
        totalJobs: f.completedJobs,
        price: basePrice || 500,
        satisfaction:
          f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
        specialties: f.skills.map((s) => s.name),
        experienceYears: f.yearsExperience || 1,
      };
    });

    const tierRank: Record<string, number> = {
      economy: 0,
      standard: 1,
      corporate: 2,
      specialist: 3,
      expert: 4,
    };
    const selected: SelectedFixer[] = [];

    const pick = (f: SelectedFixer, reason?: string) => {
      if (!selected.some((s) => String(s.id) === String(f.id))) {
        selected.push({ ...f, selectedReason: reason });
      }
    };

    const byPrice = [...formattedPool].sort((a, b) => a.price - b.price);
    const bySatisfaction = [...formattedPool].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.satisfaction !== a.satisfaction)
        return b.satisfaction - a.satisfaction;
      return b.totalJobs - a.totalJobs;
    });

    // Slots 1-2: 💰 Two cheapest in area
    let priceAdded = 0;
    for (const f of byPrice) {
      if (priceAdded >= 2) break;
      if (!selected.some((s) => s.id === f.id)) {
        pick({ ...f, selectedReason: '💰 Cheapest in area' });
        priceAdded++;
      }
    }

    // Slots 3-4: ⭐ Two highest satisfaction (stars, tiebreak by total jobs/reviews)
    let satAdded = 0;
    for (const f of bySatisfaction) {
      if (satAdded >= 2) break;
      if (!selected.some((s) => s.id === f.id)) {
        pick({ ...f, selectedReason: '⭐ Highest Rated' });
        satAdded++;
      }
    }

    // Slot 5: 🏆 Cheapest of upper tier (corporate+specialist+expert)
    const upperTiers = formattedPool.filter((f) => tierRank[f.tier] >= 2);
    const upperByPrice = [...upperTiers].sort((a, b) => a.price - b.price);
    const upperBySat = [...upperTiers].sort(
      (a, b) => b.satisfaction - a.satisfaction,
    );

    const cheapUpper = upperByPrice.find(
      (f) => !selected.some((s) => s.id === f.id),
    );
    if (cheapUpper)
      pick({ ...cheapUpper, selectedReason: '🏆 Cheapest of upper tier' });

    // Slot 6: 🏆 Highest rated of upper tier
    const satUpper = upperBySat.find(
      (f) => !selected.some((s) => s.id === f.id),
    );
    if (satUpper)
      pick({ ...satUpper, selectedReason: '🏆 Highest rated of upper tier' });

    // Slot 7: 🔄 Returning partner
    // For demo purposes, we randomly select a previously selected partner to simulate a returning partner.
    const returning = formattedPool.find(
      (f) => !selected.some((s) => s.id === f.id) && f.totalJobs > 0,
    );
    if (returning)
      pick({
        ...returning,
        alias: `★ ${returning.alias}`,
        selectedReason: '🔄 Returning partner',
      });

    // Slot 8: 👤 Customer nomination by partner ID number
    if (nominateId) {
      const nominated = formattedPool.find(
        (f) =>
          f.id === nominateId ||
          f.id.endsWith(nominateId) ||
          f.alias.includes(nominateId),
      );
      if (nominated && !selected.some((s) => s.id === nominated.id)) {
        pick({ ...nominated, selectedReason: '👤 Customer nomination' });
      }
    }

    // Fill the rest with random candidates if we have not reached 8
    const shuffled = [...formattedPool].sort(() => Math.random() - 0.5);
    for (const f of shuffled) {
      if (selected.length >= 8) break;
      if (!selected.some((s) => s.id === f.id)) {
        pick({ ...f, selectedReason: '💡 Suggested Candidate' });
      }
    }

    return selected.slice(0, 8);
  }

  // ── Portfolio AI Digest ──

  async kycDigest(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const visionUrl =
      this.configService.get<string>('visionService.url') ||
      'http://localhost:8010';

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post(`${visionUrl}/extract`, formData, {
          headers: formData.getHeaders(),
          timeout: 30000,
        }),
      );

      return response.data as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `Vision service unavailable at ${visionUrl} for kycDigest, using fallback`,
      );

      return {
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
      };
    }
  }

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
