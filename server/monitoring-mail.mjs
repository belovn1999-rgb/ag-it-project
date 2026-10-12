// AUTOGOOD Monitoring — the morning e-mail (M1 + M12, owner 2026-10-11): one
// letter a day after the check, in Russian, to info@autogood.pl, with every
// new, cheaper, "Okazja" and "wróciło" car of every monitored favourite.
// What goes in is told by the page (AUTOGOOD_MONITORING.digest — the rules
// of page 3); this file only writes the letter and sends it.
//
// The mailbox: <folder of jobs.json>/mail.json (never in the repository):
//   { "host": "autogood.pl", "port": 465, "user": "info@autogood.pl",
//     "pass": "…", "from": "AUTOGOOD Monitoring <info@autogood.pl>",
//     "to": ["info@autogood.pl"] }
// Port 465 = TLS at once, 587 = STARTTLS. No dependencies: a small SMTP
// client over node:tls (AUTH PLAIN, else AUTH LOGIN).
import net from "node:net";
import tls from "node:tls";
import { readFile } from "node:fs/promises";

const SMTP_TIMEOUT_MS = 30000;

export async function readMailConfig(file) {
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`mail.json: ${error.message}`);
  }
  const to = Array.isArray(data.to) ? data.to : String(data.to || "").split(/[,;]\s*/);
  const config = {
    host: String(data.host || ""),
    port: Number(data.port) || 465,
    user: String(data.user || ""),
    pass: String(data.pass || ""),
    from: String(data.from || data.user || ""),
    to: to.map((item) => String(item).trim()).filter(Boolean),
    // true = TLS at once (465), "starttls" (587), "none" = plain (tests only).
    secure: data.secure === undefined ? ((Number(data.port) || 465) === 465 ? true : "starttls") : data.secure,
  };
  const missing = ["host", "user", "pass", "from"].filter((key) => !config[key]);
  if (missing.length || !config.to.length) throw new Error(`mail.json: missing ${[...missing, ...(config.to.length ? [] : ["to"])].join(", ")}`);
  return config;
}

// ---- Letter ---------------------------------------------------------------
// Thousands with a plain space (a letter's text, not a narrow no-break space).
const numbers = { format: (value) => new Intl.NumberFormat("ru-RU").format(value).replace(/[\u00a0\u202f]/g, " ") };
const money = (value, currency) => (Number.isFinite(Number(value)) && Number(value) > 0 ? `${numbers.format(Math.round(Number(value)))} ${currency === "PLN" ? "zł" : currency === "EUR" ? "€" : currency || ""}`.trim() : "—");
const pct = (share) => (Number.isFinite(share) ? `${share > 0 ? "+" : share < 0 ? "−" : "±"}${Math.abs(Math.round(share * 100))} %` : "");
const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
const plural = (n, one, few, many) => `${numbers.format(n)} ${n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many}`;
const dateRu = (iso) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" });
const dayRu = (iso) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw" });

const SECTIONS = [
  { key: "fresh", title: "Новые", color: "#1d4ed8", word: ["новая", "новые", "новых"] },
  { key: "cheaper", title: "Подешевели", color: "#b45309", word: ["подешевела", "подешевели", "подешевели"] },
  { key: "okazja", title: "Выгодные (Okazja)", color: "#16803c", word: ["выгодная", "выгодные", "выгодных"] },
  { key: "relisted", title: "Вернулись", color: "#6d28d9", word: ["вернулась", "вернулись", "вернулись"] },
];

// A car of the letter: title, portal and country, year / mileage / power,
// the price and "na gotowo", how it stands against similar cars, days on
// the market, what changed (the price before, the ad it came back from).
function itemLines(item) {
  const meta = [item.year, item.mileage ? `${numbers.format(item.mileage)} km` : "", item.power, [item.country, item.city].filter(Boolean).join(" "), item.seller === "dealer" ? "дилер" : item.seller === "private" ? "частник" : ""].filter(Boolean).join(" · ");
  const price = `${money(item.price, item.currency)}${item.turnkey ? ` → под ключ ${money(item.turnkey, "PLN")}` : ""}`;
  const notes = [];
  if (item.before) notes.push(`было ${money(item.before.price, item.before.currency)} (${pct(item.before.share)})`);
  if (item.similar) notes.push(`${pct(item.similar.share)} к медиане ${plural(item.similar.count, "похожей", "похожих", "похожих")}: ${money(item.similar.median, "PLN")} под ключ`);
  if (item.days !== null && item.days !== undefined) notes.push(item.days === 0 ? "сегодня в продаже" : `в продаже ${plural(item.days, "день", "дня", "дней")}`);
  if (item.relisted) notes.push(`исчезла ${dayRu(item.relisted.at)}, было ${money(item.relisted.price, item.relisted.currency)}`);
  return { meta, price, notes };
}

function itemText(item) {
  const { meta, price, notes } = itemLines(item);
  return [`• ${item.title || "—"} — ${item.portal}`, `  ${meta}`, `  ${price}`, ...notes.map((note) => `  ${note}`), item.url ? `  ${item.url}` : ""].filter(Boolean).join("\n");
}

