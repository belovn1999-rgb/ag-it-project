// Auction condition reports (src/auction-report.js): every Macadam layout we
// have a sample of, read into the template. Fixtures are the owner's samples
// of 2026-10-11 with VINs, plates, photo and report ids replaced (the real
// reports stay outside the public repo). Values checked by hand against the
// reports (docs/PROJECT-AUCTION-REPORTS.md).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const api = require("../src/auction-report.js");
const fixture = (name) => fs.readFileSync(new URL(`./fixtures/auction/${name}`, import.meta.url), "utf8");
const pdf = (name) => JSON.parse(fixture(name));
const groups = (report) => report.damages.map((damage) => damage.group);

test("links: the layout and the address to read are found from the link", () => {
  const inspection = api.detectLink("https://reports.macadam.eu/reports/00000000-0000-4000-a000-000000000001?culture=pl-PL");
  assert.equal(inspection.layout, "inspection");
  assert.match(inspection.url, /culture=fr-FR/);
  const appraisal = api.detectLink("https://www4.macadam.eu/Manager/SinglePage/AppraisalWebview?AssessmentFileId=e%3dnc%3d%3dTEST&language=fr&withPrices=False");
  assert.equal(appraisal.layout, "appraisal");
  assert.match(appraisal.url, /withPrices=True/);
  assert.doesNotMatch(appraisal.url, /withPrices=False/);
  assert.match(appraisal.url, /AssessmentFileId=e%3Dnc%3D%3DTEST|AssessmentFileId=e%3dnc%3d%3dTEST/i);
  assert.equal(api.detectLink("https://portal.macadam.eu/reports/remarketing?id=e%3dnc%3d%3dTEST&culture=fr-FR").layout, "remarketing");
  assert.deepEqual(api.detectLink("https://www.auto1.com/pl/car/123"), { ok: false, firm: "AUTO1", reason: "firm" });
  assert.equal(api.detectLink("nie link").reason, "url");
  assert.equal(api.detectLink("https://example.com/report").reason, "unknown");
});

test("reports.macadam.eu: BMW Série 3 Touring — fields once, inspection, tyres, one damage", () => {
  const report = api.fromHtml(fixture("macadam-inspection-bmw.html"), "https://reports.macadam.eu/reports/x?culture=fr-FR");
  assert.equal(report.layout, "inspection");
  assert.equal(report.car.make, "BMW");
  assert.equal(report.car.model, "SERIE 3 TOURING");
  assert.equal(report.car.vin, "WBAXXXXXXX0000001");
  assert.equal(report.car.mileageKm, 121699);
  assert.equal(report.car.firstRegistrationIso, "2021-03-16");
  assert.equal(report.car.body, "Break");
  assert.equal(report.car.drive, "Arrière");
  assert.equal(report.inspection.date, "2026-09-23");
  assert.match(report.inspection.place, /^BMW EQUATION TOULOUSE, Route de Baziege/);
  assert.deepEqual(report.keys, { keys: 3, remotes: 2 });
  assert.deepEqual(report.documents.filter((item) => /certificat/i.test(item.label)).map((item) => item.value), ["Copie", "Non"]);
  assert.deepEqual(report.options, ["GPS", "Camera de recul", "Cache bagages"]);
  assert.deepEqual(report.tyres.map((tyre) => [tyre.position, tyre.depth, tyre.size]), [
    ["AVG", 6, "225/45 R 18 95 Y"], ["AVD", 6, "225/45 R 18 95 Y"], ["ARG", 4.5, "255/40 R 18 99 Y"], ["ARD", 4.3, "255/40 R 18 99 Y"],
  ]);
  assert.equal(report.damages.length, 1, "the second layout of the page is not a second damage");
  assert.equal(report.damages[0].cost, 84, "Macadam's costing from the page's Blazor data");
  assert.equal(report.costTotal, 84);
  assert.deepEqual([report.damages[0].element, report.damages[0].group], ["Garnit. couvercle AR", "smart"]);
  assert.ok(report.damages[0].photos.every((src) => src.startsWith("https://reports.macadam.eu/files/Original/")), "photos from <base href=\"/\">");
  assert.ok(report.missing.includes("version") && report.missing.includes("fuel"), "this layout has no engine");
});

