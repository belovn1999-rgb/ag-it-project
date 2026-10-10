/* AUTOGOOD "Oferta dla klienta" (B71): one ad read for the offer, in one
 * shape whatever the portal (docs/OFFER-PAGE.md §3).
 *
 * - mobile.de: the importer (server/mobilede-import.mjs, the user's Mac)
 *   /mobilede/import → its "ad" (photos, attributes, equipment, seller with
 *   rating, dates, flags, description); /mobilede/dealer → cars on sale.
 *   An importer older than 2026-10-05 has no "ad": the basic fields then.
 * - AutoScout24 (.de and .fr, sources "autoscout" / "autoscoutfr"): the ad
 *   page through the market proxy (market-proxy-queue.js: our Worker or
 *   r.jina.ai) → __NEXT_DATA__ listingDetails; the dealer's stock page →
 *   number of cars.
 * - ParuVendu (FR): the ad page through the proxy → schema.org Vehicle
 *   (ld+json: photos, make, model, fuel, gearbox, km, seller with address),
 *   the details list ("Année", "Puissance réelle", "Puissance fiscale",
 *   "Nombre de places", "Garantie mécanique"…), the description, the list the
 *   seller ticked ("Caractéristiques techniques modèle …", private sellers),
 *   the seller ("Professionnel" + cars in stock / "Vendeur particulier" +
 *   "membre depuis").
 * - Kleinanzeigen (DE): the ad page through the proxy → the details list
 *   (Kilometerstand, Erstzulassung, Leistung, Kraftstoffart, Getriebe,
 *   Fahrzeugtyp, Außenfarbe, HU bis, Anzahl Türen…), the ticked equipment
 *   (German, as mobile.de), the description, the photos of this ad
 *   (ld+json ImageObject), the seller (Gewerblicher / Privater Nutzer,
 *   "Aktiv seit", ads online, place).
 * Values are put in Polish here (fuel, gearbox, body, colour…; German,
 * English and French words); equipment stays as the portal names it
 * (offer-equipment.js translates it). Pure parsers (parseParuvendu,
 * parseKleinanzeigen) are tested by scripts/offer.test.mjs.
 *
 * window.AUTOGOOD_OFFER_AD.read(source, url, { importer }) → ad
 */
