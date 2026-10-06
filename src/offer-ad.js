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
      vat: ad?.price ? { rate: ad.price.vat || 0, net: Math.round(ad.price.net || 0), gross: ad.price.gross || 0, deductible: Boolean(ad.price.vat) } : (data.carNettoEur ? { net: data.carNettoEur, deductible: true } : null),
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
    januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, dezember: 12,
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

  // The portals an ad can be read from for the offer.
  const SOURCES = ["mobile", "autoscout", "autoscoutfr", "paruvendu", "kleinanzeigen"];
  async function read(source, url, { importer = "" } = {}) {
    if (source === "mobile") return readMobile(url, importer);
    if (source === "autoscout" || source === "autoscoutfr") return readAutoscout(url, source);
    if (source === "paruvendu") return readParuvendu(url);
    if (source === "kleinanzeigen") return readKleinanzeigen(url);
    throw new Error(`no reader for ${source}`);
  }

  const api = { SOURCES, read, parseParuvendu, parseKleinanzeigen, htmlToText, fuelPl, gearboxPl, drivePl, bodyPl, colorPl, huPl };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_AD = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_AD = api;
})();
