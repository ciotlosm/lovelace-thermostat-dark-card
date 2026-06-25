import { css } from 'lit';

export const dialStyles = css`
  :host {
    display: block;
  }

  .dial-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .dial {
    user-select: none;
    cursor: pointer;
    touch-action: none;
    width: 100%;
    height: auto;

    /* Theme-aware colors */
    --dial-off-fill: #555;
    --dial-idle-fill: #222;
    --dial-heating-fill: #e36304;
    --dial-cooling-fill: #007af1;
    --dial-drying-fill: #a68b00;
    --dial-text-color: var(--primary-text-color, #fff);
    --dial-path-color: rgba(255, 255, 255, 0.3);
    --dial-path-active-color: rgba(255, 255, 255, 0.8);
    --dial-path-active-large-color: rgba(255, 255, 255, 1);
    --dial-leaf-color: #13eb13;
    --dial-toggle-color: var(--secondary-text-color, grey);
  }

  /* Disc background — colored by hvac_action */
  .dial-disc {
    transition: fill 0.5s ease, opacity 0.5s ease;
  }
  .dial-disc--off {
    fill: var(--dial-off-fill);
  }
  .dial-disc--idle {
    fill: var(--dial-idle-fill);
  }
  .dial-disc--heating {
    fill: var(--dial-heating-fill);
  }
  .dial-disc--cooling {
    fill: var(--dial-cooling-fill);
  }
  .dial-disc--drying {
    fill: var(--dial-drying-fill);
  }
  .dial-disc--preheating {
    fill: var(--dial-heating-fill);
  }
  .dial-disc--defrosting {
    fill: var(--dial-cooling-fill);
  }
  .dial-disc--fan {
    fill: var(--dial-idle-fill);
  }

  /* Off state uses grey fill (handled by disc color) */

  /* Ticks */
  .dial-tick {
    fill: var(--dial-path-color);
  }
  .dial-tick--active {
    fill: var(--dial-path-active-color);
  }
  .dial-tick--large {
    fill: var(--dial-path-active-large-color);
  }

  /* Center text */
  .dial-text {
    fill: var(--dial-text-color);
    text-anchor: middle;
    dominant-baseline: central;
    font-family: Helvetica, sans-serif;
  }
  .dial-text--ambient {
    font-size: 120px;
    font-weight: bold;
    opacity: 1;
    transition: opacity 0.3s ease;
  }
  .dial-text--status {
    font-size: 22px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.8;
  }
  .dial-text--target {
    font-size: 120px;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .dial-text--low,
  .dial-text--high {
    font-size: 60px;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  /* Edit mode: swap center text and show dual targets */
  :host([editing]) .dial-text--ambient {
    opacity: 0;
  }
  :host([editing]) .dial-text--target {
    opacity: 1;
  }
  :host([editing]) .dial-text--low,
  :host([editing]) .dial-text--high {
    opacity: 1;
  }

  /* Ring (edit mode indicator — thin outline at edge) */
  .dial-ring {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  :host([editing]) .dial-ring {
    opacity: 1;
  }

  /* Ring labels (temperature values on the tick ring) */
  .dial-ring-label {
    font-size: 22px;
    font-weight: bold;
  }

  /* Pointer tick — thicker, extends inward */
  .dial-pointer {
    fill: var(--dial-path-active-large-color);
  }
  :host([off]) .dial-pointer {
    fill: var(--dial-path-color);
  }

  /* Controls (chevrons) */
  .dial-chevron {
    cursor: pointer;
    opacity: 0.3;
    transition: opacity 0.15s ease;
  }
  .dial-chevron path {
    fill: none;
    stroke: var(--dial-text-color);
    stroke-width: 4px;
  }
  .dial-chevron:active {
    opacity: 1;
  }
  .dial-chevron:active path {
    stroke: white;
  }

  /* Indicators */
  .dial-preset {
    fill: var(--dial-leaf-color);
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .dial-preset--visible {
    opacity: 1;
  }

  .dial-power {
    cursor: pointer;
    transition: opacity 0.3s ease;
  }
  .dial-power path {
    fill: var(--dial-toggle-color);
    transition: fill 0.3s ease;
  }
  :host([off]) .dial-power path {
    fill: darkgrey;
  }
  :host(:not([off])) .dial-power path {
    fill: lightgrey;
  }
  .dial-power:hover {
    opacity: 0.8;
  }
  .dial-power--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .dial-thermo {
    fill: var(--dial-path-active-color);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .dial-thermo--visible {
    opacity: 1;
  }

  /* Light theme overrides */
  :host([theme="light"]) .dial {
    --dial-off-fill: #e0e0e0;
    --dial-idle-fill: #f5f5f5;
    --dial-text-color: #212121;
    --dial-path-color: rgba(0, 0, 0, 0.15);
    --dial-path-active-color: rgba(0, 0, 0, 0.5);
    --dial-path-active-large-color: rgba(0, 0, 0, 0.8);
    --dial-toggle-color: #757575;
    --dial-leaf-color: #0a8f0a;
  }

  /* Transparent theme — disc is invisible, ticks and text remain */
  :host([theme="transparent"]) .dial {
    --dial-off-fill: transparent;
    --dial-idle-fill: transparent;
    --dial-heating-fill: transparent;
    --dial-cooling-fill: transparent;
    --dial-drying-fill: transparent;
  }
`;
