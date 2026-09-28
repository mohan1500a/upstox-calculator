/**
 * Metric & Currency Formatters with 8K High-Precision Numeral Micro-Alignment
 */

import { UPSTOX_TARIFF_2026 } from '../config/constants.js';

/**
 * Rounds a price to exchange tick increments (₹0.05).
 * Mode 'ceil' ensures limit order price guarantees the desired net ROI.
 */
export function roundToTick(val, tick = UPSTOX_TARIFF_2026.TICK_SIZE, mode = 'ceil') {
    if (isNaN(val) || !isFinite(val)) return 0.0;
    const factor = Math.round(1.0 / tick); // 20 for 0.05
    if (mode === 'ceil') {
        return Math.ceil(val * factor - 1e-9) / factor;
    } else if (mode === 'floor') {
        return Math.floor(val * factor + 1e-9) / factor;
    }
    return Math.round(val * factor) / factor;
}

/**
 * Standard plain text Indian Rupee currency formatter.
 */
export function formatINR(val, includeSign = false) {
    if (isNaN(val) || !isFinite(val)) val = 0.0;
    const sign = includeSign ? (val >= 0 ? '+' : '-') : '';
    return sign + '₹' + Math.abs(val).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Compact currency formatter for large capital sums.
 */
export function formatShortINR(val) {
    if (isNaN(val) || !isFinite(val)) return '₹0';
    if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + ' Lakh';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val.toFixed(0);
}

/**
 * 8K Structured HTML Numeral Micro-Alignment Formatter.
 * Resolves mathematical baseline drop on '+' and isolates tabular digits.
 */
export function formatMetricHTML({ sign = '', currency = '', num = '', unit = '' } = {}) {
    let html = '';
    if (sign) html += `<span class="val-sign">${sign}</span>`;
    if (currency) html += `<span class="val-currency">${currency}</span>`;
    if (num !== '') html += `<span class="val-num">${num}</span>`;
    if (unit) html += `<span class="val-unit">${unit}</span>`;
    return html;
}

/**
 * Generates structured HTML for standard currency values.
 */
export function formatCurrencyHTML(val, includeSign = false) {
    if (isNaN(val) || !isFinite(val)) val = 0.0;
    const sign = includeSign ? (val >= 0 ? '+' : '-') : '';
    const formattedNum = Math.abs(val).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formatMetricHTML({ sign, currency: '₹', num: formattedNum });
}

/**
 * Generates structured HTML for compact large currency sums.
 */
export function formatShortCurrencyHTML(val, includeSign = false) {
    if (isNaN(val) || !isFinite(val)) val = 0;
    const sign = includeSign ? (val >= 0 ? '+' : '-') : '';
    const absVal = Math.abs(val);
    let numStr = '';
    let unitStr = '';
    if (absVal >= 10000000) {
        numStr = (absVal / 10000000).toFixed(2);
        unitStr = 'Cr';
    } else if (absVal >= 100000) {
        numStr = (absVal / 100000).toFixed(2);
        unitStr = 'Lakh';
    } else {
        numStr = absVal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
    return formatMetricHTML({ sign, currency: '₹', num: numStr, unit: unitStr });
}
