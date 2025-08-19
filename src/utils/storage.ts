// Utilitaire pour gérer le stockage local des résultats de tests

export interface StoredTestRun {
  id: string;
  name: string;
  status: "passed" | "failed" | "running" | "pending";
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  lastUpdated: string;
  executionDate: string; // Date d'exécution (YYYY-MM-DD)
}

const STORAGE_KEY = "qase_test_runs_history";

export const TestRunStorage = {
  // Sauvegarder un nouveau résultat
  saveTestRun: (testRun: StoredTestRun) => {
    try {
      const existingData = localStorage.getItem(STORAGE_KEY);
      const history: StoredTestRun[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Vérifier si un résultat existe déjà pour cette date
      const existingIndex = history.findIndex(
        (run) =>
          run.executionDate === testRun.executionDate && run.id === testRun.id
      );

      if (existingIndex >= 0) {
        // Mettre à jour le résultat existant
        history[existingIndex] = testRun;
      } else {
        // Ajouter un nouveau résultat
        history.push(testRun);
      }

      // Garder seulement les 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const filteredHistory = history.filter(
        (run) => new Date(run.executionDate) >= thirtyDaysAgo
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));

      return true;
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      return false;
    }
  },

  // Récupérer l'historique complet
  getTestRunHistory: (): StoredTestRun[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("❌ Erreur lors de la récupération:", error);
      return [];
    }
  },

  // Récupérer les résultats pour une date spécifique
  getTestRunsForDate: (date: string): StoredTestRun[] => {
    const history = TestRunStorage.getTestRunHistory();
    return history.filter((run) => run.executionDate === date);
  },

  // Récupérer les résultats des 7 derniers jours
  getLastWeekResults: (): StoredTestRun[] => {
    const history = TestRunStorage.getTestRunHistory();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return history
      .filter((run) => new Date(run.executionDate) >= sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(a.executionDate).getTime() -
          new Date(b.executionDate).getTime()
      );
  },

  // Nettoyer l'historique (garder seulement les 30 derniers jours)
  cleanup: () => {
    const history = TestRunStorage.getTestRunHistory();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredHistory = history.filter(
      (run) => new Date(run.executionDate) >= thirtyDaysAgo
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
  },
};
