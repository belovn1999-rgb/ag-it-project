"""autocentrum.pl as the second source of the model table (B61, PROJECT-MOBILE.md 4.8).

Shared by tools/check-autocentrum.py (what autocentrum has and we have not) and
tools/build-model-engine-table.py (merge(): carries those things into our table).
Matching: a generation by shared years (the sites number generations differently),
an engine by fuel family + litres + power, a body by its kind; gearbox and drive
from the engine page's drivetrain options.
"""
import collections
import csv
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AC_BASE = "https://www.autocentrum.pl/dane-techniczne/"
SINCE = 2010

AC_FUEL = {
    "Benzynowe": "petrol", "Benzynowe LPG": "lpg", "Diesla": "diesel", "Elektryczne": "electric",
    "Hybrydowe": "hybrid", "Hybrydowe Diesla": "hybrid_diesel", "Hybrydowe plug-in": "plugin",
    "Hybrydowe Diesla plug-in": "plugin",
}
OUR_FUEL = {
    "бензин": "petrol", "бензин/E85 (Flexible Fuel)": "petrol", "газ (LPG)": "lpg", "газ (CNG)": "cng",
    "дизель": "diesel", "гибрид": "hybrid", "гибрид (дизель)": "hybrid_diesel", "плагин-гибрид": "plugin",
    "электро": "electric",
}
# Engine existence is checked within a family: a mild hybrid may sit under petrol on one site.
FAMILY = {"petrol": "p", "lpg": "p", "cng": "p", "hybrid": "p", "diesel": "d", "hybrid_diesel": "d",
          "plugin": "e", "electric": "x"}
FUEL_RU = {"petrol": "бензин", "lpg": "газ (LPG)", "cng": "газ (CNG)", "diesel": "дизель", "hybrid": "гибрид",
           "hybrid_diesel": "гибрид (дизель)", "plugin": "плагин-гибрид", "electric": "электро"}
GEARBOX_RU = {"a": "автомат", "m": "механика"}
DRIVE_RU = {"f": "передний", "r": "задний", "4": "полный"}
OUR_GEARBOX = {"автомат": "a", "автомат (робот)": "a", "механика": "m"}
OUR_DRIVE = {"передний": "f", "задний": "r", "полный": "4"}

MILD = re.compile(r"mild|mhev|48 ?v|\bmh\b|ehybrid 48|\betsi\b|ecoboost hybrid|hybrid ?assist|eq ?boost|"
                  r"\bb[3-6]\b", re.I)


def our_years(text):
    match = re.match(r"(\d{4})\s*–\s*(\d{4}|н\. в\.)", text)
    return (int(match.group(1)), None if match.group(2) == "н. в." else int(match.group(2))) if match else (None, None)


# Body kinds that make a separate body; the base body of a model has none.
BODY_TAGS = [
    ("универсал", r"kombi|avant|touring(?! sports?)|touring sports|variant|sportbreak|\bsw\b|estate|station|"
                  r"sport ?tourer|grand ?tour|\bbreak\b|combi\b|wagon|shooting ?brake"),
    ("кабриолет", r"cabrio|kabriolet|roadster|\bcc\b"),
    ("купе", r"(?<!gran )(?<!grand )(?<!grand)(?<!suv )coup[eé](?! suv)(?![- ]cabrio)"),
    ("гран купе / GT", r"gran coup[eé]|gran turismo"),
    ("кросс-версия", r"allroad|alltrack|cross ?country|\bscout\b|\bactive\b|all[- ]?terrain|allstreet|crosspolo|"
                     r"crosstouran|\brxh\b|x-?perience"),
    ("седан", r"limuzyna|sedan|limousine|saloon|grand ?coup[eé]"),
    ("3 двери", r"\b3 ?d\b|3[- ]?drzw|3[- ]?doors?|3doors"),
    ("удлинённый", r"\bgrand\b|\blong\b|\blwb\b|\bl2\b|allspace|\bplus\b|\bxl\b"),
    ("SUV-купе", r"suv coup[eé]|coup[eé] suv"),
]
# Models whose plain body already is that kind, so the tag adds nothing.
BASE_KIND = {
    "седан": {"A4", "A6", "Seria 3", "Seria 5", "Klasa C", "Klasa E", "Klasa S", "Passat", "Avensis", "Camry",
              "S60", "Mondeo", "Superb", "Octavia", "508", "CLA", "Corolla"},
    "универсал": {"V60"},
    "купе": {"Seria 4", "CLA"},
    "SUV-купе": set(),
}


