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
          td.has_update {
            color: red;
            font-weight: bold;
          }
        `;
    content.innerHTML = `
      <table id='content'>
        <thead><tr><th>Name</th><th>Current</th><th>Available</th></tr></thead>
        <tbody id='container'>
        </tbody>
      </table>
      <div class='button'>
        <paper-button raised id='update'>Update All</paper-button>
        <paper-button raised id='check'>Check</paper-button>
      </div>
    `;
    card.header = cardConfig.title
    card.appendChild(content);
    card.appendChild(style);
    card.querySelector('#update').addEventListener('click', event => {
      this.myhass.callService('custom_cards', 'update_cards', {});
    });
    card.querySelector('#check').addEventListener('click', event => {
      this.myhass.callService('custom_cards', 'check_versions', {});
    });
    root.appendChild(card);
    this._config = cardConfig;
  }

  _filterCards(attributes) {
    return Object.entries(attributes).filter(elem => elem[0] != "friendly_name");
  }

  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;
    this.myhass = hass;

    console.log((hass.states[config.entity]))
    if (hass.states[config.entity]) {
      const list = this._filterCards(hass.states[config.entity].attributes);
      this.style.display = 'block';
      if (list !== undefined && list.length > 0) {
        const updated_content = `
          ${list.map(elem => `
            <tr><td>${elem[0]}</td><td>${elem[1].local?elem[1].local:'n/a'}</td><td class='${elem[1].has_update?'has_update':''}'>${elem[1].remote?elem[1].remote:'n/a'}</td></tr>
          `).join('')}
        `;
        root.getElementById('container').innerHTML = updated_content;
      }
      root.lastChild.hass = hass;
    }
  }
  getCardSize() {
    return 1;
  }
}
customElements.define('card-tracker', CardTracker);