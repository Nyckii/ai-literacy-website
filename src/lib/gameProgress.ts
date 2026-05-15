const STORAGE_KEY = "ai-literacy-game-progress";
const PROGRESS_EVENT = "game-progress-changed";

type ProgressMap = Record<string, number>;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getAllGameProgress(): ProgressMap {
  if (!canUseStorage()) return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ProgressMap;
    return Object.fromEntries(
      Object.entries(parsed).map(([slug, value]) => [slug, clampProgress(value)]),
    );
  } catch {
    return {};
  }
}

export function getGameProgress(slug: string) {
  return getAllGameProgress()[slug] ?? 0;
}

export function setGameProgress(slug: string, value: number) {
  if (!canUseStorage()) return;
  const current = getAllGameProgress();
  current[slug] = clampProgress(value);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}

export function markGameCompleted(slug: string) {
  if (getGameProgress(slug) >= 100) return;
  setGameProgress(slug, 100);
}

export function subscribeToGameProgress(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(PROGRESS_EVENT, onChange as EventListener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PROGRESS_EVENT, onChange as EventListener);
  };
}
