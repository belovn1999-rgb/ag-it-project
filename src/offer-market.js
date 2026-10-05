/* AUTOGOOD "Oferta dla klienta" (B71, owner 2026-10-05): the market around
 * one offer, from the Monitoring checks this browser keeps (IndexedDB
 * autogood-mobile-check-offers, see docs/OFFER-PAGE.md).
 *
 * Pure functions — no page, no storage — so scripts/offer-market.test.mjs can
 * run them. window.AUTOGOOD_OFFER_MARKET:
 * - findOffer(records, key) — the newest check holding the ad;
 * - snapshot(records, key, options) — everything the offer page shows about
 *   the market, frozen on the day the offer is made:
 *   the ad's own market (same country, mobile.de / AutoScout24 / … in EUR):
 *   count, P25, median, P75, the car's place ("cheaper than N %"), the
 *   similar cars (year ±1, mileage ±35 %); Poland (otomoto, PLN) against the
 *   car's turnkey price; how long the car is listed and its price drops, and
 *   how often prices drop on this market.
 * Offers marked "suspect" by the analysis (damaged, bait prices) are left out,
 * as in the statistics of page 2.
 */
(() => {
  const EUR_SOURCES = ["mobile", "autoscout", "kleinanzeigen", "autoscoutfr", "paruvendu", "marktplaats", "dehands"];
  // Portals of one country carry no country of their own in the checks.
  const SOURCE_COUNTRY = { kleinanzeigen: "DE", autoscoutfr: "FR", paruvendu: "FR", marktplaats: "NL", dehands: "BE" };
  const NEGOTIATION_DAYS = 30;
  // A market narrower than this is too thin to speak for: the offer widens
  // it (all countries of the check) or says nothing.
  const MIN_MARKET = 8;
  const MIN_SIMILAR = 6;
  const DAY = 86400000;

  const countryOf = (source, offer) => String(offer?.country || SOURCE_COUNTRY[source] || "").toUpperCase();

  function percentile(sorted, share) {
    if (!sorted.length) return 0;
    const index = (sorted.length - 1) * share;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function summary(values) {
    const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!sorted.length) return null;
    return {
      count: sorted.length,
      min: sorted[0],
      p25: Math.round(percentile(sorted, 0.25)),
      median: Math.round(percentile(sorted, 0.5)),
      p75: Math.round(percentile(sorted, 0.75)),
      max: sorted[sorted.length - 1],
    };
  }

  // Share of the pool dearer than the price ("tańsze niż 81 % ofert").
  function dearerShare(prices, price) {
    if (!prices.length || !(price > 0)) return null;
    return prices.filter((value) => value > price).length / prices.length;
  }

  const byDate = (records) => [...records].sort((left, right) => String(left.at).localeCompare(String(right.at)));
  const offersOf = (record, extra = false) => Object.entries({
    ...(record?.markets || {}),
  }).flatMap(([source, market]) => (market?.offers || []).map((offer) => ({ source, offer })))
    .concat(extra ? Object.entries(record?.extra?.markets || {}).flatMap(([source, market]) => (market?.offers || []).map((offer) => ({ source, offer, extra: true }))) : []);

  // The newest check holding the ad (main lists first, then "Dodatkowe").
  function findOffer(records, key) {
    for (const record of byDate(records).reverse()) {
      const found = offersOf(record, true).find((item) => item.offer?.key === key);
      if (found) return { record, ...found };
    }
    return null;
  }

  // Cars like this one: the same age (±1 year, then ±2) and mileage (±35 %,
  // at least 20 000 km; then ±60 %, at least 30 000 km).
  function similar(pool, car) {
    const year = Number(car.year) || 0;
    const km = Number(car.mileage) || 0;
    if (!year && !km) return null;
    const steps = [[1, 0.35, 20000], [2, 0.6, 30000]];
    for (const [years, share, least] of steps) {
      const span = Math.max(least, km * share);
      const subset = pool.filter(({ offer }) => (!year || (Number(offer.year) && Math.abs(Number(offer.year) - year) <= years))
        && (!km || (Number(offer.mileage) && Math.abs(Number(offer.mileage) - km) <= span)));
      if (subset.length >= MIN_SIMILAR) {
        return {
          rule: {
            yearFrom: year ? year - years : null,
            yearTo: year ? year + years : null,
            kmFrom: km ? Math.max(0, Math.round((km - span) / 1000) * 1000) : null,
            kmTo: km ? Math.round((km + span) / 1000) * 1000 : null,
          },
          items: subset,
        };
      }
    }
    return null;
  }

  const priceOf = ({ offer }) => Number(offer.price) || 0;

  // The ad's own market: offers in euro from the same country, or every
  // country of the check when that country alone is too thin.
  function ownMarket(record, car) {
    const country = countryOf(car.source, car.offer);
    const usable = offersOf(record)
      .filter(({ source }) => EUR_SOURCES.includes(source))
      .filter(({ offer }) => !offer.suspect && Number(offer.price) > 0 && String(offer.currency || "EUR") === String(car.offer.currency || "EUR"));
    let pool = country ? usable.filter(({ source, offer }) => countryOf(source, offer) === country) : usable;
    let scope = country ? "country" : "all";
    if (pool.length < MIN_MARKET) {
      pool = usable;
      scope = "all";
    }
    if (pool.length < 3) return null;
    const prices = pool.map(priceOf);
    const price = Number(car.offer.price) || 0;
    const stats = summary(prices);
    const near = similar(pool, car.offer);
    const nearPrices = near ? near.items.map(priceOf) : [];
    const nearStats = near ? summary(nearPrices) : null;
    return {
      currency: car.offer.currency || "EUR",
      country,
      scope,
      countries: [...new Set(pool.map(({ source, offer }) => countryOf(source, offer)).filter(Boolean))],
      sources: [...new Set(pool.map(({ source }) => source))],
      stats,
      dearerShare: dearerShare(prices, price),
      vsMedian: stats?.median ? price / stats.median - 1 : null,
      similar: near ? {
        rule: near.rule,
        stats: nearStats,
        dearerShare: dearerShare(nearPrices, price),
        vsMedian: nearStats?.median ? price / nearStats.median - 1 : null,
      } : null,
    };
  }

  // Poland: otomoto in the same check (PLN) against the car's turnkey price.
  function polandMarket(record, car, turnkey) {
    const market = record?.markets?.otomoto;
    const pool = (market?.offers || [])
      .filter((offer) => !offer.suspect && Number(offer.price) > 0)
      .map((offer) => ({ source: "otomoto", offer }));
    if (pool.length < 3) return null;
    const stats = summary(pool.map(priceOf));
    const near = similar(pool, car.offer);
    const nearStats = near ? summary(near.items.map(priceOf)) : null;
    // The comparison is made with the cars like this one when there are
    // enough of them, else with the whole search.
    const basis = nearStats ? { kind: "similar", median: nearStats.median, count: nearStats.count } : { kind: "search", median: stats.median, count: stats.count };
    return {
      currency: "PLN",
      total: Number(market.total) || pool.length,
      complete: Boolean(market.complete),
      stats,
      similar: near ? { rule: near.rule, stats: nearStats } : null,
      basis,
      turnkey: turnkey > 0 ? Math.round(turnkey) : null,
      saving: turnkey > 0 ? Math.round(basis.median - turnkey) : null,
    };
  }

  // Every price an ad had in this car's checks, oldest first.
  function pricePaths(records) {
    const paths = new Map();
    byDate(records).forEach((record) => offersOf(record, true).forEach(({ offer }) => {
      const path = paths.get(offer.key) || [];
      if (!path.length || path[path.length - 1].price !== offer.price) path.push({ at: record.at, price: Number(offer.price) || 0 });
      paths.set(offer.key, path);
    }));
    return paths;
  }

  function firstSeen(records) {
    const seen = new Map();
    byDate(records).forEach((record) => offersOf(record, true).forEach(({ offer }) => {
      if (!seen.has(offer.key)) seen.set(offer.key, record.at);
    }));
    return seen;
  }

  // How long the ad is listed and how its price moved (as Monitoring's
  // "Płynność", B22): the portal's own date wins over our first check.
  function adLiquidity(records, offer, now, paths = pricePaths(records), seen = firstSeen(records)) {
    const sorted = byDate(records);
    const listed = offer.listedAt && Number.isFinite(Date.parse(offer.listedAt)) ? offer.listedAt : "";
    const at = seen.get(offer.key) || "";
    const first = sorted[0]?.at || "";
    let since = "";
    let kind = "";
    if (listed && (!at || Date.parse(listed) <= Date.parse(at))) {
      since = listed;
      kind = "listed";
    } else if (at) {
      since = at;
      kind = at === first ? "atLeast" : "seen";
    }
    const path = paths.get(offer.key) || [{ price: Number(offer.price) || 0 }];
    const highest = Math.max(Number(offer.was) || 0, ...path.map((point) => point.price));
    const price = Number(offer.price) || 0;
    const dropped = highest > price;
    const seenDrops = path.filter((point, index) => index && point.price < path[index - 1].price).length;
    const days = since ? Math.max(0, Math.floor((now - Date.parse(since)) / DAY)) : null;
    return {
      since,
      kind,
      days,
      dropped,
      drops: dropped ? Math.max(1, seenDrops + (Number(offer.was) > Number(path[0].price) ? 1 : 0)) : 0,
      from: dropped ? highest : null,
      share: dropped ? (price - highest) / highest : 0,
      negotiable: dropped && days !== null && days >= NEGOTIATION_DAYS,
    };
  }

  // The pace of the market: how long offers stay and how often (and how
  // much) their price drops. Only the ad's own portals and country.
  function marketLiquidity(records, record, car, now) {
    const paths = pricePaths(records);
    const seen = firstSeen(records);
    const country = countryOf(car.source, car.offer);
    const pool = offersOf(record)
      .filter(({ source }) => EUR_SOURCES.includes(source))
      .filter(({ source, offer }) => !offer.suspect && (!country || countryOf(source, offer) === country));
    if (pool.length < MIN_MARKET) return null;
    const infos = pool.map(({ offer }) => adLiquidity(records, offer, now, paths, seen));
    const days = infos.map((info) => info.days).filter((value) => value !== null).sort((a, b) => a - b);
    const drops = infos.filter((info) => info.dropped).map((info) => -info.share).sort((a, b) => a - b);
    return {
      count: pool.length,
      checks: records.length,
      medianDays: days.length ? Math.round(percentile(days, 0.5)) : null,
      daysAtLeast: infos.some((info) => info.kind === "atLeast"),
      droppedShare: drops.length / pool.length,
      medianDrop: drops.length ? percentile(drops, 0.5) : null,
      negotiable: infos.filter((info) => info.negotiable).length,
    };
  }

  function snapshot(records, key, { now = Date.now() } = {}) {
    const found = findOffer(records, key);
    if (!found) return null;
    const car = { source: found.source, offer: found.offer };
    const latest = byDate(records).filter((record) => offersOf(record).some((item) => EUR_SOURCES.includes(item.source) || item.source === "otomoto")).pop() || found.record;
    // The market of the check that holds the ad; Poland from the same one
    // when it read otomoto, else from the newest check that did.
    const polandRecord = found.record.markets?.otomoto ? found.record : byDate(records).filter((record) => record.markets?.otomoto).pop();
    const poland = polandRecord ? polandMarket(polandRecord, car, Number(found.offer.turnkey) || 0) : null;
    return {
      at: found.record.at,
      latestAt: latest.at,
      extra: Boolean(found.extra),
      source: found.source,
      offer: found.offer,
      market: ownMarket(found.record, car),
      poland: poland ? { at: polandRecord.at, ...poland } : null,
      ad: adLiquidity(records, found.offer, now),
      pace: marketLiquidity(records, found.record, car, now),
    };
  }

  const api = { EUR_SOURCES, NEGOTIATION_DAYS, percentile, summary, findOffer, similar, snapshot, adLiquidity, countryOf };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_MARKET = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_MARKET = api;
})();
