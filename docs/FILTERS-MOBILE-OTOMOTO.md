# AUTOGOOD · Фильтры mobile.de ↔ otomoto.pl ↔ blocket.se — единый справочник

> **Единственное место**, где описано, как один набор фильтров формы
> `mobile.html` превращается в правильный поиск на **mobile.de** и **otomoto.pl**.
> Собрано 2026-09-27 из кода (`src/mobile.js`), аудитов и всех чатов
> Claude Code и Codex, которые работали над фильтрами (сентябрь 2026).
> Меняешь перенос фильтра → обнови таблицу здесь и журнал в конце в том же коммите.
> Общий документ проекта: `docs/PROJECT-MOBILE.md` (там ссылка сюда).

---

## 1. Главные правила (выстраданные, не нарушать)

1. **mobile.de — только числовые ID марки/модели** (`ms=<make>;<model>;<group>;<text>`).
   SEO-маршрут `/auto/kia-sportage.html` перенаправляет и **сбрасывает все
   фильтры** (Kia Sportage с годами/дизелем/автоматом открывался как «6 635
   Kia Sportage» без фильтров). ID: `src/mobile-model-catalog.generated.js`
   (`tools/generate-mobile-de-ids.py`), 182 марки, 2664 модели, 69 групп. — Claude, `1aad552`.
2. **mobile.de молча игнорирует неверный параметр.** Ссылка открывается, но
   фильтра нет. Каждое значение сверяется с контрактом, встроенным в HTML
   страницы поиска (`"blt":{"type"`…), и с числом объявлений (`numResultsTotal`).
3. **Сортировка всегда по цене вверх:** mobile.de `sb=p&od=up`,
   otomoto `search[order]=filter_float_price:asc`.
4. **otomoto всегда открывается.** Фильтр без точного аналога **не отправляется**,
   а пользователь видит список «Otomoto nie ma dokładnego odpowiednika dla: …»
   (`otomotoSkippedFilterLabels`). Точные фильтры и сортировка сохраняются.
   Решение Codex/владелец (сентябрь) (альтернатива «не открывать otomoto вовсе» отклонена).
5. **Никаких «похожих» подмен, меняющих смысл.** Страна продавца mobile.de ≠
   `Kraj pochodzenia` otomoto (раньше Германия уходила как `filter_enum_country_origin=d`
   и резала выдачу) → страна в otomoto не отправляется. — Codex и Claude 21.09.
6. **Приблизительная модель допускается, но помечается** (`broad: true` → «Model»
   в списке неточных). Нет аналога → `[]` в алиасах = честное «нет аналога», а не выдумка.
7. **Цена в форме — EUR, otomoto — PLN.** Цена переводится по курсу (иначе
   «до 15 000 €» = «до 15 000 zł» и пустая выдача). — Claude, `a66a599`.
8. **Несколько значений одного фильтра = «или»** на обеих площадках
   (mobile.de: повтор параметра; otomoto: `search[id][0]`, `search[id][1]`…).
9. **Диапазоны:** `от > до` → ошибка `marketSearchInvalidRange`. Значения `< X`
   в «от» = «до X», `> X` в «до» = без верхней границы (`rangeBounds`). Цена `N+` =
   без верхней границы. — Claude, `aa6b0b5`.

## 2. Где код

| Что | Где (`src/mobile.js`) |
|---|---|
| URL mobile.de | `buildMobileDeSearchUrl`, `appendMobileDeRange`, `mobileDeModelSelection` |
| URL otomoto | `buildOtomotoSearchUrl`, `appendOtomotoRange`, `appendOtomotoValues`, `appendOtomotoPriceRange` |
| Словари значений | `mobileDe*Values`, `mobileDeOptionParams`, `otomoto*Values`, `otomotoFeatureFilters`, `otomotoParkingFilters` |
| Не передаётся / неточно | `mobileDeUnsupportedFeatures`, `mobileDeApproximateFeatures`, `otomotoUnsupportedFeatures`, `otomotoSkippedFilterLabels`, `mobileDeSkippedFilterLabels` |
| Марка/модель otomoto | `otomotoMakeAliases`, `otomotoMakeModels`, `otomotoModelAliases`, `otomotoModelSelection`, `matchedOtomotoModels`, `otomotoModelFallback` |
| Каталоги | `src/mobile-model-catalog.generated.js`, `src/otomoto-catalog.generated.js` (`scripts/generate-otomoto-catalog.mjs`) |

## 3. Проверки (запускать после любой правки фильтров)

