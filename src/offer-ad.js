/* AUTOGOOD "Oferta dla klienta" (B71): one ad read for the offer, in one
 * shape whatever the portal (docs/OFFER-PAGE.md §3).
 *
 * - mobile.de: the importer (server/mobilede-import.mjs, the user's Mac)
 *   /mobilede/import → its "ad" (photos, attributes, equipment, seller with
 *   rating, dates, flags, description); /mobilede/dealer → cars on sale.
 *   An importer older than 2026-10-05 has no "ad": the basic fields then.
 * - AutoScout24: the ad page through the reader proxy (r.jina.ai, queued by
 *   market-proxy-queue.js) → __NEXT_DATA__ listingDetails; the dealer's stock
 *   page → number of cars.
 * Values are put in Polish here (fuel, gearbox, body, colour…); equipment
 * stays as the portal names it (offer-equipment.js translates it).
 *
 * window.AUTOGOOD_OFFER_AD.read(source, url, { importer }) → ad
 */
(() => {
  const proxy = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const number = (value) => {
    const match = String(value ?? "").replace(/[.\s  ](?=\d{3}\b)/g, "").match(/\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(",", ".")) : 0;
  };

  // HTML of a seller's description → plain text with line breaks. Parsed,
  // never put into the page as HTML.
  function htmlToText(html) {
    if (!html) return "";
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

  // ---- German (and AutoScout24's) values in Polish --------------------------
  const COLORS = [
    [/schwarz|black/i, "czarny"], [/wei(ß|ss)|white/i, "biały"], [/grau|grey|gray|anthrazit/i, "szary"],
    [/silber|silver/i, "srebrny"], [/blau|blue/i, "niebieski"], [/rot|red/i, "czerwony"], [/grün|green/i, "zielony"],
    [/braun|brown/i, "brązowy"], [/beige/i, "beżowy"], [/gelb|yellow/i, "żółty"], [/orange/i, "pomarańczowy"],
    [/gold/i, "złoty"], [/violett|lila|purple/i, "fioletowy"], [/bronze/i, "brązowy"],
  ];
  function colorPl(value, paint = "") {
    const text = String(value || "");
    if (!text) return "";
    const found = COLORS.find(([pattern]) => pattern.test(text));
    const metallic = /metal/i.test(`${text} ${paint}`) ? " metalik" : /perl|pearl/i.test(`${text} ${paint}`) ? " perłowy" : "";
    return found ? `${found[1]}${metallic}` : text;
  }
  function fuelPl(value) {
    const text = String(value || "").toLowerCase();
    if (!text) return "";
    if (/plug/.test(text)) return "hybryda plug-in";
    if (/hybrid|elektro\/(benzin|diesel)|(benzin|diesel)\/elektro/.test(text)) return /diesel/.test(text) ? "hybryda (diesel)" : "hybryda (benzyna)";
    if (/elektr/.test(text)) return "elektryczny";
    if (/diesel/.test(text)) return "diesel";
    if (/lpg|autogas/.test(text)) return "benzyna + LPG";
    if (/cng|erdgas/.test(text)) return "benzyna + CNG";
    if (/benzin|super|petrol/.test(text)) return "benzyna";
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
    if (/allrad|awd|4x4|four|quattro|xdrive|4motion|4matic/.test(text)) return "4x4";
    if (/front|fwd/.test(text)) return "przedni";
    if (/heck|rear|rwd/.test(text)) return "tylny";
    return String(value);
  }
  const BODIES = [
    [/suv|gel(ä|a)nde|offroad|off-road|pickup/i, "SUV"], [/kombi|estate|variant|touring/i, "kombi"],
    [/limousine|sedan/i, "sedan"], [/kleinwagen|small/i, "hatchback"], [/cabrio|roadster|convertible/i, "kabriolet"],
    [/coup(é|e)|sportwagen|sports/i, "coupé"], [/van|minibus|bus/i, "van"],
  ];
  const bodyPl = (value) => BODIES.find(([pattern]) => pattern.test(String(value || "")))?.[1] || (value && !/andere|other/i.test(value) ? String(value) : "");
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

  async function readAutoscout(url) {
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
      source: "autoscout",
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
      warranty: details.warrantyExists ? (details.warranty ? String(details.warranty).replace(/Monate?/i, "mies.") : "tak") : null,
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

  async function read(source, url, { importer = "" } = {}) {
    if (source === "mobile") return readMobile(url, importer);
    if (source === "autoscout") return readAutoscout(url);
    throw new Error(`no reader for ${source}`);
  }

  window.AUTOGOOD_OFFER_AD = { read, htmlToText, fuelPl, gearboxPl, drivePl, bodyPl, colorPl, huPl };
})();
