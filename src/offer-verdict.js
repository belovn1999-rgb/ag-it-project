/* AUTOGOOD "Oferta dla klienta" (B71): the verdict and red flags by rules
 * (owner 2026-10-05: rules now, AI later; every flag names its reason or
 * quotes the ad; the manager confirms before the PDF).
 *
 * Inputs: the car from the Monitoring check, the ad as read (offer-ad.js),
 * the market around it (offer-market.js). Output: lines {level, id, text,
 * quote} — "risk" (red), "warn" (amber), "ok" (green), "info" (grey) — and a
 * verdict: risk → "Nie rekomendujemy"; three or more warnings → "Do
 * weryfikacji"; otherwise "Rekomendujemy do dalszego sprawdzenia" (owner 2026-10-06).
 * Plus the room to negotiate (a heuristic from how long the car is listed,
 * its price drops and how often prices drop on its market — an observation,
 * never a promised discount).
 *
 * Pure — scripts/offer-market.test.mjs runs it. window.AUTOGOOD_OFFER_VERDICT:
 * assess({ car, ad, market, now, lang }), negotiation({ car, ad, market, now }).
 * lang "ru" (owner 2026-10-10): every line in Russian; line ids stay the same.
 */
(() => {
  // Words in the title or description, any language of the portals. The
  // first group stops a purchase, the second asks for a check.
  // Russian (av.by), Dutch (Marktplaats, 2dehands) and Swedish (Blocket) since
  // 2026-10-10. \b sees no Cyrillic word edge: "(?:^|[^а-яё])" stands for it
  // (so "небитый" is no "битый").
  const RISK_WORDS = [
    [/ohne (?:fahrzeug)?papiere|keine (?:fahrzeug)?papiere|nicht zulassungsf(?:ä|ae)hig|keine zulassung|senza documenti|sans papiers|bez dokument(?:ów|ow)|без документов|документов нет|zonder papieren|utan papper/i, "Brak dokumentów — auta nie da się zarejestrować", "Нет документов — авто нельзя зарегистрировать"],
    [/ersatzteilspender|na cz(?:ę|e)(?:ś|s)ci|per ricambi|pour pi(?:è|e)ces|for parts|на запчасти|voor onderdelen|reservdelar/i, "Sprzedawane na części", "Продаётся на запчасти"],
    [/\bdiebstahl\b|\bgestohlen|\bkradzie(?:ż|z)y?\b|\bkradzion|\brubat[aoe]?\b|\bvol(?:é|e)e?\b/i, "Wzmianka o kradzieży", "Упоминание о краже"],
    [/motorschaden|getriebeschaden|motore (?:rotto|da rifare)|moteur hs|uszkodzon(?:y|a) silnik|silnik do remontu|(?:двигател[ья]|мотор|коробк[аи]) (?:под|требует|в) ремонт|motorschade|motorhaveri/i, "Uszkodzony silnik lub skrzynia", "Повреждён двигатель или коробка"],
    [/totalschaden|wasserschaden|hagelschaden|brandschaden|unfallwagen|unfallfahrzeug|unfallschaden|sinistrat|incidentat|accident(?:é|e)e?\b|schadeauto|powypadkow|po wypadku|zalan|alluvionat|inondé|(?:^|[^а-яё])(?:после дтп|битый|битая|аварийн[а-яё]*|утопленник)|ongevalschade|krockskad|skadebil/i, "Auto po wypadku lub uszkodzone", "Авто после аварии или повреждено"],
    [/nicht fahrbereit|nicht fahrtauglich|fahrzeug defekt|non marciante|ne roule pas|niesprawn|do naprawy|bastlerfahrzeug|не на ходу|niet rijdbaar|(?:ej|inte) körbar/i, "Auto niesprawne lub do naprawy", "Авто неисправно или требует ремонта"],
    [/western union|moneygram|vorkasse|treuhand(?:service|konto)|derzeit im ausland|befindet sich (?:derzeit )?im ausland|lieferung (?:nur )?per spedition nach zahlung|pagamento anticipato/i, "Sformułowania typowe dla oszustw (płatność z góry, auto „za granicą”)", "Формулировки, типичные для мошенничества (предоплата, авто «за границей»)"],
  ];
  const WARN_WORDS = [
    [/ohne (?:jede )?gew(?:ä|ae)hrleistung|unter ausschluss (?:der|jeglicher) (?:sach)?m(?:ä|ae)ngelhaftung|gew(?:ä|ae)hrleistungsausschluss|sans garantie|senza garanzia|bez gwarancji|bez r(?:ę|e)kojmi/i, "Bez rękojmi sprzedawcy", "Продавец исключает ответственность за дефекты"],
    [/vorschaden|reparierte?r? (?:unfall)?schaden|instandgesetzt|nachlackiert|teilweise lackiert|riparat|réparé|naprawian|(?:^|[^а-яё])(?:крашен[а-яё]*|окрашен[а-яё]*|кузовной ремонт)|gerepareerde schade|skadan är reparerad/i, "Auto miało naprawiane szkody", "Авто ремонтировалось после повреждений"],
    [/(?<!nessun )vincolo di finanziamento|prezzo (?:promo |valido )?con finanziamento|(?:preis|price) (?:nur )?(?:bei|with) finanzierung|finanzierungspreis|prix avec financement/i, "Cena może dotyczyć tylko zakupu na kredyt", "Цена может действовать только при покупке в кредит"],
    [/\btaxi\b|mietwagen|autovermietung|rental car|fahrschule|ex-?polizei|polizeifahrzeug|noleggio|ex[- ]?location|wypożyczaln|nauki jazdy|(?:^|[^а-яё])(?:такси|прокатн[а-яё]*|автошкол[а-яё]*)|ex[- ]?huurauto|f\.d\. hyrbil/i, "Możliwe użytkowanie flotowe (taxi, wynajem, nauka jazdy)", "Возможна эксплуатация в такси, прокате или автошколе"],
    [/km[- ]?stand nicht garantiert|tachostand (?:nicht|unbekannt)|km non (?:certificati|garantiti)|kilom(?:é|e)trage non garanti|przebieg niepewny/i, "Sprzedawca nie gwarantuje przebiegu", "Продавец не гарантирует пробег"],
  ];
  // Worth saying, not a warning.
  const INFO_WORDS = [
    [/re-?import|eu-?fahrzeug|eu-?neuwagen/i, "Auto z re-importu (inny rynek pierwotny)", "Авто из реимпорта (другой первичный рынок)"],
  ];

  const pct = (value) => `${Math.round(Math.abs(value) * 100)}%`;
  // The reader's Polish words ("12 miesięcy") in Russian (offer-ru.js).
  const RU_VALUE = (text) => (typeof globalThis !== "undefined" && globalThis.AUTOGOOD_OFFER_RU ? globalThis.AUTOGOOD_OFFER_RU.value(text) : text);
  // Polish plural: 1 opinia, 2–4 opinie (not 12–14), 5+ opinii.
  function plural(count, one, few, many) {
    const n = Math.abs(Math.round(Number(count) || 0));
    if (n === 1) return one;
    const last = n % 10;
    const lastTwo = n % 100;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
  }
  // Russian plural (the offer in Russian, owner 2026-10-10): 1, 21 отзыв;
  // 2–4, 22 отзыва; 5+, 11–14 отзывов.
  function pluralRu(count, one, few, many) {
    const n = Math.abs(Math.round(Number(count) || 0));
    const last = n % 10;
    const lastTwo = n % 100;
    if (last === 1 && lastTwo !== 11) return one;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
  }
  // A sentence of the text around a matched word, for the quote.
  function quoteAround(text, index, length) {
    const source = String(text || "");
    const start = Math.max(0, source.lastIndexOf("\n", index) + 1, index - 70);
    const endLine = source.indexOf("\n", index + length);
    const end = Math.min(source.length, endLine >= 0 ? endLine : source.length, index + length + 70);
    return `${start > 0 ? "…" : ""}${source.slice(start, end).replace(/\s+/g, " ").trim()}${end < source.length ? "…" : ""}`;
  }
  // "kein Unfall", "ohne Motorschaden", "nie powypadkowy", "nessun danno":
  // a denial right before the word is no flag.
  const DENIAL = /(?:\bkein(?:e|en|em|er)?|\bohne|\bnie|\bno|\bnot|\bnessun[ao]?|\bsenza|\bsans|\baucun(?:e)?|\bgeen|\bbez|\bbrak|\binte|\bingen|\baldrig)\b[\s\w\-/.,]{0,22}$/i;
  // "не битый, не крашеный", "без ДТП" (Russian: \b and \w are Latin only).
  const DENIAL_RU = /(?:^|[^а-яё])(?:не|без|нет|ни)[\s,.а-яё-]{0,22}$/i;
  function wordLines(texts, list, level, ru = false) {
    const lines = [];
    list.forEach(([pattern, text, textRu]) => {
      const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
      for (const source of texts) {
        const value = String(source || "");
        let match;
        let found = null;
        global.lastIndex = 0;
        while ((match = global.exec(value))) {
          const before = value.slice(Math.max(0, match.index - 40), match.index + (/^[^а-яёa-z]/i.test(match[0]) ? 1 : 0));
          if (!DENIAL.test(before) && !DENIAL_RU.test(before)) {
            found = match;
            break;
          }
          if (!match[0].length) global.lastIndex += 1;
        }
        if (found) {
          lines.push({ level, id: `word:${text}`, text: ru ? textRu : text, quote: quoteAround(value, found.index, found[0].length) });
          break;
        }
      }
    });
    return lines;
  }

  const yearsSince = (value, now) => {
    const date = Date.parse(value);
    return Number.isFinite(date) ? (now - date) / (365.25 * 86400000) : null;
  };
  // "03/2023" or 2023 → the car's age in years (at least half a year).
  function carAge(car, ad, now) {
    const reg = String(ad?.specs?.firstRegistration || car.reg || "").match(/(\d{1,2})\/(\d{4})/);
    const date = reg ? Date.UTC(Number(reg[2]), Number(reg[1]) - 1, 15) : car.year ? Date.UTC(Number(car.year), 6, 1) : NaN;
    return Number.isFinite(date) ? Math.max(0.5, (now - date) / (365.25 * 86400000)) : null;
  }

  // offer-facts.js: only firms / export, the dealer's delivery fee, a new car, availability.
  const FACTS = () => (typeof globalThis !== "undefined" ? globalThis.AUTOGOOD_OFFER_FACTS : null);
  const money = (value) => `${String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0€`;

  function assess({ car = {}, ad = null, market = null, now = Date.now(), lang = "pl", method = "" } = {}) {
    const lines = [];
    // Each line in the offer's language: Polish, or Russian (owner 2026-10-10).
    const ru = lang === "ru";
    const T = (pl, russian) => (ru ? russian : pl);
    const score = (value) => Number(value).toFixed(1).replace(".", ",");
    const specs = ad?.specs || {};
    const seller = ad?.seller || {};
    const flags = ad?.flags || {};
    const price = Number(car.price) || 0;

    // ---- Price against the market (the similar cars when there are enough).
    const own = market?.own || null;
    const basis = own?.similar?.stats?.median ? own.similar.stats : own?.stats;
    // O9 (owner 2026-10-11): a figure against the median only when the
    // comparison is sure; "medium" says it without the figure, "low" keeps
    // only the warnings (a price far under the market is a risk anyway).
    // Offers made before keep their lines (no confidence saved).
    const sure = own?.confidence?.level;
    if (basis?.median && price) {
      const ratio = price / basis.median;
      if (ratio < 0.6) lines.push({ level: "risk", id: "price:bait", text: T(`Cena o ${pct(1 - ratio)} niższa niż mediana podobnych aut — typowy sygnał oszustwa lub ukrytej wady`, `Цена на ${pct(1 - ratio)} ниже медианы похожих авто — типичный признак мошенничества или скрытого дефекта`) });
      else if (ratio < 0.75) lines.push({ level: "warn", id: "price:low", text: T(`Cena dużo niższa niż rynek (−${pct(1 - ratio)}) — sprawdzimy powód`, `Цена намного ниже рынка (−${pct(1 - ratio)}) — выясним причину`) });
      else if (sure === "low") { /* too few similar cars or prices too far apart: no claim */ }
      else if (price < basis.p25) lines.push({ level: "ok", id: "price:good", text: sure === "medium" ? T("Cena orientacyjnie poniżej typowego przedziału rynku", "Цена ориентировочно ниже типичного диапазона рынка") : T(`Cena poniżej typowego przedziału rynku (−${pct(1 - ratio)} do mediany)`, `Цена ниже типичного диапазона рынка (−${pct(1 - ratio)} к медиане)`) });
      else if (price <= basis.p75) lines.push({ level: "ok", id: "price:fair", text: T("Cena realna, w typowym przedziale rynku", "Реальная цена, в типичном диапазоне рынка") });
      else lines.push({ level: "warn", id: "price:high", text: sure === "medium" ? T("Cena orientacyjnie powyżej typowego przedziału rynku", "Цена ориентировочно выше типичного диапазона рынка") : T(`Cena powyżej typowego przedziału (+${pct(ratio - 1)} do mediany)`, `Цена выше типичного диапазона (+${pct(ratio - 1)} к медиане)`) });
    }

    // Without a market of our own: the portal's own price scale (mobile.de,
    // AutoScout24) when it calls the price good (owner 2026-10-11).
    const portal = ad?.portalPrice;
    if (!basis?.median && portal?.rating && ["VERY_GOOD_PRICE", "GOOD_PRICE"].includes(portal.rating)) {
      lines.push({ level: "ok", id: "price:portal", text: portal.rating === "VERY_GOOD_PRICE"
        ? T(`Bardzo dobra cena na tle rynku (wg ${portal.portal})`, `Очень хорошая цена на фоне рынка (по ${portal.portal})`)
        : T(`Dobra cena na tle rynku (wg ${portal.portal})`, `Хорошая цена на фоне рынка (по ${portal.portal})`) });
    }

    // ---- The deal as the ad states it (owner 2026-10-11).
    const facts = FACTS()?.read(ad, now) || {};
    if (facts.business) {
      const who = { export: T("tylko na eksport", "только на экспорт"), trade: T("tylko firmom i handlarzom", "только фирмам и перекупщикам"), business: T("tylko firmom", "только фирмам") }[facts.business.kind];
      // Straight from the dealer a private client cannot buy it; through AUTOGOOD (a firm) it is fine.
      lines.push(method === "direct"
        ? { level: "risk", id: "ad:business", text: T(`Dealer sprzedaje ${who} — zakup bezpośredni przez osobę prywatną nie jest możliwy`, `Дилер продаёт ${who} — частное лицо не может купить напрямую`), quote: facts.business.quote }
        : { level: "info", id: "ad:business", text: T(`Dealer sprzedaje ${who} — kupujemy przez AUTOGOOD na fakturę`, `Дилер продаёт ${who} — покупаем через AUTOGOOD по счёту-фактуре`) });
      // Quotes only for a warning: a fact the client reads needs none.
    }
    if (facts.fee) {
      lines.push(facts.fee.amount
        ? { level: "info", id: "ad:fee", text: T(`Opłata dealera za wydanie auta: ${money(facts.fee.amount)}${facts.fee.net ? " netto" : ""} — wliczona w cenę na gotowo`, `Сбор дилера за выдачу авто: ${money(facts.fee.amount)}${facts.fee.net ? " нетто" : ""} — включён в цену «под ключ»`) }
        : { level: "warn", id: "ad:fee", text: T("Dealer dolicza opłatę za wydanie auta — kwotę potwierdzimy", "Дилер добавляет сбор за выдачу авто — сумму уточним"), quote: facts.fee.quote });
    }
    if (facts.isNew) {
      const km = Number(specs.mileage || car.mileage) || 0;
      lines.push({ level: "ok", id: "car:new", text: km ? T(`Nowe auto, bez rejestracji (${km.toLocaleString("pl-PL")} km)`, `Новое авто, без регистрации (${km.toLocaleString("pl-PL")} км)`) : T("Nowe auto, bez rejestracji", "Новое авто, без регистрации") });
      lines.push({ level: "ok", id: "car:factoryWarranty", text: T("Pełna gwarancja fabryczna producenta", "Полная заводская гарантия производителя") });
    }
    const available = facts.availability;
    if (available && !available.inStock && available.pl) lines.push({ level: "info", id: "ad:available", text: T(`Dostępność u dealera: ${available.pl}`, `Наличие у дилера: ${available.ru}`) });
    else if (available?.inStock && facts.isNew) lines.push({ level: "ok", id: "ad:inStock", text: T("Auto dostępne od ręki (wg dealera)", "Авто в наличии (по словам дилера)") });

    // ---- Seller.
    if (seller.type === "private" || car.seller === "private") {
      lines.push({ level: "warn", id: "seller:private", text: T("Sprzedaje osoba prywatna — bez faktury i rękojmi dealera", "Продаёт частное лицо — без счёта-фактуры и гарантии дилера") });
    } else if (seller.type === "dealer" || car.seller === "dealer") {
      const rating = seller.rating;
      const years = seller.since ? (/^\d{4}$/.test(seller.since) ? new Date(now).getUTCFullYear() - Number(seller.since) : yearsSince(seller.since, now)) : null;
      // Short (owner 2026-10-10): the seller's figures are in its own card;
      // here only what they mean — long on the market, good reviews, many cars.
      const parts = [];
      if (years !== null && years >= 10) parts.push(T("od wielu lat na rynku", "давно на рынке"));
      else if (years !== null && years >= 3) parts.push(T("od kilku lat na rynku", "несколько лет на рынке"));
      if (rating?.reviews >= 5 && rating.score >= 4.5) parts.push(T("bardzo dobre opinie", "отличная оценка"));
      else if (rating?.reviews >= 5 && rating.score >= 4) parts.push(T("dobre opinie", "хорошая оценка"));
      if (Number(seller.stock) >= 30) parts.push(T("duży wybór aut", "много авто в продаже"));
      if (rating?.reviews >= 5 && rating.score < 4) lines.push({ level: "warn", id: "seller:rating", text: T(`Słabsze opinie dealera: ${score(rating.score)}/5 (${rating.reviews} ${plural(rating.reviews, "opinia", "opinie", "opinii")})`, `Слабые отзывы о дилере: ${score(rating.score)}/5 (${rating.reviews} ${pluralRu(rating.reviews, "отзыв", "отзыва", "отзывов")})`) });
      else if (parts.length) lines.push({ level: "ok", id: "seller:dealer", text: T(`Dealer ${parts.join(", ")}`, `Дилер ${parts.join(", ")}`) });
      else if (ad?.complete && !rating?.reviews && years === null) lines.push({ level: "warn", id: "seller:unknown", text: T("Brak opinii i historii dealera na portalu — sprawdzimy firmę", "Нет отзывов и истории дилера на портале — проверим компанию") });
      if (Number.isFinite(rating?.adReality) && rating.adReality < 85) lines.push({ level: "warn", id: "seller:reality", text: T(`Kupujący oceniają zgodność ogłoszeń dealera na ${rating.adReality}%`, `Покупатели оценивают соответствие объявлений дилера на ${rating.adReality}%`) });
    }
    if (flags.onCustomerBehalf) lines.push({ level: "warn", id: "seller:behalf", text: T("Sprzedaż w imieniu klienta (komis) — dealer nie odpowiada za wady", "Продажа от имени клиента (комиссия) — дилер не отвечает за дефекты") });

    // ---- The car.
    if (flags.damaged || specs.damaged) lines.push({ level: "risk", id: "car:damaged", text: T("Auto oznaczone na portalu jako uszkodzone", "Авто отмечено на портале как повреждённое") });
    if (flags.readyToDrive === false) lines.push({ level: "risk", id: "car:notDriving", text: T("Auto nie jest gotowe do jazdy", "Авто не на ходу") });
    if (specs.accidentFree === true) lines.push({ level: "ok", id: "car:accidentFree", text: T("Bezwypadkowy wg sprzedawcy — sprawdzimy grubość lakieru", "Без ДТП по словам продавца — проверим толщину ЛКП") });
    else if (specs.accidentFree === null && ad?.complete) lines.push({ level: "warn", id: "car:accidentUnknown", text: T("Sprzedawca nie podał, czy auto jest bezwypadkowe — sprawdzimy", "Продавец не указал, было ли авто в ДТП — проверим") });
    if (specs.rental || flags.rental) lines.push({ level: "warn", id: "car:rental", text: T("Auto z wypożyczalni", "Авто из проката") });
    if (specs.owners === 1 && !facts.isNew) lines.push({ level: "ok", id: "car:owner", text: T("Jeden poprzedni właściciel", "Один предыдущий владелец") });
    else if (specs.owners >= 4) lines.push({ level: "warn", id: "car:owners", text: T(`${specs.owners} poprzednich właścicieli`, `${specs.owners} ${pluralRu(specs.owners, "предыдущий владелец", "предыдущих владельца", "предыдущих владельцев")}`) });
    const features = (ad?.features || []).join(" | ");
    const serviceBook = specs.serviceBook === true || /scheckheft/i.test(features);
    if (serviceBook) lines.push({ level: "ok", id: "car:service", text: T("Udokumentowana historia serwisowa", "Подтверждённая сервисная история") });
    else if (ad?.complete && !facts.isNew) lines.push({ level: "warn", id: "car:serviceUnknown", text: T("Brak informacji o książce serwisowej — zapytamy przed rezerwacją", "Нет информации о сервисной книжке — уточним до резервации") });
    const warranty = ad?.warranty || (/(^|\|)\s*garantie\s*(\||$)/i.test(features) ? "tak" : null);
    if (warranty) lines.push({ level: "ok", id: "car:warranty", text: warranty === "tak" ? T("Gwarancja dealera", "Гарантия дилера") : T(`Gwarancja dealera: ${warranty}`, `Гарантия дилера: ${RU_VALUE(warranty)}`) });
    if (/świeży/.test(specs.hu || "")) lines.push({ level: "ok", id: "car:hu", text: T("Świeży przegląd techniczny (TÜV)", "Свежий техосмотр (TÜV)") });
    const age = carAge(car, ad, now);
    const km = Number(specs.mileage || car.mileage) || 0;
    if (age && km && !facts.isNew) {
      const perYear = km / age;
      if (perYear > 35000) lines.push({ level: "warn", id: "car:mileageHigh", text: T(`Duży przebieg: ok. ${Math.round(perYear / 1000) * 1000} km rocznie`, `Большой пробег: около ${Math.round(perYear / 1000) * 1000} км в год`) });
      else if (age >= 2 && perYear < 1500) lines.push({ level: "warn", id: "car:mileageLow", text: T("Bardzo mały przebieg jak na wiek — sprawdzimy historię licznika", "Очень маленький пробег для такого возраста — проверим историю одометра") });
      // Owner 2026-10-11: up to about 100 000 km is an attractive mileage.
      else if (km <= 100000) lines.push({ level: "ok", id: "car:mileageGood", text: T(`Atrakcyjny przebieg: ${km.toLocaleString("pl-PL")} km`, `Привлекательный пробег: ${km.toLocaleString("pl-PL")} км`) });
    }

    // ---- What the seller writes (title, description) and mobile.de's own summary.
    const texts = [ad?.title || car.title || "", ad?.description || "", (flags.aiTags || []).join(". ")];
    lines.push(...wordLines(texts, RISK_WORDS, "risk", ru));
    lines.push(...wordLines(texts, WARN_WORDS, "warn", ru));
    lines.push(...wordLines(texts, INFO_WORDS, "info", ru));
    if (flags.partner) lines.push({ level: "info", id: "ad:partner", text: T(`Ogłoszenie przeniesione z portalu ${flags.partner}`, `Объявление перенесено с портала ${flags.partner}`) });

    // ---- VAT.
    if (car.priceType === "vat" || ad?.vat?.deductible) lines.push({ level: "ok", id: "vat:invoice", text: T(`Faktura VAT${ad?.vat?.rate ? ` ${ad.vat.rate}%` : ""} — VAT do odliczenia dla firmy`, `Счёт-фактура VAT${ad?.vat?.rate ? ` ${ad.vat.rate}%` : ""} — VAT к вычету для фирмы`) });
    else if (car.priceType === "margin") lines.push({ level: "info", id: "vat:margin", text: T("Faktura VAT marża", "Счёт-фактура VAT marża") });

    const risks = lines.filter((line) => line.level === "risk").length;
    const warns = lines.filter((line) => line.level === "warn").length;
    const verdict = risks ? "risk" : warns >= 3 ? "check" : "ok";
    // Most important first: risks, warnings, then the good news.
    const order = { risk: 0, warn: 1, ok: 2, info: 3 };
    // The deal's own facts (only firms, the dealer's fee, availability) go
    // with the good news, first of them; then the price and the mileage: a
    // full sheet keeps them.
    const DEAL = ["ad:business", "ad:fee", "ad:available"];
    const levelOf = (line) => (DEAL.includes(line.id) && line.level === "info" ? order.ok : order[line.level]);
    const first = ["car:new", "car:factoryWarranty", "ad:available", "ad:business", "ad:fee", "ad:inStock", "price:portal", "price:good", "price:fair", "car:mileageGood", "seller:dealer"];
    const rank = (line) => (first.includes(line.id) ? first.indexOf(line.id) : first.length);
    lines.sort((left, right) => levelOf(left) - levelOf(right) || rank(left) - rank(right));
    return { verdict, lines };
  }

  // The room to negotiate, as a range of the price. A heuristic, shown as
  // such: how long the car is listed, whether its price already dropped,
  // where it stands against the market and how often prices drop there.
  function negotiation({ car = {}, ad = null, market = null, now = Date.now() } = {}) {
    const price = Number(car.price) || 0;
    if (!price) return null;
    const own = market?.own || null;
    // A comparison too thin to trust (O9) says nothing about the price here either.
    const basis = own?.confidence?.level === "low" ? null : own?.similar?.stats?.median ? own.similar.stats : own?.stats;
    const listed = ad?.listedAt && Number.isFinite(Date.parse(ad.listedAt)) ? ad.listedAt : "";
    const listedDays = listed ? Math.floor((now - Date.parse(listed)) / 86400000) : null;
    // The longest any source knows (the ad's date, our checks, Carvago, av.by,
    // the older ad of a car put up again).
    const known = [listedDays, market?.ad?.days].filter((value) => Number.isFinite(value));
    const days = known.length ? Math.max(...known) : null;
    const dropped = Boolean(market?.ad?.dropped);
    // M3: the car did not sell under its first number (O8).
    const relisted = Boolean(market?.relisted);
    let level = 1;
    if (days !== null && (days >= 60 || ((dropped || relisted) && days >= 30))) level = 3;
    else if ((days !== null && days >= 30) || dropped || relisted) level = 2;
    else if (days !== null && days < 14) level = 0;
    if (basis?.median && price < basis.p25) level -= 1;
    if (basis?.median && price > basis.p75) level += 1;
    level = Math.max(0, Math.min(3, level));
    const ranges = [[0, 1], [1, 2], [2, 3], [3, 5]];
    const [from, to] = ranges[level];
    const pace = market?.pace || null;
    const reasons = [];
    if (days !== null) reasons.push({ id: "days", days, atLeast: !listed && market?.ad?.kind === "atLeast" });
    if (dropped) reasons.push({ id: "dropped", drops: market.ad.drops, share: market.ad.share });
    if (relisted) reasons.push({ id: "relisted", at: market.relisted.at });
    if (basis?.median) reasons.push({ id: price < basis.p25 ? "cheap" : price > basis.p75 ? "dear" : "fair" });
    if (pace?.droppedShare) reasons.push({ id: "pace", share: pace.droppedShare, medianDrop: pace.medianDrop });
    const round = (value) => Math.round(value / 50) * 50;
    return {
      from,
      to,
      amountFrom: round((price * from) / 100),
      amountTo: round((price * to) / 100),
      currency: car.currency || "EUR",
      reasons,
    };
  }

  const api = { assess, negotiation, plural, pluralRu, RISK_WORDS, WARN_WORDS };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_VERDICT = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_VERDICT = api;
})();
