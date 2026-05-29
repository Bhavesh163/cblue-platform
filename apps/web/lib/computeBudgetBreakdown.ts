/**
 * Shared budget breakdown computation utility.
 * Used by fixers/page.tsx, FixerResults.tsx, and dashboard/page.tsx
 * to compute a correct multi-service breakdown from a project description
 * and a partner's priceList, without relying on possibly-stale backend data.
 */

export type BudgetBreakdownItem = {
  service: string;
  qty: number;
  unit: string;
  unitRate: number;
  total: number;
};

export type VariationPriceListItem = {
  item: string;
  qty: number | null;
  unit: string;
  rate: number | null;
  amount: number | null;
};

/** Strip the workflow metadata prefix prepended to order descriptions */
const stripPrefix = (value: unknown): string =>
  String(value || '').replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?(LOC:[^|]+\|\s*)?/i, '').trim();

const toNumericValue = (value: unknown): number | null => {
  const raw = String(value || '').replace(/[^0-9.]/g, '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDisplayNumber = (value: number | null): string => {
  if (value == null || !Number.isFinite(value)) return '';
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const extractVariationPriceListSection = (value: unknown): string => {
  const text = String(value || '').trim();
  if (!text) return '';

  const explicitSection = text.match(/(?:^|\n)Price List:\s*([\s\S]*)$/i)?.[1];
  if (explicitSection) return explicitSection.trim();

  return /^(?:\s*(?:[-•]|\d+\)))\s/m.test(text) ? text : '';
};

const parseVariationPriceListLine = (value: string): VariationPriceListItem | null => {
  const normalizedLine = String(value || '')
    .trim()
    .replace(/^\s*(?:[-•]|\d+\))\s*/, '')
    .trim();
  if (!normalizedLine) return null;

  if (normalizedLine.includes('|')) {
    const parts = normalizedLine.split('|').map((part) => part.trim()).filter(Boolean);
    const qtyUnitMatch = parts[1]?.match(/([\d,]+(?:\.\d+)?)\s+(.+)/i);
    return {
      item: parts[0] || normalizedLine,
      qty: toNumericValue(qtyUnitMatch?.[1]),
      unit: String(qtyUnitMatch?.[2] || '').trim(),
      rate: toNumericValue(parts[2]),
      amount: toNumericValue(parts[3]),
    };
  }

  const formattedMatch = normalizedLine.match(
    /^(.*?)\s+(\d[\d,]*(?:\.\d+)?)\s+(.+?)\s+x\s*฿([\d,]+(?:\.\d+)?)\/unit\s*=\s*฿([\d,]+(?:\.\d+)?)$/i,
  );
  if (formattedMatch) {
    return {
      item: formattedMatch[1]?.trim() || normalizedLine,
      qty: toNumericValue(formattedMatch[2]),
      unit: String(formattedMatch[3] || '').trim(),
      rate: toNumericValue(formattedMatch[4]),
      amount: toNumericValue(formattedMatch[5]),
    };
  }

  return {
    item: normalizedLine,
    qty: null,
    unit: '',
    rate: null,
    amount: null,
  };
};

/**
 * Parse a project description and a partner's priceList to build a line-item
 * budget breakdown.
 *
 * Two passes:
 *   1. Strict  — numbers with an explicit area/unit keyword (sqm, m², unit …)
 *   2. Loose   — unitless numbers ≥ 10 whose 80-char forward context contains
 *                at least one keyword from the priceList (score ≥ 1).
 *                Numbers whose context scores 0 (e.g. "10 page", "100 FAQ")
 *                are SKIPPED to prevent phantom line items.
 *
 * Each quantity is matched to the best-scoring service in the priceList.
 * On a tie the cheaper service wins (mirrors the backend tiebreaker).
 */
