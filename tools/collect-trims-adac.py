#!/usr/bin/env python3
"""Trim levels from the ADAC Autokatalog for the models no Wikipedia lists them for (B61, owner 2026-10-22).

A generation page of the catalog (adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/<brand>/<model>/<gen>/)
lists every version sold in Germany with its months: "Kia Picanto 1.0 Vision AMT (05/24 - 07/25)". The trim is
what the name keeps after the brand and model, the engine, the gearbox, the drive and the body: "Vision". A
version goes to our generation phase its months fall into (the middle of its run); one source (the German
market) -> "частично проверено". robots.txt allows the catalog; one page every 2 seconds, cached.

    python3 tools/collect-trims-adac.py                 # writes data/model-trims-adac.json
    python3 tools/collect-trims-adac.py "Kia|XCeed"     # prints, writes nothing
"""
import collections
import glob
import html
import json
import os
import re
import subprocess
import sys
import time
import unicodedata

import cache_age  # stage 21: re-read stale list pages (tools/cache_age.py)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "model-trims-adac.json")
CACHE = os.path.expanduser("~/.cache/autogood/adac")
BASE = "https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
DELAY = 2.0
BRAND_SLUG = {"Mercedes-Benz": "mercedes-benz", "Land Rover": "land-rover", "Volkswagen": "vw", "Alfa Romeo": "alfa-romeo"}
# Our model -> ADAC model pages where the name does not say it.
MANUAL = {
    "Renault|Alpine A110": ["alpine/a110"], "Mercedes-Benz|ML": ["mercedes-benz/m-klasse"], "BMW|6": ["bmw/6er-reihe"],
    "BMW|7": ["bmw/7er-reihe"], "BMW|8": ["bmw/8er-reihe"], "Citroen|DS3": ["citroen/ds-3"], "Citroen|DS4": ["citroen/ds-4"],
    # Wave 2 (2026-10-22): DS models are "DS Automobiles" at ADAC.
    "DS|DS3": ["ds-automobiles/ds-3"], "DS|DS3 Crossback": ["ds-automobiles/ds-3"], "DS|DS4": ["ds-automobiles/ds-4"],
    "DS|DS5": ["ds-automobiles/ds-5"], "DS|DS7 (Crossback)": ["ds-automobiles/ds-7"], "DS|DS9": ["ds-automobiles/ds-9"],
    "DS|Nº8": ["ds-automobiles/n8"], "MG|HS": ["mg/hs-ehs"],
    "Abarth|500": ["abarth/500-595-695"],  # wave 3
    # Wave 4 (2026-10-23).
    "Lynk&Co|01": ["lynk--co/01"], "Lynk&Co|02": ["lynk--co/02"], "Lynk&Co|08": ["lynk--co/08"],
    "VinFast|VF6": ["vinfast/vf-6"], "VinFast|VF8": ["vinfast/vf-8"], "VinFast|VF9": ["vinfast/vf-9"],
    "DFSK|Seres 3": ["seres/3"], "DFSK|Seres 5": ["seres/5"], "Geely|Starray EM-i": ["geely/starray"], "Maxus|T90": ["maxus/t90-ev"],
    # B61 stage 17 (2026-10-24): models ADAC names its own way (several of ours on one page, or the reverse).
    "BMW|1": ["bmw/1er-reihe"], "BMW|2": ["bmw/2er-reihe", "bmw/2er-reihe-active-gran-tourer", "bmw/2er-reihe-gran-coupe"],
    "BMW|3": ["bmw/3er-reihe"], "BMW|4": ["bmw/4er-reihe"], "BMW|5": ["bmw/5er-reihe"],
    "Volvo|S40": ["volvo/s40-v40-v50"], "Volvo|V40": ["volvo/s40-v40-v50"], "Volvo|V50": ["volvo/s40-v40-v50"],
    "Volvo|S60": ["volvo/s60-v60"], "Volvo|V60": ["volvo/s60-v60"], "Volvo|V70": ["volvo/s70-v70-xc70"],
    "Volvo|XC70": ["volvo/s70-v70-xc70"], "Volvo|S90": ["volvo/s90-v90"], "Volvo|V90": ["volvo/s90-v90"],
    "Volkswagen|ID.3": ["vw/id3"], "Volkswagen|ID.4": ["vw/id4"], "Volkswagen|ID.5": ["vw/id5"], "Volkswagen|ID.7": ["vw/id7"],
    "Volkswagen|Caddy": ["vw-nutzfahrzeuge/caddy"], "Volkswagen|Crafter": ["vw-nutzfahrzeuge/crafter"],
    "Volkswagen|Amarok": ["vw-nutzfahrzeuge/amarok"], "Volkswagen|ID. Buzz": ["vw-nutzfahrzeuge/id-buzz"],
    "Volkswagen|T6": ["vw-nutzfahrzeuge/transporter"],
    "Mini|Cooper": ["mini/mini"], "Mini|Cabrio": ["mini/mini"], "Mini|Coupe": ["mini/mini"], "Mini|Roadster": ["mini/mini"],
    "Toyota|RAV 4": ["toyota/rav4"], "Toyota|GT86": ["toyota/gt86-gr86"], "Toyota|GR86": ["toyota/gt86-gr86"],
    "Toyota|Land Cruiser": ["toyota/land-cruiser-j8-j10-j20", "toyota/land-cruiser-j7-j9-j12-j15-j25"],
    "Kia|cee'd / Ceed": ["kia/ceed"], "Kia|pro cee'd / ProCeed": ["kia/ceed"],
    "Citroen|Grand C4 Picasso / SpaceTourer": ["citroen/c4-picasso", "citroen/c4-spacetourer"], "Citroen|DS5": ["ds-automobiles/ds-5"],
    "Audi|Q4": ["audi/q4-e-tron"], "Mercedes-Benz|T-Class": ["mercedes-benz/t-klasse"], "Hyundai|Grand Santa Fe": ["hyundai/santa-fe"],
    "Hyundai|ix35": ["hyundai/tucson"], "Ford|Ka/Ka+": ["ford/ka"], "Renault|Megane E-TECH": ["renault/megane"],
}
PHASE_RU = {"pre": "дорестайлинг", "fl": "рестайлинг", "fl2": "2-й рестайлинг", "upd": "обновление"}
# Words of a version name that are not its trim: engine, power, gearbox, drive, body, fuel.
NOT_TRIM = re.compile(
    r"^(?:[dieh]|[xse]drive\d*[a-z]{0,2}|m\d{2,3}[a-z]{0,2}|[vw]\d{1,2}|clean|diesel|benzin|petrol|stop&start|start&stop|"
    r"etg\d|bmp\d|egs\d|allrad|elektrisch|dpf|activehybrid|blueperformance|iperformance|\d+v-mildhybrid|mildhybrid|plug-in-hybrid|"
    r"eco-?dynamics\+?|ecodynamics\+?|(?:dct|edc|at|mt|dsg)\d+|\d+(?:[.,]\d+)?[a-z]{0,3}|[a-z]?\d{2,3}[a-z]{0,3}|\d+(?:kw|ps|kwh|v)|e?-?tsi|tfsi|tdi|fsi|gdi|crdi|t-gdi|mpi|tgi|"
    r"tce|dci|bluedci|blue|hdi|bluehdi|puretech|thp|vti|e-thp|tdci|ecoboost|ecoblue|duratec|ivct|vvt-?i|d-4d|i-dtec|i-vtec|"
    r"vtec|skyactiv-?[gdx]?|e-skyactiv-?[gdx]?|multiair|multijet|firefly|tjet|jtd|jtdm|crd|gse|dualjet|boosterjet|shvs|"
    r"ingenium|sd4|td4|si4|ed4|sdv6|tdv6|sdv8|cdi|cgi|bluetec|blueefficiency|bluemotion|tsi-?act|act|ecotec|cdti|turbo|"
    r"biturbo|kompressor|hybrid|e-hybrid|plug-in|phev|mhev|hev|fhev|e:hev|e-tense|e-tech|e-power|electric|elektro|ev|"
    r"recharge|mild|full|range|long|standard|extended|performance|dual|motor|batterie|wltp|euro|lpg|cng|erdgas|gas|"
    r"flexfuel|ffv|bifuel|start|stop|start/stop|ecoflex|efficientdynamics|ecodynamics\+?|eco|ultra|"
    r"aut\.?|automatik|automatic|auto|amt|dct|dsg|edc|eat\d|cvt|e-cvt|xtronic|tiptronic|steptronic|s-?tronic|multitronic|"
    r"powershift|g-?tronic|\d+g-?tronic|\d+g-?dct|7g-dct|8g-dct|9g-tronic|pdk|imt|ags|ivt|mt|at|\d-gang|schaltgetriebe|"
    r"quattro|4motion|4matic\+?|xdrive|sdrive|edrive|all4|allgrip|e-four|4x4|4x2|awd|4wd|2wd|fwd|rwd|q4|4xe|alltrac|"
    r"coupe|coupé|cabrio|cabriolet|roadster|spider|spyder|targa|kombi|sportback|sportbrake|touring|avant|limousine|"
    r"stufenheck|schrägheck|fließheck|shooting|brake|van|kastenwagen|kasten|pritsche|fahrgestell|doppelkabine|"
    r"einzelkabine|kabine|bus|kombi-?van|variant|wagon|sportswagon|sw|tourer|gran|grand|sedan|hatchback|crossover|"
    r"suv|3-?türer|5-?türer|\d-?türer|lang|kurz|l\d|h\d|l\dh\d|\d+t|lwb|swb|dachträger|pick-?up|"
    r"[a-z]+-klasse|\d+er-reihe|\d+er|serie|reihe|nachfolger|neu|new|facelift|\(.*\))$", re.I)
