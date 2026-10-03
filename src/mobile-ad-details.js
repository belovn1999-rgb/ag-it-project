// Details of single mobile.de ads that search results do not carry: engine
// size, the net price and the month of first registration. Needed for the
// turnkey price in Belarus (customs duty per cm³ and by age). Read one ad at a
// time through the local importer (~1 s each, the user's own Chrome) and kept
// in this browser, so a car is read once.
//
// Stored in `autogood.mobile.adDetails.v1` ({ id: { ccm, net, reg, at } }).
// The rules of docs/PROJECT-MOBILE.md 4.6.1 apply: every write re-reads storage
// first; the key is never cleared; only the oldest entries go when it is full.
(() => {
  const STORAGE_KEY = "autogood.mobile.adDetails.v1";
  const KEEP = 4000;
  let running = null;

  function readAll() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function save(id, details) {
    try {
      const all = readAll();
      all[id] = { ...details, at: new Date().toISOString() };
      const ids = Object.keys(all);
      if (ids.length > KEEP) {
        ids.sort((left, right) => String(all[left].at).localeCompare(String(all[right].at)))
          .slice(0, ids.length - KEEP)
          .forEach((old) => delete all[old]);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Full or blocked storage: the details still serve this page.
    }
  }

  const memory = new Map();

  function get(id) {
    const key = String(id || "");
    if (!key) return null;
    if (memory.has(key)) return memory.get(key);
    const stored = readAll()[key] || null;
    if (stored) memory.set(key, stored);
    return stored;
  }

  async function readOne(id) {
    const base = typeof mobileDeApiBase === "function" ? mobileDeApiBase() : "";
    if (!base) throw new Error("offline");
    const adUrl = `https://suchen.mobile.de/fahrzeuge/details.html?id=${encodeURIComponent(id)}`;
    const response = await fetch(`${base}/mobilede/import?url=${encodeURIComponent(adUrl)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.detail || data.error || String(response.status));
    const details = {
      ccm: Number(data.displacementCcm) || null,
      net: Number(data.carNettoEur) || null,
      reg: String(data.firstRegistration || ""),
      fuel: String(data.fuel || "").slice(0, 40),
    };
    memory.set(String(id), details);
    save(String(id), details);
    return details;
  }

  // Reads the ads still unknown, one after another. onProgress(done, total)
  // after each; stops when keepGoing() turns false or the importer fails twice.
  function enrich(ids, { onProgress, keepGoing = () => true } = {}) {
    if (running) return running;
    const missing = [...new Set(ids.map(String))].filter((id) => id && !get(id));
    if (!missing.length) return Promise.resolve({ done: 0, total: 0 });
    running = (async () => {
      let done = 0;
      let failures = 0;
      for (const id of missing) {
        if (!keepGoing()) break;
        try {
          await readOne(id);
          failures = 0;
        } catch {
          failures += 1;
          if (failures >= 2) break;
        }
        done += 1;
        onProgress?.(done, missing.length);
      }
      return { done, total: missing.length };
    })().finally(() => {
      running = null;
    });
    return running;
  }

  window.AUTOGOOD_AD_DETAILS = { get, enrich, isRunning: () => Boolean(running) };
})();
