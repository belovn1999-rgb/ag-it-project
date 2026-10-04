// ---- av.by (Belarus) -------------------------------------------------------
// The same manual filters as mobile.de, otomoto and Blocket, sent to av.by.
// av.by's own API (api.av.by, open to browsers: CORS *) takes the search as a
// list of properties; it answers the offers, their count and the site's own
// link for that search (seo.currentPage.url), and echoes the filters it
// accepted in initialValue — a property or value it does not know is
// silently dropped (see docs/FILTERS-MOBILE-OTOMOTO.md, section 5c).
// Loaded after mobile.js and blocket-search.js: uses their helpers
// (rangeBounds, manualFuelValues, copy, state, the blocket* model matching).

const AVBY_API = "https://api.av.by/offer-types/cars";
const AVBY_SEARCH_URL = "https://cars.av.by/filter";
const AVBY_SORT_CHEAPEST = 2;
const AVBY_SORT_DEAREST = 3;
const USD_PLN_FALLBACK = 3.65;
// av.by answers "429 Too Many Requests" to bursts: one request at a time,
// at least this far apart, and a few patient retries.
const AVBY_REQUEST_GAP_MS = 700;

const avbyCopy = {
  pl: {
    avbySearchButton: "Szukaj na av.by",
    avbySearchOpening: "Otwieram av.by: od najniższej ceny.",
    avbyPriceConverted: "Cena przeliczona na USD po kursie {rate}.",
    avbySearchSkipped: "av.by nie ma dokładnego odpowiednika dla: {filters}. Pozostałe filtry zostały zastosowane.",
    avbyVatNonReclaimable: "VAT marża",
    avbyDoors: "Liczba drzwi",
  },
  ru: {
    avbySearchButton: "Найти на av.by",
    avbySearchOpening: "Открываю av.by: сначала самые дешёвые.",
    avbyPriceConverted: "Цена пересчитана в USD по курсу {rate}.",
    avbySearchSkipped: "В av.by нет точного аналога для: {filters}. Остальные фильтры применены.",
    avbyVatNonReclaimable: "НДС маржа",
    avbyDoors: "Количество дверей",
  },
};

function avbyText(key) {
  return (avbyCopy[state.lang] || avbyCopy.pl)[key] || avbyCopy.pl[key] || key;
}

// ---- Value maps (checked against av.by's filter list, 2026-10-02) ---------

const avbyBodyValues = {
  limousine: [5], // седан
  estate: [2], // универсал
  suv: [6, 23], // внедорожник 5 / 3 дв.
  hatchback: [3, 24], // хэтчбек 5 / 3 дв.
  coupe: [1], // купе
  cabrio: [7, 18], // кабриолет, родстер
  van_minibus: [4, 11], // минивэн, микроавтобус пассажирский
  pickup: [8],
  other: [19], // другой
};

const avbyFuelValues = {
  petrol: [1],
  diesel: [5],
  hybrid_petrol: [4],
  hybrid_diesel: [6],
  electric: [7],
  // av.by has no plug-in hybrid of its own: hybrids of both kinds, marked approximate.
  plugin: [4, 6],
};

// Automatic on mobile.de covers every two-pedal gearbox: automat, robot, CVT.
const avbyGearboxValues = { automatic: [1, 3, 4], manual: [2] };
const avbyDriveValues = { fwd: [1], rwd: [2], awd: [3, 4] };
// Private person or company: dealer and company are both "Компания".
const avbySellerValues = { private: [1], dealer: [2], company: [2] };

const avbyExteriorColorValues = {
  white: 1,
  yellow: 3,
  green: 4,
  brown: 5,
  red: 6,
  orange: 7,
  silver: 8,
  grey: 9,
  blue: 10,
  purple: 11,
  black: 12,
};

const avbyInteriorMaterialValues = {
  full_leather: 1, // натуральная кожа
  cloth: 3, // ткань
  alcantara: 5, // алькантара
  part_leather: 6, // комбинированные материалы (approximate)
};

