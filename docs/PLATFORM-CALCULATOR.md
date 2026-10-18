# Калькулятор на платформе Mantexlab Tools

> С 18.10.2026 (решение владельца) **калькуляторы** (`calculators.html`, вкладки 0–5) переезжают на платформу Mantexlab
> Tools — новый раздел «Kalkulator» в шапке, `https://tools.mantexlab.com/calculator`. Все новые изменения калькуляторов —
> там. Старый `calculators.html` работает как есть, новые правки туда не вносятся (как `mobile.html` и программа 06).
> Владелец (пользователь) ведёт раздел сам. Ведёт работы чат «Калькулятор на платформе» (этот документ — его мозг).
> Статусы: CONFIRMED / HYPOTHESIS / OPEN (как в `PROJECT_BRAIN.md`). Образцы полного прохода — `PLATFORM-SEARCH.md`, `PLATFORM-OFFER.md`.

## 1. Где что

| Что | Где |
|---|---|
| Код платформы | закрытый GitHub `vanklerik/tools`, локально `~/cloude/mantexlab-tools` (работа — в своём `git worktree`) |
| Формула «под ключ» сейчас | `platform/app/Pricing/TurnkeyCalculator.php` (способы `direct` / `vat` / `margin`, сверена со старым калькулятором до гроша 17.10); её используют офферы, «na gotowo» поиска, мониторинг, цены клиента, карточка авто |
| Калькулятор (новый) | расчётный модуль `platform/app/Calculator/*` (волна 1), экран `platform/app/Livewire/Calculator/*` (волна 2) |
| Настройки чисел | `settings`, группа `pricing` (`config/zrok.php`), экран «Настройки фирмы» |
| Правила и план | `CLAUDE.md` платформы, контракт `docs/contracts/calculator.md` (волна 1), доска `docs/board.md` — **этап 6** |
| Макеты | холст Claude Design «Kalkulator — warianty»: `https://claude.ai/artifact/WqGBV2yVvuVKoRgNfX8gPW` (ряд «Итог» — утверждён) |
| Старая версия (эталон) | `calculators.html`, `src/main.jsx` (зеркало `src/main.compiled.js`), `PROJECT-CALCULATORS.md`; копии формул — `src/turnkey-estimate.js`, `src/offer.js` `estimateThroughAutogood` |

## 2. Правила для чатов калькулятора (CONFIRMED 18.10)

1. Все правила `PLATFORM-SEARCH.md` §2 и `PLATFORM-OFFER.md` §2 действуют и здесь: нет слова AUTOGOOD на платформе (код,
   тексты, коммиты, файлы): «Prowizja AUTOGOOD» → «Prowizja firmy» / название фирмы из настроек; числа первого клиента —
   настройки компании; логику переписываем на PHP, код как есть не копируем.
2. Своя копия кода: `git -C ~/cloude/mantexlab-tools worktree add <папка> -b <ветка> origin/main`; своя `platform/.env`
   с SQLite, порт **8128**. Коммит только явными путями, перед ним `git diff --cached --stat`.
3. Проверки до показа: `~/cloude/.tools/php-common/php vendor/bin/pest`, `… vendor/bin/pint --test`, `… vendor/bin/phpstan analyse`.
   Тест на каждый пункт волны; **сверка сумм со старым калькулятором до гроша** на контрольных примерах (§6).
4. Выкладка — только по «выкладывай» владельца; миграции базы — только по прямому «да, миграция» для этой волны.
5. `TurnkeyCalculator` сейчас правит чат оффера (волны 3в). Волны 1–3 калькулятора его **не трогают**: свой модуль рядом
   и тесты сверки с ним. Перевод офферов и поиска на шаблон конструктора (волна 4) — по согласованию с куратором оффера
   (чат «Анализ проекта Оффера на сервере»).
6. В коммите волны — контракт и строка этапа 6 в `docs/board.md` платформы; здесь — статус волны (§5) и журнал
   `PROJECT_BRAIN.md` §8.

