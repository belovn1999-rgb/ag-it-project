# «Текст продавцу» — тексты писем на проверку владельцу (07.11.2026)

> Волна 2 подпроекта 5 ([SEARCH-IDEAS-2026-11.md](SEARCH-IDEAS-2026-11.md) §8–§10). Владелец 07.11: тексты проверяет сам.
> Тексты лежат в платформе: `platform/resources/data/haggle.php` (ветка `search-haggle`, доска 3а.70). Поправить строку можно
> здесь, в этом файле: напишите «в немецком вместо … пусть будет …», чат перенесёт в платформу.

## 1. Как собирается письмо

Платформа ничего не отправляет. Менеджер открывает у машины «⋯» → «Текст продавцу», видит предложение цены и письмо, правит
цену, язык и текст и копирует письмо в чат или почту портала.

Письмо собирается из строк ниже. Строки 3, 4 и 6 добавляются только когда есть факт:

| № | Строка | Когда есть |
|---|---|---|
| 1 | Тема | всегда |
| 2 | Приветствие и «интересуемся вашей машиной … за … » | всегда |
| 3 | «Объявление висит N дней» | объявление на портале 30 дней и дольше (срок — в «Настройки → Компания») |
| 4 | «Похожие машины продаются примерно за …» | похожих машин того же рынка не меньше шести и их медиана ниже цены |
| 5 | «Готовы продать за …?» | всегда |
| 6 | Вопрос про НДС | портал не сказал про НДС, продавец не частник |
| 7 | «Покупаем как фирма, можем быстро оплатить» и подпись: имя менеджера, фирма, телефон из «Настройки → Компания» | всегда |

Язык — по порталу: mobile.de, AutoScout24 DE / AT / LU, Kleinanzeigen — немецкий; otomoto — польский; Marktplaats,
AutoScout24 NL, 2dehands — нидерландский; AutoScout24 BE / FR, ParuVendu — французский; Blocket — шведский. Менеджер может
переключить на любой из шести. av.by — без письма (Беларусь, другой рынок).

Предложение цены (по умолчанию, меняется в «Настройки → Компания» → «Торг с продавцом»): −3 % от цены; объявление с 30 дней —
−5 %; с 60 дней — −7 %; если похожие машины дешевле — до их медианы, но не больше −10 %. Округление вниз: евро — до 100,
злотые — до 500, кроны — до 1 000.

## 2. Строки по языкам с переводом

Вставки: **:title** — марка и модель, **:year** — год, **:km** — пробег, **:price** — цена объявления, **:days** — дни,
**:median** — медиана похожих, **:target** — предложение.

### Немецкий (de)

| Строка | Текст | По-русски |
|---|---|---|
| Тема | Anfrage zu Ihrem :title | Запрос по вашему :title |
| Привет | Guten Tag, | Добрый день, |
| Машина | wir interessieren uns für Ihren :title (:year, :km km), inseriert für :price. | нас интересует ваш :title (:year, :km км), выставленный за :price. |
| Дни | Das Fahrzeug ist seit :days Tagen inseriert. | Машина выставлена уже :days дней. |
| Похожие | Vergleichbare Fahrzeuge (Baujahr ±1, ähnliche Laufleistung und Leistung) werden derzeit für etwa :median angeboten. | Сравнимые машины (год ±1, похожие пробег и мощность) сейчас предлагаются примерно за :median. |
| Вопрос | Wären Sie bereit, das Fahrzeug für :target zu verkaufen? | Готовы ли вы продать машину за :target? |
| НДС | Ist die Mehrwertsteuer ausweisbar? | Можно ли выделить НДС (счёт с НДС)? |
| Конец | Wir kaufen gewerblich und können bei Einigung kurzfristig bezahlen. | Мы покупаем как фирма и после договорённости можем быстро оплатить. |
| Подпись | Mit freundlichen Grüßen | С уважением |

### Польский (pl)

