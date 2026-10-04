#!/usr/bin/env python3
"""Full engine table of the pinned popular models (B61 stage 3, PROJECT-MOBILE.md 4.8).

Reads data/model-engines.json (every version, from tools/generate-model-engines.py)
and writes:
- data/model-engines.csv      one row per version: generation, phase
                              (pre-facelift / facelift), body, fuel, cm3, hp, kW,
                              year, gearbox, drive (Excel: UTF-8 with BOM, ";")
- data/model-filter-index.json what the page-1 filters will read (stage 4):
                              model -> generation/phase -> years -> fuel -> cm3 -> hp
- docs/MODEL-ENGINES.md       the same per generation and phase, readable

GENERATIONS maps every ultimatespecs generation to our generation code and
phase; "years" corrects the source where it says "Present" for a car that is
no longer built (checked 2026-10-04). Gearbox and drive come from the version
name: an explicit marker ("Auto", "S tronic", "DSG", "xDrive", "quattro"...),
a manual twin (the same engine is listed with and without "Auto"), or the
model's usual drive; the CSV says which.

    python3 tools/build-model-engine-table.py
"""
import collections
import csv
import datetime
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PRE, FL, FL2, ALL, UPD = "дорестайлинг", "рестайлинг", "рестайлинг 2", "весь выпуск", "обновление"