## 3. Решения владельца (18.10)

| Решение | Статус |
|---|---|
| Одна страница «Kalkulator» вместо 6 вкладок, отдельный раздел в шапке платформы | CONFIRMED |
| **Одна формула везде:** шаблон из конструктора — это расчёт «под ключ» фирмы; калькулятор считает по нему сразу, офферы, «na gotowo» поиска и мониторинг переходят на него отдельной волной после сверки до гроша | CONFIRMED |
| Постоянные строки и формулы фирмы в конструкторе меняет **только владелец (администратор)**; менеджер в своём расчёте меняет тексты и суммы, удаляет, возвращает, двигает и добавляет строки | CONFIRMED |
| Конструктор — панель справа поверх расчёта (кнопка «Konstruktor») | CONFIRMED |
| «Финальный расчёт» — на той же странице, переключатель «Kalkulacja zakupu / Rozliczenie końcowe»; финальный можно начать из расчёта закупки | CONFIRMED |
| **Итоговый макет** (холст, ряд «Итог»): самая верхняя строка — папка «Historia kalkulacji» (как «Ulubione wyszukiwania» в поиске) и справа кнопка «Konstruktor» (администратор); под ней заголовок «Kalkulator»; верхний блок как в варианте B — режим, курс ±, PL/RU/EN, печать, картинка, «Zapisz» и три вопроса «Skąd kupujemy (Od sprzedawcy / Aukcja / Dealer) · Faktura (VAT 23% / VAT marża) · Prowizja (Standard / Finansowanie / Bezpośrednio)», невозможные сочетания серые; ниже калькулятор как в варианте A: слева «Dane» (шире, поля парами), справа расчёт (~620 px) — строки, «Razem», полоса долей, сноски | CONFIRMED |
| Порядок: сначала калькулятор, потом конструктор | CONFIRMED |
| Отклонено: варианты C (ввод прямо в строках) и «итог в начале расчёта» из B, пять кнопок путей (A), история блоком внизу, кнопка «Konstruktor» внутри расчёта | CONFIRMED |

**Допущения (не оспорены владельцем 18.10):** экран — PL/RU, как вся платформа; сам расчёт для клиента (картинка, PDF) —
PL/RU/EN. История — на сервере; старая история браузера не переносится, `calculators.html` остаётся. Курс — Walutomat + 0,02
(как в офферах и поиске). Регистрация — 600 zł (решение 17.10; в старом калькуляторе 580). Три ошибки старого калькулятора
исправляем, а не переносим (§4.9 пп. 1–3). Разное обращение с VAT на вкладках (§4.9 п. 5) переносим как есть, список — владельцу на проверке.

## 4. Что переносим (инвентаризация `src/main.jsx` 18.10, 3433 строки)

### 4.1 Константы

VAT 0,23; техосмотр 150; перевод документов 250; регистрация 580 нетто (платформа — 600); фикс комиссии 1 829,27 нетто
(на экране «1850», брутто 2 250), при финансировании 2 642,28 (на экране «2650», брутто 3 250); процент комиссии — стандарт
2 %, финансирование 5 %, прямая 1 %; доля скидки фирме 30 % (клиенту 70 %); Cło 10 %; курс по умолчанию 4,26.
Обозначения: R — курс, `carPLN = car_EUR × R`, A — ставка акциза, FIX/p = 1829,27/2 % (Standard) или 2642,28/5 % (Finansowanie).

### 4.2 Вкладки → пути на одной странице

