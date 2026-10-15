// The owner's rules for client data recognised from pasted text
// (docs/PROJECT-UMOWY.md §6), shared by contracts 01/03 and 02:
// PESEL 11 digits, NIP 10, phone 9 digits without +48, address
// "ul. Kolejowa 102, 05-092 Łomianki", name exactly "Imię Nazwisko" —
// whatever the order, case, labels or line breaks of the paste.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { recognizeClient, peselChecksumValid } = require("../src/client-recognition.js");
const cases = JSON.parse(readFileSync(new URL("./fixtures/client-recognition-cases.json", import.meta.url), "utf8"));

for (const sample of cases) {
  test(`recognises ${sample.id}`, () => {
    const got = recognizeClient(sample.text);
    for (const [field, want] of Object.entries(sample.want)) assert.equal(got[field] || "", want, `${field}\n${sample.text}`);
  });
}

test("a phone written without + that happens to pass the PESEL checksum is still a phone when bracketed", () => {
  assert.ok(peselChecksumValid("48669050903"));
  const got = recognizeClient("Adam Kaliszewski\n(+48) 669 050 903\n79092600814");
  assert.equal(got.phone, "669050903");
  assert.equal(got.identifier, "79092600814");
});

test("company names that start like a label stay whole", () => {
  assert.equal(recognizeClient("AUTO-HANDEL SP. Z O.O.\nNIP 5213874567").name, "AUTO-HANDEL SP. Z O.O.");
});

// Every name form × address form × phone form × PESEL form, lines shuffled.
test("generated variants of six clients all land in the right fields", () => {
  let seed = 2026;
  const rnd = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return Math.floor(seed / 65536) % n;
  };
  const shuffle = (items) => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = rnd(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const clients = [
    ["Adam", "Kaliszewski", "", "Żeromskiego 3/32", "01-887", "Warszawa", "79092600814", "669050903"],
    ["Anna", "Kowalska", "ul. ", "Kolejowa 102", "05-092", "Łomianki", "85010112345", "601234567"],
    ["Katarzyna", "Zielińska", "al. ", "Jerozolimskie 65/79", "00-697", "Warszawa", "90020254321", "501222333"],
    ["Siarhei", "Ivanou", "", "Polna 8/12", "61-001", "Poznań", "88030354321", "512345678"],
    ["Mirosław", "Żółtowski", "ul. ", "Lipowa 3/4", "20-001", "Lublin", "75121212345", "691000111"],
    ["Magdalena", "Kaczmarek", "", "Warszawska 5", "05-082", "Stare Babice", "92050467890", "700800900"],
  ];
  const names = [
    (f, l) => [`${f} ${l}`], (f, l) => [`${l} ${f}`], (f, l) => [`${l.toUpperCase()} ${f}`], (f, l) => [`${f.toLowerCase()} ${l.toLowerCase()}`],
    (f, l) => [`Pan ${f} ${l}`], (f, l) => [`Imię i nazwisko: ${f} ${l}`], (f, l) => [`Klient: ${l} ${f}`],
    (f, l) => [`Nazwisko: ${l}`, `Imię: ${f}`], (f, l) => [`Nazwisko i imię: ${l} ${f}`],
  ];
  const addresses = [
    (s, r, p, c) => [`${s}, ${p} ${c}`], (s, r, p, c) => [`${r}, ${p} ${c}`], (s, r, p, c) => [r, `${p} ${c}`], (s, r, p, c) => [`${p} ${c}`, s],
    (s, r, p, c) => [`${p} ${c}, ${s}`], (s, r, p, c) => [`${c} ${p}, ${r}`], (s, r, p, c) => [`${r} ${p} ${c}`],
    (s, r, p, c) => [`Adres: ${s}, ${p} ${c}`], (s, r, p, c) => [`Adres: ${p} ${c}, ${s}`], (s, r, p, c) => [`zam. ${s}, ${p} ${c}`],
  ];
  const spaced = (x) => `${x.slice(0, 3)} ${x.slice(3, 6)} ${x.slice(6)}`;
  const phones = [(x) => `+48 ${spaced(x)}`, (x) => x, (x) => `${x.slice(0, 3)}-${x.slice(3, 6)}-${x.slice(6)}`, (x) => `0048 ${spaced(x)}`, (x) => `tel. ${spaced(x)}`, (x) => `Telefon: +48${x}`, (x) => `(+48) ${spaced(x)}`, (x) => `${x.slice(0, 3)} ${x.slice(3, 5)} ${x.slice(5, 7)} ${x.slice(7)}`];
  const pesels = [(x) => `PESEL: ${x}`, (x) => `PESEL ${x}`, (x) => x, (x) => `pesel: ${x}`];
  let checked = 0;
  for (const [first, last, prefix, street, postal, city, pesel, phone] of clients) {
    const want = { name: `${first} ${last}`, address: `${prefix || "ul. "}${street}, ${postal} ${city}`, identifier: pesel, phone, type: "person" };
    for (let k = 0; k < 80; k += 1) {
      const text = shuffle([
        names[rnd(names.length)](first, last),
        addresses[rnd(addresses.length)](`${prefix || "ul. "}${street}`, `${prefix}${street}`, postal, city),
        [phones[rnd(phones.length)](phone)],
        [pesels[rnd(pesels.length)](pesel)],
      ]).flat().join("\n");
      const got = recognizeClient(text);
      for (const [field, value] of Object.entries(want)) assert.equal(got[field], value, `${field}\n${text}`);
      checked += 1;
    }
  }
  assert.equal(checked, 480);
});
