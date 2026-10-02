#!/usr/bin/env python3
"""Audit of the av.by filter mapping in src/avby-search.js.

av.by silently drops a property or value it does not know, so every value the
page can send is checked against av.by's own filter list and against
initialValue (the filters av.by says it accepted); each one must also change
the result count. The make/model ids in src/avby-catalog.generated.js are
checked against av.by's catalogue. av.by answers bursts with 429: one request
a second.

Run: python3 scripts/audit-avby-search.py
"""
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = (ROOT / "src" / "avby-search.js").read_text(encoding="utf-8")
CATALOG = (ROOT / "src" / "avby-catalog.generated.js").read_text(encoding="utf-8")
API = "https://api.av.by/offer-types/cars"
HEADERS = {"User-Agent": "Mozilla/5.0 AUTOGOOD audit", "Content-Type": "application/json"}
# A big make, so every option has offers: Volkswagen.
BASE = [{"name": "brands", "value": [[{"name": "brand", "value": 1216}]]}]

# Value map in the page -> av.by property it feeds.
MAPS = {
    "avbyBodyValues": "body_type",
    "avbyFuelValues": "engine_type",
    "avbyGearboxValues": "transmission_type",
    "avbyDriveValues": "drive_type",
    "avbySellerValues": "seller_type",
    "avbyExteriorColorValues": "color",
    "avbyInteriorMaterialValues": "interior_material",
    "avbyFeatureOptions": "options",
    "avbyParkingOptions": "options",
    "avbyAirConditioningOptions": "options",
    "AVBY_OPTION": "options",
    "AVBY_CONDITION": "condition",
}
RANGES = ["year", "price_usd", "engine_capacity", "engine_power_hp", "mileage_km"]


def request(path, body=None):
    for attempt in range(5):
        time.sleep(1.0)
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"{API}{path}", data=data, headers=HEADERS, method="POST" if body is not None else "GET")
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429:
                time.sleep(3 * (attempt + 1))
                continue
            raise
    raise SystemExit("av.by keeps answering 429")


def literal_values(name):
    match = re.search(rf"const {name} = (\{{.*?\}});", SOURCE, re.S)
    if not match:
        raise SystemExit(f"Missing {name} in avby-search.js")
    body = re.sub(r"//[^\n]*", "", match.group(1))
    return sorted({int(value) for value in re.findall(r"(?<![\w.])(\d+)(?![\w.])", body)})


def find_property(node, name):
    if isinstance(node, dict):
        if node.get("name") == name and "fallbackType" in node:
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


def accepted(result):
    return urllib.parse.parse_qsl(result.get("initialValue") or "")


failures = []
init = request("/filters/main/init")
base = request("/filters/main/apply", {"page": 1, "properties": BASE, "sorting": 2})
total = base["count"]
print(f"av.by: Volkswagen {total} cars")

for name, prop in MAPS.items():
    definition = find_property(init["blocks"], prop)
    known = {option["id"] for option in (definition or {}).get("options") or []}
    for value in literal_values(name):
        if value not in known:
            failures.append(f"{name}: {prop}={value} is not in av.by's filter list")
            continue
        result = request("/filters/main/apply", {"page": 1, "properties": BASE + [{"name": prop, "value": [value]}], "sorting": 2})
        if not any(key.startswith(f"{prop}[") and str(val) == str(value) for key, val in accepted(result)):
            failures.append(f"{name}: {prop}={value} was not accepted")
        elif result["count"] == total and prop != "condition":
            failures.append(f"{name}: {prop}={value} did not change the result count")
    print(f"  {name:28} {prop:18} {'FAILED' if any(name in f for f in failures) else 'ok'}")

for prop in RANGES:
    result = request("/filters/main/apply", {"page": 1, "properties": BASE + [{"name": prop, "value": {"min": 1}}], "sorting": 2})
    if not any(key == f"{prop}[min]" for key, _ in accepted(result)):
        failures.append(f"range {prop}: {{min, max}} is no longer accepted")
for prop, value in [("has_nds", True), ("description", "Highline")]:
    result = request("/filters/main/apply", {"page": 1, "properties": BASE + [{"name": prop, "value": value}], "sorting": 2})
    if not any(key == prop for key, _ in accepted(result)):
        failures.append(f"{prop} is no longer accepted")
print(f"  ranges, VAT, words: {'FAILED' if any('range' in f or 'accepted' in f and ('has_nds' in f or 'description' in f) for f in failures) else 'ok'}")

# The site's own link for a search is what our builder must write.
seo = base["seo"]["currentPage"]["url"]
if not seo.startswith("https://cars.av.by/filter?brands[0][brand]=1216"):
    failures.append(f"av.by writes its links differently now: {seo}")

catalog = json.loads(CATALOG[CATALOG.index("{"):CATALOG.rindex("}") + 1])["makes"]
live_brands = {option["id"] for option in find_property(init["blocks"], "brand")["options"]}
gone = [name for name, make in catalog.items() if make["id"] not in live_brands]
print(f"  catalog: {len(catalog)} makes, {len(gone)} no longer listed")
if len(gone) > 10:
    failures.append(f"{len(gone)} catalog makes are gone: run scripts/generate-avby-catalog.py")

if failures:
    print("\nFAILED:")
    for failure in failures:
        print(" -", failure)
    sys.exit(1)
print("\nAll av.by filters are accepted by av.by.")
