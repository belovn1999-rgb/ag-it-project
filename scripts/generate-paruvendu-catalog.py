#!/usr/bin/env python3
"""ParuVendu (FR) make/model catalog for mobile.html.

A used car on ParuVendu is r=VO; a make is r2=<code> ("VVOVW000"), a model
md=<code> ("VVOVWPAS"); several models: md=<code>,<code> ("or"). The search
form asks /auto-moto/listefo/default/affinage for its lists: without r2 every
make, with r2 that make's models. A family ("Golf (tous)", code "VW_GOL")
stands before its models, which are indented with &nbsp; ("Golf", "Golf Plus",
"Golf SW"); the family code is kept, the search sends the models' own codes.
Read directly (the site answers a script, checked 2026-10-05) or through a
reader proxy (--proxy https://r.jina.ai/), one request every 1.5 s.
Run: python3 scripts/generate-paruvendu-catalog.py [--proxy https://r.jina.ai/]

The makes are matched to ours (src/mobile-model-catalog.generated.js) at run
time in src/paruvendu-search.js; this script lists our makes it did not find.
"""
import argparse
import html
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SITE = "https://www.paruvendu.fr"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "src" / "paruvendu-catalog.generated.js"
OUR_CATALOG = ROOT / "src" / "mobile-model-catalog.generated.js"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "x-respond-with": "text",
}
# ParuVendu's name -> ours, where the words differ.
MAKE_ALIASES = {"Mercedes": "Mercedes-Benz", "Land-Rover": "Land Rover", "Lynk & CO": "Lynk & Co", "Polski/FSO": "FSO"}
SKIP = {"Autres", "Divers"}

parser = argparse.ArgumentParser()
parser.add_argument("--proxy", default="", help="reader proxy put before the address, e.g. https://r.jina.ai/")
args = parser.parse_args()


def get(params):
    url = f"{SITE}/auto-moto/listefo/default/affinage?{urllib.parse.urlencode(params)}"
    for attempt in range(5):
        try:
            request = urllib.request.Request(f"{args.proxy}{url}", headers=HEADERS)
            with urllib.request.urlopen(request, timeout=60) as response:
                text = response.read().decode("utf-8", "ignore")
            text = text[text.find("{"):text.rfind("}") + 1]
            return json.loads(text)
        except Exception:
            time.sleep(10 * (attempt + 1))
    raise SystemExit(f"ParuVendu did not answer for {url}")


def label(value):
    return html.unescape(str(value or "")).replace("\xa0", " ")


def token(value):
    import unicodedata
    plain = unicodedata.normalize("NFKD", str(value or "").lower())
    plain = "".join(char for char in plain if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", plain)


top = get({"tt": "1", "r": "VVO00000"})
catalog = {}
for make in top.get("marque", []):
    name = label(make.get("lib")).strip()
    code = make.get("cod", "")
    if not name or not code or name in SKIP:
        continue
    time.sleep(1.5)
    page = get({"tt": "1", "r": "VVO00000", "r2": code})
    groups = page.get("modele", {})
    # A make with few models gets a plain list, others "Modèles populaires"
    # (repeats) and "Tous les modèles".
    if isinstance(groups, list):
        listed = groups
    else:
        listed = groups.get("Tous les modèles") or [item for items in groups.values() for item in items]
    models = []
    family = None
    for item in listed:
        raw = label(item.get("lib"))
        model_code = item.get("cod", "")
        indented = raw.startswith(" ")
        model_name = raw.strip()
        if not model_name or not model_code:
            continue
        if model_name.endswith("(tous)"):
            family = {"name": model_name[: -len("(tous)")].strip(), "code": model_code}
            models.append({"name": family["name"], "code": model_code, "series": True})
            continue
        if not indented:
            family = None
        entry = {"name": model_name, "code": model_code}
        if indented and family:
            entry["family"] = family["code"]
        models.append(entry)
    catalog[name] = {"code": code, **({"ours": MAKE_ALIASES[name]} if name in MAKE_ALIASES else {}), "models": models}

if len(catalog) < 60:
    raise SystemExit(f"Only {len(catalog)} makes: ParuVendu answered unexpectedly.")
lines = [
    "/* Generated from the ParuVendu search form lists (scripts/generate-paruvendu-catalog.py). Do not hand-edit. */",
    "window.AUTOGOOD_PARUVENDU_CATALOG = {",
    f'  "generatedFrom": {json.dumps(SITE)},',
    f'  "generatedAt": {json.dumps(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))},',
    '  "makes": {',
    ",\n".join(f"    {json.dumps(name, ensure_ascii=False)}: {json.dumps(make, ensure_ascii=False)}" for name, make in sorted(catalog.items(), key=lambda item: item[0].lower())),
    "  }",
    "};",
    "",
]
OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{len(catalog)} makes, {sum(len(m['models']) for m in catalog.values())} models -> {OUTPUT}")

# Our makes (mobile.de catalog) without a ParuVendu make of the same name.
ours = re.findall(r'^    "([^"]+)": \[', OUR_CATALOG.read_text(encoding="utf-8"), re.M)
theirs = {token(make.get("ours", name)) for name, make in catalog.items()}
missing = [name for name in ours if token(name) not in theirs]
print(f"Our makes not on ParuVendu ({len(missing)} of {len(ours)}): {', '.join(missing)}")
