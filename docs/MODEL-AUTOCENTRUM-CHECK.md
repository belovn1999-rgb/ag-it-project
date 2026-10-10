# Проверка таблицы моделей по autocentrum.pl (B61)

> Сгенерировано `tools/check-autocentrum.py` из `data/model-engines.csv` (наша таблица, ultimatespecs) и `data/autocentrum-models.json` (`tools/crawl-autocentrum.py`). Не править руками. Полная таблица находок: [`data/autocentrum-diff.csv`](../data/autocentrum-diff.csv). Цель и этапы: [PROJECT-MOBILE.md](PROJECT-MOBILE.md) §4.8.

Источник: https://www.autocentrum.pl/dane-techniczne/ — модель → поколение → кузов (дорест / Facelifting) → двигатель → варианты «Wybierz parametry napędu» (коробка, привод). Поколения, выпускавшиеся в 2010 и позже. Собрано 2026-10-10.

Столбец «Вывод» у привода и коробки: autocentrum тоже ошибается (Polo V и Octavia 1.2 TSI «4x4», BMW 330i «FWD»), поэтому каждая такая строка помечена: «у нас ошибка (вероятно)» — версия бывает только с полным приводом (quattro, RS, S, M40i, Scout, Cross Country…), «ошибка autocentrum (вероятно)» — противоречит названию или платформе, «проверить» — решить по странице версии.

Как сравнивается: поколение — по годам (общие годы ≥ 60 % более короткого; нумерация на сайтах разная: Touran II autocentrum = наш Touran I рестайлинг 2); двигатель — то же семейство топлива (бензин/LPG/CNG/гибрид — одно, дизель/дизель-гибрид — другое, плагин, электро), мощность ±3 л.с. (плагин/гибрид ±8), объём ±0,15 л; мягкие гибриды и Mercedes с 2018 — до ±25 л.с. при том же объёме (у одного сайта мощность с электромотором, у другого без) → категория «мощность»; двигатели и кузова, выпускавшиеся только до 2010, не сравниваются; кузов — по виду (универсал, кабриолет, купе, седан у хэтчбеков, 3 двери, кросс-версия, удлинённый, SUV-купе, гран купе); коробка и привод — по вариантам двигателя.

## Итог

Уже перенесено в нашу таблицу (`tools/autocentrum.py` → `merge()`, столбец «Источник»): 9384 строк из autocentrum, коробка у 2382 версий ultimatespecs. Ниже — что осталось после переноса.

- Просмотрено на autocentrum: 179 поколений, 751 кузовов, 5091 двигателей (по кузовам); найдено у нас 4956.
- Вариантов «коробка + привод» со страниц двигателей: 8008. Наших версий без коробки: 1213; autocentrum даёт для них одну коробку (можно заполнить) — 4, и механику, и автомат (какая у нашей версии — не сказать) — 886.
- Двигатели (топливо + объём + мощность), которых нет в нашем поколении: **1**
- Привод, которого нет у нас для этого двигателя: **13**
- Коробка, которой нет у нас для этого двигателя и привода: **2**
- Коробка у нас не указана — autocentrum её называет: **96**
- Годы поколения или рестайлинга расходятся на 2+ года (для сведения): **12**
- Мощность мягких гибридов записана по-разному (для сведения): **60**

Двери и места (у 739 из 751 кузовов autocentrum) перенесены в нашу таблицу — столбцы «Двери» и «Места» `data/model-engines.csv`, фильтры «Liczba drzwi» и «Liczba miejsc». Нет у нас совсем (есть в `data/autocentrum-table.csv`): крутящий момент, норма Euro, код двигателя, расход, CO₂, размеры, багажник, масса, разгон, макс. скорость, бак.

## По моделям

