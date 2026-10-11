// Page 3 "Monitoring" of mobile.html: settings, results, price history,
// near misses, the check itself and the Mac service (B43/B74). Moved out of
// mobile-market-analysis.js (audit wave 3, 2026-10-11) unchanged; that file
// calls AUTOGOOD_MONITORING_PAGE(ctx) where this code used to sit and passes
// what the page shares with the analysis. Variables the analysis reassigns
// are read through ctx (ctx.marketHistory, ctx.priceHistoryId…), everything
// else is taken from ctx once. Load this file before mobile-market-analysis.js.
window.AUTOGOOD_MONITORING_PAGE = (ctx) => {
  const {
    CHECK_OFFERS_STORE, EUR_PLN_FALLBACK_RATE, LOCAL_MARKETS, MARKET_GROUPS, MARKET_PROXY,
    MARKET_SOURCES, SECOND_PORTALS, SOURCE_CURRENCY, answeredMarket, blockTitle, byEuCompared,
    byEuSource, carSignature, carsOf, checkBandsOf, checkOffersCache, compactOffers,
    confirmHistoryChanges, convertPrice, copy, currentLanguage, currentPage, downloadReportPdf,
    dropCountryDuplicates, escapeMarketHtml, exchangeRate, exciseText, fillMonitoringHistory,
    fillOfferHistory, filterSignature, formatHistoryDate, formatMarketPrice, formatPlainPrice,
    germanCountries, historyCarKey, historyMeta, kmUnit, listingSource, loadCheckOffers,
    marketBadge, marketGroup, marketPricePoint, measureNextSnapshot, mergeBySource,
    monitoringStatsRows, nlbeCountries, normalizeListings, numberFormat, offerChanges,
    offerCountryKey, offerHistoryState, offerKey, openCheckOffersDb, openFavorite,
    openHistoryAnalysis, percentile, pinnedFavorites, portalAnswered, portalFailure, portalName,
    powerInKm, powerText, priceHistoryPage, priceInPln, redrawOfferHistory, refreshActiveAnalysis,
    refreshMarketHistory, restoreManualFilters, rowSource, searchSignature, sekPlnRate, showPage,
    sourceClass, statsOfOffers, stillListed, storeMarketHistory, turnkeyByFor, turnkeyFootnoteHtml,
    updateMarketSnapshot, withDuplicates
  } = ctx;


  // ---- Page 3 "Monitoring" -------------------------------------------------
  // The favourite picked in the bar: its search (as on page 1), the portals
  // with the car's own price on each, a currency converter, one "Sprawdź
  // teraz" that reads the portals and compares with the previous check (new
  // and gone offers per portal), and the day-by-day history below, folded.
  // country: a country card's key ("" = all), portal: a portal ("" = all),
  // limit: how many cars of the list are drawn (100 more each click).
  // autoView: the list the page picks itself (on opening a car and after a
  // monitoring): "Nowe" when there are new cars, else "Aktualne" (owner
  // 2026-10-05, "при входе — Nowe"); a list clicked by the manager stays.
  const monitoringState = { id: "", view: "new", autoView: true, portal: "", country: "", limit: 100, busy: "", status: "", statusError: false };
  // Does this Mac's monitoring service answer (variant B, see syncLocalMonitoring)?
  const localMonitoring = { available: false, failedToday: false };
  // Monitoring checks waiting for the one running (see runMonitoringCheck).
  const monitoringQueue = [];
  const isQueued = (id) => monitoringQueue.some((item) => item.entry.id === id);
  // How the manager likes the list (sort, filters) and whether the settings
  // are open: conveniences of this browser, not user data.
  const MONITORING_PREFS_KEY = "autogood.mobile.monitoringListPrefs";
  const monitoringPrefs = { sort: "price", dir: "asc", onlyVat: false, onlyDealers: false, onlyDrop: false, onlyDeal: false, settingsOpen: false, portalPrices: false };
  try {
    Object.assign(monitoringPrefs, JSON.parse(localStorage.getItem(MONITORING_PREFS_KEY) || "{}"));
  } catch {
    // Defaults.
  }
  const saveMonitoringPrefs = () => {
    try {
      localStorage.setItem(MONITORING_PREFS_KEY, JSON.stringify(monitoringPrefs));
    } catch {
      // Kept for this page only.
    }
  };
  // What each portal has read while a monitoring runs.
  const monitoringProgress = {};
  // "" while the main lists are read, else what the narrow searches do now.
  let monitoringPhase = "";
  let monitoringExtended = false;
  try {
    monitoringExtended = localStorage.getItem("autogood.mobile.monitoringExtended") === "1";
  } catch {
    // Folded by default.
  }

  const monitoringTitle = (item) => [item.filters.brand, item.filters.model, item.filters.version].filter(Boolean).join(" ");

  // The picked favourite's filters in the page-1 form, so its summary there
  // (and the copy shown here) describes this car.
  function loadFavoriteIntoForm(entry) {
    if (!entry || ctx.editingHistoryId === entry.id) return;
    restoreManualFilters(entry.filters);
    ctx.editingHistoryId = entry.id;
    ctx.historyAttached = false;
    ctx.editingBaseline = filterSignature(readManualFields());
    ctx.editingCarKey = historyCarKey(readManualFields());
  }

  function monitoringParamsHtml() {
    const summary = document.querySelector("[data-mobile-selected-filters]");
    return summary ? summary.innerHTML : "";
  }

  // Page 3: portal name with the flags of the countries it is searched in.
  function monitoringPortalBadge(source, countries = []) {
    // A portal of one country (France, the Netherlands, Belgium): its flag and name.
    if (["autoscoutfr", "paruvendu", "marktplaats", "dehands", "kleinanzeigen"].includes(source)) {
      return `<span class="agMarketBadge">${window.AUTOGOOD_FLAG?.(window.AUTOGOOD_MARKET_COUNTRY?.[source]) || ""}<span>${source === "autoscoutfr" ? "AutoScout24" : escapeMarketHtml(portalName(source))}</span></span>`;
    }
    if (source !== "mobile" && source !== "autoscout") return marketBadge(source);
    const flags = countries.map((code) => window.AUTOGOOD_FLAG?.(code) || code).join("");
    return `<span class="agMarketBadge">${flags}<span>${source === "autoscout" ? "AutoScout24" : "mobile.de"}</span></span>`;
  }
  function offerCountryBadge(source, country) {
    if (["autoscoutfr", "paruvendu", "marktplaats", "dehands", "kleinanzeigen"].includes(source)) return monitoringPortalBadge(source);
    if (source !== "mobile" && source !== "autoscout") return marketBadge(source);
    const name = window.AUTOGOOD_COUNTRY_NAME?.(country) || country;
    return `<span class="agMarketBadge" title="${escapeMarketHtml(name)}">${window.AUTOGOOD_FLAG?.(country) || ""}<span>${source === "autoscout" ? "AutoScout24" : "mobile.de"}${country ? ` · ${escapeMarketHtml(country)}` : ""}</span></span>`;
  }

  // Countries as on pages 1-2 (owner 2026-10-05): a card per country, its
  // portals under it, each with the car's own price (empty = the filters').
  function monitoringCountriesHtml(entry) {
    const c = copy();
    const watch = window.AUTOGOOD_FAVORITES_WATCH;
    const numbers = numberFormat();
    const symbol = { PLN: "zł", EUR: "€", SEK: "kr", USD: "$" };
    const selection = monitoringSelection(entry);
    const prices = monitoringPrices(entry);
    return `<div class="mobileMonitoringCountryGrid">${MARKET_GROUPS.map((group) => {
      const on = selectionGroupOn(selection, group);
      const german = germanCountries(selection.countries);
      const countries = group.key === "de" && on && german.length ? german : group.countries;
      const names = countries.map((code) => window.AUTOGOOD_COUNTRY_NAME?.(code) || code);
      const flags = countries.map((code) => window.AUTOGOOD_FLAG?.(code) || "").join("");
      const rows = group.rows.filter((row, index) => on || index === 0).map((row) => {
        const source = rowSource(row);
        const rowOnNow = on && selectionRowOn(selection, row);
        const own = watch?.portalPrice?.(entry.id, source) || null;
        const budgetPrice = prices[source];
        const fallback = (source === "autoscout" ? watch?.portalPrice?.(entry.id, "mobile") : null) || watch?.filtersPriceIn?.(source, entry.filters) || {};
        const currency = SOURCE_CURRENCY[source] || "EUR";
        const field = (side) => {
          const value = own?.[side];
          const hint = fallback[side];
          return `<label><span>${escapeMarketHtml(side === "from" ? c.monitoringFrom : c.monitoringTo)}</span><input type="text" inputmode="numeric" data-monitoring-price="${source}" data-side="${side}" value="${value === null || value === undefined ? "" : escapeMarketHtml(numbers.format(value))}" placeholder="${Number.isFinite(hint) ? escapeMarketHtml(numbers.format(Math.round(hint))) : "—"}"${rowOnNow ? "" : " disabled"} /><b>${escapeMarketHtml(symbol[currency] || currency)}</b></label>`;
        };
        const name = portalName(source);
        // Without the advanced prices: what the budget allows on this portal.
        const money = (value) => `${numbers.format(value)} ${symbol[currency] || currency}`;
        const vat = PORTAL_VAT[source === "otomoto" ? "PL" : BUDGET_COUNTRY[source]] || 0;
        const range = (price) => [price.from ? `${c.monitoringFrom} ${money(price.from)}` : "", price.to ? `${c.monitoringTo} ${money(price.to)}` : ""].filter(Boolean).join(" ");
        const budgetLine = own
          ? `<span class="mobileMonitoringBudgetLine isOwn" title="${escapeMarketHtml(c.monitoringOwnPriceTitle)}">${escapeMarketHtml(c.monitoringOwnPrice.replace("{range}", range(own)))}</span>`
          : budgetPrice
            ? `<span class="mobileMonitoringBudgetLine">${escapeMarketHtml(range(budgetPrice))} ${escapeMarketHtml(c.monitoringGross)}${budgetPrice.to && vat ? ` <small>≈ ${escapeMarketHtml(money(Math.round(budgetPrice.to / (1 + vat) / (currency === "EUR" ? 100 : 1000)) * (currency === "EUR" ? 100 : 1000)))} ${escapeMarketHtml(c.monitoringNet)}</small>` : ""}</span>`
            : `<span class="mobileMonitoringBudgetLine isNone">${escapeMarketHtml(source === "avby" ? c.monitoringNoBudgetAvby : c.monitoringNoBudget)}</span>`;
        return `
          <div class="mobileMonitoringCountryRow${rowOnNow ? "" : " isOff"}">
            <button class="agBrandLink is${sourceClass(source)}" type="button" data-monitoring-row="${group.key}:${row}" aria-pressed="${rowOnNow ? "true" : "false"}" title="${escapeMarketHtml(name)}" aria-label="${escapeMarketHtml(name)}"><img src="${ctx.BRAND_LOGOS[source]}" alt="" /></button>
            ${on ? (monitoringPrefs.portalPrices ? `<div class="mobileMonitoringPrice">${field("from")}${field("to")}</div>` : budgetLine) : ""}
          </div>`;
      }).join("");
      // Germany: Austria and Luxembourg go with it (mobile.de, AutoScout24).
      const extra = group.key === "de" && on ? `<div class="mobileMonitoringSubCountries">${["AT", "LU"].map((code) => {
        const picked = selection.countries.includes(code);
        return `<button type="button" data-monitoring-country="${code}" aria-pressed="${picked ? "true" : "false"}" class="${picked ? "isOn" : ""}">${window.AUTOGOOD_FLAG?.(code) || ""}${escapeMarketHtml(window.AUTOGOOD_COUNTRY_NAME?.(code) || code)}</button>`;
      }).join("")}</div>` : "";
      const label = `${names.join(", ")} — ${on ? c.marketGroupOff : c.marketGroupOn}`;
      return `
        <section class="agMarketColumn mobileMonitoringCountryCard${on ? "" : " isOff"}">
          <button class="agMarketColumnHead isToggle" type="button" role="switch" aria-checked="${on ? "true" : "false"}" data-monitoring-group="${group.key}" title="${escapeMarketHtml(label)}" aria-label="${escapeMarketHtml(label)}">
            <span class="agMarketColumnFlags">${flags}</span>
            <b class="agMarketColumnName">${escapeMarketHtml(names.join(" · "))}</b>
          </button>
          ${rows}${extra}
        </section>`;
    }).join("")}</div>`;
  }

  function monitoringBudgetText(entry) {
    const c = copy();
    const budget = monitoringScopeOf(entry.id).budget;
    if (!budget) return "";
    const numbers = numberFormat();
    return `${c.monitoringBudgetShort}: ${[budget.from ? `${c.monitoringFrom} ${numbers.format(budget.from)}` : "", budget.to ? `${c.monitoringTo} ${numbers.format(budget.to)}` : ""].filter(Boolean).join(" ")} zł`;
  }

  // The client's budget "na gotowo w Polsce" (one for all portals) and the
  // switch to separate prices per portal.
  function monitoringBudgetHtml(entry) {
    const c = copy();
    const numbers = numberFormat();
    const budget = monitoringScopeOf(entry.id).budget || {};
    const excise = searchExcise(entry.filters);
    // The fixed border (owner 2026-10-10): the rate and date it was counted with.
    const lock = monitoringScopeOf(entry.id).budget ? budgetLockOf(entry) : null;
    const engine = lock && Number.isInteger(lock.engine) ? lock.engine : excise.index;
    const rate = (lock && !lock.adopted && lock.rates?.eur) || window.AUTOGOOD_TURNKEY?.currentRates?.().eur;
    const ratePercent = (index) => `${String(Math.round((window.AUTOGOOD_TURNKEY?.EXCISE_RATES?.[index] ?? 0) * 1000) / 10).replace(".", ",")} %`;
    const field = (side) => `<label><span>${escapeMarketHtml(side === "from" ? c.monitoringFrom : c.monitoringTo)}</span><input type="text" inputmode="numeric" data-monitoring-budget="${side}" value="${budget[side] ? escapeMarketHtml(numbers.format(budget[side])) : ""}" placeholder="—" /><b>zł</b></label>`;
    return `
      <div class="mobileMonitoringBudget">
        <div class="mobileMonitoringBudgetHead">
          <b>${escapeMarketHtml(c.monitoringBudget)}</b>
          <div class="mobileMonitoringPrice">${field("from")}${field("to")}</div>
          <button class="agCalcButton mobileMonitoringBudgetCheck" type="button" data-monitoring-budget-calc title="${escapeMarketHtml(c.monitoringBudgetCalcTitle)}">${escapeMarketHtml(c.monitoringBudgetCalc)}</button>
          <label class="mobileMonitoringCheck mobileMonitoringAdvanced"><input type="checkbox" data-monitoring-portal-prices${monitoringPrefs.portalPrices ? " checked" : ""} /> ${escapeMarketHtml(c.monitoringPortalPrices)}</label>
        </div>
        <small title="${escapeMarketHtml(c.monitoringBudgetHint
          .replace("{engine}", `${typeof ENGINE_TYPE_LABELS !== "undefined" ? ENGINE_TYPE_LABELS[engine] : ""} · ${ratePercent(engine)}${excise.classes.length > 1 ? ` (${c.monitoringExciseHighest}: ${excise.classes.map(ratePercent).join(", ")})` : ""}`)
          .replace("{rate}", rate ? String(rate).replace(".", ",") : "—"))}">${escapeMarketHtml(c.monitoringBudgetHintShort.replace("{engine}", ratePercent(engine)))} ⓘ</small><small hidden>${escapeMarketHtml(c.monitoringBudgetHint
          .replace("{engine}", `${typeof ENGINE_TYPE_LABELS !== "undefined" ? ENGINE_TYPE_LABELS[engine] : ""} · ${ratePercent(engine)}${excise.classes.length > 1 ? ` (${c.monitoringExciseHighest}: ${excise.classes.map(ratePercent).join(", ")})` : ""}`)
          .replace("{rate}", rate ? String(rate).replace(".", ",") : "—"))}${lock ? ` ${escapeMarketHtml(c.monitoringBudgetLocked.replace("{date}", formatHistoryDate(lock.adopted || lock.at)))}` : ""}</small>
      </div>`;
  }

  // ---- "Więcej filtrów" of page 1 in the settings (owner 2026-10-05) ------
  // The same fields (VAT, seller, condition, colours…): the card is moved
  // here while page 3 is shown and back when it leaves, so the portal rules
  // stay one. The form listens to its own fields: their changes are passed
  // on to it. Saved into this car's search with "Gotowe".
  let moreFiltersHome = null;
  let moreFiltersWasOpen = false;
  const moreFiltersCard = () => document.querySelector(".mobileMoreFiltersCard");
  function parkMoreFilters() {
    const card = moreFiltersCard();
    if (!card || !moreFiltersHome?.parentNode || card.previousSibling === moreFiltersHome) return;
    moreFiltersHome.after(card);
    card.classList.toggle("isOpen", moreFiltersWasOpen);
  }
  function borrowMoreFilters(slot) {
    const card = moreFiltersCard();
    if (!card || !slot) return;
    if (!moreFiltersHome) {
      moreFiltersHome = document.createComment(" Więcej filtrów: page 1 ");
      card.before(moreFiltersHome);
    }
    if (card.previousSibling === moreFiltersHome) moreFiltersWasOpen = card.classList.contains("isOpen");
    card.classList.add("isOpen");
    slot.append(card);
  }
  // The form's edits saved into the car's search (a changed search starts a
  // new comparison base, as on page 1).
  function saveMonitoringFilters(entry) {
    if (!entry || ctx.editingHistoryId !== entry.id) return false;
    let changed = false;
    try {
      changed = filterSignature(readManualFields()) !== ctx.editingBaseline;
    } catch {
      changed = false;
    }
    if (changed) {
      confirmHistoryChanges(entry.id);
      scheduleLocalSync();
    }
    return changed;
  }

  // The folded settings say what is chosen: "🇩🇪 Niemcy: mobile.de, AutoScout24 · 🇵🇱 Polska: otomoto".
  function monitoringSelectionSummary(entry) {
    const selection = monitoringSelection(entry);
    return MARKET_GROUPS.filter((group) => selectionGroupOn(selection, group)).map((group) => {
      const german = germanCountries(selection.countries);
      const countries = group.key === "de" && german.length ? german : group.countries;
      const portals = [...new Set(group.rows.filter((row) => selectionRowOn(selection, row)).map((row) => portalName(rowSource(row))))];
      return `<span class="mobileMonitoringSummaryCountry">${countries.map((code) => window.AUTOGOOD_FLAG?.(code) || "").join("")} <b>${escapeMarketHtml(window.AUTOGOOD_COUNTRY_NAME?.(group.countries[0]) || group.countries[0])}</b> ${escapeMarketHtml(portals.join(", "))}</span>`;
    }).join("") + (() => {
      const labels = resultFilterLabels(resultFiltersOf(entry.id));
      return labels.length ? `<span class="mobileMonitoringSummaryCountry">${escapeMarketHtml(labels.join(" · "))}</span>` : "";
    })();
  }

  // Where mobile.de and AutoScout24 are searched for one favourite (page 3).
  // Default (owner, 2026-10-03): Germany, the Netherlands, Belgium, Austria,
  // Luxembourg, AutoScout24 on. Same storage rules as the history (4.6.1).
  const MONITORING_SCOPE_KEY = "autogood.mobile.monitoringScope.v1";
  const RESULT_FILTERS = ["vat", "dealers", "drop", "deal"];
  // The car's result filters; a car never set keeps the list's old switches
  // (they were one set for all cars in this browser until 2026-10-10).
  function resultFiltersOf(favoriteId) {
    return monitoringScopeOf(favoriteId).only || {
      vat: Boolean(monitoringPrefs.onlyVat), dealers: Boolean(monitoringPrefs.onlyDealers),
      drop: Boolean(monitoringPrefs.onlyDrop), deal: Boolean(monitoringPrefs.onlyDeal),
    };
  }
  // The price a car costs the client in Poland: "na gotowo" for an offer
  // from abroad, the price itself in Poland; the budget's margin.
  const BUDGET_TOLERANCE = 0.1;
  const isVatOffer = (offer) => offer.priceType === "vat" || (offer.priceType === "net" && offer.currency === "PLN");
  const clientPricePln = (offer, source) => Number(offer.turnkey) || priceInPln(offer.price, offer.currency || SOURCE_CURRENCY[source] || "EUR");
  // Audit p. 6 (owner 2026-10-10): Marktplaats, 2dehands, Kleinanzeigen and
  // ParuVendu cannot search a version — asked for a CLA 180 they give every
  // CLA, the 250 e plug-in too, which then bent the median and got the
  // excise of a petrol car. The ad's name is read: another version number
  // right after the model's name, or a plug-in while petrol / diesel is
  // searched, sends the car to "Dodatkowe" with the reason. A name without a
  // version stays (it may well be the car).
  const VERSION_BLIND = ["marktplaats", "dehands", "kleinanzeigen", "paruvendu"];
  const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function otherVersionOf(filters, source, offer) {
    if (!filters || !VERSION_BLIND.includes(source)) return null;
    const title = ` ${String(offer?.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")} `;
    const modelText = `${filters.model || ""} ${filters.version || ""}`.trim();
    const tokens = modelText.toLowerCase().split(/\s+/).filter(Boolean);
    const wanted = (modelText.match(/\b(\d{2,3})\s?(?:[a-z]{1,2})?\b/i) || [])[1] || "";
    if (wanted && tokens.length) {
      // "CLA 180": the number after "cla" (or "cla-klasse", "cla shooting
      // brake"); "BMW 320": the number after the make.
      const base = /^\d/.test(tokens[0]) ? String(filters.brand || "").toLowerCase().split(/[\s-]+/)[0] : tokens[0];
      const after = new RegExp(`[\\s(]${escapeRegExp(base)}(?:[-\\s]?(?:klasse|class|klasa|classe))?(?:\\s+(?:shooting\\s+brake|sb|coupe|kombi|limousine|sedan|touring|sw|break))?[\\s-]+(\\d{2,3})\\s?(e|d|i|h|xe)?(?=[\\s,|/*)-])`, "i");
      const found = title.match(after);
      if (found && found[1] !== wanted) return { kind: "version", found: `${found[1]}${found[2] ? ` ${found[2]}` : ""}` };
    }
    const fuels = (filters.fuels || []).length ? filters.fuels : filters.fuel ? [filters.fuel] : [];
    const combustionOnly = fuels.length && fuels.every((fuel) => fuel === "petrol" || fuel === "diesel");
    if (combustionOnly && (/plug-?in|\bphev\b|e-?hybrid|\bgte\b|\b\d{3}\s?x?e\b/.test(title) || (/\bhybri[dt]e?\b/.test(title) && !/mild/.test(title)))) {
      return { kind: "fuel" };
    }
    return null;
  }
  const favoriteFilters = (favoriteId) => ctx.marketHistory.find((item) => item.id === favoriteId)?.filters || null;

  // The search's own test of an offer: the client's budget with its margin,
  // the version and fuel the name tells (p. 6) and the result filters that
  // need no history (VAT, dealers).
  function offerFitsSearch(favoriteId) {
    const budget = monitoringScopeOf(favoriteId).budget || null;
    const only = resultFiltersOf(favoriteId);
    const filters = favoriteFilters(favoriteId);
    return (source, offer) => !otherVersionOf(filters, source, offer) && (!budget || source === "avby"
      || ((!budget.to || clientPricePln(offer, source) <= budget.to * (1 + BUDGET_TOLERANCE))
        && (!budget.from || clientPricePln(offer, source) >= budget.from * (1 - BUDGET_TOLERANCE))))
      && (!only.vat || isVatOffer(offer)) && (!only.dealers || offer.seller === "dealer");
  }
  function resultFilterLabels(only) {
    const c = copy();
    const labels = { vat: c.monitoringOnlyVat, dealers: c.monitoringOnlyDealers, drop: c.monitoringOnlyDrop, deal: c.monitoringOnlyDeal };
    return RESULT_FILTERS.filter((key) => only?.[key]).map((key) => labels[key]);
  }
  // Under the list, small: which filters are on (they live in the settings).
  function resultFiltersNote(only) {
    const labels = resultFilterLabels(only);
    return labels.length ? `<span class="mobileMonitoringFilterNote">${escapeMarketHtml(copy().monitoringResultFiltersNote.replace("{filters}", labels.join(" · ")))}</span>` : "";
  }
  function resultFiltersHtml(entry) {
    const c = copy();
    const only = resultFiltersOf(entry.id);
    const labels = { vat: c.monitoringOnlyVat, dealers: c.monitoringOnlyDealers, drop: c.monitoringOnlyDrop, deal: c.monitoringOnlyDeal };
    return `
      <h3 class="mobileMonitoringCountriesTitle">${escapeMarketHtml(c.monitoringResultFiltersTitle)}</h3>
      <div class="mobileMonitoringResultFilters">
        ${RESULT_FILTERS.map((key) => `<label class="mobileMonitoringCheck"><input type="checkbox" data-monitoring-result-filter="${key}"${only[key] ? " checked" : ""} /> ${escapeMarketHtml(labels[key])}</label>`).join("")}
        <small>${escapeMarketHtml(c.monitoringResultFiltersHint)}</small>
      </div>`;
  }
  // "Dodatkowe" margin per favourite, in % (owner, 2026-10-04: 5–10 %).
  const NEAR_TOLERANCES = [0, 5, 10];
  const NEAR_DEFAULT_TOLERANCE = 10;
  const MONITORING_COUNTRIES = ["DE", "NL", "BE", "AT", "LU"];
  // Other countries come later with their own portals (owner, 2026-10-03).
  const MONITORING_COUNTRY_CHOICES = ["DE", "NL", "BE", "AT", "LU"];
  function readMonitoringScopes() {
    let raw = null;
    try {
      raw = localStorage.getItem(MONITORING_SCOPE_KEY);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a map");
      return parsed;
    } catch {
      try {
        localStorage.setItem(`${MONITORING_SCOPE_KEY}.broken.${new Date().toISOString()}`, raw);
      } catch {
        // Nothing more can be done.
      }
      return {};
    }
  }
  // Which portals and countries a Monitoring check covered.
  function monitoringScopeKey(scope, markets) {
    const withCountries = markets.includes("mobile") || markets.includes("autoscout");
    return [...markets].sort().join(",") + (withCountries ? `|${[...scope.countries].sort().join(",")}` : "");
  }

  function monitoringScopeOf(favoriteId) {
    const scope = readMonitoringScopes()[favoriteId] || {};
    // Picked in the country cards (2026-10-05): the car's own portals, and
    // its countries exactly as picked (none, when only otomoto is left).
    const picked = Array.isArray(scope.markets) ? scope.markets.filter((source) => MARKET_SOURCES.includes(source)) : [];
    const listed = Array.isArray(scope.countries) ? scope.countries.filter((code) => MONITORING_COUNTRY_CHOICES.includes(code)) : [];
    const countries = picked.length ? listed : (listed.length ? listed : MONITORING_COUNTRIES);
    const tolerance = NEAR_TOLERANCES.includes(Number(scope.tolerance)) ? Number(scope.tolerance) : NEAR_DEFAULT_TOLERANCE;
    // The client's budget "na gotowo w Polsce", PLN (owner 2026-10-05).
    const amount = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value)) : null);
    const budget = scope.budget && (amount(scope.budget.from) || amount(scope.budget.to)) ? { from: amount(scope.budget.from), to: amount(scope.budget.to) } : null;
    // Result filters set once in the settings (owner 2026-10-10): only VAT
    // deductible, only dealers, only with a price drop, only to negotiate.
    const only = scope.only && typeof scope.only === "object"
      ? Object.fromEntries(RESULT_FILTERS.map((key) => [key, Boolean(scope.only[key])]))
      : null;
    // The budget's border fixed in the portals' currencies (owner 2026-10-10),
    // kept as stored; read only by budgetLockOf.
    const budgetLock = scope.budgetLock && typeof scope.budgetLock === "object" && scope.budgetLock.prices && typeof scope.budgetLock.prices === "object" ? scope.budgetLock : null;
    return { countries, tolerance, ...(picked.length ? { markets: picked } : {}), ...(budget ? { budget } : {}), ...(only ? { only } : {}), ...(budgetLock ? { budgetLock } : {}) };
  }

  // ---- One client budget for all portals (owner 2026-10-05) --------------
  // The budget agreed with the client is the price "na gotowo w Polsce";
  // each portal is searched up to the car price that fits it: the
  // calculator's "Zakup bezpośredni" solved for the car price
  // (AUTOGOOD_TURNKEY.carForTurnkey), with transport and inspection by the
  // tariff of the portal's country and ONE excise class — the one the search
  // filters give (fuel, engine size). otomoto: the car is in Poland already,
  // the budget is its price. av.by: no budget (Belarus). A portal's own price
  // (advanced settings) wins.
  const BUDGET_COUNTRY = { mobile: "DE", autoscout: "DE", kleinanzeigen: "DE", marktplaats: "NL", dehands: "BE", autoscoutfr: "FR", paruvendu: "FR", blocket: "SE" };
  const PORTAL_VAT = { DE: 0.19, NL: 0.21, BE: 0.21, FR: 0.2, SE: 0.25, PL: 0.23 };
  // The client PDF names the rates its own cars were counted with (until
  // 2026-10-10 the filters' "3.1 % petrol" stood under an electric MX-30
  // counted at 0 %); without a car from abroad, the search's rate.
  function pdfExciseClasses(rows, filters) {
    const turnkey = window.AUTOGOOD_TURNKEY;
    const classes = rows.filter((row) => row.offer?.turnkey && turnkey?.engineInfo)
      .map((row) => turnkey.engineInfo({ fuel: row.offer.fuel, title: row.offer.title, displacementCcm: row.offer.ccm, year: row.offer.year, power: row.offer.power }, filters).index);
    return classes.length ? classes : searchExcise(filters).classes;
  }

  function budgetEngineClass(filters) {
    return searchExcise(filters).index;
  }

  // The excise of a SEARCH (owner 2026-10-10: "from the search parameters"):
  // the versions of the model in its years from the model table (B61),
  // narrowed by the fuel and engine-size filters. Until 2026-10-10 a search
  // without a fuel filter counted every car as "petrol up to 2000 cm³"
  // (3.1 %), an electric MX-30 too. One class: that one; several (RAV 4:
  // hybrid 2.5 and petrol 2.0): the budget takes the highest rate, so the
  // client's budget is never passed, and the footnote names every rate.
  // Models without data: the filters alone, as before.
  const specsPending = new Set();
  // Brands whose file did not come in 15 s: their excise stays the filters'.
  const specsFailed = new Set();
  function searchExcise(filters = {}) {
    const fallback = window.AUTOGOOD_TURNKEY?.engineClassFor?.({}, filters) ?? 3;
    const rates = window.AUTOGOOD_TURNKEY?.EXCISE_RATES || [0, 0.093, 0.0155, 0.031, 0.186];
    const brand = typeof canonicalBrand === "function" ? canonicalBrand(filters.brand) : String(filters.brand || "");
    const found = brand && filters.model ? window.AUTOGOOD_MODEL_SPECS_UI?.family?.(brand, String(filters.model).trim()) : null;
    const spec = found ? window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand]?.[found.key] : null;
    if (!spec) {
      // The brand's file is still loading: the page is drawn again once it is in.
      if (brand && window.AUTOGOOD_MODEL_SPECS_INDEX?.brands?.[brand] && !window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand] && !specsPending.has(brand)) {
        specsPending.add(brand);
        const started = Date.now();
        const wait = () => {
          if (window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand]) {
            specsPending.delete(brand);
            if (ctx.priceHistoryId) renderPriceHistoryPage();
          } else if (Date.now() - started < 15000) setTimeout(wait, 300);
          else {
            specsPending.delete(brand);
            specsFailed.add(brand);
          }
        };
        setTimeout(wait, 300);
      }
      // settled: false while the brand's file is still on its way (the
      // budget's border is not fixed with a provisional excise).
      const loading = Boolean(brand && window.AUTOGOOD_MODEL_SPECS_INDEX?.brands?.[brand] && !window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand] && !specsFailed.has(brand));
      return { index: fallback, classes: [fallback], settled: !loading };
    }
    const digits = (value) => Number(String(value || "").replace(/[^\d]/g, "")) || 0;
    const yearFrom = digits(filters.yearFrom);
    const yearTo = digits(filters.yearTo);
    const gens = new Set(spec.gens.map((gen, index) => ({ index, from: gen[2], to: gen[3], mobile: gen[4] }))
      .filter((gen) => (!found.mobile || gen.mobile === found.mobile) && (gen.from || 0) <= (yearTo || 9999) && (gen.to || 9999) >= (yearFrom || 0))
      .map((gen) => gen.index));
    const fuels = (filters.fuels || []).filter(Boolean);
    const ccFrom = digits(filters.displacementFrom);
    const ccTo = digits(filters.displacementTo);
    let rows = spec.versions.filter((row) => gens.has(row[0]));
    if (found.token) {
      const narrowed = rows.filter((row) => row[8] === found.token);
      if (narrowed.length) rows = narrowed;
    }
    rows = rows.filter((row) => (!fuels.length || fuels.includes(row[1]))
      && (!ccFrom || row[2] >= ccFrom) && (!ccTo || row[2] <= ccTo));
    if (!rows.length || typeof classifyEngineType !== "function") return { index: fallback, classes: [fallback], settled: true };
    const fuelText = { electric: "electric", plugin: "plug-in hybrid", hybrid_petrol: "hybrid petrol", hybrid_diesel: "hybrid diesel", diesel: "diesel", petrol: "petrol" };
    // row[7]: the year the version got its mild hybrid (0 = none; negative:
    // also sold without it); before it the same version pays the combustion
    // excise, so a search reaching earlier years counts both.
    const classes = [...new Set(rows.flatMap((row) => {
      const plain = classifyEngineType(fuelText[row[1]] || row[1], row[2]);
      const since = Math.abs(row[7] || 0);
      if (!since || (yearTo && yearTo < since)) return [plain];
      const mild = classifyEngineType(`${fuelText[row[1]] || row[1]} mild hybrid`, row[2]);
      return row[7] > 0 && yearFrom >= since ? [mild] : [mild, plain];
    }))];
    const index = classes.reduce((best, item) => ((rates[item] ?? 0) > (rates[best] ?? 0) ? item : best), classes[0]);
    return { index, classes, settled: true };
  }
  // ==== monitoring-budget: begin ===========================================
  // Pure functions (no page state): scripts/monitoring-budget.test.mjs runs
  // this block on its own. The client's budget is in PLN, the portals are
  // searched in their own currency (€, kr; otomoto zł, av.by $).
  //
  // Audit 2026-10-10 (p. 18), owner: "check by the price in euro". Until then
  // the budget's border was counted again at every check with the day's rate
  // (rounded to 100 € / 1 000 kr): at 120 000 zł a move of 0,01 zł moved it
  // by ~58 €, almost every check got a "prices changed" mark (a new base, no
  // Nowe / Zniknęły), and the Mac service's records were compared across two
  // bands — cars at the border turned up as "new" or "gone". Now the border
  // in the portal's currency is FIXED when the budget is set or changed
  // (with the rate it was counted at) and searched every day the same; the
  // day's rate only changes what "na gotowo" shows.
  // A band that differs from the last searched one by at most 2 % moved with
  // the rate only (a budget typed anew differs more).
  function budgetAdoptTolerance() {
    return 0.02;
  }
  function carPriceForBudget({ source, budgetPln, rates, tariff, engine, carForTurnkey }) {
    if (!budgetPln || source === "avby") return null;
    if (source === "otomoto") return budgetPln;
    if (typeof carForTurnkey !== "function") return null;
    const eur = carForTurnkey({ budgetPln, rate: rates?.eur, transportNettoPln: tariff?.transport, inspectionNettoPln: tariff?.inspection, engineTypeIndex: engine });
    if (!eur) return null;
    return source === "blocket" ? Math.round((eur * rates.eur) / rates.sek / 1000) * 1000 : Math.round(eur / 100) * 100;
  }
  // One portal's band {from, to} (null = no limit on that side), or null.
  function priceBand(value) {
    if (!value || typeof value !== "object") return null;
    const number = (item) => (Number.isFinite(Number(item)) && Number(item) > 0 ? Number(item) : null);
    const from = number(value.from);
    const to = number(value.to);
    return from === null && to === null ? null : { from, to };
  }
  // The bands a check searched with: the "prices" of its row (JSON text).
  function priceBands(prices) {
    let parsed = prices;
    if (typeof prices === "string") {
      try {
        parsed = JSON.parse(prices);
      } catch {
        return {};
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([source, value]) => [source, priceBand(value)]).filter(([, band]) => band));
  }
  function sameBand(left, right) {
    return (left?.from ?? null) === (right?.from ?? null) && (left?.to ?? null) === (right?.to ?? null);
  }
  // sources: only the portals a check searched (a Mac job carries the chosen
  // portals' bands, this browser every portal's).
  function samePriceBands(left, right, sources = null) {
    const a = priceBands(left);
    const b = priceBands(right);
    const keys = sources ? sources : [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.every((source) => sameBand(a[source], b[source]));
  }
  function nearPrice(left, right, tolerance) {
    return (left === null && right === null)
      || (left !== null && right !== null && Math.abs(left - right) <= Math.abs(right) * tolerance);
  }
  // The fixed border of a car's budget. lock: the one stored (or null);
  // compute(): every portal's band now (today's rate); last: the latest
  // check row that searched with bands ({at, prices}). Returns the lock to
  // use and whether to store it.
  // - Same budget, same search, same excise: the stored lock, whatever the rate.
  // - Budget or search changed (by the manager): counted again = new base.
  // - Never fixed (cars from before 2026-10-10): counted now, but a portal
  //   whose last searched band differs only by the rate (≤ 2 %) keeps that
  //   band — fixing the border is no "new base" by itself.
  // - Not stored while the excise is provisional (brand file loading), unless
  //   the manager just set the budget or a lock exists (then re-counted later).
  function budgetLockFor({ budget, sig, excise, lock = null, compute, last = null, rates = null, now = "", manual = false }) {
    const from = Number(budget?.from) || null;
    const to = Number(budget?.to) || null;
    if (!from && !to) return { lock: null, store: false };
    const settled = excise?.settled !== false;
    const engine = excise?.index ?? null;
    if (lock && lock.from === from && lock.to === to && lock.sig === sig && (!settled || lock.engine === engine)) return { lock, store: false };
    const prices = Object.fromEntries(Object.entries(compute() || {}).map(([source, value]) => [source, priceBand(value)]));
    let adopted = "";
    if (!lock && !manual && last) {
      const before = priceBands(last.prices);
      Object.keys(prices).forEach((source) => {
        const band = prices[source];
        const old = before[source];
        if (band && old && !sameBand(band, old) && nearPrice(old.from, band.from, budgetAdoptTolerance()) && nearPrice(old.to, band.to, budgetAdoptTolerance())) {
          prices[source] = old;
          adopted = last.at || "";
        }
      });
    }
    const fresh = {
      from, to, sig, engine, prices,
      rates: rates ? { eur: Number(rates.eur) || null, sek: Number(rates.sek) || null } : null,
      at: now,
      ...(adopted ? { adopted } : {}),
      ...(settled ? {} : { provisional: true }),
    };
    return { lock: fresh, store: Boolean(lock) || manual || settled };
  }
  // Which rows of the price history are Monitoring checks: marked since
  // 2026-10-10; before, a row searched with a band (prices other than "{}").
  // Page 2 searches a favourite without the budget: Monitoring is compared
  // with Monitoring, page 2 with page 2 (alternating them marked a "new base"
  // every time).
  function isMonitoringRow(row) {
    return typeof row?.monitoring === "boolean" ? row.monitoring : Object.keys(priceBands(row?.prices)).length > 0;
  }
  // kind: true = Monitoring, false = page 2, null = any check.
  function lastComparableCheck(log, kind = null) {
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const row = log[index];
      if (row && !row.filtersChange && (kind === null || isMonitoringRow(row) === Boolean(kind))) return row;
    }
    return null;
  }
  // The mark a check gets before its row when it searched with other bands
  // than the check before it, or null:
  // - {monitoring: true}: a Monitoring check with other bands than the
  //   Monitoring check before it — a new base for Nowe / Zniknęły;
  // - {monitoring: false}: only another kind of check in between (page 2
  //   without the budget) — a divider of the price history table, no new
  //   base for Monitoring.
  // Marks from before 2026-10-10 carry no flag and count as a new base.
  function pricesMarkFor(log, prices, monitoring, sources = null) {
    if (prices === null || prices === undefined) return null;
    const last = log[log.length - 1];
    if (!last || last.filtersChange) return null;
    const differs = (row) => Boolean(row) && !samePriceBands(row.prices || "{}", prices, sources);
    if (monitoring && differs(lastComparableCheck(log, true))) return { monitoring: true };
    return differs(lastComparableCheck(log)) ? { monitoring: false } : null;
  }
  // A mark that makes the next Monitoring check a new base.
  function isBaseChange(point) {
    return Boolean(point?.filtersChange) && point.monitoring !== false;
  }
  // An offer inside a band, in the portal's currency (another currency or no
  // price: cannot tell, kept).
  function inPriceBand(offer, band, currency = "") {
    if (!band) return true;
    if (currency && offer?.currency && offer.currency !== currency) return true;
    const price = Number(offer?.price);
    if (!Number.isFinite(price) || price <= 0) return true;
    return (band.from === null || price >= band.from) && (band.to === null || price <= band.to);
  }
  // Two checks searched with other bands (records from before 2026-10-10, a
  // Mac record of an older job): only a car inside both bands can be new or
  // gone. A car only in the band of the latest check is listed, not "new";
  // one that left the list but is outside the latest band is not "gone".
  // Same band (the rule since the border is fixed): nothing changes.
  function withinBothBands(rows, nowBand, beforeBand, currency = "") {
    if (sameBand(nowBand, beforeBand)) return rows;
    return rows.filter((row) => !row.gone || inPriceBand(row.offer, nowBand, currency))
      .map((row) => (row.group === "new" && !inPriceBand(row.offer, beforeBand, currency) ? { ...row, group: "same", status: "" } : row));
  }
  // ==== monitoring-budget: end =============================================

  // The car price (in the portal's currency) that a budget in PLN allows at
  // today's rate (or the rates given).
  function budgetCarPrice(source, budgetPln, filters, rates = null) {
    if (!budgetPln || source === "avby") return null;
    if (source === "otomoto") return budgetPln;
    const country = BUDGET_COUNTRY[source];
    const turnkey = window.AUTOGOOD_TURNKEY;
    if (!country || !turnkey?.carForTurnkey) return null;
    const tariff = typeof estimateDeliveryInspection === "function" ? estimateDeliveryInspection(filters.body || "", { country }) : { transport: 2500, inspection: 1500 };
    return carPriceForBudget({ source, budgetPln, rates: rates || turnkey.currentRates(), tariff, engine: budgetEngineClass(filters), carForTurnkey: turnkey.carForTurnkey });
  }
  // The latest check that searched with bands (a Monitoring one), before any
  // change of the search itself.
  function lastSearchedBands(entry) {
    const log = entry.priceLog || [];
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const row = log[index];
      if (row.filtersChange && !row.pricesChange) return null;
      if (!row.filtersChange && Object.keys(priceBands(row.prices)).length) return row;
    }
    return null;
  }
  // The car's fixed budget border (owner 2026-10-10), stored in its
  // Monitoring settings (monitoringScope.budgetLock). manual: the manager
  // just set the budget (fixed at once, never taken from an older check).
  // The calculator's live rate (Walutomat) is in, or the page has waited
  // long enough for it (Walutomat down: the rates file).
  function budgetRateReady() {
    return Boolean(window.AUTOGOOD_EXCHANGE_RATES?.live) || performance.now() > 20000;
  }
  function budgetLockOf(entry, { manual = false } = {}) {
    const scope = monitoringScopeOf(entry.id);
    if (!scope.budget) return null;
    const rates = window.AUTOGOOD_TURNKEY?.currentRates?.() || null;
    const excise = searchExcise(entry.filters);
    const { lock, store } = budgetLockFor({
      budget: scope.budget,
      sig: searchSignature(entry.filters),
      // Not fixed before the real excise and the live rate are known.
      excise: { ...excise, settled: excise.settled !== false && budgetRateReady() },
      lock: scope.budgetLock || null,
      compute: () => Object.fromEntries(MARKET_SOURCES.map((source) => {
        const from = scope.budget.from ? budgetCarPrice(source, scope.budget.from, entry.filters, rates) : null;
        const to = scope.budget.to ? budgetCarPrice(source, scope.budget.to, entry.filters, rates) : null;
        return [source, from || to ? { from, to } : null];
      })),
      last: lastSearchedBands(entry),
      rates,
      now: new Date().toISOString(),
      manual,
    });
    // The runner (?runner=1) searches with the bands of its job.
    if (store && !new URLSearchParams(window.location.search).has("runner")) setMonitoringScope(entry.id, { budgetLock: lock });
    return lock;
  }
  // The excise of a search is known once its brand's file is in, the rate
  // once Walutomat answered: a check waits for them a little (the border is
  // not fixed with provisional ones).
  async function exciseSettled(filters, ms = 8000) {
    const started = Date.now();
    while ((searchExcise(filters).settled === false || !budgetRateReady()) && Date.now() - started < ms) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  // What each portal is searched with: its own price, else the budget's
  // fixed car price, else nothing (page 1's price then).
  function monitoringPrices(entry) {
    const budget = monitoringScopeOf(entry.id).budget;
    const lock = budget ? budgetLockOf(entry) : null;
    return Object.fromEntries(MARKET_SOURCES.map((source) => {
      const own = window.AUTOGOOD_FAVORITES_WATCH?.portalPrice?.(entry.id, source) || null;
      if (own) return [source, own];
      const band = lock?.prices?.[source] || null;
      return [source, band ? { from: band.from ?? null, to: band.to ?? null } : null];
    }));
  }

  // What one car is monitored on (owner 2026-10-05: chosen per car, by
  // country, as on pages 1-2): its own picks, else the portals of the saved
  // search (monitoringMarketsOf). Page 1's choice is not touched.
  function monitoringSelection(entry) {
    const scope = monitoringScopeOf(entry.id);
    return { markets: scope.markets || monitoringMarketsOf(entry), countries: scope.countries };
  }
  const selectionRowOn = (selection, row) => {
    if (row === "autoscout") return selection.markets.includes("autoscout") && germanCountries(selection.countries).length > 0;
    if (row === "autoscoutnl") return selection.markets.includes("autoscout") && selection.countries.includes("NL");
    if (row === "autoscoutbe") return selection.markets.includes("autoscout") && selection.countries.includes("BE");
    return selection.markets.includes(row);
  };
  const selectionGroupOn = (selection, group) => group.rows.some((row) => selectionRowOn(selection, row));
  // A country card switched (or one portal of it): the same rules as the
  // columns of page 1 (marketsWithGroup), on this car's own picks. Germany
  // comes with Austria and Luxembourg (the monitoring default since 03.10).
  function selectionWithGroup(selection, key, onlyRow = "") {
    const group = marketGroup(key);
    if (!group) return null;
    const countries = selection.countries;
    const german = germanCountries(countries);
    const nlbe = nlbeCountries(countries);
    const markets = Object.fromEntries(MARKET_SOURCES.map((source) => [source, selection.markets.includes(source)]));
    let nextCountries = countries;
    const on = selectionGroupOn(selection, group) && !onlyRow;
    if (key === "de") {
      if (on) {
        markets.mobile = false;
        markets.kleinanzeigen = false;
        nextCountries = nlbe;
        markets.autoscout = markets.autoscout && nlbe.length > 0;
      } else {
        if (!onlyRow || onlyRow === "mobile") markets.mobile = true;
        if (!onlyRow || onlyRow === "autoscout") markets.autoscout = true;
        if (onlyRow === "kleinanzeigen") markets.kleinanzeigen = true;
        nextCountries = [...(german.length ? german : ["DE", "AT", "LU"]), ...nlbe];
      }
    } else if (LOCAL_MARKETS[key]) {
      const { code, portal, row } = LOCAL_MARKETS[key];
      const others = countries.filter((item) => item !== code);
      if (on) {
        markets[portal] = false;
        nextCountries = others;
        markets.autoscout = markets.autoscout && (germanCountries(others).length > 0 || nlbeCountries(others).length > 0);
      } else {
        if (!onlyRow || onlyRow === portal) markets[portal] = true;
        if (!onlyRow || onlyRow === row) {
          markets.autoscout = true;
          nextCountries = [...others, code];
        }
      }
    } else group.rows.forEach((row) => { markets[row] = onlyRow ? (row === onlyRow || markets[row]) : !on; });
    const list = MARKET_SOURCES.filter((source) => markets[source]);
    if (!list.length) return null;
    return { markets: list, countries: nextCountries };
  }
  // One portal of a switched-on country, on or off (AutoScout24 is one
  // portal in all its countries).
  function selectionWithRow(selection, key, row) {
    const group = marketGroup(key);
    if (!group) return null;
    if (!selectionGroupOn(selection, group) || !selectionRowOn(selection, row)) return selectionWithGroup(selection, key, row);
    const source = rowSource(row);
    const list = selection.markets.filter((item) => item !== source);
    return list.length ? { markets: list, countries: selection.countries } : null;
  }
  function setMonitoringScope(favoriteId, change) {
    const all = readMonitoringScopes();
    all[favoriteId] = { ...monitoringScopeOf(favoriteId), ...change };
    try {
      localStorage.setItem(MONITORING_SCOPE_KEY, JSON.stringify(all));
    } catch {
      Object.assign(monitoringState, { status: copy().historyStorageError, statusError: true });
    }
    scheduleLocalSync();
  }

  const converterState = { amount: "10000", currency: "EUR" };
  function converterRates() {
    const rates = window.AUTOGOOD_TURNKEY?.currentRates?.() || { eur: exchangeRate() || EUR_PLN_FALLBACK_RATE, sek: sekPlnRate(), eurRaw: exchangeRate(), sekRaw: sekPlnRate() };
    return rates;
  }
  function converterOutputHtml() {
    const rates = converterRates();
    const amount = Number(String(converterState.amount).replace(/\s/g, "").replace(",", ".")) || 0;
    const toPln = { PLN: 1, EUR: rates.eur, SEK: rates.sek };
    const pln = amount * (toPln[converterState.currency] || 1);
    return ["PLN", "EUR", "SEK"].filter((currency) => currency !== converterState.currency)
      .map((currency) => `<span><b>${escapeMarketHtml(formatPlainPrice(Math.round(pln / toPln[currency]), currency))}</b></span>`).join("");
  }
  function monitoringConverterHtml() {
    const c = copy();
    const rates = converterRates();
    const rate = (value) => (Number.isFinite(value) ? new Intl.NumberFormat(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value) : "—");
    const date = window.AUTOGOOD_EXCHANGE_RATES?.updatedAt ? formatHistoryDate(window.AUTOGOOD_EXCHANGE_RATES.updatedAt) : "";
    // Small, one line, above the countries (owner 2026-10-05); the rates as a hint.
    return `
      <div class="mobileMonitoringConverter isCompact" title="${escapeMarketHtml(`${c.monitoringAvgRate}: 1 EUR = ${rate(rates.eurRaw)} PLN · 1 SEK = ${rate(rates.sekRaw)} PLN${date ? ` · ${date}` : ""}`)}">
        <span class="mobileMonitoringConverterLabel">${escapeMarketHtml(c.monitoringConverter)}</span>
        <input type="text" inputmode="decimal" data-monitoring-convert-amount value="${escapeMarketHtml(converterState.amount)}" aria-label="${escapeMarketHtml(c.monitoringConverter)}" />
        <select data-monitoring-convert-currency aria-label="${escapeMarketHtml(c.monitoringConverter)}">
          ${["PLN", "EUR", "SEK"].map((currency) => `<option value="${currency}"${currency === converterState.currency ? " selected" : ""}>${currency}</option>`).join("")}
        </select>
        <span class="mobileMonitoringConverterEq">=</span>
        <span class="mobileMonitoringConverterOut" data-monitoring-convert-out>${converterOutputHtml()}</span>
        <small>${escapeMarketHtml(c.monitoringCalcRate)}: 1 EUR = ${rate(rates.eur)} PLN · 1 SEK = ${rate(rates.sek)} PLN</small>
      </div>`;
  }

  // Frequency and time of a car's monitoring (owner 2026-10-05), the next
  // run, and whether this Mac checks also with the program closed.
  function monitoringScheduleHtml(entry) {
    const c = copy();
    const monitored = Boolean(entry.autoRefresh?.enabled);
    const schedule = monitoringSchedule(entry);
    const everyText = { daily: c.monitoringEveryDaily, weekdays: c.monitoringEveryWeekdays, every2: c.monitoringEveryEvery2, weekly: c.monitoringEveryWeekly };
    // Switched off: no schedule at all (owner 2026-10-10, wave 2); the switch says it.
    if (!monitored) return "";
    const mac = !monitored ? ""
      : localMonitoring.available ? `<span class="mobileMonitoringMac isOn">✓ ${escapeMarketHtml(c.monitoringMacOn)}</span>`
        : `<button class="mobileMonitoringMac" type="button" data-monitoring-connect>${escapeMarketHtml(localMonitoringState().enabled ? c.monitoringMacRetry : c.monitoringMacConnect)}</button>`;
    return `
      <div class="mobileMonitoringSchedule${monitored ? "" : " isOff"}">
        <label><span>${escapeMarketHtml(c.monitoringEvery)}</span>
          <select data-monitoring-every${monitored ? "" : " disabled"}>${MONITORING_EVERY.map((every) => `<option value="${every}"${every === schedule.every ? " selected" : ""}>${escapeMarketHtml(everyText[every])}</option>`).join("")}</select>
        </label>
        <label><span>${escapeMarketHtml(c.monitoringTime)}</span>
          <select data-monitoring-time${monitored ? "" : " disabled"}>${[...new Set([...MONITORING_TIMES, schedule.time])].sort().map((time) => `<option value="${time}"${time === schedule.time ? " selected" : ""}>${time}</option>`).join("")}</select>
        </label>
        <span class="mobileMonitoringNext">${escapeMarketHtml(monitored ? c.monitoringNext.replace("{date}", nextMonitoringText(entry)) : c.monitoringOffShort)}</span>
        ${mac}
      </div>`;
  }

  function renderPriceHistoryPage() {
    const priceHistoryPage = document.querySelector("[data-mobile-price-history-page]");
    if (!priceHistoryPage) return;
    const c = copy();
    const favorites = pinnedFavorites();
    // null: the favourite was unpicked here on purpose, nothing is shown.
    if (ctx.priceHistoryId !== null && !favorites.some((entry) => entry.id === ctx.priceHistoryId)) {
      ctx.priceHistoryId = favorites.find((entry) => entry.id === ctx.activeAnalysis?.historyId)?.id || favorites[0]?.id || "";
    }
    const entry = favorites.find((item) => item.id === ctx.priceHistoryId);
    if (entry) loadFavoriteIntoForm(entry);
    if (monitoringState.id !== (entry?.id || "")) {
      Object.assign(monitoringState, { id: entry?.id || "", view: "new", autoView: true, tab: "list", portal: "", country: "", limit: 100, status: "", statusError: false });
      // A car opens on its results: the settings stay one line (wave 2).
      monitoringPrefs.settingsOpen = false;
    }
    const monitored = Boolean(entry?.autoRefresh?.enabled);
    // This car being checked, or waiting for another car's check.
    const busy = entry && (monitoringState.busy === entry.id || isQueued(entry.id));
    const otherCar = monitoringState.busy && monitoringState.busy !== entry?.id ? ctx.marketHistory.find((item) => item.id === monitoringState.busy) : null;
    // "Więcej filtrów" is page 1's own card: home before the page is redrawn.
    parkMoreFilters();
    priceHistoryPage.innerHTML = entry ? `
      <section class="mobileMarketCard mobileMonitoringHead">
        <div class="mobileMonitoringTitleRow">
          ${blockTitle("car", monitoringTitle(entry))}
          <label class="mobileMonitoringSwitch${monitored ? " isOn" : ""}">
            <input type="checkbox" role="switch" data-monitoring-switch="${escapeMarketHtml(entry.id)}"${monitored ? " checked" : ""} />
            <i aria-hidden="true"></i><b>${escapeMarketHtml(monitored ? c.monitoringSwitchOn : c.monitoringSwitch)}</b>
          </label>
        </div>
        ${monitoringScheduleHtml(entry)}
        <button class="mobileMonitoringParamsLine" type="button" data-monitoring-edit title="${escapeMarketHtml(c.monitoringEditParams)}">
          <span>${escapeMarketHtml([...historyMeta(entry.filters), monitoringBudgetText(entry)].filter(Boolean).join(" · "))}</span>
          <b>${escapeMarketHtml(c.monitoringEditParams)} →</b>
        </button>
        <p class="mobileMonitoringSince" data-monitoring-since></p>
      </section>
      <details class="mobileMonitoringSettings" data-monitoring-settings${monitoringPrefs.settingsOpen ? " open" : ""}>
        <summary><svg class="mobileFieldIcon" aria-hidden="true"><use href="./src/mobile-icons.svg#settings"></use></svg><b>${escapeMarketHtml(c.monitoringSettings)}</b><span class="mobileMonitoringSummary">${monitoringSelectionSummary(entry)}</span></summary>
        <div class="mobileMonitoringSettingsBody">
          ${monitoringBudgetHtml(entry)}
          <details class="mobileMonitoringConverterBox"><summary>${escapeMarketHtml(c.monitoringConverter)}</summary>${monitoringConverterHtml()}</details>
          <h3 class="mobileMonitoringCountriesTitle">${escapeMarketHtml(c.monitoringCountriesTitle)}</h3>
          ${monitoringCountriesHtml(entry)}
          <h3 class="mobileMonitoringCountriesTitle">${escapeMarketHtml(c.monitoringMoreFiltersTitle)}</h3>
          <div class="mobileMonitoringMoreFilters" data-monitoring-more-filters></div>
          ${resultFiltersHtml(entry)}
          <div class="mobileMonitoringSettingsFoot">
            <button class="mobileMarketImportClear isPrimary" type="button" data-monitoring-settings-done>${escapeMarketHtml(c.monitoringDone)} ✓</button>
          </div>
        </div>
      </details>
      <section class="mobileMarketCard mobileMonitoringResults">
        ${blockTitle("list", c.monitoringResultsHeading)}
        <div class="mobileMonitoringBlockHead">
          <div class="mobileMonitoringCheckInfo" data-monitoring-check-info></div>
          <div class="mobileMarketToolbarActions">
            <button class="mobileMarketImportClear" type="button" data-price-history-open="${escapeMarketHtml(entry.id)}">${escapeMarketHtml(c.analysisButton)} →</button>
            <button class="mobileMarketImportClear isPrimary" type="button" data-monitoring-check="${escapeMarketHtml(entry.id)}"${busy ? " disabled" : ""}>${escapeMarketHtml(busy ? c.monitoringChecking : c.monitoringCheck)}</button>
          </div>
        </div>
        <div class="mobileMonitoringProgress" data-monitoring-progress aria-live="polite"${monitoringState.busy ? "" : " hidden"}>${monitoringProgressHtml()}</div>
        ${otherCar ? `<p class="mobileMonitoringStatus">${escapeMarketHtml(c.monitoringAutoRunning.replace("{car}", monitoringTitle(otherCar)))}</p>` : ""}
        ${monitoringQueue.length ? `<p class="mobileMonitoringStatus" data-monitoring-queue>${escapeMarketHtml(c.monitoringQueue.replace("{cars}", monitoringQueue.map((item) => monitoringTitle(item.entry)).join(", ")))}</p>` : ""}
        ${monitoringState.status ? `<p class="mobileMonitoringStatus${monitoringState.statusError ? " isError" : ""}">${escapeMarketHtml(monitoringState.status)}</p>` : ""}
        <div data-monitoring-results="${escapeMarketHtml(entry.id)}"><p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerLoading)}</p></div>
      </section>
      <section class="mobileMarketCard mobileMonitoringTabPanel mobileMonitoringTrend" data-monitoring-panel="history" hidden>
        ${blockTitle("gauge", c.trendTitle)}
        <div data-monitoring-trend="${escapeMarketHtml(entry.id)}"><p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerLoading)}</p></div>
      </section>
      <section class="mobileMarketCard mobileMonitoringTabPanel mobileMarketPriceHistory" data-monitoring-panel="history" data-monitoring-history="${escapeMarketHtml(entry.id)}" hidden><p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerLoading)}</p></section>
      <section class="mobileMarketCard mobileMonitoringTabPanel mobileMarketOfferHistory" data-monitoring-panel="market" data-offer-history="${escapeMarketHtml(entry.id)}" hidden>
        ${blockTitle("calendar", c.offerHistoryHeading)}
        <p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerLoading)}</p>
      </section>` : `
      <section class="mobileMarketCard mobileMarketPriceHistoryIntro">
        ${blockTitle("calendar", c.monitoringHeading)}
        <p>${escapeMarketHtml(favorites.length ? c.monitoringIntro : c.monitoringNoFavorites)}</p>
      </section>`;
    if (!entry) return;
    borrowMoreFilters(priceHistoryPage.querySelector("[data-monitoring-more-filters]"));
    fillMonitoringResults(entry);
  }

  // Wave 2 (owner 2026-10-10): "Lista aut", "Historia cen" and "Rynek w
  // wybranym dniu" are tabs of the results (was "Rozszerzony monitoring"
  // at the bottom of the page). The panels are filled when shown.
  function applyMonitoringTab(entry) {
    const tab = monitoringState.tab || "list";
    document.querySelectorAll("[data-monitoring-tab]").forEach((button) => {
      const on = button.dataset.monitoringTab === tab;
      button.classList.toggle("isActive", on);
      button.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-monitoring-list-panel]").forEach((panel) => { panel.hidden = tab !== "list"; });
    document.querySelectorAll("[data-monitoring-panel]").forEach((panel) => { panel.hidden = panel.dataset.monitoringPanel !== tab; });
    if (!entry) return;
    if (tab === "history") fillMonitoringHistory(entry);
    if (tab === "market") fillOfferHistory(entry);
  }

  // When a car is monitored (owner 2026-10-05: frequency and time chosen per
  // car on page 3; default every day at 9:30): by the owner's Mac (variant B,
  // below) or, without it, while the program is open. Due on a run day once
  // its time has come and no Monitoring check exists since then. The same
  // rule lives in server/monitoring-runner.mjs (the Mac's service).
  const MONITORING_EVERY = ["daily", "weekdays", "every2", "weekly"];
  // 6:00 … 21:00 every half hour.
  const MONITORING_TIMES = Array.from({ length: 31 }, (_, index) => {
    const minutes = 6 * 60 + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
  function monitoringSchedule(entry) {
    const auto = entry?.autoRefresh || {};
    return {
      every: MONITORING_EVERY.includes(auto.every) ? auto.every : "daily",
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(auto.time || "") ? auto.time : "09:30",
    };
  }
  // Weekly = Monday; every second day = even day numbers since 1970 (the
  // service counts the same way).
  function isMonitoringDay(every, date) {
    const day = date.getDay();
    if (every === "weekdays") return day >= 1 && day <= 5;
    if (every === "weekly") return day === 1;
    if (every === "every2") {
      const noon = new Date(date);
      noon.setHours(12, 0, 0, 0);
      return Math.floor(noon.getTime() / 86400000) % 2 === 0;
    }
    return true;
  }
  function monitoringSlot(schedule, date) {
    const [hour, minute] = schedule.time.split(":").map(Number);
    const at = new Date(date);
    at.setHours(hour, minute, 0, 0);
    return at;
  }
  // Today's moment of the car's monitoring once it has come, else null.
  function dueSlot(entry, now = new Date()) {
    const schedule = monitoringSchedule(entry);
    if (!isMonitoringDay(schedule.every, now)) return null;
    const slot = monitoringSlot(schedule, now).getTime();
    return now.getTime() >= slot ? slot : null;
  }
  // Listed this long and already cheaper: "Do negocjacji" (B22).
  const NEGOTIATION_DAYS = 30;
  function nextMonitoringText(entry) {
    const c = copy();
    const schedule = monitoringSchedule(entry);
    const now = new Date();
    const slotToday = monitoringSlot(schedule, now).getTime();
    const doneToday = (entry.priceLog || []).some((point) => !point.filtersChange && Date.parse(point.at) >= slotToday);
    for (let offset = 0; offset < 15; offset += 1) {
      const day = new Date(now);
      day.setDate(now.getDate() + offset);
      if (!isMonitoringDay(schedule.every, day)) continue;
      if (offset === 0 && doneToday) continue;
      if (offset === 0 && now.getTime() >= slotToday) return c.monitoringNextNow;
      const dayText = offset === 0 ? c.monitoringDayToday : offset === 1 ? c.monitoringDayTomorrow
        : day.toLocaleDateString(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", { weekday: "short", day: "numeric", month: "numeric" });
      return c.monitoringAt.replace("{day}", dayText).replace("{time}", schedule.time);
    }
    return "—";
  }
  function daysText(days) {
    const c = copy();
    const n = Math.max(0, Math.floor(days));
    if (n === 0) return c.monitoringDay0;
    if (currentLanguage() === "ru") {
      const word = n % 10 === 1 && n % 100 !== 11 ? c.monitoringDay1 : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? c.monitoringDay2 : c.monitoringDay5;
      return `${n} ${word}`;
    }
    return `${n} ${n === 1 ? c.monitoringDay1 : c.monitoringDay5}`;
  }
  // Calendar days: yesterday's date is "1 day" whatever the hour.
  const daysSince = (iso) => {
    const then = new Date(iso);
    const today = new Date();
    then.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.round((today - then) / 86400000);
  };
  const shortDate = (iso) => formatHistoryDate(iso).split(",")[0];

  function monitoringProgressHtml() {
    const c = copy();
    const parts = MARKET_SOURCES.filter((source) => monitoringProgress[source]).map((source) => {
      const info = monitoringProgress[source];
      const text = info.state === "ok" ? c.monitoringProgressDone.replace("{count}", numberFormat().format(info.count || 0))
        : info.state === "fail" ? c.monitoringProgressFail
        : info.state === "wait" ? c.monitoringProgressWait
          : Number.isFinite(info.done) && Number.isFinite(info.total)
            ? (info.unit === "countries" ? c.monitoringProgressCountries : c.monitoringProgressPages).replace("{done}", info.done).replace("{total}", info.total)
            : c.monitoringProgressRun;
      return `<span class="is${info.state === "ok" ? "Done" : info.state === "fail" ? "Fail" : info.state === "wait" ? "Wait" : "Run"}"><b>${escapeMarketHtml(portalName(source))}</b> ${escapeMarketHtml(text)}</span>`;
    });
    // The free proxy's minute limit reached: the line says why it waits.
    const proxy = window.AUTOGOOD_PROXY_QUEUE?.status?.();
    const pause = proxy?.resumeAt && proxy.waiting ? `<span class="isWait">${escapeMarketHtml(c.monitoringProgressLimit.replace("{seconds}", String(Math.max(1, Math.ceil((proxy.resumeAt - Date.now()) / 1000)))))}</span>` : "";
    const running = monitoringState.busy && monitoringState.busy !== monitoringState.id ? ctx.marketHistory.find((item) => item.id === monitoringState.busy) : null;
    const title = c.monitoringProgressTitle.replace(/:$/, "") + (running ? ` — ${monitoringTitle(running)}` : "") + (monitoringPhase ? ` — ${monitoringPhase}` : "");
    return `<b>${escapeMarketHtml(`${title}:`)}</b> ${parts.length ? parts.join("") : `<span>${escapeMarketHtml(c.monitoringProgressRun)}</span>`}${pause}`;
  }
  // Redrawn when the proxy queue pauses or goes on.
  window.AUTOGOOD_PROXY_QUEUE?.onChange?.(() => {
    if (!monitoringState.busy) return;
    const box = document.querySelector("[data-monitoring-progress]");
    if (box && !box.hidden) box.innerHTML = monitoringProgressHtml();
  });
  function updateMonitoringProgress(source, info) {
    monitoringProgress[source] = { ...(monitoringProgress[source] || {}), ...info };
    const box = document.querySelector("[data-monitoring-progress]");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = monitoringProgressHtml();
  }

  // What went wrong, in the manager's words (the technical text only as a
  // detail of the generic message).
  function monitoringErrorText(error, source = "") {
    const c = copy();
    const detail = String(error?.message || error || "");
    if (/model not found/i.test(detail)) return c.monitoringErrorModel.replace("{portal}", portalName(source || "autoscout"));
    if (detail === c.refreshInvalid) return c.monitoringErrorTooFew;
    if (detail === c.otomotoFailed) return c.monitoringErrorNone;
    if (/failed to fetch|network|load failed|^\d{3}$/i.test(detail)) return c.monitoringErrorNone;
    return c.monitoringErrorGeneric.replace("{detail}", detail || "—");
  }

  // ---- Offers saved by hand on page 3 (per favourite) -----------------------
  // Same rules as the history (4.6.1): read before every write, never
  // cleared, unreadable data kept aside.
  const SAVED_CARS_KEY = "autogood.mobile.savedCars.v1";
  function readSavedCars() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVED_CARS_KEY);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a map");
      return parsed;
    } catch {
      try {
        localStorage.setItem(`${SAVED_CARS_KEY}.broken.${new Date().toISOString()}`, raw);
      } catch {
        // Nothing more can be done in this browser.
      }
      return {};
    }
  }
  function savedCarsOf(favoriteId) {
    const list = readSavedCars()[favoriteId];
    return Array.isArray(list) ? list : [];
  }
  function toggleSavedCar(favoriteId, source, offer) {
    const all = readSavedCars();
    const list = Array.isArray(all[favoriteId]) ? all[favoriteId] : [];
    const at = list.findIndex((item) => item.offer?.key === offer.key);
    all[favoriteId] = at >= 0 ? list.filter((_, index) => index !== at) : [...list, { source, offer, savedAt: new Date().toISOString() }];
    try {
      localStorage.setItem(SAVED_CARS_KEY, JSON.stringify(all));
    } catch {
      Object.assign(monitoringState, { status: copy().historyStorageError, statusError: true });
    }
  }

  // ---- Details of one offer, read on demand ("Wyposażenie…") ---------------
  // The equipment the seller lists, with what sells a car first.
  const KEY_OPTIONS = [
    /automat|automatic|automatik|dsg|s.?tronic|cvt/i,
    /nawigac|navi/i,
    /\bled\b|matrix|laser/i,
    /adaptac|aktywny tempomat|abstandstempomat|\bacc\b|adaptive cruise|adaptiver tempomat/i,
    /podgrzew|sitzheiz|heated seat/i,
    /kamer|camera|kamera|360/i,
    /\bhak\b|anhängerkupplung|anhaengerkupplung|tow ?bar|dragkrok/i,
    /panoram|szyberdach|schiebedach|sunroof/i,
    /skór|leder|leather|skinn/i,
    /4x4|allrad|napęd na (?:cztery|wszystkie)|\b4wd\b|\bawd\b|4motion|quattro|xdrive/i,
  ];
  const offerDetails = new Map();
  var rowsForDetails = new Map();
  const openDetails = new Set();
  const allOptionsShown = new Set();

  function vatFromDescription(html) {
    const c = copy();
    const text = String(html || "").replace(/<[^>]+>/g, " ").toLowerCase();
    if (/vat[\s-]*marż|marża[\s-]*vat|vat-?marża|faktura vat[\s-]*marża/.test(text)) return `${c.monitoringVatMargin} (${c.monitoringFromDescription})`;
    if (/faktur\w*\s+vat|\bfv\s*23|vat\s*23\s*%|netto\s*\+\s*vat|do odliczenia/.test(text)) return `${c.monitoringVatInvoice} (${c.monitoringFromDescription})`;
    return "";
  }

  async function loadOfferDetails(source, offer) {
    const key = offer.key;
    offerDetails.set(key, { status: "loading" });
    try {
      let details;
      if (source === "otomoto") {
        const response = await fetch(`${MARKET_PROXY()}${offer.url}`, { headers: { "x-respond-with": "html" } });
        if (!response.ok) throw new Error(String(response.status));
        const raw = (await response.text()).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        const advert = raw ? JSON.parse(raw[1])?.props?.pageProps?.advert : null;
        if (!advert) throw new Error("no advert");
        const dict = advert.parametersDict || {};
        const label = (name) => dict[name]?.values?.[0]?.label || "";
        details = {
          equipment: (advert.equipment || []).flatMap((group) => (group.values || []).map((value) => value.label)).filter(Boolean),
          power: label("engine_power"),
          // otomoto has no VAT field: the seller's own description says it.
          vat: vatFromDescription(advert.description),
          seller: advert.seller?.type === "PRIVATE" ? "private" : advert.seller?.type ? "dealer" : "",
        };
      } else if (source === "mobile") {
        if (typeof window.AUTOGOOD_MOBILEDE_IMPORT !== "function") throw new Error("no importer");
        const data = await window.AUTOGOOD_MOBILEDE_IMPORT(offer.url);
        const equipment = Array.isArray(data.equipment) ? data.equipment : Object.values(data.equipment || {}).flat();
        details = {
          equipment: equipment.map((item) => (typeof item === "string" ? item : item?.label || item?.name || "")).filter(Boolean),
          power: data.powerHp ? `${data.powerHp} KM` : "",
          // The result list's VAT mark is the checked one (vat=1 search);
          // the ad reader's purchase type is only a fallback.
          vat: offer.priceType ? "" : data.purchaseType || "",
          netPrice: data.carNettoEur || 0,
          seller: data.sellerType || "",
        };
      } else {
        offerDetails.set(key, { status: "unavailable" });
        return;
      }
      offerDetails.set(key, { status: "ok", details });
    } catch {
      offerDetails.set(key, { status: "error" });
    }
  }

  function vatLabel(offer) {
    const c = copy();
    if (offer.bid) return c.monitoringPriceBid;
    // Otomoto offers saved before 2026-10-03 as "net" are gross, VAT deductible.
    if (offer.priceType === "net" && offer.currency === "PLN") return c.monitoringVatDeductible.replace("{net}", formatPlainPrice(Math.round(offer.price / 1.23), offer.currency));
    if (offer.priceType === "vat") return offer.netPrice ? c.monitoringVatDeductible.replace("{net}", formatPlainPrice(offer.netPrice, offer.currency)) : c.monitoringVatDeductibleOnly;
    if (offer.priceType === "net") return c.monitoringVatNet.replace("{gross}", formatPlainPrice(Math.round(offer.price * 1.23), offer.currency));
    if (offer.priceType === "margin") return c.monitoringVatMargin;
    if (offer.priceType === "private") return c.monitoringVatPrivate;
    return c.monitoringVatGross;
  }

  function offerDetailsHtml(row, columns) {
    const c = copy();
    const state = offerDetails.get(row.offer.key);
    let body;
    if (!state || state.status === "loading") body = `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsLoading)}</span>`;
    else if (state.status === "unavailable") body = `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsUnavailable)}</span>`;
    else if (state.status === "error") body = `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsFailed)}</span>`;
    else {
      const { equipment = [], vat = "", power = "" } = state.details;
      const keyed = equipment.filter((item) => KEY_OPTIONS.some((pattern) => pattern.test(item)));
      const ordered = [...keyed, ...equipment.filter((item) => !keyed.includes(item))];
      const showAll = allOptionsShown.has(row.offer.key);
      const shown = showAll ? ordered : ordered.slice(0, 6);
      const extra = [power ? `${c.monitoringPower}: ${power}` : "", vat].filter(Boolean);
      body = ordered.length || extra.length ? `
        ${extra.map((item) => `<span class="mobileMonitoringChip isInfo">${escapeMarketHtml(item)}</span>`).join("")}
        ${shown.map((item) => `<span class="mobileMonitoringChip${keyed.includes(item) ? " isKey" : ""}">${escapeMarketHtml(item)}</span>`).join("")}
        ${ordered.length > 6 ? `<button class="mobileMonitoringMore" type="button" data-monitoring-more="${escapeMarketHtml(row.offer.key)}">${escapeMarketHtml(showAll ? c.monitoringLess : c.monitoringMore.replace("{count}", String(ordered.length - 6)))}</button>` : ""}`
        : `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsNone)}</span>`;
    }
    return `<tr class="mobileMonitoringDetailsRow"><td colspan="${columns}"><div class="mobileMonitoringChips">${body}</div></td></tr>`;
  }

  // The latest check with offers against the one before it.
  async function fillMonitoringResults(entry) {
    const c = copy();
    const byDate = await loadCheckOffers(entry.id);
    const target = document.querySelector(`[data-monitoring-results="${CSS.escape(entry.id)}"]`);
    const info = document.querySelector("[data-monitoring-check-info]");
    if (!target) return;
    const log = entry.priceLog || [];
    const selection = monitoringSelection(entry);
    const scopeKey = monitoringScopeKey(monitoringScopeOf(entry.id), selection.markets);
    // Monitoring compares its own checks of the same portals and countries
    // (checks made from the analysis, page 2, cover other countries).
    const checks = log.filter((point) => !point.filtersChange && byDate.get(point.at)?.scope === scopeKey);
    const otherChecks = log.some((point) => !point.filtersChange && byDate.has(point.at) && byDate.get(point.at)?.scope !== scopeKey);
    const latest = checks[checks.length - 1];
    // Compared only with a check of the same search and prices: after a
    // change the latest check is a new base (not "gone" for the old budget).
    const lastChange = [...log].reverse().find((point) => isBaseChange(point) && latest && point.at <= latest.at && log.indexOf(point) < log.indexOf(latest));
    const sameSearch = checks.filter((point) => !lastChange || log.indexOf(point) > log.indexOf(lastChange));
    const previous = sameSearch[sameSearch.length - 2];
    if (info) {
      info.innerHTML = latest
        ? `<b>${escapeMarketHtml(c.monitoringLastCheck.replace("{date}", formatHistoryDate(latest.at)))}</b>${previous ? `<small>${escapeMarketHtml(c.monitoringComparedWith.replace("{date}", formatHistoryDate(previous.at)))}</small>` : ""}`
        : "";
    }
    if (!latest) {
      target.innerHTML = `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(otherChecks ? c.monitoringNoScopeCheck : c.monitoringNeverChecked)}</p>`;
      return;
    }
    const record = byDate.get(latest.at);
    const before = previous ? byDate.get(previous.at) : null;
    // Since when this car is monitored, and when each offer first showed up
    // in any of its checks (the portal's own date wins where it gives one).
    const monitoringChecks = [...byDate.values()].filter((item) => item.scope).sort((left, right) => left.at.localeCompare(right.at));
    const firstSeen = new Map();
    [...byDate.values()].sort((left, right) => left.at.localeCompare(right.at)).forEach((item) => {
      [...Object.values(item.markets || {}), ...Object.values(item.extra?.markets || {})].forEach((market) => (market.offers || []).forEach((offer) => {
        if (!firstSeen.has(offer.key)) firstSeen.set(offer.key, item.at);
      }));
    });
    const firstCheckAt = [...byDate.keys()].sort()[0];
    const since = document.querySelector("[data-monitoring-since]");
    if (since && monitoringChecks.length) {
      const sinceDays = Math.floor(daysSince(monitoringChecks[0].at));
      since.textContent = c.monitoringSince
        .replace(sinceDays < 1 ? " · {days}" : "{days}", sinceDays < 1 ? "" : daysText(sinceDays))
        .replace("{date}", shortDate(monitoringChecks[0].at))
        .replace("{count}", String(monitoringChecks.length));
    }
    const appearance = (offer) => {
      const listed = offer.listedAt && Number.isFinite(Date.parse(offer.listedAt)) ? offer.listedAt : "";
      const at = firstSeen.get(offer.key);
      // otomoto renews its date when an ad is refreshed: a monitoring that
      // saw the car earlier wins.
      if (listed && (!at || Date.parse(listed) <= Date.parse(at))) return { at: listed, kind: "listed" };
      if (!at) return null;
      return { at, kind: at === firstCheckAt ? "before" : "seen" };
    };
    // Liquidity (B22): every price each offer had in this car's checks, and
    // the portal's own earlier price. Long listed and already cheaper = a
    // candidate to negotiate (owner, 2026-10-04).
    const pricePath = new Map();
    [...byDate.values()].sort((left, right) => left.at.localeCompare(right.at)).forEach((item) => {
      [...Object.values(item.markets || {}), ...Object.values(item.extra?.markets || {})].forEach((market) => (market.offers || []).forEach((offer) => {
        const path = pricePath.get(offer.key) || [];
        if (!path.length || path[path.length - 1].price !== offer.price) path.push({ at: item.at, price: offer.price });
        pricePath.set(offer.key, path);
      }));
    });
    const liquidityCache = new Map();
    const liquidity = (offer) => {
      if (liquidityCache.has(offer)) return liquidityCache.get(offer);
      const path = pricePath.get(offer.key) || [{ price: offer.price }];
      const seenDrops = path.filter((point, index) => index && point.price < path[index - 1].price).length;
      const portalDrop = Number(offer.was) > Number(path[0].price) ? 1 : 0;
      const highest = Math.max(Number(offer.was) || 0, ...path.map((point) => Number(point.price) || 0));
      const dropped = highest > Number(offer.price);
      const info = appearance(offer);
      const days = info ? Math.floor(daysSince(info.at)) : null;
      const result = {
        dropped,
        drops: dropped ? Math.max(1, seenDrops + portalDrop) : 0,
        from: dropped ? highest : null,
        share: dropped ? (Number(offer.price) - highest) / highest : 0,
        days,
        atLeast: info?.kind === "before",
        deal: dropped && days !== null && days >= NEGOTIATION_DAYS,
      };
      liquidityCache.set(offer, result);
      return result;
    };
    const changedBetween = false;
    const newBase = !previous && (checks.length > 1 || otherChecks);
    // What the manager follows (owner 2026-10-10): the cars that fit the
    // search — the client's budget with its 10 % margin ("Dodatkowe" keeps
    // the ones just outside) — and the result filters set once in the
    // settings. Tiles, countries, lists and the market line count only them.
    const carBudget = monitoringScopeOf(entry.id).budget || null;
    const only = resultFiltersOf(entry.id);
    const fitsSearch = offerFitsSearch(entry.id);
    const passesOnly = (offer) => (!only.vat || isVatOffer(offer)) && (!only.dealers || offer.seller === "dealer")
      && (!only.drop || liquidity(offer).dropped) && (!only.deal || liquidity(offer).deal);
    const keepOffer = (source, offer) => fitsSearch(source, offer) && passesOnly(offer);
    // Every chosen portal has its tile, also one that never answered.
    const sources = MARKET_SOURCES.filter((source) => selection.markets.includes(source));
    const numbers = numberFormat();
    // Each portal against its own previous answer: one that did not answer
    // this time shows its last answered list (dated on its tile), and one that
    // did is compared with the last check it answered in.
    const bandAt = checkBandsOf(entry);
    const perSource = sources.map((source) => {
      const answeredChecks = sameSearch.filter((point) => portalAnswered(byDate.get(point.at), source));
      const shown = answeredChecks[answeredChecks.length - 1];
      const prior = answeredChecks[answeredChecks.length - 2];
      const current = shown ? answeredMarket(byDate.get(shown.at), source) : null;
      const compared = prior ? answeredMarket(byDate.get(prior.at), source) : null;
      const silent = !portalAnswered(record, source);
      // Checks searched with other budget borders (records from before
      // 2026-10-10, a Mac record of an older job): only the cars inside both
      // bands can be new or gone — no car at the border "new" one day and
      // "gone" the next (audit 2026-10-10, p. 18).
      const rows = withinBothBands(offerChanges(source, current, compared), bandAt(shown?.at, source), prior ? bandAt(prior.at, source) : null, SOURCE_CURRENCY[source])
        .filter((row) => keepOffer(source, row.offer));
      return { source, current, compared, rows, silent, shownAt: shown?.at || "", reason: silent ? portalFailure(record, source) : "" };
    });
    const carsNow = carsOf(perSource.map((item) => item.current));
    perSource.forEach((item) => {
      item.rows = item.rows.filter(stillListed(carsNow));
    });
    const silentNames = perSource.filter((item) => item.silent).map((item) => portalName(item.source));
    if (info && silentNames.length) {
      info.insertAdjacentHTML("beforeend", `<small class="mobileMonitoringSilent">${escapeMarketHtml(c.monitoringSilentInfo.replace("{portals}", silentNames.join(", ")))}</small>`);
    }
    // Countries -> portals -> states in one view (owner 2026-10-05): the row
    // of countries, the portal tiles of the chosen country, then the states.
    const inCountry = (source, offer) => !monitoringState.country || offerCountryKey(source, offer) === monitoringState.country;
    const countryGroups = MARKET_GROUPS.filter((group) => selectionGroupOn(selection, group)
      || perSource.some(({ source, rows }) => rows.some((row) => offerCountryKey(source, row.offer) === group.key)));
    if (monitoringState.country && !countryGroups.some((group) => group.key === monitoringState.country)) monitoringState.country = "";
    const countrySources = monitoringState.country ? [...new Set(marketGroup(monitoringState.country).rows.map(rowSource))] : null;
    const shownSources = perSource.filter(({ source }) => !countrySources || countrySources.includes(source));
    if (monitoringState.portal && !shownSources.some(({ source }) => source === monitoringState.portal)) monitoringState.portal = "";
    const countryTabs = (() => {
      if (countryGroups.length < 2) return "";
      const stats = (key) => {
        const rows = perSource.flatMap(({ source, rows: list }) => list.filter((row) => !key || offerCountryKey(source, row.offer) === key));
        const sure = perSource.filter(({ source, rows: list }) => list.some((row) => !key || offerCountryKey(source, row.offer) === key))
          .every(({ current, compared }) => Boolean(current?.complete && compared?.complete));
        return { now: rows.filter((row) => !row.gone).length, fresh: rows.filter((row) => row.group === "new").length, sure };
      };
      const chip = (key, label, flags) => {
        const { now, fresh, sure } = stats(key);
        const active = monitoringState.country === key;
        return `<button class="mobileMonitoringCountryTab${active ? " isActive" : ""}" type="button" data-monitoring-country-filter="${key}" aria-pressed="${active ? "true" : "false"}">${flags}<span>${escapeMarketHtml(label)}</span><b>${escapeMarketHtml(numbers.format(now))}</b>${before && fresh ? `<em class="${sure ? "isNew" : "isUnsure"}">${sure ? "" : "≈ "}+${escapeMarketHtml(numbers.format(fresh))}</em>` : ""}</button>`;
      };
      return `<div class="mobileMonitoringCountryTabs" role="group" aria-label="${escapeMarketHtml(c.monitoringCountriesLabel)}">
        ${chip("", c.monitoringCountryAll, "")}
        ${countryGroups.map((group) => {
          const german = germanCountries(selection.countries);
          const codes = group.key === "de" && german.length ? german : group.countries;
          return chip(group.key, window.AUTOGOOD_COUNTRY_NAME?.(group.countries[0]) || group.countries[0], `<span class="mobileMonitoringCountryFlags">${codes.map((code) => window.AUTOGOOD_FLAG?.(code) || "").join("")}</span>`);
        }).join("")}
      </div>`;
    })();
    const tiles = shownSources.map(({ source, current, compared, rows: allSourceRows, silent, shownAt, reason }) => {
      const rows = allSourceRows.filter((row) => inCountry(source, row.offer));
      const count = (group) => rows.filter((row) => row.group === group).length;
      // AutoScout24 counts its unique offers (duplicates of mobile.de left out);
      // inside a country: the cars of that country that were read.
      const byCountry = Boolean(monitoringState.country);
      // The cars that fit the search, as read (owner 2026-10-10: not every
      // ad of the portal — RAV 4 showed "687" beside 227 read).
      const total = rows.filter((row) => !row.gone).length;
      const comparedTotal = (compared?.offers || []).filter((offer) => inCountry(source, offer) && keepOffer(source, offer)).length;
      // The portal holds more than was read (mobile.de: at most 240 a search).
      const cut = Boolean(current && !current.complete && Number(current.total) > (current.offers?.length || 0));
      const delta = compared && comparedTotal ? total - comparedTotal : null;
      const certain = Boolean(current?.complete && compared?.complete);
      const active = monitoringState.portal === source;
      const german = germanCountries(selection.countries);
      const flagsOf = byCountry ? (monitoringState.country === "de" && german.length ? german : marketGroup(monitoringState.country).countries) : current?.countries || record.markets.mobile?.countries || [];
      return `
        <button class="mobileMonitoringTile is${sourceClass(source)}${active ? " isActive" : ""}" type="button" data-monitoring-portal="${source}" aria-pressed="${active ? "true" : "false"}">
          <span class="mobileMonitoringTileHead">${monitoringPortalBadge(source, flagsOf)}</span>
          ${current ? "" : `<span class="mobileMonitoringTileSilent"><b>${escapeMarketHtml(c.monitoringNoAnswer)}</b>${reason ? `<small>${escapeMarketHtml(reason)}</small>` : ""}</span>`}
          ${current ? `<span class="mobileMonitoringTileStats">
            <span><small>${escapeMarketHtml(c.monitoringOffers)}</small><b>${escapeMarketHtml(numbers.format(total))}</b>${delta ? `<em class="${delta > 0 ? "isGood" : "isBad"}">${delta > 0 ? "▲" : "▼"} ${escapeMarketHtml(numbers.format(Math.abs(delta)))}</em>` : ""}</span>
            ${compared && count("new") ? `<span><b class="${certain ? "isNew" : "isUnsure"}">${certain ? "" : "≈ "}+${count("new")}</b></span>` : ""}
            ${compared && count("gone") ? `<span><b class="${certain ? "isGone" : "isUnsure"}">${certain ? "" : "≈ "}−${count("gone")}</b></span>` : ""}
          </span>` : ""}
          ${current && silent ? `<small class="mobileMonitoringTileNote isSilent">${escapeMarketHtml(c.monitoringNoAnswerSince.replace("{date}", shortDate(latest.at)).replace("{shown}", shortDate(shownAt)))}${reason ? ` · ${escapeMarketHtml(reason)}` : ""}</small>` : ""}
          ${cut && !byCountry ? `<small class="mobileMonitoringTileNote isCut">${escapeMarketHtml(c.monitoringReadOf.replace("{read}", numbers.format(current.offers.length)).replace("{total}", numbers.format(current.total)))}${carBudget ? "" : ` · ${escapeMarketHtml(c.monitoringSetBudget)}`}</small>` : ""}
          ${compared && !certain && !cut ? `<small class="mobileMonitoringTileNote" title="${escapeMarketHtml(c.monitoringApproxTitle)}">${escapeMarketHtml(c.monitoringSample)}${byCountry ? "" : ` · ${escapeMarketHtml(c.monitoringReadOf.replace("{read}", numbers.format(current?.offers.length || 0)).replace("{total}", numbers.format(current?.read && source === "autoscout" ? current.total : current?.total || 0)))}`}</small>` : ""}
          ${current?.allCountriesTotal && !byCountry ? `<small class="mobileMonitoringTileNote">${escapeMarketHtml(c.monitoringAllCountries.replace("{count}", numbers.format(current.allCountriesTotal)))}</small>` : ""}
          ${current?.duplicates && !byCountry ? `<small class="mobileMonitoringTileNote">${escapeMarketHtml((source === "autoscout" ? c.monitoringDuplicates : c.monitoringDuplicatesOther).replace("{count}", numbers.format(current.duplicates)))}</small>` : ""}
        </button>`;
    }).join("");
    const chosen = (source, offer) => (!monitoringState.portal || source === monitoringState.portal) && inCountry(source, offer);
    const allRows = perSource.flatMap((item) => item.rows).filter((row) => chosen(row.source, row.offer));
    // Saved by hand: as listed now, or as saved when no longer listed. The
    // client PDF takes all of them, whatever is chosen above.
    const savedAll = savedCarsOf(entry.id);
    const saved = savedAll.filter((item) => chosen(item.source, item.offer || {}));
    const savedKeys = new Set(savedCarsOf(entry.id).map((item) => item.offer?.key));
    // "Dodatkowe": cars just outside the filters, found by this monitoring.
    const extra = record.extra || null;
    const extraBefore = new Set([before?.markets, before?.extra?.markets].flatMap((markets) => Object.values(markets || {}).flatMap((market) => (market.offers || []).map((offer) => offer.key))));
    const extraRows = Object.entries(extra?.markets || {})
      .filter(([source]) => selection.markets.includes(source))
      // "Nowe" only against a monitoring that also looked for them.
      .flatMap(([source, market]) => (market.offers || []).filter((offer) => chosen(source, offer) && passesOnly(offer)).map((offer) => ({ source, offer, extra: true, isNew: Boolean(before?.extra) && !extraBefore.has(offer.key) })));
    // p. 6: cars of another version or fuel (by the ad's name) from portals
    // that cannot search a version — out of the numbers, here with the reason.
    perSource.filter(({ source }) => VERSION_BLIND.includes(source)).forEach(({ source, current }) => {
      (current?.offers || []).forEach((offer) => {
        const miss = otherVersionOf(entry.filters, source, offer);
        if (miss && chosen(source, offer) && passesOnly(offer)) extraRows.push({ source, offer: { ...offer, miss }, extra: true, isNew: false });
      });
    });
    const currentByKey = new Map([
      ...perSource.flatMap(({ source, current }) => (current?.offers || []).map((offer) => [offer.key, { source, offer }])),
      ...Object.entries(extra?.markets || {}).flatMap(([source, market]) => (market.offers || []).map((offer) => [offer.key, { source, offer }])),
    ]);
    const savedRows = (items) => items.map((item) => {
      const now = currentByKey.get(item.offer.key);
      return now
        ? { source: now.source, offer: now.offer, previous: now.offer.price !== item.offer.price ? item.offer : null, savedAt: item.savedAt }
        : { source: item.source, offer: item.offer, gone: true, savedAt: item.savedAt };
    });
    const viewRows = {
      new: allRows.filter((row) => row.group === "new"),
      gone: allRows.filter((row) => row.group === "gone"),
      all: allRows.filter((row) => !row.gone),
      extra: extraRows,
      saved: savedRows(saved),
    };
    // Until 2026-10-10 the first monitoring left "Aktualne" picked for good,
    // and the next one with 6 new cars opened on 453 rows.
    if (monitoringState.autoView) monitoringState.view = before && viewRows.new.length ? "new" : "all";
    else if (!before && (monitoringState.view === "new" || monitoringState.view === "gone")) monitoringState.view = "all";
    const view = monitoringState.view;
    const statusLabel = { new: c.offerNew, firstSeen: c.offerFirstSeen, gone: c.offerGone, outside: c.offerOutside, cheaper: c.offerCheaper, dearer: c.offerDearer, same: c.offerSame };
    // Sorted by price, year, mileage, the day the ad appeared or the drop
    // (the filters are applied above, set in the settings).
    const sortValue = {
      price: (row) => row.offer.turnkey || priceInPln(row.offer.price, row.offer.currency),
      year: (row) => Number(row.offer.year) || 0,
      mileage: (row) => Number(row.offer.mileage) || 0,
      listed: (row) => Date.parse(appearance(row.offer)?.at || "") || 0,
      // The biggest drop first (most negative share).
      drop: (row) => liquidity(row.offer).share,
    }[monitoringPrefs.sort] || ((row) => row.offer.price);
    const direction = monitoringPrefs.dir === "desc" ? -1 : 1;
    const rows = viewRows[view]
      .sort((left, right) => (sortValue(left) - sortValue(right)) * direction || left.offer.price - right.offer.price);
    // Belarus (av.by compared with mobile.de / AutoScout24): German offers with
    // the car's price, the price in Minsk and turnkey with customs, in USD.
    const byCompare = Boolean(window.AUTOGOOD_TURNKEY_BY) && ctx.chartSources.avby && byEuCompared();
    const byOfferPrices = (offer, source) => {
      if (!byCompare || !byEuSource(source)) return null;
      const id = String(offer.key || "").startsWith("mobile:") ? offer.key.slice(7) : "";
      return turnkeyByFor({
        id,
        originalPrice: offer.price,
        originalCurrency: offer.currency || "EUR",
        netPrice: offer.priceType === "vat" ? offer.netPrice : 0,
        displacementCcm: offer.ccm,
        firstRegistration: offer.reg,
        year: offer.year,
        fuel: offer.fuel,
      }, entry.filters);
    };
    const byPriceCell = (prices) => `<b class="mobileMonitoringAdPrice">${escapeMarketHtml(formatMarketPrice(prices.parts.carEur, "EUR"))}</b>`
      + `<small class="mobileMonitoringVat is${prices.base === "netto" ? "Vat" : "Gross"}">${escapeMarketHtml(prices.base === "netto" ? c.byNet : c.byGross)} · ${escapeMarketHtml(formatMarketPrice(prices.carUsd, "USD"))}</small>`
      + `<small class="mobileMarketTurnkeyNote">${escapeMarketHtml(formatMarketPrice(prices.deliveredUsd, "USD"))} ${escapeMarketHtml(c.byDelivered)}*</small>`
      + `<small class="mobileMarketTurnkeyNote isStrong">${escapeMarketHtml(formatMarketPrice(prices.totalUsd, "USD"))} ${escapeMarketHtml(c.byTurnkey)}*</small>`;
    const priceCell = (offer, source) => {
      const prices = byOfferPrices(offer, source);
      return prices ? byPriceCell(prices) : plainPriceCell(offer);
    };
    // The same footnote as in the analysis under a list with Belarus prices.
    const bySavings = byCompare ? viewRows[view].map((row) => byOfferPrices(row.offer, row.source)?.benefitSavingUsd).filter((value) => value > 0).sort((a, b) => a - b) : [];
    const byRatesNow = byCompare ? window.AUTOGOOD_TURNKEY_BY.rates() : null;
    const byFootnote = bySavings.length
      ? `<p class="mobileMarketAxisNote isTurnkey">* ${escapeMarketHtml(c.turnkeyFootnoteBy
        .replace("{date}", byRatesNow.date ? byRatesNow.date.split("-").reverse().join(".") : "—")
        .replace("{saving}", formatMarketPrice(percentile(bySavings, 0.5), "USD")))}</p>`
      : "";
    const plainPriceCell = (offer) => `<b class="mobileMonitoringAdPrice">${escapeMarketHtml(formatPlainPrice(offer.price, offer.currency))}</b><small class="mobileMonitoringVat is${(offer.priceType || "gross").charAt(0).toUpperCase()}${(offer.priceType || "gross").slice(1)}">${escapeMarketHtml(vatLabel(offer))}</small>${offer.turnkey ? `<small class="mobileMarketTurnkeyNote">${escapeMarketHtml(formatPlainPrice(offer.turnkey, "PLN"))} ${escapeMarketHtml(c.turnkeyShort)}</small>` : ""}`;
    // The list shown is marked (filled, aria-pressed): until 2026-10-10 it
    // looked like the others.
    const viewButton = (key, label) => `<button class="mobileMarketImportClear${view === key ? " isActive" : ""}" type="button" data-monitoring-view="${key}" aria-pressed="${view === key ? "true" : "false"}"${(key === "new" || key === "gone") && !before ? " disabled" : ""}>${escapeMarketHtml(label)} · ${numbers.format(viewRows[key].length)}</button>`;
    // Wave 2: the status is a badge (new / cheaper / dearer), the market a
    // flag in the car's line, the median a column of its own.
    const withStatus = false;
    const columns = 6;
    const currentNow = viewRows.all.filter((row) => !row.gone);
    const medianOf = (items) => {
      const prices = items.map((row) => clientPricePln(row.offer, row.source)).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
      return prices.length ? percentile(prices, 0.5) : 0;
    };
    const medianNow = medianOf(currentNow);
    const toMedian = (row) => {
      if (!medianNow) return "";
      const share = (clientPricePln(row.offer, row.source) - medianNow) / medianNow;
      if (!Number.isFinite(share)) return "";
      const pct = Math.round(share * 100);
      return `<span class="${pct < 0 ? "isBelow" : pct > 0 ? "isAbove" : ""}">${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)} %</span><small>${escapeMarketHtml(c.monitoringColMedian.toLowerCase())}</small>`;
    };
    const dateLine = (offer) => {
      const info = appearance(offer);
      if (!info) return "";
      const text = { listed: c.monitoringListedSince, seen: c.monitoringSeenSince, before: c.monitoringSeenBefore }[info.kind]
        .replace("{date}", shortDate(info.at)).replace("{days}", daysText(daysSince(info.at)));
      const title = { listed: c.monitoringListedTitle, seen: c.monitoringSeenTitle, before: c.monitoringSeenBeforeTitle }[info.kind];
      return `<small class="mobileMonitoringDate is${info.kind.charAt(0).toUpperCase()}${info.kind.slice(1)}" title="${escapeMarketHtml(title)}">${escapeMarketHtml(text)}</small>`;
    };
    const metaLine = (offer) => [offer.year, offer.mileage ? `${numbers.format(offer.mileage)} ${kmUnit()}` : "", powerText(offer.power)].filter(Boolean).join(" · ");
    const percentText = (share) => `${share < 0 ? "−" : "+"}${Math.abs(Math.round(share * 1000) / 10).toLocaleString(currentLanguage() === "ru" ? "ru-RU" : "pl-PL")} %`;
    const dropLine = (offer) => {
      const info = liquidity(offer);
      if (!info.dropped) return "";
      const text = c.monitoringDrop
        .replace("{from}", formatPlainPrice(info.from, offer.currency))
        .replace("{to}", formatPlainPrice(offer.price, offer.currency))
        .replace("{pct}", percentText(info.share));
      return `<small class="mobileMonitoringDrop" title="${escapeMarketHtml(c.monitoringDropTitle)}">↓ ${escapeMarketHtml(text)}${info.drops > 1 ? ` · ${escapeMarketHtml(c.monitoringDropTimes.replace("{count}", String(info.drops)))}` : ""}</small>`;
    };
    const dealBadge = (offer) => (liquidity(offer).deal ? ` <span class="mobileMonitoringDeal" title="${escapeMarketHtml(c.monitoringDealTitle)}">${escapeMarketHtml(c.monitoringDeal)}</span>` : "");
    // The market's pace: how long offers stay, how many got cheaper, how many
    // went in the last week (complete lists only: a sample misses offers).
    const liquidityHtml = (() => {
      const current = viewRows.all.filter((row) => !row.gone);
      if (!current.length) return "";
      const known = current.map((row) => liquidity(row.offer)).filter((info) => info.days !== null);
      const days = known.map((info) => info.days).sort((a, b) => a - b);
      const medianDays = days.length ? days[Math.floor(days.length / 2)] : null;
      const atLeast = known.some((info) => info.atLeast);
      const dropped = current.filter((row) => liquidity(row.offer).dropped).length;
      const deals = current.filter((row) => liquidity(row.offer).deal).length;
      const weekAgo = Date.now() - 7 * 86400000;
      const goneWeek = new Set();
      perSource.filter(({ source, current: market }) => market?.complete && (!monitoringState.portal || source === monitoringState.portal)).forEach(({ source, current: market }) => {
        const now = new Set((market.offers || []).map((offer) => offer.key));
        const nowBand = bandAt(record.at, source);
        // A car outside today's budget border (an older check of another band) has not gone.
        const inBand = (item, offer) => sameBand(bandAt(item.at, source), nowBand) || inPriceBand(offer, nowBand, SOURCE_CURRENCY[source]);
        monitoringChecks.filter((item) => item.scope === record.scope && item.at !== record.at && Date.parse(item.at) >= weekAgo && item.markets?.[source]?.complete)
          .forEach((item) => item.markets[source].offers.forEach((offer) => { if (!now.has(offer.key) && !carsNow.has(carSignature(offer)) && inCountry(source, offer) && inBand(item, offer)) goneWeek.add(offer.key); }));
      });
      const parts = [
        medianDays !== null && !(atLeast && medianDays < 1) ? c.monitoringLiquidityDays.replace("{days}", `${atLeast ? "≥ " : ""}${daysText(medianDays)}`) : "",
        c.monitoringLiquidityDrops.replace("{count}", numbers.format(dropped)).replace("{total}", numbers.format(current.length)).replace("{pct}", `${Math.round((dropped / current.length) * 100)} %`),
        deals ? c.monitoringLiquidityDeals.replace("{count}", numbers.format(deals)) : "",
        before ? c.monitoringLiquidityGone.replace("{count}", numbers.format(goneWeek.size)) : "",
      ].filter(Boolean);
      return `<p class="mobileMonitoringLiquidity" title="${escapeMarketHtml(c.monitoringLiquidityTitle)}"><b>${escapeMarketHtml(c.monitoringLiquidity)}</b> ${parts.map((part) => `<span>${escapeMarketHtml(part)}</span>`).join("")}</p>`;
    })();
    const nextText = c.monitoringNext.replace("{date}", nextMonitoringText(entry));
    const emptyText = {
      new: c.monitoringEmptyNew.replace("{date}", formatHistoryDate(latest.at)).replace("{next}", nextText),
      gone: c.monitoringEmptyGone.replace("{date}", formatHistoryDate(latest.at)).replace("{next}", nextText),
      saved: c.monitoringEmptySaved,
      extra: extra ? c.monitoringExtraEmpty.replace("{pct}", String(extra.tolerance)) : c.monitoringExtraNone,
    }[view] || c.monitoringEmptyList;
    // What the extra list is, and why the year got no margin.
    // No description (owner 2026-10-05): the orange mark on each car says it.
    const extraNote = "";
    const sortOptions = [["price", c.monitoringSortPrice], ["year", c.monitoringSortYear], ["mileage", c.monitoringSortMileage], ["listed", c.monitoringSortListed], ["drop", c.monitoringSortDrop]];
    const savedCount = savedAll.length;
    // 100 cars at a time (AutoScout24 alone can bring 2 000).
    const shownRows = rows.slice(0, monitoringState.limit);
    rowsForDetails = new Map(shownRows.map((row) => [row.offer.key, row]));
    // Audit p. 7 (owner 2026-10-10): the prices in the middle — per country
    // the cheapest and the median "na gotowo w Polsce" of this monitoring
    // (cars that fit the search), against the day before.
    const summaryHtml = (() => {
      const days = monitoringStatsRows(entry, byDate).filter((row) => row.scope === record.scope);
      const today = days[days.length - 1];
      if (!today) return "";
      const yesterday = days.length > 1 && !today.changed ? days[days.length - 2] : null;
      // Wave 2: "all countries" is the row of figures above; here each country.
      const keys = monitoringState.country ? [monitoringState.country]
        : MARKET_GROUPS.map((group) => group.key).filter((key) => today.offers.some((item) => item.country === key));
      if (!monitoringState.country && keys.length < 2) return "";
      const stats = (row, key) => (row ? statsOfOffers(row.offers.filter((item) => !key || item.country === key)) : null);
      const zl = (value) => escapeMarketHtml(formatPlainPrice(Math.round(value), "PLN"));
      const move = (now, then) => {
        if (!Number.isFinite(then) || !then) return "";
        const pct = ((now - then) / then) * 100;
        if (Math.abs(pct) < 0.5) return `<em class="isFlat">= ${escapeMarketHtml(c.monitoringSummaryVs.replace("{date}", shortDate(yesterday.at)))}</em>`;
        return `<em class="${pct < 0 ? "isGood" : "isBad"}">${pct > 0 ? "▲" : "▼"} ${escapeMarketHtml(numbers.format(Math.round(Math.abs(pct) * 10) / 10))}% ${escapeMarketHtml(c.monitoringSummaryVs.replace("{date}", shortDate(yesterday.at)))}</em>`;
      };
      const cards = keys.map((key) => {
        const now = stats(today, key);
        if (!now) return "";
        // Only against a day the same portals answered (9.10 without mobile.de
        // would show Germany 13 % cheaper).
        const portalsOf = (row) => [...new Set((row?.offers || []).filter((item) => !key || item.country === key).map((item) => item.source))].sort().join(",");
        const then = yesterday && portalsOf(yesterday) === portalsOf(today) ? stats(yesterday, key) : null;
        const name = key ? window.AUTOGOOD_COUNTRY_NAME?.(marketGroup(key).countries[0]) || key : c.monitoringCountryAll;
        const cheapest = now.min.offer.url
          ? `<a href="${escapeMarketHtml(now.min.offer.url)}" target="_blank" rel="noopener">${zl(now.min.pln)}</a>`
          : zl(now.min.pln);
        return `<div class="mobileMonitoringSummaryCard${key ? "" : " isAll"}">
          <span class="mobileMonitoringSummaryName">${escapeMarketHtml(name)} <small>${escapeMarketHtml(c.monitoringSummaryCount.replace("{count}", numbers.format(now.count)))}</small></span>
          <span><small>${escapeMarketHtml(c.monitoringSummaryCheapest)}</small><b>${cheapest}</b>${then ? move(now.min.pln, then.min.pln) : ""}</span>
          <span><small>${escapeMarketHtml(c.median)}</small><b>${zl(now.median)}</b>${then ? move(now.median, then.median) : ""}</span>
        </div>`;
      }).join("");
      return cards ? `<div class="mobileMonitoringSummaryStrip" aria-label="${escapeMarketHtml(c.monitoringStatsUnit)}"><p>${escapeMarketHtml(c.monitoringSummaryTitle)}</p><div>${cards}</div></div>` : "";
    })();
    const kpiHtml = (() => {
      if (!currentNow.length && !viewRows.new.length && !viewRows.gone.length) return "";
      const comparable = Boolean(before) && perSource.every((item) => !item.current || item.compared);
      const thenRows = comparable ? perSource.flatMap(({ source, compared }) => (compared?.offers || []).filter((offer) => chosen(source, offer) && fitsSearch(source, offer)).map((offer) => ({ source, offer }))) : [];
      const medianThen = comparable ? medianOf(thenRows) : 0;
      const deals = currentNow.filter((row) => liquidity(row.offer).deal).length;
      const zl = (value) => formatPlainPrice(Math.round(value), "PLN");
      // "1 682", as the prices (pl-PL leaves four digits together).
      const count = (value) => numbers.format(Math.round(value));
      const pct = medianThen ? ((medianNow - medianThen) / medianThen) * 100 : null;
      const move = pct === null ? "" : Math.abs(pct) < 0.5 ? " (=)" : ` (${pct > 0 ? "▲" : "▼"} ${numbers.format(Math.round(Math.abs(pct) * 10) / 10)} %)`;
      const totalLabel = carBudget ? c.monitoringKpiTotal : c.monitoringKpiTotalNoBudget;
      const sinceDate = before ? formatHistoryDate(before.at) : "";
      const sentence = [
        before ? c.monitoringSentenceSince.replace("{date}", sinceDate) : c.monitoringSentenceFirst,
        before ? c.monitoringSentenceChanges.replace("{new}", numbers.format(viewRows.new.length)).replace("{gone}", numbers.format(viewRows.gone.length)) : "",
        medianNow ? c.monitoringSentenceMarket.replace("{label}", totalLabel).replace("{total}", count(currentNow.length)).replace("{median}", zl(medianNow)).replace("{move}", move) : "",
        deals ? c.monitoringSentenceDeals.replace("{deals}", numbers.format(deals)) : "",
      ].filter(Boolean).join(" ");
      const totalThen = comparable ? thenRows.length : null;
      const tile = (cls, label, value, note) => `<div class="mobileMonitoringKpi${cls}"><small>${escapeMarketHtml(label)}</small><b>${value}</b>${note ? `<span>${note}</span>` : ""}</div>`;
      return `
        <p class="mobileMonitoringSentence">${escapeMarketHtml(sentence)}</p>
        <div class="mobileMonitoringKpis">
          ${tile(" isNew", c.monitoringKpiNew, before ? `+${escapeMarketHtml(numbers.format(viewRows.new.length))}` : "—", before ? escapeMarketHtml(c.monitoringKpiSince.replace("{date}", sinceDate)) : "")}
          ${tile(" isGone", c.monitoringKpiGone, before ? `−${escapeMarketHtml(numbers.format(viewRows.gone.length))}` : "—", escapeMarketHtml(c.monitoringKpiGoneHint))}
          ${tile("", totalLabel, escapeMarketHtml(count(currentNow.length)), totalThen !== null && totalThen !== currentNow.length ? `<em class="${currentNow.length > totalThen ? "isUp" : "isDown"}">${currentNow.length > totalThen ? "▲" : "▼"} ${escapeMarketHtml(numbers.format(Math.abs(currentNow.length - totalThen)))}</em>` : "")}
          ${tile("", c.monitoringKpiMedian, medianNow ? escapeMarketHtml(zl(medianNow)) : "—", pct !== null && Math.abs(pct) >= 0.5 ? `<em class="${pct > 0 ? "isBad" : "isGood"}">${pct > 0 ? "▲" : "▼"} ${escapeMarketHtml(numbers.format(Math.round(Math.abs(pct) * 10) / 10))} %</em>` : "")}
          ${tile(" isDeal", c.monitoringKpiDeals, escapeMarketHtml(numbers.format(deals)), escapeMarketHtml(c.monitoringKpiDealsHint))}
        </div>`;
    })();
    const tabsHtml = `
      <div class="mobileMonitoringTabs" role="tablist">
        ${[["list", c.monitoringTabList], ["history", c.monitoringTabHistory], ["market", c.monitoringTabMarket]].map(([key, label]) => `<button type="button" role="tab" data-monitoring-tab="${key}" aria-selected="${(monitoringState.tab || "list") === key ? "true" : "false"}"${(monitoringState.tab || "list") === key ? ' class="isActive"' : ""}>${escapeMarketHtml(label)}</button>`).join("")}
      </div>`;
    target.innerHTML = `
      ${changedBetween ? `<p class="mobileMarketOfferWarning">${escapeMarketHtml(c.offerFiltersBetween)}</p>` : ""}
      ${!before ? `<p class="mobileMonitoringNote">${escapeMarketHtml((newBase ? c.monitoringNewBase : c.monitoringBaseline).replace("{count}", numbers.format(perSource.reduce((sum, item) => sum + (item.current?.offers.length || 0), 0))))}</p>` : ""}
      ${kpiHtml}
      ${countryTabs}
      ${summaryHtml}
      <div class="mobileMonitoringTiles">${tiles}</div>
      ${tabsHtml}
      <div data-monitoring-list-panel>
      <div class="mobileMonitoringViews" role="group">
        ${viewButton("new", c.monitoringViewNew)}${viewButton("gone", c.monitoringViewGone)}${viewButton("all", c.monitoringViewAll)}${viewButton("extra", c.monitoringViewExtraShort)}${viewButton("saved", c.monitoringViewSaved)}
        ${monitoringState.portal ? `<button class="mobileMarketImportClear" type="button" data-monitoring-portal="">${escapeMarketHtml(c.monitoringAllPortals)} ✕</button>` : ""}
        <button class="mobileMarketImportClear mobileMonitoringPdfButton" type="button" data-monitoring-pdf${savedCount ? "" : ` aria-disabled="true" title="${escapeMarketHtml(c.monitoringPdfEmpty)}"`}>${escapeMarketHtml(c.monitoringPdf)} · ${savedCount}</button>
      </div>
      ${liquidityHtml}
      ${extraNote}
      <div class="mobileMonitoringListTools">
        <label>${escapeMarketHtml(c.monitoringSort)}
          <select data-monitoring-sort>${sortOptions.map(([key, label]) => `<option value="${key}"${monitoringPrefs.sort === key ? " selected" : ""}>${escapeMarketHtml(label)}</option>`).join("")}</select>
        </label>
        <button class="mobileMonitoringSortDir" type="button" data-monitoring-sort-dir aria-label="${escapeMarketHtml(c.monitoringSortDir)}" title="${escapeMarketHtml(c.monitoringSortDir)}">${monitoringPrefs.dir === "desc" ? "↓" : "↑"}</button>
        ${resultFiltersNote(only)}
      </div>
      ${rows.length ? `
      <div class="mobileMarketTableScroll mobileMonitoringList">
        <table class="mobileMarketTable mobileMonitoringTable">
          <thead><tr>
            <th scope="col" class="isNum mobileMarketRowNumber">#</th>
            <th scope="col" class="mobileMonitoringStarCell"><span class="agVisuallyHidden">★</span></th>
            <th scope="col">${escapeMarketHtml(c.offerAd)}</th>
            <th scope="col" class="isNum">${escapeMarketHtml(c.offerPrice)}</th>
            <th scope="col" class="isNum" title="${escapeMarketHtml(c.monitoringColMedianTitle)}">${escapeMarketHtml(c.monitoringColMedian)}</th>
            <th scope="col"><span class="agVisuallyHidden">⋯</span></th>
          </tr></thead>
          <tbody>${shownRows.map((row, index) => {
            const isSaved = savedKeys.has(row.offer.key);
            const detailsOpen = openDetails.has(row.offer.key);
            return `
            <tr class="${row.gone ? "isGone" : ""}${row.offer.miss ? " isExtra" : ""}">
              <td class="isNum mobileMarketRowNumber">${index + 1}</td>
              <td class="mobileMonitoringStarCell"><button class="mobileMonitoringStar${isSaved ? " isOn" : ""}" type="button" data-monitoring-save="${escapeMarketHtml(row.offer.key)}" aria-pressed="${isSaved ? "true" : "false"}" title="${escapeMarketHtml(isSaved ? c.monitoringUnsave : c.monitoringSave)}" aria-label="${escapeMarketHtml(isSaved ? c.monitoringUnsave : c.monitoringSave)}">${isSaved ? "★" : "☆"}</button></td>
              <td class="mobileMarketTableTitle">${row.offer.url ? `<a href="${escapeMarketHtml(row.offer.url)}" target="_blank" rel="noopener"><b>${escapeMarketHtml(row.offer.title || "—")}</b></a>` : `<b>${escapeMarketHtml(row.offer.title || "—")}</b>`}${row.gone ? "" : dealBadge(row.offer)}${row.isNew || (view !== "new" && row.group === "new") ? ` <span class="mobileMarketOfferStatus isNew">${escapeMarketHtml(c.offerNew)}</span>` : ["cheaper", "dearer"].includes(row.status) ? ` <span class="mobileMarketOfferStatus is${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}">${escapeMarketHtml(statusLabel[row.status])}</span>` : ""}${row.offer.miss ? `<small class="mobileMonitoringMiss" title="${escapeMarketHtml(row.offer.miss.kind === "options" ? c.monitoringMissOptionsTitle : c.monitoringMissTitle)}">≈ ${escapeMarketHtml(nearMissText(row.offer.miss))}</small>` : ""}<small class="mobileMonitoringMeta">${offerCountryBadge(row.source, row.offer.country)} ${escapeMarketHtml(metaLine(row.offer) || "—")}</small>${dateLine(row.offer)}${row.gone ? "" : dropLine(row.offer)}${row.previous && row.previous.price !== row.offer.price ? `<small>${escapeMarketHtml(c.offerBefore)}: ${escapeMarketHtml(formatPlainPrice(row.previous.price, row.previous.currency))}</small>` : ""}${view === "saved" ? `<small>${escapeMarketHtml([row.gone ? c.monitoringSavedGone : "", row.savedAt ? c.monitoringSavedAt.replace("{date}", formatHistoryDate(row.savedAt)) : ""].filter(Boolean).join(" · "))}</small>` : ""}</td>
              <td class="isNum">${priceCell(row.offer, row.source)}</td>
              <td class="isNum mobileMonitoringToMedian">${row.gone ? "" : toMedian(row)}</td>
              <td class="mobileMonitoringActions"><button class="mobileMonitoringDetailsToggle" type="button" data-monitoring-details="${escapeMarketHtml(row.offer.key)}" aria-expanded="${detailsOpen ? "true" : "false"}">${escapeMarketHtml(detailsOpen ? c.monitoringDetailsHide : c.monitoringDetails)}</button>${!row.gone && window.AUTOGOOD_CALC_POPUP?.importable(row.source) ? `<button class="agCalcButton" type="button" data-monitoring-calc="${escapeMarketHtml(row.offer.key)}">${escapeMarketHtml(c.monitoringCalc)}</button>` : ""}${!row.gone && window.AUTOGOOD_OFFER_LINK?.offerable(row.source) ? `<button class="agOfferButton" type="button" data-offer-create data-offer-history="${escapeMarketHtml(entry.id)}" data-offer-key="${escapeMarketHtml(row.offer.key)}" data-offer-source="${escapeMarketHtml(row.source)}">${escapeMarketHtml(c.monitoringOffer)}</button>` : ""}</td>
            </tr>${detailsOpen ? offerDetailsHtml(row, columns) : ""}`;
          }).join("")}</tbody>
        </table>
      </div>
      ${rows.length > shownRows.length ? `<button class="mobileMarketImportClear mobileMonitoringShowMore" type="button" data-monitoring-page-more>${escapeMarketHtml(c.monitoringShowMore.replace("{count}", numbers.format(rows.length - shownRows.length)))}</button>` : ""}` : `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(emptyText)}</p>`}${byFootnote}
      </div>`;
    applyMonitoringTab(entry);
    monitoringPdfRows = { entry, rows: savedRows(savedAll), priceCell, metaLine, dateLine };
  }

  // ---- PDF for the client: the cars saved (★) for this favourite ---------
  var monitoringPdfRows = null;
  async function downloadClientPdf(button) {
    const c = copy();
    const data = monitoringPdfRows;
    if (!data || !data.rows.length) {
      Object.assign(monitoringState, { status: c.monitoringPdfEmpty, statusError: true });
      renderPriceHistoryPage();
      return;
    }
    const rows = [...data.rows].filter((row) => !row.gone).sort((left, right) => (left.offer.turnkey || priceInPln(left.offer.price, left.offer.currency)) - (right.offer.turnkey || priceInPln(right.offer.price, right.offer.currency)));
    const title = monitoringTitle(data.entry);
    const today = new Date();
    const report = document.createElement("article");
    report.className = "mobileMarketAnalysisPanel mobileMonitoringClientReport";
    report.innerHTML = `
      <header class="mobileMonitoringClientHead">
        <img src="./assets/autogood-logo.png" alt="AUTOGOOD" />
        <div>
          <h1>${escapeMarketHtml(c.monitoringPdfTitle.replace("{car}", title))}</h1>
          <p>${escapeMarketHtml(c.monitoringPdfSub.replace("{date}", formatHistoryDate(today.toISOString()).split(",")[0]).replace("{count}", String(rows.length)))}</p>
        </div>
      </header>
      <table class="mobileMarketTable mobileMonitoringClientTable">
        <thead><tr><th>#</th><th>${escapeMarketHtml(c.offerAd)}</th><th class="isNum">${escapeMarketHtml(c.offerPrice)}</th></tr></thead>
        <tbody>${rows.map((row, index) => `
          <tr>
            <td class="isNum">${index + 1}</td>
            <td><b>${escapeMarketHtml(row.offer.title || "—")}</b><small>${escapeMarketHtml(data.metaLine(row.offer))}</small><small>${offerCountryBadge(row.source, row.offer.country)}</small>${row.offer.url ? `<a href="${escapeMarketHtml(row.offer.url)}">${escapeMarketHtml(c.monitoringPdfOpen)} ↗</a>` : ""}</td>
            <td class="isNum">${data.priceCell(row.offer, row.source)}</td>
          </tr>`).join("")}</tbody>
      </table>
      <p class="mobileMarketAxisNote isTurnkey">* ${turnkeyFootnoteHtml(c.turnkeyFootnote, exciseText(pdfExciseClasses(rows, data.entry?.filters || {})))}</p>`;
    const fileName = `AUTOGOOD ${c.monitoringPdfFile} ${title} ${today.toISOString().slice(0, 10)}.pdf`.replace(/[\\/:*?"<>|']+/g, "").replace(/\s+/g, " ");
    await downloadReportPdf(button, "pdf", {
      live: report,
      fileName,
      onStatus: (text, isError = false) => {
        Object.assign(monitoringState, { status: text, statusError: isError });
        const box = document.querySelector(".mobileMonitoringResults .mobileMonitoringStatus[data-monitoring-pdf-status]");
        if (box) box.textContent = text;
      },
      working: c.monitoringPdfWorking,
      ready: c.monitoringPdfReady,
      failed: c.monitoringPdfFailed,
    });
    renderPriceHistoryPage();
  }

  // One check of a favourite, in place: its portals read (whole lists where
  // short enough, with its own prices), a new dated row in its history with
  // the offers kept, then the comparison above is drawn again.
  // Every field of the page-1 form, empty.
  function blankFilters() {
    try {
      return Object.fromEntries(Object.entries(readManualFields()).map(([key, value]) => [key, Array.isArray(value) ? [] : typeof value === "boolean" ? false : ""]));
    } catch {
      return {};
    }
  }

  // ---- "Dodatkowe": offers just outside the filters (owner, 2026-10-04) ----
  // A car that misses ONE filter by a little is shown apart and marked with
  // what differs: mileage, price or power up to 5 or 10 % past a set bound,
  // the year by one (only when that year is surely the same generation), or
  // one of the chosen options. Each bound is its own narrow search ("120 001 –
  // 132 000 km" with every other filter as set), so a car found there differs
  // in that one thing only. Options: the same search without them.
  // Option fields of the page-1 form and their "nothing chosen" values.
  const NEAR_OPTION_FIELDS = {
    features: { empty: [], inputs: "[data-mobile-feature]" },
    parkingSensors: { empty: [], inputs: "[data-mobile-parking-sensor]" },
    interiorMaterials: { empty: [], inputs: "[data-mobile-interior-material]" },
    airConditioning: { empty: "", inputs: "[data-mobile-air-conditioning]" },
    trailerCoupling: { empty: "any", inputs: "[data-mobile-trailer-coupling]" },
    cruiseControl: { empty: "any", inputs: "[data-mobile-cruise-control]" },
  };

  // The options chosen in a search, with their names as page 1 writes them.
  function chosenOptions(filters) {
    const labelOf = (selector, value) => {
      const input = [...document.querySelectorAll(selector)].find((item) => item.value === value);
      return input?.closest("label")?.textContent.replace(/\s+/g, " ").trim() || value;
    };
    return Object.entries(NEAR_OPTION_FIELDS).flatMap(([field, { empty, inputs }]) => {
      const value = filters[field];
      if (Array.isArray(empty)) return (Array.isArray(value) ? value : []).map((item) => ({ field, value: item, label: labelOf(inputs, item) }));
      return value && value !== empty ? [{ field, value, label: labelOf(inputs, value) }] : [];
    });
  }

  // ultimatespecs generations (data/model-generations.json, B61): a facelift
  // is its own row there, so rows are grouped by the generation code
  // ("G20 / G80 LCI - 2023 Update" and "G20 / G80" = G20).
  let generationsPromise = null;
  function loadGenerations() {
    if (!generationsPromise) {
      generationsPromise = fetch("./data/model-generations.json?v=b61-20261004")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
    }
    return generationsPromise;
  }
  const plainWord = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const ROMAN = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6" };
  const GENERATION_NOISE = new Set(["type", "typ", "gen", "generation", "facelift", "restyling", "update", "new", "model", "lci", "eu", "the"]);
  function generationCode(name, model) {
    const own = new Set([model.model, model.label, model.brand].flatMap((value) => plainWord(value).split(/[^a-z0-9]+/)).filter(Boolean));
    const glued = new Set([model.model, model.label].map((value) => plainWord(value).replace(/[^a-z0-9]/g, "")));
    const words = plainWord(name).split(/[^a-z0-9.]+/).filter(Boolean);
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index].replace(/\.$/, "");
      // "Phase 2" is a facelift step, not a generation.
      if (word === "phase") return "";
      if (!word || own.has(word) || glued.has(word) || GENERATION_NOISE.has(word) || /^(19|20)\d{2}$/.test(word)) continue;
      return ROMAN[word] || word;
    }
    return "";
  }
  async function generationGroups(filters) {
    const data = await loadGenerations();
    const model = (data?.models || []).find((item) => plainWord(item.brand) === plainWord(filters.brand) && plainWord(item.model) === plainWord(filters.model));
    if (!model) return null;
    const thisYear = new Date().getFullYear();
    const groups = new Map();
    model.generations.forEach((row, index) => {
      const code = generationCode(row.generation, model) || `#${index}`;
      const group = groups.get(code) || { code, names: [], from: Infinity, to: -Infinity };
      group.names.push(row.generation);
      group.from = Math.min(group.from, Number(row.from) || thisYear);
      group.to = Math.max(group.to, row.to === null || row.to === undefined ? thisYear : Number(row.to));
      groups.set(code, group);
    });
    return [...groups.values()];
  }
  // One year past a year bound, when that year surely belongs to the
  // generation the filter means: the one holding the bound and the year next
  // to it inside the range ("od 2019" for a BMW 3 = 2019 and 2020 = G20, so
  // 2018, an F30, is not offered). Years of two generations overlap: then no.
  function sameGenerationStep(groups, bound, inside, next) {
    const holds = (group, value) => group.from <= value && value <= group.to;
    const meant = groups.filter((group) => holds(group, bound) && holds(group, inside));
    const atNext = groups.filter((group) => holds(group, next));
    return meant.length === 1 && atNext.length === 1 && atNext[0] === meant[0] ? meant[0] : null;
  }

  const roundTo = (value, step) => Math.round(value / step) * step;

  // The narrow searches of one favourite, and why some bound has none.
  async function nearMissPlans(base, markets, tolerance, ownPrices = {}) {
    const share = tolerance / 100;
    const plans = [];
    const skipped = [];
    const number = (value) => {
      const parsed = Number(String(value ?? "").replace(/\s/g, ""));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };
    // Mileage, power: the same band on every portal.
    const band = (kind, fromKey, toKey, step, extra = () => ({})) => {
      const from = number(base[fromKey]);
      const to = number(base[toKey]);
      if (to) {
        const upper = Math.max(to + step, roundTo(to * (1 + share), step));
        plans.push({ kind, side: "max", limit: to, filters: { ...base, [fromKey]: String(to + 1), [toKey]: String(upper), ...extra(to + 1, upper) }, markets });
      }
      if (from) {
        const lower = Math.max(0, Math.min(from - step, roundTo(from * (1 - share), step)));
        plans.push({ kind, side: "min", limit: from, filters: { ...base, [fromKey]: String(lower), [toKey]: String(from - 1), ...extra(lower, from - 1) }, markets });
      }
    };
    band("mileage", "mileageFrom", "mileageTo", 1000);
    // In kW mode mobile.de gets kW; the band is kept in step.
    band("power", "powerFrom", "powerTo", 1, (low, high) => (base.powerUnit === "kw" ? { powerKwFrom: String(Math.round(low / 1.35962)), powerKwTo: String(Math.round(high / 1.35962)) } : {}));
    // Year: one more year only inside the same generation.
    const yearFrom = number(base.yearFrom);
    const yearTo = number(base.yearTo);
    if (yearFrom || yearTo) {
      const groups = await generationGroups(base);
      const thisYear = new Date().getFullYear();
      if (!groups) skipped.push({ kind: "year", reason: "noData" });
      else {
        const top = yearTo || thisYear;
        if (yearFrom) {
          const group = sameGenerationStep(groups, yearFrom, Math.min(yearFrom + 1, top), yearFrom - 1);
          if (group) plans.push({ kind: "year", side: "min", limit: yearFrom, generation: group.names[group.names.length - 1], filters: { ...base, yearFrom: String(yearFrom - 1), yearTo: String(yearFrom - 1) }, markets });
          else skipped.push({ kind: "year", side: "min", reason: "boundary" });
        }
        if (yearTo && yearTo < thisYear) {
          const group = sameGenerationStep(groups, yearTo, Math.max(yearTo - 1, yearFrom || 0), yearTo + 1);
          if (group) plans.push({ kind: "year", side: "max", limit: yearTo, generation: group.names[group.names.length - 1], filters: { ...base, yearFrom: String(yearTo + 1), yearTo: String(yearTo + 1) }, markets });
          else skipped.push({ kind: "year", side: "max", reason: "boundary" });
        }
      }
    }
    // Price: page 1's price (EUR) for portals without their own, each
    // portal's own price where it has one (set on page 3).
    const own = Object.fromEntries(markets.map((source) => [source, ownPrices?.[source] || null]));
    // AutoScout24 without a price of its own follows mobile.de's (getListings).
    if (!own.autoscout && own.mobile) own.autoscout = own.mobile;
    ["max", "min"].forEach((side) => {
      const pageLimit = number(side === "max" ? base.priceTo : base.priceFrom);
      const prices = {};
      const limits = {};
      const covered = markets.filter((source) => {
        const ownLimit = number(side === "max" ? own[source]?.to : own[source]?.from);
        // av.by keeps its own USD price field: no band there.
        if (source === "avby") return false;
        if (ownLimit) {
          const step = SOURCE_CURRENCY[source] === "EUR" ? 100 : 1000;
          prices[source] = side === "max"
            ? { from: ownLimit + 1, to: Math.max(ownLimit + step, roundTo(ownLimit * (1 + share), step)) }
            : { from: Math.max(0, Math.min(ownLimit - step, roundTo(ownLimit * (1 - share), step))), to: ownLimit - 1 };
          limits[source] = { value: ownLimit, currency: SOURCE_CURRENCY[source] };
          return true;
        }
        if (own[source]) return false;
        if (!pageLimit) return false;
        prices[source] = null;
        limits[source] = { value: pageLimit, currency: "EUR" };
        return true;
      });
      if (!covered.length) return;
      const upper = Math.max(pageLimit + 100, roundTo(pageLimit * (1 + share), 100));
      const lower = Math.max(0, Math.min(pageLimit - 100, roundTo(pageLimit * (1 - share), 100)));
      const pageBand = pageLimit ? (side === "max" ? { priceFrom: String(pageLimit + 1), priceTo: String(upper) } : { priceFrom: String(lower), priceTo: String(pageLimit - 1) }) : {};
      plans.push({ kind: "price", side, limits, filters: { ...base, ...pageBand }, prices, markets: covered });
    });
    // Options: the same search without them; a sample is enough.
    const options = chosenOptions(base);
    if (options.length) {
      const bare = Object.fromEntries(Object.entries(NEAR_OPTION_FIELDS).map(([field, { empty }]) => [field, Array.isArray(empty) ? [] : empty]));
      plans.push({ kind: "options", options: options.map((option) => option.label), filters: { ...base, ...bare }, markets, sample: true });
    }
    return { plans, skipped };
  }

  // What a found car shows, checked on its own data: a car that in fact
  // meets the bound (the portal filters a little differently) is left out.
  function nearMissOf(plan, listing, source) {
    if (plan.kind === "options") return { kind: "options", options: plan.options };
    if (plan.kind === "year") {
      const year = Number(listing.year) || 0;
      if (year && (plan.side === "min" ? year >= plan.limit : year <= plan.limit)) return null;
      return { kind: "year", side: plan.side, limit: plan.limit, value: year || null, generation: plan.generation };
    }
    if (plan.kind === "mileage") {
      const mileage = Number(listing.mileage) || 0;
      if (mileage && (plan.side === "max" ? mileage <= plan.limit : mileage >= plan.limit)) return null;
      return { kind: "mileage", side: plan.side, limit: plan.limit, value: mileage || null };
    }
    if (plan.kind === "power") {
      const power = Number(String(powerInKm(listing.power)).match(/\d+/)?.[0]) || 0;
      if (power && (plan.side === "max" ? power <= plan.limit : power >= plan.limit)) return null;
      return { kind: "power", side: plan.side, limit: plan.limit, value: power || null };
    }
    const limit = plan.limits[source];
    if (!limit) return null;
    const price = convertPrice(Number(listing.price), listing.currency || SOURCE_CURRENCY[source], limit.currency);
    if (price && (plan.side === "max" ? price <= limit.value : price >= limit.value)) return null;
    return { kind: "price", side: plan.side, limit: limit.value, currency: limit.currency, share: price ? price / limit.value - 1 : null };
  }

  // Reads every narrow search, one after another, and keeps per portal the
  // cars that are not in the monitoring's own lists.
  async function readNearMisses({ historyId, ownPrices = {}, base, markets, tolerance, strictKeys, provider, progress = null }) {
    const c = copy();
    const { plans, skipped } = await nearMissPlans(base, markets, tolerance, ownPrices);
    // Every plan reads with the car's own portal prices unless it bands them.
    const ownMap = Object.fromEntries(MARKET_SOURCES.map((source) => [source, ownPrices?.[source] || null]));
    const found = {};
    const seen = new Set(strictKeys);
    const done = [];
    for (const [index, plan] of plans.entries()) {
      monitoringPhase = c.monitoringExtraProgress.replace("{done}", String(index + 1)).replace("{total}", String(plans.length)).replace("{what}", nearMissPlanText(plan));
      Object.keys(monitoringProgress).forEach((key) => delete monitoringProgress[key]);
      progress?.(plan.markets[0], { state: "wait" });
      let raw = [];
      try {
        raw = await provider.getListings({
          filters: { ...plan.filters, markets: plan.markets },
          pinned: true,
          historyId,
          sequential: true,
          wholeList: plan.sample ? false : null,
          priceOverride: plan.prices || ownMap,
          progress: progress || (() => {}),
        });
      } catch {
        // Nothing just outside this bound (or the portals did not answer).
      }
      const bySource = {};
      normalizeListings(raw).forEach((listing) => {
        const key = offerKey(listing);
        if (seen.has(key)) return;
        const source = listingSource(listing);
        const miss = nearMissOf(plan, listing, source);
        if (!miss) return;
        seen.add(key);
        (bySource[source] = bySource[source] || []).push({ listing, miss });
      });
      Object.entries(bySource).forEach(([source, items]) => {
        const compact = compactOffers(items.map((item) => item.listing), source, plan.filters);
        const market = found[source] || (found[source] = { offers: [] });
        compact.offers.forEach((offer, offerIndex) => market.offers.push({ ...offer, miss: items[offerIndex].miss }));
      });
      done.push({ kind: plan.kind, side: plan.side || "", count: Object.values(bySource).reduce((sum, items) => sum + items.length, 0) });
    }
    monitoringPhase = "";
    return { tolerance, plans: done, skipped, markets: found };
  }

  // A short name of a narrow search for the progress line.
  function nearMissPlanText(plan) {
    const c = copy();
    if (plan.kind === "options") return c.monitoringExtraPlanOptions;
    return c[`monitoringExtraPlan${plan.kind.charAt(0).toUpperCase()}${plan.kind.slice(1)}`] || plan.kind;
  }

  // The near misses of a check join its record (never replacing its offers).
  async function saveCheckExtra(historyId, at, extra) {
    try {
      const db = await openCheckOffersDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CHECK_OFFERS_STORE, "readwrite");
        const store = tx.objectStore(CHECK_OFFERS_STORE);
        const read = store.get(`${historyId}|${at}`);
        read.onsuccess = () => {
          // Normally the record is there; if its main lists are still being
          // written, they merge into this one (saveCheckOffers keeps "extra").
          store.put({ ...(read.result || { key: `${historyId}|${at}`, historyId, at, markets: {} }), extra });
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      checkOffersCache.delete(historyId);
    } catch {
      // The main lists of the check are kept anyway.
    }
  }

  // The words of one near miss ("przebieg 121 000 km — 1 000 km ponad filtr").
  function nearMissText(miss) {
    const c = copy();
    const numbers = numberFormat();
    if (!miss) return "";
    if (miss.kind === "version") return c.monitoringMissVersion.replace("{found}", miss.found || "—");
    if (miss.kind === "fuel") return c.monitoringMissFuel;
    if (miss.kind === "options") {
      return (miss.options.length === 1 ? c.monitoringMissOption : c.monitoringMissOptions).replace("{options}", miss.options.join(", "));
    }
    const key = `monitoringMiss${miss.kind.charAt(0).toUpperCase()}${miss.kind.slice(1)}${miss.side === "max" ? "Max" : "Min"}`;
    const unit = miss.kind === "mileage" ? ` ${kmUnit()}` : miss.kind === "power" ? ` ${powerText("KM")}` : "";
    const delta = miss.value ? Math.abs(miss.value - miss.limit) : null;
    return (c[key] || "")
      .replace("{value}", miss.value ? `${numbers.format(miss.value)}${unit}` : "—")
      .replace("{delta}", delta !== null ? `${numbers.format(delta)}${unit}` : "—")
      .replace("{limit}", miss.kind === "price" ? formatPlainPrice(miss.limit, miss.currency) : `${numbers.format(miss.limit)}${unit}`)
      .replace("{pct}", Number.isFinite(miss.share) ? `${Math.abs(Math.round(miss.share * 1000) / 10).toLocaleString(currentLanguage() === "ru" ? "ru-RU" : "pl-PL")} %` : "—")
      .replace("{generation}", miss.generation || "");
  }

  // One monitoring's reading of the portals, nothing saved: the page saves it
  // (runMonitoringCheck), the automation runner returns it (B43). job =
  // { id, filters, markets, countries, prices } (prices: each portal's own
  // {from, to} or null; null for all = the favourite's own, read here).
  async function readMonitoringLists(job, provider, progress) {
    const markets = job.markets;
    // A favourite saved before a newer form field existed: the search gets
    // that field empty; the history keeps the filters as saved.
    const searchFilters = { ...blankFilters(), ...job.filters, markets };
    // mobile.de and AutoScout24 are searched in the monitoring countries;
    // the statistics stay with page 1's countries (Germany by default).
    const withCountries = markets.includes("mobile") || markets.includes("autoscout");
    const base = withCountries ? { ...searchFilters, countries: job.countries } : searchFilters;
    const readMarkets = (only) => provider.getListings({
      filters: { ...base, markets: only },
      pinned: true,
      historyId: job.id,
      sequential: true,
      priceOverride: job.prices || null,
      // A function: AutoScout24 is then read whole (B48), as Monitoring wants.
      progress: progress || (() => {}),
    });
    const pause = () => new Promise((resolve) => setTimeout(resolve, 5000));
    // otomoto, blocket and AutoScout24 share a free reader proxy that now
    // and then refuses a burst: a portal that gave nothing is asked once
    // more, alone, when the others are done.
    let raw;
    try {
      raw = await readMarkets(markets);
    } catch {
      await pause();
      raw = await readMarkets(markets);
    }
    let sourcesOk = [...(provider.lastSources || [])];
    // Answered, an empty list included: the rest is "no answer" in the record.
    let answered = [...(provider.lastAnswered || provider.lastSources || [])];
    let duplicates = { ...(provider.lastDuplicates || {}) };
    let errors = { ...(provider.lastErrors || {}) };
    let autoscoutMeta = provider.lastAutoscout || null;
    const pricesKey = provider.lastPrices ?? null;
    const retry = markets.filter((source) => !answered.includes(source) && !/model not found/i.test(errors[source] || ""));
    if (retry.length) {
      await pause();
      try {
        let more = await readMarkets(retry);
        const nowOk = provider.lastSources || [];
        // Duplicates dropped inside this second round (its own main portals).
        retry.forEach((source) => {
          if (provider.lastDuplicates?.[source]) duplicates[source] = provider.lastDuplicates[source];
        });
        // A second portal asked again alone (AutoScout24, Kleinanzeigen,
        // Marktplaats, 2dehands): its country's main portals read in the first
        // round are in "raw", their duplicates are dropped here too.
        Object.keys(SECOND_PORTALS).filter((source) => nowOk.includes(source)).forEach((source) => {
          const mainsBefore = raw.filter((listing) => SECOND_PORTALS[source].against.includes(listingSource(listing)));
          if (!mainsBefore.length) return;
          const own = more.filter((listing) => listingSource(listing) === source);
          const { unique, duplicates: dropped } = dropCountryDuplicates(source, own, mainsBefore);
          more = [...more.filter((listing) => listingSource(listing) !== source), ...unique];
          if (source === "autoscout" && provider.lastAutoscout) provider.lastAutoscout = { ...provider.lastAutoscout, duplicates: dropped, deduplicated: true };
          else duplicates[source] = (duplicates[source] || 0) + dropped;
        });
        raw = [...raw, ...more];
        sourcesOk = [...sourcesOk, ...nowOk];
        answered = [...new Set([...answered, ...(provider.lastAnswered || nowOk)])];
        answered.forEach((source) => delete errors[source]);
        errors = { ...errors, ...(provider.lastErrors || {}) };
        if (nowOk.includes("autoscout")) autoscoutMeta = provider.lastAutoscout || autoscoutMeta;
      } catch {
        // Still nothing: said in the status.
      }
    }
    answered = answered.filter((source) => markets.includes(source));
    provider.lastSources = sourcesOk;
    provider.lastAnswered = answered;
    provider.lastErrors = errors;
    provider.lastAutoscout = autoscoutMeta;
    provider.lastPrices = pricesKey;
    // Each portal that did not answer, with its reason (shown on its tile).
    const failed = Object.fromEntries(markets.filter((source) => !answered.includes(source)).map((source) => [source, String(errors[source] || "").slice(0, 120)]));
    return { raw, searchFilters, base, sourcesOk, answered, failed, errors, duplicates };
  }

  // ---- Automation (B43): Monitoring without a manager's browser ------------
  // A runner (server/monitoring-runner.mjs) opens this page with ?runner=1 in
  // its own Chrome and calls run(job) for every job; the records it returns
  // are what this page would have saved. The manager's browser hands out its
  // jobs (jobs()) and takes the records back (importRecords()). How jobs and
  // records travel (server, login) is decided with B26; see
  // docs/MONITORING-SERVER.md.
  const RUNNER_MODE = new URLSearchParams(window.location.search).has("runner");
  const runnerProgress = {};

  function monitoringJobs() {
    refreshMarketHistory();
    const jobs = ctx.marketHistory.filter((entry) => entry.pinned && entry.autoRefresh?.enabled).map((entry) => {
      const { markets } = monitoringSelection(entry);
      const scope = monitoringScopeOf(entry.id);
      const all = monitoringPrices(entry);
      const prices = Object.fromEntries(markets.map((source) => [source, all[source]]).filter(([, price]) => price));
      return { id: entry.id, title: monitoringTitle(entry), filters: entry.filters, markets, countries: scope.countries, tolerance: scope.tolerance, prices, ...monitoringSchedule(entry) };
    });
    return { version: 1, exportedAt: new Date().toISOString(), jobs };
  }

  async function runMonitoringJob(job) {
    const provider = window.AUTOGOOD_MOBILE_MARKET_PROVIDER;
    if (!provider) throw new Error("Market provider missing");
    if (!job?.id || !job.filters) throw new Error("Job without id or filters");
    const markets = (job.markets || []).filter((source) => MARKET_SOURCES.includes(source));
    const chosen = (job.countries || []).filter((code) => MONITORING_COUNTRY_CHOICES.includes(code));
    const countries = chosen.length ? chosen : MONITORING_COUNTRIES;
    const prices = Object.fromEntries(MARKET_SOURCES.map((source) => [source, job.prices?.[source] || null]));
    Object.keys(runnerProgress).forEach((key) => delete runnerProgress[key]);
    const progress = (source, info) => { runnerProgress[source] = { ...(runnerProgress[source] || {}), ...info }; };
    // The model table first: a mild hybrid's "na gotowo" is counted with the hybrid's excise (B61).
    await window.AUTOGOOD_MODEL_SPECS_UI?.ready?.(job.filters.brand);
    const read = await readMonitoringLists({ id: String(job.id), filters: job.filters, markets, countries, prices }, provider, progress);
    const fetched = normalizeListings(read.raw);
    if (fetched.length < 3) throw new Error("Fewer than 3 offers");
    const at = new Date().toISOString();
    const scope = monitoringScopeKey({ countries }, markets);
    const sources = read.sourcesOk.filter((source) => markets.includes(source));
    const notes = { autoscout: provider.lastAutoscout || undefined, mobile: markets.includes("mobile") ? { countries } : undefined };
    Object.entries(read.duplicates || {}).forEach(([source, count]) => {
      if (count && markets.includes(source)) notes[source] = { ...(notes[source] || {}), duplicates: count };
    });
    const record = { key: `${job.id}|${at}`, historyId: String(job.id), at, scope, markets: {}, answered: read.answered, failed: read.failed, by: "automation", signature: searchSignature(job.filters), prices: provider.lastPrices ?? null, errors: read.errors };
    // Also a portal whose every car is a duplicate of the main portal's.
    [...new Set([...sources, ...read.answered])].forEach((source) => {
      const market = withDuplicates({ ...compactOffers(fetched, source, job.filters), ...(notes[source] || {}) });
      if (market.offers.length || market.duplicates) record.markets[source] = market;
    });
    // The dated row of the price history: statistics of page 1's countries.
    const analysisCountries = (job.filters.countries || []).filter(Boolean);
    const inAnalysis = (listing) => !["mobile", "autoscout"].includes(listingSource(listing)) || !analysisCountries.length || !listing.country || analysisCountries.includes(listing.country);
    const point = marketPricePoint(fetched.filter(inAnalysis), at, job.filters);
    record.point = Object.fromEntries(sources.filter((source) => point?.[source]).map((source) => [source, point[source]]));
    if (Number(job.tolerance)) {
      record.extra = await readNearMisses({
        historyId: String(job.id),
        ownPrices: prices,
        base: read.base,
        markets: sources,
        tolerance: Number(job.tolerance),
        strictKeys: new Set(fetched.map(offerKey)),
        provider,
        progress,
      });
    }
    return record;
  }

  // Records made elsewhere join this browser's history: only added, never
  // replacing a record or a dated row already here (4.6.1). A record of other
  // filters than the favourite has now is left out (it would compare wrong).
  async function importMonitoringRecords(records) {
    const result = { added: 0, known: 0, unknownCar: 0, otherSearch: 0, invalid: 0 };
    const db = await openCheckOffersDb();
    const exists = (key) => new Promise((resolve) => {
      const request = db.transaction(CHECK_OFFERS_STORE).objectStore(CHECK_OFFERS_STORE).get(key);
      request.onsuccess = () => resolve(Boolean(request.result));
      request.onerror = () => resolve(true);
    });
    for (const record of Array.isArray(records) ? records : [records]) {
      if (!record || typeof record !== "object" || !record.historyId || !Number.isFinite(Date.parse(record.at)) || !record.markets || typeof record.markets !== "object") {
        result.invalid += 1;
        continue;
      }
      refreshMarketHistory();
      const entry = ctx.marketHistory.find((item) => item.id === record.historyId);
      if (!entry) {
        result.unknownCar += 1;
        continue;
      }
      if (record.signature && record.signature !== searchSignature(entry.filters)) {
        result.otherSearch += 1;
        continue;
      }
      const key = `${record.historyId}|${record.at}`;
      if (await exists(key)) {
        result.known += 1;
        continue;
      }
      const { point, prices, signature, errors, ...stored } = record;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CHECK_OFFERS_STORE, "readwrite");
        tx.objectStore(CHECK_OFFERS_STORE).put({ ...stored, key });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      refreshMarketHistory();
      const fresh = ctx.marketHistory.find((item) => item.id === record.historyId);
      if (fresh && point && Object.keys(point).length && !(fresh.priceLog || []).some((row) => row.at === record.at)) {
        // Searched with other bands than the Monitoring check before it (the
        // manager changed the budget after the job was handed out): a new
        // base, as a check of this browser would mark it (audit 2026-10-10,
        // p. 18; until then a Mac record was compared across two bands).
        const before = (fresh.priceLog || []).filter((row) => row.at < record.at);
        const mark = pricesMarkFor(before, prices ?? null, true, record.scope ? String(record.scope).split("|")[0].split(",").filter(Boolean) : null);
        const marker = mark ? [{ at: new Date(Date.parse(record.at) - 1).toISOString(), filtersChange: true, pricesChange: true, ...mark, filters: fresh.filters }] : [];
        const log = [...(fresh.priceLog || []), ...marker, { at: record.at, ...(prices ? { prices } : {}), monitoring: true, ...point }].sort((left, right) => left.at.localeCompare(right.at));
        storeMarketHistory(ctx.marketHistory.map((item) => (item.id === fresh.id ? { ...item, priceLog: log } : item)));
      }
      checkOffersCache.delete(record.historyId);
      result.added += 1;
    }
    if (currentPage() === "history") renderPriceHistoryPage();
    return result;
  }

  // Audit p. 8 (owner 2026-10-10): what the Mac's service tells in its
  // notification after a check — by the page's own rules: each portal against
  // its previous answer, a car still listed on another portal is not new, a
  // car of another version (p. 6) or a suspect price does not count.
  function monitoringNews(job, previous, record) {
    const result = { fresh: 0, cheaper: 0, gone: 0, bySource: {} };
    if (!previous || !record || previous.scope !== record.scope) return result;
    const counted = (source, offer) => !offer.suspect && !offer.bid && !otherVersionOf(job?.filters, source, offer);
    const before = carsOf(Object.values(previous.markets || {}));
    const now = carsOf(Object.values(record.markets || {}));
    MARKET_SOURCES.filter((source) => portalAnswered(record, source) && portalAnswered(previous, source)).forEach((source) => {
      const then = new Map((answeredMarket(previous, source).offers || []).map((offer) => [offer.key, offer]));
      const current = (answeredMarket(record, source).offers || []).filter((offer) => counted(source, offer));
      const keys = new Set(current.map((offer) => offer.key));
      const fresh = current.filter((offer) => !then.has(offer.key) && !before.has(carSignature(offer))).length;
      const cheaper = current.filter((offer) => then.has(offer.key) && offer.price < then.get(offer.key).price).length;
      const gone = [...then.values()].filter((offer) => counted(source, offer) && !keys.has(offer.key) && !now.has(carSignature(offer))).length;
      if (fresh || cheaper || gone) result.bySource[portalName(source)] = { fresh, cheaper, gone };
      result.fresh += fresh;
      result.cheaper += cheaper;
      result.gone += gone;
    });
    return result;
  }

  window.AUTOGOOD_MONITORING = {
    jobs: monitoringJobs,
    run: runMonitoringJob,
    news: monitoringNews,
    importRecords: importMonitoringRecords,
    progress: () => ({ ...runnerProgress }),
    runner: RUNNER_MODE,
  };

  // Checks run one at a time (owner, 2026-10-04: the portals are not asked
  // for several cars at once); one asked for meanwhile waits in this queue.
  async function runMonitoringCheck(entry, markets = monitoringSelection(entry).markets, { auto = false } = {}) {
    const c = copy();
    const provider = window.AUTOGOOD_MOBILE_MARKET_PROVIDER;
    if (!provider) return false;
    if (monitoringState.busy) {
      if (monitoringState.busy !== entry.id && !isQueued(entry.id)) monitoringQueue.push({ entry, markets, auto });
      if (currentPage() === "history") renderPriceHistoryPage();
      return false;
    }
    monitoringState.busy = entry.id;
    if (monitoringState.id === entry.id) Object.assign(monitoringState, { status: "", statusError: false });
    if (currentPage() === "history") renderPriceHistoryPage();
    let ok = false;
    try {
      // The model table first: a mild hybrid's "na gotowo" is counted with the hybrid's excise (B61).
      await window.AUTOGOOD_MODEL_SPECS_UI?.ready?.(entry.filters?.brand);
      const filters = { ...entry.filters, markets };
      const scope = monitoringScopeOf(entry.id);
      Object.keys(monitoringProgress).forEach((key) => delete monitoringProgress[key]);
      // Shown whichever car is open: the line says which car runs.
      const progress = (source, info) => updateMonitoringProgress(source, info);
      // The budget's border is fixed with the search's real excise.
      if (scope.budget) await exciseSettled(entry.filters);
      const read = await readMonitoringLists({ id: entry.id, filters, markets, countries: scope.countries, prices: monitoringPrices(entry) }, provider, progress);
      const { base } = read;
      const fetched = normalizeListings(read.raw);
      if (fetched.length < 3) throw new Error(c.refreshInvalid);
      const analysisCountries = (entry.filters.countries || []).filter(Boolean);
      const countryBound = (listing) => ["mobile", "autoscout"].includes(listingSource(listing));
      const inAnalysis = (listing) => !countryBound(listing) || !analysisCountries.length || !listing.country || analysisCountries.includes(listing.country);
      // Which portals answered and why the others did not: a portal without an
      // answer is not "everything sold" (owner's audit 2026-10-10).
      const notes = { scope: monitoringScopeKey(scope, markets), answered: read.answered, failed: read.failed };
      if (provider.lastAutoscout) notes.autoscout = provider.lastAutoscout;
      if (markets.includes("mobile")) notes.mobile = { countries: scope.countries };
      // Cars of Marktplaats, 2dehands, Kleinanzeigen, ParuVendu counted on the
      // country's main portal: said on the tile, not taken for gone ones.
      Object.entries(read.duplicates || {}).forEach(([source, count]) => {
        if (count && markets.includes(source)) notes[source] = { ...(notes[source] || {}), duplicates: count };
      });
      refreshMarketHistory();
      const current = ctx.marketHistory.find((item) => item.id === entry.id) || entry;
      measureNextSnapshot(provider.lastSources || markets, true, provider.lastPrices ?? null, {
        // The chosen portals: their bands decide a new base.
        markets,
        // Also a portal whose every car is a duplicate of the main portal's.
        sources: [...new Set([...(provider.lastSources || markets), ...read.answered])],
        listings: fetched,
        notes,
      });
      let searchUrl = current.searchUrl;
      try {
        searchUrl = searchUrl || buildMobileDeSearchUrl({ ...blankFilters(), ...filters });
      } catch {
        searchUrl = searchUrl || "";
      }
      updateMarketSnapshot(entry.id, filters, mergeBySource(current.listings, fetched.filter(inAnalysis)), "API", searchUrl || "-");
      ok = true;
      const missing = markets.filter((source) => !read.answered.includes(source));
      if (missing.length && monitoringState.id === entry.id) {
        // A portal that answered "no such model" is said so; others did not answer.
        const reasons = missing.map((source) => (/model not found/i.test(provider.lastErrors?.[source] || "") ? monitoringErrorText(provider.lastErrors[source], source) : "")).filter(Boolean);
        const silent = missing.filter((source) => !/model not found/i.test(provider.lastErrors?.[source] || ""));
        Object.assign(monitoringState, {
          status: [...reasons, silent.length ? c.monitoringMissing.replace("{portals}", silent.map(portalName).join(", ")) : ""].filter(Boolean).join(" "),
          statusError: true,
        });
      }
      // Then the cars just outside the filters ("Dodatkowe"), added to the
      // same dated record; the main lists are already saved and shown.
      const at = [...(ctx.marketHistory.find((item) => item.id === entry.id)?.priceLog || [])].reverse().find((point) => !point.filtersChange)?.at;
      if (scope.tolerance && at) {
        const keep = { lastSources: provider.lastSources, lastErrors: provider.lastErrors, lastAutoscout: provider.lastAutoscout, lastPrices: provider.lastPrices };
        try {
          if (currentPage() === "history") renderPriceHistoryPage();
          const extra = await readNearMisses({
            historyId: entry.id,
            ownPrices: monitoringPrices(entry),
            base,
            markets: markets.filter((source) => (keep.lastSources || markets).includes(source)),
            tolerance: scope.tolerance,
            strictKeys: new Set(fetched.map(offerKey)),
            provider,
            progress,
          });
          await saveCheckExtra(entry.id, at, extra);
        } catch {
          // The main check stands without them.
        } finally {
          Object.assign(provider, keep);
          monitoringPhase = "";
        }
      }
    } catch (error) {
      if (monitoringState.id === entry.id) Object.assign(monitoringState, { status: monitoringErrorText(error), statusError: true });
    } finally {
      monitoringState.busy = "";
      // A fresh monitoring of the car on screen opens on its new cars.
      if (ok && monitoringState.id === entry.id) Object.assign(monitoringState, { autoView: true, limit: 100 });
      Object.keys(monitoringProgress).forEach((key) => delete monitoringProgress[key]);
      if (currentPage() === "history") renderPriceHistoryPage();
    }
    runNextMonitoring();
    return ok;
  }

  async function runNextMonitoring() {
    while (monitoringQueue.length && !monitoringState.busy) {
      const next = monitoringQueue.shift();
      // A scheduled check done meanwhile (by hand) is not repeated.
      if (next.auto && await monitoredSince(next.entry.id, dueSlot(next.entry) ?? Date.now())) continue;
      runMonitoringCheck(next.entry, next.markets, { auto: next.auto });
      return;
    }
    if (currentPage() === "history") renderPriceHistoryPage();
  }

  async function monitoredSince(historyId, since) {
    const byDate = await loadCheckOffers(historyId);
    return [...byDate.values()].some((record) => record.scope && Date.parse(record.at) >= since);
  }

  // ---- Variant B (owner, 2026-10-04): the owner's Mac checks at 9:30 -------
  // server/monitoring-runner.mjs --serve runs on that Mac as a LaunchAgent
  // (127.0.0.1:8789, never through the tunnel). The page sends it the cars
  // with monitoring on and takes its records back (importMonitoringRecords).
  // Asked only from a browser where it was switched on once with
  // mobile.html?localMonitoring=1 — elsewhere Chrome would ask every employee
  // for "local network access". While the service answers and today's run
  // did not break down, the page does not check on its own.
  const LOCAL_MONITORING_URL = "http://127.0.0.1:8789/monitoring";
  // Claude's built-in browser cannot reach 127.0.0.1: there the service is
  // asked through the mobile.de importer's tunnel, which passes on its three
  // routes (owner 2026-10-10, audit p. 5, variant 1; server/mobilede-import.mjs).
  const tunnelMonitoringUrl = () => {
    try {
      const importer = typeof readMobileDeApiUrl === "function" ? readMobileDeApiUrl() : "";
      return /^https:\/\//.test(importer) ? `${importer.replace(/\/mobilede\/import\/?$/, "")}/monitoring` : "";
    } catch {
      return "";
    }
  };
  let monitoringServiceUrl = LOCAL_MONITORING_URL;
  // {enabled, client, since}: a convenience of this browser, not user data.
  const LOCAL_MONITORING_KEY = "autogood.mobile.localMonitoring.v1";
  function localMonitoringState() {
    try {
      const state = JSON.parse(localStorage.getItem(LOCAL_MONITORING_KEY) || "{}");
      return state && typeof state === "object" && !Array.isArray(state) ? state : {};
    } catch {
      return {};
    }
  }
  function saveLocalMonitoring(change) {
    try {
      localStorage.setItem(LOCAL_MONITORING_KEY, JSON.stringify({ ...localMonitoringState(), ...change }));
    } catch {
      // Not remembered: the page still checks by itself.
    }
  }
  (() => {
    const flag = new URLSearchParams(window.location.search).get("localMonitoring");
    if (flag === "1") saveLocalMonitoring({ enabled: true });
    if (flag === "0") saveLocalMonitoring({ enabled: false });
  })();
  let localSyncRunning = null;
  function syncLocalMonitoring({ patient = false } = {}) {
    if (RUNNER_MODE || !localMonitoringState().enabled) return Promise.resolve();
    if (!localSyncRunning) localSyncRunning = (async () => {
      const was = localMonitoring.available;
      let health = null;
      const ask = async (base, wait) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), wait);
          const response = await fetch(`${base}/health`, { cache: "no-store", signal: controller.signal });
          clearTimeout(timer);
          return response.ok ? await response.json() : null;
        } catch {
          return null;
        }
      };
      // A click on "connect" waits for Chrome's local-access question; then
      // the importer's tunnel (the built-in browser of Claude).
      for (const base of [LOCAL_MONITORING_URL, tunnelMonitoringUrl()].filter(Boolean)) {
        health = await ask(base, base === LOCAL_MONITORING_URL && patient ? 60000 : 4000);
        if (health?.ok) {
          monitoringServiceUrl = base;
          break;
        }
      }
      Object.assign(localMonitoring, { available: Boolean(health?.ok), failedToday: Boolean(health?.failedToday) });
      let added = 0;
      if (health?.ok) {
        let state = localMonitoringState();
        if (!state.client) {
          saveLocalMonitoring({ client: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` });
          state = localMonitoringState();
        }
        try {
          // The jobs carry the budget's fixed border (counted with the real excise).
          refreshMarketHistory();
          for (const entry of ctx.marketHistory.filter((item) => item.pinned && item.autoRefresh?.enabled && monitoringScopeOf(item.id).budget)) await exciseSettled(entry.filters, 4000);
          await fetch(`${monitoringServiceUrl}/jobs`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: state.client, jobs: monitoringJobs().jobs }) });
          refreshMarketHistory();
          const ids = ctx.marketHistory.filter((entry) => entry.pinned).map((entry) => entry.id);
          let since = state.since || "";
          for (let round = 0; round < 10 && ids.length; round += 1) {
            const response = await fetch(`${monitoringServiceUrl}/records?ids=${encodeURIComponent(ids.join(","))}&since=${encodeURIComponent(since)}`, { cache: "no-store" });
            const data = response.ok ? await response.json() : null;
            if (!data?.records?.length) break;
            added += (await importMonitoringRecords(data.records)).added;
            since = data.records[data.records.length - 1].at;
            saveLocalMonitoring({ since });
            if (!data.more) break;
          }
        } catch {
          // Next time (every 5 minutes).
        }
      }
      if ((added || was !== localMonitoring.available) && currentPage() === "history") renderPriceHistoryPage();
    })().finally(() => {
      localSyncRunning = null;
    });
    return localSyncRunning;
  }
  // Settings changed (switch, countries, margin, prices): the Mac learns soon.
  let localSyncTimer = null;
  function scheduleLocalSync() {
    clearTimeout(localSyncTimer);
    localSyncTimer = setTimeout(syncLocalMonitoring, 1500);
  }

  // Monitored favourites are checked once a day by themselves while the
  // program is open — unless this Mac's service does it (variant B).
  async function runDueMonitoring() {
    if (localMonitoring.available && !localMonitoring.failedToday) return;
    refreshMarketHistory();
    for (const entry of ctx.marketHistory.filter((item) => item.pinned && item.autoRefresh?.enabled)) {
      const slot = dueSlot(entry);
      if (slot === null) continue;
      if (monitoringState.busy === entry.id || isQueued(entry.id)) continue;
      if (await monitoredSince(entry.id, slot)) continue;
      // One car after another: a car due while another runs joins the queue.
      await runMonitoringCheck(entry, monitoringSelection(entry).markets, { auto: true });
    }
  }

  // The portals a favourite is monitored on, as page 3 shows it: an old
  // favourite with mobile.de but without an AutoScout24 mark keeps the page's
  // choice for AutoScout24 (restoreManualFilters). Before 2026-10-04 the daily
  // check took the saved list alone, so its scope differed from the page's
  // and the page said "no monitoring with these portals".
  function monitoringMarketsOf(entry) {
    const saved = (entry.filters.markets || []).filter((source) => MARKET_SOURCES.includes(source));
    if (!saved.length) return MARKET_SOURCES.filter((source) => ctx.chartSources[source]);
    const knowsAutoscout = saved.includes("autoscout") || !saved.includes("mobile");
    return MARKET_SOURCES.filter((source) => (source === "autoscout" && !knowsAutoscout ? Boolean(ctx.chartSources.autoscout) : saved.includes(source)));
  }
  if (!RUNNER_MODE) setTimeout(() => syncLocalMonitoring().then(runDueMonitoring), 4000);
  // The converter shows Walutomat's live rate once it has arrived.
  window.AUTOGOOD_TURNKEY?.calculatorRate?.().then(() => {
    const out = document.querySelector("[data-monitoring-convert-out]");
    if (out && currentPage() === "history" && !document.activeElement?.closest?.("[data-mobile-price-history-page]")) renderPriceHistoryPage();
  }).catch(() => {});
  // Looked at every 5 minutes, so 9:30 is met while the program is open.
  if (!RUNNER_MODE) setInterval(() => syncLocalMonitoring().then(runDueMonitoring), 5 * 60 * 1000);

  // Scheduled checks are a setting of the favourite, stored with it (the
  // stored history is re-read first, see 4.6.1 in docs/PROJECT-MOBILE.md).
  function setAutoRefresh(historyId, autoRefresh) {
    refreshMarketHistory();
    if (!ctx.marketHistory.some((item) => item.id === historyId)) return;
    if (!storeMarketHistory(ctx.marketHistory.map((item) => (item.id === historyId ? { ...item, autoRefresh } : item)))) return;
    renderPriceHistoryPage();
    scheduleLocalSync();
  }

  // Typing in a field of "Więcej filtrów" moved here: the form hears it.
  priceHistoryPage?.addEventListener("input", (event) => {
    if (event.target.closest?.("[data-monitoring-more-filters]")) document.querySelector(".mobileManualForm")?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  priceHistoryPage?.addEventListener("input", (event) => {
    const amount = event.target.closest("[data-monitoring-convert-amount]");
    if (!amount) return;
    converterState.amount = amount.value;
    const out = priceHistoryPage.querySelector("[data-monitoring-convert-out]");
    if (out) out.innerHTML = converterOutputHtml();
  });

  priceHistoryPage?.addEventListener("toggle", (event) => {
    if (!event.target.matches?.("[data-monitoring-settings]")) return;
    monitoringPrefs.settingsOpen = event.target.open;
    saveMonitoringPrefs();
    // Folded by its title: the search's filters are kept as with "Gotowe".
    if (!event.target.open) {
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (saveMonitoringFilters(entry)) {
        Object.assign(monitoringState, { status: copy().monitoringFiltersSaved, statusError: false });
        renderPriceHistoryPage();
      }
    }
  }, true);

  priceHistoryPage?.addEventListener("change", (event) => {
    const sort = event.target.closest("[data-monitoring-sort]");
    if (sort) {
      monitoringPrefs.sort = sort.value;
      // Newest first and the youngest first read naturally; price and
      // mileage from the lowest.
      monitoringPrefs.dir = sort.value === "listed" || sort.value === "year" ? "desc" : "asc";
      saveMonitoringPrefs();
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    // Result filters of the car (settings, owner 2026-10-10): stored with
    // the car, every number below follows them at once.
    const resultFilter = event.target.closest("[data-monitoring-result-filter]");
    if (resultFilter && ctx.priceHistoryId) {
      setMonitoringScope(ctx.priceHistoryId, { only: { ...resultFiltersOf(ctx.priceHistoryId), [resultFilter.dataset.monitoringResultFilter]: resultFilter.checked } });
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) {
        const summary = document.querySelector(".mobileMonitoringSummary");
        if (summary) summary.innerHTML = monitoringSelectionSummary(entry);
        fillMonitoringResults(entry);
        if (monitoringState.tab === "history") fillMonitoringHistory(entry);
      }
      return;
    }
    const budgetField = event.target.closest("[data-monitoring-budget]");
    if (budgetField && ctx.priceHistoryId) {
      const budget = monitoringScopeOf(ctx.priceHistoryId).budget || {};
      const value = Number(String(budgetField.value).replace(/[^\d]/g, "")) || null;
      setMonitoringScope(ctx.priceHistoryId, { budget: { ...budget, [budgetField.dataset.monitoringBudget]: value } });
      // The border in the portals' currencies is fixed now, at today's rate.
      const budgetEntry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (budgetEntry) budgetLockOf(budgetEntry, { manual: true });
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    const portalPrices = event.target.closest("[data-monitoring-portal-prices]");
    if (portalPrices) {
      monitoringPrefs.portalPrices = portalPrices.checked;
      saveMonitoringPrefs();
      renderPriceHistoryPage();
      return;
    }
    // Page 1's "Więcej filtrów" in the settings: the form hears its fields.
    if (event.target.closest("[data-monitoring-more-filters]")) {
      document.querySelector(".mobileManualForm")?.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const tolerance = event.target.closest("[data-monitoring-tolerance]");
    if (tolerance && ctx.priceHistoryId) {
      setMonitoringScope(ctx.priceHistoryId, { tolerance: Number(tolerance.value) });
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    const monitoringSwitch = event.target.closest("[data-monitoring-switch]");
    if (monitoringSwitch) {
      // The schedule stays with the car when monitoring is switched off.
      const entry = ctx.marketHistory.find((item) => item.id === monitoringSwitch.dataset.monitoringSwitch);
      setAutoRefresh(monitoringSwitch.dataset.monitoringSwitch, { ...monitoringSchedule(entry), enabled: monitoringSwitch.checked });
      if (monitoringSwitch.checked) runDueMonitoring();
      return;
    }
    const every = event.target.closest("[data-monitoring-every]");
    const time = event.target.closest("[data-monitoring-time]");
    if ((every || time) && ctx.priceHistoryId) {
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (!entry) return;
      const schedule = monitoringSchedule(entry);
      setAutoRefresh(ctx.priceHistoryId, { ...schedule, ...(every ? { every: every.value } : { time: time.value }), enabled: Boolean(entry.autoRefresh?.enabled) });
      return;
    }
    const price = event.target.closest("[data-monitoring-price]");
    if (price && ctx.priceHistoryId) {
      window.AUTOGOOD_FAVORITES_WATCH?.setPortalPrice?.(ctx.priceHistoryId, price.dataset.monitoringPrice, price.dataset.side, price.value);
      scheduleLocalSync();
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    const currency = event.target.closest("[data-monitoring-convert-currency]");
    if (currency) {
      converterState.currency = currency.value;
      const out = priceHistoryPage.querySelector("[data-monitoring-convert-out]");
      if (out) out.innerHTML = converterOutputHtml();
      return;
    }
    const compare = event.target.closest("[data-offer-compare]");
    if (compare) {
      offerHistoryState.compareAt = compare.value;
      redrawOfferHistory();
      return;
    }
  });

  priceHistoryPage?.addEventListener("click", (event) => {
    if (event.target.closest("[data-monitoring-sort-dir]")) {
      monitoringPrefs.dir = monitoringPrefs.dir === "desc" ? "asc" : "desc";
      saveMonitoringPrefs();
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const pdf = event.target.closest("[data-monitoring-pdf]");
    if (pdf) {
      downloadClientPdf(pdf);
      return;
    }
    const check = event.target.closest("[data-monitoring-check]");
    if (check) {
      const entry = ctx.marketHistory.find((item) => item.id === check.dataset.monitoringCheck);
      if (entry) runMonitoringCheck(entry);
      return;
    }
    // The car's countries and portals (owner 2026-10-05, as on pages 1-2).
    const group = event.target.closest("[data-monitoring-group]");
    const row = event.target.closest("[data-monitoring-row]");
    if ((group || row) && ctx.priceHistoryId) {
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (!entry) return;
      const selection = monitoringSelection(entry);
      const [key, rowKey] = row ? row.dataset.monitoringRow.split(":") : [group.dataset.monitoringGroup, ""];
      const next = row ? selectionWithRow(selection, key, rowKey) : selectionWithGroup(selection, key);
      if (!next) return;
      setMonitoringScope(ctx.priceHistoryId, { markets: next.markets, countries: next.countries });
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    const country = event.target.closest("[data-monitoring-country]");
    if (country && ctx.priceHistoryId) {
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (!entry) return;
      const selection = monitoringSelection(entry);
      const code = country.dataset.monitoringCountry;
      const next = selection.countries.includes(code) ? selection.countries.filter((item) => item !== code) : [...selection.countries, code];
      // Germany itself stays while its column is on.
      if (!germanCountries(next).length) return;
      setMonitoringScope(ctx.priceHistoryId, { markets: selection.markets, countries: next });
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    // "Gotowe": the search's filters saved, the settings fold, the results
    // come first again.
    if (event.target.closest("[data-monitoring-settings-done]")) {
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      monitoringPrefs.settingsOpen = false;
      saveMonitoringPrefs();
      const saved = saveMonitoringFilters(entry);
      if (saved) Object.assign(monitoringState, { status: copy().monitoringFiltersSaved, statusError: false });
      renderPriceHistoryPage();
      priceHistoryPage.querySelector(".mobileMonitoringResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // The budget checked by hand: the calculator with the numbers it was
    // turned into (Germany: the car price, its tariff, the filters' excise).
    if (event.target.closest("[data-monitoring-budget-calc]") && ctx.priceHistoryId) {
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (!entry) return;
      const budget = monitoringScopeOf(entry.id).budget;
      const tariff = typeof estimateDeliveryInspection === "function" ? estimateDeliveryInspection(entry.filters.body || "", { country: "DE" }) : { transport: 2500, inspection: 1300 };
      window.AUTOGOOD_CALC_POPUP?.openValues({
        title: `${monitoringTitle(entry)} · ${copy().monitoringBudgetShort}${budget?.to ? ` ${numberFormat().format(budget.to)} zł` : ""}`,
        // The fixed border mobile.de is searched with; the calculator counts
        // it at today's rate.
        gross: budget?.to ? budgetLockOf(entry)?.prices?.mobile?.to || budgetCarPrice("mobile", budget.to, entry.filters) : 0,
        engine: budgetEngineClass(entry.filters),
        transport: tariff.transport,
        inspection: tariff.inspection,
      });
      return;
    }
    // Connect this Mac's service (Chrome asks once for local access).
    if (event.target.closest("[data-monitoring-connect]")) {
      saveLocalMonitoring({ enabled: true });
      Object.assign(monitoringState, { status: copy().monitoringMacConnecting, statusError: false });
      renderPriceHistoryPage();
      syncLocalMonitoring({ patient: true }).then(() => {
        Object.assign(monitoringState, localMonitoring.available
          ? { status: copy().monitoringMacConnected, statusError: false }
          : { status: copy().monitoringMacFailed, statusError: true });
        renderPriceHistoryPage();
      });
      return;
    }
    const portal = event.target.closest("[data-monitoring-portal]");
    if (portal) {
      monitoringState.limit = 100;
      monitoringState.portal = monitoringState.portal === portal.dataset.monitoringPortal ? "" : portal.dataset.monitoringPortal;
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    // "Oblicz na gotowo" (B42): the calculators for this offer, in a window.
    const calculate = event.target.closest("[data-monitoring-calc]");
    if (calculate) {
      const row = rowsForDetails.get(calculate.dataset.monitoringCalc);
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (row) window.AUTOGOOD_CALC_POPUP?.open({ ...row.offer, source: row.source, filters: entry?.filters || {} });
      return;
    }
    const save = event.target.closest("[data-monitoring-save]");
    if (save && ctx.priceHistoryId) {
      const row = rowsForDetails.get(save.dataset.monitoringSave);
      if (row) toggleSavedCar(ctx.priceHistoryId, row.source, row.offer);
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const detailsButton = event.target.closest("[data-monitoring-details]");
    if (detailsButton) {
      const key = detailsButton.dataset.monitoringDetails;
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (openDetails.has(key)) openDetails.delete(key);
      else {
        openDetails.add(key);
        const row = rowsForDetails.get(key);
        if (row && !offerDetails.has(key)) loadOfferDetails(row.source, row.offer).then(() => entry && fillMonitoringResults(entry));
      }
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const more = event.target.closest("[data-monitoring-more]");
    if (more) {
      const key = more.dataset.monitoringMore;
      if (allOptionsShown.has(key)) allOptionsShown.delete(key);
      else allOptionsShown.add(key);
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const countryFilter = event.target.closest("[data-monitoring-country-filter]");
    if (countryFilter) {
      const key = countryFilter.dataset.monitoringCountryFilter;
      Object.assign(monitoringState, { country: monitoringState.country === key ? "" : key, portal: "", limit: 100 });
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) {
        fillMonitoringResults(entry);
        // The price history follows the country picked.
        if (monitoringState.tab === "history") fillMonitoringHistory(entry);
      }
      return;
    }
    if (event.target.closest("[data-monitoring-page-more]")) {
      monitoringState.limit += 100;
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const tabButton = event.target.closest("[data-monitoring-tab]");
    if (tabButton) {
      monitoringState.tab = tabButton.dataset.monitoringTab;
      applyMonitoringTab(ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId) || null);
      return;
    }
    const view = event.target.closest("[data-monitoring-view]");
    if (view) {
      monitoringState.limit = 100;
      monitoringState.view = view.dataset.monitoringView;
      monitoringState.autoView = false;
      const entry = ctx.marketHistory.find((item) => item.id === ctx.priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    if (event.target.closest("[data-monitoring-extended]")) {
      monitoringExtended = !monitoringExtended;
      try {
        localStorage.setItem("autogood.mobile.monitoringExtended", monitoringExtended ? "1" : "0");
      } catch {
        // Remembered for this page only.
      }
      renderPriceHistoryPage();
      return;
    }
    // The search, in one line: edited on page 1.
    if (event.target.closest("[data-monitoring-edit]")) {
      showPage("search");
      return;
    }
    const date = event.target.closest("[data-offer-date]");
    if (date) {
      // A date in the history tables or the strip: the market of that day.
      offerHistoryState.at = date.dataset.offerDate;
      // Compared again with the check just before it.
      offerHistoryState.compareAt = null;
      // On page 3 the day's market is its own tab.
      if (date.closest("[data-mobile-price-history-page]")) {
        monitoringState.tab = "market";
        applyMonitoringTab(null);
      }
      redrawOfferHistory(Boolean(date.closest("table")));
      return;
    }
    const filter = event.target.closest("[data-offer-filter]");
    if (filter) {
      offerHistoryState.filter = filter.dataset.offerFilter;
      redrawOfferHistory();
      return;
    }
    const open = event.target.closest("[data-price-history-open]");
    if (open) {
      openFavorite(open.dataset.priceHistoryOpen);
      return;
    }
    const refresh = event.target.closest("[data-price-history-refresh]");
    if (refresh) {
      // Fresh prices = a new check in this history (the analysis opens).
      const entry = ctx.marketHistory.find((item) => item.id === refresh.dataset.priceHistoryRefresh);
      if (!entry) return;
      if (entry.listings.length >= 3) {
        openHistoryAnalysis(entry.id);
        refreshActiveAnalysis();
      } else {
        openFavorite(entry.id);
      }
    }
  });

  return {
    NEGOTIATION_DAYS, clientPricePln, daysSince, daysText, isBaseChange, monitoringSelection,
    monitoringState, offerFitsSearch, parkMoreFilters, priceBands, pricesMarkFor,
    renderPriceHistoryPage, shortDate, withinBothBands
  };
};
