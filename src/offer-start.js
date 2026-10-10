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
 * offer-ru.js). Second way — an auction report — comes later (its own chat).
 * docs/OFFER-PAGE.md §8.
 */
(() => {
  const AD = window.AUTOGOOD_OFFER_AD;
  const store = window.AUTOGOOD_OFFER_STORE;
  const EQUIPMENT = window.AUTOGOOD_OFFER_EQUIPMENT;
  const RU = window.AUTOGOOD_OFFER_RU;
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
      missing: "Nie udało się odczytać: {list}. Uzupełnisz to na stronie oferty (Edytuj teksty).", missingWords: ["marka", "cena", "przebieg", "rok"],
      footLabel: "Oferta dla klienta · po polsku", make: "Przygotuj ofertę PDF",
      method: "Sposób zakupu", methodDirect: "Zakup bezpośredni", methodVat: "Przez AUTOGOOD · VAT 23% (netto)", methodMargin: "Przez AUTOGOOD · VAT marża (brutto)",
      vatOnly: "tylko auto z VAT do odliczenia", fullCalc: "Pełna kalkulacja w ofercie (str. 2)",
      fromLink: "z linku", fromMonitoring: "z Monitoringu",
    },
    ru: {
      title: "Предложение для клиента", langLabel: "Язык предложения", modeDealer: "Из объявления дилера", modeAuction: "Из отчёта аукциона", soon: "скоро",
      linkTitle: "Ссылка на объявление", read: "Распознать", recent: "Последние предложения", auctionLater: "Сделаем отдельным шагом",
      portals: "Вставьте ссылку с: {list}. Портал определяем по ссылке.",
      fullLink: "Вставьте полную ссылку на объявление (https://…).", unknownPortal: "Не узнаю портал по этой ссылке. Поддерживаем: {list}.",
      reading: "Читаю объявление с {portal}: фото, данные, оснащение, продавец…", read_ok: "Данные объявления загружены в {time}.",
      importerDown: "Не удалось прочитать объявление mobile.de: импортер на Маке не отвечает ({reason}). Запустите его или откройте страницу с ?mobiledeApi=…",
      readFailed: "Не удалось прочитать объявление: {reason}.", makeFailed: "Не удалось подготовить предложение: {reason}.",
      fromAd: "Авто из объявления", adOn: "объявление на {portal}", unknownPrice: "цена неизвестна", gross: "брутто", vatInvoice: "счёт-фактура VAT", net: "нетто",
      privateSeller: "частное лицо", noVat: "без VAT к вычету", dealer: "дилер",
      bodyEngine: "Кузов и двигатель", body: "Кузов", fuel: "Тип двигателя", ccm: "Объём", power: "Мощность", hp: "л.с.", kw: "кВт", km: "км", cm3: "см³",
      mileageDrive: "Пробег и привод", mileage: "Пробег", reg: "1-я регистрация", gearbox: "Коробка", drive: "Привод",
      equipment: "Оснащение", moreIn: "+ {n} в объявлении", noEquipment: "в объявлении нет списка оснащения", equipmentLater: "оснащение после полного чтения",
      other: "Другое", country: "Страна", condition: "Состояние", damaged: "повреждён", accidentFree: "без ДТП (по словам продавца)", color: "Цвет", seller: "Продавец",
      basic: "Прочитаны основные данные. Фото, оснащение и продавец появятся после полного чтения (для mobile.de нужен импортер на Маке).",
      missing: "Не удалось прочитать: {list}. Допишете на странице предложения (Edytuj teksty).", missingWords: ["марка", "цена", "пробег", "год"],
      footLabel: "Предложение для клиента · на русском", make: "Подготовить PDF-предложение",
      method: "Способ покупки", methodDirect: "Прямая покупка", methodVat: "Через AUTOGOOD · VAT 23% (нетто)", methodMargin: "Через AUTOGOOD · VAT marża (брутто)",
      vatOnly: "только авто с VAT к вычету", fullCalc: "Полный расчёт в предложении (стр. 2)",
      fromLink: "из ссылки", fromMonitoring: "из Monitoring",
    },
  };
  const t = (key, values = {}) => String(TEXT[lang][key] ?? TEXT.pl[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  const val = (text) => (lang === "ru" && RU ? RU.value(text) : text || "");
  const countryName = (code) => (lang === "ru" && RU ? RU.country(code) : COUNTRY[code]) || code;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const numbers = new Intl.NumberFormat("pl-PL");
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
    document.querySelector('[data-os-mode="auction"]')?.setAttribute("title", t("auctionLater"));
    document.title = `AUTOGOOD ${lang === "ru" ? "Предложение" : "Oferta"}`;
    portalsLine.textContent = t("portals", { list: portalList() });
    if (current) carBox.innerHTML = carHtml();
    showRecent();
  }
  document.querySelector("[data-os-lang-group]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-os-lang]");
    if (!button) return;
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
  const chosenMethod = () => {
    const vat = current?.ad?.vat || {};
    if (method === "vat" && !(vat.deductible && vat.net)) return "direct";
    return method || (vat.deductible && vat.net ? "vat" : "direct");
  };

  function rows(list) {
    return list.filter(([, , value]) => value !== "" && value !== null && value !== undefined)
      .map(([iconName, label, value, before = ""]) => `<li><span>${icon(iconName)}${esc(label)}</span><b>${before}${esc(value)}</b></li>`).join("");
  }
  function carHtml() {
    const { ad, source, brand, model } = current;
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
    const missing = [!brand, !price, !specs.mileage, !specs.firstRegistration].map((gap, index) => (gap ? t("missingWords")[index] : "")).filter(Boolean);
    const option = (label) => (lang === "ru" && RU ? RU.option(label) : label);
    const canNet = Boolean(vat.deductible && vat.net);
    return `
      <div class="osCarHead">
        ${ad.images?.[0] ? `<img class="osCarPhoto" src="${esc(ad.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <div class="osCarName">
          <h2>${esc(ad.title || [brand, model].filter(Boolean).join(" ") || t("fromAd"))}</h2>
          <p>${[brand, model].filter(Boolean).map(esc).join(" · ")}${brand ? " · " : ""}<a href="${esc(current.url)}" target="_blank" rel="noopener">${esc(t("adOn", { portal: PORTAL[source] || "" }))}</a></p>
        </div>
        <div class="osCarPrice">
          <b>${esc(money(price, currency)) || t("unknownPrice")}</b>
          <small>${esc(price ? `${t("gross")} · ${vatLine}` : "")}</small>
        </div>
      </div>
      <div class="osCols">
        <section>
          <h3>${esc(t("bodyEngine"))}</h3>
          <ul>${rows([["car", t("body"), val(specs.body)], ["fuel", t("fuel"), val(specs.fuel)], ["settings", t("ccm"), specs.ccm ? `${numbers.format(specs.ccm)} ${t("cm3")}` : ""], ["zap", t("power"), power]])}</ul>
        </section>
        <section>
          <h3>${esc(t("mileageDrive"))}</h3>
          <ul>${rows([["gauge", t("mileage"), specs.mileage ? `${numbers.format(specs.mileage)} ${t("km")}` : ""], ["calendar", t("reg"), specs.firstRegistration || ""], ["git-branch", t("gearbox"), val(specs.gearbox)], ["route", t("drive"), val(specs.drive)]])}</ul>
        </section>
        <section>
          <h3>${esc(t("equipment"))}</h3>
          ${options.length ? `<ul class="osOptions">${options.map((item) => `<li>${esc(option(item.label))}</li>`).join("")}</ul>${all > options.length ? `<p class="osMuted">${esc(t("moreIn", { n: numbers.format(all - options.length) }))}</p>` : ""}` : `<p class="osMuted">${esc(ad.complete ? t("noEquipment") : t("equipmentLater"))}</p>`}
        </section>
        <section>
          <h3>${esc(t("other"))}</h3>
          <ul>${rows([["map-pin", t("country"), [seller.city, countryName(country)].filter(Boolean).join(", "), flag], ["check", t("condition"), specs.damaged ? t("damaged") : specs.accidentFree === true ? t("accidentFree") : ""], ["palette", t("color"), val(specs.color)], ["store", t("seller"), sellerLine]])}</ul>
        </section>
      </div>
      ${!ad.complete ? `<p class="osNote">${esc(t("basic"))}</p>` : ""}
      ${missing.length ? `<p class="osNote">${esc(t("missing", { list: missing.join(", ") }))}</p>` : ""}
      <div class="osMethods" role="radiogroup" aria-label="${esc(t("method"))}">
        <span class="osMethodsLabel">${esc(t("method"))}</span>
        ${[["direct", t("methodDirect"), true], ["vat", t("methodVat"), canNet], ["margin", t("methodMargin"), true]].map(([key, label, enabled]) => `
          <label class="osMethod${enabled ? "" : " isOff"}"${enabled ? "" : ` title="${esc(t("vatOnly"))}"`}><input type="radio" name="osMethod" value="${key}" data-os-method${key === chosenMethod() ? " checked" : ""}${enabled ? "" : " disabled"} /><span>${esc(label)}</span></label>`).join("")}
        <label class="osFull"><input type="checkbox" data-os-full${fullCalc ? " checked" : ""} /><span>${esc(t("fullCalc"))}</span></label>
      </div>
      <div class="osCarFoot">
        <span class="osCarFootLabel">${esc(t("footLabel"))}</span>
        <button class="osPrimary" type="button" data-os-make>${esc(t("make"))} <i aria-hidden="true">&#8594;</i></button>
      </div>`;
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
    setStatus(t("reading", { portal: PORTAL[source] }));
    try {
      const importer = source === "mobile" ? await importerUrl() : "";
      const ad = await AD.read(source, url, { importer });
      // The portal's own make and model when it names them, else the title's.
      const named = makeModel([ad.make, ad.model].filter(Boolean).join(" ") || ad.title);
      const fromTitle = named.brand ? named : makeModel(ad.title);
      current = { source, url, ad, adKey: adKeyOf(source, url), brand: fromTitle.brand || ad.make || "", model: fromTitle.model || ad.model || "" };
      method = "";
      carBox.innerHTML = carHtml();
      carBox.hidden = false;
      setStatus(t("read_ok", { time: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) }));
    } catch (error) {
      current = null;
      const reason = String(error?.message || error);
      setStatus(source === "mobile" && /importer|fetch|Failed|NetworkError|502|503/i.test(reason) ? t("importerDown", { reason }) : t("readFailed", { reason }), true);
    } finally {
      reading = false;
      readButton.disabled = false;
    }
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
    const engine = turnkey.engineInfo({ fuel: ad.specs?.fuel, title: ad.title, displacementCcm: ad.specs?.ccm }, {});
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
        title: ad.title || "",
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
      client: { salutation: "Pan", name: "" },
      edits: {},
      // Without the full calculation page 2 shows the steps wide (owner 2026-10-10).
      hidden: fullCalc ? [] : ["costs"],
      ad,
      adTriedAt: now.toISOString(),
    };
  }

  carBox.addEventListener("change", (event) => {
    if (event.target.matches("[data-os-method]")) method = event.target.value;
    if (event.target.matches("[data-os-full]")) fullCalc = event.target.checked;
  });
  carBox.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-os-make]");
    if (!button || !current || button.disabled) return;
    button.disabled = true;
    const id = store.newId();
    const page = new URL("oferta.html", window.location.href);
    page.searchParams.set("id", id);
    try {
      await store.put(await makeDraft(id));
      const tab = window.open(page.toString(), "_blank");
      if (!tab) window.location.href = page.toString();
      showRecent();
    } catch (error) {
      setStatus(t("makeFailed", { reason: String(error?.message || error) }), true);
    } finally {
      button.disabled = false;
    }
  });

  // ---- Offers made before (here and from Monitoring) ------------------------------------
  async function showRecent() {
    const list = await store.recent(12).catch(() => []);
    const usable = list.filter((offer) => !offer.error);
    recentBox.hidden = !usable.length;
    recentList.innerHTML = usable.map((offer) => {
      const title = offer.ad?.title || offer.car?.title || offer.favoriteTitle || t("title");
      const date = new Date(offer.createdAt);
      const when = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
      const from = offer.origin === "link" ? t("fromLink") : t("fromMonitoring");
      return `<li><a href="./oferta.html?id=${encodeURIComponent(offer.id)}" target="_blank" rel="noopener"><b>${esc(offer.number || "")}</b><span>${esc(title)}</span><small>${esc([when, PORTAL[offer.source] || "", from, offer.lang === "ru" ? "RU" : "PL"].filter(Boolean).join(" · "))}</small></a></li>`;
    }).join("");
  }
  applyLang();
  store.channel?.addEventListener("message", () => showRecent());

  // A link given in the address (?url=…) is read at once.
  if (params.get("url")) {
    input.value = params.get("url");
    recognise();
  }
})();
