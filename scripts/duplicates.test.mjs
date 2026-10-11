// One test of "the same car" (owner 2026-10-11, audit p. 14): the same year,
// the same mileage and the same price — for the second portal of a country
// (dropMobileDuplicates) and for one car listed twice (uniqueOffers).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Page 3 lives in its own file since 2026-10-11: both files are searched.
const source = ["mobile-market-analysis.js", "mobile-monitoring.js"]
  .map((name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8")).join("\n");
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name}: no end`);
}
const preference = source.match(/const OFFER_PREFERENCE = [^\n]+/)[0];
const { sameCarKey, uniqueOffers, dropMobileDuplicates, notNewIfListedBefore } = new Function(`const listingSource = (listing) => listing.source;\n${preference}\n${["sameCarKey", "uniqueOffers", "dropMobileDuplicates", "notNewIfListedBefore"].map(functionSource).join("\n")}\nreturn { sameCarKey, uniqueOffers, dropMobileDuplicates, notNewIfListedBefore };`)();

const car = (source, price, mileage, year, extra = {}) => ({ source, price, mileage, year, currency: "EUR", url: `https://${source}/${price}-${mileage}-${year}`, ...extra });

test("the same year, mileage and price = one car", () => {
  assert.equal(sameCarKey(car("mobile", 18950, 64000, 2021)), sameCarKey(car("autoscout", 18950, 64000, 2021)));
  const { unique, duplicates } = dropMobileDuplicates([car("autoscout", 18950, 64000, 2021)], [car("mobile", 18950, 64000, 2021)]);
  assert.equal(duplicates, 1);
  assert.equal(unique.length, 0);
});

test("another year is another car (audit: Golf VIII 2021 and Golf 7 2020, both 9 590 € / 193 000 km)", () => {
  const { unique, duplicates } = dropMobileDuplicates([car("autoscout", 9590, 193000, 2020)], [car("mobile", 9590, 193000, 2021)]);
  assert.equal(duplicates, 0);
  assert.equal(unique.length, 1);
  assert.equal(uniqueOffers([car("mobile", 9590, 193000, 2021), car("autoscout", 9590, 193000, 2020)]).length, 2);
});

test("another price or mileage is another car; prices in other currencies never merge", () => {
  assert.equal(uniqueOffers([car("mobile", 35490, 56500, 2022), car("autoscout", 35990, 56500, 2022)]).length, 2);
  assert.equal(uniqueOffers([car("mobile", 35490, 56500, 2022), car("autoscout", 35490, 56400, 2022)]).length, 2);
  assert.equal(uniqueOffers([car("mobile", 39900, 10, 2025), car("autoscout", 39900, 10, 2025)]).length, 1, "a new car under 1000 km merges too (owner 2026-10-11)");
  assert.equal(uniqueOffers([car("mobile", 39900, 10, 2025), car("autoscout", 39900, 15, 2025)]).length, 2, "another mileage");
  assert.equal(uniqueOffers([car("mobile", 39900, null, 2025), car("autoscout", 39900, null, 2025)]).length, 2, "no mileage stated");
  assert.equal(uniqueOffers([car("otomoto", 89900, 120000, 2019, { currency: "PLN" }), car("mobile", 89900, 120000, 2019)]).length, 2);
});

test("the copy kept is the main portal's", () => {
  const kept = uniqueOffers([car("kleinanzeigen", 16690, 92500, 2020), car("mobile", 16690, 92500, 2020)]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].source, "mobile");
});

test("a car the last check showed on another portal is not new (N1, KONA 08→09.10)", () => {
  const yesterday = new Set([sameCarKey(car("mobile", 15440, 74559, 2020))]);
  const rows = notNewIfListedBefore([
    { source: "autoscout", offer: car("autoscout", 15440, 74559, 2020), group: "new", status: "new" },
    { source: "autoscout", offer: car("autoscout", 16990, 41000, 2021), group: "new", status: "new" },
    { source: "autoscout", offer: car("autoscout", 15440, 74559, 2020), gone: true, group: "gone", status: "gone" },
  ], yesterday);
  assert.deepEqual(rows.map((row) => row.group), ["same", "new", "gone"]);
});
