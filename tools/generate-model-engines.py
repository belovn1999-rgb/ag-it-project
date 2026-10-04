#!/usr/bin/env python3
"""Engines of every generation in data/model-generations.json, from ultimatespecs.com.

B61 stage 3 (docs/PROJECT-MOBILE.md 4.8). Each body page lists its versions in
tables per fuel (Petrol / Diesel / Plugin Hybrid ...): name, year, "hp / kW",
"cm3". Writes data/model-engines.json (every version) and
docs/MODEL-ENGINES.md (per generation: fuel -> engine size -> powers).

robots.txt asks for Crawl-delay: 30 -> ~557 pages take ~4.6 hours. Pages are
cached in --cache; a rerun only fetches what is missing, --offline fetches
nothing and builds from the cache.

    python3 tools/generate-model-engines.py [--cache DIR] [--offline]
"""
import argparse
import datetime
import html
import json
import os
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
CRAWL_DELAY = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FUELS = {
    "Petrol Engines": "petrol",
    "Diesel Engines": "diesel",
    "Hybrid Engines": "hybrid",
    "Petrol Hybrid": "hybrid",
    "Diesel Hybrid": "hybrid_diesel",
    "Plugin Hybrid": "plugin",
    "Electric": "electric",
    "Electric Engines": "electric",
    "LPG Engines": "lpg",
    "CNG Engines": "cng",
}
FUEL_LABELS = {
    "petrol": "Benzyna", "diesel": "Diesel", "hybrid": "Hybryda", "hybrid_diesel": "Hybryda (diesel)",
    "plugin": "Plug-in", "electric": "Elektryczny", "lpg": "LPG", "cng": "CNG",
}
AWD = re.compile(r"\b(xdrive|quattro|4motion|4matic|4x4|awd|all ?wheel|4wd|e-four|alltrac)\b", re.I)
AUTO = re.compile(r"\b(auto(matic)?|dsg|s tronic|tiptronic|steptronic|e-?cvt|cvt|powershift|edc|eat\d|dct|7g|9g|8-speed auto)\b", re.I)

_last_fetch = [0.0]


def cached_page(cache, url, offline):
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("/car-specs/", 1)[1]) + ".html"
    path = os.path.join(cache, name)
    if not (os.path.exists(path) and os.path.getsize(path) > 10000):
        if offline:
            return None
        # A sleeping Mac or a dropped network leaves no page: retry, still one request per 30 s.
        for _attempt in range(3):
            wait = CRAWL_DELAY - (time.time() - _last_fetch[0])
            if wait > 0:
                time.sleep(wait)
            subprocess.run(["curl", "-s", "--max-time", "60", "-A", UA, "-o", path, url], check=False)
            _last_fetch[0] = time.time()
            if os.path.exists(path) and os.path.getsize(path) > 10000:
                break
        else:
            return None
    with open(path, encoding="utf8", errors="ignore") as handle:
        return handle.read()


def versions(source):
    found = []
    for block in re.split(r"<div class='versions_div'", source)[1:]:
        block = block.split("</table>", 1)[0]
        title = re.search(r"<h2>(.*?)</h2>", block, re.S)
        section = html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else ""
        fuel = FUELS.get(section) or ("electric" if "electric" in section.lower() else section.lower() or "unknown")
        for row in re.finditer(r'<tr class="row\d">(.*?)</tr>', block, re.S):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row.group(1), re.S)
            link = re.search(r'<a href="([^"]+)">\s*(.*?)</a>', cells[0] if cells else "", re.S)
            if not link or len(cells) < 4:
                continue
            name = html.unescape(re.sub(r"<[^>]+>", "", link.group(2))).strip()
            year = re.search(r"\d{4}", cells[1])
            hp = re.search(r"(\d+)\s*hp", cells[2])
            kw = re.search(r"(\d+)\s*kW", cells[2])
            cc = re.search(r"(\d+)\s*cm", cells[3])
            found.append({
                "name": name,
                "fuel": fuel,
                "year": int(year.group()) if year else None,
                "hp": int(hp.group(1)) if hp else None,
                "kw": int(kw.group(1)) if kw else None,
                "cc": int(cc.group(1)) if cc else None,
                "gearbox": "automatic" if AUTO.search(name) else "manual_or_unknown",
                "awd": bool(AWD.search(name)),
                "url": "https://www.ultimatespecs.com" + link.group(1),
            })
    return found


