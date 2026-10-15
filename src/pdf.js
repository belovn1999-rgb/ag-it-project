const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const pdfPreview = $("pdfPreview");
const pdfPreviewMeta = $("pdfPreviewMeta");
const pdfPreviewDownload = $("pdfPreviewDownload");
const pdfPreviewPrint = $("pdfPreviewPrint");
// Export contract (Belarus): DOCX template → converter. The Polish contract is
// drawn in the browser straight onto its PDF template (src/order-contract-pdf.js).
const templateUrl = "./contract-pdf-work/templates/Umowa_Zamowienia_Pojazdu_AG_template_signed.docx?v=20260909-1";
const orderPdfTemplateUrl = "./contract-pdf-work/templates/Umowa_Zamowienia_Pojazdu_AG_wzor.pdf?v=20261015-1";
const orderPdfFontUrl = "./assets/fonts/Carlito-Regular.ttf?v=20261015-1";
const defaultPdfConverterUrl = "/api/convert-docx-to-pdf";
const contractHistoryLimit = 20;
const pdfConversionTimeoutMs = 120_000;

let templateBytesPromise = null;
let generationInProgress = false;
const pageParams = new URLSearchParams(window.location.search);
const contractVariant = pageParams.get("variant") || "standard";
const isExportContract = contractVariant === "export";
const contractDocumentId = isExportContract ? "03-export" : "01-poland";
const legacyContractHistoryKey = "autogood-order-contract-history-v1";
const previousVariantHistoryKey = `${legacyContractHistoryKey}:${contractVariant}`;
const contractHistoryKey = `autogood-contract-history:${contractDocumentId}:v1`;
const exportDefaultCommission = "350 EUR + 1% od ceny pojazdu.";

const exportSubjectLabels = {
  purchase_by_autogood:
    "wyszukanie ofert pojazdów zgodnie z kryteriami określonymi przez Zleceniodawcę oraz zakup przez Zleceniobiorcę na rachunek Zleceniodawcy w ramach ustalonego budżetu w celu eksportu do Białorusi",
  client_indicated_vehicle: "zakupienie pojazdu wskazanego przez Zleceniodawcę (z aukcji lub oferty), w imieniu Zleceniodawcy",
};

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const W14 = "http://schemas.microsoft.com/office/word/2010/wordml";

const polishMonths = {
  1: "stycznia",
  2: "lutego",
  3: "marca",
  4: "kwietnia",
  5: "maja",
  6: "czerwca",
  7: "lipca",
  8: "sierpnia",
  9: "września",
  10: "października",
  11: "listopada",
  12: "grudnia",
};

const checkboxIndex = {
  client_is_entrepreneur: 1,
  subject_mediation: 2,
  subject_purchase_by_autogood: 3,
  subject_financing: 4,
  subject_client_indicated_vehicle: 5,
  fuel_diesel: 6,
  fuel_benzyna: 7,
  fuel_hybryda: 8,
  fuel_elektryk: 9,
  gearbox_manualna: 10,
  gearbox_automatyczna: 11,
  euro_6: 12,
  euro_7: 13,
  euro_dowolna: 14,
  euro_inna: 15,
  body_sedan: 16,
  body_kombi: 17,
  body_coupe: 18,
  body_inne: 19,
  allow_collision: 20,
};

const labels = {
  client: ["Klient", "Client", "Клиент", "Zleceniodawca", "Imię i nazwisko", "Imie i nazwisko", "Imię i Nazwisko/Nazwa", "Nazwa"],
  clientType: ["Rodzaj klienta", "Typ klienta", "Тип клиента"],
  address: ["Adres", "Адрес", "Address", "Siedziba", "Miejsce zamieszkania"],
  pesel: ["PESEL"],
  nip: ["NIP"],
  document: ["Dokument", "Документ", "Dowód", "Dowod", "Rodzaj, numer i seria dokumentu tożsamości", "Rodzaj numer i seria dokumentu tozsamosci"],
  documentType: ["Typ dokumentu", "Rodzaj dokumentu", "Тип документа"],
  documentNumber: ["Numer dokumentu", "Seria dokumentu", "Номер документа", "Nr dokumentu", "Numer i seria"],
  phone: ["Telefon", "Nr. tel", "Nr tel", "Телефон", "Tel", "Phone"],
  email: ["Email", "E-mail", "Mail", "Adres email", "Adres e-mail", "Имейл"],
  vehicleMarker: ["Auto", "Pojazd", "Samochód", "Samochod", "Авто", "Автомобиль"],
  makeModel: ["Marka i model", "Marka/model", "Marka / model", "Marka, model", "Marka model", "Марка и модель", "Марка/модель"],
  make: ["Marka", "Марка"],
  model: ["Model", "Модель"],
  year: ["Rok", "Wiek", "Год", "Rocznik", "Pierwsza rejestracja"],
  mileage: ["Przebieg", "Przebieg do", "Пробег"],
  body: ["Nadwozie", "Typ nadwozia", "Тип кузова", "Кузов"],
  fuel: ["Paliwo", "Топливо", "Napęd", "Naped"],
  gearbox: ["Skrzynia", "Skrzynia biegów", "Skrzynia biegow", "Коробка"],
  budget: ["Budżet", "Budzet", "Бюджет", "Cena", "Kwota"],
  deposit: ["Zaliczka", "Депозит", "Заливка", "Заличка", "Advance"],
  extra: ["Dodatkowo", "Wyposażenie", "Дополнительно", "Dodatkowe", "Wymagania", "Opcje"],
  expectedExtra: ["Oczekiwane", "Dodatkowe oczekiwane", "Желаемые"],
};

