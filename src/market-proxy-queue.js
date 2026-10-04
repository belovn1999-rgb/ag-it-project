/* AUTOGOOD: one queue for every request through the free reader proxy
 * (r.jina.ai — otomoto, AutoScout24 and blocket are read through it).
 *
 * The proxy allows 20 requests a minute per address ("x-ratelimit-limit:
 * 20, 20;w=60", checked 2026-10-04) and answers 429 above that. The browser
 * cannot read how many are left (the header is not exposed to scripts), so
 * the queue counts by itself:
 * - at most 18 requests started in any 60 s, counted across the tabs of this
 *   browser ("autogood.proxyQueue.starts" in localStorage — a convenience,
 *   not user data; a broken or missing value only means "no recent starts");
 * - at most 3 requests at a time;
 * - a refusal (429, 503, or a network error, which is how a refusal without
 *   CORS headers looks to a script) pauses the whole queue — 20 s, then 40 s —
 *   and the same request is asked again, twice at most.
 * Every fetch() whose address starts with the proxy goes through here, so the
 * portal modules keep calling fetch() as before. Another proxy
 * (AUTOGOOD_MARKET_PROXY, B11) gets the same queue unless
 * AUTOGOOD_PROXY_PER_MINUTE says it allows more.
 */
(() => {
  if (window.AUTOGOOD_PROXY_QUEUE) return;
  const nativeFetch = window.fetch.bind(window);
  const STARTS_KEY = "autogood.proxyQueue.starts";
  const WINDOW_MS = 60 * 1000;
  const MAX_ACTIVE = 3;
  const RETRIES = 2;
  const PAUSE_MS = 20 * 1000;
  const proxyBase = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const perMinute = () => Number(window.AUTOGOOD_PROXY_PER_MINUTE) || 18;

  const queue = [];
  const listeners = new Set();
  let active = 0;
  let pausedUntil = 0;
  let timer = null;
  let localStarts = [];
  // For the record: how often the proxy still refused (other tabs, other
  // pages of the same address count too) and gave up after the retries.
  const stats = { sent: 0, refused: 0, failed: 0 };

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
    return { active, waiting: queue.length, resumeAt: resumeAt > Date.now() ? resumeAt : 0, paused: pausedUntil > Date.now(), ...stats };
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
    nativeFetch(job.input, job.init).then((response) => {
      active -= 1;
      if ((response.status === 429 || response.status === 503) && refused(job)) return pump();
      job.resolve(response);
      pump();
    }, (error) => {
      active -= 1;
      if (error?.name !== "AbortError" && refused(job)) return pump();
      job.reject(error);
      pump();
    });
  }

  function urlOf(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return String(input?.url || "");
  }

  window.fetch = function proxiedFetch(input, init) {
    const url = urlOf(input);
    if (!url.startsWith(proxyBase())) return nativeFetch(input, init);
    return new Promise((resolve, reject) => {
      queue.push({ input, init, resolve, reject, attempts: 0 });
      pump();
    });
  };

  window.AUTOGOOD_PROXY_QUEUE = {
    status,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
})();
