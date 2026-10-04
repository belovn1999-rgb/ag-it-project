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
  // Whole series/classes (page-1 base models "3", "C", "T6") have their own
  // AutoScout slugs; the plain slug is a 404 (checked 2026-10-03). AutoScout's
  // "T6 (alle)" line also holds T5 and T7 vans: an approximate match.
  const MODEL_SLUG = {
    bmw: { 1: "1er", 2: "2er", 3: "3er", 4: "4er", 5: "5er", 6: "6er", 7: "7er", 8: "8er" },
    "mercedes-benz": {
      a: "a-klasse", b: "b-klasse", c: "c-klasse", e: "e-klasse", g: "g-klasse", s: "s-klasse", v: "v-klasse",
    },
    toyota: { "rav-4": "rav4" },
    volkswagen: { t5: "t6-alle", t6: "t6-alle", t7: "t6-alle" },
  };
  const modelSlug = (brand, model) => {
    const value = slug(model);
    return MODEL_SLUG[slug(brand)]?.[value] || value;
  };

  // What the search cannot carry over (shown as "not transferred").
  function unsupported(filters = {}) {
    const missing = [];
    if (filters.drive && filters.drive !== "any") missing.push("drive");
    if (filters.version) missing.push("version");
    if ((filters.fuels || []).includes("plugin")) missing.push("plugin≈hybrid");
    // No accident-free filter (only "damaged: exclude", always sent).
    if (filters.accidentFree) missing.push(window.AUTOGOOD_SPEC_COPY?.()?.accidentFreeLabel || "accident-free");
    return missing;
  }

  // filters: the page-1 form; countries: ISO codes; price: {from, to} in EUR
  // replacing the page-1 price; sort by price, cheapest first unless desc.
  function buildSearchUrl(filters = {}, { countries = ["DE"], price = null, desc = false, page = 1 } = {}) {
    const path = ["lst", slug(filters.brand), modelSlug(filters.brand, filters.model)].filter(Boolean).join("/");
    const url = new URL(`${BASE}/${path}`);
    const params = url.searchParams;
    params.set("atype", "C");
    params.set("cy", countries.map((code) => COUNTRY[code] || code).join(","));
    params.set("damaged_listing", "exclude");
    if (filters.firstOwner) params.set("prevownersid", "1");
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
    // powerfrom/powerto are always kW: "powertype" only changes how the page
    // shows power (checked 2026-10-04: powertype=hp&powerfrom=122&powerto=122
    // found 0 Passats, powerfrom=90&powerto=90 found the 122 PS ones). The
    // form's PS go over as kW, rounded outwards (122 PS = 89.7 kW → 89–90).
    if (filters.powerUnit === "kw") {
      params.set("powertype", "kw");
      range("powerfrom", "powerto", filters.powerKwFrom, filters.powerKwTo);
    } else if (digits(filters.powerFrom) || digits(filters.powerTo)) {
      params.set("powertype", "hp");
      const kw = (hp, round) => (digits(hp) ? String(round(Number(digits(hp)) * 0.73549875)) : "");
      range("powerfrom", "powerto", kw(filters.powerFrom, Math.floor), String(filters.powerTo || "").trim().endsWith("+") ? "" : kw(filters.powerTo, Math.ceil));
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
        // "10-2019" / "10/2019": the month decides the car's age for customs (Belarus).
        firstRegistration: (String(item.tracking?.firstRegistration || detail("calendar")).match(/(\d{1,2})[-/]((?:19|20)\d{2})/) || []).slice(1).join("/"),
        // "1.968 cm³" in the result list itself: the engine size for the duty.
        displacementCcm: Number(digits(item.vehicle?.engineDisplacementInCCM)) || null,
        mileage: Number(item.tracking?.mileage) || Number(digits(item.vehicle?.mileageInKm)) || "",
        power: detail("speedometer"),
        fuel: String(item.vehicle?.fuel || "").slice(0, 40),
        gearbox: String(item.vehicle?.transmission || detail("gearbox") || "").slice(0, 20),
        country: String(item.location?.countryCode || "").toUpperCase(),
        city: String(item.location?.city || "").slice(0, 80),
        postalCode: String(item.location?.zip || "").slice(0, 12),
        seller: item.seller?.type === "Dealer" ? "dealer" : item.seller?.type ? "private" : "",
        // "inkl. MwSt." with footnote 1 = VAT deductible (every result of a
        // vatded=true search carries it, 2026-10-03).
        vatDeductible: Boolean(item.price?.vatLabel && item.price?.priceSuperscriptString),
        // "Super Deal": AutoScout24 shows the price before the reduction
        // ("€ 12.950,-" beside € 12.500, checked 2026-10-04).
        oldPrice: Number(digits(item.superDeal?.isEligible ? item.superDeal.oldPriceFormatted : item.price?.oldSuperDealPrice)) || "",
        make: String(item.vehicle?.make || ""),
        model: String(item.vehicle?.model || ""),
        rank: all ? (desc ? all - position + 1 : position) : position,
        marketTotal: all,
      };
    }).filter(Boolean);
    return { total, pages: Number(props.numberOfPages) || Math.ceil(total / PAGE_SIZE), listings };
  }

  // ---- Page 1: live count and the search link -----------------------------
  const TEXT = {
    pl: { search: "Szukaj na AutoScout24", opening: "Otwieram AutoScout24 (wszystkie ogłoszenia; w analizie — tylko te, których nie ma na mobile.de).", skipped: "AutoScout24 nie przyjmie filtrów: {filters}.", countTitle: "Wszystkie ogłoszenia na AutoScout24 (razem z tymi, które są też na mobile.de)" },
    ru: { search: "Искать на AutoScout24", opening: "Открываю AutoScout24 (все объявления; в анализе — только те, которых нет на mobile.de).", skipped: "AutoScout24 не примет фильтры: {filters}.", countTitle: "Все объявления на AutoScout24 (вместе с теми, что есть и на mobile.de)" },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const countries = (filters) => (filters.countries && filters.countries.length ? filters.countries : ["DE"]);
  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const counts = new Map();
  let countRequest = 0;

  async function refreshCount(filters) {
    const target = document.querySelector("[data-mobile-search-count-autoscout]");
    if (!target) return;
    target.title = TEXT[lang()].countTitle;
    if (!filters?.brand || !filters?.model) {
      target.textContent = "—";
      return;
    }
    const url = buildSearchUrl(filters, { countries: countries(filters) });
    if (counts.has(url)) {
      target.textContent = counts.get(url);
      return;
    }
    const request = ++countRequest;
    target.textContent = "…";
    try {
      const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
      if (!response.ok) throw new Error(String(response.status));
      const label = new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(parseSearchPage(await response.text()).total);
      counts.set(url, label);
      if (request === countRequest) target.textContent = label;
    } catch {
      if (request === countRequest) target.textContent = "—";
    }
  }

  document.querySelectorAll("[data-mobile-autoscout-search]").forEach((link) => link.addEventListener("click", (event) => {
    try {
      const filters = readManualFields();
      const url = buildSearchUrl(filters, { countries: countries(filters) });
      link.href = url;
      window.AUTOGOOD_MOBILE_LOG_SEARCH?.(url);
      const skipped = unsupported(filters);
      setMarketSearchStatus(skipped.length ? TEXT[lang()].skipped.replace("{filters}", skipped.join(", ")) : TEXT[lang()].opening);
    } catch (error) {
      event.preventDefault();
      link.href = "#";
      setMarketSearchStatus(error.message || "AutoScout24", true);
    }
  }));
  document.querySelectorAll("[data-mobile-autoscout-search]").forEach((node) => {
    node.setAttribute("aria-label", TEXT[lang()].search);
    node.title = TEXT[lang()].search;
  });
  window.AUTOGOOD_AUTOSCOUT_REFRESH_COUNT = refreshCount;

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
