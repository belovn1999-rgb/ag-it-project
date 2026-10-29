# Справочник моделей — насколько подтверждены данные

Сгенерировано `tools/confirm.py` (2026-10-29) из `data/model-engines.csv`. Этап B61 п. 16 (`docs/PROJECT-MODELS.md`). **Подтверждено** — два независимых источника согласны (решение владельца 23.10): autocentrum.pl, ultimatespecs.com, каталог ADAC, Википедия. **Одна база** — значение есть только в одном источнике. **Правило** — электро и гибрид всегда с автоматом, модель только 4x4. **Вывод** — значение вычислено («механика, раз есть такая же с автоматом», «привод как у модели»). На странице пока ничего не меняется.

Версий в таблице: 25884.

| Поле | Подтверждено | Одна база | Правило | Вывод | Нет |
|---|---:|---:|---:|---:|---:|
| мотор | 21570 (83 %) | 4314 (17 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) |
| годы | 20284 (78 %) | 5600 (22 %) | 0 (0 %) | 0 (0 %) | 0 (0 %) |
| фаза | 19522 (75 %) | 4874 (19 %) | 0 (0 %) | 28 (0 %) | 1460 (6 %) |
| коробка | 19137 (74 %) | 6360 (25 %) | 63 (0 %) | 65 (0 %) | 259 (1 %) |
| привод | 18153 (70 %) | 6550 (25 %) | 0 (0 %) | 455 (2 %) | 726 (3 %) |

**Фаза (дорест / рест)** подробно — источники года рестайлинга или «без рестайлинга»:

| Чем подтверждено | Версий |
|---|---:|
| adac + autocentrum + ultimatespecs | 6991 |
| adac + autocentrum | 5817 |
| autocentrum | 2284 |
| adac + autocentrum (без рестайлинга) | 2247 |
| adac + autocentrum (год есть, версии не разделены) | 1543 |
| adac + Википедия (год есть, версии не разделены) | 1529 |
| нет данных о рестайлинге | 1460 |
| Википедия (год есть, версии не разделены) | 1023 |
| adac (год есть, версии не разделены) | 881 |
| adac + ultimatespecs | 460 |
| autocentrum + ultimatespecs | 381 |
| adac | 286 |
| autocentrum (год есть, версии не разделены) | 197 |
| adac + ultimatespecs + Википедия (год есть, версии не разделены) | 195 |
| adac + autocentrum + Википедия (без рестайлинга) | 178 |
| adac (без рестайлинга) | 172 |
| autocentrum + Википедия (без рестайлинга) | 99 |
| ultimatespecs + Википедия (год есть, версии не разделены) | 62 |
| ultimatespecs | 31 |
| вывод: год рестайлинга без источника | 28 |
| adac + ultimatespecs (год есть, версии не разделены) | 18 |
| adac + autocentrum + ultimatespecs + Википедия (год есть, версии не разделены) | 2 |

## Каталог ADAC (этап 17)

Версий, у которых в ADAC (рынок Германии, данные производителя) нашлась та же версия — тот же вид топлива, мощность ± 3 л. с., объём ± 0,1 л, в продаже в те же годы: **18043 (70 %)**; пара — в колонке «ADAC: версия» (`data/model-engines.csv`). Страницы поколений — `data/adac-versions.json` (`tools/collect-adac-versions.py`).

## Нет в Польше и Германии (этап 20)

Поколения только с ultimatespecs у моделей, которые autocentrum (Польша) или ADAC (Германия) знают, и поколения «вне ЕС»: **34 (0 %)** версий (колонка «Рынок»). Отдельную редкую версию, которой нет в обоих (Golf GTI Clubsport 2024, RS3 Performance Edition), так не помечаем — она «одна база». В таблице остаются; на странице и платформе их моторы не считаются существующими — уходят под черту обычным шрифтом (решение владельца 23.10).

| Марка | Версий | Например |
|---|---:|---|
| Toyota | 17 | Camry XV50 (вне ЕС): Camry 2.5; Camry XV50 (вне ЕС): Camry 2.5 Automatic; Camry XV50 (вне ЕС): Camry 2.5 SE; Camry XV50 (вне ЕС): Camry 2.5 SE Automatic; Camry  |
| Genesis | 17 | G80 G80 (DH): G80 G80 3.3 G80 3.3T; G80 G80 (DH): G80 G80 3.3 G80 3.3T HTRAC AWD; G80 G80 (DH): G80 G80 3.8 G80 3.8; G80 G80 (DH): G80 G80 3.8 G80 3.8 HTRAC AWD |

