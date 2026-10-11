/* AUTOGOOD offer: the calculators page itself (calculators.html?embed=1) as
 * the offer's calculation (owner 2026-10-11). Program 06 shows it under the
 * way of buying, with the ad's price, the excise class and the tariff filled
 * in; the manager corrects transport and inspection there; its total becomes
 * the offer's "na gotowo" sum, and with "full calculation" its result panel
 * goes onto page 2 as a picture, one to one as the calculator draws it.
 * The offer page's "Kalkulacja" window uses the same reading.
 *
 * window.AUTOGOOD_OFFER_CALC: TABS, url(input), read(doc), capture(frame).
 */
(() => {
  // The calculator's tabs for the three ways of buying (src/main.jsx).
  const TABS = { direct: 0, vat: 3, margin: 4 };

  // input: { method, lang, gross, net (EUR), engine, transport, inspection, url }
  function url({ method = "direct", lang = "pl", gross = 0, net = 0, engine = 3, transport = 0, inspection = 0, url: adUrl = "" } = {}) {
    const tab = TABS[method] ?? 0;
    const params = new URLSearchParams({ embed: "1", tab: String(tab), lang: lang === "ru" ? "ru" : "pl", car: String(Math.round(tab === 3 ? net : gross)), engine: String(engine) });
    if (transport) params.set("transport", String(Math.round(transport)));
    if (inspection) params.set("inspection", String(Math.round(inspection)));
    if (adUrl) params.set("mobileUrl", adUrl);
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

  // The result panel as a JPEG data URL, drawn inside the calculator's own
  // page (its fonts and styles), so it looks one to one.
  async function capture(frame) {
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return "";
    const panel = [...doc.querySelectorAll("section.panelCalc")].find((section) => section.querySelector(".totalBar"));
    if (!panel) return "";
    if (!win.htmlToImage) {
      await new Promise((resolve) => {
        const script = doc.createElement("script");
        script.src = new URL("./vendor/html-to-image-exact.js?v=1.11.11-exact", window.location.href).toString();
        script.onload = resolve;
        script.onerror = resolve;
        doc.head.append(script);
      });
    }
    if (!win.htmlToImage) return "";
    try {
      await doc.fonts?.ready;
      return await win.htmlToImage.toJpeg(panel, {
        pixelRatio: 2,
        quality: 0.9,
        backgroundColor: "#ffffff",
      });
    } catch {
      return "";
    }
  }

  window.AUTOGOOD_OFFER_CALC = { TABS, url, read, capture };
})();
