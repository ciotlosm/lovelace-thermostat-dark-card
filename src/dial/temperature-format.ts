/**
 * How the dial writes a temperature: the whole number, plus one decimal digit
 * when the thermostat is adjusted in fractions of a degree.
 *
 * Display only — the value itself, the setpoints sent to Home Assistant and
 * the dial geometry all keep full precision.
 */
export interface DisplayTemperature {
  /** The signed whole part, e.g. `"-3"` for -3.4. */
  whole: string;
  /** The decimal digit, or `undefined` when whole degrees are shown. */
  fraction?: string;
}

/**
 * Decimal places shown for a thermostat adjusted in increments of `step`.
 *
 * Follows Home Assistant's own thermostat card: a fractional step (0.5 °C)
 * shows one decimal, a whole step (1 °F) shows whole degrees. A fractional
 * step always shows its decimal, even `22.0`, so the number keeps its width
 * as it changes.
 */
function displayDigits(step: number): number {
  return step < 1 ? 1 : 0;
}

/**
 * Round `value` for display with the precision that `step` calls for.
 *
 * Rounds once, half away from zero — 68.49 is 68, 68.5 is 69, -68.5 is -69 —
 * the same as the number formatting Home Assistant uses elsewhere, so the dial
 * agrees with other cards showing the same entity.
 */
export function formatTemperature(value: number, step: number): DisplayTemperature {
  const rounded = value.toFixed(displayDigits(step));
  // toFixed keeps the sign of a value that rounds to zero: (-0.2).toFixed(0) is "-0".
  const unsigned = Number(rounded) === 0 ? rounded.replace('-', '') : rounded;
  const [whole, fraction] = unsigned.split('.');
  return { whole, fraction };
}
