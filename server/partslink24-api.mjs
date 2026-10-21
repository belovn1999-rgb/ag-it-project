import http from "node:http";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readPdfText } from "../tools/partslink24/report-extraction.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const routesPath = join(repoRoot, "tools/partslink24/brand-routes.json");
const envLoadWarnings = [];
loadLocalEnv(join(homedir(), "Library/Application Support/AUTOGOOD/partslink24.env"));
if (!hasPartslinkCredentials()) loadLocalEnv(join(repoRoot, "server/.env"));
if (!hasPartslinkCredentials()) loadLocalEnv(join(repoRoot, "tools/partslink24/.env"));
const routes = JSON.parse(readTextFile(routesPath));
const outputDir = resolve(process.env.PARTSLINK24_OUTPUT_DIR || join(homedir(), "Library/Application Support/AUTOGOOD/partslink24-output"));
const port = Number(process.env.PORT || 4174);
const minRunGapMs = Number(process.env.PARTSLINK24_MIN_RUN_GAP_MS || 7000);
const publicPartslinkPage = "https://belovn1999-rgb.github.io/ag-it-project/partslink24.html";
// Only the public VIN page (and pages served by this server itself) may call
// the API from a browser. The key is the real gate: until 21.10 anyone who knew
// the tunnel URL could run checks on the company login and download any report,
// because stored file names (Brand_VIN_LANG.pdf) are easy to guess.
const allowedOrigins = new Set(["https://belovn1999-rgb.github.io"]);
const signedLinkTtlSeconds = 12 * 60 * 60;
let partslinkQueue = Promise.resolve();
let lastRunFinishedAt = 0;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

// The static handler used to serve anything inside the repo root, which meant a
// plain GET could read tools/partslink24/.env — the live PartsLink24 password.
// It never leaked in the current setup only because the credentials happen to
// live outside the served directory; the deployment guide's "upload the full
// repo, create server/.env" layout would have published them on day one.
// Two gates now: the extension must be one we intend to serve, and no path
// segment may start with a dot (.env, .git, .gitignore).
function isServablePath(filePath, repoRoot) {
  if (!filePath.startsWith(`${repoRoot}/`)) return false;
  const relative = filePath.slice(repoRoot.length + 1);
  if (relative.split("/").some((segment) => segment.startsWith("."))) return false;
  return Object.hasOwn(mimeTypes, extname(filePath).toLowerCase());
}

