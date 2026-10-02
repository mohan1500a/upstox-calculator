/** Small numeric helpers shared by the engine and the UI. No DOM access. */

/** Guard for floating point noise when rounding up (in tick or ratio units). */
export const EPS = 1e-9;

/** Coerce to a number. Empty strings and null are NaN, never 0. */
export function toNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Round to `decimals` places. Never returns -0. */
export function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor + 0;
}

/** Clamp a numeric-like value into [min, max]. Non-numbers give `fallback`. */
export function clampNumber(value, min, max, fallback) {
  const n = toNumber(value);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
}

/** Like clampNumber, but rounds to a whole number first. */
export function clampInt(value, min, max, fallback) {
  const n = toNumber(value);
  return Number.isFinite(n) ? clamp(Math.round(n), min, max) : fallback;
}
