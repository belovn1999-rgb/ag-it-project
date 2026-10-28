"""Our table against the ADAC Autokatalog (B61 stage 17, owner 2026-10-23): which rows ADAC confirms.

data/adac-versions.json (tools/collect-adac-versions.py) holds the German-market versions of each model's
generation pages, a facelift on a page of its own ("…-facelift"). For each of our generations the pages whose
months on sale overlap it are its ADAC generation; for each of our rows the ADAC versions of the same fuel
family, power (3 KM / 2 kW; a mild hybrid's boost up to 25 KM with the same displacement) and displacement
(the "1.5" of the name, 0.15 l) on sale in its years are its ADAC twins. evidence() returns:
- per row: the twins (engine confirmed), the gearbox ADAC states (an automatic word in the name; manual where
  the same power is also sold with an automatic word; electric — automatic), all-wheel drive in the name, and
  the gearbox and drive of the twins' version pages (data/adac-details.json, tools/collect-adac-details.py);
- per generation: ADAC's first and last year, the facelift years (first month of a facelift page inside it).
"""
import collections
import json
import os
import re

import autocentrum

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Fuel families on both sides: petrol (and gas, a hybrid), diesel, plug-in ("Super / Strom"), electric ("Strom").
OUR_FAMILY = {"petrol": "p", "lpg": "p", "cng": "p", "hybrid": "p", "diesel": "d", "hybrid_diesel": "d",
              "plugin": "phev", "electric": "ev"}


def adac_family(fuel):
    fuel = fuel.lower()
    if "/" in fuel and "strom" in fuel:
        return "phev"
    if "strom" in fuel:
        return "ev"
    if "wasserstoff" in fuel:
        return "h2"
    return "d" if "diesel" in fuel else "p"
# Gearbox words of an automatic (an automated manual counts, as in our table); a mild "Hybrid" can be manual
# (Suzuki, Fiat, Hyundai), so only the plug-ins say it by themselves.
AUTO = re.compile(r"\b(dsg|s ?tronic|steptronic|tiptronic|multitronic|automatik|aut\.?|at\d{0,2}|cvt|e-?cvt|edc\d*|eat\d|"
                  r"e?dcs\d*|\d*[a-z]?dct\d*|pdk|\d*g-?tronic|powershift|xtronic|amt|mta|dkg|7g|9g|e-?tense|"
                  r"selespeed|dualogic|easy-?r|etg\d*|cmp|sensodrive|bmp\d*|2-tronic|ivt|lineartronic|automatic|"
                  r"speedshift|geartronic|twinamic|skyactiv-drive|plug-in|e-hybrid|phev|ehybrid)\b", re.I)
AWD = re.compile(r"\b(quattro|4motion|4matic\+?|xdrive|x-?drive|4x4|allrad|awd|all4|4wd|q4|e-?four|4xe|"
                 r"allgrip|alltrack|4control|dual motor|tri motor|i-awd|sh-awd|xmode|symmetrical)\b", re.I)
LITRES = re.compile(r"(?<![\d.])(\d\.\d)(?![\d.])")
# A full hybrid's name (Toyota "Hybrid", Renault "E-TECH", Honda "e:HEV"): only our full hybrids match it, and
# they match nothing else; a mild hybrid ("1.2 Hybrid" Suzuki, "TCe 140 mild hybrid") is petrol on both sides.
FULL_HYBRID = re.compile(r"\b(hybrid|e-?tech|e:hev|hev|full hybrid|hybrid synergy)\b", re.I)
MILD_NAME = re.compile(r"mild|mhev|48 ?v|\bmh\b", re.I)
FACELIFT_STAGE = re.compile(r"^(рестайлинг|обновление)")
# Engine tokens a hybrid shares across sources whose power they count differently (BMW 330e 252 / 292 PS with
# XtraBoost, Mercedes "C 300 e", Volvo "T8"): a three-digit model number or Volvo's T / B / D.
TOKEN = re.compile(r"(?<![\w.])(\d{3}|[tbd]\d)(?=[a-z]{0,2}\b)", re.I)


def _year(text):
    return int(text[:4]) if text else None


def _span(versions):
    starts = [_year(v[4]) for v in versions]
    ends = [_year(v[5]) if v[5] else None for v in versions]
    return min(starts), (None if any(e is None or e >= 2025 for e in ends) else max(ends))


def _overlap(a_from, a_to, b_from, b_to):
    return min(a_to or 2026, b_to or 2026) - max(a_from, b_from) + 1


DRIVE_WORDS = (("vorderrad", "f"), ("hinterrad", "r"), ("allrad", "4"))
_details = {}


def details():
    """{"<generation page>|<version name>": {"gearbox", "drive", …}} of data/adac-details.json."""
    if not _details:
        path = os.path.join(ROOT, "data", "adac-details.json")
        _details.update(json.load(open(path, encoding="utf8"))["versions"] if os.path.exists(path) else {"": {}})
    return _details


def load():
    path = os.path.join(ROOT, "data", "adac-versions.json")
    return json.load(open(path, encoding="utf8"))["models"] if os.path.exists(path) else {}


