export async function fetchPartnerDashboardWithAuthRetry({
  endpoint,
  token,
  getToken,
  refreshBeforeRequest,
  refreshSession,
  readSubscriber,
  writeSession,
  fetchImpl = undefined,
}) {
  const doFetch = fetchImpl || fetch;
  let authToken = String(token || (typeof getToken === "function" ? getToken() : "") || "").trim();
  if (!authToken) {
    return { token: "", response: null };
  }

  if (typeof refreshBeforeRequest === "function") {
    const refreshed = await refreshBeforeRequest(authToken);
    if (refreshed) {
      authToken = refreshed;
      if (typeof writeSession === "function") {
        writeSession(typeof readSubscriber === "function" ? readSubscriber() : null, refreshed);
      }
    }
  }

  const send = async (bearerToken) => {
    try {
      return await doFetch(endpoint, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
    } catch {
      return null;
    }
  };

  let response = await send(authToken);
  if (response && [401, 403].includes(response.status) && typeof refreshSession === "function") {
    const refreshed = await refreshSession(authToken);
    if (refreshed) {
      authToken = refreshed;
      if (typeof writeSession === "function") {
        writeSession(typeof readSubscriber === "function" ? readSubscriber() : null, refreshed);
      }
      response = await send(authToken);
    }
  }

  return { token: authToken, response };
}
