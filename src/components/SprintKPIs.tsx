import React from "react";

interface SprintKPIsProps {
  sprints: any[];
  selectedPeriod?: "current" | "last4" | "last8" | "all";
}

interface KPIMetrics {
  totalSprints: number;
  activeSprints: number;
  completedSprints: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  averageVelocity: number;
  averageStoryPoints: number;
  averageCycleTime: number;
  teamProductivity: number;
  sprintSuccessRate: number;
  backlogSize: number;
}

const SprintKPIs: React.FC<SprintKPIsProps> = ({
  sprints,
  selectedPeriod = "current",
}) => {
  // Filtrer les sprints selon la période sélectionnée
  const filterSprints = (sprints: any[], period: string) => {
    switch (period) {
      case "current":
        // Sprints actifs (en cours)
        return sprints.filter((sprint) => sprint.status === "active");
      case "last4":
        // 4 derniers sprints terminés
        const last4Sprints = sprints
          .filter((sprint) => sprint.status === "completed")
          .sort(
            (a, b) =>
              new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
          )
          .slice(0, 4);
        return last4Sprints;
      case "last8":
        // 8 derniers sprints terminés
        const last8Sprints = sprints
          .filter((sprint) => sprint.status === "completed")
          .sort(
            (a, b) =>
              new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
          )
          .slice(0, 8);
        return last8Sprints;
      case "all":
      default:
        return sprints;
    }
  };

  const filteredSprints = filterSprints(sprints, selectedPeriod);

  // Calculer les KPIs
  const calculateKPIs = (sprints: any[]): KPIMetrics => {
    if (sprints.length === 0) {
      return {
        totalSprints: 0,
        activeSprints: 0,
        completedSprints: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        averageVelocity: 0,
        averageStoryPoints: 0,
        averageCycleTime: 0,
        teamProductivity: 0,
        sprintSuccessRate: 0,
        backlogSize: 0,
      };
    }

    const totalSprints = sprints.length;
    const activeSprints = sprints.filter((s) => s.status === "active").length;
    const completedSprints = sprints.filter(
      (s) => s.status === "completed"
    ).length;

    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let overdueTasks = 0;
    let totalVelocity = 0;
    let totalStoryPoints = 0;
    let totalCycleTime = 0;
    let backlogSize = 0;

    sprints.forEach((sprint) => {
      totalTasks += sprint.tasks?.total || 0;
      completedTasks += sprint.tasks?.completed || 0;
      inProgressTasks += sprint.tasks?.in_progress || 0;
      overdueTasks += sprint.tasks?.overdue || 0;

      if (sprint.metrics?.velocity) {
        totalVelocity += sprint.metrics.velocity;
      }

      if (sprint.metrics?.story_points?.total) {
        totalStoryPoints += sprint.metrics.story_points.total;
      }

      if (sprint.team_performance?.average_cycle_time) {
        totalCycleTime += sprint.team_performance.average_cycle_time;
      }

      // Identifier le backlog (généralement la dernière liste)
      if (sprint.name?.toLowerCase().includes("backlog")) {
        backlogSize = sprint.tasks?.total || 0;
      }
    });

    const averageVelocity =
      totalVelocity > 0 ? Math.round(totalVelocity / sprints.length) : 0;
    const averageStoryPoints =
      totalStoryPoints > 0 ? Math.round(totalStoryPoints / sprints.length) : 0;
    const averageCycleTime =
      totalCycleTime > 0
        ? Math.round((totalCycleTime / sprints.length) * 10) / 10
        : 0;

    const teamProductivity =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const sprintSuccessRate =
      totalSprints > 0
        ? Math.round((completedSprints / totalSprints) * 100)
        : 0;

    return {
      totalSprints,
      activeSprints,
      completedSprints,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      averageVelocity,
      averageStoryPoints,
      averageCycleTime,
      teamProductivity,
      sprintSuccessRate,
      backlogSize,
    };
  };

  const kpis = calculateKPIs(filteredSprints);

  const getStatusColor = (
    value: number,
    type: "positive" | "negative" | "neutral"
  ) => {
    if (type === "positive") {
      if (value >= 80) return "#10b981"; // Vert
      if (value >= 60) return "#f59e0b"; // Orange
      return "#ef4444"; // Rouge
    } else if (type === "negative") {
      if (value <= 20) return "#10b981"; // Vert
      if (value <= 40) return "#f59e0b"; // Orange
      return "#ef4444"; // Rouge
    }
    return "#6b7280"; // Gris neutre
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "current":
        return "Sprints Actifs";
      case "last4":
        return "4 Derniers Sprints";
      case "last8":
        return "8 Derniers Sprints";
      case "all":
        return "Tous les Sprints";
      default:
        return "Sprints";
    }
  };

  if (sprints.length === 0) {
    return (
      <div className="sprint-kpis-container">
        <div className="no-data-message">
          <h3>Aucune donnée de sprint disponible</h3>
          <p>Les KPIs s'afficheront une fois les données chargées.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sprint-kpis-container">
      <div className="kpis-header">
        <h2>📊 Tableau de Bord - {getPeriodLabel()}</h2>
        <div className="period-selector">
          <select
            value={selectedPeriod}
            onChange={() => window.location.reload()} // Simple reload pour changer la période
            className="period-select"
          >
            <option value="current">Sprints Actifs</option>
            <option value="last4">4 Derniers Sprints</option>
            <option value="last8">8 Derniers Sprints</option>
            <option value="all">Tous les Sprints</option>
          </select>
        </div>
      </div>

      <div className="kpis-grid">
        {/* KPIs Principaux */}
        <div className="kpi-card primary">
          <div className="kpi-icon">🚀</div>
          <div className="kpi-content">
            <h3>Vélocité Moyenne</h3>
            <div
              className="kpi-value"
              style={{
                color: getStatusColor(kpis.averageVelocity, "positive"),
              }}
            >
              {kpis.averageVelocity}%
            </div>
            <p className="kpi-description">
              Taux de complétion moyen des sprints
            </p>
          </div>
        </div>

        <div className="kpi-card primary">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <h3>Productivité Équipe</h3>
            <div
              className="kpi-value"
              style={{
                color: getStatusColor(kpis.teamProductivity, "positive"),
              }}
            >
              {kpis.teamProductivity}%
            </div>
            <p className="kpi-description">
              Taux de complétion global des tâches
            </p>
          </div>
        </div>

        <div className="kpi-card primary">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-content">
            <h3>Taux de Succès</h3>
            <div
              className="kpi-value"
              style={{
                color: getStatusColor(kpis.sprintSuccessRate, "positive"),
              }}
            >
              {kpis.sprintSuccessRate}%
            </div>
            <p className="kpi-description">
              Pourcentage de sprints terminés avec succès
            </p>
          </div>
        </div>

        <div className="kpi-card primary">
          <div className="kpi-icon">⏱️</div>
          <div className="kpi-content">
            <h3>Cycle Time Moyen</h3>
            <div
              className="kpi-value"
              style={{
                color: getStatusColor(kpis.averageCycleTime, "negative"),
              }}
            >
              {kpis.averageCycleTime}j
            </div>
            <p className="kpi-description">
              Temps moyen pour compléter une tâche
            </p>
          </div>
        </div>
      </div>

      <div className="kpis-secondary-grid">
        {/* KPIs Secondaires */}
        <div className="kpi-card secondary">
          <div className="kpi-header">
            <h4>📊 Vue d'ensemble</h4>
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-label">Sprints Totaux</span>
              <span className="stat-value">{kpis.totalSprints}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sprints Actifs</span>
              <span className="stat-value active">{kpis.activeSprints}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sprints Terminés</span>
              <span className="stat-value completed">
                {kpis.completedSprints}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card secondary">
          <div className="kpi-header">
            <h4>📋 Tâches</h4>
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{kpis.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Complétées</span>
              <span className="stat-value completed">
                {kpis.completedTasks}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">En Cours</span>
              <span className="stat-value in-progress">
                {kpis.inProgressTasks}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">En Retard</span>
              <span className="stat-value overdue">{kpis.overdueTasks}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card secondary">
          <div className="kpi-header">
            <h4>🎯 Story Points</h4>
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-label">Moyenne par Sprint</span>
              <span className="stat-value">{kpis.averageStoryPoints}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Estimé</span>
              <span className="stat-value">
                {kpis.averageStoryPoints * kpis.totalSprints}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card secondary">
          <div className="kpi-header">
            <h4>📚 Backlog</h4>
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-label">Tâches en Attente</span>
              <span className="stat-value backlog">{kpis.backlogSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sprints Estimés</span>
              <span className="stat-value">
                {kpis.averageStoryPoints > 0
                  ? Math.ceil(kpis.backlogSize / kpis.averageStoryPoints)
                  : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé des tendances */}
      <div className="trends-summary">
        <h3>📈 Tendances et Insights</h3>
        <div className="trends-grid">
          <div className="trend-item">
            <span className="trend-icon">💡</span>
            <span className="trend-text">
              {kpis.averageVelocity >= 80
                ? "Excellente vélocité ! L'équipe maintient un rythme soutenu."
                : kpis.averageVelocity >= 60
                ? "Bonne vélocité. Quelques améliorations possibles."
                : "Vélocité à améliorer. Considérez revoir la planification des sprints."}
            </span>
          </div>

          <div className="trend-item">
            <span className="trend-icon">🎯</span>
            <span className="trend-text">
              {kpis.sprintSuccessRate >= 90
                ? "Taux de succès exceptionnel ! L'équipe respecte ses engagements."
                : kpis.sprintSuccessRate >= 70
                ? "Bon taux de succès. Quelques ajustements mineurs."
                : "Taux de succès à améliorer. Revoyez la capacité des sprints."}
            </span>
          </div>

          <div className="trend-item">
            <span className="trend-icon">⚡</span>
            <span className="trend-text">
              {kpis.overdueTasks === 0
                ? "Aucune tâche en retard ! Excellente gestion du temps."
                : `${kpis.overdueTasks} tâches en retard. Surveillez les deadlines.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintKPIs;
