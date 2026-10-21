"""Mild hybrids (MHEV) of our model table since 2016 (owner 2026-10-10, B61).

A mild hybrid often reads as plain petrol or diesel on the portals and in the
spec databases, but takes the reduced excise like any hybrid (owner
2026-10-03: 1,55 % up to 2000 cm³, 9,3 % above). This module finds them:

  RULES      what the makers say: engine family, models, power, gearbox, from
             which year, 12 V / 24 V / 48 V (knowledge, with the source named);
  evidence   what our two spec databases say about the same version:
             ultimatespecs (version name: "Mild Hybrid", "MHEV", "48V", "eTSI",
             "EQ Boost"...) and autocentrum.pl (engine filed under "Hybrydowe"
             or named so) — tools/autocentrum.py rows carry their own name.

A version is a mild hybrid when two sources agree (a rule + a database, or
both databases), or when a database names it so outright ("1.5 eTSI mHEV").
A rule alone is not applied: it goes to the report as "проверить"
(docs/MODEL-MILD-HYBRIDS.md). Used by tools/build-model-engine-table.py.
"""
import collections
import re

# Words a version name uses for a mild hybrid. Not "Hybrid" alone: that is a
# full hybrid (Toyota, Kia HEV, Ford FHEV) or a Stellantis 48 V "Hybrid", which
# our table already files under "гибрид".
MILD_NAME = re.compile(r"mild[- ]?hybrid|mild[- ]?hev|\bmhev\b|\bm[- ]?hybrid\b|\b48 ?v\b|\be-?tsi\b|\be-?tec\b|eq[- ]?boost|"
                       r"ecoboost (\d+ ?hp )?hybrid|ecoblue hybrid|hybrid ?assist|e-skyactiv|\bmh\b|\bisg\b|\bshvs\b", re.I)
FULL_HYBRID_NAME = re.compile(r"(?<!mild )(?<!mild-)\b(f?hev|hsd|full hybrid|e-tech|hybrid dynamic|plug|phev|activehybrid)\b", re.I)

M, A = "m", "a"


def R(brand, models, fuel, powers, litres, gearbox, since, until, system, source, gens=None, wiki="", optional=False):
    """One maker's statement. gens: our generation codes (None = any of the years); wiki: the de/en.wikipedia
    statement confirming it (a second, independent source); optional: the maker sold the same engine with and
    without the mild hybrid, so only a version whose own name says it counts."""
    return {"brand": brand, "models": models, "fuel": fuel, "powers": powers, "litres": litres, "gearbox": gearbox,
            "since": since, "until": until, "system": system, "source": source, "gens": gens, "wiki": wiki,
            "optional": optional}


