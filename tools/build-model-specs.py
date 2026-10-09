#!/usr/bin/env python3
"""Page-1 data for the dependent filters (B61 stage 4, PROJECT-MOBILE.md 4.8).

Reads the tables of stages 3 and 5 and writes src/model-specs/<brand>.js (one file per
brand, loaded by src/mobile-model-specs.js when the brand is chosen) and
src/model-specs/index.js (brands, files, versions); per model:
window.AUTOGOOD_MODEL_SPECS_LOADED["<brand>"]["<brand>|<model>"] =
  gens:     [code, phase, from, to|null, mobileModel, liftYear|null] newest first
            phase: pre | fl | fl2 | upd | all
  versions: [gen index, fuel, cm3, hp, kW, gearbox, drive, mild, token]
            fuel: petrol diesel hybrid_petrol hybrid_diesel plugin electric
                  (CNG/LPG/E85 count as petrol), gearbox a|m|"" (unknown),
            drive f|r|4, mild 1 = mild hybrid, token = BMW/Mercedes/Audi model
            number from the version name ("320", "m340", "220", "s3") for
            sub-models such as "320" or "C 220"; duplicates merged.
  trims:    [from, to|null, lines[], sport[], editions[]]
  bodies:   [gen index, types[], doors from, doors to, seats from, seats to, sliding 0|1]
            doors and seats from autocentrum.pl where data/model-engines.csv has them
            (with_autocentrum), otherwise from the ultimatespecs body names (body_of below, owner 2026-10-04):
            types = page-1 "Nadwozie" values (limousine estate suv hatchback
            coupe cabrio van_minibus); a 4-door coupe or liftback counts as
            both; doors and seats are ranges, wide where a name does not say.

Run after tools/build-model-engine-table.py and tools/build-model-trims.py:

    python3 tools/build-model-specs.py
"""
import csv
import datetime
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PHASES = {"дорестайлинг": "pre", "рестайлинг": "fl", "рестайлинг 2": "fl2", "обновление": "upd", "весь выпуск": "all"}
FUELS = {
    "бензин": "petrol", "газ (CNG)": "petrol", "газ (LPG)": "petrol", "бензин/E85 (Flexible Fuel)": "petrol",
    "дизель": "diesel", "гибрид": "hybrid_petrol", "гибрид (дизель)": "hybrid_diesel",
    "плагин-гибрид": "plugin", "электро": "electric",
}
GEARBOX = {"автомат": "a", "автомат (робот)": "a", "механика": "m"}
DRIVE = {"передний": "f", "задний": "r", "полный": "4"}
# Base trims are no words a listing carries: they would only narrow the search to nothing.
BASE_TRIMS = {"basis", "base", "standard", "podstawowa"}


def years(text):
    match = re.match(r"(\d{4})\s*–\s*(\d{4}|н\. в\.)", text)
    if not match:
        return None, None
    return int(match.group(1)), (None if match.group(2) == "н. в." else int(match.group(2)))


def token(brand, name):
    lower = name.lower()
    if brand == "BMW":
        match = re.search(r"\b(m?\d{3})[a-z]*\b", lower) or re.search(r"\b(m\d)\b", lower)
        return match.group(1) if match else ""
    if brand == "Mercedes-Benz":
        cleaned = re.sub(r"\(?\b[wcxvs]\d{3}\b\)?", " ", lower)
        match = re.search(r"(?<![\d.])(\d{2,3})(?![\d.]|\s?hp|\s?ps|\s?kw)", cleaned)
        return match.group(1) if match else ""
    if brand == "Audi":
        match = re.search(r"\b(rs ?q?\d|s ?q?\d)\b", lower)
        return match.group(1).replace(" ", "") if match else ""
    return ""


