/* AUTOGOOD program 06 "Oferta", second way "Z raportu aukcji" (owner
 * 2026-10-11): a condition report from an auction — its link or its PDF —
 * read into one template (src/auction-report.js) and shown for the manager:
 * the car, the inspection, keys and documents, equipment, tyres, damages with
 * the report's repair and price, what the report does not say. The firm and
 * the layout are found by themselves (Macadam now; TÜV, DEKRA and the auctions'
 * own reports named, read later). The offer built on it comes next.
 *
 * Links are read through the market proxy (r.jina.ai now; macadam.eu can go
 * into our Worker later). A PDF is read here with PDF.js (nothing is sent
 * anywhere); a PDF that carries its report's link (Macadam's appraisal and
 * remarketing prints) is read again from the link — prices, photos, the
 * maker's equipment. docs/PROJECT-AUCTION-REPORTS.md.
 */
(() => {
  const REPORT = window.AUTOGOOD_AUCTION_REPORT;
  const modes = document.querySelector("[data-os-modes]");
  const dealerParts = [...document.querySelectorAll(".osLinkCard, [data-os-car], [data-os-preview], [data-os-recent]")];
  const inputCard = document.querySelector("[data-ar-input]");
  const form = document.querySelector("[data-ar-form]");
  const urlInput = document.querySelector("[data-ar-url]");
  const readButton = document.querySelector("[data-ar-read]");
  const drop = document.querySelector("[data-ar-drop]");
  const fileInput = document.querySelector("[data-ar-file]");
  const status = document.querySelector("[data-ar-status]");
  const kindBadge = document.querySelector("[data-ar-kind]");
  const supported = document.querySelector("[data-ar-supported]");
  const box = document.querySelector("[data-ar-report]");
  if (!REPORT || !modes || !inputCard) return;

  const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
  const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const LANG_KEY = "autogood.offer.lang.v1";
  const MODE_KEY = "autogood.offer.mode.v1";
  // The last report read (a convenience: it can always be read again from its link or file).
  const LAST_KEY = "autogood.offer.auctionReport.v1";
  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";

  const TEXT = {
    pl: {
      inputTitle: "Raport z aukcji", linkLabel: "Link do raportu", read: "Rozpoznaj",
      dropTitle: "Przeciągnij tu PDF raportu", dropHint: "albo kliknij i wybierz plik (PDF lub zapisana strona HTML). Plik zostaje na tym komputerze.",
      supported: "Rozpoznajemy sami: Macadam — linki reports.macadam.eu, portal.macadam.eu (remarketing), …macadam.eu/…/AppraisalWebview i ich wydruki PDF. Wkrótce: TÜV, DEKRA, raporty samych aukcji.",
      fullLink: "Wklej pełny link do raportu (https://…).",
      unknownLink: "Nie rozpoznaję raportu z tego linku. Obsługujemy teraz raporty Macadam.",
      firmLater: "To raport {firm} — tego formatu jeszcze nie czytamy. Prześlij przykład, dodamy go.",
      macadamOther: "To link Macadam, ale innego rodzaju niż znane nam trzy. Prześlij go, dodamy.",
      readingLink: "Czytam raport {firm} z linku…", readingPdf: "Czytam PDF {name}…", pdfLink: "PDF zawiera link do pełnego raportu — czytam go (ceny napraw, zdjęcia, wyposażenie)…",
      linkFailed: "Nie udało się odczytać linku ({reason}).", linkFallback: "Nie udało się odczytać linku z PDF ({reason}) — pokazuję dane z samego PDF.",
      pdfFailed: "Nie udało się odczytać pliku: {reason}.", pdfUnknown: "Nie rozpoznaję tego raportu{firm}. Obsługujemy teraz raporty Macadam.",
      remarketingPdf: "To wydruk raportu remarketingowego Macadam — czytamy go z linku w stopce, a linku nie udało się odczytać ({reason}).",
      done: "Raport odczytany {time}.", notPdf: "To nie jest PDF ani zapisana strona HTML.",
      from: { link: "z linku", pdf: "z PDF", html: "z zapisanej strony" }, open: "Otwórz raport",
      car: "Auto", inspection: "Oględziny", keysDocs: "Klucze i dokumenty", equipment: "Wyposażenie", tyres: "Opony", damages: "Uszkodzenia", missing: "Brak w raporcie", other: "Inne dane z raportu",
      plate: "Nr rejestracyjny", vin: "VIN", version: "Wersja", firstRegistration: "1. rejestracja", mileage: "Przebieg", perYear: "≈ {km} km / rok", low: "bardzo mało", high: "bardzo dużo",
      engine: "Silnik / moc", fuel: "Paliwo", gearbox: "Skrzynia", drive: "Napęd", body: "Nadwozie", doorsSeats: "Drzwi / miejsca", color: "Kolor", interior: "Wnętrze", upholstery: "Tapicerka", category: "Kategoria",
      firm: "Firma", layout: "Rodzaj raportu", forClient: "Dla", date: "Data", place: "Miejsce", engineRuns: "Silnik pracuje", driveable: "Auto jeździ", batteryOk: "Akumulator działa", fuelLevel: "Poziom paliwa / ładowania",
      checked: "Sprawdzono", checkedList: "oględziny na postoju, zdjęcia każdego uszkodzenia z miarką, głębokość bieżnika, uruchomienie silnika",
      notChecked: "Nie sprawdzono", notCheckedList: "jazda próbna, diagnostyka (OBD), grubość lakieru, podwozie na podnośniku, zawieszenie i hamulce, historia szkód i serwisu, bateria wysokiego napięcia",
      keys: "Kluczyki", remotes: "z pilotem", spare: "Wyposażenie awaryjne",
      inspector: "Według inspektora", factory: "Fabryczne wg VIN ({n})", factoryMore: "Pełna lista wg VIN ({n})", none: "brak",
      position: "Koło", depth: "Bieżnik", brand: "Marka", size: "Rozmiar", season: "Sezon", wear: "zużycie {n}%",
      element: "Element", damage: "Uszkodzenie", repair: "Naprawa wg raportu", cost: "Koszt (Macadam)", photos: "Zdjęcia",
      costTotal: "Koszt naprawy wg Macadam: {sum} netto (stawki francuskie)", costHint: "To wycena firmy oględzin we Francji — w Polsce zwykle taniej. Nasza wycena zł — w następnym kroku.",
      groups: "Podsumowanie", noDamages: "Raport nie wymienia uszkodzeń.", badRepair: "Uwaga: raport wskazuje złą wcześniejszą naprawę ({n}).", warning: "Uwaga: kontrolka błędu na desce ({text}).",
      miss: { version: "wersja i silnik", power: "moc", fuel: "rodzaj paliwa", gearbox: "skrzynia biegów", drive: "napęd", inspectionDate: "data oględzin", inspectionPlace: "miejsce oględzin", serviceBook: "książka serwisowa", registration: "dowód rejestracyjny", tyres: "opony" },
      missHint: "Sprawdź na stronie aukcji albo po VIN (program „VIN”).",
      offerTitle: "Oferta dla klienta", auctionCountry: "Kraj aukcji", auctionDate: "Data licytacji", auctionTime: "Godzina", makeOffer: "Przygotuj ofertę PDF",
      offerHint: "Kraj, data i godzina licytacji trafią do oferty obok linku do raportu.", offerFailed: "Nie udało się zapisać oferty w tej przeglądarce.",
      summaryArea: "Uszkodzenia wg strefy",
    },
    ru: {
      inputTitle: "Отчёт с аукциона", linkLabel: "Ссылка на отчёт", read: "Распознать",
      dropTitle: "Перетащите сюда PDF отчёта", dropHint: "или нажмите и выберите файл (PDF или сохранённая страница HTML). Файл остаётся на этом компьютере.",
      supported: "Определяем сами: Macadam — ссылки reports.macadam.eu, portal.macadam.eu (remarketing), …macadam.eu/…/AppraisalWebview и их PDF-распечатки. Скоро: TÜV, DEKRA, отчёты самих аукционов.",
      fullLink: "Вставьте полную ссылку на отчёт (https://…).",
      unknownLink: "Не узнаю отчёт по этой ссылке. Сейчас читаем отчёты Macadam.",
      firmLater: "Это отчёт {firm} — этот формат пока не читаем. Пришлите пример, добавим.",
      macadamOther: "Это ссылка Macadam, но не из трёх известных видов. Пришлите её, добавим.",
      readingLink: "Читаю отчёт {firm} по ссылке…", readingPdf: "Читаю PDF {name}…", pdfLink: "В PDF есть ссылка на полный отчёт — читаю её (цены ремонта, фото, оснащение)…",
      linkFailed: "Не удалось прочитать ссылку ({reason}).", linkFallback: "Не удалось прочитать ссылку из PDF ({reason}) — показываю данные самого PDF.",
      pdfFailed: "Не удалось прочитать файл: {reason}.", pdfUnknown: "Не узнаю этот отчёт{firm}. Сейчас читаем отчёты Macadam.",
      remarketingPdf: "Это распечатка remarketing-отчёта Macadam — читаем его по ссылке в подвале, а ссылку прочитать не удалось ({reason}).",
      done: "Отчёт прочитан в {time}.", notPdf: "Это не PDF и не сохранённая страница HTML.",
      from: { link: "по ссылке", pdf: "из PDF", html: "из сохранённой страницы" }, open: "Открыть отчёт",
      car: "Авто", inspection: "Осмотр", keysDocs: "Ключи и документы", equipment: "Оснащение", tyres: "Шины", damages: "Повреждения", missing: "Нет в отчёте", other: "Другие данные отчёта",
      plate: "Номер", vin: "VIN", version: "Версия", firstRegistration: "1-я регистрация", mileage: "Пробег", perYear: "≈ {km} км / год", low: "очень мало", high: "очень много",
      engine: "Двигатель / мощность", fuel: "Топливо", gearbox: "Коробка", drive: "Привод", body: "Кузов", doorsSeats: "Двери / места", color: "Цвет", interior: "Салон", upholstery: "Обивка", category: "Категория",
      firm: "Фирма", layout: "Вид отчёта", forClient: "Для", date: "Дата", place: "Место", engineRuns: "Двигатель работает", driveable: "Авто едет", batteryOk: "АКБ работает", fuelLevel: "Топливо / заряд",
      checked: "Проверено", checkedList: "осмотр на стоянке, фото каждого повреждения с линейкой, глубина протектора, запуск двигателя",
      notChecked: "Не проверено", notCheckedList: "тест-драйв, диагностика (OBD), толщина краски, низ на подъёмнике, подвеска и тормоза, история ДТП и сервиса, батарея высокого напряжения",
      keys: "Ключи", remotes: "с пультом", spare: "Аварийный комплект",
      inspector: "По словам инспектора", factory: "Заводское по VIN ({n})", factoryMore: "Полный список по VIN ({n})", none: "нет",
      position: "Колесо", depth: "Протектор", brand: "Марка", size: "Размер", season: "Сезон", wear: "износ {n}%",
      element: "Элемент", damage: "Повреждение", repair: "Ремонт по отчёту", cost: "Цена (Macadam)", photos: "Фото",
      costTotal: "Ремонт по оценке Macadam: {sum} нетто (французские расценки)", costHint: "Это оценка фирмы осмотра во Франции — в Польше обычно дешевле. Наша оценка в zł — следующим шагом.",
      groups: "Итог", noDamages: "В отчёте нет повреждений.", badRepair: "Внимание: отчёт отмечает плохой прошлый ремонт ({n}).", warning: "Внимание: горит лампа ошибки ({text}).",
      miss: { version: "версия и двигатель", power: "мощность", fuel: "топливо", gearbox: "коробка", drive: "привод", inspectionDate: "дата осмотра", inspectionPlace: "место осмотра", serviceBook: "сервисная книжка", registration: "техпаспорт", tyres: "шины" },
      missHint: "Проверьте на странице аукциона или по VIN (программа «VIN»).",
      offerTitle: "Предложение для клиента", auctionCountry: "Страна торгов", auctionDate: "Дата торгов", auctionTime: "Время", makeOffer: "Подготовить PDF-предложение",
      offerHint: "Страна, дата и время торгов попадут в предложение рядом со ссылкой на отчёт.", offerFailed: "Не удалось сохранить предложение в этом браузере.",
      summaryArea: "Повреждения по зонам",
    },
  };
  const GROUP_ORDER = ["replace_paint", "replace", "repair_paint", "paint", "pdr", "smart", "polish", "hail", "glass", "flat", "refit", "check", "clean", "none", "other"];
  const GROUP_TONE = { replace_paint: "hard", replace: "hard", repair_paint: "mid", paint: "mid", hail: "mid", pdr: "soft", smart: "soft", polish: "soft", glass: "soft", flat: "soft", refit: "soft", check: "warn", clean: "soft", none: "none", other: "soft" };

  let lang = "pl";
  const readLang = () => {
    try {
      lang = localStorage.getItem(LANG_KEY) === "ru" ? "ru" : "pl";
    } catch {
      lang = "pl";
    }
  };
  readLang();
  const t = (key, values = {}) => String(TEXT[lang][key] ?? TEXT.pl[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const numbers = new Intl.NumberFormat("pl-PL");
  const euros = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const icon = (name) => `<svg aria-hidden="true"><use href="./src/mobile-icons.svg#${name}"></use></svg>`;
  const setStatus = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle("isError", Boolean(error));
  };

  // ---- The two ways of program 06 -------------------------------------------------------
  let mode = "dealer";
  function setMode(next) {
    mode = next === "auction" ? "auction" : "dealer";
    modes.querySelectorAll("[data-os-mode]").forEach((button) => {
      const on = button.dataset.osMode === mode;
      button.classList.toggle("isActive", on);
      button.setAttribute("aria-selected", String(on));
    });
    dealerParts.forEach((node) => {
      if (mode === "auction") {
        node.dataset.arWasHidden = node.hidden ? "1" : "";
        node.hidden = true;
      } else if (node.dataset.arWasHidden !== undefined) {
        node.hidden = node.dataset.arWasHidden === "1";
        delete node.dataset.arWasHidden;
      }
    });
    inputCard.hidden = mode !== "auction";
    box.hidden = mode !== "auction" || !current;
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // This visit only.
    }
  }
  const auctionButton = modes.querySelector('[data-os-mode="auction"]');
  auctionButton.disabled = false;
  auctionButton.removeAttribute("title");
  auctionButton.querySelector("small")?.remove();
  modes.addEventListener("click", (event) => {
    const button = event.target.closest("[data-os-mode]");
    if (button && !button.disabled) setMode(button.dataset.osMode);
  });

  // ---- Texts of this way (PL / RU, the switch of the page) -------------------------------
  function applyLang() {
    readLang();
    document.querySelectorAll("[data-ar-text]").forEach((node) => {
      node.textContent = t(node.dataset.arText);
    });
    urlInput.setAttribute("aria-label", t("linkLabel"));
    supported.textContent = t("supported");
    if (current) render();
    // offer-start.js shows its recent offers again on a new language: not in this way.
    if (mode === "auction") dealerParts.forEach((node) => {
      if (!node.hidden) node.dataset.arWasHidden = "";
      node.hidden = true;
    });
  }
  // offer-start.js handles the switch first; this way follows it.
  document.querySelector("[data-os-lang-group]")?.addEventListener("click", () => window.setTimeout(applyLang, 0));

  // ---- Reading ------------------------------------------------------------------------------
  let current = null; // { report, from, source }
  let busy = false;
  function lock(on) {
    busy = on;
    readButton.disabled = on;
    drop.classList.toggle("isBusy", on);
  }
  async function fetchReport(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }
  async function readLink(raw) {
    const kind = REPORT.detectLink(raw);
    if (!kind.ok) {
      showKind(kind.firm || "");
      if (kind.reason === "url") return setStatus(t("fullLink"), true);
      if (kind.reason === "firm") return setStatus(t("firmLater", { firm: kind.firm }), true);
      if (kind.reason === "layout") return setStatus(t("macadamOther"), true);
      return setStatus(t("unknownLink"), true);
    }
    showKind(`${kind.firm} · ${REPORT.LAYOUTS[kind.layout]?.name || kind.layout}`);
    setStatus(t("readingLink", { firm: kind.firm }));
    lock(true);
    try {
      const html = await fetchReport(kind.url);
      const report = REPORT.fromHtml(html, kind.url);
      if (!report || !(report.car.vin || report.damages.length || report.car.make)) throw new Error(lang === "ru" ? "страница без данных отчёта" : "strona bez danych raportu");
      report.sourceUrl = raw.trim();
      show(report, "link");
    } catch (error) {
      setStatus(t("linkFailed", { reason: error?.message || error }), true);
    } finally {
      lock(false);
    }
  }
  let pdfjsPromise = null;
  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import(PDFJS_URL).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return lib;
      }).catch((error) => {
        pdfjsPromise = null;
        throw error;
      });
    }
    return pdfjsPromise;
  }
  // PDF.js text items with positions, as src/auction-report.js expects them.
  async function pdfPages(file) {
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const meta = await doc.getMetadata().catch(() => null);
    const pages = [];
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      pages.push({
        width: viewport.width,
        height: viewport.height,
        items: content.items.filter((item) => item.str && item.str.trim())
          .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], w: item.width, h: item.height })),
      });
    }
    return { title: meta?.info?.Title || "", pages };
  }
  async function readFile(file) {
    if (!file || busy) return;
    const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name) || !/\.(html?|txt)$/i.test(file.name);
    const isHtml = /html/i.test(file.type) || /\.html?$/i.test(file.name);
    lock(true);
    setStatus(t("readingPdf", { name: file.name }));
    try {
      if (isHtml) {
        const report = REPORT.fromHtml(await file.text(), "");
        if (!report) throw new Error(t("notPdf"));
        report.fileName = file.name;
        return show(report, "html");
      }
      if (!isPdf) throw new Error(t("notPdf"));
      const data = await pdfPages(file);
      const kind = REPORT.detectPdf(data);
      showKind(kind.firm ? `${kind.firm}${kind.layout ? ` · ${REPORT.LAYOUTS[kind.layout]?.name || kind.layout}` : ""}` : "");
      // The full report behind the PDF: prices, photos, the maker's equipment.
      if (kind.link) {
        setStatus(t("pdfLink"));
        try {
          const target = REPORT.detectLink(kind.link);
          const html = await fetchReport(target.ok ? target.url : kind.link);
          const report = REPORT.fromHtml(html, target.ok ? target.url : kind.link);
          if (report && (report.car.vin || report.damages.length)) {
            report.fileName = file.name;
            report.sourceUrl = kind.link;
            return show(report, "pdf");
          }
          throw new Error(lang === "ru" ? "страница без данных" : "strona bez danych");
        } catch (error) {
          if (kind.layout === "remarketing") throw new Error(t("remarketingPdf", { reason: error?.message || error }));
          const { report } = REPORT.fromPdf(data);
          if (!report) throw error;
          report.fileName = file.name;
          show(report, "pdf");
          setStatus(t("linkFallback", { reason: error?.message || error }), true);
          return;
        }
      }
      const { report } = REPORT.fromPdf(data);
      if (!report) throw new Error(t("pdfUnknown", { firm: kind.firm ? ` (${kind.firm})` : "" }));
      report.fileName = file.name;
      show(report, "pdf");
    } catch (error) {
      setStatus(t("pdfFailed", { reason: error?.message || error }), true);
    } finally {
      lock(false);
    }
  }
  function showKind(text) {
    kindBadge.hidden = !text;
    kindBadge.textContent = text;
  }
  function show(report, from) {
    current = { report, from };
    auctionFields = {};
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ at: new Date().toISOString(), from, report }));
    } catch {
      // Too big or private window: shown, not kept.
    }
    showKind(`${report.firm} · ${report.layoutName}`);
    render();
    box.hidden = false;
    setStatus(t("done", { time: new Date().toLocaleTimeString(lang === "ru" ? "ru-RU" : "pl-PL", { hour: "2-digit", minute: "2-digit" }) }));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) return;
    const raw = urlInput.value.trim();
    if (!/^https?:\/\//i.test(raw)) return setStatus(t("fullLink"), true);
    readLink(raw);
  });
  urlInput.addEventListener("input", () => {
    const kind = REPORT.detectLink(urlInput.value.trim());
    showKind(kind.ok ? `${kind.firm} · ${REPORT.LAYOUTS[kind.layout]?.name}` : kind.firm || "");
  });
  fileInput.addEventListener("change", () => {
    readFile(fileInput.files?.[0]);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach((name) => drop.addEventListener(name, (event) => {
    event.preventDefault();
    drop.classList.add("isOver");
  }));
  ["dragleave", "drop"].forEach((name) => drop.addEventListener(name, () => drop.classList.remove("isOver")));
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) return readFile(file);
    const text = event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain");
    if (text && /^https?:/i.test(text.trim())) {
      urlInput.value = text.trim();
      readLink(text.trim());
    }
  });
  drop.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  // ---- The report on the page ------------------------------------------------------------
  const value = (text, kind = "value") => {
    if (text === undefined || text === null || text === "") return "";
    const translated = REPORT.word(kind, text, lang);
    return translated && translated !== String(text) ? `${esc(translated)} <small class="arFr">${esc(text)}</small>` : esc(text);
  };
  // Macadam keeps a small copy of every photo: the list shows it, a click opens the full one.
  const thumb = (src) => String(src || "").replace(/\/picture\//i, "/thumbnail/").replace(/\/files\/Original\//i, "/files/Thumbnail/");
  const row = (label, html, missing = false) => `<li><span>${esc(label)}</span><b${missing ? ' class="arMiss"' : ""}>${html || `<i>${esc(TEXT[lang].missing.toLowerCase())}</i>`}</b></li>`;
  function render() {
    const { report, from } = current;
    const car = report.car;
    const per = REPORT.mileagePerYear(report);
    const name = report.title || [car.make, car.model].filter(Boolean).join(" ");
    const versionText = car.versionDetails || car.version || "";
    const engine = [car.powerKw ? `${car.powerKw} kW (${Math.round(car.powerKw * 1.35962)} KM)` : "", car.powerHpFromVersion ? `${car.powerHpFromVersion} KM` : ""].filter(Boolean).join(" · ");
    const mileage = car.mileageKm ? `${numbers.format(car.mileageKm)} km` : "";
    const perYear = per ? `<small class="arPer${per.flag ? ` is-${per.flag}` : ""}">${esc(t("perYear", { km: numbers.format(per.perYear) }))}${per.flag ? ` · ${esc(t(per.flag))}` : ""}</small>` : "";
    const source = report.sourceUrl ? `<a href="${esc(report.sourceUrl)}" target="_blank" rel="noopener">${esc(t("open"))} ↗</a>` : "";
    const photo = report.photos[0] || report.damages.find((damage) => damage.photos.length)?.photos[0] || "";

    const carList = [
      row(t("plate"), esc(car.plate || "")),
      row(t("vin"), car.vin ? `<span class="arMono">${esc(car.vin)}</span>` : ""),
      row(t("version"), esc(versionText), !versionText),
      row(t("firstRegistration"), esc(car.firstRegistration || "")),
      row(t("mileage"), mileage ? `${esc(mileage)}${perYear}` : ""),
      row(t("engine"), esc(engine), !engine),
      row(t("fuel"), value(car.fuel), !car.fuel),
      row(t("gearbox"), value(car.gearbox), !car.gearbox),
      row(t("drive"), value(car.drive), !car.drive),
      row(t("body"), value(car.body)),
      row(t("doorsSeats"), [car.doors, car.seats].filter(Boolean).join(" / ")),
      row(t("color"), [REPORT.word("value", car.color, lang), car.paint ? REPORT.word("value", car.paint, lang).toLowerCase() : ""].filter(Boolean).map(esc).join(", ")),
      row(t("interior"), [car.interior ? REPORT.word("value", car.interior, lang) : "", car.upholstery ? REPORT.word("value", car.upholstery, lang) : ""].filter(Boolean).map(esc).join(" · ")),
    ].join("");

    const insp = report.inspection;
    const state = report.state;
    const inspList = [
      row(t("firm"), esc([report.firm, report.client ? `${t("forClient")} ${report.client}` : ""].filter(Boolean).join(" · "))),
      row(t("layout"), esc(report.layoutName)),
      row(t("date"), esc(insp.dateText || ""), !insp.dateText),
      row(t("place"), esc(insp.place || ""), !insp.place),
      state.engineRuns ? row(t("engineRuns"), value(state.engineRuns)) : "",
      state.driveable ? row(t("driveable"), value(state.driveable)) : "",
      state.batteryOk ? row(t("batteryOk"), value(state.batteryOk)) : "",
      state.fuelLevel ? row(t("fuelLevel"), esc(state.fuelLevel)) : "",
    ].join("");

    const keyText = report.keys.keys !== undefined && report.keys.keys !== null ? `${report.keys.keys}${report.keys.remotes ? ` (${report.keys.remotes} ${t("remotes")})` : ""}` : "";
    const docsList = [
      row(t("keys"), esc(keyText), !keyText),
      ...report.documents.map((item) => row(item.label, value(item.value))),
      report.spare.length ? row(t("spare"), report.spare.map((item) => `${esc(item.label)}: ${value(item.value)}`).join("<br>")) : "",
    ].join("");

    const options = report.options.length ? `<ul class="osOptions">${report.options.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : `<p class="osMuted">${esc(t("none"))}</p>`;
    const factory = report.factoryEquipment.length ? `<h4>${esc(t("factory", { n: report.factoryEquipment.length }))}</h4><ul class="osOptions">${report.factoryEquipment.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "";
    const factoryMore = report.factoryDetails.length ? `<details class="arMore"><summary>${esc(t("factoryMore", { n: report.factoryDetails.length }))}</summary><ul class="osOptions">${report.factoryDetails.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></details>` : "";

    const positions = { AVG: lang === "ru" ? "ПЛ" : "LP", AVD: lang === "ru" ? "ПП" : "PP", ARG: lang === "ru" ? "ЗЛ" : "LT", ARD: lang === "ru" ? "ЗП" : "PT" };
    const tyres = report.tyres.length ? `<table class="arTable arTyres"><thead><tr><th>${esc(t("position"))}</th><th>${esc(t("depth"))}</th><th>${esc(t("brand"))}</th><th>${esc(t("size"))}</th><th>${esc(t("season"))}</th></tr></thead><tbody>${
      report.tyres.map((tyre) => `<tr><td>${esc(positions[tyre.position] || tyre.position)}</td><td class="${tyre.depth !== null && tyre.depth !== undefined && tyre.depth < 4 ? "arLow" : ""}">${tyre.depth !== null && tyre.depth !== undefined ? `${String(tyre.depth).replace(".", ",")} mm` : "—"}${tyre.wear !== undefined ? ` <small>${esc(t("wear", { n: tyre.wear }))}</small>` : ""}</td><td>${esc(tyre.brand || "—")}</td><td>${esc(tyre.size || tyre.sizeShort || "—")}</td><td>${value(tyre.season) || "—"}</td></tr>`).join("")
    }</tbody></table>` : `<p class="osMuted">${esc(TEXT[lang].miss.tyres)}</p>`;

    const counts = GROUP_ORDER.filter((group) => report.damageGroups[group]).map((group) => `<span class="arChip is-${GROUP_TONE[group]}">${esc(REPORT.repairName(group, lang) || group)} <b>${report.damageGroups[group]}</b></span>`).join("");
    const hasCost = report.damages.some((damage) => damage.cost !== null);
    const badRepairs = report.damages.filter((damage) => /mauvaise reparation/.test(REPORT.plain(damage.type))).length;
    const warning = report.damages.find((damage) => /voyant/.test(REPORT.plain(damage.element)) && !/^none$/.test(damage.group));
    const alerts = [
      warning ? `<p class="arAlert">${esc(t("warning", { text: [REPORT.word("type", warning.type, lang), REPORT.repairName(warning.group, lang)].filter(Boolean).join(", ") }))}</p>` : "",
      badRepairs ? `<p class="arAlert">${esc(t("badRepair", { n: badRepairs }))}</p>` : "",
    ].join("");
    const sorted = [...report.damages].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
    const damageRows = sorted.map((damage) => {
      const part = REPORT.partName(damage.element, lang);
      const thumbs = damage.photos.slice(0, 3).map((src) => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(thumb(src))}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`).join("");
      return `<tr class="is-${GROUP_TONE[damage.group]}">
        <td>${part ? `<b>${esc(part)}</b><small class="arFr">${esc(damage.element)}</small>` : `<b>${esc(damage.element)}</b>`}${damage.area ? `<small class="arFr">${esc(damage.area)}</small>` : ""}</td>
        <td>${value(damage.type, "type")}</td>
        <td><span class="arRepair is-${GROUP_TONE[damage.group]}">${esc(REPORT.repairName(damage.group, lang) || damage.repair)}</span><small class="arFr">${esc(damage.repair)}</small></td>
        ${hasCost ? `<td class="arNum">${damage.cost ? `${euros.format(damage.cost)} €` : "—"}</td>` : ""}
        <td class="arThumbs">${thumbs}${damage.photos.length > 3 ? `<small>+${damage.photos.length - 3}</small>` : ""}${damage.page ? `<small>${lang === "ru" ? "стр." : "str."} ${damage.page}</small>` : ""}</td>
      </tr>`;
    }).join("");
    const damages = report.damages.length ? `${alerts}<div class="arChips">${counts}</div>
      ${report.damageSummary.length ? `<p class="arArea">${esc(t("summaryArea"))}: ${report.damageSummary.map((item) => `${esc(item.area)} ${item.count}`).join(" · ")}</p>` : ""}
      <div class="arTableWrap"><table class="arTable arDamages"><thead><tr><th>${esc(t("element"))}</th><th>${esc(t("damage"))}</th><th>${esc(t("repair"))}</th>${hasCost ? `<th class="arNum">${esc(t("cost"))}</th>` : ""}<th>${esc(t("photos"))}</th></tr></thead><tbody>${damageRows}</tbody></table></div>
      ${report.costTotal ? `<p class="arCost">${esc(t("costTotal", { sum: `${euros.format(report.costTotal)} €` }))}<small>${esc(t("costHint"))}</small></p>` : ""}`
      : `<p class="osMuted">${esc(t("noDamages"))}</p>`;

    const missing = report.missing.length ? `<section class="arMissing"><h3>${esc(t("missing"))}</h3><p>${report.missing.map((key) => esc(TEXT[lang].miss[key] || key)).join(" · ")}</p><small>${esc(t("missHint"))}</small></section>` : "";
    const other = report.other.length ? `<details class="arMore"><summary>${esc(t("other"))} (${report.other.length})</summary><ul class="arPlain">${report.other.map((item) => `<li>${esc(item.label)}: <b>${esc(item.value)}</b></li>`).join("")}</ul></details>` : "";

    box.innerHTML = `
      <header class="osCarHead">
        ${photo ? `<img class="osCarPhoto" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="osCarPhoto arNoPhoto">${icon("car")}</span>`}
        <div class="osCarName">
          <h2>${esc(name)}</h2>
          <p>${esc(versionText)}${versionText ? " · " : ""}${esc(report.firm)} · ${esc(report.layoutName)} · ${esc(TEXT[lang].from[from] || from)}${report.fileName ? ` (${esc(report.fileName)})` : ""} ${source}</p>
        </div>
        <div class="osCarPrice">
          <b>${esc(mileage)}</b>
          <small>${esc(car.firstRegistration || "")}${per ? ` · ${esc(t("perYear", { km: numbers.format(per.perYear) }))}` : ""}</small>
        </div>
      </header>
      <div class="osCols arCols">
        <section><h3>${icon("car")}${esc(t("car"))}</h3><ul>${carList}</ul></section>
        <section><h3>${icon("calendar")}${esc(t("inspection"))}</h3><ul>${inspList}</ul>
          <p class="arChecked"><b>${esc(t("checked"))}:</b> ${esc(t("checkedList"))}.</p>
          <p class="arChecked is-not"><b>${esc(t("notChecked"))}:</b> ${esc(t("notCheckedList"))}.</p></section>
        <section><h3>${icon("receipt")}${esc(t("keysDocs"))}</h3><ul>${docsList}</ul></section>
        <section><h3>${icon("check")}${esc(t("equipment"))}</h3><h4>${esc(t("inspector"))}</h4>${options}${factory}${factoryMore}</section>
      </div>
      <section class="arBlock"><h3>${icon("gauge")}${esc(t("tyres"))}</h3>${tyres}</section>
      <section class="arBlock"><h3>${icon("alert")}${esc(t("damages"))} (${report.damages.length})</h3>${damages}</section>
      ${missing}
      ${other}
      <form class="arOffer" data-ar-offer>
        <h3>${icon("receipt")}${esc(t("offerTitle"))}</h3>
        <label>${esc(t("auctionCountry"))}<select name="country">${COUNTRY_CODES.map((code) => `<option value="${code}"${(auctionFields.country || report.country || "FR") === code ? " selected" : ""}>${esc(countryLabel(code))}</option>`).join("")}</select></label>
        <label>${esc(t("auctionDate"))}<input type="date" name="date" value="${esc(auctionFields.date || "")}" /></label>
        <label>${esc(t("auctionTime"))}<input type="time" name="time" value="${esc(auctionFields.time || "")}" /></label>
        <button class="osPrimary" type="submit">${esc(t("makeOffer"))}</button>
        <p class="arOfferHint">${esc(t("offerHint"))}</p>
      </form>`;
  }

  // ---- The offer: the auction's country, date and time, then oferta-aukcja.html ---------------
  const COUNTRY_CODES = ["FR", "DE", "BE", "NL", "LU", "AT", "IT", "ES", "PT", "SE", "DK", "CH", "CZ", "PL", "GB"];
  const COUNTRY_NAMES = {
    pl: { FR: "Francja", DE: "Niemcy", BE: "Belgia", NL: "Holandia", LU: "Luksemburg", AT: "Austria", IT: "Włochy", ES: "Hiszpania", PT: "Portugalia", SE: "Szwecja", DK: "Dania", CH: "Szwajcaria", CZ: "Czechy", PL: "Polska", GB: "Wielka Brytania" },
    ru: { FR: "Франция", DE: "Германия", BE: "Бельгия", NL: "Нидерланды", LU: "Люксембург", AT: "Австрия", IT: "Италия", ES: "Испания", PT: "Португалия", SE: "Швеция", DK: "Дания", CH: "Швейцария", CZ: "Чехия", PL: "Польша", GB: "Великобритания" },
  };
  const countryLabel = (code) => COUNTRY_NAMES[lang][code] || code;
  const OFFERS_KEY = "autogood.offer.auctionOffers.v1";
  // What the manager typed stays while the same report is on screen.
  let auctionFields = {};
  box.addEventListener("input", (event) => {
    const form = event.target.closest("[data-ar-offer]");
    if (form) auctionFields = Object.fromEntries(new FormData(form));
  });
  box.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-ar-offer]");
    if (!form || !current) return;
    event.preventDefault();
    const auction = Object.fromEntries(new FormData(form));
    // Every write re-reads the drafts first: nothing made in another tab is lost.
    let all;
    try {
      all = JSON.parse(localStorage.getItem(OFFERS_KEY) || "{}");
    } catch {
      all = {};
    }
    if (!all || typeof all !== "object" || !all.offers) all = { offers: {} };
    const now = new Date();
    const id = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const count = Object.keys(all.offers).length + 1;
    all.offers[id] = {
      id,
      number: `A${count}`,
      createdAt: now.toISOString(),
      lang,
      layout: "hero",
      auction,
      report: current.report,
      from: current.from,
    };
    try {
      localStorage.setItem(OFFERS_KEY, JSON.stringify(all));
    } catch {
      return setStatus(t("offerFailed"), true);
    }
    window.open(`./oferta-aukcja.html?id=${encodeURIComponent(id)}`, "_blank", "noopener");
  });

  // ---- Start: the last way and the last report of this browser ---------------------------
  applyLang();
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
    if (last?.report) current = { report: last.report, from: last.from };
  } catch {
    current = null;
  }
  const params = new URLSearchParams(window.location.search);
  let startMode = params.get("tryb") === "aukcja" ? "auction" : "";
  if (!startMode) {
    try {
      startMode = localStorage.getItem(MODE_KEY) || "dealer";
    } catch {
      startMode = "dealer";
    }
  }
  setMode(startMode);
  if (current) {
    render();
    box.hidden = mode !== "auction";
  }
  if (params.get("raport")) {
    urlInput.value = params.get("raport");
    setMode("auction");
    readLink(params.get("raport"));
  }
})();
