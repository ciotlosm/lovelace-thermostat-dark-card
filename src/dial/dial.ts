import { LitElement, html, svg, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HvacAction } from '../types';
import { temperatureToTick, offsetDegrees, clamp, rotatePoint, rotatePoints, pointsToPath } from './svg-utils';
import { renderTicks, TickConfig, TickRange } from './dial-ticks';
import { themeToStyle, themeHasColoredTicks } from '../themes/index';
import { renderRing } from './dial-arc';
import { DialInteractionController, InteractionHost } from './dial-interaction';
import { dialStyles } from './styles';

@customElement('thermostat-dial')
export class ThermostatDial extends LitElement implements InteractionHost {
  // --- Properties from climate entity (HA-aligned names) ---
  @property({ type: Number }) current_temperature = 0;
  @property({ type: Number }) temperature: number | null = null;
  @property({ type: Number }) target_temp_low: number | null = null;
  @property({ type: Number }) target_temp_high: number | null = null;
  @property({ type: Number }) min_temp = 7;
  @property({ type: Number }) max_temp = 35;
  @property({ type: Number }) target_temp_step = 0.5;
  @property({ type: String }) hvac_action: HvacAction | null = null;
  @property({ type: String }) hvac_mode: string | null = null;
  @property({ type: String }) preset_mode: string | null = null;

