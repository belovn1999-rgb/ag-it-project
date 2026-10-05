// The client offer's rules (B71, docs/OFFER-PAGE.md): market around an ad,
// strong options, verdict and red flags. The modules are plain browser
// scripts; they publish themselves on globalThis.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

for (const file of ["offer-market.js", "offer-equipment.js", "offer-verdict.js"]) {
  vm.runInThisContext(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), { filename: file });
}
const MARKET = globalThis.AUTOGOOD_OFFER_MARKET;
const EQUIPMENT = globalThis.AUTOGOOD_OFFER_EQUIPMENT;
const VERDICT = globalThis.AUTOGOOD_OFFER_VERDICT;

const offer = (key, price, year, mileage, extra = {}) => ({ key, price, currency: "EUR", year, mileage, country: "DE", ...extra });

test("the market around an ad: its country, the similar cars, Poland against the turnkey price", () => {
  const german = Array.from({ length: 20 }, (_, index) => offer(`mobile:${index}`, 20000 + index * 500, 2022 + (index % 2), 20000 + index * 1500));
  const car = offer("mobile:car", 21000, 2023, 30000, { turnkey: 100000 });
  const records = [{
    at: "2026-10-05T10:00:00.000Z",
    markets: {
      mobile: { total: 21, offers: [...german, car, offer("mobile:nl", 15000, 2023, 30000, { country: "NL" })] },
      otomoto: { total: 5, complete: true, offers: [110000, 112000, 115000, 118000, 120000].map((price, index) => ({ key: `oto:${index}`, price, currency: "PLN", year: 2023, mileage: 30000 })) },
    },
  }];
  const snapshot = MARKET.snapshot(records, "mobile:car", { now: Date.parse("2026-10-06T10:00:00.000Z") });
  assert.equal(snapshot.market.country, "DE");
  assert.equal(snapshot.market.scope, "country");
  assert.equal(snapshot.market.stats.count, 21, "the Dutch offer stays out of the German market");
  assert.ok(snapshot.market.dearerShare > 0.8, "cheaper than most of the market");
  assert.ok(snapshot.market.similar, "enough similar cars");
  assert.equal(snapshot.poland.basis.median, 115000);
  assert.equal(snapshot.poland.saving, 15000);
  assert.equal(snapshot.ad.kind, "atLeast");
  assert.equal(snapshot.ad.days, 1);
});

test("a market too thin in the ad's country is widened to every country of the check", () => {
  const records = [{ at: "2026-10-05T10:00:00.000Z", markets: { mobile: { total: 9, offers: [
    offer("mobile:car", 21000, 2023, 30000),
    ...Array.from({ length: 8 }, (_, index) => offer(`mobile:${index}`, 22000 + index * 100, 2023, 30000, { country: "BE" })),
  ] } } }];
  const snapshot = MARKET.snapshot(records, "mobile:car");
  assert.equal(snapshot.market.scope, "all");
  assert.equal(snapshot.market.stats.count, 9);
});

test("price drops across checks and the portal's own earlier price", () => {
  const records = [
    { at: "2026-09-01T09:30:00.000Z", markets: { mobile: { offers: [offer("mobile:car", 25000, 2023, 30000)] } } },
    { at: "2026-09-10T09:30:00.000Z", markets: { mobile: { offers: [offer("mobile:car", 24000, 2023, 30000)] } } },
    { at: "2026-10-05T09:30:00.000Z", markets: { mobile: { offers: [offer("mobile:car", 23500, 2023, 30000)] } } },
  ];
  const info = MARKET.adLiquidity(records, records[2].markets.mobile.offers[0], Date.parse("2026-10-05T12:00:00.000Z"));
  assert.equal(info.dropped, true);
  assert.equal(info.drops, 2);
  assert.equal(info.from, 25000);
  assert.ok(info.negotiable, "listed over 30 days and already cheaper");
});

