class BeerCard extends HTMLElement {

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
    if (!cardConfig.icon) cardConfig.icon = "mdi:beer";
    if (!cardConfig.attribute) cardConfig.attribute = "list";

    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    const style = document.createElement('style');
    const icon = document.createElement('ha-icon');
    icon.icon = cardConfig.icon;
    style.textContent = `
        ha-card {
          position: relative;
        }
        ha-icon {
          float: left;
          margin-left: 30px;
          margin-top: 30px;
        }
        #container {
          padding: 30px;
          margin-left: 50px;
        }
      `;
    content.id = "container";
    card.appendChild(icon);
    card.header = cardConfig.title;
    card.appendChild(content);
    card.appendChild(style);
    root.appendChild(card);
    this._config = cardConfig;
  }

  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;
    if (hass.states[config.entity]) {
      let list = hass.states[config.entity].attributes[config.attribute];
      this.style.display = 'block';
      if (list !== undefined && list.length > 0) {
        list = list + '';
        root.getElementById("container").innerHTML = `${list.split(/[\n,]/).join("<br/>")}`;
      } else {
        this.style.display = 'none';
      }
      root.lastChild.hass = hass;
    } else {
      this.style.display = 'none';
    }
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('beer-card', BeerCard);