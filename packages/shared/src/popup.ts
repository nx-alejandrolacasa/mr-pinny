// Popup UI: one card per pinned tab (defined URL, restore, idle restore and
// new-tab-links toggles) plus the global settings and "Restore all".

import { sendRequest, type PinView } from "./messages";
import { isValidPinUrl, sameUrl, type PinPatch } from "./pins";
import {
  clampIdleMinutes,
  IDLE_MAX_MINUTES,
  IDLE_MIN_MINUTES,
  loadSettings,
  saveSettings,
  type Settings,
} from "./settings";

let pins: PinView[] = [];
let settings: Settings;

export async function runPopup(): Promise<void> {
  localize();
  settings = await loadSettings();

  const startupInput = byId<HTMLInputElement>("startup-input");
  startupInput.checked = settings.restoreOnStartup;
  startupInput.addEventListener("change", () => void updateSettings({ restoreOnStartup: startupInput.checked }));

  const idleInput = byId<HTMLInputElement>("idle-input");
  idleInput.min = String(IDLE_MIN_MINUTES);
  idleInput.max = String(IDLE_MAX_MINUTES);
  idleInput.value = String(settings.idleMinutes);
  idleInput.addEventListener("change", () => {
    const idleMinutes = clampIdleMinutes(idleInput.value);
    idleInput.value = String(idleMinutes);
    void updateSettings({ idleMinutes });
  });

  byId<HTMLButtonElement>("restore-all").addEventListener("click", () => {
    void sendRequest({ type: "restore-all" }).then(refresh);
  });

  await refresh();
}

async function updateSettings(patch: Partial<Settings>): Promise<void> {
  settings = { ...settings, ...patch };
  await saveSettings(settings);
}

async function refresh(): Promise<void> {
  const [list, current] = await Promise.all([
    sendRequest<PinView[] | undefined>({ type: "list-pins" }),
    chrome.windows.getCurrent().catch(() => undefined),
  ]);
  pins = list ?? [];
  if (current?.id !== undefined) {
    const inCurrent = pins.filter((pin) => pin.windowId === current.id);
    const elsewhere = pins.filter((pin) => pin.windowId !== current.id);
    pins = [...inCurrent, ...elsewhere];
  }
  renderList();
}

async function updatePin(pin: PinView, patch: PinPatch): Promise<void> {
  await sendRequest({ type: "update-pin", id: pin.id, patch });
  await refresh();
}

function renderList(): void {
  const list = byId<HTMLUListElement>("pin-list");
  const empty = byId<HTMLParagraphElement>("empty-state");
  list.replaceChildren();
  empty.hidden = pins.length > 0;
  byId<HTMLButtonElement>("restore-all").disabled = pins.length === 0;

  for (const pin of pins) list.append(renderPin(pin));
}

function renderPin(pin: PinView): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "pin";

  const head = document.createElement("div");
  head.className = "pin-head";

  const icon = document.createElement("img");
  icon.className = "pin-favicon";
  icon.alt = "";
  if (pin.favIconUrl) icon.src = pin.favIconUrl;
  else icon.hidden = true;
  icon.addEventListener("error", () => (icon.hidden = true));

  const title = document.createElement("span");
  title.className = "pin-title";
  title.textContent = pin.title || hostOf(pin.currentUrl) || msg("untitledTab");
  title.title = pin.currentUrl;

  const restore = document.createElement("button");
  restore.type = "button";
  restore.className = "secondary";
  restore.textContent = msg("restoreTab");
  restore.title = msg("restoreTabTitle");
  restore.disabled = !pin.url;
  restore.addEventListener("click", () => {
    void sendRequest({ type: "restore-pin", id: pin.id }).then(refresh);
  });

  head.append(icon, title, restore);

  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.className = "pin-url";
  urlInput.spellcheck = false;
  urlInput.value = pin.url;
  urlInput.placeholder = pin.currentUrl || msg("urlPlaceholder");
  urlInput.setAttribute("aria-label", msg("urlLabel"));
  urlInput.addEventListener("input", clearError);
  urlInput.addEventListener("change", () => {
    const url = urlInput.value.trim();
    if (!isValidPinUrl(url)) {
      showError("invalidUrl");
      urlInput.value = pin.url;
      urlInput.focus();
      return;
    }
    void updatePin(pin, { url });
  });

  item.append(head, urlInput);

  if (pin.url && pin.currentUrl && !sameUrl(pin.url, pin.currentUrl)) {
    const current = document.createElement("p");
    current.className = "pin-current";
    current.textContent = `${msg("currentUrlPrefix")} ${pin.currentUrl}`;
    current.title = pin.currentUrl;
    item.append(current);
  }

  const toggles = document.createElement("div");
  toggles.className = "pin-toggles";
  toggles.append(
    renderToggle(msg("restoreWhenIdle"), pin.restoreWhenIdle, (restoreWhenIdle) =>
      updatePin(pin, { restoreWhenIdle })
    ),
    renderToggle(msg("openLinksInNewTab"), pin.openLinksInNewTab, (openLinksInNewTab) =>
      updatePin(pin, { openLinksInNewTab })
    )
  );
  item.append(toggles);
  return item;
}

function renderToggle(
  text: string,
  checked: boolean,
  onChange: (checked: boolean) => Promise<void>
): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => void onChange(input.checked));
  const span = document.createElement("span");
  span.textContent = text;
  label.append(input, span);
  return label;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function showError(key: string): void {
  const error = byId<HTMLParagraphElement>("form-error");
  error.textContent = msg(key);
  error.hidden = false;
}

function clearError(): void {
  byId<HTMLParagraphElement>("form-error").hidden = true;
}

function localize(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key) el.textContent = msg(key);
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    const key = el.dataset.i18nTitle;
    if (key) el.title = msg(key);
  }
}

function msg(key: string): string {
  return chrome.i18n.getMessage(key) || key;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
