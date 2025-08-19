// Stockage local de la vélocité par sprint (story points complétés)

export interface SprintVelocityEntry {
  sprintId: string;
  sprintName: string;
  endDate: string; // ISO string YYYY-MM-DD
  completedStoryPoints: number;
}

const STORAGE_KEY = "sprint_velocity_history";

function readStorage(): SprintVelocityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SprintVelocityEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: SprintVelocityEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // noop
  }
}

export const SprintVelocityStorage = {
  save(entry: SprintVelocityEntry) {
    const entries = readStorage();
    // Unicité par sprintId (ou endDate si même sprintId est réutilisé)
    const idx = entries.findIndex(
      (e) => e.sprintId === entry.sprintId || e.endDate === entry.endDate
    );
    if (idx >= 0) {
      entries[idx] = entry;
    } else {
      entries.push(entry);
    }
    // Garder au plus 24 derniers sprints
    entries.sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
    const trimmed = entries.slice(-24);
    writeStorage(trimmed);
  },

  getAll(): SprintVelocityEntry[] {
    const entries = readStorage();
    return entries.sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
  },

  getLastN(n: number): SprintVelocityEntry[] {
    const entries = SprintVelocityStorage.getAll();
    return entries.slice(-n);
  },

  getAverageCompleted(lastN: number = 4): number {
    const recent = SprintVelocityStorage.getLastN(lastN);
    if (recent.length === 0) return 0;
    const sum = recent.reduce((acc, e) => acc + (e.completedStoryPoints || 0), 0);
    return Math.round(sum / recent.length);
  },
};


