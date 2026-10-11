/* AUTOGOOD — the assessment of an auction report read by
 * src/auction-report.js (owner 2026-10-11, the expert's rules in
 * docs/PROJECT-AUCTION-REPORTS.md §9): every damage gets a category
 * (kosmetyczne / użytkowe / konstrukcyjne), a degree (lekkie / średnie /
 * poważne) and a range of the repair's cost in Poland; the report gets a
 * verdict (Auto OK / wymaga uwagi / ryzykowne / nie polecane) with one or two
 * reasons, and its risks. Only what the report says; never the original
 * registration paper, never the paint thickness (owner 2026-10-11, §3).
 *
 * The ranges are first figures (owner: "пока оставим", HYPOTHESIS until the
 * owner approves the table): an independent Polish workshop, parts new or
 * used as usual, without VAT questions. No browser objects: a server uses
 * the same file later.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AUTOGOOD_AUCTION_ASSESS = api;
})(typeof self !== "undefined" ? self : this, () => {
  const plain = (value) => String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  // ---- What a part is ---------------------------------------------------------------------
  const KINDS = [
    ["structure", /^(montant de toit|montant|longeron|bas de caisse|plancher|traverse|passage de roue|tablier|doublure)/],
    ["warning", /^voyant/],
    ["tyre", /^pneu\b/],
    ["rim", /^jante/],
    ["hubcap", /^enjoliveur/],
    ["glass", /^(pare-brise|vitre|lunette)/],
    ["lamp", /^(phare|feu|optique|antibrouillard)/],
    ["key", /^(clef|cle )/],
    ["kit", /^(compresseur|kit reparation)/],
    ["cargo", /^cache bagages/],
    ["hail", /^(pavillon|toit)\b/],
    ["bumper", /^pare-chocs/],
    ["door", /^porte\b/],
    ["fender", /^aile\b/],
    ["bonnet", /^capot/],
    ["tailgate", /^coffre|^hayon/],
    ["grille", /^(calandre|grille de pare-chocs|grille|obturateur)/],
    ["spoiler", /^(spoiler|jupe|becquet)/],
    ["moulding", /^(moulure|baguette|joint)/],
    ["mirror", /^(boitier retroviseur|retroviseur)/],
    ["handle", /^poignee/],
    ["wheelArch", /^(protect\. pass\. roue|garn pass roue|elargisseur)/],
    ["steering", /^volant/],
    ["seat", /^(revetement|siege|protect\. dossier)/],
    ["trim", /^(garn|garnit|garniture|tableau de bord|couvercle boite|ciel de toit|console|tapis|accoudoir|interieur|grille vent)/],
    ["body", /^carrosserie/],
  ];
  const kindOf = (element) => KINDS.find(([, test]) => test.test(plain(element)))?.[0] || "other";
  const OUTSIDE = new Set(["bumper", "door", "fender", "bonnet", "tailgate", "grille", "spoiler", "moulding", "mirror", "handle", "wheelArch", "body", "hail", "structure"]);

  // ---- Ranges in zł (HYPOTHESIS, briefs of 2026-10-11) ------------------------------------
  // [kind, repair group] → [min, max]; "*" for any group.
  const COSTS = {
    bumper: { replace_paint: [1500, 3500], repair_paint: [800, 1300], paint: [500, 800], replace: [700, 1800], smart: [200, 500], pdr: [250, 500], polish: [100, 250] },
    door: { replace_paint: [2500, 4500], repair_paint: [700, 1100], paint: [500, 800], pdr: [250, 500], smart: [200, 500], polish: [100, 250] },
    fender: { replace_paint: [1200, 2400], repair_paint: [700, 1100], paint: [500, 800], pdr: [250, 500], smart: [200, 500], polish: [100, 250] },
    bonnet: { replace_paint: [2000, 4000], repair_paint: [900, 1500], paint: [700, 1000], pdr: [300, 600], polish: [100, 250] },
    tailgate: { replace_paint: [2500, 5000], repair_paint: [900, 1500], paint: [700, 1000], pdr: [300, 600], polish: [100, 250] },
    grille: { replace_paint: [800, 2500], replace: [300, 900], refit: [50, 150], repair_paint: [400, 800] },
    spoiler: { replace_paint: [600, 1500], replace: [400, 1200], repair_paint: [400, 800], smart: [200, 500], paint: [300, 600] },
    moulding: { replace_paint: [300, 700], replace: [150, 500], paint: [150, 350], polish: [50, 150], refit: [50, 150] },
    mirror: { replace_paint: [400, 900], replace: [300, 800], paint: [200, 400], polish: [50, 150] },
    handle: { replace: [150, 400], paint: [100, 250], polish: [50, 150] },
    wheelArch: { replace: [150, 400], flat: [100, 300], refit: [50, 150] },
    hail: { hail: [1500, 4000], "*": [1500, 4000] },
    structure: { "*": [1500, 5000] },
    body: { "*": [300, 1500] },
    rim: { replace: [700, 2000], flat: [200, 400], repair: [200, 400], "*": [150, 350] },
    hubcap: { "*": [50, 150] },
    glass: { glass: [100, 250], replace: [1200, 3500], "*": [100, 250] },
    lamp: { replace: [800, 3000], "*": [300, 1200] },
    key: { "*": [300, 1200] },
    kit: { "*": [150, 350] },
    cargo: { replace: [400, 900], "*": [300, 800] },
    steering: { "*": [300, 700] },
    seat: { clean: [100, 250], "*": [150, 400] },
    trim: { clean: [100, 250], replace: [200, 600], "*": [150, 400] },
    warning: { "*": [150, 300] },
    other: { replace_paint: [800, 2500], repair_paint: [600, 1100], paint: [400, 800], replace: [200, 800], pdr: [250, 500], smart: [200, 500], polish: [100, 250], clean: [100, 250], flat: [150, 400], refit: [50, 150], glass: [100, 250], hail: [1500, 4000], check: [150, 300] },
  };
  // A tyre by its rim size (one tyre).
  function tyreCost(size) {
    const rim = Number(String(size || "").match(/R\s?(\d{2})/i)?.[1] || String(size || "").match(/\/(\d{2})\//)?.[1] || 0);
    if (rim >= 20) return [600, 1000];
    if (rim >= 19) return [500, 900];
    if (rim >= 17) return [400, 700];
    if (rim) return [250, 450];
    return [300, 800];
  }

  // ---- One damage ---------------------------------------------------------------------------
  // → { kind, category, degree, cost: [min, max] | null, flags: [] }
  function assessDamage(damage, report = {}) {
    const kind = kindOf(damage.element);
    const group = damage.group || "other";
    const type = plain(damage.type);
    const flags = [];
    if (/mauvaise reparation/.test(type)) flags.push("badRepair");
    if (/^repare$/.test(type)) flags.push("repaired");
    if (/grele/.test(type) || group === "hail") flags.push("hail");
    if (kind === "warning") flags.push("warning");
    // No repair in the report: a trace only (one line "Drobne ślady bez naprawy").
    // A dent in the structure (a pillar, a sill) is never a mere trace, even without a repair.
    const structural = kind === "structure" && /bosse|deforme|casse|fissure|rouille|impact/.test(type);
    if (group === "none" && !flags.length && !structural) return { kind, category: "kosmetyczne", degree: "lekkie", cost: null, flags, minor: true };
    let category = "kosmetyczne";
    if (["tyre", "glass", "lamp", "key", "kit", "warning", "steering"].includes(kind)) category = "użytkowe";
    if (structural) category = "konstrukcyjne";
    let degree = "lekkie";
    if (["replace_paint", "repair_paint", "hail"].includes(group) || flags.includes("badRepair")) degree = "średnie";
    if (kind === "tyre" && /usee?|hors tolerance|dechirure|crevaison/.test(type)) degree = "średnie";
    if (kind === "warning" || (kind === "glass" && group === "replace")) degree = "średnie";
    if (category === "konstrukcyjne") degree = group === "none" ? "średnie" : "poważne";
    if (["bumper", "bonnet", "tailgate"].includes(kind) && group === "replace_paint") degree = "średnie";
    let cost;
    if (group === "none") cost = null;
    else if (kind === "tyre") {
      const position = String(damage.element).match(/\b(AVG|AVD|ARG|ARD)\b/)?.[1];
      const tyre = (report.tyres || []).find((item) => item.position === position) || (report.tyres || [])[0];
      cost = tyreCost(tyre?.size || tyre?.sizeShort);
    } else {
      const table = COSTS[kind] || COSTS.other;
      cost = table[group] || table["*"] || COSTS.other[group] || [150, 400];
    }
    return { kind, category, degree, cost: cost ? [...cost] : null, flags, outside: OUTSIDE.has(kind) };
  }

  // ---- The whole report -----------------------------------------------------------------------
  const round = (value) => Math.round(value / 50) * 50;
  function assess(report, today = new Date()) {
    const damages = (report?.damages || []).map((damage) => ({ ...damage, assessment: assessDamage(damage, report) }));
    const rows = damages.filter((damage) => !damage.assessment.minor);
    const minor = damages.filter((damage) => damage.assessment.minor);
    const total = rows.reduce((sum, damage) => {
      const cost = damage.assessment.cost;
      return cost ? [sum[0] + cost[0], sum[1] + cost[1]] : sum;
    }, [0, 0]).map(round);
    const has = (flag) => rows.some((damage) => damage.assessment.flags.includes(flag));
    const count = (test) => rows.filter(test).length;
    const replaced = count((damage) => damage.group === "replace_paint" && damage.assessment.outside);
    const painted = count((damage) => ["replace_paint", "repair_paint", "paint"].includes(damage.group) && damage.assessment.outside);
    const structural = count((damage) => damage.assessment.category === "konstrukcyjne");
    const serious = count((damage) => damage.assessment.degree === "poważne");
    const tyres = (report?.tyres || []).filter((tyre) => typeof tyre.depth === "number");
    const lowTyres = tyres.filter((tyre) => tyre.depth < 4);
    const tyreDamages = count((damage) => damage.assessment.kind === "tyre");
    const state = report?.state || {};
    const no = (value) => /^non$/i.test(String(value || "").trim());
    const notRunning = no(state.engineRuns) || no(state.driveable);
    const keys = report?.keys?.keys;
    const car = report?.car || {};
    const fuel = plain(car.fuel);
    const version = plain(`${car.version || ""} ${car.versionDetails || ""}`);
    const electric = /electrique|hybride rechargeable|phev|plug-in|e-tense|tesla/.test(`${fuel} ${version} ${plain(report?.title)}`);
    const mileage = perYear(report, today);
    const serviceKnown = (report?.documents || []).some((item) => /entretien/i.test(item.label));

    // Verdict (owner 2026-10-11: auto OK / wymaga uwagi / ryzykowne / nie polecane + 1–2 reasons).
    const reasons = [];
    let level = "ok";
    const raise = (next, reason) => {
      const order = ["ok", "check", "risky", "no"];
      if (order.indexOf(next) > order.indexOf(level)) level = next;
      if (reason) reasons.push({ level: next, ...reason });
    };
    if (notRunning) raise("no", { key: "notRunning" });
    if (serious || structural) raise(serious ? "no" : "risky", { key: "structure", n: structural || serious });
    if (replaced >= 2) raise("risky", { key: "impacts", n: replaced });
    else if (replaced === 1) raise("check", { key: "impact", n: 1 });
    if (has("warning")) raise(replaced ? "risky" : "check", { key: "warning" });
    if (has("badRepair")) raise("check", { key: "badRepair", n: count((damage) => damage.assessment.flags.includes("badRepair")) });
    if (has("repaired")) raise("check", { key: "repaired", n: count((damage) => damage.assessment.flags.includes("repaired")) });
    if (has("hail")) raise("check", { key: "hail" });
    if (total[1] > 15000) raise("risky", { key: "costHigh", min: total[0], max: total[1] });
    else if (painted >= 3 || total[1] > 6000) raise("check", { key: "costMid", n: painted, min: total[0], max: total[1] });
    if (level === "ok") {
      if (!painted && !replaced) reasons.push({ level: "ok", key: "bodyClean", n: rows.length });
      else reasons.push({ level: "ok", key: "bodyLight", n: painted });
      if (keys >= 2 && !notRunning) reasons.push({ level: "ok", key: "keysRunning", n: keys });
    }
    reasons.sort((a, b) => ["no", "risky", "check", "ok"].indexOf(a.level) - ["no", "risky", "check", "ok"].indexOf(b.level));

    // Risks (only in the last block): what can cost money later.
    const risks = [];
    if (has("warning")) risks.push({ key: "warning" });
    if (lowTyres.length && !tyreDamages) risks.push({ key: "tyresLow", depths: lowTyres.map((tyre) => tyre.depth), cost: tyreCostFor(lowTyres) });
    if (keys === 1) risks.push({ key: "oneKey" });
    if (mileage?.flag === "high") risks.push({ key: "mileageHigh", perYear: mileage.perYear });
    if (electric) risks.push({ key: "battery" });
    if (has("hail")) risks.push({ key: "hail" });
    if (has("badRepair") || has("repaired")) risks.push({ key: "pastRepair" });
    if (replaced) risks.push({ key: "hiddenDamage" });
    if (!serviceKnown) risks.push({ key: "serviceUnknown" });
    return { damages, rows, minor, total, level, reasons: reasons.slice(0, 2), risks: risks.slice(0, 4), counts: { replaced, painted, structural, rows: rows.length, minor: minor.length }, mileage, electric };
  }
  function tyreCostFor(tyres) {
    return tyres.reduce((sum, tyre) => {
      const cost = tyreCost(tyre.size || tyre.sizeShort);
      return [sum[0] + cost[0], sum[1] + cost[1]];
    }, [0, 0]).map(round);
  }
  function perYear(report, today) {
    const km = report?.car?.mileageKm;
    const from = report?.car?.firstRegistrationIso;
    if (!km || !from) return null;
    const until = report.inspection?.date ? new Date(report.inspection.date) : today;
    const years = (until - new Date(from)) / (365.25 * 24 * 3600 * 1000);
    if (!(years > 0.25)) return null;
    const value = Math.round(km / years / 1000) * 1000;
    return { perYear: value, flag: value < 8000 ? "low" : value > 30000 ? "high" : "" };
  }

  return { assess, assessDamage, kindOf, tyreCost };
});
