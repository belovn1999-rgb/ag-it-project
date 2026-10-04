// Page 1 "Wyszukiwanie" — design audit of 03.10.2026 (docs/PROJECT-MOBILE.md):
// names for the "od / do" boxes, the slim bar that replaces the pinned
// filters while scrolling, the search history's "show all", full names on
// the favourites. Runs after mobile.js and mobile-market-analysis.js and
// only reads their DOM; every action goes through their own buttons.
(() => {
  const TEXT = {
    pl: { from: "od", to: "do", showAll: "Pokaż wszystkie ({count})", showLess: "Zwiń", toFilters: "Pokaż wybrane parametry", removeFilter: "Usuń filtr: {name}", chipsLabel: "Wybrane filtry", historySearch: "Szukaj: marka, model, klient…", historySearchLabel: "Szukaj w historii wyszukiwania", historyNoMatch: "Brak wyszukiwań pasujących do „{query}”." },
    ru: { from: "от", to: "до", showAll: "Показать все ({count})", showLess: "Свернуть", toFilters: "Показать выбранные параметры", removeFilter: "Убрать фильтр: {name}", chipsLabel: "Выбранные фильтры", historySearch: "Поиск: марка, модель, клиент…", historySearchLabel: "Поиск по истории поиска", historyNoMatch: "Нет поисков по запросу «{query}»." },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const text = () => TEXT[lang()];
  const onLanguage = [];
  new MutationObserver(() => onLanguage.forEach((run) => run()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // ---- B68: countries with flags instead of portal names in the filters ----
  // A market is a country (owner 2026-10-04): a field's marks show the flags
  // of the countries whose portals take it (≈ when they take it only
  // roughly), the portals in the tooltip; the rows of "Kraj i pochodzenie"
  // are named by their market. SVG flags add no text to the labels.
  const PORTAL_COUNTRY = { "mobile.de": "DE", AutoScout24: "DE", otomoto: "PL", blocket: "SE", "av.by": "BY", Marktplaats: "NL", "2dehands": "BE" };
  const flagOf = (code) => window.AUTOGOOD_FLAG?.(code) || "";
  const countryOf = (code) => window.AUTOGOOD_COUNTRY_NAME?.(code) || code;
  const drawPortalMarks = () => {
    document.querySelectorAll(".agPortalMarks[data-marks]").forEach((mark) => {
      const countries = new Map();
      mark.dataset.marks.split("·").map((part) => part.trim()).filter(Boolean).forEach((part) => {
        const approx = part.endsWith("≈");
        const portal = part.replace("≈", "").trim();
        const code = PORTAL_COUNTRY[portal];
        if (!code) return;
        countries.set(code, [...(countries.get(code) || []), { portal, approx }]);
      });
      if (!countries.size) return;
      mark.classList.add("hasFlags");
      mark.innerHTML = [...countries].map(([code, list]) => `<span class="agPortalMarkCountry${list.every((item) => item.approx) ? " isApprox" : ""}">${flagOf(code)}</span>`).join("");
      mark.title = [...countries].map(([code, list]) => `${countryOf(code)}: ${list.map((item) => `${item.portal}${item.approx ? " ≈" : ""}`).join(", ")}`).join("; ");
    });
  };
  const PORTAL_ROWS = {
    "mobile autoscout": { countries: ["DE", "NL", "BE"], portals: "mobile.de, AutoScout24" },
    otomoto: { countries: ["PL"], portals: "otomoto" },
  };
  const drawPortalRows = () => {
    document.querySelectorAll("[data-mobile-portal-row]").forEach((row) => {
      const spec = PORTAL_ROWS[row.dataset.mobilePortalRow];
      const box = row.querySelector(".mobilePortalFilterLogos");
      if (!spec || !box) return;
      box.classList.add("hasFlags");
      box.innerHTML = `<span class="mobilePortalFilterFlags">${spec.countries.map(flagOf).join("")}</span><b>${spec.countries.map(countryOf).join(" · ")}</b><small>${spec.portals}</small>`;
    });
  };
  drawPortalMarks();
  drawPortalRows();
  onLanguage.push(drawPortalMarks, drawPortalRows);

  // ---- 1. Every "od / do" box is named after its field ----------------------
  // The field's name sits above two bare boxes; screen readers, voice input
  // and autofill only saw "od" and "do".
  const form = document.querySelector(".mobileManualForm");
  const nameRangeFields = () => {
    form?.querySelectorAll(".mobileRangeField").forEach((field) => {
      const label = field.querySelector(".mobileFieldLabel > span[data-i18n]")?.textContent.trim();
      const inputs = field.querySelectorAll(".mobileRangePair input");
      if (!label || inputs.length !== 2) return;
      inputs[0].setAttribute("aria-label", `${label} ${text().from}`);
      inputs[1].setAttribute("aria-label", `${label} ${text().to}`);
    });
  };
  nameRangeFields();
  onLanguage.push(nameRangeFields);
  // Clicking the name puts the cursor in the "od" box, as a <label> would.
  form?.addEventListener("click", (event) => {
    const label = event.target.closest(".mobileRangeField > .mobileFieldLabel");
    if (!label || event.target.closest("button")) return;
    label.parentElement.querySelector(".mobileRangePair input")?.focus();
  });

  // ---- B18. The values set, as chips with × ----------------------------------
  // Read from the chosen-filters block (its first three columns and the price):
  // each chip clears its field on the form, the form then redraws everything.
  const summaryBlock = document.querySelector(".mobileSearchSummary");
  const chipItems = () => {
    if (!summaryBlock) return [];
    const any = window.AUTOGOOD_SPEC_COPY?.()?.specAny || "";
    const items = [];
    [...summaryBlock.querySelectorAll(".agSpecColumn")].slice(0, 3).forEach((column) => {
      column.querySelectorAll("dl > div[data-mobile-summary-target]").forEach((row) => {
        const value = row.querySelector("dd")?.textContent.trim();
        if (!value || value === any) return;
        const label = row.querySelector("dt")?.textContent.trim() || "";
        // A bare number ("5", "2020") says little: the field's name goes first.
        const text = /\p{L}/u.test(value) ? value : `${label}: ${value}`;
        items.push({ text, title: `${label}: ${value}`, target: row.dataset.mobileSummaryTarget, whole: true });
      });
      column.querySelectorAll(".agSpecItems > span[data-mobile-summary-target]").forEach((item) => {
        const value = item.textContent.trim();
        if (value) items.push({ text: value, title: value, target: item.dataset.mobileSummaryTarget, whole: false });
      });
    });
    const price = summaryBlock.querySelector(".agSpecPrice[data-mobile-summary-target]");
    const priceText = price?.querySelector("b")?.textContent.trim();
    if (price && priceText) items.push({ text: priceText, title: priceText, target: price.dataset.mobileSummaryTarget, whole: true });
    return items;
  };

  // Clears one field: the whole field ("od / do", a group of options) or just
  // the one option of an equipment chip. Every changed box fires input and
  // change, as typing would.
  const clearFilter = (selector, whole) => {
    let target = null;
    try {
      target = document.querySelector(selector);
    } catch {
      target = null;
    }
    if (!target) return;
    const scope = whole
      ? target.closest(".mobileRangeField, fieldset, .mobileField, .mobileCheckOption") || target
      : target;
    const inputs = scope.matches("input") ? [scope] : [...scope.querySelectorAll("input")];
    const changed = [];
    const set = (input, checked) => {
      if (input.checked !== checked) { input.checked = checked; changed.push(input); }
    };
    // Radio groups go back to their "any" choice (or to none when they have none).
    const groups = new Set(inputs.filter((input) => input.type === "radio").map((input) => input.name));
    groups.forEach((name) => {
      if (!name) return;
      const radios = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)];
      const blank = radios.find((radio) => radio.value === "any" || radio.value === "");
      radios.forEach((radio) => set(radio, radio === blank));
    });
    inputs.forEach((input) => {
      if (input.type === "checkbox") set(input, false);
      else if (input.type !== "radio" && input.value) {
        input.value = "";
        changed.push(input);
      }
    });
    [...new Set(changed)].forEach((input) => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  const chipsKeys = new WeakMap();
  function renderChips(container) {
    if (!container) return;
    const items = chipItems();
    const key = `${lang()}|${items.map((item) => `${item.target}=${item.text}`).join("|")}`;
    if (chipsKeys.get(container) === key) return;
    chipsKeys.set(container, key);
    container.setAttribute("role", "list");
    container.setAttribute("aria-label", text().chipsLabel);
    container.replaceChildren(...items.map((item) => {
      const chip = document.createElement("span");
      chip.className = "mobileFilterChip";
      chip.setAttribute("role", "listitem");
      chip.title = item.title;
      const label = document.createElement("span");
      label.textContent = item.text;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", text().removeFilter.replace("{name}", item.title));
      remove.addEventListener("click", () => clearFilter(item.target, item.whole));
      chip.append(label, remove);
      return chip;
    }));
    if (container.matches("[data-mobile-filter-chips]")) container.hidden = !items.length;
  }

  const summaryChips = document.querySelector("[data-mobile-filter-chips]");
  if (summaryBlock && summaryChips) {
    let chipsTimer = 0;
    const scheduleChips = () => {
      if (chipsTimer) return;
      chipsTimer = window.setTimeout(() => {
        chipsTimer = 0;
        renderChips(summaryChips);
      }, 30);
    };
    // Only the chosen-filters body is watched: the chips' own redraw must not
    // trigger another one.
    const body = summaryBlock.querySelector("[data-mobile-selected-filters]");
    if (body) new MutationObserver(scheduleChips).observe(body, { subtree: true, childList: true, characterData: true });
    onLanguage.push(scheduleChips);
    scheduleChips();
  }

  // ---- 9. "od" above "do" is said at once ------------------------------------
  // The portals' links refused such a range without a word on the form; the
  // field is now marked and told.
  const checkRanges = () => {
    form?.querySelectorAll(".mobileRangeField").forEach((field) => {
      const inputs = field.querySelectorAll(".mobileRangePair input");
      if (inputs.length !== 2) return;
      const number = (input) => {
        const raw = String(input.value || "").trim();
        if (!raw || /[<>+]/.test(raw)) return null;
        const value = Number(raw.replace(/[\s.]/g, "").replace(",", "."));
        return Number.isFinite(value) ? value : null;
      };
      const from = number(inputs[0]);
      const to = number(inputs[1]);
      const wrong = from !== null && to !== null && from > to;
      field.classList.toggle("isRangeInvalid", wrong);
      inputs.forEach((input) => input.setAttribute("aria-invalid", wrong ? "true" : "false"));
      let note = field.querySelector(".mobileRangeError");
      if (wrong && !note) {
        note = document.createElement("small");
        note.className = "mobileRangeError";
        note.setAttribute("role", "alert");
        field.append(note);
      }
      if (note) {
        note.hidden = !wrong;
        note.textContent = wrong ? (copy?.[state.lang]?.marketSearchInvalidRange || "") : "";
      }
    });
  };
  form?.addEventListener("input", checkRanges);
  form?.addEventListener("change", checkRanges);
  onLanguage.push(checkRanges);
  checkRanges();

  // ---- B18. "Więcej filtrów": its counter tells only what differs from the
  // defaults ("Sprawny technicznie", "Dealer / komis" are not a
  // choice the user made); the generic counter counted them and the hidden
  // halves of the selects twice.
  const moreCard = document.querySelector(".mobileMoreFiltersCard");
  const MORE_KEYS = ["newUsed", "nonSmoking", "roadworthy", "warranty", "serviceHistory", "accidentFree", "firstOwner", "damagedVehicles", "vat", "seller", "countries", "otomotoRegistered", "otomotoOrigins"];
  const moreCount = () => {
    if (typeof readManualFields !== "function" || typeof defaultManualFields !== "function") return null;
    let current;
    try {
      current = readManualFields();
    } catch {
      return null;
    }
    const defaults = defaultManualFields();
    const norm = (value) => JSON.stringify(Array.isArray(value) ? [...value].sort() : value ?? "");
    return MORE_KEYS.filter((key) => norm(current[key]) !== norm(defaults[key])).length;
  };
  const fixMoreCounter = () => {
    const counter = moreCard?.querySelector("[data-mobile-collapse-count]");
    const count = moreCount();
    if (!counter || count === null) return;
    const textValue = count ? String(count) : "";
    if (counter.textContent !== textValue) counter.textContent = textValue;
    if (counter.hidden !== !count) counter.hidden = !count;
  };
  if (moreCard) {
    const counter = moreCard.querySelector("[data-mobile-collapse-count]");
    if (counter) new MutationObserver(fixMoreCounter).observe(counter, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    form?.addEventListener("change", () => window.setTimeout(fixMoreCounter));
    fixMoreCounter();
  }

  // ---- 3. The slim bar ------------------------------------------------------
  // The full block of chosen filters scrolls away with the page; once it is
  // out of view, a fixed one-line bar shows the car, the set filters, the
  // offer counts and "Analiza rynku". It is outside the page flow, so it
  // never pushes the form around.
  const bar = document.querySelector("[data-mobile-compact-bar]");
  const view = document.querySelector('[data-mobile-method-view="manual"]');
  const panel = document.querySelector(".mobileManualPanel");
  const summary = document.querySelector(".mobileSearchSummary");
  if (bar && view && panel && summary) {
    const nameEl = bar.querySelector("[data-compact-name]");
    const filtersEl = bar.querySelector("[data-compact-filters]");
    const marketsEl = bar.querySelector("[data-compact-markets]");
    const summaryButton = bar.querySelector("[data-compact-summary]");
    const star = bar.querySelector("[data-compact-star]");
    const done = bar.querySelector("[data-compact-done]");
    const analysis = bar.querySelector("[data-compact-analysis]");
    const original = {
      star: () => summary.querySelector("[data-mobile-market-history-save]"),
      done: () => summary.querySelector("[data-mobile-history-done]"),
      analysis: () => summary.querySelector("[data-mobile-market-analysis-open]"),
    };
    const navBottom = () => Math.max(0, document.querySelector(".agGlobalNav")?.getBoundingClientRect().bottom || 0);


    // B68: one button per switched-on country column — its flags and the
    // count of its first switched-on portal (the main one); a click opens
    // that portal's search like its logo.
    let marketsKey = "";
    const renderMarkets = () => {
      const columns = [...summary.querySelectorAll(".mobileSearchSummaryFoot [data-market-group]")]
        .filter((column) => !column.classList.contains("isOff"));
      const picked = columns.map((column) => ({
        column,
        market: [...column.querySelectorAll(".mobileSearchCountMarket[data-market]")]
          .find((market) => !market.hidden && !market.classList.contains("isOff")),
      })).filter(({ market }) => market);
      const key = picked.map(({ column, market }) => `${column.querySelector(".agMarketColumnName")?.textContent}:${market.dataset.market}:${market.querySelector("strong")?.textContent.trim()}`).join("|");
      if (key === marketsKey) return;
      marketsKey = key;
      marketsEl.replaceChildren(...picked.map(({ column, market }) => {
        const link = market.querySelector(".agBrandLink");
        const count = market.querySelector("strong")?.textContent.trim() || "—";
        const name = column.querySelector(".agMarketColumnName")?.textContent.trim() || market.dataset.market;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mobileCompactMarket";
        const label = `${name} (${link?.getAttribute("aria-label") || market.dataset.market}): ${count}`;
        button.setAttribute("aria-label", label);
        button.title = label;
        const flags = document.createElement("span");
        flags.className = "mobileCompactMarketFlags";
        flags.innerHTML = column.querySelector(".agMarketColumnFlags")?.innerHTML || "";
        const number = document.createElement("b");
        number.textContent = count;
        button.append(flags, number);
        // The original link fills in its search address on click.
        button.addEventListener("click", () => link?.click());
        return button;
      }));
    };

    const sync = () => {
      nameEl.textContent = summary.querySelector(".agSpecTitle strong")?.textContent.trim() || "";
      renderChips(filtersEl);
      summaryButton.setAttribute("aria-label", `${nameEl.textContent} — ${text().toFilters}`);
      summaryButton.title = text().toFilters;
      const starButton = original.star();
      star.hidden = !starButton;
      if (starButton) {
        star.setAttribute("aria-pressed", starButton.getAttribute("aria-pressed") === "true" || starButton.classList.contains("isPinned") ? "true" : "false");
        star.setAttribute("aria-label", starButton.getAttribute("aria-label") || "");
        star.title = starButton.title || "";
      }
      const doneButton = original.done();
      done.hidden = !doneButton || doneButton.hidden;
      if (doneButton) done.textContent = doneButton.textContent.trim();
      const analysisButton = original.analysis();
      analysis.hidden = !analysisButton;
      if (analysisButton) analysis.textContent = analysisButton.textContent.replace(/\s+/g, " ").trim();
      renderMarkets();
    };

    const place = () => {
      const top = navBottom();
      const show = !view.hidden && view.offsetParent !== null
        && summary.getBoundingClientRect().bottom < top
        && panel.getBoundingClientRect().bottom > top + 140;
      bar.style.top = `${top}px`;
      if (show) sync();
      if (bar.hidden === show) bar.hidden = !show;
    };

    let syncFrame = 0;
    const scheduleSync = () => {
      if (bar.hidden || syncFrame) return;
      syncFrame = requestAnimationFrame(() => {
        syncFrame = 0;
        sync();
      });
    };
    new MutationObserver(scheduleSync).observe(summary, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ["hidden", "class", "aria-pressed"],
    });
    new MutationObserver(place).observe(view, { attributes: true, attributeFilter: ["hidden"] });
    let placeFrame = 0;
    const schedulePlace = () => {
      if (placeFrame) return;
      placeFrame = requestAnimationFrame(() => {
        placeFrame = 0;
        place();
      });
    };
    window.addEventListener("scroll", schedulePlace, { passive: true });
    window.addEventListener("resize", schedulePlace);
    onLanguage.push(() => requestAnimationFrame(() => {
      marketsKey = "";
      if (!bar.hidden) sync();
    }));

    star.addEventListener("click", () => original.star()?.click());
    done.addEventListener("click", () => original.done()?.click());
    analysis.addEventListener("click", () => original.analysis()?.click());
    // The car's name brings the full block of chosen filters back.
    summaryButton.addEventListener("click", () => {
      const top = panel.getBoundingClientRect().top + window.scrollY - navBottom() - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    place();
  }

  // ---- 12. Search history: 8 rows, then "show all" --------------------------
  // B19: from 6 searches a search box (car, filters, client's note); while
  // it holds text every matching row shows.
  const list = document.querySelector("[data-mobile-market-history-list]");
  const more = document.querySelector("[data-mobile-history-more]");
  const search = document.querySelector("[data-mobile-history-search]");
  const noMatch = document.querySelector("[data-mobile-history-nomatch]");
  const VISIBLE_ROWS = 8;
  const SEARCH_FROM = 6;
  let expanded = false;
  const fold = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
  const filterRows = (rows) => {
    if (!search || !list) return 0;
    if (rows.length < SEARCH_FROM && !search.value) search.hidden = true;
    else search.hidden = false;
    search.placeholder = text().historySearch;
    search.setAttribute("aria-label", text().historySearchLabel);
    const words = fold(search.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    rows.forEach((row) => {
      const haystack = fold([
        row.querySelector(".mobileMarketHistoryTitleRow strong")?.textContent,
        row.querySelector(".mobileMarketHistoryMeta")?.textContent,
        row.dataset.note || row.querySelector(".mobileMarketHistoryNote")?.value,
      ].join(" "));
      const match = words.every((word) => haystack.includes(word));
      row.classList.toggle("isFilteredOut", !match);
      if (match) shown += 1;
    });
    list.classList.toggle("isFiltering", words.length > 0);
    if (noMatch) {
      noMatch.hidden = !words.length || shown > 0;
      noMatch.textContent = noMatch.hidden ? "" : text().historyNoMatch.replace("{query}", search.value.trim());
    }
    return words.length;
  };
  const updateMore = () => {
    if (!list || !more) return;
    const rows = [...list.querySelectorAll(":scope > .mobileMarketHistoryItem")];
    const count = rows.length;
    const filtering = filterRows(rows) > 0;
    list.classList.toggle("isExpanded", expanded);
    more.hidden = filtering || count <= VISIBLE_ROWS;
    more.setAttribute("aria-expanded", String(expanded));
    more.textContent = expanded ? text().showLess : text().showAll.replace("{count}", String(count));
  };
  search?.addEventListener("input", updateMore);
  search?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && search.value) {
      event.preventDefault();
      search.value = "";
      updateMore();
    }
  });
  if (list && more) {
    more.addEventListener("click", () => {
      expanded = !expanded;
      updateMore();
      if (!expanded) list.closest("section")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    new MutationObserver(updateMore).observe(list, { childList: true });
    onLanguage.push(updateMore);
    updateMore();
  }

  // ---- 12. Favourites: the full name on hover when a card cuts it ----------
  const favoritesBar = document.querySelector("[data-mobile-favorites-bar]");
  const titleFavorites = () => {
    favoritesBar?.querySelectorAll(".mobileMarketFavorite").forEach((card) => {
      const full = [...card.querySelectorAll("b, small")].map((line) => line.textContent.trim()).filter(Boolean).join(" — ");
      if (card.title !== full) card.title = full;
    });
  };
  if (favoritesBar) {
    new MutationObserver(titleFavorites).observe(favoritesBar, { childList: true, subtree: true });
    titleFavorites();
  }
})();
