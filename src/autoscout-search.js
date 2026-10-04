// AutoScout24: the partner of mobile.de on page 3 "Monitoring".
// One database behind every domain (.de/.nl/.be/.at/.lu): checked
// 2026-10-03, the same country searched on .de and on its own domain gives
// the same count (.de even a few more), so one search on autoscout24.de with
// the country filter `cy` covers all of them.
// Filter codes come from the search page's own taxonomy (__NEXT_DATA__);
// every parameter below was checked by the change in the result count.
// Drive (4x4/front/rear) could not be passed: no parameter changed the count.
(() => {
  // France too is searched and opened on autoscout24.de with cy=F: the French
  // domain shows fewer cars for the same search (VW Golf 1 471 against 1 884,
  // 2026-10-04), so the link opens exactly what the count and analysis read.
  const BASE = "https://www.autoscout24.de";
  // Monitoring countries (ISO) → AutoScout's own country codes.
  const COUNTRY = { DE: "D", NL: "NL", BE: "B", AT: "A", LU: "L", FR: "F", IT: "I", ES: "E", CZ: "CZ", DK: "DK", SE: "S" };
  const FUEL = { petrol: "B", diesel: "D", hybrid_petrol: "2", hybrid_diesel: "3", electric: "E", plugin: "2" };
  const GEAR = { automatic: "A", manual: "M" };
  const BODY = { hatchback: "1", cabrio: "2", coupe: "3", suv: "4", pickup: "4", estate: "5", limousine: "6", van_minibus: "12", other: "7" };
  const SELLER = { dealer: "D", company: "D", private: "P" };
  // Every value below was checked by the change in the result count (VW Golf DE
  // 29 987 / VW DE 147 329, 2026-10-04); names from AutoScout's own search
  // code (driveTrain=dtrain, paintwork=ptype, upholstery=uph, version=version0…)
  // and ids from its taxonomy (__NEXT_DATA__ → taxonomy.equipment).
  const DRIVE = { awd: "4", fwd: "F", rwd: "R" };
  // Equipment ids ("eq", several = all of them, like ticking them on the site).
  const FEATURE_EQ = {
    BLIND_SPOT_MONITOR: [158], // Totwinkel-Assistent
    ELECTRIC_HEATED_SEATS: [34], // Sitzheizung
    HEATED_STEERING_WHEEL: [136], // Beheizbares Lenkrad
    ELECTRIC_HEATED_REAR_SEATS: [248], // Sitzheizung hinten
    HEATED_WINDSHIELD: [135], // Beheizbare Frontscheibe
    VENTILATED_SEATS: [154], // Sitzbelüftung
    ELECTRIC_ADJUSTABLE_SEATS: [16], // Elektrische Sitze
    ELECTRIC_FRONT_SEATS: [16], // ≈ the same "Elektrische Sitze"
    ELECTRIC_TAILGATE: [139], // Elektrische Heckklappe
    SPORT_SEATS: [117], // Sportsitze
    MASSAGE_SEATS: [145], // Massagesitze
    LUMBAR_SUPPORT: [143], // Lordosenstütze
    LED_HEADLIGHTS: [140], // LED-Scheinwerfer
    XENON_HEADLIGHTS: [39], // Xenonscheinwerfer
    BI_XENON_HEADLIGHTS: [230], // Bi-Xenon Scheinwerfer
    LASER_HEADLIGHTS: [213], // Laserlicht
    GLARE_FREE_HIGH_BEAM: [214], // Blendfreies Fernlicht
    PANORAMIC_GLASS_ROOF: [50], // Panoramadach
    ROOF_RAILS: [27], // Dachreling
    AIR_SUSPENSION: [144], // Luftfederung
    PERFORMANCE_HANDLING_SYSTEM: [116], // Sportfahrwerk
    LED_RUNNING_LIGHTS: [141], // LED-Tagfahrlicht
    ADAPTIVE_BENDING_LIGHTS: [118], // Kurvenlicht
    SPORT_PACKAGE: [112], // Sportpaket
    KEYLESS_ENTRY: [153], // Schlüssellose Zentralverriegelung
    NIGHT_VISION_ASSIST: [147], // Nachtsicht-Assistent
    ALLOY_WHEELS: [15], // Alufelgen
    TRAFFIC_SIGN_RECOGNITION: [162], // Verkehrszeichenerkennung
    CARPLAY: [221], // Apple CarPlay
    ANDROID_AUTO: [222], // Android Auto
    AMBIENT_LIGHTING: [219], // Ambientebeleuchtung
    DIGITAL_COCKPIT: [224], // Volldigitales Kombiinstrument
    HEAD_UP_DISPLAY: [123], // Head-up display
    NAVIGATION_SYSTEM: [23], // Navigationssystem
    SOUND_SYSTEM: [155], // Soundsystem
    WIRELESS_CHARGING: [223], // Induktionsladen für Smartphones
    WINTER_TIRES: [25], // Winterreifen
    SUMMER_TIRES: [210], // Sommerreifen
  };
  // No such equipment on AutoScout24: not sent, named in the warning.
  const FEATURE_MISSING = new Set(["MEMORY_SEATS", "COMFORT_SEATS", "HALOGEN_HEADLIGHTS"]);
  // Sent, but not quite the same thing (named as approximate).
  const FEATURE_APPROX = new Set(["ELECTRIC_FRONT_SEATS"]);
  const PARKING_EQ = {
    REAR_VIEW_CAM: [130], // Einparkhilfe Rückfahrkamera
    CAM_360_DEGREES: [187], // 360° Kamera
    FRONT_REAR_SENSORS: [128, 129], // Sensoren vorne + hinten
    FRONT_SENSORS: [128],
    REAR_SENSORS: [129],
    AUTOMATIC_PARKING: [131], // Einparkhilfe selbstlenkendes System
  };
  // Climate: "Klimaautomatik" 30, 2/3/4 zones 241/242/243.
  const CLIMATE_EQ = { automatic: 30, automatic_2_zones: 241, automatic_3_zones: 242, automatic_4_zones: 243 };
  // Cruise control: "Tempomat" 38 and "Abstandstempomat" 133 are separate
  // ticks on AutoScout24 (Golf: 19 108 / 18 821, both 14 192), as on its site.
  const CRUISE_EQ = { CRUISE_CONTROL: 38, ADAPTIVE_CRUISE_CONTROL: 133 };
  const SLIDING_EQ = { right: [245], left: [244], both: [244, 245] };
  // Colours (several = any of them): bcol body, icol interior; upholstery uph.
  const BODY_COLOR = { beige: 1, blue: 2, brown: 3, yellow: 5, gold: 16, green: 7, grey: 6, orange: 15, red: 10, black: 11, silver: 12, purple: 13, white: 14 };
  const INTERIOR_COLOR = { beige: 1, black: 2, grey: 3, brown: 4, other: 5, blue: 6, red: 7 };
  const UPHOLSTERY = { alcantara: "AL", cloth: "CL", part_leather: "PL", full_leather: "FL" };
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

  // What the search cannot carry over, as the form names it (shown as "not
  // transferred"; "≈" = sent, but not quite the same).
  function unsupported(filters = {}) {
    const words = (typeof copy === "object" && typeof state === "object" && copy[state.lang]) || {};
    const optionLabel = (list, value) => {
      const input = (list || []).find((item) => item.value === value);
      return input && typeof optionLabelText === "function" ? optionLabelText(input) : value;
    };
    const features = typeof els === "object" ? els.features : [];
    const sensors = typeof els === "object" ? els.parkingSensors : [];
    const missing = [];
    (filters.features || []).forEach((feature) => {
      if (FEATURE_MISSING.has(feature)) missing.push(optionLabel(features, feature));
      else if (FEATURE_APPROX.has(feature)) missing.push(`${optionLabel(features, feature)} ≈`);
    });
    (filters.parkingSensors || []).filter((sensor) => !PARKING_EQ[sensor]).forEach((sensor) => missing.push(optionLabel(sensors, sensor)));
    // A key the page-1 "!" strip (mobile-filter-warnings.js) names in either language.
    if ((filters.fuels || []).includes("plugin")) missing.push("plugin≈hybrid");
    if (filters.trailerCoupling && !["any", "all", ""].includes(filters.trailerCoupling)) missing.push(`${words.trailerCouplingLabel || "Hak"} ≈`);
    if (filters.matte) missing.push(words.matteLabel || "matte");
    if (filters.vat === "non_reclaimable") missing.push(words.vatLabel || "VAT");
    // No accident-free filter (only "damaged: exclude", always sent).
    if (filters.accidentFree) missing.push(words.accidentFreeLabel || "accident-free");
    return missing;
  }

  // Door group of the form (2/3, 4/5, 6/7) as a range.
  function doorRange(filters) {
    try {
      if (typeof doorRangeBounds === "function") return doorRangeBounds(filters);
    } catch {
      return { from: null, to: null };
    }
    return { from: Number(digits(filters.doorsFrom)) || null, to: Number(digits(filters.doorsTo)) || null };
  }

  // filters: the page-1 form; countries: ISO codes; price: {from, to} in EUR
  // replacing the page-1 price; sort by price, cheapest first unless desc.
  function buildSearchUrl(filters = {}, { countries = ["DE"], price = null, desc = false, page = 1 } = {}) {
    const path = ["lst", slug(filters.brand), modelSlug(filters.brand, filters.model)].filter(Boolean).join("/");
    const url = new URL(`${BASE}/${path}`);
    const params = url.searchParams;
    params.set("atype", "C");
    params.set("cy", countries.map((code) => COUNTRY[code] || code).join(","));
    // "Pokaż też uszkodzone": damaged cars too (Golf 29 987 → 30 722).
    params.set("damaged_listing", filters.damagedVehicles === "show" ? "include" : "exclude");
    if (filters.firstOwner) params.set("prevownersid", "1");
    params.set("sort", "price");
    params.set("desc", desc ? "1" : "0");
    // New / used is "offer" (checked 2026-10-04: N 14 768 + U,J,O,D,S 132 560 =
    // all 147 329 VW). "ustate", sent until then, changed nothing.
    if (filters.newUsed === "new") params.set("offer", "N");
    if (filters.newUsed === "used") params.set("offer", "U,J,O,D,S");
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
    range("ccmfrom", "ccmto", filters.displacementFrom, filters.displacementTo);
    range("seatsfrom", "seatsto", filters.seatsFrom, filters.seatsTo);
    const doors = doorRange(filters);
    if (doors.from !== null && doors.from !== undefined && doors.from > 2) params.set("doorfrom", String(doors.from));
    if (doors.to !== null && doors.to !== undefined && doors.to < 7) params.set("doorto", String(doors.to));
    const fuels = [...new Set((filters.fuels || []).map((fuel) => FUEL[fuel]).filter(Boolean))];
    if (fuels.length) params.set("fuel", fuels.join(","));
    if (GEAR[filters.gearbox]) params.set("gear", GEAR[filters.gearbox]);
    if (DRIVE[filters.drive]) params.set("dtrain", DRIVE[filters.drive]);
    if (BODY[filters.body]) params.set("body", BODY[filters.body]);
    if (SELLER[filters.seller]) params.set("custtype", SELLER[filters.seller]);
    // "Wersja": AutoScout's own version text field (Golf + "gti" 3 263).
    if (String(filters.version || "").trim()) params.set("version0", String(filters.version).trim());
    if (filters.vat === "reclaimable") params.set("vatded", "true");
    // Equipment: every ticked option must be there.
    const eq = new Set();
    (filters.features || []).forEach((feature) => (FEATURE_EQ[feature] || []).forEach((id) => eq.add(id)));
    (filters.parkingSensors || []).forEach((sensor) => (PARKING_EQ[sensor] || []).forEach((id) => eq.add(id)));
    if (CLIMATE_EQ[filters.airConditioning]) eq.add(CLIMATE_EQ[filters.airConditioning]);
    if (CRUISE_EQ[filters.cruiseControl]) eq.add(CRUISE_EQ[filters.cruiseControl]);
    // Towbar of any kind: "Anhängerkupplung" (no fixed/detachable on AutoScout24).
    if (filters.trailerCoupling && !["any", ""].includes(filters.trailerCoupling)) eq.add(20);
    (SLIDING_EQ[filters.slidingDoor] || []).forEach((id) => eq.add(id));
    if (filters.warranty) eq.add(37); // Garantie
    if (filters.serviceHistory) eq.add(49); // Scheckheftgepflegt
    if (filters.nonSmoking) eq.add(110); // Nichtraucherfahrzeug
    if (eq.size) params.set("eq", [...eq].join(","));
    const bodyColors = (filters.exteriorColors || []).map((color) => BODY_COLOR[color]).filter(Boolean);
    if (bodyColors.length) params.set("bcol", bodyColors.join(","));
    const interiorColors = (filters.interiorColors || []).map((color) => INTERIOR_COLOR[color]).filter(Boolean);
    if (interiorColors.length) params.set("icol", interiorColors.join(","));
    const upholstery = (filters.interiorMaterials || []).map((material) => UPHOLSTERY[material]).filter(Boolean);
    if (upholstery.length) params.set("uph", upholstery.join(","));
    if (filters.metallic) params.set("ptype", "M");
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
  // Two markets on page 1: AutoScout24 in the "Kraj" countries (beside
  // mobile.de) and AutoScout24 in France alone, the market "Francja" (B47).
  const TEXT = {
    pl: { search: "Szukaj na AutoScout24", opening: "Otwieram AutoScout24 (wszystkie ogłoszenia; w analizie — tylko te, których nie ma na mobile.de).", skipped: "AutoScout24 nie przyjmie filtrów: {filters}.", countTitle: "Wszystkie ogłoszenia na AutoScout24 (razem z tymi, które są też na mobile.de)",
      searchFr: "Szukaj na AutoScout24 (Francja)", openingFr: "Otwieram AutoScout24 — ogłoszenia z Francji.", countTitleFr: "Ogłoszenia na AutoScout24 we Francji",
      searchNlBe: "Szukaj na AutoScout24 (Holandia, Belgia)", openingNlBe: "Otwieram AutoScout24 — ogłoszenia z Holandii i Belgii.", countTitleNlBe: "Ogłoszenia na AutoScout24 w Holandii i Belgii" },
    ru: { search: "Искать на AutoScout24", opening: "Открываю AutoScout24 (все объявления; в анализе — только те, которых нет на mobile.de).", skipped: "AutoScout24 не примет фильтры: {filters}.", countTitle: "Все объявления на AutoScout24 (вместе с теми, что есть и на mobile.de)",
      searchFr: "Искать на AutoScout24 (Франция)", openingFr: "Открываю AutoScout24 — объявления из Франции.", countTitleFr: "Объявления на AutoScout24 во Франции",
      searchNlBe: "Искать на AutoScout24 (Нидерланды, Бельгия)", openingNlBe: "Открываю AutoScout24 — объявления из Нидерландов и Бельгии.", countTitleNlBe: "Объявления на AutoScout24 в Нидерландах и Бельгии" },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  // B68: page 1 has a German column (Germany, plus Austria or Luxembourg
  // from "Kraj") and a column of the Netherlands and Belgium, each with its
  // own AutoScout24 count and link; the analysis searches every "Kraj" country.
  const NLBE = ["NL", "BE"];
  const countries = (filters) => {
    const german = (filters.countries || []).filter((code) => !NLBE.includes(code));
    return german.length ? german : ["DE"];
  };
  const MARKETS = {
    autoscout: { count: "[data-mobile-search-count-autoscout]", link: "[data-mobile-autoscout-search]", countries, search: "search", opening: "opening", countTitle: "countTitle" },
    autoscoutnlbe: { count: "[data-mobile-search-count-autoscoutnlbe]", link: "[data-mobile-autoscoutnlbe-search]", countries: () => NLBE, search: "searchNlBe", opening: "openingNlBe", countTitle: "countTitleNlBe" },
    autoscoutfr: { count: "[data-mobile-search-count-autoscoutfr]", link: "[data-mobile-autoscoutfr-search]", countries: () => ["FR"], search: "searchFr", opening: "openingFr", countTitle: "countTitleFr" },
  };
  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const counts = new Map();
  const countRequests = {};

  async function refreshMarketCount(market, filters) {
    const spec = MARKETS[market];
    const target = document.querySelector(spec.count);
    if (!target) return;
    target.title = TEXT[lang()][spec.countTitle];
    if (!filters?.brand || !filters?.model) {
      target.textContent = "—";
      return;
    }
    const url = buildSearchUrl(filters, { countries: spec.countries(filters) });
    if (counts.has(url)) {
      target.textContent = counts.get(url);
      return;
    }
    const request = (countRequests[market] = (countRequests[market] || 0) + 1);
    target.textContent = "…";
    try {
      const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
      if (!response.ok) throw new Error(String(response.status));
      const label = new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(parseSearchPage(await response.text()).total);
      counts.set(url, label);
      if (request === countRequests[market]) target.textContent = label;
    } catch {
      if (request === countRequests[market]) target.textContent = "—";
    }
  }
  // France, the Netherlands and Belgium are counted only while compared: a
  // proxy request less each.
  const refreshCount = (filters) => {
    const picked = typeof window.AUTOGOOD_SELECTED_MARKETS === "function" ? window.AUTOGOOD_SELECTED_MARKETS() : ["autoscout", "autoscoutfr"];
    refreshMarketCount("autoscout", filters);
    if (picked.includes("autoscoutfr")) refreshMarketCount("autoscoutfr", filters);
    if (picked.includes("autoscout") && (filters?.countries || []).some((code) => NLBE.includes(code))) refreshMarketCount("autoscoutnlbe", filters);
  };

  Object.values(MARKETS).forEach((spec) => {
    document.querySelectorAll(spec.link).forEach((link) => link.addEventListener("click", (event) => {
      try {
        const filters = readManualFields();
        const url = buildSearchUrl(filters, { countries: spec.countries(filters) });
        link.href = url;
        window.AUTOGOOD_MOBILE_LOG_SEARCH?.(url);
        const skipped = unsupported(filters).map((item) => (item === "plugin≈hybrid" ? (lang() === "ru" ? "Plug-in (≈ гибрид)" : "Plug-in (≈ hybryda)") : item));
        setMarketSearchStatus(skipped.length ? TEXT[lang()].skipped.replace("{filters}", skipped.join(", ")) : TEXT[lang()][spec.opening]);
      } catch (error) {
        event.preventDefault();
        link.href = "#";
        setMarketSearchStatus(error.message || "AutoScout24", true);
      }
    }));
    document.querySelectorAll(spec.link).forEach((node) => {
      node.setAttribute("aria-label", TEXT[lang()][spec.search]);
      node.title = TEXT[lang()][spec.search];
    });
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
