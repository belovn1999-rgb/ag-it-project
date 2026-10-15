// Umowa zamówienia pojazdu, filled onto its PDF template in the browser
// (src/order-contract-pdf.js). Guards the template itself — all 42 form fields
// present, two pages, nothing left editable — and the rule that a value which
// does not fit is refused with the field named, never cut or spilled.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PDFLib = require("../vendor/pdf-lib.min.js");
const fontkit = require("../vendor/fontkit.umd.min.js");
const generator = require("../src/order-contract-pdf.js");

const templateBytes = readFileSync(new URL("../contract-pdf-work/templates/Umowa_Zamowienia_Pojazdu_AG_wzor.pdf", import.meta.url));
const fontBytes = readFileSync(new URL("../assets/fonts/Carlito-Regular.ttf", import.meta.url));

function contract(overrides = {}) {
  return {
    number: "15/10/26/2",
    date: "15 października 2026",
    client: { name: "Jan Kowalski", address: "ul. Kwiatowa 12/3 00-950 Warszawa", identifier: "85010112345", document: "dowód osobisty ABC 123456", phone: "+48 601 234 567", email: "jan@example.com", isEntrepreneur: false },
    variants: [2],
    indicatedVehicle: true,
    indicatedLink: "WAUZZZ4G7DN123456",
    vehicle: { makeModel: "Audi A6", years: "2019 – 2022", mileageTo: "120 000", fuels: ["diesel"], gearboxes: ["automatyczna"], bodies: ["kombi"], bodyOther: "", euro: "dowolna", euroOther: "", allowRepaired: false, required: "Hak", expected: "" },
    currency: "PLN",
    budget: "185 000 PLN brutto",
    advance: "20 000 PLN brutto",
    advancePurposes: ["ogledziny"],
    ...overrides,
  };
}

async function build(data) {
  return generator.build({ PDFLib, fontkit, templateBytes, fontBytes, contract: data });
}

test("the template carries every field the generator fills", async () => {
  const form = (await PDFLib.PDFDocument.load(templateBytes)).getForm();
  const names = new Set(form.getFields().map((field) => field.getName()));
  for (const name of Object.values(generator.BOXES)) assert.ok(names.has(name), `checkbox ${name}`);
  for (const name of ["nr_umowy", "data_umowy", "imie_nazwisko", "adres", "pesel_nip", "dokument", "telefon", "email", "link_vin", "marka_model", "rok_od_do", "przebieg_do", "nadwozie_inne", "euro_inna", "cechy_wymagane", "cechy_oczekiwane", "budzet", "zaliczka"]) {
    assert.ok(names.has(name), `text field ${name}`);
  }
});

test("a filled contract is two flat pages", async () => {
  const pdf = await PDFLib.PDFDocument.load(await build(contract()));
  assert.equal(pdf.getPageCount(), 2);
  assert.equal(pdf.getForm().getFields().length, 0, "fields are flattened");
});

test("a blank contract builds too (all values empty, no boxes ticked)", async () => {
  const blank = contract({
    client: { name: "", address: "", identifier: "", document: "", phone: "", email: "", isEntrepreneur: false },
    variants: [], indicatedVehicle: false, indicatedLink: "",
    vehicle: { makeModel: "", years: "", mileageTo: "", fuels: [], gearboxes: [], bodies: [], bodyOther: "", euro: "", euroOther: "", allowRepaired: false, required: "", expected: "" },
    currency: "", budget: "", advance: "", advancePurposes: [],
  });
  assert.equal((await PDFLib.PDFDocument.load(await build(blank))).getPageCount(), 2);
});

test("a long address and e-mail wrap inside their box", async () => {
  const data = contract();
  data.client = { ...data.client, address: "ul. Generała Władysława Andersa 128/47 03-180 Warszawa-Białołęka", email: "aleksandra.wisniewska.kowalczyk@example.com" };
  assert.equal((await PDFLib.PDFDocument.load(await build(data))).getPageCount(), 2);
});

test("a link that cannot fit is refused and names the field", async () => {
  await assert.rejects(
    build(contract({ indicatedLink: "https://suchen.mobile.de/fahrzeuge/details.html?id=412345678&damageUnrepaired=NO_DAMAGE_UNREPAIRED" })),
    (error) => error instanceof generator.ContractFitError && error.field === "link"
  );
});

test("equipment longer than its two lines is refused, not spilled into the next row", async () => {
  const data = contract();
  data.vehicle = { ...data.vehicle, required: "Matrix LED, kamera 360°, hak, ".repeat(20) };
  await assert.rejects(build(data), (error) => error instanceof generator.ContractFitError && error.field === "required");
});
