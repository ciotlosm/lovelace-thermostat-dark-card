class BigNumberCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);
    const cardConfig = Object.assign({}, config);
    if (!cardConfig.scale) cardConfig.scale = "50px";
    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    content.id = "value"
    const title = document.createElement('div');
    title.id = "title"
    title.textContent = config.title;
    const style = document.createElement('style');
    style.textContent = `
      ha-card {
        text-align: center;
        --base-unit: ${cardConfig.scale};
        padding: calc(var(--base-unit)*0.6) calc(var(--base-unit)*0.3);
      }
      #value {
        font-size: calc(var(--base-unit) * 1.3);
        line-height: calc(var(--base-unit) * 1.3);
        color: var(--primary-text-color);
      }
      #title {
        font-size: calc(var(--base-unit) * 0.7);
        line-height: calc(var(--base-unit) * 0.5);
        color: var(--secondary-text-color);
      }
    `;
    card.appendChild(content);
    card.appendChild(title);
    card.appendChild(style);
    root.appendChild(card);
    this._config = cardConfig;
  }

  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;
    const entityState = hass.states[config.entity].state;
    const measurement = hass.states[config.entity].attributes.unit_of_measurement;

    if (entityState !== this._entityState) {
      root.getElementById("value").textContent = `${entityState} ${measurement}`;
      this._entityState = entityState
    }
    root.lastChild.hass = hass;
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('bignumber-card', BigNumberCard);