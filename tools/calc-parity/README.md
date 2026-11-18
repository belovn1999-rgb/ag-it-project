# Сверка двух калькуляторов: сайт и платформа (18.11.2026)

Сравнивает формулу калькулятора сайта (`autogood-site/site/lib/calculator.ts`) с настоящим кодом калькулятора
платформы (`App\Calculator\Calculator` + `DefaultTemplate`, числа — `config/zrok.php` `pricing`) на одних и тех же входах.
Без базы и без сети (платформа берётся из `~/cloude/mantexlab-tools/platform`, сайт — из `~/cloude/autogood-site/site`).

- `compare.mts noreg` — одинаковые входы (курс, доставка, осмотр), без регистрации: 12 стран сайта × netto / brutto ×
  7 видов топлива × 3 объёма × осмотр да / нет × 5 цен = 5 040 расчётов; расхождения — в `diffs-noreg.json`.
- `compare.mts full` — то же с регистрацией (сайт 160 zł всегда, платформа — флаг «Rejestracja» 600 zł).
- `real.mts 20000` — как сегодня видит каждый: свой курс, свои тарифы доставки и осмотра (курсы в начале файла — поправить).

Запуск из `autogood-site/site` (там лежат `lib/*.ts`):

```bash
PATH=~/cloude/.tools/node/bin:$PATH node --conditions=react-server ~/cloude/autogood-kalkulatory/tools/calc-parity/compare.mts noreg
```

Итог 18.11 — `docs/PLATFORM-CALCULATOR.md` §5н.
