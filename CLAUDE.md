# AUTOGOOD Tools — instructions for Claude

Follow `AGENTS.md` (deploy workflow for this repo).

## Мозг проекта — читать первым

Перед любой задачей прочитай `docs/PROJECT_BRAIN.md` и нужный тематический файл из его карты знаний.
После изменения в том же коммите: обнови тематический файл, добавь строку в журнал, новые решения и правила запиши в мозг.
Если правило из мозга противоречит просьбе пользователя, спроси, не выбирай молча.

**Mobile.de / Otomoto (`mobile.html`)**: read `docs/PROJECT-MOBILE.md` before
working and update it after every change (change log, backlog, decisions) in
the same commit. It is shared with the Codex project "MOBILE.DE" and every
other chat — keep it current and exact. Start with §0 (current situation and
plan) and §2 (rules for parallel chats: foreign uncommitted changes → work in a
`git worktree`); the file is too big for one read, read it by sections.

**User data in the browser (favourites, search history) — never lose it.**
Incident 2026-09-27: favourites vanished because a stale tab wrote its old
in-memory copy over `localStorage`. Before touching anything that reads or
writes `autogood.mobile.*` keys, read `docs/PROJECT-MOBILE.md` section 4.6.1.
In short: every write re-reads storage first (`refreshMarketHistory()`);
never rename a key without migrating it; never `clear()`/`removeItem` those
keys; favourites are never dropped (also mirrored in
`autogood.mobile.marketFavorites.v1`); new filter fields must not make old
entries unreadable. The same applies to any other page that stores user data.

**Filters (mobile.de ↔ otomoto)**: every form field → URL parameter mapping,
rules and checks live in `docs/FILTERS-MOBILE-OTOMOTO.md`. Change a filter →
update that file in the same commit.
