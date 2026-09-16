# Chrome Web Store listing copy

Text to paste into the chrome.google.com/webstore/devconsole submission form. Keep this in sync with the actual extension behavior. Dashboard-only fields (single purpose, permission justifications, data usage) live in [`CHROME_SUBMISSION.md`](./CHROME_SUBMISSION.md).

CWS rendering note: the description field does **not** support Markdown. Line breaks render, but `**bold**` and `#` headings render as literal characters. Sections below use ALL-CAPS labels so they remain readable when pasted as plain text.

## Name

> 50-character limit. Provided by `_locales/en/messages.json` (`extName`).

```
Mr. Pinny
```

## Summary

> 132-character limit.

```
Keep pinned tabs on the URL you chose: restore them on demand, when idle or at startup, and open their links in new tabs.
```

## Description

> 16,000-character limit. Paste as plain text — CWS does not render Markdown.

```
Mr. Pinny keeps your pinned tabs on the page you pinned them for. Mail, calendar, chat, news: pinned tabs drift as you click around, and Mr. Pinny puts them back.

HOW IT WORKS

Open the popup and every pinned tab is listed with its pinned URL, which starts out as whatever the tab was showing when it was first seen. Change it and the tab reloads there right away.

PER PINNED TAB

• Pinned URL — the page this tab belongs on. Only http:// and https:// URLs are accepted.
• Restore — reload the tab to its pinned URL now.
• Restore when idle — once the tab has sat unselected in its window for the idle time, it goes back to its pinned URL. Each idle stretch restores at most once, so a page that redirects after loading is not reloaded every minute.
• Open links in new tab — plain left-clicks on links open a new tab next to the pin instead of navigating it. Modified clicks, middle clicks, downloads, links that already target another window and same-page anchors are left alone.

GLOBAL

• Restore pinned tabs on startup — when the browser starts, every pinned tab is reloaded to its pinned URL.
• Idle time — how many minutes a tab must be unselected before "Restore when idle" fires (default 30).
• Restore all — reload every pinned tab to its pinned URL now.

DETAILS

• Pins are remembered across restarts. Tab ids change every time the browser starts, so each pin's settings are matched back to its tab by site, then by position.
• Unpinning or closing a tab removes its settings. Closing a window or quitting the browser does not.
• Everything is stored locally. Pinned tabs are per browser profile and per device, so nothing is synced.

PRIVACY

Mr. Pinny makes zero network requests. No analytics, no telemetry, no remote code. It reads the URL, title and favicon of your pinned tabs to show them in the popup and to decide whether a restore is needed; nothing is stored beyond the pinned URL you set, and nothing leaves your device.

Full privacy policy: https://github.com/nx-alejandrolacasa/mr-pinny/blob/main/PRIVACY.md

SOURCE AND LICENSE

Open source under the MIT License.

GitHub: https://github.com/nx-alejandrolacasa/mr-pinny
```

## Category

> CWS allows one primary category.

- **Functionality & UI** (primary recommendation — tab management)
- Fallback: **Tools**

## Language

```
English (United States)
```

## Store icon

`packages/shared/assets/icons/icon.png` (128×128 PNG) — already embedded in the package, also uploaded separately as the store-listing icon.

## Screenshots

CWS requires **exactly 1280×800** or **640×400**. At least one screenshot is required; up to five may be uploaded.

**Not captured yet.** Suggested shots (save to `packages/shared/assets/screenshots/` at 1280×800):

1. The popup open with three or four pinned tabs listed, one showing a "Now on" line because it drifted
2. A pinned tab after clicking a link, with the new tab opened next to it
3. The settings block with "Restore pinned tabs on startup" ticked

## Promotional images (optional but recommended)

- **Small promo tile**: 440×280 PNG/JPG — improves visibility in CWS rotations.
- **Marquee promo**: 1400×560 PNG/JPG — only used if the extension is featured.

If we don't have these yet, skip them; they can be added in a later edit without re-review.

## Release notes

> CWS shows version notes on the item's update. Paste the latest entry as plain text. Newest first.

### v1.0.0

```
First release. Every pinned tab gets a pinned URL you can edit, restore with a click, restore after it has been idle, or restore when the browser starts, and an option to open its links in new tabs. Everything stays on your device. Zero network requests.
```
