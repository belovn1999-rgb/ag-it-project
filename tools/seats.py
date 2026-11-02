"""Seven seats: which versions can have a third row (B61, owner 2026-11-02, the site's "7 miejsc" button).

Column "Места" held one count a body has, mostly autocentrum's base count (Kodiaq, XC90, X5: "5"), without the third
row a car costs extra for. Here each row gets what the sources say of its seats:
- ADAC: the version pages of the row's twins (tools/adac_check.py, the same engine; data/adac-details.json):
  "Sitzanzahl" and "Sitzanzahl maximal" (Kodiaq 5, up to 7), and the names "(7-Sitzer)" (Sorento MQ4);
- ultimatespecs: the row's version page ("5-7 seats", data/model-version-details.json) and its name ("7 seats");
- autocentrum: its own rows' count (the engine page's "Liczba miejsc").
Only what is already collected (owner 2026-11-02: nothing new is read for this).
A row whose own sources name 6 seats or more gets them next to its smaller count ("5/7"; "7" where its sources know
only 7, Galaxy). A row no source speaks of by itself takes its generation's: the other versions' sources —
not from a long body (Tiguan Allspace, Qashqai+2) to the short one, never to a coupé. A row whose own sources say 5 only stays as it was (GLE 350 e: the battery takes the third row).
Rows that had 6 or more before (vans, MPV) only gain counts. "Места: источники" says who said what,
"Подтверждение: места" — two sources say the generation has a third row and one of them says it of the version
("подтверждено"), one ("одна база"), or no source while the model's name list guesses one (tools/build-model-specs.py,
"нет источника": the table keeps its count). docs/MODEL-SEATS.md lists the generations.
"""
import collections
import datetime
import importlib.util
import json
import os
import re

import adac_check

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES_COLUMN = "Места: источники"
CONFIRM_COLUMN = "Подтверждение: места"
SITZER = re.compile(r"\b(\d)-Sitzer\b")
# ultimatespecs names: "XC90 D5 AWD 7 seats", "Q7 3.0 TDI 7-seats", "XC90 7 places".
# A coupé body never has its generation's third row (GLE Coupé: ADAC's twins of its engines are the SUV's pages).
COUPE = re.compile(r"\bcoup[eé]\b", re.I)
# A long body that alone carries the third row: a generation with one (Tiguan Allspace, Qashqai+2, Prius+, Logan MCV,
# 500L Living, 2 Gran Tourer, Grand C-Max) lends it to no other body.
LONG = re.compile(r"allspace|\bgrand\b|gran tourer|\w ?\+(?= ?2\b|\s|\(|$)|\bmcv\b|\bliving\b|\bxl\b|\blwb\b|\blong\b|\bmaxi\b|"
                  r"\b7[- ]?(seats?|seater|sitzer|places|miejsc)", re.I)
SEATS_NAME = re.compile(r"\b(\d)[ -]?(?:seats?|seater|places)\b", re.I)
_spec = importlib.util.spec_from_file_location("model_specs", os.path.join(ROOT, "tools", "build-model-specs.py"))
SPECS = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SPECS)   # body_of(): the 7-seat guess by the model's name


def counts(text):
    """{5, 7} of "5/7", "5", "" -> set(); a count over 9 (a 17-seat minibus) or under 2 is no car's."""
    return {int(v) for v in re.findall(r"\d+", str(text or "")) if 2 <= int(v) <= 9}


def page_models():
    """{(brand, label): page model} — the page's model id each table label stands for (as build-model-specs.py)."""
    with open(os.path.join(ROOT, "data", "model-generations.json"), encoding="utf8") as handle:
        out = {(m["brand"], m["label"]): m["model"] for m in json.load(handle)["models"]}
    for name in ("autocentrum-models.json", "ultimatespecs-primary.json", "adac-primary.json"):
        path = os.path.join(ROOT, "data", name)
        if os.path.exists(path):
            with open(path, encoding="utf8") as handle:
                out.update({(m["brand"], m["label"]): m["mobile"] for m in json.load(handle)["models"]
                            if m.get("primary") and (m["brand"], m["label"]) not in out})
    return out


