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
    width: 100%;
    height: auto;

    /* Theme-aware colors */
    --dial-off-fill: var(--card-background-color, #555);
    --dial-idle-fill: var(--card-background-color, #222);
    --dial-heating-fill: #e36304;
    --dial-cooling-fill: #007af1;
    --dial-drying-fill: #a68b00;
    --dial-text-color: var(--primary-text-color, #fff);
    --dial-path-color: rgba(128, 128, 128, 0.3);
    --dial-path-active-color: rgba(255, 255, 255, 0.8);
    --dial-path-active-large-color: rgba(255, 255, 255, 1);
    --dial-leaf-color: #13eb13;
    --dial-toggle-color: var(--secondary-text-color, grey);
  }

  /* Disc background — colored by hvac_action */
  .dial-disc {
    transition: fill 0.5s ease;
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
    font-family: var(--ha-card-header-font-family, inherit);
  }
  .dial-text--ambient {
    font-size: 80px;
    font-weight: bold;
    opacity: 1;
    transition: opacity 0.3s ease;
  }
  .dial-text--target {
    font-size: 80px;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .dial-text--low,
  .dial-text--high {
    font-size: 55px;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .dial-text--unit {
    font-size: 30px;
  }

  /* Edit mode: swap visibility */
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

  /* Ring (editable indicator) */
  .dial-ring {
    fill: white;
    fill-rule: evenodd;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  :host([editing]) .dial-ring {
    opacity: 0.15;
  }

  /* Controls (chevrons) */
  .dial-chevron {
    fill: none;
    stroke: var(--dial-text-color);
    stroke-width: 4px;
    opacity: 0;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  :host([editing]) .dial-chevron {
    opacity: 0.3;
  }
  .dial-chevron--pressed {
    opacity: 1 !important;
  }

  /* Indicators */
  .dial-leaf {
    fill: var(--dial-leaf-color);
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .dial-leaf--visible {
    opacity: 1;
  }

  .dial-power {
    fill: var(--dial-toggle-color);
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }
  .dial-power:hover {
    opacity: 1;
  }
`;
