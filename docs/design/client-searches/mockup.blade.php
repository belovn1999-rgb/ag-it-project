{{--
    Макет «Несколько поисков у одного клиента», вариант B с правками владельца 29.10 — НЕ код платформы: статичная
    страница на деталях платформы. Цифры — для примера (Toyota RAV4 и Kia Sportage, клиент Jan Kowalski, бюджет 140 000 zł).
    $part: 'screen' — подборка с двумя поисками, открыт RAV4, в «Анализе» показан один поиск;
           'both'   — «Анализ» с выбором «Оба поиска»;
           'single' — подборка с одним поиском: как сейчас, блока поисков нет, только кнопка «+ Ещё поиск для клиента»;
           'pdf'    — лист 1 общего PDF для клиента (по-польски): карточки B + полоса цен на одной шкале из A.
--}}
@php
    $part ??= 'screen';
    $searches = [
        ['name' => 'Toyota RAV4', 'cond' => 'гибрид · 2020–2022 · до 100 000 км', 'condPl' => 'hybryda · 2020–2022 · do 100 000 km · automat',
            'median' => '131 400 zł', 'min' => '112 300 zł', 'count' => 214, 'km' => '68 400 км', 'kmPl' => '68 400 km', 'days' => '24 дня', 'daysPl' => '24 dni',
            'budgetPl' => '61 z 214', 'chance' => ['умеренный', 'umiarkowana', 'warn'], 'pl' => '139 900 zł'],
        ['name' => 'Kia Sportage', 'cond' => 'гибрид · 2022–2023 · до 60 000 км', 'condPl' => 'hybryda · 2022–2023 · do 60 000 km · automat',
            'median' => '118 900 zł', 'min' => '101 700 zł', 'count' => 173, 'km' => '31 200 км', 'kmPl' => '31 200 km', 'days' => '37 дней', 'daysPl' => '37 dni',
            'budgetPl' => '124 z 173', 'chance' => ['высокий', 'wysoka', 'good'], 'pl' => '129 000 zł'],
    ];
    // Рынки каждого поиска: машин, самое дешёвое, медиана, P25–P75, пробег; полоса: мин, P25, медиана, P75, макс в % шкалы 100–160 тыс. zł.
    $markets = [
        [0, 'DE', 'Германия', 128, '112 300 zł', '131 400 zł', '124 900 – 139 800 zł', '68 400 км', [20.5, 41.5, 52.3, 66.3, 96.7]],
        [0, 'PL', 'Польша', 86, '121 500 zł', '139 900 zł', '132 000 – 149 000 zł', '61 200 км', [35.8, 53.3, 66.5, 81.7, 99]],
        [1, 'DE', 'Германия', 97, '101 700 zł', '118 900 zł', '111 800 – 126 400 zł', '31 200 км', [2.8, 19.7, 31.5, 44, 68.3]],
        [1, 'PL', 'Польша', 76, '109 900 zł', '129 000 zł', '121 000 – 136 500 zł', '27 800 км', [16.5, 35, 48.3, 60.8, 86.7]],
    ];
    $tone = [0 => ['bg-brand/20 border-brand/50', 'bg-brand', 'text-brand'], 1 => ['bg-good/20 border-good/50', 'bg-good', 'text-good']];
    $flag = fn (string $c) => $c === 'DE'
        ? '<span class="inline-flex h-3 w-4.5 flex-col overflow-hidden rounded-[2px]"><i class="flex-1 bg-[#1c1c1c]"></i><i class="flex-1 bg-[#d4202b]"></i><i class="flex-1 bg-[#f2c200]"></i></span>'
        : '<span class="inline-flex h-3 w-4.5 flex-col overflow-hidden rounded-[2px] ring-1 ring-line"><i class="flex-1 bg-white"></i><i class="flex-1 bg-[#d4202b]"></i></span>';
@endphp
<!DOCTYPE html>
<html lang="{{ $part === 'pdf' ? 'pl' : 'ru' }}">
<head>
    @include('partials.head', ['lightOnly' => true])
