import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTrade, normalizeOptionsInput, targetLadder } from '../public/js/engine/options.js';
import { legCharges } from '../public/js/engine/charges.js';
import { INSTRUMENTS } from '../public/js/config/instruments.js';
import { TARIFF } from '../public/js/config/tariff.js';
import { DEFAULT_OPTIONS, TARGET_PRESETS } from '../public/js/config/defaults.js';

const close = (actual, expected, message, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);

// Independent reference values (Decimal arithmetic, brute-force check of minimal tick).
const GOLDEN = [
  {
    name: 'default trade on the Plus plan',
    input: { plan: 'plus' },
    expect: {
      quantity: 65, buyTurnover: 6532.5, sellTurnover: 6659.25, reEntryFee: 38.341284255, targetNet: 38.341284255,
      targetSellPrice: 102.95, breakevenSellPrice: 102.35, totalCharges: 86.5287357045, netProfit: 40.2212642955,
      slippageCost: 65, capitalAfter: 6572.7212642955, capitalReady: 6534.3799800405, yieldPct: 100.0287788755,
    },
  },
  {
    name: 'fee not included',
    input: { plan: 'plus', includeNextFee: false },
    expect: {
      targetNet: 0, targetSellPrice: 102.35, breakevenSellPrice: 102.35, sellTurnover: 6620.25,
      totalCharges: 86.4538457985, netProfit: 1.2961542015, capitalReady: 6495.4548699465, yieldPct: 99.4329103704,
    },
  },
  {
    name: 'three lots, 2% target',
    input: { plan: 'plus', lots: 3, buyPrice: 120.35, slippage: 0.25, targetPct: 2 },
    expect: {
      quantity: 195, buyTurnover: 23517, sellTurnover: 24170.25, reEntryFee: 45.988623318, targetNet: 516.328623318,
      targetSellPrice: 124.2, breakevenSellPrice: 121.55, totalCharges: 127.8016425615, netProfit: 525.4483574385,
      slippageCost: 97.5, capitalReady: 23996.4597341205,
    },
  },
  {
    name: 'Bank Nifty on the Standard plan',
    input: { instrument: 'BANKNIFTY', lots: 5, buyPrice: 250.5, slippage: 1, targetPct: 5, plan: 'standard' },
    expect: {
      quantity: 150, buyTurnover: 37725, sellTurnover: 39795, reEntryFee: 40.58583215, targetNet: 1926.83583215,
      targetSellPrice: 266.3, breakevenSellPrice: 253.45, totalCharges: 140.60234008, netProfit: 1929.39765992,
    },
  },
  {
    name: 'Sensex on BSE rates',
    input: { plan: 'plus', instrument: 'SENSEX', lots: 10, buyPrice: 310.2, slippage: 0.5, targetPct: 1.5 },
    expect: {
      quantity: 200, buyTurnover: 62140, sellTurnover: 63290, reEntryFee: 40.9926, targetNet: 973.0926,
      targetSellPrice: 316.95, breakevenSellPrice: 312.1, totalCharges: 175.125, netProfit: 974.875,
    },
  },
];

for (const { name, input, expect } of GOLDEN) {
  test(`matches the independent reference: ${name}`, () => {
    const result = computeTrade(input);
    for (const [key, value] of Object.entries(expect)) close(result[key], value, key);
  });
}

// Forward model written separately from the solver: net profit if you sell at `price`.
function netAt(result, price) {
  const sellTurnover = (price - result.input.slippage) * result.quantity;
  const sellFee = legCharges('SELL', sellTurnover, result.venue, result.input.plan).total;
  return sellTurnover - result.buyTurnover - result.buyCharges.total - sellFee;
}

