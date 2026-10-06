/* AUTOGOOD "Przygotuj ofertę" on page 3 "Monitoring" (B71, owner 2026-10-05).
 *
 * Every offer from abroad in the Monitoring list has the button (rendered by
 * mobile-market-analysis.js as [data-offer-create]). A click opens
 * oferta.html in a new tab at once (a popup must open on the click itself)
 * and then makes the offer's draft here, where everything it needs is loaded:
 * - the favourite's search (localStorage, read only);
 * - its Monitoring checks (IndexedDB autogood-mobile-check-offers, read only)
 *   → the market around the ad on this day (offer-market.js);
 * - the preliminary turnkey cost by the calculator's "Zakup bezpośredni" with
 *   the seller's own transport / inspection tariff (turnkey-estimate.js,
 *   estimateDeliveryInspection in mobile.js) — replaced by the calculator's
 *   exact lines on the offer page (wave 3).
 * The draft goes to IndexedDB autogood-offers (offer-store.js); the offer page
 * waits for it. A button whose ad already has an offer says so.
 */
(() => {
  const store = window.AUTOGOOD_OFFER_STORE;
  if (!store) return;
  const HISTORY_KEY = "autogood.mobile.marketHistory.v2";
  const FAVORITES_KEY = "autogood.mobile.marketFavorites.v1";
  const SAVED_KEY = "autogood.mobile.savedCars.v1";
  const CHECKS_DB = "autogood-mobile-check-offers";
  // The portals an offer can be made for now (docs/OFFER-PAGE.md §2): those
  // offer-ad.js reads (mobile.de, AutoScout24 DE/FR, ParuVendu, Kleinanzeigen).
  const SOURCES = ["mobile", "autoscout", "autoscoutfr", "paruvendu", "kleinanzeigen"];
  const WORDS = {
    pl: { make: "Przygotuj ofertę", has: "Oferta · {date}", hasTitle: "Oferta z {date} — otwórz (nowa: przytrzymaj Shift)", failed: "Nie udało się przygotować oferty: {reason}" },
    ru: { make: "Подготовить оффер", has: "Оффер · {date}", hasTitle: "Оффер от {date} — открыть (новый: удерживайте Shift)", failed: "Не удалось подготовить оффер: {reason}" },
  };
  const words = () => WORDS[document.documentElement.lang === "ru" ? "ru" : "pl"];
  const shortDate = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }
  const favoriteOf = (id) => readList(HISTORY_KEY).find((entry) => entry.id === id) || readList(FAVORITES_KEY).find((entry) => entry.id === id) || null;

  function savedOffer(favoriteId, key) {
    try {
      const all = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
      return (all?.[favoriteId] || []).find((item) => item.offer?.key === key) || null;
    } catch {
      return null;
    }
  }

  // The favourite's checks, read only (the analysis owns this database).
  function loadChecks(historyId) {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve([]);
      const request = indexedDB.open(CHECKS_DB);
      request.onerror = () => resolve([]);
      request.onsuccess = () => {
        const db = request.result;
        try {
          if (!db.objectStoreNames.contains("checks")) return resolve([]);
          const read = db.transaction("checks").objectStore("checks").index("historyId").getAll(historyId);
          read.onsuccess = () => resolve(read.result || []);
          read.onerror = () => resolve([]);
        } catch {
          resolve([]);
        } finally {
          db.close();
        }
      };
    });
  }

  // The calculator's "Zakup bezpośredni" with the seller's own tariff: the
  // same figures "Oblicz na gotowo" starts from.
  function estimate(offer, filters) {
    const turnkey = window.AUTOGOOD_TURNKEY;
    if (!turnkey) return null;
    const rates = turnkey.currentRates();
    const tariff = typeof estimateDeliveryInspection === "function"
      ? estimateDeliveryInspection(offer.body || "", { country: offer.country || "DE", postalCode: offer.zip || "", city: offer.city || "" })
      : { transport: turnkey.AVERAGE_TRANSPORT_NETTO, inspection: turnkey.AVERAGE_INSPECTION_NETTO, rule: "average" };
    const engine = turnkey.engineInfo({ fuel: offer.fuel, title: offer.title, displacementCcm: offer.ccm }, filters || {});
    const price = Number(offer.price) || 0;
    const currency = offer.currency || "EUR";
    const carBruttoEur = currency === "EUR" ? price : currency === "SEK" ? (price * rates.sek) / rates.eur : price / rates.eur;
    const result = turnkey.turnkeyDirect({
      carBruttoEur,
      rate: rates.eur,
      transportNettoPln: tariff.transport,
      inspectionNettoPln: tariff.inspection,
      engineTypeIndex: engine.index,
    });
    return {
      method: "direct",
      rate: result.rate,
      rateLive: Boolean(window.AUTOGOOD_EXCHANGE_RATES?.live),
      carBruttoEur: Math.round(carBruttoEur),
      transportNetto: tariff.transport,
      inspectionNetto: tariff.inspection,
      tariffRule: tariff.rule || "",
      engine: { index: engine.index, ccm: engine.ccm || null, source: engine.source, rate: turnkey.EXCISE_RATES[engine.index] },
      parts: result.parts,
      total: result.total,
    };
  }

  function importerUrl() {
    try {
      return typeof readMobileDeApiUrl === "function" ? readMobileDeApiUrl() : "";
    } catch {
      return "";
    }
  }

  async function makeDraft({ id, favoriteId, key, source }) {
    const favorite = favoriteOf(favoriteId);
    const records = await loadChecks(favoriteId);
    const market = window.AUTOGOOD_OFFER_MARKET?.snapshot(records, key) || null;
    // Saved (★) but no longer in any kept check: the saved copy.
    const offer = market?.offer || savedOffer(favoriteId, key)?.offer || null;
    if (!offer) throw new Error("ad not found in this car's monitoring");
    const filters = favorite?.filters || {};
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const sequence = (await store.madeOn(day).catch(() => 0)) + 1;
    return {
      id,
      createdAt: now.toISOString(),
      number: `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}-${String(sequence).padStart(2, "0")}`,
      lang: "pl",
      favoriteId,
      favoriteTitle: [filters.brand, filters.model, filters.version].filter(Boolean).join(" "),
      filters,
      source: market?.source || source,
      adKey: key,
      url: offer.url || "",
      importer: importerUrl(),
      car: { ...offer },
      market: market ? { at: market.at, extra: market.extra, own: market.market, poland: market.poland, ad: market.ad, pace: market.pace } : null,
      estimate: estimate(offer, filters),
      manager: store.manager(),
      company: store.company(),
      client: { salutation: "Pan", name: "" },
      edits: {},
      hidden: [],
      ad: null,
    };
  }

  // A new offer: the draft is saved first (a fraction of a second, well
  // inside the click's permission to open a tab), then its page opens. A
  // browser that opens no new tab shows it in this one.
  async function create(button) {
    const favoriteId = button.dataset.offerHistory;
    const key = button.dataset.offerKey;
    const source = button.dataset.offerSource;
    if (!favoriteId || !key || button.disabled) return;
    const id = store.newId();
    const page = new URL("oferta.html", window.location.href);
    page.searchParams.set("id", id);
    button.disabled = true;
    try {
      await store.put(await makeDraft({ id, favoriteId, key, source }));
      const tab = window.open(page.toString(), "_blank");
      if (!tab) window.location.href = page.toString();
    } catch (error) {
      window.alert(words().failed.replace("{reason}", String(error?.message || error)));
    } finally {
      button.disabled = false;
    }
    decorate();
  }

  // The click must open the tab before any waiting, so the check for an
  // existing offer is read from the cache the buttons were labelled from.
  const known = new Map();
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-offer-create]");
    if (!button) return;
    event.preventDefault();
    // An ad with an offer opens it again; Shift makes a new one (new market data).
    const existing = event.shiftKey ? null : known.get(button.dataset.offerKey);
    if (existing) {
      const page = new URL("oferta.html", window.location.href);
      page.searchParams.set("id", existing.id);
      window.open(page.toString(), "_blank");
      return;
    }
    create(button);
  });

  // Labels: "Oferta · 05.10" on ads that have one.
  let pending = 0;
  async function decorate() {
    const buttons = [...document.querySelectorAll("[data-offer-create]")];
    const keys = [...new Set(buttons.map((button) => button.dataset.offerKey).filter(Boolean))];
    await Promise.all(keys.filter((key) => !known.has(key)).map(async (key) => {
      const list = await store.byAdKey(key);
      known.set(key, list.find((offer) => !offer.error && !offer.archived) || null);
    }));
    buttons.forEach((button) => {
      const offer = known.get(button.dataset.offerKey);
      const label = offer ? words().has.replace("{date}", shortDate(offer.createdAt)) : words().make;
      if (button.textContent !== label) button.textContent = label;
      button.classList.toggle("hasOffer", Boolean(offer));
      button.title = offer ? words().hasTitle.replace("{date}", shortDate(offer.createdAt)) : "";
    });
  }
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = window.setTimeout(() => {
      pending = 0;
      decorate();
    }, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  store.channel?.addEventListener("message", (event) => {
    if (event.data?.type !== "offer") return;
    store.get(event.data.id).then((offer) => {
      if (offer?.adKey) known.set(offer.adKey, offer.error || offer.archived ? known.get(offer.adKey) || null : offer);
      decorate();
    });
  });

  window.AUTOGOOD_OFFER_LINK = { SOURCES, offerable: (source) => SOURCES.includes(source), makeDraft };
})();