```bash
npm run test:mobile-search          # модель/версия + аудит mobile.de офлайн
node scripts/audit-mobile-search.mjs  # + сверка с services.mobile.de/refdata
node scripts/audit-otomoto-search.mjs # все марки/модели и значения otomoto
```

`audit-otomoto-search.mjs` пока **не подключён** к `package.json` — запускать вручную.

Живая проверка (обязательна для нового/изменённого значения): открыть ссылку на
площадке и убедиться, что число объявлений изменилось. Эталон otomoto —
Kia Sportage (2848 без фильтров, 21.09): все 76 фильтров меняли выдачу. Нули для
«электро/седан/кабрио» у Sportage ожидаемы.

## 4. Матрица фильтров

Легенда: ✅ точно · ≈ приблизительно (пользователь предупреждается) · ✗ не отправляется.

### 4.1 Автомобиль

| Поле формы | mobile.de | otomoto.pl | Примечание |
|---|---|---|---|
| Марка | `ms` (числовой ID) ✅ | путь `/osobowe/<make>` ✅ | otomoto-алиасы: KGM→`ssangyong`, ORA→`gwm` (только `ora-03`,`ora-07`), Corvette→`chevrolet`+`corvette`, Asia Motors→`asia`, DS→`ds-automobiles`, Mercedes/VW коммерческие → основная марка. Нет в каталоге otomoto → ✗ «Marka» |
| Модель | `ms` ID модели или группы ✅ | `search[filter_enum_model]` ✅/≈ | см. §5 |
| Wersja (текст) | 4-й сегмент `ms` ✅ | ✗ | у otomoto нет свободного текста |
| Nadwozie | `c` ✅ | `filter_enum_body_type` ✅ | limousine→`Limousine`/`sedan`, estate→`EstateCar`/`combi`, suv→`OffRoad`/`suv`, hatchback→`SmallCar`/`compact`, coupe→`SportsCar`/`coupe`, cabrio→`Cabrio`/`cabrio`, van→`Van`/`minivan`. **pickup** → mobile.de `OffRoad`, otomoto ✗; **other** → `OtherCar`, otomoto ✗ |
| Liczba miejsc | `sc=от:до` ✅ | `filter_float_nr_seats:from/to` ✅ | |
| Liczba drzwi (от/до, 2–7) | `door=TWO_OR_THREE / FOUR_OR_FIVE / SIX_OR_SEVEN` — только если диапазон целиком внутри **одной** группы ✅, иначе ✗ с предупреждением (`mobileDeDoorGroup`) | `filter_enum_door_count` — каждое число диапазона ✅ (весь 2–6 = без фильтра); **7 нет** на otomoto → предупреждение, только «7» → ошибка `doorsUnavailableOtomoto` | Codex 27.09 (`b568389` группы → `ac17a28` диапазон); старые групповые записи истории открываются как диапазон |

### 4.2 Цена, пробег, год, двигатель

| Поле | mobile.de | otomoto.pl | Примечание |
|---|---|---|---|
| Cena (EUR) | `p=от:до` ✅ | `filter_float_price:from/to` в PLN ✅ | курс: `eurPlnRate()` = `data/exchange-rates.json`, запасной 4.3. ⚠ Это **не** живой курс Walutomat (тот — только в «под ключ»), а файл устарел (30.06), см. бэклог B12 |
| Przebieg | `ml` ✅ | `filter_float_mileage` ✅ | |
| Rok | `fr` ✅ | `filter_float_year` ✅ | |
| Pojemność | `cc` ✅ | `filter_float_engine_capacity` ✅ | «< 5000»/«> 5000» — правило 9 |
| Moc (KM) | `pw` в **kW** (KM×0.735499) ✅ | `filter_float_engine_power` в KM ✅ | |
| Paliwo | `ft` ✅ | `filter_enum_fuel_type` ✅/≈ | petrol `PETROL`/`petrol`, diesel `DIESEL`/`diesel`, electric `ELECTRICITY`/`electric`; hybrid diesel `HYBRID_DIESEL` / hybrid petrol `HYBRID` → otomoto оба `hybrid` ≈ |
| Plug-in | **`fe=HYBRID_PLUGIN`** (не `ft`! `ft=HYBRID_PLUGIN` игнорируется) ✅ | `plugin-hybrid` ✅ | исправлено Claude `1aad552` |
| Napęd | `dt` ✅ | `filter_enum_transmission` ✅ | awd→`ALL_WHEEL` / `all-wheel-auto,-lock,-permanent`; fwd `FRONT`/`front-wheel`; rwd `REAR`/`rear-wheel` |
| Skrzynia | `tr` ✅ | `filter_enum_gearbox` ✅ | `AUTOMATIC_GEAR`/`automatic`, `MANUAL_GEAR`/`manual` |

