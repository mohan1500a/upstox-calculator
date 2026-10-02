import { DEFAULT_COMPOUNDING, DEPLOY_PRESETS, LIMITS } from '../config/defaults.js';
import { EPS, clampInt, clampNumber, roundTo } from './util.js';

export function normalizeCompoundingInput(raw = {}) {
  const d = DEFAULT_COMPOUNDING;
  return {
    initial: roundTo(clampNumber(raw.initial, LIMITS.initial.min, LIMITS.initial.max, d.initial), 2),
    target: roundTo(clampNumber(raw.target, LIMITS.target.min, LIMITS.target.max, d.target), 2),
    returnPct: roundTo(clampNumber(raw.returnPct, LIMITS.returnPct.min, LIMITS.returnPct.max, d.returnPct), 2),
    deployPct: clampInt(raw.deployPct, LIMITS.deployPct.min, LIMITS.deployPct.max, d.deployPct),
    daysPerYear: clampInt(raw.daysPerYear, LIMITS.daysPerYear.min, LIMITS.daysPerYear.max, d.daysPerYear),
    years: roundTo(clampNumber(raw.years, LIMITS.years.min, LIMITS.years.max, d.years), 2),
  };
}

/**
 * How many trades take `initial` to `target` when each trade grows capital by
 * `growth` (a fraction), and how fast you must trade to finish in `availableDays`.
 * Requires target > initial and growth > 0.
 */
export function planTrades(initial, target, growth, availableDays) {
  const exact = Math.log(target / initial) / Math.log1p(growth);
  // EPS absorbs floating point noise when the answer is a whole number (1000 to 1331 at 10% is 3).
  const trades = Math.max(1, Math.ceil(exact - EPS));
  const perDay = Math.ceil(trades / availableDays);
  const days = Math.ceil(trades / perDay);
  return { trades, perDay, days };
}

/**
 * status:
 *  - 'ok'         a plan exists
 *  - 'no-growth'  the target is at or below the starting capital
 *  - 'no-edge'    each trade adds nothing, so capital never grows
 */
export function computeCompounding(rawInput) {
  const input = normalizeCompoundingInput(rawInput);
  const growth = (input.returnPct / 100) * (input.deployPct / 100);
  const availableDays = Math.max(1, Math.floor(input.daysPerYear * input.years));
  const months = Math.max(1, Math.round(input.years * 12));

  const base = { input, growthPct: growth * 100, availableDays, months };

  if (input.target <= input.initial) return { ...base, status: 'no-growth', rows: [] };
  if (!(growth > 0)) return { ...base, status: 'no-edge', rows: [] };

  const plan = planTrades(input.initial, input.target, growth, availableDays);
  const rows = DEPLOY_PRESETS.map((deployPct) => ({
    deployPct,
    active: deployPct === input.deployPct,
    ...planTrades(input.initial, input.target, (input.returnPct / 100) * (deployPct / 100), availableDays),
  }));

  return {
    ...base,
    status: 'ok',
    ...plan,
    perMonth: Math.ceil(plan.trades / months),
    rows,
  };
}
