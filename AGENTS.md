# Codex Instructions

This project is the live AUTOGOOD Tools site.

## Mobile.de / Otomoto project — READ FIRST

Work on `mobile.html` (search, link recognition, market analysis, turnkey
prices) follows **`docs/PROJECT-MOBILE.md`** — the single source of truth
shared by every Claude and Codex chat: goal, mechanisms, decisions, backlog,
change log and the working rules. Before any change to `mobile.html` or
`src/mobile*.js`, `src/mobile*.css`, `src/autogood-bookmarklet.js`,
`src/turnkey-estimate.js`: `git pull --rebase origin main`, read that file.
After the change: add a line to its change log, update the backlog status,
record new decisions, commit it together with the code.

**User data in the browser (favourites, search history) — never lose it.**
Incident 2026-09-27: favourites vanished because a stale tab wrote its old
in-memory copy over `localStorage`. Before touching anything that reads or
writes `autogood.mobile.*` keys, read `docs/PROJECT-MOBILE.md` section 4.6.1.
In short: every write re-reads storage first (`refreshMarketHistory()`);
never rename a key without migrating it; never `clear()`/`removeItem` those
keys; favourites are never dropped (also mirrored in
`autogood.mobile.marketFavorites.v1`); new filter fields must not make old
entries unreadable. The same applies to any other page that stores user data.

Search filters for both sites (form field → mobile.de / otomoto URL parameter,
model matching, what is not sent, audits) are documented in
**`docs/FILTERS-MOBILE-OTOMOTO.md`**. Any change to filter mapping updates it.

## Public App

Public URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/
```

Calculators URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/calculators.html
```

PDF URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/pdf.html
```

Process OS URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/process.html
```

Deal Desk URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/deal.html
```

Messages URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/messages.html
```

Documents URL:

```text
https://belovn1999-rgb.github.io/autogood-kalkulatory/documents.html
```

GitHub repository:

```text
https://github.com/belovn1999-rgb/autogood-kalkulatory
```

GitHub Pages is configured from the `main` branch, root folder (`/`).
Every pushed change to `main` becomes visible on the public URL after GitHub Pages refreshes.

## Required Workflow For Every Future Change

When the user asks to change the AUTOGOOD Tools site or calculators app:

1. Edit the local project files in this folder.
2. Verify the app locally at `http://127.0.0.1:4173/`.
3. Commit the change with a clear message.
4. Push to `origin main`.
5. Open the public GitHub Pages URL and verify the change is visible.
6. Tell the user the public URL and what changed.

Do not leave finished changes only on the local computer.
Finished app changes must be pushed to GitHub unless the user explicitly says not to publish.

## Local Run

Run from this folder:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/
```

## Publish Helper

After making and checking changes, use:

```bash
./scripts/publish.sh "Short commit message"
```

The helper commits, pushes, and checks the public URL.
