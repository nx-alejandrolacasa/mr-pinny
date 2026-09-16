// Pinned-tab configuration (storage.local) and the pure logic that pairs
// stored configs with live pinned tabs.
//
// Tab ids are not stable across browser restarts, so a config is identified
// by its own id and the tabId → pinId pairing lives in storage.session. When
// a pinned tab has no pairing (after a restart, a new pin, a background
// restart) `reconcilePins` pairs it with a config of the same origin, then
// by position, and finally creates a config from the tab's current URL.

export interface PinConfig {
  id: string;
  url: string;
  restoreWhenIdle: boolean;
  openLinksInNewTab: boolean;
}

export type PinPatch = Partial<Omit<PinConfig, "id">>;

export type TabPinMap = Record<string, string>;

export interface PinnedTabLike {
  id?: number;
  windowId: number;
  index: number;
  url?: string;
  pendingUrl?: string;
}

const STORAGE_KEY = "pins";

export function isValidPinUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string): string {
  try {
    return new URL(value).href;
  } catch {
    return value.trim();
  }
}

export function sameUrl(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return normalizeUrl(a) === normalizeUrl(b);
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function tabUrl(tab: PinnedTabLike): string {
  return tab.url || tab.pendingUrl || "";
}

export function newPinId(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isPinConfig(value: unknown): value is PinConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && v.id.length > 0 && typeof v.url === "string";
}

export function normalizePin(value: PinConfig): PinConfig {
  return {
    id: value.id,
    url: isValidPinUrl(value.url) ? normalizeUrl(value.url) : "",
    restoreWhenIdle: value.restoreWhenIdle === true,
    openLinksInNewTab: value.openLinksInNewTab === true,
  };
}

export function normalizePins(value: unknown): PinConfig[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const pins: PinConfig[] = [];
  for (const item of value) {
    if (!isPinConfig(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    pins.push(normalizePin(item));
  }
  return pins;
}

export function applyPatch(pin: PinConfig, patch: PinPatch): PinConfig {
  return normalizePin({ ...pin, ...patch, id: pin.id });
}

export function sortPinnedTabs<T extends PinnedTabLike>(tabs: readonly T[]): T[] {
  return [...tabs].sort((a, b) => a.windowId - b.windowId || a.index - b.index);
}

export interface Reconciled {
  pins: PinConfig[];
  map: TabPinMap;
  changed: boolean;
}

export function reconcilePins(
  pins: readonly PinConfig[],
  tabs: readonly PinnedTabLike[],
  map: TabPinMap,
  { keepUnmatched = false }: { keepUnmatched?: boolean } = {}
): Reconciled {
  const liveTabs = sortPinnedTabs(tabs).filter((tab) => tab.id !== undefined);
  const byId = new Map(pins.map((pin) => [pin.id, pin]));
  const nextMap: TabPinMap = {};
  const pairedPins = new Set<string>();

  for (const tab of liveTabs) {
    const pinId = map[String(tab.id)];
    if (pinId && byId.has(pinId) && !pairedPins.has(pinId)) {
      nextMap[String(tab.id)] = pinId;
      pairedPins.add(pinId);
    }
  }

  const freeTabs = liveTabs.filter((tab) => !(String(tab.id) in nextMap));
  const freePins = pins.filter((pin) => !pairedPins.has(pin.id));

  const pair = (tab: PinnedTabLike, pin: PinConfig) => {
    nextMap[String(tab.id)] = pin.id;
    pairedPins.add(pin.id);
    freePins.splice(freePins.indexOf(pin), 1);
  };

  const unpairedTabs: PinnedTabLike[] = [];
  for (const tab of freeTabs) {
    const origin = originOf(tabUrl(tab));
    const match = origin ? freePins.find((pin) => originOf(pin.url) === origin) : undefined;
    if (match) pair(tab, match);
    else unpairedTabs.push(tab);
  }

  const created: PinConfig[] = [];
  for (const tab of unpairedTabs) {
    const next = freePins[0];
    if (next) {
      pair(tab, next);
      continue;
    }
    const url = tabUrl(tab);
    const pin: PinConfig = {
      id: newPinId(),
      url: isValidPinUrl(url) ? normalizeUrl(url) : "",
      restoreWhenIdle: false,
      openLinksInNewTab: false,
    };
    created.push(pin);
    byId.set(pin.id, pin);
    nextMap[String(tab.id)] = pin.id;
    pairedPins.add(pin.id);
  }

  const ordered = liveTabs
    .map((tab) => byId.get(nextMap[String(tab.id)] ?? ""))
    .filter((pin): pin is PinConfig => pin !== undefined);
  const leftovers = keepUnmatched ? pins.filter((pin) => !pairedPins.has(pin.id)) : [];
  const nextPins = [...ordered, ...leftovers];

  const changed =
    JSON.stringify(nextPins) !== JSON.stringify(pins) ||
    JSON.stringify(nextMap) !== JSON.stringify(map);
  return { pins: nextPins, map: nextMap, changed };
}

export async function loadPins(): Promise<PinConfig[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return normalizePins(data[STORAGE_KEY]);
}

export async function savePins(pins: readonly PinConfig[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizePins(pins) });
}
