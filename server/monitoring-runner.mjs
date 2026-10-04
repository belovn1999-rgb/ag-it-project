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
//   … --daily            every day at 9:00 (MONITORING_HOUR), catching up
//                        jobs not yet run today when started later
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
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CDP_URL = (process.env.MOBILEDE_CDP_URL || "http://127.0.0.1:9333").replace(/\/$/, "");
const JOB_TIMEOUT_MS = 30 * 60 * 1000;

function parseArgs(argv) {
  const args = { daily: false, hour: Number(process.env.MONITORING_HOUR || 9) };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = () => argv[++index];
    if (name === "--jobs") args.jobs = value();
    else if (name === "--out") args.out = value();
    else if (name === "--app") args.app = value();
    else if (name === "--only") args.only = value();
    else if (name === "--hour") args.hour = Number(value());
    else if (name === "--daily") args.daily = true;
    else throw new Error(`Unknown option ${name}`);
  }
  args.app = args.app || process.env.MONITORING_APP_URL || "";
  if (!args.jobs || !args.out || !args.app) {
    throw new Error("Usage: node server/monitoring-runner.mjs --jobs <jobs.json> --out <dir> --app <mobile.html?runner=1 URL> [--daily] [--only <id>]");
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

async function runJobs(args, jobs) {
  const browser = await connectChrome();
  let page = null;
  try {
    page = await openApp(browser, args.app);
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
      } catch (error) {
        // One car failing does not stop the others.
        log(`job ${job.id} — failed: ${error.message}`);
      } finally {
        clearInterval(ticker);
      }
    }
  } finally {
    await page?.close();
    browser.close();
  }
}

async function readJobs(args) {
  const data = JSON.parse(await readFile(args.jobs, "utf8"));
  const jobs = (Array.isArray(data) ? data : data.jobs || []).filter((job) => job?.id && job.filters);
  return args.only ? jobs.filter((job) => String(job.id) === args.only) : jobs;
}

function todayAt(hour) {
  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  return at;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.out, { recursive: true });
  if (!args.daily) {
    await runJobs(args, await readJobs(args));
    return;
  }
  // Daily: at the hour; started later, it first catches up today's jobs.
  for (;;) {
    const start = todayAt(args.hour).getTime();
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
