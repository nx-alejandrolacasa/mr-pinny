// Content script: when this tab is pinned and "open external links in new
// tab" is on, plain left-clicks on http(s) links to another host open a new
// tab instead of navigating the pinned one. Same-site links, modified clicks,
// downloads and links that already target another frame are left alone.

import { isPush, sendRequest, type LinkPolicy } from "./messages";
import { isSameSite } from "./sites";

let policy: LinkPolicy = { enabled: false, subdomainsAreSameSite: true };

export function runContent(): void {
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (isPush(message)) policy = message;
  });
  sendRequest<LinkPolicy | undefined>({ type: "get-link-policy" })
    .then((current) => {
      if (current) policy = current;
    })
    .catch(() => {});
  document.addEventListener("click", onClick, true);
}

function onClick(event: MouseEvent): void {
  if (!policy.enabled || event.defaultPrevented || event.button !== 0) return;
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
  if (isSameSite(url.hostname, location.hostname, policy.subdomainsAreSameSite)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  sendRequest({ type: "open-link", url: url.href }).catch(() => {});
}
