// The page's own portal parsers, run outside the browser (M9–M10,
// 2026-10-11): the saved-answer tests (scripts/portal-parsers.test.mjs) and
// the morning health check (scripts/portals/health.mjs) read portals exactly
// as mobile.html does. The search modules are plain browser scripts that
// publish themselves on window; otomoto, Blocket and av.by are read inside
// mobile-market-analysis.js, so those functions are taken out of it by name.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(`../../src/${file}`, import.meta.url), "utf8");

if (!globalThis.window) globalThis.window = globalThis;
if (!globalThis.document) globalThis.document = { querySelector: () => null, querySelectorAll: () => [], documentElement: { lang: "pl" } };
const MODULES = {
  "autoscout-search.js": "AUTOGOOD_AUTOSCOUT",
  "kleinanzeigen-search.js": "AUTOGOOD_KLEINANZEIGEN",
  "marktplaats-search.js": "AUTOGOOD_MARKTPLAATS",
  "paruvendu-search.js": "AUTOGOOD_PARUVENDU",
};
for (const [file, name] of Object.entries(MODULES)) {
  if (!globalThis[name]) vm.runInThisContext(read(file), { filename: file });
}

// One function of the analysis, by name (braces counted).
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in mobile-market-analysis.js`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name}: no end`);
}
const analysis = read("mobile-market-analysis.js");
const inner = ["parseOtomotoPage", "blocketListing", "avbyListing"];
const { parseOtomotoPage, blocketListing, avbyListing } = new Function(`${inner.map((name) => functionSource(analysis, name)).join("\n")}\nreturn { ${inner.join(", ")} };`)();

const AS = globalThis.AUTOGOOD_AUTOSCOUT;
const KA = globalThis.AUTOGOOD_KLEINANZEIGEN;
const MP = globalThis.AUTOGOOD_MARKTPLAATS;
const PV = globalThis.AUTOGOOD_PARUVENDU;

// portal → how its answer is read: { total, listings } as the analysis has it.
// `now` fixes "Heute / Gestern / 3 dagen" dates of a saved answer.
export const PARSERS = {
  autoscout: (body) => AS.parseSearchPage(body, { page: 1 }),
  autoscoutfr: (body) => AS.parseSearchPage(body, { page: 1 }),
  otomoto: (body) => parseOtomotoPage(body),
  kleinanzeigen: (body, { now } = {}) => KA.parsePage(body, { page: 1, now: now || new Date() }),
  paruvendu: (body) => PV.parsePage(body, { page: 1 }),
  marktplaats: (body, { now } = {}) => {
    const data = typeof body === "string" ? JSON.parse(body) : body;
    return { total: Number(data?.totalResultCount) || 0, listings: MP.parseListings("marktplaats", data, { offset: 0, now: now || new Date() }).filter(Boolean) };
  },
  dehands: (body, { now } = {}) => {
    const data = typeof body === "string" ? JSON.parse(body) : body;
    return { total: Number(data?.totalResultCount) || 0, listings: MP.parseListings("dehands", data, { offset: 0, now: now || new Date() }).filter(Boolean) };
  },
  blocket: (body) => {
    const data = typeof body === "string" ? JSON.parse(body) : body;
    if (!Array.isArray(data?.docs)) throw new Error("blocket: not a result list");
    const total = Number(data?.metadata?.result_size?.match_count) || 0;
    return { total, listings: data.docs.map((doc, index) => blocketListing(doc, index + 1, total)).filter(Boolean) };
  },
  avby: (body) => {
    const data = typeof body === "string" ? JSON.parse(body) : body;
    if (!Array.isArray(data?.adverts)) throw new Error("av.by: not a result list");
    const total = Number(data?.count) || 0;
    return { total, listings: data.adverts.map((advert, index) => avbyListing(advert, index + 1, total)).filter(Boolean) };
  },
};

export function parse(portal, body, options = {}) {
  const parser = PARSERS[portal];
  if (!parser) throw new Error(`no parser for ${portal}`);
  return parser(body, options);
}

// What the saved-answer test holds a parser to: the count and the fields of
// each car the manager sees.
export function summary(result) {
  return {
    total: result.total,
    count: result.listings.length,
    listings: result.listings.map((listing) => ({
      price: listing.price,
      currency: listing.currency,
      year: listing.year,
      mileage: listing.mileage,
      power: listing.power || "",
      country: listing.country || "",
      seller: listing.seller || "",
      url: listing.url ? new URL(listing.url).hostname : "",
    })),
  };
}
