#!/usr/bin/env python3
"""Trim levels of the stage-6 models from Polish and German Wikipedia (B61, owner 2026-10-10).

The 65 models of tools/build-model-trims.py were collected by hand; the 333
models added from autocentrum.pl (variants A and B) get theirs here, read from
the articles themselves:
- pl.wikipedia: one article per model, a section per generation with its own
  "Auto infobox" (okres produkcji) and "Wersje wyposażeniowe" (a list);
- de.wikipedia: an article per generation ("Opel Astra K", "Kia Ceed (CD)"),
  "Infobox PKW-Modell" (von / bis) and "Ausstattungsvarianten / -linien"
  (a list, often with the months each line was sold).
A generation of ours takes the article block whose production years overlap it
most. Names are kept when they look like trim names (short, no equipment
sentence, no engine). Both languages naming at least one same line -> status
"проверено", one language -> "частично проверено"; the markets differ (PL and
DE names both show up in listings), so the page gets both.

    python3 tools/collect-trims-wiki.py            # writes data/model-trims-wiki.json
Pages are cached in /tmp/wiki-mhev (tools/wiki_engines.py), one request a second.
"""
import glob
import json
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wiki_engines  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRIM_HEADING = {
    "pl": re.compile(r"wersj\w* wyposaż|wersje wyposażenia|^wyposażenie$|wersje limitowane|wersje specjalne|edycje specjalne", re.I),
    "de": re.compile(r"ausstattungs(linien|varianten|stufen|versionen|niveaus)|^ausstattung$|sondermodell|sonderserie", re.I),
    # Second pass (owner 2026-10-11): the 189 models pl/de have no list for; FR / NL names are what the
    # French and Dutch portals' ads use.
    "en": re.compile(r"trim|equipment level|specification level|^grades?$|special edition", re.I),
    "fr": re.compile(r"finition|séries? spéciales?|séries? limitées?", re.I),
    "it": re.compile(r"allestiment|serie speciali|versioni speciali", re.I),
    "nl": re.compile(r"uitvoering|uitrustingsniveau|uitrusting", re.I),
}
# en.wikipedia lists the trims of every market (US "LX / EX / SX", Chinese, Indian ones): not used.
LANGS = ("pl", "de", "fr", "it", "nl")
BRANDS = ("Audi", "BMW", "Citroën", "Citroen", "Cupra", "Dacia", "DS", "Fiat", "Ford", "Hyundai", "Kia", "Mazda", "Mercedes",
          "Nissan", "Opel", "Peugeot", "Renault", "Seat", "Škoda", "Skoda", "Toyota", "Vauxhall", "Volkswagen", "Volvo")
OTHER_MARKET = re.compile(r"russ|chin|brazil|brésil|brasil|india|inde\b|amérique|america|usa|mexi|austral|japan|japon|"
                          r"korea|corée|iran|argentin|türkei|turquie|ägypt|égypt|afri", re.I)
SPECIAL_HEADING = re.compile(r"limitowan|specjaln|sondermodell|sonderserie|special edition|séries? (spéciale|limitée)|serie speciali|versioni speciali", re.I)
SPORT = re.compile(r"^(gti|gtd|gte|gt|gt[- ]?line|gs[- ]?line|gsi|opc|opc[- ]line|n|n[- ]line|n performance|fr|r[- ]line|st|st[- ]line|"
                   r"rs|r\.s\.|rs line|nismo|mps|r|r-design|polestar.*|sport|sportive|vxr|type r|cupra|s|amg line|m sport|"
                   r"gt line|n-line|xr|xr2|vtr|vts|gsi line|e-sport)$", re.I)
