/* AUTOGOOD — the offer from an auction report (oferta-aukcja.html, owner
 * 2026-10-11): one A4 sheet for the client in the auction's violet, the
 * dealer offer's structure (oferta.html) with the owner's blocks
 * (docs/PROJECT-AUCTION-REPORTS.md §8):
 *   head   — the report's main photo with how many photos it has, the car,
 *            the auction (country, date, time — filled before the offer) and
 *            the report's link next to it;
 *   1      — the car in four groups (identification, drive, colour and
 *            equipment, state at the inspection);
 *   2      — damages: element, damage, category · degree, repair, cost in
 *            Poland (the column shown to the client when the manager turns it
 *            on), traces without repair in one line, the total;
 *   3      — the verdict with 1–2 reasons, the risks under it (only here).
 * Three layouts to compare (owner: "несколько макетов"). The report is read
 * by src/auction-report.js, assessed by src/auction-assess.js; the draft
 * (report, auction, fills, edits) lives in this browser
 * (autogood.offer.auctionOffers.v1), made by "Przygotuj ofertę" in program 06.
 */
(() => {
  const REPORT = window.AUTOGOOD_AUCTION_REPORT;
  const ASSESS = window.AUTOGOOD_AUCTION_ASSESS;
  const stage = document.querySelector("[data-ao-stage]");
  const panel = document.querySelector("[data-ao-panel]");
  const statusLine = document.querySelector("[data-ao-status]");
  const editButton = document.querySelector("[data-ao-edit]");
  const pdfButton = document.querySelector("[data-ao-pdf]");
  const params = new URLSearchParams(window.location.search);
  // As the dealer offer (owner 2026-10-11): inside program 06 (embed=1) the page
  // with its settings; for the client by a link (view=client, the offer packed in
  // the link's #) the page only; the A4 sheets on their own ("Przygotuj PDF").
  const EMBED = params.get("embed") === "1";
  const CLIENT = params.get("view") === "client";
  const viewMode = CLIENT || EMBED || params.get("view") === "web" ? "web" : "sheets";
  const STORE_KEY = "autogood.offer.auctionOffers.v1";
  const PAGE_W = 794;
  const PAGE_H = 1123;
  let offer = null;
  let editing = false;
  // A long list on one page: light cosmetic repairs in one line (set by fit()).
  let compact = false;

  // ---- The drafts (never dropped; every write re-reads first) --------------------------
  function readAll() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return data && typeof data === "object" && data.offers ? data : { offers: {} };
    } catch {
      return { offers: {} };
    }
  }
  function save(patch = {}) {
    if (!offer) return;
    Object.assign(offer, patch, { updatedAt: new Date().toISOString() });
    // The client's copy lives in the link only.
    if (CLIENT) return;
    try {
      const all = readAll();
      all.offers[offer.id] = offer;
      localStorage.setItem(STORE_KEY, JSON.stringify(all));
    } catch {
      setStatus(L("Nie udało się zapisać zmian w tej przeglądarce.", "Не удалось сохранить изменения в этом браузере."), true);
    }
  }

  // ---- Words ------------------------------------------------------------------------------
  const ru = () => offer?.lang === "ru";
  const L = (pl, russian) => (ru() ? russian : pl);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const numbers = new Intl.NumberFormat("pl-PL", { useGrouping: true });
  const thousands = (value) => numbers.format(value).replace(/ | /g, " ").replace(/^(\d)(\d{3})$/, "$1 $2");
  const zl = (range) => (range ? `${thousands(range[0])}–${thousands(range[1])} zł` : "");
  const lang = () => (ru() ? "ru" : "pl");
  const word = (kind, value) => (value ? REPORT.word(kind, value, lang()) : "");
  const COUNTRIES = ["FR", "DE", "BE", "NL", "LU", "AT", "IT", "ES", "PT", "SE", "DK", "CH", "CZ", "PL", "GB"];
  const COUNTRY_PL = { FR: "Francja", DE: "Niemcy", BE: "Belgia", NL: "Holandia", LU: "Luksemburg", AT: "Austria", IT: "Włochy", ES: "Hiszpania", PT: "Portugalia", SE: "Szwecja", DK: "Dania", CH: "Szwajcaria", CZ: "Czechy", PL: "Polska", GB: "Wielka Brytania" };
  const COUNTRY_RU = { FR: "Франция", DE: "Германия", BE: "Бельгия", NL: "Нидерланды", LU: "Люксембург", AT: "Австрия", IT: "Италия", ES: "Испания", PT: "Португалия", SE: "Швеция", DK: "Дания", CH: "Швейцария", CZ: "Чехия", PL: "Польша", GB: "Великобритания" };
  const countryName = (code) => (ru() ? COUNTRY_RU : COUNTRY_PL)[code] || code || "";
  const flag = (code) => (window.AUTOGOOD_FLAG && code ? window.AUTOGOOD_FLAG(code) : "");
  const dateText = (iso) => {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
  };
  const plural = (count, one, few, many) => {
    const tens = count % 100;
    const units = count % 10;
    if (count === 1) return one;
    if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return few;
    return many;
  };
  const words = (count, pl, russian) => (ru() ? plural(count, ...russian) : plural(count, ...pl));
  const titleCase = (text) => String(text || "").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, gap, letter) => gap + letter.toUpperCase());
  function setStatus(text, error = false) {
    statusLine.textContent = text;
    statusLine.classList.toggle("isError", Boolean(error));
  }

  // ---- Icons (inline: the PDF needs no font for them) ----------------------------------------
  const ICON = {
    car: '<path d="M5 17h14M6 17l1.5-5h9L18 17M7 12l1.6-4h6.8L17 12"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>',
    gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h10"/>',
    engine: '<path d="M4 10h3l2-2h5l2 2h3v7H4z"/><path d="M8 8V6h5"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    warn: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    risk: '<circle cx="12" cy="12" r="9"/><path d="m8.5 8.5 7 7M15.5 8.5l-7 7"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
    tyre: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 11h6M9 15h4"/>',
  };
  const icon = (name) => `<svg class="aoIcon" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ""}</svg>`;

  // ---- What the client reads ---------------------------------------------------------------
  // A text the manager can change (Edytuj teksty): its own key in offer.texts.
  function field(key, fallback, tag = "span", className = "") {
    const text = offer.texts?.[key];
    const edited = typeof text === "string";
    return `<${tag} class="${className}${edited ? " isEdited" : ""}" data-edit="${esc(key)}"${editing ? ' contenteditable="true" spellcheck="false"' : ""}>${edited ? esc(text) : fallback}</${tag}>`;
  }
  const hidden = (key) => (offer.hidden || []).includes(key);

  function carView() {
    const report = offer.report;
    const car = report.car || {};
    const fill = offer.fill || {};
    const year = (car.firstRegistrationIso || "").slice(0, 4);
    const make = car.make && car.make.length <= 3 ? car.make.toUpperCase() : titleCase(car.make);
    const rawModel = car.model || (car.versionModel || "").replace(new RegExp(`^${car.make || ""}\\s+`, "i"), "");
    const name = [make, titleCase(rawModel)].filter(Boolean).join(" ") || titleCase(report.title);
    const versionAuto = car.versionDetails || (car.version && !/\//.test(car.version) ? car.version : "");
    const powerAuto = car.powerKw ? `${Math.round(car.powerKw * 1.35962)} ${L("KM", "л.с.")} (${car.powerKw} ${L("kW", "кВт")})` : car.powerHpFromVersion ? `${car.powerHpFromVersion} ${L("KM", "л.с.")}` : "";
    const engineAuto = (versionAuto.match(/\b\d[.,]\d\b/)?.[0] || "").replace(".", ",");
    return {
      name, year,
      version: fill.version || versionAuto,
      engine: fill.engine || (engineAuto ? `${engineAuto} ${L("l", "л")}` : ""),
      fuel: fill.fuel || word("value", car.fuel),
      gearbox: fill.gearbox || word("value", car.gearbox),
      power: fill.power || powerAuto,
      drive: word("value", car.drive),
    };
  }

  // The report's line: "Raport Macadam z 23.09.2026 · Labège, Francja".
  function reportLine() {
    const report = offer.report;
    const place = report.inspection?.place || "";
    const city = place.match(/\b\d{5}\s+([^,]+)$/)?.[1] || "";
    const date = dateText(report.inspection?.date);
    const where = [titleCase(city), countryName(report.country)].filter(Boolean).join(", ");
    // The report's age (owner 2026-10-11, CONFIRMED); no date in the report: said so.
    const days = report.inspection?.date ? Math.max(0, Math.floor((Date.now() - new Date(report.inspection.date)) / 86400000)) : null;
    const age = days === null ? "" : days === 0 ? L("dziś", "сегодня") : L(`${days} ${plural(days, "dzień", "dni", "dni")} temu`, `${days} ${plural(days, "день", "дня", "дней")} назад`);
    return `${L("Raport", "Отчёт")} ${esc(report.firm)}${date ? ` ${L("z", "от")} ${date} <b class="aoAge">(${esc(age)})</b>` : ` · ${L("data raportu: brak", "дата отчёта: нет")}`}${where ? ` · ${esc(where)}` : ""}`;
  }
  const reportUrl = () => offer.report.sourceUrl || "";
  // "reports.macadam.eu/reports/ed33fa73…" — the whole address stays behind the link.
  const shortUrl = (url) => {
    try {
      const address = new URL(url);
      const path = address.pathname.split("/").filter(Boolean).map((part) => (part.length > 14 ? `${part.slice(0, 8)}…` : part)).join("/");
      return `${address.hostname.replace(/^www\./, "")}/${path}`;
    } catch {
      return String(url || "");
    }
  };

  function photoCount() {
    const report = offer.report;
    // A client's link carries the count (its photo list is trimmed).
    if (report.photoCount) return report.photoCount;
    return new Set([...(report.photos || []), ...(report.damages || []).flatMap((damage) => damage.photos || [])]).size;
  }
  const mainPhoto = () => offer.photo || offer.report.mainPhoto || offer.report.photos?.[0] || offer.report.damages?.find((damage) => damage.photos?.length)?.photos[0] || "";

  // Tyres in one line: "letnie Bridgestone 18″: przód 225/45 — 6,0 mm, tył 255/40 — 4,3–4,5 mm".
  function tyresLine() {
    const tyres = offer.report.tyres || [];
    if (!tyres.length) return "";
    const mm = (value) => `${String(value).replace(".", ",")}`;
    const axle = (front) => tyres.filter((tyre) => /^AV/.test(tyre.position) === front && /^A[VR]/.test(tyre.position));
    const part = (list, label) => {
      if (!list.length) return "";
      const depths = list.map((tyre) => tyre.depth).filter((value) => typeof value === "number");
      const sizes = [...new Set(list.map((tyre) => (tyre.size || tyre.sizeShort || "").replace(/\s*R\s*\d{2}.*$/, "").replace(/^(\d{3}\/\d{2}).*$/, "$1")).filter(Boolean))];
      const min = Math.min(...depths);
      const max = Math.max(...depths);
      const range = depths.length ? (min === max ? `${mm(min)} mm` : `${mm(min)}–${mm(max)} mm`) : "";
      return `${label}${sizes.length === 1 ? ` ${sizes[0]}` : ""}${range ? ` — ${range}` : ""}`;
    };
    const season = word("value", tyres[0].season).toLowerCase();
    const brands = [...new Set(tyres.map((tyre) => tyre.brand).filter((brand) => brand && !/^autre$/i.test(brand)))];
    const sizeText = String(tyres[0].size || tyres[0].sizeShort || "");
    // "255/40 R 18 99 Y" or "235/55/18/100/V": the rim is after R or the third number.
    const rim = sizeText.match(/R\s?(\d{2})\b/i)?.[1] || sizeText.match(/^\d{3}\/\d{2}\/(\d{2})\b/)?.[1] || "";
    const inch = rim ? `${rim}″` : "";
    const head = [season, brands.length === 1 ? brands[0] : "", inch].filter(Boolean).join(" ");
    return `${head ? `${head}: ` : ""}${[part(axle(true), L("przód", "перед")), part(axle(false), L("tył", "зад"))].filter(Boolean).join(", ")}`;
  }

  function stateLine() {
    const state = offer.report.state || {};
    const yes = (value) => (/^oui$/i.test(value || "") ? L("tak", "да") : /^non$/i.test(value || "") ? L("nie", "нет") : "");
    const parts = [yes(state.engineRuns), yes(state.driveable), yes(state.batteryOk)];
    return parts.some(Boolean) ? parts.map((part) => part || "—").join(" / ") : "";
  }
  function keysLine() {
    const report = offer.report;
    const keys = report.keys || {};
    const parts = [];
    if (keys.keys) parts.push(`${keys.keys}${keys.remotes ? ` (${keys.remotes} ${L("z pilotem", "с пультом")})` : ""}`);
    for (const item of report.documents || []) {
      const label = REPORT.plain(item.label);
      const value = word("value", item.value).toLowerCase();
      // Never the registration paper (owner 2026-10-11, §3).
      if (/certificat immatriculation|certificat d'immatriculation/.test(label)) continue;
      if (/manuel/.test(label)) parts.push(`${L("instrukcja", "инструкция")}: ${value}`);
      else if (/type de carnet/.test(label)) parts.push(/digital/i.test(item.value) ? L("książka cyfrowa", "цифровая книжка") : `${L("książka", "книжка")}: ${value}`);
      else if (/carnet d'entretien$/.test(label)) parts.push(`${L("książka serwisowa", "сервисная книжка")}: ${value}`);
      else if (/conformite/.test(label)) parts.push(`CoC: ${value}`);
      else if (/^entretien$/.test(label) && /^ok$/i.test(item.value)) parts.push(`${L("serwis", "сервис")}: OK`);
    }
    return parts.join(" · ");
  }
  // Only the main options (owner 2026-10-11: green ticks as on page 1 of the search):
  // the strong ones; when the report has none, its known equipment.
  function equipmentList() {
    const report = offer.report;
    const source = [...(report.factoryEquipment || []), ...(report.options || [])];
    const pairs = source.map((item) => [REPORT.equipmentName(item, lang()), String(item).replace(/:\s*oui$/i, "")]).filter(([name]) => name);
    const known = [...new Set(pairs.filter(([name, original]) => name !== original).map(([name]) => name))];
    const main = known.filter((name) => strong(name));
    return (main.length >= 3 ? main : [...main, ...known.filter((name) => !main.includes(name))]).slice(0, 8);
  }
  const strong = (name) => (/skór|кож|nawigac|навигац|kamera|камера|led|ксенон|ksenon|panoram|панорам|szyberdach|люк|head-up|проекц|tempomat|круиз|podgrzew|подогрев|hak|фаркоп|elektryczna klapa|электропривод багаж|elektryczne fotele|электросид|czujniki parkowania|парктроник/i.test(name) ? 1 : 0);

  // ---- Block 2 and 3 from the assessment ------------------------------------------------------
  const CATEGORY = { kosmetyczne: ["kosmetyczne", "косметическое"], użytkowe: ["użytkowe", "эксплуатационное"], konstrukcyjne: ["konstrukcyjne", "конструктивное"] };
  const DEGREE = { lekkie: ["lekkie", "лёгкое"], średnie: ["średnie", "среднее"], poważne: ["poważne", "серьёзное"] };
  const pick = (table, key) => (table[key] ? table[key][ru() ? 1 : 0] : key);
  const VERDICT = {
    ok: ["Auto OK — polecamy do licytacji", "Авто OK — рекомендуем к торгам"],
    check: ["Wymaga uwagi", "Требует внимания"],
    risky: ["Ryzykowne", "Рискованно"],
    no: ["Nie polecamy", "Не рекомендуем"],
  };
  function reasonText(reason) {
    const n = reason.n || 0;
    switch (reason.key) {
      case "notRunning": return L("Według raportu auto nie uruchamia się lub nie jeździ.", "По отчёту авто не заводится или не едет.");
      case "structure": return L(`Uszkodzenia konstrukcyjne (${n}) — wymagają oceny blacharza.`, `Конструктивные повреждения (${n}) — нужна оценка кузовщика.`);
      case "impacts": return L(`Ślady uderzeń: ${n} ${words(n, ["element", "elementy", "elementów"], [])} nadwozia do wymiany i lakierowania.`, `Следы ударов: ${n} ${words(n, [], ["элемент", "элемента", "элементов"])} кузова под замену и покраску.`);
      case "impact": return L("Jeden element nadwozia do wymiany i lakierowania.", "Один элемент кузова под замену и покраску.");
      case "warning": return L("Na desce świeci się kontrolka błędu — przyczynę pokaże diagnostyka.", "На панели горит лампа ошибки — причину покажет диагностика.");
      case "badRepair": return L(`Raport wskazuje złą wcześniejszą naprawę (${n}).`, `Отчёт отмечает плохой прошлый ремонт (${n}).`);
      case "repaired": return L(`Elementy naprawiane wcześniej (${n}).`, `Ранее ремонтированные элементы (${n}).`);
      case "hail": return L("Ślady gradu na nadwoziu.", "Следы града на кузове.");
      case "costHigh": return L(`Naprawa w Polsce ok. ${zl([reason.min, reason.max])}.`, `Ремонт в Польше ок. ${zl([reason.min, reason.max])}.`);
      case "costMid": return n >= 3
        ? L(`${n} ${words(n, ["element", "elementy", "elementów"], [])} do lakierowania; naprawa ok. ${zl([reason.min, reason.max])}.`, `${n} ${words(n, [], ["элемент", "элемента", "элементов"])} под покраску; ремонт ок. ${zl([reason.min, reason.max])}.`)
        : L(`Naprawa w Polsce ok. ${zl([reason.min, reason.max])}.`, `Ремонт в Польше ок. ${zl([reason.min, reason.max])}.`);
      case "bodyClean": return n
        ? L(`Nadwozie i wnętrze praktycznie bez uszkodzeń (${n} ${words(n, ["drobna pozycja", "drobne pozycje", "drobnych pozycji"], [])}).`, `Кузов и салон практически без повреждений (${n} ${words(n, [], ["мелкая позиция", "мелкие позиции", "мелких позиций"])}).`)
        : L("Nadwozie i wnętrze bez uszkodzeń.", "Кузов и салон без повреждений.");
      case "bodyLight": return L(`Drobne naprawy lakiernicze (${n}).`, `Небольшой покрасочный ремонт (${n}).`);
      case "keysRunning": return L(`${n} ${words(n, ["kluczyk", "kluczyki", "kluczyków"], [])}, auto sprawne przy oględzinach.`, `${n} ${words(n, [], ["ключ", "ключа", "ключей"])}, авто исправно при осмотре.`);
      default: return "";
    }
  }
  function riskText(risk) {
    switch (risk.key) {
      case "warning": return L("Kontrolka błędu — koszt naprawy znany dopiero po diagnostyce (diagnostyka 150–300 zł).", "Лампа ошибки — стоимость ремонта станет известна после диагностики (диагностика 150–300 zł).");
      case "tyresLow": {
        const depths = risk.depths.map((value) => String(value).replace(".", ","));
        const range = depths.length > 1 ? `${Math.min(...risk.depths)}–${Math.max(...risk.depths)}`.replace(/\./g, ",") : depths[0];
        return L(`Opony ${range} mm — do wymiany w ciągu około sezonu (ok. ${zl(risk.cost)}).`, `Шины ${range} мм — замена примерно через сезон (ок. ${zl(risk.cost)}).`);
      }
      case "oneKey": return L("Jeden kluczyk — dorobienie drugiego ok. 300–1 200 zł.", "Один ключ — второй ок. 300–1 200 zł.");
      case "mileageHigh": return L(`Duży przebieg roczny (ok. ${thousands(risk.perYear)} km/rok) — zużycie zawieszenia, sprzęgła lub skrzyni.`, `Большой годовой пробег (ок. ${thousands(risk.perYear)} км/год) — износ подвески, сцепления или коробки.`);
      case "battery": return L("Stan baterii wysokiego napięcia nie był sprawdzany.", "Состояние высоковольтной батареи не проверялось.");
      case "hail": return L("Grad — liczba wgnieceń do potwierdzenia na zdjęciach; niższa cena przy odsprzedaży.", "Град — число вмятин уточнить по фото; ниже цена при перепродаже.");
      case "pastRepair": return L("Wcześniejsze naprawy — jakość ocenimy przy odbiorze auta.", "Прошлые ремонты — качество оценим при получении авто.");
      case "hiddenDamage": return L("Za elementami do wymiany mogą być ukryte uszkodzenia (mocowania, wzmocnienia).", "За элементами под замену могут быть скрытые повреждения (крепления, усилители).");
      case "serviceUnknown": return L("Historia serwisowa — raport jej nie podaje.", "История обслуживания — в отчёте её нет.");
      default: return "";
    }
  }

  // ---- The sheet -------------------------------------------------------------------------------
  const LAYOUTS = [
    ["hero", "Zdjęcie na górze", "Фото сверху", "zdjęcie na całą szerokość, aukcja na fioletowej plakietce, cztery grupy danych w rzędzie"],
    ["columns", "Dwie kolumny", "Две колонки", "zdjęcie obok aukcji i wniosku, dane 2 × 2, tabela pod spodem"],
    ["report", "Raport", "Отчёт", "fioletowy pasek z aukcją i linkiem, zdjęcie obok danych, wniosek na dole"],
  ];
  const layout = () => (LAYOUTS.some(([key]) => key === offer.layout) ? offer.layout : "hero");

  // A group of facts: only what the report confirms (owner 2026-10-11 — nothing unconfirmed is written).
  function groupHtml(key, iconName, title, rows, className = "") {
    const visible = rows.filter(([, value]) => value);
    if (!visible.length) return "";
    return `<section class="aoGroup ${className}" data-group="${key}">
      <h3>${icon(iconName)}<span>${esc(title)}</span></h3>
      <dl>${visible.map(([label, value, wide]) => `<div${wide ? ' class="isWide"' : ""}><dt>${esc(label)}</dt><dd>${value}</dd></div>`).join("")}</dl>
    </section>`;
  }

  // Block 1 (owner 2026-10-11): Identyfikacja · Potwierdzone dane auta (two a line) · Wyposażenie,
  // full width, shallow; the tyres in their own table.
  // web: the page shows mileage and the first registration in its figures on top (A), not twice.
  function blockOne(web = false) {
    const report = offer.report;
    const car = report.car || {};
    const view = carView();
    const mileage = ASSESS ? ASSESS.assess(report).mileage : null;
    const body = [word("value", car.body), car.doors ? `${car.doors} ${L(plural(Number(car.doors), "drzwi", "drzwi", "drzwi"), plural(Number(car.doors), "дверь", "двери", "дверей"))}` : "", car.seats ? `${car.seats} ${L(plural(Number(car.seats), "miejsce", "miejsca", "miejsc"), plural(Number(car.seats), "место", "места", "мест"))}` : ""].filter(Boolean).join(", ");
    const color = [word("value", car.color), car.paint ? word("value", car.paint).toLowerCase() : ""].filter(Boolean).join(" ");
    const interior = [word("value", car.interior), car.upholstery ? word("value", car.upholstery).toLowerCase() : ""].filter(Boolean).join(", ");
    const colorInterior = [color, interior ? `${L("wnętrze", "салон")}: ${interior.toLowerCase()}` : ""].filter(Boolean).join("; ");
    const firstReg = (car.firstRegistration || "").replace(/\//g, ".");
    const options = equipmentList();
    return `
      <div class="aoBlock aoBlockOne">
        ${groupHtml("id", "id", L("Identyfikacja", "Идентификация"), [
          [L("Numer rejestracyjny", "Номер"), esc(car.plate || "")],
          ["VIN", car.vin ? `<span class="aoMono">${esc(car.vin)}</span>` : ""],
          [L("Przebieg", "Пробег"), !web && car.mileageKm ? `${thousands(car.mileageKm)} km${mileage ? ` <small>(${L("ok.", "ок.")} ${thousands(Math.round(mileage.perYear / 1000))} ${L("tys. km/rok", "тыс. км/год")})</small>` : ""}` : ""],
          [L("Pierwsza rejestracja", "1-я регистрация"), web ? "" : esc(firstReg)],
        ], "isId")}
        ${groupHtml("confirmed", "engine", L("Potwierdzone dane auta", "Подтверждённые данные авто"), [
          [L("Wersja", "Версия"), esc(view.version), true],
          [L("Nadwozie", "Кузов"), esc(body)],
          [L("Kolor i wnętrze", "Цвет и салон"), esc(colorInterior)],
          [L("Silnik", "Двигатель"), esc(view.engine)],
          [L("Paliwo", "Топливо"), esc(view.fuel)],
          [L("Skrzynia", "Коробка"), esc(view.gearbox)],
          [L("Moc", "Мощность"), esc(view.power)],
          [L("Napęd", "Привод"), esc(view.drive)],
          [L("Uruchamia się / jeździ / akumulator", "Заводится / едет / АКБ"), esc(stateLine())],
          [L("Klucze i dokumenty", "Ключи и документы"), web ? "" : esc(keysLine()), true],
        ], "isConfirmed")}
        ${options.length ? `<section class="aoGroup isEquipment" data-group="equipment">
          <h3>${icon("check")}<span>${L("Wyposażenie", "Оснащение")}</span></h3>
          <ul class="aoChecks">${options.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </section>` : ""}
      </div>`;
  }

  // Tyres as a table, as on the report's page (owner 2026-10-11).
  function tyresHtml() {
    const tyres = offer.report.tyres || [];
    if (!tyres.length) return "";
    const positions = { AVG: L("przód lewa", "перед. левая"), AVD: L("przód prawa", "перед. правая"), ARG: L("tył lewa", "зад. левая"), ARD: L("tył prawa", "зад. правая") };
    const mm = (value) => (typeof value === "number" ? `${String(value).replace(".", ",")} mm` : "—");
    const brand = (value) => (!value || /^autre$/i.test(value) ? "—" : value);
    return `<section class="aoBlock aoTyres">
      <h2 class="aoBlockHead">${icon("tyre")}<span>${L("Opony", "Шины")}</span></h2>
      <table class="aoTable aoTyreTable"><thead><tr><th>${L("Koło", "Колесо")}</th><th>${L("Bieżnik", "Протектор")}</th><th>${L("Marka", "Марка")}</th><th>${L("Rozmiar", "Размер")}</th><th>${L("Sezon", "Сезон")}</th></tr></thead>
      <tbody>${tyres.map((tyre) => `<tr><td>${esc(positions[tyre.position] || tyre.position)}</td><td class="${typeof tyre.depth === "number" && tyre.depth < 4 ? "aoLow" : ""}">${mm(tyre.depth)}</td><td>${esc(brand(tyre.brand))}</td><td>${esc(tyre.size || tyre.sizeShort || "—")}</td><td>${esc(word("value", tyre.season) || "—")}</td></tr>`).join("")}</tbody></table>
    </section>`;
  }

  // part: undefined — the whole block; { upTo: n } — its head with the first n rows (page 1);
  // { from: n } — the rest of the rows, the total and the traces (page 2).
  function blockTwo(assessment, part) {
    const showCost = Boolean(offer.showCost);
    const light = (damage) => damage.assessment.degree === "lekkie" && damage.assessment.category === "kosmetyczne" && !damage.assessment.flags.length;
    const folded = compact ? assessment.rows.filter(light) : [];
    const rows = [...assessment.rows].filter((damage) => !folded.includes(damage)).sort((a, b) => rankOf(b) - rankOf(a));
    const foldedCost = folded.reduce((sum, damage) => (damage.assessment.cost ? [sum[0] + damage.assessment.cost[0], sum[1] + damage.assessment.cost[1]] : sum), [0, 0]);
    const foldedNames = folded.map((damage) => REPORT.partName(damage.element, lang()) || damage.element);
    const flagNote = (damage) => {
      const flags = damage.assessment.flags;
      if (flags.includes("badRepair")) return `<em class="aoFlag">${L("zła wcześniejsza naprawa", "плохой прошлый ремонт")}</em>`;
      if (flags.includes("repaired")) return `<em class="aoFlag">${L("naprawiane wcześniej", "ремонтировалось ранее")}</em>`;
      if (flags.includes("hail")) return `<em class="aoFlag">${L("grad", "град")}</em>`;
      return "";
    };
    const minor = assessment.minor.map((damage) => REPORT.partName(damage.element, lang()) || damage.element);
    const head = !part || part.upTo !== undefined;
    const tail = !part || part.from !== undefined;
    const shown = part?.upTo !== undefined ? rows.slice(0, part.upTo) : part?.from !== undefined ? rows.slice(part.from) : rows;
    const foldedHere = tail ? folded : [];
    return `
      <section class="aoBlock aoBlockTwo${part ? (head ? " isHead" : " isTail") : ""}">
        ${head ? `<h2 class="aoBlockHead">${icon("tool")}<span>${field("damagesTitle", L("Uszkodzenia, ocena i koszt naprawy", "Повреждения, оценка и стоимость ремонта"))}</span><small>${assessment.rows.length} ${L(plural(assessment.rows.length, "pozycja", "pozycje", "pozycji"), plural(assessment.rows.length, "позиция", "позиции", "позиций"))}</small></h2>
        ${badgesHtml(assessment)}` : `<p class="aoContinuedTable">${L("Uszkodzenia — ciąg dalszy", "Повреждения — продолжение")}</p>`}
        ${shown.length || foldedHere.length ? `<table class="aoTable${showCost ? " hasCost" : ""}"><colgroup><col class="cEl"><col class="cDm"><col class="cCat"><col class="cRep">${showCost ? '<col class="cCost">' : ""}</colgroup>
          <thead><tr><th>${L("Element", "Элемент")}</th><th>${L("Uszkodzenie", "Повреждение")}</th><th>${L("Kategoria · stopień", "Категория · степень")}</th><th>${L("Naprawa", "Ремонт")}</th>${showCost ? `<th class="aoNum">${L("Koszt w Polsce", "Стоимость в Польше")}</th>` : ""}</tr></thead>
          <tbody>${shown.map((damage) => {
            const a = damage.assessment;
            return `<tr class="is-${a.degree === "poważne" ? "hard" : a.degree === "średnie" ? "mid" : "soft"}">
              <td><b>${esc(REPORT.partName(damage.element, lang()) || damage.element)}</b>${flagNote(damage)}</td>
              <td>${esc(word("type", damage.type))}</td>
              <td class="aoCatCell"><span class="aoCat is-${a.category === "konstrukcyjne" ? "struct" : a.category === "użytkowe" ? "use" : "cosm"}">${esc(pick(CATEGORY, a.category))}</span> · <span class="aoDeg is-${a.degree === "poważne" ? "hard" : a.degree === "średnie" ? "mid" : "soft"}">${esc(pick(DEGREE, a.degree))}</span></td>
              <td>${esc(REPORT.repairName(damage.group, lang()) || damage.repair)}</td>
              ${showCost ? `<td class="aoNum">${a.cost ? zl(a.cost) : "—"}</td>` : ""}
            </tr>`;
          }).join("")}${foldedHere.length ? `<tr class="is-soft aoFolded"><td colspan="2"><b>${L("Drobne naprawy kosmetyczne", "Мелкий косметический ремонт")} (${folded.length})</b><span>${esc(someNames(foldedNames, 6))}</span></td><td class="aoCatCell"><span class="aoCat is-cosm">${esc(pick(CATEGORY, "kosmetyczne"))}</span> · <span class="aoDeg is-soft">${esc(pick(DEGREE, "lekkie"))}</span></td><td>${L("polerowanie, PDR, lakierowanie, smart repair", "полировка, PDR, покраска, smart repair")}</td>${showCost ? `<td class="aoNum">${zl(foldedCost.map((value) => Math.round(value / 50) * 50))}</td>` : ""}</tr>` : ""}</tbody>
          ${showCost && tail ? `<tfoot><tr><td colspan="4">${L("Razem — naprawa w Polsce (szacunek)", "Итого — ремонт в Польше (оценка)")}</td><td class="aoNum">${zl(assessment.total)}</td></tr></tfoot>` : ""}
        </table>` : `<p class="aoNone">${L("Raport nie wymienia uszkodzeń do naprawy.", "В отчёте нет повреждений под ремонт.")}</p>`}
        ${minor.length && tail ? `<p class="aoMinor">${field("minorLine", `<b>${L("Drobne ślady bez naprawy", "Мелкие следы без ремонта")}:</b> ${esc(someNames(minor))}.`, "span")}</p>` : ""}
      </section>`;
  }
  // Summary badges over the table (owner 2026-10-11, CONFIRMED): green when none, orange when some.
  function badgesHtml(assessment) {
    const all = assessment.damages;
    const painted = all.filter((damage) => ["replace_paint", "repair_paint", "paint"].includes(damage.group)).length;
    const repaired = all.some((damage) => damage.assessment.flags.some((flag) => flag === "repaired" || flag === "badRepair"));
    const hail = all.some((damage) => damage.assessment.flags.includes("hail"));
    const badge = (on, text) => `<span class="aoBadge ${on ? "isOn" : "isOff"}">${icon(on ? "warn" : "check")}${text}</span>`;
    return `<div class="aoBadges">
      ${badge(painted > 0, `${L("Nadwozie", "Кузов")}: <b>${painted ? `${painted} ${L(plural(painted, "element", "elementy", "elementów"), plural(painted, "элемент", "элемента", "элементов"))} ${L("do lakierowania", "под покраску")}` : L("bez lakierowania", "без покраски")}</b>`)}
      ${badge(repaired, `${L("Wcześniejsze naprawy", "Прошлые ремонты")}: <b>${repaired ? L("tak", "да") : L("nie", "нет")}</b>`)}
      ${badge(hail, `${L("Grad", "Град")}: <b>${hail ? L("tak", "да") : L("nie", "нет")}</b>`)}
    </div>`;
  }
  // A long list of names: the first ones and "i N innych".
  function someNames(names, limit = 8) {
    const list = names.map((name) => name.toLowerCase());
    if (list.length <= limit) return list.join(", ");
    const rest = list.length - limit;
    return `${list.slice(0, limit).join(", ")} ${L(`i ${rest} ${plural(rest, "inny", "inne", "innych")}`, `и ещё ${rest}`)}`;
  }
  const rankOf = (damage) => ({ poważne: 3, średnie: 2, lekkie: 1 })[damage.assessment.degree] * 10 + (damage.assessment.cost ? damage.assessment.cost[1] / 10000 : 0);

  function blockThree(assessment) {
    const level = offer.verdict && VERDICT[offer.verdict] ? offer.verdict : assessment.level;
    const reasons = assessment.reasons.filter((reason) => !hidden(`reason:${reason.key}`));
    const risks = assessment.risks.filter((risk) => !hidden(`risk:${risk.key}`));
    const tone = { ok: "ok", check: "check", risky: "risky", no: "no" }[level];
    return `
      <section class="aoBlock aoBlockThree is-${tone}">
        <div class="aoVerdict">
          <h2 class="aoBlockHead">${icon("shield")}<span>${L("Wniosek", "Вывод")}</span></h2>
          <p class="aoVerdictLabel is-${tone}">${icon(level === "ok" ? "check" : level === "no" ? "risk" : "warn")}${field("verdictLabel", esc(pick(VERDICT, level)), "span")}</p>
          <ul class="aoReasons">${reasons.map((reason) => `<li>${field(`reason:${reason.key}`, esc(reasonText(reason)))}${toggle(`reason:${reason.key}`)}</li>`).join("")}</ul>
        </div>
        <div class="aoRisks">
          <h3>${icon("warn")}<span>${L("Ryzyka", "Риски")}</span></h3>
          ${risks.length ? `<ul>${risks.map((risk) => `<li>${field(`risk:${risk.key}`, esc(riskText(risk)))}${toggle(`risk:${risk.key}`)}</li>`).join("")}</ul>` : `<p class="aoNone">${L("Raport nie wskazuje dodatkowych ryzyk.", "Отчёт не указывает дополнительных рисков.")}</p>`}
          ${field("inspectNote", L("Przed licytacją sprawdzimy zdjęcia raportu; po zakupie — diagnostyka i kontrola przy odbiorze.", "Перед торгами проверим фото отчёта; после покупки — диагностика и проверка при получении."), "p", "aoInspect")}
        </div>
      </section>`;
  }
  // The manager's × beside a reason or a risk (not in the PDF).
  const toggle = (key) => `<button class="aoToggle" type="button" data-offer-hide data-hide="${esc(key)}" title="${esc(L("Ukryj w ofercie", "Скрыть в предложении"))}">×</button>`;

  function auctionCard(extraClass = "") {
    const auction = offer.auction || {};
    const date = dateText(auction.date);
    const parts = [
      auction.country ? `<span class="aoAuctionCountry">${flag(auction.country)}${esc(countryName(auction.country))}</span>` : "",
      date ? `<span>${esc(date)}</span>` : "",
      auction.time ? `<span>${L("godz.", "в")} ${esc(auction.time)}</span>` : "",
    ].filter(Boolean);
    const url = reportUrl();
    return `
      <div class="aoAuction ${extraClass}">
        <p class="aoAuctionHead">${icon("gavel")}<span>${L("Licytacja", "Торги")}</span></p>
        <p class="aoAuctionWhen">${parts.length ? parts.join('<i aria-hidden="true">·</i>') : `<span class="aoFillMe" data-offer-hide>${L("uzupełnij kraj, datę i godzinę", "укажите страну, дату и время")}</span>`}</p>
        <p class="aoReportLine">${reportLine()}</p>
        ${url ? `<a class="aoReportLink" href="${esc(url)}" target="_blank" rel="noopener">${icon("link")}<span>${esc(shortUrl(url))}</span></a>` : ""}
      </div>`;
  }

  function photoHtml(className) {
    const src = mainPhoto();
    const count = photoCount();
    return `<figure class="aoPhoto ${className}">
      ${src ? `<img src="${esc(src)}" data-source="${esc(src)}" alt="" referrerpolicy="no-referrer" />` : `<div class="aoPhotoEmpty">${icon("car")}</div>`}
      ${count ? `<span class="aoPhotoCount">${icon("camera")}${count} ${L(plural(count, "zdjęcie", "zdjęcia", "zdjęć"), plural(count, "фото", "фото", "фото"))} ${L("w raporcie", "в отчёте")}</span>` : ""}
    </figure>`;
  }
  // 2–4 photos of the main damages under the table (owner 2026-10-11, CONFIRMED):
  // structural first, then earlier repairs and hail, then the costliest;
  // the caption says the element and the damage.
  function galleryHtml(assessment) {
    const weight = (damage) => {
      const a = damage.assessment;
      return (a.category === "konstrukcyjne" ? 1000 : 0) + (a.flags.some((flag) => ["badRepair", "repaired", "hail"].includes(flag)) ? 500 : 0) + (a.cost ? a.cost[1] / 10 : 0);
    };
    const picked = [...assessment.rows].filter((damage) => damage.photos?.length).sort((a, b) => weight(b) - weight(a)).slice(0, 4);
    // One damage only: its second photo too, so the strip has two.
    const shots = picked.map((damage) => [damage, damage.photos[0]]);
    if (shots.length === 1 && picked[0].photos[1]) shots.push([picked[0], picked[0].photos[1]]);
    if (shots.length < 2) return "";
    return `<section class="aoGallery" data-gallery>${shots.map(([damage, src]) => `<figure><img src="${esc(src)}" data-source="${esc(src)}" alt="" referrerpolicy="no-referrer" /><figcaption><b>${esc(REPORT.partName(damage.element, lang()) || damage.element)}</b> — ${esc(word("type", damage.type).toLowerCase())}</figcaption></figure>`).join("")}</section>`;
  }
  function titleHtml() {
    const view = carView();
    return `<div class="aoTitle">
      <p class="aoKicker">${L("Oferta z aukcji", "Предложение с аукциона")}</p>
      ${field("title", `${esc(view.name)}${view.year ? ` · ${esc(view.year)}` : ""}`, "h1", "aoName")}
      ${view.version ? `<p class="aoVersion">${esc(view.version)}</p>` : ""}
    </div>`;
  }
  function headHtml() {
    return `<header class="aoHead">
      <img class="aoLogo" src="./assets/autogood-logo.png" alt="AUTOGOOD" />
      <span class="aoHeadTag">${icon("gavel")}${L("Auto z aukcji", "Авто с аукциона")}</span>
      <span class="aoHeadMeta">${offer.number ? `${L("Oferta", "Предложение")} ${esc(offer.number)} · ` : ""}${esc(dateText(offer.createdAt))}</span>
    </header>`;
  }

  // The top of page 1 by layout; the blocks below it are the same in every layout.
  function topHtml() {
    const view = layout();
    if (view === "columns") return `<section class="aoTop">${photoHtml("isSide")}<div class="aoTopSide">${titleHtml()}${auctionCard()}</div></section>`;
    if (view === "report") return `<section class="aoBand">${titleHtml()}${auctionCard("isBand")}</section>${photoHtml("isWide isReportPhoto")}`;
    return `<section class="aoHero">${photoHtml("isWide")}<div class="aoHeroText">${titleHtml()}</div>${auctionCard("isPlate")}</section>`;
  }
  // galleryLast: on two pages the verdict stays on page 1 and the damage photos go over.
  function sections(galleryLast = false, tableRows = null) {
    const assessment = ASSESS.assess(offer.report);
    // The table cut between the pages: its first rows on page 1, the rest on page 2.
    if (tableRows !== null) {
      return [
        ["one", blockOne()],
        ["tyres", tyresHtml()],
        ["damages", blockTwo(assessment, { upTo: tableRows })],
        ["damagesTail", blockTwo(assessment, { from: tableRows })],
        ["verdict", blockThree(assessment)],
        ["gallery", galleryHtml(assessment)],
      ].filter(([, html]) => html);
    }
    const gallery = ["gallery", galleryHtml(assessment)];
    const verdict = ["verdict", blockThree(assessment)];
    return [
      ["one", blockOne()],
      ["tyres", tyresHtml()],
      ["damages", blockTwo(assessment)],
      ...(galleryLast ? [verdict, gallery] : [gallery, verdict]),
    ].filter(([, html]) => html);
  }
  function pageHtml(number, total, body) {
    const view = carView();
    return `<div class="aoSheet"><article class="aoPage isLayout-${layout()}" data-page="${number}" lang="${lang()}">
      ${headHtml()}
      ${number > 1 ? `<p class="aoContinued">${esc(view.name)}${view.year ? ` · ${esc(view.year)}` : ""} — ${L("ciąg dalszy", "продолжение")}</p>` : ""}
      <div class="aoContent">${body}</div>
      <footer class="aoFoot"><span><b>AUTOGOOD</b> · ${L("import aut z Europy", "импорт авто из Европы")} · autogood.pl</span><span>${L("Dane z raportu firmy oględzin; koszty w Polsce — szacunek AUTOGOOD.", "Данные из отчёта фирмы осмотра; стоимость в Польше — оценка AUTOGOOD.")}${total > 1 ? ` · ${number} / ${total}` : ""}</span></footer>
    </article></div>`;
  }
  // split: how many blocks stay on page 1; the rest go to page 2 (owner 2026-10-11:
  // too much — a second page, not smaller type).
  function sheetHtml(split = Infinity, galleryLast = false, tableRows = null) {
    const list = sections(galleryLast, tableRows);
    const first = list.slice(0, split).map(([, html]) => html).join("");
    const rest = list.slice(split).map(([, html]) => html).join("");
    const total = rest ? 2 : 1;
    return pageHtml(1, total, topHtml() + first) + (rest ? pageHtml(2, total, rest) : "");
  }

  function overflows(page) {
    const content = page?.querySelector(".aoContent");
    return Boolean(page) && (page.scrollHeight > PAGE_H + 1 || content.scrollHeight > content.clientHeight + 1);
  }
  // A page made to fit by the steps given; false when it still does not.
  function settle(page, steps) {
    for (const step of steps) {
      if (!overflows(page)) return true;
      page.classList.add(step);
    }
    return !overflows(page);
  }
  function fit() {
    const count = sections().length;
    for (const fold of [false, true]) {
      compact = fold;
      for (let split = count; split >= 1; split -= 1) {
        // On one page the photos sit under the table; once a page 2 is needed, after the verdict.
        drawSheet(split, split < count);
        const [one, two] = sheetsHost().querySelectorAll(".aoPage");
        // Page 1 keeps its type: the damage photos down to two, a little less room between blocks.
        if (!settle(one, ["isGalleryTwo", "isSnug", "isGallerySmall"])) continue;
        const list = sections(split < count);
        // The whole table went over: as many of its rows as fit stay on page 1.
        if (two && list[split]?.[0] === "damages" && cutTable(split)) return done();
        if (!two || settle(two, ["isGalleryTwo", "isTight", "isTighter", "isTightest", "isNoGallery"])) return done();
        break;
      }
    }
    setStatus(L("Treść nie mieści się na dwóch stronach — ukryj część ryzyk lub skróć teksty.", "Текст не помещается на две страницы — скройте часть рисков или сократите тексты."), true);
  }
  function done() {
    if (statusLine.classList.contains("isError") && /stron|страниц/.test(statusLine.textContent)) setStatus("");
  }
  // The most rows (at least three) that fit on page 1 under the blocks; false if none.
  function cutTable(split) {
    const rows = ASSESS.assess(offer.report).rows.length;
    for (let upTo = rows - 1; upTo >= 3; upTo -= 1) {
      drawSheet(split + 1, true, upTo);
      const [one, two] = sheetsHost().querySelectorAll(".aoPage");
      if (!settle(one, ["isSnug"])) continue;
      if (!two || settle(two, ["isGalleryTwo", "isTight", "isTighter", "isTightest", "isNoGallery"])) return true;
      return false;
    }
    return false;
  }
  // The A4 sheets: on their own page, or kept out of sight under the web page (for the PDF).
  const sheetsHost = () => stage.querySelector("[data-ao-sheets]") || stage;
  function drawSheet(split, galleryLast, tableRows = null) {
    sheetsHost().innerHTML = sheetHtml(split, galleryLast, tableRows);
    scale();
  }

  // ---- The offer as a web page (owner 2026-10-11: variant C + A) -------------------------------
  // The same blocks as the sheets (C) with A's figures on top and its lists of
  // documents and of how the car was inspected; what the page shows the client
  // sees by the link and in the PDF.
  function kpisHtml() {
    const car = offer.report.car || {};
    const view = carView();
    const mileage = ASSESS.assess(offer.report).mileage;
    const keys = offer.report.keys?.keys;
    const tiles = [
      [L("Przebieg", "Пробег"), car.mileageKm ? `${thousands(car.mileageKm)} km` : "", mileage ? `${L("ok.", "ок.")} ${thousands(Math.round(mileage.perYear / 1000))} ${L("tys. km/rok", "тыс. км/год")}` : ""],
      [L("1. rejestracja", "1-я регистрация"), (car.firstRegistration || "").replace(/\//g, "."), ""],
      [L("Moc", "Мощность"), view.power.replace(/\s*\(.*\)$/, ""), (view.power.match(/\((.*)\)/) || [])[1] || ""],
      [L("Silnik", "Двигатель"), view.engine, view.fuel],
      [L("Skrzynia", "Коробка"), view.gearbox, view.drive ? `${L("napęd", "привод")} ${view.drive.toLowerCase()}` : ""],
      [L("Kluczyki", "Ключи"), keys ? String(keys) : "", offer.report.keys?.remotes ? `${offer.report.keys.remotes} ${L("z pilotem", "с пультом")}` : ""],
    ].filter(([, value]) => value);
    return tiles.length ? `<div class="aoKpis">${tiles.map(([label, value, note]) => `<div class="aoKpi"><span>${esc(label)}</span><b>${esc(value)}</b>${note ? `<small>${esc(note)}</small>` : ""}</div>`).join("")}</div>` : "";
  }
  // Documents and service as ticks: only what the report confirms (never the registration paper's absence, §3).
  function documentChecks() {
    const report = offer.report;
    const yes = (value) => /^(oui|ok)$|^oui,/i.test(String(value || "").trim());
    const items = [];
    const docs = report.documents || [];
    const regParts = docs.filter((item) => /certificat d'immatriculation partie/i.test(REPORT.plain(item.label)) && yes(item.value));
    if (regParts.length >= 2) items.push(L("Dowód rejestracyjny — obie części", "Техпаспорт — обе части"));
    else regParts.forEach((item) => items.push(REPORT.labelName(item.label, lang())));
    for (const item of docs) {
      const key = REPORT.plain(item.label);
      if (/certificat d'immatriculation partie|certificat immatriculation|cable de charge/.test(key)) continue;
      if (/^entretien$/.test(key)) {
        if (yes(item.value)) items.push(L("Serwis OK", "Обслуживание OK"));
        else if (/over|km/i.test(item.value)) items.push(`${L("Serwis", "Обслуживание")}: ${REPORT.labelValue(item.value, lang())}`);
        continue;
      }
      if (/type de carnet/.test(key)) {
        items.push(/digital/i.test(item.value) ? L("Cyfrowa książka serwisowa", "Цифровая сервисная книжка") : `${REPORT.labelName(item.label, lang())}: ${REPORT.labelValue(item.value, lang())}`);
        continue;
      }
      if (yes(item.value)) items.push(REPORT.labelName(item.label, lang()));
    }
    const spare = (report.spare || []).filter((item) => yes(item.value)).map((item) => REPORT.labelName(item.label, lang()).toLowerCase());
    if (spare.length) items.push(`${L("Wyposażenie awaryjne", "Аварийный комплект")}: ${spare.join(", ")}`);
    return [...new Set(items)];
  }
  // How the car was inspected — what was done only (owner: risks only in the verdict; §3).
  function inspectedChips() {
    const report = offer.report;
    const state = report.state || {};
    const chips = [L("oględziny na postoju", "осмотр на стоянке"), L("zdjęcia każdej szkody z miarką", "фото каждого повреждения с линейкой")];
    if ((report.tyres || []).some((tyre) => typeof tyre.depth === "number")) chips.push(L("pomiar bieżnika", "замер протектора"));
    if (/^oui$/i.test(state.engineRuns || "")) chips.push(L("uruchomienie silnika", "запуск двигателя"));
    if (/^oui$/i.test(state.driveable || "")) chips.push(L("auto jeździ", "авто едет"));
    return chips;
  }
  function webHtml() {
    const assessment = ASSESS.assess(offer.report);
    const checks = documentChecks();
    const insp = offer.report.inspection || {};
    const place = (insp.place || "").match(/\b\d{5}\s+([^,]+)$/)?.[1] || "";
    return `<article class="aoWebPage" lang="${lang()}">
      ${headHtml()}
      <section class="aoWebHero">
        ${photoHtml("isWide")}
        <div class="aoWebHeroText">${titleHtml()}${auctionCard("isWebCard")}</div>
      </section>
      ${kpisHtml()}
      ${blockOne(true)}
      <div class="aoWebPair">
        ${checks.length ? `<section class="aoGroup"><h3>${icon("clipboard")}<span>${L("Dokumenty i serwis", "Документы и обслуживание")}</span></h3><ul class="aoChecks">${checks.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></section>` : ""}
        <section class="aoGroup"><h3>${icon("shield")}<span>${L("Jak sprawdzono", "Как проверяли")}</span></h3>
          <p class="aoWebFirm">${esc(offer.report.firm)}${insp.date ? ` · ${esc(dateText(insp.date))}` : ""}${place ? ` · ${esc(titleCase(place))}` : ""}</p>
          <div class="aoChipsRow">${inspectedChips().map((chip) => `<span class="aoChip">${icon("check")}${esc(chip)}</span>`).join("")}</div>
        </section>
      </div>
      ${tyresHtml()}
      ${blockTwo(assessment)}
      ${galleryHtml(assessment)}
      ${blockThree(assessment)}
      <footer class="aoFoot"><span><b>AUTOGOOD</b> · ${L("import aut z Europy", "импорт авто из Европы")} · autogood.pl</span><span>${L("Dane z raportu firmy oględzin; koszty w Polsce — szacunek AUTOGOOD.", "Данные из отчёта фирмы осмотра; стоимость в Польше — оценка AUTOGOOD.")}</span></footer>
    </article>`;
  }

  // ---- The manager's panel ----------------------------------------------------------------------
  function panelHtml() {
    return `<details class="aoAdvanced"${offer.panelOpen ? " open" : ""}><summary>${L("Ustawienia zaawansowane", "Расширенные настройки")}</summary>${panelCards()}</details>`;
  }
  function panelCards() {
    const auction = offer.auction || {};
    const fill = offer.fill || {};
    const report = offer.report;
    const assessment = ASSESS.assess(report);
    const commercial = (report.photos || []).slice(0, 12);
    const macadam = report.costTotal ? `${numbers.format(report.costTotal)} € ${L("netto", "нетто")}` : "";
    const hiddenItems = (offer.hidden || []).filter((key) => /^(reason|risk):/.test(key));
    return `
      <section class="aoCardP"><h2>${L("Wygląd", "Вид")}</h2>
        <div class="aoLayouts">${LAYOUTS.map(([key, pl, russian, hint]) => `<button type="button" data-layout="${key}" class="${layout() === key ? "isActive" : ""}" title="${esc(hint)}"><b>${esc(ru() ? russian : pl)}</b><small>${esc(hint)}</small></button>`).join("")}</div>
        <div class="aoLang" role="group">${["pl", "ru"].map((code) => `<button type="button" data-lang="${code}" class="${lang() === code ? "isActive" : ""}">${code.toUpperCase()}</button>`).join("")}</div>
      </section>
      <section class="aoCardP"><h2>${L("Licytacja", "Торги")}</h2>
        <label>${L("Kraj", "Страна")}<select data-auction="country"><option value="">—</option>${COUNTRIES.map((code) => `<option value="${code}"${auction.country === code ? " selected" : ""}>${esc(countryName(code))}</option>`).join("")}</select></label>
        <label>${L("Data", "Дата")}<input type="date" data-auction="date" value="${esc(auction.date || "")}" /></label>
        <label>${L("Godzina", "Время")}<input type="time" data-auction="time" value="${esc(auction.time || "")}" /></label>
      </section>
      <section class="aoCardP"><h2>${L("Uzupełnij po VIN", "Дополнить по VIN")}</h2>
        <p class="aoHint">${L("Raport nie podaje tych danych — sprawdź w programie VIN lub na stronie aukcji. Puste pola nie trafią do PDF.", "Отчёт этого не даёт — проверьте в программе VIN или на странице аукциона. Пустые поля в PDF не попадут.")}</p>
        ${[["version", L("Wersja", "Версия")], ["engine", L("Silnik", "Двигатель")], ["fuel", L("Paliwo", "Топливо")], ["gearbox", L("Skrzynia", "Коробка")], ["power", L("Moc", "Мощность")]].map(([key, label]) => `<label>${label}<input type="text" data-fill="${key}" value="${esc(fill[key] || "")}" placeholder="${esc(carView()[key] || "")}" /></label>`).join("")}
      </section>
      <section class="aoCardP"><h2>${L("Ocena", "Оценка")}</h2>
        <label>${L("Wniosek", "Вывод")}<select data-verdict><option value="">${L("automatycznie", "автоматически")}: ${esc(pick(VERDICT, assessment.level))}</option>${Object.keys(VERDICT).map((key) => `<option value="${key}"${offer.verdict === key ? " selected" : ""}>${esc(pick(VERDICT, key))}</option>`).join("")}</select></label>
        <label class="aoCheck"><input type="checkbox" data-show-cost${offer.showCost ? " checked" : ""} />${L("Pokaż klientowi koszt naprawy w Polsce", "Показать клиенту стоимость ремонта в Польше")}</label>
        <p class="aoHint">${L("Naprawa w Polsce (szacunek)", "Ремонт в Польше (оценка)")}: <b>${zl(assessment.total)}</b>${macadam ? `<br>${L("Wycena Macadam (stawki francuskie, tylko dla opiekuna)", "Оценка Macadam (французские ставки, только для менеджера)")}: <b>${esc(macadam)}</b>` : ""}</p>
        ${hiddenItems.length ? `<button class="aoLinkButton" type="button" data-unhide>${L(`Przywróć ukryte (${hiddenItems.length})`, `Вернуть скрытые (${hiddenItems.length})`)}</button>` : ""}
      </section>
      ${managerCard(assessment)}
      ${commercial.length > 1 ? `<section class="aoCardP"><h2>${L("Zdjęcie główne", "Главное фото")}</h2>
        <div class="aoThumbs">${commercial.map((src) => `<button type="button" data-photo="${esc(src)}" class="${mainPhoto() === src ? "isActive" : ""}"><img src="${esc(thumb(src))}" alt="" loading="lazy" referrerpolicy="no-referrer" /></button>`).join("")}</div>
      </section>` : ""}`;
  }
  // For the manager only (owner 2026-10-11): what the page leaves out — the report's raw data.
  function managerCard(assessment) {
    const report = offer.report;
    const missingNames = { version: L("wersja", "версия"), power: L("moc", "мощность"), fuel: L("paliwo", "топливо"), gearbox: L("skrzynia", "коробка"), drive: L("napęd", "привод"), inspectionDate: L("data oględzin", "дата осмотра"), inspectionPlace: L("miejsce", "место"), serviceBook: L("książka serwisowa", "сервисная книжка"), registration: L("dowód rejestracyjny", "техпаспорт"), tyres: L("opony", "шины") };
    const notChecked = L("jazda próbna, diagnostyka OBD, pomiar lakieru, podwozie na podnośniku, zawieszenie i hamulce, bateria wysokiego napięcia", "тест-драйв, диагностика OBD, замер краски, низ на подъёмнике, подвеска и тормоза, высоковольтная батарея");
    const raw = (report.documents || []).map((item) => `${esc(item.label)}: <b>${esc(item.value)}</b>`).join("<br>");
    return `<section class="aoCardP isManager"><h2>${L("Dla opiekuna", "Для менеджера")}</h2>
      ${report.missing?.length ? `<p class="aoHint"><b>${L("Brak w raporcie", "Нет в отчёте")}:</b> ${report.missing.map((key) => esc(missingNames[key] || key)).join(", ")}</p>` : ""}
      <p class="aoHint"><b>${L("Nie sprawdzono", "Не проверено")}:</b> ${esc(notChecked)}</p>
      <p class="aoHint">${esc(report.firm)} · ${esc(report.layoutName)}${report.client ? ` · ${esc(report.client)}` : ""}${report.inspection?.dateText ? ` · ${esc(report.inspection.dateText)}` : ""}${report.inspection?.place ? `<br>${esc(report.inspection.place)}` : ""}</p>
      ${report.costTotal ? `<p class="aoHint">${L("Wycena Macadam", "Оценка Macadam")}: <b>${numbers.format(report.costTotal)} € ${L("netto", "нетто")}</b> · ${L("nasza w Polsce", "наша в Польше")}: <b>${zl(assessment.total)}</b></p>` : ""}
      ${raw ? `<details class="aoRaw"><summary>${L("Dokumenty — oryginał raportu", "Документы — оригинал отчёта")}</summary><p class="aoHint">${raw}</p></details>` : ""}
      ${report.factoryDetails?.length ? `<details class="aoRaw"><summary>${L("Pełne wyposażenie wg VIN", "Полное оснащение по VIN")} (${report.factoryDetails.length})</summary><p class="aoHint">${report.factoryDetails.map(esc).join(" · ")}</p></details>` : ""}
      ${reportUrl() ? `<p class="aoHint"><a href="${esc(reportUrl())}" target="_blank" rel="noopener">${L("Otwórz oryginalny raport", "Открыть оригинальный отчёт")} ↗</a></p>` : ""}
    </section>`;
  }
  const thumb = (src) => String(src || "").replace(/\/picture\//i, "/thumbnail/").replace(/\/files\/Original\//i, "/files/Thumbnail/");

  // ---- Drawing ----------------------------------------------------------------------------------
  function render() {
    document.documentElement.lang = lang();
    document.title = `AUTOGOOD ${L("Oferta z aukcji", "Предложение с аукциона")} — ${carView().name}`;
    panel.innerHTML = CLIENT ? "" : panelHtml();
    editButton.textContent = editing ? L("Gotowe", "Готово") : L("Edytuj teksty", "Редактировать тексты");
    editButton.setAttribute("aria-pressed", String(editing));
    // In program 06 the button opens the A4 sheets (as the dealer offer: "Przygotuj PDF").
    pdfButton.textContent = EMBED ? L("Przygotuj PDF", "Подготовить PDF") : L("Pobierz PDF", "Скачать PDF");
    const linkButton = document.querySelector("[data-ao-link]");
    if (linkButton) linkButton.textContent = L("Link dla klienta", "Ссылка для клиента");
    const linkCopy = document.querySelector("[data-ao-link-copy]");
    if (linkCopy) linkCopy.textContent = L("Kopiuj", "Копировать");
    document.querySelector("[data-ao-heading]").textContent = `${L("Oferta z aukcji", "Предложение с аукциона")} ${offer.number || ""}`;
    stage.classList.toggle("isWeb", viewMode === "web");
    stage.innerHTML = viewMode === "web"
      ? `<div class="aoWeb" data-ao-web>${webHtml()}</div><div class="aoSheetsHold" data-ao-sheets aria-hidden="true"></div>`
      : `<div class="aoSheets" data-ao-sheets></div>`;
    fit();
  }

  // The sheet at its real size, smaller on a narrow screen.
  function scale() {
    if (viewMode === "web") return;
    const room = stage.clientWidth - 8;
    const factor = Math.min(1, room / PAGE_W);
    stage.querySelectorAll(".aoSheet").forEach((sheet) => {
      const page = sheet.querySelector(".aoPage");
      page.style.transform = factor < 1 ? `scale(${factor})` : "";
      sheet.style.height = `${PAGE_H * factor}px`;
      sheet.style.width = `${PAGE_W * factor}px`;
    });
  }
  window.addEventListener("resize", scale);

  stage.addEventListener("click", (event) => {
    const hide = event.target.closest("[data-hide]");
    if (hide) {
      save({ hidden: [...new Set([...(offer.hidden || []), hide.dataset.hide])] });
      render();
      return;
    }
  });
  // Edited texts are kept with the offer.
  stage.addEventListener("focusout", (event) => {
    const node = event.target.closest("[data-edit]");
    if (!node || !editing) return;
    const texts = { ...(offer.texts || {}), [node.dataset.edit]: node.innerText.replace(/\s+\n/g, "\n").trim() };
    // The sheet is fitted again when editing ends (a redraw now would lose the next field's focus).
    save({ texts });
  });
  editButton.addEventListener("click", () => {
    editing = !editing;
    render();
  });
  panel.addEventListener("click", (event) => {
    const layoutButton = event.target.closest("[data-layout]");
    if (layoutButton) {
      save({ layout: layoutButton.dataset.layout });
      return render();
    }
    const langButton = event.target.closest("[data-lang]");
    if (langButton) {
      save({ lang: langButton.dataset.lang });
      return render();
    }
    const photo = event.target.closest("[data-photo]");
    if (photo) {
      save({ photo: photo.dataset.photo });
      return render();
    }
    if (event.target.closest("[data-unhide]")) {
      save({ hidden: (offer.hidden || []).filter((key) => !/^(reason|risk):/.test(key)) });
      render();
    }
  });
  // Advanced settings stay open or closed as the manager left them.
  panel.addEventListener("toggle", (event) => {
    if (event.target.matches?.(".aoAdvanced")) save({ panelOpen: event.target.open });
  }, true);
  panel.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-auction]")) save({ auction: { ...(offer.auction || {}), [target.dataset.auction]: target.value } });
    else if (target.matches("[data-fill]")) save({ fill: { ...(offer.fill || {}), [target.dataset.fill]: target.value.trim() } });
    else if (target.matches("[data-verdict]")) save({ verdict: target.value });
    else if (target.matches("[data-show-cost]")) save({ showCost: target.checked });
    else return;
    render();
  });

  // ---- The client's link (as the dealer offer, owner 2026-10-11) --------------------------------
  // The whole offer packed into the link's # (deflate + base64url): no server; the
  // report trimmed to what the page shows (main photo, a few photos per damage).
  const toBase64Url = (bytes) => {
    let text = "";
    bytes.forEach((byte) => { text += String.fromCharCode(byte); });
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const fromBase64Url = (text) => Uint8Array.from(atob(String(text).replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
  async function packOffer() {
    const report = offer.report;
    const main = mainPhoto();
    const slimReport = {
      ...report,
      photos: [main, ...(report.photos || []).filter((src) => src !== main)].filter(Boolean).slice(0, 4),
      photoCount: photoCount(),
      damages: (report.damages || []).map(({ id, ...damage }) => ({ ...damage, photos: (damage.photos || []).slice(0, 2) })),
      factoryDetails: [], other: [],
    };
    const slim = { ...offer, report: slimReport, panelOpen: false };
    const stream = new Blob([JSON.stringify(slim)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  async function unpackOffer(text) {
    const stream = new Blob([fromBase64Url(text)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return JSON.parse(await new Response(stream).text());
  }
  async function clientLink() {
    const link = new URL("oferta-aukcja.html", window.location.href);
    link.search = "";
    link.searchParams.set("view", "client");
    link.hash = `o=${await packOffer()}`;
    return link.toString();
  }
  const linkRow = document.querySelector("[data-ao-link-row]");
  const linkField = document.querySelector("[data-ao-link-field]");
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      linkField?.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      }
    }
  }
  document.querySelector("[data-ao-link]")?.addEventListener("click", async () => {
    if (!offer) return;
    try {
      const url = await clientLink();
      linkField.value = url;
      linkRow.hidden = false;
      const copied = await copyText(url);
      save({ sharedAt: new Date().toISOString(), draft: false });
      setStatus(copied
        ? L(`Link skopiowany (${numbers.format(url.length)} znaków) — klient zobaczy tę stronę bez ustawień.`, `Ссылка скопирована (${numbers.format(url.length)} знаков) — клиент увидит эту страницу без настроек.`)
        : L("Skopiuj link z pola obok.", "Скопируйте ссылку из поля рядом."));
    } catch (error) {
      setStatus(`${L("Nie udało się przygotować linku", "Не удалось подготовить ссылку")} (${error?.message || error}).`, true);
    }
  });
  document.querySelector("[data-ao-link-copy]")?.addEventListener("click", async () => {
    if (linkField?.value && (await copyText(linkField.value))) setStatus(L("Link skopiowany.", "Ссылка скопирована."));
  });
  // In program 06's frame the settings follow the page's scroll (06 sends where its window is).
  window.addEventListener("message", (event) => {
    if (!EMBED || event.origin !== window.location.origin || event.data?.type !== "ag-offer-viewport" || !panel) return;
    if (window.matchMedia("(max-width: 1099px)").matches) {
      panel.style.removeProperty("top");
      panel.style.removeProperty("max-height");
      return;
    }
    const rest = panel.offsetTop - (Number.parseFloat(panel.style.top) || 0);
    const room = Math.max(0, stage.offsetHeight - Math.min(panel.scrollHeight, event.data.height - 24));
    panel.style.maxHeight = `${Math.max(320, event.data.height - 24)}px`;
    panel.style.top = `${Math.max(0, Math.min(room, event.data.top + 12 - rest))}px`;
  });
  // What program 06 changes (auction, client, language) shows here at once.
  window.addEventListener("storage", (event) => {
    if (CLIENT || editing || event.key !== STORE_KEY || !offer) return;
    const fresh = readAll().offers[offer.id];
    if (!fresh) return;
    offer = fresh;
    render();
  });

  // ---- PDF (as the dealer offer: the sheet as a picture, the text invisible over it, links live) ----
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
  let fontCss = null;
  async function pageFontCss() {
    if (fontCss !== null) return fontCss;
    const subsets = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"];
    try {
      const links = [...document.querySelectorAll('link[href*="fonts.googleapis.com/css"]')];
      const css = (await Promise.all(links.map(async (link) => (await fetch(link.href)).text()))).join("\n");
      const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)].filter((match) => subsets.includes(match[1])).map((match) => match[2]);
      const inlined = await Promise.all(faces.map(async (face) => {
        const url = (face.match(/url\(([^)]+)\)/) || [])[1];
        if (!url) return face;
        try {
          const data = await blobData(await (await fetch(url.replace(/["']/g, ""))).blob());
          return face.replace(url, `"${data}"`);
        } catch {
          return face;
        }
      }));
      fontCss = inlined.join("\n");
    } catch {
      fontCss = "";
    }
    return fontCss;
  }
  const blobData = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
  // A photo's bytes: Macadam gives no CORS, so through our Worker (macadam.eu
  // has to be on its list — server/cloudflare-proxy/worker.js).
  const photoCache = new Map();
  function photoData(src) {
    if (!photoCache.has(src)) {
      const worker = window.AUTOGOOD_WORKER_PROXY ?? "https://ag-proxy.autogood-crm.workers.dev/";
      const tries = [src, ...(worker ? [`${worker}${src}`] : [])];
      photoCache.set(src, (async () => {
        for (const url of tries) {
          try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const blob = await response.blob();
            if (/^image\//.test(blob.type)) return await blobData(blob);
          } catch {
            // The next way.
          }
        }
        return "";
      })());
    }
    return photoCache.get(src);
  }
  let photoMissing = false;
  async function captureSheet(live) {
    await loadScript("./vendor/html-to-image-exact.js?v=1.11.11-exact", "htmlToImage");
    const holder = document.createElement("div");
    holder.setAttribute("aria-hidden", "true");
    holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE_W}px;height:${PAGE_H}px;pointer-events:none;`;
    const copy = live.cloneNode(true);
    copy.style.transform = "";
    copy.style.boxShadow = "none";
    copy.querySelectorAll("[data-offer-hide], .aoEmpty").forEach((node) => node.remove());
    copy.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    copy.querySelectorAll(".isEdited").forEach((node) => node.classList.remove("isEdited"));
    holder.append(copy);
    document.body.append(holder);
    photoMissing = false;
    try {
      await Promise.all([...copy.querySelectorAll("img")].map(async (image) => {
        const src = image.dataset.source || image.getAttribute("src") || "";
        if (!/^https:\/\//.test(src)) return;
        const data = await photoData(src);
        if (data) image.setAttribute("src", data);
        else {
          // A photo the page cannot read would spoil the whole picture.
          photoMissing = true;
          const figure = image.closest(".aoGallery figure");
          if (figure) figure.remove();
          else image.replaceWith(Object.assign(document.createElement("div"), { className: "aoPhotoEmpty", innerHTML: icon("car") }));
        }
      }));
      copy.querySelectorAll(".aoGallery").forEach((gallery) => {
        if (!gallery.querySelector("img")) gallery.remove();
      });
      await Promise.all([...copy.querySelectorAll("img")].map((image) => (image.complete ? null : new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      }))));
      const box = copy.getBoundingClientRect();
      const links = [...copy.querySelectorAll("a[href^='http']")].map((link) => {
        const rect = link.getBoundingClientRect();
        return { url: link.href, left: rect.left - box.left, top: rect.top - box.top, right: rect.right - box.left, bottom: rect.bottom - box.top };
      });
      const lines = textLines(copy, box);
      const canvas = await window.htmlToImage.toCanvas(copy, { pixelRatio: 2.5, backgroundColor: "#ffffff", fontEmbedCSS: (await pageFontCss()) || undefined, width: PAGE_W, height: PAGE_H, skipAutoScale: true });
      return { canvas, links, lines };
    } finally {
      holder.remove();
    }
  }
  function textLines(root, box) {
    const lines = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (node) => (node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const style = getComputedStyle(node.parentElement);
      const upper = style.textTransform === "uppercase";
      const size = parseFloat(style.fontSize) || 12;
      for (const match of node.nodeValue.matchAll(/\S+/g)) {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = [...range.getClientRects()].find((item) => item.width > 0 && item.height > 0);
        if (!rect) continue;
        const word = { text: upper ? match[0].toUpperCase() : match[0], left: rect.left - box.left, right: rect.right - box.left, top: rect.top - box.top, bottom: rect.bottom - box.top, size };
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.bottom - word.bottom) < size * 0.45 && word.left >= last.right - 1 && word.left - last.right < size * 1.6) {
          last.text += ` ${word.text}`;
          last.right = word.right;
          last.top = Math.min(last.top, word.top);
        } else lines.push(word);
      }
    }
    return lines;
  }
  async function makePdf() {
    pdfButton.disabled = true;
    setStatus(L("Przygotowuję PDF…", "Готовлю PDF…"));
    try {
      await loadScript("./vendor/pdf-lib.min.js", "PDFLib");
      await loadScript("./vendor/fontkit.umd.min.js", "fontkit").catch(() => null);
      const { PDFDocument, PDFName, PDFString } = window.PDFLib;
      const pdf = await PDFDocument.create();
      let font = null;
      if (window.fontkit) {
        try {
          const bytes = await fetch("./assets/Tinos-Regular.ttf").then((response) => (response.ok ? response.arrayBuffer() : null));
          if (bytes) {
            pdf.registerFontkit(window.fontkit);
            font = await pdf.embedFont(bytes, { subset: true });
          }
        } catch {
          font = null;
        }
      }
      const width = 595.28;
      const height = 841.89;
      const k = width / PAGE_W;
      for (const live of sheetsHost().querySelectorAll(".aoPage")) {
      const shot = await captureSheet(live);
      const page = pdf.addPage([width, height]);
      page.drawImage(await pdf.embedJpg(shot.canvas.toDataURL("image/jpeg", 0.9)), { x: 0, y: 0, width, height });
      if (font) {
        for (const line of shot.lines) {
          const text = line.text.replace(/[^ -ɏЀ-ӿ -ÿ‐-…€«»×″]/g, " ").replace(/\s+/g, " ").trim();
          if (!text) continue;
          try {
            const lineHeight = (line.bottom - line.top) * k;
            const lineWidth = (line.right - line.left) * k;
            let size = Math.max(4, Math.min(line.size * k, lineHeight * 0.92));
            const natural = font.widthOfTextAtSize(text, size);
            if (natural > 0 && lineWidth > 0) size = Math.max(3, Math.min(size * 1.6, size * (lineWidth / natural)));
            page.drawText(text, { x: line.left * k, y: height - line.bottom * k + lineHeight * 0.22, size, font, opacity: 0 });
          } catch {
            // A letter without a glyph: the line stays picture only.
          }
        }
      }
      const annotations = shot.links.map((link) => pdf.context.register(pdf.context.obj({
        Type: "Annot", Subtype: "Link", Rect: [link.left * k, height - link.bottom * k, link.right * k, height - link.top * k], Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(link.url) },
      })));
      if (annotations.length) page.node.set(PDFName.of("Annots"), pdf.context.obj(annotations));
      }
      const view = carView();
      pdf.setTitle(`AUTOGOOD — ${L("oferta z aukcji", "предложение с аукциона")} ${offer.number || ""} — ${view.name}`);
      pdf.setAuthor("AUTOGOOD");
      const name = `AUTOGOOD Oferta aukcja ${offer.number || ""} ${view.name}${ru() ? " RU" : ""} ${new Date().toISOString().slice(0, 10)}.pdf`.replace(/[\\/:*?"<>|']+/g, "").replace(/\s+/g, " ");
      const url = URL.createObjectURL(new Blob([await pdf.save()], { type: "application/pdf" }));
      const anchor = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      save({ exportedAt: new Date().toISOString() });
      setStatus(photoMissing
        ? L(`PDF gotowy (${name}) — bez zdjęć: serwer zdjęć Macadam nie pozwala ich pobrać, potrzebny nasz Worker z macadam.eu.`, `PDF готов (${name}) — без фото: сервер фото Macadam не отдаёт их, нужен наш Worker с macadam.eu.`)
        : `${L("PDF gotowy", "PDF готов")}: ${name}`, photoMissing);
    } catch (error) {
      setStatus(`${L("Nie udało się przygotować PDF", "Не удалось подготовить PDF")} (${error?.message || error}).`, true);
    } finally {
      pdfButton.disabled = false;
    }
  }
  pdfButton.addEventListener("click", () => {
    // Program 06: the A4 sheets on their own page, where "Pobierz PDF" makes the file.
    if (EMBED) {
      window.open(`./oferta-aukcja.html?id=${encodeURIComponent(offer.id)}`, "_blank", "noopener");
      return;
    }
    makePdf();
  });

  // ---- Opening ---------------------------------------------------------------------------------
  function open() {
    if (!REPORT || !ASSESS) {
      stage.innerHTML = '<p class="aoWaiting">Brak modułów raportu.</p>';
      return;
    }
    if (CLIENT) {
      unpackOffer(new URLSearchParams(window.location.hash.slice(1)).get("o") || "").then((packed) => {
        offer = packed;
        render();
        if (document.fonts?.ready) document.fonts.ready.then(fit);
      }).catch(() => {
        stage.innerHTML = '<p class="aoWaiting">Ten link jest niepełny — poproś o nowy. / Ссылка неполная — попросите новую.</p>';
      });
      return;
    }
    const id = params.get("id") || "";
    const all = readAll();
    offer = all.offers[id] || null;
    if (!offer) {
      stage.innerHTML = `<p class="aoWaiting">Nie znaleziono tej oferty w tej przeglądarce. <a href="./oferty.html?tryb=aukcja">Wróć do raportu z aukcji</a>.</p>`;
      return;
    }
    if (params.get("layout")) offer.layout = params.get("layout");
    render();
    if (document.fonts?.ready) document.fonts.ready.then(fit);
  }
  open();
})();