def _adac(row_ev):
    """ADAC's counts of the row's twins: (base counts, all counts, "what it says") — pages read and seat names."""
    base, every, said = set(), set(), []
    for twin in row_ev.get("twins", []) if row_ev else []:
        name = SITZER.search(twin[0])
        if name and 2 <= int(name.group(1)) <= 9:
            base.add(int(name.group(1)))
            every.add(int(name.group(1)))
        page = adac_check.details().get(f"{twin[6]}|{twin[0]}") if len(twin) > 6 else None
        if page and counts(page.get("seats")):
            seats, most = counts(page["seats"]), counts(page.get("seats_max"))
            base |= seats
            every |= seats | {m for m in most if m > max(seats)}
            if not said:
                said.append(f"{twin[0]}: {page['seats']}" + (f", до {page['seats_max']}" if most and max(most) > max(seats) else ""))
    return base, every, said


def evidence(rows, row_ev, gen_ev):
    """{id(row): {source: counts}} of the row itself, {gen key: {source: counts}} of its generation and
    {gen key: counts} of the ADAC version pages read for it (seats, not names: they say a 5-seater too)."""
    versions = json.load(open(os.path.join(ROOT, "data", "model-version-details.json"), encoding="utf8"))
    adac_pages, adac_read = collections.defaultdict(set), collections.defaultdict(set)
    for key, page in adac_check.details().items():
        if counts(page.get("seats")):
            adac_pages[key.split("|", 1)[0]] |= counts(page["seats"]) | counts(page.get("seats_max"))
    read = {page: set(seats) for page, seats in adac_pages.items()}
    for pages in adac_check.load().values():
        for page in pages:
            for version in page["versions"]:
                adac_pages[page["page"]] |= {int(n) for n in SITZER.findall(version[0]) if 2 <= int(n) <= 9}
    own, gen = {}, collections.defaultdict(lambda: collections.defaultdict(set))
    for row in rows:
        key = (row["Марка"], row["Модель"], row["Поколение"])
        found = {}
        base, every, said = _adac(row_ev.get(id(row)))
        if every:
            found["adac"] = (base, every, said)
        page = versions.get(row["Ссылка"], {})
        named = {int(n) for n in SEATS_NAME.findall(f"{row['Кузов']} {row['Версия']}")} if row["Источник"] == "ultimatespecs" else set()
        us = (named or counts(page.get("seats"))) if row["Источник"] == "ultimatespecs" else set()
        if us:
            found["ultimatespecs"] = (us, us, [f"{row['Версия']}: {'/'.join(map(str, sorted(us)))}"])
        if row["Источник"] == "autocentrum" and counts(row["Места"]):
            found["autocentrum"] = (counts(row["Места"]), counts(row["Места"]), [])
        own[id(row)] = found
        for source, (_b, seats, _s) in found.items():
            gen[key][source] |= seats
        for page_name in (gen_ev.get(key) or {}).get("pages", []):
            gen[key]["adac"] |= adac_pages.get(page_name, set())
            adac_read[key] |= read.get(page_name, set())
    return own, gen, adac_read


def _guess(row, labels):
    """The 7-seat guess of the page by the model's name (build-model-specs.py body_of): 6 or more."""
    model = labels.get((row["Марка"], row["Модель"]), row["Модель"])
    return SPECS.body_of(row["Марка"], model, row["Кузов"])[4] >= 6