# (brand, model) -> {ultimatespecs generation: (code, phase, checked years or None, mobile.de model or None)}
GENERATIONS = {
    ("Audi", "A3"): {
        "Type 8Y - 2025 Facelift": ("8Y", FL, None, None),
        "Type 8Y": ("8Y", PRE, None, None),
        "Type 8V 2016 - 2016 Facelift": ("8V", FL, None, None),
        "Type 8V": ("8V", PRE, None, None),
        "Type 8P": ("8P", ALL, None, None),
    },
    ("Audi", "A4"): {
        "Type B9 - 2020 Facelift": ("B9", FL, "2019–2024", None),
        "Type B9 - 2019 Facelift": ("B9", UPD, "2018–2019", None),
        "Type B9": ("B9", PRE, None, None),
        "Type B8": ("B8", ALL, None, None),
    },
    ("Audi", "A5"): {
        "A5 Type B10 - 2025 New Model": ("B10", PRE, None, None),
        "A5 Type F5 - 2020 Facelift": ("F5", FL, None, None),
        "A5 Type F5 - 2016 New Model": ("F5", PRE, None, None),
        "Type 8T": ("8T", ALL, None, None),
    },
    ("Audi", "A6"): {
        "Type C9 - 2025 New Model": ("C9", PRE, None, None),
        "Type C8 - 2023 Facelift": ("C8", FL, None, None),
        "Type C8": ("C8", PRE, None, None),
        "Type C7": ("C7", ALL, None, None),
        "Type C6": ("C6", ALL, None, None),
    },
    ("Audi", "Q3"): {
        "Type FJ - 2026 New Model": ("FJ", PRE, None, None),
        "Type F3 - 2018 New Model": ("F3", ALL, None, None),
        "Type 8U - 2012 New Model": ("8U", ALL, None, None),
    },
    ("Audi", "Q5"): {
        "Q5 (GU Gen.) - 2025 New Model": ("GU", PRE, None, None),
        "Q5 (FY Gen.) - 2021 Facelift": ("FY", FL, None, None),
        "Q5 (FY Gen.) - 2017 New Model": ("FY", PRE, None, None),
        "Type 8R": ("8R", ALL, None, None),
    },
    ("Audi", "Q7"): {
        "Q7 3rd Generation": ("Q7 III", PRE, None, None),
        "Q7 II": ("4M", ALL, None, None),
        "Type 4L": ("4L", ALL, None, None),
    },
    ("BMW", "1"): {
        "F7x 1 Series": ("F70", PRE, None, None),
        "F40 1 Series": ("F40", ALL, None, None),
        "F2x": ("F20/F21", ALL, None, None),
        "E8x": ("E81/E87", ALL, None, None),
    },
    ("BMW", "3"): {
        "G20 / G80 LCI - 2023 Update": ("G20", FL, None, None),
        "G20 / G80": ("G20", PRE, None, None),
        "F30 / F80 LCI": ("F30", FL, None, None),
        "F30 / F80": ("F30", PRE, None, None),
        "E90 LCI - 2009 Update": ("E90", FL, None, None),
        "E90": ("E90", PRE, None, None),
    },
    ("BMW", "4"): {
        "G2x / G8x LCI": ("G22", FL, None, None),
        "G2x": ("G22", PRE, None, None),
        "F3x LCI": ("F32", FL, None, None),
        "F3x": ("F32", PRE, None, None),
    },
    ("BMW", "5"): {
        "G60": ("G60", PRE, None, None),
        "G30 LCI": ("G30", FL, None, None),
        "G30 / F90": ("G30", PRE, None, None),
        "F10 LCI": ("F10", FL, None, None),
        "F10": ("F10", PRE, None, None),
        "E60": ("E60", ALL, None, None),
    },
    ("BMW", "X1"): {
        "U11": ("U11", PRE, None, None),
        "F48": ("F48", ALL, None, None),
        "E84": ("E84", ALL, None, None),
    },
    ("BMW", "X3"): {
        "G45 - 2025 New Model": ("G45", PRE, None, None),
        "G01 LCI - 2022 Update": ("G01", FL, None, None),
        "G01 - 2018 New Model": ("G01", PRE, None, None),
        "F25": ("F25", ALL, None, None),
        "E83": ("E83", ALL, None, None),
    },
    ("BMW", "X5"): {
        "G05 LCI - 2024 Update": ("G05", FL, None, None),
        "G05": ("G05", PRE, None, None),
        "F15": ("F15", ALL, None, None),
        "E70": ("E70", ALL, None, None),
    },
    ("Ford", "C-Max"): {
        "C Max 2": ("Mk2", ALL, None, None),
        "C Max 1": ("Mk1", ALL, None, None),
    },
    ("Ford", "Fiesta"): {
        "Fiesta 8 - 2022 Update": ("Mk8", FL, "2022–2023", None),
        "Fiesta 8 - 2017 New Model": ("Mk8", PRE, None, None),
        "Fiesta 7": ("Mk7", ALL, None, None),
    },
    ("Ford", "Focus"): {
        "Focus 4 - 2022 Update": ("Mk4", FL, "2022–2025", None),
        "Focus 4 - 2019 New Model": ("Mk4", PRE, None, None),
        "Focus 3": ("Mk3", ALL, None, None),
        "Focus 2": ("Mk2", ALL, None, None),
    },
    ("Ford", "Kuga"): {
        "Kuga 2024 Facelift": ("Mk3", FL, None, None),
        "Kuga 2020": ("Mk3", PRE, "2020–2024", None),
        "Kuga 2017": ("Mk2", FL, None, None),
        "Kuga 2": ("Mk2", PRE, None, None),
        "Kuga 1": ("Mk1", ALL, None, None),
    },
    ("Ford", "Mondeo"): {
        "Mondeo 5": ("Mk5", ALL, "2014–2022", None),
        "Mondeo 4": ("Mk4", ALL, None, None),
    },
    ("Ford", "S-Max"): {
        "S Max 2": ("Mk2", ALL, "2015–2023", None),
        "S Max 1": ("Mk1", ALL, None, None),
    },
    ("Mercedes-Benz", "A"): {
        "W177 Facelift": ("W177", FL, None, None),
        "W177": ("W177", PRE, None, None),
        "W176": ("W176", ALL, None, None),
        "W169": ("W169", ALL, None, None),
    },
    ("Mercedes-Benz", "C"): {
        "W206 - 2022 New Model": ("W206", PRE, None, None),
        "W205 Facelift": ("W205", FL, None, None),
        "W205": ("W205", PRE, None, None),
        "W204": ("W204", ALL, None, None),
    },
    ("Mercedes-Benz", "E"): {
        "W214 - New Model": ("W214", PRE, None, None),
        "W213 - 2021 Facelift": ("W213", FL, None, None),
        "W213": ("W213", PRE, None, None),
        "W212": ("W212", ALL, None, None),
    },
    ("Mercedes-Benz", "S"): {
        "W223 - 2026 Facelift": ("W223", FL, None, None),
        "W223": ("W223", PRE, None, None),
        "W222 Restyling": ("W222", FL, None, None),
        "W222": ("W222", PRE, None, None),
        "W221": ("W221", ALL, None, None),
    },
    ("Mercedes-Benz", "CLA"): {
        "CLA (C178/174) - 2026 New Model": ("C178", PRE, None, None),
        "C118 2023 Facelift": ("C118", FL, "2023–2025", None),
        "C118": ("C118", PRE, "2019–2023", None),
        "C117 2017 Facelift": ("C117", FL, None, None),
        "C117": ("C117", PRE, None, None),
    },
    ("Mercedes-Benz", "GLC"): {
        "X540 GLC EQ - 2026 New Model": ("X540 (электро)", PRE, None, None),
        "C254": ("X254 Coupé (C254)", PRE, None, None),
        "X254": ("X254", PRE, None, None),
        "C253": ("X253 Coupé (C253)", ALL, None, None),
        "X253": ("X253", ALL, None, None),
    },
    ("Mercedes-Benz", "GLE"): {
        "V167 GLE - 2024 Facelift": ("V167", FL, None, None),
        "C167 GLE Coupe - 2024 Update": ("V167 Coupé (C167)", FL, None, None),
        "C167": ("V167 Coupé (C167)", PRE, None, None),
        "V167 GLE - 2019 New Model": ("V167", PRE, None, None),
        "C292": ("W166 Coupé (C292)", ALL, None, None),
        "W166 GLE": ("W166", ALL, None, None),
    },
    ("Peugeot", "208"): {
        "208 II - 2023 Facelift": ("208 II", FL, None, None),
        "208 II": ("208 II", PRE, None, None),
        "208 Phase 2": ("208 I", FL, None, None),
        "208 Phase 1": ("208 I", PRE, None, None),
    },
    ("Peugeot", "308"): {
        "308 3 (P51) - 2022 New Model": ("308 III", PRE, None, None),
        "308 2 (T10) - 2018 Restyling": ("308 II", FL, None, None),
        "308 2 (T9) - 2014 New Model": ("308 II", PRE, None, None),
        "308 1 (T7) - 2008 New Model": ("308 I", ALL, None, None),
    },
    ("Peugeot", "508"): {
        "508 II - 2024 Update": ("508 II", FL, "2023–2025", None),
        "508 II - 2019 New Model": ("508 II", PRE, None, None),
        "508 I Restyling": ("508 I", FL, None, None),
        "508 I": ("508 I", PRE, None, None),
    },
    ("Peugeot", "2008"): {
        "2008 II - 2023 Facelift": ("2008 II", FL, None, None),
        "2008 II": ("2008 II", PRE, "2019–2023", None),
        "2008 I": ("2008 I", ALL, "2013–2019", None),
    },
    ("Peugeot", "3008"): {
        "3008 III - New Model": ("3008 III", PRE, None, None),
        "3008 2 - 2021 Facelift": ("3008 II", FL, "2020–2024", None),
        "3008 2": ("3008 II", PRE, "2016–2020", None),
        "3008 1": ("3008 I", ALL, None, None),
    },
    ("Peugeot", "5008"): {
        "5008 III - New Model": ("5008 III", PRE, None, None),
        "5008 2 - 2021 Facelift": ("5008 II", FL, None, None),
        "5008 II": ("5008 II", PRE, "2017–2020", None),
        "5008": ("5008 I", ALL, None, None),
    },
    ("Renault", "Captur"): {
        "Captur 2 Phase 2 (JB/JE) - 2024 Facelift": ("Captur II", FL, None, None),
        "Captur 2 Phase 1 (JB/JE) - 2020 New Model": ("Captur II", PRE, None, None),
        "Captur 1": ("Captur I", ALL, None, None),
    },
    ("Renault", "Clio"): {
        "Clio 6 (R03) - 2026 New Model": ("Clio VI", PRE, None, None),
        "Clio 5": ("Clio V", ALL, "2019–2025", None),
        "Clio 4": ("Clio IV", ALL, None, None),
        "Clio 3": ("Clio III", ALL, None, None),
        "Clio 2": ("Clio II", ALL, None, None),
    },
    ("Renault", "Kadjar"): {
        "Kadjar 1 Phase 2 - 2019 Facelift": ("Kadjar I", FL, "2018–2022", None),
        "Kadjar 1 Phase 1 - 2016 New Model": ("Kadjar I", PRE, None, None),
    },
    ("Renault", "Megane"): {
        "Megane 4 Phase 2": ("Mégane IV", FL, None, None),
        "Megane 4": ("Mégane IV", PRE, None, None),
        "Megane 3": ("Mégane III", ALL, None, None),
    },
    ("Renault", "Scenic"): {
        "Scénic 5": ("Scénic V (E-Tech, электро)", PRE, None, None),
        "Scénic 4": ("Scénic IV", ALL, "2016–2022", None),
        "Scénic 3": ("Scénic III", ALL, None, None),
    },
    ("Renault", "Trafic"): {
        "Trafic 3 (X82) Phase 3": ("Trafic III", FL2, None, None),
        "Trafic 3 (X82) Phase 2": ("Trafic III", FL, None, None),
        "Trafic 3 (X82) Phase 1": ("Trafic III", PRE, None, None),
    },
    ("Skoda", "Fabia"): {
        "Fabia 4 - 2022 New Model": ("Fabia IV", PRE, None, None),
        "Fabia 3 (2019 Restyling)": ("Fabia III", FL, None, None),
        "Fabia 3": ("Fabia III", PRE, None, None),
        "Fabia 2": ("Fabia II", ALL, None, None),
    },
    ("Skoda", "Kamiq"): {
        "Kamiq 1 - 2024 Facelift": ("Kamiq I", FL, None, None),
        "Kamiq 1": ("Kamiq I", PRE, None, None),
    },
    ("Skoda", "Karoq"): {
        "Karoq 1 - 2022 facelift": ("Karoq I", FL, None, None),
        "Karoq 1 - 2018 New Model": ("Karoq I", PRE, None, None),
    },
    ("Skoda", "Kodiaq"): {
        "Kodiaq 2": ("Kodiaq II", PRE, None, None),
        "Kodiaq 1 - 2021 Update": ("Kodiaq I", FL, None, None),
        "Kodiaq 1 - 2017 New Model": ("Kodiaq I", PRE, None, None),
    },
    ("Skoda", "Octavia"): {
        "Octavia 4 - 2024 Facelift": ("Octavia IV", FL, None, None),
        "Octavia 4": ("Octavia IV", PRE, None, None),
        "Octavia 3 Facelift": ("Octavia III", FL, None, None),
        "Octavia 3": ("Octavia III", PRE, None, None),
        "Octavia 2": ("Octavia II", ALL, None, None),
    },
    ("Skoda", "Superb"): {
        "Superb 4": ("Superb IV", PRE, None, None),
        "Superb 3 Facelift": ("Superb III", FL, None, None),
        "Superb 3": ("Superb III", PRE, None, None),
        "Superb 2": ("Superb II", ALL, None, None),
    },
    ("Toyota", "Auris"): {
        "Auris 2": ("E18", ALL, "2012–2018", None),
        "Auris": ("E15", ALL, None, None),
    },
    ("Toyota", "Avensis"): {
        "Avensis 3": ("T27", ALL, None, None),
    },
    ("Toyota", "C-HR"): {
        "C-HR (AX20)": ("C-HR II", PRE, None, None),
        "C-HR (AX10 Facelift)": ("C-HR I", FL, None, None),
        "C-HR (AX10)": ("C-HR I", PRE, None, None),
    },
    ("Toyota", "Camry"): {
        "Camry 8 (XV70) - 2021 EU Update": ("XV70", FL, "2021–2024", None),
        "Camry 8 (XV70)": ("XV70", PRE, "2017–2021", None),
        "Camry 7": ("XV50 (вне ЕС)", ALL, "2011–2017", None),
        "Camry 6": ("XV40 (вне ЕС)", ALL, None, None),
    },
    ("Toyota", "Corolla"): {
        "Corolla E210 - Facelift 2023": ("E21", FL, None, None),
        "Corolla E210": ("E21", PRE, None, None),
        "Corolla E140": ("E15", ALL, None, None),
    },
    ("Toyota", "RAV 4"): {
        "RAV4 XA50": ("XA50", ALL, None, None),
        "RAV4 XA40": ("XA40", ALL, None, None),
        "RAV4 XA30": ("XA30", ALL, None, None),
    },
    ("Toyota", "Yaris"): {
        "Yaris XP21": ("XP21", ALL, None, None),
        "Yaris 3": ("XP13", ALL, None, None),
        "Yaris 2": ("XP9", ALL, None, None),
    },
    ("Volvo", "S60"): {
        "3rd Generation": ("S60 III", ALL, "2018–2024", None),
        "2nd Generation": ("S60 II", ALL, None, None),
        "1st Generation": ("S60 I", ALL, None, None),
    },
    ("Volvo", "V40"): {
        "2nd Generation": ("V40 II", ALL, None, None),
    },
    ("Volvo", "V60"): {
        "2nd Generation": ("V60 II", ALL, None, None),
        "1st Generation": ("V60 I", ALL, None, None),
    },
    ("Volvo", "XC40"): {
        "XC40 1st Gen - 2023 Update": ("XC40 I", FL, None, None),
        "XC40 1st Gen. - 2018 New Model": ("XC40 I", PRE, None, None),
    },
    ("Volvo", "XC60"): {
        "2nd Generation - 2026 Facelift": ("XC60 II", FL2, None, None),
        "2nd Generation - 2022 Update": ("XC60 II", FL, None, None),
        "2nd Generation": ("XC60 II", PRE, None, None),
        "1st Generation": ("XC60 I", ALL, None, None),
    },
    ("Volvo", "XC90"): {
        "2nd Generation - 2025 Update": ("XC90 II", FL2, None, None),
        "2nd Generation - 2020 Update": ("XC90 II", FL, None, None),
        "2nd Generation - 2016 New Model": ("XC90 II", PRE, None, None),
        "1st Generation": ("XC90 I", ALL, None, None),
    },
    ("Volkswagen", "Golf"): {
        "Golf 8 Facelift": ("Golf VIII", FL, None, None),
        "Golf 8": ("Golf VIII", PRE, None, None),
        "Golf 7 Facelift": ("Golf VII", FL, None, None),
        "Golf 7": ("Golf VII", PRE, None, None),
        "Golf 6": ("Golf VI", ALL, None, None),
    },
    ("Volkswagen", "Passat"): {
        "Passat B9": ("B9", PRE, None, None),
        "Passat B8 Facelift": ("B8", FL, None, None),
        "Passat B8": ("B8", PRE, None, None),
        "Passat B7": ("B7", ALL, None, None),
        "Passat B6": ("B6", ALL, None, None),
    },
    ("Volkswagen", "Polo"): {
        "Polo 6 - 2022 Update": ("Polo VI", FL, None, None),
        "Polo 6 - 2018 New Model": ("Polo VI", PRE, None, None),
        "Polo 5 (Typ 6C)": ("Polo V", FL, None, None),
        "Polo 5 (Typ 6R)": ("Polo V", PRE, None, None),
    },
    ("Volkswagen", "T-Roc"): {
        "T-Roc (A1) - 2022 Update": ("T-Roc I", FL, "2022–2025", None),
        "T-Roc (A1)": ("T-Roc I", PRE, "2017–2022", None),
    },
    ("Volkswagen", "T6"): {
        "Transporter T7 - 2025 New Model": ("T7 Transporter", PRE, None, "T7"),
        "Multivan T7 - 2022 New Model": ("T7 Multivan", PRE, None, "T7"),
        "T6.1": ("T6.1 Transporter", FL, "2019–2024", "T6"),
        "Multivan T6.1": ("T6.1 Multivan", FL, None, "T6"),
        "Transporter T6": ("T6", PRE, None, "T6"),
        "Transporter T5.2 - 2010 Facelift": ("T5 Transporter", FL, None, "T5"),
        "Multivan T5.2 - 2010 Facelift": ("T5 Multivan", FL, None, "T5"),
    },
    ("Volkswagen", "Tiguan"): {
        "Tiguan 3 - 2025 New Model": ("Tiguan III", PRE, None, None),
        "Tiguan 2 - 2021 Facelift": ("Tiguan II", FL, None, None),
        "Tiguan 2": ("Tiguan II", PRE, None, None),
        "Tiguan 1": ("Tiguan I", ALL, None, None),
    },
    ("Volkswagen", "Touran"): {
        "Touran 2 (Type 5T) - 2021 Update": ("Touran II", FL, None, None),
        "Touran 2 (Type 5T) - 2016 New Model": ("Touran II", PRE, None, None),
        "Touran 1 (2010 Restyling)": ("Touran I", FL2, None, None),
        "Touran 1 (2006 Restyling)": ("Touran I", FL, None, None),
    },
}

