/* AUTOGOOD: one queue for every request through a market proxy — first our
 * own Cloudflare Worker (B11), the free reader proxy r.jina.ai as the backup.
 *
 * The portal modules keep calling fetch(`${r.jina.ai}${portal URL}`) as
 * before; every such call comes here and is sent one of two ways:
 *
 * 1. Our Worker (B11, server/cloudflare-proxy/worker.js, docs/PROJECT-MOBILE.md
 *    §4.9) for the portals it was measured to read (WORKER_HOSTS): the raw
 *    page or JSON, no minute limit of its own (free plan: 100 000 a day),
 *    WORKER_ACTIVE at a time. The x-respond-with header of r.jina.ai is not
 *    sent — a plain GET needs no CORS preflight; the parsers take both the
 *    raw body and r.jina.ai's. A refusal (403, 429, 5xx, a network error)
 *    sends the same request on to r.jina.ai (2.); five refusals in a row
 *    send a portal straight to r.jina.ai for 10 minutes.
 *    AUTOGOOD_WORKER_PROXY = "" switches the Worker off (another address
 *    replaces it).
 * 2. r.jina.ai allows 20 requests a minute per address ("x-ratelimit-limit:
 *    20, 20;w=60", checked 2026-10-04) and answers 429 above that. The browser
 *    cannot read how many are left (the header is not exposed to scripts), so
 *    the queue counts by itself:
 *    - at most 18 requests started in any 60 s, counted across the tabs of
 *      this browser ("autogood.proxyQueue.starts" in localStorage — a
 *      convenience, not user data; a broken or missing value only means "no
 *      recent starts");
 *    - at most 3 requests at a time;
 *    - a refusal (429, 503, or a network error, which is how a refusal
 *      without CORS headers looks to a script) pauses the whole queue — 20 s,
 *      then 40 s — and the same request is asked again, twice at most.
 *    Another reader proxy (AUTOGOOD_MARKET_PROXY) gets the same queue unless
 *    AUTOGOOD_PROXY_PER_MINUTE says it allows more.
 */
