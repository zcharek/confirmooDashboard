// Configuration de l'API ClickUp

export const CLICKUP_CONFIG = {
  BASE_URL: "https://api.clickup.com/api/v2",
  ENDPOINTS: {
    TEAMS: "/team",
    WORKSPACES: "/team", // Alias pour plus de clarté
    SPACES: "/team/{workspaceId}/space",
    FOLDERS: "/space/{spaceId}/folder",
    LISTS: "/space/{spaceId}/list",
    TASKS: "/list/{listId}/task",
    TASK: "/task/{taskId}",
    COMMENTS: "/task/{taskId}/comment",
    TIME_ENTRIES: "/task/{taskId}/time",
    ATTACHMENTS: "/task/{taskId}/attachment",
  },
};

// Fonction pour obtenir la configuration dynamique
export const getClickUpConfig = () => ({
  API_TOKEN:
    import.meta.env.VITE_CLICKUP_API_TOKEN ||
    "pk_93658239_PLH3U54JULKSERXG8MXG6EAQU2R5U0TD",
  WORKSPACE_ID: import.meta.env.VITE_CLICKUP_WORKSPACE_ID || "9012576963",
  SPRINT_FOLDER_ID:
    import.meta.env.VITE_CLICKUP_SPRINT_FOLDER_ID || "90123818313",
  BASE_URL: CLICKUP_CONFIG.BASE_URL,
  ENDPOINTS: CLICKUP_CONFIG.ENDPOINTS,
});

// Types d'API ClickUp
export interface ClickUpAPIResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Types d'erreur ClickUp
export interface ClickUpError {
  err: string;
  ECODE: string;
  message?: string;
}

// Headers par défaut pour les requêtes API
export const getClickUpHeaders = () => {
  const config = getClickUpConfig();
  return {
    Authorization: config.API_TOKEN,
    "Content-Type": "application/json",
  };
};

// Fonction utilitaire pour construire les URLs
export const buildClickUpURL = (
  endpoint: string,
  params: Record<string, string> = {}
) => {
  let url = `${CLICKUP_CONFIG.BASE_URL}${endpoint}`;

  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, value);
  });

  return url;
};

// Fonction pour gérer les erreurs ClickUp
export const handleClickUpError = (error: any): string => {
  if (error.err && error.ECODE) {
    switch (error.ECODE) {
      case "OAUTH_027":
        return `Erreur d'autorisation: ${error.err}. Vérifiez que votre token API a les bonnes permissions.`;
      case "OAUTH_001":
        return `Token API invalide: ${error.err}. Vérifiez votre token ClickUp.`;
      case "OAUTH_002":
        return `Token API expiré: ${error.err}. Régénérez votre token.`;
      case "OAUTH_003":
        return `Permissions insuffisantes: ${error.err}. Vérifiez les droits de votre token.`;
      default:
        return `Erreur ClickUp (${error.ECODE}): ${error.err}`;
    }
  }

  if (error.status === 401) {
    return "Erreur d'authentification: Vérifiez votre token API ClickUp.";
  }

  if (error.status === 403) {
    return "Accès refusé: Vérifiez les permissions de votre token API.";
  }

  if (error.status === 404) {
    return "Ressource non trouvée: Vérifiez l'ID du workspace ou de l'espace.";
  }

  if (error.status >= 500) {
    return "Erreur serveur ClickUp. Réessayez plus tard.";
  }

  return `Erreur inconnue: ${
    error.message || "Impossible de récupérer les données ClickUp."
  }`;
};

// Fonction pour valider la configuration
export const validateClickUpConfig = (): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  const config = getClickUpConfig();

  // Vérifier si le token est défini et valide
  if (!config.API_TOKEN) {
    errors.push("Token API ClickUp non configuré");
  } else if (!config.API_TOKEN.startsWith("pk_")) {
    errors.push('Format de token API invalide (doit commencer par "pk_")');
  } else if (
    config.API_TOKEN === "pk_93658239_PLH3U54JULKSERXG8MXG6EAQU2R5U0TD" &&
    !import.meta.env.VITE_CLICKUP_API_TOKEN
  ) {
    // Si on utilise le token par défaut et qu'aucune variable d'environnement n'est définie
    errors.push(
      "Token API ClickUp non configuré - utilisez VITE_CLICKUP_API_TOKEN"
    );
  }

  // Vérifier le workspace ID
  if (!config.WORKSPACE_ID) {
    errors.push("ID du workspace ClickUp non configuré");
  } else if (
    config.WORKSPACE_ID === "9012576963" &&
    !import.meta.env.VITE_CLICKUP_WORKSPACE_ID
  ) {
    // Si on utilise l'ID par défaut et qu'aucune variable d'environnement n'est définie
    errors.push(
      "ID du workspace ClickUp non configuré - utilisez VITE_CLICKUP_WORKSPACE_ID"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
