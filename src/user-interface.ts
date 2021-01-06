/* eslint-disable @typescript-eslint/camelcase */
import { LitElement, internalProperty } from 'lit-element';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { HVAC_HEATING, HVAC_COOLING, HVAC_IDLE, HVAC_OFF } from './const';
class SvgUtil {
  // Rotate a cartesian point about given origin by X degrees
  static rotatePoint(point, angle, origin): Array<number> {
    const radians = (angle * Math.PI) / 180;
    const x = point[0] - origin[0];
    const y = point[1] - origin[1];
    const x1 = x * Math.cos(radians) - y * Math.sin(radians) + origin[0];
    const y1 = x * Math.sin(radians) + y * Math.cos(radians) + origin[1];
    return [x1, y1];
  }
  // Rotate an array of cartesian points about a given origin by X degrees
  static rotatePoints(points, angle, origin): Function {
    return points.map(point => this.rotatePoint(point, angle, origin));
  }
  // Given an array of points, return an SVG path string representing the shape they define
  static pointsToPath(points): string {
    return points.map((point, iPoint) => (iPoint > 0 ? 'L' : 'M') + point[0] + ' ' + point[1]).join(' ') + 'Z';
  }
  static circleToPath(cx, cy, r): string {
    return [
      'M',
      cx,
      ',',
      cy,
      'm',
      0 - r,
      ',',
      0,
      'a',
      r,
      ',',
      r,
      0,
      1,
      ',',
      0,
      r * 2,
      ',',
      0,
      'a',
      r,
      ',',
      r,
      0,
      1,
      ',',
      0,
      0 - r * 2,
      ',',
      0,
      'z',
    ]
      .join(' ')
      .replace(/\s,\s/g, ',');
  }
  static donutPath(cx, cy, rOuter, rInner): string {
    return this.circleToPath(cx, cy, rOuter) + ' ' + this.circleToPath(cx, cy, rInner);
  }

  static superscript(number): string {
    return `${Math.floor(number)}${number % 1 != 0 ? '⁵' : ''}`;
  }

  // Restrict a number to a min + max range
  static restrictToRange(val, min, max): number {
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }

  static anglesToSectors(radius, startAngle, angle): { L: number; X: number; Y: number; R: number } {
    let aRad = 0; // Angle in Rad
    let z = 0; // Size z
    let x = 0; // Side x
    let X = 0; // SVG X coordinate
    let Y = 0; // SVG Y coordinate
    const aCalc = angle > 180 ? 360 - angle : angle;
    aRad = (aCalc * Math.PI) / 180;
    z = Math.sqrt(2 * radius * radius - 2 * radius * radius * Math.cos(aRad));
    if (aCalc <= 90) {
      x = radius * Math.sin(aRad);
    } else {
      x = radius * Math.sin(((180 - aCalc) * Math.PI) / 180);
    }
    Y = Math.sqrt(z * z - x * x);
    if (angle <= 180) {
      X = radius + x;
    } else {
      X = radius - x;
    }
    return {
      L: radius,
      X: X,
      Y: Y,
      R: startAngle,
    };
  }
}
export class ThermostatUserInterface extends LitElement {
  @internalProperty() private _container!: HTMLElement;
  @internalProperty() private _dual!: boolean;
  @internalProperty() private _inControl!: boolean;
  @internalProperty() private _low!: number;
  @internalProperty() private _high!: number;
  @internalProperty() private _target!: number;
  @internalProperty() private _ambient!: number;
  @internalProperty() private _config!: any;
  @internalProperty() private _ticks!: Array<SVGElement>;
  @internalProperty() private _controls!: Array<SVGElement>;
  @internalProperty() private _root!: SVGElement;
  @internalProperty() private _toggle!: SVGElement;
  @internalProperty() private minValue!: number;
  @internalProperty() private maxValue!: number;
  @internalProperty() private _timeoutHandler!: number;
  @internalProperty() private _hvacState!: string;
  @internalProperty() private _away!: boolean;
  @internalProperty() private _savedOptions: any;
  @internalProperty()
  public _hass!: HomeAssistant;