SPECIAL = re.compile(r"edition|limited|special|jubil|anniversary|\b\d{2,3} ?(jahre|lat|years)\b|first|launch|premiere|serie", re.I)
NOT_A_NAME = re.compile(
    r"\b(oraz|i|z|ze|w|we|na|dla|do|od|po|jest|są|był|była|było|wersj\w*|pakiet\w*|silnik\w*|wyposaż\w*|standard\w*|seryjn\w*|"
    r"mit|und|der|die|das|den|dem|für|ab|bis|sowie|nur|als|wird|wurde|werden|ausstattung\w*|paket\w*|motor\w*|serienmäßig|"
    r"erhältlich|sind|ist|gibt|angeboten|verfügbar|optional\w*|zusätzlich|jeweils|dostępn\w*|oferowan\w*|"
    r"klimatyzac\w*|poduszk\w*|elektryczn\w*|system\w*|radio\w*|felg\w*|reflektor\w*|lusterk\w*|szyb\w*|czujnik\w*|"
    r"tempomat\w*|nawigac\w*|kamer\w*|skórzan\w*|alarm\w*|kierownic\w*|komputer\w*|zamek|fotel\w*|airbag\w*|"
    r"and|with|the|for|from|was|were|are|has|have|available|offered|standard|optional|"
    r"et|avec|pour|des|les|une|est|sont|disponible|proposée?s?|"
    r"con|per|dei|delle|della|sono|disponibil\w*|"
    r"met|voor|het|van|zijn|wordt|"
    r"klimaanlage|navigation\w*|leichtmetall\w*|räder|scheinwerfer\w*|sitz\w*|lenkrad|bordcomputer|zentralverriegelung)\b",
    re.I)
EQUIPMENT = re.compile(r"scheinwerfer|sensor|leuchte|spiegel|fensterheber|anlage|räder|felge|heizung|verriegelung|kamera|"
                       r"assistent|lenkrad|schiebedach|airbag|tempomat|navi\w*system|klima|einparkhilfe|dachreling|"
                       r"czujnik|światł|lusterk|podgrzew|klimatyzac|felg|kamer|nawigac|tempomat|poduszk|"
                       r"climatis|jantes|caméra|radar|siège|climatizzat|cerchi|sensori|navigat|wheels?\b|alloy|"
                       r"air condition|headlight|headlamp|cruise|keyless|leather|sunroof|parking|velgen|stoel|"
                       r"cuir|écran|screen|bluetooth|usb|android|carplay", re.I)
# Paint colours a French article lists with the trims ("Blanc Nacré", "Kaschmirsilber metallic").
COLOR = re.compile(r"\b(blanc|noir|gris|rouge|bleu|vert|jaune|argent|marron|beige|nacré|métallisé|metallic|weiß|schwarz|"
                   r"silber|bianco|nero|grigio|rosso|blu|wit|zwart|grijs)\b", re.I)
ENGINE = re.compile(r"\d[.,]\d|\b\d{2,3} ?(km|ps|kw|hp|ch)\b|\b(tdi|tsi|tfsi|crdi|cdti|dci|hdi|bluehdi|puretech|t-gdi|gdi|mpi|"
                    r"skyactiv\w*|ecoboost|tce|cdi|vti|thp|e-hdi|cvt|dsg|edc|automat\w*|manual\w*)\b", re.I)
BODY = re.compile(r"^(kombi|sedan|limuzyna|hatchback|coupe|coupé|cabrio\w*|kabriolet|van|kombivan|furgon|pick-?up|suv|"
                  r"sports tourer|sportswagon|sw|estate|liftback|fastback|grand tourer|shooting brake|limousine|"
                  r"kombilimousine|stufenheck|schrägheck|fließheck|kastenwagen|kombiwagen|pritsche)$", re.I)


def clean(text):
    text = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", text, flags=re.S)
    text = re.sub(r"\{\{[^{}]*\}\}", "", text)
    text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", text)
    text = re.sub(r"\[https?://\S+\s*([^\]]*)\]", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text.replace("&nbsp;", " ")).strip()