# Page-1 body types of a version from its ultimatespecs body name ("Golf 7
# Variant", "A3 Sportback (8V 2016)", "F36 4 Series Gran Coupe"); a name with
# no body word takes the model's own default.
VAN_MODELS = {("Ford", "C-Max"), ("Ford", "S-Max"), ("Renault", "Trafic"), ("Volkswagen", "T6"), ("Volkswagen", "Touran"), ("Renault", "Scenic")}
SUV_MODELS = {
    ("Audi", "Q3"), ("Audi", "Q5"), ("Audi", "Q7"), ("BMW", "X1"), ("BMW", "X3"), ("BMW", "X5"), ("Ford", "Kuga"),
    ("Mercedes-Benz", "GLC"), ("Mercedes-Benz", "GLE"), ("Peugeot", "2008"), ("Peugeot", "3008"), ("Peugeot", "5008"),
    ("Renault", "Captur"), ("Renault", "Kadjar"), ("Skoda", "Kamiq"), ("Skoda", "Karoq"), ("Skoda", "Kodiaq"),
    ("Toyota", "C-HR"), ("Toyota", "RAV 4"), ("Volvo", "XC40"), ("Volvo", "XC60"), ("Volvo", "XC90"),
    ("Volkswagen", "T-Roc"), ("Volkswagen", "Tiguan"),
}
DEFAULT_TYPE = {
    ("Audi", "A3"): "hatchback", ("Audi", "A4"): "limousine", ("Audi", "A5"): "coupe", ("Audi", "A6"): "limousine",
    ("BMW", "1"): "hatchback", ("BMW", "3"): "limousine", ("BMW", "4"): "coupe", ("BMW", "5"): "limousine",
    ("Ford", "Fiesta"): "hatchback", ("Ford", "Focus"): "hatchback", ("Ford", "Mondeo"): "limousine",
    ("Mercedes-Benz", "A"): "hatchback", ("Mercedes-Benz", "C"): "limousine", ("Mercedes-Benz", "E"): "limousine",
    ("Mercedes-Benz", "S"): "limousine", ("Mercedes-Benz", "CLA"): "coupe+limousine",
    ("Peugeot", "208"): "hatchback", ("Peugeot", "308"): "hatchback", ("Peugeot", "508"): "limousine",
    ("Renault", "Clio"): "hatchback", ("Renault", "Megane"): "hatchback", ("Skoda", "Fabia"): "hatchback",
    ("Skoda", "Octavia"): "limousine", ("Skoda", "Superb"): "limousine", ("Toyota", "Auris"): "hatchback",
    ("Toyota", "Avensis"): "limousine+estate", ("Toyota", "Camry"): "limousine", ("Toyota", "Corolla"): "limousine",
    ("Toyota", "Yaris"): "hatchback", ("Volvo", "S60"): "limousine", ("Volvo", "V40"): "hatchback",
    ("Volvo", "V60"): "estate", ("Volkswagen", "Golf"): "hatchback", ("Volkswagen", "Passat"): "limousine",
    ("Volkswagen", "Polo"): "hatchback",
}
# Hatchbacks sold with 5 doors only (the rest: 3 or 5 unless the name says).
FIVE_DOOR_HATCHES = {("Volkswagen", "Golf"), ("Volkswagen", "Polo"), ("Ford", "Focus"), ("Toyota", "Auris"), ("Volvo", "V40"),
                     ("Renault", "Megane"), ("Skoda", "Fabia"), ("Peugeot", "308"), ("BMW", "1")}
SEVEN_SEATS = ("q7", "x5", "xc90", "kodiaq", "5008", "s-max", "grand c max", "grand scenic", "touran", "allspace", "gle")


def body_of(brand, model, name):
    """(types, doors from, doors to, seats from, seats to, sliding) of one body name."""
    n = name.lower().replace("é", "e")
    key = (brand, model)
    types = None
    if re.search(r"cabrio|convertible|roadster|spider|spyder|\bcc\b", n):
        types = ["cabrio"]
    elif key in VAN_MODELS and not (model == "Scenic" and re.search(r"scenic 5", n)):
        types = ["van_minibus"]
    elif "sportsvan" in n or "gran tourer" in n or "active tourer" in n:
        types = ["van_minibus"]
    elif model == "5008" and not re.search(r"5008 (ii|iii|2021)", n):
        types = ["van_minibus"]
    elif key in SUV_MODELS or (model == "Scenic"):
        types = ["suv"]
    elif "gran coupe" in n:
        types = ["coupe", "limousine"]
    elif "shooting brake" in n:
        types = ["estate"]
    elif "coupe" in n:
        types = ["coupe", "limousine"] if model == "CLA" else ["coupe"]
    elif re.search(r"gran turismo|\bgt\b", n):
        types = ["limousine"]
    elif re.search(r"avant|variant|touring|estate|\bsw\b|combi|kombi|grand tour|sport ?tourer|sportbreak|break|wagon|allroad|alltrack|station|all[- ]terrain|scout|rxh", n):
        types = ["estate"]
    elif re.search(r"sedan|limousine|saloon", n):
        types = ["limousine"]
    elif re.search(r"\b[35][- ]?doors?\b|[35]doors|hatchback|sportback", n):
        types = ["hatchback"] if not (model in ("A5",) and "sportback" in n) else ["limousine"]
    elif model == "Camry" and "solara" in n:
        types = ["coupe"]
    else:
        default = DEFAULT_TYPE.get(key, "")
        types = default.split("+") if default else []
    if model == "A5" and "sportback" in n:
        types = ["limousine"]
    if model == "A3" and "sportback" in n:
        types = ["hatchback"]
    # Doors (the form's 2/3, 4/5, 6/7).
    if re.search(r"\b3[- ]?doors?\b|3doors|3 door", n):
        doors = (3, 3)
    elif re.search(r"\b5[- ]?doors?\b|5doors|5 door|sportback|allstreet", n):
        doors = (5, 5)
    elif types == ["cabrio"]:
        doors = (2, 2)
    elif types == ["coupe"]:
        doors = (2, 3)
    elif types == ["hatchback"]:
        if key in FIVE_DOOR_HATCHES:
            doors = (5, 5)
        elif model == "A3" and not re.search(r"allstreet", n):
            doors = (3, 3)
        else:
            doors = (3, 5)
    elif types == ["van_minibus"]:
        doors = (4, 5)
    elif not types:
        doors = (2, 5)
    else:
        doors = (4, 5)
    # Seats: 5, coupes and cabrios 4, the 7-seaters up to 7, vans 2-9.
    if model in ("T6", "Trafic"):
        seats = (2, 9)
    elif any(word in n or word == model.lower() for word in SEVEN_SEATS):
        seats = (5, 7)
    elif types and set(types) <= {"coupe", "cabrio"}:
        seats = (2, 4)
    else:
        seats = (4, 5)
    sliding = 1 if model in ("T6", "Trafic") or "grand c max" in n else 0
    return types, doors[0], doors[1], seats[0], seats[1], sliding


