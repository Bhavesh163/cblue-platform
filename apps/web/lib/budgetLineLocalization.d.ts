export type BudgetLocale = "en" | "th" | "zh" | string;

export interface LocalizableBudgetItem {
  service: string;
  unit: string;
  serviceKey?: string;
  unitKey?: string;
  [key: string]: unknown;
}

export function canonicalBudgetServiceKey(
  service: unknown,
  serviceKey?: unknown,
): string | null;

export function canonicalBudgetUnitKey(
  unit: unknown,
  unitKey?: unknown,
): string | null;

export function enrichBudgetBreakdown<T extends LocalizableBudgetItem>(
  items: T[] | null | undefined,
): Array<T & { serviceKey?: string; unitKey?: string }>;

export function localizeBudgetBreakdown<T extends LocalizableBudgetItem>(
  items: T[] | null | undefined,
  locale: BudgetLocale,
): Array<T & { serviceKey?: string; unitKey?: string }>;

export function localizeBudgetServiceList(
  items: LocalizableBudgetItem[] | null | undefined,
  locale: BudgetLocale,
): string;