function itemHtml(item, color) {
  const { meta, price, notes } = itemLines(item);
  const photo = item.photo ? `<td width="112" valign="top" style="padding:0 12px 0 0"><a href="${esc(item.url || item.photo)}"><img src="${esc(item.photo)}" width="100" alt="" style="display:block;width:100px;height:72px;object-fit:cover;border-radius:6px;border:0"></a></td>` : "";
  const title = item.url ? `<a href="${esc(item.url)}" style="color:#111827;text-decoration:none;font-weight:600">${esc(item.title || "—")}</a>` : `<b>${esc(item.title || "—")}</b>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px"><tr>${photo}<td valign="top" style="font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
    <div>${title} <span style="color:#6b7280;font-size:12px">${esc(item.portal)}</span></div>
    <div style="color:#6b7280;font-size:12px">${esc(meta)}</div>
    <div style="margin-top:2px"><b style="color:${color}">${esc(price)}</b></div>
    ${notes.map((note) => `<div style="font-size:12px;color:#374151">${esc(note)}</div>`).join("")}
  </td></tr></table>`;
}

// The subject's short count: "3 новых, 1 подешевела, 1 выгодная".
export function digestCounts(digests) {
  const counts = {};
  SECTIONS.forEach((section) => { counts[section.key] = digests.reduce((sum, digest) => sum + (digest[section.key]?.length || 0), 0); });
  return counts;
}
export function countsText(counts) {
  const parts = SECTIONS.filter((section) => counts[section.key]).map((section) => plural(counts[section.key], ...section.word));
  return parts.length ? parts.join(", ") : "без изменений";
}

// digests: [{title, at, fresh, cheaper, okazja, relisted, counts: {now, gone}, silent: [portal names]}]
// options: {date, link, test, failed: [titles], pending: [date strings], mailFrom}
export function renderDigestMail(digests, options = {}) {
  const date = options.date || new Date().toISOString();
  const counts = digestCounts(digests);
  const summary = countsText(counts);
  const subject = `${options.test ? "[ТЕСТ] " : ""}Monitoring ${dayRu(date)}: ${summary}`;
  const link = options.link || "https://belovn1999-rgb.github.io/ag-it-project/mobile.html#monitoring";
  const text = [];
  const html = [];
  text.push(`AUTOGOOD Monitoring — ${dateRu(date)}`, options.test ? "Это тестовое письмо: так будет выглядеть утренняя сводка." : "", `Итог: ${summary}.`, "");
  html.push(`<h1 style="font:600 20px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;margin:0 0 4px">AUTOGOOD Monitoring — ${esc(dateRu(date))}</h1>`);
  if (options.test) html.push(`<p style="font:13px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#b45309;margin:0 0 8px">Это тестовое письмо: так будет выглядеть утренняя сводка.</p>`);
  html.push(`<p style="font:14px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#374151;margin:0 0 16px">Итог: <b>${esc(summary)}</b>.</p>`);
  for (const digest of digests) {
    const has = SECTIONS.some((section) => digest[section.key]?.length);
    const head = `${digest.title || "Авто"} — ${numbers.format(digest.counts?.now || 0)} в списке${digest.counts?.gone ? `, исчезло ${digest.counts.gone}` : ""}${digest.silent?.length ? `; без ответа: ${digest.silent.join(", ")}` : ""}`;
    text.push(head.toUpperCase());
    html.push(`<h2 style="font:600 16px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;margin:20px 0 8px;padding-top:12px;border-top:1px solid #e5e7eb">${esc(head)}</h2>`);
    if (!has) {
      text.push("  без изменений", "");
      html.push(`<p style="font:13px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b7280;margin:0">без изменений</p>`);
      continue;
    }
    for (const section of SECTIONS) {
      const items = digest[section.key] || [];
      if (!items.length) continue;
      text.push(`${section.title} (${items.length}):`, ...items.map(itemText), "");
      html.push(`<h3 style="font:600 13px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${section.color};text-transform:uppercase;letter-spacing:.04em;margin:12px 0 6px">${esc(section.title)} · ${items.length}</h3>`, ...items.map((item) => itemHtml(item, section.color)));
    }
  }
  if (options.failed?.length) {
    text.push(`Не удалось проверить: ${options.failed.join(", ")}.`, "");
    html.push(`<p style="font:13px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#b91c1c;margin:16px 0 0">Не удалось проверить: ${esc(options.failed.join(", "))}.</p>`);
  }
  if (options.pending?.length) {
    text.push(`Сюда вошли и находки прошлых дней, письмо о которых не отправилось: ${options.pending.join(", ")}.`, "");
    html.push(`<p style="font:12px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b7280;margin:8px 0 0">Сюда вошли и находки прошлых дней, письмо о которых не отправилось: ${esc(options.pending.join(", "))}.</p>`);
  }
  text.push(`Открыть Monitoring: ${link}`);
  html.push(`<p style="font:13px -apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:20px 0 0"><a href="${esc(link)}" style="color:#1d4ed8">Открыть Monitoring</a></p>`);
  return {
    subject,
    text: text.join("\n"),
    html: `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(subject)}</title></head><body style="margin:0;padding:20px;background:#ffffff"><div style="max-width:640px">${html.join("\n")}</div></body></html>`,
  };
}