  // --- Card config options ---
  @property({ type: Number }) diameter = 400;
  @property({ type: Number }) num_ticks = 150;
  @property({ type: Number }) tick_degrees = 300;
  @property({ type: Number }) pending = 3;
  @property({ type: Number }) idle_zone = 2;
  @property({ type: Boolean }) show_ticks = true;
  @property({ type: Boolean }) show_power_toggle = true;
  @property({ type: Boolean }) show_preset_indicator = true;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String, reflect: true }) theme: string = 'dark';
  @property({ type: Object }) colors?: { heating?: string; cooling?: string; idle?: string; off?: string };
  @property({ type: Object }) _presetIcons?: Record<string, string>;
  @property({ type: String }) status_text: string | null = null;

  // --- Internal state ---
  @state() editing = false;
  private _dragging = false;
  private _didPointerInteract = false;
  private _longPressTimer?: number;

  private _interaction = new DialInteractionController(this);

  get dual(): boolean {
    return this.target_temp_low !== null && this.target_temp_high !== null;
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

  static styles = dialStyles;

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
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
          @pointercancel=${this._handlePointerUp}
        >
          ${this._renderDisc()}
          ${this.show_ticks ? this._renderTicks() : ''}
          ${renderRing(r)}
          ${this._renderRingLabels()}
          ${this._renderCenter()}
          ${this._renderIndicators()}
          ${this.editing ? this._renderControls() : ''}
        </svg>
      </div>
    `;
  }

  // --- Color/theme as inline CSS variables ---
  private _getColorStyle(): string {
    const vars: string[] = [];

    // Apply theme tokens (if not 'dark' which is the CSS default)
    if (this.theme && this.theme !== 'dark') {
      const themeStyle = themeToStyle(this.theme);
      if (themeStyle) vars.push(themeStyle);
    }

    // Manual color overrides take precedence over theme
    if (this.colors) {
      if (this.colors.heating) vars.push(`--dial-heating-fill: ${this.colors.heating}`);
      if (this.colors.cooling) vars.push(`--dial-cooling-fill: ${this.colors.cooling}`);
      if (this.colors.idle) vars.push(`--dial-idle-fill: ${this.colors.idle}`);
      if (this.colors.off) vars.push(`--dial-off-fill: ${this.colors.off}`);
    }

    // Colored ticks: active tick color matches HVAC action
    // Enabled by theme setting (colored-ticks: "true" in theme JSON)
    if (themeHasColoredTicks(this.theme)) {
      const action = this.editing ? this._predictAction() : (this.hvac_action ?? 'off');
      const isLight = this.theme === 'light';
      const isTransparent = this.theme === 'transparent' || this.theme === 'glassy';

      // Base colors per action
      const baseColors: Record<string, string> = {
        heating: '#e36304',
        cooling: '#007af1',
        drying: '#a68b00',
      };

      const baseColor = baseColors[action];
      if (baseColor) {
        if (isTransparent) {
          // Raw color on transparent backgrounds
          vars.push(`--dial-path-active-color: ${baseColor}`);
          vars.push(`--dial-path-active-large-color: ${baseColor}`);
        } else if (isLight) {
          // Much darker variant for light disc
          vars.push(`--dial-path-active-color: color-mix(in srgb, ${baseColor} 60%, black)`);
          vars.push(`--dial-path-active-large-color: color-mix(in srgb, ${baseColor} 50%, black)`);
        } else {
          // Much lighter variant for dark disc
          vars.push(`--dial-path-active-color: color-mix(in srgb, ${baseColor} 55%, white)`);
          vars.push(`--dial-path-active-large-color: color-mix(in srgb, ${baseColor} 40%, white)`);
        }
      }
    }

    return vars.join('; ');
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
    const ambient = this.current_temperature;
    const mode = this.hvac_mode;

    if (this.dual && this.target_temp_low !== null && this.target_temp_high !== null) {
      if (ambient < this.target_temp_low) return 'heating';
      if (ambient > this.target_temp_high) return 'cooling';
      return 'idle';
    } else if (this.temperature !== null) {
      if (this.temperature > ambient) {
        // Only predict heating if the device supports it
        if (mode === 'cool') return 'idle';
        return 'heating';
      }
      if (this.temperature < ambient) {
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
      if (this.dual && this.target_temp_low !== null && this.target_temp_high !== null) {
        // Dual edit: pointers at both targets, ambient label offset away from active arc
        let ambientOffset: number;
        if (this.current_temperature < this.target_temp_low) {
          // Would heat: arc is CW of ambient → push label CCW
          ambientOffset = -8;
        } else if (this.current_temperature > this.target_temp_high) {
          // Would cool: arc is CCW of ambient → push label CW
          ambientOffset = 8;
        } else {
          // Idle: default right
          ambientOffset = 8;
        }
        const ambientPos = positionLabel(this.current_temperature, ambientOffset);
        labels.push(svg`
          ${renderPointer(this.target_temp_low)}
          ${renderPointer(this.target_temp_high)}
          <text x=${ambientPos.x} y=${ambientPos.y} class="dial-text dial-ring-label">${this._superscript(this.current_temperature)}</text>
        `);
      } else if (this.temperature !== null) {
        const ambientOffset = this.current_temperature <= this.temperature ? -8 : 8;
        const pos = positionLabel(this.current_temperature, ambientOffset);
        labels.push(svg`
          ${renderPointer(this.temperature)}
          <text x=${pos.x} y=${pos.y} class="dial-text dial-ring-label">${this._superscript(this.current_temperature)}</text>
        `);
      } else {
        const pos = positionLabel(this.current_temperature, -8);
        labels.push(svg`
          <text x=${pos.x} y=${pos.y} class="dial-text dial-ring-label">${this._superscript(this.current_temperature)}</text>
        `);
      }
    } else {
      // Idle mode: center has ambient → rim shows targets with pointer at ambient
      if (this.dual && this.target_temp_low !== null && this.target_temp_high !== null) {
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

        const lowPos = positionLabel(this.target_temp_low, lowOffset);
        const highPos = positionLabel(this.target_temp_high, highOffset);
        labels.push(svg`
          ${renderPointer(this.current_temperature)}
          <text x=${lowPos.x} y=${lowPos.y} class="dial-text dial-ring-label">${this._superscript(this.target_temp_low)}</text>
          <text x=${highPos.x} y=${highPos.y} class="dial-text dial-ring-label">${this._superscript(this.target_temp_high)}</text>
        `);
      } else if (this.temperature !== null) {
        // Single target: offset away from ambient (outside the interval)
        const targetOffset = this.temperature >= this.current_temperature ? 8 : -8;
        const pos = positionLabel(this.temperature, targetOffset);
        labels.push(svg`
          ${renderPointer(this.current_temperature)}
          <text x=${pos.x} y=${pos.y} class="dial-text dial-ring-label">${this._superscript(this.temperature)}</text>
        `);
      }
    }

    return svg`<g class="dial-ring-labels">${labels}</g>`;
  }

  private _superscript(value: number): TemplateResult {
    const rounded = Math.round(value * 10) / 10;
    const whole = Math.floor(rounded);
    const frac = Math.round((rounded - whole) * 10);
    if (this.target_temp_step < 1) {
      return svg`${whole}<tspan font-size="12" dy="5">.${frac}</tspan>`;
    }
    return svg`${whole}`;
  }

  // --- SVG Layer: Center temperature display ---
  private _renderCenter(): TemplateResult {
    const r = this._radius;

    if (this.dual && this.editing) {
      return svg`
        <g class="dial-center">
          <text x=${r} y=${r} class="dial-text dial-text--ambient">
            ${this._renderTempText(this.current_temperature)}
          </text>
          <text x=${r - r / 3} y=${r} class="dial-text dial-text--low">
            ${this._renderTempTextSmall(this.target_temp_low!)}
          </text>
          <text x=${r + r / 3} y=${r} class="dial-text dial-text--high">
            ${this._renderTempTextSmall(this.target_temp_high!)}
          </text>
        </g>
      `;
    }

    return svg`
      <g class="dial-center">
        ${this.status_text && !this.editing ? svg`
          <text x=${r} y=${r - r * 0.35} class="dial-text dial-text--status">${this.status_text.length > 16 ? this.status_text.substring(0, 14) + '…' : this.status_text}</text>
        ` : ''}
        <text x=${r} y=${r} class="dial-text dial-text--ambient">
          ${this._renderTempText(this.current_temperature)}
        </text>
        ${this.temperature !== null ? svg`
          <text x=${r} y=${r} class="dial-text dial-text--target">
            ${this._renderTempText(this.temperature)}
          </text>
        ` : ''}
      </g>
    `;
  }

  /** Render temperature with dot notation (e.g., "22.5" or "22.0" in celsius) */
  private _renderTempText(value: number): TemplateResult {
    const rounded = Math.round(value * 10) / 10;
    const whole = Math.floor(rounded);
    const frac = Math.round((rounded - whole) * 10);
    if (this.target_temp_step < 1) {
      // Celsius mode: always show decimal to prevent layout shift
      return svg`${whole}<tspan font-size="40" dy="30">.${frac}</tspan>`;
    }
    // Fahrenheit mode: whole numbers only
    return svg`${whole}`;
  }

  /** Render temperature at smaller scale for dual mode targets */
  private _renderTempTextSmall(value: number): TemplateResult {
    const rounded = Math.round(value * 10) / 10;
    const whole = Math.floor(rounded);
    const frac = Math.round((rounded - whole) * 10);
    if (this.target_temp_step < 1) {
      return svg`${whole}<tspan font-size="22" dy="16">.${frac}</tspan>`;
    }
    return svg`${whole}`;
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
    const powerPath = 'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13';

    // Thermometer outline icon (shown in edit mode instead of power)
    const thermoScale = r / 87;
    const thermoWidth = 24 * thermoScale;
    const thermoX = r - thermoWidth / 2;
    const thermoY = this.diameter - thermoWidth - r * 0.05;
    const thermoPath = 'M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z';

    return svg`
      <g>
        ${presetIcon !== null ? svg`
          <path
            d=${presetIcon}
            class=${presetClass}
            transform="translate(${presetX}, ${presetY}) scale(${presetScale})"
          />
        ` : ''}
        ${this.show_power_toggle
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
          : ''}
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
      sleep: 'M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87,20.69,17.05,20.16,17.8C19.84,18.25,19.5,18.67,19.08,19.07C15.17,23,8.84,23,4.94,19.07C1.03,15.17,1.03,8.83,4.94,4.93C5.34,4.53,5.76,4.17,6.21,3.85C6.96,3.32,8.14,4.21,8.06,5.04C7.79,7.9,8.75,10.87,10.95,13.06C13.14,15.26,16.1,16.22,18.97,15.95Z',
      // Fire — boost
      boost: 'M17.66,11.2C17.43,10.9,17.15,10.64,16.89,10.38C16.22,9.78,15.46,9.35,14.82,8.72C13.33,7.26,13,4.85,13.95,3C13,3.23,12.17,3.75,11.46,4.32C8.87,6.4,7.85,10.07,9.07,13.22C9.11,13.32,9.15,13.42,9.15,13.55C9.15,13.77,9,13.97,8.8,14.05C8.57,14.15,8.33,14.09,8.14,13.93C8.08,13.88,8.04,13.83,8,13.76C6.87,12.33,6.69,10.28,7.45,8.64C5.78,10,4.87,12.3,5,14.47C5.06,14.97,5.12,15.47,5.29,15.97C5.43,16.57,5.7,17.17,6,17.7C7.08,19.43,8.95,20.67,10.96,20.92C13.1,21.19,15.39,20.8,16.89,19.32C18.55,17.68,19.15,15.15,18.43,12.97L18.3,12.66C18.1,12.16,17.83,11.68,17.66,11.2Z',
      // Sun — comfort
      comfort: 'M12,7A5,5,0,1,0,17,12,5,5,0,0,0,12,7ZM12,2L14.39,5.42C13.65,5.15,12.84,5,12,5S10.36,5.15,9.61,5.42ZM3.34,7L7.5,6.65A6.86,6.86,0,0,0,5.42,9.61ZM3.34,17L5.42,14.39A6.86,6.86,0,0,0,7.5,17.35ZM12,22L9.61,18.58C10.36,18.85,11.16,19,12,19S13.65,18.85,14.39,18.58ZM20.66,17L16.5,17.35A6.86,6.86,0,0,0,18.58,14.39ZM20.66,7L18.58,9.61A6.86,6.86,0,0,0,16.5,6.65Z',
      // Person — activity
      activity: 'M12,4A4,4,0,1,1,8,8,4,4,0,0,1,12,4ZM12,14C7.58,14,4,15.79,4,18V20H20V18C20,15.79,16.42,14,12,14Z',
    };

    // Check config-based preset_icons mapping first
    if (this._presetIcons && this._presetIcons[this.preset_mode]) {
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
    const tapSize = width * 1.2;
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
    this.dispatchEvent(
      new CustomEvent('more-info', { bubbles: true, composed: true }),
    );
  }

  private _handleChevronClick(e: MouseEvent): void {
    e.stopPropagation();
    const target = (e.currentTarget as SVGElement);
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
    this.dispatchEvent(
      new CustomEvent('toggle', { bubbles: true, composed: true }),
    );
  }

  // --- Ring drag/tap interaction ---
  private _handlePointerDown(e: PointerEvent): void {
    if (this.readonly) return;
    if (!this.editing) return;
    const temp = this._pointerToTemperature(e);
    if (temp === null) return;

    this._dragging = true;
    this._didPointerInteract = true;
    this._interaction.pauseTimer();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    this._setTemperatureFromRing(temp);
    e.preventDefault();
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!this._dragging) return;
    const temp = this._pointerToTemperature(e);
    if (temp === null) return;
    this._setTemperatureFromRing(temp);
    e.preventDefault();
  }

  private _handlePointerUp(e: PointerEvent): void {
    if (!this._dragging) return;
    this._dragging = false;
    (e.target as SVGElement).releasePointerCapture(e.pointerId);
    // Resume the pending timer after drag ends
    this._interaction.resumeTimer();
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
    if (angle > (360 - gap / 2) || angle < gap / 2) return null;

    // Normalize: subtract startAngle to get 0..tick_degrees
    const normalized = angle - startAngle;
    const fraction = normalized / this.tick_degrees;

    const temp = this.min_temp + fraction * (this.max_temp - this.min_temp);

    // Snap to step
    const stepped = Math.round(temp / this.target_temp_step) * this.target_temp_step;
    return clamp(stepped, this.min_temp, this.max_temp);
  }

  private _setTemperatureFromRing(temp: number): void {
    if (this.dual) {
      // In dual mode, adjust whichever setpoint is closer
      // Respect idle_zone config (default 0 — HA is the authority)
      // High can't go below low, low can't go above high (can be equal when idle_zone=0)
      const distLow = Math.abs(temp - (this.target_temp_low ?? this.min_temp));
      const distHigh = Math.abs(temp - (this.target_temp_high ?? this.max_temp));
      if (distLow < distHigh) {
        const maxAllowed = (this.target_temp_high ?? this.max_temp) - this.idle_zone;
        this.target_temp_low = clamp(temp, this.min_temp, maxAllowed);
      } else {
        const minAllowed = (this.target_temp_low ?? this.min_temp) + this.idle_zone;
        this.target_temp_high = clamp(temp, minAllowed, this.max_temp);
      }
    } else {
      this.temperature = temp;
    }
    this.requestUpdate();
  }

  // --- Tick range computation ---
  private _computeTickRange(): TickRange {
    const ambientIdx = clamp(
      temperatureToTick(this.current_temperature, this.min_temp, this.max_temp, this.num_ticks),
      0,
      this.num_ticks - 1,
    );

    let from: number | undefined;
    let to: number | undefined;
    // Large ticks for the rim label temperatures (the "other" values not in center)
    const largeIndices: number[] = [];

    if (this.dual && this.target_temp_low !== null && this.target_temp_high !== null) {
      const lowIdx = clamp(
        temperatureToTick(this.target_temp_low, this.min_temp, this.max_temp, this.num_ticks),
        0,
        this.num_ticks - 1,
      );
      const highIdx = clamp(
        temperatureToTick(this.target_temp_high, this.min_temp, this.max_temp, this.num_ticks),
        0,
        this.num_ticks - 1,
      );

      // Rim shows targets (idle) or ambient + targets (editing)
      if (this.editing) {
        largeIndices.push(ambientIdx, lowIdx, highIdx);
      } else {
        largeIndices.push(lowIdx, highIdx);
      }

      // Predictive arc: based on position, not just hvac_action
      // This gives instant feedback during editing
      if (lowIdx > ambientIdx) {
        // Ambient is below low target → would heat
        from = ambientIdx;
        to = lowIdx;
      } else if (highIdx < ambientIdx) {
        // Ambient is above high target → would cool
        from = highIdx;
        to = ambientIdx;
      }
    } else if (this.temperature !== null) {
      const targetIdx = clamp(
        temperatureToTick(this.temperature, this.min_temp, this.max_temp, this.num_ticks),
        0,
        this.num_ticks - 1,
      );

      // Rim shows target (idle) or ambient (editing)
      if (this.editing) {
        largeIndices.push(ambientIdx);
      } else {
        largeIndices.push(targetIdx);
      }

      // Predictive arc: based on position
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

    return { from, to, largeIndices, predicted: this.editing };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thermostat-dial': ThermostatDial;
  }
}
