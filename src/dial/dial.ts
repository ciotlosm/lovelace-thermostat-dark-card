import { html, LitElement, type PropertyValues, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localize } from '../localize/index';
import {
  type SkinMode,
  skinFollowsMode,
  skinHasColoredTicks,
  skinHasStateText,
  skinToStyle,
} from '../skins/index';
import type { HvacAction, SetpointKind } from '../types';
import { renderRing } from './dial-arc';
import {
  DialInteractionController,
  type InteractionHost,
  isDual,
  type Setpoints,
} from './dial-interaction';
import { renderTicks, type TickConfig, type TickRange } from './dial-ticks';
import { dialStyles } from './styles';
import {
  clamp,
  offsetDegrees,
  pointsToPath,
  rotatePoint,
  rotatePoints,
  temperatureToTick,
} from './svg-utils';
import { formatTemperature } from './temperature-format';

/**
 * Minimum touch target for the chevrons, in CSS pixels.
 *
 * The dial is drawn in an SVG viewBox and scaled to the card width, so on a
 * narrow card the chevrons shrink below a finger-sized target. The hit box is
 * grown to compensate (see `_chevronTapSize`).
 */
const MIN_TOUCH_TARGET_PX = 44;

/**
 * How far the pointer must travel (in CSS pixels) before a gesture on the ring
 * counts as a drag. Keeps a plain tap on the ring from moving the
 * temperature.
 */
const DRAG_THRESHOLD_PX = 6;

/**
 * The color that stands for each HVAC state.
 *
 * Orange for heating, blue for cooling, yellow for drying — the palette the
 * card has always used. It shows up on the disc, on the active arc, and on the
 * center temperature, depending on the theme.
 */
const STATE_COLORS: Record<string, string> = {
  heating: '#e36304',
  cooling: '#007af1',
  drying: '#a68b00',
};

/** Where a temperature is drawn: the center, the dual-mode center pair, or the ring. */
type TemperatureTextSize = 'large' | 'small' | 'ring';

/** Font size and baseline drop of the decimal digit, in viewBox units, per text size. */
const DECIMAL_TYPOGRAPHY: Record<TemperatureTextSize, { fontSize: number; dy: number }> = {
  large: { fontSize: 40, dy: 30 },
  small: { fontSize: 22, dy: 16 },
  ring: { fontSize: 12, dy: 5 },
};

@customElement('thermostat-dial')
export class ThermostatDial extends LitElement implements InteractionHost {
  // --- Properties from climate entity (HA-aligned names) ---
  /**
   * The current temperature, or `null` when the thermostat does not report one.
   *
   * `null` is not an edge case to paper over: a climate entity that is
   * unavailable, or one whose temperature sensor never reported, has no
   * current temperature at all. The dial warns instead of guessing a number.
   */
  @property({ type: Number }) current_temperature: number | null = null;
  @property({ type: Number }) temperature: number | null = null;
  @property({ type: Number }) target_temp_low: number | null = null;
  @property({ type: Number }) target_temp_high: number | null = null;
  @property({ type: Number }) min_temp = 7;
  @property({ type: Number }) max_temp = 35;
  @property({ type: Number }) target_temp_step = 1;
  @property({ type: String }) hvac_action: HvacAction | null = null;
  @property({ type: String }) hvac_mode: string | null = null;
  @property({ type: String }) preset_mode: string | null = null;

  // --- Card config options ---
  @property({ type: Number }) diameter = 400;
  @property({ type: Number }) num_ticks = 150;
  @property({ type: Number }) tick_degrees = 300;
  /** Seconds without interaction before the dial leaves edit mode. */
  @property({ type: Number }) edit_timeout = 3;
  @property({ type: Number }) idle_zone = 0;
  @property({ type: Boolean }) show_ticks = true;
  @property({ type: Boolean }) show_power_toggle = true;
  @property({ type: Boolean }) show_preset_indicator = true;
  @property({ type: Boolean }) readonly = false;
  /**
   * Whether the setpoint can be changed at all.
   *
   * A device that has no setpoint has nothing to change, and one that is not
   * reporting has nothing to send a change to. The power button keeps
   * working either way.
   */
  @property({ type: Boolean }) setpoint_readonly = false;
  /**
   * The skin the dial draws itself with.
   *
   * Not to be confused with a Home Assistant theme, which belongs to the
   * dashboard. `auto` follows the Home Assistant theme; the other skins are
   * fixed and look the same on every dashboard.
   */
  @property({ type: String, reflect: true }) skin: string = 'auto';
  /**
   * Whether Home Assistant is currently in dark mode.
   *
   * Left undefined, the dial falls back to the OS preference, which is what
   * the standalone demo needs. The card always passes the value from
   * `hass.themes.darkMode` — that is the only source that knows about the
   * theme the user picked in their profile.
   */
  @property({ type: Boolean, attribute: false }) dark_mode?: boolean;
  @property({ type: Object }) colors?: {
    heating?: string;
    cooling?: string;
    idle?: string;
    off?: string;
    text?: string;
  };
  @property({ type: Object }) _presetIcons?: Record<string, string>;
  @property({ type: String }) status_text: string | null = null;

  // --- Internal state ---
  @state() editing = false;
  private _didPointerInteract = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragActivated = false;
  /** Rendered CSS pixels per viewBox unit — used to size touch targets. */
  private _scale = 1;
  private _resizeObserver?: ResizeObserver;

  private _interaction = new DialInteractionController(this);
  /** The setpoint kind the dial last drew, to notice when it changes. */
  private _drawnSetpointKind: SetpointKind = 'none';

