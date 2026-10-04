#!/usr/bin/env python3
"""Trim levels (European market) of the pinned popular models, per generation (B61 stage 5).

Writes data/model-trims.json (for the page-1 "Wersja" field later),
data/model-trims.csv (Excel: UTF-8 with BOM, ";") and docs/MODEL-TRIMS.md. Collected 2026-10-04 from European sources: Polish and
German Wikipedia (sections "Wersje wyposażeniowe", "Linie stylistyczne",
"Ausstattungslinien"), manufacturer / press pages and Polish catalogues found
by web search; every row names its sources. "check" marks rows (or parts)
taken from knowledge without a source found yet — verify before relying on them.

Fields per row: generation code (as in data/model-filter-index.json), phase,
years, trims (main equipment lines, the names dealers and listings use),
sport (sport models / performance versions often typed into "Wersja"),
special (editions and packages that show up in listings), sources, status.

    python3 tools/build-model-trims.py
"""
import csv
import datetime
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def plw(title):
    return "https://pl.wikipedia.org/wiki/" + title.replace(" ", "_")


def dew(title):
    return "https://de.wikipedia.org/wiki/" + title.replace(" ", "_")


# ultimatespecs model page: some markets' trim names show up in its version names.
US = "https://www.ultimatespecs.com/car-specs/Audi-models/Audi-"


def us(path):
    return "https://www.ultimatespecs.com/car-specs/" + path

OK, CHECK, PART = "проверено", "проверить", "частично проверено"
PRE, FL, ALL = "дорестайлинг", "рестайлинг", "весь выпуск"