// av.by "Опции": several values mean "has all of them", as in the form.
const avbyFeatureOptions = {
  LED_HEADLIGHTS: 20,
  XENON_HEADLIGHTS: 18,
  BI_XENON_HEADLIGHTS: 18,
  LASER_HEADLIGHTS: 66,
  GLARE_FREE_HIGH_BEAM: 65,
  ADAPTIVE_BENDING_LIGHTS: 67,
  PANORAMIC_GLASS_ROOF: 17,
  ROOF_RAILS: 14,
  AIR_SUSPENSION: 84,
  ALLOY_WHEELS: 13,
  ELECTRIC_HEATED_SEATS: 23,
  ELECTRIC_HEATED_REAR_SEATS: 23,
  HEATED_STEERING_WHEEL: 26,
  HEATED_WINDSHIELD: 24,
  VENTILATED_SEATS: 72,
  MASSAGE_SEATS: 78,
  MEMORY_SEATS: 80,
  ELECTRIC_ADJUSTABLE_SEATS: 37,
  ELECTRIC_FRONT_SEATS: 37,
  ELECTRIC_TAILGATE: 81,
  KEYLESS_ENTRY: 85,
  NAVIGATION_SYSTEM: 33,
  CARPLAY: 73,
  ANDROID_AUTO: 74,
  HEAD_UP_DISPLAY: 57,
  WIRELESS_CHARGING: 82,
  DIGITAL_COCKPIT: 64,
  TRAFFIC_SIGN_RECOGNITION: 51,
  NIGHT_VISION_ASSIST: 53,
  BLIND_SPOT_MONITOR: 12,
};
// Sent, but wider than asked: named to the user.
const avbyApproximateFeatures = new Set(["BI_XENON_HEADLIGHTS", "ELECTRIC_HEATED_REAR_SEATS", "ELECTRIC_FRONT_SEATS"]);

const avbyParkingOptions = {
  REAR_VIEW_CAM: 10,
  CAM_360_DEGREES: 47,
  AUTOMATIC_PARKING: 48,
  FRONT_SENSORS: 11, // парктроники: front and rear are not told apart
  REAR_SENSORS: 11,
  FRONT_REAR_SENSORS: 11,
};

const avbyAirConditioningOptions = {
  manual: 22, // кондиционер
  automatic: 21, // климат-контроль однозонный
  automatic_2_zones: 71, // климат-контроль многозонный
  automatic_3_zones: 71,
  automatic_4_zones: 71,
};

const AVBY_OPTION = { TRAILER: 15, CRUISE: 35, ADAPTIVE_CRUISE: 58 };
// av.by condition: 5 new, 2 used, 3 damaged, 4 for parts.
const AVBY_CONDITION = { NEW: 5, USED: 2, DAMAGED: 3, PARTS: 4 };

// ---- Make and model ----------------------------------------------------------

const avbyMakeAliases = {
  "Mercedes Trucks": "Mercedes-Benz",
  "Mercedes Vans": "Mercedes-Benz",
  "Vw Nutzfahrzeuge": "Volkswagen",
};

function avbyCatalogMake(brand) {
  const makes = window.AUTOGOOD_AVBY_CATALOG?.makes || {};
  const wanted = blocketToken(avbyMakeAliases[brand] || brand);
  const name = Object.keys(makes).find((candidate) => blocketToken(candidate) === wanted);
  return name ? { name, ...makes[name] } : null;
}