</head>
<body class="min-h-screen {{ $part === 'pdf' ? 'bg-chip' : 'bg-page' }} text-[15px] leading-normal text-ink antialiased">

@if ($part === 'pdf')
{{-- Лист 1 общего PDF для клиента, A4 (794 px), по-польски --}}
<div class="mx-auto my-6 flex w-[794px] flex-col gap-4 bg-white px-10 py-9 shadow">
    <div class="flex items-start justify-between border-b border-line pb-3">
        <div>
            <p class="text-lg font-bold">[Nazwa firmy]</p>
            <p class="text-caption text-muted">+48 … · biuro@…</p>
        </div>
        <div class="text-right">
            <span class="inline-flex size-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">AG</span>
            <p class="mt-1 text-caption text-muted">29.10.2026</p>
        </div>
    </div>
    <div>
        <p class="text-caption uppercase tracking-wide text-muted">Porównanie wariantów dla</p>
        <h1 class="text-[26px] font-semibold leading-tight">Jan Kowalski <span class="text-lg font-normal text-ink-soft">· budżet 140 000 zł</span></h1>
    </div>
    <div class="grid grid-cols-2 gap-4">
        @foreach ($searches as $i => $s)
            @php $better = $i === 1; @endphp
            <section @class(['flex flex-col gap-2 rounded-xl border p-4', 'border-good ring-2 ring-good/15' => $better, 'border-line' => ! $better])>
                <div class="flex items-center justify-between gap-2">
                    <p class="text-lg font-semibold leading-snug">{{ $i + 1 }}. {{ $s['name'] }}</p>
                    @if ($better)<span class="rounded-md bg-good px-2 py-0.5 text-[11px] font-semibold text-white">Taniej o 12 500 zł</span>@endif
                </div>
                <p class="-mt-1 text-[12px] text-muted">{{ $s['condPl'] }}</p>
                <p class="text-[12px] text-muted">„Na gotowo”, mediana · Niemcy</p>
                <p @class(['text-[28px] font-semibold leading-none tabular-nums', 'text-good' => $better])>{{ $s['median'] }}</p>
                <p class="text-[12px] text-ink-soft">od {{ $s['min'] }} · w Polsce {{ $s['pl'] }}</p>
                <dl class="mt-1 grid grid-cols-2 gap-2 border-t border-line-soft pt-2 text-[13px]">
                    <div><dt class="text-[11px] text-muted">Ofert</dt><dd class="font-medium">{{ $s['count'] }}</dd></div>
                    <div><dt class="text-[11px] text-muted">Przebieg</dt><dd class="font-medium">{{ $s['kmPl'] }}</dd></div>
                    <div><dt class="text-[11px] text-muted">Sprzedaje się w</dt><dd class="font-medium">{{ $s['daysPl'] }}</dd></div>
                    <div><dt class="text-[11px] text-muted">W budżecie</dt><dd class="font-medium">{{ $s['chance'][1] }} · {{ $s['budgetPl'] }}</dd></div>
                </dl>
            </section>
        @endforeach
    </div>

    {{-- Полоса цен из варианта A: оба поиска на одной шкале, креска — медиана, линия — бюджет клиента --}}
    <div class="flex flex-col gap-2 rounded-xl border border-line-soft px-4 py-3">
        <p class="text-[13px] font-semibold">Ceny „na gotowo” na jednej skali (Niemcy)</p>
        <div class="relative flex flex-col gap-3 pt-5">
            <div class="pointer-events-none absolute inset-y-0" style="left: 108px; right: 108px">
                <div class="absolute top-4 bottom-0 border-l-2 border-dashed border-ink" style="left: 66.7%"></div>
                <span class="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-white px-1 text-[11px] font-semibold" style="left: 66.7%">Budżet 140 000 zł</span>
            </div>
            @foreach ([[0, 20.5, 52.3, 96.7, '112–158 tys. zł'], [1, 2.8, 31.5, 68.3, '102–141 tys. zł']] as [$i, $from, $mid, $to, $range])
                <div class="flex items-center gap-3 text-[12.5px]">
                    <span class="w-24 shrink-0 font-medium">{{ $searches[$i]['name'] }}</span>
                    <div class="relative h-3.5 flex-1 rounded-full bg-chip">
                        <div class="absolute inset-y-0 rounded-full {{ $i === 0 ? 'bg-brand/35' : 'bg-good/35' }}" style="left: {{ $from }}%; right: {{ 100 - $to }}%"></div>
                        <div class="absolute -inset-y-1 w-1 rounded {{ $i === 0 ? 'bg-brand' : 'bg-good' }}" style="left: {{ $mid }}%"></div>
                    </div>
                    <span class="w-24 shrink-0 text-right text-[11.5px] text-ink-soft">{{ $range }}</span>
                </div>
            @endforeach
        </div>
        <div class="relative h-4 text-[11px] text-muted" style="margin-left: 108px; margin-right: 108px">
            @foreach ([[0, '100 000 zł'], [33.3, '120 000 zł'], [66.7, '140 000 zł'], [100, '160 000 zł']] as [$at, $label])
                <span class="absolute -translate-x-1/2 whitespace-nowrap" style="left: {{ $at }}%">{{ $label }}</span>
            @endforeach
        </div>
        <p class="text-[11.5px] text-muted">Pasek — od najtańszej do najdroższej oferty, kreska — mediana, linia przerywana — budżet.</p>
    </div>

    <div class="rounded-xl bg-chip px-4 py-3 text-[13.5px]">
        <p class="mb-1 font-semibold">Co wybrać?</p>
        <ul class="list-disc ps-5 text-ink-soft">
            <li><b class="text-ink">Kia Sportage</b> — niższa cena, młodszy rocznik i mniejszy przebieg; 72 % ofert w budżecie.</li>
            <li><b class="text-ink">Toyota RAV4</b> — sprzedaje się szybciej (24 dni) i lepiej trzyma cenę; w budżecie 29 % ofert.</li>
            <li>Oba warianty najtaniej kupić w Niemczech: „na gotowo” o 8–11 tys. zł taniej niż w Polsce.</li>
        </ul>
    </div>
    <p class="border-t border-line pt-2 text-[12px] text-muted">Dalej: str. 2–3 — analiza Toyota RAV4, str. 4–5 — analiza Kia Sportage (jak dotąd: statystyka, wykres, wniosek, oferty).
        Dane z ogłoszeń na dzień 29.10.2026; „na gotowo” — z transportem, akcyzą, rejestracją i prowizją.</p>
