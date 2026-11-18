<?php
// Прогон настоящего App\Calculator\Calculator платформы по сетке входов из stdin (JSON), ответ — JSON в stdout.
chdir('/Users/nikitq/cloude/mantexlab-tools/platform');
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$settings = new class extends App\Settings\Settings {
    public function group(string $group): array { return config("zrok.settings.$group"); }
    public function get(string $key, mixed $default = null): mixed { return config("zrok.settings.$key", $default); }
};
$override = json_decode(getenv('PRICING_OVERRIDE') ?: '{}', true);
if ($override) { config(['zrok.settings.pricing' => array_replace(config('zrok.settings.pricing'), $override)]); }
$calc = new App\Calculator\Calculator($settings, App\Calculator\DefaultTemplate::get());
$cases = json_decode(stream_get_contents(STDIN), true);
$out = [];
foreach ($cases as $c) {
    $r = $calc->calculate(App\Calculator\CalculationInput::fromArray($c));
    $rows = [];
    foreach ($r->rows as $row) { $rows[$row['key']] = round($row['value'], 2); }
    $out[] = ['exact' => round($r->exact, 2), 'total' => $r->total, 'rows' => $rows];
}
echo json_encode($out);