  private _touchTimeout: any;

  public get hvacState(): string {
    return this._hvacState;
  }

  public get container(): HTMLElement {
    return this._container;
  }
  public set dual(val) {
    this._dual = val;
  }
  public get dual(): boolean {
    return this._dual;
  }
  public get temperature(): {
    ambient: number;
    low: number;
    high: number;
    target: number;
    dual: boolean;
  } {
    return {
      ambient: this._ambient,
      low: this._low,
      high: this._high,
      target: this._target,
      dual: this.dual,
    };
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  public set temperature(val) {
    this._ambient = val.ambient;
    this._low = val.low;
    this._high = val.high;
    this._target = val.target;
    this._dual = typeof this._low == 'number' && typeof this._high == 'number';
  }

  createSVGElement(tag, attributes): SVGElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    this.svgAttributes(element, attributes);
    return element;
  }
  svgAttributes(element, attrs): void {
    for (const i in attrs) {
      element.setAttribute(i, attrs[i]);
    }
  }

  renderSVG(config): void {
    // @TODO: Fix numbers in editor to avoid casting
    config.step = Number(config.step);
    config.chevron_size = Number(config.chevron_size);
    config.pending = Number(config.pending);
    config.idle_zone = Number(config.idle_zone);
    this._touchTimeout = 0;
    this._config = config; // need certain options for updates
    this._ticks = []; // need for dynamic tick updates
    this._controls = []; // need for managing highlight and clicks
    if (this._container && this._container.removeChild) this._container.removeChild(this._container.childNodes[0]);
    this._container = document.createElement('ha-card');
    this._container.className = 'dial_container';
    const style = document.createElement('style');
    if (config.name) this._container.appendChild(this._buildTitle(config.name));
    this._container.appendChild(style);
    const root = this._buildCore(config.diameter);
    const toggle = this._buildPowerIcon(config.radius);
    root.appendChild(this._buildDial(config.radius));
    root.appendChild(this._buildTicks(config.numTicks));
    root.appendChild(this._buildRing(config.radius));
    root.appendChild(this._buildLeaf(config.radius));
    root.appendChild(this._buildThermoIcon(config.radius));
    root.appendChild(toggle);
    root.appendChild(this._buildDialSlot(1));
    root.appendChild(this._buildDialSlot(2));
    root.appendChild(this._buildDialSlot(3));

    root.appendChild(this._buildText(config.radius, 'ambient', 0));
    root.appendChild(this._buildText(config.radius, 'target', 0));
    root.appendChild(this._buildText(config.radius, 'low', -config.radius / 2.5));
    root.appendChild(this._buildText(config.radius, 'high', config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 0, 'low', 0.7, -config.radius / 2.5));
    root.appendChild(this._buildChevrons(config.radius, 0, 'high', 0.7, config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 0, 'target', 1, 0));
    root.appendChild(this._buildChevrons(config.radius, 180, 'low', 0.7, -config.radius / 2.5));
    root.appendChild(this._buildChevrons(config.radius, 180, 'high', 0.7, config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 180, 'target', 1, 0));

    this._container.appendChild(root);
    this._root = root;
    this._toggle = toggle;
    this._buildControls(config.radius);
    if (this._savedOptions) {
      this.updateState(this._savedOptions);
    }

    this._root.addEventListener('click', () => this._enableControls());
    this._root.addEventListener('touchstart', e => this._handleTouchStart(e, this));
    this._root.addEventListener('touchend', () => this._handleTouchEnd());
    this._root.addEventListener('touchcancel', e => this._handleTouchCancel(e));
    this._root.addEventListener('contextmenu', e => this._handleMoreInfo(e, this));
    this._toggle.addEventListener('click', e => this._handleToggle(e));
  }

