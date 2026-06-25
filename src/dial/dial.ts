import { LitElement, html, svg, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HvacAction } from '../types';
import { ECO_PRESETS } from '../const';
import { formatTemp, temperatureToTick, offsetDegrees, clamp } from './svg-utils';
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
  }

  protected render(): TemplateResult {
    const r = this._radius;
    return html`
      <div class="dial-container">
        <svg
          viewBox="0 0 ${this.diameter} ${this.diameter}"
          class="dial"
          @click=${this._handleDialClick}
        >
          ${this._renderDisc()}
          ${this.show_ticks ? this._renderTicks() : ''}
          ${renderRing(r)}
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

  // --- SVG Layer: Center temperature display ---
  private _renderCenter(): TemplateResult {
    const r = this._radius;

    if (this.dual && this.editing) {
      const lowX = r - r / 4;
      const highX = r + r / 4;
      return svg`
        <g class="dial-center">
          <text x=${r} y=${r} class="dial-text dial-text--ambient">
            ${formatTemp(this.current_temperature)}°
          </text>
          <text x=${lowX} y=${r} class="dial-text dial-text--low">
            ${formatTemp(this.target_temp_low!)}°
          </text>
          <text x=${highX} y=${r} class="dial-text dial-text--high">
            ${formatTemp(this.target_temp_high!)}°
          </text>
        </g>
      `;
    }

    return svg`
      <g class="dial-center">
        <text x=${r} y=${r} class="dial-text dial-text--ambient">
          ${formatTemp(this.current_temperature)}°
        </text>
        <text x=${r} y=${r} class="dial-text dial-text--target">
          ${this.temperature !== null ? `${formatTemp(this.temperature)}°` : ''}
        </text>
      </g>
    `;
  }

  // --- SVG Layer: Indicators (leaf, power) ---
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

    // Power icon positioned at bottom
    const powerScale = 1.8;
    const powerX = r - 12 * powerScale;
    const powerY = r * 1.6;
    const powerPath = 'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13';

    return svg`
      <g>
        <path
          d=${leafPath}
          class=${leafClass}
          transform="${leafTranslate} scale(${leafScale})"
        />
        ${this.show_power_toggle
          ? svg`
            <path
              d=${powerPath}
              class="dial-power"
              transform="translate(${powerX}, ${powerY}) scale(${powerScale})"
              @click=${this._handlePowerClick}
            />
          `
          : ''}
      </g>
    `;
  }

  // --- SVG Layer: Edit controls (chevrons) ---
  private _renderControls(): TemplateResult {
    const r = this._radius;
    const chevronWidth = 50;

    if (this.dual) {
      return svg`
        <g class="dial-controls">
          ${this._renderChevron(r - r / 4, r - 70, 0, chevronWidth * 0.7, 'low-up')}
          ${this._renderChevron(r - r / 4, r + 70, 180, chevronWidth * 0.7, 'low-down')}
          ${this._renderChevron(r + r / 4, r - 70, 0, chevronWidth * 0.7, 'high-up')}
          ${this._renderChevron(r + r / 4, r + 70, 180, chevronWidth * 0.7, 'high-down')}
        </g>
      `;
    }

    return svg`
      <g class="dial-controls">
        ${this._renderChevron(r, r - 70, 0, chevronWidth, 'target-up')}
        ${this._renderChevron(r, r + 70, 180, chevronWidth, 'target-down')}
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
    const d = `M${-halfW},0 L0,${-width * 0.3} L${halfW},0`;
    return svg`
      <path
        d=${d}
        class="dial-chevron"
        transform="translate(${cx}, ${cy}) rotate(${rotation})"
        data-id=${id}
        @click=${this._handleChevronClick}
      />
    `;
  }

  // --- Event handlers ---
  private _handleDialClick(e: MouseEvent): void {
    // Don't enter edit if clicking power or chevron
    const target = e.target as SVGElement;
    if (target.closest('.dial-power') || target.closest('.dial-chevron')) return;
    if (!this.editing) {
      this._interaction.enterEditMode();
    }
  }

  private _handleChevronClick(e: MouseEvent): void {
    e.stopPropagation();
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
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('toggle', { bubbles: true, composed: true }),
    );
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
    const largeIndices: number[] = [ambientIdx];

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
      largeIndices.push(lowIdx, highIdx);

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
      largeIndices.push(targetIdx);

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
