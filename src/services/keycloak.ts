import Keycloak from "keycloak-js";

const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
if (!keycloakUrl) {
  throw new Error("VITE_KEYCLOAK_URL is not defined");
}

const keycloakConfig = {
  url: keycloakUrl,
  realm: "lumi",
  clientId: "tesla-admin-panel",
};

const keycloak = new Keycloak(keycloakConfig);

keycloak.onAuthSuccess = () => {
  setTimeout(() => "", 5000);
};

keycloak.onAuthError = (error) => {
  console.error("❌ Keycloak: Auth Error", error);
  setTimeout(() => "", 5000);
};

keycloak.onReady = (authenticated) => {
  setTimeout(() => "", 5000);
};

/**
 * The ONLY way any code in this app may refresh the token.
 *
 * Keycloak realm `lumi` has revokeRefreshToken=true + refreshTokenMaxReuse=0:
 * a refresh token is single-use, and TWO CONCURRENT refresh calls (e.g. the
 * AuthProvider interval racing the api.ts 401-retry) revoke the whole session
 * → instant logout. This wrapper makes refresh single-flight app-wide, and
 * retries transient (network) failures instead of failing the session.
 *
 * Returns true if the token is valid after the call, false if the session is
 * definitively gone (callers may then log out).
 */
let refreshInFlight: Promise<boolean> | null = null;

export const safeUpdateToken = (minValidity = 120): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await keycloak.updateToken(minValidity);
          return true; // valid (refreshed now, or still fresh enough)
        } catch {
          // keycloak-js gives no structured error — retry with backoff to
          // ride out network blips / Keycloak restarts, then give up.
          if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

export default keycloak;
