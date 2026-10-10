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
    [/(?:nur|only|solo|uniquement) (?:f(?:ü|u)r |per |pour )?(?:den )?export|export only|gewerbe\s*\/\s*export|h(?:ä|a)ndler\s*\/\s*export|nur an h(?:ä|a)ndler|solo (?:a )?commercianti|marchand uniquement|alleen (?:voor )?export|endast export|только (?:на )?экспорт/i, "Sprzedaż tylko na eksport lub dla handlarzy", "Продажа только на экспорт или перекупщикам"],
  ];
  const WARN_WORDS = [
    [/ohne (?:jede )?gew(?:ä|ae)hrleistung|unter ausschluss (?:der|jeglicher) (?:sach)?m(?:ä|ae)ngelhaftung|gew(?:ä|ae)hrleistungsausschluss|sans garantie|senza garanzia|bez gwarancji|bez r(?:ę|e)kojmi/i, "Bez rękojmi sprzedawcy", "Продавец исключает ответственность за дефекты"],
    [/vorschaden|reparierte?r? (?:unfall)?schaden|instandgesetzt|nachlackiert|teilweise lackiert|riparat|réparé|naprawian|(?:^|[^а-яё])(?:крашен[а-яё]*|окрашен[а-яё]*|кузовной ремонт)|gerepareerde schade|skadan är reparerad/i, "Auto miało naprawiane szkody", "Авто ремонтировалось после повреждений"],
    [/(?<!nessun )vincolo di finanziamento|prezzo (?:promo |valido )?con finanziamento|(?:preis|price) (?:nur )?(?:bei|with) finanzierung|finanzierungspreis|prix avec financement/i, "Cena może dotyczyć tylko zakupu na kredyt", "Цена может действовать только при покупке в кредит"],
    [/zzgl\.? (?:überführung|ueberfuehrung|zulassung|transport|bereitstellung)|(?:plus|\+) (?:überführung|ueberfuehrung)|bereitstellungskosten|spese di (?:passaggio|messa su strada)|frais de mise à la route/i, "Do ceny dochodzą opłaty dealera", "К цене добавляются сборы дилера"],
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

  function assess({ car = {}, ad = null, market = null, now = Date.now(), lang = "pl" } = {}) {
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
    if (basis?.median && price) {
      const ratio = price / basis.median;
      if (ratio < 0.6) lines.push({ level: "risk", id: "price:bait", text: T(`Cena o ${pct(1 - ratio)} niższa niż mediana podobnych aut — typowy sygnał oszustwa lub ukrytej wady`, `Цена на ${pct(1 - ratio)} ниже медианы похожих авто — типичный признак мошенничества или скрытого дефекта`) });
      else if (ratio < 0.75) lines.push({ level: "warn", id: "price:low", text: T(`Cena dużo niższa niż rynek (−${pct(1 - ratio)}) — sprawdzimy powód`, `Цена намного ниже рынка (−${pct(1 - ratio)}) — выясним причину`) });
      else if (price < basis.p25) lines.push({ level: "ok", id: "price:good", text: T(`Cena poniżej typowego przedziału rynku (−${pct(1 - ratio)} do mediany)`, `Цена ниже типичного диапазона рынка (−${pct(1 - ratio)} к медиане)`) });
      else if (price <= basis.p75) lines.push({ level: "ok", id: "price:fair", text: T("Cena realna, w typowym przedziale rynku", "Реальная цена, в типичном диапазоне рынка") });
      else lines.push({ level: "warn", id: "price:high", text: T(`Cena powyżej typowego przedziału (+${pct(ratio - 1)} do mediany)`, `Цена выше типичного диапазона (+${pct(ratio - 1)} к медиане)`) });
    }

    // ---- Seller.
    if (seller.type === "private" || car.seller === "private") {
      lines.push({ level: "warn", id: "seller:private", text: T("Sprzedaje osoba prywatna — bez faktury i rękojmi dealera", "Продаёт частное лицо — без счёта-фактуры и гарантии дилера") });
    } else if (seller.type === "dealer" || car.seller === "dealer") {
      const rating = seller.rating;
      const years = seller.since ? (/^\d{4}$/.test(seller.since) ? new Date(now).getUTCFullYear() - Number(seller.since) : yearsSince(seller.since, now)) : null;
      const parts = [];
      if (years !== null && years >= 1) parts.push(T(`od ${Math.floor(years)} ${plural(Math.floor(years), "roku", "lat", "lat")} na ${rating?.portal || "portalu"}`, `${Math.floor(years)} ${pluralRu(Math.floor(years), "год", "года", "лет")} на ${rating?.portal || "портале"}`));
      if (rating?.reviews) parts.push(T(`ocena ${score(rating.score)}/5 (${rating.reviews} ${plural(rating.reviews, "opinia", "opinie", "opinii")})`, `оценка ${score(rating.score)}/5 (${rating.reviews} ${pluralRu(rating.reviews, "отзыв", "отзыва", "отзывов")})`));
      if (rating?.reviews >= 5 && rating.score < 4) lines.push({ level: "warn", id: "seller:rating", text: T(`Słabsze opinie dealera: ${score(rating.score)}/5 (${rating.reviews} ${plural(rating.reviews, "opinia", "opinie", "opinii")})`, `Слабые отзывы о дилере: ${score(rating.score)}/5 (${rating.reviews} ${pluralRu(rating.reviews, "отзыв", "отзыва", "отзывов")})`) });
      else if (parts.length) lines.push({ level: "ok", id: "seller:dealer", text: T(`Dealer ${parts.join(", ")}`, `Дилер: ${parts.join(", ")}`) });
      else if (ad?.complete) lines.push({ level: "warn", id: "seller:unknown", text: T("Brak opinii i historii dealera na portalu — sprawdzimy firmę", "Нет отзывов и истории дилера на портале — проверим компанию") });
      if (Number.isFinite(rating?.adReality) && rating.adReality < 85) lines.push({ level: "warn", id: "seller:reality", text: T(`Kupujący oceniają zgodność ogłoszeń dealera na ${rating.adReality}%`, `Покупатели оценивают соответствие объявлений дилера на ${rating.adReality}%`) });
    }
    if (flags.onCustomerBehalf) lines.push({ level: "warn", id: "seller:behalf", text: T("Sprzedaż w imieniu klienta (komis) — dealer nie odpowiada za wady", "Продажа от имени клиента (комиссия) — дилер не отвечает за дефекты") });

    // ---- The car.
    if (flags.damaged || specs.damaged) lines.push({ level: "risk", id: "car:damaged", text: T("Auto oznaczone na portalu jako uszkodzone", "Авто отмечено на портале как повреждённое") });
    if (flags.readyToDrive === false) lines.push({ level: "risk", id: "car:notDriving", text: T("Auto nie jest gotowe do jazdy", "Авто не на ходу") });
    if (specs.accidentFree === true) lines.push({ level: "ok", id: "car:accidentFree", text: T("Bezwypadkowy wg sprzedawcy — sprawdzimy grubość lakieru", "Без ДТП по словам продавца — проверим толщину ЛКП") });
    else if (specs.accidentFree === null && ad?.complete) lines.push({ level: "warn", id: "car:accidentUnknown", text: T("Sprzedawca nie podał, czy auto jest bezwypadkowe — sprawdzimy", "Продавец не указал, было ли авто в ДТП — проверим") });
    if (specs.rental || flags.rental) lines.push({ level: "warn", id: "car:rental", text: T("Auto z wypożyczalni", "Авто из проката") });
    if (specs.owners === 1) lines.push({ level: "ok", id: "car:owner", text: T("Jeden poprzedni właściciel", "Один предыдущий владелец") });
    else if (specs.owners >= 4) lines.push({ level: "warn", id: "car:owners", text: T(`${specs.owners} poprzednich właścicieli`, `${specs.owners} ${pluralRu(specs.owners, "предыдущий владелец", "предыдущих владельца", "предыдущих владельцев")}`) });
    const features = (ad?.features || []).join(" | ");
    const serviceBook = specs.serviceBook === true || /scheckheft/i.test(features);
    if (serviceBook) lines.push({ level: "ok", id: "car:service", text: T("Udokumentowana historia serwisowa", "Подтверждённая сервисная история") });
    else if (ad?.complete) lines.push({ level: "warn", id: "car:serviceUnknown", text: T("Brak informacji o książce serwisowej — zapytamy przed rezerwacją", "Нет информации о сервисной книжке — уточним до резервации") });
    const warranty = ad?.warranty || (/(^|\|)\s*garantie\s*(\||$)/i.test(features) ? "tak" : null);
    if (warranty) lines.push({ level: "ok", id: "car:warranty", text: warranty === "tak" ? T("Gwarancja dealera", "Гарантия дилера") : T(`Gwarancja dealera: ${warranty}`, `Гарантия дилера: ${RU_VALUE(warranty)}`) });
    if (/świeży/.test(specs.hu || "")) lines.push({ level: "ok", id: "car:hu", text: T("Świeży przegląd techniczny (TÜV)", "Свежий техосмотр (TÜV)") });
    const age = carAge(car, ad, now);
    const km = Number(specs.mileage || car.mileage) || 0;
    if (age && km) {
      const perYear = km / age;
      if (perYear > 35000) lines.push({ level: "warn", id: "car:mileageHigh", text: T(`Duży przebieg: ok. ${Math.round(perYear / 1000) * 1000} km rocznie`, `Большой пробег: около ${Math.round(perYear / 1000) * 1000} км в год`) });
      else if (age >= 2 && perYear < 1500) lines.push({ level: "warn", id: "car:mileageLow", text: T("Bardzo mały przebieg jak na wiek — sprawdzimy historię licznika", "Очень маленький пробег для такого возраста — проверим историю одометра") });
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
    lines.sort((left, right) => order[left.level] - order[right.level]);
    return { verdict, lines };
  }

  // The room to negotiate, as a range of the price. A heuristic, shown as
  // such: how long the car is listed, whether its price already dropped,
  // where it stands against the market and how often prices drop there.
  function negotiation({ car = {}, ad = null, market = null, now = Date.now() } = {}) {
    const price = Number(car.price) || 0;
    if (!price) return null;
    const own = market?.own || null;
    const basis = own?.similar?.stats?.median ? own.similar.stats : own?.stats;
    const listed = ad?.listedAt && Number.isFinite(Date.parse(ad.listedAt)) ? ad.listedAt : "";
    const listedDays = listed ? Math.floor((now - Date.parse(listed)) / 86400000) : null;
    const days = listedDays ?? market?.ad?.days ?? null;
    const dropped = Boolean(market?.ad?.dropped);
    let level = 1;
    if (days !== null && (days >= 60 || (dropped && days >= 30))) level = 3;
    else if ((days !== null && days >= 30) || dropped) level = 2;
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
