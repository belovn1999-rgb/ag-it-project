{{--
    Макет волны 3 «Поисков клиента» (3а.35): общий PDF и ссылка клиенту при выборе «Оба поиска» — НЕ код платформы,
    статичная страница на деталях платформы. Цифры — для примера (как в утверждённом макете 29.10: Toyota RAV4 и
    Kia Sportage, клиент Jan Kowalski, бюджет 140 000 zł).
    $part: 'sheet1' — лист 1 общего PDF (сравнение вариантов), $web — та же страница по ссылке клиента;
           'sheet2' — начало листа первого авто (дальше — как PDF одного поиска сейчас);
           'modal'  — окно «PDF для клиента» в режиме «Оба поиска» (экран по-русски).
--}}
@php
    $part ??= 'sheet1';
    $web ??= false;
    $s = [
        ['n' => 1, 'name' => 'Toyota RAV4', 'cond' => 'hybryda · 2020–2022 · do 100 000 km · automat', 'median' => '131 400 zł', 'min' => '112 300 zł', 'pl' => '139 900 zł',
            'count' => 214, 'km' => '68 400 km', 'days' => '24 dni', 'chance' => ['umiarkowana', 'deal'], 'fit' => '61 z 214',
            'dot' => 'bg-brand', 'bar' => 'bg-brand/30', 'from' => 20.5, 'mid' => 52.3, 'to' => 96.7, 'range' => '112–158 tys. zł'],
        ['n' => 2, 'name' => 'Kia Sportage', 'cond' => 'hybryda · 2022–2023 · do 60 000 km · automat', 'median' => '118 900 zł', 'min' => '101 700 zł', 'pl' => '129 000 zł',
            'count' => 173, 'km' => '31 200 km', 'days' => '37 dni', 'chance' => ['wysoka', 'good'], 'fit' => '124 z 173',
            'dot' => 'bg-good', 'bar' => 'bg-good/30', 'from' => 2.8, 'mid' => 31.5, 'to' => 68.3, 'range' => '102–141 tys. zł'],
    ];
    $company = ['name' => '[Nazwa firmy]', 'phone' => '+48 22 000 00 00', 'email' => 'biuro@firma.pl', 'website' => '', 'address' => ''];
    $footer = '[Nazwa firmy] · Źródła: AutoScout24, otomoto · Dane z: 30.10.2026, 16:59';
@endphp
@if ($part === 'modal')
<!DOCTYPE html>
<html lang="ru">
<head>
    @include('partials.head', ['lightOnly' => true])
</head>
<body class="min-h-screen bg-zinc-800/45 text-[15px] leading-normal text-ink antialiased">
@php
    $box = fn (bool $on) => $on
        ? '<span class="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-brand text-white"><svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5"><path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd"/></svg></span>'
        : '<span class="size-[18px] shrink-0 rounded-[5px] border border-zinc-300 bg-white"></span>';
    $radio = fn (bool $on) => $on ? '<span class="size-[18px] shrink-0 rounded-full border-[5px] border-brand bg-white"></span>' : '<span class="size-[18px] shrink-0 rounded-full border border-zinc-300 bg-white"></span>';
