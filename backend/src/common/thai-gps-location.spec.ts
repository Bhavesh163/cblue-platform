import {
  getThaiGpsLocationBounds,
  normalizeThaiGpsLocation,
} from './thai-gps-location';

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
  it('fills legacy Saphan Song listing fields from persisted GPS coordinates', () => {
    const result = normalizeThaiGpsLocation({
      latitude: 13.794107,
      longitude: 100.609535,
      province: '',
      district: '',
      subdistrict: '',
      postalCode: '',
    });

    expect(result).toEqual({
      province: 'กรุงเทพมหานคร',
      district: 'วังทองหลาง',
      subdistrict: 'สะพานสอง',
      postalCode: '10310',
    });
  });

  it.each(['วังทองหลาง', 'สะพานสอง', 'Wang Thonglang', 'Saphan Song'])(
    'exposes coordinate search bounds for %s',
    (location) => {
      expect(getThaiGpsLocationBounds(location)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            minLat: 13.7863498,
            maxLat: 13.8028206,
            minLng: 100.5883725,
            maxLng: 100.6129265,
          }),
        ]),
      );
    },
  );

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