test("reports.macadam.eu: Renault Clio — 15 damages, each once, with photos", () => {
  const report = api.fromHtml(fixture("macadam-inspection-clio.html"), "https://reports.macadam.eu/reports/x");
  assert.equal(report.title, "RENAULT CLIO");
  assert.equal(report.damages.length, 15);
  assert.deepEqual(report.damageGroups, { repair_paint: 4, paint: 1, flat: 1, replace: 4, glass: 1, clean: 3, refit: 1 });
  assert.ok(report.damages.every((damage) => damage.photos.length >= 2));
  assert.equal(report.tyres.find((tyre) => tyre.position === "AVD").depth, 3.6);
  // Matched by the damage's number, not by order (the data and the page list them differently).
  assert.equal(report.damages.find((damage) => damage.element === "Aile AVG").cost, 465);
  assert.equal(report.damages.find((damage) => damage.element === "Calandre").cost, 36.5);
  assert.equal(report.costTotal, 2587.7);
});

test("AppraisalWebview with prices: Audi Q3 — 32 damages, Macadam's prices add up to its total", () => {
  const report = api.fromHtml(fixture("macadam-appraisal-q3-prices.html"), "https://production.macadam.eu/Manager/SinglePage/AppraisalWebview?x=1&withPrices=True");
  assert.equal(report.title, "Audi Q3 Sportback");
  assert.equal(report.car.versionDetails, "35 TDI 150 S TRONIC S LINE");
  assert.equal(report.car.powerHpFromVersion, 150);
  assert.equal(report.damages.length, 32);
  assert.equal(report.costTotal, 6461.16);
  assert.equal(Math.round(report.damages.reduce((sum, damage) => sum + (damage.cost || 0), 0) * 100) / 100, 6461.16);
  const door = report.damages.find((damage) => damage.element === "Porte AVD");
  assert.deepEqual([door.group, door.cost], ["replace_paint", 1320.88]);
  assert.equal(report.damages[0].element, "Voyant défaut");
  assert.equal(report.damages[0].group, "check");
  assert.equal(report.keys.keys, 1);
  assert.equal(api.mileagePerYear(report, new Date("2026-10-11")).flag, "high");
});

test("AppraisalWebview without prices: Kia Ceed SW — photos from onclick, MHEV in the version, bad repairs", () => {
  const report = api.fromHtml(fixture("macadam-appraisal-kia.html"), "https://www4.macadam.eu/Manager/SinglePage/AppraisalWebview?x=1");
  assert.equal(report.damages.length, 33);
  assert.equal(report.costTotal, null);
  assert.match(report.car.version, /MHEV/);
  assert.equal(report.car.gearbox, "MAN 6 VIT");
  assert.equal(report.damages.filter((damage) => damage.type === "Mauvaise réparation").length, 2);
  assert.ok(report.damages.find((damage) => damage.element === "Pare-chocs AV").photos.length >= 10);
  assert.deepEqual(report.tyres.map((tyre) => tyre.season), ["hiver", "hiver", "hiver", "hiver"]);
});

test("remarketing link: Audi Q3 — the maker's equipment by VIN, checks, damages with areas", () => {
  const report = api.fromHtml(fixture("macadam-remarketing-q3.html"), "https://portal.macadam.eu/reports/remarketing?id=x");
  assert.equal(report.layout, "remarketing");
  assert.equal(report.car.powerKw, 110);
  assert.equal(report.car.version, "1.5 35 TFSI S TR ADVANCED BUSINESS ED");
  assert.equal(report.factoryEquipment.length, 18);
  assert.ok(report.factoryDetails.length > 50);
  assert.equal(report.damages.length, 7);
  assert.deepEqual(report.damages.find((damage) => damage.element === "Pavillon"), {
    ...report.damages.find((damage) => damage.element === "Pavillon"), type: "Grêlé", group: "hail", area: "Toit & autres",
  });
  assert.ok(report.documents.some((item) => item.label === "Certificat de Conformité" && item.value === "Oui"));
  assert.ok(report.other.every((item) => !/cable de charge/i.test(item.label)), "both charging cable rows are documents");
  assert.equal(report.damageSummary.length, 5);
});

