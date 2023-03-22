/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  html,
  customElement,
  property,
  CSSResult,
  TemplateResult,
  PropertyValues,
  state,
  css,
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
import { cardColors, cardStyles } from './styles';
import { toggleButtonStyles } from './features/toggle-button/toggle-button.style';

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'thermostat-dark-card',
  name: 'Dark Thermostat',
  preview: true,
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

    if (![HVAC_OFF, HVAC_IDLE, HVAC_HEATING, HVAC_COOLING].includes(hvacState)) {
      hvacState = config.hvac.states[hvacState] || HVAC_IDLE
    }

    const offModeSupport = entity.attributes['hvac_modes'].includes(HVAC_OFF);

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
      offModeSupport: offModeSupport
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
  @state() private config!: ThermostatDarkCardConfig;
  @state() private _savedState: any;

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
        off: HVAC_OFF,
        idle: HVAC_IDLE,
        heating: HVAC_HEATING,
        cooling: HVAC_COOLING
      };
    if (!cardConfig.use_theme_color) cardConfig.use_theme_color = false;

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
    const appliedThemeColors = this.config.use_theme_color ? html`
    <style>
       :host{
        --thermostat-idle-fill: var(--secondary-background-color);
        --thermostat-path-color: var(--secondary-text-color);
        --thermostat-text-color: var(--primary-text-color);
      }
    </style>` : html`
      <style>
        :host{
          --thermostat-idle-fill: #222;
          --thermostat-path-color: rgba(255, 255, 255, 0.3);
          --thermostat-text-color: white;
        }
      </style>
    `;
    return html`
    ${this.container}
    ${appliedThemeColors}`;
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
        })
    } else {
      if (this.temperature.target != this._savedState.target_temperature)
        this._hass.callService('climate', 'set_temperature', {
          entity_id: this.config.entity,
          temperature: this.temperature.target,
        });
    }
  }

  // https://lit-element.polymer-project.org/guide/styles
  static get styles(): CSSResult[] {
    return [cardColors, cardStyles, toggleButtonStyles];
  }
}
