#!/usr/bin/env python3
"""Audit of the Blocket.se filter mapping in src/blocket-search.js.

Blocket silently ignores a parameter or value it does not know, so every value
the page can send is checked against the live filter list and against
metadata.selected_filters (what Blocket says it applied). Also checks that the
make/model ids in src/blocket-catalog.generated.js still exist.

Run: python3 scripts/audit-blocket-search.py
"""
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = (ROOT / "src" / "blocket-search.js").read_text(encoding="utf-8")
CATALOG = (ROOT / "src" / "blocket-catalog.generated.js").read_text(encoding="utf-8")
API = "https://www.blocket.se/mobility/search/api/search/SEARCH_ID_CAR_USED"

# Value map in the page -> Blocket query parameter it feeds.
MAPS = {
    "blocketBodyValues": "body_type",
    "blocketFuelValues": "fuel",
    "blocketDriveValues": "wheel_drive",
    "blocketGearboxValues": "transmission",
    "blocketSellerValues": "dealer_segment",
    "blocketExteriorColorValues": "exterior_colour",
    "blocketEquipment": "car_equipment",
    "blocketSalesForms": "sales_form",
}
RANGES = ["price", "mileage", "year", "engine_effect"]
FIXED = [("vat_deductible", "true"), ("sort", "PRICE_ASC")]


def api(params=()):
    url = API + ("?" + urllib.parse.urlencode(list(params)) if params else "")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 AUTOGOOD audit"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def literal(name):
    match = re.search(rf"const {name} = ([\[{{].*?[\]}}]);", SOURCE, re.S)
    if not match:
        raise SystemExit(f"Missing {name} in blocket-search.js")
    return set(re.findall(r'"(\d+|true)"', match.group(1)))


failures = []
data = api()
filters = {item["name"]: item for item in data["filters"]}
total = data["metadata"]["result_size"]["match_count"]
print(f"Blocket: {total} cars, {len(filters)} filters")

for name, param in MAPS.items():
    known = {item["value"] for item in filters.get(param, {}).get("filter_items", [])}
    for value in sorted(literal(name), key=lambda v: (len(v), v)):
        if value not in known:
            failures.append(f"{name}: {param}={value} is not in Blocket's filter list")
            continue
        applied = api([(param, value)])
        pairs = {(p["parameter_name"], p["parameter_value"]) for f in applied["metadata"]["selected_filters"] for p in f["parameters"]}
        count = applied["metadata"]["result_size"]["match_count"]
        if (param, value) not in pairs:
            failures.append(f"{name}: {param}={value} was not applied")
        elif count == total:
            failures.append(f"{name}: {param}={value} did not change the result count")
    print(f"  {name:28} {param:16} ok" if not any(name in f for f in failures) else f"  {name:28} {param:16} FAILED")

for name in RANGES:
    item = filters.get(name)
    if not item or item.get("name_from") != f"{name}_from" or item.get("name_to") != f"{name}_to":
        failures.append(f"range {name}: Blocket no longer takes {name}_from / {name}_to")
print(f"  ranges {', '.join(RANGES)}: {'ok' if not any('range' in f for f in failures) else 'FAILED'}")
if filters.get("mileage", {}).get("unit") != "mil":
    failures.append("mileage is no longer in Swedish mil (the page divides km by 10)")

for param, value in FIXED:
    applied = api([(param, value)])
    if param == "sort":
        if applied["metadata"].get("sort") != value:
            failures.append(f"sort={value} not applied")
    else:
        pairs = {(p["parameter_name"], p["parameter_value"]) for f in applied["metadata"]["selected_filters"] for p in f["parameters"]}
        if (param, value) not in pairs:
            failures.append(f"{param}={value} was not applied")

# Catalog ids still valid: every make and model id Blocket lists today.
catalog = json.loads(CATALOG[CATALOG.index("{"):CATALOG.rindex("}") + 1])["makes"]
live_ids = set()


def walk(items):
    for item in items:
        live_ids.add(item["value"])
        walk(item.get("filter_items") or [])


walk(filters["variant"]["filter_items"])
ours = {make["id"] for make in catalog.values()} | {model["id"] for make in catalog.values() for model in make["models"]}
gone = sorted(ours - live_ids)
new = len(live_ids - ours)
print(f"  catalog: {len(ours)} ids, {len(gone)} no longer listed, {new} new on Blocket")
if len(gone) > 50:
    failures.append(f"{len(gone)} catalog ids are gone: run scripts/generate-blocket-catalog.py")

if failures:
    print("\nFAILED:")
    for failure in failures:
        print(" -", failure)
    sys.exit(1)
print("\nAll Blocket filters are applied by Blocket.")
