class SampleCard extends HTMLElement {

  constructor() {
    super();
    // Make use of shadowRoot to avoid conflicts when reusing
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    // Make sure you validate all desired config options
    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    const root = this.shadowRoot;
    // recreate element every time we call setConfig
    if (root.lastChild) root.removeChild(root.lastChild);

    const cardConfig = Object.assign({}, config);
    // 
    if (!cardConfig.some_param) cardConfig.some_param = "default_value";

    // For a simple card you can use ha-card but you can also reuse existing card
    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = `
        ha-card {
          /* sample css */ 
          padding: 16px;
        }
      `;
    content.id = "container";
    // if you want to define more layers upfront 
    // content.innerHTML = `
    //   <div id="container">
    //     sample content
    //   </div>
    // `;
    card.header = cardConfig.title
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
    const entityState = hass.states[config.entity].state;
    const root = this.shadowRoot;
    // make sure you don't update things that didn't change
    if (entityState !== this._entityState) {
      root.getElementById("container").innerHTML = `Paulus is ${entityState}`;
      this._entityState = entityState;
    }
    // send hass to subcomponent if you reuse something else than ha-card
    root.lastChild.hass = hass;
  }

  getCardSize() {
    const root = this.shadowRoot;
    return 'getCardSize' in root.lastChild ? root.lastChild.getCardSize() : 1;
  }
}

customElements.define('sample-card', SampleCard);