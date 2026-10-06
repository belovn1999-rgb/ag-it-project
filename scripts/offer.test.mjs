// The client offer's rules (B71, docs/OFFER-PAGE.md): market around an ad,
// strong options, verdict and red flags. The modules are plain browser
// scripts; they publish themselves on globalThis.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

for (const file of ["offer-market.js", "offer-equipment.js", "offer-verdict.js", "offer-ad.js"]) {
  vm.runInThisContext(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), { filename: file });
}
const MARKET = globalThis.AUTOGOOD_OFFER_MARKET;
const EQUIPMENT = globalThis.AUTOGOOD_OFFER_EQUIPMENT;
const VERDICT = globalThis.AUTOGOOD_OFFER_VERDICT;
const AD = globalThis.AUTOGOOD_OFFER_AD;

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
