// DEKRA condition reports (src/auction-report.js, 2026-10-12): the four prints
// read from the PDF's text into the same template as Macadam, and their
// assessment (src/auction-assess.js) against the owner's briefs of 2026-10-11/12
// (~/cloude/auction-reports-samples/dekra/BRIEFY-dekra-7.md, outside the repo).
// Fixtures: the samples' PDF.js text with VINs, plates, numbers and addresses replaced.
// docs/PROJECT-AUCTION-REPORTS.md §11.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const api = require("../src/auction-report.js");
const { assess } = require("../src/auction-assess.js");
const pdf = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/auction/${name}`, import.meta.url), "utf8"));
const read = (name) => api.fromPdf(pdf(name));

test("NL Rapportage voertuigstaat: car, lists, tyres, damage cards in two columns, the smoker", () => {
  const { kind, report } = read("dekra-nl-q3.json");
  assert.deepEqual([kind.firm, kind.layout], ["DEKRA", "dekra-nl"]);
  assert.equal(report.car.vin, "WAUZZZ00000000001");
  assert.equal(report.car.mileageKm, 117432);
  assert.equal(report.car.gearbox, "manuelle");
  assert.equal(report.car.gears, 6);
  assert.equal(report.car.model, "Q3 Sportback");
  assert.equal(report.inspection.date, "2026-10-06");
  assert.deepEqual(report.keys, { keys: 2, remotes: 1 });
  assert.deepEqual(report.tyres.map((tyre) => [tyre.position, tyre.depth]), [["AVG", 4.3], ["AVD", 4.2], ["ARG", 5], ["ARD", 5]]);
  assert.deepEqual(report.damages.map((damage) => [damage.element, damage.type, damage.group]), [
    ["carrosserie", "sale", "clean"], ["porte ARD", "bosse(s)", "smart"], ["spoiler AVG", "griffe(s)", "repair_paint"], ["toit", "degats environnement", "flat"],
  ]);
  assert.equal(report.damages[1].area, "Aantal > 2");
  assert.ok(report.remarks.includes("gerookt in auto"));
  assert.ok(report.remarks.some((text) => /Automatische versnellingsbak/.test(text)), "the gearbox contradiction goes to the caretaker");
  const result = assess(report, new Date("2026-10-12"));
  assert.equal(result.level, "check");
  assert.equal(result.reasons[0].key, "smoke");
});

test("DE Vermarktungsbericht: paint measured, a documented repair, lift, service, equipment, photo numbers", () => {
  const { kind, report } = read("dekra-de-x3.json");
  assert.equal(kind.layout, "dekra-de");
  assert.equal(report.layoutName, "Vermarktungsbericht");
  assert.equal(report.car.make, "BMW");
  assert.equal(report.car.model, "X3");
  assert.equal(report.car.versionDetails, "X3 xDrive20d Luxury Line");
  assert.equal(report.car.powerKw, 140);
  assert.equal(report.car.displacement, 1995);
  assert.equal(report.car.drive, "integrale");
  assert.deepEqual(report.inspection.paint.repainted.map((item) => [item.element, item.um, item.byClient]), [["porte AVD", 110, false]]);
  assert.deepEqual([report.inspection.paint.min, report.inspection.paint.max], [180, 260]);
  assert.deepEqual(report.inspection.repaired, [{ part: "Tür vorn links", element: "porte AVG", amount: 2715.95 }]);
  assert.equal(report.inspection.lift, true);
  assert.equal(report.inspection.engineRun, true);
  assert.equal(report.keys.keys, 2);
  assert.equal(report.photoCount, 13);
  assert.ok(report.documents.some((item) => item.label === "Dernier entretien" && item.km === 74053));
  assert.ok(report.factoryEquipment.includes("BMW Live Cockpit Plus"));
  assert.deepEqual(report.damages.map((damage) => [damage.element, damage.type, damage.group, damage.accepted]), [
    ["bas de caisse ARG", "griffe(s)", "smart", false], ["freins", "message d'erreur", "replace", false], ["moulure", "griffe(s)", "replace", false], ["aile ARD", "bosse(s)", "none", true],
  ]);
  assert.deepEqual(report.damages[0].photoRefs, [8, 9]);
  const result = assess(report, new Date("2026-10-12"));
  assert.equal(result.level, "ok", "brief 4: auto OK");
  assert.ok(result.risks.some((risk) => risk.key === "pastRepair"));
  assert.equal(result.damages[1].assessment.category, "użytkowe");
});

test("DE Zustandsbericht-Leasing: repaint by the client's word, wet car, marten, service left", () => {
  const { report } = read("dekra-de-leasing-xc60.json");
  assert.equal(report.layoutName, "Zustandsbericht / Minderwertgutachten-Leasing");
  assert.equal(report.car.gears, 8);
  assert.equal(report.car.fuel, "hybride essence");
  assert.deepEqual(report.inspection.paint.repainted.map((item) => [item.element, item.byClient]), [["pare-chocs AR", true]]);
  assert.equal(report.inspection.limited, "wet");
  assert.ok(report.documents.some((item) => item.label === "Prochain entretien" && item.km === 23993 && item.days === 90));
  assert.equal(report.damages[0].element, "motorraum");
  assert.equal(report.damages[0].type, "tierverbiss");
  assert.equal(report.damages.filter((damage) => damage.accepted).length, 4);
  const result = assess(report, new Date("2026-10-12"));
  assert.equal(result.level, "ok", "brief 8: auto OK");
  assert.deepEqual(result.risks.map((risk) => risk.key).slice(0, 3), ["animal", "repaintClaimed", "inspectionLimited"]);
});

test("FR/BE (Hödlmayr): description under labels, equipment columns, damages with footnotes, removable items", () => {
  const { kind, report } = read("dekra-fr-a3.json");
  assert.equal(kind.layout, "dekra-fr");
  assert.equal(report.car.model, "A3 SPORTBACK");
  assert.equal(report.car.fuel, "hybride rechargeable");
  assert.equal(report.car.drive, "avant");
  assert.equal(report.car.powerKw, 150);
  assert.equal(report.inspection.place, "PARC HÖDLMAYR TONGEREN");
  assert.deepEqual(report.checks.map((check) => check.value), ["Ok", "Ok", "Ok"]);
  assert.deepEqual(report.damages.map((damage) => [damage.element, damage.type, damage.group]), [
    ["bas de caisse D", "bosse(s)", "repair_paint"], ["porte ARD", "mauvaise reparation", "repair_paint"], ["aile ARD", "mauvaise reparation", "repair_paint"],
    ["poignee ext porte ARD", "mauvaise reparation", "paint"], ["bas de caisse G", "bosse(s)", "repair_paint"], ["pare-chocs AR", "casse", "replace"],
  ]);
  assert.equal(report.damages[1].area, "Sur réserve pour échanger");
  assert.ok(report.documents.some((item) => item.label === "Carnet d'entretien"));
  assert.ok(report.options.includes("Attelage"));
  assert.equal(report.keys.keys, 2);
  const result = assess(report, new Date("2026-10-12"));
  assert.equal(result.level, "risky", "brief 7: ryzykowne (sills dented, bad repairs)");
  assert.equal(result.counts.structural, 2);
});

test("DEKRA words: parts and sides in German, Dutch and French; Macadam PDFs not taken for DEKRA", () => {
  assert.equal(api.dekraPart("Tür vorne rechts"), "porte AVD");
  assert.equal(api.dekraPart("Portier Rechtsachter"), "porte ARD");
  assert.equal(api.dekraPart("Seitenteil links"), "aile ARG");
  assert.equal(api.dekraPart("Compresseur kit réparation pneumatique"), "compresseur");
  assert.equal(api.partName("bas de caisse ARG"), "Próg · tył lewy");
  assert.equal(api.word("type", "Tierverbiss"), "Pogryzione przez zwierzę (kuna)");
  assert.equal(api.repairGroup("instandsetzen und lackieren mit Lackaufbau"), "repair_paint");
  assert.equal(api.equipmentName("Parkkamera mit 360° Surround View"), "Kamera 360°");
  assert.equal(api.detectPdf(pdf("macadam-pdf-inspection-a4.json")).firm, "Macadam");
});