# Reviewed 2026-10-10 against de/en.wikipedia (tools/wiki_engines.py, docs/MODEL-MILD-HYBRIDS.md).
RULES = [
    # Audi
    R("Audi", ["A4", "A5"], "petrol", [150, 190, 204, 245, 265], 2.0, None, 2019, 2024, "12V", "Audi MediaCenter 2019",
      ["B9", "F5"], "de: Audi A4 B9 — «Alle Motoren, mit Ausnahme des S4 TDI und 50 TDI (48V) und 45 TDI, verfügen über ein 12-Volt-Mildhybrid-System»"),
    R("Audi", ["A4", "A5"], "diesel", [136, 163, 190, 204], 2.0, None, 2019, 2024, "12V", "Audi MediaCenter 2019",
      ["B9", "F5"], "de: Audi A4 B9 — 12-Volt-Mildhybrid für alle Motoren außer S4 TDI, 50 TDI, 45 TDI"),
    R("Audi", ["A4", "A5"], "diesel", [286, 341, 347], 3.0, None, 2019, 2024, "48V", "Audi MediaCenter 2019",
      ["B9", "F5"], "de: Audi A4 B9 / A5 F5 — S4/S5 TDI und 50 TDI mit 48-V-Bordnetz (45 TDI 231 PS ohne Startergenerator)"),
    R("Audi", ["A6", "A7"], "petrol", [245, 265], 2.0, None, 2018, None, "12V", "Audi MediaCenter 2018",
      ["C8"], "de: Audi A7 C8 — «Bei den Vierzylinder-Modellen ist der Riemen-Startergenerator in 12 Volt ausgeführt»; en: Audi A6 — «All engines are offered with a mild hybrid drivetrain»"),
    R("Audi", ["A6", "A7"], "petrol", [340, 450, 600, 630], None, None, 2018, None, "48V", "Audi MediaCenter 2018",
      ["C8"], "de: Audi A7 C8 — «Sechszylinder-Motoren erhalten ein 48-Volt-Bordnetz… MHEV»; de: Audi A6 C8 — RS6 «V8-Mildhybrid». Abweichung: de A6 C8 nennt 48 V für V6 erst «ab Sommer 2020»"),
    R("Audi", ["A6", "A7"], "diesel", [163, 204], 2.0, None, 2018, None, "12V", "Audi MediaCenter 2018",
      ["C8"], "de: Audi A7 C8 — Vierzylinder 12 V; en: Audi A6 — «2.0 L TFSI MHEV / All engines … mild hybrid»"),
    R("Audi", ["A6", "A7"], "diesel", [231, 286, 344, 349], 3.0, None, 2018, None, "48V", "Audi MediaCenter 2018",
      ["C8"], "en: Audi A6 — «MHEV (… 45 TDI / 50 TDI)»; de: Audi A7 C8 — Sechszylinder 48 V (de A6 C8: 48 V ab Sommer 2020 — Abweichung)"),
    R("Audi", ["A8"], None, [286, 340, 435, 460, 571], None, None, 2017, None, "48V", "Audi MediaCenter 2017",
      ["D5"], "de: Audi A8 D5 — «Alle Aggregate haben ein 48-Volt-Bordnetz… MHEV»"),
    R("Audi", ["Q5"], "diesel", [163, 204], 2.0, None, 2020, 2024, "12V", "Audi MediaCenter 2020",
      ["FY"], "de: Audi Q5 FY — Tabelle 35 TDI / 40 TDI mit Mild-Hybrid; «Der 40 TDI … Riemen-Starter-Generator»"),
    R("Audi", ["Q5"], "petrol", [245, 265], 2.0, None, 2020, 2024, "12V", "Audi MediaCenter 2020",
      ["FY"], "de: Audi Q5 FY — Tabelle 45 TFSI mit Mild-Hybrid"),
    R("Audi", ["Q5"], "diesel", [286, 341, 347], 3.0, None, 2019, 2024, "48V", "Audi MediaCenter 2019",
      ["FY"], "de: Audi Q5 FY — Tabelle 50 TDI / SQ5 TDI mit Mild-Hybrid"),
    R("Audi", ["Q5"], None, [204], 2.0, None, 2025, None, "48V", "Audi MediaCenter 2024",
      ["GU"], "de: Audi Q5 GU — «Sie sind alle als Mild-Hybrid ausgeführt»"),
    R("Audi", ["Q7"], None, [231, 286, 340], 3.0, None, 2019, None, "48V", "Audi MediaCenter 2019",
      ["4M"], "en: Audi Q7 — facelift «Three mild-hybrid 3.0-litre V6 powertrains»"),
    R("Audi", ["Q8"], None, [231, 286, 340, 435, 507, 600], None, None, 2018, None, "48V", "Audi MediaCenter 2018",
      None, "de: Audi Q8 — «Die Motortechnik beinhaltet einen 48-Volt-Startergenerator»"),
    R("Audi", ["A3"], "petrol", [116, 150], None, A, 2020, None, "48V", "Audi MediaCenter 2020",
      ["8Y"], "de: Audi A3 8Y — «35 TFSI mit Doppelkupplungsgetriebe … 48-V-Bordnetz für den Mildhybridantrieb»; Tabelle 116 PS (2024)"),
    R("Audi", ["Q3"], "petrol", [150], 1.5, A, 2025, None, "48V", "Audi MediaCenter 2025", ["FJ"]),
    # A5 B10: "MHEV plus" for the TDI and the S5 V6 only; the 2.0 TFSI has none (Audi MediaCenter 2024).
    R("Audi", ["A5"], "diesel", [204], 2.0, None, 2024, None, "48V", "Audi MediaCenter 2024", ["B10"]),
    R("Audi", ["A5"], "petrol", [367], 3.0, None, 2024, None, "48V", "Audi MediaCenter 2024", ["B10"]),
    # BMW
    R("BMW", ["Seria 3"], "diesel", [150, 190, 286, 340], None, None, 2020, None, "48V", "BMW PressClub 03/2020",
      ["G20"], "de: BMW G20 — 318d/320d «ab 02/2020», 330d/M340d «ab 11/2020 mit 48V Mild-Hybrid-Technologie»"),
    R("BMW", ["Seria 3"], "petrol", [374], 3.0, None, 2020, None, "48V", "BMW PressClub 2020",
      ["G20"], "en: BMW 3 Series (G20) — «In 2020, the 320d … mild hybrid as standard, with subsequent models also gaining this»; M340i MHEV"),
    R("BMW", ["Seria 4"], None, [190, 286, 340, 374], None, None, 2020, None, "48V", "BMW PressClub 2020",
      ["G22"], "de: BMW G22 — «Der M440i sowie alle Dieselantriebe haben ein 48-Volt-Bordnetz»"),
    R("BMW", ["Seria 5"], "diesel", [150, 190, 286, 340], None, None, 2020, 2023, "48V", "BMW PressClub 05/2020",
      ["G30"], "de: BMW G30 — «Ab November 2019 … 520d 48-Volt-Mildhybrid…, mit der Modellpflege im Jahr 2020 für alle Modelle»"),
    R("BMW", ["Seria 5"], "petrol", [184, 252, 333, 340], None, None, 2020, 2023, "48V", "BMW PressClub 05/2020",
      ["G30"], "de: BMW G30 — Modellpflege 2020: 48-Volt-Mildhybrid für alle Modelle"),
    R("BMW", ["Seria 5"], None, [197, 208, 303], None, None, 2023, None, "48V", "BMW PressClub 2023",
      ["G60"], "de: BMW G60 — 520i, 520d «48-V-Bordnetz»; Tabelle 540d"),
    R("BMW", ["X3", "X4"], "diesel", [190, 286, 326, 340], None, None, 2020, 2024, "48V", "BMW PressClub 03/2020",
      ["G01", "G02"], "de: BMW G01 — Tabelle 20d / 40d mit Mild-Hybrid"),
    R("BMW", ["X3"], None, [197, 208, 398], None, None, 2024, None, "48V", "BMW PressClub 2024",
      ["G45"], "de: BMW G45 — «20 xDrive, M50 xDrive, 20d xDrive als Mild-Hybrid mit 48-Volt-Generator»"),
    R("BMW", ["X5", "X6"], None, [286, 298, 340, 352, 380], None, None, 2020, None, "48V", "BMW PressClub 2020",
      ["G05", "G06"], "de: BMW G05 — «250 kW aus einem 3,0-l-Motor mit Mildhybridsystem… 48-V-Bordnetz»"),
    R("BMW", ["X7"], None, None, None, None, 2022, None, "48V", "BMW PressClub 2022",
      None, "de: BMW G07 — «Mit dem Facelift 2022 erhielten alle Motorisierungen eine 48-Volt-Mild-Hybrid-Technologie»"),
    R("BMW", ["X1", "X2"], None, [170, 211, 218], None, A, 2022, None, "48V", "BMW PressClub 2022",
      ["U11", "U10"], "de: BMW U11 — sDrive20i / xDrive23i / xDrive23d mit 48-Volt-Startergenerator"),
    R("BMW", ["Seria 1", "Seria 2"], None, [163, 170, 190, 218], None, A, 2021, None, "48V", "BMW PressClub 2021-2024",
      ["F70", "F74", "G42-U06"], "de: BMW F70 — 120 / 120d Mildhybrid; BMW U06 — 220i / 223i 48 V; BMW G42 — 220d 48 V"),
    R("BMW", ["Seria 7"], None, [286, 300, 380], None, None, 2022, None, "48V", "BMW PressClub 2022",
      ["G70"], "en: BMW 7 Series (G70) — «petrol and diesel models … standard with a 48-volt mild hybrid powertrain»"),
    R("BMW", ["Seria 8"], "diesel", [340], 3.0, None, 2020, None, "48V", "BMW PressClub 2020",
      None, "de: BMW G15 — «Im Sommer 2020 wurde für diesen Motor auch 48-V-Mildhybrid-Technik eingeführt» (840d)"),
    # Mercedes-Benz
    R("Mercedes-Benz", ["Klasa S", "Klasa E", "CLS", "GLE", "GLS"], "petrol", [367, 389, 435, 457], 3.0, None, 2017, None, "48V",
      "Mercedes media: M256 EQ Boost", ["W222", "W223", "W213", "C257", "V167", "V167 Coupé (C167)", "X167"],
      "de: Baureihe 223 — «M 256 … 48V-Kurbelwellenstartergenerator als Mild-Hybrid»; X 167 — GLS 450 M 256 mit Startergenerator; C 257 / V 167 — Motorcode «M = Mildhybrid»"),
    R("Mercedes-Benz", ["Klasa C"], "petrol", [184, 197, 198, 258, 272], None, A, 2018, 2021, "48V", "Mercedes media 2018",
      ["W205"], "de: Baureihe 205 — «Seit der Modellpflege 2018 … C 200 und C 300 ein 48-Volt-System mit riemengetriebenem Startergenerator»"),
    R("Mercedes-Benz", ["Klasa E"], "petrol", [197, 211, 258, 272, 299], 2.0, A, 2018, 2023, "48V", "Mercedes media 2018: M264 EQ Boost",
      ["W213"]),
    R("Mercedes-Benz", ["GLC"], "petrol", [197, 211, 258, 272], 2.0, A, 2019, 2022, "48V", "Mercedes media 2019",
      ["X253", "X253 Coupé (C253)"], "de: X 253 — Tabelle GLC 300 4MATIC mit Mild-Hybrid"),
    R("Mercedes-Benz", ["Klasa C", "Klasa E", "GLC", "CLE"], None, None, None, A, 2021, None, "48V", "Mercedes media 2021-2023",
      ["W206", "W214", "X254", "X254 Coupé (C254)", "CLE"],
      "de: Baureihe 206 — «Alle Vierzylinder-Ottomotoren … integrierten Startergenerator … 48-Volt»; 214 — «Benziner und Diesel sind als Mild-Hybrid…»; X 254 — «Alle sind elektrifiziert»; CLE — «Alle haben ein 48-Volt-Mildhybrid-System»"),
    R("Mercedes-Benz", ["Klasa S"], None, None, None, A, 2020, None, "48V", "Mercedes media 2020",
      ["W223"], "de: Baureihe 223 — M 256 / OM 656 M (M = Mildhybrid)"),
    R("Mercedes-Benz", ["Klasa A", "Klasa B", "CLA", "GLA", "GLB"], "petrol", [136, 150, 163, 177, 190, 204, 218, 224], None, A, 2023, None, "48V",
      "Mercedes media 2023", ["W177", "W247", "C118", "GLA II", "GLB"],
      "de: Baureihe 177 — «Modellpflege … alle Benziner außer AMG A 45 S ein 48-Volt-Bordnetz»; 118 und X 247 — ebenso"),
    R("Mercedes-Benz", ["GLE", "GLS"], "diesel", [269, 272, 330, 367], None, A, 2023, None, "48V", "Mercedes media 2023",
      ["V167", "V167 Coupé (C167)", "X167"], "de: X 167 — «Mit der Modellpflege im Frühjahr 2023 erhielten alle Motorisierungen ein 48-Volt-Bordnetz»"),
    R("Mercedes-Benz", ["Klasa G"], None, [367, 449], None, A, 2024, None, "48V", "Mercedes media 2024", ["W465"]),
    # VW group eTSI / e-TEC (DSG only)
    R("Volkswagen", ["Golf"], "petrol", [110, 116, 130, 150], None, A, 2020, None, "48V", "VW press 2019",
      ["Golf VIII"], "de: VW Golf VIII — «Die eTSI sind Mild-Hybride und leisten 81, 96 und 110 kW (110, 130 und 150 PS)»"),
    R("Skoda", ["Octavia"], "petrol", [110, 116, 150], None, A, 2020, None, "48V", "Skoda Storyboard 2020",
      ["Octavia IV"], "de: Škoda Octavia IV — «Die Mild-Hybride leisten 81 und 110 kW (110 und 150 PS)»"),
    R("Seat", ["Leon"], "petrol", [110, 116, 150], None, A, 2020, None, "48V", "SEAT media 2020",
      ["Leon IV"], "de: Seat León IV — Tabelle 1.0 / 1.5 eTSI, «Mild-Hybrid mit 48-Volt-Bordnetz»"),
    R("Cupra", ["Leon", "Formentor"], "petrol", [150], 1.5, A, 2020, None, "48V", "Cupra media 2020",
      None, "de: Seat León IV / Cupra Formentor — Tabelle 1.5 eTSI mit Mild-Hybrid"),
    R("Volkswagen", ["Passat", "Tiguan", "Tayron", "T-Roc"], "petrol", [130, 150], 1.5, A, 2024, None, "48V", "VW press 2023-2025",
      ["B9", "Tiguan III", "Tayron", "T-Roc II"], "de: VW Tiguan III — «zwei 48-V-Mild-Hybridantriebe, 96 kW (130 PS) und 110 kW (150 PS)»; Passat B9 / Tayron — Tabelle 1.5 eTSI"),
    R("Skoda", ["Superb", "Kodiaq"], "petrol", [150], 1.5, A, 2024, None, "48V", "Skoda Storyboard 2023",
      ["Superb IV", "Kodiaq II"], "de: Škoda Superb IV — «1.5 TSI mHEV leistet 110 kW (150 PS)»; Kodiaq II — «als Mildhybrid 110 kW (150 PS)»"),
    R("Cupra", ["Terramar"], "petrol", [150], 1.5, A, 2024, None, "48V", "Cupra media 2024",
      None, "de: Cupra Terramar — Tabelle 1.5 eTSI mit Mild-Hybrid"),
    # Ford
    R("Ford", ["Fiesta", "Focus", "Puma"], "petrol", [125, 155], 1.0, None, 2019, None, "48V", "Ford media 2019-2020",
      None, "de: Ford Puma ’20 — «Dieser Motor ist erstmals auch als Mildhybrid verfügbar … 48-Volt-Batterie»"),
    R("Ford", ["Kuga"], "diesel", [150], 2.0, None, 2020, None, "48V", "Ford media 2019",
      None, "de: Ford Kuga — Tabelle 2.0 EcoBlue MHEV"),
    R("Ford", ["Transit Custom", "Tourneo Custom", "Transit"], "diesel", [130, 185], 2.0, None, 2019, 2023, "48V", "Ford media 2019",
      None, "en: Ford Transit Custom — «An optional mild hybrid system was introduced to the EcoBlue engines in 2019»", optional=True),
    # Volvo
    R("Volvo", ["XC40", "XC60", "XC90", "S60", "V60", "S90", "V90"], None, [163, 197, 211, 235, 249, 250, 264, 300, 314], 2.0, A, 2019, None, "48V",
      "Volvo Cars media 2019-2020", None, "de: Volvo XC40 / V60 / S90 / V90 — Tabellen B3 / B4 / B5 / B6 mit Mild-Hybrid"),
    # Hyundai / Kia
    R("Hyundai", ["i20", "Bayon", "Kona", "i30"], "petrol", [100, 120], 1.0, None, 2020, None, "48V", "Hyundai media 2020",
      None, "de: Hyundai i20 / Bayon — Tabelle «1.0 T-GDI 48V-Mild-Hybrid»"),
    R("Kia", ["Rio", "Stonic", "Ceed", "XCeed", "ProCeed"], "petrol", [100, 120], 1.0, None, 2020, None, "48V", "Kia media 2020",
      None, "", optional=True),
    R("Hyundai", ["i30"], "petrol", [160], 1.5, None, 2020, None, "48V", "Hyundai media 2020"),
    R("Kia", ["Ceed", "XCeed", "ProCeed"], "petrol", [160], 1.5, None, 2021, None, "48V", "Kia media 2021"),
    R("Hyundai", ["Tucson"], "petrol", [150, 180], 1.6, None, 2020, None, "48V", "Hyundai media 2020",
      ["Tucson IV"], "de: Hyundai Tucson — Tabelle «1.6 T-GDI 48V»"),
    R("Kia", ["Sportage"], "petrol", [150, 180], 1.6, None, 2021, None, "48V", "Kia media 2021",
      ["Sportage V"], "de: Kia Sportage — Tabelle «1.6 T-GDI 48V»"),
    R("Hyundai", ["Tucson", "i30"], "diesel", [136, 185], None, None, 2018, None, "48V", "Hyundai media 2018-2020",
      None, "de: Hyundai Tucson — Tabelle «1.6 CRDi 48V» (bis 2020 als Option)", optional=True),
    R("Kia", ["Sportage", "Ceed", "XCeed", "ProCeed"], "diesel", [136, 185], None, None, 2018, None, "48V", "Kia media 2018-2020",
      None, "de: Kia Sportage — «Im Februar 2020 entfielen alle Motorvarianten, die … keine Mild-Hybride waren»; Tabelle «1.6 CRDi 48V»", optional=True),
    # Mazda
    R("Mazda", ["Mazda 3", "CX-30"], "petrol", [122, 150, 180, 186], 2.0, None, 2019, None, "24V", "Mazda media 2019",
      None, "de: Mazda3 — «Die Skyactiv-Benzinmotoren des Mazda3 sind serienmäßig mit einem Mild-Hybrid-System (M Hybrid) ausgestattet»; Mazda CX-30 — Tabelle M Hybrid"),
    R("Mazda", ["CX-5"], "petrol", [165, 194], None, None, 2022, None, "24V", "Mazda media 2022",
      None, "de: Mazda CX-5 — «Die beiden Vierzylinder-Ottomotoren haben seitdem eine 24-Volt-Mildhybridisierung»"),
    R("Mazda", ["Mazda 2"], "petrol", [75, 90, 115], 1.5, None, 2020, None, "24V", "Mazda media 2020",
      ["Mazda 2 III"], "de: Mazda2 — Tabelle «E-Skyactiv-G 90 / 115 M Hybrid»"),
    R("Mazda", ["CX-60", "CX-80"], "diesel", [200, 254], 3.3, None, 2022, None, "48V", "Mazda media 2022",
      None, "de: Mazda CX-80 — «Der Dieselmotor ist als Mild-Hybrid ausgeführt; ein 48-Volt-Bordnetz»"),
    # Nissan, Renault, Toyota
    R("Nissan", ["Qashqai"], "petrol", [140, 158], 1.3, None, 2021, None, "12V", "Nissan media 2021",
      ["Qashqai III"], "de: Nissan Qashqai — «Er wird von einem 12-Volt-Mild-Hybrid unterstützt»; Tabelle 1.3 DIG-T Mild-Hybrid"),
    R("Nissan", ["X-Trail"], "petrol", [163], 1.5, None, 2022, None, "12V", "Nissan media 2022",
      ["X-Trail IV"], "de: Nissan X-Trail — Tabelle 1.5 VC-T Mild-Hybrid"),
    R("Renault", ["Arkana", "Captur", "Austral"], "petrol", [140, 158, 160], 1.3, None, 2021, None, "12V", "Renault media 2021-2022",
      None, "de: Renault Arkana — «1,3-Liter-Ottomotor (gestaltet als 12V-Mild-Hybrid…)»; Captur II / Austral — Tabelle Mild Hybrid 140 / 160"),
    R("Toyota", ["Hilux"], "diesel", [204], 2.8, None, 2024, None, "48V", "Toyota Europe 2023",
      None, "de: Toyota Hilux — «Ab 2024 gab es den Dieselmotor 1GD-FTV mit 48-Volt-Mildhybridsystem»"),
    # New brands, wave 1 (owner 2026-10-21), checked 2026-10-21 against the article wikitext (de/en/it/fr) and,
    # for Land Rover, the JLR technical data sheets. Left out where sources disagree (Swift VII voltage aside —
    # a mild hybrid either way —, Range Rover P530 / P615, Countryman JCW, Ignis Allgrip 2020+).
    # Suzuki (SHVS)
    R("Suzuki", ["Baleno"], "petrol", [90], 1.2, M, 2016, 2019, "12V", "en.wikipedia: Suzuki Baleno (2015)",
      None, "en: Suzuki Baleno (2015) — «12-volt Mild Hybrid… (SHVS)»; de: Tabelle «1.2 DUALJET SHVS» 66 kW"),
    R("Suzuki", ["Swift"], "petrol", [111], 1.0, M, 2017, 2020, "12V", "de.wikipedia: Suzuki Swift",
      None, "de: Suzuki Swift — «Einliter-Turbomotor wird auch als Mild-Hybrid SHVS… angeboten»", optional=True),
    R("Suzuki", ["Swift"], "petrol", [90], 1.2, M, 2017, 2020, "12V", "en.wikipedia: Suzuki Swift",
      None, "en: Suzuki Swift — «available for regular and mild hybrid forms depending on the market»", optional=True),
    R("Suzuki", ["Swift"], "petrol", [83], 1.2, None, 2020, None, "12V", "en.wikipedia: Suzuki Swift",
      None, "en: Suzuki Swift — «K12D Dualjet… with 12-volt mild hybrid system and become standard engine in Europe»; "
      "Swift VII (2024) — «only available with the 1.2-liter gasoline mild-hybrid engine»"),
    R("Suzuki", ["Swift"], "petrol", [129], 1.4, M, 2020, 2025, "48V", "en.wikipedia: Suzuki Swift",
      None, "en: Suzuki Swift — «Swift Sport with Suzuki's SHVS 48-volt mild hybrid technology for European market»"),
    R("Suzuki", ["Ignis"], "petrol", [90], 1.2, M, 2017, 2020, "12V", "de.wikipedia: Suzuki Ignis",
      None, "de: Suzuki Ignis — Tabelle «1.2 SHVS» 66 kW (neben 1.2 ohne SHVS)", optional=True),
    R("Suzuki", ["Ignis"], "petrol", [83], 1.2, None, 2020, None, "12V", "en.wikipedia: Suzuki Ignis",
      None, "en: Suzuki Ignis — «K12D Dualjet and became the standard engine»"),
    R("Suzuki", ["Vitara"], "petrol", [129], 1.4, None, 2020, None, "48V", "en.wikipedia: Suzuki Vitara",
      None, "en: Suzuki Vitara — «1.4-litre turbocharged petrol engine with a 48V mild hybrid»"),
    R("Suzuki", ["Vitara"], "petrol", [110], 1.4, A, 2025, None, "48V", "en.wikipedia: Suzuki Vitara",
      None, "en: Suzuki Vitara — Tabelle 81 kW «48V WA06C»"),
    R("Suzuki", ["S-Cross"], "petrol", [129], 1.4, None, 2020, None, "48V", "en.wikipedia: Suzuki SX4 / S-Cross",
      None, "en: Suzuki SX4 — «replaced with a turbocharged 1.4 L K14D \"Boosterjet SHVS\" mild hybrid»; "
      "en: Suzuki S-Cross — «belt-driven 48V… mild hybrid system»"),
    # Fiat
    R("Fiat", ["500"], "petrol", [70], 1.0, M, 2020, 2024, "12V", "de.wikipedia: Fiat 500 (2007)",
      None, "de: Fiat 500 (2007) — «Riemenstarter-Generator und Li-Ion-Batterie von 14 V, 11 Ah»"),
    R("Fiat", ["500"], "petrol", [65], 1.0, M, 2025, None, "12V", "en.wikipedia: Fiat 500e",
      None, "en: Fiat 500e — «12V-mild hybrid-assisted 1.0 Firefly petrol engine»"),
    R("Fiat", ["Panda"], "petrol", [70], 1.0, M, 2020, 2025, "12V", "de.wikipedia: Fiat Panda",
      None, "de: Fiat Panda — «12V-Lithium-Ionen-Batterie von 11 Ah und einem Riemen-Starter-Generator»"),
    R("Fiat", ["Panda"], "petrol", [65], 1.0, M, 2025, None, "12V", "de.wikipedia: Fiat Panda",
      None, "de: Fiat Panda — Tabelle «1.0 6V Mild-Hybrid… seit 10/2025» 48 kW"),
    R("Fiat", ["Tipo", "500X"], "petrol", [130], 1.5, A, 2022, None, "48V", "en.wikipedia: Fiat Tipo (2015)",
      None, "en: Fiat Tipo (2015) — «combined with a 48V electric motor»; de: Fiat 500X — Tabelle «1.5 GSE Mild-Hybrid» 96 kW"),
    R("Fiat", ["600"], "petrol", [100, 110, 136, 145], 1.2, A, 2024, None, "48V", "it.wikipedia: Fiat 600 (2023)",
      None, "it: Fiat 600 (2023) — «batteria agli ioni di litio da 48 V… DCT e 6 rapporti» (1.2 z mechaniką od 2026 — bez hybrydy)"),
    R("Fiat", ["Grande Panda"], "petrol", [101, 110], 1.2, A, 2025, None, "48V", "it.wikipedia: Fiat Grande Panda",
      None, "it: Fiat Grande Panda — «cambio eDCT mild hybrid 48V da 6 rapporti» (1.2 z mechaniką — «privo di ibridazione»)"),
    # Jeep
    R("Jeep", ["Renegade", "Compass"], "petrol", [130], 1.5, A, 2022, 2025, "48V", "de.wikipedia: Jeep Renegade / Compass",
      None, "de: Jeep Renegade / Jeep Compass — Tabelle «1.5 GSE 48V e-Hybrid» 96 kW"),
    R("Jeep", ["Compass"], "petrol", [145], 1.2, A, 2025, None, "48V", "de.wikipedia: Jeep Compass",
      None, "de: Jeep Compass — «R3-Ottomotor + 48-Volt-Bordnetz»"),
    R("Jeep", ["Avenger"], "petrol", [100, 110, 136, 145], 1.2, A, 2023, None, "48V", "en.wikipedia: Jeep Avenger",
      None, "en: Jeep Avenger — «48 V mild-hybrid system pairing the 1.2-litre turbo petrol engine» (1.2 100 z mechaniką — bez hybrydy)"),
    # Land Rover (Ingenium, 48 V)
    R("Land Rover", ["Range Rover Evoque", "Discovery Sport"], "petrol", [160, 200, 249, 290, 300], None, A, 2019, None, "48V",
      "JLR technical data MY21 (Evoque, Discovery Sport)", None,
      "de: Range Rover Evoque — «Alle Varianten mit Allradantrieb sind als Mildhybrid… 48-Volt»; en: Land Rover Discovery Sport — "
      "«engines equipped with 48-volt mild hybrid system»"),
    R("Land Rover", ["Range Rover Evoque", "Discovery Sport"], "diesel", [150, 163, 180, 204, 240], 2.0, A, 2019, None, "48V",
      "JLR technical data MY21 (Evoque, Discovery Sport)", None,
      "de: Range Rover Evoque — «Alle Varianten mit Allradantrieb sind als Mildhybrid… 48-Volt» (D150 / D165 FWD z mechaniką — bez)"),
    R("Land Rover", ["Range Rover", "Range Rover Sport"], "petrol", [360, 400], 3.0, None, 2019, None, "48V",
      "JLR technical data MY22 (Range Rover)", None,
      "en: Ingenium engine family — «Both are considered to be mild hybrid»; en: Range Rover (L405) — «3.0 L Ingenium MHEV I6»"),
    R("Land Rover", ["Range Rover", "Range Rover Sport"], "diesel", [249, 300, 350], 3.0, None, 2020, None, "48V",
      "JLR technical data MY22 (Range Rover)", None, "en: Ingenium engine family — AJ300D «2020–… MHEV»", optional=True),
    R("Land Rover", ["Range Rover Velar"], "petrol", [340, 400], 3.0, None, 2020, None, "48V", "JLR technical data MY22 (Velar)",
      None, "en: Range Rover Velar — «Mild hybrid (D200/P400)»"),
    R("Land Rover", ["Range Rover Velar"], "diesel", [204, 300], None, None, 2020, None, "48V", "JLR technical data MY22 (Velar)",
      None, "en: Range Rover Velar — «Mild hybrid (D200/P400)»", optional=True),
    R("Land Rover", ["Defender"], "petrol", [400], 3.0, None, 2020, None, "48V", "JLR technical data 2023 (Defender)",
      None, "JLR Defender 2023 — «PETROL MHEV» P400 (P300 — «PETROL»)"),
    R("Land Rover", ["Defender"], "diesel", [200, 249, 300], 3.0, None, 2020, None, "48V", "JLR technical data 2023 (Defender)",
      None, "en: Land Rover Defender (L663) — «in-line 6-cylinder diesel engines with mild hybrid technology… D200, D250, D300»"),
    R("Land Rover", ["Discovery"], "petrol", [360], 3.0, None, 2020, 2024, "48V", "en.wikipedia: Land Rover Discovery",
      None, "en: Land Rover Discovery — I6 Ingenium MHEV (P360)"),
    R("Land Rover", ["Discovery"], "diesel", [249, 300], 3.0, None, 2020, None, "48V", "en.wikipedia: Land Rover Discovery",
      None, "en: Land Rover Discovery — «AJ20-D6… I6 (diesel) MHEV»"),
    # Dacia, Mitsubishi, Mini
    R("Dacia", ["Duster"], "petrol", [130, 131], 1.2, M, 2024, None, "48V", "fr.wikipedia: Dacia Duster III",
      None, "fr: Dacia Duster III — «TCe 130 MHEV… 3-cylindres + mild hybrid 48 V»"),
    R("Dacia", ["Duster"], "petrol", [140], 1.2, M, 2025, None, "48V", "de.wikipedia: Dacia Duster",
      None, "de: Dacia Duster — Tabelle «mild hybrid 140» (seit 10/2025)"),
    R("Dacia", ["Bigster"], "petrol", [130, 131, 140], 1.2, M, 2025, None, "48V", "de.wikipedia: Dacia Bigster",
      None, "de: Dacia Bigster — «1,2-Liter-Ottomotor mit einem 48-Volt-Mild-Hybrid-System»"),
    R("Mitsubishi", ["ASX"], "petrol", [140], 1.3, M, 2023, None, "12V", "Mitsubishi press 2023 (automotiveworld.com)"),
    R("Mitsubishi", ["ASX"], "petrol", [158], 1.3, A, 2023, 2025, "12V", "Mitsubishi press 2023 (automotiveworld.com)"),
    R("Mini", ["Countryman"], "petrol", [170], 1.5, A, 2023, None, "48V", "en.wikipedia: Mini Countryman",
      None, "en: Mini Countryman — «Petrol mild hybrid… 48 V power booster»"),
    R("Mini", ["Countryman"], "petrol", [218], 2.0, A, 2024, None, "48V", "de.wikipedia: Mini Countryman",
      None, "de: Mini Countryman — «Ottomotor als Mild-Hybrid»"),
    R("Mini", ["Countryman"], "diesel", [122, 163], 2.0, A, 2024, None, "48V", "de.wikipedia: Mini Countryman",
      None, "de: Mini Countryman — «Dieselmotor als Mild-Hybrid»"),
    # New brands, wave 2 (owner 2026-10-21), checked 2026-10-21 (de/en wikitext, JLR WLTP / technical data sheets).
    # Subaru e-Boxer (118 V) is left a hybrid: portals list it so, the excise is the hybrid one either way.
    # MG Hybrid+, Jaecoo / Omoda SHS, BYD DM-i are full hybrids or plug-ins; Chevrolet, Chrysler, Dodge — none in Europe.
    R("Alfa Romeo", ["Tonale"], "petrol", [130, 160, 174], 1.5, A, 2022, None, "48V", "de.wikipedia: Alfa Romeo Tonale",
      None, "de: Alfa Romeo Tonale — «Die beiden 1,5-l-Ottomotoren mit einer Leistung von 96 kW (130 PS) oder 118 kW (160 PS) "
      "haben ein 48-Volt-Bordnetz»"),
    R("Alfa Romeo", ["Junior"], "petrol", [136, 145], 1.2, A, 2024, None, "48V", "de.wikipedia: Alfa Romeo Junior",
      None, "de: Alfa Romeo Junior — «1,2-Liter-Dreizylinder-Ottomotor mit 100 kW (136 PS) und Mildhybridsystem»"),
    R("Jaguar", ["E-Pace"], "petrol", [160], 1.5, A, 2020, 2024, "48V", "JLR WLTP insert E-PACE 2022",
      None, "JLR E-PACE 2022 — «P160 P200 P250 / Mild Hybrid Electric Vehicle (MHEV) ■ ■ ■»"),
    R("Jaguar", ["E-Pace"], "petrol", [200, 249, 300], 2.0, A, 2020, 2024, "48V", "JLR WLTP insert E-PACE 2022",
      None, "JLR E-PACE 2022 — «P160 P200 P250 / Mild Hybrid Electric Vehicle (MHEV) ■ ■ ■»; «P300 … MHEV ■»"),
    R("Jaguar", ["E-Pace"], "diesel", [163, 204], 2.0, A, 2020, 2024, "48V", "JLR WLTP insert E-PACE 2022",
      None, "JLR E-PACE 2022 — «D165 D165 D200 / Mild Hybrid Electric Vehicle (MHEV) – ■ ■» (D165 z mechaniką — bez)"),
    R("Jaguar", ["F-Pace"], "diesel", [163, 204], 2.0, A, 2020, 2025, "48V", "JLR technical data F-PACE 2021-2022",
      None, "en: Jaguar F-Pace — «utilizing a 48 Volt belt alternator starter system»; JLR — «D165 MHEV D200 MHEV D300 MHEV»"),
    R("Jaguar", ["F-Pace"], "diesel", [300], 3.0, A, 2020, 2025, "48V", "JLR technical data F-PACE 2022",
      None, "en: Jaguar F-Pace — «a 3.0L inline-6 mild hybrid engine, utilizing a 48 Volt belt alternator starter system»"),
    R("Jaguar", ["F-Pace"], "petrol", [400], 3.0, A, 2020, 2025, "48V", "JLR technical data F-PACE 2022",
      None, "JLR F-PACE 2022 — «P250 P400 MHEV P400e PHEV P550 SVR»"),
    R("Jaguar", ["XE", "XF"], "diesel", [204], 2.0, A, 2020, 2024, "48V", "JLR technical data XE / XF 2023",
      None, "en: Jaguar XE — «Ingenium 2.0L engines with an additional 48 Volt belt alternator starter system»; JLR — «POWERTRAIN D200 MHEV»"),
    R("DS", ["DS3", "DS3 Crossback", "DS4", "Nº4"], "petrol", [136, 145], 1.2, A, 2024, None, "48V", "de.wikipedia: DS 3 Crossback / DS 4",
      None, "de: DS 4 — «Ein Mild-Hybrid mit 6-Stufen-Doppelkupplungsgetriebe folgte 2024.»; de: DS 3 Crossback — Tabelle «MHEV 136 … 04/2024»"),
]
# A plug-in (or a full hybrid) autocentrum files under "Hybrydowe" is never a mild hybrid (A8 60 TFSI e, GLA 250 e).
PLUGIN_NAME = re.compile(r"plug-?in|\bphev\b|\btfsi ?e\b|\b4xe\b|\brecharge\b|\bt8\b", re.I)
# "A 250 e", "E 300 de", "330e" — in the version name only and lower case: "E 300" + body "E-Class" is no plug-in.
PLUGIN_NUMBER = re.compile(r"\b\d{2,3} ?d?e\b")


