import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class QualificationStorageService {
  private readonly client?: S3Client;
  private readonly bucket?: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('spaces.endpoint');
    const accessKeyId = config.get<string>('spaces.key');
    const secretAccessKey = config.get<string>('spaces.secret');
    this.bucket = config.get<string>('spaces.bucket');

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        endpoint,
        region: config.get<string>('spaces.region') || 'us-east-1',
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: false,
      });
    }
  }

  async putPrivateObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }) {
    const client = this.requireClient();

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ACL: 'private',
        ServerSideEncryption: 'AES256',
      }),
    );
  }

  async createReadUrl(key: string, expiresInSeconds = 300) {
    const client = this.requireClient();

    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  private requireClient() {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException(
        'Private qualification document storage is not configured',
      );
    }

    return this.client;
  }
}
