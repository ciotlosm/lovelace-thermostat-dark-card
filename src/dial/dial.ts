import { LitElement, html, svg, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HvacAction } from '../types';
import { ECO_PRESETS } from '../const';
import { formatTemp, temperatureToTick, offsetDegrees, clamp, rotatePoint, rotatePoints, pointsToPath } from './svg-utils';
import { renderTicks, TickConfig, TickRange } from './dial-ticks';
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

  // --- Internal state ---
  @state() editing = false;
  private _dragging = false;
  private _didPointerInteract = false;

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
    return html`
      <div class="dial-container">
        <svg
          viewBox="0 0 ${this.diameter} ${this.diameter}"
          class="dial"
          @click=${this._handleDialClick}
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

  // --- SVG Layer: Background disc ---
  private _renderDisc(): TemplateResult {
    const r = this._radius;
    const action = this.hvac_action ?? 'off';
    return svg`
      <circle cx=${r} cy=${r} r=${r} class="dial-disc dial-disc--${action}" />
    `;
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
        [r - 2.5, pointerOuter],
        [r + 2.5, pointerOuter],
        [r + 2.5, pointerInner],
        [r - 2.5, pointerInner],
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
      // Edit mode: center has target → rim shows ambient with pointer at target
      // Determine offset: ambient label goes to the outside of the interval
      if (this.temperature !== null) {
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
        // Dual: low is always below ambient, high is always above — offsets stay fixed
        const lowOffset = this.target_temp_low <= this.target_temp_high ? -8 : 8;
        const highOffset = this.target_temp_high >= this.target_temp_low ? 8 : -8;
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
            ${this._renderTempText(this.target_temp_low!)}
          </text>
          <text x=${r + r / 3} y=${r} class="dial-text dial-text--high">
            ${this._renderTempText(this.target_temp_high!)}
          </text>
        </g>
      `;
    }

    return svg`
      <g class="dial-center">
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

  // --- SVG Layer: Indicators (leaf, power/thermo) ---
  private _renderIndicators(): TemplateResult {
    const r = this._radius;
    const showLeaf =
      this.show_preset_indicator &&
      this.preset_mode !== null &&
      ECO_PRESETS.includes(this.preset_mode);

    const leafClass = `dial-leaf${showLeaf ? ' dial-leaf--visible' : ''}`;

    // Leaf icon positioned below center
    const leafScale = r / 5 / 100;
    const leafTranslate = `translate(${r - leafScale * 50}, ${r * 1.5})`;
    const leafPath = 'M3,84c24,17,51,18,73-6C100,52,100,22,100,4c-13,15-37,9-70,19C4,32,0,63,0,76c6-7,18-17,33-23c24-9,34-9,48-20c-9,10-20,16-43,24C22,63,8,78,3,84z';

    // Power icon — positioned on the outer ring area (bottom center)
    const powerScale = 2.3;
    const powerWidth = 24 * powerScale;
    const powerX = r - powerWidth / 2;
    const powerY = this.diameter - powerWidth - 10; // aligned to outer ring
    const powerPath = 'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13';

    // Thermometer outline icon (shown in edit mode instead of power)
    const thermoScale = 2.3;
    const thermoWidth = 24 * thermoScale;
    const thermoX = r - thermoWidth / 2;
    const thermoY = this.diameter - thermoWidth - 10; // same position as power
    // MDI thermometer outline path (mdi:thermometer)
    const thermoPath = 'M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z';

    return svg`
      <g>
        <path
          d=${leafPath}
          class=${leafClass}
          transform="${leafTranslate} scale(${leafScale})"
        />
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

  // --- SVG Layer: Edit controls (chevrons) ---
  private _renderControls(): TemplateResult {
    const r = this._radius;
    const chevronWidth = r / 3;
    const offset = r / 3; // distance from center

    if (this.dual) {
      return svg`
        <g class="dial-controls">
          ${this._renderChevron(r - r / 4, r - offset, 0, chevronWidth * 0.7, 'low-up')}
          ${this._renderChevron(r - r / 4, r + offset, 180, chevronWidth * 0.7, 'low-down')}
          ${this._renderChevron(r + r / 4, r - offset, 0, chevronWidth * 0.7, 'high-up')}
          ${this._renderChevron(r + r / 4, r + offset, 180, chevronWidth * 0.7, 'high-down')}
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
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('toggle', { bubbles: true, composed: true }),
    );
  }

  // --- Ring drag/tap interaction ---
  private _handlePointerDown(e: PointerEvent): void {
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

      // Rim shows targets (idle) or ambient (editing)
      if (this.editing) {
        largeIndices.push(ambientIdx);
      } else {
        largeIndices.push(lowIdx, highIdx);
      }

      if (this.hvac_action === 'heating' && lowIdx > ambientIdx) {
        from = ambientIdx;
        to = lowIdx;
      } else if (this.hvac_action === 'cooling' && highIdx < ambientIdx) {
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

      if (this.hvac_action === 'heating' && targetIdx > ambientIdx) {
        from = ambientIdx;
        to = targetIdx;
      } else if (this.hvac_action === 'cooling' && targetIdx < ambientIdx) {
        from = targetIdx;
        to = ambientIdx;
      }
    }

    return { from, to, largeIndices };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thermostat-dial': ThermostatDial;
  }
}
