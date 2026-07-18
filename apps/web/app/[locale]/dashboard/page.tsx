"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { clearSubscriberSession, ensureFreshSubscriberSession, refreshSubscriberSession } from "../../../lib/subscriberSession";
import {
  buildMeetingConfirmedAlert,
  collectTerminalWorkflowPos,
  filterLiveWorkflowItems,
  filterWorkflowItemsByKnownBackendPos,
  isClosedWorkflowActivity,
  isCustomerMeetingInviteActionAvailable,
  isWorkflowMeetingCardVisible,
  isTerminalWorkflowStatus,
  isWorkflowOrderCancellable,
  isWorkflowOrderChatEnabled,
  normalizeWorkflowHistoryItems,
  parseWorkflowMeetingInviteDetails,
  pickWorkflowMeetingVenue,
  pruneWorkflowStorage,
  readBrowserTerminalWorkflowPos,
  setWorkflowStorageItem,
} from "../../../lib/workflowVisibility";
import {
  extractWorkflowCompleteRequest,
  extractWorkflowVariationRequest,
  getWorkflowStatusNote,
  isVisibleWorkflowSystemText,
  isWorkflowPoReferencedInStorage,
  isWorkflowPastVariation,
  markWorkflowVariationApproved,
  persistCustomerRatingStatusNote,
} from "../../../lib/workflowLiveReferences";
import { useRouter } from "next/navigation";
import PdpaConsent from "../components/PdpaConsent";
import {
  computeBudgetBreakdown,
  formatVariationPriceListItem,
  parseVariationPriceList,
  readStoredBreakdown,
  readStoredVariationPriceList,
  resolvePartnerPriceList,
  storeVariationPriceList,
  stripVariationPriceList,
  type BudgetBreakdownItem,
} from "../../../lib/computeBudgetBreakdown";
import { readStoredPoProjectDetails } from "../../../lib/po-project-details";
import {
  buildCustomerMeetingAwaitingPartnerAlert,
  isCustomerFixerActionNeeded,
  mergeAuthoritativeWorkflowAlerts,
} from "../../../lib/fixerWorkflowUiProjection";

interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

type ServiceType = "household" | "project" | "professional" | "property";





const notifications: any[] = [];

const chats: any[] = [];

const CUSTOMER_DASHBOARD_TOKEN_KEY = "cblue_customer_dashboard_token";
const CUSTOMER_DASHBOARD_SUBSCRIBER_KEY = "cblue_customer_dashboard_subscriber";

function getCustomerDashboardSessionValue(sessionKey: string, sharedKey: string) {
  if (typeof window === "undefined") return "";
  const scoped = sessionStorage.getItem(sessionKey);
  if (scoped) return scoped;
  const shared = localStorage.getItem(sharedKey) || "";
  if (shared) sessionStorage.setItem(sessionKey, shared);
  return shared;
}

function getCustomerDashboardToken() {
  return getCustomerDashboardSessionValue(CUSTOMER_DASHBOARD_TOKEN_KEY, "subscriber_token");
}

async function fetchCustomerOrdersWithSession(token: string) {
  let authToken = await ensureFreshSubscriberSession(token);
  if (!authToken) return null;

  let response = await fetch("/api/v1/orders/my", {
    headers: { Authorization: `Bearer ${authToken}` },
  }).catch(() => null);
  if (response && (response.status === 401 || response.status === 403)) {
    authToken = await refreshSubscriberSession(authToken);
    if (!authToken) return null;
    response = await fetch("/api/v1/orders/my", {
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => null);
  }
  return response;
}

function getCustomerDashboardSubscriberRaw() {
  return getCustomerDashboardSessionValue(CUSTOMER_DASHBOARD_SUBSCRIBER_KEY, "subscriber");
}

function readCustomerDashboardSubscriber() {
  const raw = getCustomerDashboardSubscriberRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCustomerDashboardSession(subscriber: any, token?: string) {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(CUSTOMER_DASHBOARD_TOKEN_KEY, token);
  if (subscriber) sessionStorage.setItem(CUSTOMER_DASHBOARD_SUBSCRIBER_KEY, JSON.stringify(subscriber));
}

function clearCustomerDashboardSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CUSTOMER_DASHBOARD_TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_DASHBOARD_SUBSCRIBER_KEY);
}

/** Prune non-critical workflow caches near the localStorage soft limit. */
function pruneStorageIfNeeded() {
  try {
    pruneWorkflowStorage(localStorage);
  } catch {}
}

function writeWorkflowStorage(key: string, value: any) {
  if (typeof window === "undefined") return value;
  return setWorkflowStorageItem(localStorage, key, value).value;
}

