# Справочник моделей — насколько подтверждены данные

Сгенерировано `tools/confirm.py` (2026-11-07) из `data/model-engines.csv`. Этап B61 п. 16 (`docs/PROJECT-MODELS.md`). **Подтверждено** — два независимых источника согласны (решение владельца 23.10): autocentrum.pl, ultimatespecs.com, каталог ADAC, Википедия. **Одна база** — значение есть только в одном источнике. **Правило** — электро и гибрид всегда с автоматом, модель только 4x4. **Вывод** — значение вычислено («механика, раз есть такая же с автоматом», «привод как у модели»). На странице пока ничего не меняется.

Версий в таблице: 25984.

| Поле | Подтверждено | Одна база | Правило | Вывод | Нет |
|---|---:|---:|---:|---:|---:|
| мотор | 22908 (88 %) | 3076 (12 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) |
| годы | 21883 (84 %) | 4101 (16 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) |
| фаза | 19799 (76 %) | 4697 (18 %) | 0 (0 %) | 28 (0 %) | 1460 (6 %) |
| коробка | 19676 (76 %) | 5945 (23 %) | 63 (0 %) | 41 (0 %) | 259 (1 %) |
| привод | 18376 (71 %) | 6477 (25 %) | 0 (0 %) | 409 (2 %) | 722 (3 %) |

**Фаза (дорест / рест)** подробно — источники года рестайлинга или «без рестайлинга»:

| Чем подтверждено | Версий |
|---|---:|
| adac + autocentrum + ultimatespecs | 7888 |
| adac + autocentrum | 4970 |
| adac + autocentrum (без рестайлинга) | 2258 |
| autocentrum | 2133 |
| adac + autocentrum (год есть, версии не разделены) | 1543 |
| нет данных о рестайлинге | 1460 |
| adac + Википедия (год есть, версии не разделены) | 1426 |
| Википедия (год есть, версии не разделены) | 1011 |
| adac (год есть, версии не разделены) | 858 |
| autocentrum + ultimatespecs | 527 |
| adac + ultimatespecs | 460 |
| adac + ultimatespecs + Википедия (год есть, версии не разделены) | 312 |
| adac | 286 |
| autocentrum (год есть, версии не разделены) | 197 |
| adac + autocentrum + Википедия (без рестайлинга) | 181 |
| adac (без рестайлинга) | 181 |
| autocentrum + Википедия (без рестайлинга) | 99 |
| ultimatespecs + Википедия (год есть, версии не разделены) | 88 |
| adac + ultimatespecs (год есть, версии не разделены) | 45 |
| ultimatespecs | 31 |
| вывод: год рестайлинга без источника | 28 |
| adac + autocentrum + ultimatespecs + Википедия (год есть, версии не разделены) | 2 |

## Каталог ADAC (этап 17)

Версий, у которых в ADAC (рынок Германии, данные производителя) нашлась та же версия — тот же вид топлива, мощность ± 3 л. с., объём ± 0,1 л, в продаже в те же годы: **18043 (69 %)**; пара — в колонке «ADAC: версия» (`data/model-engines.csv`). Страницы поколений — `data/adac-versions.json` (`tools/collect-adac-versions.py`).

## Нет в Польше и Германии (этап 20)

Поколения только с ultimatespecs у моделей, которые autocentrum (Польша) или ADAC (Германия) знают, и поколения «вне ЕС»: **34 (0 %)** версий (колонка «Рынок»). Отдельную редкую версию, которой нет в обоих (Golf GTI Clubsport 2024, RS3 Performance Edition), так не помечаем — она «одна база». В таблице остаются; на странице и платформе их моторы не считаются существующими — уходят под черту обычным шрифтом (решение владельца 23.10).

| Марка | Версий | Например |
|---|---:|---|
| Toyota | 17 | Camry XV50 (вне ЕС): Camry 2.5; Camry XV50 (вне ЕС): Camry 2.5 Automatic; Camry XV50 (вне ЕС): Camry 2.5 SE; Camry XV50 (вне ЕС): Camry 2.5 SE Automatic; Camry  |
| Genesis | 17 | G80 G80 (DH): G80 G80 3.3 G80 3.3T; G80 G80 (DH): G80 G80 3.3 G80 3.3T HTRAC AWD; G80 G80 (DH): G80 G80 3.8 G80 3.8; G80 G80 (DH): G80 G80 3.8 G80 3.8 HTRAC AWD |

