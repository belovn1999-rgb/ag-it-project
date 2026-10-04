# Monitoring на сервере (B43) — база

> Решение владельца 04.10: автомониторинг без открытого браузера ждёт сервер,
> но **база готовится сейчас**, чтобы при запуске сервера оставалось только
> подключить. Общий план — `PROJECT-MOBILE.md` §0 (п. 2: B43 + B5 + B26),
> механизм Monitoring — §4.6.3, выкладка сервера — `AUTOGOOD_SERVER_DEPLOYMENT.md`.

## 1. Как это будет работать

1. Менеджер включает рубильник «Monitoring włączony» у авто (как сейчас).
2. Браузер менеджера отдаёт **задания** (`jobs`) серверу.
3. Сервер каждый день в 9:00 запускает задания **по одному** в своём Chrome:
   открывает нашу же страницу `mobile.html?runner=1` и просит её прочитать
   порталы — тот же код, что у кнопки «Uruchom monitoring» (очередь прокси,
   повтор молчащих порталов, AutoScout24 целиком, «Dodatkowe»).
4. **Записи** мониторинга (как в IndexedDB браузера) хранятся на сервере.
5. Браузер менеджера при открытии забирает новые записи и добавляет их к своей
   истории — Monitoring показывает их, как будто проверка шла у него.

Почему страница, а не отдельный серверный код: парсеры порталов, очередь
прокси, дедупликация AutoScout24 ↔ mobile.de и «Dodatkowe» живут в браузерном
коде; второй экземпляр на Node разошёлся бы с ним. И mobile.de отвечает только
настоящему Chrome (4.3.1) — он на сервере нужен в любом случае.

## 2. Что готово (04.10)

| Часть | Где | Что делает |
|---|---|---|
| Задания | `window.AUTOGOOD_MONITORING.jobs()` | авто с включённым мониторингом этого браузера: фильтры, порталы (как показывает стр. 3), страны, запас «Dodatkowe», свои цены порталов, время 9:00 |
| Запуск задания | `window.AUTOGOOD_MONITORING.run(job)` | читает порталы и возвращает запись, **ничего не сохраняя** в браузере; `progress()` — где сейчас |
| Режим запуска | `mobile.html?runner=1` | страница не запускает свои ежедневные проверки (у Chrome сервера своих избранных нет) |
| Возврат записей | `window.AUTOGOOD_MONITORING.importRecords(records)` | добавляет записи в IndexedDB и строку с датой в историю цен авто; только добавляет (4.6.1): уже известная запись не трогается, запись другого поиска (фильтры авто с тех пор изменились) и неизвестного авто пропускается; ответ `{added, known, unknownCar, otherSearch, invalid}` |
| Сервер | `server/monitoring-runner.mjs` | Node 22+ без зависимостей: Chrome DevTools (`MOBILEDE_CDP_URL`, по умолчанию Chrome импортера `127.0.0.1:9333`), фоновая вкладка, задания по одному, запись `<out>/<id авто>/<время>.json` целиком или никак; `--daily` — каждый день в 9:00, после позднего старта догоняет сегодняшние; `--only <id>` |
| Общее чтение | `readMonitoringLists(job, provider, progress)` в `mobile-market-analysis.js` | одно и то же для кнопки, 9:00 в браузере и сервера |

Запуск (пример):

```
node server/monitoring-runner.mjs --jobs jobs.json --out data/monitoring --daily \
  --app "http://127.0.0.1:8790/mobile.html?runner=1&mobiledeApi=http%3A%2F%2F127.0.0.1%3A8788%2Fmobilede%2Fimport"
```

## 3. Форматы

**Задание** (`jobs()` → `{version: 1, exportedAt, jobs: [...]}`):

```json
{ "id": "1790754647634-334084be", "title": "Toyota C-HR",
  "filters": { "brand": "Toyota", "model": "C-HR", "yearFrom": "2022", "markets": ["otomoto", "mobile", "autoscout"], "...": "все поля стр. 1" },
  "markets": ["otomoto", "mobile", "autoscout"],
  "countries": ["DE", "NL", "BE", "AT", "LU"],
  "tolerance": 10,
  "prices": { "otomoto": { "from": null, "to": 120000 } },
  "every": "daily", "hour": 9 }
```

**Запись** (`run(job)`; то же, что запись IndexedDB `autogood-mobile-check-offers`,
плюс поля для истории цен):

```json
{ "key": "<id>|<at>", "historyId": "<id>", "at": "2026-10-04T11:25:00.000Z",
  "scope": "autoscout,mobile,otomoto|AT,BE,DE,LU,NL",
  "markets": { "otomoto": { "total": 282, "complete": true, "offers": [ { "key": "...", "url": "...", "price": 99900, "currency": "PLN", "...": "..." } ] } },
  "extra": { "tolerance": 10, "plans": [...], "skipped": [...], "markets": {...} },
  "point": { "otomoto": { "median": 104450, "...": "строка истории цен" } },
  "prices": "{\"otomoto\":{\"from\":null,\"to\":120000}}",
  "signature": "<searchSignature(filters)>", "by": "automation", "errors": {} }
```

