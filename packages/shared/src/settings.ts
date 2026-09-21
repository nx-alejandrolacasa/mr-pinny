// Global settings (storage.local): whether to restore every pinned tab when
// the browser starts, and how long a pinned tab must sit unselected before
// "restore when idle" kicks in, and whether "open external links in new tab"
// treats subdomains of the pinned site as internal.

export interface Settings {
  restoreOnStartup: boolean;
  idleMinutes: number;
  subdomainsAreSameSite: boolean;
}

export const IDLE_MIN_MINUTES = 1;
export const IDLE_MAX_MINUTES = 24 * 60;
export const DEFAULT_SETTINGS: Settings = {
  restoreOnStartup: true,
  idleMinutes: 120,
  subdomainsAreSameSite: true,
};

export const SETTINGS_STORAGE_KEY = "settings";

export function clampIdleMinutes(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.idleMinutes;
  return Math.min(IDLE_MAX_MINUTES, Math.max(IDLE_MIN_MINUTES, Math.round(n)));
}

export function normalizeSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null) return { ...DEFAULT_SETTINGS };
  const v = value as Record<string, unknown>;
  return {
    restoreOnStartup: (v.restoreOnStartup ?? DEFAULT_SETTINGS.restoreOnStartup) === true,
    idleMinutes: clampIdleMinutes(v.idleMinutes ?? DEFAULT_SETTINGS.idleMinutes),
    subdomainsAreSameSite: (v.subdomainsAreSameSite ?? DEFAULT_SETTINGS.subdomainsAreSameSite) === true,
  };
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(data[SETTINGS_STORAGE_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: normalizeSettings(settings) });
}
