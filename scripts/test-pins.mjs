// Logic smoke tests for pin reconciliation, URL handling and settings.
// Run via:  npm test   (plain node, relies on native TS type stripping)
import assert from "node:assert";
import {
  applyPatch,
  isValidPinUrl,
  normalizePins,
  reconcilePins,
  sameUrl,
} from "../packages/shared/src/pins.ts";
import {
  clampIdleMinutes,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from "../packages/shared/src/settings.ts";

const tab = (id, url, index = id, windowId = 1) => ({ id, url, index, windowId });
const pin = (id, url, extra = {}) => ({
  id,
  url,
  restoreWhenIdle: false,
  openLinksInNewTab: false,
  ...extra,
});

// URLs
assert(isValidPinUrl("https://mail.google.com/"));
assert(isValidPinUrl("http://localhost:3000/app"));
assert(!isValidPinUrl("chrome://newtab"));
assert(!isValidPinUrl("javascript:alert(1)"));
assert(!isValidPinUrl("mail.google.com"));
assert(!isValidPinUrl(""));
assert(sameUrl("https://example.com", "https://example.com/"));
assert(!sameUrl("https://example.com/a", "https://example.com/b"));
assert(!sameUrl("", "https://example.com/"));

// Fresh install: every pinned tab gets a config from its current URL, in tab order.
{
  const tabs = [tab(7, "https://b.example/", 1), tab(3, "https://a.example/", 0)];
  const { pins, map, changed } = reconcilePins([], tabs, {});
  assert(changed);
  assert.deepEqual(
    pins.map((p) => p.url),
    ["https://a.example/", "https://b.example/"]
  );
  assert.equal(map["3"], pins[0].id);
  assert.equal(map["7"], pins[1].id);
}

// Existing pairing is kept even when the tab has navigated elsewhere.
{
  const pins = [pin("p1", "https://a.example/"), pin("p2", "https://b.example/")];
  const map = { 3: "p1", 7: "p2" };
  const tabs = [tab(3, "https://b.example/some/where", 0), tab(7, "https://c.example/", 1)];
  const result = reconcilePins(pins, tabs, map);
  assert(!result.changed);
  assert.deepEqual(result.map, map);
}

// After a restart tab ids change: pair by origin first, even if the order differs.
{
  const pins = [pin("p1", "https://a.example/", { restoreWhenIdle: true }), pin("p2", "https://b.example/")];
  const tabs = [tab(21, "https://b.example/inbox", 0), tab(22, "https://a.example/", 1)];
  const { map, pins: next } = reconcilePins(pins, tabs, {});
  assert.equal(map["21"], "p2");
  assert.equal(map["22"], "p1");
  assert.deepEqual(next.map((p) => p.id), ["p2", "p1"]);
  assert(next[1].restoreWhenIdle);
}

// No origin match: fall back to position.
{
  const pins = [pin("p1", "https://a.example/"), pin("p2", "https://b.example/")];
  const tabs = [tab(31, "https://x.example/", 0), tab(32, "https://y.example/", 1)];
  const { map, pins: next } = reconcilePins(pins, tabs, {});
  assert.equal(map["31"], "p1");
  assert.equal(map["32"], "p2");
  assert.equal(next[0].url, "https://a.example/");
}

// A pinned tab whose URL cannot be restored gets an empty URL.
{
  const { pins } = reconcilePins([], [tab(1, "chrome://newtab/")], {});
  assert.equal(pins[0].url, "");
}

// A loading tab exposes only pendingUrl.
{
  const { pins } = reconcilePins([], [{ id: 1, index: 0, windowId: 1, pendingUrl: "https://a.example/" }], {});
  assert.equal(pins[0].url, "https://a.example/");
}

// Configs without a tab are dropped unless asked to keep them.
{
  const pins = [pin("p1", "https://a.example/"), pin("p2", "https://b.example/")];
  const tabs = [tab(1, "https://a.example/")];
  assert.deepEqual(reconcilePins(pins, tabs, { 1: "p1" }).pins.map((p) => p.id), ["p1"]);
  assert.deepEqual(
    reconcilePins(pins, tabs, { 1: "p1" }, { keepUnmatched: true }).pins.map((p) => p.id),
    ["p1", "p2"]
  );
}

// Two tabs pointing at the same config: the second one is re-paired.
{
  const pins = [pin("p1", "https://a.example/")];
  const tabs = [tab(1, "https://a.example/"), tab(2, "https://a.example/other")];
  const { map, pins: next } = reconcilePins(pins, tabs, { 1: "p1", 2: "p1" });
  assert.equal(map["1"], "p1");
  assert.notEqual(map["2"], "p1");
  assert.equal(next.length, 2);
}

// Tabs across windows are ordered by window, then index.
{
  const tabs = [tab(5, "https://w2.example/", 0, 2), tab(4, "https://w1.example/", 0, 1)];
  const { pins } = reconcilePins([], tabs, {});
  assert.deepEqual(pins.map((p) => p.url), ["https://w1.example/", "https://w2.example/"]);
}

// Patches cannot change the id and invalid URLs are blanked.
{
  const next = applyPatch(pin("p1", "https://a.example/"), { id: "evil", url: "nope", openLinksInNewTab: true });
  assert.equal(next.id, "p1");
  assert.equal(next.url, "");
  assert(next.openLinksInNewTab);
}

// Stored data is sanitised on load.
assert.deepEqual(normalizePins(undefined), []);
assert.deepEqual(
  normalizePins([{ id: "a", url: "https://a.example" }, { id: "a", url: "https://dup.example" }, { nope: 1 }]),
  [pin("a", "https://a.example/")]
);

// Settings
assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
assert.deepEqual(normalizeSettings({ restoreOnStartup: "yes", idleMinutes: "15" }), {
  restoreOnStartup: false,
  idleMinutes: 15,
});
assert.equal(clampIdleMinutes(0), 1);
assert.equal(clampIdleMinutes(99999), 1440);
assert.equal(clampIdleMinutes("abc"), DEFAULT_SETTINGS.idleMinutes);
assert.equal(clampIdleMinutes(4.6), 5);

console.log("test-pins: ok");
