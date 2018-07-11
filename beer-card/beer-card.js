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
    content.innerHTML = `
      <div id="container">
      </div>
    `;
    card.appendChild(icon);
    card.header = cardConfig.title;
    card.appendChild(content);
    card.appendChild(style);
    card.addEventListener('click', event => {
      this._fire('hass-more-info', { entityId: cardConfig.entity });
    });
    root.appendChild(card);
    this._config = cardConfig;
  }
  _fire(type, detail, options) {
    const node = this.shadowRoot;
    options = options || {};
    detail = (detail === null || detail === undefined) ? {} : detail;
    const event = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
  }

  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;
    if (hass.states[config.entity]) {
      const list = hass.states[config.entity].attributes["list"];
      this.style.display = 'block';
      if (list !== undefined && list.length > 0) {
        root.getElementById("container").innerHTML = `${list.split("\n").join("<br/>")}`;
      } else {
        this.style.display = 'none';
      }
      root.lastChild.hass = hass;
    } else {
      this.style.display = 'none';
    }
  }

  getCardSize() {
    const root = this.shadowRoot;
    return 'getCardSize' in root.lastChild ? root.lastChild.getCardSize() : 1;
  }
}

customElements.define('beer-card', BeerCard);