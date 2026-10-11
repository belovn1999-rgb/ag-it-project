// One known search per portal (M9–M10, 2026-10-11): Toyota Corolla 2019–2021,
// listed on every portal we read. The addresses are what mobile.html itself
// builds for it (AUTOGOOD_*.buildSearchUrl / buildApiUrl), so the saved
// answers and the morning check read exactly what the page reads.
// mobile.de is not here: servers get 403 from it, only the importer on the
// owner's Mac reads it — its health is the Monitoring service's (runner).
export const WORKER = "https://ag-proxy.autogood-crm.workers.dev/";

export const SEARCHES = [
  { portal: "autoscout", url: "https://www.autoscout24.de/lst/toyota/corolla?atype=C&cy=D&damaged_listing=exclude&sort=price&desc=0&fregfrom=2019&fregto=2021" },
  { portal: "autoscoutfr", url: "https://www.autoscout24.de/lst/toyota/corolla?atype=C&cy=F&damaged_listing=exclude&sort=price&desc=0&fregfrom=2019&fregto=2021" },
  { portal: "otomoto", url: "https://www.otomoto.pl/osobowe/toyota?search%5Bfilter_enum_model%5D=corolla&search%5Bfilter_float_year%3Afrom%5D=2019&search%5Bfilter_float_year%3Ato%5D=2021&search%5Bfilter_enum_damaged%5D=0&search%5Border%5D=filter_float_price%3Aasc" },
  { portal: "kleinanzeigen", url: "https://www.kleinanzeigen.de/s-autos/toyota/anzeige:angebote/sortierung:preis/c216+autos.marke_s:toyota+autos.model_s:corolla+autos.schaden_s:nein+autos.ez_i:2019,2021" },
  { portal: "marktplaats", url: "https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91&l2CategoryIds=155&attributesById[]=10882&attributesById[]=1230&attributesById[]=13885&attributeRanges[]=constructionYear%3A2019%3A2021&sortBy=PRICE&sortOrder=INCREASING&limit=100&offset=0" },
  { portal: "dehands", url: "https://www.2dehands.be/lrp/api/search?l1CategoryId=91&l2CategoryIds=155&attributesById[]=10882&attributesById[]=1230&attributesById[]=13885&attributeRanges[]=constructionYear%3A2019%3A2021&sortBy=PRICE&sortOrder=INCREASING&limit=100&offset=0" },
  { portal: "paruvendu", url: "https://www.paruvendu.fr/auto-moto/listefo/default/default?tt=1&r=VO&r2=VVOTO000&md=VVOTOCOR&a0=2019&a1=2021&tri=prix&ord=asc" },
  { portal: "blocket", url: "https://www.blocket.se/mobility/search/api/search/SEARCH_ID_CAR_USED?variant=1.813.1389&year_from=2019&year_to=2021&sales_form=1&sales_form=2&sort=PRICE_ASC" },
  {
    portal: "avby",
    url: "https://api.av.by/offer-types/cars/filters/main/apply",
    body: { page: 1, properties: [{ name: "brands", value: [[{ name: "brand", value: 1181 }, { name: "model", value: 1196 }], [{ name: "brand", value: 1181 }, { name: "model", value: 11029 }]] }, { name: "year", value: { min: 2019, max: 2021 } }, { name: "condition", value: [5, 2] }], sorting: 2 },
  },
];

// The answer of a known search: through our Worker (it lets in a request
// without Origin — curl, this script — with no CORS), av.by straight from its
// open API with a browser's headers.
export async function fetchSearch(search, { timeoutMs = 45000 } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  if (search.body) {
    const response = await fetch(search.url, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        origin: "https://cars.av.by",
        referer: "https://cars.av.by/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
      },
      body: JSON.stringify(search.body),
    });
    return { status: response.status, text: await response.text() };
  }
  // As the page does: a refusal of the Worker's address (Kleinanzeigen
  // refuses some, 2026-10-11 every try from one place) goes on to r.jina.ai.
  const response = await fetch(`${WORKER}${search.url}`, { signal });
  const text = await response.text();
  if (response.status === 200 && !(text.length <= 200 * 1024 && BLOCK_PAGE.test(text))) return { status: 200, text, via: "worker" };
  const backup = await fetch(`${JINA}${search.url}`, { signal: AbortSignal.timeout(timeoutMs), headers: { "x-respond-with": "html" } });
  return { status: backup.status, text: await backup.text(), via: "r.jina.ai", worker: response.status };
}
export const JINA = "https://r.jina.ai/";
// The same block pages the page's proxy queue knows (src/market-proxy-queue.js).
const BLOCK_PAGE = /IP-Bereich\s+vor(?:ü|&uuml;|&#252;|ue)bergehend\s+gesperrt|captcha-delivery\.com|\/\.safeline\/|<title>\s*Just a moment\.\.\.\s*<\/title>|\bcf-chl-|errors\.edgesuite\.net|Confirm You Are Human/i;
