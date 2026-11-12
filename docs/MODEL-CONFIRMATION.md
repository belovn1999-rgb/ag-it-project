# Справочник моделей — насколько подтверждены данные

Сгенерировано `tools/confirm.py` (2026-11-12) из `data/model-engines.csv`. Этап B61 п. 16 (`docs/PROJECT-MODELS.md`). **Подтверждено** — два независимых источника согласны (решение владельца 23.10): autocentrum.pl, ultimatespecs.com, каталог ADAC, Википедия, реестр ЕС новых машин (EEA), реестр США (EPA). **Одна база** — значение есть только в одном источнике. **Правило** — электро и гибрид всегда с автоматом, модель только 4x4. **Вывод** — значение вычислено («механика, раз есть такая же с автоматом», «привод как у модели»). На странице пока ничего не меняется.

Версий в таблице: 25984.

| Поле | Подтверждено | Одна база | Правило | Вывод | Нет |
|---|---:|---:|---:|---:|---:|
| мотор | 24610 (95 %) | 1357 (5 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) |
| годы | 21883 (84 %) | 4101 (16 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) |
| фаза | 19799 (76 %) | 4697 (18 %) | 0 (0 %) | 28 (0 %) | 1460 (6 %) |
| коробка | 21569 (83 %) | 4058 (16 %) | 52 (0 %) | 41 (0 %) | 259 (1 %) |
| привод | 20319 (78 %) | 4609 (18 %) | 0 (0 %) | 300 (1 %) | 661 (3 %) |

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

Поколения только с ultimatespecs у моделей, которые autocentrum (Польша) или ADAC (Германия) знают, и поколения «вне ЕС»: **30 (0 %)** версий (колонка «Рынок»). Отдельную редкую версию, которой нет в обоих (Golf GTI Clubsport 2024, RS3 Performance Edition), так не помечаем — она «одна база». В таблице остаются; на странице и платформе их моторы не считаются существующими — уходят под черту обычным шрифтом (решение владельца 23.10).

| Марка | Версий | Например |
|---|---:|---|
| Toyota | 17 | Camry XV50 (вне ЕС): Camry 2.5; Camry XV50 (вне ЕС): Camry 2.5 Automatic; Camry XV50 (вне ЕС): Camry 2.5 SE; Camry XV50 (вне ЕС): Camry 2.5 SE Automatic; Camry  |
| Genesis | 13 | G80 G80 (DH): G80 G80 3.3 G80 3.3T; G80 G80 (DH): G80 G80 3.3 G80 3.3T HTRAC AWD; G80 G80 (DH): G80 G80 5.0 G80 5.0; G80 G80 (DH): G80 G80 5.0 G80 5.0 HTRAC AWD |

## Исправлено по ADAC

Наше значение коробки или привода было только выведено (по названию, соседней версии, правилу), а все версии ADAC с тем же мотором называют одно другое — ставится значение ADAC (решение владельца 29.10): **132** версий, прежнее значение — в колонке «ADAC: исправлено», «откуда» — «ADAC: все версии мотора». С 06.11 (решение владельца) — и там, где наше называет один источник, а в поколении такое значение больше нигде не подтверждено (не больше 3 версий, название его не говорит): Audi A1 «задний», BMW X5 E70 «механика». ADAC — рынок Германии.

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

Коробка или привод версии не подтверждены вторым источником, а все прочитанные версии ADAC с тем же мотором (страницы версий, `data/adac-details.json`) называют другое: **413 (2 %)** версий, колонка «ADAC: другое». Наше значение называет один источник — это бывает его ошибка, разница рынков (ADAC — Германия) или версия, которой ADAC не перечисляет; сами не меняются.

