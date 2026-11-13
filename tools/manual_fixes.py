"""Corrections checked by hand (data/model-engines-manual.json, B61 stage 28).

A fix sets values on every row that matches all its fields: "Версия" and "Кузов" by substring, the others exactly
(an empty value matches an empty cell). "Мягкий гибрид" in "set" is the mild hybrid checked by hand (B61 stage 29,
2026-11-13: the EU register disagreed): null — not a mild hybrid; {"since": 2020, "system": "48V", "optional": false} —
one from that year (optional: the same engine was sold without it). It runs last — after the confirmation and the version years — so a
checked value wins over what the sources say; the changed fields get "ручная проверка" in their confirmation
column and the reason in "Ручная проверка".
"""
import collections
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "model-engines-manual.json")
SUBSTRING = {"Версия", "Кузов"}
STATUS = {"Объём, см³": "Подтверждение: мотор", "Мощность, л.с.": "Подтверждение: мотор", "Мощность, кВт": "Подтверждение: мотор", "Привод": "Подтверждение: привод",
          "Коробка": "Подтверждение: коробка", "Годы версии": "Подтверждение: годы версии"}


def _matches(row, match):
    for column, value in match.items():
        cell = str(row.get(column, ""))
        if column in SUBSTRING:
            if value not in cell:
                return False
        elif cell != str(value):
            return False
    return True


def _mild(row, value, sources):
    if not value:
        row["Мягкий гибрид с"], row["Мягкий гибрид: источники"] = "", ""
        if row["Топливо: примечание"].startswith("мягкий"):
            row["Топливо: примечание"] = ""
        return
    system = f" {value['system']}" if value.get("system") else ""
    optional = "; бывает и без него — смотреть объявление" if value.get("optional") else ""
    row["Топливо: примечание"] = f"мягкий гибрид (MHEV{system}) — ручная проверка{optional}"
    row["Мягкий гибрид с"] = str(value["since"])
    row["Мягкий гибрид: источники"] = " · ".join(sources if isinstance(sources, list) else [sources])


def apply(rows):
    """Returns {reason: rows changed}; a fix that matches nothing is reported with 0 (a source changed)."""
    fixes = json.load(open(PATH, encoding="utf8"))["fixes"] if os.path.exists(PATH) else []
    counts = collections.OrderedDict()
    for row in rows:
        row.setdefault("Ручная проверка", "")
    for fix in fixes:
        changed = 0
        for row in rows:
            if not _matches(row, fix["match"]):
                continue
            for column, value in fix["set"].items():
                if column == "Мягкий гибрид":
                    _mild(row, value, fix["source"])
                    continue
                row[column] = value
                if column == "Объём, см³":
                    row["Объём, л"] = f"{int(value) / 1000:.1f}"
                if column in STATUS:
                    row[STATUS[column]] = "ручная проверка"
            sources = " · ".join(fix["source"]) if isinstance(fix["source"], list) else fix["source"]
            row["Ручная проверка"] = "; ".join(filter(None, [row["Ручная проверка"], f"{fix['why']} ({sources})"]))
            changed += 1
        counts[fix["why"]] = changed
    return counts
