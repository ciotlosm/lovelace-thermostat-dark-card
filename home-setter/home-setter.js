class HomeSetter extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    const root = this.shadowRoot;
    this._elements = [];
    if (!config.pages || !Array.isArray(config.pages)) {
      throw new Error('Please specify a valid pages list');
    }

    if (root.lastChild) root.removeChild(root.lastChild);
    const cardConfig = Object.assign({}, config);
    const card = document.createElement('ha-card');
    card.header = config.title;
    const content = document.createElement('table');
    const style = document.createElement('style');
    content.innerHTML = this._setupContent();
    style.textContent = this._setupStyle();
    card.appendChild(style);
    card.appendChild(content);
    this._content = content;
    content.querySelector('#content').innerHTML = this._setupRows(cardConfig);

    content.querySelectorAll('.row').forEach(element => {
      element.addEventListener('click', event => {
        this._setHome(element);
      })
    })
    root.appendChild(card)
    this._config = cardConfig;
  }

  set hass(hass) {

  }

  getCardSize() {
    return 1;
  }

  _setHome(element) {
    this._content.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    // set default
    localStorage.defaultPage = this._elements[element.getAttribute('index')].path;
    // add default class
    element.querySelector('.action').classList.add('active');
  }

  _setupRows(config) {
    let content = '';
    config.pages.forEach((element, key) => {
      this._elements.push(element);
      content += `<tr class='row' index='${key}'><td>${element.name}</td><td>${element.path}</td><td class='${element.path == localStorage.defaultPage ? 'active' : ''} action'><div class='home'>home</div><div class='set'>set</div></td></tr>`
    })
    return content;
  }

  _setupContent() {
    return `
      <thead>
        <tr><th>Name</th><th>Path</th><th>Default?</th></tr>
      </thead>
      <tbody id='content'></tbody>
    `
  }
  _setupStyle() {
    return `
      table {
        width: 100%;
        padding: 16px;
      }
      thead th {
        text-align: left;
        font-weight: bold;
      }
      tbody tr:nth-child(odd) {
        background-color: var(--paper-card-background-color);
      }
      tbody tr:nth-child(even) {
        background-color: var(--secondary-background-color);
      }
      .home {
        display: none;
        opacity: 0.4;
      }
      .set {
        display: block;
      }
      .active .home {
        display: block;
      }
      .active .set {
        display: none;
      }
    `
  }

}

customElements.define('home-setter', HomeSetter);
