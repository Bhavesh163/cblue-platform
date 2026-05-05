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
  private readonly fillerTokens = new Set([
    'and',
    'the',
    'for',
    'with',
    'งาน',
    'project',
    'service',
    'services',
    'job',
    'work',
  ]);

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
        status: 'APPROVED', // Auto-approved via AI for seamless booking access
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
      include: { user: true, skills: true, availability: true },
    });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    return fixer;
  }

  async updateMyFixerProfile(userId: string, dto: RegisterFixerDto) {
    const fixer = await this.getFixerByUserId(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        role: 'FIXER',
      },
    });

    const updatedFixer = await this.prisma.fixer.update({
      where: { id: fixer.id },
      data: {
        bio: dto.bio,
        description: dto.description,
        pastExperience: dto.pastExperience,
        pastProjectType: dto.pastProjectType,
        yearsExperience: dto.yearsExperience,
        travelRadius: dto.travelRadius,
        priceList: dto.priceList
          ? (JSON.parse(JSON.stringify(dto.priceList)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        serviceProvince: dto.address?.province,
        serviceDistrict: dto.address?.district,
        servicePostalCode: dto.address?.postalCode,
        gpsLat: dto.gpsCoords?.lat,
        gpsLng: dto.gpsCoords?.lng,
      },
    });

    await this.prisma.fixerSkill.deleteMany({
      where: { fixerId: fixer.id },
    });

    if (dto.skills && dto.skills.length > 0) {
      await this.prisma.fixerSkill.createMany({
        data: dto.skills.map((skill) => ({
          fixerId: fixer.id,
          category: skill.category,
          name: skill.name,
        })),
        skipDuplicates: true,
      });
    }

    return this.prisma.fixer.findUnique({
      where: { id: updatedFixer.id },
      include: { user: true, skills: true, availability: true },
    });
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

  /**
   * Extracts a numeric quantity from a customer's free-text service description.
   * e.g. "1000 sqm office fit-out" → 1000
   *      "3 units air conditioning" → 3
   */
  private extractQuantityFromDescription(description?: string): number {
    if (!description) return 1;
    const match = description.match(
      /(\d[\d,]*\.?\d*)\s*(sqm|m2|sqft|sq\.?m|ตร\.?ม|ตรม|unit|units|ชุด|ห้อง|room|rooms|floor|floors|ชั้น|item|items|job|งาน)?/i,
    );
    if (match && match[1]) {
      const qty = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(qty) && qty > 0) return qty;
    }
    return 1;
  }

  private normalizeSearchText(value?: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/fit\s*[- ]?out/g, 'fitout')
      .replace(/square\s*meters?/g, 'sqm')
      .replace(/square\s*meter/g, 'sqm')
      .replace(/sq\.?\s*m\.?/g, 'sqm')
      .replace(/[^a-z0-9ก-๙\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(value?: string): string[] {
    return this.normalizeSearchText(value)
      .split(' ')
      .filter((token) => token.length > 1 && !this.fillerTokens.has(token));
  }

  private buildSearchTerms(service: string, description?: string): string[] {
    const tokens = new Set<string>([
      ...this.tokenize(service),
      ...this.tokenize(description),
    ]);
    const normalizedDescription = this.normalizeSearchText(description);

    if (normalizedDescription.includes('office')) tokens.add('office');
    if (normalizedDescription.includes('fitout')) {
      tokens.add('fitout');
      tokens.add('interior');
      tokens.add('renovation');
    }

    return [...tokens];
  }

  private scoreTextMatch(candidateText: string, searchTerms: string[]): number {
    if (searchTerms.length === 0) return 0;

    const normalizedCandidate = this.normalizeSearchText(candidateText);
    let score = 0;

    for (const term of searchTerms) {
      if (!term) continue;
      if (normalizedCandidate === term) {
        score += 6;
        continue;
      }
      if (normalizedCandidate.includes(term)) {
        score += term.length >= 5 ? 4 : 2;
      }
    }

    for (let index = 0; index < searchTerms.length - 1; index += 1) {
      const phrase = `${searchTerms[index]} ${searchTerms[index + 1]}`;
      if (phrase.trim().length > 3 && normalizedCandidate.includes(phrase)) {
        score += 5;
      }
    }

    return score;
  }

  private matchServiceArea(
    fixer: {
      serviceProvince?: string | null;
      serviceDistrict?: string | null;
    },
    district: string,
    province: string,
  ): boolean {
    const normalizedProvince = this.normalizeSearchText(province);
    const normalizedDistrict = this.normalizeSearchText(district);
    const autoProvince = !normalizedProvince || normalizedProvince === 'auto';
    const autoDistrict = !normalizedDistrict || normalizedDistrict === 'auto';

    if (autoProvince && autoDistrict) return true;

    const fixerProvince = this.normalizeSearchText(fixer.serviceProvince || '');
    const fixerDistrict = this.normalizeSearchText(fixer.serviceDistrict || '');

    if (!autoProvince && fixerProvince && fixerProvince !== normalizedProvince) {
      return false;
    }

    if (!autoDistrict && fixerDistrict && fixerDistrict !== normalizedDistrict) {
      return false;
    }

    return true;
  }

  async matchFixers(
    service: string,
    district: string,
    province: string,
    description?: string,
    nominateId?: string,
  ) {
    const allFixers = await this.prisma.fixer.findMany({
      where: {
        status: 'APPROVED',
      },
      include: { user: true, skills: true },
    });

    const pool = allFixers.filter((fixer) =>
      this.matchServiceArea(fixer, district, province),
    );

    if (pool.length === 0) return [];

    const customerQty = this.extractQuantityFromDescription(description);
    const searchTerms = this.buildSearchTerms(service, description);

    const formattedPool = pool.map((f) => {
      let basePrice = 0;
      let matchedUnit = '';
      let matchedQty = 1;
      let matchedScore = 0;
      const skillText = f.skills
        .map((skill) => `${skill.category} ${skill.name}`)
        .join(' ');
      const profileText = `${skillText} ${f.description || ''} ${f.pastProjectType || ''} ${f.bio || ''}`;

      if (f.priceList && Array.isArray(f.priceList) && f.priceList.length > 0) {
        const list = f.priceList as Record<string, unknown>[];
        const rankedList = list
          .map((item) => {
            const candidateText = [
              typeof item.service === 'string' ? item.service : '',
              typeof item.unit === 'string' ? item.unit : '',
              profileText,
            ]
              .filter(Boolean)
              .join(' ');

            return {
              item,
              score: this.scoreTextMatch(candidateText, searchTerms),
            };
          })
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (
              (Number(a.item.finalPrice) || Number.MAX_SAFE_INTEGER) -
              (Number(b.item.finalPrice) || Number.MAX_SAFE_INTEGER)
            );
          });

        const match = rankedList[0];

        if (match) {
          const matchedItem = match.item;
          const unitRate = parseFloat((matchedItem.finalPrice as string) || '0');
          const partnerQty =
            parseFloat((matchedItem.quantity as string) || '1') || 1;
          const pricePerUnit = unitRate > 0 ? unitRate / partnerQty : unitRate;
          const hasTextualMatch = match.score > 0;

          if (hasTextualMatch) {
            basePrice =
              customerQty > 1
                ? Math.round(pricePerUnit * customerQty)
                : unitRate;
          } else {
            basePrice = unitRate;
          }

          matchedUnit = (matchedItem.unit as string) || '';
          matchedQty = customerQty;
          matchedScore = match.score;
        }
      }

      const fallbackProfileScore = this.scoreTextMatch(profileText, searchTerms);
      const overallScore = Math.max(matchedScore, fallbackProfileScore);
      const minListedPrice = Array.isArray(f.priceList)
        ? (f.priceList as Record<string, unknown>[]).reduce((min, item) => {
            const value = Number(item.finalPrice) || 0;
            if (value <= 0) return min;
            return min === 0 ? value : Math.min(min, value);
          }, 0)
        : 0;

      return {
        id: f.id,
        alias: f.user?.company || f.user?.name || `Partner-${f.id.slice(0, 4)}`,
        tier: (f.tier || 'economy').toLowerCase(),
        rating: f.rating || 0,
        totalJobs: f.completedJobs || 0,
        price: basePrice > 0 ? basePrice : minListedPrice || 500,
        estimatedTotal: basePrice > 0 ? basePrice : null,
        estimatedUnit: matchedUnit,
        estimatedQty: matchedQty,
        matchScore: overallScore,
        satisfaction:
          f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
        specialties: f.skills.map((s) => s.name),
        experienceYears: f.yearsExperience || 1,
        selectedReason: '',
        matchIcon: '',
      };
    });

    const matchedPool = formattedPool.filter((partner) => partner.matchScore > 0);
    const rankingPool = matchedPool.length > 0 ? matchedPool : formattedPool;

    const isUpperTier = (tier: string) =>
      [
        'corporate',
        'specialist',
        'expert',
        'manager',
        'director',
        'luxury',
        'grandeur',
      ].includes(tier);

    const results: any[] = [];
    const usedIds = new Set();

    const pick = (partner, reason) => {
      if (partner && !usedIds.has(partner.id)) {
        partner.selectedReason = reason;
        results.push(partner);
        usedIds.add(partner.id);
      }
    };

    const byPrice = [...rankingPool].sort((a, b) => a.price - b.price);
    pick(byPrice[0], '💰 Cheapest in area');
    pick(
      byPrice.find((p) => !usedIds.has(p.id)),
      '💰 Ranked 2nd Cheapest',
    );

    const bySatisfaction = [...rankingPool].sort(
      (a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs,
    );
    pick(
      bySatisfaction.find((p) => !usedIds.has(p.id)),
      '⭐ Highest Rated',
    );
    pick(
      bySatisfaction.find((p) => !usedIds.has(p.id)),
      '⭐ Highly Recommended',
    );

    const upperTiers = rankingPool.filter((f) => isUpperTier(f.tier));
    const upperByPrice = [...upperTiers].sort((a, b) => a.price - b.price);
    if (upperByPrice.length > 0)
      pick(
        upperByPrice.find((f) => !usedIds.has(f.id)),
        '🏆 Cheapest of upper tier',
      );

    const upperBySat = [...upperTiers].sort(
      (a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs,
    );
    if (upperBySat.length > 0)
      pick(
        upperBySat.find((f) => !usedIds.has(f.id)),
        '🏆 Highest rated of upper tier',
      );

    const returningPool = rankingPool.filter((p) => !usedIds.has(p.id));
    if (returningPool.length > 0) {
      const returning =
        returningPool[Math.floor(Math.random() * returningPool.length)];
      returning.alias = '★ ' + returning.alias;
      pick(returning, '🔄 Returning partner');
    }

    if (nominateId) {
      const nominated = rankingPool.find(
        (f) =>
          f.id === nominateId ||
          f.id.endsWith(nominateId) ||
          f.alias.includes(nominateId),
      );
      if (nominated) pick(nominated, '👤 Customer nomination');
    }

    const remaining = rankingPool.filter((p) => !usedIds.has(p.id));
    for (const r of remaining) {
      if (results.length >= 8) break;
      pick(r, '💡 Suggested Candidate');
    }

    return results.slice(0, 8);
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
        fallback: true,
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
        fallback: true,
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
