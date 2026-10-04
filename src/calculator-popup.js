/* AUTOGOOD "Oblicz na gotowo" (B42, owner 2026-10-04): the calculators in a
 * window over the search page, filled from one offer — on page 1 once a link
 * is read, on page 3 "Monitoring" beside every offer from abroad.
 *
 * Three calculators: "Zakup bezpośredni" (tab 0, gross price), "Dealerzy VAT
 * 23%" (tab 3, net price — only for an offer with VAT to deduct) and "Dealerzy
 * VAT marża" (tab 4, gross price). The window shows the calculators page
 * itself (calculators.html?embed=1 with the offer's numbers in the address,
 * readCalculatorPrefill in src/main.jsx), so the formulas, the live rate and
 * "Zapisz" (the calculator's own history) are exactly the calculator's.
 *
 * A mobile.de offer is read first through the importer — net price, engine
 * size, body and the seller's place — as page 1 reads a link; the other
 * portals give what their result lists carry. Polish (otomoto) and Belarusian
 * (av.by) offers are not imported: no button there.
 *
 * window.AUTOGOOD_CALC_POPUP.open(offer) — offer: { source, title, url,
 * price, currency, netPrice, priceType ("vat" = VAT deductible), fuel, ccm,
 * body, country, zip, city, filters }.
 */
