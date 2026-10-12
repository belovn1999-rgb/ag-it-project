// Wave 3 of the ideas from similar projects (owner 2026-10-11): the morning
// e-mail of the Mac's service (M1) — the page's digest of a check, the
// letter in Russian, the SMTP client — and the test letter (M12).
import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { readFileSync } from "node:fs";
import { renderDigestMail, buildMime, sendMail, countsText, digestCounts } from "../server/monitoring-mail.mjs";

const analysis = readFileSync(new URL("../src/mobile-market-analysis.js", import.meta.url), "utf8");
const monitoring = readFileSync(new URL("../src/mobile-monitoring.js", import.meta.url), "utf8");
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name}: no end`);
}
// The page's digest with the page's own rules (similar cars, Okazja,
// relisted, the same car key) and plain stand-ins for the rest.
const digestOf = new Function(`
  const MARKET_SOURCES = ["otomoto", "mobile", "autoscout"];
  const SOURCE_CURRENCY = { otomoto: "PLN", mobile: "EUR", autoscout: "EUR" };
  ${analysis.match(/const SIMILAR_MIN = \d+;\n\s*const OKAZJA_SHARE = [\d.]+;/)[0]}
  ${functionSource(analysis, "similarMedian")}
  ${analysis.match(/const isOkazja = [\s\S]*?price <= similar\.min;/)[0]}
  ${functionSource(analysis, "findRelisted")}
  ${functionSource(analysis, "sameCarKey")}
  const carSignature = (offer) => sameCarKey(offer);
  const carsOf = (markets) => new Set(markets.flatMap((market) => (market?.offers || []).map(carSignature)).filter(Boolean));
  const portalAnswered = (record, source) => Boolean(record && (record.markets?.[source] || (Array.isArray(record.answered) && record.answered.includes(source))));
  const answeredMarket = (record, source) => record.markets?.[source] || { total: 0, complete: true, offers: [] };
  const otherVersionOf = () => null;
  const powerInKm = (value) => value;
  const portalName = (source) => ({ otomoto: "otomoto", mobile: "mobile.de", autoscout: "AutoScout24" })[source] || source;
  const clientPricePln = (offer, source) => Number(offer.turnkey) || (offer.currency === "PLN" || source === "otomoto" ? offer.price : offer.price * 4.3);
  ${functionSource(monitoring, "monitoringDigest")}
  return monitoringDigest;
`)();

const offer = (key, price, year, mileage, extra = {}) => ({ key, url: `https://x/${key}`, title: `Car ${key}`, price, currency: "EUR", year, mileage, power: "150 KM", ...extra });
const record = (at, offers, extra = {}) => ({ at, scope: "mobile|DE", answered: ["mobile"], failed: {}, markets: { mobile: { total: offers.length, complete: true, offers } }, ...extra });
const job = { id: "j1", title: "Toyota Corolla", filters: { brand: "Toyota", model: "Corolla" } };

test("digest: new, cheaper, gone and Okazja by the page's rules; a car listed before is not new", () => {
  const base = [1, 2, 3, 4, 5, 6].map((n) => offer(`m${n}`, 20000 + n * 500, 2020, 80000 + n * 1000));
  const day1 = record("2026-10-10T07:30:00.000Z", [...base, offer("m7", 23000, 2020, 70000)]);
  const day2 = record("2026-10-11T07:30:00.000Z", [
    ...base.map((item) => (item.key === "m3" ? { ...item, price: 19000 } : item)),
    offer("m8", 16000, 2020, 82000), // new and the cheapest of similar: Okazja
    offer("m9", 23000, 2020, 70000, { key: "m9", url: "https://x/m9" }), // the same car as m7 on another number: wróciło? m7 is still gone (not in day2)
  ]);
  const digest = digestOf(job, [day1], day2);
  assert.deepEqual(digest.counts, { now: 8, fresh: 1, cheaper: 1, okazja: 1, relisted: 1, gone: 0 });
  assert.equal(digest.fresh[0].key, "m8");
  assert.equal(digest.cheaper[0].key, "m3");
  assert.deepEqual(digest.cheaper[0].before, { price: 21500, currency: "EUR", share: (19000 - 21500) / 21500 });
  assert.equal(digest.okazja[0].key, "m8");
  assert.equal(digest.okazja[0].similar.count, 7, "the 6 of the base and m9");
  assert.equal(digest.relisted[0].key, "m9");
  assert.equal(digest.relisted[0].relisted.price, 23000);
  assert.equal(digest.relisted[0].portal, "mobile.de");
});

