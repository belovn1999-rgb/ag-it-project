// "Pod klucz" in Belarus for a car bought in the EU (mobile.de), as the
// Belarusian office's calculator counts it (autogood.by/tools/auto-calculator-from-europe,
// checked against it on 102 cases, 2026-10-03), with the owner's own costs:
// delivery = average transport to Poland (Polish calculator) + Warsaw–Minsk 600 €,
// AUTOGOOD.BY service 825 BYN. The car is priced net when the ad shows a net
// price (export from the EU), otherwise gross. Everything converted at the
// official NBRB rate; the result in USD (av.by's currency).
(() => {
  const NBRB_API = "https://api.nbrb.by/exrates/rates/";
  // BYN for one unit; the NBRB rates of 2026-10-03 until the live ones arrive.
  const FALLBACK_RATES = { EUR: 3.386, USD: 3.0051, PLN: 0.795 };

  const COSTS = {
    warsawMinskEur: 600,
    // BYN, fixed per car (autogood.by calculation, owner's AUTOGOOD.BY fee).
    customsFeeByn: 120, // таможенный сбор (0 for electric cars)
    declarantByn: 350, // услуги таможенного декларанта
    storageByn: 110, // услуги склада, as a rule 3 days
    eptsByn: 170, // оформление ЭПТС декларантом
    autogoodByn: 825, // услуги AUTOGOOD.BY
  };
  // Утилизационный сбор (individuals, passenger cars), BYN.
  const RECYCLING_BYN = { under3: 624.92, over3: 1282.02 };

  // Cars 3–5 and over 5 years: € per cm³ by engine size (up to and including).
  const PER_CCM = {
    "3to5": [[1000, 1.5], [1500, 1.7], [1800, 2.5], [2300, 2.7], [3000, 3.0], [Infinity, 3.6]],
    over5: [[1000, 3.0], [1500, 3.2], [1800, 3.5], [2300, 4.8], [3000, 5.0], [Infinity, 5.7]],
  };
  // Cars under 3 years: a share of the price, but at least € per cm³, by price (up to and including).
  const UNDER3 = [[8500, 0.54, 2.5], [16700, 0.48, 3.5], [42300, 0.48, 5.5], [84500, 0.48, 7.5], [169000, 0.48, 15], [Infinity, 0.48, 20]];

  // ---- Rates (NBRB) --------------------------------------------------------------
  let rates = { ...FALLBACK_RATES, date: "", live: false };
  let ratesPromise = null;
  function loadRates() {
    if (!ratesPromise) {
      ratesPromise = Promise.all(["EUR", "USD", "PLN"].map(async (code) => {
        const response = await fetch(`${NBRB_API}${code}?parammode=2`, { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        const value = Number(data?.Cur_OfficialRate) / (Number(data?.Cur_Scale) || 1);
        if (!Number.isFinite(value) || value <= 0) throw new Error(`NBRB ${code}`);
        return [code, value, String(data.Date || "").slice(0, 10)];
      })).then((list) => {
        rates = { ...Object.fromEntries(list.map(([code, value]) => [code, value])), date: list[0][2], live: true };
        return rates;
      }).catch(() => rates);
    }
    return ratesPromise;
  }
  loadRates();

  const convertWith = (table) => (value, from, to) => {
    const byn = from === "BYN" ? value : value * table[from];
    return to === "BYN" ? byn : byn / table[to];
  };
  const convert = (value, from, to) => convertWith(rates)(value, from, to);

  // ---- Age and duty ------------------------------------------------------------
  // Age at import from the production (or first registration) date; with the
  // year only, the middle of that year.
  function ageGroup(year, month = 0, now = new Date()) {
    const y = Number(year);
    if (!Number.isFinite(y) || y < 1900) return null;
    const produced = new Date(y, (Number(month) || 7) - 1, 1);
    const years = (now - produced) / (365.25 * 24 * 3600 * 1000);
    if (years < 3) return "under3";
    return years <= 5 ? "3to5" : "over5";
  }

  function dutyEur({ priceEur, ccm, age, electric = false }) {
    if (electric) return 0;
    const volume = Number(ccm) || 0;
    if (!volume || !age) return null;
    if (age === "under3") {
      const [, share, minimum] = UNDER3.find(([limit]) => priceEur <= limit);
      return Math.max(priceEur * share, volume * minimum);
    }
    const [, rate] = PER_CCM[age].find(([limit]) => volume <= limit);
    return volume * rate;
  }

  // ---- The calculation -----------------------------------------------------------
  // listing: { priceEur (gross), netEur (if the ad shows it), ccm, year, month, electric }
  // options: { benefit: Указ №140, 50% of the duty; deliveryPolandPln;
  //   for checks against autogood.by: rates, deliveryEur, autogoodByn }
  function turnkeyBelarus(listing, options = {}) {
    const table = options.rates || rates;
    const conv = convertWith(table);
    const age = ageGroup(listing.year, listing.month, options.now);
    const net = Number(listing.netEur) > 0 && Number(listing.netEur) < Number(listing.priceEur) * 1.001;
    const carEur = net ? Number(listing.netEur) : Number(listing.priceEur);
    if (!carEur || !age) return null;
    const electric = Boolean(listing.electric);
    const fullDuty = dutyEur({ priceEur: carEur, ccm: listing.ccm, age, electric });
    if (fullDuty === null) return null;
    const duty = options.benefit ? fullDuty / 2 : fullDuty;
    const deliveryPolandPln = options.deliveryPolandPln ?? window.AUTOGOOD_TURNKEY?.AVERAGE_TRANSPORT_NETTO ?? 2500;
    const deliveryEur = options.deliveryEur ?? conv(deliveryPolandPln, "PLN", "EUR") + COSTS.warsawMinskEur;
    const recyclingByn = age === "under3" ? RECYCLING_BYN.under3 : RECYCLING_BYN.over3;
    const feesByn = recyclingByn + (electric ? 0 : COSTS.customsFeeByn) + COSTS.declarantByn
      + COSTS.storageByn + COSTS.eptsByn + (options.autogoodByn ?? COSTS.autogoodByn);
    const totalEur = carEur + deliveryEur + duty + conv(feesByn, "BYN", "EUR");
    const totalUsd = conv(totalEur, "EUR", "USD");
    // The same car with the 50% benefit (shown as a footnote).
    const benefitSavingUsd = options.benefit ? 0 : conv(fullDuty / 2, "EUR", "USD");
    return {
      totalEur,
      totalUsd,
      base: net ? "netto" : "brutto",
      age,
      electric,
      benefitSavingUsd,
      parts: {
        carEur,
        deliveryEur,
        dutyEur: duty,
        recyclingByn,
        feesByn,
      },
      rates: { ...table },
    };
  }

  window.AUTOGOOD_TURNKEY_BY = {
    calc: turnkeyBelarus,
    dutyEur,
    ageGroup,
    rates: () => ({ ...rates }),
    ready: loadRates,
    convert,
    COSTS,
    RECYCLING_BYN,
  };
})();
