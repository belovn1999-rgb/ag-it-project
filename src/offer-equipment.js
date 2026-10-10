/* AUTOGOOD "Oferta dla klienta" (B71): the ad's equipment in Polish, and the
 * options that sell a car first ("Wyposażenie — najważniejsze").
 *
 * Only what the seller ticked in the portal's equipment list counts (owner,
 * 2026-10-05: "сильные опции из подтверждённых данных с объявления"; the
 * free description is never mined for options). mobile.de, AutoScout24 and
 * Kleinanzeigen name their options in German, AutoScout24 FR and ParuVendu
 * in French (2026-10-06); names without a translation stay as written.
 *
 * Pure — scripts/offer-market.test.mjs runs it.
 * window.AUTOGOOD_OFFER_EQUIPMENT: translate(name), keyOptions(names, limit),
 * trustSignals(names) (warranty, service book…: not equipment), list(names).
 */
(() => {
  // What sells a car, most valuable first: [id, pattern, Polish label].
  const KEY_OPTIONS = [
    // Kleinanzeigen ticks one box for both roofs: the client is told just that.
    ["roof", /^schiebedach\/panoramadach$/i, "Szyberdach lub dach panoramiczny"],
    // otomoto's "Kamera panoramiczna 360" is a camera, not a glass roof.
    ["panorama", /^(?!schiebedach\/panoramadach$)(?!.*kamera).*(?:panorama|glasdach|panoramic|toit vitr)/i, "Dach panoramiczny"],
    ["sunroof", /^(?!schiebedach\/panoramadach$).*(?:schiebe-?(?:hebe)?dach|sunroof|szyberdach|toit ouvrant)/i, "Szyberdach"],
    // Polish: the upholstery only ("Kierownica skórzana" is a steering wheel).
    ["leather", /(?:voll|teil)?leder(?!lenkrad|schaltknauf)|leather|tapicerka[^,]*skór|skórzana tapicerka|(?:sellerie|int[ée]rieur|si[èe]ges?) (?:mi-)?cuir|cuir (?:int[ée]gral|partiel)|^(?:mi-)?cuir$/i, "Tapicerka skórzana"],
    ["matrix", /matrix|laser-?licht|laser light/i, "Reflektory Matrix LED"],
    ["led", /^(?!xenon-\/led-scheinwerfer$).*(?:voll-?led|led-?scheinwerfer|led headlights|reflektory led|phares (?:full |au |à )?led)/i, "Reflektory LED"],
    // Kleinanzeigen: one box for xenon or LED.
    ["lights", /^xenon-\/led-scheinwerfer$/i, "Reflektory ksenonowe lub LED"],
    ["acc", /abstandstempomat|adaptive[rn]? (?:cruise|tempomat)|\bacc\b(?=.*(?:cruise|tempomat|farthåll))|aktywny tempomat|r[ée]gulateur (?:de vitesse )?adaptatif/i, "Aktywny tempomat (ACC)"],
    ["hud", /head-?up|t[êe]te haute/i, "Wyświetlacz Head-Up"],
        // Not "360 kr i årsskatt" (Blocket's road tax): degrees or a camera word.
    ["camera360", /360\s?°|(?:kamer|camer|cam[ée]r|камер)[^,]*360|360[^,]*(?:kamer|camer|cam[ée]r|камер|grad|view)|surround view|area view|umgebungskamera/i, "Kamera 360°"],
    // A front camera alone is no reversing camera.
    ["camera", /^(?!vooruitrijcamera$|cam[ée]ra avant$|kamera przednia$).*(?:rückfahrkamera|einparkhilfe.*kamera|kamera|camera|cam[ée]ra)/i, "Kamera cofania"],
    ["nav", /navigation|\bnavi\b|nawigac/i, "Nawigacja"],
    ["auxHeating", /standheizung|webasto|ogrzewanie postojowe|chauffage (?:stationnaire|auxiliaire|additionnel)/i, "Ogrzewanie postojowe"],
    ["ventSeats", /sitzbelüftung|belüftete sitze|ventilated|wentylowan|si[èe]ges? ventil[ée]s?/i, "Wentylowane fotele"],
    ["massage", /massage/i, "Fotele z masażem"],
    ["heatedSeats", /sitzheizung|heated seat|podgrzewane fotele|si[èe]ges? chauffants?/i, "Podgrzewane fotele"],
    ["heatedWheel", /beheizbares lenkrad|lenkradheizung|heated steering|podgrzewana kierownica|volant chauffant/i, "Podgrzewana kierownica"],
    ["memory", /memory|elektr(?:\.|ische)? sitzeinstellung|elektrisch verstellbare sitze|si[èe]ges? [ée]lectriques?|m[ée]moire/i, "Elektryczne fotele"],
    ["sound", /harman|bose|burmester|bang\s?&?\s?olufsen|\bb&o\b|meridian|\bjbl\b|soundsystem|sound system|focal/i, "System audio premium"],
    ["air", /luftfederung|air suspension|zawieszenie pneumatyczne|suspension pneumatique/i, "Zawieszenie pneumatyczne"],
    ["awd", /allrad|4x4|quattro|xdrive|4motion|4matic|transmission int[ée]grale/i, "Napęd 4x4"],
    ["tow", /anhängerkupplung|\bahk\b|tow ?bar|hak holownicz|attache.?remorque|attelage/i, "Hak holowniczy"],
    ["keyless", /keyless|schlüssellos|kessy|smart key|sans cl[ée]/i, "Dostęp bezkluczykowy"],
    ["tailgate", /elektr(?:\.|ische)? heckklappe|power tailgate|elektryczna klapa|hayon [ée]lectrique|coffre [ée]lectrique/i, "Elektryczna klapa bagażnika"],
    ["digital", /volldigital|digitales? (?:cockpit|kombiinstrument)|virtual cockpit|cockpit (?:virtuel|num[ée]rique|digital)|combin[ée] (?:d'instruments? )?num[ée]rique/i, "Cyfrowe zegary"],
    ["carplay", /carplay|android auto/i, "Apple CarPlay / Android Auto"],
    ["blindSpot", /totwinkel|blind spot|martwego pola|angle mort/i, "Asystent martwego pola"],
    ["lane", /spurhalte|spurwechsel|lane assist|pasa ruchu|maintien (?:dans la|de) voie|franchissement/i, "Asystent pasa ruchu"],
    ["parkAssist", /selbstlenkend|parkassist|park assist|parklenk|stationnement automatique/i, "Asystent parkowania"],
    ["climate", /(?:2|3|4)-zonen|mehrzonen|klimaautomatik|climatisation automatique|bi-?zone|tri-?zone/i, "Klimatyzacja automatyczna"],
  ];

  // The same options as the other portals name them (2026-10-10): av.by in
  // Russian, otomoto in Polish, Marktplaats / 2dehands in Dutch and French,
  // Blocket in Swedish. \b knows no Cyrillic edge: whole names or substrings.
  const MORE_NAMES = {
    panorama: [/панорамн\S* крыш/i, /panoramatak|panoramaglastak|panormatak|^glastak$|glastak(?!.*lucka)/i, /panoramique/i],
    sunroof: [/^люк$/i, /taklucka|^soltak$|elektrisk(?:t)? soltak/i, /^open dak$|schuifdak|schuif-?\/?kanteldak/i],
    leather: [/натуральн\S* кож/i, /(?:hel|halv|del)skinn(?!s?ratt)|skinnklädsel|skinninredning|läderklädsel|läderklädda|lädersäten?|nappaklädsel|nappaläderklädsel|interiör i skinn|^skinn$|^läder$/i],
    matrix: [/фары (?:матричные|лазерные)/i, /reflektory laserowe/i, /phares? laser/i],
    led: [/фары светодиодные|светодиодные фары/i, /lampy przednie w technologii led/i, /led[- ]?strålkastare|led\s*\((?:hel|halv)ljus\)|full[- ]?led/i, /koplampe?n? volledig led|volledig led koplamp|phares enti[èe]rement led/i],
    acc: [/круиз-контроль адаптивный|адаптивный круиз/i, /tempomat (?:adaptacyjny|przewiduj)/i, /adaptiv(?:a)? farthållare|adaptiv fartkontroll|pilot assist/i, /adaptive cruise control|r[ée]gulateur de distance/i],
    hud: [/проекция на лобовое/i, /head[- ]up/i],
    camera: [/камера (?:заднего|переднего) вида/i, /backkamera|parkeringskamera|bakkamera/i],
    nav: [/навигац/i, /navigat|\bgps\b|google maps/i, /navigatie/i],
    auxHeating: [/автономный отопитель|вебасто/i, /bränsledriven värmare|bränslevärm|parkeringsvärmare|dieselvärmare|bensinvärmare|eberspächer|fjärrstyrd värmare/i, /standkachel|chauffage de stationnement/i],
    ventSeats: [/вентиляция сидений/i, /ventilerade (?:säten|stolar)|(?:säten|stolar) med ventilation|kylda (?:säten|stolar)/i, /stoelventilatie|zetelventilatie|geventileerde (?:stoelen|zetels)/i],
    massage: [/массаж/i, /masa[żz]/i, /massant/i],
    heatedSeats: [/обогрев сидений/i, /podgrzewan[ya] fotel|ogrzewane siedzenia/i, /sätesvärme|stolsvärme|uppvärmda (?:fram|bak)?säten|uppvärmda fram|uppvärmda säten|eluppvärmda (?:fram)?(?:säten|stolar)|(?:fram)?stolar eluppvärmda|stolar med .*värme/i, /stoelverwarming|zetelverwarming|verwarm(?:de|ing) (?:voor)?(?:stoelen|zetels)/i],
    heatedWheel: [/обогрев руля/i, /kierownica ogrzewana/i, /rattvärme|uppvärmd ratt|eluppvärmd ratt/i, /stuur(?:wiel)?verwarming|verwarmd stuur(?:wiel)?/i],
    memory: [/память положения сидений|электрорегулировка сидений/i, /z pamięcią ustawienia|elektrycznie ustawiany fotel/i, /säten? med minne|stol(?:ar)? .*med minne|elstol|elmanövrerat (?:förar|passagerar)?säte|elektriska säten|elektriskt justerbara säten/i, /elektrische stoelverstelling|elektrisch verstelbare (?:stoelen|zetels)/i],
    air: [/пневмоподвеск/i, /luftfjädring|nivåreglering/i, /luchtvering/i],
    awd: [/полный привод/i, /fyrhjulsdri|\bawd\b|\b4wd\b/i],
    tow: [/фаркоп/i, /^hak$/i, /dragkrok/i, /trekhaak/i],
    keyless: [/бе[сc]ключев/i, /nyckelfri|nyckellös/i],
    tailgate: [/электропривод двери багажника|открытие багажника без рук/i, /el ?baklucka|el ?bagagelucka|elektrisk (?:bak|bagage)lucka|(?:bak|bagage)lucka.*(?:eldriven|elmanövrerad)/i, /elektrische (?:achterklep|koffer(?:klep)?)|hayon arri[èe]re [ée]lectrique/i],
    digital: [/электронная приборная панель/i, /digital(?:t|a)? (?:cockpit|förardisplay|instrumentkluster|instrumentpanel|mätarhus)|3d förardisplay/i, /digita(?:al|le) (?:combi-?instrument|instrumentenpaneel|dashboard)|combin[ée] de bord (?:enti[èe]rement )?num[ée]rique/i],
    blindSpot: [/м[её]ртв\S* зон/i, /döda?[- ]vinkel|\bblis\b/i, /dode-?hoek/i],
    lane: [/удержание в полосе/i, /filhållning|filvarn|vägfil|lane keeping|kurshållning|avåkningsvarn/i, /lane (?:keeping|departure)|rijstrook|sortie de voie/i],
    parkAssist: [/автопарковк/i, /niezależny system parkowania/i, /aktiv parkeringshjälp|parkeringsassistent|auto ?park|park assist pilot|självparkering/i, /parkeerassistent|pilote automatique de stationnement/i],
    climate: [/климат-контроль/i, /klimatyzacja automatyczna/i, /klimatanläggning|klimatzon|(?:2|3|4|två|tre|fyra)[- ]?zon|\b[ae]cc\b/i, /klimaatregeling|climate control|air conditionn[ée] automatique/i],
    roof: [/^soltak\/glastak$/i],
    camera360: [/360[- ]?graders? kamera|360 kamera/i],
    sound: [/bowers\s?&?\s?wilkins|\bb&w\b|premiumljud/i, /syst[èe]me audio/i],
  };
  const matches = (id, pattern, name) => pattern.test(name) || (MORE_NAMES[id] || []).some((more) => more.test(name));

  // Not equipment: what the seller promises about the car (shown by the
  // seller and the verdict, not among the options).
  const TRUST = [
    ["warranty", /^garantie$|gebrauchtwagengarantie|warranty|^garanti$|garanti ingår|\d+ (?:mån(?:aders?)?|års?) garanti(?!.*möjlig)/i, "Gwarancja sprzedawcy"],
    ["serviceBook", /scheckheft|service ?book|książka serwisowa|carnet d'entretien|servicehistorik(?! saknas)|servicebok|serviceprogram har följts/i, "Książka serwisowa"],
    ["serviceNew", /inspektion neu|service neu|frisch (?:gewartet|inspiziert)/i, "Świeży serwis"],
    ["nonSmoker", /nichtraucher|non-?smok|non[- ]fumeur|rökfri|icke-?rökare|ickerökare/i, "Auto dla niepalących"],
  ];
  // Drive, tyres and the like: facts, not selling options; kept in the full list.
  const PLAIN = /^(frontantrieb|heckantrieb|sommerreifen|pannenkit|tuner\/radio|radio\/tuner|radio|usb|mp3|cd|aux|cd или mp3|framhjulsdrift|bakhjulsdrift|tvåhjulsdriven|sommardäck.*|vinterdäck.*|radio fm|usb-?[ac]?|aux-ingång|cd-spelare|12 ?v-uttag)$/i;

  // The full list in Polish: mobile.de and AutoScout24 names.
  const DICTIONARY = {
    "abs": "ABS", "antiblockiersystem": "ABS", "esp": "ESP", "traktionskontrolle": "Kontrola trakcji",
    "abgedunkelte scheiben": "Przyciemniane szyby", "getönte scheiben": "Przyciemniane szyby",
    "abstandstempomat": "Aktywny tempomat (ACC)", "abstandswarner": "Ostrzeganie o odległości",
    "allwetterreifen": "Opony całoroczne", "winterreifen": "Opony zimowe", "sommerreifen": "Opony letnie",
    "android auto": "Android Auto", "apple carplay": "Apple CarPlay", "armlehne": "Podłokietnik",
    "beheizbares lenkrad": "Podgrzewana kierownica", "berganfahrassistent": "Asystent ruszania pod górę",
    "blendfreies fernlicht": "Adaptacyjne światła drogowe", "fernlichtassistent": "Asystent świateł drogowych",
    "bluetooth": "Bluetooth", "bordcomputer": "Komputer pokładowy",
    "elektr. fensterheber": "Elektryczne szyby", "elektrische fensterheber": "Elektryczne szyby",
    "elektr. seitenspiegel": "Elektryczne lusterka", "elektrische seitenspiegel": "Elektryczne lusterka",
    "elektr. seitenspiegel anklappbar": "Elektrycznie składane lusterka",
    "elektr. sitzeinstellung": "Elektryczna regulacja foteli", "elektr. wegfahrsperre": "Immobilizer", "wegfahrsperre": "Immobilizer",
    "freisprecheinrichtung": "Zestaw głośnomówiący", "frontantrieb": "Napęd na przód", "heckantrieb": "Napęd na tył",
    "allradantrieb": "Napęd 4x4", "garantie": "Gwarancja", "gepäckraumabtrennung": "Siatka oddzielająca bagażnik",
    "geschwindigkeitsbegrenzer": "Ogranicznik prędkości", "geschwindigkeits-begrenzungsanlage": "Ogranicznik prędkości",
    "innenspiegel autom. abblendend": "Lusterko fotochromatyczne", "innenspiegel automatisch abblendend": "Lusterko fotochromatyczne",
    "inspektion neu": "Świeży serwis", "isofix": "Isofix", "kurvenlicht": "Doświetlanie zakrętów",
    "led-scheinwerfer": "Reflektory LED", "voll-led scheinwerfer": "Reflektory Full LED", "led-tagfahrlicht": "Światła dzienne LED",
    "tagfahrlicht": "Światła dzienne", "lederlenkrad": "Skórzana kierownica", "leichtmetallfelgen": "Felgi aluminiowe",
    "alufelgen": "Felgi aluminiowe", "lichtsensor": "Czujnik zmierzchu", "lordosenstütze": "Podparcie lędźwiowe",
    "multifunktionslenkrad": "Kierownica wielofunkcyjna", "musikstreaming integriert": "Streaming muzyki",
    "müdigkeitswarner": "Wykrywanie zmęczenia", "müdigkeitswarnsystem": "Wykrywanie zmęczenia",
    "navigationssystem": "Nawigacja", "nebelscheinwerfer": "Światła przeciwmgielne", "nichtraucher-fahrzeug": "Auto dla niepalących",
    "notbremsassistent": "Asystent hamowania awaryjnego", "notrufsystem": "System eCall", "pannenkit": "Zestaw naprawczy",
    "radio dab": "Radio DAB", "dab-radio": "Radio DAB", "tuner/radio": "Radio", "radio": "Radio", "mp3": "MP3",
    "regensensor": "Czujnik deszczu", "reifendruckkontrolle": "Czujniki ciśnienia w oponach", "reifendruckkontrollsystem": "Czujniki ciśnienia w oponach",
    "scheckheftgepflegt": "Książka serwisowa", "schlüssellose zentralverriegelung (keyless)": "Dostęp bezkluczykowy",
    "schlüssellose zentralverriegelung": "Dostęp bezkluczykowy", "servolenkung": "Wspomaganie kierownicy",
    "sitzheizung": "Podgrzewane fotele", "soundsystem": "System audio", "sprachsteuerung": "Sterowanie głosowe",
    "spurhalteassistent": "Asystent pasa ruchu", "start/stopp-automatik": "Start/Stop", "tempomat": "Tempomat",
    "totwinkel-assistent": "Asystent martwego pola", "touchscreen": "Ekran dotykowy", "usb": "USB",
    "verkehrszeichenerkennung": "Rozpoznawanie znaków", "winterpaket": "Pakiet zimowy",
    "zentralverriegelung": "Centralny zamek", "zentralverriegelung mit funkfernbedienung": "Centralny zamek z pilotem",
    "2-zonen-klimaautomatik": "Klimatyzacja 2-strefowa", "3-zonen-klimaautomatik": "Klimatyzacja 3-strefowa",
    "4-zonen-klimaautomatik": "Klimatyzacja 4-strefowa", "klimaautomatik": "Klimatyzacja automatyczna", "klimaanlage": "Klimatyzacja",
    "airbag hinten": "Poduszki tylne", "beifahrerairbag": "Poduszka pasażera", "fahrerairbag": "Poduszka kierowcy",
    "kopfairbag": "Kurtyny powietrzne", "seitenairbag": "Poduszki boczne", "anhängerkupplung": "Hak holowniczy",
    "bi-xenon scheinwerfer": "Reflektory bi-ksenonowe", "xenonscheinwerfer": "Reflektory ksenonowe",
    "einparkhilfe": "Czujniki parkowania", "einparkhilfe rückfahrkamera": "Kamera cofania", "rückfahrkamera": "Kamera cofania",
    "einparkhilfe sensoren hinten": "Czujniki parkowania tył", "einparkhilfe sensoren vorne": "Czujniki parkowania przód",
    "teilb. rücksitzbank": "Dzielona kanapa", "teilleder": "Tapicerka półskórzana", "lederausstattung": "Tapicerka skórzana", "einparkhilfe selbstlenkend": "Asystent parkowania", "panoramadach": "Dach panoramiczny", "schiebedach": "Szyberdach",
    "head-up display": "Wyświetlacz Head-Up", "standheizung": "Ogrzewanie postojowe", "sitzbelüftung": "Wentylowane fotele",
    "massagesitze": "Fotele z masażem", "elektr. heckklappe": "Elektryczna klapa bagażnika", "luftfederung": "Zawieszenie pneumatyczne",
    "ambiente-beleuchtung": "Oświetlenie ambientowe", "sportsitze": "Fotele sportowe", "sportpaket": "Pakiet sportowy",
    "sportfahrwerk": "Zawieszenie sportowe", "dachreling": "Relingi dachowe", "alarmanlage": "Alarm",
    "induktionsladen für smartphones": "Ładowarka indukcyjna", "wlan / wifi hotspot": "Hotspot Wi-Fi",
    "volldigitales kombiinstrument": "Cyfrowe zegary", "beheizbare frontscheibe": "Podgrzewana przednia szyba",
    "laserlicht": "Reflektory laserowe", "adaptives kurvenlicht": "Adaptacyjne doświetlanie zakrętów",
    "360°-kamera": "Kamera 360°", "elektr. sitzeinstellung mit memory": "Elektryczne fotele z pamięcią",
    "partikelfilter": "Filtr cząstek stałych", "nachtsichtassistent": "Noktowizor", "spurwechselassistent": "Asystent zmiany pasa",
    "skisack": "Otwór na narty", "ausparkassistent": "Asystent wyjazdu z parkingu", "e10-geeignet": "Paliwo E10", "allwetterreifen (ganzjahresreifen)": "Opony całoroczne", "dachträger": "Bagażnik dachowy", "tuning": "Tuning", "sportlenkrad": "Kierownica sportowa",
    // Kleinanzeigen's own boxes.
    "antiblockiersystem (abs)": "ABS", "radio/tuner": "Radio", "xenon-/led-scheinwerfer": "Reflektory ksenonowe lub LED",
    "schiebedach/panoramadach": "Szyberdach lub dach panoramiczny",
    // AutoScout24 FR and ParuVendu (French).
    "accoudoir": "Podłokietnik", "affichage tête haute": "Wyświetlacz Head-Up", "aide parking": "Czujniki parkowania",
    "aides au stationnement": "Czujniki parkowania", "airbag conducteur": "Poduszka kierowcy", "airbag passager": "Poduszka pasażera",
    "airbag frontaux": "Poduszki przednie", "airbags frontaux": "Poduszki przednie", "airbags frontaux + latéraux": "Poduszki przednie i boczne",
    "airbags latéraux": "Poduszki boczne", "airbags rideaux": "Kurtyny powietrzne", "anti-patinage": "Kontrola trakcji",
    "assistant au freinage d'urgence": "Asystent hamowania awaryjnego", "assistant de démarrage en côte": "Asystent ruszania pod górę",
    "attache remorque": "Hak holowniczy", "caméra d'aide au stationnement": "Kamera cofania", "caméra de recul": "Kamera cofania",
    "capteurs d'aide au stationnement arrière": "Czujniki parkowania tył", "capteurs d'aide au stationnement avant": "Czujniki parkowania przód",
    "climatisation": "Klimatyzacja", "climatisation automatique": "Klimatyzacja automatyczna",
    "climatisation automatique, 2 zones": "Klimatyzacja 2-strefowa", "climatisation automatique, 3 zones": "Klimatyzacja 3-strefowa",
    "climatisation automatique, 4 zones": "Klimatyzacja 4-strefowa", "détecteur de lumière": "Czujnik zmierzchu", "détecteur de pluie": "Czujnik deszczu",
    "ecran tactile": "Ekran dotykowy", "écran tactile": "Ekran dotykowy", "feux anti-brouillard": "Światła przeciwmgielne",
    "fermeture centralisée": "Centralny zamek", "verrouillage centralisé": "Centralny zamek", "filtre à particules": "Filtr cząstek stałych",
    "filtres à particules (fap)": "Filtr cząstek stałych", "jantes alliage": "Felgi aluminiowe", "limiteur de vitesse": "Ogranicznik prędkości",
    "ordinateur de bord": "Komputer pokładowy", "phares full led": "Reflektory Full LED", "phares au led": "Reflektory LED",
    "phares de jour": "Światła dzienne", "phares directionnels": "Doświetlanie zakrętów", "phares xénon": "Reflektory ksenonowe",
    "porte-bagages": "Bagażnik dachowy", "barres de toit": "Relingi dachowe", "régulateur de vitesse": "Tempomat",
    "régulateur de vitesse adaptatif": "Aktywny tempomat (ACC)", "rétroviseurs latéraux électriques": "Elektryczne lusterka",
    "sellerie cuir": "Tapicerka skórzana", "intérieur cuir": "Tapicerka skórzana", "sellerie mi-cuir": "Tapicerka półskórzana",
    "sièges chauffants": "Podgrzewane fotele", "sièges sport": "Fotele sportowe", "sièges électriques": "Elektryczna regulacja foteli",
    "suspension pneumatique": "Zawieszenie pneumatyczne", "système d'aide au stationnement automatique": "Asystent parkowania",
    "système d'appel d'urgence": "System eCall", "système de freinage antiblocage": "ABS", "système de navigation": "Nawigacja",
    "toit ouvrant": "Szyberdach", "toit panoramique": "Dach panoramiczny", "trappe à ski": "Otwór na narty",
    "vitres électriques": "Elektryczne szyby", "vitres teintées": "Przyciemniane szyby", "volant multifonctions": "Kierownica wielofunkcyjna",
    "volant cuir": "Skórzana kierownica", "volant chauffant": "Podgrzewana kierownica", "éclairage d'ambiance": "Oświetlenie ambientowe",
    "direction assistée": "Wspomaganie kierownicy", "antidémarrage électronique": "Immobilizer", "alarme": "Alarm",
    "radar de recul": "Czujniki parkowania tył", "kit mains libres": "Zestaw głośnomówiący", "non-fumeur": "Auto dla niepalących",
    "carnet d'entretien": "Książka serwisowa",
    // av.by (Russian, 2026-10-10; "беcключевой" is written with a Latin c there).
    "антипробуксовочная": "Kontrola trakcji", "иммобилайзер": "Immobilizer", "сигнализация": "Alarm",
    "подушки передние": "Poduszki przednie", "подушки боковые": "Poduszki boczne", "подушки задние": "Poduszki tylne",
    "подушки коленные": "Poduszki kolanowe", "датчик дождя": "Czujnik deszczu", "камера заднего вида": "Kamera cofania",
    "камера переднего вида": "Kamera przednia", "камера 360": "Kamera 360°", "парктроники": "Czujniki parkowania",
    "контроль мертвых зон на зеркалах": "Asystent martwego pola", "легкосплавные диски": "Felgi aluminiowe",
    "рейлинги на крыше": "Relingi dachowe", "фаркоп": "Hak holowniczy", "люк": "Szyberdach", "панорамная крыша": "Dach panoramiczny",
    "фары ксеноновые": "Reflektory ksenonowe", "фары противотуманные": "Światła przeciwmgielne", "фары светодиодные": "Reflektory LED",
    "фары матричные": "Reflektory Matrix LED", "фары лазерные": "Reflektory laserowe",
    "климат-контроль однозонный": "Klimatyzacja automatyczna", "климат-контроль многозонный": "Klimatyzacja wielostrefowa",
    "кондиционер": "Klimatyzacja", "обогрев сидений": "Podgrzewane fotele", "обогрев лобового стекла": "Podgrzewana przednia szyba",
    "обогрев зеркал": "Podgrzewane lusterka", "обогрев руля": "Podgrzewana kierownica", "автономный отопитель": "Ogrzewanie postojowe",
    "aux": "AUX", "cd или mp3": "CD / MP3", "мультимедийный экран": "Ekran multimedialny", "штатная навигация": "Nawigacja",
    "автозапуск двигателя": "Zdalny rozruch silnika", "круиз-контроль": "Tempomat", "круиз-контроль адаптивный": "Aktywny tempomat (ACC)",
    "управление мультимедиа с руля": "Kierownica wielofunkcyjna", "электрорегулировка сидений": "Elektryczna regulacja foteli",
    "передние электро-стеклоподъёмники": "Elektryczne szyby przednie", "задние электро-стеклоподъёмники": "Elektryczne szyby tylne",
    "датчики давления в шинах": "Czujniki ciśnienia w oponach", "обнаружение пешеходов": "Wykrywanie pieszych",
    "система экстренного торможения": "Asystent hamowania awaryjnego", "блокировка замков задних дверей": "Blokada tylnych drzwi",
    "автопарковка": "Asystent parkowania", "доводчики дверей": "Domykanie drzwi", "удержание в полосе": "Asystent pasa ruchu",
    "распознавание дорожных знаков": "Rozpoznawanie znaków", "ночное видение": "Noktowizor",
    "система помощи при подъеме": "Asystent ruszania pod górę", "система помощи при спуске": "Asystent zjazdu ze wzniesienia",
    "проекция на лобовое стекло": "Wyświetlacz Head-Up", "заводская тонировка": "Przyciemniane szyby", "защита картера": "Osłona silnika",
    "электрические пороги": "Elektryczne stopnie", "штатные шторки на окна": "Rolety przeciwsłoneczne",
    "самозатемняющееся зеркало заднего вида": "Lusterko fotochromatyczne", "электронная приборная панель": "Cyfrowe zegary",
    "адаптивное освещение": "Światła adaptacyjne", "автоматический дальный свет": "Asystent świateł drogowych",
    "омыватель фар": "Spryskiwacze reflektorów", "автоматический корректор фар": "Automatyczna regulacja reflektorów",
    "вентиляция сидений": "Wentylowane fotele", "wi-fi": "Hotspot Wi-Fi", "голосовое управление": "Sterowanie głosowe",
    "старт-стоп": "Start/Stop", "массаж сидений": "Fotele z masażem", "электроскладывание зеркал": "Elektrycznie składane lusterka",
    "память положения сидений": "Pamięć ustawień foteli", "электропривод двери багажника": "Elektryczna klapa bagażnika",
    "беспроводная зарядка": "Ładowarka indukcyjna", "открытие багажника без рук": "Bezdotykowe otwieranie bagażnika",
    "пневмоподвеска": "Zawieszenie pneumatyczne", "беcключевой доступ": "Dostęp bezkluczykowy", "бесключевой доступ": "Dostęp bezkluczykowy",
    "розетка 12v": "Gniazdo 12 V", "розетка 220v": "Gniazdo 220 V", "розетка 110v": "Gniazdo 110 V",
    "электрорегулировка руля": "Elektryczna regulacja kierownicy",
    // Marktplaats / 2dehands (Dutch) and 2ememain (French), 2026-10-10: the platform's own list.
    "360° camera": "Kamera 360°", "caméra 360°": "Kamera 360°", "4x4": "Napęd 4x4",
    "aangepast voor mindervaliden": "Przystosowany dla niepełnosprawnych", "adapté aux personnes handicapées": "Przystosowany dla niepełnosprawnych",
    "achteruitrijcamera": "Kamera cofania", "adaptieve lichten": "Reflektory adaptacyjne",
    "adaptive cruise control": "Aktywny tempomat (ACC)", "régulateur de distance": "Aktywny tempomat (ACC)",
    "airbags": "Poduszki powietrzne", "airconditioning": "Klimatyzacja", "air conditionné": "Klimatyzacja", "alarm": "Alarm",
    "automatische klimaatregeling": "Klimatyzacja automatyczna", "climate control": "Klimatyzacja automatyczna", "air conditionné automatique": "Klimatyzacja automatyczna",
    "autonomous driving": "Asystent jazdy autonomicznej", "conduite autonome": "Asystent jazdy autonomicznej",
    "bi-directioneel laden": "Ładowanie dwukierunkowe", "charge bidirectionnelle": "Ładowanie dwukierunkowe",
    "bi-xenon koplampen": "Reflektory bi-ksenonowe", "phares bi-xénon": "Reflektory bi-ksenonowe",
    "bochtverlichting": "Doświetlanie zakrętów", "feux de virage": "Doświetlanie zakrętów", "boordcomputer": "Komputer pokładowy",
    "centrale vergrendeling": "Centralny zamek", "verrouillage central": "Centralny zamek", "cruise control": "Tempomat",
    "dakrails": "Relingi dachowe", "digitale radio-ontvangst": "Radio DAB", "réception radio numérique": "Radio DAB",
    "dodehoekdetectie": "Asystent martwego pola", "avertisseur d'angle mort": "Asystent martwego pola",
    "electronic stability program (esp)": "ESP",
    "elektrische achterklep": "Elektryczna klapa bagażnika", "elektrische koffer": "Elektryczna klapa bagażnika", "hayon arrière électrique": "Elektryczna klapa bagażnika",
    "elektrische buitenspiegels": "Elektryczne lusterka", "rétroviseurs électriques": "Elektryczne lusterka", "elektrische ramen": "Elektryczne szyby",
    "elektrische stoelverstelling": "Elektryczna regulacja foteli",
    "elektronische parkeerrem": "Elektroniczny hamulec postojowy", "frein de stationnement électronique": "Elektroniczny hamulec postojowy",
    "emergency brake assist": "Asystent hamowania awaryjnego", "assistance au freinage d'urgence": "Asystent hamowania awaryjnego",
    "geheel digitaal combi-instrument": "Cyfrowe zegary", "combiné de bord entièrement numérique": "Cyfrowe zegary",
    "grootlichtassistent": "Asystent świateł drogowych", "assistant feux de route": "Asystent świateł drogowych",
    "hill-hold control": "Asystent ruszania pod górę", "aide au démarrage en côte": "Asystent ruszania pod górę",
    "inductieladen voor smartphones": "Ładowarka indukcyjna", "chargement par induction pour smartphones": "Ładowarka indukcyjna",
    "keyless entry": "Dostęp bezkluczykowy", "verrouillage centralisé sans clé": "Dostęp bezkluczykowy",
    "koplamp volledig led": "Reflektory Full LED", "phares entièrement led": "Reflektory Full LED",
    "lane departure warning": "Ostrzeganie o opuszczeniu pasa", "avertissement de sortie de voie": "Ostrzeganie o opuszczeniu pasa",
    "lane keeping assist": "Asystent pasa ruchu", "aide au maintien de voie": "Asystent pasa ruchu",
    "phares laser": "Reflektory laserowe",
    "led dagrijverlichting": "Światła dzienne LED", "feux de jour led": "Światła dzienne LED",
    "led verlichting": "Oświetlenie LED", "éclairage led": "Oświetlenie LED", "lederen bekleding": "Tapicerka skórzana",
    "lichtmetalen velgen": "Felgi aluminiowe", "jantes en alliage léger": "Felgi aluminiowe",
    "capteur de lumière": "Czujnik zmierzchu", "luifel": "Markiza", "auvent": "Markiza",
    "metallic lak": "Lakier metalik", "metaalkleur": "Lakier metalik", "peinture métallisée": "Lakier metalik",
    "mistlampen": "Światła przeciwmgielne", "phares antibrouillard": "Światła przeciwmgielne",
    "multifunctioneel stuurwiel": "Kierownica wielofunkcyjna", "volant multifonction": "Kierownica wielofunkcyjna",
    "navigatiesysteem": "Nawigacja", "night view assist": "Noktowizor", "aide à la vision nocturne": "Noktowizor",
    "open dak": "Szyberdach", "panoramadak": "Dach panoramiczny",
    "parkeerassistent": "Asystent parkowania", "pilote automatique de stationnement": "Asystent parkowania",
    "parkeercamera": "Kamera parkowania", "caméra": "Kamera parkowania",
    "parkeersensor": "Czujniki parkowania", "capteur de stationnement": "Czujniki parkowania", "capteur de pluie": "Czujnik deszczu",
    "schuifdeur": "Drzwi przesuwne", "porte coulissante": "Drzwi przesuwne", "skiluik": "Otwór na narty", "trappe à skis": "Otwór na narty",
    "sound system": "System audio", "système audio": "System audio", "sportpakket": "Pakiet sportowy", "pack sport": "Pakiet sportowy",
    "sportstoelen": "Fotele sportowe", "spraakbediening": "Sterowanie głosowe", "commande vocale": "Sterowanie głosowe",
    "standkachel": "Ogrzewanie postojowe", "chauffage de stationnement": "Ogrzewanie postojowe",
    "start-stop-systeem": "Start/Stop", "système start/stop": "Start/Stop", "startonderbreker": "Immobilizer", "interruption de démarrage": "Immobilizer",
    "stoelmassage": "Fotele z masażem", "sièges massants": "Fotele z masażem", "stoelventilatie": "Wentylowane fotele", "sièges ventilés": "Wentylowane fotele",
    "stoelverwarming": "Podgrzewane fotele", "zetelverwarming": "Podgrzewane fotele", "stuurwielverwarming": "Podgrzewana kierownica",
    // 2ememain names the traction control (value 11800, "Traction-control" on the Dutch sites) "Anti démarrage".
    "traction-control": "Kontrola trakcji", "anti démarrage": "Kontrola trakcji",
    "trekhaak": "Hak holowniczy", "attache-remorque": "Hak holowniczy",
    "verblindingsvrij grootlicht": "Adaptacyjne światła drogowe", "feux de route anti-éblouissement": "Adaptacyjne światła drogowe",
    "verkeersbordherkenning": "Rozpoznawanie znaków", "détection des panneaux routiers": "Rozpoznawanie znaków",
    "vermoeidheidsdetectie": "Wykrywanie zmęczenia", "système de détection de la somnolence": "Wykrywanie zmęczenia",
    "verwarmde buitenspiegels": "Podgrzewane lusterka", "rétroviseurs extérieur chauffants": "Podgrzewane lusterka",
    "verwarming stoelen achter": "Podgrzewane tylne fotele", "sièges chauffants arrière": "Podgrzewane tylne fotele",
    "vooruitrijcamera": "Kamera przednia", "caméra avant": "Kamera przednia",
    "warmtepomp": "Pompa ciepła", "pompe à chaleur": "Pompa ciepła", "winterpakket": "Pakiet zimowy", "pack hiver": "Pakiet zimowy",
    "xenon verlichting": "Reflektory ksenonowe", "phares au xénon": "Reflektory ksenonowe",
    // Blocket (Swedish, 2026-10-10).
    "backkamera": "Kamera cofania", "parkeringskamera bak": "Kamera cofania", "360° kamera": "Kamera 360°", "360°-kamera": "Kamera 360°",
    "dragkrok": "Hak holowniczy", "dragkrok, fast": "Hak holowniczy (stały)", "dragkrok, avtagbar/svängbar": "Hak holowniczy (odpinany/chowany)",
    "dragkrok, elektrisk": "Hak holowniczy (elektryczny)", "infällbar dragkrok": "Hak holowniczy (chowany)",
    "avtagbar dragkrok": "Hak holowniczy (odpinany)", "farthållare": "Tempomat", "adaptiv farthållare": "Aktywny tempomat (ACC)",
    "fartbegränsare": "Ogranicznik prędkości", "klimatanläggning": "Klimatyzacja automatyczna", "aircondition": "Klimatyzacja",
    "ac och klimatanläggning": "Klimatyzacja", "klimatanläggning 2-zons": "Klimatyzacja 2-strefowa",
    "auto klimatanläggning (2 zoner)": "Klimatyzacja 2-strefowa", "acc 2 klimatzoner": "Klimatyzacja 2-strefowa",
    "acc klimatanläggning": "Klimatyzacja automatyczna", "rattvärme": "Podgrzewana kierownica", "sätesvärme (fram)": "Podgrzewane fotele przednie",
    "sätesvärme (bak)": "Podgrzewane fotele tylne", "uppvärmda säten, fram": "Podgrzewane fotele przednie",
    "uppvärmda säten, bak": "Podgrzewane fotele tylne", "uppvärmda framsäten": "Podgrzewane fotele przednie",
    "motorvärmare": "Podgrzewacz silnika (230 V)", "kupévärmare": "Ogrzewacz kabiny (230 V)", "parkeringsvärmare": "Ogrzewanie postojowe",
    "bränsledriven värmare med timer": "Ogrzewanie postojowe z timerem", "parkeringssensor bak": "Czujniki parkowania tył",
    "parkeringssensor fram": "Czujniki parkowania przód", "parkeringssensorer (fram och bak)": "Czujniki parkowania przód i tył",
    "p-sensorer fram och bak": "Czujniki parkowania przód i tył", "navigation": "Nawigacja", "gps": "Nawigacja", "keyless": "Dostęp bezkluczykowy",
    "nyckelfri start": "Uruchamianie bezkluczykowe", "taklucka": "Szyberdach", "panoramaglastak": "Dach panoramiczny",
    "soltak/glastak": "Szyberdach lub dach szklany", "helskinn": "Tapicerka skórzana", "halvskinnklädsel": "Tapicerka półskórzana",
    "delvis läderklädda säten": "Tapicerka półskórzana", "klädsel tyg": "Tapicerka materiałowa", "ratt i läder": "Skórzana kierownica",
    "multifunktionsratt": "Kierownica wielofunkcyjna", "elbaklucka": "Elektryczna klapa bagażnika",
    "elektrisk bagagelucka": "Elektryczna klapa bagażnika", "döda-vinkelvarning (blis)": "Asystent martwego pola",
    "filhållningsassistent": "Asystent pasa ruchu", "trötthetsvarnare": "Wykrywanie zmęczenia", "regnsensor": "Czujnik deszczu",
    "ljussensor": "Czujnik zmierzchu", "helljusassistent": "Asystent świateł drogowych", "helljusassistans": "Asystent świateł drogowych",
    "skyltigenkänning": "Rozpoznawanie znaków", "trafikskyltsigenkänning": "Rozpoznawanie znaków", "autobroms": "Asystent hamowania awaryjnego",
    "led strålkastare": "Reflektory LED", "adaptiva strålkastare": "Adaptacyjne reflektory", "kurvljus": "Doświetlanie zakrętów",
    "dimljus": "Światła przeciwmgielne", "takrails": "Relingi dachowe", "rails": "Relingi dachowe", "tonade rutor": "Przyciemniane szyby",
    "mörktonade rutor": "Przyciemniane szyby", "elektriska fönster": "Elektryczne szyby", "elinfällbara sidospeglar": "Elektrycznie składane lusterka",
    "eluppvärmda sidospeglar": "Podgrzewane lusterka", "självavbländande innerbackspegel": "Lusterko fotochromatyczne", "centrallås": "Centralny zamek",
    "centrallås (fjärrstyrt)": "Centralny zamek z pilotem", "startspärr": "Immobilizer", "larm": "Alarm", "stöldlarm": "Alarm", "isofix": "Isofix",
    "sportstolar": "Fotele sportowe", "justerbart svankstöd": "Regulacja odcinka lędźwiowego", "fällbart baksäte": "Składana kanapa",
    "delbart baksäte": "Dzielona kanapa", "färddator": "Komputer pokładowy", "pekskärm": "Ekran dotykowy", "digitalradio (dab)": "Radio DAB",
    "radio dab+": "Radio DAB", "trådlös mobilladdning": "Ładowarka indukcyjna", "servostyrning": "Wspomaganie kierownicy", "antisladd": "ESP",
    "antispinn": "Kontrola trakcji", "automatisk start/stopp": "Start/Stop", "start-/stoppfunktion": "Start/Stop", "auto hold": "Auto Hold",
    "sommardäck på alufälg": "Opony letnie na felgach aluminiowych", "vinterdäck på alufälg": "Opony zimowe na felgach aluminiowych",
    "lättmetallfälgar": "Felgi aluminiowe",
  };

  const clean = (name) => String(name || "").replace(/\s+/g, " ").trim();
  function translate(name) {
    const text = clean(name);
    return DICTIONARY[text.toLowerCase()] || text;
  }

  // The strongest options present, best first, each once.
  function keyOptions(names, limit = 8) {
    const list = (names || []).map(clean).filter(Boolean);
    const found = [];
    for (const [id, pattern, label] of KEY_OPTIONS) {
      // Eco leather is no leather ("Kunstleder", "PU-läder", "konstläder").
      const match = list.find((name) => matches(id, pattern, name) && !(id === "leather" && /kunstleder|pu-?läder|konstläder|syntetläder|ekoskór|искусствен/i.test(name)));
      if (!match) continue;
      // "Kamera cofania" is not shown next to "Kamera 360°"; LED not next to Matrix.
      if ((id === "camera" && found.some((item) => item.id === "camera360")) || (["led", "lights"].includes(id) && found.some((item) => item.id === "matrix" || item.id === "led"))) continue;
      // The sound system names its maker when the seller did; part leather is said so.
      const brand = id === "sound" ? match.match(/harman(?:\s?kardon)?|bose|burmester|bang\s?&?\s?olufsen|meridian|\bjbl\b|bowers\s?&?\s?wilkins/i)?.[0] : "";
      const text = brand ? `Audio ${brand.replace(/^./, (char) => char.toUpperCase())}` : id === "leather" && /teil|part|mi-cuir|częściow|halv|delvis|delskinn/i.test(match) ? "Tapicerka półskórzana" : label;
      found.push({ id, label: text, from: match });
      if (found.length >= limit) break;
    }
    return found;
  }

  function trustSignals(names) {
    const list = (names || []).map(clean);
    return TRUST.filter(([, pattern]) => list.some((name) => pattern.test(name))).map(([id, , label]) => ({ id, label }));
  }

  // Every option in Polish, the strong ones and the promises left out.
  function list(names) {
    const strong = new Set(keyOptions(names, 99).map((item) => item.from));
    return [...new Set((names || []).map(clean).filter(Boolean))]
      .filter((name) => !TRUST.some(([, pattern]) => pattern.test(name)) && !PLAIN.test(name))
      .map((name) => ({ name, label: translate(name), strong: strong.has(name) }))
      .sort((left, right) => Number(right.strong) - Number(left.strong) || left.label.localeCompare(right.label, "pl"));
  }

  const api = { translate, keyOptions, trustSignals, list, KEY_OPTIONS, MORE_NAMES };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_EQUIPMENT = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_EQUIPMENT = api;
})();
