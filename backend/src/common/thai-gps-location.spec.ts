import { normalizeThaiGpsLocation } from './thai-gps-location';

describe('normalizeThaiGpsLocation', () => {
  it('fills missing address fields from Sukhumvit GPS coordinates', () => {
    const result = normalizeThaiGpsLocation({
      latitude: 13.736717,
      longitude: 100.560062,
      province: '',
      district: '',
      subdistrict: '',
      postalCode: '',
    });

    expect(result).toEqual({
      province: 'กรุงเทพมหานคร',
      district: 'วัฒนา',
      subdistrict: 'คลองเตยเหนือ',
      postalCode: '10110',
    });
  });

  it('preserves user-entered address fields over coordinate guesses', () => {
    const result = normalizeThaiGpsLocation({
      latitude: 13.736717,
      longitude: 100.560062,
      province: 'Bangkok',
      district: 'Pathum Wan',
      subdistrict: '',
      postalCode: '',
    });

    expect(result).toEqual({
      province: 'Bangkok',
      district: 'Pathum Wan',
      subdistrict: 'คลองเตยเหนือ',
      postalCode: '10110',
    });
  });
});
