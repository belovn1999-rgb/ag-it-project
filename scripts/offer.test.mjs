// The client offer's rules (B71, docs/OFFER-PAGE.md): market around an ad,
// strong options, verdict and red flags. The modules are plain browser
// scripts; they publish themselves on globalThis.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

for (const file of ["offer-market.js", "offer-equipment.js", "offer-ru.js", "offer-verdict.js", "offer-ad.js", "offer-carvago.js"]) {
  vm.runInThisContext(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), { filename: file });
}
const MARKET = globalThis.AUTOGOOD_OFFER_MARKET;
const EQUIPMENT = globalThis.AUTOGOOD_OFFER_EQUIPMENT;
const VERDICT = globalThis.AUTOGOOD_OFFER_VERDICT;
const AD = globalThis.AUTOGOOD_OFFER_AD;
const CARVAGO = globalThis.AUTOGOOD_OFFER_CARVAGO;
const RU = globalThis.AUTOGOOD_OFFER_RU;

const offer = (key, price, year, mileage, extra = {}) => ({ key, price, currency: "EUR", year, mileage, country: "DE", ...extra });

test("the market around an ad: its country, the similar cars, Poland against the turnkey price", () => {
  const german = Array.from({ length: 20 }, (_, index) => offer(`mobile:${index}`, 20000 + index * 500, 2022 + (index % 2), 20000 + index * 1500));
  const car = offer("mobile:car", 21000, 2023, 30000, { turnkey: 100000 });
  const records = [{
    at: "2026-10-05T10:00:00.000Z",
    markets: {
      mobile: { total: 21, offers: [...german, car, offer("mobile:nl", 15000, 2023, 30000, { country: "NL" })] },
      otomoto: { total: 5, complete: true, offers: [110000, 112000, 115000, 118000, 120000].map((price, index) => ({ key: `oto:${index}`, price, currency: "PLN", year: 2023, mileage: 30000 })) },
    },
  }];
  const snapshot = MARKET.snapshot(records, "mobile:car", { now: Date.parse("2026-10-06T10:00:00.000Z") });
  assert.equal(snapshot.market.country, "DE");
  assert.equal(snapshot.market.scope, "country");
  assert.equal(snapshot.market.stats.count, 21, "the Dutch offer stays out of the German market");
  assert.ok(snapshot.market.dearerShare > 0.8, "cheaper than most of the market");
  assert.ok(snapshot.market.similar, "enough similar cars");
  assert.equal(snapshot.poland.basis.median, 115000);
  assert.equal(snapshot.poland.saving, 15000);
  assert.equal(snapshot.ad.kind, "atLeast");
  assert.equal(snapshot.ad.days, 1);
});

test("a market too thin in the ad's country is widened to every country of the check", () => {
  const records = [{ at: "2026-10-05T10:00:00.000Z", markets: { mobile: { total: 9, offers: [
    offer("mobile:car", 21000, 2023, 30000),
    ...Array.from({ length: 8 }, (_, index) => offer(`mobile:${index}`, 22000 + index * 100, 2023, 30000, { country: "BE" })),
  ] } } }];
  const snapshot = MARKET.snapshot(records, "mobile:car");
  assert.equal(snapshot.market.scope, "all");
  assert.equal(snapshot.market.stats.count, 9);
});

test("price drops across checks and the portal's own earlier price", () => {
  const records = [
    { at: "2026-09-01T09:30:00.000Z", markets: { mobile: { offers: [offer("mobile:car", 25000, 2023, 30000)] } } },
    { at: "2026-09-10T09:30:00.000Z", markets: { mobile: { offers: [offer("mobile:car", 24000, 2023, 30000)] } } },
    { at: "2026-10-05T09:30:00.000Z", markets: { mobile: { offers: [offer("mobile:car", 23500, 2023, 30000)] } } },
  ];
  const info = MARKET.adLiquidity(records, records[2].markets.mobile.offers[0], Date.parse("2026-10-05T12:00:00.000Z"));
  assert.equal(info.dropped, true);
  assert.equal(info.drops, 2);
  assert.equal(info.from, 25000);
  assert.ok(info.negotiable, "listed over 30 days and already cheaper");
});

test("strong options: the most valuable first, part leather said so, no duplicate camera", () => {
  const options = EQUIPMENT.keyOptions(["Sitzheizung", "Teilleder", "360°-Kamera", "Rückfahrkamera", "Panoramadach", "Navigationssystem", "Harman Kardon Soundsystem"], 8);
  assert.deepEqual(options.map((item) => item.label), ["Dach panoramiczny", "Tapicerka półskórzana", "Kamera 360°", "Nawigacja", "Podgrzewane fotele", "Audio Harman Kardon"]);
  assert.equal(EQUIPMENT.translate("Abstandstempomat"), "Aktywny tempomat (ACC)");
  assert.equal(EQUIPMENT.translate("Unknown thing"), "Unknown thing");
  assert.deepEqual(EQUIPMENT.trustSignals(["Garantie", "Scheckheftgepflegt"]).map((item) => item.id), ["warranty", "serviceBook"]);
});

const ad = (description, extra = {}) => ({ complete: true, title: "Toyota C-HR", description, specs: { accidentFree: true }, seller: { type: "dealer" }, flags: {}, features: [], ...extra });
const words = (result) => result.lines.filter((line) => line.id.startsWith("word:")).map((line) => line.text);

test("red flags: whole words, denials and the anti-theft alarm are not flags", () => {
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Diebstahlwarnanlage, Alarmanlage, Navi") })), []);
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Kein Unfallschaden, kein Mietwagen, keine Vorkasse.") })), []);
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("NESSUN VINCOLO DI FINANZIAMENTO") })), []);
  // The police after a theft is not an ex-police car.
  assert.deepEqual(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Nach Abschluss der polizeilichen Maßnahmen von der Polizei freigegeben.") })), []);
  assert.ok(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Ehemaliges Polizeifahrzeug, gepflegt.") })).includes("Możliwe użytkowanie flotowe (taxi, wynajem, nauka jazdy)"));
  const stolen = VERDICT.assess({ car: { price: 12000 }, ad: ad("Dieses Fahrzeug stammt aus einem Diebstahl und hat keine Papiere.") });
  assert.equal(stolen.verdict, "risk");
  assert.ok(words(stolen).includes("Wzmianka o kradzieży"));
  assert.ok(words(stolen).includes("Brak dokumentów — auta nie da się zarejestrować"));
  assert.ok(words(VERDICT.assess({ car: { price: 20000 }, ad: ad("Prezzo valido con finanziamento") })).includes("Cena może dotyczyć tylko zakupu na kredyt"));
  const quoted = VERDICT.assess({ car: { price: 20000 }, ad: ad("Gepflegt.\nLeichter Unfallschaden hinten rechts, repariert.") }).lines.find((line) => line.text === "Auto po wypadku lub uszkodzone");
  assert.match(quoted.quote, /Unfallschaden hinten rechts/);
});

test("verdict: a bait price is a risk, a fair one is fine", () => {
  const market = { own: { stats: { median: 25000, p25: 23000, p75: 27000, count: 30 } } };
  assert.equal(VERDICT.assess({ car: { price: 12000 }, ad: ad(""), market }).verdict, "risk");
  const fair = VERDICT.assess({ car: { price: 24000, seller: "dealer" }, ad: ad(""), market });
  assert.ok(fair.lines.some((line) => line.id === "price:fair"));
  assert.notEqual(fair.verdict, "risk");
});

test("negotiation: long listed and already cheaper means more room", () => {
  const now = Date.parse("2026-10-05T12:00:00.000Z");
  const market = { own: { stats: { median: 25000, p25: 23000, p75: 27000 } }, ad: { days: 45, dropped: true, drops: 1, share: -0.03, kind: "seen" } };
  const room = VERDICT.negotiation({ car: { price: 26000, currency: "EUR" }, market, now });
  assert.deepEqual([room.from, room.to], [3, 5]);
  const fresh = VERDICT.negotiation({ car: { price: 22000, currency: "EUR" }, market: { own: market.own, ad: { days: 3, dropped: false } }, now });
  assert.deepEqual([fresh.from, fresh.to], [0, 1]);
});

test("Polish plural forms", () => {
  assert.equal(VERDICT.plural(1, "opinia", "opinie", "opinii"), "opinia");
  assert.equal(VERDICT.plural(104, "opinia", "opinie", "opinii"), "opinie");
  assert.equal(VERDICT.plural(12, "opinia", "opinie", "opinii"), "opinii");
  assert.equal(VERDICT.plural(22, "opinia", "opinie", "opinii"), "opinie");
  assert.equal(VERDICT.plural(25, "opinia", "opinie", "opinii"), "opinii");
});

// ---- Reading the ad (offer-ad.js): pages shaped as the portals' (checked 2026-10-06) ----
const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const pvDetail = (label, value) => `<li class="text-sm"><span class="uppercase">${label}</span><br>\n<span class="text-xl font-bold">\n${value}\n</span></li>`;

test("ParuVendu, a dealer: photos, details in Polish, warranty, seller with stock", () => {
  const html = [
    ld({ "@type": "Vehicle", name: "VOLKSWAGEN Passat", brand: { "@type": "Brand", name: "VOLKSWAGEN" }, model: "Passat",
      image: ["https://file-render.webapp4you.eu/pictureRender/?id=a1&width=800&height=600", "https://example.com/other.jpg"],
      color: "Blanc", bodyType: "Hatchback", vehicleConfiguration: " 2.0 TDI", driveWheelConfiguration: " 2.0 TDI", dateVehicleFirstRegistered: 2024,
      fuelType: "Diesel", vehicleTransmission: "Automatic", mileageFromOdometer: { value: 63467 },
      offers: { price: 35990, seller: { "@type": "AutoDealer", name: "JEAN LAIN OCCASIONS", address: { postalCode: "73290", addressCountry: "FR", addressLocality: "La Motte-Servolex" } } },
      additionalProperty: [{ propertyID: "bodyType", value: "Berline" }, { propertyID: "vehicleTransmission", value: "Automatique" }] }),
    '<div id="detail_infosvendeur"><p>Professionnel</p></div>',
    pvDetail("Prix", "35 990 €"), pvDetail("Version", "Passat 2.0 TDI EVO SCR 150 DSG7 R-Line"), pvDetail("Carrosserie", '<a href="/b/">Berline</a>'),
    pvDetail("Année", 'Mars 2024\n<div class="encoded-lnk">Assurance : économisez 357€</div>'), pvDetail("Kilométrage", "63 467\nkm"),
    pvDetail("Energie", "Diesel"), pvDetail("Transmission", "Automatique"), pvDetail("Nb de portes", "4 portes avec hayon"),
    pvDetail("Puissance fiscale", "8\nCV"), pvDetail("Nombre de places", "5\nplaces"),
    '<div id="txtAnnonceTrunc" class="txt_annonceauto">VOLKSWAGEN PASSAT<br><br>- Cylindrée : 1968<br>- Puissance réelle : 150<div id="mes-ht">',
    pvDetail("Couleur", "Blanc"), pvDetail("Puissance réelle", "150"), pvDetail("Garantie mécanique", "12 mois"),
    '<div class="vvdetails14_refdate"><p>Réf. annonce :\nParuVendu 393577\n- Le 25/09/2026 à 05:16\n</p></div>',
    '<p class="pvpro-nbreannonces"><strong>212 véhicules</strong> en stock <a target="_blank" href="https://www.paruvendu.fr/auto-moto/pro/jean-lain-85010/">Voir ses annonces</a></p>',
  ].join("\n");
  const ad = AD.parseParuvendu(html, "https://www.paruvendu.fr/a/voiture-occasion/volkswagen/passat/1294696754A1KVVOVWPAS");
  assert.equal(ad.source, "paruvendu");
  assert.equal(ad.title, "Volkswagen Passat 2.0 TDI EVO SCR 150 DSG7 R-Line");
  assert.deepEqual(ad.images, ["https://file-render.webapp4you.eu/pictureRender/?id=a1&width=800&height=600"]);
  assert.match(ad.description, /Cylindrée : 1968/);
  const { specs } = ad;
  assert.deepEqual([specs.firstRegistration, specs.mileage, specs.ccm, specs.powerHp, specs.powerKw, specs.fiscalCv], ["03/2024", 63467, 1968, 150, 110, 8]);
  assert.deepEqual([specs.fuel, specs.gearbox, specs.body, specs.color, specs.doors, specs.seats, specs.drive], ["diesel", "automatyczna", "", "biały", "5", 5, ""]);
  assert.equal(specs.accidentFree, null, "ParuVendu does not say");
  assert.equal(ad.warranty, "12 mies.");
  assert.deepEqual(ad.features, []);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, zip: ad.seller.zip, stock: ad.seller.stock },
    { type: "dealer", name: "JEAN LAIN OCCASIONS", city: "La Motte-Servolex", zip: "73290", stock: 212 });
  assert.equal(ad.listedAt, "2026-09-25T05:16:00");
  assert.equal(ad.vat.gross, 35990);
});

