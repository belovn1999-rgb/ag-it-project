#!/usr/bin/env node
// Saves one real answer of every portal as a test fixture (M10, 2026-10-11;
// idea of deal-finder's tests/fixtures and used-car-deal-finder's
// anonymize-fixture). Run by hand when a portal changes its page:
//
//   node scripts/portals/capture-fixtures.mjs            # all portals
//   node scripts/portals/capture-fixtures.mjs otomoto    # one
//
// Only what our parser reads is kept (the __NEXT_DATA__ / API JSON / the
// listing cards), only the first 4 cars, and nothing that names a seller:
// names → "Dealer A", phones, e-mails, streets, web sites, logos → stand-ins,
// postal codes cut to their first 2 digits. The parsed result goes to
// expected.json, which scripts/portal-parsers.test.mjs holds the parsers to.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { SEARCHES, fetchSearch } from "./searches.mjs";
import { parse, summary } from "./parsers.mjs";

const DIR = new URL("../fixtures/portals/", import.meta.url);
const KEEP = 4;
mkdirSync(DIR, { recursive: true });

const PERSONAL_KEY = /phone|e-?mail|street|contact|company|organi[sz]ation|seller_?name|dealer_?name|first_?name|last_?name|full_?name|web_?site|homepage|imprint|logo|profile|customer_?id|user_?id|vat_?number|whatsapp|viber|telegram/i;
const SELLER_SCOPE = /^(seller|sellers|dealer|contact|contacts|advertiser|owner|customer|user|vendor|account|sellerInformation|sellerLink|organization|organisation)$/i;
const KEEP_IN_SCOPE = /type|kind|segment|country|^is[A-Z_]|^has[A-Z_]|^id$/i;

// Text anywhere (a description, a heading): no e-mails, phones, web sites.
// Addresses (photos, the ad's own link) are left whole — their numbered
// paths ("/advertbig/0000/0001/…") are not phones.
const URL_PART = /(https?:\/\/[^\s"'<>]+)/;
function scrubText(text) {
  return String(text).split(URL_PART).map((part, index) => (index % 2 ? part : part
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "dealer@example.invalid")
    .replace(/(?:\+|\b00)\d{1,3}[ \d/().-]{6,}\d/g, "+00 000 000 000")
    .replace(/\b0\d{2,4}[ /-]\d{3,}(?:[ -]\d{2,6})?\b/g, "000 000 000")
    .replace(/\bwww\.[\w-]+\.[a-z]{2,}\b/gi, "www.example.invalid"))).join("");
}
function postal(value) {
  const text = String(value);
  return text.length >= 2 ? `${text.slice(0, 2)}${"0".repeat(Math.max(0, text.length - 2))}` : text;
}
function fake(key) {
  if (/phone|whatsapp|viber|telegram/i.test(key)) return "+00 000 000 000";
  if (/mail/i.test(key)) return "dealer@example.invalid";
  if (/street|address/i.test(key)) return "Street 1";
  if (/web|homepage|imprint|logo|profile/i.test(key)) return "https://example.invalid/";
  return "Dealer A";
}
function anonymize(value, inScope = false) {
  if (Array.isArray(value)) return value.map((item) => anonymize(item, inScope));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      const scope = inScope || SELLER_SCOPE.test(key);
      if (/zip|postal|postcode/i.test(key) && (typeof item === "string" || typeof item === "number")) return [key, postal(item)];
      if (typeof item === "string" && PERSONAL_KEY.test(key)) return [key, fake(key)];
      if (typeof item === "string" && scope && !KEEP_IN_SCOPE.test(key)) return [key, fake(key)];
      return [key, anonymize(item, scope)];
    }));
  }
  return typeof value === "string" ? scrubText(value) : value;
}

const nextData = (html) => {
  const match = String(html).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("no __NEXT_DATA__");
  return JSON.parse(match[1]);
};
const asPage = (data) => `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script></body></html>\n`;

