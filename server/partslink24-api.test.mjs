import test from "node:test";
import assert from "node:assert/strict";

import {
  accessKeyMatches,
  allowedCorsOrigin,
  checkAccess,
  makeVinPdfDownloadName,
  normalizeDownloadFileName,
  pdfLinkValid,
  signPdfLink
} from "./partslink24-api.mjs";

test("VIN PDF download names never include the report language", () => {
  assert.equal(makeVinPdfDownloadName("Citroen", "VF7PNCFB4CR507136"), "Citroen_VF7PNCFB4CR507136.pdf");
  assert.equal(normalizeDownloadFileName("Citroen_VF7PNCFB4CR507136_RU.pdf"), "Citroen_VF7PNCFB4CR507136.pdf");
  assert.equal(normalizeDownloadFileName("Citroen_VF7PNCFB4CR507136_PL.pdf"), "Citroen_VF7PNCFB4CR507136.pdf");
  assert.equal(normalizeDownloadFileName("Citroen_VF7PNCFB4CR507136_ENG.pdf"), "Citroen_VF7PNCFB4CR507136.pdf");
});

test("old cached download names are corrected by the server", () => {
  assert.equal(normalizeDownloadFileName("Alfa_Romeo_ZAR94000007103616_PL.pdf"), "Alfa_Romeo_ZAR94000007103616.pdf");
  assert.equal(normalizeDownloadFileName("Ford_WF0PXXGCHPPE76303_RU_vehicle.pdf"), "Ford_WF0PXXGCHPPE76303_vehicle.pdf");
});

test("a VIN check needs the access key; a wrong or missing key is refused", () => {
  const previous = process.env.PARTSLINK24_ACCESS_KEY;
  process.env.PARTSLINK24_ACCESS_KEY = "secret-key-1";
  try {
    assert.equal(checkAccess({ headers: { "x-vin-key": "secret-key-1", origin: "https://belovn1999-rgb.github.io" } }), null);
    assert.equal(checkAccess({ headers: { "x-vin-key": "secret-key-1" } }), null);
    assert.equal(checkAccess({ headers: { "x-vin-key": "wrong" } }).status, 401);
    assert.equal(checkAccess({ headers: {} }).status, 401);
    assert.equal(checkAccess({ headers: { "x-vin-key": "secret-key-1", origin: "https://evil.example" } }).status, 403);
    delete process.env.PARTSLINK24_ACCESS_KEY;
    assert.equal(checkAccess({ headers: { "x-vin-key": "" } }).status, 500);
  } finally {
    if (previous === undefined) delete process.env.PARTSLINK24_ACCESS_KEY;
    else process.env.PARTSLINK24_ACCESS_KEY = previous;
  }
  assert.equal(accessKeyMatches("", ""), false);
});

test("PDF links are signed per file and expire; a guessed file name is not enough", () => {
  const now = Date.UTC(2026, 9, 21, 12, 0, 0);
  const params = new URLSearchParams(signPdfLink("BMW_WBA31AA0905V40977_RU.pdf", "k", now));
  assert.equal(pdfLinkValid("BMW_WBA31AA0905V40977_RU.pdf", params.get("exp"), params.get("sig"), "k", now), true);
  assert.equal(pdfLinkValid("Audi_WAUZZZ4M3RD016484_PL.pdf", params.get("exp"), params.get("sig"), "k", now), false);
  assert.equal(pdfLinkValid("BMW_WBA31AA0905V40977_RU.pdf", params.get("exp"), params.get("sig"), "other", now), false);
  assert.equal(pdfLinkValid("BMW_WBA31AA0905V40977_RU.pdf", params.get("exp"), params.get("sig"), "k", now + 13 * 3600 * 1000), false);
  assert.equal(pdfLinkValid("BMW_WBA31AA0905V40977_RU.pdf", null, null, "k", now), false);
});

test("only the VIN page and local pages may call the API from a browser", () => {
  assert.equal(allowedCorsOrigin("https://belovn1999-rgb.github.io"), "https://belovn1999-rgb.github.io");
  assert.equal(allowedCorsOrigin("http://127.0.0.1:4174"), "http://127.0.0.1:4174");
  assert.equal(allowedCorsOrigin("http://localhost:4173"), "http://localhost:4173");
  assert.equal(allowedCorsOrigin("https://evil.example"), "");
  assert.equal(allowedCorsOrigin(undefined), "");
});
