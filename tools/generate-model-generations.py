#!/usr/bin/env python3
"""Generations (from 2010) of the pinned popular models, from ultimatespecs.com.

Writes data/model-generations.json (for the dependent page-1 filters) and
docs/MODEL-GENERATIONS.md (the readable table).

ultimatespecs.com robots.txt asks for Crawl-delay: 30, so a full fetch of
~70 pages takes ~35 minutes. Pages are cached in --cache (default
/tmp/ultimatespecs); a rerun only fetches what is missing.

    python3 tools/generate-model-generations.py [--cache DIR] [--since 2010]
"""
import argparse
import datetime
import html
import json
import os
import re
import subprocess
import time

BASE = "https://www.ultimatespecs.com/car-specs"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
CRAWL_DELAY = 30

# Page-1 model (popularModelsByBrand in src/mobile.js) -> ultimatespecs model page(s).
MODELS = [
    ("Audi", "A3", "A3", ["Audi-A3"]),
    ("Audi", "A4", "A4", ["Audi-A4"]),
    ("Audi", "A5", "A5", ["Audi-A5"]),
    ("Audi", "A6", "A6", ["Audi-A6"]),
    ("Audi", "Q3", "Q3", ["Audi-Q3"]),
    ("Audi", "Q5", "Q5", ["Audi-Q5"]),
    ("Audi", "Q7", "Q7", ["Audi-Q7"]),
    ("BMW", "1", "Seria 1", ["BMW-1-Series"]),
    ("BMW", "3", "Seria 3", ["BMW-3-Series"]),
    ("BMW", "4", "Seria 4", ["BMW-4-Series"]),
    ("BMW", "5", "Seria 5", ["BMW-5-Series"]),
    ("BMW", "X1", "X1", ["BMW-X1"]),
    ("BMW", "X3", "X3", ["BMW-X3"]),
    ("BMW", "X5", "X5", ["BMW-X5"]),
    ("Ford", "C-Max", "C-Max", ["Ford-C-Max"]),
    ("Ford", "Fiesta", "Fiesta", ["Ford-Fiesta"]),
    ("Ford", "Focus", "Focus", ["Ford-Focus-(Europe)"]),
    ("Ford", "Kuga", "Kuga", ["Ford-Kuga"]),
    ("Ford", "Mondeo", "Mondeo", ["Ford-Mondeo"]),
    ("Ford", "S-Max", "S-Max", ["Ford-S-Max"]),
    ("Mercedes-Benz", "A", "Klasa A", ["Mercedes-Benz-A-Class"]),
    ("Mercedes-Benz", "C", "Klasa C", ["Mercedes-Benz-C-Class"]),
    ("Mercedes-Benz", "E", "Klasa E", ["Mercedes-Benz-E-Class"]),
    ("Mercedes-Benz", "S", "Klasa S", ["Mercedes-Benz-S-Class"]),
    ("Mercedes-Benz", "CLA", "CLA", ["Mercedes-Benz-CLA"]),
    ("Mercedes-Benz", "GLC", "GLC", ["Mercedes-Benz-GLC", "Mercedes-Benz-GLC-Coupe"]),
    ("Mercedes-Benz", "GLE", "GLE", ["Mercedes-Benz-GLE-Class", "Mercedes-Benz-GLE-Coupe"]),
    ("Peugeot", "208", "208", ["Peugeot-208"]),
    ("Peugeot", "308", "308", ["Peugeot-308"]),
    ("Peugeot", "508", "508", ["Peugeot-508"]),
    ("Peugeot", "2008", "2008", ["Peugeot-2008"]),
    ("Peugeot", "3008", "3008", ["Peugeot-3008"]),
    ("Peugeot", "5008", "5008", ["Peugeot-5008"]),
    ("Renault", "Captur", "Captur", ["Renault-Captur"]),
    ("Renault", "Clio", "Clio", ["Renault-Clio"]),
    ("Renault", "Kadjar", "Kadjar", ["Renault-Kadjar"]),
    ("Renault", "Megane", "Megane", ["Renault-Megane"]),
    ("Renault", "Scenic", "Scenic", ["Renault-Scenic"]),
    ("Renault", "Trafic", "Trafic", ["Renault-Trafic"]),
    ("Skoda", "Fabia", "Fabia", ["Skoda-Fabia"]),
    ("Skoda", "Kamiq", "Kamiq", ["Skoda-Kamiq"]),
    ("Skoda", "Karoq", "Karoq", ["Skoda-Karoq"]),
    ("Skoda", "Kodiaq", "Kodiaq", ["Skoda-Kodiaq"]),
    ("Skoda", "Octavia", "Octavia", ["Skoda-Octavia"]),
    ("Skoda", "Superb", "Superb", ["Skoda-Superb"]),
    ("Toyota", "Auris", "Auris", ["Toyota-Auris"]),
    ("Toyota", "Avensis", "Avensis", ["Toyota-Avensis"]),
    ("Toyota", "C-HR", "C-HR", ["Toyota-C-HR"]),
    ("Toyota", "Camry", "Camry", ["Toyota-Camry"]),
    ("Toyota", "Corolla", "Corolla", ["Toyota-Corolla"]),
    ("Toyota", "RAV 4", "RAV 4", ["Toyota-RAV4"]),
    ("Toyota", "Yaris", "Yaris", ["Toyota-Yaris"]),
    ("Volvo", "S60", "S60", ["Volvo-S60"]),
    ("Volvo", "V40", "V40", ["Volvo-V40"]),
    ("Volvo", "V60", "V60", ["Volvo-V60"]),
    ("Volvo", "XC40", "XC40", ["Volvo-XC40"]),
    ("Volvo", "XC60", "XC60", ["Volvo-XC60"]),
    ("Volvo", "XC90", "XC90", ["Volvo-XC90"]),
    ("Volkswagen", "Golf", "Golf", ["Volkswagen-Golf"]),
    ("Volkswagen", "Passat", "Passat", ["Volkswagen-Passat"]),
    ("Volkswagen", "Polo", "Polo", ["Volkswagen-Polo"]),
    ("Volkswagen", "T-Roc", "T-Roc", ["Volkswagen-T-Roc"]),
    ("Volkswagen", "T6", "T6 (Multivan, Transporter)", ["Volkswagen-Transporter", "Volkswagen-Multivan"]),
    ("Volkswagen", "Tiguan", "Tiguan", ["Volkswagen-Tiguan"]),
    ("Volkswagen", "Touran", "Touran", ["Volkswagen-Touran"]),
]

