(() => {
  // The same button sits in the offer panel and under the form.
  const analysisOpens = Array.from(document.querySelectorAll("[data-mobile-market-analysis-open]"));
  const analysisOpen = analysisOpens[0];
  const analysisBack = document.querySelector("[data-mobile-market-analysis-back]");
  const analysisView = document.querySelector("[data-mobile-market-analysis-view]");
  const analysisContent = document.querySelector("[data-mobile-market-analysis-content]");
  const manualView = document.querySelector('[data-mobile-method-view="manual"]');
  const listingFrame = document.querySelector(".mobileListingSearch");
  // Four pages: search (link card + manual form), analysis, history and the
  // favourites' search. Showing the analysis hides the search page and the
  // two other pages.
  const historyView = document.querySelector('[data-mobile-page-view="history"]');
  const favoritesView = document.querySelector('[data-mobile-page-view="favorites"]');
  const favoritesPage = document.querySelector("[data-mobile-favorites-page]");
  const favoritesBar = document.querySelector("[data-mobile-favorites-bar]");
  const setManualViewHidden = (hidden) => {
    manualView.hidden = hidden;
    if (listingFrame) listingFrame.hidden = hidden;
    if (historyView) historyView.hidden = true;
    if (favoritesView) favoritesView.hidden = true;
  };
  const historySaves = Array.from(document.querySelectorAll("[data-mobile-market-history-save]"));
  // The search history sits at the bottom of the search page (page 3 is the
  // price history of favourites).
  const historyLists = Array.from(document.querySelectorAll("[data-mobile-market-history-list]"));
  const historyCounts = Array.from(document.querySelectorAll("[data-mobile-market-history-count]"));
  const historyList = historyLists[0];
  const historyCount = historyCounts[0];
  const historyDone = document.querySelector("[data-mobile-history-done]");

  if (!analysisOpen || !analysisBack || !analysisView || !analysisContent || !manualView || !historySaves.length || !historyList || !historyCount) return;

  const marketCopy = {
    pl: {
      analysisButton: "Analiza rynku",
      saveButton: "Zapisz dane",
      saveSuccess: "Dane zapisane w historii.",
      historyUpdateSuccess: "Dane wpisu zostały zaktualizowane.",
      historyConfirm: "Zapisz zmiany w tym wpisie",
      historyDone: "Gotowe",
      favoritesHeading: "Ulubione auta",
      favoritesSearchEmpty: "Nie masz jeszcze ulubionych aut. Oznacz wyszukiwanie gwiazdką ★ w panelu „Aktualne oferty” albo w historii.",
      marketPickerLabel: "Porównywane rynki",
      marketPickerLast: "Co najmniej jeden rynek musi zostać wybrany.",
      favoriteRemove: "Usuń z ulubionych",
      statsHeading: "Statystyki",
      turnkeyShort: "na gotowo*",
      turnkeyShortBy: "pod klucz z ocleniem*",
      turnkeyFootnoteBy: "Ceny aut z Niemiec (mobile.de i AutoScout24) są orientacyjne. „Cena auta” — netto, gdy sprzedawca wykazuje VAT (przy wywozie z UE VAT jest zwracany: cenę brutto z oznaczeniem „¹” dzieli się przez 1 + stawkę VAT kraju, w Niemczech przez 1,19), w innym razie brutto. „Z dostawą do Mińska” — cena auta + transport do Polski (średnio ok. 2 500 PLN) + transport Warszawa — Mińsk 600 € + usługa AUTOGOOD 825 BYN. „Pod klucz z ocleniem” — do tego cło, opłata utylizacyjna (624,92 BYN dla aut do 3 lat, 1 282,02 BYN dla starszych), opłata celna 120 BYN, agencja celna 350 BYN, skład celny ok. 110 BYN (zwykle 3 dni) i EPTS 170 BYN. Cło zależy od wieku i pojemności silnika: do 3 lat — 48–54% wartości, ale nie mniej niż 2,5–20 € za 1 cm³ (zależnie od ceny); 3–5 lat — od 1,5 € za 1 cm³ (do 1000 cm³) do 3,6 € za 1 cm³ (powyżej 3000 cm³); powyżej 5 lat — od 3,0 do 5,7 € za 1 cm³. Auta elektryczne są zwolnione z cła. Pojemność silnika, cena netto i data rejestracji pochodzą z każdego ogłoszenia. Kwoty przeliczone na USD po oficjalnym kursie NBRB z {date}. Z ulgą celną 50% (Dekret nr 140: rodziny wielodzietne, osoby z niepełnosprawnością I i II grupy) cło jest o połowę niższe — średnio o {saving} taniej. Dla aut w wieku 3–5 lat stawkę i prawo do ulgowego oclenia trzeba sprawdzić po dokładnej dacie produkcji konkretnego auta. Dokładną kwotę przygotuje menedżer AUTOGOOD.",
      byCarPrice: "Cena auta",
      byNet: "netto",
      byGross: "brutto",
      byNetGross: "netto / brutto",
      byDelivered: "z dostawą do Mińska",
      byTurnkey: "pod klucz z ocleniem",
      byDetailsProgress: "Sprawdzam pojemność silnika, cenę netto i datę rejestracji w ogłoszeniach mobile.de: {done} z {total}.",
      byDetailsMissing: "Nie pokazano ogłoszeń bez znanej pojemności silnika: {missing}. Aby sprawdzić ogłoszenia mobile.de, uruchom importer mobile.de.",
      conclusionByCheaper: "Po doliczeniu transportu, oclenia i wszystkich opłat auto z Niemiec ({portal}) „pod klucz” w Mińsku wychodzi średnio o {amount} ({percent}%) taniej niż podobne na av.by.",
      conclusionByDearer: "Po doliczeniu transportu, oclenia i wszystkich opłat auto z Niemiec ({portal}) „pod klucz” w Mińsku wychodzi średnio o {amount} ({percent}%) drożej niż podobne na av.by.",
      priceHistoryIntro: "Każdy monitoring i „Analiza rynku” dopisuje nowy wiersz z datą; wcześniejsze zostają na zawsze. Auto wybierasz na pasku ulubionych u góry.",
      priceHistoryFiltersChanged: "Od tego monitoringu zmienione filtry: {filters}",
      priceHistoryPricesChanged: "Od tego monitoringu zmieniona cena na portalach",
      monitoringHeading: "Monitoring",
      monitoringIntro: "Wybierz auto na pasku ulubionych u góry: zobaczysz nowe i zniknięte ogłoszenia od poprzedniego monitoringu.",
      monitoringNoFavorites: "Nie masz jeszcze ulubionych aut. Oznacz wyszukiwanie gwiazdką ★ na stronie 1 — tutaj pojawi się jego monitoring.",
      monitoringSwitch: "Włącz monitoring",
      monitoringOn: "Codziennie o 9:00. Dopóki serwer automatyzacji nie działa, monitoring rusza, gdy program jest otwarty: o 9:00 albo przy pierwszym otwarciu po 9:00.",
      monitoringOff: "Monitoring tylko po kliknięciu „Uruchom monitoring”.",
      monitoringParams: "Parametry wyszukiwania",
      monitoringEditParams: "Zmień parametry",
      monitoringPortals: "Portale i cena auta (brutto)",
      monitoringPortalsHint: "Puste pola = cena z filtrów (strona 1); wpisana cena działa tylko na tym portalu, w każdym monitoringu tego auta. Wybór portali działa w całym programie (strona 1 i analiza).",
      monitoringPriceChanged: "Zmienione — zadziała przy następnym monitoringu.",
      monitoringFrom: "od",
      monitoringTo: "do",
      monitoringConverter: "Przelicznik walut",
      monitoringAvgRate: "Średni kurs (Walutomat)",
      monitoringCalcRate: "Kurs do wyliczeń",
      monitoringCheck: "Uruchom monitoring",
      monitoringChecking: "Monitoring w toku…",
      monitoringLastCheck: "Ostatni monitoring: {date}",
      monitoringComparedWith: "porównanie z monitoringiem z {date}",
      monitoringNeverChecked: "To auto nie ma jeszcze monitoringu z listą ogłoszeń. Pierwszy monitoring to baza, następne pokażą nowe i zniknięte ogłoszenia.",
      monitoringBaseline: "Pierwszy monitoring = baza ({count} ogłoszeń). Nowe i zniknięte pokaże następny monitoring.",
      monitoringOffers: "Ogłoszeń",
      monitoringNew: "Nowe",
      monitoringGone: "Zniknęły",
      monitoringGoneHint: "sprzedane lub zdjęte",
      monitoringSample: "≈ lista niepełna",
      monitoringAllPortals: "Wszystkie portale",
      monitoringViewNew: "Nowe",
      monitoringViewGone: "Zniknęły",
      monitoringViewAll: "Pełna lista",
      monitoringPower: "Moc",
      monitoringEmptyList: "Brak ogłoszeń spełniających filtry listy.",
      monitoringExtended: "Rozszerzony monitoring: historia dzień po dniu",
      monitoringExtendedHide: "Ukryj rozszerzony monitoring",
      monitoringFailed: "{error}",
      monitoringAutoRunning: "Monitoring: {car}…",
      monitoringNewBase: "Parametry, cena, portale lub kraje zmienione od poprzedniego monitoringu: ten monitoring to nowa baza ({count} ogłoszeń). Nowe i zniknięte pokaże następny monitoring.",
      monitoringVatDeductible: "brutto · netto {net} (VAT do odliczenia)",
      monitoringVatNet: "netto + VAT 23% = {gross} brutto",
      monitoringVatDeductibleOnly: "brutto · VAT do odliczenia",
      monitoringVatInvoice: "Faktura VAT",
      monitoringFromDescription: "z opisu",
      monitoringVatMargin: "VAT marża",
      monitoringVatPrivate: "osoba prywatna · bez VAT",
      monitoringVatGross: "brutto",
      monitoringDetails: "Wyposażenie…",
      monitoringDetailsHide: "Zwiń",
      monitoringDetailsLoading: "Wczytuję ogłoszenie…",
      monitoringDetailsFailed: "Nie udało się wczytać ogłoszenia.",
      monitoringDetailsUnavailable: "Ten portal nie podaje wyposażenia w liście — otwórz ogłoszenie.",
      monitoringDetailsNone: "Ogłoszenie nie podaje wyposażenia.",
      monitoringMore: "dalej… (+{count})",
      monitoringLess: "mniej",
      monitoringSave: "Zapisz to auto",
      monitoringUnsave: "Usuń z zapisanych",
      monitoringViewSaved: "★ Zapisane",
      monitoringSavedGone: "zniknęło z listy",
      monitoringSavedAt: "zapisane {date}",
      monitoringCountries: "Kraje (mobile.de + AutoScout24)",
      monitoringCountriesHint: "Wyszukiwanie i monitoring w tych krajach; statystyki i analiza — według krajów ze strony 1.",
      monitoringAutoscout: "AutoScout24 — tylko ogłoszenia, których nie ma na mobile.de (ta sama cena i przebieg = duplikat)",
      monitoringAutoscoutNeedsMobile: "AutoScout24 działa w parze z mobile.de — włącz mobile.de.",
      monitoringDuplicates: "{count} duplikatów z mobile.de pominięto",
      monitoringNoScopeCheck: "Brak monitoringu z tymi portalami i krajami. Następny monitoring będzie bazą do porównań.",
      monitoringAllCountries: "{count} na mobile.de we wszystkich krajach",
      monitoringMissing: "Bez danych z: {portals} — portal nie odpowiedział, ten monitoring go nie obejmuje. Spróbuj ponownie za kilka minut.",
      monitoringSwitchOn: "Monitoring włączony",
      monitoringSettings: "Ustawienia monitoringu: portale, ceny, kraje, przelicznik walut",
      monitoringSince: "Monitoring od {date} · {days} · zapisanych monitoringów: {count}",
      monitoringNext: "Następny monitoring: {date}",
      monitoringNextNow: "zaraz (program jest otwarty)",
      monitoringToday9: "dziś o 9:00",
      monitoringTomorrow9: "jutro o 9:00",
      monitoringDay0: "od dziś",
      monitoringDay1: "dzień",
      monitoringDay2: "dni",
      monitoringDay5: "dni",
      monitoringProgressTitle: "Monitoring w toku:",
      monitoringProgressPages: "{done}/{total} stron",
      monitoringProgressCountries: "{done}/{total} krajów",
      monitoringProgressRun: "czytam…",
      monitoringProgressDone: "✓ {count} ogłoszeń",
      monitoringProgressFail: "✕ brak odpowiedzi",
      monitoringErrorModel: "{portal} nie znalazł tego modelu — sprawdź nazwę modelu na stronie 1.",
      monitoringErrorNone: "Żaden portal nie zwrócił ogłoszeń — sprawdź internet i spróbuj ponownie za kilka minut.",
      monitoringErrorTooFew: "Portale zwróciły mniej niż 3 ogłoszenia — poszerz parametry na stronie 1.",
      monitoringErrorGeneric: "Monitoring się nie udał — spróbuj ponownie. Jeśli to się powtarza, przekaż szczegóły: {detail}",
      monitoringApproxTitle: "Portal ma więcej ogłoszeń, niż program czyta naraz — liczby nowych i zniknętych są przybliżone.",
      monitoringReadOf: "przeczytano {read} z {total}",
      monitoringSort: "Sortuj:",
      monitoringSortPrice: "cena",
      monitoringSortYear: "rok",
      monitoringSortMileage: "przebieg",
      monitoringSortListed: "data pojawienia się",
      monitoringSortDir: "Zmień kierunek sortowania",
      monitoringOnlyVat: "tylko VAT do odliczenia",
      monitoringOnlyDealers: "tylko dealerzy",
      monitoringListedSince: "w ofercie od {date} · {days}",
      monitoringSeenSince: "w monitoringu od {date} · {days}",
      monitoringSeenBefore: "w ofercie co najmniej od {date} · {days}",
      monitoringListedTitle: "Data z portalu: kiedy wystawiono ogłoszenie.",
      monitoringSeenTitle: "Portal nie podaje daty: to dzień monitoringu, w którym auto pojawiło się po raz pierwszy.",
      monitoringSeenBeforeTitle: "Auto było już w pierwszym monitoringu — wystawione wcześniej, dokładnej daty portal nie podaje.",
      monitoringEmptyNew: "Brak nowych ogłoszeń od {date}. {next}.",
      monitoringEmptyGone: "Nic nie zniknęło od {date}. {next}.",
      monitoringEmptySaved: "Nic tu jeszcze nie ma — gwiazdka ☆ przy ogłoszeniu zapisuje auto tutaj, a z tej listy powstaje PDF dla klienta.",
      monitoringPdf: "PDF dla klienta",
      monitoringPdfEmpty: "Najpierw zapisz auta gwiazdką ☆ — PDF powstaje z listy „Zapisane”.",
      monitoringPdfTitle: "Wybrane auta: {car}",
      monitoringPdfSub: "AUTOGOOD · {date} · {count} aut · ceny z portali w dniu przygotowania",
      monitoringPdfWorking: "Przygotowuję PDF…",
      monitoringPdfReady: "PDF zapisany: {file}",
      monitoringPdfFailed: "Nie udało się zrobić PDF — spróbuj ponownie.",
      monitoringPdfFile: "Wybrane auta",
      monitoringPdfOpen: "Otwórz ogłoszenie",
      monitoringOfferLink: "{title} — otwórz ogłoszenie",
      priceHistoryComparedHint: "wybór rynków na stronie 1 „Wyszukiwanie”",
      offerHistoryHeading: "Rynek w wybranym dniu",
      offerHistoryIntro: "Wybierz datę pomiaru: wykres i lista pokazują ogłoszenia z tego dnia. „Porównaj z” nakłada drugą datę (szare kółka) i pokazuje, co się zmieniło.",
      offerHistoryNone: "Ogłoszenia z każdego pomiaru zapisujemy od 30.09.2026. Po następnym „Odśwież dane” pojawi się tu wykres i lista ogłoszeń z tego dnia.",
      offerHistoryNoOffers: "z tego dnia są tylko statystyki (bez listy ogłoszeń)",
      offerLoading: "Wczytuję ogłoszenia…",
      offerCompareWith: "Porównaj z",
      offerCompareNone: "bez porównania",
      offerFiltersBetween: "Między tymi datami zmieniono filtry — porównanie jest orientacyjne.",
      offerAxis: "miejsce w liście od najtańszej do najdroższej",
      offerLegendCurrent: "wybrany dzień",
      offerLegendCompare: "porównanie",
      offerListComplete: "pełna lista: {count} z {total}",
      offerListSample: "próbka: {count} z {total} — nowe i zniknięte niepewne",
      offerNoMarket: "Brak ogłoszeń tego rynku w wybranym dniu.",
      offerChangesHeading: "Ogłoszenia i zmiany",
      offerStatus: "Status",
      offerAd: "Ogłoszenie",
      offerYear: "Rok",
      offerMileage: "Przebieg",
      offerPrice: "Cena",
      offerBefore: "Wcześniej",
      offerChange: "Zmiana",
      offerAll: "Wszystkie",
      offerNew: "Nowe",
      offerFirstSeen: "Pierwszy raz w próbce",
      offerGone: "Zniknęło",
      offerGoneGroup: "Zniknęły",
      offerOutside: "Poza próbką",
      offerCheaper: "Taniej",
      offerDearer: "Drożej",
      offerSame: "Bez zmian",
      offerCheaperAvg: "śr. {pct}",
      priceHistoryMarketEmpty: "Brak pomiarów dla tego rynku. Kliknij „Odśwież dane”, aby dodać pierwszy.",
      autoRefreshLabel: "Automatyczna aktualizacja",
      autoRefreshDaily: "codziennie",
      autoRefresh3Days: "co 3 dni",
      autoRefreshWeekly: "co tydzień",
      autoRefreshPending: "Ustawienie zapisane. Automatyczne pomiary zaczną się po podłączeniu serwera automatyzacji; do tego czasu nowy wiersz dodaje „Odśwież dane”.",
      priceHistoryNoFavorites: "Dodaj auto do ulubionych ★ — tutaj pojawi się historia jego cen.",
      priceHistoryEmptyEntry: "To auto nie ma jeszcze pomiarów cen. Kliknij „Odśwież dane”.",
      trendTitle: "Mediana ceny w czasie",
      trendNeedsTwo: "Wykres pojawi się po drugim pomiarze cen.",
      adPrice: "cena w ogłoszeniu",
      turnkeyFootnote: "Cena „na gotowo” składa się z: ceny brutto z ogłoszenia + przeciętnego kosztu transportu, oględzin, akcyzy według rodzaju i pojemności silnika, tłumaczeń dokumentów, przeglądu technicznego oraz wynagrodzenia AUTOGOOD. Żeby poznać dokładną wycenę konkretnej oferty, proszę się skontaktować z nami bezpośrednio.",
      conclusionHeading: "Wniosek",
      conclusionCheaper: "Nawet po doliczeniu wszystkich kosztów auto {country} wychodzi średnio o {amount} ({percent}%) taniej niż w Polsce.",
      conclusionDearer: "Po doliczeniu wszystkich kosztów auto {country} wychodzi średnio o {amount} ({percent}%) drożej niż w Polsce.",
      countryGermany: "z Niemiec",
      countrySweden: "ze Szwecji",
      countryNetherlands: "z Holandii",
      countryBelgium: "z Belgii",
      countryAustria: "z Austrii",
      countryLuxembourg: "z Luksemburga",
      countryAbroad: "z zagranicy",
      averageMileage: "Średni przebieg",
      cepikShare: "Historia CEPiK",
      importedShare: "Auta sprowadzone",
      shareOf: "{count} z {total}",
      accidentShare: "Bezwypadkowe",
      afterAccidentShort: "po wypadku: {percent}%",
      briefAccidents: "Wypadki",
      polishAccidents: "Tylko {percent}% sprzedających ({count} z {total}) deklaruje auto jako bezwypadkowe, {after}% przyznaje, że auto miało wypadek, a w {silent}% ogłoszeń nie ma tej informacji. To tylko deklaracja sprzedającego — otomoto jej nie sprawdza.",
      briefPrice: "Cena",
      briefMileage: "Przebieg",
      briefSafety: "Bezpieczeństwo",
      briefHistory: "Historia",
      briefOrigin: "Pochodzenie",
      conclusionTooFew: "Za mało ofert, żeby rzetelnie porównać rynki: Polska — {pl}, {portal} — {foreign} (potrzeba co najmniej {min} na każdym rynku). Poszerz filtry, np. rocznik albo przebieg.",
      conclusionSameCarCheaper: "Takie samo auto ({year} r., {mileage}) {from} kosztuje na gotowo ok. {foreign}, w Polsce ok. {pl} — o {amount} ({percent}%) taniej.",
      conclusionSameCarDearer: "Takie samo auto ({year} r., {mileage}) {from} kosztuje na gotowo ok. {foreign}, w Polsce ok. {pl} — o {amount} ({percent}%) drożej.",
      sameCarNote: "„Takie samo auto”: cena liczona osobno na każdym rynku z cen ofert, zależnie od rocznika i przebiegu (wyposażenie i stan nie są uwzględnione). Mediany wszystkich ofert: Polska {pl}, na gotowo {foreign}.",
      mediansNote: "Porównanie median wszystkich ofert. Do porównania aut z tym samym rocznikiem i przebiegiem potrzeba co najmniej {min} ofert na każdym rynku.",
      mileageLower: "Auta {from} mają średnio {foreign} przebiegu, w Polsce {pl} — o {diff} ({percent}%) mniej. Mniejszy przebieg to mniejsze zużycie, mniejsze ryzyko przebytych szkód i lepszy stan techniczny, a przy odsprzedaży takie auto lepiej trzyma wartość.",
      mileageHigher: "Auta {from} mają średnio {foreign} przebiegu, w Polsce {pl} — o {diff} ({percent}%) więcej.",
      conclusionBenefits: "Do tego zwykle mniejsze ryzyko, lepszy stan i udokumentowana historia serwisowa — każde auto sprawdzamy przed zakupem.",
      polishCepik: "Tylko {percent}% ogłoszeń ({count} z {total}) ma historię pojazdu potwierdzoną w CEPiK. W pozostałych przebieg i historia to wyłącznie deklaracja sprzedającego.",
      polishImported: "{percent}% aut z podanym krajem pochodzenia ({count} z {total}) to auta sprowadzone z zagranicy. Komis sprowadził je wcześniej i dolicza do ceny swoją marżę.",
      polishImportedFrom: "{percent}% aut z podanym krajem pochodzenia ({count} z {total}) to auta sprowadzone, najczęściej {from}. Komis sprowadził je wcześniej i dolicza do ceny swoją marżę.",
      polishOffer: "Z AUTOGOOD sprowadzasz auto bezpośrednio od sprzedającego za granicą: sprawdzone przed zakupem, z udokumentowaną historią i bez marży komisu.",
      originFrom: { d: "z Niemiec", b: "z Belgii", nl: "z Holandii", f: "z Francji", i: "z Włoch", a: "z Austrii", ch: "ze Szwajcarii", s: "ze Szwecji", dk: "z Danii", cz: "z Czech", usa: "z USA", cdn: "z Kanady", gb: "z Wielkiej Brytanii", l: "z Luksemburga", e: "z Hiszpanii", kr: "z Korei", n: "z Norwegii", fin: "z Finlandii", sk: "ze Słowacji", h: "z Węgier", lt: "z Litwy" },
      ccmProgress: "Sprawdzam pojemność silnika w ogłoszeniach mobile.de (akcyza): {done} z {total}…",
      ccmUnknown: "Bez pojemności silnika w ogłoszeniu: {count} {offers} — akcyza liczona jak dla silnika do 2000 cm³.",
      breakdownTitle: "Z czego składa się cena na gotowo* — przykład: auto {from} ze środka rynku (najbliżej mediany)",
      partCar: "Auto: {price} brutto × kurs {rate}",
      partTransport: "Transport (średnio, z VAT)",
      partInspection: "Oględziny (średnio, z VAT)",
      partExcise: "Akcyza {rate}%",
      partCommission: "Usługa AUTOGOOD (z VAT)",
      partFees: "Przegląd techniczny i tłumaczenia",
      partTotal: "Razem na gotowo",
      listScreenshotButton: "Kopiuj listę",
      listPdfButton: "Lista PDF",
      sourcesPicker: "Analiza rynków:",
      marketPickOn: "kliknij, aby porównać",
      marketPickOff: "kliknij, aby ukryć",
      sourceOn: "{source}: widoczne na wykresie — kliknij, aby ukryć",
      sourceOff: "{source}: ukryte — kliknij, aby pokazać",
      sourceFetch: "Pobierz oferty z mobile.de",
      sourceNoData: "mobile.de: brak danych — otwórz wyszukiwanie mobile.de (logo u góry) i kliknij tam zakładkę AUTOGOOD.",
      averagePrices: "Średnie ceny (P25–P75)",
      pdfButton: "Raport PDF",
      pdfWorking: "Przygotowuję raport PDF…",
      pdfReady: "Raport PDF zapisany: {file}",
      pdfFailed: "Nie udało się przygotować raportu PDF.",
      distributionHeading: "Rozkład cen",
      screenshotButton: "Kopiuj raport",
      screenshotCopied: "Raport skopiowany do schowka — wklej go w wiadomości do klienta.",
      screenshotOpened: "Przeglądarka nie pozwala kopiować obrazów — raport zapisano jako plik PNG (Pobrane).",
      screenshotFailed: "Nie udało się zrobić zrzutu raportu.",
      screenshotRetry: "Przeglądarka nie pozwoliła skopiować obrazu — kliknij przycisk jeszcze raz, obraz jest gotowy.",
      screenshotNoClipboard: "Ta przeglądarka nie pozwala kopiować obrazów. Użyj Chrome albo pobierz PDF.",
      screenshotWorking: "Przygotowuję raport…",
      screenshotPreparing: "Przygotowuję obraz… za chwilę można kopiować",
      reportTitle: "Analiza rynku",
      fileReport: "analiza rynku",
      fileList: "lista ofert",
      tableTitle: "Ogłoszenie",
      favoritesEmpty: "Oznacz wpis w historii gwiazdką ★ — pojawi się tutaj.",
      favoritesPick: "Wybierz auto z ulubionych albo wpisz markę i model w formularzu.",
      favoritesNoData: "brak cen",
      dataAtHint: "„Odśwież dane” zapisze nowy pomiar do historii cen.",
      priceHistoryHeading: "Historia cen",
      priceHistoryFirst: "Pierwszy pomiar. Każde odświeżenie danych doda kolejny — zobaczysz, jak zmienia się mediana.",
      priceHistoryDate: "Data",
      priceHistoryCount: "ofert",
      comparePrice: "Porównaj cenę (EUR)",
      comparePlaceholder: "np. 25 000",
      compareHint: "Wpisz cenę auta, a pokażemy je na wykresie.",
      comparedCar: "Porównywana cena",
      historyHeading: "Historia wyszukiwania",
      historyEmpty: "Nie masz jeszcze zapisanych wyszukiwań.",
      historyAnalysis: "Analiza rynku",
      historyOpenList: "Otwórz listę",
      historyDelete: "Usuń",
      otomotoFetching: "Pobieram oferty z otomoto.pl…",
      otomotoFetched: "Wczytano {count} z {total} ofert otomoto.pl.",
      mobileFetched: "Wczytano {count} z {total} ofert mobile.de.",
      blocketFetched: "Wczytano {count} z {total} ofert blocket.se.",
      autoscoutFetched: "AutoScout24: {count} ogłoszeń, których nie ma na mobile.de (z {total}; pominięto {duplicates} duplikatów).",
      autoscoutUnchecked: "AutoScout24: {count} z {total} ogłoszeń — bez mobile.de duplikatów nie da się odrzucić.",
      avbyFetched: "Wczytano {count} z {total} ofert av.by.",
      otomotoFailed: "Nie udało się pobrać ofert z otomoto.pl.",
      otomotoLabel: "Dane: otomoto.pl",
      mixedLabel: "Dane: otomoto.pl + mobile.de",
      mixedDescription: "Oferty otomoto.pl (PLN) i mobile.de (EUR przeliczone na PLN) na jednym wykresie.",
      otomotoDescription: "Próbka aktualnych ofert otomoto.pl z całej listy wyników (ceny w PLN).",
      verdictHeading: "Co to znaczy",
      verdictMedian: "Mediana ceny ofert: {median}.",
      verdictMiddle: "Średnie ceny: {low} – {high} ({count} {offers}).",
      verdictDeals: "Poniżej {low} jest {count} ofert — to dół rynku.",
      tableHeading: "Aktualne oferty",
      loadingHeading: "Pobieram aktualne oferty…",
      tablePrice: "Cena",
      tableYear: "Rok",
      tableMileage: "Przebieg",
      tableOpen: "Otwórz",
      tableSortHint: "Kliknij nagłówek, aby posortować.",
      axisMileage: "Oś pozioma: przebieg",
      sourceOtomoto: "otomoto.pl",
      sourceMobile: "mobile.de",
      sourceBlocket: "blocket.se",
      sourceAutoscout: "AutoScout24",
      sourceAvby: "av.by",
      marketsHeading: "Rynki",
      toneHigher: "najwyżej",
      toneLower: "najniżej",
      toneLegend: "▲ najwyżej · ▼ najniżej spośród porównywanych rynków (cena w Polsce: na gotowo albo z ogłoszenia; przebieg)",
      marketOtomoto: "Polska",
      compareHeading: "Porównanie rynków",
      compareHint: "ceny na gotowo*, zł — ta sama skala co wykresy poniżej",
      compareHintBy: "Niemcy: ceny pod klucz z ocleniem*, Białoruś: ceny z ogłoszeń; USD — ta sama skala co wykresy poniżej",
      compareLegend: "Prostokąt — średnie ceny (P25–P75), kreska — mediana, linia — od najtańszej do najdroższej oferty.",
      panelOffers: "{count} {offers}",
      guideLegend: "mediana innego rynku (dla porównania)",
      marketMobile: "Niemcy",
      marketBlocket: "Szwecja",
      marketAutoscout: "AutoScout24 (Niemcy i kraje z filtra)",
      marketAvby: "Białoruś",
      sourcesLabel: "Źródła ofert",
      axisLabel: "Oś pozioma",
      scaleLabel: "Skala cen",
      scaleShared: "Wspólna skala",
      scaleOwn: "Osobna skala",
      compareHintOwn: "ceny na gotowo*, zł — wykresy poniżej mają osobne skale",
      compareHintByOwn: "Niemcy: ceny pod klucz z ocleniem*, Białoruś: ceny z ogłoszeń; USD — wykresy poniżej mają osobne skale",
      axisRank: "Kolejność cen",
      axisMileageShort: "Przebieg",
      axisYearShort: "Rok",
      axisRankCaption: "Miejsce oferty na liście portalu posortowanej od najtańszej",
      axisMileageCaption: "Przebieg",
      axisYearCaption: "Rok produkcji",
      axisRankStart: "najtańsza",
      axisRankEnd: "najdroższa",
      trendLegend: "Mediana ceny",
      curveLegend: "Krzywa cen",
      hiddenNoAxis: "Bez tej wartości, więc poza wykresem: {count} {offers}.",
      tableSource: "Rynek",
      tableLink: "Link",
      sourceEmpty: "brak danych",
      fetchMobile: "Pobierz z mobile.de ↗",
      fetchMobileHint: "Lista mobile.de otwarta w nowej karcie — kliknij tam zakładkę „AUTOGOOD”. Oferty trafią na wykres.",
      mobileAdded: "Dodano {count} {offersAcc} mobile.de (z {total}).",
      mobilePending: "Oferty mobile.de ({count}) czekają — otwórz Analizę rynku dla tego auta.",
      bookmarkletInstall: "Zakładka do mobile.de:",
      bookmarkletInstallHint: "przeciągnij na pasek zakładek",
      yourCar: "To auto",
      yourCarVerdict: "To auto: {price} — taniej niż {share}% ofert, {diff} mediany.",
      belowMedian: "{pct}% poniżej",
      aboveMedian: "{pct}% powyżej",
      atMedian: "na poziomie",
      yourCarMileageVerdict: "Przy takim przebiegu mediana to około {reference} — cena tego auta jest {diff} mediany.",
      yourCarYearVerdict: "Dla tego rocznika mediana to około {reference} — cena tego auta jest {diff} mediany.",
      axisYear: "Oś pozioma: rok",
      historyPin: "Zapisz na stałe",
      historyPinned: "Zapisane na stałe",
      historyPinnedBadge: "Zapisane",
      historyUnpin: "Usuń z zapisanych",
      historySaveHint: "{count} / {limit} ostatnich sprawdzeń",
      historyReady: "{count} {offers} · wykres gotowy",
      historyWaiting: "Brak danych rynku",
      historyStorageError: "Nie udało się zapisać historii w tej przeglądarce.",
      backToFilters: "← Wróć do filtrów",
      heading: "Analiza rynku",
      waitingLabel: "Brak danych ofert",
      waitingDescription: "Wczytaj ceny ofert, aby zbudować analizę.",
      importedLabel: "Dane importowane",
      importedDescription: "Wykres przygotowany z wczytanych cen ofert.",
      importHeading: "Źródło cen",
      importDescription: "Ceny pobierane są automatycznie z otomoto.pl. Mobile.de można wczytać z pliku JSON lub CSV (kolumna price w EUR) — plik zostaje tylko w tej przeglądarce.",
      importButton: "Importuj JSON / CSV",
      clearImport: "Usuń zaimportowane oferty",
      importedFile: "Wczytano {count} ofert z pliku {file}.",
      importInvalid: "Plik musi zawierać co najmniej 3 poprawne oferty z ceną w EUR.",
      importReadError: "Nie udało się odczytać pliku JSON / CSV.",
      chartTitle: "Rozkład cen ofert",
      lowMarket: "Dół rynku",
      middleMarket: "Średnie ceny",
      highMarket: "Góra rynku",
      count: "Liczba ofert",
      minimum: "Najtańsze ogłoszenie",
      median: "Mediana",
      middleRange: "Średnie ceny (P25–P75)",
      middleOffers: "Oferty w zakresie",
      sampleDate: "Ceny ofert · stan na {date}",
      limitedSample: "Mała próba: typowa cena może być niestabilna. Do oceny auta potrzeba co najmniej 8 ofert.",
      priceFilterWarning: "Filtr ceny ogranicza porównanie. Usuń go, aby ocenić cały rynek.",
      wideRangeWarning: "Skrajne ceny mocno rozciągają skalę. Wszystkie oferty pozostają na wykresie.",
      maximum: "Najdroższe ogłoszenie",
      openSearch: "Otwórz wyszukiwanie mobile.de ↗",
      openOtomoto: "Otwórz listę otomoto.pl ↗",
      openBlocket: "Otwórz listę blocket.se ↗",
      openAvby: "Otwórz listę av.by ↗",
      pointHint: "Kliknij, aby otworzyć ogłoszenie",
      summaryVehicle: "Auto i sprzedawca",
      summaryParameters: "Parametry",
      summaryEquipment: "Wyposażenie",
      priceHistorySource: "Rynek",
      searchHeading: "Parametry poszukiwania",
      analysisCardHeading: "Analiza i rozkład cen",
      openSearches: "Otwórz wyszukiwania",
      checkedAt: "stan na {date}",
      priceHistoryOffers: "Oferty",
      countries: "Kraj",
      refresh: "Odśwież dane",
      refreshing: "Odświeżam dane rynku…",
      refreshUnavailable: "Źródło danych nie jest jeszcze podłączone.",
      refreshInvalid: "Źródło nie zwróciło co najmniej 3 cen ofert.",
      snapshotSaved: "Nowa kontrola zapisana w historii cen ({date}).",
      suspectsSkipped: "Poza statystyką: {count} {offers} (uszkodzone, na części, cesja / leasing albo cena poza 1/3–3× mediany) — szare kółka na wykresie.",
      suspectTag: "poza statystyką",
      suspectShort: "+{count} poza statystyką",
      offerForms: ["oferta", "oferty", "ofert"],
      offerFormsAcc: ["ofertę", "oferty", "ofert"],
      emptyHeading: "Brak realnych ofert do analizy",
      emptyDescription: "Kliknij „Odśwież dane”, aby pobrać oferty z wybranych portali.",
      missingVehicle: "Wybierz markę i model przed uruchomieniem analizy rynku.",
      invalidData: "Wybrane portale nie zwróciły co najmniej 3 poprawnych ogłoszeń.",
      preparing: "Przygotowuję analizę rynku…",
      mileage: "Przebieg",
      price: "Cena",
      year: "Rok",
      displacement: "Pojemność",
      power: "Moc",
      seats: "Liczba miejsc",
      doors: "Liczba drzwi",
      engine: "Silnik",
      gearbox: "Skrzynia",
      fuelPetrol: "Benzyna",
      fuelDiesel: "Diesel",
      fuelHybridDiesel: "Hybryda diesel",
      fuelHybridPetrol: "Hybryda benzyna",
      fuelElectric: "Elektryk",
      fuelPlugin: "Hybryda plug-in",
      gearboxAny: "Dowolna",
      gearboxAutomatic: "Automatyczna",
      gearboxManual: "Manualna",
    },
    ru: {
      analysisButton: "Анализ рынка",
      saveButton: "Сохрани данные",
      saveSuccess: "Данные сохранены в истории.",
      historyUpdateSuccess: "Данные записи обновлены.",
      historyConfirm: "Сохранить изменения в этой записи",
      historyDone: "Готово",
      favoritesHeading: "Избранные авто",
      favoritesSearchEmpty: "Избранных авто пока нет. Отметь поиск звёздочкой ★ в панели «Актуальные предложения» или в истории.",
      marketPickerLabel: "Сравниваемые рынки",
      marketPickerLast: "Должен остаться выбран хотя бы один рынок.",
      favoriteRemove: "Убрать из избранного",
      statsHeading: "Статистика",
      turnkeyShort: "под ключ*",
      turnkeyShortBy: "под ключ с растаможкой*",
      turnkeyFootnoteBy: "Цены у авто из Германии (mobile.de и AutoScout24) ориентировочные. «Цена авто» — нетто, если продавец выделяет НДС (при вывозе из ЕС НДС возвращается: цена брутто с пометкой «¹» делится на 1 + ставку НДС страны, в Германии на 1,19), иначе брутто. «С доставкой до Минска» — цена авто + доставка до Польши (в среднем ~2 500 PLN) + доставка Варшава — Минск 600 € + услуги AUTOGOOD 825 BYN. «Под ключ с растаможкой» — плюс таможенная пошлина, утилизационный сбор (624,92 BYN для авто до 3 лет, 1 282,02 BYN для более старых), таможенный сбор 120 BYN, услуги таможенного декларанта 350 BYN, услуги склада ~110 BYN (как правило, 3 дня) и оформление ЭПТС 170 BYN. Пошлина зависит от возраста и объёма двигателя: до 3 лет — 48–54 % стоимости, но не менее 2,5–20 € за 1 см³ (в зависимости от цены); от 3 до 5 лет — от 1,5 € за 1 см³ (до 1000 см³) до 3,6 € за 1 см³ (свыше 3000 см³); старше 5 лет — от 3,0 до 5,7 € за 1 см³. Электромобили пошлиной не облагаются. Объём двигателя, цена нетто и дата регистрации берутся из каждого объявления. Суммы пересчитаны в доллары по официальному курсу НБРБ на {date}. С таможенной льготой 50 % (Указ № 140: многодетные семьи, инвалиды I и II группы) пошлина вдвое ниже — в среднем на {saving} дешевле. Для авто в возрасте от 3 до 5 лет ставку и право на льготную растаможку нужно проверять по точной дате производства конкретного авто. Точную стоимость рассчитает менеджер AUTOGOOD.",
      byCarPrice: "Цена авто",
      byNet: "нетто",
      byGross: "брутто",
      byNetGross: "нетто / брутто",
      byDelivered: "с доставкой до Минска",
      byTurnkey: "под ключ с растаможкой",
      byDetailsProgress: "Уточняю объём двигателя, цену нетто и дату регистрации в объявлениях mobile.de: {done} из {total}…",
      byDetailsMissing: "Не показаны объявления без известного объёма двигателя: {missing}. Чтобы уточнить объявления mobile.de, запустите импортер mobile.de.",
      conclusionByCheaper: "С учётом доставки, растаможки и всех сборов авто из Германии ({portal}) под ключ в Минске обходится в среднем на {amount} ({percent} %) дешевле, чем аналогичное авто на av.by.",
      conclusionByDearer: "С учётом доставки, растаможки и всех сборов авто из Германии ({portal}) под ключ в Минске обходится в среднем на {amount} ({percent} %) дороже, чем аналогичное авто на av.by.",
      priceHistoryIntro: "Каждый мониторинг и «Анализ рынка» добавляет новую строку с датой; прошлые остаются навсегда. Авто выбирается в полосе избранного сверху.",
      priceHistoryFiltersChanged: "С этого мониторинга изменены фильтры: {filters}",
      priceHistoryPricesChanged: "С этого мониторинга изменена цена на порталах",
      monitoringHeading: "Мониторинг",
      monitoringIntro: "Выбери авто в полосе избранного сверху: увидишь новые и исчезнувшие объявления с прошлого мониторинга.",
      monitoringNoFavorites: "Избранных авто пока нет. Отметь поиск звёздочкой ★ на странице 1 — здесь появится его мониторинг.",
      monitoringSwitch: "Включить мониторинг",
      monitoringOn: "Каждый день в 9:00. Пока сервер автоматизации не запущен, мониторинг запускается, когда программа открыта: в 9:00 или при первом открытии после 9:00.",
      monitoringOff: "Мониторинг только по кнопке «Запустить мониторинг».",
      monitoringParams: "Параметры поиска",
      monitoringEditParams: "Изменить параметры",
      monitoringPortals: "Порталы и цена авто (брутто)",
      monitoringPortalsHint: "Пустые поля = цена из фильтров (страница 1); введённая цена действует только на этом портале, в каждом мониторинге этого авто. Выбор порталов действует во всей программе (страница 1 и анализ).",
      monitoringPriceChanged: "Изменено — сработает при следующем мониторинге.",
      monitoringFrom: "от",
      monitoringTo: "до",
      monitoringConverter: "Конвертер валют",
      monitoringAvgRate: "Средний курс (Walutomat)",
      monitoringCalcRate: "Курс для расчётов",
      monitoringCheck: "Запустить мониторинг",
      monitoringChecking: "Мониторинг идёт…",
      monitoringLastCheck: "Последний мониторинг: {date}",
      monitoringComparedWith: "сравнение с мониторингом от {date}",
      monitoringNeverChecked: "У этого авто ещё нет мониторинга со списком объявлений. Первый мониторинг — база, следующие покажут новые и исчезнувшие объявления.",
      monitoringBaseline: "Первый мониторинг = база ({count} объявлений). Новые и исчезнувшие покажет следующий мониторинг.",
      monitoringOffers: "Объявлений",
      monitoringNew: "Новые",
      monitoringGone: "Исчезли",
      monitoringGoneHint: "проданы или сняты",
      monitoringSample: "≈ список неполный",
      monitoringAllPortals: "Все порталы",
      monitoringViewNew: "Новые",
      monitoringViewGone: "Исчезли",
      monitoringViewAll: "Весь список",
      monitoringPower: "Мощность",
      monitoringEmptyList: "Нет объявлений под фильтры списка.",
      monitoringExtended: "Расширенный мониторинг: история по дням",
      monitoringExtendedHide: "Скрыть расширенный мониторинг",
      monitoringFailed: "{error}",
      monitoringAutoRunning: "Мониторинг: {car}…",
      monitoringNewBase: "С прошлого мониторинга изменены параметры, цена, порталы или страны: этот мониторинг — новая база ({count} объявлений). Новые и исчезнувшие покажет следующий мониторинг.",
      monitoringVatDeductible: "брутто · нетто {net} (НДС к вычету)",
      monitoringVatNet: "нетто + VAT 23% = {gross} брутто",
      monitoringVatDeductibleOnly: "брутто · НДС к вычету",
      monitoringVatInvoice: "Faktura VAT (счёт с НДС)",
      monitoringFromDescription: "из описания",
      monitoringVatMargin: "VAT marża (маржа)",
      monitoringVatPrivate: "частное лицо · без НДС",
      monitoringVatGross: "брутто",
      monitoringDetails: "Оснащение…",
      monitoringDetailsHide: "Свернуть",
      monitoringDetailsLoading: "Загружаю объявление…",
      monitoringDetailsFailed: "Не удалось загрузить объявление.",
      monitoringDetailsUnavailable: "Этот портал не даёт оснащение в списке — открой объявление.",
      monitoringDetailsNone: "В объявлении нет оснащения.",
      monitoringMore: "дальше… (+{count})",
      monitoringLess: "меньше",
      monitoringSave: "Сохранить это авто",
      monitoringUnsave: "Убрать из сохранённых",
      monitoringViewSaved: "★ Сохранённые",
      monitoringSavedGone: "исчезло из списка",
      monitoringSavedAt: "сохранено {date}",
      monitoringCountries: "Страны (mobile.de + AutoScout24)",
      monitoringCountriesHint: "Поиск и мониторинг в этих странах; статистика и анализ — по странам со страницы 1.",
      monitoringAutoscout: "AutoScout24 — только объявления, которых нет на mobile.de (та же цена и пробег = дубликат)",
      monitoringAutoscoutNeedsMobile: "AutoScout24 работает в паре с mobile.de — включи mobile.de.",
      monitoringDuplicates: "пропущено дубликатов с mobile.de: {count}",
      monitoringNoScopeCheck: "Нет мониторинга с этими порталами и странами. Следующий мониторинг станет базой для сравнения.",
      monitoringAllCountries: "{count} на mobile.de во всех странах",
      monitoringMissing: "Нет данных с: {portals} — портал не ответил, этот мониторинг его не включает. Попробуй ещё раз через несколько минут.",
      monitoringSwitchOn: "Мониторинг включён",
      monitoringSettings: "Настройки мониторинга: порталы, цены, страны, конвертер валют",
      monitoringSince: "Мониторинг с {date} · {days} · сохранено мониторингов: {count}",
      monitoringNext: "Следующий мониторинг: {date}",
      monitoringNextNow: "сейчас (программа открыта)",
      monitoringToday9: "сегодня в 9:00",
      monitoringTomorrow9: "завтра в 9:00",
      monitoringDay0: "с сегодня",
      monitoringDay1: "день",
      monitoringDay2: "дня",
      monitoringDay5: "дней",
      monitoringProgressTitle: "Мониторинг идёт:",
      monitoringProgressPages: "{done}/{total} стр.",
      monitoringProgressCountries: "{done}/{total} стран",
      monitoringProgressRun: "читаю…",
      monitoringProgressDone: "✓ {count} объявлений",
      monitoringProgressFail: "✕ нет ответа",
      monitoringErrorModel: "{portal} не нашёл эту модель — проверь название модели на странице 1.",
      monitoringErrorNone: "Ни один портал не вернул объявления — проверь интернет и попробуй ещё раз через несколько минут.",
      monitoringErrorTooFew: "Порталы вернули меньше 3 объявлений — расширь параметры на странице 1.",
      monitoringErrorGeneric: "Мониторинг не удался — попробуй ещё раз. Если повторяется, передай подробности: {detail}",
      monitoringApproxTitle: "На портале больше объявлений, чем программа читает за раз, — числа новых и исчезнувших примерные.",
      monitoringReadOf: "прочитано {read} из {total}",
      monitoringSort: "Сортировка:",
      monitoringSortPrice: "цена",
      monitoringSortYear: "год",
      monitoringSortMileage: "пробег",
      monitoringSortListed: "дата появления",
      monitoringSortDir: "Сменить направление сортировки",
      monitoringOnlyVat: "только НДС к вычету",
      monitoringOnlyDealers: "только дилеры",
      monitoringListedSince: "в продаже с {date} · {days}",
      monitoringSeenSince: "в мониторинге с {date} · {days}",
      monitoringSeenBefore: "в продаже минимум с {date} · {days}",
      monitoringListedTitle: "Дата с портала: когда выставлено объявление.",
      monitoringSeenTitle: "Портал не даёт дату: это день мониторинга, когда авто появилось впервые.",
      monitoringSeenBeforeTitle: "Авто было уже в первом мониторинге — выставлено раньше, точную дату портал не даёт.",
      monitoringEmptyNew: "Нет новых объявлений с {date}. {next}.",
      monitoringEmptyGone: "Ничего не исчезло с {date}. {next}.",
      monitoringEmptySaved: "Здесь пока пусто — звёздочка ☆ у объявления сохраняет авто сюда, из этого списка делается PDF для клиента.",
      monitoringPdf: "PDF для клиента",
      monitoringPdfEmpty: "Сначала сохрани авто звёздочкой ☆ — PDF делается из списка «Сохранённые».",
      monitoringPdfTitle: "Подобранные авто: {car}",
      monitoringPdfSub: "AUTOGOOD · {date} · авто: {count} · цены с порталов на дату подготовки",
      monitoringPdfWorking: "Готовлю PDF…",
      monitoringPdfReady: "PDF сохранён: {file}",
      monitoringPdfFailed: "Не удалось сделать PDF — попробуй ещё раз.",
      monitoringPdfFile: "Подборка авто",
      monitoringPdfOpen: "Открыть объявление",
      monitoringOfferLink: "{title} — открыть объявление",
      priceHistoryComparedHint: "выбор рынков на странице 1 «Поиск»",
      offerHistoryHeading: "Рынок в выбранный день",
      offerHistoryIntro: "Выбери дату замера: график и список показывают объявления этого дня. «Сравнить с» накладывает вторую дату (серые кружки) и показывает, что изменилось.",
      offerHistoryNone: "Объявления каждого замера сохраняются с 30.09.2026. После следующего «Обновить данные» здесь появятся график и список объявлений этого дня.",
      offerHistoryNoOffers: "за этот день есть только статистика (без списка объявлений)",
      offerLoading: "Загружаю объявления…",
      offerCompareWith: "Сравнить с",
      offerCompareNone: "без сравнения",
      offerFiltersBetween: "Между этими датами менялись фильтры — сравнение приблизительное.",
      offerAxis: "место в списке от самого дешёвого к самому дорогому",
      offerLegendCurrent: "выбранный день",
      offerLegendCompare: "сравнение",
      offerListComplete: "полный список: {count} из {total}",
      offerListSample: "выборка: {count} из {total} — новые и исчезнувшие неточно",
      offerNoMarket: "В выбранный день нет объявлений этого рынка.",
      offerChangesHeading: "Объявления и изменения",
      offerStatus: "Статус",
      offerAd: "Объявление",
      offerYear: "Год",
      offerMileage: "Пробег",
      offerPrice: "Цена",
      offerBefore: "Раньше",
      offerChange: "Изменение",
      offerAll: "Все",
      offerNew: "Новое",
      offerFirstSeen: "Впервые в выборке",
      offerGone: "Исчезло",
      offerGoneGroup: "Исчезли",
      offerOutside: "Вне выборки",
      offerCheaper: "Дешевле",
      offerDearer: "Дороже",
      offerSame: "Без изменений",
      offerCheaperAvg: "в ср. {pct}",
      priceHistoryMarketEmpty: "По этому рынку ещё нет замеров. Нажми «Обновить данные», чтобы добавить первый.",
      autoRefreshLabel: "Автоматическое обновление",
      autoRefreshDaily: "каждый день",
      autoRefresh3Days: "раз в 3 дня",
      autoRefreshWeekly: "раз в неделю",
      autoRefreshPending: "Настройка сохранена. Автоматические замеры начнутся после подключения сервера автоматизации; до этого новую строку добавляет «Обновить данные».",
      priceHistoryNoFavorites: "Добавь авто в избранное ★ — здесь появится история его цен.",
      priceHistoryEmptyEntry: "У этого авто ещё нет замеров цен. Нажми «Обновить данные».",
      trendTitle: "Медиана цены во времени",
      trendNeedsTwo: "График появится после второго замера цен.",
      adPrice: "цена в объявлении",
      turnkeyFootnote: "Цена «под ключ» складывается из цены брутто в объявлении + средней стоимости доставки, осмотра, акциза по типу и объёму двигателя, переводов документов, техосмотра и вознаграждения AUTOGOOD. Чтобы узнать точную стоимость конкретного предложения, свяжитесь с нами напрямую.",
      conclusionHeading: "Вывод",
      conclusionCheaper: "Даже с учётом всех расходов авто {country} выходит в среднем на {amount} ({percent}%) дешевле, чем в Польше.",
      conclusionDearer: "С учётом всех расходов авто {country} выходит в среднем на {amount} ({percent}%) дороже, чем в Польше.",
      countryGermany: "из Германии",
      countrySweden: "из Швеции",
      countryNetherlands: "из Нидерландов",
      countryBelgium: "из Бельгии",
      countryAustria: "из Австрии",
      countryLuxembourg: "из Люксембурга",
      countryAbroad: "из-за границы",
      averageMileage: "Средний пробег",
      cepikShare: "История CEPiK",
      importedShare: "Пригнанные авто",
      shareOf: "{count} из {total}",
      accidentShare: "Без аварий",
      afterAccidentShort: "после аварии: {percent}%",
      briefAccidents: "Аварии",
      polishAccidents: "Только {percent}% продавцов ({count} из {total}) указывают, что авто без аварий, {after}% признают, что авто было в аварии, а в {silent}% объявлений этой информации нет. Это лишь слова продавца — otomoto их не проверяет.",
      briefPrice: "Цена",
      briefMileage: "Пробег",
      briefSafety: "Надёжность",
      briefHistory: "История",
      briefOrigin: "Происхождение",
      conclusionTooFew: "Слишком мало предложений для надёжного сравнения рынков: Польша — {pl}, {portal} — {foreign} (нужно не меньше {min} на каждом рынке). Расширьте фильтры, например год или пробег.",
      conclusionSameCarCheaper: "Такое же авто ({year} г., {mileage}) {from} под ключ стоит около {foreign}, в Польше — около {pl}: на {amount} ({percent}%) дешевле.",
      conclusionSameCarDearer: "Такое же авто ({year} г., {mileage}) {from} под ключ стоит около {foreign}, в Польше — около {pl}: на {amount} ({percent}%) дороже.",
      sameCarNote: "«Такое же авто»: цена считается отдельно на каждом рынке по ценам предложений в зависимости от года и пробега (комплектация и состояние не учитываются). Медианы всех предложений: Польша {pl}, под ключ {foreign}.",
      mediansNote: "Сравнение медиан всех предложений. Чтобы сравнить авто того же года и пробега, нужно не меньше {min} предложений на каждом рынке.",
      mileageLower: "У авто {from} средний пробег {foreign}, в Польше {pl} — на {diff} ({percent}%) меньше. Меньший пробег — это меньший износ, меньше риск пережитых ДТП и лучше техническое состояние, а при перепродаже такое авто лучше держит цену.",
      mileageHigher: "У авто {from} средний пробег {foreign}, в Польше {pl} — на {diff} ({percent}%) больше.",
      conclusionBenefits: "Кроме того, обычно меньше рисков, лучше состояние и подтверждённая сервисная история — каждое авто мы проверяем перед покупкой.",
      polishCepik: "Только у {percent}% объявлений ({count} из {total}) история авто подтверждена в CEPiK. В остальных пробег и история — только слова продавца.",
      polishImported: "{percent}% авто с указанной страной происхождения ({count} из {total}) пригнаны из-за границы. Комис уже привёз их и добавляет к цене свою наценку.",
      polishImportedFrom: "{percent}% авто с указанной страной происхождения ({count} из {total}) пригнаны, чаще всего {from}. Комис уже привёз их и добавляет к цене свою наценку.",
      polishOffer: "С AUTOGOOD вы привозите авто напрямую от продавца за границей: проверенное перед покупкой, с подтверждённой историей и без наценки комиса.",
      originFrom: { d: "из Германии", b: "из Бельгии", nl: "из Нидерландов", f: "из Франции", i: "из Италии", a: "из Австрии", ch: "из Швейцарии", s: "из Швеции", dk: "из Дании", cz: "из Чехии", usa: "из США", cdn: "из Канады", gb: "из Великобритании", l: "из Люксембурга", e: "из Испании", kr: "из Кореи", n: "из Норвегии", fin: "из Финляндии", sk: "из Словакии", h: "из Венгрии", lt: "из Литвы" },
      ccmProgress: "Уточняю объём двигателя в объявлениях mobile.de (акциз): {done} из {total}…",
      ccmUnknown: "Без объёма двигателя в объявлении: {count} {offers} — акциз считается как для двигателя до 2000 см³.",
      breakdownTitle: "Из чего складывается цена под ключ* — пример: авто {from} из середины рынка (ближе всего к медиане)",
      partCar: "Авто: {price} брутто × курс {rate}",
      partTransport: "Доставка (в среднем, с VAT)",
      partInspection: "Осмотр (в среднем, с VAT)",
      partExcise: "Акциз {rate}%",
      partCommission: "Услуга AUTOGOOD (с VAT)",
      partFees: "Техосмотр и переводы",
      partTotal: "Итого под ключ",
      listScreenshotButton: "Копировать список",
      listPdfButton: "Список PDF",
      sourcesPicker: "Анализ рынков:",
      marketPickOn: "нажми, чтобы сравнить",
      marketPickOff: "нажми, чтобы скрыть",
      sourceOn: "{source}: показан на графике — нажми, чтобы скрыть",
      sourceOff: "{source}: скрыт — нажми, чтобы показать",
      sourceFetch: "Загрузить объявления с mobile.de",
      sourceNoData: "mobile.de: нет данных — открой поиск mobile.de (логотип вверху) и нажми там закладку AUTOGOOD.",
      averagePrices: "Средние цены (P25–P75)",
      pdfButton: "Отчёт PDF",
      pdfWorking: "Готовлю отчёт PDF…",
      pdfReady: "Отчёт PDF сохранён: {file}",
      pdfFailed: "Не удалось подготовить отчёт PDF.",
      distributionHeading: "Распределение цен",
      screenshotButton: "Копировать отчёт",
      screenshotCopied: "Отчёт скопирован в буфер обмена — вставь его в сообщение клиенту.",
      screenshotOpened: "Браузер не даёт копировать картинки — отчёт сохранён файлом PNG (Загрузки).",
      screenshotFailed: "Не удалось сделать снимок отчёта.",
      screenshotRetry: "Браузер не дал скопировать картинку — нажми кнопку ещё раз, картинка уже готова.",
      screenshotNoClipboard: "Этот браузер не умеет копировать картинки. Используй Chrome или скачай PDF.",
      screenshotWorking: "Готовлю отчёт…",
      screenshotPreparing: "Готовлю картинку… через секунду можно копировать",
      reportTitle: "Анализ рынка",
      fileReport: "анализ рынка",
      fileList: "список объявлений",
      tableTitle: "Объявление",
      favoritesEmpty: "Отметьте запись в истории звёздочкой ★ — она появится здесь.",
      favoritesPick: "Выберите авто из избранного или укажите марку и модель в форме.",
      favoritesNoData: "нет цен",
      dataAtHint: "«Обновить данные» сохранит новый замер в историю цен.",
      priceHistoryHeading: "История цен",
      priceHistoryFirst: "Первый замер. Каждое обновление данных добавит следующий — будет видно, как меняется медиана.",
      priceHistoryDate: "Дата",
      priceHistoryCount: "объявл.",
      comparePrice: "Сравнить цену (EUR)",
      comparePlaceholder: "напр. 25 000",
      compareHint: "Введите цену авто — покажем его на графике.",
      comparedCar: "Сравниваемая цена",
      historyHeading: "История поиска",
      historyEmpty: "Сохранённых поисков пока нет.",
      historyAnalysis: "Анализ рынка",
      historyOpenList: "Открыть список",
      historyDelete: "Удалить",
      otomotoFetching: "Загружаю объявления с otomoto.pl…",
      otomotoFetched: "Загружено {count} из {total} объявлений otomoto.pl.",
      mobileFetched: "Загружено {count} из {total} объявлений mobile.de.",
      blocketFetched: "Загружено {count} из {total} объявлений blocket.se.",
      autoscoutFetched: "AutoScout24: {count} объявлений, которых нет на mobile.de (из {total}; пропущено дубликатов: {duplicates}).",
      autoscoutUnchecked: "AutoScout24: {count} из {total} объявлений — без mobile.de дубликаты не отсеять.",
      avbyFetched: "Загружено {count} из {total} объявлений av.by.",
      otomotoFailed: "Не удалось загрузить объявления с otomoto.pl.",
      otomotoLabel: "Данные: otomoto.pl",
      mixedLabel: "Данные: otomoto.pl + mobile.de",
      mixedDescription: "Объявления otomoto.pl (PLN) и mobile.de (EUR, пересчитано в PLN) на одном графике.",
      otomotoDescription: "Выборка актуальных объявлений otomoto.pl по всему списку (цены в PLN).",
      verdictHeading: "Что это значит",
      verdictMedian: "Медиана цен объявлений: {median}.",
      verdictMiddle: "Средние цены: {low} – {high} ({count} {offers}).",
      verdictDeals: "Дешевле {low} — {count} объявлений, это низ рынка.",
      tableHeading: "Актуальные объявления",
      loadingHeading: "Загружаю актуальные объявления…",
      tablePrice: "Цена",
      tableYear: "Год",
      tableMileage: "Пробег",
      tableOpen: "Открыть",
      tableSortHint: "Нажми на заголовок, чтобы отсортировать.",
      axisMileage: "Горизонтальная ось: пробег",
      sourceOtomoto: "otomoto.pl",
      sourceMobile: "mobile.de",
      sourceBlocket: "blocket.se",
      sourceAutoscout: "AutoScout24",
      sourceAvby: "av.by",
      marketsHeading: "Рынки",
      toneHigher: "выше всех",
      toneLower: "ниже всех",
      toneLegend: "▲ выше всех · ▼ ниже всех среди сравниваемых рынков (цена в Польше: под ключ или из объявления; пробег)",
      marketOtomoto: "Польша",
      compareHeading: "Сравнение рынков",
      compareHint: "цены под ключ*, zł — та же шкала, что у графиков ниже",
      compareHintBy: "Германия — цены под ключ с растаможкой*, Беларусь — цены в объявлениях; $, та же шкала, что у графиков ниже",
      compareLegend: "Прямоугольник — средние цены (P25–P75), черта — медиана, линия — от самого дешёвого до самого дорогого объявления.",
      panelOffers: "{count} {offers}",
      guideLegend: "медиана другого рынка (для сравнения)",
      marketMobile: "Германия",
      marketBlocket: "Швеция",
      marketAutoscout: "AutoScout24 (Германия и страны из фильтра)",
      marketAvby: "Беларусь",
      sourcesLabel: "Источники",
      axisLabel: "Горизонтальная ось",
      scaleLabel: "Шкала цен",
      scaleShared: "Общая шкала",
      scaleOwn: "Своя шкала",
      compareHintOwn: "цены под ключ*, zł — у графиков ниже свои шкалы",
      compareHintByOwn: "Германия — цены под ключ с растаможкой*, Беларусь — цены в объявлениях; $, у графиков ниже свои шкалы",
      axisRank: "Порядок цен",
      axisMileageShort: "Пробег",
      axisYearShort: "Год",
      axisRankCaption: "Место объявления в списке портала, отсортированном от самого дешёвого",
      axisMileageCaption: "Пробег",
      axisYearCaption: "Год выпуска",
      axisRankStart: "самое дешёвое",
      axisRankEnd: "самое дорогое",
      trendLegend: "Медиана цены",
      curveLegend: "Кривая цен",
      hiddenNoAxis: "Объявлений без этого значения нет на графике: {count}.",
      tableSource: "Рынок",
      tableLink: "Ссылка",
      sourceEmpty: "нет данных",
      fetchMobile: "Загрузить с mobile.de ↗",
      fetchMobileHint: "Список mobile.de открыт в новой вкладке — нажми там закладку «AUTOGOOD». Объявления появятся на графике.",
      mobileAdded: "Добавлено объявлений mobile.de: {count} (из {total}).",
      mobilePending: "Объявления mobile.de ({count}) ждут — открой анализ рынка для этого авто.",
      bookmarkletInstall: "Закладка для mobile.de:",
      bookmarkletInstallHint: "перетащи на панель закладок",
      yourCar: "Это авто",
      yourCarVerdict: "Это авто: {price} — дешевле {share}% объявлений, {diff} медианы.",
      belowMedian: "на {pct}% ниже",
      aboveMedian: "на {pct}% выше",
      atMedian: "на уровне",
      yourCarMileageVerdict: "При таком пробеге медиана около {reference} — цена этого авто {diff} медианы.",
      yourCarYearVerdict: "Для этого года медиана около {reference} — цена этого авто {diff} медианы.",
      axisYear: "Горизонтальная ось: год",
      historyPin: "Сохранить навсегда",
      historyPinned: "Сохранено навсегда",
      historyPinnedBadge: "Сохранено",
      historyUnpin: "Убрать из сохранённых",
      historySaveHint: "{count} / {limit} последних проверок",
      historyReady: "{count} {offers} · график готов",
      historyWaiting: "Нет данных рынка",
      historyStorageError: "Не удалось сохранить историю в этом браузере.",
      backToFilters: "← Вернуться к фильтрам",
      heading: "Анализ рынка",
      waitingLabel: "Нет данных объявлений",
      waitingDescription: "Загрузите цены объявлений, чтобы построить анализ.",
      importedLabel: "Импортированные данные",
      importedDescription: "График построен по загруженным ценам объявлений.",
      importHeading: "Загрузить реальные объявления",
      importDescription: "JSON или CSV: обязателен price в EUR. Файл остаётся только в этом браузере.",
      importButton: "Импортировать JSON / CSV",
      clearImport: "Удалить импортированные объявления",
      importedFile: "Загружено объявлений: {count}. Файл: {file}.",
      importInvalid: "Файл должен содержать минимум 3 корректных объявления с ценой в EUR.",
      importReadError: "Не удалось прочитать файл JSON / CSV.",
      chartTitle: "Распределение цен объявлений",
      lowMarket: "Низ рынка",
      middleMarket: "Средние цены",
      highMarket: "Верх рынка",
      count: "Объявлений",
      minimum: "Самое дешёвое объявление",
      median: "Медиана",
      middleRange: "Средние цены (P25–P75)",
      middleOffers: "В диапазоне",
      sampleDate: "Цены объявлений · данные на {date}",
      limitedSample: "Маленькая выборка: типичная цена может быть нестабильной. Для оценки автомобиля нужно минимум 8 объявлений.",
      priceFilterWarning: "Фильтр цены ограничивает сравнение. Уберите его, чтобы оценить весь рынок.",
      wideRangeWarning: "Крайние цены сильно растягивают шкалу. Все объявления остаются на графике.",
      maximum: "Самое дорогое объявление",
      openSearch: "Открыть поиск mobile.de ↗",
      openOtomoto: "Открыть список otomoto.pl ↗",
      openBlocket: "Открыть список blocket.se ↗",
      openAvby: "Открыть список av.by ↗",
      pointHint: "Нажми, чтобы открыть объявление",
      summaryVehicle: "Авто и продавец",
      summaryParameters: "Параметры",
      summaryEquipment: "Оснащение",
      priceHistorySource: "Рынок",
      searchHeading: "Параметры поиска",
      analysisCardHeading: "Анализ и распределение цен",
      openSearches: "Открыть поиск",
      checkedAt: "данные на {date}",
      priceHistoryOffers: "Объявл.",
      countries: "Страна",
      refresh: "Обновить данные",
      refreshing: "Обновляю рыночные данные…",
      refreshUnavailable: "Источник данных ещё не подключён.",
      refreshInvalid: "Источник не вернул хотя бы 3 цены объявлений.",
      snapshotSaved: "Новая проверка сохранена в истории цен ({date}).",
      suspectsSkipped: "Вне статистики: {count} {offers} (повреждённые, на запчасти, цессия / лизинг или цена вне 1/3–3× медианы) — серые кружки на графике.",
      suspectTag: "вне статистики",
      suspectShort: "+{count} вне статистики",
      offerForms: ["объявление", "объявления", "объявлений"],
      offerFormsAcc: ["объявление", "объявления", "объявлений"],
      emptyHeading: "Нет реальных объявлений для анализа",
      emptyDescription: "Нажми «Обновить данные», чтобы загрузить объявления с выбранных порталов.",
      missingVehicle: "Выберите марку и модель перед запуском анализа рынка.",
      invalidData: "Выбранные порталы не вернули минимум 3 корректных объявления.",
      preparing: "Подготавливаю анализ рынка…",
      mileage: "Пробег",
      price: "Цена",
      year: "Год",
      displacement: "Объём",
      power: "Мощность",
      seats: "Количество мест",
      doors: "Количество дверей",
      engine: "Двигатель",
      gearbox: "Коробка передач",
      fuelPetrol: "Бензин",
      fuelDiesel: "Дизель",
      fuelHybridDiesel: "Гибрид дизель",
      fuelHybridPetrol: "Гибрид бензин",
      fuelElectric: "Электро",
      fuelPlugin: "Гибрид plug-in",
      gearboxAny: "Любая",
      gearboxAutomatic: "Автоматическая",
      gearboxManual: "Механическая",
    },
  };

  const HISTORY_STORAGE_KEY = "autogood.mobile.marketHistory.v2";
  const LEGACY_HISTORY_STORAGE_KEY = "autogood.mobile.marketHistory.v1";
  // Favourites are also kept in their own small key (no offer lists), so a
  // full storage, an unreadable history or a bad write cannot take them along.
  const FAVORITES_BACKUP_KEY = "autogood.mobile.marketFavorites.v1";
  // An unreadable history is copied here before anything new is written.
  const BROKEN_HISTORY_KEY_PREFIX = "autogood.mobile.marketHistory.broken.";
  // Every Mobile.de search is logged automatically; only the last 20 unpinned
  // checks are kept, while pinned ones (e.g. a client's car) stay on top.
  const HISTORY_LIMIT = 20;
  const PRICE_POINT_MERGE_MS = 2 * 60 * 60 * 1000;

  // Otomoto blocks cross-origin reads, so its result pages come through a
  // reader proxy. Point AUTOGOOD_MARKET_PROXY at your own one to replace it.
  const MARKET_PROXY = () => window.AUTOGOOD_MARKET_PROXY || "https://r.jina.ai/";
  const OTOMOTO_PAGES = 8;
  // A favourite is read whole up to this many offers, so its price history
  // can tell new and gone offers apart; longer lists stay a sample.
  const FULL_LIST_LIMIT = 1000;
  const OTOMOTO_PARALLEL = 3;

  let activeAnalysis = null;
  let otomotoTotal = 0;
  let tableSort = { key: "price", direction: "asc" };
  // Chart view: which marketplaces are shown and what the horizontal axis carries.
  // AutoScout24 (2026-10-03): the offers mobile.de does not have, in the
  // same countries (page 1 "Kraj"); see src/autoscout-search.js.
  const MARKET_SOURCES = ["otomoto", "mobile", "autoscout", "blocket", "avby"];
  // Each marketplace's own currency: history and statistics keep it, the chart converts.
  const SOURCE_CURRENCY = { otomoto: "PLN", mobile: "EUR", blocket: "SEK", avby: "USD", autoscout: "EUR" };
  // Markets whose offers are also shown "pod klucz" in Poland. av.by shows
  // only its own price (owner, 2026-10-02).
  // AutoScout24 is only on page 3 (with mobile.de), never in the analysis.
  const TURNKEY_SOURCES = ["mobile", "blocket", "autoscout"];
  const AVBY_PAGES = 8;
  const AVBY_PAGE_SIZE = 25;
  const BLOCKET_PAGES = 8;
  const BLOCKET_PAGE_SIZE = 50;
  const BLOCKET_MAX_PAGES = 50;
  const EUR_PLN_FALLBACK_RATE = 4.3;
  // The markets being compared: picked by the logos on the search page and
  // on the chart alike, remembered in this browser.
  const MARKETS_STORAGE_KEY = "autogood.mobile.markets.v1";
  let chartSources = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MARKETS_STORAGE_KEY) || "null");
      // Blocket starts switched off (owner, 2026-09-29): once for choices saved earlier.
      const blocketReset = localStorage.getItem("autogood.mobile.markets.blocketOff") !== "1";
      if (blocketReset) localStorage.setItem("autogood.mobile.markets.blocketOff", "1");
      if (saved && ["otomoto", "mobile", "autoscout", "blocket", "avby"].some((source) => saved[source])) {
        // AutoScout24 goes with mobile.de for choices saved before it existed.
        const picked = { otomoto: Boolean(saved.otomoto), mobile: Boolean(saved.mobile), autoscout: "autoscout" in saved ? Boolean(saved.autoscout) : Boolean(saved.mobile), blocket: blocketReset ? false : Boolean(saved.blocket), avby: Boolean(saved.avby) };
        if (picked.otomoto || picked.mobile || picked.autoscout || picked.blocket || picked.avby) return picked;
      }
    } catch {
      // Unreadable storage: all markets.
    }
    // av.by starts switched off, like Blocket: added by its "+".
    return { otomoto: true, mobile: true, autoscout: true, blocket: false, avby: false };
  })();
  let chartAxis = "rank";
  // Several markets: one price scale for all charts ("shared", the default —
  // compares markets) or each chart its own ("own" — shows the spread inside
  // a market). A viewer's preference, remembered in this browser.
  const CHART_SCALE_KEY = "autogood.mobile.chartScale";
  let chartScale = (() => {
    try {
      return localStorage.getItem(CHART_SCALE_KEY) === "own" ? "own" : "shared";
    } catch {
      return "shared";
    }
  })();
  let displayCurrency = "EUR";
  // Mobile.de offers that arrived before the analysis was opened.
  let pendingMobile = null;

  function exchangeRate() {
    const rate = Number(window.AUTOGOOD_EXCHANGE_RATES?.rates?.EUR_PLN?.value);
    return Number.isFinite(rate) && rate > 0 ? rate : 0;
  }

  // One SEK in PLN (Walutomat, see blocket-search.js).
  function sekPlnRate() {
    // The calculator's margin applies to SEK too (turnkey-estimate.js).
    return window.AUTOGOOD_TURNKEY?.currentRates?.().sek || window.AUTOGOOD_BLOCKET?.sekPlnRate?.() || 0.385;
  }

  // One USD in PLN (Walutomat, see avby-search.js).
  function usdPlnRate() {
    return window.AUTOGOOD_AVBY?.usdPlnRate?.() || 3.65;
  }

  // Any offer price in PLN, and a PLN amount in any of the four currencies.
  function priceInPln(value, currency) {
    if (currency === "PLN") return value;
    if (currency === "SEK") return value * sekPlnRate();
    if (currency === "USD") return value * usdPlnRate();
    return value * (exchangeRate() || EUR_PLN_FALLBACK_RATE);
  }

  function plnIn(value, currency) {
    if (currency === "PLN") return value;
    if (currency === "SEK") return value / sekPlnRate();
    if (currency === "USD") return value / usdPlnRate();
    return value / (exchangeRate() || EUR_PLN_FALLBACK_RATE);
  }

  function convertPrice(value, from, to) {
    return from === to ? value : plnIn(priceInPln(value, from), to);
  }

  // CSS class part of a marketplace.
  // The portal's own name (mobile.de, AutoScout24, …).
  function portalName(source) {
    const c = copy();
    return source === "otomoto" ? c.sourceOtomoto : source === "blocket" ? c.sourceBlocket : source === "avby" ? c.sourceAvby : source === "autoscout" ? c.sourceAutoscout : c.sourceMobile;
  }

  function sourceClass(source) {
    return source === "otomoto" ? "Otomoto" : source === "blocket" ? "Blocket" : source === "avby" ? "Avby" : source === "autoscout" ? "Autoscout" : "Mobile";
  }
  let importedDataset = null;
  let marketHistory = [];
  let editingHistoryId = "";

  function currentLanguage() {
    return document.documentElement.lang === "ru" ? "ru" : "pl";
  }

  // Kilometres as each language writes them.
  function kmUnit() {
    return currentLanguage() === "ru" ? "км" : "km";
  }

  // Power "150 KM" (Polish) reads "150 л. с." in Russian.
  function powerText(value) {
    const text = String(value || "");
    return currentLanguage() === "ru" ? text.replace(/\bKM\b/g, "л. с.") : text;
  }

  function copy() {
    return marketCopy[currentLanguage()];
  }

  // "1 oferta, 2 oferty, 5 ofert" (and the Russian three forms): {count},
  // {offers} and {offersAcc} filled in one go.
  function withCount(template, count) {
    const c = copy();
    const n = Math.abs(Number(count)) || 0;
    const lastTwo = n % 100;
    const last = n % 10;
    const form = currentLanguage() === "ru"
      ? (last === 1 && lastTwo !== 11 ? 0 : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 1 : 2)
      : (n === 1 ? 0 : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 1 : 2);
    return String(template)
      .replace("{count}", numberFormat().format(n))
      .replace("{offersAcc}", c.offerFormsAcc[form])
      .replace("{offers}", c.offerForms[form]);
  }

  // Empty values are left out, so a field added later (missing in older
  // entries, empty in the form) does not make the same search look new.
  // "roadworthy" stays: missing there means ticked.
  function compactFilters(filters) {
    return Object.fromEntries(Object.entries(filters || {}).filter(([key, value]) => !(
      value === undefined || value === null || value === ""
      || (value === false && key !== "roadworthy")
      || (Array.isArray(value) && !value.length)
    )));
  }

  function filterSignature(filters) {
    return JSON.stringify(compactFilters(filters));
  }

  // The search itself, without the compared markets: changing the markets
  // keeps the same entry and its collected prices.
  function searchSignature(filters) {
    const { markets, ...search } = compactFilters(filters);
    return JSON.stringify(search);
  }

  function vehicleDataKey(filters) {
    return [filters?.brand, filters?.model, filters?.version]
      .map((value) => String(value || "").trim())
      .join("|");
  }

  function escapeMarketHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function seededNumber(value) {
    return [...String(value || "AUTOGOOD")]
      .reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
  }

  function parseMarketNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const compact = String(value ?? "").trim().replace(/\s+/g, "").replace(/[^\d.,-]/g, "");
    if (!compact) return null;
    const lastComma = compact.lastIndexOf(",");
    const lastDot = compact.lastIndexOf(".");
    const decimalIndex = Math.max(lastComma, lastDot);
    const decimalDigits = decimalIndex >= 0 ? compact.length - decimalIndex - 1 : 0;
    let normalized;
    if (decimalIndex >= 0 && decimalDigits > 0 && decimalDigits <= 2) {
      normalized = `${compact.slice(0, decimalIndex).replace(/[.,]/g, "")}.${compact.slice(decimalIndex + 1)}`;
    } else {
      normalized = compact.replace(/[.,]/g, "");
    }
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function listingValue(row, aliases) {
    const entries = Object.entries(row || {});
    for (const alias of aliases) {
      const match = entries.find(([key]) => String(key).trim().toLowerCase() === alias);
      if (match && match[1] !== "") return match[1];
    }
    return "";
  }

  function isDirectOtomotoListingUrl(url) {
    return url.hostname.endsWith("otomoto.pl") && url.pathname.includes("/oferta/");
  }

  function isDirectAvbyListingUrl(url) {
    return /(^|\.)av\.by$/.test(url.hostname) && /\/\d{5,}\/?$/.test(url.pathname);
  }

  function isDirectAutoscoutListingUrl(url) {
    return /(^|\.)autoscout24\.[a-z.]+$/.test(url.hostname) && /\/(?:angebote|offerte|offres|aanbod|offers|annonces)\//.test(url.pathname);
  }

  function isDirectBlocketListingUrl(url) {
    return url.hostname.endsWith("blocket.se") && /\/(?:mobility\/)?item\/\d+/.test(url.pathname);
  }

  function isDirectMobileListingUrl(url) {
    const mobileHost = url.hostname === "mobile.de" || url.hostname.endsWith(".mobile.de");
    const canonicalListing = url.pathname.endsWith("/fahrzeuge/details.html")
      && /^\d+$/.test(url.searchParams.get("id") || "");
    const localizedListing = /\/(\d+)\.html$/.test(url.pathname);
    return mobileHost && (canonicalListing || localizedListing);
  }

  function normalizeListing(row, index) {
    const price = parseMarketNumber(listingValue(row, ["price", "price_eur", "cena", "preis"]));
    const urlValue = listingValue(row, ["url", "link", "listing_url", "listingurl"]);
    let url = "";
    try {
      const parsedUrl = new URL(String(urlValue || "").trim());
      if (/^https?:$/.test(parsedUrl.protocol) && (isDirectMobileListingUrl(parsedUrl) || isDirectOtomotoListingUrl(parsedUrl) || isDirectBlocketListingUrl(parsedUrl) || isDirectAvbyListingUrl(parsedUrl) || isDirectAutoscoutListingUrl(parsedUrl))) {
        url = parsedUrl.toString();
      }
    } catch {
      // A link is intentionally optional: prices, not outbound links, power this chart.
    }
    if (!price || price <= 0) return null;
    const yearMatch = String(listingValue(row, ["year", "registration_year", "first_registration", "rok"]) || "").match(/(?:19|20)\d{2}/);
    const mileage = parseMarketNumber(listingValue(row, ["mileage", "mileage_km", "km", "przebieg"]));
    const title = String(listingValue(row, ["title", "name", "model", "auto"]) || "").trim();
    const id = String(listingValue(row, ["id", "listing_id", "ad_id"]) || (url ? new URL(url).searchParams.get("id") : "") || `import-${index + 1}`);
    const rawCurrency = String(listingValue(row, ["currency", "waluta"]) || "EUR").toUpperCase();
    const currency = ["PLN", "SEK", "USD"].includes(rawCurrency) ? rawCurrency : "EUR";
    const listing = {
      id,
      title: title || `mobile.de · ${String(index + 1).padStart(2, "0")}`,
      price: Math.round(price),
      currency,
      year: yearMatch ? Number(yearMatch[0]) : null,
      mileage: mileage === null ? null : Math.round(mileage),
      url: url.toString(),
      power: String(listingValue(row, ["power", "moc"]) || "").slice(0, 40),
      subtitle: String(listingValue(row, ["subtitle"]) || "").slice(0, 160),
      // Seller location and car class, for the turnkey price (Mobile.de).
      fuel: String(listingValue(row, ["fuel"]) || "").slice(0, 40),
      country: String(listingValue(row, ["country"]) || "").slice(0, 4),
      postalCode: String(listingValue(row, ["postalcode"]) || "").slice(0, 12),
      city: String(listingValue(row, ["city"]) || "").slice(0, 80),
      bodyType: String(listingValue(row, ["bodytype"]) || "").slice(0, 40),
      displacementCcm: parseMarketNumber(listingValue(row, ["displacementccm"])) || null,
      seller: String(listingValue(row, ["seller"]) || "").slice(0, 12),
      netPrice: parseMarketNumber(listingValue(row, ["netprice"])) || 0,
      priceByn: parseMarketNumber(listingValue(row, ["pricebyn"])) || null,
      // "MM/YYYY": the month of first registration (age for customs in Belarus).
      firstRegistration: String(listingValue(row, ["firstregistration"]) || "").slice(0, 10),
      priceType: String(listingValue(row, ["pricetype"]) || "").slice(0, 12),
      vatDeductible: listingValue(row, ["vatdeductible"]) === true || listingValue(row, ["vatdeductible"]) === "true",
      // The portal's own date of the ad (otomoto, blocket), when it gives one.
      listedAt: String(listingValue(row, ["listedat"]) || "").slice(0, 30),
      // Otomoto: "1" history confirmed in CEPiK, "0" not; origin "pl" or the
      // country the car was imported from.
      cepik: String(listingValue(row, ["cepik"]) || "").slice(0, 1),
      origin: String(listingValue(row, ["origin"]) || "").slice(0, 8),
    };
    listing.source = listingSource({ ...listing, source: listingValue(row, ["source", "zrodlo"]) });
    // Otomoto's "net" was read wrongly before 2026-10-03: those prices are
    // gross with VAT deductible (see parseOtomotoPage).
    if (listing.source === "otomoto" && listing.priceType === "net") listing.priceType = "vat";
    if (listing.source === "otomoto" && listing.priceType === "vat" && !listing.netPrice) listing.netPrice = Math.round(listing.price / 1.23);
    // mobile.de: a net price beside the gross one = VAT deductible; a dealer
    // without it sells on the margin scheme; a private seller has no VAT.
    if (!listing.priceType && (listing.source === "mobile" || listing.source === "autoscout")) {
      listing.priceType = listing.vatDeductible || listing.netPrice ? "vat" : listing.seller === "dealer" ? "margin" : listing.seller === "private" ? "private" : "";
      // Net by the VAT of the seller's country, when known.
      const vatRate = { DE: 0.19, AT: 0.2, FR: 0.2, SK: 0.23, CZ: 0.21, NL: 0.21, BE: 0.21, ES: 0.21, IT: 0.22, LU: 0.17, DK: 0.25, SE: 0.25, PL: 0.23, SI: 0.22, HR: 0.25, HU: 0.27 }[String(listing.country || "").toUpperCase()];
      if (listing.priceType === "vat" && !listing.netPrice && vatRate) listing.netPrice = Math.round(listing.price / (1 + vatRate));
    }
    // Position in the marketplace's own price-sorted result list, when known.
    const rank = Number(listingValue(row, ["rank"]));
    const marketTotal = Number(listingValue(row, ["markettotal"]));
    if (Number.isFinite(rank) && rank > 0 && Number.isFinite(marketTotal) && marketTotal >= rank) {
      listing.rank = rank;
      listing.marketTotal = marketTotal;
    }
    // Otomoto: how many offers of the whole search the sellers mark
    // accident-free and how many after an accident.
    const noAccident = listingValue(row, ["noaccident"]);
    const afterAccident = listingValue(row, ["afteraccident"]);
    if (noAccident !== "" && afterAccident !== "" && Number.isFinite(Number(noAccident)) && Number.isFinite(Number(afterAccident))) {
      listing.noAccident = Number(noAccident);
      listing.afterAccident = Number(afterAccident);
    }
    return listing;
  }

  // Marketplaces complement each other: new offers replace only their own source.
  function mergeBySource(current, incoming) {
    const incomingSources = new Set(incoming.map(listingSource));
    return [...(current || []).filter((listing) => !incomingSources.has(listingSource(listing))), ...incoming];
  }

  // Which marketplace an offer comes from: explicit tag first, then its link,
  // then its currency (Otomoto lists in PLN, Mobile.de in EUR).
  function listingSource(listing) {
    const tagged = String(listing?.source || "").toLowerCase();
    if (tagged === "otomoto" || tagged === "mobile" || tagged === "blocket" || tagged === "avby" || tagged === "autoscout") return tagged;
    const url = String(listing?.url || "");
    if (/autoscout24\./.test(url)) return "autoscout";
    if (url.includes("otomoto.pl")) return "otomoto";
    if (url.includes("mobile.de")) return "mobile";
    if (url.includes("blocket.se")) return "blocket";
    if (/(^|\/\/|\.)av\.by\//.test(url)) return "avby";
    if (listing?.currency === "SEK") return "blocket";
    if (listing?.currency === "USD") return "avby";
    return listing?.currency === "PLN" ? "otomoto" : "mobile";
  }

  function normalizeListings(rows) {
    const seenListings = new Set();
    return (Array.isArray(rows) ? rows : [])
      .map(normalizeListing)
      .filter((listing) => {
        if (!listing) return false;
        const key = listing.url || listing.id;
        if (seenListings.has(key)) return false;
        seenListings.add(key);
        return true;
      });
  }

  // Otomoto's result page carries every offer as JSON in __NEXT_DATA__, so the
  // proxy is asked for the raw HTML and the numbers are read from there.
  function parseOtomotoPage(html) {
    const raw = String(html || "").match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!raw) return { total: 0, listings: [] };
    let search = null;
    const walk = (value) => {
      if (!value || typeof value !== "object" || search) return;
      if (Array.isArray(value.edges) && value.edges[0]?.node?.price) search = value;
      else Object.values(value).forEach(walk);
    };
    const urqlState = JSON.parse(raw[1])?.props?.pageProps?.urqlState || {};
    Object.values(urqlState).forEach((entry) => {
      if (!entry?.data || search) return;
      try {
        walk(JSON.parse(entry.data));
      } catch {
        // A cache entry that is not a search result is simply skipped.
      }
    });
    if (!search) return { total: 0, listings: [] };
    const listings = (search.edges || []).map((edge) => {
      const node = edge?.node || {};
      const amount = node.price?.amount || {};
      const parameters = Object.fromEntries((node.parameters || []).map((item) => [item.key, item.value]));
      const price = Number(amount.units ?? amount.value);
      if (!Number.isFinite(price) || price <= 0) return null;
      return {
        id: String(node.id || node.url || ""),
        url: String(node.url || ""),
        title: String(node.title || "otomoto.pl"),
        // The seller's own headline, the full name shown on otomoto.pl.
        subtitle: String(node.shortDescription || "").slice(0, 160),
        source: "otomoto",
        price,
        currency: String(amount.currencyCode || "PLN"),
        mileage: parameters.mileage || "",
        year: parameters.year || "",
        power: parameters.engine_power ? `${parameters.engine_power} KM` : "",
        // "isGross: false" comes with "INCLUDE_VAT": the price is gross and
        // a company may deduct the VAT ("Możliwość odliczenia VAT"; checked on
        // 132 offers 2026-10-03, the ads say "49.999 zł brutto, 40.649 netto").
        priceType: node.price?.isGross === false ? ((node.price?.badges || []).includes("INCLUDE_VAT") ? "vat" : "net") : "",
        seller: node.sellerLink ? "dealer" : "private",
        // When the ad was put up (Monitoring: "w ofercie od").
        listedAt: String(node.createdAt || ""),
        // History confirmed in CEPiK by otomoto, and where the car came from
        // ("Kraj pochodzenia": pl = bought new in Poland, else imported).
        cepik: node.cepikVerified === true ? "1" : node.cepikVerified === false ? "0" : "",
        origin: String(parameters.country_origin || "").slice(0, 8),
      };
    }).filter(Boolean);
    return { total: Number(search.totalCount) || listings.length, listings };
  }

  // A favourite's own price on one portal ({from, to} in that portal's
  // currency) replaces the page-1 price there.
  const withoutFilterPrice = (filters) => ({ ...filters, priceFrom: "", priceTo: "" });
  function withPriceRange(url, fromKey, toKey, price) {
    const next = new URL(url);
    next.searchParams.delete(fromKey);
    next.searchParams.delete(toKey);
    if (price?.from !== null && price?.from !== undefined) next.searchParams.set(fromKey, String(price.from));
    if (price?.to !== null && price?.to !== undefined) next.searchParams.set(toKey, String(price.to));
    return next.toString();
  }

  async function fetchOtomotoPage(searchUrl, page) {
    const pageUrl = page > 1 ? `${searchUrl}&page=${page}` : searchUrl;
    const response = await fetch(`${MARKET_PROXY()}${pageUrl}`, { headers: { "x-respond-with": "html" } });
    if (!response.ok) throw new Error(String(response.status));
    return parseOtomotoPage(await response.text());
  }

  // The search is sorted by price, so pages taken at even distances across the
  // whole result list describe the market far better than the first pages only.
  function otomotoSamplePages(total, pageSize, whole = false) {
    const pageCount = Math.max(1, Math.min(Math.ceil(total / pageSize), 500));
    if (pageCount === 1) return [];
    // A short list is taken whole: no sampling needed.
    if (pageCount <= OTOMOTO_PAGES || (whole && total <= FULL_LIST_LIMIT)) return Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
    const wanted = Array.from({ length: OTOMOTO_PAGES }, (_, index) => (
      Math.round(1 + (index * (pageCount - 1)) / (OTOMOTO_PAGES - 1))
    ));
    return [...new Set(wanted)].filter((page) => page > 1);
  }

  async function fetchOtomotoListings(filters, onProgress, whole = false, price = null) {
    const searchUrl = price
      ? withPriceRange(buildOtomotoSearchUrl(withoutFilterPrice(filters)), "search[filter_float_price:from]", "search[filter_float_price:to]", price)
      : buildOtomotoSearchUrl(filters);
    const seen = new Set();
    const listings = [];
    const collect = (pageListings) => pageListings.forEach((listing) => {
      const key = listing.url || listing.id || `${listing.price}|${listing.mileage}|${listing.year}`;
      if (seen.has(key)) return;
      seen.add(key);
      listings.push(listing);
    });

    onProgress?.(1, "…");
    const first = await fetchOtomotoPage(searchUrl, 1);
    const pageSize = first.listings.length || 32;
    // "Bezwypadkowy" is not in the result list: the same search counted with
    // the seller's "accident-free: yes" and "no" (the rest state nothing).
    const accidentCounts = Promise.all(["1", "0"].map((value) => fetchOtomotoPage(`${searchUrl}&search%5Bfilter_enum_no_accident%5D=${value}`, 1)
      .then((page) => page.total)
      .catch(() => null)));
    // The search is sorted by price, so page and position give each offer its
    // real place in the whole result list — the chart puts it exactly there.
    const ranked = (pageListings, page) => pageListings.map((listing, index) => ({
      ...listing,
      rank: (page - 1) * pageSize + index + 1,
      marketTotal: first.total,
    }));
    collect(ranked(first.listings, 1));
    const pages = otomotoSamplePages(first.total, pageSize, whole);
    let done = 1;
    const failed = [];
    // A few pages at a time: quicker than one by one, gentle on the proxy.
    for (let start = 0; start < pages.length; start += OTOMOTO_PARALLEL) {
      const batch = pages.slice(start, start + OTOMOTO_PARALLEL);
      const results = await Promise.allSettled(batch.map((page) => fetchOtomotoPage(searchUrl, page)));
      results.forEach((result, index) => {
        // One unreachable page still leaves a usable sample.
        if (result.status === "fulfilled") collect(ranked(result.value.listings, batch[index]));
        else failed.push(batch[index]);
      });
      done += batch.length;
      onProgress?.(done, pages.length + 1);
    }
    // Pages the proxy refused are asked once more, one by one, so a whole
    // list stays whole.
    for (const page of failed) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        collect(ranked((await fetchOtomotoPage(searchUrl, page)).listings, page));
      } catch {
        // Still missing: the list is marked as a sample.
      }
    }
    const [noAccident, afterAccident] = await accidentCounts;
    // Kept on every offer, like marketTotal, so a saved check has them too.
    if (Number.isFinite(noAccident) && Number.isFinite(afterAccident)) listings.forEach((listing) => Object.assign(listing, { noAccident, afterAccident }));
    return { listings, total: first.total };
  }

  // Blocket's API answers 50 offers a page, at most 50 pages in one sort
  // order. Pages spread evenly over the price-sorted list; beyond 2 500 offers
  // the dear half is read from the other end (sorted down), where an offer's
  // place is total − position + 1.
  function blocketListing(doc, rank, total) {
    const price = Number(doc?.price?.amount);
    if (!Number.isFinite(price) || price <= 0) return null;
    const mileageMil = Number(doc.mileage);
    const kmPerMil = window.AUTOGOOD_BLOCKET?.kmPerMil || 10;
    return {
      id: String(doc.id || doc.canonical_url || ""),
      url: String(doc.canonical_url || (doc.id ? `https://www.blocket.se/mobility/item/${doc.id}` : "")),
      title: String(doc.heading || [doc.make, doc.model].filter(Boolean).join(" ") || "blocket.se"),
      subtitle: String(doc.model_specification || "").slice(0, 160),
      source: "blocket",
      price: Math.round(price),
      currency: String(doc.price.currency_code || "SEK").toUpperCase(),
      year: Number(doc.year) || "",
      // Blocket counts in Swedish mil (10 km).
      mileage: Number.isFinite(mileageMil) && mileageMil > 0 ? String(Math.round(mileageMil * kmPerMil)) : "",
      fuel: String(doc.fuel || "").slice(0, 40),
      city: String(doc.location || "").slice(0, 80),
      country: "SE",
      // "Företag" = a company (dealer); the ad's date (ms) for "w ofercie od".
      seller: /f[öo]retag/i.test(String(doc.dealer_segment || "")) ? "dealer" : doc.dealer_segment ? "private" : "",
      listedAt: Number(doc.timestamp) > 0 ? new Date(Number(doc.timestamp)).toISOString() : "",
      rank,
      marketTotal: total,
    };
  }

  async function fetchBlocketPage(filters, page, sort = "PRICE_ASC", price = null) {
    const apiUrl = price
      ? withPriceRange(window.AUTOGOOD_BLOCKET.buildApiUrl(withoutFilterPrice(filters), { page, sort }), "price_from", "price_to", price)
      : window.AUTOGOOD_BLOCKET.buildApiUrl(filters, { page, sort });
    const data = await window.AUTOGOOD_BLOCKET.fetchApi(apiUrl);
    return {
      total: Number(data?.metadata?.result_size?.match_count) || 0,
      docs: Array.isArray(data?.docs) ? data.docs : [],
    };
  }

  async function fetchBlocketListings(filters, onProgress, whole = false, price = null) {
    if (!window.AUTOGOOD_BLOCKET) return null;
    await window.AUTOGOOD_BLOCKET.sekRateReady?.();
    const first = await fetchBlocketPage(filters, 1, "PRICE_ASC", price);
    const total = first.total;
    if (!total) return { listings: [], total: 0 };
    const pageCount = Math.ceil(total / BLOCKET_PAGE_SIZE);
    // [page, sort] pairs: the whole list when short, else evenly spread pages,
    // the upper half read from the dear end when it is out of reach.
    const reachable = Math.min(pageCount, BLOCKET_MAX_PAGES);
    const wanted = [];
    if (pageCount <= BLOCKET_PAGES || (whole && total <= FULL_LIST_LIMIT)) {
      for (let page = 2; page <= pageCount; page += 1) wanted.push([page, "PRICE_ASC"]);
    } else {
      const spots = Array.from({ length: BLOCKET_PAGES }, (_, index) => Math.round(1 + (index * (pageCount - 1)) / (BLOCKET_PAGES - 1)));
      [...new Set(spots)].filter((page) => page > 1).forEach((page) => {
        if (page <= reachable) wanted.push([page, "PRICE_ASC"]);
        else wanted.push([Math.min(BLOCKET_MAX_PAGES, pageCount - page + 1), "PRICE_DESC"]);
      });
    }
    const seen = new Set();
    const listings = [];
    const collect = (docs, page, sort) => docs.forEach((doc, index) => {
      const position = (page - 1) * BLOCKET_PAGE_SIZE + index + 1;
      const rank = sort === "PRICE_DESC" ? total - position + 1 : position;
      const listing = blocketListing(doc, rank, total);
      if (!listing || seen.has(listing.id)) return;
      seen.add(listing.id);
      listings.push(listing);
    });
    collect(first.docs, 1, "PRICE_ASC");
    let done = 1;
    for (let start = 0; start < wanted.length; start += OTOMOTO_PARALLEL) {
      const batch = wanted.slice(start, start + OTOMOTO_PARALLEL);
      const results = await Promise.allSettled(batch.map(([page, sort]) => fetchBlocketPage(filters, page, sort, price)));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") collect(result.value.docs, batch[index][0], batch[index][1]);
      });
      done += batch.length;
      onProgress?.(done, wanted.length + 1);
    }
    return { listings, total };
  }

  // AutoScout24 through the reader proxy, sorted by price; a whole list when
  // short enough, else pages spread evenly over it (as otomoto).
  async function fetchAutoscoutListings(filters, { countries, price = null, whole = false, onProgress = null } = {}) {
    const autoscout = window.AUTOGOOD_AUTOSCOUT;
    if (!autoscout) return null;
    const read = async (page) => {
      const response = await fetch(`${MARKET_PROXY()}${autoscout.buildSearchUrl(filters, { countries, price, page })}`, { headers: { "x-respond-with": "html" } });
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    };
    const first = autoscout.parseSearchPage(await read(1), { page: 1 });
    if (!first.total) return { listings: [], total: 0, read: 0 };
    // The search must have found this car, not a whole make.
    const wanted = (value) => autoscout.slug(value);
    const matches = first.listings.filter((listing) => wanted(listing.model).startsWith(wanted(filters.model)) || wanted(filters.model).startsWith(wanted(listing.model)));
    if (filters.model && first.listings.length && matches.length < first.listings.length / 2) throw new Error("model not found on AutoScout24");
    const pageCount = Math.max(1, first.pages);
    let pages;
    if (pageCount <= OTOMOTO_PAGES || (whole && first.total <= FULL_LIST_LIMIT)) pages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
    else pages = [...new Set(Array.from({ length: OTOMOTO_PAGES }, (_, index) => Math.round(1 + (index * (pageCount - 1)) / (OTOMOTO_PAGES - 1))))].filter((page) => page > 1);
    const seen = new Set();
    const listings = [];
    const collect = (items) => items.forEach((listing) => {
      if (!listing.id || seen.has(listing.id)) return;
      seen.add(listing.id);
      listings.push(listing);
    });
    collect(first.listings);
    const failed = [];
    for (let start = 0; start < pages.length; start += OTOMOTO_PARALLEL) {
      const batch = pages.slice(start, start + OTOMOTO_PARALLEL);
      const results = await Promise.allSettled(batch.map(read));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") collect(autoscout.parseSearchPage(result.value, { page: batch[index], total: first.total }).listings);
        else failed.push(batch[index]);
      });
      onProgress?.(Math.min(pages.length, start + OTOMOTO_PARALLEL) + 1, pages.length + 1);
    }
    for (const page of failed) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        collect(autoscout.parseSearchPage(await read(page), { page, total: first.total }).listings);
      } catch {
        // Still missing: the list counts as a sample.
      }
    }
    return { listings, total: first.total, read: listings.length };
  }

  // The same car on both portals: same price and same mileage. AutoScout24
  // keeps only what mobile.de does not have.
  function dropMobileDuplicates(autoscoutListings, mobileListings) {
    const keyOf = (listing) => {
      const mileage = Number(listing.mileage) || 0;
      return mileage ? `${Math.round(Number(listing.price))}|${mileage}` : "";
    };
    const onMobile = new Set(mobileListings.map(keyOf).filter(Boolean));
    const unique = autoscoutListings.filter((listing) => !onMobile.has(keyOf(listing)));
    return { unique, duplicates: autoscoutListings.length - unique.length };
  }

  // Mobile.de through the local importer (the user's own Chrome), when it
  // is reachable; otherwise the analysis simply goes on without it.
  // mobile.de takes one country per search ("cn"; several give Germany
  // alone, checked 2026-10-03). More countries: each is searched on its own
  // (the small foreign lists whole) and the lists are merged; an offer's
  // place in the merged price order = its place in its own list + the
  // cheaper offers of the other lists.
  async function fetchMobileDeSample(filters, whole = false, price = null, onProgress = null) {
    const countries = (filters.countries || []).filter(Boolean);
    if (countries.length <= 1) return fetchMobileDeCountry(filters, whole, price);
    const lists = [];
    for (const country of countries) {
      onProgress?.(lists.length, countries.length, "countries");
      try {
        const result = await fetchMobileDeCountry({ ...filters, countries: [country] }, country === "DE" ? whole : true, price);
        if (result) lists.push({ country, ...result });
      } catch {
        // One country unreachable: the others still count.
      }
    }
    if (!lists.length) return null;
    const total = lists.reduce((sum, list) => sum + (Number(list.total) || list.listings.length), 0);
    const cheaperIn = (list, value) => Math.max(0, ...list.listings.filter((listing) => Number(listing.price) < value).map((listing) => Number(listing.rank) || 0));
    const listings = lists.flatMap((list) => list.listings.map((listing) => ({
      ...listing,
      country: listing.country || list.country,
      rank: listing.rank ? listing.rank + lists.filter((other) => other !== list).reduce((sum, other) => sum + cheaperIn(other, Number(listing.price)), 0) : listing.rank,
      marketTotal: total,
    })));
    return { listings, total, countries: lists.map((list) => list.country) };
  }

  async function fetchMobileDeCountry(filters, whole = false, price = null) {
    if (typeof window.AUTOGOOD_MOBILEDE_SEARCH !== "function") return null;
    let searchUrl = buildMobileDeSearchUrl(price ? withoutFilterPrice(filters) : filters);
    if (price) {
      const url = new URL(searchUrl);
      url.searchParams.set("p", `${price.from ?? ""}:${price.to ?? ""}`);
      searchUrl = url.toString();
    }
    // The importer reads at most 12 pages of 20: whole lists up to 240 offers.
    const result = await window.AUTOGOOD_MOBILEDE_SEARCH(searchUrl, whole ? { pages: 12 } : {});
    return result?.listings?.length ? result : null;
  }

  // av.by: 25 offers a page; pages spread evenly over the list sorted from the
  // cheapest, read one after another (av.by refuses bursts, see avby-search.js).
  function avbyListing(advert, rank, total) {
    const price = Number(advert?.price?.usd?.amount);
    if (!Number.isFinite(price) || price <= 0) return null;
    const property = (name) => (advert.properties || []).find((item) => item.name === name)?.value;
    const capacity = Number(String(property("engine_capacity") || "").replace(",", "."));
    return {
      id: String(advert.id || ""),
      url: String(advert.publicUrl || ""),
      title: [property("brand"), property("model"), property("generation")].filter(Boolean).join(" ") || "av.by",
      subtitle: [property("engine_capacity") ? `${property("engine_capacity")} л` : "", property("engine_type"), property("transmission_type")].filter(Boolean).join(", ").slice(0, 160),
      source: "avby",
      // The seller's own price, in USD as av.by shows it first.
      price: Math.round(price),
      currency: "USD",
      // BYN as av.by states it: Belarus comparisons convert it at the NBRB rate.
      priceByn: Number(advert?.price?.byn?.amount) || null,
      year: Number(advert.year || property("year")) || "",
      mileage: Number(property("mileage_km")) > 0 ? String(property("mileage_km")) : "",
      power: property("engine_power") ? `${property("engine_power")} KM` : "",
      fuel: String(property("engine_type") || "").slice(0, 40),
      displacementCcm: Number.isFinite(capacity) && capacity > 0 ? Math.round(capacity * 1000) : null,
      city: String(advert.locationName || "").slice(0, 80),
      country: "BY",
      rank,
      marketTotal: total,
    };
  }

  async function fetchAvbyListings(filters, whole = false) {
    const avby = window.AUTOGOOD_AVBY;
    if (!avby) return null;
    await avby.usdRateReady?.();
    const first = await avby.search(filters, { page: 1 });
    const total = Number(first?.count) || 0;
    if (!total) return { listings: [], total: 0 };
    const pageCount = Number(first.pageCount) || Math.ceil(total / AVBY_PAGE_SIZE);
    let pages;
    if (pageCount <= AVBY_PAGES || (whole && total <= FULL_LIST_LIMIT)) {
      pages = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
    } else {
      const spots = Array.from({ length: AVBY_PAGES }, (_, index) => Math.round(1 + (index * (pageCount - 1)) / (AVBY_PAGES - 1)));
      pages = [...new Set(spots)].filter((page) => page > 1);
    }
    const seen = new Set();
    const listings = [];
    const collect = (adverts, page) => (adverts || []).forEach((advert, index) => {
      const listing = avbyListing(advert, (page - 1) * AVBY_PAGE_SIZE + index + 1, total);
      if (!listing || seen.has(listing.id)) return;
      seen.add(listing.id);
      listings.push(listing);
    });
    collect(first.adverts, 1);
    for (const page of pages) {
      try {
        collect((await avby.search(filters, { page })).adverts, page);
      } catch {
        // One unreachable page still leaves a usable sample.
      }
    }
    return { listings, total };
  }

  // Fetch only selected markets; one failing market does not stop the others.
  const otomotoProvider = {
    id: "otomoto",
    lastSources: ["otomoto"],
    async getListings({ filters, pinned = null, historyId = "", progress = null }) {
      const c = copy();
      setAnalysisStatus(c.preparing);
      const selected = filters.markets || MARKET_SOURCES.filter((source) => chartSources[source]);
      // Favourites: whole lists where short enough (page 3 compares offers).
      const favorite = historyId ? marketHistory.find((entry) => entry.id === historyId) : historyEntryForFilters(filters);
      const whole = pinned ?? Boolean(favorite?.pinned);
      // ... and their own price per portal (set on page 3 "Monitoring").
      const prices = Object.fromEntries(MARKET_SOURCES.map((source) => [source, whole && favorite ? window.AUTOGOOD_FAVORITES_WATCH?.portalPrice?.(favorite.id, source) || null : null]));
      this.lastPrices = JSON.stringify(Object.fromEntries(Object.entries(prices).filter(([, price]) => price)));
      // Each portal says how far it got (page 3 shows it while it checks).
      const step = (source) => (done, total, unit = "pages") => progress?.(source, { state: "run", done, total, unit });
      const track = (source, promise) => {
        if (!promise) return null;
        progress?.(source, { state: "run" });
        return promise.then((value) => {
          progress?.(source, { state: "ok", count: value?.listings?.length || 0 });
          return value;
        }, (error) => {
          progress?.(source, { state: "fail" });
          throw error;
        });
      };
      const [otomoto, mobile, blocket, avby, autoscout] = await Promise.allSettled([
        selected.includes("otomoto") ? track("otomoto", fetchOtomotoListings(filters, (page, pages) => {
          setAnalysisStatus(`${c.otomotoFetching} ${page}/${pages}`);
          step("otomoto")(page, pages);
        }, whole, prices.otomoto)) : null,
        selected.includes("mobile") ? track("mobile", fetchMobileDeSample(filters, whole, prices.mobile, step("mobile"))) : null,
        selected.includes("blocket") ? track("blocket", fetchBlocketListings(filters, step("blocket"), whole, prices.blocket)) : null,
        selected.includes("avby") ? track("avby", fetchAvbyListings(prices.avby ? { ...withoutFilterPrice(filters), avbyPriceUsd: prices.avby } : filters, whole)) : null,
        selected.includes("autoscout") ? track("autoscout", fetchAutoscoutListings(filters, {
          countries: (filters.countries || []).length ? filters.countries : ["DE"],
          price: prices.autoscout || prices.mobile || null,
          whole,
          onProgress: step("autoscout"),
        })) : null,
      ]);
      this.lastErrors = Object.fromEntries([["otomoto", otomoto], ["mobile", mobile], ["blocket", blocket], ["avby", avby], ["autoscout", autoscout]]
        .filter(([, result]) => result.status === "rejected").map(([source, result]) => [source, String(result.reason?.message || result.reason || "")]));
      const otomotoListings = otomoto.status === "fulfilled" ? (otomoto.value?.listings || []) : [];
      const mobileResult = mobile.status === "fulfilled" ? mobile.value : null;
      const mobileListings = (mobileResult?.listings || []).map((listing) => ({ ...listing, source: "mobile", markettotal: listing.marketTotal }));
      const blocketResult = blocket.status === "fulfilled" ? blocket.value : null;
      const blocketListings = blocketResult?.listings || [];
      const avbyResult = avby.status === "fulfilled" ? avby.value : null;
      const avbyListings = avbyResult?.listings || [];
      // AutoScout24 keeps what mobile.de does not have (same price + mileage
      // = the same car); without mobile.de's offers nothing can be dropped.
      const autoscoutResult = autoscout.status === "fulfilled" ? autoscout.value : null;
      const autoscoutAll = (autoscoutResult?.listings || []).map((listing) => ({ ...listing, markettotal: listing.marketTotal, vatdeductible: listing.vatDeductible }));
      const { unique: autoscoutListings, duplicates } = mobileListings.length ? dropMobileDuplicates(autoscoutAll, mobileListings) : { unique: autoscoutAll, duplicates: 0 };
      this.lastAutoscout = autoscoutResult ? {
        total: autoscoutResult.total,
        read: autoscoutAll.length,
        duplicates,
        complete: autoscoutAll.length >= autoscoutResult.total * COMPLETE_SHARE,
        deduplicated: Boolean(mobileListings.length),
      } : null;
      if (!otomotoListings.length && !mobileListings.length && !blocketListings.length && !avbyListings.length && !autoscoutListings.length) throw new Error(c.otomotoFailed);
      this.lastSources = [
        otomotoListings.length ? "otomoto" : "",
        mobileListings.length ? "mobile" : "",
        blocketListings.length ? "blocket" : "",
        avbyListings.length ? "avby" : "",
        autoscoutListings.length ? "autoscout" : "",
      ].filter(Boolean);
      const messages = [];
      if (otomotoListings.length) {
        otomotoTotal = otomoto.value.total;
        messages.push(c.otomotoFetched.replace("{count}", String(otomotoListings.length)).replace("{total}", String(otomotoTotal)));
      }
      if (mobileListings.length) {
        messages.push(c.mobileFetched.replace("{count}", String(mobileListings.length)).replace("{total}", String(mobileResult.total || mobileListings.length)));
      }
      if (blocketListings.length) {
        messages.push(c.blocketFetched.replace("{count}", String(blocketListings.length)).replace("{total}", String(blocketResult.total || blocketListings.length)));
      }
      if (avbyListings.length) {
        messages.push(c.avbyFetched.replace("{count}", String(avbyListings.length)).replace("{total}", String(avbyResult.total || avbyListings.length)));
      }
      if (autoscoutResult) {
        messages.push((mobileListings.length ? c.autoscoutFetched : c.autoscoutUnchecked)
          .replace("{count}", String(autoscoutListings.length))
          .replace("{total}", String(autoscoutResult.total))
          .replace("{duplicates}", String(duplicates)));
      }
      setAnalysisStatus(messages.join(" "));
      return [...otomotoListings, ...mobileListings, ...autoscoutListings, ...blocketListings, ...avbyListings];
    },
  };

  function normalizeHistoryEntry(entry, index) {
    return {
      id: String(entry.id || `legacy-${index}`),
      filters: entry.filters,
      signature: filterSignature(entry.filters),
      listings: normalizeListings(entry.listings),
      sourceFileName: String(entry.sourceFileName || ""),
      searchUrl: String(entry.searchUrl || ""),
      pinned: Boolean(entry.pinned),
      pinnedAt: entry.pinned ? String(entry.pinnedAt || "") : "",
      // Entries saved before prices were dated count from their last update.
      dataAt: String(entry.dataAt || (entry.listings?.length >= 3 ? entry.updatedAt || entry.createdAt || "" : "")),
      // The whole price history is kept, never cut.
      priceLog: Array.isArray(entry.priceLog) ? entry.priceLog.filter((point) => point && point.at) : [],
      // Scheduled checks of a favourite (run by the automation server, B5).
      autoRefresh: entry.autoRefresh?.enabled ? { enabled: true, every: String(entry.autoRefresh.every || "daily") } : null,
      createdAt: String(entry.createdAt || entry.updatedAt || new Date().toISOString()),
      updatedAt: String(entry.updatedAt || entry.createdAt || new Date().toISOString()),
    };
  }

  function readStoredEntries(key) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return [];
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("not a list");
      return parsed
        .filter((entry) => entry?.filters?.brand && entry?.filters?.model)
        .map((entry, index) => {
          try {
            return normalizeHistoryEntry(entry, index);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      // Keep the unreadable text aside so the next write cannot destroy it.
      try {
        localStorage.setItem(`${BROKEN_HISTORY_KEY_PREFIX}${new Date().toISOString()}`, raw);
        localStorage.removeItem(key);
      } catch {
        // Nothing more can be done in this browser.
      }
      return [];
    }
  }

  // Reads the stored history (the current one or the legacy key) and puts back
  // every favourite from the backup key that the history itself lost.
  function loadMarketHistory() {
    let entries = readStoredEntries(HISTORY_STORAGE_KEY);
    if (!entries.length) entries = readStoredEntries(LEGACY_HISTORY_STORAGE_KEY);
    const known = new Set(entries.map((entry) => entry.id));
    const restored = readStoredEntries(FAVORITES_BACKUP_KEY)
      .filter((entry) => !known.has(entry.id))
      .map((entry) => ({ ...entry, pinned: true }));
    return trimHistory([...entries, ...restored]);
  }

  // Other tabs of mobile.html write to the same storage; every change starts
  // from what is stored now, never from a copy loaded when the tab opened.
  function refreshMarketHistory() {
    marketHistory = loadMarketHistory();
  }

  // Pinned entries first, then the newest checks; unpinned ones are capped.
  function trimHistory(entries) {
    const sorted = [...entries].sort((left, right) => {
      if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
      return String(right.updatedAt).localeCompare(String(left.updatedAt));
    });
    const pinned = sorted.filter((entry) => entry.pinned);
    const recent = sorted.filter((entry) => !entry.pinned).slice(0, HISTORY_LIMIT);
    return [...pinned, ...recent];
  }

  function storeFavoritesBackup(entries) {
    const favorites = entries
      .filter((entry) => entry.pinned)
      .map(({ listings, signature, ...entry }) => entry);
    localStorage.setItem(FAVORITES_BACKUP_KEY, JSON.stringify(favorites));
  }

  // When the storage is full, offer lists of the oldest unpinned checks go
  // first, then those of every unpinned check; favourites are never dropped.
  function storeMarketHistory(entries) {
    // A favourite keeps the moment it was starred: the favourites keep their
    // order whatever is updated later (the history itself goes newest first).
    const now = new Date().toISOString();
    const trimmed = trimHistory(entries).map((entry) => (entry.pinned
      ? (entry.pinnedAt ? entry : { ...entry, pinnedAt: now })
      : (entry.pinnedAt ? { ...entry, pinnedAt: "" } : entry)));
    try {
      storeFavoritesBackup(trimmed);
    } catch {
      setAnalysisStatus(copy().historyStorageError, true);
      return false;
    }
    const attempts = [
      trimmed,
      trimmed.map((entry, index) => (!entry.pinned && index >= trimmed.length - HISTORY_LIMIT / 2 ? { ...entry, listings: [] } : entry)),
      trimmed.map((entry) => (entry.pinned ? entry : { ...entry, listings: [] })),
    ];
    for (const attempt of attempts) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(attempt));
        marketHistory = attempt;
        return true;
      } catch {
        // Try again with less data.
      }
    }
    setAnalysisStatus(copy().historyStorageError, true);
    return false;
  }

  function historyEntryForFilters(filters) {
    const signature = searchSignature(filters);
    return marketHistory.find((entry) => searchSignature(entry.filters) === signature) || null;
  }

  // Price history: every time an entry gets new prices, the typical price of
  // each marketplace is written down with the date, so price changes of a
  // tracked car can be followed over weeks. Otomoto in PLN, Mobile.de in EUR,
  // so the exchange rate does not move the history.
  function marketPricePoint(listings, at, filters = {}) {
    const point = { at };
    MARKET_SOURCES.forEach((source) => {
      const currency = SOURCE_CURRENCY[source];
      const inCurrency = (listing) => convertPrice(listing.price, listing.currency || "EUR", currency);
      // The same offers as the statistics: suspect ones left out.
      const own = listings.filter((listing) => listingSource(listing) === source);
      const flagged = suspectOffers(own, (listing) => priceInPln(listing.price, listing.currency || "EUR"));
      const kept = own.filter((listing) => !flagged.has(listing));
      if (kept.length < 3) return;
      const byPrice = [...kept].sort((left, right) => inCurrency(left) - inCurrency(right));
      const prices = byPrice.map(inCurrency);
      point[source] = {
        currency,
        count: prices.length,
        median: Math.round(percentile(prices, 0.5)),
        p25: Math.round(percentile(prices, 0.25)),
        p75: Math.round(percentile(prices, 0.75)),
        middleCount: prices.filter((value) => value >= percentile(prices, 0.25) && value <= percentile(prices, 0.75)).length,
        min: Math.round(prices[0]),
        max: Math.round(prices[prices.length - 1]),
        minUrl: byPrice[0].url || "",
        maxUrl: byPrice[byPrice.length - 1].url || "",
      };
      // Foreign markets: also what the client pays in Poland ("na gotowo").
      const turnkey = window.AUTOGOOD_TURNKEY;
      if (TURNKEY_SOURCES.includes(source) && turnkey) {
        const turnkeyPrices = kept.map((listing) => turnkey.turnkeyAverage(turnkeyInput(listing, listing.price, listing.currency || currency), filters).total).sort((left, right) => left - right);
        point[source].turnkey = {
          median: Math.round(percentile(turnkeyPrices, 0.5)),
          p25: Math.round(percentile(turnkeyPrices, 0.25)),
          p75: Math.round(percentile(turnkeyPrices, 0.75)),
          min: turnkeyPrices[0],
          max: turnkeyPrices[turnkeyPrices.length - 1],
        };
      }
      // German offers: also turnkey with customs in Minsk, USD (Belarus mode).
      if ((source === "mobile" || source === "autoscout") && window.AUTOGOOD_TURNKEY_BY) {
        const byPrices = kept
          .map((listing) => turnkeyByFor({ ...listing, originalPrice: listing.price, originalCurrency: listing.currency || currency }, filters)?.totalUsd)
          .filter((value) => Number.isFinite(value))
          .sort((left, right) => left - right);
        if (byPrices.length >= 3) {
          point[source].turnkeyBy = {
            currency: "USD",
            count: byPrices.length,
            median: Math.round(percentile(byPrices, 0.5)),
            p25: Math.round(percentile(byPrices, 0.25)),
            p75: Math.round(percentile(byPrices, 0.75)),
            min: Math.round(byPrices[0]),
            max: Math.round(byPrices[byPrices.length - 1]),
          };
        }
      }
    });
    return MARKET_SOURCES.some((source) => point[source]) ? point : null;
  }

  // What the next saved snapshot measured: which marketplaces were fetched
  // just now, and whether it is a check of its own (Odśwież dane / opening a
  // search) or offers joining the latest check (Mobile.de bookmark, a file).
  let nextMeasurement = null;
  function measureNextSnapshot(sources, isNewCheck, prices = null, offers = null) {
    nextMeasurement = { sources, isNewCheck, prices, offers };
  }

  // ---- Offers of every check (IndexedDB) ---------------------------------
  // Each dated check also keeps its offers, so page 3 can draw the market of
  // any date and tell which offers are new, gone or repriced. localStorage is
  // far too small for this, IndexedDB of the same browser holds it. Records
  // are only ever added or merged, never deleted.
  const CHECK_OFFERS_DB = "autogood-mobile-check-offers";
  const CHECK_OFFERS_STORE = "checks";
  // A list read to at least this share of its total counts as complete: only
  // then "new" and "gone" are certain (a sample misses offers).
  const COMPLETE_SHARE = 0.95;
  let checkOffersDbPromise = null;
  const checkOffersCache = new Map();

  function openCheckOffersDb() {
    if (!checkOffersDbPromise) {
      checkOffersDbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error("IndexedDB unavailable"));
          return;
        }
        const request = indexedDB.open(CHECK_OFFERS_DB, 1);
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore(CHECK_OFFERS_STORE, { keyPath: "key" });
          store.createIndex("historyId", "historyId");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch((error) => {
        checkOffersDbPromise = null;
        throw error;
      });
    }
    return checkOffersDbPromise;
  }

  // The same offer on two dates: the portal's own ad number.
  function offerKey(listing) {
    try {
      const url = new URL(listing.url);
      const mobileId = url.searchParams.get("id") || url.pathname.match(/\/(\d+)\.html$/)?.[1];
      if (url.hostname.endsWith("mobile.de") && mobileId) return `mobile:${mobileId}`;
      return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
    } catch {
      return `id:${listing.id || `${listing.price}|${listing.year}|${listing.mileage}`}`;
    }
  }

  // Power as KM whatever the portal writes ("110 kW (150 PS)", "150 hk").
  function powerInKm(value) {
    const text = String(value || "");
    const hp = text.match(/(\d+)\s*(?:PS|KM|hk|HP|л\.?\s?с)/i);
    if (hp) return `${hp[1]} KM`;
    const kw = text.match(/(\d+)\s*kW/i);
    if (kw) return `${Math.round(Number(kw[1]) * 1.35962)} KM`;
    const plain = text.match(/^\s*(\d+)\s*$/);
    return plain ? `${plain[1]} KM` : text.slice(0, 30);
  }

  // What the turnkey estimate needs of an offer: price, fuel, name and the
  // engine size — from the result list, else from its ad once read
  // (mobile-ad-details.js), which decides the excise class.
  function turnkeyInput(listing, price = listing.price, currency = listing.currency) {
    const details = listingSource(listing) === "mobile" ? window.AUTOGOOD_AD_DETAILS?.get(listing.id) : null;
    return {
      price,
      currency: currency || SOURCE_CURRENCY[listingSource(listing)],
      fuel: listing.fuel || details?.fuel || "",
      title: listing.title,
      subtitle: listing.subtitle,
      displacementCcm: Number(listing.displacementCcm) || Number(details?.ccm) || null,
    };
  }

  function compactOffers(listings, source, filters) {
    const own = listings.filter((listing) => listingSource(listing) === source);
    const flagged = suspectOffers(own, (listing) => priceInPln(listing.price, listing.currency || SOURCE_CURRENCY[source]));
    const turnkey = window.AUTOGOOD_TURNKEY;
    const offers = own.map((listing) => ({
      key: offerKey(listing),
      url: listing.url || "",
      title: String(listing.title || "").slice(0, 90),
      price: listing.price,
      currency: listing.currency || SOURCE_CURRENCY[source],
      year: listing.year || null,
      mileage: Number(listing.mileage) || null,
      rank: listing.rank || null,
      power: powerInKm(listing.power),
      priceType: listing.priceType || "",
      netPrice: listing.netPrice || 0,
      seller: listing.seller || "",
      country: String(listing.country || "").slice(0, 4),
      listedAt: listing.listedAt || undefined,
      // For the turnkey price in Belarus: engine size, first registration, fuel.
      ccm: Number(listing.displacementCcm) || undefined,
      reg: listing.firstRegistration || undefined,
      fuel: String(listing.fuel || "").slice(0, 20) || undefined,
      turnkey: TURNKEY_SOURCES.includes(source) && turnkey ? Math.round(turnkey.turnkeyAverage(turnkeyInput(listing, listing.price, listing.currency || SOURCE_CURRENCY[source]), filters).total) : null,
      suspect: flagged.has(listing) || undefined,
    }));
    const total = Math.max(offers.length, ...own.map((listing) => Number(listing.marketTotal) || 0));
    return { total, complete: offers.length >= total * COMPLETE_SHARE, offers };
  }

  // Adds the offers of the given markets to the check of that date.
  async function saveCheckOffers(historyId, at, sources, listings, filters, notes = {}) {
    const markets = {};
    sources.forEach((source) => {
      if (source === "scope") return;
      // notes: what the list alone cannot tell (AutoScout24's duplicates of
      // mobile.de, its completeness before they were dropped, countries).
      const market = { ...compactOffers(listings, source, filters), ...(notes?.[source] || {}) };
      if (market.offers.length) markets[source] = market;
    });
    if (!Object.keys(markets).length) return;
    try {
      const db = await openCheckOffersDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CHECK_OFFERS_STORE, "readwrite");
        const store = tx.objectStore(CHECK_OFFERS_STORE);
        const key = `${historyId}|${at}`;
        const read = store.get(key);
        read.onsuccess = () => {
          const record = read.result || { key, historyId, at, markets: {} };
          // A Monitoring check is marked with its countries and portals, so
          // it is compared only with checks of the same scope.
          store.put({ ...record, ...(notes?.scope ? { scope: notes.scope } : {}), markets: { ...record.markets, ...markets } });
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      checkOffersCache.delete(historyId);
      if (priceHistoryId === historyId && currentPage?.() === "history") renderPriceHistoryPage();
    } catch {
      // Not kept in this browser: the dated statistics still are.
    }
  }

  // Every saved check of a search, by its date.
  async function loadCheckOffers(historyId) {
    if (checkOffersCache.has(historyId)) return checkOffersCache.get(historyId);
    const records = await openCheckOffersDb().then((db) => new Promise((resolve, reject) => {
      const request = db.transaction(CHECK_OFFERS_STORE).objectStore(CHECK_OFFERS_STORE).index("historyId").getAll(historyId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    })).catch(() => []);
    const byDate = new Map(records.map((record) => [record.at, record]));
    checkOffersCache.set(historyId, byDate);
    return byDate;
  }

  function withPriceLog(entry, previous) {
    const measurement = nextMeasurement;
    nextMeasurement = null;
    // The price history is never dropped. Changed filters (not just the
    // compared markets) are marked in it, so later checks are not compared
    // with the ones before.
    const sameSearch = !previous || searchSignature(previous.filters) === searchSignature(entry.filters);
    const log = [...(previous?.priceLog || [])];
    const dataAt = sameSearch ? previous?.dataAt || "" : "";
    const now = new Date().toISOString();
    if (!sameSearch && log.some((point) => MARKET_SOURCES.some((source) => point[source]))) {
      const marker = { at: now, filtersChange: true, filters: entry.filters };
      // Changed again before any new check: one mark with the latest filters.
      if (log[log.length - 1]?.filtersChange) log[log.length - 1] = marker;
      else log.push(marker);
    }
    const point = measurement && entry.listings.length >= 3 ? marketPricePoint(entry.listings, now, entry.filters) : null;
    const fresh = point ? Object.fromEntries(measurement.sources.filter((source) => point[source]).map((source) => [source, point[source]])) : {};
    if (!Object.keys(fresh).length) return { ...entry, priceLog: log, dataAt: entry.listings.length >= 3 ? dataAt : "" };
    const last = log[log.length - 1];
    // Another price per portal than at the last check: a new market, marked.
    const lastCheck = [...log].reverse().find((item) => !item.filtersChange);
    if (measurement.prices !== null && measurement.prices !== undefined && lastCheck && (lastCheck.prices || "{}") !== measurement.prices && !last.filtersChange) {
      log.push({ at: now, filtersChange: true, pricesChange: true, filters: entry.filters });
    }
    const priceKey = measurement.prices ? { prices: measurement.prices } : {};
    if (measurement.isNewCheck || !last || log[log.length - 1].filtersChange || Date.parse(now) - Date.parse(last.at) >= PRICE_POINT_MERGE_MS) {
      // Every check is its own row, stamped with its time.
      log.push({ at: now, ...priceKey, ...fresh });
      saveCheckOffers(entry.id, now, measurement.offers?.sources || Object.keys(fresh), measurement.offers?.listings || entry.listings, entry.filters, measurement.offers?.notes);
    } else {
      // Offers of another marketplace fetched soon after belong to that check.
      log[log.length - 1] = { ...last, ...fresh };
      saveCheckOffers(entry.id, last.at, measurement.offers?.sources || Object.keys(fresh), measurement.offers?.listings || entry.listings, entry.filters, measurement.offers?.notes);
    }
    return { ...entry, priceLog: log, dataAt: now };
  }

  function createMarketSnapshot(filters, listings, sourceFileName = "", searchUrl = "", pinned = false) {
    refreshMarketHistory();
    const now = new Date().toISOString();
    const entry = {
      id: `${Date.now()}-${seededNumber(`${filterSignature(filters)}|${now}`).toString(16)}`,
      filters,
      signature: filterSignature(filters),
      listings: normalizeListings(listings),
      sourceFileName,
      searchUrl: searchUrl || buildMobileDeSearchUrl(filters),
      pinned,
      createdAt: now,
      updatedAt: now,
    };
    const dated = withPriceLog(entry, null);
    if (!storeMarketHistory([dated, ...marketHistory])) return null;
    renderHistory();
    return dated;
  }

  function updateMarketSnapshot(historyId, filters, listings, sourceFileName = "", searchUrl = "", pinned = null) {
    refreshMarketHistory();
    const index = marketHistory.findIndex((entry) => entry.id === historyId);
    if (index < 0) return null;
    const existing = marketHistory[index];
    const entry = {
      ...existing,
      filters,
      signature: filterSignature(filters),
      listings: normalizeListings(listings),
      sourceFileName,
      searchUrl: searchUrl || buildMobileDeSearchUrl(filters),
      pinned: pinned === null ? Boolean(existing.pinned) : pinned,
      updatedAt: new Date().toISOString(),
    };
    const updatedHistory = [...marketHistory];
    updatedHistory[index] = withPriceLog(entry, existing);
    if (!storeMarketHistory(updatedHistory)) return null;
    renderHistory();
    return updatedHistory[index];
  }

  function formatHistoryDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function historyMeta(filters) {
    const c = copy();
    const fuelLabels = {
      petrol: c.fuelPetrol,
      diesel: c.fuelDiesel,
      hybrid_diesel: c.fuelHybridDiesel,
      hybrid_petrol: c.fuelHybridPetrol,
      electric: c.fuelElectric,
      plugin: c.fuelPlugin,
    };
    const engine = manualFuelValues(filters)
      .map((fuel) => fuelLabels[fuel])
      .filter(Boolean)
      .join(", ");
    const gearbox = {
      automatic: c.gearboxAutomatic,
      manual: c.gearboxManual,
      any: c.gearboxAny,
    }[filters.gearbox || "any"] || c.gearboxAny;
    return [
      rangeSummary(c.price, filters.priceFrom, filters.priceTo, "EUR"),
      rangeSummary(c.year, filters.yearFrom, filters.yearTo),
      rangeSummary(c.mileage, filters.mileageFrom, filters.mileageTo, kmUnit()),
      engine ? `${c.engine}: ${engine}` : "",
      `${c.gearbox}: ${gearbox}`,
    ].filter(Boolean);
  }

  function historySearchUrl(entry) {
    if (entry.searchUrl) return entry.searchUrl;
    try {
      return buildMobileDeSearchUrl(entry.filters);
    } catch {
      return "";
    }
  }

  function renderHistory() {
    const c = copy();
    updateHistorySaveButtons();
    renderFavoritesBar();
    if (favoritesView && !favoritesView.hidden) renderFavoritesSearchPage();
    if (historyView && !historyView.hidden) renderPriceHistoryPage();
    const pinnedCount = marketHistory.filter((entry) => entry.pinned).length;
    const recentCount = marketHistory.length - pinnedCount;
    const countText = pinnedCount
      ? `★ ${pinnedCount} · ${recentCount} / ${HISTORY_LIMIT}`
      : `${recentCount} / ${HISTORY_LIMIT}`;
    historyCounts.forEach((element) => { element.textContent = countText; });
    if (!marketHistory.some((entry) => !entry.pinned)) {
      historyLists.forEach((list) => { list.innerHTML = `<p class="mobileMarketHistoryEmpty">${escapeMarketHtml(c.historyEmpty)}</p>`; });
      updateHistoryConfirm();
      return;
    }

    const listHtml = marketHistory.filter((entry) => !entry.pinned).map((entry) => {
      const title = [entry.filters.brand, entry.filters.model, entry.filters.version].filter(Boolean).join(" ");
      const meta = historyMeta(entry.filters);
      const selectedCount = entry.listings.filter((listing) => chartSources[listingSource(listing)]).length;
      const ready = selectedCount >= 3;
      const status = ready
        ? withCount(c.historyReady, selectedCount)
        : c.historyWaiting;
      return `
        <article class="mobileMarketHistoryItem${ready ? " isReady" : ""}${entry.pinned ? " isPinned" : ""}${editingHistoryId === entry.id ? " isSelected" : ""}">
          <label class="mobileMarketHistorySelect">
            <input type="radio" name="mobile-market-history-selection" value="${escapeMarketHtml(entry.id)}" data-mobile-market-history-select${editingHistoryId === entry.id ? " checked" : ""} />
            <span class="mobileMarketHistoryMain">
              <span class="mobileMarketHistoryTitleRow">
                <strong>${entry.pinned ? '<i class="mobileMarketHistoryPinMark" aria-hidden="true">★</i>' : ""}${escapeMarketHtml(title)}</strong>
                <time datetime="${escapeMarketHtml(entry.updatedAt)}">${escapeMarketHtml(formatHistoryDate(entry.updatedAt))}</time>
              </span>
              ${meta.length ? `<span class="mobileMarketHistoryMeta">${meta.map((item) => `<span>${escapeMarketHtml(item)}</span>`).join("")}</span>` : ""}
              <span class="mobileMarketHistoryStatus">${escapeMarketHtml(status)}</span>
            </span>
          </label>
          <div class="mobileMarketHistoryActions">
            ${editingHistoryId === entry.id ? `<button class="mobileMarketHistoryIconButton mobileMarketHistoryConfirmButton" type="button" data-mobile-market-history-confirm="${escapeMarketHtml(entry.id)}" aria-label="${escapeMarketHtml(c.historyConfirm)}" title="${escapeMarketHtml(c.historyConfirm)}" hidden>✓</button>` : ""}
            <button class="mobileMarketHistoryIconButton mobileMarketHistoryFavoriteButton${entry.pinned ? " isPinned" : ""}" type="button" data-mobile-market-history-pin="${escapeMarketHtml(entry.id)}" data-mobile-market-history-pinned="${entry.pinned ? "true" : "false"}" aria-pressed="${entry.pinned ? "true" : "false"}" aria-label="${escapeMarketHtml(entry.pinned ? c.historyUnpin : c.historyPin)}" title="${escapeMarketHtml(entry.pinned ? c.historyUnpin : c.historyPin)}">★</button>
            <button class="isDelete mobileMarketHistoryIconButton" type="button" data-mobile-market-history-delete="${escapeMarketHtml(entry.id)}" aria-label="${escapeMarketHtml(c.historyDelete)}" title="${escapeMarketHtml(c.historyDelete)}">×</button>
          </div>
        </article>`;
    }).join("");
    historyLists.forEach((list) => { list.innerHTML = listHtml; });
    updateHistoryConfirm();
  }

  function updateHistorySaveButtons() {
    let entry = null;
    try {
      const filters = readManualFields();
      if (filters.brand && filters.model) entry = historyEntryForFilters(filters);
    } catch {
      entry = null;
    }
    const edited = editingHistoryId ? marketHistory.find((item) => item.id === editingHistoryId) : null;
    const pinned = Boolean(entry?.pinned || edited?.pinned);
    const c = copy();
    historySaves.forEach((button) => {
      button.classList.toggle("isPinned", pinned);
      button.setAttribute("aria-pressed", String(pinned));
      button.setAttribute("aria-label", pinned ? c.historyUnpin : c.historyPin);
      button.title = pinned ? c.historyUnpin : c.historyPin;
    });
  }

  // The ✓ appears on the selected entry once the form no longer matches it.
  // Compared with the form as it stood right after the entry was loaded (or
  // last saved), not with the stored filters: older entries lack newer
  // fields, which would show "Gotowe" before anything was changed.
  let editingBaseline = "";
  function updateHistoryConfirm() {
    const entry = marketHistory.find((item) => item.id === editingHistoryId);
    let changed = false;
    try {
      changed = Boolean(entry) && filterSignature(readManualFields()) !== editingBaseline;
    } catch {
      changed = false;
    }
    historyLists.forEach((list) => list.querySelectorAll("[data-mobile-market-history-confirm]").forEach((button) => { button.hidden = !changed; }));
    // "Gotowe" in the chosen filters saves the edited entry (e.g. a favourite).
    if (historyDone) historyDone.hidden = !changed;
  }

  function confirmHistoryChanges(historyId) {
    const c = copy();
    const entry = marketHistory.find((item) => item.id === historyId);
    if (!entry) return;
    try {
      const filters = readManualFields();
      if (!filters.brand || !filters.model) throw new Error(c.missingVehicle);
      // Prices collected for the old filters no longer describe the new ones
      // (the compared markets do not change them).
      const same = searchSignature(filters) === searchSignature(entry.filters);
      const snapshot = updateMarketSnapshot(entry.id, filters, same ? entry.listings : [], same ? entry.sourceFileName : "", buildMobileDeSearchUrl(filters));
      if (!snapshot) return;
      editingHistoryId = snapshot.id;
      editingBaseline = filterSignature(readManualFields());
      renderHistory();
      setAnalysisStatus(c.historyUpdateSuccess);
    } catch (error) {
      setAnalysisStatus(error.message || c.missingVehicle, true);
    }
  }

  function setElementValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.value = value || "";
  }

  function setHistoryCheckboxes(selector, values) {
    const selected = new Set(Array.isArray(values) ? values : []);
    document.querySelectorAll(selector).forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function restoreManualFilters(filters) {
    const legacyDoorRange = {
      TWO_OR_THREE: ["2", "3"],
      FOUR_OR_FIVE: ["4", "5"],
      SIX_OR_SEVEN: ["6", "7"],
    }[filters.doors];
    if (legacyDoorRange && !filters.doorsFrom && !filters.doorsTo) {
      filters = { ...filters, doorsFrom: legacyDoorRange[0], doorsTo: legacyDoorRange[1] };
    }
    // Power saved in kW mode is put back as the kW that were typed.
    if (filters.powerUnit === "kw") filters = { ...filters, powerFrom: filters.powerKwFrom, powerTo: filters.powerKwTo };
    const valueSelectors = {
      powerUnit: "[data-mobile-power-unit]",
      brand: "[data-mobile-brand]",
      model: "[data-mobile-model]",
      version: "[data-mobile-version]",
      body: "[data-mobile-body]",
      priceFrom: "[data-mobile-price-from]",
      priceTo: "[data-mobile-price-to]",
      mileageFrom: "[data-mobile-mileage-from]",
      mileageTo: "[data-mobile-mileage-to]",
      yearFrom: "[data-mobile-year-from]",
      yearTo: "[data-mobile-year-to]",
      displacementFrom: "[data-mobile-displacement-from]",
      displacementTo: "[data-mobile-displacement-to]",
      powerFrom: "[data-mobile-power-from]",
      powerTo: "[data-mobile-power-to]",
      seatsFrom: "[data-mobile-seats-from]",
      seatsTo: "[data-mobile-seats-to]",
      doorsFrom: "[data-mobile-doors-from]",
      doorsTo: "[data-mobile-doors-to]",
      vat: "[data-mobile-vat]",
      seller: "[data-mobile-seller]",
      damagedVehicles: "[data-mobile-damaged-vehicles]",
      slidingDoor: "[data-mobile-sliding-door]",
      newUsed: "[data-mobile-new-used]",
    };
    Object.entries(valueSelectors).forEach(([key, selector]) => setElementValue(selector, filters[key]));
    document.querySelectorAll("[data-mobile-drive]").forEach((input) => {
      input.checked = input.value === (filters.drive || "any");
    });
    document.querySelectorAll("[data-mobile-gearbox]").forEach((input) => {
      input.checked = input.value === (filters.gearbox || "any");
    });
    document.querySelectorAll("[data-mobile-air-conditioning]").forEach((input) => {
      input.checked = input.value === (filters.airConditioning || "");
    });
    document.querySelectorAll("[data-mobile-trailer-coupling]").forEach((input) => {
      input.checked = input.value === (filters.trailerCoupling || "any");
    });
    document.querySelectorAll("[data-mobile-cruise-control]").forEach((input) => {
      input.checked = input.value === (filters.cruiseControl || "any");
    });
    setHistoryCheckboxes("[data-mobile-country]", filters.countries?.length ? filters.countries : ["DE"]);
    setHistoryCheckboxes("[data-mobile-fuel]", manualFuelValues(filters));
    setHistoryCheckboxes("[data-mobile-interior-material]", filters.interiorMaterials);
    setHistoryCheckboxes("[data-mobile-feature]", filters.features);
    setHistoryCheckboxes("[data-mobile-parking-sensor]", filters.parkingSensors);
    setHistoryCheckboxes("[data-mobile-exterior-color]", filters.exteriorColors);
    setHistoryCheckboxes("[data-mobile-interior-color]", filters.interiorColors);
    const booleanSelectors = {
      matte: "[data-mobile-matte]",
      metallic: "[data-mobile-metallic]",
      nonSmoking: "[data-mobile-non-smoking]",
      roadworthy: "[data-mobile-roadworthy]",
      warranty: "[data-mobile-warranty]",
      serviceHistory: "[data-mobile-service-history]",
      accidentFree: "[data-mobile-accident-free]",
      firstOwner: "[data-mobile-first-owner]",
    };
    Object.entries(booleanSelectors).forEach(([key, selector]) => {
      const input = document.querySelector(selector);
      if (input) input.checked = key === "roadworthy" ? filters[key] !== false : Boolean(filters[key]);
    });
    if (typeof renderManualOptions === "function") renderManualOptions(true);
    // The choice on page 1 governs every page (B31). A saved search that
    // remembers its markets (saved with "Gotowe") becomes that choice when it
    // is opened, so page 1 and the analysis always show the same markets;
    // one without saved markets keeps the current choice.
    if (Array.isArray(filters.markets) && filters.markets.length) {
      // Saved before AutoScout24 existed (mobile.de without a word on it):
      // AutoScout24 keeps its current state instead of being switched off.
      const knowsAutoscout = filters.markets.includes("autoscout") || !filters.markets.includes("mobile");
      setChartSources(Object.fromEntries(MARKET_SOURCES.map((source) => [source, source === "autoscout" && !knowsAutoscout ? Boolean(chartSources.autoscout) : filters.markets.includes(source)])));
    }
  }

  function toggleCurrentHistoryFavorite() {
    refreshMarketHistory();
    const c = copy();
    // A favourite opened for editing: its star takes it off the favourites,
    // even while its filters are being changed.
    const edited = editingHistoryId ? marketHistory.find((item) => item.id === editingHistoryId) : null;
    if (edited?.pinned) {
      setHistoryPinned(edited.id, false);
      return;
    }
    try {
      const filters = readManualFields();
      if (!filters.brand || !filters.model) throw new Error(c.missingVehicle);
      const searchUrl = buildMobileDeSearchUrl(filters);
      const matchingImport = importedDataset?.filterKey === vehicleDataKey(filters) ? importedDataset : null;
      const existing = historyEntryForFilters(filters);
      const matchingFilters = existing?.signature === filterSignature(filters);
      const listings = matchingImport?.listings || (matchingFilters ? existing?.listings || [] : []);
      const sourceFileName = matchingImport?.fileName || (matchingFilters ? existing?.sourceFileName || "" : "");
      const pinned = !Boolean(existing?.pinned);
      const snapshot = existing
        ? updateMarketSnapshot(existing.id, filters, listings, sourceFileName, searchUrl, pinned)
        : createMarketSnapshot(filters, listings, sourceFileName, searchUrl, true);
      if (snapshot) setAnalysisStatus(pinned ? c.historyPinned : c.historyUnpin);
    } catch (error) {
      setAnalysisStatus(error.message || c.missingVehicle, true);
    }
  }

  // Called when the user opens a marketplace search: log it, or refresh the
  // timestamp of the same search so it moves back to the top of the list.
  function logSearchToHistory(searchUrl = "") {
    refreshMarketHistory();
    let filters;
    try {
      filters = readManualFields();
    } catch {
      return;
    }
    if (!filters.brand || !filters.model) return;
    const existing = historyEntryForFilters(filters);
    let resolvedSearchUrl = String(searchUrl || "");
    if (!resolvedSearchUrl) {
      try {
        resolvedSearchUrl = buildMobileDeSearchUrl(filters);
      } catch {
        return;
      }
    }
    if (existing) updateMarketSnapshot(existing.id, filters, existing.listings, existing.sourceFileName, resolvedSearchUrl);
    else createMarketSnapshot(filters, [], "", resolvedSearchUrl);
  }

  function setHistoryPinned(historyId, pinned) {
    refreshMarketHistory();
    const entry = marketHistory.find((item) => item.id === historyId);
    if (!entry) return;
    if (!storeMarketHistory(marketHistory.map((item) => (
      item.id === historyId ? { ...item, pinned } : item
    )))) return;
    if (!pinned && selectedFavoriteId === historyId) setSelectedFavorite("");
    renderHistory();
    setAnalysisStatus(pinned ? copy().historyPinned : copy().historyUnpin);
  }

  function deleteHistoryEntry(historyId) {
    refreshMarketHistory();
    const entry = marketHistory.find((item) => item.id === historyId);
    if (!entry) return;
    if (!storeMarketHistory(marketHistory.filter((item) => item.id !== historyId))) return;
    if (activeAnalysis?.historyId === historyId) activeAnalysis.historyId = "";
    if (editingHistoryId === historyId) editingHistoryId = "";
    renderHistory();
  }

  function selectHistoryEntry(historyId) {
    const entry = marketHistory.find((item) => item.id === historyId);
    if (!entry) return;
    restoreManualFilters(entry.filters);
    editingHistoryId = entry.id;
    // A favourite becomes the picked one; an ordinary search lets it go.
    setSelectedFavorite(entry.pinned ? entry.id : "");
    editingBaseline = filterSignature(readManualFields());
    analysisView.hidden = true;
    setManualViewHidden(false);
    setAnalysisStatus("");
    renderHistory();
  }

  function clearHistorySelection() {
    editingHistoryId = "";
    document.querySelector("[data-mobile-manual-reset]")?.click();
    renderHistory();
  }

  function openHistoryAnalysis(historyId) {
    const entry = marketHistory.find((item) => item.id === historyId);
    if (!entry) return;
    restoreManualFilters(entry.filters);
    const searchUrl = buildMobileDeSearchUrl(entry.filters);
    importedDataset = entry.listings.length >= 3 ? {
      listings: entry.listings,
      fileName: entry.sourceFileName,
      filterKey: vehicleDataKey(entry.filters),
    } : null;
    activeAnalysis = {
      filters: { ...entry.filters, markets: MARKET_SOURCES.filter((source) => chartSources[source]) },
      listings: entry.listings,
      searchUrl,
      providerId: entry.listings.length >= 3 ? "history" : "empty",
      sourceFileName: entry.sourceFileName,
      historyId: entry.id,
    };
    renderAnalysis();
    setManualViewHidden(true);
    analysisView.hidden = false;
    setAnalysisStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function csvDelimiter(text) {
    const firstLine = String(text).split(/\r?\n/).find((line) => line.trim()) || "";
    const candidates = [",", ";", "\t"];
    return candidates.sort((left, right) => firstLine.split(right).length - firstLine.split(left).length)[0];
  }

  function parseCsv(text) {
    const delimiter = csvDelimiter(text);
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"') {
        if (quoted && text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (character === delimiter && !quoted) {
        row.push(field.trim());
        field = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        row.push(field.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        field = "";
      } else field += character;
    }
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows[0].map((header) => header.trim().toLowerCase());
    return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  }

  async function parseListingFile(file) {
    if (file.size > 5 * 1024 * 1024) return [];
    const text = (await file.text()).replace(/^\uFEFF/, "").trim();
    if (!text) return [];
    let rows;
    if (file.name.toLowerCase().endsWith(".json") || /^[\[{]/.test(text)) {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : parsed.listings || parsed.results || parsed.items || [];
    } else rows = parseCsv(text);
    return normalizeListings(rows);
  }

  function selectedOptionText(selector) {
    const option = document.querySelector(`${selector} option:checked`);
    if (option?.value) return option.textContent.trim();
    const displaySelectors = {
      "[data-mobile-vat]": "[data-mobile-vat-label]",
      "[data-mobile-seller]": "[data-mobile-seller-label]",
      "[data-mobile-new-used]": "[data-mobile-new-used-label]",
      "[data-mobile-sliding-door]": "[data-mobile-sliding-door-label]",
      "[data-mobile-doors-group]": "[data-mobile-doors-label]",
    };
    const value = document.querySelector(selector)?.value;
    return value ? document.querySelector(displaySelectors[selector])?.value.trim() || "" : "";
  }

  function checkedLabel(selector) {
    const input = document.querySelector(`${selector}:checked`);
    return input?.closest("label")?.textContent.trim() || "";
  }

  function checkedLabels(selector) {
    return [...document.querySelectorAll(`${selector}:checked`)]
      .map((input) => input.closest("label")?.textContent.trim())
      .filter(Boolean);
  }

  // "Przebieg: do 130 000 km", "Rok: od 2018", "Rok: 2024" — not "—–130000".
  // Amounts with a unit get thousands spaces; years and seats stay as typed.
  function rangeSummary(label, from, to, unit = "") {
    if (!from && !to) return "";
    const t = window.AUTOGOOD_SPEC_COPY?.() || {};
    const numbers = numberFormat();
    const format = (value) => {
      const raw = String(value).trim();
      const amount = Number(raw.replace(/\s/g, "").replace(/\+$/, ""));
      return unit && Number.isFinite(amount) ? `${numbers.format(amount)}${raw.endsWith("+") ? "+" : ""}` : raw;
    };
    const suffix = unit ? ` ${unit}` : "";
    let range;
    if (from && to) range = String(from) === String(to) ? format(from) : `${format(from)}–${format(to)}`;
    else if (from) range = `${t.specFrom || "od"} ${format(from)}`;
    else range = `${t.specTo || "do"} ${format(to)}`;
    return `${label}: ${range}${suffix}`;
  }

  function filterSummary(filters) {
    const c = copy();
    const summary = [];
    summary.push([filters.brand, filters.model, filters.version].filter(Boolean).join(" "));
    const fuelLabels = checkedLabels("[data-mobile-fuel]");
    if (fuelLabels.length) summary.push(fuelLabels.join(", "));
    const body = filters.body ? checkedLabel("[data-mobile-body-choice]") : "";
    if (body) summary.push(body);
    summary.push(rangeSummary(c.price, filters.priceFrom, filters.priceTo, "EUR"));
    summary.push(rangeSummary(c.year, filters.yearFrom, filters.yearTo));
    summary.push(rangeSummary(c.mileage, filters.mileageFrom, filters.mileageTo, kmUnit()));
    summary.push(rangeSummary(c.displacement, filters.displacementFrom, filters.displacementTo, "ccm"));
    summary.push(rangeSummary(c.power, filters.powerFrom, filters.powerTo, "KM"));
    summary.push(rangeSummary(c.seats, filters.seatsFrom, filters.seatsTo));
    summary.push(rangeSummary(c.doors, filters.doorsFrom, filters.doorsTo));
    if (filters.drive && filters.drive !== "any") summary.push(checkedLabel("[data-mobile-drive]"));
    if (filters.gearbox && filters.gearbox !== "any") summary.push(checkedLabel("[data-mobile-gearbox]"));
    const vat = selectedOptionText("[data-mobile-vat]");
    if (vat) summary.push(vat);
    const seller = selectedOptionText("[data-mobile-seller]");
    if (seller) summary.push(seller);
    const countries = checkedLabels("[data-mobile-country]");
    if (countries.length) summary.push(`${c.countries}: ${countries.join(", ")}`);
    summary.push(...checkedLabels("[data-mobile-interior-material]"));
    if (filters.airConditioning) summary.push(checkedLabel("[data-mobile-air-conditioning]"));
    if (filters.trailerCoupling && filters.trailerCoupling !== "any") summary.push(checkedLabel("[data-mobile-trailer-coupling]"));
    summary.push(...checkedLabels("[data-mobile-feature]"));
    summary.push(...checkedLabels("[data-mobile-parking-sensor]"));
    if (filters.cruiseControl && filters.cruiseControl !== "any") summary.push(checkedLabel("[data-mobile-cruise-control]"));
    summary.push(...checkedLabels("[data-mobile-exterior-color]"));
    summary.push(...checkedLabels("[data-mobile-interior-color]"));
    if (filters.matte) summary.push(document.querySelector("[data-mobile-matte]")?.closest("label")?.textContent.trim());
    if (filters.metallic) summary.push(document.querySelector("[data-mobile-metallic]")?.closest("label")?.textContent.trim());
    if (filters.nonSmoking) summary.push(document.querySelector("[data-mobile-non-smoking]")?.closest("label")?.textContent.trim());
    if (filters.roadworthy) summary.push(document.querySelector("[data-mobile-roadworthy]")?.closest("label")?.textContent.trim());
    return summary.filter(Boolean);
  }

  // The same summary in three columns: the car and its seller, the technical
  // parameters, the equipment.
  function filterSummaryGroups(filters) {
    const c = copy();
    const labelOf = (selector) => document.querySelector(selector)?.closest("label")?.textContent.trim();
    const vehicle = [
      [filters.brand, filters.model, filters.version].filter(Boolean).join(" "),
    ];
    const countries = checkedLabels("[data-mobile-country]");
    if (countries.length) vehicle.push(`${c.countries}: ${countries.join(", ")}`);
    vehicle.push(selectedOptionText("[data-mobile-vat]"), selectedOptionText("[data-mobile-seller]"));
    if (filters.nonSmoking) vehicle.push(labelOf("[data-mobile-non-smoking]"));
    if (filters.roadworthy) vehicle.push(labelOf("[data-mobile-roadworthy]"));
    if (filters.newUsed) vehicle.push(selectedOptionText("[data-mobile-new-used]"));
    if (filters.warranty) vehicle.push(labelOf("[data-mobile-warranty]"));
    if (filters.serviceHistory) vehicle.push(labelOf("[data-mobile-service-history]"));
    if (filters.accidentFree) vehicle.push(labelOf("[data-mobile-accident-free]"));
    if (filters.firstOwner) vehicle.push(labelOf("[data-mobile-first-owner]"));
    if (filters.slidingDoor) vehicle.push(selectedOptionText("[data-mobile-sliding-door]"));

    const parameters = [];
    const fuelLabels = checkedLabels("[data-mobile-fuel]");
    if (fuelLabels.length) parameters.push(fuelLabels.join(", "));
    if (filters.body) parameters.push(checkedLabel("[data-mobile-body-choice]"));
    parameters.push(
      rangeSummary(c.price, filters.priceFrom, filters.priceTo, "EUR"),
      rangeSummary(c.year, filters.yearFrom, filters.yearTo),
      rangeSummary(c.mileage, filters.mileageFrom, filters.mileageTo, kmUnit()),
      rangeSummary(c.displacement, filters.displacementFrom, filters.displacementTo, "ccm"),
      rangeSummary(c.power, filters.powerFrom, filters.powerTo, "KM"),
      rangeSummary(c.seats, filters.seatsFrom, filters.seatsTo),
      rangeSummary(c.doors, filters.doorsFrom, filters.doorsTo),
    );
    if (filters.drive && filters.drive !== "any") parameters.push(checkedLabel("[data-mobile-drive]"));
    if (filters.gearbox && filters.gearbox !== "any") parameters.push(checkedLabel("[data-mobile-gearbox]"));

    const equipment = [...checkedLabels("[data-mobile-interior-material]")];
    if (filters.airConditioning) equipment.push(checkedLabel("[data-mobile-air-conditioning]"));
    if (filters.trailerCoupling && filters.trailerCoupling !== "any") equipment.push(checkedLabel("[data-mobile-trailer-coupling]"));
    equipment.push(...checkedLabels("[data-mobile-feature]"), ...checkedLabels("[data-mobile-parking-sensor]"));
    if (filters.cruiseControl && filters.cruiseControl !== "any") equipment.push(checkedLabel("[data-mobile-cruise-control]"));
    equipment.push(...checkedLabels("[data-mobile-exterior-color]"), ...checkedLabels("[data-mobile-interior-color]"));
    if (filters.matte) equipment.push(labelOf("[data-mobile-matte]"));
    if (filters.metallic) equipment.push(labelOf("[data-mobile-metallic]"));
    return [vehicle, parameters, equipment].map((items) => items.filter(Boolean));
  }

  function percentile(sortedValues, percentileValue) {
    if (!sortedValues.length) return 0;
    const index = (sortedValues.length - 1) * percentileValue;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const weight = index - lowerIndex;
    return sortedValues[lowerIndex] + ((sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight);
  }

  function marketStatistics(listings) {
    const prices = listings.map((listing) => listing.price).sort((left, right) => left - right);
    // Typical range: the middle half of the offers (P25–P75).
    const lowEnd = percentile(prices, 0.25);
    const highStart = percentile(prices, 0.75);
    return {
      count: prices.length,
      min: prices[0],
      median: percentile(prices, 0.5),
      max: prices[prices.length - 1],
      middleLow: lowEnd,
      middleHigh: highStart,
      middleCount: prices.filter((price) => price >= lowEnd && price <= highStart).length,
      lowCount: prices.filter((price) => price < lowEnd).length,
      highCount: prices.filter((price) => price > highStart).length,
      step: displayCurrency === "SEK" ? 10000 : displayCurrency === "PLN" ? 5000 : 1000,
    };
  }

  function activeCurrency() {
    return displayCurrency;
  }

  function numberFormat() {
    return new Intl.NumberFormat(currentLanguage() === "ru" ? "ru-RU" : "pl-PL");
  }

  function formatMarketPrice(value, currency = activeCurrency()) {
    return new Intl.NumberFormat(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  function verticalMarketPosition(value, minimum, maximum) {
    if (maximum <= minimum) return 50;
    return 5 + (((maximum - value) / (maximum - minimum)) * 90);
  }

  function marketScaleTicks(minimum, maximum, step) {
    const ticks = [];
    const first = Math.ceil(minimum / step) * step;
    for (let price = first; price < maximum; price += step) {
      if (price > minimum) ticks.push(price);
    }
    return ticks;
  }

  function marketTickLabelStep(minimum, maximum, step) {
    return step * Math.max(1, Math.ceil((maximum - minimum) / (8 * step)));
  }

  function marketClass(price, statistics) {
    if (price < statistics.middleLow) return "isLow";
    if (price > statistics.middleHigh) return "isHigh";
    return "isMiddle";
  }

  function statHtml(label, value, modifier = "") {
    return `<div class="mobileMarketStat${modifier ? ` ${modifier}` : ""}"><dt>${escapeMarketHtml(label)}</dt><dd>${escapeMarketHtml(value)}</dd></div>`;
  }

  function formatPlainPrice(value, currency) {
    return formatMarketPrice(value, currency);
  }

  // Latest typical price of an entry, in the marketplace's own currency.
  // Markets compared are named by country with its flag (logos are for
  // acting on a portal) — see src/market-badges.js.
  function marketBadge(source, variant = "flag") {
    const fallback = source === "otomoto" ? "Polska" : source === "blocket" ? "Szwecja" : source === "avby" ? "Białoruś" : source === "autoscout" ? "AutoScout24" : "Niemcy";
    return window.AUTOGOOD_MARKET_BADGE?.(source, variant) || escapeMarketHtml(fallback);
  }

  // HTML: flag + latest median per market.
  function latestPriceLabel(entry) {
    const log = entry.priceLog || [];
    return MARKET_SOURCES.filter((source) => chartSources[source])
      .map((source) => ({ source, data: [...log].reverse().find((point) => point[source])?.[source] }))
      .filter(({ data }) => data)
      .map(({ source, data }) => `${marketBadge(source, "flagOnly")} ${escapeMarketHtml(formatPlainPrice(data.median, data.currency))}`)
      .join(" · ");
  }

  // Favourites in the order they were starred (older ones without that
  // moment by when they were created); a new favourite comes last.
  function pinnedFavorites() {
    const order = (entry) => [entry.pinnedAt || "", entry.createdAt || ""];
    return marketHistory.filter((entry) => entry.pinned).sort((left, right) => {
      const [leftPinned, leftCreated] = order(left);
      const [rightPinned, rightCreated] = order(right);
      return leftPinned.localeCompare(rightPinned) || leftCreated.localeCompare(rightCreated);
    });
  }

  function favoritesHtml(activeId = "") {
    const c = copy();
    const favorites = pinnedFavorites();
    return `
      <section class="mobileMarketFavorites" data-report-hide aria-label="${escapeMarketHtml(c.favoritesHeading)}">
        <strong class="mobileMarketFavoritesTitle"><i aria-hidden="true">★</i>${escapeMarketHtml(c.favoritesHeading)}</strong>
        ${favorites.length ? `<div class="mobileMarketFavoritesList">
          ${favorites.map((entry) => {
            const title = [entry.filters.brand, entry.filters.model, entry.filters.version].filter(Boolean).join(" ");
            const meta = historyMeta(entry.filters).slice(0, 2).join(" · ");
            // No prices on favourites: the car and its filters only.
            return `<div class="mobileMarketFavoriteItem">
              <button class="mobileMarketFavorite${entry.id === activeId ? " isActive" : ""}" type="button" data-mobile-market-favorite="${escapeMarketHtml(entry.id)}"${entry.id === activeId ? ' aria-current="true"' : ""}>
                <b>${escapeMarketHtml(title)}</b>
                ${meta ? `<small>${escapeMarketHtml(meta)}</small>` : ""}
              </button>
              <button class="mobileMarketFavoriteRemove isStar" type="button" data-mobile-market-favorite-remove="${escapeMarketHtml(entry.id)}" aria-pressed="true" aria-label="${escapeMarketHtml(`${c.favoriteRemove}: ${title}`)}" title="${escapeMarketHtml(c.favoriteRemove)}">★</button>
            </div>`;
          }).join("")}
        </div>` : `<p>${escapeMarketHtml(c.favoritesEmpty)}</p>`}
      </section>`;
  }

  // Pinned above every page; the car shown on the current page is highlighted.
  let favoritesSelectedId = "";
  // The favourite picked in the pinned bar stays picked across all four
  // pages until another one is picked (or it is unpinned / the form is
  // cleared); each page shows this car. Remembered in this browser tab.
  const SELECTED_FAVORITE_KEY = "autogood.mobile.selectedFavorite.v1";
  let selectedFavoriteId = (() => {
    try {
      return sessionStorage.getItem(SELECTED_FAVORITE_KEY) || "";
    } catch {
      return "";
    }
  })();
  function setSelectedFavorite(id) {
    selectedFavoriteId = id || "";
    try {
      if (selectedFavoriteId) sessionStorage.setItem(SELECTED_FAVORITE_KEY, selectedFavoriteId);
      else sessionStorage.removeItem(SELECTED_FAVORITE_KEY);
    } catch {
      // Kept for this page only.
    }
  }
  function selectedFavorite() {
    return marketHistory.find((entry) => entry.id === selectedFavoriteId && entry.pinned) || null;
  }
  function scrollToPageContent(element) {
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ag-nav-height")) || 60) - 12;
    window.scrollTo({ top, behavior: "smooth" });
  }
  function renderFavoritesBar() {
    if (!favoritesBar) return;
    const active = selectedFavorite();
    favoritesBar.innerHTML = favoritesHtml(active?.id || "");
  }

  // Page 4: what is new for the favourite picked in the pinned bar (checked
  // on every compared portal by src/mobile-favorites-watch.js). Favourites
  // are not listed here: the bar above is the one place to pick them.
  function renderFavoritesSearchPage() {
    if (!favoritesPage) return;
    const pinned = pinnedFavorites();
    if (!pinned.some((entry) => entry.id === favoritesSelectedId)) favoritesSelectedId = "";
    const entry = pinned.find((item) => item.id === favoritesSelectedId) || null;
    if (window.AUTOGOOD_FAVORITES_WATCH) {
      window.AUTOGOOD_FAVORITES_WATCH.show(favoritesPage, entry);
      return;
    }
    const c = copy();
    favoritesPage.innerHTML = `<p class="mobileMarketHistoryEmpty">${escapeMarketHtml(pinned.length ? c.favoritesPick : c.favoritesSearchEmpty)}</p>`;
  }

  // The small square on a portal's logo in "Aktualne oferty": "−" takes a
  // compared portal out of the search and analysis (the logo turns grey),
  // "+" brings a grey one back. The last compared portal cannot be removed.
  function marketToggleHtml(source, on, attribute) {
    const c = copy();
    if (on && MARKET_SOURCES.filter((item) => chartSources[item]).length === 1) return "";
    const name = portalName(source);
    const label = `${name} — ${on ? c.marketPickOff : c.marketPickOn}`;
    return `<button class="agMarketToggle${on ? "" : " isAdd"}" type="button" ${attribute}="${source}" title="${escapeMarketHtml(label)}" aria-label="${escapeMarketHtml(label)}">${on ? "−" : "+"}</button>`;
  }

  // Page 1: every portal's count and logo stays; the compared ones in colour.
  function renderMarketPicker() {
    document.querySelectorAll(".mobileManualPanel .mobileSearchCountMarket[data-market]").forEach((item) => {
      const source = item.dataset.market;
      const on = Boolean(chartSources[source]);
      item.hidden = false;
      item.classList.toggle("isOff", !on);
      item.querySelector(".agMarketToggle")?.remove();
      item.insertAdjacentHTML("beforeend", marketToggleHtml(source, on, "data-mobile-market-pick"));
    });
  }

  function setChartSources(next) {
    const previous = chartSources;
    chartSources = Object.fromEntries(MARKET_SOURCES.map((source) => [source, Boolean(next[source])]));
    if (activeAnalysis) activeAnalysis.filters = {
      ...activeAnalysis.filters,
      markets: MARKET_SOURCES.filter((source) => chartSources[source]),
    };
    try {
      localStorage.setItem(MARKETS_STORAGE_KEY, JSON.stringify(chartSources));
    } catch {
      // Not remembered, still applied.
    }
    renderMarketPicker();
    window.AUTOGOOD_MARKETS_PICKED?.(previous, chartSources);
  }

  // Every measurement of this search, newest first: a table of its own for
  // each compared marketplace (chosen on page 1), one under the other, each
  // value compared with the previous measurement of that marketplace. Prices
  // falling are good for the buyer (green), more offers too. A change of
  // filters is marked and not compared across.
  function priceHistoryHtml(entry, sources = MARKET_SOURCES.filter((source) => chartSources[source])) {
    const c = copy();
    const log = entry?.priceLog || [];
    const numbers = numberFormat();
    const change = (current, previous, goodWhenUp = false) => {
      if (!Number.isFinite(current) || !Number.isFinite(previous) || !previous) return "";
      const pct = ((current - previous) / previous) * 100;
      if (Math.abs(pct) < 0.5) return `<em class="isFlat">=</em>`;
      const good = goodWhenUp ? pct > 0 : pct < 0;
      return `<em class="${good ? "isGood" : "isBad"}">${pct > 0 ? "▲" : "▼"} ${escapeMarketHtml(numbers.format(Math.round(Math.abs(pct) * 10) / 10))}%</em>`;
    };
    const price = (value, currency) => (Number.isFinite(value) ? escapeMarketHtml(formatPlainPrice(value, currency)) : "—");
    const previousOf = (index, source) => {
      for (let at = index - 1; at >= 0; at -= 1) {
        if (log[at].filtersChange) return null;
        if (log[at][source]) return log[at][source];
      }
      return null;
    };
    // Belarus compared (av.by with mobile.de / AutoScout24): German rows show
    // turnkey with customs in Minsk (USD) instead of the Polish "na gotowo".
    const byHistory = chartSources.avby && (chartSources.mobile || chartSources.autoscout);
    const turnkeyOf = (item) => (byHistory ? item?.turnkeyBy : item?.turnkey);
    const turnkeyMoney = byHistory ? "USD" : "PLN";
    const turnkeyName = byHistory ? `${c.byTurnkey}*` : c.turnkeyShort;
    const marketTable = (source) => {
      const rows = [];
      log.forEach((point, index) => {
        if (point.filtersChange) {
          // Only between measurements of this market.
          const before = log.slice(0, index).some((item) => item[source]);
          const after = log.slice(index + 1).some((item) => item[source]);
          if (!before || !after) return;
          const filters = point.filters ? historyMeta(point.filters).join(" · ") : "";
          rows.push(`<tr class="mobileMarketHistoryFilters"><td colspan="7">${escapeMarketHtml(formatHistoryDate(point.at))} · ${escapeMarketHtml(point.pricesChange ? c.priceHistoryPricesChanged : c.priceHistoryFiltersChanged.replace("{filters}", filters || "—"))}</td></tr>`);
          return;
        }
        const current = point[source];
        if (!current) return;
        const previous = previousOf(index, source);
        const cell = (key) => {
          const url = current[`${key}Url`];
          const value = url
            ? `<a class="agPriceLink" href="${escapeMarketHtml(url)}" target="_blank" rel="noopener">${price(current[key], current.currency)}<img class="agBrandMark" src="${BRAND_MARKS[source]}" alt="" /></a>`
            : price(current[key], current.currency);
          // Foreign markets: what it comes to "na gotowo" under the ad price.
          const turnkeyNow = turnkeyOf(current);
          const turnkeyBefore = turnkeyOf(previous);
          const turnkeyNote = turnkeyNow && Number.isFinite(turnkeyNow[key])
            ? `<small class="mobileMarketTurnkeyNote">~ ${price(turnkeyNow[key], turnkeyMoney)} ${escapeMarketHtml(turnkeyName)} ${turnkeyBefore ? change(turnkeyNow[key], turnkeyBefore[key]) : ""}</small>`
            : "";
          return `<td>${value} ${previous ? change(current[key], previous[key]) : ""}${turnkeyNote}</td>`;
        };
        rows.push(`
          <tr>
            <th scope="row"><button class="mobileMarketDateLink" type="button" data-offer-date="${escapeMarketHtml(point.at)}">${escapeMarketHtml(formatHistoryDate(point.at))}</button></th>
            <td>${current.count} ${previous ? change(current.count, previous.count, true) : ""}</td>
            ${cell("min")}${cell("max")}${cell("median")}
            <td>${Number.isFinite(current.p25) ? `${price(current.p25, current.currency)} – ${price(current.p75, current.currency)}` : "—"} ${previous ? change((current.p25 + current.p75) / 2, (previous.p25 + previous.p75) / 2) : ""}${turnkeyOf(current) ? `<small class="mobileMarketTurnkeyNote">~ ${price(turnkeyOf(current).p25, turnkeyMoney)} – ${price(turnkeyOf(current).p75, turnkeyMoney)} ${escapeMarketHtml(turnkeyName)}</small>` : ""}</td>
            <td>${Number.isFinite(current.middleCount) ? current.middleCount : "—"} ${previous && Number.isFinite(previous.middleCount) ? change(current.middleCount, previous.middleCount, true) : ""}</td>
          </tr>`);
      });
      const portal = portalName(source);
      return `
        <section class="mobileMarketCard mobileMarketPriceHistory is${sourceClass(source)}" aria-label="${escapeMarketHtml(`${c.priceHistoryHeading}: ${portal}`)}">
          <h2 class="agBlockTitle mobileMarketPriceHistoryMarket">${escapeMarketHtml(c.priceHistoryHeading)} · ${marketBadge(source)} <small>${escapeMarketHtml(portal)} · ${escapeMarketHtml(SOURCE_CURRENCY[source])}</small></h2>
          ${rows.length ? `
          <div class="mobileMarketTableScroll">
            <table class="mobileMarketTable mobileMarketHistoryTable">
              <thead><tr>
                <th scope="col">${escapeMarketHtml(c.priceHistoryDate)}</th>
                <th scope="col">${escapeMarketHtml(c.priceHistoryOffers)}</th>
                <th scope="col">${escapeMarketHtml(c.minimum)}</th>
                <th scope="col">${escapeMarketHtml(c.maximum)}</th>
                <th scope="col">${escapeMarketHtml(c.median)}</th>
                <th scope="col">${escapeMarketHtml(c.averagePrices)}</th>
                <th scope="col">${escapeMarketHtml(c.middleOffers)}</th>
              </tr></thead>
              <tbody>${rows.reverse().join("")}</tbody>
            </table>
          </div>` : `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.priceHistoryMarketEmpty)}</p>`}
        </section>`;
    };
    return MARKET_SOURCES.filter((source) => sources.includes(source)).map(marketTable).join("");
  }

  // ---- Page 3: price history of a favourite car ----------------------------
  // Every "Analiza rynku" / "Odśwież dane" of a search adds a dated check;
  // this page shows them for one favourite at a time: the medians over time
  // (a line per market, foreign ones "na gotowo") and the full table.
  const priceHistoryPage = document.querySelector("[data-mobile-price-history-page]");
  // var: renderHistory() may redraw this page before this line has run.
  var priceHistoryId = "";

  function medianTrendHtml(entry) {
    const c = copy();
    const selected = MARKET_SOURCES.filter((source) => chartSources[source]);
    const log = (entry.priceLog || []).filter((point) => selected.some((source) => point[source]));
    if (log.length < 2) return `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.trendNeedsTwo)}</p>`;
    const byTrend = chartSources.avby && (chartSources.mobile || chartSources.autoscout);
    const trendMoney = byTrend ? "USD" : "PLN";
    const valueOf = (point, source) => {
      const item = point[source];
      if (!item) return null;
      if (byTrend) {
        // German markets: turnkey with customs in Minsk; the others at their price in USD.
        if (source === "mobile" || source === "autoscout") return item.turnkeyBy?.median ?? null;
        return plnIn(priceInPln(item.median, item.currency || SOURCE_CURRENCY[source]), "USD");
      }
      if (item.turnkey?.median) return item.turnkey.median;
      // Checks saved before "na gotowo" was recorded: estimated from their median.
      if (TURNKEY_SOURCES.includes(source) && window.AUTOGOOD_TURNKEY) {
        return window.AUTOGOOD_TURNKEY.turnkeyAverage({ price: item.median, currency: item.currency || SOURCE_CURRENCY[source] }, entry.filters).total;
      }
      return priceInPln(item.median, item.currency || SOURCE_CURRENCY[source]);
    };
    const series = selected.map((source) => ({
      source,
      points: log.map((point, index) => ({ index, value: valueOf(point, source) })).filter((item) => Number.isFinite(item.value)),
    })).filter((line) => line.points.length);
    const values = series.flatMap((line) => line.points.map((item) => item.value));
    const low = Math.min(...values) * 0.97;
    const high = Math.max(...values) * 1.03;
    const width = 900;
    const height = 240;
    const left = 70;
    const right = 20;
    const top = 16;
    const bottom = 34;
    const x = (index) => left + (index / Math.max(1, log.length - 1)) * (width - left - right);
    const y = (value) => top + ((high - value) / Math.max(1, high - low)) * (height - top - bottom);
    const colors = { otomoto: "#1d5fd0", mobile: "#f56a00", autoscout: "#a68a00", blocket: "#d0101a", avby: "#13804a" };
    const ticks = [low, (low + high) / 2, high];
    const labelEvery = Math.max(1, Math.ceil(log.length / 6));
    return `
      <svg class="mobileMarketTrendChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeMarketHtml(c.trendTitle)}">
        ${ticks.map((value) => `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" class="isGrid" /><text x="${left - 8}" y="${y(value) + 4}" text-anchor="end">${escapeMarketHtml(formatMarketPrice(value, trendMoney))}</text>`).join("")}
        ${log.map((point, index) => (index % labelEvery === 0 || index === log.length - 1)
          ? `<text x="${x(index)}" y="${height - 10}" text-anchor="middle">${escapeMarketHtml(formatHistoryDate(point.at).split(",")[0])}</text>` : "").join("")}
        ${series.map((line) => `
          <polyline fill="none" stroke="${colors[line.source]}" stroke-width="2.5" points="${line.points.map((item) => `${x(item.index)},${y(item.value)}`).join(" ")}" />
          ${line.points.map((item) => `<circle cx="${x(item.index)}" cy="${y(item.value)}" r="4" fill="${colors[line.source]}"><title>${escapeMarketHtml(`${formatHistoryDate(log[item.index].at)} · ${formatMarketPrice(item.value, trendMoney)}`)}</title></circle>`).join("")}`).join("")}
      </svg>
      <div class="mobileMarketLegend">
        ${series.map((line) => `<span class="is${sourceClass(line.source)}"><i></i>${marketBadge(line.source)}${byTrend ? (line.source === "mobile" || line.source === "autoscout" ? ` · ${escapeMarketHtml(c.byTurnkey)}*` : "") : TURNKEY_SOURCES.includes(line.source) ? ` · ${escapeMarketHtml(c.turnkeyShort)}` : ""}</span>`).join("")}
      </div>`;
  }

  // ---- Page 3: the market of one date, compared with another --------------
  // One chart per compared market: the offers of the picked date in colour,
  // those of the compared date as grey rings, each at its place in the list
  // from cheapest to dearest; a repriced offer is joined to where it was.
  // Below: the offers of that date with what changed since the other one.
  const offerHistoryState = { id: "", at: "", compareAt: null, filter: "all" };
  const OFFER_COLORS = { otomoto: "#1d5fd0", mobile: "#f56a00", autoscout: "#a68a00", blocket: "#d0101a", avby: "#13804a" };
  const OFFER_GROUP_ORDER = ["new", "cheaper", "dearer", "gone", "same"];

  function offerPositions(market) {
    const kept = (market?.offers || []).filter((offer) => !offer.suspect);
    const byPrice = [...kept].sort((left, right) => left.price - right.price);
    const total = Math.max(market?.total || 0, byPrice.length);
    return byPrice.map((offer, index) => ({
      offer,
      x: offer.rank && total > 1 ? (offer.rank - 1) / (total - 1) : byPrice.length > 1 ? index / (byPrice.length - 1) : 0.5,
    }));
  }

  function offerChartHtml(source, current, compared) {
    const c = copy();
    const now = offerPositions(current);
    const then = offerPositions(compared);
    const all = [...now, ...then].map((item) => item.offer.price);
    if (!all.length) return `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerNoMarket)}</p>`;
    const currency = current?.offers[0]?.currency || compared?.offers[0]?.currency || SOURCE_CURRENCY[source];
    const low = Math.min(...all) * 0.96;
    const high = Math.max(...all) * 1.04;
    const width = 900;
    const height = 300;
    const left = 84;
    const right = 16;
    const top = 14;
    const bottom = 30;
    const x = (value) => left + value * (width - left - right);
    const y = (value) => top + ((high - value) / Math.max(1, high - low)) * (height - top - bottom);
    const color = OFFER_COLORS[source];
    const median = (items) => (items.length ? percentile(items.map((item) => item.offer.price).sort((a, b) => a - b), 0.5) : null);
    const nowMedian = median(now);
    const thenMedian = median(then);
    const thenByKey = new Map(then.map((item) => [item.offer.key, item]));
    const tip = (offer, date) => escapeMarketHtml(`${date} · ${formatPlainPrice(offer.price, offer.currency)}${offer.turnkey ? ` (~ ${formatPlainPrice(offer.turnkey, "PLN")} ${c.turnkeyShort})` : ""} · ${[offer.year, offer.mileage ? `${numberFormat().format(offer.mileage)} ${kmUnit()}` : ""].filter(Boolean).join(" · ")} · ${offer.title}`);
    const dot = (item, date, compare) => {
      const circle = compare
        ? `<circle cx="${x(item.x)}" cy="${y(item.offer.price)}" r="3.6" class="isCompare"><title>${tip(item.offer, date)}</title></circle>`
        : `<circle cx="${x(item.x)}" cy="${y(item.offer.price)}" r="4" fill="${color}"><title>${tip(item.offer, date)}</title></circle>`;
      // A 24 px target around the small dot, and a name for screen readers.
      const target = `<circle cx="${x(item.x)}" cy="${y(item.offer.price)}" r="12" fill="transparent" />`;
      return item.offer.url ? `<a href="${escapeMarketHtml(item.offer.url)}" target="_blank" rel="noopener" aria-label="${escapeMarketHtml(copy().monitoringOfferLink.replace("{title}", `${item.offer.title || ""} ${formatPlainPrice(item.offer.price, item.offer.currency)}`.trim()))}">${target}${circle}</a>` : circle;
    };
    const moves = now.map((item) => {
      const before = thenByKey.get(item.offer.key);
      if (!before || before.offer.price === item.offer.price) return "";
      return `<line x1="${x(before.x)}" y1="${y(before.offer.price)}" x2="${x(item.x)}" y2="${y(item.offer.price)}" class="${item.offer.price < before.offer.price ? "isGood" : "isBad"}" />`;
    }).join("");
    const ticks = [low, (low + high) / 2, high];
    const atDate = formatHistoryDate(offerHistoryState.at);
    const compareDate = offerHistoryState.compareAt ? formatHistoryDate(offerHistoryState.compareAt) : "";
    return `
      <svg class="mobileMarketOfferChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeMarketHtml(`${c.offerHistoryHeading}: ${source}`)}">
        ${ticks.map((value) => `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" class="isGrid" /><text x="${left - 8}" y="${y(value) + 4}" text-anchor="end">${escapeMarketHtml(formatPlainPrice(value, currency))}</text>`).join("")}
        <text x="${left}" y="${height - 8}">0%</text>
        <text x="${(left + width - right) / 2}" y="${height - 8}" text-anchor="middle">${escapeMarketHtml(c.offerAxis)}</text>
        <text x="${width - right}" y="${height - 8}" text-anchor="end">100%</text>
        ${Number.isFinite(thenMedian) ? `<line x1="${left}" x2="${width - right}" y1="${y(thenMedian)}" y2="${y(thenMedian)}" class="isMedian isCompare"><title>${escapeMarketHtml(`${compareDate} · ${c.median}: ${formatPlainPrice(thenMedian, currency)}`)}</title></line>` : ""}
        ${then.map((item) => dot(item, compareDate, true)).join("")}
        ${moves}
        ${Number.isFinite(nowMedian) ? `<line x1="${left}" x2="${width - right}" y1="${y(nowMedian)}" y2="${y(nowMedian)}" class="isMedian" stroke="${color}"><title>${escapeMarketHtml(`${atDate} · ${c.median}: ${formatPlainPrice(nowMedian, currency)}`)}</title></line>` : ""}
        ${now.map((item) => dot(item, atDate, false)).join("")}
      </svg>`;
  }

  // What happened to each offer between the compared date and the picked one.
  function offerChanges(source, current, compared) {
    const certain = Boolean(current?.complete && compared?.complete);
    const before = new Map((compared?.offers || []).map((offer) => [offer.key, offer]));
    const seen = new Set();
    const rows = (current?.offers || []).map((offer) => {
      seen.add(offer.key);
      const previous = before.get(offer.key);
      if (!compared) return { source, offer, group: "same", status: "" };
      if (!previous) return { source, offer, group: "new", status: certain ? "new" : "firstSeen" };
      const group = offer.price < previous.price ? "cheaper" : offer.price > previous.price ? "dearer" : "same";
      return { source, offer, previous, group, status: group };
    });
    (compared?.offers || []).forEach((offer) => {
      if (!seen.has(offer.key)) rows.push({ source, offer, gone: true, group: "gone", status: certain ? "gone" : "outside" });
    });
    return rows;
  }

  function offerHistoryBodyHtml(entry, byDate) {
    const c = copy();
    const numbers = numberFormat();
    const checks = (entry.priceLog || []).filter((point) => !point.filtersChange && MARKET_SOURCES.some((source) => point[source]));
    const withOffers = checks.filter((point) => byDate.has(point.at));
    if (!withOffers.length) return `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerHistoryNone)}</p>`;
    if (offerHistoryState.id !== entry.id) Object.assign(offerHistoryState, { id: entry.id, at: "", compareAt: null, filter: "all" });
    if (!byDate.has(offerHistoryState.at)) offerHistoryState.at = withOffers[withOffers.length - 1].at;
    const at = offerHistoryState.at;
    if (offerHistoryState.compareAt === null || (offerHistoryState.compareAt && (!byDate.has(offerHistoryState.compareAt) || offerHistoryState.compareAt === at))) {
      // By default: the check just before the picked one.
      offerHistoryState.compareAt = [...withOffers].reverse().find((point) => point.at < at)?.at || "";
    }
    const compareAt = offerHistoryState.compareAt;
    const record = byDate.get(at);
    const compareRecord = compareAt ? byDate.get(compareAt) : null;
    const [from, to] = [compareAt, at].sort();
    const filtersBetween = compareAt && (entry.priceLog || []).some((point) => point.filtersChange && point.at > from && point.at < to);
    const sources = MARKET_SOURCES.filter((source) => chartSources[source]);
    const chips = checks.map((point) => {
      const has = byDate.has(point.at);
      const state = point.at === at ? " isPrimary" : point.at === compareAt ? " isCompare" : "";
      return `<button class="mobileMarketImportClear mobileMarketDateChip${state}" type="button" data-offer-date="${escapeMarketHtml(point.at)}"${has ? "" : ` disabled title="${escapeMarketHtml(c.offerHistoryNoOffers)}"`} aria-pressed="${point.at === at ? "true" : "false"}">${escapeMarketHtml(formatHistoryDate(point.at))}</button>`;
    }).join("");
    const pct = (value) => `${value > 0 ? "+" : ""}${numbers.format(Math.round(value * 10) / 10)}%`;
    const allRows = [];
    const markets = sources.map((source) => {
      const current = record.markets[source];
      const compared = compareRecord?.markets[source];
      const rows = offerChanges(source, current, compareRecord ? (compared || { offers: [], complete: false }) : null);
      allRows.push(...rows);
      const count = (group) => rows.filter((row) => row.group === group).length;
      const cheaper = rows.filter((row) => row.group === "cheaper");
      const avgDrop = cheaper.length ? cheaper.reduce((sum, row) => sum + ((row.offer.price - row.previous.price) / row.previous.price) * 100, 0) / cheaper.length : 0;
      const listNote = current ? (current.complete ? c.offerListComplete : c.offerListSample)
        .replace("{count}", numbers.format(current.offers.length)).replace("{total}", numbers.format(current.total)) : "";
      const summary = compareRecord ? [
        `${c.offerNew}: ${count("new")}`,
        `${c.offerGoneGroup}: ${count("gone")}`,
        `${c.offerCheaper}: ${cheaper.length}${cheaper.length ? ` (${c.offerCheaperAvg.replace("{pct}", pct(avgDrop))})` : ""}`,
        `${c.offerDearer}: ${count("dearer")}`,
      ].join(" · ") : "";
      return `
        <div class="mobileMarketOfferMarket">
          <h3>${marketBadge(source)} <small>${escapeMarketHtml(listNote)}</small></h3>
          ${summary ? `<p class="mobileMarketOfferSummary">${escapeMarketHtml(summary)}</p>` : ""}
          ${offerChartHtml(source, current, compareRecord ? compared : null)}
        </div>`;
    }).join("");
    const groups = compareRecord ? OFFER_GROUP_ORDER.filter((group) => allRows.some((row) => row.group === group)) : [];
    if (offerHistoryState.filter !== "all" && !groups.includes(offerHistoryState.filter)) offerHistoryState.filter = "all";
    const groupLabel = { new: c.offerNew, cheaper: c.offerCheaper, dearer: c.offerDearer, gone: c.offerGoneGroup, same: c.offerSame };
    const statusLabel = { new: c.offerNew, firstSeen: c.offerFirstSeen, gone: c.offerGone, outside: c.offerOutside, cheaper: c.offerCheaper, dearer: c.offerDearer, same: c.offerSame };
    const shown = allRows
      .filter((row) => offerHistoryState.filter === "all" || row.group === offerHistoryState.filter)
      .sort((left, right) => OFFER_GROUP_ORDER.indexOf(left.group) - OFFER_GROUP_ORDER.indexOf(right.group) || left.offer.price - right.offer.price);
    const price = (offer) => `${escapeMarketHtml(formatPlainPrice(offer.price, offer.currency))}${offer.turnkey ? `<small class="mobileMarketTurnkeyNote">~ ${escapeMarketHtml(formatPlainPrice(offer.turnkey, "PLN"))} ${escapeMarketHtml(c.turnkeyShort)}</small>` : ""}`;
    const table = `
      <div class="mobileMarketTableScroll mobileMarketOfferChanges">
        <table class="mobileMarketTable">
          <thead><tr>
            ${compareRecord ? `<th scope="col">${escapeMarketHtml(c.offerStatus)}</th>` : ""}
            <th scope="col">${escapeMarketHtml(c.priceHistorySource)}</th>
            <th scope="col">${escapeMarketHtml(c.offerAd)}</th>
            <th scope="col">${escapeMarketHtml(c.offerYear)}</th>
            <th scope="col">${escapeMarketHtml(c.offerMileage)}</th>
            <th scope="col">${escapeMarketHtml(c.offerPrice)}</th>
            ${compareRecord ? `<th scope="col">${escapeMarketHtml(c.offerBefore)}</th><th scope="col">${escapeMarketHtml(c.offerChange)}</th>` : ""}
          </tr></thead>
          <tbody>${shown.map((row) => {
            const change = row.previous && row.previous.price !== row.offer.price ? ((row.offer.price - row.previous.price) / row.previous.price) * 100 : null;
            return `<tr class="${row.gone ? "isGone" : ""}">
              ${compareRecord ? `<td><span class="mobileMarketOfferStatus is${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}">${escapeMarketHtml(statusLabel[row.status] || "")}</span></td>` : ""}
              <td>${marketBadge(row.source)}</td>
              <td class="mobileMarketOfferTitle">${row.offer.url ? `<a href="${escapeMarketHtml(row.offer.url)}" target="_blank" rel="noopener">${escapeMarketHtml(row.offer.title || "—")}</a>` : escapeMarketHtml(row.offer.title || "—")}</td>
              <td>${escapeMarketHtml(row.offer.year || "—")}</td>
              <td>${row.offer.mileage ? `${escapeMarketHtml(numbers.format(row.offer.mileage))} ${kmUnit()}` : "—"}</td>
              <td>${row.gone ? "—" : price(row.offer)}</td>
              ${compareRecord ? `<td>${row.gone ? price(row.offer) : row.previous ? price(row.previous) : "—"}</td>
              <td>${change === null ? "" : `<em class="${change < 0 ? "isGood" : "isBad"}">${change > 0 ? "▲" : "▼"} ${escapeMarketHtml(pct(change))}</em>`}</td>` : ""}
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
    return `
      <p class="mobileMarketOfferIntro">${escapeMarketHtml(c.offerHistoryIntro)}</p>
      <div class="mobileMarketDateChips" role="group" aria-label="${escapeMarketHtml(c.priceHistoryDate)}">${chips}</div>
      <label class="mobileMarketOfferCompare">${escapeMarketHtml(c.offerCompareWith)}:
        <select data-offer-compare>
          <option value="">${escapeMarketHtml(c.offerCompareNone)}</option>
          ${withOffers.filter((point) => point.at !== at).reverse().map((point) => `<option value="${escapeMarketHtml(point.at)}"${point.at === compareAt ? " selected" : ""}>${escapeMarketHtml(formatHistoryDate(point.at))}</option>`).join("")}
        </select>
      </label>
      <div class="mobileMarketOfferLegend">
        <span><i class="isCurrent"></i>${escapeMarketHtml(`${c.offerLegendCurrent}: ${formatHistoryDate(at)}`)}</span>
        ${compareAt ? `<span><i class="isCompare"></i>${escapeMarketHtml(`${c.offerLegendCompare}: ${formatHistoryDate(compareAt)}`)}</span>` : ""}
      </div>
      ${filtersBetween ? `<p class="mobileMarketOfferWarning">${escapeMarketHtml(c.offerFiltersBetween)}</p>` : ""}
      ${markets}
      <h3 class="mobileMarketOfferChangesTitle">${escapeMarketHtml(c.offerChangesHeading)}</h3>
      ${groups.length ? `<div class="mobileMarketOfferFilters" role="group">
        ${["all", ...groups].map((group) => `<button class="mobileMarketImportClear${offerHistoryState.filter === group ? " isPrimary" : ""}" type="button" data-offer-filter="${group}">${escapeMarketHtml(group === "all" ? c.offerAll : groupLabel[group])} · ${group === "all" ? allRows.length : allRows.filter((row) => row.group === group).length}</button>`).join("")}
      </div>` : ""}
      ${table}`;
  }

  async function fillOfferHistory(entry) {
    const byDate = await loadCheckOffers(entry.id);
    const card = document.querySelector(`[data-offer-history="${CSS.escape(entry.id)}"]`);
    if (!card) return;
    card.innerHTML = `${blockTitle("gauge", copy().offerHistoryHeading)}${offerHistoryBodyHtml(entry, byDate)}`;
  }

  function redrawOfferHistory(scroll = false) {
    const entry = marketHistory.find((item) => item.id === priceHistoryId);
    if (!entry) return;
    fillOfferHistory(entry).then(() => {
      if (scroll) scrollToPageContent(document.querySelector("[data-offer-history]"));
    });
  }

  // ---- Page 3 "Monitoring" -------------------------------------------------
  // The favourite picked in the bar: its search (as on page 1), the portals
  // with the car's own price on each, a currency converter, one "Sprawdź
  // teraz" that reads the portals and compares with the previous check (new
  // and gone offers per portal), and the day-by-day history below, folded.
  const monitoringState = { id: "", view: "new", portal: "", busy: "", status: "", statusError: false };
  // How the manager likes the list (sort, filters) and whether the settings
  // are open: conveniences of this browser, not user data.
  const MONITORING_PREFS_KEY = "autogood.mobile.monitoringListPrefs";
  const monitoringPrefs = { sort: "price", dir: "asc", onlyVat: false, onlyDealers: false, settingsOpen: false };
  try {
    Object.assign(monitoringPrefs, JSON.parse(localStorage.getItem(MONITORING_PREFS_KEY) || "{}"));
  } catch {
    // Defaults.
  }
  const saveMonitoringPrefs = () => {
    try {
      localStorage.setItem(MONITORING_PREFS_KEY, JSON.stringify(monitoringPrefs));
    } catch {
      // Kept for this page only.
    }
  };
  // What each portal has read while a monitoring runs.
  const monitoringProgress = {};
  let monitoringExtended = false;
  try {
    monitoringExtended = localStorage.getItem("autogood.mobile.monitoringExtended") === "1";
  } catch {
    // Folded by default.
  }

  const monitoringTitle = (item) => [item.filters.brand, item.filters.model, item.filters.version].filter(Boolean).join(" ");

  // The picked favourite's filters in the page-1 form, so its summary there
  // (and the copy shown here) describes this car.
  function loadFavoriteIntoForm(entry) {
    if (!entry || editingHistoryId === entry.id) return;
    restoreManualFilters(entry.filters);
    editingHistoryId = entry.id;
    editingBaseline = filterSignature(readManualFields());
  }

  function monitoringParamsHtml() {
    const summary = document.querySelector("[data-mobile-selected-filters]");
    return summary ? summary.innerHTML : "";
  }

  // Page 3: portal name with the flags of the countries it is searched in.
  function monitoringPortalBadge(source, countries = []) {
    if (source !== "mobile" && source !== "autoscout") return marketBadge(source);
    const flags = countries.map((code) => window.AUTOGOOD_FLAG?.(code) || code).join("");
    return `<span class="agMarketBadge">${flags}<span>${source === "autoscout" ? "AutoScout24" : "mobile.de"}</span></span>`;
  }
  function offerCountryBadge(source, country) {
    if (source !== "mobile" && source !== "autoscout") return marketBadge(source);
    const name = window.AUTOGOOD_COUNTRY_NAME?.(country) || country;
    return `<span class="agMarketBadge" title="${escapeMarketHtml(name)}">${window.AUTOGOOD_FLAG?.(country) || ""}<span>${source === "autoscout" ? "AutoScout24" : "mobile.de"}${country ? ` · ${escapeMarketHtml(country)}` : ""}</span></span>`;
  }

  function monitoringPortalsHtml(entry) {
    const c = copy();
    const watch = window.AUTOGOOD_FAVORITES_WATCH;
    const numbers = numberFormat();
    const symbol = { PLN: "zł", EUR: "€", SEK: "kr", USD: "$" };
    const scope = monitoringScopeOf(entry.id);
    // mobile.de and AutoScout24: searched in the same countries.
    const countriesRow = () => {
      const on = Boolean(chartSources.mobile || chartSources.autoscout);
      return `
        <div class="mobileMonitoringCountries${on ? "" : " isOff"}" role="group" aria-label="${escapeMarketHtml(c.monitoringCountries)}">
          <b>${escapeMarketHtml(c.monitoringCountries)}:</b>
          ${MONITORING_COUNTRY_CHOICES.map((code) => `<button class="mobileMonitoringCountry${scope.countries.includes(code) ? " isOn" : ""}" type="button" data-monitoring-country="${code}" aria-pressed="${scope.countries.includes(code) ? "true" : "false"}"${on ? "" : " disabled"} title="${escapeMarketHtml(window.AUTOGOOD_COUNTRY_NAME?.(code) || code)}">${window.AUTOGOOD_FLAG?.(code) || ""}${code}</button>`).join("")}
          <small>${escapeMarketHtml(c.monitoringCountriesHint)}</small>
        </div>`;
    };
    return MARKET_SOURCES.map((source) => {
      const on = Boolean(chartSources[source]);
      const own = watch?.portalPrice?.(entry.id, source) || null;
      // AutoScout24 without a price of its own: mobile.de's.
      const fallback = (source === "autoscout" ? watch?.portalPrice?.(entry.id, "mobile") : null) || watch?.filtersPriceIn?.(source, entry.filters) || {};
      const currency = SOURCE_CURRENCY[source] || "EUR";
      const field = (side) => {
        const value = own?.[side];
        const hint = fallback[side];
        return `<label><span>${escapeMarketHtml(side === "from" ? c.monitoringFrom : c.monitoringTo)}</span><input type="text" inputmode="numeric" data-monitoring-price="${source}" data-side="${side}" value="${value === null || value === undefined ? "" : escapeMarketHtml(numbers.format(value))}" placeholder="${Number.isFinite(hint) ? escapeMarketHtml(numbers.format(Math.round(hint))) : "—"}"${on ? "" : " disabled"} /><b>${escapeMarketHtml(symbol[currency] || currency)}</b></label>`;
      };
      const label = portalName(source);
      return `
        <div class="mobileMonitoringPortal${on ? " isOn" : ""}">
          <button class="agSourceToggle${on ? " isOn" : ""}" type="button" data-monitoring-market="${source}" aria-pressed="${on ? "true" : "false"}" title="${escapeMarketHtml(label)}" aria-label="${escapeMarketHtml(label)}"><img src="${BRAND_LOGOS[source]}" alt="" /></button>
          <span class="mobileMonitoringPortalName">${source === "mobile" || source === "autoscout" ? monitoringPortalBadge(source, scope.countries) : marketBadge(source)}${source === "autoscout" ? `<small>${escapeMarketHtml(c.monitoringAutoscout)}</small>` : ""}</span>
          <div class="mobileMonitoringPrice">${field("from")}${field("to")}</div>
        </div>${source === "autoscout" ? countriesRow() : ""}`;
    }).join("");
  }

  // Where mobile.de and AutoScout24 are searched for one favourite (page 3).
  // Default (owner, 2026-10-03): Germany, the Netherlands, Belgium, Austria,
  // Luxembourg, AutoScout24 on. Same storage rules as the history (4.6.1).
  const MONITORING_SCOPE_KEY = "autogood.mobile.monitoringScope.v1";
  const MONITORING_COUNTRIES = ["DE", "NL", "BE", "AT", "LU"];
  // Other countries come later with their own portals (owner, 2026-10-03).
  const MONITORING_COUNTRY_CHOICES = ["DE", "NL", "BE", "AT", "LU"];
  function readMonitoringScopes() {
    let raw = null;
    try {
      raw = localStorage.getItem(MONITORING_SCOPE_KEY);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a map");
      return parsed;
    } catch {
      try {
        localStorage.setItem(`${MONITORING_SCOPE_KEY}.broken.${new Date().toISOString()}`, raw);
      } catch {
        // Nothing more can be done.
      }
      return {};
    }
  }
  // Which portals and countries a Monitoring check covered.
  function monitoringScopeKey(scope, markets) {
    const withCountries = markets.includes("mobile") || markets.includes("autoscout");
    return [...markets].sort().join(",") + (withCountries ? `|${[...scope.countries].sort().join(",")}` : "");
  }

  function monitoringScopeOf(favoriteId) {
    const scope = readMonitoringScopes()[favoriteId] || {};
    const countries = Array.isArray(scope.countries) && scope.countries.length ? scope.countries.filter((code) => MONITORING_COUNTRY_CHOICES.includes(code)) : MONITORING_COUNTRIES;
    return { countries: countries.length ? countries : MONITORING_COUNTRIES };
  }
  function setMonitoringScope(favoriteId, change) {
    const all = readMonitoringScopes();
    all[favoriteId] = { ...monitoringScopeOf(favoriteId), ...change };
    try {
      localStorage.setItem(MONITORING_SCOPE_KEY, JSON.stringify(all));
    } catch {
      Object.assign(monitoringState, { status: copy().historyStorageError, statusError: true });
    }
  }

  const converterState = { amount: "10000", currency: "EUR" };
  function converterRates() {
    const rates = window.AUTOGOOD_TURNKEY?.currentRates?.() || { eur: exchangeRate() || EUR_PLN_FALLBACK_RATE, sek: sekPlnRate(), eurRaw: exchangeRate(), sekRaw: sekPlnRate() };
    return rates;
  }
  function converterOutputHtml() {
    const rates = converterRates();
    const amount = Number(String(converterState.amount).replace(/\s/g, "").replace(",", ".")) || 0;
    const toPln = { PLN: 1, EUR: rates.eur, SEK: rates.sek };
    const pln = amount * (toPln[converterState.currency] || 1);
    return ["PLN", "EUR", "SEK"].filter((currency) => currency !== converterState.currency)
      .map((currency) => `<span><b>${escapeMarketHtml(formatPlainPrice(Math.round(pln / toPln[currency]), currency))}</b></span>`).join("");
  }
  function monitoringConverterHtml() {
    const c = copy();
    const rates = converterRates();
    const rate = (value) => (Number.isFinite(value) ? new Intl.NumberFormat(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value) : "—");
    const date = window.AUTOGOOD_EXCHANGE_RATES?.updatedAt ? formatHistoryDate(window.AUTOGOOD_EXCHANGE_RATES.updatedAt) : "";
    return `
      <div class="mobileMonitoringConverter">
        <div class="mobileMonitoringConverterInput">
          <input type="text" inputmode="decimal" data-monitoring-convert-amount value="${escapeMarketHtml(converterState.amount)}" aria-label="${escapeMarketHtml(c.monitoringConverter)}" />
          <select data-monitoring-convert-currency aria-label="${escapeMarketHtml(c.monitoringConverter)}">
            ${["PLN", "EUR", "SEK"].map((currency) => `<option value="${currency}"${currency === converterState.currency ? " selected" : ""}>${currency}</option>`).join("")}
          </select>
          <span class="mobileMonitoringConverterEq">=</span>
          <div class="mobileMonitoringConverterOut" data-monitoring-convert-out>${converterOutputHtml()}</div>
        </div>
        <small>${escapeMarketHtml(c.monitoringAvgRate)}: 1 EUR = ${rate(rates.eurRaw)} PLN · 1 SEK = ${rate(rates.sekRaw)} PLN${date ? ` · ${escapeMarketHtml(date)}` : ""}</small>
        <small>${escapeMarketHtml(c.monitoringCalcRate)}: 1 EUR = ${rate(rates.eur)} PLN · 1 SEK = ${rate(rates.sek)} PLN</small>
      </div>`;
  }

  function renderPriceHistoryPage() {
    const priceHistoryPage = document.querySelector("[data-mobile-price-history-page]");
    if (!priceHistoryPage) return;
    const c = copy();
    const favorites = pinnedFavorites();
    // null: the favourite was unpicked here on purpose, nothing is shown.
    if (priceHistoryId !== null && !favorites.some((entry) => entry.id === priceHistoryId)) {
      priceHistoryId = favorites.find((entry) => entry.id === activeAnalysis?.historyId)?.id || favorites[0]?.id || "";
    }
    const entry = favorites.find((item) => item.id === priceHistoryId);
    if (entry) loadFavoriteIntoForm(entry);
    if (monitoringState.id !== (entry?.id || "")) Object.assign(monitoringState, { id: entry?.id || "", view: "new", portal: "", status: "", statusError: false });
    const monitored = Boolean(entry?.autoRefresh?.enabled);
    // This car being checked, or waiting for another car's check.
    const busy = entry && (monitoringState.busy === entry.id || queuedCheck?.entry.id === entry.id);
    const otherCar = monitoringState.busy && monitoringState.busy !== entry?.id ? marketHistory.find((item) => item.id === monitoringState.busy) : null;
    priceHistoryPage.innerHTML = entry ? `
      <section class="mobileMarketCard mobileMonitoringHead">
        <div class="mobileMonitoringTitleRow">
          <h2 class="agBlockTitle">★ ${escapeMarketHtml(monitoringTitle(entry))}</h2>
          <label class="mobileMonitoringSwitch${monitored ? " isOn" : ""}">
            <input type="checkbox" role="switch" data-monitoring-switch="${escapeMarketHtml(entry.id)}"${monitored ? " checked" : ""} />
            <i aria-hidden="true"></i><b>${escapeMarketHtml(monitored ? c.monitoringSwitchOn : c.monitoringSwitch)}</b>
          </label>
        </div>
        <p class="mobileMonitoringNote">${escapeMarketHtml(monitored ? c.monitoringOn : c.monitoringOff)}${monitored ? ` <b>${escapeMarketHtml(c.monitoringNext.replace("{date}", nextMonitoringText(entry)))}</b>` : ""}</p>
        <button class="mobileMonitoringParamsLine" type="button" data-monitoring-edit title="${escapeMarketHtml(c.monitoringEditParams)}">
          <span>${escapeMarketHtml([monitoringTitle(entry), ...historyMeta(entry.filters)].join(" · "))}</span>
          <b>${escapeMarketHtml(c.monitoringEditParams)} →</b>
        </button>
        <p class="mobileMonitoringSince" data-monitoring-since></p>
      </section>
      <details class="mobileMonitoringSettings" data-monitoring-settings${monitoringPrefs.settingsOpen ? " open" : ""}>
        <summary>${escapeMarketHtml(c.monitoringSettings)}</summary>
        <div class="mobileMonitoringColumns">
          <section class="mobileMarketCard mobileMonitoringPortalsCard">
            ${blockTitle("percent", c.monitoringPortals)}
            <p class="mobileMonitoringHint">${escapeMarketHtml(c.monitoringPortalsHint)}</p>
            <div class="mobileMonitoringPortals">${monitoringPortalsHtml(entry)}</div>
          </section>
          <section class="mobileMarketCard mobileMonitoringConverterCard">
            ${blockTitle("percent", c.monitoringConverter)}
            ${monitoringConverterHtml()}
          </section>
        </div>
      </details>
      <section class="mobileMarketCard mobileMonitoringResults">
        <div class="mobileMonitoringBlockHead">
          <div class="mobileMonitoringCheckInfo" data-monitoring-check-info></div>
          <div class="mobileMarketToolbarActions">
            <button class="mobileMarketImportClear" type="button" data-price-history-open="${escapeMarketHtml(entry.id)}">${escapeMarketHtml(c.analysisButton)} →</button>
            <button class="mobileMarketImportClear isPrimary" type="button" data-monitoring-check="${escapeMarketHtml(entry.id)}"${busy ? " disabled" : ""}>${escapeMarketHtml(busy ? c.monitoringChecking : c.monitoringCheck)}</button>
          </div>
        </div>
        <div class="mobileMonitoringProgress" data-monitoring-progress aria-live="polite"${monitoringState.busy ? "" : " hidden"}>${monitoringProgressHtml()}</div>
        ${otherCar ? `<p class="mobileMonitoringStatus">${escapeMarketHtml(c.monitoringAutoRunning.replace("{car}", monitoringTitle(otherCar)))}</p>` : ""}
        ${monitoringState.status ? `<p class="mobileMonitoringStatus${monitoringState.statusError ? " isError" : ""}">${escapeMarketHtml(monitoringState.status)}</p>` : ""}
        <div data-monitoring-results="${escapeMarketHtml(entry.id)}"><p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerLoading)}</p></div>
      </section>
      <button class="mobileMonitoringExtendedToggle" type="button" data-monitoring-extended aria-expanded="${monitoringExtended ? "true" : "false"}">${escapeMarketHtml(monitoringExtended ? c.monitoringExtendedHide : c.monitoringExtended)} ${monitoringExtended ? "▴" : "▾"}</button>
      ${monitoringExtended ? `
        <section class="mobileMarketCard">
          ${blockTitle("gauge", c.trendTitle)}
          ${medianTrendHtml(entry)}
        </section>
        <section class="mobileMarketCard mobileMarketOfferHistory" data-offer-history="${escapeMarketHtml(entry.id)}">
          ${blockTitle("gauge", c.offerHistoryHeading)}
          <p class="mobileMarketTrendEmpty">${escapeMarketHtml(c.offerLoading)}</p>
        </section>
        ${priceHistoryHtml(entry)}` : ""}` : `
      <section class="mobileMarketCard mobileMarketPriceHistoryIntro">
        ${blockTitle("calendar", c.monitoringHeading)}
        <p>${escapeMarketHtml(favorites.length ? c.monitoringIntro : c.monitoringNoFavorites)}</p>
      </section>`;
    if (!entry) return;
    fillMonitoringResults(entry);
    if (monitoringExtended) fillOfferHistory(entry);
  }

  // Monitoring runs every day at 9:00 (while the program is open, until a
  // server runs it): due when no Monitoring check exists since today's 9:00.
  const MONITORING_HOUR = 9;
  const todayAtNine = () => {
    const at = new Date();
    at.setHours(MONITORING_HOUR, 0, 0, 0);
    return at;
  };
  function nextMonitoringText(entry) {
    const c = copy();
    const nine = todayAtNine();
    if (Date.now() < nine.getTime()) return c.monitoringToday9;
    const doneToday = (entry.priceLog || []).some((point) => !point.filtersChange && Date.parse(point.at) >= nine.getTime());
    return doneToday ? c.monitoringTomorrow9 : c.monitoringNextNow;
  }
  function daysText(days) {
    const c = copy();
    const n = Math.max(0, Math.floor(days));
    if (n === 0) return c.monitoringDay0;
    if (currentLanguage() === "ru") {
      const word = n % 10 === 1 && n % 100 !== 11 ? c.monitoringDay1 : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? c.monitoringDay2 : c.monitoringDay5;
      return `${n} ${word}`;
    }
    return `${n} ${n === 1 ? c.monitoringDay1 : c.monitoringDay5}`;
  }
  const daysSince = (iso) => (Date.now() - Date.parse(iso)) / 86400000;
  const shortDate = (iso) => formatHistoryDate(iso).split(",")[0];

  function monitoringProgressHtml() {
    const c = copy();
    const parts = MARKET_SOURCES.filter((source) => monitoringProgress[source]).map((source) => {
      const info = monitoringProgress[source];
      const text = info.state === "ok" ? c.monitoringProgressDone.replace("{count}", numberFormat().format(info.count || 0))
        : info.state === "fail" ? c.monitoringProgressFail
          : Number.isFinite(info.done) && Number.isFinite(info.total)
            ? (info.unit === "countries" ? c.monitoringProgressCountries : c.monitoringProgressPages).replace("{done}", info.done).replace("{total}", info.total)
            : c.monitoringProgressRun;
      return `<span class="is${info.state === "ok" ? "Done" : info.state === "fail" ? "Fail" : "Run"}"><b>${escapeMarketHtml(portalName(source))}</b> ${escapeMarketHtml(text)}</span>`;
    });
    return `<b>${escapeMarketHtml(c.monitoringProgressTitle)}</b> ${parts.length ? parts.join("") : `<span>${escapeMarketHtml(c.monitoringProgressRun)}</span>`}`;
  }
  function updateMonitoringProgress(source, info) {
    monitoringProgress[source] = { ...(monitoringProgress[source] || {}), ...info };
    const box = document.querySelector("[data-monitoring-progress]");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = monitoringProgressHtml();
  }

  // What went wrong, in the manager's words (the technical text only as a
  // detail of the generic message).
  function monitoringErrorText(error, source = "") {
    const c = copy();
    const detail = String(error?.message || error || "");
    if (/model not found/i.test(detail)) return c.monitoringErrorModel.replace("{portal}", portalName(source || "autoscout"));
    if (detail === c.refreshInvalid) return c.monitoringErrorTooFew;
    if (detail === c.otomotoFailed) return c.monitoringErrorNone;
    if (/failed to fetch|network|load failed|^\d{3}$/i.test(detail)) return c.monitoringErrorNone;
    return c.monitoringErrorGeneric.replace("{detail}", detail || "—");
  }

  // ---- Offers saved by hand on page 3 (per favourite) -----------------------
  // Same rules as the history (4.6.1): read before every write, never
  // cleared, unreadable data kept aside.
  const SAVED_CARS_KEY = "autogood.mobile.savedCars.v1";
  function readSavedCars() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVED_CARS_KEY);
    } catch {
      return {};
    }
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a map");
      return parsed;
    } catch {
      try {
        localStorage.setItem(`${SAVED_CARS_KEY}.broken.${new Date().toISOString()}`, raw);
      } catch {
        // Nothing more can be done in this browser.
      }
      return {};
    }
  }
  function savedCarsOf(favoriteId) {
    const list = readSavedCars()[favoriteId];
    return Array.isArray(list) ? list : [];
  }
  function toggleSavedCar(favoriteId, source, offer) {
    const all = readSavedCars();
    const list = Array.isArray(all[favoriteId]) ? all[favoriteId] : [];
    const at = list.findIndex((item) => item.offer?.key === offer.key);
    all[favoriteId] = at >= 0 ? list.filter((_, index) => index !== at) : [...list, { source, offer, savedAt: new Date().toISOString() }];
    try {
      localStorage.setItem(SAVED_CARS_KEY, JSON.stringify(all));
    } catch {
      Object.assign(monitoringState, { status: copy().historyStorageError, statusError: true });
    }
  }

  // ---- Details of one offer, read on demand ("Wyposażenie…") ---------------
  // The equipment the seller lists, with what sells a car first.
  const KEY_OPTIONS = [
    /automat|automatic|automatik|dsg|s.?tronic|cvt/i,
    /nawigac|navi/i,
    /\bled\b|matrix|laser/i,
    /adaptac|aktywny tempomat|abstandstempomat|\bacc\b|adaptive cruise|adaptiver tempomat/i,
    /podgrzew|sitzheiz|heated seat/i,
    /kamer|camera|kamera|360/i,
    /\bhak\b|anhängerkupplung|anhaengerkupplung|tow ?bar|dragkrok/i,
    /panoram|szyberdach|schiebedach|sunroof/i,
    /skór|leder|leather|skinn/i,
    /4x4|allrad|napęd na (?:cztery|wszystkie)|\b4wd\b|\bawd\b|4motion|quattro|xdrive/i,
  ];
  const offerDetails = new Map();
  var rowsForDetails = new Map();
  const openDetails = new Set();
  const allOptionsShown = new Set();

  function vatFromDescription(html) {
    const c = copy();
    const text = String(html || "").replace(/<[^>]+>/g, " ").toLowerCase();
    if (/vat[\s-]*marż|marża[\s-]*vat|vat-?marża|faktura vat[\s-]*marża/.test(text)) return `${c.monitoringVatMargin} (${c.monitoringFromDescription})`;
    if (/faktur\w*\s+vat|\bfv\s*23|vat\s*23\s*%|netto\s*\+\s*vat|do odliczenia/.test(text)) return `${c.monitoringVatInvoice} (${c.monitoringFromDescription})`;
    return "";
  }

  async function loadOfferDetails(source, offer) {
    const key = offer.key;
    offerDetails.set(key, { status: "loading" });
    try {
      let details;
      if (source === "otomoto") {
        const response = await fetch(`${MARKET_PROXY()}${offer.url}`, { headers: { "x-respond-with": "html" } });
        if (!response.ok) throw new Error(String(response.status));
        const raw = (await response.text()).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        const advert = raw ? JSON.parse(raw[1])?.props?.pageProps?.advert : null;
        if (!advert) throw new Error("no advert");
        const dict = advert.parametersDict || {};
        const label = (name) => dict[name]?.values?.[0]?.label || "";
        details = {
          equipment: (advert.equipment || []).flatMap((group) => (group.values || []).map((value) => value.label)).filter(Boolean),
          power: label("engine_power"),
          // otomoto has no VAT field: the seller's own description says it.
          vat: vatFromDescription(advert.description),
          seller: advert.seller?.type === "PRIVATE" ? "private" : advert.seller?.type ? "dealer" : "",
        };
      } else if (source === "mobile") {
        if (typeof window.AUTOGOOD_MOBILEDE_IMPORT !== "function") throw new Error("no importer");
        const data = await window.AUTOGOOD_MOBILEDE_IMPORT(offer.url);
        const equipment = Array.isArray(data.equipment) ? data.equipment : Object.values(data.equipment || {}).flat();
        details = {
          equipment: equipment.map((item) => (typeof item === "string" ? item : item?.label || item?.name || "")).filter(Boolean),
          power: data.powerHp ? `${data.powerHp} KM` : "",
          // The result list's VAT mark is the checked one (vat=1 search);
          // the ad reader's purchase type is only a fallback.
          vat: offer.priceType ? "" : data.purchaseType || "",
          netPrice: data.carNettoEur || 0,
          seller: data.sellerType || "",
        };
      } else {
        offerDetails.set(key, { status: "unavailable" });
        return;
      }
      offerDetails.set(key, { status: "ok", details });
    } catch {
      offerDetails.set(key, { status: "error" });
    }
  }

  function vatLabel(offer) {
    const c = copy();
    // Otomoto offers saved before 2026-10-03 as "net" are gross, VAT deductible.
    if (offer.priceType === "net" && offer.currency === "PLN") return c.monitoringVatDeductible.replace("{net}", formatPlainPrice(Math.round(offer.price / 1.23), offer.currency));
    if (offer.priceType === "vat") return offer.netPrice ? c.monitoringVatDeductible.replace("{net}", formatPlainPrice(offer.netPrice, offer.currency)) : c.monitoringVatDeductibleOnly;
    if (offer.priceType === "net") return c.monitoringVatNet.replace("{gross}", formatPlainPrice(Math.round(offer.price * 1.23), offer.currency));
    if (offer.priceType === "margin") return c.monitoringVatMargin;
    if (offer.priceType === "private") return c.monitoringVatPrivate;
    return c.monitoringVatGross;
  }

  function offerDetailsHtml(row, columns) {
    const c = copy();
    const state = offerDetails.get(row.offer.key);
    let body;
    if (!state || state.status === "loading") body = `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsLoading)}</span>`;
    else if (state.status === "unavailable") body = `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsUnavailable)}</span>`;
    else if (state.status === "error") body = `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsFailed)}</span>`;
    else {
      const { equipment = [], vat = "", power = "" } = state.details;
      const keyed = equipment.filter((item) => KEY_OPTIONS.some((pattern) => pattern.test(item)));
      const ordered = [...keyed, ...equipment.filter((item) => !keyed.includes(item))];
      const showAll = allOptionsShown.has(row.offer.key);
      const shown = showAll ? ordered : ordered.slice(0, 6);
      const extra = [power ? `${c.monitoringPower}: ${power}` : "", vat].filter(Boolean);
      body = ordered.length || extra.length ? `
        ${extra.map((item) => `<span class="mobileMonitoringChip isInfo">${escapeMarketHtml(item)}</span>`).join("")}
        ${shown.map((item) => `<span class="mobileMonitoringChip${keyed.includes(item) ? " isKey" : ""}">${escapeMarketHtml(item)}</span>`).join("")}
        ${ordered.length > 6 ? `<button class="mobileMonitoringMore" type="button" data-monitoring-more="${escapeMarketHtml(row.offer.key)}">${escapeMarketHtml(showAll ? c.monitoringLess : c.monitoringMore.replace("{count}", String(ordered.length - 6)))}</button>` : ""}`
        : `<span class="mobileMonitoringMuted">${escapeMarketHtml(c.monitoringDetailsNone)}</span>`;
    }
    return `<tr class="mobileMonitoringDetailsRow"><td colspan="${columns}"><div class="mobileMonitoringChips">${body}</div></td></tr>`;
  }

  // The latest check with offers against the one before it.
  async function fillMonitoringResults(entry) {
    const c = copy();
    const byDate = await loadCheckOffers(entry.id);
    const target = document.querySelector(`[data-monitoring-results="${CSS.escape(entry.id)}"]`);
    const info = document.querySelector("[data-monitoring-check-info]");
    if (!target) return;
    const log = entry.priceLog || [];
    const scopeKey = monitoringScopeKey(monitoringScopeOf(entry.id), MARKET_SOURCES.filter((source) => chartSources[source]));
    // Monitoring compares its own checks of the same portals and countries
    // (checks made from the analysis, page 2, cover other countries).
    const checks = log.filter((point) => !point.filtersChange && byDate.get(point.at)?.scope === scopeKey);
    const otherChecks = log.some((point) => !point.filtersChange && byDate.has(point.at) && byDate.get(point.at)?.scope !== scopeKey);
    const latest = checks[checks.length - 1];
    // Compared only with a check of the same search and prices: after a
    // change the latest check is a new base (not "gone" for the old budget).
    const lastChange = [...log].reverse().find((point) => point.filtersChange && latest && point.at <= latest.at && log.indexOf(point) < log.indexOf(latest));
    const sameSearch = checks.filter((point) => !lastChange || log.indexOf(point) > log.indexOf(lastChange));
    const previous = sameSearch[sameSearch.length - 2];
    if (info) {
      info.innerHTML = latest
        ? `<b>${escapeMarketHtml(c.monitoringLastCheck.replace("{date}", formatHistoryDate(latest.at)))}</b>${previous ? `<small>${escapeMarketHtml(c.monitoringComparedWith.replace("{date}", formatHistoryDate(previous.at)))}</small>` : ""}`
        : "";
    }
    if (!latest) {
      target.innerHTML = `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(otherChecks ? c.monitoringNoScopeCheck : c.monitoringNeverChecked)}</p>`;
      return;
    }
    const record = byDate.get(latest.at);
    const before = previous ? byDate.get(previous.at) : null;
    // Since when this car is monitored, and when each offer first showed up
    // in any of its checks (the portal's own date wins where it gives one).
    const monitoringChecks = [...byDate.values()].filter((item) => item.scope).sort((left, right) => left.at.localeCompare(right.at));
    const firstSeen = new Map();
    [...byDate.values()].sort((left, right) => left.at.localeCompare(right.at)).forEach((item) => {
      Object.values(item.markets || {}).forEach((market) => (market.offers || []).forEach((offer) => {
        if (!firstSeen.has(offer.key)) firstSeen.set(offer.key, item.at);
      }));
    });
    const firstCheckAt = [...byDate.keys()].sort()[0];
    const since = document.querySelector("[data-monitoring-since]");
    if (since && monitoringChecks.length) {
      since.textContent = c.monitoringSince
        .replace("{date}", shortDate(monitoringChecks[0].at))
        .replace("{days}", daysText(daysSince(monitoringChecks[0].at)))
        .replace("{count}", String(monitoringChecks.length));
    }
    const appearance = (offer) => {
      if (offer.listedAt && Number.isFinite(Date.parse(offer.listedAt))) return { at: offer.listedAt, kind: "listed" };
      const at = firstSeen.get(offer.key);
      if (!at) return null;
      return { at, kind: at === firstCheckAt ? "before" : "seen" };
    };
    const changedBetween = false;
    const newBase = !previous && (checks.length > 1 || otherChecks);
    const sources = MARKET_SOURCES.filter((source) => chartSources[source] && (record.markets[source] || before?.markets[source]));
    const numbers = numberFormat();
    const perSource = sources.map((source) => {
      const current = record.markets[source];
      // A portal missing from the previous monitoring (it did not answer):
      // nothing to compare with, this one is its base.
      const compared = before && before.markets[source] ? before.markets[source] : null;
      const rows = offerChanges(source, current, compared);
      return { source, current, compared, rows };
    });
    if (monitoringState.portal && !sources.includes(monitoringState.portal)) monitoringState.portal = "";
    const tiles = perSource.map(({ source, current, compared, rows }) => {
      const count = (group) => rows.filter((row) => row.group === group).length;
      // AutoScout24 counts its unique offers (duplicates of mobile.de left out).
      const total = source === "autoscout" ? current?.offers.length || 0 : current?.total || 0;
      const comparedTotal = source === "autoscout" ? compared?.offers.length || 0 : compared?.total || 0;
      const delta = compared && comparedTotal ? total - comparedTotal : null;
      const certain = Boolean(current?.complete && compared?.complete);
      const active = monitoringState.portal === source;
      return `
        <button class="mobileMonitoringTile is${sourceClass(source)}${active ? " isActive" : ""}" type="button" data-monitoring-portal="${source}" aria-pressed="${active ? "true" : "false"}">
          <span class="mobileMonitoringTileHead">${monitoringPortalBadge(source, current?.countries || record.markets.mobile?.countries || [])}</span>
          <span class="mobileMonitoringTileStats">
            <span><small>${escapeMarketHtml(c.monitoringOffers)}</small><b>${escapeMarketHtml(numbers.format(total))}</b>${delta ? `<em class="${delta > 0 ? "isGood" : "isBad"}">${delta > 0 ? "▲" : "▼"} ${escapeMarketHtml(numbers.format(Math.abs(delta)))}</em>` : ""}</span>
            <span><small>${escapeMarketHtml(c.monitoringNew)}</small><b class="${certain ? "isNew" : "isUnsure"}">${compared ? `${certain ? "" : "≈ "}+${count("new")}` : "—"}</b></span>
            <span><small>${escapeMarketHtml(c.monitoringGone)}</small><b class="${certain ? "isGone" : "isUnsure"}">${compared ? `${certain ? "" : "≈ "}−${count("gone")}` : "—"}</b></span>
          </span>
          ${compared && !certain ? `<small class="mobileMonitoringTileNote" title="${escapeMarketHtml(c.monitoringApproxTitle)}">${escapeMarketHtml(c.monitoringSample)} · ${escapeMarketHtml(c.monitoringReadOf.replace("{read}", numbers.format(current?.offers.length || 0)).replace("{total}", numbers.format(current?.read && source === "autoscout" ? current.total : current?.total || 0)))}</small>` : ""}
          ${current?.allCountriesTotal ? `<small class="mobileMonitoringTileNote">${escapeMarketHtml(c.monitoringAllCountries.replace("{count}", numbers.format(current.allCountriesTotal)))}</small>` : ""}
          ${current?.duplicates ? `<small class="mobileMonitoringTileNote">${escapeMarketHtml(c.monitoringDuplicates.replace("{count}", numbers.format(current.duplicates)))}</small>` : ""}
        </button>`;
    }).join("");
    const allRows = perSource.flatMap((item) => item.rows).filter((row) => !monitoringState.portal || row.source === monitoringState.portal);
    // Saved by hand: as listed now, or as saved when no longer listed.
    const saved = savedCarsOf(entry.id).filter((item) => !monitoringState.portal || item.source === monitoringState.portal);
    const savedKeys = new Set(savedCarsOf(entry.id).map((item) => item.offer?.key));
    const currentByKey = new Map(perSource.flatMap(({ source, current }) => (current?.offers || []).map((offer) => [offer.key, { source, offer }])));
    const viewRows = {
      new: allRows.filter((row) => row.group === "new"),
      gone: allRows.filter((row) => row.group === "gone"),
      all: allRows.filter((row) => !row.gone),
      saved: saved.map((item) => {
        const now = currentByKey.get(item.offer.key);
        return now
          ? { source: now.source, offer: now.offer, previous: now.offer.price !== item.offer.price ? item.offer : null, savedAt: item.savedAt }
          : { source: item.source, offer: item.offer, gone: true, savedAt: item.savedAt };
      }),
    };
    if (!before && (monitoringState.view === "new" || monitoringState.view === "gone")) monitoringState.view = "all";
    const view = monitoringState.view;
    const statusLabel = { new: c.offerNew, firstSeen: c.offerFirstSeen, gone: c.offerGone, outside: c.offerOutside, cheaper: c.offerCheaper, dearer: c.offerDearer, same: c.offerSame };
    // The list as the manager wants it: only VAT-deductible / dealers, sorted
    // by price, year, mileage or the day the ad appeared.
    const isVat = (offer) => offer.priceType === "vat" || (offer.priceType === "net" && offer.currency === "PLN");
    const sortValue = {
      price: (row) => row.offer.turnkey || priceInPln(row.offer.price, row.offer.currency),
      year: (row) => Number(row.offer.year) || 0,
      mileage: (row) => Number(row.offer.mileage) || 0,
      listed: (row) => Date.parse(appearance(row.offer)?.at || "") || 0,
    }[monitoringPrefs.sort] || ((row) => row.offer.price);
    const direction = monitoringPrefs.dir === "desc" ? -1 : 1;
    const rows = viewRows[view]
      .filter((row) => (!monitoringPrefs.onlyVat || isVat(row.offer)) && (!monitoringPrefs.onlyDealers || row.offer.seller === "dealer"))
      .sort((left, right) => (sortValue(left) - sortValue(right)) * direction || left.offer.price - right.offer.price);
    // Belarus (av.by compared with mobile.de / AutoScout24): German offers with
    // the car's price, the price in Minsk and turnkey with customs, in USD.
    const byCompare = Boolean(window.AUTOGOOD_TURNKEY_BY) && chartSources.avby && (chartSources.mobile || chartSources.autoscout);
    const byOfferPrices = (offer, source) => {
      if (!byCompare || (source !== "mobile" && source !== "autoscout")) return null;
      const id = String(offer.key || "").startsWith("mobile:") ? offer.key.slice(7) : "";
      return turnkeyByFor({
        id,
        originalPrice: offer.price,
        originalCurrency: offer.currency || "EUR",
        netPrice: offer.priceType === "vat" ? offer.netPrice : 0,
        displacementCcm: offer.ccm,
        firstRegistration: offer.reg,
        year: offer.year,
        fuel: offer.fuel,
      }, entry.filters);
    };
    const byPriceCell = (prices) => `<b class="mobileMonitoringAdPrice">${escapeMarketHtml(formatMarketPrice(prices.parts.carEur, "EUR"))}</b>`
      + `<small class="mobileMonitoringVat is${prices.base === "netto" ? "Vat" : "Gross"}">${escapeMarketHtml(prices.base === "netto" ? c.byNet : c.byGross)} · ${escapeMarketHtml(formatMarketPrice(prices.carUsd, "USD"))}</small>`
      + `<small class="mobileMarketTurnkeyNote">~ ${escapeMarketHtml(formatMarketPrice(prices.deliveredUsd, "USD"))} ${escapeMarketHtml(c.byDelivered)}*</small>`
      + `<small class="mobileMarketTurnkeyNote isStrong">~ ${escapeMarketHtml(formatMarketPrice(prices.totalUsd, "USD"))} ${escapeMarketHtml(c.byTurnkey)}*</small>`;
    const priceCell = (offer, source) => {
      const prices = byOfferPrices(offer, source);
      return prices ? byPriceCell(prices) : plainPriceCell(offer);
    };
    // The same footnote as in the analysis under a list with Belarus prices.
    const bySavings = byCompare ? viewRows[view].map((row) => byOfferPrices(row.offer, row.source)?.benefitSavingUsd).filter((value) => value > 0).sort((a, b) => a - b) : [];
    const byRatesNow = byCompare ? window.AUTOGOOD_TURNKEY_BY.rates() : null;
    const byFootnote = bySavings.length
      ? `<p class="mobileMarketAxisNote isTurnkey">* ${escapeMarketHtml(c.turnkeyFootnoteBy
        .replace("{date}", byRatesNow.date ? byRatesNow.date.split("-").reverse().join(".") : "—")
        .replace("{saving}", formatMarketPrice(percentile(bySavings, 0.5), "USD")))}</p>`
      : "";
    const plainPriceCell = (offer) => `<b class="mobileMonitoringAdPrice">${escapeMarketHtml(formatPlainPrice(offer.price, offer.currency))}</b><small class="mobileMonitoringVat is${(offer.priceType || "gross").charAt(0).toUpperCase()}${(offer.priceType || "gross").slice(1)}">${escapeMarketHtml(vatLabel(offer))}</small>${offer.turnkey ? `<small class="mobileMarketTurnkeyNote">~ ${escapeMarketHtml(formatPlainPrice(offer.turnkey, "PLN"))} ${escapeMarketHtml(c.turnkeyShort)}</small>` : ""}`;
    const viewButton = (key, label) => `<button class="mobileMarketImportClear${view === key ? " isPrimary" : ""}" type="button" data-monitoring-view="${key}"${(key === "new" || key === "gone") && !before ? " disabled" : ""}>${escapeMarketHtml(label)} · ${viewRows[key].length}</button>`;
    const withStatus = view === "all" && before;
    const columns = 5 + (withStatus ? 1 : 0);
    const dateLine = (offer) => {
      const info = appearance(offer);
      if (!info) return "";
      const text = { listed: c.monitoringListedSince, seen: c.monitoringSeenSince, before: c.monitoringSeenBefore }[info.kind]
        .replace("{date}", shortDate(info.at)).replace("{days}", daysText(daysSince(info.at)));
      const title = { listed: c.monitoringListedTitle, seen: c.monitoringSeenTitle, before: c.monitoringSeenBeforeTitle }[info.kind];
      return `<small class="mobileMonitoringDate is${info.kind.charAt(0).toUpperCase()}${info.kind.slice(1)}" title="${escapeMarketHtml(title)}">${escapeMarketHtml(text)}</small>`;
    };
    const metaLine = (offer) => [offer.year, offer.mileage ? `${numbers.format(offer.mileage)} ${kmUnit()}` : "", powerText(offer.power)].filter(Boolean).join(" · ");
    const nextText = c.monitoringNext.replace("{date}", nextMonitoringText(entry));
    const emptyText = {
      new: c.monitoringEmptyNew.replace("{date}", formatHistoryDate(latest.at)).replace("{next}", nextText),
      gone: c.monitoringEmptyGone.replace("{date}", formatHistoryDate(latest.at)).replace("{next}", nextText),
      saved: c.monitoringEmptySaved,
    }[view] || c.monitoringEmptyList;
    const sortOptions = [["price", c.monitoringSortPrice], ["year", c.monitoringSortYear], ["mileage", c.monitoringSortMileage], ["listed", c.monitoringSortListed]];
    const savedCount = viewRows.saved.length;
    rowsForDetails = new Map(rows.map((row) => [row.offer.key, row]));
    target.innerHTML = `
      ${changedBetween ? `<p class="mobileMarketOfferWarning">${escapeMarketHtml(c.offerFiltersBetween)}</p>` : ""}
      ${!before ? `<p class="mobileMonitoringNote">${escapeMarketHtml((newBase ? c.monitoringNewBase : c.monitoringBaseline).replace("{count}", numbers.format(perSource.reduce((sum, item) => sum + (item.current?.offers.length || 0), 0))))}</p>` : ""}
      <div class="mobileMonitoringTiles">${tiles}</div>
      <div class="mobileMonitoringViews" role="group">
        ${viewButton("new", c.monitoringViewNew)}${viewButton("gone", `${c.monitoringViewGone} (${c.monitoringGoneHint})`)}${viewButton("all", c.monitoringViewAll)}${viewButton("saved", c.monitoringViewSaved)}
        ${monitoringState.portal ? `<button class="mobileMarketImportClear" type="button" data-monitoring-portal="">${escapeMarketHtml(c.monitoringAllPortals)} ✕</button>` : ""}
        <button class="mobileMarketImportClear mobileMonitoringPdfButton" type="button" data-monitoring-pdf${savedCount ? "" : ` aria-disabled="true" title="${escapeMarketHtml(c.monitoringPdfEmpty)}"`}>${escapeMarketHtml(c.monitoringPdf)} · ${savedCount}</button>
      </div>
      <div class="mobileMonitoringListTools">
        <label>${escapeMarketHtml(c.monitoringSort)}
          <select data-monitoring-sort>${sortOptions.map(([key, label]) => `<option value="${key}"${monitoringPrefs.sort === key ? " selected" : ""}>${escapeMarketHtml(label)}</option>`).join("")}</select>
        </label>
        <button class="mobileMonitoringSortDir" type="button" data-monitoring-sort-dir aria-label="${escapeMarketHtml(c.monitoringSortDir)}" title="${escapeMarketHtml(c.monitoringSortDir)}">${monitoringPrefs.dir === "desc" ? "↓" : "↑"}</button>
        <label class="mobileMonitoringCheck"><input type="checkbox" data-monitoring-only="onlyVat"${monitoringPrefs.onlyVat ? " checked" : ""} /> ${escapeMarketHtml(c.monitoringOnlyVat)}</label>
        <label class="mobileMonitoringCheck"><input type="checkbox" data-monitoring-only="onlyDealers"${monitoringPrefs.onlyDealers ? " checked" : ""} /> ${escapeMarketHtml(c.monitoringOnlyDealers)}</label>
      </div>
      ${rows.length ? `
      <div class="mobileMarketTableScroll mobileMonitoringList">
        <table class="mobileMarketTable mobileMonitoringTable">
          <thead><tr>
            <th scope="col" class="isNum mobileMarketRowNumber">#</th>
            ${withStatus ? `<th scope="col">${escapeMarketHtml(c.offerStatus)}</th>` : ""}
            <th scope="col" class="mobileMonitoringStarCell"><span class="agVisuallyHidden">★</span></th>
            <th scope="col">${escapeMarketHtml(c.offerAd)}</th>
            <th scope="col" class="isNum">${escapeMarketHtml(c.offerPrice)}</th>
            <th scope="col">${escapeMarketHtml(c.priceHistorySource)}</th>
          </tr></thead>
          <tbody>${rows.map((row, index) => {
            const isSaved = savedKeys.has(row.offer.key);
            const detailsOpen = openDetails.has(row.offer.key);
            return `
            <tr class="${row.gone ? "isGone" : ""}">
              <td class="isNum mobileMarketRowNumber">${index + 1}</td>
              ${withStatus ? `<td><span class="mobileMarketOfferStatus is${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}">${escapeMarketHtml(statusLabel[row.status] || "")}</span></td>` : ""}
              <td class="mobileMonitoringStarCell"><button class="mobileMonitoringStar${isSaved ? " isOn" : ""}" type="button" data-monitoring-save="${escapeMarketHtml(row.offer.key)}" aria-pressed="${isSaved ? "true" : "false"}" title="${escapeMarketHtml(isSaved ? c.monitoringUnsave : c.monitoringSave)}" aria-label="${escapeMarketHtml(isSaved ? c.monitoringUnsave : c.monitoringSave)}">${isSaved ? "★" : "☆"}</button></td>
              <td class="mobileMarketTableTitle">${row.offer.url ? `<a href="${escapeMarketHtml(row.offer.url)}" target="_blank" rel="noopener"><b>${escapeMarketHtml(row.offer.title || "—")}</b></a>` : `<b>${escapeMarketHtml(row.offer.title || "—")}</b>`}<small class="mobileMonitoringMeta">${escapeMarketHtml(metaLine(row.offer) || "—")}</small>${dateLine(row.offer)}${row.previous && row.previous.price !== row.offer.price ? `<small>${escapeMarketHtml(c.offerBefore)}: ${escapeMarketHtml(formatPlainPrice(row.previous.price, row.previous.currency))}</small>` : ""}${view === "saved" ? `<small>${escapeMarketHtml([row.gone ? c.monitoringSavedGone : "", row.savedAt ? c.monitoringSavedAt.replace("{date}", formatHistoryDate(row.savedAt)) : ""].filter(Boolean).join(" · "))}</small>` : ""}<button class="mobileMonitoringDetailsToggle" type="button" data-monitoring-details="${escapeMarketHtml(row.offer.key)}" aria-expanded="${detailsOpen ? "true" : "false"}">${escapeMarketHtml(detailsOpen ? c.monitoringDetailsHide : c.monitoringDetails)}</button></td>
              <td class="isNum">${priceCell(row.offer, row.source)}</td>
              <td>${offerCountryBadge(row.source, row.offer.country)}</td>
            </tr>${detailsOpen ? offerDetailsHtml(row, columns) : ""}`;
          }).join("")}</tbody>
        </table>
      </div>` : `<p class="mobileMarketTrendEmpty">${escapeMarketHtml(emptyText)}</p>`}${byFootnote}`;
    monitoringPdfRows = { entry, rows: viewRows.saved, priceCell, metaLine, dateLine };
  }

  // ---- PDF for the client: the cars saved (★) for this favourite ---------
  var monitoringPdfRows = null;
  async function downloadClientPdf(button) {
    const c = copy();
    const data = monitoringPdfRows;
    if (!data || !data.rows.length) {
      Object.assign(monitoringState, { status: c.monitoringPdfEmpty, statusError: true });
      renderPriceHistoryPage();
      return;
    }
    const rows = [...data.rows].filter((row) => !row.gone).sort((left, right) => (left.offer.turnkey || priceInPln(left.offer.price, left.offer.currency)) - (right.offer.turnkey || priceInPln(right.offer.price, right.offer.currency)));
    const title = monitoringTitle(data.entry);
    const today = new Date();
    const report = document.createElement("article");
    report.className = "mobileMarketAnalysisPanel mobileMonitoringClientReport";
    report.innerHTML = `
      <header class="mobileMonitoringClientHead">
        <img src="./assets/autogood-logo.png" alt="AUTOGOOD" />
        <div>
          <h1>${escapeMarketHtml(c.monitoringPdfTitle.replace("{car}", title))}</h1>
          <p>${escapeMarketHtml(c.monitoringPdfSub.replace("{date}", formatHistoryDate(today.toISOString()).split(",")[0]).replace("{count}", String(rows.length)))}</p>
        </div>
      </header>
      <table class="mobileMarketTable mobileMonitoringClientTable">
        <thead><tr><th>#</th><th>${escapeMarketHtml(c.offerAd)}</th><th class="isNum">${escapeMarketHtml(c.offerPrice)}</th></tr></thead>
        <tbody>${rows.map((row, index) => `
          <tr>
            <td class="isNum">${index + 1}</td>
            <td><b>${escapeMarketHtml(row.offer.title || "—")}</b><small>${escapeMarketHtml(data.metaLine(row.offer))}</small><small>${offerCountryBadge(row.source, row.offer.country)}</small>${row.offer.url ? `<a href="${escapeMarketHtml(row.offer.url)}">${escapeMarketHtml(c.monitoringPdfOpen)} ↗</a>` : ""}</td>
            <td class="isNum">${data.priceCell(row.offer, row.source)}</td>
          </tr>`).join("")}</tbody>
      </table>
      <p class="mobileMarketAxisNote isTurnkey">* ${escapeMarketHtml(c.turnkeyFootnote || "")}</p>`;
    const fileName = `AUTOGOOD ${c.monitoringPdfFile} ${title} ${today.toISOString().slice(0, 10)}.pdf`.replace(/[\\/:*?"<>|']+/g, "").replace(/\s+/g, " ");
    await downloadReportPdf(button, "pdf", {
      live: report,
      fileName,
      onStatus: (text, isError = false) => {
        Object.assign(monitoringState, { status: text, statusError: isError });
        const box = document.querySelector(".mobileMonitoringResults .mobileMonitoringStatus[data-monitoring-pdf-status]");
        if (box) box.textContent = text;
      },
      working: c.monitoringPdfWorking,
      ready: c.monitoringPdfReady,
      failed: c.monitoringPdfFailed,
    });
    renderPriceHistoryPage();
  }

  // One check of a favourite, in place: its portals read (whole lists where
  // short enough, with its own prices), a new dated row in its history with
  // the offers kept, then the comparison above is drawn again.
  // Every field of the page-1 form, empty.
  function blankFilters() {
    try {
      return Object.fromEntries(Object.entries(readManualFields()).map(([key, value]) => [key, Array.isArray(value) ? [] : typeof value === "boolean" ? false : ""]));
    } catch {
      return {};
    }
  }

  // A check asked for while another one runs waits for it.
  var queuedCheck = null;
  async function runMonitoringCheck(entry, markets = MARKET_SOURCES.filter((source) => chartSources[source])) {
    const c = copy();
    const provider = window.AUTOGOOD_MOBILE_MARKET_PROVIDER;
    if (!provider) return false;
    if (monitoringState.busy) {
      if (monitoringState.busy !== entry.id) queuedCheck = { entry, markets };
      if (currentPage() === "history") renderPriceHistoryPage();
      return false;
    }
    monitoringState.busy = entry.id;
    if (monitoringState.id === entry.id) Object.assign(monitoringState, { status: "", statusError: false });
    if (currentPage() === "history") renderPriceHistoryPage();
    let ok = false;
    try {
      const filters = { ...entry.filters, markets };
      // A favourite saved before a newer form field existed: the search gets
      // that field empty; the history keeps the filters as saved.
      const searchFilters = { ...blankFilters(), ...filters };
      // mobile.de and AutoScout24 are searched in the monitoring countries;
      // the statistics stay with page 1's countries (Germany by default).
      const scope = monitoringScopeOf(entry.id);
      const withCountries = markets.includes("mobile") || markets.includes("autoscout");
      Object.keys(monitoringProgress).forEach((key) => delete monitoringProgress[key]);
      const readMarkets = (only) => provider.getListings({
        filters: { ...(withCountries ? { ...searchFilters, countries: scope.countries } : searchFilters), markets: only },
        pinned: true,
        historyId: entry.id,
        // Shown whichever car is open: the line says which car runs.
        progress: (source, info) => updateMonitoringProgress(source, info),
      });
      const pause = () => new Promise((resolve) => setTimeout(resolve, 5000));
      // otomoto, blocket and AutoScout24 share a free reader proxy that now
      // and then refuses a burst: a portal that gave nothing is asked once
      // more, alone, when the others are done.
      let raw;
      try {
        raw = await readMarkets(markets);
      } catch {
        await pause();
        raw = await readMarkets(markets);
      }
      let sourcesOk = [...(provider.lastSources || [])];
      let errors = { ...(provider.lastErrors || {}) };
      let autoscoutMeta = provider.lastAutoscout || null;
      const pricesKey = provider.lastPrices ?? null;
      const retry = markets.filter((source) => !sourcesOk.includes(source) && !/model not found/i.test(errors[source] || ""));
      if (retry.length) {
        await pause();
        try {
          let more = await readMarkets(retry);
          const nowOk = provider.lastSources || [];
          // AutoScout24 asked again alone: mobile.de's duplicates dropped here.
          if (nowOk.includes("autoscout") && !retry.includes("mobile") && sourcesOk.includes("mobile")) {
            const mobileRaw = raw.filter((listing) => listingSource(listing) === "mobile");
            const autoscoutRaw = more.filter((listing) => listingSource(listing) === "autoscout");
            const { unique, duplicates } = dropMobileDuplicates(autoscoutRaw, mobileRaw);
            more = [...more.filter((listing) => listingSource(listing) !== "autoscout"), ...unique];
            if (provider.lastAutoscout) provider.lastAutoscout = { ...provider.lastAutoscout, duplicates, deduplicated: true };
          }
          raw = [...raw, ...more];
          sourcesOk = [...sourcesOk, ...nowOk];
          nowOk.forEach((source) => delete errors[source]);
          errors = { ...errors, ...(provider.lastErrors || {}) };
          if (nowOk.includes("autoscout")) autoscoutMeta = provider.lastAutoscout || autoscoutMeta;
        } catch {
          // Still nothing: said in the status below.
        }
      }
      provider.lastSources = sourcesOk;
      provider.lastErrors = errors;
      provider.lastAutoscout = autoscoutMeta;
      provider.lastPrices = pricesKey;
      const fetched = normalizeListings(raw);
      if (fetched.length < 3) throw new Error(c.refreshInvalid);
      const analysisCountries = (entry.filters.countries || []).filter(Boolean);
      const countryBound = (listing) => ["mobile", "autoscout"].includes(listingSource(listing));
      const inAnalysis = (listing) => !countryBound(listing) || !analysisCountries.length || !listing.country || analysisCountries.includes(listing.country);
      const notes = { scope: monitoringScopeKey(scope, markets) };
      if (provider.lastAutoscout) notes.autoscout = provider.lastAutoscout;
      if (markets.includes("mobile")) notes.mobile = { countries: scope.countries };
      refreshMarketHistory();
      const current = marketHistory.find((item) => item.id === entry.id) || entry;
      measureNextSnapshot(provider.lastSources || markets, true, provider.lastPrices ?? null, {
        sources: provider.lastSources || markets,
        listings: fetched,
        notes,
      });
      let searchUrl = current.searchUrl;
      try {
        searchUrl = searchUrl || buildMobileDeSearchUrl({ ...blankFilters(), ...filters });
      } catch {
        searchUrl = searchUrl || "";
      }
      updateMarketSnapshot(entry.id, filters, mergeBySource(current.listings, fetched.filter(inAnalysis)), "API", searchUrl || "-");
      ok = true;
      const missing = markets.filter((source) => !(provider.lastSources || []).includes(source));
      if (missing.length && monitoringState.id === entry.id) {
        // A portal that answered "no such model" is said so; others did not answer.
        const reasons = missing.map((source) => (/model not found/i.test(provider.lastErrors?.[source] || "") ? monitoringErrorText(provider.lastErrors[source], source) : "")).filter(Boolean);
        const silent = missing.filter((source) => !/model not found/i.test(provider.lastErrors?.[source] || ""));
        Object.assign(monitoringState, {
          status: [...reasons, silent.length ? c.monitoringMissing.replace("{portals}", silent.map(portalName).join(", ")) : ""].filter(Boolean).join(" "),
          statusError: true,
        });
      }
    } catch (error) {
      if (monitoringState.id === entry.id) Object.assign(monitoringState, { status: monitoringErrorText(error), statusError: true });
    } finally {
      monitoringState.busy = "";
      Object.keys(monitoringProgress).forEach((key) => delete monitoringProgress[key]);
      if (currentPage() === "history") renderPriceHistoryPage();
    }
    if (queuedCheck) {
      const next = queuedCheck;
      queuedCheck = null;
      runMonitoringCheck(next.entry, next.markets);
    }
    return ok;
  }

  // Monitored favourites are checked once a day by themselves while the
  // program is open (until the automation server runs them, B5).
  async function runDueMonitoring() {
    const nine = todayAtNine().getTime();
    if (Date.now() < nine) return;
    refreshMarketHistory();
    for (const entry of marketHistory.filter((item) => item.pinned && item.autoRefresh?.enabled)) {
      if (monitoringState.busy) return;
      const byDate = await loadCheckOffers(entry.id);
      const doneToday = [...byDate.values()].some((record) => record.scope && Date.parse(record.at) >= nine);
      if (doneToday) continue;
      const markets = (entry.filters.markets || []).filter((source) => MARKET_SOURCES.includes(source));
      await runMonitoringCheck(entry, markets.length ? markets : MARKET_SOURCES.filter((source) => chartSources[source]));
    }
  }
  setTimeout(runDueMonitoring, 5000);
  // The converter shows Walutomat's live rate once it has arrived.
  window.AUTOGOOD_TURNKEY?.calculatorRate?.().then(() => {
    const out = document.querySelector("[data-monitoring-convert-out]");
    if (out && currentPage() === "history" && !document.activeElement?.closest?.("[data-mobile-price-history-page]")) renderPriceHistoryPage();
  }).catch(() => {});
  // Looked at every 5 minutes, so 9:00 is met while the program is open.
  setInterval(runDueMonitoring, 5 * 60 * 1000);

  // Scheduled checks are a setting of the favourite, stored with it (the
  // stored history is re-read first, see 4.6.1 in docs/PROJECT-MOBILE.md).
  function setAutoRefresh(historyId, autoRefresh) {
    refreshMarketHistory();
    if (!marketHistory.some((item) => item.id === historyId)) return;
    if (!storeMarketHistory(marketHistory.map((item) => (item.id === historyId ? { ...item, autoRefresh } : item)))) return;
    renderPriceHistoryPage();
  }

  priceHistoryPage?.addEventListener("input", (event) => {
    const amount = event.target.closest("[data-monitoring-convert-amount]");
    if (!amount) return;
    converterState.amount = amount.value;
    const out = priceHistoryPage.querySelector("[data-monitoring-convert-out]");
    if (out) out.innerHTML = converterOutputHtml();
  });

  priceHistoryPage?.addEventListener("toggle", (event) => {
    if (!event.target.matches?.("[data-monitoring-settings]")) return;
    monitoringPrefs.settingsOpen = event.target.open;
    saveMonitoringPrefs();
  }, true);

  priceHistoryPage?.addEventListener("change", (event) => {
    const sort = event.target.closest("[data-monitoring-sort]");
    if (sort) {
      monitoringPrefs.sort = sort.value;
      // Newest first and the youngest first read naturally; price and
      // mileage from the lowest.
      monitoringPrefs.dir = sort.value === "listed" || sort.value === "year" ? "desc" : "asc";
      saveMonitoringPrefs();
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const only = event.target.closest("[data-monitoring-only]");
    if (only) {
      monitoringPrefs[only.dataset.monitoringOnly] = only.checked;
      saveMonitoringPrefs();
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const monitoringSwitch = event.target.closest("[data-monitoring-switch]");
    if (monitoringSwitch) {
      setAutoRefresh(monitoringSwitch.dataset.monitoringSwitch, monitoringSwitch.checked ? { enabled: true, every: "daily" } : null);
      if (monitoringSwitch.checked) runDueMonitoring();
      return;
    }
    const price = event.target.closest("[data-monitoring-price]");
    if (price && priceHistoryId) {
      window.AUTOGOOD_FAVORITES_WATCH?.setPortalPrice?.(priceHistoryId, price.dataset.monitoringPrice, price.dataset.side, price.value);
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    const currency = event.target.closest("[data-monitoring-convert-currency]");
    if (currency) {
      converterState.currency = currency.value;
      const out = priceHistoryPage.querySelector("[data-monitoring-convert-out]");
      if (out) out.innerHTML = converterOutputHtml();
      return;
    }
    const compare = event.target.closest("[data-offer-compare]");
    if (compare) {
      offerHistoryState.compareAt = compare.value;
      redrawOfferHistory();
      return;
    }
  });

  priceHistoryPage?.addEventListener("click", (event) => {
    if (event.target.closest("[data-monitoring-sort-dir]")) {
      monitoringPrefs.dir = monitoringPrefs.dir === "desc" ? "asc" : "desc";
      saveMonitoringPrefs();
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const pdf = event.target.closest("[data-monitoring-pdf]");
    if (pdf) {
      downloadClientPdf(pdf);
      return;
    }
    const check = event.target.closest("[data-monitoring-check]");
    if (check) {
      const entry = marketHistory.find((item) => item.id === check.dataset.monitoringCheck);
      if (entry) runMonitoringCheck(entry);
      return;
    }
    const market = event.target.closest("[data-monitoring-market]");
    if (market) {
      const source = market.dataset.monitoringMarket;
      const next = { ...chartSources, [source]: !chartSources[source] };
      if (!MARKET_SOURCES.some((item) => next[item])) return;
      setChartSources(next);
      renderHistory();
      updateHistoryConfirm();
      updateSelectedFiltersSummary?.();
      renderPriceHistoryPage();
      return;
    }
    const country = event.target.closest("[data-monitoring-country]");
    if (country && priceHistoryId) {
      const code = country.dataset.monitoringCountry;
      const current = monitoringScopeOf(priceHistoryId).countries;
      const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
      if (next.length) setMonitoringScope(priceHistoryId, { countries: next });
      Object.assign(monitoringState, { status: copy().monitoringPriceChanged, statusError: false });
      renderPriceHistoryPage();
      return;
    }
    const portal = event.target.closest("[data-monitoring-portal]");
    if (portal) {
      monitoringState.portal = monitoringState.portal === portal.dataset.monitoringPortal ? "" : portal.dataset.monitoringPortal;
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const save = event.target.closest("[data-monitoring-save]");
    if (save && priceHistoryId) {
      const row = rowsForDetails.get(save.dataset.monitoringSave);
      if (row) toggleSavedCar(priceHistoryId, row.source, row.offer);
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const detailsButton = event.target.closest("[data-monitoring-details]");
    if (detailsButton) {
      const key = detailsButton.dataset.monitoringDetails;
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (openDetails.has(key)) openDetails.delete(key);
      else {
        openDetails.add(key);
        const row = rowsForDetails.get(key);
        if (row && !offerDetails.has(key)) loadOfferDetails(row.source, row.offer).then(() => entry && fillMonitoringResults(entry));
      }
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const more = event.target.closest("[data-monitoring-more]");
    if (more) {
      const key = more.dataset.monitoringMore;
      if (allOptionsShown.has(key)) allOptionsShown.delete(key);
      else allOptionsShown.add(key);
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    const view = event.target.closest("[data-monitoring-view]");
    if (view) {
      monitoringState.view = view.dataset.monitoringView;
      const entry = marketHistory.find((item) => item.id === priceHistoryId);
      if (entry) fillMonitoringResults(entry);
      return;
    }
    if (event.target.closest("[data-monitoring-extended]")) {
      monitoringExtended = !monitoringExtended;
      try {
        localStorage.setItem("autogood.mobile.monitoringExtended", monitoringExtended ? "1" : "0");
      } catch {
        // Remembered for this page only.
      }
      renderPriceHistoryPage();
      return;
    }
    // The search, in one line: edited on page 1.
    if (event.target.closest("[data-monitoring-edit]")) {
      showPage("search");
      return;
    }
    const date = event.target.closest("[data-offer-date]");
    if (date) {
      // A date in the history tables or the strip: the market of that day.
      offerHistoryState.at = date.dataset.offerDate;
      // Compared again with the check just before it.
      offerHistoryState.compareAt = null;
      redrawOfferHistory(Boolean(date.closest("table")));
      return;
    }
    const filter = event.target.closest("[data-offer-filter]");
    if (filter) {
      offerHistoryState.filter = filter.dataset.offerFilter;
      redrawOfferHistory();
      return;
    }
    const open = event.target.closest("[data-price-history-open]");
    if (open) {
      openFavorite(open.dataset.priceHistoryOpen);
      return;
    }
    const refresh = event.target.closest("[data-price-history-refresh]");
    if (refresh) {
      // Fresh prices = a new check in this history (the analysis opens).
      const entry = marketHistory.find((item) => item.id === refresh.dataset.priceHistoryRefresh);
      if (!entry) return;
      if (entry.listings.length >= 3) {
        openHistoryAnalysis(entry.id);
        refreshActiveAnalysis();
      } else {
        openFavorite(entry.id);
      }
    }
  });

  // While the offers load: the analysis page with its cards drawn empty, and
  // the progress in its status line.
  function renderLoadingPage(filters) {
    const c = copy();
    const title = [filters.brand, filters.model, filters.version].filter(Boolean).join(" ");
    const skeletonCard = (icon, heading, lines) => `
      <section class="mobileMarketCard isLoading" aria-hidden="true">
        ${blockTitle(icon, heading)}
        ${Array.from({ length: lines }, (_, index) => `<span class="mobileMarketSkeleton" style="--w:${[92, 78, 64, 85][index % 4]}%"></span>`).join("")}
      </section>`;
    analysisContent.innerHTML = `
      <article class="mobileMarketAnalysisPanel" aria-busy="true">
        <section class="mobileMarketCard">
          <h2 class="agBlockTitle">${escapeMarketHtml(title)}</h2>
          <p class="mobileMarketLoadingHeading">${escapeMarketHtml(c.loadingHeading)}</p>
          ${analysisStatusHtml()}
        </section>
        ${skeletonCard("percent", c.statsHeading, 2)}
        ${skeletonCard("gauge", c.distributionHeading, 6)}
      </article>`;
    setManualViewHidden(true);
    analysisView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // "Analiza rynku" without a car chosen: the favourites to pick from.
  function renderFavoritesPage() {
    const c = copy();
    activeAnalysis = null;
    analysisContent.innerHTML = `
      <article class="mobileMarketAnalysisPanel">
        <header class="mobileMarketAnalysisHead">
          <div>
            <h1>${escapeMarketHtml(c.heading)}</h1>
            <p>${escapeMarketHtml(c.favoritesPick)}</p>
          </div>
        </header>
      </article>`;
    setManualViewHidden(true);
    analysisView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openFavorite(historyId) {
    const entry = marketHistory.find((item) => item.id === historyId);
    if (!entry) return;
    if (entry.listings.length >= 3) {
      openHistoryAnalysis(historyId);
      return;
    }
    // No prices saved yet: fetch them for this car's filters.
    restoreManualFilters(entry.filters);
    openAnalysis();
  }

  const BRAND_MARKS = {
    mobile: "./assets/brands/mobile-de-mark.svg",
    otomoto: "./assets/brands/otomoto-mark.svg",
    blocket: "./assets/brands/blocket-mark.svg",
    avby: "./assets/brands/avby-mark.svg",
    autoscout: "./assets/brands/autoscout24-mark.svg",
  };
  const BRAND_LOGOS = {
    mobile: "./assets/brands/mobile-de-logo.svg",
    otomoto: "./assets/brands/otomoto-logo.svg",
    blocket: "./assets/brands/blocket-logo.svg",
    avby: "./assets/brands/avby-logo.svg",
    autoscout: "./assets/brands/autoscout24-logo.svg",
  };

  // The marketplace's small mark as the link to one of its offers.
  function brandMarkLink(source, url, label) {
    return `<a class="agBrandMarkLink" href="${escapeMarketHtml(url)}" target="_blank" rel="noopener" title="${escapeMarketHtml(label)}" aria-label="${escapeMarketHtml(label)}"><img src="${BRAND_MARKS[source] || BRAND_MARKS.mobile}" alt="" /></a>`;
  }

  // The searched market in the same four columns as a recognised car:
  // body and engine, mileage and drive, equipment, other information.
  function searchSpecRange(from, to, unit = "", plain = false) {
    const t = window.AUTOGOOD_SPEC_COPY?.() || {};
    const numbers = numberFormat();
    const any = t.specAny || "—";
    const format = (value) => {
      const raw = String(value).trim();
      if (plain) return raw;
      const amount = Number(raw.replace(/\s/g, "").replace(/\+$/, ""));
      return Number.isFinite(amount) ? `${numbers.format(amount)}${raw.endsWith("+") ? "+" : ""}` : raw;
    };
    const suffix = unit ? ` ${unit}` : "";
    if (from && to) return from === to ? `${format(from)}${suffix}` : `${format(from)} – ${format(to)}${suffix}`;
    if (from) return `${t.specFrom} ${format(from)}${suffix}`;
    if (to) return `${t.specTo} ${format(to)}${suffix}`;
    return any;
  }

  function searchSpecColumns(filters, sources) {
    const t = window.AUTOGOOD_SPEC_COPY?.() || {};
    const any = t.specAny || "—";
    const range = searchSpecRange;
    const labelOf = (selector) => document.querySelector(selector)?.closest("label")?.textContent.trim();
    const fuels = checkedLabels("[data-mobile-fuel]");
    const equipment = [
      ...checkedLabels("[data-mobile-interior-material]"),
      filters.airConditioning ? checkedLabel("[data-mobile-air-conditioning]") : "",
      ...checkedLabels("[data-mobile-parking-sensor]"),
      filters.cruiseControl && filters.cruiseControl !== "any" ? checkedLabel("[data-mobile-cruise-control]") : "",
      filters.trailerCoupling && filters.trailerCoupling !== "any" ? checkedLabel("[data-mobile-trailer-coupling]") : "",
      ...checkedLabels("[data-mobile-feature]"),
      ...checkedLabels("[data-mobile-exterior-color]"),
      filters.metallic ? labelOf("[data-mobile-metallic]") : "",
      filters.matte ? labelOf("[data-mobile-matte]") : "",
      ...checkedLabels("[data-mobile-interior-color]").map((label) => `${t.interiorColorLabel || ""}: ${label}`),
    ].filter(Boolean);
    // Each marketplace searches its own countries: say which is which, so
    // "Polska" next to a Germany-only filter does not read as a mistake.
    const mobileCountries = checkedLabels("[data-mobile-country]");
    const countries = [
      // The "Kraj" filter covers mobile.de and AutoScout24 alike.
      ...((sources.includes("mobile") || sources.includes("autoscout")) && mobileCountries.length
        ? [`${mobileCountries.join(", ")} (${["mobile", "autoscout"].filter((source) => sources.includes(source)).map(portalName).join(", ")})`] : []),
      ...(sources.includes("otomoto") ? [`${t.countryNames?.PL || "Polska"} (otomoto.pl)`] : []),
      ...(sources.includes("blocket") ? [`${copy().marketBlocket} (blocket.se)`] : []),
      ...(sources.includes("avby") ? [`${copy().marketAvby} (av.by)`] : []),
    ];
    const status = [
      filters.roadworthy ? labelOf("[data-mobile-roadworthy]") : "",
      filters.nonSmoking ? labelOf("[data-mobile-non-smoking]") : "",
      filters.newUsed ? selectedOptionText("[data-mobile-new-used]") : "",
      filters.warranty ? labelOf("[data-mobile-warranty]") : "",
      filters.serviceHistory ? labelOf("[data-mobile-service-history]") : "",
      filters.accidentFree ? labelOf("[data-mobile-accident-free]") : "",
      filters.firstOwner ? labelOf("[data-mobile-first-owner]") : "",
      filters.damagedVehicles === "show" ? labelOf("[data-mobile-damaged-check]") : "",
    ].filter(Boolean);
    return [
      { heading: t.specEngineHeading, rows: [
        [t.specBody, filters.body ? checkedLabel("[data-mobile-body-choice]") || any : any, "car"],
        [t.specEngineType, fuels.length ? fuels.join(", ") : any, "fuel"],
        [t.specDisplacement, range(filters.displacementFrom, filters.displacementTo, "ccm"), "settings"],
        [t.specPower, range(filters.powerFrom, filters.powerTo, "KM"), "zap"],
      ] },
      { heading: t.specUsageHeading, rows: [
        [t.specMileage, range(filters.mileageFrom, filters.mileageTo, kmUnit()), "gauge"],
        [t.specRegistration, range(filters.yearFrom, filters.yearTo, "", true), "calendar"],
        [t.specGearbox, filters.gearbox && filters.gearbox !== "any" ? checkedLabel("[data-mobile-gearbox]") : any, "git-branch"],
        [t.specDrive, filters.drive && filters.drive !== "any" ? checkedLabel("[data-mobile-drive]") : any, "route"],
      ] },
      { heading: t.specEquipmentHeading, text: equipment.length ? equipment.join(" - ") : t.specNoEquipment, muted: !equipment.length },
      { heading: t.specOtherHeading, rows: [
        [t.specCountry, countries.length ? countries.join(", ") : any, "map-pin"],
        [t.specStatus, status.length ? status.join(", ") : any, "check"],
        [t.specVat, selectedOptionText("[data-mobile-vat]") || any, "percent"],
        [t.specSeller, selectedOptionText("[data-mobile-seller]") || any, "store"],
      ] },
    ];
  }

  // Offers that are not a price for a working car: damaged or for parts,
  // leasing take-overs and instalments, or priced far off the rest. They stay
  // on the chart but not in the statistics. Words like "bezwypadkowy",
  // "unfallfrei" or "możliwy leasing" (financing offered) do not count.
  const SUSPECT_WORDS = new RegExp([
    "(?<!nie)uszkodz", "na cz[eę][sś]ci", "do naprawy", "(?<!bez)wypadk", "powypadk", "rozbit", "zatart", "zalan", "spalon",
    "bez silnika", "silnik do (?:remontu|wymiany|naprawy)", "skrzynia do", "cesj", "odst[eę]pne", "przej[eę]cie (?:leasingu|najmu|umowy)", "wynajem d[lł]ugoterminowy", "abonament",
    "motorschaden", "getriebeschaden", "unfall(?!frei)", "defekt", "bastler", "ersatzteil", "teiletr[aä]ger", "leasing[uü]bernahme",
    "damaged", "for parts", "engine failure",
    "motorfel", "motorhaveri", "v[aä]xell[aå]dsfel", "krockskad", "(?<!o)skadad", "reservdel", "renoveringsobjekt", "ej k[oö]rbar", "startar inte", "trasig",
    "leasings?[oö]verl[aå]t", "[oö]verta leasing",
  ].join("|"), "i");

  // ---- Comparing markets for the client ---------------------------------
  // A conclusion needs this many offers on each market; "the same car" needs
  // SAME_CAR_MIN (a fit of price on year and mileage per market).
  const COMPARE_MIN = 8;
  const SAME_CAR_MIN = 20;

  // Mean mileage of offers that state one (arithmetic mean, owner 2026-10-03).
  function meanMileage(list) {
    const values = list.map((listing) => Number(listing.mileage)).filter((value) => value > 0 && value < 1500000);
    return values.length ? { mean: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), count: values.length } : null;
  }

  // Least squares (normal equations, Gauss with pivoting); null if singular.
  function leastSquares(rows, targets) {
    const size = rows[0].length;
    const matrix = Array.from({ length: size }, () => Array(size + 1).fill(0));
    rows.forEach((row, index) => {
      for (let i = 0; i < size; i += 1) {
        matrix[i][size] += row[i] * targets[index];
        for (let j = 0; j < size; j += 1) matrix[i][j] += row[i] * row[j];
      }
    });
    for (let column = 0; column < size; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < size; row += 1) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
      if (Math.abs(matrix[pivot][column]) < 1e-9) return null;
      [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
      for (let row = 0; row < size; row += 1) {
        if (row === column) continue;
        const factor = matrix[row][column] / matrix[column][column];
        for (let j = column; j <= size; j += 1) matrix[row][j] -= factor * matrix[column][j];
      }
    }
    return matrix.map((row, index) => row[size] / row[index]);
  }

  // "The same car" on two markets: on each market ln(price) is fitted on the
  // year and the mileage, then both are priced for one reference car (the
  // median year and mileage of both markets together). Null when a market
  // has too few offers, the reference lies outside its offers, or the fit
  // makes no sense (a newer car cheaper, more kilometres dearer).
  function sameCarPrices(markets) {
    const usable = markets.map((list) => list
      .map((listing) => ({ year: Number(listing.year), km: Number(listing.mileage), price: Number(listing.price) }))
      .filter((point) => point.year > 1980 && point.km > 0 && point.km < 1500000 && point.price > 0));
    if (usable.some((points) => points.length < SAME_CAR_MIN)) return null;
    const middle = (values) => percentile([...values].sort((left, right) => left - right), 0.5);
    const all = usable.flat();
    const year = Math.round(middle(all.map((point) => point.year)));
    const km = Math.round(middle(all.map((point) => point.km)) / 1000) * 1000;
    const prices = [];
    for (const points of usable) {
      const years = points.map((point) => point.year);
      const kms = points.map((point) => point.km);
      if (year < Math.min(...years) || year > Math.max(...years) || km < Math.min(...kms) || km > Math.max(...kms)) return null;
      const withYear = new Set(years).size > 1;
      const withKm = Math.max(...kms) - Math.min(...kms) >= 10000;
      const rows = points.map((point) => [1, ...(withYear ? [point.year - year] : []), ...(withKm ? [(point.km - km) / 100000] : [])]);
      const fit = leastSquares(rows, points.map((point) => Math.log(point.price)));
      if (!fit) return null;
      if (withYear && fit[1] < 0) return null;
      if (withKm && fit[fit.length - 1] > 0) return null;
      prices.push(Math.round(Math.exp(fit[0]) / 100) * 100);
    }
    return { year, km, prices };
  }

  // Otomoto alone: how many ads have their history confirmed in CEPiK and
  // how many cars were imported (stated country of origin other than Poland).
  function polishMarketShares(list) {
    const checked = list.filter((listing) => listing.cepik === "1" || listing.cepik === "0");
    const stated = list.filter((listing) => listing.origin);
    const imported = stated.filter((listing) => listing.origin !== "pl");
    const counts = {};
    imported.forEach((listing) => {
      if (listing.origin !== "others") counts[listing.origin] = (counts[listing.origin] || 0) + 1;
    });
    const top = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] || null;
    // Counted on the whole search (not the sample): declared accident-free,
    // declared after an accident, nothing stated.
    const counted = list.find((listing) => Number.isFinite(listing.noAccident) && listing.marketTotal >= COMPARE_MIN);
    return {
      accident: counted && counted.noAccident + counted.afterAccident <= counted.marketTotal
        ? { count: counted.noAccident, after: counted.afterAccident, total: counted.marketTotal }
        : null,
      cepik: checked.length >= COMPARE_MIN ? { count: checked.filter((listing) => listing.cepik === "1").length, total: checked.length } : null,
      imported: stated.length >= COMPARE_MIN ? { count: imported.length, total: stated.length, top: top ? top[0] : "" } : null,
    };
  }

  function suspectOffers(listings, valueOf) {
    const medianOf = (items) => (items.length >= 5 ? percentile(items.map(valueOf).sort((left, right) => left - right), 0.5) : 0);
    const overall = medianOf(listings);
    // A price is judged against cars of about the same age: a 2008 car at
    // a third of a 2020 car's price is a real price, not a mistake.
    const medianByYear = new Map();
    const peerMedian = (year) => {
      if (!year) return overall;
      if (!medianByYear.has(year)) {
        const peers = listings.filter((item) => item.year && Math.abs(item.year - year) <= 1);
        medianByYear.set(year, peers.length >= 5 ? medianOf(peers) : overall);
      }
      return medianByYear.get(year);
    };
    return new Set(listings.filter((listing) => {
      if (SUSPECT_WORDS.test(`${listing.title || ""} ${listing.subtitle || ""}`)) return true;
      const price = valueOf(listing);
      const median = peerMedian(Number(listing.year) || 0);
      return median > 0 && (price < median / 3 || price > median * 3);
    }));
  }

  // Card heading with the filter page's icon (left out of the client report).
  function blockTitle(icon, text) {
    return `<h2 class="agBlockTitle mobileMarketBlockTitle"><svg class="mobileFieldIcon" aria-hidden="true" data-report-hide><use href="./src/mobile-icons.svg#${icon}"></use></svg><span>${escapeMarketHtml(text)}</span></h2>`;
  }

  // ---- Belarus: mobile.de "pod klucz" in Minsk (turnkey-belarus.js) -----------
  // Engine size: the ad's own (mobile-ad-details.js), else the form's range or
  // the recognised car of the same model.
  function byFilterCcm(filters) {
    const from = Number(filters?.displacementFrom) || 0;
    const to = Number(filters?.displacementTo) || 0;
    if (from && to) return Math.round((from + to) / 2);
    const car = typeof state !== "undefined" ? state.data : null;
    if (car?.displacementCcm && normalizeToken(car.matchedFilters?.model || "") === normalizeToken(filters?.model || "")) return Number(car.displacementCcm);
    return null;
  }

  function turnkeyByFor(listing, filters) {
    const details = window.AUTOGOOD_AD_DETAILS?.get(listing.id) || null;
    const registered = String(details?.reg || listing.firstRegistration || "").match(/(\d{1,2})\/(\d{4})/);
    return window.AUTOGOOD_TURNKEY_BY.calc({
      priceEur: convertPrice(listing.originalPrice, listing.originalCurrency || "EUR", "EUR"),
      netEur: details?.net || listing.netPrice || null,
      ccm: details?.ccm || Number(listing.displacementCcm) || byFilterCcm(filters),
      year: registered ? Number(registered[2]) : listing.year,
      month: registered ? Number(registered[1]) : 0,
      electric: /electr|elektr/i.test(`${details?.fuel || ""} ${listing.fuel || ""}`),
    });
  }

  // Engine sizes for the excise (Poland): mobile.de ads whose result card has
  // none are read one by one; each id once per page, so an unreachable
  // importer is not asked again and again.
  const ccmTried = new Set();
  let ccmProgress = null;
  function startCcmDetails(ids) {
    const details = window.AUTOGOOD_AD_DETAILS;
    if (!details || details.isRunning() || !ids.length) return;
    ids.forEach((id) => ccmTried.add(id));
    const analysis = activeAnalysis;
    // The progress line shows at once (each id is tried once, so no loop).
    ccmProgress = { done: 0, total: ids.length };
    renderAnalysis();
    details.enrich(ids, {
      keepGoing: () => activeAnalysis === analysis,
      onProgress: (done, total) => {
        ccmProgress = done < total ? { done, total } : null;
        if (activeAnalysis !== analysis) return;
        if (done === total || done % 10 === 0) renderAnalysis();
        else document.querySelectorAll("[data-ccm-progress]").forEach((node) => {
          node.textContent = copy().ccmProgress.replace("{done}", String(done)).replace("{total}", String(total));
        });
      },
    }).then(() => {
      ccmProgress = null;
      if (activeAnalysis === analysis) renderAnalysis();
    });
  }

  let byProgress = null;
  // Reads the shown mobile.de ads one by one; the chart fills in as they come.
  function startByDetails(ids) {
    const details = window.AUTOGOOD_AD_DETAILS;
    if (!details || details.isRunning() || !ids.length) return;
    const analysis = activeAnalysis;
    details.enrich(ids, {
      keepGoing: () => activeAnalysis === analysis,
      onProgress: (done, total) => {
        byProgress = done < total ? { done, total } : null;
        if (activeAnalysis !== analysis) return;
        if (done === total || done % 10 === 0) renderAnalysis();
        else document.querySelectorAll("[data-by-progress]").forEach((node) => {
          node.textContent = copy().byDetailsProgress.replace("{done}", String(done)).replace("{total}", String(total));
        });
      },
    }).then(() => {
      byProgress = null;
      if (activeAnalysis === analysis) renderAnalysis();
    });
  }

  function renderAnalysis() {
    renderAnalysisContent();
    renderFavoritesBar();
  }

  function renderAnalysisContent() {
    if (!activeAnalysis) return;
    const c = copy();
    const { filters, listings, searchUrl, providerId, sourceFileName } = activeAnalysis;
    const historyEntry = marketHistory.find((entry) => entry.id === activeAnalysis.historyId) || null;
    const comparePriceEur = Number(String(activeAnalysis.comparePrice || "").replace(/[^\d]/g, "")) || 0;
    let otomotoUrl = "";
    try {
      otomotoUrl = buildOtomotoSearchUrl(filters);
    } catch {
      // Otomoto has no twin for this vehicle; its link is simply left out.
    }
    let blocketUrl = "";
    try {
      blocketUrl = window.AUTOGOOD_BLOCKET?.buildSearchUrl(filters) || "";
    } catch {
      // Same for Blocket.
    }
    let avbyUrl = "";
    try {
      avbyUrl = window.AUTOGOOD_AVBY?.buildSearchUrl(filters) || "";
    } catch {
      // Same for av.by.
    }
    let autoscoutUrl = "";
    try {
      autoscoutUrl = window.AUTOGOOD_AUTOSCOUT?.buildSearchUrl(filters, { countries: (filters.countries || []).length ? filters.countries : ["DE"] }) || "";
    } catch {
      // Same for AutoScout24.
    }
    const stored = providerId === "import" || providerId === "history";
    // Every valid offer remains in the sample, including unusually priced ones.
    const bySource = Object.fromEntries(MARKET_SOURCES.map((source) => [source, []]));
    listings.forEach((listing) => bySource[listingSource(listing)].push(listing));
    const inPlnForChecks = (listing) => priceInPln(listing.price, listing.currency || "EUR");
    const cleaned = {};
    const suspects = {};
    MARKET_SOURCES.forEach((source) => {
      const flagged = suspectOffers(bySource[source], inPlnForChecks);
      cleaned[source] = bySource[source].filter((listing) => !flagged.has(listing));
      suspects[source] = bySource[source].filter((listing) => flagged.has(listing));
    });
    const availableSources = MARKET_SOURCES.filter((source) => cleaned[source].length);
    const pickedSources = availableSources.filter((source) => chartSources[source]);
    const shownSources = pickedSources;
    // One chart, one currency: a marketplace alone in its own currency,
    // several together in PLN (the client pays in Poland).
    // Always PLN: Polish offers at their price, foreign ones "na gotowo"
    // (what the client pays in Poland), so the dots compare like for like.
    displayCurrency = "PLN";
    // Belarus: with av.by and mobile.de together, mobile.de "pod klucz" in
    // Minsk against av.by, everything in USD at the NBRB rate.
    const byTurnkey = window.AUTOGOOD_TURNKEY_BY;
    const byMode = Boolean(byTurnkey) && shownSources.includes("avby") && (shownSources.includes("mobile") || shownSources.includes("autoscout"));
    if (byMode) displayCurrency = "USD";
    const turnkeyCurrency = byMode ? "USD" : "PLN";
    const turnkeySources = byMode ? ["mobile", "autoscout"] : TURNKEY_SOURCES;
    const turnkeyLabel = byMode ? c.turnkeyShortBy : c.turnkeyShort;
    const rate = exchangeRate() || EUR_PLN_FALLBACK_RATE;
    const inDisplayCurrency = (listing) => (byMode && listingSource(listing) === "avby" && Number(listing.priceByn) > 0
      ? byTurnkey.convert(Number(listing.priceByn), "BYN", "USD")
      : convertPrice(listing.price, listing.currency || "EUR", displayCurrency));
    const marketListings = shownSources.flatMap((source) => cleaned[source]).map((listing) => ({
      ...listing,
      source: listingSource(listing),
      originalPrice: listing.price,
      originalCurrency: listing.currency,
      price: Math.round(inDisplayCurrency(listing)),
    }));
    const suspectListings = shownSources.flatMap((source) => suspects[source]).map((listing) => ({
      ...listing,
      source: listingSource(listing),
      originalPrice: listing.price,
      originalCurrency: listing.currency,
      price: Math.round(inDisplayCurrency(listing)),
      suspect: true,
    }));
    // "~ pod klucz" of every foreign offer: calculator formula, average
    // transport and inspection, excise by the offer's engine (turnkey-estimate.js).
    const turnkey = window.AUTOGOOD_TURNKEY;
    const rates = turnkey?.currentRates?.() || { eur: exchangeRate() || EUR_PLN_FALLBACK_RATE, sek: sekPlnRate() };
    const byMissing = new Set();
    const bySavings = [];
    [...marketListings, ...suspectListings].forEach((listing) => {
      if (byMode) {
        if (listing.source !== "mobile" && listing.source !== "autoscout") return;
        const result = turnkeyByFor(listing, filters);
        if (!result) {
          byMissing.add(listing);
          return;
        }
        // "turnkeyPln" holds the turnkey price in turnkeyCurrency (USD here).
        listing.turnkeyPln = result.totalUsd;
        listing.turnkeyBase = result.base;
        listing.byPrices = result;
        bySavings.push(result.benefitSavingUsd);
        listing.bruttoPln = listing.price;
        listing.price = Math.round(result.totalUsd);
        return;
      }
      if (!TURNKEY_SOURCES.includes(listing.source) || !turnkey) return;
      const input = turnkeyInput(listing, listing.originalPrice, listing.originalCurrency || SOURCE_CURRENCY[listing.source]);
      listing.turnkeyPln = turnkey.turnkeyAverage(input, filters, rates).total;
      // Where the engine size of the excise came from (ad, name, filters, unknown).
      listing.engine = turnkey.engineInfo?.(input, filters) || null;
      // The dot, the statistics of the chart and the table use this price.
      listing.bruttoPln = listing.price;
      listing.price = Math.round(listing.turnkeyPln);
    });
    // mobile.de offers whose engine size is not known yet stay off the chart
    // until their ad is read (startByDetails).
    [marketListings, suspectListings].forEach((list) => {
      for (let index = list.length - 1; index >= 0; index -= 1) if (byMissing.has(list[index])) list.splice(index, 1);
    });
    if (byMode) {
      // The importer passes engine size and first registration from the result
      // list; only offers without them (an older importer) are read one by one.
      const unread = listings.filter((listing) => listingSource(listing) === "mobile"
        && !(Number(listing.displacementCcm) && /\d{1,2}\/\d{4}/.test(listing.firstRegistration || ""))
        && !window.AUTOGOOD_AD_DETAILS?.get(listing.id));
      setTimeout(() => startByDetails(unread.map((listing) => listing.id)), 0);
    }
    // Excise without the engine size: mobile.de ads are read one by one and
    // the chart fills in; the rest are counted as up to 2000 cm³ (footnote).
    const unknownEngine = byMode ? [] : marketListings.filter((listing) => listing.engine?.source === "unknown");
    const engineToRead = unknownEngine.filter((listing) => listing.source === "mobile" && !ccmTried.has(String(listing.id)));
    if (engineToRead.length) setTimeout(() => startCcmDetails(engineToRead.map((listing) => String(listing.id))), 0);
    const bySaving = bySavings.length ? percentile([...bySavings].sort((left, right) => left - right), 0.5) : 0;
    // Belarus: three prices with every German offer — the car (net or gross),
    // the car in Minsk, and turnkey with customs clearance.
    const byBaseLabel = (base) => (base === "netto" ? c.byNet : base === "brutto" ? c.byGross : c.byNetGross);
    const capital = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1);
    const byPriceLines = (prices) => `
      <span class="mobileMarketByPrices">
        <small>${escapeMarketHtml(c.byCarPrice)}: ${escapeMarketHtml(formatMarketPrice(prices.parts.carEur, "EUR"))} ${escapeMarketHtml(byBaseLabel(prices.base))} · ${escapeMarketHtml(formatMarketPrice(prices.carUsd, "USD"))}</small>
        <small>${escapeMarketHtml(capital(c.byDelivered))}*: ~ ${escapeMarketHtml(formatMarketPrice(prices.deliveredUsd, "USD"))}</small>
        <b>${escapeMarketHtml(capital(c.byTurnkey))}*: ~ ${escapeMarketHtml(formatMarketPrice(prices.totalUsd, "USD"))}</b>
      </span>`;
    const byRates = byMode ? byTurnkey.rates() : null;
    // A price as the marketplace shows it: PLN, EUR, or SEK with its EUR value.
    const nativePrice = (value, source) => {
      const currency = SOURCE_CURRENCY[source] || "EUR";
      const text = formatMarketPrice(value, currency);
      return currency === "SEK" || currency === "USD" ? `${text} · ${formatMarketPrice(convertPrice(value, currency, "EUR"), "EUR")}` : text;
    };
    const hasListings = marketListings.length >= 3;
    const onlyOtomoto = shownSources.length === 1 && shownSources[0] === "otomoto";
    const mixedSources = shownSources.length > 1;
    const summary = filterSummary(filters);
    const sourceName = (source) => (portalName(source));
    const listingKey = (listing) => listing.url || `${listing.source}-${listing.id}`;
    let statsContent = "";
    let offersContent = "";
    let summaryContent = "";
    let marketContent = `
      <section class="mobileMarketEmpty">
        <strong>${escapeMarketHtml(c.emptyHeading)}</strong>
        <p>${escapeMarketHtml(c.emptyDescription)}</p>
        ${chartSources.mobile ? `<button class="mobileMarketSourceButton isMobile isFetch" type="button" data-mobile-market-fetch-mobile><img class="agBrandMark" src="${BRAND_MARKS.mobile}" alt="" />${escapeMarketHtml(c.fetchMobile)}</button>` : ""}
      </section>`;

    // "Kopiuj raport" / "Raport PDF": above the axis switch with one chart,
    // on the right of the "Rozkład cen" title when markets are side by side.
    const reportActions = `
      <div class="mobileMarketReportActions" data-report-hide>
        <button class="mobileMarketImportClear isPrimary" type="button" data-mobile-market-screenshot>${escapeMarketHtml(c.screenshotButton)}</button>
        <button class="mobileMarketImportClear isPrimary" type="button" data-mobile-market-pdf>${escapeMarketHtml(c.pdfButton)}</button>
      </div>`;
    let reportActionsInTitle = false;
    if (hasListings) {
      const statistics = marketStatistics(marketListings);
      const domainMinimum = statistics.min;
      const domainMaximum = statistics.max;
      const sharedMinimum = domainMinimum;
      const sharedMaximum = domainMaximum;
      const scaleTicks = marketScaleTicks(domainMinimum, domainMaximum, statistics.step);
      const labelStep = marketTickLabelStep(domainMinimum, domainMaximum, statistics.step);
      const sharedTicks = scaleTicks;
      const sharedLabelStep = labelStep;
      const canJudge = statistics.count >= 8 && !filters.priceFrom && !filters.priceTo;
      const numbers = numberFormat();

      // Horizontal axis: rank in the price-sorted list (the offers laid out the
      // way the site sorts them), mileage or year.
      // Each offer sits at its share of its own marketplace's price-sorted list:
      // the true place when the site told us (Otomoto), otherwise its order
      // inside that marketplace's sample (imported files).
      const rankOf = new Map();
      shownSources.forEach((source) => {
        const own = marketListings.filter((listing) => listing.source === source)
          .sort((left, right) => left.price - right.price);
        own.forEach((listing, index) => rankOf.set(listing, listing.rank && listing.marketTotal > 1
          ? (listing.rank - 1) / (listing.marketTotal - 1)
          : index / Math.max(1, own.length - 1)));
      });
      const singleRankedSource = shownSources.length === 1
        && marketListings.every((listing) => listing.rank && listing.marketTotal > 1);
      const marketTotal = singleRankedSource ? Math.max(...marketListings.map((listing) => listing.marketTotal)) : 0;
      const axisValueOf = (listing) => {
        if (chartAxis === "mileage") return Number.isFinite(listing.mileage) && listing.mileage > 0 ? listing.mileage : null;
        if (chartAxis === "year") return Number.isFinite(listing.year) && listing.year > 0 ? listing.year : null;
        return rankOf.get(listing);
      };
      const axisValues = marketListings.map(axisValueOf).filter((value) => value !== null);
      const axisMin = chartAxis === "rank" ? 0 : (axisValues.length ? Math.min(...axisValues) : 0);
      const axisMax = chartAxis === "rank" ? 1 : (axisValues.length ? Math.max(...axisValues) : 1);
      const axisSpan = axisMax - axisMin;
      const xOf = (listing) => {
        const value = axisValueOf(listing);
        if (value === null) return null;
        let x = axisSpan ? (value - axisMin) / axisSpan : 0.5;
        // Offers of the same year would stack into one dot: spread them a little.
        if (chartAxis === "year") {
          const spread = axisSpan ? Math.min(0.35 / (axisSpan + 1), 0.05) : 0.2;
          x += (((seededNumber(`${listing.id}|${listing.price}`) % 1000) / 1000) - 0.5) * spread;
        }
        return Math.min(1, Math.max(0, x));
      };
      const plotted = marketListings
        .map((listing) => ({ listing, x: xOf(listing), y: verticalMarketPosition(listing.price, domainMinimum, domainMaximum) }))
        .filter((point) => point.x !== null);
      const hiddenByAxis = marketListings.length - plotted.length;

      const niceStep = (span, count) => {
        const rough = Math.max(1, span) / count;
        const magnitude = 10 ** Math.floor(Math.log10(rough));
        const normalized = rough / magnitude;
        return (normalized > 5 ? 10 : normalized > 2 ? 5 : normalized > 1 ? 2 : 1) * magnitude;
      };
      let xTicks = [];
      if (chartAxis === "rank") {
        // One marketplace: places in its list. Several: share of each list.
        xTicks = [0, 0.25, 0.5, 0.75, 1].map((x) => ({
          x,
          label: marketTotal
            ? (x === 0 ? `1 · ${c.axisRankStart}` : x === 1 ? `${numbers.format(marketTotal)} · ${c.axisRankEnd}` : numbers.format(Math.round(marketTotal * x)))
            : (x === 0 ? `0% · ${c.axisRankStart}` : x === 1 ? `100% · ${c.axisRankEnd}` : `${x * 100}%`),
        }));
      } else if (axisSpan) {
        const step = chartAxis === "year" ? Math.max(1, Math.ceil(axisSpan / 8)) : niceStep(axisSpan, 7);
        for (let value = Math.ceil(axisMin / step) * step; value <= axisMax; value += step) {
          xTicks.push({
            x: (value - axisMin) / axisSpan,
            label: chartAxis === "mileage" ? `${numbers.format(value)} ${kmUnit()}` : String(value),
          });
        }
      } else if (axisValues.length) {
        xTicks = [{ x: 0.5, label: chartAxis === "mileage" ? `${numbers.format(axisMin)} ${kmUnit()}` : String(axisMin) }];
      }

      // Median price along mileage or year: offers under the line are cheap
      // for what they are, not only cheap overall. On the list-place axis: each
      // market's price curve. Built for any set of dots (one chart per market).
      const buildTrend = (panelPlotted, panelSources, scale = null) => {
        const domainMinimum = scale ? scale.min : sharedMinimum;
        const domainMaximum = scale ? scale.max : sharedMaximum;
        if (chartAxis === "rank") {
          if (panelPlotted.length < 3) return { html: "", medians: [] };
          const curves = panelSources.map((source) => {
            const curve = panelPlotted.filter((point) => point.listing.source === source).sort((left, right) => left.x - right.x);
            return curve.length >= 2
              ? `<polyline class="is${sourceClass(source)}" points="${curve.map((point) => `${(point.x * 100).toFixed(2)},${point.y.toFixed(2)}`).join(" ")}" />`
              : "";
          }).join("");
          return { html: `<svg class="mobileMarketTrend isCurve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${curves}</svg>`, medians: [] };
        }
        if (panelPlotted.length < 6 || !axisSpan) return { html: "", medians: [] };
        const bins = new Map();
        panelPlotted.forEach((point) => {
          const value = axisValueOf(point.listing);
          const bin = chartAxis === "year" ? value : Math.min(7, Math.floor(((value - axisMin) / axisSpan) * 8));
          bins.set(bin, [...(bins.get(bin) || []), point]);
        });
        const trendPoints = [...bins.entries()]
          .filter(([, points]) => points.length >= 2)
          .sort(([left], [right]) => left - right)
          .map(([, points]) => {
            const prices = points.map((point) => point.listing.price).sort((left, right) => left - right);
            const xs = points.map((point) => axisValueOf(point.listing)).sort((left, right) => left - right);
            const value = percentile(xs, 0.5);
            const price = percentile(prices, 0.5);
            return {
              value,
              price,
              x: ((value - axisMin) / axisSpan) * 100,
              y: verticalMarketPosition(price, domainMinimum, domainMaximum),
            };
          });
        return {
          html: trendPoints.length >= 2
            ? `<svg class="mobileMarketTrend" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${trendPoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")}" /></svg>`
            : "",
          medians: trendPoints,
        };
      };
      const overallTrend = buildTrend(plotted, shownSources);
      const trendLine = overallTrend.html;
      let trendMedians = overallTrend.medians;

      // The table lists every offer on the chart, the left-out ones greyed.
      const sortedListings = [...marketListings, ...suspectListings].sort((left, right) => {
        const factor = tableSort.direction === "asc" ? 1 : -1;
        if (tableSort.key === "title") return String(left.title || "").localeCompare(String(right.title || ""), "pl") * factor;
        return ((Number(left[tableSort.key]) || 0) - (Number(right[tableSort.key]) || 0)) * factor;
      });

      const describe = (listing) => [
        listing.year ? String(listing.year) : "",
        listing.mileage ? `${numbers.format(listing.mileage)} ${kmUnit()}` : "",
        powerText(listing.power),
      ].filter(Boolean).join(" · ");
      // Placeholder names ("otomoto.pl", "blocket.se", "mobile.de · 03") say nothing.
      const fullTitle = (listing) => (/^(otomoto\.pl|blocket\.se|av\.by|mobile\.de · \d+)$/.test(listing.title || "") ? "" : listing.title || "");
      const renderPoint = ({ listing, x, y }) => {
          const tooltipClass = x > 0.72 ? " isTooltipLeft" : "";
          const details = describe(listing);
          const original = !listing.turnkeyPln && listing.originalCurrency !== displayCurrency
            ? formatMarketPrice(listing.originalPrice, listing.originalCurrency)
            : "";
          const title = fullTitle(listing);
          const label = `${title ? `${title}, ` : ""}${listing.subtitle ? `${listing.subtitle}, ` : ""}${formatMarketPrice(listing.price)}${details ? `, ${details}` : ""}, ${sourceName(listing.source)}.${listing.url ? ` ${c.pointHint}` : ""}`;
          const tooltip = `
              <span class="mobileMarketPointTooltip" aria-hidden="true">
                ${title ? `<i class="mobileMarketPointTitle">${escapeMarketHtml(title)}</i>` : ""}
                ${listing.subtitle ? `<i class="mobileMarketPointSubtitle">${escapeMarketHtml(listing.subtitle)}</i>` : ""}
                <strong>${escapeMarketHtml(formatMarketPrice(listing.price))}${listing.turnkeyPln ? ` <small>${escapeMarketHtml(turnkeyLabel)}</small>` : ""}${original ? ` <small>(${escapeMarketHtml(original)})</small>` : ""}</strong>
                ${details ? `<em>${escapeMarketHtml(details)}</em>` : ""}
                ${listing.byPrices ? byPriceLines(listing.byPrices) : listing.turnkeyPln ? `<em class="mobileMarketTurnkeyNote">${escapeMarketHtml(c.adPrice)}: ${escapeMarketHtml(nativePrice(listing.originalPrice, listing.source))}</em>` : ""}
                <b class="is${sourceClass(listing.source)}">${marketBadge(listing.source)} <small>${escapeMarketHtml(sourceName(listing.source))}</small>${listing.suspect ? ` · ${escapeMarketHtml(c.suspectTag)}` : ""}</b>
              </span>`;
          const attributes = `class="mobileMarketPoint is${sourceClass(listing.source)}${listing.suspect ? " isSuspect" : ""}${tooltipClass}" data-market-key="${escapeMarketHtml(listingKey(listing))}" aria-label="${escapeMarketHtml(label)}" style="--x:${x.toFixed(4)};top:${y}%"`;
          return listing.url
            ? `<a ${attributes} href="${escapeMarketHtml(listing.url)}" target="_blank" rel="noopener">${tooltip}</a>`
            : `<span ${attributes} role="img">${tooltip}</span>`;
      };
      // Offers left out of the statistics: at their place in the list (or
      // their mileage / year), pinned to the chart's edge when far off.
      const suspectPlotted = suspectListings.map((listing) => {
        let x = null;
        if (chartAxis === "rank") x = listing.rank && listing.marketTotal > 1 ? (listing.rank - 1) / (listing.marketTotal - 1) : null;
        else {
          const value = chartAxis === "mileage" ? listing.mileage : listing.year;
          x = Number.isFinite(value) && value > 0 && axisSpan ? Math.min(1, Math.max(0, (value - axisMin) / axisSpan)) : null;
        }
        const y = verticalMarketPosition(Math.min(Math.max(listing.price, domainMinimum), domainMaximum), domainMinimum, domainMaximum);
        return { listing, x, y };
      }).filter((point) => point.x !== null);
      const points = [...suspectPlotted, ...[...plotted].sort((left, right) => right.listing.price - left.listing.price)]
        .map(renderPoint)
        .join("");

      // The car recognised from a link, placed among the offers.
      const recognised = comparePriceEur
        ? { carBruttoEur: comparePriceEur, matchedFilters: { brand: filters.brand, model: filters.model }, isComparison: true }
        : (typeof state !== "undefined" ? state.data : null);
      const carLabel = recognised?.isComparison ? c.comparedCar : c.yourCar;
      const sameCar = recognised?.carBruttoEur
        && normalizeToken(recognised.matchedFilters?.brand || "") === normalizeToken(filters.brand || "")
        && normalizeToken(recognised.matchedFilters?.model || "") === normalizeToken(filters.model || "");
      let carMarker = "";
      // The same marker on a chart with its own price scale.
      let carMarkerFor = null;
      let carVerdict = "";
      let carLocalVerdict = "";
      // Several markets: the car is judged against, and drawn on, its own market.
      const compareMarkets = shownSources.length > 1;
      reportActionsInTitle = true;
      const carSource = recognised?.importMode === "avby" && shownSources.includes("avby")
        ? "avby"
        : recognised?.pricePln
        ? "otomoto"
        : (shownSources.find((source) => source !== "otomoto") || shownSources[0]);
      const carPool = compareMarkets ? marketListings.filter((listing) => listing.source === carSource) : marketListings;
      const carStats = compareMarkets && carPool.length ? marketStatistics(carPool) : statistics;
      if (compareMarkets && carPool.length) {
        trendMedians = buildTrend(plotted.filter((point) => point.listing.source === carSource), [carSource]).medians;
      }
      if (sameCar && carPool.length) {
        // Belarus: an av.by ad at its price, a German one turnkey in Minsk.
        const registeredCar = String(recognised.firstRegistration || "").match(/(\d{1,2})\/((?:19|20)\d{2})/);
        const byCar = byMode && recognised.importMode !== "avby" ? byTurnkey.calc({
          priceEur: Number(recognised.carBruttoEur) || 0,
          netEur: Number(recognised.carNettoEur) || null,
          ccm: Number(recognised.displacementCcm) || byFilterCcm(filters),
          year: registeredCar ? Number(registeredCar[2]) : Number((String(recognised.firstRegistration || "").match(/(?:19|20)\d{2}/) || [])[0]) || null,
          month: registeredCar ? Number(registeredCar[1]) : 0,
          electric: /electr|elektr/i.test(String(recognised.fuel || "")),
        }) : null;
        // A Polish ad at its price, any other car "na gotowo", like the dots.
        const carPrice = byMode
          ? (recognised.importMode === "avby"
            ? Number(recognised.priceUsd) || convertPrice(recognised.carBruttoEur, "EUR", "USD")
            : byCar?.totalUsd || convertPrice(recognised.carBruttoEur, "EUR", "USD"))
          : recognised.pricePln
          ? recognised.pricePln
          : (window.AUTOGOOD_TURNKEY?.turnkeyAverage({
            price: recognised.carBruttoEur,
            currency: "EUR",
            fuel: recognised.fuel,
            title: recognised.title,
            displacementCcm: recognised.displacementCcm,
          }, filters).total || convertPrice(recognised.carBruttoEur, "EUR", displayCurrency));
        const carYear = Number((String(recognised.firstRegistration || "").match(/(?:19|20)\d{2}/) || [])[0]) || null;
        const carMileage = Number(recognised.mileageKm) || null;
        const cheaperThan = carPool.filter((listing) => listing.price > carPrice).length;
        const share = Math.round((cheaperThan / carPool.length) * 100);
        const cheaperShare = carPool.filter((listing) => listing.price < carPrice).length / carPool.length;
        let carX = null;
        if (chartAxis === "rank") carX = cheaperShare;
        else if (chartAxis === "mileage" && carMileage && axisSpan) carX = (carMileage - axisMin) / axisSpan;
        else if (chartAxis === "year" && carYear && axisSpan) carX = (carYear - axisMin) / axisSpan;
        const carMarkerOn = (minimum, maximum) => {
          const clampedY = verticalMarketPosition(Math.min(Math.max(carPrice, minimum), maximum), minimum, maximum);
          return `<span class="mobileMarketCar" style="--x:${Math.min(1, Math.max(0, carX)).toFixed(4)};top:${clampedY}%" role="img" aria-label="${escapeMarketHtml(`${carLabel}: ${formatMarketPrice(carPrice)}`)}"><i aria-hidden="true"></i><b>${escapeMarketHtml(carLabel)} · ${escapeMarketHtml(formatMarketPrice(carPrice))}</b></span>`;
        };
        if (carX !== null) {
          carMarker = carMarkerOn(domainMinimum, domainMaximum);
          carMarkerFor = carMarkerOn;
        }
        const diffPct = Math.round(((carPrice - carStats.median) / carStats.median) * 100);
        const diff = Math.abs(diffPct) < 1 ? c.atMedian
          : (diffPct < 0 ? c.belowMedian : c.aboveMedian).replace("{pct}", String(Math.abs(diffPct)));
        const priceLabel = byMode
          ? (byCar
            ? `${formatMarketPrice(carPrice)} ${c.byTurnkey}* (${c.byCarPrice}: ${formatMarketPrice(byCar.parts.carEur, "EUR")} ${byCar.base === "netto" ? c.byNet : c.byGross})`
            : formatMarketPrice(carPrice))
          : recognised.pricePln
          ? formatMarketPrice(carPrice)
          : `${formatMarketPrice(carPrice)} ${c.turnkeyShort} (${c.adPrice}: ${formatMarketPrice(recognised.carBruttoEur, "EUR")})`;
        if (canJudge) carVerdict = c.yourCarVerdict.replace(c.yourCar, carLabel).replace("{price}", priceLabel).replace("{share}", String(share)).replace("{diff}", diff);
        // Against offers like it: the median price at its own mileage or year.
        const carValue = chartAxis === "mileage" ? carMileage : chartAxis === "year" ? carYear : null;
        if (carValue && trendMedians.length >= 2) {
          const sortedTrend = [...trendMedians].sort((left, right) => left.value - right.value);
          let reference = null;
          if (carValue <= sortedTrend[0].value) reference = sortedTrend[0].price;
          else if (carValue >= sortedTrend[sortedTrend.length - 1].value) reference = sortedTrend[sortedTrend.length - 1].price;
          else {
            const upper = sortedTrend.findIndex((point) => point.value >= carValue);
            const low = sortedTrend[upper - 1];
            const high = sortedTrend[upper];
            reference = low.price + ((carValue - low.value) / ((high.value - low.value) || 1)) * (high.price - low.price);
          }
          const localPct = Math.round(((carPrice - reference) / reference) * 100);
          const localDiff = Math.abs(localPct) < 1 ? c.atMedian
            : (localPct < 0 ? c.belowMedian : c.aboveMedian).replace("{pct}", String(Math.abs(localPct)));
          if (canJudge) carLocalVerdict = (chartAxis === "mileage" ? c.yourCarMileageVerdict : c.yourCarYearVerdict)
            .replace("{reference}", formatMarketPrice(reference))
            .replace("{diff}", localDiff);
        }
      }
      const sourceCount = (source) => cleaned[source].length;
      const axisCaption = chartAxis === "mileage" ? c.axisMileageCaption : chartAxis === "year" ? c.axisYearCaption : c.axisRankCaption;
      const marketName = (source) => (source === "otomoto" ? c.marketOtomoto : source === "blocket" ? c.marketBlocket : source === "avby" ? c.marketAvby : source === "autoscout" ? c.marketAutoscout : c.marketMobile);

      // One chart: its own P25, median and P75 (labelled), the dots given, and
      // other markets' medians as thin dashed guides. Every chart shares the
      // price scale, so two markets side by side compare at a glance.
      const chartBody = ({ panelStats, panelPlotted, panelSuspects, trendHtml, car, source = "", guides = [], ticks = xTicks, scale = null }) => {
        const domainMinimum = scale ? scale.min : sharedMinimum;
        const domainMaximum = scale ? scale.max : sharedMaximum;
        const scaleTicks = scale ? scale.ticks : sharedTicks;
        const labelStep = scale ? scale.labelStep : sharedLabelStep;
        const high = verticalMarketPosition(panelStats.middleHigh, domainMinimum, domainMaximum);
        const low = verticalMarketPosition(panelStats.middleLow, domainMinimum, domainMaximum);
        const middle = verticalMarketPosition(panelStats.median, domainMinimum, domainMaximum);
        const top = [...panelPlotted].sort((left, right) => right.listing.price - left.listing.price)[0];
        const colour = source ? ` is${sourceClass(source)}` : "";
        const dots = [...panelSuspects, ...[...panelPlotted].sort((left, right) => right.listing.price - left.listing.price)]
          .map(renderPoint).join("");
        return `
        <div
          class="mobileMarketScale${chartAxis === "rank" ? " isRankAxis" : ""}${panelPlotted.length > 150 ? " isDense" : ""}"
          role="group"
          aria-label="${escapeMarketHtml(source ? `${c.chartTitle} · ${marketName(source)}` : c.chartTitle)}"
          data-currency="${escapeMarketHtml(displayCurrency)}"
          style="--market-high-end:${high}%;--market-middle-end:${low}%"
        >
          <div class="mobileMarketAxis"></div>
          <div class="mobileMarketBoundary" style="top:${high}%"></div>
          <div class="mobileMarketMedian${colour}" style="top:${middle}%" aria-hidden="true"></div>
          <div class="mobileMarketBoundary" style="top:${low}%"></div>
          ${guides.map((guide) => `<div class="mobileMarketMedian isGuide is${sourceClass(guide.source)}" style="top:${verticalMarketPosition(Math.min(Math.max(guide.value, domainMinimum), domainMaximum), domainMinimum, domainMaximum)}%" aria-hidden="true"></div>`).join("")}
          ${scaleTicks.map((price) => {
            const position = verticalMarketPosition(price, domainMinimum, domainMaximum);
            return `<div class="mobileMarketGridLine" style="top:${position}%"></div>${price % labelStep === 0 ? `<span class="mobileMarketTick isGrid" style="top:${position}%">${escapeMarketHtml(formatMarketPrice(price))}</span>` : ""}`;
          }).join("")}
          ${ticks.map((tick) => `<div class="mobileMarketGridColumn" style="--x:${tick.x.toFixed(4)}"></div>`).join("")}
          <div class="mobileMarketPlot">${trendHtml}</div>
          ${dots}
          ${car || ""}
          ${guides.map((guide) => {
            const position = verticalMarketPosition(Math.min(Math.max(guide.value, domainMinimum), domainMaximum), domainMinimum, domainMaximum);
            const guideName = guide.source === "autoscout" ? portalName(guide.source) : marketName(guide.source);
            return Math.abs(position - middle) >= 2.6 && Math.abs(position - high) >= 2.6 && Math.abs(position - low) >= 2.6 ? `<span class="mobileMarketKeyTick isGuide is${sourceClass(guide.source)}" style="top:${position}%">${escapeMarketHtml(guideName)} · ${escapeMarketHtml(formatMarketPrice(guide.value))}</span>` : "";
          }).join("")}
          ${Math.abs(high - middle) >= 2.6 ? `<span class="mobileMarketKeyTick" style="top:${high}%">P75 · ${escapeMarketHtml(formatMarketPrice(panelStats.middleHigh))}</span>` : ""}
          <span class="mobileMarketKeyTick isMedian${colour}" style="top:${middle}%">${escapeMarketHtml(c.median)} · ${escapeMarketHtml(formatMarketPrice(panelStats.median))}</span>
          ${Math.abs(low - middle) >= 2.6 ? `<span class="mobileMarketKeyTick" style="top:${low}%">P25 · ${escapeMarketHtml(formatMarketPrice(panelStats.middleLow))}</span>` : ""}
          <span class="mobileMarketTick isLimit" style="top:95%">${escapeMarketHtml(formatMarketPrice(domainMinimum))}</span>
          ${top ? `<span class="mobileMarketTick isLimit isPeak${top.x > 0.85 ? " isPeakRight" : ""}" style="--x:${top.x.toFixed(4)};top:${top.y}%">${escapeMarketHtml(formatMarketPrice(top.listing.price))}</span>` : ""}
        </div>
        <div class="mobileMarketXAxis">
          <div class="mobileMarketXTicks">
            ${ticks.map((tick) => `<em style="--x:${tick.x.toFixed(4)}">${escapeMarketHtml(tick.label)}</em>`).join("")}
          </div>
          <span class="mobileMarketXCaption">${escapeMarketHtml(axisCaption)}</span>
        </div>`;
      };

      let chartsHtml = "";
      let comparisonHtml = "";
      if (!compareMarkets) {
        chartsHtml = chartBody({ panelStats: statistics, panelPlotted: plotted, panelSuspects: suspectPlotted, trendHtml: trendLine, car: carMarker });
      } else {
        // One chart per market, side by side, on the same price scale.
        const panels = shownSources.map((source) => {
          const own = marketListings.filter((listing) => listing.source === source);
          if (!own.length) return null;
          const panelStats = marketStatistics(own);
          const scale = chartScale === "own" && panelStats.max > panelStats.min ? {
            min: panelStats.min,
            max: panelStats.max,
            ticks: marketScaleTicks(panelStats.min, panelStats.max, panelStats.step),
            labelStep: marketTickLabelStep(panelStats.min, panelStats.max, panelStats.step),
          } : null;
          const onScale = (points) => (scale
            ? points.map((point) => ({ ...point, y: verticalMarketPosition(Math.min(Math.max(point.listing.price, scale.min), scale.max), scale.min, scale.max) }))
            : points);
          const panelPlotted = onScale(plotted.filter((point) => point.listing.source === source));
          const ranked = own.every((listing) => listing.rank && listing.marketTotal > 1);
          const total = ranked ? Math.max(...own.map((listing) => listing.marketTotal)) : 0;
          const ticks = chartAxis === "rank" && total
            ? [0, 0.25, 0.5, 0.75, 1].map((x) => ({
              x,
              label: x === 0 ? `1 · ${c.axisRankStart}` : x === 1 ? `${numbers.format(total)} · ${c.axisRankEnd}` : numbers.format(Math.round(total * x)),
            }))
            : xTicks;
          const foreign = own.some((listing) => listing.turnkeyPln);
          return {
            source,
            own,
            panelStats,
            foreign,
            html: chartBody({
              panelStats,
              panelPlotted,
              panelSuspects: onScale(suspectPlotted.filter((point) => point.listing.source === source)),
              trendHtml: buildTrend(panelPlotted, [source], scale).html,
              car: source === carSource ? (scale && carMarkerFor ? carMarkerFor(scale.min, scale.max) : carMarker) : "",
              source,
              ticks,
              scale,
              guides: shownSources.filter((other) => other !== source)
                .map((other) => {
                  const others = marketListings.filter((listing) => listing.source === other);
                  return others.length ? { source: other, value: marketStatistics(others).median } : null;
                })
                .filter((guide) => guide && (!scale || (guide.value >= scale.min && guide.value <= scale.max))),
            }),
          };
        }).filter(Boolean);
        chartsHtml = `
          <div class="mobileMarketPanels" style="--panels:${panels.length}">
            ${panels.map((panel) => `
              <section class="mobileMarketPanel is${sourceClass(panel.source)}">
                <header class="mobileMarketPanelHead">
                  <b>${marketBadge(panel.source)}${panel.foreign ? ` · ${escapeMarketHtml(turnkeyLabel)}` : ""}</b>
                  <small>${escapeMarketHtml(withCount(c.panelOffers, panel.panelStats.count))} · ${escapeMarketHtml(c.averagePrices)}: ${escapeMarketHtml(formatMarketPrice(panel.panelStats.middleLow))} – ${escapeMarketHtml(formatMarketPrice(panel.panelStats.middleHigh))}</small>
                </header>
                ${panel.html}
              </section>`).join("")}
          </div>`;
        // The comparison strip: each market's prices (na gotowo for foreign
        // ones) as a box on one axis: box = P25–P75, bar = median, whiskers =
        // cheapest to dearest.
        const span = Math.max(1, domainMaximum - domainMinimum);
        const at = (value) => `${(((Math.min(Math.max(value, domainMinimum), domainMaximum) - domainMinimum) / span) * 100).toFixed(2)}%`;
        comparisonHtml = `
          <section class="mobileMarketCompareStrip" aria-label="${escapeMarketHtml(c.compareHeading)}">
            <div class="mobileMarketCompareHead">
              <strong>${escapeMarketHtml(c.compareHeading)}</strong>
              <small>${escapeMarketHtml(chartScale === "own" ? (byMode ? c.compareHintByOwn : c.compareHintOwn) : (byMode ? c.compareHintBy : c.compareHint))}</small>
            </div>
            <div class="mobileMarketCompareAxis">
              ${scaleTicks.filter((price) => price % labelStep === 0).map((price) => `<em style="left:${at(price)}">${escapeMarketHtml(formatMarketPrice(price))}</em>`).join("")}
            </div>
            ${panels.map((panel) => `
              <div class="mobileMarketCompareRow is${sourceClass(panel.source)}">
                <span class="mobileMarketCompareName">${marketBadge(panel.source)}<small>${escapeMarketHtml(withCount(c.panelOffers, panel.panelStats.count))}${panel.foreign ? ` · ${escapeMarketHtml(turnkeyLabel)}` : ""}</small></span>
                <span class="mobileMarketCompareTrack">
                  ${scaleTicks.filter((price) => price % labelStep === 0).map((price) => `<i class="isGrid" style="left:${at(price)}"></i>`).join("")}
                  <i class="isWhisker" style="left:${at(panel.panelStats.min)};right:calc(100% - ${at(panel.panelStats.max)})"></i>
                  <i class="isBox" style="left:${at(panel.panelStats.middleLow)};right:calc(100% - ${at(panel.panelStats.middleHigh)})" title="${escapeMarketHtml(`${c.averagePrices}: ${formatMarketPrice(panel.panelStats.middleLow)} – ${formatMarketPrice(panel.panelStats.middleHigh)}`)}"></i>
                  <i class="isMedianBar" style="left:${at(panel.panelStats.median)}"></i>
                  <b style="left:${at(panel.panelStats.median)}">${escapeMarketHtml(formatMarketPrice(panel.panelStats.median))}</b>
                </span>
              </div>`).join("")}
            <p class="mobileMarketCompareLegend">${escapeMarketHtml(c.compareLegend)}</p>
          </section>`;
      }

      // One row per marketplace shown. Foreign markets show their own
      // currency with "~ pod klucz" in PLN under it; with several markets the
      // colours compare what the client pays in Poland (turnkey for foreign
      // offers, the price itself for Polish ones): higher green, lower red.
      const statsOf = (list, priceOf) => marketStatistics(list.map((listing) => ({ ...listing, price: priceOf(listing) })));
      const statRows = (shownSources.length > 1 ? shownSources : [shownSources[0] || ""]).map((source) => {
        const own = marketListings.filter((listing) => !source || listing.source === source);
        const currency = SOURCE_CURRENCY[source] || displayCurrency;
        const foreign = source && turnkeySources.includes(source) && own.some((listing) => listing.turnkeyPln);
        // Belarus: German rows show the car's price (net/gross) with the price in
        // Minsk and turnkey; av.by its BYN price at the NBRB rate, in USD only.
        const byRow = byMode && own.some((listing) => listing.byPrices);
        const avbyUsd = byMode && source === "avby";
        const native = byRow
          ? statsOf(own, (listing) => listing.byPrices.parts.carEur)
          : avbyUsd
          ? statsOf(own, (listing) => listing.price)
          : statsOf(own, (listing) => convertPrice(listing.originalPrice, listing.originalCurrency || currency, currency));
        const turnkeyStats = foreign ? statsOf(own, (listing) => listing.turnkeyPln) : null;
        const deliveredStats = byRow ? statsOf(own, (listing) => listing.byPrices.deliveredUsd) : null;
        const bases = byRow ? new Set(own.map((listing) => listing.byPrices.base)) : null;
        const baseLabel = byRow ? byBaseLabel(bases.size === 1 ? [...bases][0] : "mixed") : "";
        // Compared in what the client pays: PLN, or USD for Belarus.
        const inPln = turnkeyStats || statsOf(own, (listing) => (byMode ? listing.price : priceInPln(listing.originalPrice, listing.originalCurrency || currency)));
        return { source, stats: native, turnkeyStats, inPln, deliveredStats, baseLabel, avbyUsd, own, mileage: meanMileage(own) };
      }).filter((row) => row.stats.count);
      // Otomoto alone: CEPiK history and imported cars, in the table and the conclusion.
      const polishShares = onlyOtomoto && statRows[0] ? polishMarketShares(statRows[0].own) : null;
      const shareHtml = (share) => (share ? `${Math.round((share.count / share.total) * 100)}%<small class="mobileMarketStatsNote">${escapeMarketHtml(c.shareOf.replace("{count}", String(share.count)).replace("{total}", String(share.total)))}</small>` : "—");
      const priceCell = (row, key) => {
        if (row.deliveredStats) {
          return `${escapeMarketHtml(formatMarketPrice(row.stats[key], "EUR"))} <small class="mobileMarketGrossNote">${escapeMarketHtml(row.baseLabel)}</small>`
            + `<small class="mobileMarketTurnkeyNote">~ ${escapeMarketHtml(formatMarketPrice(row.deliveredStats[key], "USD"))} ${escapeMarketHtml(c.byDelivered)}*</small>`
            + `<small class="mobileMarketTurnkeyNote isStrong">~ ${escapeMarketHtml(formatMarketPrice(row.turnkeyStats[key], "USD"))} ${escapeMarketHtml(c.byTurnkey)}*</small>`;
        }
        const main = row.avbyUsd ? formatMarketPrice(row.stats[key], "USD") : nativePrice(row.stats[key], row.source);
        // Złoty first ("na gotowo", what the client pays in Poland), under it
        // the ad's own gross price — the same order as "Aktualne oferty".
        return row.turnkeyStats
          ? `<span class="mobileMarketStatsTurnkey">~ ${escapeMarketHtml(formatMarketPrice(row.turnkeyStats[key], turnkeyCurrency))}<small> ${escapeMarketHtml(turnkeyLabel)}</small></span><small class="mobileMarketStatsAdPrice">${escapeMarketHtml(c.adPrice)}: ${escapeMarketHtml(main)} ${escapeMarketHtml(c.byGross)}</small>`
          : escapeMarketHtml(main);
      };
      const rangeCell = (row) => {
        if (row.deliveredStats) {
          return `${escapeMarketHtml(formatMarketPrice(row.stats.middleLow, "EUR"))} – ${escapeMarketHtml(formatMarketPrice(row.stats.middleHigh, "EUR"))} <small class="mobileMarketGrossNote">${escapeMarketHtml(row.baseLabel)}</small>`
            + `<small class="mobileMarketTurnkeyNote">~ ${escapeMarketHtml(formatMarketPrice(row.deliveredStats.middleLow, "USD"))} – ${escapeMarketHtml(formatMarketPrice(row.deliveredStats.middleHigh, "USD"))} ${escapeMarketHtml(c.byDelivered)}*</small>`
            + `<small class="mobileMarketTurnkeyNote isStrong">~ ${escapeMarketHtml(formatMarketPrice(row.turnkeyStats.middleLow, "USD"))} – ${escapeMarketHtml(formatMarketPrice(row.turnkeyStats.middleHigh, "USD"))} ${escapeMarketHtml(c.byTurnkey)}*</small>`;
        }
        const main = row.avbyUsd
          ? `${formatMarketPrice(row.stats.middleLow, "USD")} – ${formatMarketPrice(row.stats.middleHigh, "USD")}`
          : `${nativePrice(row.stats.middleLow, row.source)} – ${nativePrice(row.stats.middleHigh, row.source)}`;
        return row.turnkeyStats
          ? `<span class="mobileMarketStatsTurnkey">~ ${escapeMarketHtml(formatMarketPrice(row.turnkeyStats.middleLow, turnkeyCurrency))} – ${escapeMarketHtml(formatMarketPrice(row.turnkeyStats.middleHigh, turnkeyCurrency))}<small> ${escapeMarketHtml(turnkeyLabel)}</small></span><small class="mobileMarketStatsAdPrice">${escapeMarketHtml(c.adPrice)}: ${escapeMarketHtml(main)}</small>`
          : escapeMarketHtml(main);
      };
      const statColumns = [
        { label: c.count, value: (row) => row.stats.count, html: (row) => escapeMarketHtml(String(row.stats.count)) },
        { label: c.minimum, value: (row) => row.inPln.min, html: (row) => priceCell(row, "min") },
        { label: c.maximum, value: (row) => row.inPln.max, html: (row) => priceCell(row, "max") },
        { label: c.median, value: (row) => row.inPln.median, html: (row) => priceCell(row, "median") },
        { label: c.averagePrices, value: (row) => (row.inPln.middleLow + row.inPln.middleHigh) / 2, html: rangeCell, wide: true },
        { label: c.middleOffers, value: (row) => row.stats.middleCount, html: (row) => escapeMarketHtml(String(row.stats.middleCount)) },
        // Mileage moves the price: shown for every market (lower = green).
        { label: c.averageMileage, cls: "isKm", value: (row) => (row.mileage ? row.mileage.mean : NaN), html: (row) => (row.mileage ? escapeMarketHtml(`${numberFormat().format(row.mileage.mean)} km`) : "—") },
        ...(polishShares && (polishShares.cepik || polishShares.imported || polishShares.accident) ? [
          { label: c.cepikShare, value: () => NaN, html: () => shareHtml(polishShares.cepik) },
          { label: c.accidentShare, value: () => NaN, html: () => (polishShares.accident
            ? `${shareHtml(polishShares.accident)}<small class="mobileMarketStatsNote">${escapeMarketHtml(c.afterAccidentShort.replace("{percent}", String(Math.round((polishShares.accident.after / polishShares.accident.total) * 100))))}</small>`
            : "—") },
          { label: c.importedShare, value: () => NaN, html: () => shareHtml(polishShares.imported) },
        ] : []),
      ];
      const compared = statRows.length > 1;
      const tone = (column, row, index) => {
        if (!compared || index === 0 || index === 5) return "";
        const values = statRows.map((item) => column.value(item));
        const value = column.value(row);
        if (Math.max(...values) === Math.min(...values)) return "";
        if (value === Math.max(...values)) return " isHigher";
        if (value === Math.min(...values)) return " isLower";
        return "";
      };
      // Footnote and the conclusion for the client, from the numbers above:
      // a foreign market's median "pod klucz" against the Polish median.
      const polish = statRows.find((row) => row.source === (byMode ? "avby" : "otomoto"));
      const foreignRows = statRows.filter((row) => row.turnkeyStats);
      // "z Niemiec" from the searched country; mobile.de and AutoScout24
      // together are told apart by the portal.
      const fromCountry = { DE: c.countryGermany, SE: c.countrySweden, NL: c.countryNetherlands, BE: c.countryBelgium, AT: c.countryAustria, LU: c.countryLuxembourg };
      const fromLabel = (source) => {
        if (source === "blocket") return c.countrySweden;
        const countries = (filters.countries || []).filter(Boolean);
        const base = countries.length === 1 ? (fromCountry[countries[0]] || c.countryAbroad) : c.countryAbroad;
        return foreignRows.some((other) => other.source !== source && other.source !== "blocket") ? `${base} (${portalName(source)})` : base;
      };
      const plnText = (value) => formatMarketPrice(value, "PLN");
      const kmText = (value) => `${numberFormat().format(value)} km`;
      // One foreign market against Poland: price (the same car when both
      // markets have enough offers, else the medians), then mileage.
      const importConclusion = (row) => {
        const from = fromLabel(row.source);
        if (polish.stats.count < COMPARE_MIN || row.stats.count < COMPARE_MIN) {
          return [{ label: c.briefPrice, text: c.conclusionTooFew.replace("{pl}", String(polish.stats.count)).replace("{portal}", portalName(row.source)).replace("{foreign}", String(row.stats.count)).replace("{min}", String(COMPARE_MIN)) }];
        }
        const lines = [];
        const same = sameCarPrices([polish.own, row.own]);
        if (same) {
          const [polishPrice, foreignPrice] = same.prices;
          const difference = polishPrice - foreignPrice;
          lines.push({
            label: c.briefPrice,
            compared: true,
            text: (difference > 0 ? c.conclusionSameCarCheaper : c.conclusionSameCarDearer)
              .replace("{year}", String(same.year)).replace("{mileage}", kmText(same.km)).replace("{from}", from)
              .replace("{foreign}", plnText(foreignPrice)).replace("{pl}", plnText(polishPrice))
              .replace("{amount}", plnText(Math.abs(difference))).replace("{percent}", String(Math.round((Math.abs(difference) / polishPrice) * 100))),
            note: c.sameCarNote.replace("{pl}", plnText(polish.inPln.median)).replace("{foreign}", plnText(row.turnkeyStats.median)),
          });
        } else {
          const difference = polish.inPln.median - row.turnkeyStats.median;
          lines.push({
            label: c.briefPrice,
            compared: true,
            text: (difference > 0 ? c.conclusionCheaper : c.conclusionDearer)
              .replace("{country}", from)
              .replace("{amount}", plnText(Math.abs(difference)))
              .replace("{percent}", String(Math.round((Math.abs(difference) / polish.inPln.median) * 100))),
            note: c.mediansNote.replace("{min}", String(SAME_CAR_MIN)),
          });
        }
        if (polish.mileage && row.mileage) {
          const difference = polish.mileage.mean - row.mileage.mean;
          const percent = Math.round((Math.abs(difference) / polish.mileage.mean) * 100);
          if (percent >= 1) {
            lines.push({
              label: c.briefMileage,
              text: (difference > 0 ? c.mileageLower : c.mileageHigher)
                .replace("{from}", from).replace("{foreign}", kmText(row.mileage.mean)).replace("{pl}", kmText(polish.mileage.mean))
                .replace("{diff}", kmText(Math.abs(difference))).replace("{percent}", String(percent)),
            });
          }
        }
        return lines;
      };
      // What "na gotowo" is made of, for the car in the middle of each foreign
      // market (the offer closest to its median), like the calculator shows it.
      const percentText = (value) => value.toLocaleString(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", { maximumFractionDigits: 2 });
      const breakdownHtml = byMode || !turnkey ? "" : foreignRows.map((row) => {
        const median = row.turnkeyStats.median;
        const example = row.own.filter((listing) => listing.turnkeyPln)
          .sort((left, right) => Math.abs(left.turnkeyPln - median) - Math.abs(right.turnkeyPln - median))[0];
        if (!example) return "";
        const currency = example.originalCurrency || SOURCE_CURRENCY[example.source];
        const result = turnkey.turnkeyAverage(turnkeyInput(example, example.originalPrice, currency), filters, rates);
        const exciseRate = (turnkey.EXCISE_RATES?.[example.engine?.index] ?? 0) * 100;
        const rateValue = currency === "SEK" ? rates.sek : rates.eur;
        const parts = [
          ["Car", c.partCar.replace("{price}", formatMarketPrice(example.originalPrice, currency)).replace("{rate}", rateValue.toLocaleString(currentLanguage() === "ru" ? "ru-RU" : "pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: currency === "SEK" ? 4 : 2 })), result.parts.car],
          ["Transport", c.partTransport, result.parts.transport],
          ["Inspection", c.partInspection, result.parts.inspection],
          ["Excise", c.partExcise.replace("{rate}", percentText(exciseRate)), result.parts.excise],
          ["Commission", c.partCommission, result.parts.commission],
          ["Fees", c.partFees, result.parts.fees],
        ].filter((part) => part[2] > 0);
        return `
          <section class="mobileMarketBreakdown">
            <p class="mobileMarketBreakdownTitle">${escapeMarketHtml(c.breakdownTitle.replace("{from}", fromLabel(row.source)))}</p>
            <div class="mobileMarketBreakdownBar" aria-hidden="true">${parts.map(([key, label, value]) => `<i class="is${key}" style="flex:${value} 1 0" title="${escapeMarketHtml(`${label}: ${plnText(value)}`)}"></i>`).join("")}</div>
            <ul class="mobileMarketBreakdownList">
              ${parts.map(([key, label, value]) => `<li><i class="is${key}"></i><span>${escapeMarketHtml(label)}</span><b>${escapeMarketHtml(plnText(value))}</b></li>`).join("")}
              <li class="isTotal"><span>${escapeMarketHtml(c.partTotal)}</span><b>${escapeMarketHtml(plnText(result.total))}</b></li>
            </ul>
          </section>`;
      }).join("");
      const conclusions = polish && byMode ? foreignRows.map((row) => {
        const difference = polish.inPln.median - row.turnkeyStats.median;
        const percent = Math.round((Math.abs(difference) / polish.inPln.median) * 100);
        return (difference > 0 ? c.conclusionByCheaper : c.conclusionByDearer)
          .replace("{portal}", portalName(row.source))
          .replace("{amount}", formatMarketPrice(Math.abs(difference), "USD"))
          .replace("{percent}", String(percent));
      }) : polish ? foreignRows.flatMap((row) => importConclusion(row)) : [];
      // The brief ends with what buying through AUTOGOOD gives (owner 2026-10-03).
      if (!byMode && polish && conclusions.some((item) => item.compared)) conclusions.push({ label: c.briefSafety, text: c.conclusionBenefits });
      // Otomoto alone: how much of the Polish market is unverified or imported.
      if (polishShares && (polishShares.cepik || polishShares.imported || polishShares.accident)) {
        const percentOf = (share) => String(Math.round((share.count / share.total) * 100));
        if (polishShares.cepik) conclusions.push({ label: c.briefHistory, text: c.polishCepik.replace("{percent}", percentOf(polishShares.cepik)).replace("{count}", String(polishShares.cepik.count)).replace("{total}", String(polishShares.cepik.total)) });
        if (polishShares.accident) {
          const { count, after, total } = polishShares.accident;
          const share = (value) => String(Math.round((value / total) * 100));
          conclusions.push({ label: c.briefAccidents, text: c.polishAccidents.replace("{percent}", share(count)).replace("{count}", String(count)).replace("{total}", String(total)).replace("{after}", share(after)).replace("{silent}", share(total - count - after)) });
        }
        if (polishShares.imported) {
          const from = c.originFrom[polishShares.imported.top] || "";
          conclusions.push({ label: c.briefOrigin, text: (from ? c.polishImportedFrom : c.polishImported).replace("{percent}", percentOf(polishShares.imported)).replace("{count}", String(polishShares.imported.count)).replace("{total}", String(polishShares.imported.total)).replace("{from}", from) });
        }
        conclusions.push({ label: c.briefSafety, text: c.polishOffer });
      }
      if (conclusions.length) {
        const conclusionLine = (item) => (typeof item === "string"
          ? `<p>${escapeMarketHtml(item)}</p>`
          : `<p>${item.label ? `<b>${escapeMarketHtml(item.label)}.</b> ` : ""}${escapeMarketHtml(item.text)}${item.note ? `<small class="mobileMarketConclusionNote">${escapeMarketHtml(item.note)}</small>` : ""}</p>`);
        summaryContent = `
          <section class="mobileMarketCard mobileMarketSummaryCard" aria-label="${escapeMarketHtml(c.conclusionHeading)}" data-report-list-hide>
            <div class="mobileMarketConclusion"><strong>${escapeMarketHtml(c.conclusionHeading)}</strong>${conclusions.map(conclusionLine).join("")}</div>
          </section>`;
      }
      statsContent = `
        <div class="mobileMarketStatsBody">
        ${filters.priceFrom || filters.priceTo ? `<p class="mobileMarketCaution">${escapeMarketHtml(c.priceFilterWarning)}</p>` : ""}
        ${statistics.min < statistics.median / 3 || statistics.max > statistics.median * 3 ? `<p class="mobileMarketCaution">${escapeMarketHtml(c.wideRangeWarning)}</p>` : ""}
        <div class="mobileMarketStatsTable${compared ? " isCompared" : ""}${statColumns.length > 7 ? " hasPolishShares" : ""}" role="table">
          <div class="mobileMarketStatsRow isHead" role="row">
            ${compared ? `<span role="columnheader">${escapeMarketHtml(c.marketsHeading)}</span>` : ""}
            ${statColumns.map((column) => `<span role="columnheader"${column.wide ? ' class="isWide"' : ""}>${escapeMarketHtml(column.label)}</span>`).join("")}
          </div>
          ${statRows.map((row) => `
            <div class="mobileMarketStatsRow" role="row">
              ${compared ? `<span class="mobileMarketStatsSource" role="rowheader" title="${escapeMarketHtml(sourceName(row.source))}">${marketBadge(row.source)}</span>` : ""}
              ${statColumns.map((column, index) => {
                const left = index === 0 ? suspectListings.filter((listing) => !compared || listing.source === row.source).length : 0;
                const note = left ? `<small class="mobileMarketStatsNote">${escapeMarketHtml(c.suspectShort.replace("{count}", String(left)))}</small>` : "";
                const toneClass = tone(column, row, index);
                const arrow = toneClass === " isHigher" ? ["▲", c.toneHigher] : toneClass === " isLower" ? ["▼", c.toneLower] : null;
                const mark = arrow ? `<span class="mobileMarketToneMark" title="${escapeMarketHtml(arrow[1])}"><span aria-hidden="true">${arrow[0]}</span><span class="srOnly">${escapeMarketHtml(arrow[1])}</span></span>` : "";
                // The arrow goes on the cell's first line (inside the "na gotowo" line when there is one).
                const cellHtml = column.html(row);
                const opener = '<span class="mobileMarketStatsTurnkey">';
                const marked = mark && cellHtml.startsWith(opener) ? `${opener}${mark}${cellHtml.slice(opener.length)}` : `${mark}${cellHtml}`;
                return `<b class="${column.wide ? "isWide" : ""}${column.cls ? ` ${column.cls}` : ""}${toneClass}" role="cell">${marked}${note}</b>`;
              }).join("")}
            </div>`).join("")}
        </div>
        ${compared ? `<p class="mobileMarketToneLegend">${escapeMarketHtml(c.toneLegend)}</p>` : ""}
        </div>`;
      marketContent = `
        ${comparisonHtml}
        <div class="mobileMarketChartHead">
          <label class="mobileMarketCompare" data-report-hide>
            <span>${escapeMarketHtml(c.comparePrice)}</span>
            <input type="text" inputmode="numeric" autocomplete="off" data-mobile-market-compare-price placeholder="${escapeMarketHtml(c.comparePlaceholder)}" value="${escapeMarketHtml(activeAnalysis.comparePrice || "")}" />
          </label>
          <div class="mobileMarketControls" data-report-hide>
            <div class="mobileMarketToggle" role="group" aria-label="${escapeMarketHtml(c.axisLabel)}">
              ${[["rank", c.axisRank], ["mileage", c.axisMileageShort], ["year", c.axisYearShort]].map(([axis, label]) => `
                <button class="mobileMarketAxisButton" type="button" data-mobile-market-axis="${axis}" aria-pressed="${chartAxis === axis ? "true" : "false"}">${escapeMarketHtml(label)}</button>`).join("")}
            </div>
            ${compareMarkets ? `<div class="mobileMarketToggle" role="group" aria-label="${escapeMarketHtml(c.scaleLabel)}">
              ${[["shared", c.scaleShared], ["own", c.scaleOwn]].map(([scale, label]) => `
                <button class="mobileMarketAxisButton" type="button" data-mobile-market-scale="${scale}" aria-pressed="${chartScale === scale ? "true" : "false"}">${escapeMarketHtml(label)}</button>`).join("")}
            </div>` : ""}
          </div>
        </div>

        ${carVerdict || carLocalVerdict ? `<ul class="mobileMarketCarVerdict">
          ${carVerdict ? `<li>${escapeMarketHtml(carVerdict)}</li>` : ""}
          ${carLocalVerdict ? `<li>${escapeMarketHtml(carLocalVerdict)}</li>` : ""}
        </ul>` : ""}

        <div class="mobileMarketLegend">
          ${shownSources.map((source) => `<span class="is${sourceClass(source)}"><i></i>${marketBadge(source)}${turnkeySources.includes(source) && marketListings.some((listing) => listing.source === source && listing.turnkeyPln) ? ` · ${escapeMarketHtml(turnkeyLabel)}` : ""}</span>`).join("")}
          ${carMarker ? `<span class="isCar"><i></i>${escapeMarketHtml(c.yourCar)}</span>` : ""}
          ${trendLine ? `<span class="isTrend"><i></i>${escapeMarketHtml(chartAxis === "rank" ? c.curveLegend : c.trendLegend)}</span>` : ""}
          <span class="isBandLow"><i></i>${escapeMarketHtml(c.lowMarket)}${compareMarkets ? "" : ` · ${statistics.lowCount}`}</span>
          <span class="isBandMiddle"><i></i>${escapeMarketHtml(c.middleMarket)}${compareMarkets ? "" : ` · ${statistics.middleCount}`}</span>
          <span class="isBandHigh"><i></i>${escapeMarketHtml(c.highMarket)}${compareMarkets ? "" : ` · ${statistics.highCount}`}</span>
          ${compareMarkets ? `<span class="isGuide"><i></i>${escapeMarketHtml(c.guideLegend)}</span>` : ""}
        </div>

        ${chartsHtml}

          ${byMode && byProgress ? `<p class="mobileMarketAxisNote" data-by-progress>${escapeMarketHtml(c.byDetailsProgress.replace("{done}", String(byProgress.done)).replace("{total}", String(byProgress.total)))}</p>` : ""}
          ${byMode && byMissing.size && !byProgress ? `<p class="mobileMarketAxisNote">${escapeMarketHtml(c.byDetailsMissing.replace("{missing}", String(byMissing.size)))}</p>` : ""}
          ${marketListings.some((listing) => listing.turnkeyPln) ? `<p class="mobileMarketAxisNote isTurnkey">* ${escapeMarketHtml(byMode
            ? c.turnkeyFootnoteBy.replace("{date}", byRates.date ? byRates.date.split("-").reverse().join(".") : "—").replace("{saving}", formatMarketPrice(bySaving, "USD"))
            : c.turnkeyFootnote)}</p>` : ""}
          ${ccmProgress ? `<p class="mobileMarketAxisNote" data-ccm-progress>${escapeMarketHtml(c.ccmProgress.replace("{done}", String(ccmProgress.done)).replace("{total}", String(ccmProgress.total)))}</p>` : ""}
          ${unknownEngine.length && !ccmProgress ? `<p class="mobileMarketAxisNote">${escapeMarketHtml(withCount(c.ccmUnknown, unknownEngine.length))}</p>` : ""}
          ${breakdownHtml}
          ${suspectListings.length ? `<p class="mobileMarketAxisNote">${escapeMarketHtml(withCount(c.suspectsSkipped, suspectListings.length))}</p>` : ""}
          ${hiddenByAxis ? `<p class="mobileMarketAxisNote">${escapeMarketHtml(withCount(c.hiddenNoAxis, hiddenByAxis))}</p>` : ""}

`;
      offersContent = `
        <div class="mobileMarketTableBlock">
          <div class="mobileMarketTableHead">
            ${blockTitle("list", `${c.tableHeading} · ${marketListings.length + suspectListings.length}`)}
            <div class="mobileMarketTableTools" data-report-hide>
              <button class="mobileMarketImportClear isPrimary" type="button" data-mobile-market-list-screenshot>${escapeMarketHtml(c.listScreenshotButton)}</button>
              <button class="mobileMarketImportClear isPrimary" type="button" data-mobile-market-list-pdf>${escapeMarketHtml(c.listPdfButton)}</button>
              <span class="mobileMarketSortHint">${escapeMarketHtml(c.tableSortHint)}</span>
            </div>
          </div>
          <div class="mobileMarketTableScroll">
            <table class="mobileMarketTable mobileMarketOffersTable${byMode ? " isByPrices" : ""}">
              <thead>
                <tr>
                  <th scope="col" class="isNum mobileMarketRowNumber">#</th>
                  ${[["title", c.tableTitle], ["year", c.tableYear], ["mileage", c.tableMileage], ["price", c.tablePrice]].map(([key, label]) => `
                    <th scope="col"${key === "title" ? "" : ' class="isNum"'}>
                      <button type="button" data-mobile-market-sort="${key}">${escapeMarketHtml(label)}${tableSort.key === key ? (tableSort.direction === "asc" ? " ↑" : " ↓") : ""}</button>
                    </th>`).join("")}
                  <th scope="col">${escapeMarketHtml(c.tableSource)}</th>
                  <th scope="col">${escapeMarketHtml(c.tableLink)}</th>
                </tr>
              </thead>
              <tbody>
                ${sortedListings.map((listing, index) => `
                  <tr class="${listing.suspect ? "isSuspect" : marketClass(listing.price, statistics)}" data-market-key="${escapeMarketHtml(listingKey(listing))}">
                    <td class="isNum mobileMarketRowNumber">${index + 1}</td>
                    <td class="mobileMarketTableTitle">${fullTitle(listing) ? `<b>${escapeMarketHtml(fullTitle(listing))}</b>` : "—"}${listing.subtitle ? `<small>${escapeMarketHtml(listing.subtitle)}</small>` : ""}${listing.suspect ? `<small class="mobileMarketSuspectTag">${escapeMarketHtml(c.suspectTag)}</small>` : ""}</td>
                    <td class="isNum">${escapeMarketHtml(listing.year ? String(listing.year) : "—")}</td>
                    <td class="isNum">${escapeMarketHtml(listing.mileage ? `${numbers.format(listing.mileage)} ${kmUnit()}` : "—")}</td>
                    <td class="isNum">${listing.byPrices ? byPriceLines(listing.byPrices) : listing.turnkeyPln
                      ? `<b class="mobileMarketTurnkeyPrice">~ ${escapeMarketHtml(formatMarketPrice(listing.turnkeyPln, turnkeyCurrency))} ${escapeMarketHtml(turnkeyLabel)}</b><small class="mobileMarketTurnkeyNote">${escapeMarketHtml(c.adPrice)}: ${escapeMarketHtml(nativePrice(convertPrice(listing.originalPrice, listing.originalCurrency || SOURCE_CURRENCY[listing.source], SOURCE_CURRENCY[listing.source]), listing.source))}</small>`
                      : `<b>${escapeMarketHtml(formatMarketPrice(listing.price))}</b>`}</td>
                    <td>${marketBadge(listing.source)}</td>
                    <td class="mobileMarketTableLink">${listing.url ? brandMarkLink(listing.source, listing.url, `${c.tableOpen}: ${sourceName(listing.source)}`) : "—"}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    }

    const dataDate = historyEntry?.dataAt || activeAnalysis.fetchedAt || "";
    // The portals drawn on the chart (a picked one without offers is left
    // out); they are switched under the filters, in "Aktualne oferty".
    const reportSources = hasListings ? shownSources : MARKET_SOURCES.filter((source) => chartSources[source]);
    // "Analiza rynków": the countries drawn on the chart, flag + code, on the
    // right of "Statystyki". As on page 1: "−" on hover drops a market, a grey
    // one gets "+"; a picked market without offers is grey too, its "+"
    // fetches the offers again.
    const sourcesPicker = `
      <div class="mobileMarketSources">
        <span>${escapeMarketHtml(c.sourcesPicker)}</span>
        <div class="mobileMarketSourcesList">
          ${MARKET_SOURCES.map((source) => {
            const drawn = reportSources.includes(source);
            const attribute = chartSources[source] ? "data-mobile-analysis-fetch" : "data-mobile-analysis-market";
            const country = window.AUTOGOOD_MARKET_COUNTRY?.[source] || "";
            // AutoScout24 shares Germany with mobile.de: named, not "DE" twice.
            const name = source === "autoscout" ? portalName(source) : window.AUTOGOOD_COUNTRY_NAME?.(country) || country;
            const label = drawn ? `${name} (${cleaned[source].length})` : `${name} — ${c.marketPickOn}`;
            const inner = `${window.AUTOGOOD_FLAG?.(country) || ""}<b>${escapeMarketHtml(source === "autoscout" ? "AS24" : country)}</b>`;
            return `<span class="mobileMarketChip${drawn ? "" : " isOff"}"${drawn ? "" : " data-report-hide"}>
              ${drawn
                ? `<span class="mobileMarketChipBody" title="${escapeMarketHtml(label)}">${inner}</span>`
                : `<button class="mobileMarketChipBody" type="button" ${attribute}="${source}" title="${escapeMarketHtml(label)}" aria-label="${escapeMarketHtml(label)}">${inner}</button>`}
              ${drawn ? marketToggleHtml(source, true, "data-mobile-analysis-market") : marketToggleHtml(source, false, attribute)}
            </span>`;
          }).join("")}
        </div>
      </div>`;
    const spec = window.AUTOGOOD_SPEC_SHEET?.({
      kicker: window.AUTOGOOD_SPEC_COPY?.().specSearchKicker || c.searchHeading,
      title: [filters.brand, filters.model, filters.version].filter(Boolean).join(" "),
      // The date stands once, top right of the report (the data's date).
      meta: "",
      // The same favourite star as on the search page.
      // "Odśwież dane" left of the favourite star.
      aside: `<button class="mobileMarketImportClear mobileMarketAsideRefresh" type="button" data-mobile-market-refresh data-report-hide>${escapeMarketHtml(c.refresh)}</button><button class="mobileSearchCountSaveButton mobileSearchSummaryStar mobileMarketAnalysisStar${historyEntry?.pinned ? " isPinned" : ""}" type="button" data-mobile-market-analysis-star data-report-hide aria-pressed="${historyEntry?.pinned ? "true" : "false"}" aria-label="${escapeMarketHtml(historyEntry?.pinned ? c.historyUnpin : c.historyPin)}" title="${escapeMarketHtml(historyEntry?.pinned ? c.historyUnpin : c.historyPin)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6 1-4.8 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6-4.8-4.7 6.6-1z" /></svg></button>${filters.priceFrom || filters.priceTo ? `<span class="agSpecPrice"><b>${escapeMarketHtml(searchSpecRange(filters.priceFrom, filters.priceTo, "EUR"))}</b></span>` : ""}`,
      columns: searchSpecColumns(filters, reportSources),
    }) || "";
    // The same bottom row as the chosen filters on page 1: "Gotowe" (when the
    // form holds unsaved changes), "Analiza rynku" and the offer count with a
    // link per compared market.
    const t = window.AUTOGOOD_SPEC_COPY?.() || {};
    const liveCount = (source) => document.querySelector({ mobile: "[data-mobile-search-count-mobilede]", otomoto: "[data-mobile-search-count]", blocket: "[data-mobile-search-count-blocket]", avby: "[data-mobile-search-count-avby]", autoscout: "[data-mobile-search-count-autoscout]" }[source])?.textContent.trim() || "—";
    const marketLinks = { mobile: searchUrl, otomoto: otomotoUrl, blocket: blocketUrl, avby: avbyUrl, autoscout: autoscoutUrl };
    const specFoot = `
      <div class="mobileSearchSummaryFoot" data-report-hide>
        <span class="mobileSearchSummaryFootLabel">${escapeMarketHtml(t.offerCountLabel || "")}</span>
        <div class="mobileSearchSummaryActions">
          ${historyDone && !historyDone.hidden ? `<button class="mobileSearchSummaryDone" type="button" data-mobile-analysis-done>${escapeMarketHtml(c.historyDone)} ✓</button>` : ""}
        </div>
        ${MARKET_SOURCES.map((source) => {
          const on = Boolean(chartSources[source]);
          const logo = on && marketLinks[source]
            ? `<a class="agBrandLink is${sourceClass(source)}" href="${escapeMarketHtml(marketLinks[source])}" target="_blank" rel="noopener" title="${escapeMarketHtml(sourceName(source))}" aria-label="${escapeMarketHtml(sourceName(source))}"><img src="${BRAND_LOGOS[source]}" alt="" /></a>`
            : `<button class="agBrandLink is${sourceClass(source)}" type="button"${on ? "" : ` data-mobile-analysis-market="${source}"`} title="${escapeMarketHtml(sourceName(source))}" aria-label="${escapeMarketHtml(sourceName(source))}"><img src="${BRAND_LOGOS[source]}" alt="" /></button>`;
          return `
          <div class="mobileSearchCountMarket${on ? "" : " isOff"}">
            <strong>${escapeMarketHtml(liveCount(source))}</strong>
            ${logo}
            ${marketToggleHtml(source, on, "data-mobile-analysis-market")}
          </div>`;
        }).join("")}
      </div>`;
    analysisContent.innerHTML = `
      <article class="mobileMarketAnalysisPanel">
        <div class="mobileMarketReportBrand">
          <img src="./assets/autogood-logo.png" alt="AUTOGOOD" />
          <span>${escapeMarketHtml(c.reportTitle)} · ${escapeMarketHtml(formatHistoryDate(dataDate || new Date().toISOString()))}</span>
        </div>

        <div data-report-hide>${analysisStatusHtml()}</div>

        <section class="mobileMarketCard mobileMarketSearchCard" aria-label="${escapeMarketHtml(c.searchHeading)}">
          ${spec}
          ${specFoot}
        </section>

        ${statsContent ? `
          <section class="mobileMarketCard mobileMarketStatsCard" aria-label="${escapeMarketHtml(c.statsHeading)}" data-report-list-hide>
            <div class="mobileMarketStatsHead">${blockTitle("percent", c.statsHeading)}${sourcesPicker}</div>
            ${statsContent}
          </section>` : ""}

        <section class="mobileMarketCard mobileMarketChartCard" aria-label="${escapeMarketHtml(c.distributionHeading)}" data-report-list-hide>
          ${hasListings ? (reportActionsInTitle
            ? `<div class="mobileMarketChartTitleRow">${blockTitle("gauge", c.distributionHeading)}${reportActions}</div>`
            : blockTitle("gauge", c.distributionHeading)) : ""}
          ${marketContent}
        </section>

        ${summaryContent}

        ${offersContent ? `
          <section class="mobileMarketCard mobileMarketOffersCard" aria-label="${escapeMarketHtml(c.tableHeading)}" data-report-hide-copy>
            ${offersContent}
          </section>` : ""}


      </article>`;
    window.AUTOGOOD_PREPARE_BOOKMARKLETS?.();
  }

  // ---- Client report: image and PDF -----------------------------------------
  // html-to-image lets the browser itself draw the page (SVG foreignObject),
  // so the report looks exactly like the screen. Tools, controls and the
  // favourites are hidden while it is drawn; the image copy also leaves out
  // the offer table and the price history.
  const scriptLoads = new Map();
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (!scriptLoads.has(src)) {
      scriptLoads.set(src, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
          scriptLoads.delete(src);
          reject(new Error(src));
        };
        document.head.append(script);
      }));
    }
    return scriptLoads.get(src);
  }

  let reportFontCss = null;
  // The page font (Google Fonts, Latin and Polish letters) inlined for the
  // drawing; the browser will not let html-to-image read that stylesheet.
  async function pageFontCss() {
    try {
      const link = document.querySelector('link[href*="fonts.googleapis.com/css"]');
      if (!link) return "";
      const css = await (await fetch(link.href)).text();
      const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)]
        .filter((match) => match[1] === "latin" || match[1] === "latin-ext")
        .map((match) => match[2]);
      const inlined = await Promise.all(faces.map(async (face) => {
        const url = (face.match(/url\(([^)]+)\)/) || [])[1];
        if (!url) return face;
        const blob = await (await fetch(url.replace(/["']/g, ""))).blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        return face.replace(url, `"${dataUrl}"`);
      }));
      return inlined.join("\n");
    } catch {
      return "";
    }
  }
  async function captureReport(mode, other = null) {
    await loadScript("./vendor/html-to-image.js?v=1.11.11", "htmlToImage");
    // The report is drawn from a copy placed off screen, so the page itself
    // (favourites, buttons) never changes while it is prepared. Page 3 passes
    // its own report (the cars saved for the client).
    const live = other || analysisContent.querySelector(".mobileMarketAnalysisPanel");
    const stage = document.createElement("div");
    const listMode = mode.startsWith("list");
    // The list report: the search (which car) and the offer table only.
    stage.className = `isReportCapture ${mode === "copy" ? "isReportCopy" : "isReportPdf"}${listMode ? " isReportList" : ""}`;
    stage.setAttribute("aria-hidden", "true");
    // One report width whatever the window: the client gets the same layout
    // (two charts side by side) from a laptop or a narrow window.
    stage.style.cssText = `position:fixed;top:0;left:-100000px;width:${Math.max(1100, live.getBoundingClientRect().width)}px;pointer-events:none;`;
    const root = live.cloneNode(true);
    stage.append(root);
    // Page 3's report: the analysis view is hidden there, the page holds it.
    (other ? document.body : analysisContent.parentElement).append(stage);
    try {
      // A moment for the hidden parts to leave the layout before measuring.
      await new Promise((resolve) => setTimeout(resolve, 60));
      const box = root.getBoundingClientRect();
      const within = (element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top - box.top, bottom: rect.bottom - box.top, left: rect.left - box.left, right: rect.right - box.left };
      };
      // Offer links (dots, table rows, cheapest/dearest in the history).
      const links = [...root.querySelectorAll("a[href^='http']")]
        .filter((link) => link.offsetParent !== null)
        .map((link) => ({ url: link.href, ...within(link) }))
        .filter((link) => link.bottom > link.top);
      // Where a page may end: between blocks and between table rows.
      const breaks = [...root.querySelectorAll(".mobileMarketCard, .mobileMarketTableBlock, tr, .mobileMarketChartHead, .mobileMarketXAxis")]
        .filter((element) => element.offsetParent !== null)
        .flatMap((element) => {
          const rect = within(element);
          return [rect.top, rect.bottom];
        });
      reportFontCss ??= await pageFontCss();
      // A long list as one picture: kept within the browser's canvas size.
      // Never below 1:1 (readable); sharper when the page is not too tall.
      const pixelRatio = Math.max(1, Math.min(2, Math.max(1.5, window.devicePixelRatio || 1), 30000 / Math.max(1, box.height)));
      const canvas = await window.htmlToImage.toCanvas(root, {
        pixelRatio,
        backgroundColor: "#ffffff",
        fontEmbedCSS: reportFontCss || undefined,
        // html-to-image would shrink a tall list to 16 384 px; Chrome draws more.
        skipAutoScale: true,
        width: Math.ceil(box.width),
        height: Math.ceil(box.height),
        // Hidden parts are not copied at all: that is most of the work.
        filter: (node) => !(node instanceof Element) || !(
          node.hasAttribute("data-report-hide")
          || (mode === "copy" && node.hasAttribute("data-report-hide-copy"))
          || (listMode && node.hasAttribute("data-report-list-hide"))
          || node.classList.contains("mobileMarketPointTooltip")
        ),
      });
      return { canvas, width: box.width, height: box.height, pixelRatio, links, breaks };
    } finally {
      stage.remove();
    }
  }

  // Copy = clipboard only, never a download. Browsers accept a clipboard
  // write only right after the click, and drawing takes a few seconds, so
  // the clipboard is asked at once and gets the picture as a promise.
  let lastReportImage = null;

  // Chrome refuses a clipboard write that waits seconds for its picture, so
  // the report's picture is drawn ahead, once the report is still for a
  // moment; a click then copies a finished image at once. Any change of the
  // report (not of its hidden buttons or status) draws it again.
  let preparedReports = {};
  let reportVersion = 0;
  let prepareTimer = 0;
  const toPngBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png");
  });
  // A copy button waits (disabled, "Przygotowuję obraz…") until its picture
  // is ready: a click then always writes a finished image, which Chrome
  // accepts; a write waiting for the drawing is what it refused.
  const COPY_BUTTONS = { copy: "[data-mobile-market-screenshot]", "list-copy": "[data-mobile-market-list-screenshot]" };
  function markCopyButtons(mode, ready) {
    analysisContent.querySelectorAll(COPY_BUTTONS[mode]).forEach((button) => {
      button.classList.toggle("isPreparing", !ready);
      button.disabled = !ready;
      if (!ready) button.title = copy().screenshotPreparing;
      else button.removeAttribute("title");
    });
  }
  async function prepareReportImage(mode = "copy") {
    const version = reportVersion;
    if (!analysisContent.querySelector(COPY_BUTTONS[mode]) || analysisView.hidden) {
      preparing[mode] = null;
      return;
    }
    try {
      const blob = await toPngBlob((await captureReport(mode)).canvas);
      if (version !== reportVersion) return;
      preparedReports[mode] = blob;
    } catch {
      // Drawn on the click instead.
    }
    if (version === reportVersion) markCopyButtons(mode, true);
  }
  function reportChanged() {
    reportVersion += 1;
    preparedReports = {};
    clearTimeout(prepareTimer);
    markCopyButtons("copy", false);
    markCopyButtons("list-copy", false);
  }
  // Drawing a picture holds the page for up to a second or two, so it is
  // drawn only when the pointer (or keyboard) comes to its buttons, not after
  // every change: switching favourites or markets stays instant.
  const preparing = {};
  function ensureReportImage(mode) {
    if (preparedReports[mode] || preparing[mode] === reportVersion) return;
    preparing[mode] = reportVersion;
    clearTimeout(prepareTimer);
    prepareTimer = setTimeout(() => prepareReportImage(mode), 120);
  }
  const prepareOnIntent = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".mobileMarketChartTitleRow, [data-mobile-market-screenshot], [data-mobile-market-pdf]")) ensureReportImage("copy");
    else if (target.closest(".mobileMarketTableHead, [data-mobile-market-list-screenshot]")) ensureReportImage("list-copy");
  };
  analysisContent.addEventListener("pointerover", prepareOnIntent);
  analysisContent.addEventListener("focusin", prepareOnIntent);
  new MutationObserver((records) => {
    const changed = records.some((record) => {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      return !element?.closest("[data-report-hide], .mobileMarketPointTooltip");
    });
    if (changed) reportChanged();
  }).observe(analysisContent, { childList: true, subtree: true, characterData: true });

  async function copyReportScreenshot(button, mode = "copy") {
    const c = copy();
    if (!navigator.clipboard?.write || !window.ClipboardItem) {
      setAnalysisStatus(c.screenshotNoClipboard, true);
      return;
    }
    // The picture drawn ahead, or one drawn a moment ago (the first try was
    // refused): copied at once, as a finished image.
    const recent = preparedReports[mode]
      || (lastReportImage && lastReportImage.mode === mode && Date.now() - lastReportImage.at < 120000 ? lastReportImage.blob : null);
    button.disabled = true;
    setAnalysisStatus(c.screenshotWorking);
    const blobPromise = recent ? Promise.resolve(recent) : captureReport(mode).then(({ canvas }) => toPngBlob(canvas));
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": recent || blobPromise })]);
      lastReportImage = null;
      setAnalysisStatus(c.screenshotCopied);
    } catch (error) {
      // The browser's own reason, for diagnosis (e.g. "Document is not focused").
      console.warn("AUTOGOOD copy refused:", error?.name, error?.message, recent ? "(ready image)" : "(image still drawing)");
      try {
        lastReportImage = { mode, blob: await blobPromise, at: Date.now() };
        setAnalysisStatus(c.screenshotRetry, true);
      } catch {
        setAnalysisStatus(c.screenshotFailed, true);
      }
    } finally {
      button.disabled = false;
    }
  }

  // The whole analysis as an A4 PDF: blocks one after another, cut between
  // blocks or table rows, every offer (dot, table row) a clickable link.
  async function downloadReportPdf(button, mode = "pdf", options = {}) {
    const c = copy();
    const say = options.onStatus || setAnalysisStatus;
    button.disabled = true;
    say(options.working || c.pdfWorking);
    try {
      await loadScript("./vendor/pdf-lib.min.js", "PDFLib");
      const { canvas, width, height, pixelRatio, links, breaks } = await captureReport(mode, options.live || null);
      const { PDFDocument, PDFName, PDFString } = window.PDFLib;
      const pdf = await PDFDocument.create();
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 24;
      const scale = (pageWidth - margin * 2) / width;
      const sliceHeight = (pageHeight - margin * 2) / scale;
      const sortedBreaks = [...new Set(breaks.map((value) => Math.round(value)))].sort((left, right) => left - right);
      let top = 0;
      while (top < height - 1) {
        let bottom = Math.min(height, top + sliceHeight);
        if (bottom < height) {
          const cut = sortedBreaks.filter((value) => value > top + sliceHeight * 0.35 && value <= bottom).pop();
          if (cut) bottom = cut;
        }
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.ceil((bottom - top) * pixelRatio);
        const context = slice.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, slice.width, slice.height);
        context.drawImage(canvas, 0, Math.floor(top * pixelRatio), canvas.width, slice.height, 0, 0, slice.width, slice.height);
        const jpeg = await pdf.embedJpg(slice.toDataURL("image/jpeg", 0.9));
        const page = pdf.addPage([pageWidth, pageHeight]);
        const drawnHeight = (bottom - top) * scale;
        page.drawImage(jpeg, { x: margin, y: pageHeight - margin - drawnHeight, width: pageWidth - margin * 2, height: drawnHeight });
        const annotations = links
          .filter((link) => link.top >= top && link.bottom <= bottom)
          .map((link) => pdf.context.register(pdf.context.obj({
            Type: "Annot",
            Subtype: "Link",
            Rect: [
              margin + link.left * scale,
              pageHeight - margin - (link.bottom - top) * scale,
              margin + link.right * scale,
              pageHeight - margin - (link.top - top) * scale,
            ],
            Border: [0, 0, 0],
            A: { Type: "Action", S: "URI", URI: PDFString.of(link.url) },
          })));
        if (annotations.length) page.node.set(PDFName.of("Annots"), pdf.context.obj(annotations));
        top = bottom;
      }
      const bytes = await pdf.save();
      const vehicle = [activeAnalysis?.filters?.brand, activeAnalysis?.filters?.model].filter(Boolean).join(" ");
      // Named in the program's language.
      const fileName = options.fileName || `AUTOGOOD ${mode === "list-pdf" ? c.fileList : c.fileReport} ${vehicle} ${new Date().toISOString().slice(0, 10)}.pdf`
        .replace(/[\\/:*?"<>|']+/g, "").replace(/\s+/g, " ");
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      say((options.ready || c.pdfReady).replace("{file}", fileName));
    } catch {
      say(options.failed || c.pdfFailed, true);
    } finally {
      button.disabled = false;
    }
  }

  // The filters' status line is hidden while the analysis is open, so the
  // analysis repeats the latest message in its own line.
  let analysisMessage = { text: "", isError: false };
  function analysisStatusHtml() {
    return `<p class="mobileMarketAnalysisStatus${analysisMessage.isError ? " isError" : ""}" aria-live="polite" data-mobile-market-analysis-status${analysisMessage.text ? "" : " hidden"}>${escapeMarketHtml(analysisMessage.text)}</p>`;
  }

  function setAnalysisStatus(message, isError = false) {
    if (typeof setMarketSearchStatus === "function") setMarketSearchStatus(message, isError);
    analysisMessage = { text: message || "", isError: Boolean(message) && isError };
    const line = analysisContent.querySelector("[data-mobile-market-analysis-status]");
    if (line) line.outerHTML = analysisStatusHtml();
  }

  async function openAnalysis() {
    const c = copy();
    try {
      const filters = readManualFields();
      if ((!filters.brand || !filters.model) && marketHistory.some((entry) => entry.pinned)) {
        setAnalysisStatus("");
        renderFavoritesPage();
        return;
      }
      if (!filters.brand || !filters.model) throw new Error(c.missingVehicle);
      const searchUrl = buildMobileDeSearchUrl(filters);
      const vehicleKey = vehicleDataKey(filters);
      if (importedDataset?.filterKey !== vehicleKey) importedDataset = null;
      const savedEntry = historyEntryForFilters(filters);
      // Otomoto samples saved before offers carried their place in the sorted
      // list cannot be laid out correctly, so those are fetched again.
      const previouslySelected = savedEntry?.filters?.markets || MARKET_SOURCES;
      const savedUsable = savedEntry?.listings?.length >= 3
        && filters.markets.every((source) => previouslySelected.includes(source))
        && savedEntry.listings.every((listing) => !["otomoto", "blocket", "avby", "autoscout"].includes(listingSource(listing)) || listing.rank);
      const savedListings = savedUsable ? savedEntry.listings : null;
      setAnalysisStatus(c.preparing);
      analysisOpens.forEach((button) => { button.disabled = true; });
      const provider = importedDataset || savedListings ? null : window.AUTOGOOD_MOBILE_MARKET_PROVIDER;
      // Otomoto being unreachable (or empty) still opens the analysis, so the
      // Mobile.de offers can be added to it.
      let providerError = "";
      let rawListings = importedDataset?.listings || savedListings || [];
      if (provider) {
        renderLoadingPage(filters);
        try {
          rawListings = await provider.getListings({ filters, searchUrl, pinned: Boolean(savedEntry?.pinned), historyId: savedEntry?.id || "" });
        } catch (error) {
          providerError = error.message || c.invalidData;
        }
      }
      const normalizedListings = normalizeListings(rawListings);
      let listings = provider && savedEntry?.listings?.length
        ? mergeBySource(savedEntry.listings, normalizedListings)
        : normalizedListings;
      if (pendingMobile?.listings?.length) {
        listings = mergeBySource(listings, pendingMobile.listings);
        pendingMobile = null;
      }
      const fetchedFromProvider = Boolean(provider) && normalizedListings.length >= 3;
      // A fetched price sample belongs to the saved search, so the history row
      // shows how many offers it is based on.
      if (fetchedFromProvider) measureNextSnapshot(provider.lastSources || ["otomoto"], true, provider.lastPrices ?? null);
      const snapshot = fetchedFromProvider
        ? (savedEntry
          ? updateMarketSnapshot(savedEntry.id, filters, listings, provider.id, searchUrl)
          : createMarketSnapshot(filters, listings, provider.id, searchUrl))
        : null;
      activeAnalysis = {
        filters,
        listings,
        searchUrl,
        providerId: importedDataset ? "import" : (savedListings ? "history" : (provider?.id || "empty")),
        sourceFileName: importedDataset?.fileName || snapshot?.sourceFileName || savedEntry?.sourceFileName || "",
        historyId: snapshot?.id || savedEntry?.id || "",
        fetchedAt: provider && listings.length ? new Date().toISOString() : "",
      };
      analysisMessage = { text: providerError, isError: Boolean(providerError) };
      renderAnalysis();
      setManualViewHidden(true);
      analysisView.hidden = false;
      setAnalysisStatus(providerError, Boolean(providerError));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setAnalysisStatus(error.message || c.invalidData, true);
    } finally {
      analysisOpens.forEach((button) => { button.disabled = false; });
    }
  }

  function closeAnalysis() {
    analysisView.hidden = true;
    setManualViewHidden(false);
    requestAnimationFrame(() => analysisOpen.focus());
  }

  function renderMarketTranslations() {
    const c = copy();
    document.querySelectorAll("[data-market-i18n]").forEach((node) => {
      const value = c[node.dataset.marketI18n];
      if (value) node.textContent = value;
    });
    document.querySelectorAll("[data-market-icon-label]").forEach((button) => {
      const value = c[button.dataset.marketIconLabel];
      if (!value) return;
      button.setAttribute("aria-label", value);
      button.title = value;
    });
    renderHistory();
    renderMarketPicker();
    renderAnalysis();
    // The "pick a car" page has no analysis to redraw: drawn again in the new language.
    if (!activeAnalysis && !analysisView.hidden) renderFavoritesPage();
    renderFavoritesBar();
  }

  analysisContent.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-mobile-market-file]");
    if (!input?.files?.[0] || !activeAnalysis) return;
    const c = copy();
    try {
      const imported = await parseListingFile(input.files[0]);
      if (imported.length < 3) throw new Error(c.importInvalid);
      // A Mobile.de file joins the Otomoto sample instead of replacing it.
      const listings = mergeBySource(activeAnalysis.listings, imported);
      importedDataset = {
        listings,
        fileName: input.files[0].name,
        filterKey: vehicleDataKey(activeAnalysis.filters),
      };
      activeAnalysis = {
        ...activeAnalysis,
        listings,
        providerId: "import",
        sourceFileName: input.files[0].name,
      };
      measureNextSnapshot(["mobile"], false);
      const snapshot = activeAnalysis.historyId
        ? updateMarketSnapshot(activeAnalysis.historyId, activeAnalysis.filters, listings, input.files[0].name, activeAnalysis.searchUrl)
        : createMarketSnapshot(activeAnalysis.filters, listings, input.files[0].name, activeAnalysis.searchUrl);
      if (snapshot) activeAnalysis.historyId = snapshot.id;
      setAnalysisStatus("");
      renderAnalysis();
    } catch (error) {
      setAnalysisStatus(error instanceof SyntaxError ? c.importReadError : (error.message || c.importReadError), true);
      input.value = "";
    }
  });

  async function refreshActiveAnalysis() {
    if (!activeAnalysis) return;
    const c = copy();
    const provider = window.AUTOGOOD_MOBILE_MARKET_PROVIDER;
    if (!provider || typeof provider.getListings !== "function") {
      setAnalysisStatus(c.refreshUnavailable, true);
      return;
    }
    try {
      setAnalysisStatus(c.refreshing);
      const fetched = normalizeListings(await provider.getListings({
        filters: activeAnalysis.filters,
        searchUrl: activeAnalysis.searchUrl,
        pinned: Boolean(marketHistory.find((entry) => entry.id === activeAnalysis.historyId)?.pinned),
        historyId: activeAnalysis.historyId || "",
      }));
      if (fetched.length < 3) throw new Error(c.refreshInvalid);
      // Refreshing Otomoto keeps any Mobile.de offers already in the analysis.
      const listings = mergeBySource(activeAnalysis.listings, fetched);
      measureNextSnapshot(provider.lastSources || ["otomoto"], true, provider.lastPrices ?? null);
      const snapshot = activeAnalysis.historyId
        ? updateMarketSnapshot(activeAnalysis.historyId, activeAnalysis.filters, listings, "API", activeAnalysis.searchUrl)
        : createMarketSnapshot(activeAnalysis.filters, listings, "API", activeAnalysis.searchUrl);
      if (!snapshot) return;
      importedDataset = null;
      activeAnalysis = {
        ...activeAnalysis,
        listings,
        providerId: provider.id || "api",
        sourceFileName: "API",
        historyId: snapshot.id,
      };
      renderAnalysis();
      setAnalysisStatus(c.snapshotSaved.replace("{date}", formatHistoryDate(new Date().toISOString())));
    } catch (error) {
      setAnalysisStatus(error.message || c.refreshInvalid, true);
    }
  }

  // Mobile.de offers read by the bookmarklet on the result list.
  window.AUTOGOOD_ADD_MOBILE_LISTINGS = (rows, meta = {}) => {
    const c = copy();
    const listings = normalizeListings(rows).map((listing) => ({ ...listing, source: "mobile" }));
    if (!listings.length) return;
    const message = withCount(c.mobileAdded, listings.length).replace("{total}", String(meta.total || listings.length));
    if (!activeAnalysis || analysisView.hidden) {
      pendingMobile = { listings };
      setAnalysisStatus(c.mobilePending.replace("{count}", String(listings.length)));
      return;
    }
    const merged = mergeBySource(activeAnalysis.listings, listings);
    measureNextSnapshot(["mobile"], false);
    const snapshot = activeAnalysis.historyId
      ? updateMarketSnapshot(activeAnalysis.historyId, activeAnalysis.filters, merged, "mobile.de", activeAnalysis.searchUrl)
      : createMarketSnapshot(activeAnalysis.filters, merged, "mobile.de", activeAnalysis.searchUrl);
    activeAnalysis = { ...activeAnalysis, listings: merged, historyId: snapshot?.id || activeAnalysis.historyId };
    renderAnalysis();
    setAnalysisStatus(message);
    window.focus();
  };

  // The comparison price is applied when the field is left or Enter is
  // pressed; re-drawing on every key would take the cursor out of the field.
  analysisContent.addEventListener("change", (event) => {
    const input = event.target.closest("[data-mobile-market-compare-price]");
    if (!input || !activeAnalysis) return;
    activeAnalysis.comparePrice = input.value.replace(/[^\d\s]/g, "").trim();
    renderAnalysis();
  });

  analysisContent.addEventListener("click", (event) => {
    if (event.target.closest("[data-mobile-analysis-done]")) {
      historyDone?.click();
      renderAnalysis();
      return;
    }
    if (event.target.closest("[data-mobile-analysis-rerun]")) {
      openAnalysis();
      return;
    }
    const analysisStar = event.target.closest("[data-mobile-market-analysis-star]");
    if (analysisStar && activeAnalysis) {
      refreshMarketHistory();
      const entry = marketHistory.find((item) => item.id === activeAnalysis.historyId) || historyEntryForFilters(activeAnalysis.filters);
      if (entry) setHistoryPinned(entry.id, !entry.pinned);
      else {
        const snapshot = createMarketSnapshot(activeAnalysis.filters, activeAnalysis.listings, activeAnalysis.sourceFileName || "", activeAnalysis.searchUrl, true);
        if (snapshot) activeAnalysis = { ...activeAnalysis, historyId: snapshot.id };
      }
      renderAnalysis();
      updateHistorySaveButtons();
      return;
    }
    const removeFavorite = event.target.closest("[data-mobile-market-favorite-remove]");
    if (removeFavorite) {
      setHistoryPinned(removeFavorite.dataset.mobileMarketFavoriteRemove, false);
      if (activeAnalysis) renderAnalysis();
      else renderFavoritesPage();
      return;
    }
    const listShot = event.target.closest("[data-mobile-market-list-screenshot]");
    if (listShot) {
      copyReportScreenshot(listShot, "list-copy");
      return;
    }
    const listPdf = event.target.closest("[data-mobile-market-list-pdf]");
    if (listPdf) {
      downloadReportPdf(listPdf, "list-pdf");
      return;
    }
    if (event.target.closest("[data-mobile-analysis-fetch]") && activeAnalysis) {
      refreshActiveAnalysis();
      return;
    }
    const marketButton = event.target.closest("[data-mobile-analysis-market]");
    if (marketButton && activeAnalysis) {
      const source = marketButton.dataset.mobileAnalysisMarket;
      const next = { ...chartSources, [source]: !chartSources[source] };
      if (!MARKET_SOURCES.some((item) => next[item])) {
        setAnalysisStatus(copy().marketPickerLast, true);
        return;
      }
      setChartSources(next);
      renderHistory();
      updateSelectedFiltersSummary?.();
      const hasPrices = activeAnalysis.listings.some((listing) => listingSource(listing) === source);
      if (next[source] && !hasPrices) refreshActiveAnalysis();
      else renderAnalysis();
      return;
    }
    const pdfButton = event.target.closest("[data-mobile-market-pdf]");
    if (pdfButton) {
      downloadReportPdf(pdfButton);
      return;
    }
    const screenshot = event.target.closest("[data-mobile-market-screenshot]");
    if (screenshot) {
      copyReportScreenshot(screenshot);
      return;
    }
    const favorite = event.target.closest("[data-mobile-market-favorite]");
    if (favorite) {
      openFavorite(favorite.dataset.mobileMarketFavorite);
      return;
    }
    const fetchMobile = event.target.closest("[data-mobile-market-fetch-mobile]");
    if (fetchMobile && activeAnalysis) {
      // A tab this page keeps a handle on: the bookmark there answers it directly.
      window.open(buildMobileDeSearchUrl(activeAnalysis.filters), "_blank");
      setAnalysisStatus(copy().fetchMobileHint);
      return;
    }
    const bookmarklet = event.target.closest("[data-autogood-bookmarklet]");
    if (bookmarklet) {
      event.preventDefault();
      window.AUTOGOOD_BRIDGE_HINT?.();
      return;
    }
    const axisButton = event.target.closest("[data-mobile-market-axis]");
    if (axisButton) {
      chartAxis = axisButton.dataset.mobileMarketAxis;
      renderAnalysis();
      return;
    }
    const scaleButton = event.target.closest("[data-mobile-market-scale]");
    if (scaleButton) {
      chartScale = scaleButton.dataset.mobileMarketScale === "own" ? "own" : "shared";
      try {
        localStorage.setItem(CHART_SCALE_KEY, chartScale);
      } catch {
        // Not remembered; the switch still works on this page.
      }
      renderAnalysis();
      return;
    }
    const sortButton = event.target.closest("[data-mobile-market-sort]");
    if (sortButton) {
      const key = sortButton.dataset.mobileMarketSort;
      tableSort = tableSort.key === key
        ? { key, direction: tableSort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" };
      renderAnalysis();
      return;
    }
    const refreshButton = event.target.closest("[data-mobile-market-refresh]");
    if (refreshButton) {
      refreshActiveAnalysis();
      return;
    }
    const clearButton = event.target.closest("[data-mobile-market-import-clear]");
    if (!clearButton || !activeAnalysis) return;
    importedDataset = null;
    // Removing the file drops only the Mobile.de offers it brought in.
    const listings = activeAnalysis.listings.filter((listing) => listingSource(listing) !== "mobile");
    activeAnalysis = {
      ...activeAnalysis,
      listings,
      providerId: listings.length ? "otomoto" : "empty",
      sourceFileName: "",
    };
    renderAnalysis();
  });

  // A table row lights up its dot on the chart.
  const highlightMarketPoint = (key, on) => {
    analysisContent.querySelectorAll(".mobileMarketPoint.isHighlighted").forEach((point) => point.classList.remove("isHighlighted"));
    if (!on || !key) return;
    analysisContent.querySelectorAll(".mobileMarketPoint").forEach((point) => {
      if (point.dataset.marketKey === key) point.classList.add("isHighlighted");
    });
  };
  analysisContent.addEventListener("mouseover", (event) => {
    const row = event.target.closest("tr[data-market-key]");
    if (row) highlightMarketPoint(row.dataset.marketKey, true);
  });
  analysisContent.addEventListener("mouseout", (event) => {
    const row = event.target.closest("tr[data-market-key]");
    if (row && !row.contains(event.relatedTarget)) highlightMarketPoint("", false);
  });

  historySaves.forEach((button) => button.addEventListener("click", toggleCurrentHistoryFavorite));
  document.querySelectorAll("[data-mobile-manual-reset]").forEach((button) => button.addEventListener("click", () => {
    editingHistoryId = "";
    // Clearing the form lets go of the picked favourite.
    setSelectedFavorite("");
    renderFavoritesBar();
    setTimeout(updateHistorySaveButtons);
  }));
  const manualForm = document.querySelector(".mobileManualForm");
  const updateManualHistoryState = () => {
    updateHistoryConfirm();
    updateHistorySaveButtons();
  };
  manualForm?.addEventListener("input", () => setTimeout(updateManualHistoryState));
  manualForm?.addEventListener("change", () => setTimeout(updateManualHistoryState));
  historyDone?.addEventListener("click", () => {
    if (editingHistoryId) confirmHistoryChanges(editingHistoryId);
  });
  const handleHistoryClick = (event) => {
    const confirmButton = event.target.closest("[data-mobile-market-history-confirm]");
    if (confirmButton) {
      confirmHistoryChanges(confirmButton.dataset.mobileMarketHistoryConfirm);
      return;
    }
    const deleteButton = event.target.closest("[data-mobile-market-history-delete]");
    if (deleteButton) {
      deleteHistoryEntry(deleteButton.dataset.mobileMarketHistoryDelete);
      return;
    }
    const pinButton = event.target.closest("[data-mobile-market-history-pin]");
    if (pinButton) {
      setHistoryPinned(pinButton.dataset.mobileMarketHistoryPin, pinButton.dataset.mobileMarketHistoryPinned !== "true");
      return;
    }
    const selection = event.target.closest("[data-mobile-market-history-select]");
    if (selection) {
      event.preventDefault();
      if (editingHistoryId === selection.value) clearHistorySelection();
      else selectHistoryEntry(selection.value);
      return;
    }
    const button = event.target.closest("[data-mobile-market-history-analysis]");
    if (button) openHistoryAnalysis(button.dataset.mobileMarketHistoryAnalysis);
  };
  historyLists.forEach((list) => list.addEventListener("click", handleHistoryClick));
  // The calculator's rate arrives after the page: an open analysis counts
  // "na gotowo" again with it (before, it kept the old rates-file rate).
  window.addEventListener("autogood:rates", () => {
    if (activeAnalysis) renderAnalysis();
  });
  analysisOpens.forEach((button) => button.addEventListener("click", openAnalysis));
  analysisBack.addEventListener("click", closeAnalysis);
  document.querySelectorAll("[data-lang-button]").forEach((button) => {
    button.addEventListener("click", () => requestAnimationFrame(renderMarketTranslations));
  });

  // ---- Pages -----------------------------------------------------------
  // 1 search, 2 analysis, 3 history, 4 favourites' search. The page is kept
  // in the address (#analiza…) so a reload stays on it.
  // Page 4 was merged into page 3 "Monitoring" (2026-10-03): its old
  // addresses open page 3.
  const PAGE_HASHES = { search: "", analysis: "#analiza", history: "#monitoring" };
  const LEGACY_PAGE_HASHES = { "#historia": "history", "#ulubione": "history" };
  const pageTabs = Array.from(document.querySelectorAll("[data-mobile-page-tab]"));

  function currentPage() {
    if (!analysisView.hidden) return "analysis";
    if (historyView && !historyView.hidden) return "history";
    if (favoritesView && !favoritesView.hidden) return "favorites";
    return "search";
  }

  function markCurrentPage() {
    const page = currentPage();
    pageTabs.forEach((tab) => {
      if (tab.dataset.mobilePageTab === page) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    const hash = PAGE_HASHES[page];
    if ((location.hash || "") !== hash && !/^#autogood-import=/.test(location.hash)) {
      history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    }
  }

  // The picked favourite shown on a page: form (1), analysis (2), price
  // history (3), its card first (4). Nothing is reloaded if it already shows.
  function showSelectedFavoriteOn(page) {
    const entry = selectedFavorite();
    if (!entry) return false;
    if (page === "search") {
      if (editingHistoryId !== entry.id) selectHistoryEntry(entry.id);
      return false;
    }
    if (page === "analysis") {
      // The form holds this favourite (maybe with unsaved changes): analyse
      // what the form says; otherwise the favourite as saved.
      if (editingHistoryId === entry.id) openAnalysis();
      else openFavorite(entry.id);
      return true;
    }
    if (page === "history") priceHistoryId = entry.id;
    if (page === "favorites") favoritesSelectedId = entry.id;
    return false;
  }

  function showPage(page) {
    if (page === "favorites") page = "history";
    if (showSelectedFavoriteOn(page)) return;
    if (page === "analysis") {
      let filters = {};
      try {
        filters = readManualFields();
      } catch {
        filters = {};
      }
      if (filters.brand && filters.model) openAnalysis();
      else {
        setAnalysisStatus("");
        renderFavoritesPage();
      }
      return;
    }
    analysisView.hidden = true;
    manualView.hidden = page !== "search";
    if (listingFrame) listingFrame.hidden = page !== "search";
    if (historyView) historyView.hidden = page !== "history";
    if (favoritesView) favoritesView.hidden = page !== "favorites";
    if (page === "favorites") renderFavoritesSearchPage();
    if (page === "history") renderPriceHistoryPage();
    markCurrentPage();
    renderFavoritesBar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  pageTabs.forEach((tab) => tab.addEventListener("click", () => showPage(tab.dataset.mobilePageTab)));
  [analysisView, historyView, favoritesView].filter(Boolean)
    .forEach((view) => new MutationObserver(markCurrentPage).observe(view, { attributes: true, attributeFilter: ["hidden"] }));

  // Favourites bar and page 4: open a car's analysis, show its filters, unpin it.
  // Unpicking the favourite empties the current page (the favourite itself
  // stays saved): 1 the form, 2 the report, 3 its price history, 4 the mark.
  function releaseSelectedFavorite() {
    const page = currentPage();
    // The form's reset also lets go of the favourite and renders the bar.
    clearHistorySelection();
    setSelectedFavorite("");
    if (page === "analysis") renderFavoritesPage();
    if (page === "history") {
      priceHistoryId = null;
      renderPriceHistoryPage();
    }
    if (page === "favorites") {
      favoritesSelectedId = "";
      renderFavoritesSearchPage();
    }
    renderFavoritesBar();
  }

  const handleFavoriteClick = (event) => {
    const removeFavorite = event.target.closest("[data-mobile-market-favorite-remove]");
    if (removeFavorite) {
      setHistoryPinned(removeFavorite.dataset.mobileMarketFavoriteRemove, false);
      return;
    }
    const filtersButton = event.target.closest("[data-mobile-favorite-filters]");
    if (filtersButton) {
      const entry = marketHistory.find((item) => item.id === filtersButton.dataset.mobileFavoriteFilters);
      if (entry) {
        setSelectedFavorite(entry.id);
        showPage("search");
      }
      return;
    }
    const favorite = event.target.closest("[data-mobile-market-favorite]");
    if (!favorite) return;
    const id = favorite.dataset.mobileMarketFavorite;
    // The picked favourite clicked again lets it go and clears this page.
    if (event.currentTarget === favoritesBar && id === selectedFavorite()?.id) {
      releaseSelectedFavorite();
      return;
    }
    setSelectedFavorite(id);
    // A favourite in the pinned bar keeps the page and shows this car there:
    // 1 fills the form to be refined ("Gotowe" saves it), 2 its analysis,
    // 3 its price history, 4 its card in the favourites' search.
    if (event.currentTarget === favoritesBar) {
      const page = currentPage();
      if (page === "search") {
        selectHistoryEntry(id);
        renderFavoritesBar();
        return;
      }
      if (page === "history") {
        priceHistoryId = id;
        renderPriceHistoryPage();
        renderFavoritesBar();
        scrollToPageContent(historyView);
        return;
      }
      if (page === "favorites") {
        favoritesSelectedId = id;
        renderFavoritesSearchPage();
        renderFavoritesBar();
        scrollToPageContent(favoritesPage?.querySelector(".isSelected"));
        return;
      }
    }
    openFavorite(id);
  };
  favoritesBar?.addEventListener("click", handleFavoriteClick);
  favoritesPage?.addEventListener("click", handleFavoriteClick);

  // A grey logo is not a link: clicking it brings the portal back, like "+".
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".mobileManualPanel .mobileSearchCountMarket[data-market]");
    if (!item) return;
    const toggle = event.target.closest("[data-mobile-market-pick]");
    const greyLogo = item.classList.contains("isOff") && event.target.closest(".agBrandLink");
    if (!toggle && !greyLogo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const source = item.dataset.market;
    const next = { ...chartSources, [source]: !chartSources[source] };
    if (!MARKET_SOURCES.some((item) => next[item])) {
      setMarketSearchStatus?.(copy().marketPickerLast, true);
      return;
    }
    applyChartSources(next);
  }, true);

  function applyChartSources(next) {
    setChartSources(next);
    if (activeAnalysis) renderAnalysis();
    renderHistory();
    updateHistoryConfirm();
    updateSelectedFiltersSummary?.();
  }

  // The portal chosen for the link (step 1) is mirrored in step 2 alone.
  window.AUTOGOOD_SET_ONLY_MARKET = (source) => {
    if (!MARKET_SOURCES.includes(source)) return;
    if (MARKET_SOURCES.every((item) => Boolean(chartSources[item]) === (item === source))) return;
    applyChartSources({ [source]: true });
  };

  window.AUTOGOOD_SELECTED_MARKETS = () => MARKET_SOURCES.filter((source) => chartSources[source]);
  // av.by compared (Belarus): the page opens in Russian, as when av.by is picked.
  if (chartSources.avby && document.documentElement.lang !== "ru") {
    setTimeout(() => document.querySelector('[data-lang-button="ru"]')?.click(), 0);
  }
  window.AUTOGOOD_MOBILE_LOG_SEARCH = logSearchToHistory;

  // Entering filters writes the search into the history by itself (a few
  // seconds after the last change). While the same car is being refined, one
  // entry follows the changes instead of a new entry per click; an entry
  // opened from the history for editing is left alone.
  let autoLogTimer = 0;
  let autoLogId = "";
  function autoLogSearch() {
    if (editingHistoryId) return;
    let filters;
    try {
      filters = readManualFields();
    } catch {
      return;
    }
    if (!filters.brand || !filters.model) return;
    let searchUrl;
    try {
      searchUrl = buildMobileDeSearchUrl(filters);
    } catch {
      return;
    }
    refreshMarketHistory();
    const same = historyEntryForFilters(filters);
    if (same) {
      autoLogId = same.pinned ? "" : same.id;
      return;
    }
    const draft = autoLogId && marketHistory.find((entry) => entry.id === autoLogId && !entry.pinned);
    if (draft && draft.filters.brand === filters.brand && draft.filters.model === filters.model) {
      updateMarketSnapshot(draft.id, filters, [], "", searchUrl);
    } else {
      autoLogId = createMarketSnapshot(filters, [], "", searchUrl)?.id || "";
    }
  }
  const scheduleAutoLog = () => {
    window.clearTimeout(autoLogTimer);
    autoLogTimer = window.setTimeout(autoLogSearch, 2500);
  };
  document.querySelector(".mobileManualForm")?.addEventListener("input", scheduleAutoLog);
  document.querySelector(".mobileManualForm")?.addEventListener("change", scheduleAutoLog);
  // Used by the sticky panel to show how many offers the filters match.
  window.AUTOGOOD_MOBILE_OTOMOTO_COUNT = async (filters) => (await fetchOtomotoPage(buildOtomotoSearchUrl(filters), 1)).total;
  if (!window.AUTOGOOD_MOBILE_MARKET_PROVIDER) window.AUTOGOOD_MOBILE_MARKET_PROVIDER = otomotoProvider;

  fetch("./data/exchange-rates.json")
    .then((response) => (response.ok ? response.json() : null))
    .then((rates) => {
      // The calculator's live rate (turnkey-estimate.js) wins over the file.
      if (rates && !window.AUTOGOOD_EXCHANGE_RATES?.calculator) window.AUTOGOOD_EXCHANGE_RATES = rates;
    })
    .catch(() => {
      // Without a rate the budget line is simply not shown.
    });

  // Page 4 (src/mobile-favorites-watch.js) draws with the same helpers.
  window.AUTOGOOD_MARKET_HELPERS = {
    language: currentLanguage,
    marketBadge,
    historyMeta,
    priceInPln,
    selectedMarkets: () => MARKET_SOURCES.filter((source) => chartSources[source]),
    brandLogo: (source) => BRAND_LOGOS[source],
    brandMark: (source) => BRAND_MARKS[source],
    hasFavorites: () => marketHistory.some((entry) => entry.pinned),
  };

  marketHistory = loadMarketHistory();
  // A favourite starred or removed in another tab shows up here at once.
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== HISTORY_STORAGE_KEY && event.key !== FAVORITES_BACKUP_KEY) return;
    refreshMarketHistory();
    renderHistory();
  });
  renderMarketTranslations();
  // A reload stays on the page it was on (#historia, #ulubione, #analiza).
  const startPage = Object.keys(PAGE_HASHES).find((page) => PAGE_HASHES[page] && PAGE_HASHES[page] === location.hash) || LEGACY_PAGE_HASHES[location.hash];
  if (startPage) showPage(startPage);
  else {
    // Page 1 after a reload: the favourite still picked in the bar fills the
    // form again and is edited as itself ("Gotowe" updates it), instead of a
    // highlighted favourite over an empty form, whose filters typed by hand
    // would make a second card of the same car.
    const picked = selectedFavorite();
    if (picked && !/^#autogood-import=/.test(location.hash)) selectHistoryEntry(picked.id);
    markCurrentPage();
  }
})();