def body_tags(model, name, generation=""):
    lower = name.lower()
    tags = set()
    for tag, pattern in BODY_TAGS:
        if re.search(pattern, lower):
            tags.add(tag)
    # "Sportback" is a 5-door hatch on the A3, a liftback on the A5, an SUV coupe on the Q3/Q5.
    if "sportback" in lower and model in ("Q3", "Q5"):
        tags.add("SUV-купе")
    if "sportback" in lower and model == "A5":
        tags.add("гран купе / GT")
    # ultimatespecs names the 3-door A3 plainly: "A3 (8V)", "A3 (8V 2016)".
    if model == "A3" and not re.search(r"sportback|sedan|limousine|cabrio|allstreet|hatchback 5", lower):
        tags.add("3 двери")
    # autocentrum calls the 5-door A-Class W169/W176 "Limuzyna" and the 3-door W169 "Coupe".
    if model == "Klasa A" and re.search(r"w169|w176", generation, re.I):
        if "седан" in tags:
            tags.discard("седан")
        if "купе" in tags:
            tags.discard("купе")
            tags.add("3 двери")
    for kind, models in BASE_KIND.items():
        if model in models:
            tags.discard(kind)
    return tags


def config_parts(text):
    """'automatyczna Steptronic 8 stopniowa AWD xDrive Euro 6d' -> ('a', '4')."""
    lower = text.lower()
    gearbox = "m" if lower.startswith("manualna") else "a" if re.match(r"(automatyczna|półautomatyczna|"
                                                                       r"bezstopniowa|zautomatyzowana)", lower) else ""
    drive = "4" if re.search(r"\bawd\b|4x4|4wd|obie osie|4motion|quattro|4matic|xdrive", text, re.I) else \
        "r" if re.search(r"\brwd\b|tyln", text, re.I) else "f" if re.search(r"\bfwd\b|przedni", text, re.I) else ""
    return gearbox, drive


AWD_NAME = re.compile(r"quattro|allroad|alltrack|\bscout\b|cross country|xdrive|4matic|4motion|4x4|\bawd\b|"
                      r"\brs ?\d|\bs[3-8]\b|\bsq\d|polestar|\bm[3-6]0[id]\b|\bm[- ]?suv|\bgolf r\b|\br [35]d\b|"
                      r"\b45 amg|amg 45", re.I)
TWO_NAME = re.compile(r"sdrive|\bfwd\b|\b2wd\b|4x2", re.I)
# BMW generations on the front-drive platform: sDrive = front, everything else is rear or xDrive.
BMW_FRONT = re.compile(r"\b(F40|F70|F48|U11)\b")


def verdict(kind, brand, gen_name, engine_name, bodies, option, fuel):
    """Who is likely wrong in a drive/gearbox difference (autocentrum mixes drives up too:
    Polo V "4x4", BMW 330i "FWD")."""
    drive = option.rsplit(" / ", 1)[-1]
    name = f"{engine_name} {bodies}"
    if kind == "коробка":
        if fuel in ("hybrid", "plugin", "electric") and option.startswith("механика"):
            return "ошибка autocentrum (вероятно): гибрид с механикой"
        return "проверить"
    if brand == "BMW" and drive == "передний" and not BMW_FRONT.search(gen_name):
        return "ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive"
    if brand == "BMW" and drive == "задний" and BMW_FRONT.search(gen_name):
        return "ошибка autocentrum (вероятно): sDrive здесь — передний"
    if drive != "полный" and AWD_NAME.search(engine_name):
        return "ошибка autocentrum (вероятно): в названии полный привод"
    if drive == "полный" and TWO_NAME.search(engine_name):
        return "ошибка autocentrum (вероятно): в названии моноприводная версия"
    if drive == "полный" and AWD_NAME.search(name):
        return "у нас ошибка (вероятно): версия только с полным приводом"
    return "проверить"


