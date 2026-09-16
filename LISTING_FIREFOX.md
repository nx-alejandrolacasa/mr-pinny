# Firefox listing copy

Text to paste into the addons.mozilla.org submission form. Keep this in sync with the actual extension behavior.

## Name

```
Mr. Pinny
```

## Summary

> 250-character limit.

```
Keep your pinned tabs where you left them. Set the URL each pin belongs on, restore it with a click, after it has been idle, or when Firefox starts, and make its links open in new tabs. Everything stays on your device — no tracking, no network.
```

## Description

> Markdown is supported (basic). Paste into the AMO description field.

```markdown
**Mr. Pinny** keeps your pinned tabs on the page you pinned them for. Mail, calendar, chat, news: pinned tabs drift as you click around, and Mr. Pinny puts them back.

**How it works**

Open the popup and every pinned tab is listed with its pinned URL, which starts out as whatever the tab was showing when it was first seen. Change it and the tab reloads there right away.

**Per pinned tab**

- **Pinned URL** — the page this tab belongs on. Only `http://` and `https://` URLs are accepted.
- **Restore** — reload the tab to its pinned URL now.
- **Restore when idle** — once the tab has sat unselected in its window for the idle time, it goes back to its pinned URL. Each idle stretch restores at most once, so a page that redirects after loading is not reloaded every minute.
- **Open links in new tab** — plain left-clicks on links open a new tab next to the pin instead of navigating it. Firefox already does this for links to other sites; Mr. Pinny extends it to same-site links. Modified clicks, middle clicks, downloads, links that already target another window and same-page anchors are left alone.

**Global**

- **Restore pinned tabs on startup** — when Firefox starts, every pinned tab is reloaded to its pinned URL.
- **Idle time** — how many minutes a tab must be unselected before "Restore when idle" fires (default 30).
- **Restore all** — reload every pinned tab to its pinned URL now.

**Details**

- Pins are remembered across restarts. Tab ids change every time Firefox starts, so each pin's settings are matched back to its tab by site, then by position.
- Unpinning or closing a tab removes its settings. Closing a window or quitting Firefox does not.
- Everything is stored locally. Pinned tabs are per profile and per device, so nothing is synced.

**Privacy**

Mr. Pinny makes **zero network requests**. No analytics, no telemetry, no remote code. It reads the URL, title and favicon of your pinned tabs to show them in the popup and to decide whether a restore is needed; nothing is stored beyond the pinned URL you set, and nothing leaves your device.

Full privacy policy: https://github.com/nx-alejandrolacasa/mr-pinny/blob/main/PRIVACY.md

**Source & license**

Open source under the MIT License.

GitHub: https://github.com/nx-alejandrolacasa/mr-pinny
```

## Categories

- Tabs
- Other

## Tags

`pinned tabs`, `tabs`, `productivity`, `restore`, `minimal`

## Data collection

> AMO reads this from the manifest (`browser_specific_settings.gecko.data_collection_permissions.required: ["none"]`). The listing shows "This add-on does not collect or transmit data." No further action needed.

## Notes for reviewer

> Paste into AMO's "Notes for reviewer" field on submission.

```
Mr. Pinny keeps pinned tabs on a URL the user chooses. The background
event page pairs each pinned tab with a stored config (pinned URL,
restore-when-idle flag, open-links-in-new-tab flag) and navigates the
tab back to that URL on demand, after it has been unselected for the
configured idle time (checked by a one-minute alarm), or on startup.

Permissions:
- tabs: list pinned tabs with URL/title/favicon, navigate them back to
  their pinned URL, and open links from a pinned tab in a new tab.
- storage: per-pin configs and settings in storage.local; the live
  tabId -> config pairing and idle timestamps in storage.session.
- alarms: the one-minute idle check.
- Content script on all http/https URLs: any tab can be pinned, so
  the click listener that implements "Open links in new tab" must be
  able to run on any site. It asks the background whether its tab is a
  pinned tab with that option on; if not, it does nothing. It never
  reads page content — it only inspects the clicked <a> element.

No network requests, no analytics, no remote code. Nothing leaves the
device; pinned-tab data is not synced.

Build: npm install && npm run build (esbuild monorepo; see README).
No .env or secrets involved in the build.

To test:
1. Install the extension, pin two or three http(s) tabs.
2. Click the toolbar icon — each pinned tab is listed with its current
   URL as the pinned URL.
3. Navigate a pinned tab elsewhere, reopen the popup: it shows
   "Now on <url>". Click Restore — the tab goes back.
4. Edit the pinned URL field and press Enter — the tab reloads there.
5. Tick "Open links in new tab", click a same-site link in that tab —
   it opens in a new tab and the pin stays put.
6. Set Idle time to 1, tick "Restore when idle", navigate the pinned
   tab away and select another tab — within about two minutes the pin
   is back on its URL.
7. "Restore pinned tabs on startup" needs a permanently installed
   build (temporary add-ons are removed on exit).
```

## Source code submission

> AMO asks "Do you use any of the following in your extension?" — answer **Yes** (esbuild bundles multiple files into one and minifies in production). Upload a source zip generated from the release tag: `git archive --format=zip -o web-ext-artifacts/mr-pinny-<version>-source.zip v<version>`. Paste the following into the source-submission notes field:

```
Requirements: Node.js 22.x (ships with npm 10). Any OS.

1. Unzip the source archive and cd into it.
2. npm install
3. NODE_ENV=production npm run build:firefox

The Firefox package is produced at packages/firefox/dist/ and matches
the uploaded zip: esbuild IIFE bundles. No env vars (other than
NODE_ENV to minify), secrets, or code generation are involved — the
build is a plain esbuild bundle plus static asset copies.
```

## Release notes

> Paste the latest entry into the version's "Release notes" / "What's new" field. Newest first.

### v1.0.0

```
First release. Every pinned tab gets a pinned URL you can edit, restore with a click, restore after it has been idle, or restore when Firefox starts, and an option to open its links in new tabs. Everything stays on your device. Zero network requests.
```
