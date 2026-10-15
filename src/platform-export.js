// Moving the history and favourites to the Mantexlab Tools platform (owner
// 2026-10-15, docs/PLATFORM-SEARCH.md): "Skopiuj dla platformy" copies them as
// text; the manager pastes it on the platform ("Перенос из старой программы").
// Read-only — nothing in this browser's storage is written or removed (4.6.1).
(() => {
  const button = document.querySelector("[data-mobile-history-export]");
  const status = document.querySelector("[data-mobile-history-export-status]");
  if (!button || !status) return;
  const KEYS = { history: "autogood.mobile.marketHistory.v2", legacy: "autogood.mobile.marketHistory.v1", favorites: "autogood.mobile.marketFavorites.v1" };
  const TEXT = {
    pl: { done: "Skopiowano wyszukiwań: {n} (★ {f}). Wklej na platformie: Поиск дилеры → «Перенести из старой программы».", empty: "Historia jest pusta — nie ma czego przenosić.", manual: "Wyszukiwań do przeniesienia: {n} (★ {f}). Przeglądarka nie pozwoliła skopiować — zaznacz tekst poniżej, skopiuj (Ctrl/Cmd + C) i wklej na platformie: Поиск дилеры → «Перенести из старой программы»." },
    ru: { done: "Скопировано поисков: {n} (★ {f}). Вставьте на платформе: Поиск дилеры → «Перенести из старой программы».", empty: "История пуста — переносить нечего.", manual: "Поисков для переноса: {n} (★ {f}). Браузер не дал скопировать — выделите текст ниже, скопируйте (Ctrl/Cmd + C) и вставьте на платформе: Поиск дилеры → «Перенести из старой программы»." },
  };
  const t = () => TEXT[document.documentElement.lang === "ru" ? "ru" : "pl"];

  const read = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed.filter((entry) => entry?.filters?.brand && entry?.filters?.model) : [];
    } catch {
      return [];
    }
  };

  // The same entries the history shows: the current list (or the legacy one)
  // plus every favourite kept only in the backup key.
  function entries() {
    let list = read(KEYS.history);
    if (!list.length) list = read(KEYS.legacy);
    const known = new Set(list.map((entry) => String(entry.id || "")));
    const restored = read(KEYS.favorites).filter((entry) => !known.has(String(entry.id || ""))).map((entry) => ({ ...entry, pinned: true }));
    return [...list, ...restored].map((entry) => ({
      filters: entry.filters,
      pinned: Boolean(entry.pinned),
      note: String(entry.note || "").slice(0, 200),
      car: entry.car?.sourceUrl ? { sourceUrl: String(entry.car.sourceUrl).slice(0, 400), title: String(entry.car.title || "").slice(0, 160) } : null,
      lang: entry.lang === "ru" ? "ru" : "pl",
      createdAt: String(entry.createdAt || entry.updatedAt || ""),
      updatedAt: String(entry.updatedAt || entry.createdAt || ""),
    }));
  }

  function show(message, text = "") {
    status.hidden = false;
    status.textContent = message;
    if (text) {
      const area = document.createElement("textarea");
      area.className = "mobileHistoryExportText";
      area.readOnly = true;
      area.rows = 4;
      area.value = text;
      status.appendChild(area);
      area.select();
    }
  }

  button.addEventListener("click", async () => {
    const list = entries();
    if (!list.length) return show(t().empty);
    const text = JSON.stringify({ format: "search-history", version: 1, exportedAt: new Date().toISOString(), entries: list });
    const fill = (message) => message.replace("{n}", String(list.length)).replace("{f}", String(list.filter((entry) => entry.pinned).length));
    try {
      await navigator.clipboard.writeText(text);
      show(fill(t().done));
    } catch {
      show(fill(t().manual), text);
    }
  });
})();
