// Page 1 "Wyszukiwanie" — design audit of 03.10.2026 (docs/PROJECT-MOBILE.md):
// names for the "od / do" boxes, the slim bar that replaces the pinned
// filters while scrolling, the search history's "show all", full names on
// the favourites. Runs after mobile.js and mobile-market-analysis.js and
// only reads their DOM; every action goes through their own buttons.
(() => {
  const TEXT = {
    pl: { from: "od", to: "do", showAll: "Pokaż wszystkie ({count})", showLess: "Zwiń", toFilters: "Pokaż wybrane parametry" },
    ru: { from: "от", to: "до", showAll: "Показать все ({count})", showLess: "Свернуть", toFilters: "Показать выбранные параметры" },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const text = () => TEXT[lang()];
  const onLanguage = [];
  new MutationObserver(() => onLanguage.forEach((run) => run()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

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

    // The values set in the first three columns (car, mileage and year,
    // equipment) and the price; "dowolne" and the empty equipment are left out.
    const chosenFilters = () => {
      const any = window.AUTOGOOD_SPEC_COPY?.()?.specAny || "";
      const columns = [...summary.querySelectorAll(".agSpecColumn")].slice(0, 3);
      const values = columns.flatMap((column) => [
        ...[...column.querySelectorAll("dl > div > dd")].map((dd) => dd.textContent.trim()).filter((value) => value && value !== any),
        ...[...column.querySelectorAll(".agSpecItems > span")].map((item) => item.textContent.trim()),
      ]);
      const price = summary.querySelector(".agSpecPrice b")?.textContent.trim();
      return [...values, price].filter(Boolean);
    };

    let marketsKey = "";
    const renderMarkets = () => {
      const markets = [...summary.querySelectorAll(".mobileSearchSummaryFoot .mobileSearchCountMarket")]
        .filter((market) => !market.hidden && !market.classList.contains("isOff"));
      const key = markets.map((market) => `${market.dataset.market}:${market.querySelector("strong")?.textContent.trim()}`).join("|");
      if (key === marketsKey) return;
      marketsKey = key;
      marketsEl.replaceChildren(...markets.map((market) => {
        const link = market.querySelector(".agBrandLink");
        const count = market.querySelector("strong")?.textContent.trim() || "—";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mobileCompactMarket";
        const label = `${link?.getAttribute("aria-label") || market.dataset.market}: ${count}`;
        button.setAttribute("aria-label", label);
        button.title = label;
        const logo = link?.querySelector("img")?.cloneNode();
        const number = document.createElement("b");
        number.textContent = count;
        button.append(...[logo, number].filter(Boolean));
        // The original link fills in its search address on click.
        button.addEventListener("click", () => link?.click());
        return button;
      }));
    };

    const sync = () => {
      nameEl.textContent = summary.querySelector(".agSpecTitle strong")?.textContent.trim() || "";
      filtersEl.textContent = chosenFilters().join(" · ");
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
  const list = document.querySelector("[data-mobile-market-history-list]");
  const more = document.querySelector("[data-mobile-history-more]");
  const VISIBLE_ROWS = 8;
  let expanded = false;
  const updateMore = () => {
    if (!list || !more) return;
    const count = list.querySelectorAll(":scope > .mobileMarketHistoryItem").length;
    list.classList.toggle("isExpanded", expanded);
    more.hidden = count <= VISIBLE_ROWS;
    more.setAttribute("aria-expanded", String(expanded));
    more.textContent = expanded ? text().showLess : text().showAll.replace("{count}", String(count));
  };
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
