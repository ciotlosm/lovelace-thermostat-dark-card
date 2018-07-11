class BeerCard extends HTMLElement {

  constructor() {
    super();
    // Make use of shadowRoot to avoid conflicts when reusing
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    // Make sure you validate all desired config options
    // The Great Deciever West Coast Beersmiths\nFlyktsoda IPA Omnipollo\nOriginal Ice Cream Pale Ale Omnipollo\nMilkshake IPA (Strawberry) Omnipollo\nHalf & Half Lemonade Iced Tea IPA Evil Twin Brewing\nHabanero Sculpin Ballast Point Brewing CompanyThe Great Deciever West Coast Beersmiths\nFlyktsoda IPA Omnipollo\nOriginal Ice Cream Pale Ale Omnipollo\nMilkshake IPA (Strawberry) Omnipollo\nHalf & Half Lemonade Iced Tea IPA Evil Twin Brewing\nHabanero Sculpin Ballast Point Brewing Company
    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    const root = this.shadowRoot;
    // recreate element every time we call setConfig
    if (root.lastChild) root.removeChild(root.lastChild);

    const cardConfig = Object.assign({}, config);
    // A custom parameter used only by this card
    if (!cardConfig.icon) cardConfig.icon = "mdi:beer";

    // For a simple card you can use ha-card but you can also reuse existing card
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
    // Make use of card header for titles (formatted automatically)
    card.header = cardConfig.title;
    card.appendChild(content);
    card.appendChild(style);
    // allow element to open more-info dialog
    card.addEventListener('click', event => {
      this._fire('hass-more-info', { entityId: cardConfig.entity });
    });
    root.appendChild(card);
    this._config = cardConfig;
  }

  // Sample method to fire events to open more-info dialog for example
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
    // make sure we run code only if entity is in states
    if (hass.states[config.entity]) {
      const list = hass.states[config.entity].attributes["list"];
      this.style.display = 'block';
      // make sure you don't update things that didn't change
      if (list !== undefined && list.length > 0) {
        root.getElementById("container").innerHTML = `${list.split("\n").join("<br/>")}`;
      } else {
        this.style.display = 'none';
      }
      // send hass to subcomponent if you reuse something else than ha-card
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