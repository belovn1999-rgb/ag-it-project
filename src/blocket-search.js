// ---- Blocket.se (Sweden) ---------------------------------------------------
// The same manual filters as mobile.de and otomoto, sent to Blocket's car
// search. Blocket's public page and its JSON API take the same parameters, and
// the API echoes every filter it applied in metadata.selected_filters; a
// parameter it does not know is silently dropped (see
// docs/FILTERS-MOBILE-OTOMOTO.md, Blocket columns). Loaded after mobile.js and
// uses its helpers (rangeBounds, manualFuelValues, doorRangeBounds, copy, state).

const BLOCKET_SEARCH_URL = "https://www.blocket.se/mobility/search/car";
const BLOCKET_API_URL = "https://www.blocket.se/mobility/search/api/search/SEARCH_ID_CAR_USED";
// 1 Swedish mil = 10 km; Blocket's mileage filter and ads count in mil.
const BLOCKET_KM_PER_MIL = 10;
const SEK_PLN_FALLBACK = 0.385;

const blocketCopy = {
  pl: {
    blocketSearchButton: "Szukaj na blocket.se",
    blocketSearchOpening: "Otwieram Blocket: od najniższej ceny.",
    blocketPriceConverted: "Cena przeliczona na SEK po kursie {rate}.",
    blocketSearchSkipped: "Blocket nie ma dokładnego odpowiednika dla: {filters}. Pozostałe filtry zostały zastosowane.",
    blocketNoTwin: "Blocket nie ma odpowiednika dla tego wyszukiwania.",
    blocketVatNonReclaimable: "VAT marża",
    blocketDoors: "Liczba drzwi",
  },
  ru: {
    blocketSearchButton: "Найти на blocket.se",
    blocketSearchOpening: "Открываю Blocket: сначала самые дешёвые.",
    blocketPriceConverted: "Цена пересчитана в SEK по курсу {rate}.",
    blocketSearchSkipped: "В Blocket нет точного аналога для: {filters}. Остальные фильтры применены.",
    blocketNoTwin: "В Blocket нет аналога для этого поиска.",
    blocketVatNonReclaimable: "НДС маржа",
    blocketDoors: "Количество дверей",
  },
};

function blocketText(key) {
  return (blocketCopy[state.lang] || blocketCopy.pl)[key] || blocketCopy.pl[key] || key;
}

// ---- Value maps (checked against the live filter list, 2026-09-27) ---------

const blocketBodyValues = {
  limousine: ["3"], // Sedan
  estate: ["4"], // Kombi
  suv: ["9"],
  hatchback: ["1", "2"], // Halvkombi 3- and 5-door
  coupe: ["6"],
  cabrio: ["7"],
  van_minibus: ["5"], // Familjebuss
  pickup: ["8"],
  other: ["11"], // Annat
};

const blocketFuelValues = {
  petrol: ["1"],
  diesel: ["2"],
  electric: ["4"],
  hybrid_petrol: ["6"],
  hybrid_diesel: ["8"],
  plugin: ["1352", "1356"], // Plug-in bensin, Plug-in diesel
};

const blocketDriveValues = { awd: "2", fwd: "3", rwd: "1" };
const blocketGearboxValues = { automatic: "2", manual: "1" };
// Blocket has private and business sellers only: dealer and company are both "Företag".
const blocketSellerValues = { dealer: "2", company: "2", private: "3" };

const blocketExteriorColorValues = {
  beige: "1",
  blue: "2",
  brown: "4",
  green: "5",
  grey: "6",
  yellow: "7",
  gold: "8",
  white: "9",
  purple: "10",
  orange: "11",
  red: "13",
  black: "14",
  silver: "15",
};

// Blocket "Utrustning" (car_equipment); several values mean "has all of them".
const blocketEquipment = {
  AC: "9",
  CARPLAY: "1588",
  REAR_VIEW_CAM: "67",
  TRAILER: "23",
  CRUISE_CONTROL: "11",
  LEATHER: "12", // leather or part leather
  REAR_SENSORS: "49",
  SUNROOF: "1", // sunroof or glass roof
};

// Leasing ads carry a monthly price: only cars for sale (used and new) are compared.
const blocketSalesForms = ["1", "2"];

// ---- Make and model ---------------------------------------------------------

