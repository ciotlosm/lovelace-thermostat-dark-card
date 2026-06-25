import { svg, TemplateResult } from 'lit';

/**
 * Render a donut ring (editable indicator) around the dial perimeter.
 */
export function renderRing(radius: number): TemplateResult {
  const outer = radius - 4;
  const inner = radius - 8;
  const d = donutPath(radius, radius, outer, inner);
  return svg`<path d=${d} class="dial-ring" />`;
}

/** Create a donut (annular) SVG path. */
function donutPath(cx: number, cy: number, rOuter: number, rInner: number): string {
  return `${circlePath(cx, cy, rOuter)} ${circlePath(cx, cy, rInner)}`;
}

/** Create a circle as a path (needed for fill-rule: evenodd donut). */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx},${cy} m${-r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 z`;
}