def years_in(text):
    """'07/2015–07/2019' -> (2015.5, 2019.58); 'seit 2020', 'od 2013' -> (2020, 2100); None when none."""
    found = re.findall(r"(?:(\d{1,2})/)?((?:19|20)\d{2})", text)
    if not found:
        return None
    start = int(found[0][1]) + ((int(found[0][0]) - 1) / 12 if found[0][0] else 0)
    if len(found) == 1:
        if re.search(r"seit|ab|od|from|since|–\s*$|-\s*$", text, re.I):
            return start, 2100.0
        if re.search(r"bis|do|until", text, re.I):
            return 0.0, int(found[0][1]) + 1.0
        return start, int(found[0][1]) + 1.0
    end = int(found[1][1]) + (int(found[1][0]) / 12 if found[1][0] else 1)
    return start, end


def name_of(item):
    """A list line -> (name, years or None), or None when it is no trim name."""
    raw = clean(item)
    when = None
    paren = re.search(r"\(([^)]*)\)", raw)
    if paren:
        when = years_in(paren.group(1))
    name = re.sub(r"\([^)]*\)", "", raw)
    name = re.split(r"\s[–—-]\s|:|;|,|\s\bod\b|\s\bab\b|\s\bseit\b", name)[0]
    name = name.replace("'''", "").replace("''", "")
    name = re.sub(r"^\d{1,2}/\d{4}\s*", "", name)  # "02/2019 „30th Anniversary"
    name = re.sub(r"[„“”\"]", "", name).strip(" .*'")
    # Equipment ("Audi side assist"), bodies and sizes ("Caddy Maxi Furgon", "Life Cosmo L1H1"),
    # engine versions ("SLK 200 BlueEFFICIENCY", "CLS 63 AMG") and arrows are no lines.
    if re.search(r"assist|sense|\bL\dH\d\b|→|blueefficiency|bluemotion|\bfurgon\b|\bkombi\b|\bcab\b|\bmaxi\b", name, re.I) \
            or re.match(r"^[A-Z]{1,4} \d{2,3}(\s|$)", name) or re.fullmatch(r"\d+", name) \
            or COLOR.search(name) or re.search(r"\s(en|et|e|und|i)\s|\bde base\b|\bde \d|[{}]|mains libres|sellerie|vitres|"
                                                 r"hayon|démarrage|one pedal|modèle", name, re.I) \
            or re.fullmatch(r"intérieur|autres|options?|pack|base|v6|v8|deutschland|frankreich|niederlande|österreich|schweiz|belgien|italien|spanien|großbritannien|"
                            r"polska|niemcy|francja|specjalne|biturbo|hybrid|full ?led|standard|basis", name, re.I):
        return None
    if not name or len(name) < 2 or len(name) > 28 or len(name.split()) > 4:
        return None
    if NOT_A_NAME.search(name) or ENGINE.search(name) or BODY.match(name) or EQUIPMENT.search(name):
        return None
    # A long German noun ("Seitenschutzleisten", "Türgriffen") is a part of the car, no line.
    if " " not in name and len(name) >= 7 and re.search(r"(en|ern|ung|ungen|rand|leiste|schweller|keit)$", name):
        return None
    if not (name[0].isupper() or name[0].isdigit() or re.match(r"^(sport|design|advanced|style|life|business)\b", name)):
        return None
    return name, when


def sections(text):
    """[(heading, level, start, end)] of the article."""
    heads = [(m.group(2).strip(), len(m.group(1)), m.start(), m.end()) for m in
             re.finditer(r"^(=+)\s*(.+?)\s*=+\s*$", text, re.M)]
    out = []
    for i, (title, level, start, end) in enumerate(heads):
        stop = next((h[2] for h in heads[i + 1:] if h[1] <= level), len(text))
        out.append((clean(title), level, end, stop))
    return out


