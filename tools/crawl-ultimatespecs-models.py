#!/usr/bin/env python3
"""Whole models from ultimatespecs.com in the shape of data/autocentrum-models.json (B61, owner 2026-10-22:
the new brands of wave 2 while autocentrum.pl is down).

data/model-list-ultimatespecs.json names the models (brand, label, mobile = the page-1 model value, the
ultimatespecs model pages). A model page gives the generations ("Giulia (952) (2016 - Present)") with their body
pages, a body page the versions (fuel table: name, year, hp / kW, cm3). Written to
data/ultimatespecs-primary.json as "primary" models, so tools/autocentrum.py merge() builds their rows as for
autocentrum: a facelift generation ("… Facelift") joins its base generation with "Facelifting" bodies (the phases
split), gearbox and drive from the version name only (the version pages can fill them later:
tools/enrich-model-versions.py). robots.txt: Crawl-delay 30 — one page every 30 s, cached.

    python3 tools/crawl-ultimatespecs-models.py [--offline]
"""
import argparse
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, "data", "model-list-ultimatespecs.json")
OUT = os.path.join(ROOT, "data", "ultimatespecs-primary.json")
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
MANUAL = re.compile(r"\bmanual\b|\b\d-speed\b(?!.*auto)", re.I)


def config(item):
    """Gearbox and drive the version name gives, in autocentrum's words (tools/autocentrum.py config_parts)."""
    gearbox = "automatyczna" if item["gearbox"] == "automatic" else "manualna" if MANUAL.search(item["name"]) else ""
    if not gearbox:
        return []
    return [gearbox + (" napęd: 4x4" if item["awd"] else "")]


def model_of(entry, cache, offline):
    gens = {}
    for slug in entry["pages"]:
        path = os.path.join(cache, f"model_{slug}.html")
        if offline and not os.path.exists(path):
            continue
        source = G.page(cache, entry["brand_slug"], slug)
        for gen in G.generations(source):
            if (gen["to"] or 2100) < SINCE:
                continue
            base = FACELIFT.sub("", gen["generation"]).strip() or gen["generation"]
            facelift = base != gen["generation"].strip()
            group = gens.setdefault(base, {"path": f"ultimatespecs:{slug}:{base}", "name": base, "from": gen["from"],
                                           "to": gen["to"], "bodies": []})
            group["from"] = min(group["from"], gen["from"])
            group["to"] = None if None in (group["to"], gen["to"]) else max(group["to"], gen["to"])
            for body in gen["bodies"]:
                page = E.cached_page(cache, body["url"], offline)
                if not page:
                    continue
                engines = []
                for item in E.versions(page):
                    if not item["hp"] or (item["year"] and item["year"] < SINCE - 1):
                        continue
                    engines.append({
                        "slug": item["url"].rsplit("/", 1)[-1], "type": TYPE.get(item["fuel"], "Benzynowe"),
                        "text": item["name"], "litres": f"{item['cc'] / 1000:.1f}" if item["cc"] else "",
                        "name": item["name"], "hp": item["hp"], "kw": item["kw"] or round(item["hp"] * 0.7355),
                        "from": item["year"] or gen["from"], "to": None, "configs": config(item),
                        "Pojemność skokowa": f"{item['cc']} cm3" if item["cc"] else "",
                        "url": item["url"], "source": "ultimatespecs",
                    })
                name = body["name"] + (" Facelifting" if facelift else "")
                group["bodies"].append({"path": body["url"] + "/", "name": name, "from": gen["from"], "to": gen["to"],
                                        "doors": "", "seats": "", "engines": engines})
    generations = [g for g in gens.values() if any(b["engines"] for b in g["bodies"])]
    return {"brand": entry["brand"], "label": entry["label"], "mobile": entry["mobile"], "primary": True,
            "source": "ultimatespecs", "generations": generations}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=os.path.expanduser("~/.cache/autogood/ultimatespecs"))
    parser.add_argument("--offline", action="store_true", help="build from the cache, fetch nothing")
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    entries = json.load(open(LIST, encoding="utf8"))["models"]
    models = []
    for entry in entries:
        model = model_of(entry, args.cache, args.offline)
        models.append(model)
        engines = sum(len(b["engines"]) for g in model["generations"] for b in g["bodies"])
        print(f"{entry['brand']} {entry['label']}: {len(model['generations'])} generations, {engines} engines", flush=True)
        with open(OUT, "w", encoding="utf8") as handle:
            json.dump({"source": "https://www.ultimatespecs.com/car-specs", "since": SINCE, "models": models},
                      handle, ensure_ascii=False, separators=(",", ":"))
            handle.write("\n")
    print("DONE", flush=True)


if __name__ == "__main__":
    sys.exit(main())