  /**
   * The setpoints the dial draws: the user's while they are editing,
   * otherwise the entity's. The setpoint properties themselves always hold
   * what Home Assistant reports.
   */
  private get _setpoints(): Setpoints {
    return this._interaction.setpoints;
  }

  /** Whether the user is dragging on the ring, so is still choosing a setpoint. */
  get dragging(): boolean {
    return this._interaction.dragging;
  }

  get dual(): boolean {
    return isDual(this._setpoints);
  }

  /**
   * Which setpoint the dial is working with.
   *
   * A range is a range and a single target is a single target: Home
   * Assistant's `heat_cool` mode follows a range, every other mode follows a
   * single target. The two are not interchangeable — a range sent to a
   * device in `heat` is accepted and then ignored.
   */
  private get _setpointKind(): SetpointKind {
    if (this.target_temp_low !== null && this.target_temp_high !== null) return 'range';
    if (this.temperature !== null) return 'single';
    return 'none';
  }

  /**
   * End an edit in progress and show the entity's setpoints again.
   *
   * For the owner of the dial to call when a change it was sent did not
   * take, so the dial stops showing a value Home Assistant does not have.
   */
  cancelEditing(): void {
    this._interaction.exitEditMode();
  }

  /**
   * The changes the dial reported have reached Home Assistant, and it has
   * reported the entity since. Until the owner says so, the dial keeps
   * showing the user's setpoints after edit mode closes, so they do not flick
   * back to the old ones while the change is on its way.
   */
  changeSettled(): void {
    this._interaction.settle();
  }

  /**
   * Whether the dial has a current temperature to work with.
   *
   * Everything that positions itself on the temperature scale — the pointer,
   * the active arc, the label on the rim — needs one. Without it there is
   * nothing to place, so those parts are left out instead of being drawn at a
   * made-up position.
   */
  private get _hasAmbient(): boolean {
    return this.current_temperature !== null && Number.isFinite(this.current_temperature);
  }

  /**
   * The light/dark mode the dial renders in.
   *
   * `hass.themes.darkMode` is authoritative — it already accounts for the
   * theme the user selected in their profile and the theme's own light/dark
   * variants. The OS preference is only a fallback for the standalone demo
   * and for a frontend too old to report it.
   */
  private get _isDark(): boolean {
    if (this.dark_mode !== undefined) return this.dark_mode;
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /** The mode used to pick the variant of a skin that follows the HA mode. */
  private get _mode(): SkinMode {
    return this._isDark ? 'dark' : 'light';
  }

  private get _radius(): number {
    return this.diameter / 2;
  }

  private get _outerRadius(): number {
    return this.diameter / 30;
  }

  private get _innerRadius(): number {
    return this.diameter / 8;
  }

  private get _offsetDegrees(): number {
    return offsetDegrees(this.tick_degrees);
  }

  /**
   * Touch target size of the chevrons, in viewBox units.
   *
   * The hit box grows on small cards so the arrows stay finger-sized, but it
   * never grows past the point where the up/down (or dual-mode) arrows would
   * start to overlap each other.
   */
  private get _chevronTapSize(): number {
    const min = (this._radius / 3) * 1.2;
    const max = this._radius * 0.6;
    const desired = this._scale > 0 ? MIN_TOUCH_TARGET_PX / this._scale : min;
    return Math.min(Math.max(min, desired), max);
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._updateScale());
      this._resizeObserver.observe(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._didPointerInteract = false;
    this._dragActivated = false;
  }

  /** Recompute the rendered scale so touch targets track the card width. */
  private _updateScale(): void {
    const width = this.getBoundingClientRect().width;
    if (width <= 0) return;
    const scale = width / this.diameter;
    if (Math.abs(scale - this._scale) < 0.005) return;
    this._scale = scale;
    this.requestUpdate();
  }

  static styles = dialStyles;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._drawnSetpointKind = this._setpointKind;
      return;
    }
    // Another mode has its own setpoints: the same number means "heat to" in
    // one mode and "cool to" in the next, and `heat_cool` follows a range
    // instead of a single target. An edit made for the old mode no longer
    // applies — and there is nothing to edit when the device has no setpoint.
    if (
      changedProps.has('hvac_mode') ||
      this._setpointKind !== this._drawnSetpointKind ||
      this.setpoint_readonly
    ) {
      this._drawnSetpointKind = this._setpointKind;
      this._interaction.exitEditMode();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    // The viewBox size may have changed, which changes the rendered scale.
    if (changedProps.has('diameter')) {
      this._updateScale();
    }
    // Reflect editing state as attribute for CSS
    if (changedProps.has('editing')) {
      if (this.editing) {
        this.setAttribute('editing', '');
      } else {
        this.removeAttribute('editing');
      }
    }
    // Reflect off state as attribute for CSS
    if (changedProps.has('hvac_action')) {
      if (this.hvac_action === 'off') {
        this.setAttribute('off', '');
      } else {
        this.removeAttribute('off');
      }
    }
  }

  protected render(): TemplateResult {
    const r = this._radius;
    const colorStyle = this._getColorStyle();
    return html`
      <div class="dial-container">
        <svg
          viewBox="0 0 ${this.diameter} ${this.diameter}"
          class="dial"
          style=${colorStyle}
          @click=${this._handleDialClick}
          @contextmenu=${this._handleLongPress}
          @pointerdown=${this._handlePointerDown}
          @pointermove=${this._handlePointerMove}
          @pointerup=${this._handlePointerUp}
          @pointercancel=${this._handlePointerCancel}
        >
          ${this._renderDisc()}
          ${this.show_ticks ? this._renderTicks() : ''}
          ${renderRing(r)}
          ${this._renderRingLabels()}
          ${this._renderCenter()}
          ${this._renderIndicators()}
          ${this.editing && !this.setpoint_readonly ? this._renderControls() : ''}
        </svg>
      </div>
    `;
  }

