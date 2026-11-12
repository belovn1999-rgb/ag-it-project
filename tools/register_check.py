"""Official registers as sources of the confirmation (stage 27, owner 2026-11-12).

EEA (data/eea-registrations.json, tools/eea_import.py): the engine — a car of our model with our fuel, cm³ within
30 and kW within 2 registered new in the EU in the version's years (to a year after). It also says the version
was sold in Europe.
EPA (data/epa-vehicles.json, tools/epa_import.py): the gearbox and the drive — the US versions of our model with
our litres and fuel in the version's years: which gearboxes (manual / automatic) and drives they have.
"""
import collections
import json
import os

import autocentrum

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EEA_FUEL = {"бензин": {"p", "p_h"}, "дизель": {"d", "d_h"}, "гибрид": {"p_h"}, "гибрид (дизель)": {"d_h"},
            "плагин-гибрид": {"phev", "dphev"}, "электро": {"ev"}, "газ (LPG)": {"lpg", "p"},
            "газ (CNG)": {"cng"}, "бензин/E85 (Flexible Fuel)": {"e85", "p"}}
EPA_FUEL = {"бензин": {"p"}, "дизель": {"d"}, "гибрид": {"hyb"}, "гибрид (дизель)": {"hyb"},
            "плагин-гибрид": {"phev"}, "электро": {"ev"}, "газ (CNG)": {"cng"}, "бензин/E85 (Flexible Fuel)": {"p"}}


def _load(name):
    path = os.path.join(ROOT, "data", name)
    return json.load(open(path, encoding="utf8")) if os.path.exists(path) else {}


def _int(value):
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _span(row):
    start, end = autocentrum.our_years(str(row["Годы (проверено)"] or row["Годы (источник)"]))
    if _int(row.get("Год версии")):
        start = max(start or 0, _int(row["Год версии"])) or None
    return start, end or 2026


def eea_engines(rows):
    """{id(row): countries} — rows whose engine the EU register has in the version's years."""
    by_model = collections.defaultdict(list)
    for make, model, fuel, ec, kw, years, countries in _load("eea-registrations.json").get("rows", []):
        by_model[(make, model)].append((fuel, ec, kw, years, countries))
    found = {}
    for row in rows:
        lines = by_model.get((row["Марка"], row["Модель"]))
        fuels = EEA_FUEL.get(row["Топливо"])
        kw = _int(row["Мощность, кВт"])
        if not lines or not fuels or not kw:
            continue
        cm3 = _int(row["Объём, см³"])
        start, end = _span(row)
        if not start:
            continue
        best = 0
        for fuel, ec, their_kw, years, countries in lines:
            if fuel not in fuels or abs(their_kw - kw) > 2:
                continue
            if fuel != "ev" and cm3 and abs(ec - cm3) > 30:
                continue
            if any(start <= year <= end + 1 for year in years):
                best = max(best, countries)
        if best:
            found[id(row)] = best
    return found


def epa_options(rows):
    """{id(row): (gearbox codes, drive codes)} of the US versions like the row."""
    by_model = collections.defaultdict(list)
    for make, model, year, litres, fuel, boxes, drives in _load("epa-vehicles.json").get("eu", []):
        by_model[(make, model)].append((year, litres, fuel, boxes, drives))
    options = {}
    for row in rows:
        lines = by_model.get((row["Марка"], row["Модель"]))
        fuels = EPA_FUEL.get(row["Топливо"])
        if not lines or not fuels:
            continue
        cm3 = _int(row["Объём, см³"])
        litres = round(cm3 / 1000, 1) if cm3 else 0
        start, end = _span(row)
        if not start:
            continue
        boxes, drives = set(), set()
        for year, their_litres, fuel, their_boxes, their_drives in lines:
            if fuel not in fuels or not start <= year <= end + 1:
                continue
            if fuel != "ev" and (not litres or abs(their_litres - litres) > 0.05):
                continue
            boxes |= set(their_boxes)
            drives |= set(their_drives)
        if boxes or drives:
            options[id(row)] = (boxes, drives)
    return options


def eea_mild(rows):
    """{id(row): (countries plain, countries hybrid)} — petrol / diesel rows from 2016: how the EU register files
    the same engine (fuel mode M — plain, H — hybrid, mild hybrids included)."""
    by_model = collections.defaultdict(list)
    for make, model, fuel, ec, kw, years, countries in _load("eea-registrations.json").get("rows", []):
        by_model[(make, model)].append((fuel, ec, kw, years, countries))
    out = {}
    for row in rows:
        base = {"бензин": "p", "дизель": "d"}.get(row["Топливо"])
        start, end = _span(row)
        if not base or not start or end < 2016:
            continue
        kw, cm3 = _int(row["Мощность, кВт"]), _int(row["Объём, см³"])
        plain = hybrid = 0
        for fuel, ec, their_kw, years, countries in by_model.get((row["Марка"], row["Модель"]), []):
            if abs(their_kw - kw) > 2 or abs(ec - cm3) > 30 or not any(max(start, 2016) <= y <= end + 1 for y in years):
                continue
            if fuel == base:
                plain = max(plain, countries)
            elif fuel == base + "_h":
                hybrid = max(hybrid, countries)
        if plain or hybrid:
            out[id(row)] = (plain, hybrid)
    return out
