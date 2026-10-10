/* AUTOGOOD: the engine class for the Polish excise, one rule for every page
 * (mobile.html, oferta.html, oferty.html, the calculator pop-up).
 * 0 = EL / PHEV <=2000 cm³ (0 %), 1 = PHEV / HEV >2000 cm³ (9,3 %),
 * 2 = HEV <=2000 cm³ (1,55 %), 3 = combustion <=2000 cm³ (3,1 %),
 * 4 = combustion >2000 cm³ (18,6 %). Tests: scripts/engine-class.test.mjs.
 * Plain globals (no module): loaded before src/mobile.js and
 * src/turnkey-estimate.js.
 */
// Plug-in hybrids named only by the model (audit 2026-10-10: most portals
// write a plug-in as "Hybrid"): VW/Cupra/Porsche eHybrid, VW GTE, Audi
// "TFSI e", Skoda iV, BMW 330e / 225xe / xDrive30e / iPerformance, Mercedes
// "300 e" / "300 de" / EQ Power, Volvo Recharge / Twin Engine, Jeep 4xe,
// Land Rover P400e, Mini SE ALL4, DS E-Tense. A suffix "e-" (Peugeot e-HDi,
// e-THP) is not one.
const PLUGIN_HYBRID_PATTERN = /plug|\bphev\b|laddhybrid|\be-?hybrid\b|\bgte\b|\bt?fsi\s?e(?![\w])|\btsi\s+iv\b|\b(?:octavia|superb|kodiaq)\s+(?:combi\s+|rs\s+|sportline\s+)?iv\b|\b[1-8]\d{2}\s?(?:l?x?e|de)(?![\w-])|\bxdrive\s?\d{2}e\b|iperformance|eq[\s-]?power|\brecharge\b|\btwin[\s-]?engine\b|\b4xe\b|\bp\d{3}e\b|\bse\s+all4\b|\be-tense\b/;
function isPluginHybridText(text) {
  return PLUGIN_HYBRID_PATTERN.test(String(text || "").toLowerCase());
}

// Engine size written in a name: "2.0 TDI", "1,5 T-GDI", "Diesel 1.9".
function litresInTitle(text) {
  const match = String(text || "").match(/(?:^|[\s(/])([0-7])[.,]([0-9])(?=$|[\s)/a-z-])/i);
  if (!match) return null;
  const ccm = Number(match[1]) * 1000 + Number(match[2]) * 100;
  return ccm >= 600 && ccm <= 7000 ? ccm : null;
}

function classifyEngineType(fuel, displacementCcm) {
  // Blocket "Hybrid gas" is a gas (CNG) car, no hybrid.
  const normalized = String(fuel || "").toLowerCase().replace(/hybrid\s*gas|gas\s*hybrid/g, "gas");
  const isOver2000 = (Number(displacementCcm) || 0) > 2000;
  const isPlugIn = PLUGIN_HYBRID_PATTERN.test(normalized);
  const burnsFuel = /benzin|benzyna|bensin|petrol|diesel|\b(?:tdi|tsi|tfsi|crdi|gdi|hdi|dci)\b/.test(normalized);
  // "Elektro/Benzin" (AutoScout24) is a hybrid, an "Elektro-Paket" in a
  // diesel's title is not an electric car.
  // Marktplaats "Elektrisch", ParuVendu / 2ememain "Électrique" too.
  const isElectric = /elect|[eé]lectr|elektro|elektri|elektry|\bbev\b/.test(normalized) && !burnsFuel;
  // Any hybrid, mild ones too (MHEV, 48V, eTSI, EQ Boost), takes the reduced
  // excise (owner, 2026-10-03). "\bhev" keeps "Chevrolet" out.
  const isHybrid = /hybrid|hybryd|\b[mp]?hev\b|mild|\b48\s?v\b|\be-?tsi\b|eq[\s-]?boost|\bshvs\b/.test(normalized)
    || /(elektro|electric)\s*\/\s*(benzin|diesel|petrol)|(benzin|diesel|petrol)\s*\/\s*(elektro|electric)/.test(normalized);
  if (isElectric && !isHybrid) return 0;
  if (isPlugIn) return isOver2000 ? 1 : 0;
  if (isHybrid) return isOver2000 ? 1 : 2;
  return isOver2000 ? 4 : 3;
}