def years_of(text):
    match = re.match(r"(\d{4})\s*–\s*(\d{4}|н\. в\.)", text or "")
    if not match:
        return None, None
    return int(match.group(1)), (None if match.group(2) == "н. в." else int(match.group(2)))


def rule_matches(rule, row):
    if row["Марка"] != rule["brand"] or (rule["models"] and row["Модель"] not in rule["models"]):
        return False
    if rule["gens"] and row["Поколение"] not in rule["gens"]:
        return False
    own_fuel = {"бензин": "petrol", "бензин/E85 (Flexible Fuel)": "petrol", "дизель": "diesel",
                "гибрид": "petrol", "гибрид (дизель)": "diesel"}.get(row["Топливо"])
    if not own_fuel or (rule["fuel"] and own_fuel != rule["fuel"]):
        return False
    start, end = years_of(row["Годы (проверено)"])
    # A phase that ends in the year the mild hybrid starts (pre-facelift 2018-2019) is not it.
    if start is None or start > (rule["until"] or 2100) or ((end or 2100) <= rule["since"] and start < rule["since"]):
        return False
    hp = int(row["Мощность, л.с."] or 0)
    if rule["powers"] and not any(abs(hp - p) <= 3 for p in rule["powers"]):
        return False
    if rule["litres"] and row["Объём, л"] and abs(float(row["Объём, л"]) - rule["litres"]) > 0.15:
        return False
    box = {"автомат": "a", "автомат (робот)": "a", "механика": "m"}.get(row["Коробка"], "")
    if rule["gearbox"] and box and box != rule["gearbox"]:
        return False
    return True


