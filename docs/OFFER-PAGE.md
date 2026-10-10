# Oferta dla klienta (B71) — страница оффера из Monitoring

> Читать перед работой над `oferta.html`, `src/offer*.js`, `src/offer.css` и кнопкой
> «Przygotuj ofertę» на стр. 3 «Monitoring» (`mobile.html`). Обновлять в том же
> коммите, что и код: статус волн (§0), решения (§2), журнал (§7). Общие правила
> области — `docs/PROJECT-MOBILE.md` (§2 — параллельные чаты, §4.6.1 — данные
> пользователя не теряются никогда).
> Идеи из похожих проектов для оффера (O1–O12: слежение за авто после отправки,
> архив объявления, «Co wiemy z ogłoszenia», ИИ-этап) — `docs/REFERENCE-PROJECTS.md` §3.

## 0. Где мы

| Волна | Что | Статус |
|---|---|---|
| 0 | Проверка данных на реальных объявлениях mobile.de и AutoScout24 (§3) | ✅ 10-05 |
| 1 | Каркас: `oferta.html` (2 листа A4), кнопка «Przygotuj ofertę» в Monitoring, снимок рынка на дату, правка и скрытие текстов и блоков, хранение офферов, PDF и картинка | ✅ 10-05 (проверено локально на живых объявлениях C-HR) |
| 2 | Чтение объявления: фото, все опции (сильные жирным), описание, продавец с рейтингом и стажем, число авто у дилера | ✅ 10-05 — mobile.de через импортер (нужен перезапуск службы, §5), AutoScout24 через прокси; ✅ 10-06 — AutoScout24 FR, ParuVendu, Kleinanzeigen через прокси (§3а), французские опции и значения по-польски |
| 3 | Расчёт выбранным способом — все строки калькулятора, «Wstaw do oferty», сверка с `calculators.html` | ✅ 10-05 — окно калькулятора (`calculators.html?embed=1`, как «Oblicz na gotowo») на выбранном способе; «Wstaw do oferty» копирует строки, итог и курс как показаны (правки в калькуляторе тоже); до вставки — предварительный расчёт «Zakup bezpośredni» |
| 4 | «Мозги» по правилам: вердикт и красные флаги с цитатами, «Potencjał negocjacji» | ✅ 10-05 — сверено на 40 живых объявлениях C-HR (mobile.de): «ohne Papiere / Diebstahl» → 3 красных с цитатами; ложные срабатывания найдены и убраны («Diebstahlwarnanlage», «NESSUN VINCOLO DI FINANZIAMENTO», «Polizei» после кражи) |
| 5 | Дизайн, тексты Pan/Pani, контакты, процесс импорта, проверка на живом сайте | ✅ 10-05 выбран **Premium** (остальные четыре вида остаются в панели «Wygląd oferty»); контакты по умолчанию — «Nikodem z AUTOGOOD», +48 531 900 775, info@autogood.pl, autogood.pl; 🔄 10-06: Carvago (история цены и число активных похожих), **стр. 2 — процесс «od rozmowy do kluczyków» в трёх вариантах (Oś czasu / Droga / Etapy), ждёт выбора владельца** |
| 6 | **Программа 06 «Oferta»** (`oferty.html`): только оффер в красивой обёртке для заинтересованного клиента, без анализа рынка — способ 1 «Z ogłoszenia dealera» (ссылка с любого портала стр. 1 → данные → «Przygotuj ofertę PDF»), способ 2 «Z raportu aukcji» — в отдельном чате | ✅ 10-10: все порталы стр. 1 (mobile.de, AutoScout24 DE/FR, Kleinanzeigen, Marktplaats, 2dehands/2ememain, otomoto, Blocket, ParuVendu, av.by), портал по ссылке без выбора, **PL / RU — оффер на выбранном языке**; дизайн страницы — позже (владелец) |

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
| 10-05 | **Выбран вид «Premium»** (по умолчанию для новых офферов; остальные виды остаются в панели). Доработка по просьбе владельца: название авто — поверх фото, внизу слева, на мягком затемнении; плашка цены заходит на нижний край фото; параметры в 3 колонки слева от цены; «Kadrowanie zdjęcia» (приближение 15/30/45 %, сторона кадра) — убирает рамку дилера с ikonami/логотипом с первого фото |
| 10-05 | Контакты по умолчанию (не секрет, владелец): опекун «Nikodem z AUTOGOOD», +48 531 900 775, info@autogood.pl; фирма — тот же телефон, `autogood.pl`, ul. Kolejowa 102, 05-092 Łomianki, pon.-pt. 9:00-17:00, sob. po wcześniejszym umówieniu (`offer-store.js`, `MANAGER_DEFAULTS` / `COMPANY_DEFAULTS`; введённое в панели их заменяет) |
| 10-05 | Процесс в оффере — из текста оффера в Notion (`autogood_oferta_tekst_roboczy`, «Jak wygląda proces»): 6 шагов, сокращённых для одного авто, в форме Pan / Pani / Państwo; включая «70% wynegocjowanego rabatu zostaje dla Pana» (текст владельца) |
| 10-05 | Владелец просит несколько макетов разного стиля и расположения — сделаны как настоящие виды страницы (Jasny, Premium, Magazyn, Raport, Noc), выбор за владельцем |
| 10-05 | Контакты: **менеджер** (имя, телефон, e-mail — вводится один раз в браузере) **и фирма** (адрес, часы). Телефон фирмы в источниках расходится — берётся у владельца |
| 10-06 | Следующие порталы оффера (задача 10-06): **AutoScout24 FR, ParuVendu, Kleinanzeigen** — кнопка в Monitoring и чтение объявления (§3а) |
| 10-06 | Стр. 1 (владелец): флаг страны рядом с городом (у ссылки и у продавца), ссылка на объявление на размер крупнее, **10 сильных опций** вместо 8 (по убыванию ценности), вердикт «ok» — **«Rekomendujemy do dalszego sprawdzenia\*»**, сноска «\* Przed zakupem sprawdzimy lakier, diagnostykę, jazdę próbną, dokumenty i historię auta.»; плашки «poniżej mediany» / оценка портала — под плашкой цены справа (так лист влезает в A4) |
| 10-06 | **Carvago** (владелец): то же авто 1:1 на carvago.com/pl по марке, году и точному пробегу (затем номер объявления `mobile_de-…` / `autoscout24-…`), в блоке «Cena na tle rynku» — «Aktywnych podobnych ofert w Europie: N (rok, przebieg)» и линия цены «W sprzedaży od … · zmiany ceny: dd.mm −x %». Carvago — конкурент (продаёт авто с наценкой и VAT страны покупателя): **клиенту ни названия, ни цен Carvago** — только даты, проценты изменений и число; ссылку видит менеджер в панели («Carvago (dla opiekuna)»), блок скрывается как любой другой |
| 10-06 | **Стр. 2 = процесс дальнейших шагов** (владелец): от звонка до ключей, 8 шагов в 4 этапах — «Bez zobowiązań» (1 Rozmowa, 2 Rezerwacja auta), «Pierwsze zobowiązanie» (3 Umowa i zaliczka — Płatność 1, zaliczka zwrotna; 4 Oględziny — «Pana decyzja: kupujemy?»), «Zakup» (5 Negocjacje i umowa, 6 Płatność za auto — Płatność 2), «Dostawa i odbiór» (7 Transport i kontrola, 8 Dokumenty i odbiór — Płatność 3); цвет этапа — с какого момента у клиента обязательства и оплаты. Три расположения на выбор владельцу (панель «Strona 2: proces»): **Oś czasu** (шаги сверху вниз, расчёт, торг и контакт справа), **Droga** (4 + 4 карточки, под ними полоса «Pana decyzje i płatności»), **Etapy** (4 цветные колонки). Срок — «zwykle od 3 tygodni do 1,5 miesiąca … zależnie od kraju i ścieżki zakupu» (без обещания); полный список опций на стр. 2 — только если менеджер включит |
| 10-10 | **Оффер — отдельная, шестая программа «Oferta»** в навигации (`oferty.html`, 06): первый переключатель — «Z ogłoszenia dealera» (поле ссылки как на стр. 1 «Wyszukiwanie i analiza», вместо «Analiza rynku» — «Przygotuj ofertę PDF»); второй — отчёт аукциона (данные вытягиваются скриптами, разные формы отчётов; делается в другом чате). Дизайн страницы оффера пока не трогаем — доработаем потом |
| 10-10 | Программа «Oferta» (владелец): **без анализа рынка** — только офферы в красивой обёртке для заинтересованных клиентов. Ссылка с **любого** портала стр. 1 «Wyszukiwanie i analiza»; **портал определяется по ссылке, выбирать его не нужно** (список убран). **Переключатель PL / RU** как в «Wyszukiwanie i analiza»: язык страницы и язык оффера (оба листа, вердикт, опции, расчёт, процесс; русский — на «Вы») |
| 10-10 | **Стр. 1, волна 1** (владелец): на фото только название авто, ниже по кадру (без строки марка · модель · год и без строки параметров); шапка листов — только дата (без названия и номера оффера); подвал обоих листов — только «AUTOGOOD · import aut z Europy»; плашка цены — «Cena na gotowo w Polsce*», сумма и справа цена брутто из объявления, строка «можно купить нетто … / только VAT marża / частный продавец», сноска «*Transport, oględziny, akcyza, przegląd techniczny, usługa AUTOGOOD, inne koszty»; данные авто крупнее; 12 опций; «Cena na tle rynku» — дни в продаже и изменения цены списком со стрелками (↓ зелёный, ↑ красный, %), без графика и без строки «Ocena portalu mobile.de…»; продавец — цифрами по всей карточке; в «Ocena AUTOGOOD» дилер коротко («od wielu lat na rynku, dobre opinie, duży wybór aut») и сноска «*Przed zakupem przeprowadzimy diagnostykę i jazdę próbną, sprawdzimy dokumenty i historię auta» |
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