test("ParuVendu, a private seller: the ticked list, gallery photos, no name on the sheet", () => {
  const html = [
    ld({ "@type": "Vehicle", brand: { name: "VOLVO" }, model: "V60", image: ["https://media.paruvendu.fr/media-pa/WV17/7/5/WV177582365_1.jpeg"],
      bodyType: "StationWagon", driveWheelConfiguration: "https://schema.org/FrontWheelDriveConfiguration", fuelType: "Diesel",
      vehicleEngine: { enginePower: { value: 163, unitText: "ch" } }, mileageFromOdometer: { value: 121000 }, numberOfDoors: "5",
      offers: { price: 18600, seller: { "@type": "Person", name: "" } },
      additionalProperty: [{ propertyID: "driveWheelConfiguration", value: "Traction avant" }] }),
    '<h2 id="detail_loc" class="text-grey-appli">\nMeyzieu (69330)\t\t</h2>',
    '<p class="txtpresentation-vendeur">\nVendeur particulier : <strong>Nicolas B</strong>\n<br>\n<span class="text-xs">membre depuis 2 mois</span></p>',
    '<img src="https://img.paruvendu.fr/media_ext/_https_/media.paruvendu.fr/dd/4d/AAA_rct?func=crop&amp;w=1000&amp;gravity=auto" alt="" onerror="this.style.display=\'none\';gestionErreurPhoto();">',
    '<img src="https://img.paruvendu.fr/media_ext/_https_/media.paruvendu.fr/a6/69/TTT_rct?func=crop&amp;w=480&amp;gravity=auto" alt="" onerror="this.style.display=\'none\';gestionErreurPhoto();">',
    pvDetail("Prix", "18 600 €"), pvDetail("Version", "V60 B3 163 ch Geartronic 8"), pvDetail("Carrosserie", "Break"), pvDetail("Année", "Juin 2019"),
    pvDetail("Transmission", "Automatique"), pvDetail("Nb de portes", "4 portes avec hayon"),
    '<div id="txtAnnonceTrunc" class="txt_annonceauto">\nje vend ma Volvo. <div class="fin"></div>',
    '<h2>Caractéristiques techniques modèle V60</h2></div><ul class="grid"><li class="text-sm">- Aide parking</li> <li class="text-sm">- Intérieur cuir</li> <li class="text-sm">- Régulateur de vitesse</li></ul>',
  ].join("\n");
  const ad = AD.parseParuvendu(html, "https://www.paruvendu.fr/a/voiture-occasion/volvo/v60/1293622392A1KVVOVOV60");
  assert.deepEqual(ad.images, ["https://img.paruvendu.fr/media_ext/_https_/media.paruvendu.fr/dd/4d/AAA_rct?func=crop&w=1000&gravity=auto"], "photos the PDF can draw, no thumbnails");
  assert.deepEqual(ad.features, ["Aide parking", "Intérieur cuir", "Régulateur de vitesse"]);
  assert.deepEqual([ad.specs.body, ad.specs.drive, ad.specs.powerHp, ad.specs.firstRegistration, ad.specs.doors], ["kombi", "przedni", 163, "06/2019", "5"]);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, contactName: ad.seller.contactName, city: ad.seller.city, zip: ad.seller.zip, stock: ad.seller.stock },
    { type: "private", name: "", contactName: "Nicolas B", city: "Meyzieu", zip: "69330", stock: null });
  assert.match(ad.seller.since, /^\d{4}-\d{2}$/);
  assert.equal(ad.warranty, null);
  // The French options in Polish, the strong ones found.
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features).map((item) => item.label), ["Tapicerka skórzana"]);
  assert.deepEqual(EQUIPMENT.list(ad.features).map((item) => item.label), ["Tapicerka skórzana", "Czujniki parkowania", "Tempomat"]);
});

const kaDetail = (label, value) => `<li class="addetailslist--detail">\n${label}<span class="addetailslist--detail--value" >\n${value}</span>\n</li>`;
test("Kleinanzeigen, a dealer: this ad's photos only, details, ticked boxes, seller", () => {
  const html = [
    ld({ "@type": "ImageObject", title: "Audi SQ5 3.0TDI", contentUrl: "https://img.kleinanzeigen.de/api/v1/prod-ads/images/78/a?rule=$_59.JPG", representativeOfPage: true }),
    ld({ "@type": "ImageObject", title: "Audi SQ5 3.0TDI", contentUrl: "https://img.kleinanzeigen.de/api/v1/prod-ads/images/b8/b?rule=$_59.JPG", representativeOfPage: false }),
    ld({ "@type": "ImageObject", title: "Another car", contentUrl: "https://img.kleinanzeigen.de/api/v1/prod-ads/images/43/c?rule=$_59.JPG", representativeOfPage: false }),
    '<h1 id="viewad-title" class="boxedarticle--title">\nAudi SQ5 3.0TDI</h1>',
    '<h2 class="boxedarticle--price" id="viewad-price">\n22.490 € VB</h2>',
    '<span id="viewad-locality" itemprop="addressLocality">\n73061 Baden-Württemberg - Ebersbach an der Fils</span>',
    kaDetail("Kilometerstand", "120.000 km"), kaDetail("Fahrzeugzustand", "Unbeschädigtes Fahrzeug"), kaDetail("Erstzulassung", "Januar 2017"),
    kaDetail("Kraftstoffart", "Diesel"), kaDetail("Leistung", "326 PS"), kaDetail("Getriebe", "Automatik"), kaDetail("Fahrzeugtyp", "SUV/Geländewagen"),
    kaDetail("Anzahl Türen", "4/5"), kaDetail("HU bis", "September 2026"), kaDetail("Außenfarbe", "Weiß"), kaDetail("Material Innenausstattung", "Teilleder"),
    '<li class="checktag">Anhängerkupplung</li><li class="checktag">Schiebedach/Panoramadach</li><li class="checktag">Xenon-/LED-Scheinwerfer</li><li class="checktag">Scheckheftgepflegt</li><li class="checktag"> </li>',
    '<p id="viewad-description-text" class="text-force-linebreak" itemprop="description">\nOG AUTOMOBILE<br /><br />Sonderausstattung: AHK&#x2F;ACC</p>',
    '<div id="viewad-contact-box"><span class="text-body-regular-strong text-force-linebreak userprofile-vip">\n<a href="/s-bestandsliste.html?userId=166168648">\nOG Automobile</a></span>',
    '<span class="userprofile-vip-details-text">Gewerblicher Nutzer</span><span class="userprofile-vip-details-text">Aktiv seit 03.09.2018</span>',
    '<a id="poster-other-ads-link" href="/s-bestandsliste.html?userId=166168648">\n54 Anzeigen online\n</a></div>',
  ].join("\n");
  const ad = AD.parseKleinanzeigen(html, "https://www.kleinanzeigen.de/s-anzeige/audi-sq5/3532826102-216-8871");
  assert.equal(ad.source, "kleinanzeigen");
  assert.deepEqual(ad.images.map((image) => image.split("/")[8]), ["a?rule=$_59.JPG", "b?rule=$_59.JPG"]);
  assert.equal(ad.description, "OG AUTOMOBILE\n\nSonderausstattung: AHK/ACC");
  const { specs } = ad;
  assert.deepEqual([specs.firstRegistration, specs.mileage, specs.powerHp, specs.powerKw, specs.fuel, specs.gearbox, specs.body], ["01/2017", 120000, 326, 240, "diesel", "automatyczna", "SUV"]);
  assert.deepEqual([specs.color, specs.interior, specs.doors, specs.hu, specs.accidentFree, specs.damaged], ["biały", "półskórzana", "4/5", "do 09/2026", true, false]);
  assert.deepEqual(ad.features, ["Anhängerkupplung", "Schiebedach/Panoramadach", "Xenon-/LED-Scheinwerfer", "Scheckheftgepflegt"]);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, zip: ad.seller.zip, since: ad.seller.since, stock: ad.seller.stock },
    { type: "dealer", name: "OG Automobile", city: "Ebersbach an der Fils", zip: "73061", since: "2018-09-03", stock: 54 });
  assert.equal(ad.flags.negotiable, true);
  assert.equal(ad.listedAt, "", "the page shows the last refresh, not the listing day");
  // One box for both roofs (and for xenon or LED): said so, never the better one alone.
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features).map((item) => item.label), ["Szyberdach lub dach panoramiczny", "Reflektory ksenonowe lub LED", "Hak holowniczy"]);
  assert.deepEqual(EQUIPMENT.trustSignals(ad.features).map((item) => item.id), ["serviceBook"]);
});

test("Kleinanzeigen, a private seller in a city: no name, district left out", () => {
  const html = [
    '<h1 id="viewad-title">Audi A4 Avant</h1>',
    '<span id="viewad-locality" itemprop="addressLocality">\n52062 Aachen - Aachen-Mitte</span>',
    kaDetail("Fahrzeugzustand", "Beschädigtes Fahrzeug"), kaDetail("Kraftstoffart", "Hybrid"),
    '<div id="viewad-contact-box"><span class="userprofile-vip">\n<a href="/s-bestandsliste.html?userId=1">\nPrivat</a></span><span>Privater Nutzer</span><span>Aktiv seit 22.10.2024</span><a>2 Anzeigen online</a></div>',
  ].join("\n");
  const ad = AD.parseKleinanzeigen(html);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, stock: ad.seller.stock }, { type: "private", name: "", city: "Aachen", stock: null });
  assert.deepEqual([ad.specs.accidentFree, ad.specs.damaged, ad.specs.fuel], [false, true, "hybryda (benzyna)"]);
  assert.throws(() => AD.parseKleinanzeigen("<html>IP-Bereich vorübergehend gesperrt</html>"), /no ad data/);
});

test("values in Polish: French words added, German and English as before", () => {
  assert.deepEqual(["Diesel", "Essence", "Hybride", "Hybride rechargeable", "Électrique", "GPL", "Benzin", "Hybrid (Benzin/Elektro)", "Elektro", "Plug-in-Hybrid"].map(AD.fuelPl),
    ["diesel", "benzyna", "hybryda (benzyna)", "hybryda plug-in", "elektryczny", "benzyna + LPG", "benzyna", "hybryda (benzyna)", "elektryczny", "hybryda plug-in"]);
  assert.deepEqual(["Boîte automatique", "Boîte manuelle", "Automatique", "Schaltgetriebe", "Automatik", "Halbautomatik"].map(AD.gearboxPl),
    ["automatyczna", "manualna", "automatyczna", "manualna", "automatyczna", "półautomatyczna"]);
  assert.deepEqual(["Berline", "Break", "Monospace", "SUV/4x4/Pick-Up", "Coupé", "Cabriolet", "Autres", "Kombi", "Limousine", "Kleinwagen", "Van/Bus", "Andere"].map(AD.bodyPl),
    ["sedan", "kombi", "van", "SUV", "coupé", "kabriolet", "", "kombi", "sedan", "hatchback", "van", ""]);
  assert.deepEqual(["Blanc", "Noir", "Gris", "Bleu", "Rouge", "Argent", "Vert", "Marron", "Schwarz", "Weiß", "Grau", "Rot", "Silber"].map((color) => AD.colorPl(color)),
    ["biały", "czarny", "szary", "niebieski", "czerwony", "srebrny", "zielony", "brązowy", "czarny", "biały", "szary", "czerwony", "srebrny"]);
  assert.equal(AD.colorPl("Gris", "Métallisé"), "szary metalik");
  assert.equal(AD.colorPl("Blanc nacré"), "biały perłowy");
  assert.deepEqual(["Traction avant", "Propulsion", "Transmission intégrale", "Allrad", "Front"].map(AD.drivePl), ["przedni", "tylny", "4x4", "4x4", "przedni"]);
  assert.equal(EQUIPMENT.translate("Climatisation automatique, 3 zones"), "Klimatyzacja 3-strefowa");
  assert.deepEqual(EQUIPMENT.keyOptions(["Toit panoramique", "Sièges chauffants", "Caméra d'aide au stationnement", "Phares Full LED", "Attache remorque", "Panoramadach"]).map((item) => item.label),
    ["Dach panoramiczny", "Reflektory LED", "Kamera cofania", "Podgrzewane fotele", "Hak holowniczy"]);
});