export async function handlePartslink24Request(request, response) {
  response.corsOrigin = allowedCorsOrigin(request.headers.origin);
  try {
    if (request.method === "OPTIONS") return sendNoContent(response);
    if (request.method === "POST" && request.url?.startsWith("/api/partslink24/")) {
      const denied = checkAccess(request);
      if (denied) return sendJson(response, denied.status, { ok: false, error: denied.error });
    }
    if (request.method === "POST" && request.url === "/api/partslink24/check-vin") {
      return handleVinCheck(request, response);
    }
    if (request.method === "POST" && request.url === "/api/partslink24/production-date") {
      return handleProductionDateCheck(request, response);
    }
    if (request.method === "GET" && request.url?.startsWith("/api/partslink24/pdf-text/")) {
      return sendPdfText(request, response);
    }
    if (request.method === "GET" && request.url?.startsWith("/api/partslink24/pdf/")) {
      return sendPdf(request, response);
    }
    if (request.method === "GET" || request.method === "HEAD") {
      return sendStatic(request, response);
    }
    return sendJson(response, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    return sendJson(response, 500, { ok: false, error: errorMessage(error) });
  }
}

if (isDirectRun()) {
  const server = http.createServer(handlePartslink24Request);
  server.listen(port, () => {
    process.stdout.write(`PartsLink24 VIN server: http://127.0.0.1:${port}/partslink24.html\n`);
  });
}

async function handleVinCheck(request, response) {
  const payload = await readPartslinkPayload(request, response);
  if (!payload) return;
  const { brand, language, vin } = payload;

  const result = await enqueuePartslinkRun(() => runPartslinkScript({ brand, language, vin, mode: "full" }));
  if (!result.ok) return sendRunFailure(response, result);

  const pdfPaths = Array.isArray(result.pdfPaths) && result.pdfPaths.length
    ? result.pdfPaths
    : [result.pdfPath].filter(Boolean);
  const files = pdfPaths.map((pdfPath) => {
    const storedFileName = basename(pdfPath || "");
    const fileName = makeVinPdfDownloadName(brand, vin);
    return {
      fileName,
      downloadUrl: `/api/partslink24/pdf/${encodeURIComponent(storedFileName)}?downloadName=${encodeURIComponent(fileName)}&${signPdfLink(storedFileName, process.env.PARTSLINK24_ACCESS_KEY)}`
    };
  });
  const firstFile = files[0] || {};
  return sendJson(response, 200, {
    ok: true,
    brand,
    language,
    vin,
    vehicleDescription: result.vehicleDescription || "",
    productionDate: result.productionDate || "",
    engineType: result.engineType || "",
    engineVolume: result.engineVolume || "",
    fileName: firstFile.fileName,
    downloadUrl: firstFile.downloadUrl,
    files
  });
}

async function handleProductionDateCheck(request, response) {
  const payload = await readPartslinkPayload(request, response);
  if (!payload) return;
  const { brand, language, vin } = payload;

  const result = await enqueuePartslinkRun(() => runPartslinkScript({ brand, language, vin, mode: "production-date" }));
  if (!result.ok) return sendRunFailure(response, result);
  if (!result.productionDate) {
    return sendJson(response, 500, {
      ok: false,
      error: "PartsLink24 не вернул дату производства для этого VIN."
    });
  }

  return sendJson(response, 200, {
    ok: true,
    brand,
    language,
    vin,
    vehicleDescription: result.vehicleDescription || "",
    productionDate: result.productionDate,
    productionDateLabel: result.productionDateLabel || "",
    engineType: result.engineType || "",
    engineVolume: result.engineVolume || ""
  });
}

async function readPartslinkPayload(request, response) {
  const payload = await readJsonBody(request);
  const brand = String(payload.brand || "").trim();
  const language = String(payload.language || "").trim().toUpperCase();
  const vin = String(payload.vin || "").trim().toUpperCase();

  if (!routes.brands[brand]) {
    sendJson(response, 400, { ok: false, error: "Выберите поддерживаемую марку." });
    return null;
  }
  if (!routes.languages.includes(language)) {
    sendJson(response, 400, { ok: false, error: "Выберите поддерживаемый язык." });
    return null;
  }
  if (!/^[A-Z0-9]{17}$/.test(vin)) {
    sendJson(response, 400, { ok: false, error: "VIN должен содержать 17 символов." });
    return null;
  }
  if (!process.env.PARTSLINK24_COMPANY_ID || !process.env.PARTSLINK24_USERNAME || !process.env.PARTSLINK24_PASSWORD) {
    sendJson(response, 500, {
      ok: false,
      error: envLoadWarnings.length
        ? "Сервер не смог прочитать локальный файл с данными входа PartsLink24."
        : "На сервере не настроены данные входа PartsLink24."
    });
    return null;
  }

  return { brand, language, vin };
}

function enqueuePartslinkRun(run) {
  const queued = partslinkQueue.then(async () => {
    const elapsed = Date.now() - lastRunFinishedAt;
    if (lastRunFinishedAt && elapsed < minRunGapMs) {
      await delay(minRunGapMs - elapsed);
    }
    try {
      return await run();
    } finally {
      lastRunFinishedAt = Date.now();
    }
  });
  partslinkQueue = queued.catch(() => {});
  return queued;
}

async function runPartslinkScript({ brand, language, vin, mode }) {
  const firstResult = await runPartslinkScriptAttempt({ brand, language, vin, mode });
  if (firstResult.ok || !shouldRetryPartslinkRun(firstResult)) return firstResult;

  const profileDir = makeTransientProfileDir();
  const retryResult = await runPartslinkScriptAttempt({
    brand,
    language,
    vin,
    mode,
    env: {
      PARTSLINK24_DEBUG_ERRORS: "1",
      PARTSLINK24_PROFILE_DIR: profileDir
    },
    cleanupDir: profileDir
  });

  if (!retryResult.ok) {
    retryResult.details = {
      ...(retryResult.details || {}),
      retriedWithFreshProfile: true,
      firstAttempt: firstResult.details || { error: firstResult.error }
    };
  }
  return retryResult;
}

function runPartslinkScriptAttempt({ brand, language, vin, mode, env = {}, cleanupDir = "" }) {
  const scriptPath = join(repoRoot, "tools/partslink24/download-vin-pdf.mjs");
  const args = [
    scriptPath,
    "--brand", brand,
    "--vin", vin,
    "--language", language,
    "--mode", mode,
    "--out-dir", outputDir
  ];

  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (code) => {
      if (settled) return;
      settled = true;
      if (cleanupDir) cleanupTransientProfileDir(cleanupDir);
      const parsed = parseLastJson(stdout) || parseLastJson(stderr);
      if (code === 0 && parsed?.ok) return resolveRun(parsed);
      return resolveRun({
        ok: false,
        error: parsed?.error || (mode === "production-date" ? "PartsLink24 не вернул дату производства." : mode === "full" ? "PartsLink24 не вернул результаты проверки." : "PartsLink24 не вернул PDF."),
        details: parsed || {
          code,
          stderr: tailText(stderr),
          stdout: tailText(stdout)
        }
      });
    };

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", finish);
    child.on("exit", (code) => setTimeout(() => finish(code), 100));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      if (cleanupDir) cleanupTransientProfileDir(cleanupDir);
      resolveRun({ ok: false, error: errorMessage(error) });
    });
  });
}