# Usual drive when the name says nothing: rear-wheel drive models, everything else front.
REAR_DRIVE = {
    ("BMW", "1", "F20/F21"), ("BMW", "1", "E81/E87"), ("BMW", "3", None), ("BMW", "4", None),
    ("BMW", "5", None), ("BMW", "X1", "E84"), ("BMW", "X3", None), ("BMW", "X5", None),
    ("Mercedes-Benz", "C", None), ("Mercedes-Benz", "E", None), ("Mercedes-Benz", "S", None),
    ("Mercedes-Benz", "GLC", None), ("Mercedes-Benz", "GLE", None),
}
ALWAYS_AWD = {("Audi", "Q7"), ("BMW", "X5")}

FUEL_RU = {
    "petrol": "бензин", "diesel": "дизель", "hybrid": "гибрид", "hybrid_diesel": "гибрид (дизель)",
    "plugin": "плагин-гибрид", "electric": "электро", "lpg": "газ (LPG)", "cng": "газ (CNG)",
    "flex": "бензин/E85 (Flexible Fuel)",
}
AUTO = re.compile(
    r"\b(auto|aut|automatic|automatik|s[ -]?tronic|tiptronic|multitronic|dsg|steptronic|dkg|"
    r"powershift|eat\d|e-eat\d|edc|x-?tronic|cvt|e-cvt|multidrive|geartronic|g-?tronic|\d+g-?(tronic|dct)|"
    r"dct|sportshift|selespeed|easytronic|e-?tense)\b", re.I)
