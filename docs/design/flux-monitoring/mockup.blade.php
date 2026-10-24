{{--
    Макет «Мониторинг» на Flux Pro (волна 9.8.0, В0) — НЕ код платформы: статичная страница на настоящих деталях и
    цифрах локальной копии (выдуманные данные). $bar: 'none' (вариант A) | 'run' (B — нижняя полоса телефона).
--}}
@php
    use App\Portals\Portal;
    $bar ??= 'none';
    $search = \App\Models\PortalSearch::find(2);
    $flag = fn (string $c) => new \Illuminate\Support\HtmlString(\App\Portals\Analysis\Flags::svg($c));
    $tiles = [
        ['all', null, 'Все порталы', '105 авто', [['+2 новых', 'fresh'], ['−3 исчезло', 'muted'], ['3 подешевели', 'good']], 'от 65 000 zł · медиана 107 350 zł'],
        ['mobile_de', Portal::MobileDe, 'mobile.de', null, [], 'mobile.de сегодня не читался: его читает расширение — кнопка «Прочитать mobile.de».'],
        ['as_de', Portal::AutoScoutDe, 'AutoScout24 (Германия)', '39 авто', [['+1 новое', 'fresh'], ['−2 исчезло', 'muted']], 'от 72 550 zł'],
        ['otomoto', Portal::Otomoto, 'otomoto.pl', '30 авто', [['−1 исчезло', 'muted']], 'от 65 000 zł'],
        ['as_nl', Portal::AutoScoutNl, 'AutoScout24 (Нидерланды)', '15 авто', [['1 подешевело', 'good']], 'от 99 050 zł'],
        ['marktplaats', Portal::Marktplaats, 'Marktplaats', '9 авто', [['2 подешевели', 'good']], 'от 87 050 zł'],
        ['as_be', Portal::AutoScoutBe, 'AutoScout24 (Бельгия)', '12 авто', [['+1 новое', 'fresh']], 'от 91 900 zł'],
    ];
    $rows = [
        [1, '2.0 TDI SCR DSG Style', 2020, '156 000 км', '91 900 zł', '18 290 € · брутто', null, '+2 %', '26 похожих', 'с сегодня', 'BE', 'Liège · BE', Portal::AutoScoutBe],
        [2, 'Combi 2.0 TDI DSG Style', 2022, '96 000 км', '134 800 zł', '27 590 € · брутто', 'НДС к вычету', '+19 %', '16 похожих', 'с сегодня', 'DE', 'Hannover · DE', Portal::AutoScoutDe],
    ];
@endphp
<!DOCTYPE html>
<html lang="ru">
<head>
    @include('partials.head', ['lightOnly' => true])
    <style>.mock-img { width: 100%; height: auto; }</style>
