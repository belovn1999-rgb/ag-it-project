#!/usr/bin/env node
// AUTOGOOD Monitoring runner (B43): the daily monitoring without a manager's
// browser being open.
//
// It opens the search page (mobile.html?runner=1) in a Chrome driven over
// DevTools — the importer's Chrome: mobile.de answers only a real Chrome, see
// docs/PROJECT-MOBILE.md 4.3.1 — and asks the page to run each job:
// window.AUTOGOOD_MONITORING.run(job) reads the portals exactly as the page
// does when a manager presses "Uruchom monitoring" (the same code, the same
// proxy queue) and returns the record the page would have saved. Records are
// written as JSON files <out>/<job id>/<time>.json; a manager's browser takes
// them in with window.AUTOGOOD_MONITORING.importRecords(records).
//
//   node server/monitoring-runner.mjs --jobs jobs.json --out data/monitoring \
//     --app "http://127.0.0.1:8790/mobile.html?runner=1&mobiledeApi=http%3A%2F%2F127.0.0.1%3A8788%2Fmobilede%2Fimport"
//   … --daily            every day at 9:00 (--hour, --minute), catching up
//                        jobs not yet run today when started later
//   … --serve 8789       the local service of this Mac (variant B): the page
//                        sends its jobs, takes the records; checks at the time
//   … --app <url> twice  a fallback address when the first does not load
//   … --only <job id>    one job
//
// jobs.json is what window.AUTOGOOD_MONITORING.jobs() gives in the manager's
// browser. How jobs arrive and records go back (server API with the
// employee's login) waits for B26 — docs/MONITORING-SERVER.md.
//
// Jobs run one after another (owner, 2026-10-04: the portals are not asked
// for several cars at once). Chrome should run with
// --disable-background-timer-throttling --disable-renderer-backgrounding,
// or a hidden tab's pauses (the proxy's minute limit) stretch to a minute.
import http from "node:http";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CDP_URL = (process.env.MOBILEDE_CDP_URL || "http://127.0.0.1:9333").replace(/\/$/, "");
const JOB_TIMEOUT_MS = 30 * 60 * 1000;

function parseArgs(argv) {
  const args = { daily: false, hour: Number(process.env.MONITORING_HOUR || 9), minute: Number(process.env.MONITORING_MINUTE || 0), apps: [], sites: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = () => argv[++index];
    if (name === "--jobs") args.jobs = value();
    else if (name === "--out") args.out = value();
    else if (name === "--app") args.apps.push(value());
    else if (name === "--only") args.only = value();
    else if (name === "--hour") args.hour = Number(value());
    else if (name === "--minute") args.minute = Number(value());
    else if (name === "--serve") args.serve = Number(value());
    else if (name === "--site") args.sites.push(value());
    else if (name === "--daily") args.daily = true;
    else throw new Error(`Unknown option ${name}`);
  }
  if (!args.apps.length && process.env.MONITORING_APP_URL) args.apps.push(process.env.MONITORING_APP_URL);
  // --serve with --site: the page comes through this service (see serveApp).
  if (args.serve && args.sites.length && !args.apps.length) {
    args.apps.push(`http://127.0.0.1:${args.serve}/app/mobile.html?runner=1&mobiledeApi=${encodeURIComponent("http://127.0.0.1:8788/mobilede/import")}`);
  }
  if (!args.jobs || !args.out || !args.apps.length) {
    throw new Error("Usage: node server/monitoring-runner.mjs --jobs <jobs.json> --out <dir> --app <mobile.html?runner=1 URL> [--app <fallback>] [--daily | --serve <port>] [--hour 9 --minute 30] [--only <id>]");
  }
  return args;
}

const log = (...parts) => process.stdout.write(`${new Date().toISOString()} ${parts.join(" ")}\n`);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeName = (value) => String(value).replace(/[^\w.-]+/g, "_").slice(0, 80);