AWD = re.compile(
    r"(\bquattro\b|\bxdrive\b|\d{3}xd\b|\d{3}xi\b|\bxi\b|\b4matic\+?|\b4motion\b|\b4x4\b|\bawd(-i)?\b|"
    r"\ball ?wheel\b|\b4wd\b|\be-four\b|\bhybrid4\b|\ballroad\b|\bscout\b|\bxc\d|\bcross country\b)", re.I)
FACELIFT_BODY = re.compile(r"(restyling|facelift|\blci\b)", re.I)
# Plug-in hybrids the source sometimes lists under "Petrol Engines" (A3 45 TFSIe, 330e, C 300 e...).
PLUGIN_NAME = re.compile(
    r"(tfsi ?e\b|\be-tron\b(?! gt)|\b\d{3}x?e\b|\bx?drive\d{2}e\b|\b\d{3} ?d?e\b(?=.*\b(?:c|e|s|a|cla|glc|gle|b)\b)|"
    r"\bgte\b|\behybrid\b|\be-hybrid\b|\biv\b|\brecharge\b|\bt[68] (twin engine|awd recharge)|\bplug-?in\b|\bphev\b|"
    r"\bhybrid4\b|e-tech plug-in)", re.I)
SPEEDS = re.compile(r"\b\d+[ -]?(speeds?|sp|g)\b\.?", re.I)


