import { svg, TemplateResult } from 'lit';
import { rotatePoints, pointsToPath } from './svg-utils';

export interface TickConfig {
  numTicks: number;
  tickDegrees: number;
  radius: number;
  outerRadius: number;
  innerRadius: number;
  offsetDegrees: number;
}

export interface TickRange {
  from: number | undefined;
  to: number | undefined;
  largeIndices: number[];
  predicted?: boolean;
}

/** Render all tick marks as SVG paths. */
export function renderTicks(
  config: TickConfig,
  range: TickRange,
): TemplateResult {
  const { numTicks, tickDegrees, radius, outerRadius, innerRadius, offsetDegrees } = config;
  const { from, to, largeIndices } = range;
  const theta = tickDegrees / numTicks;
  const origin: [number, number] = [radius, radius];

  const ticks: TemplateResult[] = [];

  for (let i = 0; i < numTicks; i++) {
    const isLarge = largeIndices.includes(i);
    const isActive = from !== undefined && to !== undefined && i >= from && i <= to;

    const tickOuter = outerRadius;
    const tickInner = innerRadius;

    const points: [number, number][] = isLarge
      ? [
          [radius - radius * 0.0075, tickOuter],
          [radius + radius * 0.0075, tickOuter],
          [radius + radius * 0.0075, tickInner + radius * 0.1],
          [radius - radius * 0.0075, tickInner + radius * 0.1],
        ]
      : [
          [radius - radius * 0.005, tickOuter],
          [radius + radius * 0.005, tickOuter],
          [radius + radius * 0.005, tickInner],
          [radius - radius * 0.005, tickInner],
        ];

    const rotated = rotatePoints(points, i * theta - offsetDegrees, origin);
    const d = pointsToPath(rotated);

    let className = 'dial-tick';
    if (isActive) className += ' dial-tick--active';
    if (isLarge) className += ' dial-tick--large';

    ticks.push(svg`<path d=${d} class=${className} />`);
  }

  return svg`<g class="dial-ticks">${ticks}</g>`;
}
