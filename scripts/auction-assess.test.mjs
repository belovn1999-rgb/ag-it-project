// The assessment of auction reports (src/auction-assess.js): categories,
// degrees, ranges in zł, the verdict and the risks, checked against the
// owner's reference briefs of 2026-10-11 (docs/PROJECT-AUCTION-REPORTS.md §9).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const report = require("../src/auction-report.js");
const { assess, assessDamage } = require("../src/auction-assess.js");
const fixture = (name) => fs.readFileSync(new URL(`./fixtures/auction/${name}`, import.meta.url), "utf8");
const today = new Date("2026-10-11");
const keys = (list) => list.map((item) => item.key);

test("BMW 3 Touring: one smart repair — Auto OK, 150–400 zł, the service history as the only risk", () => {
  const result = assess(report.fromHtml(fixture("macadam-inspection-bmw.html"), "https://reports.macadam.eu/reports/x"), today);
  assert.equal(result.level, "ok");
  assert.deepEqual(result.total, [150, 400]);
  assert.deepEqual(keys(result.reasons), ["bodyClean", "keysRunning"]);
  assert.deepEqual(keys(result.risks), ["serviceUnknown"]);
  assert.deepEqual([result.rows[0].assessment.category, result.rows[0].assessment.degree], ["kosmetyczne", "lekkie"]);
});

test("Renault Clio: five panels to paint — needs attention, close to the brief's 4 600–7 850 zł", () => {
  const result = assess(report.fromHtml(fixture("macadam-inspection-clio.html"), "https://reports.macadam.eu/reports/x"), today);
  assert.equal(result.level, "check");
  assert.ok(result.total[0] >= 4000 && result.total[1] <= 9000, String(result.total));
  const tyre = result.rows.find((damage) => damage.element === "Pneu AVG").assessment;
  assert.deepEqual([tyre.category, tyre.degree, tyre.cost], ["użytkowe", "średnie", [250, 450]]);
});

test("Audi Q3 Sportback: two impacts and a warning light — risky, the rows that matter first", () => {
  const result = assess(report.fromHtml(fixture("macadam-appraisal-q3-prices.html"), "https://production.macadam.eu/x?withPrices=True"), today);
  assert.equal(result.level, "risky");
  assert.equal(result.counts.replaced, 5);
  assert.ok(result.total[0] >= 9000 && result.total[1] <= 24000, String(result.total));
  assert.deepEqual(keys(result.reasons), ["impacts", "warning"]);
  assert.ok(keys(result.risks).includes("warning"));
  assert.equal(result.risks.length <= 4, true);
  assert.equal(result.minor.length, 8, "Acceptable lines go to one line");
});

test("Remarketing Q3: hail and earlier repairs flagged, needs attention", () => {
  const result = assess(report.fromHtml(fixture("macadam-remarketing-q3.html"), "https://portal.macadam.eu/reports/remarketing?id=x"), today);
  assert.equal(result.level, "check");
  assert.ok(keys(result.reasons).includes("repaired"));
  assert.ok(keys(result.risks).includes("hail") && keys(result.risks).includes("pastRepair"));
  const roof = result.rows.find((damage) => damage.element === "Pavillon").assessment;
  assert.deepEqual([roof.degree, roof.flags], ["średnie", ["hail"]]);
});

test("PDFs: Audi A4 OK at 1 100–2 050 zł; Tesla — battery risk; Kuga PHEV — low tyres and battery", () => {
  const a4 = assess(report.fromPdf(JSON.parse(fixture("macadam-pdf-inspection-a4.json"))).report, today);
  assert.equal(a4.level, "ok");
  assert.deepEqual(a4.total, [1100, 2050]);
  const tesla = assess(report.fromPdf(JSON.parse(fixture("macadam-pdf-inspection-tesla.json"))).report, today);
  assert.ok(keys(tesla.risks).includes("battery") && keys(tesla.risks).includes("oneKey"));
  const kuga = assess(report.fromPdf(JSON.parse(fixture("macadam-pdf-appraisal-kuga.json"))).report, today);
  assert.equal(kuga.level, "check");
  assert.ok(keys(kuga.risks).includes("tyresLow") && keys(kuga.risks).includes("battery"));
});

test("one damage: structure, a past bad repair, nothing to repair", () => {
  assert.equal(assessDamage({ element: "Montant de toit D", type: "Bosse(s)", group: "none" }).category, "konstrukcyjne");
  const bad = assessDamage({ element: "Aile ARD", type: "Mauvaise réparation", group: "paint" });
  assert.deepEqual([bad.degree, bad.flags], ["średnie", ["badRepair"]]);
  assert.equal(assessDamage({ element: "Porte AVD", type: "Griffe(s)", group: "none" }).minor, true);
});
