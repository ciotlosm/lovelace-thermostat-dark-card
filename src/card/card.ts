import { LitElement, html, css, CSSResultGroup, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../ha-types';
import { hasEntityChanged } from '../ha-types';
import type { ThermostatCardConfig, HvacAction } from '../types';
import { DEFAULT_CONFIG } from '../const';
import '../dial/dial';

@customElement('thermostat-dark-card')
export class ThermostatDarkCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: ThermostatCardConfig;

  public static async getConfigElement(): Promise<HTMLElement> {
    await import('../editor/editor');
    return document.createElement('thermostat-dark-card-editor');
  }

  public static getStubConfig(hass?: { states: Record<string, unknown> }): Record<string, unknown> {
    const entities = hass ? Object.keys(hass.states).filter((e) => e.startsWith('climate.')) : [];
    return { entity: entities[0] || 'climate.thermostat' };
  }

  public setConfig(config: ThermostatCardConfig): void {
    if (!config || !config.entity) {
      throw new Error('Entity is required');
    }
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions() {
    return {
      columns: 6,
      rows: 6,
      min_columns: 3,
      min_rows: 3,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) return false;
    return hasEntityChanged(this, changedProps, this._config.entity);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    const entity = this.hass.states[this._config.entity];
    if (!entity) {
      return html`
        <ha-card>
          <div class="warning">Entity not found: ${this._config.entity}</div>
        </ha-card>
      `;
    }

    const attrs = entity.attributes;

    // Resolve ambient temperature (external sensor or entity attribute)
    let currentTemp = attrs.current_temperature as number;
    if (this._config.ambient_temperature) {
      const ambientEntity = this.hass.states[this._config.ambient_temperature];
      if (ambientEntity) {
        currentTemp = parseFloat(ambientEntity.state);
      }
    }

    const hvacAction = (attrs.hvac_action || entity.state) as HvacAction;
    const hvacMode = entity.state as string;
    const presetMode = (attrs.preset_mode as string) || null;

    const temperature = (attrs.temperature as number) ?? null;
    const targetTempLow = (attrs.target_temp_low as number) ?? null;
    const targetTempHigh = (attrs.target_temp_high as number) ?? null;

    const minTemp = this._config.range_min ?? (attrs.min_temp as number) ?? 7;
    const maxTemp = this._config.range_max ?? (attrs.max_temp as number) ?? 35;
    const step = this._config.step ?? (attrs.target_temp_step as number) ?? 0.5;

    const name = this._config.name === false ? '' : (this._config.name ?? (attrs.friendly_name as string) ?? '');

    return html`
      <ha-card>
        ${name ? html`<div class="card-title">${name}</div>` : ''}
        <thermostat-dial
          .current_temperature=${currentTemp}
          .temperature=${temperature}
          .target_temp_low=${targetTempLow}
          .target_temp_high=${targetTempHigh}
          .min_temp=${minTemp}
          .max_temp=${maxTemp}
          .target_temp_step=${step}
          .hvac_action=${hvacAction}
          .hvac_mode=${hvacMode}
          .preset_mode=${presetMode}
          .diameter=${this._config.diameter}
          .num_ticks=${this._config.num_ticks}
          .tick_degrees=${this._config.tick_degrees}
          .pending=${this._config.pending}
          .idle_zone=${this._config.idle_zone}
          .show_ticks=${this._config.show_ticks}
          .show_power_toggle=${this._config.show_power_toggle}
          .show_preset_indicator=${this._config.show_preset_indicator}
          .readonly=${this._config.readonly ?? false}
          .theme=${this._config.theme}
          .colors=${this._config.colors}
          ._presetIcons=${this._config.preset_icons}
          @temperature-changed=${this._handleTemperatureChanged}
          @toggle=${this._handleToggle}
        ></thermostat-dial>
      </ha-card>
    `;
  }

  private _handleTemperatureChanged(e: CustomEvent): void {
    const detail = e.detail;

    if (detail.temperature !== undefined) {
      this.hass.callService('climate', 'set_temperature', {
        entity_id: this._config.entity,
        temperature: detail.temperature,
      });
    } else if (detail.target_temp_low !== undefined) {
      this.hass.callService('climate', 'set_temperature', {
        entity_id: this._config.entity,
        target_temp_low: detail.target_temp_low,
        target_temp_high: detail.target_temp_high,
      });
    }
  }

  private _handleToggle(): void {
    const entity = this.hass.states[this._config.entity];
    const service = entity.state === 'off' ? 'turn_on' : 'turn_off';
    this.hass.callService('climate', service, {
      entity_id: this._config.entity,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        padding: 16px;
        overflow: hidden;
      }
      .card-title {
        font-size: 1.2em;
        color: var(--secondary-text-color);
        text-align: center;
        padding-bottom: 8px;
        font-weight: 400;
      }
      .warning {
        padding: 16px;
        color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thermostat-dark-card': ThermostatDarkCard;
  }
}