SPORT = re.compile(r"^(gti|gtd|gte|gt|gt[- ]?line|gs[- ]?line|gsi|opc|opc[- ]line|n|n[- ]line|n performance|fr|r[- ]line|st|st[- ]line|"
                   r"rs|r\.s\.|rs line|nismo|mps|r|r-design|polestar.*|sport|sportive|vxr|type r|cupra|s|amg|amg line|m sport|"
                   r"gt line|n-line|xr|vtr|vts|s line|s-line|m|amg line plus|gts|turbo s|gt3|gt4|competition|black badge)$", re.I)
SPECIAL = re.compile(r"edition|limited|special|jubil|anniversary|launch|first|premiere|\bserie\b|collection|signature|"
                     r"\b\d{2,3} ?(jahre|years)\b|black|white|night|dark|final", re.I)
_last = [0.0]


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def fetch(path):
    os.makedirs(os.path.join(CACHE, "pages"), exist_ok=True)
    name = os.path.join(CACHE, "pages", re.sub(r"[^A-Za-z0-9._-]+", "_", path.strip("/")) + ".html")
    if not re.search(r"/\d+/?$", path):   # a generation page; a version page does not change (stage 21)
        cache_age.begin(name)
    for _attempt in range(3):
        if os.path.exists(name) and os.path.getsize(name) > 50000:
            break
        wait = DELAY - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "-L", "--max-time", "60", "-A", UA, "-o", name, BASE + path], check=False)
        _last[0] = time.time()
    cache_age.finish(name, 50000)
    if not (os.path.exists(name) and os.path.getsize(name) > 50000):
        return ""
    return open(name, encoding="utf8", errors="ignore").read()


