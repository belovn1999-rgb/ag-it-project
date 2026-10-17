// Moving the history and favourites to the Mantexlab Tools platform (owner
// 2026-10-15, docs/PLATFORM-SEARCH.md): "Skopiuj dla platformy" copies them as
// text; the manager pastes it on the platform ("Перенос из старой программы").
// Since 2026-10-16 (PLATFORM-SEARCH §6, wave 3b.2) each search also carries its
// page 3 Monitoring: the switch and schedule, its portals and countries, the
// client's budget, "Pokazuj tylko", its own portal prices, and the cars marked
// on page 3 (★, "Przejrzane", "Wysłane klientowi"). Since 2026-10-17 (wave 3b.7,
// owner): the page 2 client budget of every search and the market history
// (priceLog) of the favourites — one check a day, compact. The full lists of
// old checks (IndexedDB) stay here.
// Read-only — nothing in this browser's storage is written or removed (4.6.1).
(() => {
  const button = document.querySelector("[data-mobile-history-export]");
  const status = document.querySelector("[data-mobile-history-export-status]");
  if (!button || !status) return;
  const KEYS = { history: "autogood.mobile.marketHistory.v2", legacy: "autogood.mobile.marketHistory.v1", favorites: "autogood.mobile.marketFavorites.v1" };
  // Page 3 Monitoring (src/mobile-monitoring.js, src/mobile-favorites-watch.js): maps keyed by the search's id.
  const MONITORING_KEYS = { scope: "autogood.mobile.monitoringScope.v1", watch: "autogood.mobile.favoriteWatch.v1", saved: "autogood.mobile.savedCars.v1", marks: "autogood.mobile.carMarks.v1" };
  const MONITORING_COUNTRIES = ["DE", "NL", "BE", "AT", "LU"];
  // Page 2 "Budżet klienta (zł)" by search id (src/mobile-market-analysis.js, CLIENT_BUDGET_KEY).
  const BUDGET_KEY = "autogood.mobile.clientBudget.v1";
  // marketPricePoint's sources (MARKET_SOURCES of src/mobile-market-analysis.js).
  const SOURCES = ["otomoto", "mobile", "autoscout", "kleinanzeigen", "autoscoutfr", "paruvendu", "marktplaats", "dehands", "blocket", "avby"];
  const HISTORY_DAYS = 365;
  const TEXT = {
    pl: { done: "Skopiowano wyszukiwań: {n} (★ {f}, monitoring {m}, oznaczonych aut {c}, dni historii rynku {h}). Wklej na platformie: Поиск дилеры → «Перенести из старой программы».", empty: "Historia jest pusta — nie ma czego przenosić.", manual: "Wyszukiwań do przeniesienia: {n} (★ {f}). Przeglądarka nie pozwoliła skopiować — zaznacz tekst poniżej, skopiuj (Ctrl/Cmd + C) i wklej na platformie: Поиск дилеры → «Перенести из старой программы»." },
    ru: { done: "Скопировано поисков: {n} (★ {f}, мониторинг {m}, отмеченных машин {c}, дней истории рынка {h}). Вставьте на платформе: Поиск дилеры → «Перенести из старой программы».", empty: "История пуста — переносить нечего.", manual: "Поисков для переноса: {n} (★ {f}). Браузер не дал скопировать — выделите текст ниже, скопируйте (Ctrl/Cmd + C) и вставьте на платформе: Поиск дилеры → «Перенести из старой программы»." },
  };
  const t = () => TEXT[document.documentElement.lang === "ru" ? "ru" : "pl"];

  const read = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed.filter((entry) => entry?.filters?.brand && entry?.filters?.model) : [];
    } catch {
      return [];
    }
  };

  const readMap = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  // Monitoring of one search as page 3 runs it (monitoringScopeOf /
  // monitoringSelection): its own portals or the search's, its countries or
  // the five by default; null when it was never set up.
  function monitoringOf(entry, maps) {
    const id = String(entry.id || "");
    const scope = maps.scope[id] && typeof maps.scope[id] === "object" ? maps.scope[id] : {};
    const auto = entry.autoRefresh && typeof entry.autoRefresh === "object" ? entry.autoRefresh : {};
    const prices = maps.watch[id]?.prices && typeof maps.watch[id].prices === "object" ? maps.watch[id].prices : null;
    const picked = Array.isArray(scope.markets) ? scope.markets.filter((source) => typeof source === "string") : [];
    const listed = Array.isArray(scope.countries) ? scope.countries.filter((code) => MONITORING_COUNTRIES.includes(code)) : [];
    if (!auto.enabled && !picked.length && !scope.budget && !scope.only && !(prices && Object.keys(prices).length)) return null;
    return {
      enabled: Boolean(auto.enabled),
      every: String(auto.every || ""),
      time: String(auto.time || ""),
      markets: picked.length ? picked : (Array.isArray(entry.filters?.markets) ? entry.filters.markets : []),
      countries: picked.length ? listed : (listed.length ? listed : MONITORING_COUNTRIES),
      budget: scope.budget && typeof scope.budget === "object" ? { from: scope.budget.from ?? null, to: scope.budget.to ?? null } : null,
      only: scope.only && typeof scope.only === "object" ? scope.only : null,
      prices,
    };
  }

  // Cars marked on page 3 for one search: ★ (savedCars) and opened / sent
  // (carMarks), one item per offer key, with the offer as it was then.
  function carsOf(entry, maps) {
    const id = String(entry.id || "");
    const byKey = new Map();
    const put = (source, offer, patch) => {
      if (!offer?.key) return;
      const was = byKey.get(offer.key) || {
        source: String(source || ""), id: offer.id ? String(offer.id) : "", url: String(offer.url || "").slice(0, 600),
        title: String(offer.title || "").slice(0, 200), price: Number(offer.price) || null, currency: String(offer.currency || ""),
        year: Number(offer.year) || null, mileage: Number(offer.mileage) || null, photo: String(offer.photo || "").slice(0, 600),
        saved: null, seen: null, sent: null,
      };
      byKey.set(offer.key, { ...was, ...patch });
    };
    (Array.isArray(maps.saved[id]) ? maps.saved[id] : []).forEach((item) => put(item?.source, item?.offer, { saved: String(item?.savedAt || new Date().toISOString()) }));
    const marks = maps.marks[id] && typeof maps.marks[id] === "object" ? maps.marks[id] : {};
    Object.values(marks).forEach((mark) => put(mark?.source, mark?.offer, { seen: mark?.seen || null, sent: mark?.sent || null }));
    return [...byKey.values()].slice(0, 300);
  }

  // The market history of one favourite for the platform's "История цен"
  // (LegacyHistory there): the last check of each day (a Monitoring one
  // wins), the "filters / prices changed" marks between them, the latest
  // year. A market is [currency, count, min, max, median, p25, p75, middle]
  // plus the turnkey min, max, median, p25, p75 when it was counted.
  function historyOf(entry) {
    const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString();
    const log = Array.isArray(entry.priceLog) ? entry.priceLog.filter((point) => point && typeof point.at === "string" && point.at >= since) : [];
    const out = [];
    log.forEach((point) => {
      if (point.filtersChange) {
        if (out.length && out[out.length - 1].kind !== "change") out.push({ at: point.at, kind: "change" });
        return;
      }
      const markets = {};
      SOURCES.forEach((source) => {
        const m = point[source];
        if (!m || !(Number(m.count) > 0)) return;
        const row = [String(m.currency || ""), m.count, m.min, m.max, m.median, m.p25, m.p75, m.middleCount ?? null].map((value) => (typeof value === "number" ? Math.round(value) : value));
        const t = m.turnkey;
        if (t && Number(t.median) > 0) row.push(...[t.min, t.max, t.median, t.p25, t.p75].map((value) => Math.round(Number(value) || 0)));
        markets[source] = row;
      });
      if (!Object.keys(markets).length) return;
      const item = { at: point.at, kind: point.monitoring ? "monitoring" : "analysis", markets };
      // One check a day (no mark between): a later one replaces it, an
      // analysis never replaces a Monitoring check.
      const last = out[out.length - 1];
      if (last && last.kind !== "change" && last.at.slice(0, 10) === point.at.slice(0, 10)) {
        if (!(last.kind === "monitoring" && item.kind !== "monitoring")) out[out.length - 1] = item;
        return;
      }
      out.push(item);
    });
    while (out.length && out[out.length - 1].kind === "change") out.pop();
    return out;
  }

  // The same entries the history shows: the current list (or the legacy one)
  // plus every favourite kept only in the backup key.
  function entries() {
    const maps = Object.fromEntries(Object.entries(MONITORING_KEYS).map(([name, key]) => [name, readMap(key)]));
    const budgets = readMap(BUDGET_KEY);
    let list = read(KEYS.history);
    if (!list.length) list = read(KEYS.legacy);
    const known = new Set(list.map((entry) => String(entry.id || "")));
    const restored = read(KEYS.favorites).filter((entry) => !known.has(String(entry.id || ""))).map((entry) => ({ ...entry, pinned: true }));
    return [...list, ...restored].map((entry) => ({
      filters: entry.filters,
      pinned: Boolean(entry.pinned),
      note: String(entry.note || "").slice(0, 200),
      car: entry.car?.sourceUrl ? { sourceUrl: String(entry.car.sourceUrl).slice(0, 400), title: String(entry.car.title || "").slice(0, 160) } : null,
      lang: entry.lang === "ru" ? "ru" : "pl",
      createdAt: String(entry.createdAt || entry.updatedAt || ""),
      updatedAt: String(entry.updatedAt || entry.createdAt || ""),
      monitoring: monitoringOf(entry, maps),
      cars: carsOf(entry, maps),
      budget: Number(budgets[String(entry.id || "")]) > 0 ? Math.round(Number(budgets[String(entry.id || "")])) : null,
      history: entry.pinned ? historyOf(entry) : [],
    }));
  }

  function show(message, text = "") {
    status.hidden = false;
    status.textContent = message;
    if (text) {
      const area = document.createElement("textarea");
      area.className = "mobileHistoryExportText";
      area.readOnly = true;
      area.rows = 4;
      area.value = text;
      status.appendChild(area);
      area.select();
    }
  }

  button.addEventListener("click", async () => {
    const list = entries();
    if (!list.length) return show(t().empty);
    const text = JSON.stringify({ format: "search-history", version: 1, exportedAt: new Date().toISOString(), entries: list });
    const fill = (message) => message.replace("{n}", String(list.length)).replace("{f}", String(list.filter((entry) => entry.pinned).length))
      .replace("{m}", String(list.filter((entry) => entry.monitoring?.enabled).length)).replace("{c}", String(list.reduce((sum, entry) => sum + entry.cars.length, 0)))
      .replace("{h}", String(list.reduce((sum, entry) => sum + entry.history.filter((item) => item.kind !== "change").length, 0)));
    try {
      await navigator.clipboard.writeText(text);
      show(fill(t().done));
    } catch {
      show(fill(t().manual), text);
    }
  });
})();
