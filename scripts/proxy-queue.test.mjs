// M15 (2026-10-11): a portal that refused on both ways (our Worker and
// r.jina.ai) twice in a row gets no more requests for 15 minutes; r.jina.ai
// answers 200 with the portal's block page inside, which counts as a refusal.
// The queue runs here with a stand-in for the network: no real site is asked.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/market-proxy-queue.js", import.meta.url), "utf8");
const WORKER = "https://ag-proxy.autogood-crm.workers.dev/";
const JINA = "https://r.jina.ai/";
const LIST_PAGE = `<html>${"<div class=\"car\">offer</div>".repeat(9000)}</html>`; // > 200 KB
const BLOCK_PAGE = '<html><head><link rel="icon" href="/.safeline/static/favicon.png"></head><body>…</body></html>';

function queueWith(answer) {
  const calls = [];
  const store = new Map();
  const context = {
    console, URL, Response, Headers, DOMException, AbortController, AbortSignal, setTimeout, clearTimeout, Date, JSON, Promise,
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
    },
    fetch: async (input) => {
      const url = String(input);
      calls.push(url);
      return answer(url);
    },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return { window: context, calls, store };
}

const kleinanzeigen = "https://www.kleinanzeigen.de/s-autos/toyota/k0c216";
const otomoto = "https://www.otomoto.pl/osobowe/toyota/corolla";

test("a block page on both ways: refused twice, then a pause with no request sent", async () => {
  const { window, calls } = queueWith((url) => {
    if (url.startsWith(WORKER) && url.includes("kleinanzeigen")) return new Response("forbidden", { status: 403 });
    if (url.startsWith(JINA) && url.includes("kleinanzeigen")) return new Response(BLOCK_PAGE, { status: 200 });
    return new Response(LIST_PAGE, { status: 200 });
  });
  await assert.rejects(window.fetch(`${JINA}${kleinanzeigen}`), /portal refused: kleinanzeigen\.de/);
  await assert.rejects(window.fetch(`${JINA}${kleinanzeigen}?page=2`), /portal refused: kleinanzeigen\.de/);
  const before = calls.length;
  await assert.rejects(window.fetch(`${JINA}${kleinanzeigen}?page=3`), /portal paused: kleinanzeigen\.de until \d{2}:\d{2}/);
  assert.equal(calls.length, before, "no request goes to a paused portal");
  assert.ok(window.AUTOGOOD_PROXY_QUEUE.pausedPortals()["kleinanzeigen.de"] > Date.now());
  // Another portal goes on as usual.
  const response = await window.fetch(`${JINA}${otomoto}`);
  assert.equal(response.status, 200);
});

test("a list page is never taken for a block page; an answer clears the strikes", async () => {
  let refuse = true;
  const { window } = queueWith((url) => {
    if (url.startsWith(WORKER)) return new Response("forbidden", { status: 403 });
    if (refuse) return new Response(BLOCK_PAGE, { status: 200 });
    return new Response(LIST_PAGE, { status: 200 });
  });
  await assert.rejects(window.fetch(`${JINA}${otomoto}`), /portal refused/);
  refuse = false;
  assert.equal((await window.fetch(`${JINA}${otomoto}?page=2`)).status, 200);
  refuse = true;
  // One refusal after an answer is a first strike again, not a pause.
  await assert.rejects(window.fetch(`${JINA}${otomoto}?page=3`), /portal refused/);
  assert.deepEqual(Object.keys(window.AUTOGOOD_PROXY_QUEUE.pausedPortals()), []);
});

test("the Worker's block page goes on to r.jina.ai, which reads the list", async () => {
  const { window, calls } = queueWith((url) => {
    if (url.startsWith(WORKER)) return new Response(BLOCK_PAGE, { status: 200 });
    return new Response(LIST_PAGE, { status: 200 });
  });
  const response = await window.fetch(`${JINA}${otomoto}`);
  assert.equal(response.status, 200);
  assert.ok(calls.some((url) => url.startsWith(WORKER)) && calls.some((url) => url.startsWith(JINA)));
});
