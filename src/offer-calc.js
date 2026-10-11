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

  // input: { method, lang, gross, net (EUR), engine, transport, inspection, url,
  // extra: { label, amount, currency, vat } — the dealer's delivery fee as the
  // calculator's own line, offer: true — the page-06 look (embed=offer: no
  // print / screenshot / save, no second link field; owner 2026-10-11) }
  function url({ method = "direct", lang = "pl", gross = 0, net = 0, engine = 3, transport = 0, inspection = 0, url: adUrl = "", extra = null, offer = false } = {}) {
    const tab = TABS[method] ?? 0;
    const params = new URLSearchParams({ embed: offer ? "offer" : "1", tab: String(tab), lang: lang === "ru" ? "ru" : "pl", car: String(Math.round(tab === 3 ? net : gross)), engine: String(engine) });
    if (transport) params.set("transport", String(Math.round(transport)));
    if (inspection) params.set("inspection", String(Math.round(inspection)));
    if (adUrl) params.set("mobileUrl", adUrl);
    if (extra?.amount > 0 && extra.label) {
      params.set("extraLabel", extra.label);
      params.set("extraAmount", String(extra.amount));
      params.set("extraCurrency", extra.currency === "PLN" ? "PLN" : "EUR");
      if (extra.vat) params.set("extraVat", "1");
    }
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
  // The picture for the client (owner 2026-10-11): every thousand spaced
  // ("1 300"), a decimal comma, in a Russian offer Russian words only, no
  // share labels over the bar (they overlapped and summed car and taxes),
  // the legend readable in print.
  const RU_WORDS = [[/\bbrutto\b/g, "брутто"], [/\bnetto\b/g, "нетто"], [/\bVAT mar(?:ż|z)a\b/gi, "НДС-маржа"], [/\bVAT\b/g, "НДС"]];
  // Changed in place for the moment of the picture and put back after (a
  // copy would lose the calculator's layout rules); returns the undo.
  function forClient(panel, doc, lang) {
    const undo = [];
    const walker = doc.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const before = node.nodeValue;
      let text = before.replace(/(?<![\d.,])(\d)(\d{3})(?!\d)/g, "$1\u00a0$2").replace(/(\d)\.(\d{1,2})(?=\s*(?:PLN|EUR|zł|€|%))/g, "$1,$2");
      if (lang === "ru") RU_WORDS.forEach(([pattern, word]) => { text = text.replace(pattern, word); });
      if (text !== before) {
        node.nodeValue = text;
        undo.push(() => { node.nodeValue = before; });
      }
    });
    // The offer writes its own heading over the picture ("Расчёт — …"), as
    // its other cards (owner 2026-10-11): no calculator title or logo here.
    panel.querySelectorAll(".marginAuctionBreakdownSummary, .calcEyebrow, .resultCornerLogo").forEach((node) => {
      const display = node.style.display;
      node.style.display = "none";
      undo.push(() => { node.style.display = display; });
    });
    panel.querySelectorAll(".marginAuctionBreakdownLegend").forEach((node) => {
      const css = node.style.cssText;
      node.style.fontSize = "14px";
      node.style.rowGap = "6px";
      undo.push(() => { node.style.cssText = css; });
    });
    return () => undo.reverse().forEach((step) => step());
  }

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
    const lang = new URLSearchParams(win.location.search).get("lang") === "ru" ? "ru" : "pl";
    let restore = () => {};
    // The picture at one width, whatever the window (940 px: two columns, the
    // result panel narrow enough to fill page 2's column, owner 2026-10-11): a
    // narrow frame laid it out in one tall column (a 292 px strip that pushed
    // page 2 off the A4, 2026-10-11).
    const width = frame.style.width;
    const height = frame.style.height;
    frame.style.width = "940px";
    frame.style.height = `${Math.max(frame.offsetHeight, 1400)}px`;
    // A pause, not an animation frame: a hidden or background tab never draws one.
    void doc.body.offsetHeight;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    try {
      await doc.fonts?.ready;
      restore = forClient(panel, doc, lang);
      return await win.htmlToImage.toJpeg(panel, {
        pixelRatio: 2,
        quality: 0.9,
        backgroundColor: "#ffffff",
      });
    } catch {
      return "";
    } finally {
      restore();
      frame.style.width = width;
      frame.style.height = height;
    }
  }

  window.AUTOGOOD_OFFER_CALC = { TABS, url, read, capture };
})();