def fuel_for(version):
    if version["fuel"] in ("petrol", "diesel") and PLUGIN_NAME.search(version["name"]):
        return "plugin", "по названию (плагин-гибрид)"
    if version["fuel"] not in FUEL_RU:
        name = version["name"]
        if re.search(r"g-?tron|\bcng\b|\btgi\b|g-tec", name, re.I):
            return "cng", "по названию (раздел «Others»)"
        if re.search(r"\blpg\b|bi-?fuel", name, re.I):
            return "lpg", "по названию (раздел «Others»)"
        if re.search(r"flex", name, re.I):
            return "flex", "по названию (раздел «Others»)"
    return version["fuel"], ""


def checked_years(gen, override):
    if override:
        return override
    return f"{gen['from']}–{gen['to'] or 'н. в.'}"


def body_phase(gen_phase, gen_from, body_name):
    """Facelifts ultimatespecs keeps inside one generation ("Q3 2015", "S60 II Restyling")."""
    if FACELIFT_BODY.search(body_name):
        year = re.search(r"(20\d\d)", body_name)
        return f"рестайлинг ({year.group(1)})" if year else FL
    year = re.search(r"\b(20\d\d)\b", body_name)
    if gen_phase == ALL and year and int(year.group(1)) >= gen_from + 2:
        return f"рестайлинг ({year.group(1)})"
    return gen_phase