| Старая вкладка | PL / RU / EN | Новый выбор (3 вопроса) |
|---|---|---|
| 0 | Zakup bezpośredni / Прямая покупка / Direct purchase | Od sprzedawcy (счёт и комиссия не выбираются) |
| 1 | Aukcje VAT 23% / Аукционы VAT 23% / Auctions VAT 23% (при финансировании «Aukcja Leasing VAT 23%») | Aukcja · VAT 23% · Standard / Finansowanie |
| 2 | Aukcje VAT Marża / Аукционы VAT Маржа / Auctions VAT Margin | Aukcja · VAT marża · Standard / Finansowanie |
| 3 | Dealerzy VAT 23% / Дилеры VAT 23% / Dealers VAT 23% (при финансировании «Dealer Leasing VAT 23%») | Dealer · VAT 23% · Standard / Finansowanie / Bezpośrednio |
| 4 | Dealerzy VAT Marża / Дилеры VAT Маржа / Dealers VAT Margin | Dealer · VAT marża · Standard / Finansowanie |
| 5 | Finalne rozliczenie / Финальный расчёт / Final settlement | режим «Rozliczenie końcowe» |

Тип двигателя — общий, по умолчанию 3: 0 «EL / PHEV <=2000cm³» 0 %; 1 «PHEV / HEV / MHEV >2000cm³» 9,3 %; 2 «HEV / MHEV
<=2000cm³» 1,55 %; 3 «Spalinowy <=2000cm³» 3,1 %; 4 «Spalinowy >2000cm³» 18,6 %; 5 «Dostawczy N1 (bez akcyzy)» 0 % (RU/EN — в
`main.jsx` 338–345). Флажки: «Rejestracja» (0–4), «Cło» (только 3), «Prowizja firmy niemieckiej» + сумма в EUR (3 и 4).

### 4.3 Формулы (строка на экране — нетто; «в итог» — множитель)

- **0 — прямая.** Поля: car (EUR брутто), inspection, transport (PLN нетто), discount (EUR). excise = A × carPLN;
  commission = 1829,27 + 1 % × carPLN + 30 % × discount × R. Итог = carPLN + 1,23·insp + 1,23·tr + excise + 1,23·commission
  + 150 + 250 + 1,23·reg. Строка VAT справочная: 23 % × (insp + tr + commission + reg).
- **1 — аукцион VAT 23 %.** Поля: car нетто EUR, fee нетто EUR («Opłata aukcyjna netto», подпись «fee×1,23 brutto»), transport
  нетто PLN (осмотра и скидки нет). base = (car + fee) × R; excise = A × base; commission = FIX + p × (base × 1,23);
  vatBase = base + tr + excise + commission + 150 + reg; VAT = 23 % × vatBase; итог = 1,23 × vatBase.
- **2 — аукцион marża** (единственная вкладка с честным пересчётом зависимостей; удалённая строка выпадает из баз). Поля:
  car (EUR брутто), fee (EUR), transport нетто. base = (car + fee) × R; excise = A × base; commission = FIX + p × base;
  vatBase = fee + tr + excise + commission + 150 + reg + свои строки с VAT; VAT = 23 % × vatBase; итог = car + fee + tr +
  excise + commission + 150 + reg + свои строки + VAT. Удалили строку «VAT» — всё без VAT.
- **3 — дилер VAT 23 %.** Поля: car нетто EUR, inspection, transport, German (EUR), discount; флажки регистрации и Cło.
  excise = A × carPLN; cło = 10 % × carPLN (без VAT); German = gC × R (без VAT).
  Standard / Finansowanie: commission = FIX + p × (carPLN × 1,23) + 30 % × discount × R; vatBase = carPLN + insp + tr + excise
  + commission + 150 + reg; итог = 1,23 × vatBase + cło + German.
  Bezpośrednio: commission = 1829,27 + 1 % × carPLN (без скидки, финансирование не влияет); vatBase = insp + tr + commission
  + 150 + reg; итог = carPLN + insp + tr + excise + cło + commission + 150 + reg + 23 % × vatBase + German.
- **4 — дилер marża.** Поля: car (EUR брутто), inspection, transport, German, discount; регистрация. commission = FIX + p ×
  carPLN + 30 % × discount × R; итог = carPLN + 1,23 × (insp + tr + excise + commission + 150 + reg) + German (VAT и на акциз,
  и на техосмотр: 150 → 184,50).
