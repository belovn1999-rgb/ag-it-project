"""Years of the version itself, not of its generation (B61 stage 28, hand check 2026-11-12).

The hand check of 100 random versions (docs/PROJECT-MODELS.md item 27) found the years wrong in 45: the table gave
each version the years of its generation or phase ("Годы (проверено)"), while an engine often came later
(Focus III 1.5 TDCi — with the 2014 facelift, not 2010) or ended earlier (Crafter I 2.5 TDI — 2011, not "н. в.").

Start: the version's own first year ("Год версии" of its source: ultimatespecs, autocentrum, ADAC) where it lies
inside the generation; else the EU register's first year (EEA, from 2012 — the register starts in 2010); else the
generation start. ADAC's first year of the same engine (tools/adac_check.py: a twin of the same kW ±1 and litres)
moves it earlier, never later. Stage 31 (2026-11-13): the own year alone was too late where the source lists a later model year —
ultimatespecs has the RAV4 2.5 Hybrid 218 PS as "2024", ADAC from 2019; the Q3 40 TDI from 2024, sold since 2019.
End: the EU register's last year for that engine within the generation, where it stops two or more years before the
generation ends (or the generation is still made and the engine was last registered by 2023); else the generation end.
Before 2010 the register says nothing: the generation end stays.

Columns: "Годы версии" ("2014–2018", "2021–н. в."), "Годы версии: откуда", "Подтверждение: годы версии".
The lists (src/model-specs, the platform catalog) take them with a year's slack on both sides: a car is registered
after it is built.
"""
import collections

import autocentrum
import register_check

FIRST_REGISTER_YEAR = 2010
LAST_FULL_YEAR = 2024  # 2025 is provisional in the register


def _register_years(rows):
    """{id(row): sorted registration years} — the EEA lines of the row's engine (same fuel family, kW ±2, cm³ ±30)."""
    by_model = collections.defaultdict(list)
    for make, model, fuel, ec, kw, years, countries in register_check._load("eea-registrations.json").get("rows", []):
        by_model[(make, model)].append((fuel, ec, kw, years))
    found = {}
    for row in rows:
        lines = by_model.get((row["Марка"], row["Модель"]))
        fuels = register_check.EEA_FUEL.get(row["Топливо"])
        kw = register_check._int(row["Мощность, кВт"])
        if not lines or not fuels or not kw:
            continue
        cm3 = register_check._int(row["Объём, см³"])
        years = set()
        for fuel, ec, their_kw, their_years in lines:
            if fuel in fuels and abs(their_kw - kw) <= 2 and (fuel == "ev" or not cm3 or abs(ec - cm3) <= 30):
                years.update(their_years)
        if years:
            found[id(row)] = sorted(years)
    return found


def apply(rows):
    registered = _register_years(rows)
    counts = collections.Counter()
    for row in rows:
        adac = row.pop("_adac_first", None) or 0
        gen_from, gen_to = autocentrum.our_years(str(row["Годы (проверено)"] or row["Годы (источник)"]))
        if not gen_from:
            row["Годы версии"], row["Годы версии: откуда"], row["Подтверждение: годы версии"] = "", "", "нет"
            continue
        end_cap = gen_to or 2026
        own = register_check._int(row.get("Год версии"))
        seen = [y for y in registered.get(id(row), []) if gen_from - 1 <= y <= end_cap + 1]
        eea = seen[0] if seen and seen[0] >= FIRST_REGISTER_YEAR + 2 else 0
        start, start_from = gen_from, "годы поколения"
        if gen_from < own <= end_cap:
            start, start_from = own, "год версии"
        elif not own and eea and gen_from < eea <= end_cap:
            start, start_from = eea, "EEA"
        # ADAC's first year of the same engine only moves the start earlier, never later (its catalog is thin
        # before 2012).
        if adac and adac < start:
            start, start_from = (adac, "ADAC") if adac > gen_from else (gen_from, "годы поколения")
        elif adac and adac == start and start_from != "годы поколения":
            start_from += " + ADAC"
        known = {"год версии": own, "ADAC": adac, "EEA": eea if start >= FIRST_REGISTER_YEAR + 1 else 0}
        end, end_from = gen_to, "годы поколения"
        if seen:
            last = seen[-1]
            stops = (last <= gen_to - 2) if gen_to else last <= LAST_FULL_YEAR - 1
            if stops and last >= max(start, FIRST_REGISTER_YEAR + 1):
                end, end_from = last, "EEA"
        row["Годы версии"] = f"{start}–{end or 'н. в.'}"
        row["Годы версии: откуда"] = f"с: {start_from}; по: {end_from}"
        # Confirmed: two of the three first years agree within a year (the register sees only 2010+).
        agree = [name for name, y in known.items() if y and abs(y - start) <= 1]
        if start_from == "годы поколения":
            status = "годы поколения"
        elif len(agree) >= 2:
            status = "подтверждено: " + " + ".join(agree)
        else:
            status = "одна база: " + start_from
        row["Подтверждение: годы версии"] = status
        counts[status] += 1
        counts["конец по EEA"] += end_from == "EEA"
    return counts