def apply(rows, row_ev=None, gen_ev=None):
    """Fill "Места", SOURCES_COLUMN, CONFIRM_COLUMN (rows edited in place); returns a Counter of what happened."""
    if row_ev is None:
        row_ev, gen_ev = adac_check.evidence(rows)
    own, gen, adac_read = evidence(rows, row_ev, gen_ev)
    labels = page_models()
    stats = collections.Counter()
    long_gens = {(row["Марка"], row["Модель"], row["Поколение"]) for row in rows if LONG.search(row["Кузов"])}
    for row in rows:
        row[SOURCES_COLUMN], row[CONFIRM_COLUMN] = "", ""
        if COUPE.search(f"{row['Кузов']} {row['Поколение']}"):
            continue
        key = (row["Марка"], row["Модель"], row["Поколение"])
        found = own[id(row)]
        gen_high = {source for source, seats in gen.get(key, {}).items() if max(seats, default=0) >= 6}
        high = {source for source, (_b, seats, _s) in found.items() if max(seats) >= 6}
        before = counts(row["Места"])
        if not gen_high and not high:
            if _guess(row, labels) and int((re.match(r"\d{4}", str(row["Год версии"] or "")) or [0])[0]) >= 2000:
                row[CONFIRM_COLUMN] = "нет источника"
                row[SOURCES_COLUMN] = "7 мест — только догадка страницы по названию модели"
                stats["нет источника (догадка по названию)"] += 1
            continue
        if not high and "adac" in found and max(adac_read.get(key) or {0}) >= 6:
            # ADAC's pages of this generation give the third row ("Sitzanzahl maximal") and this version's only 5:
            # none here (GLE 350 e, X5 xDrive45e — the battery takes it). Where no page of the generation gives a
            # maximum (Santa Fe IV), a 5 says nothing. autocentrum's and ultimatespecs' "5" say nothing:
            # they give the base count.
            said = "/".join(map(str, sorted(found["adac"][1])))
            row[SOURCES_COLUMN] = f"adac: у этой версии {said} ({found['adac'][2][0] if found['adac'][2] else ''}); " \
                                  f"у поколения третий ряд — " + " + ".join(sorted(gen_high))
            row[CONFIRM_COLUMN] = "у версии без третьего ряда"
            stats["у версии без третьего ряда"] += 1
            continue
        shape = SPECS.body_of(row["Марка"], labels.get((row["Марка"], row["Модель"]), row["Модель"]), row["Кузов"])
        if not high and (shape[2] <= 3 or (shape[0] and set(shape[0]) <= {"coupe", "cabrio"})):
            continue  # a 3-door, coupé or cabrio body does not take its generation's third row (Land Cruiser 3-door)
        small = {n for n in before if n < 6}
        if high:
            # The row's own sources. Its smaller count stays; where ADAC knows only 6+ (BMW X7, Galaxy, 5008 II after
            # the facelift) there is none, else where the table had none, ADAC's.
            high_counts = {n for s in high for n in found[s][1] if n >= 6}
            if "adac" in found:
                adac_small = {n for n in found["adac"][0] if n < 6}
                small = (small or adac_small) if adac_small else set()
            by = "версии"
        elif key in long_gens and not LONG.search(row["Кузов"]):
            row[SOURCES_COLUMN] = "у поколения третий ряд только у длинного кузова — " + " + ".join(sorted(gen_high))
            continue
        elif before and max(before) >= 4:
            # Its generation's: the other versions' sources — not for a row whose count is unknown
            # or a cargo van's 2-3 seats (Ducato, Vivaro panel vans: the bus of the generation is another body).
            high_counts = {n for s in gen_high for n in gen[key][s] if n >= 6}
            if adac_read.get(key) and min(adac_read[key]) >= 6:
                small = set()  # the generation's ADAC pages know only 6+ (BMW X7): the table's base 5 is wrong
            by = "поколения"
        else:
            row[SOURCES_COLUMN] = "у поколения 6+ мест — " + " + ".join(sorted(gen_high)) + \
                                  f"; у этой версии {'/'.join(map(str, sorted(before))) or 'число мест неизвестно'}"
            continue
        # Rows with 6+ already (vans, MPV) only gain counts.
        after = before | high_counts if max(before, default=0) >= 6 else small | high_counts
        row["Места"] = "/".join(map(str, sorted(after)))
        stats["стало: " + ("всегда 6+" if min(after) >= 6 else "с третьим рядом")] += after != before
        sources = sorted(gen_high | high)
        notes = []
        for source in sources:
            if source in found:
                text = "/".join(map(str, sorted(found[source][1])))
                extra = f" ({found[source][2][0]})" if found[source][2] else ""
                notes.append(f"{source}: {text}{extra}")
            else:
                notes.append(f"{source}: у поколения {max(gen[key][source])}")
        row[SOURCES_COLUMN] = "; ".join(notes) + ("" if by == "версии" else " — по поколению")
        if len(sources) >= 2:
            row[CONFIRM_COLUMN] = "подтверждено: " + " + ".join(sources)
        else:
            row[CONFIRM_COLUMN] = "одна база: " + sources[0]
        if by == "поколения":
            row[CONFIRM_COLUMN] += " (по поколению)"
        stats[row[CONFIRM_COLUMN].split(":")[0] + (" (по поколению)" if by == "поколения" else "")] += 1
    return stats