- **Свои строки** («Dodaj własny koszt»): название, сумма, PLN/EUR, «Dolicz VAT 23%»; EUR × R, приставка «100 EUR =»; с VAT —
  «X PLN brutto», в итог брутто (во вкладке 2 VAT уходит в общую строку).
- Подписи под строками: комиссия `money(FIX) + (p% × money(base))[ + (30% × скидка EUR)]`; акциз `3.10% × base`.

### 4.4 Итог, округление, курс

`money()`: PLN до 50, EUR до 10 (150, 250, 580 — точно). Итог «= Razem» = money(total); «= X €» = итог / R до 10 €;
«Przeliczono po kursie: 4.28 PLN». Курс: Walutomat `best_offers?currencyPair=EURPLN` (`asks[0]`, иначе `bids[0]`) → запасной
`data/exchange-rates.json`; рабочий = рыночный + 0,02 (если не правили руками и нет `?rate=`); виджет «Kurs EUR/PLN»,
«Średni kurs: X PLN» + дата, ± шаг 0,01.

### 4.5 Сноски под расчётом

| Ключ | PL | RU | EN |
|---|---|---|---|
| D70 | Oddajemy 70% uzyskanego rabatu od sprzedawcy | Возвращаем 70% полученной скидки от продавца | We return 70% of the discount received from the seller |
| SELLER | Płatność za pojazd do sprzedawcy w EUR | Вы платите за автомобиль продавцу в EUR | Payment to the seller in EUR |
| PAY | Płatność w PLN lub EUR | Вы оплачиваете всю сумму в PLN или EUR | Payment in PLN or EUR |
| INV23 | Sprzedajemy na Fakturę VAT 23% | Продаём по инвойсу VAT 23% | Sold with a VAT 23% invoice |
| INVM | Sprzedajemy na Fakturę VAT Marża | Продаём по инвойсу VAT Marża | Sold with a VAT Margin invoice |
| OWNC | Wpłacenie wkładu własnego | Вы вносите собственный взнос | You pay the down payment |
| OWNF | Kupujemy pojazd z własnych środków | Покупаем автомобиль за собственные средства | We buy the vehicle with our own funds |
| OWNFD | Kupujemy pojazd z własnych środków oraz wpłacamy kaucję w wys. zagranicznego VAT-u | Покупаем автомобиль за собственные средства и вносим депозит в размере иностранного VAT | We buy the vehicle with our own funds and pay a deposit equal to the foreign VAT |
| DEPWE | Wpłacamy kaucję w wys. zagranicznego VAT-u | Вносим депозит в размере иностранного VAT | We pay a deposit equal to the foreign VAT (исправлено: было «You pay») |
| DEPYOU | Wpłacasz kaucję w wys. zagranicznego VAT-u | Вы вносите депозит в размере иностранного VAT | You pay a deposit equal to the foreign VAT |

Порядок: 0 — D70 → SELLER; 1 — стандарт PAY → INV23, финансирование OWNC → OWNF → INV23; 2 — стандарт PAY → INVM,
финансирование OWNC → OWNF → INVM; 3 — стандарт D70 → DEPWE → PAY → INV23, финансирование D70 → OWNC → OWNFD → INV23,
напрямую D70 → DEPYOU → SELLER; 4 — стандарт D70 → PAY → INVM, финансирование D70 → OWNC → OWNF → INVM. Немецкая комиссия,
регистрация и Cło сноски не меняют. Фразы `processHighlights` (550–579) — жирным. Каждая сноска правится на месте (теги B,
BR, EM, I, STRONG), правка хранится в расчёте.

### 4.6 Правка строк

Название, описание («Dodaj opis»), приставка «… EUR =» — по нажатию; сумма любой строки, кроме справочного VAT (умножается
на брутто-множитель строки); итог вручную (EUR от него); удаление «−» и список «Usunięte pozycje» с «+»; порядок
перетаскиванием (и пальцем); свои строки. Смена полей, курса, двигателя, комиссии, флажков сбрасывает только ручные суммы;
смена пути — всё, кроме языка, курса и двигателя. На платформе у каждой строки постоянный ключ (не номер).