| Строка | Текст | По-русски |
|---|---|---|
| Тема | Zapytanie o ogłoszenie: :title | Вопрос по объявлению: :title |
| Привет | Dzień dobry, | Добрый день, |
| Машина | jesteśmy zainteresowani Państwa samochodem :title (:year, :km km) wystawionym za :price. | нас интересует ваш автомобиль :title (:year, :km км), выставленный за :price. |
| Дни | Ogłoszenie jest aktywne od :days dni. | Объявление активно :days дней. |
| Похожие | Porównywalne auta (rocznik ±1, podobny przebieg i moc) są obecnie oferowane za około :median. | Сравнимые машины (год ±1, похожие пробег и мощность) сейчас предлагаются примерно за :median. |
| Вопрос | Czy byliby Państwo gotowi sprzedać go za :target? | Готовы ли вы продать его за :target? |
| НДС | Czy możliwa jest faktura VAT? | Возможен ли счёт-фактура с НДС? |
| Конец | Kupujemy jako firma i po uzgodnieniu możemy szybko zapłacić. | Покупаем как фирма и после договорённости можем быстро оплатить. |
| Подпись | Z poważaniem | С уважением |

### Нидерландский (nl)

| Строка | Текст | По-русски |
|---|---|---|
| Тема | Vraag over uw :title | Вопрос о вашем :title |
| Привет | Goedendag, | Добрый день, |
| Машина | wij zijn geïnteresseerd in uw :title (:year, :km km), aangeboden voor :price. | нас интересует ваш :title (:year, :km км), предложенный за :price. |
| Дни | De auto staat al :days dagen te koop. | Машина продаётся уже :days дней. |
| Похожие | Vergelijkbare auto's (bouwjaar ±1, vergelijkbare kilometerstand en vermogen) worden momenteel aangeboden voor ongeveer :median. | Сравнимые машины (год ±1, похожие пробег и мощность) сейчас предлагаются примерно за :median. |
| Вопрос | Zou u bereid zijn hem te verkopen voor :target? | Были бы вы готовы продать её за :target? |
| НДС | Is de auto btw-verrekenbaar? | Можно ли зачесть НДС за машину (btw-verrekenbaar)? |
| Конец | Wij kopen zakelijk en kunnen na akkoord snel betalen. | Покупаем как фирма и после согласия можем быстро оплатить. |
| Подпись | Met vriendelijke groet | С уважением |

### Французский (fr)

| Строка | Текст | По-русски |
|---|---|---|
| Тема | Demande concernant votre :title | Запрос по вашему :title |
| Привет | Bonjour, | Добрый день, |
| Машина | nous sommes intéressés par votre :title (:year, :km km), proposé à :price. | нас интересует ваш :title (:year, :km км), предложенный за :price. |
| Дни | Le véhicule est en vente depuis :days jours. | Машина продаётся уже :days дней. |
| Похожие | Des véhicules comparables (année ±1, kilométrage et puissance similaires) sont actuellement proposés à environ :median. | Сравнимые машины (год ±1, похожие пробег и мощность) сейчас предлагаются примерно за :median. |
| Вопрос | Seriez-vous prêt à le vendre à :target ? | Были бы вы готовы продать его за :target? |
| НДС | La TVA est-elle récupérable ? | НДС можно вернуть (зачесть)? |
| Конец | Nous achetons en tant que professionnel et pouvons payer rapidement après accord. | Покупаем как фирма и после согласия можем быстро оплатить. |
| Подпись | Cordialement | С уважением |

### Шведский (sv)

