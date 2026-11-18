// Сравнение: калькулятор сайта (lib/calculator.ts) и калькулятор платформы (App\Calculator\Calculator) на одних входах.
import { calculate, countryCodes, tariffs } from "/Users/nikitq/cloude/autogood-site/site/lib/calculator.ts";
import { roundTo } from "/Users/nikitq/cloude/autogood-site/site/lib/calc-rounding.ts";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const mode = process.argv[2] ?? "noreg"; // noreg — без регистрации; full — как есть (сайт 160, платформа по флагу)
const rate = 4.25;
const prices = [5000, 12345, 20000, 47500, 120000];
const iso: Record<string, string> = { de: "DE", nl: "NL", be: "BE", cz: "CZ", se: "SE", at: "AT", bs: "LT", fp: "FR", fr: "FR", it: "IT", is: "ES", eu: "LT" };
const engineClass = (fuel: number, cap: number) => {
  if (fuel <= 1) return cap === 0 ? 3 : 4;
  if (fuel <= 3) return cap === 0 ? 2 : 1;
  if (fuel === 4) return cap === 0 ? 0 : 1;
  return 0;
};
const cases: any[] = [];
for (const country of countryCodes) for (const net of [true, false]) for (let fuel = 0; fuel <= 6; fuel++) for (let cap = 0; cap <= 2; cap++)
  for (const insp of [true, false]) for (const price of prices) {
    const t = tariffs[country];
    cases.push({
      site: { country, priceEur: price, net, fuel, capacity: cap, inspection: insp },
      platform: { scenario: net ? "dealer.vat.standard" : "seller", rate, engine_class: engineClass(fuel, cap), country: iso[country], seller_vat: t.vat,
        fields: { car_eur: price, inspection: insp ? t.inspection : 0, transport: t.delivery }, flags: { registration: mode === "full" } },
    });
  }
const out = JSON.parse(execFileSync("/Users/nikitq/cloude/.tools/php-common/php", [new URL("./platform.php", import.meta.url).pathname], { input: JSON.stringify(cases.map(c => c.platform)), maxBuffer: 1 << 28 }).toString());
let same = 0; const diffs: any[] = [];
cases.forEach((c, i) => {
  const s = calculate(c.site, rate);
  const siteExact = mode === "full" ? s.totalPln : s.totalPln - s.registration;
  const p = out[i];
  const d = Math.round((p.exact - siteExact) * 100) / 100;
  const roundedSite = roundTo(siteExact, 50), roundedPlat = p.total;
  if (Math.abs(d) < 0.015 && roundedSite === roundedPlat) same++; else diffs.push({ ...c.site, siteExact: Math.round(siteExact * 100) / 100, platExact: p.exact, diff: d, roundedSite, roundedPlat });
});
writeFileSync(new URL(`./diffs-${mode}.json`, import.meta.url).pathname, JSON.stringify(diffs, null, 1));
console.log(`${mode}: случаев ${cases.length}, совпало ${same}, расхождений ${diffs.length}`);
const groups: Record<string, number> = {};
for (const d of diffs) { const k = `net=${d.net} fuel=${d.fuel} cap=${d.capacity}`; groups[k] = (groups[k] ?? 0) + 1; }
console.log(groups);
console.log(diffs.slice(0, 4));
