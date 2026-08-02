import { createHmac } from 'node:crypto';

export function normalizeThaiDigits(value: string | null): string {
  return Array.from(String(value || ''))
    .map((digit) => {
      const code = digit.charCodeAt(0);
      if (code >= 3664 && code <= 3673) return String(code - 3664);
      return code >= 48 && code <= 57 ? digit : '';
    })
    .join('');
}

export function hasValidThaiNationalId(value: string): boolean {
  if (
    value.length !== 13 ||
    !Array.from(value).every((digit) => digit >= '0' && digit <= '9')
  )
    return false;
  const checksum = value
    .slice(0, 12)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (13 - index), 0);
  return (11 - (checksum % 11)) % 10 === Number(value[12]);
}

export function identityNameHash(value: string | null): string | null {
  const normalized = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
  const secret =
    process.env.QUALIFICATION_IDENTITY_HMAC_SECRET ||
    process.env.JWT_SECRET ||
    '';
  return normalized && secret
    ? createHmac('sha256', secret).update(normalized).digest('hex')
    : null;
}

export function identityMetadata(
  value: string | null,
  expiresAt: Date | null,
  subjectName: string | null = null,
): {
  identityNumberLast4: string | null;
  identityNumberHash: string | null;
  identityExpiryDate: Date | null;
  subjectNameHash: string | null;
} {
  const normalized = normalizeThaiDigits(value);
  const secret =
    process.env.QUALIFICATION_IDENTITY_HMAC_SECRET ||
    process.env.JWT_SECRET ||
    '';
  return {
    identityNumberLast4: normalized.length >= 4 ? normalized.slice(-4) : null,
    identityNumberHash:
      normalized && secret
        ? createHmac('sha256', secret).update(normalized).digest('hex')
        : null,
    identityExpiryDate: expiresAt,
    subjectNameHash: identityNameHash(subjectName),
  };
}