// portal → the trimmed, anonymous answer (same shape the parser reads).
const TRIM = {
  autoscout: (text) => {
    const data = nextData(text);
    const props = data.props.pageProps;
    return asPage({ props: { pageProps: { numberOfResults: props.numberOfResults, numberOfPages: props.numberOfPages, listings: anonymize((props.listings || []).slice(0, KEEP)) } } });
  },
  otomoto: (text) => {
    const data = nextData(text);
    const state = data.props?.pageProps?.urqlState || {};
    for (const [key, entry] of Object.entries(state)) {
      let parsed;
      try {
        parsed = JSON.parse(entry?.data || "");
      } catch {
        continue;
      }
      const search = parsed?.advertSearch;
      if (!search || !Array.isArray(search.edges)) continue;
      const kept = { advertSearch: { ...anonymize({ ...search, edges: undefined }), totalCount: search.totalCount, edges: anonymize(search.edges.slice(0, KEEP)) } };
      return asPage({ props: { pageProps: { urqlState: { [key]: { data: JSON.stringify(kept) } } } } });
    }
    throw new Error("otomoto: no advertSearch");
  },
  kleinanzeigen: (text) => {
    const total = (text.match(/"onsite_search_total_results":"(\d+)"/) || [])[1] || "0";
    const cards = [...text.matchAll(/<article[\s\S]*?<\/article>/g)].map((match) => match[0]).slice(0, KEEP)
      .map((card) => scrubText(card.replace(/<script[\s\S]*?<\/script>/g, "")).replace(/(<span>\s*)(\d{5})(\s+[^<]+<\/span>)/g, (all, open, code, rest) => `${open}${postal(code)}${rest}`));
    return `<html><body><script>var data={"onsite_search_total_results":"${total}"};</script>\n${cards.join("\n")}\n</body></html>\n`;
  },
  paruvendu: (text) => {
    const count = (text.match(/(\d[\d\s  .]*)\s*annonces?\b/) || [])[0] || "0 annonces";
    const starts = [...text.matchAll(/<div[^>]*class="blocAnnonce[^"]*"[^>]*data-id="(\d+)"/g)].slice(0, KEEP + 1);
    const cards = starts.slice(0, KEEP).map((match, index) => text.slice(match.index, starts[index + 1]?.index ?? match.index + 20000))
      .map((card) => scrubText(card.replace(/<script[\s\S]*?<\/script>/g, ""))
        .replace(/(class="pseudoinfo">\s*)(?!Particulier)[^<]+/g, "$1Dealer A")
        .replace(/\/auto-moto\/pro\/[^"/?]+/g, "/auto-moto/pro/dealer-a")
        .replace(/\((\d{5})\)/g, (all, code) => `(${postal(code)})`));
    return `<html><body><p>${count}</p>\n${cards.join("\n")}\n</body></html>\n`;
  },
  marktplaats: (text) => {
    const data = JSON.parse(text);
    return `${JSON.stringify({ totalResultCount: data.totalResultCount, listings: anonymize((data.listings || []).slice(0, KEEP)) }, null, 1)}\n`;
  },
  blocket: (text) => {
    const data = JSON.parse(text);
    return `${JSON.stringify({ metadata: { result_size: data.metadata?.result_size }, docs: anonymize((data.docs || []).slice(0, KEEP)) }, null, 1)}\n`;
  },
  avby: (text) => {
    const data = JSON.parse(text);
    return `${JSON.stringify({ count: data.count, adverts: anonymize((data.adverts || []).slice(0, KEEP)) }, null, 1)}\n`;
  },
};
TRIM.autoscoutfr = TRIM.autoscout;
TRIM.dehands = TRIM.marktplaats;
const EXT = { marktplaats: "json", dehands: "json", blocket: "json", avby: "json" };

const wanted = process.argv.slice(2);
const expectedFile = new URL("expected.json", DIR);
const expected = existsSync(expectedFile) ? JSON.parse(readFileSync(expectedFile, "utf8")) : {};
const capturedAt = new Date().toISOString();
for (const search of SEARCHES.filter((item) => !wanted.length || wanted.includes(item.portal))) {
  try {
    const { status, text } = await fetchSearch(search);
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const trimmed = TRIM[search.portal](text);
    const file = `${search.portal}.${EXT[search.portal] || "html"}`;
    const result = parse(search.portal, trimmed, { now: new Date(capturedAt) });
    if (!result.listings.length) throw new Error("no car read from the trimmed answer");
    writeFileSync(new URL(file, DIR), trimmed);
    expected[search.portal] = { file, capturedAt, ...summary(result) };
    console.log(`${search.portal}: ${result.listings.length} cars of ${result.total} → ${file}`);
  } catch (error) {
    console.error(`${search.portal}: ${error.message}`);
    process.exitCode = 1;
  }
}
writeFileSync(expectedFile, `${JSON.stringify(expected, null, 2)}\n`);
