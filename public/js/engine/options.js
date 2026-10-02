import { BROKERAGE_PLANS } from '../config/tariff.js';
import { INSTRUMENTS } from '../config/instruments.js';
import { DEFAULT_OPTIONS, LIMITS } from '../config/defaults.js';
import { chargeCoefficients, legCharges } from './charges.js';
import { roundToTick } from './tick.js';
import { clampInt, clampNumber, roundTo } from './util.js';

/**
 * Clean up whatever the UI holds so the calculation always sees valid input.
 * Lots are a whole number within one order's freeze limit. Prices snap to the tick.
 */
export function normalizeOptionsInput(raw = {}) {
  const d = DEFAULT_OPTIONS;
  const instrument = Object.hasOwn(INSTRUMENTS, raw.instrument) ? raw.instrument : d.instrument;
  const { maxLots } = INSTRUMENTS[instrument];

  return {
    instrument,
    lots: clampInt(raw.lots, 1, maxLots, d.lots),
    buyPrice: roundToTick(clampNumber(raw.buyPrice, LIMITS.buyPrice.min, LIMITS.buyPrice.max, d.buyPrice)),
    slippage: roundToTick(clampNumber(raw.slippage, LIMITS.slippage.min, LIMITS.slippage.max, d.slippage)),
    targetPct: roundTo(clampNumber(raw.targetPct, LIMITS.targetPct.min, LIMITS.targetPct.max, d.targetPct), 2),
    includeNextFee: typeof raw.includeNextFee === 'boolean' ? raw.includeNextFee : d.includeNextFee,
    plan: Object.hasOwn(BROKERAGE_PLANS, raw.plan) ? raw.plan : d.plan,
  };
}

/**
 * Work out the sell price that delivers a target net profit.
 *
 * Model: you buy at `buyPrice + slippage` and sell at `sellPrice - slippage`.
 * Net profit is proceeds minus cost minus the charges on both legs.
 *
 * Because sell-leg charges are affine in the sell turnover, the price that
 * delivers a given net profit has a closed form. It is rounded up to the next
 * tick, so the order you place never falls short.
 */
export function computeTrade(rawInput) {
  const input = normalizeOptionsInput(rawInput);
  const spec = INSTRUMENTS[input.instrument];
  const venue = spec.exchange;
  const quantity = input.lots * spec.lotSize;

  const entryPrice = roundTo(input.buyPrice + input.slippage, 2);
  const buyTurnover = entryPrice * quantity;
  const buyCharges = legCharges('BUY', buyTurnover, venue, input.plan);

  // One definition of the next entry fee, used everywhere it is shown.
  const reEntryFee = buyCharges.total;
  const targetNet = (buyTurnover * input.targetPct) / 100 + (input.includeNextFee ? reEntryFee : 0);

  const sell = chargeCoefficients('SELL', venue, input.plan);
  const solveSellPrice = (netProfit) => {
    const sellTurnover = (netProfit + buyTurnover + buyCharges.total + sell.fixed) / (1 - sell.rate);
    return roundToTick(sellTurnover / quantity + input.slippage, 'ceil');
  };

  const targetSellPrice = solveSellPrice(targetNet);
  // Breakeven ignores the target and the fee toggle: it only depends on the trade.
  const breakevenSellPrice = solveSellPrice(0);

  const sellTurnover = (targetSellPrice - input.slippage) * quantity;
  const sellCharges = legCharges('SELL', sellTurnover, venue, input.plan);
  const roundTripCharges = Object.fromEntries(
    Object.keys(buyCharges).map((key) => [key, buyCharges[key] + sellCharges[key]]),
  );
  const totalCharges = roundTripCharges.total;
  const netProfit = sellTurnover - buyTurnover - totalCharges;

  const capitalAfter = buyTurnover + netProfit;
  const capitalReady = capitalAfter - reEntryFee;

  return {
    input,
    venue,
    lotSize: spec.lotSize,
    quantity,
    buyTurnover,
    sellTurnover,
    buyCharges,
    sellCharges,
    roundTripCharges,
    totalCharges,
    slippageCost: input.slippage * quantity * 2,
    reEntryFee,
    targetNet,
    targetSellPrice,
    breakevenSellPrice,
    movePoints: roundTo(targetSellPrice - input.buyPrice, 2),
    movePct: ((targetSellPrice - input.buyPrice) / input.buyPrice) * 100,
    netProfit,
    capitalAfter,
    capitalReady,
    yieldPct: (capitalReady / buyTurnover) * 100,
  };
}

/** The same trade at several profit targets, for side-by-side comparison. */
export function targetLadder(rawInput, presets) {
  const input = normalizeOptionsInput(rawInput);
  return presets.map((targetPct) => {
    const r = computeTrade({ ...input, targetPct });
    return {
      targetPct,
      active: targetPct === input.targetPct,
      sellPrice: r.targetSellPrice,
      netProfit: r.netProfit,
    };
  });
}
