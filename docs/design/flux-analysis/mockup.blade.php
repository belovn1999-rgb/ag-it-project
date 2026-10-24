{{--
    Макет «Анализ» на Flux Pro (волна 9.7.0, Б0) — НЕ код платформы: статичная страница на настоящих деталях
    (`x-platform.*`, `flux:*`) и цифрах локальной копии (выдуманные данные: Skoda Octavia, 4 рынка). Рисунки графиков,
    полосы сравнения и лесенки — картинками из нынешнего экрана: их рисунок не меняется.
    $stats: 'table' (вариант A) | 'tiles' (B); $jump: 'bar' (A) | 'pills' (B).
--}}
@php
    use App\Portals\Portal;
    $stats ??= 'table';
    $jump ??= 'bar';
    $markets = [
        ['key' => 'PL', 'name' => 'Польша', 'portals' => 'otomoto.pl 32', 'count' => 30, 'min' => '65 000 zł', 'max' => '128 500 zł', 'median' => '86 250 zł', 'range' => '79 500 – 107 125 zł', 'middle' => 15, 'km' => '123 467 км', 'ad' => null, 'marks' => ['min' => '▼', 'max' => '▼', 'median' => '▼', 'range' => '▼'], 'dup' => false],
        ['key' => 'DE', 'name' => 'Германия', 'portals' => 'AutoScout24 (Германия) 39', 'count' => 39, 'min' => '72 550 zł', 'max' => '146 350 zł', 'median' => '113 100 zł', 'range' => '92 850 – 128 900 zł', 'middle' => 20, 'km' => '119 974 км', 'ad' => ['min' => '14 090 €', 'max' => '30 090 €', 'median' => '22 890 €', 'range' => '18 490 – 26 315 €'], 'marks' => [], 'dup' => false],
        ['key' => 'NL', 'name' => 'Нидерланды', 'portals' => 'AutoScout24 (Нидерланды) 15 + Marktplaats 10', 'count' => 24, 'min' => '87 050 zł', 'max' => '162 000 zł', 'median' => '121 300 zł', 'range' => '106 800 – 139 188 zł', 'middle' => 12, 'km' => '115 708 км', 'ad' => ['min' => '17 240 €', 'max' => '33 490 €', 'median' => '24 665 €', 'range' => '21 515 – 28 540 €'], 'marks' => ['max' => '▲', 'median' => '▲', 'range' => '▲'], 'dup' => true],
        ['key' => 'BE', 'name' => 'Бельгия', 'portals' => 'AutoScout24 (Бельгия) 12', 'count' => 12, 'min' => '91 900 zł', 'max' => '140 800 zł', 'median' => '111 625 zł', 'range' => '104 063 – 128 925 zł', 'middle' => 6, 'km' => '112 750 км', 'ad' => ['min' => '18 290 €', 'max' => '28 890 €', 'median' => '22 565 €', 'range' => '20 928 – 26 315 €'], 'marks' => ['min' => '▲'], 'dup' => false],
    ];
    $cols = ['min' => ['Самое дешёвое', 'text-good'], 'max' => ['Самое дорогое', 'text-danger'], 'median' => ['Медиана', 'text-brand'], 'range' => ['Средние цены (P25–P75)', 'text-brand']];
    $chances = [['PL', 'высокий', 'good', '19 из 30'], ['DE', 'умеренный', 'warn', '11 из 39'], ['NL', 'очень низкий', 'danger', '1 из 24'], ['BE', 'очень низкий', 'danger', '1 из 12']];
    $rows = [
        [1, 'Combi 2.0 TDI Ambition', 2020, '162 000 км', '116 л. с.', 'МКПП', '65 000 zł', null, '−25%', '≥ 5 дн.', null, 'Дилер', 'Łódź', Portal::Otomoto],
        [2, 'Combi 2.0 TDI DSG First Edition', 2019, '217 000 км', '150 л. с.', 'АКПП', '69 000 zł', null, '−20%', '≥ 5 дн.', null, 'Дилер', 'Poznań', Portal::Otomoto],
        [3, 'Combi 2.0 TDI DSG First Edition', 2019, '154 000 км', '150 л. с.', 'АКПП', '70 000 zł', null, '−19%', '1 дн.', null, 'Частный', 'Warszawa', Portal::Otomoto],
        [4, 'Combi 2.0 TDI DSG Business', 2020, '168 000 км', '150 л. с.', 'АКПП', '70 500 zł', null, '−11%', '≥ 5 дн.', null, 'Дилер', 'Łódź', Portal::Otomoto],
        [5, 'Combi 2.0 TDI Ambition', 2019, '189 000 км', '116 л. с.', 'МКПП', '72 550 zł', '14 090 €', '−36%', '≥ 5 дн.', null, 'Дилер', 'Köln', Portal::AutoScoutDe],
        [6, 'Combi 2.0 TDI DSG Business', 2020, '168 000 км', '150 л. с.', 'АКПП', '74 000 zł', null, '−7%', '≥ 5 дн.', null, 'Дилер', 'Lublin', Portal::Otomoto],
        [7, 'Combi 2.0 TDI Ambition', 2021, '105 000 км', '116 л. с.', 'МКПП', '77 500 zł', null, '−10%', '≥ 5 дн.', ['−6,1 %', '82 500 zł'], 'Дилер', 'Szczecin', Portal::Otomoto],
        [8, 'Combi 2.0 TDI DSG Style', 2021, '140 000 км', '150 л. с.', 'АКПП', '79 000 zł', null, '−5%', '≥ 5 дн.', ['−3,1 %', '81 500 zł'], 'Дилер', 'Szczecin', Portal::Otomoto],
    ];
    $flag = fn (string $c) => new \Illuminate\Support\HtmlString(\App\Portals\Analysis\Flags::svg($c));