| Марка · модель · поколение | Что | У нас | У ADAC | Версий ADAC | Наших версий | Откуда наше | Например |
|---|---|---|---|---:|---:|---|---|
| Volkswagen Golf Golf VI | привод | полный | передний | 54 | 1 | одна база: autocentrum | Golf Variant 1.6 TDI-CR DPF |
| Mercedes-Benz Klasa V W447 | коробка | механика | автомат | 53 | 1 | одна база: autocentrum | Klasa V Ekstra Długi 250 BlueTEC |
| Volkswagen Polo Polo V | привод | полный | передний | 48 | 14 | одна база: autocentrum | Polo Hatchback 3d 1.2 TSI |
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
| Subaru Legacy Legacy V | коробка | автомат | автомат | 15 | 2 | ручная проверка | Legacy Sedan 2.5 i |
| Skoda Octavia Octavia III | привод | полный | передний | 14 | 4 | одна база: autocentrum | Octavia Liftback 1.6 TDI |
| Ford Focus Mk2 | коробка | автомат | механика | 14 | 2 | одна база: ultimatespecs | Focus 1.6 TDCi 109HP CVT Ghia Sedan |
| Seat Alhambra Alhambra II | привод | полный | передний | 14 | 1 | одна база: autocentrum | Alhambra Van 2.0 TDI |
| Ford Kuga Mk3 | коробка | механика | автомат | 14 | 1 | одна база: autocentrum | Kuga SUV 2.0 EcoBlue |
| Smart ForTwo ForTwo II | коробка | механика | автомат | 13 | 12 | одна база: autocentrum | ForTwo Cabrio 1.0 |
| Skoda Roomster Roomster | коробка | автомат | механика | 13 | 1 | одна база: autocentrum | Roomster Mikrovan 1.6 TDI CR DPF |
| Toyota RAV 4 XA40 | привод | передний | полный | 13 | 1 | одна база: autocentrum | RAV 4 MPV 2.0 Valvematic |
| Suzuki Vitara Vitara III | коробка | механика | автомат | 12 | 4 | одна база: autocentrum | Vitara SUV 2024 1.5 Strong Hybrid |
| Audi A4 B8 | привод | передний | полный | 12 | 1 | одна база: autocentrum | A4 Limousine 3.0 TDI |
| Skoda Octavia Octavia II | привод | полный | передний | 11 | 13 | одна база: autocentrum | Octavia Kombi 1.8 TSI |
| Volvo XC40 XC40 I | привод | полный | передний | 11 | 10 | одна база: ultimatespecs | XC40 T2 |
| Renault Clio Clio IV | коробка | механика | автомат | 11 | 3 | одна база: autocentrum | Clio TCe 120 |
| Mercedes-Benz Klasa C W204 | привод | полный | задний | 11 | 3 | одна база: autocentrum | Klasa C Coupe 250 BlueEFFICIENCY |
| Opel Insignia Insignia II | привод | полный | передний | 11 | 1 | одна база: autocentrum | Insignia Country Tourer 1.5 Turbo |
| Volkswagen Tiguan Tiguan I | коробка | автомат | механика | 11 | 1 | одна база: autocentrum | Tiguan SUV 1.4 TSI BlueMotion Technology |
| Volvo XC60 XC60 I | привод | передний | передний | 10 | 8 | ручная проверка | XC60 D3 Kinetic |
| Nissan Qashqai Qashqai I | коробка | автомат | механика | 10 | 4 | одна база: autocentrum | Qashqai Crossover 1.6 |
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
| Opel Corsa Corsa D | коробка | автомат | механика | 8 | 1 | одна база: autocentrum | Corsa Hatchback 3d 1.7 CDTI ECOTEC |
| Mercedes-Benz Klasa C W204 | коробка | механика | автомат | 8 | 1 | одна база: autocentrum | Klasa C Limuzyna 3.0 350 CDI BlueEFFICIE |
| Volkswagen Caddy Caddy III | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | Caddy Kombi Maxi 2.0 TDI |
| Seat Ibiza Ibiza IV | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | Ibiza Hatchback 5d 1.0 MPI |
| Mazda Mazda 2 Mazda 2 II | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | Mazda 2 Hatchback 5d 1.3 MZR |
| Audi A3 8V | привод | полный | передний | 7 | 2 | одна база: autocentrum | A3 Sportback 5d 1.6 TDI clean diesel |
| Toyota RAV 4 XA50 | коробка | автомат | механика | 7 | 2 | одна база: autocentrum | RAV 4 SUV 2.0 Dual VVT-iE |
| Volvo EX30 EX30 I | привод | задний | полный | 7 | 1 | одна база: autocentrum | EX30 I 69kWh Twin |
| KGM Rexton Rexton IV | привод | передний | полный | 7 | 1 | одна база: autocentrum | Rexton SUV 2.2 diesel |
| Genesis GV80 GV80 | привод | задний | полный | 7 | 1 | одна база: ultimatespecs | GV80 GV80 2.5 GV80 2.5T RWD |
| Peugeot 2008 2008 I | коробка | автомат | механика | 7 | 1 | одна база: autocentrum | 2008 SUV 1.6 BlueHDi |
| Volvo S60 S60 II | привод | полный | передний | 7 | 1 | одна база: autocentrum | S60 Cross Country 2.0 T5 |
| Seat Leon Leon III | привод | полный | передний | 6 | 5 | одна база: autocentrum | Leon X-Perience 1.8 TSI |
| Skoda Superb Superb II | коробка | автомат | механика | 6 | 3 | одна база: autocentrum | Superb Sedan 1.6 TDI CR DPF |
| Audi A4 B9 | коробка | механика | автомат | 6 | 2 | одна база: autocentrum | A4 Allroad 40 TDI quattro |
| Skoda Yeti Yeti | коробка | автомат | механика | 6 | 2 | одна база: autocentrum | Yeti Minivan 1.8 TSI |
| Seat Alhambra Alhambra I | коробка | автомат | механика | 6 | 2 | одна база: autocentrum | Alhambra Minivan 2.0 i |
| Mercedes-Benz CLA C178 | привод | задний | полный / передний | 6 | 2 | одна база: autocentrum | CLA Saloon 1.5 200 Mild Hybrid |
| Peugeot 308 308 I | коробка | автомат | механика | 6 | 2 | одна база: autocentrum | 308 SW 2.0 HDi FAP |
| Volkswagen Arteon Arteon | коробка | механика | автомат | 6 | 1 | одна база: autocentrum | Arteon Fastback 2.0 TDI |
| Opel Insignia Insignia I | коробка | автомат | механика | 6 | 1 | одна база: autocentrum | Insignia Sedan 2.0 CDTI ECOTEC |
| Alfa Romeo Giulia Giulia II | привод | задний | полный | 6 | 1 | одна база: autocentrum | Giulia Sedan 2.0 Turbo |
| Chevrolet Epica Epica I | коробка | автомат | механика | 6 | 1 | одна база: autocentrum | Epica I 2.0 24v |
| Ssangyong Rexton Rexton IV | привод | передний | полный | 6 | 1 | одна база: autocentrum | Rexton SUV 2.2 diesel |
| Audi A4 B8 | коробка | автомат | механика | 6 | 1 | одна база: autocentrum | A4 Limousine 2.0 TDI |
| Mercedes-Benz Klasa E W212 | коробка | механика | автомат | 6 | 1 | одна база: autocentrum | Klasa E Limuzyna 200 NGT BlueEFFICIENCY |
| Volvo V40 V40 II | коробка | механика | автомат | 6 | 1 | одна база: autocentrum | V40 Hatchback 2.5 T5 |
| Volvo XC60 XC60 I | привод | полный | передний | 6 | 1 | одна база: autocentrum | XC60 SUV 3.2 |
| Peugeot Traveller Traveller | коробка | автомат | механика | 5 | 10 | одна база: autocentrum | Traveller Standard 1.6 BlueHDi |
| Citroen SpaceTourer SpaceTourer | коробка | автомат | механика | 5 | 7 | одна база: autocentrum | SpaceTourer Van M 1.5 BlueHDi |
| Renault Megane Mégane III | коробка | автомат | механика | 5 | 7 | одна база: autocentrum | Megane Hatchback 1.4 16v TCe |
| Volkswagen Passat B6 | привод | передний | полный | 5 | 6 | подтверждено: EPA + autocentrum | Passat Advance 2.0 FSI 150HP Variant |
| … ещё 104 | | | | | | | |

