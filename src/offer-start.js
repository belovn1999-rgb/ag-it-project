/* AUTOGOOD program 06 "Oferta" (B71, owner 2026-10-10): an offer for a
 * client from one car, without Monitoring.
 *
 * First way — a dealer's ad link (the link box of "Wyszukiwanie i analiza",
 * page 1): the portal follows the link, "Rozpoznaj" reads the whole ad
 * (offer-ad.js: mobile.de through the importer on the Mac, AutoScout24 DE/FR,
 * ParuVendu and Kleinanzeigen through the market proxy) and shows the car in
 * the layout of page 1's summary; "Przygotuj ofertę PDF" saves the offer's
 * draft (offer-store.js, IndexedDB autogood-offers) with the ad already read
 * and opens it in oferta.html, where the manager checks it and downloads the
 * PDF. The market around the car comes from Monitoring only (an offer made
 * here has none yet); the cost starts as the calculator's "Zakup
 * bezpośredni" estimate and the panel "Kalkulacja" puts the exact lines in.
 * Second way — an auction report — comes later (its own chat).
 * docs/OFFER-PAGE.md §8.
 */
(() => {
  const AD = window.AUTOGOOD_OFFER_AD;
  const store = window.AUTOGOOD_OFFER_STORE;
  const EQUIPMENT = window.AUTOGOOD_OFFER_EQUIPMENT;
  const CATALOG = window.AUTOGOOD_MOBILE_MODEL_CATALOG?.groups || {};
  const params = new URLSearchParams(window.location.search);

  const form = document.querySelector("[data-os-form]");
  const input = document.querySelector("[data-os-url]");
  const select = document.querySelector("[data-os-source]");
  const readButton = document.querySelector("[data-os-read]");
  const status = document.querySelector("[data-os-status]");
  const carBox = document.querySelector("[data-os-car]");
  const recentBox = document.querySelector("[data-os-recent]");
  const recentList = document.querySelector("[data-os-recent-list]");
  if (!AD || !store || !form) return;

  const PORTAL = { mobile: "mobile.de", autoscout: "AutoScout24", autoscoutfr: "AutoScout24 (Francja)", kleinanzeigen: "Kleinanzeigen", paruvendu: "ParuVendu", marktplaats: "Marktplaats", dehands: "2dehands · 2ememain", otomoto: "otomoto.pl", blocket: "blocket.se", avby: "av.by" };
  const PLACEHOLDER = {
    mobile: "https://suchen.mobile.de/...",
    autoscout: "https://www.autoscout24.de/angebote/...",
    autoscoutfr: "https://www.autoscout24.fr/offres/...",
    kleinanzeigen: "https://www.kleinanzeigen.de/s-anzeige/...",
    paruvendu: "https://www.paruvendu.fr/a/voiture-occasion/...",
  };
  const COUNTRY = { DE: "Niemcy", NL: "Holandia", BE: "Belgia", FR: "Francja", AT: "Austria", LU: "Luksemburg", IT: "Włochy", ES: "Hiszpania", SE: "Szwecja", DK: "Dania", CZ: "Czechy", PL: "Polska", CH: "Szwajcaria" };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const numbers = new Intl.NumberFormat("pl-PL");
  const money = (value, currency = "EUR") => (value > 0 ? `${numbers.format(Math.round(value))} ${currency === "EUR" ? "€" : currency}` : "");
  const icon = (name) => `<svg aria-hidden="true"><use href="./src/mobile-icons.svg#${name}"></use></svg>`;

  // ---- The portal of a link -------------------------------------------------------
  function sourceOf(url) {
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
    if (/(^|\.)mobile\.de$/.test(host)) return "mobile";
    if (/(^|\.)autoscout24\.fr$/.test(host)) return "autoscoutfr";
    if (/(^|\.)autoscout24\./.test(host)) return "autoscout";
    if (/(^|\.)kleinanzeigen\.de$/.test(host)) return "kleinanzeigen";
    if (/(^|\.)paruvendu\.fr$/.test(host)) return "paruvendu";
    if (/(^|\.)marktplaats\.nl$/.test(host)) return "marktplaats";
    if (/(^|\.)(2dehands|2ememain)\.be$/.test(host)) return "dehands";
    if (/(^|\.)otomoto\.pl$/.test(host)) return "otomoto";
    if (/(^|\.)blocket\.se$/.test(host)) return "blocket";
    if (/(^|\.)av\.by$/.test(host)) return "avby";
    return "";
  }
  const readable = (source) => (AD.SOURCES || []).includes(source);

  // The ad's number, as Monitoring keys its offers ("mobile:412345678").
  function adKeyOf(source, url) {
    const text = String(url || "");
    const id = source === "mobile" ? text.match(/[?&]id=(\d+)|\/(\d{6,})\.html/)?.slice(1).find(Boolean)
      : /^autoscout/.test(source) ? text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]?.toLowerCase()
        : text.match(/\/(\d{6,})(?:[-/?#.]|$)/)?.[1];
    return `${source}:${id || text.replace(/[?#].*$/, "")}`;
  }

  // The importer of mobile.de (the Mac, through a quick tunnel whose address
  // changes with every restart; PROJECT-MOBILE.md §4.3 — never written into
  // the code). Candidates, first that answers wins: ?mobiledeApi= of this page
  // (remembered in this browser), the one remembered, the ones the newest
  // offers were read with (Monitoring opened with ?mobiledeApi=), and the
  // address in mobile.js.
  const IMPORTER_KEY = "autogood.offer.importer.v1";
  const remember = (url) => {
    try {
      localStorage.setItem(IMPORTER_KEY, url);
    } catch {
      /* private window: asked again next time */
    }
  };
  const remembered = () => {
    try {
      return localStorage.getItem(IMPORTER_KEY) || "";
    } catch {
      return "";
    }
  };
  if (params.get("mobiledeApi")) remember(params.get("mobiledeApi"));
  async function answers(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    try {
      // Without a listing the importer says so in JSON (400): it is alive.
      const response = await fetch(url, { signal: controller.signal });
      return response.status < 500 && /json/i.test(response.headers.get("content-type") || "");
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  }
  let importerPromise = null;
  function importerUrl() {
    if (window.AUTOGOOD_MOBILEDE_API_URL) return Promise.resolve(window.AUTOGOOD_MOBILEDE_API_URL);
    if (!importerPromise) {
      importerPromise = (async () => {
        const fromCode = await fetch("./src/mobile.js", { cache: "no-cache" })
          .then((response) => (response.ok ? response.text() : ""))
          .then((source) => source.match(/DEFAULT_MOBILEDE_API_URL\s*=\s*"([^"]+)"/)?.[1] || "")
          .catch(() => "");
        const fromOffers = (await store.recent(20).catch(() => [])).map((offer) => offer.importer).filter(Boolean);
        const candidates = [...new Set([params.get("mobiledeApi"), remembered(), ...fromOffers, fromCode].filter(Boolean))];
        for (const url of candidates) {
          if (await answers(url)) {
            remember(url);
            return url;
          }
        }
        importerPromise = null;
        return candidates[0] || "";
      })();
    }
    return importerPromise;
  }

  // ---- Make and model from the ad's name (mobile.de's catalogue) ----------------------
  const words = (value) => ` ${String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const ALIASES = { vw: "Volkswagen", mercedes: "Mercedes-Benz", "mercedes benz": "Mercedes-Benz", skoda: "Skoda", citroen: "Citroën", "land rover": "Land Rover", "range rover": "Land Rover", ds: "DS Automobiles" };
  function makeModel(title) {
    const text = words(title);
    const brands = Object.keys(CATALOG).map((name) => ({ name, key: words(name) }))
      .concat(Object.entries(ALIASES).filter(([, name]) => CATALOG[name]).map(([alias, name]) => ({ name, key: ` ${alias} ` })))
      .sort((left, right) => right.key.length - left.key.length);
    const brand = brands.find((item) => text.startsWith(item.key)) || brands.find((item) => text.includes(item.key));
    if (!brand) return { brand: "", model: "" };
    const rest = text.slice(text.indexOf(brand.key) + brand.key.length - 1);
    const models = (CATALOG[brand.name] || []).flatMap((group) => group.models || [])
      .filter((name) => name && name !== "Other")
      .map((name) => ({ name, key: words(name).trim() }))
      .filter((item) => item.key)
      .sort((left, right) => right.key.length - left.key.length);
    // "C-HR 2.0" → C-HR; "320d Touring" → 320 (a number with its letters).
    const fits = (item, at) => {
      const after = rest.charAt(at + item.key.length + 1);
      return after === " " || (/\d$/.test(item.key) && /[a-z]/.test(after));
    };
    const model = models.find((item) => rest.startsWith(` ${item.key}`) && fits(item, 0))
      || models.find((item) => {
        const at = rest.indexOf(` ${item.key}`);
        return at >= 0 && fits(item, at);
      });
    return { brand: brand.name, model: model?.name || "" };
  }

  // ---- The car as page 1's summary shows it -----------------------------------------
  let current = null; // { source, url, ad, adKey, brand, model }

  function rows(list) {
    return list.filter(([, , value]) => value !== "" && value !== null && value !== undefined)
      .map(([iconName, label, value, before = ""]) => `<li><span>${icon(iconName)}${esc(label)}</span><b>${before}${esc(value)}</b></li>`).join("");
  }
  function carHtml() {
    const { ad, source, brand, model } = current;
    const specs = ad.specs || {};
    const seller = ad.seller || {};
    const vat = ad.vat || {};
    const price = Number(vat.gross) || 0;
    const country = String(seller.country || "").toUpperCase();
    const options = EQUIPMENT ? EQUIPMENT.keyOptions(ad.features || [], 10) : [];
    const all = EQUIPMENT ? EQUIPMENT.list(ad.features || []).length : (ad.features || []).length;
    const flag = typeof window.AUTOGOOD_FLAG === "function" && country ? window.AUTOGOOD_FLAG(country) : "";
    const vatLine = vat.deductible ? `faktura VAT${vat.rate ? ` ${vat.rate}%` : ""}${vat.net ? ` (netto ${money(vat.net)})` : ""}`
      : seller.type === "private" ? "osoba prywatna" : "bez VAT do odliczenia";
    const power = specs.powerHp ? `${specs.powerHp} KM${specs.powerKw ? ` (${specs.powerKw} kW)` : ""}` : "";
    const sellerLine = seller.type === "dealer" ? (seller.name || "dealer") : seller.type === "private" ? "osoba prywatna" : seller.name || "";
    const missing = [!brand && "marka", !price && "cena", !specs.mileage && "przebieg", !specs.firstRegistration && "rok"].filter(Boolean);
    return `
      <div class="osCarHead">
        ${ad.images?.[0] ? `<img class="osCarPhoto" src="${esc(ad.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <div class="osCarName">
          <h2>${esc(ad.title || [brand, model].filter(Boolean).join(" ") || "Auto z ogłoszenia")}</h2>
          <p>${[brand, model].filter(Boolean).map(esc).join(" · ")}${brand ? " · " : ""}<a href="${esc(current.url)}" target="_blank" rel="noopener">ogłoszenie na ${esc(PORTAL[source] || "portalu")}</a></p>
        </div>
        <div class="osCarPrice">
          <b>${esc(money(price)) || "cena nieznana"}</b>
          <small>${esc(price ? `brutto · ${vatLine}` : "")}</small>
        </div>
      </div>
      <div class="osCols">
        <section>
          <h3>Nadwozie i silnik</h3>
          <ul>${rows([["car", "Nadwozie", specs.body || ""], ["fuel", "Typ silnika", specs.fuel || ""], ["settings", "Pojemność", specs.ccm ? `${numbers.format(specs.ccm)} ccm` : ""], ["zap", "Moc", power]])}</ul>
        </section>
        <section>
          <h3>Przebieg i napęd</h3>
          <ul>${rows([["gauge", "Przebieg", specs.mileage ? `${numbers.format(specs.mileage)} km` : ""], ["calendar", "1. rejestracja", specs.firstRegistration || ""], ["git-branch", "Skrzynia", specs.gearbox || ""], ["route", "Napęd", specs.drive || ""]])}</ul>
        </section>
        <section>
          <h3>Wyposażenie</h3>
          ${options.length ? `<ul class="osOptions">${options.map((item) => `<li>${esc(item.label)}</li>`).join("")}</ul>${all > options.length ? `<p class="osMuted">+ ${numbers.format(all - options.length)} w ogłoszeniu</p>` : ""}` : `<p class="osMuted">${ad.complete ? "brak listy wyposażenia w ogłoszeniu" : "wyposażenie po pełnym odczycie"}</p>`}
        </section>
        <section>
          <h3>Inne informacje</h3>
          <ul>${rows([["map-pin", "Kraj", [seller.city, COUNTRY[country] || country].filter(Boolean).join(", "), flag], ["check", "Stan", specs.damaged ? "uszkodzony" : specs.accidentFree === true ? "bezwypadkowy (wg sprzedawcy)" : ""], ["palette", "Kolor", specs.color || ""], ["store", "Sprzedawca", sellerLine]])}</ul>
        </section>
      </div>
      ${!ad.complete ? `<p class="osNote">Odczytano podstawowe dane. Zdjęcia, wyposażenie i sprzedawca pojawią się po pełnym odczycie (dla mobile.de potrzebny jest importer na Macu).</p>` : ""}
      ${missing.length ? `<p class="osNote">Nie udało się odczytać: ${esc(missing.join(", "))}. Uzupełnisz to na stronie oferty (Edytuj teksty).</p>` : ""}
      <div class="osCarFoot">
        <span class="osCarFootLabel">Oferta dla klienta</span>
        <button class="osPrimary" type="button" data-os-make>Przygotuj ofertę PDF <i aria-hidden="true">&#8594;</i></button>
      </div>`;
  }

  function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle("isError", error);
  }

  // ---- Rozpoznaj --------------------------------------------------------------------------
  let reading = false;
  async function recognise() {
    const url = input.value.trim();
    if (!/^https?:\/\//i.test(url)) {
      setStatus("Wklej pełny link ogłoszenia (https://…).", true);
      return;
    }
    const detected = sourceOf(url);
    if (detected) select.value = detected;
    const source = detected || select.value;
    if (!readable(source)) {
      setStatus(`Oferta z ${PORTAL[source] || "tego portalu"} - wkrótce. Teraz: mobile.de, AutoScout24 (DE i FR), Kleinanzeigen, ParuVendu.`, true);
      return;
    }
    if (reading) return;
    reading = true;
    readButton.disabled = true;
    carBox.hidden = true;
    setStatus(`Czytam ogłoszenie z ${PORTAL[source]}: zdjęcia, dane, wyposażenie, sprzedawca…`);
    try {
      const importer = source === "mobile" ? await importerUrl() : "";
      const ad = await AD.read(source, url, { importer });
      const { brand, model } = makeModel(ad.title);
      current = { source, url, ad, adKey: adKeyOf(source, url), brand, model };
      carBox.innerHTML = carHtml();
      carBox.hidden = false;
      setStatus(`Dane z ogłoszenia wczytane ${new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}.`);
    } catch (error) {
      current = null;
      const reason = String(error?.message || error);
      setStatus(source === "mobile" && /importer|fetch|Failed|NetworkError|502|503/i.test(reason)
        ? `Nie udało się odczytać ogłoszenia mobile.de: importer na Macu nie odpowiada (${reason}). Uruchom go albo otwórz stronę z ?mobiledeApi=…`
        : `Nie udało się odczytać ogłoszenia: ${reason}.`, true);
    } finally {
      reading = false;
      readButton.disabled = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    recognise();
  });
  input.addEventListener("input", () => {
    const detected = sourceOf(input.value.trim());
    if (detected) select.value = detected;
  });
  select.addEventListener("change", () => {
    input.placeholder = PLACEHOLDER[select.value] || "https://…";
  });

  // ---- The draft and the offer page -------------------------------------------------------
  // The calculator's "Zakup bezpośredni" (as offer-link.js for Monitoring):
  // the seller's own tariff when the importer counted it (mobile.de), else the
  // average one.
  function estimate(ad) {
    const turnkey = window.AUTOGOOD_TURNKEY;
    const price = Number(ad.vat?.gross) || 0;
    if (!turnkey || !price) return null;
    const rates = turnkey.currentRates();
    const tariff = ad.tariff || { transport: turnkey.AVERAGE_TRANSPORT_NETTO, inspection: turnkey.AVERAGE_INSPECTION_NETTO, rule: "average" };
    const engine = turnkey.engineInfo({ fuel: ad.specs?.fuel, title: ad.title, displacementCcm: ad.specs?.ccm }, {});
    const result = turnkey.turnkeyDirect({
      carBruttoEur: price,
      rate: rates.eur,
      transportNettoPln: tariff.transport,
      inspectionNettoPln: tariff.inspection,
      engineTypeIndex: engine.index,
    });
    return {
      method: "direct",
      rate: result.rate,
      rateLive: Boolean(window.AUTOGOOD_EUR_PLN_RAW),
      carBruttoEur: Math.round(price),
      transportNetto: tariff.transport,
      inspectionNetto: tariff.inspection,
      tariffRule: tariff.rule || "",
      engine: { index: engine.index, ccm: engine.ccm || null, source: engine.source, rate: turnkey.EXCISE_RATES[engine.index] },
      parts: result.parts,
      total: result.total,
    };
  }

  async function makeDraft(id) {
    const { ad, source, url, adKey, brand, model } = current;
    const specs = ad.specs || {};
    const seller = ad.seller || {};
    const vat = ad.vat || {};
    await window.AUTOGOOD_TURNKEY?.calculatorRate?.().catch(() => null);
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const sequence = (await store.madeOn(day).catch(() => 0)) + 1;
    const year = Number(String(specs.firstRegistration || "").match(/(\d{4})/)?.[1]) || null;
    return {
      id,
      origin: "link",
      createdAt: now.toISOString(),
      number: `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}-${String(sequence).padStart(2, "0")}`,
      lang: "pl",
      favoriteId: "",
      favoriteTitle: "",
      filters: { brand, model },
      source,
      adKey,
      url,
      importer: source === "mobile" ? await importerUrl() : "",
      // The car as a Monitoring record would hold it (offer.js reads both).
      car: {
        key: adKey,
        title: ad.title || "",
        price: Number(vat.gross) || 0,
        currency: "EUR",
        priceType: vat.deductible ? "vat" : seller.type === "private" ? "private" : "",
        netPrice: Number(vat.net) || 0,
        year,
        reg: specs.firstRegistration || "",
        mileage: Number(specs.mileage) || 0,
        fuel: specs.fuel || "",
        ccm: Number(specs.ccm) || 0,
        body: specs.body || "",
        country: seller.country || "",
        city: seller.city || "",
        zip: seller.zip || "",
        seller: seller.type || "",
        url,
      },
      market: null,
      estimate: estimate(ad),
      manager: store.manager(),
      company: store.company(),
      client: { salutation: "Pan", name: "" },
      edits: {},
      hidden: [],
      ad,
      adTriedAt: now.toISOString(),
    };
  }

  carBox.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-os-make]");
    if (!button || !current || button.disabled) return;
    button.disabled = true;
    const id = store.newId();
    const page = new URL("oferta.html", window.location.href);
    page.searchParams.set("id", id);
    try {
      await store.put(await makeDraft(id));
      const tab = window.open(page.toString(), "_blank");
      if (!tab) window.location.href = page.toString();
      showRecent();
    } catch (error) {
      setStatus(`Nie udało się przygotować oferty: ${error?.message || error}.`, true);
    } finally {
      button.disabled = false;
    }
  });

  // ---- Offers made before (here and from Monitoring) ------------------------------------
  async function showRecent() {
    const list = await store.recent(12).catch(() => []);
    const usable = list.filter((offer) => !offer.error);
    recentBox.hidden = !usable.length;
    recentList.innerHTML = usable.map((offer) => {
      const title = offer.ad?.title || offer.car?.title || offer.favoriteTitle || "Oferta";
      const date = new Date(offer.createdAt);
      const when = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
      const from = offer.origin === "link" ? "z linku" : "z Monitoringu";
      return `<li><a href="./oferta.html?id=${encodeURIComponent(offer.id)}" target="_blank" rel="noopener"><b>${esc(offer.number || "")}</b><span>${esc(title)}</span><small>${esc([when, PORTAL[offer.source] || "", from].filter(Boolean).join(" · "))}</small></a></li>`;
    }).join("");
  }
  showRecent();
  store.channel?.addEventListener("message", () => showRecent());

  // A link given in the address (?url=…) is read at once.
  if (params.get("url")) {
    input.value = params.get("url");
    recognise();
  }
})();
