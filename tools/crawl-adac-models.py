#!/usr/bin/env python3
"""Whole models from the ADAC Autokatalog in the shape of data/autocentrum-models.json (B61 wave 4, owner
2026-10-23: brands neither autocentrum.pl nor ultimatespecs.com has — DFSK, BAIC, GWM Haval, Polestar 5 …).

data/model-list-adac.json names the models (brand, label, mobile = the page-1 model value, adac = the catalog's
model pages, "dfsk/fengon-5"). The sitemap gives a model's generation pages ("1generation", "2generation-facelift"),
a generation page the versions ("DFSK Fengon 5 1.5T CVT (08/23 - 07/26)"), a version page the data: engine kind,
kW / PS, cm3, fuel, gearbox, drive, body, doors, seats, model start and end. Written to data/adac-primary.json as
"primary" models, so tools/autocentrum.py merge() builds their rows as for autocentrum (the version page's gearbox
and drive go in as its "configs"). A "-facelift" generation page joins its base generation as "Facelifting" bodies.
robots.txt allows the catalog; one page every 2 s (tools/collect-trims-adac.py), cached in ~/.cache/autogood/adac.

    python3 tools/crawl-adac-models.py [--offline]
"""
import argparse
import collections
import html
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, "data", "model-list-adac.json")
OUT = os.path.join(ROOT, "data", "adac-primary.json")
SINCE = 2010

_spec = importlib.util.spec_from_file_location("adac_trims", os.path.join(ROOT, "tools", "collect-trims-adac.py"))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)   # fetch(), adac_generations(), BASE

ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI"}
# ADAC "Motorart" -> autocentrum's engine type (tools/autocentrum.py AC_FUEL): "Elektro", "PlugIn-Hybrid",
# "Voll-Hybrid", "Otto (Mild-Hybrid)", "Diesel", "Otto". A mild hybrid goes in as "Hybrydowe" named "Mild-Hybrid",
# so tools/mild_hybrids.py weighs it like autocentrum's (ADAC gives the maker's data, "Herstellerangabe").
KIND = [(r"plug-?in", "Hybrydowe plug-in"), (r"^elektro", "Elektryczne"), (r"diesel.*mild|mild.*diesel", "Hybrydowe Diesla"),
        (r"hybrid", "Hybrydowe"), (r"diesel", "Diesla")]
FUEL = [(r"autogas|lpg", "Benzynowe LPG"), (r"erdgas|cng", "Benzynowe CNG")]
BODY = {"SUV": "SUV", "Limousine": "Sedan", "Stufenheck": "Sedan", "Schrägheck": "Hatchback", "Kombi": "Kombi",
        "Coupe": "Coupe", "Cabrio": "Cabrio", "Van": "Van", "Pick-Up": "Pickup", "Kleinbus": "Van", "Kastenwagen": "Van",
        "Geländewagen": "SUV", "Bus": "Van", "Transporter": "Van", "Hochdach-Kombi": "Van", "Roadster": "Cabrio"}


def specs(page):
    """{"Motorart": "Otto", "Leistung maximal in kW (Systemleistung)": "101", …} of a version page."""
    text = html.unescape(re.sub(r"<[^>]+>", "\n", page.split("Inhaltsverzeichnis", 1)[-1]))
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    out = {}
    for key, value in zip(lines, lines[1:]):
        out.setdefault(key, value)
    return out


def number(text):
    """"1.997,3 ccm" -> 1997, "188" -> 188, "" -> 0 (German thousands dots and decimal commas)."""
    match = re.search(r"\d[\d.]*(?:,\d+)?", text or "")
    return round(float(match.group().replace(".", "").replace(",", "."))) if match else 0


def year(text):
    match = re.match(r"(\d{2})/(\d{2})", text or "")
    return 2000 + int(match.group(2)) if match else None


def version_links(page, model_path):
    """[(path, name)] of a generation page's versions."""
    out = {}
    for path, name in re.findall(r'href="/rund-ums-fahrzeug/autokatalog/marken-modelle/(' + re.escape(model_path)
                                 + r'/[^"/]+/\d+/)"[^>]*>(.*?)</a>', page, re.S):
        name = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", name))).strip()
        if 5 <= len(name) <= 160 and path not in out:
            out[path] = name
    return list(out.items())


