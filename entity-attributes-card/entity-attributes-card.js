function _updateStyle(element) {
    element.textContent = `
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
  }
  
  function _updateContent(element, attributes) {
    element.innerHTML = `
    <tr>
      ${attributes.map( (attribute) => `
        <tr>
          <td>${attribute.name}</td>
          <td>${attribute.value}</td>
        </tr>
      `).join('')}
    `;
  }
  
  class EntityAttributesCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    setConfig(config) {
      if (!config.entity) {
        throw new Error('Please define an entity');
      }
      if (!config.attributes || !Array.isArray(config.attributes)) {
        throw new Error('Incorrect attributes list.');
      }

      const root = this.shadowRoot;
      if (root.lastChild) root.removeChild(root.lastChild);
  
      const cardConfig = Object.assign({}, config);
      const card = document.createElement('ha-card');
      card.header = config.title;
      const content = document.createElement('div');
      const style = document.createElement('style');
      _updateStyle(style);
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

    set hass(hass) {
      const config = this._config;
      const entityState = hass.states[config.entity];
      const root = this.shadowRoot;
      console.log(entityState);

      if (entityState != this._entityState) {
        // filter listed attributes
        const attrList = [];
        Object.keys(entityState.attributes).forEach(attribute => {
          if (config.attributes.includes(attribute)) attrList.push({
            "name": attribute,
            "value": entityState.attributes[attribute],
          });
        });
        _updateContent(root.getElementById('attributes'), attrList);
        this._entityState = entityState;
      }
    }
  
    getCardSize() {
      return 1;
    }
  }
  
  customElements.define('entity-attributes-card', EntityAttributesCard);