"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import PdpaConsent from "../components/PdpaConsent";
import {
  computeBudgetBreakdown,
  formatVariationPriceListItem,
  formatVariationPriceListText,
  parseVariationPriceList,
  readStoredVariationPriceList,
  storeVariationPriceList,
  stripVariationPriceList,
  type BudgetBreakdownItem,
  type VariationPriceListItem,
} from "../../../lib/computeBudgetBreakdown";
import { refreshSubscriberSession } from "../../../lib/subscriberSession";

interface PartnerInfo {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  tier?: string;
  createdAt?: string;
  tierScore?: number;
  breakdown?: any[];
  flags?: any[];
  credentialStatus?: string;
}

const stats = {
  activeJobs: 0,
  completedJobs: 0,
  monthlyEarnings: "฿26,500",
  rating: 0,
  responseRate: "0%",
  repeatClients: 0,
};





  const EARNINGS_MOCK = [
    { month: "May 25", monthTh: "พ.ค. 25", monthZh: "5月 25", amount: 18500 },
    { month: "Jun 25", monthTh: "มิ.ย. 25", monthZh: "6月 25", amount: 16000 },
    { month: "Jul 25", monthTh: "ก.ค. 25", monthZh: "7月 25", amount: 20000 },
    { month: "Aug 25", monthTh: "ส.ค. 25", monthZh: "8月 25", amount: 22000 },
    { month: "Sep 25", monthTh: "ก.ย. 25", monthZh: "9月 25", amount: 19500 },
    { month: "Oct 25", monthTh: "ต.ค. 25", monthZh: "10月 25", amount: 23000 },
    { month: "Nov 25", monthTh: "พ.ย. 25", monthZh: "11月 25", amount: 21000 },
    { month: "Dec 25", monthTh: "ธ.ค. 25", monthZh: "12月 25", amount: 18000 },
    { month: "Jan 26", monthTh: "ม.ค. 26", monthZh: "1月 26", amount: 25000 },
    { month: "Feb 26", monthTh: "ก.พ. 26", monthZh: "2月 26", amount: 24000 },
    { month: "Mar 26", monthTh: "มี.ค. 26", monthZh: "3月 26", amount: 26500 },
    { month: "Apr 26", monthTh: "เม.ย. 26", monthZh: "4月 26", amount: 22000 },
    { month: "May 26", monthTh: "พ.ค. 26", monthZh: "5月 26", amount: 26500 },
  ];

const chats: any[] = [];

/** Prune localStorage when approaching the 4.5 MB soft limit. */
function pruneStorageIfNeeded() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) total += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    if (total < 4.5 * 1024 * 1024) return;
    try {
      const hist = JSON.parse(localStorage.getItem('ghis_mock_history') || '[]');
      if (hist.length > 0) {
        hist.shift();
        localStorage.setItem('ghis_mock_history', JSON.stringify(hist));
      }
    } catch {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cblue_po_breakdown_')) {
        localStorage.removeItem(k);
        break;
      }
    }
  } catch {}
}

const fmtDate = (d: Date | number | string) => {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return "";
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};
const fmtDateTime = (d: Date | number | string) => {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return "";
  return `${fmtDate(dt)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
};
const parseMeetingDateTimeMs = (dateValue?: string, timeValue?: string) => {
  const date = String(dateValue || '').trim();
  const time = String(timeValue || '').trim();
  if (!date) return 0;
  const ddmmyyyy = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const [hour = '00', minute = '00'] = time.split(':');
    const ts = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
  const ts = new Date(`${date}T${time || '00:00'}`).getTime();
  return Number.isFinite(ts) ? ts : 0;
};
const formatMeetingDateTimeLabel = (dateValue?: string, timeValue?: string) => {
  const ts = parseMeetingDateTimeMs(dateValue, timeValue);
  if (ts > 0) return `${fmtDate(ts)}${timeValue ? ` · ${timeValue}` : ''}`;
  return [dateValue, timeValue].filter(Boolean).join(' · ');
};
const PO_CODE_PATTERN = /PO-(?:\d{8}|\d{4}-\d{4,})/i;
const PO_CODE_EXACT_PATTERN = /^PO-(?:\d{8}|\d{4}-\d{4,})$/i;
const isPoCode = (value: string) => PO_CODE_EXACT_PATTERN.test(String(value || "").trim());
const PROP_PO_PATTERN = /^PRE-\d{4}-\d{4}$/i;
const isPropPoCode = (value: string) => PROP_PO_PATTERN.test(String(value || "").trim());
const extractPoCode = (value: any) => {
  if (!value) return "";
  const direct = String(value?.po || "").trim();
  if (direct && isPoCode(direct)) return direct;
  const desc = String(value?.description || value?.desc || "");
  return desc.match(PO_CODE_PATTERN)?.[0] || "";
};
const parseMeetingInviteDetails = (value: string) => {
  const text = String(value || "");
  const match = text.match(/customer sent meeting invitation(?: for (PO-(?:\d{8}|\d{4}-\d{4,})))?:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+at\s+(.+?)(?:\.|$)/i);
  return {
    po: match?.[1] || "",
    meetingDateLabel: match?.[2] || "",
    meetingTimeLabel: match?.[3] || "",
    meetingVenue: String(match?.[4] || "").trim(),
  };
};
const PLACEHOLDER_LOCATION_PATTERN = /^--\s*select/i;
const RELATIVE_PUBLIC_ASSET_PATTERN = /^(?:\/|_next\/|api\/|images\/|uploads\/|storage\/)/i;
const PATH_WITH_EXTENSION_PATTERN = /\/[^/?#]+\.[A-Za-z0-9]{2,8}(?:[?#].*)?$/;
const normalizeImageUrl = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("data:")) {
    const compact = raw.replace(/\s+/g, "");
    const normalized = compact.replace(/;bas(?!e64,)/i, ";base64,");
    const commaIndex = normalized.indexOf(",");
    if (commaIndex <= 0) return "";
    const header = normalized.slice(0, commaIndex);
    const payload = normalized.slice(commaIndex + 1).replace(/\s+/g, "");
    if (!payload) return "";
    const fixedHeader = /;base64$/i.test(header)
      ? header
      : header.includes(';')
      ? header
      : `${header};base64`;
    return `${fixedHeader},${payload}`;
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("//") ||
    raw.startsWith("/") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  // Some legacy attachment rows store only the base64 payload without `data:*;base64,` header.
  const compactBase64 = raw.replace(/\s+/g, "");
  if (
    compactBase64.length > 1024 &&
    /^[A-Za-z0-9+/=]+$/.test(compactBase64) &&
    !raw.includes("://")
  ) {
    return `data:image/jpeg;base64,${compactBase64}`;
  }

  if (
    /^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]*$/.test(raw) &&
    (RELATIVE_PUBLIC_ASSET_PATTERN.test(raw) || PATH_WITH_EXTENSION_PATTERN.test(raw))
  ) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  return "";
};
const parseJsonLikeValue = (value: string) => {
  const text = String(value || "").trim();
  if (!text) return value;
  if (!/^[\[{\"]/.test(text)) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
};
const extractImageUrlCandidate = (image: any, depth = 0): string => {
  if (depth > 5) return "";

  if (typeof image === "string") {
    const parsed = parseJsonLikeValue(image);
    if (parsed !== image) {
      return extractImageUrlCandidate(parsed, depth + 1);
    }
    return image;
  }

  if (Array.isArray(image)) {
    for (const entry of image) {
      const candidate = extractImageUrlCandidate(entry, depth + 1);
      if (candidate) return candidate;
    }
    return "";
  }

  if (!image || typeof image !== "object") return "";

  const direct =
    image.url ||
    image.imageUrl ||
    image.publicUrl ||
    image.src ||
    image.fileUrl ||
    image.downloadUrl ||
    image.path ||
    image.href ||
    image.location ||
    image.dataUrl ||
    image.value ||
    image.originalUrl ||
    image.secureUrl ||
    image.signedUrl ||
    image.attachmentUrl ||
    image.uri;
  if (direct) {
    return extractImageUrlCandidate(direct, depth + 1) || String(direct);
  }

  const nestedCandidates = [
    image.file,
    image.attributes,
    image.attachment,
    image.asset,
    image.payload,
    image.data,
    image.metadata,
    image.meta,
    image.result,
    image.image,
  ];
  for (const nested of nestedCandidates) {
    if (!nested) continue;
    const candidate = extractImageUrlCandidate(nested, depth + 1);
    if (candidate) return candidate;
  }

  return "";
};
const collectAttachmentUrls = (value: unknown, depth = 0): string[] => {
  if (depth > 6) return [];
  if (value == null) return [];

  if (typeof value === "string") {
    const parsed = parseJsonLikeValue(value);
    if (parsed !== value) {
      return collectAttachmentUrls(parsed, depth + 1);
    }
    const normalized = normalizeImageUrl(value);
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((entry) => collectAttachmentUrls(entry, depth + 1))
          .filter(Boolean),
      ),
    );
  }

  if (typeof value !== "object") return [];
  const image = value as any;
  const candidates = [
    extractImageUrlCandidate(image),
    image.url,
    image.imageUrl,
    image.publicUrl,
    image.src,
    image.fileUrl,
    image.downloadUrl,
    image.path,
    image.href,
    image.location,
    image.dataUrl,
    image.value,
    image.originalUrl,
    image.secureUrl,
    image.signedUrl,
    image.attachmentUrl,
    image.uri,
    image.file,
    image.attributes,
    image.attachment,
    image.asset,
    image.payload,
    image.data,
    image.metadata,
    image.meta,
    image.result,
    image.image,
  ];

  return Array.from(
    new Set(
      candidates
        .flatMap((entry) => collectAttachmentUrls(entry, depth + 1))
        .filter(Boolean),
    ),
  );
};
const parseFilenameFromContentDisposition = (value: string | null) => {
  if (!value) return "";
  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const asciiMatch = value.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || "";
};
const extensionFromMimeType = (mimeType?: string | null) => {
  const mime = String(mimeType || "").toLowerCase();
  if (!mime) return "bin";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("heic")) return "heic";
  const match = mime.match(/\/([a-z0-9.+-]+)$/i);
  return match?.[1] || "bin";
};
const inferFilenameFromUrl = (url: string, fallback: string) => {
  if (url.startsWith('data:')) return fallback;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    const name = parsed.pathname.split("/").filter(Boolean).pop();
    if (name) {
      try {
        return decodeURIComponent(name);
      } catch {
        return name;
      }
    }
  } catch {}
  return fallback;
};
const mimeTypeFromDataUrl = (url: string) => {
  const match = url.match(/^data:([^;,]+)[;,]/i);
  return match?.[1] || "";
};
const sanitizeFilename = (value: string, fallback: string) => {
  const cleaned = String(value || '').trim();
  const withoutQuery = cleaned.split('?')[0] ?? '';
  const withoutHash = withoutQuery.split('#')[0] ?? '';
  const safe = withoutHash
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .slice(0, 160);
  return safe || fallback;
};
const openUrlInNewTab = (url: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
const triggerDownload = (href: string, filename: string, revoke = false) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (revoke) {
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  }
};
const downloadBlobFile = (blob: Blob, filename: string) => {
  const blobUrl = URL.createObjectURL(blob);
  triggerDownload(blobUrl, filename, true);
};
const decodeDataUrlToBlob = (value: string): Blob | null => {
  const normalized = normalizeImageUrl(value);
  if (!normalized.startsWith("data:")) return null;
  const commaIndex = normalized.indexOf(",");
  if (commaIndex <= 0) return null;

  const mimeType = mimeTypeFromDataUrl(normalized) || "application/octet-stream";
  let payload = normalized.slice(commaIndex + 1).replace(/\s+/g, "");
  if (!payload) return null;

  // Best-effort payload cleanup for malformed base64 strings coming from legacy rows.
  payload = payload.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!payload) return null;
  const remainder = payload.length % 4;
  if (remainder !== 0) {
    payload = `${payload}${"=".repeat(4 - remainder)}`;
  }

  try {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch {
    return null;
  }
};
const shouldAttachAuthHeader = (url: string) => {
  if (url.startsWith("/api/")) return true;
  try {
    if (typeof window === "undefined") return false;
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
};
const downloadRawFilesForPo = (po?: string, prefix = "attachment") => {
  if (!po || typeof window === "undefined") return 0;
  try {
    const rawFiles = (window as any).__cblue_files_by_po || {};
    const files: File[] = Array.isArray(rawFiles[po]) ? rawFiles[po] : [];
    let downloaded = 0;
    files.forEach((file, index) => {
      const ext = extensionFromMimeType(file.type);
      const fallbackName = `${prefix}-${index + 1}.${ext}`;
      const fileName = file.name || fallbackName;
      const blobUrl = URL.createObjectURL(file);
      triggerDownload(blobUrl, fileName, true);
      downloaded += 1;
    });
    return downloaded;
  } catch {
    return 0;
  }
};
const downloadSingleAttachmentUrl = async (
  rawUrl: string,
  index: number,
  prefix = "attachment",
) => {
  const url = normalizeImageUrl(rawUrl);
  if (!url) return false;

  const fallbackName = sanitizeFilename(
    inferFilenameFromUrl(url, `${prefix}-${index + 1}`),
    `${prefix}-${index + 1}`,
  );

  if (url.startsWith("blob:")) {
    triggerDownload(url, fallbackName);
    return true;
  }

  if (url.startsWith("data:")) {
    const ext = extensionFromMimeType(mimeTypeFromDataUrl(url));
    const fileName = sanitizeFilename(
      fallbackName.includes(".") ? fallbackName : `${fallbackName}.${ext}`,
      `${prefix}-${index + 1}.${ext}`,
    );
    const decodedBlob = decodeDataUrlToBlob(url);
    if (decodedBlob) {
      downloadBlobFile(decodedBlob, fileName);
      return true;
    }
    try {
      // Prefer direct data URL download so the browser keeps the user gesture.
      triggerDownload(url, fileName);
      return true;
    } catch {
      // Fallback to fetch/blob for browsers that reject direct data URL download.
    }
    try {
      const response = await fetch(url);
      if (!response.ok) return false;
      const blob = await response.blob();
      const blobExt = extensionFromMimeType(blob.type);
      const blobName = sanitizeFilename(
        fallbackName.includes(".") ? fallbackName : `${fallbackName}.${blobExt}`,
        `${prefix}-${index + 1}.${blobExt}`,
      );
      downloadBlobFile(blob, blobName);
      return true;
    } catch {
      return false;
    }
  }

  // Public absolute URLs often fail CORS on fetch(); open immediately while user gesture is active.
  if ((url.startsWith("http://") || url.startsWith("https://")) && !shouldAttachAuthHeader(url)) {
    openUrlInNewTab(url);
    return true;
  }

  try {
    const headers: Record<string, string> = {};
    const token = typeof window !== "undefined" ? localStorage.getItem("subscriber_token") || "" : "";
    if (token && shouldAttachAuthHeader(url)) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        openUrlInNewTab(url);
        return true;
      }
      if (!shouldAttachAuthHeader(url)) {
        try {
          const absolute = new URL(
            url,
            typeof window !== "undefined" ? window.location.origin : "http://localhost",
          ).toString();
          openUrlInNewTab(absolute);
          return true;
        } catch {
          return false;
        }
      }
      if (url.startsWith("/")) {
        try {
          const absolute = `${window.location.origin}${url}`;
          openUrlInNewTab(absolute);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    const blob = await response.blob();
    const headerName = sanitizeFilename(
      parseFilenameFromContentDisposition(
        response.headers.get("content-disposition"),
      ),
      '',
    );
    const ext = extensionFromMimeType(blob.type);
    const fileName = sanitizeFilename(
      headerName || (fallbackName.includes(".") ? fallbackName : `${fallbackName}.${ext}`),
      `${prefix}-${index + 1}.${ext}`,
    );
    downloadBlobFile(blob, fileName);
    return true;
  } catch {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      openUrlInNewTab(url);
      return true;
    }
    if (!shouldAttachAuthHeader(url)) {
      try {
        const absolute = new URL(
          url,
          typeof window !== "undefined" ? window.location.origin : "http://localhost",
        ).toString();
        openUrlInNewTab(absolute);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};
const downloadAttachmentUrls = async ({
  urls,
  po,
  prefix = "attachment",
}: {
  urls: unknown[];
  po?: string;
  prefix?: string;
}) => {
  const uniqueUrls = Array.from(
    new Set(
      (urls || [])
        .flatMap((value) => collectAttachmentUrls(value))
        .filter(Boolean),
    ),
  );
  let downloadCount = 0;

  for (const [i, url] of uniqueUrls.entries()) {
    const success = await downloadSingleAttachmentUrl(url, i, prefix);
    if (success) downloadCount += 1;
  }

  if (downloadCount === 0) {
    downloadCount += downloadRawFilesForPo(po, prefix);
  }

  return downloadCount > 0;
};
const getAttachmentKind = (url: string) => {
  const raw = String(url || "").toLowerCase();
  if (!raw) return "file";
  if (raw.startsWith("data:image/")) return "image";
  if (raw.startsWith("data:application/pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)(\?|#|$)/i.test(raw)) return "image";
  if (/\.(pdf)(\?|#|$)/i.test(raw)) return "pdf";
  return "file";
};
const openBlobInNewTab = (blob: Blob) => {
  const blobUrl = URL.createObjectURL(blob);
  openUrlInNewTab(blobUrl);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};
const viewSingleAttachmentUrl = async (
  rawUrl: string,
  index: number,
  prefix = "attachment",
) => {
  const url = normalizeImageUrl(rawUrl);
  if (!url) return false;

  if (url.startsWith("blob:")) {
    openUrlInNewTab(url);
    return true;
  }

  if (url.startsWith("data:")) {
    const decodedBlob = decodeDataUrlToBlob(url);
    if (decodedBlob) {
      openBlobInNewTab(decodedBlob);
      return true;
    }
    openUrlInNewTab(url);
    return true;
  }

  if ((url.startsWith("http://") || url.startsWith("https://")) && !shouldAttachAuthHeader(url)) {
    openUrlInNewTab(url);
    return true;
  }

  if (!shouldAttachAuthHeader(url)) {
    try {
      const absolute = new URL(
        url,
        typeof window !== "undefined" ? window.location.origin : "http://localhost",
      ).toString();
      openUrlInNewTab(absolute);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const headers: Record<string, string> = {};
    const token = typeof window !== "undefined" ? localStorage.getItem("subscriber_token") || "" : "";
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(url, {
      headers,
      credentials: "include",
    });
    if (!response.ok) return false;
    const blob = await response.blob();
    const ext = extensionFromMimeType(blob.type);
    const namedBlob = blob.type ? blob : new Blob([blob], { type: `application/${ext}` });
    openBlobInNewTab(namedBlob);
    return true;
  } catch {
    return false;
  }
};
type AttachmentViewerState = {
  title: string;
  po?: string;
  prefix?: string;
  urls: string[];
} | null;
const createAttachmentViewerState = ({
  title,
  po,
  prefix = "attachment",
  urls,
}: {
  title: string;
  po?: string;
  prefix?: string;
  urls: unknown[];
}): Exclude<AttachmentViewerState, null> | null => {
  const resolvedUrls = Array.from(
    new Set(
      (urls || [])
        .flatMap((value) => collectAttachmentUrls(value))
        .filter(Boolean),
    ),
  );
  return resolvedUrls.length > 0 ? { title, po, prefix, urls: resolvedUrls } : null;
};
const normalizeLocationText = (value: unknown) => {
  const text = String(value || "").trim();
  if (!text || PLACEHOLDER_LOCATION_PATTERN.test(text)) return "";
  return text;
};
const getPropSiteLocation = (p: {
  latitude?: number | null;
  longitude?: number | null;
  addressLine?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
}) => {
  const lat = Number(p.latitude);
  const lng = Number(p.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  return [
    normalizeLocationText(p.addressLine),
    normalizeLocationText(p.subdistrict),
    normalizeLocationText(p.district),
    normalizeLocationText(p.province),
  ].filter(Boolean).join(', ') || normalizeLocationText(p.province) || 'Unknown';
};
const getWorkflowStepFromStatus = (status?: string) => {
  switch (String(status || '').toUpperCase()) {
    case 'ASSIGNED':
    case 'DEPOSIT_PENDING':
    case 'CONFIRMED':
      return 6;
    case 'IN_PROGRESS':
      return 7;
    case 'MEETING_REQUESTED':
      return 8;
    case 'COMPLETED':
      return 11;
    default:
      return 5;
  }
};
const getPartnerPinnedWorkflowStep = (po?: string) => {
  const code = String(po || '').trim();
  if (!code) return 0;
  try {
    if (localStorage.getItem(`partner_complete_sent_${code}`)) return 10;
    if (localStorage.getItem(`partner_variation_sent_${code}`)) return 9;
  } catch {}
  return 0;
};
const _n = new Date();
const _fmt = (d: Date) => fmtDateTime(d);
const notifications: any[] = [
    { id: 1, msg: "Review PO Details for FIT OUT", msgTh: "ตรวจสอบรายละเอียด PO สำหรับ FIT OUT", msgZh: "查看FIT OUT的PO详情", unread: true, time: _fmt(_n), dot: "bg-purple-500" },
    { id: 2, msg: "Review PO Details for FIT OUT", msgTh: "ตรวจสอบรายละเอียด PO สำหรับ FIT OUT", msgZh: "查看FIT OUT的PO详情", unread: true, time: _fmt(new Date(_n.getTime() - 2 * 60 * 1000)), dot: "bg-purple-500" },
    { id: 3, msg: "Confirm meeting at site", msgTh: "ยืนยันนัดหมายที่สถานที่", msgZh: "确认现场会议", unread: false, time: _fmt(new Date(_n.getTime() - 60 * 60 * 1000)), dot: "bg-gray-300" },
    { id: 4, msg: "Request for Approval of Variation", msgTh: "คำขออนุมัติการเปลี่ยนแปลง", msgZh: "申请变更审批", unread: false, time: _fmt(new Date(_n.getTime() - 24 * 60 * 60 * 1000)), dot: "bg-gray-300" },
    { id: 5, msg: "Request for job complete", msgTh: "คำขอยืนยันงานเสร็จสิ้น", msgZh: "申请完工确认", unread: false, time: _fmt(new Date(_n.getTime() - 25 * 60 * 60 * 1000)), dot: "bg-gray-300" },
  ];

const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MATCHING: "bg-amber-100 text-amber-700",
  CREATED: "bg-amber-100 text-amber-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
};
const stripWorkflowPrefix = (value: any) => String(value || '').replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?(LOC:[^|]+\|\s*)?/i, '').trim();
const ORDER_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isOrderUuid = (value: any) => ORDER_UUID_PATTERN.test(String(value || '').trim());
const PO_TO_ORDER_KEY_PREFIX = 'po_to_order_';
const ORDER_ID_BY_PO_CACHE: Record<string, string> = {};
const normalizePoLookupValue = (value: any) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
const fetchWithSubscriberAuthRetry = async ({
  endpoint,
  token,
}: {
  endpoint: string;
  token?: string;
}) => {
  if (typeof window === 'undefined') {
    return { token: '', response: null as Response | null };
  }

  let authToken = String(token || localStorage.getItem('subscriber_token') || '').trim();
  if (!authToken) {
    return { token: '', response: null as Response | null };
  }

  const send = async (bearerToken: string) => {
    try {
      return await fetch(endpoint, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
    } catch {
      return null;
    }
  };

  let response = await send(authToken);
  if (response && [401, 403].includes(response.status)) {
    const refreshed = await refreshSubscriberSession(authToken);
    if (refreshed) {
      authToken = refreshed;
      response = await send(authToken);
    }
  }

  return { token: authToken, response };
};
const rememberPoOrderId = (po: any, orderId: any) => {
  const poKey = normalizePoLookupValue(po);
  const resolvedOrderId = String(orderId || '').trim();
  if (!poKey || !isOrderUuid(resolvedOrderId)) return;
  ORDER_ID_BY_PO_CACHE[poKey] = resolvedOrderId;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${PO_TO_ORDER_KEY_PREFIX}${po}`, resolvedOrderId);
    }
  } catch {
    // non-blocking
  }
};
const findOrderIdFromLocalPoMap = (po?: string) => {
  if (typeof window === 'undefined') return '';
  const poKey = normalizePoLookupValue(po);
  if (!poKey) return '';

  const direct = localStorage.getItem(`${PO_TO_ORDER_KEY_PREFIX}${po || ''}`) || '';
  if (isOrderUuid(direct)) return direct;

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PO_TO_ORDER_KEY_PREFIX)) continue;
    const mappedPo = normalizePoLookupValue(key.slice(PO_TO_ORDER_KEY_PREFIX.length));
    if (mappedPo !== poKey) continue;
    const mappedOrderId = localStorage.getItem(key) || '';
    if (isOrderUuid(mappedOrderId)) return mappedOrderId;
  }

  return '';
};
const resolveOrderIdByPo = async ({
  po,
  fallbackOrderId,
  token,
}: {
  po?: string;
  fallbackOrderId?: string;
  token?: string;
}) => {
  const fallback = String(fallbackOrderId || '').trim();
  if (isOrderUuid(fallback)) {
    if (po) rememberPoOrderId(po, fallback);
    return fallback;
  }

  const poKey = normalizePoLookupValue(po);
  if (!poKey || typeof window === 'undefined') return '';

  const cached = ORDER_ID_BY_PO_CACHE[poKey];
  if (isOrderUuid(cached)) return cached;

  const mappedLocal = findOrderIdFromLocalPoMap(po);
  if (isOrderUuid(mappedLocal)) {
    rememberPoOrderId(po, mappedLocal);
    return mappedLocal;
  }

  let authToken = String(token || localStorage.getItem('subscriber_token') || '').trim();
  if (!authToken) return '';

  for (const endpoint of ['/api/v1/orders/fixer', '/api/v1/orders/my']) {
    try {
      const attempt = await fetchWithSubscriberAuthRetry({
        endpoint,
        token: authToken,
      });
      authToken = attempt.token || authToken;
      const response = attempt.response;
      if (!response) continue;
      if (!response.ok) continue;
      const rows = await response.json();
      const list = Array.isArray(rows) ? rows : [];
      const matched = list.find((order: any) => {
        const extractedPo = extractPoCode(order);
        return normalizePoLookupValue(extractedPo) === poKey;
      });
      const resolved = String(matched?.id || '').trim();
      if (isOrderUuid(resolved)) {
        rememberPoOrderId(po, resolved);
        return resolved;
      }
    } catch {
      // non-blocking
    }
  }

  return '';
};
const fetchAttachmentUrlsByPoFromOrders = async ({
  po,
  token,
}: {
  po?: string;
  token?: string;
}) => {
  const poKey = normalizePoLookupValue(po);
  if (!poKey || typeof window === 'undefined') {
    return { orderId: '', urls: [] as string[] };
  }

  let authToken = String(token || localStorage.getItem('subscriber_token') || '').trim();
  if (!authToken) {
    return { orderId: '', urls: [] as string[] };
  }

  for (const endpoint of ['/api/v1/orders/fixer', '/api/v1/orders/my']) {
    try {
      const attempt = await fetchWithSubscriberAuthRetry({
        endpoint,
        token: authToken,
      });
      authToken = attempt.token || authToken;
      const response = attempt.response;
      if (!response) continue;
      if (!response.ok) continue;
      const rows = await response.json();
      const list = Array.isArray(rows) ? rows : [];
      const matched = list.find((order: any) => {
        const extractedPo = extractPoCode(order);
        return normalizePoLookupValue(extractedPo) === poKey;
      });
      if (!matched) continue;

      const orderId = String(matched?.id || '').trim();
      if (isOrderUuid(orderId)) {
        rememberPoOrderId(po, orderId);
      }

      const urls = Array.from(
        new Set(
          [
            ...(Array.isArray(matched?.images) ? matched.images : []),
            ...(Array.isArray(matched?.attachments) ? matched.attachments : []),
            ...(Array.isArray(matched?.files) ? matched.files : []),
            ...(Array.isArray(matched?.imageUrls) ? matched.imageUrls : []),
            ...(Array.isArray(matched?.projectImages) ? matched.projectImages : []),
            ...(Array.isArray(matched?.metadata?.images) ? matched.metadata.images : []),
            ...(Array.isArray(matched?.metadata?.attachments) ? matched.metadata.attachments : []),
            ...(Array.isArray(matched?.metadata?.files) ? matched.metadata.files : []),
            matched?.issueImage,
            matched?.image,
            matched?.fileUrl,
            matched?.attachmentUrl,
            matched?.documentUrl,
            matched?.metadata?.issueImage,
            matched?.metadata?.issueImageUrl,
          ]
            .flatMap((entry) => collectAttachmentUrls(entry))
            .filter(Boolean),
        ),
      );

      if (urls.length > 0 || orderId) {
        return { orderId, urls };
      }
    } catch {
      // non-blocking
    }
  }

  return { orderId: '', urls: [] as string[] };
};
const firstNameOnly = (value: any, fallback = 'User') => {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned.split(/\s+/)[0] || fallback : fallback;
};
const HIDDEN_TEST_POS = new Set(["PO-2605-6716", "PO-2605-9605", "PO-2605-8699", "PO-2605-9701", "PO-2605-9593", "PO-2605-8471", "PO-2605-6146"]);
const isHiddenTestPo = (value: any) => HIDDEN_TEST_POS.has(String(value || '').trim().toUpperCase());
const filterVisibleWorkflowItems = (items: any[]) => items.filter((item: any) => !isHiddenTestPo(item?.po));
const WORKFLOW_STEP_NAMES: Record<number, string> = {
  5: 'Accept',
  6: 'Fee & Proceed',
  7: 'Chat',
  8: 'Meet',
  9: 'Variation',
  10: 'Complete',
  11: 'Rate',
};
const getWorkflowStepName = (step?: number) => WORKFLOW_STEP_NAMES[Number(step || 0)] || 'Rate';
const toCurrencyLabel = (value: any, fallback = '฿0') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const numStr = raw.replace(/^฿/, '').replace(/,/g, '');
  const num = parseFloat(numStr);
  if (!isNaN(num) && isFinite(num) && /^\d*\.?\d+$/.test(numStr.trim())) {
    return `฿${Math.round(num).toLocaleString()}`;
  }
  // Extract the last ฿Amount from formula strings like '800 sq.m. × ฿28,125 = ฿22,500,000'
  const allBahtMatches = [...raw.matchAll(/฿([\d,]+(?:\.\d+)?)/g)];
  if (allBahtMatches.length > 0) {
    const lastMatch = allBahtMatches[allBahtMatches.length - 1];
    if (lastMatch) {
      const extracted = parseFloat((lastMatch[1] ?? '').replace(/,/g, ''));
      if (!isNaN(extracted) && extracted > 0) return `฿${Math.round(extracted).toLocaleString()}`;
    }
  }
  return raw.startsWith('฿') ? raw : `฿${raw}`;
};
const PROPERTY_FLOW_STEPS = ["Match", "Select", "Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Rate"];
const FIXER_FLOW_STEPS = ["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"];
const isPropertyWorkflowJob = (job: any) => {
  const po = String(job?.po || "").trim();
  if (isPropPoCode(po)) return true;
  if (Boolean(job?.isPropertyJob)) return true;
  const workflowType = String(job?.workflowType || job?.type || "").toLowerCase();
  return workflowType.startsWith("prop_");
};
const getWorkflowProgressConfig = (job: any) => {
  const isProperty = isPropertyWorkflowJob(job);
  return {
    steps: isProperty ? PROPERTY_FLOW_STEPS : FIXER_FLOW_STEPS,
    startStep: isProperty ? 1 : 4,
    completeStep: isProperty ? 8 : 11,
    fallbackStep: isProperty ? 4 : 5,
  };
};
const getJobAmountPrefix = (job: any, locale: string) => {
  if (isPropertyWorkflowJob(job)) {
    return locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value";
  }
  return locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget";
};
const getJobAmountValue = (job: any) => {
  if (isPropertyWorkflowJob(job)) {
    return toCurrencyLabel(job?.value || job?.budget || job?.propertyPrice || 0);
  }
  return job?.fee || toCurrencyLabel(job?.budget || 0);
};
const normalizePropertyListingType = (value: any) => {
  const upper = String(value || '').trim().toUpperCase();
  return upper === 'SALE' || upper === 'RENT' ? upper : '';
};
const getPropertyListingTypeLabel = (listingType: any, locale: string) => {
  const upper = normalizePropertyListingType(listingType);
  if (upper === 'SALE') return locale === 'th' ? 'ขาย' : locale === 'zh' ? '出售' : 'Sale';
  if (upper === 'RENT') return locale === 'th' ? 'เช่า' : locale === 'zh' ? '出租' : 'Rent';
  return '-';
};
const getJobListingTypeLabel = (job: any, locale: string) => {
  if (!isPropertyWorkflowJob(job)) return '';
  const direct = normalizePropertyListingType(job?.listingType || job?.propInquiry?.listingType);
  if (direct) return getPropertyListingTypeLabel(direct, locale);
  const inferred = String(job?.description || '').match(/\bListing:\s*([A-Za-z]+)/i)?.[1] || '';
  const normalized = normalizePropertyListingType(inferred);
  return normalized ? getPropertyListingTypeLabel(normalized, locale) : '';
};

const getLocalChatHistory = (po: any) => {
  if (typeof window === 'undefined' || !po) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(`chat_messages_${po}`) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((message: any) => ({
        id: message?.id || `${po}-${message?.createdAt || message?.time || Math.random()}`,
        sender: String(message?.sender || 'system'),
        text: String(message?.text || '').trim(),
        time: String(message?.time || ''),
      }))
      .filter((message: any) => message.text);
  } catch {
    return [];
  }
};
const buildVariationPriceListRows = (
  rows: { item: string; qty: string; unit: string; rate: string; amount: string }[],
): VariationPriceListItem[] =>
  rows
    .filter((row) => row.item.trim())
    .map((row) => {
      const qty = Number.parseFloat(row.qty || '');
      const rate = Number.parseFloat(row.rate.replace(/,/g, '') || '');
      const amount = Number.parseFloat(row.amount.replace(/,/g, '') || '');
      return {
        item: row.item.trim(),
        qty: Number.isFinite(qty) && qty > 0 ? qty : null,
        unit: row.unit.trim(),
        rate: Number.isFinite(rate) && rate > 0 ? rate : null,
        amount: Number.isFinite(amount) && amount > 0 ? amount : null,
      };
    });
const resolveVariationPriceListItems = (po?: string, description?: unknown) => {
  const stored = po ? readStoredVariationPriceList(po) : [];
  if (stored.length > 0) return stored;
  const parsed = parseVariationPriceList(description);
  if (po && parsed.length > 0) {
    storeVariationPriceList(po, parsed);
  }
  return parsed;
};
const normalizeVariationPartnerNote = (value: unknown) =>
  stripVariationPriceList(value)
    .replace(/^Partner variation request:\s*/i, '')
    .replace(/^Partner Request:\s*/i, '')
    .trim();
const readStoredVariationPartnerNote = (po?: string) => {
  if (typeof window === 'undefined' || !po) return '';
  try {
    return String(localStorage.getItem(`cblue_variation_note_${po}`) || '').trim();
  } catch {
    return '';
  }
};
const storeVariationPartnerNote = (po?: string, note?: string) => {
  if (typeof window === 'undefined' || !po) return;
  const normalized = String(note || '').trim();
  try {
    if (!normalized) {
      localStorage.removeItem(`cblue_variation_note_${po}`);
      return;
    }
    localStorage.setItem(`cblue_variation_note_${po}`, normalized);
  } catch {
    // non-blocking
  }
};
const resolveVariationPartnerNote = (po?: string, description?: unknown) => {
  const stored = readStoredVariationPartnerNote(po);
  if (stored) return stored;
  const parsed = normalizeVariationPartnerNote(description);
  if (po && parsed) storeVariationPartnerNote(po, parsed);
  return parsed;
};

function WorkflowModalMeta({
  step,
  typeOfWork,
  actionText,
  po,
  counterpartLabel,
  counterpartName,
  budget,
  location,
  projectDetails,
}: {
  step: number;
  typeOfWork: string;
  actionText: string;
  po: string;
  counterpartLabel: string;
  counterpartName: string;
  budget: string;
  location: string;
  projectDetails: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2 text-sm text-gray-800">
      <div className="flex justify-between gap-3"><span className="text-gray-500">Step Name</span><span className="font-bold text-right">{getWorkflowStepName(step)}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">Type of Work</span><span className="font-bold text-right">{typeOfWork}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">What You Need To Do</span><span className="font-bold text-right max-w-[65%]">{actionText}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-right">{po}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{counterpartLabel}</span><span className="font-bold text-right">{counterpartName}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">Budget</span><span className="font-bold text-right">{budget}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">Project Location</span><span className="font-bold text-right">{location || 'Unknown'}</span></div>
      <div>
        <span className="text-gray-500">Project Details</span>
        <p className="mt-1 rounded-lg border border-gray-100 bg-white px-3 py-2 font-bold text-gray-800">{projectDetails || 'Project details from the draft PO.'}</p>
      </div>
    </div>
  );
}

function AttachmentViewerModal({
  viewer,
  onClose,
}: {
  viewer: Exclude<AttachmentViewerState, null>;
  onClose: () => void;
}) {
  const attachmentUrls = Array.from(new Set(viewer.urls));
  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-gray-900/70 backdrop-blur-sm p-4 overflow-y-auto pt-20">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{viewer.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {viewer.po ? `${viewer.po} · ` : ''}
              {attachmentUrls.length} file{attachmentUrls.length === 1 ? '' : 's'} available
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                await downloadAttachmentUrls({
                  urls: attachmentUrls,
                  po: viewer.po,
                  prefix: viewer.prefix || 'attachment',
                });
              }}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition"
            >
              Download All
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
              &times;
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3 max-h-[calc(100dvh-10rem)] overflow-y-auto">
          {attachmentUrls.map((url, index) => {
            const fallbackName = `${viewer.prefix || 'attachment'}-${index + 1}`;
            const fileName = sanitizeFilename(inferFilenameFromUrl(url, fallbackName), fallbackName);
            const kind = getAttachmentKind(url);
            const badgeLabel = kind === 'image' ? 'Image' : kind === 'pdf' ? 'PDF' : 'File';
            return (
              <div key={`${fileName}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{badgeLabel}</span>
                    <span className="text-xs text-gray-400">File {index + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate mt-1">{fileName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const opened = await viewSingleAttachmentUrl(url, index, viewer.prefix || 'attachment');
                      if (!opened) {
                        alert('Could not open this file right now.');
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-sky-200 text-sky-700 hover:bg-sky-50 text-sm font-semibold transition"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const downloaded = await downloadSingleAttachmentUrl(url, index, viewer.prefix || 'attachment');
                      if (!downloaded) {
                        alert('Could not download this file right now.');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition"
                  >
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const extractDeclineReason = (value: any) => {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/reason:\s*(.+?)(?:\.\s*please select another professional\.?|$)/i);
  return String(match?.[1] || text).trim();
};

function WorkflowHistoryCard({ item, compact = false, locale = "en" }: { item: any; compact?: boolean; locale?: string }) {
  const [collapsed, setCollapsed] = React.useState(true);
  const chatPreview = collapsed ? [] : (Array.isArray(item.chatHistory) ? item.chatHistory.slice(compact ? -2 : -4) : []);
  const isCancelled = String(item.status || '').toUpperCase() === 'CANCELLED';
  const declineReason = extractDeclineReason(item.declineReason || item.statusNote);
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-50/60 transition cursor-pointer" onClick={() => setCollapsed(c => !c)}>
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">{item.service} <span className="text-sm font-normal text-gray-400">· {item.po} · {item.counterpartName || item.customer || 'Customer'}</span></h3>
            <p className="text-sm text-gray-500 mt-1">
              {isCancelled
                ? locale === 'th'
                  ? 'ปฏิเสธงาน'
                  : locale === 'zh'
                  ? '已拒绝'
                  : 'Declined'
                : locale === 'th'
                ? 'เสร็จสิ้น'
                : locale === 'zh'
                ? '已完成'
                : 'Completed'}{' '}
              {fmtDateTime(item.completedAt || item.statusChangedAt || item.createdAt || item.date || Date.now())}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
            <span className="font-bold text-gray-900">{item.fee || item.budget || '฿0'}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isCancelled ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isCancelled
                ? locale === 'th'
                  ? 'ปิดคำขอ · พาร์ทเนอร์ไม่ว่าง'
                  : locale === 'zh'
                  ? '请求已关闭 · 合作伙伴无法安排时间'
                  : 'Request Closed · Partner Unavailable'
                : `Step 11 of 11 · ${item.stepName || getWorkflowStepName(item.step)}`}
            </span>
            <span className="text-xs text-sky-600 font-semibold">{collapsed ? '▼ Show details' : '▲ Hide details'}</span>
          </div>
        </div>
        {!collapsed && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
              <div><span className="text-gray-500">Project Location:</span> {item.location || item.subdistrict || 'Unknown'}</div>
              <div><span className="text-gray-500">Tier:</span> {item.tier || 'Standard'}</div>
              <div className="sm:col-span-2"><span className="text-gray-500">Project Details:</span> {item.projectDetails || item.description || 'Project details not available.'}</div>
            </div>
            {isCancelled && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1">
                  {locale === 'th' ? 'บันทึกการปฏิเสธ' : locale === 'zh' ? '拒绝说明' : 'Decline Note'}
                </p>
                <p className="text-sm text-red-900">
                  {locale === 'th'
                    ? 'คำขอนี้ถูกปิดหลังจากคุณปฏิเสธงาน และระบบได้แจ้งลูกค้าให้เลือกผู้ให้บริการรายอื่นแล้ว'
                    : locale === 'zh'
                    ? '此请求因您拒绝接单而关闭，系统已通知客户选择其他服务提供商。'
                    : 'This request was closed after you declined the job, and the customer has been notified to select another professional.'}
                </p>
                {declineReason ? (
                  <p className="text-sm text-red-800 mt-2">
                    <span className="font-semibold">{locale === 'th' ? 'เหตุผลที่บันทึก:' : locale === 'zh' ? '记录原因：' : 'Reason provided:'}</span> {declineReason}
                  </p>
                ) : null}
              </div>
            )}
            {chatPreview.length > 0 && (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Chat History</p>
                <div className="space-y-2">
                  {chatPreview.map((message: any) => (
                    <div key={message.id} className="text-sm text-gray-700">
                      <span className="font-semibold capitalize text-gray-900">{message.sender}</span>
                      {message.time ? <span className="text-xs text-gray-400"> · {message.time}</span> : null}
                      <p className="mt-0.5">{message.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Confirmed", th: "ยืนยันแล้ว", zh: "已确认" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  ASSIGNED: { en: "", th: "", zh: "" },
  ACCEPTED: { en: "", th: "", zh: "" },
  MATCHING: { en: "PO Pending", th: "รอตรวจสอบ PO", zh: "待审PO" },
};
const getStatusLabel = (status: string, locale: string) => { const lbl = STATUS_LABEL[status]; if (lbl !== undefined) return lbl[locale as keyof typeof lbl] ?? ""; return status.replace(/_/g, " "); };

type TabKey = "overview" | "requests" | "active" | "properties" | "history" | "chat" | "notifications" | "profile";

export default function FixerProPage() {
  const locale = useLocale();
  const router = useRouter();
  const prefix = `/${locale}`;

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);
  const [chatFeed, setChatFeed] = useState<any[]>([]);

  const [orders, setOrders] = useState<any[]>([]);
  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);
  const [waitModalAttachmentUrls, setWaitModalAttachmentUrls] = useState<string[]>([]);
  const [attachmentViewer, setAttachmentViewer] = useState<AttachmentViewerState>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineComment, setDeclineComment] = useState('');
  // Property inquiry state for lister/fixer — polls cblue_prop_inquiries every 1000ms
  interface PropInquiry { id: string; poNumber: string; propertyId: string; propertyTitle: string; propertyTier: string; propertyFee: number; propertyType: string; listingType: string; propertyPrice: number; province: string; district: string; subdistrict?: string; addressLine?: string; latitude?: number | null; longitude?: number | null; area?: number | null; bedrooms?: number | null; bathrooms?: number | null; propertyImages?: string[]; customerEmail: string; customerName: string; listerName: string; status: string; step: number; createdAt: number; updatedAt: number; meetingDate?: string; meetingTime?: string; meetingVenue?: string; customerRating?: number | null; customerComment?: string; listerRating?: number | null; listerComment?: string; reselectedOnce?: boolean; }
  const [propInquiries, setPropInquiries] = useState<PropInquiry[]>([]);
  const [propAcceptModal, setPropAcceptModal] = useState<PropInquiry | null>(null);
  const [propMeetingConfirmModal, setPropMeetingConfirmModal] = useState<PropInquiry | null>(null);
  const [propPartnerRateModal, setPropPartnerRateModal] = useState<PropInquiry | null>(null);
  const [propPartnerRateStars, setPropPartnerRateStars] = useState(0);
  const [propPartnerRateComment, setPropPartnerRateComment] = useState("");
  const [propPartnerModalImages, setPropPartnerModalImages] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, [activeTab]);

  const ensurePropChatBootstrap = (inquiry: PropInquiry) => {
    if (typeof window === "undefined" || !inquiry?.poNumber) return;
    try {
      const po = inquiry.poNumber;
      const key = `chat_messages_${po}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(existing) && existing.length > 0) {
        if (!localStorage.getItem(`chat_title_${po}`)) {
          localStorage.setItem(`chat_title_${po}`, getPropChatRoomTitle(inquiry));
        }
        return;
      }

      const now = Date.now();
      const text = locale === "th"
        ? "[CBLUE] ห้องแชทเปิดใช้งานแล้ว กรุณาหารือเวลานัดหมายหน้างานร่วมกัน และให้ลูกค้าส่งคำเชิญนัดหมายจากหน้า Requests"
        : locale === "zh"
        ? "[CBLUE] 聊天室已激活。请双方协商可看房时间，并由客户在 Requests 页面发送会议邀请。"
        : "[CBLUE] Chat room is now active. Please discuss available site meeting time, and the customer should send a meeting invitation from Requests.";

      const bootstrapMessage = {
        id: `cblue-prop-${po}-${now}`,
        sender: "cblue",
        text,
        createdAt: new Date(now).toISOString(),
        time: fmtDateTime(now),
      };

        localStorage.setItem(key, JSON.stringify([bootstrapMessage]));
        localStorage.setItem(`chat_title_${po}`, getPropChatRoomTitle(inquiry));
      localStorage.setItem(`chat_from_${po}`, "fixers");
        localStorage.removeItem(`chat_closed_${po}`);
      window.dispatchEvent(new Event("cblue-chat-updated"));
    } catch {
      // Best-effort chat bootstrap for property flow.
    }
  };

  useEffect(() => {
    const fallbackImages = Array.from(
      new Set(
        [
          ...(Array.isArray(propAcceptModal?.propertyImages) ? propAcceptModal!.propertyImages : []),
          ...(Array.isArray(propMeetingConfirmModal?.propertyImages) ? propMeetingConfirmModal!.propertyImages : []),
        ]
          .map((value) => normalizeImageUrl(extractImageUrlCandidate(value)))
          .filter(Boolean),
      ),
    );

    const pid = propAcceptModal?.propertyId || propMeetingConfirmModal?.propertyId;
    if (!pid) {
      setPropPartnerModalImages(fallbackImages);
      return;
    }
    let active = true;
    fetch(`/api/v1/properties/${pid}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!active) return;
        if (data?.images && Array.isArray(data.images)) {
          const fetchedImages = data.images
            .map((i: any) => normalizeImageUrl(extractImageUrlCandidate(i)))
            .filter(Boolean);
          setPropPartnerModalImages(
            Array.from(new Set([...fallbackImages, ...fetchedImages])),
          );
        } else {
          setPropPartnerModalImages(fallbackImages);
        }
      })
      .catch(() => {
        if (active) setPropPartnerModalImages(fallbackImages);
      });
    return () => { active = false; };
  }, [propAcceptModal, propMeetingConfirmModal]);
  const handleJobClick = (job: any) => {
    const workflowType = String(job?.workflowType || job?.type || '').toLowerCase();
    const jobStatus = String(job?.status || '').toUpperCase();
    if (workflowType === 'meeting_confirm_partner' || workflowType === 'pending_accept' || ['MATCHING', 'CREATED', 'MEETING_REQUESTED'].includes(jobStatus)) {
      setWaitModalOrder(job);
      // Write breakdown to localStorage so customer's dashboard Approve Variation can read it (same-browser demo)
      try {
        const po = job?.po;
        if (po) {
          const desc = String(job?.description || job?.desc || '');
          const total = parseFloat(String(job?.budget || job?.fee || '').replace(/[฿,]/g, '')) || 0;
          let pl = (partner as any)?.priceList ?? [];
          // Fallback: try priceList stored in localStorage for this PO
          if (pl.length === 0) {
            try { const stored = localStorage.getItem(`cblue_partner_pricelist_${po}`); if (stored) pl = JSON.parse(stored); } catch {}
          }
          // Final fallback: general key set when partner profile was loaded
          if (pl.length === 0) {
            try { const stored = localStorage.getItem('cblue_partner_pricelist_general'); if (stored) pl = JSON.parse(stored); } catch {}
          }
          const bd = computeBudgetBreakdown(desc, pl, total);
          if (bd && bd.length > 0) {
            localStorage.setItem(`cblue_po_breakdown_${po}`, JSON.stringify(bd));
          }
          if (pl && pl.length > 0) {
            localStorage.setItem(`cblue_partner_pricelist_${po}`, JSON.stringify(pl));
          }
        }
      } catch { /* non-blocking */ }
    } else {
      const poFromDesc = extractPoCode(job);
      const chatId = job.po || poFromDesc || job.id;
      const displayId = job.po || poFromDesc || (job.id ? `PO-${String(job.id).slice(0,4)}-${String(job.id).slice(4,8)}` : job.id);
      try {
        localStorage.setItem(`chat_from_${chatId}`, "fixers");
        localStorage.setItem(`chat_title_${chatId}`, `${job.service || job.serviceTh || ''} - ${displayId} - ฿${job.budget || '0'}`);
        // Store PO→UUID mapping so ClientChatPage can resolve to backend order
        if (chatId && job.id && chatId !== job.id) {
          localStorage.setItem(`po_to_order_${chatId}`, job.id);
        }
        if (poFromDesc && job.id && poFromDesc !== chatId) {
          localStorage.setItem(`po_to_order_${poFromDesc}`, job.id);
        }
      } catch {}
      window.location.href = `/${locale}/chat/${chatId}`;
    }
  };
  const [myProperties, setMyProperties] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const resolveWaitModalAttachments = async () => {
      if (!waitModalOrder) {
        if (isMounted) { setWaitModalAttachmentUrls([]); setLoadingAttachments(false); }
        return;
      }
      if (isMounted) setLoadingAttachments(true);

      const directUrls = [
        waitModalOrder?.issueImage,
        waitModalOrder?.image,
        waitModalOrder?.fileUrl,
        waitModalOrder?.attachmentUrl,
        waitModalOrder?.documentUrl,
        ...(Array.isArray(waitModalOrder?.attachments) ? waitModalOrder.attachments : []),
        ...(Array.isArray(waitModalOrder?.files) ? waitModalOrder.files : []),
        ...(Array.isArray(waitModalOrder?.projectImages) ? waitModalOrder.projectImages : []),
        ...(Array.isArray(waitModalOrder?.images) ? waitModalOrder.images : []),
        ...(Array.isArray(waitModalOrder?.imageUrls) ? waitModalOrder.imageUrls : []),
        ...(Array.isArray(waitModalOrder?.metadata?.images) ? waitModalOrder.metadata.images : []),
        ...(Array.isArray(waitModalOrder?.metadata?.attachments) ? waitModalOrder.metadata.attachments : []),
        ...(Array.isArray(waitModalOrder?.metadata?.files) ? waitModalOrder.metadata.files : []),
        waitModalOrder?.metadata?.issueImageUrl,
        waitModalOrder?.metadata?.issueImage,
      ].filter(Boolean);

      const poFromDesc = extractPoCode(waitModalOrder);
      const poKey = waitModalOrder?.po || poFromDesc;
      const token = localStorage.getItem('subscriber_token') || '';
      const orderLookup = await fetchAttachmentUrlsByPoFromOrders({
        po: poKey,
        token,
      });
      if (orderLookup.urls.length > 0) {
        directUrls.push(...orderLookup.urls);
      }
      const attachmentOrderId = await resolveOrderIdByPo({
        po: poKey,
        fallbackOrderId:
          waitModalOrder?.orderId ||
          orderLookup.orderId ||
          (isOrderUuid(waitModalOrder?.id) ? waitModalOrder?.id : ''),
        token,
      });

      try {
        const poMap = JSON.parse(localStorage.getItem('cblue_po_attachments') || '{}');
        const orderMap = JSON.parse(localStorage.getItem('cblue_order_attachments') || '{}');
        if (poKey) {
          for (const [cachedPo, cachedUrls] of Object.entries(poMap || {})) {
            if (normalizePoLookupValue(cachedPo) !== normalizePoLookupValue(poKey)) continue;
            if (Array.isArray(cachedUrls)) {
              directUrls.push(...cachedUrls);
            }
          }
        }
        if (attachmentOrderId && Array.isArray(orderMap[attachmentOrderId])) {
          directUrls.push(...orderMap[attachmentOrderId]);
        }
      } catch {}

      // Check raw File objects stored in window during this browser session.
      // This bypasses localStorage quota limits (HEIC files are often > 5 MB).
      try {
        const rawFiles = (typeof window !== 'undefined' ? (window as any).__cblue_files_by_po : null) || {};
        const files: File[] = poKey && Array.isArray(rawFiles[poKey]) ? rawFiles[poKey] : [];
        if (files.length > 0) {
          files.forEach(f => { try { directUrls.push(URL.createObjectURL(f)); } catch { /* skip */ } });
        }
      } catch {}

      const uniqueDirectUrls = Array.from(
        new Set(
          directUrls
            .flatMap((value: unknown) => collectAttachmentUrls(value))
            .filter(Boolean),
        ),
      );
      if (uniqueDirectUrls.length > 0) {
        if (isMounted) { setWaitModalAttachmentUrls(uniqueDirectUrls); setLoadingAttachments(false); }
        return;
      }

      if (!attachmentOrderId) {
        // Last fallback: try to derive URLs directly from current order lists by PO.
        const backupLookup = await fetchAttachmentUrlsByPoFromOrders({
          po: poKey,
          token,
        });
        if (backupLookup.urls.length > 0) {
          if (isMounted) {
            setWaitModalAttachmentUrls(backupLookup.urls);
            setLoadingAttachments(false);
          }
          return;
        }
        if (isMounted) { setWaitModalAttachmentUrls([]); setLoadingAttachments(false); }
        return;
      }

      try {
        if (!token) {
          if (isMounted) { setWaitModalAttachmentUrls([]); setLoadingAttachments(false); }
          return;
        }

        const attachmentAttempt = await fetchWithSubscriberAuthRetry({
          endpoint: `/api/v1/orders/${attachmentOrderId}/attachments`,
          token,
        });
        const res = attachmentAttempt.response;
        if (!res) {
          if (isMounted) { setWaitModalAttachmentUrls([]); setLoadingAttachments(false); }
          return;
        }
        if (!res.ok) {
          if (isMounted) { setWaitModalAttachmentUrls([]); setLoadingAttachments(false); }
          return;
        }

        const attachments = await res.json();
        const backendUrls = Array.isArray(attachments)
          ? attachments
              .flatMap((attachment: any) => collectAttachmentUrls(attachment))
              .filter(Boolean)
          : [];
        if (isMounted) { setWaitModalAttachmentUrls(Array.from(new Set(backendUrls))); setLoadingAttachments(false); }
      } catch {
        if (isMounted) { setWaitModalAttachmentUrls([]); setLoadingAttachments(false); }
      }
    };

    void resolveWaitModalAttachments();

    return () => {
      isMounted = false;
    };
  }, [waitModalOrder]);

  const openWaitModalAttachmentViewer = async () => {
    const poKey = waitModalOrder?.po;
    let freshUrls: string[] = waitModalAttachmentUrls;
    try {
      const raw = localStorage.getItem('cblue_po_attachments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (poKey) {
          const matched = Object.entries(parsed || {}).find(
            ([cachedPo, value]) =>
              normalizePoLookupValue(cachedPo) === normalizePoLookupValue(poKey) &&
              Array.isArray(value) &&
              value.length > 0,
          );
          if (matched && Array.isArray(matched[1])) {
            freshUrls = matched[1] as string[];
          }
        }
      }
    } catch {}

    if (freshUrls.length === 0) {
      const token = localStorage.getItem('subscriber_token') || '';
      const orderLookup = await fetchAttachmentUrlsByPoFromOrders({
        po: poKey,
        token,
      });
      if (orderLookup.urls.length > 0) {
        freshUrls = Array.from(
          new Set(
            orderLookup.urls
              .flatMap((entry) => collectAttachmentUrls(entry))
              .filter(Boolean),
          ),
        );
      }
      const mappedOrderId = poKey
        ? (mappedOrders as any[]).find(
            (order: any) => normalizePoLookupValue(order?.po) === normalizePoLookupValue(poKey),
          )?.id
        : '';
      const orderId = await resolveOrderIdByPo({
        po: poKey,
        fallbackOrderId:
          waitModalOrder?.orderId ||
          orderLookup.orderId ||
          mappedOrderId ||
          (isOrderUuid(waitModalOrder?.id) ? waitModalOrder?.id : ''),
        token,
      });

      if (token && orderId) {
        try {
          const attachmentAttempt = await fetchWithSubscriberAuthRetry({
            endpoint: `/api/v1/orders/${orderId}/attachments`,
            token,
          });
          const res = attachmentAttempt.response;
          if (res?.ok) {
            const rows = await res.json();
            freshUrls = Array.from(
              new Set(
                (Array.isArray(rows) ? rows : [])
                  .flatMap((entry: any) => collectAttachmentUrls(entry))
                  .filter(Boolean),
              ),
            );
          }
        } catch {
          // non-blocking
        }
      }
    }

    const viewer = createAttachmentViewerState({
      title: 'Uploaded Files',
      po: poKey,
      prefix: 'attachment',
      urls: freshUrls,
    });
    if (!viewer) {
      alert('No downloadable file found right now.');
      return;
    }
    setWaitModalAttachmentUrls(viewer.urls);
    setAttachmentViewer(viewer);
  };



  const [isFixer, setIsFixer] = useState(false);
  const [isLister, setIsLister] = useState(false);

  
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("subscriber_token");
      if (!token) {
        setPartner(null);
        setIsFixer(false);
        setIsLister(false);
        setOrders([]);
        setMyProperties([]);
        setChatFeed([]);
      } else {
        const stored = localStorage.getItem("subscriber");
        if (stored) setPartner(JSON.parse(stored));
        // Reset role flags until /users/me and /properties/my re-verify access.
        setIsFixer(false);
        setIsLister(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (!token) {
          setLoading(false);
          return;
        }

        // Eagerly set state from localStorage to prevent flash of logged-out state
        if (isMounted) {
          const stored = localStorage.getItem("subscriber");
          if (stored) {
            const parsed = JSON.parse(stored);
            setPartner(parsed);
            // Roles are verified from backend APIs below.
            setIsFixer(false);
            setIsLister(false);
          }
        }

        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("Failed to fetch user data:", err);
          return null;
        });

        if (!res) {
          if (isMounted) setIsFixer(false);
          return;
        }

        if (res.ok) {
          const user = await res.json();
          if (isMounted) {
            const hasFixer = !!user.fixer;
            setIsFixer(hasFixer);
            
            // Generate base info
            let pInfo: any = {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              status: "ACTIVE"
            };

            // If they are actually a fixer, poplate fixer schema
            if (hasFixer) {
              pInfo = {
                id: user.id,
                name: user.fixer?.contactName || user.name,
                email: user.email,
                phone: user.fixer?.contactPhone || user.phone,
                company: user.fixer?.companyName || "-",
                status: user.fixer?.status || "ACTIVE",
                tier: user.fixer?.aiTier || user.fixer?.tier || "Standard",
                tierScore: user.fixer?.aiScore || 69,
                breakdown: user.fixer?.aiBreakdown || [],
                flags: user.fixer?.aiFlags || [],
                credentialStatus: user.fixer?.aiCredentialStatus || "unverified",
                createdAt: user.fixer?.createdAt || user.createdAt,
                priceList: user.fixer?.priceList ?? [],
              };
            }
            
            setPartner(pInfo);
            localStorage.setItem("subscriber", JSON.stringify(pInfo));
            if (Array.isArray(pInfo.priceList) && pInfo.priceList.length > 0) {
              try { localStorage.setItem('cblue_partner_pricelist_general', JSON.stringify(pInfo.priceList)); } catch {}
            }
          }

          const ordersRes = await fetch("/api/v1/orders/fixer", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (ordersRes && ordersRes.ok && isMounted) setOrders(await ordersRes.json());

          const propRes = await fetch("/api/v1/properties/my", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (propRes && propRes.ok && isMounted) {
            const listedProperties = await propRes.json();
            setMyProperties(Array.isArray(listedProperties) ? listedProperties : []);
            setIsLister(Array.isArray(listedProperties) && listedProperties.length > 0);
          } else if (isMounted) {
            setMyProperties([]);
            setIsLister(false);
          }

        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("subscriber_token");
          localStorage.removeItem("subscriber");
          if (isMounted) {
            setPartner(null); setIsFixer(false); setIsLister(false);
          }
        }
      } catch { /* ignore */ }
      if (isMounted) setLoading(false);
    };
        fetchUser();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncPartnerData = async () => {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (!token) return;

        const [ordersRes, propRes] = await Promise.all([
          fetch("/api/v1/orders/fixer", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch("/api/v1/properties/my", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);

        if (ordersRes && ordersRes.ok && isMounted) {
          setOrders(await ordersRes.json());
        }
        if (propRes && propRes.ok && isMounted) {
          const listedProperties = await propRes.json();
          setMyProperties(Array.isArray(listedProperties) ? listedProperties : []);
          setIsLister(Array.isArray(listedProperties) && listedProperties.length > 0);
        }
      } catch {
        // Preserve last visible partner data during transient polling failures.
      }
    };

    void syncPartnerData();
    const timer = setInterval(() => {
      void syncPartnerData();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [partner?.id]);

  // Poll property inquiries addressed to this lister (NOTIFY_SENT = step 4 accept, PAID = step 5-6 chat, MEETING_SENT = step 7 confirm, MEETING_CONFIRMED = step 8 rate)
  useEffect(() => {
    const TIER_FEES: Record<string, number> = { ECONOMY: 100, STANDARD: 400, UPPER: 600, LUXURY: 800, GRANDEUR: 1000 };
    function mapApiInquiry(api: any): PropInquiry {
      const rawImages: any[] = (() => {
        if (Array.isArray(api?.property?.images)) return api.property.images;
        if (typeof api?.property?.images === 'string') {
          const parsed = parseJsonLikeValue(api.property.images);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && typeof parsed === 'object') return [parsed];
          return [];
        }
        if (api?.property?.images && typeof api.property.images === 'object') {
          return [api.property.images];
        }
        return [];
      })();
      const normalizedPropertyImages: string[] = rawImages
        .map((image: any) => normalizeImageUrl(extractImageUrlCandidate(image)))
        .filter((value: string) => Boolean(value));
      const propertyImages: string[] = Array.from(
        new Set(normalizedPropertyImages),
      );
      const createdAtTs = new Date(api?.createdAt || 0).getTime();
      const updatedAtTs = new Date(api?.updatedAt || api?.createdAt || 0).getTime();
      const createdAt = Number.isFinite(createdAtTs) && createdAtTs > 0 ? createdAtTs : Date.now();
      const updatedAt = Number.isFinite(updatedAtTs) && updatedAtTs > 0 ? updatedAtTs : createdAt;
      return {
        id: api.id, poNumber: api.poNumber, propertyId: api.propertyId,
        propertyTitle: api.property?.title || '', propertyTier: api.property?.tier || 'STANDARD',
        propertyFee: TIER_FEES[api.property?.tier || 'STANDARD'] ?? 400,
        propertyType: api.property?.propertyType || '', listingType: api.property?.listingType || '',
        propertyPrice: api.property?.price || 0, province: api.property?.province || '',
        district: api.property?.district || '', subdistrict: api.property?.subdistrict || '',
        addressLine: api.property?.addressLine || '',
        latitude: typeof api.property?.latitude === 'number' ? api.property.latitude : null,
        longitude: typeof api.property?.longitude === 'number' ? api.property.longitude : null,
        area: typeof api.property?.area === 'number' ? api.property.area : null,
        bedrooms: typeof api.property?.bedrooms === 'number' ? api.property.bedrooms : null,
        bathrooms: typeof api.property?.bathrooms === 'number' ? api.property.bathrooms : null,
        propertyImages,
        customerEmail: api.customerEmail,
        customerName: api.customerName, listerName: api.listerName, status: api.status, step: api.step,
        createdAt,
        updatedAt,
        meetingDate: api.meetingDate, meetingTime: api.meetingTime, meetingVenue: api.meetingVenue,
        customerRating: api.customerRating, customerComment: api.customerComment,
        listerRating: api.listerRating, listerComment: api.listerComment, reselectedOnce: api.reselectedOnce,
      };
    }
    async function loadProps() {
      try {
        let token = localStorage.getItem("subscriber_token") || "";
        if (!token) { setPropInquiries([]); return; }
        const load = (authToken: string) => fetch("/api/v1/property-inquiries/lister", { headers: { Authorization: `Bearer ${authToken}` } });
        let res = await load(token);
        if (!res.ok && [401, 403].includes(res.status)) {
          const refreshedToken = await refreshSubscriberSession(token);
          if (refreshedToken) {
            token = refreshedToken;
            res = await load(token);
          }
        }
        if (!res.ok) return;
        const data = await res.json();
        setPropInquiries(Array.isArray(data) ? data.map(mapApiInquiry).filter((p: PropInquiry) => ["NOTIFY_SENT", "ACCEPTED", "PAID", "MEETING_SENT", "MEETING_CONFIRMED", "COMPLETED"].includes(p.status)) : []);
      } catch {
        // Keep the last visible inquiry state during transient failures.
      }
    }
    loadProps();
    const id = setInterval(loadProps, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    for (const inquiry of propInquiries) {
      const status = String(inquiry.status || "").toUpperCase();
      if (["PAID", "MEETING_SENT", "MEETING_CONFIRMED"].includes(status)) {
        ensurePropChatBootstrap(inquiry);
      }
    }
  }, [propInquiries]);

  const updatePropInquiry = async (
    id: string | null | undefined,
    update: Partial<PropInquiry>,
    poNumber?: string | null,
  ) => {
    try {
      let token = localStorage.getItem("subscriber_token") || "";
      const safeId = String(id || '').trim();
      const safePo = String(poNumber || '').trim();
      const usePoFallback = !safeId || safeId.startsWith('fallback-');
      const path =
        usePoFallback && safePo
          ? `/api/v1/property-inquiries/by-po/${encodeURIComponent(safePo)}`
          : safeId
          ? `/api/v1/property-inquiries/${safeId}`
          : '';
      if (!path) return false;

      const updateReq = (authToken: string) => fetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(update),
      });
      let res = await updateReq(token);
      if (!res.ok && [401, 403].includes(res.status)) {
        const refreshedToken = await refreshSubscriberSession(token);
        if (refreshedToken) {
          token = refreshedToken;
          res = await updateReq(token);
        }
      }
      if (res.ok) {
        const updatedFromApi = await res.json().catch(() => null);
        setPropInquiries(prev => prev.map(p => {
          const sameId = !!safeId && p.id === safeId;
          const samePo = !!safePo && p.poNumber === safePo;
          if (!sameId && !samePo) return p;
          return {
            ...p,
            ...update,
            ...(updatedFromApi || {}),
            updatedAt: Date.now(),
          };
        }));
        return true;
      }
      return false;
    } catch {}
    return false;
  };

  const isSubscribed = !!partner;
  const hasPartnerAccess = isFixer || isLister;


  
  const mappedOrders = orders.map(o => {
    const desc = o.description || "";
    let extractedPo = extractPoCode(o);
    if (!extractedPo) {
      const created = new Date(o.createdAt || Date.now());
      const yy = String(created.getFullYear()).slice(-2);
      const mm = String(created.getMonth() + 1).padStart(2, '0');
      const numericSeed = String(o.id || '').replace(/\D/g, '').slice(0, 4) || String(created.getTime()).slice(-4);
      extractedPo = `PO-${yy}${mm}-${numericSeed.padStart(4, '0')}`;
    }
    if (isHiddenTestPo(extractedPo)) return null;
    const attachmentUrls = Array.from(
      new Set(
        [
          ...(Array.isArray(o.images) ? o.images : []),
          ...(Array.isArray(o.attachments) ? o.attachments : []),
          ...(Array.isArray(o.files) ? o.files : []),
          ...(Array.isArray(o.imageUrls) ? o.imageUrls : []),
          ...(Array.isArray(o.projectImages) ? o.projectImages : []),
          ...(Array.isArray(o.metadata?.images) ? o.metadata.images : []),
          ...(Array.isArray(o.metadata?.attachments) ? o.metadata.attachments : []),
          ...(Array.isArray(o.metadata?.files) ? o.metadata.files : []),
          o.issueImage,
          o.image,
          o.fileUrl,
          o.attachmentUrl,
          o.documentUrl,
          o.metadata?.issueImage,
          o.metadata?.issueImageUrl,
        ]
          .flatMap((entry: any) => collectAttachmentUrls(entry))
          .filter(Boolean),
      ),
    );
    const locFromDesc = (() => { const m = String(o.description || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : ''; })();
    const siteLocation = (() => {
      const lat = Number(o?.address?.latitude);
      const lng = Number(o?.address?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
      return (locFromDesc && locFromDesc !== 'Unknown')
        ? locFromDesc
        : (
            normalizeLocationText(o?.address?.subdistrict) ||
            normalizeLocationText(o?.address?.district) ||
            normalizeLocationText(o?.address?.province) ||
            normalizeLocationText(o?.subdistrict) ||
            ""
          );
    })();
    
    return {
      id: o.id,
      orderId: o.id,
      po: extractedPo,
      hasAttachment: attachmentUrls.length > 0,
      images: attachmentUrls,
      issueImage: attachmentUrls[0] || "",
      subdistrict: siteLocation,
      location: siteLocation,
      createdAt: o.createdAt,
      customer: o.user?.name || "Customer",
      orderType: o.orderType?.toLowerCase() || "household",
      phone: o.user?.phone || "",
      service: (o.serviceCategory || "").replace(/_/g, " "),
      serviceTh: (o.serviceCategory || "").replace(/_/g, " "),
      serviceZh: (o.serviceCategory || "").replace(/_/g, " "),
      date: fmtDateTime(o.createdAt),
      description: desc,
      statusNote: o.statusHistory?.[0]?.note || "",
      statusChangedAt: o.statusHistory?.[0]?.createdAt || o.updatedAt || o.createdAt,
      tier: desc.includes('TIER:') ? desc.split('TIER:')[1].split(' |')[0] : "Standard",
      status: o.status,
      progress: o.status === 'COMPLETED' ? 100 : (['IN_PROGRESS', 'CONFIRMED', 'ACCEPTED'].includes(o.status) ? 40 : 15),
      fee: o.estimatedPrice ? `฿${o.estimatedPrice.toLocaleString()}` : "0", 
      budget: o.estimatedPrice ? o.estimatedPrice.toLocaleString() : "0",
      step: 5,
    };
  }).filter(Boolean) as any[];

  
  const properties = myProperties.map(p => ({
    id: p.id,
    type: 'property',
    service: p.title || '',
    serviceTh: p.titleTh || p.title || '',
    serviceZh: p.titleZh || p.title || '',
    description: p.description || '',
    propertyType: p.propertyType || '',
    listingType: p.listingType || '',
    province: normalizeLocationText(p.province || p.address?.province) || "Bangkok",
    district: normalizeLocationText(p.district || p.address?.district),
    location: [normalizeLocationText(p.province || p.address?.province), normalizeLocationText(p.district || p.address?.district)].filter(Boolean).join(', ') || "Bangkok",
    status: p.status,
    fee: p.price ? `฿${p.price.toLocaleString()}` : "N/A",
    price: p.price || 0,
    images: Array.isArray(p.images)
      ? p.images
          .map((img: any) => normalizeImageUrl(typeof img === 'string' ? img : img?.url))
          .filter(Boolean)
      : [],
    createdAt: p.createdAt,
  }));
  const EARNINGS_MOCK = [
    { month: "May 25", monthTh: "พ.ค. 25", monthZh: "5月 25", amount: 18500 },
    { month: "Jun 25", monthTh: "มิ.ย. 25", monthZh: "6月 25", amount: 16000 },
    { month: "Jul 25", monthTh: "ก.ค. 25", monthZh: "7月 25", amount: 20000 },
    { month: "Aug 25", monthTh: "ส.ค. 25", monthZh: "8月 25", amount: 22000 },
    { month: "Sep 25", monthTh: "ก.ย. 25", monthZh: "9月 25", amount: 19500 },
    { month: "Oct 25", monthTh: "ต.ค. 25", monthZh: "10月 25", amount: 23000 },
    { month: "Nov 25", monthTh: "พ.ย. 25", monthZh: "11月 25", amount: 21000 },
    { month: "Dec 25", monthTh: "ธ.ค. 25", monthZh: "12月 25", amount: 18000 },
    { month: "Jan 26", monthTh: "ม.ค. 26", monthZh: "1月 26", amount: 25000 },
    { month: "Feb 26", monthTh: "ก.พ. 26", monthZh: "2月 26", amount: 24000 },
    { month: "Mar 26", monthTh: "มี.ค. 26", monthZh: "3月 26", amount: 26500 },
    { month: "Apr 26", monthTh: "เม.ย. 26", monthZh: "4月 26", amount: 22000 },
    { month: "May 26", monthTh: "พ.ค. 26", monthZh: "5月 26", amount: 26500 },
  ];

  const chats: any[] = [];
  // Use module-level frozen array — avoids re-computing timestamps on remount.
  const staticNotifications = notifications;

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab && ["overview", "requests", "active", "properties", "history", "chat", "notifications", "profile"].includes(tab)) {
        setActiveTab(tab as TabKey);
      }
    } catch {}
  }, []);

  const getPropOrderLabel = (poNumber: string | null | undefined) => {
    const value = String(poNumber || '-');
    if (locale === 'th') return `ออเดอร์: ${value}`;
    if (locale === 'zh') return `订单: ${value}`;
    return `Order: ${value}`;
  };
  const getPropChatRoomTitle = (p: Partial<PropInquiry>) => {
    const title = String(p.propertyTitle || '').trim() || (locale === 'th' ? 'อสังหาริมทรัพย์' : locale === 'zh' ? '房产' : 'Property');
    const listingType = String(p.listingType || '').toUpperCase();
    const listingLabel =
      listingType === 'SALE'
        ? locale === 'th'
          ? 'ขาย'
          : locale === 'zh'
          ? '出售'
          : 'Sale'
        : listingType === 'RENT'
        ? locale === 'th'
          ? 'เช่า'
          : locale === 'zh'
          ? '出租'
          : 'Rent'
        : listingType || '-';
    return `${title} · ${listingLabel} · ${getPropSiteLocation(p as any)} · ${toCurrencyLabel((p as any).propertyPrice)}`;
  };
  const hasCompletionChatMarker = (messages: any[]) =>
    Array.isArray(messages) &&
    messages.some((message: any) => {
      const text = String(message?.text || '').toLowerCase();
      if (!text) return false;
      return (
        text.includes('workflow completed') ||
        text.includes('job is now complete') ||
        text.includes('rated this project')
      );
    });

  const buildChatFeed = () => {
    if (typeof window === "undefined") return [];
    let viewerEmail = "";
    let viewerUserId = "";
    try {
      const sub = JSON.parse(localStorage.getItem("subscriber") || "{}");
      viewerEmail = sub?.email || "";
      viewerUserId = sub?.id || "";
    } catch {}
    const normalizedViewerEmail = String(viewerEmail || "").trim().toLowerCase();
    const normalizedViewerUserId = String(viewerUserId || "").trim().toLowerCase();
    const parseChatSort = (msg: any) => {
      const numericId = Number(String(msg?.id || "").replace(/[^0-9]/g, ""));
      if (Number.isFinite(numericId) && numericId > 0) return numericId;
      const timeTs = new Date(msg?.time || 0).getTime();
      return Number.isFinite(timeTs) ? timeTs : 0;
    };
    const isOwnSender = (sender: any) => {
      const normalizedSender = String(sender || "").trim().toLowerCase();
      if (!normalizedSender) return true;
      if (normalizedSender === normalizedViewerEmail) return true;
      if (normalizedViewerUserId && normalizedSender === normalizedViewerUserId) return true;
      return ["fixer", "partner", "me", "guest", "system"].includes(normalizedSender);
    };
    const isWorkflowSystemMessage = (m: any) => {
      const text = String(m?.text || '').trim().toLowerCase();
      return String(m?.sender || '').trim().toLowerCase() === 'system' && text.startsWith('[system]');
    };
    const isVisibleMessage = (m: any) => {
      if (!m || typeof m.text !== "string") return false;
      if (!m.text.trim()) return false;
      if (m.sender === "system") return isWorkflowSystemMessage(m);
      const lowerText = m.text.toLowerCase();
      if (lowerText.includes("just be paid by customer")) return false;
      if (lowerText.includes("notify to proceed")) return false;
      return true;
    };
    const isIncomingMessage = (m: any) => isVisibleMessage(m) && !isOwnSender(m.sender);
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("chat_messages_"));
    const items: any[] = [];
    const knownPoSet = new Set((mappedOrders as any[]).filter(Boolean).map((o: any) => o.po).filter(Boolean));
    const completedPoSet = new Set((mappedOrders as any[]).filter(Boolean).filter((o: any) => String(o.status || '').toUpperCase() === 'COMPLETED').map((o: any) => o.po).filter(Boolean));
    for (const key of keys) {
      try {
        const po = key.replace("chat_messages_", "");
        // Preserve prop chat rooms — don't delete or skip PRE- PO keys
        if (isPropPoCode(po)) continue;
        if (isHiddenTestPo(po)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`chat_title_${po}`);
          localStorage.removeItem(`chat_from_${po}`);
          continue;
        }
        if (knownPoSet.size > 0 && !knownPoSet.has(po) && !isPropPoCode(po)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`chat_title_${po}`);
          localStorage.removeItem(`chat_from_${po}`);
          continue;
        }
        const historyEntry = mockHistory.find((h: any) => h.po === po);
        const partnerRated = historyEntry?.partnerRating != null;
        if (completedPoSet.has(po) && partnerRated) {
          localStorage.setItem(`chat_closed_${po}`, '1');
          continue;
        }
        if (localStorage.getItem(`chat_closed_${po}`) && partnerRated) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed) || parsed.length === 0) continue;
        if (hasCompletionChatMarker(parsed) && partnerRated) {
          localStorage.setItem(`chat_closed_${po}`, '1');
          continue;
        }
        const reversed = [...parsed].reverse();
        const latestVisible = reversed.find((m: any) => isVisibleMessage(m));
        if (!latestVisible) continue;
        const latestIncoming = reversed.find((m: any) => isIncomingMessage(m));
        const title = localStorage.getItem(`chat_title_${po}`) || `Chat - ${po}`;
        items.push({
          id: po,
          po,
          name: title,
          service: po,
          lastMsg: latestVisible.text,
          time: latestVisible.time || "",
          incomingMsg: latestIncoming?.text || "",
          incomingTime: latestIncoming?.time || "",
          hasIncoming: Boolean(latestIncoming),
          sort: parseChatSort(latestVisible),
          unread: latestIncoming ? 1 : 0,
          online: true,
        });
      } catch {}
    }
    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  const buildPropChatFeed = (): any[] => {
    if (typeof window === "undefined") return [];
    const items: any[] = [];
    let viewerUserId = "";
    try { viewerUserId = String(JSON.parse(localStorage.getItem("subscriber") || "{}")?.id || "").trim(); } catch {}
    // Show chat rooms while inquiry is active: after payment until step 8 completion
    // or max 14 days after meeting confirmation (whichever is earlier).
    const now = Date.now();
    const isChatOpen = (p: PropInquiry) => {
      const status = String(p.status || "").toUpperCase();
      if (status === "COMPLETED") return false;
      if (status === "PAID" || status === "MEETING_SENT") return true;
      if (status !== "MEETING_CONFIRMED") return false;

      if (p.customerRating != null && p.listerRating != null) {
        return false;
      }

      if (p.meetingDate) {
        const meetingAt = new Date(`${p.meetingDate}T${p.meetingTime || '00:00'}`).getTime();
        if (Number.isFinite(meetingAt) && meetingAt > 0) {
          const chatExpiresAt = meetingAt + 14 * 24 * 60 * 60 * 1000;
          if (now >= chatExpiresAt) return false;
        }
      }

      return true;
    };

    const activePropPOs = propInquiries
      .filter((p: PropInquiry) => isChatOpen(p))
      .map((p: PropInquiry) => p.poNumber);
    for (const po of activePropPOs) {
      try {
        const key = `chat_messages_${po}`;
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed) || parsed.length === 0) continue;
        const reversed = [...parsed].reverse();
        const last = reversed.find((m: any) => m?.text?.trim());
        if (!last) continue;
        const inq = propInquiries.find((p: PropInquiry) => p.poNumber === po);
        const incomingMsg = reversed.find((m: any) => {
          const text = String(m?.text || '').trim();
          if (!text) return false;
          const sender = String(m?.sender || '').trim().toLowerCase();
          if (sender === 'system') return false;
          const senderUserId = String(m?.senderUserId || m?.sender || '').trim();
          if (viewerUserId && senderUserId && senderUserId === viewerUserId) return false;
          return true;
        });
        const sortTs = (() => {
          const ts = new Date(last?.createdAt || last?.time || 0).getTime();
          return Number.isFinite(ts) && ts > 0 ? ts : Date.now();
        })();
        items.push({
          id: po, po,
          name: inq ? getPropChatRoomTitle(inq) : `Property Chat - ${po}`,
          lastMsg: last.text,
          time: last.time || "",
          incomingMsg: incomingMsg?.text || "",
          hasIncoming: Boolean(incomingMsg),
          sort: sortTs,
          isPropChat: true,
        });
      } catch {}
    }
    return items;
  };

  const buildBackendChatFeed = async () => {
    if (typeof window === "undefined") return [];
    const token = localStorage.getItem("subscriber_token") || "";
    if (!token) return [];

    // Use user entity ID (from subscriber) to correctly identify own messages
    let viewerUserId = "";
    try { viewerUserId = JSON.parse(localStorage.getItem("subscriber") || "{}")?.id || ""; } catch {}
    const items: any[] = [];
    const chatOpenStatuses = new Set(["IN_PROGRESS", "MEETING_REQUESTED", "COMPLETED"]);

    for (const order of (orders || [])) {
      const orderId = order?.id;
      if (!orderId) continue;

      const po = extractPoCode(order);
      if (!po || !isPoCode(po)) continue;

      if (localStorage.getItem(`chat_closed_${po}`)) continue;

      const status = String(order?.status || "").toUpperCase();
      const hasLocalChatCache = Boolean(localStorage.getItem(`chat_messages_${po}`));
      if (!chatOpenStatuses.has(status) && !hasLocalChatCache) continue;

      try {
        const res = await fetch(`/api/v1/orders/${orderId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const messages = await res.json();
        if (!Array.isArray(messages) || messages.length === 0) continue;

        // Skip closed chat rooms (job completed/rated)
        if (localStorage.getItem(`chat_closed_${po}`)) continue;

        // Cache PO→UUID so ClientChatPage.resolveOrderDbId() works in Suppadesh's browser
        try { localStorage.setItem(`po_to_order_${po}`, orderId); } catch {}

        const visible = messages.filter((m: any) => {
          const text = String(m?.text || "").trim();
          if (!text) return false;
          const lowerText = text.toLowerCase();
          if (lowerText.includes("just be paid by customer")) return false;
          if (lowerText.includes("notify to proceed")) return false;
          return true;
        });
        if (visible.length === 0) continue;
        const hasCustomerCompleteNotice = visible.some((m: any) =>
          String(m?.text || '').toLowerCase().includes('customer confirmed job complete'),
        );
        const workflowClosed = ['COMPLETED', 'CANCELLED', 'DONE'].includes(String(order?.status || '').toUpperCase());
        if ((workflowClosed && !hasCustomerCompleteNotice) || hasCompletionChatMarker(visible)) {
          try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
          continue;
        }

        try {
          const cached = JSON.parse(localStorage.getItem(`chat_messages_${po}`) || '[]');
          const cachedRows = Array.isArray(cached) ? cached : [];
          const mergedByText = new Map<string, any>();
          for (const row of [...cachedRows, ...visible.map((m: any) => ({
            id: m?.id || `backend-${po}-${m?.createdAt || Date.now()}`,
            sender: 'system',
            senderUserId: m?.senderUserId || '',
            text: String(m?.text || '').trim(),
            createdAt: new Date(m?.createdAt || Date.now()).getTime(),
            time: m?.createdAt ? fmtDateTime(m.createdAt) : '',
          }))]) {
            const text = String(row?.text || '').trim();
            if (!text) continue;
            mergedByText.set(text, row);
          }
          localStorage.setItem(`chat_messages_${po}`, JSON.stringify(Array.from(mergedByText.values()).sort((a: any, b: any) => Number(a.createdAt || 0) - Number(b.createdAt || 0))));
        } catch {
          // Non-blocking cache sync.
        }

        const latestVisible = visible[visible.length - 1];
        const incoming = [...visible].reverse().find((m: any) => {
          const text = String(m?.text || '').trim().toLowerCase();
          if (text.startsWith('[system]')) return false;
          return String(m?.senderUserId || "") !== viewerUserId;
        });
        const title =
          localStorage.getItem(`chat_title_${po}`) ||
          `${String(order?.serviceCategory || "Service").replace(/_/g, " ")} - ${po} - ${order?.estimatedPrice ? `฿${Number(order.estimatedPrice).toLocaleString()}` : "฿0"}`;

        items.push({
          id: po,
          po,
          name: title,
          service: po,
          lastMsg: String(latestVisible?.text || ""),
          time: latestVisible?.createdAt ? fmtDateTime(latestVisible.createdAt) : "",
          incomingMsg: incoming ? String(incoming?.text || "") : "",
          incomingTime: incoming?.createdAt ? fmtDateTime(incoming.createdAt) : "",
          hasIncoming: Boolean(incoming),
          sort: latestVisible?.createdAt ? new Date(latestVisible.createdAt).getTime() : 0,
          unread: incoming ? 1 : 0,
          online: true,
          source: "backend",
        });
      } catch {
        // Ignore per-order failures and continue.
      }
    }

    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  const buildPropBackendChatFeed = async () => {
    if (typeof window === 'undefined') return [];
    const token = localStorage.getItem('subscriber_token') || '';
    if (!token) return [];

    const viewerUserId = String(partner?.id || '').trim();
    const now = Date.now();
    const isChatOpen = (p: PropInquiry) => {
      const status = String(p.status || '').toUpperCase();
      if (status === 'COMPLETED') return false;
      if (status === 'PAID' || status === 'MEETING_SENT') return true;
      if (status !== 'MEETING_CONFIRMED') return false;
      if (p.customerRating != null && p.listerRating != null) return false;
      if (p.meetingDate) {
        const meetingAt = new Date(`${p.meetingDate}T${p.meetingTime || '00:00'}`).getTime();
        if (Number.isFinite(meetingAt) && meetingAt > 0) {
          const chatExpiresAt = meetingAt + 14 * 24 * 60 * 60 * 1000;
          if (now >= chatExpiresAt) return false;
        }
      }
      return true;
    };

    const items: any[] = [];
    const activeInquiries = propInquiries.filter((p: PropInquiry) => isChatOpen(p));
    for (const inquiry of activeInquiries) {
      const po = inquiry.poNumber;
      if (!po) continue;

      try {
        const res = await fetch(`/api/v1/property-inquiries/by-po/${encodeURIComponent(po)}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const mapped = rows
          .map((row: any) => ({
            id: row?.id || `${po}-${Date.now()}`,
            sender: row?.senderUserId || 'system',
            senderUserId: row?.senderUserId || '',
            senderName: row?.senderName || '',
            text: String(row?.text || '').trim(),
            createdAt: row?.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
            time: row?.createdAt ? fmtDateTime(row.createdAt) : '',
          }))
          .filter((msg: any) => msg.text);

        if (mapped.length === 0) continue;

        try {
          localStorage.setItem(`chat_messages_${po}`, JSON.stringify(mapped));
          if (!localStorage.getItem(`chat_title_${po}`)) {
            localStorage.setItem(`chat_title_${po}`, getPropChatRoomTitle(inquiry));
          }
        } catch {
          // Non-blocking cache write.
        }

        const latest = mapped[mapped.length - 1];
        const incoming = [...mapped]
          .reverse()
          .find((msg: any) => !viewerUserId || String(msg.senderUserId || msg.sender || '') !== viewerUserId);

        items.push({
          id: po,
          po,
          name: getPropChatRoomTitle(inquiry),
          service: po,
          lastMsg: latest?.text || '',
          time: latest?.time || '',
          incomingMsg: incoming?.text || '',
          incomingTime: incoming?.time || '',
          hasIncoming: Boolean(incoming),
          sort: Number(latest?.createdAt || 0),
          unread: incoming ? 1 : 0,
          online: true,
          source: 'prop-backend',
          isPropChat: true,
        });
      } catch {
        // Keep local fallback when backend property chat cannot be fetched.
      }
    }

    items.sort((a, b) => Number(b.sort || 0) - Number(a.sort || 0));
    return items;
  };

  useEffect(() => {
    let isMounted = true;
    const syncChats = async () => {
      const localItems = buildChatFeed();
      const propChatItems = buildPropChatFeed();
      const propBackendItems = await buildPropBackendChatFeed();
      const backendItems = await buildBackendChatFeed();
      const merged = new Map<string, any>();
      for (const item of propChatItems) merged.set(item.po, item);
      for (const item of localItems) merged.set(item.po, item);
      for (const item of propBackendItems) merged.set(item.po, item);
      for (const item of backendItems) merged.set(item.po, item);
      const mergedList = Array.from(merged.values()).sort((a: any, b: any) => Number(b.sort || 0) - Number(a.sort || 0));
      if (isMounted) setChatFeed(mergedList);
    };

    void syncChats();

    const syncEvent = () => {
      void syncChats();
    };

    window.addEventListener("storage", syncEvent);
    window.addEventListener("cblue-chat-updated", syncEvent as EventListener);
    const timer = setInterval(() => {
      void syncChats();
    }, 5000);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncEvent);
      window.removeEventListener("cblue-chat-updated", syncEvent as EventListener);
      clearInterval(timer);
    };
  }, [orders, partner?.id, propInquiries]);

  const [mockDynReqs, setMockDynReqs] = useState<any[]>([]);
  const [mockActiveState, setMockActiveState] = useState<any[]>([]);
  const [partnerDynReqs, setPartnerDynReqs] = useState<any[]>([]);
  const [partnerPersistedAlerts, setPartnerPersistedAlerts] = useState<any[]>([]);
  const [partnerDeclineLogs, setPartnerDeclineLogs] = useState<any[]>([]);
  const [mockHistory, setMockHistory] = useState<any[]>([]);
  useEffect(() => {
    const checkMock = () => {
      try {
        const d = localStorage.getItem("ghis_mock_dyn_req"); if (d) setMockDynReqs(filterVisibleWorkflowItems(JSON.parse(d)));
        const a = localStorage.getItem("ghis_mock_active"); if (a) setMockActiveState(filterVisibleWorkflowItems(JSON.parse(a)));
        const h = localStorage.getItem("ghis_mock_history"); if (h) setMockHistory(filterVisibleWorkflowItems(JSON.parse(h)));
        const persistedAlerts = localStorage.getItem('partner_alerts');
        setPartnerPersistedAlerts(persistedAlerts ? JSON.parse(persistedAlerts) : []);
        const declineLogs = localStorage.getItem('admin_decline_logs');
        setPartnerDeclineLogs(declineLogs ? JSON.parse(declineLogs) : []);
        const p = localStorage.getItem("partner_mock_dyn_req");
        let partnerReqs: any[] = p
          ? filterVisibleWorkflowItems(JSON.parse(p)).map((item: any) => ({
              ...item,
              workflowType:
                item?.workflowType ||
                (['variation_partner', 'complete_partner', 'rate_partner'].includes(item?.type) ? item.type : undefined),
            }))
          : [];
        // Auto-sync: meeting_pending_partner in ghis_mock_dyn_req → meeting_confirm_partner in partner reqs
        if (d) {
          const ghisReqs: any[] = filterVisibleWorkflowItems(JSON.parse(d));
          const pendingMeetings = ghisReqs.filter((r: any) => r.type === 'meeting_pending_partner');
          let partnerChanged = false;
          for (const pending of pendingMeetings) {
            const alreadyHasMeetingConfirm = partnerReqs.some((r: any) => r.po === pending.po && r.type === 'meeting_confirm_partner');
            const alreadyAdvanced = partnerReqs.some((r: any) => r.po === pending.po && (r.type === 'variation_partner' || r.type === 'complete_partner' || r.type === 'rate_partner'));
            if (!alreadyHasMeetingConfirm && !alreadyAdvanced) {
              partnerReqs = [
                ...partnerReqs.filter((r: any) => !(r.po === pending.po && r.type === 'meeting_confirm_partner')),
                {
                  id: `meeting-confirm-${pending.po}`,
                  po: pending.po,
                  service: pending.title,
                  serviceTh: pending.title,
                  serviceZh: pending.title,
                  customer: pending.customer,
                  date: pending.date,
                  createdAt: pending.createdAt || Date.now(),
                  fee: pending.budget,
                  budget: String(pending.budget || '').replace(/[^0-9]/g, ''),
                  tier: pending.tier,
                  desc: pending.desc,
                  description: pending.description || pending.desc || '',
                  hasAttachment: Boolean(pending.hasAttachment),
                  images: Array.isArray(pending.images) ? pending.images : [],
                  attachments: Array.isArray(pending.attachments) ? pending.attachments : [],
                  imageUrls: Array.isArray(pending.imageUrls) ? pending.imageUrls : [],
                  issueImage: pending.issueImage || '',
                  meetingDate: pending.meetingDate,
                  meetingTime: pending.meetingTime,
                  meetingDateLabel: pending.meetingDate || '',
                  meetingTimeLabel: pending.meetingTime || '',
                  meetingVenue: pending.venue || pending.meetingVenue || '',
                  meetingMessage: pending.meetingNote || pending.desc || '',
                  location: pending.location || '',
                  type: 'meeting_confirm_partner',
                  workflowType: 'meeting_confirm_partner',
                  step: 8,
                },
              ];
              partnerChanged = true;
            }
          }
          if (partnerChanged) {
            try { localStorage.setItem('partner_mock_dyn_req', JSON.stringify(partnerReqs)); } catch {}
          }
        }
        // Hourly reminder for pending_accept items: refresh notifyAt so alert badge appears fresh
        const nowMs = Date.now();
        let hourlyChanged = false;
        partnerReqs = partnerReqs.map((r: any) => {
          if (r.type === 'pending_accept') {
            const lastNotify = r.notifyAt || r.createdAt || 0;
            if (nowMs - lastNotify >= 60 * 60 * 1000) {
              hourlyChanged = true;
              return { ...r, notifyAt: nowMs, date: fmtDateTime(nowMs), createdAt: r.createdAt || nowMs };
            }
          }
          return r;
        });
        if (hourlyChanged) {
          try { localStorage.setItem('partner_mock_dyn_req', JSON.stringify(partnerReqs)); } catch {}
        }

        try {
          const poAttachmentMap = JSON.parse(localStorage.getItem('cblue_po_attachments') || '{}');
          partnerReqs = partnerReqs.map((req: any) => {
            const existingUrls = Array.from(
              new Set(
                [
                  req?.issueImage,
                  req?.image,
                  req?.fileUrl,
                  req?.attachmentUrl,
                  req?.documentUrl,
                  ...(Array.isArray(req?.images) ? req.images : []),
                  ...(Array.isArray(req?.attachments) ? req.attachments : []),
                  ...(Array.isArray(req?.files) ? req.files : []),
                  ...(Array.isArray(req?.imageUrls) ? req.imageUrls : []),
                  ...(Array.isArray(req?.metadata?.images) ? req.metadata.images : []),
                  ...(Array.isArray(req?.metadata?.attachments) ? req.metadata.attachments : []),
                  ...(Array.isArray(req?.metadata?.files) ? req.metadata.files : []),
                  req?.metadata?.issueImage,
                  req?.metadata?.issueImageUrl,
                ]
                  .flatMap((entry) => collectAttachmentUrls(entry))
                  .filter(Boolean),
              ),
            );
            if (existingUrls.length > 0 || !req?.po) return req;

            const poFallbackUrls = Array.from(
              new Set(
                Object.entries(poAttachmentMap || {})
                  .filter(([cachedPo]) => normalizePoLookupValue(cachedPo) === normalizePoLookupValue(req.po))
                  .flatMap(([, value]) => collectAttachmentUrls(value))
                  .filter(Boolean),
              ),
            );

            if (poFallbackUrls.length === 0) return req;
            return {
              ...req,
              hasAttachment: true,
              images: poFallbackUrls,
              attachments: poFallbackUrls,
              imageUrls: poFallbackUrls,
              issueImage: poFallbackUrls[0] || req?.issueImage || '',
            };
          });
        } catch {
          // non-blocking
        }

        const beforeStaleCleanup = partnerReqs.length;
        partnerReqs = partnerReqs.filter((req: any) => {
          const type = String(req?.workflowType || req?.type || '');
          if (type !== 'meeting_confirm_partner') return true;
          const meetingTs = parseMeetingDateTimeMs(req.meetingDate || req.meetingDateLabel, req.meetingTime || req.meetingTimeLabel);
          return !(meetingTs > 0 && meetingTs < Date.now() - 3 * 24 * 60 * 60 * 1000);
        });
        if (partnerReqs.length !== beforeStaleCleanup) {
          try { localStorage.setItem('partner_mock_dyn_req', JSON.stringify(partnerReqs)); } catch {}
        }

        setPartnerDynReqs(partnerReqs);
      } catch {}
    };
    checkMock();
    const onWorkflowUpdated = () => checkMock();
    window.addEventListener('storage', checkMock);
    window.addEventListener('cblue-workflow-updated', onWorkflowUpdated as EventListener);
    const interval = setInterval(checkMock, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkMock);
      window.removeEventListener('cblue-workflow-updated', onWorkflowUpdated as EventListener);
    };
  }, []);

  const completedHistoryPos = new Set(mockHistory.map((h: any) => h.po));
  const declinedPartnerPos = new Set<string>();
  mockHistory.forEach((entry: any) => {
    const po = String(entry?.po || '').trim();
    const status = String(entry?.status || '').toUpperCase();
    if (po && ['CANCELLED', 'DECLINED'].includes(status)) declinedPartnerPos.add(po);
  });
  partnerDeclineLogs.forEach((entry: any) => {
    const po = String(entry?.po || '').trim();
    if (po) declinedPartnerPos.add(po);
  });
  const variationWaitingCustomerPos = new Set(
    mockDynReqs.filter((r: any) => r.type === 'variation_pending').map((r: any) => String(r.po || '').trim()).filter(Boolean),
  );
  const completeWaitingCustomerPos = new Set(
    mockDynReqs.filter((r: any) => r.type === 'complete_pending').map((r: any) => String(r.po || '').trim()).filter(Boolean),
  );
  const parseWorkflowStep = (value: any) => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    const text = String(value ?? '').trim();
    if (!text) return 0;
    const direct = Number(text);
    if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
    const match = text.match(/step\s*(\d+)|^(\d+)/i);
    const extracted = Number(match?.[1] || match?.[2] || 0);
    return Number.isFinite(extracted) ? Math.max(0, Math.floor(extracted)) : 0;
  };
  const isPartnerSidePropCompleted = (p: Partial<PropInquiry>) => {
    const status = String(p.status || '').toUpperCase();
    if (status === 'COMPLETED') return true;
    return status === 'MEETING_CONFIRMED' && p.listerRating != null;
  };
  const partnerSideCompletedPropPos = new Set(
    propInquiries
      .filter((p: PropInquiry) => isPartnerSidePropCompleted(p))
      .map((p: PropInquiry) => String(p.poNumber || '').trim())
      .filter((po: string) => isPropPoCode(po)),
  );
  let activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status) && !completedHistoryPos.has(o.po) && !declinedPartnerPos.has(o.po) && !partnerSideCompletedPropPos.has(String(o.po || '').trim()));
  activeJobs = activeJobs.map(job => {
      const stepLookup = mockActiveState.find((x: any) => x.po === job.po);
      const backendStep = getWorkflowStepFromStatus(job.status);
      const partnerWorkflowStep = Math.max(0, ...partnerDynReqs.filter((x: any) => x.po === job.po).map((x: any) => parseWorkflowStep(x.step)));
      const localSubmittedStep = getPartnerPinnedWorkflowStep(job.po);
      const waitingCustomerStep =
        completeWaitingCustomerPos.has(job.po) ? 10 :
        variationWaitingCustomerPos.has(job.po) ? 9 : 0;
      const step = Math.max(parseWorkflowStep(stepLookup?.step), backendStep, partnerWorkflowStep, localSubmittedStep, waitingCustomerStep);
      // For partner view: actionNeeded = partner has a pending workflow request OR backend requires partner action
      // Exclude accept_sent which is a permanent marker, not an action item
      const hasPartnerDynAction = partnerDynReqs.some((r: any) => r.po === job.po && r.type !== 'accept_sent');
      const partnerActionNeeded = hasPartnerDynAction ||
        String(job.status || '').toUpperCase() === 'MEETING_REQUESTED' ||
        backendStep === 5;
      return { ...job, step, mockStep: step, actionNeeded: partnerActionNeeded };
  });
  const mapPropStatusToStep = (status: string, step: number) => {
    const explicitStep = parseWorkflowStep(step);
    const normalizedStatus = String(status || '').toUpperCase();
    switch (normalizedStatus) {
      case 'ACCEPTED':
      case 'NOTIFY_SENT':
        return Math.max(explicitStep, 4);
      case 'PAID':
        return Math.max(explicitStep, 5);
      case 'MEETING_SENT':
        return Math.max(explicitStep, 7);
      case 'MEETING_CONFIRMED':
        return Math.max(explicitStep, 8);
      default:
        return explicitStep > 0 ? explicitStep : 5;
    }
  };
  const normalizePropInquiryStatus = (statusValue: any, fallbackStep: number) => {
    const normalized = String(statusValue || '').toUpperCase();
    if (['NOTIFY_SENT', 'ACCEPTED', 'PAID', 'MEETING_SENT', 'MEETING_CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED'].includes(normalized)) {
      return normalized;
    }
    if (fallbackStep >= 8) return 'MEETING_CONFIRMED';
    if (fallbackStep >= 7) return 'MEETING_SENT';
    if (fallbackStep >= 5) return 'ACCEPTED';
    return 'NOTIFY_SENT';
  };
  const propActiveJobs = propInquiries
    .filter((p: PropInquiry) => {
      if (isPartnerSidePropCompleted(p)) return false;
      return ['NOTIFY_SENT', 'ACCEPTED', 'PAID', 'MEETING_SENT', 'MEETING_CONFIRMED'].includes(String(p.status || '').toUpperCase());
    })
    .map((p: PropInquiry) => {
      const status = String(p.status || '').toUpperCase();
      const step = mapPropStatusToStep(status, p.step);
      const pendingPartnerRating = p.listerRating == null && step >= 8 && !['COMPLETED', 'CANCELLED'].includes(status);
      const actionNeeded = status === 'NOTIFY_SENT' || status === 'MEETING_SENT' || pendingPartnerRating;
      const siteLocation = getPropSiteLocation(p);
      const propertyFacts = [
        p.propertyType ? `Type: ${p.propertyType}` : '',
        p.listingType ? `Listing: ${p.listingType}` : '',
        typeof p.area === 'number' && p.area > 0 ? `Area: ${Number(p.area).toLocaleString()} sq.m.` : '',
        typeof p.bedrooms === 'number' ? `Beds: ${p.bedrooms}` : '',
        typeof p.bathrooms === 'number' ? `Baths: ${p.bathrooms}` : '',
      ].filter(Boolean).join(' | ');
      return {
        id: `prop-active-${p.id}`,
        orderId: p.id,
        po: p.poNumber,
        service: p.propertyTitle || 'Property Inquiry',
        serviceTh: p.propertyTitle || 'คำขออสังหาริมทรัพย์',
        serviceZh: p.propertyTitle || '房产咨询',
        customer: firstNameOnly(p.customerName, 'Customer'),
        date: fmtDateTime(p.updatedAt || p.createdAt || Date.now()),
        createdAt: p.updatedAt || p.createdAt || Date.now(),
        budget: toCurrencyLabel(p.propertyPrice),
        value: toCurrencyLabel(p.propertyPrice),
        fee: toCurrencyLabel(p.propertyFee),
        tier: p.propertyTier || 'STANDARD',
        listingType: p.listingType || '',
        location: siteLocation,
        subdistrict: p.subdistrict || p.district || p.province || '',
        status,
        step,
        mockStep: step,
        actionNeeded,
        actionNeededDetail:
          status === 'NOTIFY_SENT'
            ? 'Accept this property inquiry request.'
            : status === 'MEETING_SENT'
            ? 'Confirm the customer meeting invitation.'
            : pendingPartnerRating
            ? 'Submit rating to close step 8.'
            : '',
        description: propertyFacts,
        propertyImages: p.propertyImages || [],
        isPropertyJob: true,
      };
    });
  const toJobSortTs = (value: any) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numeric = Number(value);
      if (!Number.isNaN(numeric) && Number.isFinite(numeric)) return numeric;
      const asDate = new Date(value).getTime();
      return Number.isNaN(asDate) ? 0 : asDate;
    }
    return 0;
  };
  const mergedActiveJobs = new Map<string, any>();
  [...activeJobs, ...propActiveJobs].forEach((job: any) => {
    const key = String(job?.po || job?.id || '').trim();
    if (!key || isHiddenTestPo(key)) return;
    const existing = mergedActiveJobs.get(key);
    if (!existing) {
      mergedActiveJobs.set(key, job);
      return;
    }
    const existingIsProperty = Boolean(existing?.isPropertyJob) || String(existing?.type || '').startsWith('prop_') || isPropPoCode(existing?.po || existing?.id || '');
    const nextIsProperty = Boolean(job?.isPropertyJob) || String(job?.type || '').startsWith('prop_') || isPropPoCode(job?.po || job?.id || '');
    const keyIsPropertyPo = isPropPoCode(key);

    if (keyIsPropertyPo && nextIsProperty && !existingIsProperty) {
      mergedActiveJobs.set(key, { ...existing, ...job, isPropertyJob: true });
      return;
    }
    if (keyIsPropertyPo && existingIsProperty && !nextIsProperty) {
      return;
    }

    const existingStep = Number(existing.step || 0);
    const nextStep = Number(job.step || 0);
    const existingTs = toJobSortTs(existing.createdAt || existing.date);
    const nextTs = toJobSortTs(job.createdAt || job.date);
    if (nextStep > existingStep || (nextStep === existingStep && nextTs >= existingTs)) {
      mergedActiveJobs.set(key, { ...existing, ...job, isPropertyJob: existingIsProperty || nextIsProperty });
    }
  });
  activeJobs = Array.from(mergedActiveJobs.values()).sort((a: any, b: any) => {
    const aTs = toJobSortTs(a.createdAt || a.date);
    const bTs = toJobSortTs(b.createdAt || b.date);
    return bTs - aTs;
  });
  const backendCompletedJobs = mappedOrders.filter((o: any) => ['COMPLETED', 'CANCELLED'].includes(String(o.status || '').toUpperCase()));
  const declineReasonByPo = new Map(
    partnerDeclineLogs
      .filter((entry: any) => String(entry?.po || '').trim())
      .map((entry: any) => [String(entry.po).trim(), String(entry.comment || '').trim()]),
  );
  // Merge localStorage history (same-browser simulation) with backend completed/cancelled orders.
  const completedJobs = Array.from(
    [...backendCompletedJobs, ...mockHistory.filter((h: any) => h.po)].reduce((map: Map<string, any>, entry: any) => {
      const po = entry.po || entry.id;
      if (!po || isHiddenTestPo(po)) return map;
      const existing = map.get(po) || {};
      const service = entry.service || entry.title || existing.service || po;
      const customer = firstNameOnly(entry.customer || entry.customerName || entry.fixerAlias || existing.customer, 'Customer');
      const completedAt = entry.completedAt || entry.statusChangedAt || entry.updatedAt || entry.createdAt || entry.date || existing.completedAt || existing.statusChangedAt || existing.createdAt || Date.now();
      const description = stripWorkflowPrefix(entry.description || entry.desc || existing.description || existing.projectDetails || '');
      map.set(po, {
        ...existing,
        ...entry,
        id: existing.id || entry.id || po,
        po,
        service,
        serviceTh: entry.serviceTh || existing.serviceTh || service,
        serviceZh: entry.serviceZh || existing.serviceZh || service,
        customer,
        customerName: customer,
        counterpartName: customer,
        date: fmtDateTime(completedAt),
        createdAt: existing.createdAt || entry.createdAt || completedAt,
        completedAt,
        statusChangedAt: entry.statusChangedAt || existing.statusChangedAt || completedAt,
        budget: entry.budget || existing.budget || toCurrencyLabel(entry.fee || existing.fee),
        fee: toCurrencyLabel(entry.fee || entry.budget || existing.fee || existing.budget),
        tier: entry.tier || existing.tier || 'Standard',
        status: entry.status || existing.status || 'COMPLETED',
        statusNote: entry.statusNote || entry.statusHistory?.[0]?.note || existing.statusNote || '',
        declineReason: declineReasonByPo.get(String(po).trim()) || existing.declineReason || '',
        step: 11,
        stepName: getWorkflowStepName(11),
        location: entry.location || entry.subdistrict || existing.location || existing.subdistrict || '',
        subdistrict: entry.subdistrict || entry.location || existing.subdistrict || existing.location || '',
        projectDetails: description,
        description: description || existing.description || '',
        chatHistory: getLocalChatHistory(po),
        partnerRating: entry.partnerRating ?? existing.partnerRating,
      });
      return map;
    }, new Map<string, any>()).values(),
  ).sort((a: any, b: any) => {
    const aTs = new Date(a.statusChangedAt || a.completedAt || a.createdAt || a.date || 0).getTime();
    const bTs = new Date(b.statusChangedAt || b.completedAt || b.createdAt || b.date || 0).getTime();
    return bTs - aTs;
  });
  const propCompletedJobs = propInquiries
    .filter((p: PropInquiry) => isPartnerSidePropCompleted(p))
    .map((p: PropInquiry) => {
      const completedAt = p.updatedAt || p.createdAt || Date.now();
      const siteLocation = getPropSiteLocation(p);
      return {
        id: `prop-completed-${p.id}`,
        po: p.poNumber,
        service: p.propertyTitle || 'Property Inquiry',
        serviceTh: p.propertyTitle || 'คำขออสังหาริมทรัพย์',
        serviceZh: p.propertyTitle || '房产咨询',
        customer: firstNameOnly(p.customerName, 'Customer'),
        customerName: firstNameOnly(p.customerName, 'Customer'),
        counterpartName: firstNameOnly(p.customerName, 'Customer'),
        date: fmtDateTime(completedAt),
        createdAt: p.createdAt || completedAt,
        completedAt,
        statusChangedAt: completedAt,
        budget: toCurrencyLabel(p.propertyPrice),
        fee: toCurrencyLabel(p.propertyFee),
        tier: p.propertyTier || 'STANDARD',
        status: 'COMPLETED',
        step: 8,
        stepName: 'Property Inquiry Completed',
        location: siteLocation,
        subdistrict: siteLocation,
        projectDetails: `Property: ${p.propertyTitle || p.poNumber} | Site: ${siteLocation} | Meeting: ${p.meetingDate || '-'} ${p.meetingTime || ''} @ ${p.meetingVenue || '-'}`,
        description: `Customer rating: ${p.customerRating ?? '-'} | Lister rating: ${p.listerRating ?? '-'} | ${getPropOrderLabel(p.poNumber)}`,
        chatHistory: getLocalChatHistory(p.poNumber),
        partnerRating: p.listerRating,
      };
    });
  const allCompletedJobs = Array.from(
    [...completedJobs, ...propCompletedJobs].reduce((map: Map<string, any>, entry: any) => {
      const key = String(entry?.po || entry?.id || '').trim();
      if (!key || isHiddenTestPo(key)) return map;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, entry);
        return map;
      }
      const existingTs = new Date(existing.statusChangedAt || existing.completedAt || existing.createdAt || existing.date || 0).getTime();
      const nextTs = new Date(entry.statusChangedAt || entry.completedAt || entry.createdAt || entry.date || 0).getTime();
      if (nextTs >= existingTs) {
        map.set(key, { ...existing, ...entry });
      }
      return map;
    }, new Map<string, any>()).values(),
  ).sort((a: any, b: any) => {
    const aTs = new Date(a.statusChangedAt || a.completedAt || a.createdAt || a.date || 0).getTime();
    const bTs = new Date(b.statusChangedAt || b.completedAt || b.createdAt || b.date || 0).getTime();
    return bTs - aTs;
  });
  const earningsSeries = (() => {
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const seedByMonth = Object.fromEntries(EARNINGS_MOCK.map((item) => {
      const [monthLabel = 'Jan', yearLabel = '26'] = item.month.split(' ');
      const monthNumber = enMonths.indexOf(monthLabel) + 1;
      return [
        `20${yearLabel}-${String(monthNumber > 0 ? monthNumber : 1).padStart(2, '0')}`,
        item.amount,
      ];
    }));
    const completedByMonth = new Map<string, number>();

    for (const job of (allCompletedJobs as any[])) {
      const ts = new Date((job as any).statusChangedAt || (job as any).createdAt || (job as any).date || 0).getTime();
      if (!ts) continue;
      const dt = new Date(ts);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(String(job.budget || job.fee || '0').replace(/[^0-9.]/g, '')) || 0;
      completedByMonth.set(key, (completedByMonth.get(key) || 0) + amount);
    }

    const now = new Date();
    const items: any[] = [];
    for (let offset = 12; offset >= 0; offset -= 1) {
      const dt = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthIdx = dt.getMonth();
      const yy = String(dt.getFullYear()).slice(-2);
      items.push({
        month: `${enMonths[monthIdx]} ${yy}`,
        monthTh: `${thMonths[monthIdx]} ${yy}`,
        monthZh: `${monthIdx + 1}月 ${yy}`,
        amount: completedByMonth.size > 0 ? (completedByMonth.get(key) || 0) : (seedByMonth[key] || 0),
      });
    }
    return items;
  })();
  const stats = {
    activeJobs: activeJobs.length,
    completedJobs: allCompletedJobs.length,
    monthlyEarnings: `฿${(earningsSeries[earningsSeries.length - 1]?.amount || 0).toLocaleString()}`,
    rating: 0,
    responseRate: '0%',
    repeatClients: 0,
  };
    const acceptedPos = new Set([
      ...mockActiveState.filter((x: any) => Number(x.step || 0) >= 6).map((x: any) => x.po),
      ...partnerDynReqs.filter((r: any) => r.type === 'accept_sent').map((r: any) => r.po),
    ]);
    // MEETING_REQUESTED always shows for partner to confirm, regardless of mock step state
    let incomingJobs = mappedOrders.filter(o =>
      !completedHistoryPos.has(o.po) &&
      !declinedPartnerPos.has(o.po) &&
      (
        (['CREATED', 'PENDING', 'MATCHING'].includes(o.status) && !acceptedPos.has(o.po)) ||
        o.status === 'MEETING_REQUESTED'
      )
    );

  const parseTs = (v: any) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const raw = v.trim();
      if (/^\d+$/.test(raw)) {
        const numeric = Number(raw);
        return Number.isFinite(numeric) ? numeric : 0;
      }
      const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
      if (ddmmyyyy) {
        const [, day, month, year, hour = '00', minute = '00'] = ddmmyyyy;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      }
      const asDate = new Date(raw).getTime();
      return Number.isNaN(asDate) ? 0 : asDate;
    }
    return 0;
  };

  const scheduledMeetings = mockDynReqs
    .filter((r: any) => !isHiddenTestPo(r.po))
    .filter((r: any) => r.type === 'meeting_scheduled')
    .filter((r: any) => {
      const ts = r.meetingDate
        ? parseTs(`${r.meetingDate}T${r.meetingTime || '00:00'}`)
        : parseTs(r.date || r.createdAt);
      return ts >= Date.now();
    })
    .sort((a: any, b: any) => {
      const aTs = a.meetingDate ? parseTs(`${a.meetingDate}T${a.meetingTime || '00:00'}`) : parseTs(a.date || a.createdAt);
      const bTs = b.meetingDate ? parseTs(`${b.meetingDate}T${b.meetingTime || '00:00'}`) : parseTs(b.date || b.createdAt);
      return aTs - bTs;
    });
  const propScheduledMeetings = propInquiries
    .filter((p: PropInquiry) => p.status === "MEETING_CONFIRMED" && p.meetingDate)
    .filter((p: PropInquiry) => parseTs(`${p.meetingDate}T${p.meetingTime || '00:00'}`) >= Date.now())
    .map((p: PropInquiry) => ({ id: `prop-${p.poNumber}`, title: p.propertyTitle, po: p.poNumber, meetingDate: p.meetingDate || "", meetingTime: p.meetingTime || "", meetingVenue: p.meetingVenue || "", customer: p.customerName || "Customer", date: p.meetingDate || "" }));
  const allScheduledMeetings = [...scheduledMeetings, ...propScheduledMeetings].sort((a: any, b: any) => {
    const aTs = a.meetingDate ? parseTs(`${a.meetingDate}T${a.meetingTime || '00:00'}`) : parseTs(a.date || a.createdAt);
    const bTs = b.meetingDate ? parseTs(`${b.meetingDate}T${b.meetingTime || '00:00'}`) : parseTs(b.date || b.createdAt);
    return aTs - bTs;
  });

  useEffect(() => {
    if (!chatFeed || chatFeed.length === 0) return;

    setPartnerDynReqs(prev => {
      let next = [...prev];
      let changed = false;

      const upsert = (item: any) => {
        const exists = next.some((x: any) => x.po === item.po && x.type === item.type);
        if (exists) return;
        next = [...next.filter((x: any) => !(x.po === item.po && x.type === item.type)), item];
        changed = true;
      };

      let histFromStorage: any[] = [];
      try { histFromStorage = filterVisibleWorkflowItems(JSON.parse(localStorage.getItem('ghis_mock_history') || '[]')); } catch {}

      for (const chat of chatFeed) {
        const po = chat.po;
        const lower = String(chat.lastMsg || "").toLowerCase();
        const order = mappedOrders.find((x: any) => x.po === po);
        const localActive = mockActiveState.find((x: any) => x.po === po);
        const historyEntry = mockHistory.find((x: any) => x.po === po) || histFromStorage.find((x: any) => x.po === po);
        const variationAlreadySubmitted = (Number(localActive?.step || 0) >= 9 && localActive?.actionNeeded === false) || Boolean(localStorage.getItem(`partner_variation_sent_${po}`)) || variationWaitingCustomerPos.has(po);
        const completeAlreadySubmitted = (Number(localActive?.step || 0) >= 10 && localActive?.actionNeeded === false) || Boolean(localStorage.getItem(`partner_complete_sent_${po}`)) || completeWaitingCustomerPos.has(po);
        if (variationAlreadySubmitted) {
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: false } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
        }
        const partnerAlreadyRated = Boolean(historyEntry?.partnerRating);
        const meetingAlreadyConfirmed = Number(localActive?.step || 0) >= 9;
        if (!po || !order) continue;
        // Skip ALL reconstruction for completed jobs - prevents step 8 from reappearing after partner rates
        if (historyEntry) continue;

        if (lower.includes('customer sent meeting invitation')) {
          if (meetingAlreadyConfirmed || partnerAlreadyRated) {
            next = next.filter((x: any) => !(x.po === po && (x.type === 'meeting_confirm_partner' || x.workflowType === 'meeting_confirm_partner')));
          } else {
          const inviteDetails = parseMeetingInviteDetails(String(chat.lastMsg || order.statusNote || ''));
          const createdAt = Number(chat.sort || 0) || Date.now();
          upsert({
            id: `meeting-confirm-${po}`,
            orderId: order.id,
            po,
            service: order.service,
            serviceTh: order.serviceTh,
            serviceZh: order.serviceZh,
            customer: order.customer,
            date: chat.time || fmtDateTime(createdAt),
            createdAt,
            fee: order.fee,
            budget: order.budget,
            tier: order.tier,
            description: 'Customer sent a site meeting invitation. Please review and confirm the meeting time.',
            projectDetails: String(order.description || '').replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?/, '').trim(),
            meetingMessage: String(chat.lastMsg || ''),
            meetingDateLabel: inviteDetails.meetingDateLabel,
            meetingTimeLabel: inviteDetails.meetingTimeLabel,
            meetingVenue: inviteDetails.meetingVenue || order.subdistrict || '',
            subdistrict: order.subdistrict || '',
            type: 'meeting_confirm_partner',
            workflowType: 'meeting_confirm_partner',
            status: 'MEETING_REQUESTED',
            step: 8,
          });
          } // end else (meeting not yet confirmed)
        }

        if (lower.includes('partner confirmed site meeting') || lower.includes('meeting confirmed by partner')) {
          next = next.filter((x: any) => !(x.po === po && (x.workflowType === 'meeting_confirm_partner' || x.type === 'meeting_confirm_partner')));
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: true } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
          if (!variationAlreadySubmitted && !partnerAlreadyRated) {
            upsert({
              id: `variation-${po}`,
              orderId: order.id,
              po,
              service: order.service,
              serviceTh: order.serviceTh,
              serviceZh: order.serviceZh,
              customer: order.customer,
              date: fmtDateTime(Date.now()),
              createdAt: Date.now(),
              fee: order.fee,
              budget: order.budget,
              tier: order.tier,
              description: order.description || 'Proceed to submit variation request if extra work or price adjustment is required.',
              type: 'variation_partner',
              workflowType: 'variation_partner',
              step: 9,
            });
          } else if (variationAlreadySubmitted) {
            // Clean up stale variation_partner if already submitted (guards against race condition re-adds)
            next = next.filter((x: any) => !(x.po === po && x.type === 'variation_partner'));
          }
        }
        if (lower.includes('customer approved variation')) {
          const partnerRequest = resolveVariationPartnerNote(po);
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 10, mockStep: 10, actionNeeded: true } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
          next = next.filter((x: any) => !(x.po === po && (x.type === 'variation_partner' || x.type === 'meeting_confirm_partner' || x.workflowType === 'meeting_confirm_partner')));
          if (!completeAlreadySubmitted && !partnerAlreadyRated) {
            upsert({
              id: `complete-${po}`,
              orderId: order.id,
              po,
              service: order.service,
              serviceTh: order.serviceTh,
              serviceZh: order.serviceZh,
              customer: order.customer,
              date: fmtDateTime(Date.now()),
              createdAt: Date.now(),
              fee: order.fee,
              budget: order.budget,
              tier: order.tier,
              location: order.subdistrict || order.location || '',
              subdistrict: order.subdistrict || '',
              description: 'Customer approved the variation. Please submit project complete for confirmation.',
              partnerRequest,
              partnerNote: partnerRequest,
              variationRequest: partnerRequest,
              type: 'complete_partner',
              workflowType: 'complete_partner',
              step: 10,
            });
          } else if (completeAlreadySubmitted) {
            // Clean up stale complete_partner if already submitted
            next = next.filter((x: any) => !(x.po === po && x.type === 'complete_partner'));
          }
        }
        if (lower.includes('customer confirmed job complete')) {
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 11, mockStep: 11, actionNeeded: true } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
          next = next.filter((x: any) => !(x.po === po && (x.type === 'complete_partner' || x.type === 'variation_partner' || x.type === 'meeting_confirm_partner' || x.workflowType === 'meeting_confirm_partner')));
          if (!partnerAlreadyRated) {
            upsert({
              id: `rate-${po}`,
              orderId: order.id,
              po,
              service: order.service,
              serviceTh: order.serviceTh,
              serviceZh: order.serviceZh,
              customer: order.customer,
              date: fmtDateTime(Date.now()),
              createdAt: Date.now(),
              fee: order.fee,
              budget: order.budget,
              tier: order.tier,
              location: order.subdistrict || order.location || '',
              subdistrict: order.subdistrict || '',
              description: 'Customer confirmed completion. Please rate the customer to close this job.',
              type: 'rate_partner',
              workflowType: 'rate_partner',
              step: 11,
            });
          } else {
            // Clean up stale rate_partner if already rated
            next = next.filter((x: any) => !(x.po === po && x.type === 'rate_partner'));
          }
        }
      }

      if (!changed) return prev;
      try { localStorage.setItem("partner_mock_dyn_req", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [chatFeed, mappedOrders, mockActiveState, mockHistory, mockDynReqs]);

  // Cross-browser: when customer confirms complete, backend order becomes COMPLETED — sync partner rate request + alerts.
  useEffect(() => {
    if (!partner?.id) return;
    const completedOrders = mappedOrders.filter(
      (order: any) => String(order?.status || '').toUpperCase() === 'COMPLETED',
    );
    if (completedOrders.length === 0) return;

    let changed = false;
    let nextReqs: any[] = [];
    let nextAlerts: any[] = [];
    try { nextReqs = filterVisibleWorkflowItems(JSON.parse(localStorage.getItem('partner_mock_dyn_req') || '[]')); } catch {}
    try { nextAlerts = JSON.parse(localStorage.getItem('partner_alerts') || '[]'); } catch {}
    if (!Array.isArray(nextReqs)) nextReqs = [];
    if (!Array.isArray(nextAlerts)) nextAlerts = [];

    for (const order of completedOrders) {
      const po = String(order?.po || '').trim();
      if (!po) continue;
      const historyEntry = mockHistory.find((h: any) => h.po === po);
      if (historyEntry?.partnerRating != null) continue;
      if (nextReqs.some((r: any) => r.po === po && r.type === 'rate_partner')) continue;

      const createdAt = parseTs(order.statusChangedAt || order.updatedAt || order.createdAt) || Date.now();
      nextReqs = [
        ...nextReqs.filter((r: any) => !(r.po === po && ['complete_partner', 'variation_partner', 'meeting_confirm_partner'].includes(r.type))),
        {
          id: `rate-partner-${po}`,
          orderId: order.id,
          po,
          service: order.service,
          serviceTh: order.serviceTh,
          serviceZh: order.serviceZh,
          customer: order.customer,
          date: fmtDateTime(createdAt),
          createdAt,
          fee: order.fee,
          budget: order.budget,
          tier: order.tier,
          location: order.subdistrict || order.location || '',
          subdistrict: order.subdistrict || '',
          description: 'Customer confirmed completion. Please rate the customer to close this job.',
          type: 'rate_partner',
          workflowType: 'rate_partner',
          step: 11,
        },
      ];
      const alertId = `alert-complete-${po}`;
      if (!nextAlerts.some((a: any) => String(a?.id || '').startsWith(alertId))) {
        nextAlerts.unshift({
          id: `${alertId}-${createdAt}`,
          type: 'complete_confirmed',
          po,
          title: 'Job Complete Approved',
          message: `${po}: Customer confirmed project complete. Next: rate the customer to close this job and move it to history.`,
          msgTh: `${po}: ลูกค้ายืนยันงานเสร็จแล้ว ขั้นตอนถัดไปคือให้คะแนนลูกค้าเพื่อปิดงานและย้ายไปประวัติ`,
          msgZh: `${po}: 客户已确认项目完工。下一步：评价客户以关闭此工作并移入历史。`,
          timestamp: new Date(createdAt).toISOString(),
          createdAt,
          dot: 'bg-sky-500',
        });
      }
      changed = true;
    }

    if (!changed) return;
    try { localStorage.setItem('partner_mock_dyn_req', JSON.stringify(nextReqs)); } catch {}
    try { localStorage.setItem('partner_alerts', JSON.stringify(nextAlerts)); } catch {}
    setPartnerDynReqs(nextReqs);
    setPartnerPersistedAlerts(nextAlerts);
    window.dispatchEvent(new Event('cblue-workflow-updated'));
  }, [mappedOrders, mockHistory, partner?.id]);

  const partnerRequestItems = Array.from([
    ...partnerDynReqs.filter((r: any) => !['accept_sent'].includes(String(r.type || '')) && !completedHistoryPos.has(r.po) && !declinedPartnerPos.has(r.po)),
    ...incomingJobs.filter((job: any) => !(String(job.status || '').toUpperCase() === 'MEETING_REQUESTED' && partnerDynReqs.some((req: any) => req.po === job.po && req.workflowType === 'meeting_confirm_partner'))),
  ].reduce((map: Map<string, any>, item: any) => {
    const key = item.po || item.id;
    const current = map.get(key);
    if (!current) {
      map.set(key, item);
      return map;
    }
    const currentStep = Number(current.step || 0);
    const nextStep = Number(item.step || 0);
    const currentTs = parseTs(current.createdAt || current.date);
    const nextTs = parseTs(item.createdAt || item.date);
    if (nextStep > currentStep || (nextStep === currentStep && nextTs >= currentTs)) {
      // Preserve location from whichever source has a real value (not empty/Unknown)
      const preservedLocation = (item.location && item.location !== 'Unknown') ? item.location : (current.location && current.location !== 'Unknown') ? current.location : (item.location || '');
      const preservedSubdistrict = (item.subdistrict && item.subdistrict !== 'Unknown') ? item.subdistrict : (current.subdistrict && current.subdistrict !== 'Unknown') ? current.subdistrict : (item.subdistrict || '');
      // Preserve description (order text with qty/service details) from whichever source has it
      const preservedDescription = item.description || current.description || '';
      map.set(key, { ...item, location: preservedLocation, subdistrict: preservedSubdistrict, ...(preservedDescription ? { description: preservedDescription } : {}) });
    } else if (!current.description && item.description) {
      // Current wins on step; still carry description from incoming backend item if current lacks it
      map.set(key, { ...current, description: item.description });
    }
    return map;
  }, new Map<string, any>()).values())
    .sort((a: any, b: any) => parseTs(b.createdAt || b.date) - parseTs(a.createdAt || a.date));

  // Inject prop inquiry items: NOTIFY_SENT = step 4 accept, MEETING_SENT = step 7 confirm, MEETING_CONFIRMED = step 8 rate
  const propRequestCards: any[] = propInquiries.map((p: PropInquiry) => {
    const status = String(p.status || '').toUpperCase();
    const step = mapPropStatusToStep(status, p.step);
    const pendingPartnerRating = p.listerRating == null && step >= 8 && !['COMPLETED', 'CANCELLED'].includes(status);
    const createdAt = Number(p.updatedAt || p.createdAt || Date.now());
    const siteLocation = getPropSiteLocation(p);
    const details = [
      p.propertyType ? `Type: ${p.propertyType}` : '',
      p.listingType ? `Listing: ${p.listingType}` : '',
      typeof p.area === 'number' && p.area > 0 ? `Area: ${Number(p.area).toLocaleString()} sq.m.` : '',
      typeof p.bedrooms === 'number' ? `Beds: ${p.bedrooms}` : '',
      typeof p.bathrooms === 'number' ? `Baths: ${p.bathrooms}` : '',
      siteLocation ? `Location: ${siteLocation}` : '',
    ].filter(Boolean).join(' | ');
    if (status === "NOTIFY_SENT") return {
      id: `prop-accept-${p.poNumber}`,
      type: "prop_accept",
      workflowType: "prop_accept",
      po: p.poNumber,
      step,
      service: p.propertyTitle,
      serviceTh: p.propertyTitle,
      serviceZh: p.propertyTitle,
      customer: firstNameOnly(p.customerName, 'Customer'),
      date: fmtDateTime(createdAt),
      createdAt,
      fee: toCurrencyLabel(p.propertyFee),
      budget: toCurrencyLabel(p.propertyPrice),
      tier: p.propertyTier || 'STANDARD',
      location: siteLocation,
      subdistrict: p.subdistrict || p.district || p.province,
      description: details,
      propertyImages: p.propertyImages || [],
      propInquiry: p,
    };
    if (status === "MEETING_SENT") return {
      id: `prop-meet-confirm-${p.poNumber}`,
      type: "prop_meeting_confirm",
      workflowType: "prop_meeting_confirm",
      po: p.poNumber,
      step,
      service: p.propertyTitle,
      serviceTh: p.propertyTitle,
      serviceZh: p.propertyTitle,
      customer: firstNameOnly(p.customerName, 'Customer'),
      date: fmtDateTime(createdAt),
      createdAt,
      fee: toCurrencyLabel(p.propertyFee),
      budget: toCurrencyLabel(p.propertyPrice),
      tier: p.propertyTier || 'STANDARD',
      location: siteLocation,
      subdistrict: p.subdistrict || p.district || p.province,
      description: details,
      meetingVenue: p.meetingVenue || '',
      propertyImages: p.propertyImages || [],
      propInquiry: p,
    };
    if (pendingPartnerRating) return {
      id: `prop-rate-p-${p.poNumber}`,
      type: "prop_rate_partner",
      workflowType: "prop_rate_partner",
      po: p.poNumber,
      step,
      service: p.propertyTitle,
      serviceTh: p.propertyTitle,
      serviceZh: p.propertyTitle,
      customer: firstNameOnly(p.customerName, 'Customer'),
      date: fmtDateTime(createdAt),
      createdAt,
      fee: toCurrencyLabel(p.propertyFee),
      budget: toCurrencyLabel(p.propertyPrice),
      tier: p.propertyTier || 'STANDARD',
      location: siteLocation,
      subdistrict: p.subdistrict || p.district || p.province,
      description: details,
      meetingVenue: p.meetingVenue || '',
      propertyImages: p.propertyImages || [],
      propInquiry: p,
    };
    return null;
  }).filter(Boolean) as any[];

  const existingPropRateRequestPos = new Set(
    propRequestCards
      .filter((item: any) => item?.type === 'prop_rate_partner' && item?.po)
      .map((item: any) => String(item.po)),
  );
  const toNumericValue = (value: any) => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const propFallbackRateCards: any[] = activeJobs
    .filter((job: any) => {
      const po = String(job?.po || '').trim();
      if (!po || !isPropPoCode(po)) return false;
      if (existingPropRateRequestPos.has(po)) return false;
      const status = String(job?.status || '').toUpperCase();
      if (['COMPLETED', 'CANCELLED'].includes(status)) return false;
      const inferredStep = Math.max(
        parseWorkflowStep(job?.step),
        parseWorkflowStep(job?.mockStep),
        parseWorkflowStep(job?.propInquiry?.step),
        parseWorkflowStep(job?.stepText),
        /\brate\b/i.test(`${job?.type || ''} ${job?.service || ''} ${job?.description || ''}`) ? 8 : 0,
      );
      return inferredStep >= 8;
    })
    .map((job: any) => {
      const po = String(job?.po || '').trim();
      if (!po) return null;
      const source = job?.propInquiry || {};
      const inferredStep = Math.max(
        parseWorkflowStep(job?.step),
        parseWorkflowStep(job?.mockStep),
        parseWorkflowStep(source.step),
        parseWorkflowStep(job?.stepText),
        /\brate\b/i.test(`${job?.type || ''} ${job?.service || ''} ${job?.description || ''}`) ? 8 : 0,
      );
      const status = normalizePropInquiryStatus(source.status || job?.status, inferredStep || 8);
      if (['COMPLETED', 'CANCELLED'].includes(status)) return null;
      const step = mapPropStatusToStep(status, inferredStep || 8);
      if (step < 8) return null;

      const createdAt = Number(
        source.updatedAt || source.createdAt || job?.createdAt || job?.date || Date.now(),
      );
      const fallbackInquiry: PropInquiry = {
        id: String(source.id || `fallback-${po}`),
        poNumber: po,
        propertyId: String(source.propertyId || job?.orderId || po),
        propertyTitle: String(source.propertyTitle || job?.service || po),
        propertyTier: String(source.propertyTier || job?.tier || 'STANDARD'),
        propertyFee: Number(source.propertyFee ?? toNumericValue(job?.fee)),
        propertyType: String(source.propertyType || ''),
        listingType: String(source.listingType || ''),
        propertyPrice: Number(
          source.propertyPrice ?? toNumericValue(job?.value ?? job?.budget ?? job?.price),
        ),
        province: String(source.province || ''),
        district: String(source.district || ''),
        subdistrict: String(source.subdistrict || job?.subdistrict || ''),
        addressLine: String(source.addressLine || job?.location || ''),
        latitude: source.latitude ?? null,
        longitude: source.longitude ?? null,
        area: source.area ?? null,
        bedrooms: source.bedrooms ?? null,
        bathrooms: source.bathrooms ?? null,
        propertyImages: Array.isArray(source.propertyImages) ? source.propertyImages : [],
        customerEmail: String(source.customerEmail || ''),
        customerName: String(source.customerName || job?.customer || 'Customer'),
        listerName: String(source.listerName || partner?.name || 'Lister'),
        status,
        step,
        createdAt,
        updatedAt: createdAt,
        meetingDate: source.meetingDate,
        meetingTime: source.meetingTime,
        meetingVenue: source.meetingVenue,
        customerRating: source.customerRating ?? null,
        customerComment: source.customerComment ?? '',
        listerRating: source.listerRating ?? null,
        listerComment: source.listerComment ?? '',
        reselectedOnce: source.reselectedOnce ?? false,
      };
      if (fallbackInquiry.listerRating != null) return null;

      const siteLocation = getPropSiteLocation(fallbackInquiry);
      const details = [
        fallbackInquiry.propertyType ? `Type: ${fallbackInquiry.propertyType}` : '',
        fallbackInquiry.listingType ? `Listing: ${fallbackInquiry.listingType}` : '',
        typeof fallbackInquiry.area === 'number' && fallbackInquiry.area > 0
          ? `Area: ${Number(fallbackInquiry.area).toLocaleString()} sq.m.`
          : '',
        typeof fallbackInquiry.bedrooms === 'number' ? `Beds: ${fallbackInquiry.bedrooms}` : '',
        typeof fallbackInquiry.bathrooms === 'number' ? `Baths: ${fallbackInquiry.bathrooms}` : '',
        siteLocation ? `Location: ${siteLocation}` : '',
      ].filter(Boolean).join(' | ');

      return {
        id: `prop-rate-p-fallback-${po}`,
        type: 'prop_rate_partner',
        workflowType: 'prop_rate_partner',
        po,
        step,
        service: fallbackInquiry.propertyTitle,
        serviceTh: fallbackInquiry.propertyTitle,
        serviceZh: fallbackInquiry.propertyTitle,
        customer: firstNameOnly(fallbackInquiry.customerName, 'Customer'),
        date: fmtDateTime(createdAt),
        createdAt,
        fee: toCurrencyLabel(fallbackInquiry.propertyFee),
        budget: toCurrencyLabel(fallbackInquiry.propertyPrice),
        tier: fallbackInquiry.propertyTier || 'STANDARD',
        location: siteLocation,
        subdistrict:
          fallbackInquiry.subdistrict || fallbackInquiry.district || fallbackInquiry.province,
        description: details,
        meetingVenue: fallbackInquiry.meetingVenue || '',
        propertyImages: fallbackInquiry.propertyImages || [],
        propInquiry: fallbackInquiry,
        isPropertyJob: true,
      };
    })
    .filter(Boolean) as any[];

  const partnerRequestItemsWithProp = Array.from(
    [...partnerRequestItems, ...propRequestCards, ...propFallbackRateCards].reduce((map: Map<string, any>, item: any) => {
      const key = String(item?.po || item?.id || '').trim();
      if (!key || isHiddenTestPo(key)) return map;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        return map;
      }

      const existingIsProperty = isPropertyWorkflowJob(existing);
      const nextIsProperty = isPropertyWorkflowJob(item);
      const keyIsPropertyPo = isPropPoCode(key);

      if (keyIsPropertyPo && nextIsProperty && !existingIsProperty) {
        map.set(key, { ...existing, ...item, isPropertyJob: true });
        return map;
      }
      if (keyIsPropertyPo && existingIsProperty && !nextIsProperty) {
        return map;
      }

      const existingStep = Number(existing?.step || 0);
      const nextStep = Number(item?.step || 0);
      const existingTs = parseTs(existing?.createdAt || existing?.date);
      const nextTs = parseTs(item?.createdAt || item?.date);
      if (nextStep > existingStep || (nextStep === existingStep && nextTs >= existingTs)) {
        map.set(key, { ...existing, ...item, isPropertyJob: existingIsProperty || nextIsProperty });
      }
      return map;
    }, new Map<string, any>()).values(),
  )
    .filter((item: any) => {
      const po = String(item?.po || '').trim();
      return !(po && partnerSideCompletedPropPos.has(po));
    })
    .sort((a: any, b: any) => parseTs(b.createdAt || b.date) - parseTs(a.createdAt || a.date));

  const dynamicNotifications = mockDynReqs.map((r: any) => {
    const eventTs = parseTs(r.createdAt || r.date);
    const displayTime = eventTs > 0 ? fmtDateTime(eventTs) : "";
    if (!displayTime) return null;
    if (r.type === "meeting_pending_partner") return {
      id: `dyn-${r.id}`,
      msg: `${r.po}: Customer sent a site meeting invitation. Review the schedule and confirm it next.`,
      msgTh: `${r.po}: ลูกค้าส่งคำเชิญนัดหมายหน้างานแล้ว กรุณาตรวจสอบเวลาและยืนยัน`,
      msgZh: `${r.po}: 客户已发送现场会议邀请。请检查时间并确认。`,
      unread: true,
      time: displayTime,
      dot: "bg-amber-500",
    };
    if (r.type === "meeting_scheduled") return {
      id: `dyn-${r.id}`,
      msg: `${r.po}: Site meeting confirmed${r.meetingDate ? ` for ${r.meetingDate}` : ''}${r.meetingTime ? ` ${r.meetingTime}` : ''}. Next: attend the meeting, then submit variation if scope changed.`,
      msgTh: `${r.po}: ยืนยันนัดหมายแล้ว${r.meetingDate ? ` วันที่ ${r.meetingDate}` : ''}${r.meetingTime ? ` เวลา ${r.meetingTime}` : ''} ขั้นตอนถัดไปคือเข้าพบหน้างาน แล้วส่ง variation หากขอบเขตหรือราคามีการเปลี่ยนแปลง`,
      msgZh: `${r.po}: 现场会议已确认${r.meetingDate ? `，日期 ${r.meetingDate}` : ''}${r.meetingTime ? ` 时间 ${r.meetingTime}` : ''}。下一步：参加会议，如范围或价格变更则提交变更申请。`,
      unread: true,
      time: displayTime,
      dot: "bg-teal-500",
    };
    if (r.type === "variation_pending") return {
      id: `dyn-${r.id}`,
      msg: `${r.po}: Variation request sent to customer. Wait for approval before sending job complete.`,
      msgTh: `${r.po}: ส่งคำขอ variation ให้ลูกค้าแล้ว กรุณารออนุมัติก่อนส่งงานเสร็จ`,
      msgZh: `${r.po}: 已向客户发送变更申请。请等待批准后再提交完工。`,
      unread: true,
      time: displayTime,
      dot: "bg-purple-500",
    };
    if (r.type === "complete_pending") return {
      id: `dyn-${r.id}`,
      msg: `${r.po}: Job-complete request sent. Wait for customer confirmation to open rating.`,
      msgTh: `${r.po}: ส่งคำของานเสร็จแล้ว กรุณารอลูกค้ายืนยันเพื่อเปิดขั้นตอนให้คะแนน`,
      msgZh: `${r.po}: 已发送完工申请。请等待客户确认后开启评分步骤。`,
      unread: true,
      time: displayTime,
      dot: "bg-green-500",
    };
    return null;
  }).filter(Boolean).map((n: any) => ({ createdAt: parseTs(n.time) || Date.now(), ...n })) as any[];

  const partnerWorkflowNotifications = partnerDynReqs.map((r: any) => {
    const workflowType = String(r.workflowType || r.type || '');
    const meetingTs = workflowType === 'meeting_confirm_partner'
      ? parseMeetingDateTimeMs(r.meetingDate || r.meetingDateLabel, r.meetingTime || r.meetingTimeLabel)
      : 0;
    if (workflowType === 'meeting_confirm_partner' && meetingTs > 0 && meetingTs < Date.now() - 3 * 24 * 60 * 60 * 1000) return null;
    const eventTs = parseTs(r.createdAt || r.notifyAt || r.date) || meetingTs;
    const displayTime = eventTs > 0 ? fmtDateTime(eventTs) : "";
    if (!displayTime) return null;
    if (r.workflowType === "meeting_confirm_partner" || r.type === "meeting_confirm_partner") return {
      id: `p-${r.id}`,
      msg: `${r.po}: Customer proposed a site meeting${r.meetingDateLabel ? ` on ${r.meetingDateLabel}` : ''}${r.meetingTimeLabel ? ` at ${r.meetingTimeLabel}` : ''}${r.meetingVenue ? ` in ${r.meetingVenue}` : ''}. Confirm it to unlock Step 9.`,
      msgTh: `${r.po}: ลูกค้าเสนอเวลานัดหมาย${r.meetingDateLabel ? ` วันที่ ${r.meetingDateLabel}` : ''}${r.meetingTimeLabel ? ` เวลา ${r.meetingTimeLabel}` : ''}${r.meetingVenue ? ` ที่ ${r.meetingVenue}` : ''} กรุณายืนยันเพื่อไปขั้นตอนที่ 9`,
      msgZh: `${r.po}: 客户提议现场会议${r.meetingDateLabel ? `，日期 ${r.meetingDateLabel}` : ''}${r.meetingTimeLabel ? ` 时间 ${r.meetingTimeLabel}` : ''}${r.meetingVenue ? ` 地点 ${r.meetingVenue}` : ''}。请确认以进入第9步。`,
      unread: true,
      time: displayTime,
      dot: "bg-amber-500",
    };
    if (r.type === "variation_partner") return {
      id: `p-${r.id}`,
      msg: `${r.po}: Site meeting is done. Submit the variation request now if scope or pricing changed.`,
      msgTh: `${r.po}: นัดหมายหน้างานเสร็จแล้ว กรุณาส่ง variation หากขอบเขตหรือต้นทุนเปลี่ยน`,
      msgZh: `${r.po}: 现场会议已完成。如范围或价格变更，请立即提交变更申请。`,
      unread: true,
      time: displayTime,
      dot: "bg-purple-500",
    };
    if (r.type === "complete_partner") return {
      id: `p-${r.id}`,
      msg: `${r.po}: Customer approved the variation. Send the job-complete request next.`,
      msgTh: `${r.po}: ลูกค้าอนุมัติ variation แล้ว กรุณาส่งคำของานเสร็จเป็นขั้นตอนถัดไป`,
      msgZh: `${r.po}: 客户已批准变更。下一步请发送完工申请。`,
      unread: true,
      time: displayTime,
      dot: "bg-green-500",
    };
    if (r.type === "rate_partner") return {
      id: `p-${r.id}`,
      msg: `${r.po}: Customer confirmed completion. Rate the customer to close this job and move it to history.`,
      msgTh: `${r.po}: ลูกค้ายืนยันงานเสร็จแล้ว กรุณาให้คะแนนลูกค้าเพื่อปิดงานและย้ายไปประวัติ`,
      msgZh: `${r.po}: 客户已确认完工。请评价客户以关闭此工作并移入历史。`,
      unread: true,
      time: displayTime,
      dot: "bg-sky-500",
    };
    if (r.type === "pending_accept") return {
      id: `p-${r.id}-${r.notifyAt || r.createdAt || '0'}`,
      msg: `${r.po}: New ${r.service || "project"} request from ${r.customer || 'customer'}. Review the PO and accept or decline it.`,
      msgTh: `${r.po}: มีคำของาน ${r.service || "โครงการ"} ใหม่จาก ${r.customer || 'ลูกค้า'} กรุณาตรวจสอบ PO แล้วรับหรือปฏิเสธ`,
      msgZh: `${r.po}: 来自 ${r.customer || '客户'} 的新${r.service || "项目"}请求。请查看PO并接受或拒绝。`,
      unread: true,
      time: displayTime,
      dot: "bg-amber-500",
    };
    if (r.type === "accept_sent") return {
      id: `p-${r.id}`,
      msg: `${r.po}: You accepted ${r.service || "the job"}. Waiting for customer payment to unlock chat and the next step.`,
      msgTh: `${r.po}: คุณรับงาน ${r.service || "นี้"} แล้ว กำลังรอลูกค้าชำระเงินเพื่อเปิดแชทและขั้นตอนถัดไป`,
      msgZh: `${r.po}: 您已接受 ${r.service || "该工作"}。正在等待客户付款以开启聊天和下一步。`,
      unread: false,
      time: displayTime,
      dot: "bg-green-500",
    };
    return null;
  }).filter(Boolean).map((n: any) => ({ createdAt: parseTs(n.time) || Date.now(), ...n })) as any[];

  const propWorkflowNotifications = propInquiries.map((p: PropInquiry) => {
    const createdAt = parseTs(p.updatedAt || p.createdAt) || Date.now();
    const time = fmtDateTime(createdAt);
    if (p.status === 'NOTIFY_SENT') {
      return {
        id: `prop-notify-${p.poNumber}`,
        msg: `New property inquiry ${p.poNumber}: ${p.propertyTitle}. Please review and accept.`,
        msgTh: `มีคำขออสังหาฯ ใหม่ ${p.poNumber}: ${p.propertyTitle} กรุณาตรวจสอบและยืนยัน`,
        msgZh: `新的房产咨询 ${p.poNumber}: ${p.propertyTitle}，请审核并接受。`,
        unread: true,
        time,
        createdAt,
        dot: 'bg-amber-500',
      };
    }
    if (p.status === 'ACCEPTED') {
      return {
        id: `prop-accepted-${p.poNumber}`,
        msg: `You accepted ${p.propertyTitle}. Waiting for customer Free Pass confirmation.`,
        msgTh: `คุณยืนยัน ${p.propertyTitle} แล้ว กำลังรอลูกค้า Free Pass`,
        msgZh: `您已接受 ${p.propertyTitle}，正在等待客户 Free Pass。`,
        unread: false,
        time,
        createdAt,
        dot: 'bg-emerald-500',
      };
    }
    if (p.status === 'PAID') {
      return {
        id: `prop-paid-${p.poNumber}`,
        msg: `Customer activated Free Pass for ${p.propertyTitle}. Chat room is now active.`,
        msgTh: `ลูกค้าเปิด Free Pass สำหรับ ${p.propertyTitle} แล้ว ห้องแชทพร้อมใช้งาน`,
        msgZh: `客户已为 ${p.propertyTitle} 激活 Free Pass，聊天室已开启。`,
        unread: true,
        time,
        createdAt,
        dot: 'bg-sky-500',
      };
    }
    if (p.status === 'MEETING_SENT') {
      return {
        id: `prop-meeting-sent-${p.poNumber}`,
        msg: `Meeting invitation received for ${p.propertyTitle}. Please confirm schedule.`,
        msgTh: `ได้รับคำเชิญนัดหมายสำหรับ ${p.propertyTitle} กรุณายืนยันเวลา`,
        msgZh: `已收到 ${p.propertyTitle} 的会议邀请，请确认时间。`,
        unread: true,
        time,
        createdAt,
        dot: 'bg-amber-500',
      };
    }
    if (p.status === 'MEETING_CONFIRMED' && p.listerRating == null) {
      return {
        id: `prop-rate-needed-${p.poNumber}`,
        msg: `Meeting confirmed for ${p.propertyTitle}. Please rate customer to close step 8.`,
        msgTh: `นัดหมายของ ${p.propertyTitle} ยืนยันแล้ว กรุณาให้คะแนนลูกค้าเพื่อจบขั้นตอนที่ 8`,
        msgZh: `${p.propertyTitle} 会议已确认。请评价客户以完成第8步。`,
        unread: true,
        time,
        createdAt,
        dot: 'bg-yellow-500',
      };
    }
    if (p.status === 'MEETING_CONFIRMED' && p.listerRating != null && p.customerRating == null) {
      return {
        id: `prop-wait-customer-rate-${p.poNumber}`,
        msg: `You rated customer for ${p.propertyTitle}. Waiting for customer rating to close.`,
        msgTh: `คุณให้คะแนนลูกค้าสำหรับ ${p.propertyTitle} แล้ว กำลังรอลูกค้าให้คะแนนเพื่อปิดงาน`,
        msgZh: `您已为 ${p.propertyTitle} 的客户评分，正在等待客户评分后结案。`,
        unread: false,
        time,
        createdAt,
        dot: 'bg-indigo-400',
      };
    }
    return null;
  }).filter(Boolean) as any[];

  const persistedAlertNotifications = partnerPersistedAlerts
    .map((alert: any) => {
      const createdAt = parseTs(alert?.createdAt || alert?.timestamp || alert?.date);
      const msg = alert?.message || alert?.msg || '';
      if (!msg || !createdAt) return null;
      return {
        id: `partner-alert-${alert.id || createdAt}`,
        msg,
        msgTh: alert?.msgTh || msg,
        msgZh: alert?.msgZh || msg,
        unread: true,
        time: fmtDateTime(createdAt),
        createdAt,
        dot: alert?.dot || 'bg-red-500',
      };
    })
    .filter(Boolean) as any[];

  // Generate alerts from backend orders with actionable statuses
  const orderAlertPos = new Set<string>();
  const orderAlerts = mappedOrders.flatMap((o: any) => {
    const po = o.po || "";
    if (!po || orderAlertPos.has(po)) return [];
    orderAlertPos.add(po);
    const svc = o.service || "Project";
    const createdAt = parseTs(o.statusChangedAt || o.updatedAt || o.createdAt || o.date);
    const displayTime = createdAt > 0 ? fmtDateTime(createdAt) : (o.date || "");
    if (['CREATED','PENDING','MATCHING'].includes(o.status)) return [{ id: `order-pending-${po}`, msg: `${po}: New ${svc} request from ${o.customer || 'customer'}. Review the PO and accept or decline it.`, msgTh: `${po}: มีคำขอ ${svc} ใหม่จาก ${o.customer || 'ลูกค้า'} กรุณาตรวจสอบ PO และรับหรือปฏิเสธ`, msgZh: `${po}: 来自 ${o.customer || '客户'} 的新 ${svc} 请求。请查看PO并接受或拒绝。`, unread: true, time: displayTime, createdAt, dot: "bg-purple-500" }];
    if (o.status === 'MEETING_REQUESTED') return [{ id: `order-meeting-${po}`, msg: `${po}: Customer sent a site meeting invitation for ${svc}. Open the request, confirm the schedule, and then prepare Step 9 variation if needed.`, msgTh: `${po}: ลูกค้าส่งคำเชิญนัดหมายสำหรับ ${svc} แล้ว กรุณาเปิดคำขอ ยืนยันเวลา และเตรียม Step 9 variation หากจำเป็น`, msgZh: `${po}: 客户已为 ${svc} 发送现场会议邀请。请打开请求、确认时间，并在需要时准备第9步变更。`, unread: true, time: displayTime, createdAt, dot: "bg-amber-500" }];
    if (o.status === 'IN_PROGRESS') return [{ id: `order-inprogress-${po}`, msg: `${po}: Chat room is active for ${svc}. Coordinate with the customer now, then confirm the site meeting when the invitation arrives.`, msgTh: `${po}: ห้องแชทของ ${svc} พร้อมใช้งานแล้ว กรุณาคุยกับลูกค้าและยืนยันนัดหมายหน้างานเมื่อได้รับคำเชิญ`, msgZh: `${po}: ${svc} 聊天室已开启。请先与客户协调，并在收到现场会议邀请后完成确认。`, unread: true, time: displayTime, createdAt, dot: "bg-sky-400" }];
    if (o.status === 'COMPLETED') {
      const historyEntry = mockHistory.find((h: any) => h.po === po);
      if (historyEntry?.partnerRating != null) return [];
      return [{ id: `order-rate-${po}`, msg: `${po}: Customer confirmed project complete. Next: rate the customer to close this job and move it to history.`, msgTh: `${po}: ลูกค้ายืนยันงานเสร็จแล้ว ขั้นตอนถัดไปคือให้คะแนนลูกค้าเพื่อปิดงานและย้ายไปประวัติ`, msgZh: `${po}: 客户已确认项目完工。下一步：评价客户以关闭此工作并移入历史。`, unread: true, time: displayTime, createdAt, dot: "bg-sky-500" }];
    }
    return [];
  });

  const displayNotifications = [...persistedAlertNotifications, ...orderAlerts, ...dynamicNotifications, ...partnerWorkflowNotifications, ...propWorkflowNotifications]
    .filter((n: any) => n && parseTs(n.createdAt || n.time) > 0 && !String(n.time || '').includes('NaN'))
    .sort((a: any, b: any) => parseTs(b.createdAt || b.time) - parseTs(a.createdAt || a.time))
    .slice(0, 20);

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "" },
    { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: partnerRequestItemsWithProp.length || undefined },
        { key: "active", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "", badge: activeJobs.length || undefined },
    
    { key: "properties", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "" },
    { key: "history", label: locale === "th" ? "ประวัติงาน" : locale === "zh" ? "历史" : "History", icon: "" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "", badge: 0 },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "", badge: 0 },
    { key: "profile", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", icon: "" },
  ];
  const isMeetingConfirmation = waitModalOrder
    ? String(waitModalOrder?.workflowType || waitModalOrder?.type || '').toLowerCase() === 'meeting_confirm_partner' || String(waitModalOrder?.status || '').toUpperCase() === 'MEETING_REQUESTED'
    : false;
  const parsedWaitModalMeeting = parseMeetingInviteDetails(String(waitModalOrder?.meetingMessage || waitModalOrder?.statusNote || waitModalOrder?.description || waitModalOrder?.desc || ''));
  const waitModalMeetingDetails = {
    meetingDateLabel: waitModalOrder?.meetingDateLabel || parsedWaitModalMeeting.meetingDateLabel,
    meetingTimeLabel: waitModalOrder?.meetingTimeLabel || parsedWaitModalMeeting.meetingTimeLabel,
    meetingVenue: waitModalOrder?.meetingVenue || parsedWaitModalMeeting.meetingVenue || waitModalOrder?.subdistrict || 'Unknown',
    meetingMessage: waitModalOrder?.meetingMessage || '',
  };
  const waitModalServiceName = waitModalOrder?.serviceTh || waitModalOrder?.service || 'Project';
  const waitModalCounterpart = firstNameOnly(waitModalOrder?.customer || waitModalOrder?.customerAlias, 'Customer');
  const waitModalBudgetDisplay = waitModalOrder?.fee || (waitModalOrder?.budget ? `฿${String(waitModalOrder.budget).replace(/^฿/, '')}` : `฿${waitModalOrder?.estimatedPrice || waitModalOrder?.finalPrice || '0'}`);
  const waitModalStepName = isMeetingConfirmation ? 'Meeting Confirmation' : 'PO Acceptance';
  const waitModalInstruction = isMeetingConfirmation
    ? 'Review the proposed site meeting time and confirm it for the customer.'
    : 'Review the draft PO, project details, budget basis, and uploaded files before accepting.';
  const waitModalProjectDetails = stripWorkflowPrefix(waitModalOrder?.projectDetails || waitModalOrder?.description || waitModalOrder?.service || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* PDPA Consent Modal */}

      {/* Property Inquiry Accept Modal (Step 4 of 8) */}
      {propAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{locale === "th" ? "ยืนยันการสอบถาม" : locale === "zh" ? "确认询盘" : "Confirm Property Inquiry"}</h3>
                <p className="text-green-100 text-sm mt-1">{getPropOrderLabel(propAcceptModal.poNumber)} · Step 4 of 8</p>
              </div>
              <button onClick={() => setPropAcceptModal(null)} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {propPartnerModalImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {propPartnerModalImages.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-20 object-cover rounded-lg shrink-0 border border-gray-200" />
                  ))}
                </div>
              )}
              {propPartnerModalImages.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                  onClick={async () => {
                    const downloaded = await downloadAttachmentUrls({
                      urls: propPartnerModalImages,
                      po: propAcceptModal?.poNumber,
                      prefix: 'property-photo',
                    });
                    if (!downloaded) {
                      alert(
                        locale === 'th'
                          ? 'ไม่พบไฟล์ที่ดาวน์โหลดได้ในขณะนี้'
                          : locale === 'zh'
                          ? '当前没有可下载的文件。'
                          : 'No downloadable file found right now.',
                      );
                    }
                  }}
                >
                  Download Photos
                </button>
              )}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ทรัพย์สิน" : "Property"}</span><span className="font-semibold text-right max-w-[60%] line-clamp-1">{propAcceptModal.propertyTitle}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ประเภท" : "Type"}</span><span className="font-semibold">{propAcceptModal.propertyType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}</span><span className="font-semibold">{getPropertyListingTypeLabel(propAcceptModal.listingType, locale)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}</span><span className="font-semibold">{toCurrencyLabel(propAcceptModal.propertyPrice)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "จังหวัด" : "Province"}</span><span className="font-semibold">{propAcceptModal.province}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}</span><span className="font-semibold text-right max-w-[60%] break-words">{getPropSiteLocation(propAcceptModal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ระดับบริการ" : "Service Tier"}</span><span className="font-semibold">{propAcceptModal.propertyTier}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ผู้สนใจ (นิรนาม)" : "Interested Party"}</span><span className="font-semibold text-gray-400">{locale === "th" ? "ไม่ระบุตัวตน" : "Anonymous"}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">{locale === "th" ? "ออเดอร์" : locale === "zh" ? "订单" : "Order"}</span><span className="font-mono font-bold text-emerald-700">{propAcceptModal.poNumber}</span></div>
              </div>
              <p className="text-xs text-gray-500">{locale === "th" ? "หลังยืนยัน ลูกค้าจะชำระค่าดำเนินการและได้รับข้อมูลติดต่อของคุณ" : "After acceptance, the customer pays the processing fee and receives your contact info."}</p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await updatePropInquiry(propAcceptModal!.id, { status: "DECLINED" }, propAcceptModal!.poNumber);
                    setPropAcceptModal(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm"
                >
                  {locale === "th" ? "ปฏิเสธ" : "Decline"}
                </button>
                <button
                  onClick={async () => {
                    await updatePropInquiry(propAcceptModal!.id, { status: "ACCEPTED", step: 4 }, propAcceptModal!.poNumber);
                    setPropAcceptModal(null);
                    alert(locale === "th" ? "ยืนยันแล้ว! คำขอนี้จะหายไปจากรายการ ลูกค้าจะดำเนินการชำระเงิน" : "Accepted! This inquiry will disappear from your list. The customer will proceed to pay the fee.");
                  }}
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition"
                >
                  {locale === "th" ? "ยืนยัน" : "Accept"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Meeting Confirmation Modal (Step 7 of 8) */}
      {propMeetingConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{locale === "th" ? "ยืนยันนัดหมาย" : locale === "zh" ? "确认会议" : "Confirm Meeting"}</h3>
                <p className="text-teal-100 text-sm mt-1">{getPropOrderLabel(propMeetingConfirmModal.poNumber)} · Step 7 of 8</p>
              </div>
              <button onClick={() => setPropMeetingConfirmModal(null)} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {propPartnerModalImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {propPartnerModalImages.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-20 object-cover rounded-lg shrink-0 border border-gray-200" />
                  ))}
                </div>
              )}
              {propPartnerModalImages.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                  onClick={async () => {
                    const downloaded = await downloadAttachmentUrls({
                      urls: propPartnerModalImages,
                      po: propMeetingConfirmModal?.poNumber,
                      prefix: 'property-photo',
                    });
                    if (!downloaded) {
                      alert(
                        locale === 'th'
                          ? 'ไม่พบไฟล์ที่ดาวน์โหลดได้ในขณะนี้'
                          : locale === 'zh'
                          ? '当前没有可下载的文件。'
                          : 'No downloadable file found right now.',
                      );
                    }
                  }}
                >
                  Download Photos
                </button>
              )}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ทรัพย์สิน" : "Property"}</span><span className="font-semibold text-right max-w-[60%] line-clamp-1">{propMeetingConfirmModal.propertyTitle}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}</span><span className="font-semibold">{getPropertyListingTypeLabel(propMeetingConfirmModal.listingType, locale)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}</span><span className="font-semibold">{toCurrencyLabel(propMeetingConfirmModal.propertyPrice)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "วันที่" : "Date"}</span><span className="font-semibold">{propMeetingConfirmModal.meetingDate || 'TBD'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "เวลา" : "Time"}</span><span className="font-semibold">{propMeetingConfirmModal.meetingTime || 'TBD'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "สถานที่" : "Venue"}</span><span className="font-semibold">{propMeetingConfirmModal.meetingVenue || 'TBD'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}</span><span className="font-semibold text-right max-w-[60%] break-words">{getPropSiteLocation(propMeetingConfirmModal)}</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPropMeetingConfirmModal(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                  {locale === "th" ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  onClick={async () => {
                    await updatePropInquiry(propMeetingConfirmModal!.id, { status: "MEETING_CONFIRMED", step: 8 }, propMeetingConfirmModal!.poNumber);
                    setPropMeetingConfirmModal(null);
                    alert(locale === "th" ? "ยืนยันนัดหมายแล้ว! การนัดหมายจะปรากฏในปฏิทิน" : "Meeting confirmed! It will appear in upcoming meetings for both parties.");
                  }}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition"
                >
                  {locale === "th" ? "ยืนยันนัดหมาย" : "Confirm Meeting"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Rate Modal for Partner (Step 8 of 8) */}
      {propPartnerRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{locale === "th" ? "ให้คะแนนลูกค้า" : locale === "zh" ? "评价客户" : "Rate Customer"}</h3>
                <p className="text-yellow-100 text-sm mt-1">{getPropOrderLabel(propPartnerRateModal.poNumber)} · Step 8 of 8</p>
              </div>
              <button onClick={() => setPropPartnerRateModal(null)} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">{locale === "th" ? `ให้คะแนนประสบการณ์การทำงานกับลูกค้าสำหรับ: ${propPartnerRateModal.propertyTitle}` : `Rate your experience with the customer for: ${propPartnerRateModal.propertyTitle}`}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropertyListingTypeLabel(propPartnerRateModal.listingType, locale)}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(propPartnerRateModal.propertyPrice)}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}: {getPropSiteLocation(propPartnerRateModal)}</p>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">{locale === "th" ? "คะแนน" : "Rating"}</p>
                <div className="flex gap-2 justify-center">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setPropPartnerRateStars(star)} className={`text-3xl transition ${propPartnerRateStars >= star ? "text-yellow-400" : "text-gray-200"}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ความคิดเห็น (ไม่บังคับ)" : "Comment (optional)"}</label>
                <textarea value={propPartnerRateComment} onChange={e => setPropPartnerRateComment(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none" placeholder={locale === "th" ? "แชร์ประสบการณ์ของคุณ..." : "Share your experience..."} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPropPartnerRateModal(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                  {locale === "th" ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  disabled={propPartnerRateStars === 0}
                  className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-sm hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    await updatePropInquiry(
                      propPartnerRateModal!.id,
                      {
                        step: 8,
                        listerRating: propPartnerRateStars,
                        listerComment: propPartnerRateComment,
                      },
                      propPartnerRateModal!.poNumber,
                    );
                    const customerAlreadyRated = propPartnerRateModal?.customerRating != null;
                    setPropPartnerRateModal(null);
                    alert(
                      locale === "th"
                        ? customerAlreadyRated
                          ? "ขอบคุณ! ส่งคะแนนแล้ว งานนี้ปิดและย้ายไปประวัติ"
                          : "ขอบคุณ! ส่งคะแนนแล้ว กำลังรอลูกค้าให้คะแนนเพื่อปิดงาน"
                        : customerAlreadyRated
                        ? "Thank you! Rating submitted. This inquiry is now closed and moved to history."
                        : "Thank you! Rating submitted. Waiting for customer rating to close this inquiry.",
                    );
                  }}
                >
                  {locale === "th" ? "ส่งคะแนน" : "Submit Rating"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Accept/Decline Modal */}
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto pt-20">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[calc(100dvh-6rem)] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 my-4">
            <div className="flex justify-between items-start mb-4">
              <div className="mb-2 text-sm font-semibold text-purple-600 bg-purple-50 inline-block px-3 py-1 rounded-full">{isMeetingConfirmation ? 'Step 8 of 11' : 'Step 5 of 11'}</div>
              <button onClick={() => setWaitModalOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{isMeetingConfirmation ? 'Confirm Site Meeting' : 'Review PO Details'}</h2>
            <p className="text-gray-500 mt-2">{isMeetingConfirmation ? `Customer sent a site meeting invitation for ${waitModalOrder.serviceTh || waitModalOrder.service}. Please review the proposed venue, date, and time before confirming.` : `Customer has placed a request for ${waitModalOrder.serviceTh || waitModalOrder.service}. Please review the PO details below and accept or decline.`}</p>
            
            <div className="w-full bg-gray-50 rounded-xl p-5 mt-6 space-y-3 text-sm text-left border border-gray-100 shadow-inner">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">{waitModalOrder.po || `PO-2605-${waitModalOrder.id?.slice(0, 4)}`}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Step Name</span><span className="font-bold text-gray-800">{waitModalStepName}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Type of Work</span><span className="font-bold text-gray-800 text-right">{waitModalServiceName}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">What You Need To Do</span><span className="font-bold text-gray-800 text-right max-w-[60%]">{waitModalInstruction}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Customer</span><span className="font-bold text-gray-800">{waitModalCounterpart}</span></div>
              <div className="border-b pb-2">
                <span className="text-gray-500 text-sm block mb-1">Budget</span>
                {(() => {
                  const brkDesc = String(waitModalOrder?.description || waitModalOrder?.desc || '');
                  const brkTotal = parseFloat(String(waitModalBudgetDisplay || '').replace(/[฿,]/g, '')) || 0;
                  let pl = (partner as any)?.priceList ?? [];
                  if (pl.length === 0) { try { const stored = localStorage.getItem(`cblue_partner_pricelist_${waitModalOrder?.po}`); if (stored) pl = JSON.parse(stored); } catch {} }
                  if (pl.length === 0) { try { const stored = localStorage.getItem('cblue_partner_pricelist_general'); if (stored) pl = JSON.parse(stored); } catch {} }
                  let bd = computeBudgetBreakdown(brkDesc, pl, brkTotal);
                  if (bd && bd.length > 0) { try { localStorage.setItem(`cblue_po_breakdown_${waitModalOrder?.po}`, JSON.stringify(bd)); } catch {} }
                  if (!bd || bd.length === 0) { try { const stored = JSON.parse(localStorage.getItem(`cblue_po_breakdown_${waitModalOrder?.po}`) || 'null'); if (Array.isArray(stored) && stored.length > 0) bd = stored as BudgetBreakdownItem[]; } catch {} }
                  if (bd && bd.length >= 1) {
                    return (
                      <div className="font-mono text-xs space-y-0.5">
                        {bd.map((it, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-gray-600">{i + 1}) {it!.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                            <span className="font-semibold text-amber-700 shrink-0">= ฿{it!.total.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-2 pt-1 border-t border-amber-200 font-bold text-sm">
                          <span className="text-gray-700">Budget</span>
                          <span className="text-amber-800">= ฿{bd.reduce((s, it) => s + (it?.total ?? 0), 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }
                  return <span className="font-bold text-amber-600">{waitModalBudgetDisplay}</span>;
                })()}
              </div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Project Location</span><span className="font-bold text-gray-800 text-right">{waitModalOrder.location || waitModalOrder.subdistrict || waitModalOrder.meetingVenue || 'Unknown'}</span></div>
              {isMeetingConfirmation && (
                <>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Proposed Date</span><span className="font-bold text-gray-800">{waitModalMeetingDetails.meetingDateLabel || '-'}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Proposed Time</span><span className="font-bold text-gray-800">{waitModalMeetingDetails.meetingTimeLabel || '-'}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Venue</span><span className="font-bold text-gray-800 text-right">{waitModalMeetingDetails.meetingVenue}</span></div>
                </>
              )}
              <div className="flex flex-col gap-1 pb-2"><span className="text-gray-500">Project Details</span><span className="font-bold text-gray-800 bg-white p-2 rounded border border-gray-100">{waitModalProjectDetails}</span></div>
              {isMeetingConfirmation && waitModalMeetingDetails.meetingMessage && <div className="flex flex-col gap-1 pb-2"><span className="text-gray-500">Customer Invitation</span><span className="text-gray-800 bg-white p-2 rounded border border-gray-100">{waitModalMeetingDetails.meetingMessage}</span></div>}
              <div className="flex justify-between items-center"><span className="text-gray-500">Uploaded Files</span><button type="button" className={`font-semibold ${waitModalAttachmentUrls.length > 0 ? 'text-sky-600 hover:underline' : 'text-gray-400 cursor-default'}`} onClick={() => {
                if (waitModalAttachmentUrls.length === 0 && !loadingAttachments) {
                  alert('No downloadable file found right now.');
                  return;
                }
                void openWaitModalAttachmentViewer();
              }}>{waitModalAttachmentUrls.length > 0 ? 'View & Download' : loadingAttachments ? 'Checking files…' : 'No files yet'}</button></div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={async () => {
                  const po = waitModalOrder.po || `PO-2605-${waitModalOrder.id?.slice(0, 4)}`;
                  const backendOrderId = waitModalOrder.orderId || localStorage.getItem(`po_to_order_${po}`) || (isOrderUuid(waitModalOrder.id) ? waitModalOrder.id : '');
                  const now = fmtDateTime(new Date());
                  const partnerName = partner?.name || partner?.company || 'Partner';
                  const serviceTitle = waitModalOrder.serviceTh || waitModalOrder.service;
                  const budgetLabel = waitModalOrder.fee || (waitModalOrder.budget ? `฿${String(waitModalOrder.budget).replace(/^฿/, '')}` : '฿0');
                  try {
                    const token = localStorage.getItem("subscriber_token");
                    try {
                      let wf = JSON.parse(localStorage.getItem("cblue_workflow") || "{}");
                      if(wf) {
                        wf.step = isMeetingConfirmation ? 8 : 6;
                        localStorage.setItem("cblue_workflow", JSON.stringify(wf));
                      }
                    } catch(e) {}
                    if (isMeetingConfirmation) {
                      const schedId = `meet-scheduled-${po}`;
                      const meetingSummary = [waitModalMeetingDetails.meetingDateLabel, waitModalMeetingDetails.meetingTimeLabel].filter(Boolean).join(' ');
                      // Use PO-based matching (not waitModalOrder.id) because mockDynReqs IDs are
                      // 'meet-pending-{po}', not the backend UUID stored in waitModalOrder.id
                      const nextReqs = [
                        ...mockDynReqs.filter((r: any) => !(r.po === po && r.type === 'meeting_pending_partner') && r.id !== schedId),
                        { id: schedId, po, title: waitModalOrder.service || serviceTitle, customer: waitModalOrder.customer || 'Ghis Cafe', date: now, createdAt: Date.now(), budget: budgetLabel, tier: waitModalOrder.tier, type: 'meeting_scheduled', step: 8, venue: waitModalMeetingDetails.meetingVenue, meetingDate: waitModalOrder.meetingDate || waitModalMeetingDetails.meetingDateLabel, meetingTime: waitModalOrder.meetingTime || waitModalMeetingDetails.meetingTimeLabel, desc: `Meeting confirmed by partner${meetingSummary ? ` for ${meetingSummary}` : ''}${waitModalMeetingDetails.meetingVenue ? ` at ${waitModalMeetingDetails.meetingVenue}` : ''}. Proceed after the site meeting then mark variation.` },
                      ];
                      const nextActive = mockActiveState.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: true } : x);
                      localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(nextReqs));
                      localStorage.setItem("ghis_mock_active", JSON.stringify(nextActive));
                      const nextPartnerReqs = [
                        ...partnerDynReqs.filter((r: any) => !(r.po === po && ['variation_partner', 'meeting_confirm_partner'].includes(r.type))),
                        { id: `variation-${po}`, orderId: backendOrderId || waitModalOrder.orderId || undefined, po, service: waitModalOrder.service || serviceTitle, serviceTh: waitModalOrder.service || serviceTitle, serviceZh: waitModalOrder.service || serviceTitle, customer: waitModalOrder.customer || 'Ghis Cafe', date: now, createdAt: Date.now(), fee: budgetLabel, budget: String(budgetLabel).replace(/[^0-9]/g, ''), tier: waitModalOrder.tier, description: (mappedOrders as any[]).find((o: any) => o?.po === po)?.description || waitModalOrder?.description || 'Proceed to submit variation request if extra work or price adjustment is required.', location: waitModalOrder?.location || waitModalOrder?.subdistrict || '', type: 'variation_partner', step: 9 },
                      ];
                      localStorage.setItem("partner_mock_dyn_req", JSON.stringify(nextPartnerReqs));
                      setMockDynReqs(nextReqs);
                      setMockActiveState(nextActive);
                      setPartnerDynReqs(nextPartnerReqs);
                      window.dispatchEvent(new Event("storage"));
                      // Update backend: MEETING_REQUESTED → IN_PROGRESS (meeting confirmed; customer page polls and auto-detects)
                      if (backendOrderId && !waitModalOrder.mock && token && String(waitModalOrder.status || '').toUpperCase() !== 'IN_PROGRESS') {
                        fetch(`/api/v1/orders/${backendOrderId}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Partner confirmed meeting time' }),
                        }).catch(() => {});
                        fetch(`/api/v1/orders/${backendOrderId}/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ text: `[SYSTEM] Partner confirmed site meeting for ${po}. Variation request can now be submitted if needed.` }),
                        }).catch(() => {});
                      }
                      setWaitModalOrder(null);
                      return;
                    }

                    let backendAcceptError = "";
                    if (waitModalOrder.id && !waitModalOrder.mock) {
                      const currentStatus = String(waitModalOrder.status || '').toUpperCase();
                      const acceptancePath: Record<string, string[]> = {
                        CREATED: ['MATCHING', 'ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'],
                        MATCHING: ['ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'],
                        ASSIGNED: ['DEPOSIT_PENDING', 'CONFIRMED'],
                        DEPOSIT_PENDING: ['CONFIRMED'],
                        CONFIRMED: [],
                      };
                      for (const nextStatus of acceptancePath[currentStatus] || []) {
                        const hopRes = await fetch(`/api/v1/orders/${backendOrderId || waitModalOrder.id}/status`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ status: nextStatus, note: 'Partner accepted draft PO' }),
                        });
                        if (!hopRes.ok) {
                          backendAcceptError = await hopRes.text();
                          break;
                        }
                      }
                    }

                    const activeStateRaw = localStorage.getItem("ghis_mock_active");
                    const dynReqRaw = localStorage.getItem("ghis_mock_dyn_req");
                    const activeState = activeStateRaw ? JSON.parse(activeStateRaw) : [];
                    const dynReqs = dynReqRaw ? JSON.parse(dynReqRaw) : [];

                    const nextActive = [
                      ...activeState.filter((x: any) => x.po !== po),
                      {
                        id: backendOrderId || waitModalOrder.id,
                        orderId: backendOrderId || waitModalOrder.id,
                        po,
                        title: serviceTitle,
                        customer: waitModalOrder.customer || 'Ghis Cafe',
                        customerName: waitModalOrder.customer || 'Ghis Cafe',
                        fixerAlias: partnerName,
                        partnerName,
                        date: waitModalOrder.date || now,
                        budget: budgetLabel,
                        location: waitModalOrder.location || waitModalOrder.subdistrict || '',
                        tier: waitModalOrder.tier,
                        actionNeeded: true,
                        step: 6,
                        description: waitModalOrder.description,
                      },
                    ];
                    const nextReqs = [
                      ...dynReqs.filter((x: any) => x.po !== po),
                      {
                        id: `pay-${po}`,
                        po,
                        orderId: backendOrderId || waitModalOrder.id,
                        title: serviceTitle,
                        customer: partnerName,
                        date: now,
                        budget: budgetLabel,
                        tier: waitModalOrder.tier,
                        desc: 'Partner accepted the PO. Please pay the processing fee and notify to proceed.',
                        location: waitModalOrder?.location || waitModalOrder?.subdistrict || '',
                        type: 'payment_pending',
                        step: 6,
                      },
                    ];

                    localStorage.setItem("ghis_mock_active", JSON.stringify(nextActive));
                    localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(nextReqs));
                    // Remove the pending_accept entry from partner's queue now that it's accepted
                    const currentPartnerReqs = JSON.parse(localStorage.getItem("partner_mock_dyn_req") || "[]");
                    const updatedPartnerReqs = currentPartnerReqs.filter((r: any) => !(r.po === po && r.type === "pending_accept"));
                    // Add accepted notice so partner sees alert: "PO accepted — awaiting customer payment"
                    if (!updatedPartnerReqs.some((r: any) => r.po === po && r.type === "accept_sent")) {
                      updatedPartnerReqs.push({
                        id: `accepted-${po}`,
                        po,
                        service: waitModalOrder?.service || waitModalOrder?.title || serviceTitle,
                        type: "accept_sent",
                        date: fmtDateTime(Date.now()),
                        createdAt: Date.now(),
                      });
                    }
                    localStorage.setItem("partner_mock_dyn_req", JSON.stringify(updatedPartnerReqs));
                    setPartnerDynReqs(updatedPartnerReqs);
                    setMockActiveState(nextActive);
                    setMockDynReqs(nextReqs);
                    window.dispatchEvent(new Event("storage"));
                    alert(backendAcceptError ? "PO accepted locally. Customer workflow updated, but backend status sync still needs attention." : "PO Accepted Successfully! Customer can now pay fee and proceed.");
                    setWaitModalOrder(null);
                  } catch (e) {
                    console.error(e);
                  }
                }} 
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-md"
              >
                {isMeetingConfirmation ? 'Confirm Meeting Time' : 'Accept PO'}
              </button>
              <button 
                onClick={() => setDeclineModalOpen(true)} 
                className="flex-1 py-3 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-800 font-bold rounded-xl transition"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdpa && (
        <PdpaConsent
          locale={locale}
          prefix={prefix}
          role="fixer"
          onAccept={(ts) => {
            localStorage.setItem("pdpa_consent_partner", ts);
            setShowPdpa(false);
          }}
        />
      )}

      {/* Decline Confirmation Modal */}
      {declineModalOpen && waitModalOrder && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-xl font-bold text-red-700">Decline This Job?</h2>
                <p className="text-xs text-gray-500">{waitModalOrder.service || 'Job'} · {waitModalOrder.po}</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Please provide a reason for declining. This will only be visible to CBLUE admin — the customer will receive a polite system message.
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-300 outline-none mb-4 resize-none"
              rows={4}
              placeholder="e.g. Currently fully booked, unable to take new projects at this time..."
              value={declineComment}
              onChange={e => setDeclineComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setDeclineModalOpen(false); setDeclineComment(''); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
              >
                Go Back
              </button>
              <button
                onClick={async () => {
                  const po = waitModalOrder.po;
                  const backendOrderId = waitModalOrder.orderId
                    || (po ? localStorage.getItem(`po_to_order_${po}`) : '')
                    || (isOrderUuid(waitModalOrder.id) ? waitModalOrder.id : '');
                  const declineReason = declineComment.trim() || 'Currently unavailable for this project';
                  const token = localStorage.getItem('subscriber_token') || '';

                  // 1. Store decline comment for admin only (partner-side localStorage)
                  try {
                    const logs = JSON.parse(localStorage.getItem('admin_decline_logs') || '[]');
                    logs.push({
                      po,
                      orderId: backendOrderId,
                      comment: declineReason,
                      partnerName: partner?.name || partner?.company || 'Partner',
                      declinedAt: new Date().toISOString(),
                    });
                    localStorage.setItem('admin_decline_logs', JSON.stringify(logs));
                    setPartnerDeclineLogs(logs);
                  } catch {}

                  // 2. Remove partner/customer workflow cards immediately (optimistic UI)
                  try {
                    const partnerReqs = JSON.parse(localStorage.getItem('partner_mock_dyn_req') || '[]');
                    const nextPartnerReqs = (Array.isArray(partnerReqs) ? partnerReqs : []).filter((r: any) => r.po !== po);
                    localStorage.setItem('partner_mock_dyn_req', JSON.stringify(nextPartnerReqs));
                    setPartnerDynReqs(nextPartnerReqs);
                  } catch {}
                  try {
                    const dynReqKey = 'ghis_mock_dyn_req';
                    const existingDyn = JSON.parse(localStorage.getItem(dynReqKey) || '[]');
                    const declineAt = Date.now();
                    const declineMsg = `${partner?.name || 'The selected partner'} declined ${waitModalOrder.service || 'your project'} (${po})${declineReason ? ` (${declineReason})` : ''}. Please select another matched professional from Book Fixers & Pros.`;
                    const customerNotice = {
                      id: `partner-declined-${po}`,
                      po,
                      type: 'notice',
                      msg: declineMsg,
                      msgTh: `${partner?.name || 'พาร์ทเนอร์ที่เลือก'} ปฏิเสธ ${waitModalOrder.service || 'โครงการของคุณ'} (${po})${declineReason ? ` (${declineReason})` : ''} กรุณาเลือกมืออาชีพรายอื่นจาก Book Fixers & Pros`,
                      msgZh: `${partner?.name || '选中的合作伙伴'} 拒绝了 ${waitModalOrder.service || '您的项目'} (${po})${declineReason ? `（${declineReason}）` : ''}。请从 Book Fixers & Pros 重新选择其他匹配的专业人士。`,
                      date: fmtDateTime(declineAt),
                      createdAt: declineAt,
                      dot: 'bg-red-400',
                    };
                    const nextDyn = [
                      ...existingDyn.filter((r: any) => r.po !== po && !String(r.id || '').startsWith(`pay-${po}`)),
                      customerNotice,
                    ];
                    localStorage.setItem(dynReqKey, JSON.stringify(nextDyn));
                    setMockDynReqs(nextDyn);
                    try {
                      const chatKey = `chat_messages_${po}`;
                      const chatRows = JSON.parse(localStorage.getItem(chatKey) || '[]');
                      const chatText = `[SYSTEM] ${declineMsg}`;
                      const nextChat = Array.isArray(chatRows) ? [...chatRows] : [];
                      if (!nextChat.some((row: any) => String(row?.text || '') === chatText)) {
                        nextChat.push({
                          id: `workflow-decline-${po}-${declineAt}`,
                          sender: 'system',
                          text: chatText,
                          time: fmtDateTime(declineAt),
                          createdAt: declineAt,
                        });
                        localStorage.setItem(chatKey, JSON.stringify(nextChat));
                        window.dispatchEvent(new CustomEvent('cblue-chat-updated', { detail: { orderId: po } }));
                      }
                    } catch {}
                    if (backendOrderId) {
                      const token = localStorage.getItem('subscriber_token') || '';
                      if (token) {
                        fetch(`/api/v1/orders/${backendOrderId}/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ text: `[SYSTEM] ${declineMsg}` }),
                        }).catch(() => {});
                      }
                    }
                  } catch {}
                  try {
                    const active = JSON.parse(localStorage.getItem('ghis_mock_active') || '[]');
                    const nextActive = (Array.isArray(active) ? active : []).filter((x: any) => x.po !== po);
                    localStorage.setItem('ghis_mock_active', JSON.stringify(nextActive));
                    setMockActiveState(nextActive);
                  } catch {}
                  try {
                    const history = JSON.parse(localStorage.getItem('ghis_mock_history') || '[]');
                    const declinedEntry = {
                      ...waitModalOrder,
                      status: 'CANCELLED',
                      statusName: 'Partner Unavailable',
                      statusNote: `Reason: ${declineReason}`,
                      declineReason,
                      completedAt: Date.now(),
                      statusChangedAt: Date.now(),
                      step: 11,
                      stepName: 'Partner Unavailable',
                    };
                    const nextHistory = [
                      ...(Array.isArray(history) ? history.filter((x: any) => x.po !== po) : []),
                      declinedEntry,
                    ];
                    pruneStorageIfNeeded();
                    localStorage.setItem('ghis_mock_history', JSON.stringify(nextHistory));
                    setMockHistory(nextHistory);
                  } catch {}

                  // 3. Partner alert
                  try {
                    const partnerAlerts = JSON.parse(localStorage.getItem('partner_alerts') || '[]');
                    partnerAlerts.unshift({
                      id: `decline-${po}-${Date.now()}`,
                      type: 'decline_sent',
                      po,
                      title: 'Job Declined',
                      message: `You declined ${waitModalOrder.service || 'the project'} (${po}) · Budget: ${waitModalOrder.budget || 'N/A'}. Reason: ${declineReason}. Customer has been notified to select another professional.`,
                      msgTh: `คุณปฏิเสธ ${waitModalOrder.service || 'โครงการ'} (${po}) · งบประมาณ: ${waitModalOrder.budget || 'ไม่ระบุ'}. เหตุผล: ${declineReason}. ลูกค้าได้รับแจ้งให้เลือกมืออาชีพอื่น`,
                      msgZh: `您拒绝了 ${waitModalOrder.service || '项目'} (${po}) · 预算: ${waitModalOrder.budget || 'N/A'}. 原因: ${declineReason}. 客户已被通知选择其他专业人士。`,
                      timestamp: new Date().toISOString(),
                      createdAt: Date.now(),
                      dot: 'bg-red-500',
                    });
                    localStorage.setItem('partner_alerts', JSON.stringify(partnerAlerts));
                    setPartnerPersistedAlerts(partnerAlerts);
                  } catch {}

                  setDeclineModalOpen(false);
                  setDeclineComment('');
                  setWaitModalOrder(null);
                  window.dispatchEvent(new Event('storage'));
                  window.dispatchEvent(new Event('cblue-workflow-updated'));

                  // 4. Sync backend status (non-blocking) so customer browsers receive CANCELLED alerts.
                  if (backendOrderId && token) {
                    const currentStatus = String(waitModalOrder.status || '').toUpperCase();
                    const declinePath: Record<string, string[]> = {
                      CREATED: ['CANCELLED'],
                      MATCHING: ['CANCELLED'],
                      ASSIGNED: ['CANCELLED'],
                      DEPOSIT_PENDING: ['CANCELLED'],
                      CONFIRMED: ['CANCELLED'],
                      IN_PROGRESS: ['CANCELLED'],
                      MEETING_REQUESTED: ['CANCELLED'],
                    };
                    const hops = declinePath[currentStatus] || ['CANCELLED'];
                    void (async () => {
                      for (const nextStatus of hops) {
                        try {
                          await fetch(`/api/v1/orders/${backendOrderId}/status`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                              status: nextStatus,
                              note: `The selected service provider is unable to proceed with this project. Reason: ${declineReason}. Please select another professional.`,
                            }),
                          });
                        } catch {}
                      }
                    })();
                  }
                }}
                disabled={!declineComment.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {attachmentViewer && <AttachmentViewerModal viewer={attachmentViewer} onClose={() => setAttachmentViewer(null)} />}
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {locale === "th" ? "พาร์ทเนอร์ของเรา" : locale === "zh" ? "我们的合作伙伴" : "Our Partner"}
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                {locale === "th" ? "จัดการงาน คำขอ แชท รายได้ และโปรไฟล์" : locale === "zh" ? "管理工作、请求、聊天、收入和个人资料" : "Manage jobs, requests, chat, earnings, and profile"}
              </p>
            </div>
            {partner ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center text-white font-bold">{partner.name?.charAt(0) || "P"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{partner.name}</p>
                  <p className="text-purple-200 text-xs">{partner.email}</p>
                </div>
                <button
                  onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_partner"); window.dispatchEvent(new Event("storage")); router.push(prefix); }}
                  className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
                >
                  {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-12">
        {/* Not logged in CTA */}
        {!isSubscribed && !loading && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เข้าสู่ระบบพาร์ทเนอร์" : locale === "zh" ? "合作伙伴登录" : "Partner Login"}</h2>
                <p className="text-purple-100 mt-2">{locale === "th" ? "รับงาน จัดการแดชบอร์ด และเพิ่มรายได้" : locale === "zh" ? "接受工作、管理仪表板、增加收入" : "Receive jobs, manage your dashboard, and grow earnings"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`subscription/login?redirect=/fixers`} className="px-6 py-3 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
                </Link>
                <Link href={`fixers/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {isSubscribed && !hasPartnerAccess && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 text-center max-w-2xl mx-auto">
            <div className="text-5xl mb-4">👷‍♂️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {locale === "th" ? "คุณยังไม่ได้ลงทะเบียนเป็นพาร์ทเนอร์" : locale === "zh" ? "您尚未注册成为合作伙伴" : "You are not yet a registered Partner"}
            </h2>
            <p className="text-gray-500 mb-6">
              {locale === "th" ? "สมัครเข้าร่วมกับ CBLUE วันนี้เพื่อรับงานและเพิ่มรายได้ของคุณ" : locale === "zh" ? "立即注册CBLUE，开始接单并增加您的收入。" : "Register with CBLUE today to start receiving jobs and growing your income."}
            </p>
            <Link href={`fixers/register`} className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg">
              {locale === "th" ? "ลงทะเบียนเลย" : locale === "zh" ? "立即注册" : "Register Now"}
            </Link>
          </div>
        )}

        {isSubscribed && hasPartnerAccess && (
          <>
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key ? "bg-purple-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
              {tab.badge ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-white/30 text-white" : "bg-red-100 text-red-700"}`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`mt-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
          <PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={partnerRequestItemsWithProp} scheduledMeetings={allScheduledMeetings} completedJobs={allCompletedJobs} earnings={earningsSeries} stats={stats} notifications={displayNotifications} chats={chatFeed} onJobClick={handleJobClick} onDeclineJob={(job) => { setWaitModalOrder(job); setDeclineModalOpen(true); }} onTabChange={(tab) => setActiveTab(tab as TabKey)} />
        </div>
        {activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs={partnerRequestItemsWithProp} onJobClick={handleJobClick} onDeclineJob={(job) => { setWaitModalOrder(job); setDeclineModalOpen(true); }} priceList={(partner as any)?.priceList} onPropAccept={(p: PropInquiry) => setPropAcceptModal(p)} onPropMeetingConfirm={(p: PropInquiry) => setPropMeetingConfirmModal(p)} onPropRatePartner={(p: PropInquiry) => { setPropPartnerRateStars(0); setPropPartnerRateComment(""); setPropPartnerRateModal(p); }} />}
        {activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeJobs} onJobClick={handleJobClick} priceList={(partner as any)?.priceList} />}
        
        {activeTab === "properties" && <PartnerProperties locale={locale} prefix={prefix} properties={myProperties} propertyInquiries={propInquiries} />}
        {activeTab === "history" && <PartnerHistory locale={locale} completedJobs={allCompletedJobs} />}
        {activeTab === "chat" && <PartnerChats locale={locale} chats={chatFeed} />}
        {activeTab === "notifications" && <PartnerNotifications locale={locale} notifications={displayNotifications} />}
        {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}
          </>
        )}

        <div className="my-10 border-t border-gray-200" />

        {/* Registration Cards */}
        {(!isSubscribed || !hasPartnerAccess) && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Register as Fixer & Pro */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4 text-xl"></div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "สมัครเป็นช่างและมืออาชีพ CBLUE" : locale === "zh" ? "注册成为CBLUE技工和专业人士" : "Register as CBLUE Fixer & Pro"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "เข้าร่วมเครือข่ายช่างมืออาชีพ รับงานทั่วประเทศ" : locale === "zh" ? "加入专业网络，全国接单" : "Join our professional network. Receive jobs nationwide."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "รับงานทั่วประเทศ" : locale === "zh" ? "全国接单" : "Receive jobs nationwide",
                  locale === "th" ? "KYC ยืนยันตัวตน" : locale === "zh" ? "KYC身份验证" : "KYC identity verification",
                  locale === "th" ? "5 ระดับ Economy / Standard / Corporate / Specialist / Expert" : locale === "zh" ? "5个等级：基础到专家" : "5 tiers: Economy to Expert",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`fixers/register`} className="block text-center py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "สมัครเป็นช่าง" : locale === "zh" ? "注册成为技工" : "Register as Fixer"}
              </Link>
            </div>
          </div>

          {/* List Property */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 text-xl"></div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : locale === "zh" ? "发布新房产" : "List New Property"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "ลงประกาศขายหรือเช่าคอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : locale === "zh" ? "发布公寓、别墅、联排别墅或土地出售或出租" : "List condo, house, townhouse, or land for sale or rent."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "เข้าถึงผู้ซื้อและผู้เช่าทั่วไทย" : locale === "zh" ? "触达全国买家和租客" : "Reach buyers & renters nationwide",
                  locale === "th" ? "อัปโหลดรูปภาพและรายละเอียด" : locale === "zh" ? "上传照片和详情" : "Upload photos & details",
                  locale === "th" ? "จัดการประกาศจากแดชบอร์ด" : locale === "zh" ? "从仪表板管理列表" : "Manage listings from dashboard",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`properties/register`} className="block text-center py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "ลงประกาศ" : locale === "zh" ? "发布房产" : "List Property"}
              </Link>
            </div>
          </div>
        </div>

        )}

        {/* Price List Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "ตารางราคาค่าประสานงาน" : locale === "zh" ? "处理费价格表" : "Processing Fee Price List"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ค่าประสานงานที่ลูกค้าจ่ายต่อการจับคู่ 1 ครั้ง" : locale === "zh" ? "客户每次匹配技工/专业人士支付的一次性费用" : "One-time fee per fixer/professional matching"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ค่าประสานงาน" : locale === "zh" ? "费用" : "Fee"}</th>
                  
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "คุณสมบัติ" : locale === "zh" ? "资质" : "Qualifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", fee: "฿100", stars: "", qual: locale === "th" ? "ช่างทั่วไป ประสบการณ์เบื้องต้น" : locale === "zh" ? "普通技工，基础经验" : "General fixer, basic experience", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", fee: "฿400", stars: "", qual: locale === "th" ? "ช่างมีประสบการณ์ ผลงานดี" : locale === "zh" ? "有经验，良好记录" : "Experienced, good track record", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", fee: "฿600", stars: "", qual: locale === "th" ? "ช่างมืออาชีพ หรือทีมงาน" : locale === "zh" ? "专业技工或团队" : "Professional fixer or team", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", fee: "฿800", stars: "", qual: locale === "th" ? "ผู้เชี่ยวชาญเฉพาะทาง มีใบรับรอง" : locale === "zh" ? "认证专家" : "Certified specialist", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", fee: "฿1,000", stars: "", qual: locale === "th" ? "ผู้เชี่ยวชาญระดับสูง 10+ ปี" : locale === "zh" ? "高级专家，10+年经验" : "Senior expert, 10+ years", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{r.fee}</td>
                      
                      <td className="py-3 px-4 text-gray-600">{r.qual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              {locale === "th" ? "* ค่าประสานงานเป็นค่าบริการแพลตฟอร์ม ไม่รวมค่าจ้างช่าง" : locale === "zh" ? "* 仅平台费用，不包括技工费用。客户直接协商价格。" : "* Platform fee only, excludes fixer charges. Customers negotiate pricing directly."}
            </p>
          </div>
        </div>

        {/* Tier Qualification Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "คุณสมบัติระดับช่าง (Tier Qualification)" : locale === "zh" ? "等级资质标准" : "Tier Qualification Criteria"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ระดับบริการกำหนดจากประสบการณ์ ผลงาน และใบรับรอง" : locale === "zh" ? "由经验、业绩和证书决定" : "Determined by experience, track record, and certifications"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ประสบการณ์" : locale === "zh" ? "经验" : "Experience"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ผลงาน" : locale === "zh" ? "过往项目" : "Past Projects"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ใบรับรอง" : locale === "zh" ? "证书" : "Certifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", exp: "1+ years", projects: locale === "th" ? "ไม่จำเป็น" : locale === "zh" ? "不需要" : "Not required", certs: locale === "th" ? "ไม่จำเป็น" : locale === "zh" ? "不需要" : "Not required", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", exp: "3+ years", projects: "3+", certs: locale === "th" ? "แนะนำ" : locale === "zh" ? "建议" : "Recommended", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", exp: "5+ years", projects: "10+", certs: locale === "th" ? "จำเป็น" : locale === "zh" ? "必需" : "Required", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", exp: "7+ years", projects: "20+", certs: locale === "th" ? "จำเป็น + เฉพาะทาง" : locale === "zh" ? "必需 + 专业" : "Required + specialized", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", exp: "10+ years", projects: "50+", certs: locale === "th" ? "จำเป็น + ขั้นสูง" : locale === "zh" ? "必需 + 高级" : "Required + advanced", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-gray-600">{r.exp}</td>
                      <td className="py-3 px-4 text-gray-600">{r.projects}</td>
                      <td className="py-3 px-4 text-gray-600">{r.certs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              {locale === "th" ? "* ช่างสามารถอัปเกรดระดับได้เมื่อมีคุณสมบัติครบถ้วน" : locale === "zh" ? "* 技工满足资质后可升级等级" : "* Fixers can upgrade their tier when qualifications are met."}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1"> {locale === "th" ? "ข้อจำกัดความรับผิดชอบ" : locale === "zh" ? "免责声明" : "Disclaimer"}</p>
          <p>{locale === "th"
            ? "CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น ราคาที่ตกลง ขอบเขตงาน และการชำระเงินระหว่างคุณกับพาร์ทเนอร์ (ช่าง/ทีมโครงการ/มืออาชีพ/ผู้ลงประกาศอสังหาริมทรัพย์) เป็นข้อตกลงโดยตรงระหว่างทั้งสองฝ่าย CBLUE ไม่รับผิดชอบต่อข้อพิพาทด้านราคา คุณภาพงาน หรือข้อตกลงที่เกิดขึ้นหลังกระบวนการจับคู่"
            : locale === "zh"
            ? "CBLUE 仅作为匹配平台。您与合作伙伴（技工/项目团队/专业人士/房产发布者）之间约定的价格、工作范围和付款为双方直接安排。CBLUE 不对匹配过程后产生的价格争议、工作质量或协议承担责任。"
            : "CBLUE acts as a matching platform only. The agreed price, scope of work, and payment between you and the partner (fixer/project team/professional/property lister) is a direct arrangement between both parties. CBLUE is not responsible for pricing disputes, work quality, or agreements made after the matching process."
          }</p>
          <p className="mt-2 font-semibold text-gray-700">{locale === "th"
            ? "📌 ค่าธรรมเนียมดำเนินการไม่สามารถคืนเงินได้ เนื่องจากบริการจับคู่ได้ดำเนินการเสร็จสิ้นแล้วเมื่อลูกค้าเริ่มกระบวนการ ค่าธรรมเนียมนี้ครอบคลุมการจับคู่ AI, การตรวจสอบพาร์ทเนอร์, การออก PO และการจัดการการสื่อสาร"
            : locale === "zh"
            ? "📌 处理费不可退还，因为匹配服务在客户发起流程后已完成。此费用涵盖AI匹配、合作伙伴验证、PO签发和通信协调。"
            : "📌 The processing fee is non-refundable as the matching service is completed once the customer initiates the process. This fee covers AI matching, partner verification, PO issuance, and communication facilitation."
          }</p>
        </div>
        {/* Data Retention Notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">🛡️ {locale === "th" ? "นโยบายการเก็บรักษาข้อมูล (PDPA)" : locale === "zh" ? "数据保留政策 (PDPA)" : "Data Retention Policy (PDPA)"}</p>
          <p>{locale === "th"
            ? "ความยินยอม: 3 ปี | ประวัติบริการ: 18 เดือน | บัญชีไม่ใช้งาน: ลบหลัง 12 เดือน"
            : locale === "zh"
            ? "同意记录: 3年 | 服务历史: 18个月 | 非活跃账户: 12个月后删除"
            : "Consent: 3 years | Service history: 18 months | Inactive accounts: deleted after 12 months"
          }</p>
        </div>
      </div>
    </div>
  );
}

/* ===== PARTNER OVERVIEW ===== */
function PartnerOverview({ locale, partner, activeJobs, incomingJobs, scheduledMeetings, completedJobs, earnings, stats, notifications, chats = [], onJobClick, onDeclineJob, onTabChange }: { locale: string; partner: PartnerInfo | null; activeJobs: any[]; incomingJobs: any[]; scheduledMeetings: any[]; completedJobs: any[]; earnings: any[]; stats: any; notifications: any[]; chats?: any[]; onJobClick?: (job: any) => void; onDeclineJob?: (job: any) => void; onTabChange?: (tab: string) => void; }) {
  const earnings12 = earnings;
  const maxEarning = earnings12.length > 0 ? Math.max(...earnings12.map(e => e.amount)) : 0;
  const recentIncomingChats = chats.filter((c: any) => c.hasIncoming).slice(0, 3);
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: locale === "th" ? "งานที่ใช้งานอยู่" : "Active Jobs", value: activeJobs?.length || 0, icon: "", color: "text-amber-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : "Completed", value: completedJobs?.length || 0, icon: "", color: "text-green-600" },
          { label: locale === "th" ? "รายได้ต่อเดือน" : "Monthly Earn", value: stats?.monthlyEarnings || "฿0", icon: "", color: "text-indigo-600" },
          { label: locale === "th" ? "คะแนน" : "Rating", value: `${stats?.rating || 0} `, icon: "", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile + Earnings row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile */}
        {partner && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">{partner.name?.charAt(0)}</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{partner.name}</h3>
                <p className="text-sm text-gray-500">{partner.email}</p>
                <p className="text-xs text-gray-400">{partner.phone}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{locale === "th" ? "ใช้งานอยู่" : locale === "zh" ? "活跃" : "Active"}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{partner.tier || "Standard Tier"}</span>
              <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">{locale === "th" ? "ยืนยันแล้ว" : locale === "zh" ? "已验证" : "Verified"}</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{locale === "th" ? "KYC ✓ ยืนยันแล้ว" : locale === "zh" ? "KYC ✓ 已验证" : "KYC ✓"}</span>
            </div>
          </div>
        )}

        {/* Earnings Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">{locale === "th" ? "รายได้รายเดือน" : locale === "zh" ? "月收入" : "Monthly Earnings"}</h3>
          <p className="text-xs text-gray-400 mb-4">{locale === "th" ? "เดือนนี้ + 12 เดือนล่าสุด" : locale === "zh" ? "本月 + 近12个月" : "This month & last 12 months"}</p>
          {/* Bar chart — heights in px relative to 120px max bar */}
          <div className="flex items-end gap-px" style={{ height: "9rem" }}>
            {earnings12.map((e) => {
              const pct = maxEarning > 0 ? e.amount / maxEarning : 0;
              const barPx = Math.max(6, Math.round(pct * 96));
              const label = locale === "th" ? e.monthTh : locale === "zh" ? e.monthZh : e.month;
              return (
                <div key={e.month} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
                  <span className="text-[8px] font-bold text-gray-500 mb-0.5 leading-none">฿{(e.amount / 1000).toFixed(0)}k</span>
                  <div className="w-full rounded-t-sm" style={{ height: `${barPx}px`, background: "linear-gradient(to top,#9333ea,#818cf8)" }} />
                  <span className="text-[7px] text-gray-400 mt-0.5 leading-none truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Meetings, alerts, and chats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:col-span-1">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">⏰ {locale === "th" ? "การนัดหมายที่จะมาถึง" : locale === "zh" ? "即将到来的会议" : "Upcoming Meetings"} <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("requests")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</span></h3>
          {scheduledMeetings.length > 0 ? (
            <div className="space-y-2">
              {scheduledMeetings.slice(0, 3).map((meeting: any) => (
                <div key={meeting.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <p className="text-sm font-bold text-gray-800">{meeting.title} ({meeting.po})</p>
                  <p className="text-xs text-gray-500 mt-1">{formatMeetingDateTimeLabel(meeting.meetingDate || meeting.date, meeting.meetingTime)}</p>
                  <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "สถานที่:" : locale === "zh" ? "地点:" : "Location:"} {meeting.meetingVenue || meeting.venue || meeting.subdistrict || '-'} | {locale === "th" ? "ลูกค้า:" : locale === "zh" ? "客户:" : "Customer:"} {meeting.customer}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">
              {locale === "th" ? "ไม่มีการนัดหมายที่จะมาถึง" : locale === "zh" ? "暂无会议" : "No upcoming meetings"}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:col-span-2">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">{locale === "th" ? "การแจ้งเตือนล่าสุด" : locale === "zh" ? "最近通知" : "Recent Alerts"} <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("notifications")}>View All</span></h3>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                <span className={`w-2 h-2 rounded-full ${n.dot} flex-shrink-0`} />
                <p className="text-xs text-gray-700 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">{locale === "th" ? "แชทที่เข้ามาล่าสุด" : locale === "zh" ? "最近收到的来信" : "Recent incoming chats"} <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("chat")}>View All</span></h3>
        <div className="space-y-2">
          {recentIncomingChats.length > 0 ? recentIncomingChats.map((c: any) => (
            <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg ${c.unread > 0 ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{String(c.name || "C").slice(-3)}</div>
                {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{c.name}{c.service && c.service !== c.po && c.service !== c.name && !String(c.name || '').includes(String(c.service || '')) ? <span className="text-gray-400 font-normal"> · {c.service}</span> : null}</p>
                <p className="text-xs text-gray-500 truncate">{c.incomingMsg}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400">{c.incomingTime || ""}</span>
                {c.unread > 0 && <span className="block mt-0.5 ml-auto w-5 h-5 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
              </div>
            </div>
          )) : <p className="text-sm text-gray-500 py-4 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent incoming chats"}</p>}
        </div>
      </div>

      {/* Incoming Requests Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("requests")}>View All</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {incomingJobs.slice(0, 3).map((req) => (
            <div key={req.id} className="px-6 py-4 flex items-center gap-4 transition cursor-default">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}{(req.po || req.step) ? <span className="text-xs font-normal text-gray-400">{req.po ? ` · ${req.po}` : ''}{req.step ? ` · Step ${req.step} of ${isPropertyWorkflowJob(req) ? 8 : 11}` : ''}</span> : null}</p>
                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {getJobAmountPrefix(req, locale)}: {getJobAmountValue(req)}</p>
                {(req.meetingVenue || req.subdistrict) && <p className="text-xs text-gray-500 mt-0.5">{[req.meetingVenue || req.subdistrict].filter(Boolean).join(' · ')}</p>}
                <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{stripWorkflowPrefix(req.description || req.desc || req.statusNote)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                {req.workflowType ? (
                  <button onClick={(e) => { e.stopPropagation(); onTabChange && onTabChange("requests"); requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" })); window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 50); }} className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">Open Request</button>
                ) : (
                  <>
                    {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                    <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
                    <button onClick={(e) => { e.stopPropagation(); onDeclineJob ? onDeclineJob(req) : onJobClick?.(req); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>


        {/* Active Jobs Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"> {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("active")}>View All</span>
            <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {activeJobs.slice(0, 5).map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}{job.po ? <span className="text-xs font-normal text-gray-400"> · {job.po}</span> : null}</p>
                    <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; {getJobAmountPrefix(job, locale)}: {getJobAmountValue(job)}</p>
                    {getJobListingTypeLabel(job, locale) && <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getJobListingTypeLabel(job, locale)}</p>}
                    {job.subdistrict && <p className="text-xs text-gray-500 mt-0.5">{job.subdistrict}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || "bg-gray-100 text-gray-600"}`}>{job.tier}</span>
                    {job.actionNeeded && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">{locale === "th" ? "ต้องดำเนินการ" : locale === "zh" ? "需要操作" : "Action Needed"}</span>}
                    {job.earnings && <span className="text-xs font-bold text-gray-700">{job.earnings}</span>}
                  </div>
                </div>
                {job.actionNeededDetail && (
                  <p className="text-xs text-red-600 mt-1">{job.actionNeededDetail}</p>
                )}
                <div className="mt-2 w-full pt-1">
                  <div className="w-2/3 overflow-x-auto pb-4 hide-scrollbar">
                    <div className="flex items-center min-w-max relative px-2">
                    {(() => {
                        const flow = getWorkflowProgressConfig(job);
                        const currentStep = Number(job.mockStep || job.step || (job.status === 'COMPLETED' ? flow.completeStep : flow.fallbackStep));
                        return (
                          <>
                      <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
                      <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - flow.startStep) / (flow.steps.length - 1)) * 100))}%` }}></div>
                      
                      {flow.steps.map((s, i) => {
                        const stepNum = i + flow.startStep;
                        const isCompleted = stepNum < currentStep;
                        const isCurrent = stepNum === currentStep;
                        return (
                          <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-gray-300'}`}>
                              {isCompleted ? '✓' : ''}
                            </div>
                            <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                              {s}
                            </span>
                          </div>
                        );
                      })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {getStatusLabel(job.status, locale) !== "" && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent History</h2>
            <span className="text-xs text-purple-600 font-bold cursor-pointer hover:underline" onClick={() => onTabChange && onTabChange("history")}>View All →</span>
          </div>
          <div className="space-y-3 p-4">
            {completedJobs.slice(0, 2).length > 0 ? completedJobs.slice(0, 2).map((h) => (
              <WorkflowHistoryCard key={h.id || h.po} item={h} compact locale={locale} />
            )) : (
              <div className="py-6 text-center text-gray-500">No completed jobs yet.</div>
            )}
          </div>
        </div>
    </div>
  );
}


/* ===== PARTNER JOBS (Active) ===== */


/* ===== PARTNER JOBS (Active) ===== */
const EMPTY_VAR_ROWS = () => [{ item: '', qty: '', unit: '', rate: '', amount: '' }];
function PartnerJobs({ locale, activeJobs, onJobClick, priceList }: { locale: string; activeJobs: any[]; onJobClick?: (job: any) => void; priceList?: any[]; }) {
  const [variationModal, setVariationModal] = React.useState<any>(null);
  const [variationDesc, setVariationDesc] = React.useState("");
  const [variationRows, setVariationRows] = React.useState<{item:string;qty:string;unit:string;rate:string;amount:string}[]>(EMPTY_VAR_ROWS());
  const [variationAttachUrls, setVariationAttachUrls] = React.useState<string[]>([]);
  const [attachmentViewer, setAttachmentViewer] = React.useState<AttachmentViewerState>(null);
  React.useEffect(() => {
    let isMounted = true;
    if (!variationModal) { setVariationAttachUrls([]); return; }
    const po = variationModal.po;
    const urls: string[] = [];
    const directSources = [
      variationModal?.issueImage,
      variationModal?.image,
      variationModal?.fileUrl,
      variationModal?.attachmentUrl,
      variationModal?.documentUrl,
      ...(Array.isArray(variationModal?.attachments) ? variationModal.attachments : []),
      ...(Array.isArray(variationModal?.files) ? variationModal.files : []),
      ...(Array.isArray(variationModal?.projectImages) ? variationModal.projectImages : []),
      ...(Array.isArray(variationModal?.images) ? variationModal.images : []),
      ...(Array.isArray(variationModal?.imageUrls) ? variationModal.imageUrls : []),
      ...(Array.isArray(variationModal?.metadata?.images) ? variationModal.metadata.images : []),
      ...(Array.isArray(variationModal?.metadata?.attachments) ? variationModal.metadata.attachments : []),
      ...(Array.isArray(variationModal?.metadata?.files) ? variationModal.metadata.files : []),
      variationModal?.metadata?.issueImageUrl,
      variationModal?.metadata?.issueImage,
    ]
      .flatMap((item: any) => collectAttachmentUrls(item))
      .filter(Boolean);
    urls.push(...directSources);
    try { const m = JSON.parse(localStorage.getItem('cblue_po_attachments') || '{}'); if (po && Array.isArray(m[po])) urls.push(...m[po].flatMap((entry: any) => collectAttachmentUrls(entry)).filter(Boolean)); } catch {}
    try { const m = JSON.parse(localStorage.getItem('cblue_order_attachments') || '{}'); const oid = variationModal.orderId || (po ? localStorage.getItem(`po_to_order_${po}`) : ''); if (oid && Array.isArray(m[oid])) urls.push(...m[oid].flatMap((entry: any) => collectAttachmentUrls(entry)).filter(Boolean)); } catch {}
    try { const rawFiles = (typeof window !== 'undefined' ? (window as any).__cblue_files_by_po : null) || {}; const files: File[] = po && Array.isArray(rawFiles[po]) ? rawFiles[po] : []; files.forEach(f => { try { urls.push(URL.createObjectURL(f)); } catch {} }); } catch {}
    const deduped = Array.from(new Set(urls.flatMap((entry: any) => collectAttachmentUrls(entry)).filter(Boolean)));
    if (deduped.length > 0) { if (isMounted) setVariationAttachUrls(deduped); return; }
    // Fetch from backend as cross-device fallback
    void (async () => {
      const token = localStorage.getItem('subscriber_token') || '';
      const orderLookup = await fetchAttachmentUrlsByPoFromOrders({ po, token });
      if (orderLookup.urls.length > 0 && isMounted) {
        setVariationAttachUrls(orderLookup.urls);
        return;
      }
      const orderId = await resolveOrderIdByPo({
        po,
        fallbackOrderId:
          variationModal.orderId ||
          orderLookup.orderId ||
          (isOrderUuid(variationModal?.id) ? variationModal.id : ''),
        token,
      });
      if (!orderId || !token) return;
      try {
        const attachmentAttempt = await fetchWithSubscriberAuthRetry({
          endpoint: `/api/v1/orders/${orderId}/attachments`,
          token,
        });
        const res = attachmentAttempt.response;
        if (!res) return;
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        const backendUrls = Array.from(
          new Set(
            (Array.isArray(data) ? data : [])
              .flatMap((item: any) => collectAttachmentUrls(item))
              .filter(Boolean),
          ),
        );
        setVariationAttachUrls(backendUrls);
      } catch {
        // non-blocking
      }
    })();
    return () => { isMounted = false; };
  }, [variationModal]);
  const [ratingModal, setRatingModal] = React.useState<any>(null);
  const [ratingStars, setRatingStars] = React.useState(5);
  const [completeModal, setCompleteModal] = React.useState<any>(null);
  const [completeNote, setCompleteNote] = React.useState("");
  const writePartnerReqs = (updater: (items: any[]) => any[]) => {
    try {
      const current = JSON.parse(localStorage.getItem("partner_mock_dyn_req") || "[]");
      const next = updater(Array.isArray(current) ? current : []);
      localStorage.setItem("partner_mock_dyn_req", JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };
  const handlePartnerAction = (job: any, action: 'variation' | 'complete' | 'rate', extraData?: string) => {
    try {
      const po = job.po || job.id;
      const createdAt = Date.now();
      const token = localStorage.getItem("subscriber_token") || "";
      const orderDbId = job.orderId || localStorage.getItem(`po_to_order_${po}`) || (isOrderUuid(job.id) ? job.id : "");
      const fmtDt = (d: number) => {
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      };
      const postSystemMsg = (text: string) => {
        if (token && orderDbId) {
          fetch(`/api/v1/orders/${orderDbId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text }),
          }).catch(() => {});
        }
      };
      const dynReqs = JSON.parse(localStorage.getItem("ghis_mock_dyn_req") || "[]");
      if (action === 'variation') {
        const varId = `var-${po}`;
        const varNote = extraData || 'Your partner has submitted a variation for your approval. Please review and confirm to proceed.';
        const partnerRequest = normalizeVariationPartnerNote(varNote);
        if (partnerRequest) storeVariationPartnerNote(po, partnerRequest);
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: varId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: varNote, location: job.location || job.subdistrict || '', type: 'variation_pending', step: 9 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        // Update active BEFORE writePartnerReqs to prevent race condition in buildChatFeed
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        try { localStorage.setItem(`partner_variation_sent_${po}`, '1'); } catch {}
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("cblue-workflow-updated"));
        postSystemMsg(`[SYSTEM] Partner has submitted a variation request for ${po}. Please review in your Requests tab. [VARIATION_DATA]${varNote}[/VARIATION_DATA]`);
      } else if (action === 'complete') {
        const complId = `compl-${po}`;
        const previousPartnerRequest = resolveVariationPartnerNote(po);
        const completeDesc = extraData?.trim() ? `Partner completion request: ${extraData.trim()}` : 'Work is completed. Please review and mark as complete to close this project.';
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: complId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: completeDesc, location: job.location || job.subdistrict || '', partnerRequest: previousPartnerRequest, partnerNote: previousPartnerRequest, variationRequest: previousPartnerRequest, type: 'complete_pending', step: 10 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        // Update active BEFORE writePartnerReqs to prevent race condition in buildChatFeed
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 10, mockStep: 10, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        try { localStorage.setItem(`partner_complete_sent_${po}`, '1'); } catch {}
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['complete_partner', 'variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("cblue-workflow-updated"));
        postSystemMsg(`[SYSTEM] Partner has marked the job as complete for ${po}. Please review and confirm in your Requests tab. [COMPLETE_DATA]${completeDesc}[/COMPLETE_DATA]`);
      } else if (action === 'rate') {
        const rating = extraData || '5';
        // Update active/history BEFORE writePartnerReqs so buildChatFeed sees historyEntry and skips
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const hist = JSON.parse(localStorage.getItem("ghis_mock_history") || "[]");
        const updated = active.filter((x: any) => x.po !== po);
        const completed = { ...(active.find((x: any) => x.po === po) || job), step: 11, completedAt: createdAt, partnerRating: Number(rating) };
        localStorage.setItem("ghis_mock_active", JSON.stringify(updated));
        pruneStorageIfNeeded();
        localStorage.setItem("ghis_mock_history", JSON.stringify([...hist, completed]));
        try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
        try { localStorage.removeItem(`partner_variation_sent_${po}`); localStorage.removeItem(`partner_complete_sent_${po}`); } catch {}
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && x.type === 'rate_partner')));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("cblue-workflow-updated"));
        postSystemMsg(`[SYSTEM] Partner has rated this project ${rating}/5 stars. The job is now complete.`);
      }
    } catch (e) { console.error(e); }
  };
  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"> {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
        <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {activeJobs.map((job) => (
          <div key={job.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}{job.po ? <span className="text-xs font-normal text-gray-400"> · {job.po}</span> : null}</p>
                  <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; {getJobAmountPrefix(job, locale)}: {getJobAmountValue(job)}</p>
                  {getJobListingTypeLabel(job, locale) && <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getJobListingTypeLabel(job, locale)}</p>}
                  {job.subdistrict && <p className="text-xs text-gray-500 mt-0.5">{job.subdistrict}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || "bg-gray-100 text-gray-600"}`}>{job.tier}</span>
                  {job.actionNeeded && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">{locale === "th" ? "ต้องดำเนินการ" : locale === "zh" ? "需要操作" : "Action Needed"}</span>}
                  {job.earnings && <span className="text-xs font-bold text-gray-700">{job.earnings}</span>}
                  {getStatusLabel(job.status, locale) !== "" && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>}
                  {(job.mockStep === 9 || (job.step === 9)) && (
                    <button onClick={() => {
                      setVariationModal(job); setVariationDesc("");
                      // Refresh breakdown so customer's Approve Variation reads correct multi-item data
                      try {
                        let descToUse = String(job?.description || job?.desc || '');
                        if (!descToUse || /proceed to submit variation/i.test(descToUse)) {
                          for (const k of ['ghis_mock_active', 'ghis_mock_dyn_req', 'partner_mock_dyn_req']) {
                            try { const items = JSON.parse(localStorage.getItem(k) || '[]'); const found = (Array.isArray(items) ? items : []).find((r: any) => r?.po === job?.po); if ((found?.description || found?.desc) && !/proceed to submit variation/i.test(found.description || found.desc || '')) { descToUse = found.description || found.desc || ''; break; } } catch {}
                          }
                        }
                        const total = parseFloat(String(job?.budget || job?.fee || '').replace(/[฿,]/g, '')) || 0;
                        let pl = priceList ?? [];
                        if (pl.length === 0) { try { const stored = localStorage.getItem(`cblue_partner_pricelist_${job?.po}`); if (stored) pl = JSON.parse(stored); } catch {} }
                        if (pl.length === 0) { try { const stored = localStorage.getItem('cblue_partner_pricelist_general'); if (stored) pl = JSON.parse(stored); } catch {} }
                        const bd = computeBudgetBreakdown(descToUse, pl, total);
                        if (bd && bd.length > 0 && job?.po) localStorage.setItem(`cblue_po_breakdown_${job.po}`, JSON.stringify(bd));
                        if (pl && pl.length > 0 && job?.po) localStorage.setItem(`cblue_partner_pricelist_${job.po}`, JSON.stringify(pl));
                      } catch {}
                    }} className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full transition">Submit Variation</button>
                  )}
                  {(job.mockStep === 10 || (job.step === 10)) && (
                    <button onClick={() => { setCompleteNote(""); setCompleteModal(job); }} className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition">Mark Complete</button>
                  )}
                  {(job.mockStep === 11 || (job.step === 11)) && (
                    <button onClick={() => { setRatingModal(job); setRatingStars(5); }} className="text-xs px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition">Rate Customer</button>
                  )}
                </div>
              </div>
              {job.actionNeededDetail && (
                <p className="text-xs text-red-600 mt-1">{job.actionNeededDetail}</p>
              )}
              <div className="mt-2 w-full pt-1">
                <div className="w-2/3 overflow-x-auto pb-4 hide-scrollbar">
                  <div className="flex items-center min-w-max relative px-2">
                    {(() => {
                      const flow = getWorkflowProgressConfig(job);
                      const currentStep = Number(job.mockStep || job.step || (job.status === 'COMPLETED' ? flow.completeStep : flow.fallbackStep));
                      return (
                        <>
                    <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
                    <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - flow.startStep) / (flow.steps.length - 1)) * 100))}%` }}></div>
                    {flow.steps.map((s, i) => {
                      const stepNum = i + flow.startStep;
                      const isCompleted = stepNum < currentStep;
                      const isCurrent = stepNum === currentStep;
                      return (
                        <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-gray-300'}`}>
                            {isCompleted ? '✓' : ''}
                          </div>
                          <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                            {s}
                          </span>
                        </div>
                      );
                    })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
    {/* Variation Modal */}
    {variationModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[calc(100dvh-6rem)] overflow-y-auto my-4">
          <div className="bg-amber-500 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Submit Variation</h3>
            <p className="text-amber-100 text-sm mt-1">{variationModal.po} &middot; {variationModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <strong>Step 9 of 11 • Variation.</strong> Review the original PO budget, describe the extra scope or revised pricing, and send it to the customer for approval.
            </div>
            <WorkflowModalMeta
              step={9}
              typeOfWork={variationModal.service || 'Project'}
              actionText="Review the original PO and send your variation request to the customer for approval."
              po={variationModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(variationModal.customer, 'Customer')}
              budget={toCurrencyLabel(variationModal.budget)}
              location={(() => { const loc = variationModal.location || variationModal.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; const m = String(variationModal.description || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : 'Unknown'; })()}
              projectDetails={stripWorkflowPrefix(variationModal.description || variationModal.desc || variationModal.projectDetails || variationModal.service || '')}
            />
            {/* Uploaded Files — lets partner reference customer photos when writing variation */}
            <div className="flex justify-between items-center rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs">
              <span className="text-amber-800 font-semibold">Uploaded Files</span>
              <button type="button" className={`font-semibold ${variationAttachUrls.length > 0 ? 'text-sky-600 hover:underline' : 'text-gray-400'}`} onClick={() => {
                const viewer = createAttachmentViewerState({
                  title: 'Uploaded Files',
                  po: variationModal.po,
                  prefix: 'attachment',
                  urls: variationAttachUrls,
                });
                if (!viewer) {
                  alert('No downloadable file found right now.');
                  return;
                }
                setAttachmentViewer(viewer);
              }}>
                {variationAttachUrls.length > 0 ? 'View & Download' : 'No files yet'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Original Budget</label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                {(() => {
                  const varDesc = String(variationModal.description || variationModal.desc || variationModal.projectDetails || '');
                  const varTotal = parseFloat(String(variationModal.budget || '').replace(/[฿,]/g, '')) || 0;
                  let varPl = priceList ?? [];
                  if (varPl.length === 0) { try { const stored = localStorage.getItem(`cblue_partner_pricelist_${variationModal.po}`); if (stored) varPl = JSON.parse(stored); } catch {} }
                  if (varPl.length === 0) { try { const stored = localStorage.getItem('cblue_partner_pricelist_general'); if (stored) varPl = JSON.parse(stored); } catch {} }
                  let bd = computeBudgetBreakdown(varDesc, varPl, varTotal);
                  if (bd && bd.length > 0) { try { localStorage.setItem(`cblue_po_breakdown_${variationModal.po}`, JSON.stringify(bd)); } catch {} }
                  if (!bd || bd.length === 0) { try { const stored = JSON.parse(localStorage.getItem(`cblue_po_breakdown_${variationModal.po}`) || 'null'); if (Array.isArray(stored) && stored.length > 0) bd = stored as BudgetBreakdownItem[]; } catch {} }
                  if (bd && bd.length >= 1) {
                    return (
                      <div className="font-mono text-xs space-y-0.5">
                        {bd.map((it, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-gray-600">{i + 1}) {it!.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                            <span className="font-semibold text-amber-700 shrink-0">= ฿{it!.total.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-2 pt-1 border-t border-amber-200 font-bold text-sm">
                          <span className="text-amber-900">Budget</span>
                          <span className="text-amber-900">= ฿{bd.reduce((s, it) => s + (it?.total ?? 0), 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }
                  return <span className="font-bold text-amber-800">{toCurrencyLabel(variationModal.budget)}</span>;
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Original PO total. Add variation line items below.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Variation Price List</label>
              <div className="overflow-x-auto rounded-xl border border-amber-100">
                <table className="w-full text-xs">
                  <thead><tr className="bg-amber-50 text-amber-800">
                    <th className="px-2 py-2 text-left font-semibold">Item</th>
                    <th className="px-2 py-2 text-right font-semibold w-12">Qty</th>
                    <th className="px-2 py-2 text-left font-semibold w-14">Unit</th>
                    <th className="px-2 py-2 text-right font-semibold w-20">Rate (฿)</th>
                    <th className="px-2 py-2 text-right font-semibold w-20">Amount (฿)</th>
                    <th className="px-1 py-2 w-6"></th>
                  </tr></thead>
                  <tbody>
                    {variationRows.map((row, idx) => {
                      const qty = parseFloat(row.qty) || 0;
                      const rate = parseFloat(row.rate.replace(/,/g, '')) || 0;
                      const amount = qty > 0 && rate > 0 ? qty * rate : (parseFloat(row.amount.replace(/,/g,'')) || 0);
                      return (
                        <tr key={idx} className="border-t border-amber-50">
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Item description" value={row.item} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, item: e.target.value})); }} /></td>
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="0" value={row.qty} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, qty: e.target.value, amount: String(parseFloat(e.target.value||'0') * (parseFloat(vr.rate.replace(/,/g,''))||0) || '')})); }} /></td>
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="unit" value={row.unit} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, unit: e.target.value})); }} /></td>
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="0" value={row.rate} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, rate: e.target.value, amount: String((parseFloat(vr.qty)||0) * (parseFloat(e.target.value.replace(/,/g,''))||0) || '')})); }} /></td>
                          <td className="px-2 py-1 text-right text-amber-700 font-bold">{amount > 0 ? amount.toLocaleString() : '-'}</td>
                          <td className="px-1 py-1"><button onClick={() => { if (variationRows.length > 1) setVariationRows(variationRows.filter((_, i) => i !== idx)); }} className="text-gray-400 hover:text-red-500 text-base leading-none">×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t border-amber-200 bg-amber-50">
                    <td colSpan={4} className="px-2 py-2 font-semibold text-amber-800 text-right">Total Variation:</td>
                    <td className="px-2 py-2 text-right font-bold text-amber-900">฿{variationRows.reduce((sum, row) => { const q = parseFloat(row.qty)||0; const r2 = parseFloat(row.rate.replace(/,/g,''))||0; return sum + (q > 0 && r2 > 0 ? q*r2 : parseFloat(row.amount.replace(/,/g,''))||0); }, 0).toLocaleString()}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
              <button onClick={() => setVariationRows([...variationRows, { item: '', qty: '', unit: '', rate: '', amount: '' }])} className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-semibold">+ Add Row</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Note / Description <span className="text-red-500">*</span></label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                rows={3}
                placeholder="Describe the variation scope, extra work, or cost changes..."
                value={variationDesc}
                onChange={e => setVariationDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  if (!variationDesc.trim()) return;
                  const priceListRows = buildVariationPriceListRows(variationRows);
                  if (variationModal?.po) {
                    storeVariationPriceList(variationModal.po, priceListRows);
                  }
                  const tableText = priceListRows.length > 0 ? `\n\nPrice List:\n${formatVariationPriceListText(priceListRows)}` : '';
                  handlePartnerAction(variationModal, 'variation', `Partner variation request: ${variationDesc.trim()}${tableText}`);
                  setVariationRows(EMPTY_VAR_ROWS());
                  setVariationModal(null);
                }}
                disabled={!variationDesc.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Submit Variation</button>
              <button onClick={() => { setVariationRows(EMPTY_VAR_ROWS()); setVariationModal(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Rating Modal */}
    {ratingModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-y-auto max-h-[calc(100dvh-6rem)]">
          <div className="bg-sky-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Rate Customer</h3>
            <p className="text-sky-200 text-sm mt-1">{ratingModal.po} &middot; {ratingModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={11}
              typeOfWork={ratingModal.service || 'Project'}
              actionText="Rate the customer to close this job and move it to history."
              po={ratingModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(ratingModal.customer, 'Customer')}
              budget={toCurrencyLabel(ratingModal.budget || ratingModal.fee)}
              location={(() => { const loc = ratingModal.location || ratingModal.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; const m = String(ratingModal.description || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : 'Unknown'; })()}
              projectDetails={stripWorkflowPrefix(ratingModal.description || ratingModal.desc || ratingModal.projectDetails || ratingModal.service || '')}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Your Rating</label>
              <div className="flex gap-2 text-3xl">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRatingStars(n)} className={`transition-transform hover:scale-110 ${n <= ratingStars ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{ratingStars} out of 5 stars</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  handlePartnerAction(ratingModal, 'rate', String(ratingStars));
                  setRatingModal(null);
                }}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Submit Rating</button>
              <button onClick={() => setRatingModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {completeModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Mark Job Complete</h3>
            <p className="text-green-100 text-sm mt-1">{completeModal.po} · {completeModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={10}
              typeOfWork={completeModal.service || 'Project'}
              actionText="Send the project complete request to the customer for final confirmation."
              po={completeModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(completeModal.customer, 'Customer')}
              budget={toCurrencyLabel(completeModal.budget || completeModal.fee)}
              location={(() => { const loc = completeModal.location || completeModal.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; const m = String(completeModal.description || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : 'Unknown'; })()}
              projectDetails={stripWorkflowPrefix(completeModal.description || completeModal.desc || completeModal.projectDetails || completeModal.service || '')}
            />
            {/* Budget breakdown — priceList-first, then localStorage fallback */}
            {(() => {
              let bd: BudgetBreakdownItem[] | null = null;
              try {
                const pl = priceList ?? [];
                const descForBd = String(completeModal.description || '');
                if (pl.length > 0 && descForBd) {
                  const computed = computeBudgetBreakdown(descForBd, pl);
                  if (computed && computed.length > 0) {
                    bd = computed;
                    try { localStorage.setItem(`cblue_po_breakdown_${completeModal.po}`, JSON.stringify(bd)); } catch {}
                  }
                }
              } catch {}
              if (!bd || bd.length === 0) {
                try { const s = localStorage.getItem(`cblue_po_breakdown_${completeModal.po}`); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) bd = p; } } catch {}
              }
              if (!bd || bd.length === 0) return null;
              return (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs block mb-1">Budget Breakdown</span>
                  <div className="font-mono text-xs space-y-0.5">
                    {bd.map((it, i) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-gray-600">{i + 1}) {it!.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                        <span className="font-semibold text-green-700 shrink-0">= ฿{it!.total.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-2 pt-1 border-t border-green-200 font-bold text-sm">
                      <span className="text-gray-700">Budget</span>
                      <span className="text-green-800">= ฿{bd.reduce((s, it) => s + (it?.total ?? 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const variationItems = resolveVariationPriceListItems(
                completeModal?.po,
                completeModal?.description || completeModal?.desc || '',
              );
              if (variationItems.length === 0) return null;
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs block mb-1">Variation Price List</span>
                  <div className="text-sm text-amber-900 space-y-1">
                    {variationItems.map((item, index) => (
                      <p key={`${item.item}-${index}`}>{formatVariationPriceListItem(item, index)}</p>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(() => {
              const partnerNote = completeModal?.partnerRequest || completeModal?.partnerNote || completeModal?.variationRequest || '';
              if (!partnerNote || partnerNote.trim() === '') return null;
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs block mb-1">Partner Note</span>
                  <p className="text-sm text-purple-900">{partnerNote}</p>
                </div>
              );
            })()}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Completion Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={completeNote}
                onChange={e => setCompleteNote(e.target.value)}
                rows={3}
                placeholder="e.g. All tasks finished, site cleaned, client signed off..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  handlePartnerAction(completeModal, 'complete', completeNote.trim() || 'Job marked complete by partner');
                  setCompleteModal(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Confirm Complete</button>
              <button onClick={() => setCompleteModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {attachmentViewer && <AttachmentViewerModal viewer={attachmentViewer} onClose={() => setAttachmentViewer(null)} />}
    </>
  );
}

function PartnerRequests({ locale, incomingJobs, onJobClick, onDeclineJob, priceList, onPropAccept, onPropMeetingConfirm, onPropRatePartner }: { locale: string; incomingJobs: any[]; onJobClick?: (job: any) => void; onDeclineJob?: (job: any) => void; priceList?: any[]; onPropAccept?: (p: any) => void; onPropMeetingConfirm?: (p: any) => void; onPropRatePartner?: (p: any) => void; }) {
  const [variationModal, setVariationModal] = React.useState<any>(null);
  const [variationDesc, setVariationDesc] = React.useState("");
  const [variationRows, setVariationRows] = React.useState<{item:string;qty:string;unit:string;rate:string;amount:string}[]>(EMPTY_VAR_ROWS());
  const [variationAttachUrls, setVariationAttachUrls] = React.useState<string[]>([]);
  const [attachmentViewer, setAttachmentViewer] = React.useState<AttachmentViewerState>(null);
  React.useEffect(() => {
    if (!variationModal) { setVariationAttachUrls([]); return; }
    const po = variationModal.po;
    const urls: string[] = [];
    const directSources = [
      variationModal?.issueImage,
      variationModal?.image,
      variationModal?.fileUrl,
      variationModal?.attachmentUrl,
      variationModal?.documentUrl,
      ...(Array.isArray(variationModal?.attachments) ? variationModal.attachments : []),
      ...(Array.isArray(variationModal?.files) ? variationModal.files : []),
      ...(Array.isArray(variationModal?.projectImages) ? variationModal.projectImages : []),
      ...(Array.isArray(variationModal?.images) ? variationModal.images : []),
      ...(Array.isArray(variationModal?.imageUrls) ? variationModal.imageUrls : []),
      ...(Array.isArray(variationModal?.metadata?.images) ? variationModal.metadata.images : []),
      ...(Array.isArray(variationModal?.metadata?.attachments) ? variationModal.metadata.attachments : []),
      ...(Array.isArray(variationModal?.metadata?.files) ? variationModal.metadata.files : []),
      variationModal?.metadata?.issueImageUrl,
      variationModal?.metadata?.issueImage,
    ]
      .flatMap((item: any) => collectAttachmentUrls(item))
      .filter(Boolean);
    urls.push(...directSources);
    try { const m = JSON.parse(localStorage.getItem('cblue_po_attachments') || '{}'); if (po && Array.isArray(m[po])) urls.push(...m[po].flatMap((entry: any) => collectAttachmentUrls(entry)).filter(Boolean)); } catch {}
    try { const orderMap = JSON.parse(localStorage.getItem('cblue_order_attachments') || '{}'); const oid = variationModal.orderId || (po ? localStorage.getItem(`po_to_order_${po}`) : ''); if (oid && Array.isArray(orderMap[oid])) urls.push(...orderMap[oid].flatMap((entry: any) => collectAttachmentUrls(entry)).filter(Boolean)); } catch {}
    try { const rawFiles = (typeof window !== 'undefined' ? (window as any).__cblue_files_by_po : null) || {}; const files: File[] = po && Array.isArray(rawFiles[po]) ? rawFiles[po] : []; files.forEach(f => { try { urls.push(URL.createObjectURL(f)); } catch {} }); } catch {}
    const localUrls = Array.from(new Set(urls.flatMap((entry: any) => collectAttachmentUrls(entry)).filter(Boolean)));
    if (localUrls.length === 0) {
      void (async () => {
        const token = (typeof window !== 'undefined' ? localStorage.getItem('subscriber_token') : '') || '';
        const orderLookup = await fetchAttachmentUrlsByPoFromOrders({ po, token });
        if (orderLookup.urls.length > 0) {
          setVariationAttachUrls(orderLookup.urls);
          return;
        }
        const orderId = await resolveOrderIdByPo({
          po,
          fallbackOrderId:
            variationModal.orderId ||
            orderLookup.orderId ||
            (isOrderUuid(variationModal?.id) ? variationModal.id : ''),
          token,
        });
        if (!orderId || !token) return;
        try {
          const attachmentAttempt = await fetchWithSubscriberAuthRetry({
            endpoint: `/api/v1/orders/${orderId}/attachments`,
            token,
          });
          const res = attachmentAttempt.response;
          if (!res) return;
          if (!res.ok) return;
          const data = await res.json();
          const backendUrls = Array.from(
            new Set(
              (Array.isArray(data) ? data : [])
                .flatMap((item: any) => collectAttachmentUrls(item))
                .filter(Boolean),
            ),
          );
          if (backendUrls.length > 0) setVariationAttachUrls(backendUrls);
        } catch {
          // non-blocking
        }
      })();
    } else {
      setVariationAttachUrls(localUrls);
    }
  }, [variationModal]);
  const [completeModal, setCompleteModal] = React.useState<any>(null);
  const [completeNote, setCompleteNote] = React.useState("");
  const [ratingModal, setRatingModal] = React.useState<any>(null);
  const [ratingStars, setRatingStars] = React.useState(5);

  const writePartnerReqs = (updater: (items: any[]) => any[]) => {
    try {
      const current = JSON.parse(localStorage.getItem("partner_mock_dyn_req") || "[]");
      const next = updater(Array.isArray(current) ? current : []);
      localStorage.setItem("partner_mock_dyn_req", JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  const upsertMockActiveStep = (job: any, step: number, actionNeeded: boolean, createdAt: number) => {
    try {
      const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
      const nextEntry = {
        ...(active.find((x: any) => x.po === job.po) || job),
        id: (active.find((x: any) => x.po === job.po) || job)?.id || job.orderId || job.po,
        orderId: (active.find((x: any) => x.po === job.po) || job)?.orderId || job.orderId || undefined,
        po: job.po || job.id,
        title: job.title || job.service || job.po || "Project",
        service: job.service || job.title || job.po || "Project",
        customer: job.customer || "Customer",
        customerName: job.customer || "Customer",
        date: fmtDateTime(createdAt),
        createdAt: (active.find((x: any) => x.po === job.po) || job)?.createdAt || createdAt,
        budget: job.budget || job.fee || "฿0",
        fee: job.fee || job.budget || "฿0",
        location: job.location || job.subdistrict || "",
        subdistrict: job.subdistrict || job.location || "",
        tier: job.tier || "Standard",
        description: job.description || job.desc || "",
        actionNeeded,
        step,
        mockStep: step,
      };
      const exists = Array.isArray(active) && active.some((x: any) => x.po === nextEntry.po);
      const updatedActive = exists
        ? active.map((x: any) => (x.po === nextEntry.po ? { ...x, ...nextEntry } : x))
        : [...(Array.isArray(active) ? active : []), nextEntry];
      localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
    } catch {
      // non-blocking for local workflow repair
    }
  };

  const handlePartnerAction = (job: any, action: 'variation' | 'complete' | 'rate', extraData?: string) => {
    try {
      const po = job.po || job.id;
      const createdAt = Date.now();
      const token = localStorage.getItem("subscriber_token") || "";
      const orderDbId = job.orderId || localStorage.getItem(`po_to_order_${po}`) || (isOrderUuid(job.id) ? job.id : "");
      const fmtDt = (d: number) => {
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      };
      const postSystemMsg = (text: string) => {
        if (token && orderDbId) {
          fetch(`/api/v1/orders/${orderDbId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text }),
          }).catch(() => {});
        }
      };
      const dynReqs = JSON.parse(localStorage.getItem("ghis_mock_dyn_req") || "[]");
      if (action === 'variation') {
        const varId = `var-${po}`;
        const varNote = extraData || 'Your partner has submitted a variation for your approval. Please review and confirm to proceed.';
        const partnerRequest = normalizeVariationPartnerNote(varNote);
        if (partnerRequest) storeVariationPartnerNote(po, partnerRequest);
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: varId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: varNote, location: job.location || job.subdistrict || '', type: 'variation_pending', step: 9 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        // Keep the active-job progress pinned to Step 9 even after the request disappears.
        upsertMockActiveStep(job, 9, false, createdAt);
        try { localStorage.setItem(`partner_variation_sent_${po}`, '1'); } catch {}
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("cblue-workflow-updated"));
        postSystemMsg(`[SYSTEM] Partner has submitted a variation request for ${po}. Please review in your Requests tab. [VARIATION_DATA]${varNote}[/VARIATION_DATA]`);
      } else if (action === 'complete') {
        const complId = `compl-${po}`;
        const completeDesc = extraData?.trim() ? `Partner completion request: ${extraData.trim()}` : 'Work is completed. Please review and mark as complete to close this project.';
        const previousPartnerRequest = resolveVariationPartnerNote(po);
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: complId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: completeDesc, location: job.location || job.subdistrict || '', partnerRequest: previousPartnerRequest, partnerNote: previousPartnerRequest, variationRequest: previousPartnerRequest, type: 'complete_pending', step: 10 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        upsertMockActiveStep(job, 10, false, createdAt);
        try { localStorage.setItem(`partner_complete_sent_${po}`, '1'); } catch {}
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['complete_partner', 'variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("cblue-workflow-updated"));
        postSystemMsg(`[SYSTEM] Partner has marked the job as complete for ${po}. Please review and confirm in your Requests tab. [COMPLETE_DATA]${completeDesc}[/COMPLETE_DATA]`);
      } else if (action === 'rate') {
        const rating = extraData || '5';
        // Update active/history BEFORE writePartnerReqs so buildChatFeed sees historyEntry and skips
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const hist = JSON.parse(localStorage.getItem("ghis_mock_history") || "[]");
        const updated = active.filter((x: any) => x.po !== po);
        const completed = { ...(active.find((x: any) => x.po === po) || job), step: 11, completedAt: createdAt, partnerRating: Number(rating) };
        localStorage.setItem("ghis_mock_active", JSON.stringify(updated));
        pruneStorageIfNeeded();
        localStorage.setItem("ghis_mock_history", JSON.stringify([...hist, completed]));
        try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
        try { localStorage.removeItem(`partner_variation_sent_${po}`); localStorage.removeItem(`partner_complete_sent_${po}`); } catch {}
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && x.type === 'rate_partner')));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("cblue-workflow-updated"));
        postSystemMsg(`[SYSTEM] Partner has rated this project ${rating}/5 stars. The job is now complete.`);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {incomingJobs.map((req) => {
          // Property inquiry cards
          if (req.type === "prop_accept") {
            const p: any = req.propInquiry;
            return (
              <div key={req.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg">🏠</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.propertyTitle} <span className="text-xs font-normal text-gray-400">· {locale === 'th' ? `ออเดอร์: ${p.poNumber}` : locale === 'zh' ? `订单: ${p.poNumber}` : `Order: ${p.poNumber}`} · Step 4 of 8</span></p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">{locale === "th" ? "ลูกค้าสนใจทรัพย์สินของคุณ — กรุณายืนยัน" : "Customer is interested in your property — please confirm"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{getPropSiteLocation(p)} · {p.propertyTier} · {locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropertyListingTypeLabel(p.listingType, locale)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "สร้างเมื่อ" : locale === "zh" ? "创建时间" : "Created"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
                  {Array.isArray(p.propertyImages) && p.propertyImages.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 mt-1"
                      onClick={async () => {
                        await downloadAttachmentUrls({
                          urls: p.propertyImages,
                          po: p.poNumber,
                          prefix: 'property-photo',
                        });
                      }}
                    >
                      {locale === "th" ? `ดาวน์โหลดรูป (${p.propertyImages.length})` : locale === "zh" ? `下载图片 (${p.propertyImages.length})` : `Download Photos (${p.propertyImages.length})`}
                    </button>
                  )}
                </div>
                <button onClick={() => onPropAccept?.(p)} className="px-4 py-2 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 transition">
                  {locale === "th" ? "ดูรายละเอียด" : "Review"}
                </button>
              </div>
            );
          }
          if (req.type === "prop_meeting_confirm") {
            const p: any = req.propInquiry;
            return (
              <div key={req.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-lg">📅</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.propertyTitle} <span className="text-xs font-normal text-gray-400">· {locale === 'th' ? `ออเดอร์: ${p.poNumber}` : locale === 'zh' ? `订单: ${p.poNumber}` : `Order: ${p.poNumber}`} · Step 7 of 8</span></p>
                  <p className="text-xs text-teal-700 font-semibold mt-0.5">{locale === "th" ? "ลูกค้าส่งคำเชิญนัดหมาย — กรุณายืนยัน" : "Customer sent a meeting invitation — please confirm"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.meetingDate} {p.meetingTime} · {p.meetingVenue || getPropSiteLocation(p)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropertyListingTypeLabel(p.listingType, locale)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "สร้างเมื่อ" : locale === "zh" ? "创建时间" : "Created"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
                  {Array.isArray(p.propertyImages) && p.propertyImages.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 mt-1"
                      onClick={async () => {
                        await downloadAttachmentUrls({
                          urls: p.propertyImages,
                          po: p.poNumber,
                          prefix: 'property-photo',
                        });
                      }}
                    >
                      {locale === "th" ? `ดาวน์โหลดรูป (${p.propertyImages.length})` : locale === "zh" ? `下载图片 (${p.propertyImages.length})` : `Download Photos (${p.propertyImages.length})`}
                    </button>
                  )}
                </div>
                <button onClick={() => onPropMeetingConfirm?.(p)} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition">
                  {locale === "th" ? "ยืนยัน" : "Confirm"}
                </button>
              </div>
            );
          }
          if (req.type === "prop_rate_partner") {
            const p: any = req.propInquiry;
            return (
              <div key={req.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-lg">⭐</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.propertyTitle} <span className="text-xs font-normal text-gray-400">· {locale === 'th' ? `ออเดอร์: ${p.poNumber}` : locale === 'zh' ? `订单: ${p.poNumber}` : `Order: ${p.poNumber}`} · Step 8 of 8</span></p>
                  <p className="text-xs text-yellow-700 font-semibold mt-0.5">{locale === "th" ? "นัดหมายยืนยันแล้ว — ให้คะแนนลูกค้าเพื่อปิดงาน" : "Meeting confirmed — rate the customer to close this inquiry"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.meetingDate} {p.meetingTime} · {getPropSiteLocation(p)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropertyListingTypeLabel(p.listingType, locale)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "สร้างเมื่อ" : locale === "zh" ? "创建时间" : "Created"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
                  {Array.isArray(p.propertyImages) && p.propertyImages.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 mt-1"
                      onClick={async () => {
                        await downloadAttachmentUrls({
                          urls: p.propertyImages,
                          po: p.poNumber,
                          prefix: 'property-photo',
                        });
                      }}
                    >
                      {locale === "th" ? `ดาวน์โหลดรูป (${p.propertyImages.length})` : locale === "zh" ? `下载图片 (${p.propertyImages.length})` : `Download Photos (${p.propertyImages.length})`}
                    </button>
                  )}
                </div>
                <button onClick={() => onPropRatePartner?.(p)} className="px-4 py-2 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition">
                  {locale === "th" ? "ให้คะแนน" : "Rate"}
                </button>
              </div>
            );
          }
          // Normal fixer request card
          const reqWorkflowType = String(req.workflowType || req.type || '');
          return (
          <div key={req.id} className="px-6 py-4 flex items-center gap-4 transition cursor-default">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}{(req.po || req.step) ? <span className="text-xs font-normal text-gray-400">{req.po ? ` · ${req.po}` : ''}{req.step ? ` · Step ${req.step} of 11` : ''}</span> : null}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">{reqWorkflowType === 'variation_partner' ? 'Please decide whether to submit a variation request.' : reqWorkflowType === 'complete_partner' ? 'Please send project complete request to customer.' : reqWorkflowType === 'rate_partner' ? 'Please rate the customer to close this job.' : String(req.status || '').toUpperCase() === 'MEETING_REQUESTED' ? 'Please review and confirm the site meeting invitation.' : locale === "th" ? "โปรดพิจารณาและรับงานนี้เพื่อดำเนินการต่อ" : locale === "zh" ? "请审核并接受此工作以继续" : "Please review and accept this job to proceed"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{req.customer} &middot; {req.date} &middot; {getJobAmountPrefix(req, locale)}: {getJobAmountValue(req)}</p>
              {(req.meetingVenue || req.subdistrict) && <p className="text-xs text-gray-500 mt-0.5">{[req.meetingVenue || req.subdistrict].filter(Boolean).join(' · ')}</p>}
              <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{stripWorkflowPrefix(req.description || req.desc || req.statusNote)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
              {reqWorkflowType === 'variation_partner' ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setVariationDesc(''); setVariationModal(req);
                      // Refresh breakdown so customer's Approve Variation reads correct multi-item data
                      try {
                        let descToUse = String(req?.description || req?.desc || '');
                        if (!descToUse || /proceed to submit variation/i.test(descToUse)) {
                          for (const k of ['ghis_mock_active', 'ghis_mock_dyn_req', 'partner_mock_dyn_req']) {
                            try { const items = JSON.parse(localStorage.getItem(k) || '[]'); const found = (Array.isArray(items) ? items : []).find((r: any) => r?.po === req?.po); if ((found?.description || found?.desc) && !/proceed to submit variation/i.test(found.description || found.desc || '')) { descToUse = found.description || found.desc || ''; break; } } catch {}
                          }
                        }
                        const total = parseFloat(String(req?.budget || req?.fee || '').replace(/[฿,]/g, '')) || 0;
                        let pl = priceList ?? [];
                        if (pl.length === 0) { try { const stored = localStorage.getItem(`cblue_partner_pricelist_${req?.po}`); if (stored) pl = JSON.parse(stored); } catch {} }
                        if (pl.length === 0) { try { const stored = localStorage.getItem('cblue_partner_pricelist_general'); if (stored) pl = JSON.parse(stored); } catch {} }
                        const bd = computeBudgetBreakdown(descToUse, pl, total);
                        if (bd && bd.length > 0 && req?.po) localStorage.setItem(`cblue_po_breakdown_${req.po}`, JSON.stringify(bd));
                        if (pl && pl.length > 0 && req?.po) localStorage.setItem(`cblue_partner_pricelist_${req.po}`, JSON.stringify(pl));
                      } catch {}
                    }} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition">Yes</button>
                  <button onClick={(e) => { e.stopPropagation(); try { localStorage.setItem(`partner_variation_sent_${req.po}`, '1'); } catch {} writePartnerReqs(prev => prev.filter((x: any) => !(x.po === req.po && String(x.workflowType || x.type || '') === 'variation_partner'))); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">No</button>
                </>
              ) : reqWorkflowType === 'complete_partner' ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setCompleteNote(''); setCompleteModal({ ...req, service: req.service || req.title || 'Project', partnerRequest: req.partnerRequest || resolveVariationPartnerNote(req.po), partnerNote: req.partnerNote || req.partnerRequest || resolveVariationPartnerNote(req.po), variationRequest: req.variationRequest || req.partnerRequest || resolveVariationPartnerNote(req.po) }); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">Send</button>
                  <button onClick={(e) => { e.stopPropagation(); try { localStorage.setItem(`partner_complete_sent_${req.po}`, '1'); } catch {} writePartnerReqs(prev => prev.filter((x: any) => !(x.po === req.po && String(x.workflowType || x.type || '') === 'complete_partner'))); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">No</button>
                </>
              ) : reqWorkflowType === 'rate_partner' ? (
                <button onClick={(e) => { e.stopPropagation(); setRatingStars(5); setRatingModal(req); }} className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">Start</button>
              ) : String(req.status || '').toUpperCase() === 'MEETING_REQUESTED' ? (
                <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition">Confirm</button>
              ) : (
                <>
                  {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                  <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
                  <button onClick={(e) => { e.stopPropagation(); onDeclineJob ? onDeclineJob(req) : onJobClick?.(req); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
    {variationModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[calc(100dvh-6rem)] overflow-y-auto my-4">
          <div className="bg-amber-500 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Submit Variation</h3>
            <p className="text-amber-100 text-sm mt-1">{variationModal.po} · {variationModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <strong>Step 9 of 11 • Variation.</strong> Review the original PO budget, describe the extra scope or revised pricing, and send it to the customer for approval.
            </div>
            <WorkflowModalMeta
              step={9}
              typeOfWork={variationModal.service || 'Project'}
              actionText="Review the original PO and send your variation request to the customer for approval."
              po={variationModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(variationModal.customer, 'Customer')}
              budget={toCurrencyLabel(variationModal.budget)}
              location={(() => { const loc = variationModal.location || variationModal.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; const m = String(variationModal.description || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : 'Unknown'; })()}
              projectDetails={stripWorkflowPrefix(variationModal.description || variationModal.desc || variationModal.projectDetails || variationModal.service || '')}
            />
            {/* Uploaded Files — lets partner reference customer photos when writing variation */}
            <div className="flex justify-between items-center rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs">
              <span className="text-amber-800 font-semibold">Uploaded Files</span>
              <button type="button" className={`font-semibold ${variationAttachUrls.length > 0 ? 'text-sky-600 hover:underline' : 'text-gray-400'}`} onClick={() => {
                const viewer = createAttachmentViewerState({
                  title: 'Uploaded Files',
                  po: variationModal.po,
                  prefix: 'attachment',
                  urls: variationAttachUrls,
                });
                if (!viewer) {
                  alert('No downloadable file found right now.');
                  return;
                }
                setAttachmentViewer(viewer);
              }}>
                {variationAttachUrls.length > 0 ? 'View & Download' : 'No files yet'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Original Budget</label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                {(() => {
                  const varDesc = String(variationModal.description || variationModal.desc || variationModal.projectDetails || '');
                  const varTotal = parseFloat(String(variationModal.budget || '').replace(/[฿,]/g, '')) || 0;
                  let varPl = priceList ?? [];
                  if (varPl.length === 0) { try { const stored = localStorage.getItem(`cblue_partner_pricelist_${variationModal.po}`); if (stored) varPl = JSON.parse(stored); } catch {} }
                  if (varPl.length === 0) { try { const stored = localStorage.getItem('cblue_partner_pricelist_general'); if (stored) varPl = JSON.parse(stored); } catch {} }
                  let bd = computeBudgetBreakdown(varDesc, varPl, varTotal);
                  if (bd && bd.length > 0) { try { localStorage.setItem(`cblue_po_breakdown_${variationModal.po}`, JSON.stringify(bd)); } catch {} }
                  if (!bd || bd.length === 0) { try { const stored = JSON.parse(localStorage.getItem(`cblue_po_breakdown_${variationModal.po}`) || 'null'); if (Array.isArray(stored) && stored.length > 0) bd = stored as BudgetBreakdownItem[]; } catch {} }
                  if (bd && bd.length >= 1) {
                    return (
                      <div className="font-mono text-xs space-y-0.5">
                        {bd.map((it, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-gray-600">{i + 1}) {it!.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                            <span className="font-semibold text-amber-700 shrink-0">= ฿{it!.total.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-2 pt-1 border-t border-amber-200 font-bold text-sm">
                          <span className="text-amber-900">Budget</span>
                          <span className="text-amber-900">= ฿{bd.reduce((s, it) => s + (it?.total ?? 0), 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }
                  return <span className="font-bold text-amber-800">{toCurrencyLabel(variationModal.budget)}</span>;
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Original PO total. Add variation line items below.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Variation Price List</label>
              <div className="overflow-x-auto rounded-xl border border-amber-100">
                <table className="w-full text-xs">
                  <thead><tr className="bg-amber-50 text-amber-800">
                    <th className="px-2 py-2 text-left font-semibold">Item</th>
                    <th className="px-2 py-2 text-right font-semibold w-12">Qty</th>
                    <th className="px-2 py-2 text-left font-semibold w-14">Unit</th>
                    <th className="px-2 py-2 text-right font-semibold w-20">Rate (฿)</th>
                    <th className="px-2 py-2 text-right font-semibold w-20">Amount (฿)</th>
                    <th className="px-1 py-2 w-6"></th>
                  </tr></thead>
                  <tbody>
                    {variationRows.map((row, idx) => {
                      const qty = parseFloat(row.qty) || 0;
                      const rate = parseFloat(row.rate.replace(/,/g, '')) || 0;
                      const amount = qty > 0 && rate > 0 ? qty * rate : (parseFloat(row.amount.replace(/,/g,'')) || 0);
                      return (
                        <tr key={idx} className="border-t border-amber-50">
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Item description" value={row.item} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, item: e.target.value})); }} /></td>
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="0" value={row.qty} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, qty: e.target.value, amount: String(parseFloat(e.target.value||'0') * (parseFloat(vr.rate.replace(/,/g,''))||0) || '')})); }} /></td>
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="unit" value={row.unit} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, unit: e.target.value})); }} /></td>
                          <td className="px-1 py-1"><input className="w-full border border-gray-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="0" value={row.rate} onChange={e => { setVariationRows(variationRows.map((vr, vi) => vi !== idx ? vr : {...vr, rate: e.target.value, amount: String((parseFloat(vr.qty)||0) * (parseFloat(e.target.value.replace(/,/g,''))||0) || '')})); }} /></td>
                          <td className="px-2 py-1 text-right text-amber-700 font-bold">{amount > 0 ? amount.toLocaleString() : '-'}</td>
                          <td className="px-1 py-1"><button onClick={() => { if (variationRows.length > 1) setVariationRows(variationRows.filter((_, i) => i !== idx)); }} className="text-gray-400 hover:text-red-500 text-base leading-none">×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t border-amber-200 bg-amber-50">
                    <td colSpan={4} className="px-2 py-2 font-semibold text-amber-800 text-right">Total Variation:</td>
                    <td className="px-2 py-2 text-right font-bold text-amber-900">฿{variationRows.reduce((sum, row) => { const q = parseFloat(row.qty)||0; const r2 = parseFloat(row.rate.replace(/,/g,''))||0; return sum + (q > 0 && r2 > 0 ? q*r2 : parseFloat(row.amount.replace(/,/g,''))||0); }, 0).toLocaleString()}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
              <button onClick={() => setVariationRows([...variationRows, { item: '', qty: '', unit: '', rate: '', amount: '' }])} className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-semibold">+ Add Row</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Note / Description <span className="text-red-500">*</span></label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" rows={3} placeholder="Describe the variation scope, extra work, or cost changes..." value={variationDesc} onChange={e => setVariationDesc(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { if (!variationDesc.trim()) return; const priceListRows = buildVariationPriceListRows(variationRows); if (variationModal?.po) { storeVariationPriceList(variationModal.po, priceListRows); } const tableText = priceListRows.length > 0 ? `\n\nPrice List:\n${formatVariationPriceListText(priceListRows)}` : ''; handlePartnerAction(variationModal, 'variation', `Partner variation request: ${variationDesc.trim()}${tableText}`); setVariationRows(EMPTY_VAR_ROWS()); setVariationModal(null); }} disabled={!variationDesc.trim()} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm">Submit Variation</button>
              <button onClick={() => { setVariationRows(EMPTY_VAR_ROWS()); setVariationModal(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {completeModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Mark Job Complete</h3>
            <p className="text-green-100 text-sm mt-1">{completeModal.po} · {completeModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={10}
              typeOfWork={completeModal.service || 'Project'}
              actionText="Send the project complete request to the customer for final confirmation."
              po={completeModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(completeModal.customer, 'Customer')}
              budget={toCurrencyLabel(completeModal.budget || completeModal.fee)}
              location={(() => { const loc = completeModal.location || completeModal.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; const m = String(completeModal.description || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : 'Unknown'; })()}
              projectDetails={stripWorkflowPrefix(completeModal.description || completeModal.desc || completeModal.projectDetails || completeModal.service || '')}
            />
            {(() => {
              let bd: BudgetBreakdownItem[] | null = null;
              try {
                const pl = priceList ?? [];
                const descForBd = String(completeModal.description || '');
                if (pl.length > 0 && descForBd) {
                  const computed = computeBudgetBreakdown(descForBd, pl);
                  if (computed && computed.length > 0) {
                    bd = computed;
                    try { localStorage.setItem(`cblue_po_breakdown_${completeModal.po}`, JSON.stringify(bd)); } catch {}
                  }
                }
              } catch {}
              if (!bd || bd.length === 0) {
                try { const s = localStorage.getItem(`cblue_po_breakdown_${completeModal.po}`); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) bd = p; } } catch {}
              }
              if (!bd || bd.length === 0) return null;
              return (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs block mb-1">Budget Breakdown</span>
                  <div className="font-mono text-xs space-y-0.5">
                    {bd.map((it, i) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-gray-600">{i + 1}) {it!.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                        <span className="font-semibold text-green-700 shrink-0">= ฿{it!.total.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-2 pt-1 border-t border-green-200 font-bold text-sm">
                      <span className="text-gray-700">Budget</span>
                      <span className="text-green-800">= ฿{bd.reduce((s, it) => s + (it?.total ?? 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const variationItems = resolveVariationPriceListItems(
                completeModal?.po,
                completeModal?.description || completeModal?.desc || '',
              );
              if (variationItems.length === 0) return null;
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs block mb-1">Price List</span>
                  <div className="text-sm text-amber-900 space-y-1">
                    {variationItems.map((item, index) => (
                      <p key={`${item.item}-${index}`}>{formatVariationPriceListItem(item, index)}</p>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(() => {
              const partnerNote = completeModal?.partnerRequest || completeModal?.partnerNote || completeModal?.variationRequest || resolveVariationPartnerNote(completeModal?.po) || '';
              if (!partnerNote || partnerNote.trim() === '') return null;
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs block mb-1">Partner Note</span>
                  <p className="text-sm text-purple-900 whitespace-pre-wrap">{partnerNote}</p>
                </div>
              );
            })()}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Completion Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={completeNote}
                onChange={e => setCompleteNote(e.target.value)}
                rows={3}
                placeholder="e.g. All tasks finished, site cleaned, client signed off..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  handlePartnerAction(completeModal, 'complete', completeNote.trim() || 'Job marked complete by partner');
                  setCompleteModal(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Confirm Complete</button>
              <button onClick={() => setCompleteModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {ratingModal && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-y-auto max-h-[calc(100dvh-6rem)]">
          <div className="bg-sky-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Rate Customer</h3>
            <p className="text-sky-200 text-sm mt-1">{ratingModal.po} · {ratingModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={11}
              typeOfWork={ratingModal.service || 'Project'}
              actionText="Rate the customer to close this job and move it to history."
              po={ratingModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(ratingModal.customer, 'Customer')}
              budget={toCurrencyLabel(ratingModal.budget || ratingModal.fee)}
              location={(() => { const loc = ratingModal.location || ratingModal.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; try { const active = JSON.parse(localStorage.getItem('ghis_mock_active') || '[]'); const job = (active as any[]).find((x: any) => x.po === ratingModal.po); const m = String(job?.description || '').match(/\bLOC:([^|]+)/); if (m) return (m[1] ?? '').trim(); } catch {} return 'Unknown'; })()}
              projectDetails={stripWorkflowPrefix(ratingModal.description || ratingModal.desc || ratingModal.projectDetails || ratingModal.service || '')}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Your Rating</label>
              <div className="flex gap-2 text-3xl">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRatingStars(n)} className={`transition-transform hover:scale-110 ${n <= ratingStars ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { handlePartnerAction(ratingModal, 'rate', String(ratingStars)); setRatingModal(null); }} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl transition text-sm">Submit Rating</button>
              <button onClick={() => setRatingModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {attachmentViewer && <AttachmentViewerModal viewer={attachmentViewer} onClose={() => setAttachmentViewer(null)} />}
    </>
  );
}

function PartnerHistory({ locale, completedJobs }: { locale: string; completedJobs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "ประวัติการทำงาน" : locale === "zh" ? "工作历史" : "Job History"}</h2>
      </div>
      <div className="space-y-4 p-4">
        {completedJobs.length > 0 ? completedJobs.map((h) => (
          <WorkflowHistoryCard key={h.id || h.po} item={h} locale={locale} />
        )) : (
          <div className="py-8 text-center text-gray-500">No completed or declined jobs yet.</div>
        )}
      </div>
    </div>
  );
}

/* ===== PARTNER CHAT ===== */

/* ===== PARTNER CHATS ===== */
function PartnerChats({ locale, chats }: { locale: string; chats: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {chats && chats.length > 0 && chats.map((c: any) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition hover:bg-gray-50`} onClick={() => {
            try {
              if (c.po) {
                localStorage.setItem(`chat_from_${c.po}`, "fixers");
                if (c.name) {
                  localStorage.setItem(`chat_title_${c.po}`, c.name);
                }
              }
            } catch {}
            window.location.href = `/${locale}/chat/${c.po || c.id}`;
          }}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{String(c.name || "C").slice(-2)}</div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">{c.name}</p>
                  {c.service && c.service !== c.po && c.service !== c.name ? <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{c.service}</span> : null}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{c.time || ""}</span>
              </div>
              <p className={`text-sm truncate text-gray-500`}>{c.lastMsg || (locale === "th" ? "คลิกเพื่อดูแชท" : "Click to open chat")}</p>
            </div>
          </div>
        ))}
        {(!chats || chats.length === 0) && <p className="text-sm text-gray-500 py-4 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent incoming chats"}</p>}
      </div>
    </div>
  );
}

/* ===== PARTNER NOTIFICATIONS ===== */
function PartnerNotifications({ locale, notifications }: { locale: string; notifications: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การแจ้งเตือนทั้งหมด" : locale === "zh" ? "所有通知" : "All Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications.slice(0, 20).map((n) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-purple-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ===== PARTNER PROFILE ===== */
function PartnerProfile({ locale, prefix, partner }: { locale: string; prefix: string; partner: PartnerInfo | null }) {
  const router = useRouter();
  if (!partner) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{locale === "th" ? "เข้าสู่ระบบเพื่อดูโปรไฟล์" : locale === "zh" ? "登录查看个人资料" : "Log in to view profile"}</h2>
        <p className="text-sm text-gray-500 mb-6">{locale === "th" ? "เข้าสู่ระบบเพื่อจัดการข้อมูลและการตั้งค่า" : locale === "zh" ? "登录管理您的合作伙伴账户" : "Sign in to manage your partner account"}</p>
        <Link href={`subscription/login?redirect=/fixers`} className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 transition inline-block">
          {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center shadow-inner flex-shrink-0 relative">
            <span className="text-5xl"></span>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">
              <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold">✓</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{partner.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{partner.tier || 'Specialist Tier'}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="text-green-500">✓</span> {locale === "th" ? "ยืนยันตัวตนแล้ว (KYC)" : "Verified (KYC)"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`fixers/register?edit=1`} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold shadow-sm">
                  {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
                </Link>
                <button onClick={() => {
                  if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Confirm deleting your account and all data per PDPA law?")) {
                    fetch('/api/v1/users/me', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('subscriber_token')}` } })
                    .then(() => { localStorage.clear(); window.location.href = '/subscription/login'; });
                  }
                }} className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold shadow-sm">
                  {locale === "th" ? "ลบบัญชี" : locale === "zh" ? "删除账户" : "Delete Account"}
                </button>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "อีเมล" : "Email"}</h3>
                <p className="text-sm font-medium text-gray-900">{partner.email}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "เบอร์โทรศัพท์" : "Phone"}</h3>
                <p className="text-sm font-medium text-gray-900">{partner.phone || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "บริษัท/นิติบุคคล" : "Company"}</h3>
                <p className="text-sm font-medium text-gray-900">{partner.company || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "วันที่สมัคร" : "Member Since"}</h3>
                <p className="text-sm font-medium text-gray-900">{fmtDate(partner.createdAt || Date.now())}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assessment & Upgrade Path */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center justify-between">
          <h3 className="font-bold text-sky-900 flex items-center gap-2">
            <span className="text-xl"></span> CBLUE AI Tier Assessment
          </h3>
          <span className="text-sm text-sky-700 font-semibold bg-white px-3 py-1 rounded-full shadow-sm">Overall Score: {partner.tierScore || 69}/100</span>
        </div>
        
        <div className="p-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-2xl flex items-start gap-4 mb-6">
            <div className="text-2xl"></div>
            <div>
              <p className="text-green-800 font-bold">Fully Verified by CBLUE AI</p>
              <p className="text-green-600 text-sm">Your information and KYC documents have been instantly verified by CBLUE AI. Your profile is active and ready to accept bookings.</p>
            </div>
          </div>

          <h4 className="font-bold text-gray-800 mb-4">Evaluation Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {(Array.isArray(partner.breakdown) && partner.breakdown.length > 0 ? partner.breakdown : [
              { label: "Experience", score: 25, max: 25 },
              { label: "Skills Breadth", score: 12, max: 15 },
              { label: "KYC Verification", score: 15, max: 15 },
              { label: "Portfolio & Evidence", score: 0, max: 15 },
              { label: "Profile Completeness", score: 7, max: 10 },
              { label: "Price List", score: 6, max: 10 },
              { label: "Credential Verification", score: 4, max: 10 }
            ]).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-700 font-medium text-sm">{item.label}</span>
                <span className={`font-bold ${item.score === item.max ? 'text-green-600' : item.score === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                  {item.score}/{item.max}
                </span>
              </div>
            ))}
          </div>

          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="text-lg"></span> AI Verification Results</h4>
          <ul className="space-y-3 mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100">
            {(Array.isArray(partner.flags) && partner.flags.length > 0 ? partner.flags : [
              { type: "fail", message: "No company info provided" },
              { type: "pass", message: "Experience consistent with project type" },
              { type: "fail", message: "No work description provided" },
              { type: "pass", message: "KYC documents complete (front & back)" }
            ]).map((flag: any, i: number) => (
              <li key={i} className="flex gap-3">
                <span className={`font-bold ${flag.type === "pass" ? "text-green-500" : flag.type === "fail" ? "text-red-500" : "text-amber-500"}`}>
                  {flag.type === "pass" ? "✓" : flag.type === "fail" ? "✕" : "⚠"}
                </span>
                <span className="text-gray-700 text-sm">{flag.message}</span>
              </li>
            ))}
          </ul>

          <div className="bg-sky-50 rounded-xl p-5 border border-sky-100 space-y-4">
            <div className="flex gap-3">
              <span className="text-sky-600 text-xl mt-0.5"></span>
              <div>
                <p className="font-bold text-sky-900 mb-1">How to upgrade</p>
                <p className="text-sky-800 text-sm leading-relaxed">Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier when you edit your profile or accumulate work history.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-sky-600 text-xl mt-0.5"></span>
              <div>
                <p className="font-bold text-sky-900 mb-1">Security</p>
                <p className="text-sky-800 text-sm leading-relaxed">Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




/* ===== PARTNER PROPERTIES ===== */
function PartnerProperties({ locale, prefix, properties, propertyInquiries }: { locale: string; prefix: string; properties: any[]; propertyInquiries?: any[] }) {
  const PROPERTY_TYPE_OPTIONS = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "OFFICE", "WAREHOUSE", "SHOPHOUSE", "APARTMENT"];
  const LISTING_TYPE_OPTIONS = ["SALE", "RENT"];
  const TIER_OPTIONS = ["ECONOMY", "STANDARD", "UPPER", "LUXURY", "GRANDEUR"];
  const ACCEPTED_STATUSES = new Set(["ACCEPTED", "PAID", "MEETING_SENT", "MEETING_CONFIRMED", "COMPLETED"]);
  const MEETING_STATUSES = new Set(["MEETING_SENT", "MEETING_CONFIRMED", "COMPLETED"]);
  const MAX_FILES = 5;

  const [items, setItems] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [saveError, setSaveError] = useState("");

  const defaultTitle = locale === "th" ? "ประกาศอสังหาริมทรัพย์" : locale === "zh" ? "房源" : "Property";

  const toNumberSafe = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toNumberOrUndefined = (value: any) => {
    if (value === null || value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const listingLabel = (value: string) => {
    const upper = String(value || "").toUpperCase();
    if (upper === "SALE") return locale === "th" ? "ขาย" : locale === "zh" ? "出售" : "Sale";
    if (upper === "RENT") return locale === "th" ? "เช่า" : locale === "zh" ? "出租" : "Rent";
    return upper || "-";
  };

  const propertyTypeLabel = (value: string) => {
    const upper = String(value || "").toUpperCase();
    if (upper === "CONDO") return locale === "th" ? "คอนโด" : locale === "zh" ? "公寓" : "Condo";
    if (upper === "HOUSE") return locale === "th" ? "บ้าน" : locale === "zh" ? "别墅" : "House";
    if (upper === "TOWNHOUSE") return locale === "th" ? "ทาวน์เฮ้าส์" : locale === "zh" ? "联排别墅" : "Townhouse";
    if (upper === "LAND") return locale === "th" ? "ที่ดิน" : locale === "zh" ? "土地" : "Land";
    if (upper === "COMMERCIAL") return locale === "th" ? "อาคารพาณิชย์" : locale === "zh" ? "商业" : "Commercial";
    if (upper === "OFFICE") return locale === "th" ? "ออฟฟิศ" : locale === "zh" ? "办公室" : "Office";
    if (upper === "WAREHOUSE") return locale === "th" ? "โกดัง" : locale === "zh" ? "仓库" : "Warehouse";
    if (upper === "SHOPHOUSE") return locale === "th" ? "ตึกแถว" : locale === "zh" ? "商铺" : "Shophouse";
    if (upper === "APARTMENT") return locale === "th" ? "อพาร์ตเมนต์" : locale === "zh" ? "公寓" : "Apartment";
    return upper || "-";
  };

  const tierLabel = (value: string) => {
    const upper = String(value || "STANDARD").toUpperCase();
    if (upper === "ECONOMY") return locale === "th" ? "ประหยัด" : locale === "zh" ? "经济" : "Economy";
    if (upper === "STANDARD") return locale === "th" ? "มาตรฐาน" : locale === "zh" ? "标准" : "Standard";
    if (upper === "UPPER") return locale === "th" ? "ระดับสูง" : locale === "zh" ? "高阶" : "Upper";
    if (upper === "LUXURY") return locale === "th" ? "ลักชัวรี" : locale === "zh" ? "豪华" : "Luxury";
    if (upper === "GRANDEUR") return locale === "th" ? "พรีเมียม" : locale === "zh" ? "尊享" : "Grandeur";
    return upper || "-";
  };

  const toDisplayDateTime = (value: any) => {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "-";
    const targetLocale = locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB";
    return date.toLocaleString(targetLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toPercent = (numerator: number, denominator: number) => {
    if (!denominator) return 0;
    return Math.round((numerator / denominator) * 100);
  };

  const getVisibilityLabel = (status: string) => {
    const upper = String(status || "").toUpperCase();
    if (upper === "ACTIVE") return locale === "th" ? "สาธารณะ" : locale === "zh" ? "公开" : "Public";
    if (upper === "DRAFT") return locale === "th" ? "หยุดแสดง" : locale === "zh" ? "暂停" : "Paused";
    return locale === "th" ? "เก็บถาวร" : locale === "zh" ? "已归档" : "Archived";
  };

  const getComplianceHints = (item: any) => {
    const hints: string[] = [];
    if (!String(item?.title || "").trim()) hints.push(locale === "th" ? "ชื่อประกาศ" : locale === "zh" ? "标题" : "Title");
    if (!String(item?.propertyType || "").trim()) hints.push(locale === "th" ? "ประเภททรัพย์สิน" : locale === "zh" ? "房产类型" : "Property type");
    if (!String(item?.listingType || "").trim()) hints.push(locale === "th" ? "ประเภทการประกาศ" : locale === "zh" ? "交易类型" : "Listing type");
    if (!String(item?.tier || "").trim()) hints.push(locale === "th" ? "ระดับบริการ" : locale === "zh" ? "服务等级" : "Tier");
    if (!Number.isFinite(Number(item?.price)) || Number(item?.price) <= 0) hints.push(locale === "th" ? "ราคา" : locale === "zh" ? "价格" : "Price");
    if (!String(item?.province || "").trim()) hints.push(locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province");
    if (!String(item?.district || "").trim()) hints.push(locale === "th" ? "เขต/อำเภอ" : locale === "zh" ? "区/县" : "District");
    if (!String(item?.subdistrict || "").trim()) hints.push(locale === "th" ? "แขวง/ตำบล" : locale === "zh" ? "街道/分区" : "Subdistrict");
    if (!String(item?.addressLine || "").trim()) hints.push(locale === "th" ? "ที่อยู่" : locale === "zh" ? "地址" : "Address");
    if (!Array.isArray(item?.fileUrls) || item.fileUrls.length === 0) hints.push(locale === "th" ? "ไฟล์แนบ" : locale === "zh" ? "附件" : "Attachments");
    return hints;
  };

  const getQualityScore = (item: any) => {
    const checks = [
      Boolean(String(item?.title || "").trim()),
      Boolean(String(item?.propertyType || "").trim()),
      Boolean(String(item?.listingType || "").trim()),
      Boolean(String(item?.tier || "").trim()),
      Number.isFinite(Number(item?.price)) && Number(item?.price) > 0,
      Boolean(String(item?.province || "").trim()),
      Boolean(String(item?.district || "").trim()),
      Boolean(String(item?.subdistrict || "").trim()),
      Boolean(String(item?.addressLine || "").trim()),
      Array.isArray(item?.fileUrls) && item.fileUrls.length > 0,
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  };

  const getPropertyMetrics = (propertyId: string) => {
    const relevant = (propertyInquiries || []).filter(
      (inquiry: any) => String(inquiry?.propertyId || "") === String(propertyId || ""),
    );
    const total = relevant.length;
    const accepted = relevant.filter((inquiry: any) => ACCEPTED_STATUSES.has(String(inquiry?.status || "").toUpperCase())).length;
    const meeting = relevant.filter((inquiry: any) => MEETING_STATUSES.has(String(inquiry?.status || "").toUpperCase())).length;
    const completed = relevant.filter((inquiry: any) => String(inquiry?.status || "").toUpperCase() === "COMPLETED").length;
    return {
      total,
      acceptedRate: toPercent(accepted, total),
      meetingRate: toPercent(meeting, total),
      completedRate: toPercent(completed, total),
    };
  };

  const getFileKind = (url: string) => {
    const raw = String(url || "").toLowerCase();
    if (!raw) return "file";
    if (raw.startsWith("data:image/")) return "image";
    if (raw.startsWith("data:application/pdf")) return "pdf";
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)(\?|#|$)/i.test(raw)) return "image";
    if (/\.(pdf)(\?|#|$)/i.test(raw)) return "pdf";
    return "file";
  };

  const normalizePropertyItem = (raw: any) => {
    const title = String(raw?.title || raw?.service || "").trim() || defaultTitle;
    const titleTh = String(raw?.titleTh || raw?.serviceTh || title).trim() || title;
    const titleZh = String(raw?.titleZh || raw?.serviceZh || title).trim() || title;
    const province = normalizeLocationText(raw?.province || raw?.address?.province);
    const district = normalizeLocationText(raw?.district || raw?.address?.district);
    const subdistrict = normalizeLocationText(raw?.subdistrict || raw?.address?.subdistrict);
    const addressLine = normalizeLocationText(raw?.addressLine || raw?.address?.addressLine);

    const sourceFiles = Array.isArray(raw?.fileUrls)
      ? raw.fileUrls
      : Array.isArray(raw?.existingFiles)
      ? raw.existingFiles
      : Array.isArray(raw?.images)
      ? raw.images
      : Array.isArray(raw?.propertyImages)
      ? raw.propertyImages
      : [];

    const fileUrls: string[] = Array.from(
      new Set(
        sourceFiles
          .map((item: any) => normalizeImageUrl(extractImageUrlCandidate(item)))
          .filter(Boolean),
      ),
    );
    const primaryImage = normalizeImageUrl(raw?.primaryImage || "") || fileUrls.find((url) => getFileKind(url) === "image") || "";

    return {
      id: String(raw?.id || ""),
      title,
      titleTh,
      titleZh,
      description: String(raw?.description || "").trim(),
      propertyType: String(raw?.propertyType || "").toUpperCase(),
      listingType: String(raw?.listingType || "").toUpperCase(),
      tier: String(raw?.tier || "STANDARD").toUpperCase(),
      status: String(raw?.status || "ACTIVE").toUpperCase(),
      price: toNumberSafe(raw?.price ?? raw?.propertyPrice, 0),
      area: toNumberOrUndefined(raw?.area),
      bedrooms: toNumberOrUndefined(raw?.bedrooms),
      bathrooms: toNumberOrUndefined(raw?.bathrooms),
      floors: toNumberOrUndefined(raw?.floors),
      yearBuilt: toNumberOrUndefined(raw?.yearBuilt),
      province,
      district,
      subdistrict,
      addressLine,
      latitude: toNumberOrUndefined(raw?.latitude ?? raw?.address?.latitude),
      longitude: toNumberOrUndefined(raw?.longitude ?? raw?.address?.longitude),
      contactName: String(raw?.contactName || "").trim(),
      contactPhone: String(raw?.contactPhone || "").trim(),
      contactEmail: String(raw?.contactEmail || "").trim(),
      createdAt: raw?.createdAt,
      updatedAt: raw?.updatedAt,
      location: [addressLine, subdistrict, district, province].filter(Boolean).join(", ") || [subdistrict, district, province].filter(Boolean).join(", ") || "-",
      fileUrls,
      primaryImage,
    };
  };

  useEffect(() => {
    setItems((properties || []).map(normalizePropertyItem));
  }, [properties]);

  const readFileAsDataUrl = async (file: File): Promise<string> => {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const maybeConvertHeicToJpeg = async (file: File): Promise<File> => {
    const mime = String(file.type || "").toLowerCase();
    const isHeic = mime.includes("heic") || mime.includes("heif") || /\.(heic|heif)$/i.test(file.name || "");
    if (!isHeic) return file;

    try {
      const mod = await import("heic2any");
      const heic2any = (mod.default || mod) as (opts: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      const outputBlob = Array.isArray(converted) ? converted[0] : converted;
      if (!outputBlob) return file;
      const basename = (file.name || "image").replace(/\.(heic|heif)$/i, "") || "image";
      return new File([outputBlob], `${basename}.jpg`, { type: "image/jpeg" });
    } catch {
      return file;
    }
  };

  const compressPropertyImage = async (file: File): Promise<string> => {
    const source = await maybeConvertHeicToJpeg(file);
    if (!source.type.startsWith("image/")) return readFileAsDataUrl(source);

    // 0.27-0.30 MB target range (base64 string is ~4/3 binary size).
    const TARGET_MIN_CHARS = 360_000;
    const TARGET_MAX_CHARS = 400_000;
    const TARGET_MID_CHARS = 380_000;
    const passes = [
      { maxDim: 1600, quality: 0.86 },
      { maxDim: 1400, quality: 0.82 },
      { maxDim: 1200, quality: 0.78 },
      { maxDim: 1050, quality: 0.72 },
      { maxDim: 900, quality: 0.66 },
      { maxDim: 760, quality: 0.60 },
    ];

    return await new Promise((resolve) => {
      const img = document.createElement("img");
      const objectUrl = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let out = "";
        let bestWithinMax = "";
        let bestDistance = Number.POSITIVE_INFINITY;
        const run = (index: number) => {
          if (index >= passes.length) {
            resolve(bestWithinMax || out || "");
            return;
          }
          const pass = passes[index]!;
          const scale = Math.min(1, pass.maxDim / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          out = canvas.toDataURL("image/jpeg", pass.quality);
          if (out.length <= TARGET_MAX_CHARS) {
            const distance = Math.abs(out.length - TARGET_MID_CHARS);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestWithinMax = out;
            }
          }
          if (out.length >= TARGET_MIN_CHARS && out.length <= TARGET_MAX_CHARS) {
            resolve(out);
            return;
          }
          if (index === passes.length - 1) {
            resolve(bestWithinMax || out);
            return;
          }
          run(index + 1);
        };
        run(0);
      };
      img.onerror = async () => {
        URL.revokeObjectURL(objectUrl);
        try {
          resolve(await readFileAsDataUrl(source));
        } catch {
          resolve("");
        }
      };
      img.src = objectUrl;
    });
  };

  const convertFileForUpload = async (file: File): Promise<string> => {
    const isImage = file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name || "");
    const raw = isImage ? await compressPropertyImage(file) : await readFileAsDataUrl(file);
    return normalizeImageUrl(raw) || raw;
  };

  const buildPropertyPayload = (source: any, imageUrls: string[]) => {
    const payload: any = {
      title: String(source?.title || "").trim(),
      description: String(source?.description || "").trim(),
      propertyType: String(source?.propertyType || "").trim().toUpperCase(),
      listingType: String(source?.listingType || "").trim().toUpperCase(),
      tier: String(source?.tier || "STANDARD").trim().toUpperCase(),
      status: String(source?.status || "ACTIVE").trim().toUpperCase(),
      price: toNumberSafe(source?.price, 0),
      area: toNumberOrUndefined(source?.area),
      bedrooms: toNumberOrUndefined(source?.bedrooms),
      bathrooms: toNumberOrUndefined(source?.bathrooms),
      floors: toNumberOrUndefined(source?.floors),
      yearBuilt: toNumberOrUndefined(source?.yearBuilt),
      province: String(source?.province || "").trim(),
      district: String(source?.district || "").trim(),
      subdistrict: String(source?.subdistrict || "").trim(),
      addressLine: String(source?.addressLine || "").trim(),
      latitude: toNumberOrUndefined(source?.latitude),
      longitude: toNumberOrUndefined(source?.longitude),
      contactName: String(source?.contactName || "").trim(),
      contactPhone: String(source?.contactPhone || "").trim(),
      contactEmail: String(source?.contactEmail || "").trim(),
      images: imageUrls.slice(0, MAX_FILES).map((url, idx) => ({
        url,
        key: `property/${String(source?.id || "new")}/file-${idx + 1}`,
      })),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    return payload;
  };

  const duplicateProperty = async (property: any) => {
    const normalized = normalizePropertyItem(property);
    let token = localStorage.getItem("subscriber_token") || "";
    if (!token) {
      alert(locale === "th" ? "กรุณาเข้าสู่ระบบใหม่" : locale === "zh" ? "请重新登录" : "Please log in again.");
      return;
    }

    const payload = buildPropertyPayload(
      {
        ...normalized,
        title:
          locale === "th"
            ? `${normalized.title} (คัดลอก)`
            : locale === "zh"
            ? `${normalized.title}（副本）`
            : `${normalized.title} (Copy)`,
        status: "DRAFT",
      },
      normalized.fileUrls,
    );

    const createReq = (authToken: string) =>
      fetch("/api/v1/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

    let res = await createReq(token);
    if (!res.ok && [401, 403].includes(res.status)) {
      const refreshedToken = await refreshSubscriberSession(token);
      if (refreshedToken) {
        token = refreshedToken;
        res = await createReq(token);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      alert(
        String(err?.message || "") ||
          (locale === "th"
            ? "ไม่สามารถคัดลอกประกาศได้"
            : locale === "zh"
            ? "无法复制房源"
            : "Could not duplicate this listing."),
      );
      return;
    }

    const created = await res.json().catch(() => null);
    const normalizedCreated = normalizePropertyItem(created || payload);
    setItems((prev) => [normalizedCreated, ...prev]);
  };

  const togglePropertyStatus = async (property: any) => {
    const normalized = normalizePropertyItem(property);
    const nextStatus = normalized.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    let token = localStorage.getItem("subscriber_token") || "";
    if (!token || !normalized.id) {
      alert(locale === "th" ? "กรุณาเข้าสู่ระบบใหม่" : locale === "zh" ? "请重新登录" : "Please log in again.");
      return;
    }

    const updateReq = (authToken: string) =>
      fetch(`/api/v1/properties/${normalized.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

    let res = await updateReq(token);
    if (!res.ok && [401, 403].includes(res.status)) {
      const refreshedToken = await refreshSubscriberSession(token);
      if (refreshedToken) {
        token = refreshedToken;
        res = await updateReq(token);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      alert(
        String(err?.message || "") ||
          (locale === "th"
            ? "ไม่สามารถเปลี่ยนสถานะประกาศได้"
            : locale === "zh"
            ? "无法切换房源状态"
            : "Could not change listing status."),
      );
      return;
    }

    const updated = await res.json().catch(() => null);
    const normalizedUpdated = normalizePropertyItem(updated || { ...normalized, status: nextStatus });
    setItems((prev) => prev.map((item) => (item.id === normalizedUpdated.id ? normalizedUpdated : item)));
    setViewing((prev: any) => (prev?.id === normalizedUpdated.id ? normalizedUpdated : prev));
    setEditing((prev: any) => (prev?.id === normalizedUpdated.id ? { ...prev, status: normalizedUpdated.status } : prev));
  };

  const openDetail = (property: any) => {
    setViewing(normalizePropertyItem(property));
    setSaveError("");
  };

  const openEdit = (property: any) => {
    const normalized = normalizePropertyItem(property);
    setEditing({
      ...normalized,
      existingFiles: [...normalized.fileUrls],
      newFiles: [] as File[],
    });
    setSaveError("");
  };

  const saveEdit = async () => {
    if (!editing?.id) return;

    const title = String(editing.title || "").trim();
    const propertyType = String(editing.propertyType || "").trim().toUpperCase();
    const listingType = String(editing.listingType || "").trim().toUpperCase();
    if (!title || !propertyType || !listingType) {
      setSaveError(
        locale === "th"
          ? "กรุณากรอกชื่อประกาศ ประเภททรัพย์สิน และประเภทการประกาศ"
          : locale === "zh"
          ? "请填写标题、房产类型和交易类型"
          : "Please fill title, property type, and listing type.",
      );
      return;
    }

    const complianceHints = getComplianceHints({
      ...editing,
      fileUrls: [
        ...(Array.isArray(editing.existingFiles) ? editing.existingFiles : []),
        ...(Array.isArray(editing.newFiles) ? editing.newFiles : []),
      ],
    });
    if (complianceHints.length > 0) {
      const proceed = confirm(
        (locale === "th"
          ? "แจ้งเตือนความครบถ้วนก่อนอัปเดต:\n"
          : locale === "zh"
          ? "更新前合规提醒:\n"
          : "Compliance warning before update:\n") +
          `- ${complianceHints.join("\n- ")}\n\n` +
          (locale === "th"
            ? "ต้องการบันทึกต่อหรือไม่?"
            : locale === "zh"
            ? "是否继续保存？"
            : "Do you want to continue saving?"),
      );
      if (!proceed) return;
    }

    setSaving(true);
    setSaveError("");
    try {
      let token = localStorage.getItem("subscriber_token") || "";
      if (!token) {
        setSaveError(locale === "th" ? "กรุณาเข้าสู่ระบบใหม่" : locale === "zh" ? "请重新登录" : "Please log in again.");
        return;
      }

      const existingFiles = Array.isArray(editing.existingFiles)
        ? editing.existingFiles
            .map((entry: any) => normalizeImageUrl(extractImageUrlCandidate(entry)))
            .filter(Boolean)
        : [];
      const pickedFiles: File[] = Array.isArray(editing.newFiles) ? editing.newFiles : [];
      const preparedNewFiles = await Promise.all(pickedFiles.map((f) => convertFileForUpload(f)));
      const mergedUrls = Array.from(new Set([...existingFiles, ...preparedNewFiles.filter(Boolean)])).slice(0, MAX_FILES);

      const payload = buildPropertyPayload(
        {
          ...editing,
          title,
          propertyType,
          listingType,
        },
        mergedUrls,
      );

      const updateReq = (authToken: string) =>
        fetch(`/api/v1/properties/${editing.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });

      let res = await updateReq(token);
      if (!res.ok && [401, 403].includes(res.status)) {
        const refreshedToken = await refreshSubscriberSession(token);
        if (refreshedToken) {
          token = refreshedToken;
          res = await updateReq(token);
        }
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setSaveError(
          String(err?.message || "") ||
            (locale === "th"
              ? "ไม่สามารถบันทึกข้อมูลได้"
              : locale === "zh"
              ? "无法保存数据"
              : "Could not save property changes."),
        );
        return;
      }

      const updated = await res.json().catch(() => null);
      const normalizedUpdated = normalizePropertyItem(updated || { ...editing, images: payload.images });
      setItems((prev) => prev.map((item) => (item.id === normalizedUpdated.id ? normalizedUpdated : item)));
      setViewing((prev: any) => (prev?.id === normalizedUpdated.id ? normalizedUpdated : prev));
      setEditing(null);
    } catch {
      setSaveError(
        locale === "th"
          ? "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
          : locale === "zh"
          ? "保存时发生错误"
          : "An error occurred while saving.",
      );
    } finally {
      setSaving(false);
    }
  };

  const syncPropertiesFromServer = async (authToken: string) => {
    const res = await fetch('/api/v1/properties/my', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;

    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return;
    setItems(data.map(normalizePropertyItem));
  };

  const removeProperty = async (id: string) => {
    if (!id) return;
    const ok = confirm(
      locale === "th"
        ? "ยืนยันลบประกาศนี้หรือไม่?"
        : locale === "zh"
        ? "确认删除该房源吗？"
        : "Delete this property listing?",
    );
    if (!ok) return;

    setRemovingId(id);
    try {
      let token = localStorage.getItem("subscriber_token") || "";
      if (!token) {
        alert(locale === 'th' ? 'กรุณาเข้าสู่ระบบใหม่' : locale === 'zh' ? '请重新登录' : 'Please log in again.');
        return;
      }
      const removeReq = (authToken: string) =>
        fetch(`/api/v1/properties/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });

      let res = await removeReq(token);
      if (!res.ok && [401, 403].includes(res.status)) {
        const refreshedToken = await refreshSubscriberSession(token);
        if (refreshedToken) {
          token = refreshedToken;
          res = await removeReq(token);
        }
      }

      if (!res.ok) {
        if (res.status === 404) {
          setItems((prev) => prev.filter((item) => item.id !== id));
          setViewing((prev: any) => (prev?.id === id ? null : prev));
          setEditing((prev: any) => (prev?.id === id ? null : prev));
          await syncPropertiesFromServer(token);
          alert(
            locale === 'th'
              ? 'รายการนี้อาจถูกลบไปก่อนแล้ว ระบบได้รีเฟรชรายการล่าสุดให้แล้ว'
              : locale === 'zh'
              ? '该房源可能已被删除，列表已同步为最新状态'
              : 'This listing may already be deleted. The latest list has been synced.',
          );
          return;
        }

        const err = await res.json().catch(() => null);
        alert(
          String(err?.message || '') ||
            (locale === 'th'
              ? 'ไม่สามารถลบประกาศได้ในขณะนี้ กรุณาลองใหม่'
              : locale === 'zh'
              ? '当前无法删除该房源，请稍后重试'
              : 'Could not delete this listing right now. Please try again.'),
        );
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setViewing((prev: any) => (prev?.id === id ? null : prev));
      setEditing((prev: any) => (prev?.id === id ? null : prev));
      await syncPropertiesFromServer(token);
    } catch {
      alert(
        locale === 'th'
          ? 'เกิดข้อผิดพลาดขณะลบประกาศ กรุณาลองใหม่'
          : locale === 'zh'
          ? '删除房源时发生错误，请重试'
          : 'An error occurred while deleting the listing. Please try again.',
      );
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            {locale === "th" ? "อสังหาริมทรัพย์ของคุณ" : locale === "zh" ? "您的房产" : "Your Properties"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {locale === "th"
              ? `แสดงทั้งหมด ${items.length} รายการ`
              : locale === "zh"
              ? `共显示 ${items.length} 条`
              : `Showing all ${items.length} listings`}
          </p>
        </div>
        <Link href={`${prefix}/properties/register`} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition whitespace-nowrap">
          {locale === "th" ? "ลงประกาศใหม่" : locale === "zh" ? "发布新房源" : "List New"}
        </Link>
      </div>

      <div className="p-3 sm:p-4 space-y-3 bg-gradient-to-b from-slate-50/70 to-white">
        {items.length > 0 ? (
          items.map((p: any, index: number) => {
            const metrics = getPropertyMetrics(p.id);
            const qualityScore = getQualityScore(p);
            const complianceHints = getComplianceHints(p);
            const mapCoordinates =
              Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
                ? `${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}`
                : "-";

            return (
              <div
                key={p.id}
                className={`p-5 sm:p-6 rounded-xl border shadow-sm transition cursor-pointer ${index % 2 === 0 ? 'bg-sky-50/50 border-sky-100 hover:border-sky-200' : 'bg-emerald-50/45 border-emerald-100 hover:border-emerald-200'}`}
                onClick={() => openDetail(p)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-teal-100 border border-teal-100 shrink-0">
                    <img
                      src={p.primaryImage || "/images/scenic-house.jpg"}
                      alt={p.title || "Property"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                          {locale === 'th'
                            ? `ประกาศลำดับที่ ${index + 1}`
                            : locale === 'zh'
                            ? `房源 #${index + 1}`
                            : `Listing #${index + 1}`}
                        </p>
                        <h3 className="font-bold text-gray-900 truncate">
                          {locale === "th" ? p.titleTh : locale === "zh" ? p.titleZh : p.title}
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 align-middle">{tierLabel(p.tier)}</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 truncate">{p.location} &middot; ฿{Number(p.price || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {propertyTypeLabel(p.propertyType)} &middot; {listingLabel(p.listingType)} &middot; {p.fileUrls.length} {locale === "th" ? "ไฟล์" : locale === "zh" ? "文件" : "files"}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${p.status === "ACTIVE" || p.status === "CREATED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === "th" ? "สถานะ" : locale === "zh" ? "状态" : "Status"}</p>
                    <p className="text-xs font-semibold text-gray-900 mt-1">{p.status}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === "th" ? "อัปเดตล่าสุด" : locale === "zh" ? "最近更新" : "Last updated"}</p>
                    <p className="text-xs font-semibold text-gray-900 mt-1">{toDisplayDateTime(p.updatedAt || p.createdAt)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === "th" ? "การมองเห็น" : locale === "zh" ? "可见性" : "Visibility"}</p>
                    <p className="text-xs font-semibold text-gray-900 mt-1">{getVisibilityLabel(p.status)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === "th" ? "คะแนนคุณภาพ" : locale === "zh" ? "质量评分" : "Quality score"}</p>
                    <p className="text-xs font-semibold text-gray-900 mt-1">{qualityScore}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                  <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === "th" ? "จำนวนคำขอ" : locale === "zh" ? "询盘数" : "Inquiries"}</p>
                    <p className="text-xs font-semibold text-sky-900 mt-1">{metrics.total}</p>
                  </div>
                  <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === "th" ? "อัตราตอบรับ" : locale === "zh" ? "接受率" : "Accept rate"}</p>
                    <p className="text-xs font-semibold text-sky-900 mt-1">{metrics.acceptedRate}%</p>
                  </div>
                  <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === "th" ? "แปลงเป็นนัดหมาย" : locale === "zh" ? "会面转化" : "Meeting conversion"}</p>
                    <p className="text-xs font-semibold text-sky-900 mt-1">{metrics.meetingRate}%</p>
                  </div>
                  <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === "th" ? "แปลงเป็นสำเร็จ" : locale === "zh" ? "完成转化" : "Completed conversion"}</p>
                    <p className="text-xs font-semibold text-sky-900 mt-1">{metrics.completedRate}%</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3 mb-3 bg-white">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase">{locale === "th" ? "สื่อพอร์ตโฟลิโอ" : locale === "zh" ? "媒体资料" : "Portfolio media"}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{p.fileUrls.length} {locale === "th" ? "ไฟล์" : locale === "zh" ? "个文件" : "attachments"}</span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const downloaded = await downloadAttachmentUrls({ urls: p.fileUrls, prefix: "property-file" });
                          if (!downloaded) {
                            alert(locale === "th" ? "ไม่พบไฟล์ที่ดาวน์โหลดได้" : locale === "zh" ? "未找到可下载文件" : "No downloadable file found.");
                          }
                        }}
                      >
                        {locale === "th" ? "ดาวน์โหลดทั้งหมด" : locale === "zh" ? "下载全部" : "Download all"}
                      </button>
                    </div>
                  </div>
                  {p.fileUrls.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {p.fileUrls.slice(0, 6).map((fileUrl: string, index: number) => {
                        const kind = getFileKind(fileUrl);
                        return kind === "image" ? (
                          <img key={`${fileUrl}-${index}`} src={fileUrl} alt="property media" className="w-14 h-14 rounded-md object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div key={`${fileUrl}-${index}`} className="w-14 h-14 rounded-md border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {kind === "pdf" ? "PDF" : "FILE"}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">{locale === "th" ? "ยังไม่มีไฟล์แนบ" : locale === "zh" ? "暂无附件" : "No attachments yet."}</p>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 p-3 mb-3 bg-white">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">{locale === "th" ? "ตำแหน่งโครงการ" : locale === "zh" ? "位置信息" : "Location clarity"}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                    <p><span className="text-gray-500">{locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province"}:</span> {p.province || "-"}</p>
                    <p><span className="text-gray-500">{locale === "th" ? "เขต/อำเภอ" : locale === "zh" ? "区/县" : "District"}:</span> {p.district || "-"}</p>
                    <p><span className="text-gray-500">{locale === "th" ? "แขวง/ตำบล" : locale === "zh" ? "街道/分区" : "Subdistrict"}:</span> {p.subdistrict || "-"}</p>
                    <p><span className="text-gray-500">{locale === "th" ? "พิกัดแผนที่" : locale === "zh" ? "坐标" : "Map coordinates"}:</span> {mapCoordinates}</p>
                  </div>
                  <p className="text-xs text-gray-700 mt-2"><span className="text-gray-500">{locale === "th" ? "ที่อยู่เต็ม" : locale === "zh" ? "完整地址" : "Full address"}:</span> {p.addressLine || "-"}</p>
                </div>

                {complianceHints.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-3">
                    <span className="font-semibold">{locale === "th" ? "คำเตือนก่อนเผยแพร่/อัปเดต:" : locale === "zh" ? "发布/更新前提醒:" : "Pre-publish/update warning:"}</span>{" "}
                    {complianceHints.join(", ")}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-sm mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(p);
                    }}
                    className="px-4 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-lg transition"
                  >
                    {locale === "th" ? "ดูรายละเอียด" : locale === "zh" ? "查看详情" : "Details"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(p);
                    }}
                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                  >
                    {locale === "th" ? "แก้ไข" : locale === "zh" ? "编辑" : "Edit"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void duplicateProperty(p);
                    }}
                    className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition"
                  >
                    {locale === "th" ? "ทำซ้ำ" : locale === "zh" ? "复制" : "Duplicate"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void togglePropertyStatus(p);
                    }}
                    className="px-4 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg transition"
                  >
                    {String(p.status || "").toUpperCase() === "ACTIVE"
                      ? locale === "th"
                        ? "หยุดแสดง"
                        : locale === "zh"
                        ? "暂停"
                        : "Pause"
                      : locale === "th"
                      ? "เปิดใช้งาน"
                      : locale === "zh"
                      ? "启用"
                      : "Activate"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProperty(p.id);
                    }}
                    disabled={removingId === p.id}
                    className="ml-auto px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingId === p.id
                      ? locale === "th"
                        ? "กำลังลบ..."
                        : locale === "zh"
                        ? "删除中..."
                        : "Removing..."
                      : locale === "th"
                      ? "ลบ"
                      : locale === "zh"
                      ? "删除"
                      : "Delete"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีประกาศอสังหาริมทรัพย์" : locale === "zh" ? "没有房产列表" : "No properties listed"}</p>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center p-4 pt-14 sm:pt-16">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewing(null)}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:text-gray-900"
            >
              ✕
            </button>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{locale === "th" ? viewing.titleTh : locale === "zh" ? viewing.titleZh : viewing.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{tierLabel(viewing.tier)} &middot; {propertyTypeLabel(viewing.propertyType)} &middot; {listingLabel(viewing.listingType)} &middot; {viewing.status}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(viewing)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition">
                  {locale === "th" ? "แก้ไข" : locale === "zh" ? "编辑" : "Edit"}
                </button>
                <button onClick={() => setViewing(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-74px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">{locale === "th" ? "ราคา" : locale === "zh" ? "价格" : "Price"}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">฿{Number(viewing.price || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">{locale === "th" ? "ระดับบริการ" : locale === "zh" ? "服务等级" : "Tier"}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{viewing.tier || "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">{locale === "th" ? "ขนาดพื้นที่" : locale === "zh" ? "面积" : "Area"}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{viewing.area != null ? `${viewing.area}` : "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">{locale === "th" ? "ห้องนอน/ห้องน้ำ" : locale === "zh" ? "卧室/浴室" : "Bed/Bath"}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{viewing.bedrooms ?? "-"} / {viewing.bathrooms ?? "-"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{locale === "th" ? "ตำแหน่งโครงการ" : locale === "zh" ? "位置信息" : "Location clarity"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-800">
                  <p><span className="text-gray-500">{locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province"}:</span> {viewing.province || "-"}</p>
                  <p><span className="text-gray-500">{locale === "th" ? "เขต/อำเภอ" : locale === "zh" ? "区/县" : "District"}:</span> {viewing.district || "-"}</p>
                  <p><span className="text-gray-500">{locale === "th" ? "แขวง/ตำบล" : locale === "zh" ? "街道/分区" : "Subdistrict"}:</span> {viewing.subdistrict || "-"}</p>
                  <p>
                    <span className="text-gray-500">{locale === "th" ? "พิกัดแผนที่" : locale === "zh" ? "坐标" : "Map coordinates"}:</span>{" "}
                    {Number.isFinite(Number(viewing.latitude)) && Number.isFinite(Number(viewing.longitude))
                      ? `${Number(viewing.latitude).toFixed(6)}, ${Number(viewing.longitude).toFixed(6)}`
                      : "-"}
                  </p>
                </div>
                <p className="text-sm text-gray-800 mt-2"><span className="text-gray-500">{locale === "th" ? "ที่อยู่เต็ม" : locale === "zh" ? "完整地址" : "Full address"}:</span> {viewing.addressLine || "-"}</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{locale === "th" ? "รายละเอียด" : locale === "zh" ? "描述" : "Description"}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewing.description || "-"}</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{locale === "th" ? "ไฟล์ที่อัปโหลด" : locale === "zh" ? "已上传文件" : "Uploaded Files"}</p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                    onClick={async () => {
                      const downloaded = await downloadAttachmentUrls({
                        urls: viewing.fileUrls,
                        prefix: "property-file",
                      });
                      if (!downloaded) {
                        alert(locale === "th" ? "ไม่พบไฟล์ที่ดาวน์โหลดได้" : locale === "zh" ? "未找到可下载文件" : "No downloadable file found.");
                      }
                    }}
                  >
                    {locale === "th" ? "ดาวน์โหลดทั้งหมด" : locale === "zh" ? "下载全部" : "Download All"}
                  </button>
                </div>

                {viewing.fileUrls.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {viewing.fileUrls.map((fileUrl: string, index: number) => {
                      const kind = getFileKind(fileUrl);
                      const fallbackName = `property-file-${index + 1}`;
                      const fileName = sanitizeFilename(inferFilenameFromUrl(fileUrl, fallbackName), fallbackName);
                      return (
                        <div key={`${fileName}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                          {kind === "image" ? (
                            <img src={fileUrl} alt={fileName} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="h-32 flex items-center justify-center text-3xl">{kind === "pdf" ? "📄" : "📎"}</div>
                          )}
                          <div className="p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-700 truncate" title={fileName}>{fileName}</p>
                            <button
                              type="button"
                              className="w-full py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                              onClick={async () => {
                                const downloaded = await downloadAttachmentUrls({ urls: [fileUrl], prefix: "property-file" });
                                if (!downloaded) {
                                  alert(locale === "th" ? "ไม่สามารถดาวน์โหลดไฟล์นี้ได้" : locale === "zh" ? "无法下载此文件" : "Could not download this file.");
                                }
                              }}
                            >
                              {locale === "th" ? "ดาวน์โหลด" : locale === "zh" ? "下载" : "Download"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{locale === "th" ? "ยังไม่มีไฟล์ที่แนบ" : locale === "zh" ? "暂无附件" : "No files attached."}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center p-4 pt-14 sm:pt-16">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:text-gray-900"
            >
              ✕
            </button>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{locale === "th" ? "แก้ไขข้อมูลอสังหาริมทรัพย์" : locale === "zh" ? "编辑房源信息" : "Edit Property"}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-74px)]">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
              )}

              {(() => {
                const hints = getComplianceHints({
                  ...editing,
                  fileUrls: [
                    ...(Array.isArray(editing.existingFiles) ? editing.existingFiles : []),
                    ...(Array.isArray(editing.newFiles) ? editing.newFiles : []),
                  ],
                });
                if (hints.length === 0) return null;
                return (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <span className="font-semibold">{locale === "th" ? "คำเตือนก่อนเผยแพร่/อัปเดต:" : locale === "zh" ? "发布/更新前提醒:" : "Pre-publish/update warning:"}</span>{" "}
                    {hints.join(", ")}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ชื่อประกาศ" : locale === "zh" ? "标题" : "Title"}</label>
                  <input value={editing.title} onChange={(e) => setEditing((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ประเภททรัพย์สิน" : locale === "zh" ? "房产类型" : "Property Type"}</label>
                  <select value={editing.propertyType} onChange={(e) => setEditing((prev: any) => ({ ...prev, propertyType: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">--</option>
                    {PROPERTY_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{propertyTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ประเภทการประกาศ" : locale === "zh" ? "交易类型" : "Listing Type"}</label>
                  <select value={editing.listingType} onChange={(e) => setEditing((prev: any) => ({ ...prev, listingType: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">--</option>
                    {LISTING_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{listingLabel(type)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ระดับบริการ" : locale === "zh" ? "服务等级" : "Tier"}</label>
                  <select value={editing.tier} onChange={(e) => setEditing((prev: any) => ({ ...prev, tier: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    {TIER_OPTIONS.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ราคา" : locale === "zh" ? "价格" : "Price"}</label>
                  <input type="number" min="0" value={editing.price} onChange={(e) => setEditing((prev: any) => ({ ...prev, price: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "พื้นที่" : locale === "zh" ? "面积" : "Area"}</label>
                  <input type="number" min="0" value={editing.area ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, area: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ห้องนอน" : locale === "zh" ? "卧室" : "Bedrooms"}</label>
                  <input type="number" min="0" value={editing.bedrooms ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, bedrooms: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ห้องน้ำ" : locale === "zh" ? "浴室" : "Bathrooms"}</label>
                  <input type="number" min="0" value={editing.bathrooms ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, bathrooms: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ชั้น" : locale === "zh" ? "楼层" : "Floors"}</label>
                  <input type="number" min="0" value={editing.floors ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, floors: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ปีที่สร้าง" : locale === "zh" ? "建成年份" : "Year Built"}</label>
                  <input type="number" min="1800" value={editing.yearBuilt ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, yearBuilt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province"}</label>
                  <input value={editing.province} onChange={(e) => setEditing((prev: any) => ({ ...prev, province: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "เขต/อำเภอ" : locale === "zh" ? "区/县" : "District"}</label>
                  <input value={editing.district} onChange={(e) => setEditing((prev: any) => ({ ...prev, district: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "แขวง/ตำบล" : locale === "zh" ? "街道/分区" : "Subdistrict"}</label>
                  <input value={editing.subdistrict} onChange={(e) => setEditing((prev: any) => ({ ...prev, subdistrict: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ที่อยู่" : locale === "zh" ? "详细地址" : "Address Line"}</label>
                  <input value={editing.addressLine} onChange={(e) => setEditing((prev: any) => ({ ...prev, addressLine: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ชื่อผู้ติดต่อ" : locale === "zh" ? "联系人姓名" : "Contact Name"}</label>
                  <input value={editing.contactName} onChange={(e) => setEditing((prev: any) => ({ ...prev, contactName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "เบอร์โทรผู้ติดต่อ" : locale === "zh" ? "联系电话" : "Contact Phone"}</label>
                  <input value={editing.contactPhone} onChange={(e) => setEditing((prev: any) => ({ ...prev, contactPhone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "อีเมลผู้ติดต่อ" : locale === "zh" ? "联系邮箱" : "Contact Email"}</label>
                  <input type="email" value={editing.contactEmail} onChange={(e) => setEditing((prev: any) => ({ ...prev, contactEmail: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "รายละเอียด" : locale === "zh" ? "描述" : "Description"}</label>
                  <textarea value={editing.description} onChange={(e) => setEditing((prev: any) => ({ ...prev, description: e.target.value }))} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600 uppercase">{locale === "th" ? "ไฟล์ที่อัปโหลด" : locale === "zh" ? "已上传文件" : "Uploaded Files"}</p>
                  <p className="text-xs text-gray-500">{(editing.existingFiles?.length || 0) + (editing.newFiles?.length || 0)} / {MAX_FILES}</p>
                </div>

                {Array.isArray(editing.existingFiles) && editing.existingFiles.length > 0 ? (
                  <div className="space-y-2">
                    {editing.existingFiles.map((fileUrl: string, index: number) => {
                      const fallbackName = `property-file-${index + 1}`;
                      const fileName = sanitizeFilename(inferFilenameFromUrl(fileUrl, fallbackName), fallbackName);
                      return (
                        <div key={`${fileName}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                          <p className="text-xs text-gray-700 truncate" title={fileName}>{fileName}</p>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                            onClick={() =>
                              setEditing((prev: any) => ({
                                ...prev,
                                existingFiles: (prev?.existingFiles || []).filter((_: string, i: number) => i !== index),
                              }))
                            }
                          >
                            {locale === "th" ? "ลบ" : locale === "zh" ? "删除" : "Remove"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{locale === "th" ? "ยังไม่มีไฟล์เดิม" : locale === "zh" ? "暂无已有文件" : "No existing files."}</p>
                )}

                {Array.isArray(editing.newFiles) && editing.newFiles.length > 0 && (
                  <div className="space-y-2">
                    {editing.newFiles.map((file: File, index: number) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <p className="text-xs text-emerald-800 truncate" title={file.name}>{file.name}</p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                          onClick={() =>
                            setEditing((prev: any) => ({
                              ...prev,
                              newFiles: (prev?.newFiles || []).filter((_: File, i: number) => i !== index),
                            }))
                          }
                        >
                          {locale === "th" ? "ลบ" : locale === "zh" ? "删除" : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    setEditing((prev: any) => {
                      const existingCount = Array.isArray(prev?.existingFiles) ? prev.existingFiles.length : 0;
                      const currentNew: File[] = Array.isArray(prev?.newFiles) ? prev.newFiles : [];
                      const slotsLeft = Math.max(0, MAX_FILES - existingCount - currentNew.length);
                      return {
                        ...prev,
                        newFiles: [...currentNew, ...selected.slice(0, slotsLeft)],
                      };
                    });
                    e.currentTarget.value = "";
                  }}
                />
                <p className="text-xs text-gray-500">
                  {locale === "th"
                    ? `รองรับไฟล์รูปภาพและ PDF (สูงสุด ${MAX_FILES} ไฟล์)`
                    : locale === "zh"
                    ? `支持图片和 PDF 文件（最多 ${MAX_FILES} 个）`
                    : `Supports image and PDF files (up to ${MAX_FILES} files).`}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700">
                  {locale === "th" ? "ยกเลิก" : locale === "zh" ? "取消" : "Cancel"}
                </button>
                <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving
                    ? locale === "th"
                      ? "กำลังบันทึก..."
                      : locale === "zh"
                      ? "保存中..."
                      : "Saving..."
                    : locale === "th"
                    ? "บันทึก"
                    : locale === "zh"
                    ? "保存"
                    : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



/* ===== DASHBOARD LOGGED IN STATE ===== */
function PartnerDashboard({ locale, partner, prefix, onLogout, orders }: { locale: string; partner: any; prefix: string; onLogout: () => void, orders?: any[] }) {
  const activeOrders = orders ? orders.filter((o: any) => o.status === 'IN_PROGRESS' || o.status === 'CONFIRMED') : [];
  const requestOrders = orders ? orders.filter((o: any) => o.status === 'PENDING' || o.status === 'CREATED') : [];

  const [activeTab, setActiveTab] = useState<"overview"|"profile"|"active"|"properties"|"history"|"chat"|"notifications">("active");
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: "overview", icon: "", label: "Overview", count: null },
          { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: 4 },
        { key: "active", icon: "", label: "Active Jobs", count: 3 },
          
          { key: "properties", icon: "", label: "Properties", count: null },
          { key: "history", icon: "", label: "History", count: null },
          { key: "chat", icon: "", label: "Chat", count: 3 },
          { key: "alerts", icon: "", label: "Alerts", count: 3 },
          { key: "profile", icon: "", label: "Profile", count: null },
        ].map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === tab.key ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}
   {activeTab === "active" && <PartnerJobs locale={locale} activeJobs={[...activeOrders, ...(orders || [])]} priceList={(partner as any)?.priceList} />}
   
  
      
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>


      
        
        {/* LEFT COLUMN: Profile & Stats */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl font-bold shadow-inner">
                {partner.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{partner.name}</h2>
                <p className="text-sm text-gray-500">{partner.email} &middot; {partner.phone || "0819852846"}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">Active</span>
                  <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">{partner.tier || "Standard Tier"}</span>
                  <span className="text-xs bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded">KYC ✓</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Active Jobs</p>
                <p className="text-lg font-bold text-gray-900">3</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                <p className="text-lg font-bold text-gray-900">47</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Rating</p>
                <p className="text-lg font-bold text-gray-900 text-amber-500">4.8 </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Response</p>
                <p className="text-lg font-bold text-green-600">96%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Repeat Clients</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Monthly Earn</p>
                <p className="text-lg font-bold text-sky-600">฿26,500</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition">
              {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
            </button>
          </div>

          {/* Monthly Earnings Chart (Simplified UI) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">Monthly Earnings</h3>
              <span className="text-sky-600 font-bold text-sm">฿26,500 (May 26)</span>
            </div>
            <div className="p-5 flex items-end justify-between h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-200 rounded-t-sm h-12 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿12.5k</span></div>
                <span className="text-xs font-bold text-gray-500">Jan</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-300 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿15.2k</span></div>
                <span className="text-xs font-bold text-gray-500">Feb</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-400 rounded-t-sm h-20 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.8k</span></div>
                <span className="text-xs font-bold text-gray-500">Mar</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-500 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.5k</span></div>
                <span className="text-xs font-bold text-gray-900">Apr</span>
              </div>
            </div>
          </div>


        </div>

        {/* RIGHT COLUMN: Jobs & Requests */}
        <div className="lg:col-span-2 space-y-6">
          
                    {/* Active Jobs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"> Active Jobs</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{activeOrders.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.slice(0, 3).map((o: any, i: number) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.service}</h3>
                      <p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {fmtDate(o.createdAt)} &middot; Budget: ฿{o.estimatedPrice || "0"} &middot; {o.po || `PO-2605-${o.id?.slice(0, 4)}`} | {o.user?.subdistrict || "Saphansong"}</p><div className="mt-2 w-full">
<div className="flex justify-between text-[10px] text-gray-500 mb-1 px-1">
  <span className={['PENDING',''].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Notify</span>
  <span className={['CONFIRMED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Accept</span>
  <span className={['ACCEPTED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Fee & Proceed</span>
  <span className={['IN_PROGRESS'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Chat</span>
  <span className={['MEETING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Meet</span>
  <span className={['VARIATION'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Variation</span>
  <span className={['WORKING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Complete</span>
  <span className={['RATING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Rate</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: (o.status === 'COMPLETED' ? '100%' : o.status === 'RATING' ? '88%' : o.status === 'WORKING' ? '77%' : o.status === 'VARIATION' ? '66%' : o.status === 'MEETING' ? '55%' : o.status === 'IN_PROGRESS' ? '44%' : o.status === 'ACCEPTED' ? '33%' : o.status === 'CONFIRMED' ? '22%' : '11%') }} /></div>
</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
                    <span className="font-bold text-gray-900 mt-1">฿{o.finalPrice || o.estimatedPrice || 0}</span>
                  </div>
                </div>
              ))}
              {activeOrders.length === 0 && <div className="p-8 text-center text-gray-500">No active jobs.</div>}
            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">Recent Chats</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { id: "A2X", svc: "Plumbing", msg: "Thank you, waiting for you", time: "2m ago", unread: 2 },
                { id: "B7K", svc: "AC", msg: "Which day works for you?", time: "30m ago", unread: 1 },
                { id: "C4M", svc: "Electrical", msg: "Job is done, thanks!", time: "2h ago", unread: 0 },
              ].map(c => (
                <div key={c.id} className={`p-4 flex items-center gap-4 cursor-pointer transition ${c.unread ? 'bg-purple-50/30 hover:bg-purple-50' : 'hover:bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                    {c.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-gray-900 text-sm">Customer #{c.id} <span className="text-gray-400 font-normal">&middot; {c.svc}</span></p>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${c.unread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{c.msg}</p>
                      {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



function PartnerActiveJobs({ locale, prefix, orders }: { locale: string; prefix: string; orders: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"> Active Jobs</h2>
        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{orders.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {orders.map((o: any, i: number) => (
          <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm"></div>
              <div>
                <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.tier || 'Standard'}</span></h3>
                <p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {fmtDate(o.createdAt)} &middot; Budget: ฿{o.estimatedPrice || "0"} &middot; {o.po || `PO-2605-${o.id?.slice(0, 4)}`} | {o.user?.subdistrict || "Saphansong"}</p><div className="mt-2 w-full">
<div className="flex justify-between text-[10px] text-gray-500 mb-1 px-1">
  <span className={['PENDING',''].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Notify</span>
  <span className={['CONFIRMED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Accept</span>
  <span className={['ACCEPTED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Fee & Proceed</span>
  <span className={['IN_PROGRESS'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Chat</span>
  <span className={['MEETING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Meet</span>
  <span className={['VARIATION'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Variation</span>
  <span className={['WORKING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Complete</span>
  <span className={['RATING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Rate</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: (o.status === 'COMPLETED' ? '100%' : o.status === 'RATING' ? '88%' : o.status === 'WORKING' ? '77%' : o.status === 'VARIATION' ? '66%' : o.status === 'MEETING' ? '55%' : o.status === 'IN_PROGRESS' ? '44%' : o.status === 'ACCEPTED' ? '33%' : o.status === 'CONFIRMED' ? '22%' : '11%') }} /></div>
</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
              <span className="font-bold text-gray-900 mt-1">฿{o.finalPrice || o.estimatedPrice || 0}</span>
              <Link href={`chat/${o.id}`} className="text-gray-400 hover:text-sky-600 transition mt-2"><span className="text-xl">Chat</span></Link>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="p-8 text-center text-gray-500">No active jobs.</div>}
      </div>
    </div>
  );
}

function PartnerIncomingRequests({ locale, prefix, orders }: { locale: string; prefix: string; orders: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">Incoming Requests</h2>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{orders.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {orders.map((o: any, i: number) => (
          <div key={i} className="p-6 flex items-center justify-between hover:bg-amber-50/30 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shadow-sm"></div>
              <div>
                <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.tier || 'Standard'}</span></h3>
                <p className="text-sm text-gray-500 mt-1">Customer #{o.id.slice(-4)} &middot; {fmtDate(o.createdAt)} &middot; Est: ฿{o.estimatedPrice || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Status: {o.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-6 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition shadow-sm">Accept</button>
              <button className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition">Decline</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="p-8 text-center text-gray-500">No incoming requests right now.</div>}
      </div>
    </div>
  );
}

