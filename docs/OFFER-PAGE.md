# Oferta dla klienta (B71) — страница оффера из Monitoring

> Читать перед работой над `oferta.html`, `src/offer*.js`, `src/offer.css` и кнопкой
> «Przygotuj ofertę» на стр. 3 «Monitoring» (`mobile.html`). Обновлять в том же
> коммите, что и код: статус волн (§0), решения (§2), журнал (§7). Общие правила
> области — `docs/PROJECT-MOBILE.md` (§2 — параллельные чаты, §4.6.1 — данные
> пользователя не теряются никогда).

## 0. Где мы

| Волна | Что | Статус |
|---|---|---|
| 0 | Проверка данных на реальных объявлениях mobile.de и AutoScout24 (§3) | ✅ 10-05 |
| 1 | Каркас: `oferta.html` (2 листа A4), кнопка «Przygotuj ofertę» в Monitoring, снимок рынка на дату, правка и скрытие текстов и блоков, хранение офферов, PDF и картинка | ✅ 10-05 (проверено локально на живых объявлениях C-HR) |
| 2 | Чтение объявления: фото, все опции (сильные жирным), описание, продавец с рейтингом и стажем, число авто у дилера | ✅ 10-05 — mobile.de через импортер (нужен перезапуск службы, §5), AutoScout24 через прокси |
| 3 | Расчёт выбранным способом — все строки калькулятора, «Wstaw do oferty», сверка с `calculators.html` | ✅ 10-05 — окно калькулятора (`calculators.html?embed=1`, как «Oblicz na gotowo») на выбранном способе; «Wstaw do oferty» копирует строки, итог и курс как показаны (правки в калькуляторе тоже); до вставки — предварительный расчёт «Zakup bezpośredni» |
| 4 | «Мозги» по правилам: вердикт и красные флаги с цитатами, «Potencjał negocjacji» | ✅ 10-05 — сверено на 40 живых объявлениях C-HR (mobile.de): «ohne Papiere / Diebstahl» → 3 красных с цитатами; ложные срабатывания найдены и убраны («Diebstahlwarnanlage», «NESSUN VINCOLO DI FINANZIAMENTO», «Polizei» после кражи) |
| 5 | Дизайн (2 варианта владельцу), тексты Pan/Pani, контакты, процесс импорта, проверка на живом сайте | ⏳ |

## 1. Цель (владелец, 10-05)

Из найденного в Monitoring объявления кнопка «Przygotuj ofertę» открывает страницу,
где в красивую неперегруженную обёртку собирается всё, что клиенту нужно для решения:
он видит, что предложение **выгодное по рынку**, что он **не переплачивает** и
**за что платит**. Объём — 1 лист A4, максимум 2; с этой страницы делается PDF.

Блоки (слова владельца): фото авто первым; ссылка и основные параметры (форма как на
стр. 1, позже продающе); комплектация — сильные опции жирным, только подтверждённые
данные объявления; дилер, сколько на рынке, сколько авто продаёт; цена против медианы
рынка по тем же параметрам; вердикт и красные флаги; расчёт из калькулятора (способ
выбирает менеджер); средняя возможная скидка (идея); кратко о процессе импорта
(продумаем позже); контакты фирмы. Дизайн: неперегруженный, приятный; ненавязчивые
элементы, связанные с престижем, безопасностью, контролем рисков, экономией.

Макет, показанный владельцу 10-05: стр. 1 — решение (фото, название, цена «na gotowo»,
плашки «poniżej mediany» / «taniej niż w Polsce», ссылка + QR, 6 параметров, «Cena na
tle rynku», «Ocena AUTOGOOD», «Wyposażenie — najważniejsze», «Sprzedawca», строка
опекуна); стр. 2 — «Koszt na gotowo — z czego się składa», «Potencjał negocjacji»,
«Jak przebiega zakup», контакт, сноска о дате данных.

## 2. Решения владельца

| Дата | Решение |
|---|---|
| 10-05 | «Мозги»: **правила сейчас**, ИИ (Claude) — потом отдельной задачей. У каждого флага — причина или цитата из объявления; менеджер подтверждает перед PDF. Ключ ИИ — только на нашем сервере, никогда в репозитории |
| 10-05 | Расчёт для клиента: **все строки калькулятора** (цена авто с курсом, транспорт, осмотр, акциз, услуга AUTOGOOD отдельной строкой, ТО и переводы, VAT, итог). Способ (Zakup bezpośredni / Dealerzy VAT 23% / Dealerzy VAT marża) выбирает менеджер |
| 10-05 | Польша — **одной строкой**: «W Polsce takie auto: mediana N zł (otomoto, M ofert)» и зелёная плашка «ok. X zł taniej niż w Polsce», если в поиске есть otomoto; с пометкой о выборке |
| 10-05 | Контакты: **менеджер** (имя, телефон, e-mail — вводится один раз в браузере) **и фирма** (адрес, часы). Телефон фирмы в источниках расходится — берётся у владельца |
| 10-05 | Допущения, принятые без правок: польский язык, Pan/Pani, PLN (RU и Беларусь — позже); первая версия — mobile.de и AutoScout24, другие порталы следом; otomoto (покупка в Польше) — отдельный сценарий; любое поле правится или скрывается до PDF; оффер — снимок на дату (сам не пересчитывается); отметка «Oferta» у объявления в Monitoring |

