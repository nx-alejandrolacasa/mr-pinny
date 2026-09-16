// Content script: when this tab is pinned and "open links in new tab" is on,
// plain left-clicks on http(s) links open a new tab instead of navigating
// the pinned one. Modified clicks, downloads, links that already target
// another frame and same-page anchors are left alone.

import { isPush, sendRequest, type LinkPolicy } from "./messages";

let enabled = false;

export function runContent(): void {
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (isPush(message)) enabled = message.enabled;
  });
  sendRequest<LinkPolicy | undefined>({ type: "get-link-policy" })
    .then((policy) => {
      enabled = policy?.enabled === true;
    })
    .catch(() => {});
  document.addEventListener("click", onClick, true);
}

function onClick(event: MouseEvent): void {
  if (!enabled || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.composedPath().find(
    (node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && node.hasAttribute("href")
  );
  if (!link || link.hasAttribute("download")) return;
  if (link.target && link.target !== "_self") return;

  let url: URL;
  try {
    url = new URL(link.href, location.href);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (withoutHash(url) === withoutHash(new URL(location.href))) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  sendRequest({ type: "open-link", url: url.href }).catch(() => {});
}

function withoutHash(url: URL): string {
  return url.origin + url.pathname + url.search;
}