  private _handleTouchCancel(e: TouchEvent): void {
    e.preventDefault();
    window.clearTimeout(this._touchTimeout);
  }

  private _handleTouchStart(e: TouchEvent, t: ThermostatUserInterface): void {
    this._touchTimeout = setTimeout(this._handleMoreInfo, 2 * 1000, e, t);
  }

  private _handleTouchEnd(): void {
    window.clearTimeout(this._touchTimeout);
  }

  private _handleMoreInfo(e: MouseEvent, t: ThermostatUserInterface): void {
    if (e) e.preventDefault();
    fireEvent(t, 'hass-more-info', {
      entityId: t._config!.entity,
    });
  }

  private _handleToggle(e: MouseEvent) {
    e.stopPropagation();
    const serviceCall = this._hvacState !== HVAC_OFF ? 'turn_off' : 'turn_on';
    this._hass!.callService('climate', serviceCall, {
      entity_id: this._config!.entity,
    });
  }

  _configDial(): void {
    const config = this._config;
    this._updateClass('has_dual', this.dual);
    let tickLabel, from, to;
    const tickIndexes: number[] = [];
    const ambientIndex = SvgUtil.restrictToRange(
      Math.round(((this._ambient - this.minValue) / (this.maxValue - this.minValue)) * config.numTicks),
      0,
      config.numTicks - 1,
    );
    const targetIndex = SvgUtil.restrictToRange(
      Math.round(((this._target - this.minValue) / (this.maxValue - this.minValue)) * config.numTicks),
      0,
      config.numTicks - 1,
    );
    const highIndex = SvgUtil.restrictToRange(
      Math.round(((this._high - this.minValue) / (this.maxValue - this.minValue)) * config.numTicks),
      0,
      config.numTicks - 1,
    );
    const lowIndex = SvgUtil.restrictToRange(
      Math.round(((this._low - this.minValue) / (this.maxValue - this.minValue)) * config.numTicks),
      0,
      config.numTicks - 1,
    );
    if (!this.dual) {
      tickLabel = [this._target, this._ambient].sort();
      this._updateTemperatureSlot(tickLabel[0], -8, `temperature_slot_1`);
      this._updateTemperatureSlot(tickLabel[1], 8, `temperature_slot_2`);
      switch (this._hvacState) {
        case HVAC_COOLING:
          // active ticks
          if (targetIndex < ambientIndex) {
            from = targetIndex;
            to = ambientIndex;
          }
          break;
        case HVAC_HEATING:
          // active ticks
          if (targetIndex > ambientIndex) {
            from = ambientIndex;
            to = targetIndex;
          }
          break;
        default:
      }
    } else {
      tickLabel = [this._low, this._high, this._ambient].sort();
      this._updateTemperatureSlot(null, 0, `temperature_slot_1`);
      this._updateTemperatureSlot(null, 0, `temperature_slot_2`);
      this._updateTemperatureSlot(null, 0, `temperature_slot_3`);
      switch (this._hvacState) {
        case HVAC_COOLING:
          // active ticks
          if (highIndex < ambientIndex) {
            from = highIndex;
            to = ambientIndex;
            this._updateTemperatureSlot(this._ambient, 8, `temperature_slot_3`);
            this._updateTemperatureSlot(this._high, -8, `temperature_slot_2`);
          }
          break;
        case HVAC_HEATING:
          // active ticks
          if (lowIndex > ambientIndex) {
            from = ambientIndex;
            to = lowIndex;
            this._updateTemperatureSlot(this._ambient, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._low, 8, `temperature_slot_2`);
          }
          break;
        case HVAC_IDLE:
          // active ticks
          if (highIndex < ambientIndex) {
            from = highIndex;
            to = ambientIndex;
            this._updateTemperatureSlot(this._ambient, 8, `temperature_slot_3`);
            this._updateTemperatureSlot(this._high, -8, `temperature_slot_2`);
          }
          if (lowIndex > ambientIndex) {
            from = ambientIndex;
            to = lowIndex;
            this._updateTemperatureSlot(this._ambient, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._low, 8, `temperature_slot_2`);
          }
          break;
        default:
      }
    }
    tickLabel.forEach(item =>
      tickIndexes.push(
        SvgUtil.restrictToRange(
          Math.round(((item - this.minValue) / (this.maxValue - this.minValue)) * config.numTicks),
          0,
          config.numTicks - 1,
        ),
      ),
    );
    this._updateTicks(from, to, tickIndexes);
    this._updateClass('has-leaf', this._away);
    this._updateHvacState();
    this._updateText('ambient', this._ambient);
    this._updateEdit(false);
    this._updateClass('has-thermo', false);
  }

