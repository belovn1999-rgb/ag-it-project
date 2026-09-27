# AUTOGOOD · Фильтры mobile.de ↔ otomoto.pl — единый справочник

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
| Liczba drzwi | `door=TWO_OR_THREE / FOUR_OR_FIVE / SIX_OR_SEVEN` ✅ | `filter_enum_door_count` 2+3 / 4+5 / **6** ≈ | у otomoto нет значения 7, группа 6/7 → только 6. — Codex 27.09 |

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
| 09-27 | Claude | Этот справочник: всё знание о фильтрах собрано в одном файле | этот коммит |