export function computeBudgetBreakdown(
  description: string,
  priceList: unknown[],
  _totalOverride?: number
): BudgetBreakdownItem[] | null {
  if (!priceList || priceList.length === 0 || !description) return null;
  const pl = priceList as Array<Record<string, unknown>>;

  const cleanDesc = stripPrefix(description)
    .toLowerCase()
    .replace(/fit\s*[-\s]?out/g, 'fitout')
    .replace(/re\s*instate(ment)?/g, 'reinstatement');

  // ── Strict pass ──────────────────────────────────────────────────────────
  const strictPat = /(\d[\d,]*\.?\d*)\s*(sqm|m2|sq\.?m\.?|m²|ตร\.?ม\.?|ตารางเมตร|sq\.?ft\.?|unit)/gi;
  const pairs: Array<{ qty: number; idx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = strictPat.exec(cleanDesc)) !== null) {
    const qty = parseFloat((m[1] ?? '').replace(/,/g, ''));
    if (!isNaN(qty) && qty > 0 && qty < 1_000_000) pairs.push({ qty, idx: m.index });
  }

  // ── Loose pass ───────────────────────────────────────────────────────────
  const strictIndices = pairs.map(p => p.idx);
  const loosePat = /(?<!\d)(\d{2,6})(?!\s*(?:sqm|m2|sq\.?m|m²|ตร|unit|,\d|[.,]\d))/gi;
  const filler = new Set([
    'and', 'the', 'a', 'an', 'of', 'in', 'at', 'for', 'with', 'to',
    'sqm', 'sq', 'm2', 'unit', 'units', 'per', 'i', 'have', 'want', 'need',
  ]);
  const tokenize = (text: string) =>
    text.split(/[\s.,]+/).filter(t => t.length > 1 && !filler.has(t) && isNaN(parseFloat(t)));

  let lm: RegExpExecArray | null;
  while ((lm = loosePat.exec(cleanDesc)) !== null) {
    const qty = parseFloat((lm[1] ?? '').replace(/,/g, ''));
    if (isNaN(qty) || qty < 10 || qty >= 1_000_000) continue;
    // Skip if the strict pass already captured a nearby number
    if (strictIndices.some(idx => Math.abs(idx - lm!.index) < 4)) continue;

    const win = cleanDesc.slice(lm.index, Math.min(lm.index + 80, cleanDesc.length));
    const toks = tokenize(win);
    let bestScore = 0;
    for (const item of pl) {
      const itemText = `${item['service'] ?? ''} ${item['unit'] ?? ''}`
        .toLowerCase()
        .replace(/fit\s*[-\s]?out/g, 'fitout')
        .replace(/re\s*instate(ment)?/g, 'reinstatement');
      const score = toks.filter(t => itemText.includes(t)).length;
      if (score > bestScore) bestScore = score;
    }
    // Only include if context scores against at least one priceList service
    if (bestScore >= 1) pairs.push({ qty, idx: lm.index });
  }

  pairs.sort((a, b) => a.idx - b.idx);
  if (pairs.length === 0) return null;

  // ── Match each qty to best service ───────────────────────────────────────
  const matchToService = (tokens: string[]) => {
    let best = pl[0]!;
    let bestScore = -1;
    for (const item of pl) {
      const itemText = `${item['service'] ?? ''} ${item['unit'] ?? ''}`
        .toLowerCase()
        .replace(/fit\s*[-\s]?out/g, 'fitout')
        .replace(/re\s*instate(ment)?/g, 'reinstatement');
      const score = tokens.filter(t => itemText.includes(t)).length;
      const cheaper =
        (parseFloat(String(item['finalPrice'] ?? 0)) || Infinity) <
        (parseFloat(String(best['finalPrice'] ?? 0)) || Infinity);
      if (score > bestScore || (score === bestScore && score >= 0 && cheaper)) {
        bestScore = score;
        best = item;
      }
    }
    return best;
  };

  const breakdown: BudgetBreakdownItem[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]!;
    const nextPair = pairs[i + 1];
    const end = nextPair ? nextPair.idx : cleanDesc.length;
    const window = cleanDesc.slice(pair.idx, end);
    const tokens = tokenize(window).length > 0 ? tokenize(window) : tokenize(cleanDesc);
    const item = matchToService(tokens);
    const partnerQty = parseFloat(String(item['amount'] ?? item['quantity'] ?? 1)) || 1;
    const unitRate = Math.round((parseFloat(String(item['finalPrice'] ?? 0)) || 0) / partnerQty);
    breakdown.push({
      service: String(item['service'] ?? `Service ${i + 1}`),
      qty: pair.qty,
      unit: String(item['unit'] ?? 'sqm'),
      unitRate,
      total: Math.round(unitRate * pair.qty),
    });
  }

  return breakdown.length > 0 ? breakdown : null;
}

