#!/usr/bin/env python3
"""EEA CO2 monitoring of new passenger cars (official EU register, 2010–2025) → data/eea-registrations.json.

Stage 27 (owner 2026-11-12): a third, official source for the engine. Every car registered new in an EU country
is reported with make, commercial name, fuel, fuel mode, cm³ and kW. The download (DISCODATA, one distinct
make / name / fuel / cm³ / kW / country list per year, see tools/eea-fetch) lives outside the repo; this keeps
what our models have: our make and model, fuel, cm³, kW, the years and in how many countries it was registered.
A line seen in one country only in one year is left out (typing errors of a register: an Octavia 2.0 TDI of 49 kW).

    python3 tools/eea_import.py ~/cloude/.tools/sources/eea
"""
import collections
import csv
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from foreign_names import Matcher, make_key  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "eea-registrations.json")


def fuel_code(ft, fm):
    ft = re.sub(r"[-\s]+", "/", (ft or "").strip().lower())
    fm = (fm or "").strip().upper()
    if ft.startswith("electric"):
        return "ev"
    if ft in ("lpg", "petrol/lpg"):
        return "lpg"
    if ft.startswith("ng") or "cng" in ft or "methane" in ft:
        return "cng"
    if ft.startswith("e85"):
        return "e85"
    if ft.startswith("diesel"):
        return {"P": "dphev", "H": "d_h"}.get(fm, "d_h" if "electric" in ft else "d")
    if ft.startswith("petrol"):
        return {"P": "phev", "H": "p_h"}.get(fm, "p_h" if "electric" in ft else "p")
    return None


def main(source_dir):
    rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig"),
                               delimiter=";"))
    matcher = Matcher(rows)
    our_make = {make_key(r["Марка"]): r["Марка"] for r in rows}
    seen = collections.defaultdict(lambda: [set(), set()])  # key -> [years, countries]
    missing = collections.defaultdict(lambda: [set(), set()])
    files = sorted(glob.glob(os.path.join(source_dir, "eea-ms-*.json")))
    for path in files:
        year = int(re.search(r"(\d{4})", os.path.basename(path)).group(1))
        for item in json.load(open(path)):
            key = make_key(item.get("Mk"))
            if key not in our_make or not item.get("Cn"):
                continue
            fuel = fuel_code(item.get("Ft"), item.get("Fm"))
            if not fuel:
                continue
            model = matcher.model(item["Mk"], item["Cn"])
            country = item.get("MS") or ""
            if not model:
                entry = missing[(our_make[key], re.sub(r"\s+", " ", item["Cn"].strip().upper()))]
                entry[0].add(year)
                entry[1].add(country)
                continue
            ec, kw = item.get("Ec (cm3)") or 0, item.get("Ep (KW)") or 0
            if not kw:
                continue
            entry = seen[(our_make[key], model, fuel, int(ec or 0), int(round(kw)))]
            entry[0].add(year)
            entry[1].add(country)
    out = [[make, model, fuel, ec, kw, sorted(years), len(countries)]
           for (make, model, fuel, ec, kw), (years, countries) in sorted(seen.items())
           if len(countries) >= 2 or len(years) >= 2]
    lost = sorted(([make, name, len(countries), min(years), max(years)]
                   for (make, name), (years, countries) in missing.items() if len(countries) >= 5),
                  key=lambda item: (-item[2], item[0], item[1]))
    json.dump({"source": "EEA CO2 monitoring of new passenger cars (DISCODATA [CO2Emission].[latest])",
               "years": [int(re.search(r"(\d{4})", os.path.basename(p)).group(1)) for p in files],
               "fields": ["make", "model", "fuel", "cm3", "kW", "years registered", "countries"],
               "rows": out, "unmatched": lost},
              open(OUT, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)} lines kept of {len(seen)}; {len(lost)} names of our makes without a model "
          f"(5+ countries) → {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main(os.path.expanduser(sys.argv[1]))
