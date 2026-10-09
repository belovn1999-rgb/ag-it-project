#!/usr/bin/env python3
"""Second source for the model table: autocentrum.pl/dane-techniczne (B61 check).

For our 65 popular models (data/model-generations.json) and the other models of the
10 brands only autocentrum covers (data/model-list-autocentrum.json, stage 6) this reads
model page -> generations still made in 2010 or later -> bodies (with
"Facelifting") -> engines (fuel, litres, name, KM, kW, years) and, with
--engines, each engine page: the drivetrain options ("Wybierz parametry
napędu": gearbox, speeds, FWD/RWD/AWD, Euro norm), doors, seats, torque.

robots.txt allows /dane-techniczne/ and sets no crawl delay; we still wait
1 s between requests. Pages are cached, a rerun only fetches what is
missing. Output: data/autocentrum-models.json; compare with
tools/check-autocentrum.py.

    python3 tools/crawl-autocentrum.py [--engines] [--keep-compared] [--cache DIR]
"""
import argparse
import html
import json
import os
import re
import subprocess
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "autocentrum-models.json")
BASE = "https://www.autocentrum.pl/dane-techniczne/"
SINCE = 2010
DELAY = 1.0

# Our model (brand, label in data/model-generations.json) -> autocentrum model paths.
# Sub-models autocentrum keeps apart (Allroad, Vignale, Sportsvan, Allspace,
# Grand Scenic, Multivan/Caravelle...) belong to the same family, as on mobile.de.
MODELS = {
    ("Audi", "A3"): ["audi/a3"],
    ("Audi", "A4"): ["audi/a4"],
    ("Audi", "A5"): ["audi/a5"],
    ("Audi", "A6"): ["audi/a6", "audi/allroad"],  # autocentrum "allroad" = A6 allroad C5/C6
    ("Audi", "Q3"): ["audi/q3"],
    ("Audi", "Q5"): ["audi/q5", "audi/sq5"],
    ("Audi", "Q7"): ["audi/q7"],
    ("BMW", "Seria 1"): ["bmw/seria-1"],
    ("BMW", "Seria 3"): ["bmw/seria-3"],
    ("BMW", "Seria 4"): ["bmw/seria-4"],
    ("BMW", "Seria 5"): ["bmw/seria-5"],
    ("BMW", "X1"): ["bmw/x1"],
    ("BMW", "X3"): ["bmw/x3"],
    ("BMW", "X5"): ["bmw/x5"],
    ("Ford", "C-Max"): ["ford/c-max"],
    ("Ford", "Fiesta"): ["ford/fiesta", "ford/fiesta-vignale"],
    ("Ford", "Focus"): ["ford/focus", "ford/focus-vignale"],
    ("Ford", "Kuga"): ["ford/kuga", "ford/kuga-vignale"],
    ("Ford", "Mondeo"): ["ford/mondeo", "ford/mondeo-vignale"],
    ("Ford", "S-Max"): ["ford/s-max", "ford/s-max-vignale"],
    ("Mercedes-Benz", "Klasa A"): ["mercedes/klasa-a"],
    ("Mercedes-Benz", "Klasa C"): ["mercedes/klasa-c"],
    ("Mercedes-Benz", "Klasa E"): ["mercedes/klasa-e"],
    ("Mercedes-Benz", "Klasa S"): ["mercedes/klasa-s"],
    ("Mercedes-Benz", "CLA"): ["mercedes/cla"],
    ("Mercedes-Benz", "GLC"): ["mercedes/glc"],
    ("Mercedes-Benz", "GLE"): ["mercedes/gle"],
    ("Peugeot", "208"): ["peugeot/208"],
    ("Peugeot", "308"): ["peugeot/308"],
    ("Peugeot", "508"): ["peugeot/508"],
    ("Peugeot", "2008"): ["peugeot/2008"],
    ("Peugeot", "3008"): ["peugeot/3008"],
    ("Peugeot", "5008"): ["peugeot/5008"],
    ("Renault", "Captur"): ["renault/captur"],
    ("Renault", "Clio"): ["renault/clio"],
    ("Renault", "Kadjar"): ["renault/kadjar"],
    ("Renault", "Megane"): ["renault/megane"],
    ("Renault", "Scenic"): ["renault/scenic", "renault/grand-scenic"],
    ("Renault", "Trafic"): ["renault/trafic"],
    ("Skoda", "Fabia"): ["skoda/fabia"],
    ("Skoda", "Kamiq"): ["skoda/kamiq"],
    ("Skoda", "Karoq"): ["skoda/karoq"],
    ("Skoda", "Kodiaq"): ["skoda/kodiaq"],
    ("Skoda", "Octavia"): ["skoda/octavia"],
    ("Skoda", "Superb"): ["skoda/superb"],
    ("Toyota", "Auris"): ["toyota/auris"],
    ("Toyota", "Avensis"): ["toyota/avensis"],
    ("Toyota", "C-HR"): ["toyota/c-hr"],
    ("Toyota", "Camry"): ["toyota/camry"],
    ("Toyota", "Corolla"): ["toyota/corolla"],
    ("Toyota", "RAV 4"): ["toyota/rav4"],
    ("Toyota", "Yaris"): ["toyota/yaris"],
    ("Volvo", "S60"): ["volvo/s60"],
    ("Volvo", "V40"): ["volvo/v40"],
    ("Volvo", "V60"): ["volvo/v60"],
    ("Volvo", "XC40"): ["volvo/xc40"],
    ("Volvo", "XC60"): ["volvo/xc60"],
    ("Volvo", "XC90"): ["volvo/xc90"],
    ("Volkswagen", "Golf"): ["volkswagen/golf", "volkswagen/golf-plus", "volkswagen/golf-sportsvan"],
    ("Volkswagen", "Passat"): ["volkswagen/passat"],
    ("Volkswagen", "Polo"): ["volkswagen/polo"],
    ("Volkswagen", "T-Roc"): ["volkswagen/t-roc"],
    ("Volkswagen", "T6 (Multivan, Transporter)"): ["volkswagen/multivan", "volkswagen/caravelle",
                                                   "volkswagen/california"],
    ("Volkswagen", "Tiguan"): ["volkswagen/tiguan", "volkswagen/tiguan-allspace"],
    ("Volkswagen", "Touran"): ["volkswagen/touran"],
}