// ---- SMTP -----------------------------------------------------------------
const b64 = (value) => Buffer.from(value, "utf8").toString("base64");
const wrap76 = (value) => value.replace(/(.{76})/g, "$1\r\n");
const encodeHeader = (value) => (/^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`);
const addressOf = (value) => (String(value).match(/<([^>]+)>/)?.[1] || String(value)).trim();

export function buildMime({ from, to, subject, text, html, date = new Date() }) {
  const boundary = `=_ag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const id = `<${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}@${addressOf(from).split("@")[1] || "autogood.pl"}>`;
  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${date.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${id}`,
    "MIME-Version: 1.0",
    "X-Mailer: AUTOGOOD Monitoring",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type, body) => [`--${boundary}`, `Content-Type: ${type}; charset=utf-8`, "Content-Transfer-Encoding: base64", "", wrap76(b64(body))].join("\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${part("text/plain", text)}\r\n${part("text/html", html)}\r\n--${boundary}--\r\n`;
}

class SmtpClient {
  constructor(socket) {
    this.socket = socket;
    this.buffer = "";
    this.waiting = null;
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => { this.buffer += chunk; this.pump(); });
    socket.on("error", (error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("SMTP: connection closed")));
  }
  attach(socket) {
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => { this.buffer += chunk; this.pump(); });
    socket.on("error", (error) => this.fail(error));
  }
  fail(error) {
    if (this.waiting) {
      const { reject } = this.waiting;
      this.waiting = null;
      reject(error);
    }
  }
  // A reply is complete at a line "NNN text" (not "NNN-text").
  pump() {
    if (!this.waiting) return;
    const lines = this.buffer.split("\r\n");
    const end = lines.findIndex((line) => /^\d{3}(?: |$)/.test(line));
    if (end < 0) return;
    const reply = lines.slice(0, end + 1).join("\r\n");
    this.buffer = lines.slice(end + 1).join("\r\n");
    const { resolve } = this.waiting;
    this.waiting = null;
    resolve({ code: Number(reply.slice(0, 3)), text: reply });
  }
  read() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error("SMTP: no answer in 30 s")), SMTP_TIMEOUT_MS);
      this.waiting = { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } };
      this.pump();
    });
  }
  async command(line, expected, label = line.split(" ")[0]) {
    if (line !== null) this.socket.write(`${line}\r\n`);
    const reply = await this.read();
    if (!expected.includes(reply.code)) throw new Error(`SMTP ${label}: ${reply.text.split("\r\n").pop().slice(0, 160)}`);
    return reply;
  }
}

const connect = (host, port, secure) => new Promise((resolve, reject) => {
  const socket = secure ? tls.connect({ host, port, servername: host }, () => resolve(socket)) : net.connect({ host, port }, () => resolve(socket));
  socket.once("error", reject);
  socket.setTimeout(SMTP_TIMEOUT_MS, () => socket.destroy(new Error("SMTP: connection timed out")));
});

// Sends one letter; resolves with the server's final answer, throws with the
// server's words on any refusal (wrong password, recipient, size …).
export async function sendMail(config, message) {
  const socket = await connect(config.host, config.port, config.secure === true);
  const client = new SmtpClient(socket);
  try {
    await client.command(null, [220], "greeting");
    let ehlo = await client.command("EHLO autogood.local", [250]);
    if (config.secure === "starttls") {
      await client.command("STARTTLS", [220]);
      const upgraded = await new Promise((resolve, reject) => {
        const secured = tls.connect({ socket, host: config.host, servername: config.host }, () => resolve(secured));
        secured.once("error", reject);
      });
      client.attach(upgraded);
      ehlo = await client.command("EHLO autogood.local", [250]);
    }
    if (/AUTH[ =].*PLAIN/i.test(ehlo.text) || !/AUTH[ =].*LOGIN/i.test(ehlo.text)) {
      await client.command(`AUTH PLAIN ${b64(`\0${config.user}\0${config.pass}`)}`, [235], "AUTH");
    } else {
      await client.command("AUTH LOGIN", [334], "AUTH");
      await client.command(b64(config.user), [334], "AUTH");
      await client.command(b64(config.pass), [235], "AUTH");
    }
    await client.command(`MAIL FROM:<${addressOf(config.from)}>`, [250], "MAIL FROM");
    for (const recipient of config.to) await client.command(`RCPT TO:<${addressOf(recipient)}>`, [250, 251], `RCPT TO ${addressOf(recipient)}`);
    await client.command("DATA", [354]);
    const mime = buildMime({ from: config.from, to: config.to, ...message });
    // A line of the body starting with "." is sent as ".." (dot stuffing).
    const reply = await client.command(`${mime.replace(/\r\n\./g, "\r\n..")}\r\n.`, [250], "DATA");
    await client.command("QUIT", [221]).catch(() => {});
    return reply.text.split("\r\n").pop();
  } finally {
    client.socket.end();
    client.socket.destroy();
  }
}
