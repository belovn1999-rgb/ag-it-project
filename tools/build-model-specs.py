#!/usr/bin/env python3
"""Page-1 data for the dependent filters (B61 stage 4, PROJECT-MOBILE.md 4.8).

Reads the tables of stages 3 and 5 and writes src/model-specs.generated.js:
window.AUTOGOOD_MODEL_SPECS.models["<brand>|<model>"] =
  gens:     [code, phase, from, to|null, mobileModel, liftYear|null] newest first
            phase: pre | fl | fl2 | upd | all
  versions: [gen index, fuel, cm3, hp, kW, gearbox, drive, mild, token]
            fuel: petrol diesel hybrid_petrol hybrid_diesel plugin electric
                  (CNG/LPG/E85 count as petrol), gearbox a|m|"" (unknown),
            drive f|r|4, mild 1 = mild hybrid, token = BMW/Mercedes/Audi model
            number from the version name ("320", "m340", "220", "s3") for
            sub-models such as "320" or "C 220"; duplicates merged.
  trims:    [from, to|null, lines[], sport[], editions[]]

Run after tools/build-model-engine-table.py and tools/build-model-trims.py:

    python3 tools/build-model-specs.py
"""
import csv
import datetime
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
            entry = models.setdefault(key, {"gens": {}, "versions": set()})
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
        out[key] = {
            "gens": [[g["code"], g["phase"], g["from"], g["to"], g["mobile"], g["lift"]] for g in gens],
            "versions": versions,
            "trims": model_trims,
        }

    payload = {
        "generatedAt": datetime.date.today().isoformat(),
        "source": "ultimatespecs.com (engines), European sources (trims) - docs/MODEL-ENGINES.md, docs/MODEL-TRIMS.md",
        "models": out,
    }
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(ROOT, "src", "model-specs.generated.js"), "w", encoding="utf8") as handle:
        handle.write("/* Generated by tools/build-model-specs.py from data/model-*.json/csv. Do not hand-edit. */\n")
        handle.write(f"window.AUTOGOOD_MODEL_SPECS = {text};\n")
    print(f"models={len(out)} versions={sum(len(m['versions']) for m in out.values())} bytes={len(text)}")


if __name__ == "__main__":
    main()