_last = [0.0]


def fetch(path, cache):
    """path like 'bmw/seria-3/g20-g21/' -> page text (cached)."""
    name = os.path.join(cache, re.sub(r"[^A-Za-z0-9._-]+", "_", path.strip("/")) + ".html")
    for _attempt in range(3):
        if os.path.exists(name) and os.path.getsize(name) > 20000:
            break
        wait = DELAY - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "-L", "--max-time", "60", "-A", UA, "-o", name, BASE + path], check=False)
        _last[0] = time.time()
    if not (os.path.exists(name) and os.path.getsize(name) > 20000):
        print(f"  ! not loaded: {path}", flush=True)
        return ""
    with open(name, encoding="utf8", errors="ignore") as handle:
        return handle.read()


def clean(text):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text))).strip()


def years(text):
    """'(2019 - teraz)' -> (2019, None); '(2012 - 2020)' -> (2012, 2020)."""
    match = re.search(r"\((\d{4})\s*-\s*(\d{4}|teraz)\)", text)
    if not match:
        return None, None
    return int(match.group(1)), (None if match.group(2) == "teraz" else int(match.group(2)))


def children(page, path):
    """Links one level below path with their <h2> name: [(slug, name)]."""
    out = []
    pattern = r'<a href="/dane-techniczne/' + re.escape(path) + r'([^/"]+)/"([^>]*)>(.*?)</a>'
    for match in re.finditer(pattern, page, re.S):
        title = re.search(r"<h2[^>]*>(.*?)</h2>", match.group(3), re.S)
        if title and match.group(1) not in [o[0] for o in out]:
            out.append((match.group(1), clean(title.group(1))))
    return out


def engine_types(page):
    """Checkbox value -> label ('9' -> 'Benzynowe')."""
    return {m.group(1): clean(m.group(3)) for m in re.finditer(
        r'name="engine-filter\[\]"\s+value="(\d+)"\s+id="([^"]+)"[^>]*>\s*<label[^>]*>(.*?)</label>', page, re.S)}


