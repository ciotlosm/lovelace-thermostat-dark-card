/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
import { LitElement, html, customElement, property, TemplateResult, CSSResult, css, state } from 'lit-element';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { ThermostatDarkCardConfig } from './types';
@customElement('thermostat-dark-card-editor')
export class ThermostatDarkCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: ThermostatDarkCardConfig;
  @state() private _helpers?: any;
  private _initialized = false;

  public setConfig(config: ThermostatDarkCardConfig): void {
    this._config = config;

    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _step(): number {
    return this._config?.step || 0.5;
  }

  get _chevron_size(): number {
    return this._config?.chevron_size || 50;
  }

  get _pending(): number {
    return this._config?.pending || 3;
  }

  get _idle_zone(): number {
    return this._config?.idle_zone || 2;
  }

  get _highlight_tap(): boolean {
    return this._config?.highlight_tap || false;
  }

  get _show_toggle(): boolean {
    return this._config?.show_toggle || false;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    // // The climate more-info has ha-switch and paper-dropdown-menu elements that are lazy loaded unless explicitly done here
    // this._helpers.importMoreInfoControl('climate');

    return html`
      <div class="card-config">
        <div class="values">
        <ha-entity-picker
          label="Entity (Required)"
          .hass=${this.hass}
          .value=${this._entity}
          .configValue=${'entity'}
          .includeDomains=${['climate']}
          @value-changed=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
        </div>
        <div class="values">
          <paper-input
            label="Name (Optional)"
            .value=${this._name}
            .configValue=${'name'}
            @value-changed=${this._valueChanged}
          ></paper-input>
            <paper-input
              label="Step (Optional)"
              .value=${this._step}
              .configValue=${'step'}
              @value-changed=${this._valueChanged}
            ></paper-input>
            <paper-input
              label="Chevron size (Optional)"
              .value=${this._chevron_size}
              .configValue=${'chevron_size'}
              @value-changed=${this._valueChanged}
            ></paper-input>
            <paper-input
              label="Activation delay (Optional)"
              .value=${this._pending}
              .configValue=${'pending'}
              @value-changed=${this._valueChanged}
            ></paper-input>
            <paper-input
              label="Minimum difference between set points (Optional)"
              .value=${this._idle_zone}
              .configValue=${'idle_zone'}
              @value-changed=${this._valueChanged}
            ></paper-input>
            <br />
            <ha-formfield .label=${`Highlight tap is ${this._highlight_tap ? 'on' : 'off'}`}>
              <ha-switch
                .checked=${this._highlight_tap !== false}
                .configValue=${'highlight_tap'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
            <ha-formfield .label=${`Toggle Button is ${this._show_toggle ? 'on' : 'off'}`}>
              <ha-switch
                .checked=${this._show_toggle !== false}
                .configValue=${'show_toggle'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          </div>
        </div>
      </div>
    `;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    let shouldFireEvent = true;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === '') {
        try {
          delete this._config[target.configValue];
        } catch (e) {
          shouldFireEvent = false;
          console.warn('Could not delete %s', target.configValue);
        }
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    if (shouldFireEvent) fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles(): CSSResult {
    return css`
      .values {
        padding-left: 16px;
        background: var(--secondary-background-color);
        display: grid;
      }
      ha-formfield {
        margin: 5px;
      }
      ha-switch {
        margin: 5px;
      }
    `;
  }
}
