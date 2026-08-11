import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { firstValueFrom } from 'rxjs';
import {
  SERVICE_INTENT_REGISTRY,
  getCanonicalServiceDefinition,
} from './service-intent-registry';

export type MatchingIntelligenceIntent = {
  canonicalKey: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'semantic';
  quantity: number | null;
  unit: string | null;
};

export type MatchingIntelligenceAnalysis = {
  language: 'thai' | 'english' | 'chinese' | 'mixed' | 'unknown';
  intents: MatchingIntelligenceIntent[];
  semanticApplied: boolean;
  engineVersion: string;
};

type CachedAnalysis = {
  expiresAt: number;
  value: MatchingIntelligenceAnalysis;
};

type RawIntent = {
  canonical_key?: unknown;
  confidence?: unknown;
  method?: unknown;
  quantity?: unknown;
  unit?: unknown;
};

const ALLOWED_LANGUAGES = new Set([
  'thai',
  'english',
  'chinese',
  'mixed',
  'unknown',
]);
const ALLOWED_METHODS = new Set(['exact', 'fuzzy', 'semantic']);
const ALLOWED_UNITS = new Set([
  'sqm',
  'page',
  'faq',
  'unit',
  'job',
  'room',
  'floor',
]);

@Injectable()
export class MatchingIntelligenceService {
  private readonly logger = new Logger(MatchingIntelligenceService.name);
  private readonly cache = new Map<string, CachedAnalysis>();
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async analyze(text: string): Promise<MatchingIntelligenceAnalysis | null> {
    const mode = this.configService.get<string>('matchingIntelligence.mode');
    const url = this.configService.get<string>('matchingIntelligence.url');
    const apiKey = this.configService.get<string>(
      'matchingIntelligence.apiKey',
    );
    const normalizedText = String(text || '')
      .trim()
      .slice(0, 5000);
    if (mode === 'off' || !url || !apiKey || !normalizedText) return null;
    if (Date.now() < this.circuitOpenUntil) return null;

    const catalogVersion = this.catalogVersion();
    const cacheKey = createHash('sha256')
      .update(`${catalogVersion}\u0000${normalizedText}`)
      .digest('hex');
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${url.replace(/\/$/u, '')}/v1/analyze-service-request`,
          {
            schema_version: '1',
            catalog_version: catalogVersion,
            text: normalizedText,
            catalog: SERVICE_INTENT_REGISTRY.map((definition) => ({
              key: definition.key,
              aliases: definition.aliases,
              typo_aliases: definition.typoAliases || [],
            })),
          },
          {
            headers: { 'x-matching-intelligence-key': apiKey },
            timeout:
              this.configService.get<number>(
                'matchingIntelligence.timeoutMs',
              ) || 1200,
          },
        ),
      );
      const analysis = this.validateResponse(response.data);
      if (!analysis) throw new Error('Invalid matching intelligence response');

      this.consecutiveFailures = 0;
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + 10 * 60 * 1000,
        value: analysis,
      });
      this.trimCache();
      return analysis;
    } catch (error) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= 3) {
        this.circuitOpenUntil = Date.now() + 30_000;
      }
      this.logger.warn(
        `Matching intelligence unavailable; deterministic matching remains active (${
          error instanceof Error ? error.name : 'request failure'
        })`,
      );
      return null;
    }
  }

  private catalogVersion(): string {
    return createHash('sha256')
      .update(JSON.stringify(SERVICE_INTENT_REGISTRY))
      .digest('hex')
      .slice(0, 16);
  }

  private validateResponse(
    value: unknown,
  ): MatchingIntelligenceAnalysis | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const language =
      typeof record.language === 'string' ? record.language : 'unknown';
    const engineVersion =
      typeof record.engine_version === 'string'
        ? record.engine_version.slice(0, 120)
        : '';
    if (!ALLOWED_LANGUAGES.has(language) || !engineVersion) return null;

    const intents = Array.isArray(record.intents)
      ? record.intents
          .map((raw) => this.validateIntent(raw))
          .filter((intent): intent is MatchingIntelligenceIntent =>
            Boolean(intent),
          )
      : [];

    return {
      language: language as MatchingIntelligenceAnalysis['language'],
      intents: intents.slice(0, 30),
      semanticApplied: record.semantic_applied === true,
      engineVersion,
    };
  }

  private validateIntent(value: unknown): MatchingIntelligenceIntent | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as RawIntent;
    const canonicalKey =
      typeof raw.canonical_key === 'string' ? raw.canonical_key : '';
    const confidence = Number(raw.confidence);
    const method = typeof raw.method === 'string' ? raw.method : '';
    const minimum =
      method === 'semantic'
        ? this.configService.get<number>(
            'matchingIntelligence.semanticMinimumConfidence',
          ) || 0.9
        : this.configService.get<number>(
            'matchingIntelligence.minimumConfidence',
          ) || 0.86;
    if (
      !getCanonicalServiceDefinition(canonicalKey) ||
      !Number.isFinite(confidence) ||
      confidence < minimum ||
      confidence > 1 ||
      !ALLOWED_METHODS.has(method)
    ) {
      return null;
    }

    const quantity = Number(raw.quantity);
    const unit = typeof raw.unit === 'string' ? raw.unit : null;
    return {
      canonicalKey,
      confidence,
      method: method as MatchingIntelligenceIntent['method'],
      quantity:
        Number.isFinite(quantity) && quantity > 0 && quantity < 1_000_000
          ? quantity
          : null,
      unit: unit && ALLOWED_UNITS.has(unit) ? unit : null,
    };
  }

  private trimCache(): void {
    if (this.cache.size <= 500) return;
    const oldestKey = this.cache.keys().next().value as string | undefined;
    if (oldestKey) this.cache.delete(oldestKey);
  }
}
