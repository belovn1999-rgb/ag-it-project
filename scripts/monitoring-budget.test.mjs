// Monitoring: the client's budget border fixed in the portal's currency
// (audit 2026-10-10, p. 18, docs/PROJECT-MOBILE.md 4.6.3 p. 25). Runs the
// pure block "monitoring-budget" of src/mobile-market-analysis.js with the
// calculator's own formula (src/turnkey-estimate.js carForTurnkey).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/mobile-market-analysis.js", import.meta.url), "utf8");
const begin = source.indexOf("  // ==== monitoring-budget: begin");
const end = source.indexOf("  // ==== monitoring-budget: end");
assert.ok(begin > 0 && end > begin, "the monitoring-budget block is in mobile-market-analysis.js");
const block = source.slice(begin, end);

const turnkeySource = readFileSync(new URL("../src/turnkey-estimate.js", import.meta.url), "utf8");
const turnkeyContext = {
  window: {},
  // No network: the live rate never answers (the rates file is not needed here).
  fetch: () => new Promise(() => {}),
  CustomEvent: class {},
  URL,
};
turnkeyContext.window.dispatchEvent = () => {};
turnkeyContext.window.addEventListener = () => {};
turnkeyContext.document = { addEventListener: () => {}, visibilityState: "visible" };
vm.runInNewContext(turnkeySource, turnkeyContext);
const { carForTurnkey } = turnkeyContext.window.AUTOGOOD_TURNKEY;

const context = {};
vm.runInNewContext(`${block}
this.api = { carPriceForBudget, priceBand, priceBands, samePriceBands, budgetLockFor, pricesMarkFor, isBaseChange, inPriceBand, withinBothBands };`, context);
const api = context.api;
// vm objects come from another realm: compare as plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));

const TARIFF = { transport: 2500, inspection: 1500 };
const SOURCES = ["otomoto", "mobile", "blocket", "avby"];
// Every portal's band for a budget at a rate (as budgetLockOf counts it).
function bandsAt(budget, eur, sek = 0.385 * (eur / 4.25)) {
  const rates = { eur, sek };
  return Object.fromEntries(SOURCES.map((source) => {
    const price = (pln) => (pln ? api.carPriceForBudget({ source, budgetPln: pln, rates, tariff: TARIFF, engine: 3, carForTurnkey }) : null);
    const from = price(budget.from);
    const to = price(budget.to);
    return [source, from || to ? { from, to } : null];
  }));
}
// The JSON a check stores ("prices" of its row): the bands searched with.
const pricesJson = (bands) => JSON.stringify(Object.fromEntries(Object.entries(bands).filter(([, band]) => band)));
const SIG = JSON.stringify({ brand: "Toyota", model: "RAV 4" });
const SETTLED = { index: 3, settled: true };

function lockAt(budget, eur, lock = null, extra = {}) {
  return api.budgetLockFor({
    budget,
    sig: SIG,
    excise: SETTLED,
    lock,
    compute: () => bandsAt(budget, eur),
    rates: { eur, sek: 0.385 },
    now: "2026-10-10T09:30:00.000Z",
    ...extra,
  });
}
// What monitoringPrices hands to the portals from a lock.
const searched = (lock) => pricesJson(Object.fromEntries(Object.entries(lock.prices).map(([source, band]) => [source, band])));

test("without the fixed border, a rate move of 0.02 zł moves the border (the bug)", () => {
  const budget = { from: null, to: 120000 };
  const before = bandsAt(budget, 4.27);
  const after = bandsAt(budget, 4.29);
  assert.notEqual(before.mobile.to, after.mobile.to, "mobile.de border moved with the rate");
  // The old rule: another JSON = a "prices changed" mark = a new base.
  const log = [{ at: "2026-10-09T09:30:00.000Z", prices: pricesJson(before), mobile: { median: 1 } }];
  assert.ok(api.pricesMarkFor(log, pricesJson(after), true), "a new base every day");
});

test("rate ±0.02: the border stays, no pricesChange", () => {
  const budget = { from: 100000, to: 120000 };
  const first = lockAt(budget, 4.27);
  assert.equal(first.store, true, "fixed when first counted");
  const lock = first.lock;
  assert.equal(lock.from, 100000);
  assert.equal(lock.to, 120000);
  assert.ok(lock.prices.mobile.to > 0 && lock.prices.blocket.to > 0, "€ and kr borders");
  assert.equal(lock.prices.otomoto.to, 120000, "otomoto: the budget itself, zł");
  assert.equal(lock.prices.avby, null, "av.by: no budget");
  for (const eur of [4.25, 4.29, 4.31]) {
    const again = lockAt(budget, eur, lock);
    assert.equal(again.store, false, `nothing stored at ${eur}`);
    assert.deepEqual(plain(again.lock), plain(lock), `same border at ${eur}`);
  }
  // Monitoring checks on two days with the same lock: no mark.
  const log = [{ at: "2026-10-09T09:30:00.000Z", prices: searched(lock), monitoring: true, mobile: { median: 1 } }];
  assert.equal(api.pricesMarkFor(log, searched(lockAt(budget, 4.29, lock).lock), true), null);
});