test("Carvago: the ad's own number, price changes over half a percent, oldest first", () => {
  assert.equal(CARVAGO.externalId("mobile", "", "mobile:412345678"), "mobile_de-412345678");
  assert.equal(CARVAGO.externalId("mobile", "https://suchen.mobile.de/fahrzeuge/details.html?id=987654321&lang=de", ""), "mobile_de-987654321");
  assert.equal(CARVAGO.externalId("autoscout", "https://www.autoscout24.de/angebote/toyota-c-hr-0B6C1D2E-aaaa-bbbb-cccc-1234567890ab", ""), "autoscout24-0b6c1d2e-aaaa-bbbb-cccc-1234567890ab");
  assert.equal(CARVAGO.externalId("otomoto", "https://www.otomoto.pl/x", "otomoto:1"), "");
  const { points, changes } = CARVAGO.changes([
    { created_at: "2026-09-20T08:00:00Z", price: 24000 },
    { created_at: "2026-09-01T08:00:00Z", price: 25000 },
    { created_at: "2026-09-10T08:00:00Z", price: 24990 },
    { created_at: "2026-09-25T08:00:00Z", price: 0 },
  ]);
  assert.equal(points.length, 3);
  assert.equal(points[0].price, 25000);
  // 25 000 → 24 990 is rounding; 24 990 → 24 000 is a real drop.
  assert.equal(changes.length, 1);
  assert.equal(changes[0].at.slice(0, 10), "2026-09-20");
  assert.ok(Math.abs(changes[0].share - (24000 / 24990 - 1)) < 1e-9);
});

test("the offer in Russian: values, options, plural, calculator lines, verdict lines", () => {
  assert.equal(RU.value("czarny metalik"), "чёрный металлик");
  assert.equal(RU.value("półskórzana, czarny"), "частично кожа, чёрный");
  assert.equal(RU.value("hybryda (benzyna)"), "гибрид (бензин)");
  assert.equal(RU.value("do 08/2027"), "до 08/2027");
  assert.equal(RU.value("Toyota"), "Toyota");
  assert.equal(RU.option("Podgrzewane fotele"), "Подогрев сидений");
  assert.equal(RU.option("Audio JBL"), "Аудиосистема JBL");
  assert.equal(RU.option("Sitzheizung vorne"), "Sitzheizung vorne");
  assert.deepEqual([1, 2, 5, 11, 21, 22, 104].map((n) => RU.plural(n, "отзыв", "отзыва", "отзывов")), ["отзыв", "отзыва", "отзывов", "отзывов", "отзыв", "отзыва", "отзыва"]);
  assert.equal(RU.calc("Oględziny specjalisty"), "Осмотр специалиста");
  assert.equal(RU.country("DE"), "Германия");
  const ad = { complete: true, specs: { accidentFree: true, owners: 1 }, seller: { type: "dealer", since: "2002-03-01", rating: { score: 4.3, reviews: 104, portal: "mobile.de" } }, features: [], description: "Verkauf ohne Gewährleistung." };
  const pl = VERDICT.assess({ car: { price: 20000 }, ad, now: Date.parse("2026-10-10T12:00:00Z") });
  const ru = VERDICT.assess({ car: { price: 20000 }, ad, now: Date.parse("2026-10-10T12:00:00Z"), lang: "ru" });
  // The same lines (the same ids: hiding one hides it in both languages), Russian words.
  assert.deepEqual(ru.lines.map((line) => line.id), pl.lines.map((line) => line.id));
  assert.ok(ru.lines.some((line) => line.text === "Дилер: 24 года на mobile.de, оценка 4,3/5 (104 отзыва)"));
  assert.ok(ru.lines.some((line) => line.text === "Продавец исключает ответственность за дефекты"));
  assert.ok(ru.lines.some((line) => line.text === "Один предыдущий владелец"));
});

// ---- av.by (checked 2026-10-10, api.av.by/offers/<id>) ----
const props = (values) => Object.entries(values).map(([name, value], index) => ({ fallbackType: typeof value === "number" ? "int" : "string", value, id: index + 2, name }));
const photo = (id, main = false) => ({ id, main, mimeType: "image/jpeg", big: { width: 1024, height: 1280, url: `https://avcdn.av.by/advertbig/0016/0858/${id}.avif` },
  medium: { width: 490, height: 612, url: `https://avcdn.av.by/advertmedium/0016/0858/${id + 1}.jpg` }, small: { url: `https://avcdn.av.by/advertpreview/0016/0858/${id + 2}.jpg` } });
const options = (...names) => names.map((name, index) => ({ name, id: index + 1, optionGroup: { name: "Комфорт", id: 7 } }));
const price = (usd, eur) => ({ usd: { currency: "usd", amount: usd }, byn: { currency: "byn", amount: Math.round(usd * 3.06) }, eur: { currency: "eur", amount: eur } });

test("av.by, a company: photos, specs in Polish, seller with rating, cars and page", () => {
  const offer = {
    id: 142031381, status: "active", price: price(16350, 14623), priceNds: false,
    organization: { city: { label: "Минск" }, id: 2494785, title: "BUTIKAVTO сеть АВТОХАУСОВ", legalName: "ООО \"Бутик-Инвест\"", location: "офис, ул. Московская, 22",
      advertsCountByAdvertType: { advertTypes: { cars: 5412, trailer: 1827 }, total: 7281 }, organizationRating: { count: 262, averageScore: 4.4 } },
    exchange: { type: "any", label: "Возможен обмен", exchangeAllowed: "allowed" },
    description: "Ждём Вас по адресу: г. Минск, ул. Илимская, д. 60\r\n\r\n- Передний привод\r\n- Снят с учёта  \r\n\r\n\r\n\r\nСведения носят информационный характер",
    publishedAt: "2026-10-10T07:52:16+0000", refreshedAt: "2026-10-10T07:52:16+0000", originalDaysOnSale: 1,
    organizationId: 2494785, organizationTitle: "BUTIKAVTO сеть АВТОХАУСОВ", sellerName: "BUTIKAVTO сеть АВТОХАУСОВ", locationName: "Минск",
    publicUrl: "https://cars.av.by/volkswagen/passat/142031381", year: 2018,
    metadata: { vinInfo: { vin: "WVWZZZ3**********", checked: false }, condition: { id: 2, label: "с пробегом" }, year: 2018,
      medianPriceRange: { priceRangeType: "average" }, options: options("ABS", "Камера заднего вида", "Фары светодиодные", "Штатная навигация", "Климат-контроль однозонный", "AUX") },
    properties: props({ brand: "Volkswagen", model: "Passat", generation: "B8", year: "2018", engine_capacity: "1,6", engine_type: "дизель", transmission_type: "механика",
      interior_color: "тёмный", interior_material: "ткань", mileage_km: 253334, body_type: "универсал", drive_type: "передний привод", color: "серый",
      registration_country: "снят с учёта", condition: "с пробегом", engine_power: 120 }),
    photos: [photo(3430), photo(3425, true)],
  };
  const ad = AD.parseAvby(offer, "https://cars.av.by/volkswagen/passat/142031381");
  assert.equal(ad.source, "avby");
  assert.equal(ad.title, "Volkswagen Passat B8");
  assert.deepEqual(ad.images, ["https://avcdn.av.by/advertbig/0016/0858/3425.avif", "https://avcdn.av.by/advertbig/0016/0858/3430.avif"], "the main photo first, the big ones");
  assert.equal(ad.description, "Ждём Вас по адресу: г. Минск, ул. Илимская, д. 60\n\n- Передний привод\n- Снят с учёта\n\nСведения носят информационный характер");
  const { specs } = ad;
  assert.deepEqual([specs.firstRegistration, specs.mileage, specs.ccm, specs.powerHp, specs.powerKw], ["2018", 253334, 1600, 120, 88]);
  assert.deepEqual([specs.fuel, specs.gearbox, specs.drive, specs.body, specs.color, specs.interior, specs.doors], ["diesel", "manualna", "przedni", "kombi", "szary", "materiałowa, ciemny", ""]);
  assert.deepEqual([specs.registration, specs.generation, specs.accidentFree, specs.damaged], ["wyrejestrowany", "B8", null, false]);
  assert.deepEqual(ad.seller, {
    type: "dealer", name: "BUTIKAVTO сеть АВТОХАУСОВ", contactName: "", legalName: "ООО \"Бутик-Инвест\"", city: "Mińsk", region: "", zip: "", country: "BY",
    address: "офис, ул. Московская, 22, Mińsk", since: "", sinceText: "",
    rating: { score: 4.4, reviews: 262, recommend: null, adReality: null, portal: "av.by" },
    page: "https://cars.av.by/filter?organization=2494785", stock: 5412,
  });
  assert.equal(ad.listedAt, "2026-10-10T07:52:16+00:00");
  assert.equal(Date.parse(ad.listedAt), Date.UTC(2026, 9, 10, 7, 52, 16));
  assert.deepEqual(ad.vat, { deductible: false, rate: 0, net: 0, gross: 14623 });
  assert.deepEqual([ad.currency, ad.priceUsd], ["EUR", 16350]);
  assert.equal(ad.portalPrice.label, "uczciwa cena");
  assert.equal(ad.flags.exchange, true);
  assert.deepEqual(ad.features, ["ABS", "Камера заднего вида", "Фары светодиодные", "Штатная навигация", "Климат-контроль однозонный", "AUX"]);
  // The Russian options ranked and in Polish (avby-equipment.txt).
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features).map((item) => item.label), ["Reflektory LED", "Kamera cofania", "Nawigacja", "Klimatyzacja automatyczna"]);
  assert.deepEqual(EQUIPMENT.list(ad.features).map((item) => item.label), ["Kamera cofania", "Klimatyzacja automatyczna", "Nawigacja", "Reflektory LED", "ABS"]);
});

test("av.by, a private seller: no name on the sheet, region and lifting in Polish, keyless with a Latin c", () => {
  const offer = {
    id: 139000301, price: price(20700, 18513), publishedAt: "2026-09-04T06:05:24+0000", refreshedAt: "2026-10-10T07:18:33+0000", originalDaysOnSale: 37,
    sellerName: "Александр ", locationName: "Калинковичи, Гомельская обл.", shortLocationName: "Калинковичи", sellerHistory: { advertsCount: 0 },
    exchange: { exchangeAllowed: "denied" }, description: null,
    metadata: { condition: { id: 2, label: "с пробегом" }, vinInfo: { checked: true },
      options: options("Беcключевой доступ", "Обогрев сидений", "Круиз-контроль адаптивный", "Фары матричные", "Фары светодиодные", "Камера 360", "Камера заднего вида", "Фаркоп") },
    properties: props({ brand: "Volkswagen", model: "Passat", generation: "B8 · Рестайлинг", year: "2020", engine_capacity: "1,6", engine_type: "дизель",
      transmission_type: "робот", interior_color: "комби", interior_material: "натуральная кожа", mileage_km: 196000, body_type: "универсал",
      drive_type: "постоянный полный привод", color: "синий", condition: "с пробегом", engine_power: 120 }),
    photos: [photo(3448, true)],
  };
  const ad = AD.parseAvby(offer);
  assert.equal(ad.url, "", "no link given, none in the ad");
  assert.equal(ad.title, "Volkswagen Passat B8 lifting");
  assert.equal(ad.description, "");
  assert.deepEqual([ad.specs.gearbox, ad.specs.drive, ad.specs.color, ad.specs.interior, ad.specs.registration], ["automatyczna", "4x4", "niebieski", "skórzana, dwukolorowy", ""]);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, contactName: ad.seller.contactName, city: ad.seller.city, region: ad.seller.region, address: ad.seller.address, stock: ad.seller.stock, page: ad.seller.page, rating: ad.seller.rating },
    { type: "private", name: "", contactName: "Александр", city: "Калинковичи", region: "obwód homelski", address: "Калинковичи, obwód homelski", stock: null, page: "", rating: null });
  assert.equal(ad.listedAt, "2026-09-04T06:05:24+00:00", "the first publication, not the paid lift");
  assert.deepEqual([ad.flags.daysOnSale, ad.flags.vinChecked, ad.flags.exchange], [37, true, false]);
  // Leather and 4x4 come from the specs, as for mobile.de.
  assert.deepEqual(ad.features.slice(-2), ["Lederausstattung", "Allradantrieb"]);
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features, 12).map((item) => item.label),
    ["Tapicerka skórzana", "Reflektory Matrix LED", "Aktywny tempomat (ACC)", "Kamera 360°", "Podgrzewane fotele", "Napęd 4x4", "Hak holowniczy", "Dostęp bezkluczykowy"]);
});

