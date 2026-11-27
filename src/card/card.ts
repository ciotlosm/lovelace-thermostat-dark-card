import type { HassEntity } from 'home-assistant-js-websocket';
import {
  type CSSResultGroup,
  css,
  html,
  LitElement,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { DEFAULT_CONFIG } from '../const';
import type { ThermostatDial } from '../dial/dial';
import type { TemperatureChange } from '../dial/dial-interaction';
import type { HomeAssistant } from '../ha-types';
import { hasEntityChanged } from '../ha-types';
import { localize, setLanguage } from '../localize/index';
import { AUTO_SKIN, getAvailableSkins, isSkinName } from '../skins/index';
import type { HvacAction, ThermostatCardConfig } from '../types';
import '../dial/dial';

type SetTemperatureData = TemperatureChange & { entity_id: string };

/** A change waiting out `pending`, with the HVAC mode it was made in. */
interface UnsentChange {
  data: SetTemperatureData;
  hvacMode: string;
}

const MS_PER_SECOND = 1000;
/** The shortest edit mode, in seconds: long enough to reach the arrows after the dial opens. */
const MIN_EDIT_TIMEOUT = 1;

@customElement('thermostat-dark-card')
export class ThermostatDarkCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: ThermostatCardConfig;
  @query('thermostat-dial') private _dial?: ThermostatDial;
  /** The newest change, waiting `pending` seconds after the last one before it is sent. */
  private _unsentChange: UnsentChange | null = null;
  private _sendTimer: number | undefined;
  /** The newest change waiting to be sent while an earlier call is in flight. */
  private _queuedChange: SetTemperatureData | null = null;
  private _sending = false;
  /** The entity's state when the last answered call was made, to notice when it reports back. */
  private _stateBeforeCall: HassEntity | null = null;

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'climate' } } },
        { name: 'name', selector: { text: {} } },
        {
          type: 'grid',
          name: '',
          flatten: true,
          schema: [
            {
              name: 'skin',
              selector: { select: { options: getAvailableSkins(), mode: 'dropdown' } },
            },
            { name: 'step', selector: { number: { min: 0.5, max: 5, step: 0.5, mode: 'box' } } },
            { name: 'pending', selector: { number: { min: 0, max: 30, step: 0.5, mode: 'box' } } },
            {
              name: 'edit_timeout',
              selector: { number: { min: MIN_EDIT_TIMEOUT, max: 30, step: 0.5, mode: 'box' } },
            },
          ],
        },
        { name: 'ambient_temperature', selector: { entity: { domain: 'sensor' } } },
        { name: 'status_entity', selector: { entity: { domain: ['sensor', 'input_text'] } } },
        {
          type: 'grid',
          name: '',
          flatten: true,
          schema: [
            { name: 'hide_name', selector: { boolean: {} } },
            { name: 'readonly', selector: { boolean: {} } },
            { name: 'show_power_toggle', selector: { boolean: {} } },
            { name: 'show_preset_indicator', selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: (schema: { name: string }) => {
        const key = `editor_${schema.name}`;
        const label = localize(key);
        // `localize` returns the key itself when there is no translation.
        return label === key ? schema.name : label;
      },
    };
  }

  public static getStubConfig(hass?: { states: Record<string, unknown> }): Record<string, unknown> {
    const entities = hass ? Object.keys(hass.states).filter((e) => e.startsWith('climate.')) : [];
    return { entity: entities[0] || 'climate.thermostat' };
  }

  public setConfig(config: ThermostatCardConfig): void {
    if (!config?.entity) {
      throw new Error('Entity is required');
    }
    if (!isSeconds(config.pending, 0)) {
      throw new Error('pending must be a number of seconds, 0 or more');
    }
    if (!isSeconds(config.edit_timeout, MIN_EDIT_TIMEOUT)) {
      throw new Error(`edit_timeout must be a number of seconds, ${MIN_EDIT_TIMEOUT} or more`);
    }
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      // An unknown skin name is a typo, not a theme — fall back to `auto`.
      skin: config.skin && isSkinName(config.skin) ? config.skin : AUTO_SKIN,
    };
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions() {
    return {
      columns: 6,
      min_columns: 3,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) return false;
    // Home Assistant knows the language of the dashboard — use it for the
    // card's own strings (the editor labels, the card picker name).
    setLanguage(this.hass?.language);
    // A theme change repaints the dial even when the entity state is the same.
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (oldHass && oldHass.themes?.darkMode !== this.hass.themes?.darkMode) return true;
    if (oldHass && oldHass.themes?.theme !== this.hass.themes?.theme) return true;
    return hasEntityChanged(this, changedProps, this._config.entity);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass')) this._settleOnceReported();
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

    const name =
      this._config.hide_name || this._config.name === false
        ? ''
        : (this._config.name ?? (attrs.friendly_name as string) ?? '');

    return html`
      <ha-card>
        ${name ? html`<div class="card-title">${name}</div>` : ''}
        ${keyed(
          // A fresh dial per entity, so an edit never carries over to another thermostat.
          this._config.entity,
          html`<thermostat-dial
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
          .edit_timeout=${this._editTimeout}
          .idle_zone=${this._config.idle_zone}
          .show_ticks=${this._config.show_ticks ?? true}
          .show_power_toggle=${this._config.show_power_toggle ?? true}
          .show_preset_indicator=${this._config.show_preset_indicator ?? true}
          .readonly=${this._config.readonly ?? false}
          .skin=${this._config.skin}
          .dark_mode=${this.hass.themes?.darkMode}
          .colors=${this._config.colors}
          ._presetIcons=${this._config.preset_icons}
          .status_text=${this._resolveStatusText()}
          @temperature-changed=${this._handleTemperatureChanged}
          @toggle=${this._handleToggle}
          @more-info=${this._handleMoreInfo}
        ></thermostat-dial>`,
        )}
      </ha-card>
    `;
  }

  private get _pending(): number {
    return this._config.pending ?? DEFAULT_CONFIG.pending;
  }

  /**
   * Never shorter than `pending`, so the dial shows a change until it is
   * sent, nor than a second, so the arrows stay open to be tapped.
   */
  private get _editTimeout(): number {
    return Math.max(this._config.edit_timeout ?? this._pending, this._pending, MIN_EDIT_TIMEOUT);
  }

  private _handleTemperatureChanged(e: CustomEvent<TemperatureChange>): void {
    const entityId = this._config.entity;
    this._unsentChange = {
      data: { entity_id: entityId, ...e.detail },
      hvacMode: this.hass.states[entityId].state,
    };
    this._startSendTimer();
  }

  /**
   * Send the newest change `pending` seconds after the last one, so a run of
   * taps makes one call. The timer belongs to the card rather than the dial,
   * and nothing clears it when the card leaves the page, so navigating away
   * does not lose the change. Closing or reloading the page still does.
   */
  private _startSendTimer(): void {
    window.clearTimeout(this._sendTimer);
    this._sendTimer = window.setTimeout(
      () => this._sendSettledChange(),
      this._pending * MS_PER_SECOND,
    );
  }

  private _sendSettledChange(): void {
    // The user is still choosing: wait until the drag has been over for `pending`.
    if (this._dial?.dragging) {
      this._startSendTimer();
      return;
    }
    const change = this._unsentChange;
    this._sendTimer = undefined;
    this._unsentChange = null;
    // A change made for another HVAC mode's setpoints no longer applies.
    if (!change || this.hass.states[change.data.entity_id]?.state !== change.hvacMode) return;
    this._queuedChange = change.data;
    if (!this._sending) void this._sendQueuedChanges();
  }

  /**
   * Send setpoint changes to Home Assistant one call at a time.
   *
   * Waiting for each call keeps them in the order the user made them, and
   * taps made while a call is in flight collapse into a single newest call.
   * This runs on promises rather than DOM events, so it finishes even after
   * the card has been taken off the page.
   */
  private async _sendQueuedChanges(): Promise<void> {
    this._sending = true;
    while (this._queuedChange) {
      const change = this._queuedChange;
      this._queuedChange = null;
      const stateBeforeCall = this.hass.states[change.entity_id];
      try {
        await this.hass.callService('climate', 'set_temperature', change);
        this._stateBeforeCall = stateBeforeCall;
      } catch {
        this._stateBeforeCall = null;
        // Home Assistant has already told the user why the call failed. Stop
        // showing the rejected value, unless a newer change is on its way.
        if (!this._queuedChange && !this._unsentChange) this._dial?.cancelEditing();
      }
    }
    this._sending = false;
    this._settleOnceReported();
  }

  /**
   * Let the dial show Home Assistant's setpoints again once every change has
   * been sent and Home Assistant has reported the entity since the last call.
   */
  private _settleOnceReported(): void {
    const stateBeforeCall = this._stateBeforeCall;
    if (!stateBeforeCall || this._sending || this._unsentChange) return;
    if (this.hass.states[stateBeforeCall.entity_id] === stateBeforeCall) return;
    this._stateBeforeCall = null;
    this._dial?.changeSettled();
  }

  private _handleToggle(): void {
    const entity = this.hass.states[this._config.entity];
    const service = entity.state === 'off' ? 'turn_on' : 'turn_off';
    this.hass.callService('climate', service, {
      entity_id: this._config.entity,
    });
  }

  private _handleMoreInfo(): void {
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._config.entity },
    });
    this.dispatchEvent(event);
  }

  private _resolveStatusText(): string | null {
    if (!this._config.status_entity) return null;
    const entity = this.hass.states[this._config.status_entity];
    if (!entity) return null;
    const state = entity.state;
    if (!state || state === 'unknown' || state === 'unavailable') return null;
    return state;
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

/** Whether `value` is unset or a number of seconds no less than `minimum`. */
function isSeconds(value: unknown, minimum: number): boolean {
  return (
    value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= minimum)
  );
}
