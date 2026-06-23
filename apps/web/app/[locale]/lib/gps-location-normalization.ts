import { reverseGeocodeThaiAddress, ThaiReverseGeocodeResult } from './thai-reverse-geocode';

export interface GpsCoords {
  lat: number;
  lng: number;
}

interface LocationFields {
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
}

type KnownGpsArea = ThaiReverseGeocodeResult & {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
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
  },
];

function cleanLocationPart(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/^(จังหวัด|จ\.|อำเภอ|อ\.|เขต|แขวง|ตำบล|ต\.)\s*/i, '')
    .trim();
}

function hasCoordinatePair(coords?: GpsCoords | null) {
  return Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng);
}

function localGpsFallback(coords: GpsCoords): ThaiReverseGeocodeResult | null {
  return KNOWN_GPS_AREAS.find((area) => (
    coords.lat >= area.minLat &&
    coords.lat <= area.maxLat &&
    coords.lng >= area.minLng &&
    coords.lng <= area.maxLng
  )) || null;
}

function mergeLocationFields(
  current: LocationFields | undefined,
  resolved: ThaiReverseGeocodeResult | null,
): ThaiReverseGeocodeResult {
  return {
    province: cleanLocationPart(current?.province) || resolved?.province || '',
    district: cleanLocationPart(current?.district) || resolved?.district || '',
    subdistrict: cleanLocationPart(current?.subdistrict) || resolved?.subdistrict || '',
    postalCode: String(current?.postalCode || '').trim() || resolved?.postalCode || '',
  };
}

export async function normalizeGpsAddressForSubmit(
  coords: GpsCoords | null | undefined,
  current?: LocationFields,
): Promise<ThaiReverseGeocodeResult | null> {
  if (!hasCoordinatePair(coords)) return null;
  const safeCoords = coords as GpsCoords;
  const resolved = (await reverseGeocodeThaiAddress(safeCoords)) || localGpsFallback(safeCoords);
  const normalized = mergeLocationFields(current, resolved);
  if (!normalized.province && !normalized.district && !normalized.subdistrict && !normalized.postalCode) {
    return null;
  }
  return normalized;
}