test("inspection PDF (Ayvens print): Audi A4 and Tesla Model Y", () => {
  const a4 = api.fromPdf(pdf("macadam-pdf-inspection-a4.json"));
  assert.equal(a4.kind.layout, "inspection");
  const car = a4.report;
  assert.equal(car.client, "Ayvens France");
  assert.equal(car.title, "AUDI A4");
  assert.equal(car.car.plate, "AA-005-AA");
  assert.equal(car.car.mileageKm, 16243);
  assert.equal(car.inspection.date, "2026-09-23");
  assert.equal(car.inspection.place, "TEA LE MEUX, Rue du Bois Barbier 60880 Le Meux");
  assert.deepEqual(car.tyres.map((tyre) => tyre.depth), [4.3, 4.4, 5.6, 5.4]);
  assert.deepEqual(car.damages.map((damage) => `${damage.element}|${damage.repair}`), [
    "Pneu ARD|E - Remplacer", "Pneu AVG|E - Remplacer", "Revêtement assise siège AVD|Nettoyer",
    "Jante alum. ARD bi-ton/polychrome|Acceptable", "Pare-chocs AV|Acceptable", "Porte AVD|Acceptable",
  ]);
  assert.deepEqual(car.options, ["GPS", "Camera de recul"]);
  const tesla = api.fromPdf(pdf("macadam-pdf-inspection-tesla.json")).report;
  assert.equal(tesla.keys.keys, 1);
  assert.equal(tesla.state.fuelLevel, "0");
  assert.deepEqual(groups(tesla), ["replace", "replace", "flat", "flat", "flat", "flat", "flat", "flat"]);
  assert.deepEqual(tesla.spare, [{ label: "Compresseur", value: "Non" }, { label: "Kit réparation", value: "Non" }], "damage names are not spare-kit rows");
  assert.deepEqual(tesla.tyres.map((tyre) => tyre.depth), [4.9, 5.5, 3.3, 3.2]);
});

test("appraisal PDF: the link in its title, and the text when read without it", () => {
  const q3 = pdf("macadam-pdf-appraisal-q3.json");
  assert.match(api.detectPdf(q3).link, /^https:\/\/production\.macadam\.eu\/Manager\/SinglePage\/AppraisalWebview/);
  const report = api.fromPdf(q3).report;
  assert.equal(report.car.vin, "WAUZZZXXXX0000007");
  assert.equal(report.car.firstRegistration, "27/11/2023");
  assert.equal(report.car.version, "AUDI Q3 Sportback / 2019 / 5P / SUV 35 TDI 150 S TRONIC S LINE");
  assert.equal(report.car.upholstery, "Tissu / Autre / Cuir");
  assert.deepEqual(report.options, ["Phares Xenon/LED/Laser", "Camera de recul"]);
  assert.equal(report.damages.length, 32, "captions printed in pieces are joined");
  assert.deepEqual(report.tyres.map((tyre) => [tyre.depth, tyre.brand, tyre.wear]), [[4.6, "Hankook", 55], [4.7, "Hankook", 55], [4.7, "Hankook", 55], [4.8, "Hankook", 50]]);
  const kuga = api.fromPdf(pdf("macadam-pdf-appraisal-kuga.json")).report;
  assert.equal(kuga.car.fuel, "Hybride rechargeable");
  assert.equal(kuga.damages.length, 18);
  assert.equal(kuga.tyres.find((tyre) => tyre.position === "ARD").size, "225/65 R 17 102 H");
});

test("remarketing PDF: read from the link in its footer", () => {
  const page = { width: 842, height: 1191, items: [
    { str: "Rapport de Remarketing de MACADAM", x: 300, y: 1170, w: 200, h: 10 },
    { str: "https://portal.macadam.eu/reports/remarketing?id=e%3dnc%3d%3dTEST&culture=fr-FR", x: 20, y: 10, w: 400, h: 8 },
  ] };
  const kind = api.detectPdf({ title: "Rapport de Remarketing de MACADAM", pages: [page] });
  assert.equal(kind.layout, "remarketing");
  assert.match(kind.link, /^https:\/\/portal\.macadam\.eu\/reports\/remarketing\?id=/);
  assert.equal(api.fromPdf({ title: "Rapport de Remarketing de MACADAM", pages: [page] }).report, null);
});

test("words: French parts, damages and repairs in Polish and Russian", () => {
  assert.equal(api.partName("Porte AVD"), "Drzwi · przód prawy");
  assert.equal(api.partName("Porte AVD", "ru"), "Дверь · перед. правый");
  assert.equal(api.partName("Grille de pare-chocs  AV M"), "Kratka zderzaka · przód · środek");
  assert.equal(api.partName("Clef de contact TC (sans insert)"), "Kluczyk");
  assert.equal(api.partName("Coś nieznanego"), "");
  assert.equal(api.word("type", "Bosse(s) et griffe(s)"), "Wgniecenia i rysy");
  assert.equal(api.word("value", "Hybride rechargeable", "ru"), "Гибрид plug-in");
  assert.equal(api.repairName(api.repairGroup("PDR -  Débosselage ss peinture")), "Usuwanie wgnieceń bez lakierowania (PDR)");
  assert.equal(api.repairGroup("Le - Remplacer et peindre"), "replace_paint");
  assert.equal(api.repairGroup("LI - Réparer et peindre (complet)"), "repair_paint");
});