(() => {
  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const number = (value) => {
    const match = String(value ?? "").replace(/[.\s  ](?=\d{3}\b)/g, "").match(/\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(",", ".")) : 0;
  };

  // A piece of HTML → its text (tags out, entities decoded, spaces joined;
  // line breaks kept when asked).
  const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euro: "€" };
  function plain(html, keepLines = false) {
    const text = String(html ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (all, code) => (code[0] === "#"
        ? String.fromCodePoint(/^#x/i.test(code) ? parseInt(code.slice(2), 16) : Number(code.slice(1)))
        : ENTITIES[code.toLowerCase()] ?? all));
    return keepLines
      ? text.replace(/[ \t  ]+/g, " ").replace(/ *\n */g, "\n").trim()
      : text.replace(/[\s  ]+/g, " ").trim();
  }

  // HTML of a seller's description → plain text with line breaks. Parsed,
  // never put into the page as HTML.
  function htmlToText(html) {
    if (!html) return "";
    // Without a DOM (the tests in Node): the same by rules.
    if (typeof DOMParser === "undefined") {
      return plain(String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "\n• ").replace(/<\/(p|div|li|ul|ol|h\d)>/gi, "\n"), true)
        .replace(/\n{3,}/g, "\n\n").trim().slice(0, 12000);
    }
    const doc = new DOMParser().parseFromString(`<div>${String(html)}</div>`, "text/html");
    doc.querySelectorAll("script, style").forEach((node) => node.remove());
    doc.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
    doc.querySelectorAll("li").forEach((node) => {
      node.prepend("• ");
      node.append("\n");
    });
    doc.querySelectorAll("p, div, ul, ol, hr, h1, h2, h3, h4, b + br").forEach((node) => node.append("\n"));
    return (doc.body.textContent || "")
      .replace(/[ \t ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 12000);
  }

  // ---- German, English and French values in Polish ---------------------------
  const COLORS = [
    [/schwarz|black|noir/i, "czarny"], [/wei(ß|ss)|white|blanc/i, "biały"], [/grau|grey|gray|anthrazit|gris|anthracite/i, "szary"],
    [/silber|silver|argent/i, "srebrny"], [/blau|blue|bleu/i, "niebieski"], [/bordeaux/i, "bordowy"], [/rot|red|rouge/i, "czerwony"],
    [/grün|green|vert/i, "zielony"], [/braun|brown|marron|brun/i, "brązowy"], [/beige/i, "beżowy"], [/gelb|yellow|jaune/i, "żółty"],
    [/orange/i, "pomarańczowy"], [/gold|dor[ée]/i, "złoty"], [/violett?|lila|purple/i, "fioletowy"], [/bronze/i, "brązowy"],
  ];
  function colorPl(value, paint = "") {
    const text = String(value || "");
    if (!text) return "";
    const found = COLORS.find(([pattern]) => pattern.test(text));
    const metallic = /m[eé]tal/i.test(`${text} ${paint}`) ? " metalik" : /perl|pearl|nacr[eé]/i.test(`${text} ${paint}`) ? " perłowy" : "";
    return found ? `${found[1]}${metallic}` : text;
  }
  function fuelPl(value) {
    const text = String(value || "").toLowerCase();
    if (!text) return "";
    if (/plug|rechargeable/.test(text)) return "hybryda plug-in";
    if (/hybrid|elektro\/(benzin|diesel)|(benzin|diesel)\/elektro/.test(text)) return /diesel/.test(text) ? "hybryda (diesel)" : "hybryda (benzyna)";
    if (/elektr|lectri/.test(text)) return "elektryczny";
    if (/diesel/.test(text)) return "diesel";
    if (/lpg|autogas|gpl/.test(text)) return "benzyna + LPG";
    if (/cng|erdgas/.test(text)) return "benzyna + CNG";
    if (/thanol|e85/.test(text)) return "benzyna (E85)";
    if (/benzin|super|petrol|essence/.test(text)) return "benzyna";
    return String(value);
  }
  function gearboxPl(value) {
    const text = String(value || "").toLowerCase();
    if (!text) return "";
    if (/halbautomat|semi/.test(text)) return "półautomatyczna";
    if (/automat|automatic|dsg|cvt/.test(text)) return "automatyczna";
    if (/schalt|manu/.test(text)) return "manualna";
    return String(value);
  }
  function drivePl(value) {
    const text = String(value || "").toLowerCase();
    if (!text) return "";
    if (/allrad|awd|4x4|four|all.?wheel|quattro|xdrive|4motion|4matic|int[ée]grale|4 ?roues/.test(text)) return "4x4";
    if (/front|fwd|avant/.test(text)) return "przedni";
    if (/heck|rear|rwd|propulsion|arri[eè]re/.test(text)) return "tylny";
    return String(value);
  }
  const BODIES = [
    [/suv|gel(ä|a)nde|offroad|off-road|pickup|4x4|tout.?terrain/i, "SUV"], [/kombi|estate|variant|touring|break|station.?wagon/i, "kombi"],
    [/limousine|sedan|berline/i, "sedan"], [/kleinwagen|small|hatch|citadine/i, "hatchback"], [/cabrio|roadster|convertible/i, "kabriolet"],
    [/coup(é|e)|sportwagen|sports/i, "coupé"], [/van|minibus|bus|monospace|ludospace/i, "van"],
  ];
  const bodyPl = (value) => BODIES.find(([pattern]) => pattern.test(String(value || "")))?.[1] || (value && !/andere|other|^autres?$/i.test(value) ? String(value) : "");
  function interiorPl(value, color = "") {
    const text = `${value || ""}`.toLowerCase();
    if (!text) return "";
    const material = /alcantara/.test(text) ? "Alcantara" : /teilleder|part.?leather/.test(text) ? "półskórzana" : /kunstleder|leatherette/.test(text) ? "ekoskóra"
      : /leder|leather/.test(text) ? "skórzana" : /velours/.test(text) ? "welurowa" : /stoff|cloth|fabric/.test(text) ? "materiałowa" : String(value).split(",")[0];
    const shade = colorPl(color || String(value).split(",")[1] || "");
    return [material, shade].filter(Boolean).join(", ");
  }
  function huPl(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^neu|new$/i.test(text)) return "świeży przegląd";
    const date = text.match(/(\d{2})\/(\d{4})/);
    return date ? `do ${date[1]}/${date[2]}` : text;
  }
  function conditionPl(value) {
    const text = String(value || "");
    return {
      accidentFree: /unfallfrei/i.test(text) ? true : /unfall|beschädigt|damaged/i.test(text) ? false : null,
      damaged: /beschädigt|damaged|nicht fahrtauglich/i.test(text),
    };
  }
  function power(value) {
    const kw = number(String(value || "").match(/(\d+)\s*kW/i)?.[1]);
    const hp = number(String(value || "").match(/(\d+)\s*(?:PS|hp|KM)/i)?.[1]);
    return { kw: kw || (hp ? Math.round(hp / 1.35962) : 0), hp: hp || (kw ? Math.round(kw * 1.35962) : 0) };
  }
  // "DE-21337 Lüneburg" → country, zip, city.
  function place(text) {
    const match = String(text || "").match(/^([A-Z]{2})-(\S+)\s+(.+)$/);
    return match ? { country: match[1], zip: match[2], city: match[3] } : { country: "", zip: "", city: String(text || "") };
  }
  const MOBILE_RATING = {
    VERY_GOOD_PRICE: "bardzo dobra cena", GOOD_PRICE: "dobra cena", REASONABLE_PRICE: "uczciwa cena",
    INCREASED_PRICE: "podwyższona cena", HIGH_PRICE: "wysoka cena",
  };

  // Options the attributes name (camera, self-parking, zones, leather).
  function attributeOptions(attributes, extra = {}) {
    const options = [];
    const parks = String(attributes.parkAssists || "");
    if (/kamera|camera/i.test(parks)) options.push(/360/.test(parks) ? "360°-Kamera" : "Rückfahrkamera");
    if (/selbstlenk/i.test(parks)) options.push("Einparkhilfe selbstlenkend");
    if (/zonen/i.test(String(attributes.climatisation || ""))) options.push(attributes.climatisation);
    if (/(voll)?leder|leather/i.test(`${attributes.interior || ""} ${extra.interior || ""}`) && !/kunstleder/i.test(`${attributes.interior || ""} ${extra.interior || ""}`)) {
      options.push(/teilleder/i.test(`${attributes.interior || ""} ${extra.interior || ""}`) ? "Teilleder" : "Lederausstattung");
    }
    if (extra.drive === "4x4") options.push("Allradantrieb");
    return options;
  }

  // ---- mobile.de --------------------------------------------------------------
  async function readMobile(url, importer) {
    if (!importer) throw new Error("no importer address");
    const response = await fetch(`${importer}?url=${encodeURIComponent(url)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.error || `importer ${response.status}`);
    const ad = data.ad || null;
    const attributes = ad?.attributes || {};
    const contact = ad?.contact || {};
    const where = place(contact.address2);
    const drive = drivePl(data.drive);
    const sellerType = /DEALER/i.test(contact.type || data.sellerType) ? "dealer" : (contact.type || data.sellerType) ? "private" : "";
    const powers = power(attributes.power || (data.powerHp ? `${data.powerHp} PS` : ""));
    const since = String(contact.since || "").match(/(\d{2})\.(\d{2})\.(\d{4})/);
    const ai = ad?.aiSummary;
    const result = {
      source: "mobile",
      complete: Boolean(ad),
      readAt: new Date().toISOString(),
      url,
      title: ad?.title || data.title || "",
      images: ad?.images || [],
      description: htmlToText(ad?.description || ""),
      specs: {
        firstRegistration: attributes.firstRegistration || data.firstRegistration || "",
        mileage: number(attributes.mileage) || Number(data.mileageKm) || 0,
        ccm: number(attributes.cubicCapacity) || Number(data.displacementCcm) || 0,
        powerKw: powers.kw,
        powerHp: powers.hp,
        fuel: fuelPl(attributes.fuel || data.fuel),
        gearbox: gearboxPl(attributes.transmission || data.gearbox),
        drive,
        body: bodyPl(attributes.category || data.bodyType),
        color: colorPl(attributes.color, attributes.color),
        colorMaker: attributes.manufacturerColorName || "",
        interior: interiorPl(attributes.interior),
        doors: attributes.doorCount || "",
        seats: number(attributes.numSeats) || 0,
        owners: attributes.numberOfPreviousOwners !== undefined && attributes.numberOfPreviousOwners !== "" ? number(attributes.numberOfPreviousOwners) : null,
        hu: huPl(attributes.hu),
        emission: attributes.emissionClass || "",
        countryVersion: /deutsche/i.test(attributes.countryVersion || "") ? "wersja niemiecka" : attributes.countryVersion || "",
        trim: attributes.trimLine || "",
        availability: /sofort/i.test(attributes.availability || "") ? "od ręki" : attributes.availability || "",
        ...conditionPl(attributes.damageCondition || data.condition),
      },
      features: [...(ad?.features || (Array.isArray(data.equipment) ? data.equipment : [])), ...attributeOptions(attributes, { drive })],
      seller: {
        type: sellerType,
        name: contact.name || data.location?.sellerName || "",
        city: where.city || data.location?.city || "",
        zip: where.zip || data.location?.postalCode || "",
        country: where.country || contact.country || data.location?.country || "",
        address: [contact.address1, contact.address2].filter(Boolean).join(", ") || data.location?.address || "",
        since: since ? `${since[3]}-${since[2]}-${since[1]}` : "",
        sinceText: since ? "na mobile.de od {date}" : "",
        rating: contact.rating ? { score: contact.rating.score, reviews: contact.rating.reviews, recommend: contact.rating.recommend, adReality: contact.rating.adReality, portal: "mobile.de" } : null,
        customerId: contact.customerId || "",
        languages: contact.languages || "",
        stock: null,
      },
      listedAt: ad?.created ? new Date(ad.created * 1000).toISOString() : "",
      portalPrice: ad?.priceRating && MOBILE_RATING[ad.priceRating.rating]
        ? { portal: "mobile.de", label: MOBILE_RATING[ad.priceRating.rating], rating: ad.priceRating.rating, thresholds: ad.priceRating.thresholds || [] }
        : null,
      vat: ad?.price ? { rate: ad.price.vat || 0, net: Math.round(ad.price.net || 0), gross: ad.price.gross || Number(data.carBruttoEur) || 0, deductible: Boolean(ad.price.vat) } : (data.carBruttoEur ? { rate: 0, net: Number(data.carNettoEur) || 0, gross: Number(data.carBruttoEur), deductible: Boolean(data.carNettoEur) } : null),
      // The seller's own transport / inspection tariff (the importer counts it
      // as page 1 does) — the offer made from a link starts its estimate here.
      tariff: data.transportNettoPln ? { transport: Number(data.transportNettoPln) || 0, inspection: Number(data.inspectionNettoPln) || 0, rule: data.deliveryInspectionEstimate?.rule || "" } : null,
      flags: {
        damaged: Boolean(ad?.flags?.isDamageCase),
        readyToDrive: ad?.flags?.readyToDrive ?? null,
        onCustomerBehalf: Boolean(ad?.flags?.onCustomerBehalf),
        partner: ad?.flags?.partnerName || "",
        isNew: Boolean(ad?.flags?.isNew),
        carfax: Boolean(ad?.flags?.carfaxEligible),
        aiTags: ai?.tags || [],
        aiSummary: ai?.summary || "",
        aiInsights: ai?.insights || [],
      },
      warranty: null,
      seals: [],
    };
    // How many cars the dealer sells: its own mobile.de page (a few seconds).
    if (result.seller.customerId && sellerType === "dealer") {
      try {
        const base = importer.replace(/\/mobilede\/import\/?$/, "");
        const dealer = await fetch(`${base}/mobilede/dealer?customerId=${encodeURIComponent(result.seller.customerId)}`).then((reply) => (reply.ok ? reply.json() : null));
        if (dealer?.vehicles) result.seller.stock = dealer.vehicles;
        if (dealer?.url) result.seller.page = dealer.url;
      } catch {
        // The offer simply goes without the number.
      }
    }
    return result;
  }

  // ---- AutoScout24 ------------------------------------------------------------
  function nextData(html) {
    const raw = String(html || "").match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    return raw ? JSON.parse(raw[1]) : null;
  }

  async function readAutoscout(url, source = "autoscout") {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(`AutoScout24 ${response.status}`);
    const details = nextData(await response.text())?.props?.pageProps?.listingDetails;
    if (!details) throw new Error("AutoScout24: no ad data");
    const vehicle = details.vehicle || {};
    const seller = details.seller || {};
    const prices = details.prices?.public || {};
    const location = details.location || {};
    const drive = drivePl(vehicle.driveTrain);
    const interior = interiorPl(vehicle.upholstery, vehicle.upholsteryColor);
    const equipment = Object.values(vehicle.equipment || {}).flat().map((item) => String(item?.id || "")).filter(Boolean);
    const rating = details.ratings;
    const result = {
      source,
      complete: true,
      readAt: new Date().toISOString(),
      url,
      title: [vehicle.make, vehicle.model, vehicle.modelVersionInput].filter(Boolean).join(" "),
      images: (details.images || []).filter((image) => /^https:\/\/prod\.pictures\.autoscout24\.net\//.test(String(image))).slice(0, 40),
      description: htmlToText(details.description || ""),
      specs: {
        firstRegistration: vehicle.firstRegistrationDate || "",
        mileage: Number(vehicle.mileageInKmRaw) || 0,
        ccm: Number(vehicle.rawDisplacementInCCM) || 0,
        powerKw: Number(vehicle.rawPowerInKw) || 0,
        powerHp: Number(vehicle.rawPowerInHp) || 0,
        fuel: fuelPl(vehicle.fuelCategory?.formatted),
        gearbox: gearboxPl(vehicle.transmissionType),
        gears: Number(vehicle.gears) || 0,
        drive,
        body: bodyPl(vehicle.bodyType),
        color: colorPl(vehicle.bodyColor, vehicle.paintType),
        colorMaker: vehicle.bodyColorOriginal || "",
        interior,
        doors: vehicle.numberOfDoors ? String(vehicle.numberOfDoors) : "",
        seats: Number(vehicle.numberOfSeats) || 0,
        owners: Number.isFinite(vehicle.noOfPreviousOwners) ? vehicle.noOfPreviousOwners : null,
        hu: vehicle.nextVehicleSafetyInspection ? huPl(vehicle.nextVehicleSafetyInspection) : vehicle.newInspection ? "świeży przegląd" : "",
        emission: vehicle.environmentEuDirective?.formatted || "",
        countryVersion: /deutsche/i.test(vehicle.originalMarket || "") ? "wersja niemiecka" : vehicle.originalMarket || "",
        accidentFree: vehicle.hadAccident === false ? true : vehicle.hadAccident === true ? false : null,
        damaged: (vehicle.damageConditions || []).length > 0,
        serviceBook: vehicle.hasFullServiceHistory === true ? true : null,
        nonSmoking: vehicle.nonSmoking === true,
        rental: vehicle.isRental === true,
      },
      features: [...equipment, ...attributeOptions({}, { drive, interior: vehicle.upholstery })],
      seller: {
        type: seller.isDealer ? "dealer" : seller.type ? "private" : "",
        name: seller.companyName || seller.contactName || "",
        contactName: seller.contactName || "",
        city: location.city || "",
        zip: location.zip || "",
        country: location.countryCode || "",
        address: [location.street, [location.zip, location.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        since: seller.dealer?.customerSince ? String(seller.dealer.customerSince) : "",
        sinceText: seller.dealer?.customerSince ? "na AutoScout24 od {date}" : "",
        rating: rating?.ratingsCount ? { score: number(rating.ratingsAverage), reviews: Number(rating.ratingsCount) || 0, recommend: Number.isFinite(rating.recommendPercentage) ? rating.recommendPercentage : null, adReality: null, portal: "AutoScout24" } : null,
        stockUrl: seller.links?.stockLink || "",
        stock: null,
      },
      listedAt: details.createdTimestampWithOffset || "",
      portalPrice: Number(prices.median) > 0 ? { portal: "AutoScout24", median: Number(prices.median), category: prices.category ?? null } : null,
      vat: { deductible: Boolean(prices.taxDeductible), rate: Number(prices.vatRate) || 0, net: Number(prices.netPriceRaw) || 0, gross: Number(prices.priceRaw) || 0 },
      flags: {
        damaged: (vehicle.damageConditions || []).length > 0,
        rental: vehicle.isRental === true,
        carfaxUrl: details.vehicleReport?.carfax?.reportUrlEn || "",
        special: (details.specialConditions || []).map(String),
        aiTags: [],
      },
      warranty: details.warrantyExists ? (details.warranty ? String(details.warranty).replace(/Monate?|mois/i, "mies.") : "tak") : null,
      seals: (details.seals || []).map((seal) => ({ name: String(seal?.name || ""), benefits: (seal?.benefits || []).map(String) })).filter((seal) => seal.name),
    };
    if (result.seller.stockUrl) {
      try {
        const stock = await fetch(`${proxy()}${result.seller.stockUrl}`, { headers: { "x-respond-with": "html" } });
        const count = stock.ok ? Number(nextData(await stock.text())?.props?.pageProps?.numberOfResults) : 0;
        if (count > 0) result.seller.stock = count;
      } catch {
        // Without the number.
      }
    }
    return result;
  }

  // ---- Shared by the classifieds pages (ParuVendu, Kleinanzeigen) ------------
  async function proxiedPage(url, portal) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(`${portal} ${response.status}`);
    return response.text();
  }
  // Every schema.org block of a page (a broken one is skipped).
  function ldBlocks(html) {
    const blocks = [];
    for (const match of String(html || "").matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const data = JSON.parse(match[1]);
        blocks.push(...(Array.isArray(data) ? data : [data]));
      } catch {
        // Another block.
      }
    }
    return blocks;
  }
  // "Mars 2024" / "September 2019" / "2019" → "03/2024" / "09/2019" / "2019".
  const MONTHS = {
    janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
    januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
  };
  function monthYear(value) {
    const match = String(value ?? "").toLowerCase().match(/(?:([a-zäéû]+)\s+)?((?:19|20)\d{2})/);
    if (!match) return "";
    const month = MONTHS[match[1]] || 0;
    return month ? `${String(month).padStart(2, "0")}/${match[2]}` : match[2];
  }
  // "dd.mm.yyyy" / "dd/mm/yyyy" → "yyyy-mm-dd".
  function isoDay(value) {
    const match = String(value || "").match(/(\d{2})[./](\d{2})[./](\d{4})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  }
  const unique = (list) => [...new Set(list.filter(Boolean))];
  // A make as written in capitals ("VOLKSWAGEN") the way the catalog writes it.
  function makeName(value) {
    const text = String(value || "").trim();
    if (/^mercedes/i.test(text)) return "Mercedes-Benz";
    if (/^land.?rover/i.test(text)) return "Land Rover";
    if (text.length <= 3 && !/^kia$/i.test(text)) return text.toUpperCase();
    return text === text.toUpperCase() ? text.toLowerCase().replace(/(^|[\s-])\S/g, (letter) => letter.toUpperCase()) : text;
  }

  // ---- ParuVendu (FR) ---------------------------------------------------------
  // The page as checked 2026-10-06 (a dealer and private sellers): see the
  // header. Photos: the ld+json "image" on file-render.webapp4you.eu (CORS *,
  // dealers' feeds); private sellers' photos (media.paruvendu.fr, no CORS:
  // the PDF could not draw them) are taken from the page's own gallery on
  // img.paruvendu.fr (CORS *), thumbnails left out.
  function parseParuvendu(html, url = "") {
    const page = String(html || "");
    const vehicle = ldBlocks(page).find((item) => item?.["@type"] === "Vehicle") || null;
    const details = Object.fromEntries([...page.matchAll(/<span class="uppercase">([^<]+)<\/span>\s*<br\s*\/?>\s*<span[^>]*>([\s\S]*?)<\/span>/g)]
      .map((match) => [plain(match[1]).toLowerCase(), plain(match[2].split(/<div/i)[0])]));
    if (!vehicle && !details.prix) throw new Error("ParuVendu: no ad data");
    const property = (id) => String((vehicle?.additionalProperty || []).find((item) => item?.propertyID === id)?.value || "");
    const make = makeName(vehicle?.brand?.name || details.marque);
    const model = String(vehicle?.model || details["modèle"] || "").trim();
    const version = String(details.version || vehicle?.vehicleConfiguration || "").trim();
    // "Version" repeats the model ("Passat 2.0 TDI …"): once in the title.
    const trim = version.toLowerCase().startsWith(model.toLowerCase()) ? version.slice(model.length) : version;
    const descriptionHtml = (page.match(/id="txtAnnonceTrunc"[^>]*>([\s\S]*?)(?:<div id="mes-ht"|<div class="fin"|<div class="vvdetails14_refdate")/) || [])[1] || "";
    const description = htmlToText(descriptionHtml);
    const direct = (vehicle?.image || []).map(String).filter((image) => /^https:\/\/file-render\.webapp4you\.eu\//.test(image));
    const gallery = [...page.matchAll(/<img[^>]*src="(https:\/\/img\.paruvendu\.fr\/media_ext\/[^"]+)"[^>]*gestionErreurPhoto/g)]
      .map((match) => plain(match[1])).filter((image) => !/[?&]w=(?:[1-5]\d\d)\b/.test(image));
    // What the seller ticked (private sellers; dealers' pages have no list).
    const ticked = page.split(/Caract[ée]ristiques techniques mod[èe]le/i)[1];
    const features = ticked ? [...ticked.split(/<\/ul>/i)[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => plain(match[1]).replace(/^[-•]\s*/, "")) : [];
    const hp = number(details["puissance réelle"]) || Number(vehicle?.vehicleEngine?.enginePower?.value) || 0;
    const ccm = number((plain(descriptionHtml).match(/Cylindr[ée]e\s*:?\s*(\d{3,4})\b/i) || [])[1]);
    const bodyLabel = details.carrosserie || property("bodyType");
    // "Berline" holds hatchbacks, saloons and even estates (its schema type
    // "Hatchback" was seen on a Passat estate, 2026-10-06): left unsaid.
    const body = /berline/i.test(bodyLabel) ? "" : bodyPl(bodyLabel || vehicle?.bodyType);
    const driveLabel = property("driveWheelConfiguration") || (/schema\.org/i.test(vehicle?.driveWheelConfiguration || "") ? vehicle.driveWheelConfiguration : "");
    const drive = ["4x4", "przedni", "tylny"].includes(drivePl(driveLabel)) ? drivePl(driveLabel) : "";
    // "4 portes avec hayon" = five doors.
    const doorsText = details["nb de portes"] || String(vehicle?.numberOfDoors || "");
    const doors = number(doorsText) ? String(number(doorsText) + (/hayon/i.test(doorsText) ? 1 : 0)) : "";
    const sellerData = vehicle?.offers?.seller || {};
    const dealer = /dealer|organization|store/i.test(sellerData["@type"] || "") || /<p>\s*Professionnel\s*<\/p>/i.test(page);
    const privateSeller = !dealer && (/person/i.test(sellerData["@type"] || "") || /Vendeur particulier/i.test(page));
    // "Meyzieu (69330)" (private) or "73290 La Motte-Servolex" (dealer).
    const placeText = plain((page.match(/id="detail_loc"[^>]*>([\s\S]*?)<\/(?:h2|span)>/) || [])[1]);
    const placeMatch = placeText.match(/^(.*?)\s*\((\d{5})\)$/) || placeText.match(/^(\d{5})\s+(.+)$/);
    const address = sellerData.address || {};
    const zip = String(address.postalCode || (placeMatch ? (/^\d/.test(placeMatch[1]) ? placeMatch[1] : placeMatch[2]) : ""));
    const city = String(address.addressLocality || (placeMatch ? (/^\d/.test(placeMatch[1]) ? placeMatch[2] : placeMatch[1]) : placeText));
    // A few private ads abroad name only the country ("Luxembourg").
    const country = String(address.addressCountry || { luxembourg: "LU", belgique: "BE", suisse: "CH", allemagne: "DE", espagne: "ES", italie: "IT" }[city.toLowerCase()] || "FR");
    // "membre depuis 16 jours / 2 mois / 3 ans" → the month the seller joined.
    const member = plain((page.match(/membre depuis\s*([^<]+)/i) || [])[1]);
    const memberMatch = member.match(/(\d+)\s*(jours?|mois|ans?)/i);
    let since = "";
    if (memberMatch) {
      const date = new Date();
      const count = Number(memberMatch[1]);
      if (/jour/i.test(memberMatch[2])) date.setDate(date.getDate() - count);
      else date.setMonth(date.getMonth() - count * (/mois/i.test(memberMatch[2]) ? 1 : 12));
      since = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    const stock = number((page.match(/<strong>\s*([\d\s ]+)\s*v[ée]hicules?\s*<\/strong>\s*en stock/i) || [])[1]);
    const stockUrl = (page.match(/href="(https:\/\/www\.paruvendu\.fr\/auto-moto\/pro\/[^"]+)"[^>]*>\s*Voir ses annonces/i) || [])[1] || "";
    const posted = page.match(/R[ée]f\. annonce[\s\S]{0,200}?Le (\d{2})\/(\d{2})\/(\d{4}) à (\d{2}):(\d{2})/);
    const price = Number(vehicle?.offers?.price) || number(details.prix);
    const vat = /TVA\s+r[ée]cup[ée]rable/i.test(page);
    const warrantyKey = Object.keys(details).find((key) => /^garantie/.test(key));
    return {
      source: "paruvendu",
      complete: true,
      readAt: new Date().toISOString(),
      url,
      title: `${make} ${model} ${trim}`.replace(/\s+/g, " ").trim().slice(0, 160) || plain(vehicle?.name),
      images: unique(direct.length ? direct : gallery).slice(0, 40),
      description,
      specs: {
        firstRegistration: monthYear(details["année"] || vehicle?.dateVehicleFirstRegistered),
        mileage: Number(vehicle?.mileageFromOdometer?.value) || number(details["kilométrage"]),
        ccm: ccm >= 600 && ccm <= 7000 ? ccm : 0,
        powerKw: hp ? Math.round(hp / 1.35962) : 0,
        powerHp: hp,
        fiscalCv: number(details["puissance fiscale"]),
        fuel: fuelPl(details.energie || vehicle?.fuelType),
        gearbox: gearboxPl(details.transmission || property("vehicleTransmission") || vehicle?.vehicleTransmission),
        drive,
        body,
        color: colorPl(details.couleur || vehicle?.color),
        colorMaker: "",
        interior: "",
        doors,
        seats: number(details["nombre de places"]) || Number(vehicle?.vehicleSeatingCapacity) || 0,
        owners: null,
        hu: "",
        emission: "",
        countryVersion: "",
        trim: "",
        accidentFree: null,
        damaged: false,
      },
      features: unique(features),
      seller: {
        type: dealer ? "dealer" : privateSeller ? "private" : "",
        // A private person's name stays off the client's sheet.
        name: dealer ? plain(sellerData.name).slice(0, 80) : "",
        contactName: privateSeller ? plain((page.match(/Vendeur particulier\s*:\s*<strong>([^<]+)<\/strong>/i) || [])[1]) : "",
        city,
        zip,
        country,
        address: [zip, city].filter(Boolean).join(" "),
        since,
        sinceText: since ? "na ParuVendu od {date}" : "",
        rating: null,
        stockUrl,
        stock: dealer && stock > 0 ? stock : null,
      },
      listedAt: posted ? `${posted[3]}-${posted[2]}-${posted[1]}T${posted[4]}:${posted[5]}:00` : "",
      portalPrice: null,
      vat: { deductible: vat, rate: vat ? 20 : 0, net: vat ? Math.round(price / 1.2) : 0, gross: price },
      flags: { damaged: false, aiTags: [] },
      warranty: warrantyKey && details[warrantyKey] ? details[warrantyKey].replace(/mois/i, "mies.") : null,
      seals: [],
    };
  }

  async function readParuvendu(url) {
    return parseParuvendu(await proxiedPage(url, "ParuVendu"), url);
  }

  // ---- Kleinanzeigen (DE) -------------------------------------------------------
  // Checked 2026-10-06 on private and dealer ads. The date under the place is
  // the last refresh of the ad, not when it was listed: not used. The ld+json
  // ImageObjects hold the photos of other ads too: only this ad's title.
  const STATES = /^(Baden-Württemberg|Bayern|Berlin|Brandenburg|Bremen|Hamburg|Hessen|Mecklenburg-Vorpommern|Niedersachsen|Nordrhein-Westfalen|Rheinland-Pfalz|Saarland|Sachsen|Sachsen-Anhalt|Schleswig-Holstein|Thüringen)$/;
  function parseKleinanzeigen(html, url = "") {
    const page = String(html || "");
    const title = plain((page.match(/id="viewad-title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1]);
    const details = Object.fromEntries([...page.matchAll(/<li class="addetailslist--detail">([\s\S]*?)<span class="addetailslist--detail--value"[^>]*>([\s\S]*?)<\/span>/g)]
      .map((match) => [plain(match[1]), plain(match[2])]));
    if (!title && !Object.keys(details).length) throw new Error("Kleinanzeigen: no ad data");
    const pictures = ldBlocks(page).filter((item) => item?.["@type"] === "ImageObject" && item.contentUrl);
    const own = pictures.find((item) => item.representativeOfPage)?.title ?? pictures[0]?.title;
    const images = pictures.filter((item) => item.title === own).map((item) => String(item.contentUrl))
      .filter((image) => /^https:\/\/img\.kleinanzeigen\.de\//.test(image));
    const description = htmlToText((page.match(/id="viewad-description-text"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "");
    const features = [...page.matchAll(/checktag[^>]*>([^<]+)</g)].map((match) => plain(match[1]));
    const powers = power(details.Leistung);
    const condition = String(details.Fahrzeugzustand || "");
    // "52062 Aachen - Aachen-Mitte" (town - district) or "73061 Baden-Württemberg - Ebersbach an der Fils" (state - town).
    const locality = plain((page.match(/id="viewad-locality"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
    const [, zip = "", rest = ""] = locality.match(/^(\d{5})\s*(.*)$/) || [];
    const parts = rest.split(/\s+-\s+/);
    const city = STATES.test(parts[0]) && parts[1] ? parts[1] : parts[0] || "";
    const box = page.slice(page.indexOf('id="viewad-contact-box"'));
    const dealer = /Gewerblicher (Nutzer|Anbieter)/.test(box);
    const privateSeller = !dealer && /Privater (Nutzer|Anbieter)/.test(box);
    const shown = plain((box.match(/class="[^"]*userprofile-vip"[^>]*>\s*(?:<a[^>]*>)?([^<]+)</) || [])[1]);
    const since = isoDay((box.match(/Aktiv seit\s*([\d.]+)/) || [])[1]);
    const online = number((box.match(/(\d[\d.]*)\s*Anzeigen? online/) || [])[1]);
    const profile = (box.match(/href="(\/s-bestandsliste\.html\?userId=\d+)"/) || [])[1] || "";
    const badges = [...box.matchAll(/class="userbadge-tag"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => plain(match[1])).filter((text) => text && text.length < 40);
    const priceText = plain((page.match(/id="viewad-price"[^>]*>([\s\S]*?)<\/h2>/) || [])[1]);
    const price = number(priceText);
    return {
      source: "kleinanzeigen",
      complete: true,
      readAt: new Date().toISOString(),
      url,
      title: title.slice(0, 160),
      images: unique(images).slice(0, 40),
      description,
      specs: {
        firstRegistration: monthYear(details.Erstzulassung),
        mileage: number(details.Kilometerstand),
        ccm: number(details.Hubraum),
        powerKw: powers.kw,
        powerHp: powers.hp,
        fuel: fuelPl(details.Kraftstoffart),
        gearbox: gearboxPl(details.Getriebe),
        drive: "",
        body: bodyPl(details.Fahrzeugtyp),
        color: colorPl(details["Außenfarbe"]),
        colorMaker: "",
        interior: interiorPl(details["Material Innenausstattung"], details.Innenausstattung || details["Farbe Innenausstattung"] || ""),
        doors: details["Anzahl Türen"] || "",
        seats: number(details["Anzahl Sitzplätze"]),
        owners: details["Anzahl der Fahrzeughalter"] ? number(details["Anzahl der Fahrzeughalter"]) : null,
        hu: details["HU bis"] ? huPl(monthYear(details["HU bis"])) : "",
        emission: details.Schadstoffklasse || "",
        countryVersion: "",
        trim: "",
        // "Unbeschädigtes Fahrzeug" — the portal's word for a car without damage (as page 1 reads it).
        accidentFree: /unbesch/i.test(condition) ? true : /besch|unfall/i.test(condition) ? false : null,
        damaged: !/unbesch/i.test(condition) && /besch|nicht fahr/i.test(condition),
      },
      features: unique(features),
      seller: {
        type: dealer ? "dealer" : privateSeller ? "private" : "",
        // A private person's name stays off the client's sheet.
        name: dealer ? shown.slice(0, 80) : "",
        contactName: privateSeller ? shown : "",
        city,
        zip,
        country: "DE",
        address: [zip, city].filter(Boolean).join(" "),
        since,
        sinceText: since ? "na Kleinanzeigen od {date}" : "",
        rating: null,
        badges,
        page: profile ? `https://www.kleinanzeigen.de${profile}` : "",
        stock: dealer && online > 0 ? online : null,
      },
      listedAt: "",
      portalPrice: null,
      vat: { deductible: false, rate: 0, net: 0, gross: price },
      flags: { damaged: !/unbesch/i.test(condition) && /besch/i.test(condition), negotiable: /\bVB\b/.test(priceText), aiTags: [] },
      warranty: null,
      seals: [],
    };
  }

  async function readKleinanzeigen(url) {
    return parseKleinanzeigen(await proxiedPage(url, "Kleinanzeigen"), url);
  }

  // ---- av.by (BY) ---------------------------------------------------------------
  // av.by's own API, one ad: https://api.av.by/offers/<id> (CORS *, the page
  // reads it directly; mobile.html does the same, src/avby-search.js). Checked
  // 2026-10-10 on a dealer, two private sellers and two damaged cars. The ad
  // is JSON: "properties" (brand, model, generation, year, engine_capacity in
  // litres "1,6", engine_type, transmission_type, body_type, drive_type, color,
  // interior_material/_color, mileage_km, engine_power in hp, condition,
  // registration_country, engine_endurance for electric cars…), "price" in
  // usd/eur/byn as av.by states it, "photos" (big = AVIF 1024 px, medium =
  // JPEG 490 px), "metadata.options" (the ticked equipment, Russian),
  // "organization" (a company: name, legal name, office, its number of car
  // ads, rating) or only "sellerName" (a private person), "locationName"
  // ("Калинковичи, Гомельская обл."), publishedAt / refreshedAt.
  // No month of registration, no doors (only "N дв." in some bodies), no
  // owners, no member-since. Values in Russian → the same Polish words as
  // fuelPl, gearboxPl… (labels from av.by's filter list, filters/main/init).
  const AVBY_FUELS = [
    [/гибрид.*дизель|дизель.*гибрид/i, "hybryda (diesel)"], [/гибрид/i, "hybryda (benzyna)"], [/электр/i, "elektryczny"],
    [/пропан|бутан|газ/i, "benzyna + LPG"], [/метан/i, "benzyna + CNG"], [/дизель/i, "diesel"], [/бензин/i, "benzyna"],
  ];
  // Robot (DSG…) and CVT are automatic for us too (as page 1 sends av.by).
  const AVBY_GEARBOXES = [[/механ/i, "manualna"], [/автомат|робот|вариатор/i, "automatyczna"]];
  const AVBY_DRIVES = [[/полн/i, "4x4"], [/передн/i, "przedni"], [/задн/i, "tylny"]];
  // "лифтбек" is a hatchback for us (mobile.js reads it so); "другой" says nothing.
  const AVBY_BODIES = [
    [/внедорожник|кроссовер|пикап/i, "SUV"], [/универсал/i, "kombi"], [/седан|лимузин/i, "sedan"], [/хэтчбек|лифтбек/i, "hatchback"],
    [/кабриолет|родстер/i, "kabriolet"], [/купе/i, "coupé"], [/минивэн|микроавтобус|фургон/i, "van"],
  ];
  // Single words; silver before grey (both start "сер").
  const AVBY_COLORS = [
    [/^бел/i, "biały"], [/^бордов/i, "bordowy"], [/^ж[её]лт/i, "żółty"], [/^зел[её]н/i, "zielony"], [/^коричнев/i, "brązowy"],
    [/^красн/i, "czerwony"], [/^оранжев/i, "pomarańczowy"], [/^серебрист/i, "srebrny"], [/^сер/i, "szary"], [/^(син|голуб)/i, "niebieski"],
    [/^фиолетов/i, "fioletowy"], [/^ч[её]рн/i, "czarny"], [/^беж/i, "beżowy"], [/^золот/i, "złoty"],
  ];
  // "комбинированные материалы" may be fabric with leatherette: not called half-leather.
  const AVBY_INTERIORS = [
    [/искусствен|эко/i, "ekoskóra"], [/кож/i, "skórzana"], [/алькантар/i, "Alcantara"], [/велюр/i, "welurowa"], [/ткан/i, "materiałowa"], [/комбинир/i, "łączona"],
  ];
  const AVBY_SHADES = [[/светл/i, "jasny"], [/т[её]мн/i, "ciemny"], [/комби/i, "dwukolorowy"]];
  // "снят с учёта" (deregistered: ready to leave Belarus) or the country of registration.
  const AVBY_REGISTRATION = [[/снят/i, "wyrejestrowany"], [/беларус/i, "zarejestrowany na Białorusi"], [/росси/i, "zarejestrowany w Rosji"], [/друг/i, "zarejestrowany za granicą"]];
  // The regions and the bigger towns as Polish writes them; other towns stay as av.by writes them.
  const AVBY_REGIONS = [[/брест/i, "obwód brzeski"], [/витеб/i, "obwód witebski"], [/гомел/i, "obwód homelski"], [/гродн/i, "obwód grodzieński"], [/минск/i, "obwód miński"], [/могил/i, "obwód mohylewski"]];
  const AVBY_CITIES = {
    минск: "Mińsk", брест: "Brześć", гомель: "Homel", гродно: "Grodno", витебск: "Witebsk", могилев: "Mohylew", могилёв: "Mohylew",
    бобруйск: "Bobrujsk", барановичи: "Baranowicze", борисов: "Borysów", пинск: "Pińsk", лида: "Lida", молодечно: "Mołodeczno",
  };
  // av.by's own price rating (metadata.medianPriceRange), in mobile.de's words.
  const AVBY_RATING = {
    much_below_average: "bardzo dobra cena", below_average: "dobra cena", average: "uczciwa cena",
    above_average: "podwyższona cena", much_above_average: "wysoka cena",
  };
  const avbyWord = (table, value, fallback = "") => (table.find(([pattern]) => pattern.test(String(value || "").trim())) || [])[1] || fallback;

  function parseAvby(offer, url = "") {
    const properties = Array.isArray(offer?.properties) ? offer.properties : [];
    if (!offer || (!properties.length && !offer.price)) throw new Error("av.by: no ad data");
    const property = (name) => {
      const value = properties.find((item) => item?.name === name)?.value;
      return value === undefined || value === null ? "" : String(value).trim();
    };
    const metadata = offer.metadata || {};
    // "B8 · Рестайлинг" → "B8 lifting", "XII (E210) " → "XII (E210)".
    const generation = property("generation").replace(/\s*·\s*/g, " ").replace(/(\d+)-?й\s+рестайлинг/i, "lifting $1")
      .replace(/рестайлинг/i, "lifting").replace(/\s+/g, " ").trim();
    const title = [makeName(property("brand")), property("model"), generation].filter(Boolean).join(" ");
    // The big photo of each (main first); the medium JPEG when there is none.
    const photos = [...(offer.photos || [])].sort((left, right) => Number(Boolean(right?.main)) - Number(Boolean(left?.main)));
    const images = photos.map((photo) => String(photo?.big?.url || photo?.medium?.url || ""))
      .filter((image) => /^https:\/\/avcdn\.av\.by\//.test(image));
    // Plain text already (Windows line ends): not read as HTML.
    const description = String(offer.description || "").replace(/\r\n?/g, "\n").replace(/[ \t  ]+/g, " ").replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n").trim().slice(0, 12000);
    // engine_capacity is in litres ("1,6"); 0 for electric cars.
    const litres = number(property("engine_capacity"));
    const ccm = litres > 0 && litres < 20 ? Math.round(litres * 1000) : Math.round(litres);
    const powers = power(property("engine_power") ? `${number(property("engine_power"))} KM` : "");
    const fuelLabel = property("engine_type");
    const drive = avbyWord(AVBY_DRIVES, property("drive_type"));
    const bodyLabel = property("body_type");
    const material = avbyWord(AVBY_INTERIORS, property("interior_material"));
    const shade = avbyWord(AVBY_SHADES, property("interior_color"));
    const condition = property("condition") || String(metadata.condition?.label || "");
    const damaged = /аварийн|запчаст/i.test(condition);
    const colorLabel = property("color");
    const organization = offer.organization || null;
    const dealer = Boolean(organization || offer.organizationId);
    // "Калинковичи, Гомельская обл." (private) or "Минск" (a company).
    const [town = "", regionLabel = ""] = String(offer.locationName || organization?.city?.label || "").split(/\s*,\s*/);
    const city = AVBY_CITIES[town.toLowerCase()] || town;
    const region = avbyWord(AVBY_REGIONS, regionLabel, regionLabel);
    const stock = Number(organization?.advertsCountByAdvertType?.advertTypes?.cars) || 0;
    const rating = organization?.organizationRating;
    const companyId = organization?.id || offer.organizationId || "";
    // "2026-10-09T17:02:40+0000": Safari reads the offset only with a colon.
    const isoTime = (value) => String(value || "").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    const priceType = metadata.medianPriceRange?.priceRangeType;
    return {
      source: "avby",
      complete: true,
      readAt: new Date().toISOString(),
      url: url || String(offer.publicUrl || ""),
      title: title.slice(0, 160),
      make: makeName(property("brand")),
      model: property("model"),
      images: unique(images).slice(0, 40),
      description,
      specs: {
        // av.by names the year only.
        firstRegistration: monthYear(property("year") || offer.year || metadata.year),
        mileage: number(property("mileage_km")),
        ccm,
        powerKw: powers.kw,
        powerHp: powers.hp,
        fuel: avbyWord(AVBY_FUELS, fuelLabel, fuelPl(fuelLabel)),
        gearbox: avbyWord(AVBY_GEARBOXES, property("transmission_type"), gearboxPl(property("transmission_type"))),
        drive,
        body: /^друг/i.test(bodyLabel) ? "" : avbyWord(AVBY_BODIES, bodyLabel, bodyLabel),
        color: /^друг/i.test(colorLabel) ? "" : avbyWord(AVBY_COLORS, colorLabel, colorLabel),
        colorMaker: "",
        interior: [material, shade].filter(Boolean).join(", "),
        // Only "внедорожник 5 дв." / "хэтчбек 3 дв." say the doors.
        doors: (bodyLabel.match(/(\d)\s*дв/) || [])[1] || "",
        seats: number(property("number_of_seats")),
        owners: null,
        hu: "",
        emission: "",
        countryVersion: "",
        registration: avbyWord(AVBY_REGISTRATION, property("registration_country")),
        generation,
        rangeKm: number(property("engine_endurance")),
        trim: "",
        accidentFree: damaged ? false : null,
        damaged,
      },
      // av.by's ticked options as it names them (Russian: offer-equipment.js
      // translates); leather and 4x4 come from the specs, as for mobile.de.
      features: unique([...(metadata.options || []).map((option) => String(option?.name || "").trim()), ...attributeOptions({}, { drive, interior: material === "skórzana" ? "Leder" : "" })]),
      seller: {
        type: dealer ? "dealer" : offer.sellerName ? "private" : "",
        // A private person's name stays off the client's sheet.
        name: dealer ? String(organization?.title || offer.organizationTitle || offer.sellerName || "").trim().slice(0, 80) : "",
        contactName: dealer ? "" : String(offer.sellerName || "").trim(),
        legalName: dealer ? String(organization?.legalName || "").trim() : "",
        city,
        region,
        zip: "",
        country: "BY",
        address: dealer ? [organization?.location, city].filter(Boolean).join(", ") : [city, region].filter(Boolean).join(", "),
        since: "",
        sinceText: "",
        rating: Number(rating?.count) > 0 ? { score: Number(rating.averageScore) || 0, reviews: Number(rating.count), recommend: null, adReality: null, portal: "av.by" } : null,
        // av.by's own link to the company's cars (seo.canonicalPage of that search).
        page: dealer && companyId ? `https://cars.av.by/filter?organization=${companyId}` : "",
        stock: dealer && stock > 0 ? stock : null,
      },
      // The first publication; refreshedAt / renewedAt are paid lifts to the top.
      listedAt: isoTime(offer.publishedAt),
      portalPrice: AVBY_RATING[priceType] ? { portal: "av.by", label: AVBY_RATING[priceType], rating: priceType, thresholds: [] } : null,
      // Belarus: no Polish VAT to deduct; the EUR price as av.by states it.
      vat: { deductible: false, rate: 0, net: 0, gross: Number(offer.price?.eur?.amount) || 0 },
      currency: "EUR",
      priceUsd: Number(offer.price?.usd?.amount) || 0,
      flags: {
        damaged,
        isNew: /^нов/i.test(condition),
        readyToDrive: /запчаст/i.test(condition) ? false : null,
        exchange: offer.exchange?.exchangeAllowed === "allowed",
        vinChecked: Boolean(metadata.vinInfo?.checked),
        // Days on sale as av.by counts them (across re-publications of the ad).
        daysOnSale: Number(offer.originalDaysOnSale) || 0,
        aiTags: [],
      },
      warranty: null,
      seals: [],
    };
  }

  // avcdn.av.by lets only av.by's own pages read its photos (no CORS for
  // ours, checked 2026-10-10): the offer (<img crossorigin>, the PDF) gets them
  // through our Worker, which reads every *.av.by host.
  const avbyPhotoProxy = () => {
    const base = typeof window !== "undefined" ? window.AUTOGOOD_WORKER_PROXY ?? "https://ag-proxy.autogood-crm.workers.dev/" : "";
    return typeof base === "string" ? base : "";
  };
  async function readAvby(url) {
    const id = (String(url || "").match(/\/(\d{5,})\/?(?:[?#].*)?$/) || [])[1];
    if (!id) throw new Error("av.by: no ad number in the link");
    // av.by answers 429 to bursts: one patient retry.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`https://api.av.by/offers/${id}`);
      if (response.status === 429 && !attempt) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      if (!response.ok) throw new Error(`av.by ${response.status}`);
      const ad = parseAvby(await response.json(), url);
      const photoProxy = avbyPhotoProxy();
      if (photoProxy) ad.images = ad.images.map((image) => `${photoProxy}${image}`);
      return ad;
    }
    throw new Error("av.by 429");
  }

  // ---- otomoto.pl (PL) ----------------------------------------------------------
  // Checked 2026-10-10 on 9 real ads (Toyota C-HR, BMW X5, Audi Q8, Skoda Superb: dealers with
  // and without "Faktura VAT", a VAT-deductible dealer and a private leasing
  // transfer, private sellers). Everything is in __NEXT_DATA__; the page has no
  // schema.org Vehicle. otomoto is Polish already: the machine values of
  // parametersDict (fuel_type "hybrid", body_type "combi", color "dark-red"…)
  // are put in the same Polish words as the other portals, the equipment keeps
  // otomoto's own Polish labels (offer-equipment.js reads them).
  // Not on the page (left empty): the first registration date and the VIN
  // (both encrypted, shown only after a reCAPTCHA — not bypassed), the dealer's
  // rating (loaded later by the browser), otomoto's price evaluation.
  const OTOMOTO_BODIES = { combi: "kombi", compact: "hatchback", "city-car": "hatchback", mini: "hatchback", sedan: "sedan", suv: "SUV", minivan: "van", coupe: "coupé", cabrio: "kabriolet" };
  // Shades the shared colour table would get wrong ("dark-red" is not red,
  // "brown-beige" is beige); the plain ones go through colorPl.
  const OTOMOTO_COLORS = { "brown-beige": "beżowy", "sky-blue": "błękitny", "dark-red": "bordowy", "navy-blue": "granatowy", "yellow-gold": "złoty", other: "", new_colour: "" };
  const OTOMOTO_PAINT = { metallic: " metalik", pearl: " perłowy", matt: " matowy" };
  const OTOMOTO_FUELS = { etanol: "benzyna (E85)", hidrogen: "wodór", hydrogen: "wodór" };
  const OTOMOTO_UPHOLSTERY = { "leather-upholstery": "skórzana", "upholstery-with-leather-inserts": "półskórzana", "textile-upholstery": "materiałowa", "alcantara-upholstery": "Alcantara" };
  const OTOMOTO_COUNTRIES = { polska: "PL", niemcy: "DE", litwa: "LT", czechy: "CZ", słowacja: "SK", ukraina: "UA", belgia: "BE", holandia: "NL", francja: "FR" };

  // Dealers write slogans into their name ("Toyota Komorniki - sprzedaż | odkup |",
  // "★★ DEALER … - SAMOCHODY Z GWARANCJĄ !! ★★", "*Auto-Tina* - Samochody
  // uszkodzone …"): the client's sheet gets the part before the first " - " / "|"
  // or emoji; the whole text stays in nameFull.
  function otomotoDealerName(value) {
    const parts = plain(value)
      .replace(/[^\p{L}\p{N}\s.,&'"()+/:-]+/gu, " | ")
      .split(/\s+[-–]\s+|\|/)
      .map((part) => part.replace(/\s+/g, " ").replace(/^[\s.,:-]+|[\s.,:-]+$/g, "").trim())
      .filter((part) => /\p{L}.*\p{L}/u.test(part));
    const name = parts[0] || plain(value);
    // Long ones are cut between words.
    return name.length > 80 ? name.slice(0, 81).replace(/\s+\S*$/, "") : name;
  }

  // The first registration is encrypted on the page. Dealers often repeat it
  // in the text ("Data pierwszej rejestracji: 2024-08-19"): taken only as a
  // full date right after those words, within 3 years of the production year.
  function otomotoRegistration(text, productionYear) {
    const after = (String(text || "").match(/(?:pierwsz\w*|\b1\.)\s+rejestracj\w*[^\d\n]{0,25}([\d.\-/ ]{7,12})/i) || [])[1] || "";
    const match = after.match(/^((?:19|20)\d{2})-(\d{2})-\d{2}/) || after.match(/^\d{2}[./-](\d{2})[./-]((?:19|20)\d{2})/) || after.match(/^(\d{2})[./]((?:19|20)\d{2})/);
    if (!match) return "";
    const [year, month] = /^(?:19|20)\d{2}$/.test(match[1]) ? [Number(match[1]), Number(match[2])] : [Number(match[2]), Number(match[1])];
    if (month < 1 || month > 12 || (productionYear && (year < productionYear || year > productionYear + 3))) return "";
    return `${String(month).padStart(2, "0")}/${year}`;
  }

  function parseOtomoto(html, url = "") {
    const raw = String(html || "").match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    let advert = null;
    try {
      advert = raw ? JSON.parse(raw[1])?.props?.pageProps?.advert : null;
    } catch {
      advert = null;
    }
    if (!advert?.price?.value && !advert?.parametersDict) throw new Error("otomoto: no ad data");
    const params = advert.parametersDict || {};
    const value = (key) => String(params[key]?.values?.[0]?.value ?? "");
    const label = (key) => plain(params[key]?.values?.[0]?.label ?? "");
    // Ticked = "1"; "0" means the seller said no; missing = not said.
    const yes = (key) => (value(key) === "1" ? true : value(key) === "0" ? false : null);
    const seller = advert.seller || {};
    const location = seller.location || {};
    const dealer = /PROFESSIONAL|BUSINESS|DEALER/i.test(seller.type || "");
    const privateSeller = !dealer && /PRIVATE/i.test(seller.type || "");
    const version = label("version") || label("version_label");
    const title = plain(advert.title) || [label("make"), label("model")].filter(Boolean).join(" ");
    const productionYear = Number(value("year")) || 0;
    // Descriptions come as HTML (<p>…) or as plain text with \r\n.
    const description = htmlToText(String(advert.description || "").replace(/\r\n?/g, "\n"));
    // Photos: the CDN answers a cross-origin request (the PDF draws them) only
    // for its own size presets — ";s=1200x0" works, the bare URL, 1080x720 or
    // 640x480 get 403 "Invalid CORS request" (checked 2026-10-10).
    const images = (advert.images?.photos || []).map((photo) => String(photo?.url || photo?.id || "").split(";")[0])
      .filter((image) => /^https:\/\/[\w.-]+\.olxcdn\.com\/v1\/files\//.test(image)).map((image) => `${image};s=1200x0`);
    const features = (advert.equipment || []).flatMap((group) => (group?.values || []).map((item) => plain(item?.label)));
    const drive = drivePl(value("transmission"));
    const hp = Number(value("engine_power")) || Number(value("system_performance_of_hybrid_driveline_in_hp")) || 0;
    const colorKey = value("color");
    const color = colorKey in OTOMOTO_COLORS ? OTOMOTO_COLORS[colorKey] : colorPl(colorKey) || label("color").toLowerCase();
    const upholstery = value("upholstery_type");
    const interior = OTOMOTO_UPHOLSTERY[upholstery] || label("upholstery_type").replace(/^tapicerka\s+/i, "");
    const noAccident = yes("no_accident");
    const damaged = value("damaged") === "1";
    // "Pierwszy właściciel (od nowości)": one owner since new. "Nie" says only
    // that there were more, not how many.
    const firstOwner = yes("original_owner");
    const origin = value("country_origin");
    // Price: the shown price is always gross. "Możliwość odliczenia VAT" comes as
    // the label "ad-page-vat-deductible-tag" and isNet:true here (isGross:false
    // + INCLUDE_VAT in the search; PROJECT-MOBILE.md §4, 2026-10-03), with the
    // net amount in grosze. "Faktura VAT" alone (an invoice, maybe a margin one)
    // and "VAT marża" are said, but VAT is not counted as deductible for them.
    const labels = (advert.price?.labels || []).map(String);
    const priceInfo = advert.advertPriceForPriceDrop || {};
    const gross = Number(advert.price?.value) || Math.round(Number(priceInfo.grossMinorAmount) / 100) || 0;
    const deductible = labels.includes("ad-page-vat-deductible-tag") || priceInfo.isNet === true;
    const net = deductible ? Math.round(Number(priceInfo.netMinorAmount) / 100) || Math.round(gross / 1.23) : 0;
    const currency = String(advert.price?.currency || "PLN").toUpperCase();
    // "Sprzedający na OTOMOTO od 2008": the year only.
    const badges = (seller.featuresBadges || []).map((badge) => ({ code: String(badge?.code || ""), text: plain(badge?.label) }));
    const since = (badges.find((badge) => badge.code === "registration-date")?.text.match(/((?:19|20)\d{2})/) || [])[1] || "";
    const warrantyUntil = value("maker_warranty_valid_until_date").match(/^(\d{4})-(\d{2})/);
    const warrantyKm = Number(value("maker_warranty_valid_until_km")) || 0;
    const address = plain(location.address);
    const zip = plain(location.postalCode);
    const city = plain(location.city);
    return {
      source: "otomoto",
      complete: true,
      readAt: new Date().toISOString(),
      url: url || String(advert.url || ""),
      adId: String(advert.id || ""),
      // The version is in the title only when the seller picked it.
      title: (version && !title.toLowerCase().includes(version.toLowerCase()) ? `${title} ${version}` : title).slice(0, 160),
      make: label("make"),
      model: label("model"),
      images: unique(images).slice(0, 40),
      description,
      specs: {
        firstRegistration: otomotoRegistration(description, productionYear) || (productionYear ? String(productionYear) : ""),
        productionYear: productionYear || null,
        mileage: Number(value("mileage")) || 0,
        ccm: Number(value("engine_capacity")) || 0,
        powerKw: hp ? Math.round(hp / 1.35962) : 0,
        powerHp: hp,
        fuel: OTOMOTO_FUELS[value("fuel_type")] || fuelPl(value("fuel_type")) || label("fuel_type").toLowerCase(),
        gearbox: gearboxPl(value("gearbox")),
        drive: ["4x4", "przedni", "tylny"].includes(drive) ? drive : "",
        body: OTOMOTO_BODIES[value("body_type")] || bodyPl(label("body_type")),
        color: color ? `${color}${OTOMOTO_PAINT[value("colour_type")] && !/metalik|perłowy|matowy/.test(color) ? OTOMOTO_PAINT[value("colour_type")] : ""}` : "",
        colorMaker: "",
        interior,
        doors: value("door_count"),
        seats: Number(value("nr_seats")) || 0,
        owners: firstOwner === true ? 1 : null,
        firstOwner,
        hu: "",
        emission: "",
        countryVersion: origin === "pl" ? "wersja polska" : "",
        // "Kraj pochodzenia": Polska = bought new in Poland, else where it came from.
        countryOrigin: label("country_origin"),
        imported: yes("is_imported_car"),
        registeredPl: yes("registered"),
        trim: version,
        generation: label("generation"),
        isNew: value("new_used") === "new",
        accidentFree: noAccident === true ? true : damaged ? false : null,
        damaged,
        // "Serwisowany w ASO": serviced at the brand's dealer.
        serviceBook: yes("service_record") === true ? true : null,
        batteryKwh: Number(value("battery_capacity")) || 0,
        rangeKm: Number(value("autonomy")) || 0,
      },
      features: unique([...features, ...(drive === "4x4" ? ["Napęd 4x4"] : [])]),
      seller: {
        type: dealer ? "dealer" : privateSeller ? "private" : "",
        // A private person's name stays off the client's sheet.
        name: dealer ? otomotoDealerName(seller.name) : "",
        nameFull: dealer ? plain(seller.name).slice(0, 200) : "",
        contactName: privateSeller ? plain(seller.name).slice(0, 40) : "",
        city,
        zip,
        country: OTOMOTO_COUNTRIES[plain(location.country).toLowerCase()] || "PL",
        // A dealer's street; a private seller's district stays out.
        address: [dealer && address && address !== "-" ? address : "", [zip, city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        since,
        sinceText: since ? "na otomoto od {date}" : "",
        rating: null,
        authorized: badges.some((badge) => badge.code === "authorized-dealer"),
        badges: badges.filter((badge) => !/^(dealer|private-seller|registration-date|authorized-dealer)$/.test(badge.code)).map((badge) => badge.text).filter(Boolean),
        page: /^https:\/\/[\w.-]+\.otomoto\.pl\//i.test(seller.sellerUrl || "") ? String(seller.sellerUrl) : "",
        website: /^https?:\/\//i.test(seller.website || "") ? String(seller.website) : "",
        // Every active ad of the dealer on otomoto (cars almost always).
        stock: dealer && Number(seller.numberOfActiveAds) > 0 ? Number(seller.numberOfActiveAds) : null,
      },
      // createdAt moves with every paid bump; originalCreatedAt is the day the
      // ad was put up (2026-09-10 against a bump on 2026-10-10).
      listedAt: String(advert.originalCreatedAt || advert.createdAt || ""),
      portalPrice: null,
      currency,
      vat: { deductible, rate: deductible ? 23 : 0, net, gross, currency, invoice: labels.includes("Faktura VAT") || value("vat") === "1", margin: value("vat_discount") === "1" },
      flags: {
        damaged,
        negotiable: labels.includes("ad-page-negotiable-tag"),
        rhd: value("rhd") === "1",
        historic: value("historical_vehicle") === "1",
        tuning: value("tuning") === "1",
        truckApproval: value("approval_for_goods") === "1",
        cepik: advert.verifiedCar === true,
        leasing: value("leasing_concession") === "1",
        inactive: Boolean(advert.status) && advert.status !== "ACTIVE",
        aiTags: [],
      },
      // The maker's warranty (the dealer's own is not a field on otomoto): kept
      // apart, the verdict calls `warranty` the dealer's.
      warranty: null,
      makerWarranty: warrantyUntil || warrantyKm
        ? [warrantyUntil ? `do ${warrantyUntil[2]}/${warrantyUntil[1]}` : "", warrantyKm ? `${String(warrantyKm).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} km` : ""].filter(Boolean).join(" lub ")
        : "",
      // Brand programmes of certified used cars ("Toyota Pewne Auto", "Audi Select :plus").
      seals: (seller.logos || []).filter((logo) => logo?.type === "brandProgram" && logo.image?.alt).map((logo) => ({ name: plain(logo.image.alt), benefits: [] })),
    };
  }

  async function readOtomoto(url) {
    return parseOtomoto(await proxiedPage(url, "otomoto"), url);
  }

  // ---- Blocket (SE) -------------------------------------------------------------
  // Checked 2026-10-10 on 13 ads: dealers with and without deductible VAT,
  // private sellers, petrol / diesel / hybrid / plug-in / electric (Volvo,
  // Toyota, BMW, Kia, Audi, Mercedes, MG), read through our Worker and through
  // r.jina.ai (the same markup). Blocket now runs on the Vend (FINN) platform:
  // the ad page is server-rendered HTML, no JSON state.
  // - ld+json Product: price in SEK, seller Organization / Person, make, model
  //   (its "image" holds only 3 photos).
  // - Photos: every images.blocketcdn.se URL of this ad (gallery srcset, the ad
  //   targeting list), taken at 1600w (1280 px, CORS *); r.jina.ai's rendered
  //   page keeps only the first gallery <img>, the other copies stay.
  // - "Specifikationer" <dt>/<dd>: Märke, Modell, Modellår, Biltyp, Drivmedel,
  //   Effekt "197 Hk", Motorvolym "1,97 L" (litres only), Miltal "14 283 mil"
  //   (1 Swedish mil = 10 km), Växellåda, Drivhjul, Säten, Antal dörrar, Färg,
  //   Färgbeskrivning (maker's name), Färg interiör, Registreringsdatum
  //   "2021-02-28" (first registration), Senaste / Nästa besiktningsdatum,
  //   Antal ägare (all registered owners, the current one too — as
  //   Kleinanzeigen's Fahrzeughalter), Försäljningsform.
  // - "Utrustning": the seller's list as written (Swedish, often the maker's
  //   own words; offer-equipment.js translates it).
  // - "Beskrivning": the description; tabs "Garanti", "Service", "Bytesrätt",
  //   "Hemleverans", "Medlem" (MRF); private sellers answer four questions
  //   ("Säljarens kännedom om bilen": damage, repairs, tuning, debts; a few
  //   dealers answer them too).
  // - The dealer box ("Återförsäljarens uppgifter"): name, "5+ år på Blocket",
  //   address, dealer page, "Visa handlarens 116 annonser"; "Orgnr".
  //   A private seller's name is not on the page (contact needs a login).
  // - Price "Pris 269 800 kr (215 840 kr exkl. moms)" = VAT 25 % deductible;
  //   "Totalt pris" = no VAT shown (margin scheme or a private person).
  // The page shows "Uppdaterad" (last change), not when the ad was listed:
  // not used, as on Kleinanzeigen.
  const BLOCKET_FUELS = [
    [/plug-?in|laddhybrid|laddbar/i, "hybryda plug-in"],
    [/hybrid.*diesel|diesel.*hybrid/i, "hybryda (diesel)"],
    [/hybrid/i, "hybryda (benzyna)"],
    // "El" alone ("diesel" ends with "el" but has no word boundary there).
    [/\bel\b|elektri|elbil/i, "elektryczny"],
    [/diesel/i, "diesel"],
    [/gasol|\blpg\b/i, "benzyna + LPG"],
    [/biogas|fordonsgas|naturgas|\bcng\b|^gas$/i, "benzyna + CNG"],
    [/etanol|e85|flexi/i, "benzyna (E85)"],
    [/bensin/i, "benzyna"],
  ];
  // "Halvkombi" is a hatchback, not an estate (bodyPl would read "kombi").
  const BLOCKET_BODIES = [
    [/halvkombi|småbil/i, "hatchback"], [/kombi/i, "kombi"], [/sedan/i, "sedan"], [/suv|terräng|pickup/i, "SUV"],
    [/coup[ée]/i, "coupé"], [/\bcab|roadster/i, "kabriolet"], [/buss|skåp|\bvan\b|transportbil/i, "van"],
  ];
  // Blocket's own colour list; "vinröd" before "röd", "guld" before "gul".
  const BLOCKET_COLORS = [
    [/svart/i, "czarny"], [/vit/i, "biały"], [/grå|antracit/i, "szary"], [/silver/i, "srebrny"], [/blå/i, "niebieski"],
    [/vinröd|bordeaux/i, "bordowy"], [/röd/i, "czerwony"], [/grön/i, "zielony"], [/brun|brons/i, "brązowy"], [/beige/i, "beżowy"],
    [/guld/i, "złoty"], [/gul/i, "żółty"], [/orange/i, "pomarańczowy"], [/lila|violett/i, "fioletowy"], [/rosa/i, "różowy"],
    [/turkos/i, "turkusowy"],
  ];
  // Lines sellers put into "Utrustning" that are not equipment: the road tax
  // ("360 kr i årsskatt" would read as a 360° camera), the inspection, the
  // emission class and "Svensksåld" (read into the specs), opening hours,
  // financing, delivery, range.
  const BLOCKET_NOT_EQUIPMENT = /skatt\b|årsskatt|besikt|euro\s?ncap|^(?:miljöklass\s*)?euro\s*\d|^svensksåld$|öppet|måndag|lördag|söndag|leas|kredit|finansier|ränta|kontant|hemleverans|beställ|carfax|wltp|räckvidd|^\d+$/i;
  const BLOCKET_MONTHS = { januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6, juli: 7, augusti: 8, september: 9, oktober: 10, november: 11, december: 12 };
  const BLOCKET_COUNTRIES = { sverige: "SE", norge: "NO", danmark: "DK", finland: "FI", tyskland: "DE" };

  function blocketFuel(value) {
    const text = String(value || "").trim();
    return (BLOCKET_FUELS.find(([pattern]) => pattern.test(text)) || [])[1] || fuelPl(text);
  }
  // "Tvåhjulsdriven" (two-wheel drive) does not say front or rear: left unsaid.
  function blocketDrive(value) {
    const text = String(value || "");
    if (/fyrhjul|allhjul|4wd|awd|4x4/i.test(text)) return "4x4";
    if (/framhjul/i.test(text)) return "przedni";
    if (/bakhjul/i.test(text)) return "tylny";
    return ["4x4", "przedni", "tylny"].includes(drivePl(text)) ? drivePl(text) : "";
  }
  function blocketBody(value) {
    const text = String(value || "").trim();
    if (!text || /^annat$/i.test(text)) return "";
    return (BLOCKET_BODIES.find(([pattern]) => pattern.test(text)) || [])[1] || bodyPl(text);
  }
  // "Grå" + "Vapour Grey Metallic" → "szary metalik".
  function blocketColor(value, description = "") {
    const text = String(value || "").trim();
    if (!text) return "";
    const found = BLOCKET_COLORS.find(([pattern]) => pattern.test(text));
    if (!found) return colorPl(text, description);
    const both = `${text} ${description}`;
    return `${found[1]}${/metal/i.test(both) ? " metalik" : /pärl|pearl/i.test(both) ? " perłowy" : ""}`;
  }
  // "Färg interiör" (material and colour in a sentence) or, without it, the
  // upholstery the equipment list names ("Halvskinnklädsel", "Helskinn") —
  // never "Ratt i läder" (the steering wheel).
  function blocketInterior(value, features) {
    const material = (text) => (/alcantara/i.test(text) ? "Alcantara"
      : /halv(?:skinn|läder)|del(?:vis)?\s?(?:skinn|läder)/i.test(text) ? "półskórzana"
        : /konstläder|syntetläder|pu-?läder|vegansk/i.test(text) ? "ekoskóra"
          : /skinn|läder|nappa/i.test(text) ? "skórzana"
            : /textil|tyg|tweed|velour/i.test(text) ? "materiałowa" : "");
    const text = String(value || "");
    const upholstery = features.find((name) => /skinn|läder|nappa|textil|tyg|alcantara/i.test(name) && /klädsel|klädda|säte|stol|inredning|^(?:hel|halv)?skinn$/i.test(name)) || "";
    const shade = (BLOCKET_COLORS.find(([pattern]) => pattern.test(text)) || [])[1] || "";
    return [material(text) || material(upholstery), material(text) ? shade : ""].filter(Boolean).join(", ");
  }
  // "2021-02-28" / "28 februari 2021" / "2021" → "02/2021" / "2021".
  function blocketMonth(value) {
    const text = String(value || "").toLowerCase();
    const iso = text.match(/((?:19|20)\d{2})-(\d{2})(?:-\d{2})?/);
    if (iso) return `${iso[2]}/${iso[1]}`;
    const named = text.match(/([a-zåäö]+)[\s-]+((?:19|20)\d{2})/);
    if (named && BLOCKET_MONTHS[named[1]]) return `${String(BLOCKET_MONTHS[named[1]]).padStart(2, "0")}/${named[2]}`;
    return monthYear(text);
  }
  // A tab's text ("Garanti", "Service"…), by the panel's id.
  function blocketTab(page, name) {
    const match = page.match(new RegExp(`id="warp-tabpanel-${name}"[^>]*>([\\s\\S]*?)(?=<div[^>]*role="tabpanel"|<div class="mt-40|<section|<h2)`));
    return match ? plain(match[1].replace(/<br\s*\/?>/gi, "\n"), true) : "";
  }

  function parseBlocket(html, url = "") {
    const page = String(html || "");
    const product = ldBlocks(page).find((item) => item?.["@type"] === "Product") || null;
    const specsHtml = (page.match(/>Specifikationer<\/h2>([\s\S]*?)<\/dl>/) || [])[1] || "";
    // Labels in lower case; a label's tooltip ("(NEDC) …") left out.
    const details = Object.fromEntries([...specsHtml.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)]
      .map((match) => [plain(match[1].replace(/<span[\s\S]*$/, "")).toLowerCase(), plain(match[2])]));
    // The four facts under the title, when the specifications are missing.
    for (const match of page.matchAll(/<span class="s-text-subtle">([^<]+)<\/span>\s*<p class="m-0 font-bold">([^<]+)<\/p>/g)) {
      const label = plain(match[1]).toLowerCase();
      if (!details[label]) details[label] = plain(match[2]);
    }
    const heading = plain((page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]);
    if (!product && !Object.keys(details).length) throw new Error("Blocket: no ad data");
    const field = (...labels) => labels.map((label) => details[label]).find(Boolean) || "";
    const adId = (String(url).match(/\/item\/(\d+)/) || String(product?.url || "").match(/\/item\/(\d+)/) || page.match(/>Annons-ID<\/p>\s*<p[^>]*>(\d+)</) || [])[1] || "";

    // Title: "Volvo XC60" + the seller's line under it ("D4 AWD Geartronic …").
    const subtitle = plain((page.match(/<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
    const make = makeName(field("märke") || product?.brand?.name);
    const model = String(field("modell") || product?.model?.name || "").trim();
    const title = `${heading || plain(product?.name) || `${make} ${model}`} ${subtitle}`.replace(/\s+/g, " ").trim().slice(0, 160);

    // Photos of this ad only (the recommendations below carry other ids).
    const images = adId
      ? unique([...page.matchAll(new RegExp(`https://images\\.blocketcdn\\.se/dynamic/(?:\\d+w|default)/item/${adId}/[0-9a-f-]+`, "g"))]
        .map((match) => match[0].replace(/\/dynamic\/[^/]+\//, "/dynamic/1600w/")))
      : (product?.image || []).map((image) => String(image?.contentUrl || image || "").replace(/\/dynamic\/[^/]+\//, "/dynamic/1600w/")).filter((image) => /^https:\/\/images\.blocketcdn\.se\//.test(image));

    const descriptionHtml = (page.match(/>Beskrivning<\/h2>([\s\S]*?)<\/section>/) || [])[1] || "";
    const equipmentHtml = (page.match(/>Utrustning<\/h2>([\s\S]*?)<\/ul>/) || [])[1] || "";
    const listed = unique([...equipmentHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => plain(match[1])));
    const features = listed.filter((name) => !BLOCKET_NOT_EQUIPMENT.test(name));

    // "197 Hk" / "100 kw (136 hk)": power() knows "hp", not the Swedish "hk".
    const powers = power(field("effekt", "hästkrafter", "motoreffekt").replace(/\bhk\b/gi, "hp"));
    // "1,97 L" → 1970 cm³ (Blocket gives litres only: the excise line at
    // 2,0 l stays right, the last digits are the page's rounding).
    const volumeText = field("motorvolym", "motorstorlek", "slagvolym");
    const volume = number(volumeText);
    const ccm = /\bl\b|liter/i.test(volumeText) && volume < 20 ? Math.round(volume * 1000) : volume;
    // Swedish mil = 10 km (a mileage already in km kept as it is).
    const mileageText = field("miltal", "mätarställning");
    const mileage = number(mileageText) * (/\bkm\b/i.test(mileageText) ? 1 : 10);
    const bodyText = field("biltyp", "kaross");
    const doors = field("antal dörrar") || (bodyText.match(/(\d)-dörr/i) || [])[1] || "";
    const owners = field("antal ägare");
    const nextInspection = field("nästa besiktningsdatum", "besiktigad till", "besiktad till");
    // "Miljöklass Euro6d" / "EURO 6 MOTOR" → "Euro 6d" / "Euro 6".
    const euro = `${field("miljöklass", "utsläppsklass")} | ${listed.join(" | ")}`.match(/euro\s*([1-7][a-d]?(?:-temp)?)\b/i);

    // The private seller's answers ("Har bilen några kända skador?" → "Nej").
    const knowledge = (page.match(/>Säljarens kännedom om bilen<\/h2>([\s\S]*?)<\/section>/) || [])[1] || "";
    const answers = [...knowledge.matchAll(/<p class="font-bold[^"]*">([\s\S]*?)<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((match) => [plain(match[1]), plain(match[2])]);
    const answer = (pattern) => (answers.find(([question]) => pattern.test(question)) || [])[1] || "";
    const yes = (text) => (/^ja\b/i.test(text) ? true : /^nej\b/i.test(text) ? false : null);
    const damage = answer(/skador/i);
    const repairs = answer(/reparation/i);

    // Seller: the contact button's segment, the dealer box, the schema type.
    const dealer = /"segment"\s*:\s*"PROFESSIONAL"/.test(page) || /Återförsäljarens uppgifter/.test(page) || /organization/i.test(product?.offers?.seller?.["@type"] || "");
    const privateSeller = !dealer && (/"segment"\s*:\s*"PRIVATE"/.test(page) || /person/i.test(product?.offers?.seller?.["@type"] || ""));
    const box = dealer ? (page.match(/Återförsäljarens uppgifter<\/h2>([\s\S]*?)<\/w-box>/) || [])[1] || "" : "";
    const name = plain((box.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || page.match(/<b>Säljs av\s*<\/b>([^<]+)</) || [])[1]);
    // "5+ år på Blocket" / "3 månader på Blocket" → the year (month) the seller joined, at the latest.
    const member = plain((box.match(/>([^<]*på Blocket)</) || [])[1]).match(/(\d+)\+?\s*(år|månad)/i);
    let since = "";
    if (member) {
      const date = new Date();
      if (/år/i.test(member[2])) since = String(date.getFullYear() - Number(member[1]));
      else {
        date.setMonth(date.getMonth() - Number(member[1]));
        since = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
    }
    const stock = number((box.match(/Visa handlarens\s+([\d\s  ]+)\s+annons/) || [])[1]);
    const dealerPage = (box.match(/href="(https:\/\/www\.blocket\.se\/mobility\/dealer\/[^"]+)"/) || [])[1] || "";
    const stockUrl = (box.match(/href="(https:\/\/www\.blocket\.se\/mobility\/search\/car\?orgId=\d+)"/) || [])[1] || "";
    // "Plats": "Borgåsliden, 43439 Kungsbacka" (dealer) or "41322 Göteborg" (private).
    const placeText = plain((page.match(/>Plats<\/h2>[\s\S]*?<span[^>]*>([^<]+)</) || [])[1]);
    const [, street = "", zipDigits = "", placeCity = ""] = placeText.match(/^(?:(.*?),\s*)?(\d{3}\s?\d{2})\s+(.+)$/) || [];
    const shownCity = plain((page.match(/<a href="https:\/\/www\.google\.com\/maps[^"]*"[^>]*class="[^"]*ml-12"[^>]*>([^<]+)<\/a>/) || [])[1]);
    const targeted = (page.match(/"key":"zipcode","value":\["(\d{5})"\]/) || [])[1] || "";
    const digits = (zipDigits || targeted).replace(/\s/g, "");
    const zip = digits ? `${digits.slice(0, 3)} ${digits.slice(3)}` : "";
    const city = placeCity || shownCity || placeText;
    const country = BLOCKET_COUNTRIES[field("bilens plats").toLowerCase()] || "SE";
    const badges = /Medlem i Motorbranschens Riksförbund/.test(page) ? ["MRF (Motorbranschens Riksförbund)"] : [];

    // Price: "Pris 269 800 kr (215 840 kr exkl. moms)" for a dealer whose VAT
    // is deductible, "Totalt pris" otherwise.
    const priceBlock = (page.match(/<p class="s-text-subtle mb-0">(?:Totalt pris|Pris)<\/p>([\s\S]*?)<\/div>/) || [])[1] || "";
    const price = Number(product?.offers?.price) || number(plain(priceBlock).split("(")[0]);
    const netText = (plain(priceBlock).match(/\(([\d\s  ]+)\s*kr\s*exkl\.?\s*moms/i) || [])[1];
    const vat = Boolean(netText) || /moms(?:en)? (?:är )?avdragsgill|avdragsgill moms/i.test(plain(priceBlock));

    // Tabs: the warranty text is the dealer's offer ("upp till 36 månaders
    // garanti", often bought extra): only a warranty that comes with the car
    // ("ingår") counts; the text stays for the manager.
    const warrantyText = blocketTab(page, "warrantyTab");
    const included = warrantyText.match(/(\d+)\s*(?:månaders?|mån\.?)\s+garanti[^.]*\bingår|garanti[^.]*?(\d+)\s*(?:månader|mån\.?)[^.]*\bingår/i);
    const serviceText = blocketTab(page, "serviceHistoryTab") || blocketTab(page, "servicePlanFollowedTab");
    const serviceBook = (serviceText && !/inte följts|ej följts|saknas/i.test(serviceText)) || listed.some((name) => /servicehistorik|servicebok/i.test(name) && !/ingen|saknas/i.test(name));
    const sale = field("försäljningsform");

    return {
      source: "blocket",
      complete: true,
      readAt: new Date().toISOString(),
      url: url || String(product?.url || ""),
      title,
      // The portal's own make and model (offer-start.js prefers them to the title's).
      make,
      model,
      images: images.slice(0, 40),
      description: htmlToText(descriptionHtml),
      specs: {
        firstRegistration: blocketMonth(field("registreringsdatum", "datum i trafik", "i trafik", "första registrering")) || monthYear(field("modellår")),
        mileage,
        ccm: ccm >= 600 && ccm <= 8000 ? ccm : 0,
        powerKw: powers.kw,
        powerHp: powers.hp,
        fuel: blocketFuel(field("drivmedel", "bränsle")),
        gearbox: gearboxPl(field("växellåda")),
        drive: blocketDrive(field("drivhjul", "drivning")),
        body: blocketBody(bodyText),
        color: blocketColor(field("färg"), field("färgbeskrivning")),
        // The maker's name of the colour ("Vapour Grey Metallic"), not a repeat of "Svart".
        colorMaker: field("färgbeskrivning").toLowerCase() === field("färg").toLowerCase() ? "" : field("färgbeskrivning"),
        interior: blocketInterior(field("färg interiör", "klädsel", "inredning", "interiör"), features),
        doors: doors ? String(number(doors) || doors) : "",
        seats: number(field("säten", "antal säten", "antal platser")),
        owners: owners ? number(owners) : null,
        hu: nextInspection ? huPl(blocketMonth(nextInspection)) : "",
        huLast: field("senaste besiktningsdatum"),
        emission: euro ? `Euro ${euro[1].toLowerCase()}` : "",
        // "Svensksåld": sold new in Sweden.
        countryVersion: listed.some((name) => /svensksåld/i.test(name)) ? "wersja szwedzka" : "",
        trim: "",
        // The seller's own answer about known damage (private sellers, a few
        // dealers); "Ja" is the seller's word that the car is damaged, as
        // Kleinanzeigen's "Beschädigtes Fahrzeug" (flags.knownDamage says what).
        accidentFree: yes(damage) === false ? true : yes(damage) ? false : null,
        damaged: yes(damage) === true,
        serviceBook: serviceBook ? true : null,
      },
      features,
      seller: {
        type: dealer ? "dealer" : privateSeller ? "private" : "",
        // A private person's name is not on the page (nor on the client's sheet).
        name: dealer ? name.slice(0, 80) : "",
        contactName: "",
        city,
        zip,
        country,
        address: [street, [zip, city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        since,
        sinceText: since ? "na Blocket od {date}" : "",
        rating: null,
        badges,
        orgNumber: (page.match(/Orgnr:\s*([\d-]{6,})/) || [])[1] || "",
        page: dealerPage,
        stockUrl,
        stock: dealer && stock > 0 ? stock : null,
      },
      listedAt: "",
      portalPrice: null,
      vat: { deductible: vat, rate: vat ? 25 : 0, net: vat ? number(netText) || Math.round(price / 1.25) : 0, gross: price },
      currency: "SEK",
      flags: {
        damaged: yes(damage) === true,
        knownDamage: yes(damage) ? damage : "",
        repairs: yes(repairs) ? repairs : "",
        tuned: yes(answer(/trimmad/i)),
        // "Har bilen några skulder?": a loan still on the car (Swedish credit purchase).
        debt: yes(answer(/skulder/i)),
        leasing: /leasing/i.test(sale),
        exchangeRight: Boolean(blocketTab(page, "exchangePolicyTab")),
        homeDelivery: Boolean(blocketTab(page, "homeDeliveryTab")),
        warrantyText,
        serviceText,
        aiTags: [],
      },
      warranty: included ? `${included[1] || included[2]} mies.` : null,
      seals: [],
    };
  }

  async function readBlocket(url) {
    return parseBlocket(await proxiedPage(url, "Blocket"), url);
  }

  // ---- Marktplaats (NL), 2dehands / 2ememain (BE) -----------------------------
  // One platform, checked 2026-10-10 on dealer and private ads of the three
  // sites. The page carries the ad as window.__CONFIG__.listing: price
  // (priceInfo), seller (type, name, city, postcode of dealers, "active N
  // years"), gallery, stats.since (the day it was listed), carAttributes (the
  // car's data by topic: Dutch on marktplaats.nl and 2dehands.be, French on
  // 2ememain.be; the options as the portal names them), carDetails and
  // automotiveTrustIndicators (APK, NAP / Car-Pass, service history, first
  // owner, BOVAG warranty). The description is the page's own HTML
  // (data-collapsable="description").
  // What the page never says:
  // - VAT. The search knows it ("BTW verrekenbaar" / "TVA déductible", value
  //   13149): readMarktplaats asks the search for this ad's id and passes
  //   { vatDeductible }. Alone, the page only has the line dealers' feeds
  //   write in the description ("BTW/Marge: BTW", "TVA/marge: TVA déductible").
  // - The first registration month: "Bouwjaar" is a year; a car never
  //   imported was first registered on its "Datum registratie Nederland".
  // - The exact cm³: litres ("2.0"); dealers' feeds write "Motorinhoud:
  //   1.987 cc" in the description (as ParuVendu's "Cylindrée").
  // - Damage or accidents: no such field (the condition is only new / used).
  // - How many cars the dealer sells: the search by seller id (readMarktplaats).

  // "28 april 2029", "8 januari 2026", "28 avril 2029", "apr. 2025" → "04/2029".
  const NL_MONTHS = {
    januari: 1, jan: 1, februari: 2, feb: 2, maart: 3, mrt: 3, april: 4, apr: 4, mei: 5, juni: 6, jun: 6, juli: 7, jul: 7,
    augustus: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, december: 12, dec: 12,
    janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
  };
  function dutchMonthYear(value) {
    const match = String(value || "").toLowerCase().match(/([a-zéû]+)\.?\s+((?:19|20)\d{2})/);
    const month = match ? NL_MONTHS[match[1]] : 0;
    return month ? `${String(month).padStart(2, "0")}/${match[2]}` : "";
  }
  // Dutch colours in the words colorPl knows (it reads the French ones itself).
  // "Zilver of Grijs" / "Argent ou Gris" is one value on the portal: "szary",
  // as colorPl says for the French one.
  const NL_COLORS = [
    [/grijs|antraciet/i, "grey"], [/zilver/i, "silver"], [/zwart/i, "black"], [/\bwit\b/i, "white"], [/blauw/i, "blue"], [/rood/i, "red"],
    [/groen/i, "green"], [/bruin/i, "brown"], [/geel/i, "yellow"], [/oranje/i, "orange"], [/goud/i, "gold"], [/paars/i, "purple"],
  ];
  function marktplaatsColor(value, paint = "") {
    const text = String(value || "").trim();
    if (!text || /^(overige|autres?)\b/i.test(text)) return "";
    const dutch = NL_COLORS.find(([pattern]) => pattern.test(text));
    return colorPl(dutch ? dutch[1] : text, paint);
  }
  // A plug-in hybrid pays another excise: "Type hybride" says it when set;
  // otherwise the version ("PHEV", "Plug-in", "GTE", "e-Hybrid") or a battery
  // of 5 kWh and more (a full hybrid carries about 1 kWh) — checked on a C-HR
  // PHEV without "Type hybride" (13 kWh), 2026-10-10.
  function marktplaatsFuel(value, hybridType = "", version = "", battery = 0) {
    const text = String(value || "").trim();
    if (!text || /^(overige|autres)/i.test(text)) return "";
    if (/hybri/i.test(text) && (/plug|recharge/i.test(hybridType) || /plug-?in|phev|\bgte\b|\be-?hybrid|rechargeable/i.test(version) || battery >= 5)) return "hybryda plug-in";
    if (/waterstof|hydrog/i.test(text)) return "wodór";
    if (/gnc|aardgas/i.test(text)) return "benzyna + CNG";
    return fuelPl(text);
  }
  // "Automaat 6 versnellingen", "Handgeschakeld", "Automatique", "Boîte manuelle".
  function marktplaatsGearbox(value) {
    const text = String(value || "");
    if (/semi/i.test(text)) return "półautomatyczna";
    if (/automa/i.test(text)) return "automatyczna";
    if (/handgeschakeld|handbak|manu/i.test(text)) return "manualna";
    return gearboxPl(text);
  }
  // "Voorwiel", "Achterwiel", "4WD permanent", "Vierwielaandrijving", "Roues avant".
  function marktplaatsDrive(value) {
    const text = String(value || "");
    if (/vierwiel|4wd|awd|4x4|quatre roues|4 ?roues|int[ée]grale/i.test(text)) return "4x4";
    if (/voorwiel|avant/i.test(text)) return "przedni";
    if (/achterwiel|arri[eè]re|propulsion/i.test(text)) return "tylny";
    return text ? drivePl(text) : "";
  }
  // 2dehands (Dutch) says "Stadsauto" / "Monovolume" / "Berline" / "Break"
  // for Marktplaats' "Hatchback" / "MPV" / "Sedan" / "Stationwagon" (the same
  // search values); 2ememain "Berline" is the saloon too.
  const MP_BODIES = [
    [/stadsauto|hatchback/i, "hatchback"], [/mpv|monovolume|monospace|bestel|bedrijfswagen|utilitaire|minibus/i, "van"],
    [/stationwagon|break/i, "kombi"], [/sedan|berline/i, "sedan"], [/^(overige|autres?)\b/i, ""],
  ];
  function marktplaatsBody(value) {
    const found = MP_BODIES.find(([pattern]) => pattern.test(String(value || "")));
    return found ? found[1] : bodyPl(value);
  }
  // "Bekleding" / "Garniture" in the words interiorPl and attributeOptions read.
  // Leather with cloth or Alcantara is part leather, as mobile.de's "Teilleder".
  const MP_UPHOLSTERY = [
    [/kunst|synth/i, "Kunstleder"], [/(?:leder|cuir)\s+(?:en|et)\s+(?:stof|tissu|alcantara)/i, "Teilleder"], [/leder|cuir/i, "Leder"],
    [/alcantara/i, "Alcantara"], [/velours/i, "Velours"], [/stof|tissu/i, "Stoff"],
  ];
  const marktplaatsUpholstery = (value) => MP_UPHOLSTERY.find(([pattern]) => pattern.test(String(value || "")))?.[1] || "";
  // VAT in the description of dealers' feeds; a margin line or "geen btw" says no.
  const MP_VAT_YES = /btw\s*\/\s*marge\s*:\s*btw\b|tva\s*\/\s*marge\s*:\s*tva\b|btw[- ](?:verrekenbaar|aftrekbaar)|(?:verrekenbare|aftrekbare) btw|tva (?:d[ée]ductible|r[ée]cup[ée]rable)/i;
  const MP_VAT_NO = /btw\s*\/\s*marge\s*:\s*marge|tva\s*\/\s*marge\s*:\s*marge|\bmarge(?:auto|regeling)\b|geen btw|btw niet (?:verrekenbaar|aftrekbaar)|tva non (?:d[ée]ductible|r[ée]cup[ée]rable)|r[ée]gime de (?:la )?marge/i;
  // "17 jaar" / "4 ans" → the year the seller joined; "6 maanden" / "3 mois" /
  // "2 weken" → the month (offer-verdict counts the years from either).
  function marktplaatsSince(diff, years) {
    const match = String(diff || "").match(/(\d+)\s*(jaar|ans?|maand|mois|we[ek]|semaine|dag|jour)/i);
    const date = new Date();
    if (!match) return Number(years) >= 1 ? String(date.getFullYear() - Number(years)) : "";
    const count = Number(match[1]);
    // Months first: "maand" holds "an".
    if (/maand|mois/i.test(match[2])) date.setMonth(date.getMonth() - count);
    else if (/jaar|ans?$/i.test(match[2])) return String(date.getFullYear() - count);
    else date.setDate(date.getDate() - count * (/we|semaine/i.test(match[2]) ? 7 : 1));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  // extra: what the search said about this ad (readMarktplaats): { vatDeductible, stock }.
  function parseMarktplaats(html, url = "", extra = {}) {
    const page = String(html || "");
    const raw = page.match(/window\.__CONFIG__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    let listing = null;
    try {
      listing = raw ? JSON.parse(raw[1])?.listing : null;
    } catch {
      listing = null;
    }
    if (!listing?.itemId) throw new Error("Marktplaats: no ad data");
    const belgian = /2dehands|2ememain/i.test(url) || (!url && /^BE$/i.test(listing.seller?.location?.countryAbbreviation || ""));
    const vehicle = ldBlocks(page).find((item) => item?.["@type"] === "Vehicle") || {};
    // Every attribute of every group, by key (the first one given wins).
    const attributes = {};
    for (const group of listing.carAttributes?.groupedWithIcons || []) {
      for (const item of group.attributes || []) {
        if (item?.key && !(item.key in attributes)) attributes[item.key] = item;
      }
    }
    const value = (key) => {
      const item = attributes[key];
      return item && item.value !== null && item.value !== undefined ? String(item.value).trim() : "";
    };
    const options = (attributes.options?.values || []).map((item) => plain(item)).filter(Boolean);
    const details = listing.carDetails || {};
    const trust = listing.automotiveTrustIndicators || {};
    const marks = (trust.qualityMarks || []).map((mark) => String(mark?.type || ""));

    const make = makeName(details.brand || vehicle.brand?.name || "");
    const model = String(details.model || vehicle.model || "").trim();
    // "Uitvoering" often carries the dealer's selling words after "|".
    const trim = value("trim").split("|")[0].trim();
    const title = (trim ? `${make} ${model} ${trim}` : String(listing.title || `${make} ${model}`)).replace(/\s+/g, " ").trim().slice(0, 160);

    const descriptionHtml = (page.match(/data-collapsable="description"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div id="description-button-root"/) || [])[1]
      || (page.match(/data-collapsable="description"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "";
    const description = htmlToText(descriptionHtml) || plain(vehicle.description || "");
    const descriptionText = plain(descriptionHtml);

    // Photos: "//images.marktplaats.com/…?rule=ecg_mp_eps$_#.jpg", "#" = size;
    // 86 = 1024 px (the page's ld+json size; 87 = 1920 px is 4× heavier).
    // Both photo hosts answer with CORS * (the PDF can draw them).
    const gallery = (listing.gallery?.imageUrls || (listing.gallery?.media?.images || []).map((image) => image?.base))
      .map((image) => String(image || "").replace(/^\/\//, "https://").replace("$_#", "$_86"));
    const images = unique(gallery.length ? gallery : (vehicle.image || []).map(String))
      .filter((image) => /^https:\/\/images\.(marktplaats|2dehands)\.com\//.test(image)).slice(0, 40);

    const version = `${listing.title || ""} ${value("trim")}`;
    const fuel = marktplaatsFuel(value("fuel") || vehicle.vehicleEngine?.fuelType, value("hybridType"), version, number(value("batteryCapacity")));
    const powers = value("powerInKiloWatt") ? power(`${value("powerInKiloWatt")} kW`) : power(value("powerInHorsePower") ? `${value("powerInHorsePower")} PS` : "");
    // Litres ("2.0") unless the dealer's feed wrote the exact cm³ that agrees with them.
    const litres = number(value("cylinderCapacity"));
    const exact = number((descriptionText.match(/(?:motorinhoud|cilinderinhoud|cylindr[ée]e)\s*:?\s*(\d[\d.]{2,5})\s*(?:cc|cm3|cm³|ccm)\b/i) || [])[1]);
    const ccm = exact >= 600 && exact <= 8000 && (!litres || Math.abs(exact - litres * 1000) <= 150) ? exact : litres ? Math.round(litres * 1000) : 0;
    const drive = marktplaatsDrive(value("powerWheelDriver")) || (options.some((name) => /^4x4$/i.test(name)) ? "4x4" : "");
    const metallic = options.some((name) => /metallic|metaal|m[ée]tallis/i.test(name)) ? "metallic" : "";
    const material = marktplaatsUpholstery(value("upholstery"));
    const shade = marktplaatsColor(value("interiorColor"));
    const interior = material ? [interiorPl(material), shade].filter(Boolean).join(", ") : "";
    // A car never imported was first registered on its Dutch registration day.
    const year = value("constructionYear") || String(details.constructionYear || vehicle.vehicleModelDate || "");
    const registered = /^(ja|oui)$/i.test(value("isImported")) ? "" : dutchMonthYear(value("firstRecordInNl"));
    const firstRegistration = registered && registered.endsWith(year) ? registered : year;
    const owners = value("totalNumberOfOwners") ? number(value("totalNumberOfOwners")) : marks.includes("ONE_PREVIOUS_OWNER") ? 1 : null;
    const apk = dutchMonthYear(value("dateApk"));
    const hu = apk ? huPl(apk) : marks.includes("APK_UPON_DELIVERY") ? huPl("neu") : "";
    const serviceBook = value("serviceHistory") || marks.some((mark) => /DEALER_MAINTAINED|MAINTENANCE_BOOKLET/.test(mark)) ? true : null;
    const condition = value("condition");
    const isNew = /^(nieuw|neuf)$/i.test(condition);
    // NAP (NL) and Car-Pass (BE): the mileage history was checked.
    const napMark = marks.find((mark) => /^NAP_CHECK/.test(mark)) || "";
    const mileageLogical = /ILLOGICAL|NOT_LOGICAL/.test(napMark) ? false : /LOGICAL/.test(napMark) || details.hasNapStatus === true ? true : null;
    const warrantyData = (trust.warranties || [])[0];
    const warrantyMonths = Number(warrantyData?.validity) || number((((listing.highlights || []).map((item) => item?.key).find((text) => /garantie/i.test(text || "")) || "").match(/(\d+)\s*(?:maand|mois)/i) || [])[1]);

    const sellerData = listing.seller || {};
    const location = sellerData.location || {};
    const sellerType = String(sellerData.sellerType || (listing.customDimensions || []).find((item) => item?.name === "SellerType")?.value || "");
    const dealer = Boolean(sellerType) && !/CONSUMER|PRIVATE/i.test(sellerType);
    const privateSeller = /CONSUMER|PRIVATE/i.test(sellerType);
    const host = (String(url).match(/^https:\/\/[^/]+/) || [])[0] || (belgian ? "https://www.2dehands.be" : "https://www.marktplaats.nl");
    const since = marktplaatsSince(sellerData.activeSinceDiff, sellerData.activeYears);
    const website = dealer && sellerData.sellerWebsiteDisplayUrl && /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(sellerData.sellerWebsiteDisplayUrl) ? `https://${sellerData.sellerWebsiteDisplayUrl}` : "";
    const zip = String(location.postcode || "").replace(/\s+/g, "");
    const city = String(location.cityName || "");

    const priceType = String(listing.priceInfo?.priceType || "");
    const price = Math.round(Number(listing.priceInfo?.priceCents) / 100) || 0;
    // VAT: the search's answer when asked; a private person never; else the feed's line.
    const deductible = typeof extra.vatDeductible === "boolean" ? extra.vatDeductible
      : privateSeller ? false : !MP_VAT_NO.test(descriptionText) && MP_VAT_YES.test(descriptionText);
    const vatBasis = typeof extra.vatDeductible === "boolean" ? "portal" : !privateSeller && (MP_VAT_YES.test(descriptionText) || MP_VAT_NO.test(descriptionText)) ? "description" : "";

    return {
      source: belgian ? "dehands" : "marktplaats",
      complete: true,
      readAt: new Date().toISOString(),
      url,
      title,
      make,
      model,
      images,
      description,
      specs: {
        firstRegistration,
        mileage: number(value("mileage")) || Number(vehicle.mileageFromOdometer?.value) || 0,
        ccm,
        powerKw: powers.kw,
        powerHp: powers.hp,
        fuel,
        gearbox: marktplaatsGearbox(value("transmission") || vehicle.vehicleTransmission),
        gears: number((value("transmission").match(/(\d+)\s*(?:versnellingen|vitesses|rapports)/i) || [])[1]),
        drive,
        body: marktplaatsBody(value("vehicleType") || vehicle.bodyType),
        color: marktplaatsColor(value("color") || vehicle.color, metallic),
        colorMaker: "",
        interior,
        doors: value("numberOfDoors") || String(vehicle.numberOfDoors || ""),
        seats: number(value("numberOfSeats")) || Number(vehicle.vehicleSeatingCapacity) || 0,
        owners,
        hu,
        emission: value("euronormBE"),
        countryVersion: "",
        trim,
        accidentFree: null,
        damaged: false,
        serviceBook,
      },
      // The upholstery and the drive first: keyOptions takes the first name that
      // matches, and "Teilleder" from the upholstery is more exact than the
      // "Lederen bekleding" box.
      features: unique([...attributeOptions({}, { drive, interior: material }), ...options]),
      seller: {
        type: dealer ? "dealer" : privateSeller ? "private" : "",
        // A private person's name stays off the client's sheet.
        name: dealer ? plain(sellerData.name).slice(0, 80) : "",
        contactName: privateSeller ? plain(sellerData.name).slice(0, 80) : "",
        city,
        zip,
        country: String(location.countryAbbreviation || (belgian ? "BE" : "NL")).toUpperCase(),
        address: [zip, city].filter(Boolean).join(" "),
        since,
        sinceText: since ? `na ${belgian ? "2dehands" : "Marktplaats"} od {date}` : "",
        rating: null,
        customerId: sellerData.id ? String(sellerData.id) : "",
        page: sellerData.allAdsUrl ? `${host}${sellerData.allAdsUrl}` : "",
        website,
        stock: dealer && Number(extra.stock) > 0 ? Number(extra.stock) : null,
      },
      listedAt: listing.stats?.since || "",
      portalPrice: null,
      vat: { deductible, rate: deductible ? 21 : 0, net: deductible ? Math.round(price / 1.21) : 0, gross: price, basis: vatBasis },
      flags: {
        damaged: false,
        // "Bieden vanaf" (MIN_BID) and "Bieden" (FAST_BID): the seller takes offers.
        negotiable: /BID/i.test(priceType),
        priceType,
        isNew,
        imported: /^(ja|oui)$/i.test(value("isImported")) ? true : /^(nee|non)$/i.test(value("isImported")) ? false : null,
        mileageLogical,
        carPassUrl: /^https:\/\//.test(details.carPassUrl || "") ? details.carPassUrl : "",
        lease: listing.flags?.isLeaseCar === true,
        warrantyType: warrantyData?.type ? String(warrantyData.type) : "",
        aiTags: [],
      },
      warranty: warrantyMonths ? `${warrantyMonths} mies.` : null,
      seals: [],
    };
  }

  // The page, then two questions to the search (both optional): is VAT
  // deductible (the ad found under "BTW verrekenbaar"; not found there but
  // found without it = no), and how many cars the dealer sells.
  async function proxiedJson(url) {
    const response = await fetch(`${proxy()}${url}`, { headers: { "x-respond-with": "text" } });
    if (!response.ok) throw new Error(String(response.status));
    const text = (await response.text()).trim();
    // r.jina.ai wraps the JSON in a page.
    return JSON.parse(text.startsWith("{") ? text : (typeof DOMParser !== "undefined" ? new DOMParser().parseFromString(text, "text/html").body.textContent : plain(text)));
  }

  async function readMarktplaats(url) {
    const portal = /2dehands|2ememain/i.test(url) ? "2dehands" : "Marktplaats";
    const html = await proxiedPage(url, portal);
    const ad = parseMarktplaats(html, url);
    if (ad.seller.type !== "dealer") return ad;
    const host = (String(url).match(/^https:\/\/[^/]+/) || [])[0];
    const id = (String(url).match(/\/(m\d+)(?:-|$)/) || [])[1];
    const search = `${host}/lrp/api/search?l1CategoryId=91&limit=1&offset=0`;
    const [vatDeductible, stock] = await Promise.all([
      (async () => {
        if (!id) return null;
        const found = (data) => (data?.listings || []).some((item) => item?.itemId === id);
        if (found(await proxiedJson(`${search}&attributesById[]=13149&query=${id}`))) return true;
        return found(await proxiedJson(`${search}&query=${id}`)) ? false : null;
      })().catch(() => null),
      (async () => (ad.seller.customerId ? Number((await proxiedJson(`${search}&sellerIds[]=${ad.seller.customerId}`))?.totalResultCount) || null : null))().catch(() => null),
    ]);
    return vatDeductible === null && !stock ? ad : parseMarktplaats(html, url, { vatDeductible: vatDeductible ?? undefined, stock });
  }

  // The portals an ad can be read from for the offer.
  const SOURCES = ["mobile", "autoscout", "autoscoutfr", "paruvendu", "kleinanzeigen", "marktplaats", "dehands", "otomoto", "blocket", "avby"];
  async function read(source, url, { importer = "" } = {}) {
    if (source === "mobile") return readMobile(url, importer);
    if (source === "autoscout" || source === "autoscoutfr") return readAutoscout(url, source);
    if (source === "paruvendu") return readParuvendu(url);
    if (source === "kleinanzeigen") return readKleinanzeigen(url);
    if (source === "marktplaats" || source === "dehands") return readMarktplaats(url);
    if (source === "otomoto") return readOtomoto(url);
    if (source === "blocket") return readBlocket(url);
    if (source === "avby") return readAvby(url);
    throw new Error(`no reader for ${source}`);
  }

  const api = { SOURCES, read, parseParuvendu, parseKleinanzeigen, parseMarktplaats, parseOtomoto, parseBlocket, parseAvby, htmlToText, fuelPl, gearboxPl, drivePl, bodyPl, colorPl, huPl };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_AD = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_AD = api;
})();