### 4.3 Условия покупки и состояние

| Поле | mobile.de | otomoto.pl | Примечание |
|---|---|---|---|
| VAT odliczany | `vat=1` ✅ | `filter_enum_vat=1` (Faktura VAT) ✅ | |
| VAT marża | `vat=0` ✅ | `filter_enum_vat_discount=1` ✅ | |
| Sprzedawca | `st`: dealer `DEALER`, private `FSBO`, company `COMM_FSBO` ✅ | `private_business`: `private` / `business` ≈ | dealer и firma у otomoto одно `business` |
| Kraj | `cn` (можно несколько) ✅ | ✗ | правило 5 |
| Uszkodzone | `dam=false` (по умолчанию скрыть) ✅ | `filter_enum_damaged=0` ✅ | |
| Na chodzie | `rtd=true` ✅ | ✗ | |
| Niepalący | `fe=NONSMOKER_VEHICLE` ✅ | ✗ | |

### 4.4 Комфорт

| Поле | mobile.de | otomoto.pl |
|---|---|---|
| Tapicerka | `it`: `ALCANTARA`, `FABRIC`, `PARTIAL_LEATHER`, `LEATHER` ✅ | `filter_enum_upholstery_type`: `alcantara-upholstery`, `textile-upholstery`, `upholstery-with-leather-inserts`, `leather-upholstery` ✅ |
| Klimatyzacja | `clim`: `MANUAL_/AUTOMATIC_CLIMATISATION(_2/_3/_4_ZONES)` ✅ | `filter_enum_air_conditioning_type`: `air-conditioning`, `automatic-/dualzone-/trizone-/4-or-more-zone-…climate-control` ✅ |
| Hak | `tct`: `TRAILER_COUPLING_FIX / _DETACHABLE / _SWIVELING` ✅ | `filter_enum_towbar=1` ≈ (только «есть») |
| Tempomat | `spc=CRUISE_CONTROL / ADAPTIVE_CRUISE_CONTROL` ✅ | `filter_enum_cruisecontrol_type`: `cruise-control`; адаптивный = `adaptive-cruise-control` + `adaptive-cruise-control-predictive` ✅ |
| Parkowanie | `pa=` значения; `FRONT_REAR_SENSORS` → `FRONT_SENSORS`+`REAR_SENSORS`; `REAR_TRAFFIC_ALERT` → `fe` ✅ | 360° `filter_enum_360_view_camera`, камера `rear_view_camera`, датчики `park_distance_control_front/rear`, `park_assistant`; Rear traffic alert ✗ |

### 4.5 Опции (`features`)

mobile.de: по умолчанию `fe=<VALUE>`, **кроме** (`mobileDeOptionParams`, Claude `1aad552`,
найдено ранее Codex тестом red→green):

| Опция | параметр mobile.de |
|---|---|
| LED / Xenon / Bi-xenon / Laser headlights | `hlt` |
| Adaptive bending lights | `blt` |
| LED running lights | `drl` |
| Rear traffic alert | `fe` |

mobile.de не передаёт: `HALOGEN_HEADLIGHTS`, `COMFORT_SEATS`; `ELECTRIC_FRONT_SEATS`
заменяется на `ELECTRIC_ADJUSTABLE_SEATS` (≈, `mobileDeApproximateFeatures`).

otomoto (`otomotoFeatureFilters`, значение `1`, если не указано иное):

| Опция | otomoto |
|---|---|
| Panorama | `filter_enum_sunroof=glass-sunroof-fixed` |
| Pneumatyczne zawieszenie | `filter_enum_air_suspension` |
| Sportowe zawieszenie | `filter_enum_sport_suspension` |
| LED / Xenon / Bi-xenon / Laser | `filter_enum_headlight_lamp_type` = `led-front-dim-light` / `xenon-light` / `bi-xenon-head-lamps` / `laser-head-lamps` |
| Adaptive bending lights | `filter_enum_dynamic_directional_lights` |
| Blind spot | `filter_enum_blind_spot_warning` |
| Keyless | `filter_enum_keyless_entry` |
| Podgrzewane fotele przód | `heated_seat_driver` + `heated_seat_passenger` |
| Podgrzewana szyba | `filter_enum_windscreen_heating` |
| Wentylowane fotele | `filter_enum_ventilated_front_seat` |
| Nawigacja / CarPlay / Android Auto / HUD | `navigation_system` / `apple_carplay` / `android_auto` / `head_up_display` |
| Elektryczne fotele | `driver_seat_electrically_adjustable` (только водитель ≈) |
| Pamięć foteli | `filter_enum_memory_seat` |
| Ładowarka indukcyjna | `filter_enum_wireless_device_charging` |

