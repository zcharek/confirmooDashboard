const fetch = require("node-fetch");

async function testQaseRuns() {
  try {
    console.log("🧪 Test des runs Qase...");
    
    const response = await fetch("http://localhost:3002/api/qase/runs");
    if (response.ok) {
      const data = await response.json();
      
      console.log("✅ Réponse du serveur:");
      console.log("📊 Nombre total de runs:", data.result?.total);
      console.log("📊 Nombre d'entités:", data.result?.entities?.length);
      
      if (data.result?.entities) {
        console.log("\n🔍 Détail des runs:");
        data.result.entities.forEach((run, index) => {
          console.log(`\n--- Run ${index + 1} ---`);
          console.log("ID:", run.id);
          console.log("Nom:", run.name);
          console.log("Date:", run.lastUpdated);
          console.log("Statut:", run.status);
          console.log("Passed:", run.passed);
          console.log("Failed:", run.failed);
          console.log("Skipped:", run.skipped);
          console.log("Total:", run.total);
          console.log("isHistorical:", run.isHistorical);
          console.log("isCurrentRun:", run.isCurrentRun);
          console.log("testCount:", run.testCount);
        });
      }
    } else {
      console.error("❌ Erreur:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Erreur de connexion:", error.message);
  }
}

testQaseRuns();
