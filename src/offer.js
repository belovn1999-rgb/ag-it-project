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
  const RU = window.AUTOGOOD_OFFER_RU;
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
  const kmText = (value) => (Number(value) > 0 ? `${numbers.format(Math.round(Number(value)))} ${L("km", "км")}` : "");
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
  // ---- The offer's language (owner 2026-10-10): Polish or Russian. Each
  // client sentence is written in both (L); the readers' Polish values go
  // through offer-ru.js (val); edits are kept per language (field).
  const ru = () => offer?.lang === "ru" && Boolean(RU);
  const L = (pl, russian) => (ru() ? russian : pl);
  const val = (text) => (ru() ? RU.value(text) : text ?? "");
  const many = (count, plForms, ruForms) => (ru() ? RU.plural(count, ...ruForms) : plural(count, ...plForms));
  const countryName = (code) => (ru() ? RU.country(code) : COUNTRY[String(code || "").toUpperCase()]) || String(code || "");
  const daysWord = (days) => many(days, ["dzień", "dni", "dni"], ["день", "дня", "дней"]);
  const COUNTRY = { DE: "Niemcy", NL: "Holandia", BE: "Belgia", AT: "Austria", LU: "Luksemburg", FR: "Francja", IT: "Włochy", ES: "Hiszpania", CZ: "Czechy", SK: "Słowacja", SE: "Szwecja", DK: "Dania", CH: "Szwajcaria", PL: "Polska", SI: "Słowenia", HU: "Węgry", PT: "Portugalia", BY: "Białoruś", LT: "Litwa", LV: "Łotwa", EE: "Estonia" };
  const COUNTRY_IN = { DE: "w Niemczech", NL: "w Holandii", BE: "w Belgii", AT: "w Austrii", LU: "w Luksemburgu", FR: "we Francji", IT: "we Włoszech", ES: "w Hiszpanii", CZ: "w Czechach", SE: "w Szwecji", DK: "w Danii", PL: "w Polsce", BY: "na Białorusi" };
  const PORTAL = { mobile: "mobile.de", autoscout: "AutoScout24", kleinanzeigen: "Kleinanzeigen", autoscoutfr: "AutoScout24 FR", paruvendu: "ParuVendu", marktplaats: "Marktplaats", dehands: "2dehands", otomoto: "otomoto", blocket: "Blocket", avby: "av.by" };
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

  function field(name, fallback, tag = "span", className = "") {
    // A text edited in Polish stays Polish: each language keeps its own edits.
    const key = ru() ? `ru:${name}` : name;
    const value = Object.prototype.hasOwnProperty.call(edits(), key) ? edits()[key] : fallback;
    const classes = [className, Object.prototype.hasOwnProperty.call(edits(), key) ? "isEdited" : ""].filter(Boolean).join(" ");
    return `<${tag}${classes ? ` class="${classes}"` : ""} data-edit="${esc(key)}"${editing ? ` contenteditable="true" spellcheck="true" lang="${ru() ? "ru" : "pl"}"` : ""}>${esc(value)}</${tag}>`;
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
  // "Bad Gögging, Niemcy" with the country's flag (inline SVG, market-badges.js).
  function placeHtml(city, country) {
    const code = String(country || "").toUpperCase();
    const flag = typeof window.AUTOGOOD_FLAG === "function" ? window.AUTOGOOD_FLAG(code) : "";
    const text = [city, countryName(code)].filter(Boolean).join(", ");
    return text ? `<span class="ofPlaceLine">${flag}<span>${esc(text)}</span></span>` : "";
  }
  const withFirm = (name) => (!name ? "" : /autogood/i.test(name) ? name : L(`${name} z AUTOGOOD`, `${name}, AUTOGOOD`));
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
      fuel: val(fuel),
      gearbox: val(gearbox),
      drive: val(specs.drive || ""),
      body: val(specs.body || AD?.bodyPl(car.body) || ""),
      color: val(specs.color || ""),
      interior: val(specs.interior || ""),
      owners: specs.owners,
      hu: val(specs.hu || ""),
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
      const net = view.netPrice ? L(` (netto ${money(view.netPrice, view.currency)})`, ` (нетто ${money(view.netPrice, view.currency)})`) : "";
      return L(`brutto · faktura VAT${rate}${net}`, `брутто · счёт-фактура VAT${rate}${net}`);
    }
    if (view.priceType === "margin") return L("brutto · faktura VAT marża", "брутто · счёт-фактура VAT marża");
    if (view.priceType === "private" || view.seller === "private") return L("osoba prywatna (bez faktury VAT)", "частное лицо (без счёта-фактуры VAT)");
    return L("brutto", "брутто");
  }

  // Under the price (owner 2026-10-10): can the car be bought net (VAT to
  // deduct) or on a margin invoice only.
  function buyAsText(view) {
    if (view.priceType === "vat" || offer.ad?.vat?.deductible) {
      const rate = view.vatRate ? ` ${view.vatRate}%` : "";
      return view.netPrice
        ? L(`Można kupić netto: ${money(view.netPrice, view.currency)} (VAT${rate} do odliczenia)`, `Можно купить по нетто: ${money(view.netPrice, view.currency)} (VAT${rate} к вычету)`)
        : L(`Faktura VAT${rate} - VAT do odliczenia`, `Счёт-фактура VAT${rate} - VAT к вычету`);
    }
    if (view.priceType === "private" || view.seller === "private") return L("Sprzedawca prywatny - bez faktury VAT", "Частный продавец - без счёта-фактуры VAT");
    return L("Tylko VAT marża (bez odliczenia VAT)", "Только VAT marża (без вычета VAT)");
  }

  // How the car is bought (owner 2026-10-10, chosen when the offer is made):
  // straight from the dealer, or through AUTOGOOD on a VAT 23% invoice (the
  // car net) or on a VAT margin invoice (the car gross). It picks the cost
  // lines, the calculator's tab and steps 7 and 9 of the process.
  const METHODS = {
    direct: { tab: 0, label: "Zakup bezpośredni", labelRu: "Прямая покупка" },
    vat: { tab: 3, label: "Przez AUTOGOOD · faktura VAT 23%", labelRu: "Через AUTOGOOD · счёт-фактура VAT 23%" },
    margin: { tab: 4, label: "Przez AUTOGOOD · faktura VAT marża", labelRu: "Через AUTOGOOD · счёт-фактура VAT marża" },
  };
  const offerMethod = () => (METHODS[offer?.method] ? offer.method : "direct");
  const methodLabel = (key = offerMethod()) => L(METHODS[key].label, METHODS[key].labelRu);
  // The car's net price in EUR (VAT 23% way): the draft's, else the ad's.
  function netEur() {
    const estimate = offer.estimate || {};
    if (estimate.netEur > 0) return estimate.netEur;
    const net = Number(offer.car?.netPrice) || Number(offer.ad?.vat?.net) || 0;
    const currency = offer.ad?.currency || offer.car?.currency || "EUR";
    if (!net || !estimate.rate) return currency === "EUR" ? net : 0;
    const rates = TURNKEY?.currentRates?.() || {};
    return currency === "EUR" ? net : currency === "SEK" && rates.sek ? (net * rates.sek) / estimate.rate : currency === "PLN" ? net / estimate.rate : 0;
  }

  // The cost lines: the calculator's (wave 3) or the estimate made with the draft.
  function costs() {
    const calc = offer.calc;
    const method = offerMethod();
    // A calculation inserted for another way of buying is set aside.
    if (calc?.rows?.length && (calc.method || "direct") === method) {
      // Inserted in the other language: the calculator's own words (offer-ru.js)
      // for Polish lines in a Russian offer; a Russian calculation stays as is.
      const words = ru() && calc.lang !== "ru" ? RU.calc : (text) => text;
      const rate = calc.rate ? calc.rate.toFixed(2).replace(".", ",") : "—";
      return {
        method: words(calc.methodLabel),
        rows: calc.rows.map((row) => ({ ...row, label: words(row.label) })),
        total: calc.total,
        note: L(`Kalkulator AUTOGOOD, kurs EUR ${rate} zł z dnia ${dateText(calc.at)}.`, `Калькулятор AUTOGOOD, курс EUR ${rate} zł на ${dateText(calc.at)}.`),
        exact: true,
      };
    }
    const estimate = offer.estimate;
    if (!estimate) return null;
    if (method !== "direct") return estimateThroughAutogood(estimate, method);
    const engineLabel = L(["elektryczny / plug-in do 2,0 l", "hybryda / plug-in powyżej 2,0 l", "hybryda do 2,0 l", "silnik do 2,0 l", "silnik powyżej 2,0 l"], ["электро / plug-in до 2,0 л", "гибрид / plug-in свыше 2,0 л", "гибрид до 2,0 л", "двигатель до 2,0 л", "двигатель свыше 2,0 л"])[estimate.engine?.index ?? 3];
    const rate = Number(estimate.rate || 0).toFixed(2).replace(".", ",");
    const parts = estimate.parts || {};
    const excise = String(Math.round((estimate.engine?.rate ?? 0.031) * 10000) / 100).replace(".", ",");
    const rows = [
      { label: L("Cena auta", "Цена авто"), sub: L(`${money(estimate.carBruttoEur, "EUR")} brutto × ${rate} zł`, `${money(estimate.carBruttoEur, "EUR")} брутто × ${rate} zł`), value: parts.car },
      { label: L("Transport do Polski", "Транспорт в Польшу"), sub: L("laweta, ubezpieczony", "автовоз, со страховкой"), value: parts.transport },
      { label: L("Oględziny przed zakupem", "Осмотр перед покупкой"), sub: L("rzeczoznawca u sprzedawcy", "эксперт у продавца"), value: parts.inspection },
      { label: L(`Akcyza ${excise}%`, `Акциз ${excise}%`), sub: engineLabel, value: parts.excise },
      { label: L("Usługa AUTOGOOD", "Услуга AUTOGOOD"), sub: L("1 829,27 zł + 1% ceny auta, netto + VAT", "1 829,27 zł + 1% цены авто, нетто + VAT"), value: parts.commission },
      { label: L("Tłumaczenia i przegląd techniczny", "Переводы и техосмотр"), sub: "250 zł + 150 zł", value: parts.fees },
    ];
    return { method: methodLabel("direct"), rows, total: estimate.total, note: L(`Szacunek kalkulatora AUTOGOOD, kurs EUR ${rate} zł z dnia oferty.`, `Оценка калькулятора AUTOGOOD, курс EUR ${rate} zł на дату предложения.`), exact: false };
  }

  // Through AUTOGOOD, as the calculator counts it (src/main.jsx calculate(),
  // tab 3 "Dealerzy VAT 23%" and tab 4 "Dealerzy VAT Marża", not financed):
  // VAT 23% — every line net, VAT 23% on the sum; margin — the car gross,
  // the other lines with VAT. Fee: 1 829,27 zł + 2% (of the car with VAT on
  // the VAT way). The calculator's own lines replace these when inserted.
  function estimateThroughAutogood(estimate, method) {
    const rate = Number(estimate.rate) || 4.4;
    const rateText = rate.toFixed(2).replace(".", ",");
    const exciseRate = estimate.engine?.rate ?? 0.031;
    const exciseText = String(Math.round(exciseRate * 10000) / 100).replace(".", ",");
    const transport = Number(estimate.transportNetto) || 0;
    const inspection = Number(estimate.inspectionNetto) || 0;
    const FIX = 1829.27;
    const TO = 150;
    const round = (value) => Math.round(value);
    if (method === "vat") {
      const net = netEur();
      if (!(net > 0)) return null;
      const car = net * rate;
      const excise = exciseRate * car;
      const fee = FIX + 0.02 * car * 1.23;
      const base = car + inspection + transport + excise + fee + TO;
      const vat = base * 0.23;
      return {
        method: methodLabel("vat"),
        rows: [
          { label: L("Cena auta netto", "Цена авто нетто"), sub: L(`${money(net, "EUR")} netto × ${rateText} zł`, `${money(net, "EUR")} нетто × ${rateText} zł`), value: round(car) },
          { label: L("Transport do Polski", "Транспорт в Польшу"), sub: L("laweta, ubezpieczony · netto", "автовоз, со страховкой · нетто"), value: round(transport) },
          { label: L("Oględziny przed zakupem", "Осмотр перед покупкой"), sub: L("rzeczoznawca u sprzedawcy · netto", "эксперт у продавца · нетто"), value: round(inspection) },
          { label: L(`Akcyza ${exciseText}%`, `Акциз ${exciseText}%`), sub: "", value: round(excise) },
          { label: L("Usługa AUTOGOOD", "Услуга AUTOGOOD"), sub: L("1 829,27 zł + 2% ceny auta z VAT · netto", "1 829,27 zł + 2% цены авто с VAT · нетто"), value: round(fee) },
          { label: L("Przegląd techniczny", "Техосмотр"), sub: L("netto", "нетто"), value: TO },
          { label: "VAT 23%", sub: L(`23% × ${money(base, "PLN")}`, `23% × ${money(base, "PLN")}`), value: round(vat) },
        ],
        total: Math.round((base + vat) / 50) * 50,
        note: L(`Szacunek kalkulatora AUTOGOOD, kurs EUR ${rateText} zł z dnia oferty. Faktura VAT 23% od AUTOGOOD.`, `Оценка калькулятора AUTOGOOD, курс EUR ${rateText} zł на дату предложения. Счёт-фактура VAT 23% от AUTOGOOD.`),
        exact: false,
      };
    }
    const gross = Number(estimate.carBruttoEur) || 0;
    if (!(gross > 0)) return null;
    const car = gross * rate;
    const excise = exciseRate * car;
    const fee = FIX + 0.02 * car;
    const total = car + (inspection + transport + excise + fee + TO) * 1.23;
    return {
      method: methodLabel("margin"),
      rows: [
        { label: L("Cena auta", "Цена авто"), sub: L(`${money(gross, "EUR")} brutto × ${rateText} zł`, `${money(gross, "EUR")} брутто × ${rateText} zł`), value: round(car) },
        { label: L("Transport do Polski", "Транспорт в Польшу"), sub: L("laweta, ubezpieczony · z VAT", "автовоз, со страховкой · с VAT"), value: round(transport * 1.23) },
        { label: L("Oględziny przed zakupem", "Осмотр перед покупкой"), sub: L("rzeczoznawca u sprzedawcy · z VAT", "эксперт у продавца · с VAT"), value: round(inspection * 1.23) },
        { label: L(`Akcyza ${exciseText}%`, `Акциз ${exciseText}%`), sub: L("z VAT", "с VAT"), value: round(excise * 1.23) },
        { label: L("Usługa AUTOGOOD", "Услуга AUTOGOOD"), sub: L("1 829,27 zł + 2% ceny auta, netto + VAT", "1 829,27 zł + 2% цены авто, нетто + VAT"), value: round(fee * 1.23) },
        { label: L("Przegląd techniczny", "Техосмотр"), sub: L("z VAT", "с VAT"), value: round(TO * 1.23) },
      ],
      total: Math.round(total / 50) * 50,
      note: L(`Szacunek kalkulatora AUTOGOOD, kurs EUR ${rateText} zł z dnia oferty. Faktura VAT marża od AUTOGOOD.`, `Оценка калькулятора AUTOGOOD, курс EUR ${rateText} zł на дату предложения. Счёт-фактура VAT marża от AUTOGOOD.`),
      exact: false,
    };
  }

  function marketView(view) {
    const own = offer.market?.own || null;
    if (!own?.stats) return null;
    const near = own.similar?.stats?.count >= 6 ? own.similar : null;
    const stats = near ? near.stats : own.stats;
    const dearer = near ? near.dearerShare : own.dearerShare;
    const whereIn = ru() ? RU.countryIn(own.country) : COUNTRY_IN[own.country];
    const where = own.scope === "country" && whereIn ? whereIn : L("w Europie (kraje z wyszukiwania)", "в Европе (страны поиска)");
    const rule = near?.rule;
    const ruleText = rule ? [rule.yearFrom ? L(`rok ${rule.yearFrom}–${rule.yearTo}`, `год ${rule.yearFrom}–${rule.yearTo}`) : "", rule.kmTo ? L(`przebieg ${thousands(rule.kmFrom)}–${thousands(rule.kmTo)} tys. km`, `пробег ${thousands(rule.kmFrom)}–${thousands(rule.kmTo)} тыс. км`) : ""].filter(Boolean).join(", ") : "";
    const cheaperShare = dearer ?? 0;
    const count = numbers.format(stats.count);
    const rest = `${where}${ruleText ? ` (${ruleText})` : ""}`;
    const lead = cheaperShare >= 0.5
      ? L(`Tańsze niż ${percent(cheaperShare)} z ${count} ${near ? "podobnych ofert" : "ofert o tych parametrach"} ${rest}.`, `Дешевле, чем ${percent(cheaperShare)} из ${count} ${near ? "похожих предложений" : "предложений с такими параметрами"} ${rest}.`)
      : L(`Cena w ${cheaperShare >= 0.25 ? "środku" : "górnej części"} rynku: ${count} ${near ? "podobnych ofert" : "ofert"} ${rest}.`, `Цена в ${cheaperShare >= 0.25 ? "середине" : "верхней части"} рынка: ${count} ${near ? "похожих предложений" : "предложений"} ${rest}.`);
    const lo = Math.min(stats.p25 - (stats.p75 - stats.p25) * 0.9, view.price) * 0.99;
    const hi = Math.max(stats.p75 + (stats.p75 - stats.p25) * 0.9, view.price) * 1.01;
    const at = (value) => Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
    const vsMedian = stats.median ? view.price / stats.median - 1 : 0;
    return { stats, near, lead, at, vsMedian, where, share: cheaperShare, count: stats.count, typical: L(`Połowa ofert kosztuje ${money(stats.p25, own.currency)}–${money(stats.p75, own.currency)}.`, `Половина предложений стоит ${money(stats.p25, own.currency)}–${money(stats.p75, own.currency)}.`), currency: own.currency };
  }

  function polandView() {
    const poland = offer.market?.poland;
    if (!poland?.basis?.median) return null;
    const total = costs()?.total || poland.turnkey;
    const saving = total ? Math.round(poland.basis.median - total) : null;
    const rule = poland.similar?.rule;
    const ruleText = poland.basis.kind === "similar" && rule ? [rule.yearFrom ? L(`rok ${rule.yearFrom}–${rule.yearTo}`, `год ${rule.yearFrom}–${rule.yearTo}`) : "", rule.kmTo ? L(`do ${thousands(rule.kmTo)} tys. km`, `до ${thousands(rule.kmTo)} тыс. км`) : ""].filter(Boolean).join(", ") : "";
    return {
      median: poland.basis.median,
      count: poland.basis.count,
      saving,
      line: L(`W Polsce takie auto: mediana ${money(poland.basis.median, "PLN")} (otomoto, ${numbers.format(poland.basis.count)} ${plural(poland.basis.count, "oferta", "oferty", "ofert")}${ruleText ? `, ${ruleText}` : ""}).`,
        `В Польше такое авто: медиана ${money(poland.basis.median, "PLN")} (otomoto, ${numbers.format(poland.basis.count)} ${RU?.plural(poland.basis.count, "предложение", "предложения", "предложений") || ""}${ruleText ? `, ${ruleText}` : ""}).`),
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
    const forWhom = client.name ? `${L("Przygotowano dla", "Подготовлено для")}: <b>${esc(client.name)}</b><br>` : "";
    return `
      <header class="ofHead">
        <img class="ofLogo" src="./assets/autogood-logo.png" alt="AUTOGOOD" />
        <span class="ofLogoText" aria-hidden="true"><img src="./assets/ag-opt.svg" alt="" /><span>AUTOGOOD</span></span>
        <div class="ofHeadMeta">
          ${forWhom}${esc(dateText(offer.createdAt))}
        </div>
      </header>`;
  }

  // Three figures beside the price ("Raport"): against the median, the share
  // of dearer offers or the saving against Poland, the verdict.
  function kpiHtml(market, poland, verdict) {
    const tiles = [];
    if (market) {
      tiles.push({ label: L("Na tle rynku", "На фоне рынка"), value: `${market.vsMedian <= 0 ? "−" : "+"}${percent(market.vsMedian)}`, note: L("od mediany podobnych ofert", "от медианы похожих предложений"), tone: market.vsMedian <= -0.03 ? "isGood" : market.vsMedian > 0.05 ? "isWarn" : "" });
      if (poland?.saving >= 1000 && !polandHidden(poland)) tiles.push({ label: L("Taniej niż w Polsce", "Дешевле, чем в Польше"), value: `${L("ok.", "ок.")} ${money(Math.round(poland.saving / 500) * 500, "PLN")}`, note: L(`mediana otomoto ${money(poland.median, "PLN")}`, `медиана otomoto ${money(poland.median, "PLN")}`), tone: "isGood" });
      else tiles.push({ label: L("Tańsze niż", "Дешевле, чем"), value: percent(market.share || 0), note: L(`z ${numbers.format(market.count)} ofert`, `из ${numbers.format(market.count)} предложений`), tone: (market.share || 0) >= 0.5 ? "isGood" : "" });
    }
    if (verdict) tiles.push({ label: L("Ocena AUTOGOOD", "Оценка AUTOGOOD"), value: L({ ok: "Polecamy", check: "Do weryfikacji", risk: "Odradzamy" }, { ok: "Рекомендуем", check: "На проверку", risk: "Не советуем" })[verdict.level], note: (() => {
      const good = verdict.all.filter((line) => line.level === "ok").length;
      const check = verdict.all.filter((line) => line.level === "warn" || line.level === "risk").length;
      return L(`${good} ${plural(good, "mocna strona", "mocne strony", "mocnych stron")} · ${check} do sprawdzenia`, `${good} ${RU?.plural(good, "сильная сторона", "сильные стороны", "сильных сторон") || ""} · ${check} на проверку`);
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

  // Without Monitoring (an offer made from a link, program 06): the portal's
  // own scale of prices — mobile.de's five bands from "bardzo dobra" to
  // "wysoka cena", AutoScout24's median — and Carvago's lines.
  const BANDS_PL = ["bardzo dobra cena", "dobra cena", "uczciwa cena", "podwyższona cena", "wysoka cena"];
  const BANDS_RU = ["очень хорошая цена", "хорошая цена", "справедливая цена", "повышенная цена", "высокая цена"];
  const RATING_BAND = { VERY_GOOD_PRICE: 0, GOOD_PRICE: 1, REASONABLE_PRICE: 2, INCREASED_PRICE: 3, HIGH_PRICE: 4 };
  const euroNumber = (label) => Number(String(label || "").replace(/[^\d]/g, "")) || 0;
  function carvagoLines() {
    if (!offer.carvago?.found || isHidden("carvago")) return "";
    const active = offer.carvago.active;
    const scope = active?.kind === "search" ? L(` (rok ${active.yearFrom}-${active.yearTo}, przebieg ${thousands(active.kmFrom)}-${thousands(active.kmTo)} tys. km)`, ` (год ${active.yearFrom}-${active.yearTo}, пробег ${thousands(active.kmFrom)}-${thousands(active.kmTo)} тыс. км)`) : "";
    return active?.count ? `<p class="ofActive">${field("carvagoActive", L(`Aktywnych podobnych ofert w Europie: ${numbers.format(active.count)}${scope}`, `Активных похожих предложений в Европе: ${numbers.format(active.count)}${scope}`), "span")}</p>` : "";
  }
  function portalMarket(view) {
    const rating = offer.ad?.portalPrice;
    const limits = (rating?.thresholds || []).map(euroNumber);
    const band = RATING_BAND[rating?.rating];
    const BANDS = ru() ? BANDS_RU : BANDS_PL;
    let body = "";
    if (rating?.portal === "mobile.de" && limits.length === 6 && limits.every((value, index) => value > 0 && (!index || value > limits[index - 1])) && band !== undefined) {
      const low = limits[0];
      const span = limits[5] - low;
      const at = Math.min(98, Math.max(2, ((view.price - low) / span) * 100));
      const range = (index) => `${numbers.format(limits[index])}-${numbers.format(limits[index + 1])} €`;
      body = `
        <div class="ofBands" role="img" aria-label="${esc(L("Skala cen mobile.de", "Шкала цен mobile.de"))}: ${esc(BANDS[band])}">
          ${BANDS.map((name, index) => `<span class="ofBand is${index}" style="width:${(((limits[index + 1] - limits[index]) / span) * 100).toFixed(1)}%" title="${esc(`${name}: ${range(index)}`)}"></span>`).join("")}
          <span class="ofBarCar${band >= 3 ? " isDear" : ""}" style="left:${at.toFixed(1)}%"></span>
        </div>
        <div class="ofBarLegend"><span class="isCar">${L("to auto", "это авто")} ${esc(money(view.price, view.currency))}</span><span>${BANDS[2]} <b>${esc(range(2))}</b></span></div>
        ${field("marketLead", L(`Wg skali cen mobile.de dla tego auta: „${BANDS[band]}” (${range(band)}).`, `По шкале цен mobile.de для этого авто: «${BANDS[band]}» (${range(band)}).`), "p", "ofMarketLead")}
`;
    } else if (rating?.portal === "AutoScout24" && rating.median > 0 && view.price > 0) {
      const share = view.price / rating.median - 1;
      body = `${field("marketLead", L(`Mediana podobnych ofert wg AutoScout24: ${money(rating.median, "EUR")} - to auto ${share <= 0 ? `${percent(share)} taniej` : `${percent(share)} drożej`}.`, `Медиана похожих предложений по AutoScout24: ${money(rating.median, "EUR")} - это авто ${share <= 0 ? `на ${percent(share)} дешевле` : `на ${percent(share)} дороже`}.`), "p", "ofMarketLead")}`;
    }
    const carvago = carvagoLines();
    if (!body && !carvago && adHistory().days === null) return "";
    return `
            <section class="ofCard${blockClass("market")}" data-block="market">
              ${hideToggle("market")}
              <p class="ofCardHead">${icon("chart")}${L("Cena na tle rynku", "Цена на фоне рынка")}</p>
              ${body}
              ${carvago}
              <!--adAge-->
            </section>`;
  }

  // "+ 46 pozycji więcej w ogłoszeniu" — also redrawn by autoFit when it
  // takes options off a full sheet.
  function optionsMore(rest, listOnTwo) {
    if (rest <= 0) return L("Z listy wyposażenia w ogłoszeniu", "Из списка оснащения в объявлении");
    return `+ ${numbers.format(rest)} ${many(rest, ["pozycja", "pozycje", "pozycji"], ["позиция", "позиции", "позиций"])} ${L("więcej w ogłoszeniu", "ещё в объявлении")}${listOnTwo ? L(" (lista na str. 2)", " (список на стр. 2)") : ""}`;
  }

  function sheetOne(view) {
    const market = marketView(view);
    const portalCard = market ? "" : portalMarket(view);
    const poland = polandView();
    const costView = costs();
    const verdict = verdictView(view);
    const keyOptions = EQUIPMENT ? EQUIPMENT.keyOptions(offer.ad?.features || [], 12) : [];
    const allOptions = EQUIPMENT ? EQUIPMENT.list(offer.ad?.features || []) : [];
    // The full list is on page 2 only when the manager shows it there.
    const listOnTwo = !isHidden("allOptions") && (offer.shown || []).includes("allOptions");
    const salutation = SALUTATION[offer.client?.salutation] || SALUTATION.Pan;
    const manager = store.manager(offer.manager);
    const photo = edits().photo || view.images[0] || "";
    const chips = [];
    if (market && market.vsMedian <= -0.03) chips.push(`<span class="ofChip isGood">${icon("down")}${L(`${percent(market.vsMedian)} poniżej mediany rynku`, `на ${percent(market.vsMedian)} ниже медианы рынка`)}</span>`);
    if (poland?.saving >= 1000) chips.push(`<span class="ofChip isGood">${L(`ok. ${money(Math.round(poland.saving / 500) * 500, "PLN")} taniej niż w Polsce`, `ок. ${money(Math.round(poland.saving / 500) * 500, "PLN")} дешевле, чем в Польше`)}</span>`);
    const portalLabel = offer.ad?.portalPrice?.label || "";
    if (portalLabel && /dobra|uczciwa/.test(portalLabel) && !(portalCard.includes("ofBands") && !isHidden("market"))) chips.push(`<span class="ofChip">${esc(offer.ad.portalPrice.portal)}: ${esc(ru() ? BANDS_RU[BANDS_PL.indexOf(portalLabel)] || portalLabel : portalLabel)}</span>`);
    const hp = L("KM", "л.с.");
    const specs = [
      [L("1. rejestracja", "1-я регистрация"), view.reg],
      [L("Przebieg", "Пробег"), kmText(view.mileage)],
      [L("Silnik", "Двигатель"), [view.ccm ? `${String((Math.round(view.ccm / 100) / 10).toFixed(1)).replace(".", ",")} ${L("l", "л")}` : "", fuelShort(view.fuel)].filter(Boolean).join(" · ")],
      [L("Moc", "Мощность"), view.powerHp ? `${view.powerHp} ${hp} (${view.powerKw} ${L("kW", "кВт")})` : ""],
      [L("Skrzynia biegów", "Коробка передач"), view.gearbox],
      [L("Napęd", "Привод"), view.drive],
      [L("Kolor", "Цвет"), view.color],
      [L("Właściciele", "Владельцы"), view.owners === 0 ? L("brak (auto nowe)", "нет (новое авто)") : view.owners ? String(view.owners) : ""],
      [L("Nadwozie", "Кузов"), view.body],
      [L("Przegląd", "Техосмотр"), view.hu],
      [L("Wnętrze", "Салон"), view.interior],
      [L("Lokalizacja", "Местонахождение"), [view.city, countryName(view.country)].filter(Boolean).join(", ")],
    ].filter(([, value]) => value).slice(0, 8);
    const seller = offer.ad?.seller || null;
    const adAge = adHistory();
    const listedAt = adAge.kind === "listed" ? adAge.since : "";
    const listedDays = adAge.days ?? null;
    // The seller as figures across the card (owner 2026-10-10): a value, a word under it.
    const sellerFacts = [];
    if (seller?.rating?.reviews) {
      sellerFacts.push([`${icon("star")}${esc(Number(seller.rating.score).toFixed(1).replace(".", ","))}`, `${numbers.format(seller.rating.reviews)} ${many(seller.rating.reviews, ["opinia", "opinie", "opinii"], ["отзыв", "отзыва", "отзывов"])}`]);
      if (seller.rating.recommend !== null && seller.rating.recommend !== undefined) sellerFacts.push([`${esc(seller.rating.recommend)}%`, L("poleca", "рекомендуют")]);
    }
    const sinceYear = seller?.since ? String(seller.since).slice(0, 4) : "";
    if (sinceYear) sellerFacts.push([`${L("od", "с")} ${esc(sinceYear)}`, `${L("na", "на")} ${esc(seller.rating?.portal || PORTAL[offer.source] || L("portalu", "портале"))}`]);
    // Kleinanzeigen counts every ad of the seller, not only cars.
    if (seller?.stock) sellerFacts.push(offer.source === "kleinanzeigen"
      ? [esc(numbers.format(seller.stock)), `${many(seller.stock, ["ogłoszenie", "ogłoszenia", "ogłoszeń"], ["объявление", "объявления", "объявлений"])} ${L("na portalu", "на портале")}`]
      : [esc(numbers.format(seller.stock)), `${L(plural(seller.stock, "auto", "auta", "aut"), "авто")} ${L("w ofercie", "в продаже")}`]);
    const sellerName = seller?.name || (view.seller === "private" ? L("Osoba prywatna", "Частное лицо") : view.seller === "dealer" ? L("Dealer", "Дилер") : "");
    // How long the ad is on sale and how its price moved: in the market card
    // (owner 2026-10-10), the changes as a list with arrows, no chart.
    const adAgeText = listedDays !== null
      ? L(`To auto: <b>${numbers.format(listedDays)} ${daysWord(listedDays)}</b> w sprzedaży${!listedAt && adAge?.kind === "atLeast" ? " (co najmniej)" : ""}${adAge?.dropped ? `, cena obniżona ${adAge.drops}× (−${percent(adAge.share)})` : adAge?.changes?.length ? "" : ", cena bez zmian"}.`,
        `Это авто: <b>${numbers.format(listedDays)} ${daysWord(listedDays)}</b> в продаже${!listedAt && adAge?.kind === "atLeast" ? " (как минимум)" : ""}${adAge?.dropped ? `, цена снижена ${adAge.drops}× (−${percent(adAge.share)})` : adAge?.changes?.length ? "" : ", цена без изменений"}.`)
      : "";
    const adAgeHtml = adAgeText && !isHidden("adAge") ? `<div class="ofAdAge">${hideToggle("adAge")}<p>${adAgeText}</p>${priceMovesHtml(adAge.changes)}</div>` : "";
    return `
      <div class="ofSheet" data-sheet="1">
        <article class="ofPage${styleClass()}" data-page="1" lang="${ru() ? "ru" : "pl"}">
          ${headHtml(1, view)}
          <section class="ofHero">
            <div class="ofPhotoColumn">
              <figure class="ofPhoto">
                ${photo ? `<img src="${esc(photo)}" data-source="${esc(photo)}" alt="${esc(view.title)}" crossorigin="anonymous" data-photo-main${photoFrame()} />` : `<div class="ofPhotoEmpty">${icon("car")}<span>${reading ? L("Wczytuję zdjęcie z ogłoszenia…", "Загружаю фото из объявления…") : L("Zdjęcie z ogłoszenia pojawi się po wczytaniu danych", "Фото из объявления появится после загрузки данных")}</span></div>`}
                ${view.images.length > 1 ? `<span class="ofPhotoCount">${L(`${view.images.length} ${plural(view.images.length, "zdjęcie", "zdjęcia", "zdjęć")} w ogłoszeniu`, `${view.images.length} фото в объявлении`)}</span>` : ""}
              </figure>
              ${view.url ? `<a class="ofAdLink" href="${esc(view.url)}" target="_blank" rel="noopener">${icon("link")}<span>${L("Ogłoszenie na", "Объявление на")} ${esc(PORTAL[offer.source] || L("portalu", "портале"))}<small>${placeHtml(view.city, view.country)}</small></span></a>` : ""}
            </div>
            <div class="ofHeroInfo">
              <div class="ofHeroTitle">
                ${field("title", view.title, "h1", "ofTitle")}
              </div>
              ${costView ? `<div class="ofPriceBox">
                <p class="ofLabel">${L("Cena na gotowo w Polsce", "Цена «под ключ» в Польше")}*</p>
                <p class="ofPrice">${esc(money(costView.total, "PLN"))} <span class="ofPriceAd">(${offerMethod() === "vat" && netEur() > 0 ? `${esc(money(netEur(), "EUR"))} ${L("netto", "нетто")}` : `${esc(money(view.price, view.currency))} ${L("brutto", "брутто")}`})</span></p>
                <p class="ofMethodLine">${esc(methodLabel())}</p>
                ${field("buyAs", buyAsText(view), "p", "ofBuyAs")}
                ${isHidden("costs") ? field("priceAsk", L("Dokładną kalkulację przygotuje Pana opiekun - prosimy o kontakt.", "Чтобы получить точный расчёт, свяжитесь с менеджером."), "p", "ofPriceAsk") : ""}
                ${field("priceFoot", L("*Transport, oględziny, akcyza, przegląd techniczny, usługa AUTOGOOD, inne koszty.", "*Транспорт, осмотр, акциз, техосмотр, услуга AUTOGOOD, другие расходы."), "p", "ofPriceFoot")}
              </div>` : `<div class="ofPriceBox">
                <p class="ofLabel">${L("Cena w ogłoszeniu", "Цена в объявлении")}</p>
                <p class="ofPrice">${esc(money(view.price, view.currency))}</p>
                ${field("buyAs", buyAsText(view), "p", "ofBuyAs")}
                ${field("priceNoteAd", L("Koszt na gotowo policzymy indywidualnie.", "Стоимость «под ключ» рассчитаем индивидуально."), "p", "ofPriceFoot")}
              </div>`}
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
              <p class="ofCardHead">${icon("chart")}${L("Cena na tle rynku", "Цена на фоне рынка")}</p>
              <div class="ofBar" role="img" aria-label="${esc(market.lead)}">
                <span class="ofBarTrack"></span>
                <span class="ofBarBand" style="left:${market.at(market.stats.p25).toFixed(1)}%;width:${(market.at(market.stats.p75) - market.at(market.stats.p25)).toFixed(1)}%"></span>
                <span class="ofBarMedian" style="left:${market.at(market.stats.median).toFixed(1)}%"></span>
                <span class="ofBarCar${market.vsMedian > 0.03 ? " isDear" : ""}" style="left:${market.at(view.price).toFixed(1)}%"></span>
              </div>
              <div class="ofBarLegend"><span class="isCar">${L("to auto", "это авто")} ${esc(money(view.price, market.currency))}</span><span>${L("mediana", "медиана")} <b>${esc(money(market.stats.median, market.currency))}</b></span></div>
              ${field("marketLead", market.lead, "p", "ofMarketLead")}
              ${field("marketTypical", market.typical, "p", "ofSmall")}
              ${carvagoLines()}
              ${poland ? `<div class="ofPoland${polandHidden(poland) ? " ofBlockHidden" : ""}">${field("polandLine", poland.line, "span")}</div>` : ""}
              ${adAgeHtml}
            </section>` : portalCard.replace("<!--adAge-->", adAgeHtml)}
            ${verdict ? `
            <section class="ofCard${blockClass("verdict")}" data-block="verdict">
              ${hideToggle("verdict")}
              <p class="ofCardHead">${icon("shield")}${L("Ocena AUTOGOOD", "Оценка AUTOGOOD")}</p>
              <span class="ofVerdict is${verdict.level === "ok" ? "Ok" : verdict.level === "check" ? "Check" : "Risk"}">${icon(verdict.level === "ok" ? "check" : verdict.level === "check" ? "warn" : "risk")}${field("verdictLabel", verdict.label, "span")}</span>
              <ul class="ofChecks">
                ${verdict.lines.map((line) => `
                  <li class="ofCheck is${line.level.charAt(0).toUpperCase()}${line.level.slice(1)}${blockClass(`check:${line.id}`)}">${icon(line.level === "ok" ? "check" : line.level === "info" ? "info" : line.level)}<span>${field(`check:${line.id}`, line.text)}${line.quote ? `<q>${esc(line.quote)}</q>` : ""}${hideToggle(`check:${line.id}`)}</span></li>`).join("")}
              </ul>
              ${field("inspect", `${verdict.level === "ok" ? "* " : ""}${L("Przed zakupem przeprowadzimy diagnostykę i jazdę próbną, sprawdzimy dokumenty i historię auta.", "Перед покупкой проведём диагностику и тест-драйв, перепроверим документы и историю авто.")}`, "p", "ofInspect")}
            </section>` : ""}
          </div>
          <div class="ofGrid">
            <section class="ofCard${blockClass("equipment")}" data-block="equipment">
              ${hideToggle("equipment")}
              <p class="ofCardHead">${icon("list")}${L("Wyposażenie — najważniejsze", "Оснащение — главное")}</p>
              ${keyOptions.length
                ? `<div class="ofOptions">${keyOptions.map((item) => `<span class="ofOption">${esc(ru() ? RU.option(item.label) : item.label)}</span>`).join("")}</div>
                   <p class="ofOptionsMore" data-all="${allOptions.length}" data-list="${listOnTwo ? 1 : 0}">${esc(optionsMore(allOptions.length - keyOptions.length, listOnTwo))}</p>`
                : `<p class="ofSmall">${reading ? L("Wczytuję wyposażenie z ogłoszenia…", "Загружаю оснащение из объявления…")
                  : offer.ad?.complete ? (allOptions.length ? `${numbers.format(allOptions.length)} ${many(allOptions.length, ["pozycja", "pozycje", "pozycji"], ["позиция", "позиции", "позиций"])} ${L("wyposażenia w ogłoszeniu", "оснащения в объявлении")}${listOnTwo ? L(" (lista na str. 2)", " (список на стр. 2)") : ""}` : L("Sprzedawca nie zaznaczył wyposażenia na liście portalu - potwierdzimy je przed zakupem.", "Продавец не отметил оснащение в списке портала - подтвердим его до покупки."))
                  : L("Wyposażenie pojawi się po wczytaniu danych z ogłoszenia.", "Оснащение появится после загрузки данных объявления.")}</p>`}
            </section>
            <section class="ofCard${blockClass("seller")}" data-block="seller">
              ${hideToggle("seller")}
              <p class="ofCardHead">${icon("store")}${L("Sprzedawca", "Продавец")}</p>
              ${sellerName ? `<p class="ofSellerName">${esc(sellerName)}</p>` : ""}
              ${sellerFacts.length ? `<div class="ofSellerFacts">${sellerFacts.map(([value, word]) => `<div><b>${value}</b><span>${word}</span></div>`).join("")}</div>` : ""}
              ${seller?.city || view.city ? `<p class="ofSmall ofPlace">${placeHtml(seller?.city || view.city, seller?.country || view.country)}</p>` : ""}
            </section>
          </div>
          <footer class="ofFoot">
            <span><b>AUTOGOOD</b> · ${L("import aut z Europy", "импорт авто из Европы")}</span>
          </footer>
        </article>
      </div>`;
  }

  // ---- How long the car is for sale and how its price moved --------------------
  // The earliest date any source knows (the portal, our Monitoring, Carvago)
  // and every price drop seen (Monitoring checks, the portal's own earlier
  // price, Carvago's price history).
  function adHistory() {
    const own = offer.market?.ad || {};
    const carvago = offer.carvago?.found ? offer.carvago : null;
    const dates = [offer.ad?.listedAt, carvago?.listedSince, own.since].filter((value) => value && Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b));
    const since = dates[0] || "";
    const days = since ? Math.max(0, Math.floor((Date.now() - Date.parse(since)) / 86400000)) : own.days ?? null;
    const carvagoDrops = (carvago?.changes || []).filter((change) => change.share < 0);
    const carvagoShare = carvagoDrops.reduce((total, change) => total * (1 + change.share), 1) - 1;
    const useCarvago = carvagoDrops.length > (own.drops || 0);
    return {
      ...own,
      since,
      days,
      kind: since && since === own.since ? own.kind : "listed",
      dropped: Boolean(own.dropped || carvagoDrops.length),
      drops: useCarvago ? carvagoDrops.length : own.drops || 0,
      share: useCarvago ? carvagoShare : own.share || 0,
      changes: carvago?.changes || [],
      history: carvago?.history || [],
    };
  }

  // Each price change of the ad, oldest first: ↓ green when it dropped, ↑ red
  // when it rose, with the date and the percent (owner 2026-10-10: a list, no chart).
  function priceMovesHtml(changes) {
    const moves = (changes || []).filter((change) => change.at && Number.isFinite(change.share) && change.share !== 0);
    if (!moves.length) return "";
    return `<ul class="ofMoves">${moves.slice(-4).map((change) => `<li class="${change.share < 0 ? "isDown" : "isUp"}"><span aria-hidden="true">${change.share < 0 ? "↓" : "↑"}</span>${esc(dateText(change.at))} <b>${change.share < 0 ? "−" : "+"}${(Math.abs(change.share) * 100).toFixed(1).replace(".", ",")}%</b></li>`).join("")}</ul>`;
  }

  // ---- Sheet 2: what happens next (owner 2026-10-06, steps 2026-10-10) -----
  // From the first call to the keys, step by step, so the client sees at once
  // what comes after what, when the work starts and when he pays. The owner's
  // ten steps (2026-10-10); steps 7 and 9 depend on how the car is bought.
  // Colour: one per group of steps, from green to deep navy (a gradient over
  // the whole way); headings only where the work, the purchase and the
  // delivery begin.
  const PROCESS_GROUPS = ["#3a9d5d", "#23806b", "#1d6585", "#1a4d7a", "#13365c"];
  const PROCESS_STAGES = {
    2: { label: "Rozpoczęcie prac", labelRu: "Начало работ" },
    5: { label: "Zakup", labelRu: "Покупка" },
    7: { label: "Dostawa i odbiór", labelRu: "Доставка и получение" },
  };
  const viaAutogood = () => offerMethod() !== "direct";
  function processSteps() {
    const company = store.company(offer.company);
    const sample = /^https:\/\//.test(company.inspectionUrl || "") ? company.inspectionUrl : "";
    return [
      { group: 0, title: "Rozmowa", titleRu: "Разговор",
        text: "Omawiamy ofertę auta i wszystkie szczegóły importu.", textRu: "Обсуждаем предложение авто и все подробности импорта." },
      { group: 0, title: "Sprawdzenie informacji", titleRu: "Проверка информации",
        text: "Dzwonimy do dealera: dostępność, ogólny stan, VIN i historia serwisowa, prosimy o dodatkowe zdjęcia.",
        textRu: "Звоним дилеру: уточняем наличие, общее состояние, VIN и сервисную историю, запрашиваем дополнительные фото." },
      { group: 1, title: "Umowa i depozyt", titleRu: "Договор и депозит",
        text: "Podpisujemy umowę zdalnie lub w naszym biurze. {Pan} {v:wpłaca|wpłacają} depozyt 2000 zł na oględziny auta.",
        textRu: "Подписываем договор дистанционно или в нашем офисе. Вы вносите депозит 2000 zł на осмотр авто.",
        mark: { kind: "pay", label: "Płatność 1 · depozyt 2000 zł", labelRu: "Платёж 1 · депозит 2000 zł" } },
      { group: 1, title: "Rezerwacja auta", titleRu: "Резервация авто",
        text: "Uzgadniamy termin oględzin z naszym rzeczoznawcą. Jeśli dealer na to pozwala, rezerwujemy auto.",
        textRu: "Согласовываем сроки осмотра с нашим осмотрщиком. Если дилер это позволяет, резервируем авто." },
      { group: 1, title: "Oględziny", titleRu: "Осмотр",
        text: "Nasz specjalista sprawdza auto na miejscu: lakier, diagnostyka, jazda próbna, nadwozie, wnętrze i elektronika. {Pan} {v:dostaje|dostają} pełny raport z rekomendacją.",
        textRu: "Наш специалист проверяет авто на месте: ЛКП, диагностика, тест-драйв, кузов, салон, электроника. Вы получаете полный отчёт с рекомендацией.",
        link: sample ? { url: sample, label: "Zobacz przykładowe oględziny", labelRu: "Посмотреть, как выглядит осмотр" } : null,
        mark: { kind: "decision", label: "{Pana} decyzja: kupujemy?", labelRu: "Ваше решение: покупаем?" } },
      { group: 2, title: "Negocjacje i umowa", titleRu: "Переговоры и договор",
        text: "Negocjujemy cenę i warunki zakupu - 70% wynegocjowanego rabatu zostaje dla {Pana}. Sprawdzamy umowę i fakturę.",
        textRu: "Торгуемся о цене и условиях покупки - 70% выторгованной скидки остаётся Вам. Проверяем договор и счёт." },
      viaAutogood()
        ? { group: 2, title: "Płatność za auto", titleRu: "Оплата за авто",
          text: "{Pan} {v:przelewa|przelewają} za auto (w złotych lub euro) w ciągu 2 dni roboczych na podstawie faktury AUTOGOOD.",
          textRu: "Вы делаете перевод за авто (в злотых или евро) в течение 2 рабочих дней по фактуре от AUTOGOOD.",
          mark: { kind: "pay", label: "Płatność 2 · cena auta", labelRu: "Платёж 2 · цена авто" } }
        : { group: 2, title: "Płatność za auto", titleRu: "Оплата за авто",
          text: "{Pan} {v:przelewa|przelewają} za auto w euro bezpośrednio do dealera.",
          textRu: "Вы делаете перевод за авто в евро напрямую дилеру.",
          mark: { kind: "pay", label: "Płatność 2 · cena auta", labelRu: "Платёж 2 · цена авто" } },
      { group: 3, title: "Transport i kontrola", titleRu: "Транспорт и проверка",
        text: "Przywozimy auto lawetą na nasz plac w Łomiankach - w transporcie jest w pełni ubezpieczone. Po rozładunku ponownie porównujemy stan auta z raportem z oględzin.",
        textRu: "Привозим авто автовозом на нашу площадку в Ломянках. Авто полностью застраховано во время перевозки. После разгрузки повторно сверяем состояние авто с отчётом осмотра." },
      viaAutogood()
        ? { group: 4, title: "Dokumenty i odbiór", titleRu: "Документы и получение",
          text: "Robimy przegląd techniczny i akcyzę. Przygotowujemy rozliczenie końcowe i wysyłamy komplet dokumentów do rejestracji - {Panu} zostaje rejestracja i OC.",
          textRu: "Делаем ТО и акциз. Готовим окончательный расчёт авто к выдаче и высылаем пакет документов к регистрации. Вам остаются регистрация и страховка OC.",
          mark: { kind: "pay", label: "Płatność 3 · rozliczenie końcowe", labelRu: "Платёж 3 · окончательный расчёт" } }
        : { group: 4, title: "Dokumenty i odbiór", titleRu: "Документы и получение",
          text: "Robimy przegląd techniczny i tłumaczenia, pomagamy w akcyzie. Przygotowujemy rozliczenie końcowe i wysyłamy komplet dokumentów do rejestracji - {Panu} zostaje rejestracja i OC.",
          textRu: "Делаем ТО и переводы, помогаем в оформлении акциза. Готовим окончательный расчёт авто к выдаче и высылаем пакет документов к регистрации. Вам остаются регистрация и страховка OC.",
          mark: { kind: "pay", label: "Płatność 3 · rozliczenie końcowe", labelRu: "Платёж 3 · окончательный расчёт" } },
      { group: 4, title: "Odbiór auta", titleRu: "Получение авто",
        text: "Jeśli trzeba, zajmujemy się dodatkowymi pracami (serwis, polerowanie, czyszczenie) i dowozimy auto pod {Pana} adres. Ceny ustalamy osobno.",
        textRu: "Если нужно, занимаемся всеми необходимыми доработками: сервис, полировка, чистка и т.д., и привозим авто на Ваш адрес. Цены оговариваем отдельно." },
    ];
  }
  // Pan / Pani / Państwo in the step texts.
  function addressed(text) {
    const form = offer.client?.salutation === "Pani" ? 1 : offer.client?.salutation === "Państwo" ? 2 : 0;
    const words = { "{Pan}": ["Pan", "Pani", "Państwo"], "{Pana}": ["Pana", "Pani", "Państwa"], "{Panu}": ["Panu", "Pani", "Państwu"] };
    return String(text)
      .replace(/\{v:([^|}]*)\|([^}]*)\}/g, (_, singular, plural) => (form === 2 ? plural : singular))
      .replace(/\{Pan[au]?\}/g, (token) => words[token][form]);
  }

  function markHtml(step, index) {
    if (!step.mark) return "";
    return `<span class="ofMark is${step.mark.kind === "pay" ? "Pay" : "Decision"}">${icon(step.mark.kind === "pay" ? "receipt" : "check")}${field(`processMark${index + 1}`, L(addressed(step.mark.label), step.mark.labelRu))}</span>`;
  }
  function stepBody(step, index) {
    // The texts of steps 7 and 9 change with the way of buying: their edits too.
    const key = (name) => ([6, 8].includes(index) ? `${name}:${viaAutogood() ? "ag" : "direct"}` : name);
    return `${field(key(`process${index + 1}Title`), L(step.title, step.titleRu), "b", "ofStepTitle")}${field(key(`process${index + 1}`), L(addressed(step.text), step.textRu), "p", "ofStepText")}${step.link ? `<a class="ofStepLink" href="${esc(step.link.url)}" target="_blank" rel="noopener">${icon("link")}${esc(L(step.link.label, step.link.labelRu))}</a>` : ""}`;
  }
  function processTimeline() {
    return `<ol class="ofTimeline">${processSteps().map((step, index) => {
      const stage = PROCESS_STAGES[index];
      const color = PROCESS_GROUPS[step.group];
      const head = stage ? `<li class="ofTimeStage" style="--st:${color}"><span>${esc(L(stage.label, stage.labelRu))}</span></li>` : "";
      return `${head}<li class="ofTimeStep" style="--st:${color}"><span class="ofTimeNo">${index + 1}</span><div>${stepBody(step, index)}${markHtml(step, index)}</div></li>`;
    }).join("")}</ol>`;
  }

  function sheetTwo(view) {
    const costView = costs();
    const negotiation = VERDICT ? VERDICT.negotiation({ car: offer.car, ad: offer.ad, market: { ...offer.market, ad: adHistory() } }) : null;
    const allOptions = EQUIPMENT ? EQUIPMENT.list(offer.ad?.features || []) : [];
    const salutation = SALUTATION[offer.client?.salutation] || SALUTATION.Pan;
    const manager = store.manager(offer.manager);
    const company = store.company(offer.company);
    const initials = manager.name ? String(manager.name).split(/\s+/).map((word) => word.charAt(0)).join("").slice(0, 2).toUpperCase() : "AG";
    // The full calculation is the manager's choice (owner 2026-10-10): without
    // it the steps take the page's width and the rest goes under them.
    const withCosts = Boolean(costView) && !isHidden("costs");
    const costsHtml = costView ? `
      <section class="ofCard ofCostsCard${blockClass("costs")}" data-block="costs">
        ${hideToggle("costs")}
        <p class="ofCardHead">${icon("receipt")}${L("Koszt na gotowo", "Стоимость «под ключ»")}</p>
        <span class="ofMethod">${esc(costView.method)}</span>
        <table class="ofCosts">
          <tbody>
            ${costView.rows.map((row) => `<tr><td>${esc(row.label)}${row.sub ? `<small>${esc(String(row.sub).replace(/\s*=\s*$/, ""))}</small>` : ""}</td><td>${esc(money(row.value, "PLN"))}</td></tr>`).join("")}
            <tr class="isTotal"><td>${L("Razem na gotowo", "Итого «под ключ»")}</td><td>${esc(money(costView.total, "PLN"))}</td></tr>
          </tbody>
        </table>
        ${field("costsNote", costView.note, "p", "ofSmall")}
      </section>` : "";
    const negotiationHtml = negotiation ? `
      <section class="ofCard ofNegoCard${blockClass("negotiation")}" data-block="negotiation">
        ${hideToggle("negotiation")}
        <p class="ofCardHead">${icon("percent")}${L("Potencjał negocjacji", "Потенциал торга")}*</p>
        <p><span class="ofBig">${negotiation.from === negotiation.to ? `${negotiation.to}%` : `${negotiation.from}-${negotiation.to}%`}</span> <span class="ofSmall">${!negotiation.amountTo ? L("cena bez dużego pola do negocjacji", "цена без большого поля для торга")
          : negotiation.amountFrom ? L(`ok. ${esc(money(negotiation.amountFrom, negotiation.currency))}-${esc(money(negotiation.amountTo, negotiation.currency))} mniej`, `ок. ${esc(money(negotiation.amountFrom, negotiation.currency))}-${esc(money(negotiation.amountTo, negotiation.currency))} меньше`)
          : L(`do ok. ${esc(money(negotiation.amountTo, negotiation.currency))} mniej`, `до ок. ${esc(money(negotiation.amountTo, negotiation.currency))} меньше`)}</span></p>
        ${field("negotiationNote", L("*Wartości orientacyjne, ostateczna decyzja zawsze należy do sprzedawcy.", "*Ориентировочные значения, окончательное решение всегда за продавцом."), "p", "ofSmall")}
      </section>` : "";
    // The manager, and why the firm can be trusted (owner 2026-10-10): the
    // Google rating, the yard in Łomianki on the map, the hours.
    const mapsUrl = /^https:\/\//.test(company.mapsUrl || "") ? company.mapsUrl : "";
    const rating = company.googleRating && company.googleReviews
      ? `<p class="ofTrust">${icon("star")}<b>${esc(company.googleRating)}</b> ${esc(L(`średnia ocena z ${company.googleReviews} opinii w Google`, `средняя оценка из ${company.googleReviews} отзывов в Google`))}</p>` : "";
    const address = [company.name || "AUTOGOOD", company.address].filter(Boolean).join(" · ");
    const contactHtml = `
      <section class="ofCard ofContactCard${blockClass("contact")}" data-block="contact">
        ${hideToggle("contact")}
        <div class="ofContactMini">
          <div class="ofAvatar">${esc(initials)}</div>
          <div class="ofContactLines">
            <b>${esc(withFirm(manager.name) || "AUTOGOOD")}</b>
            <span class="ofSmall">${L(`${esc(salutation.owner)} opiekun`, "Ваш менеджер")}</span>
            ${manager.phone ? `<span>${icon("phone")}${esc(manager.phone)}</span>` : ""}
            ${manager.email ? `<span>${icon("mail")}${esc(manager.email)}</span>` : ""}
          </div>
        </div>
        ${rating}
        <p class="ofCompanyLine">${mapsUrl ? `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener">${icon("pin")}<span>${esc(address)}</span><span class="ofMapsTag">Google Maps</span></a>` : `${icon("pin")}<span>${esc(address)}</span>`}</p>
        ${company.hours ? `<p class="ofSmall ofHours">${esc(ru() && company.hours === store.COMPANY_DEFAULTS?.hours ? "пн-пт 9:00-17:00, сб по предварительной договорённости" : company.hours)}</p>` : ""}
      </section>`;
    const processHtml = `
      <section class="ofCard ofProcess${blockClass("process")}" data-block="process">
        ${hideToggle("process")}
        <p class="ofCardHead">${icon("route")}${field("processTitle", L("Co dalej: od pierwszej rozmowy do odbioru kluczyków", "Что дальше: от первого разговора до получения ключей"), "span")}</p>
        ${processTimeline()}
        ${field("processNote", L("Zwykle od 3 tygodni do 1,5 miesiąca od umowy do odbioru - zależnie od kraju i ścieżki zakupu.", "Обычно от 3 недель до 1,5 месяца от договора до получения авто - в зависимости от страны и способа покупки."), "p", "ofProcessNote")}
      </section>`;
    const optionsHtml = allOptions.length && !isHidden("allOptions") && (offer.shown || []).includes("allOptions") ? `
      <section class="ofCard isFull" data-block="allOptions">
        ${hideToggle("allOptions")}
        <p class="ofCardHead">${icon("list")}${L("Pełne wyposażenie z ogłoszenia", "Полное оснащение из объявления")} (${numbers.format(allOptions.length)})</p>
        <ul class="ofAllOptions">${allOptions.slice(0, 60).map((item) => `<li class="${item.strong ? "isStrong" : ""}">${esc(ru() ? RU.option(item.label) : item.label)}</li>`).join("")}</ul>
      </section>` : "";
    const body = withCosts
      ? `<div class="ofTwoCols"><div>${processHtml}</div><div class="ofSideCol">${costsHtml}${negotiationHtml}${contactHtml}</div></div>${optionsHtml}`
      : `${processHtml}<div class="ofBottomRow">${negotiationHtml}${contactHtml}</div>${optionsHtml}`;
    return `
      <div class="ofSheet${isHidden("page2") ? " isHiddenPage" : ""}" data-sheet="2">
        <article class="ofPage${styleClass()}${withCosts ? "" : " isProcessWide"}" data-page="2" lang="${ru() ? "ru" : "pl"}">
          ${headHtml(2, view)}
          <div class="ofPageTwo">${body}</div>
          <footer class="ofFoot">
            <span><b>AUTOGOOD</b> · ${L("import aut z Europy", "импорт авто из Европы")}</span>
          </footer>
        </article>
      </div>`;
  }

  function verdictView(view) {
    if (!VERDICT) return null;
    const result = VERDICT.assess({ car: offer.car, ad: offer.ad, market: offer.market, lang: ru() ? "ru" : "pl" });
    const level = offer.verdictLevel || result.verdict;
    const label = L({ ok: "Rekomendujemy do dalszego sprawdzenia*", check: "Do weryfikacji przed rezerwacją", risk: "Nie rekomendujemy" }, { ok: "Рекомендуем к дальнейшей проверке*", check: "Нужна проверка до резервации", risk: "Не рекомендуем" })[level];
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
      ["adAge", "Dni w sprzedaży i zmiany ceny"], ["carvago", "Aktywne podobne oferty (Carvago)"],
      ["page2", "Strona 2 w PDF"], ["process", "Co dalej (proces)"], ["costs", "Koszt na gotowo"], ["negotiation", "Potencjał negocjacji"], ["contact", "Kontakt"], ["allOptions", "Pełne wyposażenie (str. 2)"],
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
        <p>Utworzona ${esc(dateText(offer.createdAt))} ${esc(timeText(offer.createdAt))} ${offer.origin === "link" ? `z linku ogłoszenia (program „Oferta”). Bez danych rynku - pojawią się w ofercie z Monitoringu.` : `z Monitoringu: ${esc(offer.favoriteTitle || "")}. Rynek z dnia ${esc(dateText(offer.market?.at || offer.createdAt))}.`}</p>
        <div class="ofPanelRow">
          <label>Język oferty<select data-offer-lang><option value="pl"${ru() ? "" : " selected"}>PL · polski</option><option value="ru"${ru() ? " selected" : ""}>RU · rosyjski</option></select></label>
        </div>
        <div class="ofPanelRow">
          <label>Zwrot${ru() ? " (PL)" : ""}<select data-client-salutation>${Object.keys(SALUTATION).map((key) => `<option${client.salutation === key ? " selected" : ""}>${esc(key)}</option>`).join("")}</select></label>
          <label>Klient (opcjonalnie)<input data-client-name value="${esc(client.name || "")}" placeholder="np. Jan Kowalski" /></label>
        </div>
      </section>
      <section class="ofPanelCard">
        <h2>Wygląd oferty</h2>
        <div class="ofToggleList ofStyleList">${STYLES.map(([key, label, note]) => `<label><input type="radio" name="ofStyle" data-style="${key}"${currentStyle() === key ? " checked" : ""} /> <span><b>${esc(label)}</b><small>${esc(note)}</small></span></label>`).join("")}</div>
      </section>
      <section class="ofPanelCard">
        <h2>Carvago (dla opiekuna)</h2>
        ${readingCarvago ? "<p>Szukam tego auta na Carvago (rok + przebieg 1:1)…</p>"
          : offer.carvago?.found ? `<p class="ofPanelOk">Znalezione ${offer.carvago.by === "id" ? "po numerze ogłoszenia" : "po roku, przebiegu i modelu"}: w sprzedaży od ${esc(dateText(offer.carvago.listedSince))}, ${offer.carvago.changes.length ? `${offer.carvago.changes.length} zmian ceny` : "cena bez zmian"}${offer.carvago.active?.count ? `, ${numbers.format(offer.carvago.active.count)} podobnych aktywnych` : ""}.</p><p><a href="${esc(offer.carvago.url)}" target="_blank" rel="noopener">Otwórz na Carvago ↗</a> W ofercie dla klienta bez nazwy i cen Carvago (konkurent, ceny z ich marżą) - tylko daty, % zmian i liczba ofert.</p>`
          : offer.carvagoError ? `<p class="ofPanelError">Carvago nie odpowiedziało (${esc(offer.carvagoError)}).</p>`
          : offer.carvago ? "<p>Tego auta nie ma na Carvago (rok + przebieg 1:1).</p>" : "<p>Jeszcze nie sprawdzone.</p>"}
        <button class="offerButton isSmall" type="button" data-read-carvago${readingCarvago ? " disabled" : ""}>Sprawdź na Carvago</button>
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
        ${offer.calc && (offer.calc.method || "direct") === offerMethod()
          ? `<p class="ofPanelOk">Z kalkulatora: ${esc(offer.calc.methodLabel)}, ${esc(money(offer.calc.total, "PLN"))} (${esc(dateText(offer.calc.at))} ${esc(timeText(offer.calc.at))}).</p>`
          : `<p>Teraz: szacunek „${esc(METHODS[offerMethod()].label)}” z taryfą miejsca sprzedawcy.${offer.calc ? " Wstawiona kalkulacja dotyczy innego sposobu zakupu - nie jest pokazana." : ""} Wstaw dokładną kalkulację z kalkulatora.</p>`}
        <label>Sposób zakupu (zmienia koszt, plakietkę ceny i kroki 7 i 9)<select data-calc-method>${Object.entries(METHODS).map(([key, item]) => `<option value="${key}"${key === offerMethod() ? " selected" : ""}${key === "vat" && !(netEur() > 0) ? " disabled" : ""}>${esc(item.label)}</option>`).join("")}</select></label>
        <button class="offerButton isSmall" type="button" data-calc-open>${offer.calc ? "Zmień w kalkulatorze" : "Otwórz kalkulator"}</button>
        ${offer.calc ? '<button class="offerButton isSmall" type="button" data-calc-drop>Wróć do szacunku</button>' : ""}
      </section>
      ${verdict ? `
      <section class="ofPanelCard">
        <h2>Ocena</h2>
        <label>Werdykt<select data-verdict-level>
          <option value="">Automatycznie (${esc({ ok: "rekomendujemy", check: "do weryfikacji", risk: "nie rekomendujemy" }[verdict.auto])})</option>
          <option value="ok"${offer.verdictLevel === "ok" ? " selected" : ""}>Rekomendujemy do dalszego sprawdzenia</option>
          <option value="check"${offer.verdictLevel === "check" ? " selected" : ""}>Do weryfikacji przed rezerwacją</option>
          <option value="risk"${offer.verdictLevel === "risk" ? " selected" : ""}>Nie rekomendujemy</option>
        </select></label>
        <p>${verdict.all.filter((line) => line.level === "risk").length} czerwonych, ${verdict.all.filter((line) => line.level === "warn").length} żółtych, ${verdict.all.filter((line) => line.level === "ok").length} zielonych. Linie ukrywa się w trybie „Edytuj teksty”.</p>
      </section>` : ""}
      <section class="ofPanelCard">
        <h2>Bloki w PDF</h2>
        <div class="ofToggleList">${blocks.map(([key, label]) => `<label><input type="checkbox" data-block-toggle="${key}"${(key === "poland" ? polandHidden(polandView()) : key === "allOptions" ? !(offer.shown || []).includes("allOptions") || isHidden(key) : isHidden(key)) ? "" : " checked"} /> ${esc(label)}</label>`).join("")}</div>
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
        <div class="ofPanelRow">
          <label>Ocena Google<input data-company="googleRating" value="${esc(company.googleRating || "")}" placeholder="4,9" /></label>
          <label>Liczba opinii<input data-company="googleReviews" value="${esc(company.googleReviews || "")}" placeholder="126" /></label>
        </div>
        <label>Link Google Maps<input data-company="mapsUrl" value="${esc(company.mapsUrl || "")}" placeholder="https://maps.app.goo.gl/…" /></label>
        <label>Link do przykładowych oględzin (krok 5)<input data-company="inspectionUrl" value="${esc(company.inspectionUrl || "")}" placeholder="https://…" /></label>
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
  let fontsSettled = false;
  function render() {
    if (!offer) return;
    const view = carView();
    document.title = `AUTOGOOD Oferta ${offer.number || ""} — ${view.title}`;
    if (heading) heading.textContent = `Oferta ${offer.number || ""} · ${view.title}`;
    stage.classList.toggle("isEditing", editing);
    stage.classList.add("isScreen");
    stage.innerHTML = (sheetOne(view) + sheetTwo(view)).replace(/[\u2013\u2014]/g, "-");
    // A photo server that refuses other sites (otomoto) still shows the photo
    // on screen without CORS; the PDF reads its bytes another way (photoData).
    stage.querySelectorAll("img[data-photo-main]").forEach((image) => image.addEventListener("error", () => {
      if (!image.hasAttribute("crossorigin")) return;
      image.removeAttribute("crossorigin");
      image.src = image.dataset.source;
    }, { once: true }));
    panel.innerHTML = panelHtml(view);
    // Fitted again once the web fonts are in (a fallback font is wider and
    // would take options and checks off a sheet that has room for them).
    if (!fontsSettled && document.fonts?.status !== "loaded") {
      fontsSettled = true;
      document.fonts?.ready.then(() => render());
    }
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
      // Then the weakest of the ten options (longer names in Russian), six at least.
      const options = () => [...one.querySelectorAll(".ofOptions .ofOption")];
      const more = one.querySelector(".ofOptionsMore[data-all]");
      let cut = false;
      while (overflow(one) > 0 && options().length > 6) {
        options().pop().remove();
        cut = true;
      }
      if (cut && more) more.textContent = optionsMore(Number(more.dataset.all) - options().length, more.dataset.list === "1");
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
    } else if (target.matches("[data-offer-lang]")) {
      // The same offer in the other language; each language keeps its edits.
      save({ lang: target.value === "ru" ? "ru" : "pl" });
    } else if (target.matches("[data-calc-method]")) {
      save({ method: METHODS[target.value] ? target.value : "direct" });
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
    if (event.target.closest("[data-read-carvago]")) readCarvago();
    else if (event.target.closest("[data-calc-open]")) openCalculator(defaultTab());
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
  const defaultTab = () => METHODS[offerMethod()].tab;
  function calcUrl(tab) {
    const input = calcInput();
    const params = new URLSearchParams({ embed: "1", tab: String(tab), lang: ru() ? "ru" : "pl", car: String(Math.round(tab === 3 ? input.net : input.gross)), engine: String(input.engine) });
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
    // The calculator speaks the offer's language (calcUrl): its lines are kept so.
    return { tab: calcTab, method: item.key, methodLabel: methodLabel(item.key), rows, total, rate, lang: ru() ? "ru" : "pl", at: new Date().toISOString() };
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
    if (!offer || reading || !AD || !(AD.SOURCES || ["mobile", "autoscout"]).includes(offer.source) || !offer.url) return;
    reading = true;
    render();
    setStatus("Czytam ogłoszenie: zdjęcia, wyposażenie, sprzedawca…");
    try {
      const importer = params.get("mobiledeApi") || offer.importer || "";
      const ad = await AD.read(offer.source, offer.url, { importer });
      offer = (await store.update(offer.id, { ad, adError: "", adTriedAt: new Date().toISOString() })) || offer;
      setStatus(`Dane z ogłoszenia wczytane ${timeText(ad.readAt)}.`);
      readCarvago();
    } catch (error) {
      offer = (await store.update(offer.id, { adError: String(error?.message || error).slice(0, 160), adTriedAt: new Date().toISOString() })) || offer;
      setStatus(adErrorText(), true);
    } finally {
      reading = false;
      render();
    }
  }

  // The same car on Carvago: dates, price history, similar cars on sale.
  let readingCarvago = false;
  async function readCarvago() {
    const CARVAGO = window.AUTOGOOD_OFFER_CARVAGO;
    if (!offer || readingCarvago || !CARVAGO) return;
    readingCarvago = true;
    render();
    try {
      const view = carView();
      const rule = offer.market?.own?.similar?.rule || {};
      const result = await CARVAGO.find({
        brand: offer.filters?.brand || view.brand,
        model: offer.filters?.model || view.model,
        year: view.reg || view.year,
        mileage: view.mileage,
        source: offer.source,
        url: offer.url,
        adKey: offer.adKey,
        price: view.price,
        yearFrom: rule.yearFrom,
        yearTo: rule.yearTo,
        kmFrom: rule.kmFrom,
        kmTo: rule.kmTo,
      });
      offer = (await store.update(offer.id, { carvago: result || { found: false }, carvagoError: "" })) || offer;
    } catch (error) {
      offer = (await store.update(offer.id, { carvagoError: String(error?.message || error).slice(0, 160) })) || offer;
    } finally {
      readingCarvago = false;
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
  const fontCss = {};
  async function pageFontCss() {
    const lang = ru() ? "ru" : "pl";
    if (fontCss[lang] !== undefined) return fontCss[lang];
    // A Russian sheet needs the Cyrillic faces too (Inter, Playfair Display).
    const subsets = ru() ? ["latin", "latin-ext", "cyrillic", "cyrillic-ext"] : ["latin", "latin-ext"];
    try {
      const links = [...document.querySelectorAll('link[href*="fonts.googleapis.com/css"]')];
      const css = (await Promise.all(links.map(async (link) => (await fetch(link.href)).text()))).join("\n");
      const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
        .filter((match) => subsets.includes(match[1]))
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
      fontCss[lang] = inlined.join("\n");
    } catch {
      fontCss[lang] = "";
    }
    return fontCss[lang];
  }

  // One sheet drawn at its real size from a copy off screen, without the
  // manager's buttons, hidden blocks and edit marks.
  // A photo's bytes as a data: URL — straight from its server, else through
  // our Worker (it reads the photo servers of the portals it serves; otomoto's
  // olxcdn answers other sites now and then only, checked 2026-10-10).
  const photoCache = new Map();
  function photoData(src) {
    if (!photoCache.has(src)) {
      const worker = window.AUTOGOOD_WORKER_PROXY ?? "https://ag-proxy.autogood-crm.workers.dev/";
      const tries = [src, ...(worker && !src.startsWith(worker) ? [`${worker}${src}`] : [])];
      photoCache.set(src, (async () => {
        for (const url of tries) {
          try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const blob = await response.blob();
            if (!/^image\//.test(blob.type)) continue;
            return await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve("");
              reader.readAsDataURL(blob);
            });
          } catch {
            // The next way.
          }
        }
        return "";
      })());
    }
    return photoCache.get(src);
  }

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
      // Every photo drawn from bytes this page could read (data: URL), so a
      // photo server that refuses other sites (otomoto) does not leave a hole.
      await Promise.all([...copy.querySelectorAll("img")].map(async (image) => {
        const src = image.dataset.source || image.getAttribute("src") || "";
        if (!/^https:\/\//.test(src)) return;
        const data = await photoData(src);
        if (data) image.setAttribute("src", data);
      }));
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
    return `AUTOGOOD Oferta ${offer.number || ""} ${[view.brand, view.model].filter(Boolean).join(" ") || view.title}${ru() ? " RU" : ""} ${new Date().toISOString().slice(0, 10)}.${extension}`
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
    // An offer made from a link goes back to program 06 "Oferta".
    if (offer.origin === "link") {
      const back = document.querySelector(".offerBack");
      if (back) {
        back.href = "./oferty.html";
        back.textContent = "← Oferta";
      }
    }
    render();
    setStatus(`Oferta ${offer.number || ""} · zapisana w tej przeglądarce`);
    if (!offer.ad && !offer.adTriedAt) readAd();
    else if (!offer.carvago && !offer.carvagoError) readCarvago();
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
