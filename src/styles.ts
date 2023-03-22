import { css } from 'lit-element';

export const cardColors = css`
  :host {
    --thermostat-off-fill: #555;
    --thermostat-heating-fill: #e36304;
    --thermostat-cooling-fill: #007af1;
    --thermostat-path-active-color: rgba(255, 255, 255, 0.8);
    --thermostat-path-active-color-large: rgba(255, 255, 255, 1);
    --thermostat-toggle-color: grey;
    --thermostat-toggle-off-color: darkgrey;
    --thermostat-toggle-on-color: lightgrey;
    --thermostat-active-text-color: white;
    --thermostat-active-path-color: rgba(255, 255, 255, 0.3);
  }
`;

export const cardStyles = css`
  .dial_container {
    padding: 8px;
  }
  .dial_title {
    font-size: 20px;
    padding: 8px;
    text-align: center;
    color: var(--secondary-text-color);
  }
  .dial {
    user-select: none;
  }
  .dial.has-thermo .dial__ico__leaf {
    visibility: hidden;
  }
  .dial .dial__shape {
    transition: fill 0.5s;
  }
  .dial__ico__leaf {
    fill: #13eb13;
    opacity: 0;
    transition: opacity 0.5s;
    pointer-events: none;
  }
  .dial.has-leaf .dial__ico__leaf {
    display: block;
    opacity: 1;
    pointer-events: initial;
  }
  .dial__ico__thermo {
    fill: var(--thermostat-path-active-color);
    opacity: 0;
    transition: opacity 0.5s;
    pointer-events: none;
  }
  .dial.has-thermo .dial__ico__thermo {
    display: block;
    opacity: 1;
    pointer-events: initial;
  }
  .dial__editableIndicator {
    fill: white;
    fill-rule: evenodd;
    opacity: 0;
    transition: opacity 0.5s;
  }
  .dial__temperatureControl {
    display: none;
    fill: white;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .dial__temperatureControl.control-visible {
    opacity: 0.2;
  }
  .dial--edit .dial__editableIndicator {
    opacity: 1;
  }
  .dial--edit .dial__temperatureControl {
    display: block;
  }
  .dial--state--off .dial__shape {
    fill: var(--thermostat-off-fill);
  }
  .dial--state--idle .dial__shape {
    fill: var(--thermostat-idle-fill);
  }
  .dial--state--heating .dial__shape {
    fill: var(--thermostat-heating-fill);
  }
  .dial--state--cooling .dial__shape {
    fill: var(--thermostat-cooling-fill);
  }
  .dial__ticks path {
    fill: var(--thermostat-path-color);
  }
  .dial__ticks path.active {
    fill: var(--thermostat-path-active-color);
  }
  .dial__ticks path.active.large {
    fill: var(--thermostat-path-active-color-large);
  }
  .dial text,
  .dial text tspan {
    fill: var(--thermostat-text-color);
    text-anchor: middle;
    font-family: Helvetica, sans-serif;
    alignment-baseline: central;
    dominant-baseline: central;
  }
  .dial.dial--state--heating text,
  .dial.dial--state--heating text tspan,
  .dial.dial--state--cooling text,
  .dial.dial--state--cooling text tspan {
    fill: var(--thermostat-active-text-color);
  }
  .dial.dial--state--heating .dial__ticks path,
  .dial.dial--state--cooling .dial__ticks path {
    fill: var(--thermostat-active-path-color);
  }
  .dial.dial--state--heating .dial__chevron,
  .dial.dial--state--cooling .dial__chevron {
    stroke: var(--thermostat-active-path-color);
  }
  .dial__lbl--target {
    font-size: 120px;
    font-weight: bold;
    visibility: hidden;
  }
  .dial__lbl--low,
  .dial__lbl--high {
    font-size: 90px;
    font-weight: bold;
    visibility: hidden;
  }
  .dial.in_control .dial__lbl--target {
    visibility: visible;
  }
  .dial.in_control .dial__lbl--low {
    visibility: visible;
  }
  .dial.in_control .dial__lbl--high {
    visibility: visible;
  }
  .dial__lbl--ambient {
    font-size: 120px;
    font-weight: bold;
    visibility: visible;
  }
  .dial.in_control.has_dual .dial__chevron--low,
  .dial.in_control.has_dual .dial__chevron--high {
    visibility: visible;
  }
  .dial.in_control .dial__chevron--target {
    visibility: visible;
  }
  .dial.in_control.has_dual .dial__chevron--target {
    visibility: hidden;
  }
  .dial .dial__chevron {
    visibility: hidden;
    fill: none;
    stroke: var(--thermostat-text-color);
    stroke-width: 4px;
    opacity: 0.3;
  }
  .dial .dial__chevron.pressed {
    opacity: 1;
  }
  .dial.in_control .dial__lbl--ambient {
    visibility: hidden;
  }
  .dial__lbl--super--ambient,
  .dial__lbl--super--target {
    font-size: 40px;
    font-weight: bold;
  }
  .dial__lbl--super--high,
  .dial__lbl--super--low {
    font-size: 30px;
    font-weight: bold;
  }
  .dial__lbl--ring {
    font-size: 22px;
    font-weight: bold;
  }
`;
