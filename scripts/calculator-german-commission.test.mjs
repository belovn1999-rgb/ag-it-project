import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/main.compiled.js", import.meta.url), "utf8");
const context = {
  React: { Component: class {}, createElement() {} },
  ReactDOM: { createRoot: () => ({ render() {} }) },
  document: { getElementById() {} },
  window: { location: { search: "" }, localStorage: { getItem: () => null } },
  URLSearchParams,
};
vm.runInNewContext(source + "\nthis.api = { calculate, applyFlexiblePresentation, migrateGermanCommissionHistory, money, getProcessSteps, processStepOverrideKey };", context);
const { calculate, applyFlexiblePresentation, migrateGermanCommissionHistory, money, getProcessSteps, processStepOverrideKey } = context.api;

for (const tab of [3, 4]) {
  for (const lang of ["pl", "ru", "en"]) {
    test(`dealer ${tab}, ${lang}: German fee survives an earlier removed/edited row`, () => {
      const values = { car: "10000", inspection: "100", transport: "200" };
      const base = calculate(tab, values, 4.35, 0.031, false, lang);
      const plain = applyFlexiblePresentation(base, {}, 4.35);
      const inspection = plain.rows[1];
      const state = {
        excludedRowIds: [inspection.id],
        rowEdits: { [plain.rows[2].id]: { label: "My transport" } },
      };
      const before = applyFlexiblePresentation(base, state, 4.35);
      const withFee = calculate(tab, { ...values, germanCommissionEnabled: true, germanCommission: "450" }, 4.35, 0.031, false, lang);
      const after = applyFlexiblePresentation(withFee, state, 4.35);
      const fee = after.rows.find((item) => item.valuePrefix === "450 EUR =");
      assert.ok(fee, "enabled German fee must remain visible after removing inspection");
      assert.equal(fee.value.toFixed(2), "1957.50");
      assert.match(money(fee.value).replace(/\s/g, ""), /^1950PLN$/);
      assert.ok(Math.abs(after.total - before.total - 1957.5) < 1e-8, "the EUR conversion must be added exactly once");
      assert.equal(after.rows.find((item) => item.label === "My transport").value, 200);
    });
  }
}

test("saved dealer calculations retain removed rows, edits and manual amounts", () => {
  const saved = {
    activeTab: 3,
    values: { germanCommissionEnabled: true, germanCommission: "450" },
    marginAuctionState: {
      excludedRowIds: ["standard-2"],
      rowOrder: ["standard-0", "standard-1", "standard-3"],
      rowEdits: { "standard-3": { label: "My transport" } },
      removedRows: [{ id: "standard-2", label: "Inspection" }],
    },
    manualOverrides: { "3:standard-1": "2000", "3:standard-3": "250" },
  };
  const migrated = migrateGermanCommissionHistory(saved);
  assert.equal(migrated.marginAuctionState.excludedRowIds[0], "standard-1");
  assert.equal(migrated.marginAuctionState.rowOrder[1], "german-commission");
  assert.equal(migrated.marginAuctionState.rowEdits["standard-2"].label, "My transport");
  assert.equal(migrated.marginAuctionState.removedRows[0].id, "standard-1");
  assert.equal(migrated.manualOverrides["3:german-commission"], "2000");
  assert.equal(migrated.manualOverrides["3:standard-2"], "250");
  assert.equal(saved.marginAuctionState.excludedRowIds[0], "standard-2");
  assert.equal(migrateGermanCommissionHistory(migrated), migrated);
});

test("German commission preserves payment notes and manual note edits for every dealer mode", () => {
  for (const id of [3, 4]) {
    for (const lang of ["pl", "ru", "en"]) {
      for (const [financed, direct] of [[false, false], [true, false], ...(id === 3 ? [[false, true]] : [])]) {
        const plain = getProcessSteps({ id }, lang, financed, false, direct);
        const withFee = getProcessSteps({ id }, lang, financed, true, direct);
        assert.deepEqual(withFee, plain, `${id}/${lang}/${financed}/${direct}: commission must not change purchase terms`);
        for (let i = 0; i < plain.length; i++) {
          assert.equal(processStepOverrideKey(id, lang, financed, true, direct, i), processStepOverrideKey(id, lang, financed, false, direct, i));
        }
      }
    }
  }
  assert.deepEqual(Array.from(getProcessSteps({ id: 3 }, "pl", false, true)), [
    "Oddajemy 70% uzyskanego rabatu od sprzedawcy",
    "Wpłacamy kaucję w wys. zagranicznego VAT-u",
    "Płatność w PLN lub EUR",
    "Sprzedajemy na Fakturę VAT 23%",
  ]);
});