  // --- Color/skin as inline CSS variables ---
  private _getColorStyle(): string {
    const vars: string[] = [];
    const skinName = this.skin || 'auto';
    const mode = this._mode;

    // Apply skin tokens. A skin that carries "modes" gets the variant for
    // the current mode; a fixed skin always uses the same tokens.
    const skinStyle = skinToStyle(skinName, mode);
    if (skinStyle) vars.push(skinStyle);

    // Manual color overrides take precedence over the skin
    if (this.colors) {
      if (this.colors.heating) vars.push(`--dial-heating-fill: ${this.colors.heating}`);
      if (this.colors.cooling) vars.push(`--dial-cooling-fill: ${this.colors.cooling}`);
      if (this.colors.idle) vars.push(`--dial-idle-fill: ${this.colors.idle}`);
      if (this.colors.off) vars.push(`--dial-off-fill: ${this.colors.off}`);
      if (this.colors.text) vars.push(`--dial-text-color: ${this.colors.text}`);
    }

    // Colored ticks: active tick color matches HVAC action
    // Enabled by skin setting (colored-ticks: "true" in the skin JSON)
    const action = this.editing ? this._predictAction() : (this.hvac_action ?? 'off');
    const stateColor = STATE_COLORS[action];

    if (skinHasColoredTicks(skinName, mode) && stateColor) {
      const [active, activeLarge] = this._activeTickColors(stateColor, skinName, mode);
      vars.push(`--dial-path-active-color: ${active}`);
      vars.push(`--dial-path-active-large-color: ${activeLarge}`);
    }

    // The center temperature carries the state color instead of the disc.
    // Enabled by skin setting (state-text: "true" in the skin JSON)
    if (skinHasStateText(skinName, mode) && stateColor) {
      vars.push(`--dial-center-text-color: ${stateColor}`);
    }

    return vars.join('; ');
  }

  /**
   * Tick colors for the active arc, derived from the HVAC state color.
   *
   * - A transparent disc has nothing behind it, so the raw state color is used.
   * - A skin that follows the HA mode is tuned for the dashboard it sits in:
   *   a darker tone on a light dashboard, a lighter one on a dark dashboard.
   * - A fixed skin keeps the look it was designed with.
   */
  private _activeTickColors(baseColor: string, skinName: string, mode: SkinMode): [string, string] {
    if (skinName === 'transparent' || skinName === 'glassy') {
      return [baseColor, baseColor];
    }

    const onLight = skinFollowsMode(skinName) ? mode === 'light' : skinName === 'light';
    return onLight
      ? [
          `color-mix(in srgb, ${baseColor} 60%, black)`,
          `color-mix(in srgb, ${baseColor} 50%, black)`,
        ]
      : [
          `color-mix(in srgb, ${baseColor} 55%, white)`,
          `color-mix(in srgb, ${baseColor} 40%, white)`,
        ];
  }

  // --- SVG Layer: Background disc ---
  private _renderDisc(): TemplateResult {
    const r = this._radius;
    let action: string = this.hvac_action ?? 'off';

    if (this.editing) {
      action = this._predictAction();
    }

    // In edit mode, use reduced opacity for heating/cooling predictions
    const opacity = this.editing && action !== 'idle' && action !== 'off' ? 0.5 : 1;
    return svg`
      <circle cx=${r} cy=${r} r=${r} class="dial-disc dial-disc--${action}" style="opacity: ${opacity}" />
    `;
  }

  /** Predict hvac action based on current target positions vs ambient */
  private _predictAction(): string {
    const { temperature, target_temp_low, target_temp_high } = this._setpoints;
    const mode = this.hvac_mode;

    // Without a current temperature there is nothing to compare the setpoint
    // against, so the dial keeps the state the entity reports instead of
    // guessing a direction.
    if (!this._hasAmbient) return this.hvac_action ?? 'off';

    // Only the modes that follow a setpoint can be predicted from it. In
    // `auto` the device follows a schedule of its own, and in `dry` and
    // `fan_only` it neither heats nor cools — what it does then is what the
    // entity reports, not what the setpoint suggests.
    if (mode !== 'heat' && mode !== 'cool' && mode !== 'heat_cool') {
      return this.hvac_action ?? 'off';
    }

    const ambient = this.current_temperature!;

    if (this.dual && target_temp_low !== null && target_temp_high !== null) {
      if (ambient < target_temp_low) return 'heating';
      if (ambient > target_temp_high) return 'cooling';
      return 'idle';
    } else if (temperature !== null) {
      if (temperature > ambient) {
        // Only predict heating if the device supports it
        if (mode === 'cool') return 'idle';
        return 'heating';
      }
      if (temperature < ambient) {
        // Only predict cooling if the device supports it
        if (mode === 'heat') return 'idle';
        return 'cooling';
      }
      return 'idle';
    }
    return 'off';
  }

  // --- SVG Layer: Tick marks ---
  private _renderTicks(): TemplateResult {
    const config: TickConfig = {
      numTicks: this.num_ticks,
      tickDegrees: this.tick_degrees,
      radius: this._radius,
      outerRadius: this._outerRadius,
      innerRadius: this._innerRadius,
      offsetDegrees: this._offsetDegrees,
    };

    const range = this._computeTickRange();
    return renderTicks(config, range);
  }

