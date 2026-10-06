// "Razem" without repeats (owner 2026-10-06): a country column with two or
// more portals (Niemcy, Holandia, Belgia, Francja) counts each car once.
// Dealers list the same car on several portals — Opel Astra Kombi 2023:
// mobile.de 149 + AutoScout24 172 = 321 offers, 215 cars. The portals give
// only their counts, so the lists are read in the background (the analysis'
// own reader, quiet) once the counts have settled:
// - every list read whole → the exact number of cars;
// - a list too long to read → an estimate "≈": the main portal's sample is
//   made of runs of neighbours in its price-sorted list, so each run is a
//   whole price band of it; the other portals are counted in price slices
//   and read in the same bands for their share of repeats (see estimate()).
// The same car = the same price and mileage, as in the analysis.
// mobile-page1.js asks for a column's total and draws it (heads, slim bar).
(() => {
  const COLUMN_COUNTRIES = { de: null, nl: ["NL"], be: ["BE"], fr: ["FR"] };
  const NOT_GERMAN = ["NL", "BE", "FR", "PL", "SE", "BY"];
  const SETTLE_MS = 1500;
  const MIN_RUN = 8;
  const MAX_RUNS = 8;
  const TEXT = {
    pl: {
      pending: "Liczę auta bez powtórzeń… Na razie suma ogłoszeń z portali.",
      exact: "Auta bez powtórzeń: to samo auto na kilku portalach (ta sama cena i przebieg) liczone raz. Ogłoszeń na portalach razem: {sum}.",
      estimate: "Szacunek aut bez powtórzeń: listy są za długie, by przeczytać je całe, więc udział powtórzeń policzono w tych samych przedziałach cen. Ogłoszeń na portalach razem: {sum}.",
      failed: "Nie udało się policzyć aut bez powtórzeń ({portal}) — pokazuję sumę ogłoszeń z portali.",
    },
    ru: {
      pending: "Считаю машины без повторов… Пока — сумма объявлений порталов.",
      exact: "Машины без повторов: одна и та же машина на нескольких порталах (та же цена и пробег) считается один раз. Объявлений на порталах всего: {sum}.",
      estimate: "Оценка машин без повторов: списки слишком длинные, чтобы прочитать их целиком, поэтому долю повторов посчитали в тех же диапазонах цен. Объявлений на порталах всего: {sum}.",
      failed: "Не удалось посчитать машины без повторов ({portal}) — показываю сумму объявлений порталов.",
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const format = (value) => new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(value);
  const numberOf = (text) => (/\d/.test(text || "") ? Number(String(text).replace(/\D/g, "")) : null);
  const carKey = (listing) => {
    const mileage = Number(listing.mileage) || 0;
    return mileage ? `${Math.round(Number(listing.price))}|${mileage}` : "";
  };

  const results = new Map(); // signature → { state, value, estimate, sum, portal }
  const timers = new Map(); // column group → timer
  let version = 0;
  const changed = () => {
    version += 1;
    window.AUTOGOOD_PAGE1_TOTALS_REFRESH?.();
  };

  const columnSpec = (column, rows) => {
    const group = column.dataset.marketGroup;
    if (!(group in COLUMN_COUNTRIES) || rows.length < 2 || typeof readManualFields !== "function") return null;
    const counts = rows.map((row) => numberOf(row.querySelector("strong")?.textContent));
    if (counts.some((count) => count === null)) return null;
    const markets = [...new Set(rows.map((row) => row.dataset.market).filter(Boolean))];
    if (markets.length < 2) return null;
    let filters;
    try {
      filters = readManualFields();
    } catch {
      return null;
    }
    if (!filters?.brand || !filters?.model) return null;
    const formCountries = (filters.countries || []).filter(Boolean);
    const countries = COLUMN_COUNTRIES[group] || (formCountries.filter((code) => !NOT_GERMAN.includes(code)).length
      ? formCountries.filter((code) => !NOT_GERMAN.includes(code)) : ["DE"]);
    const { markets: ignoredMarkets, countries: ignoredCountries, ...search } = filters;
    const sum = counts.reduce((total, count) => total + count, 0);
    return {
      group,
      markets,
      countries,
      filters: { ...search, markets, countries },
      sum,
      signature: JSON.stringify([group, markets, countries, counts, search]),
    };
  };

  async function read(filters, priceOverride = null) {
    const provider = window.AUTOGOOD_MOBILE_MARKET_PROVIDER;
    if (!provider?.getListings) throw new Error("no reader");
    return provider.getListings({ filters, pinned: false, quiet: true, priceOverride });
  }

  // Runs of neighbours in the main portal's price-sorted sample.
  function priceRuns(listings) {
    const ranked = listings.filter((listing) => Number(listing.rank) > 0 && Number(listing.price) > 0)
      .sort((a, b) => Number(a.rank) - Number(b.rank));
    const runs = [];
    let run = [];
    ranked.forEach((listing) => {
      if (run.length && Number(listing.rank) !== Number(run[run.length - 1].rank) + 1) {
        runs.push(run);
        run = [];
      }
      run.push(listing);
    });
    if (run.length) runs.push(run);
    const long = runs.filter((items) => items.length >= MIN_RUN);
    if (long.length <= MAX_RUNS) return long;
    return Array.from({ length: MAX_RUNS }, (_, index) => long[Math.round((index * (long.length - 1)) / (MAX_RUNS - 1))]);
  }

  // How many offers a portal has up to a price (one request: its first page
  // or its count, as the analysis' readers read them).
  async function countUpTo(source, spec, to) {
    const price = { from: null, to };
    const filters = spec.filters;
    const proxy = window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
    if (source === "autoscout" || source === "autoscoutfr") {
      const api = window.AUTOGOOD_AUTOSCOUT;
      const countries = source === "autoscoutfr" ? ["FR"] : spec.countries;
      const response = await fetch(`${proxy}${api.buildSearchUrl(filters, { countries, price, page: 1 })}`, { headers: { "x-respond-with": "html" } });
      if (!response.ok) throw new Error(String(response.status));
      return api.parseSearchPage(await response.text(), { page: 1 }).total;
    }
    if (source === "kleinanzeigen") {
      const api = window.AUTOGOOD_KLEINANZEIGEN;
      return api.parsePage(await api.fetchPage(api.buildSearchUrl(filters, { page: 1, price }))).total;
    }
    if (source === "marktplaats" || source === "dehands") {
      const api = window.AUTOGOOD_MARKTPLAATS;
      return Number((await api.fetchJson(api.buildApiUrl(source, filters, { offset: 0, price })))?.totalResultCount) || 0;
    }
    if (source === "paruvendu") {
      const api = window.AUTOGOOD_PARUVENDU;
      const first = api.parsePage(await api.fetchPage(api.buildSearchUrl(filters, { page: 1, price })), { page: 1 });
      return first.total || (first.listings.length ? await api.fetchCount(api.buildCountUrl(filters, { price })) : 0);
    }
    throw new Error(`no count for ${source}`);
  }

  // A long list: the price range is cut where the main portal's sample runs
  // end (its count up to there is the car's place in its list), every other
  // portal is counted up to the same prices. In each slice there are at
  // least as many cars as on its biggest portal; of the smaller one, the
  // share found again on the main portal in the same prices (runs read in
  // full, below) is a repeat. Checked 06.10 on Toyota Corolla from 2019:
  // the extra AutoScout24 cars sat at 29–33 thousand €, which sampled bands
  // alone missed.
  async function estimate(spec, first) {
    const main = spec.markets[0];
    const others = spec.markets.slice(1);
    const mainInfo = first.meta.portals[main];
    const sample = first.filter((listing) => listingSourceOf(listing) === main);
    const runs = priceRuns(sample);
    if (!mainInfo || !runs.length) return null;
    // 1. The repeat share of each other portal, in the main portal's bands.
    const repeats = Object.fromEntries(others.map((source) => [source, { same: 0, smaller: 0 }]));
    for (const run of runs) {
      const prices = run.map((listing) => Number(listing.price));
      const band = { from: Math.floor(Math.min(...prices)), to: Math.ceil(Math.max(...prices)) };
      const known = new Set(run.map(carKey).filter(Boolean));
      const inBand = await read({ ...spec.filters, markets: others }, Object.fromEntries(others.map((source) => [source, band])));
      others.forEach((source) => {
        const portal = inBand.meta?.portals?.[source];
        if (!portal) return;
        const kept = inBand.filter((listing) => listingSourceOf(listing) === source);
        // Its repeats of an earlier portal are already gone from the list.
        const same = portal.read - kept.filter((listing) => !known.has(carKey(listing))).length;
        repeats[source].same += same;
        repeats[source].smaller += Math.min(run.length, portal.read);
      });
    }
    const share = (source) => {
      const { same, smaller } = repeats[source];
      return smaller ? Math.min(1, Math.max(0, same / smaller)) : 0;
    };
    // 2. Slices of the price range and every portal's offers in each.
    const cuts = runs.map((run) => run[run.length - 1])
      .filter((listing, index, list) => index === list.findIndex((other) => Number(other.price) === Number(listing.price)))
      .map((listing) => ({ to: Math.ceil(Number(listing.price)), main: Number(listing.rank) }));
    const counts = {};
    for (const source of others) {
      counts[source] = [];
      for (const cut of cuts) counts[source].push(await countUpTo(source, spec, cut.to));
    }
    let value = 0;
    const slices = cuts.length + 1;
    for (let index = 0; index < slices; index += 1) {
      const upTo = (list, total) => (index < cuts.length ? list[index] : total);
      const before = (list) => (index ? list[index - 1] : 0);
      const mainSlice = Math.max(0, upTo(cuts.map((cut) => cut.main), mainInfo.total) - before(cuts.map((cut) => cut.main)));
      let cars = mainSlice;
      for (const source of others) {
        const total = first.meta.portals[source]?.total || 0;
        const slice = Math.max(0, upTo(counts[source], total) - before(counts[source]));
        cars = Math.max(cars, slice) + Math.min(cars, slice) * (1 - share(source));
      }
      value += cars;
    }
    return Math.round(value >= 1000 ? value / 10 : value) * (value >= 1000 ? 10 : 1);
  }

  function listingSourceOf(listing) {
    return String(listing.source || "").toLowerCase();
  }

  async function compute(spec) {
    const done = (entry) => {
      results.set(spec.signature, { sum: spec.sum, ...entry });
      changed();
    };
    try {
      const first = await read(spec.filters);
      const portals = first.meta?.portals || {};
      const failed = spec.markets.find((source) => !portals[source] && first.meta?.errors?.[source]);
      if (failed) return done({ state: "failed", portal: failed });
      const whole = spec.markets.every((source) => !portals[source] || portals[source].read >= portals[source].total * 0.95);
      if (whole) return done({ state: "ready", value: first.length, estimate: false });
      const value = await estimate(spec, first);
      if (value === null) return done({ state: "failed", portal: spec.markets[0] });
      return done({ state: "ready", value, estimate: true });
    } catch (error) {
      return done({ state: "failed", portal: String(error?.message || error).slice(0, 60) });
    }
  }

  // mobile-page1.js: what a column's "Razem" says (null: the plain sum).
  function forColumn(column, rows) {
    const spec = columnSpec(column, rows);
    if (!spec) return null;
    const text = TEXT[lang()];
    const known = results.get(spec.signature);
    if (known?.state === "ready") {
      return {
        value: `${known.estimate ? "≈ " : ""}${format(known.value)}`,
        title: (known.estimate ? text.estimate : text.exact).replace("{sum}", format(spec.sum)),
        pending: false,
      };
    }
    if (known?.state === "failed") return { value: format(spec.sum), title: text.failed.replace("{portal}", known.portal), pending: false };
    if (!known) {
      results.set(spec.signature, { state: "waiting" });
      clearTimeout(timers.get(spec.group));
      timers.set(spec.group, setTimeout(() => {
        // Still the search on screen after the pause? Then read it.
        const now = columnSpec(column, [...column.querySelectorAll(".mobileSearchCountMarket")]
          .filter((row) => !row.hidden && !row.classList.contains("isOff")));
        if (now?.signature !== spec.signature || document.hidden) {
          results.delete(spec.signature);
          return;
        }
        results.set(spec.signature, { state: "reading" });
        compute(spec);
      }, SETTLE_MS));
    }
    return { value: format(spec.sum), title: text.pending, pending: true };
  }

  // A hidden tab reads nothing; back in view, the waiting columns start.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) changed();
  });

  window.AUTOGOOD_UNIQUE_TOTALS = { forColumn, version: () => version };
})();
