#!/usr/bin/env python3
"""What a rebuild of the model table changed (B61 stage 21, owner 2026-10-23: the monthly refresh reports it).

Compares data/model-engines.csv with an earlier one (default: the committed one, `git show HEAD:…`) and writes
docs/MODEL-CHANGES.md: new and lost models, generations and engines (engine = fuel, cm³, PS within a generation;
bodies and gearboxes of one engine count once), mild hybrids that came or went, how confirmed the table is.

    python3 tools/catalog-changes.py [--old FILE | --rev GIT_REVISION]
"""
import argparse
import collections
import csv
import datetime
import io
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLE = os.path.join(ROOT, "data", "model-engines.csv")
OUT = os.path.join(ROOT, "docs", "MODEL-CHANGES.md")


def rows_of(text):
    return list(csv.DictReader(io.StringIO(text.lstrip("﻿")), delimiter=";"))


def engine(row):
    return (row["Марка"], row["Модель"], row["Поколение"], row["Топливо"], row["Объём, см³"], row["Мощность, л.с."])


def mild(row):
    return row["Топливо: примечание"].startswith("мягкий")


def summary(rows):
    confirmed = sum(1 for r in rows if r.get("Подтверждение: мотор", "").startswith("подтверждено"))
    return {"versions": len(rows), "models": len({(r["Марка"], r["Модель"]) for r in rows}),
            "generations": len({(r["Марка"], r["Модель"], r["Поколение"]) for r in rows}),
            "engines": len({engine(r) for r in rows}), "mild": sum(mild(r) for r in rows),
            "confirmed": confirmed}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", help="the earlier CSV")
    parser.add_argument("--rev", default="HEAD", help="or the git revision of data/model-engines.csv")
    args = parser.parse_args()
    old_text = open(args.old, encoding="utf-8-sig").read() if args.old else subprocess.run(
        ["git", "-C", ROOT, "show", f"{args.rev}:data/model-engines.csv"], capture_output=True, text=True, check=True).stdout
    old, new = rows_of(old_text), rows_of(open(TABLE, encoding="utf-8-sig").read())
    so, sn = summary(old), summary(new)

    def keys(rows, fn):
        return {fn(r) for r in rows}

    models_new = keys(new, lambda r: (r["Марка"], r["Модель"])) - keys(old, lambda r: (r["Марка"], r["Модель"]))
    models_lost = keys(old, lambda r: (r["Марка"], r["Модель"])) - keys(new, lambda r: (r["Марка"], r["Модель"]))
    gen = lambda r: (r["Марка"], r["Модель"], r["Поколение"])  # noqa: E731
    gens_new = {g for g in keys(new, gen) - keys(old, gen) if g[:2] not in models_new}
    gens_lost = {g for g in keys(old, gen) - keys(new, gen) if g[:2] not in models_lost}
    years = {gen(r): r["Годы (проверено)"] for r in new}
    eng_new = {e for e in keys(new, engine) - keys(old, engine) if e[:3] not in gens_new and e[:2] not in models_new}
    eng_lost = {e for e in keys(old, engine) - keys(new, engine) if e[:3] not in gens_lost and e[:2] not in models_lost}
    source = {engine(r): r.get("Источник", "") for r in new}
    first = {}
    for r in new:
        first.setdefault(engine(r), r)
    key = lambda r: (r["Марка"], r["Модель"], r["Поколение"], r["Этап"], r["Версия"], r["Ссылка"], r["Коробка"], r["Привод"])  # noqa: E731
    by_old = {key(r): r for r in old}
    mild_came = [r for r in new if key(r) in by_old and mild(r) and not mild(by_old[key(r)])]
    mild_went = [by_old[key(r)] for r in new if key(r) in by_old and not mild(r) and mild(by_old[key(r)])]

    lines = ["# Справочник моделей — что изменилось", "",
             f"Сгенерировано `tools/catalog-changes.py` ({datetime.date.today().isoformat()}): `data/model-engines.csv` против "
             f"{'файла ' + args.old if args.old else 'версии ' + args.rev}. Мотор — топливо, объём и мощность в поколении "
             "(кузова и коробки одного мотора считаются один раз). Этап B61 п. 21 (`docs/PROJECT-MODELS.md`).", "",
             "| | Было | Стало |", "|---|---:|---:|"]
    for name, field in (("Моделей", "models"), ("Поколений", "generations"), ("Моторов", "engines"), ("Версий", "versions"),
                        ("Версий — мягкий гибрид", "mild"), ("Версий — мотор подтверждён двумя источниками", "confirmed")):
        lines.append(f"| {name} | {so[field]} | {sn[field]} |")
    lines += ["", f"## Новые модели ({len(models_new)})", ""] + [f"- {b} {m}" for b, m in sorted(models_new)]
    lines += ["", f"## Новые поколения ({len(gens_new)})", ""] + [f"- {b} {m} {g} · {years.get((b, m, g), '')}" for b, m, g in sorted(gens_new)]
    lines += ["", f"## Новые моторы в поколениях, которые были ({len(eng_new)})", "",
              "| Марка · модель · поколение | Топливо | см³ | л. с. | Источник | Пример версии |", "|---|---|---:|---:|---|---|"]
    for e in sorted(eng_new)[:300]:
        lines.append(f"| {e[0]} {e[1]} · {e[2]} | {e[3]} | {e[4]} | {e[5]} | {source.get(e, '')} | {first[e]['Версия'][:60]} |")
    if len(eng_new) > 300:
        lines.append(f"| … ещё {len(eng_new) - 300} | | | | | |")
    lines += ["", f"## Пропали (проверить: источник убрал или переименовал) — моделей {len(models_lost)}, поколений "
              f"{len(gens_lost)}, моторов {len(eng_lost)}", ""]
    lines += [f"- модель {b} {m}" for b, m in sorted(models_lost)]
    lines += [f"- поколение {b} {m} {g}" for b, m, g in sorted(gens_lost)]
    lines += [f"- мотор {e[0]} {e[1]} {e[2]}: {e[3]} {e[4]} см³ {e[5]} л. с." for e in sorted(eng_lost)[:200]]
    lines += ["", f"## Мягкий гибрид: стал — {len(mild_came)}, перестал — {len(mild_went)}", ""]
    lines += [f"- стал: {r['Марка']} {r['Модель']} {r['Поколение']} · {r['Версия'][:50]} · {r['Топливо: примечание'][:70]}"
              for r in mild_came[:100]]
    lines += [f"- перестал: {r['Марка']} {r['Модель']} {r['Поколение']} · {r['Версия'][:50]}" for r in mild_went[:100]]
    with open(OUT, "w", encoding="utf8") as handle:
        handle.write("\n".join(lines).rstrip() + "\n")
    print(f"models +{len(models_new)} -{len(models_lost)}, generations +{len(gens_new)} -{len(gens_lost)}, "
          f"engines +{len(eng_new)} -{len(eng_lost)}, mild +{len(mild_came)} -{len(mild_went)} -> {OUT}")


if __name__ == "__main__":
    main()
