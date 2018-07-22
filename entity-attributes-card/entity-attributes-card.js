class EntityAttributesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  _getAttributes(hass, filters) {
    function _filterName(stateObj, pattern) {
      let entity_id;
      let parts;
      let attr_id;
      if (typeof (pattern) === "object") {
        parts = pattern["key"].split(".");
        // attr_name = pattern["name"]
      } else {
        parts = pattern.split(".");
        // attr_name = parts[2];
      }
      entity_id = `${parts[0]}.${parts[1]}`;
      attr_id = parts[2];
      if (attr_id.indexOf('*') === -1) {
        return stateObj == pattern["key"];
      }
      const regEx = new RegExp(`^${pattern["key"].replace(/\*/g, '.*')}$`, 'i');
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
              name: `${attr_key}`,
              value: hass.states[key].attributes[attr_key],
            });
          }  
        });
      });
    });
    return Array.from(attributes.values());
  }

  setConfig(config) {

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
            <th>Attribute</th>
            <th>Status</th> 
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
    const attrList = [];

    let attributes = this._getAttributes(hass, config.filter.include);
    if (config.filter.exclude) {
      const excludeAttributes = this._getAttributes(hass, config.filter.exclude);
      attributes = attributes.filter(attr => !excludeAttributes.includes(attr));
    }



    // config.attributes.forEach(attribute => {
    //   let entity_id;
    //   let attr_name;
    //   let parts;
    //   let attr_id;
    //   let attr_value;
    //   if (typeof (attribute) === "object") {
    //     parts = attribute["key"].split(".");
    //     attr_name = attribute["name"]
    //   } else {
    //     parts = attribute.split(".");
    //     attr_name = parts[2];
    //   }
    //   entity_id = `${parts[0]}.${parts[1]}`;
    //   attr_id = parts[2];
    //   if (hass.states[entity_id]) {
    //     attr_value = hass.states[entity_id].attributes[attr_id];
    //     if (attr_value) {
    //       attrList.push({
    //         "name": attr_name,
    //         "value": attr_value,
    //       });
    //     }
    //   }
    // });
    this._updateContent(root.getElementById('attributes'), attributes);
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('entity-attributes-card', EntityAttributesCard);