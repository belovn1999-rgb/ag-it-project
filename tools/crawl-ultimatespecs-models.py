#!/usr/bin/env python3
"""Whole models from ultimatespecs.com in the shape of data/autocentrum-models.json (B61, owner 2026-10-22:
the new brands of wave 2 while autocentrum.pl is down).

data/model-list-ultimatespecs.json names the models (brand, label, mobile = the page-1 model value, the
ultimatespecs model pages). A model page gives the generations ("Giulia (952) (2016 - Present)") with their body
pages, a body page the versions (fuel table: name, year, hp / kW, cm3). A model with one generation is linked
from the brand page straight to its body page ("direct": "/car-specs/Polestar/M13016/3", wave 4 2026-10-23):
one generation, its first year the earliest version's, its end "to" of the list (none — still made). A body
"2 (Facelift 2023)" is the facelift of its generation (a "Facelifting" body from 2023). Written to
data/ultimatespecs-primary.json as "primary" models, so tools/autocentrum.py merge() builds their rows as for
autocentrum: a facelift generation ("… Facelift") joins its base generation with "Facelifting" bodies (the phases
split), gearbox and drive from the version name only (the version pages can fill them later:
tools/enrich-model-versions.py). robots.txt: Crawl-delay 30 — one page every 30 s, cached.

    python3 tools/crawl-ultimatespecs-models.py [--offline]
    python3 tools/crawl-ultimatespecs-models.py --check [--offline]   # second-source check (owner 2026-10-25):
        the models of data/model-list-ultimatespecs-check.json (tools/plan-ultimatespecs-check.py) into
        data/ultimatespecs-check.json, not merged as rows — tools/confirm.py compares our rows with them.
"""
import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys
import time

