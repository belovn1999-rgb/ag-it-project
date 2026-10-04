import { mkdir, writeFile } from "node:fs/promises";

const WALUTOMAT_URL = "https://www.walutomat.pl/kursy-walut/";
const WALUTOMAT_API_URL = "https://api.walutomat.pl/api/v2.0.0/market_fx/best_offers";
const OUTPUT_PATH = new URL("../data/exchange-rates.json", import.meta.url);

function rounded(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function numberFromOffer(offer, pair) {
  const value = Number(offer?.price);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid Walutomat price for ${pair}`);
  }
  return value;
}

async function loadBestOffer(pair) {
  const url = new URL(WALUTOMAT_API_URL);
  url.searchParams.set("currencyPair", pair);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AUTOGOOD tools exchange-rate updater",
    },
  });

  if (!response.ok) {
    throw new Error(`Walutomat API returned ${response.status} for ${pair}`);
  }

  const data = await response.json();
  if (!data?.success || data?.result?.currencyPair !== pair) {
    throw new Error(`Walutomat API returned invalid response for ${pair}`);
  }

  return data.result;
}

function bestSellRate(offers, pair) {
  const ask = offers?.asks?.[0];
  if (ask) return numberFromOffer(ask, pair);

  const bid = offers?.bids?.[0];
  if (bid) return numberFromOffer(bid, pair);

  throw new Error(`Walutomat API returned no offers for ${pair}`);
}

// Every pair the market analysis converts with (mobile.html, B12): EUR, SEK
// and USD in PLN from Walutomat (best sale offer, the calculator's source),
// EUR, USD and PLN in BYN from the National Bank of Belarus (Belarus turnkey).
// Run every morning by .github/workflows/exchange-rates.yml.
const WALUTOMAT_PAIRS = [["EUR_PLN", "EURPLN", 4], ["SEK_PLN", "SEKPLN", 4], ["USD_PLN", "USDPLN", 4]];
const NBRB_API_URL = "https://api.nbrb.by/exrates/rates/";

async function loadWalutomatRates() {
  const rates = {};
  for (const [key, pair, digits] of WALUTOMAT_PAIRS) {
    rates[key] = rounded(bestSellRate(await loadBestOffer(pair), pair), digits);
  }
  return rates;
}

async function loadNbrbRates() {
  const rates = {};
  let date = "";
  for (const code of ["EUR", "USD", "PLN"]) {
    const response = await fetch(`${NBRB_API_URL}${code}?parammode=2`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`NBRB API returned ${response.status} for ${code}`);
    const data = await response.json();
    const value = Number(data?.Cur_OfficialRate) / (Number(data?.Cur_Scale) || 1);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid NBRB rate for ${code}`);
    rates[`${code}_BYN`] = { label: `${code} - BYN`, value: rounded(value, 4), unit: "BYN" };
    date = String(data.Date || "").slice(0, 10);
  }
  return { source: "NBRB - kurs oficjalny", sourceUrl: "https://www.nbrb.by/statistics/rates/ratesdaily", effectiveDate: date, rates };
}

const rates = await loadWalutomatRates();
// Belarus is optional: without the NBRB the Polish rates still update.
const nbrb = await loadNbrbRates().catch((error) => {
  console.warn(`NBRB skipped: ${error.message}`);
  return null;
});
const today = new Date().toISOString().slice(0, 10);

const data = {
  source: "Walutomat - kurs sprzedaży",
  sourceUrl: WALUTOMAT_URL,
  providerApiUrl: WALUTOMAT_API_URL,
  updatedAt: new Date().toISOString(),
  effectiveDate: today,
  rates: Object.fromEntries(WALUTOMAT_PAIRS.map(([key]) => [key, {
    label: key.replace("_", " - "),
    value: rates[key],
    unit: "PLN",
  }])),
  ...(nbrb ? { nbrb } : {}),
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log(`Updated exchange rates from ${data.source}`);
Object.values(data.rates).forEach((rate) => console.log(`${rate.label}: ${rate.value} ${rate.unit}`));
if (nbrb) Object.values(nbrb.rates).forEach((rate) => console.log(`NBRB ${rate.label}: ${rate.value} ${rate.unit}`));
