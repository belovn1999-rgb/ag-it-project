#!/usr/bin/env python3
"""Blocket.se make/model catalog for mobile.html.

Blocket's own search API lists every make, model series and model with its
numeric "variant" id (make 0.749, series 1.749.2132, model 2.749.2132.2001255).
Run: python3 scripts/generate-blocket-catalog.py
"""
import json
import pathlib
import urllib.request
from datetime import datetime, timezone

API = "https://www.blocket.se/mobility/search/api/search/SEARCH_ID_CAR_USED"
OUTPUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "blocket-catalog.generated.js"

request = urllib.request.Request(API, headers={"User-Agent": "Mozilla/5.0 AUTOGOOD catalog generator"})
with urllib.request.urlopen(request, timeout=60) as response:
    data = json.load(response)

variant = next(item for item in data["filters"] if item["name"] == "variant")
makes = {}
for make in variant["filter_items"]:
    nodes = []
    for child in make.get("filter_items") or []:
        grandchildren = child.get("filter_items") or []
        # A node with its own models is a series ("3-Serie", "C-Klass").
        node = {"name": child["display_name"], "id": child["value"]}
        if grandchildren:
            node["series"] = True
        nodes.append(node)
        for model in grandchildren:
            nodes.append({"name": model["display_name"], "id": model["value"], "parent": child["display_name"]})
    makes[make["display_name"]] = {"id": make["value"], "models": nodes}

if len(makes) < 100:
    raise SystemExit(f"Only {len(makes)} makes: Blocket answered unexpectedly.")

lines = [
    "/* Generated from the Blocket.se search API (scripts/generate-blocket-catalog.py). Do not hand-edit. */",
    "window.AUTOGOOD_BLOCKET_CATALOG = {",
    f'  "generatedFrom": {json.dumps(API)},',
    f'  "generatedAt": {json.dumps(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))},',
    '  "makes": {',
]
entries = [f"    {json.dumps(name, ensure_ascii=False)}: {json.dumps(make, ensure_ascii=False)}" for name, make in makes.items()]
lines.append(",\n".join(entries))
lines += ["  }", "};", ""]
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{len(makes)} makes, {sum(len(m['models']) for m in makes.values())} models/series -> {OUTPUT}")
