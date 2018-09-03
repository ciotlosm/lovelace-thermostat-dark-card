class EntityAttributesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  _getAttributes(hass, filters) {
    function _filterName(stateObj, pattern) {
      let parts;
      let attr_id;
      let attribute;
      if (typeof (pattern) === "object") {
        parts = pattern["key"].split(".");
        attribute = pattern["key"];
        
      } else {
        parts = pattern.split(".");
        attribute = pattern;
      }
      attr_id = parts[2];
      if (attr_id.indexOf('*') === -1) {
        return stateObj == attribute;
      }
      const regEx = new RegExp(`^${attribute.replace(/\*/g, '.*')}$`, 'i');
      return stateObj.search(regEx) === 0;
    }
    const attributes = new Map();
    filters.forEach((filter) => {
      const filters = [];
      filters.push(stateObj => _filterName(stateObj, filter));
      Object.keys(hass.states).sort().forEach(key => {
        Object.keys(hass.states[key].attributes).sort().forEach(attr_key => {
          if (filters.every(filterFunc => filterFunc(`${key}.${attr_key}`))) {
            attributes.set(`${key}.${attr_key}`, {
              name: `${filter.name?filter.name:attr_key.replace(/_/g, ' ')}`,
              value: `${hass.states[key].attributes[attr_key]} ${filter.unit||''}`.trim(),
            });
          }  
        });
      });
    });
    return Array.from(attributes.values());
  }

  setConfig(config) {
    if (!config.filter.include || !Array.isArray(config.filter.include)) {
      throw new Error('Please define filters');
    }

    if (!config.heading_name) config.heading_name = 'Attributes';
    if (!config.heading_state) config.heading_state = 'States';

    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);

    const cardConfig = Object.assign({}, config);
    const card = document.createElement('ha-card');
    card.header = config.title;
    const content = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = `
      table {
        width: 100%;
        padding: 16px;
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
    `;
    content.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>${config.heading_name}</th>
            <th>${config.heading_state}</th>
          </tr>
        </thead>
        <tbody id='attributes'>
        </tbody>
      </table>
      `;
    card.appendChild(style);
    card.appendChild(content);
    root.appendChild(card)
    this._config = cardConfig;
  }

  _updateContent(element, attributes) {
    element.innerHTML = `
      <tr>
        ${attributes.map((attribute) => `
          <tr>
            <td>${attribute.name}</td>
            <td>${attribute.value}</td>
          </tr>
        `).join('')}
      `;
  }

  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;

    let attributes = this._getAttributes(hass, config.filter.include);
    if (config.filter.exclude) {
      const excludeAttributes = this._getAttributes(hass, config.filter.exclude).map(attr => attr.name);
      attributes = attributes.filter(attr => {
        return !excludeAttributes.includes(attr.name)
      });
    }
    this._updateContent(root.getElementById('attributes'), attributes);
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('entity-attributes-card', EntityAttributesCard);