### 3а. AutoScout24 FR, ParuVendu, Kleinanzeigen (проверка 10-06)

Проверено на живых объявлениях: ParuVendu — дилер (VW Passat, JEAN LAIN, 212 авто) и
частники (Volvo V60); Kleinanzeigen — дилеры (Hyundai Tucson V&M Automobil, Audi SQ5,
Dodge Charger) и частник (Audi A4 Avant); AutoScout24 FR — дилер (VW Passat, Quimper).
Страницы — через общий прокси (`market-proxy-queue.js`: Worker или r.jina.ai).

| Блок | AutoScout24 FR | ParuVendu | Kleinanzeigen |
|---|---|---|---|
| Фото | как AutoScout24 (`prod.pictures.autoscout24.net`) | дилер: ld+json `image` на `file-render.webapp4you.eu` (CORS `*`); частник: фото `media.paruvendu.fr` **без CORS** (в PDF не рисуются) → берём галерею страницы `img.paruvendu.fr/media_ext/…w=1000` (CORS `*`), миниатюры `w=480` отбрасываем | ld+json `ImageObject` — там и фото чужих объявлений: берём только с заголовком этого (`representativeOfPage`); `img.kleinanzeigen.de` (CORS `*`, 960×720) |
| Параметры | как AutoScout24, значения по-французски («Boîte manuelle», «Gris», «Métallisé», «SUV/4x4/Pick-Up», «Autres») | ld+json `Vehicle` + список «Prix / Version / Carrosserie / Année (Mars 2024) / Kilométrage / Energie / Transmission / Nb de portes («4 portes avec hayon» = 5) / Puissance fiscale (CV) / Nombre de places / Couleur / Puissance réelle (ch)»; объём — только из текста дилера «Cylindrée : 1968»; привод — у частника («Traction avant») | `addetailslist`: Kilometerstand, Erstzulassung (месяц словом), Kraftstoffart, Leistung (PS), Getriebe, Fahrzeugtyp, Außenfarbe, Material Innenausstattung, Anzahl Türen («4/5»), HU bis, Schadstoffklasse, Fahrzeugzustand («Unbeschädigtes Fahrzeug» → bezwypadkowy wg sprzedawcy, как на стр. 1) |
| Опции | `vehicle.equipment` по-французски («Sellerie cuir», «Toit panoramique», «Caméra d'aide au stationnement») — словарь FR→PL в `offer-equipment.js` | частник: блок «Caractéristiques techniques modèle …» (то, что отметил продавец, у разных объявлений разное); дилер: списка нет (оснащение только в тексте — не берём, правило владельца) | `checktag` — немецкие галочки (как mobile.de) + свои: «Schiebedach/Panoramadach», «Xenon-/LED-Scheinwerfer», «Radio/Tuner» |
| Гарантия | `warranty` («12 mois» → «12 mies.») | «Garantie mécanique 12 mois» | нет |
| Продавец | как AutoScout24 (рейтинг, `customerSince`, склад) | дилер: имя и адрес из ld+json `AutoDealer`, «Professionnel», «N véhicules en stock»; частник: «Vendeur particulier», город (индекс), «membre depuis N jours/mois/ans» → месяц регистрации | «Gewerblicher / Privater Nutzer», имя, «Aktiv seit dd.mm.yyyy», «N Anzeigen online» (у дилера — число в оффере), значки («TOP Zufriedenheit»…, без оценки числом), «PLZ Город - Район» / «PLZ Земля - Город» |
| В продаже с | `createdTimestampWithOffset` | «Réf. annonce … Le 25/09/2026 à 05:16» | нет (дата на странице — последнее обновление) |
| НДС | `prices.public` | «TVA récupérable» в странице → 20 % | нет поля («MwSt. ausweisbar» только в тексте — не берём) |
| Чего нет | — | аварийность, владельцы, ТО, рейтинг продавца, оценка цены порталом | привод, объём, владельцы (обычно), рейтинг числом, оценка цены порталом |

Правила чтения (10-06): имя частника на лист не попадает (только «Osoba prywatna», имя — в
`seller.contactName`); общая галочка портала называется как есть («Szyberdach lub dach
panoramiczny», «Reflektory ksenonowe lub LED»), лучший вариант не выбирается; кузов «Berline»
ParuVendu не пишется (так помечены и хэтчбеки, и седаны, и универсалы — Passat Variant с
ld+json «Hatchback»); дата Kleinanzeigen под адресом — последнее обновление, не используется.

## 4. Правила для текстов клиенту

- У каждого утверждения виден источник: «z ogłoszenia» / «wg sprzedawcy» / «dane rynku na
  dzień …» / «sprawdzimy na oględzinach». «Bezwypadkowy» — заявление продавца.
- «Скидка» — это наблюдение за снижениями цен объявлений, не цены продаж; подпись
  «obserwacja cen ogłoszeń, nie gwarancja rabatu».
- Без непроверенных цифр о фирме (опыт, число клиентов, проценты) и без искусственной
  срочности (правила мозга сайта `autogood-site/brain/06-proof-claims-and-content.md`).
- Без обещаний сроков как гарантии (compliance AUTOGOOD «без обещаний SLA»).
- Обращение Pan/Pani; в польских текстах для клиента — дефис «-», не «–» (гайд AUTOGOOD,
  `Бизнес контекст.md`, «Коммуникация и стиль»). На листах это делается при отрисовке:
  «–» и «—» заменяются на «-» (`render()` в `src/offer.js`), в панели менеджера — как есть.
- В расчёте всегда перечисляется, что включено: услуга, транспорт, акциз, документы,
  возможный VAT (гайд AUTOGOOD, «Калькуляции»).
- Дата данных — в документе; сохранённый оффер сам не пересчитывается.

## 5. Архитектура (сделано 10-05)

| Файл | Роль |
|---|---|
| `oferta.html` | страница оффера: два листа A4 (794 × 1123 px), панель менеджера справа, «Edytuj teksty», «Kopiuj obraz», «Pobierz PDF» |
| `src/offer.js` + `src/offer.css` | вёрстка листов, правка текстов на месте (`data-edit`, сохраняются в `edits`), скрытие блоков и строк (`hidden`; «W Polsce» при невыгодном сравнении скрыта по умолчанию — `shown` её открывает), автоподгонка под A4 (лишние зелёные строки вердикта и обычные опции полного списка уходят первыми), PDF (html-to-image → JPEG → pdf-lib, ссылка на объявление кликабельна), картинка листа 1 в буфер (иначе PNG-файл); `window.AUTOGOOD_OFFER_PAGE` — проверки без скачивания |
| `src/offer-link.js` + `src/offer-link.css` | на стр. 3: кнопка «Przygotuj ofertę» у объявлений mobile.de, AutoScout24 (DE и FR), ParuVendu и Kleinanzeigen (`SOURCES`, `data-offer-create`); черновик собирается **до** открытия вкладки (иначе браузер без новых вкладок обрывает сборку): избранное (только чтение), записи мониторинга (только чтение) → `offer-market.js`, предварительный расчёт `turnkeyDirect` с тарифом места продавца (`estimateDeliveryInspection`) и классом акциза (`engineInfo`); кнопка у объявления с оффером — «Oferta · дата» (открыть), Shift — новый оффер |
| `src/offer-store.js` | IndexedDB `autogood-offers`, store `offers` (индексы `adKey`, `favoriteId`): запись только добавляется/дополняется в одной транзакции, не удаляется; опекун и фирма — `localStorage` `autogood.offer.manager.v1` / `autogood.offer.company.v1` (правила §4.6.1); `BroadcastChannel("autogood-offers")` |
| `src/offer-market.js` | чистые функции: рынок страны авто (EUR-порталы, без «подозрительных»; < 8 — все страны), P25/медиана/P75, «tańsze niż N %», похожие (год ±1, пробег ±35 %, мин. 20 000 км; затем ±2 / ±60 %), Польша (otomoto той же проверки, похожие или весь поиск) против «na gotowo», дни в продаже, снижения цены, темп рынка |
| `src/offer-ad.js` | чтение объявления в один вид, значения по-польски (топливо, коробка, кузов, цвет, салон, ТО; немецкие, английские и французские слова): mobile.de — импортер `/mobilede/import` (поле `ad`) и `/mobilede/dealer`; AutoScout24 и AutoScout24 FR — `__NEXT_DATA__` через прокси и страница склада дилера; ParuVendu и Kleinanzeigen — страница через прокси, разбор `parseParuvendu` / `parseKleinanzeigen` (чистые, в тесте); `SOURCES` — какие порталы читаются (`offer.js` берёт его) |
| `src/offer-equipment.js` | опции по-польски (словарь DE→PL, FR→PL с 10-06, галочки Kleinanzeigen), сильные опции по ценности (панорама, кожа/полукожа, Matrix/LED, ACC, Head-Up, 360°/камера, навигация, автономный отопитель, вентиляция, подогревы…), «обещания» (гарантия, сервисная книжка) отдельно |
| `src/offer-verdict.js` | вердикт и флаги (§4 правила): цена против медианы похожих (< 60 % — риск обмана), продавец (частник, рейтинг, стаж, комиссия, «реальность объявлений» < 85 %), состояние (повреждён, не на ходу, аварийность не указана, прокат, владельцы, книжка, гарантия, ТО, пробег в год), слова-флаги в заголовке/описании/сводке mobile.de на DE/PL/IT/NL/FR/EN — **целые слова, отрицание перед словом отменяет флаг** («kein Unfallschaden», «Diebstahlwarnanlage» — не флаг); торг — эвристика (дни, снижения, место в рынке → 0–1 / 1–2 / 2–3 / 3–5 %) |
| `src/offer-carvago.js` | то же авто на Carvago (`window.AUTOGOOD_OFFER_CARVAGO.find`): поиск `/pl/samochody/<марка>?registration-date-from=Y&…-to=Y&mileage-from=KM&mileage-to=KM` (`__NEXT_DATA__` → `searchResults.cars`), выбор по `external_id` (номер объявления mobile.de / uuid AutoScout24), иначе по модели, если она одна; страница авто `/pl/samochod/<id>/<slug>` → `priceHistoryData` (изменения ≥ 0,5 %); число похожих — поиск `/samochody/<марка>/<модель>?` с годами и пробегом похожих рынка (если модель Carvago не знает — `price_score.similar_cars_count`). Через `market-proxy-queue.js`: Worker carvago не пропускает → `r.jina.ai` (`x-respond-with: html`); 2–3 запроса на оффер, запускается после чтения объявления; результат — `offer.carvago` / `offer.carvagoError` |
| `src/offer-ru.js` | оффер на русском (10-10): польские значения чтения и опции → русские (`value`, `option`), страны и «в стране», русское множественное число, строки калькулятора (`calc`); тексты листов — в `offer.js` (`L(pl, ru)`), вердикта — в `offer-verdict.js` (`lang`) |
| `src/offer-start.js` + `oferty.html` + `src/offer-start.css` | программа 06 «Oferta» (§8): ссылка → портал по адресу → чтение → карточка авто → черновик `origin: "link"` → `oferta.html`; PL / RU |
| `server/mobilede-import.mjs` | `/mobilede/import` отдаёт ещё `ad` (фото `mo-1024`, атрибуты, опции, описание из RSC-строки, продавец с рейтингом и «Bei mobile.de seit», даты, `priceRating`, флаги, сводка ИИ mobile.de); `/mobilede/dealer?customerId=` — число авто и звёзды со страницы дилера (Chrome импортера, кэш 12 ч) |
| расчёт (волна 3, в `src/offer.js`) | панель «Kalkulacja»: способ (Zakup bezpośredni / Dealerzy VAT 23% — только авто с НДС / Dealerzy VAT marża; по умолчанию как «Oblicz na gotowo»: с НДС — VAT 23 %, иначе прямая покупка) → окно с `calculators.html?embed=1&tab=&car=&engine=&transport=&inspection=&mobileUrl=` (нетто для VAT 23 %, брутто для остальных; тариф и класс акциза — из черновика) → «Wstaw do oferty» читает из окна (тот же адрес сайта) `.resultsList .resultLine` (`.resultLineLabel`, `.resultLinePrefix`, `.resultLineSub`, `.resultLineAmount`), `.totalBarValue`, `.totalBarRate` → `offer.calc` `{tab, method, methodLabel, rows, total, rate, at}`; «Wróć do szacunku» убирает. Проверено 10-05: C-HR с НДС — 7 строк, 116 150 zł при курсе 4,40, совпадает с калькулятором |
| `vendor/html-to-image-exact.js` | копия html-to-image 1.11.11 **без уменьшения шрифта** (библиотека ставит `floor(size) - 0,1 px`: 11,5 → 10,9 px), иначе в PDF текст уже, чем на странице, а высоты от страницы — пустые строки под переносами. Только для оффера; `vendor/html-to-image.js` не тронут |
| `scripts/offer.test.mjs` | тест правил (в `pnpm test`, CI): рынок, Польша, снижения, сильные опции, флаги и отрицания, вердикт, торг, польские формы; разбор страниц ParuVendu (дилер, частник) и Kleinanzeigen (дилер, частник), французские значения и опции |

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
| 10-10 | Акциз в оффере: на `oferta.html` и `oferty.html` не было функции класса двигателя — любая машина считалась как 3,1 %; подключён общий `src/engine-class.js` (аудит порталов волна 1; A6 3.0 TDI → 18,6 %, Golf GTE → 0 %) | этот коммит |
| 10-10 | Стр. 1, волна 1 правок владельца (13 пунктов, §2): фото, шапка, подвал, плашка цены, параметры, 12 опций, дни в продаже и изменения цены в блоке рынка, продавец цифрами, короткая строка о дилере; повторная подгонка листа после загрузки шрифтов; без пустого ряда плашек в Premium | этот коммит |
| 10-10 | «Oferta»: все порталы стр. 1 — новые читатели Marktplaats/2dehands/2ememain, otomoto, Blocket, av.by (`offer-ad.js`, тесты 36/36), портал только по ссылке (выбор убран), **PL / RU: оффер на выбранном языке** (`offer-ru.js`, оба листа, вердикт, опции, расчёт с `lang=ru`, правки по языку, Inter для кириллицы); опции на ru/pl/nl/fr/sv и исправления ложных совпадений; красные флаги на ru/nl/sv; цена SEK/PLN; фото otomoto для PDF через `photoData` (Worker: `olxcdn.com` — нужна выкладка) | этот коммит |
| 10-10 | Программа 06 «Oferta» (`oferty.html`, `src/offer-start.js/.css`): ссылка → портал по адресу → «Rozpoznaj» (`offer-ad.js`) → карточка авто в колонках стр. 1 → «Przygotuj ofertę PDF» → `oferta.html` (origin `link`); марка и модель из названия по справочнику mobile.de; рабочий адрес импортера ищется сам; без Monitoring в «Cena na tle rynku» — шкала цен mobile.de (5 полос) или медиана AutoScout24 + Carvago; пункт 06 в навигации всех страниц и плитка на главной. Проверено: mobile.de (C-HR, 16 с, тариф транспорта импортера) и AutoScout24 (4 с), оба листа A4 | этот коммит |
| 10-06 | Стр. 1: флаги стран, ссылка крупнее, 10 опций, «Rekomendujemy do dalszego sprawdzenia\*» со сноской, плашки под ценой; Carvago — история цены и число активных похожих (`src/offer-carvago.js`, тест); стр. 2 — процесс от звонка до ключей, 8 шагов / 4 этапа / 3 платежа, три расположения на выбор; оба листа A4 во всех трёх | этот коммит |
| 10-06 | Оффер читает AutoScout24 FR, ParuVendu и Kleinanzeigen (фото, параметры, опции, описание, продавец, гарантия; §3а), кнопка в Monitoring для них; французские значения и опции по-польски; «Wyposażenie» после чтения без галочек — «Sprzedawca nie zaznaczył wyposażenia…» вместо «pojawi się»; проверено на 5 живых объявлениях (фото в PDF рисуются) | этот коммит |
| 10-05 | Premium по выбору владельца: название поверх фото, плашка цены на краю фото, кадрирование фото; PDF без пустых строк (копия html-to-image без уменьшения шрифта) | этот коммит |
| 10-05 | Пять видов листов (Magazyn, Raport, Noc — сетка областей поверх тех же блоков, `display: contents`), контакты по умолчанию, процесс из Notion, «-» вместо тире, логотип в тёмной шапке — знак AG и текст | этот коммит |
| 10-05 | Волна 5 (часть): вид «Premium» рядом с «Jasny» — фото во всю ширину (2,5 : 1), цена на тёмно-синей плашке, золотистые акценты, карточки без рамок; выбор в панели | этот коммит |
| 10-05 | Волна 4: правила сверены на 40 живых объявлениях; «Polizei» — только «ex-Polizei / Polizeifahrzeug» | 94c5cd7 |
| 10-05 | Волна 3: расчёт калькулятором — окно калькулятора на выбранном способе, «Wstaw do oferty», строки и итог в оффере | afe0e55 |
| 10-05 | Волны 1–2: страница оффера, кнопка в Monitoring, чтение объявлений mobile.de / AutoScout24, вердикт по правилам и торг, PDF; импортер — поле `ad` и `/mobilede/dealer`; тест `scripts/offer.test.mjs` | 7b466d8 |
| 10-05 | Старт (kickoff): цель, решения владельца, макет; волна 0 — проверка данных mobile.de и AutoScout24 (§3) | e255f76 |

## 8. Программа 06 «Oferta» (`oferty.html`, с 10-10)

Отдельная программа в навигации (06, «Оффер» / «Oferta»; страница самого оффера
`oferta.html` тоже подсвечивает 06). Задача — **только оффер в красивой обёртке** для
заинтересованного клиента, без анализа рынка (владелец 10-10).

| Способ | Что делает | Статус |
|---|---|---|
| «Z ogłoszenia dealera» | ссылка объявления → «Rozpoznaj» → карточка авто → «Przygotuj ofertę PDF» → `oferta.html` (проверка, правки, «Pobierz PDF») | ✅ 10-10, все порталы стр. 1 |
| «Z raportu aukcji» | отчёт аукциона → скрипты вытягивают данные (отчёты разной формы) → оффер | ⏳ в отдельном чате; кнопка видна, неактивна |

**Порталы** (`src/offer-ad.js`, `read(source, url)`, проверено 10-10 на живых объявлениях):

| Портал | Как читается | Особенности |
|---|---|---|
| mobile.de | импортер на Маке (`/mobilede/import`, `ad`, `/mobilede/dealer`) | тариф транспорта/осмотра импортера (`ad.tariff`); шкала цен mobile.de |
| AutoScout24 DE / FR | `__NEXT_DATA__` через прокси | медиана AutoScout24 |
| Kleinanzeigen, ParuVendu | страница через прокси | см. §3а |
| Marktplaats, 2dehands / 2ememain | `window.__CONFIG__.listing` через прокси | VAT на странице нет — поиск по номеру объявления с фильтром «BTW verrekenbaar» (13149), иначе строка «BTW/Marge» в описании (`vat.basis`); число авто дилера — поиск по `sellerIds`; месяц регистрации — «Datum registratie Nederland» (не для импортных); см³ — из описания дилера, если рядом с литрами |
| otomoto | `__NEXT_DATA__` `advert` через прокси | цена в **PLN**; VAT к вычету только «Możliwość odliczenia VAT»; `listedAt` = `originalCreatedAt`; дата 1-й регистрации и VIN зашифрованы (reCAPTCHA не обходим) — год или дата из описания; фото `;s=1200x0` |
| Blocket | серверная страница (платформа Vend): ld+json + `<dt>/<dd>` | цена в **SEK**, «exkl. moms» = VAT 25 % к вычету; пробег в mil × 10; литры → см³ (≈); `listedAt` нет; «5+ år på Blocket» → нижняя граница |
| av.by | `api.av.by/offers/<id>` напрямую | цена в EUR от av.by (+ `priceUsd`); фото (avcdn, AVIF) — только через наш Worker; расчёта «под ключ» нет (решение 10-02) |

- **Портал — по адресу ссылки** (`sourceOf` в `offer-start.js`), значок портала рядом с заголовком;
  под полем — список поддерживаемых порталов. Ручного выбора нет.
- **Валюта** объявления — `ad.currency` (EUR; SEK — Blocket; PLN — otomoto); `car.currency` в черновике.
  Оценка «Zakup bezpośredni» пересчитывает SEK/PLN в EUR по курсам калькулятора. **otomoto и av.by —
  без оценки**: плашка показывает «Cena w ogłoszeniu» и «Koszt na gotowo policzymy indywidualnie»
  (менеджер вставляет расчёт через «Kalkulacja»).
- **Опции** — `offer-equipment.js`: `MORE_NAMES` — названия на русском (av.by), польском (otomoto),
  нидерландском/французском (Marktplaats), шведском (Blocket) к тем же сильным опциям; словарь
  `DICTIONARY` — полные списки этих порталов по-польски. Исправлено попутно: «Kierownica skórzana»
  и «Kunstleder / PU-läder / ekoskóra» — не кожаный салон; «Kamera panoramiczna 360» — не панорамная
  крыша; «ACC klimatanläggning» (Швеция) — климат, а не ACC; «360 kr i årsskatt» — не камера 360°;
  передняя камера — не камера заднего вида.
- **Красные флаги** (`offer-verdict.js`) — добавлены слова на русском, нидерландском, шведском
  («после ДТП», «битый», «на запчасти», «без документов», «не на ходу», «такси», «niet rijdbaar»,
  «utan papper», «reservdelar»…); отрицание по-русски («не битый», «без ДТП») — `DENIAL_RU`
  (`\b` и `\w` в JS не видят кириллицу).
- **Фото otomoto:** их сервер то отдаёт фото чужому сайту, то нет («Invalid CORS request», 10-10).
  На экране фото показывается без CORS; для PDF `photoData()` читает байты напрямую, а при отказе —
  через наш Worker. В `server/cloudflare-proxy/worker.js` добавлен хост `olxcdn.com` — **нужна
  выкладка Worker** (без неё фото otomoto в PDF только когда их сервер отвечает).

**Язык PL / RU** (`offer-start.js` → `offer.lang`; `src/offer-ru.js`):
- Переключатель как в «Wyszukiwanie i analiza» (запоминается: `localStorage` `autogood.offer.lang.v1`),
  меняет язык страницы, навигации и **оффера**: оффер создаётся на выбранном языке; в панели
  `oferta.html` — «Język oferty» (PL / RU) для готового оффера.
- Тексты листов — в `offer.js` парами `L(pl, ru)`; значения чтения (топливо, коробка, цвет, салон…)
  и опции — через `offer-ru.js` (`value`, `option`); страны, русское множественное число; строки
  калькулятора — калькулятор открывается с `lang=ru` (у него свои русские подписи), польская вставка
  переводится словарём `calc`.
- Правки текстов хранятся **по языку** (`edits["ru:<поле>"]`): переключение языка их не теряет.
- Вердикт — `VERDICT.assess({…, lang: "ru"})`: те же строки (те же `id`, скрытие общее), русский текст.
- Обращение по-русски — «Вы» (без Pan / Pani); процесс «Что дальше: от разговора до ключей» — свой
  русский текст; название PDF с « RU».
- Шрифт: в Public Sans нет кириллицы — русские буквы рисует **Inter** (`--of-font`), в PDF
  встраиваются кириллические начертания (`pageFontCss`).

**Как работает способ 1** (`src/offer-start.js`):
- Чтение — тот же `offer-ad.js`, что у оффера из Monitoring.
- **Адрес импортера mobile.de ищет сама** (адрес quick-туннеля в код не пишется, PROJECT-MOBILE §4.3):
  `?mobiledeApi=` этой страницы (запоминается в `localStorage` `autogood.offer.importer.v1`) →
  запомненный → адреса последних офферов (константы `DEFAULT_MOBILEDE_API_URL` в `src/mobile.js` с 10.10 нет;
  mobile.html запоминает свой `?mobiledeApi=` в `autogood.mobilede.importer.v1`, PROJECT-MOBILE §4.3.1);
  берётся первый, который отвечает (JSON на запрос без ссылки).
- Марка и модель — от портала (`ad.make` / `ad.model`), иначе из названия по справочнику mobile.de
  (`mobile-model-catalog.generated.js`, самое длинное совпадение; «VW» → Volkswagen и т. п.).
- Черновик: `origin: "link"`, `lang`, `adKey` как в Monitoring (`mobile:<id>`, `autoscout:<uuid>`),
  `car` в форме записи Monitoring, `ad` уже прочитан (страница оффера не читает его второй раз),
  `market: null`.
- На `oferta.html` у такого оффера «← Oferta» ведёт обратно, в панели — «z linku ogłoszenia».
- Внизу страницы — «Ostatnie oferty» (12 последних из этого браузера, и из Monitoring тоже; язык).

**Рынок без Monitoring.** Блок «Cena na tle rynku» строится из того, что даёт сам портал:
mobile.de — шкала оценки цены (6 порогов → 5 полос «bardzo dobra … wysoka cena», точка авто,
«uczciwa cena» справа), AutoScout24 — медиана портала; плюс строки Carvago (активные похожие,
история цены). Если нет ничего — блока нет, «Ocena AUTOGOOD» занимает строку целиком (Premium).
Поиск рынка из этой программы не делается (владелец 10-10: здесь только оффер).

- 10-10 (чат «дизайн код»): объявления AutoScout24 «smyle» (`/smyle/details/<id>/`; `/angebote/<id>` ведёт туда) читаются из `properData.carDetails` — `autoscoutAdDetails` в `src/offer-ad.js`; дилер и место — из `ocsInfo`.