def name_says(row):
    """The version's own name (either database) calls it a mild hybrid."""
    text = f"{row['Версия']} {row['Кузов']}"
    return bool(MILD_NAME.search(text)) and not FULL_HYBRID_NAME.search(text)


PHEV_OR_FULL = re.compile(r"\b\d{3}x?e\b|xdrive\d{2}e|e-?power|range extender|hybrid ?4|\bt8\b|plug|phev|\bhev\b|"
                          r"elektryczny|\bev\b|twin engine|hybrid\b(?!.*mild)", re.I)
# Makers whose database power includes the electric boost of the mild hybrid (Volvo B4 197 + 14 = 211, Mercedes EQ Boost).
BOOSTED = {"Volvo", "Mercedes-Benz"}


def same_engine(engine, item, brand):
    """autocentrum's mild-hybrid engine and our version are one engine: power ±3 (or the electric boost of
    +10...+25 for the makers that add it), litres ±0.15, a gearbox autocentrum has, no older version."""
    from autocentrum import config_parts
    diff = engine["hp"] - item["hp"]
    if not (abs(diff) <= 3 or (brand in BOOSTED and 10 <= diff <= 25)):
        return False
    if engine.get("litres") and item["litres"] and abs(float(engine["litres"]) - item["litres"]) > 0.15:
        return False
    boxes = {config_parts(c)[0] for c in engine.get("configs", []) if config_parts(c)[0]}
    if boxes and item["gearbox"] and item["gearbox"] not in boxes:
        return False
    # Volvo: the old T4 / D4 (190 PS, 2018-2019) are no B4 mild hybrids.
    if re.search(r"\bB[3-6]\b", engine["text"]) and re.search(r"\b[TD][2-8]\b", item["name"]) \
            and not re.search(r"\bB[3-6]\b", item["name"]):
        return False
    year = item["src"].get("Год версии") or ""
    if str(year).isdigit() and engine.get("from") and int(year) < engine["from"] - 1:
        return False
    return True


