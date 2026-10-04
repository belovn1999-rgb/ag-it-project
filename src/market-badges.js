/* One badge for a market, used everywhere on mobile.html.
 * Rule (agreed 2026-09-28): the portal's LOGO where the user acts on that
 * site (search, open an ad, pick a market); the country's FLAG + NAME where
 * markets and prices are compared (statistics, legend, price history,
 * report, offer table, favourites).
 * Flags are inline SVG: emoji flags show as letters on Windows and can
 * vanish from the report image.
 */
(() => {
  const MARKET_COUNTRY = { otomoto: "PL", mobile: "DE", blocket: "SE", avby: "BY", autoscout: "DE" };
  const COUNTRY_NAMES = {
    pl: { BY: "Białoruś", PL: "Polska", DE: "Niemcy", SE: "Szwecja", AT: "Austria", BE: "Belgia", NL: "Holandia", FR: "Francja", IT: "Włochy", ES: "Hiszpania", CZ: "Czechy", DK: "Dania", LU: "Luksemburg", CH: "Szwajcaria" },
    ru: { BY: "Беларусь", PL: "Польша", DE: "Германия", SE: "Швеция", AT: "Австрия", BE: "Бельгия", NL: "Нидерланды", FR: "Франция", IT: "Италия", ES: "Испания", CZ: "Чехия", DK: "Дания", LU: "Люксембург", CH: "Швейцария" },
  };
  const stripes = (colors, vertical = false) => colors.map((color, index) => (vertical
    ? `<rect x="${(index * 12) / colors.length}" y="0" width="${12 / colors.length}" height="8" fill="${color}"/>`
    : `<rect x="0" y="${(index * 8) / colors.length}" width="12" height="${8 / colors.length}" fill="${color}"/>`)).join("");
  const FLAGS = {
    DE: stripes(["#000", "#dd0000", "#ffce00"]),
    PL: stripes(["#fff", "#dc143c"]),
    AT: stripes(["#ed2939", "#fff", "#ed2939"]),
    NL: stripes(["#ae1c28", "#fff", "#21468b"]),
    LU: stripes(["#ed2939", "#fff", "#00a1de"]),
    BE: stripes(["#000", "#fdda24", "#ef3340"], true),
    FR: stripes(["#0055a4", "#fff", "#ef4135"], true),
    IT: stripes(["#009246", "#fff", "#ce2b37"], true),
    ES: '<rect width="12" height="8" fill="#aa151b"/><rect y="2" width="12" height="4" fill="#f1bf00"/>',
    SE: '<rect width="12" height="8" fill="#006aa7"/><rect x="3.5" width="1.6" height="8" fill="#fecc00"/><rect y="3.2" width="12" height="1.6" fill="#fecc00"/>',
    DK: '<rect width="12" height="8" fill="#c8102e"/><rect x="3.5" width="1.4" height="8" fill="#fff"/><rect y="3.3" width="12" height="1.4" fill="#fff"/>',
    CH: '<rect width="12" height="8" fill="#d52b1e"/><rect x="5.2" y="1.8" width="1.6" height="4.4" fill="#fff"/><rect x="3.8" y="3.2" width="4.4" height="1.6" fill="#fff"/>',
    // Belarus: red over green, the white ornament band at the hoist.
    BY: '<rect width="12" height="8" fill="#c8313e"/><rect y="5.3" width="12" height="2.7" fill="#4aa657"/><rect width="1.6" height="8" fill="#fff"/>',
    // Currencies in the rates line at the top (mobile-rates.js): EUR, USD.
    EU: `<rect width="12" height="8" fill="#003399"/>${Array.from({ length: 12 }, (_, index) => {
      const angle = (index * Math.PI) / 6;
      return `<circle cx="${(6 + 2.6 * Math.sin(angle)).toFixed(2)}" cy="${(4 - 2.6 * Math.cos(angle)).toFixed(2)}" r="0.42" fill="#ffcc00"/>`;
    }).join("")}`,
    US: `${Array.from({ length: 7 }, (_, index) => `<rect y="${((index * 8) / 7).toFixed(3)}" width="12" height="${(8 / 7).toFixed(3)}" fill="${index % 2 ? "#fff" : "#b22234"}"/>`).join("")}<rect width="5.2" height="4.3" fill="#3c3b6e"/>`,
    CZ: '<rect width="12" height="4" fill="#fff"/><rect y="4" width="12" height="4" fill="#d7141a"/><path d="M0 0 6 4 0 8z" fill="#11457e"/>',
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function flagSvg(country) {
    const code = String(country || "").toUpperCase();
    const body = FLAGS[code];
    if (!body) return "";
    return `<svg class="agFlag" viewBox="0 0 12 8" width="16" height="11" aria-hidden="true">${body}</svg>`;
  }

  function countryName(country) {
    const code = String(country || "").toUpperCase();
    return COUNTRY_NAMES[lang()][code] || code;
  }

  // variant "flag": flag + country name; "flagOnly": flag with the name as tooltip.
  function marketBadge(source, variant = "flag") {
    const country = MARKET_COUNTRY[source] || source;
    // Two portals of the same countries: AutoScout24 is named, mobile.de
    // keeps the country (it was the only one there before).
    const name = source === "autoscout" ? "AutoScout24" : countryName(country);
    if (variant === "flagOnly") return `<span class="agMarketBadge isFlagOnly" title="${escape(name)}">${flagSvg(country)}<span class="agVisuallyHidden">${escape(name)}</span></span>`;
    return `<span class="agMarketBadge">${flagSvg(country)}<span>${escape(name)}</span></span>`;
  }

  // The seller-country filter ("Kraj") shows each country's flag.
  function decorateCountryFilter() {
    document.querySelectorAll("[data-mobile-country]").forEach((input) => {
      const label = input.closest("label");
      if (!label || label.querySelector(".agFlag")) return;
      const flag = flagSvg(input.value);
      if (flag) input.insertAdjacentHTML("afterend", ` ${flag}`);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decorateCountryFilter);
  else decorateCountryFilter();

  window.AUTOGOOD_MARKET_COUNTRY = MARKET_COUNTRY;
  window.AUTOGOOD_FLAG = flagSvg;
  window.AUTOGOOD_COUNTRY_NAME = countryName;
  window.AUTOGOOD_MARKET_BADGE = marketBadge;
})();
