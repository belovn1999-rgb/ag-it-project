// M10 (2026-10-11): every portal parser on a real, anonymous answer of that
// portal (scripts/fixtures/portals/, saved by scripts/portals/capture-fixtures.mjs).
// A parser change that reads a car differently fails here before it reaches
// the managers; a portal that changed its page gets a new fixture (capture
// again) and, if needed, a parser fix.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse, summary } from "./portals/parsers.mjs";

const dir = new URL("./fixtures/portals/", import.meta.url);
const expected = JSON.parse(readFileSync(new URL("expected.json", dir), "utf8"));
const thisYear = new Date().getFullYear();

for (const [portal, want] of Object.entries(expected)) {
  test(`${portal}: the saved answer reads as before`, () => {
    const body = readFileSync(new URL(want.file, dir), "utf8");
    const result = parse(portal, body, { now: new Date(want.capturedAt) });
    const { file, capturedAt, ...wanted } = want;
    assert.deepEqual(summary(result), wanted);
    // And what every car of any portal must have.
    assert.ok(result.total >= result.listings.length, "total ≥ cars read");
    for (const car of result.listings) {
      assert.ok(Number(car.price) >= 300, `${portal}: price ${car.price}`);
      assert.match(String(car.currency), /^(EUR|PLN|SEK|USD)$/);
      assert.ok(Number(car.year) >= 1990 && Number(car.year) <= thisYear + 1, `${portal}: year ${car.year}`);
      assert.ok(car.mileage === "" || Number(car.mileage) >= 0, `${portal}: mileage ${car.mileage}`);
      assert.match(String(car.url), /^https:\/\//, `${portal}: link ${car.url}`);
    }
  });
}

test("a block page is never read as a list (every parser says 'not read')", () => {
  const block = '<html><head><link rel="icon" href="/.safeline/static/favicon.png"></head><body></body></html>';
  for (const portal of ["autoscout", "otomoto", "kleinanzeigen", "paruvendu"]) {
    assert.throws(() => parse(portal, block), undefined, portal);
  }
  for (const portal of ["marktplaats", "blocket", "avby"]) {
    assert.throws(() => parse(portal, "{}"), undefined, portal);
  }
});