def engine_summary(items):
    """fuel -> engine size (cc, rounded litres) -> sorted unique powers in KM (hp)."""
    summary = {}
    for item in items:
        if not item["hp"]:
            continue
        fuel = summary.setdefault(item["fuel"], {})
        powers = fuel.setdefault(item["cc"] or 0, set())
        powers.add(item["hp"])
    return {fuel: {cc: sorted(powers) for cc, powers in sorted(sizes.items())} for fuel, sizes in summary.items()}


def markdown(models, today):
    lines = [
        "# Двигатели популярных моделей (с 2010)",
        "",
        "> Сгенерировано `tools/generate-model-engines.py` {} из ultimatespecs.com (B61, этап 3,".format(today),
        "> `docs/PROJECT-MOBILE.md` §4.8). Все версии — в `data/model-engines.json`. Не править руками.",
        "> Строка = поколение (рестайлинг — отдельно): топливо → объём см³ (л) → мощности в KM (л.с.).",
        "> Объём «—» — у источника не указан (обычно электромобили).",
        "",
    ]
    brand = None
    for model in models:
        if model["brand"] != brand:
            brand = model["brand"]
            lines += ["", f"## {brand}", ""]
        lines += [f"### {model['brand']} {model['label']}", "", "| Поколение | Годы | Двигатели (объём см³ → KM) | Версий |", "|---|---|---|---|"]
        for gen in model["generations"]:
            years = f"{gen['from']} – {gen['to'] or 'н. в.'}"
            parts = []
            for fuel, sizes in gen["engines"].items():
                sizes_text = "; ".join(
                    f"{cc} ({cc / 1000:.1f}) → {', '.join(map(str, powers))}" if int(cc) else f"— → {', '.join(map(str, powers))}"
                    for cc, powers in ((int(cc), powers) for cc, powers in sizes.items())
                )
                parts.append(f"**{FUEL_LABELS.get(fuel, fuel)}:** {sizes_text}")
            missing = " (нет данных)" if not parts else ""
            lines.append(f"| {gen['generation']} | {years} | {'<br>'.join(parts)}{missing} | {gen['versionCount']} |")
        lines.append("")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default="/tmp/ultimatespecs-bodies")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    with open(os.path.join(ROOT, "data", "model-generations.json"), encoding="utf8") as handle:
        source = json.load(handle)
    today = datetime.date.today().isoformat()
    total = sum(len(gen["bodies"]) for model in source["models"] for gen in model["generations"])
    done = missing = 0

    models = []
    for model in source["models"]:
        gens = []
        for gen in model["generations"]:
            bodies, all_versions = [], []
            for body in gen["bodies"]:
                page = cached_page(args.cache, body["url"], args.offline)
                done += 1
                body_versions = versions(page) if page else []
                if page is None:
                    missing += 1
                bodies.append({"name": body["name"], "url": body["url"], "versions": body_versions})
                all_versions += body_versions
                print(f"[{done}/{total}] {model['brand']} {model['label']} · {body['name']}: {len(body_versions)}", flush=True)
            gens.append({
                "generation": gen["generation"], "from": gen["from"], "to": gen["to"],
                "engines": engine_summary(all_versions),
                "versionCount": len(all_versions),
                "bodies": bodies,
            })
        models.append({"brand": model["brand"], "model": model["model"], "label": model["label"], "generations": gens})

    with open(os.path.join(ROOT, "data", "model-engines.json"), "w", encoding="utf8") as handle:
        json.dump({"source": "https://www.ultimatespecs.com", "generatedAt": today, "since": source.get("since"),
                   "missingPages": missing, "models": models}, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    with open(os.path.join(ROOT, "docs", "MODEL-ENGINES.md"), "w", encoding="utf8") as handle:
        handle.write(markdown(models, today))
    print(f"DONE pages={total} missing={missing}", file=sys.stderr)


if __name__ == "__main__":
    main()
