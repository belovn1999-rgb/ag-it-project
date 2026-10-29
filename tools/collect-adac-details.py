#!/usr/bin/env python3
"""Gearbox and drive of our rows' ADAC twins from their version pages (B61, 2026-10-28: drive was confirmed by two
sources for 25 % of the versions, the gearbox for 59 % — ADAC version names say only "quattro" / "S tronic").

tools/adac_check.py finds each row's ADAC twins (the same engine on the generation page). One version page per
row is enough: of its twins the one whose name agrees best with the row's gearbox and drive (an automatic word,
an all-wheel-drive word), one already chosen for another row first. Its page says "Getriebeart" (Schaltgetriebe,
Automatikgetriebe, Doppelkupplung, CVT …) and "Antriebsart" (Vorderrad, Hinterrad, Allrad), plus displacement,
body, doors and seats. Written to data/adac-details.json by "<generation page>|<version name>";
tools/adac_check.py adds them to the gearbox and drive ADAC states. One page every 2 s (the version pages are
cached in ~/.cache/autogood/adac/pages and never read again); progress is saved every 25 pages.

    python3 tools/collect-adac-details.py [--offline] [--limit N] [--flagged]

--flagged (2026-10-29): every twin of the rows in "ADAC: другое" (tools/confirm.py) — one twin's page says another
gearbox or drive; all of them tell an error of ours (every ADAC version of the engine) from an engine sold both ways.
"""
import argparse
import csv
import datetime
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import adac_check  # noqa: E402
import autocentrum  # noqa: E402

OUT = os.path.join(ROOT, "data", "adac-details.json")
_spec = importlib.util.spec_from_file_location("crawl_adac", os.path.join(ROOT, "tools", "crawl-adac-models.py"))
C = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(C)   # A (fetch, BASE), specs(), version_links(), _cached()
DATES = re.compile(r"\s*\((?:(\d{2})/(\d{2})\s*-\s*\d{2}/\d{2}|ab (\d{2})/(\d{2}))\)\s*$")


def key(twin):
    return f"{twin[6]}|{twin[0]}"


def choose(rows, row_ev):
    """{key: twin} — one twin per row with twins, shared between rows where it can be."""
    chosen = {}
    for row in rows:
        twins = row_ev.get(id(row), {}).get("twins") or []
        if not twins:
            continue
        box = autocentrum.OUR_GEARBOX.get(row["Коробка"], "")
        drive = autocentrum.OUR_DRIVE.get(row["Привод"], "")

        def score(twin):
            auto, awd = bool(adac_check.AUTO.search(twin[0])), bool(adac_check.AWD.search(twin[0]))
            return ((box == "a") == auto) + ((drive == "4") == awd) + 0.5 * (key(twin) in chosen)
        best = max(twins, key=score)
        chosen.setdefault(key(best), best)
    return chosen


def version_path(twin, links):
    """The version page of a twin: its name and first month on the generation page, else its name alone."""
    month = f"{twin[4][5:7]}/{twin[4][2:4]}"
    by_name = None
    for path, name in links:
        dates = DATES.search(name)
        if DATES.sub("", name).strip() != twin[0]:
            continue
        if dates and month in (f"{dates.group(1)}/{dates.group(2)}", f"{dates.group(3)}/{dates.group(4)}"):
            return path
        by_name = by_name or path
    return by_name


def details(page):
    data = C.specs(page)
    return {"gearbox": data.get("Getriebeart", ""), "gears": data.get("Anzahl Gänge", ""),
            "drive": data.get("Antriebsart", ""), "kind": data.get("Motorart", ""),
            "cc": C.number(data.get("Hubraum (Verbrennungsmotor)")) or None, "body": data.get("Karosserie", ""),
            "doors": data.get("Türanzahl", ""), "seats": data.get("Sitzanzahl", "")}


def save(found):
    with open(OUT, "w", encoding="utf8") as handle:
        json.dump({"source": C.A.BASE, "generatedAt": datetime.date.today().isoformat(), "versions": found},
                  handle, ensure_ascii=False, indent=0, sort_keys=True)
        handle.write("\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="only pages already in the cache")
    parser.add_argument("--limit", type=int, default=0, help="read at most N new pages")
    parser.add_argument("--flagged", action="store_true", help="all twins of the rows in \"ADAC: другое\"")
    args = parser.parse_args()
    rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig"), delimiter=";"))
    row_ev, _gen_ev = adac_check.evidence(rows)
    if args.flagged:
        chosen = {key(t): t for row in rows if row.get("ADAC: другое") for t in row_ev.get(id(row), {}).get("twins", [])}
    else:
        chosen = choose(rows, row_ev)
    found = json.load(open(OUT, encoding="utf8"))["versions"] if os.path.exists(OUT) else {}
    links_of, fetched, missing = {}, 0, 0
    todo = [k for k in chosen if k not in found]
    print(f"rows' twins {len(chosen)}, known {len(chosen) - len(todo)}, to read {len(todo)}", flush=True)
    for number, name in enumerate(todo, 1):
        twin = chosen[name]
        if twin[6] not in links_of:
            links_of[twin[6]] = C.version_links(C._cached(twin[6] + "/") or C.A.fetch(twin[6] + "/"), twin[6].rsplit("/", 1)[0])
        path = version_path(twin, links_of[twin[6]])
        if not path:
            missing += 1
            continue
        cached = C._cached(path)
        if not cached and (args.offline or (args.limit and fetched >= args.limit)):
            continue
        page = cached or C.A.fetch(path)
        fetched += not cached
        if not page:
            missing += 1
            continue
        found[name] = {"path": path, **details(page)}
        if number % 25 == 0:
            save(found)
            print(f"{number}/{len(todo)} {name} -> {found[name]['gearbox']} · {found[name]['drive']}", flush=True)
    save(found)
    print(f"DONE details={len(found)} read={fetched} without a page={missing}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