test("av.by, a damaged electric car: no engine size, range, doors from the body", () => {
  const offer = {
    id: 141886191, price: price(3264, 2919), organizationId: 205399, organizationTitle: "Автолот", sellerName: "Автолот", locationName: "Минск",
    organization: { id: 205399, title: "Автолот", legalName: "ООО «БелАвтоЛот»", location: "ул. Инженерная, 38А", advertsCountByAdvertType: { advertTypes: { cars: 56, truck: 3 } }, organizationRating: { count: 15, averageScore: 2.1 } },
    description: "Автомобиль в аварийном состоянии.", publishedAt: "2026-10-09T10:46:43+0000",
    metadata: { condition: { id: 3, label: "аварийный" }, options: [] },
    properties: props({ brand: "Toyota", model: "BZ3X", year: "2025", engine_type: "электро", transmission_type: "автомат", generation_with_years: "(2025 - ...)",
      interior_color: "светлый", interior_material: "искусственная кожа", engine_endurance: "610", mileage_km: 16500, body_type: "внедорожник 5 дв.",
      drive_type: "передний привод", color: "белый", registration_country: "снят с учёта", condition: "аварийный", engine_power: 224 }),
    photos: [photo(1384, true)],
  };
  const ad = AD.parseAvby(offer, "https://cars.av.by/toyota/bz3x/141886191");
  const { specs } = ad;
  assert.equal(ad.title, "Toyota BZ3X");
  assert.deepEqual([specs.ccm, specs.powerHp, specs.powerKw, specs.fuel, specs.gearbox, specs.body, specs.doors, specs.rangeKm, specs.interior],
    [0, 224, 165, "elektryczny", "automatyczna", "SUV", "5", 610, "ekoskóra, jasny"]);
  assert.deepEqual([specs.accidentFree, specs.damaged, ad.flags.damaged, ad.flags.readyToDrive], [false, true, true, null]);
  assert.deepEqual([ad.seller.stock, ad.seller.rating.score, ad.seller.page], [56, 2.1, "https://cars.av.by/filter?organization=205399"]);
  assert.deepEqual(ad.features, [], "artificial leather is no leather option");
  assert.equal(ad.portalPrice, null);
});

test("av.by words in Polish: every value of av.by's filter list", () => {
  const spec = (name, value) => AD.parseAvby({ price: price(1, 1), properties: props({ [name]: value }) }).specs;
  assert.deepEqual(["бензин", "дизель", "бензин (гибрид)", "дизель (гибрид)", "электро", "бензин (пропан-бутан)", "бензин (метан)"].map((value) => spec("engine_type", value).fuel),
    ["benzyna", "diesel", "hybryda (benzyna)", "hybryda (diesel)", "elektryczny", "benzyna + LPG", "benzyna + CNG"]);
  assert.deepEqual(["автомат", "автоматическая", "робот", "вариатор", "механика"].map((value) => spec("transmission_type", value).gearbox),
    ["automatyczna", "automatyczna", "automatyczna", "automatyczna", "manualna"]);
  assert.deepEqual(["передний привод", "задний привод", "подключаемый полный привод", "постоянный полный привод"].map((value) => spec("drive_type", value).drive),
    ["przedni", "tylny", "4x4", "4x4"]);
  const bodies = ["седан", "универсал", "внедорожник 3 дв.", "хэтчбек 3 дв.", "хэтчбек 5 дв.", "лифтбек", "купе", "кабриолет", "родстер", "минивэн",
    "микроавтобус пассажирский", "микроавтобус грузопассажирский", "легковой фургон", "пикап", "лимузин", "другой"];
  assert.deepEqual(bodies.map((value) => spec("body_type", value).body),
    ["sedan", "kombi", "SUV", "hatchback", "hatchback", "hatchback", "coupé", "kabriolet", "kabriolet", "van", "van", "van", "van", "SUV", "sedan", ""]);
  assert.deepEqual(bodies.map((value) => spec("body_type", value).doors).filter(Boolean), ["3", "3", "5"]);
  assert.deepEqual(["белый", "бордовый", "жёлтый", "зелёный", "коричневый", "красный", "оранжевый", "серебристый", "серый", "синий", "фиолетовый", "чёрный", "другой"].map((value) => spec("color", value).color),
    ["biały", "bordowy", "żółty", "zielony", "brązowy", "czerwony", "pomarańczowy", "srebrny", "szary", "niebieski", "fioletowy", "czarny", ""]);
  assert.deepEqual(["натуральная кожа", "искусственная кожа", "ткань", "велюр", "алькантара", "комбинированные материалы"].map((value) => spec("interior_material", value).interior),
    ["skórzana", "ekoskóra", "materiałowa", "welurowa", "Alcantara", "łączona"]);
  assert.deepEqual(["снят с учёта", "Беларусь", "Россия", "Другая страна"].map((value) => spec("registration_country", value).registration),
    ["wyrejestrowany", "zarejestrowany na Białorusi", "zarejestrowany w Rosji", "zarejestrowany za granicą"]);
  assert.deepEqual([spec("number_of_seats", "7 мест").seats, spec("engine_capacity", "2,0").ccm, spec("generation", "III · 2-й рестайлинг").generation], [7, 2000, "III lifting 2"]);
  const parts = AD.parseAvby({ price: price(1, 1), properties: props({ condition: "на запчасти" }) });
  assert.deepEqual([parts.specs.damaged, parts.flags.readyToDrive], [true, false]);
  assert.equal(AD.parseAvby({ price: price(1, 1), properties: props({ condition: "новый" }) }).flags.isNew, true);
  assert.throws(() => AD.parseAvby({}), /no ad data/);
  assert.throws(() => AD.parseAvby(null), /no ad data/);
});

// ---- otomoto: the ad as the page's __NEXT_DATA__ holds it ----
const otomotoPage = (advert) => `<!DOCTYPE html><html><head></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { advertDetailsId: "ID6IheDu", advert } } })}</script></body></html>`;
// { key: [value, label] } → parametersDict ({ key: { label: key, values: [{ value, label }] } }).
const otoParams = (list) => Object.fromEntries(Object.entries(list).map(([key, [value, label = value]]) => [key, { label: key, values: [{ value, label }] }]));
const otoEquipment = (...labels) => [{ key: "comfort_and_addons", label: "Komfort i dodatki", values: labels.map((label, index) => ({ key: `k${index}`, label })) }];
const olx = (name) => `https://ireland.apollo.olxcdn.com/v1/files/${name}-OTOMOTOPL/image`;

test("otomoto, a dealer with VAT to deduct: net from the page, Polish values, seller, photos the PDF can load", () => {
  const html = otomotoPage({
    id: "6151034087", status: "ACTIVE", title: "BMW X5 xDrive30d mHEV M Sport",
    url: "https://www.otomoto.pl/osobowe/oferta/bmw-x5-ID6IheDu.html",
    price: { value: "389900", currency: "PLN", labels: ["ad-page-vat-deductible-tag", "Faktura VAT"] },
    advertPriceForPriceDrop: { isNet: true, showNet: false, grossMinorAmount: 38990000, netMinorAmount: 31699200 },
    images: { photos: [{ id: olx("a1"), url: olx("a1") }, { id: olx("a2"), url: `${olx("a2")};s=148x110` }, { url: "https://example.com/x.jpg" }], thumbnails: [{ url: `${olx("a1")};s=148x110` }] },
    description: "<p><b>BMW X5</b> po liftingu.</p><p>Data pierwszej rejestracji: 2024-05-14</p><ul><li>M Pro</li></ul>",
    parametersDict: otoParams({
      make: ["bmw", "BMW"], model: ["x5", "X5"], version: ["ver-xdrive30d", "xDrive30d mHEV M Sport"], year: ["2024"], mileage: ["75856", "75 856 km"],
      engine_capacity: ["2993", "2 993 cm3"], engine_power: ["298", "298 KM"], fuel_type: ["diesel", "Diesel"], gearbox: ["automatic", "Automatyczna"],
      transmission: ["all-wheel-permanent", "4x4 (stały)"], body_type: ["suv", "SUV"], color: ["grey", "Szary"], colour_type: ["matt", "Matowy"],
      door_count: ["5"], nr_seats: ["7"], upholstery_type: ["leather-upholstery", "Tapicerka skórzana"], new_used: ["used", "Używany"],
      original_owner: ["1", "Tak"], no_accident: ["1", "Tak"], damaged: ["0", "Nie"], service_record: ["1", "Tak"], registered: ["1", "Tak"],
      country_origin: ["pl", "Polska"], is_imported_car: ["0", "Nie"], rhd: ["0", "Po lewej"], vat: ["1", "Tak"], leasing_concession: ["1", "Tak"],
      maker_warranty_valid_until_date: ["2027-05-12"], date_registration: ["Ww4EqlUBTDkc.1.e7tU==", "Ww4EqlUBTDkc.1.e7tU=="],
    }),
    equipment: otoEquipment("Hak", "Kamera panoramiczna 360", "Tapicerka skórzana", "Kierownica skórzana", "Wyświetlacz typu Head-Up", "Hak"),
    seller: {
      type: "PROFESSIONAL", name: "Autopark Store - auta premium | leasing", id: "1",
      featuresBadges: [{ code: "authorized-dealer", label: "Autoryzowany Dealer" }, { code: "fast-reply", label: "Bardzo sprawnie odpowiada" }, { code: "registration-date", label: "Sprzedający na OTOMOTO od 2012" }],
      logos: [{ type: "logo", image: { alt: "Mikołaj Z." } }], sellerUrl: "https://autopark.otomoto.pl/inventory", website: "https://autopark.example.pl/", numberOfActiveAds: 12,
      location: { address: "Południowa 5", city: "Szczecin", region: "", country: "Polska", postalCode: "71-001", shortAddress: "Południowa 5 - 71-001 Szczecin, Zachodniopomorskie (Polska)" },
    },
    // createdAt moves with each paid bump; originalCreatedAt is the day it was put up.
    createdAt: "2026-10-10T07:03:18Z", originalCreatedAt: "2026-09-12T07:00:15Z",
  });
  const ad = AD.parseOtomoto(html, "https://www.otomoto.pl/osobowe/oferta/bmw-x5-ID6IheDu.html");
  assert.equal(ad.source, "otomoto");
  assert.equal(ad.title, "BMW X5 xDrive30d mHEV M Sport", "the version once");
  assert.deepEqual(ad.images, [`${olx("a1")};s=1200x0`, `${olx("a2")};s=1200x0`], "a size the CDN serves cross-origin, foreign hosts out");
  assert.equal(ad.description, "BMW X5 po liftingu.\nData pierwszej rejestracji: 2024-05-14\n\n• M Pro");
  const { specs } = ad;
  assert.deepEqual([specs.firstRegistration, specs.productionYear, specs.mileage, specs.ccm, specs.powerHp, specs.powerKw], ["05/2024", 2024, 75856, 2993, 298, 219]);
  assert.deepEqual([specs.fuel, specs.gearbox, specs.drive, specs.body, specs.color, specs.interior, specs.doors, specs.seats], ["diesel", "automatyczna", "4x4", "SUV", "szary matowy", "skórzana", "5", 7]);
  assert.deepEqual([specs.owners, specs.accidentFree, specs.damaged, specs.serviceBook, specs.registeredPl, specs.countryOrigin, specs.countryVersion, specs.trim],
    [1, true, false, true, true, "Polska", "wersja polska", "xDrive30d mHEV M Sport"]);
  assert.deepEqual(ad.features, ["Hak", "Kamera panoramiczna 360", "Tapicerka skórzana", "Kierownica skórzana", "Wyświetlacz typu Head-Up", "Napęd 4x4"]);
  assert.deepEqual(ad.vat, { deductible: true, rate: 23, net: 316992, gross: 389900, currency: "PLN", invoice: true, margin: false });
  assert.equal(ad.currency, "PLN");
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, zip: ad.seller.zip, country: ad.seller.country, address: ad.seller.address },
    { type: "dealer", name: "Autopark Store", city: "Szczecin", zip: "71-001", country: "PL", address: "Południowa 5, 71-001 Szczecin" });
  assert.deepEqual([ad.seller.since, ad.seller.authorized, ad.seller.stock, ad.seller.page, ad.seller.badges], ["2012", true, 12, "https://autopark.otomoto.pl/inventory", ["Bardzo sprawnie odpowiada"]]);
  assert.equal(ad.listedAt, "2026-09-12T07:00:15Z", "the day it was put up, not the last bump");
  assert.equal(ad.makerWarranty, "do 05/2027");
  assert.equal(ad.warranty, null, "the dealer's own warranty is not a field");
  assert.deepEqual(ad.seals, []);
  assert.equal(ad.flags.negotiable, false);
  assert.equal(ad.flags.leasing, true);
});