// av.by names a family where mobile.de names an engine: BMW "320" is the
// "3 серия", Mercedes "C 200" the "C-Класс", Lexus "RX 450h" the "RX".
// (Cyrillic words vanish when names are normalised: "3 серия" reads "3".)
function avbyFamilyName(brand, model) {
  // MINI: av.by names the body ("Countryman", "Cabrio"); the plain car is "Hatch".
  if (brand === "Mini") {
    const body = model.match(/(?:^|\s)(Countryman|Clubman|Clubvan|Paceman|Aceman|Cabrio|Coup[eé]|Roadster)(?=\s|$)/i)?.[1];
    if (/^Cooper SE$/i.test(model)) return "Cooper SE";
    if (/clubvan/i.test(body || "")) return "Clubman";
    return body ? body.replace(/é/i, "e") : "Hatch";
  }
  // VW T4–T7: the body named after it, else the van family as a whole.
  const van = brand === "Volkswagen" && model.match(/^T[3-7]\b\s*(.*)$/i);
  if (van) return /multivan|caravelle|california|transporter/i.test(van[1]) ? van[1].split(" ")[0] : "Transporter";
  // Porsche 991, 992, 997… are all the 911.
  if (brand === "Porsche" && /^9\d\d$/.test(model) && !["912", "914", "918", "924", "928", "944", "959", "962", "968"].includes(model)) return "911";
  const bmw = brand === "BMW" && model.match(/^M?([1-8])\d{2}[a-z]{0,2}\b\s*(.*)$/i);
  if (bmw) return `${bmw[1]} ${bmw[2]}`.trim();
  const lettered = model.match(/^([A-Za-z]{1,4})\s+\d{2,3}[a-z]{0,2}\b\s*(.*)$/);
  if (lettered) return `${lettered[1]} ${lettered[2]}`.trim();
  return "";
}

