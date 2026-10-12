/* AUTOGOOD — photos cut out of a report's PDF (DEKRA, 2026-10-12): kept in the
 * browser's IndexedDB, not in localStorage (a report is stored three times —
 * the last one, the offer, the history — and photos there would fill the
 * storage and stop saving offers). The report keeps "idb:<key>" in place of a
 * link; the pages turn it into a picture here. Nothing is ever deleted (the
 * rules of user data, docs/PROJECT-MOBILE.md §4.6.1); the same PDF read again
 * writes the same keys. docs/PROJECT-AUCTION-REPORTS.md §11.
 */
(function (root) {
  const DB = "autogood-auction-photos";
  const STORE = "photos";
  let opening = null;
  function db() {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch((error) => {
        opening = null;
        throw error;
      });
    }
    return opening;
  }
  const isLocal = (src) => /^idb:/.test(String(src || ""));
  async function put(key, blob) {
    const base = await db();
    await new Promise((resolve, reject) => {
      const tx = base.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    return `idb:${key}`;
  }
  async function get(src) {
    const base = await db();
    return new Promise((resolve, reject) => {
      const request = base.transaction(STORE, "readonly").objectStore(STORE).get(String(src).replace(/^idb:/, ""));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  const urls = new Map();
  // "idb:…" → an object URL for <img> ("" when the photo is not in this browser).
  function url(src) {
    if (!urls.has(src)) urls.set(src, get(src).then((blob) => (blob ? URL.createObjectURL(blob) : "")).catch(() => ""));
    return urls.get(src);
  }
  // "idb:…" → data: URL (the PDF's picture is drawn from a copy of the page).
  async function dataUrl(src) {
    const blob = await get(src).catch(() => null);
    if (!blob) return "";
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }
  // Every <img> of a part of the page whose source is "idb:…" gets its picture.
  function resolve(scope = document) {
    return Promise.all([...scope.querySelectorAll("img")].map(async (image) => {
      const src = image.getAttribute("data-source") || image.getAttribute("src") || "";
      if (!isLocal(src)) return;
      const link = await url(src);
      if (link && image.getAttribute("src") !== link) image.setAttribute("src", link);
    }));
  }
  root.AUTOGOOD_AUCTION_PHOTOS = { put, get, url, dataUrl, resolve, isLocal };
})(typeof self !== "undefined" ? self : this);