(() => {
  // A request that hangs must not hold its place in the queue for ever
  // (audit 2026-10-10: no request had a time limit; a portal that never
  // answered kept one of the 3 or 6 places until the page was closed). The
  // caller's own cancel still works: both signals together, with a stand-in
  // where the browser has no AbortSignal.any / AbortSignal.timeout.
  // Also used by mobile.js (the mobile.de importer) and mobile-ad-details.js.
  if (!window.AUTOGOOD_TIMEOUT_SIGNAL) {
    window.AUTOGOOD_TIMEOUT_SIGNAL = (ms, signal = null) => {
      if (typeof AbortController === "undefined") return signal || undefined;
      let timer;
      if (typeof AbortSignal.timeout === "function") timer = AbortSignal.timeout(ms);
      else {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new DOMException("The request took too long", "TimeoutError")), ms);
        timer = controller.signal;
      }
      if (!signal) return timer;
      if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, timer]);
      const both = new AbortController();
      [signal, timer].forEach((source) => {
        if (source.aborted) both.abort(source.reason);
        else source.addEventListener("abort", () => both.abort(source.reason), { once: true });
      });
      return both.signal;
    };
  }
  if (window.AUTOGOOD_PROXY_QUEUE) return;
  const nativeFetch = window.fetch.bind(window);
  const STARTS_KEY = "autogood.proxyQueue.starts";
  const WINDOW_MS = 60 * 1000;
  const MAX_ACTIVE = 3;
  const RETRIES = 2;
  const PAUSE_MS = 20 * 1000;
  const proxyBase = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const perMinute = () => Number(window.AUTOGOOD_PROXY_PER_MINUTE) || 18;
  // Time limits (audit 2026-10-10): r.jina.ai renders the page itself and
  // takes up to ~20 s on a heavy list; our Worker answers in 1–5 s.
  const JINA_TIMEOUT_MS = 45 * 1000;
  const WORKER_TIMEOUT_MS = 30 * 1000;
  const timed = (init, ms) => ({ ...(init || {}), signal: window.AUTOGOOD_TIMEOUT_SIGNAL(ms, init?.signal || null) });
  // Cancelled by the page itself (a newer count), not by the time limit.
  const cancelled = (job) => Boolean(job.init?.signal?.aborted);

  // Our Worker (B11). Hosts measured 2026-10-05 (docs/PROJECT-MOBILE.md
  // §4.9): the same data as r.jina.ai, 2–3 times faster. Kleinanzeigen
  // refuses some addresses ("IP-Bereich vorübergehend gesperrt", ~1 in 6)
  // and blocket a few (~1 in 12): those go on to r.jina.ai. Not here:
  // mobile.de (403 to both proxies — the importer on the Mac reads it),
  // av.by (read directly, CORS *).
  const WORKER_DEFAULT = "https://ag-proxy.autogood-crm.workers.dev/";
  const WORKER_HOSTS = [
    "otomoto.pl", "blocket.se", "kleinanzeigen.de", "marktplaats.nl", "2dehands.be", "2ememain.be",
    "autoscout24.de", "autoscout24.fr", "autoscout24.nl", "autoscout24.be", "autoscout24.at", "autoscout24.lu",
    "willhaben.at", "paruvendu.fr",
  ];
  // Pages a portal sends with code 200 instead of the list when it refuses
  // the Worker's address.
  const BLOCK_PAGES = { "kleinanzeigen.de": /IP-Bereich\s+vor(?:ü|&uuml;|&#252;|ue)bergehend\s+gesperrt/i };
  const WORKER_ACTIVE = 6;
  const WORKER_STRIKES = 5;
  const WORKER_REST_MS = 10 * 60 * 1000;
  const workerBase = () => {
    const base = window.AUTOGOOD_WORKER_PROXY ?? WORKER_DEFAULT;
    return typeof base === "string" ? base : "";
  };

  const queue = [];
  const listeners = new Set();
  let active = 0;
  let pausedUntil = 0;
  let timer = null;
  let localStarts = [];
  // For the record: how often the proxy still refused (other tabs, other
  // pages of the same address count too) and gave up after the retries.
  const stats = { sent: 0, refused: 0, failed: 0 };
  // The Worker's own record: answered, handed on to r.jina.ai.
  const worker = { queue: [], active: 0, sent: 0, ok: 0, fallback: 0, strikes: {}, restUntil: {} };

  function readStarts() {
    const now = Date.now();
    let shared = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(STARTS_KEY) || "[]");
      if (Array.isArray(parsed)) shared = parsed.filter((at) => Number.isFinite(at));
    } catch {
      shared = [];
    }
    return [...new Set([...shared, ...localStarts])].filter((at) => at > now - WINDOW_MS).sort((a, b) => a - b);
  }

  function noteStart(at) {
    localStarts = [...localStarts, at].filter((time) => time > at - WINDOW_MS);
    try {
      const starts = readStarts();
      localStorage.setItem(STARTS_KEY, JSON.stringify([...new Set([...starts, at])].slice(-50)));
    } catch {
      // Storage blocked: this tab still counts its own requests.
    }
  }

  function notify() {
    const info = status();
    listeners.forEach((listener) => {
      try {
        listener(info);
      } catch {
        // A listener's error is not the queue's.
      }
    });
  }

  function status() {
    const starts = readStarts();
    const full = starts.length >= perMinute();
    const resumeAt = Math.max(pausedUntil, full ? starts[0] + WINDOW_MS : 0);
    return {
      active,
      waiting: queue.length,
      resumeAt: resumeAt > Date.now() ? resumeAt : 0,
      paused: pausedUntil > Date.now(),
      ...stats,
      worker: { active: worker.active, waiting: worker.queue.length, sent: worker.sent, ok: worker.ok, fallback: worker.fallback },
    };
  }

  function later(ms) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      pump();
    }, Math.max(50, ms));
  }

  function pump() {
    while (queue.length && active < MAX_ACTIVE) {
      const now = Date.now();
      if (pausedUntil > now) {
        later(pausedUntil - now);
        break;
      }
      const starts = readStarts();
      if (starts.length >= perMinute()) {
        later(starts[0] + WINDOW_MS - now + 100);
        break;
      }
      const job = queue.shift();
      // Cancelled while waiting (a newer count replaced it): not sent at all.
      if (job.init?.signal?.aborted) {
        job.reject(job.init.signal.reason || new DOMException("Aborted", "AbortError"));
        continue;
      }
      start(job, now);
    }
    notify();
  }

  function refused(job) {
    stats.refused += 1;
    if (job.attempts >= RETRIES) {
      stats.failed += 1;
      return false;
    }
    job.attempts += 1;
    pausedUntil = Math.max(pausedUntil, Date.now() + PAUSE_MS * job.attempts);
    queue.unshift(job);
    return true;
  }

  function start(job, at) {
    active += 1;
    stats.sent += 1;
    noteStart(at);
    nativeFetch(job.input, timed(job.init, JINA_TIMEOUT_MS)).then((response) => {
      active -= 1;
      if ((response.status === 429 || response.status === 503) && refused(job)) return pump();
      job.resolve(response);
      pump();
    }, (error) => {
      active -= 1;
      // Over time: given up at once (no 20 s + 40 s retries for a portal
      // that does not answer); the portal then counts as "no answer".
      const late = !cancelled(job) && (error?.name === "TimeoutError" || error?.name === "AbortError");
      if (late) {
        stats.failed += 1;
        job.reject(new Error("timeout: the portal did not answer in time"));
      } else if (error?.name !== "AbortError" && refused(job)) return pump();
      else job.reject(error);
      pump();
    });
  }

  function urlOf(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return String(input?.url || "");
  }

  // ---- 1. Our Worker ----------------------------------------------------------

  // The portal host a Worker may read, or "" (r.jina.ai then).
  function workerHost(target) {
    if (!workerBase()) return "";
    let host;
    try {
      host = new URL(target).hostname.toLowerCase();
    } catch {
      return "";
    }
    const allowed = WORKER_HOSTS.find((item) => host === item || host.endsWith(`.${item}`)) || "";
    return allowed && !(worker.restUntil[allowed] > Date.now()) ? allowed : "";
  }

  function pumpWorker() {
    while (worker.queue.length && worker.active < WORKER_ACTIVE) {
      const job = worker.queue.shift();
      if (job.init?.signal?.aborted) {
        job.reject(job.init.signal.reason || new DOMException("Aborted", "AbortError"));
        continue;
      }
      startWorker(job);
    }
    notify();
  }

  // The Worker did not get the page: r.jina.ai is asked instead.
  function handOn(job) {
    worker.fallback += 1;
    const strikes = (worker.strikes[job.host] || 0) + 1;
    worker.strikes[job.host] = strikes;
    if (strikes >= WORKER_STRIKES) {
      worker.restUntil[job.host] = Date.now() + WORKER_REST_MS;
      worker.strikes[job.host] = 0;
    }
    queue.push(job);
    pump();
  }

  function startWorker(job) {
    worker.active += 1;
    worker.sent += 1;
    // Only the signal is kept: no x-respond-with, so no CORS preflight.
    // Over WORKER_TIMEOUT_MS the request goes on to r.jina.ai, like a refusal.
    const init = { signal: window.AUTOGOOD_TIMEOUT_SIGNAL(WORKER_TIMEOUT_MS, job.init?.signal || null) };
    nativeFetch(`${workerBase()}${job.target}`, init).then(async (response) => {
      // A block page with code 200 (Kleinanzeigen "IP-Bereich vorübergehend
      // gesperrt", 2026-10-10) is a refusal too: r.jina.ai reads the list.
      const blocked = response.ok && BLOCK_PAGES[job.host]
        ? await response.clone().text().then((text) => BLOCK_PAGES[job.host].test(text), () => false)
        : false;
      worker.active -= 1;
      if (blocked || response.status === 403 || response.status === 429 || response.status >= 500) handOn(job);
      else {
        worker.ok += 1;
        worker.strikes[job.host] = 0;
        job.resolve(response);
      }
      pumpWorker();
    }, (error) => {
      worker.active -= 1;
      if (cancelled(job)) job.reject(error);
      else handOn(job);
      pumpWorker();
    });
  }

  // ---- Every call through the reader proxy -----------------------------------

  window.fetch = function proxiedFetch(input, init) {
    const url = urlOf(input);
    const base = proxyBase();
    if (!url.startsWith(base)) return nativeFetch(input, init);
    const target = url.slice(base.length);
    const host = workerHost(target);
    return new Promise((resolve, reject) => {
      const job = { input, init, target, host, resolve, reject, attempts: 0 };
      if (host) {
        worker.queue.push(job);
        pumpWorker();
      } else {
        queue.push(job);
        pump();
      }
    });
  };

  window.AUTOGOOD_PROXY_QUEUE = {
    status,
    // Is this portal address read by our Worker now (fast, no 18 a minute)?
    viaWorker: (target) => Boolean(workerHost(target)),
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
})();
