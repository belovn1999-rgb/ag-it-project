#!/usr/bin/env python3
"""How confirmed each value of the engine table is (B61 stages 16, 17 and 20, owner 2026-10-23).

"Confirmed" = two independent sources agree (owner): autocentrum.pl, ultimatespecs.com, the ADAC catalog,
Wikipedia (the facelift years of tools/collect-facelifts-wiki.py and the hand-checked
data/model-facelifts-manual.json both quote it, so they are one source). One source is "одна база"; a value the
build worked out is "вывод" (a manual version because an automatic twin exists, the drive "as the model"), or
"правило" (an electric car or a hybrid is automatic); nothing is "нет".

Per row, five columns (tools/build-model-engine-table.py calls confirm() after the merge):
- "Подтверждение: мотор" — fuel, power, displacement: the other database has the same engine in this generation
  (tools/autocentrum.py engine_found(), both ways);
- "Подтверждение: годы" — the generation's first and last year: both databases within a year;
- "Подтверждение: фаза" — the facelift year the phase rests on (ultimatespecs' facelift generation or body,
  autocentrum's "Facelifting" bodies, Wikipedia), or no facelift at all (Wikipedia by hand + autocentrum);
- "Подтверждение: коробка", "Подтверждение: привод" — where the value came from, plus autocentrum's options for
  that engine when the row is not autocentrum's own.
Stage 17 (2026-10-24): the ADAC catalog is the third source (tools/adac_check.py, data/adac-versions.json) for
the engine, the years, the facelift, an automatic and all-wheel drive; the row's ADAC twin goes to "ADAC: версия".
Stage 20: "Рынок" = "нет в Польше и Германии" for a generation only ultimatespecs has, of a model autocentrum or ADAC
knows (or one we call "вне ЕС"); tools/build-model-specs.py leaves its versions out of the page's engines.
docs/MODEL-CONFIRMATION.md sums it up by field, source and brand.
"""
import collections
import json
import os
import re

import adac_check
import autocentrum

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLUMNS = ["Подтверждение: мотор", "Подтверждение: годы", "Подтверждение: фаза", "Подтверждение: коробка",
           "Подтверждение: привод"]
# Stage 17 (2026-10-24): the ADAC twin of the row ("BMW 118i Steptronic 2015-03…2017-06"), the evidence by hand.
ADAC_COLUMN = "ADAC: версия"
# Stage 20 (2026-10-24, owner 2026-10-23: versions not for Europe go under the line, stay in the table): a
# generation only ultimatespecs has, of a model autocentrum.pl (Poland) or ADAC (Germany) knows.
MARKET_COLUMN = "Рынок"
# 2026-10-28: the gearbox / drive of the row is not confirmed and the ADAC twin's version page states another one
# (data/adac-details.json) — a value to check by hand, not changed by itself.
DIFF_COLUMN = "ADAC: другое"
NOT_HERE = "нет в Польше и Германии"
# Where a gearbox / drive came from ("Коробка: откуда", "Привод: откуда") -> the source that states it
# (None: the row's own source, its version name).
STATED = {"autocentrum": "autocentrum", "autocentrum (у двигателя одна коробка)": "autocentrum",
          "со страницы версии": "ultimatespecs", "ultimatespecs": "ultimatespecs", "adac": "adac",
          "из названия": None, "из названия (4x2/2WD)": None, "из названия (sDrive)": None}
RULES = {"по правилу (гибрид/электро)": "электро и гибрид — автомат", "по правилу (модель только 4x4)": "модель только 4x4"}
LIFT_STAGES = re.compile(r"^(рестайлинг|обновление)")


def _load(name):
    path = os.path.join(ROOT, "data", name)
    return json.load(open(path, encoding="utf8")) if os.path.exists(path) else {}


def _status(sources, fallback=""):
    sources = sorted(s for s in sources if s)
    if len(sources) >= 2:
        return "подтверждено: " + " + ".join(sources)
    if sources:
        return "одна база: " + sources[0]
    return fallback or "нет"