def ac_evidence(rows, ac):
    """id(row) -> (what autocentrum says, its year, its engine) for our rows whose engine autocentrum files
    as a mild hybrid: named so ("1.5 eTSI mHEV", "B4 Mild Hybrid"), or under "Hybrydowe" / "Hybrydowe Diesla"
    without a full-hybrid or plug-in name (330e, e-POWER, Hybrid4…)."""
    from autocentrum import FAMILY, group_body_level, match_gens, our_generations
    gens = our_generations(rows)
    out = {}
    for model in ac["models"]:
        key = (model["brand"], model["label"])
        for ac_gen in group_body_level(model["generations"]):
            if (ac_gen["to"] or 2100) < 2016:
                continue
            our_rows = [r for g in match_gens(ac_gen, gens.get(key, {})) for r in g["rows"]]
            for body in ac_gen["bodies"]:
                for engine in body["engines"]:
                    if "hp" not in engine or "plug" in engine["type"].lower():
                        continue
                    named = bool(MILD_NAME.search(engine["text"])) and not FULL_HYBRID_NAME.search(engine["text"])
                    filed = engine["type"] in ("Hybrydowe", "Hybrydowe Diesla") and not PHEV_OR_FULL.search(engine["text"])
                    if not (named or filed):
                        continue
                    family = "d" if "Diesla" in engine["type"] or "crdi" in engine["text"].lower() or "tdi" in engine["text"].lower() else None
                    for item in our_rows:
                        if item["fuel"] not in ("petrol", "diesel", "hybrid", "hybrid_diesel"):
                            continue
                        if family and FAMILY[item["fuel"]] != family:
                            continue
                        if not same_engine(engine, item, model["brand"]):
                            continue
                        old = out.get(id(item["src"]))
                        what = "в названии" if named else "в разделе «Hybrydowe»"
                        if not old or (named and old[0] != "в названии"):
                            out[id(item["src"])] = (what, engine["from"], engine["text"])
    return out