otomoto **не передаёт** (`otomotoUnsupportedFeatures`): рейлинги, LED ДХО,
спортпакет, подогрев руля и задних сидений, спортивные и массажные сиденья,
night vision, диски, распознавание знаков, ambient, цифровая панель, зимние/летние
шины, электробагажник, галоген, glare-free high beam, комфортные сиденья,
поясничная поддержка, sound system.

### 4.6 Цвета

| Поле | mobile.de | otomoto.pl |
|---|---|---|
| Kolor nadwozia | `ecol=<COLOR>` ✅ | `filter_enum_color` ✅ (beige→`brown-beige`, gold→`yellow-gold`, purple→`violet`, остальные одноимённо) |
| Kolor wnętrza | `icol` (`other`→`OTHER_INTERIOR_COLOR`) ✅ | ✗ |
| Matowy / Metallic | `fe=MATTE_COLOR` / `fe=METALLIC` ✅ | `filter_enum_colour_type` = `matt` / `metallic` ✅ |

## 5. Модели: как mobile.de-модель находит otomoto-модель

Порядок в `otomotoModelSelection` (первое сработавшее побеждает):

1. **BMW:** «3» → `seria-3`; «320», «3er», «M340», «ActiveHybrid 3» → `seria-3` ≈;
   «X3 M40» → `x3` ≈ (но «X3 M» — своя модель).
2. **Mercedes:** «C 200», «GLC 300» → `klasa-c`, `glc` ≈ (A/B/C/E/G/R/S/V → `klasa-x`, X → `x-klasa`).
3. **Ручные алиасы** `otomotoModelAliases[brand][model]` (`[]` = нет аналога).
4. Марки-модели `otomotoMakeModels` (Corvette, ORA).
5. **Точное совпадение** id/названия; затем **потомки** (Audi A4 → `a4-allroad`, `a4-avant`, `a4-cabrio`, `a4-limousine`).
6. **По словам** ≈: «Cooper SE» → `cooper`, «e-2008» → `2008`, «595 Competizione» → `595` (не `595c`).
7. **Приклеенный индекс** ≈: «EX35» → `ex`, «500C» → `500`, «eVito» → `vito`;
   цифры не продолжают число («H 100» ≠ `h-1`, «X55» ≠ `x5`).
8. **Семейства** (`otomotoModelFallback`) ≈: Porsche 9xx → `911`; Volvo 240–960 →
   `seria-200…900`; Renault R5 → `5`; Mercedes CE → `klasa-e`, 200–300 → `w123`/`w124`;
   VW T1–T2 → `transporter`, T3–T7 → transporter/multivan/caravelle/california.
9. Электро-двойник «ë-C4 X» → `c4x` ≈. Mini «Cooper SD» = «Cooper S»; трим-модели
   Mini (cooper, one, JCW) уступают моделям кузова (Countryman и т.д.).

Каждый результат проверяется по каталогу otomoto (`validatedOtomotoModel`): нет в
каталоге → «нет аналога». Итог 21.09: 2715 комбинаций собирают обе ссылки,
без аналога 123 модели (были 220), напр. Koenigsegg, McLaren P1, Lada Vesta, Polestar 4/5.

mobile.de: серия (BMW «3», Mercedes «C») = ID группы; BMW «8» = 840+850;
ручная модель вне каталога = поиск по тексту внутри марки (фильтры сохраняются).
MAN: ID марки 16500 (не 186).

## 5b. Blocket.se (Швеция) — третья площадка (с 2026-09-27)

Код: `src/blocket-search.js` (подключён после `mobile.js`), каталог
`src/blocket-catalog.generated.js` (`python3 scripts/generate-blocket-catalog.py`),
аудит `python3 scripts/audit-blocket-search.py` (Node не нужен).

