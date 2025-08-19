import React from "react";
import { SprintVelocityStorage } from "../utils/sprintVelocityStorage";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SprintChartsProps {
  sprints: any[];
}

const SprintCharts: React.FC<SprintChartsProps> = ({ sprints }) => {
  if (!sprints || sprints.length === 0) {
    return (
      <div className="sprint-charts-container">
        <div className="no-data-message">
          <h3>Aucune donnée de sprint disponible</h3>
          <p>Les graphiques s'afficheront une fois les données chargées.</p>
        </div>
      </div>
    );
  }

  // Préparer les données pour les graphiques
  const prepareChartData = () => {
    // Utiliser l'historique des story points complétés enregistré
    const velocityHistory = SprintVelocityStorage.getAll();
    const labels = velocityHistory.map(
      (e) =>
        `${e.sprintName || "Sprint"} (${new Date(e.endDate).toLocaleDateString(
          "fr-FR"
        )})`
    );
    const storyPointsCompleted = velocityHistory.map(
      (e) => e.completedStoryPoints || 0
    );

    // Compléter avec le sprint en cours si présent dans props
    const current = sprints.find((s) => s.status === "active");
    if (current) {
      labels.push(
        `${current.name} (${new Date(current.end_date).toLocaleDateString(
          "fr-FR"
        )})`
      );
      storyPointsCompleted.push(current.metrics?.story_points?.completed || 0);
    }

    return {
      labels,
      storyPointsCompleted,
    };
  };

  const chartData = prepareChartData();

  // Configuration des graphiques
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Tendances des Sprints",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Graphique de vélocité (story points complétés par sprint)
  const velocityChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Story Points complétés",
        data: chartData.storyPointsCompleted,
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 2,
      },
    ],
  };

  // Retirer autres graphiques pour simplification



  return (
    <div className="sprint-charts-container">
      <div className="charts-header">
        <h3>📊 Graphiques et Tendances</h3>
        <p>Story points complétés par sprint (historique + sprint en cours)</p>
      </div>

      <div className="charts-grid">
        {/* Graphique des story points complétés */}
        <div className="chart-card">
          <h4>🚀 Vélocité (Story points complétés)</h4>
          <p className="chart-description">Capacité livrée par sprint</p>
          <Line data={velocityChartData} options={chartOptions} />
        </div>
      </div>

      {/* Résumé des insights */}
      <div className="charts-insights">
        <h4>💡 Insights des Graphiques</h4>
        <div className="insights-grid">
          <div className="insight-item">
            <span className="insight-icon">📈</span>
            <div className="insight-content">
              <h5>Capacité de l'équipe</h5>
              <p>
                {`Moyenne (4 derniers sprints): ${Math.round(
                  SprintVelocityStorage.getAverageCompleted(4) || 0
                )} pts`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintCharts;