  // --- SVG Layer: Ring labels + pointer tick ---
  // Non-edit: center shows ambient → rim shows target with pointer
  // Edit: center shows target → rim shows ambient with pointer
  private _renderRingLabels(): TemplateResult {
    const { temperature, target_temp_low, target_temp_high } = this._setpoints;
    const r = this._radius;
    const midRadius = this._outerRadius + (this._innerRadius - this._outerRadius) / 2;

    const positionLabel = (temp: number, offset: number = 0): { x: number; y: number } => {
      const peggedTemp = clamp(temp, this.min_temp, this.max_temp);
      const angle =
        (this.tick_degrees * (peggedTemp - this.min_temp)) / (this.max_temp - this.min_temp) -
        this._offsetDegrees +
        offset;
      const point: [number, number] = [r, midRadius];
      const pos = rotatePoint(point, angle, [r, r]);
      return { x: pos[0], y: pos[1] };
    };

    // Render a pointer tick: thicker, extends further inward
    const renderPointer = (temp: number): TemplateResult => {
      const peggedTemp = clamp(temp, this.min_temp, this.max_temp);
      // Snap to tick grid so there's no shift between large tick and pointer on mode change
      const tickIdx = temperatureToTick(peggedTemp, this.min_temp, this.max_temp, this.num_ticks);
      const theta = this.tick_degrees / this.num_ticks;
      const angle = tickIdx * theta - this._offsetDegrees;

      // Pointer extends from outer radius inward (~1.5x the large tick length)
      const pointerOuter = this._outerRadius;
      const normalTickLen = this._innerRadius - this._outerRadius;
      const pointerInner = this._innerRadius + Math.round(normalTickLen * 0.6);

      // Main thick line
      const linePoints: [number, number][] = [
        [r - r * 0.0125, pointerOuter],
        [r + r * 0.0125, pointerOuter],
        [r + r * 0.0125, pointerInner],
        [r - r * 0.0125, pointerInner],
      ];

      const origin: [number, number] = [r, r];
      const rotatedLine = rotatePoints(linePoints, angle, origin);

      const linePath = pointsToPath(rotatedLine);

      return svg`
        <path d=${linePath} class="dial-pointer" />
      `;
    };

    const labels: TemplateResult[] = [];

    if (this.editing) {
      // Edit mode: center shows targets → rim shows ambient with pointers at targets
      if (this.dual && target_temp_low !== null && target_temp_high !== null) {
        // Dual edit: pointers at both targets, ambient label offset away from active arc
        let ambientOffset: number;
        if (!this._hasAmbient) {
          // Nothing to place — the ambient label is left out entirely.
          ambientOffset = 0;
        } else if (this.current_temperature! < target_temp_low) {
          // Would heat: arc is CW of ambient → push label CCW
          ambientOffset = -8;
        } else if (this.current_temperature! > target_temp_high) {
          // Would cool: arc is CCW of ambient → push label CW
          ambientOffset = 8;
        } else {
          // Idle: default right
          ambientOffset = 8;
        }
        const ambientPos = this._hasAmbient
          ? positionLabel(this.current_temperature!, ambientOffset)
          : null;
        // Without an ambient there is nothing to put on the rim but the
        // setpoints themselves — which is what the chevrons are changing.
        const lowPos = positionLabel(target_temp_low, -8);
        const highPos = positionLabel(target_temp_high, 8);
        labels.push(svg`
          ${renderPointer(target_temp_low)}
          ${renderPointer(target_temp_high)}
          ${
            ambientPos
              ? svg`<text x=${ambientPos.x} y=${ambientPos.y} class="dial-text dial-ring-label">${this._renderTemperature(this.current_temperature!, 'ring')}</text>`
              : ''
          }
          ${
            ambientPos
              ? ''
              : svg`<text x=${lowPos.x} y=${lowPos.y} class="dial-text dial-ring-label">${this._renderTemperature(target_temp_low, 'ring')}</text>
                  <text x=${highPos.x} y=${highPos.y} class="dial-text dial-ring-label">${this._renderTemperature(target_temp_high, 'ring')}</text>`
          }
        `);
      } else if (temperature !== null) {
        const ambientOffset = this._hasAmbient && this.current_temperature! <= temperature ? -8 : 8;
        const pos = this._hasAmbient
          ? positionLabel(this.current_temperature!, ambientOffset)
          : null;
        const targetPos = positionLabel(temperature, 8);
        labels.push(svg`
          ${renderPointer(temperature)}
          ${
            pos
              ? svg`<text x=${pos.x} y=${pos.y} class="dial-text dial-ring-label">${this._renderTemperature(this.current_temperature!, 'ring')}</text>`
              : ''
          }
          ${
            pos
              ? ''
              : svg`<text x=${targetPos.x} y=${targetPos.y} class="dial-text dial-ring-label">${this._renderTemperature(temperature, 'ring')}</text>`
          }
        `);
      }
    } else {
      // Idle mode: center has ambient → rim shows targets with pointer at ambient
      if (this.dual && target_temp_low !== null && target_temp_high !== null) {
        // Dual mode: offset labels away from the active arc
        let lowOffset: number;
        let highOffset: number;

        if (this.hvac_action === 'heating') {
          // Active arc is between ambient and low — push low away from arc (toward high)
          lowOffset = 8;
          highOffset = 8;
        } else if (this.hvac_action === 'cooling') {
          // Active arc is between high and ambient — push high away from arc (toward low)
          lowOffset = -8;
          highOffset = -8;
        } else {
          // Idle: labels outside the low-to-high interval
          lowOffset = -8;
          highOffset = 8;
        }

        const lowPos = positionLabel(target_temp_low, lowOffset);
        const highPos = positionLabel(target_temp_high, highOffset);
        labels.push(svg`
          ${this._hasAmbient ? renderPointer(this.current_temperature!) : ''}
          <text x=${lowPos.x} y=${lowPos.y} class="dial-text dial-ring-label">${this._renderTemperature(target_temp_low, 'ring')}</text>
          <text x=${highPos.x} y=${highPos.y} class="dial-text dial-ring-label">${this._renderTemperature(target_temp_high, 'ring')}</text>
        `);
      } else if (temperature !== null) {
        // Single target: offset away from ambient (outside the interval).
        // Without an ambient there is nothing to offset from, but the label
        // still moves off the target's own tick — otherwise it is drawn on
        // top of it and the two read as one smudge.
        const targetOffset = this._hasAmbient
          ? temperature >= this.current_temperature!
            ? 8
            : -8
          : 8;
        const pos = positionLabel(temperature, targetOffset);
        labels.push(svg`
          ${this._hasAmbient ? renderPointer(this.current_temperature!) : ''}
          <text x=${pos.x} y=${pos.y} class="dial-text dial-ring-label">${this._renderTemperature(temperature, 'ring')}</text>
        `);
      }
    }

    return svg`<g class="dial-ring-labels">${labels}</g>`;
  }

