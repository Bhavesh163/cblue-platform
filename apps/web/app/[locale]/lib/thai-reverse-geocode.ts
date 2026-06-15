import { lookupByPostalCode } from "./thai-subdistrict-data";

export interface ThaiReverseGeocodeResult {
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
}

interface NominatimAddress {
  postcode?: string;
  province?: string;
  state?: string;
  city?: string;
  city_district?: string;
  district?: string;
  county?: string;
  municipality?: string;
  borough?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  village?: string;
  hamlet?: string;
}

interface NominatimReverseResponse {
  address?: NominatimAddress;
}

function cleanThaiLocationPart(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/^(จังหวัด|จ\.|อำเภอ|อ\.|เขต|แขวง|ตำบล|ต\.)\s*/i, "")
    .trim();
}

function pickFirst(...values: Array<string | undefined | null>) {
  for (const value of values) {
    const cleaned = cleanThaiLocationPart(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function extractPostalCode(value?: string | null) {
  return String(value || "").match(/\d{5}/)?.[0] || "";
}

function hasThaiAdministrativePrefix(
  value: string | undefined,
  prefixes: string[],
) {
  const text = String(value || "").trim();
  return prefixes.some((prefix) => text.startsWith(prefix));
}

export async function reverseGeocodeThaiAddress(coords: {
  lat: number;
  lng: number;
}): Promise<ThaiReverseGeocodeResult | null> {
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 5000);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(coords.lat),
      lon: String(coords.lng),
      addressdetails: "1",
      zoom: "18",
      "accept-language": "th",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as NominatimReverseResponse;
    const address = data.address || {};
    const postalCode = extractPostalCode(address.postcode);
    const postalLookup = postalCode ? lookupByPostalCode(postalCode) : null;
    const province = pickFirst(address.province, address.state, postalLookup?.province, address.city);
    const districtFromSuburb = hasThaiAdministrativePrefix(
      address.suburb,
      ["เขต", "อำเภอ", "อ."],
    )
      ? address.suburb
      : undefined;
    const subdistrictFromSuburb = hasThaiAdministrativePrefix(
      address.suburb,
      ["แขวง", "ตำบล", "ต."],
    )
      ? address.suburb
      : undefined;
    const district = pickFirst(
      address.city_district,
      address.district,
      address.county,
      address.municipality,
      address.borough,
      districtFromSuburb,
      postalLookup?.district,
    );
    const subdistrict = pickFirst(
      address.quarter,
      address.neighbourhood,
      address.village,
      address.hamlet,
      subdistrictFromSuburb,
    );

    if (!province && !district && !subdistrict && !postalCode) return null;

    return {
      province,
      district,
      subdistrict,
      postalCode,
    };
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
