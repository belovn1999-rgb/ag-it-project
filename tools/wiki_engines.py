"""German Wikipedia engine tables as a third source for mild hybrids (B61).

de.wikipedia car articles carry "Technische Daten" tables: one column per
engine, a power row ("110 kW (150 PS)") and, for mild hybrids, a row like
"ab 02/2020 mit 48V Mild-Hybrid-Technologie" spanning the columns it applies
to. mild_columns() returns, per engine column: its power in PS, the mild
text and the year it starts. Pages are cached in /tmp/wiki-mhev.
"""
import json
import os
import re
import subprocess
import time
import urllib.parse

UA = "AUTOGOOD-tools/1.0 (internal model table; belovn1999@gmail.com)"
CACHE = "/tmp/wiki-mhev"
MILD = re.compile(r"mild[- ]?hybrid|mildhybrid|\bmhev\b|48[- ]?v(olt)?\b|eq[- ]?boost|\bisg\b|riemen-?starter|"
                  r"startergenerator|\betsi\b|\be-tec\b|m[- ]hybrid|\be-skyactiv", re.I)
_last = [0.0]


def _get(url, path):
    if not os.path.exists(path):
        wait = 1.0 - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        subprocess.run(["curl", "-s", "--max-time", "60", "-A", UA, "-o", path, url], check=False)
        _last[0] = time.time()
    try:
        return json.load(open(path, encoding="utf8"))
    except (OSError, ValueError):
        return {}


def wikitext(title, lang="de"):
    os.makedirs(CACHE, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"{lang}_{title}")
    url = (f"https://{lang}.wikipedia.org/w/api.php?action=parse&redirects=1&prop=wikitext&format=json&formatversion=2"
           f"&page={urllib.parse.quote(title)}")
    data = _get(url, os.path.join(CACHE, safe + ".json"))
    return (data.get("parse") or {}).get("wikitext", "")


def _clean(cell):
    cell = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", cell, flags=re.S)
    cell = re.sub(r"\{\{[^{}]*\}\}", "", cell)
    cell = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", cell)
    cell = re.sub(r"<br\s*/?>", " ", cell)
    cell = re.sub(r"<[^>]+>", "", cell)
    return re.sub(r"\s+|&nbsp;", " ", cell).replace("&nbsp;", " ").strip()


def _cells(line):
    """'| colspan="3" | a || b' -> [(3, 1, 'a'), (1, 1, 'b')]."""
    out = []
    body = line[1:]
    for part in re.split(r"\|\||!!", body):
        attrs, sep, text = part.partition("|") if re.match(r'\s*(colspan|rowspan|style|class|align)\b', part) else ("", "", part)
        if not sep:
            text = part
        colspan = int((re.search(r'colspan\s*=\s*"?(\d+)', attrs) or [0, 1])[1])
        rowspan = int((re.search(r'rowspan\s*=\s*"?(\d+)', attrs) or [0, 1])[1])
        out.append((colspan, rowspan, _clean(text)))
    return out


def fuel_of(heading):
    lower = heading.lower()
    return "diesel" if "diesel" in lower else "petrol" if re.search(r"otto|benzin", lower) else ""


def tables(text):
    """Every wikitable as a grid of cell texts (colspan and rowspan spread); grid.fuel from the heading above."""
    grids = []
    for match in re.finditer(r"\{\|[^\n]*wikitable.*?\n\|\}", text, re.S):
        headings = re.findall(r"^=+\s*([^=\n]+?)\s*=+\s*$", text[:match.start()], re.M)
        rows, pending = [], {}
        for raw in re.split(r"\n\|-[^\n]*", match.group(0)):
            row, column = [], 0
            lines = [line for line in raw.split("\n") if line.startswith(("|", "!")) and not line.startswith(("{|", "|}", "|+"))]
            cells = [cell for line in lines for cell in _cells(line)]
            for colspan, rowspan, cell in cells:
                while column in pending:
                    left, value = pending[column]
                    row.append(value)
                    pending[column] = (left - 1, value) if left > 1 else None
                    if pending[column] is None:
                        del pending[column]
                    column += 1
                for _ in range(colspan):
                    row.append(cell)
                    if rowspan > 1:
                        pending[column] = (rowspan - 1, cell)
                    column += 1
            while column in pending:
                left, value = pending.pop(column)
                row.append(value)
                if left > 1:
                    pending[column] = (left - 1, value)
                column += 1
            if row:
                rows.append(row)
        grids.append(Grid(rows, fuel_of(headings[-1]) if headings else ""))
    return grids