## Официальные реестры (этап 27)

**EEA** — реестр ЕС новых легковых машин (CO2 monitoring, 2010–2025): каждая машина, зарегистрированная новой в стране ЕС, с маркой, названием, топливом, см³ и кВт (`data/eea-registrations.json`, `tools/eea_import.py`; строка одной страны и одного года не берётся — это ошибки ввода). Мотор версии есть в реестре в её годы (см³ ± 30, кВт ± 2): **22326 (86 %)** версий; такая версия продавалась в ЕС и с пометки «нет в Польше и Германии» снимается.

**EPA** — реестр США (fueleconomy.gov, все версии с 2000 года): коробка и привод (`data/epa-vehicles.json`, `tools/epa_import.py`). Подтверждает, только когда все версии США той модели, объёма, топлива и лет говорят одно и то же — наше; другое значение США ошибкой не считается (в США продают меньше вариантов: A3 1.8 TFSI там только автомат). Коробка: **3460 (13 %)**, привод: **2729 (11 %)** версий. На исправления по ADAC EPA не влияет.

### США говорят другое, а наше не подтверждено (проверить)

Наше значение — один источник или вывод, а все версии США того же мотора — другое: **169** версий. Часто это разница рынков, но бывает и наша ошибка (Audi RS3 «передний» — RS3 всегда полный).

