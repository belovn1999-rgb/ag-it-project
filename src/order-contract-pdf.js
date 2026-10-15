/* Umowa zamówienia pojazdu — the filled contract is drawn straight onto the
   owner-approved PDF template (contract-pdf-work/templates/
   Umowa_Zamowienia_Pojazdu_AG_wzor.pdf) in the browser. No Word, no converter:
   the layout is fixed by the template, so the signatures always stay on
   page 1 and the document is always two pages.

   Every position below was measured on that template (baseline and size of the
   printed text on the same line, cell bounds, the "……" placeholders). Values
   sit on the baseline of their label, in Carlito like the rest of the page:
   8 pt black in data cells — the size of the AUTOGOOD details opposite — and
   the size and colour of their own line where they replace a "……" inside a
   sentence. If the template is re-exported, re-measure (docs/PROJECT-UMOWY.md).

   Loads in the browser (window.AutogoodOrderContractPdf) and in Node for tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AutogoodOrderContractPdf = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const BLACK = [0, 0, 0];
  const HEADER_GREY = [0x33 / 255, 0x33 / 255, 0x33 / 255];
  const FOOTER_GREY = [0x8a / 255, 0x93 / 255, 0x9d / 255];
  const DATA_SIZE = 8;
  const DATA_SIZES = [8, 7.5, 7, 6.5];
  const INLINE_MIN = 6;
  const LINE_GAP = 1.2;
  // Sizes the manager may pick by hand (A− / A+ next to long fields).
  const MANUAL = { min: 5, maxCell: 9, maxInline: 8.5, step: 0.5 };

  // AcroForm checkboxes of the template, by what is printed next to them.
  const BOXES = {
    entrepreneur: "box1",
    variant1: "box2",
    variant2: "box3",
    variant3: "box4",
    indicatedVehicle: "box5",
    fuel_diesel: "box6",
    fuel_benzyna: "box7",
    fuel_hybryda: "box8",
    fuel_elektryk: "box9",
    gearbox_manualna: "box10",
    gearbox_automatyczna: "box11",
    body_sedan: "box12",
    body_kombi: "box13",
    body_coupe: "box14",
    body_inne: "box15",
    euro_6: "box16",
    euro_7: "box17",
    euro_dowolna: "box18",
    euro_inna: "box19",
    allowRepaired: "box20",
    currency_PLN: "box21",
    currency_EUR: "box22",
    purpose_ogledziny: "box23",
    purpose_zakup: "box24",
  };

  const TEXT_FIELDS = [
    "nr_umowy", "data_umowy", "imie_nazwisko", "adres", "pesel_nip", "dokument", "telefon", "email",
    "link_vin", "marka_model", "rok_od_do", "przebieg_do", "nadwozie_inne", "euro_inna",
    "cechy_wymagane", "cechy_oczekiwane", "budzet", "zaliczka",
  ];

  // Data cells. `top`/`bottom`: cell bounds; `base`: baseline of the label's
  // last line; `x`/`right`: where the value may go on that line; `nextX`:
  // where a wrapped line starts (under the label, as text flows in the cell).
  // Lines are bottom-aligned on `base` when `stack` is "up" (client block,
  // labels sit at the bottom of their rows), else they flow down from it.
  const CELLS = {
    name: { label: "Imię i nazwisko / Nazwa", x: 165.5, right: 285.2, base: 119.4, top: 102.0, bottom: 124.1, stack: "up", lines: 2 },
    address: { label: "Adres zamieszkania / siedziby", x: 165.5, right: 285.2, base: 141.5, top: 124.1, bottom: 146.2, stack: "up", lines: 2 },
    identifier: { label: "PESEL/NIP", x: 165.5, right: 285.2, base: 163.6, top: 146.2, bottom: 168.3, stack: "up", lines: 2 },
    document: { label: "Dokument tożsamości", x: 165.5, right: 285.2, base: 185.7, top: 168.3, bottom: 190.4, stack: "up", lines: 2 },
    phone: { label: "Nr tel.", x: 165.5, right: 285.2, base: 207.8, top: 190.4, bottom: 212.5, stack: "up", lines: 2 },
    email: { label: "E-mail", x: 165.5, right: 285.2, base: 229.9, top: 212.5, bottom: 234.6, stack: "up", lines: 2 },
    makeModel: { label: "Marka i model", x: 92.5, right: 383.0, nextX: 38.6, base: 481.0, bottom: 499.9, lines: 2 },
    years: { label: "Rok pierwszej rejestracji", x: 508.5, right: 559.5, nextX: 390.0, base: 481.0, bottom: 499.9, lines: 2 },
    mileageTo: { label: "Przebieg do", x: 97.7, right: 208.3, nextX: 38.6, base: 507.9, bottom: 529.4, lines: 2 },
    required: { label: "Dodatkowe wymagane cechy/wyposażenie", x: 187.2, right: 559.5, nextX: 38.6, base: 566.5, bottom: 582.2, lines: 2 },
    expected: { label: "Dodatkowe oczekiwane cechy/wyposażenie", x: 189.7, right: 559.5, nextX: 38.6, base: 589.85, bottom: 605.5, lines: 2 },
    budget: { label: "Budżet", x: 144.1, right: 272.1, base: 675.25, bottom: 685.2, lines: 1 },
    advance: { label: "Zaliczka", x: 281.1, right: 398.7, base: 675.25, bottom: 685.2, lines: 1 },
  };

  // "……" placeholders inside sentences: the value takes the place, size and
  // colour of the sentence; the dots are painted over.
  const INLINE = {
    link: { label: "Link / VIN", dots: [469.75, 552.51], right: 560.0, base: 418.1, size: 7.5, gap: 0 },
    bodyOther: { label: "Nadwozie — inne", dots: [168.75, 192.87], right: 210.3, base: 552.8, size: 7, gap: 1.6 },
    euroOther: { label: "Norma Euro — inna", dots: [350.65, 369.93], right: 384.0, base: 552.8, size: 7, gap: 1.6 },
  };

  for (const [key, spot] of [...Object.entries(CELLS), ...Object.entries(INLINE)]) spot.key = key;

  const HEADER = { base: 61.6, size: 8.5, numberDots: [43.44, 96.22], date: [144.85, 204.64] };
  const FOOTER = { base: 824.7, size: 6.5, span: [183.35, 412.24], center: 297.8 };

  // `field` names the CELLS / INLINE entry whose text does not fit.
  class ContractFitError extends Error {
    constructor(message, field) {
      super(message);
      this.name = "ContractFitError";
      this.field = field;
    }
  }

  function clean(value) {
    return String(value == null ? "" : value).replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
  }

  // Textareas may hold one item per line; the contract cell holds a sentence.
  function oneParagraph(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean)
      .join("; ");
  }

  // Splits a token that is wider than the line (e-mail, URL) after "@", ".",
  // "/", "-" where possible, else between characters.
  function splitLongToken(font, token, size, width) {
    const parts = [];
    let rest = token;
    while (rest && font.widthOfTextAtSize(rest, size) > width) {
      let cut = 1;
      while (cut < rest.length && font.widthOfTextAtSize(rest.slice(0, cut + 1), size) <= width) cut += 1;
      const soft = Math.max(rest.lastIndexOf("@", cut - 1), rest.lastIndexOf(".", cut - 1), rest.lastIndexOf("/", cut - 1), rest.lastIndexOf("-", cut - 1));
      if (soft > cut * 0.5) cut = soft + 1;
      parts.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest) parts.push(rest);
    return parts;
  }

  // Greedy wrap: the first line has `firstWidth`, the following ones `restWidth`.
  function wrap(font, text, size, firstWidth, restWidth) {
    const lines = [];
    let line = "";
    const widthFor = () => (lines.length ? restWidth : firstWidth);
    for (const word of text.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= widthFor()) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (font.widthOfTextAtSize(word, size) <= widthFor()) {
        line = word;
        continue;
      }
      const pieces = splitLongToken(font, word, size, widthFor());
      line = pieces.pop();
      lines.push(...pieces);
    }
    if (line) lines.push(line);
    return lines;
  }

  // Lines of `size` that fit between the cell bounds — for a size picked by
  // hand, which may be smaller (more lines) or larger than the automatic ones.
  function linesThatFit(cell, size) {
    const step = size * LINE_GAP;
    let lines = 0;
    while (lines < 6) {
      const n = lines + 1;
      const fits = cell.stack === "up" ? cell.base - step * (n - 1) - size * 0.8 >= cell.top - 0.3 : cell.base + step * (n - 1) + size * 0.25 <= cell.bottom;
      if (!fits) break;
      lines = n;
    }
    return lines;
  }

  function fitCell(font, text, cell, fixed) {
    const firstWidth = cell.right - cell.x;
    const restWidth = cell.right - (cell.nextX == null ? cell.x : cell.nextX);
    if (fixed) {
      const lines = wrap(font, text, fixed, firstWidth, restWidth);
      if (lines.length <= linesThatFit(cell, fixed)) return { size: fixed, lines, step: fixed * LINE_GAP };
      throw new ContractFitError(`Tekst w polu „${cell.label}” nie mieści się w umowie przy czcionce ${String(fixed).replace(".", ",")} pt. ${fixed > MANUAL.min ? "Zmniejsz czcionkę (A−) albo skróć tekst." : "Skróć tekst."}`, cell.key);
    }
    for (const size of DATA_SIZES) {
      const lines = wrap(font, text, size, firstWidth, restWidth);
      if (lines.length > cell.lines) continue;
      const step = size * LINE_GAP;
      const lastBase = cell.stack === "up" ? cell.base : cell.base + step * (lines.length - 1);
      if (cell.stack !== "up" && lastBase + size * 0.25 > cell.bottom) continue;
      return { size, lines, step };
    }
    throw new ContractFitError(
      `Tekst w polu „${cell.label}” nie mieści się w umowie (najwyżej ${cell.lines} ${cell.lines === 1 ? "wiersz" : "wiersze"}). Skróć go.`,
      cell.key
    );
  }

  function link(value) {
    return clean(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  }

  function fitInline(font, text, spot, fixed) {
    const width = spot.right - spot.dots[0] - spot.gap;
    if (fixed) {
      if (font.widthOfTextAtSize(text, fixed) <= width) return fixed;
      throw new ContractFitError(`Tekst w polu „${spot.label}” nie mieści się w umowie przy czcionce ${String(fixed).replace(".", ",")} pt. ${fixed > MANUAL.min ? "Zmniejsz czcionkę (A−) albo skróć tekst." : "Skróć tekst."}`, spot.key);
    }
    for (let size = spot.size; size >= INLINE_MIN - 1e-9; size -= 0.25) {
      if (font.widthOfTextAtSize(text, size) <= width) return size;
    }
    throw new ContractFitError(
      `Tekst w polu „${spot.label}” nie mieści się w umowie (miejsce na ok. ${Math.floor(width / (INLINE_MIN * 0.48))} znaków).${spot === INLINE.link ? " Wpisz VIN albo krótszy link." : " Skróć go."}`,
      spot.key
    );
  }

  function layout(PDFLib, font, page) {
    const H = page.getHeight();
    const rgb = (c) => PDFLib.rgb(c[0], c[1], c[2]);
    return {
      text(text, x, base, size, color = BLACK) {
        if (text) page.drawText(text, { x, y: H - base, size, font, color: rgb(color) });
      },
      cover(x0, x1, base, size) {
        page.drawRectangle({ x: x0 - 0.4, y: H - base - size * 0.3, width: x1 - x0 + 0.8, height: size * 1.25, color: PDFLib.rgb(1, 1, 1) });
      },
    };
  }

  // `sizes`: sizes picked by hand, by field key; `used`: the size each field
  // was drawn with (shown next to A− / A+ on the page).
  function drawCell(draw, font, cell, value, sizes = {}, used = {}) {
    const text = oneParagraph(value);
    if (!text) return;
    const { size, lines, step } = fitCell(font, text, cell, manualSize(sizes[cell.key], MANUAL.maxCell));
    used[cell.key] = size;
    const firstBase = cell.stack === "up" ? cell.base - step * (lines.length - 1) : cell.base;
    lines.forEach((line, index) => {
      const x = index === 0 ? cell.x : cell.nextX == null ? cell.x : cell.nextX;
      draw.text(line, x, firstBase + step * index, size);
    });
  }

  function manualSize(value, max) {
    const size = Number(value);
    return size ? Math.min(max, Math.max(MANUAL.min, size)) : 0;
  }

  function drawInline(draw, font, spot, value, sizes = {}, used = {}) {
    const text = spot === INLINE.link ? link(value) : clean(value);
    if (!text) return;
    const size = fitInline(font, text, spot, manualSize(sizes[spot.key], MANUAL.maxInline));
    used[spot.key] = size;
    draw.cover(spot.dots[0], spot.dots[1], spot.base, spot.size);
    // The dots follow the colon directly; the value keeps a space after it.
    draw.text(text, spot.dots[0] + spot.gap, spot.base, size);
  }

  function footerText(number, pageIndex, pageCount) {
    return `AUTOGOOD sp. z o.o. · Umowa zamówienia pojazdu nr ${number || "…………………………"}  ·  strona ${pageIndex + 1} z ${pageCount}`;
  }

  function setBoxes(form, contract) {
    const on = new Set();
    if (contract.client.isEntrepreneur) on.add("entrepreneur");
    contract.variants.forEach((variant) => on.add(`variant${variant}`));
    if (contract.indicatedVehicle) on.add("indicatedVehicle");
    contract.vehicle.fuels.forEach((value) => on.add(`fuel_${value}`));
    contract.vehicle.gearboxes.forEach((value) => on.add(`gearbox_${value}`));
    contract.vehicle.bodies.forEach((value) => on.add(`body_${value}`));
    if (contract.vehicle.euro) on.add(`euro_${contract.vehicle.euro}`);
    if (contract.vehicle.allowRepaired) on.add("allowRepaired");
    if (contract.currency) on.add(`currency_${contract.currency}`);
    contract.advancePurposes.forEach((value) => on.add(`purpose_${value}`));

    // The template ships with "dowolna" ticked: every box is set explicitly.
    for (const [key, name] of Object.entries(BOXES)) {
      const box = form.getCheckBox(name);
      if (on.has(key)) box.check();
      else box.uncheck();
    }
  }

  function assertTemplate(form) {
    const names = new Set(form.getFields().map((field) => field.getName()));
    const missing = [...Object.values(BOXES), ...TEXT_FIELDS].filter((name) => !names.has(name));
    if (missing.length) throw new Error(`Szablon umowy nie zawiera pól: ${missing.join(", ")}. Sprawdź plik szablonu PDF.`);
  }

  /* contract: {
       number, date,                         // "12/10/26/2", "12 października 2026"
       client: { name, address, identifier, document, phone, email, isEntrepreneur },
       variants: [1, 2, 3], indicatedVehicle, indicatedLink,
       vehicle: { makeModel, years, mileageTo, fuels, gearboxes, bodies, bodyOther,
                  euro, euroOther, allowRepaired, required, expected },
       currency, budget, advance, advancePurposes,
       fontSizes: { address, link, required, expected } }  // pt picked by hand, else automatic
     report (optional) gets `sizes`: the size each value was drawn with. */
  async function build({ PDFLib, fontkit, templateBytes, fontBytes, contract, title, report }) {
    const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBytes, { subset: true });
    const form = pdfDoc.getForm();
    assertTemplate(form);
    setBoxes(form, contract);
    // Keep the template's own box drawings (✓ / empty square); the text fields
    // are flattened empty and the values are drawn on the measured baselines.
    form.flatten({ updateFieldAppearances: false });

    const pages = pdfDoc.getPages();
    const draw = layout(PDFLib, font, pages[0]);

    // Header: "nr ……" and "Łomianki, …… r." — painted over and rewritten so
    // a short number or date leaves no gap before " r.".
    if (contract.number) {
      draw.cover(HEADER.numberDots[0], HEADER.numberDots[1], HEADER.base, HEADER.size);
      draw.text(contract.number, HEADER.numberDots[0], HEADER.base, HEADER.size, HEADER_GREY);
    }
    if (contract.date) {
      draw.cover(HEADER.date[0], HEADER.date[1], HEADER.base, HEADER.size);
      draw.text(`${contract.date} r.`, HEADER.date[0], HEADER.base, HEADER.size, HEADER_GREY);
    }
    // Footer on every page, re-centred around the new number.
    pages.forEach((page, index) => {
      const pageDraw = layout(PDFLib, font, page);
      const text = footerText(contract.number, index, pages.length);
      pageDraw.cover(FOOTER.span[0], FOOTER.span[1], FOOTER.base, FOOTER.size);
      pageDraw.text(text, FOOTER.center - font.widthOfTextAtSize(text, FOOTER.size) / 2, FOOTER.base, FOOTER.size, FOOTER_GREY);
    });

    const { client, vehicle } = contract;
    const sizes = contract.fontSizes || {};
    const used = {};
    drawCell(draw, font, CELLS.name, client.name);
    drawCell(draw, font, CELLS.address, client.address, sizes, used);
    drawCell(draw, font, CELLS.identifier, client.identifier);
    drawCell(draw, font, CELLS.document, client.document);
    drawCell(draw, font, CELLS.phone, client.phone);
    drawCell(draw, font, CELLS.email, client.email);

    if (contract.indicatedVehicle) drawInline(draw, font, INLINE.link, contract.indicatedLink, sizes, used);

    drawCell(draw, font, CELLS.makeModel, vehicle.makeModel);
    drawCell(draw, font, CELLS.years, vehicle.years);
    drawCell(draw, font, CELLS.mileageTo, vehicle.mileageTo);
    if (vehicle.bodies.includes("inne")) drawInline(draw, font, INLINE.bodyOther, vehicle.bodyOther);
    if (vehicle.euro === "inna") drawInline(draw, font, INLINE.euroOther, vehicle.euroOther);
    drawCell(draw, font, CELLS.required, vehicle.required, sizes, used);
    drawCell(draw, font, CELLS.expected, vehicle.expected, sizes, used);

    drawCell(draw, font, CELLS.budget, contract.budget);
    drawCell(draw, font, CELLS.advance, contract.advance);

    if (report) report.sizes = used;
    if (title) pdfDoc.setTitle(title);
    pdfDoc.setAuthor("AUTOGOOD sp. z o.o.");
    pdfDoc.setProducer("AUTOGOOD Tools");
    pdfDoc.setCreator("AUTOGOOD Tools");
    return await pdfDoc.save();
  }

  return { build, ContractFitError, BOXES, CELLS, INLINE, MANUAL, DATA_SIZE };
});