const blocketMakeAliases = {
  ORA: "GWM",
  "Mercedes Trucks": "Mercedes-Benz",
  "Mercedes Vans": "Mercedes-Benz",
  "Vw Nutzfahrzeuge": "Volkswagen",
};

// "Prius+" is not "Prius": the plus survives normalising.
function blocketNormal(value) {
  return normalizeToken(String(value || "").replace(/\+/g, " plus "));
}

function blocketToken(value) {
  return blocketNormal(value).replace(/ /g, "");
}

function blocketCatalogMake(brand) {
  const makes = window.AUTOGOOD_BLOCKET_CATALOG?.makes || {};
  const wanted = blocketToken(blocketMakeAliases[brand] || brand);
  const name = Object.keys(makes).find((candidate) => blocketToken(candidate) === wanted);
  return name ? { name, ...makes[name] } : null;
}

function blocketSeriesToken(name) {
  return blocketToken(String(name || "").replace(/[-\s]*(serie|series|klass|klasse|class)(?=[-\s]|$)/gi, " "));
}

function blocketWords(value) {
  return blocketNormal(value).split(" ").filter(Boolean);
}

// A Blocket model belongs to the requested model family: the same name, a
// generation or trim after it ("Golf VII", "Cayenne Turbo"), the same words in
// another order ("Countryman S (Cooper)" = "Countryman Cooper S"), or an
// engine letter glued to a number ("320" -> 320d, 320i; "C 200" -> C200 d).
function blocketInFamily(nodeName, model) {
  const node = blocketNormal(nodeName);
  const wanted = blocketNormal(model);
  if (!node || !wanted) return false;
  const nodeToken = blocketToken(nodeName);
  const wantedToken = blocketToken(model);
  if (nodeToken === wantedToken) return true;
  // A trim or generation word, never a number: "3" is not "3.0 CS".
  if (node.startsWith(`${wanted} `) && /^[a-z]/.test(node.slice(wanted.length + 1))) return true;
  const sorted = (value) => blocketWords(value).sort().join(" ");
  // Word order only for real names ("Countryman S Cooper"), not "B 180" vs the old "180 B".
  if (blocketWords(model).some((word) => /^[a-z]{3,}$/.test(word)) && sorted(nodeName) === sorted(model)) return true;
  // Engine letters only after a full number ("320" -> 320d), not a series digit ("1" is not 1M).
  return wantedToken.length >= 3
    && /\d$/.test(wantedToken)
    && nodeToken.startsWith(wantedToken)
    && /^[a-z]+$/.test(nodeToken.slice(wantedToken.length));
}

function blocketOurModels(brand) {
  if (typeof modelGroupsForBrand !== "function") return [];
  return modelGroupsForBrand(brand).flatMap((group) => group.models);
}