// { ids, text, broad, unsupported }: av.by model ids (several = "or") and
// the words searched in the ad text (av.by "Поиск по словам в объявлении").
function avbyModelSelection(brand, model, version = "") {
  const cleanModel = String(model || "").trim();
  const cleanVersion = String(version || "").trim();
  if (!brand) return { makeId: null, ids: [], text: [cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: false };
  const make = avbyCatalogMake(brand);
  if (!make) {
    return { makeId: null, ids: [], text: [brand, cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: true };
  }
  const base = { makeId: make.id, ids: [], text: cleanVersion, broad: false, unsupported: false };
  if (!cleanModel || /^(other|другие|другая)$/i.test(cleanModel)) return { ...base, broad: Boolean(cleanModel) };
  const nodes = make.models;
  const result = (found, broad) => ({ ...base, ids: [...new Set(found.map((node) => node.id))], broad });

  const alternatives = blocketModelAlternatives(brand, cleanModel);
  const ourModels = blocketOurModels(brand);
  const separateFor = (name) => ourModels.filter((other) => {
    const token = blocketToken(other);
    return token.length > blocketToken(name).length && blocketInFamily(other, name);
  });

  const exact = alternatives.flatMap((name) => blocketFamily(nodes, name, separateFor(name), ourModels));
  if (exact.length) return result(exact, false);

  // The family av.by sells it under: BMW 320 -> 3 серия, C 63 AMG -> C-Класс AMG.
  for (const name of [cleanModel, ...alternatives]) {
    const family = avbyFamilyName(brand, name);
    if (!family) continue;
    const found = nodes.filter((node) => blocketToken(node.name) === blocketToken(family));
    if (found.length) return result(found, true);
    // "CLA 35 AMG Shooting Brake" -> CLA AMG.
    const amg = /\bAMG\b/i.test(family) && nodes.filter((node) => blocketToken(node.name) === blocketToken(`${family.split(" ")[0]} AMG`));
    if (amg?.length) return result(amg, true);
    const head = family.split(" ")[0];
    const series = nodes.filter((node) => blocketToken(node.name) === blocketToken(head));
    if (series.length) return result(series, true);
  }

  // A broader model the requested name opens with ("X5 M50" -> X5).
  for (const name of alternatives) {
    const words = blocketWords(name);
    for (let count = words.length - 1; count >= 1; count -= 1) {
      const opener = words.slice(0, count).join(" ");
      // Only a real av.by model of that name opens a family ("ID." is no model).
      if (!nodes.some((node) => blocketToken(node.name) === blocketToken(opener))) continue;
      const family = blocketFamily(nodes, opener, separateFor(opener), ourModels);
      if (family.length) return result(family, true);
    }
  }

  // Unknown model: searched as words of the ad within the make.
  return { ...base, text: [cleanModel, cleanVersion].filter(Boolean).join(" "), broad: true };
}

// ---- Exchange rate ------------------------------------------------------------
// The form's EUR go to av.by's USD through PLN at the calculator's source
// (Walutomat), like SEK for Blocket.

let avbyUsdRatePromise = null;
function avbyUsdPlnRate() {
  if (!avbyUsdRatePromise) {
    avbyUsdRatePromise = (async () => {
      const response = await fetch("https://api.walutomat.pl/api/v2.0.0/market_fx/best_offers?currencyPair=USDPLN", { cache: "no-store" });
      const data = response.ok ? await response.json() : null;
      const offer = data?.result?.asks?.[0] || data?.result?.bids?.[0];
      const value = Number(offer?.price);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Walutomat USD rate unavailable");
      return value;
    })().catch(() => USD_PLN_FALLBACK).then((value) => {
      window.AUTOGOOD_USD_PLN_RATE = value;
      return value;
    });
  }
  return avbyUsdRatePromise;
}
avbyUsdPlnRate();

function usdPlnRate() {
  const rate = Number(window.AUTOGOOD_USD_PLN_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : USD_PLN_FALLBACK;
}

function eurUsdRate() {
  return eurPlnRate() / usdPlnRate();
}

// ---- The search as av.by properties ----------------------------------------

function avbyRange(fromValue, toValue, transform = (value) => value) {
  const { from, to } = rangeBounds(fromValue, toValue);
  if (from !== null && to !== null && from > to) throw new Error(copy[state.lang].marketSearchInvalidRange);
  if (from === null && to === null) return null;
  const range = {};
  if (from !== null) range.min = transform(from);
  if (to !== null) range.max = transform(to);
  return range;
}

// A list filter goes over only when every chosen value has a twin: sending
// the others alone would hide cars the user asked for.
function avbyAllOrNothing(values, map) {
  const mapped = values.map((value) => map[value]);
  return values.length && mapped.every((value) => value !== undefined) ? [...new Set(mapped.flat())] : [];
}

function avbySeatValues(filters) {
  const { from, to } = rangeBounds(filters.seatsFrom, filters.seatsTo);
  if (from === null && to === null) return [];
  // av.by lists 6, 7, 8 and 9 seats only: a range reaching below 6 has no twin.
  if ((from ?? 0) < 6) return [];
  const ids = { 6: 3, 7: 2, 8: 4, 9: 5 };
  return [6, 7, 8, 9].filter((seats) => seats >= from && seats <= (to ?? 9)).map((seats) => ids[seats]);
}

function avbyConditions(filters) {
  let wanted = [AVBY_CONDITION.NEW, AVBY_CONDITION.USED, AVBY_CONDITION.DAMAGED, AVBY_CONDITION.PARTS];
  if (filters.newUsed === "new") wanted = [AVBY_CONDITION.NEW];
  if (filters.newUsed === "used") wanted = wanted.filter((value) => value !== AVBY_CONDITION.NEW);
  if (filters.damagedVehicles !== "show") wanted = wanted.filter((value) => value !== AVBY_CONDITION.DAMAGED && value !== AVBY_CONDITION.PARTS);
  return wanted.length === 4 ? [] : wanted;
}

// [name, value] pairs in the order av.by's own links use.
function avbyProperties(filters) {
  if (filters.model && !filters.brand) throw new Error(copy[state.lang].marketSearchChooseBrand);
  const properties = [];
  const add = (name, value) => {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return;
    properties.push([name, value]);
  };
  const selection = avbyModelSelection(filters.brand, filters.model, filters.version);
  if (selection.makeId) {
    add("brands", selection.ids.length
      ? selection.ids.map((id) => ({ brand: selection.makeId, model: id }))
      : [{ brand: selection.makeId }]);
  }
  add("year", avbyRange(filters.yearFrom, filters.yearTo));
  if (filters.avbyPriceUsd) {
    // A price already in USD (a favourite's own av.by price, page 4).
    const { from, to } = filters.avbyPriceUsd;
    add("price_usd", from === null && to === null ? null : { ...(from !== null ? { min: Math.round(from) } : {}), ...(to !== null ? { max: Math.round(to) } : {}) });
  } else {
    const priceTo = String(filters.priceTo || "").trim().endsWith("+") ? "" : filters.priceTo;
    const rate = eurUsdRate();
    add("price_usd", avbyRange(filters.priceFrom, priceTo, (eur) => Math.round(eur * rate)));
  }
  add("engine_capacity", avbyRange(filters.displacementFrom, filters.displacementTo));
  add("transmission_type", avbyGearboxValues[filters.gearbox] || []);
  add("body_type", avbyBodyValues[filters.body] || []);
  add("engine_type", [...new Set(manualFuelValues(filters).flatMap((fuel) => avbyFuelValues[fuel] || []))]);
  add("drive_type", avbyDriveValues[filters.drive] || []);
  // Form power is KM (metric horsepower) = av.by л.с.
  add("engine_power_hp", avbyRange(filters.powerFrom, filters.powerTo));
  add("description", selection.text);
  add("seller_type", avbySellerValues[filters.seller] || []);
  add("condition", avbyConditions(filters));
  add("mileage_km", avbyRange(filters.mileageFrom, filters.mileageTo));
  if (filters.vat === "reclaimable") add("has_nds", true);
  add("color", avbyAllOrNothing(filters.exteriorColors || [], avbyExteriorColorValues));
  add("interior_material", avbyAllOrNothing(filters.interiorMaterials || [], avbyInteriorMaterialValues));
  add("number_of_seats", avbySeatValues(filters));

  const options = [];
  const option = (value) => {
    if (value && !options.includes(value)) options.push(value);
  };
  option(avbyAirConditioningOptions[filters.airConditioning]);
  if (filters.trailerCoupling && filters.trailerCoupling !== "any") option(AVBY_OPTION.TRAILER);
  if (filters.cruiseControl === "CRUISE_CONTROL") option(AVBY_OPTION.CRUISE);
  if (filters.cruiseControl === "ADAPTIVE_CRUISE_CONTROL") option(AVBY_OPTION.ADAPTIVE_CRUISE);
  (filters.parkingSensors || []).forEach((sensor) => option(avbyParkingOptions[sensor]));
  (filters.features || []).forEach((feature) => option(avbyFeatureOptions[feature]));
  add("options", options);
  return properties;
}

// The API body: av.by's own shape for each property.
function avbyApiBody(filters, { page = 1, sorting = AVBY_SORT_CHEAPEST } = {}) {
  const properties = avbyProperties(filters).map(([name, value]) => {
    if (name === "brands") {
      return { name, value: value.map((item) => [{ name: "brand", value: item.brand }, ...(item.model ? [{ name: "model", value: item.model }] : [])]) };
    }
    return { name, value };
  });
  if (properties.some((property) => property.name === "price_usd")) properties.push({ name: "price_currency", value: 2 });
  return { page, properties, sorting };
}

// The public link, written exactly the way av.by writes its own.
function buildAvbySearchUrl(filters, { sorting = AVBY_SORT_CHEAPEST } = {}) {
  const parts = [];
  const push = (key, value) => parts.push(`${key}=${encodeURIComponent(value)}`);
  avbyProperties(filters).forEach(([name, value]) => {
    if (name === "brands") {
      value.forEach((item, index) => {
        push(`brands[${index}][brand]`, item.brand);
        if (item.model) push(`brands[${index}][model]`, item.model);
      });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => push(`${name}[${index}]`, item));
    } else if (value && typeof value === "object") {
      if (value.min !== undefined) push(`${name}[min]`, value.min);
      if (value.max !== undefined) push(`${name}[max]`, value.max);
    } else if (value === true) {
      push(name, 1);
    } else {
      push(name, value);
    }
  });
  push("sort", sorting);
  return `${AVBY_SEARCH_URL}?${parts.join("&")}`;
}

// Filters av.by cannot express exactly: left out (or widened) and named to the user.
function avbySkippedFilterLabels(filters) {
  const c = copy[state.lang];
  const labels = [];
  const add = (label) => {
    if (label && !labels.includes(label)) labels.push(label);
  };
  const selection = avbyModelSelection(filters.brand, filters.model, filters.version);
  if (selection.unsupported) add(c.brandLabel);
  if (selection.broad) add(c.modelLabel);
  if (manualFuelValues(filters).includes("plugin")) add(c.fuelLabel);
  if (avbyRangeSet(filters.seatsFrom, filters.seatsTo) && !avbySeatValues(filters).length) add(c.seatsRangeLabel);
  if (avbyRangeSet(filters.doorsFrom, filters.doorsTo)) add(avbyText("avbyDoors"));
  // "Цена с НДС" is the closest to a reclaimable VAT; margin VAT has no twin.
  if (filters.vat === "reclaimable") add(c.vatLabel || "VAT");
  if (filters.vat === "non_reclaimable") add(avbyText("avbyVatNonReclaimable"));
  if (["dealer", "company"].includes(filters.seller)) add(c.sellerTypeLabel);
  if ((filters.countries || []).length) add(c.countryLabel);
  const materials = filters.interiorMaterials || [];
  if (materials.includes("part_leather") || (materials.length && !avbyAllOrNothing(materials, avbyInteriorMaterialValues).length)) add(c.interiorMaterialLabel);
  if (["automatic_3_zones", "automatic_4_zones"].includes(filters.airConditioning)) add(c.airConditioningLabel);
  if (filters.trailerCoupling && filters.trailerCoupling !== "any") add(c.trailerCouplingLabel);
  (filters.features || [])
    .filter((feature) => !avbyFeatureOptions[feature] || avbyApproximateFeatures.has(feature))
    .forEach((feature) => {
      const input = els.features.find((candidate) => candidate.value === feature);
      add(input ? optionLabelText(input) : feature);
    });
  const parking = filters.parkingSensors || [];
  if (parking.some((sensor) => !avbyParkingOptions[sensor] || /SENSORS$/.test(sensor))) add(c.parkingSensorsLabel);
  const colors = filters.exteriorColors || [];
  if (colors.length && !avbyAllOrNothing(colors, avbyExteriorColorValues).length) add(c.exteriorColorLabel);
  if ((filters.interiorColors || []).length) add(c.interiorColorLabel);
  if (filters.matte) add(c.matteLabel);
  if (filters.metallic) add(c.metallicLabel);
  if (filters.nonSmoking) add(c.nonSmokingLabel);
  // Hiding damaged cars already leaves out the ones sold for parts.
  if (filters.roadworthy && filters.damagedVehicles === "show") add(c.roadworthyLabel);
  if (filters.slidingDoor) add(c.slidingDoorLabel);
  if (filters.warranty) add(c.warrantyLabel);
  if (filters.serviceHistory) add(c.serviceHistoryLabel);
  if (filters.accidentFree) add(c.accidentFreeLabel);
  if (filters.firstOwner) add(c.firstOwnerLabel);
  return labels;
}

function avbyRangeSet(fromValue, toValue) {
  const { from, to } = rangeBounds(fromValue, toValue);
  return from !== null || to !== null;
}

// ---- Reading av.by --------------------------------------------------------------

let avbyQueue = Promise.resolve();
let avbyLastRequest = 0;

// Every av.by request waits its turn and keeps av.by's pace; 429 is retried.
function avbyRequest(path, body) {
  const run = async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const wait = avbyLastRequest + AVBY_REQUEST_GAP_MS * (attempt + 1) - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      avbyLastRequest = Date.now();
      const response = await fetch(`${AVBY_API}${path}`, body
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {});
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }
    throw new Error("429");
  };
  const result = avbyQueue.then(run, run);
  avbyQueue = result.catch(() => {});
  return result;
}