function shouldRetryPartslinkRun(result) {
  if (result.ok) return false;
  const text = `${result.error || ""}\n${JSON.stringify(result.details || {})}`;
  return /PartsLink24 не вернул PDF|PartsLink24 не вернул результаты проверки|Unknown system error -11|ProcessSingleton|profile|lock|browser/i.test(text);
}

function makeTransientProfileDir() {
  const root = join(homedir(), "Library/Application Support/AUTOGOOD/partslink24-run-profiles");
  mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, "run-"));
}

function cleanupTransientProfileDir(path) {
  if (!path || !path.includes("partslink24-run-profiles")) return;
  rmSync(path, { recursive: true, force: true });
}

function tailText(value, maxLength = 2000) {
  const text = String(value || "").trim();
  return text.length > maxLength ? text.slice(-maxLength) : text;
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function sendPdf(request, response) {
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
  const encodedName = requestUrl.pathname.replace("/api/partslink24/pdf/", "");
  const fileName = basename(decodeURIComponent(encodedName));
  const filePath = resolve(outputDir, fileName);
  const requestedDownloadName = normalizeDownloadFileName(requestUrl.searchParams.get("downloadName"));
  const downloadName = requestedDownloadName || normalizeDownloadFileName(fileName) || fileName;
  const disposition = requestUrl.searchParams.get("preview") === "1" ? "inline" : "attachment";

  if (!pdfLinkValid(fileName, requestUrl.searchParams.get("exp"), requestUrl.searchParams.get("sig"), process.env.PARTSLINK24_ACCESS_KEY)) {
    return sendJson(response, 403, { ok: false, error: "Ссылка на PDF устарела — проверьте VIN ещё раз." });
  }
  if (!filePath.startsWith(`${outputDir}/`) || extname(filePath).toLowerCase() !== ".pdf" || !existsSync(filePath)) {
    return sendJson(response, 404, { ok: false, error: "PDF не найден." });
  }

  response.writeHead(200, {
    "content-type": "application/pdf",
    "content-disposition": `${disposition}; filename="${downloadName}"`,
    "content-length": statSync(filePath).size,
    ...corsHeaders(response)
  });
  return createReadStream(filePath).pipe(response);
}

function sendPdfText(request, response) {
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
  const encodedName = requestUrl.pathname.replace("/api/partslink24/pdf-text/", "");
  const fileName = basename(decodeURIComponent(encodedName));
  const filePath = resolve(outputDir, fileName);

  if (!pdfLinkValid(fileName, requestUrl.searchParams.get("exp"), requestUrl.searchParams.get("sig"), process.env.PARTSLINK24_ACCESS_KEY)) {
    return sendJson(response, 403, { ok: false, error: "Ссылка на PDF устарела — проверьте VIN ещё раз." });
  }
  if (!filePath.startsWith(`${outputDir}/`) || extname(filePath).toLowerCase() !== ".pdf" || !existsSync(filePath)) {
    return sendJson(response, 404, { ok: false, error: "PDF не найден." });
  }

  const text = readPdfText(filePath);
  if (!text) return sendJson(response, 500, { ok: false, error: "Не удалось извлечь текст из PDF." });

  response.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    "cache-control": "no-store",
    ...corsHeaders(response)
  });
  return response.end(text);
}

export function normalizeDownloadFileName(value) {
  const fileName = basename(String(value || ""))
    .replace(/[^A-Za-z0-9_.-]/g, "_");
  if (!fileName.toLowerCase().endsWith(".pdf")) return "";
  return fileName.replace(/_(?:RU|PL|ENG)(?=(?:_(?:vehicle|equipment|\d+))?\.pdf$)/i, "");
}

export function makeVinPdfDownloadName(brand, vin) {
  return normalizeDownloadFileName(`${brand}_${vin}.pdf`);
}

