/* AUTOGOOD offer: the calculators page itself (calculators.html?embed=offer)
 * counts the offer's "na gotowo" (owner 2026-10-11). It runs out of sight in
 * the offer page (offer.js): the ad's price, the excise class, the tariff and
 * the manager's settings from the panel on the right (commission, engine,
 * transport, inspection, registration, the German firm's commission, own
 * costs) go in by its address; its result lines, total, rate and the shares
 * of the cost (the coloured bar) come back as data for the page and the PDF.
 *
 * window.AUTOGOOD_OFFER_CALC: TABS, url(input), read(doc), shares(doc).
 */
(() => {
  // The calculator's tabs for the three ways of buying (src/main.jsx).
  const TABS = { direct: 0, vat: 3, margin: 4 };

  // input: { method, lang, gross, net (EUR), engine, transport, inspection
  // (PLN net), url, extra: { label, amount, currency, vat } — the dealer's
  // delivery fee from the ad, extras: [{ label, amount, currency, vat }] — the
  // manager's own costs, registration: true, commission: "standard" |
  // "financed" | "direct" (VAT 23% only), germanCommission (EUR, through
  // AUTOGOOD only), rate, car (the car's price typed before), discount }
  function url({ method = "direct", lang = "pl", gross = 0, net = 0, engine = 3, transport = 0, inspection = 0, url: adUrl = "", extra = null, extras = [], registration = false, commission = "standard", germanCommission = 0, rate = 0, car = "", discount = "" } = {}) {
    const tab = TABS[method] ?? 0;
    const params = new URLSearchParams({ embed: "offer", tab: String(tab), lang: lang === "ru" ? "ru" : "pl", car: String(Math.round(tab === 3 ? net : gross)), engine: String(engine) });
    if (String(car || "").trim()) params.set("car", String(car).trim());
    params.set("transport", String(Math.max(0, Math.round(Number(transport) || 0))));
    params.set("inspection", String(Math.max(0, Math.round(Number(inspection) || 0))));
    if (String(discount || "").trim()) params.set("discount", String(discount).trim());
    if (Number(rate) > 0) params.set("rate", String(rate));
    if (registration) params.set("registration", "1");
    if (tab > 0 && commission === "financed") params.set("financed", "1");
    if (tab === 3 && commission === "direct") params.set("direct", "1");
    if (tab > 0 && Number(germanCommission) > 0) params.set("germanCommission", String(germanCommission));
    if (adUrl) params.set("mobileUrl", adUrl);
    if (extra?.amount > 0 && extra.label) {
      params.set("extraLabel", extra.label);
      params.set("extraAmount", String(extra.amount));
      params.set("extraCurrency", extra.currency === "PLN" ? "PLN" : "EUR");
      if (extra.vat) params.set("extraVat", "1");
    }
    const own = (extras || []).filter((item) => item && Number(item.amount) > 0 && String(item.label || "").trim())
      .map((item) => ({ label: String(item.label).trim(), amount: Number(item.amount), currency: item.currency === "EUR" ? "EUR" : "PLN", vat: Boolean(item.vat) }));
    if (own.length) params.set("extras", JSON.stringify(own));
    return `./calculators.html?${params.toString()}`;
  }

  const amountOf = (text) => Number(String(text || "").replace(/[^\d,-]/g, "").replace(",", ".")) || 0;
  const text = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();
  // The result lines, the total and the rate as the calculator shows them.
  function read(doc) {
    if (!doc) throw new Error("kalkulator nie jest gotowy");
    const rows = [...doc.querySelectorAll(".resultsList .resultLine")].map((line) => ({
      label: text(line.querySelector(".resultLineLabel")),
      sub: [text(line.querySelector(".resultLinePrefix")).replace(/\s*=\s*$/, ""), text(line.querySelector(".resultLineSub"))].filter(Boolean).join(" · "),
      value: amountOf(text(line.querySelector(".resultLineAmount"))),
    })).filter((row) => row.label && row.value);
    const total = amountOf(text(doc.querySelector(".totalBarValue")));
    if (!rows.length || !total) throw new Error("kalkulator jeszcze liczy — spróbuj za chwilę");
    const rate = Number(String(text(doc.querySelector(".totalBarRate")).match(/(\d+[.,]\d+)/)?.[1] || "").replace(",", ".")) || 0;
    return { rows, total, rate };
  }

  // The coloured bar under the result: what the price is made of (owner
  // 2026-10-11: on the page and in the PDF) — label, colour and share.
  function shares(doc) {
    return [...(doc?.querySelectorAll(".marginAuctionBreakdownItem") || [])].map((item) => ({
      label: text(item.querySelector("span")),
      color: (item.style.getPropertyValue("--breakdown-color") || "").trim() || "#64748b",
      share: Number(text(item.querySelector("strong")).replace("%", "").replace(",", ".")) || 0,
    })).filter((item) => item.label && item.share > 0);
  }

  window.AUTOGOOD_OFFER_CALC = { TABS, url, read, shares };
})();
