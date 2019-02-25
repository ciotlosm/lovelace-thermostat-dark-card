class AlarmControlPanelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._icons = {
      'armed_away': 'mdi:shield-lock',
      'armed_custom_bypass': 'mdi:security',
      'armed_home': 'mdi:shield-home',
      'armed_night': 'mdi:shield-home',
      'disarmed': 'mdi:shield-check',
      'pending': 'mdi:shield-outline',
      'triggered': 'hass:bell-ring',
    }
  }

  set hass(hass) {
    const entity = hass.states[this._config.entity];

    if (entity) {
      this.myhass = hass;
      if(!this.shadowRoot.lastChild) {
        this._createCard(entity);
      }
      if (entity.state != this._state) {
        this._state = entity.state;
        this._updateCardContent(entity);
      }
    }
  }

  _createCard(entity) {
    const config = this._config;

    const card = document.createElement('ha-card');
    card.innerHTML = `
      ${this._iconLabel()}
      ${config.title ? '<div id="state-text"></div>' : ''}
    `;
    const content = document.createElement('div');
    content.id = "content";
    content.style.display = config.auto_hide ? 'none' : '';
    content.innerHTML = `
      ${this._actionButtons()}
      ${entity.attributes.code_format ?
          `<paper-input label='${this._label("ui.card.alarm_control_panel.code")}'
          type="password"></paper-input>` : ''}
      ${this._keypad(entity)}
    `;
    card.appendChild(this._style(config.style, entity));
    card.appendChild(content);
    this.shadowRoot.appendChild(card);

    this._setupInput();
    this._setupKeypad();
    this._setupActions();
  }

  connectedCallback() {
  }

  setConfig(config) {
    if (!config.entity || config.entity.split(".")[0] !== "alarm_control_panel") {
      throw new Error('Please specify an entity from alarm_control_panel domain.');
    }
    if (config.auto_enter) {
      if (!config.auto_enter.code_length || !config.auto_enter.arm_action) {
        throw new
          Error('Specify both code_length and arm_action when using auto_enter.');
      }
      this._arm_action = config.auto_enter.arm_action;
    }
    if (!config.states) config.states = ['arm_away', 'arm_home'];
    if (!config.scale) config.scale = '15px';
    this._config = Object.assign({}, config);

    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);
  }

  _updateCardContent(entity) {
    const root = this.shadowRoot;
    const card = root.lastChild;
    const config = this._config;

    const state_str = "state.alarm_control_panel." + this._state;
    if (config.title) {
      card.header = config.title;
      root.getElementById("state-text").innerHTML = this._label(state_str);
      root.getElementById("state-text").className = `state ${this._state}`;
    } else {
      card.header = this._label(state_str);
    }

    root.getElementById("state-icon").setAttribute("icon",
      this._icons[this._state] || 'mdi:shield-outline');
    root.getElementById("badge-icon").className = this._state;

    var iconText = this._stateIconLabel(this._state);
    if (iconText === "") {
      root.getElementById("icon-label").style.display = "none";
    } else {
      root.getElementById("icon-label").style.display = "";
      if (iconText.length > 5) {
        root.getElementById("icon-label").className = "label big";
      } else {
	root.getElementById("icon-label").className = "label";
      }
      root.getElementById("icon-text").innerHTML = iconText;
    }

    const armVisible = (this._state === 'disarmed');
    root.getElementById("arm-actions").style.display = armVisible ? "" : "none";
    root.getElementById("disarm-actions").style.display = armVisible ? "none" : "";
  }

  _actionButtons() {
    const armVisible = (this._state === 'disarmed');
    return `
      <div id="arm-actions" class="actions">
        ${this._config.states.map(el => `${this._actionButton(el)}`).join('')}
      </div>
      <div id="disarm-actions" class="actions">
        ${this._actionButton('disarm')}
      </div>`;
  }

  _stateIconLabel(state) {
    const stateLabel = state.split("_").pop();
    return stateLabel === "disarmed" ||
      stateLabel === "triggered" ||
      !stateLabel
      ? ""
      : stateLabel;
  }

  _iconLabel() {
    return `
      <ha-label-badge-icon id="badge-icon">
        <div class="badge-container" id="badge-container">
          <div class="label-badge" id="badge">
            <div class="value">
              <ha-icon id="state-icon"/>
            </div>
            <div class="label" id="icon-label">
              <span id="icon-text"/>
            </div>
          </div>
        </div>
    </ha-label-badge-icon>`;	  
  }

  _actionButton(state) {
    return `<mwc-button outlined id="${state}">
      ${this._label("ui.card.alarm_control_panel." + state)}</mwc-button>`;
  }

  _setupActions() {
    const root = this.shadowRoot;
    const card = this.shadowRoot.lastChild;
    const config = this._config;

    if (config.auto_hide) {
      root.getElementById("badge-icon").addEventListener('click', event => {
        var content = root.getElementById("content");
        if (content.style.display === 'none') {
          content.style.display = '';
        } else {
          content.style.display = 'none';
        }
      })
    }

    if (config.auto_enter) {
      card.querySelectorAll(".actions mwc-button").forEach(element => {
        element.classList.remove('autoarm');
        if (element.id === this._arm_action || element.id === 'disarm') {
          element.classList.add('autoarm');
        }
        element.addEventListener('click', event => {
          card.querySelectorAll(".actions mwc-button").forEach(element => {
            element.classList.remove('autoarm');
          })
          element.classList.add('autoarm');
          if (element.id !== 'disarm') this._arm_action = element.id;
        })
      })
    } else {
      card.querySelectorAll(".actions mwc-button").forEach(element => {
        element.addEventListener('click', event => {
          const input = card.querySelector('paper-input');
          const value = input ? input.value : '';
          this._callService(element.id, value);
        })
      })
    }
  }

  _callService(service, code) {
    const input = this.shadowRoot.lastChild.querySelector("paper-input");
    this.myhass.callService('alarm_control_panel', `alarm_${service}`, {
      entity_id: this._config.entity,
      code: code,
    });
    if (input) input.value = '';
  }

  _setupInput() {
    if (this._config.auto_enter) {
      const input = this.shadowRoot.lastChild.querySelector("paper-input");
      input.addEventListener('input', event => { this._autoEnter() })
    }
  }

  _setupKeypad() {
    const root = this.shadowRoot;

    const input = root.lastChild.querySelector('paper-input');
    root.querySelectorAll(".pad mwc-button").forEach(element => {
      if (element.getAttribute('value') === 
        this._label("ui.card.alarm_control_panel.clear_code")) {
        element.addEventListener('click', event => {
          input.value = '';
        })
      } else {
        element.addEventListener('click', event => {
          input.value += element.getAttribute('value');
          this._autoEnter();
        })
      }
    });
  }

  _autoEnter() {
    const config = this._config;

    if (config.auto_enter) {
      const card = this.shadowRoot.lastChild;
      const code = card.querySelector("paper-input").value;
      if (code.length == config.auto_enter.code_length) {
        const service = card.querySelector(".actions .autoarm").id;
        this._callService(service, code);
      }
    }
  }

  _keypad(entity) {
    if (this._config.hide_keypad || !entity.attributes.code_format) return '';

    return `
      <div class="pad">
        <div>
          ${this._keypadButton("1", "")}
          ${this._keypadButton("4", "GHI")}
          ${this._keypadButton("7", "PQRS")}
        </div>
        <div>
          ${this._keypadButton("2", "ABC")}
          ${this._keypadButton("5", "JKL")}
          ${this._keypadButton("8", "TUV")}
          ${this._keypadButton("0", "")}
        </div>
        <div>
          ${this._keypadButton("3", "DEF")}
          ${this._keypadButton("6", "MNO")}
          ${this._keypadButton("9", "WXYZ")}
          ${this._keypadButton(this._label("ui.card.alarm_control_panel.clear_code"), "")}
        </div>
      </div>`
  }

  _keypadButton(button, alpha) {
    let letterHTML = '';
    if (this._config.display_letters) {
      letterHTML = `<div class='alpha'>${alpha}</div>`
    }
    return `<mwc-button dense value="${button}">${button}${letterHTML}
      </mwc-button>`;
  }

  _style(icon_style, entity) {
    const style = document.createElement('style');
    style.textContent = `
      ha-card {
        ${(this._config.hide_keypad ||
	   !entity.attributes.code_format) ? 'padding-bottom: 16px;' : '' }
        position: relative;
        --alarm-color-disarmed: var(--label-badge-green);
        --alarm-color-pending: var(--label-badge-yellow);
        --alarm-color-triggered: var(--label-badge-red);
        --alarm-color-armed: var(--label-badge-red);
        --alarm-color-autoarm: rgba(0, 153, 255, .1);
        --alarm-state-color: var(--alarm-color-armed);
        --base-unit: ${this._config.scale};
        font-size: calc(var(--base-unit));
        ${icon_style}
      }
      ha-icon {
        color: var(--alarm-state-color);
	width: 24px;
	height: 24px;
      }
      ha-label-badge-icon {
        --ha-label-badge-color: var(--alarm-state-color);
        --label-badge-text-color: var(--alarm-state-color);
        --label-badge-background-color: var(--paper-card-background-color);
        color: var(--alarm-state-color);
        position: absolute;
        right: 12px;
        top: 12px;
      }
      .badge-container {
        display: inline-block;
        text-align: center;
        vertical-align: top;
      }
      .label-badge {
        position: relative;
        display: block;
        margin: 0 auto;
        width: var(--ha-label-badge-size, 2.5em);
        text-align: center;
        height: var(--ha-label-badge-size, 2.5em);
        line-height: var(--ha-label-badge-size, 2.5em);
        font-size: var(--ha-label-badge-font-size, 1.5em);
        border-radius: 50%;
        border: 0.1em solid var(--ha-label-badge-color, var(--primary-color));
        color: var(--label-badge-text-color, rgb(76, 76, 76));
        white-space: nowrap;
        background-color: var(--label-badge-background-color, white);
        background-size: cover;
        transition: border 0.3s ease-in-out;
      }
      .label-badge .value {
        font-size: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label-badge .value.big {
        font-size: 70%;
      }
      .label-badge .label {
        position: absolute;
        bottom: -1em;
        /* Make the label as wide as container+border. (parent_borderwidth / font-size) */
        left: -0.2em;
        right: -0.2em;
        line-height: 1em;
        font-size: 0.5em;
      }
      .label-badge .label span {
        box-sizing: border-box;
        max-width: 100%;
        display: inline-block;
        background-color: var(--ha-label-badge-color, var(--primary-color));
        color: var(--ha-label-badge-label-color, white);
        border-radius: 1em;
        padding: 9% 16% 8% 16%; /* mostly apitalized text, not much descenders => bit more top margin */
        font-weight: 500;
        overflow: hidden;
        text-transform: uppercase;
        text-overflow: ellipsis;
        transition: background-color 0.3s ease-in-out;
        text-transform: var(--ha-label-badge-label-text-transform, uppercase);
      }
      .label-badge .label.big span {
        font-size: 90%;
        padding: 10% 12% 7% 12%; /* push smaller text a bit down to center vertically */
      }
      .badge-container .title {
        margin-top: 1em;
        font-size: var(--ha-label-badge-title-font-size, 0.9em);
        width: var(--ha-label-badge-title-width, 5em);
        font-weight: var(--ha-label-badge-title-font-weight, 400);
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: normal;
      }
      .disarmed {
        --alarm-state-color: var(--alarm-color-disarmed);
      }
      .triggered {
        --alarm-state-color: var(--alarm-color-triggered);
        animation: pulse 1s infinite;
      }
      .arming {
        --alarm-state-color: var(--alarm-color-pending);
        animation: pulse 1s infinite;
      }
      .pending {
        --alarm-state-color: var(--alarm-color-pending);
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0% {
          --ha-label-badge-color: var(--alarm-state-color);
        }
        100% {
          --ha-label-badge-color: rgba(255, 153, 0, 0.3);
        }
      }
      paper-input {
        margin: auto;
        max-width: 200px;
        font-size: calc(var(--base-unit));
      }
      .state {
        margin-left: 20px;
        font-size: calc(var(--base-unit) * 0.9);
        position: relative;
        bottom: 16px;
        color: var(--alarm-state-color);
        animation: none;
      }
      .pad {
        display: flex;
        justify-content: center;
      }
      .pad div {
        display: flex;
        flex-direction: column;
      }
      .pad mwc-button {
        margin-bottom: 10%;
        position: relative;
        padding: calc(var(--base-unit));
        font-size: calc(var(--base-unit) * 1.1);
      }
      .actions {
        margin: 0 8px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        font-size: calc(var(--base-unit) * 1);
      }
      .actions mwc-button {
        min-width: calc(var(--base-unit) * 9);
        color: var(--primary-color);
		margin-top: 0px;
		margin-right: 4px;
		margin-bottom: 0px;
		margin-left: 4px;
      }
      .actions .autoarm {
        background: var(--alarm-color-autoarm);
      }
      mwc-button#disarm {
        color: var(--google-red-500);
      }
      .alpha {
        position: absolute;
        text-align: center;
        bottom: calc(var(--base-unit) * 0.1);
        color: var(--secondary-text-color);
        font-size: calc(var(--base-unit) * 0.7);
      }
    `;
    return style;
  }

  _label(label, default_label=undefined) {
    // Just show "raw" label; useful when want to see underlying const
    // so you can define your own label.
    if (this._config.show_label_ids) return label;

    if (this._config.labels && this._config.labels[label])
      return this._config.labels[label];

    const lang = this.myhass.selectedLanguage || this.myhass.language;
    const translations = this.myhass.resources[lang];
    if (translations && translations[label]) return translations[label];

    if (default_label) return default_label;

    // If all else fails then pretify the passed in label const
    const last_bit = label.split('.').pop();
    return last_bit.split('_').join(' ').replace(/^\w/, c => c.toUpperCase());
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('alarm_control_panel-card', AlarmControlPanelCard);