</div>

@else
<main class="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-4 pb-12 pt-5 sm:px-6 sm:pt-7">

    @if ($part !== 'both')
        <nav class="text-sm text-muted">Поиск дилеры <span class="mx-1">/</span> <span class="text-ink-soft">{{ $part === 'single' ? 'Toyota RAV4' : 'Jan Kowalski' }}</span></nav>

        {{-- Шапка — как сейчас; при двух поисках заголовок — клиент (заметка подборки), а не модель --}}
        <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
                <h1 class="text-[28px] font-semibold leading-tight">{{ $part === 'single' ? 'Toyota RAV4' : 'Jan Kowalski' }}</h1>
                <flux:icon.pencil-square variant="mini" class="size-5 text-muted" />
                <flux:icon.star variant="solid" class="size-5 text-fresh" />
            </div>
            <p class="text-ink-soft">{{ $part === "single" ? "Jan Kowalski · бюджет" : "Бюджет" }} 140 000 zł · «семейный, гибрид, до весны»</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <x-platform.badge tone="good"><span class="inline-flex items-center gap-1"><flux:icon.check variant="micro" class="size-3.5" />Сохранено в 10:40</span></x-platform.badge>
            <flux:button size="sm" icon="folder" icon:trailing="chevron-down">Все подборки <span class="ms-1 rounded-full bg-chip px-1.5 text-[12px]">3</span></flux:button>
            <flux:button size="sm" icon="plus">Новая подборка</flux:button>
            <flux:button size="sm">Сохранить как новую</flux:button>
            @if ($part === 'single')
                <span class="rounded-[12px] outline-2 outline-offset-2 outline-dashed outline-[#ea7317]">
                    <flux:button size="sm" icon="squares-plus" class="text-brand!">Ещё поиск для клиента</flux:button>
                </span>
                <span class="rounded-md bg-[#ea7317]/10 px-2 py-1 text-caption font-medium text-[#b45309]">Пояснение к макету: единственное новое на странице с одним поиском</span>
            @endif
        </div>
    @endif

    @if ($part === 'screen')
        {{-- Блок поисков клиента — компактный: карточка поиска = вкладка + короткое сравнение --}}
        <section class="flex flex-col gap-2.5 rounded-card border border-line bg-white p-3 sm:p-4" aria-label="Поиски клиента">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 class="font-semibold">Поиски клиента</h2>
                <p class="flex min-w-0 flex-1 items-start gap-1.5 text-[14px] text-ink-soft max-sm:basis-full">
                    <flux:icon.light-bulb variant="mini" class="mt-0.5 size-4 shrink-0 text-good" />
                    <span><b class="text-ink">Kia Sportage выгоднее «под ключ» на 12 500 zł</b> и моложе на год; RAV4 продаётся быстрее — 24 дня против 37.</span>
                </p>
            </div>
            <div class="grid gap-2.5 md:grid-cols-[1fr_1fr_11rem]">
                @foreach ($searches as $i => $s)
                    @php $open = $i === 0; $better = $i === 1; @endphp
                    <button type="button" @class([
                        'flex min-w-0 flex-col gap-1 rounded-control border p-3 text-left',
                        'border-brand bg-selected ring-1 ring-brand' => $open,
                        'border-line bg-white hover:border-control' => ! $open,
                    ])>
                        <span class="flex items-center gap-2">
                            <span class="flex size-5.5 shrink-0 items-center justify-center rounded-full {{ $open ? 'bg-brand text-white' : 'bg-chip text-ink-soft' }} text-[12px] font-semibold">{{ $i + 1 }}</span>
                            <b class="whitespace-nowrap leading-tight">{{ $s["name"] }}</b>
                            <span class="min-w-0 truncate text-caption text-muted max-sm:hidden">{{ $s['cond'] }}</span>
                            <span class="flex-1"></span>
                            @if ($open)<span class="shrink-0 text-caption font-medium text-brand">открыт</span>@endif
                        </span>
                        <span class="flex flex-wrap items-baseline gap-x-2">
                            <span @class(['text-[20px] font-semibold leading-tight tabular-nums', 'text-good' => $better])>{{ $s['median'] }}</span>
                            <span class="text-caption text-muted">«под ключ», медиана · Германия</span>
                            @if ($better)<span class="rounded-md bg-good-soft px-1.5 text-caption font-semibold text-good">−12 500 zł</span>@endif
                        </span>
                        <span class="flex flex-wrap items-center gap-x-1.5 text-caption text-ink-soft">
                            {{ $s['count'] }} машин · {{ $s['km'] }} · продаётся за {{ $s['days'] }} · в бюджете
                            <x-platform.badge :tone="$s['chance'][2]">{{ $s['chance'][0] }}</x-platform.badge>
                        </span>
                    </button>
                @endforeach
                <button type="button" class="flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-dashed border-control bg-white/60 px-3 text-[14px] font-semibold text-brand hover:border-brand">
                    <flux:icon.plus variant="mini" class="size-4" /> Ещё поиск
                </button>
            </div>
        </section>
    @endif

    @if ($part !== 'both')
        {{-- Дальше — открытый поиск, как сейчас: вкладки, строка условий, форма --}}
        <x-dealers.tabs :search="\App\Models\PortalSearch::query()->first()" active="search" />
        @if ($part === 'screen')
            <p class="-mb-2 self-start rounded-md bg-[#ea7317]/10 px-2 py-1 text-caption font-medium text-[#b45309]">Пояснение к макету: ниже — параметры открытого поиска (Toyota RAV4), их можно менять. Нажмёте карточку Kia Sportage — здесь будут её параметры.</p>
        @endif
        <div @class(['flex flex-wrap items-center gap-1.5 rounded-card border bg-white px-3 py-2 shadow-sm', 'border-[#ea7317] border-dashed border-2' => $part === 'screen', 'border-line' => $part !== 'screen'])>
            <b class="me-1 text-[16px]">Toyota RAV4</b>
            @foreach (['2020–2022', 'Гибрид', 'до 100 000 км', 'Автомат', 'Дилер / комиссионка', 'На ходу'] as $chip)
                <span class="inline-flex min-h-8 items-center gap-1.5 rounded-[7px] bg-chip px-2.5 text-[13px] text-ink">{{ $chip }} <flux:icon.x-mark variant="micro" class="size-3.5 text-muted" /></span>
            @endforeach
            <span class="flex-1"></span>
            <flux:icon.photo variant="mini" class="size-5 text-ink-soft" />
            <flux:icon.envelope variant="mini" class="size-5 text-ink-soft" />
            <flux:button size="sm">Анализ рынка</flux:button>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <div class="relative flex max-h-[310px] flex-col gap-3 overflow-hidden rounded-card border border-line bg-white p-4">
                <div class="flex items-center gap-2"><flux:icon.truck variant="mini" class="size-5 text-ink-soft" /><b class="text-[17px]">Автомобиль</b><span class="rounded-full bg-selected px-1.5 text-[12px] font-semibold text-brand">4</span></div>
                <div class="grid grid-cols-2 gap-3">
                    @foreach ([['Марка', 'Toyota'], ['Модель', 'RAV4'], ['Версия', ''], ['Год первой регистрации', '2020 · 2022']] as [$label, $value])
                        <label class="flex flex-col gap-1 text-[14px] font-medium">{{ $label }}
                            <span class="flex h-10 items-center rounded-control border border-control px-3 font-normal {{ $value === '' ? 'text-muted' : 'text-ink' }}">{{ $value === '' ? 'например, Comfort, Style, GR Sport' : $value }}</span>
                        </label>
                    @endforeach
                </div>
                <div class="flex flex-wrap gap-2">
                    @foreach (['XA50 · 2018–2022 · до рестайлинга', 'XA50 · 2022– · после рестайлинга'] as $j => $gen)
                        <span class="rounded-full border px-3 py-1 text-[13px] {{ $j === 0 ? 'border-brand bg-selected text-brand' : 'border-line text-ink-soft' }}">{{ $gen }}</span>
                    @endforeach
                </div>
