import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { MatchingIntelligenceService } from './matching-intelligence.service';

describe('MatchingIntelligenceService', () => {
  const settings: Record<string, unknown> = {
    'matchingIntelligence.mode': 'active',
    'matchingIntelligence.url': 'http://matching-intelligence:8080',
    'matchingIntelligence.apiKey': 'internal-test-key',
    'matchingIntelligence.timeoutMs': 100,
    'matchingIntelligence.minimumConfidence': 0.86,
    'matchingIntelligence.semanticMinimumConfidence': 0.9,
  };
  let post: jest.Mock;
  let service: MatchingIntelligenceService;

  beforeEach(() => {
    post = jest.fn();
    service = new MatchingIntelligenceService(
      { post } as unknown as HttpService,
      {
        get: jest.fn((key: string) => settings[key]),
      } as unknown as ConfigService,
    );
  });

  it('returns only validated high-confidence canonical intents', async () => {
    post.mockReturnValue(
      of({
        data: {
          language: 'thai',
          engine_version: 'test-engine',
          semantic_applied: false,
          intents: [
            {
              canonical_key: 'construction',
              confidence: 0.97,
              method: 'fuzzy',
              quantity: 500,
              unit: 'sqm',
            },
            {
              canonical_key: 'unknown-service',
              confidence: 1,
              method: 'exact',
            },
            {
              canonical_key: 'website',
              confidence: 0.4,
              method: 'fuzzy',
            },
          ],
        },
      }),
    );

    await expect(service.analyze('ก่อสร้าง 500 ตารางเมตร')).resolves.toEqual({
      language: 'thai',
      engineVersion: 'test-engine',
      semanticApplied: false,
      intents: [
        {
          canonicalKey: 'construction',
          confidence: 0.97,
          method: 'fuzzy',
          quantity: 500,
          unit: 'sqm',
        },
      ],
    });
    expect(post).toHaveBeenCalledWith(
      'http://matching-intelligence:8080/v1/analyze-service-request',
      expect.objectContaining({ schema_version: '1' }),
      expect.objectContaining({
        headers: { 'x-matching-intelligence-key': 'internal-test-key' },
        timeout: 100,
      }),
    );
  });

  it('caches analysis without resending customer text', async () => {
    post.mockReturnValue(
      of({
        data: {
          language: 'english',
          engine_version: 'test-engine',
          semantic_applied: false,
          intents: [],
        },
      }),
    );

    await service.analyze('website development');
    await service.analyze('website development');

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('fails open to deterministic matching and opens its circuit', async () => {
    post.mockReturnValue(throwError(() => new Error('offline')));

    await expect(service.analyze('งานประปา')).resolves.toBeNull();
    await expect(service.analyze('งานไฟฟ้า')).resolves.toBeNull();
    await expect(service.analyze('งานก่อสร้าง')).resolves.toBeNull();
    await expect(service.analyze('ทำเว็บไซต์')).resolves.toBeNull();

    expect(post).toHaveBeenCalledTimes(3);
  });

  it('does not call the service when integration is disabled', async () => {
    settings['matchingIntelligence.mode'] = 'off';
    await expect(service.analyze('งานประปา')).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
    settings['matchingIntelligence.mode'] = 'active';
  });
});
