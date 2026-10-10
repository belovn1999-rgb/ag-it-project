/* AUTOGOOD "Oferta dla klienta" in Russian (B71, owner 2026-10-10: the PL / RU
 * switch of program 06 makes the offer in the language chosen).
 *
 * The readers (offer-ad.js) and the equipment (offer-equipment.js) speak
 * Polish; a Russian offer turns their Polish words into Russian here, so the
 * data stays one and the same. Words without a translation stay as they are
 * (a portal's own option name, a model's trim). The sheets' own sentences are
 * written in both languages in offer.js; the verdict's in offer-verdict.js.
 *
 * window.AUTOGOOD_OFFER_RU: value(text), option(label), country(code),
 * countryIn(code), plural(n, one, few, many), calc(label).
 */
(() => {
  // Whole values first (fuel, gearbox, body, seller, the reader's phrases).
  const VALUES = {
    "benzyna": "бензин", "diesel": "дизель", "hybryda": "гибрид", "hybryda (benzyna)": "гибрид (бензин)", "hybryda (diesel)": "гибрид (дизель)",
    "hybryda plug-in": "гибрид plug-in", "elektryczny": "электро", "benzyna + LPG": "бензин + газ (LPG)",
    "benzyna + CNG": "бензин + метан (CNG)", "benzyna (E85)": "бензин (E85)", "wodór": "водород",
    "automatyczna": "автомат", "manualna": "механика", "półautomatyczna": "робот",
    "przedni": "передний", "tylny": "задний", "4x4": "полный (4x4)",
    "SUV": "SUV", "kombi": "универсал", "sedan": "седан", "hatchback": "хэтчбек", "kabriolet": "кабриолет", "coupé": "купе", "van": "минивэн",
    "świeży przegląd": "свежий техосмотр", "brak (auto nowe)": "нет (новое авто)", "wersja niemiecka": "немецкая версия", "wersja szwedzka": "шведская версия", "wersja polska": "польская версия", "wersja holenderska": "нидерландская версия", "od ręki": "сразу",
    "Osoba prywatna": "Частное лицо", "Dealer": "Дилер", "tak": "да",
    "wyrejestrowany": "снят с учёта", "zarejestrowany na Białorusi": "на учёте в Беларуси", "zarejestrowany w Rosji": "на учёте в России",
    "zarejestrowany za granicą": "на учёте за границей", "zarejestrowany w Polsce": "зарегистрирован в Польше",
  };
  // Then word by word (colours, upholstery, "do 08/2027"). \b knows only
  // Latin letters ("żółty" has none at its edge): whole words by Unicode.
  const word = (text) => new RegExp(`(?<!\\p{L})${text}(?!\\p{L})`, "gu");
  const WORDS = [
    ...Object.entries({
      czarny: "чёрный", biały: "белый", szary: "серый", srebrny: "серебристый", niebieski: "синий", bordowy: "бордовый", czerwony: "красный",
      zielony: "зелёный", brązowy: "коричневый", beżowy: "бежевый", żółty: "жёлтый", pomarańczowy: "оранжевый", złoty: "золотистый",
      fioletowy: "фиолетовый", metalik: "металлик", perłowy: "перламутр", półskórzana: "частично кожа", ekoskóra: "экокожа", skórzana: "кожа",
      welurowa: "велюр", materiałowa: "ткань", Alcantara: "алькантара", miesiące: "мес.", miesięcy: "мес.", miesiąc: "мес.", "mies\\.": "мес.",
      lat: "лет", rok: "год", lata: "года", łączona: "комбинированный", jasny: "светлый", ciemny: "тёмный", dwukolorowy: "двухцветный", błękitny: "голубой", granatowy: "тёмно-синий", matowy: "матовый",
    }).map(([from, to]) => [word(from), to]),
    [/^do (\d{2}\/\d{4})$/u, "до $1"],
  ];
  function value(text) {
    const source = String(text ?? "").trim();
    if (!source) return "";
    if (Object.prototype.hasOwnProperty.call(VALUES, source)) return VALUES[source];
    const lower = source.toLowerCase();
    const exact = Object.keys(VALUES).find((key) => key.toLowerCase() === lower);
    if (exact) return VALUES[exact];
    return WORDS.reduce((result, [pattern, word]) => result.replace(pattern, word), source);
  }

  // The options as offer-equipment.js names them in Polish.
  const OPTIONS = {
    "Szyberdach lub dach panoramiczny": "Люк или панорамная крыша", "Dach panoramiczny": "Панорамная крыша", "Szyberdach": "Люк",
    "Tapicerka skórzana": "Кожаный салон", "Tapicerka półskórzana": "Частично кожаный салон", "Reflektory Matrix LED": "Фары Matrix LED",
    "Reflektory LED": "Светодиодные фары", "Reflektory ksenonowe lub LED": "Ксеноновые или LED-фары",
    "Aktywny tempomat (ACC)": "Адаптивный круиз-контроль (ACC)", "Wyświetlacz Head-Up": "Проекция на лобовое стекло (Head-Up)",
    "Kamera 360°": "Камера 360°", "Kamera cofania": "Камера заднего вида", "Nawigacja": "Навигация", "Ogrzewanie postojowe": "Автономный отопитель",
    "Wentylowane fotele": "Вентиляция сидений", "Fotele z masażem": "Сиденья с массажем", "Podgrzewane fotele": "Подогрев сидений",
    "Podgrzewana kierownica": "Подогрев руля", "Elektryczne fotele": "Электрорегулировка сидений", "System audio premium": "Премиальная аудиосистема",
    "Zawieszenie pneumatyczne": "Пневмоподвеска", "Napęd 4x4": "Полный привод 4x4", "Hak holowniczy": "Фаркоп", "Dostęp bezkluczykowy": "Бесключевой доступ",
    "Elektryczna klapa bagażnika": "Электропривод багажника", "Cyfrowe zegary": "Цифровая приборная панель",
    "Apple CarPlay / Android Auto": "Apple CarPlay / Android Auto", "Asystent martwego pola": "Контроль слепых зон",
    "Asystent pasa ruchu": "Удержание в полосе", "Asystent parkowania": "Ассистент парковки", "Klimatyzacja automatyczna": "Климат-контроль",
    "Kontrola trakcji": "Антипробуксовочная система", "Przyciemniane szyby": "Тонированные стёкла", "Ostrzeganie o odległości": "Предупреждение о дистанции",
    "Opony całoroczne": "Всесезонные шины", "Opony zimowe": "Зимние шины", "Opony letnie": "Летние шины", "Podłokietnik": "Подлокотник",
    "Asystent ruszania pod górę": "Помощь при старте в гору", "Adaptacyjne światła drogowe": "Адаптивный дальний свет",
    "Asystent świateł drogowych": "Автоматический дальний свет", "Komputer pokładowy": "Бортовой компьютер", "Elektryczne szyby": "Электростеклоподъёмники",
    "Elektryczne lusterka": "Электрозеркала", "Elektrycznie składane lusterka": "Электроскладывание зеркал",
    "Elektryczna regulacja foteli": "Электрорегулировка сидений", "Immobilizer": "Иммобилайзер", "Zestaw głośnomówiący": "Громкая связь",
    "Napęd na przód": "Передний привод", "Napęd na tył": "Задний привод", "Gwarancja": "Гарантия", "Siatka oddzielająca bagażnik": "Сетка багажника",
    "Ogranicznik prędkości": "Ограничитель скорости", "Lusterko fotochromatyczne": "Автозатемнение зеркала", "Świeży serwis": "Свежее ТО",
    "Doświetlanie zakrętów": "Подсветка поворотов", "Reflektory Full LED": "Фары Full LED", "Światła dzienne LED": "Дневные ходовые огни LED",
    "Światła dzienne": "Дневные ходовые огни", "Skórzana kierownica": "Кожаный руль", "Felgi aluminiowe": "Литые диски", "Czujnik zmierzchu": "Датчик света",
    "Podparcie lędźwiowe": "Поясничная поддержка", "Kierownica wielofunkcyjna": "Мультифункциональный руль", "Streaming muzyki": "Стриминг музыки",
    "Wykrywanie zmęczenia": "Контроль усталости водителя", "Światła przeciwmgielne": "Противотуманные фары", "Auto dla niepalących": "Некурящий владелец",
    "Asystent hamowania awaryjnego": "Экстренное торможение", "System eCall": "Система eCall", "Zestaw naprawczy": "Ремкомплект шин",
    "Radio DAB": "Радио DAB", "Radio": "Радио", "Czujnik deszczu": "Датчик дождя", "Czujniki ciśnienia w oponach": "Датчики давления в шинах",
    "Książka serwisowa": "Сервисная книжка", "Wspomaganie kierownicy": "Усилитель руля", "System audio": "Аудиосистема",
    "Sterowanie głosowe": "Голосовое управление", "Tempomat": "Круиз-контроль", "Ekran dotykowy": "Сенсорный экран",
    "Rozpoznawanie znaków": "Распознавание знаков", "Pakiet zimowy": "Зимний пакет", "Centralny zamek": "Центральный замок",
    "Centralny zamek z pilotem": "Центральный замок с пультом", "Klimatyzacja 2-strefowa": "2-зонный климат-контроль",
    "Klimatyzacja 3-strefowa": "3-зонный климат-контроль", "Klimatyzacja 4-strefowa": "4-зонный климат-контроль", "Klimatyzacja": "Кондиционер",
    "Poduszki tylne": "Задние подушки безопасности", "Poduszka pasażera": "Подушка пассажира", "Poduszka kierowcy": "Подушка водителя",
    "Kurtyny powietrzne": "Шторки безопасности", "Poduszki boczne": "Боковые подушки", "Reflektory bi-ksenonowe": "Биксеноновые фары",
    "Reflektory ksenonowe": "Ксеноновые фары", "Czujniki parkowania": "Парктроники", "Czujniki parkowania tył": "Задние парктроники",
    "Czujniki parkowania przód": "Передние парктроники", "Dzielona kanapa": "Раздельная спинка заднего сиденья",
    "Oświetlenie ambientowe": "Контурная подсветка салона", "Fotele sportowe": "Спортивные сиденья", "Pakiet sportowy": "Спортивный пакет",
    "Zawieszenie sportowe": "Спортивная подвеска", "Relingi dachowe": "Рейлинги", "Alarm": "Сигнализация", "Ładowarka indukcyjna": "Беспроводная зарядка",
    "Hotspot Wi-Fi": "Wi-Fi hotspot", "Podgrzewana przednia szyba": "Обогрев лобового стекла", "Reflektory laserowe": "Лазерные фары",
    "Adaptacyjne doświetlanie zakrętów": "Адаптивная подсветка поворотов", "Elektryczne fotele z pamięcią": "Электросиденья с памятью",
    "Filtr cząstek stałych": "Сажевый фильтр", "Noktowizor": "Система ночного видения", "Asystent zmiany pasa": "Ассистент смены полосы",
    "Otwór na narty": "Люк для лыж", "Asystent wyjazdu z parkingu": "Ассистент выезда с парковки", "Paliwo E10": "Подходит для E10",
    "Bagażnik dachowy": "Багажник на крышу", "Tuning": "Тюнинг", "Kierownica sportowa": "Спортивный руль", "Poduszki przednie": "Фронтальные подушки",
    "Poduszki przednie i boczne": "Фронтальные и боковые подушки", "Gwarancja sprzedawcy": "Гарантия продавца",
    // av.by's options (2026-10-10).
    "Poduszki kolanowe": "Коленные подушки", "Kamera przednia": "Передняя камера", "Klimatyzacja wielostrefowa": "Многозонный климат-контроль",
    "Podgrzewane lusterka": "Обогрев зеркал", "Ekran multimedialny": "Мультимедийный экран", "Zdalny rozruch silnika": "Автозапуск двигателя",
    "Elektryczne szyby przednie": "Передние электростеклоподъёмники", "Elektryczne szyby tylne": "Задние электростеклоподъёмники",
    "Wykrywanie pieszych": "Обнаружение пешеходов", "Blokada tylnych drzwi": "Блокировка задних дверей", "Domykanie drzwi": "Доводчики дверей",
    "Asystent zjazdu ze wzniesienia": "Помощь при спуске", "Osłona silnika": "Защита картера", "Elektryczne stopnie": "Электрические пороги",
    "Rolety przeciwsłoneczne": "Шторки на окна", "Światła adaptacyjne": "Адаптивное освещение", "Spryskiwacze reflektorów": "Омыватель фар",
    "Automatyczna regulacja reflektorów": "Автокорректор фар", "Pamięć ustawień foteli": "Память положения сидений",
    "Bezdotykowe otwieranie bagażnika": "Открытие багажника без рук", "Gniazdo 12 V": "Розетка 12 В", "Gniazdo 220 V": "Розетка 220 В",
    "Gniazdo 110 V": "Розетка 110 В", "Elektryczna regulacja kierownicy": "Электрорегулировка руля",
    // Marktplaats / 2dehands and Blocket (2026-10-10).
    "CD / MP3": "CD / MP3", "Przystosowany dla niepełnosprawnych": "Адаптирован для людей с инвалидностью", "Reflektory adaptacyjne": "Адаптивные фары",
    "Poduszki powietrzne": "Подушки безопасности", "Asystent jazdy autonomicznej": "Ассистент автономного вождения", "Ładowanie dwukierunkowe": "Двунаправленная зарядка",
    "Elektroniczny hamulec postojowy": "Электронный стояночный тормоз", "Ostrzeganie o opuszczeniu pasa": "Предупреждение о выходе из полосы",
    "Oświetlenie LED": "Светодиодное освещение", "Markiza": "Маркиза", "Lakier metalik": "Краска металлик", "Kamera parkowania": "Камера парковки",
    "Drzwi przesuwne": "Сдвижная дверь", "Podgrzewane tylne fotele": "Подогрев задних сидений", "Pompa ciepła": "Тепловой насос",
    "Hak holowniczy (stały)": "Фаркоп (несъёмный)", "Hak holowniczy (odpinany/chowany)": "Фаркоп (съёмный / складной)", "Hak holowniczy (elektryczny)": "Фаркоп (электрический)",
    "Hak holowniczy (chowany)": "Фаркоп (складной)", "Hak holowniczy (odpinany)": "Фаркоп (съёмный)", "Podgrzewane fotele przednie": "Подогрев передних сидений",
    "Podgrzewane fotele tylne": "Подогрев задних сидений", "Podgrzewacz silnika (230 V)": "Подогреватель двигателя (230 В)", "Ogrzewacz kabiny (230 V)": "Обогреватель салона (230 В)",
    "Ogrzewanie postojowe z timerem": "Автономный отопитель с таймером", "Czujniki parkowania przód i tył": "Парктроники спереди и сзади",
    "Uruchamianie bezkluczykowe": "Бесключевой запуск", "Szyberdach lub dach szklany": "Люк или стеклянная крыша", "Tapicerka materiałowa": "Тканевый салон",
    "Adaptacyjne reflektory": "Адаптивные фары", "Regulacja odcinka lędźwiowego": "Регулировка поясничного подпора", "Składana kanapa": "Складное заднее сиденье",
    "Auto Hold": "Auto Hold", "Opony letnie na felgach aluminiowych": "Летние шины на литых дисках", "Opony zimowe na felgach aluminiowych": "Зимние шины на литых дисках",
  };
  function option(label) {
    const text = String(label || "");
    if (OPTIONS[text]) return OPTIONS[text];
    const audio = text.match(/^Audio (.+)$/);
    return audio ? `Аудиосистема ${audio[1]}` : text;
  }

  const COUNTRY = { DE: "Германия", NL: "Нидерланды", BE: "Бельгия", AT: "Австрия", LU: "Люксембург", FR: "Франция", IT: "Италия", ES: "Испания", CZ: "Чехия", SK: "Словакия", SE: "Швеция", DK: "Дания", CH: "Швейцария", PL: "Польша", SI: "Словения", HU: "Венгрия", PT: "Португалия", BY: "Беларусь", LT: "Литва", LV: "Латвия", EE: "Эстония" };
  const COUNTRY_IN = { DE: "в Германии", NL: "в Нидерландах", BE: "в Бельгии", AT: "в Австрии", LU: "в Люксембурге", FR: "во Франции", IT: "в Италии", ES: "в Испании", CZ: "в Чехии", SE: "в Швеции", DK: "в Дании", PL: "в Польше", BY: "в Беларуси" };

  // Russian plural: 1, 21 отзыв; 2–4, 22 отзыва (not 12–14); 5+, 11–14 отзывов.
  function plural(count, one, few, many) {
    const n = Math.abs(Math.round(Number(count) || 0));
    const last = n % 10;
    const lastTwo = n % 100;
    if (last === 1 && lastTwo !== 11) return one;
    return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
  }

  // The calculator's own lines (src/main.jsx keeps PL and RU side by side) —
  // for a calculation inserted in Polish before the offer became Russian.
  const CALC = {
    "Zakup bezpośredni": "Прямая покупка", "Dealerzy VAT 23%": "Дилеры VAT 23%", "Dealerzy VAT Marża": "Дилеры VAT Marża",
    "Cena pojazdu": "Цена автомобиля", "Cena pojazdu netto": "Цена авто netto", "Cena pojazdu brutto": "Цена авто brutto",
    "Oględziny specjalisty": "Осмотр специалиста", "Oględziny specjalisty netto": "Осмотр специалиста netto", "Oględziny": "Осмотр",
    "Transport na lawecie": "Транспорт на автовозе", "Transport na lawecie netto": "Транспорт на автовозе netto", "Dostawa na lawecie": "Доставка на автовозе",
    "Transport": "Транспорт", "Akcyza": "Акциз", "Prowizja AUTOGOOD": "Комиссия AUTOGOOD", "Prowizja firmy niemieckiej": "Комиссия немецкой фирмы",
    "Przegląd techniczny": "Техосмотр", "Tłumaczenie dokumentów": "Перевод документов", "Rejestracja": "Регистрация", "Rabat": "Скидка",
    "Opłata aukcyjna": "Аукционный сбор", "Opłata aukcyjna netto": "Аукционный сбор netto", "Pozostałe opłaty": "Прочие сборы", "Razem": "Итого",
  };
  function calc(label) {
    const text = String(label || "").trim();
    if (CALC[text]) return CALC[text];
    const vat = text.match(/^VAT (\d+%)$/);
    return vat ? `VAT ${vat[1]}` : text;
  }

  const api = { value, option, country: (code) => COUNTRY[String(code || "").toUpperCase()] || "", countryIn: (code) => COUNTRY_IN[String(code || "").toUpperCase()] || "", plural, calc };
  if (typeof window !== "undefined") window.AUTOGOOD_OFFER_RU = api;
  if (typeof globalThis !== "undefined") globalThis.AUTOGOOD_OFFER_RU = api;
})();
