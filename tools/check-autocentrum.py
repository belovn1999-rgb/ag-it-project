#!/usr/bin/env python3
"""Our model table vs autocentrum.pl (B61 check, PROJECT-MOBILE.md 4.8).

Reads data/model-engines.csv (ours, ultimatespecs) and
data/autocentrum-models.json (tools/crawl-autocentrum.py) and lists what
autocentrum has and our table has not:

  поколение   a generation we do not have at all
  кузов       a body type missing in the matching generation
  двигатель   fuel + litres + power missing in the matching generation
  топливо     a fuel kind (LPG, hybrid, plug-in, electric...) missing there
  коробка     a gearbox + drive option missing (engine pages, --engines crawl)
  коробка+    our gearbox is unknown, autocentrum names it
  годы        generation or facelift years differ by 2+ years (information)

Writes data/autocentrum-diff.csv (findings), data/autocentrum-table.csv (every autocentrum
engine of our models with doors, seats, torque, Euro norm, engine code, gearbox/drive
options — fields our table has not) and docs/MODEL-AUTOCENTRUM-CHECK.md.

    python3 tools/check-autocentrum.py
"""
import collections
import csv
import json
import os
import re
import sys

from autocentrum import (AC_BASE, AC_FUEL, DRIVE_RU, FUEL_RU, GEARBOX_RU, MILD, ROOT, SINCE, body_tags, config_parts,
                         engine_found, group_body_level, match_gens, option_label, our_generations, read_table,
                         verdict)