# Spotted while checking the 2026-10-03 run: the data keeps the source as is,
# the table lists these so nobody builds a filter on them unchecked.
SOURCE_ISSUES = [
    "Ford Kuga: «Kuga 2017 (2017 – 2019)» с кузовом «Kuga III» — на деле рестайлинг Kuga II; Kuga III — «Kuga 2020».",
    "Ford Mondeo 5 «2014 – н. в.» — выпуск закончен в 2022.",
    "Ford S-Max 2 «2015 – н. в.» — выпуск закончен в 2023.",
    "Toyota Auris 2 «2012 – н. в.» — выпуск закончен в 2018–2019 (место занял Corolla E210).",
    "Toyota Camry 7 (XV50) «2011 – н. в.» — выпускалась до 2017; Camry XV80 (2024) в источнике нет.",
    "Toyota RAV4 — нового поколения (2025) в источнике нет; Corolla — нет седана E170/E180 (2013–2019).",
    "VW Transporter T6.1 «2019 – н. в.» — в 2025 сменён Transporter T7 (он в таблице есть).",
]

_last_fetch = [0.0]


def page(cache, brand, slug):
    path = os.path.join(cache, f"model_{slug}.html")
    if not (os.path.exists(path) and os.path.getsize(path) > 10000):
        wait = CRAWL_DELAY - (time.time() - _last_fetch[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "-A", UA, "-o", path, f"{BASE}/{brand}-models/{slug}"], check=True)
        _last_fetch[0] = time.time()
    with open(path, encoding="utf8", errors="ignore") as handle:
        return handle.read()


