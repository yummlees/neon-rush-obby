const KEY = "neon-rush-obby-v1";
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  bestTime: number | null;
  muted: boolean;
}

const defaults: SaveData = {
  version: SAVE_VERSION,
  bestTime: null,
  muted: false,
};

function migrate(raw: SaveData): SaveData {
  const s = { ...defaults, ...raw };
  s.version = SAVE_VERSION;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    return { ...defaults };
  }
}

export function writeSave(partial: Partial<SaveData>): SaveData {
  const next = { ...loadSave(), ...partial, version: SAVE_VERSION };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota — keep going with in-memory values.
  }
  return next;
}

export function recordBest(time: number): number {
  const cur = loadSave();
  const best =
    cur.bestTime == null || time < cur.bestTime ? time : cur.bestTime;
  writeSave({ bestTime: best });
  return best;
}