test("digest: Okazja is told once — again only when the car got cheaper", () => {
  const base = [1, 2, 3, 4, 5, 6].map((n) => offer(`m${n}`, 20000 + n * 500, 2020, 80000 + n * 1000));
  const cheap = offer("m8", 16000, 2020, 82000);
  const day1 = record("2026-10-10T07:30:00.000Z", [...base, cheap]);
  const day2 = record("2026-10-11T07:30:00.000Z", [...base, cheap]);
  assert.equal(digestOf(job, [day1], day2).counts.okazja, 0, "already an Okazja yesterday");
  const day3 = record("2026-10-12T07:30:00.000Z", [...base, { ...cheap, price: 15500 }]);
  const digest = digestOf(job, [day1, day2], day3);
  assert.equal(digest.counts.okazja, 1);
  assert.equal(digest.counts.cheaper, 1);
  assert.equal(digest.counts.fresh, 0);
});

test("digest: the first check has nothing to compare; a portal without an answer is named", () => {
  const day1 = record("2026-10-11T07:30:00.000Z", [offer("m1", 20000, 2020, 80000)], { failed: { otomoto: "no answer" } });
  const digest = digestOf(job, [], day1);
  assert.deepEqual(digest.counts, { now: 1, fresh: 0, cheaper: 0, okazja: 0, relisted: 0, gone: 0 });
  assert.deepEqual(digest.silent, ["otomoto"]);
});

