import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyParts,
  formatInt,
  formatIsoDate,
  formatNumber,
  formatPercent,
  formatRupees,
  formatTrimmed,
  plural,
} from '../public/js/ui/format.js';

test('Indian digit grouping', () => {
  assert.equal(formatNumber(1234567.891), '12,34,567.89');
  assert.equal(formatNumber(100000, 0), '1,00,000');
  assert.equal(formatInt(1234567), '12,34,567');
  assert.equal(formatNumber(0), '0.00');
});

test('negative numbers use a real minus and never show negative zero', () => {
  assert.equal(formatNumber(-1234.5), '\u22121,234.50');
  assert.equal(formatNumber(-0.001), '0.00');
  assert.equal(formatNumber(-0), '0.00');
  assert.equal(formatCurrency(-0.004), '\u20B90.00');
  assert.equal(formatCurrency(-5), '\u2212\u20B95.00');
});

test('non-finite values render as a dash, not NaN', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(formatNumber(bad), '\u2014');
    assert.equal(formatTrimmed(bad), '\u2014');
    assert.equal(formatPercent(bad), '\u2014');
    assert.equal(formatCompactCurrency(bad), '\u2014');
  }
  assert.deepEqual(formatCurrencyParts(NaN), { sign: '', currency: '', num: '\u2014' });
});

test('trimmed numbers drop trailing zeros', () => {
  assert.equal(formatTrimmed(0.5, 4), '0.5');
  assert.equal(formatTrimmed(100, 2), '100');
  assert.equal(formatTrimmed(100.0287788, 2), '100.03');
  assert.equal(formatTrimmed(0.03553, 5), '0.03553');
  assert.equal(formatPercent(100.02877, 2), '100.03%');
  assert.equal(formatPercent(0.5, 4), '0.5%');
});

test('currency and its parts', () => {
  assert.equal(formatCurrency(1234.5), '\u20B91,234.50');
  assert.equal(formatCurrency(40.22, { signed: true }), '+\u20B940.22');
  assert.equal(formatCurrency(0, { signed: true }), '\u20B90.00');
  assert.equal(formatCurrency(1234, { decimals: 0 }), '\u20B91,234');
  assert.deepEqual(formatCurrencyParts(-12.5), { sign: '\u2212', currency: '\u20B9', num: '12.50' });
  assert.deepEqual(formatCurrencyParts(12.5, { signed: true }), { sign: '+', currency: '\u20B9', num: '12.50' });
});

test('rupees drop the paise only when there are none', () => {
  assert.equal(formatRupees(10000), '\u20B910,000');
  assert.equal(formatRupees(100000), '\u20B91,00,000');
  assert.equal(formatRupees(10.5), '\u20B910.50');
  assert.equal(formatRupees(10.004), '\u20B910');
  assert.equal(formatRupees(NaN), '\u2014');
});

test('compact amounts use Lakh and Crore', () => {
  assert.equal(formatCompactCurrency(500), '\u20B9500');
  assert.equal(formatCompactCurrency(12345.5), '\u20B912,345.50');
  assert.equal(formatCompactCurrency(99999), '\u20B999,999');
  assert.equal(formatCompactCurrency(100000), '\u20B91\u00A0L');
  assert.equal(formatCompactCurrency(1234567), '\u20B912.35\u00A0L');
  assert.equal(formatCompactCurrency(12345678), '\u20B91.23\u00A0Cr');
  assert.equal(formatCompactCurrency(9999999.9), '\u20B91\u00A0Cr');
  assert.equal(formatCompactCurrency(-250000), '\u2212\u20B92.5\u00A0L');
});

test('dates are parsed as text, so no time zone can move the day', () => {
  assert.equal(formatIsoDate('2026-09-30'), '30 Sep 2026');
  assert.equal(formatIsoDate('2026-01-05'), '5 Jan 2026');
  assert.equal(formatIsoDate('not a date'), 'not a date');
});

test('plural', () => {
  assert.equal(plural(1, 'trade'), 'trade');
  assert.equal(plural(0, 'trade'), 'trades');
  assert.equal(plural(3, 'trading day'), 'trading days');
});
