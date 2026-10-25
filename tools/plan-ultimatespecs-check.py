#!/usr/bin/env python3
"""Which ultimatespecs.com pages to read for the second-source check of the models we have from autocentrum.pl or
the ADAC catalog only (B61, owner 2026-10-25: re-check all the work against ultimatespecs).

For every make of data/model-engines.csv with such models the brand page ("/car-specs/Kia-models") lists its model
pages ("/car-specs/Kia-models/Kia-Sportage") and the one-generation models' body pages ("/car-specs/Polestar/M13016/3").
They are matched to our models by name (our label or the page-1 value; "Seria 3" = "3 Series", "Klasa C" = "C-Class",
"Grand C4 Picasso / SpaceTourer" = either). Written to data/model-list-ultimatespecs-check.json in the shape of
data/model-list-ultimatespecs.json, read by tools/crawl-ultimatespecs-models.py --check. Brand pages: one every 30 s
(robots.txt Crawl-delay), cached in ~/.cache/autogood/ultimatespecs-brands.

    python3 tools/plan-ultimatespecs-check.py [--offline]
"""
import argparse
import collections
import csv
import html
import json
import os
import re
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.expanduser("~/.cache/autogood/ultimatespecs-brands")
OUT = os.path.join(ROOT, "data", "model-list-ultimatespecs-check.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
CRAWL_DELAY = 30
_last = [0.0]


def norm(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def fetch(slug, offline):
    path = os.path.join(CACHE, f"{slug}.html")
    if not (os.path.exists(path) and os.path.getsize(path) > 75000) and not offline:
        wait = CRAWL_DELAY - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "--max-time", "60", "-A", UA, "-o", path,
                        f"https://www.ultimatespecs.com/car-specs/{slug}-models"], check=False)
        _last[0] = time.time()
    return open(path, encoding="utf8", errors="ignore").read() if os.path.exists(path) else ""


def links(page, slug):
    """[(url, name)] of the brand's model grid: model pages and one-generation body pages."""
    page = page.split("View Full", 1)[0]
    out = []
    for url, text in re.findall(r'href="(/car-specs/[^"]+)"[^>]*>(.*?)</a>', page, re.S):
        model_page = re.match(rf"/car-specs/{re.escape(slug)}-models/([^/]+)$", url, re.I)
        direct = re.match(r"/car-specs/[^/]+/M\d+/", url)
        if not (model_page or direct):
            continue
        name = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text))).strip()
        name = re.sub(r"\s+(From \d{4}.*|\d+ Versions?.*)$", "", name).strip()
        if url not in [u for u, _ in out]:
            out.append((url, name))
    return out


def alternatives(name, brand):
    """"MX-5 / Miata", "S90 - V90", "V-Class / Viano", "EQE (V295)", "Mercedes-Benz CLS-Class" -> each name alone."""
    out = set()
    for part in re.split(r"\s*/\s*|\s+-\s+|(?<=\d)-(?=[A-Z]{2}\d)", name):  # "HS/EHS", "GT86-GR86"
        part = re.sub(rf"^{re.escape(brand)}\s+", "", part.strip(), flags=re.I)
        out |= {part, re.sub(r"\s*\(.*?\)", "", part).strip()}
        if re.fullmatch(r"[A-Z0-9]+[- ]Class", part):  # Mercedes "CLS-Class" = our "CLS"
            out.add(re.sub(r"[- ]Class$", "", part))
    return {p for p in out if p}


def names_of(brand, label, mobile):
    """Our model's names as ultimatespecs may write them."""
    out = set()
    for name in {label, mobile, *label.split(" / "), *mobile.split(" / ")}:
        name = re.sub(r"\s*\(.*?\)", "", name).strip()  # "Klasa M (ML)", "DS7 (Crossback)"
        if not name:
            continue
        if name.upper().startswith(brand.upper()) and len(name) > len(brand):  # MG "MG4" = "4", DS "DS7" = "7"
            out.add(name[len(brand):].strip())
        out.add(name)
        seria = re.match(r"Seria (\w+)$", name)
        if seria:
            out |= {f"{seria.group(1)} Series", f"Serie {seria.group(1)}"}
        klasa = re.match(r"Klasa (\w+)$", name)
        if klasa:
            out |= {f"{klasa.group(1)}-Class", f"{klasa.group(1)} Class"}
        out.add(re.sub(r"\s*\(.*?\)", "", name))
        out.add(re.sub(r"^Range Rover\s+", "", name))      # Land Rover "Range Rover Evoque" = "Evoque"
        if brand == "Mini" and name == "Cooper":
            out.add("Mini")
    return {norm(n) for n in out if n}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    os.makedirs(CACHE, exist_ok=True)
    rows = list(csv.DictReader(open(os.path.join(ROOT, "data", "model-engines.csv"), encoding="utf-8-sig"), delimiter=";"))
    sources = collections.defaultdict(set)
    for row in rows:
        sources[(row["Марка"], row["Модель"], row["Модель mobile.de"])].add(row["Источник"])
    todo = collections.defaultdict(list)
    for (brand, label, mobile), found in sources.items():
        if "ultimatespecs" not in found:
            todo[brand].append((label, mobile))
    all_brands = fetch("_all", True) or open(os.path.join(CACHE, "_all.html"), encoding="utf8", errors="ignore").read()
    slugs = {norm(s): s for s in re.findall(r'href="/car-specs/([^"/]+)-models"', all_brands)}
    entries, missing = [], []
    for brand in sorted(todo):
        slug = slugs.get(norm(brand)) or slugs.get(norm(brand.split("-")[0]))
        if not slug:
            missing += [f"{brand}|{label} (марки нет)" for label, _m in todo[brand]]
            continue
        found = links(fetch(slug, args.offline), slug)
        by_name, by_head = collections.defaultdict(list), collections.defaultdict(list)
        for url, name in found:
            for alt in alternatives(name, brand):
                by_name[norm(alt)].append(url)
            # "Navara D40", "Altima L32", "Tribute I", "MPV II": the name before a generation code.
            head = re.match(r"^(.+?)\s+(?:[IVX]+|[A-Z]{1,2}\d{2,3}|\(.*\))$", name)
            if head:
                by_head[norm(head.group(1))].append(url)
        for label, mobile in sorted(todo[brand]):
            names = names_of(brand, label, mobile)
            urls = sorted({u for n in names for u in by_name.get(n, [])}) or sorted({u for n in names for u in by_head.get(n, [])})
            if not urls:
                missing.append(f"{brand}|{label}")
                continue
            entry = {"brand": brand, "label": label, "mobile": mobile, "brand_slug": slug,
                     "pages": [u.rsplit("/", 1)[-1] for u in urls if "-models/" in u],
                     "direct": [{"url": u, "name": label} for u in urls if "-models/" not in u]}
            entries.append(entry)
        print(f"{brand}: {len(found)} links, {sum(e['brand'] == brand for e in entries)} of {len(todo[brand])} models", flush=True)
    with open(OUT, "w", encoding="utf8") as handle:
        json.dump({"note": "B61 second-source check (owner 2026-10-25): ultimatespecs pages of the models we have from "
                           "autocentrum.pl or ADAC only (tools/plan-ultimatespecs-check.py)", "models": entries},
                  handle, ensure_ascii=False, indent=1)
    print(f"models={len(entries)} missing={len(missing)}")
    print("missing:", "; ".join(missing))


if __name__ == "__main__":
    main()
