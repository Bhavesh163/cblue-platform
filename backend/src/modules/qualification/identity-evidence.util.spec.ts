import {
  hasValidThaiNationalId,
  identityMetadata,
  normalizeThaiDigits,
} from './identity-evidence.util';

describe('identity evidence helpers', () => {
  it('normalizes Thai digit code points and validates the checksum', () => {
    expect(
      normalizeThaiDigits(
        String.fromCharCode(
          3665,
          3665,
          3664,
          3665,
          3671,
          3664,
          3664,
          3666,
          3664,
          3667,
          3668,
          3669,
          3664,
        ),
      ),
    ).toBe('1101700203450');
    expect(hasValidThaiNationalId('1101700203450')).toBe(true);
    expect(hasValidThaiNationalId('1101700203451')).toBe(false);
  });

  it('returns only masked and keyed identity metadata', () => {
    process.env.QUALIFICATION_IDENTITY_HMAC_SECRET = 'test-secret';
    const metadata = identityMetadata('1101700203450', null);
    expect(metadata.identityNumberLast4).toBe('3450');
    expect(metadata.identityNumberHash).toHaveLength(64);
    expect(metadata).not.toHaveProperty('identityNumber');
  });
});
