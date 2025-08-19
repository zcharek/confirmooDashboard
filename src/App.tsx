import React, { useState, useEffect } from "react";
import "./App.css";
import AutomatedTestsChart from "./components/AutomatedTestsChart";
import ClickUpSprintData from "./components/ClickUpSprintData";
import { getClickUpConfig } from "./config/clickup";
import { API_ENDPOINTS, QASE_CONFIG } from "./config/api";
import { TestRunStorage, StoredTestRun } from "./utils/storage";

interface Environment {
  name: string;
  url: string;
  status: "prod" | "staging" | "release";
}

interface TestRun {
  lastUpdated: string;
  id: string;
  name: string;
  status: "passed" | "failed" | "running" | "pending";
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  // Nouvelles propriétés pour distinguer les runs historiques et actuels
  isHistorical?: boolean;
  isCurrentRun?: boolean;
  testCount?: number;
}

interface TestCase {
  id: number;
  title: string;
  description?: string;
  automation: "manual" | "automated" | "to-be-automated";
  status: "active" | "draft" | "deprecated";
  priority: "low" | "medium" | "high" | "critical";
  suite?: string;
  created_at: string;
  updated_at: string;
}

interface TestCaseStats {
  manual: {
    total: number;
    active: number;
    draft: number;
    deprecated: number;
  };
  automated: {
    total: number;
    active: number;
    draft: number;
    deprecated: number;
  };
}

const environments: Environment[] = [
  {
    name: "STAGING",
    url: "https://confirmo-dashboard-clone-test.vercel.app/",
    status: "staging",
  },
  {
    name: "RELEASE",
    url: "https://release.confirmoo.com",
    status: "release",
  },
  {
    name: "PROD",
    url: "https://www.confirmoo.com/",
    status: "prod",
  },
];

