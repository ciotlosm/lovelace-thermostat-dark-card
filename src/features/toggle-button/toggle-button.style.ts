import { css } from 'lit-element';

export const toggleButtonStyles = css`
  .dial.hide-toggle .dial__ico__power {
    display: none;
  }
  .dial__ico__power {
    fill: var(--thermostat-toggle-color);
    cursor: pointer;
    pointer-events: bounding-box;
  }
  .dial.dial--state--off .dial__ico__power {
    fill: var(--thermostat-toggle-off-color);
  }
  .dial.dial--state--heating .dial__ico__power,
  .dial.dial--state--cooling .dial__ico__power {
    fill: var(--thermostat-toggle-on-color);
  }
`;
