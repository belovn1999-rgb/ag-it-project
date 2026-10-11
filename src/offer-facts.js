/* AUTOGOOD offer (B71): what the ad says about the deal itself, read from
 * its title, description, attributes and mobile.de's own AI summary
 * (owner 2026-10-11, after the Volvo EX30 audit):
 * - business: the dealer sells only to firms, traders or for export
 *   ("Nur Gewerbekunden", "Händler/Export") — no direct purchase for a
 *   private client, only through AUTOGOOD;
 * - fee: the dealer's own delivery charge on top of the price
 *   ("Auslieferungspaket netto 1.175,63 Euro … werden getrennt berechnet"),
 *   with its amount when the ad names one;
 * - isNew: a new car (no registration, a delivery mileage);
 * - availability: from when the dealer has the car ("Ab 02.11.2026",
 *   "Verfügbarkeit im Herbst 2026") or that it is there now.
 * And the ad's name as the client reads it: no sales words ("Nur
 * Gewerbekunden", "MwSt. ausweisbar", "sofort"), abbreviations of the
 * version written out ("Bl.Ed." → "Black Edition"), the model's own trims
 * (src/model-specs) when they say what a cut word stands for.
 *
 * Pure — scripts/offer.test.mjs runs it. window.AUTOGOOD_OFFER_FACTS:
 * read(ad), cleanTitle(title, { trims }), availabilityText(item, lang).
 */