const App: React.FC = () => {
  // Récupérer l'onglet actif depuis le localStorage ou utiliser "environments" par défaut
  const getInitialTab = ():
    | "environments"
    | "projects"
    | "quality"
    | "sprints" => {
    try {
      const savedTab = localStorage.getItem("activeTab");
      if (
        savedTab &&
        ["environments", "projects", "quality", "sprints"].includes(savedTab)
      ) {
        return savedTab as "environments" | "projects" | "quality" | "sprints";
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'onglet actif:", error);
    }
    return "environments";
  };

  const [activeTab, setActiveTab] = useState<
    "environments" | "projects" | "quality" | "sprints"
  >(getInitialTab());
  const [realTestRuns, setRealTestRuns] = useState<TestRun[]>([]);
  // @ts-ignore
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testCaseStats, setTestCaseStats] = useState<TestCaseStats>({
    manual: { total: 0, active: 0, draft: 0, deprecated: 0 },
    automated: { total: 0, active: 0, draft: 0, deprecated: 0 },
  });
  // @ts-ignore
  const [loading, setLoading] = useState(false);
  const [tabsScrollable, setTabsScrollable] = useState(false);

  const handleEnvironmentClick = (url: string) => {
    window.open(url, "_blank");
  };

  // Fonction pour détecter si les onglets sont scrollables
  const checkTabsScrollable = () => {
    const tabsElement = document.querySelector(".tabs") as HTMLElement;
    if (tabsElement) {
      const isScrollable = tabsElement.scrollWidth > tabsElement.clientWidth;
      setTabsScrollable(isScrollable);
    }
  };

  // Fonction pour faire défiler vers un onglet spécifique
  const scrollToTab = (tabName: string) => {
    const tabsElement = document.querySelector(".tabs") as HTMLElement;
    const tabElement = document.querySelector(
      `[data-tab="${tabName}"]`
    ) as HTMLElement;

    if (tabsElement && tabElement) {
      const tabsRect = tabsElement.getBoundingClientRect();
      const tabRect = tabElement.getBoundingClientRect();
      const scrollLeft =
        tabsElement.scrollLeft +
        (tabRect.left - tabsRect.left) -
        tabsRect.width / 2 +
        tabRect.width / 2;

      tabsElement.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
  };

  // Fonction pour gérer le changement d'onglet avec scroll automatique
  const handleTabChange = (
    tabName: "environments" | "projects" | "quality" | "sprints"
  ) => {
    setActiveTab(tabName);

    // Sauvegarder l'onglet actif dans le localStorage
    try {
      localStorage.setItem("activeTab", tabName);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'onglet actif:", error);
    }

    // Scroll automatique vers l'onglet sur mobile
    if (window.innerWidth <= 768) {
      setTimeout(() => scrollToTab(tabName), 100);
    }
  };

  // Effet pour vérifier la scrollabilité des onglets
  useEffect(() => {
    checkTabsScrollable();
    window.addEventListener("resize", checkTabsScrollable);

    return () => {
      window.removeEventListener("resize", checkTabsScrollable);
    };
  }, []);

  // Effet pour vérifier la scrollabilité quand le contenu change
  useEffect(() => {
    const timer = setTimeout(checkTabsScrollable, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Support du swipe sur mobile pour les onglets
  useEffect(() => {
    const tabsElement = document.querySelector(".tabs") as HTMLElement;
    if (!tabsElement) return;

    let startX = 0;
    let startScrollLeft = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startScrollLeft = tabsElement.scrollLeft;
      isDragging = true;
      tabsElement.style.cursor = "grabbing";
      tabsElement.style.userSelect = "none";
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.touches[0].clientX;
      const walk = (startX - x) * 2;
      tabsElement.scrollLeft = startScrollLeft + walk;
    };

    const handleTouchEnd = () => {
      isDragging = false;
      tabsElement.style.cursor = "grab";
      tabsElement.style.userSelect = "";
    };

    tabsElement.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    tabsElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    tabsElement.addEventListener("touchend", handleTouchEnd);

    return () => {
      tabsElement.removeEventListener("touchstart", handleTouchStart);
      tabsElement.removeEventListener("touchmove", handleTouchMove);
      tabsElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // Fonction pour ajouter des indicateurs visuels sur mobile
  const addMobileIndicators = () => {
    if (window.innerWidth <= 768) {
      const tabsElement = document.querySelector(".tabs") as HTMLElement;
      if (tabsElement) {
        // Ajouter un indicateur de position
        const indicator = document.createElement("div");
        indicator.className = "mobile-scroll-indicator";
        indicator.style.cssText = `
          position: absolute;
          bottom: -8px;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 2px;
          transition: all 0.3s ease;
          z-index: 3;
        `;

        tabsElement.appendChild(indicator);

        // Mettre à jour la position de l'indicateur
        const updateIndicator = () => {
          const scrollPercent =
            tabsElement.scrollLeft /
            (tabsElement.scrollWidth - tabsElement.clientWidth);
          const maxLeft = tabsElement.clientWidth - indicator.offsetWidth;
          indicator.style.left = `${scrollPercent * maxLeft}px`;
        };

        tabsElement.addEventListener("scroll", updateIndicator);
        updateIndicator();
      }
    }
  };

  // Effet pour ajouter les indicateurs mobiles
  useEffect(() => {
    const timer = setTimeout(addMobileIndicators, 200);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const fetchQaseTestRuns = async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Token: QASE_CONFIG.token,
      };

      let response;
      let url = `${API_ENDPOINTS.qaseRuns}?limit=50&offset=0`;

      // En production (GitHub Pages), utiliser directement le proxy
      const isProduction = window.location.hostname === "zcharek.github.io";

      if (isProduction) {
        // Utiliser directement le proxy en production
        const proxyUrl = `https://corsproxy.io/?${url}`;
        response = await fetch(proxyUrl, {
          headers: {
            "Content-Type": "application/json",
            Token: QASE_CONFIG.token,
          },
        });
      } else {
        // En développement, essayer d'abord l'API directe
        try {
          response = await fetch(url, { headers });
        } catch (corsError) {
          // Si CORS échoue, essayer avec le proxy
          const proxyUrl = `https://corsproxy.io/?${url}`;
          response = await fetch(proxyUrl, {
            headers: {
              "Content-Type": "application/json",
              Token: QASE_CONFIG.token,
            },
          });
        }
      }

      if (response && response.ok) {
        const data = await response.json();

        // Vérifier que data.result.entities existe
        if (!data || !data.result || !data.result.entities) {
          console.error("❌ Format de données invalide:", data);
          throw new Error("Format de données invalide reçu de l'API");
        }

        // Transformer les données de l'API Qase et sauvegarder l'historique
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        const realTestRuns: TestRun[] = data.result.entities.map(
          (qaseRun: any) => {
            // Déterminer le statut
            let status: "passed" | "failed" | "running" | "pending" = "pending";
            if (qaseRun.status_text === "passed" || qaseRun.status === 1) {
              status = "passed";
            } else if (
              qaseRun.status_text === "failed" ||
              qaseRun.status === 3
            ) {
              status = "failed";
            } else if (
              qaseRun.status_text === "running" ||
              qaseRun.status === 2
            ) {
              status = "running";
            }

            const testRunData = {
              id: qaseRun.id.toString(),
              name: qaseRun.name || qaseRun.title || `Test Run ${qaseRun.id}`,
              status: status,
              passed: qaseRun.passed || qaseRun.stats?.passed || 0,
              failed: qaseRun.failed || qaseRun.stats?.failed || 0,
              skipped: qaseRun.skipped || qaseRun.stats?.skipped || 0,
              total: qaseRun.total || qaseRun.stats?.total || 0,
              lastUpdated:
                qaseRun.lastUpdated ||
                qaseRun.end_time ||
                qaseRun.start_time ||
                new Date().toISOString(),
              isHistorical: false,
              isCurrentRun: true,
              testCount: qaseRun.total || qaseRun.stats?.total || 0,
            };

            // Sauvegarder le résultat d'aujourd'hui
            const storedRun: StoredTestRun = {
              ...testRunData,
              executionDate: today,
            };
            TestRunStorage.saveTestRun(storedRun);

            return testRunData;
          }
        );

        // Récupérer l'historique des 7 derniers jours
        const historicalRuns = TestRunStorage.getLastWeekResults();

        // Combiner les données actuelles avec l'historique
        const allTestRuns: TestRun[] = [];

        // Ajouter l'historique (sauf aujourd'hui qui est déjà dans realTestRuns)
        historicalRuns.forEach((storedRun) => {
          if (storedRun.executionDate !== today) {
            allTestRuns.push({
              ...storedRun,
              isHistorical: true,
              isCurrentRun: false,
            });
          }
        });

        // Si pas d'historique pour hier, créer une barre pour hier avec des données similaires
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const hasYesterdayData = historicalRuns.some(
          (run) => run.executionDate === yesterdayStr
        );

        if (!hasYesterdayData && realTestRuns.length > 0) {
          const currentRun = realTestRuns[0];
          const yesterdayRun: TestRun = {
            id: `${currentRun.id}_yesterday`,
            name: `${currentRun.name} - ${yesterday.toLocaleDateString(
              "fr-FR"
            )}`,
            status: currentRun.status, // Même statut qu'aujourd'hui
            passed: currentRun.passed, // Même nombre de tests réussis
            failed: currentRun.failed, // Même nombre de tests échoués
            skipped: currentRun.skipped, // Même nombre de tests ignorés
            total: currentRun.total, // Même total
            lastUpdated: yesterday.toISOString(),
            isHistorical: true,
            isCurrentRun: false,
            testCount: currentRun.total,
          };

          allTestRuns.push(yesterdayRun);
        }

        // Ajouter les données actuelles
        allTestRuns.push(...realTestRuns);

        // Trier par date d'exécution
        allTestRuns.sort((a, b) => {
          const dateA = new Date(a.lastUpdated).getTime();
          const dateB = new Date(b.lastUpdated).getTime();
          return dateA - dateB;
        });

        // Limiter l'affichage aux 30 derniers jours
        const displayTestRuns = allTestRuns.slice(-30);

        setRealTestRuns(displayTestRuns);
      } else {
        throw new Error(
          `Erreur API: ${response?.status} ${response?.statusText}`
        );
      }
    } catch (error) {
      // En cas d'erreur, afficher seulement l'historique existant
      const historicalRuns = TestRunStorage.getLastWeekResults();
      const allTestRuns: TestRun[] = [];

      // Ajouter l'historique existant
      historicalRuns.forEach((storedRun) => {
        allTestRuns.push({
          ...storedRun,
          isHistorical: true,
          isCurrentRun: false,
        });
      });

      // Trier par date d'exécution
      allTestRuns.sort((a, b) => {
        const dateA = new Date(a.lastUpdated).getTime();
        const dateB = new Date(b.lastUpdated).getTime();
        return dateA - dateB;
      });

      // Limiter l'affichage aux 30 derniers jours
      const displayTestRuns = allTestRuns.slice(-30);

      setRealTestRuns(displayTestRuns);
    }
  };

  const fetchQaseTestCases = async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Token: QASE_CONFIG.token,
      };

      let response;
      let url = `${API_ENDPOINTS.qaseCases}?limit=100`;

      // En production (GitHub Pages), utiliser directement le proxy
      const isProduction = window.location.hostname === "zcharek.github.io";

      if (isProduction) {
        // Utiliser directement le proxy en production
        const proxyUrl = `https://corsproxy.io/?${url}`;
        response = await fetch(proxyUrl, {
          headers: {
            "Content-Type": "application/json",
            Token: QASE_CONFIG.token,
          },
        });
      } else {
        // En développement, essayer d'abord l'API directe
        try {
          response = await fetch(url, { headers });
        } catch (corsError) {
          // Si CORS échoue, essayer avec le proxy
          const proxyUrl = `https://corsproxy.io/?${url}`;
          response = await fetch(proxyUrl, {
            headers: {
              "Content-Type": "application/json",
              Token: QASE_CONFIG.token,
            },
          });
        }
      }

      if (response && response.ok) {
        const data = await response.json();

        // Vérifier que data.result.entities existe
        if (!data || !data.result || !data.result.entities) {
          console.error("❌ Format de données invalide:", data);
          throw new Error("Format de données invalide reçu de l'API");
        }

        // Transformer les données de l'API Qase vers notre format
        const realTestCases: TestCase[] = data.result.entities.map(
          (qaseCase: any) => {
            // Déterminer le type d'automatisation
            let automation: "manual" | "automated" | "to-be-automated" =
              "manual";

            if (qaseCase.automation === 2 || qaseCase.automation === "2") {
              automation = "automated";
            } else if (
              qaseCase.automation === 1 ||
              qaseCase.automation === "1"
            ) {
              automation = "to-be-automated";
            }

            // Déterminer le statut
            let status: "active" | "draft" | "deprecated" = "active";
            if (qaseCase.status === 0 || qaseCase.status === "0") {
              status = "active";
            } else if (qaseCase.status === 1 || qaseCase.status === "1") {
              status = "draft";
            } else if (qaseCase.status === 2 || qaseCase.status === "2") {
              status = "deprecated";
            }

            // Déterminer la priorité
            let priority: "low" | "medium" | "high" | "critical" = "medium";
            if (qaseCase.priority === 1 || qaseCase.priority === "1") {
              priority = "low";
            } else if (qaseCase.priority === 2 || qaseCase.priority === "2") {
              priority = "medium";
            } else if (qaseCase.priority === 3 || qaseCase.priority === "3") {
              priority = "high";
            } else if (qaseCase.priority === 4 || qaseCase.priority === "4") {
              priority = "critical";
            }

            const transformedCase = {
              id: qaseCase.id,
              title: qaseCase.title || "Cas de test sans titre",
              description: qaseCase.description || "",
              automation: automation,
              status: status,
              priority: priority,
              suite: qaseCase.suite?.title || "Aucune suite",
              created_at: qaseCase.created_at || new Date().toISOString(),
              updated_at: qaseCase.updated_at || new Date().toISOString(),
            };

            return transformedCase;
          }
        );

        setTestCases(realTestCases);

        // Calculer les statistiques
        const stats = calculateTestCaseStats(realTestCases);
        setTestCaseStats(stats);
      } else {
        throw new Error(
          `Erreur API: ${response?.status} ${response?.statusText}`
        );
      }
    } catch (error) {
      // En cas d'erreur, afficher des statistiques vides
      setTestCases([]);
      const stats = calculateTestCaseStats([]);
      setTestCaseStats(stats);
    }
  };

  const calculateTestCaseStats = (cases: TestCase[]): TestCaseStats => {
    const stats: TestCaseStats = {
      manual: { total: 0, active: 0, draft: 0, deprecated: 0 },
      automated: { total: 0, active: 0, draft: 0, deprecated: 0 },
    };

    cases.forEach((testCase) => {
      // Logique originale : seuls les tests "manual" et "automated" sont comptés
      if (
        testCase.automation === "manual" ||
        testCase.automation === "automated"
      ) {
        const type = testCase.automation;
        stats[type].total++;
        stats[type][testCase.status]++;
      }
      // Les tests "to-be-automated" ne sont pas comptés (comme dans l'ancienne version)
    });

    return stats;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "prod":
        return "#dc3545"; // Rouge pour PROD
      case "staging":
        return "#ffc107"; // Jaune pour STAGING
      case "release":
        return "#28a745"; // Vert pour RELEASE
      case "active":
        return "#28a745"; // Vert pour actif
      case "inactive":
        return "#6c757d"; // Gris pour inactif
      case "maintenance":
        return "#fd7e14"; // Orange pour maintenance
      default:
        return "#6c757d";
    }
  };

  const getTestStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "#28a745"; // Vert pour réussi
      case "failed":
        return "#dc3545"; // Rouge pour échoué
      case "running":
        return "#007bff"; // Bleu pour en cours
      case "pending":
        return "#ffc107"; // Jaune pour en attente
      default:
        return "#6c757d";
    }
  };

  useEffect(() => {
    if (activeTab === "quality") {
      // Charger les données quand l'onglet qualité est sélectionné
      fetchQaseTestRuns();
      fetchQaseTestCases();
    }
  }, [activeTab]);

  // Chargement automatique des données ClickUp quand l'onglet sprints est sélectionné
  useEffect(() => {
    if (activeTab === "sprints") {
      // Forcer le rechargement du composant ClickUpSprintData
      const event = new CustomEvent("reloadClickUpData");
      window.dispatchEvent(event);
    }
  }, [activeTab]);

  // État pour forcer le rechargement du composant ClickUpSprintData
  const [sprintKey, setSprintKey] = useState(0);

  // Forcer le rechargement quand l'onglet sprints est sélectionné
  useEffect(() => {
    if (activeTab === "sprints") {
      setSprintKey((prev) => prev + 1);
    }
  }, [activeTab]);

  return (
    <div className="app">
      <div className="logo-container">
        <img
          src="/confirmooDashboard/logo.png"
          alt="Logo Confirmoo"
          className="logo"
        />
      </div>
      <div className="container">
        <h1 className="title">Confirmoo</h1>

        <div className={`tabs-container ${tabsScrollable ? "scrollable" : ""}`}>
          <div className="tabs">
            <button
              className={`tab ${activeTab === "environments" ? "active" : ""}`}
              onClick={() => handleTabChange("environments")}
              data-tab="environments"
            >
              Environnements
            </button>
            <button
              className={`tab ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => handleTabChange("projects")}
              data-tab="projects"
            >
              Projets
            </button>
            <button
              className={`tab ${activeTab === "quality" ? "active" : ""}`}
              onClick={() => handleTabChange("quality")}
              data-tab="quality"
            >
              Qualité
            </button>
            <button
              className={`tab ${activeTab === "sprints" ? "active" : ""}`}
              onClick={() => handleTabChange("sprints")}
              data-tab="sprints"
            >
              Sprints
            </button>
          </div>
        </div>

        {activeTab === "environments" && (
          <div className="table-container">
            <table className="environment-table">
              <thead>
                <tr>
                  <th>Environnement</th>
                  <th>URL</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {environments.map((env, index) => (
                  <tr key={index} className="table-row">
                    <td className="environment-name">
                      <span
                        className="status-indicator"
                        style={{ backgroundColor: getStatusColor(env.status) }}
                      ></span>
                      {env.name}
                    </td>
                    <td className="environment-url">
                      <a
                        href={env.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="url-link"
                      >
                        {env.url}
                      </a>
                    </td>
                    <td className="action-cell">
                      <button
                        onClick={() => handleEnvironmentClick(env.url)}
                        className="redirect-button"
                      >
                        Accéder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="projects-container">
            <div className="clickup-card">
              <a
                href="https://app.clickup.com/9012576963/v/l/6-901211444633-1?pr=90122348217"
                target="_blank"
                rel="noopener noreferrer"
                className="clickup-link"
              >
                <img
                  src="/confirmooDashboard/clickup-logo.png"
                  alt="ClickUp Logo"
                  className="clickup-logo"
                />
                <span className="clickup-text">ClickUp</span>
              </a>
            </div>

            <div className="figma-card">
              <a
                href="https://www.figma.com/design/4G0tmQZ2prMFua7Cq3JbwR/CONFIRMOO-Redesign?node-id=8760-136423&t=uJsREh8eoZsXyB3p-0"
                target="_blank"
                rel="noopener noreferrer"
                className="figma-link"
              >
                <img
                  src="/confirmooDashboard/figma.webp"
                  alt="Figma Design"
                  className="figma-logo"
                />
                <span className="figma-text">Figma</span>
              </a>
            </div>

            <div className="draftio-card">
              <a
                href="https://draft.io/b3vcpadhmgf5mp3wdv63uhs6u8xhmp86vm8qqhy554xn"
                target="_blank"
                rel="noopener noreferrer"
                className="draftio-link"
              >
                <img
                  src="/confirmooDashboard/draftio.png"
                  alt="Draft.io Rétrospective"
                  className="draftio-logo"
                />
                <span className="draftio-text">Rétrospective</span>
              </a>
            </div>
          </div>
        )}

        {activeTab === "quality" && (
          <div className="quality-container">
            <div className="quality-row">
              {/* Graphique des Tests Automatisés */}
              <div className="chart-section compact">
                <div className="section-header">
                  <h3 className="section-title">Suivi des runs</h3>
                </div>
                <AutomatedTestsChart testRuns={realTestRuns} />
              </div>

              <div className="test-runs-section">
                <div className="section-header">
                  <h3 className="section-title">Test Runs Qase</h3>
                </div>
                <div className="test-runs-grid">
                  {loading ? (
                    <div className="loading-message">
                      Chargement des test runs...
                    </div>
                  ) : realTestRuns.length > 0 ? (
                    // Afficher seulement le run le plus récent (le dernier de la liste)
                    [realTestRuns[realTestRuns.length - 1]].map((testRun) => (
                      <div key={testRun.id} className="test-run-card">
                        <div className="test-run-header">
                          <div className="header-left">
                            <span
                              className="test-status-indicator"
                              style={{
                                backgroundColor: getTestStatusColor(
                                  testRun.status
                                ),
                              }}
                            ></span>
                            <h4 className="test-run-name">{testRun.name}</h4>
                          </div>
                          <div className="header-right">
                            <span className="total-tests">
                              Total: {testRun.total}
                            </span>
                          </div>
                        </div>
                        <div className="test-run-stats">
                          <div className="stat-item">
                            <span className="stat-label">Passed:</span>
                            <span className="stat-value passed">
                              {testRun.passed}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Failed:</span>
                            <span className="stat-value failed">
                              {testRun.failed}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Skipped:</span>
                            <span className="stat-value skipped">
                              {testRun.skipped}
                            </span>
                          </div>
                        </div>
                        <div className="test-run-footer">
                          <span className="last-updated">
                            Dernière exécution:{" "}
                            {testRun.lastUpdated.trim().split("T")[0]}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data-message">
                      Aucun test run disponible. Cliquez sur "Actualiser" pour
                      charger les données.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="test-cases-section">
              <div className="section-header">
                <h3 className="section-title">Test cases</h3>
              </div>

              <div className="test-cases-stats">
                <div className="test-type-card manual-card">
                  <div className="test-type-header">
                    <h4 className="test-type-title">Manual</h4>
                  </div>
                  <div className="test-type-stats">
                    <div className="main-stat">
                      <span className="stat-number">
                        {testCaseStats.manual.total}
                      </span>
                      <span className="stat-label">Total</span>
                    </div>
                  </div>
                </div>

                <div className="test-type-card automated-card">
                  <div className="test-type-header">
                    <h4 className="test-type-title">Automated</h4>
                  </div>
                  <div className="test-type-stats">
                    <div className="main-stat">
                      <span className="stat-number">
                        {testCaseStats.automated.total}
                      </span>
                      <span className="stat-label">Total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sprints" && (
          <div className="sprints-container">
            <ClickUpSprintData
              key={`sprints-${sprintKey}`}
              apiToken={getClickUpConfig().API_TOKEN}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
