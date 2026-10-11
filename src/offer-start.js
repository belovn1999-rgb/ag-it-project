/* AUTOGOOD program 06 "Oferta" (B71, owner 2026-10-10): offers in a nice
 * wrapping for interested clients — one car, no market analysis.
 *
 * First way — a dealer's ad link from any portal page 1 of "Wyszukiwanie i
 * analiza" reads (mobile.de through the importer on the Mac; AutoScout24,
 * Kleinanzeigen, Marktplaats, 2dehands, otomoto, Blocket, ParuVendu through
 * the market proxy; av.by through its own API — offer-ad.js). The portal is
 * read from the link itself; "Rozpoznaj" shows the car in the layout of page
 * 1's summary; "Przygotuj ofertę PDF" saves the draft (offer-store.js) with
 * the ad already read and opens oferta.html, where the manager checks it and
 * downloads the PDF. The PL / RU switch (as in "Wyszukiwanie i analiza")
 * speaks this page's language and makes the offer in it (offer.lang,
 * offer-ru.js). Second way — an auction report — src/auction-start.js.
 * docs/OFFER-PAGE.md §8.
 */
(() => {
  const AD = window.AUTOGOOD_OFFER_AD;
  const store = window.AUTOGOOD_OFFER_STORE;
  const EQUIPMENT = window.AUTOGOOD_OFFER_EQUIPMENT;
  const RU = window.AUTOGOOD_OFFER_RU;
  const FACTS = window.AUTOGOOD_OFFER_FACTS;
  const CATALOG = window.AUTOGOOD_MOBILE_MODEL_CATALOG?.groups || {};
  const params = new URLSearchParams(window.location.search);

  const form = document.querySelector("[data-os-form]");
  const input = document.querySelector("[data-os-url]");
  const readButton = document.querySelector("[data-os-read]");
  const status = document.querySelector("[data-os-status]");
  const portalBadge = document.querySelector("[data-os-portal]");
  const portalsLine = document.querySelector("[data-os-portals]");
  const carBox = document.querySelector("[data-os-car]");
  const recentBox = document.querySelector("[data-os-recent]");
  const recentList = document.querySelector("[data-os-recent-list]");
  if (!AD || !store || !form) return;

  const PORTAL = { mobile: "mobile.de", autoscout: "AutoScout24", autoscoutfr: "AutoScout24 FR", kleinanzeigen: "Kleinanzeigen", paruvendu: "ParuVendu", marktplaats: "Marktplaats", dehands: "2dehands · 2ememain", otomoto: "otomoto", blocket: "Blocket", avby: "av.by" };
  const PORTAL_ORDER = ["mobile", "autoscout", "kleinanzeigen", "marktplaats", "dehands", "otomoto", "blocket", "autoscoutfr", "paruvendu", "avby"];
  const COUNTRY = { DE: "Niemcy", NL: "Holandia", BE: "Belgia", FR: "Francja", AT: "Austria", LU: "Luksemburg", IT: "Włochy", ES: "Hiszpania", SE: "Szwecja", DK: "Dania", CZ: "Czechy", PL: "Polska", CH: "Szwajcaria", BY: "Białoruś" };

  // ---- Language: the page and the offer (owner 2026-10-10) ------------------------
  const LANG_KEY = "autogood.offer.lang.v1";
  let lang = "pl";
  try {
    lang = localStorage.getItem(LANG_KEY) === "ru" && RU ? "ru" : "pl";
  } catch {
    lang = "pl";
  }
  const TEXT = {
    pl: {
      title: "Oferta dla klienta", langLabel: "Język oferty", modeDealer: "Z ogłoszenia dealera", modeAuction: "Z raportu aukcji", soon: "wkrótce",
      linkTitle: "Link ogłoszenia", read: "Rozpoznaj", recent: "Ostatnie oferty", auctionLater: "Przygotujemy w osobnym kroku",
      portals: "Wklej link z: {list}. Portal rozpoznajemy po linku.",
      fullLink: "Wklej pełny link ogłoszenia (https://…).", unknownPortal: "Nie rozpoznaję portalu z tego linku. Obsługujemy: {list}.",
      reading: "Czytam ogłoszenie z {portal}: zdjęcia, dane, wyposażenie, sprzedawca…", read_ok: "Dane z ogłoszenia wczytane {time}.",
      importerDown: "Nie udało się odczytać ogłoszenia mobile.de: importer na Macu nie odpowiada ({reason}). Uruchom go albo otwórz stronę z ?mobiledeApi=…",
      readFailed: "Nie udało się odczytać ogłoszenia: {reason}.", makeFailed: "Nie udało się przygotować oferty: {reason}.",
      fromAd: "Auto z ogłoszenia", adOn: "ogłoszenie na {portal}", unknownPrice: "cena nieznana", gross: "brutto", vatInvoice: "faktura VAT", net: "netto",
      privateSeller: "osoba prywatna", noVat: "bez VAT do odliczenia", dealer: "dealer",
      bodyEngine: "Nadwozie i silnik", body: "Nadwozie", fuel: "Typ silnika", ccm: "Pojemność", power: "Moc", hp: "KM", kw: "kW", km: "km", cm3: "ccm",
      mileageDrive: "Przebieg i napęd", mileage: "Przebieg", reg: "1. rejestracja", gearbox: "Skrzynia", drive: "Napęd",
      equipment: "Wyposażenie", moreIn: "+ {n} w ogłoszeniu", noEquipment: "brak listy wyposażenia w ogłoszeniu", equipmentLater: "wyposażenie po pełnym odczycie",
      other: "Inne informacje", country: "Kraj", condition: "Stan", damaged: "uszkodzony", accidentFree: "bezwypadkowy (wg sprzedawcy)", color: "Kolor", seller: "Sprzedawca",
      basic: "Odczytano podstawowe dane. Zdjęcia, wyposażenie i sprzedawca pojawią się po pełnym odczycie (dla mobile.de potrzebny jest importer na Macu).",
      missing: "Nie udało się odczytać: {list}. Uzupełnisz to w ofercie poniżej (Edytuj ofertę).", missingWords: ["marka", "cena", "przebieg", "rok"],
      previewTitle: "Oferta {n}", opened: "Oferta {n} z {date}.", notFound: "Nie znaleziono tej oferty w tej przeglądarce.",
      method: "Sposób zakupu", methodDirect: "Zakup bezpośredni", methodVat: "Przez AUTOGOOD · VAT 23% (netto)", methodMargin: "Przez AUTOGOOD · VAT marża (brutto)",
      vatOnly: "tylko auto z VAT do odliczenia", marginOnly: "auto z ceną netto kupujemy bezpośrednio albo na VAT 23%", fullCalc: "Pełna kalkulacja w ofercie (str. 2)",
      client: "Klient", clientName: "imię i nazwisko (do e-maila)", calcTitle: "Kalkulacja", calcHint: "Popraw transport i oględziny — suma trafi do oferty jako cena na gotowo.",
      remove: "Usuń z listy", removeAsk: "Usunąć ofertę {n} z listy?",
      fromLink: "z linku", fromMonitoring: "z Monitoringu",
      newCar: "nowe (bez rejestracji)", range: "Zasięg", battery: "Bateria", kwh: "kWh", interior: "Wnętrze", availability: "Dostępność", inStock: "od ręki",
      whoBusiness: "tylko firmom", whoTrade: "tylko firmom i handlarzom", whoExport: "tylko na eksport",
      flagBusiness: "Dealer sprzedaje {who} — kupujemy tylko przez AUTOGOOD", flagNew: "Nowe auto · gwarancja fabryczna",
      flagAvailable: "U dealera {when}", flagInStock: "Dostępne od ręki", flagFee: "Opłata dealera za wydanie: {amount} — dodana do kalkulacji",
      flagFeeUnknown: "Dealer dolicza opłatę za wydanie — dopisz kwotę w kalkulatorze", feeLabel: "Opłata dealera za wydanie auta",
      businessOnly: "dealer sprzedaje tylko firmom — kupujemy przez AUTOGOOD",
      duplicate: "Na to ogłoszenie jest już oferta {n} z {date}.", openIt: "Otwórz ofertę {n}",
      steps: ["Łączę się z portalem…", "Czytam zdjęcia i dane auta…", "Czytam wyposażenie i sprzedawcę…", "Jeszcze chwila — portal odpowiada wolniej…"],
      turnkey: "{price} na gotowo", making: "Przygotowuję ofertę i obraz kalkulacji…",
    },
    ru: {
      title: "Предложение для клиента", langLabel: "Язык предложения", modeDealer: "Из объявления дилера", modeAuction: "Из отчёта аукциона", soon: "скоро",
      linkTitle: "Ссылка на объявление", read: "Распознать", recent: "Последние предложения", auctionLater: "Сделаем отдельным шагом",
      portals: "Вставьте ссылку с: {list}. Портал определяем по ссылке.",
      fullLink: "Вставьте полную ссылку на объявление (https://…).", unknownPortal: "Не узнаю портал по этой ссылке. Поддерживаем: {list}.",
      reading: "Читаю объявление с {portal}: фото, данные, оснащение, продавец…", read_ok: "Данные объявления загружены в {time}.",
      importerDown: "Не удалось прочитать объявление mobile.de: импортер на Маке не отвечает ({reason}). Запустите его или откройте страницу с ?mobiledeApi=…",
      readFailed: "Не удалось прочитать объявление: {reason}.", makeFailed: "Не удалось подготовить предложение: {reason}.",
      fromAd: "Авто из объявления", adOn: "объявление на {portal}", unknownPrice: "цена неизвестна", gross: "брутто", vatInvoice: "счёт-фактура с НДС", net: "нетто",
      privateSeller: "частное лицо", noVat: "без НДС к вычету", dealer: "дилер",
      bodyEngine: "Кузов и двигатель", body: "Кузов", fuel: "Тип двигателя", ccm: "Объём", power: "Мощность", hp: "л.с.", kw: "кВт", km: "км", cm3: "см³",
      mileageDrive: "Пробег и привод", mileage: "Пробег", reg: "1-я регистрация", gearbox: "Коробка", drive: "Привод",
      equipment: "Оснащение", moreIn: "+ {n} в объявлении", noEquipment: "в объявлении нет списка оснащения", equipmentLater: "оснащение после полного чтения",
      other: "Другое", country: "Страна", condition: "Состояние", damaged: "повреждён", accidentFree: "без ДТП (по словам продавца)", color: "Цвет", seller: "Продавец",
      basic: "Прочитаны основные данные. Фото, оснащение и продавец появятся после полного чтения (для mobile.de нужен импортер на Маке).",
      missing: "Не удалось прочитать: {list}. Допишете в предложении ниже («Править предложение»).", missingWords: ["марка", "цена", "пробег", "год"],
      previewTitle: "Предложение {n}", opened: "Предложение {n} от {date}.", notFound: "Это предложение не найдено в этом браузере.",
      method: "Способ покупки", methodDirect: "Прямая покупка", methodVat: "Через AUTOGOOD · НДС 23% (нетто)", methodMargin: "Через AUTOGOOD · НДС-маржа (брутто)",
      vatOnly: "только авто с НДС к вычету", marginOnly: "авто с ценой нетто покупаем напрямую или с НДС 23%", fullCalc: "Полный расчёт в предложении (стр. 2)",
      client: "Клиент", clientName: "имя и фамилия (для письма)", calcTitle: "Расчёт", calcHint: "Поправьте транспорт и осмотр — сумма попадёт в предложение как цена «под ключ».",
      remove: "Удалить из списка", removeAsk: "Удалить предложение {n} из списка?",
      fromLink: "из ссылки", fromMonitoring: "из Monitoring",
      newCar: "новое (без регистрации)", range: "Запас хода", battery: "Батарея", kwh: "кВт·ч", interior: "Салон", availability: "Наличие", inStock: "в наличии",
      whoBusiness: "только фирмам", whoTrade: "только фирмам и перекупщикам", whoExport: "только на экспорт",
      flagBusiness: "Дилер продаёт {who} — покупаем только через AUTOGOOD", flagNew: "Новое авто · заводская гарантия",
      flagAvailable: "У дилера {when}", flagInStock: "В наличии", flagFee: "Сбор дилера за выдачу: {amount} — добавлен в расчёт",
      flagFeeUnknown: "Дилер добавляет сбор за выдачу — впишите сумму в расчёт", feeLabel: "Сбор дилера за выдачу авто",
      businessOnly: "дилер продаёт только фирмам — покупаем через AUTOGOOD",
      duplicate: "На это объявление уже есть предложение {n} от {date}.", openIt: "Открыть предложение {n}",
      steps: ["Подключаюсь к порталу…", "Читаю фото и данные авто…", "Читаю оснащение и продавца…", "Ещё немного — портал отвечает медленнее…"],
      turnkey: "{price} под ключ", making: "Готовлю предложение и картинку расчёта…",
    },
  };
  const t = (key, values = {}) => String(TEXT[lang][key] ?? TEXT.pl[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  // A list of words (missingWords, steps) as a list: t() would join it into one string.
  const list = (key) => TEXT[lang][key] || TEXT.pl[key] || [];
  const val = (text) => (lang === "ru" && RU ? RU.value(text) : text || "");
  const countryName = (code) => (lang === "ru" && RU ? RU.country(code) : COUNTRY[code]) || code;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  // Every thousand with a space, also "1 300" (pl-PL leaves four digits whole).
  const numbers = { format: (value) => String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") };
  const SYMBOL = { EUR: "€", PLN: "zł", SEK: "kr", USD: "$" };
  const money = (value, currency = "EUR") => (value > 0 ? `${numbers.format(Math.round(value))} ${SYMBOL[currency] || currency}` : "");
  const icon = (name) => `<svg aria-hidden="true"><use href="./src/mobile-icons.svg#${name}"></use></svg>`;
  const readable = (source) => (AD.SOURCES || []).includes(source);
  const portalList = () => PORTAL_ORDER.filter(readable).map((source) => PORTAL[source]).join(", ");

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-os-text]").forEach((node) => {
      node.textContent = t(node.dataset.osText);
    });
    document.querySelectorAll("[data-os-lang]").forEach((button) => {
      const on = button.dataset.osLang === lang;
      button.classList.toggle("isActive", on);
      button.setAttribute("aria-pressed", String(on));
    });
    document.querySelector("[data-os-lang-group]")?.setAttribute("aria-label", t("langLabel"));
    document.title = `AUTOGOOD ${lang === "ru" ? "Предложение" : "Oferta"}`;
    portalsLine.textContent = t("portals", { list: portalList() });
    if (current) {
      carBox.innerHTML = carHtml();
      if (!previewBox.hidden) placePreview();
    }
    showRecent();
    // The shown offer speaks the new language too.
    if (current?.draftId) syncSoon(false);
  }
  document.querySelector("[data-os-lang-group]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-os-lang]");
    if (!button) return;
    if (current) current.opened = false;
    lang = button.dataset.osLang === "ru" && RU ? "ru" : "pl";
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Only this visit then.
    }
    setStatus("");
    applyLang();
  });

  // ---- The portal of a link (no list to pick from: the link says it) ----------------
  function sourceOf(url) {
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
    if (/(^|\.)mobile\.de$/.test(host)) return "mobile";
    if (/(^|\.)autoscout24\.fr$/.test(host)) return "autoscoutfr";
    if (/(^|\.)autoscout24\./.test(host)) return "autoscout";
    if (/(^|\.)kleinanzeigen\.de$/.test(host)) return "kleinanzeigen";
    if (/(^|\.)paruvendu\.fr$/.test(host)) return "paruvendu";
    if (/(^|\.)marktplaats\.nl$/.test(host)) return "marktplaats";
    if (/(^|\.)(2dehands|2ememain)\.be$/.test(host)) return "dehands";
    if (/(^|\.)otomoto\.pl$/.test(host)) return "otomoto";
    if (/(^|\.)blocket\.se$/.test(host)) return "blocket";
    if (/(^|\.)av\.by$/.test(host)) return "avby";
    return "";
  }
  function showPortal(source) {
    portalBadge.hidden = !source;
    portalBadge.textContent = source ? PORTAL[source] : "";
    portalBadge.dataset.source = source || "";
  }

  // The ad's number, as Monitoring keys its offers ("mobile:412345678").
  function adKeyOf(source, url) {
    const text = String(url || "");
    const id = source === "mobile" ? text.match(/[?&]id=(\d+)|\/(\d{6,})\.html/)?.slice(1).find(Boolean)
      : /^autoscout/.test(source) ? text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]?.toLowerCase()
        : text.match(/(?:\/|ID|-)(\d{5,})(?:[-/?#.]|$)/i)?.[1];
    return `${source}:${id || text.replace(/[?#].*$/, "")}`;
  }

  // The importer of mobile.de (the Mac, through a quick tunnel whose address
  // changes with every restart; PROJECT-MOBILE.md §4.3 — never written into
  // the code). Candidates, first that answers wins: ?mobiledeApi= of this page
  // (remembered in this browser), the one remembered, the ones the newest
  // offers were read with (Monitoring opened with ?mobiledeApi=), and the
  // address in mobile.js.
  const IMPORTER_KEY = "autogood.offer.importer.v1";
  const remember = (url) => {
    try {
      localStorage.setItem(IMPORTER_KEY, url);
    } catch {
      /* private window: asked again next time */
    }
  };
  const remembered = () => {
    try {
      return localStorage.getItem(IMPORTER_KEY) || "";
    } catch {
      return "";
    }
  };
  if (params.get("mobiledeApi")) remember(params.get("mobiledeApi"));
  async function answers(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    try {
      // Without a listing the importer says so in JSON (400): it is alive.
      const response = await fetch(url, { signal: controller.signal });
      return response.status < 500 && /json/i.test(response.headers.get("content-type") || "");
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  }
  let importerPromise = null;
  function importerUrl() {
    if (window.AUTOGOOD_MOBILEDE_API_URL) return Promise.resolve(window.AUTOGOOD_MOBILEDE_API_URL);
    if (!importerPromise) {
      importerPromise = (async () => {
        const fromCode = await fetch("./src/mobile.js", { cache: "no-cache" })
          .then((response) => (response.ok ? response.text() : ""))
          .then((source) => source.match(/DEFAULT_MOBILEDE_API_URL\s*=\s*"([^"]+)"/)?.[1] || "")
          .catch(() => "");
        const fromOffers = (await store.recent(20).catch(() => [])).map((offer) => offer.importer).filter(Boolean);
        const candidates = [...new Set([params.get("mobiledeApi"), remembered(), ...fromOffers, fromCode].filter(Boolean))];
        for (const url of candidates) {
          if (await answers(url)) {
            remember(url);
            return url;
          }
        }
        importerPromise = null;
        return candidates[0] || "";
      })();
    }
    return importerPromise;
  }

  // ---- Make and model from the ad's name (mobile.de's catalogue) ----------------------
  const words = (value) => ` ${String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const ALIASES = { vw: "Volkswagen", mercedes: "Mercedes-Benz", "mercedes benz": "Mercedes-Benz", skoda: "Skoda", citroen: "Citroën", "land rover": "Land Rover", "range rover": "Land Rover", ds: "DS Automobiles" };
  function makeModel(title) {
    const text = words(title);
    const brands = Object.keys(CATALOG).map((name) => ({ name, key: words(name) }))
      .concat(Object.entries(ALIASES).filter(([, name]) => CATALOG[name]).map(([alias, name]) => ({ name, key: ` ${alias} ` })))
      .sort((left, right) => right.key.length - left.key.length);
    const brand = brands.find((item) => text.startsWith(item.key)) || brands.find((item) => text.includes(item.key));
    if (!brand) return { brand: "", model: "" };
    const rest = text.slice(text.indexOf(brand.key) + brand.key.length - 1);
    const models = (CATALOG[brand.name] || []).flatMap((group) => group.models || [])
      .filter((name) => name && name !== "Other")
      .map((name) => ({ name, key: words(name).trim() }))
      .filter((item) => item.key)
      .sort((left, right) => right.key.length - left.key.length);
    // "C-HR 2.0" → C-HR; "320d Touring" → 320 (a number with its letters).
    const fits = (item, at) => {
      const after = rest.charAt(at + item.key.length + 1);
      return after === " " || (/\d$/.test(item.key) && /[a-z]/.test(after));
    };
    const model = models.find((item) => rest.startsWith(` ${item.key}`) && fits(item, 0))
      || models.find((item) => {
        const at = rest.indexOf(` ${item.key}`);
        return at >= 0 && fits(item, at);
      });
    return { brand: brand.name, model: model?.name || "" };
  }

  // ---- The car as page 1's summary shows it -----------------------------------------
  let current = null; // { source, url, ad, adKey, brand, model }
  // How the car is bought (owner 2026-10-10): chosen here, before the offer;
  // the VAT 23% way only for a car with VAT to deduct. Default: VAT 23% when
  // possible, else straight from the dealer.
  let method = "";
  let fullCalc = true;
  // With a net price: straight or on VAT 23%; without: straight or on margin
  // (owner 2026-10-11). Default: VAT 23% when possible, else straight.
  // A dealer selling only to firms or for export (offer-facts.js, owner
  // 2026-10-11): no direct purchase, only through AUTOGOOD.
  const chosenMethod = () => {
    const vat = current?.ad?.vat || {};
    const canNet = Boolean(vat.deductible && vat.net);
    const through = canNet ? "vat" : "margin";
    if (method === "vat" && !canNet) return current?.facts?.business ? "margin" : "direct";
    if (method === "margin" && canNet) return "vat";
    if (current?.facts?.business && (method || "direct") === "direct") return through;
    return method || (canNet ? "vat" : "direct");
  };
  // The dealer's delivery fee as the calculator's own line, in the way of
  // buying: straight or on margin the client pays it with the seller's VAT;
  // on VAT 23% net (AUTOGOOD's invoice adds the Polish VAT).
  function feeLine(methodKey) {
    const fee = current?.facts?.fee;
    if (!fee?.amount) return null;
    const rate = Number(current.ad?.vat?.rate) || 19;
    const gross = fee.net ? fee.amount * (1 + rate / 100) : fee.amount;
    const net = fee.net ? fee.amount : fee.amount / (1 + rate / 100);
    return methodKey === "vat"
      ? { label: t("feeLabel"), amount: Math.round(net * 100) / 100, currency: fee.currency || "EUR", vat: true }
      : { label: t("feeLabel"), amount: Math.round(gross * 100) / 100, currency: fee.currency || "EUR", vat: false };
  }
  const client = { salutation: "Pan", name: "" };
  const CALC = window.AUTOGOOD_OFFER_CALC;
  // The calculators page in the card: the ad's price (net on the VAT way),
  // its excise class and the seller's tariff; none for a car already in
  // Poland or in Belarus (no import calculation for them).
  function calcFrameHtml() {
    const est = current && estimate(current.ad, current.source);
    if (!CALC || !est) return "";
    // The manager's own values from before (an offer opened again, a new
    // language or way of buying): the same calculation, not the estimate's.
    const src = CALC.url({ method: chosenMethod(), lang, gross: est.carBruttoEur, net: est.netEur, engine: est.engine.index, transport: est.transportNetto, inspection: est.inspectionNetto, extra: feeLine(chosenMethod()), offer: true, kept: current.calcInputs || null });
    return `<iframe class="osCalcFrame" title="${esc(t("calcTitle"))} AUTOGOOD" src="${esc(src)}" scrolling="no" data-os-calc></iframe>`;
  }

  function rows(list) {
    return list.filter(([, , value]) => value !== "" && value !== null && value !== undefined)
      .map(([iconName, label, value, before = ""]) => `<li><span>${icon(iconName)}${esc(label)}</span><b>${before}${esc(value)}</b></li>`).join("");
  }
  // The ad's own facts as chips over the data (owner 2026-10-11).
  function factChips() {
    const facts = current.facts || {};
    const chips = [];
    if (facts.business) chips.push(["isWarn", t("flagBusiness", { who: t({ export: "whoExport", trade: "whoTrade", business: "whoBusiness" }[facts.business.kind]) }), facts.business.quote]);
    if (facts.isNew) chips.push(["isGood", t("flagNew"), ""]);
    if (facts.availability?.inStock && facts.isNew) chips.push(["isGood", t("flagInStock"), facts.availability.quote]);
    else if (facts.availability && !facts.availability.inStock) chips.push(["isInfo", t("flagAvailable", { when: FACTS.availabilityText(facts.availability, lang) }), facts.availability.quote]);
    if (facts.fee) chips.push(["isWarn", facts.fee.amount ? t("flagFee", { amount: `${money(facts.fee.amount, facts.fee.currency)}${facts.fee.net ? ` ${t("net")}` : ""}` }) : t("flagFeeUnknown"), facts.fee.quote]);
    return chips.length ? `<div class="osFacts">${chips.map(([tone, text, quote]) => `<span class="osFact ${tone}"${quote ? ` title="${esc(quote)}"` : ""}>${esc(text)}</span>`).join("")}</div>` : "";
  }
  function carHtml() {
    const { ad, source, brand, model } = current;
    const facts = current.facts || {};
    const specs = ad.specs || {};
    const seller = ad.seller || {};
    const vat = ad.vat || {};
    const currency = ad.currency || "EUR";
    const price = Number(vat.gross) || 0;
    const country = String(seller.country || "").toUpperCase();
    const options = EQUIPMENT ? EQUIPMENT.keyOptions(ad.features || [], 10) : [];
    const all = EQUIPMENT ? EQUIPMENT.list(ad.features || []).length : (ad.features || []).length;
    const flag = typeof window.AUTOGOOD_FLAG === "function" && country ? window.AUTOGOOD_FLAG(country) : "";
    const vatLine = vat.deductible ? `${t("vatInvoice")}${vat.rate ? ` ${vat.rate}%` : ""}${vat.net ? ` (${t("net")} ${money(vat.net, currency)})` : ""}`
      : seller.type === "private" ? t("privateSeller") : t("noVat");
    const power = specs.powerHp ? `${specs.powerHp} ${t("hp")}${specs.powerKw ? ` (${specs.powerKw} ${t("kw")})` : ""}` : "";
    const sellerLine = seller.type === "dealer" ? (seller.name || t("dealer")) : seller.type === "private" ? t("privateSeller") : seller.name || "";
    // A new car has no registration year to miss.
    const missing = [!brand, !price, !specs.mileage, !specs.firstRegistration && !facts.isNew].map((gap, index) => (gap ? list("missingWords")[index] : "")).filter(Boolean);
    const option = (label) => (lang === "ru" && RU ? RU.option(label, { fuel: specs.fuel }) : EQUIPMENT?.forFuel ? EQUIPMENT.forFuel(label, specs.fuel) : label);
    const canNet = Boolean(vat.deductible && vat.net);
    const battery = Number(specs.batteryKwh) ? `${String(specs.batteryKwh).replace(".", ",")} ${t("kwh")}` : "";
    const available = facts.availability ? FACTS.availabilityText(facts.availability, lang) : "";
    // The calculator of the chosen way (owner 2026-10-11), filled from the ad.
    // Owner 2026-10-11: three blocks — how the car is bought, for whom and in
    // which language (first: it is chosen at the start); the car; the
    // calculation with the "full calculation" box beside its title.
    const frame = calcFrameHtml();
    return `
      <section class="osCard osDealCard" aria-label="${esc(t("method"))}">
        ${factChips()}
        ${!ad.complete ? `<p class="osNote">${esc(t("basic"))}</p>` : ""}
        ${missing.length ? `<p class="osNote">${esc(t("missing", { list: missing.join(", ") }))}</p>` : ""}
        <div class="osMethods" role="radiogroup" aria-label="${esc(t("method"))}">
          <span class="osMethodsLabel">${esc(t("method"))}</span>
          ${[["direct", t("methodDirect"), !facts.business, t("businessOnly")], ["vat", t("methodVat"), canNet, t("vatOnly")], ["margin", t("methodMargin"), !canNet, t("marginOnly")]].map(([key, label, enabled, why]) => `
            <label class="osMethod${enabled ? "" : " isOff"}"${enabled ? "" : ` title="${esc(why)}"`}><input type="radio" name="osMethod" value="${key}" data-os-method${key === chosenMethod() ? " checked" : ""}${enabled ? "" : " disabled"} /><span>${esc(label)}</span></label>`).join("")}
        </div>
        <div class="osClient">
          <span class="osMethodsLabel">${esc(t("client"))}</span>
          <select data-os-salutation aria-label="${esc(t("client"))}">${["Pan", "Pani", "Państwo"].map((form) => `<option${client.salutation === form ? " selected" : ""}>${form}</option>`).join("")}</select>
          <input type="text" data-os-client value="${esc(client.name)}" placeholder="${esc(t("clientName"))}" aria-label="${esc(t("clientName"))}" />
        </div>
        <div class="osClient">
          <span class="osMethodsLabel">${esc(t("langLabel"))}</span>
          <div class="osLang" role="group" aria-label="${esc(t("langLabel"))}">${["pl", "ru"].map((code) => `<button type="button" data-os-lang="${code}" class="${lang === code ? "isActive" : ""}" aria-pressed="${lang === code}">${code.toUpperCase()}</button>`).join("")}</div>
        </div>
      </section>
      <!-- The offer as the client sees it (owner 2026-10-11): the report, with the settings on its right. -->
      <div data-os-report-slot></div>
      ${frame ? `
      <section class="osCard osCalcCard">
        <div class="osCalcHead">
          <h2 class="osCardTitle">${icon("receipt")}<span>${esc(t("calcTitle"))}</span></h2>
          <label class="osFull"><input type="checkbox" data-os-full${fullCalc ? " checked" : ""} /><span>${esc(t("fullCalc"))}</span></label>
        </div>
        <p class="osMuted">${esc(t("calcHint"))}</p>
        ${frame}
      </section>` : ""}
`;
  }

  function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle("isError", error);
  }

  // ---- Rozpoznaj --------------------------------------------------------------------------
  let reading = false;
  async function recognise() {
    const url = input.value.trim();
    if (!/^https?:\/\//i.test(url)) {
      setStatus(t("fullLink"), true);
      return;
    }
    const source = sourceOf(url);
    showPortal(source);
    if (!readable(source)) {
      setStatus(t("unknownPortal", { list: portalList() }), true);
      return;
    }
    if (reading) return;
    reading = true;
    readButton.disabled = true;
    carBox.hidden = true;
    hidePreview();
    // What is being read, step by step (the portal answers in 5–20 s, owner 2026-10-11).
    const steps = list("steps");
    let step = 0;
    const showStep = () => {
      setStatus(`${t("reading", { portal: PORTAL[source] })} ${steps[Math.min(step, steps.length - 1)]}`);
      status.style.setProperty("--os-progress", `${Math.min(92, 18 + step * 24)}%`);
    };
    status.classList.add("isReading");
    showStep();
    const timer = window.setInterval(() => {
      step += 1;
      showStep();
    }, 4000);
    try {
      const importer = source === "mobile" ? await importerUrl() : "";
      const ad = await AD.read(source, url, { importer });
      // The portal's own make and model when it names them, else the title's.
      const named = makeModel([ad.make, ad.model].filter(Boolean).join(" ") || ad.title);
      const fromTitle = named.brand ? named : makeModel(ad.title);
      current = { source, url, ad, adKey: adKeyOf(source, url), brand: fromTitle.brand || ad.make || "", model: fromTitle.model || ad.model || "" };
      // The model table of the make (mild hybrids, B61) before the offer counts its excise.
      await window.AUTOGOOD_MODEL_SPECS_UI?.ready?.(current.brand);
      current.facts = FACTS ? FACTS.read(ad) : {};
      current.title = FACTS ? FACTS.cleanTitle(ad.title, { trims: trimsOf(current.brand, current.model) }) : ad.title;
      method = "";
      carBox.innerHTML = carHtml();
      carBox.hidden = false;
      await openOffer();
      setStatus(t("read_ok", { time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) }));
    } catch (error) {
      current = null;
      const reason = String(error?.message || error);
      setStatus(source === "mobile" && /importer|fetch|Failed|NetworkError|502|503/i.test(reason) ? t("importerDown", { reason }) : t("readFailed", { reason }), true);
    } finally {
      window.clearInterval(timer);
      status.classList.remove("isReading");
      reading = false;
      readButton.disabled = false;
    }
  }

  // The model's trims (src/model-specs, B61): what a cut word of the name stands for.
  function trimsOf(brand, model) {
    const specs = window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand] || {};
    const entry = specs[`${brand}|${model}`] || Object.entries(specs).find(([key]) => key.toLowerCase() === `${brand}|${model}`.toLowerCase())?.[1];
    return [...new Set((entry?.trims || []).flatMap((item) => item[2] || []))];
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    recognise();
  });
  input.addEventListener("input", () => showPortal(sourceOf(input.value.trim())));

  // ---- The draft and the offer page -------------------------------------------------------
  // The calculator's "Zakup bezpośredni" (as offer-link.js for Monitoring):
  // the seller's own tariff when the importer counted it (mobile.de), else the
  // average one. A car already in Poland (otomoto) or in Belarus (av.by: no
  // turnkey for Belarus, owner 2026-10-02) gets none — the offer shows the
  // ad's price until the manager inserts a calculation.
  function estimate(ad, source) {
    const turnkey = window.AUTOGOOD_TURNKEY;
    const gross = Number(ad.vat?.gross) || 0;
    if (!turnkey || !gross || ["otomoto", "avby"].includes(source)) return null;
    const rates = turnkey.currentRates();
    const currency = ad.currency || "EUR";
    const price = currency === "EUR" ? gross : currency === "SEK" ? (gross * rates.sek) / rates.eur : currency === "PLN" ? gross / rates.eur : 0;
    if (!price) return null;
    const tariff = ad.tariff || { transport: turnkey.AVERAGE_TRANSPORT_NETTO, inspection: turnkey.AVERAGE_INSPECTION_NETTO, rule: "average" };
    // Make, model, year, power and gearbox find a mild hybrid in the model table (B61): its excise is
    // the hybrid's in all of Poland (owner 2026-10-11).
    const engine = turnkey.engineInfo({
      fuel: ad.specs?.fuel, title: ad.title, displacementCcm: ad.specs?.ccm,
      brand: current?.brand, model: current?.model, year: ad.specs?.firstRegistration,
      power: ad.specs?.powerHp ? `${ad.specs.powerHp} PS` : ad.specs?.powerKw ? `${ad.specs.powerKw} kW` : "",
      gearbox: ad.specs?.gearbox,
    }, {});
    const result = turnkey.turnkeyDirect({
      carBruttoEur: price,
      rate: rates.eur,
      transportNettoPln: tariff.transport,
      inspectionNettoPln: tariff.inspection,
      engineTypeIndex: engine.index,
    });
    const net = Number(ad.vat?.net) || 0;
    const netEur = !net ? 0 : currency === "EUR" ? net : currency === "SEK" ? (net * rates.sek) / rates.eur : currency === "PLN" ? net / rates.eur : 0;
    return {
      method: "direct",
      netEur: Math.round(netEur),
      rate: result.rate,
      rateLive: Boolean(window.AUTOGOOD_EUR_PLN_RAW),
      carBruttoEur: Math.round(price),
      transportNetto: tariff.transport,
      inspectionNetto: tariff.inspection,
      tariffRule: tariff.rule || "",
      engine: { index: engine.index, ccm: engine.ccm || null, source: engine.source, rate: turnkey.EXCISE_RATES[engine.index] },
      parts: result.parts,
      total: result.total,
    };
  }

  async function makeDraft(id) {
    const { ad, source, url, adKey, brand, model } = current;
    const specs = ad.specs || {};
    const seller = ad.seller || {};
    const vat = ad.vat || {};
    await window.AUTOGOOD_TURNKEY?.calculatorRate?.().catch(() => null);
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const sequence = (await store.madeOn(day).catch(() => 0)) + 1;
    const year = Number(String(specs.firstRegistration || "").match(/(\d{4})/)?.[1]) || null;
    return {
      id,
      origin: "link",
      createdAt: now.toISOString(),
      number: `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}-${String(sequence).padStart(2, "0")}`,
      lang,
      method: chosenMethod(),
      favoriteId: "",
      favoriteTitle: "",
      filters: { brand, model },
      source,
      adKey,
      url,
      importer: source === "mobile" ? await importerUrl() : "",
      // The car as a Monitoring record would hold it (offer.js reads both); the
      // ad's own currency (EUR; SEK on Blocket, PLN on otomoto).
      car: {
        key: adKey,
        // The name as the client reads it (offer-facts.js); the ad's own stays in ad.title.
        title: current.title || ad.title || "",
        titleClean: current.title || "",
        price: Number(vat.gross) || 0,
        currency: ad.currency || "EUR",
        priceType: vat.deductible ? "vat" : seller.type === "private" ? "private" : "",
        netPrice: Number(vat.net) || 0,
        year,
        reg: specs.firstRegistration || "",
        mileage: Number(specs.mileage) || 0,
        fuel: specs.fuel || "",
        ccm: Number(specs.ccm) || 0,
        body: specs.body || "",
        country: seller.country || "",
        city: seller.city || "",
        zip: seller.zip || "",
        seller: seller.type || "",
        url,
      },
      market: null,
      estimate: estimate(ad, source),
      manager: store.manager(),
      company: store.company(),
      client: { ...client },
      edits: {},
      // Without the full calculation page 2 shows the steps wide (owner 2026-10-10).
      hidden: fullCalc ? [] : ["costs"],
      ad,
      adTriedAt: now.toISOString(),
    };
  }

  // The calculator as tall as its content: one scroll, the page's (owner 2026-10-11).
  function fitCalc(frame) {
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    // The body's own height (the document's is never less than the frame):
    // the frame shrinks too when the calculator gets shorter.
    const fit = () => {
      const style = doc.defaultView.getComputedStyle(doc.body);
      // + the frame's own border (a pixel short made the calculator scroll).
      const border = frame.offsetHeight - frame.clientHeight;
      const height = Math.ceil(doc.body.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom)) + border + 1;
      if (height > 200 && Math.abs(height - frame.offsetHeight) > 1) frame.style.height = `${height}px`;
    };
    fit();
    if (typeof ResizeObserver === "function" && !frame.dataset.fitted) {
      frame.dataset.fitted = "1";
      new ResizeObserver(fit).observe(doc.body);
    }
  }
  carBox.addEventListener("load", (event) => {
    if (event.target.matches?.("[data-os-calc]")) fitCalc(event.target);
  }, true);

  carBox.addEventListener("change", (event) => {
    if (current) current.opened = false;
    if (event.target.matches("[data-os-method]")) {
      method = event.target.value;
      const old = carBox.querySelector("[data-os-calc]");
      const html = calcFrameHtml();
      if (old && html) old.outerHTML = html;
    }
    if (event.target.matches("[data-os-full]")) fullCalc = event.target.checked;
    if (event.target.matches("[data-os-salutation]")) client.salutation = event.target.value;
    if (event.target.matches("[data-os-method], [data-os-full], [data-os-salutation]")) syncSoon(event.target.matches("[data-os-method], [data-os-full]"));
  });
  carBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-os-lang]");
    if (!button) return;
    if (current) current.opened = false;
    lang = button.dataset.osLang === "ru" && RU ? "ru" : "pl";
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Only this visit then.
    }
    applyLang();
  });
  carBox.addEventListener("input", (event) => {
    if (event.target.matches("[data-os-client]")) {
      client.name = event.target.value.trim();
      syncSoon(false);
    }
  });
  // ---- The offer itself, on this page (owner 2026-10-11) ---------------------------------
  // After "Rozpoznaj" the offer is made at once (or the one this ad already
  // has is opened again) and shown here as the client will see it — section
  // after section (oferta.html?embed=1&view=web in a frame), its settings on
  // the right acting on the page and the PDF; "Arkusze PDF", "Pobierz PDF",
  // "Link dla klienta" and the e-mail sit on its bar. The way of buying, the
  // client, the language and the calculator's changes go into it at once.
  const previewBox = document.querySelector("[data-os-preview]");
  // The calculator's lines and, with the full calculation, its picture.
  async function calcPart() {
    const frame = carBox.querySelector("[data-os-calc]");
    if (!CALC || !frame?.contentDocument) return {};
    try {
      const read = CALC.read(frame.contentDocument);
      const methodKey = chosenMethod();
      // The fields as the manager left them: the calculator opens with them
      // again (a new language, the offer opened from the list).
      current.calcInputs = { method: methodKey, ...(CALC.fields ? CALC.fields(frame.contentDocument) : {}), rate: read.rate };
      const part = { calc: { tab: CALC.TABS[methodKey], method: methodKey, methodLabel: "", rows: read.rows, total: read.total, rate: read.rate, lang, at: new Date().toISOString() }, calcInputs: current.calcInputs };
      if (fullCalc) {
        const image = await Promise.race([CALC.capture(frame).catch(() => ""), new Promise((resolve) => window.setTimeout(() => resolve(""), 15000))]);
        if (image) part.calcImage = image;
      }
      return part;
    } catch {
      // The calculator not ready: the offer keeps its estimate.
      return {};
    }
  }
  function fitPreview(frame) {
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    const fit = () => {
      const style = doc.defaultView.getComputedStyle(doc.body);
      const border = frame.offsetHeight - frame.clientHeight;
      const height = Math.ceil(doc.body.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom)) + border + 1;
      if (height > 300 && Math.abs(height - frame.offsetHeight) > 1) frame.style.height = `${height}px`;
      tellViewport();
    };
    fit();
    if (typeof ResizeObserver === "function" && !frame.dataset.fitted) {
      frame.dataset.fitted = "1";
      new ResizeObserver(fit).observe(doc.body);
    }
  }
  // The frame does not scroll: it is told where this window is, so its
  // settings stay in view on the right.
  function tellViewport() {
    const frame = previewBox.querySelector("[data-os-preview-frame]");
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "ag-offer-viewport", top: -frame.getBoundingClientRect().top, height: window.innerHeight }, window.location.origin);
  }
  window.addEventListener("scroll", tellViewport, { passive: true });
  window.addEventListener("resize", tellViewport);
  // The report sits between the way of buying and the calculator.
  function placePreview() {
    const slot = carBox.querySelector("[data-os-report-slot]");
    if (slot && previewBox.parentNode !== slot.parentNode) slot.replaceWith(previewBox);
  }
  function showPreview(id, number) {
    const page = new URL("oferta.html", window.location.href);
    page.searchParams.set("id", id);
    page.searchParams.set("embed", "1");
    page.searchParams.set("view", "web");
    // Owner 2026-10-11: the offer's number only, no hints; the PDF's sheets
    // open from its own "Przygotuj PDF".
    previewBox.innerHTML = `
      <section class="osCard osPreviewCard">
        <h2 class="osCardTitle">${icon("list")}<span>${esc(t("previewTitle", { n: number || "" }))}</span></h2>
        <iframe class="osPreviewFrame" title="${esc(t("previewTitle", { n: number || "" }))}" src="${esc(page.toString())}" scrolling="no" allow="clipboard-write" data-os-preview-frame></iframe>
      </section>`;
    placePreview();
    previewBox.hidden = false;
    const frame = previewBox.querySelector("[data-os-preview-frame]");
    frame.addEventListener("load", () => fitPreview(frame));
  }
  function hidePreview() {
    previewBox.hidden = true;
    previewBox.innerHTML = "";
  }
  // What the manager chose here, into the offer shown.
  let syncing = null;
  async function syncDraft({ withCalc = false } = {}) {
    if (!current?.draftId) return;
    const change = { lang, method: chosenMethod(), client: { ...client } };
    if (withCalc) Object.assign(change, await calcPart());
    await store.update(current.draftId, (stored) => {
      const hidden = new Set(stored.hidden || []);
      if (fullCalc) hidden.delete("costs");
      else hidden.add("costs");
      return { ...change, hidden: [...hidden] };
    }).catch(() => null);
  }
  function syncSoon(withCalc) {
    window.clearTimeout(syncing);
    syncing = window.setTimeout(() => syncDraft({ withCalc }), withCalc ? 1200 : 300);
  }
  // A change in the calculator (transport, inspection, an own cost) goes
  // into the offer a moment after the last keystroke.
  carBox.addEventListener("load", (event) => {
    const frame = event.target;
    if (!frame.matches?.("[data-os-calc]")) return;
    const doc = frame.contentDocument;
    ["input", "change", "click"].forEach((kind) => doc?.addEventListener(kind, () => {
      if (!current?.draftId) return;
      current.opened = false;
      syncSoon(true);
    }, true));
    if (current?.draftId && !current.opened) syncSoon(true);
  }, true);

  // The offer of this ad: the one made before from a link (fresh ad data,
  // the manager's choices kept), else a new one — a draft, off the list of
  // offers until it is sent (PDF, link, e-mail). Owner 2026-10-11: no note
  // about it — the same ad simply opens its offer.
  async function openOffer() {
    if (!current) return;
    const before = (await (store.byAdKey ? store.byAdKey(current.adKey) : Promise.resolve([])).catch(() => [])).find((offer) => offer.origin === "link" && !offer.error && !offer.archived);
    if (before) {
      current.draftId = before.id;
      takeChoices(before);
      // The ad read again: its price, not the one typed before.
      if (current.calcInputs) current.calcInputs = { ...current.calcInputs, car: "", rate: 0 };
      if (before.lang && before.lang !== lang) {
        lang = before.lang;
        applyLang();
      } else carBox.innerHTML = carHtml();
      await store.update(before.id, { ad: current.ad, adTriedAt: new Date().toISOString(), estimate: estimate(current.ad, current.source), car: { ...(before.car || {}), title: current.title || before.car?.title, titleClean: current.title || before.car?.titleClean } }).catch(() => null);
      showPreview(before.id, before.number);
      inAddress(before.id);
      return;
    }
    const id = store.newId();
    const draft = { ...(await makeDraft(id)), draft: true };
    await store.put(draft);
    current.draftId = id;
    showPreview(id, draft.number);
    inAddress(id);
  }
  // The manager's choices kept with an offer: the way of buying, the client,
  // the full calculation and the calculator's own fields.
  function takeChoices(stored) {
    method = stored.method || "";
    Object.assign(client, { salutation: stored.client?.salutation || "Pan", name: stored.client?.name || "" });
    fullCalc = !(stored.hidden || []).includes("costs");
    // An offer made before its fields were kept: at least the rate it was counted at.
    current.calcInputs = stored.calcInputs || (Number(stored.calc?.rate) > 0 ? { method: stored.calc.method || stored.method || "direct", rate: stored.calc.rate } : null);
  }
  // The offer shown stays in the address: a reload or a shared tab opens it again.
  function inAddress(id) {
    const address = new URL(window.location.href);
    address.searchParams.delete("url");
    address.searchParams.set("oferta", id);
    window.history.replaceState(null, "", address.toString());
  }

  // ---- An offer made before, opened again with the whole page (owner 2026-10-11) -------------
  // From the list of offers (or ?oferta=): the deal block, the offer and the
  // calculator as they were left — the ad as read then, not read again.
  // An offer from Monitoring whose ad was never read gets its car's data.
  function adFromCar(stored) {
    const car = stored.car || {};
    const estimateOf = stored.estimate;
    return {
      title: car.title || stored.favoriteTitle || "",
      currency: car.currency || "EUR",
      vat: { gross: Number(car.price) || 0, net: Number(car.netPrice) || 0, deductible: car.priceType === "vat" },
      specs: { mileage: car.mileage, firstRegistration: car.reg || (car.year ? String(car.year) : ""), fuel: car.fuel, ccm: car.ccm, body: car.body },
      seller: { type: car.seller, country: car.country, city: car.city, zip: car.zip },
      tariff: estimateOf ? { transport: estimateOf.transportNetto, inspection: estimateOf.inspectionNetto, rule: estimateOf.tariffRule } : undefined,
      features: [],
      images: [],
      complete: true,
    };
  }
  async function openStored(id) {
    const stored = await store.get(id).catch(() => null);
    if (!stored || stored.error) {
      setStatus(t("notFound"), true);
      return;
    }
    const ad = stored.ad || adFromCar(stored);
    const source = stored.source || "mobile";
    const url = stored.url || stored.car?.url || "";
    // opened: the calculation stays as it was saved until the manager changes
    // something here (opening alone never counts it again at today's rate).
    current = { source, url, ad, adKey: stored.adKey || stored.car?.key || adKeyOf(source, url), brand: stored.filters?.brand || "", model: stored.filters?.model || "", draftId: stored.id, opened: true };
    if (!current.brand) Object.assign(current, makeModel(ad.title || stored.car?.title || ""));
    await window.AUTOGOOD_MODEL_SPECS_UI?.ready?.(current.brand);
    current.facts = FACTS ? FACTS.read(ad) : {};
    current.title = stored.car?.titleClean || stored.car?.title || (FACTS ? FACTS.cleanTitle(ad.title || "") : ad.title) || "";
    takeChoices(stored);
    input.value = url;
    showPortal(source);
    hidePreview();
    if (stored.lang && stored.lang !== lang && (stored.lang !== "ru" || RU)) {
      lang = stored.lang;
      applyLang();
    }
    carBox.innerHTML = carHtml();
    carBox.hidden = false;
    showPreview(stored.id, stored.number);
    inAddress(stored.id);
    const date = new Date(stored.createdAt);
    setStatus(t("opened", { n: stored.number || "", date: Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }) }));
    carBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- Offers made before (here and from Monitoring) ------------------------------------
  async function showRecent() {
    const list = await store.recent(12).catch(() => []);
    // Drafts (made by "Rozpoznaj", never sent) stay off the list.
    const usable = list.filter((offer) => !offer.error && !offer.draft);
    recentBox.hidden = !usable.length;
    // Owner 2026-10-11: the client and the turnkey price on each line, the
    // name as the client reads it.
    recentList.innerHTML = usable.map((offer) => {
      const raw = offer.ad?.title || offer.car?.title || offer.favoriteTitle || "";
      const title = offer.car?.titleClean || (FACTS && raw ? FACTS.cleanTitle(raw) : raw) || t("title");
      const date = new Date(offer.createdAt);
      const when = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
      const from = offer.origin === "link" ? t("fromLink") : t("fromMonitoring");
      const sameWay = !offer.calc || (offer.calc.method || "direct") === (offer.method || "direct");
      const total = (sameWay && offer.calc?.total) || offer.estimate?.total || 0;
      const who = offer.client?.name ? `${offer.client.salutation && offer.lang !== "ru" ? `${offer.client.salutation} ` : ""}${offer.client.name}` : "";
      const facts = [who, total ? t("turnkey", { price: money(total, "PLN") }) : ""].filter(Boolean).join(" · ");
      const label = `${t("remove")}: ${offer.number || ""} ${title}`;
      return `<li><a href="./oferty.html?oferta=${encodeURIComponent(offer.id)}" data-os-open="${esc(offer.id)}"><b>${esc(offer.number || "")}</b><span>${esc(title)}</span>${facts ? `<em>${esc(facts)}</em>` : ""}<small>${esc([when, PORTAL[offer.source] || "", from, offer.lang === "ru" ? "RU" : "PL"].filter(Boolean).join(" · "))}</small></a><button class="osRemove" type="button" data-os-remove="${esc(offer.id)}" data-number="${esc(offer.number || "")}" aria-label="${esc(label)}" title="${esc(t("remove"))}">×</button></li>`;
    }).join("");
  }
  // The manager removes an offer from the list (owner 2026-10-11): it is set
  // aside (archived), never erased — the rules of user data.
  recentList.addEventListener("click", async (event) => {
    // The whole page of that offer, here (a new tab with Ctrl / Cmd: the link).
    const open = event.target.closest("[data-os-open]");
    if (open && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      if (!reading) openStored(open.dataset.osOpen);
      return;
    }
    const button = event.target.closest("[data-os-remove]");
    if (!button) return;
    if (!window.confirm(t("removeAsk", { n: button.dataset.number }))) return;
    await store.update(button.dataset.osRemove, { archived: true, archivedAt: new Date().toISOString() }).catch(() => null);
    showRecent();
  });
  applyLang();
  store.channel?.addEventListener("message", () => showRecent());

  // A link given in the address (?url=…) is read at once; an offer
  // (?oferta=…) opens with its whole page.
  if (params.get("url")) {
    input.value = params.get("url");
    recognise();
  } else if (params.get("oferta") && !/aukcj|auction/i.test(params.get("tryb") || "")) {
    openStored(params.get("oferta"));
  }
})();
