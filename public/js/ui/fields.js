import { roundToTick } from '../engine/tick.js';
import { clamp, roundTo, toNumber } from '../engine/util.js';
import { formatTrimmed } from './format.js';

const resolve = (value) => (typeof value === 'function' ? value() : value);

/**
 * Wire a numeric input to a piece of state.
 *
 * While typing ("input"): a valid in-range value updates the results at once.
 * An invalid one is flagged and ignored, and the last good result stays on screen.
 * The field is never rewritten under the cursor.
 *
 * On commit ("change", i.e. blur or Enter): the value is clamped, snapped and
 * written back, so the box always ends up showing what the maths used.
 *
 * `min`/`max` may be functions, for limits that depend on other fields.
 */
export function bindNumericField({
  input,
  hint,
  hintText,
  min,
  max,
  integer = false,
  decimals = 0,
  fixed = false,
  snapToTick = false,
  get,
  set,
  onChange,
}) {
  const staticHint = hint.textContent.trim();
  const bounds = () => ({ lo: resolve(min), hi: resolve(max) });
  const describe = () => (hintText ? resolve(hintText) : staticHint);

  const isValid = (n) => {
    const { lo, hi } = bounds();
    return Number.isFinite(n) && n >= lo && n <= hi && (!integer || Number.isInteger(n));
  };

  const flag = (invalid) => {
    if (invalid) {
      const { lo, hi } = bounds();
      input.setAttribute('aria-invalid', 'true');
      hint.textContent = `${integer ? 'Enter a whole number' : 'Enter a number'} from ${formatTrimmed(lo, decimals)} to ${formatTrimmed(hi, decimals)}.`;
    } else {
      input.removeAttribute('aria-invalid');
      hint.textContent = describe();
    }
    hint.toggleAttribute('data-invalid', invalid);
  };

  const normalize = (n) => {
    const { lo, hi } = bounds();
    let value = clamp(n, lo, hi);
    if (integer) value = Math.round(value);
    else if (snapToTick) value = roundToTick(value);
    else value = roundTo(value, decimals);
    return clamp(value, lo, hi);
  };

  /** Write the state value into the box. */
  const sync = () => {
    const value = get();
    input.value = fixed ? value.toFixed(decimals) : String(roundTo(value, decimals));
    if (typeof max === 'function') input.setAttribute('max', String(resolve(max)));
    flag(false);
  };

  input.addEventListener('input', () => {
    const n = toNumber(input.value);
    if (!isValid(n)) {
      flag(true);
      return;
    }
    set(n);
    flag(false);
    onChange();
  });

  input.addEventListener('change', () => {
    const n = toNumber(input.value);
    if (Number.isFinite(n)) set(normalize(n));
    sync();
    onChange();
  });

  return { sync };
}
