#!/usr/bin/env python3
"""Gearbox and drive from each version's own ultimatespecs page (B61 stage 3).

The body pages (tools/generate-model-engines.py) name the gearbox only when the
version name says it ("Auto", "S tronic"...), so ~45 % of versions have none.
Every version page states it: "Transmission Gearbox - Number of speeds :
6 speed Manual" and "Drive wheels - Traction - Drivetrain : FWD" (also JSON-LD
"vehicleTransmission"). This reads those pages for the versions whose gearbox
is unknown, newest generations first, and stores the result in
data/model-version-details.json, which tools/build-model-engine-table.py uses.

Crawl-delay 30 s (robots.txt): ~120 pages an hour. Saved every 10 pages;
a rerun skips what is done, so it can be stopped and resumed any time.

    python3 tools/enrich-model-versions.py [--since 2015] [--limit N] [--cache DIR]
    python3 tools/enrich-model-versions.py --since 1995   # 2026-10-21: every gap, doors and seats too
    python3 tools/enrich-model-versions.py --reparse      # 2026-11-02: the pages read, again from the cache
    python3 tools/enrich-model-versions.py --check        # 2026-11-07: pages of the second-source check (below)

--check: the versions of data/ultimatespecs-check.json (ultimatespecs read again for the models we have from
autocentrum or ADAC only) whose list gives no gearbox or drive, where our row has that value from one source only —
one page per row (a version named like our drive: "4Motion" for all-wheel, none of those words for front / rear).
tools/confirm.py then counts what the page states as the second source.
"""
import argparse
import collections
import csv
import json
import os
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DETAILS = os.path.join(ROOT, "data", "model-version-details.json")
_last = [0.0]


def fetch(url, cache):
    path = os.path.join(cache, re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("/car-specs/", 1)[1]))
    for _attempt in range(3):
        if os.path.exists(path) and os.path.getsize(path) > 10000:
            break
        wait = 30 - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "--max-time", "60", "-A", UA, "-o", path, url], check=False)
        _last[0] = time.time()
    if not (os.path.exists(path) and os.path.getsize(path) > 10000):
        return None
    with open(path, encoding="utf8", errors="ignore") as handle:
        return handle.read()


def details(page):
    def cell(label):
        match = re.search(re.escape(label) + r"\s*:\s*</td>\s*<td[^>]*>(.*?)</td>", page, re.S)
        if not match:
            return ""
        value = re.sub(r"<div class='popup_popup'>.*", "", match.group(1), flags=re.S)
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).strip()
    gearbox = cell("Transmission Gearbox - Number of speeds")
    drive = cell("Drive wheels - Traction - Drivetrain")
    ld = re.search(r'"vehicleTransmission"\s*:\s*"([^"]*)"', page)
    # "5 doors", "5 seats" (B61 item 6, 2026-10-21): the doors and seats our table lacks.
    doors = re.search(r"\d+", cell("Num. of Doors"))
    # "5-7 seats" (Grand Scénic, B61 2026-11-02): both counts, "5/7" as autocentrum's "3/5" doors.
    seats = re.findall(r"\d+", cell("Num. of Seats"))
    return {"gearbox": gearbox, "transmission": ld.group(1) if ld else "", "drive": drive,
            "doors": doors.group(0) if doors else "", "seats": "/".join(seats)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", type=int, default=2015, help="only generations starting this year or later")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--cache", default=os.path.expanduser("~/.cache/autogood/ultimatespecs-versions"))
    parser.add_argument("--reparse", action="store_true", help="the pages already read, again from the cache")
    parser.add_argument("--check", action="store_true", help="pages of the ultimatespecs second-source check")
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    done = json.load(open(DETAILS, encoding="utf8")) if os.path.exists(DETAILS) else {}
    if args.reparse:
        cached = 0
        for url, item in done.items():
            path = os.path.join(args.cache, re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("/car-specs/", 1)[1]))
            if os.path.exists(path) and os.path.getsize(path) > 10000:
                page = open(path, encoding="utf8", errors="ignore").read()
                # A page read before 2026-10-21 kept no doors or seats: the rows' gaps are filled as they were.
                fresh = details(page)
                item.update({key: fresh[key] for key in item if key in fresh})
                cached += 1
        with open(DETAILS, "w", encoding="utf8") as handle:
            json.dump(done, handle, ensure_ascii=False, indent=0, sort_keys=True)
            handle.write("\n")
        print(f"DONE reparsed={cached} of {len(done)}", flush=True)
        return

    with open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle, delimiter=";"))
    if args.check:
        read_pages(check_pages(rows, done), done, args)
        return

    def start(row):
        match = re.match(r"(\d{4})", row["Годы (проверено)"])
        return int(match.group(1)) if match else 0

    todo, seen = [], set()
    # Versions with no gearbox first, then those with no doors or seats (read before 2026-10-21
    # without them, or never read: their gearbox came from the name).
    def wanted(row):
        url = row["Ссылка"]
        if "ultimatespecs.com" not in url or start(row) < args.since:
            return 0  # rows from autocentrum.pl (tools/autocentrum.py) have no ultimatespecs page
        if (not row["Коробка"] or not row["Привод"]) and url not in done:
            return 2  # 2026-10-23: the drive too (wave 4 electric cars: "Dual Motor" names only some)
        if (not row["Двери"] or not row["Места"]) and "doors" not in done.get(url, {}):
            return 1
        return 0
    for row in sorted(rows, key=lambda r: (wanted(r), start(r)), reverse=True):
        url = row["Ссылка"]
        if not wanted(row) or url in seen:
            continue
        seen.add(url)
        todo.append(row)
    if args.limit:
        todo = todo[:args.limit]
    print(f"to read: {len(todo)} pages (~{len(todo) * 30 // 60} min)", flush=True)

    for number, row in enumerate(todo, 1):
        page = fetch(row["Ссылка"], args.cache)
        if page:
            done[row["Ссылка"]] = details(page)
        if number % 10 == 0 or number == len(todo):
            with open(DETAILS, "w", encoding="utf8") as handle:
                json.dump(done, handle, ensure_ascii=False, indent=0, sort_keys=True)
                handle.write("\n")
            print(f"[{number}/{len(todo)}] {row['Марка']} {row['Модель']} {row['Поколение']}: "
                  f"{done.get(row['Ссылка'], {}).get('gearbox', '?')}", flush=True)
    print("DONE", flush=True)



