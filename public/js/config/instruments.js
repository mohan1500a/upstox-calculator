/**
 * Contract specs for the supported index options.
 *
 * `freezeQty` is the largest quantity the exchange accepts in one order.
 * `maxLots` is derived from it, so the two can never drift apart. Above that
 * size an order is sliced into several orders, each paying its own brokerage,
 * which this calculator does not model.
 *
 * To add an instrument: add one entry below. The chips and the rates dialog pick it up.
 * Cross-check `lot_size` and `freeze_quantity` in Upstox's instruments file:
 * https://upstox.com/developer/api-documentation/instruments/
 * Bump DATA_REVIEWED_ON in tariff.js when you do.
 */

const define = (label, exchange, lotSize, freezeQty) =>
  Object.freeze({
    label,
    exchange,
    lotSize,
    freezeQty,
    maxLots: Math.floor(freezeQty / lotSize),
  });

export const INSTRUMENTS = Object.freeze({
  NIFTY: define('Nifty 50', 'NSE', 65, 3510),
  BANKNIFTY: define('Bank Nifty', 'NSE', 30, 1440),
  SENSEX: define('Sensex', 'BSE', 20, 1000),
});
