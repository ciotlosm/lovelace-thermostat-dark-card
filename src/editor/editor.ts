import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../ha-types';
import { fireEvent } from '../ha-types';
import type { ThermostatCardConfig } from '../types';

@customElement('thermostat-dark-card-editor')
export class ThermostatDarkCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: ThermostatCardConfig;

  public setConfig(config: ThermostatCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-entity-picker
          label="Entity (Required)"
          .hass=${this.hass}
          .value=${this._config.entity || ''}
          .configValue=${'entity'}
          .includeDomains=${['climate']}
          @value-changed=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>

        <ha-textfield
          label="Name (Optional)"
          .value=${this._config.name || ''}
          .configValue=${'name'}
          @input=${this._valueChanged}
        ></ha-textfield>

        <ha-textfield
          label="Step"
          type="number"
          .value=${String(this._config.step ?? 0.5)}
          .configValue=${'step'}
          @input=${this._valueChanged}
        ></ha-textfield>

        <ha-textfield
          label="Pending (seconds)"
          type="number"
          .value=${String(this._config.pending ?? 3)}
          .configValue=${'pending'}
          @input=${this._valueChanged}
        ></ha-textfield>
      </div>
    `;
  }

  private _valueChanged(ev: Event): void {
    if (!this._config || !this.hass) return;
    const target = ev.target as HTMLInputElement & { configValue?: string };
    const key = target.configValue;
    if (!key) return;

    let value: string | number = target.value;
    if (target.type === 'number') {
      value = parseFloat(value);
      if (isNaN(value)) return;
    }

    if ((this._config as unknown as Record<string, unknown>)[key] === value) return;

    this._config = value === '' ? { ...this._config, [key]: undefined } : { ...this._config, [key]: value };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thermostat-dark-card-editor': ThermostatDarkCardEditor;
  }
}
