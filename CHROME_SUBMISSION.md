# Chrome Web Store submission — dashboard form fields

Text to paste into the **Privacy** and **Distribution** tabs of the chrome.google.com/webstore/devconsole submission form, in addition to the listing copy in [`LISTING_CHROME.md`](./LISTING_CHROME.md).

## Single purpose

> One sentence. CWS reviewers check that every permission ties back to this.

```
Keep the user's pinned tabs on a URL the user chose, by restoring them to it on demand, after they have been idle, or on startup, and optionally opening their links in new tabs.
```

## Permission justifications

Paste one line per permission into the corresponding field in the dashboard. Each line answers "Why does your extension need this permission?"

### `tabs`

```
Required to list the user's pinned tabs in the popup (URL, title and favicon), to navigate a pinned tab back to its pinned URL, and to open a link clicked inside a pinned tab in a new tab next to it. Only pinned tabs are queried. URLs are compared locally with the pinned URL the user set; they are never stored beyond that URL and never transmitted.
```

### `storage`

```
Persists each pinned tab's settings (pinned URL, restore-when-idle, open-links-in-new-tab) and the global settings (restore on startup, idle time) in chrome.storage.local. The live pairing between tab ids and settings, plus idle timestamps, is kept in chrome.storage.session for the browser session. This is the only data the extension stores. Nothing is synced or transmitted.
```

### `alarms`

```
A one-minute periodic alarm checks whether a pinned tab with "Restore when idle" enabled has been unselected for longer than the configured idle time, so the background service worker does not need to stay alive. Nothing else uses it.
```

### Content script on `http://*/*` and `https://*/*`

```
Implements the per-tab "Open links in new tab" option. Any tab can be pinned, so the click listener must be able to run on any site; the match list cannot be narrowed statically. On load the script asks the background whether its tab is a pinned tab with the option on. If not, it does nothing. It never reads page content — it only inspects the <a> element of a plain left-click and asks the background to open that URL in a new tab. No network requests.
```

## Remote code

> CWS field: "Are you using remote code?" — Choose **No**.

```
No. All JavaScript executed by the extension is bundled inside the package at build time (esbuild, IIFE bundles). No eval, no Function() construction from strings, no script injection from remote sources, no WebAssembly. The extension makes no network requests at all.
```

## Data usage disclosure

> CWS field: "What user data does your extension collect or use?" — Mr. Pinny transmits nothing. It *reads* pinned tabs' URLs and titles through the `tabs` permission and stores one URL per pin locally, which Google may classify as **"Web history"** under the conservative reading. With nothing logged or transmitted, all categories can defensibly be left unchecked; if you prefer the conservative reading, tick **Web history** and rely on the certifications below. Either way the rationale below applies.

Rationale for the reviewer (paste in the "Additional details" field if prompted):

```
Mr. Pinny does not collect or transmit any user data. It has no server
and makes zero network requests. It reads the URL, title and favicon
of the user's pinned tabs only to show them in the popup and to decide
whether a tab needs to be navigated back to the URL the user set. The
only stored data is that per-pin URL plus a few boolean settings, in
chrome.storage.local on the user's device — never synced, never
visible to the developer. No analytics, telemetry, or crash reporting.
```

## Data usage certifications

> CWS displays three required checkboxes near the data-usage form. Tick all three:

- [x] **I do not sell or transfer user data to third parties** apart from the approved use cases.
- [x] **I do not use or transfer user data for purposes unrelated to my item's single purpose.**
- [x] **I do not use or transfer user data to determine creditworthiness or for lending purposes.**

## Privacy policy URL

```
https://github.com/nx-alejandrolacasa/mr-pinny/blob/main/PRIVACY.md
```

## Notes for reviewer

> Paste into the "Justification" / "Testing instructions" field on submission.

```
Mr. Pinny keeps pinned tabs on a URL the user chooses: restore on
demand, after the tab has been idle, or on startup, plus an option to
open a pinned tab's links in new tabs.

To test:
1. Install the unpacked extension or the uploaded package and pin two
   or three http(s) tabs.
2. Click the toolbar icon — each pinned tab is listed with its current
   URL as the pinned URL.
3. Navigate a pinned tab elsewhere and reopen the popup: it shows
   "Now on <url>". Click Restore — the tab goes back.
4. Edit the pinned URL and press Enter — the tab reloads there.
5. Tick "Open links in new tab" and click a link in that tab — it
   opens in a new tab and the pin stays put.
6. Set Idle time to 1, tick "Restore when idle", navigate the pinned
   tab away and switch to another tab — within about two minutes the
   pin is back on its URL.
7. Tick "Restore pinned tabs on startup", quit and reopen Chrome —
   pinned tabs reload to their pinned URLs.

Network behavior: none. The broad content-script match (http/https)
exists only because any tab can be pinned; the script is inert unless
its tab is a pinned tab with "Open links in new tab" on.

Build notes:
- Source: https://github.com/nx-alejandrolacasa/mr-pinny (MIT license)
- npm install && npm run build reproduces the package (esbuild
  monorepo, no env vars or secrets).
- No analytics, telemetry, crash reporting, or remote code.
```

## Distribution settings

- **Visibility**: Public
- **Distribution**: All regions (the extension has no region-specific behavior)
- **Pricing**: Free

## Post-submission checklist

- [ ] Listing language matches `LISTING_CHROME.md` (summary ≤ 132 chars, description pasted as plain text)
- [ ] Privacy practices tab green-checked (all three certifications ticked, privacy policy URL present)
- [ ] Single purpose statement matches the one above
- [ ] Justifications filled for `tabs`, `storage`, `alarms`, and the content-script host access
- [ ] Screenshots uploaded (1280×800 or 640×400, at least one — see LISTING_CHROME.md, none captured yet)
- [ ] Store icon = 128×128 PNG (auto-uses `icons.128` from manifest, but the listing slot is separate — upload `packages/shared/assets/icons/icon.png` there too)
- [ ] Package uploaded: `mr-pinny-chrome-v1.0.0.zip` from the GitHub release
