const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const QASE_API_TOKEN =
  "bea8b711a16a7f25442134a3c148eeccccbfe83687da4d763ce07eccda803e5a";
const QASE_PROJECT_CODE = "CONFIRMOO";

async function fetchQaseData() {
  try {
    console.log("Fetching Qase test runs...");

    const response = await fetch(
      `https://api.qase.io/v1/run/${QASE_PROJECT_CODE}?limit=10`,
      {
        method: "GET",
        headers: {
          Token: QASE_API_TOKEN,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      // Transform data for frontend
      const testRuns = data.result.entities.map((run) => {
        console.log("Processing run:", run);

        const passed = run.stats?.passed || 0;
        const failed = run.stats?.failed || 0;
        const skipped = run.stats?.skipped || 0;
        const total = run.stats?.total || 0;

        let status = "pending";
        if (run.status_text === "passed") status = "passed";
        else if (run.status_text === "failed") status = "failed";
        else if (run.status_text === "in_progress") status = "running";

        let duration = "N/A";
        if (run.elapsed_time && run.elapsed_time > 0) {
          const minutes = Math.floor(run.elapsed_time / 60000); // Convert milliseconds to minutes
          const seconds = Math.floor((run.elapsed_time % 60000) / 1000); // Convert remaining to seconds
          duration = `${minutes}m ${seconds}s`;
        }

        let lastRun = "N/A";
        if (run.start_time) {
          try {
            lastRun = new Date(run.start_time).toLocaleString("fr-FR");
          } catch (e) {
            lastRun = "Date invalide";
          }
        }

        return {
          id: run.id.toString(),
          name: run.title || `Test Run ${run.id}`,
          status: status,
          passed: passed,
          failed: failed,
          skipped: skipped,
          total: total,
          lastRun: lastRun,
          lastUpdated: new Date().toISOString(),
        };
      });

      // Save to public folder for GitHub Pages
      const outputPath = path.join(__dirname, "../public/qase-data.json");
      fs.writeFileSync(outputPath, JSON.stringify(testRuns, null, 2));

      console.log(`✅ Data saved to ${outputPath}`);
      console.log(`📊 Found ${testRuns.length} test runs`);
    } else {
      console.error("❌ Qase API error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Error fetching data:", error.message);
  }
}

fetchQaseData();