## 3. Какие данные достаются (проверка 10-05)

Проверено на живых объявлениях Toyota C-HR (mobile.de: DE-дилер с НДС, DE-дилер
без НДС, IT-дилер, частник «ohne Papiere»; AutoScout24: DE-дилер).

| Блок оффера | mobile.de (страница объявления, импортер) | AutoScout24 (`__NEXT_DATA__` → `listingDetails`) |
|---|---|---|
| Фото | `images[].uri` + `?rule=mo-1600` (или `mo-1024`); главное — первое; JSON-LD `image` | `images[]` (1280×960 webp) |
| Фото в PDF | `img.classistatic.de` отдаёт `Access-Control-Allow-Origin: *` | `prod.pictures.autoscout24.net` — тоже `*` |
| Параметры | `attributes[]` `{tag, value}`: firstRegistration, mileage, cubicCapacity, power, fuel, transmission, category, color, manufacturerColorName, interior, doorCount, numSeats, emissionClass, countryVersion, **numberOfPreviousOwners**, **hu** («Neu» / дата), trimLine | `vehicle`: firstRegistrationDate, mileageInKm, rawDisplacementInCCM, rawPowerInKw/Hp, transmissionType, gears, **driveTrain**, bodyColor(+Original), paintType, upholstery, **noOfPreviousOwners**, **nextVehicleSafetyInspection**, originalMarket |
| Опции (подтверждённые) | `features[]` — 25–59 пунктов (то, что продавец отметил) | `vehicle.equipment` по группам (комфорт, мультимедиа, безопасность, extras) — ~70 |
| Описание | `htmlDescription` = ссылка `$NN` на строку RSC-потока (`NN:T<длина>,<html>`) | `description` (HTML) |
| Состояние | `damageCondition` («Gebrauchtfahrzeug, Unfallfrei»), `isDamageCase`, `readyToDrive`, `isNew` | `hadAccident`, `damageConditions`, `isRental`, `hasFullServiceHistory`, `lastTechnicalServiceDate`, `nonSmoking` |
| Гарантия | пункт «Garantie» в `features` | `warranty` («12 Monate»), `warrantyExists`, `seals` (напр. «Toyota Geprüfte Gebrauchtwagen») |
| Продавец | `contact`: type/enumType (DEALER, FSBO), name, адрес, языки, **withMobileSince** («Bei mobile.de seit 07.04.2008»), часы; `contact.rating`: totalCount (отзывы), score, recommendationRate, **adRealityRate**, оценки консультации/вежливости/ответа | `seller`: companyName, contactName, type, logo, телефоны; `ratings`: ratingsCount, ratingsAverage, recommendPercentage, по категориям; `seller.dealer.customerSince` (год) |
| Авто у дилера | страница дилера `home.mobile.de/…?customerId=` в Chrome импортера: «46 Pkw», марки (поиск по `customerId` в `search.html` НЕ фильтрует) | `seller.links.stockLink` → `numberOfResults` (38) |
| В продаже с | `created` / `renewed` (epoch, с) | `createdTimestampWithOffset` |
| Оценка цены порталом | `priceRating`: GOOD_PRICE…, 6 порогов `thresholdLabels`, `vehiclePriceOffset` | `prices.public`: category, **median**, `evaluationRanges` |
| НДС | `price.grs`, `price.nt`, `price.vat` (19), строка `vat` | `prices.public.taxDeductible`, `vatRate`, `netPrice` |
| История авто | `carfaxEligible` | `vehicleReport.carfax` — ссылка на бесплатный отчёт |
| Сигналы риска | `onCustomerBehalf` (продажа по поручению клиента), `partnerName` (объявление перенесено с kleinanzeigen / automobile.it), `aiSummary` (сводка mobile.de: «Keine Zulassung möglich», «Ersatzteilspender wegen Diebstahl») | `isRental`, `specialConditions`, `offerType` |

Ещё из выдачи mobile.de (без чтения объявления): фото, город, индекс, страна,
продавец, `priceRating`, `numImages`, `vatDeductible`.

Чего нет ни у кого: цены реальных продаж (скидка = только снижения цен объявлений),
VIN (почти всегда скрыт).