### 4.7 Верхняя панель, история, полоса долей

Язык PL/RU/EN; «Druk / PDF» (сначала сохраняет; лист с заголовком «Kalkulacja — {путь}», строки, итог PLN + EUR, курс,
сноски через « → »; водяной знак — логотип фирмы из настроек); «Kopiuj obraz» (панель расчёта картинкой в буфер, иначе новая
вкладка; без кнопок правки); «Zapisz kalkulację» и уведомления. История: 20 последних + все ★ сверху, одинаковый расчёт
заменяется, в записи — путь, курс, двигатель, флажки, поля, ручные суммы, удалённые, порядок, подписи, свои строки, правки
сносок, итог, название; в списке — название, дата · тип комиссии, сумма, × и ★. Полоса долей: доля на каждую видимую строку
> 0 (по нетто), VAT отдельно, порядок авто → налоги → остальное, над полосой «авто + налоги» и «остальное», легенда (1 знак
при < 10 %), цвета у строк постоянные.

### 4.8 Финальный расчёт

Валюта PLN/EUR (пересчёт по курсу). Активные: Oględziny, Dostawa na lawecie, Tłumaczenie (250), Przegląd (150), Prowizja
firmy (+), Zaliczka (−). Неактивные: 30% rabatu dealera (−), Prowizja firmy niemieckiej, Oględziny x2, Detailing, Lakierowanie,
Serwis, Rejestracja (+), Zaliczka 2 (−). У каждой: «Nie licz», +/−, сумма; своя позиция; в результате — правка названия и суммы,
перетаскивание, «+VAT 23%» у плюсовых, общая строка VAT. Итог = Σ плюсов (+ их VAT) − Σ минусов; меньше нуля — «Nadpłata / do
zwrotu»; в печати положительный — «Pozostało do dopłaty». Под итогом — другая валюта и курс. Новое: начать из расчёта закупки.

### 4.9 Ошибки старого калькулятора (решение: исправить) и странности

1. Вкладка 1: ручная правка суммы теряет VAT в итоге (VAT-строка справочная): 119 962 → 97 530. На платформе VAT — строка
   «23 % × сумма строк в базе VAT», пересчитывается всегда.
2. «Rejestracja» и «Cło» сдвигают номера строк ниже (как было с немецкой комиссией) — на платформе постоянные ключи.
3. EN-сноска DEPWE «You pay» против PL/RU «мы вносим» — исправлено на «We pay».
4. Мёртвый код (`composition`, `breakdown*`, `finalFixedCosts`…) не переносим.
5. VAT по-разному: вкладка 0 — техосмотр, перевод и акциз без VAT; вкладка 4 — акциз и техосмотр с VAT; база скидочной
   доли от carPLN, только на 3 — от carPLN × 1,23. Переносим как есть, владельцу — списком на проверке (OPEN).

### 4.10 Связи и адресная строка

Параметры: `tab`, `lang`, `rate`, `engine`, `financed=1`, `direct=1`, `car`, `fee`, `transport`, `inspection`, `discount`,
`germanCommission`, `registration=1`, `mobileUrl`, `extraLabel/Amount/Currency/Vat`, `extras` (JSON ≤ 12), `embed=1|offer`.
Импорт по ссылке объявления (вкладки 0/3/4) — на платформе через её чтение объявлений (8 порталов, mobile.de — расширением).
Встраивание в `mobile.html` и программу 06 на платформе не нужно: поиск и офферы считают сами (волна 4 — по шаблону).

## 5. Волны (этап 6 на доске платформы)