## ADAC говорит другое (проверить)

Коробка или привод версии не подтверждены вторым источником, а страница её пары в ADAC (`data/adac-details.json`) называет другие: **845 (3 %)** версий, колонка «ADAC: другое». Сами не меняются: пара ADAC — одна из версий с тем же мотором, у мотора бывает и механика, и автомат, и передний, и полный привод.

| Марка | Версий | Например |
|---|---:|---|
| Volvo | 80 | S60 S60 III S60 T8 Polestar Engineered (автомат, передний); V40 V40 II V40 Cross Country D3 Kinetic (механика, полный); V40 V40 II V40 Cross Country D3 Kinetic G (автомат, полный); V40 V40 II V40 Cross Country D3 Momentu |
| BMW | 77 | Seria 3 G20 G20 318i (механика, задний); Seria 3 G20 G21 318i Touring (механика, задний); Seria 4 G22 420i Gran Coupe (механика, задний); Seria 4 G22 430i Gran Coupe (механика, задний); Seria 4 G22 430i xDrive Gran Coupe |
| Porsche | 61 | 911 992 911 Targa 3.0 (автомат, полный); 911 992 911 Targa S 3.0 (автомат, полный); 911 992 911 Targa S 3.0 (механика, полный); 911 992 911 Carrera 4S 3.0 (автомат, полный); 911 992 911 Carrera 4S 3.0 (механика, полный); |
| Seat | 59 | Alhambra Alhambra II Alhambra Van 2.0 TDI (автомат, полный); Alhambra Alhambra I Alhambra Minivan 2.0 i (автомат, передний); Alhambra Alhambra I Alhambra Minivan 2.0 TDI (автомат, ); Altea Altea Altea Freetrack 1.4 TSI ( |
| Mercedes-Benz | 56 | Klasa E W213 E 300 d 4MATIC Coupe (автомат, полный); CLA C178 CLA Coupe 200 EQ (автомат, передний); CLA C178 CLA Coupe 250 EQ (автомат, передний); CLA C178 CLA Coupe 250+ EQ (автомат, передний); CLA C178 CLA Shooting Bra |
| Volkswagen | 56 | Passat B6 Passat Advance 2.0 FSI 150HP V (механика, передний); Passat B6 Passat Advance 2.0 FSI 150HP T (автомат, передний); Passat B6 Passat Highline 2.0 FSI 150HP  (механика, передний); Passat B6 Passat Highline 2.0 FS |
| Renault | 54 | Clio Clio IV Clio TCe 120 (механика, передний); Clio Clio IV Clio Sport Tourer TCe 120 (механика, передний); Clio Clio III Clio  1.6 16v Luxe Privilege (механика, передний); Clio Clio III Clio  1.5 dCi 85HP Exception e ( |
| Audi | 51 | A3 8V A3 2.0 TFSI 190HP (механика, передний); A3 8V A3 2.0 TFSI 190HP S-tronic (автомат, передний); A3 8V A3 Cabrio 2.0 TFSI 190HP (механика, передний); A3 8V A3 Cabrio 2.0 TFSI 190HP S-tro (автомат, передний); A3 8V A3  |
| Skoda | 43 | Octavia Octavia III Octavia RS 2.0 TDI DSG-6 (автомат, передний); Octavia Octavia III Octavia Combi RS 2.0 TDI DSG-6 (автомат, передний); Octavia Octavia I Octavia Kombi 1.6 MPI (автомат, передний); Octavia Octavia I Oct |
| Citroen | 41 | Berlingo Berlingo I Berlingo I 1.6 HDi (механика, полный); C3 C3 II C3 Hatchback 1.4 HDi (автомат, передний); C3 C3 II C3 Hatchback 1.4 VTI (автомат, передний); C3 C3 I C3 Hatchback 1.4 i (автомат, передний); C3 C3 I C3  |
| Peugeot | 32 | 208 208 I 208 3-door Active 1.4 e-HDi 68 (автомат (робот), передний); 208 208 I 208 5-door Active 1.4 e-HDi 68 (автомат (робот), передний); 2008 2008 II 2008 1.5 BlueHDI 100 Auto (автомат, передний); 407 407 407 Coupe 2. |
| Opel | 29 | Adam Adam Adam Hatchback Rocks 1.4 ECOTE (автомат, передний); Adam Adam Adam Hatchback 1.4 (автомат, передний); Astra Astra K Astra Sports Tourer 1.0 Turbo (автомат, передний); Astra Astra K Astra Hatchback 5d 1.0 Turbo  |
| Ford | 22 | Focus Mk2 Focus 1.6 TDCi 109HP CVT Ghia  (автомат, передний); Focus Mk2 Focus 1.6 TDCi 109HP Auto Ghia (автомат, передний); Kuga Mk2 Kuga 2.0 TDCi 120HP 4x2 Titani (автомат, передний); Kuga Mk2 Kuga 2.0 TDCi 120HP 4x2 Tr |
| Toyota | 22 | Hilux Hilux VII Hilux Podwójna kabina 3.0 D-4D (автомат, задний); Hilux Hilux VII Hilux Podwójna kabina 3.0 D-4D (механика, задний); Land Cruiser Land Cruiser IV Land Cruiser IV 4.0 V6 (механика, полный); Verso Verso Ver |
| Mazda | 19 | Mazda 2 Mazda 2 IV Mazda 2 IV 1.5 hybrid (автомат, передний); Mazda 2 Mazda 2 III Mazda 2 Hatchback 5d 1.5 SKY-G (автомат, передний); Mazda 2 Mazda 2 II Mazda 2 Hatchback 5d 1.3 MZR (автомат, передний); Mazda 2 Mazda 2 I |
| Nissan | 14 | GT-R GT-R GT-R Coupe 3.8 (механика, полный); Primastar Primastar I Primastar I 2.0 dCi (автомат, передний); Qashqai Qashqai II Qashqai Crossover 1.6 dCi (механика, полный); Qashqai Qashqai I Qashqai Crossover 1.6 (автома |
| Alfa Romeo | 14 | Giulia Giulia II Giulia Sedan 2.0 Turbo (автомат, задний); Giulia Giulia II Giulia Sedan 2.2 JtdM-2 (механика, задний); Brera Brera Brera Spider 3.2 JTS 24v (автомат, полный); Brera Brera Brera Spider 2.4 JTDM 20v (механ |
| Chevrolet | 14 | Camaro Camaro VI Camaro Coupe 2.0 Turbo (механика, задний); Camaro Camaro VI Camaro Cabrio 2.0 Turbo (механика, задний); Captiva Captiva II Captiva SUV 2.4 DOHC (автомат, полный); Captiva Captiva II Captiva SUV 2.4 DOHC  |
| Kia | 12 | Carens Carens IV Carens Minivan 2.0 GDI (механика, передний); Ceed Ceed II Ceed Hatchback 5d 1.0 T-GDI (автомат, полный); Optima Optima I Optima Sedan Hybrid 2.0 dohc h (механика, передний); Rio Rio III Rio Hatchback 3d  |
| Smart | 12 | ForTwo ForTwo II ForTwo Cabrio 1.0 (механика, ); ForTwo ForTwo II ForTwo Cabrio 1.0 mhd (механика, ); ForTwo ForTwo II ForTwo Cabrio 0.8 CDI (механика, ); ForTwo ForTwo II ForTwo Coupe 1.0 (механика, ); ForTwo ForTwo II  |
| Mitsubishi | 10 | Colt Colt VII Colt Hatchback 3d 1.3 MIVEC (автомат, передний); Colt Colt VII Colt Hatchback 5d 1.3 MIVEC (автомат, передний); Colt Colt VI Colt Hatchback 1.3 i 16V CZ3 (автомат, передний); L200 L200 V L200 Club Cab 2.4 ( |
| Fiat | 9 | 500L 500L 500L Hatchback 5d Seria 5 1.4  (автомат, передний); Punto Punto 2012 Punto Hatchback 5d 0.9 TwinAir (автомат, передний); Punto Punto Evo Punto Hatchback 3d 1.4 (автомат, передний); Punto Punto Evo Punto Hatchba |
| Suzuki | 8 | Ignis Ignis III Ignis Crossover 1.2 DUALJET (автомат, передний); Swift Swift VI Swift Hatchback 1.2 DualJet (автомат, передний); Vitara Vitara III Vitara SUV 2024 1.5 Strong Hyb (механика, полный); Vitara Vitara III Vita |
| Subaru | 6 | Outback Outback IV Outback Crossover 2.0 D (автомат, полный); Legacy Legacy V Legacy Sedan 2.5 i (механика, полный); Legacy Legacy V Legacy Kombi 2.5 i (механика, полный); Trezia Trezia I Trezia I 1.4 D (автомат, передни |
| Lancia | 6 | Delta Delta III Delta Hatchback Seria 1 1.6 Mu (автомат, передний); Delta Delta III Delta Hatchback 1.6 MultiJet (автомат, передний); Musa Musa Musa Mikrovan Seria 2 1.4 16v (автомат, передний); Musa Musa Musa Mikrovan S |

## По источнику строки

| Источник строки | Версий | Мотор подтверждён | Годы подтверждены |
|---|---:|---:|---:|
| autocentrum | 14268 | 10639 (75 %) | 9625 (67 %) |
| ultimatespecs | 11133 | 10676 (96 %) | 10249 (92 %) |
| adac | 483 | 255 (53 %) | 410 (85 %) |

## По маркам

Доля версий марки с подтверждённым значением (два источника).

| Марка | Моделей | Версий | Мотор | Годы | Фаза | Коробка | Привод |
|---|---:|---:|---:|---:|---:|---:|---:|
| Volkswagen | 30 | 2558 | 84 % | 71 % | 69 % | 73 % | 66 % |
| Mercedes-Benz | 38 | 2461 | 91 % | 85 % | 90 % | 78 % | 75 % |
| BMW | 26 | 2308 | 94 % | 98 % | 88 % | 81 % | 76 % |
| Audi | 18 | 2257 | 94 % | 98 % | 93 % | 88 % | 88 % |
| Ford | 32 | 1729 | 86 % | 86 % | 81 % | 75 % | 70 % |
| Renault | 26 | 1500 | 94 % | 81 % | 77 % | 74 % | 73 % |
| Peugeot | 24 | 1289 | 92 % | 92 % | 80 % | 79 % | 75 % |
| Volvo | 20 | 1238 | 95 % | 98 % | 76 % | 89 % | 80 % |
| Opel | 18 | 1107 | 83 % | 81 % | 84 % | 74 % | 72 % |
| Skoda | 15 | 1066 | 94 % | 97 % | 83 % | 87 % | 81 % |
| Toyota | 32 | 738 | 81 % | 78 % | 68 % | 69 % | 65 % |
| Fiat | 25 | 657 | 63 % | 53 % | 61 % | 61 % | 61 % |
| Citroen | 28 | 644 | 78 % | 53 % | 61 % | 70 % | 74 % |
| Kia | 26 | 564 | 89 % | 95 % | 72 % | 75 % | 68 % |
| Seat | 10 | 532 | 83 % | 51 % | 77 % | 77 % | 71 % |
| Hyundai | 26 | 529 | 86 % | 84 % | 79 % | 66 % | 58 % |
| Porsche | 7 | 396 | 46 % | 54 % | 71 % | 45 % | 30 % |
| Mazda | 18 | 358 | 89 % | 85 % | 80 % | 86 % | 77 % |
| Nissan | 27 | 353 | 71 % | 61 % | 62 % | 69 % | 66 % |
| Mini | 8 | 327 | 65 % | 62 % | 51 % | 64 % | 62 % |
| Land Rover | 8 | 309 | 56 % | 44 % | 65 % | 55 % | 54 % |
| Dacia | 8 | 264 | 80 % | 61 % | 91 % | 79 % | 77 % |
| Jaguar | 8 | 198 | 58 % | 0 % | 45 % | 56 % | 55 % |
| Alfa Romeo | 11 | 187 | 55 % | 38 % | 5 % | 48 % | 53 % |
| Chevrolet | 18 | 181 | 55 % | 3 % | 47 % | 50 % | 50 % |
| Mitsubishi | 11 | 175 | 68 % | 45 % | 50 % | 61 % | 61 % |
| Honda | 17 | 174 | 60 % | 55 % | 38 % | 60 % | 57 % |
| Jeep | 9 | 173 | 52 % | 39 % | 55 % | 51 % | 50 % |
| Suzuki | 14 | 172 | 51 % | 42 % | 47 % | 46 % | 51 % |
| Ssangyong | 9 | 134 | 30 % | 35 % | 35 % | 30 % | 28 % |
| Lexus | 14 | 133 | 27 % | 45 % | 30 % | 27 % | 24 % |
| Subaru | 12 | 118 | 38 % | 29 % | 28 % | 33 % | 27 % |
| KGM | 6 | 106 | 22 % | 3 % | 16 % | 22 % | 21 % |
| DS | 7 | 88 | 47 % | 59 % | 64 % | 46 % | 47 % |
| Cupra | 7 | 78 | 85 % | 96 % | 96 % | 85 % | 84 % |
| Chrysler | 7 | 75 | 21 % | 18 % | 18 % | 18 % | 12 % |
| Genesis | 6 | 72 | 44 % | 26 % | 0 % | 44 % | 40 % |
| Infiniti | 12 | 70 | 30 % | 24 % | 21 % | 22 % | 18 % |
| Dodge | 10 | 62 | 6 % | 0 % | 11 % | 6 % | 6 % |
| Smart | 3 | 58 | 75 % | 86 % | 100 % | 55 % | 34 % |
| Lancia | 6 | 55 | 65 % | 0 % | 32 % | 54 % | 63 % |
| Tesla | 4 | 41 | 26 % | 80 % | 60 % | 26 % | 24 % |
| Cadillac | 5 | 36 | 38 % | 63 % | 69 % | 38 % | 30 % |
| Isuzu | 1 | 34 | 17 % | 20 % | 0 % | 17 % | 14 % |
| Abarth | 2 | 30 | 60 % | 6 % | 6 % | 60 % | 60 % |
| Maserati | 5 | 27 | 48 % | 0 % | 62 % | 48 % | 48 % |
| MG | 6 | 25 | 60 % | 88 % | 52 % | 60 % | 48 % |
| Polestar | 5 | 21 | 71 % | 76 % | 0 % | 71 % | 61 % |
| BYD | 8 | 20 | 85 % | 100 % | 85 % | 85 % | 85 % |
| XPENG | 3 | 16 | 93 % | 62 % | 0 % | 93 % | 93 % |
| NIO | 5 | 13 | 100 % | 100 % | 0 % | 100 % | 100 % |
| DFSK | 8 | 12 | 33 % | 41 % | 0 % | 33 % | 33 % |
| GWM | 6 | 12 | 58 % | 66 % | 0 % | 58 % | 58 % |
| VinFast | 4 | 12 | 66 % | 33 % | 0 % | 66 % | 66 % |
| Leapmotor | 1 | 10 | 0 % | 100 % | 100 % | 0 % | 0 % |
| Lucid | 1 | 10 | 40 % | 100 % | 0 % | 40 % | 40 % |
| Maxus | 6 | 9 | 0 % | 0 % | 0 % | 0 % | 0 % |
| Alpine | 1 | 8 | 62 % | 100 % | 0 % | 62 % | 62 % |
| BAIC | 6 | 8 | 0 % | 0 % | 0 % | 0 % | 0 % |
| Zeekr | 3 | 8 | 62 % | 50 % | 0 % | 62 % | 62 % |
| Geely | 2 | 6 | 0 % | 0 % | 0 % | 0 % | 0 % |
| JAECOO | 2 | 6 | 0 % | 100 % | 100 % | 0 % | 0 % |
| Hongqi | 3 | 5 | 0 % | 0 % | 0 % | 0 % | 0 % |
| Seres | 2 | 5 | 80 % | 100 % | 0 % | 80 % | 80 % |
| INEOS | 1 | 4 | 100 % | 100 % | 0 % | 100 % | 100 % |
| Lynk&Co | 3 | 4 | 50 % | 25 % | 0 % | 50 % | 50 % |
| OMODA | 2 | 4 | 25 % | 50 % | 100 % | 25 % | 25 % |
| Aiways | 1 | 3 | 100 % | 0 % | 0 % | 100 % | 100 % |
| ORA | 1 | 2 | 100 % | 0 % | 0 % | 100 % | 100 % |
