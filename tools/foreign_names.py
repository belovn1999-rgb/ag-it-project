"""Our model for a make + model name of an official register (EEA CO2 monitoring, US EPA fuel economy).

The registers write names their own way: EEA "OCTAVIA / COMBI 20 / TDI", "320D XDRIVE", "TOYOTA COROLLA",
"C 220 D"; EPA "328i xDrive", "C300 4matic", "3 5-Door 2WD", "Tiguan 4motion". A name belongs to the model whose
name it starts with (the longest one first: "Golf Sportsvan" before "Golf"); BMW "Seria 3" takes 3xx / M3 / M340i,
Mercedes "Klasa C" takes "C 220" and "C300", not "CLA 200".
"""
import re
import unicodedata

MAKE_ALIASES = {
    "VOLKSWAGEN": "VOLKSWAGEN", "VW": "VOLKSWAGEN", "VOLKSWAGENVW": "VOLKSWAGEN", "VWVOLKSWAGEN": "VOLKSWAGEN",
    "AUDIAG": "AUDI", "MERCEDES": "MERCEDESBENZ", "MERCEDESBENZ": "MERCEDESBENZ", "MERCEDESAMG": "MERCEDESBENZ",
    "MB": "MERCEDESBENZ", "SSANGYONG": "KGM", "KGMOBILITY": "KGM", "KGM": "KGM", "DSAUTOMOBILES": "DS",
    "LYNKCO": "LYNKCO", "LYNKANDCO": "LYNKCO", "GREATWALL": "GWM", "GREATWALLMOTOR": "GWM", "BMWI": "BMW",
    "ROVER": "LANDROVER", "LANDROVER": "LANDROVER", "RANGEROVER": "LANDROVER", "MINI": "MINI", "BMWMINI": "MINI",
    "ALFA": "ALFAROMEO", "CITROEN": "CITROEN", "SKODA": "SKODA", "TESLAMOTORS": "TESLA", "KIAMOTORS": "KIA",
    "HYUNDAIMOTOR": "HYUNDAI", "OPELVAUXHALL": "OPEL", "VAUXHALL": "OPEL", "HYUNDAIGENESIS": "GENESIS",
    "LUCIDMOTORS": "LUCID", "MGROEWE": "MG", "MGMOTOR": "MG", "MGMOTORUK": "MG", "TOYOTAMOTOR": "TOYOTA", "SMARTEQ": "SMART", "JAGUARLANDROVER": "JAGUAR",
}
# Words a register puts before the model ("TOYOTA COROLLA", "MERCEDES-AMG C 63", "BMW I4").
LEAD_WORDS = re.compile(r"^(?:(?:NEW|NUEVO|NOUVELLE|NEUER?|THE|ALL|MERCEDES|BENZ|AMG|VW|VOLKSWAGEN|AUDI|BMW|SKODA|SEAT|"
                        r"TOYOTA|LEXUS|NISSAN|HONDA|MAZDA|KIA|HYUNDAI|FORD|OPEL|VAUXHALL|PEUGEOT|CITROEN|RENAULT|DACIA|"
                        r"FIAT|JEEP|VOLVO|SUZUKI|MITSUBISHI|SUBARU|PORSCHE|MINI|TESLA|CUPRA|DS|ALFA|ROMEO|LAND|RANGE|"
                        r"ROVER|JAGUAR|SMART|MG|BYD|POLESTAR|CHEVROLET|DODGE|CHRYSLER|CADILLAC|GENESIS|SSANGYONG|KGM)\s+)+")


def fold(text):
    text = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9]+", " ", text.upper())).strip()


def make_key(make):
    key = fold(make).replace(" ", "")
    for alias, target in MAKE_ALIASES.items():
        if key == alias:
            return target
    for alias, target in (("VOLKSWAGEN", "VOLKSWAGEN"), ("MERCEDES", "MERCEDESBENZ"), ("AUDI", "AUDI"),
                          ("LANDROVER", "LANDROVER"), ("ALFAROMEO", "ALFAROMEO"), ("SSANGYONG", "KGM")):
        if key.startswith(alias):
            return target
    return key


def _pattern(key):
    tokens = [re.escape(t) for t in re.findall(r"[A-Z]+|\d+", key)]
    if not tokens:
        return None
    tail = r"(?:\s|$|\d)" if re.fullmatch(r"[A-Z]{1,3}", key) else r"(?:\s|$)"
    return re.compile(r"^" + r"\s*".join(tokens) + tail)


