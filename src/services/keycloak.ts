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

export default keycloak;