def generations(source):
    found = []
    for block in re.split(r'<div class="home_models_line gene">', source)[1:]:
        title = re.search(r"<h2>(.*?)</h2>", block, re.S)
        if not title:
            continue
        text = html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip()
        match = re.match(r"(.*?)\s*\((\d{4})\s*-\s*(\d{4}|Present)\)\s*$", text)
        if not match:
            continue
        bodies = [
            {
                "name": html.unescape(body.group(2)).strip(),
                "versions": int(body.group(3)),
                "url": "https://www.ultimatespecs.com" + body.group(1),
            }
            for body in re.finditer(
                r"<a class='col[^']*' href=\"(/car-specs/[^\"]+)\">.*?<h3>(.*?)</h3>\s*<p>(\d+) Versions</p>", block, re.S
            )
        ]
        found.append({
            "generation": match.group(1).strip(),
            "from": int(match.group(2)),
            "to": None if match.group(3) == "Present" else int(match.group(3)),
            "bodies": bodies,
        })
    return found


def markdown(rows, since, today):
    lines = [
        "# Поколения популярных моделей (с {})".format(since),
        "",
        "> Сгенерировано `tools/generate-model-generations.py` {} из ultimatespecs.com.".format(today),
        "> Данные: `data/model-generations.json`. Не править руками — перегенерировать.",
        "> Модели — закреплённые в «Model» стр. 1 (`popularModelsByBrand`, `src/mobile.js`).",
        "> Годы — как у ultimatespecs (модельные годы; рестайлинг — отдельная строка,",
        "> годы соседних строк могут пересекаться). «н. в.» — выпускается сейчас.",
        "",
        "**Неточности источника (проверить перед использованием в фильтрах):**",
        "",
        *[f"- {issue}" for issue in SOURCE_ISSUES],
        "",
    ]
    brand = None
    for row in rows:
        if row["brand"] != brand:
            brand = row["brand"]
            lines += ["", f"## {brand}", "", "| Модель | Поколение | Годы | Кузова (версий) |", "|---|---|---|---|"]
        for gen in row["generations"]:
            years = f"{gen['from']} – {gen['to'] or 'н. в.'}"
            bodies = ", ".join(f"[{b['name']}]({b['url']}) ({b['versions']})" for b in gen["bodies"])
            lines.append(f"| {row['label']} | {gen['generation']} | {years} | {bodies} |")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default="/tmp/ultimatespecs")
    parser.add_argument("--since", type=int, default=2010)
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    today = datetime.date.today().isoformat()

    rows = []
    for brand, model, label, slugs in MODELS:
        gens = []
        for slug in slugs:
            for gen in generations(page(args.cache, brand, slug)):
                if gen["to"] is None or gen["to"] >= args.since:
                    gen["source"] = f"{BASE}/{brand}-models/{slug}"
                    gens.append(gen)
        gens.sort(key=lambda gen: (gen["from"], gen["to"] or 9999), reverse=True)
        rows.append({"brand": brand, "model": model, "label": label, "generations": gens})
        print(f"{brand} {label}: {len(gens)} generations")

    with open(os.path.join(root, "data", "model-generations.json"), "w", encoding="utf8") as handle:
        json.dump({"source": "https://www.ultimatespecs.com", "generatedAt": today, "since": args.since, "models": rows},
                  handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    with open(os.path.join(root, "docs", "MODEL-GENERATIONS.md"), "w", encoding="utf8") as handle:
        handle.write(markdown(rows, args.since, today))


if __name__ == "__main__":
    main()
