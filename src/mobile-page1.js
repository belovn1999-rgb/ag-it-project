// Page 1 "Wyszukiwanie" — design audit of 03.10.2026 (docs/PROJECT-MOBILE.md):
// names for the "od / do" boxes, the slim bar that replaces the pinned
// filters while scrolling, the search history's "show all", full names on
// the favourites. Runs after mobile.js and mobile-market-analysis.js and
// only reads their DOM; every action goes through their own buttons.
(() => {
  const TEXT = {
    pl: { from: "od", to: "do", showAll: "Pokaż wszystkie ({count})", showLess: "Zwiń", toFilters: "Pokaż wybrane parametry", reset: "Wyczyść", resetLabel: "Wyczyść filtry", total: "Razem", portals: "Portale", removeFilter: "Usuń filtr: {name}", chipsLabel: "Wybrane filtry", historySearch: "Szukaj: marka, model, klient…", historySearchLabel: "Szukaj w historii wyszukiwania", historyNoMatch: "Brak wyszukiwań pasujących do „{query}”." },
    ru: { from: "от", to: "до", showAll: "Показать все ({count})", showLess: "Свернуть", toFilters: "Показать выбранные параметры", reset: "Сбросить", resetLabel: "Сбросить фильтры", total: "Всего", portals: "Порталы", removeFilter: "Убрать фильтр: {name}", chipsLabel: "Выбранные фильтры", historySearch: "Поиск: марка, модель, клиент…", historySearchLabel: "Поиск по истории поиска", historyNoMatch: "Нет поисков по запросу «{query}»." },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const text = () => TEXT[lang()];
  const onLanguage = [];
  new MutationObserver(() => onLanguage.forEach((run) => run()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // ---- B68: the rows of "Kraj i pochodzenie" are named by their market ----
  // (country flags and names; a field's availability is shown by greying it,
  // src/mobile-filter-warnings.js, B70).
  const flagOf = (code) => window.AUTOGOOD_FLAG?.(code) || "";
  const countryOf = (code) => window.AUTOGOOD_COUNTRY_NAME?.(code) || code;
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
  drawPortalRows();
  onLanguage.push(drawPortalRows);

  // ---- Country totals (owner 2026-10-05): a country's switched-on portals
  // added up — in the head of its column (page 1 and 2) and in the slim bar.
  const numberOf = (text) => (/\d/.test(text || "") ? Number(String(text).replace(/\D/g, "")) : null);
  const sumCounts = (rows) => {
    const values = rows.map((row) => numberOf(row.querySelector("strong")?.textContent));
    const known = values.filter((value) => value !== null);
    if (!known.length) return values.length ? (rows[0].querySelector("strong")?.textContent.trim() || "—") : "—";
    const sum = known.reduce((total, value) => total + value, 0);
    return `${known.length < values.length ? "≥ " : ""}${new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL").format(sum)}`;
  };
  const writeTotals = () => {
    document.querySelectorAll(".agMarketColumn").forEach((column) => {
      const rows = [...column.querySelectorAll(".mobileSearchCountMarket")]
        .filter((row) => !row.hidden && !row.classList.contains("isOff"));
      const head = column.querySelector(".agMarketColumnHeadWrap");
      if (!head?.querySelector(".agMarketColumnHead")) return;
      let total = head.querySelector(".agMarketColumnTotal");
      // Every switched-on column has its total on top, large (owner
      // 2026-10-05), also with one portal: the columns read alike.
      // No count known yet (empty form): no "Razem —".
      const value = rows.length && /\d/.test(sumCounts(rows)) ? sumCounts(rows) : "";
      if (!value) {
        total?.remove();
        return;
      }
      if (!total) {
        total = document.createElement("div");
        total.className = "agMarketColumnTotal";
        total.innerHTML = "<span></span><b></b>";
        head.append(total);
      }
      const [label, number] = total.children;
      if (label.textContent !== text().total) label.textContent = text().total;
      if (number.textContent !== value) number.textContent = value;
    });
  };
  let totalsFrame = 0;
  const scheduleTotals = () => {
    if (totalsFrame) return;
    // A timer, not a frame: a background tab still gets its totals.
    totalsFrame = setTimeout(() => {
      totalsFrame = 0;
      writeTotals();
    }, 60);
  };
  new MutationObserver((records) => {
    if (records.every((record) => record.target.closest?.(".agMarketColumnTotal") || record.target.parentElement?.closest(".agMarketColumnTotal"))) return;
    scheduleTotals();
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden"] });
  scheduleTotals();

  // ---- "Język sprawdzenia" by the language switch, on page 1 only ---------
  const langLabel = document.querySelector("[data-mobile-lang-label]");
  const searchTab = document.querySelector('[data-mobile-page-tab="search"]');
  const showLangLabel = () => {
    if (langLabel) langLabel.hidden = searchTab?.getAttribute("aria-current") !== "page";
  };
  if (langLabel && searchTab) new MutationObserver(showLangLabel).observe(searchTab, { attributes: true, attributeFilter: ["aria-current"] });
  showLangLabel();

  // ---- The page holds still while the chosen filters change (owner 07.10) --
  // The offer counts, totals and the summary above the screen change height
  // after every new filter; what is on the screen stays where it was: the
  // page moves by exactly the block's change of height, and only while the
  // block's top is above the screen (at the top the layout just grows).
  // The browser's own scroll anchoring stays off on this page (mobile.css):
  // the two would move it twice.
  {
    const head = document.querySelector(".mobileManualPanel > .mobilePanelHead");
    if (head && "ResizeObserver" in window) {
      const navTop = () => Math.max(0, document.querySelector(".agGlobalNav")?.getBoundingClientRect().bottom || 0);
      let lastHeight = head.offsetHeight;
      new ResizeObserver(() => {
        const height = head.offsetHeight;
        const delta = height - lastHeight;
        lastHeight = height;
        if (!delta || head.offsetParent === null) return;
        // The block's top before the change: above the screen means the
        // person works further down — keep their place.
        if (head.getBoundingClientRect().top < navTop()) window.scrollBy(0, delta);
      }).observe(head);
    }
  }

  // ---- Mileage and price show thousands apart: "150 000" (owner 09.10) ----
  // The box shows the spaces, its value stays plain digits ("150000", or
  // "150000+") for every script that reads it — searches, counts, history.
  const valueOf = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const plain = (text) => String(text ?? "").replace(/[\s\u00a0]/g, "");
  const grouped = (text) => {
    const raw = plain(text);
    const match = raw.match(/^(\d+)(.*)$/);
    return match ? match[1].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + match[2] : raw;
  };
  document.querySelectorAll("[data-mobile-mileage-from], [data-mobile-mileage-to], [data-mobile-price-from], [data-mobile-price-to]").forEach((input) => {
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => plain(valueOf.get.call(input)),
      set: (next) => valueOf.set.call(input, grouped(next)),
    });
    valueOf.set.call(input, grouped(valueOf.get.call(input)));
    // While typing: spaces put in, the caret stays after the same digit.
    input.addEventListener("input", () => {
      const shown = valueOf.get.call(input);
      const caret = input.selectionStart ?? shown.length;
      const digitsBefore = plain(shown.slice(0, caret)).length;
      const next = grouped(shown);
      if (next === shown) return;
      valueOf.set.call(input, next);
      let place = 0;
      for (let seen = 0; place < next.length && seen < digitsBefore; place += 1) {
        if (!/\s/.test(next[place])) seen += 1;
      }
      input.setSelectionRange(place, place);
    });
  });

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
    // total of its switched-on portals (owner 2026-10-05); hovering or
    // clicking opens the portals with their own counts, each opening its
    // search like its logo.
    let marketsKey = "";
    let openWrap = null;
    const closePortals = () => {
      if (!openWrap) return;
      openWrap.classList.remove("isOpen");
      openWrap.querySelector(".mobileCompactMarket")?.setAttribute("aria-expanded", "false");
      openWrap = null;
    };
    const renderMarkets = () => {
      const columns = [...summary.querySelectorAll(".mobileSearchSummaryFoot [data-market-group]")]
        .filter((column) => !column.classList.contains("isOff"));
      const picked = columns.map((column) => ({
        column,
        rows: [...column.querySelectorAll(".mobileSearchCountMarket[data-market]")]
          .filter((market) => !market.hidden && !market.classList.contains("isOff")),
      })).filter(({ rows }) => rows.length);
      const key = picked.map(({ column, rows }) => `${column.querySelector(".agMarketColumnName")?.textContent}:${rows.map((row) => `${row.dataset.marketRow}=${row.querySelector("strong")?.textContent.trim()}`).join(",")}`).join("|") + lang();
      if (key === marketsKey) return;
      marketsKey = key;
      closePortals();
      marketsEl.replaceChildren(...picked.map(({ column, rows }) => {
        const name = column.querySelector(".agMarketColumnName")?.textContent.trim() || "";
        const total = sumCounts(rows);
        const wrap = document.createElement("div");
        wrap.className = "mobileCompactMarketWrap";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mobileCompactMarket";
        button.setAttribute("aria-expanded", "false");
        const label = `${name}: ${total}`;
        button.setAttribute("aria-label", label);
        button.title = label;
        const flags = document.createElement("span");
        flags.className = "mobileCompactMarketFlags";
        flags.innerHTML = column.querySelector(".agMarketColumnFlags")?.innerHTML || "";
        const number = document.createElement("b");
        number.textContent = total;
        button.append(flags, number);
        const list = document.createElement("div");
        list.className = "mobileCompactPortals";
        list.setAttribute("role", "menu");
        list.append(...rows.map((row) => {
          const link = row.querySelector(".agBrandLink");
          const item = document.createElement("button");
          item.type = "button";
          item.setAttribute("role", "menuitem");
          const logo = link?.querySelector("img")?.cloneNode();
          const count = document.createElement("b");
          count.textContent = row.querySelector("strong")?.textContent.trim() || "—";
          item.append(...[logo, count].filter(Boolean));
          item.title = link?.getAttribute("aria-label") || "";
          // The original link fills in its search address on click.
          item.addEventListener("click", () => {
            closePortals();
            link?.click();
          });
          return item;
        }));
        const open = () => {
          if (openWrap && openWrap !== wrap) closePortals();
          openWrap = wrap;
          wrap.classList.add("isOpen");
          button.setAttribute("aria-expanded", "true");
        };
        button.addEventListener("click", () => (wrap.classList.contains("isOpen") && wrap.dataset.pinned === "1" ? (delete wrap.dataset.pinned, closePortals()) : (wrap.dataset.pinned = "1", open())));
        wrap.addEventListener("mouseenter", open);
        wrap.addEventListener("mouseleave", () => {
          if (wrap.dataset.pinned !== "1") closePortals();
        });
        wrap.append(button, list);
        return wrap;
      }));
    };
    document.addEventListener("click", (event) => {
      if (openWrap && !openWrap.contains(event.target)) {
        delete openWrap.dataset.pinned;
        closePortals();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePortals();
    });

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

    // Owner 2026-10-05: a little earlier — once the chosen filters are out
    // of sight (only "Aktualne oferty" left), not after the whole block.
    const place = () => {
      const top = navBottom();
      const foot = summary.querySelector(".mobileSearchSummaryFoot");
      const show = !view.hidden && view.offsetParent !== null
        && (foot || summary).getBoundingClientRect().top < top
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
    // Reset left of "Analiza rynku": the form's own reset button.
    const reset = bar.querySelector("[data-compact-reset]");
    const nameReset = () => {
      if (!reset) return;
      reset.querySelector("[data-compact-reset-text]").textContent = text().reset;
      reset.setAttribute("aria-label", text().resetLabel);
      reset.title = text().resetLabel;
    };
    nameReset();
    onLanguage.push(nameReset);
    reset?.addEventListener("click", () => document.querySelector(".mobileManualPanel [data-mobile-manual-reset]")?.click());
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

  // ---- Section rail (owner 2026-10-08): on the left of page 1, a quiet
  // button per section; a click takes the page to the section's start. The
  // section in view is marked. Names and icons come from the sections' own
  // headings (PL / RU follow).
  const SECTIONS = [
    [".mobileListingLinkCard", "#mobile-listing-link-heading"],
    [".mobileManualPanel", "[data-i18n='offerCountLabel']"],
    ["#mobile-filter-group-vehicle", ""],
    ["#mobile-filter-group-engine", ""],
    ["#mobile-filter-group-gearbox", ""],
    ["#mobile-filter-group-price", ""],
    ["#mobile-filter-group-equipment", ""],
    ["#mobile-filter-group-more", ""],
    ["[data-mobile-market-history]", ".mobileMarketHistoryTitle"],
  ];
  const RAIL_NAMES = {
    pl: ["Link", "Oferty", "Pojazd", "Silnik", "Skrzynia", "Cena", "Wyposażenie", "Inne filtry", "Historia"],
    ru: ["Ссылка", "Объявления", "Авто", "Двигатель", "Коробка", "Цена", "Оснащение", "Фильтры", "История"],
  };
  const manualView = document.querySelector("[data-mobile-method-view='manual']");
  const rail = document.createElement("nav");
  rail.className = "mobileSectionRail";
  rail.hidden = true;
  const railTargets = SECTIONS.map(([target, heading], place) => {
    let section = document.querySelector(target);
    if (section?.matches("h2")) section = section.closest("section");
    const title = heading ? document.querySelector(heading) : section?.querySelector("h2");
    return section && title ? { section, title, place } : null;
  }).filter(Boolean);
  rail.innerHTML = railTargets.map((_, index) => `<button type="button" data-section-rail="${index}"><svg aria-hidden="true"><use></use></svg><span></span></button>`).join("");
  const railButtons = [...rail.querySelectorAll("button")];
  // Under the navigation and the slim bar (it shows once the chosen filters
  // are scrolled away; its last height is kept while hidden).
  let slimHeight = 92;
  const railOffset = (withSlim = true) => {
    const slim = document.querySelector(".mobileCompactBar");
    if (slim && !slim.hidden && slim.offsetHeight) slimHeight = slim.offsetHeight;
    return (document.querySelector(".agGlobalNav")?.offsetHeight || 59) + (withSlim ? slimHeight : 0) + 12;
  };
  const nameRail = () => {
    const anyIcon = railTargets.find(({ section }) => section.querySelector("h2 use"))?.section.querySelector("h2 use")?.getAttribute("href");
    rail.setAttribute("aria-label", lang() === "ru" ? "Разделы" : "Sekcje");
    railTargets.forEach(({ section, title, place }, index) => {
      // A short name in the rail, the heading's full name on hover.
      const name = (title.querySelector("span") || title).textContent.trim();
      const label = RAIL_NAMES[lang()][place] || name;
      const button = railButtons[index];
      if (button.lastChild.textContent !== label) button.lastChild.textContent = label;
      if (button.title !== name) button.title = name;
      const icon = (title.closest("h2") || section.querySelector("h2"))?.querySelector("use")?.getAttribute("href") || anyIcon;
      if (icon && button.querySelector("use").getAttribute("href") !== icon) button.querySelector("use").setAttribute("href", icon);
    });
  };
  let railPicked = null;
  const markRail = () => {
    const shown = Boolean(manualView && !manualView.hidden);
    if (rail.hidden === shown) rail.hidden = !shown;
    if (!shown) return;
    const line = railOffset() + 8;
    let current = 0;
    railTargets.forEach(({ section }, index) => {
      if (section.getBoundingClientRect().top <= line) current = index;
    });
    // At the very bottom the page cannot bring a short section up: the one
    // clicked stays marked, otherwise the last.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = railPicked ?? railTargets.length - 1;
    railButtons.forEach((button, index) => {
      const on = index === current;
      if (button.classList.contains("isCurrent") !== on) button.classList.toggle("isCurrent", on);
    });
  };
  rail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section-rail]");
    if (!button) return;
    const index = Number(button.dataset.sectionRail);
    const { section } = railTargets[index];
    railPicked = index;
    // The first section is the page's top; the filters' panel starts with
    // the chosen filters, so the slim bar does not show over it.
    const top = index === 0 ? 0 : section.getBoundingClientRect().top + window.scrollY - railOffset(index > 1);
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });
  if (railTargets.length) {
    document.body.append(rail);
    nameRail();
    onLanguage.push(nameRail);
    // A timer after scrolling, not a frame: a background tab is marked too.
    let railTimer = 0;
    const scheduleRail = () => {
      if (railTimer) return;
      railTimer = setTimeout(() => {
        railTimer = 0;
        markRail();
      }, 80);
    };
    window.addEventListener("scroll", scheduleRail, { passive: true });
    // Scrolled by hand: the position alone tells the section again.
    ["wheel", "touchmove", "keydown"].forEach((type) => window.addEventListener(type, () => {
      railPicked = null;
    }, { passive: true }));
    window.addEventListener("resize", scheduleRail);
    if (manualView) new MutationObserver(scheduleRail).observe(manualView, { attributes: true, attributeFilter: ["hidden"] });
    markRail();
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