def _twin(row, others):
    """An engine of another database in the same generation: same fuel family, power within 3 KM (2 kW),
    displacement within 0.15 l (autocentrum.engine_found the other way round)."""
    fuel = autocentrum.FAMILY[autocentrum.OUR_FUEL.get(row["Топливо"], "petrol")]
    hp, kw = int(row["Мощность, л.с."] or 0), int(row["Мощность, кВт"] or 0)
    litres = float(row["Объём, л"] or 0)
    for other in others:
        if autocentrum.FAMILY[autocentrum.OUR_FUEL.get(other["Топливо"], "petrol")] != fuel:
            continue
        if abs(int(other["Мощность, л.с."] or 0) - hp) > 3 and abs(int(other["Мощность, кВт"] or 0) - kw) > 2:
            continue
        if litres and other["Объём, л"] and abs(float(other["Объём, л"]) - litres) > 0.15:
            continue
        return True
    return False


def _years(rows):
    """First and last year a database gives a generation ("Годы (источник)" of its rows; None = still made)."""
    spans = [span for span in (autocentrum.our_years(r["Годы (источник)"]) for r in rows) if span[0]]
    if not spans:
        return None
    return min(s for s, _e in spans), (None if any(e is None or e >= 2025 for _s, e in spans) else max(e for _s, e in spans))


def _same_years(a, b):
    end_a, end_b = a[1] or 2026, b[1] or 2026
    return abs(a[0] - b[0]) <= 1 and abs(end_a - end_b) <= 1


def _evidence(models, gens, source):
    """(found {id(row)}, options {id(row): {(gearbox, drive)}}, generations {(brand, label, code): [their gens]}) of one
    database in autocentrum's shape, compared with our rows of the other sources (tools/autocentrum.py engine_found)."""
    found, options, their_gens = set(), collections.defaultdict(set), collections.defaultdict(list)
    for model in models:
        key = (model["brand"], model["label"])
        for gen_of_theirs in autocentrum.group_body_level(model["generations"]):
            matched = autocentrum.match_gens(gen_of_theirs, gens.get(key, {}))
            for gen in matched:
                their_gens[(*key, gen["code"])].append(gen_of_theirs)
            ours = [item for gen in matched for item in gen["rows"] if item["src"].get("Источник") != source]
            for body in gen_of_theirs["bodies"]:
                for engine in body["engines"]:
                    if engine.get("to") and engine["to"] < autocentrum.SINCE:
                        continue
                    for item in autocentrum.engine_found(engine, ours, model["brand"]):
                        found.add(id(item["src"]))
                        options[id(item["src"])] |= {autocentrum.config_parts(c) for c in engine.get("configs", [])}
    return found, options, their_gens