const fmtDate = (d: Date | number | string) => {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return "";
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};
const fmtDateTime = (d: Date | number | string) => {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return "";
  const hh = String(dt.getHours()).padStart(2,'0');
  const mm = String(dt.getMinutes()).padStart(2,'0');
  return `${fmtDate(dt)} ${hh}:${mm}`;
};
const toggleWorkflowModalChromeLock = (locked: boolean) => {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const html = document.documentElement;
  const current = Number(body.dataset.cblueWorkflowModalLocks || '0') || 0;
  const next = locked ? current + 1 : Math.max(0, current - 1);
  if (next > 0) {
    body.dataset.cblueWorkflowModalLocks = String(next);
  } else {
    delete body.dataset.cblueWorkflowModalLocks;
  }
  const modalActive = next > 0;
  body.classList.toggle('cblue-workflow-modal-open', modalActive);
  html.classList.toggle('cblue-workflow-modal-open', modalActive);
  const header = document.querySelector<HTMLElement>('[data-cblue-header-root]');
  if (!header) return;
  header.classList.toggle('pointer-events-none', modalActive);
  header.classList.toggle('select-none', modalActive);
  header.classList.toggle('blur-sm', modalActive);
  if (modalActive) {
    header.style.zIndex = '1';
    header.setAttribute('aria-hidden', 'true');
    header.setAttribute('data-modal-open', 'true');
  } else {
    header.style.zIndex = '';
    header.removeAttribute('aria-hidden');
    header.setAttribute('data-modal-open', 'false');
  }
};
const formatWorkflowMeetingLabel = (meetingDate?: string, meetingTime?: string, fallback?: any) => {
  const iso = String(meetingDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y = '', m = '', d = ''] = iso.split('-');
    const t = String(meetingTime || '').trim();
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}${t ? ` ${t}` : ''}`.trim();
  }
  const ddmmyyyy = iso.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const t = String(meetingTime || '').trim();
    return `${iso}${t ? ` ${t}` : ''}`.trim();
  }
  const ts = new Date(fallback || (iso ? `${iso}T${meetingTime || '00:00'}` : 0)).getTime();
  return Number.isFinite(ts) && ts > 0 ? fmtDateTime(ts) : '';
};
const GPS_COORDINATE_PAIR_PATTERN = /^-?\d{1,2}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;
const PARTIAL_GPS_COORDINATE_PATTERN = /^-?\d{1,2}(?:\.\d+)?$/;
const normalizeWorkflowLocationText = (value: any) => {
  const text = String(value || '').trim();
  if (!text || /^(?:unknown|n\/a|tbd|-|--\s*select)/i.test(text)) return '';
  return text;
};
const getWorkflowDisplayLocation = (...values: any[]) => {
  const normalized = values.map(normalizeWorkflowLocationText).filter(Boolean);
  const fullGps = normalized.find((value) => GPS_COORDINATE_PAIR_PATTERN.test(value));
  if (fullGps) return fullGps;
  return normalized.find((value) => !PARTIAL_GPS_COORDINATE_PATTERN.test(value)) || normalized[0] || '';
};
const isCustomerCancellationText = (value: any) =>
  /\bcustomer\s+(?:cancelled|canceled|cancel)\b|\bcancelled\s+by\s+customer\b|\bcanceled\s+by\s+customer\b/i.test(String(value || ''));
const isBackendWorkflowActiveStatus = (orderLike: any) => !isClosedWorkflowActivity(orderLike);
const isBackendWorkflowHistoryStatus = (orderLike: any) => isClosedWorkflowActivity(orderLike);
const WORKFLOW_MEETING_VISIBLE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const parseWorkflowMeetingDateTimeMs = (meetingDate?: string, meetingTime?: string, fallback?: any) => {
  const rawDate = String(meetingDate || '').trim();
  const rawTime = String(meetingTime || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const ts = new Date(`${rawDate}T${rawTime || '00:00'}`).getTime();
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  const ddmmyyyy = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const [hour = '00', minute = '00'] = rawTime.split(':');
    const ts = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  const ts = new Date(fallback || (rawDate ? `${rawDate}T${rawTime || '00:00'}` : 0)).getTime();
  return Number.isFinite(ts) ? ts : 0;
};
const isWorkflowMeetingVisible = (meetingDate?: string, meetingTime?: string, fallback?: any) =>
  isWorkflowMeetingCardVisible({ meetingDate, meetingTime, createdAt: fallback, date: fallback });
const PO_CODE_PATTERN = /PO-(?:\d{8}|\d{4}-\d{4,})/i;
const PO_CODE_EXACT_PATTERN = /^PO-(?:\d{8}|\d{4}-\d{4,})$/i;
const isValidPoCode = (value: string) => PO_CODE_EXACT_PATTERN.test(String(value || '').trim());
const isOrderUuid = (value: any) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  );
const PROP_PO_PATTERN = /^PRE-\d{4}-\d{4}$/i;
const isPropPoCode = (value: string) => PROP_PO_PATTERN.test(String(value || '').trim());
const extractPoCode = (orderLike: any) => {
  if (!orderLike) return "";
  const direct = String(orderLike?.po || "").trim();
  if (direct && isValidPoCode(direct)) return direct;
  const desc = String(orderLike?.description || orderLike?.desc || "");
  return desc.match(PO_CODE_PATTERN)?.[0] || "";
};
const parseMeetingInviteDetails = (value: string) => parseWorkflowMeetingInviteDetails(value);
const readMeetingInviteSnapshot = (po: string, fallback?: any) => {
  const normalizedPo = String(po || '').trim();
  const candidates = [
    String(fallback?.meetingMessage || ''),
    String(fallback?.statusNote || ''),
    String(getWorkflowStatusNote(fallback) || ''),
    String(fallback?.description || ''),
    String(fallback?.desc || ''),
  ];

  if (typeof window !== 'undefined' && normalizedPo) {
    try {
      const chatRows = JSON.parse(localStorage.getItem(`chat_messages_${normalizedPo}`) || '[]');
      if (Array.isArray(chatRows)) {
        for (const row of chatRows) {
          candidates.unshift(String(row?.text || ''));
        }
      }
    } catch {
      // Best-effort local recovery only.
    }
  }

  for (const candidate of candidates) {
    const parsed = parseMeetingInviteDetails(candidate);
    if (parsed.meetingDate || parsed.meetingTime || parsed.meetingVenue) {
      return parsed;
    }
  }

  return {
    po: normalizedPo,
    meetingDate: '',
    meetingTime: '',
    meetingVenue: '',
  };
};
const stripWorkflowPrefix = (value: any) => String(value || '').replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?(LOC:[^|]+\|\s*)?/i, '').trim();
const WORKFLOW_INSTRUCTION_PATTERN =
  /customer approved the variation|please submit project complete|partner may now submit project complete|customer confirmed completion|please rate the customer|please rate your partner|work is completed|project complete confirmed|job-complete request sent|variation request sent|proceed to submit variation|please review and confirm|waiting for customer/i;
const isWorkflowInstructionText = (value: any) =>
  WORKFLOW_INSTRUCTION_PATTERN.test(String(value || ''));
const SERVICE_ONLY_DETAIL_PATTERN = /^[A-Z0-9][A-Z0-9 &/_+-]{2,}$/;
const isServiceOnlyProjectDetail = (value: any) => {
  const cleaned = stripWorkflowPrefix(value);
  return cleaned.length <= 64 && SERVICE_ONLY_DETAIL_PATTERN.test(cleaned);
};
const pickProjectDetails = (...values: any[]) => {
  if (values.length > 0 && isValidPoCode(String(values[0] || ""))) {
    const stored = readStoredPoProjectDetails(String(values[0]).trim());
    if (stored) return stored;
    values = values.slice(1);
  }
  for (const value of values) {
    const cleaned = stripWorkflowPrefix(value);
    if (cleaned && !isWorkflowInstructionText(cleaned) && !isServiceOnlyProjectDetail(cleaned)) return cleaned;
  }
  return "";
};
const firstNameOnly = (value: any, fallback = 'User') => {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned.split(/\s+/)[0] || fallback : fallback;
};
const HIDDEN_TEST_POS = new Set(["PO-2605-2747", "PO-2605-6716", "PO-2605-9605", "PO-2605-8699", "PO-2605-9701", "PO-2605-6146", "PO-2605-8471", "PO-2605-9593", "PO-2605-4465"]);
const isHiddenTestPo = (value: any) => HIDDEN_TEST_POS.has(String(value || '').trim().toUpperCase());
const CLOSED_CUSTOMER_WORKFLOW_POS = new Set([
  "PO-2605-8591",
  "PO-2605-7953",
  "PO-2605-2121",
]);
const isClosedCustomerWorkflowPo = (value: any) => CLOSED_CUSTOMER_WORKFLOW_POS.has(String(value || '').trim().toUpperCase());
const STALE_CUSTOMER_NOTIFY_PROP_POS = new Set([
  "PRE-2605-5354",
  "PRE-2605-9968",
  "PRE-2605-2386",
  "PRE-2605-3964",
  "PRE-2605-4985",
  "PRE-2605-5592",
  "PRE-2605-3437",
  "PRE-2605-8356",
  "PRE-2605-8421",
]);
const isStaleCustomerNotifyPropPo = (value: any) =>
  STALE_CUSTOMER_NOTIFY_PROP_POS.has(
    String(value || '').trim().toUpperCase(),
  );
const isLikelyValidImageDataPayload = (payload: string) => {
  const compact = String(payload || '').replace(/\s+/g, '');
  if (!compact || compact.length < 128 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return false;
  if (/^(.)\1+$/.test(compact.replace(/=+$/, ''))) return false;
  return (
    compact.startsWith('/9j/') ||
    compact.startsWith('iVBORw0KGgo') ||
    compact.startsWith('R0lGOD') ||
    compact.startsWith('UklGR')
  );
};
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
const WORKFLOW_STEP_NAMES_BY_LOCALE: Record<'th' | 'zh', Record<number, string>> = {
  th: {
    5: 'รับงาน',
    6: 'ค่าธรรมเนียมและดำเนินการ',
    7: 'แชท',
    8: 'นัดพบ',
    9: 'เปลี่ยนแปลงงาน',
    10: 'ยืนยันงานเสร็จ',
    11: 'ให้คะแนน',
  },
  zh: {
    5: '接受',
    6: '费用并继续',
    7: '聊天',
    8: '会面',
    9: '变更',
    10: '确认完成',
    11: '评分',
  },
};
const getWorkflowStepNameForLocale = (step?: number, locale = 'en') =>
  WORKFLOW_STEP_NAMES_BY_LOCALE[locale as 'th' | 'zh']?.[Number(step || 0)] || getWorkflowStepName(step);
const localizeWorkflowStepName = (stepName: any, step: any, locale = 'en') => {
  const raw = String(stepName || '').trim();
  const normalizedStep = Number(step || 0);
  const matchedStep = raw
    ? Number(Object.entries(WORKFLOW_STEP_NAMES).find(([, name]) => name.toLowerCase() === raw.toLowerCase())?.[0] || 0)
    : 0;
  return getWorkflowStepNameForLocale(matchedStep || normalizedStep, locale);
};
const getWorkflowStepBadgeLabel = (step: number, total: number, stepName: string, locale = 'en') =>
  locale === 'th'
    ? `ขั้นตอน ${step} จาก ${total} · ${stepName}`
    : locale === 'zh'
    ? `第 ${step}/${total} 步 · ${stepName}`
    : `Step ${step} of ${total} · ${stepName}`;
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
const normalizeImageUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('data:')) {
    const compact = raw.replace(/\s+/g, '');
    const normalized = compact.replace(/;bas(?!e64,)/i, ';base64,');
    const commaIndex = normalized.indexOf(',');
    if (commaIndex <= 0) return '';
    const header = normalized.slice(0, commaIndex);
    const payload = normalized.slice(commaIndex + 1).replace(/\s+/g, '');
    if (!payload) return '';
    if (/^data:image\//i.test(header) && !isLikelyValidImageDataPayload(payload)) return '';
    const fixedHeader = /;base64$/i.test(header)
      ? header
      : header.includes(';')
      ? header
      : `${header};base64`;
    return `${fixedHeader},${payload}`;
  }

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('//') ||
    raw.startsWith('/') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  if (/^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]*$/.test(raw)) {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }

  return '';
};
const parseJsonLikeValue = (value: string) => {
  const text = String(value || '').trim();
  if (!text) return value;
  if (!/^[\[{\"]/.test(text)) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
};
const extractImageUrlCandidate = (image: any, depth = 0): string => {
  if (depth > 5) return '';

  if (typeof image === 'string') {
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
    return '';
  }

  if (!image || typeof image !== 'object') return '';
  const direct =
    image.url ||
    image.key ||
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

  return '';
};
const mimeTypeFromDataUrl = (url: string) => {
  const match = url.match(/^data:([^;,]+)[;,]/i);
  return match?.[1] || '';
};
const extensionFromMimeType = (mimeType?: string | null) => {
  const mime = String(mimeType || '').toLowerCase();
  if (!mime) return 'bin';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('heic')) return 'heic';
  const match = mime.match(/\/([a-z0-9.+-]+)$/i);
  return match?.[1] || 'bin';
};
const triggerDownload = (href: string, filename: string, revoke = false) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (revoke) {
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  }
};
const shouldAttachAuthHeader = (url: string) => {
  if (url.startsWith('/api/')) return true;
  try {
    if (typeof window === 'undefined') return false;
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
};
const openUrlInNewTab = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
const downloadImageUrls = async (urls: string[], prefix = 'property-photo') => {
  const uniqueUrls = Array.from(new Set((urls || []).map(normalizeImageUrl).filter(Boolean)));
  for (const [index, url] of uniqueUrls.entries()) {
    const fallbackName = `${prefix}-${index + 1}`;
    try {
      if (url.startsWith('blob:')) {
        triggerDownload(url, fallbackName);
        continue;
      }

      if (url.startsWith('data:')) {
        const ext = extensionFromMimeType(mimeTypeFromDataUrl(url));
        const fileName = `${fallbackName}.${ext}`;
        try {
          // Preserve direct click gesture for data URL downloads.
          triggerDownload(url, fileName);
          continue;
        } catch {
          // Fallback to fetch/blob below.
        }
      }

      // Public absolute URLs frequently fail CORS fetch; open directly while gesture is active.
      if ((url.startsWith('http://') || url.startsWith('https://')) && !shouldAttachAuthHeader(url)) {
        openUrlInNewTab(url);
        continue;
      }

      const token = getCustomerDashboardToken();
      const headers: Record<string, string> = {};
      if (token && shouldAttachAuthHeader(url)) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(url, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          openUrlInNewTab(url);
        } else if (!shouldAttachAuthHeader(url)) {
          try {
            const absolute = new URL(url, window.location.origin).toString();
            openUrlInNewTab(absolute);
          } catch {
            // no-op
          }
        }
        continue;
      }

      const blob = await response.blob();
      const ext = extensionFromMimeType(blob.type);
      const fileName = `${fallbackName}.${ext}`;
      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl, fileName, true);
    } catch {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        openUrlInNewTab(url);
      } else if (!shouldAttachAuthHeader(url)) {
        try {
          const absolute = new URL(url, window.location.origin).toString();
          openUrlInNewTab(absolute);
        } catch {
          // no-op
        }
      }
    }
  }
};

function CustomerWorkflowModalMeta({
  locale = "en",
  step,
  typeOfWork,
  actionText,
  po,
  partnerName,
  budget,
  location,
  projectDetails,
}: {
  locale?: string;
  step: number;
  typeOfWork: string;
  actionText: string;
  po: string;
  partnerName: string;
  budget: string;
  location: string;
  projectDetails: string;
}) {
  const labels = {
    stepName: locale === "th" ? "ชื่อขั้นตอน" : locale === "zh" ? "步骤名称" : "Step Name",
    typeOfWork: locale === "th" ? "ประเภทงาน" : locale === "zh" ? "工作类型" : "Type of Work",
    action: locale === "th" ? "สิ่งที่ต้องทำ" : locale === "zh" ? "需要操作" : "What You Need To Do",
    po: locale === "th" ? "หมายเลข PO" : locale === "zh" ? "PO 编号" : "PO Number",
    partner: locale === "th" ? "พาร์ทเนอร์ที่เลือก" : locale === "zh" ? "已选合作伙伴" : "Selected Partner",
    budget: locale === "th" ? "งบประมาณ" : locale === "zh" ? "预算" : "Budget",
    location: locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Project Location",
    details: locale === "th" ? "รายละเอียดโครงการ" : locale === "zh" ? "项目详情" : "Project Details",
    unknown: locale === "th" ? "ไม่ทราบ" : locale === "zh" ? "未知" : "Unknown",
    detailsFallback: locale === "th" ? "รายละเอียดโครงการจากร่าง PO" : locale === "zh" ? "来自 PO 草稿的项目详情。" : "Project details from the draft PO.",
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2 text-sm text-gray-800">
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.stepName}</span><span className="font-bold text-right">{getWorkflowStepNameForLocale(step, locale)}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.typeOfWork}</span><span className="font-bold text-right">{typeOfWork}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.action}</span><span className="font-bold text-right max-w-[65%]">{actionText}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.po}</span><span className="font-mono font-bold text-right">{po}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.partner}</span><span className="font-bold text-right">{partnerName}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.budget}</span><span className="font-bold text-right">{budget}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{labels.location}</span><span className="font-bold text-right">{location || labels.unknown}</span></div>
      <div>
        <span className="text-gray-500">{labels.details}</span>
        <p className="mt-1 rounded-lg border border-gray-100 bg-white px-3 py-2 font-bold text-gray-800">{projectDetails || labels.detailsFallback}</p>
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, string> = { household: "", project: "", professional: "", property: "" };
const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  DEPOSIT_PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MATCHING: "bg-yellow-100 text-yellow-700",
  VIEWING_SCHEDULED: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-indigo-100 text-indigo-700",
  DEPOSIT_PAID: "bg-green-100 text-green-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
  Upper: "bg-teal-50 text-teal-700",
  Luxury: "bg-amber-50 text-amber-700",
  Grandeur: "bg-purple-50 text-purple-700",
};


const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Accepted", th: "ยืนยันแล้ว", zh: "已确认" },
  DEPOSIT_PENDING: { en: "Deposit Pending", th: "รอชำระเงิน", zh: "待付款" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  MATCHING: { en: "Matching", th: "กำลังจับคู่", zh: "匹配中" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  VIEWING_SCHEDULED: { en: "Viewing Scheduled", th: "นัดดูแล้ว", zh: "已安排看房" },
  CONTACTED: { en: "Contacted", th: "ติดต่อแล้ว", zh: "已联系" },
  DEPOSIT_PAID: { en: "Deposit Paid", th: "ชำระแล้ว", zh: "已付款" },
};
const getStatusLabel = (status: string, locale: string) => STATUS_LABEL[status]?.[locale] || status.replace(/_/g, " ");

type TabKey = "overview" | "bookings" | "property" | "history" | "chat" | "notifications" | "profile";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const prefix = `/${locale}`;

  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [hasFetchedOrders, setHasFetchedOrders] = useState<boolean>(false);



  
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getCustomerDashboardToken();
      if (!token) {
        setSubscriber(null);
        setOrders([]);
        setHasFetchedOrders(false);
      } else {
        const stored = getCustomerDashboardSubscriberRaw();
        if (stored) {
          setSubscriber(prev => {
            try {
              const parsed = JSON.parse(stored);
              // Prevent cross-user contamination: don't override current user's data
              // with another user's data (e.g. partner logged in on the same browser).
              if (prev?.id && parsed.id !== prev.id) return prev;
              return parsed;
            } catch { return prev; }
          });
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        let token = getCustomerDashboardToken();
        if (!token) {
          setOrders([]);
          setHasFetchedOrders(false);
          setLoading(false);
          return;
        }

        const freshToken = await ensureFreshSubscriberSession(token);
        if (!freshToken) {
          if (isMounted) {
            setSubscriber(null);
            setOrders([]);
            setHasFetchedOrders(false);
            setLoading(false);
          }
          return;
        }
        token = freshToken;

        // Eagerly set state from localStorage to prevent flash of logged-out state
        if (isMounted) {
          const parsed = readCustomerDashboardSubscriber();
          if (parsed) {
            setSubscriber(prev => {
              if (prev?.id && parsed.id !== prev.id) return prev;
              return parsed;
            });
            // Paint cached session immediately; refresh in background. Prevents a
            // multi-minute blank/loading screen when /users/me is slow or returns 500.
            setLoading(false);
          }
          const consent = localStorage.getItem("pdpa_consent_customer");
          if (!consent) setShowPdpa(true);
        }

        const refreshCustomerOrders = async (authToken: string = token) => {
          const ordersRes = await fetchCustomerOrdersWithSession(authToken);
          if (ordersRes && ordersRes.ok && isMounted) {
            setHasFetchedOrders(true);
            setOrders(await ordersRes.json());
            window.dispatchEvent(new Event("cblue-workflow-updated"));
            window.dispatchEvent(new Event("cblue-chat-updated"));
          }
        };

        const applyCustomerUser = (user: any, authToken: string) => {
          if (!isMounted) return;
          const storedSubscriber = readCustomerDashboardSubscriber();
          const hasFixer = !!user.fixer;
          const subInfo: any = {
            ...(user.profileFallback && storedSubscriber ? storedSubscriber : {}),
            id: user.id || storedSubscriber?.id,
            name: user.name || storedSubscriber?.name || user.email || storedSubscriber?.email || "Cblue member",
            email: user.email || storedSubscriber?.email || "",
            phone: user.phone || storedSubscriber?.phone || "",
            status: "ACTIVE",
          };
          if (hasFixer) subInfo.tier = user.fixer?.aiTier || user.fixer?.tier || "Standard";
          setSubscriber(subInfo);
          if (!user.profileFallback) {
            writeCustomerDashboardSession(subInfo, authToken);
            localStorage.setItem("subscriber", JSON.stringify(subInfo));
          }
        };

        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("Failed to fetch user data:", err);
          return null;
        });

        if (!res) {
          await refreshCustomerOrders();
          return;
        }

        if (res.ok) {
          const user = await res.json();
          applyCustomerUser(user, token);
          await refreshCustomerOrders();

        } else if (res.status === 401 || res.status === 403) {
          // The 24h access token may simply be past its window. Attempt a
          // sliding refresh and retry before logging the member out, so a
          // returning user keeps their session instead of seeing a blank page.
          const refreshedToken = await refreshSubscriberSession(token);
          if (refreshedToken) {
            const retryRes = await fetch("/api/v1/users/me", {
              headers: { Authorization: `Bearer ${refreshedToken}` },
            }).catch(() => null);
            if (retryRes && retryRes.ok) {
              applyCustomerUser(await retryRes.json(), refreshedToken);
              await refreshCustomerOrders(refreshedToken);
              if (isMounted) setLoading(false);
              return;
            }
          }
          // Refresh failed (token too old / account inactive) → genuine logout.
          clearCustomerDashboardSession();
          localStorage.removeItem("subscriber_token");
          localStorage.removeItem("subscriber");
          if (isMounted) {
            setSubscriber(null);
            setOrders([]);
            setHasFetchedOrders(false);
          }
        } else {
          await refreshCustomerOrders();
        }
      } catch { /* ignore */ }
      if (isMounted) setLoading(false);
    };
        fetchUser();
      return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncOrders = async () => {
      try {
        const token = getCustomerDashboardToken();
        if (!token) return;
        const ordersRes = await fetchCustomerOrdersWithSession(token);
        if (!ordersRes || !ordersRes.ok || !isMounted) return;
        setHasFetchedOrders(true);
        setOrders(await ordersRes.json());
      } catch {
        // Keep last known dashboard data if polling fails.
      }
    };

    void syncOrders();
    const timer = setInterval(() => {
      void syncOrders();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [subscriber?.id]);


  
  const mappedOrders = orders.map(o => ({
    id: o.id,
    type: o.orderType?.toLowerCase() || "household",
    service: (o.serviceCategory || "").replace(/_/g, " "),
    serviceTh: (o.serviceCategory || "").replace(/_/g, " "),
    serviceZh: (o.serviceCategory || "").replace(/_/g, " "),
    partner: o.fixer?.user?.name || "Pending matching",
    date: fmtDate(o.createdAt),
    progress: o.status === 'COMPLETED' ? 100 : o.status === 'IN_PROGRESS' ? 50 : 20,
    tier: o.description?.toUpperCase().includes("TIER:ECONOMY") ? "ECONOMY" : o.description?.toUpperCase().includes("TIER:STANDARD") ? "Standard" : o.description?.toUpperCase().includes("TIER:CORPORATE") ? "Corporate" : o.description?.toUpperCase().includes("TIER:SPECIALIST") ? "Specialist" : o.description?.toUpperCase().includes("TIER:EXPERT") ? "Expert" : "Standard",
    status: o.status,
    rating: 0,
    fee: o.estimatedPrice ? `฿${o.estimatedPrice}` : "TBD"
  }));

  const activeOrders = mappedOrders.filter(o => isBackendWorkflowActiveStatus(o));
  const historyOrders = mappedOrders.filter(o => isBackendWorkflowHistoryStatus(o));
  const requests = activeOrders.filter(o => ['CREATED', 'MATCHING', 'PENDING'].includes(o.status));
  const properties = mappedOrders.filter(o => o.type === 'property');

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "" },
    { key: "bookings", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "", badge: activeOrders.length },
    
    { key: "property", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "", badge: properties.length > 0 ? properties.length : undefined },
    { key: "history", label: locale === "th" ? "ประวัติ" : locale === "zh" ? "历史" : "History", icon: "" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "", badge: undefined },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "", badge: undefined },
    { key: "profile", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", icon: "" },
  ];

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* PDPA Consent Modal */}
      {showPdpa && (
        <PdpaConsent
          locale={locale}
          prefix={prefix}
          role="customer"
          onAccept={(ts) => {
            localStorage.setItem("pdpa_consent_customer", ts);
            setShowPdpa(false);
          }}
        />
      )}
      {/* Hero Header with scenic background */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-building.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
              <p className="text-sky-200 text-sm mt-1">
                {locale === "th" ? "จัดการบริการ คำสั่ง แชท และข้อมูลบัญชีของคุณ" : locale === "zh" ? "管理您的服务、预约、聊天和账户" : "Manage your services, bookings, chat, and account"}
              </p>
            </div>
            {subscriber ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-sky-400/30 flex items-center justify-center text-white font-bold">{subscriber.name?.charAt(0) || "U"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{subscriber.name}</p>
                  <p className="text-sky-200 text-xs">{subscriber.email}</p>
                </div>
                <button
                  onClick={() => { clearSubscriberSession(); localStorage.removeItem("pdpa_consent_customer"); localStorage.removeItem("ghis_mock_payments"); localStorage.removeItem("ghis_mock_active"); localStorage.removeItem("ghis_mock_dyn_req"); localStorage.removeItem("ghis_mock_history"); router.push(prefix); }}
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
        {/* Subscribe CTA (when not logged in) */}
        {!subscriber && !loading && (
          <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เริ่มต้นกับ CBLUE" : locale === "zh" ? "开始CBLUE之旅" : "Get Started with CBLUE"}</h2>
                <p className="text-sky-100 mt-2">{locale === "th" ? "เข้าถึงช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ที่ผ่านการตรวจสอบ" : locale === "zh" ? "访问经过验证的技工、项目团队、专业人士和房产" : "Access verified fixers, project teams, professionals, and properties"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`${prefix}/subscription/login`} className="px-6 py-3 bg-white text-sky-700 rounded-xl font-bold text-sm hover:bg-sky-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
                </Link>
                <Link href={`${prefix}/subscription/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Book - 4 Services */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: `${prefix}/booking/household`, icon: "", label: locale === "th" ? "จองช่างซ่อมบ้าน" : locale === "zh" ? "预约技工" : "Book Fixer", desc: locale === "th" ? "ประปา ไฟฟ้า แอร์" : locale === "zh" ? "管道、电气、空调" : "Plumbing, Electrical, AC", color: "from-sky-500 to-blue-600" },
            { href: `${prefix}/booking/project`, icon: "", label: locale === "th" ? "จองทีมโครงการ" : locale === "zh" ? "预约项目团队" : "Book Project Team", desc: locale === "th" ? "เว็บ AI สมาร์ทโฮม" : locale === "zh" ? "网站、AI、智能家居" : "Web, AI, Smart Home", color: "from-indigo-500 to-purple-600" },
            { href: `${prefix}/booking/professional`, icon: "", label: locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Professional", desc: locale === "th" ? "ทนาย สถาปนิก วิศวกร" : locale === "zh" ? "律师、建筑师、工程师" : "Lawyer, Architect, Engineer", color: "from-emerald-500 to-teal-600" },
            { href: `${prefix}/properties`, icon: "", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Book Property", desc: locale === "th" ? "ซื้อ ขาย เช่า" : locale === "zh" ? "买、卖、租" : "Buy, Sell, Rent", color: "from-amber-500 to-orange-600" },
          ].map((s) => (
            <Link key={s.href} href={s.href} className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className={`h-2 bg-gradient-to-r ${s.color}`} />
              <div className="p-5">
                <span className="text-3xl block mb-2">{s.icon}</span>
                <h3 className="font-bold text-gray-900 text-sm">{s.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        
        {/* Main Content */}
        {subscriber && !loading && (
          <CustomerDashboard locale={locale} subscriber={subscriber} prefix={prefix} orders={orders} hasFetchedOrders={hasFetchedOrders} onLogout={() => {
            clearSubscriberSession();
            localStorage.removeItem("pdpa_consent_customer"); 
            localStorage.removeItem("ghis_mock_payments");
            localStorage.removeItem("ghis_mock_active");
            localStorage.removeItem("ghis_mock_dyn_req");
            localStorage.removeItem("ghis_mock_history");
            router.push(prefix);
          }} />
        )}
{/* Tier Comparison */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {locale === "th" ? "เปรียบเทียบระดับบริการ" : locale === "zh" ? "服务等级比较" : "Tier Comparison"}
        </h2>
        <p className="text-sm text-gray-500 mb-5">{locale === "th" ? "ค่าธรรมเนียมดำเนินการต่อการจับคู่" : locale === "zh" ? "每次匹配的处理费" : "Processing fee per matching"}</p>

        {/* Fixer & Professional Tiers */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3"> {locale === "th" ? "ช่างซ่อม / มืออาชีพ" : locale === "zh" ? "技工 / 专业人士" : "Fixer / Professional"}</h3>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { name: "Economy", fee: "฿100", color: "border-green-200 bg-green-50", textColor: "text-green-700", desc: locale === "th" ? "บริการทั่วไป" : locale === "zh" ? "基础服务" : "Basic" },
            { name: "Standard", fee: "฿400", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", desc: locale === "th" ? "มาตรฐาน" : locale === "zh" ? "标准" : "Standard" },
            { name: "Corporate", fee: "฿600", color: "border-purple-200 bg-purple-50", textColor: "text-purple-700", desc: locale === "th" ? "องค์กร" : locale === "zh" ? "企业" : "Corporate" },
            { name: "Specialist", fee: "฿800", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", desc: locale === "th" ? "ผู้ชำนาญ" : locale === "zh" ? "专家" : "Specialist" },
            { name: "Expert", fee: "฿1,000", color: "border-red-200 bg-red-50", textColor: "text-red-700", desc: locale === "th" ? "ผู้เชี่ยวชาญ" : locale === "zh" ? "大师" : "Expert" },
          ].map((item) => (
            <div key={item.name} className={`rounded-xl border-2 p-4 text-center ${item.color}`}>
              <h3 className={`font-bold text-sm ${item.textColor}`}>{item.name}</h3>
              <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>{item.fee}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Property Tiers */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Property"}</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { name: "Economy", fee: "฿100", color: "border-green-200 bg-green-50", textColor: "text-green-700", desc: locale === "th" ? "ห้องเช่า" : locale === "zh" ? "房间" : "Room" },
            { name: "Standard", fee: "฿400", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", desc: locale === "th" ? "คอนโด" : locale === "zh" ? "公寓" : "Condo" },
            { name: "Upper", fee: "฿600", color: "border-teal-200 bg-teal-50", textColor: "text-teal-700", desc: locale === "th" ? "บ้าน" : locale === "zh" ? "别墅" : "House" },
            { name: "Luxury", fee: "฿800", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", desc: locale === "th" ? "หรูหรา" : locale === "zh" ? "豪华" : "Luxury" },
            { name: "Grandeur", fee: "฿1,000", color: "border-purple-200 bg-purple-50", textColor: "text-purple-700", desc: locale === "th" ? "พรีเมียม" : locale === "zh" ? "顶级" : "Premium" },
          ].map((item) => (
            <div key={item.name} className={`rounded-xl border-2 p-4 text-center ${item.color}`}>
              <h3 className={`font-bold text-sm ${item.textColor}`}>{item.name}</h3>
              <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>{item.fee}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

            </div>
    </div>
  );
}



/* ===== OVERVIEW TAB ===== */
function OverviewTab({ locale, subscriber, activeOrders, historyOrders, chats, notifications }: { locale: string; subscriber: any; activeOrders: any[]; onOrderClick?: (o: any) => void; historyOrders: any[]; chats: any[]; notifications: any[] }) {
  const STATUS_STYLE: any = {
    "CREATED": "bg-gray-100 text-gray-700",
    "MATCHING": "bg-yellow-100 text-yellow-700",
    "PENDING": "bg-blue-100 text-blue-700",
    "COMPLETED": "bg-green-100 text-green-700",
    "CANCELLED": "bg-red-100 text-red-700"
  };

  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "CREATED": { th: "รอดำเนินการ", zh: "等待中", en: "Created" },
      "MATCHING": { th: "กำลังจับคู่", zh: "匹配中", en: "Matching" },
      "PENDING": { th: "กำลังดำเนินการ", zh: "进行中", en: "Pending" },
      "COMPLETED": { th: "เสร็จสิ้น", zh: "已完成", en: "Completed" },
      "CANCELLED": { th: "ยกเลิก", zh: "已取消", en: "Cancelled" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="space-y-6 lg:col-span-2">
      {/* Pending Tasks */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "งานที่กำลังดำเนินการ" : locale === "zh" ? "进行中的任务" : "Active Tasks"}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {activeOrders.length > 0 ? activeOrders.slice(0, 3).map((job: any) => (
            <div key={job.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">{job.type === 'household' ? '' : job.type === 'project' ? '' : job.type === 'professional' ? '' : ''}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{job.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีงานที่กำลังดำเนินการ" : locale === "zh" ? "没有进行中的任务" : "No active tasks"}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== BOOKINGS TAB ===== */
function BookingsTab({ locale, activeOrders }: { locale: string; activeOrders: any[]; onOrderClick?: (o: any) => void }) {
  const STATUS_STYLE: any = {
    "CREATED": "bg-gray-100 text-gray-700",
    "MATCHING": "bg-yellow-100 text-yellow-700",
    "PENDING": "bg-blue-100 text-blue-700",
  };

  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "CREATED": { th: "รอดำเนินการ", zh: "等待中", en: "Created" },
      "MATCHING": { th: "กำลังจับคู่", zh: "匹配中", en: "Matching" },
      "PENDING": { th: "กำลังดำเนินการ", zh: "进行中", en: "Pending" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การจองของฉัน" : locale === "zh" ? "我的预订" : "My Bookings"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {activeOrders.length > 0 ? activeOrders.map((b: any) => (
          <div key={b.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                {b.type === 'household' ? '' : b.type === 'project' ? '' : b.type === 'professional' ? '' : ''}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? b.serviceTh : locale === "zh" ? b.serviceZh : b.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{b.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[b.status] || ""}`}>{getStatusLabel(b.status, locale)}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีการจอง" : locale === "zh" ? "没有预订" : "No bookings"}</p>
        )}
      </div>
    </div>
  );
}



/* ===== HISTORY TAB ===== */
function HistoryTab({ locale, historyOrders }: { locale: string; historyOrders: any[] }) {
  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "COMPLETED": { th: "เสร็จสิ้น", zh: "已完成", en: "Completed" },
      "CANCELLED": { th: "ยกเลิก", zh: "已取消", en: "Cancelled" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "ประวัติการใช้บริการ" : locale === "zh" ? "服务历史" : "Service History"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {historyOrders && historyOrders.length > 0 ? historyOrders.map((h: any) => (
          <div key={h.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                {h.type === 'household' ? '' : h.type === 'project' ? '' : h.type === 'professional' ? '' : ''}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? h.serviceTh : locale === "zh" ? h.serviceZh : h.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{h.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${h.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{getStatusLabel(h.status, locale)}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีประวัติการใช้บริการ" : locale === "zh" ? "没有服务历史" : "No service history"}</p>
        )}
      </div>
    </div>
  );
}

/* ===== PROFILE TAB ===== */
function ProfileTab({ locale, prefix, subscriber, activeOrders, historyOrders }: { locale: string; prefix: string; subscriber: any; activeOrders: any[]; onOrderClick?: (o: any) => void; historyOrders: any[] }) {
    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center shadow-inner flex-shrink-0 relative group cursor-pointer overflow-hidden">
          <span className="text-5xl"></span>
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{subscriber?.name || "User"}</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <span className="text-green-500">✓</span> {locale === "th" ? "ยืนยันตัวตนแล้ว (KYC)" : locale === "zh" ? "已验证 (KYC)" : "Verified (KYC)"}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition text-sm font-semibold">
                {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
              </button>
              <button onClick={() => {
                if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Accept deleting your account and all data per PDPA law?")) {
                  fetch('/api/v1/users/me', { method: 'DELETE', headers: { Authorization: `Bearer ${getCustomerDashboardToken()}` } })
                  .then(() => { localStorage.clear(); window.location.href = `/${locale}/subscription/login`; });
                }
              }} className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition text-sm font-semibold">
                {locale === "th" ? "ลบบัญชี" : locale === "zh" ? "删除账户" : "Delete Account"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{locale === "th" ? "เบอร์โทรศัพท์" : locale === "zh" ? "电话号码" : "Phone Number"}</h3>
              <p className="text-gray-900 font-medium">{subscriber?.phone || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{locale === "th" ? "อีเมล" : locale === "zh" ? "电子邮件" : "Email"}</h3>
              <p className="text-gray-900 font-medium">{subscriber?.email || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{locale === "th" ? "วันที่สมัคร" : locale === "zh" ? "注册日期" : "Member Since"}</h3>
              <p className="text-gray-900 font-medium">{fmtDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== CHAT TAB ===== */
function ChatTab({ locale, chats }: { locale: string; chats: any[] }) {
    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {chats && chats.length > 0 ? chats.map((c: any) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${c.unread > 0 ? "bg-sky-50/50 hover:bg-sky-50" : "hover:bg-gray-50"}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{c.name.slice(-4)}</div>
              {c.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <p className="font-bold text-gray-900 truncate">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className={`text-sm truncate ${c.unread > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                  {locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}
                </p>
                {c.unread > 0 && <span className="flex-shrink-0 ml-2 w-5 h-5 bg-sky-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent chats"}</p>
        )}
      </div>
    </div>
  );
}

/* ===== NOTIFICATIONS TAB ===== */
function NotificationsTab({ locale, notifications }: { locale: string; notifications: any[] }) {
    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การแจ้งเตือน" : locale === "zh" ? "通知" : "Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications && notifications.length > 0 ? notifications.map((n: any) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-sky-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2.5 h-2.5 bg-sky-500 rounded-full" />}
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีการแจ้งเตือน" : locale === "zh" ? "没有通知" : "No recent alerts"}</p>
        )}
      </div>
    </div>
  );
}

/* ===== PROPERTY TAB ===== */
function PropertyTab({ locale, prefix, properties }: { locale: string; prefix: string; properties: any[] }) {
  const STATUS_STYLE: any = {
    "CREATED": "bg-gray-100 text-gray-700",
    "MATCHING": "bg-yellow-100 text-yellow-700",
    "PENDING": "bg-blue-100 text-blue-700",
    "COMPLETED": "bg-green-100 text-green-700",
    "CANCELLED": "bg-red-100 text-red-700"
  };

  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "CREATED": { th: "รอดำเนินการ", zh: "等待中", en: "Created" },
      "MATCHING": { th: "กำลังจับคู่", zh: "匹配中", en: "Matching" },
      "PENDING": { th: "กำลังดำเนินการ", zh: "进行中", en: "Pending" },
      "COMPLETED": { th: "เสร็จสิ้น", zh: "已完成", en: "Completed" },
      "CANCELLED": { th: "ยกเลิก", zh: "已取消", en: "Cancelled" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การนัดหมายดูอสังหาริมทรัพย์" : locale === "zh" ? "房产查询" : "Property Inquiries"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {properties && properties.length > 0 ? properties.map((p: any) => (
          <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-2xl"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? p.serviceTh : locale === "zh" ? p.serviceZh : p.service} <span className="text-gray-400 font-normal">· {p.partner}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">{p.fee}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[p.status] || ""}`}>{getStatusLabel(p.status, locale)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Link href={`${prefix}/chat/${p.id}`} className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                {locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}
              </Link>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีรายการอสังหาริมทรัพย์" : locale === "zh" ? "没有房产查询" : "No property inquiries"}</p>
        )}
      </div>
    </div>
  );
}

function CustomerHistoryCard({ item, idx, compact = false, locale = "en" }: { item: any; idx: number; compact?: boolean; locale?: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const chatPreview = collapsed ? [] : (Array.isArray(item.chatHistory) ? item.chatHistory.slice(compact ? -2 : -4) : []);
  const isCancelled = String(item.status || '').toUpperCase() === 'CANCELLED';
  const customerCancelReason = item.cancelReason || String(item.statusNote || '').match(/Reason:\s*([^.]*)/i)?.[1]?.trim() || "";
  const isCustomerCancelled = isCancelled && (item.statusName === 'Cancelled by Customer' || !!customerCancelReason || isCustomerCancellationText(item.statusNote));
  const orderText = isPropPoCode(String(item?.po || ''))
    ? locale === 'th'
      ? `ออเดอร์: ${item.po}`
      : locale === 'zh'
      ? `订单: ${item.po}`
      : `Order: ${item.po}`
    : item?.po;
  const fmtDate = (value: any) => {
    const ts = typeof value === "number" ? value : new Date(value || 0).getTime();
    if (!Number.isFinite(ts) || ts <= 0) return "";
    return fmtDateTime(ts);
  };
  const titleClass = compact ? "font-bold text-gray-900 text-sm" : "font-bold text-gray-900";
  const metaClass = compact ? "text-xs font-normal text-gray-400" : "text-sm font-normal text-gray-400";
  const mutedClass = compact ? "text-xs text-gray-500 mt-1" : "text-sm text-gray-500 mt-1";
  const displayProjectDetails = pickProjectDetails(item.po, item.projectDetails, item.description, item.desc);
  const labels = {
    partner: locale === 'th' ? 'พาร์ทเนอร์' : locale === 'zh' ? '合作伙伴' : 'Partner',
    showDetails: locale === 'th' ? 'แสดงรายละเอียด' : locale === 'zh' ? '显示详情' : 'Show details',
    hideDetails: locale === 'th' ? 'ซ่อนรายละเอียด' : locale === 'zh' ? '隐藏详情' : 'Hide details',
    projectLocation: locale === 'th' ? 'สถานที่โครงการ:' : locale === 'zh' ? '项目地点:' : 'Project Location:',
    unknown: locale === 'th' ? 'ไม่ทราบ' : locale === 'zh' ? '未知' : 'Unknown',
    projectDetails: locale === 'th' ? 'รายละเอียดโครงการ:' : locale === 'zh' ? '项目详情:' : 'Project Details:',
    detailsFallback: locale === 'th' ? 'ไม่มีรายละเอียดโครงการ' : locale === 'zh' ? '暂无项目详情。' : 'Project details not available.',
    chatHistory: locale === 'th' ? 'ประวัติแชท' : locale === 'zh' ? '聊天记录' : 'Chat History',
  };
  const completedStepLabel = getWorkflowStepBadgeLabel(11, 11, localizeWorkflowStepName(item.stepName, item.step, locale), locale);
  return (
    <div key={`${item.po || item.id || idx}`} className="p-5 hover:bg-gray-50 transition cursor-pointer" onClick={() => setCollapsed(c => !c)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className={titleClass}>{item.service} <span className={metaClass}>· {orderText} · {item.counterpartName || item.fixerName || labels.partner}</span></h3>
          <p className={mutedClass}>{isCustomerCancelled ? (locale === 'th' ? 'ลูกค้ายกเลิกงาน' : locale === 'zh' ? '客户已取消工作' : 'Customer Canceled Job') : isCancelled ? (locale === 'th' ? 'พาร์ทเนอร์ไม่ว่าง' : locale === 'zh' ? '合作伙伴无法安排时间' : 'Partner Unavailable') : (locale === 'th' ? 'เสร็จสิ้น' : locale === 'zh' ? '已完成' : 'Completed')} {fmtDate(item.completedAt || item.statusChangedAt || item.createdAt || item.date)}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
          <span className="font-bold text-gray-900">{item.fee || item.budget || '฿0'}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isCancelled ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{isCustomerCancelled ? (locale === 'th' ? 'ปิดคำขอ · ลูกค้ายกเลิกงาน' : locale === 'zh' ? '请求已关闭 · 客户取消工作' : 'Request Closed · Customer Cancel Job') : isCancelled ? (locale === 'th' ? 'ปิดคำขอ · พาร์ทเนอร์ไม่ว่าง' : locale === 'zh' ? '请求已关闭 · 合作伙伴无法安排时间' : 'Request Closed · Partner Unavailable') : completedStepLabel}</span>
          <span className="text-xs text-sky-600 font-semibold">{collapsed ? `▼ ${labels.showDetails}` : `▲ ${labels.hideDetails}`}</span>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
            <div><span className="text-gray-500">{labels.projectLocation}</span> {item.location || item.subdistrict || labels.unknown}</div>
            <div><span className="text-gray-500">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"}</span> {item.fee || item.budget || '฿0'}</div>
            <div className="sm:col-span-2"><span className="text-gray-500">{labels.projectDetails}</span> {displayProjectDetails || labels.detailsFallback}</div>
          </div>
          {isCancelled && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {isCustomerCancelled
                ? locale === 'th'
                  ? `คุณยกเลิกงานนี้${customerCancelReason ? ` เหตุผล: ${customerCancelReason}` : ''} ดังนั้นคำขอนี้จึงถูกปิด`
                  : locale === 'zh'
                  ? `您取消了此工作${customerCancelReason ? `，原因：${customerCancelReason}` : ''}，因此该请求已关闭。`
                  : `Customer canceled this job${customerCancelReason ? ` per customer note "${customerCancelReason}"` : ''}, so this request was closed.`
                : locale === 'th'
                ? 'พาร์ทเนอร์ไม่สามารถรับงานนี้ได้ในช่วงเวลาที่วางแผนไว้ ระบบจึงปิดคำขอและแจ้งให้คุณเลือกผู้ให้บริการรายอื่นต่อไป'
                : locale === 'zh'
                ? '合作伙伴无法在计划时间内接下此项目，因此该请求已关闭。请从匹配列表中选择其他服务提供商继续。'
                : 'The partner could not take this project at the planned time, so this request was closed. Please choose another professional to continue.'}
            </div>
          )}
          {chatPreview.length > 0 && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{labels.chatHistory}</p>
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
  );
}


/* ===== DASHBOARD LOGGED IN STATE ===== */
function CustomerDashboard({ locale, subscriber, prefix, onLogout, orders, hasFetchedOrders }: { locale: string; subscriber: any; prefix: string; onLogout: () => void, orders: any[], hasFetchedOrders?: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview"|"requests"|"profile"|"active"|"properties"|"history"|"chat"|"alerts">("overview");
  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);
  const [meetingModal, setMeetingModal] = useState<any>(null); // { item } — for meeting invitation modal
  const [meetingVenue, setMeetingVenue] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [chatFeed, setChatFeed] = useState<any[]>([]);
  const [rateModal, setRateModal] = useState<any>(null);
  const [rateStars, setRateStars] = useState(5);
  const [variationApproveModal, setVariationApproveModal] = useState<any>(null);
  const [completeApproveModal, setCompleteApproveModal] = useState<any>(null);
  const [cancelJobModal, setCancelJobModal] = useState<any>(null);
  const [cancelJobReason, setCancelJobReason] = useState("");
  const [persistedCustomerAlerts, setPersistedCustomerAlerts] = useState<any[]>([]);
  // Property inquiry workflow state (cblue_prop_inquiries — not ghis-gated)
  interface PropInquiry { id: string; poNumber: string; propertyId: string; propertyTitle: string; propertyTier: string; propertyFee: number; propertyType: string; listingType: string; propertyPrice: number; province: string; district: string; subdistrict?: string; addressLine?: string; latitude?: number | null; longitude?: number | null; area?: number | null; bedrooms?: number | null; bathrooms?: number | null; propertyImages?: string[]; customerEmail: string; customerName: string; listerName: string; status: string; step: number; createdAt: number; updatedAt: number; meetingDate?: string; meetingTime?: string; meetingVenue?: string; customerRating?: number | null; customerComment?: string; listerRating?: number | null; listerComment?: string; reselectedOnce?: boolean; }
  const [propInquiries, setPropInquiries] = useState<PropInquiry[]>([]);
  const lastKnownBackendOrderPosRef = useRef<Set<string>>(new Set());
  const [propPayModal, setPropPayModal] = useState<PropInquiry | null>(null);
  const [propMeetingModal, setPropMeetingModal] = useState<PropInquiry | null>(null);
  const [propModalImages, setPropModalImages] = useState<string[]>([]);
  const [propMeetingDate, setPropMeetingDate] = useState("");
  const [propMeetingTime, setPropMeetingTime] = useState("");
  const [propMeetingVenue, setPropMeetingVenue] = useState("");
  const [propRateModal, setPropRateModal] = useState<PropInquiry | null>(null);
  const [propRateStars, setPropRateStars] = useState(0);
  const [propRateComment, setPropRateComment] = useState("");
  const workflowModalOpen = Boolean(
    waitModalOrder ||
    meetingModal ||
    rateModal ||
    variationApproveModal ||
    completeApproveModal ||
    cancelJobModal ||
    propPayModal ||
    propMeetingModal ||
    propRateModal,
  );

  useEffect(() => {
    if (!workflowModalOpen || typeof document === 'undefined') return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    toggleWorkflowModalChromeLock(true);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      toggleWorkflowModalChromeLock(false);
    };
  }, [workflowModalOpen]);

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
        time: toDisplayDateTime(now),
      };

        localStorage.setItem(key, JSON.stringify([bootstrapMessage]));
        localStorage.setItem(`chat_title_${po}`, getPropChatRoomTitle(inquiry));
      localStorage.setItem(`chat_from_${po}`, "dashboard");
        localStorage.removeItem(`chat_closed_${po}`);
      window.dispatchEvent(new Event("cblue-chat-updated"));
    } catch {
      // Best-effort chat bootstrap for property flow.
    }
  };

  // Fetch property images when propPayModal or propMeetingModal opens
  useEffect(() => {
    const fallbackImages = Array.from(
      new Set(
        [
          ...(Array.isArray(propPayModal?.propertyImages) ? propPayModal!.propertyImages : []),
          ...(Array.isArray(propMeetingModal?.propertyImages) ? propMeetingModal!.propertyImages : []),
        ]
          .map((value) => normalizeImageUrl(extractImageUrlCandidate(value)))
          .filter(Boolean),
      ),
    );

    const pid = propPayModal?.propertyId || propMeetingModal?.propertyId;
    if (!pid) {
      setPropModalImages(fallbackImages);
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
          setPropModalImages(
            Array.from(new Set([...fallbackImages, ...fetchedImages])),
          );
        } else {
          setPropModalImages(fallbackImages);
        }
      })
      .catch(() => {
        if (active) setPropModalImages(fallbackImages);
      });
    return () => { active = false; };
  }, [propPayModal, propMeetingModal]);
  // Tracks previous backend order statuses to detect MEETING_REQUESTED → IN_PROGRESS transitions
  const prevOrderStatuses = useRef<Record<string, string>>({}); 
  const toDisplayDateTime = (value: any) => {
    const ts = typeof value === "number" ? value : new Date(value || 0).getTime();
    if (!Number.isFinite(ts) || ts <= 0) return "";
    return fmtDateTime(ts);
  };
  const parseDateMs = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const asNum = Number(value);
      if (Number.isFinite(asNum) && asNum > 0) return asNum;
      const ddmmyyyy = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
      if (ddmmyyyy) {
        const [, day, month, year, hour = '00', minute = '00'] = ddmmyyyy;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
      }
    }
    const ts = new Date(value || 0).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };
  const subscriberEmail = String(subscriber?.email || '').trim().toLowerCase();
  const customerStorageSuffix = subscriberEmail.replace(/[^a-z0-9]+/g, '_') || 'anonymous';
  const customerAlertsStorageKey = `cblue_customer_alerts_${customerStorageSuffix}`;
  const ensureLegacyCancel3429Repair = () => {
    if (typeof window === "undefined" || !subscriberEmail.includes("ghis")) return false;
    const po = "PO-2606-3429";
    const serviceName = "MOBILE_APP_DEVELOPMENT";
    const reason = "I change my mind";
    const createdAt = Date.UTC(2026, 5, 3, 12, 1);
    const readArray = (key: string) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    const writeArray = (key: string, items: any[]) => {
      try { writeWorkflowStorage(key, items); } catch {}
    };

    const active = readArray("ghis_mock_active");
    const dynReqs = readArray("ghis_mock_dyn_req");
    const partnerReqs = readArray("partner_mock_dyn_req");
    const history = readArray("ghis_mock_history");
    const customerAlerts = readArray(customerAlertsStorageKey);
    const legacyCustomerAlerts = readArray("cblue_customer_alerts");
    const partnerAlerts = readArray("partner_alerts");
    const chatRows = readArray(`chat_messages_${po}`);
    const source =
      active.find((item: any) => item?.po === po) ||
      dynReqs.find((item: any) => item?.po === po) ||
      partnerReqs.find((item: any) => item?.po === po) ||
      history.find((item: any) => item?.po === po) ||
      {};
    const hasTrace =
      Boolean(source?.po) ||
      customerAlerts.some((alert: any) => String(alert?.po || alert?.msg || alert?.message || "").includes(po)) ||
      legacyCustomerAlerts.some((alert: any) => String(alert?.po || alert?.msg || alert?.message || "").includes(po)) ||
      partnerAlerts.some((alert: any) => String(alert?.po || alert?.msg || alert?.message || "").includes(po)) ||
      chatRows.length > 0;
    if (!hasTrace) return false;

    const customerChatText = `[SYSTEM] Customer cancelled ${serviceName} (${po}). Reason: ${reason}. This job has been moved to History.`;
    const nextChatRows = Array.isArray(chatRows) ? [...chatRows] : [];
    if (!nextChatRows.some((row: any) => String(row?.text || "") === customerChatText)) {
      nextChatRows.push({
        id: `legacy-customer-cancel-${po}`,
        sender: "system",
        text: customerChatText,
        time: fmtDateTime(createdAt),
        createdAt,
      });
      writeArray(`chat_messages_${po}`, nextChatRows);
    }
    try { localStorage.setItem(`chat_closed_${po}`, "1"); } catch {}

    const historyEntry = {
      ...source,
      id: source?.id || `legacy-cancel-${po}`,
      po,
      service: source?.service || source?.title || serviceName,
      title: source?.title || source?.service || serviceName,
      customer: source?.customer || "Ghis",
      status: "CANCELLED",
      statusName: "Cancelled by Customer",
      stepName: "Cancelled by Customer",
      cancelReason: reason,
      statusNote: `Customer cancelled. Reason: ${reason}`,
      projectDetails: pickProjectDetails(po, source?.projectDetails, source?.description, source?.desc, source?.service, serviceName),
      description: pickProjectDetails(po, source?.projectDetails, source?.description, source?.desc, source?.service, serviceName),
      completedAt: createdAt,
      statusChangedAt: createdAt,
      createdAt: source?.createdAt || createdAt,
      date: fmtDateTime(createdAt),
      chatHistory: nextChatRows.map((message: any) => ({
        id: message?.id || `${po}-${message?.createdAt || message?.time || Math.random()}`,
        sender: String(message?.sender || "system"),
        text: String(message?.text || "").trim(),
        time: String(message?.time || fmtDateTime(message?.createdAt || createdAt)),
      })).filter((message: any) => message.text),
    };
    writeArray("ghis_mock_active", active.filter((item: any) => item?.po !== po));
    writeArray("ghis_mock_dyn_req", dynReqs.filter((item: any) => item?.po !== po));
    writeArray("partner_mock_dyn_req", partnerReqs.filter((item: any) => item?.po !== po));
    writeArray("ghis_mock_history", [...history.filter((item: any) => item?.po !== po), historyEntry]);

    const customerAlert = {
      id: `legacy-customer-cancel-alert-${po}`,
      po,
      type: "notice",
      msg: `${po}: You cancelled ${serviceName}. Reason: ${reason}. The job has been moved to History.`,
      msgTh: `${po}: คุณยกเลิก ${serviceName} เหตุผล: ${reason} งานถูกย้ายไปประวัติแล้ว`,
      msgZh: `${po}: 您已取消 ${serviceName}。原因：${reason}。该工作已移至历史记录。`,
      time: fmtDateTime(createdAt),
      createdAt,
      dot: "bg-orange-500",
    };
    const partnerAlert = {
      id: `legacy-partner-customer-cancel-${po}`,
      type: "customer_cancelled",
      po,
      title: "Job Cancelled by Customer",
      message: `${po}: Customer cancelled ${serviceName}. Reason: ${reason}. This job has been moved to History.`,
      msgTh: `${po}: ลูกค้ายกเลิก ${serviceName}. เหตุผล: ${reason}. งานถูกย้ายไปประวัติแล้ว`,
      msgZh: `${po}: 客户已取消 ${serviceName}。原因：${reason}。该工作已移至历史记录。`,
      timestamp: new Date(createdAt).toISOString(),
      createdAt,
      dot: "bg-orange-500",
    };
    writeArray(customerAlertsStorageKey, [customerAlert, ...customerAlerts.filter((alert: any) => alert?.id !== customerAlert.id)].slice(0, 20));
    writeArray("cblue_customer_alerts", [customerAlert, ...legacyCustomerAlerts.filter((alert: any) => alert?.id !== customerAlert.id)].slice(0, 20));
    writeArray("partner_alerts", [partnerAlert, ...partnerAlerts.filter((alert: any) => alert?.id !== partnerAlert.id)].slice(0, 20));
    return true;
  };
  const formatPropMeetingLabel = (meetingDate?: string, meetingTime?: string) => {
    const rawDate = String(meetingDate || '').trim();
    if (!rawDate) return '';
    const ts = parseDateMs(`${rawDate}T${meetingTime || '00:00'}`);
    const formatted = ts > 0 ? fmtDate(ts) : rawDate;
    return `${formatted}${meetingTime ? ` · ${meetingTime}` : ''}`;
  };
  useEffect(() => {
    try {
      ensureLegacyCancel3429Repair();
      const saved = JSON.parse(localStorage.getItem(customerAlertsStorageKey) || '[]');
      const accountAlerts = Array.isArray(saved) ? saved : [];
      const legacy = subscriberEmail.includes('ghis')
        ? JSON.parse(localStorage.getItem('cblue_customer_alerts') || '[]')
        : [];
      const merged = Array.from(
        [...accountAlerts, ...(Array.isArray(legacy) ? legacy : [])]
          .reduce((map: Map<string, any>, alert: any) => {
            const createdAt = parseDateMs(alert?.createdAt || alert?.time);
            const key = String(alert?.id || `${alert?.po || ''}:${alert?.msg || alert?.message || ''}`).trim();
            if (!key) return map;
            const normalized = {
              ...alert,
              createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
            };
            const existing = map.get(key);
            if (!existing || parseDateMs(normalized.createdAt || normalized.time) >= parseDateMs(existing.createdAt || existing.time)) {
              map.set(key, normalized);
            }
            return map;
          }, new Map<string, any>())
          .values(),
      )
        .sort((a: any, b: any) => parseDateMs(b.createdAt || b.time) - parseDateMs(a.createdAt || a.time))
        .slice(0, 20);
      setPersistedCustomerAlerts(merged);
      try { writeWorkflowStorage(customerAlertsStorageKey, merged); } catch {}
    } catch {
      setPersistedCustomerAlerts([]);
    }
  }, [customerAlertsStorageKey, subscriberEmail]);
  const getOrderEventTs = (order: any, fallback: any = Date.now()) =>
    parseDateMs(
      order?.statusHistory?.[0]?.createdAt ||
      order?.statusChangedAt ||
      order?.updatedAt ||
      fallback,
    ) || parseDateMs(fallback) || Date.now();
  const isCustomerCancellationNote = (value: any) =>
    /\bcustomer\s+(?:cancelled|canceled|cancel)\b|\bcancelled\s+by\s+customer\b|\bcanceled\s+by\s+customer\b/i.test(String(value || ''));
  const normalizePropLocationPart = (value: any) => {
    const text = String(value || '').trim();
    if (!text || /^--\s*select/i.test(text)) return '';
    return text;
  };
  const getPropSiteLocation = (p: Partial<PropInquiry>) => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    return [
      normalizePropLocationPart(p.addressLine),
      normalizePropLocationPart(p.subdistrict),
      normalizePropLocationPart(p.district),
      normalizePropLocationPart(p.province),
    ].filter(Boolean).join(', ') || normalizePropLocationPart(p.province) || 'Unknown';
  };
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
    return `${title} · ${listingLabel} · ${getPropSiteLocation(p)} · ${toCurrencyLabel(p.propertyPrice)}`;
  };
  const getPropListingTypeLabel = (listingType: string | null | undefined) => {
    const upper = String(listingType || '').toUpperCase();
    if (upper === 'SALE') return locale === 'th' ? 'ขาย' : locale === 'zh' ? '出售' : 'Sale';
    if (upper === 'RENT') return locale === 'th' ? 'เช่า' : locale === 'zh' ? '出租' : 'Rent';
    return upper || '-';
  };
  const hasPendingCustomerPropRating = (p: Partial<PropInquiry>) => p.customerRating == null;
  const hasPendingListerPropRating = (p: Partial<PropInquiry>) => p.listerRating == null;
  const isCustomerSidePropCompleted = (p: Partial<PropInquiry>) => {
    const status = String(p.status || '').toUpperCase();
    if (['COMPLETED', 'DECLINED', 'CANCELLED'].includes(status)) return true;
    return status === 'MEETING_CONFIRMED' && p.customerRating != null;
  };
  const getPropInquiryDisplayStep = (statusValue: string, stepValue?: number | null) => {
    const status = String(statusValue || '').toUpperCase();
    const explicitStep = Number(stepValue || 0);
    const baseStep =
      status === 'NOTIFY_SENT'
        ? 3
        : status === 'ACCEPTED'
        ? 5
        : status === 'PAID'
        ? 7
        : status === 'MEETING_SENT'
        ? 7
        : status === 'MEETING_CONFIRMED' || status === 'COMPLETED'
        ? 8
        : 4;
    return Number.isFinite(explicitStep) && explicitStep > 0
      ? Math.max(baseStep, explicitStep)
      : baseStep;
  };
  const canShowCustomerPropRateRequest = (p: Partial<PropInquiry>) => {
    const status = String(p.status || '').toUpperCase();
    if (["DECLINED", "CANCELLED", "COMPLETED"].includes(status)) return false;
    return hasPendingCustomerPropRating(p) && getPropInquiryDisplayStep(status, Number(p.step || 0)) >= 8;
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
  const readStoredChatHistory = (po: any) => {
    if (!mockReady || typeof window === 'undefined' || !po) return [];
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
  const extractPo = (orderLike: any) => {
    return extractPoCode(orderLike);
  };
  const isPoCode = (value: string) => isValidPoCode(value);
  const workflowOrders = (orders || []).filter((order: any) => !isHiddenTestPo(extractPo(order)));
  const workflowScopeKey = String(subscriber?.id || subscriber?.email || '').trim().toLowerCase();
  const workflowKnownPoStorageKey = workflowScopeKey ? `cblue_live_workflow_pos_${workflowScopeKey}` : '';

  useEffect(() => {
    const currentBackendPos = new Set(
      (orders || [])
        .map((order: any) => extractPo(order))
        .filter((po: string) => isPoCode(po)),
    );
    if (currentBackendPos.size === 0) return;
    lastKnownBackendOrderPosRef.current = currentBackendPos;
    try {
      if (workflowKnownPoStorageKey) {
        localStorage.setItem(
          workflowKnownPoStorageKey,
          JSON.stringify([...currentBackendPos]),
        );
      }
    } catch {
      // Keep the in-memory fallback even if storage is unavailable.
    }
  }, [orders, workflowKnownPoStorageKey]);
  const filterVisibleWorkflowItems = (items: any[], terminalPoValues: Set<string> | string[] = []) =>
    filterLiveWorkflowItems(items, terminalPoValues).filter((item: any) => !isHiddenTestPo(item?.po));
  const filterVisibleActiveWorkflowItems = (items: any[], terminalPoValues: Set<string> | string[] = []) =>
    filterVisibleWorkflowItems(items, terminalPoValues).filter((item: any) => !isBackendWorkflowHistoryStatus(item));
  const filterVisibleWorkflowHistoryItems = (items: any[]) =>
    normalizeWorkflowHistoryItems(items).filter((item: any) => !isHiddenTestPo(item?.po));
  const postBackendWorkflowMessage = async (po: string, text: string) => {
    try {
      const token = getCustomerDashboardToken();
      if (!token || !po) return;
      const orderId =
        localStorage.getItem(`po_to_order_${po}`) ||
        workflowOrders.find((o: any) => extractPo(o) === po)?.id ||
        "";
      if (!orderId) return;
      await fetch(`/api/v1/orders/${orderId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      }).catch(() => {});
    } catch {
      // Non-blocking for workflow UI.
    }
  };
  const appendLocalWorkflowChat = (po: string, text: string, createdAt = Date.now()) => {
    if (!po || typeof window === 'undefined') return;
    try {
      const chatKey = `chat_messages_${po}`;
      const existing = JSON.parse(localStorage.getItem(chatKey) || '[]');
      const rows = Array.isArray(existing) ? existing : [];
      if (rows.some((row: any) => String(row?.text || '') === text)) return;
      const next = [
        ...rows,
        {
          id: `workflow-${po}-${createdAt}`,
          sender: 'system',
          text,
          time: toDisplayDateTime(createdAt),
          createdAt,
        },
      ];
      localStorage.setItem(chatKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('cblue-chat-updated', { detail: { orderId: po } }));
    } catch {
      // Non-blocking customer chat mirror.
    }
  };
  const handleOrderClick = (o: any) => {
    const status = String(o?.status || "").trim().toUpperCase();
    if (["MATCHING", "CREATED", "PENDING"].includes(status)) {
      window.location.href = `${prefix}/booking/resume/${o.id}`;
      return;
    }
    const chatId = extractPo(o) || o.id;
    try {
      localStorage.setItem(`chat_from_${chatId}`, "dashboard");
    } catch {
      // Non-blocking fallback for demo mode.
    }
    window.location.href = `${prefix}/chat/${chatId}`;
  };

    // MOCK CARDS - SSR-safe: never read localStorage in useState init (runs on server → throws)
  const [mockPayments, setMockPayments] = useState<Record<string, boolean>>({});
  const [mockActiveItems, setMockActiveItems] = useState<any[]>([]);
  const [mockDynRequests, setMockDynRequests] = useState<any[]>([]);
  const [mockHistory, setMockHistory] = useState<any[]>([]);
  const [mockReady, setMockReady] = useState(false);
  // Load from localStorage AFTER mount (useEffect never runs on server)
  useEffect(() => {
    try {
      // Load persisted workflow bridge rows for all customers; demo repairs stay Ghis-only.
      const subData = readCustomerDashboardSubscriber() || {};
      const subEmail = String(subData?.email || "").toLowerCase();
      if (subEmail.includes('ghis')) ensureLegacyCancel3429Repair();
      // One-time cleanup of stale chat keys with invalid PO format (e.g. UUID-like keys from old builds)
      Object.keys(localStorage)
        .filter(k => k.startsWith('chat_messages_') || k.startsWith('chat_title_') || k.startsWith('po_to_order_'))
        .forEach(k => {
          const suffix = k.replace(/^chat_messages_|^chat_title_|^po_to_order_/, '');
          if (!isValidPoCode(suffix) && !isPropPoCode(suffix)) { try { localStorage.removeItem(k); } catch {} }
        });
      Object.keys(localStorage)
        .filter(k => k.startsWith('chat_messages_'))
        .forEach(k => {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '[]');
            if (!Array.isArray(parsed)) return;
            const cleaned = parsed.filter((msg: any) => {
              const text = String(msg?.text || '').toLowerCase();
              return !text.includes('just be paid by customer') && !text.includes('notify to proceed');
            });
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(k, JSON.stringify(cleaned));
            }
          } catch {}
        });
      const p = localStorage.getItem("ghis_mock_payments");
      const a = localStorage.getItem("ghis_mock_active");
      const d = localStorage.getItem("ghis_mock_dyn_req");
      const h = localStorage.getItem("ghis_mock_history");
      const terminalPos = readBrowserTerminalWorkflowPos(localStorage);
      if (p) setMockPayments(JSON.parse(p));
      if (a) setMockActiveItems(filterVisibleActiveWorkflowItems(JSON.parse(a), terminalPos));
      if (d) setMockDynRequests(filterVisibleWorkflowItems(JSON.parse(d), terminalPos));
      if (h) setMockHistory(filterVisibleWorkflowHistoryItems(JSON.parse(h)));
    } catch {}
    setMockReady(true);
  }, []);
  // Persist (mockReady guard prevents overwriting storage on first empty render)
  useEffect(() => { if (mockReady) try { writeWorkflowStorage("ghis_mock_payments", mockPayments); } catch {} }, [mockPayments, mockReady]);
  useEffect(() => { if (mockReady) try { writeWorkflowStorage("ghis_mock_active", mockActiveItems); } catch {} }, [mockActiveItems, mockReady]);
  useEffect(() => { if (mockReady) try { writeWorkflowStorage("ghis_mock_dyn_req", mockDynRequests); } catch {} }, [mockDynRequests, mockReady]);
  useEffect(() => {
    if (mockReady) {
      try {
        const result = setWorkflowStorageItem(localStorage, "ghis_mock_history", mockHistory);
        if (result.compacted && result.ok && Array.isArray(result.value)) setMockHistory(result.value);
      } catch {}
    }
  }, [mockHistory, mockReady]);

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab && ["overview", "requests", "profile", "active", "properties", "history", "chat", "alerts"].includes(tab)) {
        setActiveTab(tab as any);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const syncMockState = () => {
      try {
        const subData = readCustomerDashboardSubscriber() || {};
        const subEmail = String(subData?.email || "").toLowerCase();
        if (subEmail.includes('ghis')) ensureLegacyCancel3429Repair();
        const p = localStorage.getItem("ghis_mock_payments");
        const a = localStorage.getItem("ghis_mock_active");
        const d = localStorage.getItem("ghis_mock_dyn_req");
        const h = localStorage.getItem("ghis_mock_history");
        if (p) setMockPayments(JSON.parse(p));
        if (a) {
          const terminalPos = readBrowserTerminalWorkflowPos(localStorage);
          const parsedActive = filterVisibleActiveWorkflowItems(JSON.parse(a), terminalPos);
          setMockActiveItems((prev) => {
            const previousVisible = filterVisibleActiveWorkflowItems(prev, terminalPos);
            return parsedActive.length === 0 && previousVisible.length > 0 ? previousVisible : parsedActive;
          });
        }
        if (d) {
          const terminalPos = readBrowserTerminalWorkflowPos(localStorage);
          const parsedDyn = filterVisibleWorkflowItems(JSON.parse(d), terminalPos);
          setMockDynRequests((prev) => {
            const previousVisible = filterVisibleWorkflowItems(prev, terminalPos);
            return parsedDyn.length === 0 && previousVisible.length > 0 ? previousVisible : parsedDyn;
          });
        }
        if (h) setMockHistory(filterVisibleWorkflowHistoryItems(JSON.parse(h)));
      } catch {}
    };
    window.addEventListener("storage", syncMockState);
    const timer = setInterval(syncMockState, 1200);
    return () => {
      window.removeEventListener("storage", syncMockState);
      clearInterval(timer);
    };
  }, []);

  // Load property inquiries for this customer (not ghis-gated — works for all logged-in users)
  useEffect(() => {
    const TIER_FEES: Record<string, number> = { ECONOMY: 100, STANDARD: 400, UPPER: 600, LUXURY: 800, GRANDEUR: 1000 };
    function mapApiInquiry(api: any): PropInquiry {
      const propertyImages = Array.isArray(api?.property?.images)
        ? api.property.images
            .map((image: any) => normalizeImageUrl(extractImageUrlCandidate(image)))
            .filter(Boolean)
        : [];
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
    async function loadPropInquiries() {
      try {
        let token = getCustomerDashboardToken();
        if (!token) { setPropInquiries([]); return; }
        const load = (authToken: string) => fetch("/api/v1/property-inquiries/customer", { headers: { Authorization: `Bearer ${authToken}` } });
        let res = await load(token);
        if (!res.ok && [401, 403].includes(res.status)) {
          const refreshedToken = await refreshSubscriberSession(token);
          if (refreshedToken) {
            token = refreshedToken;
            writeCustomerDashboardSession(readCustomerDashboardSubscriber(), refreshedToken);
            res = await load(token);
          }
        }
        if (!res.ok) return;
        const data = await res.json();
        const mapped = Array.isArray(data) ? data.map(mapApiInquiry) : [];
        setPropInquiries(
          mapped.filter(
            (inquiry: PropInquiry) =>
              !(
                isStaleCustomerNotifyPropPo(inquiry.poNumber) &&
                String(inquiry.status || '').toUpperCase() === 'NOTIFY_SENT'
              ),
          ),
        );
      } catch {
        // Keep the last visible inquiry state during transient failures or rate limits.
      }
    }
    loadPropInquiries();
    const timer = setInterval(loadPropInquiries, 30000);
    return () => clearInterval(timer);
  }, [subscriber]);

  useEffect(() => {
    for (const inquiry of propInquiries) {
      const status = String(inquiry.status || "").toUpperCase();
      if (["PAID", "MEETING_SENT", "MEETING_CONFIRMED"].includes(status)) {
        ensurePropChatBootstrap(inquiry);
      }
    }
  }, [propInquiries]);

  const buildChatFeed = () => {
    if (typeof window === "undefined") return [];
    let viewerEmail = "";
    let viewerUserId = "";
    try {
      const sub = readCustomerDashboardSubscriber() || {};
      viewerEmail = sub?.email || "";
      viewerUserId = sub?.id || "";
    } catch {}
    const normalizedViewerEmail = String(viewerEmail || "").trim().toLowerCase();
    const normalizedViewerUserId = String(viewerUserId || "").trim().toLowerCase();
    if (!normalizedViewerEmail.includes('ghis')) return [];
    const parseChatSort = (msg: any) => {
      const createdTs = parseDateMs(msg?.createdAt || msg?.time || 0);
      if (Number.isFinite(createdTs) && createdTs > 0) return createdTs;
      const numericId = Number(String(msg?.id || "").replace(/[^0-9]/g, ""));
      if (Number.isFinite(numericId) && numericId > 0) return numericId;
      return 0;
    };
    const isOwnSender = (sender: any) => {
      const normalizedSender = String(sender || "").trim().toLowerCase();
      if (!normalizedSender) return true;
      if (normalizedSender === normalizedViewerEmail) return true;
      if (normalizedViewerUserId && normalizedSender === normalizedViewerUserId) return true;
      return ["customer", "me", "guest", "system"].includes(normalizedSender);
    };
    const isWorkflowSystemMessage = (m: any) =>
      String(m?.sender || '').trim().toLowerCase() === 'system' &&
      isVisibleWorkflowSystemText(m?.text);
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
    const workflowOrderByPo = new Map(
      workflowOrders
        .map((order: any) => [extractPo(order), order] as const)
        .filter(([po]) => isPoCode(po)),
    );
    for (const key of keys) {
      try {
        const po = key.replace("chat_messages_", "");
        if (!isPoCode(po)) continue;
        if (isHiddenTestPo(po)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`chat_title_${po}`);
          localStorage.removeItem(`chat_from_${po}`);
          continue;
        }
        const workflowOrder = workflowOrderByPo.get(po);
        if (!workflowOrder) {
          localStorage.removeItem(key);
          localStorage.removeItem(`chat_title_${po}`);
          localStorage.removeItem(`chat_from_${po}`);
          continue;
        }
        if (!isWorkflowOrderChatEnabled(workflowOrder)) {
          if (isClosedWorkflowActivity(workflowOrder)) {
            localStorage.setItem(`chat_closed_${po}`, '1');
          }
          continue;
        }
        if (localStorage.getItem(`chat_closed_${po}`)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed) || parsed.length === 0) continue;
        if (hasCompletionChatMarker(parsed)) {
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
          lastMsg: latestVisible.text,
          time: latestVisible.time || toDisplayDateTime(latestVisible.createdAt) || "",
          incomingMsg: latestIncoming?.text || "",
          incomingTime: latestIncoming?.time || toDisplayDateTime(latestIncoming?.createdAt) || "",
          hasIncoming: Boolean(latestIncoming),
          sort: parseChatSort(latestVisible),
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
    try {
      viewerUserId = String((readCustomerDashboardSubscriber() || {})?.id || "").trim();
    } catch {}
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

    const activePOs = propInquiries
      .filter((p: PropInquiry) => isChatOpen(p))
      .map((p: PropInquiry) => p.poNumber);
    for (const po of activePOs) {
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
        const sortTs = parseDateMs(last?.createdAt || last?.time || Date.now());
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
    const token = getCustomerDashboardToken();
    if (!token) return [];

    const viewerUserId = String(subscriber?.id || "");
    const items: any[] = [];
    const openOrders = (orders || []).filter((order: any) => {
      const orderId = order?.id;
      if (!orderId) return false;
      const po = extractPo(order);
      if (!po || !isPoCode(po)) return false;
      if (localStorage.getItem(`chat_closed_${po}`)) return false;
      return isWorkflowOrderChatEnabled(order);
    });

    const loadOrderChat = async (order: any) => {
      const orderId = order.id;
      const po = extractPo(order);
      if (!po || !isPoCode(po)) return null;
      try {
        const res = await fetch(`/api/v1/orders/${orderId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 429) return null;
        if (!res.ok) return null;

        const messages = await res.json();
        if (!Array.isArray(messages) || messages.length === 0) return null;

        try { localStorage.setItem(`po_to_order_${po}`, orderId); } catch {}

        const visible = messages.filter((m: any) => {
          const text = String(m?.text || "").trim();
          if (!text) return false;
          const lowerText = text.toLowerCase();
          if (lowerText.includes("just be paid by customer")) return false;
          if (lowerText.includes("notify to proceed")) return false;
          return true;
        });
        if (visible.length === 0) return null;
        const workflowClosed = ['COMPLETED', 'CANCELLED', 'DONE'].includes(String(order?.status || '').toUpperCase());
        if (workflowClosed || hasCompletionChatMarker(visible)) {
          try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
          return null;
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
            createdAt: parseDateMs(m?.createdAt),
            time: toDisplayDateTime(m?.createdAt),
          }))]) {
            const text = String(row?.text || '').trim();
            if (!text) continue;
            mergedByText.set(text, row);
          }
          localStorage.setItem(`chat_messages_${po}`, JSON.stringify(Array.from(mergedByText.values()).sort((a: any, b: any) => parseDateMs(a.createdAt) - parseDateMs(b.createdAt))));
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

        return {
          id: po,
          po,
          name: title,
          lastMsg: String(latestVisible?.text || ""),
          time: toDisplayDateTime(latestVisible?.createdAt) || "",
          incomingMsg: incoming ? String(incoming?.text || "") : "",
          incomingTime: incoming ? (toDisplayDateTime(incoming?.createdAt) || "") : "",
          hasIncoming: Boolean(incoming),
          sort: parseDateMs(latestVisible?.createdAt),
          source: "backend",
        };
      } catch {
        return null;
      }
    };

    const results = await Promise.allSettled(openOrders.map((order) => loadOrderChat(order)));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) items.push(result.value);
    }

    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  const buildPropBackendChatFeed = async () => {
    if (typeof window === "undefined") return [];
    const token = getCustomerDashboardToken();
    if (!token) return [];

    const viewerUserId = String(subscriber?.id || "").trim();
    const now = Date.now();
    const isChatOpen = (p: PropInquiry) => {
      const status = String(p.status || "").toUpperCase();
      if (status === "COMPLETED") return false;
      if (status === "PAID" || status === "MEETING_SENT") return true;
      if (status !== "MEETING_CONFIRMED") return false;
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
        if (res.status === 429) break;
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
            time: row?.createdAt ? toDisplayDateTime(row.createdAt) : '',
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
          lastMsg: latest?.text || '',
          time: latest?.time || '',
          incomingMsg: incoming?.text || '',
          incomingTime: incoming?.time || '',
          hasIncoming: Boolean(incoming),
          sort: Number(latest?.createdAt || 0),
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
      const upsertNewest = (item: any) => {
        if (!item?.po) return;
        const existing = merged.get(item.po);
        if (!existing || Number(item.sort || 0) >= Number(existing.sort || 0)) {
          merged.set(item.po, item);
        }
      };
      for (const item of propChatItems) upsertNewest(item);
      for (const item of localItems) upsertNewest(item);
      for (const item of propBackendItems) upsertNewest(item);
      for (const item of backendItems) upsertNewest(item);

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
  }, [orders, propInquiries, subscriber?.id]);

  // F4: Auto-create payment_pending requests for backend CONFIRMED orders (cross-browser bridge).
  // When Suppadesh accepts a PO on their browser, the backend order goes CONFIRMED. Ghis's page
  // polls orders and detects this, auto-creating a payment_pending card in requests.
  useEffect(() => {
    if (!mockReady || !subscriber) return;
    // Only block if there is already an ACTIONABLE (step 6+) entry for the PO — NOT notice items
    const existingDynPos = new Set(
      mockDynRequests.filter((x: any) => !['notice'].includes(String(x.type || ''))).map((x: any) => x.po),
    );
    // Only block if active item is already at step 6+ (accepted), not step 5 (awaiting acceptance)
    const existingActivePos = new Set(
      mockActiveItems.filter((x: any) => Number(x.step || 0) >= 6).map((x: any) => x.po),
    );
    const completedPos = new Set(mockHistory.map((x: any) => x.po));
    const toCreate: any[] = [];
    for (const order of workflowOrders) {
      const status = String(order?.status || '').toUpperCase();
      if (!['ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED', 'ACCEPTED'].includes(status)) continue;
      const po = extractPo(order);
      if (!po || !isPoCode(po)) continue;
      if (existingDynPos.has(po)) continue;
      if (existingActivePos.has(po)) continue;
      if (completedPos.has(po)) continue;
      const createdAt = parseDateMs(
        order.statusHistory?.[0]?.createdAt ||
        order.statusChangedAt ||
        order.updatedAt ||
        order.createdAt ||
        Date.now(),
      );
      const tier = String(order?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || 'STANDARD';
      toCreate.push({
        id: `pay-${po}`,
        po,
        orderId: order.id,
        title: String(order.serviceCategory || order.serviceTh || 'Service').replace(/_/g, ' '),
        customer: order.fixerName || order.fixerAlias || 'Suppadesh',
        date: fmtDateTime(createdAt),
        createdAt,
        budget: order.estimatedPrice ? `฿${Number(order.estimatedPrice).toLocaleString()}` : '฿0',
        tier,
        desc: 'Partner accepted the PO. Please pay the processing fee and notify to proceed.',
        location: (() => {
          const lat = Number(order?.address?.latitude);
          const lng = Number(order?.address?.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          }
          const m = String(order?.description || '').match(/\bLOC:([^|]+)/);
          return (m ? (m[1] ?? '').trim() : '') || String(order?.address?.subdistrict || order?.subdistrict || order?.location || '');
        })(),
        type: 'payment_pending',
        step: 6,
      });
    }
    if (toCreate.length > 0) {
      setMockDynRequests(prev => {
        const existingIds = new Set(prev.map((x: any) => x.id));
        const newItems = toCreate.filter((x: any) => !existingIds.has(x.id));
        if (newItems.length === 0) return prev;
        const merged = [...prev, ...newItems];
        try { writeWorkflowStorage('ghis_mock_dyn_req', merged); } catch {}
        return merged;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, mockReady]);

  // F5: Auto-upgrade meeting_pending_partner → meeting_scheduled when backend order transitions
  // from MEETING_REQUESTED → IN_PROGRESS (cross-browser: partner confirms meeting on their browser,
  // backend status changes, customer page detects and updates the request card automatically).
  useEffect(() => {
    if (!mockReady) return;
    const pendingMeetingByPo = new Map(
      mockDynRequests
        .filter((item: any) => item?.type === 'meeting_pending_partner')
        .map((item: any) => [String(item.po || '').trim(), item]),
    );
    const scheduledMeetingPos = new Set(
      mockDynRequests
        .filter((item: any) => item?.type === 'meeting_scheduled')
        .map((item: any) => String(item.po || '').trim()),
    );
    const confirmedMeetingChatByPo = chatFeed
      .filter((chatItem: any) => /partner confirmed site meeting|meeting confirmed by partner/i.test(String(chatItem?.lastMsg || '')))
      .reduce((map: Map<string, string>, chatItem: any) => {
        const chatPo = String(chatItem?.po || '').trim();
        if (isValidPoCode(chatPo)) map.set(chatPo, String(chatItem?.lastMsg || ''));
        return map;
      }, new Map<string, string>());
    const confirmedMeetingByChatPos = new Set(confirmedMeetingChatByPo.keys());
    const toSchedule = new Set<string>();
    const scheduledPayloadByPo = new Map<string, any>();
    for (const order of workflowOrders) {
      const po = extractPo(order);
      if (!po) continue;
      const currentStatus = String(order.status || '').toUpperCase();
      const prevStatus = prevOrderStatuses.current[order.id];
      const pendingMeeting = pendingMeetingByPo.get(po);
      const statusNote = getWorkflowStatusNote(order);
      const hasStatusTransitionConfirmation =
        prevStatus === 'MEETING_REQUESTED' && currentStatus === 'IN_PROGRESS';
      const hasChatConfirmation = confirmedMeetingByChatPos.has(po);
      const hasStatusNoteConfirmation =
        currentStatus === 'IN_PROGRESS' && /partner confirmed site meeting|meeting confirmed by partner|partner confirmed meeting time/i.test(statusNote);
      const hasConfirmedMeetingSignal =
        !scheduledMeetingPos.has(po) &&
        (hasStatusTransitionConfirmation || hasChatConfirmation || hasStatusNoteConfirmation);
      if (hasConfirmedMeetingSignal) {
        const existingActive = mockActiveItems.find((item: any) => item?.po === po);
        const confirmationChatText = confirmedMeetingChatByPo.get(po) || '';
        const inviteDetails = readMeetingInviteSnapshot(po, {
          ...(pendingMeeting || existingActive || order),
          meetingMessage: confirmationChatText || pendingMeeting?.meetingMessage || existingActive?.meetingMessage || order?.meetingMessage,
        });
        const createdAt =
          parseDateMs(
            order.statusHistory?.[0]?.createdAt ||
              order.statusChangedAt ||
              order.updatedAt ||
              pendingMeeting?.createdAt ||
              pendingMeeting?.date ||
              existingActive?.createdAt ||
              order.createdAt ||
              Date.now(),
          ) || Date.now();
        const tier =
          pendingMeeting?.tier ||
          existingActive?.tier ||
          String(order?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] ||
          'STANDARD';
        const location =
          pendingMeeting?.location ||
          existingActive?.location ||
          existingActive?.subdistrict ||
          (() => {
            const lat = Number(order?.address?.latitude);
            const lng = Number(order?.address?.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
              return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
            const match = String(order?.description || '').match(/\bLOC:([^|]+)/);
            return (match ? (match[1] ?? '').trim() : '') || String(order?.address?.subdistrict || order?.subdistrict || order?.location || '');
          })();
        const meetingDate = inviteDetails.meetingDate || pendingMeeting?.meetingDate || existingActive?.meetingDate || '';
        const meetingTime = inviteDetails.meetingTime || pendingMeeting?.meetingTime || existingActive?.meetingTime || '';
        const meetingVenue =
          inviteDetails.meetingVenue ||
          pendingMeeting?.meetingVenue ||
          pendingMeeting?.venue ||
          existingActive?.meetingVenue ||
          existingActive?.venue ||
          '';
        const meetingSummary = [meetingDate, meetingTime].filter(Boolean).join(' ').trim();
        scheduledPayloadByPo.set(po, {
          id: `meet-scheduled-${po}`,
          po,
          orderId: order.id,
          title:
            pendingMeeting?.title ||
            existingActive?.title ||
            String(order?.serviceCategory || order?.service || 'Service').replace(/_/g, ' '),
          customer:
            pendingMeeting?.customer ||
            existingActive?.customer ||
            order?.fixerName ||
            order?.partnerName ||
            'Suppadesh',
          date: fmtDateTime(createdAt),
          createdAt,
          budget:
            pendingMeeting?.budget ||
            existingActive?.budget ||
            (order?.estimatedPrice ? `฿${Number(order.estimatedPrice).toLocaleString()}` : '฿0'),
          tier,
          type: 'meeting_scheduled',
          confirmedByPartner: true,
          step: 8,
          venue: meetingVenue,
          meetingVenue,
          meetingDate,
          meetingTime,
          location,
          desc: `Meeting confirmed by partner${meetingSummary ? ` for ${meetingSummary}` : ''}${meetingVenue ? ` at ${meetingVenue}` : ''}. Proceed after the site meeting then mark variation.`,
        });
        toSchedule.add(po);
      }
      prevOrderStatuses.current[order.id] = currentStatus;
    }
    if (toSchedule.size > 0) {
      setMockActiveItems(prev => {
        let changed = false;
        const next = [...prev];
        for (const po of toSchedule) {
          const scheduled = scheduledPayloadByPo.get(po);
          if (!scheduled) continue;
          const existingActive = next.find((item: any) => item?.po === po);
          const activeSnapshot = {
            ...(existingActive || scheduled),
            po,
            title: existingActive?.title || scheduled.title,
            customer: existingActive?.customer || scheduled.customer,
            date: existingActive?.date || scheduled.date,
            createdAt: existingActive?.createdAt || scheduled.createdAt,
            budget: existingActive?.budget || scheduled.budget,
            tier: existingActive?.tier || scheduled.tier,
            location: existingActive?.location || scheduled.location,
            subdistrict: existingActive?.subdistrict || scheduled.location,
            meetingDate: scheduled.meetingDate || existingActive?.meetingDate || '',
            meetingTime: scheduled.meetingTime || existingActive?.meetingTime || '',
            meetingVenue: scheduled.meetingVenue || existingActive?.meetingVenue || existingActive?.venue || '',
            venue: scheduled.venue || existingActive?.venue || existingActive?.meetingVenue || '',
            step: 9,
            mockStep: 9,
            actionNeeded: false,
          };
          const activeIndex = next.findIndex((item: any) => item?.po === po);
          if (activeIndex >= 0) next[activeIndex] = activeSnapshot;
          else next.push(activeSnapshot);
          changed = true;
        }
        if (!changed) return prev;
        try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
        return next;
      });
      setMockDynRequests(prev => {
        let changed = false;
        let next = [...prev];
        for (const po of toSchedule) {
          const scheduled = scheduledPayloadByPo.get(po);
          if (!scheduled) continue;
          next = next.filter((r: any) => !(r.po === po && ['meeting_pending_partner', 'meeting_scheduled', 'chat_ready', 'meeting_invite'].includes(String(r.type || ''))));
          next.push(scheduled);
          changed = true;
        }
        if (!changed) return prev;
        try { writeWorkflowStorage('ghis_mock_dyn_req', next); } catch {}
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatFeed, mockActiveItems, mockDynRequests, orders, mockReady]);

  // F6: Cross-browser detection of partner variation/complete/rate actions via backend chat messages.
  // When partner posts [SYSTEM] messages, customer's chatFeed picks them up (5s poll) and this
  // effect auto-creates the appropriate UI items in mockDynRequests.
  useEffect(() => {
    if (!chatFeed || !mockReady || !subscriber) return;
    for (const chatItem of chatFeed) {
      if (chatItem.source !== 'backend') continue;
      const po = chatItem.po;
      if (!po) continue;
      const lastMsg = String(chatItem.lastMsg || '').toLowerCase();
      const backendOrder = workflowOrders.find((o: any) => extractPo(o) === po);
      const title = String(backendOrder?.serviceCategory || '').replace(/_/g, ' ') || po;
      const budget = backendOrder?.estimatedPrice ? `฿${Number(backendOrder.estimatedPrice).toLocaleString()}` : '฿0';
      const tier = String(backendOrder?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || 'Standard';
      const eventTs = parseDateMs(chatItem.sort || chatItem.createdAt || chatItem.time) || Date.now();
      const meetingSnapshot = (() => {
        try {
          const localReqs = JSON.parse(localStorage.getItem('ghis_mock_dyn_req') || '[]');
          const fromReq = (Array.isArray(localReqs) ? localReqs : []).find((r: any) => r?.po === po && ['meeting_scheduled', 'meeting_pending_partner'].includes(String(r?.type || '')));
          const fromActive = mockActiveItems.find((r: any) => r?.po === po);
          return {
            meetingDate: fromReq?.meetingDate || fromActive?.meetingDate || '',
            meetingTime: fromReq?.meetingTime || fromActive?.meetingTime || '',
            meetingVenue: fromReq?.meetingVenue || fromReq?.venue || fromActive?.meetingVenue || fromActive?.venue || '',
            venue: fromReq?.venue || fromReq?.meetingVenue || fromActive?.venue || fromActive?.meetingVenue || '',
          };
        } catch {
          const fromActive = mockActiveItems.find((r: any) => r?.po === po);
          return { meetingDate: fromActive?.meetingDate || '', meetingTime: fromActive?.meetingTime || '', meetingVenue: fromActive?.meetingVenue || fromActive?.venue || '', venue: fromActive?.venue || fromActive?.meetingVenue || '' };
        }
      })();
      // Variation detection
      const activeItem = mockActiveItems.find((item: any) => item?.po === po);
      if (
        lastMsg.includes('[system] partner has submitted a variation') &&
        !isWorkflowPastVariation({
          activeItem,
          backendOrder,
          po,
          storage: localStorage,
        })
      ) {
        setMockActiveItems(prev => {
          const activeSnapshot = {
            ...(prev.find((x: any) => x.po === po) || backendOrder || {}),
            po,
            title,
            customer: 'Suppadesh',
            budget,
            tier,
            ...meetingSnapshot,
            step: 9,
            mockStep: 9,
            actionNeeded: true,
          };
          const next = [...prev.filter((x: any) => x.po !== po), activeSnapshot];
          try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
          return next;
        });
        setMockDynRequests(prev => {
          if (prev.some((x: any) => x.po === po && x.type === 'variation_pending')) return prev;
          const fullMsg = String(chatItem.lastMsg || '');
          const noteMatch = fullMsg.match(/\[VARIATION_DATA\]([\s\S]*?)\[\/VARIATION_DATA\]/i);
          const desc = noteMatch?.[1]?.trim() || 'Partner has submitted a variation for your approval. Please review and confirm to proceed.';
          const item = { id: `var-${po}`, po, title, customer: 'Suppadesh', date: fmtDateTime(eventTs), createdAt: eventTs, budget, tier, desc, type: 'variation_pending', step: 9, ...meetingSnapshot };
          const merged = [...prev.filter((x: any) => !(x.po === po && ['variation_pending', 'meeting_invite', 'meeting_pending_partner', 'meeting_scheduled', 'chat_ready'].includes(x.type))), item];
          try { writeWorkflowStorage('ghis_mock_dyn_req', merged); } catch {}
          return merged;
        });
      }
      // Complete detection
      const completeDescFromChat = extractWorkflowCompleteRequest(chatItem.lastMsg);
      if (completeDescFromChat) {
        setMockActiveItems(prev => {
          const activeSnapshot = {
            ...(prev.find((x: any) => x.po === po) || backendOrder || {}),
            po,
            title,
            customer: 'Suppadesh',
            budget,
            tier,
            ...meetingSnapshot,
            step: 10,
            mockStep: 10,
            actionNeeded: true,
          };
          const next = [...prev.filter((x: any) => x.po !== po), activeSnapshot];
          try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
          return next;
        });
        setMockDynRequests(prev => {
          if (prev.some((x: any) => x.po === po && x.type === 'complete_pending')) return prev;
          const desc = completeDescFromChat;
          const item = { id: `compl-${po}`, po, title, customer: 'Suppadesh', date: fmtDateTime(eventTs), createdAt: eventTs, budget, tier, desc, type: 'complete_pending', step: 10, ...meetingSnapshot };
          const merged = [...prev.filter((x: any) => !(x.po === po && ['complete_pending', 'variation_pending', 'meeting_invite', 'meeting_pending_partner', 'meeting_scheduled', 'chat_ready'].includes(x.type))), item];
          try { writeWorkflowStorage('ghis_mock_dyn_req', merged); } catch {}
          return merged;
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatFeed, mockReady]);

  // F9 fallback: if the partner variation note lands in order status history before chat polling,
  // create the customer's Step 9 approval request from the backend order itself.
  useEffect(() => {
    if (!mockReady || !subscriber) return;
    const variationOrders = workflowOrders
      .map((backendOrder: any) => {
        const po = extractPo(backendOrder);
        const status = String(backendOrder?.status || '').toUpperCase();
        const note = getWorkflowStatusNote(backendOrder);
        const desc = extractWorkflowVariationRequest(note);
        return { backendOrder, po, status, desc };
      })
      .filter(({ po, status, desc, backendOrder }: any) => {
        if (!po || !isPoCode(po) || !desc || isTerminalWorkflowStatus(status)) return false;
        return !isWorkflowPastVariation({ backendOrder, po, storage: localStorage });
      });
    if (variationOrders.length === 0) return;

    for (const { backendOrder, po, desc } of variationOrders) {
      const title = String(backendOrder?.serviceCategory || '').replace(/_/g, ' ') || po;
      const budget = backendOrder?.estimatedPrice ? `฿${Number(backendOrder.estimatedPrice).toLocaleString()}` : '฿0';
      const tier = String(backendOrder?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || 'Standard';
      const eventTs = parseDateMs(
        backendOrder?.statusHistory?.[0]?.createdAt ||
        backendOrder?.statusChangedAt ||
        backendOrder?.updatedAt,
      ) || Date.now();

      setMockActiveItems(prev => {
        const activeSnapshot = {
          ...(prev.find((x: any) => x.po === po) || backendOrder || {}),
          po,
          title,
          customer: 'Suppadesh',
          budget,
          tier,
          step: 9,
          mockStep: 9,
          actionNeeded: true,
        };
        const next = [...prev.filter((x: any) => x.po !== po), activeSnapshot];
        try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
        return next;
      });
      setMockDynRequests(prev => {
        if (prev.some((x: any) => x.po === po && x.type === 'variation_pending')) return prev;
        const item = { id: `var-${po}`, po, title, customer: 'Suppadesh', date: fmtDateTime(eventTs), createdAt: eventTs, budget, tier, desc, type: 'variation_pending', step: 9 };
        const merged = [...prev.filter((x: any) => !(x.po === po && ['variation_pending', 'meeting_invite', 'meeting_pending_partner', 'meeting_scheduled', 'chat_ready'].includes(x.type))), item];
        try { writeWorkflowStorage('ghis_mock_dyn_req', merged); } catch {}
        return merged;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowOrders, mockReady, subscriber?.email]);

  // F10 fallback: if the partner completion note lands in order history before chat polling,
  // create the customer's Step 10 approval request from the backend order itself.
  useEffect(() => {
    if (!mockReady || !subscriber) return;
    const completionOrders = workflowOrders
      .map((backendOrder: any) => {
        const po = extractPo(backendOrder);
        const status = String(backendOrder?.status || '').toUpperCase();
        const note = getWorkflowStatusNote(backendOrder);
        const desc = extractWorkflowCompleteRequest(note);
        return { backendOrder, po, status, desc };
      })
      .filter(({ po, status, desc }: any) => po && isPoCode(po) && desc && !isTerminalWorkflowStatus(status));
    if (completionOrders.length === 0) return;

    for (const { backendOrder, po, desc } of completionOrders) {
      const title = String(backendOrder?.serviceCategory || '').replace(/_/g, ' ') || po;
      const budget = backendOrder?.estimatedPrice ? `฿${Number(backendOrder.estimatedPrice).toLocaleString()}` : '฿0';
      const tier = String(backendOrder?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || 'Standard';
      const eventTs = parseDateMs(
        backendOrder?.statusHistory?.[0]?.createdAt ||
        backendOrder?.statusChangedAt ||
        backendOrder?.updatedAt,
      ) || Date.now();

      setMockActiveItems(prev => {
        const activeSnapshot = {
          ...(prev.find((x: any) => x.po === po) || backendOrder || {}),
          po,
          title,
          customer: 'Suppadesh',
          budget,
          tier,
          step: 10,
          mockStep: 10,
          actionNeeded: true,
        };
        const next = [...prev.filter((x: any) => x.po !== po), activeSnapshot];
        try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
        return next;
      });
      setMockDynRequests(prev => {
        if (prev.some((x: any) => x.po === po && x.type === 'complete_pending')) return prev;
        const item = { id: `compl-${po}`, po, title, customer: 'Suppadesh', date: fmtDateTime(eventTs), createdAt: eventTs, budget, tier, desc, type: 'complete_pending', step: 10 };
        const merged = [...prev.filter((x: any) => !(x.po === po && ['complete_pending', 'variation_pending', 'meeting_invite', 'meeting_pending_partner', 'meeting_scheduled', 'chat_ready'].includes(x.type))), item];
        try { writeWorkflowStorage('ghis_mock_dyn_req', merged); } catch {}
        return merged;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowOrders, mockReady, subscriber?.email]);

  // F7: When partner declines on another browser, backend order becomes CANCELLED — sync customer UI.
  useEffect(() => {
    if (!mockReady) return;
    const cancelledOrders = workflowOrders.filter(
      (order: any) => String(order?.status || '').toUpperCase() === 'CANCELLED',
    );
    if (cancelledOrders.length === 0) return;

    const cancelledPos = new Set(
      cancelledOrders.map((order: any) => extractPo(order)).filter((po: string) => isPoCode(po)),
    );

    for (const order of cancelledOrders) {
      const po = extractPo(order);
      if (!po || !isPoCode(po)) continue;
      const createdAt = getOrderEventTs(order);
      const note = getWorkflowStatusNote(order);
      const reason = note.match(/Reason:\s*([^.]*)/i)?.[1]?.trim();
      const cancelledByCustomer = isCustomerCancellationNote(note);
      const service = String(order?.serviceCategory || order?.service || 'your project').replace(/_/g, ' ');
      const msg = cancelledByCustomer
        ? `Customer cancelled ${service} (${po})${reason ? `. Reason: ${reason}` : ''}. This job has been moved to History.`
        : `The selected partner declined ${service} (${po})${reason ? ` (${reason})` : ''}. Please select another matched professional from Book Fixers & Pros.`;
      appendLocalWorkflowChat(po, `[SYSTEM] ${msg}`, createdAt);
    }

    setMockActiveItems((prev) => {
      const next = prev.filter((item: any) => !cancelledPos.has(item.po));
      if (next.length === prev.length) return prev;
      try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
      return next;
    });

    setMockDynRequests((prev) => {
      let changed = false;
      const next = prev.filter((item: any) => {
        if (!cancelledPos.has(item.po)) return true;
        if (['notice'].includes(String(item.type || ''))) {
          if (String(item.id || '').includes('partner-declined')) {
            changed = true;
            return false;
          }
          return true;
        }
        changed = true;
        return false;
      });
      for (const order of cancelledOrders) {
        const po = extractPo(order);
        if (!po || !isPoCode(po)) continue;
        const note = getWorkflowStatusNote(order);
        if (isCustomerCancellationNote(note)) {
          changed = true;
          continue;
        }
        if (next.some((item: any) => String(item.id) === `partner-declined-${po}`)) continue;
        const createdAt = getOrderEventTs(order);
        const reason = note.match(/Reason:\s*([^.]*)/i)?.[1]?.trim();
        const service = String(order?.serviceCategory || order?.service || 'your project').replace(/_/g, ' ');
        const msg = `The selected partner declined ${service} (${po})${reason ? ` (${reason})` : ''}. Please select another matched professional from Book Fixers & Pros.`;
        next.push({
          id: `partner-declined-${po}`,
          po,
          type: 'notice',
          msg,
          msgTh: `พาร์ทเนอร์ที่เลือกปฏิเสธ ${service} (${po})${reason ? ` (${reason})` : ''} กรุณาเลือกมืออาชีพรายอื่นจาก Book Fixers & Pros`,
          msgZh: `所选合作伙伴拒绝了 ${service}（${po}）${reason ? `（${reason}）` : ''}。请从 Book Fixers & Pros 重新选择其他匹配的专业人士。`,
          date: fmtDateTime(createdAt),
          createdAt,
          dot: 'bg-red-400',
        });
        changed = true;
      }
      if (!changed) return prev;
      try { writeWorkflowStorage('ghis_mock_dyn_req', next); } catch {}
      return next;
    });

    setMockHistory((prev) => {
      let changed = false;
      const map = new Map(prev.map((item: any) => [item.po, item]));
      for (const order of cancelledOrders) {
        const po = extractPo(order);
        if (!po) continue;
        const existing = map.get(po) || {};
        const note = getWorkflowStatusNote(order);
        const reason = note.match(/Reason:\s*([^.]*)/i)?.[1]?.trim() || existing.cancelReason || '';
        const cancelledByCustomer = isCustomerCancellationNote(note) || existing.statusName === 'Cancelled by Customer' || Boolean(existing.cancelReason);
        const projectDetails = pickProjectDetails(
          po,
          order?.projectDetails,
          order?.description,
          existing.projectDetails,
          existing.description,
          existing.desc,
        );
        const location = (() => {
          const fromExisting = getWorkflowDisplayLocation(existing.location, existing.subdistrict);
          if (fromExisting) return fromExisting;
          const fromDesc = String(order?.description || '').match(/\bLOC:([^|]+)/)?.[1]?.trim() || '';
          return getWorkflowDisplayLocation(fromDesc, order?.address?.subdistrict, order?.subdistrict);
        })();
        const budget = existing.budget || existing.fee || (order?.estimatedPrice ? `฿${Number(order.estimatedPrice).toLocaleString()}` : '฿0');
        const nextItem = {
          ...existing,
          po,
          title: String(order?.serviceCategory || order?.service || existing.title || 'Project').replace(/_/g, ' '),
          service: String(order?.serviceCategory || order?.service || existing.service || 'Project').replace(/_/g, ' '),
          customer: existing.customer || subscriber?.name || 'Customer',
          budget,
          fee: existing.fee || budget,
          projectDetails,
          description: projectDetails || order?.description || existing.description || existing.desc || '',
          location,
          subdistrict: location,
          status: 'CANCELLED',
          statusName: cancelledByCustomer ? 'Cancelled by Customer' : 'Partner Unavailable',
          cancelReason: cancelledByCustomer ? reason : existing.cancelReason,
          statusNote: cancelledByCustomer ? `Customer cancelled${reason ? `. Reason: ${reason}` : ''}` : (existing.statusNote || note),
          completedAt: getOrderEventTs(order),
          statusChangedAt: getOrderEventTs(order),
          step: 11,
          stepName: cancelledByCustomer ? 'Cancelled by Customer' : 'Partner Unavailable',
        };
        const prevSerialized = JSON.stringify(existing);
        const nextSerialized = JSON.stringify(nextItem);
        if (prevSerialized !== nextSerialized) changed = true;
        map.set(po, nextItem);
      }
      if (!changed) return prev;
      const next = Array.from(map.values());
      try { writeWorkflowStorage('ghis_mock_history', next); } catch {}
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, mockReady]);


  const backendOrderPos = new Set(workflowOrders.map((o: any) => extractPo(o)).filter((po: string) => isPoCode(po)));
  const backendActiveOrderPos = new Set(
    workflowOrders
      .filter((order: any) => isBackendWorkflowActiveStatus(order))
      .map((order: any) => extractPo(order))
      .filter((po: string) => isPoCode(po)),
  );
  const backendHistoryOrderPos = new Set(
    workflowOrders
      .filter((order: any) => isBackendWorkflowHistoryStatus(order))
      .map((order: any) => extractPo(order))
      .filter((po: string) => isPoCode(po)),
  );
  const fallbackBackendOrderPos = (() => {
    if (backendOrderPos.size > 0) return backendOrderPos;
    if (lastKnownBackendOrderPosRef.current.size > 0) return lastKnownBackendOrderPosRef.current;
    if (typeof window === 'undefined' || !workflowKnownPoStorageKey) return new Set<string>();
    try {
      const parsed = JSON.parse(localStorage.getItem(workflowKnownPoStorageKey) || '[]');
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  })();
  const allowLocalCustomerWorkflow = false;
  const filterCustomerScopedWorkflowItems = (
    items: any[],
    authoritativePoValues: Set<string> = backendOrderPos,
  ) =>
    filterWorkflowItemsByKnownBackendPos(items, {
      allowLocalCustomerWorkflow,
      backendPoValues: authoritativePoValues,
      fallbackBackendPoValues: fallbackBackendOrderPos,
      hasFetchedBackend: hasFetchedOrders,
    });
  const browserTerminalPOs = hasFetchedOrders
    ? new Set<string>()
    : readBrowserTerminalWorkflowPos(
        typeof window !== 'undefined' ? window.localStorage : undefined,
      );
  const rawVisibleMockActiveItems = filterCustomerScopedWorkflowItems(
    filterVisibleWorkflowItems(mockActiveItems, browserTerminalPOs),
    backendActiveOrderPos,
  );
  const localTerminalWorkflowPOs = new Set(
    rawVisibleMockActiveItems
      .filter((item: any) => isBackendWorkflowHistoryStatus(item))
      .map((item: any) => String(item?.po || '').trim())
      .filter((po: string) => isPoCode(po)),
  );
  const visibleMockActiveItems = rawVisibleMockActiveItems.filter(
    (item: any) => !isBackendWorkflowHistoryStatus(item),
  );
  // Backend bridge effects (F4/F6/F7/F9/F10) write into mockDynRequests/mockHistory for all
  // logged-in customers. Only gate the static demo seed data, not bridge-built workflow rows.
  const visibleMockDynRequests = filterCustomerScopedWorkflowItems(
    filterVisibleWorkflowItems(mockDynRequests, browserTerminalPOs),
    backendActiveOrderPos,
  );
  const visibleMockHistory = filterCustomerScopedWorkflowItems(
    mockHistory.filter((x: any) => !isHiddenTestPo(x.po)),
    backendHistoryOrderPos,
  );

  const alertClosedPOs = new Set(
    persistedCustomerAlerts
      .map((alert: any) => String(alert?.po || alert?.msg || alert?.message || '').match(/PO-(?:\d{8}|\d{4}-\d{4,})/i)?.[0] || '')
      .filter((po: string) => po && (
        isClosedCustomerWorkflowPo(po) ||
        persistedCustomerAlerts.some((alert: any) => String(alert?.po || alert?.msg || alert?.message || '').includes(po) && /cancelled|declined|unavailable|ยกเลิก|ปฏิเสธ/i.test(String(alert?.msg || alert?.message || '')))
      )),
  );
  const backendTerminalPOs = new Set(
    workflowOrders
      .filter((order: any) => isBackendWorkflowHistoryStatus(order))
      .map((order: any) => extractPo(order))
      .filter((po: string) => isPoCode(po)),
  );
  const terminalWorkflowPOs = collectTerminalWorkflowPos({
    backendOrders: workflowOrders,
    historyItems: visibleMockHistory,
    alerts: persistedCustomerAlerts,
    terminalPoValues: [...browserTerminalPOs],
  });
  const completedPOs = new Set([
    ...visibleMockHistory.map((x: any) => x.po),
    ...alertClosedPOs,
    ...backendTerminalPOs,
    ...terminalWorkflowPOs,
    ...localTerminalWorkflowPOs,
  ]);
  const customerSideCompletedPropPos = new Set(
    propInquiries
      .filter((p: PropInquiry) => isCustomerSidePropCompleted(p))
      .map((p: PropInquiry) => String(p.poNumber || '').trim())
      .filter((po: string) => isPoCode(po)),
  );
  const backendActiveItems = workflowOrders
    .filter((o: any) => {
      const po = extractPo(o);
      return isBackendWorkflowActiveStatus(o) && !completedPOs.has(po) && !isClosedCustomerWorkflowPo(po);
    })
    .map((o: any) => {
      const status = String(o?.status || '').toUpperCase();
      const po = extractPo(o) || `PO-${String(o?.id || '').slice(0, 8).toUpperCase()}`;
      const tier = String(o?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || "Standard";
      const stepByStatus: Record<string, number> = {
        CREATED: 5,
        MATCHING: 5,
        PENDING: 5,
        CONFIRMED: 6,
        ACCEPTED: 6,
        IN_PROGRESS: 7,
        CHAT_READY: 7,
        MEETING_REQUESTED: 8,
        MEETING_CONFIRMED: 8,
        VARIATION_PENDING: 9,
        COMPLETE_PENDING: 10,
        WORKING: 10,
        COMPLETED: 11,
        RATING_PENDING: 11,
      };
      const step = stepByStatus[status] || 5;
      return {
        id: o.id,
        orderId: o.id,
        po,
        title: (o.serviceCategory || '').replace(/_/g, ' '),
        customer: o.fixer?.user?.name || o.partnerName || 'Partner',
        customerName: o.fixer?.user?.name || o.partnerName || 'Partner',
        fixerAlias: o.fixer?.user?.name || o.partnerName || 'Partner',
        partnerName: o.fixer?.user?.name || o.partnerName || 'Partner',
        date: toDisplayDateTime(o.createdAt),
        createdAt: parseDateMs(o.createdAt),
        budget: o.estimatedPrice ? `฿${Number(o.estimatedPrice).toLocaleString()}` : '฿0',
        location: (() => {
          const lat = Number(o?.address?.latitude);
          const lng = Number(o?.address?.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          }
          const m = String(o.description || '').match(/\bLOC:([^|]+)/);
          return (m ? (m[1] ?? '').trim() : '') || o.address?.subdistrict || o.subdistrict || 'Unknown';
        })(),
        tier,
        actionNeeded: isCustomerFixerActionNeeded(o, step),
        step,
        status: o.status,
        workflowPhase: o.workflowPhase,
        chatEnabled: o.chatEnabled === true,
        description: o.description || '',
      };
    });
  const activeByPo = new Map<string, any>();
  for (const item of backendActiveItems) {
    if (!completedPOs.has(item.po)) {
      activeByPo.set(item.po, item);
    }
  }
  for (const item of visibleMockActiveItems.filter((x: any) => !completedPOs.has(x.po))) {
    const existing = activeByPo.get(item.po);
    if (!existing) {
      activeByPo.set(item.po, item);
      continue;
    }
    // Preserve local-only modal details, but persisted backend fields own lifecycle and display data.
    activeByPo.set(item.po, { ...item, ...existing });
  }
  const combinedActive = Array.from(activeByPo.values())
    .filter((item: any) => {
      const po = String(item?.po || '').trim();
      return !isHiddenTestPo(po) && !isClosedCustomerWorkflowPo(po) && !(po && customerSideCompletedPropPos.has(po));
    })
    .sort((a: any, b: any) => parseDateMs(b.createdAt || b.date) - parseDateMs(a.createdAt || a.date));
  const backendMeetingInviteRequests = workflowOrders
    .filter((order: any) => {
      const po = extractPo(order);
      return po && isPoCode(po) && isCustomerMeetingInviteActionAvailable(order);
    })
    .map((order: any) => {
      const po = extractPo(order);
      const activeItem = combinedActive.find((item: any) => item.po === po);
      const createdAt = parseDateMs(
        order.statusHistory?.[0]?.createdAt ||
        order.statusChangedAt ||
        order.updatedAt ||
        order.createdAt,
      ) || Date.now();
      return {
        id: `meet-invite-${po}`,
        po,
        orderId: order.id,
        title: activeItem?.title || String(order.serviceCategory || order.service || 'Service').replace(/_/g, ' '),
        customer: activeItem?.fixerAlias || activeItem?.partnerName || order.fixerName || order.partnerName || 'Partner',
        budget: activeItem?.budget || (order.estimatedPrice ? `\u0E3F${Number(order.estimatedPrice).toLocaleString()}` : "\u0E3F0"),
        tier: activeItem?.tier || String(order.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || 'Standard',
        desc: 'Please send a meeting invitation to your partner. Fill in the venue and proposed date/time.',
        type: 'meeting_invite',
        authoritative: true,
        date: fmtDateTime(createdAt),
        createdAt,
        step: 8,
        location: activeItem?.location || activeItem?.subdistrict || '',
      };
    });
  const dedupedRequestMap = new Map<string, any>();
  for (const requestItem of [...visibleMockDynRequests, ...backendMeetingInviteRequests].filter(
    (m: any) => !mockPayments[m.id] && !['notice', 'meeting_scheduled', 'chat_ready', 'meeting_pending_partner'].includes(String(m.type || '')),
  )) {
    const requestType = String(requestItem.type || '');
    const dedupeKey = requestItem.po && ['chat_ready', 'meeting_invite'].includes(requestType)
      ? `${requestItem.po}:${requestType === 'chat_ready' ? 'chat' : 'meeting'}`
      : requestItem.po || requestItem.id;
    const existing = dedupedRequestMap.get(dedupeKey);
    if (!existing) {
      dedupedRequestMap.set(dedupeKey, requestItem);
      continue;
    }
    const existingStep = Number(existing.step || 0);
    const nextStep = Number(requestItem.step || 0);
    const existingTs = parseDateMs(existing.createdAt || existing.date);
    const nextTs = parseDateMs(requestItem.createdAt || requestItem.date);
    if (
      nextStep > existingStep ||
      (nextStep === existingStep && (requestItem.authoritative || nextTs >= existingTs))
    ) {
      dedupedRequestMap.set(dedupeKey, requestItem);
    }
  }
  const allRequestItems = Array.from(dedupedRequestMap.values())
    .filter((item: any) => {
      const po = String(item?.po || '').trim();
      return !(po && (customerSideCompletedPropPos.has(po) || completedPOs.has(po) || isClosedCustomerWorkflowPo(po)));
    })
    .sort((a: any, b: any) => parseDateMs(b.createdAt || b.date) - parseDateMs(a.createdAt || a.date));

  // Inject prop inquiry request cards (not ghis-gated)
  const propRequestItems: any[] = propInquiries
    .filter((p: PropInquiry) => {
      const status = String(p.status || '').toUpperCase();
      return (
        status === 'ACCEPTED' ||
        status === 'PAID' ||
        canShowCustomerPropRateRequest(p)
      );
    })
    .map((p: PropInquiry) => {
      const status = String(p.status || '').toUpperCase();
      if (status === "ACCEPTED") return { id: `prop-pay-${p.poNumber}`, type: "prop_pay_fee", po: p.poNumber, propInquiry: p, createdAt: p.updatedAt };
      if (status === "PAID") return { id: `prop-meet-${p.poNumber}`, type: "prop_meeting_invite", po: p.poNumber, propInquiry: p, createdAt: p.updatedAt };
      if (canShowCustomerPropRateRequest(p)) return { id: `prop-rate-${p.poNumber}`, type: "prop_rate", po: p.poNumber, propInquiry: p, createdAt: p.updatedAt };
      return null;
    })
    .filter(Boolean) as any[];
  const propActiveItems: any[] = propInquiries
    .filter((p: PropInquiry) => {
      if (isCustomerSidePropCompleted(p)) return false;
      const status = String(p.status || "").toUpperCase();
      if (!["NOTIFY_SENT", "ACCEPTED", "PAID", "MEETING_SENT", "MEETING_CONFIRMED"].includes(status)) return false;
      if (status === 'NOTIFY_SENT' && isStaleCustomerNotifyPropPo(p.poNumber)) return false;
      return true;
    })
    .map((p: PropInquiry) => {
      const status = String(p.status || "").toUpperCase();
      const siteLocation = getPropSiteLocation(p);
      const cardTs = Number(p.updatedAt || p.createdAt || Date.now());
      const step = getPropInquiryDisplayStep(status, p.step);
      const pendingCustomerRating = canShowCustomerPropRateRequest(p);
      const actionNeeded =
        status === 'ACCEPTED' ||
        status === 'PAID' ||
        status === 'MEETING_SENT' ||
        pendingCustomerRating;
      const actionNeededDetail =
        status === 'ACCEPTED'
          ? 'Pay processing fee to proceed to chat and meeting flow.'
          : status === 'PAID'
          ? 'Send site meeting invitation to the lister.'
          : pendingCustomerRating
          ? 'Submit rating to close step 8.'
          : status === 'NOTIFY_SENT'
          ? 'Waiting for lister acceptance.'
          : status === 'MEETING_SENT'
          ? 'Waiting for lister to confirm your meeting invitation.'
          : '';

      return {
        id: `prop-active-${p.poNumber}`,
        type: status === 'NOTIFY_SENT' ? 'prop_waiting' : 'prop_active',
        po: p.poNumber,
        title: p.propertyTitle,
        service: p.propertyTitle,
        fixerAlias: firstNameOnly(p.listerName, 'Lister'),
        partnerName: firstNameOnly(p.listerName, 'Lister'),
        location: siteLocation,
        subdistrict: p.subdistrict || p.district || p.province,
        budget: toCurrencyLabel(p.propertyPrice),
        value: toCurrencyLabel(p.propertyPrice),
        fee: toCurrencyLabel(p.propertyFee),
        tier: p.propertyTier || 'Standard',
        listingType: p.listingType || '',
        step,
        actionNeeded,
        actionNeededDetail,
        status,
        date: toDisplayDateTime(cardTs),
        createdAt: cardTs,
        propInquiry: p,
      };
    });
  const combinedActiveWithProp = Array.from(
    [...combinedActive, ...propActiveItems].reduce((map: Map<string, any>, item: any) => {
      const key = String(item?.po || item?.id || '').trim();
      if (!key) return map;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        return map;
      }

      const existingIsProperty = String(existing?.type || '').startsWith('prop_') || isPropPoCode(existing?.po || existing?.id || '');
      const nextIsProperty = String(item?.type || '').startsWith('prop_') || isPropPoCode(item?.po || item?.id || '');
      const keyIsPropertyPo = isPropPoCode(key);

      if (keyIsPropertyPo && nextIsProperty && !existingIsProperty) {
        map.set(key, item);
        return map;
      }
      if (keyIsPropertyPo && existingIsProperty && !nextIsProperty) {
        return map;
      }

      const existingStep = Number(existing?.step || 0);
      const nextStep = Number(item?.step || 0);
      const existingTs = parseDateMs(existing?.createdAt || existing?.date);
      const nextTs = parseDateMs(item?.createdAt || item?.date);

      if (nextStep > existingStep || (nextStep === existingStep && nextTs >= existingTs)) {
        map.set(key, { ...existing, ...item });
      }

      return map;
    }, new Map<string, any>()).values(),
  ).sort((a: any, b: any) => parseDateMs(b.createdAt || b.date) - parseDateMs(a.createdAt || a.date));

  const propRateRequestPos = new Set(
    propRequestItems
      .filter((item: any) => item?.type === 'prop_rate' && item?.po)
      .map((item: any) => String(item.po)),
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
  const derivePropWorkflowStep = (item: any) => {
    const numericCandidates = [
      item?.step,
      item?.mockStep,
      item?.propInquiry?.step,
      item?.stepText,
      item?.stepName,
      item?.title,
      item?.desc,
      item?.description,
    ].map(parseWorkflowStep);
    const inferred = Math.max(0, ...numericCandidates);
    const looksLikeRateAction = /\brate\b/i.test(
      `${item?.type || ''} ${item?.title || ''} ${item?.desc || ''} ${item?.description || ''}`,
    );
    return Math.max(inferred, looksLikeRateAction ? 8 : 0);
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
  const toNumericValue = (value: any) => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const propFallbackRateRequestItems: any[] = combinedActiveWithProp
    .filter((item: any) => {
      const po = String(item?.po || '').trim();
      if (!po || !isPropPoCode(po)) return false;
      if (propRateRequestPos.has(po)) return false;
      const step = derivePropWorkflowStep(item);
      return step >= 8;
    })
    .map((item: any) => {
      const po = String(item?.po || '').trim();
      if (!po) return null;
      const source = item?.propInquiry || {};
      const resolvedStep = derivePropWorkflowStep(item) || 8;
      const resolvedStatus = normalizePropInquiryStatus(
        source.status || item?.status,
        resolvedStep,
      );
      const ts = parseDateMs(
        source.updatedAt || source.createdAt || item?.createdAt || item?.date || Date.now(),
      );
      const fallbackInquiry: PropInquiry = {
        id: String(source.id || `fallback-${po}`),
        poNumber: po,
        propertyId: String(source.propertyId || item?.orderId || po),
        propertyTitle: String(source.propertyTitle || item?.title || item?.service || po),
        propertyTier: String(source.propertyTier || item?.tier || 'STANDARD'),
        propertyFee: Number(source.propertyFee ?? toNumericValue(item?.fee)),
        propertyType: String(source.propertyType || ''),
        listingType: String(source.listingType || ''),
        propertyPrice: Number(
          source.propertyPrice ??
            toNumericValue(item?.value ?? item?.budget ?? item?.price),
        ),
        province: String(source.province || ''),
        district: String(source.district || ''),
        subdistrict: String(source.subdistrict || item?.subdistrict || ''),
        addressLine: String(source.addressLine || item?.location || ''),
        latitude: source.latitude ?? null,
        longitude: source.longitude ?? null,
        area: source.area ?? null,
        bedrooms: source.bedrooms ?? null,
        bathrooms: source.bathrooms ?? null,
        propertyImages: Array.isArray(source.propertyImages) ? source.propertyImages : [],
        customerEmail: String(source.customerEmail || subscriber?.email || ''),
        customerName: String(source.customerName || subscriber?.name || 'Customer'),
        listerName: String(source.listerName || item?.fixerAlias || item?.partnerName || 'Lister'),
        status: resolvedStatus,
        step: resolvedStep,
        createdAt: ts,
        updatedAt: ts,
        meetingDate: source.meetingDate,
        meetingTime: source.meetingTime,
        meetingVenue: source.meetingVenue,
        customerRating: source.customerRating ?? null,
        customerComment: source.customerComment ?? '',
        listerRating: source.listerRating ?? null,
        listerComment: source.listerComment ?? '',
        reselectedOnce: source.reselectedOnce ?? false,
      };
      if (!canShowCustomerPropRateRequest(fallbackInquiry)) return null;
      return {
        id: `prop-rate-fallback-${po}`,
        type: 'prop_rate',
        po,
        propInquiry: fallbackInquiry,
        createdAt: ts,
      };
    })
    .filter(Boolean) as any[];

  const allRequestItemsWithProp = Array.from(
    [...allRequestItems, ...propRequestItems, ...propFallbackRateRequestItems].reduce((map: Map<string, any>, item: any) => {
      const key = String(item?.po || item?.id || '').trim();
      if (!key) return map;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        return map;
      }

      const existingIsProperty = String(existing?.type || '').startsWith('prop_') || isPropPoCode(existing?.po || existing?.id || '');
      const nextIsProperty = String(item?.type || '').startsWith('prop_') || isPropPoCode(item?.po || item?.id || '');
      const keyIsPropertyPo = isPropPoCode(key);

      if (keyIsPropertyPo && nextIsProperty && !existingIsProperty) {
        map.set(key, item);
        return map;
      }
      if (keyIsPropertyPo && existingIsProperty && !nextIsProperty) {
        return map;
      }

      const existingStep = Number(existing?.step || 0);
      const nextStep = Number(item?.step || 0);
      const existingTs = parseDateMs(existing?.createdAt || existing?.date);
      const nextTs = parseDateMs(item?.createdAt || item?.date);

      if (nextStep > existingStep || (nextStep === existingStep && nextTs >= existingTs)) {
        map.set(key, { ...existing, ...item });
      }

      return map;
    }, new Map<string, any>()).values(),
  ).sort((a: any, b: any) => parseDateMs(b.createdAt || b.date) - parseDateMs(a.createdAt || a.date));

  const actionableRequestPos = new Set(
    allRequestItems
      .filter((requestItem: any) => !['notice', 'meeting_scheduled'].includes(String(requestItem.type || '')))
      .map((requestItem: any) => requestItem.po),
  );
  const overviewRequestItems = allRequestItemsWithProp.slice(0, 3);
  const propConfirmedMeetings = propInquiries
    .filter((p: PropInquiry) => p.status === "MEETING_CONFIRMED" && p.meetingDate)
    .filter((p: PropInquiry) => {
      const ts = parseDateMs(`${p.meetingDate}T${p.meetingTime || '00:00'}`);
      return ts >= Date.now();
    });
  const pendingMeetingPos = new Set(
    visibleMockDynRequests
      .filter((x: any) => x.type === "meeting_pending_partner")
      .map((x: any) => String(x.po || "").trim())
      .filter(Boolean),
  );
  const confirmedMeetingAlertPos = new Set(
    [
      ...chatFeed
        .filter((chatItem: any) => /partner confirmed site meeting|meeting confirmed by partner/i.test(String(chatItem?.lastMsg || '')))
        .map((chatItem: any) => String(chatItem?.po || '').trim()),
      ...persistedCustomerAlerts
        .filter((alert: any) => /meeting confirmed|confirmed.*site meeting|ยืนยัน|确认/i.test(String(alert?.msg || alert?.message || '')))
        .map((alert: any) => String(alert?.po || alert?.msg || alert?.message || '').match(/PO-(?:\d{8}|\d{4}-\d{4,})/i)?.[0] || ''),
      ...visibleMockDynRequests
        .filter((requestItem: any) => Boolean(requestItem?.confirmedByPartner) || /meeting-confirmed/i.test(String(requestItem?.id || '')))
        .map((requestItem: any) => String(requestItem?.po || '').trim()),
    ].filter((po: string) => isValidPoCode(po)),
  );
  const isConfirmedMeetingScheduled = (item: any) => {
    const po = String(item?.po || '').trim();
    return Boolean(item?.confirmedByPartner) || confirmedMeetingAlertPos.has(po);
  };
  const upcomingMeetings = visibleMockDynRequests
    .filter((x: any) => x.type === "meeting_scheduled")
    .filter((x: any) => !pendingMeetingPos.has(String(x.po || "").trim()))
    .filter((x: any) => isConfirmedMeetingScheduled(x))
    .filter((x: any) => isWorkflowMeetingVisible(x.meetingDate, x.meetingTime, x.createdAt || x.date))
    .sort((a: any, b: any) => {
      const aTs = parseWorkflowMeetingDateTimeMs(a.meetingDate, a.meetingTime, a.createdAt || a.date);
      const bTs = parseWorkflowMeetingDateTimeMs(b.meetingDate, b.meetingTime, b.createdAt || b.date);
      return aTs - bTs;
    });
  const workflowOrderByPo = new Map(
    workflowOrders
      .map((order: any) => [extractPo(order), order])
      .filter(([po]) => po && isPoCode(String(po))) as [string, any][],
  );
  const getWorkflowOrderEventTs = (po: string, fallback: any) => {
    const order = workflowOrderByPo.get(po);
    return parseDateMs(
      order?.statusHistory?.[0]?.createdAt ||
      order?.statusChangedAt ||
      order?.updatedAt ||
      fallback,
    );
  };
  const workflowAlerts = visibleMockDynRequests
    .filter((x: any) => {
      const po = String(x.po || "").trim();
      if (x.type !== "meeting_scheduled") return true;
      if (pendingMeetingPos.has(po)) return false;
      return isConfirmedMeetingScheduled(x);
    })
    .map((x: any) => {
      const po = String(x.po || "").trim();
      const rawCreatedAt = x.createdAt || parseDateMs(x.date);
      const createdAt = x.type === "payment_pending" && po
        ? getWorkflowOrderEventTs(po, rawCreatedAt)
        : rawCreatedAt;
      const stableTime = toDisplayDateTime(createdAt) || x.date || "";
      if (x.type === "notice") return { id: `a-${x.id}`, msg: x.msg || x.desc || "Workflow updated.", msgTh: x.msgTh || x.descTh || "อัปเดตขั้นตอนการทำงาน", msgZh: x.msgZh || x.descZh || "工作流程已更新。", time: stableTime, createdAt, dot: "bg-indigo-400" };
      if (x.type === "payment_pending") return { id: `a-${x.id}`, msg: `${x.po || "Order"}: Partner accepted your enquiry. Next: click Testing period - Free Pass in Requests to activate chat and continue.`, msgTh: `${x.po || "ออเดอร์"}: พาร์ทเนอร์ยอมรับคำขอแล้ว ขั้นตอนถัดไปคือกด Testing period - Free Pass ในหน้า Requests เพื่อเปิดแชทและไปต่อ`, msgZh: `${x.po || "订单"}: 合作伙伴已接受您的询价。下一步：在 Requests 中点击 Testing period - Free Pass 以启用聊天并继续。`, time: stableTime, createdAt, dot: "bg-blue-500" };
      if (x.type === "chat_ready") return { id: `a-${x.id}`, msg: `${x.po || "Order"}: Chat room is active. Next: send your site meeting invitation when you are ready.`, msgTh: `${x.po || "ออเดอร์"}: ห้องแชทพร้อมใช้งานแล้ว ขั้นตอนถัดไปคือส่งคำเชิญนัดหมายหน้างานเมื่อพร้อม`, msgZh: `${x.po || "订单"}: 聊天室已开启。下一步：准备好后发送现场会议邀请。`, time: stableTime, createdAt, dot: "bg-sky-500" };
      if (x.type === "meeting_pending_partner") {
        const meetingWhen = formatWorkflowMeetingLabel(x.meetingDate, x.meetingTime, x.createdAt);
        return { id: `a-${x.id}`, msg: `${x.po || "Order"}: Waiting for site meeting confirmation${meetingWhen ? ` for ${meetingWhen}` : ""}. Next: partner will confirm the proposed date and venue.`, msgTh: `${x.po || "ออเดอร์"}: รอการยืนยันนัดหมายหน้างาน${meetingWhen ? ` วันที่ ${meetingWhen}` : ""} ขั้นตอนถัดไปคือรอพาร์ทเนอร์ยืนยันวันเวลาและสถานที่`, msgZh: `${x.po || "订单"}: 等待现场确认现场会议${meetingWhen ? `（${meetingWhen}）` : ""}。下一步：等待合作伙伴确认日期和地点。`, time: stableTime, createdAt, dot: "bg-amber-500" };
      }
      if (x.type === "meeting_scheduled") {
        return buildMeetingConfirmedAlert({
          id: `a-${x.id}`,
          po: x.po || "Order",
          audience: "customer",
          createdAt,
          time: stableTime,
          customerEmail: x.customerEmail || subscriberEmail,
          customerName: x.customerName || x.customer || subscriber?.name || "Customer",
        });
      }
      if (x.type === "variation_pending") return { id: `a-${x.id}`, msg: `${x.po || "Order"}: Partner submitted a variation request. Next: review the revised scope and approve it to continue.`, msgTh: `${x.po || "ออเดอร์"}: พาร์ทเนอร์ส่งคำขอ variation แล้ว ขั้นตอนถัดไปคือพิจารณาขอบเขตงาน/ราคาใหม่และอนุมัติเพื่อดำเนินการต่อ`, msgZh: `${x.po || "订单"}: 合作伙伴已提交变更申请。下一步：查看调整后的范围并批准以继续。`, time: stableTime, createdAt, dot: "bg-purple-500" };
      if (x.type === "complete_pending") return { id: `a-${x.id}`, msg: `${x.po || "Order"}: Partner submitted the project-complete request. Next: review the completion note and confirm if the work is finished.`, msgTh: `${x.po || "ออเดอร์"}: พาร์ทเนอร์ส่งคำของานเสร็จแล้ว ขั้นตอนถัดไปคืออ่านบันทึกสรุปและยืนยันเมื่อโครงการเสร็จจริง`, msgZh: `${x.po || "订单"}: 合作伙伴已提交完工申请。下一步：查看完工说明，并在工作确实完成后确认。`, time: stableTime, createdAt, dot: "bg-green-500" };
      if (x.type === "rate_pending") return { id: `a-${x.id}`, msg: `${x.po || "Order"}: Project complete confirmed. Next: rate your partner to close this job and move it to history.`, msgTh: `${x.po || "ออเดอร์"}: ยืนยันงานเสร็จแล้ว ขั้นตอนถัดไปคือให้คะแนนพาร์ทเนอร์เพื่อปิดงานและย้ายไปประวัติ`, msgZh: `${x.po || "订单"}: 已确认完工。下一步：评价您的合作伙伴以关闭此工作并移入历史。`, time: stableTime, createdAt, dot: "bg-yellow-500" };
      return null;
    })
    .filter(Boolean) as any[];
  const propWorkflowAlerts = propInquiries
    .map((p: PropInquiry) => {
      const createdAt = Number(p.updatedAt || p.createdAt || Date.now());
      const time = toDisplayDateTime(createdAt);
      if (p.status === "ACCEPTED") {
        return {
          id: `prop-alert-accepted-${p.poNumber}`,
          msg: `Lister accepted ${p.propertyTitle}. Proceed with Testing period - Free Pass.`,
          msgTh: `ผู้ลงประกาศยืนยัน ${p.propertyTitle} แล้ว กรุณาดำเนินการ Testing period - Free Pass`,
          msgZh: `房源方已接受 ${p.propertyTitle}。请继续 Testing period - Free Pass。`,
          time,
          createdAt,
          dot: "bg-emerald-500",
        };
      }
      if (p.status === "PAID") {
        return {
          id: `prop-alert-paid-${p.poNumber}`,
          msg: `Chat is active for ${p.propertyTitle}. Send meeting invitation when ready.`,
          msgTh: `แชทของ ${p.propertyTitle} เปิดใช้งานแล้ว กรุณาส่งคำเชิญนัดหมายเมื่อพร้อม`,
          msgZh: `${p.propertyTitle} 的聊天已激活。准备好后请发送会议邀请。`,
          time,
          createdAt,
          dot: "bg-sky-500",
        };
      }
      if (p.status === "MEETING_SENT") {
        return {
          id: `prop-alert-meeting-sent-${p.poNumber}`,
          msg: `Meeting invitation sent for ${p.propertyTitle}. Waiting for lister confirmation.`,
          msgTh: `ส่งคำเชิญนัดหมายของ ${p.propertyTitle} แล้ว กำลังรอผู้ลงประกาศยืนยัน`,
          msgZh: `${p.propertyTitle} 的会议邀请已发送，正在等待房源方确认。`,
          time,
          createdAt,
          dot: "bg-amber-500",
        };
      }
      if (canShowCustomerPropRateRequest(p)) {
        return {
          id: `prop-alert-rate-${p.poNumber}`,
          msg: `Meeting confirmed for ${p.propertyTitle}. Please rate to finish step 8.`,
          msgTh: `นัดหมายของ ${p.propertyTitle} ยืนยันแล้ว กรุณาให้คะแนนเพื่อจบขั้นตอนที่ 8`,
          msgZh: `${p.propertyTitle} 的会议已确认。请评分以完成第8步。`,
          time,
          createdAt,
          dot: "bg-yellow-500",
        };
      }
      if (String(p.status || '').toUpperCase() === "MEETING_CONFIRMED" && !hasPendingCustomerPropRating(p) && hasPendingListerPropRating(p)) {
        return {
          id: `prop-alert-wait-lister-rate-${p.poNumber}`,
          msg: `You rated ${p.propertyTitle}. Waiting for lister rating to close this inquiry.`,
          msgTh: `คุณให้คะแนน ${p.propertyTitle} แล้ว กำลังรอผู้ลงประกาศให้คะแนนเพื่อปิดงาน`,
          msgZh: `您已为 ${p.propertyTitle} 评分。正在等待房源方评分后结案。`,
          time,
          createdAt,
          dot: "bg-indigo-400",
        };
      }
      return null;
    })
    .filter(Boolean) as any[];
  const workflowOrderStatusAlerts = workflowOrders.flatMap((order: any) => {
    const po = extractPo(order);
    if (!po || !isPoCode(po)) return [];
    const status = String(order?.status || "").toUpperCase();
    const service = String(order?.serviceCategory || order?.service || "your enquiry").replace(/_/g, " ");
    const createdAt = parseDateMs(order.statusHistory?.[0]?.createdAt || order.statusChangedAt || order.updatedAt || order.createdAt || Date.now());
    const time = toDisplayDateTime(createdAt);
    if (['ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED', 'ACCEPTED'].includes(status)) {
      return [{
        id: `a-pay-${po}`,
        msg: `${po}: Partner accepted your enquiry. Next: click Testing period - Free Pass in Requests to activate chat and continue.`,
        msgTh: `${po}: พาร์ทเนอร์ยอมรับคำขอแล้ว ขั้นตอนถัดไปคือกด Testing period - Free Pass ในหน้า Requests เพื่อเปิดแชทและไปต่อ`,
        msgZh: `${po}: 合作伙伴已接受您的询价。下一步：在 Requests 中点击 Testing period - Free Pass 以启用聊天并继续。`,
        time,
        createdAt,
        dot: "bg-blue-500",
      }];
    }
    if (status === 'IN_PROGRESS' || status === 'MEETING_REQUESTED') {
      const meetingAwaitingPartnerAlert = buildCustomerMeetingAwaitingPartnerAlert(order);
      if (meetingAwaitingPartnerAlert) {
        return [{
          ...meetingAwaitingPartnerAlert,
          time: toDisplayDateTime(meetingAwaitingPartnerAlert.createdAt),
        }];
      }
      const note = getWorkflowStatusNote(order);
      const variationDesc = extractWorkflowVariationRequest(note);
      if (variationDesc && !isWorkflowPastVariation({ backendOrder: order, po, storage: typeof window !== 'undefined' ? localStorage : undefined })) {
        return [{
          id: `a-var-${po}`,
          msg: `${po}: Partner submitted a variation request. Next: review the revised scope and approve it in Requests.`,
          msgTh: `${po}: พาร์ทเนอร์ส่งคำขอ variation แล้ว ขั้นตอนถัดไปคือพิจารณาขอบเขตงาน/ราคาใหม่และอนุมัติใน Requests`,
          msgZh: `${po}: 合作伙伴已提交变更申请。下一步：在 Requests 中查看调整后的范围并批准。`,
          time,
          createdAt,
          dot: "bg-purple-500",
        }];
      }
      const completeDesc = extractWorkflowCompleteRequest(note);
      if (completeDesc && !isTerminalWorkflowStatus(status)) {
        return [{
          id: `a-compl-${po}`,
          msg: `${po}: Partner submitted the project-complete request. Next: review and confirm completion in Requests.`,
          msgTh: `${po}: พาร์ทเนอร์ส่งคำของานเสร็จแล้ว ขั้นตอนถัดไปคืออ่านบันทึกสรุปและยืนยันใน Requests`,
          msgZh: `${po}: 合作伙伴已提交完工申请。下一步：在 Requests 中查看并确认完工。`,
          time,
          createdAt,
          dot: "bg-green-500",
        }];
      }
      if (isCustomerMeetingInviteActionAvailable(order)) {
        return [{
          id: `a-chat-${po}`,
          msg: `${po}: Chat room is active. Next: send your site meeting invitation when you are ready.`,
          msgTh: `${po}: Chat room is active. Next: send your site meeting invitation when you are ready.`,
          msgZh: `${po}: Chat room is active. Next: send your site meeting invitation when you are ready.`,
          time,
          createdAt,
          dot: "bg-sky-500",
        }];
      }
    }
    if (status === 'CANCELLED') {
      const note = getWorkflowStatusNote(order);
      const reason = note.match(/Reason:\s*([^.]*)/i)?.[1]?.trim();
      const cancelledByCustomer = isCustomerCancellationNote(note);
      if (cancelledByCustomer) {
        const msg = `${po}: You cancelled ${service}${reason ? ` (${reason})` : ""}. This job has been moved to History.`;
        return [{
          id: `a-customer-cancelled-${po}`,
          msg,
          msgTh: msg,
          msgZh: msg,
          time,
          createdAt,
          dot: "bg-red-500",
        }];
      }
      return [{
        id: `a-declined-${po}`,
        msg: `${po}: The selected partner declined ${service}${reason ? ` (${reason})` : ""}. Next: choose another matched professional or create a new enquiry.`,
        msgTh: `${po}: พาร์ทเนอร์ที่เลือกปฏิเสธ ${service}${reason ? ` (${reason})` : ""} ขั้นตอนถัดไปคือเลือกมืออาชีพรายอื่นหรือสร้างคำขอใหม่`,
        msgZh: `${po}: 所选合作伙伴已拒绝 ${service}${reason ? `（${reason}）` : ""}。下一步：请选择其他匹配的专业人士或创建新询价。`,
        time,
        createdAt,
        dot: "bg-red-500",
      }];
    }
    return [];
  });
  const baseAlerts: any[] = [];
  const generatedAlerts = Array.from(
    [...workflowAlerts, ...workflowOrderStatusAlerts, ...propWorkflowAlerts, ...baseAlerts]
      .reduce((map: Map<string, any>, alert: any) => {
        const key = String(alert?.id || `${alert?.msg}-${alert?.createdAt}`).trim();
        if (!key) return map;
        const existing = map.get(key);
        if (!existing || parseDateMs(alert.createdAt || alert.time) >= parseDateMs(existing.createdAt || existing.time)) {
          map.set(key, alert);
        }
        return map;
      }, new Map<string, any>())
      .values(),
  ).sort((a: any, b: any) => parseDateMs(b.createdAt || b.time) - parseDateMs(a.createdAt || a.time));
  const generatedAlertSignature = generatedAlerts
    .map((alert: any) => `${alert.id}:${parseDateMs(alert.createdAt || alert.time)}`)
    .join('|');
  useEffect(() => {
    if (generatedAlerts.length === 0) return;
    setPersistedCustomerAlerts((prev) => {
      const merged = mergeAuthoritativeWorkflowAlerts([...prev, ...generatedAlerts])
        .map((alert: any) => ({ ...alert, time: alert.time || fmtDateTime(Number(alert.createdAt)) }))
        .slice(0, 20);
      try { writeWorkflowStorage(customerAlertsStorageKey, merged); } catch {}
      return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedAlertSignature, customerAlertsStorageKey]);
  const allAlerts = mergeAuthoritativeWorkflowAlerts([...persistedCustomerAlerts, ...generatedAlerts])
    .map((alert: any) => ({ ...alert, time: alert.time || fmtDateTime(Number(alert.createdAt)) }));
  const alertsPageItems = allAlerts.slice(0, 20);
  const overviewAlerts = allAlerts.slice(0, 3);
  const overviewIncomingChats = chatFeed.filter((c: any) => c.hasIncoming).slice(0, 3);

  const FIXER_ACTIVE_STEPS = ["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"];
  const PROPERTY_ACTIVE_STEPS = ["Match", "Select", "Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Rate"];

  const ProgressSteps = ({
    currentStep,
    steps,
    startStep,
    showCurrent = true,
  }: {
    currentStep: number;
    steps: string[];
    startStep: number;
    showCurrent?: boolean;
  }) => (
    <div className="w-2/3 mt-4 overflow-x-auto pb-4 hide-scrollbar">
      <div className="flex items-center min-w-max relative px-2">
        <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
        <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - startStep) / (steps.length - 1)) * 100))}%` }}></div>
        
        {steps.map((s, i) => {
          const stepNum = i + startStep;
          const isCompleted = stepNum < currentStep;
          const isCurrent = showCurrent && stepNum === currentStep;
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
      </div>
    </div>
  );

  
  const renderRequestCard = (item: any) => {
    if (['prop_waiting', 'prop_declined', 'prop_pay_fee', 'prop_meeting_invite', 'prop_rate'].includes(item.type)) return renderPropRequestCard(item);
    if (mockPayments[item.id]) return null;
    if (item.type === 'notice') return null;
    if (item.type === 'chat_ready') {
      return (
        <div key={item.id} className="bg-white border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">💬</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 7 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">Chat room is now active. Connect with your partner via the Chat page.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-sky-50 text-sky-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-sky-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                router.push(`${prefix}/chat/${item.po}`);
              }}>Open Chat</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'meeting_invite') {
      return (
        <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg"></div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 8 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">Please send a meeting invitation to your partner with venue, date and time.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-amber-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMeetingModal(item);
                setMeetingVenue(getWorkflowDisplayLocation(item.location, item.subdistrict, item.meetingVenue, item.venue) || 'Saphansong');
                setMeetingDate("");
                setMeetingTime("");
              }}>Send Meeting Invitation</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'meeting_pending_partner') {
      return (
        <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-amber-200 border-dashed rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg animate-pulse">⏳</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 8 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">Waiting for partner to confirm meeting time...</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button disabled className="bg-gray-300 text-gray-500 px-5 py-2 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap cursor-not-allowed">Pending Partner</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'meeting_scheduled') {
      return (
        <div key={item.id} className="bg-white border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">📅</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 8 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-teal-50 text-teal-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-teal-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMockActiveItems(prev => {
                  const activeSnapshot = {
                    ...(prev.find((x: any) => x.po === item.po) || item),
                    step: 9,
                    mockStep: 9,
                    actionNeeded: true,
                    meetingDate: item.meetingDate || '',
                    meetingTime: item.meetingTime || '',
                    meetingVenue: item.meetingVenue || item.venue || '',
                    venue: item.venue || item.meetingVenue || '',
                  };
                  const next = [...prev.filter((x: any) => x.po !== item.po), activeSnapshot];
                  try { writeWorkflowStorage('ghis_mock_active', next); } catch {}
                  return next;
                });
                const varId = `variation-${item.po}`;
                const createdAt = Date.now();
                setMockDynRequests(prev => {
                  // Don't overwrite an existing variation_pending from partner (which has the actual note)
                  if (prev.some((x: any) => x.po === item.po && x.type === 'variation_pending' && x.id !== varId)) {
                    return prev.filter((x: any) => x.id !== item.id);
                  }
                  const f = prev.filter((x: any) => x.id !== item.id && x.id !== varId); return [...f, { id: varId, po: item.po, title: item.title, customer: item.customer, date: fmtDateTime(createdAt), createdAt, budget: item.budget, tier: item.tier, desc: 'Your partner has submitted a variation for your approval. Please review and confirm to proceed.', type: 'variation_pending', step: 9, meetingDate: item.meetingDate || '', meetingTime: item.meetingTime || '', meetingVenue: item.meetingVenue || item.venue || '', venue: item.venue || item.meetingVenue || '' }]; });
                setActiveTab("requests");
              }}>Meeting Complete ✓</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'variation_pending') {
      return (
        <div key={item.id} className="bg-white border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">V</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · {getWorkflowStepBadgeLabel(9, 11, getWorkflowStepNameForLocale(9, locale), locale)}</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "พาร์ทเนอร์ส่งคำขอเปลี่ยนแปลงงาน กรุณาตรวจสอบและยืนยันเพื่อดำเนินการต่อ" : locale === "zh" ? "合作伙伴已提交变更请求，请查看并确认是否继续。" : item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-purple-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setVariationApproveModal(item);
              }}>{locale === "th" ? "อนุมัติการเปลี่ยนแปลง" : locale === "zh" ? "批准变更" : "Approve Variation"}</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'complete_pending') {
      return (
        <div key={item.id} className="bg-white border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg">✓</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · {getWorkflowStepBadgeLabel(10, 11, getWorkflowStepNameForLocale(10, locale), locale)}</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "พาร์ทเนอร์ส่งคำขอยืนยันงานเสร็จ กรุณาตรวจสอบและยืนยันเมื่องานเสร็จจริง" : locale === "zh" ? "合作伙伴已发送完成请求，请在确认工作完成后批准。" : item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-green-50 text-green-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-green-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setCompleteApproveModal(item);
              }}>{locale === "th" ? "ยืนยันงานเสร็จ" : locale === "zh" ? "确认完成" : "Confirm Complete"}</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'rate_pending') {
      return (
        <div key={item.id} className="bg-white border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold text-lg">⭐</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · {getWorkflowStepBadgeLabel(11, 11, getWorkflowStepNameForLocale(11, locale), locale)}</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-yellow-50 text-yellow-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-yellow-500 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600 transition shadow-sm whitespace-nowrap" onClick={() => {
                setRateStars(5);
                setRateModal(item);
              }}>{locale === "th" ? "ให้คะแนนและปิดงาน" : locale === "zh" ? "评分并关闭" : "Rate & Close"} ⭐</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'payment_pending') {
      return (
        <div key={item.id} className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">💳</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title || item.po} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 6 of 11 · Fee &amp; Proceed</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc || (locale === "th" ? "พาร์ทเนอร์ยอมรับออเดอร์แล้ว กรุณาชำระค่าธรรมเนียมและดำเนินการต่อ" : locale === "zh" ? "合作伙伴已接受订单，请支付处理费用以继续。" : "Partner accepted your Order. Please pay the processing fee to proceed.")}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-sky-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm whitespace-nowrap" onClick={() => setWaitModalOrder({ id: item.id, status: 'MATCHING', request: item })}>
                {locale === "th" ? "Testing period - Free Pass" : locale === "zh" ? "Testing period - Free Pass" : "Testing period - Free Pass"}
              </button>
            </div>
          </div>
        </div>
      );
    }
      return (
      <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">{(item.title || "R").charAt(0)}</div>
           <div>
             <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po}{item.step ? ` · Step ${item.step} of 11` : ''}</span></h3>
             <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
             <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
          <div className="text-left sm:text-right flex flex-col gap-1">
             <span className="font-bold text-gray-900 pr-2">{locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:"} {item.budget}</span>
             <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
          </div>
          <div className="flex gap-2">
            <button className="bg-sky-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm whitespace-nowrap" onClick={() => setWaitModalOrder({ id: item.id, status: 'MATCHING', request: item })}>Pay Fee & Proceed</button>
            <button className="border border-gray-300 text-gray-600 px-5 py-2 outline-none rounded-lg text-sm font-bold hover:bg-gray-100 transition shadow-sm w-full md:w-auto">Decline</button>
          </div>
        </div>
      </div>
    );
  };

  const updatePropInquiry = async (
    id: string | null | undefined,
    update: Partial<PropInquiry>,
    poNumber?: string | null,
  ) => {
    try {
      let token = getCustomerDashboardToken();
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
          writeCustomerDashboardSession(readCustomerDashboardSubscriber(), refreshedToken);
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

  const renderPropRequestCard = (item: any) => {
    const p: PropInquiry = item.propInquiry;
    if (item.type === "prop_waiting") {
      return (
        <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center font-bold text-lg">⏳</div>
            <div>
              <h3 className="font-bold text-gray-900">{p.propertyTitle} <span className="text-sm font-normal text-gray-500">· {getPropOrderLabel(p.poNumber)} · Step 3 of 8</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{getPropSiteLocation(p)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(p.listingType)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "สร้างเมื่อ" : locale === "zh" ? "创建时间" : "Created"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "รอผู้ลงประกาศยืนยัน — หากไม่ตอบสนองสามารถเลือกใหม่ได้" : locale === "zh" ? "等待房源方确认 — 如无响应可重新选择" : "Waiting for lister to accept — you may reselect if no response"}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {!p.reselectedOnce && (
              <button
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition whitespace-nowrap"
                onClick={async () => {
                  if (!confirm(locale === "th" ? "ยืนยันการเลือกผู้ลงประกาศใหม่? คำขอนี้จะถูกยกเลิก" : "Reselect a different property? This inquiry will be cancelled.")) return;
                  await updatePropInquiry(p.id, { status: "CANCELLED", reselectedOnce: true }, p.poNumber);
                }}
              >
                {locale === "th" ? "เลือกใหม่" : locale === "zh" ? "重新选择" : "Reselect"}
              </button>
            )}
            <span className="px-3 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold whitespace-nowrap">
              {locale === "th" ? "รอยืนยัน..." : "Pending..."}
            </span>
          </div>
        </div>
      );
    }
    if (item.type === "prop_declined") {
      return (
        <div key={item.id} className="bg-white border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">❌</div>
            <div>
              <h3 className="font-bold text-gray-900">{p.propertyTitle} <span className="text-sm font-normal text-gray-500">· {getPropOrderLabel(p.poNumber)}</span></h3>
              <p className="text-sm text-red-600 font-semibold mt-0.5">{locale === "th" ? "ผู้ลงประกาศปฏิเสธคำขอ" : locale === "zh" ? "房源方已拒绝" : "Lister declined your inquiry"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "อัปเดตเมื่อ" : locale === "zh" ? "更新时间" : "Updated"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "กรุณาเลือกทรัพย์สินใหม่จาก Real Estate Page" : "Please select another property from the Real Estate Page."}</p>
            </div>
          </div>
          <a href={`${prefix}/properties`} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition whitespace-nowrap">
            {locale === "th" ? "ค้นหาใหม่" : "Browse Again"}
          </a>
        </div>
      );
    }
    if (item.type === "prop_pay_fee") {
      return (
        <div key={item.id} className="bg-white border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">🏠</div>
            <div>
              <h3 className="font-bold text-gray-900">{p.propertyTitle} <span className="text-sm font-normal text-gray-500">· {getPropOrderLabel(p.poNumber)} · Step 5 of 8</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{firstNameOnly(p.listerName, 'Lister')} · {getPropSiteLocation(p)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(p.listingType)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "อัปเดตเมื่อ" : locale === "zh" ? "更新时间" : "Updated"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "ผู้ลงประกาศยืนยันแล้ว — ชำระค่าดำเนินการเพื่อรับข้อมูลติดต่อ" : locale === "zh" ? "房源方已确认 — 支付处理费以获取联系方式" : "Lister accepted — pay the processing fee to get contact info"}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-green-700">฿{p.propertyFee}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 uppercase self-start sm:self-end w-max">{p.propertyTier}</span>
            </div>
            <button
              className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-800 transition shadow-sm whitespace-nowrap"
              onClick={() => setPropPayModal(p)}
            >
              {locale === "th" ? "ชำระค่าดำเนินการ" : locale === "zh" ? "支付处理费" : "Pay Processing Fee"}
            </button>
          </div>
        </div>
      );
    }
    if (item.type === "prop_meeting_invite") {
      return (
        <div key={item.id} className="bg-white border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">📅</div>
            <div>
              <h3 className="font-bold text-gray-900">{p.propertyTitle} <span className="text-sm font-normal text-gray-500">· {getPropOrderLabel(p.poNumber)} · Step 7 of 8</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{firstNameOnly(p.listerName, 'Lister')} · {getPropSiteLocation(p)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(p.listingType)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "อัปเดตเมื่อ" : locale === "zh" ? "更新时间" : "Updated"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "ชำระแล้ว — ส่งคำเชิญนัดหมายเพื่อเยี่ยมชมทรัพย์สิน" : locale === "zh" ? "已付款 — 发送会议邀请以预约参观" : "Fee paid — send a meeting invitation to schedule a property viewing"}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-teal-50 text-teal-700 uppercase self-start sm:self-end w-max">{p.propertyTier}</span>
            <button
              className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition shadow-sm whitespace-nowrap"
              onClick={() => { setPropMeetingDate(""); setPropMeetingTime(""); setPropMeetingVenue(""); setPropMeetingModal(p); }}
            >
              {locale === "th" ? "ส่งคำเชิญนัดหมาย" : locale === "zh" ? "发送会议邀请" : "Send Meeting Invitation"}
            </button>
          </div>
        </div>
      );
    }
    if (item.type === "prop_rate") {
      return (
        <div key={item.id} className="bg-white border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold text-lg">⭐</div>
            <div>
              <h3 className="font-bold text-gray-900">{p.propertyTitle} <span className="text-sm font-normal text-gray-500">· {getPropOrderLabel(p.poNumber)} · Step 8 of 8</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{firstNameOnly(p.listerName, 'Lister')} · {getPropSiteLocation(p)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(p.listingType)} · {locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(p.propertyPrice)} · {locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}: {toCurrencyLabel(p.propertyFee)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "อัปเดตเมื่อ" : locale === "zh" ? "更新时间" : "Updated"}: {fmtDateTime(p.updatedAt || p.createdAt || Date.now())}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "นัดหมายยืนยันแล้ว — ให้คะแนนเพื่อปิดงาน" : locale === "zh" ? "会议已确认 — 评分以结案" : "Meeting confirmed — rate to close this inquiry"}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-yellow-50 text-yellow-700 uppercase self-start sm:self-end w-max">{p.propertyTier}</span>
            <button
              className="bg-yellow-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600 transition shadow-sm whitespace-nowrap"
              onClick={() => { setPropRateStars(0); setPropRateComment(""); setPropRateModal(p); }}
            >
              {locale === "th" ? "ให้คะแนนและปิดงาน" : locale === "zh" ? "评分并结案" : "Rate & Close"}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderActiveCard = (item: any, idx: number) => {
    const isPropertyCard = item.type === 'prop_waiting' || isPropPoCode(item.po);
    const amountPrefix = isPropertyCard
      ? (locale === "th" ? "มูลค่า:" : locale === "zh" ? "总价:" : "Value:")
      : (locale === "th" ? "งบประมาณ:" : locale === "zh" ? "预算:" : "Budget:");
    const amountValue = isPropertyCard
      ? toCurrencyLabel(item.value || item.budget || item.propertyPrice || item.price || 0)
      : (item.budget || ('฿' + Number(item.price || 0).toLocaleString()));
    return (
    <div key={idx} className="p-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 text-sm">
      <div className="flex items-start gap-4 flex-1 min-w-0">
         <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${item.type === 'prop_waiting' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-600'}`}>{(locale === "th" ? (item.titleTh || item.serviceTh || item.title || item.service || "C") : locale === "zh" ? (item.titleZh || item.serviceZh || item.title || item.service || "C") : (item.title || item.service || "C")).charAt(0)}</div>
         <div className="min-w-0">
           <h3 className="font-bold text-gray-900 text-sm">{locale === "th" ? (item.titleTh || item.serviceTh || item.title || item.service) : locale === "zh" ? (item.titleZh || item.serviceZh || item.title || item.service) : (item.title || item.service)} <span className="text-xs font-normal text-gray-400">· {isPropertyCard ? getPropOrderLabel(item.po) : (item.po || `PO-${item.id?.slice(0,8) || '2605-8471'}`)} | {item.location || item.subdistrict || 'Unknown'}</span></h3>
           <p className="text-xs text-gray-600 mt-0.5">{item.fixerAlias || item.partnerName || item.customer || "Customer"} · {item.date || toDisplayDateTime(item.createdAt || Date.now())} · {amountPrefix} {amountValue}</p>
           {isPropertyCard && (
             <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(item?.propInquiry?.listingType || item?.listingType)}</p>
           )}
           {item.type === 'prop_waiting' && (
             <p className="text-xs text-amber-700 mt-1">
               {locale === "th"
                 ? "รอพาร์ทเนอร์ยอมรับคำขอ (ขั้นตอน Notify)"
                 : locale === "zh"
                 ? "等待合作伙伴接受请求（通知步骤）"
                 : "Waiting for partner acceptance (Notify step)."}
             </p>
           )}
         </div>
      </div>
      <div className="w-full xl:w-[520px] shrink-0 mt-2 xl:mt-0">
        {(() => {
          const steps = isPropertyCard ? PROPERTY_ACTIVE_STEPS : FIXER_ACTIVE_STEPS;
          const startStep = isPropertyCard ? 1 : 4;
          const fallbackStep = isPropertyCard ? 4 : 5;
          return (
            <ProgressSteps
              currentStep={Number(item.step || fallbackStep)}
              steps={steps}
              startStep={startStep}
              showCurrent={true}
            />
          );
        })()}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.tier === 'ECONOMY' || item.tier === 'Economy' ? 'bg-green-50 text-green-700' : item.tier === 'Standard' || item.tier === 'STANDARD' ? 'bg-blue-50 text-blue-700' : item.tier === 'Corporate' ? 'bg-purple-50 text-purple-700' : item.tier === 'Specialist' ? 'bg-amber-50 text-amber-700' : item.tier === 'Expert' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{item.tier || 'Standard'}</span>
        {(item.actionNeeded || actionableRequestPos.has(item.po)) && item.type !== 'prop_waiting' && <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-700">{locale === "th" ? "ต้องดำเนินการ" : locale === "zh" ? "需要操作" : "Action Needed"}</span>}
        {item.type !== 'prop_waiting' && isWorkflowOrderCancellable(item) && <button
          onClick={(e) => {
            e.stopPropagation();
            setCancelJobReason("");
            setCancelJobModal(item);
          }}
          className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition"
        >
          {locale === "th" ? "ยกเลิกงาน" : locale === "zh" ? "取消工作" : "Cancel Job"}
        </button>}
      </div>
    </div>
  );
  };
  const activeOrders = workflowOrders.filter((o: any) => isBackendWorkflowActiveStatus(o));
  const historyOrders = workflowOrders.filter((o: any) => isBackendWorkflowHistoryStatus(o));
  const propCompletedHistoryEntries = propInquiries
    .filter((p: PropInquiry) => isCustomerSidePropCompleted(p))
    .map((p: PropInquiry) => {
      const status = String(p.status || '').toUpperCase();
      const isDeclined = status === 'DECLINED';
      const isCancelled = status === 'CANCELLED';
      const completedAt = p.updatedAt || p.createdAt || Date.now();
      const siteLocation = getPropSiteLocation(p);
      return {
        id: `prop-completed-${p.id}`,
        po: p.poNumber,
        service: p.propertyTitle || 'Property Inquiry',
        counterpartName: firstNameOnly(p.listerName, 'Lister'),
        partnerName: firstNameOnly(p.listerName, 'Lister'),
        completedAt,
        createdAt: p.createdAt || completedAt,
        statusChangedAt: completedAt,
        fee: toCurrencyLabel(p.propertyFee),
        budget: toCurrencyLabel(p.propertyPrice),
        status: isDeclined || isCancelled ? 'CANCELLED' : 'COMPLETED',
        statusName: isDeclined ? 'Lister Unavailable' : isCancelled ? 'Cancelled' : 'Property Inquiry Completed',
        statusNote: isDeclined
          ? 'The lister is unavailable. Please select another matched property.'
          : isCancelled
          ? 'Property inquiry cancelled.'
          : '',
        step: 11,
        stepName: isDeclined ? 'Lister Unavailable' : isCancelled ? 'Cancelled' : 'Property Inquiry Completed',
        location: siteLocation,
        subdistrict: siteLocation,
        projectDetails: `Property: ${p.propertyTitle || p.poNumber} | Site: ${siteLocation} | Meeting: ${p.meetingDate || '-'} ${p.meetingTime || ''} @ ${p.meetingVenue || '-'}`,
        description: `Customer rating: ${p.customerRating ?? '-'} | Lister rating: ${p.listerRating ?? '-'} | ${getPropOrderLabel(p.poNumber)}`,
        tier: p.propertyTier || 'STANDARD',
        chatHistory: readStoredChatHistory(p.poNumber),
      };
    });
  const allHistory = Array.from(
    [...historyOrders, ...visibleMockHistory.filter((x: any) => x.po), ...propCompletedHistoryEntries].reduce((map: Map<string, any>, entry: any) => {
      const po = extractPo(entry) || entry.po || entry.id;
      if (!po || isHiddenTestPo(po)) return map;
      const existing = map.get(po) || {};
      const service = String(entry.serviceCategory || entry.service || entry.title || existing.service || po).replace(/_/g, ' ');
      const counterpartName = firstNameOnly(entry.fixer?.user?.name || entry.fixerName || entry.partnerName || entry.customer || existing.counterpartName, 'Partner');
      const completedAt = entry.completedAt || entry.updatedAt || entry.statusChangedAt || entry.createdAt || entry.date || existing.completedAt || Date.now();
      const fee = entry.fee || entry.budget || (entry.estimatedPrice ? `฿${Number(entry.estimatedPrice).toLocaleString()}` : existing.fee || '฿0');
      const projectDetails = pickProjectDetails(
        po,
        entry.projectDetails,
        entry.description,
        entry.desc,
        existing.projectDetails,
        existing.description,
      );
      const originalStatus = entry.status || existing.status;
      const statusNote = entry.statusNote || getWorkflowStatusNote(entry) || existing.statusNote || '';
      const cancelReason = entry.cancelReason || existing.cancelReason || String(statusNote).match(/Reason:\s*([^.]*)/i)?.[1]?.trim() || '';
      const customerCancelled = String(originalStatus || '').toUpperCase() === 'CANCELLED' && (
        entry.statusName === 'Cancelled by Customer' ||
        existing.statusName === 'Cancelled by Customer' ||
        Boolean(cancelReason) ||
        isCustomerCancellationText(statusNote)
      );
      map.set(po, {
        ...existing,
        ...entry,
        id: existing.id || entry.id || po,
        po,
        service,
        counterpartName,
        fixerName: counterpartName,
        completedAt,
        createdAt: existing.createdAt || entry.createdAt || completedAt,
        statusChangedAt: entry.statusChangedAt || existing.statusChangedAt || completedAt,
        fee,
        budget: entry.budget || existing.budget || fee,
        status: originalStatus || 'COMPLETED',
        statusName: customerCancelled ? 'Cancelled by Customer' : entry.statusName || existing.statusName,
        statusNote,
        cancelReason: customerCancelled ? cancelReason : entry.cancelReason || existing.cancelReason || '',
        step: 11,
        stepName: customerCancelled ? 'Cancelled by Customer' : entry.stepName || existing.stepName || getWorkflowStepName(11),
        location: (() => {
          const lat = Number(entry?.address?.latitude);
          const lng = Number(entry?.address?.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          }
          const m = String(entry?.description || '').match(/\bLOC:([^|]+)/);
          const fromDesc = m ? (m[1] ?? '').trim() : '';
          return fromDesc || entry.address?.subdistrict || entry.subdistrict || entry.location || existing.location || '';
        })(),
        subdistrict: (() => {
          const lat = Number(entry?.address?.latitude);
          const lng = Number(entry?.address?.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          }
          const m = String(entry?.description || '').match(/\bLOC:([^|]+)/);
          const fromDesc = m ? (m[1] ?? '').trim() : '';
          return fromDesc || entry.address?.subdistrict || entry.subdistrict || entry.location || existing.subdistrict || '';
        })(),
        projectDetails,
        description: projectDetails,
        tier: entry.tier || existing.tier || 'Standard',
        chatHistory: readStoredChatHistory(po),
      });
      return map;
    }, new Map<string, any>()).values(),
  ).sort((a: any, b: any) => parseDateMs(b.completedAt || b.statusChangedAt || b.createdAt || b.date) - parseDateMs(a.completedAt || a.statusChangedAt || a.createdAt || a.date));
  const getPropertyTierStyle = (tier: string | null | undefined) => {
    const upper = String(tier || 'STANDARD').toUpperCase();
    if (upper === 'ECONOMY') return 'bg-emerald-100 text-emerald-700';
    if (upper === 'STANDARD') return 'bg-sky-100 text-sky-700';
    if (upper === 'UPPER') return 'bg-indigo-100 text-indigo-700';
    if (upper === 'LUXURY') return 'bg-amber-100 text-amber-700';
    if (upper === 'GRANDEUR') return 'bg-rose-100 text-rose-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getPropertyTypeLabel = (propertyType: string | null | undefined) => {
    const upper = String(propertyType || '').toUpperCase();
    if (upper === 'CONDO') return locale === 'th' ? 'คอนโด' : locale === 'zh' ? '公寓' : 'Condo';
    if (upper === 'HOUSE') return locale === 'th' ? 'บ้าน' : locale === 'zh' ? '别墅' : 'House';
    if (upper === 'TOWNHOUSE') return locale === 'th' ? 'ทาวน์เฮาส์' : locale === 'zh' ? '联排别墅' : 'Townhouse';
    if (upper === 'LAND') return locale === 'th' ? 'ที่ดิน' : locale === 'zh' ? '土地' : 'Land';
    if (upper === 'COMMERCIAL') return locale === 'th' ? 'อาคารพาณิชย์' : locale === 'zh' ? '商业' : 'Commercial';
    if (upper === 'OFFICE') return locale === 'th' ? 'ออฟฟิศ' : locale === 'zh' ? '办公室' : 'Office';
    if (upper === 'WAREHOUSE') return locale === 'th' ? 'โกดัง' : locale === 'zh' ? '仓库' : 'Warehouse';
    if (upper === 'SHOPHOUSE') return locale === 'th' ? 'ตึกแถว' : locale === 'zh' ? '商铺' : 'Shophouse';
    if (upper === 'APARTMENT') return locale === 'th' ? 'อพาร์ตเมนต์' : locale === 'zh' ? '公寓楼' : 'Apartment';
    return upper || '-';
  };

  const getListingTypeLabel = (listingType: string | null | undefined) => {
    const upper = String(listingType || '').toUpperCase();
    if (upper === 'SALE') return locale === 'th' ? 'ขาย' : locale === 'zh' ? '出售' : 'Sale';
    if (upper === 'RENT') return locale === 'th' ? 'เช่า' : locale === 'zh' ? '出租' : 'Rent';
    return upper || '-';
  };

  const getPropertyFlowSnapshot = (inquiry: PropInquiry) => {
    const status = String(inquiry.status || '').toUpperCase();
    if (status === 'NOTIFY_SENT') {
      return {
        label: locale === 'th' ? 'รอยืนยัน' : locale === 'zh' ? '等待确认' : 'Waiting',
        badge: 'bg-amber-100 text-amber-700',
        stepText: 'Step 4 of 8',
        nextAction: locale === 'th' ? 'รอผู้ลงประกาศตอบรับคำขอ' : locale === 'zh' ? '等待房源方接受请求' : 'Wait for lister acceptance',
        responsible: locale === 'th' ? 'ผู้ลงประกาศ' : locale === 'zh' ? '房源方' : 'Lister',
        actionNeeded: false,
      };
    }
    if (status === 'ACCEPTED') {
      return {
        label: locale === 'th' ? 'รอชำระ' : locale === 'zh' ? '待支付' : 'Payment Pending',
        badge: 'bg-emerald-100 text-emerald-700',
        stepText: 'Step 5 of 8',
        nextAction: locale === 'th' ? 'กด Testing period - Free Pass เพื่อไปขั้นตอนถัดไป' : locale === 'zh' ? '点击 Testing period - Free Pass 继续流程' : 'Click Testing period - Free Pass to proceed',
        responsible: locale === 'th' ? 'คุณ' : locale === 'zh' ? '您' : 'You',
        actionNeeded: true,
      };
    }
    if (status === 'PAID') {
      return {
        label: locale === 'th' ? 'พร้อมนัดหมาย' : locale === 'zh' ? '可发送会面邀请' : 'Ready for Meeting Invite',
        badge: 'bg-teal-100 text-teal-700',
        stepText: 'Step 7 of 8',
        nextAction: locale === 'th' ? 'ส่งคำเชิญนัดหมายหน้างานให้ผู้ลงประกาศ' : locale === 'zh' ? '向房源方发送现场会面邀请' : 'Send a site meeting invitation to lister',
        responsible: locale === 'th' ? 'คุณ' : locale === 'zh' ? '您' : 'You',
        actionNeeded: true,
      };
    }
    if (status === 'MEETING_SENT') {
      return {
        label: locale === 'th' ? 'รอยืนยันนัดหมาย' : locale === 'zh' ? '待确认会面' : 'Meeting Pending',
        badge: 'bg-cyan-100 text-cyan-700',
        stepText: 'Step 7 of 8',
        nextAction: locale === 'th' ? 'รอผู้ลงประกาศยืนยันนัดหมาย' : locale === 'zh' ? '等待房源方确认会面' : 'Wait for lister meeting confirmation',
        responsible: locale === 'th' ? 'ผู้ลงประกาศ' : locale === 'zh' ? '房源方' : 'Lister',
        actionNeeded: false,
      };
    }
    if (status === 'MEETING_CONFIRMED') {
      const pendingRating = hasPendingCustomerPropRating(inquiry);
      return {
        label: locale === 'th' ? 'นัดหมายยืนยันแล้ว' : locale === 'zh' ? '会面已确认' : 'Meeting Confirmed',
        badge: 'bg-yellow-100 text-yellow-700',
        stepText: 'Step 8 of 8',
        nextAction: pendingRating
          ? locale === 'th'
            ? 'ให้คะแนนเพื่อปิดงาน'
            : locale === 'zh'
            ? '评分并结案'
            : 'Rate to close this inquiry'
          : locale === 'th'
          ? 'รอผู้ลงประกาศให้คะแนนเพื่อปิดงาน'
          : locale === 'zh'
          ? '等待房源方评分结案'
          : 'Waiting for lister rating to close',
        responsible: pendingRating
          ? locale === 'th'
            ? 'คุณ'
            : locale === 'zh'
            ? '您'
            : 'You'
          : locale === 'th'
          ? 'ผู้ลงประกาศ'
          : locale === 'zh'
          ? '房源方'
          : 'Lister',
        actionNeeded: pendingRating,
      };
    }
    if (status === 'COMPLETED') {
      return {
        label: locale === 'th' ? 'เสร็จสิ้น' : locale === 'zh' ? '已完成' : 'Completed',
        badge: 'bg-emerald-100 text-emerald-700',
        stepText: 'Step 8 of 8',
        nextAction: locale === 'th' ? 'งานเสร็จสมบูรณ์แล้ว' : locale === 'zh' ? '流程已完成' : 'Workflow completed',
        responsible: locale === 'th' ? 'ไม่มี' : locale === 'zh' ? '无' : 'None',
        actionNeeded: false,
      };
    }

    return {
      label: status || '-',
      badge: 'bg-gray-100 text-gray-700',
      stepText: `Step ${Number(inquiry.step || 0) || 0} of 8`,
      nextAction: locale === 'th' ? 'ตรวจสอบสถานะล่าสุด' : locale === 'zh' ? '查看最新状态' : 'Review latest status',
      responsible: locale === 'th' ? 'ระบบ' : locale === 'zh' ? '系统' : 'System',
      actionNeeded: false,
    };
  };

  const getPropertyComplianceHints = (inquiry: PropInquiry) => {
    const missing: string[] = [];
    if (!String(inquiry.propertyTitle || '').trim()) missing.push(locale === 'th' ? 'ชื่อประกาศ' : locale === 'zh' ? '标题' : 'Title');
    if (!String(inquiry.propertyType || '').trim()) missing.push(locale === 'th' ? 'ประเภททรัพย์สิน' : locale === 'zh' ? '房产类型' : 'Property type');
    if (!String(inquiry.listingType || '').trim()) missing.push(locale === 'th' ? 'ประเภทการประกาศ' : locale === 'zh' ? '交易类型' : 'Listing type');
    if (!String(inquiry.propertyTier || '').trim()) missing.push(locale === 'th' ? 'ระดับบริการ' : locale === 'zh' ? '服务等级' : 'Tier');
    if (!Number.isFinite(Number(inquiry.propertyPrice)) || Number(inquiry.propertyPrice) <= 0) missing.push(locale === 'th' ? 'ราคา' : locale === 'zh' ? '价格' : 'Price');
    if (!String(inquiry.province || '').trim()) missing.push(locale === 'th' ? 'จังหวัด' : locale === 'zh' ? '省份' : 'Province');
    if (!String(inquiry.district || '').trim()) missing.push(locale === 'th' ? 'เขต/อำเภอ' : locale === 'zh' ? '区/县' : 'District');
    if (!Array.isArray(inquiry.propertyImages) || inquiry.propertyImages.length === 0) missing.push(locale === 'th' ? 'ไฟล์รูปภาพ' : locale === 'zh' ? '图片附件' : 'Media attachments');
    return missing;
  };

  const propertyTabItems = [...propInquiries].sort((a, b) => parseDateMs(b.updatedAt || b.createdAt) - parseDateMs(a.updatedAt || a.createdAt));
  const acceptedStatuses = new Set(['ACCEPTED', 'PAID', 'MEETING_SENT', 'MEETING_CONFIRMED', 'COMPLETED']);
  const meetingStatuses = new Set(['MEETING_SENT', 'MEETING_CONFIRMED', 'COMPLETED']);
  const sentCount = propertyTabItems.length;
  const acceptedCount = propertyTabItems.filter((p) => acceptedStatuses.has(String(p.status || '').toUpperCase())).length;
  const meetingCount = propertyTabItems.filter((p) => meetingStatuses.has(String(p.status || '').toUpperCase())).length;
  const completedCount = propertyTabItems.filter((p) => String(p.status || '').toUpperCase() === 'COMPLETED').length;
  const acceptedRate = sentCount > 0 ? Math.round((acceptedCount / sentCount) * 100) : 0;
  const meetingRate = sentCount > 0 ? Math.round((meetingCount / sentCount) * 100) : 0;
  const completedRate = sentCount > 0 ? Math.round((completedCount / sentCount) * 100) : 0;
  const propertiesCount = propertyTabItems.length;
  const stats = { active: combinedActiveWithProp.length, completed: allHistory.length, messages: 0, rating: "4.8" };
  const totalReqCount = allRequestItemsWithProp.length;
  const getWorkflowOrderSnapshot = (po: any) =>
    workflowOrders.find((order: any) => extractPo(order) === po) ||
    combinedActiveWithProp.find((item: any) => item.po === po) ||
    visibleMockHistory.find((item: any) => item.po === po) ||
    {};
  const getWorkflowMeetingSnapshot = (po: any, source: any = {}) => {
    const fromActive = combinedActiveWithProp.find((item: any) => item.po === po) || {};
    const fromRequest = allRequestItemsWithProp.find((item: any) => item.po === po) || {};
    const meetingDateValue = source?.meetingDate || fromRequest?.meetingDate || fromActive?.meetingDate || "";
    const meetingTimeValue = source?.meetingTime || fromRequest?.meetingTime || fromActive?.meetingTime || "";
    const venueValue = pickWorkflowMeetingVenue(
      source?.meetingVenue,
      source?.venue,
      fromRequest?.meetingVenue,
      fromRequest?.venue,
      fromActive?.meetingVenue,
      fromActive?.venue,
      source?.location,
      source?.subdistrict,
      fromRequest?.location,
      fromRequest?.subdistrict,
      fromActive?.location,
      fromActive?.subdistrict,
    );
    return {
      when: formatWorkflowMeetingLabel(meetingDateValue, meetingTimeValue, source?.createdAt || fromRequest?.createdAt || fromActive?.createdAt),
      venue: venueValue,
    };
  };
  const rateModalOrder = rateModal ? getWorkflowOrderSnapshot(rateModal.po) : null;
  const variationApproveOrder = variationApproveModal ? getWorkflowOrderSnapshot(variationApproveModal.po) : null;
  const completeApproveOrder = completeApproveModal ? getWorkflowOrderSnapshot(completeApproveModal.po) : null;
  const rateModalMeeting = rateModal ? getWorkflowMeetingSnapshot(rateModal.po, rateModal) : null;
  const variationApproveMeeting = variationApproveModal ? getWorkflowMeetingSnapshot(variationApproveModal.po, variationApproveModal) : null;
  const completeApproveMeeting = completeApproveModal ? getWorkflowMeetingSnapshot(completeApproveModal.po, completeApproveModal) : null;

    return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", count: null },
          { key: "requests", icon: "", label: locale === "th" ? "คำขอของคุณ" : locale === "zh" ? "您的请求" : "Requests", count: totalReqCount || null },
          { key: "active", icon: "", label: locale === "th" ? "งานที่ใช้งานอยู่" : locale === "zh" ? "当前工作" : "Active Jobs", count: combinedActiveWithProp.length || null },
          
          { key: "properties", icon: "", label: locale === "th" ? "อสังหาฯ" : locale === "zh" ? "房产" : "Properties", count: propertiesCount || null },
          { key: "history", icon: "", label: locale === "th" ? "ประวัติ" : locale === "zh" ? "历史" : "History", count: allHistory.length || null },
          { key: "chat", icon: "", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", count: null },
          { key: "alerts", icon: "", label: locale === "th" ? "การแจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", count: null },
          { key: "profile", icon: "", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", count: null },
        ].map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === tab.key ? 'bg-sky-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>
      
      {activeTab === "profile" && <ProfileTab locale={locale} prefix={prefix} subscriber={subscriber} activeOrders={combinedActiveWithProp} onOrderClick={handleOrderClick} historyOrders={historyOrders} />}
      
      {activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 pb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Incoming Requests"}</h2>
            <div className="text-sm text-gray-500 font-bold">{totalReqCount}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 mt-4 mx-6">
              {allRequestItemsWithProp.map((m: any) => renderRequestCard(m))}
          </div>
        </div>
      )}

      {activeTab === "active" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs"} <span className="text-sm font-normal text-gray-400 ml-2">{combinedActiveWithProp.length}</span></h2>
          </div>
          {/* Pill container — all jobs in one grouped container with dividers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {combinedActiveWithProp.map((m, i) => (
              <div key={i}>
                {renderActiveCard(m, i)}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "properties" && (
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Properties</h2>
              <p className="text-xs text-gray-500 mt-1">
                {locale === 'th'
                  ? `คำขอทั้งหมด ${sentCount} รายการ`
                  : locale === 'zh'
                  ? `总询盘 ${sentCount} 条`
                  : `${sentCount} inquiries tracked`}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4">
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'ส่งคำขอ' : locale === 'zh' ? '已发送' : 'Sent'}</p>
                <p className="text-sm font-bold text-sky-900 mt-1">{sentCount}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'ตอบรับ' : locale === 'zh' ? '接受' : 'Accepted'}</p>
                <p className="text-sm font-bold text-sky-900 mt-1">{acceptedCount} ({acceptedRate}%)</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'นัดหมาย' : locale === 'zh' ? '会面' : 'Meetings'}</p>
                <p className="text-sm font-bold text-sky-900 mt-1">{meetingCount} ({meetingRate}%)</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'สำเร็จ' : locale === 'zh' ? '已完成' : 'Completed'}</p>
                <p className="text-sm font-bold text-sky-900 mt-1">{completedCount} ({completedRate}%)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-3 sm:p-4 space-y-3 bg-gradient-to-b from-slate-50/70 to-white">
            {propertyTabItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No property inquiries found.</div>
            ) : (
              propertyTabItems.map((p: PropInquiry, index: number) => {
                const statusMeta = getPropertyFlowSnapshot(p);
                const complianceHints = getPropertyComplianceHints(p);
                const media = Array.isArray(p.propertyImages) ? p.propertyImages.map((url) => normalizeImageUrl(url)).filter(Boolean) : [];
                const listerFirstName = firstNameOnly(p.listerName, 'Lister');
                const siteLocation = getPropSiteLocation(p);
                const updatedAt = p.updatedAt || p.createdAt || Date.now();

                return (
                  <div
                    key={p.id}
                    className={`p-5 sm:p-6 rounded-xl border shadow-sm space-y-4 ${index % 2 === 0 ? 'bg-amber-50/45 border-amber-100' : 'bg-cyan-50/45 border-cyan-100'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                          {locale === 'th'
                            ? `คำขอลำดับที่ ${index + 1}`
                            : locale === 'zh'
                            ? `询盘 #${index + 1}`
                            : `Enquiry #${index + 1}`}
                        </p>
                        <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full uppercase ${getPropertyTierStyle(p.propertyTier)}`}>
                          {p.propertyTier || 'STANDARD'}
                        </span>
                        <h3 className="font-bold text-gray-900 mt-2">{p.propertyTitle} <span className="text-sm font-normal text-gray-400">· {getPropOrderLabel(p.poNumber)}</span></h3>
                        <p className="text-sm text-gray-600 mt-1">{listerFirstName} · {siteLocation}</p>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-1">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusMeta.badge}`}>{statusMeta.label}</span>
                        <span className="text-xs text-gray-500">{locale === 'th' ? 'อัปเดตล่าสุด' : locale === 'zh' ? '最近更新' : 'Last updated'}: {fmtDateTime(updatedAt)}</span>
                        {statusMeta.actionNeeded && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">{locale === 'th' ? 'ต้องดำเนินการ' : locale === 'zh' ? '需要操作' : 'Action Needed'}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === 'th' ? 'สถานะ' : locale === 'zh' ? '状态' : 'Status'}</p>
                        <p className="text-xs font-semibold text-gray-900 mt-1">{statusMeta.label}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === 'th' ? 'อัปเดตล่าสุด' : locale === 'zh' ? '最近更新' : 'Last updated'}</p>
                        <p className="text-xs font-semibold text-gray-900 mt-1">{fmtDateTime(updatedAt)}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{locale === 'th' ? 'การดำเนินการ' : locale === 'zh' ? '待办' : 'Action needed'}</p>
                        <p className="text-xs font-semibold text-gray-900 mt-1">{statusMeta.actionNeeded ? (locale === 'th' ? 'ต้องดำเนินการ' : locale === 'zh' ? '需要操作' : 'Required') : (locale === 'th' ? 'ไม่มี' : locale === 'zh' ? '无' : 'None')}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">{locale === 'th' ? 'สรุปทรัพย์สิน' : locale === 'zh' ? '房源摘要' : 'Property summary'}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                        <p><span className="text-gray-500">{locale === 'th' ? 'ประเภท' : locale === 'zh' ? '类型' : 'Type'}:</span> {getPropertyTypeLabel(p.propertyType)}</p>
                        <p><span className="text-gray-500">{locale === 'th' ? 'รูปแบบประกาศ' : locale === 'zh' ? '交易类型' : 'Listing'}:</span> {getListingTypeLabel(p.listingType)}</p>
                        <p><span className="text-gray-500">{locale === 'th' ? 'ระดับบริการ' : locale === 'zh' ? '服务等级' : 'Tier'}:</span> {String(p.propertyTier || 'STANDARD').toUpperCase()}</p>
                        <p><span className="text-gray-500">{locale === 'th' ? 'ราคา' : locale === 'zh' ? '价格' : 'Price'}:</span> {toCurrencyLabel(p.propertyPrice)}</p>
                        <p className="sm:col-span-2"><span className="text-gray-500">{locale === 'th' ? 'สถานที่' : locale === 'zh' ? '位置' : 'Location'}:</span> {siteLocation}</p>
                        <p><span className="text-gray-500">{locale === 'th' ? 'ผู้ลงประกาศ' : locale === 'zh' ? '房源方' : 'Lister'}:</span> {listerFirstName}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">{locale === 'th' ? 'Workflow Snapshot' : locale === 'zh' ? '流程快照' : 'Workflow snapshot'}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-700">
                        <p><span className="text-gray-500">Step:</span> {statusMeta.stepText}</p>
                        <p><span className="text-gray-500">{locale === 'th' ? 'การดำเนินการถัดไป' : locale === 'zh' ? '下一步动作' : 'Next action'}:</span> {statusMeta.nextAction}</p>
                        <p><span className="text-gray-500">{locale === 'th' ? 'ผู้รับผิดชอบ' : locale === 'zh' ? '责任方' : 'Responsible'}:</span> {statusMeta.responsible}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase">{locale === 'th' ? 'สรุปไฟล์สื่อ' : locale === 'zh' ? '媒体摘要' : 'Media summary'}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{media.length} {locale === 'th' ? 'ไฟล์' : locale === 'zh' ? '个附件' : 'attachments'}</span>
                          {media.length > 0 && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                              onClick={() => {
                                void downloadImageUrls(media, `property-${p.poNumber}`);
                              }}
                            >
                              {locale === 'th' ? 'ดาวน์โหลดทั้งหมด' : locale === 'zh' ? '下载全部' : 'Download all'}
                            </button>
                          )}
                        </div>
                      </div>
                      {media.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {media.slice(0, 6).map((url, index) => (
                            <img key={`${p.id}-media-${index}`} src={url} alt="property media" className="w-14 h-14 rounded-md object-cover border border-gray-200 shrink-0" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">{locale === 'th' ? 'ยังไม่มีไฟล์แนบ' : locale === 'zh' ? '暂无附件' : 'No media uploaded yet.'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'ส่งคำขอ' : locale === 'zh' ? '已发送' : 'Sent'}</p>
                        <p className="text-xs font-semibold text-sky-900 mt-1">{sentCount}</p>
                      </div>
                      <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'ตอบรับ' : locale === 'zh' ? '接受' : 'Accepted'}</p>
                        <p className="text-xs font-semibold text-sky-900 mt-1">{acceptedCount}</p>
                      </div>
                      <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'นัดหมาย' : locale === 'zh' ? '会面' : 'Meetings'}</p>
                        <p className="text-xs font-semibold text-sky-900 mt-1">{meetingCount}</p>
                      </div>
                      <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-700">{locale === 'th' ? 'สำเร็จ' : locale === 'zh' ? '已完成' : 'Completed'}</p>
                        <p className="text-xs font-semibold text-sky-900 mt-1">{completedCount}</p>
                      </div>
                    </div>

                    {complianceHints.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold">{locale === 'th' ? 'คำเตือนความพร้อมก่อนส่งคำขอ:' : locale === 'zh' ? '发送前合规提醒:' : 'Compliance/readiness hints:'}</span>{' '}
                        {complianceHints.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">{locale === "th" ? "ประวัติ" : locale === "zh" ? "历史" : "History"}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {allHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{locale === "th" ? "ไม่พบประวัติ" : locale === "zh" ? "暂无历史记录。" : "No history found."}</div>
            ) : (
              allHistory.map((o: any, i: number) => <CustomerHistoryCard key={o.po || o.id || i} item={o} idx={i} locale={locale} />)
            )}
          </div>
        </div>
      )}

      {activeTab === "chat" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Chat</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {chatFeed.length > 0 ? (
              chatFeed.map((c: any) => (
                <div
                  key={c.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => {
                    try {
                      localStorage.setItem(`chat_from_${c.po}`, "dashboard");
                      if (c.name) localStorage.setItem(`chat_title_${c.po}`, c.name);
                    } catch {}
                    window.location.href = `${prefix}/chat/${c.po}`;
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">C</div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-sky-600 mt-1 font-medium">{c.lastMsg}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">{c.time || "-"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 p-6 text-center">No recent chats.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">{locale === "th" ? "การแจ้งเตือน" : locale === "zh" ? "通知" : "Alerts"}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {alertsPageItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{locale === "th" ? "ไม่มีการแจ้งเตือนล่าสุด" : locale === "zh" ? "暂无最近通知。" : "No recent alerts."}</div>
            ) : (
              alertsPageItems.map((a: any, i: number) => (
                <div key={i} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition cursor-pointer">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${a.dot}`}></span>
                  <div>
                    <p className="text-sm text-gray-800">{locale === "th" ? (a.msgTh || a.msg) : locale === "zh" ? (a.msgZh || a.msg) : a.msg}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <div className={`flex flex-col gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-1">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <h2 className="text-base font-bold text-gray-800">⏰ {locale === "th" ? "การนัดหมายที่จะมาถึง" : locale === "zh" ? "即将到来的会议" : "Upcoming Meetings"}</h2>
                    <span className="text-gray-500 font-bold text-xs">{upcomingMeetings.length + propConfirmedMeetings.length}</span>
                  </div>
                  <button className="text-xs font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</button>
                </div>
                {(upcomingMeetings.length > 0 || propConfirmedMeetings.length > 0) ? (
                  <div className="space-y-3 mt-4">
                    {(() => {
                      const propItems = propConfirmedMeetings.map((p: PropInquiry) => ({
                        key: p.poNumber,
                        ts: parseDateMs(`${p.meetingDate}T${p.meetingTime || '00:00'}`),
                        node: (
                            <div key={p.poNumber} className="bg-white rounded-xl shadow-sm border border-emerald-200 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-900 font-bold">🏠 {p.propertyTitle} ({getPropOrderLabel(p.poNumber)})</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 rounded-full font-bold">{formatPropMeetingLabel(p.meetingDate, p.meetingTime)}</span>
                            </div>
                            <p className="text-[11px] text-gray-600">{locale === "th" ? "สถานที่:" : "Venue:"} {p.meetingVenue || 'TBD'} | {locale === "th" ? "ผู้ลงประกาศ:" : "Lister:"} {firstNameOnly(p.listerName, 'Lister')}</p>
                          </div>
                        ),
                      }));
                      const fixerItems = upcomingMeetings.map((m: any) => ({
                        key: m.id,
                        ts: m.meetingDate ? parseDateMs(`${m.meetingDate}T${m.meetingTime || '00:00'}`) : parseDateMs(m.createdAt || m.date),
                        node: (
                          <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-900 font-bold">{m.title} ({m.po})</span>
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-full font-bold">{formatWorkflowMeetingLabel(m.meetingDate, m.meetingTime, m.createdAt || m.date)}</span>
                            </div>
                            <p className="text-[11px] text-gray-600">{locale === "th" ? "สถานที่:" : locale === "zh" ? "地点:" : "Venue:"} {pickWorkflowMeetingVenue(m.meetingVenue, m.venue, m.location, m.subdistrict) || 'TBD'} | {locale === "th" ? "ผู้ให้บริการ:" : locale === "zh" ? "服务提供商:" : "Provider:"} {m.customer}</p>
                          </div>
                        ),
                      }));
                      return [...propItems, ...fixerItems]
                        .sort((a, b) => a.ts - b.ts)
                        .slice(0, 3)
                        .map(item => item.node);
                    })()}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4 text-center text-xs text-gray-400">{locale === "th" ? "ไม่มีการนัดหมายที่จะมาถึง" : locale === "zh" ? "暂无会议" : "No upcoming meetings"}</div>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">{locale === "th" ? "การแจ้งเตือนล่าสุด" : locale === "zh" ? "最近通知" : "Recent Alerts"} <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("alerts")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</span></h3>
                <div className="space-y-4">
                  {overviewAlerts.length > 0 ? (
                    <>
                      {overviewAlerts.map((a: any) => (
                        <div key={a.id} className="flex items-start gap-3 text-xs text-gray-700"><div className={`w-2 h-2 mt-1.5 rounded-full ${a.dot} flex-shrink-0`}></div><p>{locale === "th" ? (a.msgTh || a.msg) : locale === "zh" ? (a.msgZh || a.msg) : a.msg} <span className="text-[11px] text-gray-400 ml-1">{a.time}</span></p></div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">{locale === "th" ? "ไม่มีการแจ้งเตือนล่าสุด" : locale === "zh" ? "暂无最近通知。" : "No recent alerts."}</p>
                  )}
                </div>
              </div>
          </div>

          <div className="mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">{locale === "th" ? "แชทที่เข้ามาล่าสุด" : locale === "zh" ? "最近收到的消息" : "Recent Incoming Chats"} <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("chat")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</span></h3>
              <div className="space-y-4">
                {overviewIncomingChats.length > 0 ? (
                  <>
                    {overviewIncomingChats.map((c: any) => (
                      <div key={c.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold text-gray-800 flex items-center gap-2 mb-2"><span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">C</span> {c.name} <span className="text-[11px] text-gray-400 font-normal ml-auto">{c.incomingTime || ""}</span></p>
                        <p className="text-xs text-gray-600">{c.incomingMsg}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "暂无最近聊天。" : "No recent incoming chats."}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Incoming Requests"}</h2>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</button>
            </div>
            <div className="flex flex-col gap-3">
              {overviewRequestItems.map((m: any) => renderRequestCard(m))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">{locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs"}</h2>
                <span className="text-gray-500 font-bold text-sm">{combinedActiveWithProp.length}</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("active")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 mt-4">
              {combinedActiveWithProp.slice(0, 5).map((m, i) => renderActiveCard(m, i))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">{locale === "th" ? "ประวัติล่าสุด" : locale === "zh" ? "最近历史" : "Recent History"}</h2>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("history")}>{locale === "th" ? "ดูทั้งหมด" : locale === "zh" ? "查看全部" : "View All"}</button>
            </div>
            <div className="divide-y divide-gray-50 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
              {allHistory.slice(0, 2).length === 0 ? (
                <div className="p-8 text-center text-gray-500">{locale === "th" ? "ไม่พบประวัติ" : locale === "zh" ? "暂无历史记录。" : "No history found."}</div>
              ) : (
                allHistory.slice(0, 2).map((o: any, i: number) => <CustomerHistoryCard key={o.po || o.id || i} item={o} idx={i} compact={true} locale={locale} />)
              )}
            </div>
          </div>
        </div>
      {/* === Property Inquiry Modals === */}

      {/* Step 5: Pay Processing Fee */}
      {propPayModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{locale === "th" ? "ชำระค่าดำเนินการ" : locale === "zh" ? "支付处理费" : "Pay Processing Fee"}</h3>
                <p className="text-green-100 text-sm mt-1">{getPropOrderLabel(propPayModal.poNumber)} · Step 5 of 8</p>
              </div>
              <button onClick={() => setPropPayModal(null)} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {propModalImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {propModalImages.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-20 object-cover rounded-lg shrink-0 border border-gray-200" />
                  ))}
                </div>
              )}
              {propModalImages.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                  onClick={() => {
                    void downloadImageUrls(propModalImages, 'property-photo');
                  }}
                >
                  Download Photos
                </button>
              )}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ทรัพย์สิน" : "Property"}</span><span className="font-semibold text-right max-w-[60%] line-clamp-1">{propPayModal.propertyTitle}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ระดับบริการ" : locale === "zh" ? "服务等级" : "Tier"}</span><span className="font-semibold uppercase">{propPayModal.propertyTier || "STANDARD"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}</span><span className="font-semibold">{getPropListingTypeLabel(propPayModal.listingType)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}</span><span className="font-semibold">{toCurrencyLabel(propPayModal.propertyPrice)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "จังหวัด" : "Province"}</span><span className="font-semibold">{propPayModal.province}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}</span><span className="font-semibold text-right max-w-[60%] break-words">{getPropSiteLocation(propPayModal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ผู้ลงประกาศ" : "Lister"}</span><span className="font-semibold">{firstNameOnly(propPayModal.listerName, 'Lister')}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-700 font-semibold">{locale === "th" ? "ค่าดำเนินการ" : "Processing Fee"}</span>
                  <span className="font-extrabold text-green-700 text-lg">฿{propPayModal.propertyFee}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                {locale === "th"
                  ? "ช่วงทดสอบ: ข้ามการชำระเงินได้ฟรี หลังกด 'Free Pass' คุณจะได้รับข้อมูลติดต่อผู้ลงประกาศ"
                  : "Testing period: payment is skipped for free. After clicking 'Free Pass' you will receive the lister's contact info."}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPropPayModal(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                  {locale === "th" ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition"
                  onClick={async () => {
                    const current = propPayModal;
                    if (!current) return;
                    const ok = await updatePropInquiry(current.id, { status: "PAID", step: 5 }, current.poNumber);
                    if (ok) {
                      ensurePropChatBootstrap({ ...current, status: "PAID", step: 5 });
                    }
                    setPropPayModal(null);
                  }}
                >
                  Testing period — Free Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 7: Send Meeting Invitation */}
      {propMeetingModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{locale === "th" ? "ส่งคำเชิญนัดหมาย" : locale === "zh" ? "发送会议邀请" : "Send Meeting Invitation"}</h3>
                <p className="text-teal-100 text-sm mt-1">{getPropOrderLabel(propMeetingModal.poNumber)} · Step 7 of 8</p>
              </div>
              <button onClick={() => setPropMeetingModal(null)} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {propModalImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {propModalImages.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-20 object-cover rounded-lg shrink-0 border border-gray-200" />
                  ))}
                </div>
              )}
              {propModalImages.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                  onClick={() => {
                    void downloadImageUrls(propModalImages, 'property-photo');
                  }}
                >
                  Download Photos
                </button>
              )}
              <p className="text-sm text-gray-600">{locale === "th" ? `นัดหมายเยี่ยมชม: ${propMeetingModal.propertyTitle}` : `Schedule a viewing for: ${propMeetingModal.propertyTitle}`}</p>
              <p className="text-xs font-semibold text-teal-700 uppercase">{locale === "th" ? "ระดับบริการ" : locale === "zh" ? "服务等级" : "Tier"}: {propMeetingModal.propertyTier || "STANDARD"}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(propMeetingModal.listingType)}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(propMeetingModal.propertyPrice)}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}: {getPropSiteLocation(propMeetingModal)}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "วันที่" : "Date"}</label>
                  <input type="date" value={propMeetingDate} onChange={e => setPropMeetingDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "เวลา" : "Time"}</label>
                  <input type="time" value={propMeetingTime} onChange={e => setPropMeetingTime(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "สถานที่" : "Venue"}</label>
                  <input type="text" value={propMeetingVenue} onChange={e => setPropMeetingVenue(e.target.value)} placeholder={locale === "th" ? "เช่น ชั้น 1 อาคาร A" : "e.g. Lobby, Building A"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPropMeetingModal(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                  {locale === "th" ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  disabled={!propMeetingDate || !propMeetingTime || !propMeetingVenue}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    await updatePropInquiry(propMeetingModal!.id, { status: "MEETING_SENT", step: 7, meetingDate: propMeetingDate, meetingTime: propMeetingTime, meetingVenue: propMeetingVenue }, propMeetingModal!.poNumber);
                    setPropMeetingModal(null);
                  }}
                >
                  {locale === "th" ? "ส่งคำเชิญ" : "Send Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 8: Rate & Close */}
      {propRateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-lg">{locale === "th" ? "ให้คะแนนและปิดงาน" : locale === "zh" ? "评分并结案" : "Rate & Close"}</h3>
                <p className="text-yellow-100 text-sm mt-1">{getPropOrderLabel(propRateModal.poNumber)} · Step 8 of 8</p>
              </div>
              <button onClick={() => setPropRateModal(null)} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">{locale === "th" ? `ให้คะแนนประสบการณ์กับ: ${firstNameOnly(propRateModal.listerName, 'Lister')}` : `Rate your experience with: ${firstNameOnly(propRateModal.listerName, 'Lister')}`}</p>
              <p className="text-xs font-semibold text-yellow-700 uppercase">{locale === "th" ? "ระดับบริการ" : locale === "zh" ? "服务等级" : "Tier"}: {propRateModal.propertyTier || "STANDARD"}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "รูปแบบประกาศ" : locale === "zh" ? "交易类型" : "Listing"}: {getPropListingTypeLabel(propRateModal.listingType)}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "มูลค่า" : locale === "zh" ? "总价" : "Value"}: {toCurrencyLabel(propRateModal.propertyPrice)}</p>
              <p className="text-xs text-gray-500">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}: {getPropSiteLocation(propRateModal)}</p>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">{locale === "th" ? "คะแนน" : "Rating"}</p>
                <div className="flex gap-2 justify-center">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setPropRateStars(star)} className={`text-3xl transition ${propRateStars >= star ? "text-yellow-400" : "text-gray-200"}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{locale === "th" ? "ความคิดเห็น (ไม่บังคับ)" : "Comment (optional)"}</label>
                <textarea value={propRateComment} onChange={e => setPropRateComment(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none" placeholder={locale === "th" ? "แชร์ประสบการณ์ของคุณ..." : "Share your experience..."} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPropRateModal(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                  {locale === "th" ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  disabled={propRateStars === 0}
                  className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-sm hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    await updatePropInquiry(
                      propRateModal!.id,
                      {
                        step: 8,
                        customerRating: propRateStars,
                        customerComment: propRateComment,
                      },
                      propRateModal!.poNumber,
                    );
                    const listerAlreadyRated = propRateModal?.listerRating != null;
                    setPropRateModal(null);
                    alert(
                      locale === "th"
                        ? listerAlreadyRated
                          ? "ขอบคุณ! งานนี้ปิดแล้วและย้ายไปประวัติ"
                          : "ขอบคุณ! ส่งคะแนนแล้ว กำลังรอผู้ลงประกาศให้คะแนนเพื่อปิดงาน"
                        : listerAlreadyRated
                        ? "Thank you! This inquiry is now closed and moved to history."
                        : "Thank you! Your rating is submitted. Waiting for the lister rating to close this inquiry.",
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

      {/* Rate & Close Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 bg-gray-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-4">
              <h3 className="text-white font-bold text-lg">{locale === "th" ? "ให้คะแนนพาร์ทเนอร์" : locale === "zh" ? "评价合作伙伴" : "Rate Your Partner"} ⭐</h3>
              <p className="text-yellow-100 text-sm mt-1">{rateModal.po} · {getWorkflowStepBadgeLabel(11, 11, getWorkflowStepNameForLocale(11, locale), locale)}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <CustomerWorkflowModalMeta
                locale={locale}
                step={11}
                typeOfWork={rateModal.title || String(rateModalOrder?.serviceCategory || rateModalOrder?.service || 'Project').replace(/_/g, ' ')}
                actionText={locale === "th" ? "ให้คะแนนพาร์ทเนอร์ที่เลือกเพื่อปิดงานและย้ายไปยังประวัติ" : locale === "zh" ? "评价已选合作伙伴，以关闭项目并移至历史记录。" : "Rate the selected partner to close this project and move it to history."}
                po={rateModal.po || '-'}
                partnerName={firstNameOnly(rateModal.customer || rateModalOrder?.customer || rateModalOrder?.fixerName, locale === "th" ? "พาร์ทเนอร์" : locale === "zh" ? "合作伙伴" : "Partner")}
                budget={toCurrencyLabel(rateModal.budget || rateModalOrder?.budget || rateModalOrder?.fee)}
                location={rateModalOrder?.address?.subdistrict || rateModalOrder?.subdistrict || rateModalOrder?.location || (locale === "th" ? "ไม่ทราบ" : locale === "zh" ? "未知" : "Unknown")}
                projectDetails={stripWorkflowPrefix(rateModalOrder?.description || rateModal.desc || rateModal.title || '')}
              />
              {(rateModalMeeting?.when || rateModalMeeting?.venue) && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm">
                  <div className="font-bold text-amber-900">{locale === "th" ? "ยืนยันนัดหมายหน้างานแล้ว" : locale === "zh" ? "已确认现场会议" : "Confirmed Site Meeting"}</div>
                  {rateModalMeeting.when && <div className="text-amber-800">{locale === "th" ? "เวลา" : locale === "zh" ? "时间" : "Time"}: {rateModalMeeting.when}</div>}
                  {rateModalMeeting.venue && <div className="text-amber-800">{locale === "th" ? "สถานที่" : locale === "zh" ? "地点" : "Venue"}: {rateModalMeeting.venue}</div>}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Your Rating</label>
                <div className="flex gap-2 text-3xl">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRateStars(n)} className={`transition-transform hover:scale-110 ${n <= rateStars ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{rateStars} out of 5 stars</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    const po = rateModal.po;
                    const createdAt = Date.now();
                    const job = mockActiveItems.find((x: any) => x.po === po);
                    const completed = {
                      ...(job || rateModal),
                      step: 11,
                      stepName: 'Rate',
                      completedAt: createdAt,
                      statusChangedAt: createdAt,
                      status: 'COMPLETED',
                      statusName: 'Completed',
                      statusNote: `Customer rated this project ${rateStars}/5 stars. Workflow completed.`,
                      rating: rateStars,
                      customerRating: rateStars,
                      chatHistory: readStoredChatHistory(po),
                    };
                    const newActive = mockActiveItems.filter((x: any) => x.po !== po);
                    const newReqs = mockDynRequests.filter((x: any) => x.po !== po);
                    const prevHist = JSON.parse(localStorage.getItem('ghis_mock_history') || '[]');
                    const newHist = [...(prevHist as any[]).filter((x: any) => x.po !== po), completed]
                      .sort((a: any, b: any) => parseDateMs(b.completedAt || b.statusChangedAt || b.createdAt || b.date) - parseDateMs(a.completedAt || a.statusChangedAt || a.createdAt || a.date));
                    writeWorkflowStorage('ghis_mock_active', newActive);
                    writeWorkflowStorage('ghis_mock_dyn_req', newReqs);
                    const persistedHistory = setWorkflowStorageItem(localStorage, 'ghis_mock_history', newHist);
                    window.dispatchEvent(new Event('storage'));
                    setMockActiveItems(newActive);
                    setMockDynRequests(newReqs);
                    setMockHistory(Array.isArray(persistedHistory.value) ? persistedHistory.value : newHist);
                    try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
                    const ratingText = `[SYSTEM] Customer rated this project ${rateStars}/5 stars. Workflow completed.`;
                    appendLocalWorkflowChat(po, ratingText, createdAt);
                    const backendOrder = workflowOrders.find((order: any) => extractPo(order) === po);
                    const token = getCustomerDashboardToken();
                    void persistCustomerRatingStatusNote({
                      fetchFn: fetch,
                      po,
                      rating: rateStars,
                      resolveOrderIdByPo: async ({ fallbackOrderId }) =>
                        fallbackOrderId || backendOrder?.id || '',
                      storage: localStorage,
                      token,
                    });
                    void postBackendWorkflowMessage(po, ratingText);
                    setRateModal(null);
                    setActiveTab("history");
                  }}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2.5 rounded-xl transition text-sm"
                >Submit Rating & Close</button>
                <button onClick={() => setRateModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {waitModalOrder && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-gray-950/80 backdrop-blur-sm p-4 overflow-y-auto pt-6 pb-10">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl flex flex-col overflow-y-auto max-h-[calc(100dvh-6rem)] relative">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="text-center text-xs font-bold text-sky-700 bg-sky-50 rounded-xl px-4 py-1.5 mb-3">Step 6 of 11</div>
              <h3 className="text-center font-bold text-gray-800 text-base">Fee &amp; Proceed</h3>
            </div>
            <div className="px-6 py-4 flex flex-col gap-3">
              {/* Unified PO details — follows Step 5 of 11 layout */}
              <div className="space-y-0 rounded-xl border border-gray-100 overflow-hidden text-sm">
                <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">PO Number</span>
                  <span className="font-mono font-bold text-gray-900">{waitModalOrder.request?.po || 'PO-SYS-202'}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Step Name</span>
                  <span className="font-bold text-gray-900">Fee &amp; Proceed</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Type of Work</span>
                  <span className="font-bold text-gray-900">{waitModalOrder.request?.title || 'Fit out'}</span>
                </div>
                <div className="flex justify-between items-start px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider flex-shrink-0 mr-3">What You Need To Do</span>
                  <span className="font-bold text-gray-900 text-right text-xs max-w-[60%]">Pay the processing fee to activate the chat room and notify your partner to proceed.</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Selected Partner</span>
                  <span className="font-bold text-gray-900">{firstNameOnly(waitModalOrder.request?.customer, 'Suppadesh')}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-sky-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Budget</span>
                  <div className="text-right">
                    {(() => {
                      const po = waitModalOrder.request?.po;
                      const desc = String(waitModalOrder.request?.description || waitModalOrder.request?.desc || '');
                      let bd: BudgetBreakdownItem[] | null = readStoredBreakdown(po);
                      if (!bd || bd.length === 0) {
                        const pl = resolvePartnerPriceList(po);
                        if (pl.length > 0 && desc) {
                          const computed = computeBudgetBreakdown(desc, pl);
                          if (computed && computed.length > 0) {
                            bd = computed;
                            try { localStorage.setItem(`cblue_po_breakdown_${po}`, JSON.stringify(bd)); } catch {}
                          }
                        }
                      }
                      if (bd && bd.length >= 1) {
                        return (
                          <div className="font-mono text-xs space-y-0.5 text-right">
                            {bd.map((it, i) => (
                              <div key={i} className="flex justify-between gap-2">
                                <span className="text-gray-600">{i+1}) {it.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                                <span className="font-semibold text-sky-700 shrink-0">= ฿{it.total.toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="flex justify-between gap-2 pt-1 border-t border-sky-200 font-bold text-sm">
                              <span className="text-sky-900">Budget</span>
                              <span className="text-sky-900">= ฿{bd.reduce((s, it) => s + (it?.total ?? 0), 0).toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      }
                      return <span className="font-bold text-sky-700">{waitModalOrder.request?.budget || '฿0'}</span>;
                    })()}
                  </div>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Project Location"}</span>
                  <span className="font-bold text-gray-900">{(() => { const loc = waitModalOrder.request?.location || waitModalOrder.request?.subdistrict || ''; if (loc && loc !== 'Unknown') return loc; const m = String(waitModalOrder.request?.description || waitModalOrder.request?.desc || '').match(/\bLOC:([^|]+)/); const fromDesc = m ? (m[1] ?? '').trim() : ''; return fromDesc || 'N/A'; })()}</span>
                </div>
                <div className="flex flex-col gap-1 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{locale === "th" ? "รายละเอียดโครงการ" : locale === "zh" ? "项目详情" : "Project Details"}</span>
                  <span className="font-bold text-gray-900">{stripWorkflowPrefix(waitModalOrder.request?.description || waitModalOrder.request?.desc || '') || (locale === "th" ? "รายละเอียดโครงการจากร่าง PO" : locale === "zh" ? "来自 PO 草稿的项目详情。" : "Project details from the draft PO.")}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-sky-50">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{locale === "th" ? "ค่าธรรมเนียมดำเนินการ" : locale === "zh" ? "处理费" : "Processing Fee"}</span>
                  <span className="font-bold text-sky-800">฿100</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-gray-400 px-2">
                Processing fee is non-refundable. CBLUE acts solely as a matching platform.
              </div>

              <button 
                onClick={() => setWaitModalOrder(null)} 
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                className="py-3 w-full bg-sky-50 border border-sky-300 text-sky-800 font-bold rounded-2xl shadow-sm hover:bg-sky-100 active:scale-95 transition"
                onClick={() => {
                  const createdAt = Date.now();
                  const now = fmtDateTime(createdAt);
                  const po = waitModalOrder.request?.po;
                  const chatReqId = `chat-${po}`;
                  const meetReqId = `meet-invite-${po}`;
                  // Compute new arrays eagerly so we can write to localStorage before React state
                  // updates — prevents the 1.2s syncMockState interval from overwriting new state
                  const newActiveItems = [
                    ...mockActiveItems.filter((x: any) => x.po !== po),
                    { ...waitModalOrder.request, actionNeeded: true, step: 7, createdAt },
                  ];
                  const newDynReqs = [
                    ...mockDynRequests.filter((x: any) => x.po !== po && x.id !== chatReqId && x.id !== meetReqId),
                    { id: chatReqId, po, title: waitModalOrder.request?.title, customer: waitModalOrder.request?.customer || 'Suppadesh', date: now, createdAt, budget: waitModalOrder.request?.budget, tier: waitModalOrder.request?.tier, desc: 'Chat room is now active. Open the Chat page to connect with your partner.', type: 'chat_ready', step: 7 },
                    { id: meetReqId, po, title: waitModalOrder.request?.title, customer: waitModalOrder.request?.customer || 'Suppadesh', date: now, createdAt, budget: waitModalOrder.request?.budget, tier: waitModalOrder.request?.tier, desc: 'Please send a meeting invitation to your partner. Fill in the venue and proposed date/time.', type: 'meeting_invite', step: 8, location: (() => { const loc = waitModalOrder.request?.location || waitModalOrder.request?.subdistrict || waitModalOrder?.location || waitModalOrder?.subdistrict || ''; if (loc && loc !== 'Unknown' && loc !== 'N/A') return loc; const m = String(waitModalOrder.request?.description || waitModalOrder.request?.desc || '').match(/\bLOC:([^|]+)/); return m ? (m[1] ?? '').trim() : ''; })() },
                  ];
                  const newPayments = { ...mockPayments, [waitModalOrder.id]: true };
                  // Write to localStorage synchronously BEFORE setState so interval reads fresh data
                  try {
                    writeWorkflowStorage('ghis_mock_active', newActiveItems);
                    writeWorkflowStorage('ghis_mock_dyn_req', newDynReqs);
                    writeWorkflowStorage('ghis_mock_payments', newPayments);
                  } catch {}
                  setMockPayments(newPayments);
                  setMockActiveItems(newActiveItems);
                  setMockDynRequests(newDynReqs);
                  try {
                    const chatKey = `chat_messages_${po}`;
                    const existing = JSON.parse(localStorage.getItem(chatKey) || '[]');
                    if (existing.length === 0) localStorage.setItem(chatKey, JSON.stringify([{ id: Date.now(), sender: 'system', text: '[CBLUE] Payment confirmed. Your project chat is now active. Please coordinate with your partner here.', time: now, createdAt }]));
                    const title = waitModalOrder.request?.title || '';
                    const budget = waitModalOrder.request?.budget || '';
                    if (po) {
                      localStorage.setItem(`chat_title_${po}`, `${title} - ${po} - ${budget}`);
                      localStorage.setItem(`chat_from_${po}`, "dashboard");
                      window.dispatchEvent(new Event("storage"));
                      window.dispatchEvent(new CustomEvent("cblue-chat-updated", { detail: { orderId: po } }));
                      window.dispatchEvent(new Event("cblue-workflow-updated"));
                    }
                  } catch {}
                  // Push backend order to IN_PROGRESS so partner sees step 7 cross-browser
                  try {
                    const token = getCustomerDashboardToken();
                    if (token && po) {
                      // Try multiple methods to find backend order: PO in description, direct orderId from F4 item, description includes PO
                      const directOrderId = waitModalOrder.request?.orderId || waitModalOrder.request?.id;
                      const backendOrder = (orders || []).find((o: any) =>
                        extractPo(o) === po ||
                        (directOrderId && o.id === directOrderId) ||
                        String(o?.description || '').includes(po)
                      ) || (directOrderId && !directOrderId.startsWith('req') && !directOrderId.startsWith('pay-') ? { id: directOrderId } : null);
                      if (backendOrder?.id) {
                        // Store PO→UUID mapping so ClientChatPage resolves to backend API
                        localStorage.setItem(`po_to_order_${po}`, backendOrder.id);
                        fetch(`/api/v1/orders/${backendOrder.id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Customer paid processing fee' }),
                        }).catch(() => { /* non-blocking */ });
                        // Post a CBLUE welcome message to the backend chat so partner sees the room cross-browser
                        const svcName = waitModalOrder.request?.title || 'your project';
                        fetch(`/api/v1/orders/${backendOrder.id}/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ text: `[CBLUE] Payment confirmed for ${svcName} (${po}). Chat room is now active — please coordinate your site meeting here.` }),
                        }).catch(() => { /* non-blocking */ });
                      }
                    }
                  } catch {}
                  setWaitModalOrder(null);
                  setActiveTab("requests");
                }}
              >
                ✓ Testing period - Free Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Invitation Modal */}
      {meetingModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-gray-950/80 backdrop-blur-sm p-4 overflow-y-auto pt-6 pb-10">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl flex flex-col overflow-y-auto max-h-[calc(100dvh-6rem)] relative">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="text-center text-xs font-bold text-amber-700 bg-amber-50 rounded-xl px-4 py-1.5">Step 8 of 11</div>
              <h3 className="text-center font-bold text-gray-800 text-base mt-2">Send Meeting Invitation</h3>
              <p className="text-center text-sm text-gray-500 mt-1">Fill in the meeting details below. Your partner will confirm the time.</p>
            </div>

            <div className="px-6 py-4 space-y-3">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <strong>Step Name:</strong> Meeting Invitation. Send your available site meeting time and venue to the selected partner for confirmation.
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Project</label>
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-800">{meetingModal.title} · {meetingModal.po}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Selected Partner</label>
                  <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-800">{firstNameOnly(meetingModal.customer, 'Partner')}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Project Location</label>
                  <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm font-bold text-gray-800">{(() => { const m = String(meetingModal.description || meetingModal.desc || '').match(/\bLOC:([^|]+)/); const fromDesc = m ? (m[1] ?? '').trim() : ''; return getWorkflowDisplayLocation(meetingModal.location, meetingModal.subdistrict, fromDesc, meetingModal.meetingVenue, meetingModal.venue) || 'Unknown'; })()}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Venue / Jobsite Address</label>
                <input
                  type="text"
                  value={meetingVenue}
                  onChange={(e) => setMeetingVenue(e.target.value)}
                  placeholder="Enter venue or jobsite address"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Proposed Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Proposed Time</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-xs text-amber-700">
                <strong>Budget:</strong> {meetingModal.budget} &nbsp;|&nbsp; <strong>Tier:</strong> {meetingModal.tier}
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Note <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={meetingNote}
                  onChange={(e) => setMeetingNote(e.target.value)}
                  rows={2}
                  placeholder="Any additional instructions or notes for your partner..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-2">
              <button onClick={() => { setMeetingNote(""); setMeetingModal(null); }} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition">Cancel</button>
              <button
                disabled={!meetingDate || !meetingTime || !meetingVenue}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-md"
                onClick={() => {
                  const createdAt = Date.now();
                  const dateLabel = meetingDate ? fmtDate(meetingDate + 'T' + (meetingTime || '09:00')) : '';
                  const pendingId = `meet-pending-${meetingModal.po}`;
                  const meetingProjectLocation = (() => { const m = String(meetingModal.description || meetingModal.desc || '').match(/\bLOC:([^|]+)/); const fromDesc = m ? (m[1] ?? '').trim() : ''; return getWorkflowDisplayLocation(meetingModal.location, meetingModal.subdistrict, fromDesc, meetingModal.meetingVenue, meetingModal.venue); })();
                  const finalMeetingVenue = pickWorkflowMeetingVenue(meetingVenue, meetingProjectLocation);
                  const desc = `Meeting invitation sent. Proposed: ${dateLabel} ${meetingTime} at ${finalMeetingVenue}.${meetingNote.trim() ? ` Note: ${meetingNote.trim()}.` : ''} Waiting for partner confirmation.`;
                  const chatText = `[SYSTEM] Customer sent meeting invitation for ${meetingModal.po}: ${dateLabel} ${meetingTime} at ${finalMeetingVenue}.${meetingNote.trim() ? ` Note: ${meetingNote.trim()}.` : ''} Next: waiting for partner confirmation before variation.`;
                  const meetingPartnerIdentity = {
                    fixerId: meetingModal.fixerId || meetingModal.selectedFixerId || meetingModal.partnerId || meetingModal.providerId || '',
                    partnerId: meetingModal.partnerId || meetingModal.fixerId || meetingModal.selectedFixerId || meetingModal.providerId || '',
                    providerId: meetingModal.providerId || meetingModal.fixerId || meetingModal.selectedFixerId || meetingModal.partnerId || '',
                    selectedFixerId: meetingModal.selectedFixerId || meetingModal.fixerId || meetingModal.partnerId || meetingModal.providerId || '',
                    fixerAlias: meetingModal.fixerAlias || meetingModal.partnerName || meetingModal.customer || '',
                    partnerName: meetingModal.partnerName || meetingModal.fixerAlias || meetingModal.customer || '',
                    selectedFixerName: meetingModal.selectedFixerName || meetingModal.partnerName || meetingModal.fixerAlias || meetingModal.customer || '',
                    partnerEmail: meetingModal.partnerEmail || meetingModal.fixerEmail || meetingModal.selectedFixerEmail || '',
                    fixerEmail: meetingModal.fixerEmail || meetingModal.partnerEmail || meetingModal.selectedFixerEmail || '',
                    selectedFixerEmail: meetingModal.selectedFixerEmail || meetingModal.partnerEmail || meetingModal.fixerEmail || '',
                    partnerPhone: meetingModal.partnerPhone || meetingModal.fixerPhone || meetingModal.selectedFixerPhone || '',
                    fixerPhone: meetingModal.fixerPhone || meetingModal.partnerPhone || meetingModal.selectedFixerPhone || '',
                    selectedFixerPhone: meetingModal.selectedFixerPhone || meetingModal.partnerPhone || meetingModal.fixerPhone || '',
                  };
                  // Compute new arrays eagerly and write to localStorage BEFORE setState
                  // (same pattern as payment pill — prevents syncMockState interval from overwriting)
                  const existingMeetActive = mockActiveItems.find((x: any) => x.po === meetingModal.po);
                  const updatedMeetActive = [
                    ...mockActiveItems.filter((x: any) => x.po !== meetingModal.po),
                    {
                      ...(existingMeetActive || meetingModal),
                      po: meetingModal.po,
                      ...meetingPartnerIdentity,
                      title: existingMeetActive?.title || meetingModal.title,
                      customer: existingMeetActive?.customer || meetingModal.customer,
                      date: existingMeetActive?.date || meetingModal.date || fmtDateTime(createdAt),
                      createdAt: existingMeetActive?.createdAt || meetingModal.createdAt || createdAt,
                      budget: existingMeetActive?.budget || meetingModal.budget,
                      tier: existingMeetActive?.tier || meetingModal.tier,
                      location: existingMeetActive?.location || meetingProjectLocation,
                      subdistrict: existingMeetActive?.subdistrict || meetingProjectLocation,
                      description: existingMeetActive?.description || meetingModal.description || meetingModal.desc || '',
                      meetingDate,
                      meetingTime,
                      meetingVenue: finalMeetingVenue,
                      venue: finalMeetingVenue,
                      step: 8,
                      mockStep: 8,
                      status: 'MEETING_REQUESTED',
                      statusName: 'Waiting for Meeting Confirmation',
                      statusNote: `Waiting for partner confirmation for ${dateLabel} ${meetingTime}`,
                      actionNeeded: false,
                    },
                  ];
                  const updatedMeetReqs = [
                    ...mockDynRequests.filter((x: any) => x.id !== meetingModal.id && x.id !== pendingId),
                    { id: pendingId, po: meetingModal.po, ...meetingPartnerIdentity, title: meetingModal.title, customer: meetingModal.customer, customerName: subscriber?.name || meetingModal.customerName || meetingModal.customer, date: fmtDateTime(createdAt), createdAt, budget: meetingModal.budget, tier: meetingModal.tier, desc, type: 'meeting_pending_partner', step: 8, venue: finalMeetingVenue, meetingVenue: finalMeetingVenue, meetingDate, meetingTime, meetingNote: meetingNote.trim(), location: meetingProjectLocation, customerEmail: subscriberEmail, customerPhone: subscriber?.phone || '' },
                  ];
                  const partnerMeetingCustomer = subscriber?.name || meetingModal.customerName || "Ghis";
                  const partnerMeetingRequest = {
                    id: `meeting-confirm-${meetingModal.po}`,
                    po: meetingModal.po,
                    ...meetingPartnerIdentity,
                    service: meetingModal.title,
                    serviceTh: meetingModal.titleTh || meetingModal.title,
                    serviceZh: meetingModal.titleZh || meetingModal.title,
                    customer: partnerMeetingCustomer,
                    customerName: partnerMeetingCustomer,
                    customerEmail: subscriberEmail,
                    date: fmtDateTime(createdAt),
                    createdAt,
                    fee: meetingModal.budget,
                    budget: String(meetingModal.budget || '').replace(/[^0-9]/g, ''),
                    tier: meetingModal.tier,
                    desc,
                    description: meetingModal.description || meetingModal.desc || desc,
                    hasAttachment: Boolean(meetingModal.hasAttachment),
                    images: Array.isArray(meetingModal.images) ? meetingModal.images : [],
                    attachments: Array.isArray(meetingModal.attachments) ? meetingModal.attachments : [],
                    imageUrls: Array.isArray(meetingModal.imageUrls) ? meetingModal.imageUrls : [],
                    issueImage: meetingModal.issueImage || '',
                    meetingDate,
                    meetingTime,
                    meetingDateLabel: dateLabel,
                    meetingTimeLabel: meetingTime,
                    meetingVenue: finalMeetingVenue,
                    meetingMessage: meetingNote.trim() || desc,
                    venue: finalMeetingVenue,
                    location: meetingProjectLocation,
                    subdistrict: meetingProjectLocation,
                    type: 'meeting_confirm_partner',
                    workflowType: 'meeting_confirm_partner',
                    status: 'MEETING_REQUESTED',
                    step: 8,
                    mockStep: 8,
                  };
                  try {
                    writeWorkflowStorage('ghis_mock_active', updatedMeetActive);
                    writeWorkflowStorage('ghis_mock_dyn_req', updatedMeetReqs);
                    const rawPartnerReqs = JSON.parse(localStorage.getItem('partner_mock_dyn_req') || '[]');
                    const partnerReqs = Array.isArray(rawPartnerReqs) ? rawPartnerReqs : [];
                    const isAdvancedPartnerStep = (item: any) => ['variation_partner', 'complete_partner', 'rate_partner'].includes(String(item?.workflowType || item?.type || ''));
                    const alreadyAdvanced = partnerReqs.some((item: any) => item?.po === meetingModal.po && isAdvancedPartnerStep(item) && parseDateMs(item?.createdAt || item?.date) > createdAt);
                    if (!alreadyAdvanced) {
                      const nextPartnerReqs = [
                        partnerMeetingRequest,
                        ...partnerReqs.filter((item: any) => {
                          const workflowType = String(item?.workflowType || item?.type || '');
                          return !(item?.po === meetingModal.po && ['meeting_confirm_partner', 'meeting_pending_partner'].includes(workflowType));
                        }),
                      ];
                      writeWorkflowStorage('partner_mock_dyn_req', nextPartnerReqs);
                      window.dispatchEvent(new Event("storage"));
                      window.dispatchEvent(new CustomEvent("cblue-workflow-updated", { detail: { source: "customer-meeting-invite", po: meetingModal.po } }));
                      window.dispatchEvent(new CustomEvent("cblue-chat-updated", { detail: { source: "customer-meeting-invite", po: meetingModal.po } }));
                      const rawPartnerAlerts = JSON.parse(localStorage.getItem('partner_alerts') || '[]');
                      const partnerAlerts = Array.isArray(rawPartnerAlerts) ? rawPartnerAlerts : [];
                      const partnerAlert = {
                        id: `partner-meeting-invite-${meetingModal.po}`,
                        type: 'meeting_invite',
                        po: meetingModal.po,
                        ...meetingPartnerIdentity,
                        title: 'Site Meeting Invitation',
                        message: `${meetingModal.po}: Customer proposed a site meeting on ${dateLabel}${meetingTime ? ` at ${meetingTime}` : ''}${finalMeetingVenue ? ` in ${finalMeetingVenue}` : ''}. Confirm it to unlock Step 9.`,
                        msgTh: `${meetingModal.po}: ลูกค้าเสนอเวลานัดหมายหน้างาน วันที่ ${dateLabel}${meetingTime ? ` เวลา ${meetingTime}` : ''}${finalMeetingVenue ? ` ที่ ${finalMeetingVenue}` : ''} กรุณายืนยันเพื่อไปขั้นตอนที่ 9`,
                        msgZh: `${meetingModal.po}: 客户提议现场会议，日期 ${dateLabel}${meetingTime ? ` 时间 ${meetingTime}` : ''}${finalMeetingVenue ? ` 地点 ${finalMeetingVenue}` : ''}。请确认以进入第9步。`,
                        timestamp: new Date(createdAt).toISOString(),
                        createdAt,
                        unread: true,
                        dot: 'bg-amber-500',
                      };
                      writeWorkflowStorage('partner_alerts', [
                        partnerAlert,
                        ...partnerAlerts.filter((alert: any) => alert?.id !== partnerAlert.id),
                      ].slice(0, 20));
                    }
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new Event('cblue-workflow-updated'));
                  } catch {}
                  setMockActiveItems(updatedMeetActive);
                  setMockDynRequests(updatedMeetReqs);
                  // Notify backend: MEETING_REQUESTED (cross-browser: partner page polls and sees MEETING_REQUESTED status)
                  try {
                    const token = getCustomerDashboardToken();
                    const storedOrderId = localStorage.getItem(`po_to_order_${meetingModal.po}`) || "";
                    const backendOrder =
                      workflowOrders.find((o: any) => extractPo(o) === meetingModal.po) ||
                      (storedOrderId ? { id: storedOrderId, status: "" } : null);
                    if (token && backendOrder?.id) {
                      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
                      void (async () => {
                        const currentStatus = String(backendOrder.status || '').toUpperCase();
                        if (!['IN_PROGRESS', 'MEETING_REQUESTED'].includes(currentStatus)) {
                          await fetch(`/api/v1/orders/${backendOrder.id}/status`, {
                            method: 'PUT',
                            headers,
                            body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Customer paid processing fee before sending meeting invitation' }),
                          }).catch(() => null);
                        }
                        await fetch(`/api/v1/orders/${backendOrder.id}/status`, {
                          method: 'PUT',
                          headers,
                          body: JSON.stringify({ status: 'MEETING_REQUESTED', note: `Customer sent meeting invitation: ${dateLabel} ${meetingTime} at ${finalMeetingVenue}` }),
                        }).catch(() => null);
                        await fetch(`/api/v1/orders/${backendOrder.id}/chat`, {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({ text: chatText }),
                        }).catch(() => null);
                      })();
                    }
                  } catch {}
                  appendLocalWorkflowChat(meetingModal.po, chatText, createdAt);
                  window.dispatchEvent(new CustomEvent('cblue-chat-updated', { detail: { orderId: meetingModal.po } }));
                  window.dispatchEvent(new Event('cblue-workflow-updated'));
                  setMeetingNote("");
                  setMeetingModal(null);
                }}
              >Send Invitation</button>
            </div>
          </div>
        </div>
      )}

      {variationApproveModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-gray-950/80 backdrop-blur-sm p-4 overflow-y-auto pt-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto my-4">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4">
              <h3 className="text-white font-bold text-lg">{locale === "th" ? "อนุมัติการเปลี่ยนแปลงงาน" : locale === "zh" ? "批准变更" : "Approve Variation"}</h3>
              <p className="text-purple-100 text-sm mt-1">{variationApproveModal.po} · {getWorkflowStepBadgeLabel(9, 11, getWorkflowStepNameForLocale(9, locale), locale)}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <CustomerWorkflowModalMeta
                locale={locale}
                step={9}
                typeOfWork={variationApproveModal.title || String(variationApproveOrder?.serviceCategory || variationApproveOrder?.service || 'Project').replace(/_/g, ' ')}
                actionText={locale === "th" ? "ตรวจสอบคำขอเปลี่ยนแปลงจากพาร์ทเนอร์และอนุมัติหากคุณตกลงดำเนินการต่อ" : locale === "zh" ? "查看合作伙伴的变更请求，如同意继续则批准。" : "Review the partner variation request and approve it if you agree to proceed."}
                po={variationApproveModal.po || '-'}
                partnerName={firstNameOnly(variationApproveModal.customer || variationApproveOrder?.customer || variationApproveOrder?.fixerName, locale === "th" ? "พาร์ทเนอร์" : locale === "zh" ? "合作伙伴" : "Partner")}
                budget={toCurrencyLabel(variationApproveModal.budget || variationApproveOrder?.budget || variationApproveOrder?.fee)}
                location={(() => {
                  const lat = Number(variationApproveOrder?.address?.latitude);
                  const lng = Number(variationApproveOrder?.address?.longitude);
                  if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
                    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                  }
                  return variationApproveOrder?.address?.subdistrict || variationApproveOrder?.subdistrict || variationApproveOrder?.location || variationApproveModal?.location || variationApproveModal?.subdistrict || (locale === "th" ? "ไม่ทราบ" : locale === "zh" ? "未知" : "Unknown");
                })()}
                projectDetails={stripWorkflowPrefix(variationApproveOrder?.description || variationApproveModal.desc || variationApproveModal.title || '')}
              />
              {(variationApproveMeeting?.when || variationApproveMeeting?.venue) && (
                <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm">
                  <div className="font-bold text-purple-900">Confirmed Site Meeting</div>
                  {variationApproveMeeting.when && <div className="text-purple-800">Time: {variationApproveMeeting.when}</div>}
                  {variationApproveMeeting.venue && <div className="text-purple-800">Venue: {variationApproveMeeting.venue}</div>}
                </div>
              )}
              {(() => {
                try {
                  const brkPo = variationApproveModal.po;
                  let bd: Array<{ service: string; qty: number; unit: string; unitRate: number; total: number }> = [];
                  // 1. Embedded breakdown written by partner at variation submission
                  if (Array.isArray((variationApproveModal as any).breakdown) && (variationApproveModal as any).breakdown.length > 0) bd = (variationApproveModal as any).breakdown;
                  // 2. Compute fresh using priceList (most accurate, avoids phantom items)
                  if (bd.length === 0) {
                    const pl = resolvePartnerPriceList(brkPo);
                    const desc = String(variationApproveOrder?.description || variationApproveModal.desc || '');
                    if (pl.length > 0 && desc) {
                      const computed = computeBudgetBreakdown(desc, pl);
                      if (computed && computed.length > 0) {
                        bd = computed;
                        try { localStorage.setItem(`cblue_po_breakdown_${brkPo}`, JSON.stringify(bd)); } catch {}
                      }
                    }
                  }
                  // 3. Stored breakdown from localStorage
                  if (bd.length === 0) { try { const _s = localStorage.getItem(`cblue_po_breakdown_${brkPo}`); if (_s) { const p = JSON.parse(_s); if (Array.isArray(p) && p.length > 0) bd = p; } } catch {} }
                  if (bd.length >= 1) {
                    const totalAmt = bd.reduce((s, it) => s + (it?.total ?? 0), 0);
                    return (
                      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                        <div className="text-xs font-semibold text-gray-500 mb-1.5">Budget Breakdown</div>
                        <div className="font-mono text-xs space-y-0.5">
                          {bd.map((it, i) => (
                            <div key={i} className="flex justify-between gap-2">
                              <span className="text-gray-600">{i + 1}) {it.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                              <span className="font-semibold text-sky-700 shrink-0">= ฿{it.total.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between gap-2 pt-1 border-t border-sky-200 font-bold text-sm">
                            <span className="text-sky-900">Budget</span>
                            <span className="text-sky-900">= ฿{totalAmt.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                } catch { /* no breakdown stored */ }
                return null;
              })()}
              {(() => {
                const requestText = String(variationApproveModal.desc || '');
                const variationItems = (() => {
                  const stored = readStoredVariationPriceList(variationApproveModal.po);
                  if (stored.length > 0) return stored;
                  const parsed = parseVariationPriceList(requestText);
                  if (parsed.length > 0) {
                    storeVariationPriceList(variationApproveModal.po, parsed);
                  }
                  return parsed;
                })();
                const partnerRequest = stripVariationPriceList(
                  requestText.replace(/^Partner variation request:\s*/i, '').trim(),
                ) || requestText;
                return (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Partner Request</label>
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 whitespace-pre-wrap">{partnerRequest}</p>
                    </div>
                    {variationItems.length > 0 && (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Price List</label>
                        <div className="text-sm text-purple-900 space-y-1">
                          {variationItems.map((item, index) => (
                            <p key={`${item.item}-${index}`}>{formatVariationPriceListItem(item, index)}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    const createdAt = Date.now();
                    const po = variationApproveModal.po;
                    const meetingSnapshot = getWorkflowMeetingSnapshot(po, variationApproveModal);
                    const meetingFields = {
                      meetingDate: variationApproveModal.meetingDate || '',
                      meetingTime: variationApproveModal.meetingTime || '',
                      meetingVenue: meetingSnapshot.venue || variationApproveModal.meetingVenue || variationApproveModal.venue || '',
                      venue: meetingSnapshot.venue || variationApproveModal.venue || variationApproveModal.meetingVenue || '',
                    };
                    const notice = {
                      id: `notice-var-${po}-${createdAt}`,
                      po,
                      title: variationApproveModal.title,
                      customer: variationApproveModal.customer,
                      date: fmtDateTime(createdAt),
                      createdAt,
                      budget: variationApproveModal.budget,
                      tier: variationApproveModal.tier,
                      desc: 'Variation approved. Partner may now submit project complete.',
                      type: 'notice',
                      step: 10,
                      ...meetingFields,
                    };
                    const variationRequest = stripVariationPriceList(
                      String(
                        variationApproveModal.partnerRequest ||
                        variationApproveModal.partnerNote ||
                        variationApproveModal.variationRequest ||
                        variationApproveModal.description ||
                        variationApproveModal.desc ||
                        '',
                      ),
                    )
                      .replace(/^Partner variation request:\s*/i, '')
                      .trim();
                    const existingActive = mockActiveItems.find((x: any) => x.po === po);
                    const activeSnapshot = {
                      ...(existingActive || variationApproveModal),
                      po,
                      step: 10,
                      mockStep: 10,
                      actionNeeded: false,
                      ...meetingFields,
                    };
                    const newActive = [...mockActiveItems.filter((x: any) => x.po !== po), activeSnapshot];
                    const newReqs = [...mockDynRequests.filter((x: any) => !(x.po === po && ['variation_pending', 'meeting_pending_partner', 'meeting_scheduled'].includes(x.type))), notice];
                    const partnerReqs = JSON.parse(localStorage.getItem('partner_mock_dyn_req') || '[]') as any[];
                    const complId = `complete-${po}`;
                    const workflowOrderForPo = workflowOrders.find((order: any) => extractPo(order) === po);
                    const updatedPartnerReqs = [
                      ...partnerReqs.filter((x: any) => !(x.po === po && ['variation_partner', 'meeting_confirm_partner', 'complete_partner'].includes(x.type))),
                      { id: complId, orderId: workflowOrderForPo?.id || variationApproveModal.orderId, po, title: variationApproveModal.title, customer: variationApproveModal.customer, date: fmtDateTime(createdAt), createdAt, budget: variationApproveModal.budget, tier: variationApproveModal.tier, desc: 'Customer approved the variation. Please submit project complete for confirmation.', location: variationApproveModal.location || variationApproveModal.subdistrict || '', partnerRequest: variationRequest, partnerNote: variationRequest, variationRequest, type: 'complete_partner', step: 10, ...meetingFields },
                    ];
                    const partnerAlerts = JSON.parse(localStorage.getItem('partner_alerts') || '[]') as any[];
                    const partnerCompleteAlert = {
                      id: `partner-complete-request-${po}`,
                      type: 'complete_request',
                      po,
                      title: 'Project Complete Request',
                      message: `${po}: Customer approved the variation. Please submit project complete for confirmation.`,
                      msgTh: `${po}: ลูกค้าอนุมัติ variation แล้ว กรุณาส่งคำของานเสร็จเพื่อให้ลูกค้ายืนยัน`,
                      msgZh: `${po}: 客户已批准变更。请提交完工确认请求。`,
                      timestamp: new Date(createdAt).toISOString(),
                      createdAt,
                      unread: true,
                      dot: 'bg-green-500',
                    };
                    markWorkflowVariationApproved(localStorage, po);
                    writeWorkflowStorage('ghis_mock_active', newActive);
                    writeWorkflowStorage('ghis_mock_dyn_req', newReqs);
                    writeWorkflowStorage('partner_mock_dyn_req', updatedPartnerReqs);
                    writeWorkflowStorage('partner_alerts', [
                      partnerCompleteAlert,
                      ...(Array.isArray(partnerAlerts) ? partnerAlerts.filter((alert: any) => alert?.id !== partnerCompleteAlert.id) : []),
                    ].slice(0, 20));
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new Event('cblue-workflow-updated'));
                    setMockActiveItems(newActive);
                    setMockDynRequests(newReqs);
                    const token = getCustomerDashboardToken();
                    if (token && workflowOrderForPo?.id) {
                      fetch(`/api/v1/orders/${workflowOrderForPo.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          status: 'IN_PROGRESS',
                          note: 'Customer approved the variation. Partner may now submit project complete.',
                        }),
                      }).catch(() => {});
                    }
                    void postBackendWorkflowMessage(po, `[SYSTEM] Customer approved variation for ${po}. Partner may now submit project complete.`);
                    setVariationApproveModal(null);
                    setActiveTab('requests');
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
                >{locale === "th" ? "อนุมัติการเปลี่ยนแปลง" : locale === "zh" ? "批准变更" : "Approve Variation"}</button>
                <button onClick={() => setVariationApproveModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">{locale === "th" ? "ยกเลิก" : locale === "zh" ? "取消" : "Cancel"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {completeApproveModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 bg-gray-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h3 className="text-white font-bold text-lg">{locale === "th" ? "ยืนยันงานเสร็จ" : locale === "zh" ? "确认工作完成" : "Confirm Job Complete"}</h3>
              <p className="text-green-100 text-sm mt-1">{completeApproveModal.po} · {getWorkflowStepBadgeLabel(10, 11, getWorkflowStepNameForLocale(10, locale), locale)}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <CustomerWorkflowModalMeta
                locale={locale}
                step={10}
                typeOfWork={completeApproveModal.title || String(completeApproveOrder?.serviceCategory || completeApproveOrder?.service || 'Project').replace(/_/g, ' ')}
                actionText={locale === "th" ? "ตรวจสอบคำขอยืนยันงานเสร็จและยืนยันเมื่อโครงการเสร็จสมบูรณ์จริง" : locale === "zh" ? "查看完成请求，并在项目确实完成后确认。" : "Review the completion request and confirm it when the project is truly complete."}
                po={completeApproveModal.po || '-'}
                partnerName={firstNameOnly(completeApproveModal.customer || completeApproveOrder?.customer || completeApproveOrder?.fixerName, locale === "th" ? "พาร์ทเนอร์" : locale === "zh" ? "合作伙伴" : "Partner")}
                budget={toCurrencyLabel(completeApproveModal.budget || completeApproveOrder?.budget || completeApproveOrder?.fee)}
                location={(() => {
                  const lat = Number(completeApproveOrder?.address?.latitude);
                  const lng = Number(completeApproveOrder?.address?.longitude);
                  if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
                    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                  }
                  return completeApproveOrder?.address?.subdistrict || completeApproveOrder?.subdistrict || completeApproveOrder?.location || completeApproveModal?.location || completeApproveModal?.subdistrict || (locale === "th" ? "ไม่ทราบ" : locale === "zh" ? "未知" : "Unknown");
                })()}
                projectDetails={stripWorkflowPrefix(completeApproveOrder?.description || completeApproveModal.desc || completeApproveModal.title || '')}
              />
              {(completeApproveMeeting?.when || completeApproveMeeting?.venue) && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm">
                  <div className="font-bold text-green-900">Confirmed Site Meeting</div>
                  {completeApproveMeeting.when && <div className="text-green-800">Time: {completeApproveMeeting.when}</div>}
                  {completeApproveMeeting.venue && <div className="text-green-800">Venue: {completeApproveMeeting.venue}</div>}
                </div>
              )}
              {(() => {
                const brkPo = completeApproveModal.po;
                let bd: BudgetBreakdownItem[] | null = null;
                try {
                  // 1. Compute fresh using priceList
                  const pl = resolvePartnerPriceList(brkPo);
                  const desc = String(completeApproveOrder?.description || completeApproveModal.desc || '');
                  if (pl.length > 0 && desc) {
                    const computed = computeBudgetBreakdown(desc, pl);
                    if (computed && computed.length > 0) bd = computed;
                  }
                  // 2. Fall back to stored breakdown
                  if (!bd || bd.length === 0) bd = readStoredBreakdown(brkPo);
                } catch {}
                if (!bd || bd.length === 0) return null;
                return (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Budget Breakdown</div>
                    <div className="font-mono text-xs space-y-0.5">
                      {bd.map((it, i) => (
                        <div key={i} className="flex justify-between gap-2">
                          <span className="text-gray-600">{i+1}) {it.service} {it.qty.toLocaleString()} {it.unit} × ฿{it.unitRate.toLocaleString()}</span>
                          <span className="font-semibold text-green-700 shrink-0">= ฿{it.total.toLocaleString()}</span>
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
                const variationItems = readStoredVariationPriceList(completeApproveModal.po);
                if (variationItems.length === 0) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Variation Price List</div>
                    <div className="text-sm text-amber-900 space-y-1">
                      {variationItems.map((item, index) => (
                        <p key={`${item.item}-${index}`}>{formatVariationPriceListItem(item, index)}</p>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Completion Note</label>
                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 whitespace-pre-wrap">{String(completeApproveModal.desc || '').replace(/^Partner completion request:\s*/i, '').trim() || completeApproveModal.desc}</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    const createdAt = Date.now();
                    const po = completeApproveModal.po;
                    const meetingSnapshot = getWorkflowMeetingSnapshot(po, completeApproveModal);
                    const meetingFields = {
                      meetingDate: completeApproveModal.meetingDate || '',
                      meetingTime: completeApproveModal.meetingTime || '',
                      meetingVenue: meetingSnapshot.venue || completeApproveModal.meetingVenue || completeApproveModal.venue || '',
                      venue: meetingSnapshot.venue || completeApproveModal.venue || completeApproveModal.meetingVenue || '',
                    };
                    const backendOrder = workflowOrders.find((o: any) => extractPo(o) === po);
                    const token = getCustomerDashboardToken();
                    const rateReq = {
                      id: `rate-${po}`,
                      po,
                      title: completeApproveModal.title,
                      customer: completeApproveModal.customer,
                      date: fmtDateTime(createdAt),
                      createdAt,
                      budget: completeApproveModal.budget,
                      tier: completeApproveModal.tier,
                      desc: 'Job complete! Please rate your partner and close this project.',
                      type: 'rate_pending',
                      step: 11,
                      ...meetingFields,
                    };
                    const existingActive = mockActiveItems.find((x: any) => x.po === po);
                    const activeSnapshot = {
                      ...(existingActive || completeApproveModal),
                      po,
                      step: 11,
                      mockStep: 11,
                      actionNeeded: true,
                      ...meetingFields,
                    };
                    const newActive = [...mockActiveItems.filter((x: any) => x.po !== po), activeSnapshot];
                    const newReqs = [...mockDynRequests.filter((x: any) => !(x.po === po && ['complete_pending', 'variation_pending', 'meeting_pending_partner', 'meeting_scheduled'].includes(x.type))), rateReq];
                    const partnerReqs = JSON.parse(localStorage.getItem('partner_mock_dyn_req') || '[]') as any[];
                    const ratePartnerId = `rate-partner-${po}`;
                    const updatedPartnerReqs = [
                      ...partnerReqs.filter((x: any) => !(x.po === po && ['complete_partner', 'variation_partner', 'meeting_confirm_partner', 'rate_partner'].includes(x.type))),
                      { id: ratePartnerId, po, title: completeApproveModal.title, customer: completeApproveModal.customer, date: fmtDateTime(createdAt), createdAt, budget: completeApproveModal.budget, tier: completeApproveModal.tier, desc: 'Customer confirmed completion. Please rate the customer to close this job.', type: 'rate_partner', step: 11, ...meetingFields },
                    ];
                    try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
                    writeWorkflowStorage('ghis_mock_active', newActive);
                    writeWorkflowStorage('ghis_mock_dyn_req', newReqs);
                    writeWorkflowStorage('partner_mock_dyn_req', updatedPartnerReqs);
                    try {
                      const partnerAlerts = JSON.parse(localStorage.getItem('partner_alerts') || '[]');
                      const completeAlert = {
                        id: `alert-complete-${po}-${createdAt}`,
                        type: 'complete_confirmed',
                        po,
                        title: 'Job Complete Approved',
                        message: `${po}: Customer confirmed project complete. Next: rate the customer to close this job and move it to history.`,
                        msgTh: `${po}: ลูกค้ายืนยันงานเสร็จแล้ว ขั้นตอนถัดไปคือให้คะแนนลูกค้าเพื่อปิดงานและย้ายไปประวัติ`,
                        msgZh: `${po}: 客户已确认项目完工。下一步：评价客户以关闭此工作并移入历史。`,
                        timestamp: new Date(createdAt).toISOString(),
                        createdAt,
                        dot: 'bg-sky-500',
                      };
                      writeWorkflowStorage('partner_alerts', [
                        completeAlert,
                        ...(Array.isArray(partnerAlerts) ? partnerAlerts.filter((a: any) => String(a?.id) !== completeAlert.id) : []),
                      ]);
                    } catch {}
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new Event('cblue-workflow-updated'));
                    setMockActiveItems(newActive);
                    setMockDynRequests(newReqs);
                    if (token && backendOrder?.id) {
                      fetch(`/api/v1/orders/${backendOrder.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: 'COMPLETED', note: 'Customer confirmed project complete.' }),
                      }).catch(() => {});
                    }
                    const chatText = `[SYSTEM] Customer confirmed job complete for ${po}. Next: rating is now open for both parties. Chat room is now closed.`;
                    appendLocalWorkflowChat(po, chatText, createdAt);
                    void postBackendWorkflowMessage(po, chatText);
                    setCompleteApproveModal(null);
                    setActiveTab('requests');
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
                >Confirm Complete</button>
                <button onClick={() => setCompleteApproveModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {cancelJobModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 bg-gray-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mx-auto">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
              <h3 className="text-white font-bold text-lg">{locale === "th" ? "ยืนยันการยกเลิกงาน" : locale === "zh" ? "确认取消工作" : "Confirm Job Cancellation"}</h3>
              <p className="text-orange-50 text-sm mt-1">{cancelJobModal.po || cancelJobModal.id} · {cancelJobModal.title || cancelJobModal.service}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                {locale === "th"
                  ? "กรุณาระบุเหตุผลการยกเลิก ข้อมูลงาน คำขอ แจ้งเตือน และแชทจะถูกย้ายไปไว้ในประวัติ"
                  : locale === "zh"
                  ? "请输入取消原因。该工作的请求、通知和聊天将移至历史记录。"
                  : "Please enter the cancellation reason. This job, its requests, alerts, and chat will be moved to History."}
              </p>
              <textarea
                value={cancelJobReason}
                onChange={(e) => setCancelJobReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder={locale === "th" ? "เหตุผลการยกเลิก..." : locale === "zh" ? "取消原因..." : "Cancellation reason..."}
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    const reason = cancelJobReason.trim();
                    if (!reason) {
                      alert(locale === "th" ? "กรุณาระบุเหตุผลการยกเลิก" : locale === "zh" ? "请输入取消原因" : "Please enter a cancellation reason.");
                      return;
                    }
                    const item = cancelJobModal;
                    const po = String(item.po || item.poNumber || '').trim();
                    const createdAt = Date.now();
                    const serviceName = item.title || item.service || item.propertyTitle || 'this job';
                    const backendOrder = workflowOrders.find((order: any) => extractPo(order) === po);
                    if (!isWorkflowOrderCancellable(backendOrder || item)) {
                      setCancelJobModal(null);
                      setCancelJobReason("");
                      return;
                    }
                    let backendOrderId = backendOrder?.id || item.orderId || (isOrderUuid(item.id) ? item.id : '');
                    if (!backendOrderId && po) {
                      // Cross-browser cancel requires the backend order id so the partner
                      // (a different browser) receives CANCELLED via polling. Fall back to
                      // the po->order map used by the rest of the workflow.
                      try { backendOrderId = String(localStorage.getItem(`po_to_order_${po}`) || '').trim(); } catch {}
                    }
                    const isPropertyCancel = isPropPoCode(po) || item.isPropertyJob || item.propInquiry;
                    const customerChatText = `[SYSTEM] Customer cancelled ${serviceName} (${po}). Reason: ${reason}. This job has been moved to History.`;
                    const historyEntry = {
                      ...item,
                      po,
                      service: serviceName,
                      status: "CANCELLED",
                      statusName: "Cancelled by Customer",
                      stepName: "Cancelled by Customer",
                      cancelReason: reason,
                      statusNote: `Customer cancelled. Reason: ${reason}`,
                      projectDetails: pickProjectDetails(po, item.projectDetails, item.description, item.desc, backendOrder?.description),
                      description: pickProjectDetails(po, item.projectDetails, item.description, item.desc, backendOrder?.description),
                      completedAt: createdAt,
                      statusChangedAt: createdAt,
                      date: fmtDateTime(createdAt),
                      chatHistory: readStoredChatHistory(po),
                    };
                    const cancelAlert = {
                      id: `cancel-${po}-${createdAt}`,
                      po,
                      type: 'notice',
                      msg: `${po || 'Order'}: You cancelled ${serviceName}. Reason: ${reason}. The job has been moved to History.`,
                      msgTh: `${po || 'ออเดอร์'}: คุณยกเลิก ${serviceName} เหตุผล: ${reason} งานถูกย้ายไปประวัติแล้ว`,
                      msgZh: `${po || '订单'}: 您已取消 ${serviceName}。原因：${reason}。该工作已移至历史记录。`,
                      time: fmtDateTime(createdAt),
                      createdAt,
                      dot: 'bg-orange-500',
                    };
                    const partnerCancelAlert = {
                      id: `customer-cancel-${po}-${createdAt}`,
                      type: 'customer_cancelled',
                      po,
                      title: 'Job Cancelled by Customer',
                      message: `${po}: Customer cancelled ${serviceName}. Reason: ${reason}. This job has been moved to History.`,
                      msgTh: `${po}: ลูกค้ายกเลิก ${serviceName}. เหตุผล: ${reason}. งานถูกย้ายไปประวัติแล้ว`,
                      msgZh: `${po}: 客户已取消 ${serviceName}。原因：${reason}。该工作已移至历史记录。`,
                      timestamp: new Date(createdAt).toISOString(),
                      createdAt,
                      dot: 'bg-orange-500',
                    };
                    try {
                      const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
                      writeWorkflowStorage("ghis_mock_active", active.filter((x: any) => x.po !== po));
                      const reqs = JSON.parse(localStorage.getItem("ghis_mock_dyn_req") || "[]");
                      writeWorkflowStorage("ghis_mock_dyn_req", reqs.filter((x: any) => x.po !== po));
                      const partnerReqs = JSON.parse(localStorage.getItem("partner_mock_dyn_req") || "[]");
                      writeWorkflowStorage("partner_mock_dyn_req", partnerReqs.filter((x: any) => x.po !== po));
                      try {
                        const chatKey = `chat_messages_${po}`;
                        const existingChat = JSON.parse(localStorage.getItem(chatKey) || '[]');
                        const nextChat = Array.isArray(existingChat) ? [...existingChat] : [];
                        if (!nextChat.some((row: any) => String(row?.text || '') === customerChatText)) {
                          nextChat.push({
                            id: `customer-cancel-${po}-${createdAt}`,
                            sender: 'system',
                            text: customerChatText,
                            time: fmtDateTime(createdAt),
                            createdAt,
                          });
                          localStorage.setItem(chatKey, JSON.stringify(nextChat));
                        }
                      } catch {}
                      try { localStorage.setItem(`chat_closed_${po}`, '1'); } catch {}
                      const hist = JSON.parse(localStorage.getItem("ghis_mock_history") || "[]");
                      const nextHistory = [...(Array.isArray(hist) ? hist.filter((x: any) => x.po !== po) : []), historyEntry];
                      pruneStorageIfNeeded();
                      writeWorkflowStorage("ghis_mock_history", nextHistory);
                      const existingAlerts = JSON.parse(localStorage.getItem(customerAlertsStorageKey) || '[]');
                      const nextAlerts = [cancelAlert, ...(Array.isArray(existingAlerts) ? existingAlerts.filter((a: any) => a.id !== cancelAlert.id) : [])]
                        .sort((a: any, b: any) => parseDateMs(b.createdAt || b.time) - parseDateMs(a.createdAt || a.time))
                        .slice(0, 20);
                      writeWorkflowStorage(customerAlertsStorageKey, nextAlerts);
                      const partnerAlerts = JSON.parse(localStorage.getItem('partner_alerts') || '[]');
                      const nextPartnerAlerts = [partnerCancelAlert, ...(Array.isArray(partnerAlerts) ? partnerAlerts.filter((a: any) => a.id !== partnerCancelAlert.id) : [])]
                        .sort((a: any, b: any) => parseDateMs(b.createdAt || b.timestamp || b.time) - parseDateMs(a.createdAt || a.timestamp || a.time))
                        .slice(0, 20);
                      writeWorkflowStorage('partner_alerts', nextPartnerAlerts);
                      setPersistedCustomerAlerts(nextAlerts);
                      setMockActiveItems((prev) => prev.filter((x: any) => x.po !== po));
                      setMockDynRequests((prev) => prev.filter((x: any) => x.po !== po));
                      setMockHistory(nextHistory);
                      window.dispatchEvent(new Event("storage"));
                      window.dispatchEvent(new Event("cblue-workflow-updated"));
                      window.dispatchEvent(new CustomEvent('cblue-chat-updated', { detail: { orderId: po } }));
                    } catch (cancelErr) { console.error("Cancel job error:", cancelErr); }
                    const token = getCustomerDashboardToken();
                    if (isPropertyCancel && item.propInquiry?.id) {
                      void updatePropInquiry(item.propInquiry.id, { status: 'CANCELLED' }, po);
                    }
                    if (backendOrderId && token && isWorkflowOrderCancellable(backendOrder || item)) {
                      try { localStorage.setItem(`po_to_order_${po}`, backendOrderId); } catch {}
                      fetch(`/api/v1/orders/${backendOrderId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: 'CANCELLED', note: `Customer cancelled. Reason: ${reason}` }),
                      }).catch(() => {});
                    }
                    setCancelJobModal(null);
                    setCancelJobReason("");
                    setActiveTab("history");
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
                >
                  {locale === "th" ? "ยืนยันยกเลิก" : locale === "zh" ? "确认取消" : "Confirm Cancel"}
                </button>
                <button
                  onClick={() => { setCancelJobModal(null); setCancelJobReason(""); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm"
                >
                  {locale === "th" ? "ปิด" : locale === "zh" ? "关闭" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