  updateState(options): void {
    this._away = options.away || false;
    this.minValue = options.minValue;
    this.maxValue = options.maxValue;
    this._hvacState = options.hvacState;
    this.temperature = {
      low: options.target_temperature_low,
      high: options.target_temperature_high,
      target: options.target_temperature,
      ambient: options.ambientTemperature,
      dual: typeof options.target_temperature_low == 'number' && typeof options.target_temperature_high == 'number',
    };
    this._savedOptions = options;
    this._configDial();
  }

  _temperatureControlClicked(index): void {
    const config = this._config;
    let chevron;
    this._root.querySelectorAll('path.dial__chevron').forEach(el => this.setSvgClass(el, 'pressed', false));
    if (this._inControl) {
      if (this.dual) {
        switch (index) {
          case 0:
            // clicked top left
            chevron = this._root.querySelectorAll('path.dial__chevron--low')[1];
            this._low = this._low + config.step;
            if (this._low + config.idle_zone >= this._high) this._low = this._high - config.idle_zone;
            break;
          case 1:
            // clicked top right
            chevron = this._root.querySelectorAll('path.dial__chevron--high')[1];
            this._high = this._high + config.step;
            if (this._high > this.maxValue) this._high = this.maxValue;
            break;
          case 2:
            // clicked bottom right
            chevron = this._root.querySelectorAll('path.dial__chevron--high')[0];
            this._high = this._high - config.step;
            if (this._high - config.idle_zone <= this._low) this._high = this._low + config.idle_zone;
            break;
          case 3:
            // clicked bottom left
            chevron = this._root.querySelectorAll('path.dial__chevron--low')[0];
            this._low = this._low - config.step;
            if (this._low < this.minValue) this._low = this.minValue;
            break;
        }
        this.setSvgClass(chevron, 'pressed', true);
        setTimeout(() => this.setSvgClass(chevron, 'pressed', false), 200);
        if (config.highlight_tap) this.setSvgClass(this._controls[index], 'control-visible', true);
      } else {
        if (index < 2) {
          // clicked top
          chevron = this._root.querySelectorAll('path.dial__chevron--target')[1];
          this._target = this._target + config.step;
          if (this._target > this.maxValue) this._target = this.maxValue;
          if (config.highlight_tap) {
            this.setSvgClass(this._controls[0], 'control-visible', true);
            this.setSvgClass(this._controls[1], 'control-visible', true);
          }
        } else {
          // clicked bottom
          chevron = this._root.querySelectorAll('path.dial__chevron--target')[0];
          this._target = this._target - config.step;
          if (this._target < this.minValue) this._target = this.minValue;
          if (config.highlight_tap) {
            this.setSvgClass(this._controls[2], 'control-visible', true);
            this.setSvgClass(this._controls[3], 'control-visible', true);
          }
        }
        this.setSvgClass(chevron, 'pressed', true);
        setTimeout(() => this.setSvgClass(chevron, 'pressed', false), 200);
      }
      if (config.highlight_tap) {
        setTimeout(() => {
          this.setSvgClass(this._controls[0], 'control-visible', false);
          this.setSvgClass(this._controls[1], 'control-visible', false);
          this.setSvgClass(this._controls[2], 'control-visible', false);
          this.setSvgClass(this._controls[3], 'control-visible', false);
        }, 200);
      }
    } else {
      this._enableControls();
    }
  }

