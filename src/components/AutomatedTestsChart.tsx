import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Interface TestRun importée depuis App.tsx
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

interface AutomatedTestsChartProps {
  testRuns: TestRun[];
}

const AutomatedTestsChart: React.FC<AutomatedTestsChartProps> = ({
  testRuns,
}) => {
  // Simplifier les données - utiliser directement ce que Qase retourne
  const chartData = testRuns.map((run) => ({
    name: run.name,
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    total: run.total,
    status: run.status,
    date: new Date(run.lastUpdated).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }),
    fullDate: run.lastUpdated,
  }));

  // Trier par date (plus ancien en premier, donc le plus récent sera à droite)
  const sortedData = chartData.sort(
    (a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
  );



  const chartConfig = {
    labels: sortedData.map((item) => item.date),
    datasets: [
      {
        label: "Passed",
        data: sortedData.map((item) => item.passed),
        backgroundColor: "rgba(34, 197, 94, 0.9)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
        borderRadius: 4,
        barPercentage: 0.2,
        categoryPercentage: 0.95,
      },
      {
        label: "Failed",
        data: sortedData.map((item) => item.failed),
        backgroundColor: "rgba(239, 68, 68, 0.9)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
        borderRadius: 4,
        barPercentage: 0.2,
        categoryPercentage: 0.95,
      },
      {
        label: "Skipped",
        data: sortedData.map((item) => item.skipped),
        backgroundColor: "rgba(156, 163, 175, 0.9)",
        borderColor: "rgba(156, 163, 175, 1)",
        borderWidth: 2,
        borderRadius: 4,
        barPercentage: 0.2,
        categoryPercentage: 0.95,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 1.5, // Ratio plus large pour un graphique compact
    plugins: {
      legend: {
        display: false, // Masquer la légende
      },
      title: {
        display: true,
        color: "#2d3748",
        font: {
          size: 18,
          weight: 700,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(34, 197, 94, 0.5)",
        borderWidth: 1,
        callbacks: {
          title: function (context: any) {
            const runIndex = context[0].dataIndex;
            const run = sortedData[runIndex];
            const position = runIndex + 1;
            const total = sortedData.length;

            if (run.name.includes("Daily Execution")) {
              return `Exécution quotidienne - ${run.date} (${position}/${total})`;
            }
            return `${run.name} (${run.date}) - ${position}/${total}`;
          },
          label: function (context: any) {
            if (context.datasetIndex === 0) {
              return `Passed: ${context.parsed.y}`;
            } else if (context.datasetIndex === 1) {
              return `Failed: ${context.parsed.y}`;
            } else {
              return `Skipped: ${context.parsed.y}`;
            }
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        stacked: true, // Active l'empilement des barres
        ticks: {
          color: "#4a5568",
          font: {
            size: 12,
          },
          stepSize: 1,
          callback: function (value: any) {
            return Math.floor(value) === value ? value : "";
          },
        },
        title: {
          display: true,
          text: "Nombre de Tests",
          color: "#4a5568",
          font: {
            size: 14,
            weight: 600,
          },
        },
      },
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        stacked: true, // Active l'empilement des barres
        ticks: {
          color: "#4a5568",
          font: {
            size: 11,
          },
          maxRotation: 45,
        },
        title: {
          display: true,

          color: "#4a5568",
          font: {
            size: 14,
            weight: 600,
          },
        },
      },
    },
  };

  if (testRuns.length === 0) {
    return (
      <div className="chart-container empty">
        <p>Aucune donnée de test disponible pour afficher le graphique</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <Bar data={chartConfig} options={options} />
    </div>
  );
};

export default AutomatedTestsChart;
