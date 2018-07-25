export default class ThermostatUI {
  get container() {
    return this._container
  }
  constructor(config) {
    this._config = config; // need certain options for updates
    this._ticks = []; // need for dynamic tick updates
    this._container = document.createElement('div');
    this._container.className = 'dial_container';
    const style = document.createElement('style');
    style.textContent = this._renderStyle();
    this._container.appendChild(this._buildTitle(config.title));
    this._container.appendChild(style);
    const root = this._buildCore(config.diameter);
    root.appendChild(this._buildDial(config.radius));
    root.appendChild(this._buildTicks(config.num_ticks));
    root.appendChild(this._buildRing(config.radius));
    root.appendChild(this._buildLeaf(config.radius));
    root.appendChild(this._buildAmbientSlot());
    root.appendChild(this._buildTargetTemperature(config.radius));
    root.appendChild(this._buildAway(config.radius));
    this._container.appendChild(root);
    this._root = root;
  }

  updateState(options) {
    const min_value = options.min_value || 10;
    const away = options.away || false;
    const max_value = options.max_value || 30;
    const hvac_state = options.hvac_state;
    const ambient_temperature = options.ambient_temperature;
    const target_temperature = options.target_temperature;

    // update states (must make checks in the future)
    this._updateLeaf(away);
    this._updateAway(away);
    this._updateHvacState(hvac_state);
    this._updateAmbientTemperature(ambient_temperature, target_temperature, min_value, max_value)
    this._updateTicks(min_value, max_value, ambient_temperature, target_temperature);
    this._updateTargetTemperature(target_temperature);
  }

  _updateLeaf(show_leaf) {
    SvgUtil.setClass(this._root, 'has-leaf', show_leaf);
  }

  _updateTargetTemperature(target_temperature) {
    const lblTarget = this._root.querySelector('#target_temperature');
    lblTarget.textContent = Math.floor(target_temperature);
    if (target_temperature % 1 != 0) {
      lblTarget.textContent += '⁵';
    }
  }

  _updateAmbientTemperature(ambient_temperature, target_temperature, min_value, max_value) {
    const config = this._config;
    const lblAmbient = this._root.querySelector('#ambient_temperature');
    lblAmbient.textContent = Math.floor(ambient_temperature);
    if (ambient_temperature % 1 != 0) {
      lblAmbient.textContent += '⁵';
    }
    const peggedValue = SvgUtil.restrictToRange(ambient_temperature, min_value, max_value);
    const ambient_position = [config.radius, config.ticks_outer_radius - (config.ticks_outer_radius - config.ticks_inner_radius) / 2];
    let degs = config.tick_degrees * (peggedValue - min_value) / (max_value - min_value) - config.offset_degrees;
    if (peggedValue > target_temperature) {
      degs += 8;
    } else {
      degs -= 8;
    }
    var pos = SvgUtil.rotatePoint(ambient_position, degs, [config.radius, config.radius]);
    SvgUtil.attributes(lblAmbient, {
      x: pos[0],
      y: pos[1]
    });
  }

  _updateAway(away) {
    SvgUtil.setClass(this._root, 'away', away);
  }

  _updateHvacState(hvac_state) {
    this._root.classList.forEach(c => {
      if (c.indexOf('dial--state--') != -1)
        this._root.classList.remove(c);
    });
    this._root.classList.add('dial--state--' + hvac_state);
  }

  _updateTicks(min_value, max_value, ambient_temperature, target_temperature) {
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

    const min = SvgUtil.restrictToRange(Math.round((Math.min(ambient_temperature, target_temperature) - min_value) / (max_value - min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const max = SvgUtil.restrictToRange(Math.round((Math.max(ambient_temperature, target_temperature) - min_value) / (max_value - min_value) * config.num_ticks), 0, config.num_ticks - 1);
    this._ticks.forEach((tick, iTick) => {
      const isLarge = iTick == min || iTick == max;
      const isActive = iTick >= min && iTick <= max;
      const theta = config.tick_degrees / config.num_ticks;
      SvgUtil.attributes(tick, {
        d: SvgUtil.pointsToPath(SvgUtil.rotatePoints(isLarge ? tickPointsLarge : tickPoints, iTick * theta - config.offset_degrees, [config.radius, config.radius])),
        class: isActive ? 'active' : ''
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

  _buildAmbientSlot() {
    return SvgUtil.createSVGElement('text', {
      class: 'dial__lbl dial__lbl--ambient',
      id: 'ambient_temperature'
    })
  }
  // TODO: Refactor this to allow dual temperature & link to decimals
  _buildTargetTemperature(radius) {
    return SvgUtil.createSVGElement('text', {
      x: radius,
      y: radius,
      class: 'dial__lbl dial__lbl--target',
      id: 'target_temperature'
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
        text-align: center;
        color: var(--primary-text-color);
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
      .dial__lbl--ambient {
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