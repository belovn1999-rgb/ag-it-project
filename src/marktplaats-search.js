// ---- Marktplaats (NL) and 2dehands / 2ememain (BE) ---------------------------
// One platform, one search API (/lrp/api/search) and one category tree on
// both sites: a make is an l2 category of "Auto's" (91), a model and every
// other filter an attribute value id (attributesById; values of one group are
// "or", groups and the equipment options are "and" — checked 2026-10-04),
// ranges are "key:from:to" (attributeRanges). The API has no CORS for other
// sites, so it is read through the reader proxy as text (x-respond-with: text).
// The site's own link carries the same search in its hash:
// /l/auto-s/<make>/#f:<ids>|constructionYearFrom:2019|…|sortBy:PRICE|sortOrder:INCREASING.
// Each site is a market of its own country: "marktplaats" = Holandia,
// "dehands" = Belgia (2dehands.be; 2ememain.be is the same site in French).
// Every filter value below was checked by the change in the result count
// (docs/FILTERS-MOBILE-OTOMOTO.md §5f). Loaded after mobile.js and
// blocket-search.js: uses their helpers (rangeBounds, manualFuelValues, copy,
// state, doorRangeBounds, the blocket* model matching).
(() => {
  // The category tree and most attribute values are shared, a few keys are
  // not (facets of /lrp/api/search, 2026-10-10): 2dehands has its own doors
  // (one value per count), seats, power in kW and only an extended warranty.
  const SITES = {
    marktplaats: {
      host: "https://www.marktplaats.nl", country: "NL", name: "Marktplaats",
      power: { key: "engineHorsepower", kw: false }, seats: "numberOfSeats",
      doors: { 2: 171, 3: 171, 4: 172, 5: 172, 6: 173, 7: 173 }, warranty: 8783, warrantyApprox: false,
    },
    dehands: {
      host: "https://www.2dehands.be", country: "BE", name: "2dehands",
      power: { key: "enginePowerKW", kw: true }, seats: "numberOfSeatsBE",
      doors: { 2: 11757, 3: 11758, 4: 11759, 5: 11760, 6: 11761, 7: 11761 }, warranty: 13182, warrantyApprox: true,
      // The same body ids, Belgian names: 481 is "Stadsauto" (a city car),
      // 483 "Berline" — a hatchback as well as a saloon (Golf: 454 / 814).
      body: { hatchback: [481, 483], limousine: [483], sedan: [483] },
    },
  };
  const KW_PER_HP = 0.73549875;
  const CARS = 91;
  const PAGE_SIZE = 100;
  // Results beyond this offset are not served in one sort order (2026-10-04:
  // offset 2000 answers, 3000 is empty): longer lists are read from both ends.
  const MAX_OFFSET = 2900;

  // ---- Filter values (attribute value ids) -------------------------------------
  const FUEL = { petrol: [473], diesel: [474], electric: [11756], hybrid_petrol: [13838], hybrid_diesel: [13839] };
  // Plug-in hybrids: their own group "Type hybride" (13956), searched alone.
  const PLUGIN = 13956;
  const GEARBOX = { automatic: [534], manual: [535] };
  const DRIVE = { fwd: [13943], rwd: [13944], awd: [13945] };
  const BODY = { hatchback: [481], van_minibus: [482], limousine: [483], sedan: [483], estate: [484], coupe: [486], cabrio: [485], suv: [488], pickup: [488], other: [487] };
  const SELLER = { dealer: [10899], company: [10899], private: [10898] };
  const CONDITION = { new: [30], used: [14049] };
  const BODY_COLOR = { beige: 468, blue: 287, brown: 469, yellow: 443364, green: 288, red: 465, white: 471, grey: 466, silver: 466, black: 290 };
  const INTERIOR_COLOR = { beige: 11776, blue: 11777, brown: 11778, grey: 11779, black: 11780, other: 12155 };
  const UPHOLSTERY = { alcantara: [13977], cloth: [13982], part_leather: [13981, 13980], full_leather: [13979] };
  // Equipment ("Opties"): every ticked option must be there.
  const OPTIONS = {
    BLIND_SPOT_MONITOR: 11910, ELECTRIC_HEATED_SEATS: 11563, HEATED_STEERING_WHEEL: 11916, ELECTRIC_HEATED_REAR_SEATS: 443384,
    VENTILATED_SEATS: 11911, ELECTRIC_ADJUSTABLE_SEATS: 11793, ELECTRIC_FRONT_SEATS: 11793, ELECTRIC_TAILGATE: 11803,
    SPORT_SEATS: 11562, MASSAGE_SEATS: 11912, LED_HEADLIGHTS: 443374, XENON_HEADLIGHTS: 11802, BI_XENON_HEADLIGHTS: 443367,
    LASER_HEADLIGHTS: 443375, GLARE_FREE_HIGH_BEAM: 443383, PANORAMIC_GLASS_ROOF: 11809, ROOF_RAILS: 13966,
    LED_RUNNING_LIGHTS: 443376, ADAPTIVE_BENDING_LIGHTS: 13965, SPORT_PACKAGE: 11797, KEYLESS_ENTRY: 11913,
    NIGHT_VISION_ASSIST: 443379, ALLOY_WHEELS: 11557, TRAFFIC_SIGN_RECOGNITION: 11805, CARPLAY: 13964, ANDROID_AUTO: 13963,
    DIGITAL_COCKPIT: 443370, HEAD_UP_DISPLAY: 13967, NAVIGATION_SYSTEM: 11559, SOUND_SYSTEM: 443381, WIRELESS_CHARGING: 443373,
  };
  const OPTION_APPROX = new Set(["ELECTRIC_FRONT_SEATS"]);
  const PARKING = { REAR_VIEW_CAM: 13974, CAM_360_DEGREES: 13975, FRONT_REAR_SENSORS: 11561, FRONT_SENSORS: 11561, REAR_SENSORS: 11561, AUTOMATIC_PARKING: 11795 };
  // "Parkeersensor" does not say front or rear: sensors are sent, named as approximate.
  const PARKING_APPROX = new Set(["FRONT_REAR_SENSORS", "FRONT_SENSORS", "REAR_SENSORS"]);
  const CLIMATE = { automatic: 443365, automatic_2_zones: 443365, automatic_3_zones: 443365, automatic_4_zones: 443365 };
  const CRUISE = { CRUISE_CONTROL: 11565, ADAPTIVE_CRUISE_CONTROL: 11914 };
  const TOWBAR = 11564;
  const SLIDING_DOOR = 11807;
  const METALLIC = 11558;
  // "Dealer onderhouden" or "Onderhoudsboekje": a documented service history.
  const SERVICE = [13183, 13184];
  const VAT = 13149;

  const TEXT = {
    pl: {
      search: { marktplaats: "Szukaj na Marktplaats (Holandia)", dehands: "Szukaj na 2dehands (Belgia)" },
      opening: { marktplaats: "Otwieram Marktplaats: od najniższej ceny.", dehands: "Otwieram 2dehands: od najniższej ceny." },
      skipped: "{portal} nie ma dokładnego odpowiednika dla: {filters}. Pozostałe filtry zostały zastosowane.",
      countTitle: { marktplaats: "Ogłoszenia na Marktplaats (Holandia)", dehands: "Ogłoszenia na 2dehands / 2ememain (Belgia)" },
      sensors: "czujniki parkowania (bez przód/tył)",
      climate: "klimatyzacja automatyczna (bez liczby stref)",
    },
    ru: {
      search: { marktplaats: "Искать на Marktplaats (Нидерланды)", dehands: "Искать на 2dehands (Бельгия)" },
      opening: { marktplaats: "Открываю Marktplaats: сначала самые дешёвые.", dehands: "Открываю 2dehands: сначала самые дешёвые." },
      skipped: "В {portal} нет точного аналога для: {filters}. Остальные фильтры применены.",
      countTitle: { marktplaats: "Объявления на Marktplaats (Нидерланды)", dehands: "Объявления на 2dehands / 2ememain (Бельгия)" },
      sensors: "датчики парковки (без передних/задних)",
      climate: "климат-контроль (без числа зон)",
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const digits = (value) => String(value ?? "").replace(/[^\d]/g, "");

  // ---- Make and model ------------------------------------------------------------
  const MAKE_ALIASES = { "Mercedes-Benz": "Mercedes-Benz", "Land Rover": "Land Rover", "Alfa Romeo": "Alfa Romeo" };
  // A series: "3-Serie" (Marktplaats) = "3 Reeks" (2dehands), the same id.
  const SERIES = /(?:^|[\s-])(serie|series|klasse|class|reeks)$/i;
  const seriesToken = (name) => blocketToken(String(name || "").replace(/[-\s]*(serie|series|klasse|class|reeks)(?=[-\s]|$)/gi, " "));

  function catalogMake(brand) {
    const makes = window.AUTOGOOD_MARKTPLAATS_CATALOG?.makes || {};
    const wanted = blocketToken(MAKE_ALIASES[brand] || brand);
    const name = Object.keys(makes).find((candidate) => blocketToken(candidate) === wanted);
    if (!name) return null;
    const make = makes[name];
    return { name, ...make, models: make.models.map((model) => ({ ...model, series: SERIES.test(model.name) })) };
  }

  // { makeId, makeKey, ids, query, broad, unsupported }: the model ids (several
  // = "or"), the version searched as text ("Wersja"), approximate or missing.
  function modelSelection(brand, model, version = "") {
    const cleanModel = String(model || "").trim();
    const cleanVersion = String(version || "").trim();
    const make = brand ? catalogMake(brand) : null;
    if (!brand || !make) {
      return { makeId: null, makeKey: "", ids: [], query: [brand, cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: Boolean(brand) };
    }
    const base = { makeId: make.id, makeKey: make.key, ids: [], query: cleanVersion, broad: false, unsupported: false };
    if (!cleanModel) return base;
    const nodes = make.models;
    const result = (found, broad) => ({ ...base, ids: [...new Set(found.map((node) => node.id))], broad });
    const alternatives = blocketModelAlternatives(brand, cleanModel);
    const ourModels = blocketOurModels(brand);
    const separateFor = (name) => ourModels.filter((other) => blocketToken(other).length > blocketToken(name).length && blocketInFamily(other, name));
    // An empty token only for the same name: Land Rover "Series".
    const seriesOf = (name) => nodes.filter((node) => node.series && seriesToken(node.name) === seriesToken(name)
      && (seriesToken(name) || blocketToken(node.name) === blocketToken(name)));
    // A series' body models are its flat siblings on the platform, not part
    // of it: "3-Serie" (610) and "3-Serie GT" (10887), "2-Serie" and "2-Serie
    // Active Tourer" / "Gran Coupé" / "Gran Tourer" (checked 2026-10-10).
    const bodyModels = (series) => nodes.filter((node) => !node.series
      && series.some((head) => blocketNormal(node.name).startsWith(`${blocketNormal(head.name)} `)));
    const bodyWord = (value) => blocketToken(String(value || "").replace(/\bgran\s+turismo\b/gi, "GT"));
    // A whole series first, with its body models, as mobile.de's "3er" with
    // the Gran Turismo: BMW "3" -> 3-Serie + 3-Serie GT, Mercedes "C" -> C-Klasse.
    // Before the family below: "3-Serie GT" opens with "3", the series itself
    // is not a family member, so "3" found only the GT (2026-10-10).
    const series = alternatives.flatMap(seriesOf);
    if (series.length) return result([...series, ...bodyModels(series)], false);
    const exact = alternatives.flatMap((name) => blocketFamily(nodes, name, separateFor(name), ourModels));
    if (exact.length) return result(exact, false);
    // An engine of a series: BMW 320d -> 3-Serie, C 200 -> C-Klasse; with a
    // body after it, that body model: "320 Gran Turismo" -> 3-Serie GT,
    // "218 Active Tourer" -> 2-Serie Active Tourer, "2er Gran Coupé" -> 2-Serie
    // Gran Coupé (the whole of it, not approximate).
    for (const name of alternatives) {
      const bmw = brand === "BMW" && name.match(/^M?([1-8])(\d{2}[a-z]{0,2}|er)\b\s*(.*)$/i);
      const head = bmw ? bmw[1] : (name.match(/^([A-Za-z]{1,3})\s*\d{2,3}/) || [])[1];
      if (!head) continue;
      const found = seriesOf(head);
      if (!found.length) continue;
      if (bmw && /^er$/i.test(bmw[2]) && !bmw[3]) return result([...found, ...bodyModels(found)], false);
      const body = bmw && bmw[3] ? bodyModels(found).filter((node) => found.some((one) => blocketToken(node.name) === `${blocketToken(one.name)}${bodyWord(bmw[3])}`)) : [];
      if (body.length) return result(body, !/^er$/i.test(bmw[2]));
      return result(found, true);
    }
    // A broader model the requested name opens with ("Golf GTI" -> Golf).
    for (const name of alternatives) {
      const words = blocketWords(name);
      for (let count = words.length - 1; count >= 1; count -= 1) {
        const opener = words.slice(0, count).join(" ");
        if (!nodes.some((node) => blocketToken(node.name) === blocketToken(opener))) continue;
        const family = blocketFamily(nodes, opener, separateFor(opener), ourModels);
        if (family.length) return result(family, true);
      }
    }
    // Not on this platform: the make only, the model searched as text.
    return { ...base, query: [cleanModel, cleanVersion].filter(Boolean).join(" "), broad: true };
  }

  // ---- The search ------------------------------------------------------------------
  // { selection, groups: [[ids]], ranges: [{key, from, to}], query, skipped: [] }
  function searchParts(filters = {}, { price = null, market = "marktplaats" } = {}) {
    const site = SITES[market] || SITES.marktplaats;
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
    const groups = [];
    const group = (ids) => {
      const list = [...new Set(ids.filter(Boolean))];
      if (list.length) groups.push(list);
    };
    group(selection.ids);
    const fuels = typeof manualFuelValues === "function" ? manualFuelValues(filters) : (filters.fuels || []);
    if (fuels.includes("plugin") && fuels.length === 1) group([PLUGIN]);
    else {
      if (fuels.includes("plugin")) skip(c.fuelLabel || "Paliwo");
      group(fuels.flatMap((fuel) => FUEL[fuel] || []));
    }
    group(GEARBOX[filters.gearbox] || []);
    group(DRIVE[filters.drive] || []);
    const bodyIds = site.body?.[filters.body];
    group(bodyIds || BODY[filters.body] || []);
    if (bodyIds) skip(`${c.bodyLabel || "Nadwozie"} ≈`);
    group(SELLER[filters.seller] || []);
    group(CONDITION[filters.newUsed] || []);
    if (filters.vat === "reclaimable") group([VAT]);
    if (filters.vat === "non_reclaimable") skip(c.vatLabel || "VAT");
    // 2dehands has no "Garantie", only "Verlengde garantie" (an extended one).
    if (filters.warranty) {
      group([site.warranty]);
      if (site.warrantyApprox) skip(`${c.warrantyLabel || "Gwarancja"} ≈`);
    }
    if (filters.serviceHistory) group(SERVICE);
    // Doors: Marktplaats has one value for 2/3, 4/5, 6+ ("Aantal deuren"),
    // 2dehands one for each count ("aantaldeurenBE": 2, 3, 4, 5, 6).
    try {
      const doors = typeof doorRangeBounds === "function" ? doorRangeBounds(filters) : { from: null, to: null };
      if (doors.from !== null || doors.to !== null) {
        const values = [];
        for (let count = doors.from ?? 2; count <= (doors.to ?? 7); count += 1) values.push(site.doors[count]);
        if (values.length < 6) group(values);
      }
    } catch {
      // An invalid door range is reported by the form itself.
    }
    const colors = filters.exteriorColors || [];
    group(colors.map((color) => BODY_COLOR[color]));
    colors.filter((color) => !BODY_COLOR[color]).forEach((color) => skip(optionLabel(typeof els === "object" ? els.exteriorColors : [], color)));
    group((filters.interiorColors || []).map((color) => INTERIOR_COLOR[color]));
    (filters.interiorColors || []).filter((color) => !INTERIOR_COLOR[color]).forEach((color) => skip(optionLabel(typeof els === "object" ? els.interiorColors : [], color)));
    group((filters.interiorMaterials || []).flatMap((material) => UPHOLSTERY[material] || []));
    // Equipment: one group each, so all of them must be there.
    const each = (id) => {
      if (id) groups.push([id]);
    };
    (filters.features || []).forEach((feature) => {
      if (OPTIONS[feature]) each(OPTIONS[feature]);
      if (!OPTIONS[feature] || OPTION_APPROX.has(feature)) {
        const label = optionLabel(typeof els === "object" ? els.features : [], feature);
        skip(OPTIONS[feature] ? `${label} ≈` : label);
      }
    });
    const sensors = new Set();
    (filters.parkingSensors || []).forEach((sensor) => {
      if (PARKING[sensor]) sensors.add(PARKING[sensor]);
      if (!PARKING[sensor]) skip(optionLabel(typeof els === "object" ? els.parkingSensors : [], sensor));
      if (PARKING_APPROX.has(sensor)) skip(t.sensors);
    });
    sensors.forEach(each);
    if (CLIMATE[filters.airConditioning]) each(CLIMATE[filters.airConditioning]);
    if (/zones/.test(filters.airConditioning || "")) skip(t.climate);
    if (CRUISE[filters.cruiseControl]) each(CRUISE[filters.cruiseControl]);
    if (filters.trailerCoupling && !["any", ""].includes(filters.trailerCoupling)) {
      each(TOWBAR);
      if (filters.trailerCoupling !== "all") skip(`${c.trailerCouplingLabel || "Hak"} ≈`);
    }
    if (filters.slidingDoor) {
      each(SLIDING_DOOR);
      skip(`${c.slidingDoorLabel || "Drzwi przesuwne"} ≈`);
    }
    if (filters.metallic) each(METALLIC);
    if (filters.matte) skip(c.matteLabel || "Matowy");
    if (filters.nonSmoking) skip(c.nonSmokingLabel || "Niepalący");
    if (filters.accidentFree) skip(c.accidentFreeLabel || "Bezwypadkowy");
    if (filters.firstOwner) skip(c.firstOwnerLabel || "Pierwszy właściciel");

    const ranges = [];
    const range = (key, fromValue, toValue, scale = 1, roundFrom = Math.round, roundTo = Math.round) => {
      const { from, to } = typeof rangeBounds === "function" ? rangeBounds(fromValue, toValue) : { from: Number(digits(fromValue)) || null, to: Number(digits(toValue)) || null };
      if (from === null && to === null) return;
      ranges.push({ key, from: from === null ? null : roundFrom(from * scale), to: to === null ? null : roundTo(to * scale) });
    };
    range("constructionYear", filters.yearFrom, filters.yearTo);
    range("mileage", filters.mileageFrom, filters.mileageTo);
    if (price) range("PriceCents", price.from, price.to, 100);
    else range("PriceCents", filters.priceFrom, String(filters.priceTo || "").trim().endsWith("+") ? "" : filters.priceTo, 100);
    // Power: Marktplaats in hp, 2dehands in kW — the form's kW as they are,
    // its hp rounded outwards (150 hp = 110.3 kW -> up to 111), as AutoScout24.
    if (!site.power.kw) range(site.power.key, filters.powerFrom, filters.powerTo);
    else if (filters.powerUnit === "kw" && (digits(filters.powerKwFrom) || digits(filters.powerKwTo))) range(site.power.key, filters.powerKwFrom, filters.powerKwTo);
    else range(site.power.key, filters.powerFrom, filters.powerTo, KW_PER_HP, Math.floor, Math.ceil);
    range("engineDisplacement", filters.displacementFrom, filters.displacementTo);
    range(site.seats, filters.seatsFrom, filters.seatsTo);
    return { selection, groups, ranges, query: selection.query, skipped };
  }

  function buildApiUrl(market, filters, { offset = 0, limit = PAGE_SIZE, desc = false, price = null } = {}) {
    const site = SITES[market];
    const parts = searchParts(filters, { price, market });
    const query = [`l1CategoryId=${CARS}`];
    if (parts.selection.makeId) query.push(`l2CategoryIds=${parts.selection.makeId}`);
    // "Te koop" (not lease), as the site shows by default.
    query.push("attributesById[]=10882");
    parts.groups.flat().forEach((id) => query.push(`attributesById[]=${id}`));
    parts.ranges.forEach((item) => query.push(`attributeRanges[]=${encodeURIComponent(`${item.key}:${item.from ?? "null"}:${item.to ?? "null"}`)}`));
    if (parts.query) query.push(`query=${encodeURIComponent(parts.query)}`, "searchInTitleAndDescription=true");
    query.push(`sortBy=PRICE`, `sortOrder=${desc ? "DECREASING" : "INCREASING"}`, `limit=${limit}`, `offset=${offset}`);
    return `${site.host}/lrp/api/search?${query.join("&")}`;
  }

  // The site's own link: the same search in the hash of the make's page.
  function buildSearchUrl(market, filters) {
    const site = SITES[market];
    const parts = searchParts(filters, { market });
    const path = parts.selection.makeKey ? `/l/auto-s/${parts.selection.makeKey}/` : "/l/auto-s/";
    const hash = [];
    const ids = parts.groups.flat();
    if (ids.length) hash.push(`f:${ids.join(",")}`);
    parts.ranges.forEach((item) => {
      if (item.from !== null) hash.push(`${item.key}From:${item.from}`);
      if (item.to !== null) hash.push(`${item.key}To:${item.to}`);
    });
    if (parts.query) hash.push(`q:${encodeURIComponent(parts.query).replace(/%20/g, "+")}`);
    hash.push("sortBy:PRICE", "sortOrder:INCREASING");
    return `${site.host}${path}#${hash.join("|")}`;
  }

  // Only a fixed asking price is a price: bids ("Bieden", MIN_BID), "op aanvraag"
  // and "zie omschrijving" are left out of the market.
  function parseListings(market, data, { offset = 0, desc = false, total = 0 } = {}) {
    const site = SITES[market];
    const all = total || Number(data?.totalResultCount) || 0;
    return (data?.listings || []).map((item, index) => {
      if (item?.priceInfo?.priceType !== "FIXED") return null;
      const price = Number(item.priceInfo.priceCents) / 100;
      if (!Number.isFinite(price) || price < 300) return null;
      const attr = (key) => [...(item.attributes || []), ...(item.extendedAttributes || [])].find((entry) => entry.key === key);
      const value = (key) => String(attr(key)?.value || "");
      const options = attr("options")?.values || [];
      const position = offset + index + 1;
      const advertiser = value("advertiser");
      // "150 pk" (Marktplaats, 2dehands "engineHorsepowerBE") or "100 kW"
      // (2dehands "enginePowerKW"), as hp ("KM") for the analysis.
      const hp = Number(digits(value("engineHorsepower") || value("engineHorsepowerBE")));
      const kw = Number(digits(value("enginePowerKW")));
      const power = hp || (kw ? Math.round(kw * 1.35962) : 0);
      return {
        id: String(item.itemId || ""),
        url: item.vipUrl ? new URL(item.vipUrl, site.host).toString() : "",
        title: String(item.title || "").slice(0, 160),
        source: market,
        price,
        currency: "EUR",
        year: Number(value("constructionYear")) || "",
        mileage: Number(digits(value("mileage"))) || "",
        power: power ? `${power} KM` : "",
        fuel: value("fuel").slice(0, 40),
        gearbox: value("transmission").slice(0, 20),
        body: value("body").slice(0, 40),
        country: String(item.location?.countryAbbreviation || site.country).toUpperCase(),
        city: String(item.location?.cityName || "").slice(0, 80),
        seller: /bedrijf|professionnel|professional/i.test(advertiser) ? "dealer" : /particulier/i.test(advertiser) ? "private" : "",
        sellerName: String(item.sellerInformation?.sellerName || "").slice(0, 80),
        // "BTW verrekenbaar": the price includes VAT the buyer can deduct.
        vatDeductible: options.some((option) => /btw verrekenbaar/i.test(option)) || /btw verrekenbaar/i.test(value("btwv")),
        displacementCcm: Number(digits(value("engineDisplacement"))) || null,
        rank: all ? (desc ? all - position + 1 : position) : position,
        marketTotal: all,
      };
    }).filter(Boolean);
  }

  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  async function fetchJson(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "text" } });
    if (!response.ok) throw new Error(String(response.status));
    const text = await response.text();
    const json = text.trim().startsWith("{") ? text : new DOMParser().parseFromString(text, "text/html").body.textContent;
    return JSON.parse(json);
  }

  // ---- Page 1: live count and the search link -------------------------------------
  const counts = new Map();
  const countRequests = {};
  async function refreshMarketCount(market, filters) {
    const target = document.querySelector(`[data-mobile-search-count-${market}]`);
    if (!target) return;
    target.title = TEXT[lang()].countTitle[market];
    if (!filters?.brand || !filters?.model) {
      target.textContent = "—";
      return;
    }
    let url;
    try {
      url = buildApiUrl(market, filters, { limit: 1 });
    } catch {
      target.textContent = "—";
      return;
    }
    if (counts.has(url)) {
      target.textContent = counts.get(url);
      return;
    }
    const request = (countRequests[market] = (countRequests[market] || 0) + 1);
    target.textContent = "…";
    try {
      const data = await fetchJson(url);
      const label = new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(Number(data?.totalResultCount) || 0);
      counts.set(url, label);
      if (request === countRequests[market]) target.textContent = label;
    } catch {
      if (request === countRequests[market]) target.textContent = "—";
    }
  }
  // Counted only while compared: every count is a proxy request.
  window.AUTOGOOD_MARKTPLAATS_REFRESH_COUNT = (filters) => {
    const picked = typeof window.AUTOGOOD_SELECTED_MARKETS === "function" ? window.AUTOGOOD_SELECTED_MARKETS() : Object.keys(SITES);
    Object.keys(SITES).filter((market) => picked.includes(market)).forEach((market) => refreshMarketCount(market, filters));
  };

  Object.keys(SITES).forEach((market) => {
    document.querySelectorAll(`[data-mobile-${market}-search]`).forEach((link) => link.addEventListener("click", (event) => {
      try {
        const filters = readManualFields();
        const url = buildSearchUrl(market, filters);
        link.href = url;
        window.AUTOGOOD_MOBILE_LOG_SEARCH?.(url);
        const { skipped } = searchParts(filters, { market });
        setMarketSearchStatus(skipped.length
          ? TEXT[lang()].skipped.replace("{portal}", SITES[market].name).replace("{filters}", skipped.join(", "))
          : TEXT[lang()].opening[market]);
      } catch (error) {
        event.preventDefault();
        link.href = "#";
        setMarketSearchStatus(error.message || SITES[market].name, true);
      }
    }));
  });
  function renderI18n() {
    Object.keys(SITES).forEach((market) => document.querySelectorAll(`[data-mobile-${market}-search]`).forEach((node) => {
      node.setAttribute("aria-label", TEXT[lang()].search[market]);
      node.title = TEXT[lang()].search[market];
    }));
  }
  renderI18n();
  document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", () => window.setTimeout(renderI18n, 0)));

  window.AUTOGOOD_MARKTPLAATS = {
    SITES,
    PAGE_SIZE,
    MAX_OFFSET,
    modelSelection,
    searchParts,
    buildApiUrl,
    buildSearchUrl,
    parseListings,
    fetchJson,
    // Each site its own list: 2dehands takes the warranty, hatchback and
    // sedan only approximately.
    skippedFilterLabels: (filters, market = "marktplaats") => searchParts(filters, { market }).skipped,
  };
})();