class Grid(list):
    def __init__(self, rows, fuel):
        super().__init__(rows)
        self.fuel = fuel


def mild_columns(text):
    """[(PS, mild text, start year or None, column header)] of every engine column a mild row covers."""
    found = []
    for grid in tables(text):
        power_rows = [row for row in grid if sum(bool(re.search(r"\(\s*\d{2,3}\s*PS\s*\)|\d{2,3}\s*PS", c)) for c in row) >= 2]
        mild_rows = [row for row in grid if any(MILD.search(c) for c in row[1:])]
        if not power_rows or not mild_rows:
            continue
        header = grid[0]
        for power_row in power_rows:
            for mild_row in mild_rows:
                for index in range(1, min(len(power_row), len(mild_row))):
                    text_mild = mild_row[index]
                    if not MILD.search(text_mild):
                        continue
                    for ps in re.findall(r"(\d{2,3})\s*PS", power_row[index]):
                        if int(ps) < 50:
                            continue  # the electric boost ("8 kW (11 PS)"), no engine
                        year = re.search(r"(?:ab|seit|from)\s*(?:\d{1,2}/)?((?:19|20)\d{2})", text_mild)
                        found.append((int(ps), text_mild[:120], int(year.group(1)) if year else None,
                                      header[index] if index < len(header) else "", grid.fuel))
    return found


def resolve(title, lang="de"):
    """The article text of a title, or of the first search hit for it."""
    text = wikitext(title, lang)
    if text:
        return title, text
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"search_{lang}_{title}")
    url = (f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1"
           f"&srsearch={urllib.parse.quote(title)}")
    hits = (_get(url, os.path.join(CACHE, safe + ".json")).get("query") or {}).get("search") or []
    return (hits[0]["title"], wikitext(hits[0]["title"], lang)) if hits else (title, "")


def mild_sentences(text):
    """Prose (outside tables) that names a mild hybrid: what a reader checks by hand."""
    plain = re.sub(r"\{\|.*?\n\|\}", " ", text, flags=re.S)
    plain = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", plain, flags=re.S)
    out = []
    for match in MILD.finditer(plain):
        start = max(plain.rfind(".", 0, match.start()), plain.rfind("\n", 0, match.start())) + 1
        end = min([i for i in (plain.find(". ", match.end()), plain.find("\n", match.end())) if i > 0] or [len(plain)])
        sentence = _clean(plain[start:end + 1])
        if sentence and sentence not in out and len(sentence) < 400:
            out.append(sentence)
    return out


def mild_mentions(text):
    """Sentences outside tables naming a mild hybrid together with a power ("110 kW (150 PS)")."""
    plain = re.sub(r"\{\|.*?\n\|\}", " ", text, flags=re.S)
    out = []
    for match in MILD.finditer(plain):
        window = plain[max(0, match.start() - 300): match.end() + 300]
        for ps in re.findall(r"(\d{2,3})\s*PS", window):
            out.append(int(ps))
    return out


SHIFT = re.compile(r"schalt", re.I)
AUTO = re.compile(r"automat|doppelkupplung|\bdsg\b|\bdct\b|\bcvt\b|tronic|stufen", re.I)
GAS = re.compile(r"\b(tgi|g-tec|cng|lpg|erdgas|autogas|bi-?fuel|ecofuel)\b", re.I)
FULL = re.compile(r"\b(p?hev|plug-?in|e-?hybrid|full ?hybrid|vollhybrid|e:hev|e-tech)\b|\bhybrid\b(?!.*mild)", re.I)


