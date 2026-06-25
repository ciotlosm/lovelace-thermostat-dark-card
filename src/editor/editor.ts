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

    const name = this._config.name;
    const nameDisabled = name === false;
    const nameValue = typeof name === 'string' ? name : '';

    // Check if entity uses celsius (step < 1)
    const entity = this._config.entity ? this.hass.states[this._config.entity] : undefined;
    const entityStep = entity?.attributes?.target_temp_step as number | undefined;
    const isCelsius = entityStep !== undefined ? entityStep < 1 : true;

    return html`
      <div class="card-config">
        <ha-entity-picker
          .label=${'Entity (Required)'}
          .hass=${this.hass}
          .value=${this._config.entity || ''}
          .includeDomains=${['climate']}
          @value-changed=${this._entityChanged}
          allow-custom-entity
        ></ha-entity-picker>

        <div class="name-row">
          <div class="select-row" style="flex:1">
            <label>Name</label>
            <input
              type="text"
              .value=${nameValue}
              ?disabled=${nameDisabled}
              placeholder=${nameDisabled ? 'Disabled' : 'Use entity name'}
              @input=${this._nameChanged}
            />
          </div>
          <ha-formfield .label=${'Hide name'}>
            <ha-switch
              .checked=${nameDisabled}
              @change=${this._nameToggled}
            ></ha-switch>
          </ha-formfield>
        </div>

        <ha-entity-picker
          .label=${'Ambient Temperature Sensor (Optional)'}
          .hass=${this.hass}
          .value=${this._config.ambient_temperature || ''}
          .includeDomains=${['sensor']}
          @value-changed=${this._ambientChanged}
          allow-custom-entity
        ></ha-entity-picker>

        <ha-entity-picker
          .label=${'Status Text Entity (Optional)'}
          .hass=${this.hass}
          .value=${this._config.status_entity || ''}
          .includeDomains=${['sensor', 'input_text']}
          @value-changed=${this._statusEntityChanged}
          allow-custom-entity
        ></ha-entity-picker>

        <div class="select-row">
          <label>Theme</label>
          <select @change=${this._themeChanged}>
            <option value="dark" ?selected=${(this._config.theme || 'dark') === 'dark'}>Dark</option>
            <option value="light" ?selected=${this._config.theme === 'light'}>Light</option>
            <option value="transparent" ?selected=${this._config.theme === 'transparent'}>Transparent</option>
          </select>
        </div>

        ${isCelsius ? html`
          <div class="select-row">
            <label>Step override</label>
            <select @change=${this._stepChanged}>
              <option value="" ?selected=${!this._config.step}>Default (${entityStep ?? 0.5})</option>
              <option value="0.5" ?selected=${this._config.step === 0.5}>0.5°</option>
              <option value="1" ?selected=${this._config.step === 1}>1°</option>
            </select>
          </div>
        ` : ''}

        <div class="select-row">
          <label>Pending seconds (delay before saving)</label>
          <input type="number" min="1" max="30" .value=${String(this._config.pending ?? 3)} @input=${this._pendingChanged} />
        </div>

        <div class="toggle-row">
          <ha-formfield .label=${'Read-only mode'}>
            <ha-switch
              .checked=${this._config.readonly ?? false}
              @change=${this._readonlyToggled}
            ></ha-switch>
          </ha-formfield>
          <ha-formfield .label=${'Show power toggle'}>
            <ha-switch
              .checked=${this._config.show_power_toggle ?? true}
              @change=${this._powerToggleChanged}
            ></ha-switch>
          </ha-formfield>
          <ha-formfield .label=${'Show preset indicator'}>
            <ha-switch
              .checked=${this._config.show_preset_indicator ?? true}
              @change=${this._presetToggleChanged}
            ></ha-switch>
          </ha-formfield>
        </div>
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

  private _nameChanged(ev: Event): void {
    if (!this._config) return;
    const value = (ev.target as HTMLInputElement).value;
    if (this._config.name === value) return;
    this._config = { ...this._config, name: value || undefined };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _nameToggled(ev: Event): void {
    if (!this._config) return;
    const checked = (ev.target as HTMLInputElement).checked;
    this._config = { ...this._config, name: checked ? false : undefined };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _themeChanged(ev: Event): void {
    if (!this._config) return;
    const value = (ev.target as HTMLSelectElement).value as 'dark' | 'light' | 'transparent';
    if (this._config.theme === value) return;
    this._config = { ...this._config, theme: value };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _stepChanged(ev: Event): void {
    if (!this._config) return;
    const value = (ev.target as HTMLSelectElement).value;
    const step = value ? parseFloat(value) : undefined;
    if (this._config.step === step) return;
    const newConfig = { ...this._config };
    if (step === undefined) {
      delete newConfig.step;
    } else {
      newConfig.step = step;
    }
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _ambientChanged(ev: CustomEvent): void {
    if (!this._config) return;
    const value = ev.detail.value;
    const newConfig = { ...this._config };
    if (value) {
      newConfig.ambient_temperature = value;
    } else {
      delete newConfig.ambient_temperature;
    }
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _statusEntityChanged(ev: CustomEvent): void {
    if (!this._config) return;
    const value = ev.detail.value;
    const newConfig = { ...this._config };
    if (value) {
      newConfig.status_entity = value;
    } else {
      delete newConfig.status_entity;
    }
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _pendingChanged(ev: Event): void {
    if (!this._config) return;
    const value = parseFloat((ev.target as HTMLInputElement).value);
    if (isNaN(value) || this._config.pending === value) return;
    this._config = { ...this._config, pending: value };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _readonlyToggled(ev: Event): void {
    if (!this._config) return;
    const checked = (ev.target as HTMLInputElement).checked;
    this._config = { ...this._config, readonly: checked || undefined };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _powerToggleChanged(ev: Event): void {
    if (!this._config) return;
    const checked = (ev.target as HTMLInputElement).checked;
    this._config = { ...this._config, show_power_toggle: checked };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _presetToggleChanged(ev: Event): void {
    if (!this._config) return;
    const checked = (ev.target as HTMLInputElement).checked;
    this._config = { ...this._config, show_preset_indicator: checked };
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
      .name-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .name-row ha-textfield {
        flex: 1;
      }
      .select-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .select-row label {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .select-row select,
      .select-row input {
        padding: 8px 12px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        font-size: 14px;
        cursor: pointer;
      }
      .toggle-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thermostat-dark-card-editor': ThermostatDarkCardEditor;
  }
}
