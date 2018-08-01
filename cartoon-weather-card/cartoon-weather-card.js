class CartoonWeatherCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);

    if (!config.entity) {
      throw new Error('Please specify an entity');
    }

    this._config = cardConfig;
  }

  set hass(hass) {
    const config = this._config;
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('cartoon-weather-card', CartoonWeatherCard);
