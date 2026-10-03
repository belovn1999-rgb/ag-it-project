// AutoScout24: the partner of mobile.de on page 3 "Monitoring".
// One database behind every domain (.de/.nl/.be/.at/.lu): checked
// 2026-10-03, the same country searched on .de and on its own domain gives
// the same count (.de even a few more), so one search on autoscout24.de with
// the country filter `cy` covers all of them.
// Filter codes come from the search page's own taxonomy (__NEXT_DATA__);
// every parameter below was checked by the change in the result count.
// Drive (4x4/front/rear) could not be passed: no parameter changed the count.
(() => {
  const BASE = "https://www.autoscout24.de";
  // Monitoring countries (ISO) → AutoScout's own country codes.
  const COUNTRY = { DE: "D", NL: "NL", BE: "B", AT: "A", LU: "L", FR: "F", IT: "I", ES: "E", CZ: "CZ", DK: "DK", SE: "S" };
  const FUEL = { petrol: "B", diesel: "D", hybrid_petrol: "2", hybrid_diesel: "3", electric: "E", plugin: "2" };
  const GEAR = { automatic: "A", manual: "M" };
  const BODY = { hatchback: "1", cabrio: "2", coupe: "3", suv: "4", pickup: "4", estate: "5", limousine: "6", van_minibus: "12", other: "7" };
  const SELLER = { dealer: "D", company: "D", private: "P" };
  const PAGE_SIZE = 20;

  const slug = (text) => String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const digits = (value) => String(value ?? "").replace(/[^\d]/g, "");

  // What the search cannot carry over (shown as "not transferred").
  function unsupported(filters = {}) {
    const missing = [];
    if (filters.drive && filters.drive !== "any") missing.push("drive");
    if (filters.version) missing.push("version");
    if ((filters.fuels || []).includes("plugin")) missing.push("plugin≈hybrid");
    return missing;
  }

  // filters: the page-1 form; countries: ISO codes; price: {from, to} in EUR
  // replacing the page-1 price; sort by price, cheapest first unless desc.
  function buildSearchUrl(filters = {}, { countries = ["DE"], price = null, desc = false, page = 1 } = {}) {
    const path = ["lst", slug(filters.brand), slug(filters.model)].filter(Boolean).join("/");
    const url = new URL(`${BASE}/${path}`);
    const params = url.searchParams;
    params.set("atype", "C");
    params.set("cy", countries.map((code) => COUNTRY[code] || code).join(","));
    params.set("damaged_listing", "exclude");
    params.set("sort", "price");
    params.set("desc", desc ? "1" : "0");
    params.set("ustate", filters.newUsed === "new" ? "N" : filters.newUsed === "used" ? "U" : "N,U");
    const range = (fromKey, toKey, from, to) => {
      if (digits(from)) params.set(fromKey, digits(from));
      if (digits(to) && !String(to).trim().endsWith("+")) params.set(toKey, digits(to));
    };
    range("fregfrom", "fregto", filters.yearFrom, filters.yearTo);
    range("kmfrom", "kmto", filters.mileageFrom, filters.mileageTo);
    if (price) range("pricefrom", "priceto", price.from, price.to);
    else range("pricefrom", "priceto", filters.priceFrom, filters.priceTo);
    if (filters.powerUnit === "kw") {
      params.set("powertype", "kw");
      range("powerfrom", "powerto", filters.powerKwFrom, filters.powerKwTo);
    } else if (digits(filters.powerFrom) || digits(filters.powerTo)) {
      params.set("powertype", "hp");
      range("powerfrom", "powerto", filters.powerFrom, filters.powerTo);
    }
    const fuels = [...new Set((filters.fuels || []).map((fuel) => FUEL[fuel]).filter(Boolean))];
    if (fuels.length) params.set("fuel", fuels.join(","));
    if (GEAR[filters.gearbox]) params.set("gear", GEAR[filters.gearbox]);
    if (BODY[filters.body]) params.set("body", BODY[filters.body]);
    if (SELLER[filters.seller]) params.set("custtype", SELLER[filters.seller]);
    if (page > 1) params.set("page", String(page));
    return url.toString();
  }

  // The offers of one result page (__NEXT_DATA__ of the HTML).
  function parseSearchPage(html, { page = 1, desc = false, total: knownTotal = 0 } = {}) {
    const raw = String(html || "").match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!raw) return { total: 0, pages: 0, listings: [], models: [] };
    const props = JSON.parse(raw[1])?.props?.pageProps || {};
    const total = Number(props.numberOfResults) || 0;
    const listings = (props.listings || []).map((item, index) => {
      const price = Number(item.price?.priceRaw);
      if (!Number.isFinite(price) || price <= 0) return null;
      const detail = (icon) => (item.vehicleDetails || []).find((entry) => entry.iconName === icon)?.data || "";
      const position = (page - 1) * PAGE_SIZE + index + 1;
      const all = knownTotal || total;
      return {
        id: String(item.id || ""),
        url: item.url ? new URL(item.url, BASE).toString() : "",
        title: [item.vehicle?.make, item.vehicle?.model, item.vehicle?.modelVersionInput].filter(Boolean).join(" ").slice(0, 160),
        source: "autoscout",
        price,
        currency: "EUR",
        year: Number(String(item.tracking?.firstRegistration || detail("calendar")).match(/(19|20)\d{2}/)?.[0]) || "",
        mileage: Number(item.tracking?.mileage) || Number(digits(item.vehicle?.mileageInKm)) || "",
        power: detail("speedometer"),
        fuel: String(item.vehicle?.fuel || "").slice(0, 40),
        country: String(item.location?.countryCode || "").toUpperCase(),
        city: String(item.location?.city || "").slice(0, 80),
        postalCode: String(item.location?.zip || "").slice(0, 12),
        seller: item.seller?.type === "Dealer" ? "dealer" : item.seller?.type ? "private" : "",
        // "inkl. MwSt." with footnote 1 = VAT deductible (every result of a
        // vatded=true search carries it, 2026-10-03).
        vatDeductible: Boolean(item.price?.vatLabel && item.price?.priceSuperscriptString),
        make: String(item.vehicle?.make || ""),
        model: String(item.vehicle?.model || ""),
        rank: all ? (desc ? all - position + 1 : position) : position,
        marketTotal: all,
      };
    }).filter(Boolean);
    return { total, pages: Number(props.numberOfPages) || Math.ceil(total / PAGE_SIZE), listings };
  }

  window.AUTOGOOD_AUTOSCOUT = {
    BASE,
    PAGE_SIZE,
    COUNTRY,
    buildSearchUrl,
    parseSearchPage,
    unsupported,
    slug,
  };
})();