def main():
    ours = our_generations(read_table())
    source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "autocentrum-models.json")
    with open(source, encoding="utf8") as handle:
        ac = json.load(handle)

    merged = collections.OrderedDict()
    options_for_unknown = collections.defaultdict(set)

    def add(brand, model, kind, ac_gen, our_codes, body, what, ours_text, url, years=None, name="", option="",
            fuel=""):
        """One line per finding; the same engine in several bodies (or under several names)
        lists the bodies and names and joins the years."""
        item = merged.setdefault((kind, brand, model, ac_gen, what), {
            "Марка": brand, "Модель": model, "Категория": kind, "Поколение (autocentrum)": ac_gen,
            "Наше поколение": our_codes, "Есть на autocentrum": what, "Названия": [], "Варианты": [], "Годы": years,
            "Кузова (autocentrum)": [], "У нас": ours_text, "Ссылка": AC_BASE + url, "_fuel": fuel})
        if body and body not in item["Кузова (autocentrum)"]:
            item["Кузова (autocentrum)"].append(body)
        if name and name not in item["Названия"]:
            item["Названия"].append(name)
        if option and option not in item["Варианты"]:
            item["Варианты"].append(option)
        if years and item["Годы"]:
            old_from, old_to = item["Годы"]
            item["Годы"] = (min(old_from, years[0]), None if None in (old_to, years[1]) else max(old_to, years[1]))

    stats = collections.Counter()
    for model in ac["models"]:
        brand, label = model["brand"], model["label"]
        our_gens = ours.get((brand, label), {})
        generations = [g for g in group_body_level(model["generations"])
                       if g["bodies"] and any(b["engines"] for b in g["bodies"])]
        matches = [match_gens(gen, our_gens) for gen in generations]
        # Start/end years are compared only where the generations correspond one to one.
        used = collections.Counter(g["code"] for matched in matches for g in matched)
        for gen, matched in zip(generations, matches):
            gen_name = f"{gen['name']} ({gen['from']}–{gen['to'] or 'н. в.'})"
            one_to_one = len(matched) == 1 and used[matched[0]["code"]] == 1 and not gen.get("body_level")
            stats["поколений autocentrum"] += 1
            if not matched:
                engines = sum(len(b["engines"]) for b in gen["bodies"])
                add(brand, label, "поколение", gen_name, "—", ", ".join(b["name"] for b in gen["bodies"]),
                    f"{len(gen['bodies'])} кузовов, {engines} двигателей", "нет поколения", gen["path"])
                continue
            codes = ", ".join(g["code"] for g in matched)
            rows = [r for g in matched for r in g["rows"]]
            our_bodies = {b for g in matched for b in g["bodies"]}
            our_tags = set().union(*(body_tags(label, b) for b in our_bodies)) if our_bodies else set()

            # Years: start/end of the generation and the facelift.
            our_from = min(g["from"] for g in matched)
            our_to = None if any(g["to"] is None for g in matched) else max(g["to"] for g in matched)
            # Facelifts: body "… Facelifting" start years, neighbours (±1) are one facelift.
            ac_lifts = []
            for year in sorted({b["from"] for b in gen["bodies"] if "facelifting" in b["name"].lower() and b["from"]}):
                if not ac_lifts or year - ac_lifts[-1] > 1:
                    ac_lifts.append(year)
            our_lifts = sorted({y for g in matched for y in g["lifts"]})
            year_notes = []
            if one_to_one and abs(gen["from"] - our_from) >= 2:
                year_notes.append(f"начало {gen['from']} / у нас {our_from}")
            if one_to_one and abs((gen["to"] or 2026) - (our_to or 2026)) >= 2:
                year_notes.append(f"конец {gen['to'] or 'н. в.'} / у нас {our_to or 'н. в.'}")
            for year in ac_lifts:
                if any(abs(year - y) <= 1 for y in our_lifts):
                    continue
                if our_lifts:
                    ours_text = "у нас " + ", ".join(map(str, our_lifts))
                elif any(g.get("lift_unknown") for g in matched):
                    ours_text = "у нас рестайлинг без года"
                else:
                    ours_text = "у нас рестайлинг не выделен"
                year_notes.append(f"рестайлинг {year} / {ours_text}")
            if year_notes:
                add(brand, label, "годы", gen_name, codes, "", "; ".join(year_notes), "", gen["path"])

            # Fuel kinds (LPG and CNG are one kind: autocentrum files EcoFuel CNG under LPG).
            our_fuels = {"lpg" if r["fuel"] == "cng" else r["fuel"] for r in rows}
            ac_fuels = collections.OrderedDict()
            for body in gen["bodies"]:
                for engine in body["engines"]:
                    fuel = AC_FUEL.get(engine["type"], "petrol")
                    if fuel in ("hybrid", "hybrid_diesel") and (MILD.search(engine["text"]) or any(
                            r["fuel"] in ("petrol", "diesel", "hybrid", "hybrid_diesel", "plugin")
                            for r in engine_found(engine, rows, brand))):
                        continue  # a mild hybrid or a car we have under another fuel label
                    # Prefer a full hybrid as the example of the kind.
                    if fuel not in ac_fuels or (MILD.search(ac_fuels[fuel]["text"]) and not MILD.search(engine["text"])):
                        ac_fuels[fuel] = engine
            for fuel, engine in ac_fuels.items():
                # Mild hybrids are petrol/diesel cars for the filters; only full hybrids count as "hybrid".
                present = fuel in our_fuels if fuel != "hybrid" else any(r["fuel"] == "hybrid" and not r["mild"]
                                                                         for r in rows)
                if not present:
                    add(brand, label, "топливо", gen_name, codes, "", f"{FUEL_RU[fuel]}: {engine['text']}",
                        "нет такого топлива в поколении", gen["path"])

            for body in gen["bodies"]:
                stats["кузовов autocentrum"] += 1
                missing_tags = body_tags(label, body["name"], gen["name"]) - our_tags
                if missing_tags and not (body["to"] and body["to"] < SINCE):
                    add(brand, label, "кузов", gen_name, codes, body["name"],
                        f"{body['name']} ({body['from']}–{body['to'] or 'н. в.'}): {', '.join(sorted(missing_tags))}",
                        "; ".join(sorted(our_bodies))[:300], body["path"])
                for engine in body["engines"]:
                    stats["двигателей autocentrum"] += 1
                    if "hp" not in engine:
                        continue
                    if engine["to"] and engine["to"] < SINCE:
                        stats["двигателей до 2010 (не сравниваются)"] += 1
                        continue
                    found = list(engine_found(engine, rows, brand))
                    fuel = AC_FUEL.get(engine["type"], "petrol")
                    size = f"{engine['litres']} " if engine.get("litres") else ""
                    if not found:
                        add(brand, label, "двигатель", gen_name, codes, body["name"],
                            f"{FUEL_RU[fuel]} {size}{engine['hp']} KM {engine['kw']} kW",
                            "нет двигателя такой мощности", body["path"] + engine["slug"] + "/",
                            (engine["from"], engine["to"]), engine["name"])
                        continue
                    if all(abs(r["hp"] - engine["hp"]) > 3 and abs(r["kw"] - engine["kw"]) > 2 for r in found):
                        add(brand, label, "мощность", gen_name, codes, body["name"],
                            f"{FUEL_RU[fuel]} {size}{engine['hp']} KM",
                            "у нас " + ", ".join(sorted({f"{r['hp']} л.с." for r in found})) +
                            " (мягкий гибрид: мощность с электромотором или без)",
                            body["path"] + engine["slug"] + "/", (engine["from"], engine["to"]), engine["name"])
                    stats["двигателей найдено"] += 1
                    for config in engine.get("configs", []):
                        gearbox, drive = config_parts(config)
                        if not gearbox:
                            continue
                        stats["вариантов коробка+привод"] += 1
                        # Drive not stated on the page: compare the gearbox only.
                        on_drive = [r for r in found if not drive or r["drive"] == drive]
                        for row in on_drive:
                            if not row["gearbox"]:
                                options_for_unknown[id(row)].add(gearbox)
                        same = [r for r in on_drive if r["gearbox"] == gearbox]
                        unknown = [r for r in on_drive if not r["gearbox"]]
                        if same:
                            continue
                        what = f"{FUEL_RU[fuel]} {size}{engine['hp']} KM"
                        option = option_label(config)
                        url = body["path"] + engine["slug"] + "/"
                        if not on_drive:
                            have = sorted({DRIVE_RU.get(r["drive"], "?") for r in found})
                            add(brand, label, "привод", gen_name, codes, body["name"], what,
                                "привод у нас: " + ", ".join(have), url, name=engine["name"], option=option, fuel=fuel)
                        elif unknown:
                            add(brand, label, "коробка+", gen_name, codes, body["name"], what,
                                "коробка не указана", url, name=engine["name"], option=option)
                        else:
                            have = sorted({f"{GEARBOX_RU.get(r['gearbox'], '?')} / {DRIVE_RU.get(r['drive'], '?')}"
                                           for r in on_drive})
                            add(brand, label, "коробка", gen_name, codes, body["name"], what,
                                "у нас: " + "; ".join(have), url, name=engine["name"], option=option, fuel=fuel)

    # How many of our versions without a gearbox autocentrum settles (one gearbox for that engine and drive).
    unknown_rows = [r for gens in ours.values() for g in gens.values() for r in g["rows"] if not r["gearbox"]]
    stats["наших версий без коробки"] = len(unknown_rows)
    stats["из них autocentrum знает коробку однозначно"] = sum(len(options_for_unknown.get(id(r), ())) == 1
                                                               for r in unknown_rows)
    stats["из них есть и механика, и автомат"] = sum(len(options_for_unknown.get(id(r), ())) == 2
                                                     for r in unknown_rows)

    findings = []
    for item in merged.values():
        years = item["Годы"]
        verdicts = sorted({verdict(item["Категория"], item["Марка"], item["Поколение (autocentrum)"],
                                   " / ".join(item["Названия"]), ", ".join(item["Кузова (autocentrum)"]), option,
                                   item["_fuel"]) for option in item["Варианты"]}) \
            if item["Категория"] in ("привод", "коробка") else []
        item = {k: v for k, v in item.items() if k != "_fuel"}
        item["Вывод"] = "; ".join(verdicts)
        findings.append({**item, "Кузова (autocentrum)": ", ".join(item["Кузова (autocentrum)"]),
                         "Названия": " / ".join(item["Названия"]), "Варианты": "; ".join(item["Варианты"]),
                         "Годы": f"{years[0]}–{years[1] or 'н. в.'}" if years else ""})
    with open(os.path.join(ROOT, "data", "autocentrum-diff.csv"), "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(findings[0].keys()), delimiter=";", lineterminator="\n")
        writer.writeheader()
        writer.writerows(findings)
    counts = collections.Counter(f["Категория"] for f in findings)
    write_full_table(ac)
    write_report(ac, findings, stats)
    print(dict(stats))
    print(dict(counts))
    return findings, stats


def write_full_table(ac):
    """All autocentrum engines of our models in one sheet, with the fields our table lacks."""
    out = []
    for model in ac["models"]:
        for gen in model["generations"]:
            for body in gen["bodies"]:
                for engine in body["engines"]:
                    if "hp" not in engine or (engine["to"] and engine["to"] < SINCE):
                        continue
                    fuel = AC_FUEL.get(engine["type"], "petrol")
                    options = sorted({option_label(c) for c in engine.get("configs", []) if config_parts(c)[0]})
                    euro = sorted({m.group(0) for c in engine.get("configs", [])
                                   for m in [re.search(r"Euro \S+", c)] if m}) or \
                        ([engine["Norma emisji spalin"]] if engine.get("Norma emisji spalin") else [])
                    out.append({
                        "Марка": model["brand"], "Модель": model["label"],
                        "Поколение": f"{gen['name']} ({gen['from']}–{gen['to'] or 'н. в.'})",
                        "Кузов": body["name"],
                        "Рестайлинг": "да" if "facelifting" in body["name"].lower() else "",
                        "Топливо": FUEL_RU[fuel], "Объём, л": engine.get("litres", ""),
                        "Объём, см³": re.sub(r"\D", "", engine.get("Pojemność skokowa", "")),
                        "Двигатель": engine["name"], "Мощность, KM": engine["hp"], "Мощность, кВт": engine["kw"],
                        "Годы": f"{engine['from']}–{engine['to'] or 'н. в.'}",
                        "Коробка / привод": "; ".join(options),
                        "Двери": engine.get("Liczba drzwi") or body.get("doors", ""),
                        "Места": engine.get("Liczba miejsc") or body.get("seats", ""),
                        "Момент": engine.get("Maksymalny moment obrotowy", ""),
                        "Норма Euro": ", ".join(euro), "Код двигателя": engine.get("Kod silnika", ""),
                        "Батарея": engine.get("Pojemność akumulatora", ""),
                        "Ссылка": AC_BASE + body["path"] + engine["slug"] + "/",
                    })
    with open(os.path.join(ROOT, "data", "autocentrum-table.csv"), "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(out[0].keys()), delimiter=";", lineterminator="\n")
        writer.writeheader()
        writer.writerows(out)


KINDS = [
    ("поколение", "Поколения, которых нет у нас"),
    ("кузов", "Кузова, которых нет в нашем поколении"),
    ("двигатель", "Двигатели (топливо + объём + мощность), которых нет в нашем поколении"),
    ("топливо", "Виды топлива, которых нет в нашем поколении"),
    ("привод", "Привод, которого нет у нас для этого двигателя"),
    ("коробка", "Коробка, которой нет у нас для этого двигателя и привода"),
    ("коробка+", "Коробка у нас не указана — autocentrum её называет"),
    ("годы", "Годы поколения или рестайлинга расходятся на 2+ года (для сведения)"),
    ("мощность", "Мощность мягких гибридов записана по-разному (для сведения)"),
]


def cell(text):
    return str(text).replace("|", "/").replace("\n", " ")


def write_report(ac, findings, stats):
    by_kind = collections.defaultdict(list)
    for item in findings:
        by_kind[item["Категория"]].append(item)
    models = [(m["brand"], m["label"]) for m in ac["models"]]
    per_model = collections.Counter((f["Марка"], f["Модель"], f["Категория"]) for f in findings)
    doors = collections.Counter()
    for model in ac["models"]:
        for gen in model["generations"]:
            for body in gen["bodies"]:
                doors["кузовов"] += 1
                doors["с дверьми"] += bool(body.get("doors"))
                doors["с местами"] += bool(body.get("seats"))

    table = read_table()
    carried = collections.Counter(r.get("Источник", "") for r in table)
    gearbox = sum(r["Коробка: откуда"].startswith("autocentrum") and r.get("Источник") != "autocentrum" for r in table)
    lines = [
        "# Проверка таблицы моделей по autocentrum.pl (B61)",
        "",
        "> Сгенерировано `tools/check-autocentrum.py` из `data/model-engines.csv` (наша таблица, ultimatespecs) и "
        "`data/autocentrum-models.json` (`tools/crawl-autocentrum.py`). Не править руками. "
        "Полная таблица находок: [`data/autocentrum-diff.csv`](../data/autocentrum-diff.csv). Цель и этапы: "
        "[PROJECT-MOBILE.md](PROJECT-MOBILE.md) §4.8.",
        "",
        "Источник: https://www.autocentrum.pl/dane-techniczne/ — модель → поколение → кузов (дорест / "
        "Facelifting) → двигатель → варианты «Wybierz parametry napędu» (коробка, привод). "
        f"Поколения, выпускавшиеся в {ac['since']} и позже. Собрано {ac.get('collected', '')}.",
        "",
        "Столбец «Вывод» у привода и коробки: autocentrum тоже ошибается (Polo V и Octavia 1.2 TSI «4x4», "
        "BMW 330i «FWD»), поэтому каждая такая строка помечена: «у нас ошибка (вероятно)» — версия бывает только "
        "с полным приводом (quattro, RS, S, M40i, Scout, Cross Country…), «ошибка autocentrum (вероятно)» — "
        "противоречит названию или платформе, «проверить» — решить по странице версии.",
        "",
        "Как сравнивается: поколение — по годам (общие годы ≥ 60 % более короткого; нумерация на сайтах разная: "
        "Touran II autocentrum = наш Touran I рестайлинг 2); двигатель — то же семейство топлива (бензин/LPG/CNG/"
        "гибрид — одно, дизель/дизель-гибрид — другое, плагин, электро), мощность ±3 л.с. (плагин/гибрид ±8), "
        "объём ±0,15 л; мягкие гибриды и Mercedes с 2018 — до ±25 л.с. при том же объёме (у одного сайта мощность "
        "с электромотором, у другого без) → категория «мощность»; двигатели и кузова, выпускавшиеся только до "
        f"{SINCE}, не сравниваются; кузов — по виду (универсал, кабриолет, купе, седан у хэтчбеков, 3 двери, "
        "кросс-версия, удлинённый, SUV-купе, гран купе); коробка и привод — по вариантам двигателя.",
        "",
        "## Итог",
        "",
        f"Уже перенесено в нашу таблицу (`tools/autocentrum.py` → `merge()`, столбец «Источник»): "
        f"{carried['autocentrum']} строк из autocentrum, коробка у {gearbox} версий ultimatespecs. "
        "Ниже — что осталось после переноса.",
        "",
        f"- Просмотрено на autocentrum: {stats['поколений autocentrum']} поколений, {stats['кузовов autocentrum']} "
        f"кузовов, {stats['двигателей autocentrum']} двигателей (по кузовам); найдено у нас "
        f"{stats['двигателей найдено']}.",
    ]
    if stats.get("вариантов коробка+привод"):
        lines.append(f"- Вариантов «коробка + привод» со страниц двигателей: {stats['вариантов коробка+привод']}. "
                     f"Наших версий без коробки: {stats['наших версий без коробки']}; autocentrum даёт для них "
                     f"одну коробку (можно заполнить) — {stats['из них autocentrum знает коробку однозначно']}, "
                     f"и механику, и автомат (какая у нашей версии — не сказать) — "
                     f"{stats['из них есть и механика, и автомат']}.")
    lines += [f"- {title}: **{len(by_kind[kind])}**" for kind, title in KINDS if by_kind[kind]]
    lines += [
        "",
        "Категории данных, которых в нашей таблице нет совсем, а на autocentrum есть: число дверей и мест "
        f"(у {doors['с дверьми']} из {doors['кузовов']} кузовов; это наши фильтры «Liczba drzwi» и «Liczba miejsc»), "
        "крутящий момент, норма Euro, расход, CO₂, размеры, багажник, масса, разгон, макс. скорость, бак. "
        "Двери и места сохранены в `data/autocentrum-models.json`.",
        "",
        "## По моделям",
        "",
        "| Марка | Модель | " + " | ".join(kind for kind, _ in KINDS) + " |",
        "|---|---|" + "---|" * len(KINDS),
    ]
    for brand, label in models:
        values = [str(per_model[(brand, label, kind)] or "") for kind, _ in KINDS]
        lines.append(f"| {brand} | {label} | " + " | ".join(values) + " |")

    for kind, title in KINDS:
        items = by_kind[kind]
        if not items:
            continue
        lines += ["", f"## {title} ({len(items)})", ""]
        if kind == "коробка+":
            per = collections.Counter((f["Марка"], f["Модель"]) for f in items)
            lines.append("Это не пропуск, а подсказка: где у нас «не указано», autocentrum называет коробку. "
                         "Список по моделям (строки — в CSV):")
            lines.append("")
            lines.append(", ".join(f"{b} {m} — {n}" for (b, m), n in per.most_common()))
            continue
        lines += ["| Марка | Модель | Поколение (autocentrum) | Наше | Есть на autocentrum | Годы | Кузова | У нас |",
                  "|---|---|---|---|---|---|---|---|"]
        for f in items:
            lines.append(f"| {f['Марка']} | {f['Модель']} | {cell(f['Поколение (autocentrum)'])} | "
                         f"{cell(f['Наше поколение'])} | [{cell(f['Есть на autocentrum'])}]({f['Ссылка']})"
                         f"{' — ' + cell(f['Названия']) if f['Названия'] else ''}"
                         f"{': ' + cell(f['Варианты']) if f['Варианты'] else ''} | "
                         f"{f['Годы']} | {cell(f['Кузова (autocentrum)'])} | {cell(f['У нас'])[:120]}"
                         f"{' — **' + cell(f['Вывод']) + '**' if f['Вывод'] else ''} |")
    with open(os.path.join(ROOT, "docs", "MODEL-AUTOCENTRUM-CHECK.md"), "w", encoding="utf8") as handle:
        handle.write("\n".join(lines).rstrip("\n") + "\n")


if __name__ == "__main__":
    main()
