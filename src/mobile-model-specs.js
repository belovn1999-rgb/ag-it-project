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
//   clickable; the gearbox only when every matching version's gearbox is known.
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

  // The brand's data arrives once, the first time the brand is chosen; the
  // lists are drawn again when it is there (until then they stay as before).
  function loadBrand(brand) {
    const entry = index[brand];
    if (!entry || requested.has(brand)) return;
    requested.add(brand);
    const script = document.createElement("script");
    script.src = `./src/model-specs/${entry.file}?v=${entry.v}`;
    script.onload = () => {
      Object.assign(models, window.AUTOGOOD_MODEL_SPECS_LOADED?.[brand] || {});
      refresh();
      if (typeof renderComboMenus === "function") renderComboMenus();
    };
    script.onerror = () => requested.delete(brand);
    document.head.appendChild(script);
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
    },
    Ford: { "Grand C-Max": ["C-Max"] },
    Peugeot: { "e-208": ["208"], "e-2008": ["2008"], "e-308": ["308"], "e-3008": ["3008"], "e-5008": ["5008"] },
    Renault: { "Grand Scenic": ["Scenic"], "Scenic E-TECH": ["Scenic"], "Grand Scenic E-Tech": ["Scenic"] },
    Toyota: { "Auris Touring Sports": ["Auris"] },
    Volkswagen: {
      "Golf Variant": ["Golf"], "Golf Plus": ["Golf"], "Golf Sportsvan": ["Golf"],
      "Passat Variant": ["Passat"], "Passat Alltrack": ["Passat"], "Tiguan Allspace": ["Tiguan"],
    },
    Volvo: { "V40 Cross Country": ["V40"], "V60 Cross Country": ["V60"], "S60 Cross Country": ["S60"] },
  };
  const MERCEDES_FAMILIES = ["CLA", "GLC", "GLE", "A", "C", "E", "S"];

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
      const series = model.match(/^(m)?([1345])(\d\d)/i);
      if (series && findModel("BMW", series[2])) {
        return { key: findModel("BMW", series[2]), token: `${series[1] ? "m" : ""}${series[2]}${series[3]}`, mobile: "" };
      }
      const mModel = model.match(/^m([34])$/i);
      if (mModel && findModel("BMW", mModel[1])) return { key: findModel("BMW", mModel[1]), token: `m${mModel[1]}`, mobile: "" };
      const xModel = model.match(/^(x[135])\b/i);
      if (xModel && findModel("BMW", xModel[1].toUpperCase())) return { key: findModel("BMW", xModel[1].toUpperCase()), token: "", mobile: "" };
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

  function fuelMatches(row, fuels) {
    if (!fuels.length) return true;
    if (fuels.includes(row[1])) return true;
    return Boolean(row[7]) && fuels.includes(row[1] === "diesel" ? "hybrid_diesel" : "hybrid_petrol");
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

  // Existing values on top (bold), the usual list below the divider.
  function topThenRest(base, values, label) {
    if (!values.length) return base;
    const wanted = new Set(values.map(String));
    return [
      ...values.map((value) => ({ value: String(value), label: label(value), isPopular: true })),
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
    return topThenRest(base, sizes, (value) => `${value} ccm (${(value / 1000).toFixed(1)})`);
  }

  function powerOptions(sel, base, fromValue) {
    const kw = els.powerUnit?.value === "kw";
    const powers = unique(filtered(sel, { power: false }).map((row) => (kw ? row[4] : row[3])).filter(Boolean)).sort((a, b) => a - b)
      .filter((value) => fromValue === undefined || isAllowedRangeEndValue(String(value), fromValue, true));
    return topThenRest(base, powers, (value) => `${value} ${kw ? "kW" : "KM"}`);
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

  function refresh() {
    const sel = selection();
    const bodyInputs = Array.from(document.querySelectorAll("[data-mobile-body-choice]"));
    if (!sel) {
      dim(els.fuels, null);
      dim(els.gearbox, null);
      dim(els.drive, null);
      dim(bodyInputs, null);
      return;
    }
    const bodies = bodiesOf(sel);
    dim(bodyInputs, bodies.length ? new Set(bodies.flatMap((body) => body[0])) : null);
    const fuelRows = filtered(sel, { fuel: false, size: false, power: false });
    const fuels = new Set();
    fuelRows.forEach((row) => {
      fuels.add(row[1]);
      if (row[7]) fuels.add(row[1] === "diesel" ? "hybrid_diesel" : "hybrid_petrol");
    });
    dim(els.fuels, fuelRows.length ? fuels : null);
    const rows = filtered(sel);
    const gearboxKnown = rows.length && rows.every((row) => row[5]);
    dim(els.gearbox, gearboxKnown ? new Set(rows.map((row) => (row[5] === "m" ? "manual" : "automatic"))) : null);
    dim(els.drive, rows.length ? new Set(rows.map((row) => ({ f: "fwd", r: "rwd", 4: "awd" })[row[6]])) : null);
  }

  document.addEventListener("input", () => refresh());
  document.addEventListener("change", () => refresh());
  // The body chips are drawn again (language, a restored search): dim again.
  const bodyBox = document.querySelector("[data-mobile-body-choices]");
  if (bodyBox) new MutationObserver(() => refresh()).observe(bodyBox, { childList: true });

  window.AUTOGOOD_MODEL_SPECS_UI = { enhance, refresh, family };
})();