test("letter: the subject counts in Russian, the sections, the test mark", () => {
  const digest = {
    title: "Toyota Corolla", at: "2026-10-11T07:30:00.000Z", counts: { now: 12, gone: 2 }, silent: ["Kleinanzeigen"],
    fresh: [{ key: "a", portal: "mobile.de", title: "Toyota Corolla 1.8 Hybrid", url: "https://x/a", photo: "https://x/a.jpg", price: 18900, currency: "EUR", turnkey: 96000, year: 2020, mileage: 64000, power: "122 KM", country: "DE", city: "Bebra", seller: "dealer", days: 3, similar: { count: 8, median: 104000, share: -0.08 } }],
    cheaper: [{ key: "b", portal: "otomoto", title: "Toyota Corolla Comfort", url: "https://x/b", price: 79900, currency: "PLN", turnkey: 79900, year: 2019, mileage: 90000, power: "", country: "PL", city: "", seller: "", days: 40, similar: null, before: { price: 84900, currency: "PLN", share: -0.0589 } }],
    okazja: [], relisted: [],
  };
  const letter = renderDigestMail([digest], { date: "2026-10-11T07:40:00.000Z" });
  assert.equal(letter.subject, "Monitoring 11.10: 1 новая, 1 подешевела");
  assert.match(letter.text, /TOYOTA COROLLA — 12 В СПИСКЕ, ИСЧЕЗЛО 2; БЕЗ ОТВЕТА: KLEINANZEIGEN/);
  assert.match(letter.text, /Новые \(1\):\n• Toyota Corolla 1\.8 Hybrid — mobile\.de\n  2020 · 64 000 km · 122 KM · DE Bebra · дилер\n  18 900 € → под ключ 96 000 zł\n  −8 % к медиане 8 похожих: 104 000 zł под ключ\n  в продаже 3 дня/);
  assert.match(letter.text, /Подешевели \(1\):[\s\S]*было 84 900 zł \(−6 %\)/);
  assert.match(letter.html, /<img src="https:\/\/x\/a\.jpg"/);
  assert.match(letter.html, /mobile\.html#monitoring/);
  const testLetter = renderDigestMail([{ ...digest, fresh: [], cheaper: [] }], { date: "2026-10-11T07:40:00.000Z", test: true, failed: ["Opel Astra"] });
  assert.equal(testLetter.subject, "[ТЕСТ] Monitoring 11.10: без изменений");
  assert.match(testLetter.text, /без изменений\n/);
  assert.match(testLetter.text, /Не удалось проверить: Opel Astra\./);
  assert.equal(countsText(digestCounts([digest, digest])), "2 новые, 2 подешевели");
});

test("MIME: a UTF-8 subject is encoded, two parts in base64", () => {
  const mime = buildMime({ from: "AUTOGOOD <info@autogood.pl>", to: ["a@b.pl"], subject: "Monitoring: 1 новая", text: "Привет", html: "<b>Привет</b>" });
  assert.match(mime, /^From: AUTOGOOD <info@autogood\.pl>\r\nTo: a@b\.pl\r\nSubject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/);
  assert.match(mime, /Content-Type: multipart\/alternative; boundary="[^"]+"/);
  assert.equal((mime.match(/Content-Transfer-Encoding: base64/g) || []).length, 2);
  assert.match(mime, /Content-Type: text\/html; charset=utf-8/);
});

// A plain SMTP server of the test: the client's dialogue and the letter it hands over.
function fakeSmtp(onMessage) {
  const lines = [];
  const server = net.createServer((socket) => {
    let data = false;
    let body = "";
    socket.write("220 fake ESMTP\r\n");
    socket.on("data", (chunk) => {
      for (const line of String(chunk).split("\r\n")) {
        if (data) {
          if (line === ".") { data = false; onMessage(body.replace(/^\r\n/, "")); socket.write("250 2.0.0 Ok: queued as 42\r\n"); } else body += `${line}\r\n`;
          continue;
        }
        if (!line) continue;
        lines.push(line);
        if (/^EHLO/i.test(line)) socket.write("250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
        else if (/^AUTH PLAIN /i.test(line)) socket.write(line.endsWith(Buffer.from("\0info@autogood.pl\0secret").toString("base64")) ? "235 2.7.0 Authentication successful\r\n" : "535 5.7.8 Authentication failed\r\n");
        else if (/^(MAIL FROM|RCPT TO)/i.test(line)) socket.write("250 2.1.0 Ok\r\n");
        else if (/^DATA/i.test(line)) { data = true; socket.write("354 End data with <CR><LF>.<CR><LF>\r\n"); }
        else if (/^QUIT/i.test(line)) { socket.write("221 Bye\r\n"); socket.end(); }
        else socket.write("500 what\r\n");
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, lines })));
}

test("SMTP: greeting, EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, QUIT — the letter arrives", async () => {
  let received = "";
  const { server, port, lines } = await fakeSmtp((body) => { received = body; });
  try {
    const answer = await sendMail({ host: "127.0.0.1", port, secure: "none", user: "info@autogood.pl", pass: "secret", from: "AUTOGOOD Monitoring <info@autogood.pl>", to: ["info@autogood.pl", "x@autogood.pl"] },
      { subject: "Test", text: "line\n.dot line", html: "<p>x</p>" });
    assert.match(answer, /^250 2\.0\.0 Ok/);
    assert.deepEqual(lines.map((line) => line.split(" ")[0].replace(/:.*/, "")), ["EHLO", "AUTH", "MAIL", "RCPT", "RCPT", "DATA", "QUIT"]);
    assert.match(received, /^From: AUTOGOOD Monitoring <info@autogood\.pl>\r\n/);
    assert.match(received, /Subject: Test\r\n/);
  } finally {
    server.close();
  }
});

test("SMTP: a wrong password is told with the server's words", async () => {
  const { server, port } = await fakeSmtp(() => {});
  try {
    await assert.rejects(sendMail({ host: "127.0.0.1", port, secure: "none", user: "info@autogood.pl", pass: "wrong", from: "info@autogood.pl", to: ["a@b.pl"] }, { subject: "T", text: "t", html: "t" }), /SMTP AUTH: 535 5\.7\.8 Authentication failed/);
  } finally {
    server.close();
  }
});
