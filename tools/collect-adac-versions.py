#!/usr/bin/env python3
"""Every version of our models' generations in the ADAC Autokatalog, for the cross-check (B61 stage 17,
owner 2026-10-23: "confirmed" = two independent sources agree).

The catalog has one page per generation and phase ("bmw/1er-reihe/f20-f21", "…/f20-f21-facelift",
"…/f20-f21-facelift-2"); each page lists its German-market versions with the maker's data: name with the
months on sale ("BMW 118i Steptronic (03/15 - 06/17)"), fuel ("Super", "Diesel", "Strom"), kW and PS. The
model pages come from tools/collect-trims-adac.py (pages_of(): the slug, or MANUAL where ADAC names it its
own way), the generation pages from its sitemap. Written to data/adac-versions.json (versions on sale in 2009
or later); tools/confirm.py matches them to our rows. robots.txt allows the catalog; one page every 2 s,
cached in ~/.cache/autogood/adac/pages (the same cache as the trims).

    python3 tools/collect-adac-versions.py [--offline]
"""
import argparse
import datetime
import html
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "adac-versions.json")
SINCE = 2009

_spec = importlib.util.spec_from_file_location("adac_trims", os.path.join(ROOT, "tools", "collect-trims-adac.py"))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)   # fetch(), adac_generations(), pages_of(), page_models(), CACHE
DATES = re.compile(r"\s*\((?:(\d{2})/(\d{2})\s*-\s*(\d{2})/(\d{2})|ab (\d{2})/(\d{2}))\)\s*$")


def month(mm, yy):
    """"03", "15" -> "2015-03" (two-digit years: 50-99 are 19xx)."""
    year = int(yy) + (1900 if int(yy) >= 50 else 2000)
    return f"{year}-{mm}"


def versions(page):
    """[[name, fuel, kW, PS, from "YYYY-MM", to "YYYY-MM" or None]] of a generation page."""
    text = html.unescape(re.sub(r"<[^>]+>", "\n", page))
    lines = [line.strip().replace("\xa0", " ") for line in text.split("\n") if line.strip()]
    out, seen = [], set()
    for i, line in enumerate(lines):
        dates = DATES.search(line)
        if not dates or i + 3 >= len(lines):
            continue
        kw = re.fullmatch(r"(\d+) kW", lines[i + 2])
        hp = re.fullmatch(r"(\d+) PS", lines[i + 3])
        if not (kw and hp):
            continue
        start = month(dates.group(1) or dates.group(5), dates.group(2) or dates.group(6))
        end = month(dates.group(3), dates.group(4)) if dates.group(3) else None
        row = (line[:dates.start()].strip(), lines[i + 1], int(kw.group(1)), int(hp.group(1)), start, end)
        if row not in seen:
            seen.add(row)
            out.append(list(row))
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="read the cache only, fetch nothing")
    args = parser.parse_args()
    catalog = A.adac_generations()
    models, pages, missing = {}, 0, []
    for key in sorted(A.page_models()):
        model_pages = A.pages_of(key, catalog)
        if not model_pages:
            missing.append(key)
            continue
        gens = []
        for model_page in model_pages:
            for gen in catalog.get(model_page, []):
                path = f"{model_page}/{gen}/"
                if args.offline:
                    name = os.path.join(A.CACHE, "pages", re.sub(r"[^A-Za-z0-9._-]+", "_", path.strip("/")) + ".html")
                    page = open(name, encoding="utf8", errors="ignore").read() if os.path.exists(name) else ""
                else:
                    page = A.fetch(path)
                pages += 1
                found = [v for v in versions(page) if not v[5] or int(v[5][:4]) >= SINCE]
                if found:
                    gens.append({"page": f"{model_page}/{gen}", "facelift": "facelift" in gen, "versions": found})
        if gens:
            models[key] = gens
        print(f"{key}: {len(gens)} generations, {sum(len(g['versions']) for g in gens)} versions", flush=True)
    with open(OUT, "w", encoding="utf8") as handle:
        json.dump({"source": A.BASE, "generatedAt": datetime.date.today().isoformat(), "since": SINCE,
                   "models": models}, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
    total = sum(len(g["versions"]) for gens in models.values() for g in gens)
    print(f"models={len(models)} pages={pages} versions={total} not in ADAC={len(missing)}")
    print("not in ADAC:", ", ".join(missing))


if __name__ == "__main__":
    sys.exit(main())