  /**
   * Render a temperature as text, with the decimal (if any) set smaller and
   * lowered the way `size` asks for.
   */
  private _renderTemperature(value: number, size: TemperatureTextSize): TemplateResult {
    // A value that is not a real number has no text — the caller is expected
    // to have left that part of the dial out.
    if (!Number.isFinite(value)) return svg``;
    const { whole, fraction } = formatTemperature(value, this.target_temp_step);
    if (fraction === undefined) return svg`${whole}`;
    const decimal = DECIMAL_TYPOGRAPHY[size];
    return svg`${whole}<tspan font-size=${decimal.fontSize} dy=${decimal.dy}>.${fraction}</tspan>`;
  }

  // --- SVG Layer: Center temperature display ---
  /**
   * The middle of the dial.
   *
   * With a current temperature it shows the ambient, and the setpoint takes
   * over while editing. Without one — the thermostat reports no temperature
   * at all — the middle carries the warning sign instead, until the user
   * starts editing: the sign stands for the reading that is missing, while
   * the setpoint is the value the chevrons change, so it takes the middle for
   * as long as the edit lasts. The sign comes back when the edit ends.
   */
  private _renderCenter(): TemplateResult {
    const { temperature, target_temp_low, target_temp_high } = this._setpoints;
    const r = this._radius;

    // The warning sign stands in for the current temperature, which the
    // entity does not report. It belongs to the middle only while the dial is
    // not editing: in edit mode the middle shows the setpoint the chevrons
    // change, and the sign is not the value being adjusted.
    const warning = this._hasAmbient || this.editing ? '' : this._renderWarning(r);

    if (this.dual && this.editing) {
      return svg`
        <g class="dial-center">
          ${
            this._hasAmbient
              ? svg`
          <text x=${r} y=${r} class="dial-text dial-text--ambient">
            ${this._renderTemperature(this.current_temperature!, 'large')}
          </text>
        `
              : ''
          }
          <text x=${r - r / 3} y=${r} class="dial-text dial-text--low">
            ${this._renderTemperature(target_temp_low!, 'small')}
          </text>
          <text x=${r + r / 3} y=${r} class="dial-text dial-text--high">
            ${this._renderTemperature(target_temp_high!, 'small')}
          </text>
        </g>
      `;
    }

    return svg`
      <g class="dial-center">
        ${
          this.status_text && !this.editing
            ? svg`
          <text x=${r} y=${r - r * 0.35} class="dial-text dial-text--status">${this.status_text.length > 16 ? `${this.status_text.substring(0, 14)}…` : this.status_text}</text>
        `
            : ''
        }
        ${
          this._hasAmbient
            ? svg`
          <text x=${r} y=${r} class="dial-text dial-text--ambient">
            ${this._renderTemperature(this.current_temperature!, 'large')}
          </text>
        `
            : warning
        }
        ${
          temperature !== null
            ? svg`
          <text x=${r} y=${r} class="dial-text dial-text--target">
            ${this._renderTemperature(temperature, 'large')}
          </text>
        `
            : ''
        }
      </g>
    `;
  }