## Исправлено по ADAC

Наше значение коробки или привода было только выведено (по названию, соседней версии, правилу), а все версии ADAC с тем же мотором называют одно другое — ставится значение ADAC (решение владельца 29.10): **133** версий, прежнее значение — в колонке «ADAC: исправлено», «откуда» — «ADAC: все версии мотора». С 06.11 (решение владельца) — и там, где наше называет один источник, а в поколении такое значение больше нигде не подтверждено (не больше 3 версий, название его не говорит): Audi A1 «задний», BMW X5 E70 «механика». ADAC — рынок Германии.

| Марка · модель · поколение | Что | Было | Стало | Версий | Например |
|---|---|---|---|---:|---|
| Audi A3 8V | привод | передний | полный | 17 | A3 2.0 TFSI 190HP |
| BMW X3 E83 | привод | задний | полный | 11 | E83 X3 2.5si |
| BMW Seria 5 F10 | коробка | механика | автомат | 9 | F10 550i |
| Mercedes-Benz CLA C178 | привод | передний | задний | 5 | CLA Coupe 200 EQ |
| Audi A3 8V | коробка | механика | автомат | 4 | A3 2.0 TFSI 190HP |
| BMW X6 E71 | коробка | механика | автомат | 4 | X6 Crossover xDrive35i |
| Kia Rio Rio III | привод | полный | передний | 4 | Rio Hatchback 3d 1.4 DOHC CVVT |
| Seat Leon Leon III | привод | задний | передний | 4 | Leon SC 1.2 TSI |
| BMW X5 E70 | коробка | механика | автомат | 4 | X5 SUV xDrive35i |
| Audi Q3 F3 | коробка | механика | автомат | 3 | Q3 40 TFSI Quattro |
| BMW Seria 4 G22 | коробка | механика | автомат | 3 | 420i Gran Coupe |
| Mercedes-Benz Sprinter Sprinter III | привод | передний | задний | 3 | Sprinter Furgon 516 CDI |
| MG MG4 MG4 I | привод | передний | задний | 3 | MG4 I 51kWh |
| Volvo S60 S60 II | привод | полный | передний | 3 | S60 Sedan 1.5 T3 DRIVE-E |
| Mercedes-Benz GLC X253 | привод | задний | полный | 2 | GLC 200 d |
| Volvo S60 S60 III | привод | передний | полный | 2 | S60 T8 Polestar Engineered |
| Audi A1 A1 I | привод | задний | передний | 2 | A1 Sportback 5d 1.6 TDI |
| BMW i3 G28 | привод | передний | задний | 2 | i3 Hatchback i3 Elektryczny |
| Mercedes-Benz SLK R172 | привод | полный | задний | 2 | SLK Roadster 200 |
| Subaru XV XV II | коробка | механика | автомат | 2 | XV Crossover 1.6 i |
| Audi A6 C7 | привод | передний | полный | 2 | A6 Avant 3.0 TFSI |
| Volvo V40 V40 II | привод | полный | передний | 2 | V40 Hatchback 1.6 T3 |
| Volvo V60 V60 I | привод | задний | передний | 2 | V60 Kombi 2.0 D2 DRIVE-E |
| Volvo V60 V60 I | привод | полный | передний | 2 | V60 Kombi 2.0 D4 DRIVE-E |
| Audi A5 F5 | коробка | механика | автомат | 1 | A5 Coupe 50 TDI quattro |
| Audi Q7 4L | коробка | механика | автомат | 1 | Q7 3.6 FSI Quattro |
| BMW X3 F25 | коробка | механика | автомат | 1 | F25 X3 xDrive35i |
| Mercedes-Benz GLC X253 Coupé (C253) | привод | задний | полный | 1 | GLC Coupe 200 d |
| Mercedes-Benz GLE V167 | коробка | механика | автомат | 1 | GLE 450 4MATIC |
| Volvo V60 V60 II | привод | передний | полный | 1 | V60 T8 Polestar Engineered |
| Volvo XC90 XC90 I | коробка | механика | автомат | 1 | XC90 D5 |
| Audi A8 D3 | коробка | механика | автомат | 1 | A8 Sedan 3.2 i V6 24V FSI quattro |
| Ford Fusion Fusion I | коробка | автомат | механика | 1 | Fusion I 1.4 Duratorq TDCi |
| Ford Ranger Ranger V | привод | передний | полный | 1 | Ranger Podwójna kabina 2019 2.0 EcoBlue |
| Mercedes-Benz Citan W415 | привод | задний | передний | 1 | Citan Furgon Ekstradługi 1.5 109 CDI |
| Mercedes-Benz GLA GLA I | привод | задний | передний | 1 | GLA Off-roader 1.6 200 |
| Renault Espace Espace IV | привод | задний | передний | 1 | Espace Van 2.0 dCi |
| Renault Kangoo Kangoo II | привод | полный | передний | 1 | Kangoo Mikrovan 1.5 dCi |
| Toyota Verso Verso | привод | полный | передний | 1 | Verso Minivan 1.8 Valvematic |
| Volvo ES90 ES90 I | привод | передний | задний | 1 | ES90 I Single Motor 88kWh |
| Volkswagen Phaeton Phaeton I | коробка | механика | автомат | 1 | Phaeton I 3.2 V6 |
| Kia Ceed Ceed II | привод | полный | передний | 1 | Ceed Hatchback 5d 1.0 T-GDI |
| Hyundai H-1 H-1 II | привод | передний | задний | 1 | H-1 Wagon 2.5 CRDi |
| Seat Ibiza Ibiza IV | привод | задний | передний | 1 | Ibiza SportCoupe 1.4 TSI |
| Cupra Leon Leon II | привод | полный | передний | 1 | Leon Sportstourer 2.0 TDI |
| Mazda CX-7 CX-7 | привод | передний | полный | 1 | CX-7 SUV 2.2 MZR-CD |
| Mazda CX-7 CX-7 | коробка | автомат | механика | 1 | CX-7 SUV 2.3 |
| Nissan GT-R GT-R | коробка | механика | автомат | 1 | GT-R Coupe 3.8 |
| Nissan Primastar Primastar I | коробка | автомат | механика | 1 | Primastar I 2.0 dCi |
| Citroen Berlingo Berlingo I | привод | полный | передний | 1 | Berlingo I 1.6 HDi |
| Land Rover Range Rover Sport Range Rover Sport I | коробка | механика | автомат | 1 | Range Rover Sport I 3.0 TDV6 |
| Porsche Cayenne Cayenne II | привод | задний | полный | 1 | Cayenne SUV 4.8 S V8 |
| Mitsubishi L200 L200 IV | привод | передний | полный | 1 | L200 Double Cab 2.5 DOHC |
| Mitsubishi Outlander Outlander II | привод | передний | полный | 1 | Outlander II 2.2 TC-SST |
| Chevrolet Captiva Captiva I | привод | передний | полный | 1 | Captiva I 3.2 L |
| Smart ForTwo ForTwo II | привод | передний | задний | 1 | ForTwo Coupe 1.0 |
| Infiniti M M III | привод | полный | задний | 1 | M III 3.0 d V6 |
| Isuzu D-Max D-Max III | привод | передний | задний | 1 | D-Max Single Cab 1.9 ddi |
| BMW X3 G01 | коробка | механика | автомат | 1 | X3 SUV 2.0 20d |
| Ford C-Max Mk2 | привод | задний | передний | 1 | C-Max Grand C-MAX 1.6 TDCi |
| Ford S-Max Mk2 | привод | задний | передний | 1 | S-Max I 2.0 EcoBlue |
| Renault Megane Mégane IV | привод | задний | передний | 1 | Megane Hatchback 5d 1.3 TCe 140 FAP |
| Volvo V40 V40 II | привод | задний | передний | 1 | V40 Hatchback 1.6 T2 |
| Volvo XC60 XC60 I | привод | полный | передний | 1 | XC60 SUV 2.0 T5 |

