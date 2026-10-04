// Exchange rates of the whole page (B12, owner 2026-10-04): every pair the
// analysis converts with is shown at the top, left of the language switch,
// and these very rates are the ones the page counts with:
//   EUR, SEK → PLN: the calculator's rate (Walutomat sale offer + 0.02 zł,
//     turnkey-estimate.js), the same for prices, the price filter, "na gotowo";
//   USD → PLN: Walutomat (av.by, avby-search.js);
//   USD, EUR → BYN: the National Bank of Belarus (turnkey in Minsk,
//     turnkey-belarus.js).
// Live rates come with the page; when a source does not answer, the daily
// rates file (data/exchange-rates.json, written every morning by
// .github/workflows/exchange-rates.yml) stands in. A page left open is asked
// again on a new day (Monitoring runs at 9:00 in an open tab).
// Loaded before the portal scripts: they fall back to AUTOGOOD_RATES_FILE.
(() => {
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };
  const loadFile = () => fetch(`./data/exchange-rates.json?date=${today()}`, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  window.AUTOGOOD_RATES_FILE = loadFile();

  const TEXT = {
    pl: {
      label: "Kursy",
      title: "Kursy, którymi liczy cała strona: ceny ogłoszeń, filtr ceny, „na gotowo” i „pod klucz” na Białoruś.",
      walutomat: "Walutomat (kurs sprzedaży) {date}: {pairs}.",
      margin: "Do EUR i SEK doliczone 0,02 zł jak w kalkulatorze.",
      nbrb: "NBRB (kurs oficjalny Białorusi) {date}.",
      file: "Walutomat nie odpowiada — kurs z pliku dziennego z {date}.",
      nbrbFile: "NBRB nie odpowiada — kurs z pliku dziennego z {date}.",
    },
    ru: {
      label: "Курсы",
      title: "Курсы, по которым считает вся страница: цены объявлений, фильтр цены, «под ключ» в Польшу и в Беларусь.",
      walutomat: "Walutomat (курс продажи) {date}: {pairs}.",
      margin: "К EUR и SEK прибавлено 0,02 zł, как в калькуляторе.",
      nbrb: "НБРБ (официальный курс Беларуси) {date}.",
      file: "Walutomat не отвечает — курс из ежедневного файла от {date}.",
      nbrbFile: "НБРБ не отвечает — курс из ежедневного файла от {date}.",
    },
  };
  const lang = () => (document.documentElement.lang === "ru" ? "ru" : "pl");
  const number = (value, digits) => new Intl.NumberFormat(lang() === "ru" ? "ru-RU" : "pl-PL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  const day = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
  };
  const time = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return `${day(value)}.${date.getFullYear()}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const escape = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

  // The rates the page counts with right now.
  function used() {
    const pln = window.AUTOGOOD_TURNKEY?.currentRates?.() || {};
    const usd = Number(window.AUTOGOOD_USD_PLN_RATE) || window.AUTOGOOD_AVBY?.usdPlnRate?.() || 0;
    const by = window.AUTOGOOD_TURNKEY_BY?.rates?.() || {};
    return { pln, usd, by };
  }

  let target = null;
  function render() {
    if (!target) return;
    const t = TEXT[lang()];
    const { pln, usd, by } = used();
    const known = window.AUTOGOOD_EXCHANGE_RATES || {};
    const pairs = [
      pln.eur ? ["EUR", number(pln.eur, 2), "zł"] : null,
      pln.sek ? ["SEK", number(pln.sek, 4), "zł"] : null,
      usd ? ["USD", number(usd, 4), "zł"] : null,
    ].filter(Boolean);
    const byPairs = [
      by.USD ? ["USD", number(by.USD, 4), "BYN"] : null,
      by.EUR ? ["EUR", number(by.EUR, 4), "BYN"] : null,
    ].filter(Boolean);
    if (!pairs.length) {
      target.hidden = true;
      return;
    }
    const liveDate = known.updatedAt || "";
    const shownDay = day(liveDate) || day(new Date().toISOString());
    const raw = [
      pln.eurRaw ? `EUR ${number(pln.eurRaw, 4)}` : "",
      pln.sekRaw ? `SEK ${number(pln.sekRaw, 4)}` : "",
      usd ? `USD ${number(usd, 4)}` : "",
    ].filter(Boolean).join(", ");
    const title = [
      t.title,
      known.live === false ? t.file.replace("{date}", time(liveDate) || "—") : t.walutomat.replace("{date}", time(liveDate)).replace("{pairs}", raw),
      t.margin,
      byPairs.length ? (by.live ? t.nbrb : t.nbrbFile).replace("{date}", String(by.date || "—").split("-").reverse().join(".")) : "",
    ].filter(Boolean).join("\n");
    const chip = ([code, value, unit]) => `<span class="mobileRatesPair">1 ${code} = <b>${escape(value)}</b> ${unit}</span>`;
    target.hidden = false;
    target.title = title;
    target.setAttribute("aria-label", title);
    target.innerHTML = `
      <span class="mobileRatesLabel">${escape(t.label)} ${escape(shownDay)}</span>
      ${pairs.map(chip).join("")}
      ${byPairs.length ? `<span class="mobileRatesSource">${lang() === "ru" ? "НБРБ" : "NBRB"}</span>${byPairs.map(chip).join("")}` : ""}`;
  }

  // A new day while the page stays open: every live rate is asked again.
  let loadedOn = today();
  async function reloadIfNewDay() {
    if (today() === loadedOn) return;
    loadedOn = today();
    window.AUTOGOOD_RATES_FILE = loadFile();
    await Promise.allSettled([
      window.AUTOGOOD_TURNKEY?.reloadRate?.(),
      window.AUTOGOOD_BLOCKET?.sekRateReady?.(true),
      window.AUTOGOOD_AVBY?.usdRateReady?.(true),
      window.AUTOGOOD_TURNKEY_BY?.ready?.(true),
    ]);
    render();
    // Every rate is new now: the pages count again.
    window.dispatchEvent(new CustomEvent("autogood:rates", { detail: { reloaded: true } }));
  }

  function start() {
    const actions = document.querySelector(".mobileTopActions");
    if (!actions) return;
    target = document.createElement("div");
    target.className = "mobileRates";
    target.setAttribute("role", "note");
    target.hidden = true;
    actions.prepend(target);
    render();
    Promise.allSettled([
      window.AUTOGOOD_TURNKEY?.calculatorRate?.(),
      window.AUTOGOOD_BLOCKET?.sekRateReady?.(),
      window.AUTOGOOD_AVBY?.usdRateReady?.(),
      window.AUTOGOOD_TURNKEY_BY?.ready?.(),
    ]).then(render);
    window.addEventListener("autogood:rates", render);
    document.querySelectorAll("[data-lang-button]").forEach((button) => button.addEventListener("click", () => setTimeout(render, 0)));
    setInterval(reloadIfNewDay, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) reloadIfNewDay();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