test("otomoto, a dealer with 'VAT marża', an imported car, plain-text description, brand programme", () => {
  const html = otomotoPage({
    id: "6151000842", status: "ACTIVE", title: "Toyota C-HR",
    price: { value: "78900", currency: "PLN", labels: ["ad-page-negotiable-tag"] },
    advertPriceForPriceDrop: { isNet: false, grossMinorAmount: 7890000, netMinorAmount: 6414700 },
    images: { photos: [{ url: olx("b1") }] },
    description: "Auto z Belgii.\r\n\r\nRok produkcji 2017, pierwsza rejestracja 2018r\r\nCena do negocjacji",
    parametersDict: otoParams({
      make: ["toyota", "Toyota"], model: ["c-hr", "C-HR"], version: ["ver-1-8", "1.8 Hybrid Prestige"], generation: ["gen-ax10-2016", "AX10 (2016-2023)"], year: ["2018"],
      mileage: ["122043"], engine_capacity: ["1798"], engine_power: ["122"], fuel_type: ["hybrid", "Hybryda"], gearbox: ["automatic"], transmission: ["front-wheel", "Na przednie koła"],
      body_type: ["suv", "SUV"], color: ["grey", "Szary"], colour_type: ["pearl", "Perłowy"], upholstery_type: ["upholstery-with-leather-inserts", "Tapicerka częściowo skórzana"],
      country_origin: ["b", "Belgia"], is_imported_car: ["1", "Tak"], registered: ["1", "Tak"], vat_discount: ["1", "Tak"], no_accident: ["1", "Tak"],
    }),
    equipment: otoEquipment("Tapicerka częściowo skórzana", "Kamera parkowania tył"),
    seller: {
      type: "PROFESSIONAL", name: "★★ DEALER SAMOCHODÓW UŻYWANYCH Z BELGII I NIEMIEC - SAMOCHODY Z GWARANCJĄ !! ★★",
      featuresBadges: [{ code: "dealer", label: "Firma" }, { code: "registration-date", label: "Sprzedający na OTOMOTO od 2022" }],
      logos: [{ type: "brandProgram", image: { alt: "Toyota Pewne Auto" } }], numberOfActiveAds: 14,
      location: { address: "-", city: "Brzozów", country: "Polska", postalCode: "36-200" },
    },
    createdAt: "2026-10-09T12:29:17Z", originalCreatedAt: "2026-10-07T09:33:06Z",
  });
  const ad = AD.parseOtomoto(html);
  assert.equal(ad.title, "Toyota C-HR 1.8 Hybrid Prestige");
  assert.equal(ad.description, "Auto z Belgii.\n\nRok produkcji 2017, pierwsza rejestracja 2018r\nCena do negocjacji");
  assert.equal(ad.specs.firstRegistration, "2018", "not a full date: the production year");
  assert.deepEqual([ad.specs.fuel, ad.specs.drive, ad.specs.color, ad.specs.interior, ad.specs.generation], ["hybryda (benzyna)", "przedni", "szary perłowy", "półskórzana", "AX10 (2016-2023)"]);
  assert.deepEqual([ad.specs.countryOrigin, ad.specs.countryVersion, ad.specs.imported, ad.specs.owners, ad.specs.firstOwner], ["Belgia", "", true, null, null]);
  assert.deepEqual(ad.vat, { deductible: false, rate: 0, net: 0, gross: 78900, currency: "PLN", invoice: false, margin: true });
  assert.deepEqual({ name: ad.seller.name, address: ad.seller.address, stock: ad.seller.stock, authorized: ad.seller.authorized },
    { name: "DEALER SAMOCHODÓW UŻYWANYCH Z BELGII I NIEMIEC", address: "36-200 Brzozów", stock: 14, authorized: false });
  assert.match(ad.seller.nameFull, /Z GWARANCJĄ/);
  assert.deepEqual(ad.seals, [{ name: "Toyota Pewne Auto", benefits: [] }]);
  assert.equal(ad.flags.negotiable, true);
});

test("otomoto, a private seller: no name on the sheet, district left out, damaged, values in Polish", () => {
  const html = otomotoPage({
    id: "1", title: "Volkswagen Passat 1.4 TSI GTE",
    price: { value: "62800", currency: "PLN", labels: [] },
    images: { photos: [] },
    description: "<p>Pierwsza rejestracja: 03.2009, auto uszkodzone z przodu.</p>",
    parametersDict: otoParams({
      year: ["2020"], mileage: ["47355"], engine_power: ["218"], fuel_type: ["plugin-hybrid", "Hybryda Plug-in"], gearbox: ["automatic"],
      body_type: ["combi", "Kombi"], color: ["dark-red", "Bordowy"], damaged: ["1", "Tak"], original_owner: ["0", "Nie"], registered: ["0", "Nie"], rhd: ["1", "Po prawej"],
    }),
    equipment: [],
    seller: { type: "PRIVATE", name: "Dawid", featuresBadges: [{ code: "private-seller", label: "Osoba prywatna" }, { code: "registration-date", label: "Sprzedający na OTOMOTO od 2026" }],
      location: { address: "Warszawa, Praga-Północ", city: "Warszawa", region: "Mazowieckie", country: "", postalCode: "" } },
    createdAt: "2026-10-08T09:17:04Z",
  });
  const ad = AD.parseOtomoto(html);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, contactName: ad.seller.contactName, city: ad.seller.city, zip: ad.seller.zip, country: ad.seller.country, address: ad.seller.address, stock: ad.seller.stock, since: ad.seller.since },
    { type: "private", name: "", contactName: "Dawid", city: "Warszawa", zip: "", country: "PL", address: "Warszawa", stock: null, since: "2026" });
  assert.equal(ad.specs.firstRegistration, "2020", "a date years before the production year is not taken");
  assert.deepEqual([ad.specs.fuel, ad.specs.body, ad.specs.color, ad.specs.ccm, ad.specs.drive], ["hybryda plug-in", "kombi", "bordowy", 0, ""]);
  assert.deepEqual([ad.specs.accidentFree, ad.specs.damaged, ad.flags.damaged, ad.specs.owners, ad.specs.firstOwner, ad.specs.registeredPl, ad.flags.rhd], [false, true, true, null, false, false, true]);
  assert.equal(ad.listedAt, "2026-10-08T09:17:04Z", "createdAt when there is no originalCreatedAt");
  assert.deepEqual(ad.vat, { deductible: false, rate: 0, net: 0, gross: 62800, currency: "PLN", invoice: false, margin: false });
  assert.deepEqual(ad.images, []);
});

test("otomoto machine values in the shared Polish words", () => {
  const spec = (list) => AD.parseOtomoto(otomotoPage({ price: { value: "1" }, parametersDict: otoParams(list) })).specs;
  assert.deepEqual(["petrol", "diesel", "hybrid", "plugin-hybrid", "electric", "petrol-lpg", "petrol-cng", "etanol", "hidrogen"].map((fuel) => spec({ fuel_type: [fuel] }).fuel),
    ["benzyna", "diesel", "hybryda (benzyna)", "hybryda plug-in", "elektryczny", "benzyna + LPG", "benzyna + CNG", "benzyna (E85)", "wodór"]);
  assert.deepEqual(["combi", "compact", "city-car", "mini", "sedan", "suv", "minivan", "coupe", "cabrio"].map((body) => spec({ body_type: [body] }).body),
    ["kombi", "hatchback", "hatchback", "hatchback", "sedan", "SUV", "van", "coupé", "kabriolet"]);
  assert.deepEqual(["front-wheel", "rear-wheel", "all-wheel-auto", "all-wheel-lock", "all-wheel-permanent"].map((drive) => spec({ transmission: [drive] }).drive),
    ["przedni", "tylny", "4x4", "4x4", "4x4"]);
  assert.deepEqual(["automatic", "manual"].map((gearbox) => spec({ gearbox: [gearbox] }).gearbox), ["automatyczna", "manualna"]);
  assert.deepEqual(["white", "black", "silver", "grey", "blue", "navy-blue", "sky-blue", "red", "dark-red", "green", "brown", "brown-beige", "yellow", "yellow-gold", "orange", "violet", "other"]
    .map((color) => spec({ color: [color] }).color),
  ["biały", "czarny", "srebrny", "szary", "niebieski", "granatowy", "błękitny", "czerwony", "bordowy", "zielony", "brązowy", "beżowy", "żółty", "złoty", "pomarańczowy", "fioletowy", ""]);
  assert.equal(spec({ color: ["black"], colour_type: ["metallic"] }).color, "czarny metalik");
  assert.deepEqual(["leather-upholstery", "upholstery-with-leather-inserts", "textile-upholstery", "alcantara-upholstery"].map((value) => spec({ upholstery_type: [value] }).interior),
    ["skórzana", "półskórzana", "materiałowa", "Alcantara"]);
});

test("otomoto: dealers' slogans out of the name, a page without the ad refused", () => {
  const name = (text) => AD.parseOtomoto(otomotoPage({ price: { value: "1" }, seller: { type: "PROFESSIONAL", name: text } })).seller.name;
  assert.equal(name("Toyota Komorniki - sprzedaż | odkup | finansowanie | ubezpieczenie |"), "Toyota Komorniki");
  assert.equal(name("*Auto-Tina* - Samochody uszkodzone Gorczyn 104, 98-100 Łask"), "Auto-Tina");
  assert.equal(name("AUTO-HANDEL &quot;PRZEMO&quot; Przemysław Mróz"), 'AUTO-HANDEL "PRZEMO" Przemysław Mróz');
  assert.equal(name("Otomoto Lease - 300 pojazdów do odbioru od ręki ! Autoryzowani dealerzy ! Mega rabaty !"), "Otomoto Lease");
  assert.equal(name("Samochody Używane Świtoń-Paczkowski Lubin I Audi Select: Plus I Certyfikowane Używane"), "Samochody Używane Świtoń-Paczkowski Lubin I Audi Select: Plus I Certyfikowane");
  assert.throws(() => AD.parseOtomoto("<html><title>Otomoto</title></html>"), /no ad data/);
  // A removed ad sends the search page: its __NEXT_DATA__ has no advert.
  assert.throws(() => AD.parseOtomoto('<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"urqlState":{}}}}</script>'), /no ad data/);
});

test("otomoto options: the upholstery only for leather, the 360° camera is no glass roof, otomoto's own labels", () => {
  const options = EQUIPMENT.keyOptions(["Kierownica skórzana", "Tapicerka materiałowa", "Kamera panoramiczna 360", "System nawigacji satelitarnej"]).map((item) => item.id);
  assert.deepEqual(options, ["camera360", "nav"]);
  assert.deepEqual(EQUIPMENT.keyOptions(["Tapicerka częściowo skórzana", "Podgrzewany fotel kierowcy", "Kierownica ogrzewana", "Hak", "Klimatyzacja automatyczna: dwustrefowa"]).map((item) => item.label),
    ["Tapicerka półskórzana", "Podgrzewane fotele", "Podgrzewana kierownica", "Hak holowniczy", "Klimatyzacja automatyczna"]);
});

// ---- Blocket (SE, checked 2026-10-10: Vend platform, server-rendered page) ----
const ldBlocket = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const contact = (segment) => `<script id="contact-button-data" type="application/json">\n{"name":"contact-button-podlet","adId":"1","locale":"sv","segment":"${segment}"}\n</script>`;
const blocketPhoto = (id, uuid, index) => `<img class="w-full h-full" id="gallery-image-${index}" srcSet="https://images.blocketcdn.se/dynamic/1600w/item/${id}/${uuid} 1600w,https://images.blocketcdn.se/dynamic/640w/item/${id}/${uuid} 640w,https://images.blocketcdn.se/dynamic/142w/item/${id}/${uuid} 142w" alt="Bild ${index + 1}"/>`;
const head = (place, title, subtitle, priceLabel, price, net = "") => `<a href="https://www.google.com/maps/search/?api=1&amp;query=x" target="_blank" rel="noopener nofollow" class="min-w-0 text-ellipsis overflow-hidden ml-12">${place}</a></div>
<div class="md:col-span-2"><h1 class="t1 mb-0 break-words s-text! no-underline!">${title}</h1><p class="s-text-subtle mb-0 mt-8 break-words">${subtitle}</p>
<div class="border-t pt-40 mt-40"><div class="flex flex-col"><p class="s-text-subtle mb-0">${priceLabel}</p><h2 class="mb-0 mt-8"><span class="t2">${price}</span></h2>${net ? `<p class="s-text-subtle text-s mb-0">(${net} kr exkl. moms)</p>` : ""}</div></div></div>`;
const dealerBox = (name, member, address, orgId, count) => `<w-box bordered="" class="my-16"><div class="mb-16"><h2 class="sr-only">Återförsäljarens uppgifter</h2><img src="https://dealerhub.cdn-vend.com/x" alt="${name} logo"/><h3 class="mb-4">${name}</h3><a class="flex" href="https://www.allabolag.se/foretag/x">Visa företagsfakta på Allabolag.se</a><p class="s-text-subtle mt-4">${member}</p><div class="flex flex-col space-y-12 mt-16"><a class="flex gap-8" href="https://www.google.com/maps/x"><span class="sr-only">,</span><span>${address}</span></a><a href="https://www.blocket.se/mobility/dealer/${orgId}/x-ab" class="flex gap-8"><span>Gå till handlarens sida</span></a><a href="https://www.blocket.se/mobility/search/car?orgId=${orgId}" class="flex gap-8"><span>Visa handlarens ${count} annonser</span></a></div></div><div class="flex flex-col gap-y-16"><img alt="Medlem i Motorbranschens Riksförbund logo"/><h3 class="text-body mb-4">Medlem i Motorbranschens Riksförbund</h3></div></w-box>`;
const description = (html) => `<section class="pt-40"><h2 class="t3 mb-0">Beskrivning</h2><div data-testid="expandable-section" class="overflow-hidden"><div class="whitespace-pre-wrap import-decoration">${html}</div></div></section>`;
const spec = (label, value) => `<div class="pb-16 md:pb-20 " style="break-inside:avoid-column"><dt class="capitalize&amp;::first-letter m-0 s-text-subtle">${label}</dt><dd class="t4 m-0">${value}</dd></div>`;
const specs = (...rows) => `<div class="specifications-area"><section class="key-info"><h2 class="t3 mb-0">Specifikationer</h2><dl class="emptycheck columns-2 md:columns-3">${rows.map((row) => spec(...row)).join("")}</dl></section></div>`;
const equipment = (...names) => `<section class="border-t pt-40 mt-40"><div class="flex items-end gap-12"><h2 class="t3 mb-0">Utrustning</h2><w-button variant="link">Sortera alfabetiskt</w-button></div><ul class="columns-2 md:columns-3">${names.map((name) => `<li class="last:mb-0 mb-8 md:mb-16">${name}</li>`).join("")}</ul></section>`;
const tab = (name, text) => `<div tabindex="-1" role="tabpanel" aria-labelledby="warp-tab-${name}" id="warp-tabpanel-${name}"><div><p class="mb-0 whitespace-pre-line">${text}</p></div></div>`;
const knowledge = (...pairs) => `<section class="mt-40 pt-40 border-t"><h2 class="t3 mb-0">Säljarens kännedom om bilen</h2>${pairs.map(([question, answer]) => `<p class="font-bold mt-16 mb-0">${question}</p><p class="mb-0 mt-16">${answer}</p>`).join("")}</section>`;
const place = (text) => `<div class="mt-40 pt-40 border-t"><h2 class="t3 mb-16">Plats</h2><div class="flex items-center gap-4"><w-icon name="PinMarker"></w-icon><w-button variant="link" href="https://www.google.com/maps/search/?api=1&amp;query=x" target="_blank"><span class="flex items-center gap-4">${text}<w-icon name="LinkExternal"></w-icon></span></w-button></div></div>`;
const adInfo = (id) => `<h2 class="sr-only">Annonsinformation</h2><div><p class="s-text-subtle mb-0">Annons-ID</p><p class="font-bold whitespace-nowrap mb-0 md:mt-8">${id}</p></div><div><p class="s-text-subtle mb-0">Uppdaterad</p><p class="font-bold whitespace-nowrap mb-0 md:mt-8">6 oktober 2026, 15:54</p></div>`;
const product = (name, price, seller, id) => ldBlocket({ "@type": "Product", name, offers: { "@type": "Offer", price, priceCurrency: "SEK", seller: { "@type": seller } }, url: `https://www.blocket.se/mobility/item/${id}`, brand: { "@type": "Brand", name: name.split(" ")[0] }, model: { "@type": "ProductModel", name: name.split(" ").slice(1).join(" ") } });