def classify(rows, ac):
    """id(row) -> decision dict for every row a rule or a database points at."""
    evidence = ac_evidence(rows, ac)
    out = {}
    for row in rows:
        # Mild hybrids exist since 2016 (owner); plug-ins and electric cars have their own excise already.
        _start, end = years_of(row["Годы (проверено)"])
        if (end or 2100) < 2016 or row["Топливо"] in ("плагин-гибрид", "электро") \
                or PLUGIN_NAME.search(f"{row['Версия']} {row['Кузов']}") or PLUGIN_NUMBER.search(row["Версия"]):
            continue
        rules = [rule for rule in RULES if rule_matches(rule, row)]
        own = name_says(row)
        source = row.get("Источник", "ultimatespecs")
        ac_says = evidence.get(id(row))
        if source == "autocentrum":
            # The row is autocentrum's own: its name is the autocentrum statement.
            ac_says = ac_says or (("в названии", None, row["Версия"]) if own else None)
            own = False
        if not (rules or own or ac_says):
            continue
        sources = []
        if own:
            sources.append("ultimatespecs: в названии версии")
        if ac_says:
            sources.append(f"autocentrum: {ac_says[0]} ({ac_says[2]})")
        if rules:
            sources.append("производитель: " + "; ".join(rule["source"] for rule in rules))
        wiki = [rule["wiki"] for rule in rules if rule["wiki"]]
        if wiki:
            sources.append("Википедия: " + " | ".join(dict.fromkeys(wiki)))
        explicit = own or (ac_says and ac_says[0] == "в названии")
        box = {"автомат": "a", "автомат (робот)": "a", "механика": "m"}.get(row["Коробка"], "")
        # A rule that needs the gearbox (eTSI: DSG only) is no proof for a version whose gearbox is unknown.
        firm = [rule for rule in rules if not rule["optional"] and (not rule["gearbox"] or box)]
        if not (rules or explicit):
            continue  # autocentrum's "Hybrydowe" alone (no maker's rule, no name) decides nothing
        # One database naming it where the maker brought the mild hybrid to this generation only later
        # (ultimatespecs "A4 2.0 TFSI MHEV 190HP" of 2017; Audi: B9 from the 2019 facelift) is not trusted.
        start, end = years_of(row["Годы (проверено)"])
        version_year = int(row["Год версии"]) if str(row.get("Год версии", "")).isdigit() else 0
        named_since = max(start or 0, version_year)
        later = [rule["since"] for rule in RULES if not rules and rule["brand"] == row["Марка"]
                 and row["Модель"] in (rule["models"] or [row["Модель"]]) and rule["gens"] and row["Поколение"] in rule["gens"]
                 and rule["since"] > named_since]
        if (firm and (wiki or own or ac_says)) or (rules and explicit) or (own and ac_says):
            status = "подтверждено"
        elif explicit and later:
            status = "проверить"
            sources.append(f"производитель: у поколения {row['Поколение']} мягкий гибрид только с {min(later)}")
        elif explicit:
            status = "одна база, прямо в названии"
        else:
            status = "проверить"
        years = [rule["since"] for rule in rules] + ([ac_says[1]] if ac_says and ac_says[1] else [])
        since = max(min(years), start or 0) if years else named_since
        system = sorted({rule["system"] for rule in rules}) or (["48V"] if re.search(r"48 ?v|etsi|e-?tec", row["Версия"], re.I) else [])
        out[id(row)] = {"status": status, "since": since, "system": "/".join(system), "sources": sources,
                        "applied": status != "проверить", "optional": False}
    twin_check(rows, out)
    return out


