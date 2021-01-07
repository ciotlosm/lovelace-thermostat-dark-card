/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  html,
  customElement,
  property,
  CSSResult,
  TemplateResult,
  css,
  PropertyValues,
  internalProperty,
} from 'lit-element';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  LovelaceCardEditor,
  getLovelace
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types

import './editor';
import { ThermostatUserInterface } from './user-interface';

import type { ThermostatDarkCardConfig } from './types';
import { HVAC_HEATING, HVAC_COOLING, HVAC_IDLE, HVAC_OFF, GREEN_LEAF_MODES,  } from './const';
import { localize } from './localize/localize';

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'thermostat-dark-card',
  name: 'Dark Thermostat',
  description: 'Thermostat with a round dial',
});

@customElement('thermostat-dark-card')
export class ThermostatDarkCard extends ThermostatUserInterface {
  @property({ attribute: false }) public _hass!: HomeAssistant;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('thermostat-dark-card-editor');
  }

  public static getStubConfig(): object {
    return {};
  }

  public set hass(hass: HomeAssistant) {
    const config = this.config;
    const entity = hass.states[config.entity];

    let ambientTemperature = entity.attributes.current_temperature;
    if (config.ambient_temperature && hass.states[config.ambient_temperature])
      ambientTemperature = hass.states[config.ambient_temperature].state;
    let hvacState;
    if (config.hvac.attribute) hvacState = entity.attributes[config.hvac.attribute];
    else if (config.hvac.sensor && config.hvac.sensor.sensor) {
      if (config.hvac.sensor.attribute)
        hvacState = hass.states[config.hvac.sensor.sensor][config.hvac.sensor.attribute];
      else hvacState = hass.states[config.hvac.sensor.sensor].state;
    } else hvacState = entity.attributes['hvac_action'] || entity.state;

    if (![HVAC_IDLE, HVAC_HEATING, HVAC_COOLING].includes(hvacState)) {
      hvacState = config.hvac.states[hvacState] || HVAC_OFF
    }

    let awayState = entity.attributes[config.away.attribute];
    //let awayState = 'on';
    if (config.away.sensor.sensor) {
      const awaySensor = hass.states[config.away.sensor.sensor];
      awayState = awaySensor.state;
      if (config.away.sensor.attribute) {
        awayState = awaySensor.attributes[config.away.sensor.attribute];
      }
    }

    const newState = {
      minValue: config.range_min || entity.attributes.min_temp,
      maxValue: config.range_max || entity.attributes.max_temp,
      ambientTemperature: ambientTemperature,
      target_temperature: entity.attributes.temperature,
      target_temperature_low: entity.attributes.target_temp_low,
      target_temperature_high: entity.attributes.target_temp_high,
      hvacState: hvacState,
      away: GREEN_LEAF_MODES.includes(awayState),
    };
    if (
      !this._savedState ||
      this._savedState.minValue != newState.minValue ||
      this._savedState.maxValue != newState.maxValue ||
      this._savedState.ambientTemperature != newState.ambientTemperature ||
      this._savedState.target_temperature != newState.target_temperature ||
      this._savedState.target_temperature_low != newState.target_temperature_low ||
      this._savedState.target_temperature_high != newState.target_temperature_high ||
      this._savedState.hvacState != newState.hvacState ||
      this._savedState.away != newState.away
    ) {
      this._savedState = newState;
      this.updateState(newState);
    }
    this._hass = hass;
  }
  @internalProperty() private config!: ThermostatDarkCardConfig;
  @internalProperty() private _savedState: any;

  // https://lit-element.polymer-project.org/guide/properties#accessors-custom
  public setConfig(config: ThermostatDarkCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }
    // Prepare config defaults
    const cardConfig = Object.assign({}, config);
    cardConfig.hvac = Object.assign({}, config.hvac);
    if (!cardConfig.diameter) cardConfig.diameter = 400;
    if (!cardConfig.pending) cardConfig.pending = 3;
    if (!cardConfig.idleZone) cardConfig.idleZone = 2;
    if (!cardConfig.step) cardConfig.step = 0.5;
    if (!cardConfig.highlight_tap) cardConfig.highlight_tap = false;
    if (!cardConfig.chevron_size) cardConfig.chevron_size = 50;
    if (!cardConfig.numTicks) cardConfig.numTicks = 150;
    if (!cardConfig.tickDegrees) cardConfig.tickDegrees = 300;
    if (!cardConfig.hvac.states)
      cardConfig.hvac.states = {
        idle: HVAC_IDLE,
        heating: HVAC_HEATING,
        cooling: HVAC_COOLING
      };

    // Extra config values generated for simplicity of updates
    cardConfig.radius = cardConfig.diameter / 2;
    cardConfig.ticksOuterRadius = cardConfig.diameter / 30;
    cardConfig.ticksInnerRadius = cardConfig.diameter / 8;
    cardConfig.offsetDegrees = 180 - (360 - cardConfig.tickDegrees) / 2;
    cardConfig.control = this._controlSetPoints.bind(this);
    cardConfig.away = Object.assign(
      {
        attribute: 'preset_mode',
        sensor: {},
      },
      config.away || {},
    );
    this.renderSVG(cardConfig);
    this.config = cardConfig;
    if (this._hass) this.hass = this._hass;
  }

  // https://lit-element.polymer-project.org/guide/lifecycle#shouldupdate
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }
    hasConfigOrEntityChanged(this, changedProps, true);
    return true;
  }

  // https://lit-element.polymer-project.org/guide/templates
  protected render(): TemplateResult | void {
    return html`
    ${this.container}`;
  }

  private _handleHold(): void {
    //const config = this._config;
    //if (!config) return;
    //handleClick(this, this._hass!, this._evalActions(config, 'hold_action'), true, false);
  }

  private _controlSetPoints(): void {
    if (this.dual) {
      if (
        this.temperature.high != this._savedState.target_temperature_high ||
        this.temperature.low != this._savedState.target_temperature_low
      )
        this._hass.callService('climate', 'set_temperature', {
          entity_id: this.config.entity,
          target_temp_high: this.temperature.high,
          target_temp_low: this.temperature.low,
        });
    } else {
      if (this.temperature.target != this._savedState.target_temperature)
        this._hass.callService('climate', 'set_temperature', {
          entity_id: this.config.entity,
          temperature: this.temperature.target,
        });
    }
  }

  // https://lit-element.polymer-project.org/guide/styles
  static get styles(): CSSResult {
    return css`
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
        --thermostat-off-fill: #555;
        --thermostat-idle-fill: #222;
        --thermostat-path-color: rgba(255, 255, 255, 0.3);
        --thermostat-heating-fill: #e36304;
        --thermostat-cooling-fill: #007af1;
        --thermostat-path-active-color: rgba(255, 255, 255, 0.8);
        --thermostat-path-active-color-large: rgba(255, 255, 255, 1);
        --thermostat-text-color: white;
        --thermostat-toggle-color: grey;
        --thermostat-toggle-off-color: darkgrey;
      }
      .dial.has-thermo .dial__ico__leaf {
        visibility: hidden;
      }
      .dial.hide-toggle .dial__ico__power {
        display: none;
      }
      .dial .dial__shape {
        transition: fill 0.5s;
      }
      .dial__ico__power{
        fill: var(--thermostat-toggle-color);
        cursor: pointer;
        pointer-events: bounding-box;
      }
      .dial.dial--state--off .dial__ico__power{
        fill: var(--thermostat-toggle-off-color);
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
  }
}