Готовые случаи для красных флагов (C-HR, 10-05): «ohne Papiere, nicht zulassungsfähig»
(частник, сводка mobile.de: украден, только на запчасти) — 11 999 € при медиане ~25 000 €;
«NEW Toyota C-HR 1.8 Hybrid» с пробегом 330 000 км у авто 2023 года; итальянские
дилеры с «NESSUN VINCOLO DI FINANZIAMENTO» по цене ниже рынка.

## 4. Правила для текстов клиенту

- У каждого утверждения виден источник: «z ogłoszenia» / «wg sprzedawcy» / «dane rynku na
  dzień …» / «sprawdzimy na oględzinach». «Bezwypadkowy» — заявление продавца.
- «Скидка» — это наблюдение за снижениями цен объявлений, не цены продаж; подпись
  «obserwacja cen ogłoszeń, nie gwarancja rabatu».
- Без непроверенных цифр о фирме (опыт, число клиентов, проценты) и без искусственной
  срочности (правила мозга сайта `autogood-site/brain/06-proof-claims-and-content.md`).
- Без обещаний сроков как гарантии (compliance AUTOGOOD «без обещаний SLA»).
- Обращение Pan/Pani; в польских текстах для клиента — дефис «-», не «–» (гайд AUTOGOOD,
  `Бизнес контекст.md`, «Коммуникация и стиль»).
- В расчёте всегда перечисляется, что включено: услуга, транспорт, акциз, документы,
  возможный VAT (гайд AUTOGOOD, «Калькуляции»).
- Дата данных — в документе; сохранённый оффер сам не пересчитывается.

## 5. Архитектура (сделано 10-05)

| Файл | Роль |
|---|---|
| `oferta.html` | страница оффера: два листа A4 (794 × 1123 px), панель менеджера справа, «Edytuj teksty», «Kopiuj obraz», «Pobierz PDF» |
| `src/offer.js` + `src/offer.css` | вёрстка листов, правка текстов на месте (`data-edit`, сохраняются в `edits`), скрытие блоков и строк (`hidden`; «W Polsce» при невыгодном сравнении скрыта по умолчанию — `shown` её открывает), автоподгонка под A4 (лишние зелёные строки вердикта и обычные опции полного списка уходят первыми), PDF (html-to-image → JPEG → pdf-lib, ссылка на объявление кликабельна), картинка листа 1 в буфер (иначе PNG-файл); `window.AUTOGOOD_OFFER_PAGE` — проверки без скачивания |
| `src/offer-link.js` + `src/offer-link.css` | на стр. 3: кнопка «Przygotuj ofertę» у объявлений mobile.de и AutoScout24 (`data-offer-create`); черновик собирается **до** открытия вкладки (иначе браузер без новых вкладок обрывает сборку): избранное (только чтение), записи мониторинга (только чтение) → `offer-market.js`, предварительный расчёт `turnkeyDirect` с тарифом места продавца (`estimateDeliveryInspection`) и классом акциза (`engineInfo`); кнопка у объявления с оффером — «Oferta · дата» (открыть), Shift — новый оффер |
| `src/offer-store.js` | IndexedDB `autogood-offers`, store `offers` (индексы `adKey`, `favoriteId`): запись только добавляется/дополняется в одной транзакции, не удаляется; опекун и фирма — `localStorage` `autogood.offer.manager.v1` / `autogood.offer.company.v1` (правила §4.6.1); `BroadcastChannel("autogood-offers")` |
| `src/offer-market.js` | чистые функции: рынок страны авто (EUR-порталы, без «подозрительных»; < 8 — все страны), P25/медиана/P75, «tańsze niż N %», похожие (год ±1, пробег ±35 %, мин. 20 000 км; затем ±2 / ±60 %), Польша (otomoto той же проверки, похожие или весь поиск) против «na gotowo», дни в продаже, снижения цены, темп рынка |
| `src/offer-ad.js` | чтение объявления в один вид, значения по-польски (топливо, коробка, кузов, цвет, салон, ТО): mobile.de — импортер `/mobilede/import` (поле `ad`) и `/mobilede/dealer`; AutoScout24 — `__NEXT_DATA__` через прокси и страница склада дилера |
| `src/offer-equipment.js` | опции по-польски (словарь DE→PL), сильные опции по ценности (панорама, кожа/полукожа, Matrix/LED, ACC, Head-Up, 360°/камера, навигация, автономный отопитель, вентиляция, подогревы…), «обещания» (гарантия, сервисная книжка) отдельно |
| `src/offer-verdict.js` | вердикт и флаги (§4 правила): цена против медианы похожих (< 60 % — риск обмана), продавец (частник, рейтинг, стаж, комиссия, «реальность объявлений» < 85 %), состояние (повреждён, не на ходу, аварийность не указана, прокат, владельцы, книжка, гарантия, ТО, пробег в год), слова-флаги в заголовке/описании/сводке mobile.de на DE/PL/IT/NL/FR/EN — **целые слова, отрицание перед словом отменяет флаг** («kein Unfallschaden», «Diebstahlwarnanlage» — не флаг); торг — эвристика (дни, снижения, место в рынке → 0–1 / 1–2 / 2–3 / 3–5 %) |
| `server/mobilede-import.mjs` | `/mobilede/import` отдаёт ещё `ad` (фото `mo-1024`, атрибуты, опции, описание из RSC-строки, продавец с рейтингом и «Bei mobile.de seit», даты, `priceRating`, флаги, сводка ИИ mobile.de); `/mobilede/dealer?customerId=` — число авто и звёзды со страницы дилера (Chrome импортера, кэш 12 ч) |
| расчёт (волна 3, в `src/offer.js`) | панель «Kalkulacja»: способ (Zakup bezpośredni / Dealerzy VAT 23% — только авто с НДС / Dealerzy VAT marża; по умолчанию как «Oblicz na gotowo»: с НДС — VAT 23 %, иначе прямая покупка) → окно с `calculators.html?embed=1&tab=&car=&engine=&transport=&inspection=&mobileUrl=` (нетто для VAT 23 %, брутто для остальных; тариф и класс акциза — из черновика) → «Wstaw do oferty» читает из окна (тот же адрес сайта) `.resultsList .resultLine` (`.resultLineLabel`, `.resultLinePrefix`, `.resultLineSub`, `.resultLineAmount`), `.totalBarValue`, `.totalBarRate` → `offer.calc` `{tab, method, methodLabel, rows, total, rate, at}`; «Wróć do szacunku» убирает. Проверено 10-05: C-HR с НДС — 7 строк, 116 150 zł при курсе 4,40, совпадает с калькулятором |
| `scripts/offer.test.mjs` | тест правил (в `pnpm test`, CI): рынок, Польша, снижения, сильные опции, флаги и отрицания, вердикт, торг, польские формы |

