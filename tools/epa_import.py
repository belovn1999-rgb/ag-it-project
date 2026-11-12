#!/usr/bin/env python3
"""US EPA fuel economy data (fueleconomy.gov, every US model year since 1984) → data/epa-vehicles.json.

Stage 27 (owner 2026-11-12): an official source for the gearbox and the drive, the two weakest fields of our
table, and the base of the American models. EPA gives each US version its year, displacement, fuel, gearbox
(manual / automatic, gears) and drive (front / rear / all-wheel) — no power. The download
(https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip) lives outside the repo.

"eu": what EPA says for the models of our table (our make and model, year, litres, fuel → gearboxes, drives).
"us": every EPA version from 2000, for the American table (tools/build-us-table.py).

    python3 tools/epa_import.py ~/cloude/.tools/sources/epa/vehicles.csv
"""
import collections
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from foreign_names import Matcher, make_key  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "epa-vehicles.json")
FIRST_YEAR = 2000


def fuel_kind(row):
    atv = row.get("atvType", "")
    if atv == "EV":
        return "ev"
    if atv == "Plug-in Hybrid":
        return "phev"
    if atv == "Hybrid":
        return "hyb"
    if atv in ("FCV", "eFCV") or row.get("fuelType1") == "Hydrogen":
        return None
    if atv == "Diesel" or row.get("fuelType1") == "Diesel":
        return "d"
    if atv in ("CNG", "Bifuel (CNG)") or row.get("fuelType1") == "Natural Gas":
        return "cng"
    return "p"


def gearbox(trany):
    return "m" if trany.startswith("Manual") else "a" if trany.startswith("Automatic") else ""


def drive(text):
    text = text.lower()
    if text.startswith("front"):
        return "f"
    if text.startswith("rear"):
        return "r"
    if "4-wheel" in text or "all-wheel" in text:
        return "4"
    return ""


def main(path):
    ours = list(csv.DictReader(open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig"),
                               delimiter=";"))
    matcher = Matcher(ours)
    our_make = {make_key(r["Марка"]): r["Марка"] for r in ours}
    eu = collections.defaultdict(lambda: [set(), set()])
    us = []
    for row in csv.DictReader(open(path, encoding="utf-8")):
        year = int(row["year"])
        if year < FIRST_YEAR:
            continue
        fuel = fuel_kind(row)
        if not fuel:
            continue
        litres = round(float(row["displ"] or 0), 1)
        box, wheels = gearbox(row["trany"]), drive(row["drive"])
        us.append([row["make"], row["baseModel"] or row["model"], row["model"], year, litres,
                   int(float(row["cylinders"] or 0)), fuel, row["trany"], wheels,
                   "turbo" if row.get("tCharger") == "T" else "super" if row.get("sCharger") == "S" else "",
                   row.get("VClass", "")])
        key = make_key(row["make"])
        if key not in our_make:
            continue
        model = matcher.model(row["make"], row["model"]) or matcher.model(row["make"], row["baseModel"])
        if not model:
            continue
        entry = eu[(our_make[key], model, year, litres, fuel)]
        if box:
            entry[0].add(box)
        if wheels:
            entry[1].add(wheels)
    json.dump({"source": "US EPA fuel economy data (fueleconomy.gov vehicles.csv)", "from": FIRST_YEAR,
               "eu_fields": ["make", "model", "year", "litres", "fuel", "gearboxes", "drives"],
               "eu": [[*key, "".join(sorted(b)), "".join(sorted(d))] for key, (b, d) in sorted(eu.items())],
               "us_fields": ["make", "base model", "model", "year", "litres", "cylinders", "fuel", "gearbox",
                             "drive", "charger", "class"],
               "us": us},
              open(OUT, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    print(f"eu: {len(eu)} lines of our models; us: {len(us)} versions from {FIRST_YEAR} → "
          f"{os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main(os.path.expanduser(sys.argv[1]))
