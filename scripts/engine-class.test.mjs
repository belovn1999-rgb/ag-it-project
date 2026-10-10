// Engine class for the excise (src/engine-class.js classifyEngineType and
// the Blocket fuel reader of src/mobile.js): real names from the audit of 2026-10-10.
// 0 = EL / PHEV <=2000, 1 = PHEV / HEV >2000, 2 = HEV <=2000,
// 3 = combustion <=2000, 4 = combustion >2000.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const classifier = readFileSync(new URL("../src/engine-class.js", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../src/mobile.js", import.meta.url), "utf8");
const fuels = mobile.match(/const BLOCKET_FUELS = [^\n]+/)[0];
const context = {};
vm.runInNewContext(`${classifier}\n${fuels}\nthis.classify = classifyEngineType; this.litres = litresInTitle; this.plugin = isPluginHybridText; this.fuels = BLOCKET_FUELS;`, context);
const { classify, litres, plugin } = context;
const blocketFuel = (label) => (context.fuels.find(([pattern]) => pattern.test(label)) || [])[1] || "";

test("plug-ins named only by the model are plug-ins (0 % up to 2000 cm³)", () => {
  for (const name of [
    "Hybrid (Benzin/Elektro) Volkswagen Golf 1.4 eHybrid DSG",
    "Elektro/Benzin VW Golf GTE 1.4 TSI",
    "Hybrid Audi A3 Sportback 40 TFSI e S tronic",
    "Hybrid Skoda Octavia Combi 1.4 TSI iV DSG",
    "Hybrid BMW 330e Touring",
    "Hybrid BMW 225xe Active Tourer",
    "Hybrid Mercedes-Benz C 300 e T-Modell",
    "Hybrid Mercedes-Benz E 300 de",
    "Hybrid Volvo XC60 T6 AWD Recharge",
    "Hybrid Volvo V60 T8 Twin Engine",
    "Hybrid Jeep Compass 1.3 4xe",
    "Hybrid Cupra Formentor 1.4 e-HYBRID",
    "Plug-in-Hybrid Toyota RAV4",
  ]) assert.equal(classify(name, 1400), 0, name);
  assert.equal(classify("Hybrid BMW X5 xDrive45e", 2998), 1, "a plug-in over 2000 cm³");
});

test("no plug-in where there is none", () => {
  assert.equal(classify("Diesel Peugeot 308 1.6 e-HDi", 1560), 3, "Peugeot e-HDi is a diesel");
  assert.equal(classify("Benzin Peugeot 308 1.2 e-THP 130", 1199), 3, "Peugeot e-THP is petrol");
  assert.equal(classify("Benzin VW Golf 2.0 TSI 245 Edition", 1984), 3);
  assert.equal(classify("Hybrid Toyota Corolla 1.8 Hybrid", 1798), 2, "a full hybrid stays a hybrid");
  assert.equal(classify("Benzin VW Golf 1.5 eTSI", 1498), 2, "a mild hybrid takes the hybrid rate (owner 2026-10-03)");
  assert.equal(classify("Diesel Audi A6 3.0 TDI", 2967), 4);
  assert.equal(plugin("Mercedes-Benz E 220 d"), false);
});

test("electric cars in Dutch and French", () => {
  assert.equal(classify("Elektrisch Volkswagen e-Golf", null), 0);
  assert.equal(classify("Électrique Renault Zoe", null), 0);
  assert.equal(classify("Diesel VW Golf Elektro-Paket", 1968), 3, "an equipment word is no electric car");
});

test("Blocket fuel labels", () => {
  assert.equal(blocketFuel("Diesel"), "diesel", "'Diesel' holds 'el'");
  assert.equal(blocketFuel("El"), "electric");
  assert.equal(blocketFuel("Hybrid el/bensin"), "hybrid");
  assert.equal(blocketFuel("Laddhybrid"), "plug-in hybrid");
  assert.equal(blocketFuel("Hybrid gas"), "petrol", "a CNG car is no hybrid");
  assert.equal(blocketFuel("Bensin"), "petrol");
  assert.equal(classify("Hybrid gas VW Golf 1.5 TGI", 1498), 3);
});

test("litres in a name", () => {
  assert.equal(litres("Audi A6 Avant 3.0 TDI quattro"), 3000);
  assert.equal(litres("Volkswagen Passat 2.0 TDI EVO SCR 150 DSG7"), 2000);
  assert.equal(litres("VW Golf GTI"), null);
});
