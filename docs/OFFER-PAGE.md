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
| 1 | Каркас: `oferta.html` (A4), кнопка в Monitoring, снимок рынка на дату, правка и скрытие полей, хранение офферов, PDF и картинка | 🔄 |
| 2 | Чтение объявления: фото, все опции (сильные жирным), описание, продавец, число авто у дилера | ⏳ |
| 3 | Расчёт выбранным способом — все строки калькулятора, «Wstaw do oferty», сверка с `calculators.html` | ⏳ |
| 4 | «Мозги» по правилам: вердикт и красные флаги с цитатами, «Potencjał negocjacji» | ⏳ |
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

## 5. Архитектура (план волны 1)

- Отдельная страница `oferta.html` + `src/offer.js` + `src/offer.css` — не внутри
  `src/mobile-market-analysis.js` (меньше конфликтов с параллельными чатами).
- Кнопка «Przygotuj ofertę» в строке Monitoring открывает
  `oferta.html?h=<id избранного>&k=<ключ объявления>&mobiledeApi=<адрес импортера стр. 3>`.
- Страница сама **только читает** запись мониторинга (IndexedDB
  `autogood-mobile-check-offers`, `checks`) и избранное (`autogood.mobile.marketHistory.v2`),
  считает рынок (медиана, P25–P75, место авто, похожие по году и пробегу, медиана otomoto,
  дни в продаже, снижения цен), читает объявление (mobile.de — импортер, AutoScout24 —
  прокси) и хранит офферы в своей IndexedDB `autogood-offers` (store `offers`) по
  правилам §4.6.1: запись только добавляется/дополняется, ничего не удаляется.

## 6. Что нужно от владельца

- 2–3 реальных объявления, по которым сейчас готовится оффер (или авто из избранного).
- Блок «opiekun»: имя, телефон, e-mail; подтвердить телефон и адрес фирмы
  («Kolejowa 102, Łomianki, pn–pt 9:00–17:00» — из оффера в мозге сайта, телефоны расходятся).
- Позже: текст о процессе импорта; своя статистика выторгованных скидок, если есть.

## 7. Журнал (новые сверху)

| Дата | Изменение | Коммит |
|---|---|---|
| 10-05 | Старт (kickoff): цель, решения владельца, макет; волна 0 — проверка данных mobile.de и AutoScout24 (§3) | этот коммит |
