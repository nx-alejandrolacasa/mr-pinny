# Privacy Policy

**Last updated:** 2026-09-16

This policy explains what data the **Mr. Pinny** browser extension (the "extension") handles, what is transmitted off your device, and how you can control it. It applies to any copy of the extension built from this repository or distributed through [addons.mozilla.org](https://addons.mozilla.org) (Firefox) or the [Chrome Web Store](https://chromewebstore.google.com) (Chrome and Chromium-based browsers).

## 1. Summary

- The extension keeps your pinned tabs on a URL you chose, reloading them on demand, after they have been idle, or when the browser starts, and can make links in a pinned tab open in a new tab.
- The extension makes **no network requests at all**.
- The extension does **not** collect, transmit, sell, or share your browsing history, page contents, or any personal identifier.
- Everything it stores stays in your browser's local extension storage on your device.

## 2. Data the extension does not collect or transmit

The extension does **not**:

- Make any outbound network request. There is no server component, no API, no CDN.
- Transmit your browsing history, visited URLs, page contents, or any personal identifier — to the developer or to anyone else.
- Use analytics, telemetry, crash reporting, or any user-identification mechanism.
- Use cookies or any tracking technology.
- Sell, rent, lease, share, or disclose data to advertisers, data brokers, or any third party.
- Read page content. The content script only observes clicks on links, and only acts on them in pinned tabs where you enabled "Open links in new tab".
- Modify your bookmarks, history, settings, or any other browser data.

## 3. Data stored by the extension

The extension stores, in local extension storage (`storage.local`) on your device only:

- **One config per pinned tab**: the pinned URL you set (initially the URL the tab was showing), whether to restore it when idle, whether to open its links in new tabs, and a random internal ID.
- **Global settings**: whether to restore pinned tabs on startup and the idle time.

It also keeps, in session storage (`storage.session`, cleared when the browser exits): which live tab belongs to which config, and when each pinned tab was last deselected, so idle restores can be timed.

Unpinning or closing a pinned tab removes its config. Uninstalling the extension removes all of its stored data.

## 4. How the extension processes tab URLs

To pair pinned tabs with their configs and to show them in the popup, the extension reads the **URL, title and favicon of your pinned tabs** through the `tabs` permission. Current URLs are compared locally with the pinned URL to decide whether a restore is needed; they are shown in the popup but never stored beyond the pinned URL itself, and never transmitted.

## 5. Permissions

| Permission | Why it is needed |
|---|---|
| `tabs` | List pinned tabs with their URL, title and favicon, navigate them back to their pinned URL, and open links from a pinned tab in a new tab. |
| `storage` | Persist per-pin configs and settings locally, and the live tab pairing for the session. |
| `alarms` | Wake up once a minute to check whether an idle pinned tab is due for a restore. |
| Content script on `http://*/*` and `https://*/*` | Any tab can be pinned, so the click listener that implements "Open links in new tab" must be able to run on any site. In tabs where the option is off (or that are not pinned) the script does nothing. |

## 6. Legal basis for processing (EU/EEA users)

Where the General Data Protection Regulation (GDPR) applies: the extension processes no personal data on any server — all processing described above happens locally on your device at your direction.

## 7. Your rights and how to exercise them

- **Delete a pin's config**: unpin or close the tab.
- **Delete all local data**: uninstall the extension; your browser removes its storage automatically.
- **Right to access, rectification, erasure, restriction, portability, and objection** (GDPR), and **right to know, delete, and opt-out of "sale" or sharing** (CCPA / California): the developer stores no data about you anywhere. Everything the extension generates is on your device and fully under your control. The developer does not sell or share data, so there is nothing to opt out of.

## 8. Children's privacy

The extension is not directed at children under the age of 13 and does not knowingly collect personal information from anyone, including children.

## 9. Security

The extension contains no remotely loaded code, no eval'd code, and no third-party scripts. Locally stored data is protected by the same operating-system-level access controls that protect your browser profile.

## 10. Changes to this policy

If the extension's data practices change, this policy will be updated and the "Last updated" date at the top will reflect the change.
