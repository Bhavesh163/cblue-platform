type ProviderUser = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ProviderIdentity = {
  publicDisplayName?: string | null;
  verifiedCompanyName?: string | null;
  user?: ProviderUser | null;
};

export function providerDisplayName(
  provider: ProviderIdentity | null | undefined,
  fallback = 'Partner',
): string {
  const values = [
    provider?.publicDisplayName,
    provider?.verifiedCompanyName,
    provider?.user?.name,
    provider?.user?.email,
    provider?.user?.phone,
  ];
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}
