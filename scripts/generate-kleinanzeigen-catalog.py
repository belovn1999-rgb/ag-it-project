#!/usr/bin/env python3
"""Kleinanzeigen (DE) make/model catalog for mobile.html.

Cars are category 216; a make is autos.marke_s:<slug>, a model
autos.model_s:<slug>. The make's search page lists its models with their
slugs in the "Marke" filter section — only the 100 with the most ads (BMW and
Mercedes have more: GLC was only glc_220/250/300, 1 016 cars of ~1 785,
2026-10-10). A make whose list is full is read again by the names of its series
(KEYWORDS: a search by words lists the models of its own ads; the attribute
filters leave the list as it is): the union is the whole list. Kleinanzeigen ignores an unknown model_s (the whole make
comes back), so the list must be complete.
Read through a reader proxy (the site blocks an address that asks too often).
Run: python3 scripts/generate-kleinanzeigen-catalog.py
     [--proxy https://ag-proxy.autogood-crm.workers.dev/ --origin http://127.0.0.1:4173]
     [--makes "BMW,Mercedes Benz"]  (only these makes; the others kept from the file)
     [--cache <folder>]             (pages kept for a rerun)
"""
import argparse
import html
import json
import pathlib
import re
import time
import urllib.request
from datetime import datetime, timezone

SITE = "https://www.kleinanzeigen.de"
OUTPUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "kleinanzeigen-catalog.generated.js"
FULL_LIST = 100

parser = argparse.ArgumentParser()
parser.add_argument("--proxy", default="https://r.jina.ai/")
parser.add_argument("--origin", default="")
parser.add_argument("--makes", default="")
parser.add_argument("--pause", type=float, default=3.4)
parser.add_argument("--cache", default="", help="folder that keeps the pages read (a rerun asks again only for new ones)")
args = parser.parse_args()
CACHE = pathlib.Path(args.cache) if args.cache else None
if CACHE:
    CACHE.mkdir(parents=True, exist_ok=True)
PROXY = args.proxy
HEADERS = {"User-Agent": "Mozilla/5.0 AUTOGOOD catalog generator", "x-respond-with": "html"}
if args.origin:
    HEADERS["Origin"] = args.origin
REQUESTS = 0


def get(path):
    global REQUESTS
    cached = CACHE / re.sub(r"[^A-Za-z0-9_.,-]+", "_", path) if CACHE else None
    if cached and cached.exists():
        return cached.read_text(encoding="utf-8")
    for attempt in range(5):
        try:
            REQUESTS += 1
            request = urllib.request.Request(f"{PROXY}{SITE}{path}", headers=HEADERS)
            with urllib.request.urlopen(request, timeout=90) as response:
                page = response.read().decode("utf-8", "ignore")
                if cached:
                    cached.write_text(page, encoding="utf-8")
                return page
        except Exception:
            time.sleep(20)
    raise SystemExit(f"Kleinanzeigen did not answer for {path}")


def section(page, name):
    start = page.find(f'data-filter-section="{name}"')
    return page[start:page.find("</details>", start)] if start >= 0 else ""


def links(fragment, key):
    found = []
    for href, label in re.findall(r'href="([^"]+)"[^>]*>([^<]+)</a>', fragment):
        match = re.search(key + r":([a-z0-9_]+)", href)
        if match:
            found.append((html.unescape(label).strip(), match.group(1)))
    return found


def model_links(slug, extra="", words=""):
    time.sleep(args.pause)
    page = get(f"/s-autos/{slug}/{words + '/k0' if words else ''}c216+autos.marke_s:{slug}{extra}")
    models = []
    for model_label, model_slug in links(section(page, "attr.marke"), r"autos\.model_s"):
        name = re.sub(r"^Weitere\s+", "", model_label).strip()
        if model_slug == "andere":
            name = "Andere"
        models.append({"name": name, "slug": model_slug})
    return models


def full(models):
    # 100 entries ("Weitere <make>" = andere among them) = cut off.
    return len(models) >= FULL_LIST


# The model list of a search counts only its own ads, and a search by words
# narrows it (the attribute filters do not: the list stays the make's own).
# A make with a full list is read again by the names of its series, so each
# series shows its models in full: "GLC" -> GLC 200 … GLC 63 AMG and "Weitere
# GLC-Klasse" (1 787 ads, 2026-10-10). A single letter is not searched, so the
# classes go as "C-Klasse".
KEYWORDS = {
    "bmw": ["1er", "2er", "3er", "4er", "5er", "6er", "7er", "8er", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "z4"],
    "mercedes_benz": ["a-klasse", "b-klasse", "c-klasse", "e-klasse", "s-klasse", "v-klasse", "g-klasse", "r-klasse", "cla", "clk", "cls",
                      "gla", "glb", "glc", "gle", "glk", "gls", "ml", "sl", "slk", "slc"],
}


def make_models(slug):
    models = model_links(slug)
    if not full(models):
        return models
    found = {model["slug"]: model for model in models}
    for word in KEYWORDS.get(slug, []):
        for model in model_links(slug, words=word):
            found.setdefault(model["slug"], model)
    print(f"  {slug}: {len(models)} on the make page, {len(found)} in all")
    if not KEYWORDS.get(slug):
        print(f"  {slug}: the list is full and has no series words in KEYWORDS — add them")
    return list(found.values())


existing = {}
if OUTPUT.exists():
    for line in OUTPUT.read_text(encoding="utf-8").splitlines():
        match = re.match(r'\s+("[^"]+"): (\{.*\}),?$', line)
        if match:
            existing[json.loads(match.group(1))] = json.loads(match.group(2))
only = {name.strip() for name in args.makes.split(",") if name.strip()}

catalog = {}
if only:
    catalog = dict(existing)
    for label in sorted(only):
        if label not in existing:
            raise SystemExit(f"{label} is not in {OUTPUT.name}")
        models = make_models(existing[label]["slug"])
        # A model the file knew stays (a rare one may be missing from every list today).
        known = {model["slug"] for model in models}
        models += [model for model in existing[label]["models"] if model["slug"] not in known]
        catalog[label] = {"slug": existing[label]["slug"], "models": models}
else:
    top = get("/s-autos/c216")
    makes = {}
    for label, slug in links(section(top, "attr.marke"), r"autos\.marke_s"):
        makes.setdefault(slug, label)
    # Makes beyond the first list (the page links every make it knows).
    for slug in re.findall(r"/s-autos/([a-z0-9_]+)/c216\+autos\.marke_s:\1\b", top):
        makes.setdefault(slug, slug.replace("_", " ").title())
    for slug, label in sorted(makes.items()):
        if slug in ("sonstige_autos",):
            continue
        catalog[label] = {"slug": slug, "models": make_models(slug)}

if len(catalog) < 30:
    raise SystemExit(f"Only {len(catalog)} makes: Kleinanzeigen answered unexpectedly.")
lines = [
    "/* Generated from the Kleinanzeigen search pages (scripts/generate-kleinanzeigen-catalog.py). Do not hand-edit. */",
    "window.AUTOGOOD_KLEINANZEIGEN_CATALOG = {",
    f'  "generatedFrom": {json.dumps(SITE)},',
    f'  "generatedAt": {json.dumps(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))},',
    '  "makes": {',
    ",\n".join(f"    {json.dumps(name, ensure_ascii=False)}: {json.dumps(make, ensure_ascii=False)}" for name, make in sorted(catalog.items(), key=lambda item: item[0].lower())),
    "  }",
    "};",
    "",
]
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{len(catalog)} makes, {sum(len(m['models']) for m in catalog.values())} models, {REQUESTS} requests -> {OUTPUT}")
