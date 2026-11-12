#!/usr/bin/env python3
"""American models table (stage 27, owner 2026-11-12) → data/model-engines-us.csv.

Every US version since 2000 from EPA (data/epa-vehicles.json, tools/epa_import.py): make, model, years, litres,
cylinders, charger, fuel, gearbox, drive, class. Confirmation:
- model and years: EPA + NHTSA vPIC (data/vpic-models.json — the official list of models of a make and model
  year; tools/eea-fetch/fetch-vpic.py outside the repo) when vPIC lists the model in every year of the line;
- engine: EPA + our European table when our table has the model with the same litres and fuel in those years
  (cars sold on both markets), else EPA alone.

    python3 tools/build-us-table.py
"""
import collections
import csv
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from foreign_names import Matcher, fold, make_key  # noqa: E402
import register_check  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "model-engines-us.csv")
FUEL = {"p": "бензин", "d": "дизель", "hyb": "гибрид", "phev": "плагин-гибрид", "ev": "электро", "cng": "газ (CNG)"}
DRIVE = {"f": "передний", "r": "задний", "4": "полный", "": ""}


def gearbox_text(trany):
    gears = re.search(r"(\d+)(?:-spd|\))", trany)
    if trany.startswith("Manual"):
        return "механика" + (f", {gears.group(1)} ступ." if gears else "")
    if "variable" in trany or "AV" in trany:
        return "автомат (вариатор)"
    if "AM" in trany:
        return "автомат (робот)" + (f", {gears.group(1)} ступ." if gears else "")
    if trany.startswith("Automatic"):
        if gears and gears.group(1) == "1":
            return "автомат (одна ступень)"
        return "автомат" + (f", {gears.group(1)} ступ." if gears else "")
    return ""


def runs(years):
    years = sorted(years)
    out, start = [], years[0]
    for previous, year in zip(years, years[1:] + [None]):
        if year != previous + 1:
            out.append((start, previous))
            start = year
    return out


def main():
    epa = json.load(open(os.path.join(ROOT, "data", "epa-vehicles.json"), encoding="utf8"))
    vpic_path = os.path.join(ROOT, "data", "vpic-models.json")
    vpic = json.load(open(vpic_path, encoding="utf8")) if os.path.exists(vpic_path) else {}
    ours = list(csv.DictReader(open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig"),
                               delimiter=";"))
    matcher = Matcher(ours)
    our_make = {make_key(r["Марка"]): r["Марка"] for r in ours}
    our_engines = collections.defaultdict(list)
    for row in ours:
        fuels = register_check.EPA_FUEL.get(row["Топливо"], set())
        start, end = register_check._span(row)
        cm3 = register_check._int(row["Объём, см³"])
        if start:
            our_engines[(row["Марка"], row["Модель"])].append((fuels, round(cm3 / 1000, 1), start, end))

    groups = collections.defaultdict(set)
    for make, base, model, year, litres, cylinders, fuel, trany, drive, charger, vclass in epa["us"]:
        groups[(make, base, model, litres, cylinders, fuel, gearbox_text(trany), drive, charger, vclass)].add(year)

    def vpic_has(make, base, year):
        names = vpic.get(f"{make}|{year}")
        if names is None:
            return None
        want = fold(base).replace(" ", "")
        for name in names:
            have = fold(name).replace(" ", "")
            if have and (want.startswith(have) or have.startswith(want)):
                return True
        return False

    out = []
    for (make, base, model, litres, cylinders, fuel, box, drive, charger, vclass), years in groups.items():
        our_model = (matcher.model(make, model) or matcher.model(make, base)) if make_key(make) in our_make else None
        for start, end in runs(years):
            said = [vpic_has(make, base, year) for year in range(start, end + 1)]
            if all(said):
                model_status = "подтверждено: EPA + vPIC"
            elif any(s is False for s in said) and not any(said):
                model_status = "одна база: EPA (у vPIC модели нет)"
            else:
                model_status = "одна база: EPA" + (" (у vPIC не все годы)" if any(said) else "")
            engine_status = "одна база: EPA"
            if our_model:
                for fuels, our_litres, our_start, our_end in our_engines[(our_make[make_key(make)], our_model)]:
                    if fuel in fuels and (fuel == "ev" or abs(our_litres - litres) <= 0.05) and \
                            our_start <= end and start <= our_end + 1:
                        engine_status = "подтверждено: EPA + справочник Европы"
                        break
            out.append({
                "Марка": make, "Модель": base, "Версия": model,
                "Годы": str(start) if start == end and end < 2026 else f"{start}–{end}" if end < 2026 else f"{start}–н. в.",
                "Объём, л": f"{litres:.1f}" if litres else "", "Цилиндры": cylinders or "",
                "Наддув": {"turbo": "турбо", "super": "компрессор"}.get(charger, ""),
                "Топливо": FUEL.get(fuel, fuel), "Коробка": box, "Привод": DRIVE.get(drive, drive),
                "Класс EPA": vclass, "Есть в справочнике Европы": our_model or "",
                "Подтверждение: модель и годы": model_status, "Подтверждение: мотор": engine_status,
            })
    out.sort(key=lambda r: (r["Марка"], r["Модель"], r["Годы"], r["Версия"], r["Объём, л"]))
    with open(OUT, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(out[0]), delimiter=";")
        writer.writeheader()
        writer.writerows(out)
    models = {(r["Марка"], r["Модель"]) for r in out}
    count = collections.Counter(r["Подтверждение: модель и годы"].split(" (")[0] for r in out)
    engine = collections.Counter(r["Подтверждение: мотор"] for r in out)
    print(f"{len(out)} lines, {len(models)} models, {len({r['Марка'] for r in out})} makes → "
          f"{os.path.relpath(OUT, ROOT)}; model/years: {dict(count)}; engine: {dict(engine)}")


if __name__ == "__main__":
    main()