function fetchAvbySearch(filters, options = {}) {
  return avbyRequest("/filters/main/apply", avbyApiBody(filters, options));
}

window.AUTOGOOD_AVBY = {
  buildSearchUrl: buildAvbySearchUrl,
  apiBody: avbyApiBody,
  properties: avbyProperties,
  modelSelection: avbyModelSelection,
  skippedFilterLabels: avbySkippedFilterLabels,
  search: fetchAvbySearch,
  offer: (id) => avbyRequestOffer(id),
  eurUsdRate,
  usdPlnRate,
  usdRateReady: avbyUsdPlnRate,
  sortCheapest: AVBY_SORT_CHEAPEST,
  sortDearest: AVBY_SORT_DEAREST,
  sortNewest: 4,
};

// One ad: https://api.av.by/offers/<id> (a different path than the search).
function avbyRequestOffer(id) {
  const run = async () => {
    const wait = avbyLastRequest + AVBY_REQUEST_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    avbyLastRequest = Date.now();
    const response = await fetch(`https://api.av.by/offers/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  };
  const result = avbyQueue.then(run, run);
  avbyQueue = result.catch(() => {});
  return result;
}

// ---- Buttons and live count --------------------------------------------------

document.querySelectorAll("[data-mobile-avby-search]").forEach((link) => link.addEventListener("click", (event) => {
  try {
    const filters = readManualFields();
    const searchUrl = buildAvbySearchUrl(filters);
    link.href = searchUrl;
    window.AUTOGOOD_MOBILE_LOG_SEARCH?.(searchUrl);
    const skipped = avbySkippedFilterLabels(filters);
    const converted = filters.priceFrom || filters.priceTo
      ? ` ${avbyText("avbyPriceConverted").replace("{rate}", `1 € = ${eurUsdRate().toFixed(3)} $`)}`
      : "";
    setMarketSearchStatus((skipped.length
      ? avbyText("avbySearchSkipped").replace("{filters}", skipped.join(", "))
      : avbyText("avbySearchOpening")) + converted);
  } catch (error) {
    event.preventDefault();
    link.href = "#";
    setMarketSearchStatus(error.message || copy[state.lang].marketSearchInvalidRange, true);
  }
}));

const avbyCounts = new Map();
let avbyCountRequest = 0;

window.AUTOGOOD_AVBY_REFRESH_COUNT = async (filters) => {
  const target = document.querySelector("[data-mobile-search-count-avby]");
  if (!target) return;
  const show = (text) => {
    target.textContent = text;
  };
  if (!filters?.brand || !filters?.model) {
    show("—");
    return;
  }
  let key;
  try {
    await avbyUsdPlnRate();
    key = buildAvbySearchUrl(filters);
  } catch {
    show("—");
    return;
  }
  if (avbyCounts.has(key)) {
    show(avbyCounts.get(key));
    return;
  }
  const request = ++avbyCountRequest;
  show(copy[state.lang].offerCountLoading);
  try {
    const data = await fetchAvbySearch(filters);
    const label = new Intl.NumberFormat(state.lang === "ru" ? "ru-RU" : "pl-PL").format(Number(data?.count) || 0);
    avbyCounts.set(key, label);
    if (request === avbyCountRequest) show(label);
  } catch {
    if (request === avbyCountRequest) show("—");
  }
};

function renderAvbyI18n() {
  document.querySelectorAll("[data-avby-i18n]").forEach((node) => {
    node.textContent = avbyText(node.dataset.avbyI18n);
  });
  document.querySelectorAll("[data-mobile-avby-search][aria-label]").forEach((node) => {
    node.setAttribute("aria-label", avbyText("avbySearchButton"));
    node.title = avbyText("avbySearchButton");
  });
}
renderAvbyI18n();
document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", () => {
  window.setTimeout(renderAvbyI18n, 0);
}));
