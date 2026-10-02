/** Starting values, allowed ranges and preset chips. */

export const DEFAULT_OPTIONS = Object.freeze({
  instrument: 'NIFTY',
  lots: 1,
  buyPrice: 100,
  slippage: 0.5,
  targetPct: 0,
  includeNextFee: true,
  plan: 'plus',
});

export const DEFAULT_COMPOUNDING = Object.freeze({
  initial: 10000,
  target: 100000,
  returnPct: 1,
  deployPct: 50,
  daysPerYear: 200,
  years: 1,
});

/** Inclusive ranges. Lots are limited per instrument, see instruments.js. */
export const LIMITS = Object.freeze({
  buyPrice: Object.freeze({ min: 0.05, max: 100000 }),
  slippage: Object.freeze({ min: 0, max: 1000 }),
  targetPct: Object.freeze({ min: 0, max: 1000 }),
  initial: Object.freeze({ min: 1, max: 1e9 }),
  target: Object.freeze({ min: 1, max: 1e12 }),
  returnPct: Object.freeze({ min: 0, max: 1000 }),
  deployPct: Object.freeze({ min: 1, max: 100 }),
  daysPerYear: Object.freeze({ min: 1, max: 250 }),
  years: Object.freeze({ min: 0.1, max: 50 }),
});

export const TARGET_PRESETS = Object.freeze([0, 1, 2, 3, 5]);
export const DEPLOY_PRESETS = Object.freeze([10, 25, 50, 75, 100]);
