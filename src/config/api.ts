// Configuration pour appeler l'API Qase
const QASE_API_TOKEN =
  "bea8b711a16a7f25442134a3c148eeccccbfe83687da4d763ce07eccda803e5a";
const QASE_PROJECT_CODE = "CONFIRMOO";

// En production, appeler directement l'API Qase
// En développement, utiliser le proxy Vite

export const QASE_CONFIG = {
  token: QASE_API_TOKEN,
  projectCode: QASE_PROJECT_CODE,
  baseUrl: "https://api.qase.io/v1",
};

// Fonction pour déterminer si on est en développement
const isDevelopment = () => {
  return import.meta.env.DEV || window.location.hostname === "localhost";
};

export const API_ENDPOINTS = {
  qaseRuns: isDevelopment()
    ? `/api/qase/run/${QASE_PROJECT_CODE}`
    : `${QASE_CONFIG.baseUrl}/run/${QASE_PROJECT_CODE}`,
  qaseCases: isDevelopment()
    ? `/api/qase/case/${QASE_PROJECT_CODE}`
    : `${QASE_CONFIG.baseUrl}/case/${QASE_PROJECT_CODE}`,
};

// Fonction pour obtenir l'URL avec proxy si nécessaire
export const getQaseUrl = (endpoint: string) => {
  if (isDevelopment()) {
    return endpoint;
  }

  // En production, essayer d'abord directement, puis avec proxy si CORS échoue
  return endpoint;
};
