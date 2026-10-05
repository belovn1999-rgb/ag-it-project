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
"""
import argparse
import csv
import json
import os
import re
import subprocess
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
    return {"gearbox": gearbox, "transmission": ld.group(1) if ld else "", "drive": drive}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", type=int, default=2015, help="only generations starting this year or later")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--cache", default="/tmp/ultimatespecs-versions")
    args = parser.parse_args()
    os.makedirs(args.cache, exist_ok=True)
    done = json.load(open(DETAILS, encoding="utf8")) if os.path.exists(DETAILS) else {}

    with open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle, delimiter=";"))

    def start(row):
        match = re.match(r"(\d{4})", row["Годы (проверено)"])
        return int(match.group(1)) if match else 0

    todo, seen = [], set()
    for row in sorted(rows, key=start, reverse=True):
        url = row["Ссылка"]
        # Rows from autocentrum.pl (tools/autocentrum.py) have no ultimatespecs page.
        if row["Коробка"] or "ultimatespecs.com" not in url or url in seen or url in done or start(row) < args.since:
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


if __name__ == "__main__":
    main()