| Марка · модель · поколение | Что | У нас | В США | Версий | Например |
|---|---|---|---|---:|---|
| Audi A3 8V | коробка | механика | автомат | 21 | A3 S3 2.0 TFSI 310HP Quattro |
| BMW Seria 3 E90 | коробка | механика | автомат | 15 | E90 325d |
| Smart ForTwo ForTwo II | коробка | механика | автомат | 12 | ForTwo Cabrio 1.0 |
| Audi A3 8V | привод | полный | передний | 9 | A3 Ambiente 1.8 TFSI Quattro Sportback |
| Audi Q5 8R | коробка | механика | автомат | 7 | Q5 2.0 TFSI 225HP Quattro Advance |
| Jeep Commander Commander I | коробка | механика | автомат | 6 | Commander I 3.7 i V6 2WD |
| Audi A6 C6 | коробка | механика | автомат | 4 | A6 3.2 FSI Quattro |
| BMW X3 E83 | привод | задний | полный | 4 | E83 X3 2.5i |
| Audi TT 8J | коробка | механика | автомат | 4 | TT Coupe 2.0 TFSI |
| Chevrolet Captiva Captiva II | привод | полный | передний | 4 | Captiva SUV 2.4 DOHC |
| BMW Seria 3 F30 | коробка | механика | автомат | 3 | F34 318d GT |
| Volvo XC90 XC90 I | коробка | механика | автомат | 3 | XC90 2.5T |
| Volkswagen Passat B6 | коробка | механика | автомат | 3 | Passat R36 |
| Jeep Grand Cherokee Grand Cherokee III | коробка | механика | автомат | 3 | Grand Cherokee III 3.7 i V6 4WD |
| BMW Seria 5 F10 | коробка | механика | автомат | 3 | Seria 5 Touring M550d |
| Audi A5 F5 | коробка | механика | автомат | 2 | A5 Coupe 35 TFSI |
| BMW Seria 3 G20 | коробка | механика | автомат | 2 | G20 318i |
| Mercedes-Benz Klasa S W222 | привод | задний | полный | 2 | S 63 AMG Coupe |
| Mercedes-Benz AMG GT C190 | привод | полный | задний | 2 | AMG GT Coupe 4d 4.0 63 |
| Mercedes-Benz Klasa CL W216 | привод | задний | полный | 2 | Klasa CL Coupe 500 4MATIC BlueEFFICIENCY |
| Jeep Cherokee Cherokee V | коробка | механика | автомат | 2 | Cherokee Terenowy 2.4 |
| Mini Paceman Paceman | привод | передний | полный | 2 | Paceman Hatchback 3d 1.6 |
| Alfa Romeo Giulia Giulia II | привод | полный | задний | 2 | Giulia Sedan 2023 2.9 GME Bi-Turbo |
| Chevrolet Cruze Cruze | коробка | механика | автомат | 2 | Cruze Sedan 2.0 TD |
| Subaru Impreza Impreza III | привод | передний | полный | 2 | Impreza Hatchback 2.0 i |
| Genesis G90 G90 (RS4) | привод | задний | полный | 2 | G90 G90 SWB 3.5 G90 3.5T V6 e-S/C Automa |
| Toyota Camry XV40 (вне ЕС) | коробка | механика | автомат | 2 | Camry VI 3.5 i V6 VVT-i |
| Toyota Corolla E21 | привод | передний | полный | 2 | Corolla Sedan 1.6 Valvematic Dual VVT-i |
| Volkswagen Passat B8 | коробка | механика | автомат | 2 | Passat Limousine 2.0 TSI BlueMotion Tech |
| Hyundai Tucson Tucson IV | привод | передний | полный | 2 | Tucson SUV 1.6 1.6 T-GDI PHEV Select Aut |
| Audi A3 8P | коробка | механика | автомат | 1 | A3 3.2 V6 Quattro |
| Audi A6 C6 | привод | передний | полный | 1 | A6L 3.0 |
| Mercedes-Benz Klasa S W223 | коробка | механика | автомат | 1 | Maybach S 680 4MATIC |
| Mercedes-Benz Klasa S W222 | привод | полный | задний | 1 | Mercedes-Maybach S 650 4MATIC |
| Ford EcoSport EcoSport II | коробка | механика | автомат | 1 | EcoSport SUV 1.0 EcoBoost |
| Ford Explorer Explorer V | привод | полный | передний | 1 | Explorer V R4 2.0 EcoBoost |
| Volvo S80 S80 II | коробка | механика | автомат | 1 | S80 Sedan 2.5 T |
| Volvo S90 S90 II | привод | передний | полный | 1 | S90 Sedan 2.0 B5 Benzynowy Mild Hybrid |
| Kia Optima Optima I | коробка | механика | автомат | 1 | Optima Sedan 2.0 DOHC |
| Hyundai Elantra Elantra VII | коробка | механика | автомат | 1 | Elantra Sedan 1.6 mpi |
| Hyundai Kona Kona II | коробка | механика | автомат | 1 | Kona Crossover 1.6 T-GDI |
| Mazda CX-7 CX-7 | коробка | механика | автомат | 1 | CX-7 SUV 2.3 |
| Honda CR-V CR-V III | коробка | механика | автомат | 1 | CR-V SUV 2.4 i-VTEC |
| Land Rover Range Rover Evoque Range Rover Evoque I | коробка | механика | автомат | 1 | Range Rover Evoque SUV Coupe 2.0 Si4 |
| Lexus LS LS IV | привод | задний | полный | 1 | LS Sedan 600h |
| Lexus IS IS II | коробка | механика | автомат | 1 | IS Sedan F |
| Porsche Panamera Panamera I | коробка | механика | автомат | 1 | Panamera Liftback 3.0 V6 |
| Mitsubishi Outlander Outlander II | коробка | механика | автомат | 1 | Outlander II 3.0 i V6 24V XL |
| Mitsubishi Galant Galant IX | коробка | механика | автомат | 1 | Galant IX 2.4 i 16V MIVEC |
| Mini Countryman U25 | привод | передний | полный | 1 | Countryman SUV Electric Elektryczny 66.5 |
| Dodge Journey Journey I | коробка | механика | автомат | 1 | Journey I 2.4 |
| Dodge RAM RAM IV | привод | полный | задний | 1 | RAM IV 3.7 V6 |
| Chevrolet Malibu Malibu VI | коробка | механика | автомат | 1 | Malibu VI 2.4 H |
| Subaru Forester Forester III | коробка | механика | автомат | 1 | Forester III 2.0 |
| Subaru Solterra Solterra I | привод | передний | полный | 1 | Solterra I 71.4 kWh |
| Maserati Granturismo Granturismo I | коробка | механика | автомат | 1 | Granturismo I 4.7 i |
| VinFast VF7 VF 7 | привод | передний | полный | 1 | VF7 VF 7 VF 7 Eco FWD |
| Audi A6 C7 | привод | задний | полный | 1 | A6 S6 Limousine 4.0 tfsi |
| BMW X1 E84 | коробка | механика | автомат | 1 | X1 Crossover xDrive28i |
| BMW X3 F25 | коробка | механика | автомат | 1 | X3 SUV 2.0 28i |

