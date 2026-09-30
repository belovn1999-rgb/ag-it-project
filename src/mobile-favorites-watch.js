// Page 4 "Wyszukiwanie ulubionych": what is new for one favourite car.
// The car picked in the favourites bar is checked on every compared portal
// (newest offers first); offers published since the previous check are
// counted per portal and listed with photo, price, "na gotowo" and how the
// price sits against that market's median. Each favourite can also carry its
// own price range per portal, on top of its filters from page 1.
//
// Stored apart from the history, in `autogood.mobile.favoriteWatch.v1`
// (per favourite id: prices, checks, found offers). The rules of section
// 4.6.1 in docs/PROJECT-MOBILE.md apply: every write re-reads storage first,
// the key is never cleared, unreadable data is kept aside.
(() => {
  const STORAGE_KEY = "autogood.mobile.favoriteWatch.v1";
  const BROKEN_KEY_PREFIX = "autogood.mobile.favoriteWatch.broken.";
  const SOURCES = ["otomoto", "mobile", "blocket"];
  const CURRENCY = { otomoto: "PLN", mobile: "EUR", blocket: "SEK" };
  const COLORS = { otomoto: "#1d5fd0", mobile: "#f56a00", blocket: "#d0101a" };
  // How deep each portal is read, newest first.
  const MAX_PAGES = { otomoto: 3, blocket: 2, mobile: 3 };
  const FIRST_CHECK_DAYS = 7;
  const KEEP_OFFERS_DAYS = 14;
  // Found offers kept per portal and favourite (localStorage is small).
  const KEEP_PER_PORTAL = 40;
  const KEEP_SEEN = 200;
  const KEEP_CHECKS = 60;
  // A car shown again within this time is not re-checked by itself.
  const AUTO_CHECK_AFTER_MS = 15 * 60 * 1000;
  // Portal clocks and ours differ a little.
  const CLOCK_SLACK_MS = 2 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  // New offers shown per portal before "Pokaż wszystkie".
  const SHOW_PER_PORTAL = 6;

  const text = {
    pl: {
      heading: "Wyszukiwanie ulubionych",
      intro: "Wybierz auto na pasku ulubionych u góry — sprawdzimy na każdym portalu, ile nowych ogłoszeń pojawiło się od Twojego ostatniego sprawdzenia.",
      noFavorites: "Nie masz jeszcze ulubionych aut. Oznacz wyszukiwanie gwiazdką ★ na stronie 1 — potem tutaj zobaczysz jego nowe ogłoszenia.",
      check: "Sprawdź nowe ogłoszenia",
      checking: "Sprawdzam…",
      filters: "Pokaż filtry",
      analysis: "Analiza rynku",
      lastCheck: "Ostatnie sprawdzenie: {date}",
      neverChecked: "To auto nie było jeszcze sprawdzane.",
      pricesHeading: "Cena na portalach",
      pricesHint: "Puste pola = cena z filtrów (strona 1). Wpisana cena zastępuje ją tylko na tym portalu.",
      from: "od",
      to: "do",
      fromFilters: "z filtrów: {range}",
      noPrice: "bez limitu",
      pricesChanged: "Cena zmieniona — kliknij „Sprawdź nowe ogłoszenia”.",
      newSince: "nowych od {date}",
      newFirst: "z ostatnich {days} dni",
      last24: "24 h",
      last7: "7 dni",
      total: "Wszystkich: {count}",
      openPortal: "Otwórz od najnowszych",
      portalError: "Nie udało się sprawdzić.",
      mobileOffline: "Serwer mobile.de jest niedostępny.",
      mobileOutdated: "Serwer mobile.de wymaga aktualizacji (restart importera).",
      loading: "Sprawdzam…",
      newHeading: "Nowe ogłoszenia",
      newHeadingSince: "Nowe od {date}",
      firstHeading: "Ogłoszenia z ostatnich {days} dni",
      firstNote: "Pierwsze sprawdzenie tego auta: od teraz każde kolejne pokaże tylko nowe ogłoszenia.",
      noNew: "Brak nowych ogłoszeń od ostatniego sprawdzenia.",
      earlier: "Wcześniej znalezione ({count}) — ostatnie {days} dni",
      showAll: "Pokaż wszystkie ({count})",
      showLess: "Pokaż mniej",
      suspect: "podejrzana cena",
      allPortals: "Wszystkie portale",
      turnkey: "na gotowo*",
      brutto: "brutto",
      vsMedian: "{value} vs mediana",
      belowP25: "poniżej P25",
      dealer: "Dealer",
      private: "Prywatny",
      photos: "{count} zdjęć",
      open: "Otwórz ogłoszenie",
      historyHeading: "Historia sprawdzeń",
      historyDate: "Data",
      historyEmpty: "Tu pojawi się każde sprawdzenie: ile nowych ogłoszeń na każdym portalu.",
      turnkeyNote: "* Cena „na gotowo”: cena brutto + średni transport, oględziny, akcyza i usługa AUTOGOOD (jak w analizie).",
      medianNote: "Mediana — z ostatniego pomiaru tego auta w historii cen (strona 3).",
      ago: { now: "przed chwilą" },
      ratings: {
        BELOW: ["poniżej średniej", "isGood"],
        IN: ["w średniej", ""],
        ABOVE: ["powyżej średniej", "isBad"],
        VERY_GOOD_PRICE: ["bardzo dobra cena", "isGood"],
        GOOD_PRICE: ["dobra cena", "isGood"],
        REASONABLE_PRICE: ["uczciwa cena", ""],
        INCREASED_PRICE: ["podwyższona cena", "isBad"],
        HIGH_PRICE: ["wysoka cena", "isBad"],
      },
      storageError: "Nie udało się zapisać danych w przeglądarce.",
    },
    ru: {
      heading: "Поиск избранных",
      intro: "Выберите авто на панели избранного вверху — проверим на каждом портале, сколько новых объявлений появилось с вашей прошлой проверки.",
      noFavorites: "Избранных авто пока нет. Отметьте поиск звёздочкой ★ на странице 1 — здесь появятся его новые объявления.",
      check: "Проверить новые объявления",
      checking: "Проверяю…",
      filters: "Показать фильтры",
      analysis: "Анализ рынка",
      lastCheck: "Последняя проверка: {date}",
      neverChecked: "Это авто ещё не проверялось.",
      pricesHeading: "Цена на порталах",
      pricesHint: "Пустые поля = цена из фильтров (страница 1). Введённая цена заменяет её только на этом портале.",
      from: "от",
      to: "до",
      fromFilters: "из фильтров: {range}",
      noPrice: "без ограничения",
      pricesChanged: "Цена изменена — нажмите «Проверить новые объявления».",
      newSince: "новых с {date}",
      newFirst: "за последние {days} дн.",
      last24: "24 ч",
      last7: "7 дней",
      total: "Всего: {count}",
      openPortal: "Открыть с новых",
      portalError: "Не удалось проверить.",
      mobileOffline: "Сервер mobile.de недоступен.",
      mobileOutdated: "Серверу mobile.de нужно обновление (перезапуск импортера).",
      loading: "Проверяю…",
      newHeading: "Новые объявления",
      newHeadingSince: "Новые с {date}",
      firstHeading: "Объявления за последние {days} дней",
      firstNote: "Первая проверка этого авто: дальше каждая проверка покажет только новые объявления.",
      noNew: "Новых объявлений с прошлой проверки нет.",
      earlier: "Найдено раньше ({count}) — последние {days} дней",
      showAll: "Показать все ({count})",
      showLess: "Свернуть",
      suspect: "подозрительная цена",
      allPortals: "Все порталы",
      turnkey: "под ключ*",
      brutto: "брутто",
      vsMedian: "{value} к медиане",
      belowP25: "ниже P25",
      dealer: "Дилер",
      private: "Частник",
      photos: "{count} фото",
      open: "Открыть объявление",
      historyHeading: "История проверок",
      historyDate: "Дата",
      historyEmpty: "Здесь появится каждая проверка: сколько новых объявлений на каждом портале.",
      turnkeyNote: "* Цена «под ключ»: брутто + средние транспорт, осмотр, акциз и услуга AUTOGOOD (как в анализе).",
      medianNote: "Медиана — из последнего замера этого авто в истории цен (страница 3).",
      ago: { now: "только что" },
      ratings: {
        BELOW: ["ниже среднего", "isGood"],
        IN: ["в среднем", ""],
        ABOVE: ["выше среднего", "isBad"],
        VERY_GOOD_PRICE: ["очень хорошая цена", "isGood"],
        GOOD_PRICE: ["хорошая цена", "isGood"],
        REASONABLE_PRICE: ["честная цена", ""],
        INCREASED_PRICE: ["завышенная цена", "isBad"],
        HIGH_PRICE: ["высокая цена", "isBad"],
      },
      storageError: "Не удалось сохранить данные в браузере.",
    },
  };

  const helpers = () => window.AUTOGOOD_MARKET_HELPERS;
  const lang = () => (helpers()?.language?.() === "ru" ? "ru" : "pl");
  const t = () => text[lang()];
  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fill = (template, values) => Object.entries(values)
    .reduce((result, [key, value]) => result.split(`{${key}}`).join(String(value)), template);
  const locale = () => (lang() === "ru" ? "ru-RU" : "pl-PL");
  const number = (value) => new Intl.NumberFormat(locale()).format(Math.round(value));
  const money = (value, currency) => {
    if (!Number.isFinite(value)) return "—";
    const unit = currency === "PLN" ? "zł" : currency === "SEK" ? "kr" : "€";
    return `${number(value)} ${unit}`;
  };
  const portalName = (source) => (source === "otomoto" ? "otomoto.pl" : source === "blocket" ? "blocket.se" : "mobile.de");

  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(locale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function agoLabel(value) {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return "";
    const seconds = Math.round((time - Date.now()) / 1000);
    if (seconds > -60) return t().ago.now;
    const format = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
    if (seconds > -3600) return format.format(Math.round(seconds / 60), "minute");
    if (seconds > -86400) return format.format(Math.round(seconds / 3600), "hour");
    if (seconds > -7 * 86400) return format.format(Math.round(seconds / 86400), "day");
    return dateLabel(value);
  }

  // ---- Storage ---------------------------------------------------------------

  function readAll() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a map");
      return parsed;
    } catch {
      // Kept aside so the next write cannot destroy it.
      try {
        localStorage.setItem(`${BROKEN_KEY_PREFIX}${new Date().toISOString()}`, raw);
      } catch {
        // Nothing more can be done in this browser.
      }
      return {};
    }
  }

  function watchOf(id) {
    const item = readAll()[id] || {};
    return {
      prices: item.prices && typeof item.prices === "object" ? item.prices : {},
      lastCheckAt: String(item.lastCheckAt || ""),
      checks: Array.isArray(item.checks) ? item.checks : [],
      offers: Array.isArray(item.offers) ? item.offers : [],
      seen: item.seen && typeof item.seen === "object" ? item.seen : {},
      pricesChanged: Boolean(item.pricesChanged),
    };
  }

  // Re-reads storage, changes one favourite, writes. When the browser is
  // full, the found offers of other cars are shortened first, never the
  // prices or the dates of checks.
  function updateWatch(id, change) {
    const all = readAll();
    all[id] = change(watchOf(id));
    const attempts = [
      all,
      Object.fromEntries(Object.entries(all).map(([key, value]) => [key, key === id ? value : { ...value, offers: (value.offers || []).slice(0, 40), seen: {} }])),
      Object.fromEntries(Object.entries(all).map(([key, value]) => [key, { ...value, offers: (value.offers || []).slice(0, key === id ? 60 : 0), seen: key === id ? value.seen : {} }])),
    ];
    for (const attempt of attempts) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
        return attempt[id];
      } catch {
        // Try again with less.
      }
    }
    statusMessage = t().storageError;
    return all[id];
  }

  // ---- Search addresses --------------------------------------------------------

  const cleanPrice = (value) => {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  };

  function portalPrice(watch, source) {
    const price = watch.prices?.[source];
    const from = cleanPrice(price?.from);
    const to = cleanPrice(price?.to);
    return from === null && to === null ? null : { from, to };
  }

  const withoutPrice = (filters) => ({ ...filters, priceFrom: "", priceTo: "" });

  function setRange(params, fromKey, toKey, price) {
    params.delete(fromKey);
    params.delete(toKey);
    if (price.from !== null) params.set(fromKey, String(price.from));
    if (price.to !== null) params.set(toKey, String(price.to));
  }

  function otomotoUrl(filters, price, page = 1) {
    const url = new URL(buildOtomotoSearchUrl(price ? withoutPrice(filters) : filters));
    if (price) setRange(url.searchParams, "search[filter_float_price:from]", "search[filter_float_price:to]", price);
    url.searchParams.set("search[order]", "created_at_first:desc");
    if (page > 1) url.searchParams.set("page", String(page));
    else url.searchParams.delete("page");
    return url.toString();
  }

  function mobileUrl(filters, price) {
    const url = new URL(buildMobileDeSearchUrl(price ? withoutPrice(filters) : filters));
    if (price) url.searchParams.set("p", `${price.from ?? ""}:${price.to ?? ""}`);
    url.searchParams.set("sb", "doc");
    url.searchParams.set("od", "down");
    return url.toString();
  }

  function blocketUrl(filters, price, { api = false, page = 1 } = {}) {
    const blocket = window.AUTOGOOD_BLOCKET;
    const base = price ? withoutPrice(filters) : filters;
    const url = new URL(api ? blocket.buildApiUrl(base, { page, sort: "PUBLISHED_DESC" }) : blocket.buildSearchUrl(base));
    if (price) setRange(url.searchParams, "price_from", "price_to", price);
    url.searchParams.set("sort", "PUBLISHED_DESC");
    return url.toString();
  }

  function portalSearchUrl(source, filters, price) {
    try {
      if (source === "otomoto") return otomotoUrl(filters, price);
      if (source === "mobile") return mobileUrl(filters, price);
      return blocketUrl(filters, price);
    } catch {
      return "";
    }
  }

  // The page-1 price (EUR) in a portal's currency: what applies when the
  // favourite has no price of its own there.
  function filtersPriceIn(source, filters) {
    const from = cleanPrice(filters.priceFrom);
    const to = String(filters.priceTo || "").trim().endsWith("+") ? null : cleanPrice(filters.priceTo);
    const convert = (eur) => {
      if (eur === null) return null;
      if (source === "mobile") return eur;
      if (source === "blocket") return eur * (window.AUTOGOOD_BLOCKET?.eurSekRate?.() || 11);
      return helpers()?.priceInPln?.(eur, "EUR") ?? eur * 4.3;
    };
    return { from: convert(from), to: convert(to) };
  }

  // ---- Reading the portals, newest first ---------------------------------------

  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";

  function otomotoOffers(html) {
    const raw = String(html || "").match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!raw) throw new Error("otomoto: no data");
    let search = null;
    const walk = (value) => {
      if (!value || typeof value !== "object" || search) return;
      if (Array.isArray(value.edges) && value.edges[0]?.node?.price) search = value;
      else Object.values(value).forEach(walk);
    };
    Object.values(JSON.parse(raw[1])?.props?.pageProps?.urqlState || {}).forEach((entry) => {
      if (!entry?.data || search) return;
      try {
        walk(JSON.parse(entry.data));
      } catch {
        // Not a search result.
      }
    });
    if (!search) return { total: 0, offers: [] };
    const total = Number(search.totalCount) || 0;
    // Nothing matches: otomoto then shows "similar" offers, not these.
    if (!total) return { total: 0, offers: [] };
    const offers = search.edges.map(({ node = {} }) => {
      const amount = node.price?.amount || {};
      const price = Number(amount.units ?? amount.value);
      if (!Number.isFinite(price) || price <= 0) return null;
      const parameters = Object.fromEntries((node.parameters || []).map((item) => [item.key, item]));
      const seller = node.seller?.__typename || "";
      return {
        key: `otomoto:${node.id}`,
        source: "otomoto",
        url: String(node.url || ""),
        title: String(node.title || "").slice(0, 120),
        subtitle: String(node.shortDescription || "").slice(0, 140),
        price,
        currency: String(amount.currencyCode || "PLN"),
        year: Number(parameters.year?.value) || null,
        mileage: Number(parameters.mileage?.value) || null,
        power: parameters.engine_power?.value ? `${parameters.engine_power.value} KM` : "",
        fuel: parameters.fuel_type?.displayValue || "",
        gearbox: parameters.gearbox?.displayValue || "",
        displacementCcm: Number(parameters.engine_capacity?.value) || null,
        city: [node.location?.city?.name, node.location?.region?.name].filter(Boolean).join(", "),
        country: "PL",
        seller: /Professional/.test(seller) ? "dealer" : /Private/.test(seller) ? "private" : "",
        rating: node.priceEvaluation?.indicator && node.priceEvaluation.indicator !== "NONE" ? node.priceEvaluation.indicator : "",
        images: [node.thumbnail?.x2 || node.thumbnail?.x1].filter(Boolean),
        createdAt: String(node.createdAt || ""),
      };
    }).filter(Boolean);
    return { total, offers };
  }

  function blocketOffer(doc) {
    const price = Number(doc?.price?.amount);
    if (!Number.isFinite(price) || price <= 0) return null;
    const mileage = Number(doc.mileage);
    const images = (Array.isArray(doc.image_urls) && doc.image_urls.length ? doc.image_urls : [doc.image?.url])
      .filter(Boolean)
      .map((url) => String(url).replace("/dynamic/default/", "/dynamic/480w/"));
    return {
      key: `blocket:${doc.id}`,
      source: "blocket",
      url: String(doc.canonical_url || `https://www.blocket.se/mobility/item/${doc.id}`),
      title: String(doc.heading || [doc.make, doc.model].filter(Boolean).join(" ")).slice(0, 120),
      subtitle: String(doc.model_specification || "").slice(0, 140),
      price,
      currency: String(doc.price.currency_code || "SEK").toUpperCase(),
      year: Number(doc.year) || null,
      mileage: Number.isFinite(mileage) && mileage > 0 ? Math.round(mileage * (window.AUTOGOOD_BLOCKET?.kmPerMil || 10)) : null,
      power: "",
      fuel: String(doc.fuel || ""),
      gearbox: String(doc.transmission || ""),
      city: String(doc.location || ""),
      country: "SE",
      seller: /privat/i.test(doc.dealer_segment || "") ? "private" : doc.dealer_segment ? "dealer" : "",
      rating: "",
      images: images.slice(0, 3),
      imageCount: images.length,
      createdAt: Number(doc.timestamp) ? new Date(Number(doc.timestamp)).toISOString() : "",
    };
  }

  function mobileOffer(listing) {
    return {
      key: `mobile:${listing.id}`,
      source: "mobile",
      url: String(listing.url || ""),
      title: String(listing.title || "").slice(0, 120),
      subtitle: "",
      price: Number(listing.price),
      currency: "EUR",
      year: Number(listing.year) || null,
      mileage: Number(listing.mileage) || null,
      power: String(listing.power || ""),
      fuel: String(listing.fuel || ""),
      gearbox: String(listing.gearbox || ""),
      city: [listing.postalCode, listing.city].filter(Boolean).join(" "),
      country: String(listing.country || ""),
      seller: String(listing.seller || ""),
      rating: listing.priceRating && listing.priceRating !== "NO_RATING" ? String(listing.priceRating) : "",
      images: [listing.image].filter(Boolean),
      imageCount: Number(listing.numImages) || 0,
      createdAt: String(listing.createdAt || ""),
    };
  }

  // Pages newest first until the offers reach the cut-off date.
  const reachedCutoff = (offers, cutoff) => offers.filter((offer) => Date.parse(offer.createdAt) < cutoff).length >= 3;

  async function readOtomoto(filters, price, cutoff) {
    const offers = [];
    let total = 0;
    let complete = false;
    for (let page = 1; page <= MAX_PAGES.otomoto; page += 1) {
      const response = await fetch(`${proxy()}${otomotoUrl(filters, price, page)}`, { headers: { "x-respond-with": "html" } });
      if (!response.ok) throw new Error(String(response.status));
      const result = otomotoOffers(await response.text());
      if (page === 1) total = result.total;
      offers.push(...result.offers);
      if (result.offers.length < 32 || reachedCutoff(result.offers, cutoff)) {
        complete = true;
        break;
      }
    }
    return { total, offers, complete };
  }

  async function readBlocket(filters, price, cutoff) {
    const blocket = window.AUTOGOOD_BLOCKET;
    if (!blocket) throw new Error("blocket unavailable");
    const offers = [];
    let total = 0;
    let complete = false;
    for (let page = 1; page <= MAX_PAGES.blocket; page += 1) {
      const data = await blocket.fetchApi(blocketUrl(filters, price, { api: true, page }));
      const docs = Array.isArray(data?.docs) ? data.docs : [];
      if (page === 1) total = Number(data?.metadata?.result_size?.match_count) || 0;
      const pageOffers = docs.map(blocketOffer).filter(Boolean);
      offers.push(...pageOffers);
      if (docs.length < 50 || reachedCutoff(pageOffers, cutoff)) {
        complete = true;
        break;
      }
    }
    return { total, offers, complete };
  }

  async function readMobile(filters, price) {
    if (typeof mobileDeApiBase !== "function") throw new Error("offline");
    const response = await fetch(`${mobileDeApiBase()}/mobilede/search?sort=newest&pages=${MAX_PAGES.mobile}&url=${encodeURIComponent(mobileUrl(filters, price))}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || payload.error || "offline");
    const offers = (payload.listings || []).map(mobileOffer).filter((offer) => offer.price > 0);
    // An importer from before 30.09 ignores sort=newest: no dates, no count.
    if (offers.length && !offers.some((offer) => offer.createdAt)) throw new Error("outdated");
    return { total: Number(payload.total) || 0, offers, complete: offers.length < MAX_PAGES.mobile * 20 };
  }

  // ---- A check ------------------------------------------------------------------

  const running = new Map();
  let statusMessage = "";
  let container = null;
  let shownEntry = null;
  let portalFilter = "";
  const expanded = new Set();
  const lastShown = { id: "", at: 0 };

  // A short fingerprint of the search: totals are compared only between
  // checks of the same filters and price.
  function signature(filters, watch, source) {
    const { markets, ...search } = filters || {};
    return [...JSON.stringify([search, portalPrice(watch, source)])]
      .reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261)
      .toString(36);
  }

  async function runCheck(entry) {
    if (!entry || running.has(entry.id)) return;
    const sources = helpers()?.selectedMarkets?.() || ["otomoto"];
    const state = { sources, progress: Object.fromEntries(sources.map((source) => [source, "loading"])) };
    running.set(entry.id, state);
    render();
    const before = watchOf(entry.id);
    const now = Date.now();
    const baseline = Date.parse(before.lastCheckAt);
    const firstCheck = !Number.isFinite(baseline);
    const cutoff = firstCheck ? now - FIRST_CHECK_DAYS * DAY : baseline - CLOCK_SLACK_MS;
    // Read at least a week back, so the 24 h / 7 days counts are whole.
    const readUntil = Math.min(cutoff, now - 7 * DAY);
    const readers = {
      otomoto: () => readOtomoto(entry.filters, portalPrice(before, "otomoto"), readUntil),
      blocket: () => readBlocket(entry.filters, portalPrice(before, "blocket"), readUntil),
      mobile: () => readMobile(entry.filters, portalPrice(before, "mobile")),
    };
    const results = {};
    await Promise.all(sources.map(async (source) => {
      try {
        if (source === "blocket") await window.AUTOGOOD_BLOCKET?.sekRateReady?.();
        results[source] = await readers[source]();
        state.progress[source] = "done";
      } catch (error) {
        const message = String(error?.message || error);
        results[source] = { error: source === "mobile" && message !== "outdated" ? "offline" : message };
        state.progress[source] = "error";
      }
      if (shownEntry?.id === entry.id) render();
    }));

    const at = new Date(now).toISOString();
    updateWatch(entry.id, (watch) => {
      const known = new Set([
        ...watch.offers.map((offer) => offer.key),
        ...SOURCES.flatMap((source) => watch.seen?.[source] || []),
      ]);
      const check = { at, first: firstCheck, sources: {} };
      const fresh = [];
      const seen = { ...watch.seen };
      sources.forEach((source) => {
        const result = results[source];
        if (!result || result.error) {
          check.sources[source] = { error: result?.error || "error" };
          return;
        }
        const isNew = (offer) => {
          if (known.has(offer.key)) return false;
          const created = Date.parse(offer.createdAt);
          return Number.isFinite(created) ? created >= cutoff : !firstCheck;
        };
        // A price far from the portal's other new offers is likely a typo or
        // a placeholder (e.g. 100 000 € for a Golf): marked, not hidden.
        const prices = result.offers.map((offer) => inPln(offer.price, offer.currency)).sort((left, right) => left - right);
        const middle = prices.length >= 8 ? prices[Math.floor(prices.length / 2)] : null;
        const suspect = (offer) => {
          if (!middle) return false;
          const price = inPln(offer.price, offer.currency);
          return price > middle * 2.5 || price < middle * 0.4;
        };
        const found = result.offers.filter(isNew);
        found.forEach((offer) => fresh.push({ ...offer, foundAt: at, ...(suspect(offer) ? { suspect: true } : {}) }));
        const dated = result.offers.map((offer) => Date.parse(offer.createdAt)).filter(Number.isFinite);
        const oldest = dated.length ? Math.min(...dated) : now;
        const inLast = (days) => dated.filter((time) => time >= now - days * DAY).length;
        check.sources[source] = {
          total: result.total,
          fresh: found.length,
          // Every read offer was new: there are more than counted.
          more: !result.complete && found.length === result.offers.length,
          day: inLast(1),
          dayMore: !result.complete && oldest >= now - DAY,
          week: inLast(7),
          weekMore: !result.complete && oldest >= now - 7 * DAY,
          sig: signature(entry.filters, watch, source),
        };
        seen[source] = [...new Set([...result.offers.map((offer) => offer.key), ...(seen[source] || [])])].slice(0, KEEP_SEEN);
      });
      const keepFrom = now - KEEP_OFFERS_DAYS * DAY;
      const kept = { otomoto: 0, mobile: 0, blocket: 0 };
      const offers = [...fresh.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))), ...watch.offers]
        .filter((offer) => Date.parse(offer.foundAt) >= keepFrom)
        .filter((offer) => {
          kept[offer.source] = (kept[offer.source] || 0) + 1;
          return kept[offer.source] <= KEEP_PER_PORTAL;
        });
      const anyRead = sources.some((source) => results[source] && !results[source].error);
      return {
        ...watch,
        // A check that read no portal leaves the baseline where it was.
        lastCheckAt: anyRead ? at : watch.lastCheckAt,
        checks: [...watch.checks, check].slice(-KEEP_CHECKS),
        offers,
        seen,
        pricesChanged: anyRead ? false : watch.pricesChanged,
      };
    });
    running.delete(entry.id);
    if (shownEntry?.id === entry.id) render();
  }

  // ---- Drawing ------------------------------------------------------------------

  // Logo = the portal (its search opens there), flag = the compared market.
  function badge(source) {
    return helpers()?.marketBadge?.(source) || esc(portalName(source));
  }

  function logo(source, kind = "mark") {
    const src = kind === "logo" ? helpers()?.brandLogo?.(source) : helpers()?.brandMark?.(source);
    return src ? `<img class="agWatch${kind === "logo" ? "Logo" : "Mark"}" src="${esc(src)}" alt="${esc(portalName(source))}" />` : esc(portalName(source));
  }

  function latestMedian(entry, source) {
    const log = entry.priceLog || [];
    for (let index = log.length - 1; index >= 0; index -= 1) {
      if (log[index].filtersChange) return null;
      if (log[index][source]) return log[index][source];
    }
    return null;
  }

  function inPln(value, currency) {
    return helpers()?.priceInPln?.(value, currency) ?? value;
  }

  function offerHtml(offer, entry) {
    const c = t();
    const foreign = offer.source !== "otomoto";
    const turnkey = foreign && window.AUTOGOOD_TURNKEY
      ? window.AUTOGOOD_TURNKEY.turnkeyAverage({
        price: offer.price,
        currency: offer.currency,
        fuel: offer.fuel,
        title: offer.title,
        displacementCcm: offer.displacementCcm,
      }, entry.filters).total
      : null;
    const market = latestMedian(entry, offer.source);
    let versus = "";
    if (offer.suspect) versus = `<span class="agWatchTag isBad">${esc(c.suspect)}</span>`;
    else if (market?.median) {
      const own = inPln(offer.price, offer.currency);
      const median = inPln(market.median, market.currency || CURRENCY[offer.source]);
      const pct = ((own - median) / median) * 100;
      const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
      const good = pct < -0.5;
      const p25 = Number.isFinite(market.p25) ? inPln(market.p25, market.currency || CURRENCY[offer.source]) : null;
      versus = `<span class="agWatchTag ${good ? "isGood" : pct > 0.5 ? "isBad" : ""}">${esc(fill(c.vsMedian, { value: `${sign}${Math.abs(Math.round(pct))}%` }))}</span>${p25 !== null && own < p25 ? `<span class="agWatchTag isGood">${esc(c.belowP25)}</span>` : ""}`;
    }
    const rating = c.ratings[offer.rating];
    const ratingTag = rating ? `<span class="agWatchTag ${rating[1]}" title="${esc(portalName(offer.source))}">${esc(rating[0])}</span>` : "";
    const specs = [
      offer.year,
      offer.mileage ? `${number(offer.mileage)} km` : "",
      offer.power,
      offer.fuel,
      offer.gearbox,
    ].filter(Boolean).map(esc).join(" · ");
    const seller = offer.seller === "dealer" ? c.dealer : offer.seller === "private" ? c.private : "";
    const place = [seller, offer.city, offer.country && offer.country !== "PL" && offer.source === "mobile" ? offer.country : ""].filter(Boolean).map(esc).join(" · ");
    const photos = offer.images || [];
    return `
      <article class="agWatchOffer is${offer.source}">
        <a class="agWatchPhotos" href="${esc(offer.url)}" target="_blank" rel="noopener" aria-label="${esc(c.open)}">
          ${photos.length ? `<img src="${esc(photos[0])}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<span class="agWatchNoPhoto">${logo(offer.source, "logo")}</span>`}
          ${photos.length > 1 ? `<span class="agWatchThumbs">${photos.slice(1, 3).map((url) => `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`).join("")}</span>` : ""}
          ${offer.imageCount > 1 ? `<small class="agWatchPhotoCount">${esc(fill(c.photos, { count: offer.imageCount }))}</small>` : ""}
        </a>
        <div class="agWatchOfferBody">
          <div class="agWatchOfferHead">
            <div>
              <a class="agWatchOfferTitle" href="${esc(offer.url)}" target="_blank" rel="noopener">${esc(offer.title)}</a>
              ${offer.subtitle ? `<small>${esc(offer.subtitle)}</small>` : ""}
            </div>
            <div class="agWatchPrice">
              <b>${esc(money(offer.price, offer.currency))}</b>
              ${foreign ? `<small>${esc(c.brutto)}</small>` : ""}
              ${Number.isFinite(turnkey) ? `<em>~ ${esc(money(turnkey, "PLN"))} ${esc(c.turnkey)}</em>` : ""}
            </div>
          </div>
          ${specs ? `<p class="agWatchSpecs">${specs}</p>` : ""}
          <p class="agWatchMeta">${logo(offer.source)}${place ? `<span>${place}</span>` : ""}<time datetime="${esc(offer.createdAt)}" title="${esc(dateLabel(offer.createdAt))}">${esc(agoLabel(offer.createdAt))}</time></p>
          ${versus || ratingTag ? `<p class="agWatchTags">${versus}${ratingTag}</p>` : ""}
        </div>
      </article>`;
  }

  function countLabel(value, more) {
    return `${number(value || 0)}${more ? "+" : ""}`;
  }

  function tileHtml(source, entry, watch, state) {
    const c = t();
    const lastCheck = [...watch.checks].reverse().find((check) => check.sources?.[source]);
    const data = lastCheck?.sources?.[source];
    const loading = state?.progress?.[source] === "loading";
    const url = portalSearchUrl(source, entry.filters, portalPrice(watch, source));
    // The total is compared with the check before, if it had the same search.
    const previous = lastCheck ? [...watch.checks].reverse().find((check) => check !== lastCheck && check.sources?.[source]?.total !== undefined) : null;
    const previousData = previous?.sources?.[source];
    const delta = data && previousData && previousData.sig === data.sig ? data.total - previousData.total : null;
    const since = lastCheck ? [...watch.checks].slice(0, watch.checks.indexOf(lastCheck)).reverse().find((check) => check.sources?.[source] && !check.sources[source].error) : null;
    let body;
    if (loading) {
      body = `<p class="agWatchTileNumber isLoading">…</p><p class="agWatchTileLabel">${esc(c.loading)}</p>`;
    } else if (!data) {
      body = `<p class="agWatchTileNumber">—</p><p class="agWatchTileLabel">${esc(c.neverChecked)}</p>`;
    } else if (data.error) {
      const reason = data.error === "outdated" ? c.mobileOutdated : source === "mobile" ? c.mobileOffline : c.portalError;
      body = `<p class="agWatchTileNumber">!</p><p class="agWatchTileLabel">${esc(reason)}</p>`;
    } else {
      body = `
        <p class="agWatchTileNumber">${esc(data.more ? countLabel(data.fresh, true) : `+${number(data.fresh)}`)}</p>
        <p class="agWatchTileLabel">${esc(lastCheck.first ? fill(c.newFirst, { days: FIRST_CHECK_DAYS }) : fill(c.newSince, { date: since ? dateLabel(since.at) : "—" }))}</p>
        <p class="agWatchTileStats"><span>${esc(c.last24)}: <b>${esc(countLabel(data.day, data.dayMore))}</b></span><span>${esc(c.last7)}: <b>${esc(countLabel(data.week, data.weekMore))}</b></span></p>
        <p class="agWatchTileStats"><span>${esc(fill(c.total, { count: number(data.total) }))}${delta ? ` <em class="${delta > 0 ? "isGood" : "isBad"}">${delta > 0 ? "▲" : "▼"} ${esc(number(Math.abs(delta)))}</em>` : ""}</span></p>`;
    }
    const active = portalFilter === source;
    return `
      <div class="agWatchTile is${source}${active ? " isActive" : ""}">
        <button class="agWatchTileMain" type="button" data-watch-filter="${source}" aria-pressed="${active ? "true" : "false"}">
          <span class="agWatchTileHead">${logo(source, "logo")}${badge(source)}</span>
          ${body}
        </button>
        ${url ? `<a class="agWatchTileLink" href="${esc(url)}" target="_blank" rel="noopener">${esc(c.openPortal)} ↗</a>` : ""}
      </div>`;
  }

  function pricesHtml(entry, watch, sources) {
    const c = t();
    const unit = (source) => (CURRENCY[source] === "PLN" ? "zł" : CURRENCY[source] === "SEK" ? "kr" : "€");
    return `
      <div class="agWatchPrices">
        <p class="agWatchPricesHead"><b>${esc(c.pricesHeading)}</b> <small>${esc(c.pricesHint)}</small></p>
        <div class="agWatchPriceRows">
          ${sources.map((source) => {
            const own = watch.prices?.[source] || {};
            const inherited = filtersPriceIn(source, entry.filters);
            const range = inherited.from === null && inherited.to === null
              ? c.noPrice
              : [inherited.from !== null ? `${c.from} ${money(inherited.from, CURRENCY[source])}` : "", inherited.to !== null ? `${c.to} ${money(inherited.to, CURRENCY[source])}` : ""].filter(Boolean).join(" ");
            const field = (side, placeholder) => `<label><span>${esc(c[side])}</span><input type="text" inputmode="numeric" data-watch-price="${source}" data-watch-side="${side}" value="${esc(own[side] ? number(cleanPrice(own[side])) : "")}" placeholder="${esc(placeholder === null ? "" : number(placeholder))}" /><i>${esc(unit(source))}</i></label>`;
            return `<div class="agWatchPriceRow is${source}${portalPrice(watch, source) ? " isOwn" : ""}">
              <span class="agWatchPriceLogo">${logo(source, "logo")}</span>
              ${field("from", inherited.from)}
              ${field("to", inherited.to)}
              <small>${esc(fill(c.fromFilters, { range }))}</small>
            </div>`;
          }).join("")}
        </div>
        ${watch.pricesChanged ? `<p class="agWatchNotice">${esc(c.pricesChanged)}</p>` : ""}
      </div>`;
  }

  function historyHtml(watch, sources) {
    const c = t();
    const checks = [...watch.checks].reverse().slice(0, 12);
    if (!checks.length) return `<p class="agWatchEmpty">${esc(c.historyEmpty)}</p>`;
    return `
      <div class="mobileMarketTableScroll">
        <table class="mobileMarketTable agWatchHistory">
          <thead><tr><th scope="col">${esc(c.historyDate)}</th>${sources.map((source) => `<th scope="col">${logo(source, "logo")}</th>`).join("")}</tr></thead>
          <tbody>${checks.map((check) => `<tr><th scope="row">${esc(dateLabel(check.at))}</th>${sources.map((source) => {
            const data = check.sources?.[source];
            if (!data) return "<td>—</td>";
            if (data.error) return `<td class="isError">!</td>`;
            return `<td><b>+${esc(countLabel(data.fresh, data.more))}</b> <small>/ ${esc(number(data.total))}</small></td>`;
          }).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  function render() {
    if (!container) return;
    const c = t();
    const entry = shownEntry;
    const hasFavorites = Boolean(helpers()?.hasFavorites?.());
    if (!entry) {
      container.innerHTML = `
        <section class="mobileMarketCard agWatchIntro">
          <h2 class="agBlockTitle"><i aria-hidden="true">★</i> ${esc(c.heading)}</h2>
          <p>${esc(hasFavorites ? c.intro : c.noFavorites)}</p>
        </section>`;
      return;
    }
    const watch = watchOf(entry.id);
    const state = running.get(entry.id);
    const sources = helpers()?.selectedMarkets?.() || ["otomoto"];
    const title = [entry.filters.brand, entry.filters.model, entry.filters.version].filter(Boolean).join(" ");
    const meta = helpers()?.historyMeta?.(entry.filters)?.join(" · ") || "";
    const lastCheck = watch.checks[watch.checks.length - 1];
    const previous = lastCheck && !lastCheck.first
      ? [...watch.checks].slice(0, -1).reverse().find((check) => Object.values(check.sources || {}).some((data) => !data.error))
      : null;
    const latest = watch.offers.filter((offer) => offer.foundAt === lastCheck?.at);
    const earlier = watch.offers.filter((offer) => offer.foundAt !== lastCheck?.at);
    const onPortal = (offer) => sources.includes(offer.source) && (!portalFilter || offer.source === portalFilter);
    const latestShown = latest.filter(onPortal);
    const earlierShown = earlier.filter(onPortal);
    container.innerHTML = `
      <section class="mobileMarketCard agWatchHead">
        <div class="mobileMarketPriceHistoryHead">
          <div>
            <strong>★ ${esc(title)}</strong>
            ${meta ? `<small>${esc(meta)}</small>` : ""}
            <small class="agWatchLastCheck">${esc(watch.lastCheckAt ? fill(c.lastCheck, { date: `${dateLabel(watch.lastCheckAt)} (${agoLabel(watch.lastCheckAt)})` }) : c.neverChecked)}</small>
          </div>
          <div class="mobileMarketToolbarActions">
            <button class="mobileMarketImportClear" type="button" data-mobile-favorite-filters="${esc(entry.id)}">${esc(c.filters)}</button>
            <button class="mobileMarketImportClear" type="button" data-mobile-market-favorite="${esc(entry.id)}">${esc(c.analysis)} →</button>
            <button class="mobileMarketImportClear isPrimary" type="button" data-watch-check${state ? " disabled" : ""}>${esc(state ? c.checking : c.check)}</button>
          </div>
        </div>
        ${pricesHtml(entry, watch, sources)}
        <div class="agWatchTiles" style="--tiles:${sources.length}">
          ${sources.map((source) => tileHtml(source, entry, watch, state)).join("")}
        </div>
        ${statusMessage ? `<p class="agWatchNotice isError">${esc(statusMessage)}</p>` : ""}
      </section>
      ${lastCheck ? `
      <section class="mobileMarketCard agWatchList">
        <h2 class="agBlockTitle">${esc(lastCheck.first ? fill(c.firstHeading, { days: FIRST_CHECK_DAYS }) : previous ? fill(c.newHeadingSince, { date: dateLabel(previous.at) }) : c.newHeading)}${portalFilter ? ` · ${logo(portalFilter, "logo")} <button class="agWatchClearFilter" type="button" data-watch-filter="">${esc(c.allPortals)} ×</button>` : ""}</h2>
        ${lastCheck.first ? `<p class="agWatchEmpty">${esc(c.firstNote)}</p>` : ""}
        ${latestShown.length ? sources.filter((source) => latestShown.some((offer) => offer.source === source)).map((source) => {
          const own = latestShown.filter((offer) => offer.source === source);
          const all = Boolean(portalFilter) || expanded.has(source);
          return `<div class="agWatchGroup is${source}">
            <h3 class="agWatchGroupHead">${logo(source, "logo")} <b>+${esc(number(Math.max(own.length, lastCheck.sources?.[source]?.fresh || 0)))}</b></h3>
            <div class="agWatchOffers">${(all ? own : own.slice(0, SHOW_PER_PORTAL)).map((offer) => offerHtml(offer, entry)).join("")}</div>
            ${!portalFilter && own.length > SHOW_PER_PORTAL ? `<button class="agWatchMore" type="button" data-watch-expand="${source}">${esc(expanded.has(source) ? c.showLess : fill(c.showAll, { count: own.length }))}</button>` : ""}
          </div>`;
        }).join("") : `<p class="agWatchEmpty">${esc(c.noNew)}</p>`}
        ${earlierShown.length ? `<details class="agWatchEarlier"><summary>${esc(fill(c.earlier, { count: earlierShown.length, days: KEEP_OFFERS_DAYS }))}</summary><div class="agWatchOffers">${earlierShown.map((offer) => offerHtml(offer, entry)).join("")}</div></details>` : ""}
        <p class="agWatchFootnote">${esc(c.medianNote)} ${sources.some((source) => source !== "otomoto") ? esc(c.turnkeyNote) : ""}</p>
      </section>` : ""}
      <section class="mobileMarketCard agWatchChecks">
        <h2 class="agBlockTitle">${esc(c.historyHeading)}</h2>
        ${historyHtml(watch, sources)}
      </section>`;
  }

  // Called by mobile-market-analysis.js whenever page 4 is drawn.
  function show(target, entry) {
    if (target && target !== container) {
      container = target;
      container.addEventListener("click", onClick);
      container.addEventListener("change", onPriceChange);
      container.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && event.target.closest("[data-watch-price]")) event.target.blur();
      });
    }
    const changed = entry?.id !== shownEntry?.id;
    shownEntry = entry || null;
    if (changed) {
      portalFilter = "";
      expanded.clear();
      statusMessage = "";
    }
    render();
    if (!entry) return;
    // A newly shown car is checked at once, unless it was checked just now.
    const now = Date.now();
    const fresh = changed || now - lastShown.at > AUTO_CHECK_AFTER_MS || lastShown.id !== entry.id;
    lastShown.id = entry.id;
    lastShown.at = now;
    const lastCheck = Date.parse(watchOf(entry.id).lastCheckAt);
    if (fresh && !(Number.isFinite(lastCheck) && now - lastCheck < AUTO_CHECK_AFTER_MS)) runCheck(entry);
  }

  function onClick(event) {
    if (event.target.closest("[data-watch-check]")) {
      runCheck(shownEntry);
      return;
    }
    const expand = event.target.closest("[data-watch-expand]");
    if (expand) {
      const source = expand.dataset.watchExpand;
      if (expanded.has(source)) expanded.delete(source);
      else expanded.add(source);
      render();
      return;
    }
    const filter = event.target.closest("[data-watch-filter]");
    if (filter) {
      const source = filter.dataset.watchFilter;
      portalFilter = source && portalFilter !== source ? source : "";
      render();
    }
  }

  function onPriceChange(event) {
    const input = event.target.closest("[data-watch-price]");
    if (!input || !shownEntry) return;
    const source = input.dataset.watchPrice;
    const side = input.dataset.watchSide;
    const value = cleanPrice(input.value);
    updateWatch(shownEntry.id, (watch) => {
      const current = { ...(watch.prices?.[source] || {}) };
      if (value === null) delete current[side];
      else current[side] = value;
      const prices = { ...watch.prices };
      if (current.from === undefined && current.to === undefined) delete prices[source];
      else prices[source] = current;
      return { ...watch, prices, pricesChanged: true };
    });
    render();
  }

  // Another tab changed the watch data: redraw from storage.
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && shownEntry) render();
  });

  window.AUTOGOOD_FAVORITES_WATCH = { show, render };
})();