</head>
<body class="min-h-screen bg-page text-[15px] leading-normal text-ink antialiased">
<img src="img/nav-1440.png" alt="" class="mock-img hidden sm:block">
<img src="img/nav-375.png" alt="" class="mock-img sm:hidden">
<main class="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 pt-5 sm:px-6 sm:pt-7 {{ $bar === 'run' ? 'pb-24 lg:pb-12' : 'pb-12' }}">

    <x-platform.page-header title="Skoda Octavia">
        <x-slot:crumbs><a href="#" class="text-brand hover:underline">Поиск дилеры</a><span>/</span><a href="#" class="text-brand hover:underline">Skoda Octavia</a><span>/</span><span>Мониторинг</span></x-slot:crumbs>
        <x-slot:actions>
            <x-platform.history-folder label="Все подборки" count="3" align="end" class="max-sm:w-full" />
            <x-platform.locale-switch />
        </x-slot:actions>
    </x-platform.page-header>
    <p class="-mt-3 text-ink-soft">Klient: kombi, automat, do 95 000 zł na gotowo</p>
    <x-dealers.tabs :search="$search" active="monitoring" />

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-6">
        <div class="flex min-w-0 flex-col gap-5">
            {{-- Параметры подборки (решение 18.10: кнопки вверху справа, марка и модель, бюджет) --}}
            <x-platform.card>
                <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
                    <dl class="flex gap-6">
                        <div><dt class="text-caption text-muted">Марка</dt><dd class="text-[22px] font-bold leading-tight">Skoda</dd></div>
                        <div><dt class="text-caption text-muted">Модель</dt><dd class="text-[22px] font-bold leading-tight">Octavia</dd></div>
                    </dl>
                    <div class="flex-1"></div>
                    <div class="flex gap-2 max-sm:w-full [&>*]:max-sm:flex-1">
                        <flux:button size="sm" icon="photo" class="pointer-coarse:min-h-11">Копировать данные</flux:button>
                        <flux:button size="sm" icon="envelope" class="pointer-coarse:min-h-11">E-mail</flux:button>
                    </div>
                </div>
                <div class="flex flex-col gap-1.5">
                    <div class="grid max-w-md grid-cols-2 gap-3">
                        <x-platform.money label="Бюджет клиента от" currency="zł" placeholder="—" />
                        <x-platform.money label="до" currency="zł" placeholder="—" />
                    </div>
                    <span class="text-caption text-muted">Акциз 3,1 % — по объёму и топливу из «Поиска»</span>
                </div>
                <div class="flex flex-wrap gap-2 border-t border-line-soft pt-4">
                    <a href="#" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-chip px-3.5 text-sm"><flux:icon.calendar class="size-4 text-muted" /><span class="text-muted">Год</span> <b>2019–2022</b></a>
                    <a href="#" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-chip px-3.5 text-sm"><flux:icon.fuel class="size-4 text-muted" /><span class="text-muted">Двигатель</span> <b>дизель</b></a>
                    <a href="#" class="inline-flex min-h-10 flex-wrap items-center gap-1.5 rounded-[20px] border border-line bg-chip px-3.5 py-1.5 text-sm"><flux:icon.map-pin class="size-4 text-muted" /><span class="text-muted">Рынки</span> {{ $flag('DE') }}{{ $flag('PL') }}{{ $flag('NL') }}{{ $flag('BE') }} <b>Германия, Польша, Нидерланды, Бельгия</b></a>
                    @foreach (['Пробег', 'Цена объявления', 'Коробка', 'Кузов', 'Состояние', 'Продавец', 'НДС'] as $label)
                        <a href="#" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-control px-3.5 text-sm text-muted hover:border-muted"><flux:icon.plus class="size-4" />{{ $label }} <span class="font-medium text-brand">любой — задать</span></a>
                    @endforeach
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line-soft pt-4">
                    <span class="text-sm font-semibold">Способ покупки</span>
                    <flux:radio.group variant="segmented">
                        <flux:radio value="direct" label="Напрямую" checked />
                        <flux:radio value="firm" label="Через фирму" />
                    </flux:radio.group>
                    <flux:checkbox label="только НДС к вычету" />
                </div>
            </x-platform.card>

            <flux:accordion class="rounded-card border border-line bg-white px-5">
                <flux:accordion.item>
                    <flux:accordion.heading class="min-h-14 text-lg! font-semibold!"><span class="flex items-center gap-2"><flux:icon.globe-alt class="size-5 text-muted" />Страны и порталы</span></flux:accordion.heading>
                </flux:accordion.item>
            </flux:accordion>
        </div>

        {{-- Правая панель: расписание и письмо --}}
        <x-platform.card class="self-start lg:sticky lg:top-5">
            <flux:switch label="Мониторинг включён" checked align="left" />
            <div class="grid grid-cols-2 gap-3">
                <flux:select label="Частота"><flux:select.option selected>каждый день</flux:select.option></flux:select>
                <flux:time-picker label="Время" value="09:30" />
            </div>
            <flux:button variant="subtle" size="sm" icon="plus" class="self-start pointer-coarse:min-h-11">Добавить время</flux:button>
            <div class="flex flex-col gap-2 border-t border-line-soft pt-4">
                <flux:input label="Утреннее письмо" value="dealers-design@zrok.test" icon="envelope" />
                <flux:button size="sm" icon="paper-airplane" class="self-start pointer-coarse:min-h-11">Отправить тестовое письмо</flux:button>
            </div>
            <dl><x-platform.fact icon="calendar-days" label="Следующий мониторинг" value="завтра в 09:30" /></dl>
            <x-platform.callout tone="warn">Почта сервера ещё не настроена: письма не уходят, а только записываются в журнал сервера. Нужны данные почтового ящика (SMTP) в настройках сервера — их вносит администратор.</x-platform.callout>
            <p class="text-caption text-muted">Мониторинг с 19.10.2026 · 5 дней · сохранено мониторингов: 6</p>
        </x-platform.card>
    </div>

    {{-- ==== Статистика ==== --}}
    <x-platform.card>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-3">
            <h2 class="text-lg font-semibold leading-snug">Статистика</h2>
            <div class="flex-1"></div>
            <div class="flex gap-2 max-sm:w-full max-sm:flex-col">
                <flux:button variant="primary" icon="arrow-path" class="min-h-11">Запустить мониторинг</flux:button>
                <flux:button icon-trailing="arrow-right" class="min-h-11">Анализ рынка</flux:button>
            </div>
        </div>
        <flux:accordion class="rounded-control border border-line-soft bg-surface-soft px-3">
            <flux:accordion.item><flux:accordion.heading><span class="flex items-center gap-2"><flux:icon.information-circle class="size-5 text-info" />Как работает мониторинг</span></flux:accordion.heading></flux:accordion.item>
        </flux:accordion>
        <x-platform.callout tone="info" icon="globe-alt">
            В проверке нет mobile.de: их читает ваш браузер — кнопка «Прочитать» рядом, прочитанное сегодня войдёт в проверку.
            <x-slot:actions>
                <div class="flex flex-wrap gap-2">
                    <flux:button size="sm" icon-trailing="arrow-top-right-on-square" class="pointer-coarse:min-h-11">Прочитать mobile.de</flux:button>
                    <flux:button size="sm" variant="ghost" class="text-brand! pointer-coarse:min-h-11">Установить расширение</flux:button>
                </div>
            </x-slot:actions>
        </x-platform.callout>
        <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            @foreach ($tiles as [$key, $portal, $name, $count, $changes, $note])
                <button type="button" @class(['flex min-w-0 flex-col items-start gap-1.5 rounded-control border p-3 text-left sm:p-4', 'col-span-2 lg:col-span-1' => $key === 'all', 'border-brand bg-selected ring-1 ring-brand' => $key === 'all', 'border-line bg-white hover:border-control' => $key !== 'all'])>
                    <span class="flex items-center gap-2 text-caption text-muted">
                        @if ($portal)<x-dealers.portal-mark :portal="$portal" size="sm" />@else<span class="flex size-7 items-center justify-center rounded-full bg-brand text-white"><flux:icon.squares-2x2 variant="micro" class="size-4" /></span>@endif
                        {{ $name }}
                    </span>
                    @if ($count)
                        <span class="text-xl font-bold leading-tight tabular-nums sm:text-2xl">{{ $count }}</span>
                    @else
                        <x-platform.badge tone="warn" icon="exclamation-triangle">Нет ответа</x-platform.badge>
                    @endif
                    @if ($changes)
                        <span class="flex flex-wrap gap-1">@foreach ($changes as [$text, $tone])<x-platform.badge :tone="$tone" class="py-0!">{{ $text }}</x-platform.badge>@endforeach</span>
                    @endif
                    <span class="text-caption text-muted">{{ $note }}</span>
                </button>
            @endforeach
        </div>
    </x-platform.card>

    {{-- ==== Список авто ==== --}}
    <x-platform.card>
        <h2 class="text-lg font-semibold leading-snug">Список авто</h2>
        <flux:tab.group>
            <flux:tabs scrollable>
                <flux:tab name="list" selected>Объявления</flux:tab>
                <flux:tab name="history">История цен</flux:tab>
                <flux:tab name="market">Рынок в выбранный день</flux:tab>
            </flux:tabs>
        </flux:tab.group>
        <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            @foreach ([['★ Избранное', 0], ['Новые', 2], ['Исчезли', 3], ['Актуальные', 105], ['Около фильтров', 2], ['Просмотренные', 0], ['Отправлены клиенту', 0]] as [$label, $n])
                <x-platform.pill small :active="$label === 'Новые'" class="shrink-0 pointer-coarse:min-h-11">{{ $label }} <span @class(['ml-1 rounded-full px-1.5 text-[12px] tabular-nums', 'bg-white/20' => $label === 'Новые', 'bg-chip text-ink-soft' => $label !== 'Новые'])>{{ $n }}</span></x-platform.pill>
            @endforeach
            <flux:button size="sm" icon="document-arrow-down" disabled class="shrink-0 rounded-full! pointer-coarse:min-h-11">PDF для клиента · 0</flux:button>
        </div>
        <div class="flex flex-col gap-2">
            <span class="text-caption font-semibold text-ink">Ликвидность рынка</span>
            <dl class="grid gap-2 sm:grid-cols-3">
                <x-platform.fact icon="clock" label="медиана" value="≥ 5 дней в продаже" />
                <x-platform.fact icon="arrow-trending-down" label="со снижением цены" value="25 из 105 (24 %)" />
                <x-platform.fact icon="archive-box-x-mark" label="исчезло за последние 7 дней" value="19" />
            </dl>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <div class="w-full sm:w-96"><flux:input icon="magnifying-glass" placeholder="Поиск в предложениях: версия, город, топливо…" /></div>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-caption">
            <span class="font-semibold">У всех объявлений:</span>
            @foreach (['Топливо Дизель', 'Мощность 150 л. с.', 'Коробка АКПП', 'Продавец Дилер'] as $common)
                <x-platform.badge tone="neutral">{{ $common }}</x-platform.badge>
            @endforeach
            <span class="text-muted">Медиана «под ключ»: <b class="text-ink">107 350 zł</b> (105 авто)</span>
        </div>
        <div class="max-lg:hidden">
            <flux:table class="tabular-nums">
                <flux:table.columns>
                    <flux:table.column class="w-10 ps-3!" align="end">#</flux:table.column>
                    <flux:table.column class="w-20"><span class="sr-only">Фото</span></flux:table.column>
                    <flux:table.column class="w-64">Объявление</flux:table.column>
                    <flux:table.column sortable align="end" class="w-16">Год</flux:table.column>
                    <flux:table.column sortable align="end" class="w-28">Пробег</flux:table.column>
                    <flux:table.column sortable sorted direction="asc" align="end" class="w-40">Цена «под ключ»</flux:table.column>
                    <flux:table.column sortable align="end" class="w-28">От медианы</flux:table.column>
                    <flux:table.column class="w-24">На рынке</flux:table.column>
                    <flux:table.column class="w-36">Город</flux:table.column>
                    <flux:table.column sortable class="w-20">Портал</flux:table.column>
                    <flux:table.column class="w-44 pe-3!"><span class="sr-only">Действия</span></flux:table.column>
                </flux:table.columns>
                <flux:table.rows>
                    @foreach ($rows as [$n, $version, $year, $km, $price, $ad, $vat, $dev, $similar, $since, $country, $city, $portal])
                        <flux:table.row class="[&>td:first-child]:shadow-[inset_3px_0_0_var(--color-highlight)]">
                            <flux:table.cell align="end" class="ps-3! align-top font-semibold text-fresh!">{{ $n }}</flux:table.cell>
                            <flux:table.cell class="align-top"><span class="flex h-12 w-16 items-center justify-center rounded-control bg-chip text-muted"><flux:icon.photo class="size-5" /></span></flux:table.cell>
                            <flux:table.cell class="align-top whitespace-normal"><a href="#" class="font-semibold text-ink hover:text-brand">Skoda Octavia {{ $version }}</a></flux:table.cell>
                            <flux:table.cell align="end" class="align-top">{{ $year }}</flux:table.cell>
                            <flux:table.cell align="end" class="align-top">{{ $km }}</flux:table.cell>
                            <flux:table.cell align="end" class="align-top"><span class="flex flex-col items-end"><b class="text-[17px] text-ink">{{ $price }}</b><span class="text-[12px] text-muted">{{ $ad }}</span>@if ($vat)<x-platform.badge tone="info" class="mt-0.5 py-0!">{{ $vat }}</x-platform.badge>@endif</span></flux:table.cell>
                            <flux:table.cell align="end" class="align-top"><span class="flex flex-col items-end"><b class="text-danger">{{ $dev }}</b><span class="text-[12px] text-muted">{{ $similar }}</span></span></flux:table.cell>
                            <flux:table.cell class="align-top">{{ $since }}</flux:table.cell>
                            <flux:table.cell class="align-top"><span class="inline-flex items-center gap-1.5">{{ $flag($country) }}{{ $city }}</span></flux:table.cell>
                            <flux:table.cell class="align-top"><x-dealers.portal-mark :portal="$portal" size="sm" /></flux:table.cell>
                            <flux:table.cell class="pe-3! align-top">
                                <span class="flex items-center justify-end gap-1">
                                    <flux:button size="sm" icon="document-text">Оффер</flux:button>
                                    <flux:dropdown><flux:button size="sm" variant="ghost" icon="ellipsis-horizontal" square /></flux:dropdown>
                                    <flux:button size="sm" variant="ghost" icon="star" icon:variant="outline" square class="text-muted!" />
                                </span>
                            </flux:table.cell>
                        </flux:table.row>
                    @endforeach
                </flux:table.rows>
            </flux:table>
        </div>
        <ul class="flex flex-col gap-2 lg:hidden">
            @foreach ($rows as [$n, $version, $year, $km, $price, $ad, $vat, $dev, $similar, $since, $country, $city, $portal])
                <li class="flex flex-col gap-2 rounded-control border border-line-soft p-3 shadow-[inset_3px_0_0_var(--color-highlight)]">
                    <div class="flex gap-3">
                        <span class="flex h-14 w-20 shrink-0 items-center justify-center rounded-control bg-chip text-muted"><flux:icon.photo class="size-5" /></span>
                        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <a href="#" class="font-semibold leading-snug">Skoda Octavia {{ $version }}</a>
                            <span class="text-caption text-muted">{{ $year }} · {{ $km }} · <span class="inline-flex items-center gap-1 align-middle">{{ $flag($country) }}{{ $city }}</span></span>
                        </div>
                        <flux:button variant="ghost" icon="star" icon:variant="outline" square class="size-11! text-muted!" />
                    </div>
                    <div class="flex flex-wrap items-end gap-x-3 gap-y-1">
                        <span class="flex flex-col"><b class="text-lg tabular-nums">{{ $price }}</b><span class="text-[12px] text-muted">{{ $ad }}@if ($vat) · {{ $vat }}@endif</span></span>
                        <b class="text-danger">{{ $dev }}</b>
                        <span class="text-caption text-muted">{{ $since }}</span>
                    </div>
                    <div class="flex gap-2">
                        <flux:button icon="document-text" class="min-h-11 flex-1">Оффер</flux:button>
                        <flux:button variant="ghost" icon="ellipsis-horizontal" square class="size-11!" />
                    </div>
                </li>
            @endforeach
        </ul>
    </x-platform.card>
</main>
@if ($bar === 'run')
    <x-platform.mobile-bar label="Следующий мониторинг" value="завтра в 09:30">
        <flux:button variant="primary" icon="arrow-path" square class="size-11!" aria-label="Запустить мониторинг" />
    </x-platform.mobile-bar>
@endif
@fluxScripts
</body>
</html>
