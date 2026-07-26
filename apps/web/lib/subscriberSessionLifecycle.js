export const SUBSCRIBER_SESSION_REVISION_KEY = "cblue_subscriber_session_revision";

function readRevision(storage) {
  const value = Number.parseInt(storage.getItem(SUBSCRIBER_SESSION_REVISION_KEY) || "0", 10);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function captureSubscriberRefresh(storage, token) {
  return { revision: readRevision(storage), token };
}

export function invalidateSubscriberSession(storage) {
  const nextRevision = readRevision(storage) + 1;
  storage.setItem(SUBSCRIBER_SESSION_REVISION_KEY, String(nextRevision));
  return nextRevision;
}

export function isSubscriberRefreshCurrent(storage, refresh) {
  return readRevision(storage) === refresh.revision &&
    storage.getItem("subscriber_token") === refresh.token;
}
