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
    ["panorama", /^(?!schiebedach\/panoramadach$).*(?:panorama|glasdach|panoramic|toit vitr)/i, "Dach panoramiczny"],
    ["sunroof", /^(?!schiebedach\/panoramadach$).*(?:schiebe-?(?:hebe)?dach|sunroof|szyberdach|toit ouvrant)/i, "Szyberdach"],
    ["leather", /(?:voll|teil)?leder(?!lenkrad|schaltknauf)|leather|skór|(?:sellerie|int[ée]rieur|si[èe]ges?) (?:mi-)?cuir|cuir (?:int[ée]gral|partiel)|^(?:mi-)?cuir$/i, "Tapicerka skórzana"],
    ["matrix", /matrix|laser-?licht|laser light/i, "Reflektory Matrix LED"],
    ["led", /^(?!xenon-\/led-scheinwerfer$).*(?:voll-?led|led-?scheinwerfer|led headlights|reflektory led|phares (?:full |au |à )?led)/i, "Reflektory LED"],
    // Kleinanzeigen: one box for xenon or LED.
    ["lights", /^xenon-\/led-scheinwerfer$/i, "Reflektory ksenonowe lub LED"],
    ["acc", /abstandstempomat|adaptive[rn]? (?:cruise|tempomat)|\bacc\b|aktywny tempomat|r[ée]gulateur (?:de vitesse )?adaptatif/i, "Aktywny tempomat (ACC)"],
    ["hud", /head-?up|t[êe]te haute/i, "Wyświetlacz Head-Up"],
    ["camera360", /360\s?°?|surround view|area view|umgebungskamera/i, "Kamera 360°"],
    ["camera", /rückfahrkamera|einparkhilfe.*kamera|kamera|camera|cam[ée]ra/i, "Kamera cofania"],
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

  // Not equipment: what the seller promises about the car (shown by the
  // seller and the verdict, not among the options).
  const TRUST = [
    ["warranty", /^garantie$|gebrauchtwagengarantie|warranty/i, "Gwarancja sprzedawcy"],
    ["serviceBook", /scheckheft|service ?book|książka serwisowa|carnet d'entretien/i, "Książka serwisowa"],
    ["serviceNew", /inspektion neu|service neu|frisch (?:gewartet|inspiziert)/i, "Świeży serwis"],
    ["nonSmoker", /nichtraucher|non-?smok|non[- ]fumeur/i, "Auto dla niepalących"],
  ];
  // Drive, tyres and the like: facts, not selling options; kept in the full list.
  const PLAIN = /^(frontantrieb|heckantrieb|sommerreifen|pannenkit|tuner\/radio|radio\/tuner|radio|usb|mp3|cd)$/i;

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
      const match = list.find((name) => pattern.test(name));
      if (!match) continue;
      // "Kamera cofania" is not shown next to "Kamera 360°"; LED not next to Matrix.
      if ((id === "camera" && found.some((item) => item.id === "camera360")) || (["led", "lights"].includes(id) && found.some((item) => item.id === "matrix" || item.id === "led"))) continue;
      // The sound system names its maker when the seller did; part leather is said so.
      const brand = id === "sound" ? match.match(/harman(?:\s?kardon)?|bose|burmester|bang\s?&?\s?olufsen|meridian|\bjbl\b/i)?.[0] : "";
      const text = brand ? `Audio ${brand.replace(/^./, (char) => char.toUpperCase())}` : id === "leather" && /teil|part|mi-cuir/i.test(match) ? "Tapicerka półskórzana" : label;
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

  const api = { translate, keyOptions, trustSignals, list, KEY_OPTIONS };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_EQUIPMENT = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_EQUIPMENT = api;
})();