  _updateEdit(showEdit): void {
    this.setSvgClass(this._root, 'dial--edit', showEdit);
  }

  _enableControls(): void {
    const config = this._config;
    this._inControl = true;
    this._updateClass('in_control', this._inControl);
    if (this._timeoutHandler) clearTimeout(this._timeoutHandler);
    this._updateEdit(true);
    this._updateClass('has-thermo', true);
    this._updateClass('hide-toggle', true);
    this._updateText('target', this.temperature.target);
    this._updateText('low', this.temperature.low);
    this._updateText('high', this.temperature.high);
    this._timeoutHandler = window.setTimeout(() => {
      this._updateText('ambient', this._ambient);
      this._updateEdit(false);
      this._updateClass('has-thermo', false);
      this._updateClass('hide-toggle', false);
      this._inControl = false;
      this._updateClass('in_control', this._inControl);
      config.control();
    }, config.pending * 1000);
  }

  // _toggle(): boolean {
  //   const config = this._config;
  //   config.toggle();
  //   return false;
  // }

  _updateClass(className, flag): void {
    this.setSvgClass(this._root, className, flag);
  }

  setSvgClass(el, className, state): void {
    el.classList[state ? 'add' : 'remove'](className);
  }

  _updateText(id, value): void {
    const lblTarget = this._root.querySelector(`#${id}`)!.querySelectorAll('tspan');
    const text = Math.floor(value);
    if (value) {
      lblTarget[0].textContent = String(text);
      if (value % 1 != 0) {
        lblTarget[1].textContent = String(Math.round((value % 1) * 10));
      } else {
        lblTarget[1].textContent = '';
      }
    }
    if (this._inControl && id == 'target' && this.dual) {
      lblTarget[0].textContent = '·';
    }
  }

  private _updateTemperatureSlot(value, offset, slot): void {
    const config = this._config;
    const lblSlot1 = this._root.querySelector(`#${slot}`)!;
    lblSlot1.textContent = value != null ? SvgUtil.superscript(value) : '';
    const peggedValue = SvgUtil.restrictToRange(value, this.minValue, this.maxValue);
    const position = [config.radius, config.ticksOuterRadius - (config.ticksOuterRadius - config.ticksInnerRadius) / 2];
    const degs =
      (config.tickDegrees * (peggedValue - this.minValue)) / (this.maxValue - this.minValue) -
      config.offsetDegrees +
      offset;
    const pos = SvgUtil.rotatePoint(position, degs, [config.radius, config.radius]);
    this.svgAttributes(lblSlot1, {
      x: pos[0],
      y: pos[1],
    });
  }

  private _updateHvacState(): void {
    this._root.classList.forEach(c => {
      if (c.indexOf('dial--state--') != -1) this._root.classList.remove(c);
    });
    this._root.classList.add('dial--state--' + this._hvacState);
  }

  private _updateTicks(from, to, largeTicks): void {
    const config = this._config;

    const tickPoints = [
      [config.radius - 1, config.ticksOuterRadius],
      [config.radius + 1, config.ticksOuterRadius],
      [config.radius + 1, config.ticksInnerRadius],
      [config.radius - 1, config.ticksInnerRadius],
    ];
    const tickPointsLarge = [
      [config.radius - 1.5, config.ticksOuterRadius],
      [config.radius + 1.5, config.ticksOuterRadius],
      [config.radius + 1.5, config.ticksInnerRadius + 20],
      [config.radius - 1.5, config.ticksInnerRadius + 20],
    ];

    this._ticks.forEach((tick, index) => {
      let isLarge = false;
      let isActive = index >= from && index <= to ? 'active' : '';
      largeTicks.forEach(i => (isLarge = isLarge || index == i));
      if (isLarge) isActive += ' large';
      const theta = config.tickDegrees / config.numTicks;
      this.svgAttributes(tick, {
        d: SvgUtil.pointsToPath(
          SvgUtil.rotatePoints(isLarge ? tickPointsLarge : tickPoints, index * theta - config.offsetDegrees, [
            config.radius,
            config.radius,
          ]),
        ),
        class: isActive,
      });
    });
  }

