export default class ThermostatUI {
  get container() {
    return this._container
  }
  set dual(val) {
    this._dual = val
  }
  get dual() {
    return this._dual;
  }
  get target_text() {
    return this.dual ? `${SvgUtil.superscript(this._low)}∙${SvgUtil.superscript(this._high)}` : SvgUtil.superscript(this._target);
  }
  set temperature(val) {
    this.ambient = val.ambient;
    this._low = val.low;
    this._high = val.high;
    this._target = val.target;
    if (this._low && this._high) this.dual = true;
  }
  constructor(config) {
    this._config = config; // need certain options for updates
    this._ticks = []; // need for dynamic tick updates
    this._dual = false; // by default is single temperature
    this._container = document.createElement('div');
    this._container.className = 'dial_container';
    const style = document.createElement('style');
    style.textContent = this._renderStyle();
    if (config.title) this._container.appendChild(this._buildTitle(config.title));
    this._container.appendChild(style);
    const root = this._buildCore(config.diameter);
    root.appendChild(this._buildDial(config.radius));
    root.appendChild(this._buildTicks(config.num_ticks));
    root.appendChild(this._buildRing(config.radius));
    root.appendChild(this._buildLeaf(config.radius));
    root.appendChild(this._buildDialSlot(1));
    root.appendChild(this._buildDialSlot(2));
    root.appendChild(this._buildDialSlot(3));
    root.appendChild(this._buildCenterTemperature(config.radius));
    root.appendChild(this._buildAway(config.radius));
    this._container.appendChild(root);
    this._root = root;
    this._root.addEventListener('click', () => this._enableControls());
  }