// Model names that mean the same car on Blocket (checked by hand).
function blocketModelAlternatives(brand, model) {
  let name = String(model || "").trim();
  if (brand === "Mercedes-Benz") name = name.replace(/\s+AMG$/i, "");
  // "cee'd / Ceed", "Ka/Ka+", "Grand C4 Picasso / SpaceTourer": each name on its own.
  return name.split(/\s*\/\s*/).map((part) => part.replace(/[()]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

// Families Blocket keeps under another name (as on otomoto): marked approximate.
function blocketFamilyFallback(brand, model, nodes) {
  const byName = (...names) => nodes.filter((node) => names.some((name) => blocketToken(node.name) === blocketToken(name)));
  if (brand === "Porsche" && /^9\d\d$/.test(model) && !["912", "914", "918", "924", "928", "944", "959", "962", "968"].includes(model)) {
    return byName("911-Serie");
  }
  if (brand === "Mini" && /\bcabrio\b/i.test(model)) return byName("Cabrio");
  if (brand === "Mercedes-Benz" && /^CE(\s|$)/i.test(model)) return byName("E-Klass");
  if (brand === "Mercedes-Benz" && /^ML(\s|$)/i.test(model)) return byName("M-Klass");
  const van = brand === "Volkswagen" && model.match(/^T([1-7])\b\s*(.*)$/i);
  if (van) {
    const body = byName(van[2]);
    if (body.length) return body;
    return Number(van[1]) < 3 ? byName("T1") : byName("Transporter-Serie", "Caravelle-Serie", "Multivan", "California");
  }
  return [];
}

function blocketFamily(nodes, model, separate, ourModels = []) {
  const wanted = blocketNormal(model);
  const ourTokens = new Set(ourModels.map(blocketToken));
  return nodes.filter((node) => {
    if (node.series || !blocketInFamily(node.name, model)) return false;
    if (separate.some((name) => blocketInFamily(node.name, name))) return false;
    // "Focus C-MAX" is the form's own "C-Max", not a Focus.
    const name = blocketNormal(node.name);
    const extra = name.startsWith(`${wanted} `) ? name.slice(wanted.length + 1) : "";
    return !(extra && ourTokens.has(blocketToken(extra)));
  });
}

// { ids, q, broad, unsupported } for one brand/model/version of the form.
function blocketModelSelection(brand, model, version = "") {
  const cleanModel = String(model || "").trim();
  const cleanVersion = String(version || "").trim();
  if (!brand) return { ids: [], q: [cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: false };
  const make = blocketCatalogMake(brand);
  if (!make) {
    // No such make on Blocket: its name searched as text says "nothing like it" honestly.
    return { ids: [], q: [brand, cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: true };
  }
  if (!cleanModel) return { ids: [make.id], q: cleanVersion, broad: false, unsupported: false };
  const result = (nodes, broad) => ({ ids: [...new Set(nodes.map((node) => node.id))], q: cleanVersion, broad, unsupported: false });

  const nodes = make.models;
  if (/^(other|övriga)$/i.test(cleanModel)) {
    const other = nodes.filter((node) => /^övriga$/i.test(node.name));
    return other.length ? result(other, false) : { ids: [make.id], q: cleanVersion, broad: true, unsupported: false };
  }

  const alternatives = blocketModelAlternatives(brand, cleanModel);
  // Models the form lists separately ("Golf Plus", "X5 M") are not part of
  // the requested family, neither are their own trims ("Golf Plus Cross").
  const ourModels = blocketOurModels(brand);
  const separateFor = (name) => ourModels.filter((other) => {
    const token = blocketToken(other);
    return token.length > blocketToken(name).length && blocketInFamily(other, name);
  });

  const exact = alternatives.flatMap((name) => blocketFamily(nodes, name, separateFor(name), ourModels));
  if (exact.length) return result(exact, false);

  // A whole series ("3" -> 3-Serie, "C" -> C-Klass, "T-Class" -> T-Klass).
  const series = alternatives.flatMap((name) => nodes.filter((node) => node.series && blocketSeriesToken(node.name) === blocketSeriesToken(name)));
  if (series.length) return result(series, false);

  const fallback = blocketFamilyFallback(brand, cleanModel, nodes);
  if (fallback.length) return result(fallback, true);

  for (const name of alternatives) {
    const words = blocketWords(name);
    // A body word naming a series ("One D Clubman" -> Clubman-Serie): the
    // series' model made of the requested words ("Clubman One"), else all of it.
    const bodySeries = nodes.find((node) => node.series && words.length > 1 && words.includes(blocketSeriesToken(node.name)));
    if (bodySeries) {
      const bodyWord = blocketSeriesToken(bodySeries.name);
      const trim = words.filter((word) => word !== bodyWord);
      // Only an engine letter may be missing ("One D Clubman" -> "Clubman One"), never a name ("John Cooper Works").
      const inside = nodes
        .filter((node) => {
          if (node.parent !== bodySeries.name) return false;
          const nodeTrim = blocketWords(node.name).filter((word) => word !== bodyWord);
          return nodeTrim.every((word) => trim.includes(word))
            && trim.filter((word) => !nodeTrim.includes(word)).every((word) => /^[a-z]$/.test(word));
        })
        .sort((left, right) => blocketWords(right.name).length - blocketWords(left.name).length);
      const best = inside.length ? inside.filter((node) => blocketWords(node.name).length === blocketWords(inside[0].name).length) : [bodySeries];
      return result(best, true);
    }
    // The broader family the requested name opens with, longest first:
    // "220 Active Tourer" -> 220d/220i, "X5 M50" -> X5, "Kona Elektro" -> Kona.
    for (let count = words.length - 1; count >= 1; count -= 1) {
      const opener = words.slice(0, count).join(" ");
      const family = blocketFamily(nodes, opener, separateFor(opener), ourModels);
      if (family.length) return result(family, true);
    }
  }

  // Unknown model: searched as text within the make, like mobile.de does.
  return { ids: [make.id], q: [cleanModel, cleanVersion].filter(Boolean).join(" "), broad: true, unsupported: false };
}

// ---- Exchange rate ----------------------------------------------------------
// The calculator's source (Walutomat) for SEK too; EUR->SEK goes through PLN
// so every market is converted at one consistent set of rates.

let blocketSekRatePromise = null;
function blocketSekPlnRate() {
  if (!blocketSekRatePromise) {
    blocketSekRatePromise = (async () => {
      const response = await fetch("https://api.walutomat.pl/api/v2.0.0/market_fx/best_offers?currencyPair=SEKPLN", { cache: "no-store" });
      const data = response.ok ? await response.json() : null;
      const offer = data?.result?.asks?.[0] || data?.result?.bids?.[0];
      const value = Number(offer?.price);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Walutomat SEK rate unavailable");
      return value;
    })().catch(() => SEK_PLN_FALLBACK).then((value) => {
      window.AUTOGOOD_SEK_PLN_RATE = value;
      return value;
    });
  }
  return blocketSekRatePromise;
}
blocketSekPlnRate();

function sekPlnRate() {
  const rate = Number(window.AUTOGOOD_SEK_PLN_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : SEK_PLN_FALLBACK;
}

function eurSekRate() {
  return eurPlnRate() / sekPlnRate();
}

// ---- Search URL --------------------------------------------------------------

function blocketRange(params, name, fromValue, toValue, transform = (value) => value) {
  const { from, to } = rangeBounds(fromValue, toValue);
  if (from !== null && to !== null && from > to) throw new Error(copy[state.lang].marketSearchInvalidRange);
  if (from !== null) params.append(`${name}_from`, String(transform(from, "from")));
  if (to !== null) params.append(`${name}_to`, String(transform(to, "to")));
}

function blocketLeatherOnly(filters) {
  const materials = filters.interiorMaterials || [];
  return materials.length > 0 && materials.every((material) => ["part_leather", "full_leather"].includes(material));
}

// Query parameters only; the page and the API take the same ones.
function blocketSearchParams(filters) {
  if (filters.model && !filters.brand) throw new Error(copy[state.lang].marketSearchChooseBrand);
  const params = new URLSearchParams();
  const selection = blocketModelSelection(filters.brand, filters.model, filters.version);
  selection.ids.forEach((id) => params.append("variant", id));
  if (selection.q) params.set("q", selection.q);

  (blocketBodyValues[filters.body] || []).forEach((value) => params.append("body_type", value));
  const priceTo = String(filters.priceTo || "").trim().endsWith("+") ? "" : filters.priceTo;
  const rate = eurSekRate();
  blocketRange(params, "price", filters.priceFrom, priceTo, (eur) => Math.round(eur * rate));
  // Km to mil, never narrower than asked: "from" rounds down, "to" rounds up.
  blocketRange(params, "mileage", filters.mileageFrom, filters.mileageTo, (km, side) => (
    side === "from" ? Math.floor(km / BLOCKET_KM_PER_MIL) : Math.ceil(km / BLOCKET_KM_PER_MIL)
  ));
  blocketRange(params, "year", filters.yearFrom, filters.yearTo);
  // Form power is KM (metric horsepower) = Swedish hk.
  blocketRange(params, "engine_effect", filters.powerFrom, filters.powerTo);

  [...new Set(manualFuelValues(filters).flatMap((fuel) => blocketFuelValues[fuel] || []))]
    .forEach((value) => params.append("fuel", value));
  if (blocketDriveValues[filters.drive]) params.set("wheel_drive", blocketDriveValues[filters.drive]);
  if (blocketGearboxValues[filters.gearbox]) params.set("transmission", blocketGearboxValues[filters.gearbox]);
  if (filters.vat === "reclaimable") params.set("vat_deductible", "true");
  if (blocketSellerValues[filters.seller]) params.set("dealer_segment", blocketSellerValues[filters.seller]);

  const equipment = new Set();
  if (filters.airConditioning && filters.airConditioning !== "any") equipment.add(blocketEquipment.AC);
  if (filters.trailerCoupling && filters.trailerCoupling !== "any") equipment.add(blocketEquipment.TRAILER);
  if (filters.cruiseControl && filters.cruiseControl !== "any") equipment.add(blocketEquipment.CRUISE_CONTROL);
  if (blocketLeatherOnly(filters)) equipment.add(blocketEquipment.LEATHER);
  const features = new Set(filters.features || []);
  if (features.has("CARPLAY")) equipment.add(blocketEquipment.CARPLAY);
  if (features.has("PANORAMIC_GLASS_ROOF")) equipment.add(blocketEquipment.SUNROOF);
  const parking = new Set(filters.parkingSensors || []);
  if (parking.has("REAR_VIEW_CAM")) equipment.add(blocketEquipment.REAR_VIEW_CAM);
  if (parking.has("REAR_SENSORS") || parking.has("FRONT_REAR_SENSORS")) equipment.add(blocketEquipment.REAR_SENSORS);
  equipment.forEach((value) => params.append("car_equipment", value));

  [...new Set((filters.exteriorColors || []).map((color) => blocketExteriorColorValues[color]).filter(Boolean))]
    .forEach((value) => params.append("exterior_colour", value));

  blocketSalesForms.forEach((value) => params.append("sales_form", value));
  params.set("sort", "PRICE_ASC");
  return params;
}

function buildBlocketSearchUrl(filters) {
  return `${BLOCKET_SEARCH_URL}?${blocketSearchParams(filters).toString()}`;
}

function buildBlocketApiUrl(filters, { page = 1, sort = "PRICE_ASC" } = {}) {
  const params = blocketSearchParams(filters);
  params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  return `${BLOCKET_API_URL}?${params.toString()}`;
}

// Filters Blocket cannot express exactly: left out (or widened) and named to the user.
function blocketSkippedFilterLabels(filters) {
  const c = copy[state.lang];
  const labels = [];
  const add = (label) => {
    if (label && !labels.includes(label)) labels.push(label);
  };
  const selection = blocketModelSelection(filters.brand, filters.model, filters.version);
  if (selection.unsupported) add(c.brandLabel);
  if (selection.broad) add(c.modelLabel);
  if (displacementSet(filters)) add(c.displacementRangeLabel);
  if (rangeSet(filters.seatsFrom, filters.seatsTo)) add(c.seatsRangeLabel);
  if (rangeSet(filters.doorsFrom, filters.doorsTo)) add(blocketText("blocketDoors"));
  if (filters.vat === "non_reclaimable") add(blocketText("blocketVatNonReclaimable"));
  if (["dealer", "company"].includes(filters.seller)) add(c.sellerTypeLabel);
  if ((filters.countries || []).length) add(c.countryLabel);
  const materials = filters.interiorMaterials || [];
  if (materials.length && !(blocketLeatherOnly(filters) && materials.length === 2)) add(c.interiorMaterialLabel);
  if (filters.airConditioning && filters.airConditioning !== "any") add(c.airConditioningLabel);
  if (filters.trailerCoupling && filters.trailerCoupling !== "any") add(c.trailerCouplingLabel);
  if (filters.cruiseControl === "ADAPTIVE_CRUISE_CONTROL") add(c.cruiseControlLabel);
  (filters.features || [])
    .filter((feature) => feature !== "CARPLAY")
    .forEach((feature) => {
      const input = els.features.find((candidate) => candidate.value === feature);
      add(input ? optionLabelText(input) : feature);
    });
  const parking = filters.parkingSensors || [];
  if (parking.some((sensor) => !["REAR_VIEW_CAM", "REAR_SENSORS"].includes(sensor))) add(c.parkingSensorsLabel);
  if ((filters.interiorColors || []).length) add(c.interiorColorLabel);
  if (filters.matte) add(c.matteLabel);
  if (filters.metallic) add(c.metallicLabel);
  if (filters.nonSmoking) add(c.nonSmokingLabel);
  if (filters.roadworthy) add(c.roadworthyLabel);
  if (filters.damagedVehicles !== "show") add(c.damagedVehiclesLabel);
  if (filters.newUsed) add(c.newUsedLabel);
  if (filters.slidingDoor) add(c.slidingDoorLabel);
  if (filters.warranty) add(c.warrantyLabel);
  if (filters.serviceHistory) add(c.serviceHistoryLabel);
  return labels;
}

function rangeSet(fromValue, toValue) {
  const { from, to } = rangeBounds(fromValue, toValue);
  return from !== null || to !== null;
}

function displacementSet(filters) {
  return rangeSet(filters.displacementFrom, filters.displacementTo);
}

// ---- Reading Blocket (analysis and live count) -----------------------------
// Blocket's API sends no CORS header, so it is read through the same reader
// proxy as Otomoto; the proxy wraps the JSON in <pre>.

function blocketProxy() {
  return window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
}

async function fetchBlocketApi(url) {
  const response = await fetch(`${blocketProxy()}${url}`, { headers: { "x-respond-with": "html" } });
  if (!response.ok) throw new Error(String(response.status));
  const text = await response.text();
  const json = text.trim().startsWith("{")
    ? text
    : new DOMParser().parseFromString(text, "text/html").body.textContent;
  return JSON.parse(json);
}

window.AUTOGOOD_BLOCKET = {
  buildSearchUrl: buildBlocketSearchUrl,
  buildApiUrl: buildBlocketApiUrl,
  searchParams: blocketSearchParams,
  modelSelection: blocketModelSelection,
  skippedFilterLabels: blocketSkippedFilterLabels,
  fetchApi: fetchBlocketApi,
  eurSekRate,
  sekPlnRate,
  sekRateReady: blocketSekPlnRate,
  kmPerMil: BLOCKET_KM_PER_MIL,
};

// ---- Buttons and live count --------------------------------------------------

document.querySelectorAll("[data-mobile-blocket-search]").forEach((link) => link.addEventListener("click", (event) => {
  try {
    const filters = readManualFields();
    const searchUrl = buildBlocketSearchUrl(filters);
    link.href = searchUrl;
    window.AUTOGOOD_MOBILE_LOG_SEARCH?.(searchUrl);
    const skipped = blocketSkippedFilterLabels(filters);
    const converted = filters.priceFrom || filters.priceTo
      ? ` ${blocketText("blocketPriceConverted").replace("{rate}", `1 € = ${eurSekRate().toFixed(2)} kr`)}`
      : "";
    setMarketSearchStatus((skipped.length
      ? blocketText("blocketSearchSkipped").replace("{filters}", skipped.join(", "))
      : blocketText("blocketSearchOpening")) + converted);
  } catch (error) {
    event.preventDefault();
    link.href = "#";
    setMarketSearchStatus(error.message || copy[state.lang].marketSearchInvalidRange, true);
  }
}));

const blocketCounts = new Map();
let blocketCountRequest = 0;

window.AUTOGOOD_BLOCKET_REFRESH_COUNT = async (filters) => {
  const target = document.querySelector("[data-mobile-search-count-blocket]");
  if (!target) return;
  const show = (text) => {
    target.textContent = text;
  };
  if (!filters?.brand || !filters?.model) {
    show("—");
    return;
  }
  let url;
  try {
    await blocketSekPlnRate();
    url = buildBlocketApiUrl(filters);
  } catch {
    show("—");
    return;
  }
  if (blocketCounts.has(url)) {
    show(blocketCounts.get(url));
    return;
  }
  const request = ++blocketCountRequest;
  show(copy[state.lang].offerCountLoading);
  try {
    const data = await fetchBlocketApi(url);
    const total = Number(data?.metadata?.result_size?.match_count) || 0;
    const label = new Intl.NumberFormat(state.lang === "ru" ? "ru-RU" : "pl-PL").format(total);
    blocketCounts.set(url, label);
    if (request === blocketCountRequest) show(label);
  } catch {
    if (request === blocketCountRequest) show("—");
  }
};

function renderBlocketI18n() {
  document.querySelectorAll("[data-blocket-i18n]").forEach((node) => {
    node.textContent = blocketText(node.dataset.blocketI18n);
  });
  document.querySelectorAll("[data-mobile-blocket-search][aria-label]").forEach((node) => {
    node.setAttribute("aria-label", blocketText("blocketSearchButton"));
    node.title = blocketText("blocketSearchButton");
  });
}
renderBlocketI18n();
document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", () => {
  window.setTimeout(renderBlocketI18n, 0);
}));