@endphp
<div class="flex justify-center px-4 py-8">
    <div class="flex w-full max-w-lg flex-col gap-5 rounded-xl bg-white p-6 shadow-lg">
        <div>
            <p class="text-lg font-semibold">PDF для клиента · оба поиска</p>
            <p class="mt-1 text-sm text-ink-soft">Один файл: лист 1 — сравнение вариантов, дальше — анализ каждого поиска. Выбор запоминается.</p>
        </div>
        <div class="flex flex-col gap-0.5">
            <span class="mb-1 text-sm font-medium">Что включить</span>
            <label class="flex min-h-9 items-center gap-2.5 text-sm">{!! $box(true) !!}<span><b>Сравнение вариантов</b> <span class="text-muted">— лист 1</span></span></label>
            <span class="mt-2 text-[12px] text-muted">У каждого поиска — как в PDF одного поиска:</span>
            @foreach ([['Параметры авто', true], ['Статистика цен', true], ['График цен', true], ['Цена и параметры', false], ['Вывод', true], ['Объявления', true]] as [$label, $on])
                <label class="flex min-h-9 items-center gap-2.5 text-sm">{!! $box($on) !!}{{ $label }}</label>
                @if ($label === 'Объявления')
                    <div class="mb-1 ml-7 flex flex-col gap-0.5 border-l border-line-soft pl-3 text-sm">
                        <span class="text-[12px] text-muted">Какие объявления</span>
                        <span class="flex min-h-9 items-center gap-2.5">{!! $radio(false) !!}Все у каждого (214 и 173)</span>
                        <span class="flex min-h-9 items-center gap-2.5">{!! $radio(true) !!}Самые дешёвые <span class="inline-flex h-8 w-16 items-center rounded-lg border border-zinc-200 px-2.5 shadow-xs">10</span> у каждого</span>
                    </div>
                @endif
            @endforeach
            <label class="flex min-h-9 items-center gap-2.5 text-sm">{!! $box(true) !!}Из чего складывается «под ключ»</label>
        </div>
        <div class="flex flex-col gap-4 border-t border-line-soft pt-4">
            <label class="flex items-center gap-2.5 text-sm">{!! $box(true) !!}Шапка фирмы (название и контакты из настроек)</label>
            <div class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Для клиента</span>
                <span class="flex h-10 items-center rounded-lg border border-zinc-200 px-3 text-sm shadow-xs">Jan Kowalski</span>
            </div>
            <p class="text-[12px] text-ink-soft">Числа и графики — как на странице «Оба поиска»; у каждого поиска — его график, бюджет клиента и сортировка.</p>
        </div>
        <div class="flex flex-col gap-2 rounded-control border border-line-soft bg-surface-soft p-3">
            <p class="text-caption text-ink-soft"><b class="text-ink">Одна ссылка на оба поиска.</b> Клиент увидит сравнение и анализ каждого авто страницей и сможет скачать этот же PDF. Ссылки отдельных поисков остаются как были.</p>
            <flux:button icon="link" class="self-start">Создать ссылку для клиента</flux:button>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
            <flux:button icon="eye">Посмотреть</flux:button>
            <flux:button variant="primary" icon="arrow-down-tray">Скачать PDF</flux:button>
        </div>
    </div>
