import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { QualificationStorageReadinessService } from './qualification-storage-readiness.service';

describe('QualificationStorageReadinessService', () => {
  it('reports incomplete Spaces configuration without creating a client', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            'spaces.endpoint': 'https://spaces.example',
            'spaces.key': 'spaces-key',
            'spaces.bucket': 'qualification-evidence',
          })[key],
      ),
    } as any;
    const createClient = jest.fn();
    const service = new QualificationStorageReadinessService(
      config,
      createClient,
    );

    expect(service.getState()).toEqual({
      ready: false,
      code: 'SPACES_CONFIGURATION_INCOMPLETE',
      missing: ['SPACES_SECRET'],
      checkedAt: expect.any(Date),
    });
    await expect(service.assertReady()).rejects.toThrow(
      'Qualification evidence storage is unavailable',
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it('writes, reads, compares, and removes an encrypted private probe object', async () => {
    let storedBody: Buffer | undefined;
    const send = jest.fn(async (command) => {
      if (command instanceof PutObjectCommand) {
        storedBody = Buffer.from(command.input.Body as Buffer);
        return {};
      }
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: jest.fn().mockResolvedValue(storedBody),
          },
        };
      }
      if (command instanceof DeleteObjectCommand) {
        return {};
      }
      throw new Error('Unexpected S3 command');
    });
    const client = { send } as any;
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            'spaces.endpoint': 'https://spaces.example',
            'spaces.key': 'spaces-key',
            'spaces.secret': 'spaces-secret',
            'spaces.bucket': 'qualification-evidence',
            'spaces.region': 'sgp1',
          })[key],
      ),
    } as any;
    const createClient = jest.fn(() => client);
    const service = new QualificationStorageReadinessService(
      config,
      createClient,
    );

    await expect(service.probe()).resolves.toEqual({
      ready: true,
      code: 'READY',
      missing: [],
      checkedAt: expect.any(Date),
    });

    const [putCommand, getCommand, deleteCommand] = send.mock.calls.map(
      ([command]) => command,
    );
    expect(putCommand).toBeInstanceOf(PutObjectCommand);
    expect(getCommand).toBeInstanceOf(GetObjectCommand);
    expect(deleteCommand).toBeInstanceOf(DeleteObjectCommand);
    expect(putCommand.input).toEqual(
      expect.objectContaining({
        Bucket: 'qualification-evidence',
        ACL: 'private',
        ServerSideEncryption: 'AES256',
        ContentType: 'application/octet-stream',
      }),
    );
    expect(putCommand.input.Key).toMatch(/^qualification-readiness\//);
    expect(getCommand.input).toEqual({
      Bucket: 'qualification-evidence',
      Key: putCommand.input.Key,
    });
    expect(deleteCommand.input).toEqual({
      Bucket: 'qualification-evidence',
      Key: putCommand.input.Key,
    });
  });

  it('reports a sanitized probe failure and removes the probe object', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('request failed'))
      .mockResolvedValueOnce({});
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
    const service = new QualificationStorageReadinessService(
      config,
      () => ({ send }) as any,
    );

    await expect(service.probe()).resolves.toEqual({
      ready: false,
      code: 'SPACES_PROBE_FAILED',
      missing: [],
      checkedAt: expect.any(Date),
    });
    expect(send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
  });
});
