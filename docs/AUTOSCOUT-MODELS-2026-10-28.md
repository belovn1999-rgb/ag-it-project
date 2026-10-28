# AutoScout24: модели популярных марок, которые платформа не читает (проверка 28.10.2026)

Задача платформы 3а.29 (T6, DS) и разбор по просьбе владельца 28.10. Данные — страницы марок AutoScout24 (`/lst/<марка>`, их список моделей, групп и «(alle)»), адреса, которые строит `AutoScoutBuilder` платформы (`main` `65dada9`), и живые запросы (по одному на адрес, пауза 4–8 с) 28.10.

## Итог

- Марок: 36 популярных, моделей в форме платформы: 1790. Адрес марки верный у всех 36 (DS исправлен в 3а.29).
- Название модели не совпало со списком AutoScout24 у **209** моделей, из них 36 — «Other» (в форме почти не выбирают).
- Живая выборка из 48 таких моделей: **40 — ответ 404** («AutoScout24 не знает эту модель», в «Анализе» — «Błąd czytania»), 1 — смешанная выдача, наша проверка бракует (ë-C4), 2 — не та группа (VW T5, T7), 5 читаются (ID.3 / ID.4 / ID.7 / ID. Buzz, KONA Elektro).
- Оценка на все популярные марки: из 173 моделей с другим названием (без «Other») не читаются ≈ 90 % — **≈ 155 моделей, ≈ 9 % формы**. Из 43 сломанных в выборке рабочий адрес подтверждён живым запросом у 37; у Niro EV, ë-C4, cee'd Sportswagon — базовая модель (`niro`, `c4`, `ceed`) с фильтром топлива или кузова (адреса `e-niro`, `e-c4-electric`, `ceed-sw` дают смешанную выдачу или 404); T5 и T7 — только с годами подборки.
- Что видит менеджер: у таких подборок в «Анализе» и «Мониторинге» AutoScout24 всех стран (DE, NL, BE, AT, FR, LU) — «Błąd czytania», статистика без этого портала; машины не теряются с других порталов.

## Исправлено — задача платформы 3а.30 (28.10, `53886ea`)

- Таблица `platform/resources/data/portals/autoscout24.json` (`Catalog::autoScoutModel`): **151 модель** формы 36 марок → адрес AutoScout24,
  топливо или кузов из названия — фильтром, если в форме не выбраны; 91 — с пометкой «шире выбранного» (группа или базовая модель: BMW Gran Turismo
  → серия, M340i → `3er`, Mini Countryman C / S (Cooper) → Countryman, Caddy Maxi → `caddy`). Ключи — адрес марки AutoScout24 и `Units::plainSlug` модели.
- Каждый адрес таблицы проверен живым запросом 28.10 (127 адресов, 0 ответов 404, выдача той модели по правилу проверки сборщика).
- **VW T5 / T7**: у AutoScout24 группы «T5 (alle)», «T6 (alle)», «T7» отдают одну семью автобусов, модель решают годы. Было «T6 (alle)» для всех —
  с годами T5 выдача «2 из 20», с годами T7 — «6 из 20», проверка модели бракует (подборки T5 / T7 не читались). Теперь T5 → «T5 (alle)»
  (с годами T5 — 18 из 20), T7 → «T7» (15 из 20). Без годов T5 / T7 по-прежнему могут не пройти проверку.
- Исправлено попутно: Renault Grand Scenic (`grand-scenic` отдаёт Scenic вперемешку) → `scenic`; BMW ActiveHybrid 3 / 5 / X6 → серия + гибрид.
- Без адреса (у AutoScout24 таких моделей нет или он отдаёт «Sonstige»): 19 — BYD ETP 3, Fiat Siena, Honda Aerodeck, Kia Borrego, Kia Mini,
  Mazda Bongo / Millenia / Protege / RX-6, Mercedes 290, MG Montego, Nissan 240 SX, Opel Cavalier / Nova, Renault Alpine A110 / A310 / V6,
  Subaru Baja, Toyota FCV — читаются с ответом «AutoScout24 не знает эту модель», как раньше.
- Тест `AutoScoutLinkTest` «каждая модель формы популярных марок — адрес, который AutoScout24 знает» (образец
  `tests/Fixtures/autoscout24-models-2026-10-28.json`): новая модель справочника с незнакомым AutoScout24 адресом — тест падает.

## Почему ломается (виды)

