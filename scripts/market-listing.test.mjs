// Offers of every portal as the analysis and Monitoring keep them (audit
// 2026-10-10, wave 2 "data and portal errors"): links of all portals, the
// ad's date, the gearbox in Dutch/French, AutoScout24 FR VAT, the 2dehands
// seller's country, and "not read" ≠ "0 offers".
// The portal parsers are plain browser scripts (they publish themselves on
// window); normalizeListing and parseOtomotoPage live inside the big
// mobile-market-analysis.js closure, so their source is taken out of it by
// name and run on its own.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

// Browser stand-ins enough for the scripts to load.
globalThis.window = globalThis;
globalThis.document = { querySelector: () => null, querySelectorAll: () => [], documentElement: { lang: "pl" } };
for (const file of ["autoscout-search.js", "kleinanzeigen-search.js", "marktplaats-search.js", "paruvendu-search.js"]) {
  vm.runInThisContext(read(file), { filename: file });
}

// One function of mobile-market-analysis.js, by name (braces counted).
function functionSource(source, name) {
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
const analysis = `${read("mobile-market-analysis.js")}\n${read("mobile-monitoring.js")}`;
const names = ["parseMarketNumber", "listingValue", "isDirectOtomotoListingUrl", "isDirectAvbyListingUrl", "isDirectAutoscoutListingUrl",
  "isDirectBlocketListingUrl", "isDirectSecondPortalListingUrl", "isDirectMobileListingUrl", "gearboxKind", "listingSource", "normalizeListing", "parseOtomotoPage"];
const { normalizeListing, gearboxKind, parseOtomotoPage } = new Function(`${names.map((name) => functionSource(analysis, name)).join("\n")}\nreturn { ${names.join(", ")} };`)();

const AS = globalThis.AUTOGOOD_AUTOSCOUT;
const KA = globalThis.AUTOGOOD_KLEINANZEIGEN;
const MP = globalThis.AUTOGOOD_MARKTPLAATS;
const PV = globalThis.AUTOGOOD_PARUVENDU;

test("every portal's ad link is kept (Marktplaats, 2dehands, Kleinanzeigen, ParuVendu too)", () => {
  const links = {
    mobile: "https://suchen.mobile.de/fahrzeuge/details.html?id=49868246734976",
    otomoto: "https://www.otomoto.pl/osobowe/oferta/volkswagen-golf-ID6HxYz1.html",
    blocket: "https://www.blocket.se/mobility/item/19283746",
    avby: "https://cars.av.by/volkswagen/golf/112233445",
    autoscout: "https://www.autoscout24.de/angebote/volkswagen-golf-benzin-059e129c-03b1-4653-995e-a6075f54aa79",
    autoscoutfr: "https://www.autoscout24.fr/offres/volkswagen-golf-d2b19dcc-1111-2222-3333-444455556666",
    marktplaats: "https://www.marktplaats.nl/v/auto-s/volkswagen/m2451995619-volkswagen-tiguan-1-4-tsi-92kw-2018-wit",
    dehands: "https://www.2dehands.be/v/auto-s/volkswagen/m2450418977-volkswagen-transporter-t3",
    kleinanzeigen: "https://www.kleinanzeigen.de/s-anzeige/vw-golf-7-1-4-tsi/3531264201-216-1234",
    paruvendu: "https://www.paruvendu.fr/a/voiture-occasion/volkswagen/polo/1294686993A1KVVOVWPOL",
  };
  Object.entries(links).forEach(([source, url], index) => {
    const listing = normalizeListing({ id: `x${index}`, url, price: 15000, currency: source === "otomoto" ? "PLN" : source === "blocket" ? "SEK" : source === "avby" ? "USD" : "EUR", source }, index);
    assert.equal(listing.url, url, `${source}: link kept`);
    assert.equal(listing.source, source);
  });
  // A search page is not an ad: no link.
  assert.equal(normalizeListing({ url: "https://www.marktplaats.nl/l/auto-s/volkswagen/", price: 1000 }, 0).url, "");
});

test("the ad's date: listedAt or the importer's createdAt; none = empty (brak)", () => {
  assert.equal(normalizeListing({ price: 1, listedAt: "2026-10-06" }, 0).listedAt, "2026-10-06");
  assert.equal(normalizeListing({ price: 1, createdAt: "2026-09-30T07:45:00.000Z", source: "mobile" }, 0).listedAt, "2026-09-30T07:45:00.000Z");
  assert.equal(normalizeListing({ price: 1, source: "autoscout" }, 0).listedAt, "");
});

test("gearbox in German, Dutch, French, Polish, Russian", () => {
  ["Schaltgetriebe", "Handgeschakeld", "Manuelle", "Boîte manuelle", "Manualna", "механика"].forEach((word) => assert.equal(gearboxKind(word), "manual", word));
  ["Automatik", "Automaat", "Semi-automaat", "Automatique", "Automatyczna", "робот"].forEach((word) => assert.equal(gearboxKind(word), "automatic", word));
  assert.equal(normalizeListing({ price: 1, transmission: "Handgeschakeld", source: "marktplaats" }, 0).gearbox, "manual");
});

const autoscoutPage = (items, total = items.length) => `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { numberOfResults: total, numberOfPages: 1, listings: items } } })}</script></html>`;
const autoscoutItem = (id, price, extra = {}) => ({
  id, url: `/angebote/vw-golf-${id}`, price: { priceRaw: price, ...extra }, vehicle: { make: "Volkswagen", model: "Golf" },
  location: { countryCode: "FR" }, seller: { type: "Dealer" }, tracking: { firstRegistration: "03-2021", mileage: "40000" },
});

test("AutoScout24 FR: footnote 1 alone = VAT deductible (no 'inkl. MwSt.' in France)", () => {
  const page = AS.parseSearchPage(autoscoutPage([
    autoscoutItem("d2b19dcc", 16990, { priceSuperscriptString: "1" }),
    autoscoutItem("fb0c3b2f", 20190),
    autoscoutItem("b34a8823", 14380, { vatLabel: "inkl. MwSt.", priceSuperscriptString: "1" }),
  ]));
  assert.deepEqual(page.listings.map((listing) => listing.vatDeductible), [true, false, true]);
  const vat = normalizeListing({ ...page.listings[0], source: "autoscoutfr" }, 0);
  assert.equal(vat.priceType, "vat");
  assert.equal(vat.netPrice, Math.round(16990 / 1.2));
  assert.equal(normalizeListing({ ...page.listings[1], source: "autoscoutfr" }, 1).priceType, "margin");
});

test("not read ≠ 0 offers: a page without the result list throws, an empty list is 0", () => {
  assert.throws(() => AS.parseSearchPage("<html><title>Consent</title></html>"), /not a result page/);
  assert.equal(AS.parseSearchPage(autoscoutPage([], 0)).total, 0);
  assert.throws(() => parseOtomotoPage("<html>captcha</html>"), /not a result page/);
  const otomotoEmpty = `<script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { urqlState: { 1: { data: JSON.stringify({ advertSearch: { totalCount: 0, edges: [] } }) } } } } })}</script>`;
  assert.deepEqual(parseOtomotoPage(otomotoEmpty), { total: 0, listings: [] });
  assert.throws(() => KA.parsePage("<html>Ihr IP-Bereich vorübergehend gesperrt</html>"), /blocked/);
  assert.throws(() => KA.parsePage("<html>nothing</html>"), /not a result page/);
  assert.equal(KA.parsePage('<script>{"onsite_search_total_results":"0"}</script>').total, 0);
  assert.throws(() => PV.parsePage("<html>Attention Required</html>"), /not a result page/);
  assert.equal(PV.parsePage("<h1>0 annonces</h1>").total, 0);
  assert.throws(() => MP.parseListings("marktplaats", { error: "blocked" }), /not a result list/);
  assert.deepEqual(MP.parseListings("marktplaats", { totalResultCount: 0, listings: [] }), []);
});

const kleinanzeigenCard = (id, title, price, date, chips = []) => `<article class="aditem" data-adid="${id}" data-href="/s-anzeige/x/${id}-216-1"><h2><a href="/s-anzeige/x/${id}-216-1">${title}</a></h2>
  <span>12345 Berlin</span><div><span>${date}</span></div>
  <p class="text-title3 font-strong text-secondary">${price} €</p>
  <p>${chips.map((chip) => `<span data-dhl-promotion class="x">${chip}</span>`).join("")}<span data-dhl-promotion>100.000 km</span><span data-dhl-promotion>EZ 05/2019</span></p></article>`;

test("Kleinanzeigen: card dates, pushed-up ads left out, Gesuch and other non-sales out", () => {
  const now = new Date(2026, 9, 10, 20, 0);
  const html = `<script>{"onsite_search_total_results":"6"}</script>
    ${kleinanzeigenCard("3483691712", "VW Golf 7", "12.500", "13.08.2026")}
    ${kleinanzeigenCard("3531264201", "VW Golf 7 GTI", "13.900", "04.10.2026")}
    ${kleinanzeigenCard("3480000000", "VW Golf 7 Variant", "14.000", "Heute, 19:41")}
    ${kleinanzeigenCard("3529375831", "Suche Toyota RAV4", "25.000", "03.10.2026", ["Gesuch"])}
    ${kleinanzeigenCard("3516921027", "Golf 8 R - Leasingübernehmer gesucht", "650", "19.09.2026")}
    ${kleinanzeigenCard("3536982008", "VW Golf 8", "18.000", "Gestern, 17:20")}`;
  const { listings } = KA.parsePage(html, { now });
  assert.deepEqual(listings.map((listing) => listing.id), ["3483691712", "3531264201", "3480000000", "3536982008"]);
  assert.equal(listings[0].listedAt, "2026-08-13");
  assert.equal(listings[1].listedAt, "2026-10-04");
  assert.equal(listings[2].listedAt, "", "an old ad (lower id) dated today was pushed up: no date");
  assert.equal(new Date(listings[3].listedAt).getDate(), 9);
  assert.equal(normalizeListing(listings[1], 0).url, "https://www.kleinanzeigen.de/s-anzeige/x/3531264201-216-1");
});

const marktplaatsItem = (id, extra = {}) => ({
  itemId: id, title: "Volkswagen Golf", vipUrl: `/v/auto-s/volkswagen/${id}-volkswagen-golf`, priceInfo: { priceCents: 1500000, priceType: "FIXED" },
  location: { cityName: "Utrecht", countryAbbreviation: "NL" }, date: "6 okt 26", priorityProduct: "NONE", traits: [],
  attributes: [{ key: "transmission", value: "Handgeschakeld" }, { key: "constructionYear", value: "2019" }, { key: "mileage", value: "90000" }], ...extra,
});

test("Marktplaats / 2dehands: the list date unless pushed up, the seller's country, link", () => {
  const now = new Date(2026, 9, 10, 12, 0);
  assert.equal(MP.listDate("Vandaag", now), "2026-10-10");
  assert.equal(MP.listDate("Eergisteren", now), "2026-10-08");
  assert.equal(MP.listDate("22 mrt 26", now), "2026-03-22");
  assert.equal(MP.listDate("6 févr. 26", now), "2026-02-06");
  assert.equal(MP.listDate("sinds kort", now), "");
  const items = MP.parseListings("dehands", { totalResultCount: 3, listings: [
    marktplaatsItem("m1", { location: { cityName: "Gorredijk", abroad: true } }),
    marktplaatsItem("m2", { location: { cityName: "Gent", countryAbbreviation: "BE" }, date: "Vandaag", priorityProduct: "DAGTOPPER", traits: ["DAG_TOPPER"] }),
    marktplaatsItem("m3", { location: { cityName: "Antwerpen" } }),
  ] }, { now });
  assert.deepEqual(items.map((item) => item.country), ["NL", "BE", "BE"]);
  assert.deepEqual(items.map((item) => item.listedAt), ["2026-10-06", "", "2026-10-06"]);
  const listing = normalizeListing(items[0], 0);
  assert.equal(listing.url, "https://www.2dehands.be/v/auto-s/volkswagen/m1-volkswagen-golf");
  assert.equal(listing.gearbox, "manual");
  assert.equal(listing.listedAt, "2026-10-06");
});
