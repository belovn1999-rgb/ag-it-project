/* AUTOGOOD turnkey estimate: what a car listed abroad costs registered in
 * Poland for a private buyer, by the same rules as the calculator's
 * "Zakup bezpośredni" (tab 0, `calculate()` in src/main.jsx) and at the same
 * EUR/PLN rate the calculator uses (Walutomat sale rate, the rates file as a
 * fallback).
 *
 * The constants and the formula mirror src/main.jsx — change them together.
 * Delivery / inspection tariffs and the excise class come from mobile.js
 * (estimateDeliveryInspection, classifyEngineType), which already feeds the
 * calculator links.
 */
(() => {
  const VAT = 0.23;
  const DEFAULT_RATE = 4.26;
  const TO_FEE = 150;
  const DOC_TRANSLATION = 250;
  const REGISTRATION_NETTO = 580;
  const STD_FIX = 1829.27;
  // Excise by engine class, same order as the calculator's engineTypes.
  const EXCISE_RATES = [0, 0.093, 0.0155, 0.031, 0.186];
  const WALUTOMAT_API_URL = "https://api.walutomat.pl/api/v2.0.0/market_fx/best_offers";
  // The market analysis prices every foreign offer with average costs
  // (the owner's figures), not the seller's own tariff.
  const AVERAGE_TRANSPORT_NETTO = 2500;
  const AVERAGE_INSPECTION_NETTO = 1500;
  // The calculator adds 0.02 PLN to the live EUR rate (rateWithCalculationMargin
  // in src/main.jsx); SEK gets the same margin in proportion.
  const RATE_MARGIN = 0.02;

  // Turnkey cost of one car (all amounts PLN except carBruttoEur).
  function turnkeyDirect({
    carBruttoEur,
    rate,
    transportNettoPln = 0,
    inspectionNettoPln = 0,
    engineTypeIndex = 3,
    // "Pod klucz" here is without registration (the client registers).
    registration = false,
  }) {
    const useRate = rate > 0 ? rate : DEFAULT_RATE;
    const carPln = (Number(carBruttoEur) || 0) * useRate;
    const inspection = Number(inspectionNettoPln) || 0;
    const transport = Number(transportNettoPln) || 0;
    const exciseRate = EXCISE_RATES[engineTypeIndex] ?? EXCISE_RATES[3];
    const excise = exciseRate * carPln;
    const commissionNetto = STD_FIX + 0.01 * carPln;
    const registrationNetto = registration ? REGISTRATION_NETTO : 0;
    const total = carPln
      + inspection * (1 + VAT)
      + transport * (1 + VAT)
      + excise
      + commissionNetto * (1 + VAT)
      + TO_FEE
      + DOC_TRANSLATION
      + registrationNetto * (1 + VAT);
    return {
      // Shown like the calculator's "Razem": PLN rounded to 50.
      total: Math.round(total / 50) * 50,
      exact: total,
      rate: useRate,
      parts: {
        car: Math.round(carPln),
        inspection: Math.round(inspection * (1 + VAT)),
        transport: Math.round(transport * (1 + VAT)),
        excise: Math.round(excise),
        commission: Math.round(commissionNetto * (1 + VAT)),
        fees: TO_FEE + DOC_TRANSLATION + Math.round(registrationNetto * (1 + VAT)),
      },
    };
  }

  // One offer from a marketplace list: its own seller location, body and
  // engine decide transport, inspection and excise.
  function turnkeyForListing(listing, rate) {
    const location = { country: listing.country || "DE", postalCode: listing.postalCode || "", city: listing.city || "" };
    const estimate = typeof estimateDeliveryInspection === "function"
      ? estimateDeliveryInspection(listing.bodyType || "", location)
      : { transport: 2500, inspection: 1300 };
    const engineTypeIndex = typeof classifyEngineType === "function"
      ? classifyEngineType(`${listing.fuel || ""} ${listing.title || ""}`, listing.displacementCcm)
      : 3;
    const carBruttoEur = listing.currency === "PLN" ? listing.price / (rate || DEFAULT_RATE) : listing.price;
    return turnkeyDirect({
      carBruttoEur,
      rate,
      transportNettoPln: estimate.transport,
      inspectionNettoPln: estimate.inspection,
      engineTypeIndex,
    });
  }

  // Engine class for the excise: the offer's own fuel and engine size, else
  // what the search asks for (fuels, engine size range).
  function engineClassFor(listing = {}, filters = {}) {
    const fuelsWanted = typeof manualFuelValues === "function" ? manualFuelValues(filters) : (filters.fuels || []);
    const own = `${listing.fuel || ""} ${listing.title || ""}`.toLowerCase()
      // Blocket (Swedish): plug-in hybrid, electric, petrol.
      .replace(/laddhybrid/g, "plug-in hybrid")
      .replace(/\bel\b/g, "electric")
      .replace(/bensin/g, "petrol");
    const fuelText = /petrol|diesel|hybrid|electric|elektr|plug|benzin|benzyna|lpg|cng/.test(own) ? own : fuelsWanted.join(" ");
    const from = Number(filters.displacementFrom) || 0;
    const to = Number(filters.displacementTo) || 0;
    const ccm = Number(listing.displacementCcm) || (from > 2000 ? from : to && to <= 2000 ? to : 0);
    return typeof classifyEngineType === "function" ? classifyEngineType(fuelText, ccm) : 3;
  }

  // "~ pod klucz" of a foreign offer in the market analysis: the calculator's
  // formula with the average transport and inspection.
  function turnkeyAverage(listing, filters, rates = currentRates()) {
    const currency = listing.currency || "EUR";
    const pricePln = currency === "PLN" ? listing.price : currency === "SEK" ? listing.price * rates.sek : listing.price * rates.eur;
    return turnkeyDirect({
      carBruttoEur: pricePln / rates.eur,
      rate: rates.eur,
      transportNettoPln: AVERAGE_TRANSPORT_NETTO,
      inspectionNettoPln: AVERAGE_INSPECTION_NETTO,
      engineTypeIndex: engineClassFor(listing, filters),
    });
  }

  // The calculator's rates (with its margin) as known right now.
  function currentRates() {
    const eurRaw = Number(window.AUTOGOOD_EUR_PLN_RAW) || DEFAULT_RATE;
    const eur = Number(window.AUTOGOOD_EXCHANGE_RATES?.rates?.EUR_PLN?.value) || Math.round((eurRaw + RATE_MARGIN) * 100) / 100;
    const sekRaw = Number(window.AUTOGOOD_SEK_PLN_RATE) || 0.385;
    const sek = Math.round(sekRaw * (eur / eurRaw) * 10000) / 10000;
    return { eur, sek, eurRaw, sekRaw };
  }

  // The calculator's rate: Walutomat's best EUR→PLN sale offer right now.
  let ratePromise = null;
  function calculatorRate() {
    if (!ratePromise) {
      ratePromise = (async () => {
        const url = new URL(WALUTOMAT_API_URL);
        url.searchParams.set("currencyPair", "EURPLN");
        const response = await fetch(url, { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        const offer = data?.result?.asks?.[0] || data?.result?.bids?.[0];
        const value = Number(offer?.price);
        if (!Number.isFinite(value) || value <= 0) throw new Error("Walutomat rate unavailable");
        window.AUTOGOOD_EUR_PLN_RAW = value;
        // As in the calculator: live rate + 0.02, rounded to the grosz.
        return { value: Math.round((value + RATE_MARGIN) * 100) / 100, raw: value, updatedAt: data.result.ts || new Date().toISOString(), source: "Walutomat" };
      })().catch(async () => {
        const response = await fetch(`./data/exchange-rates.json?date=${new Date().toISOString().slice(0, 10)}`, { cache: "no-store" });
        const rates = response.ok ? await response.json() : null;
        const raw = Number(rates?.rates?.EUR_PLN?.value) || DEFAULT_RATE;
        window.AUTOGOOD_EUR_PLN_RAW = raw;
        return { value: Math.round((raw + RATE_MARGIN) * 100) / 100, raw, updatedAt: rates?.updatedAt || "", source: rates ? "file" : "default" };
      });
    }
    return ratePromise;
  }

  // The whole page (price filter, chart) uses the calculator's rate once known.
  calculatorRate().then((rate) => {
    window.AUTOGOOD_EXCHANGE_RATES = {
      live: rate.source === "Walutomat",
      // The calculator's rate (with its margin): the rates file never replaces it.
      calculator: true,
      raw: rate.raw,
      source: rate.source,
      updatedAt: rate.updatedAt,
      rates: { EUR_PLN: { label: "EUR - PLN", value: rate.value, unit: "PLN" } },
    };
  });

  window.AUTOGOOD_TURNKEY = {
    turnkeyDirect,
    turnkeyForListing,
    turnkeyAverage,
    engineClassFor,
    currentRates,
    calculatorRate,
    AVERAGE_TRANSPORT_NETTO,
    AVERAGE_INSPECTION_NETTO,
  };
})();