| Строка | Текст | По-русски |
|---|---|---|
| Тема | Fråga om er :title | Вопрос о вашем :title |
| Привет | Hej, | Здравствуйте, |
| Машина | vi är intresserade av er :title (:year, :km km) som annonseras för :price. | нас интересует ваш :title (:year, :km км), выставленный за :price. |
| Дни | Bilen har varit till salu i :days dagar. | Машина продаётся уже :days дней. |
| Похожие | Jämförbara bilar (årsmodell ±1, liknande körsträcka och effekt) annonseras just nu för cirka :median. | Сравнимые машины (год ±1, похожие пробег и мощность) сейчас выставлены примерно за :median. |
| Вопрос | Skulle ni kunna sälja den för :target? | Могли бы вы продать её за :target? |
| НДС | Är bilen momsbar? | Машина с НДС к вычету (momsbar)? |
| Конец | Vi köper som företag och kan betala snabbt efter överenskommelse. | Покупаем как фирма и после договорённости можем быстро оплатить. |
| Подпись | Med vänliga hälsningar | С уважением |

### Английский (en) — для любого другого портала

| Строка | Текст | По-русски |
|---|---|---|
| Тема | Enquiry about your :title | Запрос по вашему :title |
| Привет | Hello, | Здравствуйте, |
| Машина | we are interested in your :title (:year, :km km), listed for :price. | нас интересует ваш :title (:year, :km км), выставленный за :price. |
| Дни | The car has been listed for :days days. | Машина выставлена уже :days дней. |
| Похожие | Comparable cars (year ±1, similar mileage and power) are currently offered for about :median. | Сравнимые машины (год ±1, похожие пробег и мощность) сейчас предлагаются примерно за :median. |
| Вопрос | Would you be willing to sell it for :target? | Готовы ли вы продать её за :target? |
| НДС | Is VAT deductible (invoice with VAT)? | НДС к вычету (счёт с НДС)? |
| Конец | We buy as a business and can pay quickly once we agree. | Покупаем как фирма и можем быстро оплатить, как договоримся. |
| Подпись | Kind regards | С уважением |

## 3. Пример целиком (немецкий, mobile.de)

Skoda Kodiaq 2021, 86 000 км, 28 900 €, 47 дней на портале, девять похожих машин с медианой 26 900 €. Платформа советует
26 900 € (−6,9 %: до медианы, это меньше предела −10 %).

```
Тема: Anfrage zu Ihrem Skoda Kodiaq

Guten Tag,

wir interessieren uns für Ihren Skoda Kodiaq (2021, 86.000 km), inseriert für 28.900 €. Das Fahrzeug ist seit 47 Tagen
inseriert. Vergleichbare Fahrzeuge (Baujahr ±1, ähnliche Laufleistung und Leistung) werden derzeit für etwa 26.900 €
angeboten.

Wären Sie bereit, das Fahrzeug für 26.900 € zu verkaufen? Ist die Mehrwertsteuer ausweisbar? Wir kaufen gewerblich und
können bei Einigung kurzfristig bezahlen.

Mit freundlichen Grüßen
<имя менеджера>
<название фирмы из «Настройки → Компания»>
<телефон фирмы>
```

## 4. Что поправил чат при переносе в продукт (07.11)

- Немецкий вопрос: «… es für :target …» → «… **das Fahrzeug** für :target …» (раньше «ihren Wagen» и «es» не сходились по роду).
- Нидерландский НДС: «Is de btw verrekenbaar?» → «Is de auto **btw-verrekenbaar**?» (так пишут продавцы на Marktplaats).
- Польская тема: «Zapytanie o :title» → «Zapytanie o **ogłoszenie:** :title» (марку по-польски не склонить, «o Skoda Kodiaq» звучит неграмотно).

## 5. На что посмотреть владельцу

1. Тон: письмо короткое и деловое, без «пожалуйста» и без давления. Нужно мягче или жёстче?
2. «Покупаем как фирма, можем быстро оплатить» — верно для всех дилеров платформы? Если нет — уберём строку или сделаем её
   настройкой компании.
3. Вопрос про НДС стоит в одном абзаце с ценой. Поставить его отдельной строкой ниже?
4. Цена в нидерландском письме пишется «28.900 €»; на Marktplaats чаще «€ 28.900». Поменять?
5. Подпись — имя менеджера, фирма, телефон. Добавить почту менеджера?
