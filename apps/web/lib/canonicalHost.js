export const CBLUE_CANONICAL_HOST = "cblue.co.th";

export function getCanonicalCblueUrl(requestUrl, requestHost) {
  const host = String(requestHost || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (host !== `www.${CBLUE_CANONICAL_HOST}`) return null;

  const url = new URL(requestUrl);
  url.protocol = "https:";
  url.hostname = CBLUE_CANONICAL_HOST;
  url.port = "";
  return url;
}