def confirm(rows, ac):
    """Fill COLUMNS in every row (rows edited in place); returns {column: Counter of statuses}."""
    for row in rows:
        for column in COLUMNS + [ADAC_COLUMN, MARKET_COLUMN, DIFF_COLUMN]:
            row[column] = ""
    gens = autocentrum.our_generations(rows)
    adac_rows, adac_gens = adac_check.evidence(rows)
    # autocentrum: its engines found in our rows of other sources, their gearbox / drive options, its generations.
    autocentrum_models = [m for m in ac.get("models", []) if m.get("source") not in ("ultimatespecs", "adac")]
    found, options, ac_gens = _evidence(autocentrum_models, gens, "autocentrum")
    # ultimatespecs read again for the models we have from autocentrum or ADAC only (owner 2026-10-25,
    # tools/crawl-ultimatespecs-models.py --check): the same comparison, for the rows of the other sources.
    us_models = _load("ultimatespecs-check.json").get("models", [])
    us_found, us_options, us_gens = _evidence(us_models, gens, "ultimatespecs")

    wiki = {key: value["year"] for key, value in _load("model-facelifts-wiki.json").items() if value.get("accepted")}
    manual = {key: value["year"] for key, value in _load("model-facelifts-manual.json").items()}

    def wiki_year(row):
        """(known, year) — Wikipedia's facelift year of the row's generation (None: Wikipedia says none)."""
        for model in (row["Модель"], row["Модель mobile.de"]):
            key = f"{row['Марка']}|{model}|{row['Поколение']}"
            if key in manual:
                return True, manual[key]
            if key in wiki:
                return True, wiki[key]
        return False, None

    for (brand, label), model_gens in gens.items():
        for code, gen in model_gens.items():
            items = [item["src"] for item in gen["rows"]]
            by_source = collections.defaultdict(list)
            for row in items:
                by_source[row.get("Источник", "ultimatespecs")].append(row)
            adac_years = adac_gens.get((brand, label, code))
            # ADAC's added rows carry our phase's years: its own span is the generation pages' (below).
            matched = ac_gens.get((brand, label, code), [])
            # Years: what each database gives the generation.
            spans = {source: span for source, source_rows in by_source.items()
                     if (span := _years(source_rows)) and not (source == "adac" and adac_years)}
            if matched and "autocentrum" not in spans:
                closest = min(matched, key=lambda g: abs(g["from"] - gen["from"]))
                spans["autocentrum"] = (closest["from"], closest["to"])
            adac = adac_gens.get((brand, label, code))
            if adac and "adac" not in spans:
                spans["adac"] = adac["span"]
            us_matched = us_gens.get((brand, label, code), [])
            if us_matched and "ultimatespecs" not in spans:
                closest = min(us_matched, key=lambda g: abs(g["from"] - gen["from"]))
                spans["ultimatespecs"] = (closest["from"], closest["to"])
            agree = set()
            for a in spans:
                for b in spans:
                    if a < b and _same_years(spans[a], spans[b]):
                        agree |= {a, b}
            years = _status(agree) if agree else _status(set(list(spans)[:1]))
            # Phase: the facelift year and who states it.
            lifts = sorted(gen["lifts"])
            split = any(LIFT_STAGES.match(r["Этап"]) or r["Этап"] == "дорестайлинг" for r in items)
            known, wiki_lift = wiki_year(items[0])
            if not lifts and known and wiki_lift:
                lifts = [wiki_lift]  # the year only Wikipedia gives (the page shows it, the versions stay one phase)
            if not lifts and adac and adac["lifts"]:
                lifts = adac["lifts"][:1]  # ADAC's facelift page inside a generation we keep whole
            if lifts:
                lift = lifts[0]
                said = set()
                for row in by_source.get("ultimatespecs", []):
                    stage = re.match(r"рестайлинг \((\d{4})\)", row["Этап"])
                    start = int(stage.group(1)) if stage else autocentrum.our_years(row["Годы (источник)"])[0] \
                        if LIFT_STAGES.match(row["Этап"]) else None
                    if start and abs(start - lift) <= 1:
                        said.add("ultimatespecs")
                if any(abs(year - lift) <= 1 for g in us_matched for year in autocentrum.facelift_years(g)):
                    said.add("ultimatespecs")
                if any(abs(year - lift) <= 1 for g in matched for year in autocentrum.facelift_years(g)) or \
                        any(abs(int(r["Рестайлинг, год"] or 0) - lift) <= 1 for r in by_source.get("autocentrum", [])):
                    said.add("autocentrum")
                if known and wiki_lift and abs(wiki_lift - lift) <= 1:
                    said.add("Википедия")
                if any(LIFT_STAGES.match(r["Этап"]) for r in by_source.get("adac", [])) or \
                        (adac and any(abs(year - lift) <= 1 for year in adac["lifts"])):
                    said.add("adac")
                phase = _status(said, "вывод: год рестайлинга без источника")
                if not split:
                    phase += " (год есть, версии не разделены)"
            elif (known and wiki_lift is None) or adac:
                # No facelift: Wikipedia by hand, ADAC (its generation has no facelift page), autocentrum (none
                # of its bodies is "Facelifting") — autocentrum alone is no statement.
                said = ({"Википедия"} if known else set()) | ({"adac"} if adac else set())
                if said and matched and not any(autocentrum.facelift_years(g) for g in matched):
                    said.add("autocentrum")
                phase = _status(said) + " (без рестайлинга)"
            else:
                phase = "нет данных о рестайлинге"
            for row in items:
                row["Подтверждение: годы"], row["Подтверждение: фаза"] = years, phase

    # Models autocentrum or ADAC know (a generation of them missing there says something).
    known_models = {(b, l) for (b, l, _c) in list(ac_gens) + list(adac_gens)}
    known_models |= {(r["Марка"], r["Модель"]) for r in rows if r.get("Источник") in ("autocentrum", "adac")}
    # Engine, gearbox, drive: per row.
    by_gen = collections.defaultdict(lambda: collections.defaultdict(list))
    for row in rows:
        by_gen[(row["Марка"], row["Модель"], row["Поколение"])][row.get("Источник", "ultimatespecs")].append(row)
    for row in rows:
        source = row.get("Источник", "ultimatespecs")
        engine = {source}
        if source != "autocentrum" and id(row) in found:
            engine.add("autocentrum")
        if source != "ultimatespecs" and id(row) in us_found:
            engine.add("ultimatespecs")
        if source == "autocentrum" and _twin(row, by_gen[(row["Марка"], row["Модель"], row["Поколение"])]["ultimatespecs"]):
            engine.add("ultimatespecs")
        adac = adac_rows.get(id(row), {})
        if source != "adac" and adac.get("twins"):
            engine.add("adac")
            twin = adac["twins"][0]
            row[ADAC_COLUMN] = f"{twin[0]} · {twin[1]} · {twin[2]} kW · {twin[4]}–{twin[5] or ''}"
        row["Подтверждение: мотор"] = _status(engine)
        key = (row["Марка"], row["Модель"], row["Поколение"])
        start, end = autocentrum.our_years(row["Годы (проверено)"])
        gen_known = key in ac_gens or key in adac_gens or key in us_gens or \
            any(by_gen[key][s] for s in ("autocentrum", "adac"))
        model_known = (row["Марка"], row["Модель"]) in known_models
        # A generation of a model they know that neither has (Genesis G80 DH), or one our table already calls
        # "вне ЕС" (Toyota Camry XV40 / XV50). Before 2011 the sources' cut-offs (autocentrum from 2010, ADAC
        # versions on sale in 2009) say nothing.
        # Only whole generations: ADAC and autocentrum both miss single special versions sold here (Golf GTI
        # Clubsport 2024, RS3 Performance Edition) — a version missing there stays "одна база". A generation
        # started from 2023 may simply not be in the sources yet (Scénic V E-Tech, GLC EQ).
        gen_from = gens.get((row["Марка"], row["Модель"]), {}).get(row["Поколение"], {}).get("from") or 0
        missing_gen = not gen_known and model_known and (end or 2026) >= 2011 and gen_from < 2023
        if (engine == {"ultimatespecs"} and missing_gen) or "вне ЕС" in row["Поколение"]:
            row[MARKET_COLUMN] = NOT_HERE
        their = options.get(id(row), set()) if source != "autocentrum" else set()
        for column, value, origin, codes, index in (
                ("Подтверждение: коробка", row["Коробка"], row["Коробка: откуда"], autocentrum.OUR_GEARBOX, 0),
                ("Подтверждение: привод", row["Привод"], row["Привод: откуда"], autocentrum.OUR_DRIVE, 1)):
            if not value:
                row[column] = "нет"
                continue
            stated = set()
            if origin in STATED:
                stated.add(STATED[origin] or source)
            if codes.get(value) and any(option[index] == codes[value] for option in their):
                stated.add("autocentrum")
            if source != "ultimatespecs" and codes.get(value) and \
                    any(option[index] == codes[value] for option in us_options.get(id(row), set())):
                stated.add("ultimatespecs")
            if source != "adac" and codes.get(value) in adac.get("gearbox" if index == 0 else "drive", set()):
                stated.add("adac")
            page = adac.get("page_gearbox" if index == 0 else "page_drive")
            if source != "adac" and page and codes.get(value) not in page and len(stated) < 2:
                said = "коробка" if index == 0 else "привод"
                row[DIFF_COLUMN] = "; ".join(filter(None, [row[DIFF_COLUMN], f"{said} — {adac['page_text']}"]))
            if stated:
                row[column] = _status(stated)
            elif origin in RULES:
                row[column] = "правило: " + RULES[origin]
            else:
                row[column] = "вывод: " + (origin or "без пометки")
    counts = {column: collections.Counter(row[column].split(":")[0].split(" (")[0] for row in rows) for column in COLUMNS}
    return counts


