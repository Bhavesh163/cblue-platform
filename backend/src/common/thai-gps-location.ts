export interface ThaiGpsLocationInput {
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface ThaiGpsLocationResult {
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
}

export interface ThaiGpsBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

type KnownGpsArea = ThaiGpsLocationResult &
  ThaiGpsBounds & {
    aliases: string[];
  };

const KNOWN_GPS_AREAS: KnownGpsArea[] = [
  {
    province: 'กรุงเทพมหานคร',
    district: 'วัฒนา',
    subdistrict: 'คลองเตยเหนือ',
    postalCode: '10110',
    minLat: 13.715,
    maxLat: 13.755,
    minLng: 100.545,
    maxLng: 100.585,
    aliases: [
      'bangkok',
      'bkk',
      'กรุงเทพ',
      'กรุงเทพมหานคร',
      'watthana',
      'วัฒนา',
      'khlong toei nuea',
      'คลองเตยเหนือ',
      'sukhumvit',
      '10110',
    ],
  },
  {
    province: 'กรุงเทพมหานคร',
    district: 'คลองเตย',
    subdistrict: 'คลองเตย',
    postalCode: '10110',
    minLat: 13.695,
    maxLat: 13.735,
    minLng: 100.545,
    maxLng: 100.595,
    aliases: [
      'bangkok',
      'bkk',
      'กรุงเทพ',
      'กรุงเทพมหานคร',
      'khlong toei',
      'คลองเตย',
      'sukhumvit',
      '10110',
    ],
  },
  {
    province: 'กรุงเทพมหานคร',
    district: 'ปทุมวัน',
    subdistrict: 'ลุมพินี',
    postalCode: '10330',
    minLat: 13.72,
    maxLat: 13.755,
    minLng: 100.525,
    maxLng: 100.555,
    aliases: [
      'bangkok',
      'bkk',
      'กรุงเทพ',
      'กรุงเทพมหานคร',
      'pathum wan',
      'ปทุมวัน',
      'lumphini',
      'ลุมพินี',
      '10330',
    ],
  },
];

const BANGKOK_BOUNDS: KnownGpsArea = {
  province: 'กรุงเทพมหานคร',
  district: '',
  subdistrict: '',
  postalCode: '',
  minLat: 13.49,
  maxLat: 14.12,
  minLng: 100.32,
  maxLng: 100.94,
  aliases: ['bangkok', 'bkk', 'กรุงเทพ', 'กรุงเทพมหานคร', 'กทม'],
};

function cleanLocationPart(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/^(จังหวัด|จ\.|อำเภอ|อ\.|เขต|แขวง|ตำบล|ต\.)\s*/i, '')
    .trim();
}

function normalizeTerm(value?: string | null) {
  return cleanLocationPart(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function toCoordinate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function containsCoordinate(
  area: ThaiGpsBounds,
  latitude: number,
  longitude: number,
) {
  return (
    latitude >= area.minLat &&
    latitude <= area.maxLat &&
    longitude >= area.minLng &&
    longitude <= area.maxLng
  );
}

function findKnownArea(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return null;
  return (
    KNOWN_GPS_AREAS.find((area) =>
      containsCoordinate(area, latitude, longitude),
    ) || null
  );
}

export function normalizeThaiGpsLocation(
  input: ThaiGpsLocationInput,
): ThaiGpsLocationResult {
  const latitude = toCoordinate(input.latitude);
  const longitude = toCoordinate(input.longitude);
  const knownArea = findKnownArea(latitude, longitude);

  return {
    province: cleanLocationPart(input.province) || knownArea?.province || '',
    district: cleanLocationPart(input.district) || knownArea?.district || '',
    subdistrict:
      cleanLocationPart(input.subdistrict) || knownArea?.subdistrict || '',
    postalCode:
      String(input.postalCode || '').trim() || knownArea?.postalCode || '',
  };
}

export function getThaiGpsLocationBounds(value: unknown): ThaiGpsBounds[] {
  const rawValue =
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const term = normalizeTerm(rawValue);
  if (!term) return [];

  const areas = KNOWN_GPS_AREAS.filter((area) =>
    area.aliases.some((alias) => normalizeTerm(alias) === term),
  );

  if (BANGKOK_BOUNDS.aliases.some((alias) => normalizeTerm(alias) === term)) {
    areas.push(BANGKOK_BOUNDS);
  }

  const seen = new Set<string>();
  return areas.filter((area) => {
    const key = `${area.minLat}:${area.maxLat}:${area.minLng}:${area.maxLng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
