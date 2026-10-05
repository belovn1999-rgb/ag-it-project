# AUTOGOOD Server Deployment

## User-owned history and saved data

When AUTOGOOD moves browser histories to the server, every history-bearing
page must store user-created records under the authenticated user's stable
account ID. A user's searches, favourites, calculations, generated documents,
and VIN results must remain private to that account and load on that user's
other devices after sign-in. They must never be keyed only by browser profile,
email text supplied by the client, or a shared global collection.

Keep records typed by feature/page (for example `mobile-search`, `calculator`,
`vin-check`, `document`, and `auto1`) so each page can present its own history;
the shared identity is the ownership boundary, not a merged cross-page feed.
Every read, create, update, and delete must enforce ownership on the server.
Unauthenticated requests must not be able to read or mutate user history.

Until authentication and a durable database are deployed, existing browser
storage remains the active source and must not be cleared or silently replaced.
Migration must be an explicit, recoverable import after sign-in: preserve the
original local copy, merge rather than overwrite, deduplicate without dropping
records, and report conflicts or failures. Existing page-specific limits and
favourite-retention guarantees remain in force unless the owner approves a
separate retention policy. The identity provider, account recovery, database,
retention period, and migration UX are still architecture decisions; this
document does not select them.

## Portal reading infrastructure (B73, plan 2026-10-05)

The target layout for reading car portals — a Cloudflare Worker proxy with
per-employee keys, one queue and cache per portal, a named tunnel to an
always-on Chrome node for mobile.de, Monitoring jobs and records in Cloudflare
D1 — with prices, owner decisions and stages lives in
`docs/PORTAL-INFRASTRUCTURE.md` (Russian). Same rules as here: user data keyed
by the server-verified account, secrets outside the repository.

This repo now contains one server entrypoint for the backend workflows used by the GitHub Pages tools:

- `GET /mobilede/import?url=...` - imports data from a mobile.de listing.
- `POST /api/partslink24/check-vin` - logs into PartsLink24 and generates VIN specification PDF files.
- `GET /api/partslink24/pdf/:fileName` - downloads generated PartsLink24 PDFs.
- `GET /health` - confirms the server process is running.

## Deploy as a container

Do **not** copy the working tree onto the server. `server/Dockerfile` builds the
deployable artifact, and the image is what gets promoted and rolled back.

```bash
# From the repo root. Tag by commit so a rollback has something to point at.
SHA=$(git rev-parse --short HEAD)
docker build -f server/Dockerfile -t autogood-api:$SHA .
```

The image carries only what the service serves: `server/`, `tools/`, `src/`,
`assets/`, `vendor/`, `data/`, `docs/auto1-pdf-learning/`, the page HTML and
`tokens.css`. `.dockerignore` keeps `.env` out of every layer — a credential
baked into a layer stays there even if a later layer deletes the file.

```bash
docker run -d --name autogood-api \
  --env-file /etc/autogood/partslink24.env \
  -v autogood-data:/data \
  -p 127.0.0.1:8790:8790 \
  autogood-api:$SHA
```

The `/data` volume is not optional. It holds the Chromium profile with the live
PartsLink24 session; rebuilding it on every deploy means a fresh login each
time, which is slower and considerably more conspicuous to PartsLink24 than a
stable session. It also holds generated PDFs.

Put Caddy, Nginx or a Cloudflare Tunnel in front for HTTPS. The container binds
`0.0.0.0` inside its own network namespace and is published to loopback only, so
nothing reaches it except through the proxy.

### Rollback

```bash
docker stop autogood-api && docker rm autogood-api
docker run -d --name autogood-api ... autogood-api:<previous-sha>
```

Keep the previous image on the host for as long as you would want to roll back
to it. Confirm with `curl .../version` that the revision is the one you meant.

## Secrets

Credentials live in one root-owned file **outside** the image and outside the
directory the service serves:

```bash
sudo install -m 600 -o root -g root /dev/null /etc/autogood/partslink24.env
sudo -e /etc/autogood/partslink24.env
```

```text
PARTSLINK24_COMPANY_ID=...
PARTSLINK24_USERNAME=...
PARTSLINK24_PASSWORD=...
PARTSLINK24_DEFAULT_LANGUAGE=RU
```

Rules that are not negotiable:

- Never place this file inside the repo or the image. Until 2026-09-02 the
  static handler served every file under the repo root, so a plain
  `GET /tools/partslink24/.env` returned the live password. The handler is now
  gated by an extension allowlist plus a rule that rejects any path segment
  starting with a dot — but keeping the secret outside the served tree is the
  part that does not depend on a code path staying correct.
- Rotate the password when moving to a server. The laptop copies should be
  treated as spent.
- Never pass credentials as `docker build` arguments or `ENV` lines.

## Browser

The image is built on `mcr.microsoft.com/playwright:v1.61.0-jammy`, which ships
Chromium and its system libraries already. Keep that tag in step with the
`playwright` version in `package.json`: if they drift, Playwright downloads a
second browser at run time inside a container that should not be writing to
disk.

Running outside a container instead, install the browser explicitly:

```bash
npx playwright install --with-deps chromium
```

## Health Checks

```bash
curl http://127.0.0.1:8790/health
curl http://127.0.0.1:8790/version
```

`/health` probes the capabilities rather than asserting them, so a deploy that
is missing credentials or a browser says which:

```json
{
  "ok": true,
  "service": "autogood-api",
  "revision": "976e741",
  "mobilede": true,
  "partslink24": true,
  "partslink24Detail": { "credentials": true, "browser": true }
}
```

`ok` reports liveness only — the process is answering. `partslink24` is the
readiness signal; if it is `false`, read `partslink24Detail` before touching
anything else. `revision` is the build that answered, and
`scripts/release-smoke.mjs` fails when it is missing or does not match
`EXPECTED_REVISION`.

PartsLink24 check:

```bash
curl -H 'content-type: application/json' \
  --data '{"brand":"BMW","vin":"WBA11EE0705V88373","language":"PL"}' \
  http://127.0.0.1:8790/api/partslink24/check-vin
```

mobile.de check:

```bash
curl 'http://127.0.0.1:8790/mobilede/import?url=https%3A%2F%2Fsuchen.mobile.de%2Ffahrzeuge%2Fdetails.html%3Fid%3D458107986'
```

## Monitoring Runner

`server/monitoring-runner.mjs` runs the daily Monitoring of `mobile.html`
without a manager's browser: it opens `mobile.html?runner=1` in a real Chrome
over DevTools (mobile.de refuses headless browsers and datacenter addresses),
runs the jobs one after another and writes one JSON record per check. Jobs
come from `window.AUTOGOOD_MONITORING.jobs()` in a manager's browser and the
records go back through `window.AUTOGOOD_MONITORING.importRecords()`. Moving
them through this server waits for the employee login (user-owned data, see
above). Details and the steps left: `docs/MONITORING-SERVER.md`.

## Frontend Connection

For testing from GitHub Pages, use:

```text
https://belovn1999-rgb.github.io/ag-it-project/partslink24.html?api=https://YOUR-BACKEND-DOMAIN
```

For mobile.de, update the API base in `src/main.jsx` and rebuild/copy the same value into `src/main.compiled.js`, or keep the current tunnel during local testing.

## Verified PartsLink24 Route Classes

- `general_vin_search` - example: BMW, one PDF.
- `brand_first_search` - example: Peugeot, select brand logo first, one PDF.
- `two_file_print` - examples: Hyundai and Ford, select brand logo first, two PDF files: `vehicle` and `equipment`.

Current `two_file_print` brands:

- Ford
- Hyundai
- Iveco
- Kia
- Nissan
