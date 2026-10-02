#!/usr/bin/env python3
"""av.by (Belarus) make/model catalog for mobile.html.

av.by's own API lists the makes in the search form (filters/main/init) and the
models of each make (catalog/brand-items/<id>/models), all by numeric id.
Run: python3 scripts/generate-avby-catalog.py
"""
import json
import pathlib
import time
import urllib.request
from datetime import datetime, timezone

API = "https://api.av.by/offer-types/cars"
OUTPUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "avby-catalog.generated.js"
HEADERS = {"User-Agent": "Mozilla/5.0 AUTOGOOD catalog generator"}


def get(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def find_property(node, name):
    if isinstance(node, dict):
        if node.get("name") == name and node.get("options"):
            return node
        for value in node.values():
            found = find_property(value, name)
            if found:
                return found
    elif isinstance(node, list):
        for value in node:
            found = find_property(value, name)
            if found:
                return found
    return None


init = get(f"{API}/filters/main/init")
brands = find_property(init["blocks"], "brand")["options"]
makes = {}
for brand in brands:
    name = brand["label"].strip()
    models = get(f"{API}/catalog/brand-items/{brand['id']}/models")
    makes[name] = {"id": brand["id"], "models": [{"name": model["name"].strip(), "id": model["id"]} for model in models]}
    time.sleep(0.1)

if len(makes) < 100:
    raise SystemExit(f"Only {len(makes)} makes: av.by answered unexpectedly.")

lines = [
    "/* Generated from the av.by API (scripts/generate-avby-catalog.py). Do not hand-edit. */",
    "window.AUTOGOOD_AVBY_CATALOG = {",
    f'  "generatedFrom": {json.dumps(API)},',
    f'  "generatedAt": {json.dumps(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))},',
    '  "makes": {',
]
entries = [f"    {json.dumps(name, ensure_ascii=False)}: {json.dumps(make, ensure_ascii=False)}" for name, make in makes.items()]
lines.append(",\n".join(entries))
lines += ["  }", "};", ""]
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{len(makes)} makes, {sum(len(m['models']) for m in makes.values())} models -> {OUTPUT}")