import cache_age  # stage 21: re-read stale list pages (tools/cache_age.py)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, "data", "model-list-ultimatespecs.json")
OUT = os.path.join(ROOT, "data", "ultimatespecs-primary.json")
CHECK_LIST = os.path.join(ROOT, "data", "model-list-ultimatespecs-check.json")
CHECK_OUT = os.path.join(ROOT, "data", "ultimatespecs-check.json")
SINCE = 2010


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), os.path.join(ROOT, "tools", name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


G = load("generate-model-generations")   # page(), generations()
E = load("generate-model-engines")       # cached_page(), versions()
E._last_fetch = G._last_fetch            # one 30-second clock for both page kinds
TYPE = {"petrol": "Benzynowe", "diesel": "Diesla", "hybrid": "Hybrydowe", "hybrid_diesel": "Hybrydowe Diesla",
        "plugin": "Hybrydowe plug-in", "electric": "Elektryczne", "lpg": "Benzynowe LPG", "cng": "Benzynowe CNG"}
FACELIFT = re.compile(r"\s*[-–]?\s*(?:\d{4}\s*)?(?:facelift|restyling|lci|update)\b.*$", re.I)
BODY_FACELIFT = re.compile(r"\s*\((?:facelift|restyling|update)\s*(\d{4})?\)\s*", re.I)
# "G80 (RG3) - 2021 New Model" is the first phase of "G80 (RG3)" (its facelift is named without it).
NEW_MODEL = re.compile(r"\s*-\s*\d{4}\s+new model\s*$", re.I)
YEAR = re.compile(r"\s*\b(?:19|20)\d{2}\b")  # "G80 2017", "GV80 2024 Coupe" -> "G80", "GV80 Coupe"
MANUAL = re.compile(r"\bmanual\b|\b\d-speed\b(?!.*auto)", re.I)


def config(item):
    """Gearbox and drive the version name gives, in autocentrum's words (tools/autocentrum.py config_parts).
    Electric cars and hybrids are automatic (as tools/build-model-engine-table.py gearbox_for), an electric
    "Dual Motor" / "Tri Motor" has a motor on each axle (Polestar 2 Dual Motor, Tesla, wave 4 2026-10-23)."""
    auto = item["gearbox"] == "automatic" or item["fuel"] in ("electric", "hybrid", "plugin", "hybrid_diesel")
    gearbox = "automatyczna" if auto else "manualna" if MANUAL.search(item["name"]) else ""
    if not gearbox:
        return []
    awd = item["awd"] or (item["fuel"] == "electric" and re.search(r"\b(dual|tri)[- ]motor\b", item["name"], re.I))
    return [gearbox + (" napęd: 4x4" if awd else "")]


def engines_of(page, first):
    engines = []
    for item in E.versions(page):
        if not item["hp"] or (item["year"] and item["year"] < SINCE - 1):
            continue
        engines.append({
            "slug": item["url"].rsplit("/", 1)[-1], "type": TYPE.get(item["fuel"], "Benzynowe"),
            "text": item["name"], "litres": f"{item['cc'] / 1000:.1f}" if item["cc"] else "",
            "name": item["name"], "hp": item["hp"], "kw": item["kw"] or round(item["hp"] * 0.7355),
            "from": item["year"] or first, "to": None, "configs": config(item),
            "Pojemność skokowa": f"{item['cc']} cm³" if item["cc"] else "",
            "url": item["url"], "source": "ultimatespecs",
        })
    return engines


def body_of(url, name, first, last, engines, facelift=False):
    """A body; "2 (Facelift 2023)" -> "2 Facelifting" from 2023 (or from its earliest version)."""
    lift = BODY_FACELIFT.search(name)
    if lift:
        name = BODY_FACELIFT.sub(" ", name).strip()
        first = int(lift.group(1)) if lift.group(1) else min((e["from"] for e in engines), default=first)
        facelift = True
    name = YEAR.sub("", name).strip() or name
    return {"path": url + "/", "name": name + (" Facelifting" if facelift else ""), "from": first, "to": last,
            "doors": "", "seats": "", "engines": engines}


def direct_of(entry, item, cache, offline):
    """A generation from a body page the brand page links to straight away."""
    url = "https://www.ultimatespecs.com" + item["url"]
    page = E.cached_page(cache, url, offline)
    if not page:
        return None
    engines = engines_of(page, None)
    years = [e["from"] for e in engines if e["from"]]
    if not years:
        return None
    first = item.get("from") or min(years)
    for engine in engines:
        engine["from"] = max(engine["from"] or first, first)
    name = item.get("name") or entry["label"]
    return {"path": f"ultimatespecs:{item['url']}", "name": name, "from": first, "to": item.get("to"),
            "bodies": [body_of(url, item.get("body") or name, first, item.get("to"), engines)]}


def model_page(cache, brand_slug, slug, offline):
    """The model page (cached as tools/generate-model-generations.py does): three tries, one request per 30 s;
    a site that does not answer leaves the model out instead of stopping the run (Mercedes SLK, 25.10)."""
    path = os.path.join(cache, f"model_{slug}.html")
    if not offline:
        cache_age.begin(path)   # a refresh (stage 21)
    for _attempt in range(3):
        if os.path.exists(path) and os.path.getsize(path) > 10000:
            break
        if offline:
            return ""
        wait = 30 - (time.time() - G._last_fetch[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "--max-time", "60", "-A", G.UA, "-o", path,
                        f"{G.BASE}/{brand_slug}-models/{slug}"], check=False)
        G._last_fetch[0] = time.time()
    else:
        cache_age.finish(path, 10000)
        if not (os.path.exists(path) and os.path.getsize(path) > 10000):
            print(f"   no answer: {brand_slug} {slug}", flush=True)
            return ""
    cache_age.finish(path, 10000)
    with open(path, encoding="utf8", errors="ignore") as handle:
        return handle.read()


def model_of(entry, cache, offline):
    gens = {}
    for slug in entry.get("pages", []):
        source = model_page(cache, entry["brand_slug"], slug, offline)
        if not source:
            continue
        for gen in sorted(G.generations(source), key=lambda item: item["from"]):  # a facelift after its base
            if (gen["to"] or 2100) < SINCE:
                continue
            named = NEW_MODEL.sub("", gen["generation"]).strip()
            base = FACELIFT.sub("", named).strip() or named
            # A generation of the same name as an earlier one is its facelift ("G80 (RG3)" after
            # "G80 (RG3) - 2021 New Model"; "GV60" after "GV60 - 2021 New Model").
            facelift = base != named or (base in gens and gen["from"] > gens[base]["from"])
            group = gens.setdefault(base, {"path": f"ultimatespecs:{slug}:{base}", "name": base, "from": gen["from"],
                                           "to": gen["to"], "bodies": []})
            group["from"] = min(group["from"], gen["from"])
            group["to"] = None if None in (group["to"], gen["to"]) else max(group["to"], gen["to"])
            for body in gen["bodies"]:
                page = E.cached_page(cache, body["url"], offline)
                if not page:
                    continue
                group["bodies"].append(body_of(body["url"], body["name"], gen["from"], gen["to"],
                                               engines_of(page, gen["from"]), facelift))
    generations = [g for g in gens.values() if any(b["engines"] for b in g["bodies"])]
    for item in entry.get("direct", []):
        gen = direct_of(entry, item, cache, offline)
        if gen:
            generations.append(gen)
    return {"brand": entry["brand"], "label": entry["label"], "mobile": entry["mobile"], "primary": True,
            "source": "ultimatespecs", "generations": generations}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=os.path.expanduser("~/.cache/autogood/ultimatespecs"))
    parser.add_argument("--offline", action="store_true", help="build from the cache, fetch nothing")
    parser.add_argument("--check", action="store_true", help="the second-source check list and file")
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    out_path = CHECK_OUT if args.check else OUT
    entries = json.load(open(CHECK_LIST if args.check else LIST, encoding="utf8"))["models"]
    models = []
    for entry in entries:
        model = model_of(entry, args.cache, args.offline)
        if args.check:
            model.update({"primary": False, "source": "ultimatespecs-check"})
        models.append(model)
        engines = sum(len(b["engines"]) for g in model["generations"] for b in g["bodies"])
        print(f"{entry['brand']} {entry['label']}: {len(model['generations'])} generations, {engines} engines", flush=True)
        with open(out_path, "w", encoding="utf8") as handle:
            json.dump({"source": "https://www.ultimatespecs.com/car-specs", "since": SINCE, "models": models},
                      handle, ensure_ascii=False, separators=(",", ":"))
            handle.write("\n")
    print("DONE", flush=True)


if __name__ == "__main__":
    sys.exit(main())