def _wiki_columns(brand, model, cache={}):
    """The engine columns of the model's de.wikipedia articles (WIKI, else the article "<brand> <model>")."""
    import wiki_engines
    key = (brand, model)
    if key not in cache:
        columns = []
        for title in WIKI.get(key) or [f"{brand} {model}"]:
            found, text = wiki_engines.resolve(title)
            if text and (key in WIKI or brand.split("-")[0].lower() in found.lower()):
                columns += [{**column, "article": found} for column in wiki_engines.engine_columns(text)]
        cache[key] = columns
    return cache[key]


def twin_check(rows, decisions):
    """The same engine sold with and without the mild hybrid (Kia Sportage 1.6 T-GDI 150: «48V» and plain
    columns in de.wikipedia, the plain one again after the 2025 facelift). Looked at only where one table of
    the article has both for this power, fuel, engine size and gearbox, and a plain one covers at least
    9 months of the version's years: plain ones all before the mild one -> the mild hybrid from that date
    (rounded up to the next year unless January: a car of that year may still be the plain one); otherwise
    -> "optional": the ad has to say it, the excise is not lowered by itself."""
    for row in rows:
        found = decisions.get(id(row))
        if not found or not found["applied"]:
            continue
        fuel = "diesel" if row["Топливо"] in ("дизель", "гибрид (дизель)") else "petrol"
        hp = int(row["Мощность, л.с."] or 0)
        litres = float(row["Объём, л"]) if row["Объём, л"] else None
        box = {"автомат": "a", "автомат (робот)": "a", "механика": "m"}.get(row["Коробка"], "")
        start, end = years_of(row["Годы (проверено)"])
        version_year = int(row["Год версии"]) if str(row.get("Год версии", "")).isdigit() else 0
        if start is None:
            continue
        # The years of a phase are whole years: its first and last are counted from mid-year.
        low = max(start, version_year if version_year <= (end or 2100) else 0) + 0.5
        high = end + 0.5 if end else 2100.0

        def same(column):
            return (column["fuel"] == fuel and any(abs(hp - ps) <= 3 for ps in column["ps"]) and not column["full"]
                    and (not litres or not column["litres"] or abs(litres - column["litres"]) <= 0.06)
                    and (not box or not column["boxes"] or box in column["boxes"]))

        def overlap(column):
            if not column["period"]:
                return 1.0
            return min(high, column["period"][1]) - max(low, column["period"][0])

        tables = collections.defaultdict(list)
        for column in _wiki_columns(row["Марка"], row["Модель"]):
            if same(column):
                tables[(column["article"], column["grid"])].append(column)
        for (article, _grid), columns in tables.items():
            mild = [column for column in columns if column["mild"]]
            plain = [column for column in columns if not column["mild"] and overlap(column) >= 0.75]
            if not mild or not plain:
                continue
            what = "; ".join(dict.fromkeys(f"{c['name']} {c['when']}".strip() for c in plain))
            mild_now = [column for column in mild if overlap(column) > 0 and column["period"]]
            first = min((column["period"][0] for column in mild_now), default=None)
            if first and all(column["period"] and column["period"][1] <= first + 0.1 for column in plain):
                since = int(first) if first - int(first) < 0.08 else int(first) + 1
                found["sources"].append(f"Википедия ({article}): до {mild_now[0]['when'].split('–')[0].replace('seit ', '')}"
                                        f" без мягкого гибрида — {what}; отмечено с {max(since, found['since'])}")
                found["since"] = max(since, found["since"])
                if found["since"] > (end or 2100):
                    found["applied"], found["status"] = False, "проверить"
            else:
                found["optional"] = True
                found["sources"].append(f"Википедия ({article}): тот же мотор и без мягкого гибрида — {what}")
            break


