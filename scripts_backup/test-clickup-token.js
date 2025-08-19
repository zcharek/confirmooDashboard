#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration ClickUp API
 * Usage: node scripts/test-clickup-token.js [TOKEN] [WORKSPACE_ID]
 */

const fetch = require("node-fetch");

// Configuration
const CLICKUP_BASE_URL = "https://api.clickup.com/api/v2";
const API_TOKEN = process.argv[2] || process.env.VITE_CLICKUP_API_TOKEN;
const WORKSPACE_ID =
  process.argv[3] || process.env.VITE_CLICKUP_WORKSPACE_ID;

if (!API_TOKEN) {
  console.error("❌ Token API manquant!");
  console.log(
    "Usage: node scripts/test-clickup-token.js [TOKEN] [WORKSPACE_ID]"
  );
  console.log(
    "Ou définissez la variable d'environnement VITE_CLICKUP_API_TOKEN"
  );
  process.exit(1);
}

if (!WORKSPACE_ID) {
  console.error("❌ ID du workspace manquant!");
  console.log(
    "Usage: node scripts/test-clickup-token.js [TOKEN] [WORKSPACE_ID]"
  );
  console.log(
    "Ou définissez la variable d'environnement VITE_CLICKUP_WORKSPACE_ID"
  );
  process.exit(1);
}

console.log("🔍 Test de la configuration ClickUp API...\n");
console.log(`Token: ${API_TOKEN.substring(0, 20)}...`);
console.log(`Workspace ID: ${WORKSPACE_ID}`);
console.log(`Base URL: ${CLICKUP_BASE_URL}\n`);

const headers = {
  Authorization: API_TOKEN,
  "Content-Type": "application/json",
};

async function testClickUpAPI() {
  try {
    // Test 1: Vérifier l'accès aux teams/workspaces
    console.log("1️⃣ Test d'accès aux workspaces...");
    const teamsResponse = await fetch(`${CLICKUP_BASE_URL}/team`, { headers });

    if (!teamsResponse.ok) {
      const errorData = await teamsResponse.json().catch(() => ({}));
      console.error(
        `❌ Erreur ${teamsResponse.status}: ${teamsResponse.statusText}`
      );
      if (errorData.err && errorData.ECODE) {
        console.error(`   Code d'erreur: ${errorData.ECODE}`);
        console.error(`   Message: ${errorData.err}`);
      }
      return false;
    }

    const teamsData = await teamsResponse.json();
    console.log(`✅ Accès aux workspaces réussi!`);
    console.log(`   Workspaces disponibles: ${teamsData.teams?.length || 0}`);

    // Test 2: Vérifier l'accès au workspace spécifique
    console.log("\n2️⃣ Test d'accès au workspace spécifique...");
    const spacesResponse = await fetch(
      `${CLICKUP_BASE_URL}/team/${WORKSPACE_ID}/space`,
      { headers }
    );

    if (!spacesResponse.ok) {
      const errorData = await spacesResponse.json().catch(() => ({}));
      console.error(
        `❌ Erreur ${spacesResponse.status}: ${spacesResponse.statusText}`
      );
      if (errorData.err && errorData.ECODE) {
        console.error(`   Code d'erreur: ${errorData.ECODE}`);
        console.error(`   Message: ${errorData.err}`);
      }
      return false;
    }

    const spacesData = await spacesResponse.json();
    console.log(`✅ Accès au workspace réussi!`);
    console.log(`   Espaces disponibles: ${spacesData.spaces?.length || 0}`);

    // Afficher les espaces
    if (spacesData.spaces && spacesData.spaces.length > 0) {
      console.log("\n   📁 Espaces trouvés:");
      spacesData.spaces.forEach((space, index) => {
        console.log(`      ${index + 1}. ${space.name} (ID: ${space.id})`);
      });
    }

    // Test 3: Vérifier l'accès aux listes du premier espace
    if (spacesData.spaces && spacesData.spaces.length > 0) {
      console.log("\n3️⃣ Test d'accès aux listes...");
      const firstSpace = spacesData.spaces[0];
      const listsResponse = await fetch(
        `${CLICKUP_BASE_URL}/space/${firstSpace.id}/list`,
        { headers }
      );

      if (!listsResponse.ok) {
        const errorData = await listsResponse.json().catch(() => ({}));
        console.error(
          `❌ Erreur ${listsResponse.status}: ${listsResponse.statusText}`
        );
        if (errorData.err && errorData.ECODE) {
          console.error(`   Code d'erreur: ${errorData.ECODE}`);
          console.error(`   Message: ${errorData.err}`);
        }
        return false;
      }

      const listsData = await listsResponse.json();
      console.log(`✅ Accès aux listes réussi!`);
      console.log(
        `   Listes disponibles dans "${firstSpace.name}": ${
          listsData.lists?.length || 0
        }`
      );

      // Afficher les listes
      if (listsData.lists && listsData.lists.length > 0) {
        console.log("\n   📋 Listes trouvées:");
        listsData.lists.slice(0, 5).forEach((list, index) => {
          console.log(
            `      ${index + 1}. ${list.name} (${list.task_count} tâches)`
          );
        });
        if (listsData.lists.length > 5) {
          console.log(
            `      ... et ${listsData.lists.length - 5} autres listes`
          );
        }
      }
    }

    console.log("\n🎉 Tous les tests sont passés avec succès!");
    console.log("✅ Votre configuration ClickUp API est valide.");
    return true;
  } catch (error) {
    console.error("\n❌ Erreur lors du test:", error.message);
    return false;
  }
}

// Exécuter les tests
testClickUpAPI().then((success) => {
  if (!success) {
    console.log("\n🔧 Suggestions de résolution:");
    console.log("1. Vérifiez que votre token API est valide et non expiré");
    console.log(
      "2. Assurez-vous que votre app ClickUp a les bonnes permissions"
    );
    console.log("3. Vérifiez que vous êtes membre du workspace");
    console.log("4. Consultez le guide CLICKUP_SETUP.md pour plus de détails");
    process.exit(1);
  }
});