def page_models():
    out = {}
    for path in glob.glob(os.path.join(ROOT, "src", "model-specs", "*.js")):
        if not path.endswith("index.js"):
            out.update(json.loads(re.search(r"=\s*(\{.*\});?\s*$", open(path, encoding="utf8").read(), re.S).group(1)))
    return out


def adac_generations():
    """{"kia/picanto": ["ba", "ta", ...]} from the catalog's sitemap."""
    sitemap = os.path.join(CACHE, "sitemap-autokatalog.xml")
    if not os.path.exists(sitemap):
        subprocess.run(["curl", "-s", "-A", UA, "-o", sitemap, "https://www.adac.de/sitemaps/sitemap-autokatalog.xml"], check=False)
    gens = collections.defaultdict(list)
    for url in re.findall(r"<loc>" + re.escape(BASE) + r"([^<]+)</loc>", open(sitemap, encoding="utf8").read()):
        parts = url.strip("/").split("/")
        if len(parts) == 4 and parts[2] not in gens[f"{parts[0]}/{parts[1]}"]:
            gens[f"{parts[0]}/{parts[1]}"].append(parts[2])
    return gens


def pages_of(key, catalog):
    if key in MANUAL:
        return MANUAL[key]
    brand, model = key.split("|", 1)
    brand_slug = BRAND_SLUG.get(brand, slug(brand))
    model_slug = slug(re.sub(r"\s*\(.*?\)", "", model.split(" / ")[0]))
    exact = [f"{brand_slug}/{model_slug}", f"{brand_slug}/{model_slug}-klasse"]
    return [page for page in exact if page in catalog]