| Марка | Модель | поколение | кузов | двигатель | топливо | привод | коробка | коробка+ | годы | мощность |
|---|---|---|---|---|---|---|---|---|---|---|
| Audi | A3 |  |  |  |  |  |  | 2 |  |  |
| Audi | A4 |  |  |  |  |  |  | 7 |  |  |
| Audi | A5 |  |  |  |  |  |  | 8 |  |  |
| Audi | A6 |  |  |  |  |  |  | 3 |  |  |
| Audi | Q3 |  |  |  |  |  |  |  |  |  |
| Audi | Q5 |  |  |  |  |  |  | 1 |  | 1 |
| Audi | Q7 |  |  |  |  |  |  |  |  | 1 |
| BMW | Seria 1 |  |  |  |  | 3 |  | 1 | 1 |  |
| BMW | Seria 3 |  |  |  |  | 2 |  | 6 | 1 |  |
| BMW | Seria 4 |  |  |  |  |  |  |  |  |  |
| BMW | Seria 5 |  |  |  |  | 1 |  | 2 | 1 |  |
| BMW | X1 |  |  |  |  | 6 |  | 1 |  |  |
| BMW | X3 |  |  |  |  |  |  | 2 |  |  |
| BMW | X5 |  |  |  |  | 1 |  | 4 |  |  |
| Ford | C-Max |  |  |  |  |  |  | 1 |  |  |
| Ford | Fiesta |  |  |  |  |  |  | 1 | 1 | 1 |
| Ford | Focus |  |  |  |  |  |  |  |  |  |
| Ford | Kuga |  |  |  |  |  |  | 1 |  |  |
| Ford | Mondeo |  |  |  |  |  |  | 1 |  |  |
| Ford | S-Max |  |  |  |  |  |  | 1 |  |  |
| Mercedes-Benz | Klasa A |  |  |  |  |  |  |  |  |  |
| Mercedes-Benz | Klasa C |  |  |  |  |  |  | 3 |  | 2 |
| Mercedes-Benz | Klasa E |  |  | 1 |  |  | 1 |  |  | 7 |
| Mercedes-Benz | Klasa S |  |  |  |  |  |  |  |  | 7 |
| Mercedes-Benz | CLA |  |  |  |  |  |  |  |  |  |
| Mercedes-Benz | GLC |  |  |  |  |  |  |  |  | 12 |
| Mercedes-Benz | GLE |  |  |  |  |  |  |  |  | 8 |
| Peugeot | 208 |  |  |  |  |  |  |  |  |  |
| Peugeot | 308 |  |  |  |  |  |  |  | 1 |  |
| Peugeot | 508 |  |  |  |  |  |  |  |  |  |
| Peugeot | 2008 |  |  |  |  |  |  |  |  |  |
| Peugeot | 3008 |  |  |  |  |  |  | 3 |  |  |
| Peugeot | 5008 |  |  |  |  |  |  | 1 |  |  |
| Renault | Captur |  |  |  |  |  | 1 |  |  |  |
| Renault | Clio |  |  |  |  |  |  | 7 |  |  |
| Renault | Kadjar |  |  |  |  |  |  |  |  |  |
| Renault | Megane |  |  |  |  |  |  | 6 | 1 |  |
| Renault | Scenic |  |  |  |  |  |  | 4 |  |  |
| Renault | Trafic |  |  |  |  |  |  |  |  |  |
| Skoda | Fabia |  |  |  |  |  |  |  |  |  |
| Skoda | Kamiq |  |  |  |  |  |  |  |  |  |
| Skoda | Karoq |  |  |  |  |  |  |  |  |  |
| Skoda | Kodiaq |  |  |  |  |  |  |  |  |  |
| Skoda | Octavia |  |  |  |  |  |  | 2 |  |  |
| Skoda | Superb |  |  |  |  |  |  | 1 |  |  |
| Toyota | Auris |  |  |  |  |  |  | 5 |  |  |
| Toyota | Avensis |  |  |  |  |  |  |  | 1 |  |
| Toyota | C-HR |  |  |  |  |  |  |  |  |  |
| Toyota | Camry |  |  |  |  |  |  | 1 | 1 |  |
| Toyota | Corolla |  |  |  |  |  |  | 1 |  | 1 |
| Toyota | RAV 4 |  |  |  |  |  |  | 2 |  |  |
| Toyota | Yaris |  |  |  |  |  |  |  | 1 |  |
| Volvo | S60 |  |  |  |  |  |  | 5 | 1 | 1 |
| Volvo | V40 |  |  |  |  |  |  |  |  |  |
| Volvo | V60 |  |  |  |  |  |  | 1 |  | 7 |
| Volvo | XC40 |  |  |  |  |  |  |  |  | 2 |
| Volvo | XC60 |  |  |  |  |  |  |  |  | 6 |
| Volvo | XC90 |  |  |  |  |  |  |  |  | 4 |
| Volkswagen | Golf |  |  |  |  |  |  | 1 |  |  |
| Volkswagen | Passat |  |  |  |  |  |  | 5 |  |  |
| Volkswagen | Polo |  |  |  |  |  |  | 1 | 1 |  |
| Volkswagen | T-Roc |  |  |  |  |  |  |  |  |  |
| Volkswagen | T6 (Multivan, Transporter) |  |  |  |  |  |  | 1 | 1 |  |
| Volkswagen | Tiguan |  |  |  |  |  |  | 2 |  |  |
| Volkswagen | Touran |  |  |  |  |  |  | 2 |  |  |

## Двигатели (топливо + объём + мощность), которых нет в нашем поколении (1)

