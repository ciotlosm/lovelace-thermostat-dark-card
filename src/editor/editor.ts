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
    this._config = { ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-entity-picker
          .label=${'Entity (Required)'}
          .hass=${this.hass}
          .value=${this._config.entity || ''}
          .configValue=${'entity'}
          .includeDomains=${['climate']}
          @value-changed=${this._entityChanged}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
    `;
  }

  private _entityChanged(ev: CustomEvent): void {
    if (!this._config) return;
    const value = ev.detail.value;
    if (this._config.entity === value) return;
    this._config = { ...this._config, entity: value };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-config {
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
