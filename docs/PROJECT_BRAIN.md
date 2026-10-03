# PROJECT BRAIN — AUTOGOOD Tools

> Индекс мозга проекта: с него начинает каждый чат (Claude и Codex).
> Подробности живут в тематических файлах из «Карты знаний», здесь только короткие ссылки.
> Статусы: CONFIRMED (решил пользователь или проверено), HYPOTHESIS (предложение), OPEN (не решено).
> Ведётся скиллом `project-brain` (UPDATE после работы, PRUNE для чистки).

## 1. Зачем проект

Внутренние инструменты менеджера AUTOGOOD (импорт авто из Европы в Польшу): калькуляторы стоимости, договоры и документы (DOCX/PDF), проверка VIN, поиск и анализ рынка mobile.de / otomoto, обработка отчётов аукционов. Цель: быстрее и точнее готовить расчёты и документы для клиента.

## 2. Карта знаний

| Область | Страницы | Файл | О чём |
|---|---|---|---|
| Mobile.de / AutoScout24 / Otomoto / Blocket / av.by | `mobile.html` | [PROJECT-MOBILE.md](PROJECT-MOBILE.md) | Цель, механизмы, решения, бэклог, журнал. **Главный документ этой области.** |
| Фильтры поиска | `mobile.html` | [FILTERS-MOBILE-OTOMOTO.md](FILTERS-MOBILE-OTOMOTO.md) | Поле формы → параметр URL каждого портала |
| Импорт выборки рынка | `mobile.html` | [mobile-market-import.md](mobile-market-import.md) | Импорт CSV/JSON в анализ рынка |
| Цена «pod klucz» vs Польша | `mobile.html` | [turnkey-market-comparison.md](turnkey-market-comparison.md) | План сравнения |
| Проверка VIN | `partslink24.html` | [PARTSLINK24_VIN_CHECK.md](PARTSLINK24_VIN_CHECK.md) | Поля, марки, логика отчёта |
| Отчёты Auto1 | `auto1.html`, `auctions.html` | [auto1-pdf-learning/structured-editor.md](auto1-pdf-learning/structured-editor.md) | Как редактируется PDF отчёта |
| Выкладка | все | [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md) | Pages + конвертер на Render, smoke-тесты |
| Переезд на сервер | все | [AUTOGOOD_SERVER_DEPLOYMENT.md](AUTOGOOD_SERVER_DEPLOYMENT.md) | Требования к серверу, данные пользователей |
| Калькуляторы | `calculators.html` | OPEN: отдельного документа нет | Формулы живут в `src/main.jsx` |
| Договоры и документы | `umowy.html`, `pdf.html`, `umowa-sprzedazy.html`, `oswiadczenie-o-braku-tablic.html` | OPEN: отдельного документа нет | Распознавание данных и DOCX→PDF: `*.mdf`-выгрузки в `docs/` |

Если область без документа выросла (больше 3–4 правил), заведите для неё `docs/PROJECT-<ОБЛАСТЬ>.md` и добавьте строку сюда.

## 3. Как тестировать

- Фронтенд локально: `python3 -m http.server 4173 --bind 127.0.0.1` → `http://127.0.0.1:4173/`.
- Импортер mobile.de: `127.0.0.1:8788`, туннель через LaunchAgent. Рецепт перезапуска в [PROJECT-MOBILE.md](PROJECT-MOBILE.md) (раздел про туннель).
- Проверка VIN: бэкенд `4174`, работает из копии-зеркала вне репозитория. Правка `tools/partslink24/*` или `server/*` начинает действовать только после копирования в зеркало.
- Quick-туннели запускать **без** `--protocol http2`. URL меняется при каждом перезапуске, проверяй заново.
- Тестовая ссылка: `<страница>.html?api=https://<tunnel>.trycloudflare.com`.

## 4. Как выкатывать

- `main` → GitHub Pages: https://belovn1999-rgb.github.io/autogood-kalkulatory/
- `./scripts/publish.sh "сообщение"` (коммит, push, проверка). Подробно в [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md).
- Поднимать `?v=` у изменённых ассетов. `src/main.jsx` вручную зеркалится в `src/main.compiled.js` (сборщика нет).
- Конвертер DOCX→PDF деплоится **отдельно** на Render, проверка через `/api/health` → `revision`.
- Готово = изменение видно на живом URL, а не только запушено.

## 5. Ключевые правила (для всех областей)

- **Данные пользователя в браузере не теряются никогда** (избранное, история, сохранённые расчёты и договоры): правила в [PROJECT-MOBILE.md](PROJECT-MOBILE.md) §4.6.1, действуют для всех страниц.
- Правка «во всех калькуляторах/договорах» = все однотипные страницы, перечисли их перед работой.
- В репозиторий не попадают пароли, токены и ключи (репозиторий публичный).
- Правила конкретной области записываются в её файл из карты, а не сюда.

## 6. Принятые решения (общие)

| Дата | Решение | Статус |
|---|---|---|
| 2026-10-03 | Единый мозг проекта = этот индекс + тематические файлы из карты; подключён в `CLAUDE.md` и `AGENTS.md` | CONFIRMED |

## 7. Открытые вопросы

- OPEN: документ для калькуляторов (формулы, типы комиссии, VAT/акциз).
- OPEN: документ для договоров (шаблоны, распознавание, шифрование, история).

## 8. Журнал

<!-- Новые сверху. Подробный журнал mobile.html ведётся в PROJECT-MOBILE.md §7. -->
- 2026-10-03 — mobile.html, аудит данных анализа: средний пробег у каждого рынка, вывод «takie samo auto» (год + пробег) с минимумом предложений, разбивка «na gotowo», CEPiK и пригнанные для otomoto; акциз по объёму из объявления, любой гибрид = льготная ставка; otomoto «isGross:false» = брутто; пересчёт после живого курса (Claude).
- 2026-10-03 — mobile.html: AutoScout24 стал пятым порталом (стр. 1, анализ, Monitoring; только объявления, которых нет на mobile.de); фильтр «Kraj» = DE/NL/BE/AT/LU для mobile.de и AutoScout24 (Claude).
- 2026-10-03 — создан индекс мозга проекта, подключён к `CLAUDE.md` и `AGENTS.md` (Claude).