1. **Электро / гибрид — отдельной моделью у mobile.de** (e-308, e-3008, Astra Electric, Combo Electric, Niro EV, ë-C4, ë-Berlingo, Scenic E-TECH, MG4 EV Urban, 2 Hybrid, Plug-in Hybrid Outlander): у AutoScout24 — базовая модель, вид топлива — фильтром.
2. **Кузов в названии модели** (320 / 520 Gran Turismo, Auris Touring Sports, cee'd Sportswagon, Grand Kangoo, Caddy Maxi, Partner / Bipper Tepee, Proace (Verso)): у AutoScout24 — базовая модель.
3. **Другие названия классов и моделей** (GL → `gl-klasse`, GLK → `glk-klasse`, CLC → `clc-klasse`, Q4 → `q4-e-tron`, RSQ3 → `rs-q3`, RSQ8 → `rs-q8`, Raptor → `ranger-raptor`, Bronco Sport → `bronco`, NP 300 → `np300`, Qashqai+2 → `qashqai+2`, S6 EV → `mgs6-ev`, IS 220 → `is-220d`, RX 450 → `rx-450h`, NX 450h → `nx-450h+`).
4. **Комплектации моделью** (Mini Countryman C / S / D / E / SE (Cooper), Aceman E / SE, BMW ActiveHybrid 3 / 5).
5. **VW T5 и T7** уходят в группу «T6 (alle)». У AutoScout24 есть «T5 (alle)» и «T7», но и они без годов выдают T5–T7 вперемешку — решают годы подборки.

## Живая проверка: наш адрес → рабочий адрес

| Марка | Модель формы | Наш адрес | Ответ | Рабочий адрес | Ответ | Что в выдаче |
|---|---|---|---|---|---|---|
| Volkswagen | ID.3 | `volkswagen/id-3` | 200 | — | — | ID.3 / ID.3 ×20 |
| Volkswagen | ID.4 | `volkswagen/id-4` | 200 | — | — | ID.4 / ID.4 ×20 |
| Volkswagen | ID.7 | `volkswagen/id-7` | 200 | — | — | ID.7 / ID.7 ×20 |
| Volkswagen | ID. Buzz | `volkswagen/id-buzz` | 200 | — | — | ID. Buzz / ID. Buzz ×20 |
| Volkswagen | Caddy Maxi | `volkswagen/caddy-maxi` | 404 | `volkswagen/caddy` | 200 (6321 шт.) | Caddy ×20 |
| Volkswagen | T5 | `volkswagen/t6-alle` | 200 | `volkswagen/t5-alle` | 200 (13481 шт.) — смешано | T6 Transporter ×10; T6 Multivan ×5; T5 Multivan ×1; T7 Multivan ×1 |
| Volkswagen | T7 | `volkswagen/t6-alle` | 200 | `volkswagen/t7` | 200 (9570 шт.) — смешано | T6 Multivan ×7; T5 Multivan ×4; T7 Multivan ×2; T4 Allstar ×1 |
| Audi | Q4 | `audi/q4` | 404 | `audi/q4-e-tron` | 200 (1972 шт.) | Q4 e-tron ×20 |
| Audi | RSQ3 | `audi/rsq3` | 404 | `audi/rs-q3` | 200 (164 шт.) | RS Q3 ×20 |
| Audi | RSQ8 | `audi/rsq8` | 404 | `audi/rs-q8` | 200 (554 шт.) | RS Q8 ×20 |
| BMW | 320 Gran Turismo | `bmw/320-gran-turismo` | 404 | `bmw/320` | 200 (4755 шт.) | 320 ×20 |
| BMW | ActiveHybrid 5 | `bmw/activehybrid-5` | 404 | `bmw/5er` | 200 (8436 шт.) | 520 ×10; 530 ×6; 523 ×3; 525 ×1 |
| Mercedes-Benz | GL | `mercedes-benz/gl` | 404 | `mercedes-benz/gl-klasse` | 200 (148 шт.) | GL 350 ×8; GL 420 ×5; GL 450 ×4; GL 500 ×2 |
| Mercedes-Benz | GLK | `mercedes-benz/glk` | 404 | `mercedes-benz/glk-klasse` | 200 (554 шт.) | GLK 220 ×9; GLK 350 ×6; GLK 250 ×2; GLK 200 ×2 |
| Mercedes-Benz | CLC 200 | `mercedes-benz/clc-200` | 404 | `mercedes-benz/clc-klasse` | 200 (73 шт.) | CLC ×20 |
| Mercedes-Benz | C 450 AMG | `mercedes-benz/c-450-amg` | 404 | `mercedes-benz/c-450` | 200 (0 шт.) |  |
| Hyundai | KONA Elektro | `hyundai/kona-elektro` | 200 | — | — | KONA / Kona ×20 |
| Kia | Niro EV | `kia/niro-ev` | 404 | `kia/e-niro` | 200 (482 шт.) — смешано | Niro ×20 |
| Kia | cee'd Sportswagon | `kia/cee-d-sportswagon` | 404 | `kia/ceed-sw` | 404 |  |
| Peugeot | e-308 | `peugeot/e-308` | 404 | `peugeot/308` | 200 (3041 шт.) | 308 ×20 |
| Peugeot | e-3008 | `peugeot/e-3008` | 404 | — | — |  |
| Peugeot | Partner Tepee | `peugeot/partner-tepee` | 404 | `peugeot/partner` | 200 (342 шт.) | Partner ×20 |
| Citroen | ë-C4 | `citroen/e-c4` | 200 (7 из 20 — «не эта модель») | `citroen/e-c4-electric` | 200 (90 шт.) — смешано | C4 ×13; E-C4 Electric ×6; E-C4 X ×1 |
| Citroen | ë-Berlingo | `citroen/e-berlingo` | 404 | `citroen/berlingo` | 200 (1430 шт.) | Berlingo ×20 |
| Citroen | DS4 Crossback | `citroen/ds4-crossback` | 404 | `citroen/ds4` | 200 (55 шт.) | DS4 ×20 |
| Opel | Astra Electric | `opel/astra-electric` | 404 | `opel/astra` | 200 (10815 шт.) | Astra ×20 |
| Opel | Combo Electric | `opel/combo-electric` | 404 | `opel/combo-e` | 200 (1610 шт.) | Combo Life ×12; Combo ×8 |
| Opel | Zafira Electric | `opel/zafira-electric` | 404 | `opel/zafira-life` | 200 (608 шт.) | Zafira Life ×20 |
| Mini | Countryman C (Cooper) | `mini/countryman-c-cooper` | 404 | `mini/countryman-c` | 200 (1274 шт.) | Cooper Countryman ×5; Cooper SE Countryman ×4; Countryman C ×4; One Countryman × |
| Mini | Countryman S (Cooper) | `mini/countryman-s-cooper` | 404 | `mini/countryman-serie-alle` | 200 (1274 шт.) | Cooper Countryman ×5; Cooper SE Countryman ×4; Countryman C ×4; One Countryman × |
| Mini | Aceman E | `mini/aceman-e` | 404 | `mini/aceman` | 200 (54 шт.) | Aceman ×20 |
| Renault | Scenic E-TECH | `renault/scenic-e-tech` | 404 | `renault/scenic` | 200 (1356 шт.) | Scenic ×17; Grand Scenic ×3 |
| Renault | Grand Kangoo | `renault/grand-kangoo` | 404 | `renault/kangoo` | 200 (1243 шт.) | Kangoo ×19; Kangoo E-TECH ×1 |
| Toyota | Proace (Verso) | `toyota/proace-verso` | 404 | `toyota/proace` | 200 (1258 шт.) | Proace ×20 |
| Toyota | Auris Touring Sports | `toyota/auris-touring-sports` | 404 | `toyota/auris` | 200 (351 шт.) | Auris ×20 |
| Ford | Bronco Sport | `ford/bronco-sport` | 404 | `ford/bronco` | 200 (176 шт.) | Bronco ×20 |
| Ford | Raptor | `ford/raptor` | 404 | `ford/ranger-raptor` | 200 (2950 шт.) | Ranger ×20 |
| Lexus | NX 450h | `lexus/nx-450h` | 404 | `lexus/nx-450h+` | 200 (482 шт.) | NX 450h+ ×11; NX 350h ×6; NX 300h ×3 |
| Lexus | RX 450 | `lexus/rx-450` | 404 | `lexus/rx-450h` | 200 (227 шт.) | RX 450h ×11; RX 500h ×5; RX 350h ×2; RX 400 ×1 |
| Lexus | IS 220 | `lexus/is-220` | 404 | `lexus/is-220d` | 200 (50 шт.) | IS 250 ×8; IS 300 ×4; IS 220d ×3; IS 350 ×2 |
| Nissan | Qashqai+2 | `nissan/qashqai-2` | 404 | `nissan/qashqai+2` | 200 (5227 шт.) | Qashqai ×20 |
| Nissan | NP 300 | `nissan/np-300` | 404 | `nissan/np300` | 200 (22 шт.) | NP300 ×20 |
| MG | MG4 EV Urban | `mg/mg4-ev-urban` | 404 | `mg/mg4` | 200 (286 шт.) | MG4 ×20 |
| MG | S6 EV | `mg/s6-ev` | 404 | `mg/mgs6-ev` | 200 (52 шт.) | MGS6 EV ×20 |
| BYD | SEAL 5 | `byd/seal-5` | 404 | `byd/seal` | 200 (198 шт.) | Seal ×20 |
| Mazda | 2 Hybrid | `mazda/2-hybrid` | 404 | `mazda/2` | 200 (1245 шт.) | 2 ×20 |
| Mitsubishi | Plug-in Hybrid Outlander | `mitsubishi/plug-in-hybrid-outlander` | 404 | `mitsubishi/outlander` | 200 (963 шт.) | Outlander ×20 |
| Subaru | WRX STI | `subaru/wrx-sti` | 404 | `subaru/wrx` | 200 (28 шт.) | WRX ×20 |

## Все модели с названием не как у AutoScout24 (по марке)

Список по сверке названий, без «Other». Часть может читаться (как ID.3 или KONA Elektro) — у этих точное правило адреса AutoScout24 неизвестно, проверяются живым запросом.

- **Volkswagen** (13 из 89): T3 other (`t3-other`), T4 other (`t4-other`), T5 other (`t5-other`), T6 other (`t6-other`), T7 other (`t7-other`), Caddy Maxi (`caddy-maxi`), ID. Polo (`id-polo`), ID.3 (`id-3`), ID.4 (`id-4`), ID.5 (`id-5`), ID.6 (`id-6`), ID.7 (`id-7`), ID. Buzz (`id-buzz`)
- **BMW** (36 из 170): 318 Gran Turismo (`318-gran-turismo`), 320 Gran Turismo (`320-gran-turismo`), 325 Gran Turismo (`325-gran-turismo`), 328 Gran Turismo (`328-gran-turismo`), 330 Gran Turismo (`330-gran-turismo`), 335 Gran Turismo (`335-gran-turismo`), 340 Gran Turismo (`340-gran-turismo`), ActiveHybrid 3 (`activehybrid-3`), 520 Gran Turismo (`520-gran-turismo`), 530 Gran Turismo (`530-gran-turismo`), 535 Gran Turismo (`535-gran-turismo`), 550 Gran Turismo (`550-gran-turismo`), ActiveHybrid 5 (`activehybrid-5`), 620 Gran Turismo (`620-gran-turismo`), 630 Gran Turismo (`630-gran-turismo`), 640 Gran Turismo (`640-gran-turismo`), ActiveHybrid 7 (`activehybrid-7`), M135 (`m135`), M140i (`m140i`), M235 (`m235`), M240i (`m240i`), M340d (`m340d`), M340i (`m340i`), M440 (`m440`), M760 (`m760`), ActiveHybrid X6 (`activehybrid-x6`), X3 M40 (`x3-m40`), X3 M50 (`x3-m50`), X4 M40 (`x4-m40`), X5 M50 (`x5-m50`), X5 M60 (`x5-m60`), X6 M50 (`x6-m50`), X6 M60 (`x6-m60`), X7 M50 (`x7-m50`), X7 M60 (`x7-m60`), Z4 M40 (`z4-m40`)
- **Mercedes-Benz** (27 из 369): C 450 AMG (`c-450-amg`), CE (`ce`), CE 320 (`ce-320`), CLC 160 (`clc-160`), CLC 180 (`clc-180`), CLC 200 (`clc-200`), CLC 220 (`clc-220`), CLC 230 (`clc-230`), CLC 250 (`clc-250`), CLC 350 (`clc-350`), E 50 (`e-50`), GL (`gl`), GLK (`glk`), GLS 63 (`gls-63`), AMG GT C (`amg-gt-c`), AMG GT R (`amg-gt-r`), AMG GT S (`amg-gt-s`), ML (`ml`), R (`r`), S 55 (`s-55`), SL (`sl`), X (`x`), 290 (`290`), T-Class (`t-class`), eCitan (`ecitan`), eSprinter (`esprinter`), eVito (`evito`)
- **Audi** (3 из 59): Q4 (`q4`), RSQ3 (`rsq3`), RSQ8 (`rsq8`)
- **Opel** (6 из 52): Astra Electric (`astra-electric`), Cavalier (`cavalier`), Combo Electric (`combo-electric`), Insignia CT (`insignia-ct`), Nova (`nova`), Zafira Electric (`zafira-electric`)
- **Ford** (2 из 65): Bronco Sport (`bronco-sport`), Raptor (`raptor`)
- **Toyota** (6 из 56): 4-Runner (`4-runner`), Auris Touring Sports (`auris-touring-sports`), FCV (`fcv`), FJ (`fj`), Proace (Verso) (`proace-verso`), Proace Verso Electric (`proace-verso-electric`)
- **Renault** (6 из 59): Alpine A310 (`alpine-a310`), Alpine V6 (`alpine-v6`), Grand Kangoo (`grand-kangoo`), Grand Kangoo E-TECH (`grand-kangoo-e-tech`), Grand Scenic E-Tech (`grand-scenic-e-tech`), Scenic E-TECH (`scenic-e-tech`)
- **Hyundai** (3 из 49): H-1 Starex (`h-1-starex`), H350 (`h350`), KONA Elektro (`kona-elektro`)
- **Kia** (4 из 47): Borrego (`borrego`), Mini (`mini`), Niro EV (`niro-ev`), cee'd Sportswagon (`cee-d-sportswagon`)
- **Peugeot** (8 из 57): Bipper Tepee (`bipper-tepee`), Expert Tepee (`expert-tepee`), Partner Tepee (`partner-tepee`), TePee (`tepee`), e-3008 (`e-3008`), e-308 (`e-308`), e-408 (`e-408`), e-5008 (`e-5008`)
- **Citroen** (6 из 53): 2 CV (`2-cv`), DS4 Crossback (`ds4-crossback`), ë-Berlingo (`e-berlingo`), ë-C3 Aircross (`e-c3-aircross`), ë-C4 (`e-c4`), ë-Spacetourer (`e-spacetourer`)
- **Fiat** (7 из 62): 500L Cross (`500l-cross`), 500L Living (`500l-living`), 500L Trekking (`500l-trekking`), 500L Urban (`500l-urban`), 500L Wagon (`500l-wagon`), 500S (`500s`), Siena (`siena`)
- **Mazda** (5 из 37): 2 Hybrid (`2-hybrid`), Bongo (`bongo`), Millenia (`millenia`), Protege (`protege`), RX-6 (`rx-6`)
- **Nissan** (3 из 62): 240 SX (`240-sx`), NP 300 (`np-300`), Qashqai+2 (`qashqai-2`)
- **Dacia** (1 из 11): Logan Pick-Up (`logan-pick-up`)
- **Mini** (9 из 56): Aceman E (`aceman-e`), Aceman SE (`aceman-se`), John Cooper Works Aceman (`john-cooper-works-aceman`), Countryman D (Cooper) (`countryman-d-cooper`), Countryman S (Cooper) (`countryman-s-cooper`), Countryman C (Cooper) (`countryman-c-cooper`), Countryman E (Cooper) (`countryman-e-cooper`), Countryman SE (Cooper) (`countryman-se-cooper`), One First (`one-first`)
- **Land Rover** (3 из 12): Serie I (`serie-i`), Serie II (`serie-ii`), Serie III (`serie-iii`)
- **Suzuki** (2 из 25): LJ (`lj`), Wagon R+ (`wagon-r`)
- **Honda** (1 из 29): Aerodeck (`aerodeck`)
- **Mitsubishi** (1 из 35): Plug-in Hybrid Outlander (`plug-in-hybrid-outlander`)
- **Lexus** (12 из 65): GS 450 (`gs-450`), IS 220 (`is-220`), LX 450 (`lx-450`), LX 500 (`lx-500`), LX 700 (`lx-700`), NX 200 (`nx-200`), NX 450h (`nx-450h`), RC 200 (`rc-200`), RC 300 (`rc-300`), RX 200 (`rx-200`), RX 450 (`rx-450`), RX 500 (`rx-500`)
- **MG** (4 из 22): MG4 EV Urban (`mg4-ev-urban`), Montego (`montego`), S6 EV (`s6-ev`), S9 (`s9`)
- **BYD** (2 из 13): ETP 3 (`etp-3`), SEAL 5 (`seal-5`)
- **Subaru** (3 из 21): B9 Tribeca (`b9-tribeca`), Baja (`baja`), WRX STI (`wrx-sti`)