def check_pages(rows, done):
    """[(url, label)] — one ultimatespecs-check version page per row whose gearbox or drive one source states."""
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import autocentrum  # noqa: E402
    awd = re.compile(r"\b(4motion|quattro|xdrive|4matic|4x4|awd|4wd|all4|allgrip|4drive|e-four|q4|all-wheel)\b", re.I)
    lone = {id(r) for r in rows if r["Подтверждение: коробка"].startswith("одна")
            or r["Подтверждение: привод"].startswith("одна")}
    gens = autocentrum.our_generations(rows)
    path = os.path.join(ROOT, "data", "ultimatespecs-check.json")
    models = json.load(open(path, encoding="utf8"))["models"] if os.path.exists(path) else []
    chosen, newest = {}, collections.defaultdict(int)
    for model in models:
        key = (model["brand"], model["label"])
        for theirs in autocentrum.group_body_level(model["generations"]):
            ours = [item for gen in autocentrum.match_gens(theirs, gens.get(key, {})) for item in gen["rows"]
                    if item["src"].get("Источник") != "ultimatespecs" and id(item["src"]) in lone]
            for body in theirs["bodies"]:
                for engine in body["engines"]:
                    if not engine.get("url") or engine.get("configs") or (engine.get("to") and engine["to"] < autocentrum.SINCE):
                        continue
                    for item in autocentrum.engine_found(engine, ours, model["brand"]):
                        row = item["src"]
                        if (row["Привод"] == "полный") != bool(awd.search(engine.get("name", ""))):
                            continue
                        if id(row) not in chosen or engine["url"] in done:
                            chosen[id(row)] = (engine["url"], f"{row['Марка']} {row['Модель']} {row['Поколение']}")
                            newest[engine["url"]] = max(newest[engine["url"]], theirs.get("from") or 0)
    pages = {url: label for url, label in chosen.values() if url not in done}
    return sorted(pages.items(), key=lambda item: -newest[item[0]])


def read_pages(todo, done, args):
    if args.limit:
        todo = todo[:args.limit]
    print(f"to read: {len(todo)} pages (~{len(todo) * 30 // 60} min)", flush=True)
    for number, (url, label) in enumerate(todo, 1):
        page = fetch(url, args.cache)
        if page:
            done[url] = details(page)
        if number % 10 == 0 or number == len(todo):
            with open(DETAILS, "w", encoding="utf8") as handle:
                json.dump(done, handle, ensure_ascii=False, indent=0, sort_keys=True)
                handle.write("\n")
            print(f"[{number}/{len(todo)}] {label}: {done.get(url, {}).get('drive', '?')}", flush=True)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