def option_label(text):
    """'automatyczna Steptronic 8 stopniowa AWD xDrive Euro 6d' -> 'автомат 8 / полный'."""
    gearbox, drive = config_parts(text)
    speeds = re.search(r"(\d+)\s*(?:biegowa|stopniowa)", text)
    return f"{GEARBOX_RU[gearbox]}{' ' + speeds.group(1) if speeds else ''} / {DRIVE_RU.get(drive, 'привод ?')}"


def view(row):
    """Our CSV row in the comparison's terms; "src" is the row itself (the merge edits it)."""
    return {
        "fuel": OUR_FUEL.get(row["Топливо"], "petrol"),
        "litres": float(row["Объём, л"] or 0), "hp": int(row["Мощность, л.с."] or 0),
        "kw": int(row["Мощность, кВт"] or 0), "gearbox": OUR_GEARBOX.get(row["Коробка"], ""),
        "drive": OUR_DRIVE.get(row["Привод"], ""), "name": row["Версия"], "body": row["Кузов"],
        "mild": row["Топливо: примечание"].startswith("мягкий"), "src": row,
    }


def our_generations(rows):
    """(brand, model label) -> {generation code: years, facelifts, bodies, rows}."""
    models = collections.defaultdict(lambda: collections.OrderedDict())
    for row in rows:
        start, end = our_years(row["Годы (проверено)"])
        gen = models[(row["Марка"], row["Модель"])].setdefault(row["Поколение"], {
            "code": row["Поколение"], "from": start, "to": end, "rows": [], "lifts": set(), "bodies": set()})
        gen["from"] = min(gen["from"], start)
        gen["to"] = None if end is None or gen["to"] is None else max(gen["to"], end)
        if row["Этап"] in ("рестайлинг", "рестайлинг 2"):
            gen.setdefault("lift_starts", set()).add(start)
        lift = re.match(r"рестайлинг \((\d{4})\)", row["Этап"])
        if lift:
            gen["lifts"].add(int(lift.group(1)))
        if row.get("Рестайлинг, год"):
            gen["lifts"].add(int(row["Рестайлинг, год"]))
        gen["bodies"].add(row["Кузов"])
        gen["rows"].append(view(row))
    # A facelift row that starts with the generation itself has no year of its own (B8 "Restyling" 2007-2015).
    for gens in models.values():
        for gen in gens.values():
            for start in gen.pop("lift_starts", ()):
                if start == gen["from"]:
                    gen["lift_unknown"] = True
                else:
                    gen["lifts"].add(start)
    return models


def read_table():
    with open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle, delimiter=";"))


def shared_years(a, b):
    """Share of the shorter generation that both cover: numbering differs between the sites
    (autocentrum Touran II 2010-2015 = our Touran I facelift 2), years do not."""
    common = min(a["to"] or 2026, b["to"] or 2026) - max(a["from"], b["from"]) + 1
    shorter = min((a["to"] or 2026) - a["from"] + 1, (b["to"] or 2026) - b["from"] + 1)
    return max(common, 0) / max(shorter, 1)


def match_gens(ac_gen, our_gens):
    """Our generations an autocentrum generation corresponds to (one or more). A brand-new
    generation (X5 G65 2026) must not hide inside a long one that runs into the same year."""
    def span(g):
        return (g["to"] or 2026) - g["from"] + 1
    return [g for g in our_gens.values() if shared_years(g, ac_gen) >= 0.6
            and (min(span(g), span(ac_gen)) >= 2 or abs(g["from"] - ac_gen["from"]) <= 1)
            # An old generation that only ran on to 2010 (Octavia I Tour) is not our next one.
            and not (ac_gen["to"] and ac_gen["to"] <= SINCE and g["from"] - ac_gen["from"] > 5)]