INFOBOX = {
    "pl": (r"\{\{Auto infobox(.*?)\n\}\}", r"\|\s*okres produkcji\s*=\s*([^\n]*)"),
    "en": (r"\{\{Infobox automobile(.*?)\n\}\}", r"\|\s*production\s*=\s*([^\n]*)"),
    "fr": (r"\{\{Infobox Automobile(.*?)\n\}\}", r"\|\s*ann[ée]es[^=\n]*=\s*([^\n]*)"),
    "nl": (r"\{\{Infobox autotype(.*?)\n\}\}", r"\|\s*jaren\s*=\s*([^\n]*)"),
}


def blocks(text, lang):
    """Generation blocks of an article: [(from, to, start, end)] by its infoboxes, and by the headings that
    carry years ("== Quinta serie (2021-) ==", "=== Fifth generation (NQ5; 2021) ===")."""
    periods = []
    if lang == "de":
        for m in re.finditer(r"\{\{Infobox PKW-Modell(.*?)\n\}\}", text, re.S):
            body = m.group(1)
            von = re.search(r"\|\s*von\s*=\s*([^\n|]*)", body)
            bis = re.search(r"\|\s*bis\s*=\s*([^\n|]*)", body)
            first = years_in(clean(von.group(1))) if von else None
            last = years_in(clean(bis.group(1))) if bis and clean(bis.group(1)) else None
            periods.append((m.start(), (first[0], last[1] if last else 2100.0) if first else None))
    elif lang in INFOBOX:
        box, field_re = INFOBOX[lang]
        for m in re.finditer(box, text, re.S):
            field = re.search(field_re, m.group(1))
            value = clean(field.group(1)) if field else ""
            value = re.split(r"\(|<|;", value)[0]  # "2004–2009 (Brazil 2005–2019)": the first market
            periods.append((m.start(), years_in(value) if value else None))
    out = []
    for i, (start, period) in enumerate(periods):
        # The block starts at the heading above its infobox and runs to the next block.
        head = text.rfind("\n==", 0, start)
        begin = head if head >= 0 and lang != "de" else start
        end = periods[i + 1][0] if i + 1 < len(periods) else len(text)
        if lang != "de" and i + 1 < len(periods):
            nxt = text.rfind("\n==", 0, periods[i + 1][0])
            end = nxt if nxt > begin else end
        if period:
            out.append((period[0], period[1], begin, end))
    for title, level, start, end in sections(text):
        if level <= 3 and re.search(r"(19|20)\d{2}", title) and not TRIM_HEADING[lang].search(title):
            years = years_in(title)
            if years and years[0] >= 1990:
                out.append((years[0], years[1] if years[1] > years[0] + 1 else 2100.0, start, end))
    return out


def trims_in(text, start, end, lang):
    """Names from the trim sections between start and end: [(name, years, special?)]."""
    found = []
    for title, _level, s, e in sections(text):
        if s < start or s > end or not TRIM_HEADING[lang].search(title):
            continue
        body = text[s:min(e, end)]
        special = bool(SPECIAL_HEADING.search(title))
        # A plain "Ausstattung" / "Wyposażenie" section is about equipment unless it speaks of lines.
        if re.match(r"^(ausstattung|wyposażenie)$", title, re.I) and not re.search(
                r"ausstattungs(linie|variante|stufe|version)|linien|wersj\w* wyposaż", body, re.I):
            continue
        # One-letter lines (Kia S / M / L) are no search words: neither kept nor counted against the list.
        bullets = [b for b in re.findall(r"^\*+\s*(.+)$", body, re.M) if len(re.split(r"[\s(/:–-]", clean(b).strip(" '*"))[0]) > 1]
        names = [n for n in (name_of(b) for b in bullets) if n]
        # An equipment list ("elektryczne sterowanie szyb", "Nebelscheinwerfer") is no trim list.
        if bullets and len(names) < 0.6 * len(bullets):
            names = []
        if not names:
            prose = clean(body)
            match = re.search(r"(wersjach(?: wyposażeniowych)?|Ausstattungs(?:linien|varianten|stufen|versionen)|Linien|"
                              r"trim levels?|trims|finitions?|allestimenti|uitvoeringen)[^.:]*?[:]?\s*"
                              r"([^.]{3,240})\.", prose)
            if match:
                parts = re.split(r",\s*|\s+(?:i|oraz|und|sowie|or|lub)\s+", re.sub(r"\([^)]*\)", "", match.group(2)))
                names = [n for n in (name_of(p) for p in parts) if n]
                if len(names) < 2:
                    names = []
        found += [(name, when, special) for name, when in names]
    if not found:
        # No trim section: a sentence naming the lines ("Neben dem Basismodell wurden vier weitere
        # Ausstattungspakete angeboten: „Advantage“, „Luxury Line“, „Sport Line“ und „M Sport“").
        prose = clean(re.sub(r"\{\|.*?\n\|\}", " ", text[start:end], flags=re.S))
        for match in re.finditer(r"(Ausstattungs(?:linien|pakete|varianten|stufen|versionen)|wersj\w* wyposażeniow\w*|"
                                 r"trim levels?|finitions?|allestimenti|uitvoeringen)"
                                 r"[^.:]{0,80}?:\s*([^.]{3,240})\.", prose):
            parts = re.split(r",\s*|\s+(?:i|oraz|und|sowie|or|lub)\s+", re.sub(r"\([^)]*\)", "", match.group(2)))
            names = [n for n in (name_of(p) for p in parts) if n]
            if len(names) >= 2:
                found += [(name, when, False) for name, when in names]
    return found