### Мягкий гибрид по реестру ЕС (проверить)

Реестр ЕС пишет гибриды отдельно (fuel mode H), мягкие тоже — чаще 48 В; 12-вольтовые страны часто пишут как обычный бензин / дизель. Сами не меняются: от этого зависит акциз.

Реестр — гибрид (в 3 странах и больше), у нас не мягкий гибрид: **27** версий; у нас мягкий гибрид, реестр — обычный: **67** версий.

| Что | Марка · модель · поколение | Версий | Например |
|---|---|---:|---|
| реестр — гибрид, у нас нет | BMW Seria 7 G11-G12 | 6 | Seria 7 Sedan 3.0 730d |
| реестр — гибрид, у нас нет | BMW Seria 6 G32 | 3 | Seria 6 Gran Turismo 3.0 640i |
| реестр — гибрид, у нас нет | Mercedes-Benz AMG GT C190 | 3 | AMG GT Coupe 4d 43 3.0 |
| реестр — гибрид, у нас нет | Mercedes-Benz GLE V167 | 2 | GLE 580 4Matic |
| реестр — гибрид, у нас нет | Mercedes-Benz CLS C257 | 2 | CLS Coupe 2.0 350 |
| реестр — гибрид, у нас нет | Mercedes-Benz GLS X167 | 2 | GLS SUV 3.0 450 |
| реестр — гибрид, у нас нет | Kia Stonic Stonic II | 2 | Stonic II 1.0 T-GDI |
| реестр — гибрид, у нас нет | Mercedes-Benz GLE V167 Coupé (C167) | 1 | GLE Coupe 63 AMG 4MATIC+ |
| реестр — гибрид, у нас нет | BMW X7 X7 | 1 | X7 SUV 3.0 40i |
| реестр — гибрид, у нас нет | Citroen C4 X C4 X | 1 | C4 X Crossover 1.2 Hybrid |
| реестр — гибрид, у нас нет | Subaru Crosstrek Crosstrek I | 1 | Crosstrek I 2.0 i s e boxer |
| реестр — гибрид, у нас нет | Volvo V60 V60 I | 1 | V60 Kombi 2.4 D4 |
| реестр — гибрид, у нас нет | Mercedes-Benz Klasa V W447 | 1 | Klasa V Van 2.0 V 300 lang 9G-TRONIC |
| реестр — гибрид, у нас нет | Mercedes-Benz Vito W447 | 1 | Vito Van 2.0 Tourer lang 124 9G-TRONIC |
| у нас MHEV, реестр — обычный | Audi A5 F5 | 30 | A5 Cabriolet 40 TDI 190HP |
| у нас MHEV, реестр — обычный | Mercedes-Benz Klasa S W223 | 7 | S 350d |
| у нас MHEV, реестр — обычный | Audi A4 B9 | 5 | A4 40 TDI quattro S tronic |
| у нас MHEV, реестр — обычный | Toyota Hilux Hilux VIII | 4 | Hilux Podwójna kabina 2024 2.8 D-4D |
| у нас MHEV, реестр — обычный | BMW X3 G01 | 2 | X3 M40d |
| у нас MHEV, реестр — обычный | BMW X4 G02 | 2 | X4 M SUV M40d |
| у нас MHEV, реестр — обычный | Volvo S90 S90 II | 2 | S90 Sedan 2.0 B4 Benzynowy Mild Hybrid |
| у нас MHEV, реестр — обычный | Mazda CX-3 CX-3 | 2 | CX-3 Crossover 2.0 Skyactiv-G M Hybrid |
| у нас MHEV, реестр — обычный | Volvo XC40 XC40 I | 2 | XC40 SUV 2.0 D3 Polestar Performance Gea |
| у нас MHEV, реестр — обычный | BMW Seria 1 F70 | 1 | 1 Series 120d Steptronic DKG |
| у нас MHEV, реестр — обычный | BMW X5 G05 | 1 | X5 xDrive40i |
| у нас MHEV, реестр — обычный | Audi Q8 SQ8 | 1 | Q8 SQ8 4.0 TFSI |
| у нас MHEV, реестр — обычный | Audi Q8 Q8 | 1 | Q8 SQ8 4.0 tfsi |
| у нас MHEV, реестр — обычный | BMW Seria 2 F74 | 1 | Seria 2 Gran Coupe 2.0 220d Mild Hybrid |
| у нас MHEV, реестр — обычный | BMW X6 G06 | 1 | X6 SUV 3.0 40i |
| у нас MHEV, реестр — обычный | Volvo V90 V90 II | 1 | V90 Kombi 2.0 B4 Benzynowy Mild Hybrid |
| у нас MHEV, реестр — обычный | Fiat Panda Panda III | 1 | Panda VAN 0.9 TWINAIR |
| у нас MHEV, реестр — обычный | BAIC BJ60 BJ60 I | 1 | BJ60 SUV 2.0 2.0T Flagship 4x4 AT |
| у нас MHEV, реестр — обычный | Kia ProCeed ProCeed | 1 | ProCeed Hatchback 1.6 Ceed 1.6 CRDi 48V  |
| у нас MHEV, реестр — обычный | Citroen C3 C3 IV | 1 | C3 SUV 1.2 Hybrid 110 You e-DCS |

