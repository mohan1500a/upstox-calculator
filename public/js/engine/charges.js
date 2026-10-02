import { BROKERAGE_PLANS, TARIFF } from '../config/tariff.js';

/**
 * Charges for one leg (one executed order) of an options trade.
 *
 * @param {'BUY'|'SELL'} side
 * @param {number} turnover premium x quantity for this leg
 * @param {'NSE'|'BSE'} venue
 * @param {keyof typeof BROKERAGE_PLANS} plan
 * @returns {{brokerage:number, stt:number, exchange:number, sebi:number,
 *            stamp:number, gst:number, total:number}}
 */
export function legCharges(side, turnover, venue, plan) {
  if (side !== 'BUY' && side !== 'SELL') throw new RangeError(`Unknown side: ${side}`);
  // hasOwn, not a bare lookup: 'constructor' and friends must not pass for a venue or plan.
  if (!Object.hasOwn(TARIFF.exchangeRate, venue)) throw new RangeError(`Unknown venue: ${venue}`);
  if (!Object.hasOwn(BROKERAGE_PLANS, plan)) throw new RangeError(`Unknown brokerage plan: ${plan}`);
  const exchangeRate = TARIFF.exchangeRate[venue];

  const brokerage = BROKERAGE_PLANS[plan].perOrder;
  const stt = side === 'SELL' ? turnover * TARIFF.sttSellRate : 0;
  const exchange = turnover * exchangeRate;
  const sebi = turnover * TARIFF.sebiRate;
  const stamp = side === 'BUY' ? turnover * TARIFF.stampBuyRate : 0;
  const gst = (brokerage + exchange) * TARIFF.gstRate;
  const total = brokerage + stt + exchange + sebi + stamp + gst;
  return { brokerage, stt, exchange, sebi, stamp, gst, total };
}

const PROBE_TURNOVER = 1e6;

/**
 * Leg charges are affine in turnover: total = fixed + rate x turnover.
 * Deriving both from `legCharges` keeps the forward calculation and the
 * inverse (solving for a price) on one formula.
 */
export function chargeCoefficients(side, venue, plan) {
  const fixed = legCharges(side, 0, venue, plan).total;
  const rate = (legCharges(side, PROBE_TURNOVER, venue, plan).total - fixed) / PROBE_TURNOVER;
  return { fixed, rate };
}
