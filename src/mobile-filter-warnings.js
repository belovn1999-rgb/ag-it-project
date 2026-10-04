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
      title: "Nie wszystkie filtry trafią do portali",
      autoscoutKeys: { drive: "Napęd", version: "Wersja", "plugin≈hybrid": "Plug-in (≈ hybryda)" },
    },
    ru: {
      title: "Не все фильтры дойдут до порталов",
      autoscoutKeys: { drive: "Привод", version: "Версия", "plugin≈hybrid": "Plug-in (≈ гибрид)" },
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");

  const PORTALS = [
    ["otomoto", "otomoto", (filters) => (typeof otomotoSkippedFilterLabels === "function" ? otomotoSkippedFilterLabels(filters) : [])],
    ["mobile", "mobile.de", (filters) => (typeof mobileDeSkippedFilterLabels === "function" ? mobileDeSkippedFilterLabels(filters) : [])],
    ["autoscout", "AutoScout24", (filters) => (window.AUTOGOOD_AUTOSCOUT?.unsupported?.(filters) || [])
      .map((item) => TEXT[lang()].autoscoutKeys[item] || item)],
    ["blocket", "blocket.se", (filters) => (typeof blocketSkippedFilterLabels === "function" ? blocketSkippedFilterLabels(filters) : [])],
    ["avby", "av.by", (filters) => (typeof avbySkippedFilterLabels === "function" ? avbySkippedFilterLabels(filters) : [])],
  ];

  const safe = (read, filters) => {
    try {
      return (read(filters) || []).filter(Boolean);
    } catch {
      return [];
    }
  };

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
    const lines = PORTALS
      .filter(([key]) => picked.includes(key))
      .map(([, name, read]) => {
        const fromDefaults = new Set(safe(read, defaults));
        const left = [...new Set(safe(read, filters))].filter((label) => !fromDefaults.has(label));
        return left.length ? { name, left } : null;
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
    lines.forEach(({ name, left }) => {
      const item = document.createElement("li");
      const portal = document.createElement("strong");
      portal.textContent = `${name}: `;
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
