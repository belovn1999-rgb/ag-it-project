/* AUTOGOOD market proxy (B11) — a Cloudflare Worker in place of r.jina.ai.
 *
 * The portals of mobile.html give no CORS headers, so the browser reads
 * them through this Worker. Two ways to ask, the first like r.jina.ai so the
 * page code keeps building `${proxy}${url}`:
 *   https://<worker>/https://www.otomoto.pl/osobowe/...
 *   https://<worker>/?url=<encoded target URL>
 * It answers the portal's raw body (HTML or JSON) with its status code and
 * CORS for the AUTOGOOD pages only. Only the hosts below are fetched; no
 * cookies, no secrets — the code is public (repository ag-it-project).
 * Deployed by pasting this file into the Worker editor of the dashboard
 * (Workers & Pages → ag-proxy → Edit code → Deploy). docs/PROJECT-MOBILE.md §4.9.
 */
const ALLOWED_ORIGINS = [
  "https://belovn1999-rgb.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
];
// A host is allowed when it is one of these or a subdomain of one.
const ALLOWED_HOSTS = [
  "otomoto.pl",
  "blocket.se",
  "autoscout24.de", "autoscout24.nl", "autoscout24.be", "autoscout24.at", "autoscout24.fr",
  "autoscout24.lu", "autoscout24.it", "autoscout24.com",
  "marktplaats.nl",
  "2dehands.be", "2ememain.be",
  "kleinanzeigen.de",
  "av.by",
  "willhaben.at",
  "mobile.de",
  "ultimatespecs.com",
  "autocentrum.pl",
];
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "accept-language": "pl-PL,pl;q=0.9,en;q=0.8,de;q=0.7",
};
// Per-host Accept-Language: some portals answer in the visitor's language.
const LANGUAGE = {
  "autoscout24.de": "de-DE,de;q=0.9,en;q=0.8",
  "kleinanzeigen.de": "de-DE,de;q=0.9,en;q=0.8",
  "mobile.de": "de-DE,de;q=0.9,en;q=0.8",
  "marktplaats.nl": "nl-NL,nl;q=0.9,en;q=0.8",
  "2dehands.be": "nl-BE,nl;q=0.9,fr;q=0.8,en;q=0.7",
  "2ememain.be": "fr-BE,fr;q=0.9,nl;q=0.8,en;q=0.7",
  "willhaben.at": "de-AT,de;q=0.9,en;q=0.8",
  "blocket.se": "sv-SE,sv;q=0.9,en;q=0.8",
  "av.by": "ru-RU,ru;q=0.9,en;q=0.8",
  "autoscout24.fr": "fr-FR,fr;q=0.9,en;q=0.8",
};

const matchHost = (host, list) => list.find((allowed) => host === allowed || host.endsWith(`.${allowed}`));

function cors(origin) {
  const headers = new Headers({ vary: "Origin" });
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
    // The page sends r.jina.ai's header too; it is accepted and ignored.
    headers.set("access-control-allow-headers", "x-respond-with, accept, content-type");
    headers.set("access-control-expose-headers", "x-proxy-status, x-proxy-ms");
    headers.set("access-control-max-age", "86400");
  }
  return headers;
}

function reply(origin, status, text) {
  const headers = cors(origin);
  headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(text, { status, headers });
}

function targetOf(request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("url");
  if (query) return query;
  // Path form: everything after the first "/" — the query string included,
  // since it belongs to the target address. Taken as is (decoding it would
  // turn an encoded "&" inside a filter value into a new parameter), unless
  // the whole address was encoded; a "//" squeezed to "/" is put back.
  const raw = request.url.slice(url.origin.length + 1);
  if (!raw) return "";
  const target = /^https?%3A/i.test(raw) ? decodeURIComponent(raw) : raw;
  return target.replace(/^(https?:)\/(?!\/)/i, "$1//");
}

export default {
  async fetch(request) {
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "GET" && request.method !== "HEAD") return reply(origin, 405, "GET only");
    // Browsers always send Origin on cross-origin fetches; a request without
    // one (curl, a measuring script) is let through but gets no CORS.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply(origin, 403, "origin not allowed");

    let target;
    try {
      target = new URL(targetOf(request));
    } catch {
      return reply(origin, 400, "usage: /<https://target> or ?url=<target>");
    }
    if (target.protocol !== "https:") return reply(origin, 400, "https only");
    const host = target.hostname.toLowerCase();
    const allowed = matchHost(host, ALLOWED_HOSTS);
    if (!allowed) return reply(origin, 403, `host not allowed: ${host}`);

    const headers = new Headers(BROWSER_HEADERS);
    if (LANGUAGE[allowed]) headers.set("accept-language", LANGUAGE[allowed]);
    const started = Date.now();
    let upstream;
    try {
      upstream = await fetch(target.toString(), { method: request.method, headers, redirect: "follow", cf: { cacheTtl: 0 } });
    } catch (error) {
      return reply(origin, 502, `upstream error: ${error?.message || error}`);
    }
    const out = cors(origin);
    const type = upstream.headers.get("content-type");
    if (type) out.set("content-type", type);
    out.set("cache-control", "no-store");
    out.set("x-proxy-status", String(upstream.status));
    out.set("x-proxy-ms", String(Date.now() - started));
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