  /**
   * The warning sign shown in place of the current temperature.
   *
   * Drawn from plain SVG shapes rather than an icon font: the dial is an SVG,
   * and a triangle with an exclamation mark reads as "this value is missing"
   * on every skin without depending on an icon font being loaded.
   *
   * The triangle is filled with the warning color and outlined in the text
   * color, with the exclamation mark in the text color as well. The disc
   * behind it is the HVAC color — orange when heating, blue when cooling —
   * and a warning red on either of those is close to invisible. The outline
   * carries the shape, so the sign stays readable in every state, with the
   * same contrast the temperature number it replaces had.
   */
  private _renderWarning(r: number): TemplateResult {
    const label = localize('warning_no_temperature');
    // Sized to fill the slot the temperature number would occupy.
    const size = r * 0.56;
    const halfW = size * 0.46;
    const halfH = size / 2;
    const stroke = size * 0.09;

    // The exclamation mark is centred on the triangle's centroid — the average
    // of its three corners, which for a triangle with the apex up sits below
    // the middle of the shape. Centring on the middle of the sign instead
    // leaves the mark floating towards the apex.
    const centroid = r + halfH / 3;
    const barHeight = size * 0.18;
    const gap = size * 0.07;
    const dotRadius = stroke * 0.55;
    const glyphHeight = barHeight + gap + dotRadius * 2;
    const barTop = centroid - glyphHeight / 2;
    const barBottom = barTop + barHeight;
    const dotY = barBottom + gap + dotRadius;

    return svg`
      <g class="dial-warning" role="img" aria-label=${label}>
        <title>${label}</title>
        <path
          class="dial-warning__triangle"
          d="M${r},${r - halfH} L${r + halfW},${r + halfH} L${r - halfW},${r + halfH} Z"
          stroke-width=${stroke * 0.7}
        />
        <line
          class="dial-warning__mark"
          x1=${r}
          y1=${barTop}
          x2=${r}
          y2=${barBottom}
          stroke-width=${stroke}
        />
        <circle class="dial-warning__dot" cx=${r} cy=${dotY} r=${dotRadius} />
      </g>
    `;
  }

  // --- SVG Layer: Indicators (leaf, power/thermo) ---
  private _renderIndicators(): TemplateResult {
    const r = this._radius;

    // Preset indicator — positioned between center text and power button
    const presetIcon = this._getPresetIcon();
    const showPreset =
      !this.editing &&
      this.show_preset_indicator &&
      this.preset_mode !== null &&
      this.preset_mode !== 'none' &&
      presetIcon !== null;

    const presetClass = `dial-preset${showPreset ? ' dial-preset--visible' : ''}`;
    const presetScale = r / 5 / 24; // scale MDI 24x24 icons
    const presetWidth = 24 * presetScale;
    const presetX = r - presetWidth / 2;
    const presetY = r + r * 0.32; // below center text, above power

    // Power icon — positioned on the outer ring area (bottom center)
    const powerScale = r / 87;
    const powerWidth = 24 * powerScale;
    const powerX = r - powerWidth / 2;
    const powerY = this.diameter - powerWidth - r * 0.05;
    const powerPath =
      'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13';

    // Thermometer outline icon (shown in edit mode instead of power)
    const thermoScale = r / 87;
    const thermoWidth = 24 * thermoScale;
    const thermoX = r - thermoWidth / 2;
    const thermoY = this.diameter - thermoWidth - r * 0.05;
    const thermoPath =
      'M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z';

    return svg`
      <g>
        ${
          presetIcon !== null
            ? svg`
          <path
            d=${presetIcon}
            class=${presetClass}
            transform="translate(${presetX}, ${presetY}) scale(${presetScale})"
          />
        `
            : ''
        }
        ${
          this.show_power_toggle
            ? svg`
            <g class="dial-power ${this.editing ? 'dial-power--hidden' : ''}" @click=${this._handlePowerClick}>
              <rect
                x=${powerX}
                y=${powerY}
                width=${powerWidth}
                height=${powerWidth}
                fill="transparent"
              />
              <path
                d=${powerPath}
                transform="translate(${powerX}, ${powerY}) scale(${powerScale})"
              />
            </g>
            <path
              d=${thermoPath}
              class="dial-thermo ${this.editing ? 'dial-thermo--visible' : ''}"
              transform="translate(${thermoX}, ${thermoY}) scale(${thermoScale})"
            />
          `
            : ''
        }
      </g>
    `;
  }

  /** Get the SVG path for the current preset mode icon */
  private _getPresetIcon(): string | null {
    if (!this.preset_mode || this.preset_mode === 'none') return null;

    // MDI icon paths (24x24 viewbox)
    const icons: Record<string, string> = {
      // Leaf — eco, away
      eco: 'M17,8C8,10,5.9,16.17,3.82,21.34L5.71,22L6.66,19.7C7.14,19.87,7.64,20,8,20C19,20,22,3,22,3C21,5,14,5.25,9,6.25C4,7.25,2,11.5,2,13.5C2,15.5,3.75,17.25,3.75,17.25C7,8,17,8,17,8Z',
      away: 'M17,8C8,10,5.9,16.17,3.82,21.34L5.71,22L6.66,19.7C7.14,19.87,7.64,20,8,20C19,20,22,3,22,3C21,5,14,5.25,9,6.25C4,7.25,2,11.5,2,13.5C2,15.5,3.75,17.25,3.75,17.25C7,8,17,8,17,8Z',
      // Home
      home: 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
      // Moon — sleep
      sleep:
        'M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87,20.69,17.05,20.16,17.8C19.84,18.25,19.5,18.67,19.08,19.07C15.17,23,8.84,23,4.94,19.07C1.03,15.17,1.03,8.83,4.94,4.93C5.34,4.53,5.76,4.17,6.21,3.85C6.96,3.32,8.14,4.21,8.06,5.04C7.79,7.9,8.75,10.87,10.95,13.06C13.14,15.26,16.1,16.22,18.97,15.95Z',
      // Fire — boost
      boost:
        'M17.66,11.2C17.43,10.9,17.15,10.64,16.89,10.38C16.22,9.78,15.46,9.35,14.82,8.72C13.33,7.26,13,4.85,13.95,3C13,3.23,12.17,3.75,11.46,4.32C8.87,6.4,7.85,10.07,9.07,13.22C9.11,13.32,9.15,13.42,9.15,13.55C9.15,13.77,9,13.97,8.8,14.05C8.57,14.15,8.33,14.09,8.14,13.93C8.08,13.88,8.04,13.83,8,13.76C6.87,12.33,6.69,10.28,7.45,8.64C5.78,10,4.87,12.3,5,14.47C5.06,14.97,5.12,15.47,5.29,15.97C5.43,16.57,5.7,17.17,6,17.7C7.08,19.43,8.95,20.67,10.96,20.92C13.1,21.19,15.39,20.8,16.89,19.32C18.55,17.68,19.15,15.15,18.43,12.97L18.3,12.66C18.1,12.16,17.83,11.68,17.66,11.2Z',
      // Sun — comfort
      comfort:
        'M12,7A5,5,0,1,0,17,12,5,5,0,0,0,12,7ZM12,2L14.39,5.42C13.65,5.15,12.84,5,12,5S10.36,5.15,9.61,5.42ZM3.34,7L7.5,6.65A6.86,6.86,0,0,0,5.42,9.61ZM3.34,17L5.42,14.39A6.86,6.86,0,0,0,7.5,17.35ZM12,22L9.61,18.58C10.36,18.85,11.16,19,12,19S13.65,18.85,14.39,18.58ZM20.66,17L16.5,17.35A6.86,6.86,0,0,0,18.58,14.39ZM20.66,7L18.58,9.61A6.86,6.86,0,0,0,16.5,6.65Z',
      // Person — activity
      activity:
        'M12,4A4,4,0,1,1,8,8,4,4,0,0,1,12,4ZM12,14C7.58,14,4,15.79,4,18V20H20V18C20,15.79,16.42,14,12,14Z',
    };

    // Check config-based preset_icons mapping first
    if (this._presetIcons?.[this.preset_mode]) {
      const mappedIcon = this._presetIcons[this.preset_mode];
      return icons[mappedIcon] ?? null;
    }

    return icons[this.preset_mode] ?? null;
  }

