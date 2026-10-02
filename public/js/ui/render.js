import { BROKERAGE_PLANS, TARIFF, DATA_REVIEWED_ON } from '../config/tariff.js';
import { INSTRUMENTS } from '../config/instruments.js';
import { h } from './dom.js';
import {
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyParts,
  formatInt,
  formatIsoDate,
  formatNumber,
  formatPercent,
  plural,
} from './format.js';

/** Fill a number element with separately styled sign, currency, digits and unit. */
function setMetric(node, { sign = '', currency = '', num, unit = '' }) {
  const parts = [];
  if (sign) parts.push(h('span', { class: 'metric__sign', text: sign }));
  if (currency) parts.push(h('span', { class: 'metric__cur', text: currency }));
  parts.push(h('span', { text: num }));
  if (unit) parts.push(h('span', { class: 'metric__unit', text: unit }));
  node.replaceChildren(...parts);
}

const money = (node, value) => setMetric(node, formatCurrencyParts(value));

const BREAKDOWN_ROWS = [
  ['Brokerage', 'brokerage'],
  ['STT', 'stt'],
  ['Exchange fee', 'exchange'],
  ['SEBI fee', 'sebi'],
  ['Stamp duty', 'stamp'],
  ['GST', 'gst'],
  ['Total', 'total'],
];

const amountCell = (value) => h('td', { class: 'num', text: value === 0 ? '\u2014' : formatNumber(value) });

function renderBreakdown(tbody, buy, sell, total) {
  tbody.replaceChildren(
    ...BREAKDOWN_ROWS.map(([label, key]) => {
      const row = h(
        'tr',
        {},
        h('th', { scope: 'row', text: label }),
        amountCell(buy[key]),
        amountCell(sell[key]),
        amountCell(total[key]),
      );
      if (key === 'total') row.className = 'table__total';
      return row;
    }),
  );
}

function renderLadder(tbody, rows) {
  tbody.replaceChildren(
    ...rows.map((row) =>
      h(
        'tr',
        { 'aria-current': row.active ? 'true' : null },
        h('th', { scope: 'row', text: `${row.targetPct}%` }),
        h('td', { class: 'num', text: formatCurrency(row.sellPrice) }),
        h('td', { class: 'num', text: formatCurrency(row.netProfit) }),
      ),
    ),
  );
}

export function renderOptions(els, r, ladder) {
  money(els.targetPrice, r.targetSellPrice);
  els.targetMove.textContent = `${formatNumber(r.movePoints)} points above your buy price, a ${formatPercent(r.movePct)} rise.`;
  money(els.breakeven, r.breakevenSellPrice);
  money(els.netProfit, r.netProfit);
  money(els.totalCharges, r.totalCharges);
  money(els.slippageCost, r.slippageCost);

  money(els.capitalAfter, r.capitalAfter);
  money(els.nextFee, r.reEntryFee);
  money(els.capitalReady, r.capitalReady);
  els.capitalReadyNote.textContent = `${formatPercent(r.yieldPct)} of the ${formatCurrency(r.buyTurnover)} you put in.`;

  els.quantity.textContent = formatInt(r.quantity);
  els.quantityNote.textContent = `${formatInt(r.lotSize)} per lot`;

  renderBreakdown(els.breakdown, r.buyCharges, r.sellCharges, r.roundTripCharges);
  renderLadder(els.ladder, ladder);
}

export function optionsSummary(r) {
  return `Sell at or above ${formatCurrency(r.targetSellPrice)}. Net profit ${formatCurrency(r.netProfit)} after ${formatCurrency(r.totalCharges)} in charges.`;
}

const COMPOUNDING_MESSAGES = {
  'no-growth': 'Your target is at or below your starting capital. Set a higher target to see a plan.',
  'no-edge': 'A return of 0% never grows your capital. Enter a return above 0% per trade.',
};

function renderWhatIf(tbody, rows) {
  tbody.replaceChildren(
    ...rows.map((row) =>
      h(
        'tr',
        { 'aria-current': row.active ? 'true' : null },
        h('th', { scope: 'row', text: `${row.deployPct}%` }),
        h('td', { class: 'num', text: formatInt(row.trades) }),
        h('td', { class: 'num', text: formatInt(row.perDay) }),
        h('td', { class: 'num', text: formatInt(row.days) }),
      ),
    ),
  );
}