// ---- Chrome DevTools (the same protocol use as server/mobilede-import.mjs) --
async function connectChrome() {
  let version;
  try {
    version = await (await fetch(`${CDP_URL}/json/version`)).json();
  } catch {
    throw new Error(`No Chrome DevTools at ${CDP_URL}: start Chrome with --remote-debugging-port (the importer starts its Chrome on first use).`);
  }
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  const pending = new Map();
  let commandId = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const handler = message.id && pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message || "Chrome DevTools command failed"));
    else handler.resolve(message.result || {});
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("Chrome DevTools websocket failed.")), { once: true });
  });
  const send = (method, params = {}, sessionId = undefined, timeoutMs = 30000) => new Promise((resolve, reject) => {
    commandId += 1;
    const id = commandId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome did not answer ${method}`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  return { send, close: () => socket.close() };
}

// The page in a background tab of that Chrome; nothing comes to the front.
async function openApp(browser, url) {
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank", background: true });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  await browser.send("Runtime.enable", {}, sessionId);
  await browser.send("Page.enable", {}, sessionId);
  await browser.send("Page.setWebLifecycleState", { state: "active" }, sessionId).catch(() => {});
  await browser.send("Page.navigate", { url }, sessionId);
  const evaluate = async (expression, timeoutMs = 30000) => {
    const result = await browser.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId, timeoutMs);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Page script failed");
    return result.result?.value;
  };
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await delay(1000);
    const ready = await evaluate("typeof window.AUTOGOOD_MONITORING?.run === 'function' && window.AUTOGOOD_MONITORING.runner === true").catch(() => false);
    if (ready) return { evaluate, close: () => browser.send("Target.closeTarget", { targetId }).catch(() => {}) };
  }
  await browser.send("Target.closeTarget", { targetId }).catch(() => {});
  throw new Error(`The page did not offer AUTOGOOD_MONITORING (runner=1): ${url}`);
}

// ---- Records ------------------------------------------------------------
async function writeRecord(out, record) {
  const dir = join(out, safeName(record.historyId));
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${record.at.replace(/:/g, "-")}.json`);
  // Written whole or not at all: a half file is never read as a record.
  await writeFile(`${file}.tmp`, JSON.stringify(record));
  await rename(`${file}.tmp`, file);
  return file;
}

async function ranSince(out, jobId, since) {
  try {
    const files = await readdir(join(out, safeName(jobId)));
    return files.some((name) => name.endsWith(".json") && Date.parse(name.replace(/\.json$/, "").replace(/T(\d\d)-(\d\d)-(\d\d)/, "T$1:$2:$3")) >= since);
  } catch {
    return false;
  }
}

function summary(record) {
  const markets = Object.entries(record.markets || {}).map(([source, market]) => `${source} ${market.offers?.length || 0}/${market.total || 0}`).join(", ");
  const extra = record.extra ? Object.values(record.extra.markets || {}).reduce((sum, market) => sum + (market.offers?.length || 0), 0) : 0;
  return `${markets}${record.extra ? `; dodatkowe ${extra}` : ""}`;
}

async function runJobs(args, jobs, onJob = () => {}) {
  const browser = await connectChrome();
  let page = null;
  try {
    page = await openFirstApp(browser, args.apps);
    for (const job of jobs) {
      log(`job ${job.id} (${job.title || ""}) — start`);
      const ticker = setInterval(async () => {
        const progress = await page.evaluate("window.AUTOGOOD_MONITORING.progress()").catch(() => null);
        if (progress) log(`job ${job.id} … ${Object.entries(progress).map(([source, info]) => `${source}:${info.state}${info.done ? ` ${info.done}/${info.total}` : ""}${info.count ? ` ${info.count}` : ""}`).join(" ")}`);
      }, 30000);
      try {
        const record = await page.evaluate(`window.AUTOGOOD_MONITORING.run(${JSON.stringify(job)})`, JOB_TIMEOUT_MS);
        const file = await writeRecord(args.out, record);
        log(`job ${job.id} — ${summary(record)} → ${file}`);
        onJob(job, true);
      } catch (error) {
        // One car failing does not stop the others.
        log(`job ${job.id} — failed: ${error.message}`);
        onJob(job, false, error);
      } finally {
        clearInterval(ticker);
      }
    }
  } finally {
    await page?.close();
    browser.close();
  }
}

// The first address that offers the page: the live site, then a fallback.
async function openFirstApp(browser, apps) {
  let last = null;
  for (const url of apps) {
    try {
      return await openApp(browser, url);
    } catch (error) {
      last = error;
      log(`app not ready: ${error.message}`);
    }
  }
  throw last || new Error("No app address");
}

// jobs.json: { jobs: [...] } (an export) or, in --serve mode,
// { clients: { <browser id>: { updatedAt, jobs } } } — every browser on this
// Mac that has monitoring switched on sends its own list.
const CLIENT_KEEP_MS = 14 * 24 * 60 * 60 * 1000;
async function readJobFile(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }
}
function jobsOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.jobs)) return data.jobs;
  const byId = new Map();
  Object.values(data.clients || {})
    .filter((client) => Date.now() - Date.parse(client.updatedAt || 0) < CLIENT_KEEP_MS)
    .forEach((client) => (client.jobs || []).forEach((job) => byId.set(String(job.id), job)));
  return [...byId.values()];
}
async function readJobs(args) {
  const jobs = jobsOf(await readJobFile(args.jobs)).filter((job) => job?.id && job.filters);
  return args.only ? jobs.filter((job) => String(job.id) === args.only) : jobs;
}

