import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ServiceUnavailableException } from '@nestjs/common';
import { QualificationStorageService } from './qualification-storage.service';

describe('QualificationStorageService', () => {
  it('fails closed when private object storage is not configured', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as any;
    const readiness = { assertReady: jest.fn() } as any;
    const service = new QualificationStorageService(config, readiness);

    await expect(
      service.putPrivateObject({
        key: 'qualification/private.pdf',
        body: Buffer.from('document'),
        contentType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('deletes a private qualification object only after readiness passes', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            'spaces.endpoint': 'https://spaces.example',
            'spaces.key': 'spaces-key',
            'spaces.secret': 'spaces-secret',
            'spaces.bucket': 'qualification-evidence',
          })[key],
      ),
    } as any;
    const readiness = { assertReady: jest.fn().mockResolvedValue(undefined) };
    const send = jest.fn().mockResolvedValue({});
    const service = new QualificationStorageService(config, readiness as any);
    (service as any).client = { send };

    await service.deletePrivateObject('qualification/private.pdf');

    expect(readiness.assertReady).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'qualification-evidence',
      Key: 'qualification/private.pdf',
    });
  });

  it('propagates deletion failures so cleanup remains retryable', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            'spaces.endpoint': 'https://spaces.example',
            'spaces.key': 'spaces-key',
            'spaces.secret': 'spaces-secret',
            'spaces.bucket': 'qualification-evidence',
          })[key],
      ),
    } as any;
    const readiness = { assertReady: jest.fn().mockResolvedValue(undefined) };
    const storageError = Object.assign(new Error('delete unavailable'), {
      name: 'TimeoutError',
    });
    const send = jest.fn().mockRejectedValue(storageError);
    const service = new QualificationStorageService(config, readiness as any);
    (service as any).client = { send };

    await expect(
      service.deletePrivateObject('qualification/private.pdf'),
    ).rejects.toBe(storageError);

    expect(readiness.assertReady).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });
});
