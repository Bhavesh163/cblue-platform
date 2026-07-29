import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';

export type QualificationStorageReadiness = {
  ready: boolean;
  code: 'READY' | 'SPACES_CONFIGURATION_INCOMPLETE' | 'SPACES_PROBE_FAILED';
  missing: string[];
  checkedAt: Date;
};

export type QualificationS3ClientFactory = (
  options: S3ClientConfig,
) => S3Client;

export const QUALIFICATION_S3_CLIENT_FACTORY = Symbol(
  'QUALIFICATION_S3_CLIENT_FACTORY',
);

export const createQualificationS3Client: QualificationS3ClientFactory = (
  options,
) => new S3Client(options);

type QualificationStorageConfiguration = {
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  region: string;
  missing: string[];
};

@Injectable()
export class QualificationStorageReadinessService {
  private readonly logger = new Logger(
    QualificationStorageReadinessService.name,
  );
  private state: QualificationStorageReadiness;

  constructor(
    private readonly config: ConfigService,
    @Inject(QUALIFICATION_S3_CLIENT_FACTORY)
    private readonly createClient: QualificationS3ClientFactory,
  ) {
    this.state = this.createConfigurationState();
  }

  getState(): QualificationStorageReadiness {
    return {
      ...this.state,
      missing: [...this.state.missing],
      checkedAt: new Date(this.state.checkedAt),
    };
  }

  async assertReady(): Promise<void> {
    if (!this.getState().ready) {
      throw new ServiceUnavailableException(
        'Qualification evidence storage is unavailable',
      );
    }
  }

  async probe(): Promise<QualificationStorageReadiness> {
    const configuration = this.getConfiguration();
    if (configuration.missing.length > 0) {
      return this.store({
        ready: false,
        code: 'SPACES_CONFIGURATION_INCOMPLETE',
        missing: configuration.missing,
      });
    }

    const key = 'qualification-readiness/' + randomUUID();
    const body = randomBytes(32);
    let client: S3Client | undefined;
    let probeSucceeded = false;

    try {
      client = this.createClient({
        endpoint: configuration.endpoint,
        region: configuration.region,
        credentials: {
          accessKeyId: configuration.accessKeyId as string,
          secretAccessKey: configuration.secretAccessKey as string,
        },
        forcePathStyle: false,
      });
      await client.send(
        new PutObjectCommand({
          Bucket: configuration.bucket,
          Key: key,
          Body: body,
          ContentType: 'application/octet-stream',
          ACL: 'private',
          ServerSideEncryption: 'AES256',
        }),
      );
      const response = await client.send(
        new GetObjectCommand({
          Bucket: configuration.bucket,
          Key: key,
        }),
      );
      if (!response.Body) {
        throw new Error('Qualification storage probe returned no object body');
      }
      const readBody = Buffer.from(await response.Body.transformToByteArray());
      if (!readBody.equals(body)) {
        throw new Error(
          'Qualification storage probe object body did not match',
        );
      }
      probeSucceeded = true;
    } catch {
      this.logger.error('Qualification storage readiness probe failed');
    } finally {
      if (client) {
        try {
          await client.send(
            new DeleteObjectCommand({
              Bucket: configuration.bucket,
              Key: key,
            }),
          );
        } catch {
          probeSucceeded = false;
          this.logger.error(
            'Qualification storage readiness probe cleanup failed',
          );
        }
      }
    }

    return this.store(
      probeSucceeded
        ? { ready: true, code: 'READY', missing: [] }
        : { ready: false, code: 'SPACES_PROBE_FAILED', missing: [] },
    );
  }

  private createConfigurationState(): QualificationStorageReadiness {
    const configuration = this.getConfiguration();
    return {
      ready: configuration.missing.length === 0,
      code:
        configuration.missing.length === 0
          ? 'READY'
          : 'SPACES_CONFIGURATION_INCOMPLETE',
      missing: configuration.missing,
      checkedAt: new Date(),
    };
  }

  private getConfiguration(): QualificationStorageConfiguration {
    const endpoint = this.config.get<string>('spaces.endpoint');
    const accessKeyId = this.config.get<string>('spaces.key');
    const secretAccessKey = this.config.get<string>('spaces.secret');
    const bucket = this.config.get<string>('spaces.bucket');
    const missing = [
      !endpoint && 'SPACES_ENDPOINT',
      !accessKeyId && 'SPACES_KEY',
      !secretAccessKey && 'SPACES_SECRET',
      !bucket && 'SPACES_BUCKET',
    ].filter((value): value is string => Boolean(value));

    return {
      endpoint,
      accessKeyId,
      secretAccessKey,
      bucket,
      region: this.config.get<string>('spaces.region') || 'us-east-1',
      missing,
    };
  }

  private store(
    state: Omit<QualificationStorageReadiness, 'checkedAt'>,
  ): QualificationStorageReadiness {
    this.state = {
      ...state,
      missing: [...state.missing],
      checkedAt: new Date(),
    };
    return this.getState();
  }
}
