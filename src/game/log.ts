// Anonymous local learning log (localStorage only; nothing leaves the device).
export interface LearnEvent {
  at: number; // ms since session start
  level: string;
  action: 'tag' | 'place' | 'connect' | 'disconnect' | 'remove' | 'run' | 'win' | 'fail' | 'hint' | 'reject' | 'still-temp' | 'lens';
  values?: Record<string, unknown>;
  outcome?: string;
  hintsUsed: number;
  run: number;
  /** true when this was the player's first decision of its kind on this level and no hint was used yet */
  firstUnaided?: boolean;
}

const KEY = 'cleanflow.log.v1';
const start = performance.now();
let memory: LearnEvent[] = [];

function load(): LearnEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LearnEvent[];
  } catch {
    return [];
  }
}

export function logEvent(e: Omit<LearnEvent, 'at'>): void {
  const ev = { ...e, at: Math.round(performance.now() - start) };
  memory.push(ev);
  try {
    const all = load();
    all.push(ev);
    localStorage.setItem(KEY, JSON.stringify(all.slice(-2000)));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

export function sessionLog(): LearnEvent[] {
  return memory;
}

export function clearLog(): void {
  memory = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ---- progress (stars per week) ----
const PKEY = 'cleanflow.progress.v1';
export function loadProgress(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PKEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
export function saveProgress(p: Record<string, number>): void {
  try {
    localStorage.setItem(PKEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