# de.wikipedia articles of the generations the rules speak about (resolved by search when a title moved).
WIKI = {
    ("Audi", "A3"): ["Audi A3 8Y"], ("Audi", "A4"): ["Audi A4 B9"], ("Audi", "A5"): ["Audi A5 F5", "Audi A5 B10"],
    ("Audi", "A6"): ["Audi A6 C8"], ("Audi", "A7"): ["Audi A7 C8"], ("Audi", "A8"): ["Audi A8 D5"],
    ("Audi", "Q3"): ["Audi Q3 F3"], ("Audi", "Q5"): ["Audi Q5 FY", "Audi Q5 GU"], ("Audi", "Q7"): ["Audi Q7 4M"],
    ("Audi", "Q8"): ["Audi Q8"],
    ("BMW", "Seria 1"): ["BMW F70"], ("BMW", "Seria 2"): ["BMW F74", "BMW U06", "BMW G42"], ("BMW", "Seria 3"): ["BMW G20"],
    ("BMW", "Seria 4"): ["BMW G22"], ("BMW", "Seria 5"): ["BMW G30", "BMW G60"], ("BMW", "Seria 7"): ["BMW G11", "BMW G70"],
    ("BMW", "Seria 8"): ["BMW G15"], ("BMW", "X1"): ["BMW U11"], ("BMW", "X2"): ["BMW U10"],
    ("BMW", "X3"): ["BMW G01", "BMW G45"], ("BMW", "X4"): ["BMW G02"], ("BMW", "X5"): ["BMW G05"], ("BMW", "X6"): ["BMW G06"],
    ("BMW", "X7"): ["BMW G07"],
    ("Mercedes-Benz", "Klasa A"): ["Mercedes-Benz Baureihe 177"], ("Mercedes-Benz", "Klasa B"): ["Mercedes-Benz Baureihe 247"],
    ("Mercedes-Benz", "CLA"): ["Mercedes-Benz C 118"], ("Mercedes-Benz", "GLA"): ["Mercedes-Benz H 247"],
    ("Mercedes-Benz", "GLB"): ["Mercedes-Benz X 247"],
    ("Mercedes-Benz", "Klasa C"): ["Mercedes-Benz Baureihe 205", "Mercedes-Benz Baureihe 206"],
    ("Mercedes-Benz", "Klasa E"): ["Mercedes-Benz Baureihe 213", "Mercedes-Benz Baureihe 214"],
    ("Mercedes-Benz", "Klasa S"): ["Mercedes-Benz Baureihe 222", "Mercedes-Benz Baureihe 223"],
    ("Mercedes-Benz", "CLS"): ["Mercedes-Benz C 257"], ("Mercedes-Benz", "GLC"): ["Mercedes-Benz X 253", "Mercedes-Benz X 254"],
    ("Mercedes-Benz", "GLE"): ["Mercedes-Benz V 167"], ("Mercedes-Benz", "GLS"): ["Mercedes-Benz X 167"],
    ("Mercedes-Benz", "CLE"): ["Mercedes-Benz CLE"], ("Mercedes-Benz", "Klasa G"): ["Mercedes-Benz Baureihe 465"],
    ("Volkswagen", "Golf"): ["VW Golf VIII"], ("Volkswagen", "Passat"): ["VW Passat B9"], ("Volkswagen", "Tiguan"): ["VW Tiguan III"],
    ("Volkswagen", "Tayron"): ["VW Tayron"], ("Volkswagen", "T-Roc"): ["VW T-Roc"],
    ("Skoda", "Octavia"): ["Škoda Octavia IV"], ("Skoda", "Superb"): ["Škoda Superb IV"], ("Skoda", "Kodiaq"): ["Škoda Kodiaq II"],
    ("Seat", "Leon"): ["Seat León IV"], ("Cupra", "Leon"): ["Seat León IV"], ("Cupra", "Formentor"): ["Cupra Formentor"],
    ("Cupra", "Terramar"): ["Cupra Terramar"],
    ("Ford", "Fiesta"): ["Ford Fiesta VII"], ("Ford", "Focus"): ["Ford Focus IV"], ("Ford", "Puma"): ["Ford Puma (2019)"],
    ("Ford", "Kuga"): ["Ford Kuga III"], ("Ford", "Transit Custom"): ["Ford Transit Custom"], ("Ford", "Tourneo Custom"): ["Ford Transit Custom"],
    ("Ford", "Transit"): ["Ford Transit"],
    ("Volvo", "XC40"): ["Volvo XC40"], ("Volvo", "XC60"): ["Volvo XC60 II"], ("Volvo", "XC90"): ["Volvo XC90 II"],
    ("Volvo", "S60"): ["Volvo S60 III"], ("Volvo", "V60"): ["Volvo V60 II"], ("Volvo", "S90"): ["Volvo S90 II"], ("Volvo", "V90"): ["Volvo V90 II"],
    ("Hyundai", "i20"): ["Hyundai i20 BC3"], ("Hyundai", "Bayon"): ["Hyundai Bayon"], ("Hyundai", "Kona"): ["Hyundai Kona"],
    ("Hyundai", "i30"): ["Hyundai i30 PD"], ("Hyundai", "Tucson"): ["Hyundai Tucson NX4", "Hyundai Tucson TL"],
    ("Kia", "Rio"): ["Kia Rio YB"], ("Kia", "Stonic"): ["Kia Stonic"], ("Kia", "Ceed"): ["Kia Ceed CD"], ("Kia", "XCeed"): ["Kia XCeed"],
    ("Kia", "ProCeed"): ["Kia Ceed CD"], ("Kia", "Sportage"): ["Kia Sportage NQ5", "Kia Sportage QL"],
    ("Mazda", "Mazda 3"): ["Mazda3 BP"], ("Mazda", "CX-30"): ["Mazda CX-30"], ("Mazda", "CX-5"): ["Mazda CX-5 KF"],
    ("Mazda", "Mazda 2"): ["Mazda2 DJ"], ("Mazda", "CX-60"): ["Mazda CX-60"], ("Mazda", "CX-80"): ["Mazda CX-80"],
    ("Nissan", "Qashqai"): ["Nissan Qashqai J12"], ("Nissan", "X-Trail"): ["Nissan X-Trail T33"],
    ("Renault", "Arkana"): ["Renault Arkana"], ("Renault", "Captur"): ["Renault Captur II"], ("Renault", "Austral"): ["Renault Austral"],
    ("Toyota", "Hilux"): ["Toyota Hilux"],
}


def wiki_evidence():
    """(brand, model) -> {"columns": [(PS, text, year, header, fuel, article)], "sentences": [(article, text)]}."""
    import wiki_engines
    out = {}
    for key, titles in WIKI.items():
        entry = {"columns": [], "sentences": [], "articles": []}
        for title in titles:
            found, text = wiki_engines.resolve(title)
            if not text:
                continue
            entry["articles"].append(found)
            entry["columns"] += [(*column, found) for column in wiki_engines.mild_columns(text)]
            entry["sentences"] += [(found, sentence) for sentence in wiki_engines.mild_sentences(text)]
        out[key] = entry
    return out
