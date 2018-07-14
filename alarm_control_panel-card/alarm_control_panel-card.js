class AlarmControlPanelCard extends HTMLElement {
  constructor() {
    super();
    this._armedStates = ['armed_home', 'armed_away', 'armed_night', 'armed_custom_bypass'];
    this.attachShadow({ mode: 'open' });
    this._enteredCode = '';
  }

  setConfig(config) {
    if (!config.entity && config.entity.split(".")[0] != "alarm_control_panel") {
      throw new Error('Please specify an entity from alarm_control_panel domain.');
    }
    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);
    const cardConfig = Object.assign({}, config);
    const card = document.createElement('ha-card');
    card.header = config.title;
    const content = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = `
      ha-card {
        padding-bottom: 16px;
        position: relative;
      }
      ha-icon {
        color: var(--paper-item-icon-color);
        position: absolute;
        right: 20px;
        top: 32px;
      }
      paper-input {
        margin: auto;
        max-width: 200px;
      }
      .state {
        margin-left: 20px;
        position: relative;
        bottom: 16px;
        color: var(--secondary-text-color)
      }
      .pad {
        display: flex;
        justify-content: center;
      }
      .pad div {
        display: flex;
        flex-direction: column;
      }
      .pad paper-button {
        width: 80px;
        margin-bottom: 8px;
      }
      .actions {
        margin: 0 8px;
        display: flex;
        justify-content: center;
      }
      .actions paper-button {
        min-width: 150px;
        color: var(--primary-color);
      }
      paper-button.disarm {
        color: var(--google-red-500);
      }
    `;
    content.id = "content";
    card.appendChild(style);
    card.appendChild(content);
    root.appendChild(card)
    this._config = cardConfig;
  }

  set hass(hass) {
    const config = this._config;
    const entity = hass.states[config.entity];
    this._updateCardContent(entity);
  }

  _isNumber(format) {
    return format === 'Number';
  }

  _validateCode(code, format) {
    return !code || !format || code.length > 0;
  }

  _getIcon(entity) {
    let state = entity.state;
    switch (state) {
      case 'disarmed':
        return 'hass:bell-outline'
      case 'armed_home':
        return 'hass:bell-plus'
      case 'pending':
      case 'armed_away':
        return 'hass:bell'
    }
    return 'hass:bell'
  }

  _translateState(state) {
    switch (state) {
      case 'disarmed':
        return 'Disarmed'
      case 'armed_home':
        return 'Armed home'
      case 'pending':
        return 'Pending'
      case 'armed_away':
        return 'Armed away'
    } 
    return 'Unknown'
  }

  _updateCardContent(entity) {
    const root = this.shadowRoot;
    const _armVisible = entity.state === 'disarmed';
    const _disarmVisible = (this._armedStates.includes(entity.state) || entity.state === 'pending' || entity.state === 'triggered');
    const codeDisabled = !(_disarmVisible || _armVisible)?'disabled':'';
    const buttonsDisabled = (!this._validateCode(this._enteredCode, entity.attributes.code_format))?'':'disabled';
    if (!this._config.title) {
      this.shadowRoot.lastChild.header = this._translateState(entity.state);
    }
    const content = `
      <ha-icon icon='${this._getIcon(entity)}'></ha-icon>
      ${this._config.title?`<div class='state'>${this._translateState(entity.state)}</div>`:''}
      <div class="actions">
        ${_disarmVisible ? `
          <paper-button raised class="disarm" ${buttonsDisabled} id='disarm'>
            Disarm
          </paper-button>
        `: ''}
        ${_armVisible ? `
          <paper-button raised ${buttonsDisabled} id='arm_home'>
            Arm Home
          </paper-button>
          <paper-button raised ${buttonsDisabled} id='arm_away'>
            Arm Away
          </paper-button>
        `: ''}
      </div>
      ${entity.attributes.code_format ? `
        <paper-input
          label="Alarm code"
          value=""
          type="password"
          ${codeDisabled}
        ></paper-input>
      `: ''}
      ${this._isNumber(entity.attributes.code_format) ? `
          <div class="pad">
            <div>
              <paper-button ${codeDisabled} data-digit="1" raised>1</paper-button>
              <paper-button ${codeDisabled} data-digit="4" raised>4</paper-button>
              <paper-button ${codeDisabled} data-digit="7" raised>7</paper-button>
            </div>
            <div>
              <paper-button ${codeDisabled} data-digit="2" raised>2</paper-button>
              <paper-button ${codeDisabled} data-digit="5" raised>5</paper-button>
              <paper-button ${codeDisabled} data-digit="8" raised>8</paper-button>
              <paper-button ${codeDisabled} data-digit="0" raised>0</paper-button>
            </div>
            <div>
              <paper-button ${codeDisabled} data-digit="3" raised>3</paper-button>
              <paper-button ${codeDisabled} data-digit="6" raised>6</paper-button>
              <paper-button ${codeDisabled} data-digit="9" raised>9</paper-button>
              <paper-button ${codeDisabled} id='clear' raised>
                Clear
              </paper-button>
            </div>
          </div>
      `: ''}
    `;


    root.getElementById("content").innerHTML = content;
  }
  getCardSize() {
    return 1;
  }
}
customElements.define('alarm_control_panel-card', AlarmControlPanelCard);