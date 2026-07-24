import { ServiceUnavailableException } from '@nestjs/common';
import { QualificationStorageService } from './qualification-storage.service';

describe('QualificationStorageService', () => {
  it('fails closed when private object storage is not configured', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as any;
    const service = new QualificationStorageService(config);

    await expect(service.putPrivateObject({
      key: 'qualification/private.pdf',
      body: Buffer.from('document'),
      contentType: 'application/pdf',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