def with_autocentrum(types, doors, seats, ac_doors, ac_seats):
    """Doors and seats of a body from autocentrum.pl (columns "Двери"/"Места", "5" or "3/5";
    tools/autocentrum.py). Doors replace a guess (a range body_of could not narrow); seats only
    widen ours: autocentrum names one seat count per body and misses the 7-seat options
    (Kodiaq, XC90), and its cargo vans (2-3 seats) are not the passenger bodies."""
    door_values = [int(v) for v in ac_doors.split("/") if v]
    if door_values and doors[0] != doors[1]:
        doors = (min(door_values), max(door_values))
    seat_values = [int(v) for v in ac_seats.split("/") if v and (int(v) > 3 or "van_minibus" in types)]
    if seat_values:
        seats = (min(seats[0], *seat_values), max(seats[1], *seat_values))
    return doors[0], doors[1], seats[0], seats[1]


def clean_names(items, model_names):
    """'Advance, Pro Line (Бенилюкс)' -> ['Advance', 'Pro Line']; body types and base trims out."""
    out = []
    for item in items:
        if "кузов" in item:
            continue
        text = re.sub(r"\s*\([^)]*\)", "", item).strip()
        for part in re.split(r",\s*|\s+/\s+", text):
            part = part.strip(" .")
            if not part or part.lower() in BASE_TRIMS or part.lower() in model_names:
                continue
            if part not in out:
                out.append(part)
    return out


