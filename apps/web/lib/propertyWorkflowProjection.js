// Server-owned property workflow location and file projection.
//
// CBLUE persists an authoritative location presentation through the BLUE bridge
// (locationPresentation) and a deduplicated combined file list (uploadedFiles).
// These helpers normalize that contract for the customer (dashboard) and
// lister (fixers) pages and fall back to persisted latitude/longitude and
// administrative fields for legacy CBLUE list responses.
//
// Policy (see docs/superpowers/specs/2026-07-21-authoritative-property-workflow-bridge-design.md):
//   - GPS auto-detected listings show persisted coordinates in workflow action
//     modals and the converted subdistrict on summary cards, requests, active
//     jobs, chat titles, and overview rows.
//   - Manually selected subdistrict listings show the subdistrict in both
//     surfaces.
//   - File lists are assembled only from explicit persisted URLs. Titles,
//     descriptions, PRE numbers, modal text, and localStorage are never
//     inspected.

/**
 * @typedef {{ latitude?: number | null; longitude?: number | null }} Coordinates
 * @typedef {{
 *   latitude?: number | null;
 *   longitude?: number | null;
 *   subdistrict?: string | null;
 *   district?: string | null;
 *   province?: string | null;
 *   postalCode?: string | null;
 *   addressLine?: string | null;
 *   locationPresentation?: {
 *     mode?: 'gps' | 'administrative';
 *     coordinates?: Coordinates | null;
 *     modalDisplay?: string;
 *     summaryDisplay?: string;
 *   };
 * }} PropertyLocationInput
 */

const LOCATION_FALLBACK = 'Unknown';

function normalizeLocationPart(value) {
  const text = String(value || '').trim();
  if (!text || /^--\s*select/i.test(text)) return '';
  return text;
}

function hasFiniteGps(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)
  );
}

function formatGps(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function administrativeSummary(item) {
  return (
    normalizeLocationPart(item?.subdistrict) ||
    normalizeLocationPart(item?.district) ||
    normalizeLocationPart(item?.province) ||
    LOCATION_FALLBACK
  );
}

/**
 * Returns the location string for property workflow action modals. Prefers the
 * authoritative bridge `locationPresentation.modalDisplay` and falls back to
 * persisted GPS coordinates, then the persisted subdistrict. GPS is shown only
 * here; summary surfaces use `propertySummaryLocation`.
 *
 * @param {PropertyLocationInput} item
 * @returns {string}
 */
export function propertyModalLocation(item) {
  if (!item) return LOCATION_FALLBACK;
  const presentation = item.locationPresentation;
  if (presentation && typeof presentation === 'object') {
    if (typeof presentation.modalDisplay === 'string' && presentation.modalDisplay.trim()) {
      return presentation.modalDisplay.trim();
    }
    const coords = presentation.coordinates;
    if (coords && hasFiniteGps(coords.latitude, coords.longitude)) {
      return formatGps(coords.latitude, coords.longitude);
    }
  }
  if (hasFiniteGps(item.latitude, item.longitude)) {
    return formatGps(item.latitude, item.longitude);
  }
  return administrativeSummary(item);
}

/**
 * Returns the location string for property summary surfaces (real estate page,
 * requests, active jobs, chat titles, overview rows). Prefers the authoritative
 * bridge `locationPresentation.summaryDisplay` and falls back to the persisted
 * subdistrict/district/province. GPS coordinates are never shown here.
 *
 * @param {PropertyLocationInput} item
 * @returns {string}
 */
export function propertySummaryLocation(item) {
  if (!item) return LOCATION_FALLBACK;
  const presentation = item.locationPresentation;
  if (presentation && typeof presentation === 'object') {
    if (
      typeof presentation.summaryDisplay === 'string' &&
      presentation.summaryDisplay.trim()
    ) {
      return presentation.summaryDisplay.trim();
    }
  }
  return administrativeSummary(item);
}

function collectUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const direct = String(value.url || '').trim();
    if (direct) return direct;
  }
  return '';
}

/**
 * Returns the deduplicated list of persisted file URLs for a property workflow
 * inquiry. Combines the authoritative `uploadedFiles` (preferred) with legacy
 * `attachments`, `listing.attachments`, and `propertyImages`, accepting only
 * explicit persisted URLs. Deduplicates exact URLs. Titles, descriptions, and
 * localStorage are never inspected.
 *
 * @param {{
 *   uploadedFiles?: Array<{ url?: string } | string>;
 *   attachments?: Array<{ url?: string } | string>;
 *   listing?: { attachments?: Array<{ url?: string } | string> };
 *   propertyImages?: Array<string | { url?: string }>;
 * }} item
 * @returns {string[]}
 */
export function propertyFileUrls(item) {
  const sources = [];
  if (item && Array.isArray(item.uploadedFiles)) sources.push(item.uploadedFiles);
  if (item && Array.isArray(item.attachments)) sources.push(item.attachments);
  if (item?.listing && Array.isArray(item.listing.attachments)) {
    sources.push(item.listing.attachments);
  }
  if (item && Array.isArray(item.propertyImages)) sources.push(item.propertyImages);
  const seen = new Set();
  const urls = [];
  for (const source of sources) {
    for (const entry of source) {
      const url = collectUrl(entry);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}