**Как устроен Blocket.** Страница поиска `https://www.blocket.se/mobility/search/car?…`
и JSON-API `…/mobility/search/api/search/SEARCH_ID_CAR_USED?…` принимают **одни и те же
параметры**. API в ответе перечисляет применённые фильтры (`metadata.selected_filters`),
**неизвестный параметр или значение молча игнорирует** (как mobile.de). Поэтому
проверка = параметр есть в `selected_filters` и число объявлений изменилось.
API не отдаёт CORS-заголовок → из браузера читается через прокси `r.jina.ai`
(JSON приходит внутри `<pre>`). Страниц максимум 50 по 50 объявлений.

**Правила Blocket:**
- Марка/модель — числовые `variant`: марка `0.749`, серия `1.749.2132`, модель
  `2.749.2132.2001255`. Несколько `variant` = «или».
- **Пробег в шведских милях: 1 mil = 10 км.** «от» округляется вниз, «до» вверх.
- Цена в **SEK**: EUR × (EURPLN / SEKPLN), оба курса Walutomat (как в калькуляторе),
  запасной SEKPLN 0.385. Сверено с NBP (26.09: 11.28 SEK/EUR).
- Мощность: наши KM = шведские hk (`engine_effect_from/to`).
- Год: у Blocket «Modellår» (модельный год) — может отличаться от года
  регистрации на ±1.
- `sales_form=1&sales_form=2` (продажа б/у и новых) **всегда**: у лизинговых
  объявлений цена месячная и испортила бы статистику.
- Несколько опций `car_equipment` = «все сразу» (как у нас); топливо/цвет/кузов = «или».
- Сортировка `sort=PRICE_ASC`.

| Поле формы | blocket.se | Примечание |
|---|---|---|
| Марка / модель | `variant` ✅/≈ | см. «Модели» ниже; нет марки → ✗ «Marka», поиск текстом |
| Wersja | `q` (текстовый поиск) ✅ | не видно в `selected_filters`, но сужает выдачу |
| Nadwozie | `body_type` ✅ | limousine 3, estate 4, suv 9, hatchback 1+2, coupe 6, cabrio 7, van 5 (Familjebuss), **pickup 8**, other 11 |
| Cena | `price_from/to` SEK ✅ | |
| Przebieg | `mileage_from/to` в mil ✅ | км / 10 |
| Rok | `year_from/to` ✅ | модельный год |
| Moc | `engine_effect_from/to` ✅ | |
| Pojemność, Liczba miejsc, Liczba drzwi | ✗ | нет фильтров |
| Paliwo | `fuel` ✅ | petrol 1, diesel 2, electric 4, hybrid petrol 6, hybrid diesel 8, plug-in 1352+1356 |
| Napęd | `wheel_drive` ✅ | awd 2, fwd 3, rwd 1 |
| Skrzynia | `transmission` ✅ | automatic 2, manual 1 |
| VAT odliczany | `vat_deductible=true` ✅ | VAT marża ✗ |
| Sprzedawca | `dealer_segment` private 3 ✅, dealer/firma 2 ≈ | «Företag» = дилер и фирма |
| Kraj | ✗ | все объявления в Швеции |
| Tapicerka | только кожа: `car_equipment=12` ≈ | «кожа или частично кожа»; точно только если выбраны обе кожи |
| Klimatyzacja | `car_equipment=9` ≈ | «AC или климат», тип не различается |
| Hak | `car_equipment=23` ≈ | тип не различается |
| Tempomat | `car_equipment=11` ✅; адаптивный ≈ | |
| CarPlay | `car_equipment=1588` ✅ | |
| Panorama | `car_equipment=1` ≈ | «люк или стеклянная крыша» |
| Kamera cofania, czujniki tył | `car_equipment=67`, `49` ✅ | передние/360°/автопарковка ✗; «przód+tył» → только задние ≈ |
| Остальные опции (38 шт.) | ✗ | у Blocket 11 пунктов оснащения |
| Kolor nadwozia | `exterior_colour` ✅ | beige 1, blue 2, brown 4, green 5, grey 6, yellow 7, gold 8, white 9, purple 10, orange 11, red 13, black 14, silver 15 |
| Kolor wnętrza, matowy, metallic, niepalący, sprawny, uszkodzone | ✗ | нет фильтров; «Uszkodzone: nie pokazuj» по умолчанию → всегда в списке неточных |

Всё ✗ и ≈ перечисляется пользователю: «Blocket nie ma dokładnego odpowiednika dla: …»
(`blocketSkippedFilterLabels`).

