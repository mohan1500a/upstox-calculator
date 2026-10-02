/** Number and date formatting. Indian digit grouping, proper minus sign, no -0. Pure. */

import { roundTo } from '../engine/util.js';

const DASH = '\u2014';
const MINUS = '\u2212';
const RUPEE = '\u20B9';
const NBSP = '\u00A0';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const cache = new Map();
function numberFormat(minDecimals, maxDecimals) {
  const key = `${minDecimals}:${maxDecimals}`;
  let format = cache.get(key);
  if (!format) {
    format = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    cache.set(key, format);
  }
  return format;
}

/** Format the magnitude, and report whether the value is negative once rounded. */
function split(value, minDecimals, maxDecimals) {
  const text = numberFormat(minDecimals, maxDecimals).format(Math.abs(value));
  const isZero = !/[1-9]/.test(text);
  return { text, isZero, negative: value < 0 && !isZero };
}

/** Fixed decimals: 1234567.5 becomes 12,34,567.50 */
export function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return DASH;
  const { text, negative } = split(value, decimals, decimals);
  return negative ? MINUS + text : text;
}

/** Up to `maxDecimals`, trailing zeros dropped: 0.5 stays 0.5, 100 stays 100. */
export function formatTrimmed(value, maxDecimals = 2) {
  if (!Number.isFinite(value)) return DASH;
  const { text, negative } = split(value, 0, maxDecimals);
  return negative ? MINUS + text : text;
}

export function formatInt(value) {
  return formatNumber(Math.round(value), 0);
}

export function formatPercent(value, maxDecimals = 2) {
  const text = formatTrimmed(value, maxDecimals);
  return text === DASH ? text : `${text}%`;
}

/** Parts for the metric renderer: sign, currency symbol and digits kept apart for styling. */
export function formatCurrencyParts(value, { decimals = 2, signed = false } = {}) {
  if (!Number.isFinite(value)) return { sign: '', currency: '', num: DASH };
  const { text, isZero, negative } = split(value, decimals, decimals);
  let sign = '';
  if (negative) sign = MINUS;
  else if (signed && !isZero) sign = '+';
  return { sign, currency: RUPEE, num: text };
}

export function formatCurrency(value, options) {
  const { sign, currency, num } = formatCurrencyParts(value, options);
  return `${sign}${currency}${num}`;
}

/** Whole rupees when the amount is whole, paise otherwise: 10000 is \u20B910,000 and 10.5 is \u20B910.50. */
export function formatRupees(value) {
  if (!Number.isFinite(value)) return DASH;
  return formatCurrency(value, { decimals: Number.isInteger(roundTo(value, 2)) ? 0 : 2 });
}

/** Short form for large amounts: 100000 becomes ₹1 L, 12345678 becomes ₹1.23 Cr. The unit is kept on the number's line. */
export function formatCompactCurrency(value) {
  if (!Number.isFinite(value)) return DASH;
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : '';
  if (abs >= 1e7) return `${sign}${RUPEE}${formatTrimmed(abs / 1e7, 2)}${NBSP}Cr`;
  if (abs >= 1e5) {
    const lakh = formatTrimmed(abs / 1e5, 2);
    return lakh === '100' ? `${sign}${RUPEE}1${NBSP}Cr` : `${sign}${RUPEE}${lakh}${NBSP}L`;
  }
  return formatRupees(value);
}

/** '2026-09-30' becomes '30 Sep 2026'. Parsed as text, so no time zone can shift the day. */
export function formatIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function plural(count, word) {
  return count === 1 ? word : `${word}s`;
}
