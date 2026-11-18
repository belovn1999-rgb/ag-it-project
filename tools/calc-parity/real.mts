// «Как видит менеджер и клиент сегодня»: каждая сторона со своим курсом, своими тарифами и своим набором строк.
import { calculate, countryCodes, tariffs } from "/Users/nikitq/cloude/autogood-site/site/lib/calculator.ts";
import { roundTo } from "/Users/nikitq/cloude/autogood-site/site/lib/calc-rounding.ts";
import { execFileSync } from "node:child_process";
const siteRate = 4.4032;            // НБП mid 17.11.2026 (api.nbp.pl, таблица 223/A/NBP/2026)
const platRate = 4.41 + 0.02;       // Walutomat 18.11 09:30 (сервер, ExchangeRates::walutomatEurPln) + pricing.rate_margin
const iso: Record<string, string> = { de: "DE", nl: "NL", be: "BE", cz: "CZ", se: "SE", at: "AT", bs: "LT", fp: "FR", fr: "FR", it: "IT", is: "ES", eu: "LT" };
const plat: Record<string, [number, number]> = { de: [2500, 1300], nl: [2500, 1500], be: [2500, 1500], cz: [5000, 2500], se: [5000, 2500], at: [5000, 2500], bs: [2000, 1500], fp: [2750, 1800], fr: [3000, 2200], it: [5000, 2500], is: [4500, 2000], eu: [5000, 2500] };
const price = Number(process.argv[2] ?? 20000);
const rows: any[] = []; const cases: any[] = [];
for (const country of countryCodes) for (const net of [true, false]) {
  rows.push({ country, net, site: roundTo(calculate({ country, priceEur: price, net, fuel: 1, capacity: 0, inspection: true }, siteRate).totalPln, 50) });
  cases.push({ scenario: net ? "dealer.vat.standard" : "seller", rate: platRate, engine_class: 3, country: iso[country], seller_vat: tariffs[country].vat,
    fields: { car_eur: price, inspection: plat[country][1], transport: plat[country][0] }, flags: { registration: false } });
}
const out = JSON.parse(execFileSync("/Users/nikitq/cloude/.tools/php-common/php", [new URL("./platform.php", import.meta.url).pathname], { input: JSON.stringify(cases) }).toString());
rows.forEach((r, i) => console.log([r.country, r.net ? "netto" : "brutto", r.site, out[i].total, out[i].total - r.site].join("\t")));