function todayAt(hour, minute = 0) {
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  return at;
}

// ---- --serve: the local service of this Mac (variant B, owner 2026-10-04) --
// Listens on 127.0.0.1 only (never through the tunnel): the search page in a
// browser of this Mac sends its jobs and takes the records; every day at the
// set time (9:30) the due cars are checked one after another, also when no
// program is open. A car is due when it has no record since today's time; a
// Mac asleep at 9:30 catches up when it wakes. At most 2 tries a car a day.
const ALLOWED_ORIGIN = /^(https:\/\/belovn1999-rgb\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const MAX_BODY = 2 * 1024 * 1024;
const RECORDS_PER_ANSWER = 20;

async function listRecords(out, ids, since) {
  const found = [];
  for (const id of ids) {
    let files = [];
    try {
      files = await readdir(join(out, safeName(id)));
    } catch {
      continue;
    }
    files.filter((name) => name.endsWith(".json")).forEach((name) => {
      const at = name.replace(/\.json$/, "").replace(/T(\d\d)-(\d\d)-(\d\d)/, "T$1:$2:$3");
      if (Date.parse(at) > since) found.push({ id, at, file: join(out, safeName(id), name) });
    });
  }
  return found.sort((left, right) => left.at.localeCompare(right.at));
}

// The search page from the live site, handed out by this service at
// http://127.0.0.1:<port>/app/…: the runner's page then asks the importer
// (127.0.0.1:8788) from the same machine — Chrome asks no "local network"
// permission, which nobody could click in the importer's Chrome. Always the
// live code; several --site addresses (the repository was renamed 2026-10-04).
async function serveApp(args, request, response) {
  const path = (request.url || "").slice("/app/".length);
  for (const site of args.sites) {
    try {
      const answer = await fetch(new URL(path, site.endsWith("/") ? site : `${site}/`), { cache: "no-store" });
      if (answer.status === 404) continue;
      response.writeHead(answer.status, { "content-type": answer.headers.get("content-type") || "application/octet-stream", "cache-control": "no-store" });
      response.end(Buffer.from(await answer.arrayBuffer()));
      return;
    } catch {
      // The next address.
    }
  }
  response.writeHead(502, { "content-type": "text/plain" });
  response.end("Site not reachable");
}

function serve(args) {
  const state = { running: false, lastRun: null, tries: new Map(), nextRun: "" };
  const runTime = () => todayAt(args.hour, args.minute).getTime();
  const send = (request, response, status, payload) => {
    const origin = request.headers.origin || "";
    response.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      ...(ALLOWED_ORIGIN.test(origin) ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
      "access-control-allow-methods": "GET, PUT, OPTIONS",
      "access-control-allow-headers": "content-type",
      // A public page (github.io) asking this Mac: Chrome's Private Network Access.
      "access-control-allow-private-network": "true",
      "cache-control": "no-store",
    });
    response.end(status === 204 ? "" : JSON.stringify(payload));
  };

  const tick = async () => {
    if (state.running) return;
    const start = runTime();
    state.nextRun = new Date(Date.now() < start ? start : start + 24 * 60 * 60 * 1000).toISOString();
    if (Date.now() < start) return;
    const day = new Date(start).toISOString().slice(0, 10);
    const due = [];
    for (const job of await readJobs(args)) {
      if ((state.tries.get(`${day}|${job.id}`) || 0) >= 2) continue;
      if (!(await ranSince(args.out, job.id, start))) due.push(job);
    }
    if (!due.length) return;
    state.running = true;
    due.forEach((job) => state.tries.set(`${day}|${job.id}`, (state.tries.get(`${day}|${job.id}`) || 0) + 1));
    let failed = 0;
    try {
      await runJobs(args, due, (job, ok) => { if (!ok) failed += 1; });
      state.lastRun = { at: new Date().toISOString(), ok: failed === 0, error: failed ? `${failed} of ${due.length} cars failed` : "" };
    } catch (error) {
      state.lastRun = { at: new Date().toISOString(), ok: false, error: error.message };
      log(`run failed: ${error.message}`);
    } finally {
      state.running = false;
    }
  };

  const server = http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url?.startsWith("/app/")) return serveApp(args, request, response);
    const origin = request.headers.origin || "";
    if (origin && !ALLOWED_ORIGIN.test(origin)) return send(request, response, 403, { ok: false, error: "Origin not allowed" });
    // Only straight from this Mac: nothing that came through a tunnel.
    if (request.headers["cf-ray"] || request.headers["cf-connecting-ip"]) return send(request, response, 403, { ok: false, error: "Local only" });
    if (request.method === "OPTIONS") return send(request, response, 204, {});
    const url = new URL(request.url || "/", "http://127.0.0.1");
    try {
      if (request.method === "GET" && url.pathname === "/monitoring/health") {
        const start = runTime();
        const jobs = await readJobs(args);
        return send(request, response, 200, {
          ok: true,
          service: "autogood-monitoring",
          time: `${String(args.hour).padStart(2, "0")}:${String(args.minute).padStart(2, "0")}`,
          running: state.running,
          jobs: jobs.length,
          nextRun: state.nextRun,
          lastRun: state.lastRun,
          // Today's run broke down: the page then checks by itself.
          failedToday: Boolean(state.lastRun && !state.lastRun.ok && Date.parse(state.lastRun.at) >= start),
        });
      }
      if (request.method === "PUT" && url.pathname === "/monitoring/jobs") {
        let body = "";
        for await (const chunk of request) {
          body += chunk;
          if (body.length > MAX_BODY) return send(request, response, 413, { ok: false, error: "Too large" });
        }
        const data = JSON.parse(body || "{}");
        const client = String(data.client || "").slice(0, 64);
        const jobs = Array.isArray(data.jobs) ? data.jobs.filter((job) => job && typeof job.id === "string" && job.filters && typeof job.filters === "object").slice(0, 50) : null;
        if (!client || !jobs) return send(request, response, 400, { ok: false, error: "Expected {client, jobs}" });
        const stored = await readJobFile(args.jobs);
        const clients = stored.clients && typeof stored.clients === "object" ? stored.clients : {};
        clients[client] = { updatedAt: new Date().toISOString(), jobs };
        await writeFile(`${args.jobs}.tmp`, JSON.stringify({ clients }));
        await rename(`${args.jobs}.tmp`, args.jobs);
        tick().catch(() => {});
        return send(request, response, 200, { ok: true, jobs: jobsOf({ clients }).length });
      }
      if (request.method === "GET" && url.pathname === "/monitoring/records") {
        const ids = (url.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 50);
        const since = Date.parse(url.searchParams.get("since") || "") || 0;
        const found = await listRecords(args.out, ids, since);
        const records = [];
        for (const item of found.slice(0, RECORDS_PER_ANSWER)) records.push(JSON.parse(await readFile(item.file, "utf8")));
        return send(request, response, 200, { ok: true, records, more: found.length > RECORDS_PER_ANSWER });
      }
      return send(request, response, 404, { ok: false, error: "Not found" });
    } catch (error) {
      return send(request, response, 500, { ok: false, error: error.message });
    }
  });
  server.listen(args.serve, "127.0.0.1", () => log(`AUTOGOOD Monitoring: http://127.0.0.1:${args.serve}/monitoring/health — every day at ${String(args.hour).padStart(2, "0")}:${String(args.minute).padStart(2, "0")}`));
  // Looked at every minute: the time is met, and a Mac that slept catches up.
  setInterval(() => tick().catch((error) => log(`tick: ${error.message}`)), 60 * 1000);
  setTimeout(() => tick().catch(() => {}), 5000);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.out, { recursive: true });
  if (args.serve) return serve(args);
  if (!args.daily) {
    await runJobs(args, await readJobs(args));
    return;
  }
  // Daily: at the time; started later, it first catches up today's jobs.
  for (;;) {
    const start = todayAt(args.hour, args.minute).getTime();
    if (Date.now() >= start) {
      const jobs = await readJobs(args);
      const due = [];
      for (const job of jobs) if (!(await ranSince(args.out, job.id, start))) due.push(job);
      if (due.length) await runJobs(args, due).catch((error) => log(`run failed: ${error.message}`));
    }
    const next = Date.now() < start ? start : start + 24 * 60 * 60 * 1000;
    log(`next monitoring ${new Date(next).toISOString()}`);
    await delay(Math.max(60 * 1000, next - Date.now()));
  }
}

main().catch((error) => {
  log(`error: ${error.message}`);
  process.exitCode = 1;
});