def search(query, lang, limit=10):
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"search{limit}_{lang}_{query}")
    url = (f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit={limit}"
           f"&srsearch={urllib.parse.quote(query)}")
    data = wiki_engines._get(url, os.path.join(wiki_engines.CACHE, safe + ".json"))
    return [hit["title"] for hit in (data.get("query") or {}).get("search") or []]


def norm(text):
    return re.sub(r"[^a-z0-9]+", "", text.lower().replace("ë", "e").replace("é", "e").replace("’", "").replace("'", ""))


def code_titles(brand, code):
    """Article titles named by a generation code: "BMW F45", "Mercedes-Benz Baureihe 247", "Kia Ceed III";
    a code of several bodies ("F22-F23-F45-F46") gives one per body."""
    parts = re.split(r"[-/,]\s*", code) if re.fullmatch(r"[A-Z]\d{2,3}([-/,]\s*[A-Z]\d{2,3})+", code) else [code]
    out = [f"{brand} {part}" for part in parts]
    for part in parts:
        digits = re.search(r"\b([A-Z]{1,2})\s?(\d{3})\b", part)
        if brand == "Mercedes-Benz" and digits:
            out += [f"Mercedes-Benz Baureihe {digits.group(2)}", f"Mercedes-Benz {digits.group(1)} {digits.group(2)}"]
    return out


def tokens(text):
    text = text.lower().replace("ë", "e").replace("é", "e").replace("’", "").replace("'", "")
    return re.findall(r"[a-z0-9]+", text)


def title_starts(title, wanted):
    """The title opens with the wanted words, ending on a word boundary ("Kia cee’d (JD)" opens with
    "Kia Ceed"; "Mercedes-Benz Baureihe 205" does not open with "Mercedes-Benz B")."""
    words, joined = tokens(title), "".join(tokens(wanted))
    if not joined:
        return False
    total, bounds = 0, set()
    for word in words:
        total += len(word)
        bounds.add(total)
    return "".join(words).startswith(joined) and len(joined) in bounds