def strip_auto(name):
    name = SPEEDS.sub("", AUTO.sub("", name))
    return re.sub(r"\s+", " ", name).strip(" .").lower()


def gearbox_for(version, twins, fuel):
    if AUTO.search(version["name"]):
        return "автомат", "из названия"
    if fuel in ("electric", "hybrid", "plugin", "hybrid_diesel"):
        return "автомат", "по правилу (гибрид/электро)"
    if twins.get((version["cc"], version["hp"], strip_auto(version["name"]))):
        return "механика", "есть такая же версия с автоматом"
    return "", "не указано в источнике"


def drive_for(brand, model, code, version):
    if AWD.search(version["name"]):
        return "полный", "из названия"
    if re.search(r"\bsdrive\b", version["name"], re.I):
        front = model == "X1" and code != "E84"
        return ("передний" if front else "задний"), "из названия (sDrive)"
    if (brand, model) in ALWAYS_AWD:
        return "полный", "по правилу (модель только 4x4)"
    if (brand, model, code) in REAR_DRIVE or (brand, model, None) in REAR_DRIVE:
        if brand == "BMW" and model == "1" and code in ("F40", "F70"):
            return "передний", "по правилу"
        return "задний", "по правилу"
    return "передний", "по правилу"


def main():
    with open(os.path.join(ROOT, "data", "model-engines.json"), encoding="utf8") as handle:
        source = json.load(handle)
    today = datetime.date.today().isoformat()
    rows, index, problems = [], {}, []

    for model in source["models"]:
        mapping = GENERATIONS.get((model["brand"], model["model"]), {})
        for gen in model["generations"]:
            if gen["generation"] not in mapping:
                problems.append(f"{model['brand']} {model['label']}: нет разметки для «{gen['generation']}»")
                continue
            code, phase, override, mobile_model = mapping[gen["generation"]]
            years = checked_years(gen, override)
            for body in gen["bodies"]:
                bphase = body_phase(phase, gen["from"], body["name"])
                twins = {}
                for v in body["versions"]:
                    if AUTO.search(v["name"]):
                        twins[(v["cc"], v["hp"], strip_auto(v["name"]))] = True
                for v in body["versions"]:
                    fuel, fuel_note = fuel_for(v)
                    gearbox, gearbox_src = gearbox_for(v, twins, fuel)
                    drive, drive_src = drive_for(model["brand"], model["model"], code, v)
                    rows.append({
                        "Марка": model["brand"],
                        "Модель": model["label"],
                        "Модель mobile.de": mobile_model or model["model"],
                        "Поколение": code,
                        "Этап": bphase,
                        "Годы (источник)": f"{gen['from']}–{gen['to'] or 'н. в.'}",
                        "Годы (проверено)": years,
                        "Кузов": body["name"],
                        "Версия": v["name"],
                        "Топливо": FUEL_RU.get(fuel, fuel),
                        "Топливо: примечание": fuel_note,
                        "Объём, см³": v["cc"] or "",
                        "Объём, л": f"{v['cc'] / 1000:.1f}" if v["cc"] else "",
                        "Мощность, л.с.": v["hp"] or "",
                        "Мощность, кВт": v["kw"] or "",
                        "Год версии": v["year"] or "",
                        "Коробка": gearbox,
                        "Коробка: откуда": gearbox_src,
                        "Привод": drive,
                        "Привод: откуда": drive_src,
                        "Ссылка": v["url"],
                    })
                    key = (model["brand"], model["model"])
                    gens = index.setdefault(key, collections.OrderedDict())
                    gkey = (code, phase, years)
                    entry = gens.setdefault(gkey, {"code": code, "phase": phase, "years": years,
                                                   "mobileModel": mobile_model or model["model"],
                                                   "bodies": set(), "engines": {}})
                    entry["bodies"].add(body["name"])
                    if v["hp"]:
                        sizes = entry["engines"].setdefault(fuel, {})
                        sizes.setdefault(str(v["cc"] or 0), set()).add(v["hp"])

    columns = list(rows[0].keys()) if rows else []
    with open(os.path.join(ROOT, "data", "model-engines.csv"), "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    filter_index = {"source": "https://www.ultimatespecs.com", "generatedAt": today, "models": []}
    for (brand, model), gens in index.items():
        filter_index["models"].append({
            "brand": brand, "model": model,
            "generations": [{
                "code": g["code"], "phase": g["phase"], "years": g["years"], "mobileModel": g["mobileModel"],
                "bodies": sorted(g["bodies"]),
                "engines": {fuel: {cc: sorted(hp) for cc, hp in sorted(sizes.items(), key=lambda x: int(x[0]))}
                            for fuel, sizes in g["engines"].items()},
            } for g in gens.values()],
        })
    with open(os.path.join(ROOT, "data", "model-filter-index.json"), "w", encoding="utf8") as handle:
        json.dump(filter_index, handle, ensure_ascii=False, indent=1)
        handle.write("\n")

    write_markdown(filter_index, rows, problems, today)
    print(f"versions={len(rows)} problems={len(problems)}")
    for problem in problems:
        print("  ", problem)


def write_markdown(filter_index, rows, problems, today):
    unknown_gearbox = sum(1 for r in rows if not r["Коробка"])
    lines = [
        "# Двигатели популярных моделей (с 2010)",
        "",
        f"> Сгенерировано `tools/build-model-engine-table.py` {today} из ultimatespecs.com (B61, этап 3,",
        "> `docs/PROJECT-MOBILE.md` §4.8). Полная таблица по версиям — `data/model-engines.csv`",
        "> (открывается в Excel), для фильтров — `data/model-filter-index.json`. Не править руками.",
        "> Строка = поколение и этап (дорестайлинг / рестайлинг): топливо → объём см³ (л) → мощности в л.с.",
        "> «Годы (проверено)» исправляют источник там, где он пишет «н. в.» про снятую модель.",
        f"> Версий: {len(rows)}. Коробка не определена по названию у {unknown_gearbox} версий",
        "> (в CSV колонка «Коробка: откуда»).",
        "",
    ]
    if problems:
        lines += ["**Не размечено:**", ""] + [f"- {p}" for p in problems] + [""]
    brand = None
    for model in filter_index["models"]:
        if model["brand"] != brand:
            brand = model["brand"]
            lines += ["", f"## {brand}", ""]
        label = next((r["Модель"] for r in rows if r["Марка"] == model["brand"] and r["Модель mobile.de"] in (model["model"], "T5", "T6", "T7")), model["model"])
        lines += [f"### {model['brand']} {label}", "", "| Поколение | Этап | Годы | Двигатели: объём см³ (л) → л.с. |", "|---|---|---|---|"]
        for gen in model["generations"]:
            parts = []
            for fuel, sizes in gen["engines"].items():
                text = "; ".join(
                    (f"{cc} ({int(cc) / 1000:.1f}) → " if int(cc) else "— → ") + ", ".join(map(str, hp))
                    for cc, hp in sizes.items())
                parts.append(f"**{FUEL_RU.get(fuel, fuel)}:** {text}")
            mobile = f" (mobile.de: {gen['mobileModel']})" if gen["mobileModel"] in ("T5", "T6", "T7") else ""
            lines.append(f"| {gen['code']}{mobile} | {gen['phase']} | {gen['years']} | {'<br>'.join(parts) or 'нет данных'} |")
        lines.append("")
    with open(os.path.join(ROOT, "docs", "MODEL-ENGINES.md"), "w", encoding="utf8") as handle:
        handle.write("\n".join(lines).rstrip("\n") + "\n")


if __name__ == "__main__":
    main()