## 4. Что осталось при запуске сервера

1. **Где Chrome и с какого адреса (B6).** mobile.de отказывает датацентрам и
   headless Chrome (4.3.1). Варианты: всегда включённый компьютер в офисе
   (Mac mini) с Chrome импортера и постоянным именованным Cloudflare tunnel;
   или VPS + настоящий Chrome с виртуальным экраном (Xvfb) + «домашний»
   (residential) прокси. Проверить mobile.de с выбранного места **до** переезда.
   Флаги Chrome: `--disable-background-timer-throttling
   --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`
   (иначе паузы скрытой вкладки растягиваются до минуты).
   **Решение владельца 10-04:** арендованный сервер + «домашний» прокси.
   Имеющийся сервер CRM — nazwa.pl **CloudHosting Biznes**
   (`server953637.nazwa.pl`, 85.128.184.182) — общий хостинг: SSH и Node.js
   есть, но Node.js до 1 ГБ памяти, задачи cron до 540 с, без root и своих
   программ — Chrome с виртуальным экраном там не поставить. Он подходит для
   хранилища заданий и записей и входа сотрудника (п. 2, PHP или Node.js).
   Для Chrome — отдельный небольшой VPS (2 vCPU, 4 ГБ, Ubuntu; у nazwa.pl или
   другого провайдера) + «домашний» прокси только для mobile.de. Оценка
   трафика прокси (проверить на тесте): страница выдачи mobile.de ~1 МБ,
   ~20–30 страниц на авто в день → ~1 ГБ на авто в месяц; при цене прокси
   3–8 $ за ГБ это ~3–8 $ на авто в месяц.
2. **Вход сотрудника и хранилище (B26).** Задания и записи — личные данные
   сотрудника: читать и писать только своё (`AUTOGOOD_SERVER_DEPLOYMENT.md`,
   раздел «User-owned history»). После выбора входа добавить в
   `server/autogood-api.mjs`: `PUT /monitoring/jobs` (браузер присылает
   `jobs()` при смене рубильника/фильтров/цен), `GET /monitoring/records?since=`
   (браузер при открытии забирает новые и зовёт `importRecords`). Раннер
   читает задания и пишет записи туда же, а не в файлы.
3. **Прокси (B11).** `r.jina.ai` пускает 20 запросов в минуту с адреса; все
   авто сервера идут по очереди и делят этот лимит (одно авто с «Dodatkowe» и
   полным AutoScout24 — 40–80 запросов, 3–5 минут). Для 10+ авто — свой прокси
   или ключ jina (ключ — только в настройках сервера, не в репозитории).
4. **Браузер:** при открытии стр. 3 — синхронизация (п. 2), подпись «ostatni
   monitoring: serwer, 9:02»; рубильник тогда означает «сервер проверяет
   ежедневно», а не «пока программа открыта».

## 6. Вариант Б — Mac владельца (работает с 04.10)

Решение владельца 04.10: пока нет сервера, мониторинг делает его Mac, **только
утром в 9:30**, для всех избранных с включённым мониторингом. Механизм —
`PROJECT-MOBILE.md` §4.6.3 п. 18. Что нужно один раз:

1. **Служба** — установлена: LaunchAgent `~/Library/LaunchAgents/com.autogood.monitoring.plist`,
   файлы в `~/Library/Application Support/AUTOGOOD/monitoring/`. Проверка:
   `curl http://127.0.0.1:8789/monitoring/health`. Перезапуск:
   `launchctl kickstart -k gui/$(id -u)/com.autogood.monitoring`. Обновить код
   службы: скопировать `server/monitoring-runner.mjs` в `…/monitoring/runner/` и
   перезапустить (страницу она всегда берёт с живого сайта).
2. **Браузер владельца** — один раз открыть
   `https://belovn1999-rgb.github.io/ag-it-project/mobile.html?localMonitoring=1#monitoring`
   и на вопрос Chrome о доступе к программам на этом устройстве нажать
   «Разрешить». Под рубильником появится «Codziennie o 9:30 sprawdza ten Mac…».
3. **Пробуждение в 9:25** — делает владелец (нужен пароль Mac):
   `sudo pmset repeat wakeorpoweron MTWRFSU 09:25:00`. Спящий Mac на зарядке
   просыпается; выключенный — проверяет при первом включении после 9:30.

## 5. Проверено 04.10 (локально)

- Задания из браузера (`jobs()`, 2 авто) → раннер с Chrome импортера (9333) и
  страницей `localhost:4210/mobile.html?runner=1` → запись в файле → обратно в
  браузер через `importRecords` → Monitoring показал её как последнюю проверку.
  Подробности и цифры — журнал `PROJECT-MOBILE.md` §7 (10-04, B43).