/** Read a stored breakdown from localStorage, return null if missing/corrupt */
export function readStoredBreakdown(po: string): BudgetBreakdownItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`cblue_po_breakdown_${po}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as BudgetBreakdownItem[];
  } catch {
    return null;
  }
}

export function stripVariationPriceList(value: unknown): string {
  return String(value || '').replace(/\n*\s*Price List:\s*[\s\S]*$/i, '').trim();
}

export function parseVariationPriceList(value: unknown): VariationPriceListItem[] {
  const section = extractVariationPriceListSection(value);
  if (!section) return [];

  return section
    .split(/\n+/)
    .map((line) => parseVariationPriceListLine(line))
    .filter((line): line is VariationPriceListItem => Boolean(line?.item));
}

export function formatVariationPriceListItem(
  item: VariationPriceListItem,
  index: number,
): string {
  const qtyLabel = item.qty != null ? ` ${toDisplayNumber(item.qty)}${item.unit ? ` ${item.unit}` : ''}` : '';
  const rateLabel = item.rate != null ? ` x ฿${toDisplayNumber(item.rate)}/unit` : '';
  const computedAmount = item.amount != null
    ? item.amount
    : item.qty != null && item.rate != null
    ? item.qty * item.rate
    : null;
  const amountLabel = computedAmount != null ? ` = ฿${toDisplayNumber(computedAmount)}` : '';
  return `${index + 1}) ${item.item}${qtyLabel}${rateLabel}${amountLabel}`.trim();
}

export function formatVariationPriceListText(items: VariationPriceListItem[]): string {
  return items.map((item, index) => formatVariationPriceListItem(item, index)).join('\n');
}

export function readStoredVariationPriceList(po: string): VariationPriceListItem[] {
  if (typeof window === 'undefined' || !po) return [];
  try {
    const raw = localStorage.getItem(`cblue_variation_price_list_${po}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as VariationPriceListItem[]) : [];
  } catch {
    return [];
  }
}

export function storeVariationPriceList(
  po: string,
  items: VariationPriceListItem[],
): void {
  if (typeof window === 'undefined' || !po) return;
  try {
    if (!items || items.length === 0) {
      localStorage.removeItem(`cblue_variation_price_list_${po}`);
      return;
    }
    localStorage.setItem(`cblue_variation_price_list_${po}`, JSON.stringify(items));
  } catch {
    // non-blocking
  }
}

/** Resolve priceList from various localStorage keys, in priority order */
export function resolvePartnerPriceList(po?: string): unknown[] {
  if (typeof window === 'undefined') return [];
  const tryParse = (key: string): unknown[] => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  };
  if (po) {
    const fromPo = tryParse(`cblue_partner_pricelist_${po}`);
    if (fromPo.length > 0) return fromPo;
  }
  return tryParse('cblue_partner_pricelist_general');
}

/** Render props for a budget breakdown block */
export interface BudgetBreakdownResult {
  items: BudgetBreakdownItem[];
  total: number;
}

/**
 * Compute breakdown with full fallback chain:
 *   1. Read from localStorage cblue_po_breakdown_{po}
 *   2. Compute fresh using computeBudgetBreakdown(desc, priceList)
 *   3. Return null if both fail
 * Writes result back to localStorage when freshly computed.
 */
export function resolveBreakdown(
  po: string,
  description: string,
  priceList: unknown[],
): BudgetBreakdownResult | null {
  // 1. Try stored breakdown
  let items = readStoredBreakdown(po);

  // 2. Recompute if missing
  if (!items || items.length === 0) {
    items = computeBudgetBreakdown(description, priceList);
    if (items && items.length > 0 && typeof window !== 'undefined') {
      try { localStorage.setItem(`cblue_po_breakdown_${po}`, JSON.stringify(items)); } catch { /* quota */ }
    }
  }

  if (!items || items.length === 0) return null;
  return { items, total: items.reduce((s, it) => s + (it.total ?? 0), 0) };
}