(() => {
  const flat = (value) => String(value || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\*\*/g, "");
  // Sentences of a text (a dot inside "1.175,63" or "02.11.2026" is no end).
  // Nor does one of an abbreviation ("zzgl.", "ca.", "inkl.").
  const sentences = (text) => flat(text)
    .split(/(?<!\b(?:zzgl|zuzgl|inkl|exkl|ca|bzw|ggf|evtl|nr|max|min|mtl|tel|str|vgl|usw|etc|incl|excl|approx|env|ok|tj|np|ab|kw))\.(?=\s+[^\s\da-zäöüß]|\s*$)|[!?](?=\s|$)|\n+/i)
    .map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  function texts(ad) {
    const flags = ad?.flags || {};
    return [
      ad?.title || "",
      ...(flags.aiTags || []),
      ...(flags.aiInsights || []).map((item) => `${item.title || ""}. ${item.subtitle || ""}`),
      flags.aiSummary || "",
      ad?.description || "",
    ];
  }
  const quoteOf = (text) => (text.length > 140 ? `${text.slice(0, 137)}…` : text);

  // ---- Only firms, traders or export ------------------------------------------------
  // Each phrase names the buyers ("nur an Händler", "Nur Gewerbekunden"),
  // so "nur beim Händler gewartet" or "Firmenwagen" are no limit.
  const BUSINESS = [
    /(?:nur|ausschlie(?:ß|ss)lich|exklusiv)\s+(?:g(?:ü|u)ltig\s+)?(?:f(?:ü|u)r|an)\s+(?:den\s+)?(?:gewerbe\w*|gewerbliche\w*|h(?:ä|a)ndler\w*|firmenkunden|gesch(?:ä|a)ftskunden|unternehmer\w*|wiederverk(?:ä|a)ufer\w*|export\w*)/i,
    /\bnur\s+(?:gewerbekunden|gewerbetreibende\w*|h(?:ä|a)ndler|export|firmenkunden|wiederverk(?:ä|a)ufer)\b/i,
    /(?:gewerbe|h(?:ä|a)ndler)\s*\/\s*export|export\s*\/\s*(?:gewerbe|h(?:ä|a)ndler)|\bexport only\b|\bonly (?:for|to) (?:export|traders|dealers|business(?:es)?|companies)\b|\bb2b\b/i,
    /\bkein(?:e)?\s+(?:verkauf\s+an\s+)?privat(?:kunden|personen|verkauf)?\b|\bnot (?:for|to) private/i,
    /\bsolo (?:a |per )?(?:commercianti|operatori del settore|aziende|partite? iva|export|esportazione)/i,
    /(?:r(?:é|e)serv(?:é|e)e?s?|uniquement|seulement)\s+(?:aux?|pour les?)\s+(?:professionnels?|marchands?|n(?:é|e)gociants?|export)|pas (?:de vente )?aux particuliers|vente (?:aux )?professionnels? uniquement/i,
    /\balleen (?:voor |aan )?(?:handelaren|export|bedrijven|zakelijk\w*)|niet (?:aan|voor) particulieren/i,
    /\bendast (?:till |för )?(?:export|f(?:ö|o)retag|handlare)|ej till privatpersoner/i,
    /\btylko (?:dla |na )?(?:firm(?:y)?\b|eksport|handlarzy|przedsi(?:ę|e)biorc\w*)|nie dla os(?:ó|o)b prywatnych/i,
    /только (?:для |на )?(?:экспорт|юр\.?\s?лиц|юридическ\S* лиц|фирм(?:\s|$)|организаций|перекупщик\S*)/i,
  ];
  function business(ad) {
    for (const text of texts(ad)) {
      for (const sentence of sentences(text)) {
        for (const pattern of BUSINESS) {
          const match = sentence.match(pattern);
          if (!match) continue;
          // "auch für Gewerbe", "Export möglich" without "nur": no limit.
          if (/\bauch\b|\baussi\b|\banche\b|\book\b|\bteż\b|\bтакже\b/i.test(sentence.slice(Math.max(0, match.index - 12), match.index))) continue;
          const words = match[0].toLowerCase();
          const kind = /export|esport|eksport|экспорт/.test(words) ? "export" : /h(?:ä|a)ndler|wiederverk|commercianti|operatori|marchand|n(?:é|e)gociant|handelaren|handlare|handlarzy|перекупщик|traders|dealers/.test(words) ? "trade" : "business";
          return { kind, quote: quoteOf(sentence) };
        }
      }
    }
    return null;
  }

  // ---- The dealer's delivery charge on top of the price --------------------------------
  const FEE = /auslieferungs(?:paket|kosten|pauschale|geb(?:ü|u)hr)|(?:ü|ue)berf(?:ü|ue)hrung(?:skosten|spauschale|sgeb(?:ü|u)hr)?|zulassungs(?:kosten|pauschale|paket|service)|bereitstellungs(?:kosten|pauschale|geb(?:ü|u)hr)|transferkosten|abholpauschale|frais de (?:mise à la route|pr(?:é|e)paration|livraison|dossier)|spese di (?:passaggio|messa su strada|immatricolazione|consegna)|afleverings?kosten|rijklaarmaakkosten|leveranskostnad\w*|koszt(?:y)? (?:wydania|przygotowania|rejestracji)/i;
  const EXTRA = /zzgl|zuz(?:ü|u)glich|getrennt|separat|extra|zus(?:ä|a)tzlich|werden (?:\w+ )?berechnet|wird (?:\w+ )?berechnet|nicht (?:im (?:kauf)?preis )?(?:enthalten|inbegriffen)|kommen hinzu|hinzu|\bplus\b|\s\+\s|en sus|en plus|in aggiunta|esclus[eoi]|escluse|exclusief|niet inbegrepen|tillkommer|dodatkowo|doliczan|nie wliczon|добавля|отдельно/i;
  const INCLUDED = /\binkl\b|inklusive|inbegriffen(?! nicht)|enthalten(?! nicht)|incluse?s?\b|compres[aoei]\b|inclusief|ing(?:å|a)r|wliczon|включен/i;
  // "1.175,63 Euro", "€ 990", "1 190 EUR", "990,-"
  const AMOUNT = /(?:€|eur(?:o)?)\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)|(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:,-\s*)?(?:€|eur(?:o)?\b)/i;
  const amountOf = (text) => Number(String(text).replace(/[.\s](?=\d{3}\b)/g, "").replace(",", ".")) || 0;
  function fee(ad) {
    let found = null;
    for (const text of texts(ad)) {
      for (const sentence of sentences(text)) {
        const match = sentence.match(FEE);
        if (!match) continue;
        const extra = EXTRA.test(sentence);
        const included = INCLUDED.test(sentence) && !extra;
        if (!extra || included) continue;
        const money = sentence.match(AMOUNT);
        const amount = money ? amountOf(money[1] || money[2]) : 0;
        const item = {
          amount: amount >= 50 && amount <= 6000 ? Math.round(amount * 100) / 100 : 0,
          currency: "EUR",
          net: /netto|\bnet\b|hors taxe|\bht\b|excl\.? btw|exkl\.? mwst|zzgl\.? mwst/i.test(sentence),
          quote: quoteOf(sentence),
        };
        // The sentence with the amount wins (the description over the AI summary).
        if (!found || (!found.amount && item.amount)) found = item;
        if (found.amount) return found;
      }
    }
    return found;
  }

  // ---- A new car ---------------------------------------------------------------------------
  function isNew(ad) {
    const specs = ad?.specs || {};
    const flags = ad?.flags || {};
    if (flags.isNew || flags.isConditionNew || specs.isNew) return true;
    if (/neufahrzeug|neuwagen|\bnowy\b|\bnieuw\b|\bneuf\b|\bnuov[ao]\b|\bновый\b/i.test(`${specs.condition || ""} ${(flags.aiTags || []).join(" ")}`)) return true;
    const km = Number(specs.mileage) || 0;
    return !specs.firstRegistration && km > 0 && km <= 1000 && /neu|new|nowy|nieuw|neuf|nuov|нов/i.test(`${ad?.title || ""} ${flags.aiSummary || ""}`);
  }

  // ---- From when the dealer has the car ----------------------------------------------------
  const MONTHS = [
    [/^(?:jan(?:uar)?|janvier|gennaio|januari|stycze\w*|январ\w*)$/i, "styczeń", "январь"],
    [/^(?:feb(?:ruar)?|f(?:é|e)vrier|febbraio|februari|luty|феврал\w*)$/i, "luty", "февраль"],
    [/^(?:m(?:ä|a)r(?:z|ch)?|mars|marzo|maart|marzec|март\w*)$/i, "marzec", "март"],
    [/^(?:apr(?:il)?|avril|aprile|kwiecie\w*|апрел\w*)$/i, "kwiecień", "апрель"],
    [/^(?:mai|may|mag(?:gio)?|mei|maj|ма[йя])$/i, "maj", "май"],
    [/^(?:jun[ie]?|juin|giugno|juni|czerwiec|июн\w*)$/i, "czerwiec", "июнь"],
    [/^(?:jul[iy]?|juillet|luglio|juli|lipiec|июл\w*)$/i, "lipiec", "июль"],
    [/^(?:aug(?:ust)?|ao(?:û|u)t|agosto|augustus|sierpie\w*|август\w*)$/i, "sierpień", "август"],
    [/^(?:sep(?:t(?:ember)?)?|septembre|settembre|wrzesie\w*|сентябр\w*)$/i, "wrzesień", "сентябрь"],
    [/^(?:okt(?:ober)?|oct(?:ober|obre)?|ottobre|pa(?:ź|z)dziernik|октябр\w*)$/i, "październik", "октябрь"],
    [/^(?:nov(?:ember|embre)?|listopad|ноябр\w*)$/i, "listopad", "ноябрь"],
    [/^(?:de[cz](?:ember|embre)?|dicembre|grudzie\w*|декабр\w*)$/i, "grudzień", "декабрь"],
  ];
  const SEASONS = [
    [/fr(?:ü|u)hjahr|fr(?:ü|u)hling|spring|printemps|primavera|voorjaar|wiosn\w*|весн\w*/i, "wiosną", "весной"],
    [/sommer|summer|(?:é|e)t(?:é|e)|estate|zomer|lat[oe]m?|лет\w*/i, "latem", "летом"],
    [/herbst|autumn|fall|automne|autunno|najaar|jesie\w*|осен\w*/i, "jesienią", "осенью"],
    [/winter|hiver|inverno|zim\w*|зим\w*/i, "zimą", "зимой"],
  ];
  const monthOf = (word) => MONTHS.find(([pattern]) => pattern.test(word));
  // A phrase after "ab" / "Verfügbarkeit" → { date, monthPl, monthRu, season… }.
  function when(phrase, now) {
    const text = String(phrase || "");
    const day = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (day) {
      const at = Date.UTC(Number(day[3]), Number(day[2]) - 1, Number(day[1]));
      return { at, pl: `od ${day[1].padStart(2, "0")}.${day[2].padStart(2, "0")}.${day[3]}`, ru: `с ${day[1].padStart(2, "0")}.${day[2].padStart(2, "0")}.${day[3]}` };
    }
    const monthYear = text.match(/\b(\d{1,2})[./](\d{4})\b/);
    if (monthYear && Number(monthYear[1]) <= 12) {
      const label = `${monthYear[1].padStart(2, "0")}/${monthYear[2]}`;
      return { at: Date.UTC(Number(monthYear[2]), Number(monthYear[1]) - 1, 1), pl: `od ${label}`, ru: `с ${label}` };
    }
    const year = text.match(/\b(20\d{2})\b/)?.[1];
    const named = [...text.matchAll(/[A-Za-zÀ-žА-яЁё]+/g)].map((word) => monthOf(word[0])).filter(Boolean);
    if (named.length && year) {
      const first = MONTHS.indexOf(named[0]);
      return { at: Date.UTC(Number(year), first, 1), pl: `${named.map((item) => item[1]).join("/")} ${year}`, ru: `${named.map((item) => item[2]).join("/")} ${year}` };
    }
    const season = SEASONS.find(([pattern]) => pattern.test(text));
    if (season && year) {
      const start = [2, 5, 8, 11][SEASONS.indexOf(season)];
      return { at: Date.UTC(Number(year), start, 1), pl: `${season[1]} ${year}`, ru: `${season[2]} ${year}` };
    }
    const week = text.match(/\b(?:kw|kalenderwoche|week|semaine|settimana|tydzie(?:ń|n))\s*(\d{1,2})\b/i);
    if (week) return { at: null, pl: `od ${week[1]}. tygodnia${year ? ` ${year}` : ""}`, ru: `с ${week[1]}-й недели${year ? ` ${year}` : ""}` };
    const span = text.match(/(?:ca\.?|etwa|circa|about|environ|ok\.?|около)?\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*(monat\w*|months?|mois|mesi|maand\w*|m(?:å|a)nad\w*|miesi\w*|месяц\w*|woche\w*|weeks?|semaines?|settimane|weken|veckor|tygod\w*|недел\w*)/i);
    if (span) {
      const range = span[2] ? `${span[1]}–${span[2]}` : span[1];
      const weeks = /woche|week|semaine|settiman|weken|veckor|tygod|недел/i.test(span[3]);
      return { at: null, lead: true, pl: `czas dostawy ok. ${range} ${weeks ? "tyg." : "mies."}`, ru: `срок поставки ок. ${range} ${weeks ? "нед." : "мес."}` };
    }
    return null;
  }
  const STOCK = /sofort (?:verf(?:ü|u)gbar|lieferbar|abholbereit)|lagerfahrzeug|ab lager|auf lager|vorr(?:ä|a)tig|in stock|disponible imm(?:é|e)diatement|pronta consegna|direct leverbaar|finns i lager|od r(?:ę|e)ki|в наличии/i;
  const LATER = /(?:verf(?:ü|u)gbar(?:keit)?|lieferbar|liefertermin|lieferzeit|lieferung|auslieferung|available|disponib\w*|consegna|leverbaar|levertijd|leverans|dost(?:ę|e)pn\w*|dostawa|поставк\w*|доступн\w*|наличи\w*)\s*(?:ab|im|in|ca\.?|von|vom|from|à partir d[eu]|dal|vanaf|fr(?:å|a)n|od|с|:)?\s*([^.\n()]{2,40}(?:\d{4}|monat\w*|month\w*|woche\w*|week\w*|\bkw\s*\d+))/i;
  const ZULAUF = /im zulauf|in zulauf|unterwegs zum h(?:ä|a)ndler|bestellfahrzeug|vorlauffahrzeug/i;
  function availability(ad, now = Date.now()) {
    const raw = String(ad?.specs?.availability || "");
    if (/^od ręki$/i.test(raw) || STOCK.test(raw)) return { inStock: true, quote: raw };
    const fromAttribute = raw ? when(raw, now) : null;
    if (fromAttribute) return finish({ ...fromAttribute, quote: raw }, now);
    for (const text of texts(ad)) {
      for (const sentence of sentences(text)) {
        const later = sentence.match(LATER);
        const parsed = later ? when(later[1], now) : null;
        if (parsed) return finish({ ...parsed, quote: quoteOf(sentence) }, now);
      }
    }
    for (const text of texts(ad)) {
      const stock = flat(text).match(STOCK);
      if (stock) return { inStock: true, quote: stock[0] };
      if (ZULAUF.test(flat(text))) return { inStock: false, pl: "auto w drodze do dealera", ru: "авто в пути к дилеру", quote: flat(text).match(ZULAUF)[0] };
    }
    return null;
  }
  // A date already past: the car is there.
  function finish(item, now) {
    if (item.at && item.at < now - 86400000) return { inStock: true, quote: item.quote };
    return { inStock: false, ...item };
  }
  const availabilityText = (item, lang = "pl") => (!item ? "" : item.inStock ? (lang === "ru" ? "в наличии" : "od ręki") : lang === "ru" ? item.ru : item.pl);

  // ---- The ad's name as the client reads it --------------------------------------------------
  // Sales words anywhere in the name.
  const SALES = [
    /\b(?:nur|only)\s+(?:f(?:ü|u)r\s+|an\s+)?(?:gewerbe\w*|h(?:ä|a)ndler\w*|export\w*|firmenkunden)\b/gi,
    /\b(?:gewerbe|h(?:ä|a)ndler)\s*\/\s*export\b|\bexport\s*\/\s*(?:gewerbe|h(?:ä|a)ndler)\b/gi,
    /\b(?:gewerbekunden|export(?:preis)?|b2b)\b/gi,
    /\bmwst\.?\s*(?:ausweisbar|ausw\.?)\b|\bausweisbar\b|\bnetto\b|\bbrutto\b|\bexkl\.?\s*mwst\.?/gi,
    /\bsofort\s*(?:verf(?:ü|u)gbar|lieferbar)?\b|\blagerfahrzeug\b|\bauf lager\b|\bverf(?:ü|u)gbar ab\s*\S+/gi,
    /\b(?:neuwagen|neufahrzeug|vorf(?:ü|u)hr(?:wagen|fahrzeug)|tageszulassung|jahreswagen|dienstwagen)\b/gi,
    /\b1\.?\s?hand\b|\bunfallfrei\b|\bscheckheft\w*\b|\bgarantie\w*\b|\bwartungsfrei\b/gi,
    /\b(?:leasing|finanzierung)\b.*$/gi,
    /\b(?:ab|nur)\s+\d[\d.,]*\s*(?:€|eur)\b.*$/gi,
    /\b(?:top|wow|neu|new|sale|aktion|angebot|super|mega)\b(?=\s|$)/gi,
  ];
  // Abbreviated version words, written out (owner 2026-10-11: what the model
  // tells, in full). Lower-case keys, the dot kept.
  const ABBR = {
    "bl.ed.": "Black Edition", "bl.ed": "Black Edition", "b.e.": "Black Edition", "ed.": "Edition", "edit.": "Edition",
    "perf.": "Performance", "perform.": "Performance", "lim.": "Limousine", "limo.": "Limousine",
    "hybr.": "Hybrid", "plug-in-hybr.": "Plug-in Hybrid", "insc.": "Inscription", "inscr.": "Inscription",
    "mom.": "Momentum", "r-des.": "R-Design", "r-desg.": "R-Design", "highl.": "Highline", "comfortl.": "Comfortline",
    "trendl.": "Trendline", "sportb.": "Sportback", "prem.": "Premium", "excl.": "Exclusive", "exkl.": "Exclusive",
    "lux.": "Luxury", "tour.": "Touring", "sportl.": "Sportline", "allr.": "Allroad", "dyn.": "Dynamic", "dynam.": "Dynamic",
    "eleg.": "Elegance", "avantg.": "Avantgarde", "progr.": "Progressive", "advan.": "Advance", "ultim.": "Ultimate",
    "kom.": "Kombi", "var.": "Variant", "cab.": "Cabrio", "conv.": "Convertible", "gr.coupe": "Gran Coupé",
    "s-tr.": "S tronic", "s-tron.": "S tronic", "stron.": "S tronic", "4mot.": "4MOTION", "4mat.": "4MATIC", "xdr.": "xDrive",
  };
  // TITLE_NOISE (offer.js, 10-05): equipment words that end the name.
  const TITLE_NOISE = /^(navi|navigation|alarm|shz|sitzhzg|sitzheizung|totwinkel|kamera|cam|r-?kam|rfk|acc|led|bi-?led|full-?led|matrix|xenon|ahk|pdc|klima|klimaautomatik|carplay|android|apple|garantie|scheckheft|mwst|netto|brutto|vat|tüv|hu|neu|top|voll|euro\s?\d|allwetter|winter|alu|lm|panorama|pano|leder|teilleder|keyless|virtual|cockpit|head-?up|hud|dab|tempomat|lane|assist|spur|sport-?paket|1\.?\s?hand|unfallfrei|scheckheftgepflegt|finanzierung|leasing|sofort|lieferbar)$/i;
  function expand(word, trims) {
    const key = word.toLowerCase();
    if (ABBR[key]) return ABBR[key];
    if (!/\./.test(word) || !trims.length) return word;
    // "Insc." → the one trim of the model whose words start so ("Inscription").
    const stems = key.split(".").filter(Boolean);
    const hits = trims.filter((trim) => {
      const parts = trim.toLowerCase().split(/[\s-]+/);
      return parts.some((_, start) => stems.every((stem, index) => parts[start + index]?.startsWith(stem)));
    });
    return hits.length === 1 && stems.join("").length >= 2 ? hits[0] : word;
  }
  function cleanTitle(title, { trims = [] } = {}) {
    let text = flat(title).replace(/\s+/g, " ").trim();
    SALES.forEach((pattern) => {
      text = text.replace(pattern, " ");
    });
    // "Bl. Ed." → "Bl.Ed." before the words are looked up.
    text = text.replace(/\b([A-Za-z]{1,4})\.\s+([A-Za-z]{1,4})\./g, "$1.$2.").replace(/\s+/g, " ").trim();
    // A comma inside "2,0-l" is part of the name.
    const first = (text.split(/\s*(?:[*+|"!#•;/]|,(?!\d))+\s*|\s{2,}|\s+-\s+(?=[A-ZÄÖÜ])/)[0] || text).trim();
    const kept = [];
    for (const word of first.split(" ")) {
      if (kept.length >= 3 && TITLE_NOISE.test(word.replace(/[.:()]/g, ""))) break;
      kept.push(expand(word, trims));
      if (kept.length >= 10) break;
    }
    const result = kept.join(" ").replace(/[.,;:\s-]+$/, "").replace(/\s+/g, " ").trim();
    return (result.length >= 5 ? result : flat(title).trim()).slice(0, 80);
  }

  function read(ad, now = Date.now()) {
    if (!ad) return { business: null, fee: null, isNew: false, availability: null };
    return { business: business(ad), fee: fee(ad), isNew: isNew(ad), availability: availability(ad, now) };
  }

  const api = { read, cleanTitle, availabilityText, business, fee, isNew, availability };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_FACTS = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_FACTS = api;
})();