test('the sell price is the lowest tick that delivers the target, across a wide grid', () => {
  let cases = 0;
  for (const instrument of Object.keys(INSTRUMENTS)) {
    for (const lots of [1, 2, INSTRUMENTS[instrument].maxLots]) {
      for (const buyPrice of [0.05, 10.15, 100, 523.4]) {
        for (const slippage of [0, 0.05, 0.5, 2]) {
          for (const targetPct of [0, 0.5, 2, 10]) {
            for (const includeNextFee of [true, false]) {
              for (const plan of ['standard', 'plus']) {
                const r = computeTrade({ instrument, lots, buyPrice, slippage, targetPct, includeNextFee, plan });
                const label = JSON.stringify(r.input);
                assert.ok(netAt(r, r.targetSellPrice) >= r.targetNet - 1e-6, `target met: ${label}`);
                assert.ok(netAt(r, r.targetSellPrice - TARIFF.tick) < r.targetNet, `one tick lower falls short: ${label}`);
                assert.ok(netAt(r, r.breakevenSellPrice) >= -1e-6, `breakeven covers costs: ${label}`);
                assert.ok(netAt(r, r.breakevenSellPrice - TARIFF.tick) < 0, `breakeven is minimal: ${label}`);
                const steps = r.targetSellPrice / TARIFF.tick;
                assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, `on the tick: ${label}`);
                assert.ok(r.breakevenSellPrice <= r.targetSellPrice, `breakeven not above target: ${label}`);
                assert.ok(r.netProfit >= -1e-6, `net not negative: ${label}`);
                cases += 1;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(cases, 3 * 3 * 4 * 4 * 4 * 2 * 2);
});

test('breakeven depends on the trade, not on the target or the fee toggle', () => {
  const base = { lots: 2, buyPrice: 87.35, slippage: 0.25 };
  const reference = computeTrade(base).breakevenSellPrice;
  for (const targetPct of [0, 3, 20]) {
    for (const includeNextFee of [true, false]) {
      assert.equal(computeTrade({ ...base, targetPct, includeNextFee }).breakevenSellPrice, reference);
    }
  }
});

test('the round-trip breakdown is the buy and sell legs added, and its total is the total charges', () => {
  const r = computeTrade({ lots: 3, buyPrice: 120.35, slippage: 0.25, targetPct: 2 });
  for (const key of Object.keys(r.buyCharges)) {
    close(r.roundTripCharges[key], r.buyCharges[key] + r.sellCharges[key], key, 1e-12);
  }
  assert.equal(r.totalCharges, r.roundTripCharges.total);
});

test('the next entry fee is one number everywhere', () => {
  const r = computeTrade({});
  assert.equal(r.reEntryFee, r.buyCharges.total);
  close(r.capitalReady, r.capitalAfter - r.reEntryFee, 'capitalReady');
  close(r.yieldPct, (r.capitalReady / r.buyTurnover) * 100, 'yieldPct');
});

test('covering the next entry fee restores the starting capital', () => {
  const r = computeTrade({ includeNextFee: true, targetPct: 0 });
  assert.ok(r.capitalReady >= r.buyTurnover - 1e-6);
  assert.ok(computeTrade({ includeNextFee: false, targetPct: 0 }).capitalReady < r.buyTurnover);
});

test('Sensex is charged at the BSE rate, Nifty at the NSE rate', () => {
  const sensex = computeTrade({ instrument: 'SENSEX' });
  const nifty = computeTrade({ instrument: 'NIFTY' });
  close(sensex.buyCharges.exchange / sensex.buyTurnover, 0.00005, 'BSE rate', 1e-12);
  close(nifty.buyCharges.exchange / nifty.buyTurnover, 0.0003553, 'NSE rate', 1e-12);
});

test('quantity is always lots times lot size, even for oversized input', () => {
  assert.equal(computeTrade({ lots: 2 }).quantity, 130);
  assert.equal(computeTrade({ lots: 100 }).quantity, 65 * 27);
  assert.equal(computeTrade({ instrument: 'BANKNIFTY', lots: 100 }).quantity, 30 * 20);
  assert.equal(computeTrade({ instrument: 'SENSEX', lots: 100 }).quantity, 20 * 50);
  assert.equal(computeTrade({ lots: 0 }).quantity, 65);
});

test('normalisation clamps, snaps to the tick and falls back to defaults', () => {
  const n = normalizeOptionsInput({ lots: 2.6, buyPrice: 100.03, slippage: 0.52, targetPct: 1.2345 });
  assert.equal(n.lots, 3);
  assert.equal(n.buyPrice, 100.05);
  assert.equal(n.slippage, 0.5);
  assert.equal(n.targetPct, 1.23);

  assert.equal(normalizeOptionsInput({ buyPrice: 100.02 }).buyPrice, 100);
  assert.equal(normalizeOptionsInput({ buyPrice: -5 }).buyPrice, 0.05);
  assert.equal(normalizeOptionsInput({ buyPrice: 1e9 }).buyPrice, 100000);
  assert.equal(normalizeOptionsInput({ slippage: -1 }).slippage, 0);
  assert.equal(normalizeOptionsInput({ targetPct: -5 }).targetPct, 0);
  assert.equal(normalizeOptionsInput({ targetPct: 5000 }).targetPct, 1000);

  assert.deepEqual(normalizeOptionsInput({ lots: NaN, buyPrice: '', slippage: null, targetPct: undefined }), {
    ...DEFAULT_OPTIONS,
  });
  assert.equal(normalizeOptionsInput({ instrument: 'FINNIFTY' }).instrument, 'NIFTY');
  assert.equal(normalizeOptionsInput({ instrument: 'constructor' }).instrument, 'NIFTY');
  assert.equal(normalizeOptionsInput({ plan: 'gold' }).plan, DEFAULT_OPTIONS.plan);
  assert.equal(normalizeOptionsInput({ includeNextFee: 'yes' }).includeNextFee, true);
  assert.equal(normalizeOptionsInput({ includeNextFee: false }).includeNextFee, false);
});

test('numeric strings from inputs are accepted', () => {
  const r = computeTrade({ lots: '2', buyPrice: '100.05', slippage: '0.5', targetPct: '1' });
  assert.equal(r.quantity, 130);
  assert.equal(r.input.buyPrice, 100.05);
});

test('the target ladder reuses the same maths and marks the active target', () => {
  const ladder = targetLadder({ targetPct: 2 }, TARGET_PRESETS);
  assert.equal(ladder.length, TARGET_PRESETS.length);
  assert.deepEqual(ladder.filter((row) => row.active).map((row) => row.targetPct), [2]);
  for (const row of ladder) {
    assert.equal(row.sellPrice, computeTrade({ targetPct: row.targetPct }).targetSellPrice);
  }
  for (let i = 1; i < ladder.length; i += 1) {
    assert.ok(ladder[i].sellPrice >= ladder[i - 1].sellPrice, 'higher targets never need a lower price');
    assert.ok(ladder[i].netProfit > ladder[i - 1].netProfit, 'higher targets earn more');
  }
});

test('contract specs: lot caps follow the exchange freeze quantities', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(INSTRUMENTS).map(([key, spec]) => [key, [spec.lotSize, spec.freezeQty, spec.maxLots, spec.exchange]])),
    { NIFTY: [65, 1800, 27, 'NSE'], BANKNIFTY: [30, 600, 20, 'NSE'], SENSEX: [20, 1000, 50, 'BSE'] },
  );
  for (const spec of Object.values(INSTRUMENTS)) {
    assert.ok(spec.maxLots * spec.lotSize <= spec.freezeQty, 'max lots fit inside the freeze quantity');
    assert.ok((spec.maxLots + 1) * spec.lotSize > spec.freezeQty, 'one more lot would not');
  }
});
