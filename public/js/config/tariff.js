/**
 * Charge schedule for index options on Upstox.
 *
 * This is the only place rates live. The engine and the "Rates used" dialog
 * read from here. Update the values and `DATA_REVIEWED_ON` together, then run
 * `npm test`.
 *
 * Source: https://upstox.com/brokerage-charges/ (Equity Options column).
 * See docs/TARIFF.md for the reasoning behind each figure.
 */

/** When the rates here and the contract sizes in instruments.js were last checked. */
export const DATA_REVIEWED_ON = '2026-10-02';

/** Flat brokerage per executed order. Depends on the account plan. */
export const BROKERAGE_PLANS = Object.freeze({
  standard: Object.freeze({ label: 'Standard', perOrder: 20 }),
  plus: Object.freeze({ label: 'Plus', perOrder: 30 }),
});

/** Rates are fractions of premium turnover (price x quantity). */
export const TARIFF = Object.freeze({
  /** STT, sell side only. 0.15% of premium from 1 April 2026. */
  sttSellRate: 0.0015,
  /**
   * Exchange transaction charge, charged on both legs.
   * NSE: 0.03553% (Upstox's figure from 1 March 2026; it already includes IPFT).
   * BSE: 0.005% (verified against Upstox live charges API).
   */
  exchangeRate: Object.freeze({ NSE: 0.0003553, BSE: 0.00005 }),
  /** SEBI turnover fee: Rs 10 per crore, both legs. */
  sebiRate: 0.000001,
  /** Stamp duty, buy side only: 0.003%. */
  stampBuyRate: 0.00003,
  /** GST on brokerage plus the exchange transaction charge. */
  gstRate: 0.18,
  /** Minimum price step for index options. */
  tick: 0.05,
});
