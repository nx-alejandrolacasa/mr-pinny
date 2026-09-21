// Runtime messages. The background owns the tab ↔ config pairing, so the
// popup and the content scripts go through it instead of touching storage.
//
//   popup → background    list-pins, update-pin, restore-pin, restore-all
//   content → background  get-link-policy (am I in a pinned tab that opens
//                         external links in new tabs?), open-link
//   background → content  link-policy (the tab's option or a global setting changed)

import type { PinConfig, PinPatch } from "./pins";

export interface PinView extends PinConfig {
  tabId: number;
  windowId: number;
  title: string;
  currentUrl: string;
  favIconUrl?: string;
}

export type Request =
  | { type: "list-pins" }
  | { type: "update-pin"; id: string; patch: PinPatch }
  | { type: "restore-pin"; id: string }
  | { type: "restore-all" }
  | { type: "get-link-policy" }
  | { type: "open-link"; url: string };

export interface LinkPolicy {
  enabled: boolean;
  subdomainsAreSameSite: boolean;
}

export type Push = { type: "link-policy" } & LinkPolicy;

export function isRequest(value: unknown): value is Request {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case "list-pins":
    case "restore-all":
    case "get-link-policy":
      return true;
    case "restore-pin":
      return typeof v.id === "string";
    case "update-pin":
      return typeof v.id === "string" && typeof v.patch === "object" && v.patch !== null;
    case "open-link":
      return typeof v.url === "string";
    default:
      return false;
  }
}

export function isPush(value: unknown): value is Push {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === "link-policy" && typeof v.enabled === "boolean" && typeof v.subdomainsAreSameSite === "boolean";
}

export function sendRequest<T>(request: Request): Promise<T> {
  return chrome.runtime.sendMessage(request) as Promise<T>;
}