test("the manager changes the budget: new border, new base", () => {
  const lock = lockAt({ from: null, to: 120000 }, 4.27).lock;
  const changed = lockAt({ from: null, to: 130000 }, 4.27, lock, { manual: true });
  assert.equal(changed.store, true);
  assert.ok(changed.lock.prices.mobile.to > lock.prices.mobile.to);
  const log = [{ at: "2026-10-09T09:30:00.000Z", prices: searched(lock), monitoring: true, mobile: { median: 1 } }];
  const mark = api.pricesMarkFor(log, searched(changed.lock), true);
  assert.deepEqual(plain(mark), { monitoring: true }, "a new base for Nowe / Zniknęły");
  assert.equal(api.isBaseChange({ filtersChange: true, pricesChange: true, ...mark }), true);
  // Other search parameters (signature): counted again too.
  const otherSearch = api.budgetLockFor({ budget: { from: null, to: 120000 }, sig: "other", excise: SETTLED, lock, compute: () => bandsAt({ to: 120000 }, 4.29), now: "x" });
  assert.equal(otherSearch.store, true);
  assert.notEqual(otherSearch.lock.prices.mobile.to, lock.prices.mobile.to);
});

test("a car without a fixed border (before 2026-10-10) keeps its last searched band: no new base", () => {
  const budget = { from: null, to: 120000 };
  const last = { at: "2026-10-09T09:30:00.000Z", prices: pricesJson(bandsAt(budget, 4.25)), mobile: { median: 1 } };
  const result = lockAt(budget, 4.29, null, { last });
  assert.equal(result.store, true);
  assert.equal(result.lock.adopted, last.at);
  assert.ok(api.samePriceBands(searched(result.lock), last.prices), "the same band as the last check");
  assert.equal(api.pricesMarkFor([last], searched(result.lock), true), null, "no new base");
  // The budget was changed before the update (130 000 → 120 000): not taken over.
  const oldBudget = { ...last, prices: pricesJson(bandsAt({ to: 130000 }, 4.25)) };
  const fresh = lockAt(budget, 4.29, null, { last: oldBudget });
  assert.equal(fresh.lock.adopted, undefined);
  assert.ok(!api.samePriceBands(searched(fresh.lock), oldBudget.prices));
  // The manager typing the budget never takes an older band.
  assert.equal(lockAt(budget, 4.29, null, { last, manual: true }).lock.adopted, undefined);
});

test("a provisional excise (brand file loading) is not fixed for an old car; a fixed one is kept", () => {
  const budget = { from: null, to: 120000 };
  const loading = { index: 3, settled: false };
  const first = api.budgetLockFor({ budget, sig: SIG, excise: loading, compute: () => bandsAt(budget, 4.27), now: "x" });
  assert.equal(first.store, false);
  const lock = lockAt(budget, 4.27).lock;
  const kept = api.budgetLockFor({ budget, sig: SIG, excise: { index: 4, settled: false }, lock, compute: () => bandsAt(budget, 4.29), now: "y" });
  assert.deepEqual(plain(kept.lock), plain(lock), "kept while the excise is unknown");
  const recounted = api.budgetLockFor({ budget, sig: SIG, excise: { index: 4, settled: true }, lock, compute: () => bandsAt(budget, 4.29), now: "y" });
  assert.equal(recounted.store, true, "another real excise: counted again");
});

test("page 2 between two Monitoring checks is no new base for Monitoring", () => {
  const lock = lockAt({ to: 120000 }, 4.27).lock;
  const log = [
    { at: "2026-10-08T09:30:00.000Z", prices: searched(lock), monitoring: true, mobile: { median: 1 } },
    { at: "2026-10-08T12:00:00.000Z", prices: "{}", monitoring: false, mobile: { median: 2 } },
  ];
  assert.equal(api.pricesMarkFor(log, searched(lock), true)?.monitoring, false, "only a divider of the price table");
  assert.equal(api.isBaseChange({ filtersChange: true, pricesChange: true, monitoring: false }), false);
  assert.equal(api.isBaseChange({ filtersChange: true, pricesChange: true }), true, "old marks still count");
  // A Mac job carries the chosen portals only: compared on them.
  const mac = JSON.stringify({ mobile: lock.prices.mobile });
  assert.equal(api.pricesMarkFor([log[0]], mac, true, ["mobile"]), null);
});

test("a car at the border: new / gone only inside both bands", () => {
  const offer = (key, price) => ({ key, price, currency: "EUR" });
  const rows = [
    { source: "mobile", offer: offer("a", 24450), group: "new", status: "new" },
    { source: "mobile", offer: offer("b", 20000), group: "new", status: "new" },
    { source: "mobile", offer: offer("c", 24450), gone: true, group: "gone", status: "gone" },
    { source: "mobile", offer: offer("d", 21000), gone: true, group: "gone", status: "gone" },
  ];
  // The same fixed band in both checks: nothing is touched.
  const band = { from: null, to: 24500 };
  assert.equal(api.withinBothBands(rows, band, { from: null, to: 24500 }, "EUR"), rows);
  // Before: up to 24 400 €, now: up to 24 500 € — "a" only entered the band.
  const wider = plain(api.withinBothBands(rows, band, { from: null, to: 24400 }, "EUR"));
  assert.equal(wider.find((row) => row.offer.key === "a").group, "same", "not new: only in the wider band");
  assert.equal(wider.find((row) => row.offer.key === "b").group, "new");
  // Before: up to 24 500 €, now: up to 24 400 € — "c" left the band, not sold.
  const narrower = plain(api.withinBothBands(rows, { from: null, to: 24400 }, band, "EUR"));
  assert.equal(narrower.some((row) => row.offer.key === "c"), false, "not gone: outside today's band");
  assert.equal(narrower.some((row) => row.offer.key === "d"), true, "a car inside both bands is gone");
  assert.equal(api.inPriceBand({ price: 250000, currency: "SEK" }, { from: null, to: 24400 }, "EUR"), true, "another currency is not judged");
});