## ADAC говорит другое (проверить)

Коробка или привод версии не подтверждены вторым источником, а все прочитанные версии ADAC с тем же мотором (страницы версий, `data/adac-details.json`) называют другое: **464 (2 %)** версий, колонка «ADAC: другое». Наше значение называет один источник — это бывает его ошибка, разница рынков (ADAC — Германия) или версия, которой ADAC не перечисляет; сами не меняются.

| Марка · модель · поколение | Что | У нас | У ADAC | Версий ADAC | Наших версий | Откуда наше | Например |
|---|---|---|---|---:|---:|---|---|
| Volkswagen Golf Golf VI | привод | полный | передний | 54 | 1 | одна база: autocentrum | Golf Variant 1.6 TDI-CR DPF |
| Mercedes-Benz Klasa V W447 | коробка | механика | автомат | 53 | 1 | одна база: autocentrum | Klasa V Ekstra Długi 250 BlueTEC |
| Volkswagen Polo Polo V | привод | полный | передний | 48 | 14 | одна база: autocentrum | Polo Hatchback 3d 1.2 TSI |
| Mercedes-Benz Sprinter Sprinter III | привод | полный | задний | 30 | 13 | одна база: autocentrum | Sprinter Furgon 2.1 316 CDI |
| Ssangyong Rexton Rexton IV | привод | передний | полный / задний | 24 | 2 | одна база: autocentrum | Rexton SUV 2.2 Diesel |
| Skoda Yeti Yeti | привод | полный | передний | 24 | 1 | одна база: autocentrum | Yeti Outdoor 1.4 TSI |
| Opel Astra Astra K | коробка | автомат | механика | 24 | 1 | одна база: autocentrum | Astra Hatchback 5d 1.4 Turbo |
| Ford Fiesta Mk7 | коробка | автомат | механика | 23 | 2 | одна база: autocentrum | Fiesta Hatchback 5d 1.0 EcoBoost |
| Volvo V40 V40 II | привод | полный | передний | 22 | 32 | одна база: ultimatespecs | V40 Cross Country D3 Kinetic |
| Volvo V60 V60 I | привод | полный | передний | 20 | 4 | одна база: autocentrum | V60 Cross Country 2.0 T5 |
| Land Rover Freelander Freelander II | привод | передний | полный | 20 | 1 | одна база: autocentrum | Freelander II 2.2 eD4 |
| Renault Twingo Twingo III | привод | передний | задний | 19 | 4 | одна база: autocentrum | Twingo GT 0.9 tce |
| Toyota Yaris XP21 | привод | полный | передний | 19 | 3 | одна база: autocentrum | Yaris Cross 1.5 Hybrid Dynamic Force |
| Volkswagen Sharan Sharan I | коробка | автомат | механика | 18 | 1 | одна база: autocentrum | Sharan I 2.0 i |
| Skoda Rapid Rapid II | коробка | механика | автомат | 16 | 3 | одна база: autocentrum | Rapid Spaceback 1.4 TSI |
| Subaru Legacy Legacy V | коробка | механика | автомат | 15 | 2 | одна база: autocentrum | Legacy Sedan 2.5 i |
| Skoda Octavia Octavia III | привод | полный | передний | 14 | 4 | одна база: autocentrum | Octavia Liftback 1.6 TDI |
| Ford Focus Mk2 | коробка | автомат | механика | 14 | 2 | одна база: ultimatespecs | Focus 1.6 TDCi 109HP CVT Ghia Sedan |
| Seat Alhambra Alhambra II | привод | полный | передний | 14 | 1 | одна база: autocentrum | Alhambra Van 2.0 TDI |
| Ford Kuga Mk3 | коробка | механика | автомат | 14 | 1 | одна база: autocentrum | Kuga SUV 2.0 EcoBlue |
| Smart ForTwo ForTwo II | коробка | механика | автомат | 13 | 12 | одна база: autocentrum | ForTwo Cabrio 1.0 |
| Skoda Roomster Roomster | коробка | автомат | механика | 13 | 1 | одна база: autocentrum | Roomster Mikrovan 1.6 TDI CR DPF |
| Toyota RAV 4 XA40 | привод | передний | полный | 13 | 1 | одна база: autocentrum | RAV 4 MPV 2.0 Valvematic |
| Suzuki Vitara Vitara III | коробка | механика | автомат | 12 | 4 | одна база: autocentrum | Vitara SUV 2024 1.5 Strong Hybrid |
| Mercedes-Benz GLB GLB | привод | передний | полный / задний | 12 | 1 | одна база: autocentrum | GLB SUV 2.0 220d |
| Opel Zafira Zafira C | коробка | механика | автомат | 12 | 1 | одна база: autocentrum | Zafira Tourer 1.6 Turbo |
| Audi A4 B8 | привод | передний | полный | 12 | 1 | одна база: autocentrum | A4 Limousine 3.0 TDI |
| Skoda Octavia Octavia II | привод | полный | передний | 11 | 13 | одна база: autocentrum | Octavia Kombi 1.8 TSI |
| Volvo XC40 XC40 I | привод | полный | передний | 11 | 10 | одна база: ultimatespecs | XC40 T2 |
| Renault Clio Clio IV | коробка | механика | автомат | 11 | 3 | одна база: autocentrum | Clio TCe 120 |
| Mercedes-Benz Klasa C W204 | привод | полный | задний | 11 | 3 | одна база: autocentrum | Klasa C Coupe 250 BlueEFFICIENCY |
| Opel Insignia Insignia II | привод | полный | передний | 11 | 1 | одна база: autocentrum | Insignia Country Tourer 1.5 Turbo |
| Volkswagen Tiguan Tiguan I | коробка | автомат | механика | 11 | 1 | одна база: autocentrum | Tiguan SUV 1.4 TSI BlueMotion Technology |
| Volvo XC60 XC60 I | привод | полный | передний | 10 | 9 | одна база: ultimatespecs | XC60 D3 Kinetic |
| Nissan Qashqai Qashqai I | коробка | автомат | механика | 10 | 4 | одна база: autocentrum | Qashqai Crossover 1.6 |
| Mercedes-Benz GLA GLA II | привод | передний | полный | 10 | 1 | одна база: autocentrum | GLA Off-roader 2.0 220d |
| Opel Combo Combo D | коробка | механика | автомат | 10 | 1 | одна база: autocentrum | Combo Tour 1.6 CDTI |
| Fiat Punto Punto 2012 | коробка | автомат | механика | 10 | 1 | одна база: autocentrum | Punto Hatchback 5d 0.9 TwinAir 8v |
| BMW X1 U11 | привод | полный | передний | 10 | 1 | одна база: autocentrum | X1 Crossover 2.0 20d |
| Mercedes-Benz CLA C118 | коробка | механика | автомат | 10 | 1 | одна база: autocentrum | CLA Coupe 2.0 200d |
| Volkswagen Passat B7 | привод | полный | передний | 10 | 1 | одна база: autocentrum | Passat Alltrack 2.0 TSI |
| Volvo S80 S80 II | коробка | автомат | механика | 9 | 1 | одна база: autocentrum | S80 Sedan 2.0 F |
| Volvo V90 V90 II | привод | полный | передний | 9 | 1 | одна база: autocentrum | V90 Kombi 2.0 D3 |
| Ford C-Max Mk2 | коробка | автомат | механика | 9 | 1 | одна база: autocentrum | C-Max Minivan 1.6 TDCi |
| Toyota Auris E15 | коробка | автомат | механика | 9 | 1 | одна база: autocentrum | Auris Hatchback 2.0 D-4D |
| Volvo XC60 XC60 I | коробка | механика | автомат | 9 | 1 | одна база: autocentrum | XC60 SUV 2.0 T5 DRIVE-E |
| Ford Kuga Mk2 | коробка | автомат | механика | 8 | 5 | одна база: autocentrum | Kuga 2.0 TDCi 120HP 4x2 Titanium |
| Renault Trafic Trafic III | коробка | автомат | механика | 8 | 3 | одна база: ultimatespecs | Trafic dCi 115 Black Edition LWB Quicksh |
| Renault Clio Clio III | коробка | автомат | механика | 8 | 2 | одна база: ultimatespecs | Clio  1.5 dCi 85HP Exception eco2 Automa |
| Opel Corsa Corsa D | коробка | механика | автомат | 8 | 2 | одна база: autocentrum | Corsa Hatchback 1.2 Twinport ECOTEC |
| Alfa Romeo Giulia Giulia II | коробка | механика | автомат | 8 | 2 | одна база: autocentrum | Giulia Sedan 2.2 JtdM-2 |
| BMW Seria 5 E60 | привод | полный | задний | 8 | 2 | одна база: autocentrum | Seria 5 Sedan 535i |
| Mercedes-Benz GLB GLB | привод | передний | полный | 8 | 1 | одна база: autocentrum | GLB SUV 2.0 220d |
| Opel Corsa Corsa D | коробка | автомат | механика | 8 | 1 | одна база: autocentrum | Corsa Hatchback 3d 1.7 CDTI ECOTEC |
| Mercedes-Benz Klasa C W204 | коробка | механика | автомат | 8 | 1 | одна база: autocentrum | Klasa C Limuzyna 3.0 350 CDI BlueEFFICIE |
| Volkswagen Caddy Caddy III | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | Caddy Kombi Maxi 2.0 TDI |
| Seat Ibiza Ibiza IV | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | Ibiza Hatchback 5d 1.0 MPI |
| Mazda Mazda 2 Mazda 2 II | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | Mazda 2 Hatchback 5d 1.3 MZR |
| Audi A3 8V | привод | полный | передний | 7 | 2 | одна база: autocentrum | A3 Sportback 5d 1.6 TDI clean diesel |
| Toyota RAV 4 XA50 | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | RAV 4 SUV 2.0 Dual VVT-iE |
| Volvo EX30 EX30 I | привод | задний | полный | 7 | 1 | одна база: autocentrum | EX30 I 69kWh Twin |
| Citroen C3 Aircross C3 Aircross I | коробка | механика | автомат | 7 | 1 | одна база: autocentrum | C3 Aircross Crossover 1.6 BlueHDI |
| KGM Rexton Rexton IV | привод | передний | полный | 7 | 1 | одна база: autocentrum | Rexton SUV 2.2 diesel |
| Genesis GV80 GV80 | привод | задний | полный | 7 | 1 | одна база: ultimatespecs | GV80 GV80 2.5 GV80 2.5T RWD |
| Peugeot 2008 2008 I | коробка | автомат | механика | 7 | 1 | одна база: autocentrum | 2008 SUV 1.6 BlueHDi |
| Volvo S60 S60 II | привод | полный | передний | 7 | 1 | одна база: autocentrum | S60 Cross Country 2.0 T5 |
| Seat Leon Leon III | привод | полный | передний | 6 | 10 | одна база: autocentrum | Leon ST 2.0 TDI |
| Mazda Mazda 6 Mazda 6 III | привод | полный | передний | 6 | 3 | одна база: autocentrum | Mazda 6 Sport Kombi 2018 2.2 Skyactiv-D |
| Skoda Superb Superb II | коробка | автомат | механика | 6 | 3 | одна база: autocentrum | Superb Sedan 1.6 TDI CR DPF |
| Audi A4 B9 | коробка | механика | автомат | 6 | 2 | одна база: autocentrum | A4 Allroad 40 TDI quattro |
| Skoda Yeti Yeti | коробка | автомат | механика | 6 | 2 | одна база: autocentrum | Yeti Minivan 1.8 TSI |
| Volkswagen Arteon Arteon | коробка | механика | автомат | 6 | 2 | одна база: autocentrum | Arteon Fastback 2.0 TDI |
| Seat Alhambra Alhambra I | коробка | автомат | механика | 6 | 2 | одна база: autocentrum | Alhambra Minivan 2.0 i |
| Mercedes-Benz CLA C178 | привод | задний | полный / передний | 6 | 2 | одна база: autocentrum | CLA Saloon 1.5 200 Mild Hybrid |
| Peugeot 308 308 I | коробка | автомат | механика | 6 | 2 | одна база: autocentrum | 308 SW 2.0 HDi FAP |
| Opel Insignia Insignia I | коробка | автомат | механика | 6 | 1 | одна база: autocentrum | Insignia Sedan 2.0 CDTI ECOTEC |
| Citroen C5 Aircross C5 Aircross I | коробка | механика | автомат | 6 | 1 | одна база: autocentrum | C5 Aircross SUV 1.5 BlueHDi |
| Alfa Romeo Giulia Giulia II | привод | задний | полный | 6 | 1 | одна база: autocentrum | Giulia Sedan 2.0 Turbo |
| Chevrolet Epica Epica I | коробка | автомат | механика | 6 | 1 | одна база: autocentrum | Epica I 2.0 24v |
| Ssangyong Rexton Rexton IV | привод | передний | полный | 6 | 1 | одна база: autocentrum | Rexton SUV 2.2 diesel |
| … ещё 120 | | | | | | | |

