class CardTracker extends HTMLElement {

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
    if (!cardConfig.title) cardConfig.title = '📣 Updates';
    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = `
          ha-card {
            /* sample css */
          }
          table {
            width: 100%;
            padding: 0 32px 0 32px;
          }
          thead th {
            text-align: left;
          }
          tbody tr:nth-child(odd) {
            background-color: var(--paper-card-background-color);
          }
          tbody tr:nth-child(even) {
            background-color: var(--secondary-background-color);
          }
          .button {
            overflow: auto;
            padding: 16px;
          }
          paper-button {
            float: right;
          }
        `;
    content.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Current</th><th>Available</th></tr></thead>
        <tbody id='container'>
        </tbody>
      </table>
      <div class='button'>
        <paper-button raised>Update All</paper-button>
      </div>
    `;
    card.header = cardConfig.title
    card.appendChild(content);
    card.appendChild(style);
    card.querySelector('paper-button').addEventListener('click', event => {
      const list = this._filterCards(this.myhass.states[config.entity].attributes);
      list.forEach(el => {
          this.myhass.callService('custom_cards', 'update_cards', {'card': el[0] });
      });
    });
    root.appendChild(card);
    this._config = cardConfig;
  }

  _filterCards(attributes) {
    return Object.entries(attributes).filter(elem => elem[1].update !== 'False' && elem[0] != "friendly_name");
  }

  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;
    this.myhass = hass;

    if (hass.states[config.entity]) {
      const list = this._filterCards(hass.states[config.entity].attributes);
      this.style.display = 'block';
      if (list !== undefined && list.length > 0) {
        const updated_content = `
          ${list.map(elem => `
            <tr><td>${elem[0]}</td><td>${elem[1].installed!='False'?elem[1].installed:'n/a'}</td><td>${elem[1].version!='False'?elem[1].version:'n/a'}</td></tr>
          `).join('')}
        `;
        root.getElementById('container').innerHTML = updated_content;
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
customElements.define('cardtracker-card', CardTracker);