/**
 * Pure math utilities for SVG dial rendering.
 * No DOM, no side effects — just geometry.
 */

/** Rotate a point around an origin by angle degrees. */
export function rotatePoint(
  point: [number, number],
  angle: number,
  origin: [number, number],
): [number, number] {
  const rad = (angle * Math.PI) / 180;
  const x = point[0] - origin[0];
  const y = point[1] - origin[1];
  return [
    x * Math.cos(rad) - y * Math.sin(rad) + origin[0],
    x * Math.sin(rad) + y * Math.cos(rad) + origin[1],
  ];
}

/** Rotate an array of points around an origin. */
export function rotatePoints(
  points: [number, number][],
  angle: number,
  origin: [number, number],
): [number, number][] {
  return points.map((p) => rotatePoint(p, angle, origin));
}

/** Convert an array of points to an SVG path string. */
export function pointsToPath(points: [number, number][]): string {
  return (
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ') + 'Z'
  );
}

/** Map a temperature value to a tick index. */
export function temperatureToTick(
  temp: number,
  min: number,
  max: number,
  numTicks: number,
): number {
  return Math.round(((temp - min) / (max - min)) * (numTicks - 1));
}

/** Clamp a value between min and max. */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Format temperature with superscript decimal like the Nest thermostat. Always shows superscript (0 when whole number) to prevent layout shift. */
export function formatTemp(value: number): { whole: string; frac: string } {
  const whole = Math.floor(value);
  const frac = Math.round((value % 1) * 10);
  return { whole: String(whole), frac: String(frac) };
}

/** Calculate the offset degrees for tick positioning. */
export function offsetDegrees(tickDegrees: number): number {
  return 180 - (360 - tickDegrees) / 2;
}
