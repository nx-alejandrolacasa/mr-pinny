// Background: owns the pairing between live pinned tabs and stored configs,
// answers the popup and the content scripts, restores tabs on demand, when
// they have sat unselected for the configured idle time, and on startup.

import {
  applyPatch,
  isValidPinUrl,
  loadPins,
  reconcilePins,
  sameUrl,
  savePins,
  tabUrl,
  type PinConfig,
  type PinPatch,
  type TabPinMap,
} from "./pins";
import { loadSettings } from "./settings";
import { isRequest, type LinkPolicy, type PinView, type Push, type Request } from "./messages";

const MAP_KEY = "tabPins";
const IDLE_SINCE_KEY = "idleSince";
const IDLE_RESTORED_KEY = "idleRestored";
const IDLE_ALARM = "idle-check";
const STARTUP_RESTORE_DELAY_MS = 2500;

type Stamps = Record<string, number>;

interface State {
  pins: PinConfig[];
  map: TabPinMap;
  tabs: chrome.tabs.Tab[];
}

export function runBackground(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void ensureIdleAlarm();
    void serialized(() => syncState());
  });

  chrome.runtime.onStartup.addListener(() => {
    void ensureIdleAlarm();
    void serialized(() => syncState({ keepUnmatched: true }));
    setTimeout(() => void serialized(restoreAllOnStartup), STARTUP_RESTORE_DELAY_MS);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.pinned === undefined) return;
    void serialized(() => (changeInfo.pinned ? pinnedTabAppeared(tabId) : forgetTab(tabId)));
  });

  chrome.tabs.onRemoved.addListener((tabId, { isWindowClosing }) => {
    if (isWindowClosing) return;
    void serialized(() => forgetTab(tabId));
  });

  chrome.tabs.onActivated.addListener(() => void serialized(tickIdle));

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === IDLE_ALARM) void serialized(tickIdle);
  });

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isRequest(message)) return;
    serialized(() => handle(message, sender)).then(sendResponse, (error: unknown) => {
      console.error("[mr-pinny]", error);
      sendResponse(undefined);
    });
    return true;
  });

  void ensureIdleAlarm();
}

async function handle(request: Request, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (request.type) {
    case "list-pins":
      return listPins();
    case "update-pin":
      return updatePin(request.id, request.patch);
    case "restore-pin":
      return restorePin(request.id);
    case "restore-all":
      return restoreAll();
    case "get-link-policy":
      return linkPolicy(sender.tab?.id);
    case "open-link":
      return openLink(request.url, sender.tab);
  }
}

// --- popup -----------------------------------------------------------------

async function listPins(): Promise<PinView[]> {
  const { pins, map, tabs } = await syncState();
  const views: PinView[] = [];
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    const pin = pins.find((p) => p.id === map[String(tab.id)]);
    if (!pin) continue;
    views.push({
      ...pin,
      tabId: tab.id,
      windowId: tab.windowId,
      title: tab.title ?? "",
      currentUrl: tabUrl(tab),
      favIconUrl: tab.favIconUrl,
    });
  }
  return views;
}

async function updatePin(id: string, patch: PinPatch): Promise<void> {
  const state = await syncState();
  const previous = state.pins.find((pin) => pin.id === id);
  if (!previous) return;
  const next = applyPatch(previous, patch);
  state.pins = state.pins.map((pin) => (pin.id === id ? next : pin));
  await savePins(state.pins);

  const tabId = tabIdFor(state.map, id);
  if (tabId === undefined) return;
  if (next.url !== previous.url && next.url) await restoreTab(tabId, next.url);
  if (next.openLinksInNewTab !== previous.openLinksInNewTab) {
    pushLinkPolicy(tabId, next.openLinksInNewTab);
  }
}

async function restorePin(id: string): Promise<void> {
  const { pins, map } = await syncState();
  const pin = pins.find((p) => p.id === id);
  const tabId = tabIdFor(map, id);
  if (pin && tabId !== undefined) await restoreTab(tabId, pin.url);
}

async function restoreAll(): Promise<void> {
  const { pins, map, tabs } = await syncState();
  await Promise.all(
    tabs.map((tab) => {
      const pin = pins.find((p) => p.id === map[String(tab.id)]);
      return pin && tab.id !== undefined ? restoreTab(tab.id, pin.url) : Promise.resolve();
    })
  );
}

async function restoreAllOnStartup(): Promise<void> {
  const { restoreOnStartup } = await loadSettings();
  if (!restoreOnStartup) return;
  const { pins, map, tabs } = await syncState({ keepUnmatched: true });
  await Promise.all(
    tabs.map((tab) => {
      const pin = pins.find((p) => p.id === map[String(tab.id)]);
      return pin && tab.id !== undefined ? restoreTab(tab.id, pin.url) : Promise.resolve();
    })
  );
}

