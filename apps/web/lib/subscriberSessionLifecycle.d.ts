export const SUBSCRIBER_SESSION_REVISION_KEY: string;

export interface SubscriberRefreshSnapshot {
  revision: number;
  token: string;
}

export interface StorageReader {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function captureSubscriberRefresh(
  storage: StorageReader,
  token: string,
): SubscriberRefreshSnapshot;

export function invalidateSubscriberSession(storage: StorageReader): number;

export function isSubscriberRefreshCurrent(
  storage: StorageReader,
  refresh: SubscriberRefreshSnapshot,
): boolean;