def _period(cell):
    """'11/2021–01/2023' -> (2021.83, 2023.08); 'seit 07/2025' -> (2025.5, 2100); unknown -> None."""
    found = re.findall(r"(?:(\d{1,2})\s*/\s*)?((?:19|20)\d{2})", cell or "")
    if not found:
        return None
    start = int(found[0][1]) + (int(found[0][0]) - 1 if found[0][0] else 0) / 12
    if len(found) == 1:
        if re.search(r"seit|ab|since|from|–\s*$|-\s*$", cell, re.I):
            return start, 2100.0
        return start, int(found[0][1]) + 1.0
    end_month = int(found[1][0]) if found[1][0] else 12
    return start, int(found[1][1]) + end_month / 12


def engine_columns(text):
    """Every engine column of the article's tables: {ps, litres, fuel, period, boxes, mild, full, name}.
    mild: a cell of the column (its name included) names a mild hybrid; full: a full or plug-in hybrid."""
    out = []
    for grid_index, grid in enumerate(tables(text)):
        if len(grid) < 3:
            continue
        label = lambda row: (row[0] if row else "").lower()
        header = grid[0]
        power_row = next((row for row in grid if "leistung" in label(row) and not re.search(r"elektro|system|drehmoment", label(row))
                          and sum(bool(re.search(r"\d{2,3}\s*PS", c)) for c in row[1:]) >= 1), None)
        if not power_row:
            continue
        electric_row = next((row for row in grid if "leistung" in label(row) and "elektro" in label(row)), None)
        period_row = next((row for row in grid if re.search(r"bauzeit|produktionszeit|zeitraum", label(row))), None)
        size_row = next((row for row in grid if "hubraum" in label(row)), None)
        type_row = next((row for row in grid if re.search(r"motortyp|motorbauart|bauart", label(row))), None)
        box_row = [row for row in grid if "getriebe" in label(row)]
        for index in range(1, len(header)):
            cell = lambda row: row[index] if row and index < len(row) else ""
            ps = [int(value) for value in re.findall(r"(\d{2,3})\s*PS", cell(power_row)) if int(value) >= 50]
            if not ps:
                continue
            column = [row[index] for row in grid if index < len(row)]
            labelled = [row for row in grid if index < len(row) and MILD.search(row[0] or "")
                        and cell(row).strip() not in ("", "–", "-", "—", "nein")]
            mild = any(MILD.search(value) for value in column) or bool(labelled)
            electric = [int(v) for v in re.findall(r"(\d{2,3})\s*PS", cell(electric_row))] if electric_row else []
            full = not mild and (bool(FULL.search(cell(header))) or any(v > 30 for v in electric))
            kind = cell(type_row).lower()
            if GAS.search(f"{cell(header)} {kind}"):
                continue  # natural gas / LPG (Golf 1.5 TGI): no petrol twin
            fuel = "diesel" if "diesel" in kind else "petrol" if "otto" in kind else grid.fuel
            if not fuel:
                fuel = "diesel" if re.search(r"\b(tdi|crdi|dci|cdi|hdi|bluehdi|tdci|ecoblue|d)\b|\d{2,3}d\b", cell(header), re.I) else ""
            size = re.search(r"(\d{3,4})\s*cm", cell(size_row).replace(".", "").replace(" ", "")) if size_row else None
            gearboxes = " ".join(cell(row) for row in box_row)
            boxes = ({"m"} if SHIFT.search(gearboxes) else set()) | ({"a"} if AUTO.search(gearboxes) else set())
            out.append({"ps": ps, "litres": round(int(size.group(1)) / 1000, 1) if size else None, "fuel": fuel,
                        "period": _period(cell(period_row)) if period_row else None, "boxes": boxes,
                        "mild": mild, "full": full, "name": cell(header)[:60], "grid": grid_index,
                        "when": cell(period_row)[:30] if period_row else ""})
    return out