</div>
</body>
</html>
@else
<!doctype html>
<html lang="pl">
<head>
@include('dealers.print.head', ['title' => 'Porównanie wariantów · Jan Kowalski', 'web' => $web, 'footer' => $footer, 'page' => 'Strona {PAGE_NUM} z {PAGE_COUNT}'])
@unless ($web)
<style>
    {{-- Только для картинки макета: лист на сером фоне, поля страницы и подвал Chrome нарисованы. --}}
    html, body { background: #d9dee3; }
    .print-doc { background: #fff; margin: 24px auto; padding-top: 12mm; }
    .mock-foot { display: flex; justify-content: space-between; padding-top: 4mm; height: 17mm; box-sizing: border-box; font: 500 8.8pt 'Onest', sans-serif; color: #4a5b68; }
</style>
@endunless
</head>
<body>
<main class="print-doc flex flex-col text-[14px] leading-normal text-ink">
@if ($web)
    <div class="mb-4 flex justify-end max-sm:mb-3">
        <flux:button icon="arrow-down-tray" class="min-h-11 max-sm:w-full">Pobierz PDF</flux:button>
    </div>
@endif
@if ($part === 'sheet1')
<section @unless ($web) data-print-sheet @endunless>
<div class="flex flex-col gap-5">
    @include('dealers.print.topbar', ['company' => $company, 'web' => $web, 'meta' => [[null, '30.10.2026', false], ['Kontakt', 'Anna Nowak', true], [null, '+48 600 000 000', false]]])

    <div class="flex flex-col gap-1">
        <p class="text-[13px] font-semibold text-muted">Porównanie wariantów dla</p>
        <h1 class="text-[28px] font-bold leading-tight tracking-tight text-ink">Jan Kowalski <span class="text-[19px] font-medium tracking-normal text-ink-soft">· budżet 140 000 zł</span></h1>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
        @foreach ($s as $c)
            @php $better = $c['n'] === 2; @endphp
            <section @class(['flex flex-col gap-2 rounded-card border bg-white p-5', 'border-good ring-2 ring-good/15' => $better, 'border-line' => ! $better])>
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="flex items-center gap-2 text-lg font-semibold leading-snug"><span class="size-2.5 rounded-full {{ $c['dot'] }}"></span>{{ $c['n'] }}. {{ $c['name'] }}</p>
                    @if ($better)<span class="rounded-md bg-good px-2 py-0.5 text-[12px] font-semibold text-white">Taniej o 12 500 zł</span>@endif
                </div>
                <p class="-mt-1 text-[12.5px] text-muted">{{ $c['cond'] }}</p>
                <p class="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted">„Na gotowo”, mediana · <x-dealers.flag country="DE" /> Niemcy</p>
                <p @class(['text-[32px] font-bold leading-none tracking-tight tabular-nums', 'text-good' => $better])>{{ $c['median'] }}</p>
                <p class="text-[13px] text-ink-soft">od {{ $c['min'] }} · w Polsce {{ $c['pl'] }}</p>
                <dl class="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line-soft pt-3 text-[14px]">
                    <div><dt class="text-[12px] text-muted">Ofert</dt><dd class="font-semibold">{{ $c['count'] }}</dd></div>
                    <div><dt class="text-[12px] text-muted">Przebieg</dt><dd class="font-semibold">{{ $c['km'] }}</dd></div>
                    <div><dt class="text-[12px] text-muted">Sprzedaje się w</dt><dd class="font-semibold">{{ $c['days'] }}</dd></div>
                    <div><dt class="text-[12px] text-muted">W budżecie</dt><dd class="flex flex-wrap items-center gap-1.5 font-semibold"><x-platform.badge :tone="$c['chance'][1]" class="py-0!">{{ $c['chance'][0] }}</x-platform.badge>{{ $c['fit'] }}</dd></div>
                </dl>
            </section>
        @endforeach
    </div>

    {{-- Полоса цен из варианта A: оба поиска на одной шкале, черта — медиана, пунктир — бюджет клиента --}}
    <x-platform.card heading="Ceny „na gotowo” na jednej skali (Niemcy)">
        <div class="relative flex flex-col gap-3.5 pt-6">
            <div class="pointer-events-none absolute inset-y-0 left-[7.75rem] right-[7.75rem] max-sm:left-[6.25rem] max-sm:right-0">
                <div class="absolute top-5 -bottom-1 border-l-2 border-dashed border-ink" style="left: 66.7%"></div>
                <span class="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-white px-1 text-[12px] font-semibold" style="left: 66.7%">Budżet 140 000 zł</span>
            </div>
            @foreach ($s as $c)
                <div class="flex items-center gap-3 text-[13px]">
                    <span class="flex w-28 shrink-0 items-center gap-1.5 font-semibold max-sm:w-22"><span class="size-2.5 shrink-0 rounded-full {{ $c['dot'] }}"></span>{{ $c['name'] }}</span>
                    <div class="relative h-4 flex-1 rounded-full bg-chip">
                        <div class="absolute inset-y-0 rounded-full {{ $c['bar'] }}" style="left: {{ $c['from'] }}%; right: {{ 100 - $c['to'] }}%"></div>
                        <div class="absolute -inset-y-1 w-1 -translate-x-1/2 rounded {{ $c['dot'] }}" style="left: {{ $c['mid'] }}%"></div>
                    </div>
                    <span class="w-28 shrink-0 text-right text-[12.5px] text-ink-soft max-sm:hidden">{{ $c['range'] }}</span>
                </div>
            @endforeach
        </div>
        <div class="relative -mt-1 ms-[7.75rem] me-[7.75rem] h-4 text-[12px] text-muted max-sm:ms-[6.25rem] max-sm:me-0">
            @foreach ([[0, '100 000 zł'], [33.3, '120 000 zł'], [66.7, '140 000 zł'], [100, '160 000 zł']] as [$at, $label])
                <span @class(['absolute -translate-x-1/2 whitespace-nowrap', 'max-sm:hidden' => $at > 0 && $at < 100, 'max-sm:translate-x-0' => $at == 0, 'max-sm:-translate-x-full' => $at == 100]) style="left: {{ $at }}%">{{ $label }}</span>
            @endforeach
        </div>
        <p class="text-[12px] text-muted">Pasek — od najtańszej do najdroższej oferty, kreska — mediana, linia przerywana — budżet.</p>
    </x-platform.card>

    <div class="rounded-card border border-line-soft bg-surface-soft px-5 py-4 text-[14px]">
        <p class="mb-1.5 flex items-center gap-2 font-semibold"><flux:icon.light-bulb variant="mini" class="size-4.5 text-good" />Co wybrać?</p>
        <ul class="flex list-disc flex-col gap-1 ps-5 text-ink-soft">
            <li><b class="text-ink">Kia Sportage</b> — niższa cena, młodszy rocznik i mniejszy przebieg; 72 % ofert w budżecie.</li>
            <li><b class="text-ink">Toyota RAV4</b> — sprzedaje się szybciej (24 dni) i lepiej trzyma cenę; w budżecie 29 % ofert.</li>
            <li>Oba warianty najtaniej kupić w Niemczech: „na gotowo” o 8–11 tys. zł taniej niż w Polsce.</li>
        </ul>
    </div>

    <p class="border-t border-line pt-2.5 text-[12.5px] text-muted">Dalej — analiza każdego wariantu: <b class="font-semibold text-ink-soft">1. Toyota RAV4</b>, <b class="font-semibold text-ink-soft">2. Kia Sportage</b> (statystyka, wykres, wniosek, oferty).
        Dane z ogłoszeń na dzień 30.10.2026; „na gotowo” — z transportem, akcyzą, rejestracją i prowizją.</p>
</div>
</section>
@else
<section data-print-sheet>
<div class="flex flex-col gap-5">
    @include('dealers.print.topbar', ['company' => $company, 'web' => $web, 'meta' => [[null, '30.10.2026', false], ['Kontakt', 'Anna Nowak', true], [null, '+48 600 000 000', false]]])
    <div class="flex flex-col gap-1">
        <p class="inline-flex items-center gap-2 text-[13px] font-semibold text-muted"><span class="rounded-full bg-brand px-2 py-0.5 text-[12px] text-white">Wariant 1 z 2</span>Analiza rynku</p>
        <h1 class="text-[28px] font-bold leading-tight tracking-tight text-ink">Toyota RAV4</h1>
    </div>
    @include('dealers.print.passport', ['sheet' => ['band' => [
        ['label' => 'Rocznik', 'value' => '2020–2022'], ['label' => 'Przebieg', 'value' => 'do 100 000 km'], ['label' => 'Silnik', 'value' => 'hybryda benzyna'],
        ['label' => 'Skrzynia', 'value' => 'automat'], ['label' => 'Stan', 'value' => 'nieuszkodzony'],
    ], 'groups' => []]])
    <x-platform.card heading="Statystyki cen">
        <table class="w-full text-[14px] tabular-nums">
            <thead><tr class="text-[12px] text-muted">
                <th class="border-b border-line py-2 text-left font-medium">Rynki</th><th class="border-b border-line py-2 text-right font-medium">Liczba</th>
                <th class="border-b border-line py-2 text-right font-medium">Minimum</th><th class="border-b border-line py-2 text-right font-medium">Mediana</th>
                <th class="border-b border-line py-2 text-right font-medium">Przebieg</th>
            </tr></thead>
            <tbody>
                <tr><td class="border-b border-line-soft py-1.5"><span class="flex items-center gap-1.5 font-semibold"><x-dealers.flag country="DE" />Niemcy</span></td><td class="border-b border-line-soft text-right font-semibold">128</td><td class="border-b border-line-soft text-right">112 300 zł</td><td class="border-b border-line-soft text-right font-semibold">131 400 zł</td><td class="border-b border-line-soft text-right">68 400 km</td></tr>
                <tr><td class="py-1.5"><span class="flex items-center gap-1.5 font-semibold"><x-dealers.flag country="PL" />Polska</span></td><td class="text-right font-semibold">86</td><td class="text-right">121 500 zł</td><td class="text-right font-semibold">139 900 zł</td><td class="text-right">61 200 km</td></tr>
            </tbody>
        </table>
    </x-platform.card>
    <div class="flex h-40 items-center justify-center rounded-card border-2 border-dashed text-center text-[14px] font-medium" style="border-color: #ea7317; color: #b45309">Пояснение к макету: дальше — как PDF одного поиска сейчас: график, вывод, объявления.<br>Потом с нового листа — «Wariant 2 z 2 · Kia Sportage» (зелёная метка).</div>
</div>
</section>
@endif
@unless ($web)
    <div class="mock-foot"><span>{{ $footer }}</span><span>Strona {{ $part === 'sheet1' ? 1 : 2 }} z 5</span></div>
@endunless
</main>
</body>
</html>
@endif
