import { svg, TemplateResult } from 'lit';

/**
 * Render the edit-mode ring indicator — proportional to dial size.
 * Ring sits just inside the outer edge, thickness is 1% of diameter.
 */
export function renderRing(radius: number): TemplateResult {
  const strokeWidth = radius / 50; // ~1% of diameter
  const ringRadius = radius - radius / 50 - strokeWidth; // inset from edge
  return svg`<circle
    cx=${radius}
    cy=${radius}
    r=${ringRadius}
    class="dial-ring"
    fill="none"
    stroke="white"
    stroke-width=${strokeWidth}
  />`;
}