  // --- SVG Layer: Edit controls (chevrons) ---
  private _renderControls(): TemplateResult {
    const r = this._radius;
    const chevronWidth = r / 3;
    const offset = r / 3; // distance from center

    if (this.dual) {
      return svg`
        <g class="dial-controls">
          ${this._renderChevron(r - r / 3, r - offset, 0, chevronWidth * 0.7, 'low-up')}
          ${this._renderChevron(r - r / 3, r + offset, 180, chevronWidth * 0.7, 'low-down')}
          ${this._renderChevron(r + r / 3, r - offset, 0, chevronWidth * 0.7, 'high-up')}
          ${this._renderChevron(r + r / 3, r + offset, 180, chevronWidth * 0.7, 'high-down')}
        </g>
      `;
    }

    return svg`
      <g class="dial-controls">
        ${this._renderChevron(r, r - offset, 0, chevronWidth, 'target-up')}
        ${this._renderChevron(r, r + offset, 180, chevronWidth, 'target-down')}
      </g>
    `;
  }

  private _renderChevron(
    cx: number,
    cy: number,
    rotation: number,
    width: number,
    id: string,
  ): TemplateResult {
    const halfW = width / 2;
    const height = width * 0.3;
    const d = `M${-halfW},0 L0,${-height} L${halfW},0`;
    const tapSize = this._chevronTapSize;
    return svg`
      <g
        class="dial-chevron"
        data-id=${id}
        transform="translate(${cx}, ${cy}) rotate(${rotation})"
        @click=${this._handleChevronClick}
      >
        <rect
          x=${-tapSize / 2}
          y=${-tapSize / 2}
          width=${tapSize}
          height=${tapSize}
          fill="transparent"
        />
        <path d=${d} />
      </g>
    `;
  }

  // --- Event handlers ---
  private _handleDialClick(e: MouseEvent): void {
    if (this.readonly) return;
    // Nothing to change: the device has no setpoint, or it is not reporting.
    if (this.setpoint_readonly) return;
    // Don't fire if we already handled via pointer events
    if (this._didPointerInteract) {
      this._didPointerInteract = false;
      return;
    }
    const target = e.target as SVGElement;
    if (target.closest('.dial-power') || target.closest('.dial-chevron')) return;
    if (!this.editing) {
      this._interaction.enterEditMode();
    }
  }

