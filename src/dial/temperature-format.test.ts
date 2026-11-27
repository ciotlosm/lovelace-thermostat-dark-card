import { describe, expect, it } from 'vitest';
import { formatTemperature } from './temperature-format';

const WHOLE_DEGREES = 1;
const HALF_DEGREES = 0.5;

describe('formatTemperature with a whole-degree step', () => {
  it.each([
    [68.9, '68.9 rounds up', '69'],
    [70.6, '70.6 rounds up', '71'],
    [70.7, '70.7 rounds up', '71'],
    [68.49, '68.49 rounds once, not via 68.5', '68'],
    [68.5, 'a half rounds away from zero', '69'],
    [68.0, 'a whole value is unchanged', '68'],
    [68.1, '68.1 rounds down', '68'],
    [-5, 'a negative whole value is unchanged', '-5'],
    [-3.4, 'a negative fraction rounds toward zero', '-3'],
    [-3.6, 'a negative fraction rounds away from zero', '-4'],
    [-68.5, 'a negative half rounds away from zero', '-69'],
    [0, 'zero is zero', '0'],
    [-0, 'negative zero has no sign', '0'],
    [-0.2, 'a negative value that rounds to zero has no sign', '0'],
    [0.4, 'a positive value that rounds to zero', '0'],
  ])('%s → %s: %s', (value, _reason, whole) => {
    expect(formatTemperature(value, WHOLE_DEGREES)).toEqual({ whole, fraction: undefined });
  });

  it('treats a step larger than one degree as whole degrees', () => {
    expect(formatTemperature(68.9, 2)).toEqual({ whole: '69', fraction: undefined });
  });
});

describe('formatTemperature with a fractional step', () => {
  it.each([
    [22.5, '22', '5'],
    [22.0, '22', '0'],
    [22.04, '22', '0'],
    [22.06, '22', '1'],
    [22.96, '23', '0'],
    [-3.4, '-3', '4'],
    [-0.5, '-0', '5'],
    [-0.04, '0', '0'],
    [0.04, '0', '0'],
  ])('%s → %s.%s', (value, whole, fraction) => {
    expect(formatTemperature(value, HALF_DEGREES)).toEqual({ whole, fraction });
  });

  it('shows one decimal for a step of a tenth', () => {
    expect(formatTemperature(19.27, 0.1)).toEqual({ whole: '19', fraction: '3' });
  });
});
