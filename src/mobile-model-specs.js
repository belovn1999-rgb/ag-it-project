// B61 stage 4 (PROJECT-MOBILE.md 4.8): the page-1 lists follow the real
// versions of the chosen model and years (data: src/model-specs/<brand>.js,
// one file per brand loaded when the brand is chosen, listed in
// src/model-specs/index.js; built by tools/build-model-specs.py).
// - Rok: years grouped under the model's generations (newest first, facelift
//   marked), other years below the divider (the line under the field that
//   named the generations is gone, owner 2026-10-04: the list says it).
// - Pojemność / Moc: engines that exist for model + years (+ fuel, + engine
//   size) on top in bold, the usual steps below the divider (owner 04.10).
// - Wersja: trim lines of the matching generations, sport versions and
//   editions; lines of other generations below the divider; free text stays.
// - Typ / Skrzynia / Napęd: choices that do not exist are dimmed, still
//   clickable; gearbox and drive only when every matching version's is known.
// - Nadwozie, Liczba drzwi, Liczba miejsc, Drzwi przesuwne (owner 2026-10-04):
//   the same for the bodies of the model's generations in the chosen years
//   ("bodies" of the table: types, doors, seats, sliding door).
// Models without data (and everything when no model is chosen) keep the
// lists exactly as before. Sub-models use their family: BMW "320" and
// Mercedes "C 220" also narrow the engines by the number in the version name.
(() => {
  const index = window.AUTOGOOD_MODEL_SPECS_INDEX?.brands || {};
  const models = {};
  const requested = new Set();
  // brand -> promise of its data being there (bodyTypes waits for it).
  const loading = {};

  // The brand's data arrives once, the first time the brand is chosen; the
  // lists are drawn again when it is there (until then they stay as before).
  function loadBrand(brand) {
    const entry = index[brand];
    if (!entry) return Promise.resolve(false);
    if (requested.has(brand)) return loading[brand] || Promise.resolve(true);
    requested.add(brand);
    loading[brand] = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = `./src/model-specs/${entry.file}?v=${entry.v}`;
      script.onload = () => {
        Object.assign(models, window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand] || {});
        refresh();
        if (typeof renderComboMenus === "function") renderComboMenus();
        // The analysis counts its "na gotowo" again (a mild hybrid's excise).
        window.dispatchEvent(new CustomEvent("autogood:model-specs", { detail: { brand } }));
        resolve(true);
      };
      script.onerror = () => {
        requested.delete(brand);
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return loading[brand];
  }

  // Before a Monitoring check counts its "na gotowo" prices: the brand's data
  // is in (a mild hybrid's excise), at most 10 s.
  function ready(rawBrand) {
    const brand = typeof canonicalBrand === "function" ? canonicalBrand(rawBrand) : String(rawBrand || "");
    if (!index[brand] || window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand]) return Promise.resolve(Boolean(index[brand]));
    return Promise.race([loadBrand(brand), new Promise((resolve) => setTimeout(() => resolve(false), 10000))]);
  }
  const TEXT = {
    pl: {
      lift: "lifting",
      lines: "Linie wyposażenia",
      sport: "Wersje sportowe",
      editions: "Edycje i pakiety",
      otherGenerations: "Inne pokolenia",
      unavailable: "Brak w tym modelu i latach",
      phase: { pre: "przed liftingiem", fl: "po liftingu", fl2: "po 2. liftingu", upd: "aktualizacja", all: "" },
    },
    ru: {
      lift: "рестайлинг",
      lines: "Линии комплектации",
      sport: "Спортивные версии",
      editions: "Спецсерии и пакеты",
      otherGenerations: "Другие поколения",
      unavailable: "Нет у этой модели в эти годы",
      phase: { pre: "дорестайлинг", fl: "рестайлинг", fl2: "2-й рестайлинг", upd: "обновление", all: "" },
    },
  };
  // Catalog sub-models -> [family model, token in the version name].
  const SUBMODELS = {
    Audi: {
      "A4 Allroad": ["A4"], "A6 Allroad": ["A6"], S3: ["A3", "s3"], RS3: ["A3", "rs3"], S4: ["A4", "s4"],
      RS4: ["A4", "rs4"], S5: ["A5", "s5"], RS5: ["A5", "rs5"], S6: ["A6", "s6"], RS6: ["A6", "rs6"],
      SQ5: ["Q5", "sq5"], SQ7: ["Q7", "sq7"], RSQ3: ["Q3", "rsq3"],
      S1: ["A1", "s1"], SQ2: ["Q2", "sq2"], S7: ["A7", "s7"], RS7: ["A7", "rs7"], S8: ["A8", "s8"],
      SQ8: ["Q8", "sq8"], RSQ8: ["Q8", "rsq8"], "TT RS": ["TT", "rs"], TTS: ["TT"], "Q4 e-tron": ["Q4"],
      "Q8 e-tron": ["Q8"], "SQ8 e-tron": ["Q8"], "RS e-tron GT": ["e-tron GT"], "SQ6 e-tron": ["Q6 e-tron"],
    },
    Ford: { "Grand C-Max": ["C-Max"], "Grand Tourneo": ["Tourneo Connect"], "Puma Gen-E": ["Puma"] },
    "Mercedes-Benz": {
      "CLA Shooting Brake": ["CLA"], "CLS Shooting Brake": ["CLS"], "B Electric Drive": ["B"], "AMG GT C": ["AMG GT"],
      "AMG GT R": ["AMG GT"], "AMG GT S": ["AMG GT"], "EQE SUV": ["EQE"], "EQS SUV": ["EQS"], eCitan: ["Citan"],
      eVito: ["Vito"], eSprinter: ["Sprinter"], EQT: ["T-Class"],
    },
    Peugeot: {
      "e-208": ["208"], "e-2008": ["2008"], "e-308": ["308"], "e-3008": ["3008"], "e-5008": ["5008"], "e-408": ["408"],
      "Bipper Tepee": ["Bipper"], "Partner Tepee": ["Partner"], "Expert Tepee": ["Expert"], "e-Rifter": ["Rifter"],
      "e-Traveller": ["Traveller"],
    },
    Renault: {
      "Grand Scenic": ["Scenic"], "Scenic E-TECH": ["Scenic"], "Grand Scenic E-Tech": ["Scenic"], "Grand Espace": ["Espace"],
      "Grand Kangoo": ["Kangoo"], "Kangoo E-TECH": ["Kangoo"], "Grand Kangoo E-TECH": ["Kangoo"], "Grand Modus": ["Modus"],
    },
    Toyota: { "Auris Touring Sports": ["Auris"], "Proace Verso Electric": ["Proace (Verso)"], "Prius+": ["Prius"] },
    Volkswagen: {
      "Golf Variant": ["Golf"], "Golf Plus": ["Golf"], "Golf Sportsvan": ["Golf"],
      "Passat Variant": ["Passat"], "Passat Alltrack": ["Passat"], "Tiguan Allspace": ["Tiguan"],
      "Caddy Maxi": ["Caddy"], "e-up!": ["up!"], "Passat CC": ["CC"],
    },
    Volvo: {
      "V40 Cross Country": ["V40"], "V60 Cross Country": ["V60"], "S60 Cross Country": ["S60"], "V90 Cross Country": ["V90"],
      EX40: ["XC40"], EC40: ["C40"],
    },
    // Stage 6 variant B (owner 2026-10-10).
    Kia: { "cee'd Sportswagon": ["cee'd / Ceed"], "Niro EV": ["Niro"] },
    Hyundai: { "H-1 Starex": ["H-1"], "KONA Elektro": ["KONA"] },
    Opel: {
      "Astra Electric": ["Astra"], "Combo Life": ["Combo"], "Combo Electric": ["Combo"], "Insignia CT": ["Insignia"],
      "Mokka X": ["Mokka"], "Mokka-e": ["Mokka"], "Zafira Tourer": ["Zafira"], "Zafira Life": ["Zafira"], "Zafira Electric": ["Zafira"],
    },
    Mazda: { "2 Hybrid": ["2"], "6e": ["6"] },
    Nissan: { "e-NV200": ["NV200"], "Qashqai+2": ["Qashqai"], NV300: ["Primastar"] },
    Citroen: {
      "ë-Berlingo": ["Berlingo"], "ë-C3": ["C3"], "ë-C3 Aircross": ["C3 Aircross"], "ë-C4": ["C4"], "ë-C4 X": ["C4 X"],
      "ë-Spacetourer": ["SpaceTourer"], "DS4 Crossback": ["DS4"],
    },
  };
  // Mercedes catalog models are "<class> <number>" (GLA 200, CLS 350): the class is the family.
  const MERCEDES_FAMILIES = ["CLA", "CLC", "CLE", "CLK", "CLS", "CL", "GLA", "GLB", "GLC", "GLE", "GLK", "GLS", "GL", "ML",
    "SLC", "SLK", "SL", "A", "B", "C", "E", "G", "R", "S", "V", "X"];

  const text = () => TEXT[state.lang] || TEXT.pl;
  const lower = (value) => String(value || "").trim().toLowerCase();
  const number = (value) => {
    const digits = String(value || "").replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  };
  const unique = (values) => [...new Set(values)];

  function findModel(brand, model) {
    const wanted = lower(model);
    const key = Object.keys(models).find((name) => name.startsWith(`${brand}|`) && lower(name.slice(brand.length + 1)) === wanted);
    return key || "";
  }

  // The family data of the chosen (sub-)model, or null.
  function family(brand, model) {
    if (!brand || !model) return null;
    loadBrand(brand);
    const direct = findModel(brand, model);
    if (direct) return { key: direct, token: "", mobile: direct === "Volkswagen|T6" ? "T6" : "" };
    const sub = Object.entries(SUBMODELS[brand] || {}).find(([name]) => lower(name) === lower(model));
    if (sub && findModel(brand, sub[1][0])) return { key: findModel(brand, sub[1][0]), token: sub[1][1] || "", mobile: "" };
    if (brand === "BMW") {
      // "218", "M240i", "620 Gran Turismo" -> series; "2er Gran Coupé" -> series; M2...M8; "X3 M40", "Z4 M40".
      const series = model.match(/^(m)?([1-8])(\d\d)/i);
      if (series && findModel("BMW", series[2])) {
        return { key: findModel("BMW", series[2]), token: `${series[1] ? "m" : ""}${series[2]}${series[3]}`, mobile: "" };
      }
      const er = model.match(/^([1-8])er\b/i);
      if (er && findModel("BMW", er[1])) return { key: findModel("BMW", er[1]), token: "", mobile: "" };
      const mModel = model.match(/^m([2-8])$/i);
      if (mModel && findModel("BMW", mModel[1])) return { key: findModel("BMW", mModel[1]), token: `m${mModel[1]}`, mobile: "" };
      const xModel = model.match(/^(x[1-7]|xm|z4)\b/i);
      if (xModel && findModel("BMW", xModel[1])) return { key: findModel("BMW", xModel[1]), token: "", mobile: "" };
    }
    if (brand === "Mercedes-Benz") {
      const match = model.match(/^([a-z]{1,3})\s?(\d{2,3})\b/i);
      const name = match && MERCEDES_FAMILIES.find((candidate) => candidate === match[1].toUpperCase());
      if (name && findModel(brand, name)) return { key: findModel(brand, name), token: match[2], mobile: "" };
    }
    if (brand === "Volkswagen") {
      const transporter = model.match(/^(T[567])\b/i);
      if (transporter && findModel(brand, "T6")) return { key: findModel(brand, "T6"), token: "", mobile: transporter[1].toUpperCase() };
    }
    return null;
  }

  function selection() {
    const brand = typeof canonicalBrand === "function" ? canonicalBrand(els.brand?.value) : "";
    const found = family(brand, String(els.model?.value || "").trim());
    if (!found) return null;
    const spec = models[found.key];
    const maxYear = new Date().getFullYear() + 1;
    const yearFrom = number(els.yearFrom?.value);
    const yearTo = number(els.yearTo?.value);
    const overlaps = (from, to) => (from || 0) <= (yearTo || 9999) && (to || maxYear) >= (yearFrom || 0);
    const gens = spec.gens.map((gen, index) => ({ index, code: gen[0], phase: gen[1], from: gen[2], to: gen[3], mobile: gen[4], lift: gen[5] }))
      .filter((gen) => !found.mobile || gen.mobile === found.mobile);
    const genIndexes = new Set(gens.filter((gen) => overlaps(gen.from, gen.to)).map((gen) => gen.index));
    const allIndexes = new Set(gens.map((gen) => gen.index));
    let versions = spec.versions.filter((row) => allIndexes.has(row[0]));
    if (found.token) {
      const narrowed = versions.filter((row) => row[8] === found.token);
      if (narrowed.length) versions = narrowed;
    }
    return {
      spec, found, gens, maxYear, yearFrom, yearTo, overlaps,
      versions: versions.filter((row) => genIndexes.has(row[0])),
      hasYears: Boolean(yearFrom || yearTo),
    };
  }

  // A mild hybrid is petrol / diesel here, as on every portal (owner 2026-10-11): "Hybryda"
  // means a full hybrid, so the lists and the portal counts stay as they were.
  function fuelMatches(row, fuels) {
    return !fuels.length || fuels.includes(row[1]);
  }

  function filtered(sel, { fuel = true, size = true, power = true } = {}) {
    const fuels = els.fuels.filter((input) => input.checked).map((input) => input.value);
    const ccFrom = number(els.displacementFrom?.value);
    const ccTo = number(els.displacementTo?.value);
    const kw = els.powerUnit?.value === "kw";
    const powerFrom = number(els.powerFrom?.value);
    const powerTo = number(els.powerTo?.value);
    return sel.versions.filter((row) => (!fuel || fuelMatches(row, fuels))
      && (!size || ((!ccFrom || row[2] >= ccFrom) && (!ccTo || row[2] <= ccTo)))
      && (!power || ((!powerFrom || (kw ? row[4] : row[3]) >= powerFrom) && (!powerTo || (kw ? row[4] : row[3]) <= powerTo))));
  }

  function genLabel(gen) {
    const t = text();
    const years = `${gen.from}–${gen.to || ""}`;
    const phase = t.phase[gen.phase] || (gen.lift ? `${t.lift} ${gen.lift}` : "");
    return [gen.code, years, phase].filter(Boolean).join(" · ");
  }

  // Existing values on top (bold), the usual list below the divider; note:
  // a second, smaller line (mild hybrids).
  function topThenRest(base, values, label, note = () => "") {
    if (!values.length) return base;
    const wanted = new Set(values.map(String));
    return [
      ...values.map((value) => ({ value: String(value), label: label(value), note: note(value), isPopular: true })),
      ...base.filter((option) => !wanted.has(String(option.value))),
    ];
  }

  function yearOptions(sel, base) {
    const out = [];
    const used = new Set();
    sel.gens.forEach((gen) => {
      const group = genLabel(gen);
      base.forEach((option) => {
        const year = Number(option.value);
        if (year >= gen.from && year <= (gen.to || sel.maxYear)) {
          out.push({ value: option.value, label: option.label, group, isPopular: true });
          used.add(option.value);
        }
      });
    });
    return out.length ? [...out, ...base.filter((option) => !used.has(option.value))] : base;
  }

  function sizeOptions(sel, base, fromValue) {
    const sizes = unique(filtered(sel, { size: false, power: false }).map((row) => row[2]).filter(Boolean)).sort((a, b) => a - b)
      .filter((value) => fromValue === undefined || isAllowedRangeEndValue(String(value), fromValue, true));
    const rows = filtered(sel, { size: false, power: false });
    return topThenRest(base, sizes, (value) => `${value} ccm (${(value / 1000).toFixed(1)})`, (value) => mildMark(sel, rows.filter((row) => row[2] === value), false));
  }

  function powerOptions(sel, base, fromValue) {
    const kw = els.powerUnit?.value === "kw";
    const rows = filtered(sel, { power: false });
    const powers = unique(rows.map((row) => (kw ? row[4] : row[3])).filter(Boolean)).sort((a, b) => a - b)
      .filter((value) => fromValue === undefined || isAllowedRangeEndValue(String(value), fromValue, true));
    return topThenRest(base, powers, (value) => `${value} ${kw ? "kW" : "KM"}`, (value) => mildMark(sel, rows.filter((row) => (kw ? row[4] : row[3]) === value), true));
  }

  // Mild hybrids (B61, owner 2026-10-10): versions[7] = the year the version
  // got its mild hybrid (12/24/48 V; docs/MODEL-MILD-HYBRIDS.md), 0 = none,
  // negative = the same engine was also sold without it (the ad decides).
  // Its excise is the hybrid's (1.55 % up to 2000 cm³, 9.3 % above; owner
  // rule "any hybrid"), and the ads rarely say it.
  const sinceOf = (row) => Math.abs(row[7] || 0);
  const mildIn = (sel, row) => Boolean(row[7]) && (!sel.yearTo || sinceOf(row) <= sel.yearTo);

  // "MHEV od 2020" under a power (or engine size) in the lists; with
  // partly: "część MHEV od 2020" when only some versions of it are (or the
  // engine was also sold without it).
  function mildMark(sel, rows, partly) {
    const mild = rows.filter((row) => mildIn(sel, row));
    const some = mild.length < rows.length || mild.some((row) => row[7] < 0);
    if (!mild.length || (!partly && some)) return "";
    const since = Math.min(...mild.map(sinceOf));
    return state.lang === "ru"
      ? `${some ? "часть " : ""}MHEV с ${since}`
      : `${some ? "część " : ""}MHEV od ${since}`;
  }

  function powerOf(value) {
    const text = String(value || "");
    const hp = text.match(/(\d{2,4})\s*(?:PS|KM|hk|hp|ch|pk|cv|л\.?\s?с)/i);
    const kw = text.match(/(\d{2,4})\s*kW/i);
    const plain = !hp && !kw && text.match(/^\s*(\d{2,4})\s*$/);
    return { hp: hp ? Number(hp[1]) : plain ? Number(plain[1]) : 0, kw: kw ? Number(kw[1]) : 0 };
  }

  function gearboxOf(value) {
    const text = lower(value);
    if (/manu|schalt|handgesch|механ/.test(text)) return "m";
    if (/auto|dsg|tronic|cvt|dct|автомат|робот|вариатор/.test(text)) return "a";
    return text === "manual" ? "m" : "";
  }

  // Is this car a mild hybrid by our table? { status: "yes" (every version it
  // can be is one in its year) | "maybe" (some are), since } or null (none,
  // or the model is not in the table / its brand file not loaded yet).
  // car: brand, model, year, power ("110 kW (150 PS)"), displacementCcm,
  // fuel, gearbox — what the ad says; the search filters fill the gaps.
  // Each step narrows the versions only when something is left.
  function mildHybridFor(car = {}, filters = {}) {
    const rawBrand = car.brand || filters.brand;
    const brand = typeof canonicalBrand === "function" ? canonicalBrand(rawBrand) : String(rawBrand || "");
    const found = family(brand, String(car.model || filters.model || "").trim());
    const spec = found && models[found.key];
    if (!spec) return null;
    const year = Number(String(car.year || "").match(/(?:19|20)\d{2}/)?.[0]) || 0;
    const yearFrom = year || number(filters.yearFrom) || 0;
    const yearTo = year || number(filters.yearTo) || 0;
    const gens = new Set(spec.gens.map((gen, index) => ({ index, from: gen[2], to: gen[3], mobile: gen[4] }))
      .filter((gen) => (!found.mobile || gen.mobile === found.mobile) && (gen.from || 0) <= (yearTo || 9999) && (gen.to || 9999) >= (yearFrom || 0))
      .map((gen) => gen.index));
    let rows = spec.versions.filter((row) => gens.has(row[0]));
    const narrow = (test) => {
      const left = rows.filter(test);
      if (left.length) rows = left;
    };
    if (found.token) narrow((row) => row[8] === found.token);
    const fuelText = lower(car.fuel);
    if (/electr|elektr|plug/.test(fuelText)) return null;
    const fuel = /diesel/.test(fuelText) ? "diesel" : /benzin|petrol|benzyna|bensin|essence|gasoline|бензин/.test(fuelText) ? "petrol" : "";
    const fuels = fuel ? [fuel] : (filters.fuels || []).map((value) => String(value).replace(/^hybrid_/, "")).filter((value) => ["diesel", "petrol"].includes(value));
    if (fuels.length) narrow((row) => fuels.includes(row[1]));
    const ccm = Number(car.displacementCcm) || 0;
    const ccFrom = number(filters.displacementFrom);
    const ccTo = number(filters.displacementTo);
    if (ccm) narrow((row) => Math.abs(row[2] - ccm) <= 60);
    else if (ccFrom || ccTo) narrow((row) => (!ccFrom || row[2] >= ccFrom) && (!ccTo || row[2] <= ccTo));
    const power = powerOf(car.power);
    // The search keeps its power in KM whatever unit the form shows (mobile.js readManualFields).
    const powerFrom = number(filters.powerFrom);
    const powerTo = number(filters.powerTo);
    if (power.hp || power.kw) narrow((row) => (power.hp && Math.abs(row[3] - power.hp) <= 3) || (power.kw && Math.abs(row[4] - power.kw) <= 2));
    else if (powerFrom || powerTo) narrow((row) => (!powerFrom || row[3] >= powerFrom - 2) && (!powerTo || row[3] <= powerTo + 2));
    const gearbox = gearboxOf(car.gearbox) || ({ automatic: "a", manual: "m" })[filters.gearbox] || "";
    if (gearbox) narrow((row) => row[5] === gearbox);
    if (!rows.length) return null;
    const mild = rows.filter((row) => row[7] > 0 && row[7] <= (yearFrom || row[7]));
    const anyMild = rows.filter((row) => row[7] && sinceOf(row) <= (yearTo || 9999));
    if (!anyMild.length) return null;
    return { status: mild.length === rows.length ? "yes" : "maybe", since: Math.min(...anyMild.map(sinceOf)) };
  }

  function versionOptions(sel) {
    const t = text();
    const matching = sel.spec.trims.filter((trim) => !sel.hasYears || sel.overlaps(trim[0], trim[1]));
    const other = sel.spec.trims.filter((trim) => !matching.includes(trim));
    const taken = new Set();
    const pick = (list, index) => unique(list.flatMap((trim) => trim[index])).filter((name) => {
      if (taken.has(name)) return false;
      taken.add(name);
      return true;
    });
    const block = (names, group, isPopular) => names.map((name) => ({ value: name, label: name, group, isPopular }));
    return [
      ...block(pick(matching, 2), t.lines, true),
      ...block(pick(matching, 3), t.sport, true),
      ...block(pick(matching, 4), t.editions, true),
      ...block([...pick(other, 2), ...pick(other, 3)], t.otherGenerations, false),
    ];
  }

  function enhance(sets) {
    if (!hasForm()) return sets;
    const sel = selection();
    if (!sel) return { ...sets, version: [] };
    return {
      ...sets,
      year: yearOptions(sel, sets.year),
      yearTo: yearOptions(sel, sets.yearTo),
      displacement: sizeOptions(sel, sets.displacement),
      displacementTo: sizeOptions(sel, sets.displacementTo, els.displacementFrom?.value),
      power: powerOptions(sel, sets.power),
      powerTo: powerOptions(sel, sets.powerTo, els.powerFrom?.value),
      version: versionOptions(sel),
    };
  }

  function dim(inputs, available) {
    const t = text();
    inputs.forEach((input) => {
      const label = input.closest(".mobileChoiceOption");
      if (!label) return;
      const off = Boolean(available) && input.value !== "any" && input.value !== "" && !available.has(input.value);
      label.classList.toggle("isSpecUnavailable", off);
      if (off) label.title = t.unavailable;
      else if (label.title === TEXT.pl.unavailable || label.title === TEXT.ru.unavailable) label.removeAttribute("title");
    });
  }

  // The bodies of the model's generations in the chosen years (all its
  // generations without years): [types[], doors from, to, seats from, to, sliding].
  function bodiesOf(sel) {
    const indexes = new Set(sel.gens.filter((gen) => !sel.hasYears || sel.overlaps(gen.from, gen.to)).map((gen) => gen.index));
    return (sel.spec.bodies || []).filter((body) => indexes.has(body[0])).map((body) => body.slice(1));
  }

  // Values of a page-1 list (doors, seats, sliding door) no body of the model
  // has: dimmed in the list (mobile.js asks while drawing it).
  function unavailableOptions(setName) {
    if (!hasForm()) return null;
    const sel = selection();
    const bodies = sel ? bodiesOf(sel) : [];
    if (!bodies.length) return null;
    if (setName === "doorsGroup") {
      const groups = { "2-3": [2, 3], "4-5": [4, 5], "6-7": [6, 7] };
      return new Set(Object.keys(groups).filter((key) => !bodies.some((body) => body[1] <= groups[key][1] && body[2] >= groups[key][0])));
    }
    if (setName === "slidingDoor") return bodies.some((body) => body[5]) ? null : new Set(["right", "left", "both"]);
    const most = Math.max(...bodies.map((body) => body[4]));
    const least = Math.min(...bodies.map((body) => body[3]));
    if (setName === "seats") return new Set(Array.from({ length: 9 }, (_, index) => String(index + 1)).filter((value) => Number(value) > most));
    if (setName === "seatsTo") return new Set(Array.from({ length: 9 }, (_, index) => String(index + 1)).filter((value) => Number(value) < least));
    return null;
  }
  window.AUTOGOOD_COMBO_UNAVAILABLE = unavailableOptions;

  // Pages without the page-1 form (oferty.html) use only mildHybridFor() / ready().
  const hasForm = () => typeof els !== "undefined" && Boolean(els?.brand);

  function refresh() {
    if (!hasForm()) return;
    const sel = selection();
    const bodyInputs = Array.from(document.querySelectorAll("[data-mobile-body-choice]"));
    if (!sel) {
      dim(els.fuels, null);
      dim(els.gearbox, null);
      dim(els.drive, null);
      dim(bodyInputs, null);
      mildHint(null, []);
      return;
    }
    const bodies = bodiesOf(sel);
    // A body whose type the data does not know dims nothing (stage 6 models from autocentrum).
    const typesKnown = bodies.length && bodies.every((body) => body[0].length);
    dim(bodyInputs, typesKnown ? new Set(bodies.flatMap((body) => body[0])) : null);
    const fuelRows = filtered(sel, { fuel: false, size: false, power: false });
    const fuels = new Set();
    fuelRows.forEach((row) => {
      fuels.add(row[1]);
    });
    dim(els.fuels, fuelRows.length ? fuels : null);
    const rows = filtered(sel);
    const gearboxKnown = rows.length && rows.every((row) => row[5]);
    dim(els.gearbox, gearboxKnown ? new Set(rows.map((row) => (row[5] === "m" ? "manual" : "automatic"))) : null);
    // The drive too only when every matching version's drive is known.
    const driveKnown = rows.length && rows.every((row) => row[6]);
    dim(els.drive, driveKnown ? new Set(rows.map((row) => ({ f: "fwd", r: "rwd", 4: "awd" })[row[6]])) : null);
    mildHint(sel, rows);
  }

  // Under "Moc": the mild hybrids among the matching engines and what to tell
  // the client (owner 2026-10-10: "чтобы я сразу понимал что нужно сказать клиенту").
  function mildHint(sel, rows) {
    const box = document.querySelector("[data-mobile-mild-hint]");
    if (!box) return;
    const mild = sel ? rows.filter((row) => mildIn(sel, row)) : [];
    box.hidden = !mild.length;
    if (!mild.length) {
      box.innerHTML = "";
      return;
    }
    const ru = state.lang === "ru";
    const fuelName = { diesel: "diesel", petrol: ru ? "бензин" : "benzyna" };
    const engines = new Map();
    mild.forEach((row) => {
      // The gearbox only when the same engine also comes without the mild hybrid (eTSI DSG / TSI manual).
      const twin = rows.some((other) => !mildIn(sel, other) && other[1] === row[1] && other[2] === row[2] && Math.abs(other[3] - row[3]) <= 3);
      const gear = twin && row[5] ? (row[5] === "a" ? (ru ? " АКПП" : " automat") : (ru ? " МКПП" : " manual")) : "";
      const name = `${(row[2] / 1000).toFixed(1)} ${fuelName[row[1]] || row[1]} ${row[3]} ${ru ? "л.с." : "KM"}${gear}`;
      const since = Math.min(sinceOf(row), engines.get(name)?.since || 9999);
      engines.set(name, { name, since, fuel: row[1], hp: row[3], optional: row[7] < 0 || engines.get(name)?.optional });
    });
    const list = [...engines.values()].sort((a, b) => a.fuel.localeCompare(b.fuel) || a.hp - b.hp);
    const either = ru ? " (бывает и без него)" : " (bywa też bez)";
    const shown = list.slice(0, 10).map((item) => `${item.name} ${ru ? "с" : "od"} ${item.since}${item.optional ? either : ""}`);
    if (list.length > 10) shown.push(`+${list.length - 10}`);
    const others = mild.length < rows.length || list.some((item) => item.optional);
    const html = ru
      ? `<b>Мягкий гибрид (MHEV)</b> — клиенту: акциз как у гибрида, 1,55 % (до 2000 см³) / 9,3 % (больше) вместо 3,1 % / 18,6 %.<br>${others ? "Двигатели" : "Все двигатели"}: ${shown.join(", ")}.${others ? " Остальные — обычный акциз." : ""}<br><small>В объявлении это часто не написано — сверяйте мощность и год.</small>`
      : `<b>Miękka hybryda (MHEV)</b> — dla klienta: akcyza jak hybryda, 1,55 % (do 2000 cm³) / 9,3 % (powyżej) zamiast 3,1 % / 18,6 %.<br>${others ? "Silniki" : "Wszystkie silniki"}: ${shown.join(", ")}.${others ? " Pozostałe — zwykła akcyza." : ""}<br><small>Ogłoszenie często tego nie podaje — sprawdź moc i rok.</small>`;
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  document.addEventListener("input", () => refresh());
  document.addEventListener("change", () => refresh());
  // The body chips are drawn again (language, a restored search): dim again.
  const bodyBox = document.querySelector("[data-mobile-body-choices]");
  if (bodyBox) new MutationObserver(() => refresh()).observe(bodyBox, { childList: true });

  // The body types of a model's generations in a year (all its generations
  // without a year): a Set of form values ("hatchback", "limousine"…), or
  // null when the table does not know the model. Waits for the brand's data.
  async function bodyTypes(brand, model, year) {
    if (!brand || !model) return null;
    await loadBrand(brand);
    const found = family(brand, String(model).trim());
    if (!found) return null;
    const spec = models[found.key];
    const maxYear = new Date().getFullYear() + 1;
    const wanted = Number(year) || 0;
    const gens = spec.gens.map((gen, index) => ({ index, from: gen[2], to: gen[3], mobile: gen[4] }))
      .filter((gen) => !found.mobile || gen.mobile === found.mobile);
    const inYear = gens.filter((gen) => !wanted || ((gen.from || 0) <= wanted && (gen.to || maxYear) >= wanted));
    const indexes = new Set((inYear.length ? inYear : gens).map((gen) => gen.index));
    const types = (spec.bodies || []).filter((body) => indexes.has(body[0])).flatMap((body) => body[1]);
    return types.length ? new Set(types) : null;
  }

  window.AUTOGOOD_MODEL_SPECS_UI = { enhance, refresh, family, bodyTypes, mildHybridFor, ready };
})();
