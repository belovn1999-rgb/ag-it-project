// Wave 2 of the ideas from similar projects (2026-10-11): "Do mediany" and
// "Okazja" against similar cars (M2 + M6, owner: 15 %), "wróciło" — the same
// car put up again under a new number (M3).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/mobile-market-analysis.js", import.meta.url), "utf8");
function functionSource(name) {
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
const constants = source.match(/const SIMILAR_MIN = \d+;\n\s*const OKAZJA_SHARE = [\d.]+;/)[0];
const okazjaRule = source.match(/const isOkazja = [\s\S]*?price <= similar\.min;/)[0];
const { similarMedian, findRelisted, isOkazja, OKAZJA_SHARE, SIMILAR_MIN } = new Function(`${constants}\n${functionSource("similarMedian")}\n${okazjaRule}\n${functionSource("findRelisted")}\nreturn { similarMedian, findRelisted, isOkazja, OKAZJA_SHARE, SIMILAR_MIN };`)();

const car = (key, price, year, mileage, power = 0) => ({ key, price, year, mileage, power });
const price = (offer) => offer.price;
const power = (offer) => offer.power;

test("the owner's rule: 15 % under the median of at least 6 similar cars", () => {
  assert.equal(OKAZJA_SHARE, 0.15);
  assert.equal(SIMILAR_MIN, 6);
});

test("similar = year ± 1, mileage ± 20 %, power ± 15 %; other cars stay out", () => {
  const target = car("t", 15000, 2020, 80000, 150);
  const pool = [
    target,
    car("a", 18000, 2019, 70000, 150), car("b", 18500, 2020, 90000, 140), car("c", 19000, 2021, 95000, 160),
    car("d", 19500, 2020, 66000, 150), car("e", 20000, 2020, 80000, 0), car("f", 21000, 2021, 85000, 150),
    car("old", 9000, 2016, 80000, 150), // year
    car("far", 9000, 2020, 120000, 150), // mileage
    car("strong", 30000, 2020, 80000, 300), // power
  ];
  const result = similarMedian(target, pool, price, power);
  assert.deepEqual(result, { median: 19250, count: 6, min: 18000 });
  assert.equal(isOkazja(target.price, result), true, "15 000 against 19 250, the cheapest: Okazja");
});

test("15 % under the median but a similar car is cheaper: no Okazja", () => {
  const target = car("t", 15900, 2020, 80000);
  const pool = [target, ...[15500, 18000, 18500, 19000, 19500, 20000].map((value, index) => car(`s${index}`, value, 2020, 80000))];
  const result = similarMedian(target, pool, price, power);
  assert.equal(result.median, 18750);
  assert.ok((target.price - result.median) / result.median <= -OKAZJA_SHARE);
  assert.equal(isOkazja(target.price, result), false);
});

test("fewer than 6 similar cars: no basis (whole list, no Okazja)", () => {
  const target = car("t", 15000, 2020, 80000);
  const pool = [target, car("a", 18000, 2020, 80000), car("b", 18000, 2020, 80000), car("c", 18000, 2020, 80000), car("d", 18000, 2020, 80000), car("e", 18000, 2020, 80000)];
  assert.equal(similarMedian(target, pool, price, power), null);
  assert.equal(similarMedian(car("x", 15000, "", 80000), pool, price, power), null, "no year, no basis");
});

test("wróciło: the same portal, year, mileage ± 1 % and price ± 10 % of an ad that left", () => {
  const gone = [
    { source: "dehands", at: "2026-10-05T08:00:00Z", offer: car("id:m2440080715", 34990, 2024, 59379) },
    { source: "mobile", at: "2026-10-06T08:00:00Z", offer: car("m1", 34990, 2024, 59379) },
  ];
  const back = findRelisted(car("id:m2451427720", 33990, 2024, 59379), "dehands", gone);
  assert.equal(back.offer.key, "id:m2440080715");
  assert.equal(findRelisted(car("id:x", 34990, 2023, 59379), "dehands", gone), null, "another year");
  assert.equal(findRelisted(car("id:y", 26000, 2024, 59379), "dehands", gone), null, "price far off");
  assert.equal(findRelisted(car("id:z", 34990, 2024, 75000), "dehands", gone), null, "another mileage");
  assert.equal(findRelisted(car("as1", 34990, 2024, 59379), "autoscout", gone), null, "another portal");
});