export function renderCompounding(els, r) {
  const ok = r.status === 'ok';
  els.compMessage.hidden = ok;
  els.compMessage.textContent = ok ? '' : COMPOUNDING_MESSAGES[r.status];
  els.whatifCard.hidden = !ok;

  if (!ok) {
    for (const key of ['trades', 'perDay', 'perMonth']) setMetric(els[key], { num: '\u2014' });
    for (const key of ['tradesNote', 'perDayNote', 'perMonthNote']) els[key].textContent = '';
    els.whatif.replaceChildren();
    return;
  }

  setMetric(els.trades, { num: formatInt(r.trades) });
  els.tradesNote.textContent = `Each trade adds ${formatPercent(r.growthPct, 4)} to your capital, taking ${formatCompactCurrency(r.input.initial)} to ${formatCompactCurrency(r.input.target)}.`;

  setMetric(els.perDay, { num: formatInt(r.perDay), unit: `${plural(r.perDay, 'trade')} a day` });
  els.perDayNote.textContent = `Goal reached in ${formatInt(r.days)} trading ${plural(r.days, 'day')}, out of ${formatInt(r.availableDays)} available.`;

  setMetric(els.perMonth, { num: formatInt(r.perMonth), unit: `${plural(r.perMonth, 'trade')} a month` });
  els.perMonthNote.textContent = `If you spread them evenly over ${r.months} ${plural(r.months, 'month')}.`;

  renderWhatIf(els.whatif, r.rows);
}

export function compoundingSummary(r) {
  if (r.status !== 'ok') return COMPOUNDING_MESSAGES[r.status];
  return `${formatInt(r.trades)} trades needed. ${formatInt(r.perDay)} ${plural(r.perDay, 'trade')} a day reaches the goal in ${formatInt(r.days)} trading ${plural(r.days, 'day')}.`;
}

/** Fill the "Rates used" dialog from the same constants the engine uses. */
export function renderTariff(els) {
  els.tariffReviewed.textContent = formatIsoDate(DATA_REVIEWED_ON);

  const plans = Object.values(BROKERAGE_PLANS)
    .map((plan) => `${formatCurrency(plan.perOrder, { decimals: 0 })} ${plan.label}`)
    .join(' or ');

  const rates = [
    ['Brokerage', plans, 'Flat, per executed order'],
    ['STT', formatPercent(TARIFF.sttSellRate * 100, 5), 'Sell side, on premium'],
    ['Exchange fee, NSE', formatPercent(TARIFF.exchangeRate.NSE * 100, 5), 'Both sides, on premium'],
    ['Exchange fee, BSE', formatPercent(TARIFF.exchangeRate.BSE * 100, 5), 'Both sides, on premium'],
    ['SEBI fee', `${formatCurrency(TARIFF.sebiRate * 1e7, { decimals: 0 })} per crore`, 'Both sides'],
    ['Stamp duty', formatPercent(TARIFF.stampBuyRate * 100, 5), 'Buy side'],
    ['GST', formatPercent(TARIFF.gstRate * 100, 2), 'On brokerage and the exchange fee'],
    ['Tick size', formatCurrency(TARIFF.tick), 'Prices snap to this step'],
  ];
  els.tariffRates.replaceChildren(
    ...rates.map(([label, rate, note]) =>
      h('tr', {}, h('th', { scope: 'row', text: label }), h('td', { text: rate }), h('td', { text: note })),
    ),
  );

  els.tariffContracts.replaceChildren(
    ...Object.values(INSTRUMENTS).map((spec) =>
      h(
        'tr',
        {},
        h('th', { scope: 'row', text: spec.label }),
        h('td', { class: 'num', text: formatInt(spec.lotSize) }),
        h('td', { class: 'num', text: formatInt(spec.freezeQty) }),
        h('td', { class: 'num', text: formatInt(spec.maxLots) }),
      ),
    ),
  );
}
