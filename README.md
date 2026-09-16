# Mr. Pinny

Browser extension (Chrome + Firefox, Manifest V3) that keeps your pinned
tabs on the page you pinned them for. Mail, calendar, chat: the tabs you
pin drift as you click around, and Mr. Pinny puts them back.

Open the popup and every pinned tab is listed with its **pinned URL**, which
starts out as whatever the tab was showing when it was first seen.

## Per pinned tab

| Control                    | What it does                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Pinned URL                 | Edit it and the tab reloads to the new URL right away. Only `http://` and `https://` URLs are accepted. |
| Restore                    | Reloads the tab to its pinned URL now.                                                           |
| Restore when idle          | Once the tab has sat unselected in its window for the idle time, it reloads to its pinned URL.  |
| Open links in new tab      | Plain left-clicks on links in the tab open a new tab next to it instead of navigating the pin.   |

"Idle" means the tab is not the selected tab of its window. Each idle stretch
restores at most once, so a page that redirects somewhere else after loading
does not get reloaded every minute. Selecting the tab again starts a new
stretch.

"Open links in new tab" leaves alone modified clicks (Cmd/Ctrl/Shift/Alt),
middle clicks, downloads, links that already target another frame or window,
non-http(s) links and same-page anchors.

## Global

| Setting / action                | What it does                                                        |
| ------------------------------- | ------------------------------------------------------------------- |
| Restore pinned tabs on startup  | When the browser starts, every pinned tab is reloaded to its pinned URL. |
| Idle time (minutes)             | How long a tab must be unselected before "Restore when idle" fires. Default 30. |
| Restore all                     | Reloads every pinned tab to its pinned URL now.                     |

## How pins are tracked

Tab ids change every time the browser restarts, so each pinned tab's config
has its own id and the tab ↔ config pairing is rebuilt when needed: a pinned
tab without a pairing is matched to a config with the same origin, then by
position, and otherwise gets a new config from its current URL. Unpinning
or closing a tab removes its config; closing a window (or the browser)
does not.

Configs and settings live in `storage.local`. Pinned tabs are per browser
profile and per device, so syncing them would pair them with nothing on
another machine. The live tab pairing and idle timers live in
`storage.session`.

## Repo layout

npm-workspaces monorepo, same shape as
[mr-clicky](https://github.com/nx-alejandrolacasa/mr-clicky):

- `packages/shared` — browser-agnostic logic (pin configs + reconciliation,
  settings, background, content script, popup UI), assets, and locales.
- `packages/chrome` — Chrome manifest + esbuild script → `dist/`.
- `packages/firefox` — Firefox manifest + esbuild script → `dist/`.

The two manifests differ in one line beyond the icons: Chrome's background
is a `service_worker`, Firefox's is an event page (`scripts`). Both run the
same `background.ts`.

## Development

```sh
npm install
npm run build            # both browsers → packages/*/dist/
npm run dev              # watch + web-ext run (Firefox)
npm run dev:chrome       # watch + web-ext run (Chromium)
npm run typecheck
npm test                 # reconciliation + settings smoke tests
npm run lint             # web-ext lint (firefox dist)
```

Load `packages/chrome/dist` via `chrome://extensions` → "Load unpacked", or
`packages/firefox/dist` via `about:debugging` → "Load Temporary Add-on".

The Chrome icon PNG is rendered from the SVG design at build time
(`packages/shared/src/build-helpers/icon-png.ts`), so no binary lives in the
repo; `node scripts/generate-icon.mjs` writes the same PNG to
`packages/shared/assets/icons/icon.png` for a store listing.

## Privacy

No network requests, no analytics, no remote code. See [PRIVACY.md](./PRIVACY.md).