def engines(page, path):
    types = engine_types(page)
    out = []
    pattern = (r'<a href="/dane-techniczne/' + re.escape(path) +
               r'([^/"]+)/"\s+class="engine-link[^"]*"\s+data-engine-type="(\d+)">(.*?)</a>')
    for match in re.finditer(pattern, page, re.S):
        text = clean(match.group(3))
        parsed = re.match(r"(?:(\d+[.,]\d+)\s*)?(.*?)\s*(\d+)KM\s+(\d+)kW\s*\((?:od (\d{4})|(\d{4})-(\d{4})|(\d{4}))\)",
                          text)
        item = {"slug": match.group(1), "type": types.get(match.group(2), match.group(2)), "text": text}
        if parsed:
            item.update({
                "litres": (parsed.group(1) or "").replace(",", "."), "name": parsed.group(2).strip(),
                "hp": int(parsed.group(3)),
                "kw": int(parsed.group(4)), "from": int(parsed.group(5) or parsed.group(6) or parsed.group(8)),
                "to": int(parsed.group(7) or parsed.group(8)) if (parsed.group(7) or parsed.group(8)) else None,
            })
        out.append(item)
    return out


SLUG_FUEL = {"benzynowy-lpg": "Benzynowe LPG", "benzynowy": "Benzynowe", "diesla": "Diesla",
             "elektryczny": "Elektryczne", "hybrydowy": "Hybrydowe"}


def engines_from_slugs(page, path):
    """A body with one engine redirects to that engine page: read the engine from its link,
    'silnik-hybrydowy-2.5-hybrid-dynamic-force-218km-2018-2024'."""
    out = []
    for slug in dict.fromkeys(re.findall(r'href="/dane-techniczne/' + re.escape(path) + r'(silnik-[^/"]+)/"', page)):
        match = re.match(r"silnik-(benzynowy-lpg|benzynowy|diesla|elektryczny|hybrydowy)-(?:(\d+\.\d)-)?(.*?)-(\d+)km-"
                         r"(?:od-(\d{4})|(\d{4})-(\d{4}))$", slug)
        if not match:
            continue
        fuel = SLUG_FUEL[match.group(1)]
        name = match.group(3).replace("-", " ")
        if fuel == "Hybrydowe" and "plug in" in name:
            fuel = "Hybrydowe plug-in"
        hp = int(match.group(4))
        out.append({"slug": slug, "type": fuel, "text": f"{match.group(2) or ''} {name} {hp}KM".strip(),
                    "litres": match.group(2) or "", "name": name, "hp": hp, "kw": round(hp * 0.7355),
                    "from": int(match.group(5) or match.group(6)),
                    "to": int(match.group(7)) if match.group(7) else None})
    return out