  updateState(options) {
    const config = this._config;
    const away = options.away || false;
    this.min_value = options.min_value;
    this.max_value = options.max_value;
    this.hvac_state = options.hvac_state;
    this.temperature = {
      low: options.target_temperature_low,
      high: options.target_temperature_high,
      target: options.target_temperature,
      ambient: options.ambient_temperature,
    }

    let tick_label, from, to;
    const tick_indexes = [];
    const ambient_index = SvgUtil.restrictToRange(Math.round((this.ambient - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const target_index = SvgUtil.restrictToRange(Math.round((this._target - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const high_index = SvgUtil.restrictToRange(Math.round((this._high - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const low_index = SvgUtil.restrictToRange(Math.round((this._low - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    if (!this.dual) {
      tick_label = [this._target, this.ambient].sort();
      this._updateTemperatureSlot(tick_label[0], -8, `temperature_slot_1`);
      this._updateTemperatureSlot(tick_label[1], 8, `temperature_slot_2`);
      switch (this.hvac_state) {
        case 'cool':
          // active ticks
          if (target_index < ambient_index) {
            from = target_index;
            to = ambient_index;
          }
          break;
        case 'heat':
          // active ticks
          if (target_index > ambient_index) {
            from = ambient_index;
            to = target_index;
          }
          break;
        default:
      }
    } else {
      tick_label = [this._low, this._high, this.ambient].sort();
      switch (this.hvac_state) {
        case 'cool':
          // active ticks
          if (high_index < ambient_index) {
            from = high_index;
            to = ambient_index;
            this._updateTemperatureSlot(this.ambient, 8, `temperature_slot_3`);
          }
          // numbers over lap

          break;
        case 'heat':
          // active ticks
          if (low_index > ambient_index) {
            from = ambient_index;
            to = low_index;
            this._updateTemperatureSlot(this.ambient, -8, `temperature_slot_1`);
          }
          // numbers over lap
          break;
        default:
      }
    }

    // cool: ambient to high only if high < ambient
    // check low vs high - display low only if close
    // else check ambient vs low - display lowest

    // heat: ambient to low only if low > ambient
    // check low vs high - display high only if close
    // else check ambient vs high - display highest

    // off : nothing active
    // check ambient vs low - display lowest if close
    // check ambient vs high - display highest if close
    //           this._updateTemperatureSlot(item, offset[index], `temperature_slot_${index + 1}`)
    tick_label.forEach(item => tick_indexes.push(SvgUtil.restrictToRange(Math.round((item - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1)));
    this._updateTicks(from, to, tick_indexes);
    this._updateLeaf(away);
    this._updateAway(away);
    this._updateHvacState();
    this._updateCenterTemperature(SvgUtil.superscript(this.ambient));
  }

  _enableControls() {
    clearTimeout(this._timeoutHandler);
    SvgUtil.setClass(this._root, 'dial--edit', true);
    this._updateCenterTemperature(this.target_text);
    this._timeoutHandler = setTimeout(() => {
      this._updateCenterTemperature(SvgUtil.superscript(this.ambient));
      SvgUtil.setClass(this._root, 'dial--edit', false);
    }, 10000);
  }

  _updateLeaf(show_leaf) {
    SvgUtil.setClass(this._root, 'has-leaf', show_leaf);
  }

  _updateCenterTemperature(text) {
    const lblTarget = this._root.querySelector('#center_temperature');
    SvgUtil.setClass(lblTarget, 'long_text', text.length > 3);
    lblTarget.textContent = text;
  }

  _updateTemperatureSlot(value, offset, slot) {
    const config = this._config;
    const lblSlot1 = this._root.querySelector(`#${slot}`)
    lblSlot1.textContent = value != null ? SvgUtil.superscript(value) : '';
    const peggedValue = SvgUtil.restrictToRange(value, this.min_value, this.max_value);
    const position = [config.radius, config.ticks_outer_radius - (config.ticks_outer_radius - config.ticks_inner_radius) / 2];
    let degs = config.tick_degrees * (peggedValue - this.min_value) / (this.max_value - this.min_value) - config.offset_degrees + offset;
    const pos = SvgUtil.rotatePoint(position, degs, [config.radius, config.radius]);
    SvgUtil.attributes(lblSlot1, {
      x: pos[0],
      y: pos[1]
    });
  }

  _updateAway(away) {
    SvgUtil.setClass(this._root, 'away', away);
  }

  _updateHvacState() {
    this._root.classList.forEach(c => {
      if (c.indexOf('dial--state--') != -1)
        this._root.classList.remove(c);
    });
    this._root.classList.add('dial--state--' + this.hvac_state);
  }

  _updateTicks(from, to, large_ticks) {
    const config = this._config;

    const tickPoints = [
      [config.radius - 1, config.ticks_outer_radius],
      [config.radius + 1, config.ticks_outer_radius],
      [config.radius + 1, config.ticks_inner_radius],
      [config.radius - 1, config.ticks_inner_radius]
    ];
    const tickPointsLarge = [
      [config.radius - 1.5, config.ticks_outer_radius],
      [config.radius + 1.5, config.ticks_outer_radius],
      [config.radius + 1.5, config.ticks_inner_radius + 20],
      [config.radius - 1.5, config.ticks_inner_radius + 20]
    ];

    this._ticks.forEach((tick, index) => {
      let isLarge = false;
      const isActive = (index >= from && index <= to) ? 'active' : '';
      large_ticks.forEach(i => isLarge = isLarge || (index == i));
      const theta = config.tick_degrees / config.num_ticks;
      SvgUtil.attributes(tick, {
        d: SvgUtil.pointsToPath(SvgUtil.rotatePoints(isLarge ? tickPointsLarge : tickPoints, index * theta - config.offset_degrees, [config.radius, config.radius])),
        class: isActive
      });
    });
  }

  // build svg element
  _buildCore(diameter) {
    return SvgUtil.createSVGElement('svg', {
      width: '100%',
      height: '100%',
      viewBox: '0 0 ' + diameter + ' ' + diameter,
      class: 'dial'
    })
  }

  _buildTitle(title) {
    const lblTitle = document.createElement('div');
    lblTitle.className = 'dial_title';
    lblTitle.textContent = title;
    return lblTitle;
  }

  // build black dial
  _buildDial(radius) {
    return SvgUtil.createSVGElement('circle', {
      cx: radius,
      cy: radius,
      r: radius,
      class: 'dial__shape'
    })
  }
  // build circle around
  _buildRing(radius) {
    return SvgUtil.createSVGElement('path', {
      d: SvgUtil.donutPath(radius, radius, radius - 4, radius - 8),
      class: 'dial__editableIndicator',
    })
  }

  _buildTicks(num_ticks) {
    const tick_element = SvgUtil.createSVGElement('g', {
      class: 'dial__ticks'
    });
    for (let i = 0; i < num_ticks; i++) {
      const tick = SvgUtil.createSVGElement('path', {})
      this._ticks.push(tick);
      tick_element.appendChild(tick);
    }
    return tick_element;
  }

  _buildLeaf(radius) {
    const leafScale = radius / 5 / 100;
    const leafDef = ["M", 3, 84, "c", 24, 17, 51, 18, 73, -6, "C", 100, 52,
      100, 22, 100, 4, "c", -13, 15, -37, 9, -70, 19, "C", 4, 32, 0, 63, 0,
      76, "c", 6, -7, 18, -17, 33, -23, 24, -9, 34, -9, 48, -20, -9, 10,
      -20, 16, -43, 24, "C", 22, 63, 8, 78, 3, 84, "z"].map((x) => isNaN(x) ? x : x * leafScale).join(' ');
    const translate = [radius - (leafScale * 100 * 0.5), radius * 1.5]
    return SvgUtil.createSVGElement('path', {
      class: 'dial__ico__leaf',
      d: leafDef,
      transform: 'translate(' + translate[0] + ',' + translate[1] + ')'
    });
  }

  _buildDialSlot(index) {
    return SvgUtil.createSVGElement('text', {
      class: 'dial__lbl dial__lbl--ring',
      id: `temperature_slot_${index}`
    })
  }
  // TODO: Refactor this to allow dual temperature & link to decimals
  _buildCenterTemperature(radius) {
    return SvgUtil.createSVGElement('text', {
      x: radius,
      y: radius,
      class: 'dial__lbl dial__lbl--target',
      id: 'center_temperature'
    })
  }

  _buildAway(radius) {
    const lblAway = SvgUtil.createSVGElement('text', {
      x: radius,
      y: radius,
      class: 'dial__lbl dial__lbl--away'
    });
    lblAway.textContent = 'AWAY';
    return lblAway
  }

  _renderStyle() {
    return `
      .dial_container {
        padding: 8px;
      }
      .dial_title {
        font-size: 20px;
        padding: 8px;
        text-align: center;
        color: var(--secondary-text-color);
      }
      .dial {
        user-select: none;
      
        --thermostat-off-fill: #222;
        --thermostat-path-color: rgba(255, 255, 255, 0.3);
        --thermostat-heat-fill: #E36304;
        --thermostat-cool-fill: #007AF1;
        --thermostat-path-active-color: rgba(255, 255, 255, 0.8);
        --thermostat-text-color: white;
      }
      .dial.away .dial__lbl--target {
        visibility: hidden;
      }
      .dial.away .dial__lbl--away {
        opacity: 1;
      }
      .dial .dial__shape {
        transition: fill 0.5s;
      }
      .dial__ico__leaf {
        fill: #13EB13;
        opacity: 0;
        transition: opacity 0.5s;
        pointer-events: none;
      }
      .dial.has-leaf .dial__ico__leaf {
        display: block;
        opacity: 1;
        pointer-events: initial;
      }
      .dial__editableIndicator {
        fill: white;
        fill-rule: evenodd;
        opacity: 0;
        transition: opacity 0.5s;
      }
      .dial--edit .dial__editableIndicator {
        opacity: 1;
      }
      .dial--state--off .dial__shape {
        fill: var(--thermostat-off-fill);
      }
      .dial--state--heat .dial__shape {
        fill: var(--thermostat-heat-fill);
      }
      .dial--state--cool .dial__shape {
        fill: var(--thermostat-cool-fill);
      }
      .dial__ticks path {
        fill: var(--thermostat-path-color);
      }
      .dial__ticks path.active {
        fill: var(--thermostat-path-active-color);
      }
      .dial text {
        fill: var(--thermostat-text-color);
        text-anchor: middle;
        font-family: Helvetica, sans-serif;
        alignment-baseline: central;
      }
      .dial__lbl--target {
        font-size: 120px;
        font-weight: bold;
      }
      .dial__lbl--target.long_text {
        font-size: 75px;
      }
      .dial__lbl--ring {
        font-size: 22px;
        font-weight: bold;
      }
      .dial__lbl--away {
        font-size: 72px;
        font-weight: bold;
        opacity: 0;
        pointer-events: none;
      }`
  }
}

class SvgUtil {
  static createSVGElement(tag, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    this.attributes(element, attributes)
    return element;
  }
  static attributes(element, attrs) {
    for (let i in attrs) {
      element.setAttribute(i, attrs[i]);
    }
  }
  // Rotate a cartesian point about given origin by X degrees
  static rotatePoint(point, angle, origin) {
    const radians = angle * Math.PI / 180;
    const x = point[0] - origin[0];
    const y = point[1] - origin[1];
    const x1 = x * Math.cos(radians) - y * Math.sin(radians) + origin[0];
    const y1 = x * Math.sin(radians) + y * Math.cos(radians) + origin[1];
    return [x1, y1];
  }
  // Rotate an array of cartesian points about a given origin by X degrees
  static rotatePoints(points, angle, origin) {
    return points.map((point) => this.rotatePoint(point, angle, origin));
  }
  // Given an array of points, return an SVG path string representing the shape they define
  static pointsToPath(points) {
    return points.map((point, iPoint) => (iPoint > 0 ? 'L' : 'M') + point[0] + ' ' + point[1]).join(' ') + 'Z';
  }
  static circleToPath(cx, cy, r) {
    return [
      "M", cx, ",", cy,
      "m", 0 - r, ",", 0,
      "a", r, ",", r, 0, 1, ",", 0, r * 2, ",", 0,
      "a", r, ",", r, 0, 1, ",", 0, 0 - r * 2, ",", 0,
      "z"
    ].join(' ').replace(/\s,\s/g, ",");
  }
  static donutPath(cx, cy, rOuter, rInner) {
    return this.circleToPath(cx, cy, rOuter) + " " + this.circleToPath(cx, cy, rInner);
  }

  static superscript(number) {
    return `${Math.floor(number)}${number % 1 != 0 ? '⁵' : ''}`;
  }

  // Restrict a number to a min + max range
  static restrictToRange(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }
  static setClass(el, className, state) {
    el.classList[state ? 'add' : 'remove'](className);
  }
}