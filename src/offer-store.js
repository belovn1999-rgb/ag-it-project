/* AUTOGOOD "Oferta dla klienta" (B71): where offers are kept in this browser.
 *
 * IndexedDB "autogood-offers", store "offers" (key "id"), indexes "adKey" and
 * "favoriteId". The rules of docs/PROJECT-MOBILE.md §4.6.1 hold here too: an
 * offer is never deleted by the program (a manager can only archive it), every
 * change is a read-merge-write inside one transaction, so two open tabs do not
 * overwrite each other's work with an old copy.
 *
 * The manager's own contact and the firm's details live in localStorage
 * ("autogood.offer.manager.v1", "autogood.offer.company.v1"): read before
 * every write, never removed; an unreadable value is kept aside.
 *
 * window.AUTOGOOD_OFFER_STORE: get(id), put(offer), update(id, change),
 * byAdKey(key), recent(limit), manager(), setManager(change), company(),
 * setCompany(change), newId(), channel (BroadcastChannel "autogood-offers").
 */
(() => {
  if (window.AUTOGOOD_OFFER_STORE) return;
  const DB_NAME = "autogood-offers";
  const STORE = "offers";
  const MANAGER_KEY = "autogood.offer.manager.v1";
  const COMPANY_KEY = "autogood.offer.company.v1";
  // The firm's details as the offer text of the site brain gives them
  // (autogood-site brain/10, Q-08); the phone is the owner's to confirm.
  const COMPANY_DEFAULTS = {
    name: "AUTOGOOD",
    address: "ul. Kolejowa 102, 05-092 Łomianki",
    hours: "pon.-pt. 9:00-17:00, sob. po umówieniu",
    phone: "",
    email: "info@autogood.pl",
    web: "autogood.pl",
  };
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error("IndexedDB unavailable"));
          return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("adKey", "adKey");
          store.createIndex("favoriteId", "favoriteId");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch((error) => {
        dbPromise = null;
        throw error;
      });
    }
    return dbPromise;
  }

  const done = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  async function get(id) {
    if (!id) return null;
    const db = await open();
    return (await done(db.transaction(STORE).objectStore(STORE).get(id))) || null;
  }

  // A whole offer, written once when it is made.
  async function put(offer) {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ ...offer, updatedAt: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    announce(offer.id);
    return offer;
  }

  // Merges a change into the stored offer (read and written in one
  // transaction). change: an object, or a function of the stored offer.
  async function update(id, change) {
    const db = await open();
    let result = null;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const read = store.get(id);
      read.onsuccess = () => {
        const stored = read.result;
        if (!stored) return;
        const patch = typeof change === "function" ? change(stored) : change;
        result = { ...stored, ...patch, id: stored.id, createdAt: stored.createdAt, updatedAt: new Date().toISOString() };
        store.put(result);
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    if (result) announce(id);
    return result;
  }

  async function byIndex(index, value) {
    const db = await open();
    const list = await done(db.transaction(STORE).objectStore(STORE).index(index).getAll(value));
    return (list || []).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  }
  const byAdKey = (key) => byIndex("adKey", key).catch(() => []);
  const byFavorite = (id) => byIndex("favoriteId", id).catch(() => []);

  async function recent(limit = 20) {
    const db = await open();
    const list = await done(db.transaction(STORE).objectStore(STORE).getAll());
    return (list || [])
      .filter((offer) => !offer.archived)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
      .slice(0, limit);
  }

  // Offers made today, for the number "1005-02".
  async function madeOn(day) {
    const db = await open();
    const list = await done(db.transaction(STORE).objectStore(STORE).getAll());
    return (list || []).filter((offer) => String(offer.createdAt || "").slice(0, 10) === day).length;
  }

  function newId() {
    const random = Math.random().toString(36).slice(2, 8);
    return `of-${Date.now().toString(36)}-${random}`;
  }

  // Other tabs (Monitoring, another offer) hear about every saved change.
  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("autogood-offers") : null;
  function announce(id) {
    try {
      channel?.postMessage({ type: "offer", id });
    } catch {
      // Only a convenience: the pages also read the store when opened.
    }
  }

  function readJson(key) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
      return value;
    } catch {
      try {
        localStorage.setItem(`${key}.broken.${new Date().toISOString()}`, raw);
      } catch {
        // Nothing more can be done in this browser.
      }
      return {};
    }
  }
  function writeJson(key, change) {
    const next = { ...readJson(key), ...change };
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  }

  const manager = () => ({ name: "", phone: "", email: "", ...readJson(MANAGER_KEY) });
  const setManager = (change) => writeJson(MANAGER_KEY, change);
  const company = () => ({ ...COMPANY_DEFAULTS, ...readJson(COMPANY_KEY) });
  const setCompany = (change) => writeJson(COMPANY_KEY, change);

  window.AUTOGOOD_OFFER_STORE = { get, put, update, byAdKey, byFavorite, recent, madeOn, newId, manager, setManager, company, setCompany, channel, COMPANY_DEFAULTS };
})();
