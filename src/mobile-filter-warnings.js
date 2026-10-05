/* Page 1: what a compared portal will not take from the chosen filters,
 * said at once under the chosen filters — a yellow "!" strip, one line per
 * portal ("AutoScout24: Napęd, Wersja"). Only filters the person set count:
 * what a portal leaves out of the defaults ("Dealer / komis", "Sprawny
 * technicznie", hidden damaged cars) is not repeated on every search.
 * Each portal's own list of what it leaves out is used, so the strip says
 * the same as the message when its search opens. */
(() => {
  const box = document.querySelector("[data-mobile-filter-warnings]");
  const summaryBody = document.querySelector(".mobileSearchSummary [data-mobile-selected-filters]");
  if (!box) return;

  const TEXT = {
    pl: {
      title: "Portale nie przyjmą dokładnie wszystkich filtrów",
      autoscoutKeys: { drive: "Napęd", version: "Wersja", "plugin≈hybrid": "Plug-in (≈ hybryda)" },
    },
    ru: {
      title: "Не все фильтры порталы примут точно",
      autoscoutKeys: { drive: "Привод", version: "Версия", "plugin≈hybrid": "Plug-in (≈ гибрид)" },
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");

  const PORTALS = [
    ["otomoto", "otomoto", (filters) => (typeof otomotoSkippedFilterLabels === "function" ? otomotoSkippedFilterLabels(filters) : [])],
    ["mobile", "mobile.de", (filters) => (typeof mobileDeSkippedFilterLabels === "function" ? mobileDeSkippedFilterLabels(filters) : [])],
    ["autoscout", "AutoScout24", (filters) => (window.AUTOGOOD_AUTOSCOUT?.unsupported?.(filters) || [])
      .map((item) => TEXT[lang()].autoscoutKeys[item] || item)],
    // AutoScout24 in France takes the same filters as in Germany.
    ["autoscoutfr", "AutoScout24 FR", (filters) => (window.AUTOGOOD_AUTOSCOUT?.unsupported?.(filters) || [])
      .map((item) => TEXT[lang()].autoscoutKeys[item] || item)],
    ["kleinanzeigen", "Kleinanzeigen", (filters) => (window.AUTOGOOD_KLEINANZEIGEN?.skippedFilterLabels?.(filters) || [])],
    ["paruvendu", "ParuVendu", (filters) => (window.AUTOGOOD_PARUVENDU?.skippedFilterLabels?.(filters) || [])],
    ["marktplaats", "Marktplaats", (filters) => (window.AUTOGOOD_MARKTPLAATS?.skippedFilterLabels?.(filters) || [])],
    ["dehands", "2dehands", (filters) => (window.AUTOGOOD_MARKTPLAATS?.skippedFilterLabels?.(filters) || [])],
    ["blocket", "blocket.se", (filters) => (typeof blocketSkippedFilterLabels === "function" ? blocketSkippedFilterLabels(filters) : [])],
    ["avby", "av.by", (filters) => (typeof avbySkippedFilterLabels === "function" ? avbySkippedFilterLabels(filters) : [])],
  ];

  // B70 (owner 2026-10-04): "Więcej filtrów" — a field no portal of the
  // compared countries takes is grey (still clickable), instead of country
  // flags by the field; the tooltip names the portals that take it. A portal
  // takes a field when setting it adds nothing to its own list above (or
  // only "≈"): the strip and the grey fields always agree.
  const FIELDS = [
    { input: "[data-mobile-new-used-choice]", box: ".mobileNewUsedField", base: { newUsed: "" }, tests: [{ newUsed: "used" }, { newUsed: "new" }] },
    { input: "[data-mobile-first-owner]", base: { firstOwner: false }, tests: [{ firstOwner: true }] },
    { input: "[data-mobile-service-history]", base: { serviceHistory: false }, tests: [{ serviceHistory: true }] },
    { input: "[data-mobile-non-smoking]", base: { nonSmoking: false }, tests: [{ nonSmoking: true }] },
    { input: "[data-mobile-accident-free]", base: { accidentFree: false }, tests: [{ accidentFree: true }] },
    { input: "[data-mobile-roadworthy]", base: { roadworthy: false }, tests: [{ roadworthy: true }] },
    { input: "[data-mobile-damaged-check]", base: { damagedVehicles: "hide" }, tests: [{ damagedVehicles: "show" }] },
    { input: "[data-mobile-seller]", box: ".mobileField", base: { seller: "" }, tests: [{ seller: "private" }, { seller: "dealer" }] },
    { input: "[data-mobile-vat]", box: ".mobileField", base: { vat: "" }, tests: [{ vat: "reclaimable" }] },
    { input: "[data-mobile-warranty]", base: { warranty: false }, tests: [{ warranty: true }] },
  ];
  const FIELD_TEXT = {
    pl: { works: "Działa na: {portals}", none: "Wybrane rynki nie mają tego filtra — działa na: {portals}" },
    ru: { works: "Работает на: {portals}", none: "У выбранных рынков этого фильтра нет — работает на: {portals}" },
  };

  const safe = (read, filters) => {
    try {
      return (read(filters) || []).filter(Boolean);
    } catch {
      return [];
    }
  };

  function markFields(filters, picked) {
    const t = FIELD_TEXT[lang()];
    FIELDS.forEach((field) => {
      const box = document.querySelector(field.input)?.closest(field.box || ".mobileCheckOption");
      if (!box) return;
      const base = { ...filters, ...field.base };
      const takes = PORTALS.filter(([, , read]) => {
        const before = new Set(safe(read, base));
        return field.tests.some((test) => safe(read, { ...base, ...test })
          .filter((label) => !before.has(label))
          .every((label) => /≈\s*$/.test(label)));
      });
      const on = takes.filter(([key]) => picked.includes(key));
      const names = (list) => [...new Set(list.map(([, name]) => name))].join(", ") || "—";
      box.classList.toggle("isMarketUnavailable", !on.length);
      box.title = on.length ? t.works.replace("{portals}", names(on)) : t.none.replace("{portals}", names(takes));
    });
  }

  function render() {
    if (typeof readManualFields !== "function" || typeof defaultManualFields !== "function") return;
    let filters;
    try {
      filters = readManualFields();
    } catch {
      return;
    }
    const defaults = defaultManualFields();
    const picked = typeof window.AUTOGOOD_SELECTED_MARKETS === "function" ? window.AUTOGOOD_SELECTED_MARKETS() : [];
    markFields(filters, picked);
    const lines = PORTALS
      .filter(([key]) => picked.includes(key))
      .map(([key, name, read]) => {
        const fromDefaults = new Set(safe(read, defaults));
        const left = [...new Set(safe(read, filters))].filter((label) => !fromDefaults.has(label));
        return left.length ? { name, country: window.AUTOGOOD_MARKET_COUNTRY?.[key] || "", left } : null;
      })
      .filter(Boolean);
    const key = JSON.stringify([lang(), lines]);
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.hidden = !lines.length;
    if (!lines.length) {
      box.replaceChildren();
      return;
    }
    const title = document.createElement("p");
    title.className = "mobileFilterWarningsTitle";
    const mark = document.createElement("b");
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "!";
    title.append(mark, TEXT[lang()].title);
    const list = document.createElement("ul");
    lines.forEach(({ name, country, left }) => {
      const item = document.createElement("li");
      const portal = document.createElement("strong");
      // B68: the market's country flag before the portal (several portals
      // share a country, so the portal is still named).
      portal.innerHTML = window.AUTOGOOD_FLAG?.(country) || "";
      portal.append(` ${name}: `);
      item.append(portal, left.join(", "));
      list.append(item);
    });
    box.replaceChildren(title, list);
  }

  let timer = 0;
  const schedule = () => {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      render();
    }, 60);
  };
  // The chosen filters are redrawn after every change of the form or of the
  // compared portals: that redraw is the one signal needed.
  if (summaryBody) new MutationObserver(schedule).observe(summaryBody, { subtree: true, childList: true, characterData: true });
  document.querySelector(".mobileManualForm")?.addEventListener("change", schedule);
  document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", schedule));
  schedule();
})();
