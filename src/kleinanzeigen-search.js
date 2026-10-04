// ---- Kleinanzeigen (DE) ------------------------------------------------------------
// Germany's classifieds: mostly private sellers, whom mobile.de hardly has.
// A second portal of Germany next to mobile.de and AutoScout24: in the
// analysis and Monitoring only its own offers (same price and mileage as a
// mobile.de / AutoScout24 offer = the same car), counted in the row "Niemcy".
// The search lives in the address:
//   /s-autos/<make>/[anbieter:gewerblich/][preis:5000:15000/]sortierung:preis/[seite:2/][<words>/k0]c216
//   +autos.marke_s:<make>+autos.model_s:<model>,<model>+autos.ez_i:2019,2021+…
// (values of one attribute after a comma = "or"; attributes and equipment
// "_b:true" = "and" — checked 2026-10-04). The page is read through the reader
// proxy (no CORS; the site blocks an address that asks too often). At most
// 50 pages of 25 per search and no "dearest first": longer lists are read on
// from the last price seen ("preis:<last>:"), see readKleinanzeigen in
// mobile-market-analysis.js. Loaded after mobile.js and blocket-search.js
// (rangeBounds, manualFuelValues, copy, state, doorRangeBounds, blocket*
// model matching).
(() => {
  const SITE = "https://www.kleinanzeigen.de";
  const PAGE_SIZE = 25;
  const MAX_PAGES = 50;

  const FUEL = { petrol: "benzin", diesel: "diesel", electric: "elektro", hybrid_petrol: "hybrid", hybrid_diesel: "hybrid" };
  const GEARBOX = { automatic: "automatik", manual: "manuell" };
  const BODY = { hatchback: "kleinwagen", estate: "kombi", limousine: "limousine", sedan: "limousine", suv: "suv", pickup: "suv", cabrio: "cabrio", coupe: "coupe", van_minibus: "bus", other: "andere" };
  const DOORS = { 2: "2_3", 3: "2_3", 4: "4_5", 5: "4_5", 6: "6_7", 7: "6_7" };
  const SELLER = { dealer: "gewerblich", company: "gewerblich", private: "privat" };
  const COLOR = { black: "schwarz", grey: "grau", white: "weiß", silver: "silber", blue: "blau", red: "rot", green: "grün", brown: "braun", beige: "beige", yellow: "gelb", orange: "orange", gold: "gold", purple: "violet" };
  const UPHOLSTERY = { alcantara: "alcantara", cloth: "stoff", part_leather: "teilleder", full_leather: "volleder" };
  // Equipment ("_b:true"), every ticked one must be there.
  const OPTIONS = {
    ELECTRIC_HEATED_SEATS: "seat_heating", NAVIGATION_SYSTEM: "navi", ALLOY_WHEELS: "alluminium_rims",
    LED_HEADLIGHTS: "xenon_led_light", XENON_HEADLIGHTS: "xenon_led_light", BI_XENON_HEADLIGHTS: "xenon_led_light",
    PANORAMIC_GLASS_ROOF: "sunroof",
  };
  // Sent, but wider than the form's option: named as approximate.
  const OPTION_APPROX = new Set(["LED_HEADLIGHTS", "XENON_HEADLIGHTS", "BI_XENON_HEADLIGHTS", "PANORAMIC_GLASS_ROOF"]);

  const TEXT = {
    pl: {
      search: "Szukaj na Kleinanzeigen (Niemcy)",
      opening: "Otwieram Kleinanzeigen: od najniższej ceny.",
      skipped: "Kleinanzeigen nie ma dokładnego odpowiednika dla: {filters}. Pozostałe filtry zostały zastosowane.",
      countTitle: "Ogłoszenia na Kleinanzeigen (Niemcy; głównie prywatni sprzedawcy)",
      sensors: "parkowanie (tylko „Einparkhilfe”)",
      climate: "klimatyzacja (tylko „Klimaanlage”)",
      cruise: "tempomat (bez adaptacyjnego)",
      newUsed: "Nowy / używany",
    },
    ru: {
      search: "Искать на Kleinanzeigen (Германия)",
      opening: "Открываю Kleinanzeigen: сначала самые дешёвые.",
      skipped: "В Kleinanzeigen нет точного аналога для: {filters}. Остальные фильтры применены.",
      countTitle: "Объявления на Kleinanzeigen (Германия; в основном частные продавцы)",
      sensors: "парковка (только «Einparkhilfe»)",
      climate: "кондиционер (только «Klimaanlage»)",
      cruise: "круиз (без адаптивного)",
      newUsed: "Новый / б/у",
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");

  // ---- Make and model ----------------------------------------------------------
  function catalogMake(brand) {
    const makes = window.AUTOGOOD_KLEINANZEIGEN_CATALOG?.makes || {};
    const wanted = blocketToken(brand);
    const name = Object.keys(makes).find((candidate) => blocketToken(candidate) === wanted)
      || Object.keys(makes).find((candidate) => blocketToken(makes[candidate].slug) === wanted);
    return name ? { name, ...makes[name] } : null;
  }

  // { makeSlug, slugs, words, broad, unsupported }
  function modelSelection(brand, model, version = "") {
    const cleanModel = String(model || "").trim();
    const cleanVersion = String(version || "").trim();
    const make = brand ? catalogMake(brand) : null;
    if (!brand || !make) return { makeSlug: "", slugs: [], words: [brand, cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: Boolean(brand) };
    const base = { makeSlug: make.slug, slugs: [], words: cleanVersion, broad: false, unsupported: false };
    if (!cleanModel) return base;
    const nodes = make.models.filter((node) => node.slug !== "andere").map((node) => ({ ...node, id: node.slug }));
    const result = (found, broad) => ({ ...base, slugs: [...new Set(found.map((node) => node.slug))], broad });
    const alternatives = blocketModelAlternatives(brand, cleanModel);
    const ourModels = blocketOurModels(brand);
    const separateFor = (name) => ourModels.filter((other) => blocketToken(other).length > blocketToken(name).length && blocketInFamily(other, name));
    // A series: Kleinanzeigen lists BMW and Mercedes by engine ("320", "C 220")
    // next to the series itself ("3er", "C-Klasse"): the series is all of them.
    for (const name of alternatives) {
      const bmw = brand === "BMW" && name.match(/^([1-8])(?:er|\s*serie)?$/i);
      const benz = brand === "Mercedes-Benz" && name.match(/^([A-Z]{1,3})(?:-?\s*klasse)?$/i);
      if (!bmw && !benz) continue;
      const found = bmw
        ? nodes.filter((node) => node.name === `${bmw[1]}er` || new RegExp(`^${bmw[1]}\\d{2}(\\s|$)`).test(node.name))
        : nodes.filter((node) => blocketToken(node.name) === blocketToken(`${benz[1]}-Klasse`) || new RegExp(`^${benz[1]}\\s?\\d{2,3}(\\s|$)`, "i").test(node.name));
      if (found.length) return result(found, false);
    }
    const exact = alternatives.flatMap((name) => blocketFamily(nodes, name, separateFor(name), ourModels));
    if (exact.length) return result(exact, false);
    for (const name of alternatives) {
      const words = blocketWords(name);
      for (let count = words.length - 1; count >= 1; count -= 1) {
        const opener = words.slice(0, count).join(" ");
        if (!nodes.some((node) => blocketToken(node.name) === blocketToken(opener))) continue;
        const family = blocketFamily(nodes, opener, separateFor(opener), ourModels);
        if (family.length) return result(family, true);
      }
    }
    // Not listed: the make, the model as words of the ad.
    return { ...base, words: [cleanModel, cleanVersion].filter(Boolean).join(" "), broad: true };
  }

  // ---- The search ------------------------------------------------------------------
  function searchParts(filters = {}, { price = null } = {}) {
    const c = (typeof copy === "object" && copy[state.lang]) || {};
    const t = TEXT[lang()];
    const skipped = [];
    const skip = (label) => {
      if (label && !skipped.includes(label)) skipped.push(label);
    };
    const optionLabel = (list, value) => {
      const input = (list || []).find((item) => item.value === value);
      return input && typeof optionLabelText === "function" ? optionLabelText(input) : value;
    };
    const selection = modelSelection(filters.brand, filters.model, filters.version);
    if (selection.unsupported) skip(c.brandLabel || "Marka");
    if (selection.broad) skip(c.modelLabel || "Model");
    const attributes = [];
    const set = (key, values) => {
      const list = [...new Set([values].flat().filter(Boolean))];
      if (list.length) attributes.push(`${key}:${list.join(",")}`);
    };
    const fuels = typeof manualFuelValues === "function" ? manualFuelValues(filters) : (filters.fuels || []);
    if (fuels.includes("plugin")) skip("Plug-in (≈ hybryda)");
    set("autos.fuel_s", fuels.map((fuel) => (fuel === "plugin" ? "hybrid" : FUEL[fuel])));
    set("autos.shift_s", GEARBOX[filters.gearbox]);
    set("autos.typ_s", BODY[filters.body]);
    if (filters.body === "pickup") skip(`${c.bodyLabel || "Nadwozie"} ≈`);
    try {
      const doors = typeof doorRangeBounds === "function" ? doorRangeBounds(filters) : { from: null, to: null };
      if (doors.from !== null || doors.to !== null) {
        const values = [];
        for (let count = doors.from ?? 2; count <= (doors.to ?? 7); count += 1) values.push(DOORS[count]);
        if (new Set(values).size < 3) set("autos.anzahl_tueren_s", values);
      }
    } catch {
      // The form reports an invalid door range itself.
    }
    set("autos.material_innenausstattung_s", (filters.interiorMaterials || []).map((material) => UPHOLSTERY[material]));
    // Damaged cars hidden (the form's default): "Unbeschädigtes Fahrzeug" —
    // every ad states it (Golf: 8 196 not damaged + 1 776 damaged = all 9 972).
    if (filters.damagedVehicles !== "show") set("autos.schaden_s", "nein");
    const range = (key, fromValue, toValue) => {
      const { from, to } = typeof rangeBounds === "function" ? rangeBounds(fromValue, toValue) : { from: null, to: null };
      if (from === null && to === null) return;
      attributes.push(`${key}:${from ?? ""},${to ?? ""}`);
    };
    range("autos.ez_i", filters.yearFrom, filters.yearTo);
    range("autos.km_i", filters.mileageFrom, filters.mileageTo);
    // "Leistung" is in PS, like the form.
    range("autos.power_i", filters.powerFrom, filters.powerTo);
    const options = new Set();
    (filters.features || []).forEach((feature) => {
      if (OPTIONS[feature]) options.add(OPTIONS[feature]);
      if (!OPTIONS[feature] || OPTION_APPROX.has(feature)) {
        const label = optionLabel(typeof els === "object" ? els.features : [], feature);
        skip(OPTIONS[feature] ? `${label} ≈` : label);
      }
    });
    if ((filters.parkingSensors || []).length) {
      options.add("park_assistant");
      skip(t.sensors);
    }
    if (filters.airConditioning) {
      options.add("air_conditioning");
      skip(t.climate);
    }
    if (filters.cruiseControl && filters.cruiseControl !== "any") {
      options.add("speed_control");
      if (filters.cruiseControl === "ADAPTIVE_CRUISE_CONTROL") skip(t.cruise);
    }
    if (filters.trailerCoupling && !["any", ""].includes(filters.trailerCoupling)) {
      options.add("trailer_coupling");
      if (filters.trailerCoupling !== "all") skip(`${c.trailerCouplingLabel || "Hak"} ≈`);
    }
    if (filters.nonSmoking) options.add("non_smoking");
    if (filters.serviceHistory) options.add("full_service_history");
    [...options].sort().forEach((option) => attributes.push(`autos.${option}_b:true`));
    const colors = (filters.exteriorColors || []).map((color) => COLOR[color]).filter(Boolean);
    if (colors.length) attributes.push(`global.farbe:${colors.join(",")}`);
    // Not on Kleinanzeigen.
    if ((filters.interiorColors || []).length) skip(c.interiorColorLabel || "Kolor wnętrza");
    if (filters.drive && filters.drive !== "any") skip(c.driveLabel || "Napęd");
    if (filters.displacementFrom || filters.displacementTo) skip(c.displacementRangeLabel || "Pojemność");
    if (filters.seatsFrom || filters.seatsTo) skip(c.seatsRangeLabel || "Liczba miejsc");
    if (filters.slidingDoor) skip(c.slidingDoorLabel || "Drzwi przesuwne");
    if (filters.metallic) skip(c.metallicLabel || "Metallic");
    if (filters.matte) skip(c.matteLabel || "Matowy");
    if (filters.vat) skip(c.vatLabel || "VAT");
    if (filters.newUsed) skip(t.newUsed);
    if (filters.warranty) skip(c.warrantyLabel || "Gwarancja");
    if (filters.accidentFree) skip(c.accidentFreeLabel || "Bezwypadkowy");
    if (filters.firstOwner) skip(c.firstOwnerLabel || "Pierwszy właściciel");
    const priceRange = price || (() => {
      const { from, to } = typeof rangeBounds === "function"
        ? rangeBounds(filters.priceFrom, String(filters.priceTo || "").trim().endsWith("+") ? "" : filters.priceTo)
        : { from: null, to: null };
      return from === null && to === null ? null : { from, to };
    })();
    return { selection, attributes, seller: SELLER[filters.seller] || "", price: priceRange, words: selection.words, skipped };
  }

  const wordsSlug = (text) => String(text || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // page 1…50; priceFrom: read on from this price (lists beyond 50 pages).
  function buildSearchUrl(filters, { page = 1, price = null, priceFrom = null } = {}) {
    const parts = searchParts(filters, { price });
    const path = ["s-autos"];
    if (parts.selection.makeSlug) path.push(parts.selection.makeSlug);
    if (parts.seller) path.push(`anbieter:${parts.seller}`);
    const from = priceFrom ?? parts.price?.from ?? null;
    const to = parts.price?.to ?? null;
    if (from !== null || to !== null) path.push(`preis:${from ?? ""}:${to ?? ""}`);
    path.push("sortierung:preis");
    if (page > 1) path.push(`seite:${page}`);
    const words = wordsSlug(parts.words);
    const attributes = [];
    if (parts.selection.makeSlug) attributes.push(`autos.marke_s:${parts.selection.makeSlug}`);
    if (parts.selection.slugs.length) attributes.push(`autos.model_s:${parts.selection.slugs.join(",")}`);
    attributes.push(...parts.attributes);
    const category = `${words ? `${words}/k0` : ""}c216${attributes.map((item) => `+${item}`).join("")}`;
    return `${SITE}/${path.join("/")}/${category}`;
  }

  // The offers of one result page: TOP ads stand first whatever the order, so
  // their place is not their price rank. "VB" alone, "Zu verschenken" and
  // prices under 300 € are no price.
  function parsePage(html, { page = 1, base = 0 } = {}) {
    const text = String(html || "");
    const total = Number((text.match(/"onsite_search_total_results":"(\d+)"/) || [])[1]) || 0;
    const listings = [];
    let position = 0;
    for (const match of text.matchAll(/<article([\s\S]*?)<\/article>/g)) {
      const card = match[1].replace(/<script[\s\S]*?<\/script>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, "");
      const id = (card.match(/data-adid="(\d+)"/) || [])[1];
      if (!id) continue;
      const top = /<div[^>]*>\s*TOP\s*<\/div>/.test(card);
      if (!top) position += 1;
      const href = (card.match(/data-href="([^"]+)"/) || [])[1] || "";
      const title = ((card.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) || card.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "")
        .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").trim();
      const priceText = ((card.match(/<p class="[^"]*text-title3[^"]*font-strong[^"]*"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "").replace(/<[^>]+>/g, "");
      const price = Number((priceText.match(/([\d.]+)\s*€/) || [])[1]?.replace(/\./g, "")) || 0;
      if (price < 300) continue;
      const details = [...card.matchAll(/<span data-dhl-promotion[^>]*>([\s\S]*?)<\/span>/g)].map((item) => item[1].replace(/<[^>]+>/g, "").trim());
      const mileage = Number((details.find((item) => /km$/.test(item)) || "").replace(/[^\d]/g, "")) || "";
      const registration = (details.join(" ").match(/EZ\s*(\d{1,2})\/((?:19|20)\d{2})/) || []);
      const place = ((card.match(/<span>\s*(\d{5}\s+[^<]+)<\/span>/) || [])[1] || "").trim();
      listings.push({
        id,
        url: href ? new URL(href, SITE).toString() : "",
        title: title.slice(0, 160),
        source: "kleinanzeigen",
        price,
        currency: "EUR",
        negotiable: /\bVB\b/.test(priceText),
        year: Number(registration[2]) || "",
        firstRegistration: registration[1] ? `${registration[1]}/${registration[2]}` : "",
        mileage,
        country: "DE",
        postalCode: place.slice(0, 5),
        city: place.slice(6).slice(0, 80),
        rank: top ? null : base + (page - 1) * PAGE_SIZE + position,
        marketTotal: total,
      });
    }
    return { total, listings };
  }

  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  async function fetchPage(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(String(response.status));
    return response.text();
  }

  // ---- Page 1: live count and the search link -------------------------------------
  const counts = new Map();
  let countRequest = 0;
  async function refreshCount(filters) {
    const target = document.querySelector("[data-mobile-search-count-kleinanzeigen]");
    if (!target) return;
    target.title = TEXT[lang()].countTitle;
    const picked = typeof window.AUTOGOOD_SELECTED_MARKETS === "function" ? window.AUTOGOOD_SELECTED_MARKETS() : ["kleinanzeigen"];
    if (!picked.includes("kleinanzeigen")) return;
    if (!filters?.brand || !filters?.model) {
      target.textContent = "—";
      return;
    }
    let url;
    try {
      url = buildSearchUrl(filters);
    } catch {
      target.textContent = "—";
      return;
    }
    if (counts.has(url)) {
      target.textContent = counts.get(url);
      return;
    }
    const request = ++countRequest;
    target.textContent = "…";
    try {
      const { total } = parsePage(await fetchPage(url));
      const label = new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(total);
      counts.set(url, label);
      if (request === countRequest) target.textContent = label;
    } catch {
      if (request === countRequest) target.textContent = "—";
    }
  }
  window.AUTOGOOD_KLEINANZEIGEN_REFRESH_COUNT = refreshCount;

  document.querySelectorAll("[data-mobile-kleinanzeigen-search]").forEach((link) => link.addEventListener("click", (event) => {
    try {
      const filters = readManualFields();
      const url = buildSearchUrl(filters);
      link.href = url;
      window.AUTOGOOD_MOBILE_LOG_SEARCH?.(url);
      const { skipped } = searchParts(filters);
      setMarketSearchStatus(skipped.length ? TEXT[lang()].skipped.replace("{filters}", skipped.join(", ")) : TEXT[lang()].opening);
    } catch (error) {
      event.preventDefault();
      link.href = "#";
      setMarketSearchStatus(error.message || "Kleinanzeigen", true);
    }
  }));
  function renderI18n() {
    document.querySelectorAll("[data-mobile-kleinanzeigen-search]").forEach((node) => {
      node.setAttribute("aria-label", TEXT[lang()].search);
      node.title = TEXT[lang()].search;
    });
  }
  renderI18n();
  document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", () => window.setTimeout(renderI18n, 0)));

  window.AUTOGOOD_KLEINANZEIGEN = {
    SITE,
    PAGE_SIZE,
    MAX_PAGES,
    modelSelection,
    searchParts,
    buildSearchUrl,
    parsePage,
    fetchPage,
    skippedFilterLabels: (filters) => searchParts(filters).skipped,
  };
})();
