#!/usr/bin/env python3
"""Facelift years of the long generations from Wikipedia (B61, owner 2026-10-21).

A generation our sources give as one stretch (phase "all", 5+ years: autocentrum.pl has no
"Facelifting" body for it) gets the year of its facelift from the generation's block of the model
article (pl / de / en / fr / it / nl; the articles are found as for the trims,
tools/collect-trims-wiki.py): the sentences that name a facelift ("Lifting", "Facelift",
"Modellpflege", "restylage", "restyling") and a year inside the generation. The same year named in
two languages -> "проверено", in one -> "частично проверено"; only an "accepted" year goes to the page
(accepted(): 2+ languages, more than any other year, 2+ years after the start). The versions are not split
(we cannot tell them apart): the page shows "lifting 2016" next to the generation (build-model-specs.py).

    python3 tools/collect-facelifts-wiki.py            # writes data/model-facelifts-wiki.json
    python3 tools/collect-facelifts-wiki.py "Kia|Picanto"   # prints, writes nothing
Pages are cached in /tmp/wiki-mhev (tools/wiki_engines.py), one request a second.
"""
import collections
import importlib.util
import json
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("trims", os.path.join(ROOT, "tools", "collect-trims-wiki.py"))
T = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(T)

OUT = os.path.join(ROOT, "data", "model-facelifts-wiki.json")
LANGS = ("pl", "de", "en", "fr", "it", "nl")
FACELIFT = {
    "pl": re.compile(r"lifting|modernizac|odświeżon|odmłodzon", re.I),
    "de": re.compile(r"facelift|modellpflege|überarbeit|aufgefrischt", re.I),
    "en": re.compile(r"facelift|refresh|restyl|mid-cycle", re.I),
    "fr": re.compile(r"restyl|facelift|phase 2\b|phase ii\b", re.I),
    "it": re.compile(r"restyling|facelift|aggiornament", re.I),
    "nl": re.compile(r"facelift|vernieuwd|opgefrist", re.I),
}
MIN_SPAN = 5


def targets():
    """{key: {code: (from, to)}} — generations of one phase "all", no facelift year, 5+ years, made after 2011."""
    out = collections.defaultdict(dict)
    for key, spec in T.page_models().items():
        by_code = collections.defaultdict(list)
        for code, phase, start, end, _mobile, lift in spec["gens"]:
            by_code[code].append((phase, start, end, lift))
        for code, phases in by_code.items():
            if any(phase != "all" or lift for phase, _s, _e, lift in phases):
                continue
            start = min(s for _p, s, _e, _l in phases)
            end = max((e or 2026) for _p, _s, e, _l in phases)
            if end - start >= MIN_SPAN and end >= 2012:
                out[key][code] = (start, None if any(e is None for _p, _s, e, _l in phases) else end)
    return out


def years_named(text, lang, g_from, g_to):
    """Years inside the generation that sentences naming a facelift give."""
    found = collections.Counter()
    for sentence in re.split(r"(?<=[.!?])\s+|\n+", T.clean(text)):
        if not FACELIFT[lang].search(sentence):
            continue
        for year in re.findall(r"\b((?:19|20)\d{2})\b", sentence):
            if g_from < int(year) < (g_to or 2027):
                found[int(year)] += 1
    return found


def accepted(languages, g_from, g_to):
    """A year two languages or more name, more of them than any other year, at least two years after the
    generation's start (a "facelift" in its first year is the launch itself: Pajero IV, Explorer V)."""
    votes = collections.Counter(languages.values())
    ranked = sorted(votes.items(), key=lambda item: (-item[1], item[0]))
    year, count = ranked[0]
    clear = count >= 2 and (len(ranked) == 1 or ranked[1][1] < count)
    return clear and g_from + 2 <= year < (g_to or 2027)


def main():
    only = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    todo = targets()
    out = {}
    for key in sorted(todo):
        if only and key not in only:
            continue
        brand, model = key.split("|", 1)
        gens = todo[key]
        names = T.model_names(brand, model)
        sources = {lang: T.articles(brand, names, lang, list(gens)) for lang in LANGS}
        for code, (g_from, g_to) in gens.items():
            per_lang, urls = {}, []
            for lang, found in sources.items():
                votes = collections.Counter()
                title_used = ""
                for title, text in found:
                    for b_from, b_to, start, end in T.blocks(text, lang):
                        # The article's block of this generation: its start within 2 years of ours.
                        if abs(b_from - g_from) > 2.5 or T.overlap(g_from, (g_to or 2026) + 1, b_from, b_to) < 2:
                            continue
                        named = years_named(text[start:end], lang, g_from, g_to)
                        if named:
                            votes.update(named)
                            title_used = title_used or title
                if votes:
                    # The first facelift: the earliest of the years this language names most.
                    top = max(votes.values())
                    per_lang[lang] = min(year for year, count in votes.items() if count == top)
                    urls.append(f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(title_used.replace(' ', '_'))}")
            if not per_lang:
                continue
            agree = collections.Counter(per_lang.values())
            year, count = min(agree.items(), key=lambda item: (-item[1], item[0]))
            out[f"{key}|{code}"] = {"year": year, "status": "проверено" if count >= 2 else "частично проверено",
                                    "accepted": accepted(per_lang, g_from, g_to), "from": g_from, "to": g_to,
                                    "languages": per_lang, "sources": urls}
            print(f"{key} {code} {g_from}–{g_to or ''}: {year} {per_lang}", flush=True)
    if only:
        return
    with open(OUT, "w", encoding="utf8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    total = sum(len(g) for g in todo.values())
    checked = sum(1 for v in out.values() if v["status"] == "проверено")
    print(f"generations={total} found={len(out)} проверено={checked} accepted={sum(v['accepted'] for v in out.values())}")


if __name__ == "__main__":
    main()