| Марка | Модель | Поколение (autocentrum) | Наше | Есть на autocentrum | Годы | Кузова | У нас |
|---|---|---|---|---|---|---|---|
| Mercedes-Benz | Klasa E | W213 (2016–2023) | W213 | [дизель 2.0 160 KM 118 kW](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w213/kombi-facelifting/silnik-diesla-2.0-e200d-160km-2020-2023/) — E200d | 2020–2023 | Kombi Facelifting | нет двигателя такой мощности |

## Привод, которого нет у нас для этого двигателя (13)

| Марка | Модель | Поколение (autocentrum) | Наше | Есть на autocentrum | Годы | Кузова | У нас |
|---|---|---|---|---|---|---|---|
| BMW | Seria 1 | F20-F21 (2011–2019) | F20/F21 | [бензин 136 KM](https://www.autocentrum.pl/dane-techniczne/bmw/seria-1/f20-f21/hatchback-3d/silnik-benzynowy-116i-136km-2012-2015/) — 116i: механика 6 / передний; автомат 8 / передний |  | Hatchback 3d | привод у нас: задний — **ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive** |
| BMW | Seria 1 | F20-F21 (2011–2019) | F20/F21 | [дизель 218 KM](https://www.autocentrum.pl/dane-techniczne/bmw/seria-1/f20-f21/hatchback-5d/silnik-diesla-125d-218km-2012-2015/) — 125d: механика 6 / передний |  | Hatchback 5d | привод у нас: задний — **ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive** |
| BMW | Seria 1 | E81/E87 (2004–2013) | E81/E87 | [дизель 2.0 204 KM](https://www.autocentrum.pl/dane-techniczne/bmw/seria-1/e81-e87/hatchback-3d-e81/silnik-diesla-2.0-123d-204km-2007-2011/) — 123d: механика 6 / передний |  | Hatchback 3d E81 | привод у нас: задний — **ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive** |
| BMW | Seria 3 | G20-G21 (2018–н. в.) | G20 | [бензин 2.0 245 KM](https://www.autocentrum.pl/dane-techniczne/bmw/seria-3/g20-g21/touring-facelifting/silnik-benzynowy-2.0-330i-245km-od-2023/) — 330i: автомат 8 / передний |  | Touring Facelifting | привод у нас: задний, полный — **ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive** |
| BMW | Seria 3 | F30-F31-F34 (2012–2020) | F30 | [дизель 3.0 258 KM](https://www.autocentrum.pl/dane-techniczne/bmw/seria-3/f30-f31-f34/limuzyna/silnik-diesla-3.0-330d-258km-2012-2015/) — 330d: автомат 8 / передний |  | Limuzyna | привод у нас: задний, полный — **ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive** |
| BMW | Seria 5 | F10-F11 (2010–2017) | F10 | [дизель 184 KM](https://www.autocentrum.pl/dane-techniczne/bmw/seria-5/f10-f11/limuzyna/silnik-diesla-520d-efficient-dynamics-184km-2011-2013/) — 520d Efficient Dynamics: механика 6 / передний |  | Limuzyna | привод у нас: задний, полный — **ошибка autocentrum (вероятно): BMW этого поколения — задний/xDrive** |
| BMW | X1 | F48 (2015–2022) | F48 | [бензин 136 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x1/f48/crossover/silnik-benzynowy-sdrive18i-136km-2015-2017/) — sDrive18i: механика 6 / задний; автомат 8 / задний |  | Crossover | привод у нас: передний — **ошибка autocentrum (вероятно): sDrive здесь — передний** |
| BMW | X1 | F48 (2015–2022) | F48 | [бензин 192 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x1/f48/crossover/silnik-benzynowy-sdrive20i-192km-2015-2019/) — sDrive20i: автомат / задний |  | Crossover | привод у нас: передний, полный — **ошибка autocentrum (вероятно): sDrive здесь — передний** |
| BMW | X1 | F48 (2015–2022) | F48 | [дизель 1.5 116 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x1/f48/crossover/silnik-diesla-1.5-16d-116km-2015-2019/) — 16d: механика 6 / задний |  | Crossover | привод у нас: передний — **ошибка autocentrum (вероятно): sDrive здесь — передний** |
| BMW | X1 | F48 (2015–2022) | F48 | [дизель 150 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x1/f48/crossover/silnik-diesla-sdrive18d-150km-2015-2019/) — sDrive18d: механика 6 / задний; автомат 8 / задний |  | Crossover | привод у нас: передний, полный — **ошибка autocentrum (вероятно): sDrive здесь — передний** |
| BMW | X1 | F48 (2015–2022) | F48 | [дизель 190 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x1/f48/crossover/silnik-diesla-sdrive20d-190km-2015-2019/) — sDrive20d: механика 6 / задний; автомат 8 / задний |  | Crossover | привод у нас: передний, полный — **ошибка autocentrum (вероятно): sDrive здесь — передний** |
| BMW | X1 | E84 (2009–2015) | E84 | [бензин 150 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x1/e84/crossover/silnik-benzynowy-sdrive18i-150km-2009-2012/) — sDrive18i: автомат / полный |  | Crossover | привод у нас: задний — **ошибка autocentrum (вероятно): в названии моноприводная версия** |
| BMW | X5 | E70 (2006–2013) | E70 | [дизель 245 KM](https://www.autocentrum.pl/dane-techniczne/bmw/x5/e70/suv-facelifting/silnik-diesla-xdrive30d-245km-2010-2013/) — xDrive30d: автомат 8 / задний |  | SUV Facelifting | привод у нас: полный — **ошибка autocentrum (вероятно): в названии полный привод** |

## Коробка, которой нет у нас для этого двигателя и привода (2)

| Марка | Модель | Поколение (autocentrum) | Наше | Есть на autocentrum | Годы | Кузова | У нас |
|---|---|---|---|---|---|---|---|
| Mercedes-Benz | Klasa E | W213 (2016–2023) | W213 | [гибрид 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w213/limuzyna/silnik-hybrydowy-2.0-200-211km-2016-2020/) — 200: механика 6 / задний |  | Limuzyna | у нас: автомат / задний — **ошибка autocentrum (вероятно): гибрид с механикой** |
| Renault | Captur | II (2019–н. в.) | Captur II | [гибрид 1.6 145 KM](https://www.autocentrum.pl/dane-techniczne/renault/captur/ii/crossover-hybrid/silnik-hybrydowy-1.6-e-tech-145km-2023/) — E-Tech: механика 6 / передний |  | Crossover Hybrid | у нас: автомат / передний — **ошибка autocentrum (вероятно): гибрид с механикой** |

## Коробка у нас не указана — autocentrum её называет (96)

Это не пропуск, а подсказка: где у нас «не указано», autocentrum называет коробку. Список по моделям (строки — в CSV):

Audi A5 — 8, Audi A4 — 7, Renault Clio — 7, BMW Seria 3 — 6, Renault Megane — 6, Toyota Auris — 5, Volvo S60 — 5, Volkswagen Passat — 5, BMW X5 — 4, Renault Scenic — 4, Audi A6 — 3, Mercedes-Benz Klasa C — 3, Peugeot 3008 — 3, Audi A3 — 2, BMW Seria 5 — 2, BMW X3 — 2, Skoda Octavia — 2, Toyota RAV 4 — 2, Volkswagen Tiguan — 2, Volkswagen Touran — 2, Audi Q5 — 1, BMW Seria 1 — 1, BMW X1 — 1, Ford C-Max — 1, Ford Fiesta — 1, Ford Kuga — 1, Ford Mondeo — 1, Ford S-Max — 1, Peugeot 5008 — 1, Skoda Superb — 1, Toyota Camry — 1, Toyota Corolla — 1, Volvo V60 — 1, Volkswagen Golf — 1, Volkswagen Polo — 1, Volkswagen T6 (Multivan, Transporter) — 1

## Годы поколения или рестайлинга расходятся на 2+ года (для сведения) (12)

| Марка | Модель | Поколение (autocentrum) | Наше | Есть на autocentrum | Годы | Кузова | У нас |
|---|---|---|---|---|---|---|---|
| BMW | Seria 1 | F20-F21 (2011–2019) | F20/F21 | [рестайлинг 2017 / у нас 2015](https://www.autocentrum.pl/dane-techniczne/bmw/seria-1/f20-f21/) |  |  |  |
| BMW | Seria 3 | E90-91-92-93 (2004–2013) | E90 | [рестайлинг 2010 / у нас 2008](https://www.autocentrum.pl/dane-techniczne/bmw/seria-3/e90-91-92-93/) |  |  |  |
| BMW | Seria 5 | F10-F11 (2010–2017) | F10 | [рестайлинг 2011 / у нас 2013](https://www.autocentrum.pl/dane-techniczne/bmw/seria-5/f10-f11/) |  |  |  |
| Ford | Fiesta | VII (2008–2017) | Mk7 | [рестайлинг 2014 / у нас 2012](https://www.autocentrum.pl/dane-techniczne/ford/fiesta/vii/) |  |  |  |
| Peugeot | 308 | I (2007–2015) | 308 I | [конец 2015 / у нас 2013](https://www.autocentrum.pl/dane-techniczne/peugeot/308/i/) |  |  |  |
| Renault | Megane | IV (2016–н. в.) | Mégane IV | [конец н. в. / у нас 2024](https://www.autocentrum.pl/dane-techniczne/renault/megane/iv/) |  |  |  |
| Toyota | Avensis | III (2009–2018) | T27 | [рестайлинг 2012 / у нас 2015](https://www.autocentrum.pl/dane-techniczne/toyota/avensis/iii/) |  |  |  |
| Toyota | Camry | VI (2006–2014) | XV40 (вне ЕС) | [конец 2014 / у нас 2011](https://www.autocentrum.pl/dane-techniczne/toyota/camry/vi/) |  |  |  |
| Toyota | Yaris | II (2005–2011) | XP9 | [конец 2011 / у нас 2013](https://www.autocentrum.pl/dane-techniczne/toyota/yaris/ii/) |  |  |  |
| Volvo | S60 | III (2018–н. в.) | S60 III | [конец н. в. / у нас 2024](https://www.autocentrum.pl/dane-techniczne/volvo/s60/iii/) |  |  |  |
| Volkswagen | Polo | VI (2017–н. в.) | Polo VI | [рестайлинг 2025 / у нас 2021](https://www.autocentrum.pl/dane-techniczne/volkswagen/polo/vi/) |  |  |  |
| Volkswagen | T6 (Multivan, Transporter) | T5 (2003–2015) | T5 Transporter, T5 Multivan | [рестайлинг 2009 / у нас рестайлинг без года](https://www.autocentrum.pl/dane-techniczne/volkswagen/caravelle/t5/) |  |  |  |

## Мощность мягких гибридов записана по-разному (для сведения) (60)

| Марка | Модель | Поколение (autocentrum) | Наше | Есть на autocentrum | Годы | Кузова | У нас |
|---|---|---|---|---|---|---|---|
| Audi | Q5 | II (2017–н. в.) | GU, FY | [бензин 2.0 190 KM](https://www.autocentrum.pl/dane-techniczne/audi/q5/ii/suv/silnik-benzynowy-2.0-40-tfsi-190km-2020/) — 40 TFSI | 2020–2020 | SUV | у нас 204 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Audi | Q7 | II (2015–н. в.) | 4M | [плагин-гибрид 3.0 462 KM](https://www.autocentrum.pl/dane-techniczne/audi/q7/ii-4m/q7-e/silnik-hybrydowy-3.0-60-tfsi-e-462km-od-2020/) — 60 TFSI e | 2020–н. в. | Q7-e | у нас 456 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Ford | Fiesta | VIII (2017–2023) | Mk8 | [гибрид 1.0 155 KM](https://www.autocentrum.pl/dane-techniczne/ford/fiesta/viii/active/silnik-hybrydowy-1.0-ecoboost-hybrid-155km-2020-2022/) — EcoBoost Hybrid | 2020–2022 | Active, Hatchback 5d | у нас 140 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa C | W206 (2021–н. в.) | W206 | [бензин 2.0 408 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-c/w206/limuzyna-amg/silnik-benzynowy-2.0-43amg-408km-od-2022/) — 43AMG | 2022–н. в. | Limuzyna AMG, Kombi AMG | у нас 422 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa C | W205 (2013–2021) | W205 | [гибрид 2.0 272 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-c/w205/limuzyna-facelifting/silnik-hybrydowy-2.0-c300-272km-2019-2021/) — C300 / 300 | 2018–2021 | Limuzyna Facelifting, Kombi Facelifting | у нас 258 л.с., 279 л.с., 293 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W214 (2023–н. в.) | W214 | [бензин 2.0 204 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w214/sedan/silnik-benzynowy-2.0-200-204km-od-2023/) — 200 | 2023–н. в. | Sedan, Kombi | у нас 227 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W214 (2023–н. в.) | W214 | [бензин 3.0 381 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w214/sedan/silnik-benzynowy-3.0-450-381km-od-2023/) — 450 | 2023–н. в. | Sedan, Kombi, All-Terrain | у нас 404 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W214 (2023–н. в.) | W214 | [дизель 2.0 197 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w214/sedan/silnik-diesla-2.0-220d-197km-od-2023/) — 220d | 2023–н. в. | Sedan, Kombi, All-Terrain | у нас 186 л.с., 220 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W213 (2016–2023) | W213 | [дизель 2.0 285 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w213/limuzyna-facelifting/silnik-diesla-2.0-e300d-285km-2021-2023/) — E300d | 2021–2023 | Limuzyna Facelifting | у нас 265 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W213 (2016–2023) | W213 | [плагин-гибрид 2.0 313 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w213/limuzyna-plug-in-facelifting/silnik-hybrydowy-2.0-300e-313km-2023/) — 300e | 2023–2023 | Limuzyna Plug-in Facelifting | у нас 306 л.с., 320 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W213 (2016–2023) | W213 | [гибрид 2.0 313 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w213/cabrio/silnik-hybrydowy-2.0-350-313km-2018-2020/) — 350 | 2018–2020 | Cabrio, Coupe, Limuzyna | у нас 299 л.с., 306 л.с., 320 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa E | W213 (2016–2023) | W213 | [гибрид 2.0 333 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-e/w213/limuzyna/silnik-hybrydowy-2.0-300e-333km-2019-2020/) — 300e | 2019–2020 | Limuzyna | у нас 320 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W223/V223 (2020–н. в.) | W223 | [бензин 3.0 381 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w223v223/sedan-facelifting/silnik-benzynowy-3.0-450-eq-boost-381km-od-2026/) — 450 EQ Boost | 2026–н. в. | Sedan Facelifting | у нас 367 л.с., 404 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W223/V223 (2020–н. в.) | W223 | [бензин 3.0 449 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w223v223/sedan-facelifting/silnik-benzynowy-3.0-500-eq-boost-449km-od-2026/) — 500 EQ Boost | 2026–н. в. | Sedan Facelifting | у нас 435 л.с., 472 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W223/V223 (2020–н. в.) | W223 | [бензин 4.0 537 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w223v223/sedan-facelifting/silnik-benzynowy-4.0-580-537km-od-2026/) — 580 | 2026–н. в. | Sedan Facelifting | у нас 526 л.с., 560 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W223/V223 (2020–н. в.) | W223 | [дизель 3.0 313 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w223v223/sedan-facelifting/silnik-diesla-3.0-350d-eq-boost-313km-od-2026/) — 350d EQ Boost | 2026–н. в. | Sedan Facelifting | у нас 336 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W223/V223 (2020–н. в.) | W223 | [дизель 3.0 367 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w223v223/sedan-facelifting/silnik-diesla-3.0-450d-eq-boost-367km-od-2026/) — 450d EQ Boost | 2026–н. в. | Sedan Facelifting | у нас 390 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W222 (2013–2020) | W222 | [гибрид 449 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w222/limuzyna-wersja-dluga/silnik-hybrydowy-500-e-449km-2015-2017/) — 500 e | 2015–2017 | Limuzyna wersja długa | у нас 455 л.с., 457 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | Klasa S | W221 (2005–2013) | W221 | [гибрид 299 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/klasa-s/w221/limuzyna-facelifting/silnik-hybrydowy-400-hybrid-299km-2009-2013/) — 400 HYBRID | 2009–2013 | Limuzyna Facelifting, Limuzyna wersja długa Facelifting | у нас 306 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [бензин 2.0 421 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe-amg/silnik-benzynowy-2.0-43-amg-421km-2024-2025/) — 43 AMG | 2023–2025 | Coupe AMG, SUV AMG | у нас 435 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [бензин 2.0 204 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe/silnik-benzynowy-2.0-200-204km-od-2023/) — 200 | 2023–н. в. | Coupe | у нас 227 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [бензин 2.0 258 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe/silnik-benzynowy-2.0-300-258km-od-2023/) — 300 | 2023–н. в. | Coupe | у нас 281 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [дизель 2.0 163 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe/silnik-diesla-2.0-200d-163km-od-2025/) — 200d | 2025–н. в. | Coupe, SUV | у нас 186 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [дизель 2.0 197 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe/silnik-diesla-2.0-220d-197km-od-2023/) — 220d | 2023–н. в. | Coupe | у нас 186 л.с., 220 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [дизель 2.0 269 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe/silnik-diesla-2.0-300d-269km-od-2023/) — 300d | 2022–н. в. | Coupe, SUV | у нас 292 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [дизель 3.0 367 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/coupe/silnik-diesla-3.0-450d-367km-od-2025/) — 450d | 2025–н. в. | Coupe, SUV | у нас 390 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [гибрид 2.0 204 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/suv/silnik-hybrydowy-2.0-200-mhev-204km-od-2022/) — 200 MHEV | 2022–н. в. | SUV | у нас 227 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [гибрид 2.0 258 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/suv/silnik-hybrydowy-2.0-300-mhev-258km-od-2022/) — 300 MHEV | 2022–н. в. | SUV | у нас 281 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C254/X254 (2022–н. в.) | X254 Coupé (C254), X254 | [гибрид (дизель) 2.0 197 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c254x254/suv/silnik-hybrydowy-2.0-220d-mhev-197km-od-2022/) — 220d MHEV | 2022–н. в. | SUV | у нас 186 л.с., 220 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C253 (2015–2022) | X253 Coupé (C253), X253 | [гибрид 2.0 272 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c253/coupe-facelifting/silnik-hybrydowy-2.0-300-272km-2019-2022/) — 300 | 2019–2022 | Coupe Facelifting, SUV Facelifting | у нас 258 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLC | C253 (2015–2022) | X253 Coupé (C253), X253 | [гибрид 2.0 327 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/glc/c253/coupe/silnik-hybrydowy-2.0-350-e-327km-2016-2019/) — 350 e | 2016–2019 | Coupe, SUV | у нас 320 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [бензин 3.0 381 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/suv-facelifting/silnik-benzynowy-3.0-450-381km-od-2023/) — 450 | 2023–н. в. | SUV Facelifting | у нас 367 л.с., 401 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [дизель 2.0 269 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/suv-facelifting/silnik-diesla-2.0-300d-269km-od-2023/) — 300d | 2023–н. в. | SUV Facelifting, Coupe Facelifting | у нас 289 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [дизель 3.0 367 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/suv-facelifting/silnik-diesla-3.0-450d-367km-od-2023/) — 450d | 2023–н. в. | SUV Facelifting, Coupe Facelifting | у нас 387 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [плагин-гибрид 2.0 381 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/suv-plug-in-facelifting/silnik-hybrydowy-2.0-400e-381km-od-2023/) — 400e | 2023–н. в. | SUV Plug-In Facelifting, Coupe Plug-In Facelifting | у нас 388 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [дизель 2.0 272 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/coupe/silnik-diesla-2.0-300d-272km-2021-2023/) — 300d | 2021–2023 | Coupe, SUV | у нас 289 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [гибрид 3.0 389 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/suv/silnik-hybrydowy-3.0-450-389km-2019-2023/) — 450 | 2019–2023 | SUV | у нас 367 л.с., 401 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | V167 (2019–н. в.) | V167, V167 Coupé (C167) | [гибрид 4.0 511 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/v167/suv/silnik-hybrydowy-4.0-580-511km-2019-2023/) — 580 | 2019–2023 | SUV | у нас 489 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Mercedes-Benz | GLE | W166/C292 (2015–2018) | W166 Coupé (C292), W166 | [гибрид 3.0 449 KM](https://www.autocentrum.pl/dane-techniczne/mercedes/gle/w166c292/suv/silnik-hybrydowy-3.0-500e-449km-2015-2018/) — 500e | 2015–2018 | SUV | у нас 442 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Toyota | Corolla | XII (2019–н. в.) | E21 | [гибрид 2.0 184 KM](https://www.autocentrum.pl/dane-techniczne/toyota/corolla/xii/hatchback/silnik-hybrydowy-2.0-hybrid-dynamic-force-184km-2019-2022/) — Hybrid Dynamic Force | 2019–2022 | Hatchback, TS Kombi | у нас 180 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | S60 | III (2018–н. в.) | S60 III | [гибрид 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/volvo/s60/iii/sedan/silnik-hybrydowy-2.0-b4-mild-hybrid-211km-2020-2023/) — B4 Mild Hybrid | 2020–2023 | Sedan | у нас 190 л.с., 197 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | II (2018–н. в.) | V60 II | [бензин 2.0 300 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/ii/kombi-facelifting/silnik-benzynowy-2.0-b6-300km-od-2023/) — B6 | 2023–н. в. | Kombi Facelifting | у нас 310 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | II (2018–н. в.) | V60 II | [гибрид 2.0 264 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/ii/cross-country/silnik-hybrydowy-2.0-b5-benzynowy-mild-hybrid-264km-2020-2023/) — B5 Benzynowy Mild Hybrid | 2020–2023 | Cross Country, Kombi | у нас 250 л.с., 254 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | II (2018–н. в.) | V60 II | [гибрид (дизель) 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/ii/cross-country/silnik-hybrydowy-2.0-b4-diesel-mild-hybrid-211km-2020-2023/) — B4 Diesel Mild Hybrid | 2020–2023 | Cross Country, Kombi | у нас 190 л.с., 197 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | II (2018–н. в.) | V60 II | [гибрид 2.0 177 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/ii/kombi/silnik-hybrydowy-2.0-b3-benzynowy-mild-hybrid-177km-2020-2023/) — B3 Benzynowy Mild Hybrid | 2020–2023 | Kombi | у нас 163 л.с., 190 л.с., 197 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | II (2018–н. в.) | V60 II | [гибрид 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/ii/kombi/silnik-hybrydowy-2.0-b4-benzynowy-mild-hybrid-211km-2020-2023/) — B4 Benzynowy Mild Hybrid | 2020–2023 | Kombi | у нас 190 л.с., 197 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | II (2018–н. в.) | V60 II | [гибрид 2.0 314 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/ii/kombi/silnik-hybrydowy-2.0-b6-benzynowy-mild-hybrid-314km-2020-2023/) — B6 Benzynowy Mild Hybrid | 2020–2023 | Kombi | у нас 310 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | V60 | I (2010–2018) | V60 I | [плагин-гибрид 2.4 288 KM](https://www.autocentrum.pl/dane-techniczne/volvo/v60/i/kombi-facelifting/silnik-hybrydowy-2.4-d6-plug-in-hybrid-288km-2015-2018/) — D6 Plug-in Hybrid | 2015–2018 | Kombi Facelifting | у нас 280 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC40 | xc40 (2017–н. в.) | XC40 I | [гибрид 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc40/crossover/silnik-hybrydowy-2.0-b4-mild-hybrid-211km-2020-2021/) — B4 Mild Hybrid | 2020–2021 | Crossover | у нас 190 л.с., 197 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC40 | xc40 (2017–н. в.) | XC40 I | [гибрид 2.0 264 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc40/crossover/silnik-hybrydowy-2.0-b5-mild-hybrid-264km-2020-2021/) — B5 Mild Hybrid | 2020–2021 | Crossover | у нас 247 л.с., 250 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC60 | II (2017–н. в.) | XC60 II | [гибрид 2.0 300 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc60/ii/crossover-facelifting/silnik-hybrydowy-2.0-b6-300km-2022-2025/) — B6 | 2022–2025 | Crossover Facelifting | у нас 310 л.с., 320 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC60 | II (2017–н. в.) | XC60 II | [гибрид 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc60/ii/crossover/silnik-hybrydowy-2.0-b4-benzynowy-mild-hybrid-211km-2020-2021/) — B4 Benzynowy Mild Hybrid | 2020–2021 | Crossover | у нас 190 л.с., 197 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC60 | II (2017–н. в.) | XC60 II | [гибрид 2.0 264 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc60/ii/crossover/silnik-hybrydowy-2.0-b5-benzynowy-mild-hybrid-264km-2020-2021/) — B5 Benzynowy Mild Hybrid | 2020–2021 | Crossover | у нас 250 л.с., 254 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC60 | II (2017–н. в.) | XC60 II | [гибрид 2.0 314 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc60/ii/crossover/silnik-hybrydowy-2.0-b6-benzynowy-mild-hybrid-314km-2020-2021/) — B6 Benzynowy Mild Hybrid | 2020–2021 | Crossover | у нас 310 л.с., 320 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC60 | II (2017–н. в.) | XC60 II | [гибрид (дизель) 2.0 211 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc60/ii/crossover/silnik-hybrydowy-2.0-b4-diesel-mild-hybrid-211km-2019-2021/) — B4 Diesel Mild Hybrid | 2019–2021 | Crossover | у нас 190 л.с., 197 л.с., 235 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC60 | II (2017–н. в.) | XC60 II | [гибрид (дизель) 2.0 249 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc60/ii/crossover/silnik-hybrydowy-2.0-b5-diesel-mild-hybrid-249km-2019-2021/) — B5 Diesel Mild Hybrid | 2019–2021 | Crossover | у нас 235 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC90 | II (2014–н. в.) | XC90 II | [гибрид (дизель) 2.0 249 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc90/ii/suv-facelifting-2024/silnik-hybrydowy-2.0-b5-diesel-mild-hybrid-249km-2024-2025/) — B5 Diesel Mild Hybrid | 2019–2025 | SUV Facelifting 2024, SUV Facelifting | у нас 224 л.с., 235 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC90 | II (2014–н. в.) | XC90 II | [гибрид 2.0 264 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc90/ii/suv-facelifting/silnik-hybrydowy-2.0-b5-benzynowy-mild-hybrid-264km-2020-2024/) — B5 Benzynowy Mild Hybrid | 2020–2024 | SUV Facelifting | у нас 250 л.с., 254 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC90 | II (2014–н. в.) | XC90 II | [гибрид 2.0 314 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc90/ii/suv-facelifting/silnik-hybrydowy-2.0-b6-benzynowy-mild-hybrid-314km-2020-2024/) — B6 Benzynowy Mild Hybrid | 2020–2024 | SUV Facelifting | у нас 300 л.с., 310 л.с., 321 л.с. (мягкий гибрид: мощность с электромотором или без) |
| Volvo | XC90 | II (2014–н. в.) | XC90 II | [гибрид 2.0 400 KM](https://www.autocentrum.pl/dane-techniczne/volvo/xc90/ii/suv/silnik-hybrydowy-2.0-t8-twin-engine-400km-2014-2016/) — T8 Twin Engine | 2014–2016 | SUV | у нас 407 л.с. (мягкий гибрид: мощность с электромотором или без) |
