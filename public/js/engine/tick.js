import { TARIFF } from '../config/tariff.js';
import { EPS, roundTo } from './util.js';

const decimalsOf = (tick) => (String(tick).split('.')[1] ?? '').length;

/**
 * Snap a price to the exchange tick.
 * 'round' snaps to the nearest tick. 'ceil' snaps up, so a sell order placed
 * at the result never falls short of the value it was solved for.
 */
export function roundToTick(value, mode = 'round', tick = TARIFF.tick) {
  const steps = value / tick;
  const whole = mode === 'ceil' ? Math.ceil(steps - EPS) : Math.round(steps);
  return roundTo(whole * tick, decimalsOf(tick));
}
