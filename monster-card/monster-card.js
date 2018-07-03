class MonsterCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      const card = document.createElement('ha-card');
      card.header = this.config.title;
      const link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = '/local/monster-card.css';
      card.appendChild(link);
      this.content = document.createElement('div');
      this.content.className = 'card';
      card.appendChild(this.content);
      this.appendChild(card);
    }

    const _filterEntityId = function (stateObj, pattern) {
      if (pattern.indexOf('*') === -1) {
        return stateObj.entity_id === pattern;
      }
      const regEx = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return stateObj.entity_id.search(regEx) === 0;
    }

    const computeDomain = function (entityId) {
      return entityId.substr(0, entityId.indexOf('.'));
    }

    const computeStateDomain = function (stateObj) {
      if (!stateObj._domain) {
        stateObj._domain = computeDomain(stateObj.entity_id);
      }
      return stateObj._domain;
    }

    const _getEntities = function (filters) {
      const entities = new Set();
      filters.forEach((filter) => {
        const filters = [];
        if (filter.domain) {
          filters.push(stateObj => computeStateDomain(stateObj) === filter.domain);
        }
        if (filter.entity_id) {
          filters.push(stateObj => _filterEntityId(stateObj, filter.entity_id));
        }
        if (filter.state) {
          filters.push(stateObj => stateObj.state === filter.state);
        }

        Object.values(hass.states).forEach((stateObj) => {
          if (filters.every(filterFunc => filterFunc(stateObj))) {
            entities.add(stateObj);
          }
        });
      });
      return Array.from(entities);
    }

    let entitiesList = _getEntities(this.config.filter.include);
    if (this.config.filter.exclude) {
      const excludeEntities = _getEntities(this.config.filter.exclude);
      entitiesList = entitiesList.filter(el => !excludeEntities.includes(el));
    }
    entitiesList = entitiesList.sort(function(a, b) {return a.entity_id.localeCompare(b.entity_id)});
    this.content.innerHTML = `
      <div>
        ${entitiesList.map(entity=>
          `
          <div class="monster-item">
            <ha-icon icon="${entity.attributes.icon? `${entity.attributes.icon}`: ``}"></ha-icon><span class="entity">${entity.entity_id}</span><span class="state">${entity.state}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  setConfig(config) {
    if (!config.filter.include || !Array.isArray(config.filter.include)) {
      throw new Error('Please define entities');
    }
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }
}

customElements.define('monster-card', MonsterCard);