test("Blocket, a dealer with deductible VAT: photos, specs in Polish, equipment, seller with stock", () => {
  const html = [
    product("Volvo V90", 269800, "Organization", "26962291"), contact("PROFESSIONAL"),
    blocketPhoto("26962291", "e1eb16e9-5a6b", 0), blocketPhoto("26962291", "b6aa379f-b02b", 1), blocketPhoto("26962291", "e1eb16e9-5a6b", 2),
    head("Hisings Backa", "Volvo V90", "B4 AWD Momentum Advanced B-Kam H/K Navi", "Pris", "269 800 kr", "215 840"),
    dealerBox("Kamux Göteborg", "5+ år på Blocket", "Transportgatan 49, 422 46 HISINGS BACKA", "3428083", "116"),
    description("PÅ KAMUX.SE KAN DU:<br>- Räkna ut din månadskostnad<br><br>Välkommen!"),
    specs(["Märke", "Volvo"], ["Modell", "V90"], ["Modellår", "2021"], ["Biltyp", "Kombi"], ["Drivmedel", "Diesel"], ["Effekt", "197 Hk"], ["Motorvolym", "2 L"],
      ["Miltal", "14 283 mil"], ['Bränsleförbrukning <span class="whitespace-nowrap">(NEDC)<span><w-attention><p slot="message">NEDC var den officiella testcykeln</p></w-attention></span></span>', "6,4 L/100 km"],
      ["Växellåda", "Automatisk"], ["Drivhjul", "Fyrhjulsdrift"], ["Säten", "5"], ["Färg", "Svart"], ["Färgbeskrivning", "Svart"], ["Registreringsdatum", "2021-02-28"]),
    equipment("Halvskinnklädsel", "Backkamera", "Harman Kardon", "Keyless Entry &amp; Start", "360 kr i årsskatt", "Svensksåld", "Miljöklass Euro6d", "Öppet Lördag 10-15"),
    tab("exchangePolicyTab", "30 dagars bytesrätt"), tab("homeDeliveryTab", "Kamux erbjuder hemleverans"),
    place("Transportgatan 49, 42246 Hisings Backa"),
    '<p>Orgnr: 556897-5725</p>', adInfo("26962291"),
    // A recommended car below: its photo is not this ad's.
    '<img src="https://images.blocketcdn.se/dynamic/640w/item/27000000/ffff-0000" alt="">',
  ].join("\n");
  const ad = AD.parseBlocket(html, "https://www.blocket.se/mobility/item/26962291");
  assert.equal(ad.source, "blocket");
  assert.deepEqual([ad.title, ad.make, ad.model], ["Volvo V90 B4 AWD Momentum Advanced B-Kam H/K Navi", "Volvo", "V90"]);
  assert.deepEqual(ad.images, ["https://images.blocketcdn.se/dynamic/1600w/item/26962291/e1eb16e9-5a6b", "https://images.blocketcdn.se/dynamic/1600w/item/26962291/b6aa379f-b02b"], "this ad's photos, large, once each");
  assert.equal(ad.description, "PÅ KAMUX.SE KAN DU:\n- Räkna ut din månadskostnad\n\nVälkommen!");
  const { specs: car } = ad;
  assert.deepEqual([car.firstRegistration, car.mileage, car.ccm, car.powerHp, car.powerKw], ["02/2021", 142830, 2000, 197, 145], "mil × 10, litres → cm³");
  assert.deepEqual([car.fuel, car.gearbox, car.drive, car.body, car.color, car.colorMaker, car.interior, car.seats], ["diesel", "automatyczna", "4x4", "kombi", "czarny", "", "półskórzana", 5]);
  assert.deepEqual([car.emission, car.countryVersion, car.owners, car.hu, car.accidentFree], ["Euro 6d", "wersja szwedzka", null, "", null], "dealers do not say whether the car is accident-free");
  // Tax, emission class, origin and opening hours are not equipment; the rest as written.
  assert.deepEqual(ad.features, ["Halvskinnklädsel", "Backkamera", "Harman Kardon", "Keyless Entry & Start"]);
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, zip: ad.seller.zip, country: ad.seller.country, stock: ad.seller.stock, orgNumber: ad.seller.orgNumber },
    { type: "dealer", name: "Kamux Göteborg", city: "Hisings Backa", zip: "422 46", country: "SE", stock: 116, orgNumber: "556897-5725" });
  assert.equal(ad.seller.address, "Transportgatan 49, 422 46 Hisings Backa");
  assert.equal(ad.seller.since, String(new Date().getFullYear() - 5), "5+ years on Blocket: the latest year it can be");
  assert.equal(ad.seller.page, "https://www.blocket.se/mobility/dealer/3428083/x-ab");
  assert.equal(ad.seller.stockUrl, "https://www.blocket.se/mobility/search/car?orgId=3428083");
  assert.deepEqual(ad.seller.badges, ["MRF (Motorbranschens Riksförbund)"]);
  assert.deepEqual(ad.vat, { deductible: true, rate: 25, net: 215840, gross: 269800 });
  assert.equal(ad.currency, "SEK");
  assert.equal(ad.listedAt, "", "the page shows the last update, not the listing day");
  assert.deepEqual([ad.flags.exchangeRight, ad.flags.homeDelivery, ad.warranty], [true, true, null]);
});

test("Blocket, a dealer without VAT: total price, inspection, owners, warranty offer is not a warranty", () => {
  const html = [
    product("Volvo XC60", 429000, "Organization", "27060292"), contact("PROFESSIONAL"),
    head("Gävle", "Volvo XC60", "T6 AWD Core Edition", "Totalt pris", "429 000 kr"),
    dealerBox("Svenska Bil &amp; Däck AB", "3 år på Blocket", "Skolgången 10, 802 57 GÄVLE", "4254731", "61"),
    specs(["Biltyp", "SUV"], ["Drivmedel", "Plug-in Bensin"], ["Effekt", "350 Hk"], ["Motorvolym", "1,97 L"], ["Miltal", "9 124 mil"], ["Växellåda", "Automatisk"],
      ["Drivhjul", "Fyrhjulsdrift"], ["Antal dörrar", "5"], ["Färg", "Grå"], ["Färgbeskrivning", "Vapour Grey Metallic"], ["Färg interiör", "Skinnklädsel i Charcoal"],
      ["Senaste besiktningsdatum", "2026-07-29"], ["Nästa besiktningsdatum", "2028-07-31"], ["Registreringsdatum", "2023-07-13"], ["Antal ägare", "3"]),
    equipment("Fin servicehistorik", "Panoramaglastak"),
    tab("warrantyTab", "Hos oss kan du teckna garanti upp till 36 månader."), tab("serviceHistoryTab", "2025-01-08 1811 mil\n2026-03-02 7071 mil"),
    place("Skolgången 10, 80257 Gävle"),
  ].join("\n");
  const ad = AD.parseBlocket(html, "https://www.blocket.se/mobility/item/27060292");
  assert.deepEqual(ad.vat, { deductible: false, rate: 0, net: 0, gross: 429000 });
  const { specs: car } = ad;
  assert.deepEqual([car.fuel, car.body, car.ccm, car.mileage, car.doors, car.owners], ["hybryda plug-in", "SUV", 1970, 91240, "5", 3]);
  assert.deepEqual([car.color, car.colorMaker, car.interior], ["szary metalik", "Vapour Grey Metallic", "skórzana"]);
  assert.deepEqual([car.hu, car.huLast, car.firstRegistration, car.serviceBook], ["do 07/2028", "2026-07-29", "07/2023", true]);
  assert.equal(ad.warranty, null, "a warranty the buyer can buy is not one that comes with the car");
  assert.match(ad.flags.warrantyText, /36 månader/);
  assert.equal(ad.seller.since, String(new Date().getFullYear() - 3));
  assert.deepEqual([ad.seller.name, ad.seller.city, ad.seller.zip, ad.seller.badges.length], ["Svenska Bil & Däck AB", "Gävle", "802 57", 1]);
});

test("Blocket, a private seller: no name, the seller's answers, Blocket's own boxes", () => {
  const html = [
    product("Toyota Auris", 106000, "Person", "27120157"), contact("PRIVATE"),
    blocketPhoto("27120157", "8d78da08", 0),
    head("Göteborg", "Toyota Auris", "Touring Sports Hybrid e-CVT", "Totalt pris", "106 000 kr"),
    description("<p>Toyota Auris Touring Sports</p><ul><li>Mätarställning<p>19 300 mil</p></li></ul><p><b>Servicehistorik</b></p><ul><li>Full servicehistorik från Toyota.</li></ul>"),
    specs(["Biltyp", "Halvkombi 5-dörrar"], ["Drivmedel", "Hybrid bensin"], ["Effekt", "136 Hk"], ["Motorvolym", "1,8 L"], ["Miltal", "19 300 mil"],
      ["Växellåda", "Automatisk"], ["Drivhjul", "Tvåhjulsdriven"], ["Färg", "Brun"], ["Antal ägare", "2"], ["Registreringsdatum", "2014-10-20"]),
    equipment("Backkamera", "Uppvärmda säten, fram", "Dragkrok, avtagbar/svängbar", "Ratt i läder", "Delvis läderklädda säten"),
    tab("servicePlanFollowedTab", "Fordonets serviceprogram har följts."),
    knowledge(["Har bilen några kända skador?", "Nej"], ["Har det genomförts omfattande reparationer?", "Ja. Kondensorn bytt 25/5 2026."], ["Är eller har motorn varit trimmad?", "Nej"], ["Har bilen några skulder?", "Nej"]),
    place("41322 Göteborg"), adInfo("27120157"),
  ].join("\n");
  const ad = AD.parseBlocket(html);
  assert.equal(ad.url, "https://www.blocket.se/mobility/item/27120157", "the page's own address when none is given");
  assert.deepEqual([ad.make, ad.model], ["Toyota", "Auris"], "from the schema when the specifications do not name them");
  assert.deepEqual(ad.images, ["https://images.blocketcdn.se/dynamic/1600w/item/27120157/8d78da08"]);
  assert.match(ad.description, /Mätarställning[\s\S]*19 300 mil/);
  const { specs: car } = ad;
  assert.deepEqual([car.fuel, car.body, car.doors, car.drive, car.ccm, car.powerKw, car.owners], ["hybryda (benzyna)", "hatchback", "5", "", 1800, 100, 2], "two-wheel drive does not say which wheels");
  assert.deepEqual([car.interior, car.accidentFree, car.damaged, car.serviceBook], ["półskórzana", true, false, true], "the seats, not the leather steering wheel");
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, zip: ad.seller.zip, stock: ad.seller.stock, since: ad.seller.since },
    { type: "private", name: "", city: "Göteborg", zip: "413 22", stock: null, since: "" });
  assert.deepEqual([ad.flags.debt, ad.flags.tuned, ad.flags.repairs], [false, false, "Ja. Kondensorn bytt 25/5 2026."]);
  assert.deepEqual(ad.vat, { deductible: false, rate: 0, net: 0, gross: 106000 });
});

