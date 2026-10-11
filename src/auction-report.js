/* AUTOGOOD program 06 "Oferta", second way "Z raportu aukcji" (owner
 * 2026-10-11): reading a car's condition report from an auction into one
 * template — the car, how it was inspected, keys and documents, equipment,
 * tyres, damages with the report's own repair and (when the report gives
 * it) its repair price, what the report does not say.
 *
 * Plain JavaScript with no browser objects: the page (src/auction-start.js)
 * uses it now, a server will use the same file later (owner 2026-10-11:
 * the finished version goes to a server with the offer's PDF). The page
 * hands it the text of a link (read through the market proxy) or the text
 * items of a PDF (PDF.js); this file finds the firm and the layout itself.
 *
 * Macadam (France, 2026-10-11) prints five layouts, all in French:
 *   links — reports.macadam.eu/reports/<id>          "Rapport d'inspection"
 *           *.macadam.eu/…/AppraisalWebview?…        appraisal (repair prices
 *                                                    with withPrices=True)
 *           portal.macadam.eu/reports/remarketing?id= "Rapport de Remarketing"
 *                                                    (the maker's equipment by VIN)
 *   PDFs  — prints of those pages: the appraisal keeps its link in the PDF's
 *           title, the remarketing report in its footer; the inspection print
 *           (Ayvens France) has no link and is read from its text.
 * docs/PROJECT-AUCTION-REPORTS.md §5.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AUTOGOOD_AUCTION_REPORT = api;
})(typeof self !== "undefined" ? self : this, () => {
  // ---- Small helpers ------------------------------------------------------------------
  const plain = (value) => String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  const clean = (value) => String(value ?? "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  const oneLine = (value) => clean(value).replace(/\n+/g, ", ");
  const keyOf = (label) => plain(label).replace(/\s*:\s*$/, "");
  const numberOf = (value) => {
    const text = String(value ?? "").replace(/ /g, " ");
    const match = text.match(/-?\d[\d\s.]*(?:,\d+)?|-?\d+(?:\.\d+)?/);
    if (!match) return null;
    let digits = match[0].trim();
    // "121 699" / "6461,16" / "4.6" / "102794 km"
    if (/,\d+$/.test(digits)) digits = digits.replace(/[\s.]/g, "").replace(",", ".");
    else if (/^\d{1,3}(?:[\s.]\d{3})+$/.test(digits)) digits = digits.replace(/[\s.]/g, "");
    else digits = digits.replace(/\s/g, "");
    const number = Number(digits);
    return Number.isFinite(number) ? number : null;
  };
  // "27/11/2023" or "23/09/2026 15:10:13" → "2023-11-27"
  const isoDate = (value) => {
    const match = String(value || "").match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
  };
  const unique = (list) => [...new Set(list.filter(Boolean))];

  // ---- A small HTML reader (no DOM on a server) ----------------------------------------
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const RAW = new Set(["script", "style", "template", "noscript", "svg"]);
  const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", icirc: "î", ucirc: "û", ugrave: "ù", euml: "ë", iuml: "ï", deg: "°", euro: "€", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…" };
  const decode = (text) => String(text || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === "#") {
      const number = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
  function parseHtml(html) {
    const root = { tag: "#root", attrs: {}, children: [], parent: null };
    let node = root;
    const source = String(html || "");
    const pattern = /<!--[\s\S]*?-->|<![^>]*>|<\/\s*([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|([^<]+)|</g;
    let match;
    while ((match = pattern.exec(source))) {
      const [whole, closing, opening, attrText, selfClose, text] = match;
      if (text !== undefined || whole === "<") {
        node.children.push({ tag: "#text", attrs: {}, children: [], text: decode(text ?? whole), parent: node });
      } else if (opening) {
        const tag = opening.toLowerCase();
        const attrs = {};
        (attrText || "").replace(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, (_, name, a, b, c) => {
          attrs[name.toLowerCase()] = decode(a ?? b ?? c ?? "");
          return "";
        });
        const element = { tag, attrs, children: [], parent: node };
        node.children.push(element);
        if (RAW.has(tag) && !selfClose) {
          const end = source.toLowerCase().indexOf(`</${tag}`, pattern.lastIndex);
          pattern.lastIndex = end < 0 ? source.length : source.indexOf(">", end) + 1 || source.length;
        } else if (!VOID.has(tag) && !selfClose) node = element;
      } else if (closing) {
        const tag = closing.toLowerCase();
        let open = node;
        while (open && open.tag !== tag) open = open.parent;
        if (open && open.parent) node = open.parent;
      }
    }
    return root;
  }
  const classes = (element) => ` ${element?.attrs?.class || ""} `;
  const hasClass = (element, name) => classes(element).includes(` ${name} `);
  function walk(element, visit) {
    for (const child of element.children || []) {
      if (visit(child) === false) continue;
      walk(child, visit);
    }
  }
  function findAll(element, test) {
    const found = [];
    walk(element, (child) => {
      if (child.tag !== "#text" && test(child)) found.push(child);
    });
    return found;
  }
  const findOne = (element, test) => findAll(element, test)[0] || null;
  // The element's text; <br> and block elements give new lines.
  const BLOCK = new Set(["div", "p", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "table", "section", "ul", "ol"]);
  function textOf(element) {
    if (!element) return "";
    if (element.tag === "#text") return element.text;
    let out = "";
    for (const child of element.children || []) {
      if (child.tag === "br") out += "\n";
      else if (BLOCK.has(child.tag)) out += `\n${textOf(child)}\n`;
      else out += textOf(child);
    }
    return out;
  }
  const textClean = (element) => clean(textOf(element));
  const nextElement = (element) => {
    const siblings = element?.parent?.children || [];
    for (let at = siblings.indexOf(element) + 1; at < siblings.length; at += 1) {
      if (siblings[at].tag !== "#text") return siblings[at];
    }
    return null;
  };
  const previousElement = (element) => {
    const siblings = element?.parent?.children || [];
    for (let at = siblings.indexOf(element) - 1; at >= 0; at -= 1) {
      if (siblings[at].tag !== "#text") return siblings[at];
    }
    return null;
  };
  const absolute = (url, base) => {
    try {
      return new URL(url, base).toString();
    } catch {
      return url || "";
    }
  };

  // ---- Which report this is ---------------------------------------------------------------
  const LAYOUTS = {
    inspection: { firm: "Macadam", name: "Rapport d'inspection" },
    appraisal: { firm: "Macadam", name: "Appraisal (Macadam Manager)" },
    remarketing: { firm: "Macadam", name: "Rapport de Remarketing" },
  };
  // Auctions and inspection firms we know by name but do not read yet.
  const OTHERS = [
    { test: /(^|\.)auto1\.com$/, firm: "AUTO1" },
    { test: /(^|\.)bca(-europe)?\.[a-z.]+$|(^|\.)bca\.com$/, firm: "BCA" },
    { test: /(^|\.)autorola\.[a-z.]+$/, firm: "Autorola" },
    { test: /(^|\.)(openlane|adesa)\.[a-z.]+$/, firm: "OPENLANE" },
    { test: /(^|\.)(carmarket\.)?(ayvens|ald-?automotive|leaseplan)\.[a-z.]+$/, firm: "Ayvens Carmarket" },
    { test: /(^|\.)alcopa-auction\.fr$/, firm: "Alcopa Auction" },
    { test: /(^|\.)vpauto\.fr$/, firm: "VPauto" },
    { test: /(^|\.)autobid\.de$/, firm: "Autobid" },
    { test: /(^|\.)dekra\.[a-z.]+$/, firm: "DEKRA" },
    { test: /(^|\.)tuv|tuev|(^|\.)tuvsud\.[a-z]+$/, firm: "TÜV" },
  ];
  const TEXT_FIRMS = [
    { test: /\bDEKRA\b/, firm: "DEKRA" },
    { test: /\bT[ÜU]V\b|\bTUEV\b/, firm: "TÜV" },
    { test: /\bAUTO1\b/i, firm: "AUTO1" },
    { test: /\bBCA\b/, firm: "BCA" },
    { test: /\bAutorola\b/i, firm: "Autorola" },
    { test: /\bOPENLANE\b/i, firm: "OPENLANE" },
    { test: /\bMACADAM\b/i, firm: "Macadam" },
  ];

  // A link → the layout and the address to read (French, with prices).
  function detectLink(input) {
    let url;
    try {
      url = new URL(String(input || "").trim());
    } catch {
      return { ok: false, reason: "url" };
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (/(^|\.)macadam\.eu$/.test(host)) {
      const path = url.pathname;
      if (/^\/reports\/remarketing/i.test(path)) {
        url.searchParams.set("culture", "fr-FR");
        return { ok: true, firm: "Macadam", layout: "remarketing", url: url.toString() };
      }
      if (/^\/reports\/[0-9a-f-]{20,}/i.test(path)) {
        url.searchParams.set("culture", "fr-FR");
        return { ok: true, firm: "Macadam", layout: "inspection", url: url.toString() };
      }
      if (/AppraisalWebview/i.test(path)) {
        // Parameter names come in both cases (assessmentFileId / AssessmentFileId).
        for (const name of [...url.searchParams.keys()]) {
          if (/^(withprices|language|showprintbutton)$/i.test(name)) url.searchParams.delete(name);
        }
        url.searchParams.set("language", "fr");
        url.searchParams.set("withPrices", "True");
        return { ok: true, firm: "Macadam", layout: "appraisal", url: url.toString() };
      }
      return { ok: false, firm: "Macadam", reason: "layout" };
    }
    const other = OTHERS.find((item) => item.test.test(host));
    if (other) return { ok: false, firm: other.firm, reason: "firm" };
    return { ok: false, reason: "unknown", host };
  }

  // ---- Labels → the template's fields -------------------------------------------------------
  const FIELD = {
    immatriculation: "plate", "plaque d'immatriculation": "plate",
    vin: "vin", "n° chassis": "vin", niv: "vin",
    kilometrage: "mileage", "kilometrage inspection": "mileage",
    "premiere immatriculation": "firstRegistration", "1iere mec": "firstRegistration",
    "couleur carrosserie": "color", "couleur de la carrosserie": "color",
    "nature de peinture": "paint",
    marque: "make", modele: "model", version: "version",
    "type de carrosserie": "body", "type carrosserie": "body",
    "nbre portes": "doors", "nombre de portes": "doors", "nbre sieges": "seats", "nombre de sieges": "seats",
    transmission: "drive", boite: "gearbox", "boite de vitesses": "gearbox",
    carburant: "fuel", "type de carburant": "fuel",
    "puissance kw": "power", puissance: "power", "cv fiscaux": "cv",
    "couleur interieur": "interior", "revetement de siege": "upholstery", "couleur tableau de bord": "dashboard",
    categorie: "category",
    "nbre cles total": "keys", "nbre cles telecommandes": "remotes",
    "moteur fonctionnant": "engineRuns", "batterie fonctionnante": "batteryOk", "vehicule roulant": "driveable",
    "niveau carburant": "fuelLevel",
    "adresse d'inspection": "place", "date de l'inspection": "inspectedAt",
    "type de jantes (montees)": "rims", "type de climatisation": "aircon", "nombre appuis-tetes": "headrests",
  };
  // Documents and checks: shown as they are, in their own block.
  const DOCUMENTS = new Set([
    "certificat immatriculation (original)", "manuel d'utilisation", "carnet d'entretien",
    "certificat d'immatriculation partie domicile", "certificat d'immatriculation partie vehicule",
    "certificat de conformite", "entretien", "type de carnet d'entretien", "reinitialisation des parametres d'usine",
    "nbr cable de charge (220v)", "nbr cable de charge (charge rapide)",
  ]);
  const SPARE = new Set(["galette", "cric", "runflat", "kit reparation", "compresseur", "roue de secours", "kit reparation pneu"]);
  const TYRE_POS = { avg: "AVG", avd: "AVD", arg: "ARG", ard: "ARD" };
  const POSITION_WORDS = { "avant gauche": "AVG", "avant droite": "AVD", "arriere gauche": "ARG", "arriere droite": "ARD" };

  // The report's repair → our group (owner 2026-10-11: report's own words kept, groups for the summary).
  const REPAIRS = [
    { test: /^le\s*-|remplacer et peindre/, group: "replace_paint" },
    { test: /^li\s*-|reparer et peindre/, group: "repair_paint" },
    { test: /^e\s*-|^remplacer$/, group: "replace" },
    { test: /^peindre$/, group: "paint" },
    { test: /^pdr\b|debosselage/, group: "pdr" },
    { test: /smart repair/, group: "smart" },
    { test: /^67\s*-|lustrage/, group: "polish" },
    { test: /grele/, group: "hail" },
    { test: /reparation pare-brise/, group: "glass" },
    { test: /montant forfaitaire|^forfait$/, group: "flat" },
    { test: /depose\s*\/\s*repose/, group: "refit" },
    { test: /^p\s*-|controler/, group: "check" },
    { test: /nettoyer/, group: "clean" },
    { test: /^acceptable$|pas de reparation|sans degats/, group: "none" },
  ];
  const repairGroup = (repair) => (REPAIRS.find((item) => item.test.test(plain(repair)))?.group) || "other";
  // A caption "Élément, type, réparation" ends with one of these.
  const looksLikeRepair = (text) => repairGroup(text) !== "other" || /^[A-Z0-9]{1,3}\s+-\s+\S/.test(text);

  // ---- The template ---------------------------------------------------------------------------
  function emptyReport(layout, extra = {}) {
    return {
      firm: LAYOUTS[layout]?.firm || "", layout, layoutName: LAYOUTS[layout]?.name || "", client: "", country: "FR", language: "fr",
      readFrom: "", sourceUrl: "", fileName: "", title: "",
      car: {}, inspection: {}, state: {}, keys: {},
      documents: [], spare: [], options: [], factoryEquipment: [], factoryDetails: [], tyres: [], damages: [],
      damageSummary: [], costTotal: null, currency: "EUR", photos: [], other: [],
      ...extra,
    };
  }
  // One label and its value → the right place in the report.
  function put(report, label, value, section = "") {
    const key = keyOf(label);
    const text = clean(value);
    if (!key) return;
    const field = FIELD[key];
    const sectionKey = plain(section);
    if (field === "place") {
      report.inspection.place = report.inspection.place ? `${report.inspection.place}, ${oneLine(text)}` : oneLine(text);
      return;
    }
    if (field === "inspectedAt") {
      report.inspection.date = isoDate(text);
      report.inspection.dateText = oneLine(text);
      return;
    }
    if (field) {
      if (["keys", "remotes"].includes(field)) report.keys[field] ??= numberOf(text);
      else if (["engineRuns", "batteryOk", "driveable", "fuelLevel"].includes(field)) report.state[field] ??= oneLine(text);
      else if (!report.car[field] && text) report.car[field] = field === "upholstery" ? text.split("\n").join(" / ") : oneLine(text);
      return;
    }
    if ((DOCUMENTS.has(key) || SPARE.has(key)) && !text) return;
    if (DOCUMENTS.has(key)) {
      report.documents.push({ label: clean(label).replace(/\s*:\s*$/, ""), value: oneLine(text) });
      return;
    }
    if (SPARE.has(key)) {
      report.spare.push({ label: clean(label).replace(/\s*:\s*$/, ""), value: oneLine(text) });
      return;
    }
    const tyre = key.match(/^(profondeur|taille|type|marque) de pneu (avg|avd|arg|ard)$/);
    if (tyre) {
      const item = tyreAt(report, TYRE_POS[tyre[2]]);
      const what = { profondeur: "depth", taille: "size", type: "season", marque: "mark" }[tyre[1]];
      if (what === "depth") item.depth ??= numberOf(text);
      else item[what] ??= oneLine(text);
      return;
    }
    if (TYRE_POS[key] && /pneu/.test(sectionKey)) {
      // "AVG — Hankook: 55%" (appraisal)
      const item = tyreAt(report, TYRE_POS[key]);
      const [brand, wear] = oneLine(text).split(/:\s*/);
      item.brand ??= brand;
      if (wear) item.wear ??= numberOf(wear);
      return;
    }
    if (/^options|options selon/.test(sectionKey)) {
      if (!text || /^oui$/i.test(text)) report.options.push(clean(label));
      else if (!/^non$/i.test(text)) report.options.push(`${clean(label)}: ${oneLine(text)}`);
      return;
    }
    if (text) report.other.push({ label: clean(label).replace(/\s*:\s*$/, ""), value: oneLine(text), section: clean(section) });
  }
  function tyreAt(report, position) {
    let item = report.tyres.find((tyre) => tyre.position === position);
    if (!item) {
      item = { position };
      report.tyres.push(item);
    }
    return item;
  }
  function addDamage(report, damage) {
    const element = oneLine(damage.element);
    if (!element) return;
    report.damages.push({
      id: damage.id || "",
      element,
      type: oneLine(damage.type),
      repair: oneLine(damage.repair).replace(/\s+-\s+/g, " - "),
      group: repairGroup(damage.repair),
      cost: damage.cost ?? null,
      area: oneLine(damage.area || ""),
      page: damage.page || null,
      photos: unique(damage.photos || []),
    });
  }

  // Common last step: make, model, plate from the title; mileage as a number; counts.
  function finish(report) {
    const car = report.car;
    if (car.mileage !== undefined) car.mileageKm = numberOf(car.mileage);
    if (car.firstRegistration) car.firstRegistrationIso = isoDate(car.firstRegistration);
    if (car.power) car.powerKw = numberOf(car.power);
    if (!car.make && car.version) car.make = car.version.split("/")[0].trim().split(/\s+/)[0];
    // Appraisal: "AUDI Q3 Sportback / 2019 / 5P / SUV 35 TDI 150 S TRONIC S LINE"
    if (car.version && /\/\s*\d{4}\s*\//.test(car.version)) {
      const parts = car.version.split("/").map((part) => part.trim());
      car.versionModel = parts[0];
      car.generationYear = numberOf(parts[1]);
      car.versionDetails = parts.slice(3).join(" / ").replace(/^(SUV|BERLINE|BREAK|MONOSPACE|COUPE|CABRIOLET)\s+/i, "");
    }
    const hp = String(car.version || "").match(/\b(\d{2,3})\s*(?:ch|cv|hp|ps)?\b(?=\s+(?:[A-Z]|$))/);
    if (!car.powerKw && hp && car.versionDetails && /^(?:\d\.\d\s+)?\d{2,3}\s+(?:TDI|TFSI|TSI|HDI|BLUEHDI|DCI|CRDI|D|I|E-?TENSE|HYBRID)|\b(?:TDI|TFSI|TSI|DUR|BLUEHDI|DCI|CRDI|PURETECH|ECOBOOST)\s+\d{2,3}\b/i.test(car.versionDetails)) {
      const power = car.versionDetails.match(/\b(?:TDI|TFSI|TSI|DUR|BLUEHDI|DCI|CRDI|PURETECH|ECOBOOST)\s+(\d{2,3})\b/i)?.[1];
      if (power) car.powerHpFromVersion = Number(power);
    }
    report.title = report.title || [car.make, car.model || car.versionModel?.replace(new RegExp(`^${car.make}\\s+`, "i"), "")].filter(Boolean).join(" ");
    // Repeated listings (one page prints the same damage in two layouts).
    const seen = new Set();
    report.damages = report.damages.filter((damage) => {
      if (!damage.id) return true;
      if (seen.has(damage.id)) return false;
      seen.add(damage.id);
      return true;
    });
    report.options = unique(report.options);
    if (report.mainPhoto) report.photos = [report.mainPhoto, ...report.photos.filter((src) => src !== report.mainPhoto)];
    report.photos = unique(report.photos);
    const groups = {};
    for (const damage of report.damages) groups[damage.group] = (groups[damage.group] || 0) + 1;
    report.damageGroups = groups;
    if (report.costTotal === null && report.damages.some((damage) => damage.cost !== null)) {
      // Damages Macadam marks as not chargeable are not in its total.
      report.costTotal = Math.round(report.damages.filter((damage) => damage.chargeable !== false)
        .reduce((sum, damage) => sum + (damage.cost || 0), 0) * 100) / 100;
    }
    report.missing = missingOf(report);
    return report;
  }
  // What the template wants and the report does not say (owner: "brak w raporcie").
  function missingOf(report) {
    const car = report.car;
    const missing = [];
    if (!car.version) missing.push("version");
    if (!car.powerKw && !car.powerHpFromVersion) missing.push("power");
    if (!car.fuel) missing.push("fuel");
    if (!car.gearbox) missing.push("gearbox");
    if (!car.drive) missing.push("drive");
    if (!report.inspection.date) missing.push("inspectionDate");
    if (!report.inspection.place) missing.push("inspectionPlace");
    if (!report.documents.some((item) => /entretien/i.test(item.label))) missing.push("serviceBook");
    if (!report.documents.some((item) => /certificat/i.test(item.label))) missing.push("registration");
    if (!report.tyres.length) missing.push("tyres");
    return missing;
  }

  // ---- Link layouts (HTML) --------------------------------------------------------------------

  // reports.macadam.eu (Blazor, MudBlazor): label / value rows, the same block
  // printed up to three times (screen, print, phone) — the first copy is kept.
  function fromInspectionHtml(html, url) {
    const report = emptyReport("inspection", { readFrom: "link", sourceUrl: url || "" });
    const tree = parseHtml(html);
    // Photos are relative to the page's <base href="/">, not to /reports/<id>.
    const baseHref = findOne(tree, (el) => el.tag === "base")?.attrs.href || "/";
    const base = absolute(baseHref, url || "https://reports.macadam.eu/");
    const title = textClean(findOne(tree, (el) => el.tag === "title"));
    if (title && !/rapport d'inspection/i.test(plain(title)) && !/rapport d/i.test(title)) report.title = title;
    let section = "";
    const sectionLabels = {};
    // In document order: headings (h3) start sections, label rows give fields.
    walk(tree, (el) => {
      if (el.tag === "h3") {
        section = textClean(el);
        return false;
      }
      if (el.tag === "h4" || hasClass(el, "damage-info")) return false;
      if (hasClass(el, "description-list-wrapper__label")) {
        const label = textClean(el);
        const value = textClean(nextElement(el));
        const seen = (sectionLabels[section] ||= { first: "", done: false, tyre: false });
        if (seen.done) return false;
        // The block again (second layout): the rest of this section is a copy.
        const pair = `${label}|${value}`;
        if (seen.first && seen.first === pair && !/pneu/i.test(section)) {
          seen.done = true;
          return false;
        }
        if (!seen.first) seen.first = pair;
        if (/^pneus/i.test(section)) inspectionTyre(report, label, value);
        else put(report, label, value, section);
        return false;
      }
      return true;
    });
    // The make and model above the first block ("BMW / SERIE 3 TOURING / -").
    if (!report.car.make) {
      const head = findOne(tree, (el) => /vehicle-?title|car-?title/i.test(el.attrs.class || ""));
      if (head) report.title = textClean(head).split("\n").join(" ");
    }
    // Damages: <div class="damage-info"> with h4 > a#damage-N and its two rows;
    // the photos are in the grid item before it.
    for (const info of findAll(tree, (el) => hasClass(el, "damage-info"))) {
      const anchor = findOne(info, (el) => el.tag === "a" && /^damage-/.test(el.attrs.id || ""));
      const rows = {};
      for (const label of findAll(info, (el) => hasClass(el, "description-list-wrapper__label"))) {
        rows[keyOf(textClean(label))] = textClean(nextElement(label));
      }
      const gridItem = info.parent;
      const photosBox = previousElement(gridItem);
      const photos = photosBox ? findAll(photosBox, (el) => el.tag === "img").map((img) => img.attrs.src || "")
        .filter((src) => /\/original\//i.test(src)).map((src) => absolute(src, base)) : [];
      addDamage(report, {
        id: anchor?.attrs.id || "",
        element: textClean(anchor || findOne(info, (el) => el.tag === "h4")),
        type: rows["type de dommage"],
        repair: rows["mode de reparation"],
        photos,
      });
    }
    // Macadam's own costing of every damage: Blazor keeps the page's data in
    // comments (<!--Blazor:{…"parameterValues":"<base64 JSON>"}-->); a damage's
    // assessmentDamageId is the number of its anchor "damage-N".
    const costs = blazorCosts(html);
    for (const damage of report.damages) {
      const cost = costs.get(String(damage.id).replace(/^damage-/, ""));
      if (!cost) continue;
      damage.cost = cost.net;
      damage.costWithVat = cost.gross;
      damage.chargeable = cost.chargeable;
    }
    if (costs.size) report.costNet = true;
    // Commercial photos: originals outside the damages.
    const damagePhotos = new Set(report.damages.flatMap((damage) => damage.photos));
    report.photos = findAll(tree, (el) => el.tag === "img").map((img) => img.attrs.src || "")
      .filter((src) => /\/original\//i.test(src)).map((src) => absolute(src, base)).filter((src) => !damagePhotos.has(src));
    // The main photo (owner 2026-10-11): the car's front from the left, nose to the left —
    // Macadam's picture type 4 ("Avant gauche 3/4"), first in its carousel.
    const front = blazorFrontPhoto(html);
    if (front) report.mainPhoto = absolute(front, base);
    // The car's name: the line above "Immatriculation" in the head block.
    const texts = [];
    walk(tree, (el) => {
      if (el.tag === "#text" && el.text.trim()) texts.push(clean(el.text));
      return true;
    });
    const at = texts.indexOf("Immatriculation");
    if (at > 2) {
      const before = texts.slice(Math.max(0, at - 4), at).filter((text) => text !== "-" && !/^[❮❯]$/.test(text));
      if (!report.car.make && before.length) report.title = before.join(" ");
    }
    return finish(report);
  }
  // base64 → text (UTF-8) in a browser and on a server.
  function fromBase64(text) {
    if (typeof Buffer !== "undefined") return Buffer.from(text, "base64").toString("utf8");
    const bytes = Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }
  // assessmentDamageId → { net, gross, chargeable } from the page's Blazor data.
  function blazorCosts(html) {
    const costs = new Map();
    for (const match of String(html || "").matchAll(/<!--Blazor:(\{[\s\S]*?\})-->/g)) {
      let values;
      try {
        values = JSON.parse(match[1]).parameterValues;
        if (!values || !/finalPrice/.test(values) && values.length < 200) continue;
        values = JSON.parse(fromBase64(values));
      } catch {
        continue;
      }
      const lists = Array.isArray(values) ? values.filter(Array.isArray) : [];
      for (const item of lists.flat()) {
        if (!item || typeof item !== "object" || item.assessmentDamageId === undefined || !item.finalPrice) continue;
        costs.set(String(item.assessmentDamageId), {
          net: Number(item.finalPrice?.price) || 0,
          gross: Number(item.finalPriceWithVat?.price) || null,
          chargeable: item.isChargeable,
        });
      }
    }
    return costs;
  }

  // The commercial photo of picture type 4 from the page's Blazor data.
  function blazorFrontPhoto(html) {
    for (const match of String(html || "").matchAll(/<!--Blazor:(\{[\s\S]*?\})-->/g)) {
      try {
        const values = JSON.parse(match[1]).parameterValues;
        if (!values || values.length < 200) continue;
        const text = fromBase64(values);
        const found = text.match(/"source":"(files\/Original\/[^"]+)","thumbnailSource":"[^"]*","pictureType":\{"value":4\}/);
        if (found) return found[1];
      } catch {
        // Not this block.
      }
    }
    return "";
  }

  function inspectionTyre(report, label, value) {
    const key = keyOf(label);
    if (key === "emplacement") {
      report.tyres.push({ position: "", place: plain(value) });
      return;
    }
    const tyre = report.tyres[report.tyres.length - 1];
    if (!tyre) return;
    if (key === "position") tyre.position = POSITION_WORDS[`${tyre.place} ${plain(value)}`] || `${tyre.place} ${plain(value)}`;
    else if (key === "profondeur des sculptures") tyre.depth = numberOf(value);
    else if (key === "fabricant") tyre.brand = oneLine(value);
    else if (key === "dimensions") tyre.size = oneLine(value);
    else if (key === "type de pneu") tyre.season = oneLine(value);
    else if (key === "type de jantes") tyre.rim = oneLine(value);
    else if (key === "runflat") tyre.runflat = oneLine(value);
  }

  // *.macadam.eu Manager AppraisalWebview (old tables): td.dynamicLabel + td.dynamicValue;
  // damages are header bars "Élément, type, réparation" with the price on the right.
  function fromAppraisalHtml(html, url) {
    const report = emptyReport("appraisal", { readFrom: "link", sourceUrl: url || "" });
    const tree = parseHtml(html);
    const titleCell = findOne(tree, (el) => el.attrs.id === "vehicleTitle");
    const head = textClean(titleCell);
    if (head) {
      report.title = head.replace(/:\s*[\w-]+$/, "").replace(/-\d{4}$/, "").replace(/-/g, " ").trim();
      const plate = head.match(/:\s*([\w-]+)\s*$/)?.[1];
      if (plate) report.car.plate = plate;
    }
    let section = "";
    let pendingDamage = null;
    let totalNext = false;
    walk(tree, (el) => {
      if (el.tag === "th" && hasClass(el, "x-panel-header")) {
        section = textClean(el);
        return false;
      }
      if (hasClass(el, "dynamicLabel")) {
        const label = textClean(el);
        const valueCell = nextElement(el);
        const isValue = valueCell && /dynamicValue/.test(valueCell.attrs.class || "");
        // "Pneus d'été:" — a nested table with the size and four tyres.
        if (/^pneus? /i.test(label) && valueCell && !isValue) {
          const season = label.replace(/^pneus?\s*/i, "").replace(/:$/, "");
          const size = textClean(findOne(valueCell, (cell) => /dynamicValueLeft/.test(cell.attrs.class || "") && cell.attrs.colspan));
          for (const position of Object.values(TYRE_POS)) {
            const tyre = tyreAt(report, position);
            tyre.season ??= season.replace(/^d'/, "");
            if (size) tyre.sizeShort ??= size;
          }
          return true;
        }
        put(report, label, isValue ? textOf(valueCell) : "", section);
        return false;
      }
      if (el.tag === "div" && hasClass(el, "x-panel-header") && /^(left|center)$/i.test(el.attrs.align || "")) {
        const text = textClean(el);
        // With prices the bar is a table row: the price in the next cell.
        const row = el.parent?.tag === "td" ? el.parent.parent : null;
        const priceCell = row ? findOne(row, (cell) => cell !== el && cell.tag === "div" && cell.attrs.align === "right") : null;
        const price = priceCell ? numberOf(textClean(priceCell)) : null;
        if (/co[uû]t total/i.test(text)) {
          report.costTotal = price;
          report.costNet = /hors tva/i.test(text);
          totalNext = true;
          return false;
        }
        const parts = text.split(/\s*,\s*/);
        if (parts.length >= 3 && looksLikeRepair(parts[parts.length - 1])) {
          pendingDamage = { element: parts.slice(0, -2).join(", "), type: parts[parts.length - 2], repair: parts[parts.length - 1], cost: price, photos: [] };
          addDamage(report, pendingDamage);
          pendingDamage = report.damages[report.damages.length - 1];
        }
        return false;
      }
      if (/^reviewPictures/.test(el.attrs.id || "")) {
        const photos = pictureLinks(el);
        if (pendingDamage) pendingDamage.photos = unique([...pendingDamage.photos, ...photos]);
        return false;
      }
      return true;
    });
    void totalNext;
    // Commercial photos: the links before the vehicle title.
    const damagePhotos = new Set(report.damages.flatMap((damage) => damage.photos));
    report.photos = pictureLinks(tree).filter((href) => !damagePhotos.has(href));
    // The report's own main picture (front from the left).
    const main = findOne(tree, (el) => el.tag === "img" && el.attrs.id === "mainPicture");
    if (main?.attrs.src) report.mainPhoto = main.attrs.src.replace(/\?originalpicture=true$/i, "");
    // Prices are shown only when the link asked for them.
    if (!/withprices=true/i.test(url || "")) {
      report.costTotal = report.costTotal ?? null;
    }
    return finish(report);
  }

  // Full-size photos of a block: <a href=".../picture/…"> or <img onclick="ShowPicture('…')"> / thumbnail src.
  function pictureLinks(box) {
    const found = [];
    for (const el of findAll(box, (node) => node.tag === "a" || node.tag === "img")) {
      const href = el.attrs.href || el.attrs.onclick?.match(/https?:\/\/[^"')]+\/picture\/[^"')]+/)?.[0]
        || (el.tag === "img" && el.parent?.tag !== "a" ? (el.attrs.src || "").replace(/\/thumbnail\//i, "/picture/") : "");
      if (/\/picture\//i.test(href || "")) found.push(href.replace(/\?originalpicture=true$/i, ""));
    }
    return unique(found);
  }

  // portal.macadam.eu/reports/remarketing (Bootstrap): <label>…</label>:<strong>…</strong>,
  // the maker's equipment by VIN, the inspector's options, damages, tyres, checks.
  function fromRemarketingHtml(html, url) {
    const report = emptyReport("remarketing", { readFrom: "link", sourceUrl: url || "" });
    const tree = parseHtml(html);
    // Vehicle block: label + strong.
    const info = findOne(tree, (el) => el.attrs.id === "vehicleInfo") || tree;
    for (const label of findAll(info, (el) => el.tag === "label")) {
      const strong = findOne(label.parent, (el) => el.tag === "strong");
      if (strong) put(report, textClean(label), textClean(strong), "vehicle");
    }
    // The first registration and mileage sit outside the label/strong pattern sometimes.
    walk(info, (el) => {
      if (el.tag !== "div" || !/\bcol-/.test(el.attrs.class || "")) return true;
      const text = textClean(el);
      const reg = text.match(/premi[eè]re immatriculation\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (reg && !report.car.firstRegistration) report.car.firstRegistration = reg[1];
      return true;
    });
    report.factoryEquipment = findAll(findOne(tree, (el) => el.attrs.id === "vinEquipment") || { children: [] }, (el) => el.tag === "div")
      .map(textClean).filter(Boolean);
    const detail = findOne(tree, (el) => el.attrs.id === "vinDetail");
    if (detail) {
      const box = findAll(detail, (el) => el.tag === "div" && !findOne(el, (child) => child.tag === "div")).map(textClean).filter(Boolean);
      report.factoryDetails = unique(box.filter((text) => !/^d[ée]tails du niv$/i.test(text)));
    }
    // Pairs "Text <span><strong>Oui</strong></span>" in options and checks.
    const pairsIn = (box, section) => {
      for (const cell of findAll(box, (el) => el.tag === "div" && !findOne(el, (child) => child.tag === "div"))) {
        const strong = findOne(cell, (el) => el.tag === "strong");
        if (!strong) continue;
        const full = clean(textOf(cell));
        const value = textClean(strong);
        const label = full.endsWith(value) ? full.slice(0, full.length - value.length).trim() : full;
        put(report, label, textClean(strong), section);
      }
    };
    const options = findOne(tree, (el) => el.attrs.id === "options");
    if (options) pairsIn(options, "Options selon l'inspecteur");
    const checks = findOne(tree, (el) => /^(checks|controls|controles)$/i.test(el.attrs.id || ""))
      || findAll(tree, (el) => el.tag === "h5" && /contr[oô]les/i.test(textClean(el))).map((h5) => nextElement(h5))[0];
    if (checks) pairsIn(checks, "Contrôles");
    // Damages: row → <strong>element</strong><br/>type<br/>repair<br/>area + photos.
    const damages = findOne(tree, (el) => el.attrs.id === "damages");
    if (damages) {
      for (const row of findAll(damages, (el) => el.tag === "div" && /\brow\b/.test(el.attrs.class || "") && /keep-together/.test(el.attrs.class || ""))) {
        const strong = findOne(row, (el) => el.tag === "strong");
        if (!strong) continue;
        const lines = textClean(strong.parent).split("\n").map((line) => line.trim()).filter(Boolean);
        const [element, type, repair, area] = lines;
        const photos = findAll(row, (el) => el.tag === "img").map((img) => img.attrs.src || "").filter(Boolean)
          .map((src) => src.replace(/\/thumbnail\//i, "/picture/"));
        addDamage(report, { element, type, repair, area, photos });
      }
    }
    // Tyres: cells after the six headers, six per tyre.
    const tires = findOne(tree, (el) => el.attrs.id === "tires");
    if (tires) {
      const cells = findAll(tires, (el) => el.tag === "div" && /\bcol-/.test(el.attrs.class || "") && !/font-weight-bold/.test(el.attrs.class || ""))
        .map(textClean).filter((text) => text !== "");
      for (let at = 0; at + 5 < cells.length; at += 6) {
        const [place, season, rim, size, brand, depth] = cells.slice(at, at + 6);
        report.tyres.push({ position: POSITION_WORDS[plain(place)] || place, season, rim, size, brand, depth: numberOf(depth) });
      }
    }
    // Damage summary: one box per area — <strong>Arrière</strong> <span class="badge">1</span>.
    const summaryHead = findAll(tree, (el) => el.tag === "h5" && /r[ée]sum[ée] des dommages/i.test(textClean(el)))[0];
    const summaryBox = summaryHead ? nextElement(summaryHead) : null;
    for (const cell of summaryBox ? findAll(summaryBox, (el) => el.tag === "div" && findOne(el, (child) => child.tag === "strong")) : []) {
      const count = numberOf(textClean(findOne(cell, (el) => /badge/.test(el.attrs.class || ""))));
      if (count !== null) report.damageSummary.push({ area: textClean(findOne(cell, (el) => el.tag === "strong")), count });
    }
    const damagePhotos = new Set(report.damages.flatMap((damage) => damage.photos));
    report.photos = findAll(tree, (el) => el.tag === "img" && /\/picture\//.test(el.attrs.src || "") && !/damage-picture/.test(el.attrs.class || ""))
      .map((img) => img.attrs.src.replace(/\/thumbnail\//i, "/picture/")).filter((src) => !damagePhotos.has(src));
    // Photos carry their angle in alt: the front from the left first.
    const front = findAll(tree, (el) => el.tag === "img" && /avant gauche 3\/4/i.test(el.attrs.alt || ""))[0];
    if (front?.attrs.src) report.mainPhoto = front.attrs.src.replace(/\/thumbnail\//i, "/picture/");
    return finish(report);
  }

  function fromHtml(html, url = "") {
    const text = String(html || "");
    if (/description-list-wrapper__label/.test(text)) return fromInspectionHtml(text, url);
    if (/dynamicLabel/.test(text) && /vehicleTitle|AppraisalWebview/i.test(text)) return fromAppraisalHtml(text, url);
    if (/id=["']?vinEquipment|Rapport de Remarketing/i.test(text)) return fromRemarketingHtml(text, url);
    return null;
  }

  // ---- PDFs (text items with positions from PDF.js) -------------------------------------------
  // pages: [{ width, height, items: [{ str, x, y, w, h }] }] (y from the bottom, as PDF.js gives).

  // Remarketing prints break words into letters: rebuild words by distance.
  function joinFragments(items) {
    const rows = [];
    for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 1.5);
      if (row) row.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    }
    return rows.map((row) => {
      const sorted = row.items.sort((a, b) => a.x - b.x);
      let text = "";
      let end = null;
      for (const item of sorted) {
        if (end !== null && item.x - end > Math.max(1.2, (item.h || 8) * 0.18)) text += " ";
        text += item.str;
        end = item.x + item.w;
      }
      return text.replace(/\s+/g, " ").trim();
    });
  }

  // A page's lines: items on one height joined left to right.
  function linesOf(page) {
    const rows = [];
    for (const item of [...page.items].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 1);
      if (row) row.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    }
    return rows.map((row) => ({ y: row.y, text: row.items.sort((a, b) => a.x - b.x).map((item) => item.str.trim()).join(" ").replace(/\s+/g, " ").replace(/\s+,/g, ",").trim() }));
  }

  function pdfText(pages) {
    return pages.map((page) => page.items.map((item) => item.str).join(" ")).join("\n");
  }

  function detectPdf({ title = "", pages = [] } = {}) {
    const text = pdfText(pages);
    const link = String(title || "").match(/(?:https?:\/\/)?[\w.-]*macadam\.eu\/[^\s]*AppraisalWebview[^\s]*/i)?.[0];
    if (link) return { firm: "Macadam", layout: "appraisal", link: /^https?:/i.test(link) ? link : `https://${link}` };
    const joined = pages.slice(0, 1).concat(pages.slice(-1)).flatMap((page) => joinFragments(page.items)).join("\n");
    if (/remarketing/i.test(title) || /Rapport de Remarketing/i.test(joined)) {
      const footer = pages.flatMap((page) => page.items.map((item) => item.str)).find((str) => /portal\.macadam\.eu\/reports\/remarketing/i.test(str));
      return { firm: "Macadam", layout: "remarketing", link: footer?.trim() || "" };
    }
    if (/Rapport d'inspection|Rapport d’inspection/i.test(text) && /Mode de r[ée]paration|DOMMAGES/i.test(text)) {
      return { firm: "Macadam", layout: "inspection", link: "" };
    }
    if (/N° Chassis/i.test(text) && /1i[èe]re MEC/i.test(text)) return { firm: "Macadam", layout: "appraisal", link: "" };
    const firm = TEXT_FIRMS.find((item) => item.test.test(text) || item.test.test(title));
    return { firm: firm?.firm || "", layout: "", link: "" };
  }

  const PDF_LABELS = Object.keys(FIELD).concat([...DOCUMENTS], [...SPARE], [
    "options", "pneu", "materiel de secours", "type de dommage", "mode de reparation", "pneus montes", "emplacement",
    "gps", "camera de recul", "cache bagages", "phares xenon/led/laser",
  ]);
  const isLabel = (text) => {
    const key = keyOf(text);
    return PDF_LABELS.includes(key) || Boolean(TYRE_POS[key]) || /^(profondeur|taille|type|marque) de pneu (avg|avd|arg|ard)$/.test(key);
  };
  // The value of a label: items on its line to the right, before the next label.
  function valueAt(page, label, { up = 2.5, down = 2.5 } = {}) {
    const right = label.x + label.w;
    const line = page.items.filter((item) => item !== label && item.x >= right - 1 && item.y <= label.y + up && item.y >= label.y - down);
    // The next column starts where any label of the page starts to the right.
    const columns = page.items.filter((item) => isLabel(item.str) && item.x > right + 4 && Math.abs(item.y - label.y) <= 5).map((item) => item.x);
    const limit = columns.length ? Math.min(...columns) : Infinity;
    return line.filter((item) => item.x < limit && !isLabel(item.str))
      .sort((a, b) => b.y - a.y || a.x - b.x).map((item) => item.str.trim()).join(" ").replace(/\s+/g, " ").trim();
  }

  // Ayvens-style "Rapport d'inspection" printed from reports.macadam.eu.
  function fromInspectionPdf(pages) {
    const report = emptyReport("inspection", { readFrom: "pdf" });
    const first = pages[0];
    // The firm the inspection was for: top right ("Ayvens France").
    const topRight = first.items.filter((item) => item.y > first.height - 80 && item.x > first.width * 0.6).sort((a, b) => b.y - a.y);
    report.client = topRight[0]?.str?.trim() || "";
    let carried = "";
    pages.forEach((page, index) => {
      const headers = page.items.filter((item) => /^[A-ZÉÈÀ' ]{5,}$/.test(item.str.trim()) && item.x < page.width / 2).sort((a, b) => b.y - a.y);
      const previous = carried;
      const sectionAt = (item) => headers.filter((header) => header.y > item.y).slice(-1)[0]?.str || previous;
      if (headers.length) carried = headers[headers.length - 1].str;
      for (const item of page.items) {
        const key = keyOf(item.str);
        if (!isLabel(item.str) || ["type de dommage", "mode de reparation", "pneus montes", "emplacement", "options", "pneu", "materiel de secours"].includes(key)) continue;
        const section = sectionAt(item);
        if (/PNEUS|DOMMAGES/.test(section)) continue;
        put(report, item.str, valueAt(page, item, { up: 4, down: 6 }), section);
      }
      // Damages: the element's name above "Type de dommage" at the same x.
      for (const typeLabel of page.items.filter((item) => keyOf(item.str) === "type de dommage")) {
        const element = page.items.filter((item) => Math.abs(item.x - typeLabel.x) < 3 && item.y > typeLabel.y && item.y - typeLabel.y < 30)
          .sort((a, b) => a.y - b.y)[0];
        const repairLabel = page.items.filter((item) => keyOf(item.str) === "mode de reparation" && item.y < typeLabel.y && typeLabel.y - item.y < 25)
          .sort((a, b) => b.y - a.y)[0];
        addDamage(report, {
          element: element?.str,
          type: valueAt(page, typeLabel),
          repair: repairLabel ? valueAt(page, repairLabel) : "",
          page: index + 1,
        });
      }
      // Tyres: rows under the header "Emplacement Position Profondeur …".
      const head = page.items.find((item) => keyOf(item.str) === "emplacement");
      if (head) {
        const columns = page.items.filter((item) => Math.abs(item.y - head.y) < 2).sort((a, b) => a.x - b.x)
          .map((item) => ({ x: item.x, key: keyOf(item.str) }));
        const rows = {};
        const below = headers.filter((header) => header.y < head.y).map((header) => header.y);
        const floor = below.length ? Math.max(...below) : 40;
        for (const item of page.items.filter((cell) => cell.y < head.y - 3 && cell.y > floor && cell.y > head.y - 160 && !/\d+\/\d+$/.test(cell.str.trim()))) {
          const row = Object.keys(rows).find((y) => Math.abs(Number(y) - item.y) < 2) || item.y;
          (rows[row] ||= []).push(item);
        }
        for (const cells of Object.values(rows)) {
          const tyre = {};
          for (const cell of cells) {
            const column = columns.filter((col) => col.x <= cell.x + 2).slice(-1)[0];
            if (!column) continue;
            tyre[column.key] = `${tyre[column.key] ? `${tyre[column.key]} ` : ""}${cell.str.trim()}`;
          }
          if (!tyre.emplacement) continue;
          report.tyres.push({
            position: POSITION_WORDS[`${plain(tyre.emplacement)} ${plain(tyre.position)}`] || `${tyre.emplacement} ${tyre.position}`,
            depth: numberOf(tyre["profondeur des sculptures"]),
            brand: tyre.fabricant || "",
            size: tyre.dimensions || "",
            season: tyre["type de pneu"] || "",
            rim: tyre["type de jantes"] || "",
            runflat: tyre.runflat || "",
          });
        }
      }
    });
    // Head of page 1: the car's name ("AUDI A4").
    const nameItem = first.items.find((item) => keyOf(item.str) === "immatriculation");
    const above = nameItem ? first.items.filter((item) => Math.abs(item.x - nameItem.x) < 3 && item.y > nameItem.y && item.y - nameItem.y < 40 && item.str.trim() !== "-")
      .sort((a, b) => b.y - a.y)[0] : null;
    if (above) report.title = above.str.trim();
    return finish(report);
  }

  // Appraisal print without its link (the title lost): two-column labels, captions under photos.
  function fromAppraisalPdf(pages) {
    const report = emptyReport("appraisal", { readFrom: "pdf" });
    const first = pages[0];
    const head = first.items.find((item) => /:\s*[\w-]+$/.test(item.str) && /-\d{4}:/.test(item.str));
    if (head) {
      report.title = head.str.replace(/:\s*[\w-]+$/, "").replace(/-\d{4}$/, "").replace(/-/g, " ").trim();
      report.car.plate = head.str.match(/:\s*([\w-]+)\s*$/)?.[1] || "";
    }
    const upholstery = [];
    const headerOf = (page) => page.items.filter((item) => /^(Options|Pneu|Matériel de secours)$/i.test(item.str.trim())).sort((a, b) => b.y - a.y);
    pages.forEach((page, index) => {
      const headers = headerOf(page);
      const sectionAt = (item) => headers.filter((header) => header.y > item.y).slice(-1)[0]?.str || "";
      for (const item of page.items) {
        if (!isLabel(item.str)) continue;
        const key = keyOf(item.str);
        if (["options", "pneu", "materiel de secours"].includes(key)) continue;
        let value = valueAt(page, item);
        if (key === "revetement de siege") {
          // "Tissu / Autre" and "Cuir" on two lines under each other.
          value = page.items.filter((cell) => cell.x > item.x + item.w && cell.y <= item.y + 2.5 && cell.y >= item.y - 12 && !isLabel(cell.str))
            .sort((a, b) => b.y - a.y).map((cell) => cell.str.trim()).join("\n");
          upholstery.push(...page.items.filter((cell) => cell.x > item.x + item.w && cell.y <= item.y + 2.5 && cell.y >= item.y - 12 && !isLabel(cell.str)));
        }
        if (key === "version") {
          // The version wraps: its second line sits a few points lower, right of the label.
          value = page.items.filter((cell) => cell !== item && cell.x > item.x + item.w && cell.y <= item.y + 3 && cell.y >= item.y - 9 && !isLabel(cell.str) && cell.x > item.x)
            .sort((a, b) => b.y - a.y || a.x - b.x).map((cell) => cell.str.trim()).join(" ");
        }
        put(report, item.str, value, sectionAt(item));
      }
      // Options without a value (right column of "Options").
      const options = headers.find((header) => /^options$/i.test(header.str.trim()));
      const tyres = headers.find((header) => /^pneu$/i.test(header.str.trim()));
      if (options) {
        const valueItems = new Set();
        for (const label of page.items.filter((item) => isLabel(item.str))) {
          page.items.filter((item) => Math.abs(item.y - label.y) <= 2.5 && item.x > label.x).forEach((item) => valueItems.add(item));
        }
        for (const item of page.items.filter((cell) => cell.y < options.y && (!tyres || cell.y > tyres.y) && cell.x > page.width * 0.45)) {
          if (!isLabel(item.str) && !valueItems.has(item) && !upholstery.includes(item) && !/^\d+$/.test(item.str.trim())) report.options.push(item.str.trim());
        }
      }
      // "Pneus d'été:" with "AVG Hankook: 55%" pairs.
      const seasonItem = page.items.find((item) => /^pneus? (d'|d’)?(ete|été|hiver|toutes saisons|4 saisons)/i.test(item.str.trim()));
      if (seasonItem) {
        for (const position of Object.values(TYRE_POS)) {
          const label = page.items.find((item) => item.str.trim() === position);
          const tyre = tyreAt(report, position);
          tyre.season ??= seasonItem.str.replace(/^pneus?\s*(d'|d’)?/i, "").replace(/:$/, "").trim();
          if (label) {
            const [brand, wear] = valueAt(page, label).split(/:\s*/);
            tyre.brand ??= brand;
            if (wear) tyre.wear ??= numberOf(wear);
          }
        }
      }
      // Damage captions "Élément, type, réparation" (under their photos), printed in pieces.
      for (const line of linesOf(page)) {
        const parts = line.text.split(/\s*,\s*/);
        if (parts.length >= 3 && looksLikeRepair(parts[parts.length - 1])) {
          addDamage(report, { element: parts.slice(0, -2).join(", "), type: parts[parts.length - 2], repair: parts[parts.length - 1], page: index + 1 });
        }
      }
    });
    // Revêtement de siège: values on two lines ("Tissu / Autre", "Cuir").
    return finish(report);
  }

  function fromPdf({ title = "", pages = [] } = {}) {
    const kind = detectPdf({ title, pages });
    if (kind.layout === "inspection") return { kind, report: fromInspectionPdf(pages) };
    if (kind.layout === "appraisal") return { kind, report: fromAppraisalPdf(pages) };
    return { kind, report: null };
  }


  // ---- French words → Polish / Russian (the page and the brief; the original stays visible) ----
  // Values of the report's fields.
  const VALUES = {
    oui: ["Tak", "Да"], non: ["Nie", "Нет"], "n/a": ["nie dotyczy", "н/д"], copie: ["Kopia", "Копия"], ok: ["OK", "OK"],
    diesel: ["Diesel", "Дизель"], essence: ["Benzyna", "Бензин"], "hybride rechargeable": ["Hybryda plug-in", "Гибрид plug-in"],
    hybride: ["Hybryda", "Гибрид"], "hybride essence": ["Hybryda (benzyna)", "Гибрид (бензин)"], "hybride diesel": ["Hybryda (diesel)", "Гибрид (дизель)"],
    electrique: ["Elektryczny", "Электро"], gpl: ["LPG", "Газ (LPG)"],
    automatique: ["Automatyczna", "Автомат"], manuelle: ["Manualna", "Механика"], "man 6 vit": ["Manualna 6-biegowa", "Механика 6 ступ."], "man 5 vit": ["Manualna 5-biegowa", "Механика 5 ступ."],
    avant: ["Przedni", "Передний"], arriere: ["Tylny", "Задний"], integrale: ["4×4", "Полный"], "4x4": ["4×4", "Полный"],
    noir: ["Czarny", "Чёрный"], blanc: ["Biały", "Белый"], gris: ["Szary", "Серый"], "gris fonce": ["Ciemnoszary", "Тёмно-серый"], "gris clair": ["Jasnoszary", "Светло-серый"],
    bleu: ["Niebieski", "Синий"], rouge: ["Czerwony", "Красный"], vert: ["Zielony", "Зелёный"], argent: ["Srebrny", "Серебристый"], beige: ["Beżowy", "Бежевый"],
    marron: ["Brązowy", "Коричневый"], jaune: ["Żółty", "Жёлтый"], orange: ["Pomarańczowy", "Оранжевый"], violet: ["Fioletowy", "Фиолетовый"],
    metallise: ["Metalik", "Металлик"], nacre: ["Perła", "Перламутр"], opaque: ["Niemetalizowany", "Неметаллик"], uni: ["Niemetalizowany", "Неметаллик"],
    berline: ["Sedan / hatchback", "Седан / хэтчбек"], break: ["Kombi", "Универсал"], suv: ["SUV", "SUV"], monospace: ["Minivan", "Минивэн"], coupe: ["Coupé", "Купе"], cabriolet: ["Kabriolet", "Кабриолет"],
    "vehicule particulier": ["Osobowy", "Легковой"], "vehicule utilitaire": ["Dostawczy", "Коммерческий"],
    ete: ["Letnie", "Летние"], hiver: ["Zimowe", "Зимние"], "toutes saisons": ["Całoroczne", "Всесезонные"], "4 saisons": ["Całoroczne", "Всесезонные"],
    aluminium: ["Aluminiowe", "Литые"], acier: ["Stalowe", "Стальные"], tole: ["Stalowe", "Стальные"],
    "clim. automatique": ["Klimatyzacja automatyczna", "Климат-контроль"], "clim. manuelle": ["Klimatyzacja manualna", "Кондиционер"],
    "tissu / autre": ["Tkanina / inne", "Ткань / другое"], cuir: ["Skóra", "Кожа"], "tissu / autre / cuir": ["Tkanina / skóra", "Ткань / кожа"],
    "entretien digital": ["Cyfrowa książka serwisowa", "Цифровая сервисная книжка"],
  };
  const DAMAGE_TYPES = {
    "griffe(s)": ["Rysy", "Царапины"], "bosse(s)": ["Wgniecenia", "Вмятины"], "bosse(s) et griffe(s)": ["Wgniecenia i rysy", "Вмятины и царапины"],
    "deforme / force": ["Odkształcenie", "Деформация"], casse: ["Pęknięte / złamane", "Сломано"], dechirure: ["Rozdarcie / przecięcie", "Порез / разрыв"],
    use: ["Zużyte", "Изношено"], "hors tolerance": ["Poza normą (zużyte)", "Вне допуска (износ)"], tache: ["Plama", "Пятно"], manque: ["Brak", "Отсутствует"],
    vide: ["Puste / zużyte", "Пусто / использовано"], degrafe: ["Odpięte", "Отщёлкнуто"], "sans degats": ["Bez uszkodzeń", "Без повреждений"], allume: ["Świeci się", "Горит"],
    "eclat(s)": ["Odpryski", "Сколы"], grele: ["Grad", "Град"], repare: ["Naprawiane wcześniej", "Ранее ремонтировалось"], endommage: ["Uszkodzone", "Повреждено"],
    "mauvaise reparation": ["Zła wcześniejsza naprawa", "Плохой прошлый ремонт"], rouille: ["Korozja", "Ржавчина"], fissure: ["Pęknięcie", "Трещина"], "impact(s)": ["Uderzenie", "Удар"],
  };
  const REPAIR_NAMES = {
    replace_paint: ["Wymiana + lakierowanie", "Замена + покраска"], repair_paint: ["Naprawa + lakierowanie", "Ремонт + покраска"],
    replace: ["Wymiana", "Замена"], paint: ["Lakierowanie", "Покраска"], pdr: ["Usuwanie wgnieceń bez lakierowania (PDR)", "Вмятина без покраски (PDR)"],
    smart: ["Naprawa miejscowa (smart repair)", "Локальный ремонт (smart repair)"], polish: ["Polerowanie", "Полировка"], hail: ["Ryczałt za grad", "Град (фикс. сумма)"],
    glass: ["Naprawa szyby", "Ремонт стекла"], flat: ["Naprawa / wymiana (ryczałt)", "Ремонт / замена (фикс.)"], refit: ["Demontaż / montaż", "Снять / поставить"],
    check: ["Do sprawdzenia", "Проверить"], clean: ["Czyszczenie", "Чистка"], none: ["Bez naprawy (dopuszczalne)", "Без ремонта (допустимо)"], other: ["", ""],
  };
  // Parts of a car (longest first when matched).
  const PARTS = [
    ["moulure de pare-chocs", "Listwa zderzaka", "Молдинг бампера"], ["grille de pare-chocs", "Kratka zderzaka", "Решётка бампера"],
    ["pare-chocs", "Zderzak", "Бампер"], ["spoiler", "Spojler / dokładka", "Спойлер / губа"], ["calandre", "Atrapa chłodnicy", "Решётка радиатора"],
    ["capot", "Maska", "Капот"], ["moulure d'aile", "Nakładka błotnika", "Накладка крыла"], ["aile", "Błotnik", "Крыло"],
    ["moulure porte", "Listwa drzwi", "Молдинг двери"], ["garniture porte", "Boczek drzwi", "Обшивка двери"], ["poignee ext porte", "Klamka zewnętrzna", "Наружная ручка двери"],
    ["porte", "Drzwi", "Дверь"], ["pneu", "Opona", "Шина"], ["jante alum.", "Felga aluminiowa", "Литой диск"], ["jante", "Felga", "Диск"],
    ["enjoliveur de roue", "Kołpak", "Колпак"], ["pare-brise", "Szyba czołowa", "Лобовое стекло"], ["boitier retroviseur ext", "Obudowa lusterka", "Корпус зеркала"],
    ["retroviseur", "Lusterko", "Зеркало"], ["coffre / hayon", "Klapa bagażnika", "Крышка багажника"], ["joint de coffre", "Uszczelka bagażnika", "Уплотнитель багажника"],
    ["cache bagages", "Roleta bagażnika", "Шторка багажника"], ["garnit int", "Boczek bagażnika", "Обшивка багажника"], ["garnit. couvercle", "Tapicerka klapy", "Обшивка крышки багажника"],
    ["garnit couvercle", "Tapicerka klapy", "Обшивка крышки багажника"], ["jupe", "Dyfuzor", "Диффузор"], ["volant", "Kierownica", "Руль"],
    ["tableau de bord", "Deska rozdzielcza", "Панель приборов"], ["couvercle boite a gants", "Pokrywa schowka", "Крышка бардачка"], ["ciel de toit", "Podsufitka", "Потолок"],
    ["pavillon", "Dach / podsufitka", "Крыша / потолок"], ["montant de toit", "Słupek dachu", "Стойка крыши"], ["toit", "Dach", "Крыша"],
    ["revetement assise siege", "Tapicerka siedziska", "Обивка сиденья"], ["revetement assise", "Tapicerka siedziska", "Обивка сиденья"],
    ["protect. dossier ext siege", "Osłona oparcia fotela", "Защита спинки сиденья"], ["garniture montant mil", "Osłona słupka B", "Обшивка стойки B"],
    ["garn montant", "Osłona słupka A", "Обшивка стойки A"], ["garn mont pavillon", "Osłona słupka dachu", "Обшивка стойки крыши"],
    ["garn pass roue", "Nadkole", "Подкрылок"], ["protect. pass. roue", "Nadkole", "Подкрылок"], ["grille vent.", "Kratka nawiewu", "Дефлектор вентиляции"],
    ["obturateur /cache", "Zaślepka / osłona", "Заглушка / накладка"], ["interieur", "Wnętrze", "Салон"], ["carrosserie", "Nadwozie", "Кузов"],
    ["voyant defaut", "Kontrolka błędu na desce", "Лампа ошибки на панели"], ["clef de contact", "Kluczyk", "Ключ"], ["compresseur", "Kompresor", "Компрессор"],
    ["kit reparation pneu", "Zestaw naprawczy opon", "Ремкомплект шин"], ["bas de caisse", "Próg", "Порог"], ["phare", "Reflektor", "Фара"], ["feu", "Lampa", "Фонарь"],
    ["vitre", "Szyba", "Стекло"], ["siege", "Fotel", "Сиденье"],
  ].sort((a, b) => b[0].length - a[0].length);
  const POSITIONS = {
    avg: ["przód lewy", "перед. левый"], avd: ["przód prawy", "перед. правый"], arg: ["tył lewy", "зад. левый"], ard: ["tył prawy", "зад. правый"],
    av: ["przód", "перед"], ar: ["tył", "зад"], g: ["lewy", "левый"], d: ["prawy", "правый"], m: ["środek", "центр"], mil: ["", ""],
    ext: ["zewn.", "наруж."], int: ["wewn.", "внутр."], coffre: ["", ""], "bi-ton/polychrome": ["dwukolorowa", "двухцветный"], "(sans insert)": ["", ""], tc: ["", ""],
  };
  // Equipment names (Macadam's lists by VIN and the inspector's), the common ones;
  // null — not worth the client's eye (every car has it).
  const EQUIPMENT = {
    "accoudoir central": ["Podłokietnik", "Подлокотник"], airbag: null, "direction assistee": null, "verrouillage central": null,
    "fonctionnement electrique des fenetres": null, "assistant de demarrage en cote": ["Asystent ruszania pod górę", "Помощь при старте в гору"],
    "barres de toit": ["Relingi dachowe", "Рейлинги"], "capteur de pluie": ["Czujnik deszczu", "Датчик дождя"],
    "controle de distance": ["Czujniki parkowania", "Парктроники"], gps: ["Nawigacja", "Навигация"], "stockage gps": null,
    "interieur cuir": ["Skórzana tapicerka", "Кожаный салон"], isofix: ["Isofix", "Isofix"], "jantes alu": ["Felgi aluminiowe", "Литые диски"],
    "retroviseurs reglables electrique": ["Elektryczne lusterka", "Электрозеркала"], "sieges chauffants av (ecs&b)": ["Podgrzewane fotele przednie", "Подогрев передних сидений"],
    "sieges chauffants av": ["Podgrzewane fotele przednie", "Подогрев передних сидений"], telephone: ["Zestaw głośnomówiący", "Громкая связь"],
    "volant cuir": ["Skórzana kierownica", "Кожаный руль"], "volant multifonctions": ["Kierownica wielofunkcyjna", "Мультируль"],
    "camera de recul": ["Kamera cofania", "Камера заднего вида"], "cache bagages": ["Roleta bagażnika", "Шторка багажника"],
    "phares xenon/led/laser": ["Reflektory LED / ksenon", "Фары LED / ксенон"], "toit ouvrant": ["Szyberdach", "Люк"], "toit panoramique": ["Dach panoramiczny", "Панорамная крыша"],
    "regulateur de vitesse": ["Tempomat", "Круиз-контроль"], "regulateur de vitesse adaptatif": ["Tempomat aktywny", "Адаптивный круиз"], "attelage": ["Hak holowniczy", "Фаркоп"],
    "sieges electriques": ["Elektryczne fotele", "Электросиденья"], "hayon electrique": ["Elektryczna klapa bagażnika", "Электропривод багажника"], "head-up display": ["Head-up display", "Проекция на стекло"],
  };
  // → the name in the offer's language, the French one when not known, "" for the trivial ones.
  function equipmentName(value, lang = "pl") {
    const key = plain(value).replace(/:\s*oui$/, "");
    if (Object.prototype.hasOwnProperty.call(EQUIPMENT, key)) return EQUIPMENT[key] ? EQUIPMENT[key][lang === "ru" ? 1 : 0] : "";
    return String(value || "").replace(/:\s*oui$/i, "");
  }
  // Labels of documents, checks and the spare kit.
  const LABELS = {
    "certificat d'immatriculation partie domicile": ["Dowód rejestracyjny — część z adresem", "Техпаспорт — часть с адресом"],
    "certificat d'immatriculation partie vehicule": ["Dowód rejestracyjny — część pojazdu", "Техпаспорт — часть об авто"],
    "certificat immatriculation (original)": ["Dowód rejestracyjny (oryginał)", "Техпаспорт (оригинал)"],
    "certificat de conformite": ["Świadectwo zgodności (CoC)", "Сертификат соответствия (CoC)"],
    entretien: ["Serwis", "Обслуживание"], "carnet d'entretien": ["Książka serwisowa", "Сервисная книжка"],
    "type de carnet d'entretien": ["Rodzaj książki serwisowej", "Вид сервисной книжки"],
    "manuel d'utilisation": ["Instrukcja obsługi", "Инструкция"],
    "nbr cable de charge (220v)": ["Kable ładowania (220 V)", "Кабели зарядки (220 В)"],
    "nbr cable de charge (charge rapide)": ["Kable szybkiego ładowania", "Кабели быстрой зарядки"],
    "reinitialisation des parametres d'usine": ["Przywrócenie ustawień fabrycznych", "Сброс до заводских настроек"],
    galette: ["Koło dojazdowe", "Докатка"], cric: ["Podnośnik", "Домкрат"], runflat: ["Opony run-flat", "Шины run-flat"],
    "kit reparation": ["Zestaw naprawczy", "Ремкомплект"], "kit reparation pneu": ["Zestaw naprawczy opon", "Ремкомплект шин"],
    compresseur: ["Kompresor", "Компрессор"], "roue de secours": ["Koło zapasowe", "Запасное колесо"],
  };
  const LABEL_VALUES = {
    "over 16100 km": null, "oui, le vehicule a ete reinitialise aux parametres d'usine": ["Tak", "Да"],
  };
  function labelName(label, lang = "pl") {
    const hit = LABELS[keyOf(label)];
    return hit ? hit[lang === "ru" ? 1 : 0] : String(label || "");
  }
  // A value of those rows: "over 16100 km" → "ponad 16 100 km", the rest as the field values.
  function labelValue(value, lang = "pl") {
    const text = String(value || "");
    const over = text.match(/^over\s+(\d+)\s*km$/i);
    if (over) return `${lang === "ru" ? "более" : "ponad"} ${Number(over[1]).toLocaleString("pl-PL").replace(/\u00a0/g, " ")} km`;
    const hit = LABEL_VALUES[plain(text)];
    if (hit) return hit[lang === "ru" ? 1 : 0];
    return word("value", text, lang);
  }
  const langIndex = (lang) => (lang === "ru" ? 1 : 0);
  function word(kind, value, lang = "pl") {
    const table = kind === "type" ? DAMAGE_TYPES : VALUES;
    const hit = table[plain(value)];
    return hit ? hit[langIndex(lang)] : String(value ?? "");
  }
  const repairName = (group, lang = "pl") => REPAIR_NAMES[group]?.[langIndex(lang)] || "";
  // "Porte AVD" → "Drzwi · przód prawy"; unknown words stay as they are.
  function partName(element, lang = "pl") {
    const text = plain(element).replace(/\s*\([^)]*\)/g, "").trim();
    const part = PARTS.find(([fr]) => text === fr || text.startsWith(`${fr} `));
    if (!part) return "";
    const rest = text.slice(part[0].length).trim().split(/\s+/).filter(Boolean);
    const known = rest.map((token) => POSITIONS[token]?.[langIndex(lang)]);
    if (known.some((value) => value === undefined)) {
      const restText = rest.filter((token, at) => known[at] === undefined).join(" ");
      return [part[langIndex(lang) + 1], ...known.filter(Boolean), restText].filter(Boolean).join(" · ");
    }
    return [part[langIndex(lang) + 1], ...known.filter(Boolean)].join(" · ");
  }

  // ---- For the page and the brief -------------------------------------------------------------
  // Mileage a year (owner 2026-10-11: with "very little / very much").
  function mileagePerYear(report, today = new Date()) {
    const km = report?.car?.mileageKm;
    const from = report?.car?.firstRegistrationIso;
    if (!km || !from) return null;
    const until = report.inspection?.date ? new Date(report.inspection.date) : today;
    const years = (until - new Date(from)) / (365.25 * 24 * 3600 * 1000);
    if (!(years > 0.25)) return null;
    const perYear = Math.round(km / years / 100) * 100;
    return { perYear, years: Math.round(years * 10) / 10, flag: perYear < 8000 ? "low" : perYear > 30000 ? "high" : "" };
  }

  return {
    detectLink, detectPdf, fromHtml, fromPdf, mileagePerYear, repairGroup, plain, numberOf,
    word, repairName, partName, equipmentName, labelName, labelValue,
    // For tests and the server.
    parseHtml, textClean, joinFragments, LAYOUTS,
  };
});
