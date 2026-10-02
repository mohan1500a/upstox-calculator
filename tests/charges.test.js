import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargeCoefficients, legCharges } from '../public/js/engine/charges.js';

const close = (actual, expected, message, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);

function assertLeg(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) close(actual[key], value, `${label} ${key}`);
}

// Reference values come from an independent Decimal implementation, not from this code.
test('buy leg, NSE, Plus plan', () => {
  assertLeg(legCharges('BUY', 6532.5, 'NSE', 'plus'), {
    brokerage: 30,
    stt: 0,
    exchange: 2.32099725,
    sebi: 0.0065325,
    stamp: 0.195975,
    gst: 5.817779505,
    total: 38.341284255,
  }, 'buy');
});

test('sell leg, NSE, Plus plan', () => {
  assertLeg(legCharges('SELL', 6659.25, 'NSE', 'plus'), {
    brokerage: 30,
    stt: 9.988875,
    exchange: 2.366031525,
    sebi: 0.00665925,
    stamp: 0,
    gst: 5.8258856745,
    total: 48.1874514495,
  }, 'sell');
});

test('Standard plan charges 20 per order', () => {
  assertLeg(legCharges('BUY', 37725, 'NSE', 'standard'), {
    brokerage: 20,
    exchange: 13.4036925,
    stamp: 1.13175,
    gst: 6.01266465,
    total: 40.58583215,
  }, 'standard buy');
  assertLeg(legCharges('SELL', 39795, 'NSE', 'standard'), { stt: 59.6925, total: 100.01650793 }, 'standard sell');
});

test('BSE uses its own exchange rate', () => {
  assertLeg(legCharges('BUY', 62140, 'BSE', 'plus'), { exchange: 3.107, gst: 5.95926, total: 40.9926 }, 'bse buy');
  assertLeg(legCharges('SELL', 63350, 'BSE', 'plus'), { stt: 95.025, exchange: 3.1675, gst: 5.97015, total: 134.226 }, 'bse sell');
  const nse = legCharges('BUY', 100000, 'NSE', 'plus').exchange;
  const bse = legCharges('BUY', 100000, 'BSE', 'plus').exchange;
  assert.ok(nse > bse, 'NSE charges more than BSE on the same turnover');
});

test('STT is sell-side only and stamp duty is buy-side only', () => {
  const buy = legCharges('BUY', 50000, 'NSE', 'plus');
  const sell = legCharges('SELL', 50000, 'NSE', 'plus');
  assert.equal(buy.stt, 0);
  assert.ok(sell.stt > 0);
  assert.equal(sell.stamp, 0);
  assert.ok(buy.stamp > 0);
});

test('total is the sum of its parts', () => {
  for (const side of ['BUY', 'SELL']) {
    const c = legCharges(side, 12345.67, 'NSE', 'plus');
    close(c.total, c.brokerage + c.stt + c.exchange + c.sebi + c.stamp + c.gst, `${side} total`);
  }
});

test('charges are affine in turnover, so coefficients reproduce them', () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (const side of ['BUY', 'SELL']) {
    for (const venue of ['NSE', 'BSE']) {
      for (const plan of ['standard', 'plus']) {
        const { fixed, rate } = chargeCoefficients(side, venue, plan);
        for (let i = 0; i < 25; i += 1) {
          const turnover = random() * 5_000_000;
          close(fixed + rate * turnover, legCharges(side, turnover, venue, plan).total, `${side} ${venue} ${plan}`, 1e-6);
        }
      }
    }
  }
});

test('unknown side, venue or plan throws instead of guessing', () => {
  assert.throws(() => legCharges('HOLD', 100, 'NSE', 'plus'), RangeError);
  assert.throws(() => legCharges('BUY', 100, 'MCX', 'plus'), RangeError);
  assert.throws(() => legCharges('BUY', 100, 'NSE', 'gold'), RangeError);
  assert.throws(() => legCharges('BUY', 100, 'NSE', 'constructor'), RangeError);
});