def write_report(rows, today=None):
    """docs/MODEL-SEATS.md: the generations with a third row, by how confirmed; those without a source."""
    today = today or datetime.date.today().isoformat()
    labels = page_models()
    gens = collections.OrderedDict()
    for row in rows:
        if not row.get(CONFIRM_COLUMN):
            continue
        key = (row["Марка"], labels.get((row["Марка"], row["Модель"]), row["Модель"]), row["Поколение"])
        item = gens.setdefault(key, {"years": set(), "status": collections.Counter(), "seats": set(), "sources": set(),
                                     "without": []})
        year = re.match(r"\d{4}", str(row["Год версии"] or ""))
        if year:
            item["years"].add(int(year[0]))
        item["status"][row[CONFIRM_COLUMN].split(":")[0].split(" (")[0]] += 1
        if row[CONFIRM_COLUMN].startswith(("подтверждено", "одна база")):
            item["seats"] |= counts(row["Места"])
            item["sources"] |= set(re.findall(r"(adac|ultimatespecs|autocentrum)", row[CONFIRM_COLUMN]))
        if row[CONFIRM_COLUMN] == "у версии без третьего ряда":
            item["without"].append(f"{row['Версия']}")

    def kind(item):
        if item["status"]["подтверждено"]:
            return "подтверждено"
        if item["status"]["одна база"]:
            return "одна база"
        return "нет источника" if item["status"]["нет источника"] else "без третьего ряда"
    groups = collections.defaultdict(list)
    for key, item in gens.items():
        groups[kind(item)].append((key, item))
    lines = [
        "# Справочник моделей — 7 мест (третий ряд)", "",
        f"Сгенерировано `tools/seats.py` ({today}) из `data/model-engines.csv`. B61, решение владельца 02.11 (кнопка "
        "«7 miejsc» формы сайта). Колонка «Места» — числа мест версии: «5/7» — третий ряд за доплату, «7» — всегда семь. "
        "Источники: каталог ADAC («Sitzanzahl / Sitzanzahl maximal» страницы версии, «(7-Sitzer)» в названии), "
        "ultimatespecs (страница и название версии), autocentrum (число мест мотора). **Подтверждено** — два источника называют третий ряд у поколения, один из них — у этой версии.", "",
        "| Итог | поколений |", "|---|---|",
    ]
    for name in ("подтверждено", "одна база", "нет источника"):
        lines.append(f"| {name} | {len(groups[name])} |")
    lines.append("")
    titles = {"подтверждено": "Третий ряд — подтверждено двумя источниками",
              "одна база": "Третий ряд — один источник", "нет источника": "Нет источника (страница догадывается по названию модели — таблица оставлена как есть)"}
    for name in ("подтверждено", "одна база", "нет источника"):
        lines += [f"## {titles[name]}", "", "| Марка | Модель | Поколение | Годы версий | Места | Источники | Без третьего ряда |",
                  "|---|---|---|---|---|---|---|"]
        for (brand, model, code), item in sorted(groups[name], key=lambda g: (g[0][0], g[0][1], -max(g[1]["years"] or {0}))):
            years = f"{min(item['years'])}–{max(item['years'])}" if item["years"] else ""
            without = ", ".join(item["without"][:4]) + (" …" if len(item["without"]) > 4 else "")
            lines.append(f"| {brand} | {model} | {code} | {years} | {'/'.join(map(str, sorted(item['seats'])))} | "
                         f"{' + '.join(sorted(item['sources']))} | {without} |")
        lines.append("")
    with open(os.path.join(ROOT, "docs", "MODEL-SEATS.md"), "w", encoding="utf8") as handle:
        handle.write("\n".join(lines).rstrip("\n") + "\n")