## По источнику строки

| Источник строки | Версий | Мотор подтверждён | Годы подтверждены |
|---|---:|---:|---:|
| autocentrum | 14268 | 11832 (83 %) | 11135 (78 %) |
| ultimatespecs | 11133 | 10676 (96 %) | 10249 (92 %) |
| adac | 583 | 400 (69 %) | 499 (86 %) |

## По маркам

Доля версий марки с подтверждённым значением (два источника).

| Марка | Моделей | Версий | Мотор | Годы | Фаза | Коробка | Привод |
|---|---:|---:|---:|---:|---:|---:|---:|
| Volkswagen | 30 | 2565 | 84 % | 71 % | 69 % | 74 % | 66 % |
| Mercedes-Benz | 38 | 2468 | 91 % | 85 % | 90 % | 78 % | 75 % |
| BMW | 26 | 2309 | 94 % | 98 % | 88 % | 81 % | 78 % |
| Audi | 18 | 2259 | 94 % | 98 % | 93 % | 89 % | 88 % |
| Ford | 32 | 1743 | 86 % | 86 % | 81 % | 74 % | 70 % |
| Renault | 26 | 1505 | 94 % | 81 % | 78 % | 75 % | 73 % |
| Peugeot | 24 | 1290 | 92 % | 92 % | 80 % | 80 % | 75 % |
| Volvo | 20 | 1243 | 95 % | 98 % | 76 % | 89 % | 80 % |
| Opel | 18 | 1119 | 91 % | 85 % | 86 % | 78 % | 72 % |
| Skoda | 15 | 1067 | 94 % | 97 % | 83 % | 87 % | 82 % |
| Toyota | 32 | 738 | 81 % | 78 % | 68 % | 70 % | 65 % |
| Fiat | 25 | 664 | 72 % | 61 % | 60 % | 62 % | 61 % |
| Citroen | 28 | 649 | 91 % | 79 % | 61 % | 78 % | 74 % |
| Kia | 26 | 570 | 89 % | 95 % | 72 % | 75 % | 68 % |
| Seat | 10 | 535 | 93 % | 69 % | 77 % | 82 % | 72 % |
| Hyundai | 26 | 534 | 86 % | 84 % | 79 % | 66 % | 58 % |
| Porsche | 7 | 396 | 87 % | 100 % | 71 % | 54 % | 44 % |
| Mazda | 18 | 359 | 92 % | 90 % | 80 % | 89 % | 77 % |
| Nissan | 27 | 353 | 82 % | 73 % | 62 % | 73 % | 68 % |
| Mini | 8 | 324 | 98 % | 80 % | 57 % | 75 % | 62 % |
| Land Rover | 8 | 311 | 86 % | 73 % | 76 % | 62 % | 56 % |
| Dacia | 8 | 267 | 90 % | 88 % | 91 % | 79 % | 76 % |
| Jaguar | 8 | 198 | 90 % | 100 % | 58 % | 66 % | 58 % |
| Alfa Romeo | 11 | 187 | 80 % | 56 % | 9 % | 55 % | 53 % |
| Chevrolet | 18 | 181 | 60 % | 42 % | 47 % | 50 % | 50 % |
| Mitsubishi | 11 | 175 | 81 % | 66 % | 50 % | 64 % | 61 % |
| Honda | 17 | 174 | 79 % | 89 % | 38 % | 65 % | 59 % |
| Jeep | 9 | 174 | 79 % | 60 % | 55 % | 63 % | 52 % |
| Suzuki | 14 | 172 | 55 % | 47 % | 47 % | 49 % | 51 % |
| Ssangyong | 9 | 135 | 54 % | 60 % | 53 % | 37 % | 32 % |
| Lexus | 14 | 133 | 71 % | 68 % | 39 % | 34 % | 25 % |
| Subaru | 12 | 118 | 72 % | 72 % | 28 % | 38 % | 27 % |
| KGM | 6 | 107 | 25 % | 57 % | 16 % | 24 % | 21 % |
| DS | 7 | 88 | 87 % | 100 % | 64 % | 60 % | 48 % |
| Cupra | 7 | 78 | 88 % | 96 % | 96 % | 88 % | 84 % |
| Chrysler | 7 | 75 | 22 % | 21 % | 18 % | 18 % | 12 % |
| Genesis | 6 | 72 | 44 % | 26 % | 0 % | 44 % | 40 % |
| Infiniti | 12 | 70 | 71 % | 24 % | 21 % | 32 % | 18 % |
| Dodge | 10 | 62 | 30 % | 14 % | 22 % | 11 % | 6 % |
| Smart | 3 | 58 | 94 % | 86 % | 100 % | 56 % | 34 % |
| Lancia | 6 | 55 | 83 % | 25 % | 47 % | 65 % | 63 % |
| Tesla | 4 | 48 | 64 % | 100 % | 100 % | 64 % | 33 % |
| Cadillac | 5 | 36 | 55 % | 63 % | 69 % | 44 % | 33 % |
| Isuzu | 1 | 34 | 41 % | 20 % | 0 % | 17 % | 14 % |
| Abarth | 2 | 30 | 100 % | 6 % | 6 % | 60 % | 60 % |
| Maserati | 5 | 30 | 93 % | 56 % | 80 % | 43 % | 43 % |
| MG | 6 | 25 | 72 % | 88 % | 52 % | 64 % | 48 % |
| Polestar | 5 | 21 | 71 % | 76 % | 0 % | 71 % | 71 % |
| BYD | 8 | 20 | 90 % | 100 % | 85 % | 90 % | 85 % |
| XPENG | 3 | 16 | 93 % | 62 % | 0 % | 93 % | 93 % |
| NIO | 5 | 13 | 100 % | 100 % | 0 % | 100 % | 100 % |
| DFSK | 8 | 12 | 33 % | 41 % | 0 % | 33 % | 33 % |
| GWM | 6 | 12 | 58 % | 66 % | 0 % | 58 % | 58 % |
| VinFast | 4 | 12 | 66 % | 33 % | 0 % | 66 % | 66 % |
| Leapmotor | 1 | 10 | 10 % | 100 % | 100 % | 10 % | 0 % |
| Lucid | 1 | 10 | 40 % | 100 % | 0 % | 40 % | 40 % |
| Zeekr | 3 | 10 | 50 % | 40 % | 0 % | 50 % | 50 % |
| Maxus | 6 | 9 | 100 % | 88 % | 0 % | 88 % | 22 % |
| Alpine | 1 | 8 | 87 % | 100 % | 100 % | 62 % | 62 % |
| BAIC | 6 | 8 | 0 % | 0 % | 0 % | 0 % | 0 % |
| Geely | 2 | 6 | 0 % | 0 % | 0 % | 0 % | 0 % |
| JAECOO | 2 | 6 | 83 % | 100 % | 100 % | 16 % | 0 % |
| Hongqi | 3 | 5 | 0 % | 0 % | 0 % | 0 % | 0 % |
| OMODA | 2 | 5 | 20 % | 40 % | 100 % | 20 % | 20 % |
| Seres | 2 | 5 | 80 % | 100 % | 0 % | 80 % | 80 % |
| INEOS | 1 | 4 | 100 % | 100 % | 0 % | 100 % | 100 % |
| Lynk&Co | 3 | 4 | 50 % | 25 % | 0 % | 50 % | 50 % |
| Aiways | 1 | 3 | 100 % | 0 % | 0 % | 100 % | 100 % |
| ORA | 1 | 2 | 100 % | 0 % | 0 % | 100 % | 100 % |
