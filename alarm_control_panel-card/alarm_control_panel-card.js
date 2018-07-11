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
      paper-input {
        margin: auto;
        max-width: 200px;
      }
      .pad {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
      }
      .pad div {
        display: flex;
        flex-direction: column;
      }
      .pad paper-button {
        width: 80px;
      }
      .actions paper-button {
        min-width: 160px;
        margin-bottom: 16px;
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

  _updateCardContent(entity) {
    const root = this.shadowRoot;
    const _armVisible = entity.state === 'disarmed';
    const _disarmVisible = (this._armedStates.includes(entity.state) || entity.state === 'pending' || entity.state === 'triggered');
    const codeDisabled = !(_disarmVisible || _armVisible)?'disabled':'';
    const buttonsDisabled = !this._validateCode(this._enteredCode, entity.attributes.code_format)?'disabled':'';
    const content = `
      ${entity.attributes.code_format ? `
        <paper-input
          label="Alarm code"
          value="${this._enteredCode}"
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
              <paper-button ${codeDisabled} raised>
                Clear
              </paper-button>
            </div>
          </div>
      `: ''}
      <div class="layout horizontal center-justified actions">
        ${_disarmVisible ? `
          <paper-button raised class="disarm" on-click="_callService" data-service="alarm_disarm" ${buttonsDisabled}">
            Disarm
          </paper-button>
        `: ''}
        ${_armVisible ? `
          <paper-button raised on-click="_callService" data-service="alarm_arm_home" ${buttonsDisabled}>
            Arm Home
          </paper-button>
          <paper-button raised on-click="_callService" data-service="alarm_arm_away" ${buttonsDisabled}">
            Arm Away
          </paper-button>
        `: ''}
      </div>
    `;


    root.getElementById("content").innerHTML = content;
  }
  getCardSize() {
    return 1;
  }
}
customElements.define('alarm_control_panel-card', AlarmControlPanelCard);