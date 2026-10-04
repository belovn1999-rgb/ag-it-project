#!/usr/bin/env python3
"""Kleinanzeigen (DE) make/model catalog for mobile.html.

Cars are category 216; a make is autos.marke_s:<slug>, a model
autos.model_s:<slug>. The make's search page lists its models with their
slugs in the "Marke" filter section. Read through the reader proxy (the site
blocks an address that asks too often), 18 requests a minute.
Run: python3 scripts/generate-kleinanzeigen-catalog.py
"""
import html
import json
import pathlib
import re
import time
import urllib.request
from datetime import datetime, timezone

SITE = "https://www.kleinanzeigen.de"
PROXY = "https://r.jina.ai/"
OUTPUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "kleinanzeigen-catalog.generated.js"
HEADERS = {"User-Agent": "Mozilla/5.0 AUTOGOOD catalog generator", "x-respond-with": "html"}


def get(path):
    for attempt in range(5):
        try:
            request = urllib.request.Request(f"{PROXY}{SITE}{path}", headers=HEADERS)
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read().decode("utf-8", "ignore")
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


top = get("/s-autos/c216")
makes = {}
for label, slug in links(section(top, "attr.marke"), r"autos\.marke_s"):
    makes.setdefault(slug, label)
# Makes beyond the first list (the page links every make it knows).
for slug in re.findall(r"/s-autos/([a-z0-9_]+)/c216\+autos\.marke_s:\1\b", top):
    makes.setdefault(slug, slug.replace("_", " ").title())

catalog = {}
for slug, label in sorted(makes.items()):
    if slug in ("sonstige_autos",):
        continue
    time.sleep(3.4)
    page = get(f"/s-autos/{slug}/c216+autos.marke_s:{slug}")
    models = []
    for model_label, model_slug in links(section(page, "attr.marke"), r"autos\.model_s"):
        name = re.sub(r"^Weitere\s+", "", model_label).strip()
        if model_slug == "andere":
            name = "Andere"
        models.append({"name": name, "slug": model_slug})
    catalog[label] = {"slug": slug, "models": models}

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
print(f"{len(catalog)} makes, {sum(len(m['models']) for m in catalog.values())} models -> {OUTPUT}")