| Волна | Что | Статус |
|---|---|---|
| 6.1 | Расчётный модуль: шаблон «строки + формулы» (безопасные формулы, без `eval`), в нём 6 старых вкладок один в один; сверка до гроша (§6) с `main.compiled.js` и `TurnkeyCalculator`; на экране ничего | готово (18.10, ветка `calculator` платформы, `aa54574`): 690 расчётов старого калькулятора и 7 сочетаний `TurnkeyCalculator` — до гроша; 747 тестов раздела; контракт `docs/contracts/calculator.md` |
| 6.2 | Страница «Kalkulator» по итоговому макету: история наверху, три вопроса, «Dane» + расчёт, правка строк и сносок, курс, PL/RU/EN, печать и картинка, финальный расчёт режимом; история на сервере (миграция — по «да») | **выложено 18.10** (`c4e0f72`, миграция `calculations` применена по «да» владельца): `https://tools.mantexlab.com/calculator`; 1 932 теста платформы; на сервере контрольный пример — до гроша по всем путям |
| 6.3 | Конструктор (только администратор): постоянные строки, формулы кубиками, условия по путям, VAT-правило, пример перед сохранением, версии, «вернуть по умолчанию» | ждёт |
| 6.4 | Одна формула везде: офферы, «na gotowo», мониторинг, карточка авто — по шаблону; сверка до гроша; с куратором оффера | ждёт |

## 6. Контрольные примеры

Курс 4,30, car 20 000, fee 500, inspection 1 000, transport 2 500, discount 1 000, двигатель 3,1 % (точно / на экране):
0 — 98 265,50 / 98 250; 1 стандарт — 119 962,40 / 119 950; 1 финансирование — 124 963,27; 2 — 99 683,65 / 99 700;
3 стандарт — 119 987,57 / 120 000; 3 финансирование — 124 890,85; 3 напрямую — 96 463,30 / 96 450; 4 — 99 720,98 / 99 700.
Плюс 10 примеров сверки офферов 17.10 (`docs/contracts/offers.md` платформы) и пример 10 980 € × 4,25 → 56 000 zł.

## 7. Журнал

- 2026-10-18 — волна 6.2 выложена (`c4e0f72`, вместе с правкой карточки осмотра Игоря `d291390`, уже бывшей в `main`): раздел «Kalkulator» в шапке — папка «Historia kalkulacji» наверху, режим «Kalkulacja zakupu / Rozliczenie końcowe», курс Walutomat + 0,02 с ±, язык расчёта PL/RU/EN, печать, картинка, «Zapisz»; три вопроса пути; «Dane» (поля парами, «Wczytaj» по ссылке через чтение платформы) и лист расчёта (правка строк, своя сумма, убрать/вернуть, порядок, свои строки, свой итог, полоса долей, сноски правятся); финальный расчёт с «Kwoty z kalkulacji zakupu»; история на сервере (20 + ★, таблица `calculations`). Экран — на языке раздела «Поиск дилеры» (RU/PL) (Claude).
- 2026-10-18 — волна 6.1 (ветка `calculator` платформы, `aa54574`, не в `main`, на экране ничего): `platform/app/Calculator` — путь
  тремя вопросами (`Scenario`, 10 путей), шаблон «строки + формулы» `DefaultTemplate` (6 вкладок, сноски, финальный
  расчёт), свои формулы без `eval` (`Expression`: «1829,27 + 2% × цена», условия, `row.<ключ>`, `vat_base()`), расчёт
  `Calculator` (строки складываются в итог, своя сумма и убранная строка честно пересчитывают VAT), `Settlement`;
  сверка — 690 расчётов старого калькулятора (генератор `tests/Fixtures/calculator/generate-legacy-cases.mjs`) и
  `TurnkeyCalculator` до гроша; исправлены ошибки §4.9 пп. 1–3 (Claude).
- 2026-10-18 — kickoff: инвентаризация старого калькулятора (§4), решения владельца (§3), 3 варианта макета и итоговый
  макет на холсте (верх B, расчёт A, история и «Konstruktor» наверху, «Dane» шире), волны 6.1–6.4 (Claude).