### В реестре ЕС, а у нас такой модели нет

Названия наших марок, зарегистрированные новыми в 10 странах и больше, которые не легли ни на одну нашу модель: **104** (часть — версии под своим названием: GR Yaris, John Cooper Works, кемперы).

| Марка | Название в реестре | Стран | Годы |
|---|---|---:|---|
| Mercedes-Benz | EQC 400 4MATIC | 30 | 2019–2025 |
| Volkswagen | KOMBI | 29 | 2010–2025 |
| Audi | RS E-TRON GT | 28 | 2021–2025 |
| Toyota | 86 | 28 | 2012–2022 |
| Volvo | EC40 | 28 | 2024–2025 |
| Volvo | EX40 | 28 | 2024–2025 |
| Fiat | FIAT DOBLÃŠ | 26 | 2012–2013 |
| Porsche | 718 SPYDER RS | 26 | 2023–2025 |
| Fiat | TALENTO | 25 | 2016–2021 |
| Mercedes-Benz | MAYBACH GLS 600 | 25 | 2023–2025 |
| BMW | X REIHE | 24 | 2010–2021 |
| BYD | ATTO 3 | 24 | 2022–2025 |
| Maserati | GRECALE TROFEO | 24 | 2022–2025 |
| Renault | RENAULT 5 E-TECH ELECTRIC | 24 | 2024–2025 |
| Audi | SQ6 SUV E-TRON | 23 | 2024–2025 |
| Maserati | GRECALE GT | 23 | 2022–2025 |
| Mercedes-Benz | MARCO POLO | 23 | 2014–2025 |
| Subaru | WRX | 23 | 2014–2022 |
| Chevrolet | CORVETTE | 22 | 2010–2025 |
| Honda | FR-V | 22 | 2010–2017 |
| Maserati | GRECALE FOLGORE | 22 | 2023–2025 |
| Leapmotor | T03 | 21 | 2023–2025 |
| MG | MG S5 EV | 21 | 2025–2025 |
| Maserati | GRECALE MODENA | 21 | 2022–2025 |
| Maserati | MC20 | 21 | 2021–2025 |
| Mazda | MAZDA 6E | 21 | 2025–2025 |
| Mercedes-Benz | MERCEDES-AMG GT R | 21 | 2019–2024 |
| Renault | RENAULT 4 E-TECH ELECTRIC | 21 | 2025–2025 |
| Alfa Romeo | ALFA ROMEO SPORT WAGON | 20 | 2010–2013 |
| Leapmotor | B10 | 20 | 2025–2025 |
| MG | MG EHS PLUG-IN HYBRID | 20 | 2021–2025 |
| Mercedes-Benz | MERCEDES-AMG GT C | 20 | 2019–2024 |
| Audi | SQ6 SB E-TRON | 18 | 2025–2025 |
| Citroen | C2 | 18 | 2010–2018 |
| Ford | TOURNEO | 18 | 2010–2025 |
| MG | MG5 ELECTRIC | 18 | 2021–2025 |
| Maserati | MC20 CIELO | 18 | 2023–2025 |
| Mercedes-Benz | MAYBACH EQS 680 | 18 | 2023–2025 |
| Alfa Romeo | ALFA SPIDER | 17 | 2010–2015 |
| Alpine | A290 | 17 | 2024–2025 |
| Audi | S E-TRON GT | 17 | 2024–2025 |
| Hyundai | GETZ | 17 | 2010–2021 |
| Audi | RS E-TRON GT PERFORMANCE | 16 | 2024–2025 |
| BYD | HAN | 16 | 2022–2025 |
| Smart | #1 | 16 | 2022–2025 |
| Subaru | JUSTY | 16 | 2010–2023 |
| Audi | A8L | 15 | 2010–2020 |
| BMW | ACTIVEHYBRID 7 | 15 | 2010–2015 |
| BMW | Z REIHE | 15 | 2010–2016 |
| DFSK | DFSK E5 | 15 | 2024–2025 |
| JAECOO | JAECOO7 PHEV | 15 | 2025–2025 |
| Mercedes-Benz | EQT | 15 | 2023–2025 |
| Mercedes-Benz | MAYBACH SL 680 | 15 | 2024–2025 |
| OMODA | OMODA5 | 15 | 2023–2025 |
| Audi | AUDI A8L | 14 | 2010–2017 |
| BMW | ACTIVEHYBRID 5 | 14 | 2012–2017 |
| Chevrolet | LACETTI | 14 | 2010–2012 |
| DS | N 4 | 14 | 2025–2025 |
| Hyundai | TUCSONIX35 | 14 | 2013–2025 |
| JAECOO | JAECOO7 | 14 | 2024–2025 |
| Mercedes-Benz | MERCEDES-AMG GT | 14 | 2019–2023 |
| Nissan | NISSAN NV300 | 14 | 2016–2023 |
| OMODA | OMODA5 EV | 14 | 2024–2025 |
| Opel | TIGRA | 14 | 2010–2012 |
| Peugeot | 607 | 14 | 2010–2012 |
| Porsche | 991 CARRERA T | 14 | 2018–2024 |
| Seat | CORDOBA | 14 | 2010–2015 |
| Smart | #5 | 14 | 2024–2025 |
| Alpine | A110R | 13 | 2024–2025 |
| Cadillac | XT4 | 13 | 2019–2025 |
| MG | MG MARVEL R ELECTRIC | 13 | 2021–2025 |
| Mini | JOHNCOOPERWORKS ROADSTER | 13 | 2012–2016 |
| Opel | GT | 13 | 2010–2015 |
| Peugeot | 4008 | 13 | 2012–2025 |
| Porsche | 918 SPYDER | 13 | 2014–2021 |
| BMW | M COUPE | 12 | 2010–2014 |
| Cadillac | ATS | 12 | 2013–2022 |
| DFSK | 580 | 12 | 2018–2025 |
| Infiniti | INFINITI Q30S | 12 | 2016–2020 |
| Mercedes-Benz | ELECTRIC DRIVE | 12 | 2014–2018 |

