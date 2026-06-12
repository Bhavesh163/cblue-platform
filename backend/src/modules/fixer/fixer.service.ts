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

type PriceListRow = Record<string, unknown>;

type EstimatedBreakdownItem = {
  service: string;
  qty: number;
  unit: string;
  unitRate: number;
  total: number;
};

type MatchedBreakdownItem = EstimatedBreakdownItem & {
  pairIndex: number;
  matchScore: number;
  serviceGroupKey: string;
};

interface RankedFixer extends SelectedFixer {
  estimatedTotal: number | null;
  estimatedUnit: string;
  estimatedQty: number;
  priceList: PriceListRow[];
  estimatedBreakdown: EstimatedBreakdownItem[] | null;
  estimatedBreakdownMeta: MatchedBreakdownItem[];
  matchScore: number;
  matchIcon: string;
  comparisonTotal: number;
  importantMatchedCount: number;
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
        availableStartDate: dto.scheduledDate,
        companyAddress: dto.companyAddress
          ? (JSON.parse(
              JSON.stringify(dto.companyAddress),
            ) as Prisma.InputJsonValue)
          : undefined,
        priceList: dto.priceList
          ? (JSON.parse(JSON.stringify(dto.priceList)) as Prisma.InputJsonValue)
          : undefined,
        serviceProvince: dto.address?.province,
        serviceDistrict: dto.address?.district,
        servicePostalCode: dto.address?.postalCode,
        gpsLat: dto.gpsCoords?.lat,
        gpsLng: dto.gpsCoords?.lng,
        aiScore: dto.aiScore,
        aiTier: dto.aiTier,
        aiBreakdown: dto.aiBreakdown
          ? (JSON.parse(
              JSON.stringify(dto.aiBreakdown),
            ) as Prisma.InputJsonValue)
          : undefined,
        aiFlags: dto.aiFlags
          ? (JSON.parse(JSON.stringify(dto.aiFlags)) as Prisma.InputJsonValue)
          : undefined,
        aiCredentialStatus: dto.aiCredentialStatus,
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
    return fixer || null;
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
        availableStartDate: dto.scheduledDate,
        companyAddress: dto.companyAddress
          ? (JSON.parse(
              JSON.stringify(dto.companyAddress),
            ) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        priceList: dto.priceList
          ? (JSON.parse(JSON.stringify(dto.priceList)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        serviceProvince: dto.address?.province,
        serviceDistrict: dto.address?.district,
        servicePostalCode: dto.address?.postalCode,
        gpsLat: dto.gpsCoords?.lat,
        gpsLng: dto.gpsCoords?.lng,
        aiScore: dto.aiScore,
        aiTier: dto.aiTier,
        aiBreakdown: dto.aiBreakdown
          ? (JSON.parse(
              JSON.stringify(dto.aiBreakdown),
            ) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        aiFlags: dto.aiFlags
          ? (JSON.parse(JSON.stringify(dto.aiFlags)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        aiCredentialStatus: dto.aiCredentialStatus,
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
    const normalized = this.normalizeSearchText(description);
    const match = normalized.match(
      /(\d[\d,]*\.?\d*)\s*(sqm|m2|sqft|sq\.?m|ตร\.?ม|ตรม|unit|units|ชุด|ห้อง|room|rooms|floor|floors|ชั้น|item|items|job|งาน)?/i,
    );
    if (match && match[1]) {
      const qty = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(qty) && qty > 0) return qty;
    }
    return 1;
  }

  /** Extract all (qty, contextTerms) pairs from description for multi-service estimation */
  private extractAllServiceQtyPairs(
    description?: string,
  ): Array<{ qty: number; contextTerms: string[] }> {
    if (!description) return [];
    const normalized = this.normalizeSearchText(description);
    const unitPattern =
      /sqm|m2|sqft|sq\.?m|ตร\.?ม|ตรม|unit|units|ชุด|ห้อง|room|rooms|floor|floors|ชั้น|item|items|job|งาน/i;
    const pattern =
      /(\d[\d,]*\.?\d*)\s*(sqm|m2|sqft|sq\.?m|ตร\.?ม|ตรม|unit|units|ชุด|ห้อง|room|rooms|floor|floors|ชั้น|item|items|job|งาน)?\b/gi;
    const pairs: Array<{
      qty: number;
      idx: number;
      endIdx: number;
      contextTerms: string[];
    }> = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(normalized)) !== null) {
      const qty = parseFloat((m[1] ?? '').replace(/,/g, ''));
      if (!isNaN(qty) && qty > 0) {
        pairs.push({
          qty,
          idx: m.index,
          endIdx: pattern.lastIndex,
          contextTerms: [],
        });
      }
    }
    if (pairs.length <= 1) return [];
    // For each qty match, grab the context window (words around it) to identify the service
    for (let i = 0; i < pairs.length; i++) {
      const end = pairs[i + 1] ? pairs[i + 1].idx : normalized.length;
      const window = this.sliceServiceContext(
        normalized,
        pairs[i].idx,
        pairs[i].endIdx,
        end,
      );
      const tokens = this.extractContextTerms(window, unitPattern);
      pairs[i].contextTerms = tokens;
    }
    return pairs.map(({ qty, contextTerms }) => ({ qty, contextTerms }));
  }

  private sliceServiceContext(
    normalized: string,
    startIdx: number,
    contentStartIdx: number,
    nextPairIdx: number,
  ): string {
    const maxEnd = nextPairIdx > startIdx ? nextPairIdx : normalized.length;
    const boundarySlice = normalized.slice(contentStartIdx, maxEnd);
    const separatorMatch = boundarySlice.match(
      /(?:,|;|\n|\b(?:and|plus|พร้อม|และ)\b)/i,
    );
    const endIdx = separatorMatch?.index != null
      ? contentStartIdx + separatorMatch.index
      : maxEnd;
    return normalized.slice(startIdx, endIdx).trim();
  }

  private extractContextTerms(
    window: string,
    unitPattern?: RegExp,
  ): string[] {
    return window
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 1 &&
          !this.fillerTokens.has(token) &&
          !(unitPattern?.test(token) ?? false) &&
          isNaN(parseFloat(token)),
      );
  }

  private inferServiceGroupKey(value: unknown): string {
    const normalized = this.normalizeSearchText(
      Array.isArray(value) ? value.join(' ') : String(value || ''),
    );
    if (!normalized) return 'other';

    if (
      /\b(?:website|webpage|web|chatbot|faq|software|app|mobile|platform|digital|automation|ai|page|pages)\b/i.test(
        normalized,
      )
    ) {
      return 'digital';
    }

    if (
      /\b(?:fitout|reinstatement|construction|building|renovation|interior|office|civil|site|mep|electrical|plumbing|hvac)\b/i.test(
        normalized,
      )
    ) {
      return 'build';
    }

    if (/\b(?:legal|law|contract|compliance|permit|license)\b/i.test(normalized)) {
      return 'legal';
    }

    return this.tokenize(normalized).slice(0, 3).join('-') || 'other';
  }

  private normalizeSearchText(value?: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/fit\s*[- ]?out/g, 'fitout')
      .replace(/square\s*meters?/g, 'sqm')
      .replace(/square\s*meter/g, 'sqm')
      .replace(/sq\.?\s*m\.?/g, 'sqm')
      .replace(/bangkok|bkk/g, 'กรุงเทพมหานคร')
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
      servicePostalCode?: string | null;
    },
    district: string,
    province: string,
    postalCode?: string,
  ): boolean {
    const normalizedProvince = this.normalizeSearchText(province);
    const normalizedDistrict = this.normalizeSearchText(district);
    const normalizedPostalCode = String(postalCode || '').trim();
    const autoProvince = !normalizedProvince || normalizedProvince === 'auto';
    const autoDistrict = !normalizedDistrict || normalizedDistrict === 'auto';
    const autoPostalCode = !normalizedPostalCode || normalizedPostalCode === 'auto';

    if (autoProvince && autoDistrict && autoPostalCode) return true;

    const fixerProvince = this.normalizeSearchText(fixer.serviceProvince || '');
    const fixerDistrict = this.normalizeSearchText(fixer.serviceDistrict || '');
    const fixerPostalCode = String(fixer.servicePostalCode || '').trim();

    if (!autoPostalCode && fixerPostalCode === normalizedPostalCode) {
      return true;
    }

    if (
      !autoProvince &&
      fixerProvince &&
      fixerProvince !== normalizedProvince
    ) {
      return false;
    }

    if (
      !autoDistrict &&
      fixerDistrict &&
      fixerDistrict !== normalizedDistrict
    ) {
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
    postalCode?: string,
  ): Promise<SelectedFixer[]> {
    try {
      const allFixers = await this.prisma.fixer.findMany({
        include: { user: true, skills: true },
      });

      console.log(
        `[matchFixers] Input district: ${district}, province: ${province}, allFixers length = ${allFixers.length}`,
      );
      const pool = allFixers.filter((fixer) =>
        this.matchServiceArea(fixer, district, province, postalCode),
      );
      console.log(
        `[matchFixers] After matchServiceArea, pool length = ${pool.length}`,
      );

      if (pool.length === 0) return [];

      const customerQty = this.extractQuantityFromDescription(description);
      const serviceQtyPairs = this.extractAllServiceQtyPairs(description);
      const searchTerms = this.buildSearchTerms(service, description);

      const formattedPool = pool.map((f): RankedFixer => {
        let basePrice = 0;
        let matchedUnit = '';
        let matchedQty = 1;
        let matchedScore = 0;
        const skillText = f.skills
          .map((skill) => `${skill.category} ${skill.name}`)
          .join(' ');
        const profileText = `${skillText} ${f.description || ''} ${f.pastProjectType || ''} ${f.bio || ''}`;

        let rawPriceList: unknown = f.priceList;
        if (typeof rawPriceList === 'string') {
          try {
            rawPriceList = JSON.parse(rawPriceList) as unknown;
          } catch {
            /* ignore parse errors */
            rawPriceList = null;
          }
        }

        const list: PriceListRow[] = Array.isArray(rawPriceList)
          ? (rawPriceList as PriceListRow[])
          : [];

        const estimatedBreakdownMeta: MatchedBreakdownItem[] = [];
        if (list.length > 0) {
          const rankedList = list
            .map((item) => {
              const itemText = [
                typeof item.service === 'string' ? item.service : '',
                typeof item.unit === 'string' ? item.unit : '',
              ]
                .filter(Boolean)
                .join(' ');

              return {
                item,
                score: this.scoreTextMatch(itemText, searchTerms),
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

          if (match && match.score > 0) {
            const matchedItem = match.item;
            const unitRate = parseFloat(String(matchedItem.finalPrice)) || 0;
            const partnerQty =
              parseFloat(String(matchedItem.amount)) ||
              parseFloat(String(matchedItem.quantity)) ||
              1;
            const pricePerUnit = unitRate / partnerQty;

            // Check for multi-service description (e.g. "500 sqm reinstatement and 500 sqm fitout")
            if (serviceQtyPairs.length > 1) {
              // Sum full estimates for each matched service mention. Ranking later
              // compares only the important high-value lines so partial tiny offers
              // do not become the "cheapest" result.
              let multiTotal = 0;
              for (const [pairIndex, { qty, contextTerms }] of serviceQtyPairs.entries()) {
                if (contextTerms.length === 0) {
                  const lineTotal = Math.round(pricePerUnit * qty);
                  multiTotal += lineTotal;
                  estimatedBreakdownMeta.push({
                    service:
                      typeof matchedItem.service === 'string'
                        ? matchedItem.service
                        : 'Service',
                    qty,
                    unit:
                      typeof matchedItem.unit === 'string'
                        ? matchedItem.unit
                        : 'sqm',
                    unitRate: Math.round(pricePerUnit),
                    total: lineTotal,
                    pairIndex,
                    matchScore: match.score,
                    serviceGroupKey: this.inferServiceGroupKey([
                      matchedItem.service,
                      matchedItem.unit,
                    ]),
                  });
                  continue;
                }
                const bestForContext = list
                  .map((item) => {
                    const itemText = [
                      typeof item.service === 'string' ? item.service : '',
                      typeof item.unit === 'string' ? item.unit : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return {
                      item,
                      score: this.scoreTextMatch(itemText, contextTerms),
                    };
                  })
                  .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return (
                      (Number(a.item.finalPrice) || Number.MAX_SAFE_INTEGER) -
                      (Number(b.item.finalPrice) || Number.MAX_SAFE_INTEGER)
                    );
                  })[0];
                if (bestForContext && bestForContext.score > 0) {
                  const ctxUnitRate =
                    parseFloat(String(bestForContext.item.finalPrice)) || 0;
                  const ctxPartnerQty =
                    parseFloat(String(bestForContext.item.amount)) ||
                    parseFloat(String(bestForContext.item.quantity)) ||
                    1;
                  const ctxPricePerUnit = ctxUnitRate / ctxPartnerQty;
                  const lineTotal = Math.round(ctxPricePerUnit * qty);
                  multiTotal += lineTotal;
                  estimatedBreakdownMeta.push({
                    service:
                      typeof bestForContext.item.service === 'string'
                        ? bestForContext.item.service
                        : contextTerms.slice(0, 2).join(' ') || 'Service',
                    qty,
                    unit:
                      typeof bestForContext.item.unit === 'string'
                        ? bestForContext.item.unit
                        : 'sqm',
                    unitRate: Math.round(ctxPricePerUnit),
                    total: lineTotal,
                    pairIndex,
                    matchScore: bestForContext.score,
                    serviceGroupKey: this.inferServiceGroupKey([
                      ...contextTerms,
                      bestForContext.item.service,
                      bestForContext.item.unit,
                    ]),
                  });
                } else {
                  // Context terms present but no service in price list matches them —
                  // skip this quantity to avoid phantom line items (e.g. "10 page", "100 FAQ")
                  // that don't belong to the partner's service offerings.
                }
              }
              basePrice = multiTotal;
            } else {
              // Single service: existing logic
              basePrice = Math.round(pricePerUnit * customerQty);
              estimatedBreakdownMeta.push({
                service:
                  typeof matchedItem.service === 'string'
                    ? matchedItem.service
                    : '',
                qty: customerQty,
                unit:
                  typeof matchedItem.unit === 'string' ? matchedItem.unit : '',
                unitRate: Math.round(pricePerUnit),
                total: basePrice,
                pairIndex: 0,
                matchScore: match.score,
                serviceGroupKey: this.inferServiceGroupKey([
                  matchedItem.service,
                  matchedItem.unit,
                  description,
                ]),
              });
            }

            matchedUnit = (matchedItem.unit as string) || '';
            matchedQty = customerQty;
            matchedScore = match.score;
          }
        }

        const fallbackProfileScore = this.scoreTextMatch(
          profileText,
          searchTerms,
        );
        const overallScore = Math.max(matchedScore, fallbackProfileScore);
        const minListedPrice = list.reduce((min, item) => {
          const value = Number(item.finalPrice) || 0;
          if (value <= 0) return min;
          return min === 0 ? value : Math.min(min, value);
        }, 0);

        return {
          id: f.id,
          alias:
            f.user?.company || f.user?.name || `Partner-${f.id.slice(0, 4)}`,
          tier: (f.tier || 'economy').toLowerCase(),
          rating: f.rating || 0,
          totalJobs: f.completedJobs || 0,
          price: basePrice > 0 ? basePrice : minListedPrice || 500,
          estimatedTotal: basePrice > 0 ? basePrice : null,
          estimatedUnit: matchedUnit,
          estimatedQty: matchedQty,
          priceList: list,
          estimatedBreakdown:
            estimatedBreakdownMeta.length > 0
              ? estimatedBreakdownMeta.map(
                  ({
                    pairIndex: _pairIndex,
                    matchScore: _matchScore,
                    serviceGroupKey: _serviceGroupKey,
                    ...line
                  }) => line,
                )
              : null,
          estimatedBreakdownMeta,
          matchScore: overallScore,
          satisfaction:
            f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
          specialties: f.skills.map((s) => s.name),
          experienceYears: f.yearsExperience || 1,
          selectedReason: '',
          matchIcon: '',
          comparisonTotal: basePrice > 0 ? basePrice : minListedPrice || 500,
          importantMatchedCount: 0,
        };
      });

      const groupPairMaxTotals = new Map<string, Map<number, number>>();
      for (const partner of formattedPool) {
        for (const line of partner.estimatedBreakdownMeta) {
          const groupKey = line.serviceGroupKey || this.inferServiceGroupKey(line.service);
          if (!groupPairMaxTotals.has(groupKey)) {
            groupPairMaxTotals.set(groupKey, new Map<number, number>());
          }
          const pairMaxTotals = groupPairMaxTotals.get(groupKey)!;
          const currentMax = pairMaxTotals.get(line.pairIndex) || 0;
          if (line.total > currentMax) {
            pairMaxTotals.set(line.pairIndex, line.total);
          }
        }
      }

      const groupTotalsDescending = [...groupPairMaxTotals.entries()]
        .map(([groupKey, pairTotals]) => [
          groupKey,
          [...pairTotals.values()].reduce((sum, total) => sum + total, 0),
        ] as [string, number])
        .filter(([, total]) => total > 0)
        .sort((a, b) => b[1] - a[1]);
      const importantGroupKey = groupTotalsDescending[0]?.[0] || '';

      for (const partner of formattedPool) {
        const importantLines = partner.estimatedBreakdownMeta.filter((line) =>
          importantGroupKey
            ? (line.serviceGroupKey || this.inferServiceGroupKey(line.service)) ===
              importantGroupKey
            : false,
        );
        partner.importantMatchedCount = new Set(
          importantLines.map((line) => line.pairIndex),
        ).size;
        partner.comparisonTotal =
          importantLines.reduce((sum, line) => sum + line.total, 0) ||
          partner.comparisonTotal;
        if (partner.importantMatchedCount > 0) {
          partner.price = partner.comparisonTotal;
        }
      }

      const matchedPool = formattedPool.filter(
        (partner) => partner.matchScore > 0,
      );
      const rankingPool = matchedPool.length > 0 ? matchedPool : formattedPool;
      const maxImportantMatchedCount = Math.max(
        0,
        ...rankingPool.map((partner) => partner.importantMatchedCount || 0),
      );
      const comparisonPool =
        maxImportantMatchedCount > 0
          ? rankingPool.filter(
              (partner) =>
                (partner.importantMatchedCount || 0) ===
                maxImportantMatchedCount,
            )
          : rankingPool;

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

      const results: RankedFixer[] = [];
      const usedIds = new Set<string>();

      const pick = (partner: RankedFixer | undefined, reason: string) => {
        if (partner && !usedIds.has(partner.id)) {
          partner.selectedReason = reason;
          results.push(partner);
          usedIds.add(partner.id);
        }
      };

      const byPrice = [...comparisonPool].sort(
        (a, b) => a.comparisonTotal - b.comparisonTotal || a.price - b.price,
      );
      pick(byPrice[0], '💰 Cheapest in area');
      pick(
        byPrice.find((p) => !usedIds.has(p.id)),
        '💰 Ranked 2nd Cheapest',
      );

      const bySatisfaction = [...comparisonPool].sort(
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

      const upperTiers = comparisonPool.filter((f) => isUpperTier(f.tier));
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

      return results.slice(0, 8).map(({ estimatedBreakdownMeta, comparisonTotal, importantMatchedCount, ...partner }) => partner);
    } catch (error) {
      console.error('[matchFixers] error', error);
      return [];
    }
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