def evidence(rows, models=None):
    """(row_evidence {id(row): {...}}, gen_evidence {(brand, label, code): {...}})."""
    models = load() if models is None else models
    gens = autocentrum.our_generations(rows)
    # Our model -> its ADAC pages: by the page-1 value or the label (the keys are the page's "Brand|Model").
    row_ev, gen_ev = {}, {}
    for (brand, label), model_gens in gens.items():
        first_row = next(iter(model_gens.values()))["rows"][0]["src"]
        pages = models.get(f"{brand}|{first_row['Модель mobile.de']}") or models.get(f"{brand}|{label}")
        if not pages:
            continue
        # A page several of our models share (Volvo s60-v60, Mini): only the versions naming this model, if any do.
        label_word = re.compile(rf"(?<![\w-]){re.escape(label)}(?![\w-])", re.I)
        for code, gen in model_gens.items():
            mine = []
            for page in pages:
                versions = page["versions"]
                named = [v for v in versions if label_word.search(v[0])]
                if named and len(named) < len(versions) and not label.isdigit():
                    versions = named
                start, end = _span(versions)
                # The page belongs to this generation: most of its years inside ours (or ours inside it).
                shorter = min((end or 2026) - start + 1, (gen["to"] or 2026) - gen["from"] + 1)
                if _overlap(start, end, gen["from"], gen["to"]) / max(shorter, 1) >= 0.6:
                    mine.append({**page, "versions": versions, "from": start, "to": end})
            if not mine:
                continue
            base = [p for p in mine if not p["facelift"]] or mine
            lifts = sorted({p["from"] for p in mine if p["facelift"] and p["from"] > gen["from"]})
            span = (min(p["from"] for p in mine), None if any(p["to"] is None for p in mine) else max(p["to"] for p in mine))
            gen_ev[(brand, label, code)] = {"span": span, "lifts": lifts, "pages": [p["page"] for p in mine],
                                            "base_from": min(p["from"] for p in base)}
            both = any(p["facelift"] for p in mine) and any(not p["facelift"] for p in mine)
            for item in gen["rows"]:
                row = item["src"]
                # A generation ADAC splits too: a facelift row against the facelift pages, the rest against the base.
                # Each version carries its generation page (the version page holds gearbox and drive, below).
                if both:
                    lift = FACELIFT_STAGE.match(row["Этап"]) is not None
                    versions = [[*v, p["page"]] for p in mine if p["facelift"] == lift for v in p["versions"]]
                else:
                    versions = [[*v, p["page"]] for p in mine for v in p["versions"]]
                row_ev[id(row)] = _row(row, item, versions)
    return row_ev, gen_ev


def _row(row, item, versions):
    family = OUR_FAMILY.get(item["fuel"], "p")
    start, end = autocentrum.our_years(row["Годы (проверено)"])
    start = start or 0
    twins = []
    full = item["fuel"] in ("hybrid", "hybrid_diesel") and not item["mild"]
    for version in versions:
        if adac_family(version[1]) != family:
            continue
        named_full = bool(FULL_HYBRID.search(version[0])) and not MILD_NAME.search(version[0])
        if family in ("p", "d") and named_full != full and not (item["mild"] and named_full):
            continue
        v_from, v_to = _year(version[4]), _year(version[5]) if version[5] else None
        if _overlap(v_from, v_to, start, end) < 1:
            continue
        litres = LITRES.search(version[0])
        if litres and item["litres"] and abs(float(litres.group(1)) - item["litres"]) > 0.15:
            continue
        diff = abs(version[3] - item["hp"])
        same_litres = bool(litres and item["litres"] and abs(float(litres.group(1)) - item["litres"]) < 0.05)
        boosted = item["mild"] and diff <= 25 and same_litres
        # Full hybrids and plug-ins: system power differs between sources (RAV4 2.5 Hybrid 197 / 218 PS) —
        # the same displacement within 25 KM, or the same engine number within 60 KM.
        hybrid = family == "phev" or full
        shared = {t.lower() for t in TOKEN.findall(row["Версия"])} & {t.lower() for t in TOKEN.findall(version[0])}
        if diff <= 3 or abs(version[2] - item["kw"]) <= 2 or boosted or \
                (hybrid and ((same_litres and diff <= 25) or (shared and diff <= 60))):
            twins.append(version)
    gearbox, drive = set(), set()
    for twin in twins:
        if family == "ev" or AUTO.search(twin[0]):
            gearbox.add("a")
        if AWD.search(twin[0]):
            drive.add("4")
        # The twin's version page (tools/collect-adac-details.py): "Getriebeart", "Antriebsart".
        page = details().get(f"{twin[6]}|{twin[0]}") if len(twin) > 6 else None
        if page:
            box = page["gearbox"].lower()
            if box:
                gearbox.add("m" if "schalt" in box and "automat" not in box else "a")
            side = next((code for word, code in DRIVE_WORDS if word in page["drive"].lower()), None)
            if side:
                drive.add(side)
    # A twin with no automatic word is the manual one when the same power is also sold with an automatic word.
    if any(AUTO.search(t[0]) for t in twins) and any(not AUTO.search(t[0]) for t in twins) and family in ("p", "d"):
        gearbox.add("m")
    return {"twins": twins, "gearbox": gearbox, "drive": drive}


def summary(row_ev, gen_ev, rows):
    counts = collections.Counter()
    for row in rows:
        ev = row_ev.get(id(row))
        counts["версий с поколением в ADAC"] += bool(ev)
        counts["версий с тем же мотором в ADAC"] += bool(ev and ev["twins"])
    counts["поколений в ADAC"] = len(gen_ev)
    return counts