# (brand, model, label): [ (code, phase, years, trims, sport, special, sources, status, note) ]
TRIMS = {
    ("Audi", "A3", "A3"): [
        ("8Y", ALL, "2020–н. в.", ["Basis", "advanced", "S line"], ["S3", "RS 3"], ["edition one"],
         [dew("Audi A3 8Y")], OK, "после рестайлинга 2024 линейки те же"),
        ("8V", FL, "2016–2020", ["Basis", "sport", "design"], ["S3", "RS 3"], ["S line (пакет)", "Advance, Pro Line, Pro Line S (Бенилюкс)"],
         [dew("Audi A3 8V"), US + "A3"], OK, "с рестайлинга 2016 Attraction/Ambition/Ambiente заменены на sport/design"),
        ("8V", PRE, "2012–2016", ["Attraction", "Ambition", "Ambiente"], ["S3", "RS 3"], ["S line (пакет)"],
         [plw("Audi A3"), dew("Audi A3 8V")], OK, ""),
        ("8P", ALL, "2003–2013", ["Attraction", "Ambition", "Ambiente"], ["S3", "RS 3"], ["S line (только с Ambition)"],
         [dew("Audi A3 8P")], OK, ""),
    ],
    ("Audi", "A4", "A4"): [
        ("B9", FL, "2019–2024", ["Basis", "advanced", "S line"], ["S4", "RS 4"], ["Business Edition (PL)", "allroad quattro"],
         [dew("Audi A4 B9"), "https://www.audi.pl/pl/business-edition/"], PART, "названия линеек после рестайлинга 2019 — как у A6 C8 и Q5 FY"),
        ("B9", PRE, "2015–2019", ["Basis", "sport", "design"], ["S4", "RS 4"], ["S line (пакет)", "allroad quattro"],
         [dew("Audi A4 B9")], OK, "включая обновление 2018–2019"),
        ("B8", ALL, "2007–2015", ["Attraction", "Ambition", "Ambiente"], ["S4", "RS 4"], ["S line (пакет)", "allroad quattro"],
         [dew("Audi A4 B8")], OK, ""),
    ],
    ("Audi", "A5", "A5"): [
        ("B10", PRE, "2024–н. в.", ["Basis", "advanced", "S line"], ["S5"], ["edition one"],
         [dew("Audi A5 B10")], OK, "новая A5 заменила A4 (седан = A5 Limousine, универсал = A5 Avant)"),
        ("F5", FL, "2020–2024", ["Basis", "advanced", "S line"], ["S5", "RS 5"], ["design selection"],
         ["https://de.motor1.com/news/369291/audi-a5-facelift-2020/"], OK, ""),
        ("F5", PRE, "2016–2020", ["Basis", "sport", "design"], ["S5", "RS 5"], ["S line (пакет)", "Audi design selection"],
         ["https://www.autobild.de/artikel/audi-a5-sportback-f5-gebrauchtwagen-test-23582547.html"], OK, ""),
        ("8T", ALL, "2007–2016", ["Basis"], ["S5", "RS 5"], ["S line (пакет)"],
         [dew("Audi A5 8T")], PART, "отдельных линеек в DE нет, только пакеты"),
    ],
    ("Audi", "A6", "A6"): [
        ("C9", PRE, "2025–н. в.", ["Basis", "advanced", "S line"], ["S6"], ["edition one"],
         ["https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/audi/audi-a6-c9-test/"], OK, ""),
        ("C8", FL, "2023–2025", ["Basis", "advanced", "S line"], ["S6", "RS 6"], ["Business Edition (PL)", "allroad quattro"],
         ["https://de.motor1.com/news/669693/audi-a6-a7-modelljahr-2024/", "https://www.audi.pl/pl/business-edition/"], OK, ""),
        ("C8", PRE, "2018–2023", ["Basis", "sport", "design"], ["S6", "RS 6"], ["S line (пакет)", "design selection", "allroad quattro"],
         ["https://www.autorevue.at/autowelt/audi-a6-limousine-avant-kaufberatung"], OK, ""),
        ("C7", ALL, "2011–2018", ["Basis"], ["S6", "RS 6"], ["S line (пакет)", "allroad quattro"],
         [dew("Audi A6 C7")], PART, "линеек нет, только пакеты"),
        ("C6", ALL, "2004–2011", ["Basis"], ["S6", "RS 6"], ["S line (пакет)", "allroad quattro"],
         [dew("Audi A6 C6")], PART, "линеек нет, только пакеты"),
    ],
    ("Audi", "Q3", "Q3"): [
        ("FJ", PRE, "2025–н. в.", ["Basis", "advanced", "S line"], [], ["Sportback (кузов)"],
         ["https://de.motor1.com/news/762262/audi-q3-suv-2025-neuvorstellung/"], OK, ""),
        ("F3", ALL, "2018–2025", ["Q3", "advanced", "S line"], ["RS Q3"], ["Business Edition (PL)", "Sportback (кузов)"],
         [dew("Audi Q3 F3"), "https://www.audi.pl/pl/business-edition/"], OK, ""),
        ("8U", ALL, "2011–2018", ["Attraction", "Ambition", "Ambiente", "design (с 2015)", "sport (с 2015)"], ["RS Q3"], ["S line (пакет)", "Advance (Бенилюкс)"],
         [US + "Q3"], PART, "по названиям версий ultimatespecs; design/sport — после рестайлинга 2015"),
    ],
    ("Audi", "Q5", "Q5"): [
        ("GU", PRE, "2024–н. в.", ["Basis", "Advanced", "S line"], ["SQ5"], ["edition one"],
         [dew("Audi Q5 GU")], OK, ""),
        ("FY", FL, "2020–2024", ["Basis", "advanced", "S line"], ["SQ5"], ["Business Edition (PL)", "Sportback (кузов)"],
         ["https://www.audi.pl/pl/business-edition/"], OK, ""),
        ("FY", PRE, "2017–2020", ["Basis", "sport", "design"], ["SQ5"], ["S line (пакет)"],
         ["https://de.driven-autowelt.com/audi/q5/2017-2018-preis-sport-design/"], OK, ""),
        ("8R", ALL, "2008–2017", ["Attraction", "Ambition", "Ambiente"], ["SQ5"], ["S line (пакет)", "Advance (Бенилюкс)"],
         [US + "Q5"], PART, "по названиям версий ultimatespecs"),
    ],
    ("Audi", "Q7", "Q7"): [
        ("Q7 III", PRE, "2026–н. в.", [], ["SQ7"], [], [], CHECK, "нет данных"),
        ("4M", ALL, "2015–2025", ["Basis", "design", "sport", "S line"], ["SQ7"], ["Business Edition (PL, S line)"],
         ["https://audi-mediacenter.pl/komunikat,47749,kultowe-audi-q5-i-audi-q7-w-ofercie-specjalnej-audi-business-edition.html", US + "Q7"], PART, "design/sport — до рестайлинга 2019 (названия версий ultimatespecs)"),
        ("4L", ALL, "2005–2015", ["Ambiente", "Ambition"], ["V12 TDI"], ["S line (пакет)", "Advance (Бенилюкс)"],
         [US + "Q7"], PART, "по названиям версий ultimatespecs"),
    ],
    ("BMW", "1", "Seria 1"): [
        ("F70", PRE, "2024–н. в.", ["Basis", "M Sport", "M Sport Pro"], ["M135 xDrive"], ["M Sport Design (пакет)"],
         ["https://www.bimmertoday.de/2024/06/05/bmw-1er-2024-alle-bilder-und-infos-zum-neuen-1er-m135-f70/"], OK, ""),
        ("F40", ALL, "2019–2024", ["Advantage", "Sport Line", "Luxury Line", "M Sport"], ["128ti", "M135i xDrive"], [],
         [dew("BMW F40")], OK, ""),
        ("F20/F21", ALL, "2011–2019", ["Basis", "Sport Line", "Urban Line", "M Sport", "Advantage (с 2015)"], ["M135i", "M140i"], ["Edition Sport", "Edition M Sport Shadow"],
         [dew("BMW F20"), plw("BMW serii 1")], PART, "M Sport с 2012, Advantage с рестайлинга 2015"),
        ("E81/E87", ALL, "2004–2013", ["Basis"], ["130i", "135i", "1er M Coupé"], ["M Sportpaket", "Edition Sport", "Edition Lifestyle"],
         ["https://www.bimmertoday.de/2010/01/17/sport-lifestyle-exclusive-drei-editionsmodelle-fur-die-3er-reihe/"], PART, "линеек нет: базовая + пакеты/спецсерии"),
    ],
    ("BMW", "3", "Seria 3"): [
        ("G20", FL, "2022–н. в.", ["Basis", "M Sport", "M Sport Pro"], ["M340i", "M340d", "M3"], [],
         [dew("BMW G20")], OK, "Sport Line и Luxury Line убраны"),
        ("G20", PRE, "2019–2022", ["Advantage", "Sport Line", "Luxury Line", "M Sport"], ["M340i", "M340d", "M3"], [],
         [plw("BMW serii 3"), dew("BMW G20")], OK, ""),
        ("F30", ALL, "2012–2019", ["Basis", "Advantage", "Sport Line", "Modern Line", "Luxury Line", "M Sport"], ["335i", "340i", "M3"], ["Edition Sport Line Shadow", "Edition M Sport Shadow"],
         [plw("BMW serii 3"), dew("BMW F30")], OK, "одинаково до и после рестайлинга 2015 (Modern Line до 2016)"),
        ("E90", ALL, "2005–2012", ["Basis"], ["335i", "335d", "M3"], ["M Sportpaket", "Edition Sport", "Edition Lifestyle", "Edition Exclusive"],
         ["https://www.bimmertoday.de/2010/01/17/sport-lifestyle-exclusive-drei-editionsmodelle-fur-die-3er-reihe/"], OK, "линеек нет: базовая + пакеты/спецсерии 2010"),
    ],
    ("BMW", "4", "Seria 4"): [
        ("G22", ALL, "2020–н. в.", ["Basis", "M Sport", "M Sport Pro"], ["M440i", "M440d", "M4"], [],
         ["https://www.press.bmwgroup.com/deutschland/article/detail/T0461142DE/bmw-modellpflege-massnahmen-zum-herbst-2026"], PART, ""),
        ("F32", ALL, "2013–2020", ["Advantage", "Sport Line", "Modern Line", "Luxury Line", "M Sport"], ["435i", "440i", "M4"], [],
         ["https://www.mobile.de/auto/bmw/4er/2013/coupe/modell/", dew("BMW F32")], OK, ""),
    ],
    ("BMW", "5", "Seria 5"): [
        ("G60", PRE, "2023–н. в.", ["Basis", "M Sport", "M Sport Pro"], ["M5", "i5 M60"], [],
         ["https://www.7-forum.com/news/BMW-5er-Limousine-(G60-ab-2023)-Innenrau-10975.html"], OK, ""),
        ("G30", FL, "2020–2023", ["Basis", "Luxury Line", "M Sport"], ["M550i", "M5"], ["Edition M Sport"],
         ["https://www.bimmertoday.de/2020/05/27/bmw-5er-facelift-2020-alle-bilder-und-infos-zum-g30-lci/"], OK, "Sport Line после рестайлинга убрана"),
        ("G30", PRE, "2017–2020", ["Sport Line", "Luxury Line", "M Sport"], ["M550i", "M550d", "M5"], [],
         ["https://www.bmwblog.com/2016/10/14/lines-packages-new-bmw-5-series/"], OK, ""),
        ("F10", ALL, "2010–2017", ["Basis", "Modern Line", "Luxury Line", "Sport Line", "M Sport"], ["550i", "M550d", "M5"], [],
         ["https://f10.bimmerpost.com/forums/showthread/1399336/confused-by-the-lines?p=21897377"], PART, "Sport Line с 2013"),
        ("E60", ALL, "2003–2010", ["Basis"], ["550i", "M5"], ["M Sportpaket", "Edition Sport", "Edition Lifestyle"], [], CHECK, "линеек нет: базовая + пакеты"),
    ],
    ("BMW", "X1", "X1"): [
        ("U11", PRE, "2022–н. в.", ["Basis", "xLine", "M Sport"], ["M35i xDrive"], [], [dew("BMW U11")], OK, ""),
        ("F48", ALL, "2015–2022", ["Advantage", "Sport Line", "xLine", "M Sport"], [], [],
         ["https://www.mobile.de/magazin/artikel/bmw-x1-f48-kaufberatung-35646"], OK, ""),
        ("E84", ALL, "2009–2015", ["Basis", "xLine", "Sport Line", "M Sport"], [], [],
         ["https://e84.xbimmers.com/forums/showthread.php?t=775070"], PART, "линии с рестайлинга 2012"),
    ],
    ("BMW", "X3", "X3"): [
        ("G45", PRE, "2024–н. в.", ["Basis", "xLine", "M Sport", "M Sport Pro"], ["M50 xDrive"], [],
         ["https://www.bmw.pl/pl/all-models/x-series/x3/bmw-x3.html"], OK, ""),
        ("G01", ALL, "2017–2024", ["Advantage", "xLine", "Luxury Line", "M Sport"], ["M40i", "M40d", "X3 M"], [],
         ["https://www.angurten.de/is/ausstattung/1732-971-X3+2017-xLine"], OK, ""),
        ("F25", ALL, "2010–2017", ["Basis", "Advantage", "xLine", "M Sport"], ["xDrive35d"], [],
         ["https://www.press.bmwgroup.com/deutschland/photo/detail/P90142837/der-neue-bmw-x3-mit-xline-ausstattungspaket-02-2014",
          "https://www.bimmertoday.de/2014/02/07/2014-bmw-x3-m-sportpaket-f25-lci-facelift-m-paket/"], OK, "xLine и M Sport — с рестайлинга 2014"),
        ("E83", ALL, "2003–2010", ["Basis"], ["3.0sd"], ["M Sportpaket"], [], CHECK, ""),
    ],
    ("BMW", "X5", "X5"): [
        ("G05", ALL, "2018–н. в.", ["Basis", "xLine", "M Sport", "M Sport Pro (рестайлинг)"], ["M50i", "M50d", "M60i", "X5 M"], [],
         ["https://www.7-forum.com/news/Der-neue-BMW-X5-Innenraum-Ausstattung-8484.html"], PART, "M Sport Pro — по знанию"),
        ("F15", ALL, "2013–2018", ["Basis", "Design Pure Experience", "Design Pure Excellence", "M Sport"], ["M50d", "X5 M"], [],
         ["https://www.bimmertoday.de/2013/05/31/2013-bmw-x5-f15-schluessel-m-sportpaket-design-pure-excellence-experience/"], OK, ""),
        ("E70", ALL, "2006–2013", ["Basis"], ["M50d", "X5 M"], ["M Sportpaket"],
         ["https://www.7-forum.com/news/2010/X5_LCI/steckbrief.php"], PART, "линеек нет: базовая + пакеты"),
    ],
    ("Ford", "C-Max", "C-Max"): [
        ("Mk2", ALL, "2010–2019", ["Ambiente", "Trend", "Titanium"], [], ["Edition", "Business Edition", "Grand C-Max (кузов)"],
         [plw("Ford C-Max"), dew("Ford C-MAX")], OK, ""),
        ("Mk1", ALL, "2003–2010", ["Ambiente", "Trend", "Ghia", "Titanium"], [], ["Style", "Fun X"], [plw("Ford C-Max"), dew("Ford C-MAX")], OK, ""),
    ],
    ("Ford", "Fiesta", "Fiesta"): [
        ("Mk8", ALL, "2017–2023", ["Trend", "Titanium", "ST-Line", "ST-Line X", "Active", "Vignale"], ["ST"], ["Cool & Connect"],
         [plw("Ford Fiesta")], OK, ""),
        ("Mk7", ALL, "2008–2017", ["Ambiente", "Trend", "Ghia", "Sport", "Titanium"], ["ST", "ST200"], ["Titanium Individual"],
         [plw("Ford Fiesta")], OK, ""),
    ],
    ("Ford", "Focus", "Focus"): [
        ("Mk4", ALL, "2018–2025", ["Trend", "Titanium", "Titanium X", "ST-Line", "ST-Line X", "Active", "Active X", "Vignale"], ["ST"], ["Cool & Connect"],
         [plw("Ford Focus"), dew("Ford Focus")], OK, ""),
        ("Mk3", ALL, "2010–2018", ["Ambiente", "Trend", "Titanium", "Trend Sport", "ST-Line (с 2016)"], ["ST", "RS"], ["Edition", "SYNC Edition", "Business", "Champions Edition"],
         [plw("Ford Focus"), dew("Ford Focus")], OK, ""),
        ("Mk2", ALL, "2004–2010", ["Ambiente", "Trend", "Ghia", "Titanium", "Sport"], ["ST", "RS"], ["Style", "Fun X"],
         [plw("Ford Focus"), dew("Ford Focus")], OK, ""),
    ],
    ("Ford", "Kuga", "Kuga"): [
        ("Mk3", ALL, "2019–н. в.", ["Trend", "Titanium", "Titanium X", "ST-Line", "ST-Line X", "Vignale", "Active (рестайлинг)"], [], ["Cool & Connect"],
         [plw("Ford Kuga"), dew("Ford Kuga")], PART, ""),
        ("Mk2", ALL, "2012–2019", ["Trend", "Titanium", "Titanium Plus", "ST-Line (с 2016)", "Vignale (с 2016)"], [], ["Cool & Connect", "Black & Silver"],
         [plw("Ford Kuga"), dew("Ford Kuga")], OK, ""),
        ("Mk1", ALL, "2008–2012", ["Trend", "Titanium", "Titanium S"], [], ["Individual"], [plw("Ford Kuga"), dew("Ford Kuga")], OK, ""),
    ],
    ("Ford", "Mondeo", "Mondeo"): [
        ("Mk5", ALL, "2014–2022", ["Ambiente", "Trend", "Titanium", "ST-Line", "Vignale"], [], ["Edition", "Gold Edition", "Silver X", "Gold X", "Business Edition"],
         [plw("Ford Mondeo")], OK, ""),
        ("Mk4", ALL, "2007–2014", ["Ambiente", "Trend", "Ghia", "Ghia X", "Titanium", "Titanium X", "Titanium S"], [], ["Business Edition", "Champions Edition"],
         [plw("Ford Mondeo")], OK, ""),
    ],
    ("Ford", "S-Max", "S-Max"): [
        ("Mk2", ALL, "2015–2023", ["Trend", "Titanium", "ST-Line", "Vignale"], [], [],
         ["https://moto.infor.pl/testy-aut/poradniki-kupujacego/277285,Ford-SMax-jakiego-wybrac-Poradnik-kupujacego.html"], OK, ""),
        ("Mk1", ALL, "2006–2015", ["Ambiente", "Trend", "Titanium", "Titanium S", "Titanium X"], [], ["Gold X"], [plw("Ford S-Max")], OK, ""),
    ],
    ("Mercedes-Benz", "A", "Klasa A"): [
        ("W177", FL, "2022–н. в.", ["Style", "Progressive", "AMG Line"], ["A 35 AMG", "A 45 S AMG"], ["Advanced / Premium (пакеты)"],
         ["https://www.mercedes-fans.de/magazin/sternstunde/die-neue-a-klasse-limousine-kompakte-premium-limousine.13475"], PART, ""),
        ("W177", PRE, "2018–2022", ["Basis", "Style", "Progressive", "AMG Line"], ["A 35 AMG", "A 45 AMG"], ["Edition 1"],
         [plw("Mercedes-Benz klasy A"), dew("Mercedes-Benz Baureihe 177")], OK, ""),
        ("W176", ALL, "2012–2018", ["Basis", "Style", "Urban", "AMG Line (до 05.2013 AMG Sport)"], ["A 250 Sport", "A 45 AMG"], ["Edition 1", "Motorsport Edition"],
         [plw("Mercedes-Benz klasy A"), dew("Mercedes-Benz W 176")], OK, ""),
        ("W169", ALL, "2004–2012", ["Classic", "Elegance", "Avantgarde"], [], [], [plw("Mercedes-Benz klasy A"), dew("Mercedes-Benz Baureihe 169")], OK, ""),
    ],
    ("Mercedes-Benz", "C", "Klasa C"): [
        ("W206", PRE, "2021–н. в.", ["Basis", "Avantgarde", "AMG Line", "AMG Line Plus"], ["C 43 AMG", "C 63 S E Performance"], [],
         [dew("Mercedes-Benz Baureihe 206")], OK, ""),
        ("W205", ALL, "2014–2021", ["Basis", "Avantgarde", "Exclusive", "AMG Line"], ["C 43 AMG", "C 63 AMG"], ["Night-Paket"],
         [plw("Mercedes-Benz klasy C"), dew("Mercedes-Benz Baureihe 205")], OK, "одинаково до и после рестайлинга 2018"),
        ("W204", ALL, "2007–2014", ["Classic", "Elegance", "Avantgarde"], ["C 63 AMG"], ["AMG Sportpaket", "Edition C"],
         [dew("Mercedes-Benz Baureihe 204")], OK, ""),
    ],
    ("Mercedes-Benz", "E", "Klasa E"): [
        ("W214", PRE, "2023–н. в.", ["Avantgarde", "Exclusive", "AMG Line"], ["E 53 AMG"], [], [dew("Mercedes-Benz Baureihe 214")], OK, ""),
        ("W213", ALL, "2016–2023", ["Basis", "Avantgarde", "Exclusive", "AMG Line"], ["E 43 AMG", "E 53 AMG", "E 63 AMG"], ["All-Terrain (кузов)"],
         ["https://www.auto-motor-und-sport.de/news/mercedes-e-klasse-w213-2016-infos-preise-daten/"], OK, "одинаково до и после рестайлинга 2020"),
        ("W212", ALL, "2009–2016", ["Basis (Classic)", "Elegance", "Avantgarde"], ["E 63 AMG"], ["AMG Sportpaket", "Exclusiv-Paket"],
         [dew("Mercedes-Benz Baureihe 212")], OK, ""),
    ],
    ("Mercedes-Benz", "S", "Klasa S"): [
        ("W223", ALL, "2020–н. в.", ["Basis", "AMG Line", "AMG Line Premium", "AMG Line Premium Plus", "Executive"], ["S 63 E Performance", "Maybach"], [],
         [plw("Mercedes-Benz klasy S")], PART, "названия из польской гаммы"),
        ("W222", ALL, "2013–2020", ["Basis", "AMG Line", "AMG Line Plus (с 2017)"], ["S 63 AMG", "S 65 AMG", "Maybach"], ["Exclusiv-Paket"],
         ["https://mbpassion.de/2017/05/blick-auf-das-amg-line-plus-paket-der-s-klasse/"], OK, ""),
        ("W221", ALL, "2005–2013", ["Basis"], ["S 63 AMG", "S 65 AMG"], ["AMG Sportpaket"], [], CHECK, "линеек нет"),
    ],
    ("Mercedes-Benz", "CLA", "CLA"): [
        ("C178", PRE, "2025–н. в.", ["Progressive", "AMG Line", "AMG Line Plus"], [], ["Advanced", "Advanced Plus", "Premium", "Premium Plus (пакеты)"],
         [plw("Mercedes-Benz CLA")], PART, ""),
        ("C118", ALL, "2019–2025", ["Basis", "Progressive", "AMG Line"], ["CLA 35 AMG", "CLA 45 S AMG"], ["Edition 1", "Edition 2020", "Shooting Brake (кузов)"],
         ["https://mbpassion.de/2019/03/blick-auf-den-cla-in-der-progressive-line-der-baureihe-c118/", "https://mbpassion.de/2023/01/so-sieht-die-cla-modellpflege-aus-alle-infos-details/"], OK, ""),
        ("C117", ALL, "2013–2019", ["Basis", "Urban", "AMG Line"], ["CLA 250 Sport", "CLA 45 AMG"], ["Edition 1", "Shooting Brake (кузов)"],
         [plw("Mercedes-Benz CLA"), dew("Mercedes-Benz Baureihe 117")], OK, ""),
    ],
    ("Mercedes-Benz", "GLC", "GLC"): [
        ("X540 (электро)", PRE, "2026–н. в.", [], [], [], [], CHECK, "нет данных"),
        ("X254", ALL, "2022–н. в.", ["Avantgarde", "AMG Line"], ["GLC 43 AMG", "GLC 63 S E Performance"], ["Night-Paket", "Coupé (кузов)"],
         ["https://media.daimler.com/marsMediaSite/en/instance/ko/Mercedes-Benz-GLC---The-full-spectrum-model-range-and-equipment.xhtml?oid=9905372"], OK, ""),
        ("X253", ALL, "2015–2022", ["Basis", "Exclusive", "AMG Line", "Offroad"], ["GLC 43 AMG", "GLC 63 AMG"], ["Night-Paket", "Coupé (кузов)"],
         ["https://mbpassion.de/2015/06/details-zu-den-modellprogramm-des-glc-x156/"], OK, ""),
    ],
    ("Mercedes-Benz", "GLE", "GLE"): [
        ("V167", ALL, "2018–н. в.", ["Basis", "AMG Line"], ["GLE 53 AMG", "GLE 63 AMG"], ["Coupé (кузов)", "Night-Paket"],
         ["https://mbpassion.de/2018/12/blick-auf-die-amg-line-des-neuen-gle-im-detail-v167/"], OK, ""),
        ("W166", ALL, "2015–2019", ["Basis", "AMG Line", "Exclusive (интерьер)"], ["GLE 43 AMG", "GLE 63 AMG"], ["Coupé (кузов C292)"],
         ["https://www.mercedes-fans.de/load/file/38145/5312964/preisliste-gle-150423.pdf"], OK, "до 2015 — M-Klasse (ML)"),
    ],
    ("Peugeot", "208", "208"): [
        ("208 II", ALL, "2019–н. в.", ["Like", "Active", "Allure", "GT Line", "GT"], [], ["Active Pack", "Allure Pack", "GT Pack"],
         [plw("Peugeot 208"), dew("Peugeot 208 II")], OK, "после рестайлинга 2023 — Active, Allure, GT"),
        ("208 I", ALL, "2012–2019", ["Access", "Like", "Active", "Style", "Allure", "GT Line"], ["GTi"], ["XY", "Feline", "Roland Garros"],
         [plw("Peugeot 208"), dew("Peugeot 208 I"), us("Peugeot-models/Peugeot-208")], OK, ""),
    ],
    ("Peugeot", "308", "308"): [
        ("308 III", ALL, "2021–н. в.", ["Active", "Allure", "GT", "Style (с 2025)", "GT Exclusive (с 2025)"], [], ["Active Pack", "Allure Pack", "GT Pack", "Business"],
         ["https://www.media.stellantis.com/pl-pl/peugeot/press/nowy-peugeot-308-i-peugeot-308-sw-stworzony-z-mysla-o-przyjemnosci-1"], OK, ""),
        ("308 II", ALL, "2013–2021", ["Access", "Active", "Style", "Allure", "GT Line"], ["GT", "GTi"], [],
         [dew("Peugeot 308 II"), us("Peugeot-models/Peugeot-308")], OK, ""),
        ("308 I", ALL, "2007–2013", ["Access", "Active", "Allure"], [], ["Confort, Premium, Sport (PL, до 2011)", "Filou, Tendance, Premium (DE, до 2011)"],
         [dew("Peugeot 308 I"), us("Peugeot-models/Peugeot-308")], OK, "Access/Active/Allure — с рестайлинга 2011"),
    ],
    ("Peugeot", "508", "508"): [
        ("508 II", ALL, "2018–2025", ["Active", "Allure", "GT Line", "GT"], ["PSE (Peugeot Sport Engineered)"], [],
         ["https://autoblog.spidersweb.pl/peugeot-508-ceny-polska"], OK, ""),
        ("508 I", ALL, "2010–2018", ["Access", "Active", "Style", "Allure", "GT Line", "GT"], [], ["Business", "RXH (кузов)"],
         [dew("Peugeot 508 I"), us("Peugeot-models/Peugeot-508")], OK, ""),
    ],
    ("Peugeot", "2008", "2008"): [
        ("2008 II", ALL, "2019–н. в.", ["Active", "Allure", "GT Line", "GT"], [], ["Active Pack", "Allure Pack"], [plw("Peugeot 2008")], OK, "после рестайлинга 2023 — Active, Allure, GT"),
        ("2008 I", ALL, "2013–2019", ["Access", "Active", "Style", "Allure", "GT Line"], [], ["Urban Cross", "Feline"], [plw("Peugeot 2008"), dew("Peugeot 2008 I")], OK, ""),
    ],
    ("Peugeot", "3008", "3008"): [
        ("3008 III", PRE, "2023–н. в.", ["Allure", "GT", "Allure Plus (с 2026)", "GT Plus (с 2026)"], [], ["Business"],
         ["https://autogaleria.pl/peugeot-3008-2024-cennik-wersje-wyposazenie"], OK, ""),
        ("3008 II", ALL, "2016–2024", ["Access", "Active", "Allure", "GT Line", "GT"], [], ["Active Pack", "Allure Pack", "GT Pack", "Road Trip"],
         ["https://autokult.pl/peugeot-3008-i-5008-po-liftingu-polskie-ceny-modeli,6809443123103873a"], OK, ""),
        ("3008 I", ALL, "2009–2016", ["Access", "Active", "Allure", "Business Line", "Premium", "Sport", "Style"], [], [],
         [dew("Peugeot 3008"), us("Peugeot-models/Peugeot-3008")], OK, "Premium/Sport/Style — польская гамма до рестайлинга 2013"),
    ],
    ("Peugeot", "5008", "5008"): [
        ("5008 III", PRE, "2024–н. в.", ["Allure", "GT", "Allure Plus (с 2026)", "GT Plus (с 2026)"], [], ["Business"],
         ["https://francuskie.pl/peugeot-5008-drozszy-4-950-zl-cennik-znika-wersja/"], OK, ""),
        ("5008 II", ALL, "2017–2024", ["Active", "Allure", "GT Line", "GT"], [], ["Road Trip", "Allure Pack"],
         ["https://autokult.pl/peugeot-3008-i-5008-po-liftingu-polskie-ceny-modeli,6809443123103873a"], OK, ""),
        ("5008 I", ALL, "2009–2017", ["Access", "Active", "Allure", "Trendy (PL)", "Premium (PL)", "Sport", "Style"], [], ["Family (PL)", "Business"],
         [plw("Peugeot 5008"), us("Peugeot-models/Peugeot-5008")], OK, ""),
    ],
    ("Renault", "Captur", "Captur"): [
        ("Captur II", FL, "2024–н. в.", ["evolution", "techno", "esprit Alpine"], [], ["E-Tech (гибрид)"],
         ["https://www.caradisiac.com/prix-renault-captur-2024-le-suv-restyle-debarque-a-partir-de-24-900-eur-208194.htm"], OK, ""),
        ("Captur II", PRE, "2019–2024", ["Life", "Zen", "Intens", "R.S. Line", "Initiale Paris"], [], ["Business", "E-Tech (гибрид)"],
         ["https://www.largus.fr/actualite-automobile/renault-captur-2021-la-version-rs-line-arrive-au-catalogue-10520393.html"], OK, ""),
        ("Captur I", ALL, "2013–2019", ["Life", "Alize", "Zen", "Intens", "Initiale Paris (с 2017)"], [], ["XMod", "Helly Hansen", "Red Edition"],
         [plw("Renault Captur")], OK, ""),
    ],
    ("Renault", "Clio", "Clio"): [
        ("Clio VI", PRE, "2025–н. в.", ["evolution", "techno", "esprit Alpine"], [], [], [plw("Renault Clio")], OK, ""),
        ("Clio V", ALL, "2019–2025", ["Life", "Zen", "Intens", "R.S. Line", "Initiale Paris"], [], ["Business", "Lutecia", "E-Tech (гибрид)"],
         [plw("Renault Clio"), dew("Renault Clio V")], OK, "после рестайлинга 2023 — evolution, techno, esprit Alpine"),
        ("Clio IV", ALL, "2012–2019", ["Authentique / Life", "Expression / Zen", "Dynamique", "Limited", "Intens", "GT", "Initiale Paris"], ["R.S.", "R.S. Trophy"], ["Graphite", "Techno Feel"],
         [plw("Renault Clio")], OK, ""),
        ("Clio III", ALL, "2005–2014", ["Authentique", "Expression", "Dynamique", "Luxe", "Privilège"], ["R.S. 200", "Gordini"], ["Night & Day", "TomTom Edition"],
         [plw("Renault Clio"), dew("Renault Clio III")], OK, ""),
        ("Clio II", ALL, "1998–2012", ["Authentique", "Expression", "Dynamique"], [], ["Storia", "Campus"], [plw("Renault Clio")], OK, "после 2009 продавался как Clio Storia / Campus"),
    ],
    ("Renault", "Kadjar", "Kadjar"): [
        ("Kadjar I", ALL, "2015–2022", ["Life", "Zen", "Intens", "Bose"], [], ["Black Edition"],
         ["https://www.auto-swiat.pl/wiadomosci/aktualnosci/renault-kadjar-wjezdza-do-polskich-salonow/p36yjmz"], OK, ""),
    ],
    ("Renault", "Megane", "Megane"): [
        ("Mégane IV", ALL, "2016–2024", ["Life", "Zen", "Intens", "Limited", "GT Line", "R.S. Line"], ["GT", "R.S.", "R.S. Trophy"], ["Bose", "Business"],
         [plw("Renault Mégane")], OK, ""),
        ("Mégane III", ALL, "2008–2016", ["Authentique", "Expression", "Dynamique", "Privilège", "Luxe", "Limited", "GT Line"], ["GT", "R.S."], ["Bose Edition", "TomTom", "Night & Day"],
         [plw("Renault Mégane"), dew("Renault Mégane III")], OK, ""),
    ],
    ("Renault", "Scenic", "Scenic"): [
        ("Scénic V (E-Tech, электро)", PRE, "2024–н. в.", ["evolution", "techno", "iconic", "esprit Alpine"], [], [],
         ["https://nowyosobowy.pl/strefa-wiedzy/prezentacja-renault-scenic-e-tech-electric-w-polsce-dane-techniczne-wersje-wyposazenie-ceny"], OK, ""),
        ("Scénic IV", ALL, "2016–2022", ["Life", "Zen", "Intens", "Initiale Paris"], [], ["Bose", "Black Edition", "Grand Scénic (кузов)"], [plw("Renault Scénic")], OK, ""),
        ("Scénic III", ALL, "2009–2016", ["Authentique", "Expression", "Privilège", "Life", "Limited"], [], ["XMOD", "Bose", "TomTom", "Grand Scénic (кузов)"], [plw("Renault Scénic")], OK, ""),
    ],
    ("Renault", "Trafic", "Trafic"): [
        ("Trafic III", ALL, "2014–н. в.", ["Pack Clim", "Equilibre", "SpaceClass"], [], ["SpaceClass Escapade", "Combi / Passenger (кузов)"],
         ["https://www.renault.pl/samochody-osobowe/trafic-combi/wyposazenie.html?gradeCode=ENS_ACLASS00M$SERIESPE3"], PART, "для пассажирского Trafic"),
    ],
    ("Skoda", "Fabia", "Fabia"): [
        ("Fabia IV", ALL, "2021–н. в.", ["Active", "Ambition", "Style", "Monte Carlo", "Essence", "Selection", "Drive"], ["130 Sport"], ["Edition 130"],
         [plw("Škoda Fabia")], OK, "Essence/Selection — новая схема с 2024"),
        ("Fabia III", ALL, "2014–2021", ["Active", "Ambition", "Style", "Monte Carlo"], [], ["Edition", "Black Edition"], [plw("Škoda Fabia")], OK, ""),
        ("Fabia II", ALL, "2007–2014", ["Classic", "Comfort", "Ambiente", "Elegance", "Active Plus", "Ambition", "Style", "Sport", "Sportline", "Scout", "Monte Carlo"], ["RS"], ["Greenline", "Monnari"],
         [plw("Škoda Fabia")], OK, ""),
    ],
    ("Skoda", "Kamiq", "Kamiq"): [
        ("Kamiq I", FL, "2024–н. в.", ["Essence", "Selection", "Monte Carlo"], [], [],
         ["https://autokatalog.pl/blog/2024/nowa-skoda-kamiq-2024-cena-wersje-wyposazenie"], OK, ""),
        ("Kamiq I", PRE, "2019–2024", ["Active", "Ambition", "Style", "Monte Carlo"], [], ["Scoutline"],
         ["https://www.otomoto.pl/news/skoda-kamiq-uzywana-opinie-test", dew("Škoda Kamiq")], OK, ""),
    ],
    ("Skoda", "Karoq", "Karoq"): [
        ("Karoq I", ALL, "2017–н. в.", ["Active", "Ambition", "Style", "Sportline", "Scout"], [], ["Business"],
         ["https://vwzone.pl/skoda-karoq-wersje-wyposazenia-dane-techniczne-silniki/", dew("Škoda Karoq")], OK, "после рестайлинга 2022 — Ambition, Style, Sportline (+ Selection с 2024)"),
    ],
    ("Skoda", "Kodiaq", "Kodiaq"): [
        ("Kodiaq II", PRE, "2024–н. в.", ["Essence", "Selection", "Sportline", "Laurin & Klement"], ["RS"], [], [plw("Škoda Kodiaq")], OK, ""),
        ("Kodiaq I", ALL, "2016–2024", ["Active", "Ambition", "Style", "Sportline", "Scout", "Laurin & Klement"], ["RS"], ["Business"],
         [plw("Škoda Kodiaq"), us("Skoda-models/Skoda-Kodiaq")], OK, ""),
    ],
    ("Skoda", "Octavia", "Octavia"): [
        ("Octavia IV", FL, "2024–н. в.", ["Essence", "Selection", "Sportline"], ["RS"], [],
         ["https://autokatalog.pl/blog/2024/nowa-skoda-octavia-2024-cena-wersje-essence-i-rs"], OK, ""),
        ("Octavia IV", PRE, "2020–2024", ["Active", "Ambition", "Style", "Sportline", "Scout", "Laurin & Klement"], ["RS"], [], [plw("Škoda Octavia"), dew("Škoda Octavia IV")], OK, ""),
        ("Octavia III", ALL, "2013–2020", ["Active", "Ambition", "Elegance", "Style", "Laurin & Klement", "Scout"], ["RS"], ["Edition", "Joy", "GreenLine"],
         [plw("Škoda Octavia"), dew("Škoda Octavia III")], OK, ""),
        ("Octavia II", ALL, "2004–2013", ["Classic", "Ambiente", "Elegance", "Laurin & Klement", "Active (с 2011)", "Ambition (с 2011)"], ["RS"], ["Scout", "Mint", "Edition 100", "Executive"],
         [plw("Škoda Octavia"), dew("Škoda Octavia II")], OK, ""),
    ],
    ("Skoda", "Superb", "Superb"): [
        ("Superb IV", PRE, "2024–н. в.", ["Essence", "Selection", "Laurin & Klement", "Sportline"], [], [], [plw("Škoda Superb")], OK, ""),
        ("Superb III", ALL, "2015–2023", ["Active", "Ambition", "Style", "Sportline", "Laurin & Klement", "Scout (с 2019)"], [], ["iV (плагин-гибрид)"],
         [plw("Škoda Superb"), dew("Škoda Superb III")], OK, ""),
        ("Superb II", ALL, "2008–2015", ["Active", "Comfort", "Ambition", "Elegance", "Laurin & Klement"], [], ["Business", "Outdoor", "GreenLine", "Exclusive"],
         [plw("Škoda Superb"), dew("Škoda Superb II")], OK, ""),
    ],
    ("Toyota", "Auris", "Auris"): [
        ("E18", ALL, "2012–2018", ["Life", "Active", "Premium", "Dynamic", "Prestige", "Selection (с 2017)"], [], ["Comfort, Edition-S, Executive (DE)", "Advance, Business (Бенилюкс)"],
         [plw("Toyota Auris"), dew("Toyota Auris")], OK, ""),
        ("E15", ALL, "2006–2012", ["Terra", "Luna", "Sol", "Premium", "Dynamic", "Prestige"], ["TS"], ["Active, Advance (Бенилюкс)"],
         [plw("Toyota Auris"), us("Toyota-models/Toyota-Auris")], OK, ""),
    ],
    ("Toyota", "Avensis", "Avensis"): [
        ("T27", ALL, "2009–2018", ["Luna", "Sol", "Sol Plus", "Premium", "Prestige", "Active", "Selection (с 2017)"], [], ["Sprint (2016)", "Advance, Executive, Business (Бенилюкс)"],
         [plw("Toyota Avensis")], OK, ""),
    ],
    ("Toyota", "C-HR", "C-HR"): [
        ("C-HR II", PRE, "2023–н. в.", ["Comfort", "Style", "Executive", "GR Sport"], [], ["Premiere Edition"],
         ["https://www.toyotanews.eu/pl/aktualnosci/2906-item-nowa-toyota-c-hr-od-139-900-zl-szesc-wersji-wyposazenia-do-wyboru"], OK, ""),
        ("C-HR I", ALL, "2016–2023", ["Active", "Premium", "Dynamic", "Prestige", "Style (рестайлинг)", "Executive (рестайлинг)", "GR Sport (с 2021)"], [], ["Prime Edition"],
         ["https://www.auto-swiat.pl/wiadomosci/aktualnosci/toyota-c-hr-w-sprzedazy-znamy-ceny/bg2t4hk"], PART, ""),
    ],
    ("Toyota", "Camry", "Camry"): [
        ("XV70", ALL, "2019–2024", ["Comfort", "Prestige", "Executive"], [], ["Comfort + Business", "Executive + VIP"],
         ["https://spidersweb.pl/autoblog/toyota-camry-w-polsce-ceny-specyfikacja/"], OK, "в ЕС вернулась в 2019"),
        ("XV50 (вне ЕС)", ALL, "2011–2017", [], [], [], [], OK, "в ЕС не продавалась"),
        ("XV40 (вне ЕС)", ALL, "2006–2011", [], [], [], [], OK, "в ЕС не продавалась"),
    ],
    ("Toyota", "Corolla", "Corolla"): [
        ("E21", ALL, "2018–н. в.", ["Active", "Comfort", "Style", "Executive", "GR Sport"], [], ["TREK", "Touring Sports (кузов)"],
         ["https://autokatalog.pl/toyota/corolla/xii-e210/wyposazenie", "https://www.autocentrum.pl/newsy/toyota-corolla-hatchback-wersje-wyposazenia/"], OK, ""),
        ("E15", ALL, "2006–2013", ["Terra", "Luna", "Sol", "Premium", "Prestige"], [], [], [plw("Toyota Corolla")], OK, "седан для Европы"),
    ],
    ("Toyota", "RAV 4", "RAV 4"): [
        ("XA50", ALL, "2018–2025", ["Active", "Comfort", "Style", "Executive", "Selection", "Adventure", "GR Sport"], [], [],
         ["https://www.autocentrum.pl/newsy/informacje-prasowe/toyota-rav4-wymiary-i-wersje-wyposazenia/"], OK, ""),
        ("XA40", ALL, "2012–2018", ["Active", "Premium", "Style", "Prestige", "Selection (с 2017)"], [], ["Premium Hybrid", "Style Hybrid", "Prestige Hybrid", "Advance, Executive (Бенилюкс)"],
         [plw("Toyota RAV4")], OK, ""),
        ("XA30", ALL, "2005–2012", ["Luna", "Sol", "Prestige"], [], ["Prestige + Navi", "Advance, Executive (Бенилюкс)"],
         ["https://autokatalog.pl/toyota/rav4/iii"], OK, ""),
    ],
    ("Toyota", "Yaris", "Yaris"): [
        ("XP21", ALL, "2020–н. в.", ["Active", "Comfort", "Style", "Executive", "GR Sport"], ["GR Yaris"], ["Elegant (DE)"],
         [dew("Toyota Yaris (XP21)")], PART, "польская гамма — по знанию"),
        ("XP13", ALL, "2011–2020", ["Terra", "Luna", "Sol", "Premium", "Prestige", "Life (с 2014)", "Active (с 2014)", "Dynamic", "Style", "Selection"], ["GRMN"], ["Cool, Club, Executive (DE)", "Advance (Бенилюкс)"],
         [plw("Toyota Yaris"), dew("Toyota Yaris (XP13)")], OK, "до 2014: Terra/Luna/Sol/Premium/Prestige; после 2014 и 2017: Life/Active/Premium/Dynamic/Selection"),
        ("XP9", ALL, "2005–2011", ["Terra", "Luna", "Sol"], ["TS"], [],
         ["https://www.autocentrum.pl/publikacje/testy-aut-uzywanych/japonska-ikona-toyota-yaris-2005-2011/"], OK, ""),
    ],
    ("Volvo", "S60", "S60"): [
        ("S60 III", ALL, "2018–2024", ["Momentum", "Inscription", "R-Design", "Plus Bright", "Plus Dark", "Ultimate Bright", "Ultimate Dark"], ["Polestar Engineered"], [],
         [plw("Volvo S60")], PART, "Momentum/Inscription/R-Design до 2021, Plus/Ultimate после"),
        ("S60 II", ALL, "2010–2018", ["Base", "Kinetic", "Momentum", "Summum", "R-Design", "Inscription"], ["Polestar"], ["Dynamic Edition", "Cross Country"],
         [plw("Volvo S60"), dew("Volvo S60")], OK, ""),
        ("S60 I", ALL, "2000–2010", ["Kinetic", "Momentum", "Summum"], ["S60 R"], [], [plw("Volvo S60")], PART, ""),
    ],
    ("Volvo", "V40", "V40"): [
        ("V40 II", ALL, "2012–2019", ["Kinetic", "Momentum", "Summum", "R-Design", "Inscription (с 2016)"], [], ["YOU!", "Ocean Race", "Cross Country (кузов)"],
         [dew("Volvo V40 (2012)")], OK, "Summum заменена на Inscription в 2016"),
    ],
    ("Volvo", "V60", "V60"): [
        ("V60 II", ALL, "2018–н. в.", ["Momentum", "Inscription", "R-Design", "Essential", "Core", "Plus Bright", "Plus Dark", "Ultimate Bright", "Ultimate Dark"], [], ["Cross Country (кузов)"],
         [plw("Volvo V60")], OK, "после рестайлинга — Essential/Core/Plus/Ultimate"),
        ("V60 I", ALL, "2010–2018", ["Kinetic", "Momentum", "Summum", "R-Design"], ["Polestar"], ["Ocean Race", "Business", "Cross Country (кузов)"], [plw("Volvo V60")], OK, ""),
    ],
    ("Volvo", "XC40", "XC40"): [
        ("XC40 I", ALL, "2017–н. в.", ["Momentum Core", "Momentum", "Momentum Pro", "R-Design", "Inscription", "Essential", "Core", "Plus", "Ultimate"], [], ["First Edition"],
         [plw("Volvo XC40"), dew("Volvo XC40")], OK, "с 2022 — Essential/Core/Plus/Ultimate"),
    ],
    ("Volvo", "XC60", "XC60"): [
        ("XC60 II", ALL, "2017–н. в.", ["Momentum", "Inscription", "R-Design", "Core", "Plus", "Ultimate"], ["Polestar Engineered"], [],
         [plw("Volvo XC60")], PART, "Core/Plus/Ultimate после 2021"),
        ("XC60 I", ALL, "2008–2017", ["Base", "Kinetic", "Momentum", "Summum", "R-Design", "Inscription"], [], ["Ocean Race"], [plw("Volvo XC60")], OK, ""),
    ],
    ("Volvo", "XC90", "XC90"): [
        ("XC90 II", ALL, "2014–н. в.", ["Kinetic", "Momentum", "Inscription", "R-Design", "Excellence", "Core", "Plus", "Ultimate"], [], ["First Edition"],
         [plw("Volvo XC90")], PART, "Core/Plus/Ultimate после 2021"),
        ("XC90 I", ALL, "2002–2015", ["Kinetic", "Momentum", "Summum", "Executive", "R-Design"], [], ["Ocean Race", "Signature Edition"], [plw("Volvo XC90")], OK, ""),
    ],
    ("Volkswagen", "Golf", "Golf"): [
        ("Golf VIII", ALL, "2019–н. в.", ["Golf", "Life", "Style", "R-Line"], ["GTI", "GTD", "GTE", "R"], [], [plw("Volkswagen Golf")], OK, ""),
        ("Golf VII", ALL, "2012–2020", ["Trendline", "Comfortline", "Highline", "R-Line"], ["GTI", "GTD", "GTE", "R"], ["Cup", "United", "Join", "IQ.DRIVE", "Sound", "Lounge", "Advance, Sport (ES/Бенилюкс)"],
         [plw("Volkswagen Golf"), dew("VW Golf VII")], OK, ""),
        ("Golf VI", ALL, "2008–2013", ["Trendline", "Comfortline", "Highline"], ["GTI", "GTD", "R"], ["Team", "Match", "Style", "Move", "Advance, Sport (ES/Бенилюкс)"], [plw("Volkswagen Golf"), dew("VW Golf VI")], OK, ""),
    ],
    ("Volkswagen", "Passat", "Passat"): [
        ("B9", PRE, "2023–н. в.", ["Passat", "Business", "Elegance", "R-Line"], [], [], [plw("Volkswagen Passat")], OK, ""),
        ("B8", FL, "2019–2023", ["Passat", "Business", "Elegance", "R-Line"], ["GTE"], ["Alltrack (кузов)"], [dew("VW Passat B8")], PART, "линейки переименованы при рестайлинге"),
        ("B8", PRE, "2014–2019", ["Trendline", "Comfortline", "Highline", "R-Line"], ["GTE"], ["Alltrack (кузов)", "Advance, Sport (ES/Бенилюкс)"], [plw("Volkswagen Passat"), dew("VW Passat B8")], OK, ""),
        ("B7", ALL, "2010–2014", ["Trendline", "Comfortline", "Highline", "R-Line", "Exclusive"], [], ["Business Edition", "Edition 40", "Alltrack (кузов)", "Advance, Sport (ES/Бенилюкс)"],
         [plw("Volkswagen Passat"), dew("VW Passat B7")], OK, ""),
        ("B6", ALL, "2005–2010", ["Trendline", "Comfortline", "Highline", "Sportline"], ["R36"], ["R-Line", "Advance, Sport (ES/Бенилюкс)"], [plw("Volkswagen Passat")], OK, ""),
    ],
    ("Volkswagen", "Polo", "Polo"): [
        ("Polo VI", FL, "2021–н. в.", ["Polo", "Life", "Style", "R-Line"], ["GTI"], [], [dew("VW Polo VI")], OK, ""),
        ("Polo VI", PRE, "2017–2021", ["Trendline", "Comfortline", "Highline"], ["GTI"], ["Beats", "United", "R-Line (пакет)"], [plw("Volkswagen Polo")], OK, ""),
        ("Polo V", ALL, "2009–2017", ["Trendline", "Comfortline", "Highline"], ["GTI", "R WRC"], ["Life", "Fresh", "Match", "Lounge", "Team", "Cross Polo", "BlueGT", "Advance, Sport (ES/Бенилюкс)"],
         [plw("Volkswagen Polo"), dew("VW Polo V")], OK, ""),
    ],
    ("Volkswagen", "T-Roc", "T-Roc"): [
        ("T-Roc I", FL, "2022–2025", ["T-Roc", "Life", "Style", "R-Line"], ["R"], ["Cabriolet (кузов)"], [plw("Volkswagen T-Roc")], OK, ""),
        ("T-Roc I", PRE, "2017–2022", ["T-Roc", "Style", "Sport"], ["R"], ["R-Line (пакет)", "Special Edition", "Cabriolet (кузов)"], [plw("Volkswagen T-Roc")], PART, ""),
    ],
    ("Volkswagen", "T6", "T6 (Multivan, Transporter)"): [
        ("T7 Multivan", PRE, "2021–н. в.", ["Multivan", "Life", "Style", "Energetic"], [], ["Edition"], [plw("Volkswagen Transporter")], OK, "на mobile.de это модель T7"),
        ("T7 Transporter", PRE, "2025–н. в.", [], [], ["Kombi", "Furgon", "PanAmericana"], [], CHECK, "на mobile.de это модель T7"),
        ("T6 / T6.1", ALL, "2015–2024", ["Trendline", "Comfortline", "Highline"], [], ["Business", "Generation SIX", "Edition 30", "PanAmericana", "Cruise", "California (кузов)", "Caravelle (кузов)"],
         [plw("Volkswagen Transporter")], OK, "на mobile.de это модель T6"),
        ("T5", ALL, "2009–2015", ["Startline", "Trendline", "Comfortline", "Highline"], [], ["Rockton", "Caravelle (кузов)", "California (кузов)"],
         [plw("Volkswagen Transporter")], OK, "на mobile.de это модель T5"),
    ],
    ("Volkswagen", "Tiguan", "Tiguan"): [
        ("Tiguan III", PRE, "2024–н. в.", ["Tiguan", "Life", "Elegance", "R-Line"], [], [], [plw("Volkswagen Tiguan"), dew("VW Tiguan III")], OK, ""),
        ("Tiguan II", FL, "2020–2024", ["Tiguan", "Life", "Elegance", "R-Line"], ["Tiguan R"], ["Allspace (кузов)"], [dew("VW Tiguan II")], OK, ""),
        ("Tiguan II", PRE, "2016–2020", ["Trendline", "Comfortline", "Highline", "R-Line"], [], ["Join", "United", "Allspace (кузов)"], [plw("Volkswagen Tiguan")], OK, ""),
        ("Tiguan I", ALL, "2007–2016", ["Trend & Fun", "Sport & Style", "Track & Field", "Track & Style", "Trendline (с 2011)", "Comfortline (с 2011)", "Highline (с 2011)"], [], ["Cityline", "Perfectline", "R-Line", "Advance, Sport (ES/Бенилюкс)"],
         [plw("Volkswagen Tiguan"), dew("VW Tiguan I")], OK, ""),
    ],
    ("Volkswagen", "Touran", "Touran"): [
        ("Touran II", ALL, "2015–н. в.", ["Trendline", "Comfortline", "Highline"], [], ["R-Line", "Join", "United", "Move", "Advance, Sport (ES/Бенилюкс)"], [plw("Volkswagen Touran"), dew("VW Touran II")], OK, "Trendline снят в DE с 2019"),
        ("Touran I", ALL, "2006–2015", ["Conceptline", "Trendline", "Comfortline", "Highline"], [], ["Cross", "United", "Freestyle", "R-Line", "Advance, Sport (ES/Бенилюкс)"],
         [plw("Volkswagen Touran"), dew("VW Touran I")], OK, ""),
    ],
}


