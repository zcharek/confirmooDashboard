#!/usr/bin/env node

/**
 * Script de test pour vérifier l'accès au dossier sprint configuré
 * Usage: node scripts/test-sprint-folder.js [TOKEN] [WORKSPACE_ID] [SPRINT_FOLDER_ID]
 */

const fetch = require("node-fetch");

// Configuration
const API_TOKEN = process.argv[2] || process.env.VITE_CLICKUP_API_TOKEN;
const WORKSPACE_ID = process.argv[3] || process.env.VITE_CLICKUP_WORKSPACE_ID;
const SPRINT_FOLDER_ID =
  process.argv[4] || process.env.VITE_CLICKUP_SPRINT_FOLDER_ID;

if (!API_TOKEN) {
  console.log("❌ Token API manquant!");
  console.log(
    "Usage: node scripts/test-sprint-folder.js [TOKEN] [WORKSPACE_ID] [SPRINT_FOLDER_ID]"
  );
  console.log(
    "Ou définissez la variable d'environnement VITE_CLICKUP_API_TOKEN"
  );
  process.exit(1);
}

const BASE_URL = "https://api.clickup.com/api/v2";

// Fonction utilitaire pour attendre
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testSprintFolder() {
  console.log("🔍 Test de l'accès au dossier sprint configuré...\n");
  console.log(`Token: ${API_TOKEN.substring(0, 20)}...`);
  console.log(`Workspace ID: ${WORKSPACE_ID}`);
  console.log(`Sprint Folder ID: ${SPRINT_FOLDER_ID}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // 1. Test d'accès au workspace
    console.log("1️⃣ Test d'accès au workspace...");
    const workspaceResponse = await fetch(`${BASE_URL}/team/${WORKSPACE_ID}`, {
      headers: {
        Authorization: API_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (workspaceResponse.ok) {
      const workspaceData = await workspaceResponse.json();
      console.log(`✅ Workspace accessible: ${workspaceData.team.name}`);
    } else if (workspaceResponse.status === 429) {
      console.log("⏳ Rate limit atteint, attente de 2s...");
      await delay(2000);
      console.log("🔄 Retry...");
      const retryResponse = await fetch(`${BASE_URL}/team/${WORKSPACE_ID}`, {
        headers: {
          Authorization: API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      if (retryResponse.ok) {
        const workspaceData = await retryResponse.json();
        console.log(`✅ Workspace accessible: ${workspaceData.team.name}`);
      } else {
        console.log(
          `❌ Erreur ${retryResponse.status}: ${retryResponse.statusText}`
        );
        return;
      }
    } else {
      console.log(
        `❌ Erreur ${workspaceResponse.status}: ${workspaceResponse.statusText}`
      );
      return;
    }

    // 2. Test d'accès au dossier sprint
    console.log("\n2️⃣ Test d'accès au dossier sprint...");
    const folderResponse = await fetch(
      `${BASE_URL}/folder/${SPRINT_FOLDER_ID}`,
      {
        headers: {
          Authorization: API_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    if (folderResponse.ok) {
      const folderData = await folderResponse.json();
      console.log(
        `✅ Dossier sprint accessible: ${folderData.folder?.name || "N/A"}`
      );
      console.log(`📁 Type: ${folderData.folder?.type || "N/A"}`);
      console.log(`🔗 URL: ${folderData.folder?.url || "N/A"}`);
    } else if (folderResponse.status === 429) {
      console.log("⏳ Rate limit atteint, attente de 2s...");
      await delay(2000);
      console.log("🔄 Retry...");
      const retryResponse = await fetch(
        `${BASE_URL}/folder/${SPRINT_FOLDER_ID}`,
        {
          headers: {
            Authorization: API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );
      if (retryResponse.ok) {
        const folderData = await retryResponse.json();
        console.log(
          `✅ Dossier sprint accessible: ${folderData.folder?.name || "N/A"}`
        );
        console.log(`📁 Type: ${folderData.folder?.type || "N/A"}`);
        console.log(`🔗 URL: ${folderData.folder?.url || "N/A"}`);
      } else {
        console.log(
          `❌ Erreur ${retryResponse.status}: ${retryResponse.statusText}`
        );
        return;
      }
    } else {
      console.log(
        `❌ Erreur ${folderResponse.status}: ${folderResponse.statusText}`
      );
      return;
    }

    // 3. Test de récupération des listes du dossier
    console.log("\n3️⃣ Test de récupération des listes du dossier...");
    const listsResponse = await fetch(
      `${BASE_URL}/folder/${SPRINT_FOLDER_ID}/list`,
      {
        headers: {
          Authorization: API_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    if (listsResponse.ok) {
      const listsData = await listsResponse.json();
      console.log(
        `✅ ${listsData.lists.length} listes trouvées dans le dossier sprint`
      );

      // Afficher les premières listes
      listsData.lists.slice(0, 5).forEach((list, index) => {
        console.log(`   ${index + 1}. ${list.name} (ID: ${list.id})`);
      });

      if (listsData.lists.length > 5) {
        console.log(`   ... et ${listsData.lists.length - 5} autres listes`);
      }
    } else if (listsResponse.status === 429) {
      console.log("⏳ Rate limit atteint, attente de 2s...");
      await delay(2000);
      console.log("🔄 Retry...");
      const retryResponse = await fetch(
        `${BASE_URL}/folder/${SPRINT_FOLDER_ID}/list`,
        {
          headers: {
            Authorization: API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );
      if (retryResponse.ok) {
        const listsData = await retryResponse.json();
        console.log(
          `✅ ${listsData.lists.length} listes trouvées dans le dossier sprint`
        );

        // Afficher les premières listes
        listsData.lists.slice(0, 5).forEach((list, index) => {
          console.log(`   ${index + 1}. ${list.name} (ID: ${list.id})`);
        });

        if (listsData.lists.length > 5) {
          console.log(`   ... et ${listsData.lists.length - 5} autres listes`);
        }
      } else {
        console.log(
          `❌ Erreur ${retryResponse.status}: ${retryResponse.statusText}`
        );
        return;
      }
    } else {
      console.log(
        `❌ Erreur ${listsResponse.status}: ${listsResponse.statusText}`
      );
      return;
    }

    // 4. Test de récupération des tâches d'une liste (si disponible)
    if (listsData && listsData.lists && listsData.lists.length > 0) {
      console.log("\n4️⃣ Test de récupération des tâches d'une liste...");
      const firstList = listsData.lists[0];
      console.log(`📋 Test avec la liste: ${firstList.name}`);

      const tasksResponse = await fetch(
        `${BASE_URL}/list/${firstList.id}/task?include_closed=true&subtasks=true&include_time=true&page=0`,
        {
          headers: {
            Authorization: API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        console.log(
          `✅ ${tasksData.tasks.length} tâches trouvées dans la liste`
        );

        if (tasksData.tasks.length > 0) {
          const firstTask = tasksData.tasks[0];
          console.log(`📝 Exemple de tâche: ${firstTask.name}`);
          console.log(`   Status: ${firstTask.status.status}`);
          console.log(`   Due Date: ${firstTask.due_date || "Non définie"}`);
          console.log(`   Created: ${firstTask.created_at}`);
        }
      } else if (tasksResponse.status === 429) {
        console.log("⏳ Rate limit atteint, attente de 2s...");
        await delay(2000);
        console.log("🔄 Retry...");
        const retryResponse = await fetch(
          `${BASE_URL}/list/${firstList.id}/task?include_closed=true&subtasks=true&include_time=true&page=0`,
          {
            headers: {
              Authorization: API_TOKEN,
              "Content-Type": "application/json",
            },
          }
        );
        if (retryResponse.ok) {
          const tasksData = await retryResponse.json();
          console.log(
            `✅ ${tasksData.tasks.length} tâches trouvées dans la liste`
          );

          if (tasksData.tasks.length > 0) {
            const firstTask = tasksData.tasks[0];
            console.log(`📝 Exemple de tâche: ${firstTask.name}`);
            console.log(`   Status: ${firstTask.status.status}`);
            console.log(`   Due Date: ${firstTask.due_date || "Non définie"}`);
            console.log(`   Created: ${firstTask.created_at}`);
          }
        } else {
          console.log(
            `❌ Erreur ${retryResponse.status}: ${retryResponse.statusText}`
          );
        }
      } else {
        console.log(
          `❌ Erreur ${tasksResponse.status}: ${tasksResponse.statusText}`
        );
      }
    }

    console.log("\n🎉 Tests terminés avec succès!");
    console.log("✅ Votre configuration ClickUp est correcte");
    console.log(
      "✅ Vous devriez maintenant voir tous vos sprints dans le dashboard"
    );
  } catch (error) {
    console.error("❌ Erreur lors des tests:", error.message);

    if (error.code === "ENOTFOUND") {
      console.log("🔧 Vérifiez votre connexion internet");
    } else if (error.message.includes("fetch")) {
      console.log(
        "🔧 Vérifiez que node-fetch est installé: npm install node-fetch"
      );
    }
  }
}

// Exécuter les tests
testSprintFolder();