def articles(brand, names, lang, codes=()):
    """Articles of the model: titles starting with the brand and one of the model's names, or named by a
    generation code ("BMW F45")."""
    queries = [f"{brand} {name}" for name in names] + [t for code in codes for t in code_titles(brand, code)]
    titles = []
    for query in queries:
        for title in [query] + search(query, lang):
            if any(title_starts(title, wanted) for wanted in queries) and title not in titles:
                titles.append(title)
    out = []
    named = [re.compile(r"(?<![\w-])" + re.escape(name) + r"(?![\w])", re.I) for name in names]
    for title in titles[:14]:
        text = wiki_engines.wikitext(title, lang)
        if not text or text.lstrip().lower().startswith(("#redirect", "#patrz", "#tarjoaa", "#redirection", "#rinvia", "#doorverwijzing")):
            continue
        if OTHER_MARKET.search(title):
            continue  # "Renault Arkana (Russie)" is another car
        if any(other.lower() in title.lower() for other in BRANDS if other != brand and other.lower() not in brand.lower()):
            continue  # "Peugeot Rifter / Citroën Berlingo / Opel Combo": the lines of three makes in one list
        # An article found by a generation code must speak of this model ("Baureihe 247" leads to the GLA).
        by_name = any(title_starts(title, f"{brand} {name}") for name in names)
        if not by_name and not any(pattern.search(text[:4000]) for pattern in named):
            continue
        out.append((title, text))
    return out


def overlap(a_from, a_to, b_from, b_to):
    return min(a_to, b_to) - max(a_from, b_from)


def model_names(brand, model):
    """'cee'd / Ceed' -> ['Ceed', "cee'd"]; 'Crossland (X)' -> ['Crossland', 'Crossland X']."""
    names = []
    for part in re.split(r"\s*/\s*", model):
        bare = re.sub(r"\s*\([^)]*\)", "", part).strip()
        names.append(bare)
        extra = re.search(r"\(([^)]*)\)", part)
        if extra:
            names.append(f"{bare} {extra.group(1)}")
    names = [name.replace("ë-", "e-") for name in names]
    # BMW "2" is "BMW serii 2" (pl), "BMW 2er" (de); Mercedes "B" is "Klasa B" / "B-Klasse".
    if brand == "BMW" and re.fullmatch(r"[1-8]", model):
        names += [f"serii {model}", f"Seria {model}", f"{model}er"]
    if brand == "Mercedes-Benz" and re.fullmatch(r"[A-Z]{1,3}", model):
        names += [f"klasy {model}", f"Klasa {model}", f"{model}-Klasse"]
    return list(dict.fromkeys(sorted(names, key=lambda n: (n.lower() != model.lower(), len(n)))))


def page_models():
    out = {}
    for path in glob.glob(os.path.join(ROOT, "src", "model-specs", "*.js")):
        if path.endswith("index.js"):
            continue
        text = open(path, encoding="utf8").read()
        data = json.loads(re.search(r"=\s*(\{.*\});?\s*$", text, re.S).group(1))
        out.update(data)
    return out


# One French article for three makes (Citroën Berlingo / Opel Combo / Peugeot Rifter): its list mixes them.
SHARED_FR = {("Opel", "Combo"), ("Peugeot", "Rifter")}
EN_COLOR = re.compile(r"\b(white|black|grey|gray|red|blue|green|silver|bronze)\b|dakar", re.I)


def clean_rows(rows):
    """The last sieve over the rows: English paint names, rally cars, shared French lists."""
    out = []
    for row in rows:
        if (row["brand"], row["model"]) in SHARED_FR and any("fr.wikipedia" in url for url in row["sources"]):
            continue
        for kind in ("trims", "sport", "special"):
            row[kind] = [name for name in row[kind] if not EN_COLOR.search(name) or re.search(r"edition|line", name, re.I)]
        if row["trims"] or row["sport"] or row["special"]:
            out.append(row)
    return out