**Выкладка импортера.** Служба `com.autogood.mobilede-import` запускает файл из основной копии
(`/Users/nikitq/cloude/autogood-kalkulatory`): после push — `git pull --ff-only` там (если
не мешают чужие правки) и `launchctl kickstart -k gui/$(id -u)/com.autogood.mobilede-import`.
Старый импортер без `ad` даёт оффер без фото и без продавца (панель пишет «podstawowe»).

**Проверено 10-05 (локально, `127.0.0.1:4271`, импортер с новым кодом на `8790`):**
стр. 1 → «Rozpoznaj» C-HR → ★ → Monitoring (otomoto 4, mobile.de 24, AutoScout24 10) →
«Przygotuj ofertę»: mobile.de (Autohaus Koller: 4,3 ★, 104 opinie, с 2002, 69 авто; фото,
48 опций, «8 % poniżej mediany», вердикт «Rekomendujemy»), AutoScout24 (Autohaus Weiß:
4,8 ★, 42 opinie, с 2001, 38 авто, гарантия 12 мес., сервисная книжка); оба листа ровно
A4; PDF 2 стр. 1,1 МБ за 1,6 с, ссылка на объявление кликабельна. Найдено и исправлено:
ложный флаг «кража» на «Diebstahlwarnanlage».

## 6. Что нужно от владельца

- 2–3 реальных объявления, по которым сейчас готовится оффер (или авто из избранного).
- Блок «opiekun»: имя, телефон, e-mail; подтвердить телефон и адрес фирмы
  («Kolejowa 102, Łomianki, pn–pt 9:00–17:00» — из оффера в мозге сайта, телефоны расходятся).
- Позже: текст о процессе импорта; своя статистика выторгованных скидок, если есть.

## 7. Журнал (новые сверху)

| Дата | Изменение | Коммит |
|---|---|---|
| 10-05 | Волна 4: правила сверены на 40 живых объявлениях; «Polizei» — только «ex-Polizei / Polizeifahrzeug» | этот коммит |
| 10-05 | Волна 3: расчёт калькулятором — окно калькулятора на выбранном способе, «Wstaw do oferty», строки и итог в оффере | afe0e55 |
| 10-05 | Волны 1–2: страница оффера, кнопка в Monitoring, чтение объявлений mobile.de / AutoScout24, вердикт по правилам и торг, PDF; импортер — поле `ad` и `/mobilede/dealer`; тест `scripts/offer.test.mjs` | 7b466d8 |
| 10-05 | Старт (kickoff): цель, решения владельца, макет; волна 0 — проверка данных mobile.de и AutoScout24 (§3) | e255f76 |