const allLabels = Object.values(labels).flat();
const looseStopLabels = allLabels.filter((label) => !labels.vehicleMarker.includes(label));
function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseDate(value) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function contractNumber(dateValue, sequence) {
  const date = parseDate(dateValue);
  const base = `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
  return Number(sequence) > 1 ? `${base}/${Number(sequence)}` : base;
}

function polishDateLine(dateValue) {
  const date = parseDate(dateValue);
  return `Łomianki, ${date.getDate()} ${polishMonths[date.getMonth() + 1]} ${date.getFullYear()} roku`;
}

function checkedRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((node) => node.value);
}

function setRadio(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((node) => {
    node.checked = node.value === value;
  });
}

function setCheckedValues(name, values) {
  const selected = new Set(asArray(values));
  document.querySelectorAll(`input[name="${name}"]`).forEach((node) => {
    node.checked = selected.has(node.value);
  });
}

function setFuel(values) {
  const selected = new Set(values || []);
  document.querySelectorAll("[data-fuel]").forEach((node) => {
    node.checked = selected.has(node.dataset.fuel);
  });
}

function fuelValues() {
  return [...document.querySelectorAll("[data-fuel]:checked")].map((node) => node.dataset.fuel);
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function uniqueValues(values) {
  return [...new Set(asArray(values))];
}

function bodyTypes(body) {
  return uniqueValues(body?.types || body?.type);
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLabeled(text, variants) {
  // Longest first: "Przebieg do" must win over "Przebieg", or "do:" stays in the value.
  const labelPattern = [...variants].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  const separatedNextPattern = allLabels.map(escapeRegExp).join("|");
  const looseNextPattern = looseStopLabels.map(escapeRegExp).join("|");
  const pattern = new RegExp(
    `(?:^|[\\s,;|\\n])(?:${labelPattern})(?![A-Za-zÀ-ž]|-[A-Za-zÀ-ž])(?:\\s*[:=]|\\s*–|\\s+-)?\\s*(.*?)(?=(?:[\\s,;|\\n]+(?:${separatedNextPattern})(?![A-Za-zÀ-ž]|-[A-Za-zÀ-ž])(?:\\s*[:=]|\\s*–|\\s+-)\\s*)|(?:[\\s,;|\\n]+(?:${looseNextPattern})\\s+)|$)`,
    "is"
  );
  return normalizeSpace(text.match(pattern)?.[1] || "");
}

function stripKnownNoise(value) {
  return normalizeSpace(String(value || "").replace(/^[-–—•*]+/, "").replace(/^[/:;,.\s-]+|[/:;,.\s-]+$/g, ""));
}

function parseBody(value) {
  const raw = normalizeSpace(value);
  const lower = raw.toLowerCase();
  const types = [];
  for (const body of ["sedan", "kombi", "coupe"]) {
    if (new RegExp(`\\b${body}\\b`).test(lower)) types.push(body);
  }
  const otherFallback = raw.match(/\b(suv|camper|hatchback|liftback|van|minivan|cabrio|kabriolet|crossover)\b/i)?.[0] || "";
  const other = raw.match(/inne\s*:\s*(.+)/i)?.[1];
  if (other || otherFallback) types.push("inne");
  if (!types.length && raw) types.push("inne");
  return {
    type: types[0] || "",
    types: uniqueValues(types),
    other: other ? normalizeSpace(other) : otherFallback || (types.includes("inne") && !["sedan", "kombi", "coupe", "inne"].includes(lower) ? raw : ""),
  };
}

function bodyFallback(value) {
  const match = normalizeSpace(value).match(/\b(sedan|kombi|coupe|suv|camper|hatchback|liftback|van|minivan|cabrio|kabriolet)\b/i);
  return match?.[0] || "";
}

function parseFuel(value) {
  const lower = normalizeSpace(value).toLowerCase();
  const selected = [];
  if (/\bbenzyn|gasolin|petrol\b/.test(lower)) selected.push("benzyna");
  if (/\bdiesel|olej nap[eę]dowy\b/.test(lower)) selected.push("diesel");
  if (/\bhybryd|hybrid\b/.test(lower)) selected.push("hybryda");
  if (/\belektryk|electric|ev\b/.test(lower)) selected.push("elektryk");
  return selected;
}

function parseGearbox(value) {
  const lower = normalizeSpace(value).toLowerCase();
  const selected = [];
  if (/\bautomat|automatycz/.test(lower)) selected.push("automatyczna");
  if (/\bmanual|manualn/.test(lower)) selected.push("manualna");
  return uniqueValues(selected);
}

function normalizeDocumentType(value) {
  const lower = normalizeSpace(value).toLowerCase();
  if (!lower) return "";
  if (/^(?:do|d\.o\.|dow[oó]d|dow[oó]d osobisty)\b/.test(lower)) return "dowód osobisty";
  if (/^paszport\b/.test(lower)) return "paszport";
  if (/^karta\s+pobytu\b/.test(lower)) return "karta pobytu";
  return "";
}

function splitDocumentValue(value) {
  const clean = stripKnownNoise(value);
  if (!clean) return { type: "", number: "" };
  const type = normalizeDocumentType(clean);
  const number = extractDocumentNumber(clean);
  return { type, number };
}

function extractDocumentNumber(value) {
  return normalizeSpace(
    String(value || "").match(/\b(?:[A-Z]{1,4}\s*\d[A-Z0-9]{2,}|\d{5,}[A-Z0-9]*)\b/i)?.[0] || ""
  );
}

function normalizeDocumentValue(value) {
  const type = normalizeDocumentType(value);
  const number = extractDocumentNumber(value);
  return composeDocumentValue(type, number) || number;
}

function composeDocumentValue(type, number) {
  const cleanType = normalizeDocumentType(type);
  const cleanNumber = stripKnownNoise(number);
  if (!cleanType || !cleanNumber) return "";
  const numberWithoutType = splitDocumentValue(cleanNumber).number || cleanNumber;
  return normalizeSpace(`${cleanType} ${numberWithoutType}`);
}

function parseDocumentValue(text) {
  const compact = normalizeSpace(text);
  // "DO:" is the capitalised shorthand of dowód osobisty; "Przebieg do: 150000" is not.
  const shorthand = compact.match(/(?<![\p{L}\d])(?:DO|D\.O\.)(?![\p{L}])\s*(?::|-)?\s*([A-Za-z]{1,4}\s*\d[A-Za-z0-9]{2,}|\d{5,}[A-Za-z0-9]*)/u);
  if (shorthand) return normalizeDocumentValue(`dowód osobisty ${shorthand[1]}`);
  const exact = compact.match(/\b(dow[oó]d osobisty|paszport|karta pobytu)\b\s*(?::|nr|numer|seria|-)?\s*([A-Z]{1,4}\s*\d[A-Z0-9]{2,}|\d{5,}[A-Z0-9]*)/i);
  if (exact) return normalizeDocumentValue(`${exact[1]} ${exact[2]}`);
  let documentValue = extractLabeled(compact, labels.document);
  const documentType = extractLabeled(compact, labels.documentType);
  const documentNumber = extractLabeled(compact, labels.documentNumber);
  if (!documentValue && (documentType || documentNumber)) {
    documentValue = normalizeSpace(`${documentType} ${documentNumber}`);
  }
  if (!documentValue) {
    const match = compact.match(/\b(dow[oó]d osobisty|paszport|karta pobytu)\b\s*[:-]?\s*([A-Z0-9]{3,}(?:\s+[A-Z0-9]{2,})?)/i);
    if (match) documentValue = normalizeSpace(`${match[1]} ${match[2]}`);
  }
  return normalizeDocumentValue(documentValue);
}

function moneyMatch(value) {
  return normalizeSpace(value.match(/\b\d[\d\s.,]{2,}\s*(?:PLN|EUR|zł|zl|€)(?:\s*brutto|\s*netto)?\b/i)?.[0] || "");
}

function parseMoneyValue(value) {
  const raw = normalizeSpace(value);
  const currencyMatch = raw.match(/\b(EUR|PLN)\b|€|zł|zl/i);
  let currency = "PLN";
  if (currencyMatch) {
    const token = currencyMatch[0].toUpperCase();
    currency = token === "EUR" || token === "€" ? "EUR" : "PLN";
  }
  const amount = stripKnownNoise(raw.replace(/\b(EUR|PLN)\b|€|zł|zl|\bbrutto\b|\bnetto\b/gi, ""));
  return { amount, currency };
}

function formatMoneyValue(amount, currency) {
  const cleanAmount = parseMoneyValue(amount).amount;
  if (!cleanAmount) return "";
  const cleanCurrency = currency === "EUR" ? "EUR" : "PLN";
  return `${cleanAmount} ${cleanCurrency} brutto`;
}

function documentFallback(text) {
  const compact = normalizeSpace(text);
  const shorthand = compact.match(/(?<![\p{L}\d])(?:DO|D\.O\.)(?![\p{L}])\s*(?::|-)?\s*([A-Za-z]{1,4}\s?\d[A-Za-z0-9]{2,}|\d{5,}[A-Za-z0-9]*)/u);
  if (shorthand) return normalizeDocumentValue(`dowód osobisty ${shorthand[1]}`);
  const full = compact.match(/\b(dow[oó]d osobisty|paszport|karta pobytu)\b\s*(?:nr|numer|seria|:|-)?\s*([A-Z]{1,4}\s*\d[A-Z0-9]{2,}|\d{5,}[A-Z0-9]*)/i);
  if (full) return normalizeDocumentValue(`${full[1]} ${full[2]}`);
  return "";
}

function valueAfterMarker(text, markerVariants) {
  const labelPattern = markerVariants.map(escapeRegExp).join("|");
  const stopPattern = allLabels.map(escapeRegExp).join("|");
  const match = normalizeSpace(text).match(new RegExp(`(?:^|[\\s,;|])(?:${labelPattern})(?![A-Za-zÀ-ž]|-[A-Za-zÀ-ž])(?:\\s*[:=]|\\s*–|\\s+-)?\\s*(.*?)(?=(?:\\s+(?:${stopPattern})(?![A-Za-zÀ-ž]|-[A-Za-zÀ-ž])(?:\\s*[:=]|\\s*–|\\s+-)?\\s*)|$)`, "is"));
  return stripKnownNoise(match?.[1] || "");
}

// The text after the last "Auto:" / "Pojazd:", or "".
function vehicleMarkerContext(compact) {
  const marker = labels.vehicleMarker.map(escapeRegExp).join("|");
  const strictMatches = [...compact.matchAll(new RegExp(`(?:^|[\\s,;|])(?:${marker})(?![A-Za-zÀ-ž]|-[A-Za-zÀ-ž])(?:\\s*[:=]|\\s*–|\\s+-)\\s*(.*)$`, "gis"))];
  if (strictMatches.length) return normalizeSpace(strictMatches.at(-1)[1]);
  const looseMatches = [...compact.matchAll(new RegExp(`(?:^|[\\s,;|])(?:${marker})\\s+(.*)$`, "gis"))];
  return looseMatches.length ? normalizeSpace(looseMatches.at(-1)[1]) : "";
}

// The vehicle part of the paste: after "Auto:", from the line that starts with
// a car make ("BMW X5, 2019"), or — for fuel, gearbox, year — the whole text.
function vehicleContext(text, makeLine = "") {
  const compact = normalizeSpace(text);
  const marked = vehicleMarkerContext(compact);
  if (marked) return marked;
  const line = normalizeSpace(makeLine);
  return line && compact.includes(line) ? compact.slice(compact.indexOf(line)) : compact;
}

function hasVehicleSignal(text) {
  const compact = normalizeSpace(text);
  const lower = compact.toLowerCase();
  const marker = labels.vehicleMarker.map(escapeRegExp).join("|");
  if (new RegExp(`(?:^|[\\s,;|])(?:${marker})(?![A-Za-zÀ-ž]|-[A-Za-zÀ-ž])(?:\\s*[:=]|\\s*–|\\s+-)`, "i").test(compact)) return true;
  if ([labels.makeModel, labels.make, labels.model, labels.mileage, labels.fuel, labels.gearbox, labels.body].some((variants) => extractLabeled(compact, variants))) return true;
  if (/\b(firma|jdg|sp\.?\s*z\.?\s*o\.?o\.?|spółka|spolka|s\.a\.|krs|regon)\b/i.test(lower)) return false;
  return new RegExp(`(?:^|[\\s,;|])(?:${marker})\\s+`, "i").test(compact);
}

function firstRegistrationFallback(text) {
  return (
    normalizeSpace(text.match(/\b(?:19|20)\d{2}\s*-\s*(?:19|20)\d{2}\b/)?.[0] || "") ||
    normalizeSpace(text.match(/\b(?:19|20)\d{2}\+\b/)?.[0] || "") ||
    normalizeSpace(text.match(/\b(?:19|20)\d{2}\b/)?.[0] || "")
  );
}

// Lines are joined before labels are read, so "Przebieg do: 150000" followed
// by "diesel" on the next line reads "150000 diesel": keep only the number,
// and of "Rok: 2019-2022 diesel" only the years.
function yearPart(value) {
  return normalizeSpace(normalizeSpace(value).match(/^.*?(?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2}|\+)?/)?.[0] || value);
}

function mileagePart(value) {
  const match = normalizeSpace(value).match(/\d[\d\s.,]*(?:\s*(?:tys\.?|тыс\.?))?(?:\s*(?:km|км))?/i);
  return match ? normalizeSpace(match[0]).replace(/[\s.,]+$/, "") : normalizeSpace(value);
}

function mileageFallback(text) {
  return normalizeSpace(text.match(/\b\d[\d\s.,]{2,}\s*(?:km|км)\b/i)?.[0] || "");
}

function makeModelFallback(text) {
  // Up to the first comma or the next label: "BMW X5, przebieg do: 150000" → "BMW X5".
  const ownLabels = [...labels.makeModel, ...labels.make, ...labels.model];
  const stop = looseStopLabels.filter((label) => !ownLabels.includes(label)).map(escapeRegExp).join("|");
  const context = normalizeSpace(text)
    .split(/[,;|]/)[0]
    .replace(new RegExp(`(?:^|\\s)(?:${stop})(?![A-Za-zÀ-ž]).*$`, "i"), "");
  const cleaned = stripKnownNoise(
    context
      .replace(/\b(?:Marka|Model|Марка|Модель)\s*(?::|=|–|-)?\s*/gi, " ")
      .replace(/\b(?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2}|\+)?\b/g, " ")
  );
  const words = cleaned.match(/[A-ZŁŚŻŹĆŃÓĘĄ0-9][\w.+-]*/gi) || [];
  const filtered = words.filter((word) => !/^(auto|pojazd|samoch[oó]d|авто|rok|paliwo|skrzynia|benzyna|diesel|hybryda|elektryk|automat|automatyczna|manual|manualna|sedan|kombi|coupe)$/i.test(word));
  return normalizeSpace(filtered.slice(0, 4).join(" "));
}

const downloadOrder = ["docx", "pdf", "encrypted"];
const downloadUrlsByKind = new Map();
let currentPreviewUrl = null;

function statusMessageNode() {
  let message = statusEl.querySelector(".status-message");
  if (!message) {
    message = document.createElement("div");
    message.className = "status-message";
    statusEl.prepend(message);
  }
  return message;
}

function downloadListNode() {
  let list = statusEl.querySelector(".download-list");
  if (!list) {
    list = document.createElement("div");
    list.className = "download-list";
    statusEl.append(list);
  }
  return list;
}

// One row per document kind, always rendered DOCX -> PDF -> encrypted PDF, so
// clicking the buttons one after another stacks the three files instead of
// each result wiping the previous one.
function downloadRowNode(kind) {
  const list = downloadListNode();
  let row = list.querySelector(`[data-download-kind="${kind}"]`);
  if (!row) {
    row = document.createElement("div");
    row.className = "download-row";
    row.dataset.downloadKind = kind;
    const later = downloadOrder.slice(downloadOrder.indexOf(kind) + 1);
    const before = later.map((key) => list.querySelector(`[data-download-kind="${key}"]`)).find(Boolean);
    list.insertBefore(row, before || null);
  }
  return row;
}

function releaseDownload(kind) {
  const url = downloadUrlsByKind.get(kind);
  if (url) {
    URL.revokeObjectURL(url);
    downloadUrlsByKind.delete(kind);
  }
}

function setStatus(text) {
  const node = statusMessageNode();
  node.textContent = text;
  delete node.dataset.kind;
}

function clearStatus() {
  downloadOrder.forEach(releaseDownload);
  statusEl.innerHTML = "";
}

function setDownloadMessage(kind, text) {
  releaseDownload(kind);
  const row = downloadRowNode(kind);
  row.textContent = text;
}

function showPdfPreview(blob, filename, readyText) {
  if (!pdfPreview || !pdfPreviewMeta || !pdfPreviewDownload || !pdfPreviewPrint) return;
  if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  currentPreviewUrl = URL.createObjectURL(blob);
  pdfPreview.src = currentPreviewUrl;
  pdfPreviewMeta.textContent = `${readyText} ${filename}`;
  pdfPreviewDownload.href = currentPreviewUrl;
  pdfPreviewDownload.download = filename;
  pdfPreviewDownload.classList.remove("is-disabled");
  pdfPreviewDownload.removeAttribute("aria-disabled");
  pdfPreviewPrint.disabled = false;
}

function printPreviewPdf() {
  if (!currentPreviewUrl || !pdfPreview?.contentWindow) return;
  try {
    pdfPreview.contentWindow.focus();
    pdfPreview.contentWindow.print();
  } catch {
    setStatus("PDF jest gotowy. Użyj przycisku Drukuj w podglądzie dokumentu.");
  }
}

function showDownload(kind, { blob, filename, readyText, autoDownload = false, preview = false }) {
  releaseDownload(kind);
  const url = URL.createObjectURL(blob);
  downloadUrlsByKind.set(kind, url);

  const row = downloadRowNode(kind);
  row.textContent = "";
  const label = document.createElement("span");
  label.textContent = `${readyText} `;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.textContent = filename;
  row.append(label, link);

  if (preview) showPdfPreview(blob, filename, readyText);
  if (autoDownload) link.click();
}

function setGenerationBusy(busy) {
  generationInProgress = busy;
  ["generateBtn", "printBtn", "encryptBtn"].forEach((id) => {
    const button = $(id);
    if (button) button.disabled = busy;
  });
}

async function withGenerationLock(operation) {
  if (generationInProgress) return;
  setGenerationBusy(true);
  try {
    await operation();
  } finally {
    setGenerationBusy(false);
  }
}

function filenameFor(data, extension) {
  const makeModel = normalizeSpace(data.vehicle.make_model || "AUTO");
  const slug = makeModel
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `Umowa_Zamówienia_Pojazdu_${slug || "AUTO"}.${extension}`;
}

function updateDocumentFileName() {
  const node = $("documentFileName");
  if (node) node.textContent = filenameFor(collectData(), "pdf");
  updateSummary();
}

function summaryValue(value) {
  return normalizeSpace(value) || "Nie wskazano";
}

function updateSummary() {
  const clientNode = $("summaryClient");
  if (!clientNode) return;
  const data = collectData();
  $("summaryContractNumber").textContent = contractNumber(data.contract.date, data.contract.sequence);
  const sheetNumber = $("sheetContractNumber");
  if (sheetNumber) sheetNumber.textContent = contractNumber(data.contract.date, data.contract.sequence);
  clientNode.textContent = summaryValue(data.client.name);
  $("summaryVehicle").textContent = summaryValue(data.vehicle.make_model);
  $("summaryBudget").textContent = summaryValue(data.budget.total);
  $("summaryAdvance").textContent = summaryValue(data.budget.advance);
}

function setDefaultSelectValues() {
  $("clientDocumentType").value = "paszport";
  $("budgetCurrency").value = "EUR";
  $("advanceCurrency").value = "EUR";
}

function configureContractVariant() {
  if (!isExportContract) return;
  document.body.classList.add("export-contract");
  document.title = "AUTOGOOD Umowa Export";
  // .brand span also matches .brandDivider (a 1px rule) — the label is .brandTitle.
  // The variant is named by the "Eksport do Białorusi" pill on .brandTitle::after,
  // matching the "Umowa [Sprzedaż]" badge on the sale contract.
  const brandLabel = document.querySelector(".brandTitle");
  if (brandLabel) {
    brandLabel.textContent = "Umowa";
    // .brandTitle is the page heading, and its aria-label names the variant.
    // Setting textContent drops the Polska badge, so the name must follow the
    // pill that ::after puts there instead.
    brandLabel.setAttribute("aria-label", "Umowa — Eksport do Białorusi");
  }

  document.querySelectorAll("[data-subject-option]").forEach((label) => {
    const option = label.dataset.subjectOption;
    label.hidden = option === "mediation" || option === "financing";
  });

  const purchaseLabel = document.querySelector('[data-subject-option="purchase_by_autogood"] span');
  if (purchaseLabel) purchaseLabel.textContent = exportSubjectLabels.purchase_by_autogood;
  const purchaseOption = document.querySelector('[data-subject-option="purchase_by_autogood"]');
  const purchaseCheckbox = purchaseOption && purchaseOption.querySelector("input");
  if (purchaseCheckbox) purchaseCheckbox.remove();
  // Without a checkbox this is fixed contract wording, not a choice — it must
  // not look clickable.
  if (purchaseOption) purchaseOption.classList.add("fixed-term");
  const indicatedLabel = document.querySelector('[data-subject-option="client_indicated_vehicle"] span');
  if (indicatedLabel) indicatedLabel.textContent = exportSubjectLabels.client_indicated_vehicle;
  setRadio("commissionOption", exportDefaultCommission);
}

function readHistoryFromStorage(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? trimContractHistory(parsed) : [];
  } catch {
    return [];
  }
}

function trimContractHistory(entries) {
  const sorted = [...entries].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
    return new Date(right.savedAt || 0) - new Date(left.savedAt || 0);
  });
  const pinned = sorted.filter((entry) => entry.pinned);
  return [...pinned, ...sorted.filter((entry) => !entry.pinned).slice(0, contractHistoryLimit)];
}

function prepareContractHistoryStorage() {
  const current = readHistoryFromStorage(contractHistoryKey);
  const previous = readHistoryFromStorage(previousVariantHistoryKey);
  if (!current.length && previous.length) {
    localStorage.setItem(contractHistoryKey, JSON.stringify(trimContractHistory(previous)));
  }
  localStorage.removeItem(legacyContractHistoryKey);
  if (previousVariantHistoryKey !== contractHistoryKey) localStorage.removeItem(previousVariantHistoryKey);
}

function readContractHistory() {
  return readHistoryFromStorage(contractHistoryKey);
}

function writeContractHistory(items) {
  localStorage.setItem(contractHistoryKey, JSON.stringify(trimContractHistory(items)));
}

function collectFormSnapshot() {
  const ids = {};
  document.querySelectorAll("input[id], textarea[id], select[id]").forEach((node) => {
    ids[node.id] = node.type === "checkbox" || node.type === "radio" ? node.checked : node.value;
  });

  const radios = {};
  document.querySelectorAll('input[type="radio"][name]').forEach((node) => {
    if (node.checked) radios[node.name] = node.value;
  });

  const checkboxGroups = {};
  document.querySelectorAll('input[type="checkbox"][name]').forEach((node) => {
    if (!checkboxGroups[node.name]) checkboxGroups[node.name] = [];
    if (node.checked) checkboxGroups[node.name].push(node.value);
  });

  return {
    ids,
    radios,
    checkboxGroups,
    fuel: fuelValues(),
  };
}

function applyFormSnapshot(snapshot) {
  resetForm();
  for (const [id, value] of Object.entries(snapshot.ids || {})) {
    const node = $(id);
    if (!node) continue;
    if (node.type === "checkbox" || node.type === "radio") node.checked = Boolean(value);
    else node.value = value || "";
  }
  for (const [name, value] of Object.entries(snapshot.radios || {})) setRadio(name, value);
  for (const [name, values] of Object.entries(snapshot.checkboxGroups || {})) setCheckedValues(name, values);
  setFuel(snapshot.fuel || []);
  if (!isExportContract) applyContractCurrency($("budgetCurrency").value);
  syncContractCurrencyFromSelect();
  syncClientTypeRules();
  updateDocumentFileName();
  updateSummary();
  syncFontControls();
  scheduleOrderPreview();
}

function historyTitle(entry) {
  const ids = entry.snapshot?.ids || {};
  const client = normalizeSpace(ids.clientName || "Bez klienta");
  const vehicle = normalizeSpace(ids.vehicleMakeModel || "AUTO");
  return `${client} · ${vehicle}`;
}

function historyMeta(entry) {
  const ids = entry.snapshot?.ids || {};
  const date = ids.contractDate || todayISO();
  const sequence = ids.sequence || 1;
  const created = entry.savedAt ? new Date(entry.savedAt) : null;
  const savedLabel = created && !Number.isNaN(created.getTime()) ? created.toLocaleDateString("pl-PL") : "";
  return `Umowa ${contractNumber(date, sequence)}${savedLabel ? ` · zapisano ${savedLabel}` : ""}`;
}

function renderContractHistory() {
  const list = $("contractHistoryList");
  list.innerHTML = "";
  const history = readContractHistory();
  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Brak zapisanych danych.";
    list.append(empty);
    return;
  }

  history.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-restore";
    button.dataset.index = String(index);

    const title = document.createElement("strong");
    title.textContent = historyTitle(entry);
    const meta = document.createElement("span");
    meta.textContent = historyMeta(entry);
    button.append(title, meta);
    button.addEventListener("click", () => {
      applyFormSnapshot(entry.snapshot || {});
      setStatus("Dane z historii wczytane.");
    });

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = `history-favorite${entry.pinned ? " is-pinned" : ""}`;
    favorite.textContent = entry.pinned ? "★" : "☆";
    favorite.title = entry.pinned ? "Usuń z ulubionych" : "Dodaj do ulubionych";
    favorite.setAttribute("aria-label", favorite.title);
    favorite.addEventListener("click", () => {
      writeContractHistory(history.map((candidate) => candidate.id === entry.id ? { ...candidate, pinned: !entry.pinned } : candidate));
      renderContractHistory();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-delete";
    remove.setAttribute("aria-label", "Usuń zapis z historii");
    remove.title = "Usuń z historii";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      writeContractHistory(history.filter((candidate, candidateIndex) => (entry.id ? candidate.id !== entry.id : candidateIndex !== index)));
      renderContractHistory();
      setStatus("Zapis usunięty z historii.");
    });

    item.append(button, favorite, remove);
    list.append(item);
  });
}

function saveCurrentContractData() {
  const snapshot = collectFormSnapshot();
  const title = historyTitle({ snapshot });
  const history = readContractHistory().filter((entry) => JSON.stringify(entry.snapshot) !== JSON.stringify(snapshot));
  history.unshift({
    id: `${Date.now()}`,
    savedAt: new Date().toISOString(),
    title,
    snapshot,
    pinned: false,
  });
  writeContractHistory(history);
  renderContractHistory();
  setStatus("Dane zapisane w historii.");
}

function syncClientTypeRules() {
  const isCompany = !isExportContract && checkedRadio("clientType") === "company";
  const entrepreneur = $("clientEntrepreneur");
  if (entrepreneur) {
    entrepreneur.checked = isCompany;
    entrepreneur.disabled = isCompany;
  }
  $("clientDocumentType").disabled = isCompany;
  $("clientDocument").disabled = isCompany;
  if (isCompany) {
    $("clientDocumentType").value = "";
    $("clientDocument").value = "";
  }
}

function parseRawTextValue(text) {
  const compact = normalizeSpace(text);
  const makeLine = window.AutogoodClientRecognition.carMakeLine(text);
  const hasVehicle = hasVehicleSignal(compact) || Boolean(makeLine);
  const vehicleText = hasVehicle ? vehicleContext(compact, makeLine) : "";

  // "Marka i model: BMW X5" is one field, not "Marka" + "model".
  const makeAndModel = hasVehicle ? stripKnownNoise(extractLabeled(compact, labels.makeModel)) : "";
  const make = hasVehicle && !makeAndModel ? stripKnownNoise(extractLabeled(compact, labels.make)) : "";
  const model = hasVehicle && !makeAndModel ? stripKnownNoise(extractLabeled(compact, labels.model)) : "";
  // Without "Auto:" or a line that starts with a make the guess would take
  // the client's name: better to recognise nothing.
  const makeText = vehicleMarkerContext(compact) || (makeLine ? vehicleText : "");
  const makeModel = hasVehicle ? makeAndModel || normalizeSpace(`${make} ${model}`) || (makeText && makeModelFallback(makeText)) : "";
  const budgetMoney = parseMoneyValue(extractLabeled(compact, labels.budget) || moneyMatch(valueAfterMarker(compact, labels.budget)));
  const depositMoney = parseMoneyValue(extractLabeled(compact, labels.deposit) || moneyMatch(valueAfterMarker(compact, labels.deposit)));
  const documentValue = parseDocumentValue(compact) || documentFallback(compact);
  const documentParts = splitDocumentValue(documentValue);
  // Name, address, PESEL/NIP, phone and e-mail follow the owner's rules in one
  // shared module (src/client-recognition.js, docs/PROJECT-UMOWY.md §6).
  const recognized = window.AutogoodClientRecognition.recognizeClient(text);
  const yearValue = hasVehicle ? yearPart(extractLabeled(compact, labels.year)) || firstRegistrationFallback(vehicleText) : "";
  const mileageValue = hasVehicle ? mileagePart(extractLabeled(compact, labels.mileage)) || mileageFallback(vehicleText) : "";
  const fuelValue = hasVehicle ? extractLabeled(compact, labels.fuel) || vehicleText : "";
  const gearboxValue = hasVehicle ? extractLabeled(compact, labels.gearbox) || vehicleText : "";
  const bodyValue = hasVehicle ? extractLabeled(compact, labels.body) || bodyFallback(vehicleText) : "";
  const requiredEquipment = hasVehicle ? extractLabeled(compact, labels.extra) : "";
  const expectedEquipment = hasVehicle ? extractLabeled(compact, labels.expectedExtra) : "";

  return {
    client: {
      type: recognized.type,
      name: recognized.name,
      address: recognized.address,
      identifier: recognized.identifier,
      document: recognized.type === "company" ? "" : documentParts.number || documentValue,
      document_type: recognized.type === "company" ? "" : documentParts.type || "dowód osobisty",
      document_number: recognized.type === "company" ? "" : documentParts.number || documentValue,
      phone: recognized.phone,
      email: recognized.email,
    },
    budget: {
      total: budgetMoney.amount,
      total_currency: budgetMoney.currency,
      advance: depositMoney.amount,
      advance_currency: depositMoney.currency,
    },
    vehicle: {
      make_model: makeModel,
      fuel: parseFuel(fuelValue),
      gearbox: parseGearbox(gearboxValue),
      first_registration: yearValue,
      mileage_to: mileageValue,
      body: parseBody(bodyValue),
      required_equipment: requiredEquipment,
      expected_equipment: expectedEquipment,
    },
  };
}

function sameClientName(a, b) {
  return normalizeSpace(a).toLowerCase() === normalizeSpace(b).toLowerCase();
}

// A pasted text with another client's name starts a new client: the fields
// the text does not fill must not keep the previous client's phone or e-mail.
function clearClientFields() {
  for (const id of ["clientAddress", "clientIdentifier", "clientDocument", "clientPhone", "clientEmail", "fontSize_address"]) {
    if ($(id)) $(id).value = "";
  }
  $("clientDocumentType").value = "paszport";
  if ($("clientEntrepreneur")) $("clientEntrepreneur").checked = false;
  delete lastDrawnSizes.address;
  syncFontControls();
}

function applyParsed(data) {
  const currentName = $("clientName").value;
  if (data.client?.name && currentName.trim() && !sameClientName(data.client.name, currentName)) clearClientFields();
  if (data.client?.type) {
    setRadio("clientType", isExportContract ? "person" : data.client.type);
    syncClientTypeRules();
  }
  $("clientName").value = data.client?.name || $("clientName").value;
  $("clientAddress").value = data.client?.address || $("clientAddress").value;
  $("clientIdentifier").value = data.client?.identifier || $("clientIdentifier").value;
  $("clientDocumentType").value = data.client?.document_type || $("clientDocumentType").value;
  $("clientDocument").value = data.client?.document_number || data.client?.document || $("clientDocument").value;
  $("clientPhone").value = data.client?.phone || $("clientPhone").value;
  $("clientEmail").value = data.client?.email || $("clientEmail").value;
  $("budgetTotal").value = data.budget?.total || $("budgetTotal").value;
  if (data.budget?.total) $("budgetCurrency").value = data.budget.total_currency || $("budgetCurrency").value;
  $("budgetAdvance").value = data.budget?.advance || $("budgetAdvance").value;
  if (data.budget?.advance) $("advanceCurrency").value = data.budget.advance_currency || $("advanceCurrency").value;
  if (!isExportContract && (data.budget?.total || data.budget?.advance)) {
    applyContractCurrency((data.budget.total && data.budget.total_currency) || data.budget.advance_currency);
  }
  syncContractCurrencyFromSelect();
  $("vehicleMakeModel").value = data.vehicle?.make_model || $("vehicleMakeModel").value;
  if (data.vehicle?.fuel) setFuel(data.vehicle.fuel);
  if (data.vehicle?.gearbox) setCheckedValues("gearbox", data.vehicle.gearbox);
  if (data.vehicle?.body) setCheckedValues("bodyType", bodyTypes(data.vehicle.body));
  $("bodyOther").value = data.vehicle?.body?.other || $("bodyOther").value;
  $("firstRegistration").value = data.vehicle?.first_registration || $("firstRegistration").value;
  $("mileageTo").value = data.vehicle?.mileage_to || $("mileageTo").value;
  $("requiredEquipment").value = data.vehicle?.required_equipment || $("requiredEquipment").value;
  $("expectedEquipment").value = data.vehicle?.expected_equipment || $("expectedEquipment").value;
  syncClientTypeRules();
  updateDocumentFileName();
  updateSummary();
  scheduleOrderPreview();
}

function collectData() {
  const clientType = isExportContract ? "person" : checkedRadio("clientType") || "person";
  const isCompany = clientType === "company";
  const entrepreneur = $("clientEntrepreneur");
  return {
    contract: {
      date: $("contractDate").value || todayISO(),
      sequence: Number($("sequence").value || 1),
    },
    client: {
      type: clientType,
      is_entrepreneur: !isExportContract && (isCompany || Boolean(entrepreneur?.checked)),
      name: $("clientName").value.trim(),
      address: $("clientAddress").value.trim(),
      pesel: isCompany ? "" : $("clientIdentifier").value.trim(),
      nip: isCompany ? $("clientIdentifier").value.trim() : "",
      document: isCompany ? "" : composeDocumentValue($("clientDocumentType").value, $("clientDocument").value),
      phone: $("clientPhone").value.trim(),
      email: $("clientEmail").value.trim(),
    },
    agreement: {
      subjects: checkedValues("subject"),
      client_indicated_vehicle: $("clientIndicatedVehicle").checked,
      indicated_vehicle_link: $("indicatedVehicleLink")?.value.trim() || "",
    },
    budget: {
      total: formatMoneyValue($("budgetTotal").value, $("budgetCurrency").value),
      advance: formatMoneyValue($("budgetAdvance").value, $("advanceCurrency").value),
      total_currency: $("budgetCurrency").value,
      advance_purposes: checkedValues("advancePurpose"),
    },
    compensation: {
      commission: checkedRadio("commissionOption") || exportDefaultCommission,
    },
    vehicle: {
      make_model: $("vehicleMakeModel").value.trim(),
      fuel: fuelValues(),
      gearbox: checkedValues("gearbox"),
      euro_standard: checkedRadio("euroStandard"),
      euro_other: $("euroOther")?.value.trim() || "",
      first_registration: $("firstRegistration").value.trim(),
      mileage_to: $("mileageTo").value.trim(),
      body: {
        type: checkedValues("bodyType")[0] || "",
        types: checkedValues("bodyType"),
        other: $("bodyOther").value.trim(),
      },
      allow_collision_without_longitudinals: $("allowCollision").checked,
      required_equipment: $("requiredEquipment").value.trim(),
      expected_equipment: $("expectedEquipment").value.trim(),
    },
    // Font size (pt) picked by hand with A− / A+, 0 = automatic.
    fonts: Object.fromEntries(Object.keys(fontSizeFields).map((key) => [key, Number($(`fontSize_${key}`)?.value) || 0])),
  };
}

function checkedKeys(data) {
  const checks = new Set();
  const subjects = new Set(data.agreement.subjects || (data.agreement.subject ? [data.agreement.subject] : []));
  if (!isExportContract && (data.client.is_entrepreneur || data.client.type === "company")) checks.add("client_is_entrepreneur");
  if (!isExportContract && subjects.has("mediation")) checks.add("subject_mediation");
  if (subjects.has("purchase_by_autogood")) checks.add("subject_purchase_by_autogood");
  if (!isExportContract && subjects.has("financing")) checks.add("subject_financing");
  if (data.agreement.client_indicated_vehicle) checks.add("subject_client_indicated_vehicle");
  for (const fuel of data.vehicle.fuel || []) checks.add(`fuel_${fuel}`);
  for (const gearbox of asArray(data.vehicle.gearbox)) checks.add(`gearbox_${gearbox}`);
  if (data.vehicle.euro_standard) checks.add(`euro_${data.vehicle.euro_standard}`);
  for (const type of bodyTypes(data.vehicle.body)) checks.add(`body_${type}`);
  if (data.vehicle.allow_collision_without_longitudinals) checks.add("allow_collision");
  return checks;
}

function directChildren(parent, namespace, localName) {
  return [...parent.childNodes].filter((node) => node.nodeType === 1 && node.namespaceURI === namespace && node.localName === localName);
}

function all(parent, namespace, localName) {
  return [...parent.getElementsByTagNameNS(namespace, localName)];
}

function wEl(doc, name, attrs = {}) {
  const el = doc.createElementNS(W, `w:${name}`);
  for (const [key, value] of Object.entries(attrs)) el.setAttributeNS(W, `w:${key}`, value);
  return el;
}

function makeRun(doc, text, { size = 18, bold = false, underline = false, breakBefore = false, font = "Calibri", color = "" } = {}) {
  const r = wEl(doc, "r");
  const rPr = wEl(doc, "rPr");
  rPr.append(wEl(doc, "rFonts", { ascii: font, hAnsi: font, cs: font, eastAsia: font }));
  if (bold) rPr.append(wEl(doc, "b"));
  else rPr.append(wEl(doc, "b", { val: "0" }), wEl(doc, "bCs", { val: "0" }));
  if (underline) rPr.append(wEl(doc, "u", { val: "single" }));
  if (color) rPr.append(wEl(doc, "color", { val: color }));
  rPr.append(wEl(doc, "sz", { val: String(size) }));
  r.append(rPr);
  if (breakBefore) r.append(wEl(doc, "br"));
  const t = wEl(doc, "t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = text || "";
  r.append(t);
  return r;
}

function setParagraphText(p, text, { size = 18, bold = false } = {}) {
  for (const run of directChildren(p, W, "r")) run.remove();
  const doc = p.ownerDocument;
  p.append(makeRun(doc, text, { size, bold }));
}

function setParagraphLabelValue(p, label, value, { size = 18, valueSize = 18, valueBreak = true } = {}) {
  for (const run of directChildren(p, W, "r")) run.remove();
  const doc = p.ownerDocument;
  p.append(makeRun(doc, label, { size, bold: true, underline: true }));
  if (value) {
    const text = valueBreak ? value : ` ${value}`;
    p.append(makeRun(doc, text, { size: valueSize, bold: false, breakBefore: valueBreak }));
  }
}

function setParagraphLabel(p, label, { size = 18 } = {}) {
  for (const run of directChildren(p, W, "r")) run.remove();
  p.append(makeRun(p.ownerDocument, label, { size, bold: true, underline: true }));
}

function setParagraphValueAfterPrefix(p, prefix, value, { size = 18 } = {}) {
  let remaining = prefix.length;
  let reachedPrefixEnd = false;

  for (const child of [...p.childNodes]) {
    if (child.namespaceURI !== W || child.localName !== "r") continue;
    const textNodes = all(child, W, "t");
    const runText = textNodes.map((t) => t.textContent || "").join("");

    if (!reachedPrefixEnd) {
      if (remaining > runText.length) {
        remaining -= runText.length;
        continue;
      }

      if (remaining === runText.length) {
        reachedPrefixEnd = true;
        continue;
      }

      const firstText = textNodes[0];
      if (firstText) firstText.textContent = runText.slice(0, remaining);
      for (const textNode of textNodes.slice(1)) textNode.textContent = "";
      reachedPrefixEnd = true;
      continue;
    }

    child.remove();
  }

  p.append(makeRun(p.ownerDocument, value ? ` ${value}` : "", { size, bold: false }));
}

function applyRunStyle(run, { size = 18, bold = true, underline = true } = {}) {
  let rPr = directChildren(run, W, "rPr")[0];
  if (!rPr) {
    rPr = wEl(run.ownerDocument, "rPr");
    run.insertBefore(rPr, run.firstChild);
  }
  for (const tag of ["b", "bCs", "u", "sz", "szCs"]) {
    for (const el of directChildren(rPr, W, tag)) el.remove();
  }
  if (bold) rPr.append(wEl(run.ownerDocument, "b"), wEl(run.ownerDocument, "bCs"));
  if (underline) rPr.append(wEl(run.ownerDocument, "u", { val: "single" }));
  rPr.append(wEl(run.ownerDocument, "sz", { val: String(size) }), wEl(run.ownerDocument, "szCs", { val: String(size) }));
}

function setRunStrikethrough(run, enabled) {
  let rPr = directChildren(run, W, "rPr")[0];
  if (!rPr) {
    rPr = wEl(run.ownerDocument, "rPr");
    run.insertBefore(rPr, run.firstChild);
  }
  directChildren(rPr, W, "strike").forEach((node) => node.remove());
  if (enabled) rPr.append(wEl(run.ownerDocument, "strike"));
}

function setClientIdentifierLabel(rows, clientType) {
  const label = paragraph(rows[4]?.[0], 1);
  if (!label) return;
  const inactiveLabel = clientType === "company" ? "PESEL" : "NIP";
  directChildren(label, W, "r").forEach((run) => {
    const text = all(run, W, "t").map((node) => node.textContent || "").join("").trim();
    if (text === "PESEL" || text === "NIP") setRunStrikethrough(run, text === inactiveLabel);
  });
}

function styleParagraphPrefix(p, prefix, options = {}) {
  let remaining = prefix.length;
  for (const run of directChildren(p, W, "r")) {
    const runText = all(run, W, "t").map((t) => t.textContent || "").join("");
    if (!runText) continue;
    applyRunStyle(run, options);
    remaining -= runText.length;
    if (remaining <= 0) return;
  }
}

function setParagraphLastRunText(p, value) {
  const runs = directChildren(p, W, "r");
  const lastRun = runs[runs.length - 1];
  if (!lastRun) return;
  const textNode = all(lastRun, W, "t")[0];
  if (!textNode) return;
  applyRunStyle(lastRun, { size: 18, bold: false, underline: false });
  textNode.textContent = value || " ";
}

function tableRows(root) {
  const tbl = all(root, W, "tbl")[0];
  return directChildren(tbl, W, "tr").map((row) => directChildren(row, W, "tc"));
}

function paragraph(cell, index) {
  return directChildren(cell, W, "p")[index];
}

function clearCellContent(cell) {
  for (const child of [...cell.childNodes]) {
    if (child.namespaceURI === W && child.localName === "tcPr") continue;
    child.remove();
  }
}

function cellProperties(cell) {
  let tcPr = directChildren(cell, W, "tcPr")[0];
  if (!tcPr) {
    tcPr = wEl(cell.ownerDocument, "tcPr");
    cell.insertBefore(tcPr, cell.firstChild);
  }
  return tcPr;
}

function setCellVerticalAlign(cell, value) {
  const tcPr = cellProperties(cell);
  for (const align of directChildren(tcPr, W, "vAlign")) align.remove();
  tcPr.append(wEl(cell.ownerDocument, "vAlign", { val: value }));
}

function makeParagraph(doc, runs, { align = "", left = "", hanging = "" } = {}) {
  const p = wEl(doc, "p");
  if (align || left || hanging) {
    const pPr = wEl(doc, "pPr");
    if (align) pPr.append(wEl(doc, "jc", { val: align }));
    if (left || hanging) {
      const indAttrs = {};
      if (left) indAttrs.left = left;
      if (hanging) indAttrs.hanging = hanging;
      pPr.append(wEl(doc, "ind", indAttrs));
    }
    p.append(pPr);
  }
  for (const run of runs) p.append(makeRun(doc, run.text, run));
  return p;
}

function setCellParagraphs(cell, paragraphs) {
  clearCellContent(cell);
  const doc = cell.ownerDocument;
  for (const paragraphData of paragraphs) cell.append(makeParagraph(doc, paragraphData.runs, paragraphData.options || {}));
}

function setCheckboxGlyph(textEl, checked) {
  textEl.textContent = checked ? "☑" : "☐";
  const run = textEl.parentNode;
  if (!run || run.namespaceURI !== W || run.localName !== "r") return;
  let rPr = directChildren(run, W, "rPr")[0];
  if (!rPr) {
    rPr = wEl(run.ownerDocument, "rPr");
    run.insertBefore(rPr, run.firstChild);
  }
  for (const fontEl of directChildren(rPr, W, "rFonts")) fontEl.remove();
  rPr.insertBefore(
    wEl(run.ownerDocument, "rFonts", {
      ascii: "DejaVu Sans",
      hAnsi: "DejaVu Sans",
      cs: "DejaVu Sans",
      eastAsia: "DejaVu Sans",
    }),
    rPr.firstChild
  );
}

function setDocxCheckboxes(root, data) {
  const selected = checkedKeys(data);
  const checkedNumbers = new Set([...selected].map((key) => checkboxIndex[key]).filter(Boolean));
  const controls = all(root, W, "sdt").filter((sdt) => all(sdt, W14, "checkbox").length);
  controls.forEach((sdt, index) => {
    const checked = checkedNumbers.has(index + 1);
    for (const checkedEl of all(sdt, W14, "checked")) checkedEl.setAttributeNS(W14, "w14:val", checked ? "1" : "0");
    const textEl = all(sdt, W, "t").find((node) => ["¨", "þ", "☐", "☒", "☑"].includes(node.textContent || ""));
    if (textEl) setCheckboxGlyph(textEl, checked);
  });
}

function paragraphText(p) {
  return all(p, W, "t")
    .map((node) => node.textContent || "")
    .join("")
    .trim();
}

function ensureParagraphProperties(p) {
  let pPr = directChildren(p, W, "pPr")[0];
  if (!pPr) {
    pPr = wEl(p.ownerDocument, "pPr");
    p.insertBefore(pPr, p.firstChild);
  }
  return pPr;
}

function compactAppendixLayout(root) {
  const body = directChildren(root, W, "body")[0];
  if (!body) return;
  const children = directChildren(body, W, "p");
  const startIndex = children.findIndex((p) => paragraphText(p) === "ZAŁĄCZNIK DO UMOWY ZAMÓWIENIA POJAZDU");
  if (startIndex < 0) return;

  for (const p of children.slice(startIndex)) {
    const pPr = ensureParagraphProperties(p);
    let spacing = directChildren(pPr, W, "spacing")[0];
    if (!spacing) {
      spacing = wEl(p.ownerDocument, "spacing");
      pPr.append(spacing);
    }
    for (const attr of ["before", "after", "beforeAutospacing", "afterAutospacing"]) spacing.removeAttributeNS(W, attr);
    spacing.setAttributeNS(W, "w:before", "0");
    spacing.setAttributeNS(W, "w:after", "0");
    spacing.setAttributeNS(W, "w:line", "155");
    spacing.setAttributeNS(W, "w:lineRule", "exact");

    let snapToGrid = directChildren(pPr, W, "snapToGrid")[0];
    if (!snapToGrid) {
      snapToGrid = wEl(p.ownerDocument, "snapToGrid");
      pPr.append(snapToGrid);
    }
    snapToGrid.setAttributeNS(W, "w:val", "0");
  }
}

function checkboxText(checked) {
  return checked ? "☑" : "☐";
}

function removeParagraphsContainingText(cell, text) {
  for (const p of directChildren(cell, W, "p")) {
    if (paragraphText(p).includes(text)) p.remove();
  }
}

function setExportClientBlock(rows, data) {
  const docValue = data.client.type === "company" ? "" : data.client.document;
  removeParagraphsContainingText(rows[2][0], "Zleceniodawca jest przedsiębiorcą");
  setCellParagraphs(rows[4][0], [
    { runs: [{ text: "Rodzaj, numer i seria dokumentu tożsamości:", bold: true, underline: true }] },
    { runs: [{ text: docValue || " " }] },
  ]);
  setCellParagraphs(rows[5][0], [
    {
      runs: [
        { text: "Nr. tel.:", bold: true, underline: true },
        { text: data.client.phone ? ` ${data.client.phone}` : " " },
      ],
    },
    {
      runs: [
        { text: "E-mail:", bold: true, underline: true },
        { text: data.client.email ? ` ${data.client.email}` : " " },
      ],
    },
  ]);
  setCellParagraphs(rows[6][0], [{ runs: [{ text: " " }] }]);
}

function setExportSubjectBlock(rows, data) {
  const indicatedChecked = data.agreement.client_indicated_vehicle;
  setCellParagraphs(rows[9][0], [
    {
      options: { align: "left" },
      runs: [{ text: exportSubjectLabels.purchase_by_autogood }],
    },
    {
      options: { align: "left" },
      runs: [
        { text: checkboxText(indicatedChecked), font: "DejaVu Sans", size: 28, color: "0070C0" },
        { text: ` ${exportSubjectLabels.client_indicated_vehicle}` },
      ],
    },
  ]);
}

function setExportCompensationBlock(rows, data) {
  const cell = rows[14][0];
  setCellVerticalAlign(cell, "center");
  setCellParagraphs(cell, [
    {
      options: { align: "left" },
      runs: [{ text: "1. Za usługę wyszukania i zakupu pojazdu:", bold: true, underline: true }],
    },
    {
      options: { align: "left" },
      runs: [{ text: data.compensation?.commission || exportDefaultCommission }],
    },
  ]);
}

function applyExportContractLayout(rows, data) {
  setExportClientBlock(rows, data);
  setExportSubjectBlock(rows, data);
  setExportCompensationBlock(rows, data);
}

async function generateDocx() {
  if (!window.JSZip) throw new Error("JSZip nie został załadowany.");
  saveCurrentContractData();
  const data = collectData();
  const zip = await JSZip.loadAsync(await loadTemplateBytes());
  const xmlText = await zip.file("word/document.xml").async("text");
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const root = xml.documentElement;
  const rows = tableRows(root);

  const idValue = data.client.type === "company" ? data.client.nip : data.client.pesel;
  const docValue = data.client.type === "company" ? "" : data.client.document;
  const bodyOther = bodyTypes(data.vehicle.body).includes("inne") && data.vehicle.body.other ? ` ${data.vehicle.body.other}` : "";

  setParagraphText(all(root, W, "p")[0], polishDateLine(data.contract.date), { size: 28 });
  setParagraphText(all(root, W, "p")[1], `UMOWA ZAMÓWIENIA POJAZDU ${contractNumber(data.contract.date, data.contract.sequence)}`, { size: 34, bold: true });
  setParagraphLabelValue(paragraph(rows[2][0], 1), "Imię i Nazwisko/Nazwa:", data.client.name);
  setParagraphText(paragraph(rows[3][0], 2), data.client.address);
  setClientIdentifierLabel(rows, data.client.type);
  setParagraphText(paragraph(rows[4][0], 2), idValue);
  setParagraphText(paragraph(rows[5][0], 2), docValue);
  setParagraphValueAfterPrefix(paragraph(rows[6][0], 1), "Nr. tel.:", data.client.phone);
  setParagraphValueAfterPrefix(paragraph(rows[6][0], 2), "E-mail:", data.client.email);
  setParagraphLabel(paragraph(rows[7][2], 1), "Marka i model:");
  setParagraphText(paragraph(rows[7][2], 2), data.vehicle.make_model);
  setParagraphValueAfterPrefix(paragraph(rows[10][2], 2), "Wiek (pierwsza rejestracja w roku/latach):", data.vehicle.first_registration);
  setParagraphValueAfterPrefix(paragraph(rows[11][2], 2), "Przebieg do (km):", data.vehicle.mileage_to);
  setParagraphLabelValue(paragraph(rows[11][0], 1), "Budżet:", data.budget.total, { valueBreak: false });
  setParagraphLabelValue(paragraph(rows[12][0], 1), "Zaliczka:", data.budget.advance, { valueBreak: false });
  styleParagraphPrefix(paragraph(rows[12][2], 0), "Nadwozie:");
  setParagraphLastRunText(paragraph(rows[12][2], 0), bodyOther ? bodyOther : " ");
  setParagraphText(paragraph(rows[13][2], 2), data.vehicle.required_equipment);
  setParagraphText(paragraph(rows[15][2], 2), data.vehicle.expected_equipment);
  setDocxCheckboxes(root, data);
  if (isExportContract) applyExportContractLayout(rows, data);
  compactAppendixLayout(root);

  const serialized = new XMLSerializer().serializeToString(xml);
  zip.file("word/document.xml", serialized);
  return new Blob([await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 3 } })], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

async function loadTemplateBytes() {
  if (!templateBytesPromise) {
    templateBytesPromise = fetch(templateUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Nie można pobrać szablonu DOCX.");
        return response.arrayBuffer();
      })
      .catch((error) => {
        templateBytesPromise = null;
        throw error;
      });
  }
  return await templateBytesPromise;
}

/* --- Polish contract: PDF drawn in the browser ------------------------------ */

const orderAssetPromises = new Map();

function orderAsset(url) {
  if (!orderAssetPromises.has(url)) {
    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Nie można pobrać szablonu umowy.");
        return response.arrayBuffer();
      })
      .catch((error) => {
        orderAssetPromises.delete(url);
        throw error;
      });
    orderAssetPromises.set(url, promise);
  }
  return orderAssetPromises.get(url).then((bytes) => bytes.slice(0));
}

function polishDateText(dateValue) {
  const date = parseDate(dateValue);
  return `${date.getDate()} ${polishMonths[date.getMonth() + 1]} ${date.getFullYear()}`;
}

// "185000 PLN brutto" → "185 000 PLN brutto", the way numbers read in the contract.
function groupDigits(value) {
  return String(value || "").replace(/\d{4,}/g, (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
}

function orderContractFromData(data) {
  const isCompany = data.client.type === "company";
  const subjects = new Set(asArray(data.agreement.subjects));
  const hasAmount = Boolean(data.budget.total || data.budget.advance);
  return {
    number: contractNumber(data.contract.date, data.contract.sequence),
    date: polishDateText(data.contract.date),
    client: {
      name: data.client.name,
      address: data.client.address,
      identifier: isCompany ? data.client.nip : data.client.pesel,
      document: isCompany ? "" : data.client.document,
      phone: data.client.phone,
      email: data.client.email,
      isEntrepreneur: data.client.is_entrepreneur,
    },
    variants: [["mediation", 1], ["purchase_by_autogood", 2], ["financing", 3]].filter(([key]) => subjects.has(key)).map(([, number]) => number),
    indicatedVehicle: data.agreement.client_indicated_vehicle,
    indicatedLink: data.agreement.indicated_vehicle_link,
    vehicle: {
      makeModel: data.vehicle.make_model,
      years: data.vehicle.first_registration,
      mileageTo: groupDigits(data.vehicle.mileage_to),
      fuels: asArray(data.vehicle.fuel),
      gearboxes: asArray(data.vehicle.gearbox),
      bodies: bodyTypes(data.vehicle.body),
      bodyOther: data.vehicle.body.other,
      euro: data.vehicle.euro_standard,
      euroOther: data.vehicle.euro_other,
      allowRepaired: data.vehicle.allow_collision_without_longitudinals,
      required: data.vehicle.required_equipment,
      expected: data.vehicle.expected_equipment,
    },
    // pkt 11: one currency for the whole contract; ticked once there is an amount.
    currency: hasAmount ? data.budget.total_currency : "",
    budget: groupDigits(data.budget.total),
    advance: groupDigits(data.budget.advance),
    advancePurposes: asArray(data.budget.advance_purposes),
    fontSizes: data.fonts || {},
  };
}

// Long values whose size in the contract the manager may change by hand.
// `auto`: the size the template uses for it; the page field scales with it.
const fontSizeFields = {
  address: { input: "clientAddress", auto: 8 },
  link: { input: "indicatedVehicleLink", auto: 7.5 },
  required: { input: "requiredEquipment", auto: 8 },
  expected: { input: "expectedEquipment", auto: 8 },
};
const FIELD_FONT_PX = 14.5;
let lastDrawnSizes = {};

function fontSizeLimits(key) {
  const manual = window.AutogoodOrderContractPdf?.MANUAL || { min: 5, maxCell: 9, maxInline: 8.5, step: 0.5 };
  return { min: manual.min, max: key === "link" ? manual.maxInline : manual.maxCell, step: manual.step };
}

function formatPt(size) {
  return String(size).replace(".", ",");
}

function syncFontControls() {
  document.querySelectorAll(".font-size-control[data-font-field]").forEach((control) => {
    const key = control.dataset.fontField;
    const field = fontSizeFields[key];
    const manual = Number($(`fontSize_${key}`)?.value) || 0;
    const shown = manual || lastDrawnSizes[key] || field.auto;
    const { min, max } = fontSizeLimits(key);
    control.classList.toggle("is-manual", Boolean(manual));
    control.querySelector(".font-size-value").textContent = manual ? `${formatPt(manual)} pt` : `auto ${formatPt(shown)}`;
    control.querySelector('[data-font-step="-1"]').disabled = shown <= min;
    control.querySelector('[data-font-step="1"]').disabled = shown >= max;
    const input = $(field.input);
    if (input) input.style.fontSize = manual ? `${((FIELD_FONT_PX * manual) / field.auto).toFixed(1)}px` : "";
  });
}

function stepFontSize(key, step) {
  const hidden = $(`fontSize_${key}`);
  if (!hidden) return;
  if (!step) {
    hidden.value = "";
  } else {
    const { min, max, step: delta } = fontSizeLimits(key);
    const current = Number(hidden.value) || lastDrawnSizes[key] || fontSizeFields[key].auto;
    // From an automatic 6.75 pt, A− goes to 6.5 and A+ to 7.
    const next = step < 0 ? Math.ceil(current / delta) * delta - delta : Math.floor(current / delta) * delta + delta;
    hidden.value = String(Math.min(max, Math.max(min, next)));
  }
  syncFontControls();
  scheduleOrderPreview();
}

// Field of the form behind each place in the contract, to point at the one
// whose text does not fit.
const orderFieldInputs = {
  name: "clientName",
  address: "clientAddress",
  identifier: "clientIdentifier",
  document: "clientDocument",
  phone: "clientPhone",
  email: "clientEmail",
  link: "indicatedVehicleLink",
  makeModel: "vehicleMakeModel",
  years: "firstRegistration",
  mileageTo: "mileageTo",
  bodyOther: "bodyOther",
  euroOther: "euroOther",
  required: "requiredEquipment",
  expected: "expectedEquipment",
  budget: "budgetTotal",
  advance: "budgetAdvance",
};

function markOrderFieldError(error) {
  document.querySelectorAll(".order-sheet .is-invalid").forEach((node) => node.classList.remove("is-invalid"));
  const input = error?.field && $(orderFieldInputs[error.field]);
  if (input) input.classList.add("is-invalid");
}

async function buildOrderContractPdf(data = collectData()) {
  const generator = window.AutogoodOrderContractPdf;
  if (!generator || !window.PDFLib?.PDFDocument || !window.fontkit) {
    throw new Error("Silnik przygotowania PDF nie został załadowany. Odśwież stronę.");
  }
  const [templateBytes, fontBytes] = await Promise.all([orderAsset(orderPdfTemplateUrl), orderAsset(orderPdfFontUrl)]);
  const contract = orderContractFromData(data);
  const report = {};
  try {
    const bytes = await generator.build({
      report,
      PDFLib: window.PDFLib,
      fontkit: window.fontkit,
      templateBytes,
      fontBytes,
      contract,
      title: `Umowa zamówienia pojazdu nr ${contract.number}`,
    });
    markOrderFieldError(null);
    lastDrawnSizes = report.sizes || {};
    syncFontControls();
    return new Blob([bytes], { type: "application/pdf" });
  } catch (error) {
    markOrderFieldError(error);
    throw error;
  }
}

// The document is drawn locally in a fraction of a second, so the preview
// follows the form as it is filled in — the page and the PDF stay side by side.
let orderPreviewTimer = null;
let orderPreviewRun = 0;

function scheduleOrderPreview() {
  if (isExportContract) return;
  window.clearTimeout(orderPreviewTimer);
  orderPreviewTimer = window.setTimeout(updateOrderPreview, 450);
}

async function updateOrderPreview() {
  const run = (orderPreviewRun += 1);
  try {
    const data = collectData();
    const blob = await buildOrderContractPdf(data);
    if (run !== orderPreviewRun) return;
    showPdfPreview(blob, filenameFor(data, "pdf"), "Podgląd na żywo:");
    if (statusMessageNode().dataset.kind === "fit") setStatus("");
  } catch (error) {
    if (run !== orderPreviewRun) return;
    setStatus(String(error.message || error));
    statusMessageNode().dataset.kind = "fit";
  }
}

function converterEndpoint(path) {
  const configuredEndpoint = String(window.AUTOGOOD_PDF_CONVERTER_URL || "").trim();
  const endpoint = configuredEndpoint || defaultPdfConverterUrl;
  return endpoint.replace(/\/api\/convert-docx-to-pdf\/?$/i, path);
}

async function encryptPdfBlob(pdfBlob, filename, password) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), pdfConversionTimeoutMs);
  try {
    const response = await fetch(converterEndpoint("/api/encrypt-pdf"), {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-Filename": encodeURIComponent(filename),
        "X-PDF-Password": window.AUTOGOOD_PDF_ENCRYPTION.encodePassword(password),
      },
      body: pdfBlob,
      signal: controller.signal,
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || `Serwer szyfrowania odpowiedział błędem (${response.status}).`);
    }
    return await response.blob();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Szyfrowanie PDF przekroczyło limit czasu.");
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// One currency for budget and advance (pkt 11): the WALUTA choice drives both
// amount selects, which the export contract still shows separately.
function syncContractCurrencyFromSelect() {
  setRadio("contractCurrency", $("budgetCurrency").value);
}

function applyContractCurrency(value) {
  if (!value) return;
  $("budgetCurrency").value = value;
  $("advanceCurrency").value = value;
}

async function convertDocxBlobToPdf(docxBlob, filename, password = "") {
  const configuredEndpoint = String(window.AUTOGOOD_PDF_CONVERTER_URL || "").trim();
  const endpoint = configuredEndpoint || defaultPdfConverterUrl;
  if (!configuredEndpoint && /\.github\.io$/i.test(window.location.hostname)) {
    throw new Error("Konwerter DOCX→PDF nie jest jeszcze wdrożony. Podłącz adres backendu w src/pdf-config.js.");
  }
  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "X-Filename": encodeURIComponent(filename),
  };
  if (password) headers["X-PDF-Password"] = window.AUTOGOOD_PDF_ENCRYPTION.encodePassword(password);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), pdfConversionTimeoutMs);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: docxBlob,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Konwersja PDF przekroczyła limit 120 sekund.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    if (response.status === 404 && /onrender\.com/i.test(endpoint)) {
      throw new Error("Backend Render dla konwertera PDF nie jest jeszcze wdrożony pod wskazanym adresem.");
    }
    throw new Error(message || "Konwerter PDF nie jest dostępny.");
  }

  return await response.blob();
}

function converterHealthEndpoint(endpoint) {
  return endpoint.replace(/\/api\/convert-docx-to-pdf\/?$/i, "/api/health");
}

async function checkEncryptionSupport() {
  const configuredEndpoint = String(window.AUTOGOOD_PDF_CONVERTER_URL || "").trim();
  const endpoint = configuredEndpoint || defaultPdfConverterUrl;
  const healthEndpoint = converterHealthEndpoint(endpoint);
  const controller = new AbortController();
  // The free Render instance sleeps after ~15 minutes and takes 30–50 s to wake.
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(healthEndpoint, { signal: controller.signal });
    if (!response.ok) {
      return { supported: false, reason: `Serwer PDF odpowiedział błędem (${response.status}).` };
    }
    const payload = await response.json().catch(() => null);
    if (!payload || !payload.pdf_encryption) {
      return {
        supported: false,
        reason: "Backend konwertera PDF jest nieaktualny i nie obsługuje jeszcze szyfrowania (brak pdf_encryption w /api/health). Zgłoś to do administratora — wymaga wdrożenia najnowszej wersji converter/server.py.",
      };
    }
    // The Polish contract is already a PDF: it needs /api/encrypt-pdf (converter 1.5+).
    if (!isExportContract && !payload.pdf_encryption_endpoint) {
      return {
        supported: false,
        reason: "Serwer szyfrowania jest nieaktualny (brak /api/encrypt-pdf). Zgłoś to do administratora — wymaga wdrożenia converter/server.py 1.5.",
      };
    }
    return { supported: true };
  } catch (error) {
    const reason = error?.name === "AbortError" ? "Serwer PDF nie odpowiedział w minutę." : "Nie można połączyć się z serwerem PDF, aby sprawdzić wsparcie szyfrowania.";
    return { supported: false, reason };
  } finally {
    window.clearTimeout(timeout);
  }
}

function bytesIncludeAscii(bytes, text) {
  const needle = Array.from(text, (ch) => ch.charCodeAt(0));
  const limit = bytes.length - needle.length;
  outer: for (let i = 0; i <= limit; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

async function isPdfBlobEncrypted(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Every PDF writer that actually encrypts a file (pypdf included) puts an
  // /Encrypt entry in the trailer. No /Encrypt marker in the bytes means the
  // server ignored the password and handed back a plain PDF.
  return bytesIncludeAscii(bytes, "/Encrypt");
}

function parseRawText() {
  const text = $("rawClient").value;
  if (!text.trim()) {
    setStatus("Brak danych.");
    return;
  }
  applyParsed(parseRawTextValue(text));
  setStatus("Dane rozpoznane. Sprawdź pola i checkboxy.");
}

async function generateContract() {
  await withGenerationLock(async () => {
    try {
      setStatus("Przygotowuję DOCX...");
      const blob = await generateDocx();
      setStatus("");
      showDownload("docx", { blob, filename: filenameFor(collectData(), "docx"), readyText: "DOCX gotowy." });
    } catch (error) {
      setStatus(`Nie udało się przygotować DOCX: ${error.message}`);
    }
  });
}

async function generateOrderPdf() {
  await withGenerationLock(async () => {
    try {
      setStatus("Przygotowuję PDF...");
      saveCurrentContractData();
      const data = collectData();
      const blob = await buildOrderContractPdf(data);
      setStatus("");
      showDownload("pdf", { blob, filename: filenameFor(data, "pdf"), readyText: "PDF gotowy.", preview: true });
    } catch (error) {
      setStatus(`Nie udało się przygotować PDF: ${String(error.message || error)}`);
    }
  });
}

async function generateEncryptedOrderPdf() {
  await withGenerationLock(async () => {
    setStatus("Sprawdzam serwer szyfrowania (jeśli śpi, budzi się do minuty)...");
    const support = await checkEncryptionSupport();
    if (!support.supported) {
      setStatus(`Nie można zaszyfrować PDF: ${support.reason}`);
      return;
    }

    const password = await window.AUTOGOOD_PDF_ENCRYPTION.requestPassword();
    if (!password) {
      setStatus("");
      return;
    }

    try {
      setStatus("Przygotowuję zaszyfrowany PDF...");
      saveCurrentContractData();
      const data = collectData();
      const filename = filenameFor(data, "pdf").replace(/\.pdf$/i, "_zaszyfrowany.pdf");
      const pdfBlob = await encryptPdfBlob(await buildOrderContractPdf(data), filename, password);
      if (!(await isPdfBlobEncrypted(pdfBlob))) {
        setStatus("");
        setDownloadMessage(
          "encrypted",
          "Nie udało się zaszyfrować PDF: serwer zwrócił plik BEZ hasła. NIE wysyłaj go klientowi — zgłoś to do administratora (backend PDF wymaga aktualizacji)."
        );
        return;
      }
      setStatus("");
      showDownload("encrypted", { blob: pdfBlob, filename, readyText: "Zaszyfrowany PDF gotowy.", preview: true });
    } catch (error) {
      setStatus(`Nie udało się zaszyfrować PDF: ${String(error.message || error)}`);
    }
  });
}

async function generatePdf() {
  if (!isExportContract) {
    await generateOrderPdf();
    return;
  }
  await withGenerationLock(async () => {
    let docxReady = false;
    try {
      setStatus("Przygotowuję DOCX do konwersji PDF...");
      const data = collectData();
      const docxBlob = await generateDocx();
      showDownload("docx", { blob: docxBlob, filename: filenameFor(data, "docx"), readyText: "DOCX gotowy." });
      docxReady = true;
      setDownloadMessage("pdf", "Konwertuję DOCX do PDF...");
      const pdfBlob = await convertDocxBlobToPdf(docxBlob, filenameFor(data, "pdf"));
      setStatus("");
      showDownload("pdf", {
        blob: pdfBlob,
        filename: filenameFor(data, "pdf"),
        readyText: "PDF gotowy.",
        preview: true,
      });
    } catch (error) {
      const message = String(error.message || error);
      const converterMessage = message.includes("Failed to fetch") || message.includes("Konwerter PDF")
        ? "Konwerter DOCX→PDF nie jest podłączony. Uruchom lub wdróż backend converter/server.py."
        : message;
      if (docxReady) setDownloadMessage("pdf", `Nie udało się przygotować PDF: ${converterMessage}`);
      else setStatus(`Nie udało się przygotować PDF: ${converterMessage}`);
    }
  });
}

async function generateEncryptedPdf() {
  if (!isExportContract) {
    await generateEncryptedOrderPdf();
    return;
  }
  await withGenerationLock(async () => {
    setStatus("Sprawdzam serwer szyfrowania (jeśli śpi, budzi się do minuty)...");
    const support = await checkEncryptionSupport();
    if (!support.supported) {
      setStatus(`Nie można zaszyfrować PDF: ${support.reason}`);
      return;
    }

    const password = await window.AUTOGOOD_PDF_ENCRYPTION.requestPassword();
    if (!password) {
      setStatus("");
      return;
    }

    try {
      setStatus("Przygotowuję zaszyfrowany PDF...");
      const data = collectData();
      const docxBlob = await generateDocx();
      const filename = filenameFor(data, "pdf").replace(/\.pdf$/i, "_zaszyfrowany.pdf");
      const pdfBlob = await convertDocxBlobToPdf(docxBlob, filename, password);
      if (!(await isPdfBlobEncrypted(pdfBlob))) {
        setStatus("");
        setDownloadMessage(
          "encrypted",
          "Nie udało się zaszyfrować PDF: serwer zwrócił plik BEZ hasła. NIE wysyłaj go klientowi — zgłoś to do administratora (backend PDF wymaga aktualizacji)."
        );
        return;
      }
      setStatus("");
      showDownload("encrypted", { blob: pdfBlob, filename, readyText: "Zaszyfrowany PDF gotowy.", preview: true });
    } catch (error) {
      const message = String(error.message || error);
      setStatus(`Nie udało się zaszyfrować PDF: ${message}`);
    }
  });
}

function resetForm() {
  $("contractDate").value = todayISO();
  $("sequence").value = "1";
  document.querySelectorAll("input, textarea, select").forEach((node) => {
    node.disabled = false;
    if (node.id === "contractDate" || node.id === "sequence") return;
    if (node.tagName === "SELECT") {
      node.selectedIndex = 0;
      return;
    }
    if (node.type === "radio" || node.type === "checkbox") node.checked = false;
    else node.value = "";
  });
  setDefaultSelectValues();
  syncContractCurrencyFromSelect();
  markOrderFieldError(null);
  setRadio("clientType", "person");
  setCheckedValues("subject", ["purchase_by_autogood"]);
  setRadio("commissionOption", exportDefaultCommission);
  const entrepreneur = $("clientEntrepreneur");
  if (entrepreneur) entrepreneur.checked = false;
  syncClientTypeRules();
  updateDocumentFileName();
  clearStatus();
  updateSummary();
  lastDrawnSizes = {};
  syncFontControls();
}

configureContractVariant();
prepareContractHistoryStorage();
$("contractDate").value = todayISO();
setDefaultSelectValues();
updateDocumentFileName();
renderContractHistory();
$("parseBtn").addEventListener("click", parseRawText);
// pullCrmDataBtn stays permanently disabled (see pdf.html) — CRM integration
// isn't built yet, so there is no click handler to wire up.
$("printBtn").addEventListener("click", generatePdf);
$("encryptBtn").addEventListener("click", generateEncryptedPdf);
$("generateBtn").addEventListener("click", generateContract);
$("resetBtn").addEventListener("click", resetForm);
$("saveDataBtn").addEventListener("click", saveCurrentContractData);
pdfPreviewPrint?.addEventListener("click", printPreviewPdf);
window.addEventListener("beforeunload", () => {
  if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
});
document.querySelectorAll('input[name="clientType"]').forEach((node) => node.addEventListener("change", syncClientTypeRules));
$("vehicleMakeModel").addEventListener("input", updateDocumentFileName);
document.querySelectorAll("input, textarea, select").forEach((node) => {
  node.addEventListener("input", updateSummary);
  node.addEventListener("change", updateSummary);
  node.addEventListener("input", scheduleOrderPreview);
  node.addEventListener("change", scheduleOrderPreview);
});
document.querySelectorAll('input[name="contractCurrency"]').forEach((node) =>
  node.addEventListener("change", () => applyContractCurrency(checkedRadio("contractCurrency")))
);
// Typing the value next to a box ticks the box, as filling in the paper form would.
[
  ["indicatedVehicleLink", () => ($("clientIndicatedVehicle").checked = true)],
  ["bodyOther", () => setCheckedValues("bodyType", [...new Set([...checkedValues("bodyType"), "inne"])])],
  ["euroOther", () => setRadio("euroStandard", "inna")],
].forEach(([id, tick]) => {
  $(id)?.addEventListener("input", (event) => {
    if (event.target.value.trim()) tick();
  });
});

document.querySelectorAll(".font-size-control[data-font-field]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const button = event.target.closest("[data-font-step]");
    if (button) stepFontSize(control.dataset.fontField, Number(button.dataset.fontStep));
  });
});

syncContractCurrencyFromSelect();
syncClientTypeRules();
updateSummary();
syncFontControls();
scheduleOrderPreview();
