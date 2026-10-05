// ---- ParuVendu (FR) ------------------------------------------------------------------
// France's classifieds, about 90 % dealers (B47, 2026-10-05): the second
// portal of France next to AutoScout24 FR. In the analysis and Monitoring
// only its own offers (same price and mileage as an AutoScout24 FR offer =
// the same car), counted in the row "Francja".
// The search is the form of the site (GET, checked 2026-10-05):
//   /auto-moto/listefo/default/default?tt=1&r=VO&r2=<make>&md=<model>,<model>
//   &px0=&px1= (price €) &a0=&a1= (year) &km0=&km1= &nrj[]=<fuel> &tr[]=<gearbox>
//   &npo[]=<doors> &r1=<body> &codPro=on|off (dealer|private) &fulltext=<words>
//   &tri=prix&ord=asc &p=<page>
// Values of one list ("[]", and models after a comma) are "or", the fields
// "and". The same address with &ajax=1 answers {"nbAnnonces":N} (the count of
// the site's own form). This address reads every page (p=10 checked); the
// short address it redirects to without "tri" (/a/voiture-occasion/<make>/
// <model>/?…) stops at 5 pages. 25 offers a page; we read at most 50 pages a
// search (politeness, docs/FILTERS-MOBILE-OTOMOTO.md §5h). No CORS: read
// through the reader proxy (src/market-proxy-queue.js queues it).
// Loaded after mobile.js and blocket-search.js (rangeBounds, manualFuelValues,
// copy, state, doorRangeBounds, blocket* model matching).
(() => {
  const SITE = "https://www.paruvendu.fr";
  const SEARCH = `${SITE}/auto-moto/listefo/default/default`;
  const PAGE_SIZE = 25;
  const MAX_PAGES = 50;

  // "Hybride (tous)" (HY) holds every hybrid: plug-in (HR) and micro (MH) too.
  const FUEL = { petrol: "ES", diesel: "DI", electric: "EL", hybrid_petrol: "HY", hybrid_diesel: "HY", plugin: "HR" };
  // A DSG is often "Semi automatique": both are automatic for the form.
  const GEARBOX = { automatic: ["AU", "SA"], manual: ["MA"] };
  // One body at a time ("r1"). "Berline" holds hatchbacks and saloons alike.
  const BODY = { hatchback: "TO", limousine: "TO", sedan: "TO", estate: "BR", suv: "4X", pickup: "PU", cabrio: "CA", coupe: "CO", van_minibus: "MO" };
  const BODY_APPROX = new Set(["hatchback", "limousine", "sedan", "van_minibus"]);
  // Doors: 2, 3 ("2 portes avec hayon"), 4, 5 ("4 portes avec hayon").
  const DOORS = [2, 3, 4, 5];
  const SELLER = { dealer: "on", company: "on", private: "off" };

  const TEXT = {
    pl: {
      search: "Szukaj na ParuVendu (Francja)",
      opening: "Otwieram ParuVendu: od najniższej ceny.",
      skipped: "ParuVendu nie ma dokładnego odpowiednika dla: {filters}. Pozostałe filtry zostały zastosowane.",
      countTitle: "Ogłoszenia na ParuVendu (Francja; głównie dealerzy)",
      hybrid: "Hybryda ≈ (wszystkie hybrydy)",
      power: "Moc (ParuVendu szuka tylko po mocy fiskalnej CV)",
      newUsed: "Nowy / używany",
      doors: "Liczba drzwi",
    },
    ru: {
      search: "Искать на ParuVendu (Франция)",
      opening: "Открываю ParuVendu: сначала самые дешёвые.",
      skipped: "В ParuVendu нет точного аналога для: {filters}. Остальные фильтры применены.",
      countTitle: "Объявления на ParuVendu (Франция; в основном дилеры)",
      hybrid: "Гибрид ≈ (все гибриды)",
      power: "Мощность (ParuVendu ищет только по налоговой мощности CV)",
      newUsed: "Новый / б/у",
      doors: "Количество дверей",
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");

  // ---- Make and model ----------------------------------------------------------
  function catalogMake(brand) {
    const makes = window.AUTOGOOD_PARUVENDU_CATALOG?.makes || {};
    const wanted = blocketToken(brand);
    const name = Object.keys(makes).find((candidate) => blocketToken(makes[candidate].ours || candidate) === wanted)
      || Object.keys(makes).find((candidate) => blocketToken(candidate) === wanted);
    return name ? { name, ...makes[name] } : null;
  }

  // { makeCode, codes, words, broad, unsupported }
  function modelSelection(brand, model, version = "") {
    const cleanModel = String(model || "").trim();
    const cleanVersion = String(version || "").trim();
    const make = brand ? catalogMake(brand) : null;
    if (!brand || !make) return { makeCode: "", codes: [], words: [brand, cleanModel, cleanVersion].filter(Boolean).join(" "), broad: false, unsupported: Boolean(brand) };
    const base = { makeCode: make.code, codes: [], words: cleanVersion, broad: false, unsupported: false };
    if (!cleanModel) return base;
    // A family ("Golf (tous)", "Série 3 (tous)") stands for its models: the
    // search sends the models' own codes.
    const nodes = make.models.filter((node) => !/^divers$/i.test(node.name)).map((node) => ({ ...node, id: node.code }));
    const models = nodes.filter((node) => !node.series);
    const result = (found, broad) => ({ ...base, codes: [...new Set(found.map((node) => node.code))], broad });
    const alternatives = blocketModelAlternatives(brand, cleanModel);
    const ourModels = blocketOurModels(brand);
    const separateFor = (name) => ourModels.filter((other) => blocketToken(other).length > blocketToken(name).length && blocketInFamily(other, name));
    const familyOf = (series) => models.filter((node) => node.family === series.code);
    // A series of the form ("3", "C", "X5"): ParuVendu's family of that name.
    for (const name of alternatives) {
      const wanted = blocketSeriesToken(name).replace(/^(serie|classe)/, "");
      const series = nodes.find((node) => node.series && blocketSeriesToken(node.name).replace(/^(serie|classe)/, "") === wanted);
      if (series && familyOf(series).length && !models.some((node) => blocketToken(node.name) === blocketToken(name))) return result(familyOf(series), false);
    }
    // BMW and Mercedes by series only ("Série 3", "Classe C"): the series of
    // the form is exact, an engine of it ("320", "C 220") the series ≈.
    for (const name of alternatives) {
      if (models.some((node) => blocketToken(node.name) === blocketToken(name))) break;
      const bmw = brand === "BMW" && name.match(/^([1-8])(?:er|\s*serie|\s*series|(\d{2})\w*)?$/i);
      const benz = brand === "Mercedes-Benz" && name.match(/^([A-Z]{1,3})(?:-?\s*(?:klasse|class))?(\s*\d{2,3}.*)?$/i);
      if (!bmw && !benz) continue;
      const wanted = bmw ? `serie${bmw[1]}` : `classe${benz[1].toLowerCase()}`;
      const found = models.filter((node) => blocketToken(node.name) === wanted);
      if (found.length) return result(found, Boolean(bmw ? bmw[2] : benz[2]));
    }
    const exact = alternatives.flatMap((name) => blocketFamily(models, name, separateFor(name), ourModels));
    if (exact.length) return result(exact, false);
    for (const name of alternatives) {
      const words = blocketWords(name);
      for (let count = words.length - 1; count >= 1; count -= 1) {
        const opener = words.slice(0, count).join(" ");
        if (!models.some((node) => blocketToken(node.name) === blocketToken(opener))) continue;
        const family = blocketFamily(models, opener, separateFor(opener), ourModels);
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
    const params = [];
    const add = (key, value) => {
      if (value !== null && value !== undefined && value !== "") params.push([key, String(value)]);
    };
    const fuels = typeof manualFuelValues === "function" ? manualFuelValues(filters) : (filters.fuels || []);
    let fuelCodes = [...new Set(fuels.map((fuel) => FUEL[fuel]).filter(Boolean))];
    if (fuelCodes.includes("HY")) fuelCodes = fuelCodes.filter((code) => code !== "HR");
    if (fuels.includes("hybrid_petrol") || fuels.includes("hybrid_diesel")) skip(t.hybrid);
    fuelCodes.forEach((code) => add("nrj[]", code));
    (GEARBOX[filters.gearbox] || []).forEach((code) => add("tr[]", code));
    if (filters.body && BODY[filters.body]) {
      add("r1", BODY[filters.body]);
      if (BODY_APPROX.has(filters.body)) skip(`${c.bodyLabel || "Nadwozie"} ≈`);
    } else if (filters.body) skip(c.bodyLabel || "Nadwozie");
    try {
      const doors = typeof doorRangeBounds === "function" ? doorRangeBounds(filters) : { from: null, to: null };
      if (doors.from !== null || doors.to !== null) {
        const values = DOORS.filter((count) => count >= (doors.from ?? 2) && count <= (doors.to ?? 7));
        if (!values.length) skip(t.doors);
        else if (values.length < DOORS.length) values.forEach((count) => add("npo[]", count));
      }
    } catch {
      // The form reports an invalid door range itself.
    }
    const range = (fromKey, toKey, fromValue, toValue) => {
      const { from, to } = typeof rangeBounds === "function" ? rangeBounds(fromValue, toValue) : { from: null, to: null };
      add(fromKey, from);
      add(toKey, to);
    };
    range("a0", "a1", filters.yearFrom, filters.yearTo);
    range("km0", "km1", filters.mileageFrom, filters.mileageTo);
    const priceRange = price || (() => {
      const { from, to } = typeof rangeBounds === "function"
        ? rangeBounds(filters.priceFrom, String(filters.priceTo || "").trim().endsWith("+") ? "" : filters.priceTo)
        : { from: null, to: null };
      return from === null && to === null ? null : { from, to };
    })();
    if (priceRange) {
      add("px0", priceRange.from);
      add("px1", priceRange.to);
    }
    add("codPro", SELLER[filters.seller] || "");
    // Not on ParuVendu: power in PS (it knows only the fiscal CV), and the rest.
    if (filters.powerFrom || filters.powerTo) skip(t.power);
    if (filters.drive && filters.drive !== "any") skip(c.driveLabel || "Napęd");
    if (filters.displacementFrom || filters.displacementTo) skip(c.displacementRangeLabel || "Pojemność");
    if (filters.seatsFrom || filters.seatsTo) skip(c.seatsRangeLabel || "Liczba miejsc");
    if (filters.slidingDoor) skip(c.slidingDoorLabel || "Drzwi przesuwne");
    if ((filters.exteriorColors || []).length) skip(c.exteriorColorLabel || "Kolor nadwozia");
    if ((filters.interiorColors || []).length) skip(c.interiorColorLabel || "Kolor wnętrza");
    if ((filters.interiorMaterials || []).length) skip(c.interiorMaterialLabel || "Typ salonu");
    if (filters.metallic) skip(c.metallicLabel || "Metallic");
    if (filters.matte) skip(c.matteLabel || "Matowy");
    if (filters.vat) skip(c.vatLabel || "VAT");
    if (filters.newUsed) skip(t.newUsed);
    if (filters.warranty) skip(c.warrantyLabel || "Gwarancja");
    if (filters.accidentFree) skip(c.accidentFreeLabel || "Bezwypadkowy");
    if (filters.firstOwner) skip(c.firstOwnerLabel || "Pierwszy właściciel");
    if (filters.nonSmoking) skip(c.nonSmokingLabel || "Auto niepalącego");
    if (filters.serviceHistory) skip(c.serviceHistoryLabel || "Serwisowany w ASO");
    if (filters.airConditioning) skip(c.airConditioningLabel || "Klimatyzacja");
    if ((filters.parkingSensors || []).length) skip(c.parkingSensorsLabel || "Asystenci parkowania");
    if (filters.cruiseControl && filters.cruiseControl !== "any") skip(c.cruiseControlLabel || "Tempomat");
    if (filters.trailerCoupling && !["any", ""].includes(filters.trailerCoupling)) skip(c.trailerCouplingLabel || "Hak");
    (filters.features || []).forEach((feature) => skip(optionLabel(typeof els === "object" ? els.features : [], feature)));
    if (selection.words) add("fulltext", selection.words);
    return { selection, params, skipped };
  }

  function query(filters, { price = null, page = 1, count = false } = {}) {
    const parts = searchParts(filters, { price });
    const params = [["tt", "1"], ["r", "VO"]];
    if (parts.selection.makeCode) params.push(["r2", parts.selection.makeCode]);
    if (parts.selection.codes.length) params.push(["md", parts.selection.codes.join(",")]);
    params.push(...parts.params);
    if (count) params.push(["ajax", "1"]);
    else {
      params.push(["tri", "prix"], ["ord", "asc"]);
      if (page > 1) params.push(["p", String(page)]);
    }
    // "[]" and "," stay as the site's own form writes them.
    return params.map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/g, ",")}`).join("&");
  }

  // The site's list, cheapest first (page 1…).
  function buildSearchUrl(filters, { page = 1, price = null } = {}) {
    return `${SEARCH}?${query(filters, { page, price })}`;
  }

  // {"nbAnnonces":N} — the count of the same search.
  function buildCountUrl(filters, { price = null } = {}) {
    return `${SEARCH}?${query(filters, { price, count: true })}`;
  }

  const decode = (value) => String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&euro;|&#8364;/g, "€")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&eacute;/g, "é").replace(/&egrave;/g, "è").replace(/&ecirc;/g, "ê").replace(/&icirc;/g, "î").replace(/&ocirc;/g, "ô").replace(/&ccedil;/g, "ç")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const digits = (value) => Number(String(value || "").replace(/[^\d]/g, "")) || 0;

  // "Essence", "Diesel", "Hybride rechargeable"… in the words the analysis knows.
  function fuelWord(value) {
    const text = String(value || "").toLowerCase();
    if (/rechargeable/.test(text)) return "plug-in hybrid";
    if (/hybride/.test(text)) return /diesel/.test(text) ? "hybrid diesel" : "hybrid";
    if (/lectrique/.test(text)) return "electric";
    if (/diesel/.test(text)) return "diesel";
    if (/essence/.test(text)) return "petrol";
    if (/gpl|gnv|gnl/.test(text)) return "lpg";
    if (/thanol/.test(text)) return "petrol";
    return "";
  }

  // The offers of one result page. "NC" (no price), a price per month
  // (leasing) and prices under 300 € are no price.
  function parsePage(html, { page = 1 } = {}) {
    const text = String(html || "");
    const count = (text.match(/(\d[\d\s  .]*)\s*annonces?\b/) || [])[1];
    const total = count ? digits(count) : 0;
    const listings = [];
    const starts = [...text.matchAll(/<div[^>]*class="blocAnnonce[^"]*"[^>]*data-id="(\d+)"/g)];
    starts.forEach((match, index) => {
      const card = text.slice(match.index, starts[index + 1]?.index ?? match.index + 20000);
      const id = match[1];
      const position = index + 1;
      const link = card.match(/href="(https:\/\/www\.paruvendu\.fr\/a\/voiture-occasion\/[^"]+)"[^>]*title="([^"]*)"/);
      const priceText = decode((card.match(/encoded-lnk[^>]*>\s*<div>([\s\S]*?)<\/div>/) || [])[1]);
      if (!/€/.test(priceText) || /mois/i.test(priceText)) return;
      const price = digits(priceText.split("€")[0]);
      if (price < 300) return;
      const heading = decode((card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1]);
      const chips = [...card.matchAll(/<span class="text-xs[^"]*"[^>]*>([\s\S]*?)<\/span>/g)].map((item) => decode(item[1]));
      const place = chips.find((chip) => /\(\d{5}\)/.test(chip)) || "";
      const year = Number((chips.find((chip) => /^Année\s+\d{4}$/.test(chip)) || "").replace(/[^\d]/g, "")) || "";
      const mileage = digits(chips.find((chip) => /^\d[\d\s]*km$/i.test(chip)));
      const fuel = fuelWord(chips.find((chip) => /essence|diesel|hybride|lectrique|gpl|gnv|thanol/i.test(chip)));
      const gearboxChip = chips.find((chip) => /^Boîte/i.test(chip)) || "";
      const title = decode(link?.[2] || heading);
      const power = (title.match(/\b(\d{2,3})\s?ch\b/i) || [])[1];
      const seller = /class="pseudoinfo">\s*Particulier/i.test(card) ? "private"
        : /\/auto-moto\/pro\/|>\s*Pro\s*</.test(card) ? "dealer" : "";
      listings.push({
        id,
        url: link ? link[1] : `${SITE}/a/voiture-occasion/${id}`,
        title: (heading || title).slice(0, 160),
        source: "paruvendu",
        price,
        currency: "EUR",
        year,
        mileage: mileage || "",
        power: power ? `${power} HP` : "",
        fuel,
        gearbox: /manuelle/i.test(gearboxChip) ? "manual" : /automatique/i.test(gearboxChip) ? "automatic" : "",
        country: "FR",
        postalCode: (place.match(/\((\d{5})\)/) || [])[1] || "",
        city: place.replace(/\s*\(\d{5}\)\s*/, "").slice(0, 80),
        seller,
        rank: (page - 1) * PAGE_SIZE + position,
        marketTotal: total,
      });
    });
    return { total, listings };
  }

  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  async function fetchPage(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(String(response.status));
    return response.text();
  }
  async function fetchCount(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "text" } });
    if (!response.ok) throw new Error(String(response.status));
    const text = await response.text();
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const total = Number(JSON.parse(json)?.nbAnnonces);
    if (!Number.isFinite(total)) throw new Error("ParuVendu");
    return total;
  }

  // ---- Page 1: live count and the search link -------------------------------------
  const counts = new Map();
  let countRequest = 0;
  async function refreshCount(filters) {
    const target = document.querySelector("[data-mobile-search-count-paruvendu]");
    if (!target) return;
    target.title = TEXT[lang()].countTitle;
    const picked = typeof window.AUTOGOOD_SELECTED_MARKETS === "function" ? window.AUTOGOOD_SELECTED_MARKETS() : ["paruvendu"];
    if (!picked.includes("paruvendu")) return;
    if (!filters?.brand || !filters?.model) {
      target.textContent = "—";
      return;
    }
    let url;
    try {
      url = buildCountUrl(filters);
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
      const total = await fetchCount(url);
      const label = new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(total);
      counts.set(url, label);
      if (request === countRequest) target.textContent = label;
    } catch {
      if (request === countRequest) target.textContent = "—";
    }
  }
  window.AUTOGOOD_PARUVENDU_REFRESH_COUNT = refreshCount;

  document.querySelectorAll("[data-mobile-paruvendu-search]").forEach((link) => link.addEventListener("click", (event) => {
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
      setMarketSearchStatus(error.message || "ParuVendu", true);
    }
  }));
  function renderI18n() {
    document.querySelectorAll("[data-mobile-paruvendu-search]").forEach((node) => {
      node.setAttribute("aria-label", TEXT[lang()].search);
      node.title = TEXT[lang()].search;
    });
  }
  renderI18n();
  document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", () => window.setTimeout(renderI18n, 0)));

  window.AUTOGOOD_PARUVENDU = {
    SITE,
    PAGE_SIZE,
    MAX_PAGES,
    modelSelection,
    searchParts,
    buildSearchUrl,
    buildCountUrl,
    parsePage,
    fetchPage,
    fetchCount,
    fuelWord,
    skippedFilterLabels: (filters) => searchParts(filters).skipped,
  };
})();