def engine_of(path, name, data, label):
    kind_text = data.get("Motorart", "").lower()
    kind = next((t for pattern, t in KIND if re.search(pattern, kind_text)), "Benzynowe")
    if kind == "Benzynowe":
        kind = next((t for pattern, t in FUEL if re.search(pattern, data.get("Kraftstoffart", ""), re.I)), kind)
    kw = number(data.get("Leistung maximal in kW (Systemleistung)"))
    hp = number(data.get("Leistung maximal in PS (Systemleistung)"))
    cc = str(number(data.get("Hubraum (Verbrennungsmotor)")) or "")
    # "Schaltgetriebe" is manual; "Automat. Schaltgetriebe (Doppelkupplung)", CVT, "Reduktionsgetriebe" are not.
    gearbox = data.get("Getriebeart", "")
    words = "manualna" if re.search(r"schalt", gearbox, re.I) and not re.search(r"automat", gearbox, re.I) else \
        "automatyczna" if gearbox else ""
    drive = data.get("Antriebsart", "")
    words += {"vorderrad": " napęd: przedni", "hinterrad": " napęd: tylny", "allrad": " napęd: 4x4"}.get(
        next((k for k in ("vorderrad", "hinterrad", "allrad") if k in drive.lower()), ""), "")
    # "DFSK Fengon 5 1.5T CVT (08/23 - 07/26)" -> "1.5T CVT"
    short = re.sub(r"\s*\((?:\d{2}/\d{2}\s*-\s*\d{2}/\d{2}|ab \d{2}/\d{2})\)\s*$", "", name)
    short = re.sub(r"^.*?\b" + re.escape(label) + r"\b\s*", "", short, flags=re.I) or ("EV" if kind == "Elektryczne" else "")
    end = year(data.get("Modellende"))
    mild = "mild" in kind_text
    return {
        "slug": path.rstrip("/").rsplit("/", 1)[-1], "type": kind, "text": short + (" Mild-Hybrid" if mild else ""),
        "litres": f"{int(cc) / 1000:.1f}" if cc else "", "name": short, "hp": hp, "kw": kw or round(hp * 0.7355),
        "from": year(data.get("Modellstart")), "to": end if end and end < 2026 else None,
        "series_from": year(data.get("Baureihenstart")),
        "configs": [words.strip()] if words.startswith(("manualna", "automatyczna")) else [],
        "Pojemność skokowa": f"{cc} cm³" if cc else "", "Liczba miejsc": data.get("Sitzanzahl", ""),
        "doors": data.get("Türanzahl", ""), "body": BODY.get(data.get("Karosserie", ""), data.get("Karosserie", "")),
        "url": A.BASE + path, "source": "adac",
    }


def model_of(entry, catalog, offline):
    gens = collections.OrderedDict()
    for model_path in entry["adac"]:
        for gen_slug in catalog.get(model_path, []):
            number = re.match(r"(\d+)generation", gen_slug)
            facelift = "facelift" in gen_slug
            base = ROMAN.get(int(number.group(1)), number.group(1)) if number else gen_slug
            page = A.fetch(f"{model_path}/{gen_slug}/") if not offline else _cached(f"{model_path}/{gen_slug}/")
            bodies = collections.OrderedDict()
            for path, name in version_links(page or "", model_path):
                version = A.fetch(path) if not offline else _cached(path)
                data = specs(version) if version else {}
                engine = engine_of(path, name, data, entry["label"]) if data.get("Motorart") else None
                if not engine or not engine["hp"] or (engine["to"] and engine["to"] < SINCE):
                    continue
                key = engine.pop("body") or "Body"
                bodies.setdefault(key, []).append(engine)
            if not bodies:
                continue
            # The generation starts with its series ("Baureihenstart"), its versions may be later ones.
            first = min(e.pop("series_from") or e["from"] for b in bodies.values() for e in b if e["from"])
            last = None if any(e["to"] is None for b in bodies.values() for e in b) else \
                max(e["to"] for b in bodies.values() for e in b)
            group = gens.setdefault(base, {"path": f"adac:{model_path}:{base}", "name": base, "from": first,
                                           "to": last, "bodies": []})
            group["from"] = min(group["from"], first)
            group["to"] = None if None in (group["to"], last) else max(group["to"], last)
            for body, engines in bodies.items():
                doors = collections.Counter(e.pop("doors") for e in engines).most_common(1)[0][0]
                group["bodies"].append({"path": f"{A.BASE}{model_path}/{gen_slug}/{body}/",
                                        "name": body + (" Facelifting" if facelift else ""), "from": first,
                                        "to": last, "doors": doors, "seats": "", "engines": engines})
    return {"brand": entry["brand"], "label": entry["label"], "mobile": entry["mobile"], "primary": True,
            "source": "adac", "generations": list(gens.values())}


def _cached(path):
    name = os.path.join(A.CACHE, "pages", re.sub(r"[^A-Za-z0-9._-]+", "_", path.strip("/")) + ".html")
    return open(name, encoding="utf8", errors="ignore").read() if os.path.exists(name) else ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="build from the cache, fetch nothing")
    args = parser.parse_args()
    catalog = A.adac_generations()
    models = []
    for entry in json.load(open(LIST, encoding="utf8"))["models"]:
        model = model_of(entry, catalog, args.offline)
        models.append(model)
        engines = sum(len(b["engines"]) for g in model["generations"] for b in g["bodies"])
        print(f"{entry['brand']} {entry['label']}: {len(model['generations'])} generations, {engines} engines", flush=True)
        with open(OUT, "w", encoding="utf8") as handle:
            json.dump({"source": A.BASE, "since": SINCE, "models": models}, handle, ensure_ascii=False,
                      separators=(",", ":"))
            handle.write("\n")
    print("DONE", flush=True)


if __name__ == "__main__":
    sys.exit(main())
