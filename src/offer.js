/* AUTOGOOD "Oferta dla klienta" (B71, owner 2026-10-05) — oferta.html.
 *
 * The offer made from a Monitoring ad ("Przygotuj ofertę", offer-link.js):
 * two A4 sheets for the client — the photo first; the car, its price "na
 * gotowo" and where it stands on the market; the verdict with its reasons; the
 * strongest equipment; the seller; then what the price is made of, the room
 * to negotiate, how the purchase goes and who to call. Everything the client
 * reads can be changed or hidden by the manager before the PDF.
 *
 * Data: the draft (IndexedDB autogood-offers, offer-store.js) made on page 3
 * with the market of that day; the ad read here once (offer-ad.js) for the
 * photos, equipment, seller and the words of the description; the verdict by
 * rules (offer-verdict.js). Edits and hidden parts are kept with the offer.
 * Rules for every client text: docs/OFFER-PAGE.md §4.
 */
(() => {
  const store = window.AUTOGOOD_OFFER_STORE;
  const AD = window.AUTOGOOD_OFFER_AD;
  const EQUIPMENT = window.AUTOGOOD_OFFER_EQUIPMENT;
  const VERDICT = window.AUTOGOOD_OFFER_VERDICT;
  const TURNKEY = window.AUTOGOOD_TURNKEY;
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get("id") || "";
  const stage = document.querySelector("[data-offer-stage]");
  const panel = document.querySelector("[data-offer-panel]");
  const statusLine = document.querySelector("[data-offer-status]");
  const heading = document.querySelector("[data-offer-heading]");
  const editButton = document.querySelector("[data-offer-edit]");
  const pdfButton = document.querySelector("[data-offer-pdf]");
  const copyButton = document.querySelector("[data-offer-copy]");
  const PAGE_W = 794;
  const PAGE_H = 1123;
  let offer = null;
  let editing = false;
  let reading = false;

  // ---- Words and numbers -------------------------------------------------------
  const numbers = new Intl.NumberFormat("pl-PL");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const SYMBOL = { EUR: "€", PLN: "zł", SEK: "kr", USD: "$" };
  const money = (value, currency = "PLN") => (Number(value) > 0 ? `${numbers.format(Math.round(Number(value)))} ${SYMBOL[currency] || currency}` : "—");
  const kmText = (value) => (Number(value) > 0 ? `${numbers.format(Math.round(Number(value)))} km` : "");
  const thousands = (value) => numbers.format(Math.round(Number(value) / 1000));
  const percent = (share) => `${Math.round(Math.abs(share) * 100)}%`;
  const dateText = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  };
  const timeText = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const daysWord = (days) => (days === 1 ? "dzień" : "dni");
  const COUNTRY = { DE: "Niemcy", NL: "Holandia", BE: "Belgia", AT: "Austria", LU: "Luksemburg", FR: "Francja", IT: "Włochy", ES: "Hiszpania", CZ: "Czechy", SK: "Słowacja", SE: "Szwecja", DK: "Dania", CH: "Szwajcaria", PL: "Polska", SI: "Słowenia", HU: "Węgry", PT: "Portugalia" };
  const COUNTRY_IN = { DE: "w Niemczech", NL: "w Holandii", BE: "w Belgii", AT: "w Austrii", LU: "w Luksemburgu", FR: "we Francji", IT: "we Włoszech", ES: "w Hiszpanii", CZ: "w Czechach", SE: "w Szwecji", DK: "w Danii" };
  const PORTAL = { mobile: "mobile.de", autoscout: "AutoScout24", kleinanzeigen: "Kleinanzeigen", autoscoutfr: "AutoScout24 FR", marktplaats: "Marktplaats", dehands: "2dehands", otomoto: "otomoto", blocket: "Blocket" };
  const SALUTATION = { Pan: { owner: "Pana", you: "Pan" }, Pani: { owner: "Pani", you: "Pani" }, "Państwo": { owner: "Państwa", you: "Państwo" } };

  // ---- Icons (inline, so the PDF needs no font) --------------------------------
  const ICON = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    warn: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    risk: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.3 2.3 4.2-4.4"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-6"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z" fill="currentColor" stroke="none"/>',
    store: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M9.5 20v-5.5h5V20"/>',
    list: '<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4 7l1.2 1.2L7.5 6M4 12l1.2 1.2L7.5 11M4 17l1.2 1.2L7.5 16"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
    percent: '<circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/><path d="M18.5 5.5l-13 13"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h7"/>',
    phone: '<path d="M5 4h3.5l2 5-2.4 1.5a11 11 0 005.4 5.4L15 13.5l5 2V19a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11.5a6.5 6.5 0 0113 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/>',
    link: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    down: '<path d="M7 7l10 10"/><path d="M17 9v8H9"/>',
    car: '<path d="M4 15.5V12l2-5h12l2 5v3.5"/><path d="M3 15.5h18v2.5H3z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ""}</svg>`;

  // ---- Status line ---------------------------------------------------------------
  function setStatus(text, isError = false) {
    if (!statusLine) return;
    statusLine.textContent = text || "";
    statusLine.classList.toggle("isError", Boolean(isError));
  }

  // ---- The offer as the client reads it ------------------------------------------
  const edits = () => offer?.edits || {};
  const hidden = () => new Set(offer?.hidden || []);
  const isHidden = (key) => hidden().has(key);

  function field(key, fallback, tag = "span", className = "") {
    const value = Object.prototype.hasOwnProperty.call(edits(), key) ? edits()[key] : fallback;
    const classes = [className, Object.prototype.hasOwnProperty.call(edits(), key) ? "isEdited" : ""].filter(Boolean).join(" ");
    return `<${tag}${classes ? ` class="${classes}"` : ""} data-edit="${esc(key)}"${editing ? ' contenteditable="true" spellcheck="true"' : ""}>${esc(value)}</${tag}>`;
  }
  const hideToggle = (key) => `<button class="ofHideToggle" type="button" data-hide="${esc(key)}" data-offer-hide>${isHidden(key) ? "Pokaż" : "Ukryj"}</button>`;
  const blockClass = (key) => (isHidden(key) ? " ofBlockHidden" : "");

  // A dealer's name of an ad without its keyword list:
  // "Toyota C-HR 2.0 Hybrid Team D Navi Alarm SHZ Totwinkel" → "Toyota C-HR 2.0 Hybrid Team D",
  // "Toyota C-HR 2,0-l Hybrid Team D*Allwetter"Carplay"R-Kam" → "Toyota C-HR 2,0-l Hybrid Team D".
  const TITLE_NOISE = /^(navi|navigation|alarm|shz|sitzhzg|sitzheizung|totwinkel|kamera|cam|r-?kam|rfk|acc|led|bi-?led|full-?led|matrix|xenon|ahk|pdc|klima|klimaautomatik|carplay|android|apple|garantie|scheckheft|mwst|netto|brutto|vat|tüv|hu|neu|top|voll|euro\s?\d|allwetter|winter|alu|lm|panorama|pano|leder|teilleder|keyless|virtual|cockpit|head-?up|hud|dab|tempomat|lane|assist|spur|sport-?paket|1\.?\s?hand|unfallfrei|scheckheftgepflegt|finanzierung|leasing|sofort|lieferbar)$/i;
  function cleanTitle(title) {
    const text = String(title || "").replace(/\s+/g, " ").trim();
    const first = (text.split(/\s*[*+|"!#•,;/]+\s*|\s{2,}|\s+-\s+(?=[A-ZÄÖÜ])/)[0] || text).trim();
    const words = first.split(" ");
    const kept = [];
    for (const word of words) {
      if (kept.length >= 3 && TITLE_NOISE.test(word.replace(/[.:()]/g, ""))) break;
      kept.push(word);
      if (kept.length >= 8) break;
    }
    const result = kept.join(" ").replace(/[.,;:\s-]+$/, "");
    return (result.length >= 8 ? result : text).slice(0, 70);
  }
  // Polish plural: 1 opinia, 2–4 opinie (not 12–14), 5+ opinii.
  function plural(count, one, few, many) {
    const n = Math.abs(Math.round(Number(count) || 0));
    if (n === 1) return one;
    const last = n % 10;
    const lastTwo = n % 100;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
  }
  const withFirm = (name) => (!name ? "" : /autogood/i.test(name) ? name : `${name} z AUTOGOOD`);
  const fuelShort = (fuel) => String(fuel || "").replace(/\s*\(.*\)$/, "");

  function carView() {
    const car = offer.car || {};
    const ad = offer.ad || null;
    const specs = ad?.specs || {};
    const filters = offer.filters || {};
    const powerHp = specs.powerHp || Number(String(car.power || "").match(/(\d+)\s*KM/)?.[1]) || 0;
    const powerKw = specs.powerKw || (powerHp ? Math.round(powerHp / 1.35962) : 0);
    const ccm = specs.ccm || Number(car.ccm) || 0;
    const fuel = specs.fuel || AD?.fuelPl(car.fuel) || "";
    const gearbox = specs.gearbox || "";
    const reg = specs.firstRegistration || car.reg || (car.year ? String(car.year) : "");
    const year = String(reg).match(/(\d{4})/)?.[1] || car.year || "";
    const country = ad?.seller?.country || car.country || "";
    const city = ad?.seller?.city || car.city || "";
    return {
      brand: filters.brand || "",
      model: filters.model || "",
      title: cleanTitle(ad?.title || car.title),
      year,
      reg,
      mileage: specs.mileage || Number(car.mileage) || 0,
      ccm,
      fuel,
      gearbox,
      drive: specs.drive || "",
      body: specs.body || AD?.bodyPl(car.body) || "",
      color: specs.color || "",
      interior: specs.interior || "",
      owners: specs.owners,
      hu: specs.hu || "",
      powerHp,
      powerKw,
      country,
      city,
      price: Number(car.price) || 0,
      currency: car.currency || "EUR",
      priceType: car.priceType || "",
      netPrice: Number(car.netPrice) || Number(ad?.vat?.net) || 0,
      vatRate: Number(ad?.vat?.rate) || 0,
      seller: ad?.seller?.type || car.seller || "",
      // Only a web address is ever a link in the offer.
      url: /^https:\/\//.test(offer.url || car.url || "") ? offer.url || car.url : "",
      images: ad?.images || [],
    };
  }

  function vatText(view) {
    if (view.priceType === "vat" || offer.ad?.vat?.deductible) {
      const rate = view.vatRate ? ` ${view.vatRate}%` : "";
      return `brutto · faktura VAT${rate}${view.netPrice ? ` (netto ${money(view.netPrice, view.currency)})` : ""}`;
    }
    if (view.priceType === "margin") return "brutto · faktura VAT marża";
    if (view.priceType === "private" || view.seller === "private") return "osoba prywatna (bez faktury VAT)";
    return "brutto";
  }

  // The cost lines: the calculator's (wave 3) or the estimate made with the draft.
  function costs() {
    const calc = offer.calc;
    if (calc?.rows?.length) return { method: calc.methodLabel, rows: calc.rows, total: calc.total, note: calc.note || "", exact: true };
    const estimate = offer.estimate;
    if (!estimate) return null;
    const engineLabel = ["elektryczny / plug-in do 2,0 l", "hybryda / plug-in powyżej 2,0 l", "hybryda do 2,0 l", "silnik do 2,0 l", "silnik powyżej 2,0 l"][estimate.engine?.index ?? 3];
    const rate = Number(estimate.rate || 0).toFixed(2).replace(".", ",");
    const parts = estimate.parts || {};
    const rows = [
      { label: "Cena auta", sub: `${money(estimate.carBruttoEur, "EUR")} brutto × ${rate} zł`, value: parts.car },
      { label: "Transport do Polski", sub: "laweta, ubezpieczony", value: parts.transport },
      { label: "Oględziny przed zakupem", sub: "rzeczoznawca u sprzedawcy", value: parts.inspection },
      { label: `Akcyza ${String(Math.round((estimate.engine?.rate ?? 0.031) * 10000) / 100).replace(".", ",")}%`, sub: engineLabel, value: parts.excise },
      { label: "Usługa AUTOGOOD", sub: "1 829,27 zł + 1% ceny auta, netto + VAT", value: parts.commission },
      { label: "Tłumaczenia i przegląd techniczny", sub: "250 zł + 150 zł", value: parts.fees },
    ];
    return { method: "Zakup bezpośredni", rows, total: estimate.total, note: `Szacunek kalkulatora AUTOGOOD, kurs EUR ${rate} zł z dnia oferty.`, exact: false };
  }

  function marketView(view) {
    const own = offer.market?.own || null;
    if (!own?.stats) return null;
    const near = own.similar?.stats?.count >= 6 ? own.similar : null;
    const stats = near ? near.stats : own.stats;
    const dearer = near ? near.dearerShare : own.dearerShare;
    const where = own.scope === "country" && COUNTRY_IN[own.country] ? COUNTRY_IN[own.country] : "w Europie (kraje z wyszukiwania)";
    const rule = near?.rule;
    const ruleText = rule ? [rule.yearFrom ? `rok ${rule.yearFrom}–${rule.yearTo}` : "", rule.kmTo ? `przebieg ${thousands(rule.kmFrom)}–${thousands(rule.kmTo)} tys. km` : ""].filter(Boolean).join(", ") : "";
    const cheaperShare = dearer ?? 0;
    const lead = cheaperShare >= 0.5
      ? `Tańsze niż ${percent(cheaperShare)} z ${numbers.format(stats.count)} ${near ? "podobnych ofert" : "ofert o tych parametrach"} ${where}${ruleText ? ` (${ruleText})` : ""}.`
      : `Cena w ${cheaperShare >= 0.25 ? "środku" : "górnej części"} rynku: ${numbers.format(stats.count)} ${near ? "podobnych ofert" : "ofert"} ${where}${ruleText ? ` (${ruleText})` : ""}.`;
    const lo = Math.min(stats.p25 - (stats.p75 - stats.p25) * 0.9, view.price) * 0.99;
    const hi = Math.max(stats.p75 + (stats.p75 - stats.p25) * 0.9, view.price) * 1.01;
    const at = (value) => Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
    const vsMedian = stats.median ? view.price / stats.median - 1 : 0;
    return { stats, near, lead, at, vsMedian, where, share: cheaperShare, count: stats.count, typical: `Połowa ofert kosztuje ${money(stats.p25, own.currency)}–${money(stats.p75, own.currency)}.`, currency: own.currency };
  }

  function polandView() {
    const poland = offer.market?.poland;
    if (!poland?.basis?.median) return null;
    const total = costs()?.total || poland.turnkey;
    const saving = total ? Math.round(poland.basis.median - total) : null;
    const rule = poland.similar?.rule;
    const ruleText = poland.basis.kind === "similar" && rule ? [rule.yearFrom ? `rok ${rule.yearFrom}–${rule.yearTo}` : "", rule.kmTo ? `do ${thousands(rule.kmTo)} tys. km` : ""].filter(Boolean).join(", ") : "";
    return {
      median: poland.basis.median,
      count: poland.basis.count,
      saving,
      line: `W Polsce takie auto: mediana ${money(poland.basis.median, "PLN")} (otomoto, ${numbers.format(poland.basis.count)} ${plural(poland.basis.count, "oferta", "oferty", "ofert")}${ruleText ? `, ${ruleText}` : ""}).`,
    };
  }

  // Two looks of the sheets (owner chooses, docs/OFFER-PAGE.md §0 wave 5):
  // "light" — white, thin rules, framed cards; "premium" — the photo across the
  // page, the price on a navy plate, quiet gold accents, cards without frames.
  const STYLE_KEY = "autogood.offer.style.v1";
  const STYLES = [
    ["light", "Jasny", "zdjęcie obok ceny, karty w ramkach"],
    ["premium", "Premium", "zdjęcie na całą szerokość, cena na granatowej plakietce"],
    ["magazyn", "Magazyn", "kremowa kolumna z ceną i danymi, tytuły szeryfowe"],
    ["raport", "Raport", "liczby na górze, rynek na całą szerokość"],
    ["noc", "Noc", "ciemny nagłówek z ceną, zdjęcie pod nim"],
  ];
  function preferredStyle() {
    try {
      return localStorage.getItem(STYLE_KEY) || "premium";
    } catch {
      return "premium";
    }
  }
  const currentStyle = () => (STYLES.some(([key]) => key === offer?.style) ? offer.style : preferredStyle());
  const styleClass = () => ({ premium: " isPremium isGrid", magazyn: " isMagazyn isGrid", raport: " isRaport isGrid", noc: " isNoc isGrid" })[currentStyle()] || "";

  // A car dearer than its Polish peers: the line stays off unless the manager
  // shows it ("shown" overrides, "hidden" hides in any case).
  function polandHidden(poland) {
    if (isHidden("poland")) return true;
    if ((offer.shown || []).includes("poland")) return false;
    return poland?.saving !== null && poland?.saving < 0;
  }

  // ---- Sheets ------------------------------------------------------------------------
  function headHtml(page, view) {
    const client = offer.client || {};
    const forWhom = client.name ? `Przygotowano dla: <b>${esc(client.name)}</b><br>` : "";
    return `
      <header class="ofHead">
        <img class="ofLogo" src="./assets/autogood-logo.png" alt="AUTOGOOD" />
        <span class="ofLogoText" aria-hidden="true"><img src="./assets/ag-opt.svg" alt="" /><span>AUTOGOOD</span></span>
        <div class="ofHeadMeta">
          ${forWhom}Oferta nr <b>${esc(offer.number || "")}</b> · ${esc(dateText(offer.createdAt))}<br>
          <span class="ofPageNo">${page === 1 ? esc(view.title) : `${esc(view.title)} · strona 2 z 2`}</span>
        </div>
      </header>`;
  }

  // Three figures beside the price ("Raport"): against the median, the share
  // of dearer offers or the saving against Poland, the verdict.
  function kpiHtml(market, poland, verdict) {
    const tiles = [];
    if (market) {
      tiles.push({ label: "Na tle rynku", value: `${market.vsMedian <= 0 ? "−" : "+"}${percent(market.vsMedian)}`, note: "od mediany podobnych ofert", tone: market.vsMedian <= -0.03 ? "isGood" : market.vsMedian > 0.05 ? "isWarn" : "" });
      if (poland?.saving >= 1000 && !polandHidden(poland)) tiles.push({ label: "Taniej niż w Polsce", value: `ok. ${money(Math.round(poland.saving / 500) * 500, "PLN")}`, note: `mediana otomoto ${money(poland.median, "PLN")}`, tone: "isGood" });
      else tiles.push({ label: "Tańsze niż", value: percent(market.share || 0), note: `z ${numbers.format(market.count)} ofert`, tone: (market.share || 0) >= 0.5 ? "isGood" : "" });
    }
    if (verdict) tiles.push({ label: "Ocena AUTOGOOD", value: { ok: "Polecamy", check: "Do weryfikacji", risk: "Odradzamy" }[verdict.level], note: (() => {
      const good = verdict.all.filter((line) => line.level === "ok").length;
      const check = verdict.all.filter((line) => line.level === "warn" || line.level === "risk").length;
      return `${good} ${plural(good, "mocna strona", "mocne strony", "mocnych stron")} · ${check} do sprawdzenia`;
    })(), tone: verdict.level === "ok" ? "isGood" : verdict.level === "check" ? "isWarn" : "isRisk" });
    if (!tiles.length) return "";
    return `<div class="ofKpis">${tiles.map((tile) => `<div class="ofKpi ${tile.tone}"><span>${esc(tile.label)}</span><b>${esc(tile.value)}</b><small>${esc(tile.note)}</small></div>`).join("")}</div>`;
  }

  // The manager's framing of the photo: a zoom (dealers often frame their
  // first photo with a banner) and the side kept in view.
  const ZOOMS = [["1", "Całe zdjęcie"], ["1.15", "Przybliż 15%"], ["1.3", "Przybliż 30%"], ["1.45", "Przybliż 45%"]];
  const FOCUS = [["center", "Środek"], ["left", "Lewa strona"], ["right", "Prawa strona"], ["top", "Góra"], ["bottom", "Dół"]];
  function photoFrame() {
    const zoom = Number(offer.photoZoom) || 1;
    const focus = FOCUS.some(([key]) => key === offer.photoFocus) ? offer.photoFocus : "center";
    if (zoom === 1 && focus === "center") return "";
    return ` style="object-position:${focus};transform:scale(${zoom});transform-origin:${focus}"`;
  }

  function sheetOne(view) {
    const market = marketView(view);
    const poland = polandView();
    const costView = costs();
    const verdict = verdictView(view);
    const keyOptions = EQUIPMENT ? EQUIPMENT.keyOptions(offer.ad?.features || [], 8) : [];
    const allOptions = EQUIPMENT ? EQUIPMENT.list(offer.ad?.features || []) : [];
    const salutation = SALUTATION[offer.client?.salutation] || SALUTATION.Pan;
    const manager = store.manager(offer.manager);
    const photo = edits().photo || view.images[0] || "";
    const chips = [];
    if (market && market.vsMedian <= -0.03) chips.push(`<span class="ofChip isGood">${icon("down")}${percent(market.vsMedian)} poniżej mediany rynku</span>`);
    if (poland?.saving >= 1000) chips.push(`<span class="ofChip isGood">ok. ${money(Math.round(poland.saving / 500) * 500, "PLN")} taniej niż w Polsce</span>`);
    if (offer.ad?.portalPrice?.label && /dobra|uczciwa/.test(offer.ad.portalPrice.label)) chips.push(`<span class="ofChip">${esc(offer.ad.portalPrice.portal)}: ${esc(offer.ad.portalPrice.label)}</span>`);
    const subtitle = [view.reg, kmText(view.mileage), view.powerHp ? `${view.powerHp} KM` : "", view.gearbox, view.fuel].filter(Boolean).join(" · ");
    const specs = [
      ["1. rejestracja", view.reg],
      ["Przebieg", kmText(view.mileage)],
      ["Silnik", [view.ccm ? `${String((Math.round(view.ccm / 100) / 10).toFixed(1)).replace(".", ",")} l` : "", fuelShort(view.fuel)].filter(Boolean).join(" · ")],
      ["Moc", view.powerHp ? `${view.powerHp} KM (${view.powerKw} kW)` : ""],
      ["Skrzynia biegów", view.gearbox],
      ["Napęd", view.drive],
      ["Kolor", view.color],
      ["Właściciele", view.owners === 0 ? "brak (auto nowe)" : view.owners ? String(view.owners) : ""],
      ["Nadwozie", view.body],
      ["Przegląd", view.hu],
      ["Wnętrze", view.interior],
      ["Lokalizacja", [view.city, COUNTRY[view.country] || view.country].filter(Boolean).join(", ")],
    ].filter(([, value]) => value).slice(0, 8);
    const seller = offer.ad?.seller || null;
    const adAge = offer.market?.ad || null;
    const listedAt = offer.ad?.listedAt || "";
    const listedDays = listedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(listedAt)) / 86400000)) : adAge?.days ?? null;
    const sellerFacts = [];
    if (seller?.rating?.reviews) sellerFacts.push(`<span class="ofStars">${icon("star")}${esc(Number(seller.rating.score).toFixed(1).replace(".", ","))}</span> · ${numbers.format(seller.rating.reviews)} ${plural(seller.rating.reviews, "opinia", "opinie", "opinii")}${seller.rating.recommend !== null && seller.rating.recommend !== undefined ? ` · ${seller.rating.recommend}% poleca` : ""}`);
    const sinceYear = seller?.since ? String(seller.since).slice(0, 4) : "";
    if (sinceYear) sellerFacts.push(`na ${esc(seller.rating?.portal || PORTAL[offer.source] || "portalu")} od <b>${esc(sinceYear)}</b>`);
    if (seller?.stock) sellerFacts.push(`<b>${numbers.format(seller.stock)}</b> ${plural(seller.stock, "auto", "auta", "aut")} w ofercie`);
    const sellerName = seller?.name || (view.seller === "private" ? "Osoba prywatna" : view.seller === "dealer" ? "Dealer" : "");
    const adAgeText = listedDays !== null
      ? `To auto: <b>${numbers.format(listedDays)} ${daysWord(listedDays)}</b> w sprzedaży${!listedAt && adAge?.kind === "atLeast" ? " (co najmniej)" : ""}${adAge?.dropped ? `, cena obniżona ${adAge.drops}× (−${percent(adAge.share)})` : ""}.`
      : "";
    return `
      <div class="ofSheet" data-sheet="1">
        <article class="ofPage${styleClass()}" data-page="1">
          ${headHtml(1, view)}
          <section class="ofHero">
            <div class="ofPhotoColumn">
              <figure class="ofPhoto">
                ${photo ? `<img src="${esc(photo)}" alt="${esc(view.title)}" crossorigin="anonymous"${photoFrame()} />` : `<div class="ofPhotoEmpty">${icon("car")}<span>${reading ? "Wczytuję zdjęcie z ogłoszenia…" : "Zdjęcie z ogłoszenia pojawi się po wczytaniu danych"}</span></div>`}
                ${view.images.length > 1 ? `<span class="ofPhotoCount">${view.images.length} ${plural(view.images.length, "zdjęcie", "zdjęcia", "zdjęć")} w ogłoszeniu</span>` : ""}
              </figure>
              ${view.url ? `<a class="ofAdLink" href="${esc(view.url)}" target="_blank" rel="noopener">${icon("link")}<span>Ogłoszenie na ${esc(PORTAL[offer.source] || "portalu")}<small>${esc([view.city, COUNTRY[view.country] || view.country].filter(Boolean).join(", "))}</small></span></a>` : ""}
            </div>
            <div class="ofHeroInfo">
              <div class="ofHeroTitle">
                <p class="ofKicker">${esc([view.brand, view.model, view.year].filter(Boolean).join(" · "))}</p>
                ${field("title", view.title, "h1", "ofTitle")}
                ${field("subtitle", subtitle, "p", "ofSub")}
              </div>
              <div class="ofPriceBox">
                <p class="ofLabel">Cena na gotowo w Polsce</p>
                <p class="ofPrice">${esc(money(costView?.total, "PLN"))}</p>
                ${field(costView?.exact ? "priceNoteExact" : "priceNote", costView?.exact ? `${costView.method}: transport, oględziny, akcyza, opłaty i usługa AUTOGOOD — wyliczenie na str. 2` : "Szacunek: transport, oględziny, akcyza, opłaty i usługa AUTOGOOD — str. 2", "p", "ofPriceNote")}
                <p class="ofAdPrice">W ogłoszeniu: <b>${esc(money(view.price, view.currency))}</b> ${esc(vatText(view))}</p>
              </div>
              ${chips.length ? `<div class="ofChips${blockClass("chips")}">${chips.join("")}</div>` : ""}
              ${kpiHtml(market, poland, verdict)}
            </div>
          </section>
          <section class="ofSpecs${blockClass("specs")}">
            ${specs.map(([label, value]) => `<div class="ofSpec"><span>${esc(label)}</span><b title="${esc(value)}">${esc(value)}</b></div>`).join("")}
          </section>
          <div class="ofGrid">
            ${market ? `
            <section class="ofCard${blockClass("market")}" data-block="market">
              ${hideToggle("market")}
              <p class="ofCardHead">${icon("chart")}Cena na tle rynku</p>
              <div class="ofBar" role="img" aria-label="${esc(market.lead)}">
                <span class="ofBarTrack"></span>
                <span class="ofBarBand" style="left:${market.at(market.stats.p25).toFixed(1)}%;width:${(market.at(market.stats.p75) - market.at(market.stats.p25)).toFixed(1)}%"></span>
                <span class="ofBarMedian" style="left:${market.at(market.stats.median).toFixed(1)}%"></span>
                <span class="ofBarCar${market.vsMedian > 0.03 ? " isDear" : ""}" style="left:${market.at(view.price).toFixed(1)}%"></span>
              </div>
              <div class="ofBarLegend"><span class="isCar">to auto ${esc(money(view.price, market.currency))}</span><span>mediana <b>${esc(money(market.stats.median, market.currency))}</b></span></div>
              ${field("marketLead", market.lead, "p", "ofMarketLead")}
              ${field("marketTypical", market.typical, "p", "ofSmall")}
              ${poland ? `<div class="ofPoland${polandHidden(poland) ? " ofBlockHidden" : ""}">${field("polandLine", poland.line, "span")}</div>` : ""}
            </section>` : ""}
            ${verdict ? `
            <section class="ofCard${blockClass("verdict")}" data-block="verdict">
              ${hideToggle("verdict")}
              <p class="ofCardHead">${icon("shield")}Ocena AUTOGOOD</p>
              <span class="ofVerdict is${verdict.level === "ok" ? "Ok" : verdict.level === "check" ? "Check" : "Risk"}">${icon(verdict.level === "ok" ? "check" : verdict.level === "check" ? "warn" : "risk")}${field("verdictLabel", verdict.label, "span")}</span>
              <ul class="ofChecks">
                ${verdict.lines.map((line) => `
                  <li class="ofCheck is${line.level.charAt(0).toUpperCase()}${line.level.slice(1)}${blockClass(`check:${line.id}`)}">${icon(line.level === "ok" ? "check" : line.level === "info" ? "info" : line.level)}<span>${field(`check:${line.id}`, line.text)}${line.quote ? `<q>${esc(line.quote)}</q>` : ""}${hideToggle(`check:${line.id}`)}</span></li>`).join("")}
              </ul>
              ${field("inspect", "Przed zakupem sprawdzimy: grubość lakieru, diagnostykę komputerową, jazdę próbną, dokumenty i historię auta.", "p", "ofInspect")}
            </section>` : ""}
          </div>
          <div class="ofGrid">
            <section class="ofCard${blockClass("equipment")}" data-block="equipment">
              ${hideToggle("equipment")}
              <p class="ofCardHead">${icon("list")}Wyposażenie — najważniejsze</p>
              ${keyOptions.length
                ? `<div class="ofOptions">${keyOptions.map((item) => `<span class="ofOption">${esc(item.label)}</span>`).join("")}</div>
                   <p class="ofOptionsMore">${allOptions.length > keyOptions.length ? `+ ${numbers.format(allOptions.length - keyOptions.length)} pozycji potwierdzonych w ogłoszeniu (lista na str. 2)` : "Z listy wyposażenia w ogłoszeniu"}</p>`
                : `<p class="ofSmall">${reading ? "Wczytuję wyposażenie z ogłoszenia…" : "Wyposażenie pojawi się po wczytaniu danych z ogłoszenia."}</p>`}
            </section>
            <section class="ofCard${blockClass("seller")}" data-block="seller">
              ${hideToggle("seller")}
              <p class="ofCardHead">${icon("store")}Sprzedawca</p>
              ${sellerName ? `<p class="ofSellerName">${esc(sellerName)}</p>` : ""}
              ${sellerFacts.length ? `<p class="ofFacts">${sellerFacts.map((fact) => `<span>${fact}</span>`).join("")}</p>` : ""}
              ${seller?.city || view.city ? `<p class="ofSmall" style="margin-top:4px">${esc([seller?.city || view.city, COUNTRY[seller?.country || view.country] || ""].filter(Boolean).join(", "))}</p>` : ""}
              ${adAgeText ? `<p class="ofAdAge">${adAgeText}</p>` : ""}
            </section>
          </div>
          <footer class="ofFoot">
            <span>${manager.name || manager.phone ? `<b>${esc(salutation.owner)} opiekun:</b> ${esc([withFirm(manager.name), manager.phone, manager.email].filter(Boolean).join(" · "))}` : `<b>AUTOGOOD</b> · ${esc([store.company(offer.company).phone, store.company(offer.company).email].filter(Boolean).join(" · "))}`}</span>
            <span>Dane z ogłoszenia — sprawdzamy je przed zakupem</span>
          </footer>
        </article>
      </div>`;
  }

  function sheetTwo(view) {
    const costView = costs();
    const negotiation = VERDICT ? VERDICT.negotiation({ car: offer.car, ad: offer.ad, market: offer.market }) : null;
    const allOptions = EQUIPMENT ? EQUIPMENT.list(offer.ad?.features || []) : [];
    const salutation = SALUTATION[offer.client?.salutation] || SALUTATION.Pan;
    const manager = store.manager(offer.manager);
    const company = store.company(offer.company);
    const initials = manager.name ? String(manager.name).split(/\s+/).map((word) => word.charAt(0)).join("").slice(0, 2).toUpperCase() : "AG";
    const reasons = (negotiation?.reasons || []).map((reason) => {
      if (reason.id === "days") return `Auto ${reason.atLeast ? "co najmniej " : ""}${numbers.format(reason.days)} ${daysWord(reason.days)} w sprzedaży.`;
      if (reason.id === "dropped") return `Cena była już obniżana (${reason.drops}×, łącznie −${percent(reason.share)}).`;
      if (reason.id === "cheap") return "Cena jest już poniżej typowego przedziału rynku.";
      if (reason.id === "dear") return "Cena jest powyżej typowego przedziału — jest o czym rozmawiać.";
      if (reason.id === "fair") return "Cena w typowym przedziale rynku.";
      if (reason.id === "pace") return `Na tym rynku ${percent(reason.share)} ofert obniżyło cenę${reason.medianDrop ? `, zwykle o ok. ${percent(reason.medianDrop)}` : ""}.`;
      return "";
    }).filter(Boolean);
    // The six steps of "Jak wygląda proces" in the offer text (Notion,
    // owner 2026-10-05), shortened for one chosen car.
    const STEPS = {
      Pan: [
        ["Umowa i wymagania", "Potwierdzamy Pana wymagania i podpisujemy umowę. Przed zakupem może Pan ją rozwiązać bez kar i kosztów."],
        ["Weryfikacja i rozliczenie", "Sprawdzamy auto i sprzedawcę. Wszystkie koszty dostaje Pan czarno na białym."],
        ["Zaliczka i sprawdzenie auta", "Zwrotną zaliczkę wpłaca Pan po akceptacji oferty. Nasz specjalista ogląda auto za granicą."],
        ["Finalizacja zakupu", "Negocjujemy cenę i warunki z dealerem - 70% wynegocjowanego rabatu zostaje dla Pana."],
        ["Transport i kontrola", "Przewozimy auto lawetą do Łomianek i po rozładunku ponownie sprawdzamy jego stan."],
        ["Dokumenty i wydanie", "Akcyza, przegląd techniczny i tłumaczenia po naszej stronie. Panu zostaje rejestracja i OC."],
      ],
      Pani: [
        ["Umowa i wymagania", "Potwierdzamy Pani wymagania i podpisujemy umowę. Przed zakupem może Pani ją rozwiązać bez kar i kosztów."],
        ["Weryfikacja i rozliczenie", "Sprawdzamy auto i sprzedawcę. Wszystkie koszty dostaje Pani czarno na białym."],
        ["Zaliczka i sprawdzenie auta", "Zwrotną zaliczkę wpłaca Pani po akceptacji oferty. Nasz specjalista ogląda auto za granicą."],
        ["Finalizacja zakupu", "Negocjujemy cenę i warunki z dealerem - 70% wynegocjowanego rabatu zostaje dla Pani."],
        ["Transport i kontrola", "Przewozimy auto lawetą do Łomianek i po rozładunku ponownie sprawdzamy jego stan."],
        ["Dokumenty i wydanie", "Akcyza, przegląd techniczny i tłumaczenia po naszej stronie. Pani zostaje rejestracja i OC."],
      ],
      "Państwo": [
        ["Umowa i wymagania", "Potwierdzamy Państwa wymagania i podpisujemy umowę. Przed zakupem mogą Państwo ją rozwiązać bez kar i kosztów."],
        ["Weryfikacja i rozliczenie", "Sprawdzamy auto i sprzedawcę. Wszystkie koszty dostają Państwo czarno na białym."],
        ["Zaliczka i sprawdzenie auta", "Zwrotną zaliczkę wpłacają Państwo po akceptacji oferty. Nasz specjalista ogląda auto za granicą."],
        ["Finalizacja zakupu", "Negocjujemy cenę i warunki z dealerem - 70% wynegocjowanego rabatu zostaje dla Państwa."],
        ["Transport i kontrola", "Przewozimy auto lawetą do Łomianek i po rozładunku ponownie sprawdzamy jego stan."],
        ["Dokumenty i wydanie", "Akcyza, przegląd techniczny i tłumaczenia po naszej stronie. Państwu zostaje rejestracja i OC."],
      ],
    };
    const steps = STEPS[offer.client?.salutation] || STEPS.Pan;
    return `
      <div class="ofSheet${isHidden("page2") ? " isHiddenPage" : ""}" data-sheet="2">
        <article class="ofPage${styleClass()}" data-page="2">
          ${headHtml(2, view)}
          <div class="ofGrid isWide" style="margin-top:18px">
            ${costView ? `
            <section class="ofCard${blockClass("costs")}" data-block="costs">
              ${hideToggle("costs")}
              <p class="ofCardHead">${icon("receipt")}Koszt na gotowo — z czego się składa</p>
              <span class="ofMethod">Sposób zakupu: ${esc(costView.method)}</span>
              <table class="ofCosts">
                <tbody>
                  ${costView.rows.map((row) => `<tr><td>${esc(row.label)}${row.sub ? `<small>${esc(String(row.sub).replace(/\s*=\s*$/, ""))}</small>` : ""}</td><td>${esc(money(row.value, "PLN"))}</td></tr>`).join("")}
                  <tr class="isTotal"><td>Razem na gotowo</td><td>${esc(money(costView.total, "PLN"))}</td></tr>
                </tbody>
              </table>
              ${field("costsNote", costView.note, "p", "ofSmall")}
            </section>` : ""}
            ${negotiation ? `
            <section class="ofCard${blockClass("negotiation")}" data-block="negotiation">
              ${hideToggle("negotiation")}
              <p class="ofCardHead">${icon("percent")}Potencjał negocjacji</p>
              <p class="ofBig">${negotiation.from === negotiation.to ? `${negotiation.to}%` : `${negotiation.from}–${negotiation.to}%`}</p>
              <p class="ofSmall">${!negotiation.amountTo ? "cena bez dużego pola do negocjacji" : negotiation.amountFrom ? `ok. ${esc(money(negotiation.amountFrom, negotiation.currency))}–${esc(money(negotiation.amountTo, negotiation.currency))} mniej` : `do ok. ${esc(money(negotiation.amountTo, negotiation.currency))} mniej`}</p>
              <ul class="ofReasons">${reasons.map((text, index) => `<li>${field(`reason:${index}`, text)}</li>`).join("")}</ul>
              ${field("negotiationNote", `Obserwacja cen ogłoszeń, nie gwarancja rabatu. Negocjujemy w ${salutation.owner} imieniu.`, "p", "ofSmall ofInspect")}
            </section>` : ""}
          </div>
          ${allOptions.length ? `
          <section class="ofCard isFull${blockClass("allOptions")}" data-block="allOptions">
            ${hideToggle("allOptions")}
            <p class="ofCardHead">${icon("list")}Pełne wyposażenie z ogłoszenia (${numbers.format(allOptions.length)})</p>
            <ul class="ofAllOptions">${allOptions.slice(0, 60).map((item) => `<li class="${item.strong ? "isStrong" : ""}">${esc(item.label)}</li>`).join("")}</ul>
          </section>` : ""}
          <section class="ofCard isFull${blockClass("process")}" data-block="process">
            ${hideToggle("process")}
            <p class="ofCardHead">${icon("route")}Jak przebiega zakup</p>
            <div class="ofSteps">${steps.map(([title, text], index) => `<div class="ofStep">${field(`step${index + 1}Title`, title, "b")}${field(`step${index + 1}`, text)}</div>`).join("")}</div>
          </section>
          <section class="ofCard isFull${blockClass("contact")}" data-block="contact">
            ${hideToggle("contact")}
            <div class="ofContact">
              <div class="ofAvatar">${esc(initials)}</div>
              ${manager.name || manager.phone || manager.email ? `
              <div class="ofContactLines">
                <b>${esc(withFirm(manager.name) || "AUTOGOOD")}</b>
                <span class="ofSmall">${esc(salutation.owner)} opiekun</span>
                ${manager.phone ? `<span>${icon("phone")}${esc(manager.phone)}</span>` : ""}
                ${manager.email ? `<span>${icon("mail")}${esc(manager.email)}</span>` : ""}
              </div>` : `<div class="ofContactLines"><b>Zapraszamy do kontaktu</b><span class="ofSmall">Odpowiemy na każde pytanie o to auto</span></div>`}
              <div class="ofContactLines">
                <b>${esc(company.name || "AUTOGOOD")}</b>
                ${company.address ? `<span>${icon("pin")}${esc(company.address)}</span>` : ""}
                ${company.phone ? `<span>${icon("phone")}${esc(company.phone)}</span>` : ""}
                ${company.email ? `<span>${icon("mail")}${esc(company.email)}</span>` : ""}
                ${company.hours ? `<span class="ofSmall">${esc(company.hours)}</span>` : ""}
              </div>
            </div>
          </section>
          ${field("note", `Dane z ogłoszenia na ${PORTAL[offer.source] || "portalu"} i z rynku na dzień ${dateText(offer.market?.at || offer.createdAt)}. Ceny w ogłoszeniach mogą się zmienić. Stan techniczny, historię i dokumenty auta sprawdzamy przed zakupem.`, "p", "ofNote")}
          <footer class="ofFoot">
            <span><b>AUTOGOOD</b> · import aut z Europy</span>
            <span>${esc([company.web, company.email].filter(Boolean).join(" · "))}</span>
          </footer>
        </article>
      </div>`;
  }

  function verdictView(view) {
    if (!VERDICT) return null;
    const result = VERDICT.assess({ car: offer.car, ad: offer.ad, market: offer.market });
    const level = offer.verdictLevel || result.verdict;
    const label = { ok: "Rekomendujemy do oględzin", check: "Do weryfikacji przed rezerwacją", risk: "Nie rekomendujemy" }[level];
    // Up to six lines on the sheet: the most important first.
    return { level, label, lines: result.lines.filter((line) => line.level !== "info" || line.id === "vat:margin").slice(0, 6), all: result.lines, auto: result.verdict };
  }

  // ---- The manager's panel -------------------------------------------------------------
  function panelHtml(view) {
    const ad = offer.ad;
    const manager = store.manager(offer.manager);
    const company = store.company(offer.company);
    const client = offer.client || {};
    const verdict = verdictView(view);
    const priceChanged = ad?.vat?.gross && Math.abs(ad.vat.gross - view.price) >= 1 ? ad.vat.gross : 0;
    const blocks = [
      ["specs", "Dane auta"], ["chips", "Plakietki (rynek, Polska)"], ["market", "Cena na tle rynku"], ["poland", "Linia „W Polsce”"],
      ["verdict", "Ocena AUTOGOOD"], ["equipment", "Wyposażenie — najważniejsze"], ["seller", "Sprzedawca"],
      ["page2", "Strona 2 w PDF"], ["costs", "Koszt na gotowo"], ["negotiation", "Potencjał negocjacji"], ["allOptions", "Pełne wyposażenie"], ["process", "Jak przebiega zakup"], ["contact", "Kontakt"],
    ];
    const adState = reading
      ? `<p>Czytam ogłoszenie…</p>`
      : ad
        ? `<p class="ofPanelOk">Dane z ogłoszenia: ${esc(dateText(ad.readAt))} ${esc(timeText(ad.readAt))}${ad.complete ? "" : " (podstawowe — importer bez zdjęć i opinii)"}.</p>`
        : offer.adError
          ? `<p class="ofPanelError">${esc(adErrorText())}</p>`
          : "<p>Dane z ogłoszenia jeszcze nie wczytane.</p>";
    return `
      <section class="ofPanelCard">
        <h2>Oferta ${esc(offer.number || "")}</h2>
        <p>Utworzona ${esc(dateText(offer.createdAt))} ${esc(timeText(offer.createdAt))} z Monitoringu: ${esc(offer.favoriteTitle || "")}. Rynek z dnia ${esc(dateText(offer.market?.at || offer.createdAt))}.</p>
        <div class="ofPanelRow">
          <label>Zwrot<select data-client-salutation>${Object.keys(SALUTATION).map((key) => `<option${client.salutation === key ? " selected" : ""}>${esc(key)}</option>`).join("")}</select></label>
          <label>Klient (opcjonalnie)<input data-client-name value="${esc(client.name || "")}" placeholder="np. Jan Kowalski" /></label>
        </div>
      </section>
      <section class="ofPanelCard">
        <h2>Wygląd oferty</h2>
        <div class="ofToggleList ofStyleList">${STYLES.map(([key, label, note]) => `<label><input type="radio" name="ofStyle" data-style="${key}"${currentStyle() === key ? " checked" : ""} /> <span><b>${esc(label)}</b><small>${esc(note)}</small></span></label>`).join("")}</div>
      </section>
      <section class="ofPanelCard">
        <h2>Dane z ogłoszenia</h2>
        ${adState}
        ${priceChanged ? `<p class="ofPanelError">Cena w ogłoszeniu zmieniła się: ${esc(money(view.price, view.currency))} → ${esc(money(priceChanged, view.currency))}.</p><button class="offerButton isSmall" type="button" data-use-ad-price="${priceChanged}">Użyj aktualnej ceny</button>` : ""}
        <button class="offerButton isSmall" type="button" data-read-ad${reading ? " disabled" : ""}>Wczytaj ponownie z ogłoszenia</button>
        <label>Zdjęcie (adres, jeśli inne niż pierwsze z ogłoszenia)<input data-photo value="${esc(edits().photo || "")}" placeholder="https://…" /></label>
        <div class="ofPanelRow">
          <label>Kadrowanie zdjęcia<select data-photo-zoom>${ZOOMS.map(([key, label]) => `<option value="${key}"${String(offer.photoZoom || "1") === key ? " selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
          <label>Środek kadru<select data-photo-focus>${FOCUS.map(([key, label]) => `<option value="${key}"${(offer.photoFocus || "center") === key ? " selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
        </div>
        <p>Ramka dealera na zdjęciu (logo, telefony, ikony) znika po przybliżeniu albo wybierz inne zdjęcie.</p>
        ${ad?.images?.length > 1 ? `<label>Wybierz zdjęcie z ogłoszenia<select data-photo-pick>${ad.images.slice(0, 20).map((url, index) => `<option value="${esc(url)}"${(edits().photo || ad.images[0]) === url ? " selected" : ""}>Zdjęcie ${index + 1}</option>`).join("")}</select></label>` : ""}
        ${ad?.description ? `<details><summary>Opis sprzedawcy (oryginał)</summary><div class="ofDescription">${esc(ad.description)}</div></details>` : ""}
        ${ad?.flags?.aiSummary ? `<details><summary>Podsumowanie mobile.de (AI portalu)</summary><div class="ofDescription">${esc([ad.flags.aiTags.join(" · "), ad.flags.aiSummary.replace(/\*\*/g, ""), ...(ad.flags.aiInsights || []).map((item) => `• ${item.title} — ${item.subtitle}`)].filter(Boolean).join("\n\n"))}</div></details>` : ""}
      </section>
      <section class="ofPanelCard">
        <h2>Kalkulacja</h2>
        ${offer.calc
          ? `<p class="ofPanelOk">Z kalkulatora: ${esc(offer.calc.methodLabel)}, ${esc(money(offer.calc.total, "PLN"))} (${esc(dateText(offer.calc.at))} ${esc(timeText(offer.calc.at))}).</p>`
          : `<p>Teraz: szacunek „Zakup bezpośredni” z taryfą miejsca sprzedawcy. Wybierz sposób zakupu i wstaw dokładną kalkulację.</p>`}
        <label>Sposób zakupu<select data-calc-method>${CALC_TABS.map((item) => `<option value="${item.tab}"${item.tab === defaultTab() ? " selected" : ""}${item.key === "vat" && !calcInput().vat ? " disabled" : ""}>${esc(item.label)}</option>`).join("")}</select></label>
        <button class="offerButton isSmall" type="button" data-calc-open>${offer.calc ? "Zmień w kalkulatorze" : "Otwórz kalkulator"}</button>
        ${offer.calc ? '<button class="offerButton isSmall" type="button" data-calc-drop>Wróć do szacunku</button>' : ""}
      </section>
      ${verdict ? `
      <section class="ofPanelCard">
        <h2>Ocena</h2>
        <label>Werdykt<select data-verdict-level>
          <option value="">Automatycznie (${esc({ ok: "rekomendujemy", check: "do weryfikacji", risk: "nie rekomendujemy" }[verdict.auto])})</option>
          <option value="ok"${offer.verdictLevel === "ok" ? " selected" : ""}>Rekomendujemy do oględzin</option>
          <option value="check"${offer.verdictLevel === "check" ? " selected" : ""}>Do weryfikacji przed rezerwacją</option>
          <option value="risk"${offer.verdictLevel === "risk" ? " selected" : ""}>Nie rekomendujemy</option>
        </select></label>
        <p>${verdict.all.filter((line) => line.level === "risk").length} czerwonych, ${verdict.all.filter((line) => line.level === "warn").length} żółtych, ${verdict.all.filter((line) => line.level === "ok").length} zielonych. Linie ukrywa się w trybie „Edytuj teksty”.</p>
      </section>` : ""}
      <section class="ofPanelCard">
        <h2>Bloki w PDF</h2>
        <div class="ofToggleList">${blocks.map(([key, label]) => `<label><input type="checkbox" data-block-toggle="${key}"${(key === "poland" ? polandHidden(polandView()) : isHidden(key)) ? "" : " checked"} /> ${esc(label)}</label>`).join("")}</div>
        ${polandView()?.saving < 0 ? `<p class="ofPanelError">Podobne auta w Polsce są średnio o ${esc(money(-polandView().saving, "PLN"))} tańsze niż to auto na gotowo — dlatego linia „W Polsce” jest domyślnie ukryta.</p>` : ""}
      </section>
      <section class="ofPanelCard">
        <h2>Opiekun klienta</h2>
        <p${manager.name && manager.phone ? "" : ' class="ofPanelError"'}>${manager.name && manager.phone ? "Zapisywany w tej przeglądarce i w nowych ofertach." : "Uzupełnij imię i telefon — klient zobaczy je w ofercie. Zapisują się w tej przeglądarce."}</p>
        <label>Imię i nazwisko<input data-manager="name" value="${esc(manager.name || "")}" /></label>
        <label>Telefon<input data-manager="phone" value="${esc(manager.phone || "")}" inputmode="tel" /></label>
        <label>E-mail<input data-manager="email" value="${esc(manager.email || "")}" inputmode="email" /></label>
      </section>
      <section class="ofPanelCard">
        <h2>Dane firmy</h2>
        <label>Adres<input data-company="address" value="${esc(company.address || "")}" /></label>
        <label>Telefon firmy<input data-company="phone" value="${esc(company.phone || "")}" placeholder="do potwierdzenia" /></label>
        <label>E-mail<input data-company="email" value="${esc(company.email || "")}" /></label>
        <label>Godziny<input data-company="hours" value="${esc(company.hours || "")}" /></label>
      </section>
      ${Object.keys(edits()).filter((key) => key !== "photo").length ? `<section class="ofPanelCard"><h2>Zmienione teksty</h2><p>${Object.keys(edits()).filter((key) => key !== "photo").length} zmian.</p><button class="offerButton isSmall" type="button" data-reset-edits>Przywróć teksty automatyczne</button></section>` : ""}`;
  }

  function adErrorText() {
    if (offer.source === "mobile") {
      return `Nie udało się przeczytać ogłoszenia mobile.de: importer na Macu nie odpowiada lub odmówił (${offer.adError}). Oferta pokazuje dane z Monitoringu; zdjęcie można wkleić adresem.`;
    }
    return `Nie udało się przeczytać ogłoszenia (${offer.adError}). Spróbuj ponownie za chwilę.`;
  }

  // ---- Drawing ------------------------------------------------------------------------------
  function render() {
    if (!offer) return;
    const view = carView();
    document.title = `AUTOGOOD Oferta ${offer.number || ""} — ${view.title}`;
    if (heading) heading.textContent = `Oferta ${offer.number || ""} · ${view.title}`;
    stage.classList.toggle("isEditing", editing);
    stage.classList.add("isScreen");
    stage.innerHTML = (sheetOne(view) + sheetTwo(view)).replace(/[\u2013\u2014]/g, "-");
    panel.innerHTML = panelHtml(view);
    fitSheets();
    autoFit();
  }

  // Each sheet is one A4 page: when the content is taller (long names, many
  // checks or options), the least important lines go first — green checks
  // beyond the third, then options of the full list — and the manager is
  // told if it still does not fit.
  function autoFit() {
    const overflow = (page) => page.scrollHeight - page.clientHeight;
    stage.querySelectorAll(".ofPage.isNoc").forEach((page) => {
      const photo = page.querySelector(".ofPhoto");
      const box = page.getBoundingClientRect();
      const scale = box.width / PAGE_W || 1;
      if (photo && page.dataset.page === "1") {
        const rect = photo.getBoundingClientRect();
        page.style.setProperty("--of-band", `${Math.round((rect.top - box.top) / scale + (rect.height / scale) * 0.42)}px`);
      }
    });
    const one = stage.querySelector('[data-page="1"]');
    if (one) {
      const checks = () => [...one.querySelectorAll(".ofCheck:not(.ofBlockHidden)")];
      while (overflow(one) > 0 && checks().length > 3) {
        const lines = checks();
        const drop = [...lines].reverse().find((line) => line.classList.contains("isOk") || line.classList.contains("isInfo")) || lines[lines.length - 1];
        drop.remove();
      }
    }
    const two = stage.querySelector('[data-page="2"]');
    if (two) {
      const list = two.querySelector(".ofAllOptions");
      let dropped = 0;
      while (list && overflow(two) > 0 && list.children.length > 12) {
        const items = [...list.children];
        (items.reverse().find((item) => !item.classList.contains("isStrong")) || items[0]).remove();
        dropped += 1;
      }
      if (list && dropped) {
        const more = document.createElement("li");
        more.className = "isMore";
        more.textContent = `i ${dropped} innych pozycji`;
        list.append(more);
        if (overflow(two) > 0) list.lastElementChild.previousElementSibling?.remove();
      }
    }
    const tooLong = [one, two].filter((page) => page && overflow(page) > 0).map((page) => page.dataset.page);
    stage.querySelectorAll(".ofPage").forEach((page) => page.classList.toggle("isOverflow", tooLong.includes(page.dataset.page)));
    if (tooLong.length) setStatus(`Strona ${tooLong.join(" i ")} nie mieści się na A4 — ukryj blok lub skróć tekst (Edytuj teksty).`, true);
  }

  function fitSheets() {
    const width = stage.clientWidth || PAGE_W;
    const scale = Math.min(1, Math.max(0.3, (width - 4) / PAGE_W));
    document.documentElement.style.setProperty("--of-scale", scale.toFixed(4));
  }
  window.addEventListener("resize", fitSheets);

  function placeBelowNavigation() {
    const nav = document.querySelector(".agGlobalNav");
    const bar = document.querySelector(".offerBar");
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    if (bar) bar.style.top = `${navHeight}px`;
    if (panel) panel.style.top = `${navHeight + (bar?.getBoundingClientRect().height || 0) + 16}px`;
  }
  window.setTimeout(placeBelowNavigation, 300);
  window.addEventListener("resize", placeBelowNavigation);

  // ---- Saving --------------------------------------------------------------------------------
  async function save(change, redraw = true) {
    if (!offer) return;
    try {
      offer = (await store.update(offer.id, change)) || offer;
      if (redraw) render();
      setStatus(`Zapisano ${timeText(new Date().toISOString())}`);
    } catch {
      setStatus("Nie udało się zapisać zmian w tej przeglądarce.", true);
    }
  }

  const editTimers = new Map();
  stage.addEventListener("input", (event) => {
    const target = event.target.closest("[data-edit]");
    if (!target || !editing) return;
    const key = target.dataset.edit;
    window.clearTimeout(editTimers.get(key));
    editTimers.set(key, window.setTimeout(() => {
      const text = target.innerText.replace(/ /g, " ").trim();
      target.classList.add("isEdited");
      save((stored) => ({ edits: { ...(stored.edits || {}), [key]: text } }), false);
    }, 500));
  });
  stage.addEventListener("keydown", (event) => {
    // One line per field: Enter ends the edit.
    if (event.key === "Enter" && event.target.closest("[data-edit]")) {
      event.preventDefault();
      event.target.closest("[data-edit]").blur();
    }
  });
  stage.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-hide]");
    if (toggle) {
      event.preventDefault();
      const key = toggle.dataset.hide;
      save((stored) => {
        const set = new Set(stored.hidden || []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { hidden: [...set] };
      });
    }
  });

  panel.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-block-toggle]")) {
      const key = target.dataset.blockToggle;
      const show = target.checked;
      save((stored) => {
        const set = new Set(stored.hidden || []);
        const shown = new Set(stored.shown || []);
        if (show) {
          set.delete(key);
          shown.add(key);
        } else {
          set.add(key);
          shown.delete(key);
        }
        return { hidden: [...set], shown: [...shown] };
      });
    } else if (target.matches("[data-style]")) {
      try {
        localStorage.setItem(STYLE_KEY, target.dataset.style);
      } catch {
        // Only the default for new offers.
      }
      save({ style: target.dataset.style });
    } else if (target.matches("[data-verdict-level]")) {
      save({ verdictLevel: target.value || null });
    } else if (target.matches("[data-client-salutation]")) {
      save((stored) => ({ client: { ...(stored.client || {}), salutation: target.value } }));
    } else if (target.matches("[data-client-name]")) {
      save((stored) => ({ client: { ...(stored.client || {}), name: target.value.trim() } }));
    } else if (target.matches("[data-manager]")) {
      const change = { [target.dataset.manager]: target.value.trim() };
      try {
        store.setManager(change);
      } catch {
        // Kept with this offer even when the browser refuses to store it.
      }
      save((stored) => ({ manager: { ...(stored.manager || {}), ...change } }));
    } else if (target.matches("[data-company]")) {
      const change = { [target.dataset.company]: target.value.trim() };
      try {
        store.setCompany(change);
      } catch {
        // As above.
      }
      save((stored) => ({ company: { ...(stored.company || {}), ...change } }));
    } else if (target.matches("[data-photo]")) {
      const url = target.value.trim();
      save((stored) => {
        const next = { ...(stored.edits || {}) };
        if (/^https:\/\//.test(url)) next.photo = url;
        else delete next.photo;
        return { edits: next };
      });
    } else if (target.matches("[data-photo-zoom]")) {
      save({ photoZoom: target.value });
    } else if (target.matches("[data-photo-focus]")) {
      save({ photoFocus: target.value });
    } else if (target.matches("[data-photo-pick]")) {
      save((stored) => ({ edits: { ...(stored.edits || {}), photo: target.value } }));
    }
  });
  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-calc-open]")) openCalculator(Number(panel.querySelector("[data-calc-method]")?.value ?? defaultTab()));
    else if (event.target.closest("[data-calc-drop]")) save({ calc: null });
    else if (event.target.closest("[data-read-ad]")) readAd();
    else if (event.target.closest("[data-reset-edits]")) save((stored) => ({ edits: stored.edits?.photo ? { photo: stored.edits.photo } : {} }));
    else if (event.target.closest("[data-use-ad-price]")) {
      const price = Number(event.target.closest("[data-use-ad-price]").dataset.useAdPrice) || 0;
      if (price) save((stored) => repriced(stored, price));
    }
  });

  // A new ad price: the estimate is counted again with the same tariff.
  function repriced(stored, price) {
    const estimate = stored.estimate;
    const car = { ...(stored.car || {}), price, previousPrice: stored.car?.price };
    if (!estimate || !TURNKEY) return { car };
    const result = TURNKEY.turnkeyDirect({
      carBruttoEur: price,
      rate: estimate.rate,
      transportNettoPln: estimate.transportNetto,
      inspectionNettoPln: estimate.inspectionNetto,
      engineTypeIndex: estimate.engine?.index ?? 3,
    });
    return { car, estimate: { ...estimate, carBruttoEur: price, parts: result.parts, total: result.total } };
  }

  editButton?.addEventListener("click", () => {
    editing = !editing;
    editButton.setAttribute("aria-pressed", editing ? "true" : "false");
    editButton.textContent = editing ? "Zakończ edycję" : "Edytuj teksty";
    render();
  });

  // ---- The calculator (wave 3) ------------------------------------------------------------
  // The calculators page itself in a window (calculators.html?embed=1, as
  // "Oblicz na gotowo"), on the method the manager picks; "Wstaw do oferty"
  // copies its lines and total as shown — the live rate, its tariffs and any
  // change made there included — into the offer.
  const CALC_TABS = [
    { tab: 0, key: "direct", label: "Zakup bezpośredni" },
    { tab: 3, key: "vat", label: "Dealerzy VAT 23%" },
    { tab: 4, key: "margin", label: "Dealerzy VAT marża" },
  ];
  const VAT_RATES = { DE: 0.19, AT: 0.2, FR: 0.2, NL: 0.21, BE: 0.21, LU: 0.17, IT: 0.22, ES: 0.21, SE: 0.25, DK: 0.25, CZ: 0.21, SK: 0.23 };
  function calcInput() {
    const view = carView();
    const vat = view.priceType === "vat" || Boolean(offer.ad?.vat?.deductible);
    const net = view.netPrice || (vat && VAT_RATES[view.country] ? view.price / (1 + VAT_RATES[view.country]) : 0);
    return {
      gross: view.price,
      net: vat ? net : 0,
      vat,
      engine: offer.estimate?.engine?.index ?? 3,
      transport: offer.estimate?.transportNetto || 0,
      inspection: offer.estimate?.inspectionNetto || 0,
      url: offer.source === "mobile" ? view.url : "",
    };
  }
  // An offer with VAT to deduct opens on "Dealerzy VAT 23%", others on "Zakup bezpośredni".
  const defaultTab = () => (offer.calc?.tab ?? (calcInput().vat && calcInput().net ? 3 : 0));
  function calcUrl(tab) {
    const input = calcInput();
    const params = new URLSearchParams({ embed: "1", tab: String(tab), lang: "pl", car: String(Math.round(tab === 3 ? input.net : input.gross)), engine: String(input.engine) });
    if (input.transport) params.set("transport", String(Math.round(input.transport)));
    if (input.inspection) params.set("inspection", String(Math.round(input.inspection)));
    if (input.url) params.set("mobileUrl", input.url);
    return `./calculators.html?${params.toString()}`;
  }
  let calcDialog = null;
  let calcTab = 0;
  function openCalculator(tab = defaultTab()) {
    calcTab = tab;
    const input = calcInput();
    if (!calcDialog) {
      calcDialog = document.createElement("dialog");
      calcDialog.className = "agCalcPopup ofCalcDialog";
      calcDialog.setAttribute("aria-labelledby", "ofCalcTitle");
      document.body.append(calcDialog);
      calcDialog.addEventListener("click", (event) => {
        if (event.target === calcDialog || event.target.closest("[data-calc-close]")) calcDialog.close();
        const pick = event.target.closest("[data-calc-tab]");
        if (pick && !pick.disabled) openCalculator(Number(pick.dataset.calcTab));
        if (event.target.closest("[data-calc-insert]")) insertCalculation();
      });
      calcDialog.addEventListener("close", () => {
        const frame = calcDialog.querySelector("iframe");
        if (frame) frame.src = "about:blank";
      });
    }
    calcDialog.innerHTML = `
      <div class="agCalcPopupHead">
        <div>
          <p class="agCalcPopupKicker">Kalkulacja do oferty ${esc(offer.number || "")}</p>
          <h2 id="ofCalcTitle">${esc(carView().title)}</h2>
          <p class="agCalcPopupFacts">${esc(money(input.gross, "EUR"))} brutto${input.vat ? ` · VAT do odliczenia · ${esc(money(input.net, "EUR"))} netto` : ""} · transport ${esc(numbers.format(input.transport))} + oględziny ${esc(numbers.format(input.inspection))} zł netto</p>
        </div>
        <div class="ofCalcActions">
          <button class="offerButton isPrimary" type="button" data-calc-insert>Wstaw do oferty</button>
          <button class="agCalcPopupClose" type="button" data-calc-close aria-label="Zamknij">×</button>
        </div>
      </div>
      <div class="agCalcPopupTabs" role="tablist">
        ${CALC_TABS.map((item) => `<button type="button" role="tab" data-calc-tab="${item.tab}" aria-selected="${item.tab === tab ? "true" : "false"}"${item.key === "vat" && !input.vat ? ' disabled title="Tylko dla auta z VAT do odliczenia"' : ""}>${esc(item.label)}</button>`).join("")}
      </div>
      <p class="agCalcPopupNote" data-calc-note>Popraw w kalkulatorze, co trzeba (transport, oględziny, rabat), i kliknij „Wstaw do oferty” — oferta pokaże dokładnie te linie i tę kwotę.</p>
      <iframe class="agCalcPopupFrame" title="Kalkulator AUTOGOOD" src="${esc(calcUrl(tab))}"></iframe>`;
    if (!calcDialog.open) calcDialog.showModal();
  }

  const amountOf = (text) => {
    const digits = String(text || "").replace(/[^\d,-]/g, "").replace(",", ".");
    return Number(digits) || 0;
  };
  function readCalculator() {
    const frame = calcDialog?.querySelector("iframe");
    const doc = frame?.contentDocument;
    if (!doc) throw new Error("kalkulator nie jest gotowy");
    const text = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();
    const rows = [...doc.querySelectorAll(".resultsList .resultLine")].map((line) => ({
      label: text(line.querySelector(".resultLineLabel")),
      sub: [text(line.querySelector(".resultLinePrefix")).replace(/\s*=\s*$/, ""), text(line.querySelector(".resultLineSub"))].filter(Boolean).join(" · "),
      value: amountOf(text(line.querySelector(".resultLineAmount"))),
    })).filter((row) => row.label && row.value);
    const total = amountOf(text(doc.querySelector(".totalBarValue")));
    if (!rows.length || !total) throw new Error("kalkulator jeszcze liczy — spróbuj za chwilę");
    const rate = Number(String(text(doc.querySelector(".totalBarRate")).match(/(\d+[.,]\d+)/)?.[1] || "").replace(",", ".")) || 0;
    const item = CALC_TABS.find((entry) => entry.tab === calcTab) || CALC_TABS[0];
    return { tab: calcTab, method: item.key, methodLabel: item.label, rows, total, rate, at: new Date().toISOString() };
  }
  async function insertCalculation() {
    const note = calcDialog?.querySelector("[data-calc-note]");
    try {
      const calcData = readCalculator();
      calcData.note = `Kalkulator AUTOGOOD, kurs EUR ${calcData.rate ? calcData.rate.toFixed(2).replace(".", ",") : "—"} zł z dnia ${dateText(calcData.at)}.`;
      await save({ calc: calcData });
      calcDialog.close();
      setStatus(`Wstawiono kalkulację: ${calcData.methodLabel}, ${money(calcData.total, "PLN")}.`);
    } catch (error) {
      if (note) {
        note.textContent = `Nie udało się odczytać kalkulatora: ${error?.message || error}.`;
        note.classList.add("ofPanelError");
      }
    }
  }

  // ---- Reading the ad -----------------------------------------------------------------------
  async function readAd() {
    if (!offer || reading || !AD || !["mobile", "autoscout"].includes(offer.source) || !offer.url) return;
    reading = true;
    render();
    setStatus("Czytam ogłoszenie: zdjęcia, wyposażenie, sprzedawca…");
    try {
      const importer = params.get("mobiledeApi") || offer.importer || "";
      const ad = await AD.read(offer.source, offer.url, { importer });
      offer = (await store.update(offer.id, { ad, adError: "", adTriedAt: new Date().toISOString() })) || offer;
      setStatus(`Dane z ogłoszenia wczytane ${timeText(ad.readAt)}.`);
    } catch (error) {
      offer = (await store.update(offer.id, { adError: String(error?.message || error).slice(0, 160), adTriedAt: new Date().toISOString() })) || offer;
      setStatus(adErrorText(), true);
    } finally {
      reading = false;
      render();
    }
  }

  // ---- Picture and PDF ---------------------------------------------------------------------
  const scripts = new Map();
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (!scripts.has(src)) {
      scripts.set(src, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
          scripts.delete(src);
          reject(new Error(src));
        };
        document.head.append(script);
      }));
    }
    return scripts.get(src);
  }

  // Google Fonts' stylesheet cannot be read by the picture maker: its faces
  // are fetched and written in as data (latin and latin-ext: Polish letters).
  let fontCss = null;
  async function pageFontCss() {
    if (fontCss !== null) return fontCss;
    try {
      const links = [...document.querySelectorAll('link[href*="fonts.googleapis.com/css"]')];
      const css = (await Promise.all(links.map(async (link) => (await fetch(link.href)).text()))).join("\n");
      const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
        .filter((match) => match[1] === "latin" || match[1] === "latin-ext")
        .map((match) => match[2]);
      const inlined = await Promise.all(faces.map(async (face) => {
        const url = (face.match(/url\(([^)]+)\)/) || [])[1];
        if (!url) return face;
        const blob = await (await fetch(url.replace(/["']/g, ""))).blob();
        const data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        return face.replace(url, `"${data}"`);
      }));
      fontCss = inlined.join("\n");
    } catch {
      fontCss = "";
    }
    return fontCss;
  }

  // One sheet drawn at its real size from a copy off screen, without the
  // manager's buttons, hidden blocks and edit marks.
  async function captureSheet(number, pixelRatio = 2.5) {
    // The library without its font shrink (vendor/html-to-image-exact.js):
    // the sheet's text is drawn at its real size, as laid out on the page.
    await loadScript("./vendor/html-to-image-exact.js?v=1.11.11-exact", "htmlToImage");
    const live = stage.querySelector(`[data-page="${number}"]`);
    if (!live) return null;
    const holder = document.createElement("div");
    holder.setAttribute("aria-hidden", "true");
    holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE_W}px;height:${PAGE_H}px;pointer-events:none;`;
    const copy = live.cloneNode(true);
    copy.style.boxShadow = "none";
    copy.querySelectorAll(".ofHideToggle, .ofDraftBadge, .ofBlockHidden, [data-offer-hide]").forEach((node) => node.remove());
    copy.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    copy.querySelectorAll(".isEdited").forEach((node) => node.classList.remove("isEdited"));
    holder.append(copy);
    document.body.append(holder);
    try {
      await Promise.all([...copy.querySelectorAll("img")].map((image) => (image.complete ? null : new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      }))));
      const box = copy.getBoundingClientRect();
      const links = [...copy.querySelectorAll("a[href^='http']")].map((link) => {
        const rect = link.getBoundingClientRect();
        return { url: link.href, left: rect.left - box.left, top: rect.top - box.top, right: rect.right - box.left, bottom: rect.bottom - box.top };
      });
      const canvas = await window.htmlToImage.toCanvas(copy, {
        pixelRatio,
        backgroundColor: "#ffffff",
        fontEmbedCSS: (await pageFontCss()) || undefined,
        width: PAGE_W,
        height: PAGE_H,
        skipAutoScale: true,
      });
      return { canvas, links };
    } finally {
      holder.remove();
    }
  }

  const fileName = (extension) => {
    const view = carView();
    return `AUTOGOOD Oferta ${offer.number || ""} ${[view.brand, view.model].filter(Boolean).join(" ") || view.title} ${new Date().toISOString().slice(0, 10)}.${extension}`
      .replace(/[\\/:*?"<>|']+/g, "").replace(/\s+/g, " ");
  };
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // The PDF: one A4 page per sheet, the picture full-bleed, the ad link
  // clickable where it is drawn.
  async function buildPdf() {
    await loadScript("./vendor/pdf-lib.min.js", "PDFLib");
    const { PDFDocument, PDFName, PDFString } = window.PDFLib;
    const pdf = await PDFDocument.create();
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const scale = pageWidth / PAGE_W;
    const pages = isHidden("page2") ? [1] : [1, 2];
    for (const number of pages) {
      const shot = await captureSheet(number);
      if (!shot) continue;
      const jpeg = await pdf.embedJpg(shot.canvas.toDataURL("image/jpeg", 0.9));
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(jpeg, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      const annotations = shot.links.map((link) => pdf.context.register(pdf.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [link.left * scale, pageHeight - link.bottom * scale, link.right * scale, pageHeight - link.top * scale],
        Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(link.url) },
      })));
      if (annotations.length) page.node.set(PDFName.of("Annots"), pdf.context.obj(annotations));
    }
    pdf.setTitle(`AUTOGOOD — oferta ${offer.number || ""}`);
    pdf.setAuthor("AUTOGOOD");
    return { bytes: await pdf.save(), name: fileName("pdf"), pages: pages.length };
  }

  async function makePdf() {
    if (!offer) return;
    pdfButton.disabled = true;
    setStatus("Przygotowuję PDF…");
    try {
      const { bytes, name } = await buildPdf();
      download(new Blob([bytes], { type: "application/pdf" }), name);
      await save({ exportedAt: new Date().toISOString() }, false);
      setStatus(`PDF gotowy: ${name}`);
    } catch (error) {
      setStatus(`Nie udało się przygotować PDF (${error?.message || error}).`, true);
    } finally {
      pdfButton.disabled = false;
    }
  }

  async function copyPicture() {
    if (!offer) return;
    copyButton.disabled = true;
    setStatus("Przygotowuję obraz strony 1…");
    const blobPromise = captureSheet(1, 2).then((shot) => new Promise((resolve, reject) => shot.canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png")));
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") throw new Error("no clipboard");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
      setStatus("Obraz strony 1 skopiowany — wklej go w wiadomości (Ctrl+V).");
    } catch {
      // The browser refused the clipboard: the picture is saved instead.
      try {
        download(await blobPromise, fileName("png"));
        setStatus("Przeglądarka nie pozwoliła skopiować obrazu — zapisano go jako plik PNG.");
      } catch (error) {
        setStatus(`Nie udało się przygotować obrazu (${error?.message || error}).`, true);
      }
    } finally {
      copyButton.disabled = false;
    }
  }
  pdfButton?.addEventListener("click", makePdf);
  // For checks in the browser console (no download): sheets and the PDF.
  window.AUTOGOOD_OFFER_PAGE = { captureSheet, buildPdf, autoFit: () => autoFit() };
  copyButton?.addEventListener("click", copyPicture);

  // ---- Opening ---------------------------------------------------------------------------------
  function problem(html) {
    stage.innerHTML = `<div class="offerProblem">${html}</div>`;
    panel.innerHTML = "";
    [editButton, pdfButton, copyButton].forEach((button) => { if (button) button.disabled = true; });
  }

  async function recentList() {
    const list = await store.recent(15).catch(() => []);
    if (!list.length) {
      problem('Nie wybrano oferty. Ofertę przygotowuje się z listy ogłoszeń w <a href="./mobile.html#monitoring">Monitoringu</a> przyciskiem „Przygotuj ofertę”.');
      return;
    }
    problem(`<b>Ostatnie oferty w tej przeglądarce</b><br>${list.map((item) => `<a href="?id=${encodeURIComponent(item.id)}">${esc(item.number || "")} · ${esc(item.favoriteTitle || item.car?.title || "")} · ${esc(dateText(item.createdAt))}</a>`).join("<br>")}`);
  }

  async function waitForDraft(id, timeoutMs = 20000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const found = await store.get(id).catch(() => null);
      if (found) return found;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    return null;
  }

  async function open() {
    if (!store) {
      problem("Ta przeglądarka nie pozwala zapisywać ofert (brak IndexedDB).");
      return;
    }
    if (!offerId) {
      recentList();
      return;
    }
    offer = params.get("new") ? await waitForDraft(offerId) : await store.get(offerId).catch(() => null);
    if (!offer) {
      problem("Nie znaleziono tej oferty w przeglądarce. Oferty są zapisywane w przeglądarce, w której je przygotowano.");
      return;
    }
    if (offer.error) {
      problem(`Nie udało się przygotować oferty: ${esc(offer.error)}. Wróć do <a href="./mobile.html#monitoring">Monitoringu</a> i spróbuj ponownie.`);
      return;
    }
    if (params.get("new")) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("new");
      window.history.replaceState(null, "", clean.toString());
    }
    render();
    setStatus(`Oferta ${offer.number || ""} · zapisana w tej przeglądarce`);
    if (!offer.ad && !offer.adTriedAt) readAd();
  }

  // Another tab saved this offer: show its version (unless typing here).
  store?.channel?.addEventListener("message", async (event) => {
    if (event.data?.type !== "offer" || event.data.id !== offerId || editing) return;
    const fresh = await store.get(offerId).catch(() => null);
    if (fresh && fresh.updatedAt !== offer?.updatedAt) {
      offer = fresh;
      render();
    }
  });

  open();
})();