async function restoreTab(tabId: number, url: string): Promise<void> {
  if (!isValidPinUrl(url)) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (sameUrl(tabUrl(tab), url)) await chrome.tabs.reload(tabId);
    else await chrome.tabs.update(tabId, { url });
  } catch {
    // The tab is gone or the browser refused the navigation; nothing to do.
  }
}

// --- content scripts -------------------------------------------------------

async function linkPolicy(tabId: number | undefined): Promise<LinkPolicy> {
  if (tabId === undefined) return { enabled: false };
  const { pins, map } = await syncState({ keepUnmatched: true });
  const pin = pins.find((p) => p.id === map[String(tabId)]);
  return { enabled: pin?.openLinksInNewTab === true };
}

function pushLinkPolicy(tabId: number, enabled: boolean): void {
  const push: Push = { type: "link-policy", enabled };
  chrome.tabs.sendMessage(tabId, push).catch(() => {});
}

async function openLink(url: string, opener: chrome.tabs.Tab | undefined): Promise<void> {
  if (!isValidPinUrl(url) || opener?.id === undefined) return;
  await chrome.tabs.create({ url, openerTabId: opener.id, windowId: opener.windowId });
}

// --- idle restore ----------------------------------------------------------

async function ensureIdleAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(IDLE_ALARM);
  if (!existing) await chrome.alarms.create(IDLE_ALARM, { periodInMinutes: 1 });
}

// A pinned tab is idle while it is not the selected tab of its window. Each
// idle stretch restores at most once, so a page that redirects away from its
// defined URL is not reloaded every minute.
async function tickIdle(): Promise<void> {
  const [{ pins, map, tabs }, { idleMinutes }, idleSince, idleRestored] = await Promise.all([
    syncState({ keepUnmatched: true }),
    loadSettings(),
    readStamps(IDLE_SINCE_KEY),
    readStamps(IDLE_RESTORED_KEY),
  ]);
  const now = Date.now();
  const idleMs = idleMinutes * 60_000;
  const nextSince: Stamps = {};
  const nextRestored: Stamps = {};

  for (const tab of tabs) {
    if (tab.id === undefined || tab.active) continue;
    const key = String(tab.id);
    const since = idleSince[key] ?? now;
    nextSince[key] = since;
    if (idleRestored[key]) {
      nextRestored[key] = idleRestored[key];
      continue;
    }
    const pin = pins.find((p) => p.id === map[key]);
    if (!pin?.restoreWhenIdle || !pin.url || now - since < idleMs) continue;
    nextRestored[key] = now;
    await restoreTab(tab.id, pin.url);
  }

  await chrome.storage.session.set({ [IDLE_SINCE_KEY]: nextSince, [IDLE_RESTORED_KEY]: nextRestored });
}

async function readStamps(key: string): Promise<Stamps> {
  const data = await chrome.storage.session.get(key);
  const value = data[key];
  return typeof value === "object" && value !== null ? (value as Stamps) : {};
}

// --- state -----------------------------------------------------------------

async function syncState({ keepUnmatched = false } = {}): Promise<State> {
  const [pins, map, tabs] = await Promise.all([loadPins(), readMap(), chrome.tabs.query({ pinned: true })]);
  const result = reconcilePins(pins, tabs, map, { keepUnmatched });
  if (result.changed) {
    await Promise.all([savePins(result.pins), writeMap(result.map)]);
  }
  return { pins: result.pins, map: result.map, tabs };
}

async function pinnedTabAppeared(tabId: number): Promise<void> {
  const { pins, map } = await syncState({ keepUnmatched: true });
  const pin = pins.find((p) => p.id === map[String(tabId)]);
  if (pin?.openLinksInNewTab) pushLinkPolicy(tabId, true);
}

async function forgetTab(tabId: number): Promise<void> {
  const [pins, map] = await Promise.all([loadPins(), readMap()]);
  const key = String(tabId);
  const pinId = map[key];
  if (!pinId) return;
  delete map[key];
  await Promise.all([savePins(pins.filter((pin) => pin.id !== pinId)), writeMap(map)]);
  pushLinkPolicy(tabId, false);
}

function tabIdFor(map: TabPinMap, pinId: string): number | undefined {
  const entry = Object.entries(map).find(([, id]) => id === pinId);
  return entry ? Number(entry[0]) : undefined;
}

async function readMap(): Promise<TabPinMap> {
  const data = await chrome.storage.session.get(MAP_KEY);
  const value = data[MAP_KEY];
  return typeof value === "object" && value !== null ? (value as TabPinMap) : {};
}

async function writeMap(map: TabPinMap): Promise<void> {
  await chrome.storage.session.set({ [MAP_KEY]: map });
}

// Storage reads and writes from concurrent events would otherwise race.
let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}