def _names(model, mobile):
    names = []
    for name in (model, mobile):
        for part in re.split(r"\s*/\s*|\s*[(),]\s*", name or ""):
            part = re.sub(r"^(?:Klasa|Seria|Series|Klasse)\s+", "", part.strip(), flags=re.I)
            if part:
                names.append(part)
                # "Range Rover Evoque" is "EVOQUE" there, "Model Y" is "Y".
                short = re.sub(r"(?i)^(?:range rover|model|beijing)\s+", "", part)
                if short != part:
                    names.append(short)
                if re.fullmatch(r"(?i)multivan|transporter", part):
                    names += ["California", "Caravelle"]
    return names


class Matcher:
    """matcher.model(make, name) -> our «Модель» or None, for the models of our table (rows)."""

    def __init__(self, rows):
        self.by_make = {}
        seen = set()
        for row in rows:
            make, model = row["Марка"], row["Модель"]
            if (make, model, row.get("Модель mobile.de", "")) in seen:
                continue
            seen.add((make, model, row.get("Модель mobile.de", "")))
            patterns = self.by_make.setdefault(make_key(make), [])
            bmw = re.fullmatch(r"(?i)seria (\d)", model)
            if make_key(make) == "BMW" and bmw:
                n = bmw.group(1)
                patterns.append((99, re.compile(rf"^(?:M\s*)?{n}\d\d\s*[A-Z]*(?:\s|$)|^M\s*{n}(?:\s|$)|"
                                                rf"^{n}\s*(?:ER|SERIES?|SERIE|REIHE)(?:\s|$)"), model))
                continue
            for name in _names(model, row.get("Модель mobile.de", "")):
                key = fold(name)
                pattern = _pattern(key)
                if pattern:
                    patterns.append((len(key), pattern, model))
        for patterns in self.by_make.values():
            patterns.sort(key=lambda item: -item[0])

    def model(self, make, name):
        patterns = self.by_make.get(make_key(make))
        if not patterns:
            return None
        text = fold(name)
        own = fold(make)
        variants = [text]
        if own and text.startswith(own + " "):
            variants.append(text[len(own) + 1:])
        for value in list(variants):
            if make_key(make) == "AUDI":
                # S3 / RS 6 / SQ5 / RS Q8 are A3 / A6 / Q5 / Q8 there.
                variants.append(re.sub(r"^(?:RS|S)\s*(Q?)\s*(\d)",
                                       lambda m: ("Q" if m.group(1) else "A") + m.group(2), value))
            if make_key(make) == "MERCEDESBENZ":
                variants.append(re.sub(r"^E(?=VITO|SPRINTER|CITAN)", "", value))
            else:
                variants.append(re.sub(r"^E\s+(?=[A-Z0-9])", "", value))  # e-208, E-C4 (not Mercedes E 220)
            variants.append(re.sub(r"^(?:EQ|718|ABARTH)\s+", "", value))  # smart EQ fortwo, Porsche 718 Cayman
            variants.append(re.sub(r"^(I\d0)\s*N\b", r"\1", value))  # i30 N
            variants.append(re.sub(r"^(?:GRAND|GR)\s+", "", value))  # Grand C-Max, GR Yaris (after the full names)
            variants.append(re.sub(r"\s+(?:SUV|SB|SPORTBACK)(?=\s)", "", value + " ").strip())  # Q6 SUV e-tron
            variants.append(re.sub(r"^I(\d)S\b", r"I\1", value))  # BMW i3s
            if make_key(make) == "AUDI":
                variants.append(re.sub(r"^TT\s*(?:S|RS)\b", "TT", value))  # TTS, TT RS
            if make_key(make) == "MINI":
                rest = re.sub(r"^(?:MINI\s+)?(?:ONE|COOPER(?:\s+(?:SE|SD|S|D|C|E))?|JCW|JOHN\s+COOPER\s+WORKS"
                              r"(?:\s+GP)?)(?:\s+(?:D|E|SE|ALL4))*\s*", "", value)
                variants.append(rest if rest and rest != "MINI" else "COOPER")
            variants.append(LEAD_WORDS.sub("", value + " ").strip())
            variants.append(re.sub(r"^(MAZDA|MITSUBISHI)\s*(\d)", r"\2", value))
        for value in dict.fromkeys(variants):
            for _length, pattern, model in self.by_make[make_key(make)]:
                if pattern.search(value):
                    return model
        return None
