#!/usr/bin/env python3
"""Marktplaats (NL) / 2dehands-2ememain (BE) make/model catalog for mobile.html.

Both sites run on one platform with one category tree: a make is an l2
category of "Auto's" (l1 91), a model an attribute value of the make
("model" facet). IDs are the same on both sites (VW 157, Golf 1260, checked
2026-10-04), so one catalog serves both; a model missing on one site simply
finds nothing there.
Run: python3 scripts/generate-marktplaats-catalog.py [--proxy https://r.jina.ai/]
Both sites block an address that asks ~50 times in a row (403, 2026-10-04);
--proxy reads through the reader proxy instead, 18 requests a minute.
"""
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

SITES = ["https://www.marktplaats.nl", "https://www.2dehands.be"]
OUTPUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "marktplaats-catalog.generated.js"
HEADERS = {"User-Agent": "Mozilla/5.0 AUTOGOOD catalog generator", "Accept": "application/json"}
CARS = 91
PROXY = sys.argv[sys.argv.index("--proxy") + 1] if "--proxy" in sys.argv else ""
PAUSE = 3.4 if PROXY else 0.6


def get(url):
    # The API now and then answers 502 under a burst: wait and ask again.
    for attempt in range(5):
        try:
            # Through the proxy: no "Accept: application/json" (the proxy would
            # wrap the answer in its own JSON), the site's JSON comes as text.
            headers = {"User-Agent": HEADERS["User-Agent"], "x-respond-with": "text"} if PROXY else HEADERS
            request = urllib.request.Request(f"{PROXY}{url}", headers=headers)
            with urllib.request.urlopen(request, timeout=90) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503) or attempt == 4:
                raise
            time.sleep(20 if PROXY else 3 * (attempt + 1))


def facet(data, key):
    for item in data.get("facets", []):
        if item.get("key") == key:
            return item.get("categories") or item.get("attributeGroup") or []
    return []


makes = {}
for site in SITES:
    top = get(f"{site}/lrp/api/search?l1CategoryId={CARS}&limit=1")
    time.sleep(PAUSE)
    for category in facet(top, "RelevantCategories"):
        if category.get("parentId") != CARS:
            continue
        name = category["label"].strip()
        make = makes.setdefault(name, {"id": category["id"], "key": category["key"], "models": {}})
        data = get(f"{site}/lrp/api/search?l1CategoryId={CARS}&l2CategoryIds={category['id']}&limit=1")
        for model in facet(data, "model"):
            make["models"].setdefault(model["attributeValueLabel"].strip(), model["attributeValueId"])
        time.sleep(PAUSE)

if len(makes) < 60:
    raise SystemExit(f"Only {len(makes)} makes: Marktplaats answered unexpectedly.")

lines = [
    "/* Generated from the Marktplaats and 2dehands search API (scripts/generate-marktplaats-catalog.py). Do not hand-edit. */",
    "window.AUTOGOOD_MARKTPLAATS_CATALOG = {",
    f'  "generatedFrom": {json.dumps(SITES)},',
    f'  "generatedAt": {json.dumps(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))},',
    '  "makes": {',
]
entries = []
for name, make in sorted(makes.items(), key=lambda item: item[0].lower()):
    models = [{"name": model, "id": model_id} for model, model_id in sorted(make["models"].items(), key=lambda item: item[0].lower())]
    entries.append(f"    {json.dumps(name, ensure_ascii=False)}: {json.dumps({'id': make['id'], 'key': make['key'], 'models': models}, ensure_ascii=False)}")
lines.append(",\n".join(entries))
lines += ["  }", "};", ""]
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{len(makes)} makes, {sum(len(m['models']) for m in makes.values())} models -> {OUTPUT}")