def engine_details(page):
    """Drivetrain options plus the few fields the filters can use."""
    configs = [clean(o) for o in re.findall(
        r'<option data-id="\d+"[^>]*>(.*?)</option>', page.split('id="config-select"', 1)[1].split("</select>", 1)[0],
        re.S)] if 'id="config-select"' in page else []
    values = {}
    for row in re.split(r'<div class="dt-row(?: no-value)?">', page)[1:]:
        label = re.search(r'data-label="([^"]+)"', row)
        value = re.search(r'<span class="dt-param-value">(.*?)</span>', row, re.S)
        if label and value and clean(value.group(1)) and clean(label.group(1)) not in values:
            values[clean(label.group(1))] = clean(value.group(1))
    keep = ["Liczba drzwi", "Liczba miejsc", "Pojemność skokowa", "Typ silnika", "Moc silnika",
            "Maksymalny moment obrotowy", "Kod silnika", "Oznaczenie silnika",
            "Norma emisji spalin", "Produkowany", "Pojemność akumulatora"]
    # One drivetrain only: no list, the page states it ("automatyczna", "S-Tronic", "4x4").
    if not configs and values.get("Rodzaj skrzyni"):
        speeds = f" {values['Liczba biegów']} biegowa" if values.get("Liczba biegów") else ""
        name = f" {values['Nazwa skrzyni']}" if values.get("Nazwa skrzyni") else ""
        configs = [f"{values['Rodzaj skrzyni']}{name}{speeds} napęd: {values.get('Rodzaj napędu', '?')}"]
    return {"configs": configs, **{k: values[k] for k in keep if k in values}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engines", action="store_true", help="also read every engine page")
    parser.add_argument("--cache", default="/tmp/autocentrum-pages")
    parser.add_argument("--out", default=OUT)
    parser.add_argument("--keep-compared", action="store_true",
                        help="take our 65 models from the last output as they are (the page cache may be gone)")
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    previous = json.load(open(args.out, encoding="utf8")) if os.path.exists(args.out) else {}

    result = {"source": BASE, "since": SINCE, "collected": time.strftime("%Y-%m-%d"), "models": []}
    total_engines = 0
    # Our 65 models (compared with ultimatespecs) and, B61 stage 6, the other models of the
    # 10 brands that only autocentrum covers ("primary"; data/model-list-autocentrum.json).
    with open(os.path.join(ROOT, "data", "model-list-autocentrum.json"), encoding="utf8") as handle:
        extra = json.load(handle)["models"]
    todo = [({"brand": b, "label": l}, paths) for (b, l), paths in MODELS.items()]
    todo += [({"brand": m["brand"], "label": m["label"], "mobile": m["mobile"], "primary": True}, m["paths"]) for m in extra]
    kept = {(m["brand"], m["label"]): m for m in previous.get("models", []) if not m.get("primary")}
    for head, paths in todo:
        brand, label = head["brand"], head["label"]
        if args.keep_compared and not head.get("primary") and (brand, label) in kept:
            result["models"].append(kept[(brand, label)])
            continue
        model = {**head, "generations": []}
        for model_path in paths:
            page = fetch(model_path + "/", args.cache)
            listed = children(page, model_path + "/")
            # A model with one generation and one body: its page is the engine list (VW CC, Peugeot 108).
            # Or its page links the bodies' engines right away (BMW i8, VW ID. Buzz).
            spans = [(e["from"], e.get("to")) for e in engines(page, model_path + "/") if "from" in e]
            if not listed and not spans:
                for start, single, end in re.findall(r'href="/dane-techniczne/' + re.escape(model_path) +
                                                     r'/[^/"]+/silnik-[^"]*?-(?:od-(\d{4})|(\d{4})-(\d{4}))/"', page):
                    spans.append((int(start or single), int(end) if end else None))
            if not listed and spans:
                ends = [to for _from, to in spans]
                listed = [("", f"I ({min(f for f, _to in spans)} - {'teraz' if None in ends else max(ends)})")]
            for gen_slug, gen_name in listed:
                start, end = years(gen_name)
                if start is None or (end is not None and end < SINCE):
                    continue
                gen_path = f"{model_path}/{gen_slug}/" if gen_slug else f"{model_path}/"
                gen_page = fetch(gen_path, args.cache) if gen_slug else page
                gen = {"path": gen_path, "name": re.sub(r"\s*\(.*", "", gen_name), "from": start, "to": end,
                       "bodies": []}
                # A few generations show no body list: engines link into the bodies
                # (Camry IX .../sedan/silnik-...) or sit on the generation page itself.
                bodies = children(gen_page, gen_path)
                if not bodies:
                    deeper = re.findall(r'href="/dane-techniczne/' + re.escape(gen_path) + r'([^/"]+)/silnik-', gen_page)
                    bodies = [(slug, slug.replace("-", " ").title()) for slug in dict.fromkeys(deeper)]
                bodies = bodies or [("", gen_name)]
                for body_slug, body_name in bodies:
                    body_path = f"{gen_path}{body_slug}/" if body_slug else gen_path
                    b_start, b_end = years(body_name)
                    body_page = fetch(body_path, args.cache) if body_slug else gen_page
                    shape = engine_details(body_page)
                    body = {"path": body_path, "name": re.sub(r"\s*\(.*", "", body_name), "from": b_start,
                            "to": b_end, "doors": shape.get("Liczba drzwi", ""), "seats": shape.get("Liczba miejsc", ""),
                            "engines": engines(body_page, body_path) or engines_from_slugs(body_page, body_path)}
                    if args.engines:
                        for engine in body["engines"]:
                            engine.update(engine_details(fetch(body_path + engine["slug"] + "/", args.cache)))
                    total_engines += len(body["engines"])
                    gen["bodies"].append(body)
                model["generations"].append(gen)
                print(f"{brand} {label} {gen['name']} {start}-{end or ''}: {len(gen['bodies'])} bodies, "
                      f"{sum(len(b['engines']) for b in gen['bodies'])} engines", flush=True)
        result["models"].append(model)
        with open(args.out, "w", encoding="utf8") as handle:
            json.dump({**previous, **result}, handle, ensure_ascii=False, separators=(",", ":"))
            handle.write("\n")
    print(f"DONE engines={total_engines}", flush=True)


if __name__ == "__main__":
    main()