def month_year(text):
    match = re.match(r"(\d{2})/(\d{2})", text)
    return 2000 + int(match.group(2)) + (int(match.group(1)) - 1) / 12 if match else None


def versions(text):
    """[(name, from, to)] of a generation page: "Kia Picanto 1.0 Vision AMT (05/24 - 07/25)", "(ab 07/25)"."""
    out = []
    links = re.findall(r'href="/rund-ums-fahrzeug/autokatalog/marken-modelle/[^"]+/\d+/"[^>]*>(.*?)</a>', text, re.S)
    for name in dict.fromkeys(re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", n))).strip() for n in links):
        if not 5 <= len(name) <= 160:
            continue
        dates = re.search(r"\((?:(\d{2}/\d{2})\s*-\s*(\d{2}/\d{2})|ab (\d{2}/\d{2}))\)\s*$", name)
        if not dates:
            continue
        start = month_year(dates.group(1) or dates.group(3))
        end = month_year(dates.group(2)) if dates.group(2) else 2026.9
        out.append((name[:dates.start()].strip(), start, end))
    return out


def trim_of(name, prefix_words):
    """'Kia Picanto 1.2 Spirit Launch Edition AMT' -> 'Spirit Launch Edition'."""
    name = re.sub(r"\([^)]*\)", " ", name)  # "(58 kWh)", "(Euro 6)"
    # Gearbox / engine words of two parts or with digits (Stellantis e-DSC6, Audi "S tronic", Cupra 4Drive).
    name = re.sub(r"(?<![\w-])(S[- ]tronic|Stop\s*&\s*Start|e-?DSC\d|e-?EAT\d|ETG\d?|EGS\d?|e-?HDi|FAP|e-?VTi|e-Boost|4Drive|"
                  r"E-REV|\d+-Volt-Mildhybrid|cod|extralang|Clean Diesel|2-Tronic|Multi-Mode-Automatik|e-4ORCE|EV\d{2,3}|iV|"
                  r"T[34]|T-Jet|e-\d{3,4}|eHybrid|OPF|Q2|TB|T\.Spark|M-Jet|MultiJet|JTDM?|Ibrida|VGT|\d+V-Hybrid|eDCT-?\d|TCT|Lineartronic|"
                  r"ecomatic|E-Performance|EcoLogic|Hybrid\+|EHS|twinamic|softouch|softip|mhd|EQ Boost|EQ|Start&Stopp|TwinAir|D\.F\.N-System|"
                  r"GDI-T|e-XDi\d*|MTA|Single Cab|Space Cab|Double Cab|Extended Cab|Crew Cab|"
                  # Wave 4 (2026-10-23): electric motors, hybrid gearboxes, the Grenadier's body and engines.
                  r"(?:Single|Dual|Twin|Rear|Front|Three|Tri) Motor|Performance Paket|\d?DHT(?: Pro)?|"
                  r"Station|Turbo-(?:Benziner|Diesel))(?![\w-])", " ", name, flags=re.I)
    words = name.split()
    while words and prefix_words and words[0].lower() in prefix_words:
        words = words[1:]
    kept = [w for w in words if not NOT_TRIM.match(w.strip(',"')) and not re.fullmatch(r"[\d.,/+-]+", w)]
    kept = [w for i, w in enumerate(kept) if i == 0 or w.lower() != kept[i - 1].lower()]  # "S S" -> "S"
    return " ".join(kept).replace('"', "").strip(" -,")


def main():
    only = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    catalog = adac_generations()
    specs = page_models()
    rows, report = [], []
    # Models another source already lists trims for (data/model-trims.json, origin other than "adac").
    trims_path = os.path.join(ROOT, "data", "model-trims.json")
    covered = {f"{r['brand']}|{r['model']}" for r in json.load(open(trims_path, encoding="utf8"))["rows"]
               if r.get("origin") != "adac"} if os.path.exists(trims_path) else set()
    for key, spec in sorted(specs.items()):
        if key in covered or (spec.get("trims") and not os.path.exists(trims_path)) or (only and key not in only):
            continue
        pages = pages_of(key, catalog)
        if not pages:
            report.append(f"{key}: нет в ADAC")
            continue
        brand, model = key.split("|", 1)
        found = []
        for page in pages:
            for gen in catalog[page]:
                text = fetch(f"{page}/{gen}/")
                h1 = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.S)
                title = re.sub(r"<[^>]+>", "", h1.group(1)).strip() if h1 else ""
                prefix = {w.lower() for w in (title.split() + brand.replace("&", " & ").split() + model.split()
                                              + ["vw", "mercedes-benz", "mercedes"])}
                for name, start, end in versions(text):
                    trim = trim_of(name, prefix)
                    if trim:
                        found.append((trim, start, end, f"{BASE}{page}/{gen}/"))
        if not found:
            report.append(f"{key}: в ADAC нет названий линий")
            continue
        for code, phase, start, end, _mobile, _lift in spec["gens"]:
            if (end or 2100) < 2010:
                continue
            # A version's middle month decides its phase; one still on sale ("ab 07/25") — its first month.
            here = [(t, url) for t, s, e, url in found if start <= (s if e >= 2026.9 else (s + e) / 2) < (end or 2027) + 1]
            if not here:
                continue
            lines, sport, special, sources = [], [], [], []
            for trim, url in here:
                target = special if SPECIAL.search(trim) else sport if SPORT.match(trim) else lines
                if trim.lower() not in {t.lower() for t in lines + sport + special}:
                    target.append(trim)
                if url not in sources:
                    sources.append(url)
            rows.append({"brand": brand, "model": model, "label": model, "code": code,
                         "phase": PHASE_RU.get(phase, "весь выпуск"), "years": f"{start}–{end if end else 'н. в.'}",
                         "trims": lines, "sport": sport, "special": special, "sources": sources,
                         "status": "частично проверено", "note": "ADAC Autokatalog (рынок Германии)", "origin": "adac"})
        print(f"{key}: {sum(1 for r in rows if r['brand'] == brand and r['model'] == model)} строк", flush=True)
    if only:
        for row in rows:
            print(f"  {row['code']} {row['phase']} {row['years']}: lines={row['trims']} sport={row['sport']} special={row['special']}")
        print("\n".join(report))
        return
    with open(OUT, "w", encoding="utf8") as handle:
        json.dump({"collected": time.strftime("%Y-%m-%d"), "rows": rows, "missing": report}, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    print(f"rows={len(rows)} models={len({(r['brand'], r['model']) for r in rows})} missing={len(report)}")


if __name__ == "__main__":
    main()
