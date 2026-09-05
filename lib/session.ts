export type SessionLogEntry = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  note: string;
};

const STORAGE_KEY = "wh05h3ar.sessionLog";

export function loadLog(): SessionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLog(entries: SessionLogEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
