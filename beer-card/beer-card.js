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
    if (!cardConfig.icon) cardConfig.icon = 'mdi:beer';
    if (!cardConfig.attribute) cardConfig.attribute = 'list';
    if (!cardConfig.list_type) cardConfig.list_type = 'none';

    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    const style = document.createElement('style');
    const icon = document.createElement('ha-icon');
    const [prefix, type] = cardConfig.icon.split('.', 2);
    ['png', 'jpg', 'svg', 'gif'].includes(type)?icon.src = cardConfig.icon:icon.icon = cardConfig.icon;
    style.textContent = `
        ha-card {
          position: relative;
          ${cardConfig.style}
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
    content.id = 'container';
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
      const list = `${hass.states[config.entity].attributes[config.attribute]}`;
      this.style.display = 'block';
      if (list !== 'undefined' && list.length > 0) {
        root.getElementById('container').innerHTML = '<ul style=\'list-style-type:' + `${config.list_type}` + '\'><li>' + `${list.split(/[\n,]/).join('</li><li>')}` + '</li></ul>';
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