def write_report(rows, today):
    """docs/MODEL-CONFIRMATION.md: the statuses by field, by source and by brand."""
    kinds = ["подтверждено", "одна база", "правило", "вывод", "нет", "нет данных о рестайлинге"]

    def kind(value):
        return next((k for k in kinds if value.startswith(k)), value.split(":")[0])

    def share(part, whole):
        return f"{part} ({part * 100 / whole:.0f} %)" if whole else "0"

    total = len(rows)
    lines = [
        "# Справочник моделей — насколько подтверждены данные",
        "",
        f"Сгенерировано `tools/confirm.py` ({today}) из `data/model-engines.csv`. Этап B61 п. 16 "
        "(`docs/PROJECT-MODELS.md`). **Подтверждено** — два независимых источника согласны (решение владельца "
        "23.10): autocentrum.pl, ultimatespecs.com, каталог ADAC, Википедия. **Одна база** — значение есть только "
        "в одном источнике. **Правило** — электро и гибрид всегда с автоматом, модель только 4x4. **Вывод** — значение "
        "вычислено («механика, раз есть такая же с автоматом», «привод как у модели»). На странице пока ничего не меняется.",
        "",
        f"Версий в таблице: {total}.",
        "",
        "| Поле | Подтверждено | Одна база | Правило | Вывод | Нет |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for column in COLUMNS:
        counts = collections.Counter(kind(row[column]) for row in rows)
        none = counts["нет"] + counts["нет данных о рестайлинге"]
        lines.append(f"| {column.split(': ')[1]} | {share(counts['подтверждено'], total)} | "
                     f"{share(counts['одна база'], total)} | {share(counts['правило'], total)} | "
                     f"{share(counts['вывод'], total)} | {share(none, total)} |")
    phase = collections.Counter(row["Подтверждение: фаза"].split(": ", 1)[-1] if row["Подтверждение: фаза"].startswith(
        ("подтверждено", "одна база")) else row["Подтверждение: фаза"] for row in rows)
    lines += ["", "**Фаза (дорест / рест)** подробно — источники года рестайлинга или «без рестайлинга»:", "",
              "| Чем подтверждено | Версий |", "|---|---:|"]
    lines += [f"| {name} | {count} |" for name, count in phase.most_common()]
    adac_twins = sum(bool(row.get(ADAC_COLUMN)) for row in rows)
    not_here = [row for row in rows if row.get(MARKET_COLUMN) == NOT_HERE]
    lines += ["", "## Каталог ADAC (этап 17)", "",
              f"Версий, у которых в ADAC (рынок Германии, данные производителя) нашлась та же версия — тот же вид топлива, "
              f"мощность ± 3 л. с., объём ± 0,1 л, в продаже в те же годы: **{share(adac_twins, total)}**; пара — в колонке "
              f"«{ADAC_COLUMN}» (`data/model-engines.csv`). Страницы поколений — `data/adac-versions.json` "
              "(`tools/collect-adac-versions.py`).", "",
              "## Нет в Польше и Германии (этап 20)", "",
              f"Поколения только с ultimatespecs у моделей, которые autocentrum (Польша) или ADAC (Германия) знают, и "
              f"поколения «вне ЕС»: **{share(len(not_here), total)}** версий (колонка «{MARKET_COLUMN}»). Отдельную "
              "редкую версию, которой нет в обоих (Golf GTI Clubsport 2024, RS3 Performance Edition), так не помечаем — "
              "она «одна база». В таблице остаются; "
              "на странице и платформе их моторы не считаются существующими — уходят под черту обычным шрифтом "
              "(решение владельца 23.10).", "", "| Марка | Версий | Например |", "|---|---:|---|"]
    by_brand_not = collections.defaultdict(list)
    for row in not_here:
        by_brand_not[row["Марка"]].append(row)
    for brand, brand_rows in sorted(by_brand_not.items(), key=lambda item: -len(item[1]))[:25]:
        sample = "; ".join(dict.fromkeys(f"{r['Модель']} {r['Поколение']}: {r['Версия'][:40]}" for r in brand_rows[:40]))
        lines.append(f"| {brand} | {len(brand_rows)} | {sample[:160]} |")
    differ = [row for row in rows if row.get(DIFF_COLUMN)]
    lines += ["", "## ADAC говорит другое (проверить)", "",
              f"Коробка или привод версии не подтверждены вторым источником, а страница её пары в ADAC "
              f"(`data/adac-details.json`) называет другие: **{share(len(differ), total)}** версий, колонка "
              f"«{DIFF_COLUMN}». Сами не меняются: пара ADAC — одна из версий с тем же мотором, у мотора бывает "
              "и механика, и автомат, и передний, и полный привод.", "",
              "| Марка | Версий | Например |", "|---|---:|---|"]
    by_brand_diff = collections.defaultdict(list)
    for row in differ:
        by_brand_diff[row["Марка"]].append(row)
    for brand, brand_rows in sorted(by_brand_diff.items(), key=lambda item: -len(item[1]))[:25]:
        sample = "; ".join(dict.fromkeys(f"{r['Модель']} {r['Поколение']} {r['Версия'][:30]} ({r['Коробка']}, {r['Привод']})"
                                         for r in brand_rows[:6]))
        lines.append(f"| {brand} | {len(brand_rows)} | {sample[:220]} |")
    lines += ["", "## По источнику строки", "", "| Источник строки | Версий | Мотор подтверждён | Годы подтверждены |",
              "|---|---:|---:|---:|"]
    by_source = collections.defaultdict(list)
    for row in rows:
        by_source[row.get("Источник", "")].append(row)
    for source, source_rows in sorted(by_source.items(), key=lambda item: -len(item[1])):
        n = len(source_rows)
        lines.append(f"| {source} | {n} | {share(sum(kind(r['Подтверждение: мотор']) == 'подтверждено' for r in source_rows), n)} | "
                     f"{share(sum(kind(r['Подтверждение: годы']) == 'подтверждено' for r in source_rows), n)} |")
    lines += ["", "## По маркам", "",
              "Доля версий марки с подтверждённым значением (два источника).", "",
              "| Марка | Моделей | Версий | Мотор | Годы | Фаза | Коробка | Привод |", "|---|---:|---:|---:|---:|---:|---:|---:|"]
    by_brand = collections.defaultdict(list)
    for row in rows:
        by_brand[row["Марка"]].append(row)
    for brand, brand_rows in sorted(by_brand.items(), key=lambda item: (-len(item[1]), item[0])):
        n = len(brand_rows)
        cells = [f"{sum(kind(r[c]) == 'подтверждено' for r in brand_rows) * 100 // n} %" for c in COLUMNS]
        models = len({r["Модель"] for r in brand_rows})
        lines.append(f"| {brand} | {models} | {n} | " + " | ".join(cells) + " |")
    with open(os.path.join(ROOT, "docs", "MODEL-CONFIRMATION.md"), "w", encoding="utf8") as handle:
        handle.write("\n".join(lines) + "\n")