  private _buildCore(diameter: number): SVGElement {
    return this.createSVGElement('svg', {
      width: '100%',
      height: '100%',
      viewBox: '0 0 ' + diameter + ' ' + diameter,
      class: 'dial',
    });
  }

  private _buildTitle(title: string): HTMLDivElement {
    const lblTitle = document.createElement('div');
    lblTitle.className = 'dial_title';
    lblTitle.textContent = title;
    return lblTitle;
  }

  // build black dial
  private _buildDial(radius: number): SVGElement {
    return this.createSVGElement('circle', {
      cx: radius,
      cy: radius,
      r: radius,
      class: 'dial__shape',
    });
  }
  // build circle around
  _buildRing(radius: number): SVGElement {
    return this.createSVGElement('path', {
      d: SvgUtil.donutPath(radius, radius, radius - 4, radius - 8),
      class: 'dial__editableIndicator',
    });
  }

  private _buildTicks(numTicks: number): SVGElement {
    const tickElement = this.createSVGElement('g', {
      class: 'dial__ticks',
    });
    for (let i = 0; i < numTicks; i++) {
      const tick = this.createSVGElement('path', {});
      this._ticks.push(tick);
      tickElement.appendChild(tick);
    }
    return tickElement;
  }

  _buildLeaf(radius: number): SVGElement {
    const leafScale = radius / 5 / 100;
    const leafDef = [
      'M',
      3,
      84,
      'c',
      24,
      17,
      51,
      18,
      73,
      -6,
      'C',
      100,
      52,
      100,
      22,
      100,
      4,
      'c',
      -13,
      15,
      -37,
      9,
      -70,
      19,
      'C',
      4,
      32,
      0,
      63,
      0,
      76,
      'c',
      6,
      -7,
      18,
      -17,
      33,
      -23,
      24,
      -9,
      34,
      -9,
      48,
      -20,
      -9,
      10,
      -20,
      16,
      -43,
      24,
      'C',
      22,
      63,
      8,
      78,
      3,
      84,
      'z',
    ]
      .map((x: any): string => (isNaN(x) ? x : x * leafScale))
      .join(' ');
    const translate = [radius - leafScale * 100 * 0.5, radius * 1.5];
    return this.createSVGElement('path', {
      class: 'dial__ico__leaf',
      d: leafDef,
      transform: 'translate(' + translate[0] + ',' + translate[1] + ')',
    });
  }

  private _buildChevrons(radius, rotation, id, scale, offset): SVGElement {
    const config = this._config;
    const translation = rotation > 0 ? -1 : 1;
    const width = config.chevron_size;
    const chevronDef = ['M', 0, 0, 'L', width / 2, width * 0.3, 'L', width, 0]
      .map((x: any): string => (isNaN(x) ? x : x * scale))
      .join(' ');
    const translate = [radius - (width / 2) * scale * translation + offset, radius + 70 * scale * 1.1 * translation];
    const chevron = this.createSVGElement('path', {
      class: `dial__chevron dial__chevron--${id}`,
      d: chevronDef,
      transform: `translate(${translate[0]},${translate[1]}) rotate(${rotation})`,
    });
    return chevron;
  }