function sendStatic(request, response) {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const requestHost = String(request.headers.host || "").toLowerCase();
  if (url.pathname === "/partslink24.html" && /^[a-z0-9-]+\.trycloudflare\.com$/.test(requestHost)) {
    const apiBase = `https://${requestHost}`;
    response.writeHead(302, {
      location: `${publicPartslinkPage}?api=${encodeURIComponent(apiBase)}`,
      "cache-control": "no-store",
      ...corsHeaders(response)
    });
    return response.end();
  }
  const rawPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(repoRoot, `.${normalize(rawPath)}`);

  if (!isServablePath(filePath, repoRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    return sendJson(response, 404, { ok: false, error: "Not found." });
  }

  const type = mimeTypes[extname(filePath).toLowerCase()];
  response.writeHead(200, {
    "content-type": type,
    "content-length": statSync(filePath).size,
    "cache-control": type.startsWith("text/html") ? "no-store" : "no-cache",
    ...corsHeaders(response)
  });
  if (request.method === "HEAD") return response.end();
  return createReadStream(filePath).pipe(response);
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_768) request.destroy();
    });
    request.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch (error) {
        rejectBody(error);
      }
    });
    request.on("error", rejectBody);
  });
}

function parseLastJson(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  for (const candidate of text.match(/\{[\s\S]*\}/g)?.reverse() || []) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep looking; Playwright can print non-JSON warnings around the payload.
    }
  }
  return null;
}

function loadLocalEnv(path) {
  if (!existsSync(path)) return;

  let lines;
  try {
    lines = readTextFile(path).split(/\r?\n/);
  } catch (error) {
    const message = `Cannot read ${path}: ${errorMessage(error)}`;
    envLoadWarnings.push(message);
    process.stderr.write(`[partslink24-api] ${message}\n`);
    return;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export function hasPartslinkCredentials() {
  return Boolean(process.env.PARTSLINK24_COMPANY_ID && process.env.PARTSLINK24_USERNAME && process.env.PARTSLINK24_PASSWORD);
}

function readTextFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const fallback = spawnSync("/bin/cat", [path], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    });
    if (fallback.status === 0) return fallback.stdout;
    throw error;
  }
}

function sendNoContent(response) {
  response.writeHead(204, corsHeaders(response));
  response.end();
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders(response)
  });
  response.end(JSON.stringify(payload, null, 2));
}

function corsHeaders(response) {
  if (!response.corsOrigin) return {};
  return {
    "access-control-allow-origin": response.corsOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-vin-key",
    vary: "origin"
  };
}

// The old "*" plus access-control-allow-private-network let any website opened
// on this Mac drive 127.0.0.1:4174. Only the VIN page and local pages pass now.
export function allowedCorsOrigin(origin) {
  const value = String(origin || "");
  if (allowedOrigins.has(value)) return value;
  if (/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(value)) return value;
  return "";
}

export function checkAccess(request) {
  const origin = request.headers.origin;
  if (origin && !allowedCorsOrigin(origin)) return { status: 403, error: "Запрос с чужой страницы." };
  const expected = process.env.PARTSLINK24_ACCESS_KEY || "";
  if (!expected) return { status: 500, error: "На сервере не задан ключ доступа к проверке VIN." };
  if (!accessKeyMatches(request.headers["x-vin-key"], expected)) return { status: 401, error: "Нужен ключ доступа к проверке VIN." };
  return null;
}

export function accessKeyMatches(provided, expected) {
  const left = Buffer.from(String(provided || ""));
  const right = Buffer.from(String(expected || ""));
  return right.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

// PDF links are opened by <a href> and <iframe>, which cannot send the key
// header, so the server signs each link it hands out; a guessed file name alone
// no longer downloads a client report.
export function signPdfLink(fileName, key, now = Date.now()) {
  const exp = Math.floor(now / 1000) + signedLinkTtlSeconds;
  return `exp=${exp}&sig=${pdfLinkSignature(fileName, exp, key)}`;
}

export function pdfLinkValid(fileName, exp, sig, key, now = Date.now()) {
  if (!key || !exp || !sig || !/^\d+$/.test(String(exp))) return false;
  if (Number(exp) < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(pdfLinkSignature(fileName, Number(exp), key));
  const provided = Buffer.from(String(sig));
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function pdfLinkSignature(fileName, exp, key) {
  return createHmac("sha256", String(key)).update(`${fileName}:${exp}`).digest("hex");
}

// Robot output (stderr tail, Mac paths, screenshot location) stays in the
// server log; the browser only gets the short reason the page translates.
function sendRunFailure(response, result) {
  if (result.details) process.stderr.write(`[partslink24-api] ${JSON.stringify(result.details).slice(0, 4000)}\n`);
  return sendJson(response, 500, { ok: false, error: result.error || "PartsLink24 не вернул результаты проверки." });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error.";
}

function isDirectRun() {
  return import.meta.url === pathToFileURL(process.argv[1] || "").href;
}