test("Blocket through r.jina.ai: one gallery <img> left, the photos from the ad's own list", () => {
  const html = [
    product("Volvo XC60", 179000, "Organization", "27285269"),
    '<script id="advertising-initial-state" type="application/json">{"config":{"adServer":{"gam":{"targeting":[{"key":"images","value":["https://images.blocketcdn.se/dynamic/default/item/27285269/aaa-1","https://images.blocketcdn.se/dynamic/default/item/27285269/aaa-2"]},{"key":"zipcode","value":["43439"]}]}}}}</script>',
    blocketPhoto("27285269", "aaa-1", 0), head("Kungsbacka", "Volvo XC60", "D4 AWD", "Totalt pris", "179 000 kr"),
    specs(["Miltal", "18 855 mil"], ["Drivmedel", "Diesel"]),
  ].join("\n");
  const ad = AD.parseBlocket(html, "https://www.blocket.se/mobility/item/27285269");
  assert.deepEqual(ad.images, ["https://images.blocketcdn.se/dynamic/1600w/item/27285269/aaa-1", "https://images.blocketcdn.se/dynamic/1600w/item/27285269/aaa-2"]);
  assert.deepEqual([ad.seller.type, ad.seller.city, ad.seller.zip, ad.specs.mileage], ["dealer", "Kungsbacka", "434 39", 188550], "the place under the title, the zip from the ad's data");
});

test("Blocket values in Polish (Swedish words); a blocked page is no ad", () => {
  const read = (rows) => AD.parseBlocket(`${product("Volvo V60", 100000, "Organization", "1")}${specs(...rows)}`, "https://www.blocket.se/mobility/item/1").specs;
  assert.deepEqual(["Bensin", "Diesel", "El", "Hybrid bensin", "Hybrid diesel", "Plug-in Bensin", "Plug-in Diesel", "Etanol (FFV, E85)", "Fordonsgas (CNG)"].map((fuel) => read([["Drivmedel", fuel]]).fuel),
    ["benzyna", "diesel", "elektryczny", "hybryda (benzyna)", "hybryda (diesel)", "hybryda plug-in", "hybryda plug-in", "benzyna (E85)", "benzyna + CNG"]);
  assert.deepEqual(["Cabriolet", "Coupé", "Familjebuss", "Halvkombi 3-dörrar", "Kombi", "Pickup", "Sedan", "Skåpbil", "SUV", "Annat"].map((body) => read([["Biltyp", body]]).body),
    ["kabriolet", "coupé", "van", "hatchback", "kombi", "SUV", "sedan", "van", "SUV", ""]);
  assert.equal(read([["Biltyp", "Halvkombi 3-dörrar"]]).doors, "3");
  assert.deepEqual(["Beige", "Blå", "Brons", "Brun", "Grå", "Grön", "Gul", "Guld", "Lila", "Orange", "Röd", "Silver", "Svart", "Vit"].map((color) => read([["Färg", color]]).color),
    ["beżowy", "niebieski", "brązowy", "brązowy", "szary", "zielony", "żółty", "złoty", "fioletowy", "pomarańczowy", "czerwony", "srebrny", "czarny", "biały"]);
  assert.deepEqual(["Fyrhjulsdrift", "Framhjulsdrift", "Bakhjulsdrift", "Tvåhjulsdriven"].map((drive) => read([["Drivhjul", drive]]).drive), ["4x4", "przedni", "tylny", ""]);
  assert.deepEqual(["Automatisk", "Manuell"].map((gearbox) => read([["Växellåda", gearbox]]).gearbox), ["automatyczna", "manualna"]);
  assert.deepEqual([read([["Effekt", "100 kw (136 hk)"]]).powerHp, read([["Modellår", "2019"]]).firstRegistration], [136, "2019"], "no registration date: the model year");
  const damaged = AD.parseBlocket(`${product("Volvo V60", 100000, "Person", "1")}${knowledge(["Har bilen några kända skador?", "Ja. Buckla i bakluckan."], ["Har bilen några skulder?", "Ja"])}`);
  assert.deepEqual([damaged.specs.accidentFree, damaged.specs.damaged, damaged.flags.knownDamage, damaged.flags.debt], [false, true, "Ja. Buckla i bakluckan.", true]);
  assert.throws(() => AD.parseBlocket("<!doctype html><title>403</title>403 Forbidden"), /no ad data/);
});

// ---- Marktplaats (NL), 2dehands / 2ememain (BE), checked 2026-10-10 ----
// The ad as window.__CONFIG__.listing, the description as the page's own HTML.
const mpGroup = (key, attributes) => ({ key, attributes: attributes.map(([name, value]) => (Array.isArray(value) ? { key: name, values: value } : { key: name, value })) });
const mpPage = (listing, description = "") => [
  '<script>window.__HEADER_CONFIG__ = {"isSticky":true};',
  `window.__CONFIG__ = ${JSON.stringify({ listing: { itemId: "m1", priceInfo: { priceCents: 0, priceType: "FIXED" }, ...listing } })};</script>`,
  `<div class="Description-module-description"><div data-collapsable="description">${description}</div></div><div id="description-button-root"></div>`,
].join("\n");
const thisYear = new Date().getFullYear();

test("Marktplaats, a dealer: photos, the car in Polish, VAT from the feed's line, seller", () => {
  const html = mpPage({
    itemId: "m2448446869",
    title: "Toyota C-HR 2.0 Plug-in Hybrid 220 Business | APPCONNECT | C",
    priceInfo: { priceCents: 3149000, priceType: "FIXED" },
    seller: {
      id: 11730551, name: "IVA Bleiswijk B.V.", sellerType: "TRADER", activeSinceDiff: "17 jaar", activeYears: 17, allAdsUrl: "/u/iva-bleiswijk-b-v/11730551/",
      sellerWebsiteDisplayUrl: "www.ivableiswijk.nl/occasion/toyota/c-hr/occ21995187", location: { cityName: "Bleiswijk", countryAbbreviation: "NL", postcode: "2665LB" },
    },
    gallery: { imageUrls: ["//images.marktplaats.com/api/v1/hz-mp-pro-listing/images/fe75?rule=ecg_mp_eps$_#.jpg", "//images.marktplaats.com/api/v1/hz-mp-pro-listing/images/98e0?rule=ecg_mp_eps$_#.jpg"] },
    stats: { since: "2026-09-30T12:23:33Z" },
    carDetails: { brand: "Toyota", model: "C-HR", condition: "USED", hasNapStatus: false },
    carAttributes: { groupedWithIcons: [
      mpGroup("Basics", [["brand", "Toyota C-HR"], ["trim", "2.0 Plug-in Hybrid 220 Business"], ["constructionYear", 2025], ["mileage", "23.105"], ["vehicleType", "SUV of Terreinwagen"], ["color", "Zilver of Grijs"], ["numberOfDoors", "5"], ["numberOfSeats", "5"]]),
      mpGroup("Technical", [["batteryCapacity", "13"], ["transmission", "Automaat 6 versnellingen"], ["cylinderCapacity", "2.0"], ["powerInHorsePower", 223], ["powerWheelDriver", "Voorwiel"]]),
      mpGroup("Eco", [["fuel", "Hybride Elektrisch/Benzine"], ["euronormBE", "Euro 6"]]),
      mpGroup("History", [["condition", "Gebruikt"], ["dateApk", "28 april 2029"], ["totalNumberOfOwners", "2"], ["isImported", "Ja"], ["firstRecordInNl", "8 januari 2026"], ["serviceHistory", "Dealer onderhouden"]]),
      mpGroup("Options", [["options", ["Achteruitrijcamera", "Adaptive Cruise Control", "Metallic lak", "Navigatiesysteem", "Stoelverwarming", "Stuurwielverwarming"]]]),
    ] },
    automotiveTrustIndicators: { qualityMarks: [{ type: "APK_EXPIRATION_DATE" }, { type: "DEALER_MAINTAINED" }], warranties: [] },
  }, "Toyota C-HR<br /><br /><strong><u>Technische gegevens</u></strong><br />Motorinhoud: <strong>1.987 cc</strong><br />BTW/Marge: <strong>BTW</strong> <em>(bedrijven kunnen de BTW terugvorderen)</em>");
  const url = "https://www.marktplaats.nl/v/auto-s/toyota/m2448446869-toyota-c-hr-2-0-plug-in-hybrid-220-business-appconnect-c";
  const ad = AD.parseMarktplaats(html, url);
  assert.equal(ad.source, "marktplaats");
  assert.equal(ad.title, "Toyota C-HR 2.0 Plug-in Hybrid 220 Business");
  assert.deepEqual(ad.images, ["https://images.marktplaats.com/api/v1/hz-mp-pro-listing/images/fe75?rule=ecg_mp_eps$_86.jpg", "https://images.marktplaats.com/api/v1/hz-mp-pro-listing/images/98e0?rule=ecg_mp_eps$_86.jpg"]);
  assert.match(ad.description, /Motorinhoud: 1\.987 cc/);
  const { specs } = ad;
  // Imported: the Dutch registration day is not the first registration.
  assert.deepEqual([specs.firstRegistration, specs.mileage, specs.ccm, specs.powerHp, specs.powerKw, specs.gears], ["2025", 23105, 1987, 223, 164, 6]);
  assert.deepEqual([specs.fuel, specs.gearbox, specs.drive, specs.body, specs.color, specs.doors, specs.seats], ["hybryda plug-in", "automatyczna", "przedni", "SUV", "szary metalik", "5", 5]);
  assert.deepEqual([specs.owners, specs.hu, specs.serviceBook, specs.emission, specs.accidentFree], [2, "do 04/2029", true, "Euro 6", null]);
  assert.deepEqual(ad.vat, { deductible: true, rate: 21, net: 26025, gross: 31490, basis: "description" });
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, city: ad.seller.city, zip: ad.seller.zip, country: ad.seller.country, since: ad.seller.since, stock: ad.seller.stock },
    { type: "dealer", name: "IVA Bleiswijk B.V.", city: "Bleiswijk", zip: "2665LB", country: "NL", since: String(thisYear - 17), stock: null });
  assert.equal(ad.seller.page, "https://www.marktplaats.nl/u/iva-bleiswijk-b-v/11730551/");
  assert.equal(ad.listedAt, "2026-09-30T12:23:33Z");
  assert.deepEqual([ad.flags.imported, ad.flags.negotiable, ad.flags.isNew], [true, false, false]);
  // The search's answer (readMarktplaats) wins over the description.
  const searched = AD.parseMarktplaats(html, url, { vatDeductible: false, stock: 47 });
  assert.deepEqual([searched.vat.deductible, searched.vat.net, searched.vat.basis, searched.seller.stock], [false, 0, "portal", 47]);
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features).map((item) => item.label), ["Aktywny tempomat (ACC)", "Kamera cofania", "Nawigacja", "Podgrzewane fotele", "Podgrzewana kierownica"]);
});