<div class="h-10"></div>
                <div class="absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-linear-to-t from-white to-transparent pb-2 text-caption text-muted">… двигатель, коробка, оснащение — как сейчас</div>
            </div>
            <div class="flex max-h-[310px] flex-col gap-3 overflow-hidden rounded-card border border-line bg-white p-4">
                <b class="text-[17px]">Порталы по странам</b>
                <div class="flex flex-wrap gap-2">
                    @foreach (['Германия' => true, 'Польша' => true, 'Нидерланды' => false, 'Бельгия' => false, 'Австрия' => false] as $country => $on)
                        <span class="rounded-full px-3 py-1.5 text-[13px] font-medium {{ $on ? 'bg-brand text-white' : 'bg-chip text-ink' }}">{{ $country }}</span>
                    @endforeach
                </div>
                <p class="text-caption text-muted">mobile.de, AutoScout24 · otomoto.pl</p>
            </div>
        </div>
    @endif

    @if ($part !== 'single')
        {{-- «Анализ»: выбор, что показывать — один поиск или оба (три — если поисков три) --}}
        <x-platform.card class="gap-3!">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <flux:icon.chart-bar variant="mini" class="size-5 text-ink-soft" />
                <h2 class="text-lg font-semibold leading-snug">Анализ рынка</h2>
                <x-platform.badge tone="neutral">Данные от 29.10.2026, 10:40 · сегодня</x-platform.badge>
                <span class="flex-1"></span>
                <flux:button size="sm" variant="primary" icon="document-arrow-down">PDF для клиента</flux:button>
            </div>
            <div @class(['flex flex-wrap items-center gap-2', 'self-start rounded-[12px] outline-2 outline-offset-4 outline-dashed outline-[#ea7317]' => $part === 'screen'])>
                <span class="text-[14px] text-ink-soft">Показать:</span>
                <div class="flex flex-wrap gap-1 rounded-control bg-zinc-800/5 p-1">
                    @foreach (['Toyota RAV4', 'Kia Sportage', 'Оба поиска'] as $j => $label)
                        @php $on = $part === 'both' ? $j === 2 : $j === 0; @endphp
                        <span @class(['flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium', 'bg-white text-ink shadow-xs ring-1 ring-line' => $on, 'text-ink-soft' => ! $on])>
                            @if ($j < 2)<span class="size-2.5 rounded-full {{ $j === 0 ? 'bg-brand' : 'bg-good' }}"></span>@endif
                            {{ $label }}
                        </span>
                    @endforeach
                </div>
                @if ($part === 'screen')
                    <span class="text-caption text-[#b45309]">Пояснение к макету: PDF для клиента — с тем, что выбрано здесь</span>
                @endif
            </div>
            @if ($part === 'screen')
                <div class="rounded-control border border-line-soft p-4 text-muted">… «Статистика», «Цена и параметры», «График цен», «Вывод» и «Объявления» Toyota RAV4 — как сейчас …</div>
            @endif
        </x-platform.card>
    @endif

    @if ($part === 'both')
        {{-- «Статистика» обоих поисков: те же колонки, строки — поиск, под ним его рынки --}}
        <x-platform.card class="gap-3!">
            <div class="flex flex-wrap items-center gap-3">
                <flux:icon.chart-bar-square variant="mini" class="size-5 text-ink-soft" />
                <h2 class="text-lg font-semibold">Статистика</h2>
                <flux:button size="sm" variant="ghost" icon="photo">Копировать статистику</flux:button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full min-w-[720px] text-left text-sm tabular-nums">
                    <thead>
                        <tr class="border-b border-line text-caption text-muted">
                            <th class="py-2 pr-3 font-medium">Поиск и рынок</th>
                            <th class="py-2 pr-3 text-right font-medium">Машин</th>
                            <th class="py-2 pr-3 text-right font-medium">Самое дешёвое «под ключ»</th>
                            <th class="py-2 pr-3 text-right font-medium">Медиана «под ключ»</th>
                            <th class="py-2 pr-3 text-right font-medium">Средние цены (P25–P75)</th>
                            <th class="py-2 text-right font-medium">Средний пробег</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($searches as $i => $s)
                            <tr class="border-b border-line-soft bg-surface-soft">
                                <td colspan="6" class="py-2 pr-3">
                                    <span class="inline-flex items-center gap-2 font-semibold"><span class="size-2.5 rounded-full {{ $tone[$i][1] }}"></span>{{ $i + 1 }}. {{ $s['name'] }}
                                        <span class="font-normal text-caption text-muted">{{ $s['cond'] }} · продаётся за {{ $s['days'] }} · в бюджете</span>
                                        <x-platform.badge :tone="$s['chance'][2]">{{ $s['chance'][0] }}</x-platform.badge></span>
                                </td>
                            </tr>
                            @foreach (array_filter($markets, fn ($m) => $m[0] === $i) as [$si, $code, $country, $count, $min, $median, $mid, $km])
                                <tr class="border-b border-line-soft">
                                    <td class="py-2 pl-5 pr-3"><span class="inline-flex items-center gap-1.5 font-medium">{!! $flag($code) !!} {{ $country }}</span></td>
                                    <td class="py-2 pr-3 text-right font-semibold">{{ $count }}</td>
                                    <td class="py-2 pr-3 text-right">{{ $min }}</td>
                                    <td @class(['py-2 pr-3 text-right font-semibold', 'text-good' => $si === 1 && $code === 'DE'])>{{ $median }}</td>
                                    <td class="py-2 pr-3 text-right text-ink-soft">{{ $mid }}</td>
                                    <td class="py-2 text-right">{{ $km }}</td>
                                </tr>
                            @endforeach
                        @endforeach
                    </tbody>
                </table>
            </div>
        </x-platform.card>

        {{-- «График цен» — полоса сравнения: оба поиска и их рынки на одной шкале, цвет — поиск --}}
        <x-platform.card class="gap-3!">
            <div class="flex flex-wrap items-center gap-3">
                <flux:icon.presentation-chart-line variant="mini" class="size-5 text-ink-soft" />
                <h2 class="text-lg font-semibold">График цен</h2>
                <flux:button size="sm" variant="ghost" icon="photo">Копировать график</flux:button>
            </div>
            <div class="flex flex-col gap-2 rounded-control border border-line-soft p-3">
                <p class="text-sm"><b>Сравнение поисков</b> <span class="text-caption text-muted">цены «под ключ» в zł, одна шкала</span></p>
                <div class="relative flex flex-col gap-3 pe-10 pt-5">
                    <div class="pointer-events-none absolute inset-y-0 left-40 right-10">
                        <div class="absolute top-4 bottom-0 border-l-2 border-dashed border-ink" style="left: 66.7%"></div>
                        <span class="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-white px-1 text-[11px] font-semibold" style="left: 66.7%">Ваш бюджет 140 000 zł</span>
                    </div>
                    @foreach ($markets as [$si, $code, $country, $count, $min, $median, $mid, $km, $bar])
                        @php [$lo, $p25, $med, $p75, $hi] = $bar; @endphp
                        <div class="flex items-center gap-3">
                            <span class="flex w-37 shrink-0 flex-col text-[12.5px] leading-tight">
                                <span class="inline-flex items-center gap-1.5 font-medium"><span class="size-2.5 rounded-full {{ $tone[$si][1] }}"></span>{{ $searches[$si]['name'] }}</span>
                                <span class="inline-flex items-center gap-1 ps-4 text-[11.5px] text-muted">{!! $flag($code) !!} {{ $country }} · {{ $count }}</span>
                            </span>
                            <div class="relative h-6 flex-1">
                                <div class="absolute top-1/2 h-0.5 -translate-y-1/2 {{ $tone[$si][1] }} opacity-50" style="left: {{ $lo }}%; right: {{ 100 - $hi }}%"></div>
                                <div class="absolute inset-y-0.5 rounded-[4px] border {{ $tone[$si][0] }}" style="left: {{ $p25 }}%; right: {{ 100 - $p75 }}%"></div>
                                <div class="absolute inset-y-0 w-0.5 {{ $tone[$si][1] }}" style="left: {{ $med }}%"></div>
                                <span class="absolute -top-3.5 -translate-x-1/2 whitespace-nowrap rounded bg-white z-10 px-0.5 text-[11px] font-semibold {{ $tone[$si][2] }}" style="left: {{ $med }}%">{{ $median }}</span>
                            </div>
                        </div>
                    @endforeach
                </div>
                <div class="relative ms-40 me-10 h-4 text-[11px] text-muted">
                    @foreach ([[0, '100 000 zł'], [33.3, '120 000 zł'], [66.7, '140 000 zł'], [100, '160 000 zł']] as [$at, $label])
                        <span class="absolute -translate-x-1/2 whitespace-nowrap" style="left: {{ $at }}%">{{ $label }}</span>
                    @endforeach
                </div>
                <p class="text-caption text-muted">Прямоугольник — средние цены (P25–P75), черта — медиана, линия — от самого дешёвого до самого дорогого объявления.</p>
            </div>
            <p class="text-caption text-muted">Ниже — графики каждого поиска по рынкам, как сейчас, с подписью поиска над своими.</p>
        </x-platform.card>

        {{-- «Вывод» — сравнение поисков --}}
        <x-platform.card class="gap-3!">
            <div class="flex items-center gap-3"><flux:icon.light-bulb variant="mini" class="size-5 text-ink-soft" /><h2 class="text-lg font-semibold">Вывод</h2></div>
            <x-platform.callout tone="good" icon="light-bulb">
                <b>Kia Sportage выгоднее «под ключ» на 12 500 zł</b> и моложе на год; в бюджет 140 000 zł входит 72 % предложений против 29 % у RAV4.
                RAV4 продаётся быстрее (24 дня против 37) — лучше держит цену. Оба дешевле всего в Германии: на 8–11 тыс. zł ниже Польши.
            </x-platform.callout>
        </x-platform.card>

        {{-- «Объявления» обоих поисков в одном списке; отбор по поиску — сверху --}}
        <x-platform.card class="gap-3!">
            <div class="flex flex-wrap items-center gap-3">
                <flux:icon.list-bullet variant="mini" class="size-5 text-ink-soft" />
                <h2 class="text-lg font-semibold">Объявления · 387</h2>
                <div class="flex flex-wrap gap-1.5">
                    @foreach (['Все · 387' => true, 'Toyota RAV4 · 214' => false, 'Kia Sportage · 173' => false] as $label => $on)
                        <span class="rounded-full px-3 py-1 text-[13px] font-medium {{ $on ? 'bg-brand text-white' : 'bg-chip text-ink' }}">{{ $label }}</span>
                    @endforeach
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full min-w-[720px] text-left text-sm tabular-nums">
                    <thead>
                        <tr class="border-b border-line text-caption text-muted">
                            <th class="py-2 pr-3 font-medium">Машина</th>
                            <th class="py-2 pr-3 font-medium">Год</th>
                            <th class="py-2 pr-3 text-right font-medium">Пробег</th>
                            <th class="py-2 pr-3 text-right font-medium">Цена продавца</th>
                            <th class="py-2 pr-3 text-right font-medium">«Под ключ»</th>
                            <th class="py-2 font-medium">Портал</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ([[1, 'Kia Sportage 1.6 T-GDI HEV Spirit', 2022, '28 400 км', '22 900 €', '104 200 zł', 'AutoScout24 · DE'], [1, 'Kia Sportage 1.6 HEV Vision', 2023, '19 800 км', '24 300 €', '109 800 zł', 'mobile.de · DE'], [0, 'Toyota RAV4 2.5 Hybrid Comfort', 2020, '79 000 км', '24 600 €', '112 300 zł', 'mobile.de · DE']] as [$si, $title, $year, $km, $price, $turnkey, $portal])
                            <tr class="border-b border-line-soft">
                                <td class="py-2 pr-3"><span class="inline-flex items-center gap-2 font-medium text-brand"><span class="size-2.5 rounded-full {{ $tone[$si][1] }}"></span>{{ $title }}</span></td>
                                <td class="py-2 pr-3">{{ $year }}</td>
                                <td class="py-2 pr-3 text-right">{{ $km }}</td>
                                <td class="py-2 pr-3 text-right text-ink-soft">{{ $price }}</td>
                                <td class="py-2 pr-3 text-right text-[16px] font-semibold">{{ $turnkey }}</td>
                                <td class="py-2 text-ink-soft">{{ $portal }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </x-platform.card>
    @endif
</main>
@endif

@fluxScripts
</body>
</html>
