import React, { useState, useEffect } from "react";
import {
  getClickUpConfig,
  getClickUpHeaders,
  buildClickUpURL,
  handleClickUpError,
  validateClickUpConfig,
} from "../config/clickup";
import { SprintVelocityStorage } from "../utils/sprintVelocityStorage";

interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  time_estimate: number | null;
  time_spent: number | null;
  assignees: Array<{
    id: number;
    username: string;
    profilePicture: string;
  }>;
  tags: Array<{
    name: string;
    tag_fg: string;
    tag_bg: string;
  }>;
  priority: number;
  points: number | null;
  custom_fields?: Array<{
    id: string;
    name: string;
    value: any;
  }>;
}

interface ClickUpList {
  id: string;
  name: string;
  task_count: number;
  status: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
  lists: ClickUpList[];
  sprintFolder?: {
    id: string;
    name: string;
  };
}

interface SprintData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "draft";
  tasks: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    overdue: number;
    blocked: number;
  };
  metrics: {
    velocity: number;
    story_points: {
      total: number;
      completed: number;
      remaining: number;
    };
    time_tracking: {
      estimated: number;
      spent: number;
      remaining: number;
    };
  };
}

interface ClickUpSprintDataProps {
  apiToken: string;
}

const ClickUpSprintData: React.FC<ClickUpSprintDataProps> = ({ apiToken }) => {
  const [sprints, setSprints] = useState<SprintData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId] = useState<string>(getClickUpConfig().WORKSPACE_ID);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [spaces, setSpaces] = useState<ClickUpSpace[]>([]);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  // État pour l'historique des sprints
  const [sprintHistory, setSprintHistory] = useState<any[]>([]);

  // Cache pour les données principales
  const [dataCache, setDataCache] = useState<{
    sprints: SprintData[];
    history: any[];
    lastUpdate: Date;
  } | null>(null);

  // Fonctions de sauvegarde et récupération de l'historique
  const getSavedSprintHistory = (spaceId: string): any[] => {
    try {
      const saved = localStorage.getItem(`sprintHistory_${spaceId}`);
      if (saved) {
        const data = JSON.parse(saved);
        // Vérifier si les données ne sont pas trop anciennes (7 jours)
        const savedDate = new Date(data.timestamp);
        const now = new Date();
        const daysDiff =
          (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff < 7) {
          return data.history || [];
        }
      }
    } catch (error) {
      // Erreur silencieuse
    }
    return [];
  };

  const saveSprintHistory = (spaceId: string, history: any[]) => {
    try {
      const data = {
        history,
        timestamp: new Date().toISOString(),
        spaceId,
      };
      localStorage.setItem(`sprintHistory_${spaceId}`, JSON.stringify(data));
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Fonction utilitaire pour calculer la vélocité moyenne
  // Calcule la moyenne des story points complétés par sprint terminé depuis le sprint 32
  const calculateAverageVelocity = (sprints: any[]) => {
    // Filtrer seulement les sprints terminés depuis le sprint 32
    const completedSprints = sprints.filter((sprint) => {
      if (sprint.status !== "completed") return false;

      // Extraire le numéro du sprint
      const sprintNumber = parseInt(sprint.name.match(/\d+/)?.[0] || "0");
      return sprintNumber >= 32;
    });

    if (completedSprints.length === 0) return 0;

    const totalStoryPoints = completedSprints.reduce(
      (sum, sprint) => sum + (sprint.metrics?.story_points?.completed || 0),
      0
    );

    return Math.round(totalStoryPoints / completedSprints.length);
  };

  useEffect(() => {
    // Valider la configuration au chargement
    const validation = validateClickUpConfig();
    if (!validation.isValid) {
      setConfigErrors(validation.errors);
      setError("Configuration ClickUp invalide. Vérifiez vos paramètres.");
      setLoading(false);
      return;
    }

    if (apiToken) {
      fetchWorkspaceData();
    }
  }, [apiToken]);

  // Nouveau useEffect pour gérer le cache quand selectedSpace change
  useEffect(() => {
    if (selectedSpace && dataCache) {
      // Vérifier si on a des données en cache (moins de 5 minutes)
      if (
        new Date().getTime() - dataCache.lastUpdate.getTime() <
        5 * 60 * 1000
      ) {
        setSprints(dataCache.sprints);
        setSprintHistory(dataCache.history);
        setLoading(false);
        return;
      } else {
        setDataCache(null);
      }
    }
  }, [selectedSpace, dataCache]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Récupérer les espaces de travail
      const workspacesResponse = await fetch(
        buildClickUpURL(getClickUpConfig().ENDPOINTS.TEAMS),
        {
          headers: getClickUpHeaders(),
        }
      );

      if (!workspacesResponse.ok) {
        const errorData = await workspacesResponse.json().catch(() => ({}));
        if (errorData.err && errorData.ECODE) {
          throw new Error(handleClickUpError(errorData));
        }
        throw new Error(
          `Erreur API ClickUp: ${workspacesResponse.status} - ${workspacesResponse.statusText}`
        );
      }

      // Récupérer les espaces du workspace spécifique
      const spacesResponse = await fetch(
        buildClickUpURL(getClickUpConfig().ENDPOINTS.SPACES, { workspaceId }),
        {
          headers: getClickUpHeaders(),
        }
      );

      if (!spacesResponse.ok) {
        const errorData = await spacesResponse.json().catch(() => ({}));
        if (errorData.err && errorData.ECODE) {
          throw new Error(handleClickUpError(errorData));
        }
        throw new Error(
          `Erreur lors de la récupération des espaces: ${spacesResponse.status} - ${spacesResponse.statusText}`
        );
      }

      const spacesData = await spacesResponse.json();

      // Récupérer les listes pour chaque espace
      const spacesWithLists: ClickUpSpace[] = [];

      for (const space of spacesData.spaces) {
        try {
          // Utiliser directement le dossier sprint configuré si disponible
          if (getClickUpConfig().SPRINT_FOLDER_ID) {
            const sprintListsResponse = await fetch(
              buildClickUpURL(getClickUpConfig().ENDPOINTS.LISTS, {
                spaceId: space.id,
              }) + `?folder_id=${getClickUpConfig().SPRINT_FOLDER_ID}`,
              {
                headers: getClickUpHeaders(),
              }
            );

            if (sprintListsResponse.ok) {
              const sprintListsData = await sprintListsResponse.json();
              const sprintLists = sprintListsData.lists || [];

              spacesWithLists.push({
                ...space,
                lists: sprintLists,
                sprintFolder: {
                  id: getClickUpConfig().SPRINT_FOLDER_ID,
                  name: "Dossier Sprint Configuré",
                },
              });
            }
          } else {
            // Fallback : récupérer d'abord les dossiers (folders)
            const foldersResponse = await fetch(
              buildClickUpURL(getClickUpConfig().ENDPOINTS.FOLDERS, {
                spaceId: space.id,
              }),
              {
                headers: getClickUpHeaders(),
              }
            );

            if (foldersResponse.ok) {
              const foldersData = await foldersResponse.json();
              const folders = foldersData.folders || [];

              // Chercher le dossier "Sprint Folder"
              const sprintFolder = folders.find(
                (folder: any) =>
                  folder.name.toLowerCase().includes("sprint") ||
                  folder.name.toLowerCase().includes("sprint folder")
              );

              if (sprintFolder) {
                // Récupérer les listes dans le dossier Sprint
                const sprintListsResponse = await fetch(
                  buildClickUpURL(getClickUpConfig().ENDPOINTS.LISTS, {
                    spaceId: space.id,
                  }) + `?folder_id=${sprintFolder.id}`,
                  {
                    headers: getClickUpHeaders(),
                  }
                );

                if (sprintListsResponse.ok) {
                  const sprintListsData = await sprintListsResponse.json();
                  const sprintLists = sprintListsData.lists || [];

                  spacesWithLists.push({
                    ...space,
                    lists: sprintLists,
                    sprintFolder: sprintFolder,
                  });
                }
              } else {
                // Si pas de dossier Sprint, récupérer les listes normales
                const listsResponse = await fetch(
                  buildClickUpURL(getClickUpConfig().ENDPOINTS.LISTS, {
                    spaceId: space.id,
                  }),
                  {
                    headers: getClickUpHeaders(),
                  }
                );

                if (listsResponse.ok) {
                  const listsData = await listsResponse.json();
                  spacesWithLists.push({
                    ...space,
                    lists: listsData.lists || [],
                  });
                }
              }
            }
          }
        } catch (listError) {
          // Erreur lors de la récupération des listes pour l'espace
        }
      }

      setSpaces(spacesWithLists);

      // Chercher spécifiquement l'espace "Engineering"
      const engineeringSpace = spacesWithLists.find(
        (space) =>
          space.name.toLowerCase().includes("engineering") ||
          space.name.toLowerCase().includes("dev") ||
          space.name.toLowerCase().includes("development")
      );

      if (engineeringSpace) {
        setSelectedSpace(engineeringSpace.id);
        await fetchSprintData(engineeringSpace.id, engineeringSpace);
        // Charger l'historique après avoir défini l'espace
        const history = await fetchSprintHistory(engineeringSpace);
        setSprintHistory(history);
      } else if (spacesWithLists.length > 0) {
        setSelectedSpace(spacesWithLists[0].id);
        await fetchSprintData(spacesWithLists[0].id, spacesWithLists[0]);
        // Charger l'historique après avoir défini l'espace
        const history = await fetchSprintHistory(spacesWithLists[0]);
        setSprintHistory(history);
      } else {
        throw new Error(
          "Aucun espace avec des listes trouvé dans le workspace."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintData = async (spaceId: string, spaceData?: ClickUpSpace) => {
    if (!spaceId) return;

    setLoading(true);

    try {
      const selectedSpaceData =
        spaceData || spaces.find((space) => space.id === spaceId);
      if (!selectedSpaceData) return;

      // Simplification: ne garder qu'UN backlog (le premier trouvé) et UN sprint EN COURS
      const allLists = selectedSpaceData.lists || [];

      const sprintData: SprintData[] = [];

      // Traiter les sprints par petits batches pour éviter le rate limiting
      const delay = (ms: number): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Approche simplifiée : traiter toutes les listes importantes et afficher un résumé

      // ÉTAPE 2 : Récupérer le backlog ET le dernier sprint
      const backlogList = allLists.find((l) => {
        const name = l.name || "";
        return name === "BACKLOG" || name.toLowerCase().includes("backlog");
      });

      // Trouver le dernier sprint (liste contenant "sprint" dans le nom)
      const sprintLists = allLists.filter((l) => {
        const name = l.name || "";
        return name.toLowerCase().includes("sprint");
      });

      // Préparer les listes à traiter
      const listsToProcess: ClickUpList[] = [];

      if (backlogList) {
        listsToProcess.push(backlogList);
      }

      if (sprintLists.length > 0) {
        // Prendre le dernier sprint (le plus récent)
        const lastSprint = sprintLists[sprintLists.length - 1];
        listsToProcess.push(lastSprint);
      }

      if (listsToProcess.length > 0) {
        // Vider les données existantes avant de traiter
        sprintData.length = 0;

        await processSprintBatch(listsToProcess, sprintData, delay);
      } else {
        sprintData.length = 0;
      }

      // Si aucun sprint n'est détecté, récupérer les données de toutes les listes importantes
      if (sprintData.length === 0) {
        const allListsData = await createDataFromAllLists(
          selectedSpaceData.lists
        );
        // Filtrer aussi les brouillons ici
        allListsData.forEach((sprint) => {
          if (sprint.status !== "draft") {
            sprintData.push(sprint);
          }
        });
      }

      // Dédupliquer et trier par date de fin (plus récent en premier)
      const uniqueSprintData: SprintData[] = Array.from(
        new Map(sprintData.map((s) => [s.id, s])).values()
      );
      uniqueSprintData.sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );

      setSprints(uniqueSprintData);

      // Sauvegarder en cache
      setDataCache({
        sprints: uniqueSprintData,
        history: [],
        lastUpdate: new Date(),
      });

      // Enregistrer la vélocité (story points complétés) pour le sprint actif
      const active = uniqueSprintData.find((s) => s.status === "active");
      if (active) {
        SprintVelocityStorage.save({
          sprintId: active.id,
          sprintName: active.name,
          endDate: active.end_date,
          completedStoryPoints: active.metrics?.story_points?.completed || 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Nouvelle fonction pour récupérer l'historique des sprints avec cache intelligent
  const fetchSprintHistory = async (spaceData?: ClickUpSpace) => {
    const selectedSpaceData =
      spaceData || spaces.find((space) => space.id === selectedSpace);
    if (!selectedSpaceData) return [];

    try {
      const allLists = selectedSpaceData.lists || [];

      // Filtrer uniquement les listes de sprint (exclure BACKLOG)
      const sprintLists = allLists.filter((l) => {
        const name = l.name || "";
        return name.toLowerCase().includes("sprint") && name !== "BACKLOG";
      });

      // Récupérer l'historique sauvegardé
      const savedHistory = getSavedSprintHistory(selectedSpaceData.id);

      // Identifier les sprints à traiter (non sauvegardés ou actifs)
      const sprintsToProcess: any[] = [];
      const processedSprints: any[] = [];

      for (const sprintList of sprintLists) {
        const savedSprint = savedHistory.find(
          (s: any) => s.id === sprintList.id
        );

        if (!savedSprint) {
          // Sprint non sauvegardé - à traiter
          sprintsToProcess.push(sprintList);
        } else if (
          savedSprint.status === "active" ||
          savedSprint.status === "draft"
        ) {
          // Sprint actif ou brouillon - à traiter pour données fraîches
          sprintsToProcess.push(sprintList);
        } else {
          // Sprint terminé sauvegardé - utiliser les données sauvegardées
          processedSprints.push(savedSprint);
        }
      }

      // Traiter uniquement les sprints nécessaires
      const delay = (ms: number): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, ms));

      for (const sprintList of sprintsToProcess) {
        try {
          // Récupérer les tâches du sprint (sans les sous-tâches)
          const tasksResponse = await fetch(
            buildClickUpURL(getClickUpConfig().ENDPOINTS.TASKS, {
              listId: sprintList.id,
            }) + "?include_closed=true&subtasks=false&include_time=true&page=0",
            {
              headers: getClickUpHeaders(),
            }
          );

          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            const tasks = tasksData.tasks || [];

            // Analyser les tâches
            const taskMetrics = analyzeTasks(tasks);
            const metrics = calculateSprintMetrics(tasks, taskMetrics);

            // Détecter les dates du sprint
            const dates = detectSprintDates(tasks);
            const status = determineSprintStatus(
              dates,
              taskMetrics,
              sprintList.name
            );

            const sprintData = {
              id: sprintList.id,
              name: sprintList.name,
              status,
              start_date: dates.start,
              end_date: dates.end,
              tasks: taskMetrics,
              metrics,
            };

            processedSprints.push(sprintData);

            // Délai pour éviter de surcharger l'API
            await delay(100);
          }
        } catch (error) {
          // Erreur silencieuse
        }
      }

      // Sauvegarder l'historique complet
      saveSprintHistory(selectedSpaceData.id, processedSprints);

      // Mettre à jour le cache avec l'historique
      if (dataCache) {
        setDataCache({
          ...dataCache,
          history: processedSprints,
          lastUpdate: new Date(),
        });
      }

      return processedSprints;
    } catch (error) {
      return [];
    }
  };

  const analyzeTasks = (tasks: ClickUpTask[]) => {
    const now = new Date();
    let completed = 0,
      inProgress = 0,
      pending = 0,
      overdue = 0,
      blocked = 0;

    tasks.forEach((task) => {
      const statusLower = (task.status?.status || "").toLowerCase();

      // Les tâches annulées sont maintenant traitées comme terminées
      // (pas d'ignorance)

      // Classification plus précise des statuts
      if (
        statusLower.includes("complete") ||
        statusLower.includes("done") ||
        statusLower.includes("terminé") ||
        statusLower.includes("finished") ||
        statusLower.includes("closed") ||
        statusLower.includes("resolved") ||
        statusLower.includes("archived") ||
        statusLower.includes("ready for deployment") ||
        statusLower.includes("shipped") ||
        statusLower.includes("deployed") ||
        statusLower.includes("canceled") ||
        statusLower.includes("cancelled") ||
        statusLower.includes("annulé") ||
        statusLower.includes("abandoned") ||
        statusLower.includes("abandonné")
      ) {
        completed++;
      } else if (
        statusLower.includes("progress") ||
        statusLower.includes("review") ||
        statusLower.includes("en cours") ||
        statusLower.includes("testing") ||
        statusLower.includes("qa") ||
        statusLower.includes("validation") ||
        statusLower.includes("in progress") ||
        statusLower.includes("work in progress")
      ) {
        inProgress++;
      } else if (
        statusLower.includes("blocked") ||
        statusLower.includes("bloqué") ||
        statusLower.includes("stuck") ||
        statusLower.includes("waiting") ||
        statusLower.includes("on hold") ||
        statusLower.includes("paused")
      ) {
        blocked++;
      } else if (
        statusLower.includes("open") ||
        statusLower.includes("to do") ||
        statusLower.includes("à faire") ||
        statusLower.includes("new") ||
        statusLower.includes("ready") ||
        statusLower.includes("ready for dev") ||
        statusLower.includes("ready for qa")
      ) {
        pending++;
      } else {
        // Statut non reconnu
        pending++;
      }

      // Vérifier si la tâche est en retard (seulement si elle a une date d'échéance)
      if (task.due_date) {
        try {
          const dueDate = new Date(task.due_date);
          if (
            !isNaN(dueDate.getTime()) &&
            dueDate < now &&
            !statusLower.includes("complete")
          ) {
            overdue++;
          }
        } catch (error) {
          // Erreur lors de la vérification de la date d'échéance
        }
      }
    });

    const result = {
      total: tasks.length,
      completed,
      in_progress: inProgress,
      pending,
      overdue,
      blocked,
    };

    return result;
  };

  const detectSprintDates = (tasks: ClickUpTask[]) => {
    // Si pas de tâches, retourner des dates par défaut
    if (tasks.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };
    }

    // Fonction utilitaire pour valider et créer une date
    const createValidDate = (
      dateString: string | number | null
    ): Date | null => {
      if (!dateString) return null;

      try {
        const date = new Date(dateString);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
          return null;
        }
        return date;
      } catch (error) {
        return null;
      }
    };

    // Récupérer et valider les dates d'échéance (plus fiable)
    const dueDates = tasks
      .map((task) => createValidDate(task.due_date))
      .filter((date) => date !== null)
      .sort((a, b) => a!.getTime() - b!.getTime());

    if (dueDates.length > 0) {
      try {
        const startDate = dueDates[0]!;
        const endDate = dueDates[dueDates.length - 1]!;

        return {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        };
      } catch (error) {
        // Erreur lors de la conversion des dates d'échéance
      }
    }

    // Essayer de détecter les dates de création des tâches
    const createdDates = tasks
      .map((task) => createValidDate(task.created_at))
      .filter((date) => date !== null)
      .sort((a, b) => a!.getTime() - b!.getTime());

    if (createdDates.length > 0) {
      try {
        const startDate = createdDates[0]!;
        const endDate = new Date(
          startDate.getTime() + 14 * 24 * 60 * 60 * 1000
        ); // +14 jours

        return {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        };
      } catch (error) {
        // Erreur lors de la conversion des dates de création
      }
    }

    // Dates par défaut si aucune date n'est trouvée
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return {
        start: defaultStart.toISOString().split("T")[0],
        end: defaultEnd.toISOString().split("T")[0],
      };
    } catch (error) {
      // Fallback ultime
      return {
        start: "2024-01-01",
        end: "2024-12-31",
      };
    }
  };

  const calculateSprintMetrics = (tasks: ClickUpTask[], taskMetrics: any) => {
    // Calcul des story points (incluant les tâches annulées comme terminées)
    const validTasks = tasks; // Toutes les tâches sont valides maintenant

    const totalPoints = validTasks.reduce((sum, task) => {
      // Chercher les story points dans les champs personnalisés
      const sprintPoints =
        task.custom_fields?.find((field: any) => field.name === "Sprint points")
          ?.value || 0;
      const finalPoints = sprintPoints || task.points || 0;

      return sum + finalPoints;
    }, 0);

    const completedTasks = validTasks.filter((task) => {
      const statusLower = (task.status?.status || "").toLowerCase();
      const isCompleted =
        statusLower.includes("complete") ||
        statusLower.includes("done") ||
        statusLower.includes("terminé") ||
        statusLower.includes("finished") ||
        statusLower.includes("closed") ||
        statusLower.includes("resolved") ||
        statusLower.includes("archived") ||
        statusLower.includes("ready for deployment") ||
        statusLower.includes("shipped") ||
        statusLower.includes("deployed") ||
        statusLower.includes("canceled") ||
        statusLower.includes("cancelled") ||
        statusLower.includes("annulé") ||
        statusLower.includes("abandoned") ||
        statusLower.includes("abandonné");

      return isCompleted;
    });

    const completedPoints = completedTasks.reduce((sum, task) => {
      // Chercher les story points dans les champs personnalisés
      const sprintPoints =
        task.custom_fields?.find((field: any) => field.name === "Sprint points")
          ?.value || 0;
      return sum + (sprintPoints || task.points || 0);
    }, 0);

    // Calcul du temps
    const totalEstimated = tasks.reduce(
      (sum, task) => sum + (task.time_estimate || 0),
      0
    );
    const totalSpent = tasks.reduce(
      (sum, task) => sum + (task.time_spent || 0),
      0
    );

    // Calcul de la vélocité
    const velocity =
      taskMetrics.total > 0
        ? Math.round((taskMetrics.completed / taskMetrics.total) * 100)
        : 0;

    const result = {
      velocity,
      story_points: {
        total: totalPoints,
        completed: completedPoints,
        remaining: totalPoints - completedPoints,
      },
      time_tracking: {
        estimated: totalEstimated,
        spent: totalSpent,
        remaining: totalEstimated - totalSpent,
      },
    };

    return result;
  };

  const determineSprintStatus = (
    dates: any,
    metrics: any,

    // @ts-ignore
    sprintName?: string
  ): "active" | "completed" | "draft" => {
    const now = new Date();
    const endDate = new Date(dates.end);
    const startDate = new Date(dates.start);

    // Vérifier si toutes les tâches sont complétées
    if (metrics.completed === metrics.total && metrics.total > 0) {
      return "completed";
    }

    // Vérifier si le sprint est terminé par la date
    if (now > endDate) {
      return "completed";
    }

    // Vérifier si le sprint est en cours
    if (now >= startDate && now <= endDate) {
      return "active";
    }

    // Vérifier si le sprint n'a pas encore commencé
    if (now < startDate) {
      return "draft";
    }

    // Fallback: si on ne peut pas déterminer, baser sur la progression
    if (metrics.completed > 0) {
      return "active";
    } else {
      return "draft";
    }
  };

  const createDataFromAllLists = async (
    lists: ClickUpList[]
  ): Promise<SprintData[]> => {
    const allListsData: SprintData[] = [];

    // Traiter les listes par petits batches pour éviter le rate limiting
    const batchSize = 3;
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < lists.length; i += batchSize) {
      const batch = lists.slice(i, i + batchSize);

      const batchPromises = batch.map(async (list, index) => {
        try {
          // Ajouter un petit délai pour éviter le rate limiting
          await delay(index * 200);

          const tasksResponse = await fetch(
            buildClickUpURL(getClickUpConfig().ENDPOINTS.TASKS, {
              listId: list.id,
            }) + "?include_closed=true&subtasks=true&include_time=true&page=0",
            {
              headers: getClickUpHeaders(),
            }
          );

          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            const tasks: ClickUpTask[] = tasksData.tasks || [];

            if (tasks.length > 0) {
              const taskMetrics = analyzeTasks(tasks);
              const sprintDates = detectSprintDates(tasks);
              const metrics = calculateSprintMetrics(tasks, taskMetrics);
              const status = determineSprintStatus(
                sprintDates,
                taskMetrics,
                list.name
              );

              return {
                id: list.id,
                name: list.name,
                start_date: sprintDates.start,
                end_date: sprintDates.end,
                status: status,
                tasks: taskMetrics,
                metrics: metrics,
              };
            }
          } else if (tasksResponse.status === 429) {
            // Rate limit atteint, attente de 2s
            await delay(2000);
            return null;
          } else {
            // Erreur API
            return null;
          }
          return null;
        } catch (error) {
          // Erreur lors de la récupération des tâches
          return null;
        }
      });

      // Attendre ce batch
      const batchResults = await Promise.all(batchPromises);

      // Filtrer les résultats valides
      batchResults.forEach((result) => {
        if (result) {
          allListsData.push(result);
        }
      });

      // Délai entre les batches
      if (i + batchSize < lists.length) {
        await delay(1000);
      }
    }

    return allListsData;
  };

  // Fonction pour traiter un batch de sprints
  const processSprintBatch = async (
    sprintLists: ClickUpList[],
    sprintData: SprintData[],
    delay: (ms: number) => Promise<void>
  ) => {
    const batchSize = 3;

    for (let i = 0; i < sprintLists.length; i += batchSize) {
      const batch = sprintLists.slice(i, i + batchSize);

      const batchPromises = batch.map(async (list, index) => {
        try {
          // Ajouter un petit délai pour éviter le rate limiting
          await delay(index * 200);

          // Récupérer les tâches de la liste avec plus de détails
          const tasksResponse = await fetch(
            buildClickUpURL(getClickUpConfig().ENDPOINTS.TASKS, {
              listId: list.id,
            }) + `?include_closed=true&subtasks=false&include_time=true&page=0`,
            {
              headers: getClickUpHeaders(),
            }
          );

          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            const tasks: ClickUpTask[] = tasksData.tasks || [];

            // Analyser les tâches pour calculer les métriques
            const taskMetrics = analyzeTasks(tasks);

            // Détecter les dates de sprint (basé sur les tâches)
            const sprintDates = detectSprintDates(tasks);

            // Calculer la vélocité et autres métriques
            const metrics = calculateSprintMetrics(tasks, taskMetrics);

            const sprintStatus = determineSprintStatus(
              sprintDates,
              taskMetrics,
              list.name
            );

            const sprint = {
              id: list.id,
              name: list.name,
              start_date: sprintDates.start,
              end_date: sprintDates.end,
              status: sprintStatus,
              tasks: taskMetrics,
              metrics: metrics,
            };

            return sprint;
          } else if (tasksResponse.status === 429) {
            // Rate limit atteint, attente de 2s
            await delay(2000);
            return null;
          } else {
            // Erreur API
            return null;
          }
        } catch (taskError) {
          // Erreur lors de la récupération des tâches
          return null;
        }
      });

      // Attendre ce batch
      const batchResults = await Promise.all(batchPromises);

      // Filtrer les résultats valides et exclure les brouillons
      batchResults.forEach((sprint) => {
        if (sprint && sprint.status !== "draft") {
          sprintData.push(sprint);
        }
      });

      // Délai entre les batches
      if (i + batchSize < sprintLists.length) {
        await delay(1000);
      }
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "En cours";
      case "completed":
        return "Terminé";
      case "draft":
        return "Brouillon";
      default:
        return status;
    }
  };

  const calculateProgress = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="sprint-container">
        <div className="loading-message">
          <div className="spinner"></div>
          <h3>🔄 Chargement des données ClickUp...</h3>
          <p>Récupération des sprints et du backlog</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sprint-container">
        <div className="error-message">
          <h3>⚠️ Erreur de chargement ClickUp</h3>
          <p>{error}</p>
          <p className="error-details">
            <strong>Détails techniques :</strong>
            <br />
            • Vérifiez que le token API ClickUp est valide
            <br />
            • Vérifiez que le workspace ID est correct
            <br />• En production, vérifiez les permissions CORS
          </p>
          <button onClick={fetchWorkspaceData} className="retry-button">
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (configErrors.length > 0) {
    return (
      <div className="sprint-container">
        <div className="config-error-message">
          <h3>❌ Configuration ClickUp invalide</h3>
          <div className="config-errors">
            {configErrors.map((error, index) => (
              <div key={index} className="config-error-item">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sprint-container">
      {/* ÉTAPE 2 : Affichage du backlog ET du dernier sprint */}
      {sprints.length > 0 ? (
        <div className="dashboard-layout">
          {/* Section Backlog à gauche */}
          <div className="backlog-section">
            <div className="backlog-header-section">
              <h3>📋 Backlog</h3>
            </div>

            {sprints
              .filter((list) => list.name === "BACKLOG")
              .map((list) => (
                <div key={list.id} className="backlog-card">
                  <div className="backlog-header">
                    <h4>{list.name}</h4>
                  </div>

                  <div className="backlog-metrics">
                    <div className="metric-item">
                      <span className="metric-label">📊 Tickets Pending</span>
                      <span className="metric-value">{list.tasks.pending}</span>
                    </div>

                    <div className="metric-item">
                      <span className="metric-label">🎯 Story Points</span>
                      <span className="metric-value">
                        {list.metrics.story_points.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Section Dernier Sprint à droite - Améliorée */}
          <div className="sprint-section">
            <div className="sprint-header-section">
              <h3>📜 Dernier Sprint</h3>
            </div>

            {sprints
              .filter((list) => list.name !== "BACKLOG")
              .map((list) => (
                <div key={list.id} className="sprint-card-improved">
                  <div className="sprint-banner">
                    <div className="sprint-info">
                      <h4 className="sprint-title">{list.name}</h4>
                      <div className="sprint-dates">
                        {list.start_date && list.end_date && (
                          <span className="date-range">
                            {new Date(list.start_date).toLocaleDateString(
                              "fr-FR",
                              { day: "2-digit", month: "2-digit" }
                            )}{" "}
                            -{" "}
                            {new Date(list.end_date).toLocaleDateString(
                              "fr-FR",
                              { day: "2-digit", month: "2-digit" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sprint-status">
                      <span className={`status-pill status-${list.status}`}>
                        {getStatusLabel(list.status)}
                      </span>
                    </div>
                  </div>

                  <div className="sprint-metrics-improved">
                    <div className="metric-card">
                      <div className="metric-icon">📊</div>
                      <div className="metric-content">
                        <span className="metric-label">TICKETS</span>
                        <span className="metric-value">
                          {list.tasks.completed}/{list.tasks.total}
                        </span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon">🎯</div>
                      <div className="metric-content">
                        <span className="metric-label">STORY POINTS</span>
                        <span className="metric-value">
                          {list.metrics.story_points.completed}/
                          {list.metrics.story_points.total}
                        </span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon">📈</div>
                      <div className="metric-content">
                        <span className="metric-label">PROGRESSION</span>
                        <span className="metric-value">
                          {calculateProgress(
                            list.tasks.completed,
                            list.tasks.total
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="no-data-message">
          <p>📭 Aucune donnée trouvée</p>
          <p>
            Vérifiez que vous avez une liste contenant "BACKLOG" dans son nom
          </p>
        </div>
      )}

      {/* Section Historique des Sprints - Améliorée */}
      <div className="sprint-history-section">
        <div className="history-header-section">
          <div className="history-title">
            <h3>📈 Historique des Sprints</h3>
            <p className="history-subtitle">
              Suivi de la vélocité et performance de l'équipe
            </p>
          </div>
        </div>

        <div className="history-summary">
          <div className="summary-item">
            <div className="summary-icon">📉</div>
            <div className="summary-content">
              <span className="summary-label">Sprints analysés</span>
              <span className="summary-value">{sprintHistory.length}</span>
            </div>
          </div>

          <div className="summary-item">
            <div className="summary-icon">📈</div>
            <div className="summary-content">
              <span className="summary-label">Vélocité moyenne</span>
              <span className="summary-value">
                {calculateAverageVelocity(sprintHistory)} SP/sprint
              </span>
            </div>
          </div>
        </div>

        <div className="history-content">
          {sprintHistory.length > 0 ? (
            <div className="sprint-history-list">
              <div className="history-list-header">
                <h4>📊 Détail par Sprint</h4>
              </div>

              <div className="sprint-items">
                {sprintHistory
                  .sort((a, b) => {
                    // Trier par nom de sprint (le dernier numéro en premier)
                    const nameA = a.name || "";
                    const nameB = b.name || "";

                    // Extraire les numéros de sprint des noms
                    const numberA = parseInt(nameA.match(/\d+/)?.[0] || "0");
                    const numberB = parseInt(nameB.match(/\d+/)?.[0] || "0");

                    // Trier par numéro décroissant (plus récent en premier)
                    return numberB - numberA;
                  })
                  .map((sprint) => (
                    <div key={sprint.id} className="sprint-history-card">
                      <div className="sprint-card-header">
                        <div className="sprint-title">
                          <span className="sprint-name">{sprint.name}</span>
                          <span className="sprint-date">
                            {new Date(
                              sprint.end_date || sprint.start_date
                            ).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="sprint-status-badge">
                          <span
                            className={`status-dot status-${sprint.status}`}
                          ></span>
                          {sprint.status === "completed"
                            ? "Terminé"
                            : sprint.status === "active"
                            ? "En cours"
                            : "Brouillon"}
                        </div>
                      </div>

                      <div className="sprint-card-metrics">
                        <div className="metric-row">
                          <div className="metric-group">
                            <span className="metric-label">
                              🎯 Story Points
                            </span>
                            <span className="metric-value">
                              <strong>
                                {sprint.metrics?.story_points?.completed || 0}
                              </strong>
                              <span className="metric-separator">/</span>
                              <span className="metric-total">
                                {sprint.metrics?.story_points?.total || 0}
                              </span>
                            </span>
                          </div>

                          <div className="metric-group">
                            <span className="metric-label">📋 Tâches</span>
                            <span className="metric-value">
                              <strong>{sprint.tasks?.completed || 0}</strong>
                              <span className="metric-separator">/</span>
                              <span className="metric-total">
                                {sprint.tasks?.total || 0}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="progress-section">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${
                                  sprint.tasks?.total > 0
                                    ? Math.round(
                                        (sprint.tasks?.completed /
                                          sprint.tasks?.total) *
                                          100
                                      )
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {sprint.tasks?.total > 0
                              ? Math.round(
                                  (sprint.tasks?.completed /
                                    sprint.tasks?.total) *
                                    100
                                )
                              : 0}
                            % complété
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="history-empty-state">
              <div className="empty-icon">📊</div>
              <h4>Aucun historique disponible</h4>
              <p>
                Cliquez sur le bouton 🔄 pour récupérer l'historique des sprints
                et analyser la performance de l'équipe
              </p>
              <div className="empty-features">
                <div className="feature-item">
                  <span className="feature-icon">📈</span>
                  <span>Suivi de la vélocité</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span>Analyse des story points</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>Taux de complétion</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClickUpSprintData;