**Модели** (`blocketModelSelection`), по порядку:
1. Семейство: то же имя, поколение/комплектация после него («Golf» → Golf I…VIII,
   «Cayenne» → Cayenne S/Turbo/GTS…), те же слова в другом порядке («Countryman S (Cooper)» =
   «Countryman Cooper S»), буква двигателя после полного номера («320» → 320d/320i,
   «C 200» → C200/C200 d). Исключаются модели, которые в нашей форме отдельные
   («Golf Plus», «X5 M», «Focus C-MAX» = наш «C-Max»). Mercedes «… AMG» = без AMG.
   Варианты через «/» («cee'd / Ceed») проверяются по отдельности. «+» не теряется (Prius+ ≠ Prius).
2. Серия целиком: «3» → 3-Serie, «C» → C-Klass, «T-Class» → T-Klass.
3. ≈ Семьи под другим именем: Porsche 991/992… → 911-Serie, Mercedes CE → E-Klass,
   ML → M-Klass, VW T4–T7 → Transporter/Caravelle/Multivan/California, Mini … Cabrio → Cabrio.
4. ≈ Кузов-серия Mini («One D Clubman» → «Clubman One»), иначе вся серия.
5. ≈ Более широкая модель по первым словам («220 Active Tourer» → 220d/220i, «X5 M50» → X5).
6. ≈ Нет на Blocket → текстовый поиск `q` внутри марки.

Итог 27.09 по 2715 моделям формы: 1595 точно, 320 ≈, 588 текстом (моделей сейчас
нет в продаже в Швеции), 212 — марок нет на Blocket.

Проверка 27.09: 126 вариантов формы (каждое значение каждого поля) собраны кодом
страницы и проверены по живому API — все отправленные параметры применены
Blocket, все неотправленные названы пользователю. Пример: Volvo XC60, от 2020,
до 100 000 км, дизель, автомат, CarPlay → 38 объявлений и на странице Blocket,
и в API.

## 6. Известные открытые вопросы

- Курс цены для otomoto — файл, а не живой курс (B12 в PROJECT-MOBILE.md).
- `audit-otomoto-search.mjs` не в `npm run verify`.
- Бэклог фильтров (B24): радиус/индекс mobile.de, bezwypadkowy, pierwszy właściciel,
  «dodane w ostatnich N dniach», Euro, цена в PLN, фильтры в hash-ссылке.
- Codex (сессия 26.09) предлагал расширить «Комфорт» (Matrix LED, пассажирское сиденье,
  поясничная поддержка отдельно и др.) — не решено.

## 7. Журнал изменений переноса фильтров

| Дата | Агент | Что | Коммит |
|---|---|---|---|
| 09-04 | Codex | Кнопка «Szukaj na otomoto.pl», первый маппинг всех 36 полей, каталог 186 марок, 90,6% моделей | 07040bc |
| 09-xx | Codex | Найдено: световые опции mobile.de уходили в `fe` и игнорировались (тест red→green, в `main` не попал — исправил Claude в 1aad552); решение: otomoto всегда открывается, неточные фильтры исключаются и перечисляются; страна ≠ Kraj pochodzenia | — |
| 08-20 | Codex | Аудит mobile.de (`audit:mobile-search`, 1 056 моделей), матрица полей подтверждена в браузере (72 объявления) | — |
| 09-21 | Claude | Числовые ID всех марок/моделей mobile.de, 5 параметров опций в правильные ключи, Plug-in → `fe` | 1aad552 |
| 09-21 | Claude | otomoto: алиасы марок, исправлены ложные модели, семейства моделей, каталог обновлён; 94 значения сверены с контрактом | cc337f2 |
| 09-21 | Claude | Проверка 129 вариантов формы через UI; ошибка «< 5000 / > 5000» | aa6b0b5 |
| 09-23 | Claude | Цена otomoto EUR→PLN | a66a599 |
| 09-26 | Codex | Фильтры комфорта из распознанного оснащения | 467f6ce, cf726c9 |
| 09-27 | Codex | Liczba drzwi: группы mobile.de, otomoto 2/3, 4/5, 6 | b568389 |
| 09-27 | Codex | Liczba drzwi — диапазон от/до 2–7: otomoto точные числа, mobile.de одна группа или предупреждение | ac17a28 |
| 09-27 | Claude | Этот справочник: всё знание о фильтрах собрано в одном файле | этот коммит |
| 09-27 | Claude | blocket.se: третья площадка — каталог, перенос всех фильтров, предупреждения, живой счётчик, логотипы, аудит | этот коммит |