test("strong options: the most valuable first, part leather said so, no duplicate camera", () => {
  const options = EQUIPMENT.keyOptions(["Sitzheizung", "Teilleder", "360°-Kamera", "Rückfahrkamera", "Panoramadach", "Navigationssystem", "Harman Kardon Soundsystem"], 8);
  assert.deepEqual(options.map((item) => item.label), ["Dach panoramiczny", "Tapicerka półskórzana", "Kamera 360°", "Nawigacja", "Podgrzewane fotele", "Audio Harman Kardon"]);
  assert.equal(EQUIPMENT.translate("Abstandstempomat"), "Aktywny tempomat (ACC)");
  assert.equal(EQUIPMENT.translate("Unknown thing"), "Unknown thing");
  assert.deepEqual(EQUIPMENT.trustSignals(["Garantie", "Scheckheftgepflegt"]).map((item) => item.id), ["warranty", "serviceBook"]);
});

const ad = (description, extra = {}) => ({ complete: true, title: "Toyota C-HR", description, specs: { accidentFree: true }, seller: { type: "dealer" }, flags: {}, features: [], ...extra });
const words = (result) => result.lines.filter((line) => line.id.startsWith("word:")).map((line) => line.text);

test("red flags: whole words, denials and the anti-theft alarm are not flags", () => {
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Diebstahlwarnanlage, Alarmanlage, Navi") })), []);
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Kein Unfallschaden, kein Mietwagen, keine Vorkasse.") })), []);
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("NESSUN VINCOLO DI FINANZIAMENTO") })), []);
  // The police after a theft is not an ex-police car.
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Nach Abschluss der polizeilichen Maßnahmen von der Polizei freigegeben.") })), []);
  assert.ok(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Ehemaliges Polizeifahrzeug, gepflegt.") })).includes("Możliwe użytkowanie flotowe (taxi, wynajem, nauka jazdy)"));
  const stolen = VERDICT.assess({ car: { price: 12000 }, ad: ad("Dieses Fahrzeug stammt aus einem Diebstahl und hat keine Papiere.") });
  assert.equal(stolen.verdict, "risk");
  assert.ok(words(stolen).includes("Wzmianka o kradzieży"));
  assert.ok(words(stolen).includes("Brak dokumentów — auta nie da się zarejestrować"));
  assert.ok(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Prezzo valido con finanziamento") })).includes("Cena może dotyczyć tylko zakupu na kredyt"));
  const quoted = VERDICT.assess({ car: { price: 20000 }, ad: ad("Gepflegt.\nLeichter Unfallschaden hinten rechts, repariert.") }).lines.find((line) => line.text === "Auto po wypadku lub uszkodzone");
  assert.match(quoted.quote, /Unfallschaden hinten rechts/);
});

test("verdict: a bait price is a risk, a fair one is fine", () => {
  const market = { own: { stats: { median: 25000, p25: 23000, p75: 27000, count: 30 } } };
  assert.equal(VERDICT.assess({ car: { price: 12000 }, ad: ad(""), market }).verdict, "risk");
  const fair = VERDICT.assess({ car: { price: 24000, seller: "dealer" }, ad: ad(""), market });
  assert.ok(fair.lines.some((line) => line.id === "price:fair"));
  assert.notEqual(fair.verdict, "risk");
});

test("negotiation: long listed and already cheaper means more room", () => {
  const now = Date.parse("2026-10-05T12:00:00.000Z");
  const market = { own: { stats: { median: 25000, p25: 23000, p75: 27000 } }, ad: { days: 45, dropped: true, drops: 1, share: -0.03, kind: "seen" } };
  const room = VERDICT.negotiation({ car: { price: 26000, currency: "EUR" }, market, now });
  assert.deepEqual([room.from, room.to], [3, 5]);
  const fresh = VERDICT.negotiation({ car: { price: 22000, currency: "EUR" }, market: { own: market.own, ad: { days: 3, dropped: false } }, now });
  assert.deepEqual([fresh.from, fresh.to], [0, 1]);
});

test("Polish plural forms", () => {
  assert.equal(VERDICT.plural(1, "opinia", "opinie", "opinii"), "opinia");
  assert.equal(VERDICT.plural(104, "opinia", "opinie", "opinii"), "opinie");
  assert.equal(VERDICT.plural(12, "opinia", "opinie", "opinii"), "opinii");
  assert.equal(VERDICT.plural(22, "opinia", "opinie", "opinii"), "opinie");
  assert.equal(VERDICT.plural(25, "opinia", "opinie", "opinii"), "opinii");
});