(() => {
  const VAT_RATES = { DE: 0.19, AT: 0.2, FR: 0.2, NL: 0.21, BE: 0.21, LU: 0.17, IT: 0.22, ES: 0.21, SE: 0.25, DK: 0.25, CZ: 0.21, SK: 0.23 };
  const ENGINE_LABELS = ["EL / PHEV ≤2000 cm³", "PHEV / HEV >2000 cm³", "HEV ≤2000 cm³", "Spalinowy ≤2000 cm³", "Spalinowy >2000 cm³"];
  const TABS = [
    { tab: 0, key: "direct" },
    { tab: 3, key: "vat" },
    { tab: 4, key: "margin" },
  ];
  const WORDS = {
    pl: {
      button: "Oblicz na gotowo",
      kicker: "Oblicz na gotowo",
      close: "Zamknij",
      direct: "Zakup bezpośredni",
      vat: "Dealerzy VAT 23%",
      margin: "Dealerzy VAT marża",
      vatOnly: "Tylko dla auta z VAT do odliczenia (cena netto na fakturze).",
      reading: "Czytam ogłoszenie z mobile.de (cena netto, silnik, miejsce sprzedawcy)…",
      readFailed: "Nie udało się przeczytać ogłoszenia — liczę z danych z listy.",
      gross: "brutto",
      net: "netto",
      vatDeductible: "VAT do odliczenia",
      marginScheme: "VAT marża",
      engine: "akcyza",
      transport: "transport {transport} + oględziny {inspection} zł netto",
      ad: "Ogłoszenie ↗",
      note: "Liczby z ogłoszenia; transport i oględziny wg taryfy dla miejsca sprzedawcy — zmienisz je w kalkulatorze.",
      listNote: "(Lista liczy „~ na gotowo” ze średnimi 2 500 + 1 500 zł.)",
      frameTitle: "Kalkulator AUTOGOOD",
      netGuess: "netto ≈ brutto ÷ (1 + VAT kraju sprzedawcy)",
    },
    ru: {
      button: "Посчитать под ключ",
      kicker: "Расчёт под ключ",
      close: "Закрыть",
      direct: "Прямая покупка",
      vat: "Дилеры VAT 23%",
      margin: "Дилеры VAT маржа",
      vatOnly: "Только для авто с НДС к вычету (цена нетто в счёте).",
      reading: "Читаю объявление mobile.de (цена нетто, двигатель, место продавца)…",
      readFailed: "Не удалось прочитать объявление — считаю по данным из списка.",
      gross: "брутто",
      net: "нетто",
      vatDeductible: "НДС к вычету",
      marginScheme: "VAT маржа",
      engine: "акциз",
      transport: "транспорт {transport} + осмотр {inspection} зл. нетто",
      ad: "Объявление ↗",
      note: "Цифры из объявления; транспорт и осмотр по тарифу для места продавца — их можно изменить в калькуляторе.",
      listNote: "(Список считает «~ под ключ» со средними 2 500 + 1 500 зл.)",
      frameTitle: "Калькулятор AUTOGOOD",
      netGuess: "нетто ≈ брутто ÷ (1 + НДС страны продавца)",
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const words = () => WORDS[lang()];
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const amount = (value, currency) => `${Math.round(Number(value) || 0).toLocaleString("pl-PL")} ${currency}`;

  // Is this offer bought abroad (the calculators' case)?
  function importable(source) {
    return ["mobile", "autoscout", "autoscoutfr", "marktplaats", "dehands", "blocket"].includes(source);
  }

  function rates() {
    const known = window.AUTOGOOD_TURNKEY?.currentRates?.();
    return { eur: Number(known?.eur) || 4.3, sek: Number(known?.sek) || 0.39 };
  }

  function engineIndexOf(input, filters = {}) {
    if (typeof classifyEngineType === "function" && (input.fuel || input.title)) {
      // Same rule as the analysis: a hybrid named anywhere is a hybrid.
      const info = window.AUTOGOOD_TURNKEY?.engineInfo?.({ fuel: input.fuel, title: input.title, displacementCcm: input.ccm }, filters);
      if (info) return info.index;
      return classifyEngineType(`${input.fuel || ""} ${input.title || ""}`, input.ccm);
    }
    return 3;
  }

  function tariffOf(body, location) {
    if (typeof estimateDeliveryInspection === "function") return estimateDeliveryInspection(body || "", location);
    return { transport: 2500, inspection: 1300 };
  }

  // Everything the calculators need, from a list offer or an importer answer.
  function fromOffer(offer, ad = null) {
    const r = rates();
    const currency = offer.currency || "EUR";
    const priceEur = currency === "SEK" ? (Number(offer.price) * r.sek) / r.eur : currency === "PLN" ? Number(offer.price) / r.eur : Number(offer.price);
    const country = String(ad?.location?.country || offer.country || ({ blocket: "SE", autoscoutfr: "FR", marktplaats: "NL", dehands: "BE" }[offer.source] || "DE")).toUpperCase().slice(0, 2);
    const gross = Number(ad?.carBruttoEur) || priceEur;
    const vat = ad ? (ad.purchaseType === "VAT" || Boolean(ad.carNettoEur)) : offer.priceType === "vat";
    let net = Number(ad?.carNettoEur) || (offer.priceType === "vat" ? Number(offer.netPrice) || 0 : 0);
    let netGuessed = false;
    if (vat && !net && VAT_RATES[country]) {
      net = gross / (1 + VAT_RATES[country]);
      netGuessed = true;
    }
    const location = ad?.location || { country, postalCode: offer.zip || "", city: offer.city || "" };
    const body = ad?.bodyType || offer.body || offer.filters?.body || "";
    const tariff = tariffOf(body, location);
    const fuel = ad?.fuel || offer.fuel || "";
    const ccm = Number(ad?.displacementCcm) || Number(offer.ccm) || null;
    const title = ad?.title || offer.title || "";
    return {
      source: offer.source,
      title,
      url: offer.url || ad?.sourceUrl || "",
      original: currency === "EUR" ? "" : amount(offer.price, currency),
      gross,
      net: vat ? net : 0,
      netGuessed,
      vat,
      engine: engineIndexOf({ fuel, title, ccm }, offer.filters || {}),
      transport: Math.round(Number(ad?.transportNettoPln) || tariff.transport),
      inspection: Math.round(Number(ad?.inspectionNettoPln) || tariff.inspection),
      fromList: !ad,
    };
  }

  // Page 1: the ad read from a link (state.data of src/mobile.js).
  function fromRecognizedAd(ad) {
    if (!ad?.carBruttoEur) return null;
    const source = ["blocket", "otomoto", "avby", "autoscout", "marktplaats", "dehands"].includes(ad.importMode) ? ad.importMode : "mobile";
    if (!importable(source)) return null;
    const country = String(ad.location?.country || (source === "blocket" ? "SE" : "DE")).toUpperCase().slice(0, 2);
    const vat = ad.purchaseType === "VAT" || Boolean(ad.carNettoEur);
    let net = Number(ad.carNettoEur) || 0;
    let netGuessed = false;
    if (vat && !net && VAT_RATES[country]) {
      net = Number(ad.carBruttoEur) / (1 + VAT_RATES[country]);
      netGuessed = true;
    }
    return {
      source,
      title: ad.title || "",
      url: ad.sourceUrl || "",
      original: ad.priceSek ? amount(ad.priceSek, "SEK") : "",
      gross: Number(ad.carBruttoEur),
      net: vat ? net : 0,
      netGuessed,
      vat,
      engine: engineIndexOf({ fuel: ad.fuel, title: ad.title, ccm: ad.displacementCcm }),
      transport: Math.round(Number(ad.transportNettoPln) || 0),
      inspection: Math.round(Number(ad.inspectionNettoPln) || 0),
      fromList: false,
    };
  }

  function calculatorUrl(data, tab) {
    const params = new URLSearchParams();
    params.set("embed", "1");
    params.set("tab", String(tab));
    params.set("lang", lang());
    params.set("car", String(Math.round(tab === 3 ? data.net : data.gross)));
    if (data.transport) params.set("transport", String(data.transport));
    if (data.inspection) params.set("inspection", String(data.inspection));
    params.set("engine", String(data.engine));
    // The calculator's "Link Mobile.de" field reads mobile.de ads only.
    if (data.url && data.source === "mobile") params.set("mobileUrl", data.url);
    return `./calculators.html?${params.toString()}`;
  }

  let dialog = null;
  let current = null;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "agCalcPopup";
    dialog.setAttribute("aria-labelledby", "agCalcPopupTitle");
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      // A click on the dimmed backdrop (the dialog box itself) closes it.
      if (event.target === dialog) dialog.close();
      if (event.target.closest("[data-calc-popup-close]")) dialog.close();
      const tab = event.target.closest("[data-calc-popup-tab]");
      if (tab && !tab.disabled && current) show(current, Number(tab.dataset.calcPopupTab));
    });
    dialog.addEventListener("close", () => {
      const frame = dialog.querySelector("iframe");
      if (frame) frame.src = "about:blank";
      current = null;
    });
    return dialog;
  }

  function factsHtml(data) {
    const w = words();
    const price = `${amount(data.gross, "EUR")} ${w.gross}${data.original ? ` (${data.original})` : ""}`;
    const vat = data.vat ? `${w.vatDeductible} · ${amount(data.net, "EUR")} ${w.net}${data.netGuessed ? "*" : ""}` : w.marginScheme;
    return [
      `<b>${escape(price)}</b>`,
      escape(vat),
      `${escape(w.engine)}: ${escape(ENGINE_LABELS[data.engine] || "")}`,
      escape(w.transport.replace("{transport}", data.transport.toLocaleString("pl-PL")).replace("{inspection}", data.inspection.toLocaleString("pl-PL"))),
      data.url ? `<a href="${escape(data.url)}" target="_blank" rel="noopener">${escape(w.ad)}</a>` : "",
    ].filter(Boolean).join(" · ");
  }

  function show(data, tab) {
    const w = words();
    current = data;
    const box = ensureDialog();
    box.innerHTML = `
      <div class="agCalcPopupHead">
        <div>
          <p class="agCalcPopupKicker">${escape(w.kicker)}</p>
          <h2 id="agCalcPopupTitle">${escape(data.title || "—")}</h2>
          <p class="agCalcPopupFacts">${factsHtml(data)}</p>
        </div>
        <button class="agCalcPopupClose" type="button" data-calc-popup-close aria-label="${escape(w.close)}">×</button>
      </div>
      <div class="agCalcPopupTabs" role="tablist">
        ${TABS.map((item) => {
          const off = item.key === "vat" && !data.vat;
          return `<button type="button" role="tab" data-calc-popup-tab="${item.tab}" aria-selected="${item.tab === tab ? "true" : "false"}"${off ? ` disabled title="${escape(w.vatOnly)}"` : ""}>${escape(w[item.key])}</button>`;
        }).join("")}
      </div>
      <p class="agCalcPopupNote">${escape(w.note)}${data.fromList ? ` ${escape(w.listNote)}` : ""}${data.netGuessed ? ` * ${escape(w.netGuess)}.` : ""}${data.readFailed ? ` <b>${escape(w.readFailed)}</b>` : ""}</p>
      <iframe class="agCalcPopupFrame" title="${escape(w.frameTitle)}" src="${escape(calculatorUrl(data, tab))}"></iframe>`;
    if (!box.open) box.showModal();
  }

  function showReading(title) {
    const w = words();
    const box = ensureDialog();
    box.innerHTML = `
      <div class="agCalcPopupHead">
        <div>
          <p class="agCalcPopupKicker">${escape(w.kicker)}</p>
          <h2 id="agCalcPopupTitle">${escape(title || "—")}</h2>
          <p class="agCalcPopupFacts" aria-live="polite">${escape(w.reading)}</p>
        </div>
        <button class="agCalcPopupClose" type="button" data-calc-popup-close aria-label="${escape(w.close)}">×</button>
      </div>`;
    if (!box.open) box.showModal();
  }

  // Margin offers open on "Zakup bezpośredni" (the list's "~ na gotowo" uses
  // it too); an offer with VAT to deduct opens on "Dealerzy VAT 23%".
  const firstTab = (data) => (data.vat && data.net ? 3 : 0);

  async function open(offer) {
    if (!offer || !importable(offer.source)) return;
    if (offer.source === "mobile" && offer.url && typeof window.AUTOGOOD_MOBILEDE_IMPORT === "function") {
      showReading(offer.title);
      let ad = null;
      try {
        ad = await window.AUTOGOOD_MOBILEDE_IMPORT(offer.url);
      } catch {
        ad = null;
      }
      if (!dialog?.open) return;
      const data = fromOffer(offer, ad?.carBruttoEur ? ad : null);
      data.readFailed = !ad?.carBruttoEur;
      show(data, firstTab(data));
      return;
    }
    const data = fromOffer(offer);
    show(data, firstTab(data));
  }

  function openRecognized() {
    const data = fromRecognizedAd(typeof window.AUTOGOOD_RECOGNIZED_AD === "function" ? window.AUTOGOOD_RECOGNIZED_AD() : null);
    if (data) show(data, firstTab(data));
  }

  // Page 1: the button beside the price of the ad read from a link.
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-calc-popup-recognized]")) {
      event.preventDefault();
      openRecognized();
    }
  });

  window.AUTOGOOD_CALC_POPUP = { open, importable, words };
})();