  private _buildThermoIcon(radius: number): SVGElement {
    const thermoScale = radius / 3 / 100;
    const thermoDef = 'M 37.999 38.261 V 7 c 0 -3.859 -3.141 -7 -7 -7 s -7 3.141 -7 7 v 31.261 c -3.545 2.547 -5.421 6.769 -4.919 11.151 c 0.629 5.482 5.066 9.903 10.551 10.512 c 0.447 0.05 0.895 0.074 1.339 0.074 c 2.956 0 5.824 -1.08 8.03 -3.055 c 2.542 -2.275 3.999 -5.535 3.999 -8.943 C 42.999 44.118 41.14 40.518 37.999 38.261 Z M 37.666 55.453 c -2.146 1.921 -4.929 2.8 -7.814 2.482 c -4.566 -0.506 -8.261 -4.187 -8.785 -8.752 c -0.436 -3.808 1.28 -7.471 4.479 -9.56 l 0.453 -0.296 V 38 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 V 8 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 H 26.1 c 0.465 -2.279 2.484 -4 4.899 -4 c 2.757 0 5 2.243 5 5 v 1 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 4.329 l 0.453 0.296 c 2.848 1.857 4.547 4.988 4.547 8.375 C 40.999 50.841 39.784 53.557 37.666 55.453 Z'
      .split(' ')
      .map((x: any): string => (isNaN(x) ? x : x * thermoScale))
      .join(' ');
    const translate = [radius - thermoScale * 100 * 0.3, radius * 1.65];
    return this.createSVGElement('path', {
      class: 'dial__ico__thermo',
      d: thermoDef,
      transform: 'translate(' + translate[0] + ',' + translate[1] + ')',
    });
  }

  private _buildPowerIcon(radius: number): SVGElement {
    const width = 24;
    const scale = 2.3;
    const scaledWidth = width * scale;
    const powerDef =
      'M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13';
    const translate = [radius - scaledWidth / 2, radius * 1.6];
    const color = this._hvacState == HVAC_OFF ? 'grey' : 'white';
    return (
      this,
      this.createSVGElement('path', {
        class: 'dial__ico__power',
        fill: color,
        d: powerDef,
        transform: 'translate(' + translate[0] + ',' + translate[1] + ') scale(' + scale + ')',
      })
    );
  }

  private _buildDialSlot(index: number): SVGElement {
    return this.createSVGElement('text', {
      class: 'dial__lbl dial__lbl--ring',
      id: `temperature_slot_${index}`,
    });
  }

  _buildText(radius, name, offset): SVGElement {
    const target = this.createSVGElement('text', {
      x: radius + offset,
      y: radius,
      class: `dial__lbl dial__lbl--${name}`,
      id: name,
    });
    const text = this.createSVGElement('tspan', {});
    // hack
    if (name == 'target' || name == 'ambient') offset += 20;
    const superscript = this.createSVGElement('tspan', {
      x: radius + radius / 3.1 + offset,
      y: radius - radius / 6,
      class: `dial__lbl--super--${name}`,
    });
    target.appendChild(text);
    target.appendChild(superscript);
    return target;
  }

  _buildControls(radius: number): SVGElement | void {
    let startAngle = 270;
    const loop = 4;
    for (let index = 0; index < loop; index++) {
      const angle = 360 / loop;
      const sector = SvgUtil.anglesToSectors(radius, startAngle, angle);
      const controlsDef =
        'M' +
        sector.L +
        ',' +
        sector.L +
        ' L' +
        sector.L +
        ',0 A' +
        sector.L +
        ',' +
        sector.L +
        ' 1 0,1 ' +
        sector.X +
        ', ' +
        sector.Y +
        ' z';
      const path = this.createSVGElement('path', {
        class: 'dial__temperatureControl',
        fill: 'blue',
        d: controlsDef,
        transform: 'rotate(' + sector.R + ', ' + sector.L + ', ' + sector.L + ')',
      });
      this._controls.push(path);
      path.addEventListener('click', () => this._temperatureControlClicked(index));
      this._root.appendChild(path);
      startAngle = startAngle + angle;
    }
  }
}