def main():
    today = datetime.date.today().isoformat()
    rows = []
    for (brand, model, label), entries in TRIMS.items():
        for code, phase, years, trims, sport, special, sources, status, note in entries:
            rows.append({
                "brand": brand, "model": model, "label": label, "code": code, "phase": phase, "years": years,
                "trims": trims, "sport": sport, "special": special, "sources": sources, "status": status, "note": note,
            })
    with open(os.path.join(ROOT, "data", "model-trims.json"), "w", encoding="utf8") as handle:
        json.dump({"generatedAt": today, "market": "EU (PL/DE)", "rows": rows}, handle, ensure_ascii=False, indent=1)
        handle.write("\n")

    with open(os.path.join(ROOT, "data", "model-trims.csv"), "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle, delimiter=";", lineterminator="\n")
        writer.writerow(["Марка", "Модель", "Поколение", "Этап", "Годы", "Линейки", "Спорт", "Спецсерии и пакеты",
                         "Статус", "Примечание", "Источники"])
        for r in rows:
            writer.writerow([r["brand"], r["label"], r["code"], r["phase"], r["years"], ", ".join(r["trims"]),
                             ", ".join(r["sport"]), ", ".join(r["special"]), r["status"], r["note"], " ".join(r["sources"])])

    counts = {status: sum(1 for r in rows if r["status"] == status) for status in (OK, PART, CHECK)}
    lines = [
        "# Комплектации популярных моделей (рынок ЕС, с 2010)",
        "",
        f"> Сгенерировано `tools/build-model-trims.py` {today}. Данные — `data/model-trims.json`.",
        "> Источники: польская и немецкая Википедия (разделы «Wersje wyposażeniowe», «Linie stylistyczne»,",
        "> «Ausstattungslinien»), страницы производителей, прессы и польских каталогов. B61, этап 5",
        "> (`docs/PROJECT-MOBILE.md` §4.8). Названия — как в объявлениях и у дилеров (PL/DE).",
        f"> Строк: {len(rows)} — {OK}: {counts[OK]}, {PART}: {counts[PART]}, {CHECK}: {counts[CHECK]}",
        "> («проверить» — по знанию, источник не найден; перед подстановкой в фильтр проверить).",
        "",
        "Колонки: **линейки** — основные комплектации; **спорт** — спортивные модели и версии,",
        "которые часто пишут в «Wersja»; **спецсерии и пакеты** — что ещё встречается в объявлениях.",
        "",
    ]
    brand = None
    for (b, model, label), entries in TRIMS.items():
        if b != brand:
            brand = b
            lines += ["", f"## {brand}", ""]
        lines += [f"### {b} {label}", "", "| Поколение | Этап | Годы | Линейки | Спорт | Спецсерии и пакеты | Статус | Источники |", "|---|---|---|---|---|---|---|---|"]
        for code, phase, years, trims, sport, special, sources, status, note in entries:
            src = ", ".join(f"[{i + 1}]({url})" for i, url in enumerate(sources)) or "—"
            trims_text = ", ".join(trims) or "нет данных"
            if note:
                trims_text += f"<br><small>{note}</small>"
            lines.append(f"| {code} | {phase} | {years} | {trims_text} | {', '.join(sport) or '—'} | {', '.join(special) or '—'} | {status} | {src} |")
        lines.append("")
    with open(os.path.join(ROOT, "docs", "MODEL-TRIMS.md"), "w", encoding="utf8") as handle:
        handle.write("\n".join(lines).rstrip("\n") + "\n")
    print(f"rows={len(rows)} " + " ".join(f"{k}={v}" for k, v in counts.items()))


if __name__ == "__main__":
    main()