## По источнику строки

| Источник строки | Версий | Мотор подтверждён | Годы подтверждены |
|---|---:|---:|---:|
| autocentrum | 14268 | 13148 (92 %) | 11135 (78 %) |
| ultimatespecs | 11133 | 10995 (99 %) | 10249 (92 %) |
| adac | 583 | 467 (80 %) | 499 (86 %) |

## По маркам

Доля версий марки с подтверждённым значением (два источника).

| Марка | Моделей | Версий | Мотор | Годы | Фаза | Коробка | Привод |
|---|---:|---:|---:|---:|---:|---:|---:|
| Volkswagen | 30 | 2565 | 97 % | 71 % | 69 % | 76 % | 70 % |
| Mercedes-Benz | 38 | 2468 | 95 % | 85 % | 90 % | 89 % | 82 % |
| BMW | 26 | 2309 | 97 % | 98 % | 88 % | 87 % | 86 % |
| Audi | 18 | 2259 | 98 % | 98 % | 93 % | 92 % | 91 % |
| Ford | 32 | 1743 | 94 % | 86 % | 81 % | 79 % | 75 % |
| Renault | 26 | 1505 | 97 % | 81 % | 78 % | 77 % | 75 % |
| Peugeot | 24 | 1290 | 97 % | 92 % | 80 % | 82 % | 78 % |
| Volvo | 20 | 1243 | 98 % | 98 % | 76 % | 93 % | 80 % |
| Opel | 18 | 1119 | 98 % | 85 % | 86 % | 85 % | 79 % |
| Skoda | 15 | 1067 | 97 % | 97 % | 83 % | 88 % | 82 % |
| Toyota | 32 | 738 | 88 % | 78 % | 68 % | 77 % | 72 % |
| Fiat | 25 | 664 | 93 % | 61 % | 60 % | 65 % | 64 % |
| Citroen | 28 | 649 | 96 % | 79 % | 61 % | 85 % | 83 % |
| Kia | 26 | 570 | 95 % | 95 % | 72 % | 85 % | 77 % |
| Seat | 10 | 535 | 97 % | 69 % | 77 % | 89 % | 82 % |
| Hyundai | 26 | 534 | 93 % | 84 % | 79 % | 86 % | 81 % |
| Porsche | 7 | 396 | 95 % | 100 % | 71 % | 80 % | 70 % |
| Mazda | 18 | 359 | 93 % | 90 % | 80 % | 93 % | 90 % |
| Nissan | 27 | 353 | 86 % | 73 % | 62 % | 82 % | 77 % |
| Mini | 8 | 324 | 96 % | 80 % | 57 % | 91 % | 91 % |
| Land Rover | 8 | 311 | 90 % | 73 % | 76 % | 73 % | 70 % |
| Dacia | 8 | 267 | 95 % | 88 % | 91 % | 88 % | 86 % |
| Jaguar | 8 | 198 | 92 % | 100 % | 58 % | 90 % | 79 % |
| Alfa Romeo | 11 | 187 | 96 % | 56 % | 9 % | 74 % | 72 % |
| Chevrolet | 18 | 181 | 72 % | 42 % | 47 % | 66 % | 70 % |
| Mitsubishi | 11 | 175 | 86 % | 66 % | 50 % | 68 % | 66 % |
| Honda | 17 | 174 | 87 % | 89 % | 38 % | 79 % | 72 % |
| Jeep | 9 | 174 | 86 % | 60 % | 55 % | 75 % | 59 % |
| Suzuki | 14 | 172 | 86 % | 47 % | 47 % | 53 % | 55 % |
| Ssangyong | 9 | 135 | 54 % | 60 % | 53 % | 53 % | 45 % |
| Lexus | 14 | 133 | 78 % | 68 % | 39 % | 90 % | 72 % |
| Subaru | 12 | 118 | 85 % | 72 % | 28 % | 53 % | 65 % |
| KGM | 6 | 107 | 90 % | 57 % | 16 % | 25 % | 23 % |
| DS | 7 | 88 | 90 % | 100 % | 64 % | 86 % | 80 % |
| Cupra | 7 | 78 | 91 % | 96 % | 96 % | 88 % | 84 % |
| Chrysler | 7 | 75 | 41 % | 21 % | 18 % | 41 % | 37 % |
| Genesis | 6 | 72 | 54 % | 26 % | 0 % | 91 % | 48 % |
| Infiniti | 12 | 70 | 80 % | 24 % | 21 % | 68 % | 37 % |
| Dodge | 10 | 62 | 61 % | 14 % | 22 % | 69 % | 51 % |
| Smart | 3 | 58 | 100 % | 86 % | 100 % | 72 % | 48 % |
| Lancia | 6 | 55 | 89 % | 25 % | 47 % | 80 % | 70 % |
| Tesla | 4 | 48 | 81 % | 100 % | 100 % | 100 % | 66 % |
| Cadillac | 5 | 36 | 55 % | 63 % | 69 % | 50 % | 47 % |
| Isuzu | 1 | 34 | 55 % | 20 % | 0 % | 29 % | 26 % |
| Abarth | 2 | 30 | 100 % | 6 % | 6 % | 60 % | 60 % |
| Maserati | 5 | 30 | 100 % | 56 % | 80 % | 93 % | 93 % |
| MG | 6 | 25 | 84 % | 88 % | 52 % | 72 % | 60 % |
| Polestar | 5 | 21 | 71 % | 76 % | 0 % | 90 % | 76 % |
| BYD | 8 | 20 | 95 % | 100 % | 85 % | 90 % | 85 % |
| XPENG | 3 | 16 | 93 % | 62 % | 0 % | 93 % | 93 % |
| NIO | 5 | 13 | 100 % | 100 % | 0 % | 100 % | 100 % |
| DFSK | 8 | 12 | 75 % | 41 % | 0 % | 33 % | 33 % |
| GWM | 6 | 12 | 58 % | 66 % | 0 % | 58 % | 58 % |
| VinFast | 4 | 12 | 75 % | 33 % | 0 % | 100 % | 91 % |
| Leapmotor | 1 | 10 | 40 % | 100 % | 100 % | 10 % | 0 % |
| Lucid | 1 | 10 | 50 % | 100 % | 0 % | 100 % | 40 % |
| Zeekr | 3 | 10 | 50 % | 40 % | 0 % | 50 % | 50 % |
| Maxus | 6 | 9 | 100 % | 88 % | 0 % | 100 % | 33 % |
| Alpine | 1 | 8 | 87 % | 100 % | 100 % | 87 % | 87 % |
| BAIC | 6 | 8 | 75 % | 0 % | 0 % | 0 % | 0 % |
| Geely | 2 | 6 | 0 % | 0 % | 0 % | 0 % | 0 % |
| JAECOO | 2 | 6 | 83 % | 100 % | 100 % | 83 % | 66 % |
| Hongqi | 3 | 5 | 20 % | 0 % | 0 % | 0 % | 0 % |
| OMODA | 2 | 5 | 40 % | 40 % | 100 % | 20 % | 20 % |
| Seres | 2 | 5 | 80 % | 100 % | 0 % | 80 % | 80 % |
| INEOS | 1 | 4 | 100 % | 100 % | 0 % | 100 % | 100 % |
| Lynk&Co | 3 | 4 | 75 % | 25 % | 0 % | 50 % | 50 % |
| Aiways | 1 | 3 | 100 % | 0 % | 0 % | 100 % | 100 % |
| ORA | 1 | 2 | 100 % | 0 % | 0 % | 100 % | 100 % |
