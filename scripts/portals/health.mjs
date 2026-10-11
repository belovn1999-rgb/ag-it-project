#!/usr/bin/env node
// Morning check of every portal (M9, 2026-10-11; idea of cenomierz's
// "health" and deal-finder's health_check): the known search of each portal
// (scripts/portals/searches.mjs) is read live, through our Worker as the page
// reads it, and parsed by the page's own parsers. A portal that changed its
// page, refuses us or answers empty fails the run — GitHub then e-mails the
// owner, as it does when CI fails. mobile.de is checked on the Mac (its
// importer), not here.
//
//   node scripts/portals/health.mjs            # all portals
//   node scripts/portals/health.mjs otomoto    # one
import { appendFileSync } from "node:fs";
import { SEARCHES, fetchSearch } from "./searches.mjs";
import { parse } from "./parsers.mjs";

const NAMES = {
  autoscout: "AutoScout24 (DE)", autoscoutfr: "AutoScout24 (FR)", otomoto: "otomoto", kleinanzeigen: "Kleinanzeigen",
  marktplaats: "Marktplaats", dehands: "2dehands", paruvendu: "ParuVendu", blocket: "Blocket", avby: "av.by",
};
const thisYear = new Date().getFullYear();
const share = (cars, test) => (cars.length ? cars.filter(test).length / cars.length : 0);

// What a healthy answer of a known search looks like.
function judge(result) {
  const cars = result.listings;
  const problems = [];
  if (cars.length < 3) problems.push(`only ${cars.length} cars read`);
  if (result.total < cars.length) problems.push(`count ${result.total} < cars read ${cars.length}`);
  if (share(cars, (car) => Number(car.price) >= 300) < 0.9) problems.push("prices missing");
  if (share(cars, (car) => Number(car.year) >= 1990 && Number(car.year) <= thisYear + 1) < 0.8) problems.push("years missing");
  if (share(cars, (car) => /^https:\/\//.test(String(car.url))) < 0.9) problems.push("links missing");
  if (share(cars, (car) => Number(car.mileage) > 0) < 0.6) problems.push("mileage missing");
  return problems;
}

async function check(search) {
  let last = "";
  // One more try after a pause: a single refusal or a slow answer is not a
  // broken portal.
  for (const attempt of [1, 2]) {
    try {
      const { status, text, via } = await fetchSearch(search);
      if (status !== 200) throw new Error(`HTTP ${status}${via ? ` (${via})` : ""}`);
      const result = parse(search.portal, text);
      const problems = judge(result);
      if (!problems.length) return { ok: true, line: `${result.listings.length} cars of ${result.total}${via === "r.jina.ai" ? " (through r.jina.ai)" : ""}` };
      last = problems.join(", ");
    } catch (error) {
      last = String(error?.message || error).slice(0, 160);
    }
    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  return { ok: false, line: last };
}

const wanted = process.argv.slice(2);
const rows = [];
for (const search of SEARCHES.filter((item) => !wanted.length || wanted.includes(item.portal))) {
  const { ok, line } = await check(search);
  rows.push({ portal: NAMES[search.portal] || search.portal, ok, line });
  console.log(`${ok ? "OK  " : "FAIL"} ${NAMES[search.portal] || search.portal}: ${line}`);
}
const failed = rows.filter((row) => !row.ok);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    `## Portale — ${failed.length ? `${failed.length} nie działa` : "wszystkie działają"}`,
    "", "| Portal | Stan | Szczegóły |", "|---|---|---|",
    ...rows.map((row) => `| ${row.portal} | ${row.ok ? "✅" : "❌"} | ${row.line} |`), "",
  ].join("\n"));
}
if (failed.length) {
  console.error(`\n${failed.length} portal(s) not read as expected: ${failed.map((row) => row.portal).join(", ")}`);
  process.exitCode = 1;
}
