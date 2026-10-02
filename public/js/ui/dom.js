/**
 * DOM access, kept in one place.
 *
 * IDS lists every element the scripts touch. `collectElements` fails loudly at
 * start-up if index.html is missing one, and the contract test checks the
 * same list, so markup and code cannot drift apart silently.
 * Nothing here touches `document` at import time.
 */

export const IDS = Object.freeze([
  // shell
  'tab-options',
  'tab-compounding',
  'view-options',
  'view-compounding',
  'open-tariff',
  'live-status',
  // tariff dialog
  'tariff-dialog',
  'close-tariff',
  'tariff-reviewed',
  'tariff-rates',
  'tariff-contracts',
  // options: inputs
  'instrument-chips',
  'lots',
  'lots-hint',
  'quantity',
  'quantity-note',
  'buy-price',
  'buy-price-hint',
  'slippage',
  'slippage-hint',
  'target-pct',
  'target-pct-hint',
  'target-chips',
  'include-fee',
  'plan-chips',
  'reset-options',
  // options: results
  'target-price',
  'target-move',
  'breakeven',
  'net-profit',
  'total-charges',
  'slippage-cost',
  'capital-after',
  'next-fee',
  'capital-ready',
  'capital-ready-note',
  'breakdown',
  'ladder',
  // compounding: inputs
  'initial',
  'initial-hint',
  'target-capital',
  'target-capital-hint',
  'return-pct',
  'return-pct-hint',
  'deploy-chips',
  'days-per-year',
  'days-per-year-hint',
  'years',
  'years-hint',
  'reset-compounding',
  // compounding: results
  'comp-message',
  'trades',
  'trades-note',
  'per-day',
  'per-day-note',
  'per-month',
  'per-month-note',
  'whatif-card',
  'whatif',
]);

const camelCase = (id) => id.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());

/** Look every id up once. 'buy-price' becomes `els.buyPrice`. */
export function collectElements(root = document) {
  const els = {};
  const missing = [];
  for (const id of IDS) {
    const el = root.getElementById(id);
    if (el) els[camelCase(id)] = el;
    else missing.push(id);
  }
  if (missing.length > 0) throw new Error(`index.html is missing: ${missing.join(', ')}`);
  return Object.freeze(els);
}

/** Build an element without innerHTML. `text` sets textContent. false/null props and children are skipped. */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'text') node.textContent = value;
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}
