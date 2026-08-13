import { providerDisplayName } from './provider-display-name';

describe('providerDisplayName', () => {
  it('uses the approved public company name before the legal user name', () => {
    expect(
      providerDisplayName({
        publicDisplayName: 'Construction Blue',
        verifiedCompanyName: 'Construction Blue Co., Ltd.',
        user: {
          name: 'Bhavesh Fungprasertsuk',
          email: 'construction_blue@hotmail.com',
        },
      }),
    ).toBe('Construction Blue');
  });

  it('falls back to the personal legal name for personal providers', () => {
    expect(
      providerDisplayName({
        publicDisplayName: null,
        verifiedCompanyName: null,
        user: { name: 'Bhavesh Fungprasertsuk' },
      }),
    ).toBe('Bhavesh Fungprasertsuk');
  });
});