@endphp
<!DOCTYPE html>
<html lang="ru">
<head>
    @include('partials.head', ['lightOnly' => true])
    <style>
        .mock-img { width: 100%; height: auto; }
    </style>
</head>
<body class="min-h-screen bg-page text-[15px] leading-normal text-ink antialiased">
<img src="img/top-1440.png" alt="" class="mock-img hidden sm:block">
<img src="img/top-375.png" alt="" class="mock-img sm:hidden">
<main class="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 pb-24 pt-5 sm:px-6 lg:pb-12">
<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
<div class="flex min-w-0 flex-1 flex-col gap-5">

    {{-- ==== Шапка части «Анализ рынка» ==== --}}
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span class="flex size-9 items-center justify-center rounded-control bg-selected text-brand"><flux:icon.chart-bar class="size-5" /></span>
            <h2 class="text-lg font-semibold leading-snug">Анализ рынка</h2>
            <x-platform.badge tone="neutral" icon="clock" class="whitespace-normal!">Данные от 24.10.2026, 09:30 · сегодня</x-platform.badge>
            <div class="hidden flex-1 sm:block"></div>
            <flux:button variant="primary" icon="document-arrow-down" class="max-sm:w-full">PDF для клиента</flux:button>
        </div>
        <x-platform.callout tone="warn">Статистика без mobile.de: прочитайте его кнопкой «Прочитать mobile.de» в «Чтении выдачи» (расширение в Chrome).</x-platform.callout>
    </div>

    {{-- ==== Переходы к частям ==== --}}
    @if ($jump === 'bar')
        <nav class="sticky top-0 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-card border border-line bg-white/95 p-1 backdrop-blur [scrollbar-width:none]" aria-label="Части анализа">
            @foreach ([['Статистика', 'chart-bar'], ['Цена и параметры', 'table-cells'], ['График', 'presentation-chart-line'], ['Вывод', 'light-bulb'], ['Объявления', 'list-bullet'], ['История', 'clock']] as $i => [$label, $icon])
                <flux:button variant="ghost" size="sm" :icon="$icon" class="min-h-10 shrink-0 text-ink-soft!">{{ $label }}</flux:button>
            @endforeach
        </nav>
    @else
        <nav class="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto bg-page/95 px-1 py-1 backdrop-blur [scrollbar-width:none]" aria-label="Части анализа">
            @foreach ([['Статистика', 'chart-bar'], ['Цена и параметры', 'table-cells'], ['График', 'presentation-chart-line'], ['Вывод', 'light-bulb'], ['Объявления', 'list-bullet'], ['История', 'clock']] as [$label, $icon])
                <a href="#" class="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-control bg-white px-3.5 text-sm font-medium text-ink hover:border-muted"><flux:icon :icon="$icon" class="size-4 text-muted" />{{ $label }}</a>
            @endforeach
        </nav>
    @endif

    {{-- ==== Чтение выдачи ==== --}}
    <x-platform.card class="gap-3! py-4!">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="text-lg font-semibold leading-snug">Чтение выдачи</h2>
            <span class="flex items-center gap-1.5">
                @foreach ([Portal::AutoScoutDe, Portal::Otomoto, Portal::AutoScoutNl, Portal::Marktplaats, Portal::AutoScoutBe] as $p)
                    <span class="relative inline-flex"><x-dealers.portal-mark :portal="$p" size="sm" /><i class="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-good ring-2 ring-white"></i></span>
                @endforeach
            </span>
            <flux:button variant="ghost" size="sm" icon-trailing="chevron-down" class="text-brand!">Подробнее</flux:button>
            <div class="hidden flex-1 sm:block"></div>
            <flux:button size="sm" icon="arrow-path" class="max-sm:w-full pointer-coarse:min-h-11">Обновить данные</flux:button>
        </div>
    </x-platform.card>

    {{-- ==== Статистика ==== --}}
    <x-platform.card>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="text-lg font-semibold leading-snug">Статистика</h2>
            <flux:button size="sm" variant="ghost" icon="photo">Копировать статистику</flux:button>
            <div class="flex-1"></div>
            <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-caption text-muted">Анализ рынков:</span>
                @foreach ($markets as $m)
                    <x-platform.badge tone="neutral"><span class="inline-flex items-center gap-1.5">{{ $flag($m['key']) }}{{ $m['key'] }}</span></x-platform.badge>
                @endforeach
            </div>
        </div>

        @if ($stats === 'table')
            {{-- A: таблица Flux на компьютере, карточка на рынок на телефоне (решение 10.10 — как сейчас) --}}
            <div class="max-lg:hidden">
                <flux:table class="table-auto! text-sm tabular-nums [&_[data-flux-cell]]:px-2! [&_[data-flux-column]]:px-2! [&_[data-flux-cell]:first-child]:ps-0! [&_[data-flux-column]:first-child]:ps-0!">
                    <flux:table.columns>
                        <flux:table.column>Рынок</flux:table.column>
                        <flux:table.column align="end">Кол-во</flux:table.column>
                        @foreach ($cols as [$label])
                            <flux:table.column align="end" class="whitespace-normal">{{ $label }}</flux:table.column>
                        @endforeach
                        <flux:table.column align="end" class="whitespace-normal">В середине</flux:table.column>
                        <flux:table.column align="end" class="whitespace-normal">Средний пробег</flux:table.column>
                    </flux:table.columns>
                    <flux:table.rows>
                        @foreach ($markets as $m)
                            <flux:table.row>
                                <flux:table.cell class="align-top whitespace-normal">
                                    <span class="flex items-center gap-1.5 font-semibold text-ink">{{ $flag($m['key']) }}{{ $m['name'] }}
                                        @if ($m['dup'])
                                            <flux:tooltip content="Убраны повторы: 2 одинаковые машины на двух порталах"><flux:icon.information-circle class="size-4 text-muted" /></flux:tooltip>
                                        @endif
                                    </span>
                                    <span class="text-caption text-muted">{{ $m['portals'] }}</span>
                                </flux:table.cell>
                                <flux:table.cell align="end" class="align-top font-semibold text-ink!">{{ $m['count'] }}</flux:table.cell>
                                @foreach ($cols as $key => [$label, $tone])
                                    <flux:table.cell align="end" class="align-top whitespace-normal">
                                        <span class="flex flex-col items-end">
                                            <span class="text-right font-semibold {{ $tone }}">@isset($m['marks'][$key])<span class="mr-1 text-muted">{{ $m['marks'][$key] }}</span>@endisset{!! implode(' – ', array_map(fn ($part) => '<span class="whitespace-nowrap">'.e($part).'</span>', explode(' – ', $m[$key]))) !!}</span>
                                            @if ($m['ad'])<span class="text-right text-[12px] leading-tight text-muted">цена в объявлении: <span class="whitespace-nowrap">{{ $m['ad'][$key] }}</span></span>@endif
                                        </span>
                                    </flux:table.cell>
                                @endforeach
                                <flux:table.cell align="end" class="align-top font-semibold text-ink!">{{ $m['middle'] }}</flux:table.cell>
                                <flux:table.cell align="end" class="align-top whitespace-nowrap font-semibold text-ink!">{{ $m['km'] }}</flux:table.cell>
                            </flux:table.row>
                        @endforeach
                    </flux:table.rows>
                </flux:table>
            </div>
            <div class="flex flex-col gap-3 lg:hidden">
                @foreach ($markets as $m)
                    <div class="flex flex-col gap-3 rounded-control border border-line-soft p-3">
                        <div class="flex items-center gap-2">
                            <span class="flex items-center gap-1.5 font-semibold">{{ $flag($m['key']) }}{{ $m['name'] }}</span>
                            <span class="ml-auto text-caption text-muted">Кол-во <b class="text-[15px] text-ink">{{ $m['count'] }}</b></span>
                        </div>
                        <dl class="grid grid-cols-2 gap-x-3 gap-y-2 tabular-nums">
                            @foreach ($cols as $key => [$label, $tone])
                                <div @class(['flex flex-col', 'col-span-2' => $key === 'range'])><dt class="text-[12px] text-muted">{{ $label }}</dt><dd class="font-semibold {{ $tone }}">@isset($m['marks'][$key])<span class="mr-1 text-muted">{{ $m['marks'][$key] }}</span>@endisset{{ $m[$key] }}</dd>@if ($m['ad'])<dd class="text-[12px] text-muted">цена в объявлении: {{ $m['ad'][$key] }}</dd>@endif</div>
                            @endforeach
                            <div class="flex flex-col"><dt class="text-[12px] text-muted">В середине</dt><dd class="font-semibold">{{ $m['middle'] }}</dd></div>
                            <div class="flex flex-col"><dt class="text-[12px] text-muted">Средний пробег</dt><dd class="font-semibold">{{ $m['km'] }}</dd></div>
                        </dl>
                        <p class="text-caption text-muted">{{ $m['portals'] }}</p>
                    </div>
                @endforeach
            </div>
        @else
            {{-- B: плитки рынков на всех экранах, медиана крупно, как цена в «Карточке авто» --}}
            <div class="grid gap-3 sm:grid-cols-2">
                @foreach ($markets as $m)
                    <div class="flex flex-col gap-3 rounded-control border border-line p-4">
                        <div class="flex items-center gap-2">
                            <span class="flex items-center gap-1.5 font-semibold">{{ $flag($m['key']) }}{{ $m['name'] }}</span>
                            <span class="ml-auto text-caption text-muted">Кол-во <b class="text-[15px] text-ink">{{ $m['count'] }}</b></span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-caption text-muted">Медиана</span>
                            <span class="text-[26px] font-bold leading-tight tabular-nums text-brand">@isset($m['marks']['median'])<span class="mr-1 text-lg text-muted">{{ $m['marks']['median'] }}</span>@endisset{{ $m['median'] }}</span>
                            @if ($m['ad'])<span class="text-caption text-muted">цена в объявлении: {{ $m['ad']['median'] }}</span>@endif
                        </div>
                        <dl class="grid grid-cols-2 gap-2 tabular-nums">
                            <x-platform.fact icon="arrow-trending-down" label="Самое дешёвое" :value="$m['min']" />
                            <x-platform.fact icon="arrow-trending-up" label="Самое дорогое" :value="$m['max']" />
                            <x-platform.fact icon="arrows-right-left" label="Средние цены (P25–P75)" :value="$m['range']" class="col-span-2" />
                            <x-platform.fact icon="gauge" label="Средний пробег" :value="$m['km']" />
                            <x-platform.fact icon="squares-2x2" label="В середине" :value="$m['middle']" />
                        </dl>
                        <p class="text-caption text-muted">{{ $m['portals'] }}</p>
                    </div>
                @endforeach
            </div>
        @endif
        <div class="flex flex-col gap-1 border-t border-line-soft pt-3 text-caption text-muted">
            <p>▲ выше всех · ▼ ниже всех среди сравниваемых рынков — в каждой колонке отдельно</p>
            <p>Вне анализа: не подходят под условия — 1, не проверено — 0 (список внизу страницы).</p>
        </div>
    </x-platform.card>

    {{-- ==== Цена и параметры (свёрнут) ==== --}}
    <flux:accordion class="rounded-card border border-line bg-white px-5">
        <flux:accordion.item>
            <flux:accordion.heading class="min-h-14 text-lg! font-semibold!">
                Цена и параметры
            </flux:accordion.heading>
        </flux:accordion.item>
    </flux:accordion>

    {{-- ==== График цен ==== --}}
    <x-platform.card>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="text-lg font-semibold leading-snug">График цен</h2>
            <flux:button size="sm" variant="ghost" icon="photo">Копировать график</flux:button>
        </div>
        <div class="flex flex-col gap-2 rounded-control border border-line-soft p-3">
            <img src="img/compare-1440.png" alt="" class="mock-img hidden sm:block">
            <img src="img/compare-375.png" alt="" class="mock-img sm:hidden">
        </div>
        <div class="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_15rem_1fr]">
            <flux:input label="Сравнить цену (EUR)" placeholder="напр. 25 000" />
            <x-platform.money label="Бюджет клиента (zł, «под ключ» в Польше)" currency="zł" value="95 000" />
            <div class="flex flex-col gap-2 sm:col-span-2 lg:col-span-1 lg:items-end lg:justify-end">
                <flux:radio.group variant="segmented" size="sm" value="rank">
                    <flux:radio value="rank" label="Порядок цен" checked />
                    <flux:radio value="mileage" label="Пробег" />
                    <flux:radio value="year" label="Год" />
                </flux:radio.group>
            </div>
        </div>
        <div class="flex flex-wrap gap-3">
            <flux:radio.group variant="segmented" size="sm" value="two">
                <flux:radio value="two" label="Отдельные графики" checked />
                <flux:radio value="one" label="Один график" />
            </flux:radio.group>
            <flux:radio.group variant="segmented" size="sm" value="shared">
                <flux:radio value="shared" label="Общая шкала" checked />
                <flux:radio value="own" label="Своя шкала" />
            </flux:radio.group>
        </div>
        <div class="flex flex-col gap-2 border-t border-line-soft pt-3">
            <span class="text-sm font-semibold">Шанс покупки в бюджете · 95 000 zł</span>
            <div class="flex flex-wrap gap-x-4 gap-y-2">
                @foreach ($chances as [$key, $label, $tone, $fit])
                    <span class="inline-flex items-center gap-1.5">{{ $flag($key) }}<x-platform.badge :tone="$tone">{{ $label }}</x-platform.badge><span class="text-caption text-muted">{{ $fit }} объявлений в бюджете</span></span>
                @endforeach
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
            @foreach ([['PL', '#2f5fd0', ''], ['DE', '#e8701a', ' · под ключ'], ['NL', '#1f8aa6', ' · под ключ'], ['BE', '#c8235b', ' · под ключ']] as [$key, $color, $tag])
                <span class="inline-flex items-center gap-1.5"><i class="size-2.5 rounded-full" style="background: {{ $color }}"></i>{{ $flag($key) }}{{ \App\Portals\Analysis\Markets::name($key) }}@if ($tag)<span class="text-muted">{{ $tag }}</span>@endif</span>
            @endforeach
            <span class="inline-flex items-center gap-1.5"><i class="h-0 w-4 border-t-2 border-ink-soft/60"></i>Кривая цен</span>
            <span class="inline-flex items-center gap-1.5"><i class="size-3 rounded-[3px] bg-good/25"></i>Низ рынка</span>
            <span class="inline-flex items-center gap-1.5"><i class="size-3 rounded-[3px] bg-brand/25"></i>Средние цены</span>
            <span class="inline-flex items-center gap-1.5"><i class="size-3 rounded-[3px] bg-danger/25"></i>Верх рынка</span>
            <span class="inline-flex items-center gap-1.5"><i class="h-0 w-4 border-t border-dashed border-ink-soft"></i>медиана другого рынка (для сравнения)</span>
            <span class="inline-flex items-center gap-1.5"><i class="h-0 w-4 border-t-2 border-good"></i>Ваш бюджет</span>
        </div>
        <img src="img/panels-1440.png" alt="" class="mock-img hidden sm:block">
        <img src="img/panels-375.png" alt="" class="mock-img sm:hidden">
        <flux:accordion class="rounded-control border border-line-soft px-3">
            <flux:accordion.item expanded>
                <flux:accordion.heading class="text-sm!">Из чего складывается цена «под ключ»</flux:accordion.heading>
                <flux:accordion.content>
                    <dl class="flex max-w-xl flex-col text-sm tabular-nums">
                        @foreach ([['Цена брутто в объявлении', ''], ['+ Доставка (в среднем)', 'ок. 2 500 zł нетто'], ['+ Осмотр (в среднем)', 'ок. 1 500 zł нетто'], ['+ Акциз (тип и объём двигателя)', '3,1 % (дизель до 2000 см³)'], ['+ Переводы документов', '250 zł'], ['+ Техосмотр', '150 zł'], ['+ Вознаграждение Auto Nowak Import', '2 250 zł + 1,23 % цены авто']] as [$k, $v])
                            <div class="flex justify-between gap-4 border-t border-line-soft py-1.5 first:border-t-0"><dt class="text-ink-soft">{{ $k }}</dt><dd class="text-right font-medium">{{ $v }}</dd></div>
                        @endforeach
                    </dl>
                    <p class="mt-2 text-caption text-muted">Точную стоимость конкретного предложения рассчитает менеджер.</p>
                </flux:accordion.content>
            </flux:accordion.item>
        </flux:accordion>
    </x-platform.card>

    {{-- ==== Вывод ==== --}}
    <x-platform.card>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="text-lg font-semibold leading-snug">Вывод</h2>
            <flux:button size="sm" variant="ghost" icon="photo">Копировать вывод</flux:button>
        </div>
        <p class="text-lg font-semibold leading-snug">В Польше такое же авто на <span class="text-warn">19 800 zł</span> дешевле — но за эту разницу вы берёте на себя больший риск.</p>
        <div class="grid gap-3 md:grid-cols-3">
            <div class="flex flex-col gap-2 rounded-control bg-surface-soft p-4">
                <span class="flex items-center gap-2 text-caption text-muted"><flux:icon.scale class="size-5 text-brand" />Такое же авто (2020, 119 000 км)</span>
                <dl class="flex flex-col gap-1 tabular-nums">
                    <div><dt class="flex items-center gap-1.5 text-[12px] text-muted">{{ $flag('DE') }}Германия</dt><dd class="text-[26px] font-bold leading-tight">105 300 zł</dd></div>
                    <div><dt class="flex items-center gap-1.5 text-[12px] text-muted">{{ $flag('PL') }}Польша</dt><dd class="text-[26px] font-bold leading-tight">85 500 zł</dd></div>
                </dl>
                <x-platform.badge tone="warn" class="self-start">+23% из Германии</x-platform.badge>
            </div>
            <div class="flex flex-col gap-2 rounded-control bg-surface-soft p-4">
                <span class="flex items-center gap-2 text-caption text-muted"><flux:icon.gauge class="size-5 text-brand" />Пробег в среднем</span>
                <span class="text-[26px] font-bold leading-tight tabular-nums">−3 493 км</span>
                <span class="text-caption text-ink-soft">из Германии: 119 974 км против 123 467 км в Польше</span>
            </div>
            <div class="flex flex-col gap-2 rounded-control bg-surface-soft p-4">
                <span class="flex items-center gap-2 text-caption text-muted"><flux:icon.wallet class="size-5 text-brand" />Ваш бюджет · 95 000 zł</span>
                @foreach ([['PL', 'высокий', 'good', '19 из 30', 63], ['DE', 'умеренный', 'warn', '11 из 39', 28], ['BE', 'очень низкий', 'danger', '1 из 12', 8], ['NL', 'очень низкий', 'danger', '1 из 24', 4]] as [$key, $label, $tone, $fit, $pct])
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-1.5 text-sm">{{ $flag($key) }}<span>{{ \App\Portals\Analysis\Markets::name($key) }}</span><x-platform.badge :tone="$tone" class="py-0!">{{ $label }}</x-platform.badge><span class="ml-auto whitespace-nowrap font-semibold tabular-nums">{{ $fit }}</span></div>
                        <div class="h-1.5 rounded-full bg-chip"><div class="h-1.5 rounded-full {{ ['good' => 'bg-good', 'warn' => 'bg-warn', 'danger' => 'bg-danger'][$tone] }}" style="width: {{ $pct }}%"></div></div>
                    </div>
                @endforeach
                <span class="text-caption text-muted">столько авто укладывается в бюджет</span>
            </div>
        </div>
        <div class="flex flex-col gap-3 rounded-card border border-warn-line bg-warn-soft/40 p-4">
            <h3 class="font-semibold text-warn">За что вы доплачиваете 19 800 zł, покупая авто из Германии</h3>
            <div class="grid gap-3 md:grid-cols-2">
                <div class="flex flex-col gap-1.5 rounded-control border border-line bg-white p-3.5">
                    <span class="flex items-center gap-1.5 font-semibold">{{ $flag('DE') }}Из Германии</span>
                    @foreach (['чаще без аварий и с понятной историей', 'подтверждённое обслуживание (книжка, счета)', 'пробег подтверждён историей обслуживания', 'обычно богаче оснащение за те же деньги'] as $t)
                        <span class="flex gap-2 text-sm text-ink-soft"><flux:icon.check class="mt-0.5 size-4 shrink-0 text-good" />{{ $t }}</span>
                    @endforeach
                    <span class="text-caption text-muted">в среднем по рынку Германии</span>
                </div>
                <div class="flex flex-col gap-1.5 rounded-control border border-line bg-white p-3.5">
                    <span class="flex items-center gap-1.5 font-semibold">{{ $flag('PL') }}Обычный риск в Польше</span>
                    @foreach (['объявления часто без истории — о прошлом авто вы знаете только со слов продавца', 'много авто, пригнанных раньше, в том числе после аварий и ремонта', 'комис добавляет к цене пригнанного авто свою наценку'] as $t)
                        <span class="flex gap-2 text-sm text-ink-soft"><flux:icon.exclamation-triangle class="mt-0.5 size-4 shrink-0 text-warn" />{{ $t }}</span>
                    @endforeach
                    <span class="text-caption text-muted">в целом о рынке Польши</span>
                </div>
            </div>
            <p class="text-sm text-ink-soft">Один скрытый ремонт после аварии обычно стоит больше этой разницы в цене.</p>
        </div>
        <div class="flex flex-col gap-2 border-t border-line-soft pt-4">
            <img src="img/ladder-1440.png" alt="" class="mock-img hidden sm:block">
            <img src="img/ladder-375.png" alt="" class="mock-img sm:hidden">
            <x-platform.badge tone="good" icon="check-circle" class="self-start whitespace-normal!">Больше всего авто в вашем бюджете: Польша — 19 из 30</x-platform.badge>
        </div>
        <div class="flex flex-col gap-3 border-t border-line-soft pt-4">
            <h3 class="font-semibold">Какие есть альтернативы?</h3>
            <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                @foreach ([['arrow-trending-up', 'Поднять бюджет', 'до 113 100 zł', 'половина объявлений из Германии — 20 авто (на 18 100 zł больше)'], ['gauge', 'Больший пробег', '150 000 – 200 000 км · около 92 000 zł', '6 из 10 авто в бюджете'], ['calendar', 'Год постарше в том же поколении', '2017–2018', 'то же поколение (Octavia III) — стоит добавить в поиск, обычно дешевле'], ['building-library', 'Аукцион в Германии и в Европе', '≈ 96 100 zł', 'всё ещё выше бюджета · без тест-драйва']] as [$icon, $label, $value, $note])
                    <div class="flex flex-col gap-1.5 rounded-control bg-surface-soft p-3.5">
                        <dt class="flex items-center gap-2 text-caption text-muted"><flux:icon :icon="$icon" class="size-5 shrink-0 text-brand" />{{ $label }}</dt>
                        <dd class="text-lg font-semibold leading-snug">{{ $value }}</dd>
                        <dd class="text-caption text-ink-soft">{{ $note }}</dd>
                    </div>
                @endforeach
            </dl>
        </div>
        <x-platform.callout tone="neutral" icon="shield-check"><b>Почему с Auto Nowak Import.</b> У авто из-за границы обычно подтверждённая сервисная история, а каждое из них мы проверяем перед покупкой.</x-platform.callout>
        <p class="text-caption text-muted">Сравниваем авто того же года и с похожим пробегом; комплектация и состояние могут изменить цену.</p>
    </x-platform.card>

    {{-- ==== Актуальные объявления ==== --}}
    <x-platform.card>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="text-lg font-semibold leading-snug">Актуальные объявления · 105</h2>
            <flux:button size="sm" variant="ghost" icon="photo">Копировать список</flux:button>
            <flux:button size="sm" variant="ghost" icon="document-arrow-down">Список PDF</flux:button>
            <div class="flex-1"></div>
            <div class="w-full sm:w-64"><flux:select size="sm" placeholder="Цена: сначала дешёвые"><flux:select.option>Цена: сначала дешёвые</flux:select.option></flux:select></div>
        </div>
        <div class="flex flex-col gap-2">
            <h3 class="font-semibold">Лучшие предложения в вашем бюджете <span class="text-caption font-normal text-muted">· самая низкая цена по сравнению с похожими авто</span></h3>
            <div class="grid gap-3 md:grid-cols-3">
                @foreach ([['DE', 'Combi 2.0 TDI Ambition', '2019 · 189 000 км · Köln', '72 550 zł', '−36%'], ['NL', 'Combi 2.0 TDI DSG Style', '2019 · 217 000 км · Den Haag', '87 050 zł', '−28%'], ['DE', '2.0 TDI SCR DSG Style', '2019 · 210 000 км · Leipzig', '81 300 zł', '−28%']] as [$key, $version, $facts, $price, $dev])
                    <div class="flex flex-col gap-2 rounded-control border border-line p-3.5">
                        <a href="#" class="flex flex-col gap-0.5 hover:text-brand">
                            <span class="flex items-center gap-1.5 font-semibold">{{ $flag($key) }}Skoda Octavia</span>
                            <span class="text-sm text-ink-soft">{{ $version }}</span>
                            <span class="text-caption text-muted">{{ $facts }}</span>
                        </a>
                        <div class="mt-auto flex items-end gap-2">
                            <span class="flex flex-col"><span class="text-lg font-bold tabular-nums">{{ $price }}</span><x-platform.badge tone="good" class="mt-0.5">{{ $dev }} от медианы</x-platform.badge></span>
                            <div class="flex-1"></div>
                            <flux:tooltip content="Подготовить оффер"><flux:button variant="ghost" icon="document-text" square class="size-11! text-muted!" /></flux:tooltip>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
        <div class="flex flex-col gap-2 border-t border-line-soft pt-4">
            <h3 class="font-semibold">Как быстро движется рынок <span class="text-caption font-normal text-muted">· хорошие предложения уходят быстро — решать стоит за несколько дней</span></h3>
            <div class="grid gap-x-6 gap-y-3 md:grid-cols-2">
                @foreach ([['PL', '7 из 30', '5%'], ['DE', '8 из 39', '5%'], ['NL', '7 из 24', '4%'], ['BE', '3 из 12', '5%']] as [$key, $drop, $avg])
                    <div class="flex flex-col gap-1.5">
                        <span class="flex items-center gap-1.5 text-sm font-semibold">{{ $flag($key) }}{{ \App\Portals\Analysis\Markets::name($key) }}</span>
                        <dl class="grid grid-cols-2 gap-2">
                            <x-platform.fact icon="clock" label="В продаже в среднем" value="5 дн." />
                            <x-platform.fact icon="arrow-trending-down" label="Подешевело"><span class="text-good">{{ $drop }}</span> <span class="block text-[12px] font-normal text-ink-soft">в среднем на {{ $avg }}</span></x-platform.fact>
                        </dl>
                    </div>
                @endforeach
            </div>
        </div>
        <div class="flex flex-col gap-3 border-t border-line-soft pt-4">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div class="w-full sm:w-96"><flux:input icon="magnifying-glass" placeholder="Поиск в предложениях: версия, город, топливо…" /></div>
                <span class="text-caption text-muted">Отметьте 2–3 предложения в колонке VS, чтобы их сравнить.</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-caption"><span class="font-semibold">У всех объявлений:</span><x-platform.badge tone="neutral">Топливо: дизель</x-platform.badge></div>
            <div class="max-lg:hidden">
                <flux:table container:class="max-h-[min(72vh,760px)] rounded-control border border-line-soft" class="min-w-[1180px] tabular-nums">
                    <flux:table.columns sticky class="bg-white">
                        <flux:table.column class="w-10 ps-3!" align="end">#</flux:table.column>
                        <flux:table.column class="w-10">VS</flux:table.column>
                        <flux:table.column sortable class="w-52">Объявление</flux:table.column>
                        <flux:table.column sortable align="end" class="w-16">Год</flux:table.column>
                        <flux:table.column sortable align="end" class="w-28">Пробег</flux:table.column>
                        <flux:table.column sortable align="end" class="w-24">Двигатель</flux:table.column>
                        <flux:table.column class="w-20">Коробка</flux:table.column>
                        <flux:table.column sortable sorted direction="asc" align="end" class="w-36">Цена</flux:table.column>
                        <flux:table.column sortable align="end" class="w-24 whitespace-normal">От медианы</flux:table.column>
                        <flux:table.column sortable align="end" class="w-24 whitespace-normal">В продаже</flux:table.column>
                        <flux:table.column sortable align="end" class="w-36">Снижение</flux:table.column>
                        <flux:table.column class="w-28">Продавец</flux:table.column>
                        <flux:table.column class="w-36 pe-3!">Ссылка</flux:table.column>
                    </flux:table.columns>
                    <flux:table.rows>
                        @foreach ($rows as [$n, $version, $year, $km, $hp, $gear, $price, $ad, $dev, $days, $drop, $seller, $city, $portal])
                            <flux:table.row>
                                <flux:table.cell align="end" class="ps-3! align-top text-muted">{{ $n }}</flux:table.cell>
                                <flux:table.cell class="align-top"><flux:checkbox /></flux:table.cell>
                                <flux:table.cell class="align-top whitespace-normal"><span class="flex flex-col"><a href="#" class="font-semibold text-ink hover:text-brand">Skoda Octavia</a><span class="text-caption text-muted">{{ $version }}</span></span></flux:table.cell>
                                <flux:table.cell align="end" class="align-top">{{ $year }}</flux:table.cell>
                                <flux:table.cell align="end" class="align-top">{{ $km }}</flux:table.cell>
                                <flux:table.cell align="end" class="align-top">{{ $hp }}</flux:table.cell>
                                <flux:table.cell class="align-top">{{ $gear }}</flux:table.cell>
                                <flux:table.cell align="end" class="align-top"><span class="flex flex-col items-end"><span class="font-semibold text-ink">{{ $price }}@if ($ad)<span class="text-caption font-normal text-muted"> под ключ*</span>@endif</span>@if ($ad)<span class="text-[12px] text-muted">цена в объявлении: {{ $ad }}</span>@endif</span></flux:table.cell>
                                <flux:table.cell align="end" class="align-top text-good">{{ $dev }}</flux:table.cell>
                                <flux:table.cell align="end" class="align-top">{{ $days }}</flux:table.cell>
                                <flux:table.cell align="end" class="align-top">@if ($drop)<span class="flex flex-col items-end"><x-platform.badge tone="good" icon="arrow-trending-down">{{ $drop[0] }}</x-platform.badge><span class="text-[12px] text-muted">было {{ $drop[1] }}</span></span>@else<span class="text-muted">—</span>@endif</flux:table.cell>
                                <flux:table.cell class="align-top"><span class="flex flex-col"><span>{{ $seller }}</span><span class="text-caption text-muted">{{ $city }}</span></span></flux:table.cell>
                                <flux:table.cell class="pe-3! align-top"><a href="#" class="inline-flex min-h-8 items-center gap-1.5 text-brand hover:underline"><x-dealers.portal-mark :portal="$portal" size="sm" />{{ $portal === Portal::Otomoto ? 'otomoto' : 'AutoScout24' }}</a></flux:table.cell>
                            </flux:table.row>
                        @endforeach
                    </flux:table.rows>
                </flux:table>
            </div>
            {{-- Телефон: строка — карточкой (таблица шириной 900 px давала прокрутку вбок) --}}
            <ul class="flex flex-col gap-2 lg:hidden">
                @foreach (array_slice($rows, 0, 4) as [$n, $version, $year, $km, $hp, $gear, $price, $ad, $dev, $days, $drop, $seller, $city, $portal])
                    <li class="flex gap-3 rounded-control border border-line-soft p-3">
                        <flux:checkbox class="mt-0.5" />
                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            <span class="font-semibold leading-snug">Skoda Octavia <span class="font-normal text-ink-soft">{{ $version }}</span></span>
                            <span class="text-caption text-muted">{{ $year }} · {{ $km }} · {{ $hp }} · {{ $gear }} · {{ $seller }}, {{ $city }}</span>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-lg font-bold tabular-nums">{{ $price }}</span>
                                <x-platform.badge tone="good">{{ $dev }} от медианы</x-platform.badge>
                                @if ($drop)<x-platform.badge tone="good" icon="arrow-trending-down">было {{ $drop[1] }}</x-platform.badge>@endif
                            </div>
                        </div>
                        <a href="#" class="flex size-11 shrink-0 items-center justify-center"><x-dealers.portal-mark :portal="$portal" size="sm" /></a>
                    </li>
                @endforeach
            </ul>
            <p class="text-caption text-muted">* «Под ключ» в Польше — из чего складывается, в таблице под графиком. Для otomoto и av.by — цена в объявлении.</p>
            <div class="flex flex-wrap items-center gap-3"><span class="text-caption text-muted">Показано 100 из 105</span><flux:button class="max-sm:w-full">Показать ещё</flux:button></div>
        </div>
    </x-platform.card>

    {{-- ==== История цен, вне анализа ==== --}}
    <flux:accordion class="rounded-card border border-line bg-white px-5">
        <flux:accordion.item>
            <flux:accordion.heading class="min-h-14 text-lg! font-semibold!"><span class="flex flex-wrap items-center gap-x-3">История цен <span class="text-caption font-normal text-muted">медиана «под ключ» по дням: чтения «Анализа» и мониторинг</span></span></flux:accordion.heading>
        </flux:accordion.item>
    </flux:accordion>
    <x-platform.card heading="Вне анализа: не подходят под условия">
        <x-platform.callout tone="info">Часть порталов не умеет некоторые фильтры подборки и отдаёт машины шире. Такие машины не входят в статистику, график, вывод, PDF и мониторинг.</x-platform.callout>
        <flux:accordion class="rounded-control border border-line-soft px-3">
            <flux:accordion.item><flux:accordion.heading>Не подходят под условия · 1</flux:accordion.heading></flux:accordion.item>
        </flux:accordion>
    </x-platform.card>
</div>
<aside class="hidden w-[400px] shrink-0 lg:block"><img src="img/portals-1440.png" alt="" class="mock-img"></aside>
</div>
</main>
@fluxScripts
</body>
</html>
