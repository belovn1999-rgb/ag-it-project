/* AUTOGOOD "Oferta dla klienta" (B71, owner 2026-10-06): the same car on
 * Carvago — how long it has been for sale, how its price moved, how many
 * similar cars are offered across Europe.
 *
 * Carvago (carvago.com/pl) indexes the ads of mobile.de, AutoScout24, otomoto
 * and others and keeps each ad's price history. It is also a competitor that
 * sells imported cars: its prices carry its own margin and the buyer
 * country's VAT. So the offer never shows Carvago's name or prices — only the
 * dates, the size of each price change (in %) and the count; the manager sees
 * the Carvago link in the panel.
 *
 * Found 1:1: the make, the first-registration year and the exact mileage
 * (`registration-date-from/to`, `mileage-from/to`), then the ad's own number
 * (`mobile_de-<id>`, `autoscout24-<uuid>`) or, failing that, the model and the
 * nearest price. Pages are read through the reader proxy (market-proxy-queue.js,
 * __NEXT_DATA__ of the page): search, the car's page (`priceHistoryData`),
 * and the similar-cars search for the count. 2–3 requests per offer.
 *
 * window.AUTOGOOD_OFFER_CARVAGO.find({ brand, model, year, mileage, source,
 * url, adKey, price, kmFrom, kmTo, yearFrom, yearTo }) → result | null
 */
(() => {
  const BASE = "https://carvago.com/pl";
  const root = typeof window !== "undefined" ? window : globalThis;
  const proxy = () => root.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const plain = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = (value) => plain(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  async function page(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(`Carvago ${response.status}`);
    const raw = (await response.text()).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!raw) throw new Error("Carvago: no page data");
    return JSON.parse(raw[1])?.props?.pageProps || {};
  }

  // The ad's own number as Carvago writes it.
  function externalId(source, url, adKey) {
    const key = String(adKey || "");
    if (source === "mobile") {
      const id = key.startsWith("mobile:") ? key.slice(7) : String(url || "").match(/[?&]id=(\d+)|\/(\d+)\.html/)?.slice(1).find(Boolean);
      return id ? `mobile_de-${id}` : "";
    }
    if (source === "autoscout" || source === "autoscoutfr") {
      const uuid = String(url || "").match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
      return uuid ? `autoscout24-${uuid.toLowerCase()}` : "";
    }
    return "";
  }

  function pick(cars, { source, url, adKey, model, price }) {
    if (!cars.length) return null;
    const wanted = externalId(source, url, adKey);
    const exact = wanted && cars.find((car) => String(car.external_id || "").toLowerCase() === wanted.toLowerCase());
    if (exact) return { car: exact, by: "id" };
    // No number to match: the same model, then the nearest price (Carvago's
    // price is a little higher than the dealer's).
    const sameModel = cars.filter((car) => plain(car.model?.label).replace(/[^a-z0-9]/g, "") && plain(model).replace(/[^a-z0-9]/g, "").includes(plain(car.model?.label).replace(/[^a-z0-9]/g, "")));
    const pool = sameModel.length ? sameModel : [];
    if (pool.length === 1) return { car: pool[0], by: "model" };
    return null;
  }

  // Price changes of more than half a percent (smaller ones are rounding or
  // exchange rate), oldest first.
  function changes(history) {
    const points = (history || [])
      .map((item) => ({ at: String(item.created_at || ""), price: Number(item.price) || 0 }))
      .filter((item) => item.at && item.price > 0)
      .sort((left, right) => left.at.localeCompare(right.at));
    const result = [];
    for (let index = 1; index < points.length; index += 1) {
      const before = points[index - 1].price;
      const share = points[index].price / before - 1;
      if (Math.abs(share) >= 0.005) result.push({ at: points[index].at, share });
    }
    return { points, changes: result };
  }

  async function find(input) {
    const year = Number(String(input.year || "").match(/(\d{4})/)?.[1]) || 0;
    const km = Math.round(Number(input.mileage) || 0);
    const make = slug(input.brand);
    if (!make || !year || !km) return null;
    const query = new URLSearchParams({ "registration-date-from": String(year), "registration-date-to": String(year), "mileage-from": String(km), "mileage-to": String(km) });
    const search = await page(`${BASE}/samochody/${make}?${query.toString()}`);
    const found = pick(search.searchResults?.cars || [], input);
    if (!found) return { found: false, searched: `${BASE}/samochody/${make}?${query.toString()}` };
    const { car } = found;
    const carUrl = `${BASE}/samochod/${car.id}/${car.slug}`;
    let detail = null;
    try {
      detail = await page(carUrl);
    } catch {
      detail = null;
    }
    const history = changes(detail?.priceHistoryData || []);
    // Similar cars on sale now: the same model, the years and mileage of the
    // offer's market comparison (or year ±1, mileage ±35 %).
    let active = null;
    const modelSlug = slug(car.model?.label);
    if (modelSlug) {
      const span = Math.max(20000, km * 0.35);
      const similar = new URLSearchParams({
        "registration-date-from": String(input.yearFrom || year - 1),
        "registration-date-to": String(input.yearTo || year + 1),
        "mileage-from": String(Math.max(0, Math.round(input.kmFrom ?? km - span))),
        "mileage-to": String(Math.round(input.kmTo ?? km + span)),
      });
      try {
        const result = await page(`${BASE}/samochody/${make}/${modelSlug}?${similar.toString()}`);
        // A model Carvago does not know sends the search back to the make.
        const filters = result.routerState?.query?.filters || [];
        if (filters.length >= 2 && Number.isFinite(Number(result.searchResults?.total))) {
          active = { count: Number(result.searchResults.total), yearFrom: Number(similar.get("registration-date-from")), yearTo: Number(similar.get("registration-date-to")), kmFrom: Number(similar.get("mileage-from")), kmTo: Number(similar.get("mileage-to")), kind: "search" };
        }
      } catch {
        active = null;
      }
    }
    if (!active && Number(car.price_score?.similar_cars_count) > 0) active = { count: Number(car.price_score.similar_cars_count), kind: "similar" };
    return {
      found: true,
      by: found.by,
      id: String(car.id),
      url: carUrl,
      readAt: new Date().toISOString(),
      // When the ad appeared (the portal's date when Carvago knows it).
      listedSince: String(car.source_created_at || car.first_crawl || "").slice(0, 10),
      status: String(car.status || ""),
      history: history.points.map((point) => ({ at: point.at.slice(0, 10), price: point.price })),
      changes: history.changes.map((change) => ({ at: change.at.slice(0, 10), share: change.share })),
      active,
    };
  }

  root.AUTOGOOD_OFFER_CARVAGO = { find, externalId, changes };
})();
