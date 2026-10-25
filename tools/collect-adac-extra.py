#!/usr/bin/env python3
"""New versions the ADAC catalog has and our other sources do not (B61 stage 19, owner 2026-10-25: the check against
the platform's listings missed mostly 2024-2026 versions — Audi A3 8Y facelift, A6 45 TDI 245 PS, BMW 330e LCI).

Only where the ADAC generation (its page with the facelift pages) and ours start in the same year (± 1, exactly one
of ours) and the version came out in 2019 or later (2023 at first; 2019 since the listings check 25.10); "ours" are the rows of ultimatespecs and autocentrum, so the list
does not shrink with the rows it adds. One ADAC version page per new engine (fuel, kW, displacement) gives the maker's
data — engine kind, cm³, gearbox, drive, body, doors, seats (tools/crawl-adac-models.py engine_of()). Written to
data/adac-extra.json; tools/build-model-engine-table.py adds them as rows of that generation (source "adac", the facelift
phase for a facelift page). One page every 2 s, cached in ~/.cache/autogood/adac/pages.

    python3 tools/collect-adac-extra.py [--offline]
"""
import argparse
import collections
import csv
import datetime
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import adac_check  # noqa: E402
import autocentrum  # noqa: E402

OUT = os.path.join(ROOT, "data", "adac-extra.json")
SINCE = 2019
_spec = importlib.util.spec_from_file_location("crawl_adac", os.path.join(ROOT, "tools", "crawl-adac-models.py"))
C = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(C)   # A (fetch, BASE, CACHE), specs(), engine_of()


def missing(rows):
    """{(brand, label, code, family, kW, litres): {page, facelift, versions}} — ADAC versions since SINCE no row has."""
    models = adac_check.load()
    gens = autocentrum.our_generations([r for r in rows if r.get("Источник") != "adac"])
    out = collections.OrderedDict()
    for (brand, label), model_gens in gens.items():
        first = next(iter(model_gens.values()))["rows"][0]["src"]
        pages = models.get(f"{brand}|{first['Модель mobile.de']}") or models.get(f"{brand}|{label}")
        if not pages:
            continue
        groups = collections.defaultdict(list)
        for page in pages:
            groups[re.sub(r"-facelift(-\d+)?$", "", page["page"])].append(page)
        for base, group in groups.items():
            start, _end = adac_check._span([v for p in group for v in p["versions"]])
            matched = [(code, g) for code, g in model_gens.items() if abs(g["from"] - start) <= 1]
            if len(matched) != 1:
                continue
            code, gen = matched[0]
            for page in group:
                for version in page["versions"]:
                    if int(version[4][:4]) < SINCE:
                        continue
                    family = adac_check.adac_family(version[1])
                    litres = adac_check.LITRES.search(version[0])
                    # The same engine in the phase that sells in the version's year (A3 8Y 40 TFSI 204 PS before the
                    # 2024 facelift is not one after it).
                    year = int(version[4][:4])
                    if any(_same(item, version, family, litres) and _in_years(item, year) for item in gen["rows"]):
                        continue
                    key = (brand, label, code, family, version[2], litres.group(1) if litres else "")
                    out.setdefault(key, {"page": page["page"], "facelift": page["facelift"], "versions": []})["versions"].append(version)
    return out


def _in_years(item, year):
    start, end = autocentrum.our_years(item["src"]["Годы (проверено)"])
    return bool(start) and start - 1 <= year <= (end or 2100)


def _same(item, version, family, litres):
    if adac_check.OUR_FAMILY.get(item["fuel"], "p") != family:
        return False
    if litres and item["litres"] and abs(float(litres.group(1)) - item["litres"]) > 0.15:
        return False
    hybrid = family == "phev" or (item["fuel"] in ("hybrid", "hybrid_diesel") and not item["mild"])
    return abs(item["hp"] - version[3]) <= 3 or abs(item["kw"] - version[2]) <= 2 or (hybrid and abs(item["hp"] - version[3]) <= 25)


def version_path(page, name, catalog_page):
    """The ADAC version page of a version name on a generation page (the cached generation page links it)."""
    text = C.A.fetch(f"{catalog_page}/")
    for path, link_name in C.version_links(text, page.rsplit("/", 1)[0]):
        if re.sub(r"\s*\(.*?\)\s*$", "", link_name).strip() == name:
            return path
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig"), delimiter=";"))
    todo = missing(rows)
    extra, skipped = [], 0
    for (brand, label, code, family, kw, litres), found in todo.items():
        version = found["versions"][0]
        path = version_path(found["page"], version[0], found["page"])
        page = C.A.fetch(path) if path and not args.offline else (C._cached(path) if path else "")
        data = C.specs(page) if page else {}
        engine = C.engine_of(path, version[0], data, label) if data.get("Motorart") else None
        if not engine or not engine["hp"]:
            skipped += 1
            continue
        engine.pop("series_from", None)
        # "Mercedes-Benz C 200 d", "DS Automobiles DS 4 E-Tense 225" -> "C 200 d", "E-Tense 225".
        brand_words = "(?:mercedes-benz|ds automobiles|vw nutzfahrzeuge|vw|volkswagen|land rover|alfa romeo|%s)" % re.escape(brand.lower())
        label_words = re.sub(r"([A-Za-z])(\d)", r"\1 ?\2", re.escape(label))   # "DS4" also as "DS 4"
        for field in ("name", "text"):
            value = re.sub(r"^%s\s+" % brand_words, "", engine[field], flags=re.I)
            if not label.startswith(("Klasa", "Seria")):
                value = re.sub(r"^%s\s+" % label_words, "", value, flags=re.I)
            engine[field] = value.strip() or engine[field]
        # The years of every ADAC version with this engine on the page (the first one alone may be one month).
        starts = [int(v[4][:4]) for v in found["versions"]]
        ends = [int(v[5][:4]) if v[5] else None for v in found["versions"]]
        engine["from"] = min(starts)
        engine["to"] = None if any(e is None or e >= 2026 for e in ends) else max(ends)
        extra.append({"brand": brand, "label": label, "code": code, "facelift": found["facelift"], "page": found["page"],
                      "body": engine.pop("body") or "", "doors": engine.pop("doors") or "", "engine": engine,
                      "adac_versions": len(found["versions"])})
        print(f"{brand} {label} {code}: {engine['type']} {engine['name']} {engine['hp']} PS {engine['from']}", flush=True)
    with open(OUT, "w", encoding="utf8") as handle:
        json.dump({"source": C.A.BASE, "generatedAt": datetime.date.today().isoformat(), "since": SINCE,
                   "versions": extra}, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    print(f"new engines={len(extra)} (ADAC versions {sum(e['adac_versions'] for e in extra)}) skipped={skipped}")


if __name__ == "__main__":
    sys.exit(main())