  private _handleLongPress(e: Event): void {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('more-info', { bubbles: true, composed: true }));
  }

  private _handleChevronClick(e: MouseEvent): void {
    e.stopPropagation();
    if (this.readonly) return;
    if (this.setpoint_readonly) return;
    const target = e.currentTarget as SVGElement;
    const id = target.dataset.id;
    if (!id) return;

    switch (id) {
      case 'target-up':
        this._interaction.adjustTarget(1);
        break;
      case 'target-down':
        this._interaction.adjustTarget(-1);
        break;
      case 'low-up':
        this._interaction.adjustLow(1);
        break;
      case 'low-down':
        this._interaction.adjustLow(-1);
        break;
      case 'high-up':
        this._interaction.adjustHigh(1);
        break;
      case 'high-down':
        this._interaction.adjustHigh(-1);
        break;
    }
  }

  private _handlePowerClick(e: MouseEvent): void {
    if (this.readonly) return;
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, composed: true }));
  }

  // --- Ring drag/tap interaction ---
  private _handlePointerDown(e: PointerEvent): void {
    if (this.readonly) return;
    if (this.setpoint_readonly) return;
    if (!this.editing) return;

    // A gesture that starts on a control must not be treated as a ring
    // interaction. The chevron hit box overlaps the ring area, so without this
    // guard an arrow tap also jumps the temperature to the tapped angle.
    const target = e.target as SVGElement;
    if (target.closest('.dial-power') || target.closest('.dial-chevron')) return;

    // The gesture has to start on the ring itself.
    if (this._pointerToTemperature(e) === null) return;

    this._didPointerInteract = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragActivated = false;
    this._interaction.beginDrag();
    target.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!this._interaction.dragging) return;

    // Only a real drag changes the temperature — a tap on the ring does not.
    if (!this._dragActivated) {
      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      this._dragActivated = true;
    }

    const temp = this._pointerToTemperature(e);
    if (temp === null) return;
    this._interaction.dragTo(temp);
    e.preventDefault();
  }

  private _handlePointerUp(e: PointerEvent): void {
    if (!this._interaction.dragging) return;
    this._releasePointer(e);
    this._interaction.endDrag();
  }

  private _handlePointerCancel(e: PointerEvent): void {
    if (!this._interaction.dragging) return;
    this._releasePointer(e);
    this._interaction.cancelDrag();
    // A cancelled gesture is not followed by a click event, so clear the
    // flag here — otherwise the next tap on the dial would be swallowed.
    this._didPointerInteract = false;
  }

  private _releasePointer(e: PointerEvent): void {
    this._dragActivated = false;
    (e.target as SVGElement).releasePointerCapture(e.pointerId);
  }

  private _pointerToTemperature(e: PointerEvent): number | null {
    const svgEl = this.shadowRoot?.querySelector('svg');
    if (!svgEl) return null;

    const rect = svgEl.getBoundingClientRect();
    const r = this._radius;

    // Convert screen coordinates to SVG viewBox coordinates (centered at 0,0)
    const scaleX = this.diameter / rect.width;
    const scaleY = this.diameter / rect.height;
    const x = (e.clientX - rect.left) * scaleX - r;
    const y = (e.clientY - rect.top) * scaleY - r;

    // Check if pointer is in the ring area (outer 50% of radius)
    const dist = Math.sqrt(x * x + y * y);
    if (dist < r * 0.5) return null; // too close to center, ignore

    // Convert to angle: 0° at top, clockwise positive
    let angle = Math.atan2(-x, y) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // The tick arc spans tick_degrees, centered at the bottom
    // Gap is at the bottom: from (360 - gap/2) wrapping around to (gap/2)
    const gap = 360 - this.tick_degrees;
    const startAngle = gap / 2; // where min_temp starts (bottom-left)

    // Check if angle is in the gap (bottom center)
    if (angle > 360 - gap / 2 || angle < gap / 2) return null;

    // Normalize: subtract startAngle to get 0..tick_degrees
    const normalized = angle - startAngle;
    const fraction = normalized / this.tick_degrees;

    const temp = this.min_temp + fraction * (this.max_temp - this.min_temp);

    // Snap to step
    const stepped = Math.round(temp / this.target_temp_step) * this.target_temp_step;
    return clamp(stepped, this.min_temp, this.max_temp);
  }

  // --- Tick range computation ---
  private _computeTickRange(): TickRange {
    const { temperature, target_temp_low, target_temp_high } = this._setpoints;
    // Without a current temperature there is no ambient position on the scale,
    // so there is no arc to draw either — the arc spans ambient → target.
    const ambientIdx = this._hasAmbient
      ? clamp(
          temperatureToTick(
            this.current_temperature!,
            this.min_temp,
            this.max_temp,
            this.num_ticks,
          ),
          0,
          this.num_ticks - 1,
        )
      : undefined;

    let from: number | undefined;
    let to: number | undefined;
    // Large ticks for the rim label temperatures (the "other" values not in center)
    const largeIndices: number[] = [];

    if (this.dual && target_temp_low !== null && target_temp_high !== null) {
      const lowIdx = clamp(
        temperatureToTick(target_temp_low, this.min_temp, this.max_temp, this.num_ticks),
        0,
        this.num_ticks - 1,
      );
      const highIdx = clamp(
        temperatureToTick(target_temp_high, this.min_temp, this.max_temp, this.num_ticks),
        0,
        this.num_ticks - 1,
      );

      // Rim shows targets (idle) or ambient + targets (editing)
      if (this.editing) {
        if (ambientIdx !== undefined) largeIndices.push(ambientIdx);
        largeIndices.push(lowIdx, highIdx);
      } else {
        largeIndices.push(lowIdx, highIdx);
      }

      // Predictive arc: based on position, not just hvac_action
      // This gives instant feedback during editing
      if (ambientIdx !== undefined) {
        if (lowIdx > ambientIdx) {
          // Ambient is below low target → would heat
          from = ambientIdx;
          to = lowIdx;
        } else if (highIdx < ambientIdx) {
          // Ambient is above high target → would cool
          from = highIdx;
          to = ambientIdx;
        }
      }
    } else if (temperature !== null) {
      const targetIdx = clamp(
        temperatureToTick(temperature, this.min_temp, this.max_temp, this.num_ticks),
        0,
        this.num_ticks - 1,
      );

      // Rim shows target (idle) or ambient (editing)
      if (this.editing) {
        if (ambientIdx !== undefined) largeIndices.push(ambientIdx);
      } else {
        largeIndices.push(targetIdx);
      }

      // Predictive arc: based on position
      if (ambientIdx !== undefined) {
        if (targetIdx > ambientIdx) {
          // Target above ambient → would heat
          from = ambientIdx;
          to = targetIdx;
        } else if (targetIdx < ambientIdx) {
          // Target below ambient → would cool
          from = targetIdx;
          to = ambientIdx;
        }
      }
    }

    return { from, to, largeIndices, predicted: this.editing };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thermostat-dial': ThermostatDial;
  }
}