test("Marktplaats, a private seller: registration month, upholstery, no name on the sheet, bids", () => {
  const ad = AD.parseMarktplaats(mpPage({
    title: "Volkswagen T-Roc 2.0 TSI 190pk 4Motion 7-DSG 2019 Wit",
    priceInfo: { priceCents: 2350000, priceType: "MIN_BID" },
    seller: { id: 55273463, name: "Wesley P", sellerType: "CONSUMER", activeSinceDiff: "6 maanden", activeYears: 0, location: { cityName: "Rijsbergen", countryAbbreviation: "NL" } },
    carDetails: { brand: "Volkswagen", model: "T-Roc", hasNapStatus: true },
    carAttributes: { groupedWithIcons: [
      mpGroup("Basics", [["constructionYear", 2019], ["mileage", "108.319"], ["color", "Wit"], ["upholstery", "Leder en Alcantara"], ["interiorColor", "Grijs"]]),
      mpGroup("Technical", [["transmission", "Automaat 7 versnellingen"], ["powerWheelDriver", "4WD permanent"], ["powerInHorsePower", 190]]),
      mpGroup("Eco", [["fuel", "Benzine"]]),
      mpGroup("History", [["firstRecordInNl", "20 februari 2019"]]),
      mpGroup("Options", [["options", ["Lederen bekleding", "Open dak", "Panoramadak", "Trekhaak"]]]),
    ] },
    automotiveTrustIndicators: { qualityMarks: [{ type: "NAP_CHECK_LOGICAL" }, { type: "ONE_PREVIOUS_OWNER" }, { type: "MAINTENANCE_BOOKLET_AVAILABLE" }], warranties: [] },
  }, "Volkswagen T-Roc<br /><br />BTW/Marge: BTW"), "https://www.marktplaats.nl/v/auto-s/volkswagen/m2441772093-volkswagen-t-roc");
  // Without "trim" the seller's own title.
  assert.equal(ad.title, "Volkswagen T-Roc 2.0 TSI 190pk 4Motion 7-DSG 2019 Wit");
  const { specs } = ad;
  assert.deepEqual([specs.firstRegistration, specs.drive, specs.color, specs.interior, specs.owners, specs.serviceBook, specs.hu], ["02/2019", "4x4", "biały", "półskórzana, szary", 1, true, ""]);
  assert.deepEqual(ad.features.slice(0, 2), ["Teilleder", "Allradantrieb"], "the upholstery and the drive before the boxes");
  assert.deepEqual({ type: ad.seller.type, name: ad.seller.name, contactName: ad.seller.contactName, zip: ad.seller.zip, stock: ad.seller.stock },
    { type: "private", name: "", contactName: "Wesley P", zip: "", stock: null });
  assert.match(ad.seller.since, /^\d{4}-\d{2}$/);
  assert.deepEqual(ad.vat, { deductible: false, rate: 0, net: 0, gross: 23500, basis: "" }, "a private person never invoices VAT");
  assert.deepEqual([ad.flags.negotiable, ad.flags.priceType, ad.flags.mileageLogical], [true, "MIN_BID", true]);
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features).map((item) => item.label), ["Dach panoramiczny", "Szyberdach", "Tapicerka półskórzana", "Napęd 4x4", "Hak holowniczy"]);
});

test("Marktplaats, a dealer's marks: BOVAG warranty, APK at delivery, a margin car", () => {
  const ad = AD.parseMarktplaats(mpPage({
    priceInfo: { priceCents: 1694500, priceType: "FIXED" },
    seller: { name: "Autocentrum Krimpenerwaard", sellerType: "TRADER", activeYears: 10, location: { cityName: "Krimpen aan den IJssel", postcode: "2921LP" } },
    carDetails: { brand: "Toyota", model: "Yaris" },
    carAttributes: { groupedWithIcons: [mpGroup("History", [["condition", "Nieuw"]])] },
    automotiveTrustIndicators: { qualityMarks: [{ type: "APK_UPON_DELIVERY" }], warranties: [{ type: "BOVAG", name: "Bovag garantie", validity: 12 }] },
  }, "BTW/Marge: <strong>Marge</strong>"), "https://www.marktplaats.nl/v/auto-s/toyota/m2445493017-toyota-yaris");
  assert.deepEqual([ad.warranty, ad.flags.warrantyType, ad.specs.hu, ad.flags.isNew, ad.seller.since], ["12 mies.", "BOVAG", "świeży przegląd", true, String(thisYear - 10)]);
  assert.deepEqual([ad.vat.deductible, ad.vat.basis], [false, "description"]);
});

test("2ememain (French): kW, values in Polish, Car-Pass, TVA déductible", () => {
  const ad = AD.parseMarktplaats(mpPage({
    title: "Volkswagen Golf 1.4 PHEV (automatique)",
    priceInfo: { priceCents: 2449500, priceType: "FIXED" },
    seller: { id: 44682958, name: "Van Mossel Used Cars Center Hasselt", sellerType: "TRADER", activeSinceDiff: "4 ans", activeYears: 4, allAdsUrl: "/u/van-mossel/44682958/", location: { cityName: "Hasselt", countryAbbreviation: "BE", postcode: "3500" } },
    gallery: { imageUrls: ["//images.2dehands.com/api/v1/hz-twh-pro-listing/images/1abb?rule=ecg_mp_eps$_#.jpg"] },
    carDetails: { brand: "Volkswagen", model: "Golf", condition: "NEW", carPassUrl: "https://public.car-pass.be/vhr/d0e3" },
    carAttributes: { groupedWithIcons: [
      mpGroup("Basics", [["trim", "1.4 PHEV"], ["constructionYear", 2023], ["mileage", "65.867"], ["vehicleType", "Hatchback"], ["color", "Noir"], ["upholstery", "Tissu"], ["interiorColor", "Noir"]]),
      mpGroup("Technical", [["transmission", "Automatique"], ["cylinderCapacity", "1.5"], ["powerInKiloWatt", 110], ["powerWheelDriver", "Roues avant"]]),
      mpGroup("Eco", [["fuel", "Hybride Électrique/Essence"]]),
      mpGroup("History", [["condition", "Occasion"], ["isImported", "Non"], ["serviceHistory", "Entretenue par le concessionnaire"]]),
      mpGroup("Options", [["options", ["Aide au maintien de voie", "Hayon arrière électrique", "Peinture métallisée", "Sièges chauffants", "Toit panoramique"]]]),
    ] },
  }, "Informations financières<br />TVA/marge: TVA déductible"), "https://www.2ememain.be/v/autos/volkswagen/m2452047892-volkswagen-golf-1-4-phev-automatique");
  assert.equal(ad.source, "dehands");
  assert.equal(ad.title, "Volkswagen Golf 1.4 PHEV");
  assert.deepEqual(ad.images, ["https://images.2dehands.com/api/v1/hz-twh-pro-listing/images/1abb?rule=ecg_mp_eps$_86.jpg"]);
  const { specs } = ad;
  assert.deepEqual([specs.fuel, specs.powerKw, specs.powerHp, specs.ccm, specs.gearbox, specs.drive, specs.body, specs.color, specs.interior], ["hybryda plug-in", 110, 150, 1500, "automatyczna", "przedni", "hatchback", "czarny metalik", "materiałowa, czarny"]);
  // "Neuf" only in carDetails (seen on a used car): the condition attribute counts.
  assert.deepEqual([specs.serviceBook, ad.flags.isNew, ad.flags.imported, ad.flags.carPassUrl], [true, false, false, "https://public.car-pass.be/vhr/d0e3"]);
  assert.deepEqual(ad.vat, { deductible: true, rate: 21, net: 20244, gross: 24495, basis: "description" });
  assert.deepEqual({ country: ad.seller.country, zip: ad.seller.zip, since: ad.seller.since, sinceText: ad.seller.sinceText, page: ad.seller.page },
    { country: "BE", zip: "3500", since: String(thisYear - 4), sinceText: "na 2dehands od {date}", page: "https://www.2ememain.be/u/van-mossel/44682958/" });
  assert.deepEqual(EQUIPMENT.keyOptions(ad.features).map((item) => item.label), ["Dach panoramiczny", "Podgrzewane fotele", "Elektryczna klapa bagażnika", "Asystent pasa ruchu"]);
});

test("Marktplaats / 2dehands / 2ememain values in Polish", () => {
  const specsOf = (attributes, options = []) => AD.parseMarktplaats(mpPage({ carDetails: { brand: "Toyota", model: "Corolla" }, carAttributes: { groupedWithIcons: [mpGroup("Basics", attributes), mpGroup("Options", [["options", options]])] } })).specs;
  const each = (key, values, field) => values.map((value) => specsOf([[key, value]])[field]);
  assert.deepEqual(each("vehicleType", ["Hatchback", "Stadsauto", "MPV", "Monovolume", "MPV ou Monospace", "Sedan", "Berline", "Stationwagon", "Break", "SUV of Terreinwagen", "SUV ou Tout-terrain", "Cabriolet", "Coupé", "Overige carrosserieën", "Autre carrosserie"], "body"),
    ["hatchback", "hatchback", "van", "van", "van", "sedan", "sedan", "kombi", "kombi", "SUV", "SUV", "kabriolet", "coupé", "", ""]);
  assert.deepEqual(each("fuel", ["Benzine", "Diesel", "Elektrisch", "Hybride Elektrisch/Benzine", "Hybride Elektrisch/Diesel", "LPG", "CNG (Aardgas)", "Essence", "Électrique", "GNC (gaz naturel)", "Overige brandstoffen"], "fuel"),
    ["benzyna", "diesel", "elektryczny", "hybryda (benzyna)", "hybryda (diesel)", "benzyna + LPG", "benzyna + CNG", "benzyna", "elektryczny", "benzyna + CNG", ""]);
  assert.equal(specsOf([["fuel", "Hybride Elektrisch/Benzine"], ["hybridType", "Plug-in hybride"]]).fuel, "hybryda plug-in");
  assert.equal(specsOf([["fuel", "Hybride Électrique/Essence"], ["hybridType", "Hybride rechargeable"]]).fuel, "hybryda plug-in");
  assert.equal(specsOf([["fuel", "Hybride Elektrisch/Benzine"], ["hybridType", "Volledig hybride"], ["batteryCapacity", "1"]]).fuel, "hybryda (benzyna)");
  assert.deepEqual(each("transmission", ["Automaat", "Handgeschakeld", "Handgeschakeld 5 versnellingen", "Semi-automaat", "Automatique", "Boîte manuelle"], "gearbox"),
    ["automatyczna", "manualna", "manualna", "półautomatyczna", "automatyczna", "manualna"]);
  assert.deepEqual(each("powerWheelDriver", ["Voorwiel", "Achterwiel", "Vierwielaandrijving", "4WD permanent", "Roues avant", "Propulsion arrière", "Quatre roues motrices / 4X4"], "drive"),
    ["przedni", "tylny", "4x4", "4x4", "przedni", "tylny", "4x4"]);
  assert.deepEqual(each("color", ["Zwart", "Wit", "Zilver of Grijs", "Blauw", "Rood", "Groen", "Bruin", "Geel", "Beige", "Overige kleuren", "Argent ou Gris", "Bleu", "Autres couleurs"], "color"),
    ["czarny", "biały", "szary", "niebieski", "czerwony", "zielony", "brązowy", "żółty", "beżowy", "", "szary", "niebieski", ""]);
  // 2dehands (Dutch) says "Metaalkleur" for "Metallic lak".
  assert.equal(specsOf([["color", "Wit"]], ["Metaalkleur"]).color, "biały metalik");
  assert.deepEqual(each("upholstery", ["Leder", "Leder en Stof", "Kunstmatig leder", "Stof", "Alcantara", "Velours", "Cuir", "Cuir et Tissu", "Tissu", "Overige bekleding"], "interior"),
    ["skórzana", "półskórzana", "ekoskóra", "materiałowa", "Alcantara", "welurowa", "skórzana", "półskórzana", "materiałowa", ""]);
  assert.throws(() => AD.parseMarktplaats("<html>Pardon, er ging iets mis</html>"), /no ad data/);
});

test("Marktplaats options: the strong ones in Dutch (NL and BE) and French", () => {
  const labels = (names) => EQUIPMENT.keyOptions(names, 30).map((item) => item.id);
  assert.deepEqual(labels(["Open dak", "Laserlicht", "Koplamp volledig LED", "Adaptive Cruise Control", "Head-up Display", "360° camera", "Navigatiesysteem", "Standkachel", "Stoelventilatie", "Stoelmassage", "Stoelverwarming", "Stuurwielverwarming", "Elektrische stoelverstelling", "Sound system", "4x4", "Trekhaak", "Keyless entry", "Elektrische achterklep", "Geheel digitaal combi-instrument", "Apple Carplay", "Dodehoekdetectie", "Lane Keeping Assist", "Parkeerassistent", "Automatische klimaatregeling"]),
    ["sunroof", "matrix", "acc", "hud", "camera360", "nav", "auxHeating", "ventSeats", "massage", "heatedSeats", "heatedWheel", "memory", "sound", "awd", "tow", "keyless", "tailgate", "digital", "carplay", "blindSpot", "lane", "parkAssist", "climate"]);
  assert.deepEqual(labels(["Zetelverwarming", "Elektrische koffer"]), ["heatedSeats", "tailgate"]);
  assert.deepEqual(labels(["Toit panoramique", "Phares laser", "Phares entièrement LED", "Régulateur de distance", "Affichage tête haute", "Caméra 360°", "Système de navigation", "Chauffage de stationnement", "Sièges ventilés", "Sièges massants", "Sièges chauffants", "Volant chauffant", "Sièges électriques", "Système audio", "Attache-remorque", "Verrouillage centralisé sans clé", "Hayon arrière électrique", "Combiné de bord entièrement numérique", "Avertisseur d'angle mort", "Avertissement de sortie de voie", "Pilote automatique de stationnement", "Climatisation automatique"]),
    ["panorama", "matrix", "acc", "hud", "camera360", "nav", "auxHeating", "ventSeats", "massage", "heatedSeats", "heatedWheel", "memory", "sound", "tow", "keyless", "tailgate", "digital", "blindSpot", "lane", "parkAssist", "climate"]);
  // Plain cruise control, LED day lights and "LED verlichting" are not strong options.
  assert.deepEqual(labels(["Cruise Control", "LED dagrijverlichting", "LED verlichting", "Éclairage LED", "Feux de jour LED"]), []);
});