CODE = re.compile(r"^([IVX]+|[A-Z]{0,3}\d[\w/-]*|T\d)$")


def group_body_level(generations):
    """Some models list bodies right on the model page (Kadjar: "Crossover", "Crossover
    Facelifting"; Focus Vignale: "Hatchback", "Kombi"). Those become one generation."""
    out, pseudo = [], collections.OrderedDict()
    for gen in generations:
        if CODE.match(gen["name"]):
            out.append(gen)
            continue
        key = gen["path"].rsplit("/", 2)[0] + "/"
        group = pseudo.setdefault(key, {"path": key, "name": key.strip("/").split("/")[-1], "from": gen["from"],
                                        "to": gen["to"], "bodies": [], "body_level": True})
        group["from"] = min(group["from"], gen["from"])
        group["to"] = None if None in (group["to"], gen["to"]) else max(group["to"], gen["to"])
        for body in gen["bodies"]:
            group["bodies"].append({**body, "name": gen["name"], "from": gen["from"], "to": gen["to"]})
    return out + list(pseudo.values())


def engine_found(engine, rows, brand=""):
    if "hp" not in engine:
        return
    fuel = AC_FUEL.get(engine["type"], "petrol")
    # Mild hybrids: autocentrum often gives the power with the electric boost (Volvo B4 197+14 = 211,
    # Mercedes EQ Boost C 300 258+14 = 272), so allow up to +25 KM over ours.
    # ultimatespecs gives Mercedes 2018+ with the boost too (E 200 W214 227 = 204+23), autocentrum without.
    mild = bool(MILD.search(engine["text"])) or (brand == "Mercedes-Benz" and engine["from"] >= 2018)
    # Plug-in system power differs between sources by a few KM.
    slack = 8 if fuel in ("plugin", "hybrid") else 3
    # autocentrum files some plug-ins (X5 40e, XC90 T8 Twin Engine) under "Hybrydowe".
    families = {FAMILY[fuel], "e"} if fuel == "hybrid" else {FAMILY[fuel]}
    for row in rows:
        if FAMILY[row["fuel"]] not in families:
            continue
        diff = engine["hp"] - row["hp"]
        boosted = (mild or row["mild"]) and abs(diff) <= 25 and engine.get("litres") and row["litres"] \
            and abs(float(engine["litres"]) - row["litres"]) < 0.05
        if not (abs(diff) <= slack or abs(row["kw"] - engine["kw"]) <= slack * 2 // 3 or boosted):
            continue
        if engine.get("litres") and row["litres"] and abs(float(engine["litres"]) - row["litres"]) > 0.15:
            continue
        yield row


# ---------------------------------------------------------------- merge into our table

# Generations autocentrum has and ultimatespecs has not: (brand, label, autocentrum name) -> our code.
NEW_GENERATIONS = {
    ("Toyota", "Corolla", "XI"): "E170",
    ("Renault", "Trafic", "II"): "Trafic II",
    ("Skoda", "Octavia", "I"): "Octavia I",
    ("BMW", "X5", "G65"): "G65",
    ("Toyota", "RAV 4", "VI"): "XA60",
    ("Volkswagen", "T-Roc", "II"): "T-Roc II",
}
OUR_FUEL_TEXT = {"petrol": "бензин", "lpg": "газ (LPG)", "diesel": "дизель", "electric": "электро",
                 "hybrid": "гибрид", "hybrid_diesel": "гибрид (дизель)", "plugin": "плагин-гибрид"}
# Polish body words -> the words tools/build-model-specs.py body_of() reads.
BODY_WORDS = [(r"\bLimuzyna\b", "Sedan"), (r"\bKabriolet\b", "Cabrio"), (r"\bGrand ?[Cc]oupe\b", "Sedan"),
              (r"\b3d\b", "3-door"), (r"\b5d\b", "5-door")]
FACELIFT_STAGE = re.compile(r"^(рестайлинг|обновление)")


def body_name(label, code, name, generation=""):
    """'Limuzyna Facelifting' -> 'Corolla E170 Sedan Facelifting (autocentrum)'."""
    text = name
    if label == "Klasa A" and re.search(r"w169|w176", generation, re.I):
        text = re.sub(r"\bLimuzyna\b", "Hatchback 5-door", re.sub(r"\bCoupe\b", "Hatchback 3-door", text))
    for pattern, word in BODY_WORDS:
        text = re.sub(pattern, word, text)
    prefix = code if code.lower().startswith(label.lower()) else f"{label} {code}"
    return f"{prefix} {text} (autocentrum)"


def new_rows(template, ac_gen, body, engine, code, stage, years, brand, label, only=None):
    """Our CSV rows for one autocentrum engine of one body: one per gearbox + drive option
    (only one when `only` is given)."""
    fuel = AC_FUEL.get(engine["type"], "petrol")
    note = ""
    if fuel in ("hybrid", "hybrid_diesel") and MILD.search(engine["text"]):
        fuel, note = ("petrol" if fuel == "hybrid" else "diesel"), "мягкий гибрид (MHEV) — autocentrum"
    cc = re.sub(r"\D", "", engine.get("Pojemność skokowa", "")) or (
        str(round(float(engine["litres"]) * 1000)) if engine.get("litres") else "")
    options = [only] if only else sorted({config_parts(c) for c in engine.get("configs", [])
                                          if config_parts(c)[0]}) or [("", "")]
    out = []
    for gearbox, drive in options:
        row = dict(template)
        row.update({
            "Марка": brand, "Модель": label, "Поколение": code, "Этап": stage,
            "Годы (источник)": f"{ac_gen['from']}–{ac_gen['to'] or 'н. в.'}", "Годы (проверено)": years,
            "Кузов": body_name(label, code, body["name"], ac_gen["name"]),
            "Версия": re.sub(r"\s+", " ", f"{label} {re.sub(r'(?i)facelifting', '', body['name'])} "
                                         f"{engine.get('litres', '')} {engine['name']}").strip(),
            "Топливо": OUR_FUEL_TEXT[fuel], "Топливо: примечание": note,
            "Объём, см³": cc, "Объём, л": f"{int(cc) / 1000:.1f}" if cc else "",
            "Мощность, л.с.": engine["hp"], "Мощность, кВт": engine["kw"], "Год версии": engine["from"],
            "Коробка": GEARBOX_RU.get(gearbox, ""), "Коробка: откуда": "autocentrum" if gearbox else "",
            "Привод": DRIVE_RU.get(drive, template.get("Привод", "")),
            "Привод: откуда": "autocentrum" if drive else "как у модели",
            "Ссылка": AC_BASE + body["path"] + engine["slug"] + "/", "Источник": "autocentrum",
            "Рестайлинг, год": "",
        })
        out.append(row)
    return out


def facelift_years(ac_gen):
    """Start years of the "… Facelifting" bodies, neighbours (±1) taken as one facelift."""
    out = []
    for year in sorted({b["from"] for b in ac_gen["bodies"] if "facelifting" in b["name"].lower() and b["from"]}):
        if not out or year - out[-1] > 1:
            out.append(year)
    return out


def phase_groups(our_rows):
    """(code, stage, checked years, mobile.de model) -> a row of that group (the template for new rows)."""
    groups = collections.OrderedDict()
    for item in our_rows:
        row = item["src"]
        groups.setdefault((row["Поколение"], row["Этап"], row["Годы (проверено)"], row["Модель mobile.de"]), row)
    return groups


def pick_group(groups, engine, body):
    """The phase an engine joins: the one whose years hold its first year, a facelift body to a facelift phase."""
    facelift = "facelifting" in body["name"].lower()

    def score(item):
        (code, stage, years, mobile), _row = item
        start, end = our_years(years)
        end = end or 2026
        overlap = min(end, engine["to"] or 2026) - max(start, engine["from"]) + 1
        return start <= engine["from"] <= end, facelift == bool(FACELIFT_STAGE.match(stage)), overlap
    return max(groups.items(), key=score)


def merge(rows, ac):
    """Carry autocentrum into our table (rows edited in place, new rows appended). Returns counters.
    Order: facelift years, gearbox, new generations, then engines/bodies/drive/gearbox options
    missing in generations we have. "ошибка autocentrum" (verdict()) is never carried."""
    stats = collections.Counter()
    for row in rows:
        row.setdefault("Источник", "ultimatespecs")
        row.setdefault("Рестайлинг, год", "")
    models = ac["models"]

    # 1. Facelift years. A generation whose facelift bodies carry no year ("2008 Facelift",
    #    "A4 (B8) Restyling") is split at autocentrum's year; one with no facelift bodies at all
    #    only gets the year ("Рестайлинг, год"), its versions are not split: we cannot tell them apart.
    gens = our_generations(rows)
    for model in models:
        key = (model["brand"], model["label"])
        for ac_gen in group_body_level(model["generations"]):
            lifts = facelift_years(ac_gen)
            for gen in match_gens(ac_gen, gens.get(key, {})):
                inside = [y for y in lifts if gen["from"] < y < (gen["to"] or 2100)]
                if not inside or gen["lifts"]:
                    continue
                lift, whole = inside[0], f"{gen['from']}–{gen['to'] or 'н. в.'}"
                for item in gen["rows"]:
                    row = item["src"]
                    row["Рестайлинг, год"] = str(lift)
                    if not gen.get("lift_unknown") or row["Годы (проверено)"] != whole:
                        continue
                    if row["Этап"] in ("рестайлинг", "рестайлинг 2"):
                        row["Годы (проверено)"] = f"{lift}–{gen['to'] or 'н. в.'}"
                    else:
                        row["Этап"], row["Годы (проверено)"] = "дорестайлинг", f"{gen['from']}–{lift}"
                stats["рестайлинг: разделено по году autocentrum (поколений)" if gen.get("lift_unknown")
                      else "рестайлинг: год из autocentrum, версии не разделены (поколений)"] += 1
                gen["lifts"].add(lift)

    # 2. Gearbox where ours is unknown and every autocentrum option of that engine and drive agrees.
    gens = our_generations(rows)
    options = collections.defaultdict(set)
    for model in models:
        key = (model["brand"], model["label"])
        for ac_gen in group_body_level(model["generations"]):
            our_rows = [r for g in match_gens(ac_gen, gens.get(key, {})) for r in g["rows"]]
            for body in ac_gen["bodies"]:
                for engine in body["engines"]:
                    if engine.get("to") and engine["to"] < SINCE:
                        continue
                    found = [r for r in engine_found(engine, our_rows, model["brand"]) if not r["gearbox"]]
                    for config in engine.get("configs", []):
                        gearbox, drive = config_parts(config)
                        for item in found:
                            if gearbox and (not drive or item["drive"] == drive):
                                options[id(item["src"])].add(gearbox)
    for row in rows:
        chosen = options.get(id(row), set())
        if not row["Коробка"] and len(chosen) == 1:
            row["Коробка"], row["Коробка: откуда"] = GEARBOX_RU[chosen.pop()], "autocentrum (у двигателя одна коробка)"
            stats["коробка из autocentrum (версий)"] += 1

    # 3. Generations we lack.
    gens = our_generations(rows)
    added = []
    for model in models:
        brand, label = model["brand"], model["label"]
        model_rows = [r for r in rows if r["Марка"] == brand and r["Модель"] == label]
        if not model_rows:
            continue
        mobile = collections.Counter(r["Модель mobile.de"] for r in model_rows).most_common(1)[0][0]
        template = {**model_rows[0], "Модель mobile.de": mobile}
        for ac_gen in group_body_level(model["generations"]):
            code = NEW_GENERATIONS.get((brand, label, ac_gen["name"]))
            if not code or match_gens(ac_gen, gens.get((brand, label), {})):
                continue
            lifts = facelift_years(ac_gen)
            end = ac_gen["to"] or "н. в."
            for body in ac_gen["bodies"]:
                if not lifts:
                    stage, years = "весь выпуск", f"{ac_gen['from']}–{end}"
                elif "facelifting" in body["name"].lower():
                    stage, years = "рестайлинг", f"{lifts[0]}–{end}"
                else:
                    stage, years = "дорестайлинг", f"{ac_gen['from']}–{lifts[0]}"
                for engine in body["engines"]:
                    if "hp" in engine and not (engine.get("to") and engine["to"] < SINCE):
                        added += new_rows(template, ac_gen, body, engine, code, stage, years, brand, label)
            stats["новых поколений"] += 1
    rows.extend(added)
    stats["строк: новые поколения"] += len(added)

    # 4. In generations we have: engines, bodies, drives and gearboxes autocentrum has and we have not.
    gens = our_generations(rows)
    added, seen = [], set()
    for model in models:
        brand, label = model["brand"], model["label"]
        for ac_gen in group_body_level(model["generations"]):
            matched = match_gens(ac_gen, gens.get((brand, label), {}))
            if not matched:
                continue
            our_rows = [r for g in matched for r in g["rows"]]
            our_tags = set().union(*(body_tags(label, b) for g in matched for b in g["bodies"]))
            groups = phase_groups(our_rows)
            for body in ac_gen["bodies"]:
                if body.get("to") and body["to"] < SINCE:
                    continue
                new_body = bool(body_tags(label, body["name"], ac_gen["name"]) - our_tags)
                for engine in body["engines"]:
                    if "hp" not in engine or (engine.get("to") and engine["to"] < SINCE):
                        continue
                    (code, stage, years, _mobile), template = pick_group(groups, engine, body)

                    def carry(only=None, why=""):
                        mark = (body["path"], engine["slug"], only)
                        if mark in seen:
                            return
                        seen.add(mark)
                        made = new_rows(template, ac_gen, body, engine, code, stage, years, brand, label, only)
                        added.extend(made)
                        stats[why] += len(made)

                    found = list(engine_found(engine, our_rows, brand))
                    if not found or new_body:
                        carry(why="строк: двигатели, которых не было" if not found else "строк: кузова, которых не было")
                        continue
                    fuel = AC_FUEL.get(engine["type"], "petrol")
                    for config in engine.get("configs", []):
                        gearbox, drive = config_parts(config)
                        if not gearbox:
                            continue
                        on_drive = [r for r in found if not drive or r["drive"] == drive]
                        if on_drive and any(r["gearbox"] in (gearbox, "") for r in on_drive):
                            continue
                        kind = "привод" if not on_drive else "коробка"
                        said = verdict(kind, brand, ac_gen["name"], engine["name"], body["name"],
                                       option_label(config), fuel)
                        if said.startswith("ошибка autocentrum"):
                            stats[f"{kind}: не перенесено (ошибка autocentrum)"] += 1
                            continue
                        wrong = [r for r in found if kind == "привод" and said.startswith("у нас ошибка")
                                 and AWD_NAME.search(f"{r['name']} {r['body']}") and r["drive"] != drive]
                        for item in wrong:
                            item["src"]["Привод"], item["src"]["Привод: откуда"] = DRIVE_RU[drive], "autocentrum (исправлено)"
                            item["drive"] = drive
                            stats["привод исправлен (версий)"] += 1
                        if not wrong:
                            carry((gearbox, drive), f"строк: {kind}, которого не было")
    rows.extend(added)
    return stats