def main():
    with open(os.path.join(ROOT, "data", "model-trims.json"), encoding="utf8") as handle:
        done = {(r["brand"], r["model"]) for r in json.load(handle)["rows"] if r.get("origin") != "wiki"}
    rows, report = [], []
    only = set(arg for arg in sys.argv[1:] if not arg.startswith("--"))
    # --missing: again only the models the last run found nothing for, the rest kept.
    kept = []
    if "--missing" in sys.argv:
        with open(os.path.join(ROOT, "data", "model-trims-wiki.json"), encoding="utf8") as handle:
            kept = json.load(handle)["rows"]
        have = {f"{r['brand']}|{r['model']}" for r in kept}
        only = {key for key in page_models() if key not in have}
    for key, spec in sorted(page_models().items()):
        brand, model = key.split("|", 1)
        if (brand, model) in done or (only and key not in only):
            continue
        names = model_names(brand, model)
        codes = list(dict.fromkeys(gen[0] for gen in spec["gens"] if (gen[3] or 2100) >= 2010))
        sources = {lang: articles(brand, names, lang, codes) for lang in LANGS}
        gens = {}
        for code, phase, start, end, _mobile, _lift in spec["gens"]:
            gens.setdefault(code, []).append((phase, start, end))
        for code, phases in gens.items():
            g_from = min(p[1] for p in phases)
            g_to = max((p[2] or 2100) for p in phases)
            if g_to < 2010:
                continue
            per_lang = {}
            for lang, found in sources.items():
                best = None
                for title, text in found:
                    for b_from, b_to, start, end in blocks(text, lang):
                        # The article's generation: most years in common, its start within 2 years of ours.
                        common = overlap(g_from, g_to + 1, b_from, b_to)
                        if common < 1 or abs(b_from - g_from) > 2.5:
                            continue
                        names_here = trims_in(text, start, end, lang)
                        if names_here and (not best or common > best[0]):
                            best = (common, title, names_here)
                if best:
                    per_lang[lang] = best
            if not per_lang:
                report.append(f"{brand} {model} {code}: нет списка в pl/de")
                continue
            # The same line named by two languages' articles.
            seen, shared = {}, set()
            for lang, best in per_lang.items():
                for name in {norm(n) for n, _w, _s in best[2]}:
                    if name in seen and seen[name] != lang:
                        shared.add(name)
                    seen.setdefault(name, lang)
            status = "проверено" if shared else "частично проверено"
            urls = [f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(best[1].replace(' ', '_'))}"
                    for lang, best in per_lang.items()]
            for phase, start, end in sorted(phases, key=lambda p: p[1]):
                lines, sport, special = [], [], []
                for lang, best in per_lang.items():
                    for name, when, is_special in best[2]:
                        # A line with its months (de) only in the phases it was sold in.
                        if when and overlap(start, (end or 2100) + 1, when[0], when[1]) <= 0.25:
                            continue
                        target = sport if SPORT.match(name) else special if (is_special or SPECIAL.search(name)) else lines
                        if norm(name) not in {norm(n) for n in lines + sport + special}:
                            target.append(name)
                if not (lines or sport or special):
                    continue
                phase_ru = {"pre": "дорестайлинг", "fl": "рестайлинг", "fl2": "2-й рестайлинг", "upd": "обновление"}.get(phase, "весь выпуск")
                note = " · ".join(f"{lang}: {best[1]}" for lang, best in per_lang.items())
                rows.append({"brand": brand, "model": model, "label": model, "code": code, "phase": phase_ru,
                             "years": f"{start}–{end if end else 'н. в.'}", "trims": lines, "sport": sport,
                             "special": special, "sources": urls, "status": status, "note": note, "origin": "wiki"})
        print(f"{key}: {sum(1 for r in rows if r['brand'] == brand and r['model'] == model)} строк", flush=True)
    if only and "--missing" not in sys.argv:
        for row in rows:
            print(f"  {row['code']} {row['phase']} {row['years']} [{row['status']}] lines={row['trims']} sport={row['sport']} special={row['special']} ({row['note']})")
        print("\n".join(report))
        return
    with open(os.path.join(ROOT, "data", "model-trims-wiki.json"), "w", encoding="utf8") as handle:
        json.dump({"rows": clean_rows(kept + rows), "missing": report}, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    print(f"rows={len(rows)} missing={len(report)}")


if __name__ == "__main__":
    main()