def main():
    with open(os.path.join(ROOT, "data", "model-generations.json"), encoding="utf8") as handle:
        generations = json.load(handle)
    label_to_model = {(m["brand"], m["label"]): m["model"] for m in generations["models"]}

    models = {}
    with open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle, delimiter=";"):
            model = label_to_model.get((row["Марка"], row["Модель"]))
            if model is None:
                continue
            key = f"{row['Марка']}|{model}"
            entry = models.setdefault(key, {"gens": {}, "versions": set(), "bodies": set()})
            start, end = years(row["Годы (проверено)"])
            phase_text = row["Этап"]
            body_lift = re.match(r"рестайлинг \((\d{4})\)", phase_text)
            phase = "all" if body_lift else PHASES.get(phase_text, "all")
            gen_key = (row["Поколение"], start, end)
            gen = entry["gens"].setdefault(gen_key, {"code": row["Поколение"], "phase": phase, "from": start, "to": end,
                                                     "mobile": row["Модель mobile.de"], "lift": None})
            if body_lift:
                year = int(body_lift.group(1))
                gen["lift"] = year if gen["lift"] is None else min(gen["lift"], year)
            # Facelift year autocentrum gives where the versions cannot be split (tools/autocentrum.py).
            if row.get("Рестайлинг, год") and phase == "all" and gen["lift"] is None:
                gen["lift"] = int(row["Рестайлинг, год"])
            types, doors_from, doors_to, seats_from, seats_to, sliding = body_of(row["Марка"], model, row["Кузов"])
            doors_from, doors_to, seats_from, seats_to = with_autocentrum(
                types, (doors_from, doors_to), (seats_from, seats_to), row.get("Двери", ""), row.get("Места", ""))
            entry["bodies"].add((gen_key, tuple(types), doors_from, doors_to, seats_from, seats_to, sliding))
            fuel = FUELS.get(row["Топливо"], "petrol")
            mild = 1 if row["Топливо: примечание"].startswith("мягкий") else 0
            entry["versions"].add((gen_key, fuel, int(row["Объём, см³"] or 0), int(row["Мощность, л.с."] or 0),
                                   int(row["Мощность, кВт"] or 0), GEARBOX.get(row["Коробка"], ""),
                                   DRIVE.get(row["Привод"], "f"), mild, token(row["Марка"], row["Версия"])))

    with open(os.path.join(ROOT, "data", "model-trims.json"), encoding="utf8") as handle:
        trims = json.load(handle)["rows"]

    out = {}
    for key, entry in models.items():
        gens = sorted(entry["gens"].values(), key=lambda g: (g["from"] or 0, g["to"] or 9999), reverse=True)
        index = {(g["code"], g["from"], g["to"]): i for i, g in enumerate(gens)}
        versions = sorted(
            [index[v[0]], *v[1:]] for v in entry["versions"]
        )
        brand, model = key.split("|", 1)
        names = {model.lower(), brand.lower(), "golf", "passat", "polo", "tiguan", "t-roc", "q3", "multivan", "s-class"}
        model_trims = []
        for row in trims:
            if row["brand"] != brand or row["model"] != model:
                continue
            start, end = years(row["years"])
            model_trims.append([start, end, clean_names(row["trims"], names), clean_names(row["sport"], names),
                                clean_names(row["special"], names)])
        bodies = sorted([index[b[0]], list(b[1]), *b[2:]] for b in entry["bodies"])
        out[key] = {
            "gens": [[g["code"], g["phase"], g["from"], g["to"], g["mobile"], g["lift"]] for g in gens],
            "versions": versions,
            "trims": model_trims,
            "bodies": bodies,
        }

    # One file per brand (src/model-specs/<brand>.js), loaded only when that brand is chosen,
    # plus a small index the page always loads (owner 2026-10-05: do not weigh the page down).
    folder = os.path.join(ROOT, "src", "model-specs")
    os.makedirs(folder, exist_ok=True)
    for name in os.listdir(folder):
        if name.endswith(".js"):
            os.remove(os.path.join(folder, name))
    brands = {}
    for key in sorted(out):
        brands.setdefault(key.split("|", 1)[0], {})[key] = out[key]
    index = {"generatedAt": datetime.date.today().isoformat(),
             "source": "ultimatespecs.com + autocentrum.pl (engines), European sources (trims) - docs/MODEL-ENGINES.md, "
                       "docs/MODEL-AUTOCENTRUM-CHECK.md, docs/MODEL-TRIMS.md",
             "brands": {}}
    total = 0
    for brand, data in brands.items():
        file = re.sub(r"[^a-z0-9]+", "-", brand.lower()).strip("-") + ".js"
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        total += len(text)
        with open(os.path.join(folder, file), "w", encoding="utf8") as handle:
            handle.write("/* Generated by tools/build-model-specs.py. Do not hand-edit. */\n")
            handle.write("window.AUTOGOOD_MODEL_SPECS_LOADED = window.AUTOGOOD_MODEL_SPECS_LOADED || {};\n")
            handle.write(f"window.AUTOGOOD_MODEL_SPECS_LOADED[{json.dumps(brand)}] = {text};\n")
        index["brands"][brand] = {"file": file, "v": hashlib.sha1(text.encode("utf8")).hexdigest()[:10],
                                  "models": [key.split("|", 1)[1] for key in data]}
    with open(os.path.join(folder, "index.js"), "w", encoding="utf8") as handle:
        handle.write("/* Generated by tools/build-model-specs.py. Do not hand-edit. Brand files load on demand. */\n")
        handle.write(f"window.AUTOGOOD_MODEL_SPECS_INDEX = {json.dumps(index, ensure_ascii=False, separators=(',', ':'))};\n")
    print(f"models={len(out)} versions={sum(len(m['versions']) for m in out.values())} brands={len(brands)} "
          f"bytes={total} largest={max(len(json.dumps(d, separators=(',', ':'))) for d in brands.values())}")

if __name__ == "__main__":
    main()
