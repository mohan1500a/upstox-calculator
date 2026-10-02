import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCompounding, normalizeCompoundingInput, planTrades } from '../public/js/engine/compounding.js';
import { DEFAULT_COMPOUNDING, DEPLOY_PRESETS } from '../public/js/config/defaults.js';

test('default plan: 10,000 to 1,00,000 at 1% on half the capital', () => {
  const r = computeCompounding({});
  assert.equal(r.status, 'ok');
  assert.equal(r.growthPct, 0.5);
  assert.equal(r.trades, 462);
  assert.equal(r.perDay, 3);
  assert.equal(r.days, 154);
  assert.equal(r.availableDays, 200);
  assert.equal(r.months, 12);
  assert.equal(r.perMonth, 39);
});

test('the what-if table matches independently computed plans', () => {
  const expected = { 10: [2304, 12, 192], 25: [923, 5, 185], 50: [462, 3, 154], 75: [309, 2, 155], 100: [232, 2, 116] };
  const r = computeCompounding({});
  assert.deepEqual(r.rows.map((row) => row.deployPct), [...DEPLOY_PRESETS]);
  for (const row of r.rows) assert.deepEqual([row.trades, row.perDay, row.days], expected[row.deployPct], `${row.deployPct}%`);
  assert.deepEqual(r.rows.filter((row) => row.active).map((row) => row.deployPct), [50]);
});

test('a whole-number answer is not rounded up by floating point noise', () => {
  const r = computeCompounding({ initial: 1000, target: 1331, returnPct: 10, deployPct: 100 });
  assert.equal(r.trades, 3);
  assert.equal(planTrades(1000, 2000, 1, 200).trades, 1);
  assert.equal(planTrades(1, 1024, 1, 200).trades, 10);
});

test('the right message for each failure mode', () => {
  assert.equal(computeCompounding({ initial: 1000, target: 500 }).status, 'no-growth');
  assert.equal(computeCompounding({ initial: 1000, target: 1000 }).status, 'no-growth');
  assert.equal(computeCompounding({ returnPct: 0 }).status, 'no-edge');
  // A bad target wins over a missing edge: fix the goal first.
  assert.equal(computeCompounding({ initial: 1000, target: 900, returnPct: 0 }).status, 'no-growth');
  for (const status of ['no-growth', 'no-edge']) {
    const r = computeCompounding(status === 'no-growth' ? { target: 100, initial: 1000 } : { returnPct: 0 });
    assert.deepEqual(r.rows, []);
    assert.equal(r.trades, undefined);
  }
});

test('days per year and years set the pace', () => {
  const short = computeCompounding({ initial: 10000, target: 20000, returnPct: 1, deployPct: 100, daysPerYear: 1, years: 0.25 });
  assert.equal(short.availableDays, 1);
  assert.equal(short.months, 3);
  assert.equal(short.trades, 70);
  assert.equal(short.perDay, 70);
  assert.equal(short.days, 1);
  assert.equal(short.perMonth, 24);

  const long = computeCompounding({ daysPerYear: 250, years: 2 });
  assert.equal(long.availableDays, 500);
  assert.equal(long.months, 24);
});

test('inputs are clamped to sensible ranges', () => {
  const n = normalizeCompoundingInput({ initial: -5, target: 1e15, returnPct: 5000, deployPct: 0, daysPerYear: 999, years: 0 });
  assert.deepEqual(n, { initial: 1, target: 1e12, returnPct: 1000, deployPct: 1, daysPerYear: 250, years: 0.1 });
  assert.deepEqual(normalizeCompoundingInput({ initial: '', target: NaN }), { ...DEFAULT_COMPOUNDING });
});

test('the trade count is the smallest that reaches the target, across a grid', () => {
  for (const initial of [1000, 10000, 1_000_000]) {
    for (const ratio of [1.001, 1.5, 2, 10, 1000]) {
      for (const returnPct of [0.01, 0.5, 1, 5, 50]) {
        for (const deployPct of [1, 25, 100]) {
          for (const [daysPerYear, years] of [[200, 1], [250, 0.5], [1, 0.1], [240, 10]]) {
            const target = initial * ratio;
            const r = computeCompounding({ initial, target, returnPct, deployPct, daysPerYear, years });
            const label = JSON.stringify(r.input);
            const step = Math.log1p((r.input.returnPct / 100) * (r.input.deployPct / 100));
            const need = Math.log(r.input.target / r.input.initial);
            assert.equal(r.status, 'ok', label);
            assert.ok(r.trades * step >= need - 1e-9, `reaches the goal: ${label}`);
            assert.ok((r.trades - 1) * step < need + 1e-9, `one fewer would not: ${label}`);
            assert.ok(r.days <= r.availableDays, `fits the window: ${label}`);
            assert.ok(r.perDay * r.days >= r.trades, `pace covers the trades: ${label}`);
            assert.ok(r.perDay * (r.days - 1) < r.trades, `no idle days: ${label}`);
            assert.ok(r.perMonth * r.months >= r.trades, `monthly pace covers the trades: ${label}`);
          }
        }
      }
    }
  }
});

test('more deployed capital never needs more trades', () => {
  const { rows } = computeCompounding({});
  for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i].trades <= rows[i - 1].trades);
});
