class MonsterCard extends HTMLElement {

  _getEntities(hass, filters) {
    function _filterEntityId(stateObj, pattern) {
      if (pattern.indexOf('*') === -1) {
        return stateObj.entity_id === pattern;
      }
      const regEx = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`, 'i');
      return stateObj.entity_id.search(regEx) === 0;
    }
    function _filterName(stateObj, pattern) {
      let compareEntity = stateObj.attributes.title ? stateObj.attributes.title : stateObj.attributes.friendly_name;
      if (!compareEntity) compareEntity = stateObj.entity_id;
      if (pattern.indexOf('*') === -1) {
        return compareEntity === pattern;
      }
      const regEx = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`, 'i');
      return compareEntity.search(regEx) === 0;
    }
    // Allows '< 300' in b
    function _complexCompare(a, b) {
      const _compare = {
        '>': (x, y) => x > y,
        '<': (x, y) => x < y,
        '<=': (x, y) => x <= y,
        '>=': (x, y) => x >= y,
        '=': (x, y) => x === y,
      };
      let operator = '=';
      let y = b;
      let x = a;
      if (!isNaN(a) && typeof (b) == 'string'
        && b.split(" ").length > 1) {
        [operator, y] = b.split(' ', 2);
        x = parseFloat(a);
      }
      return _compare[operator](x, y);
    }
    const entities = new Map();
    filters.forEach((filter) => {
      const filters = [];
      if (filter.domain) {
        filters.push(stateObj => stateObj.entity_id.split('.', 1)[0] === filter.domain);
      }
      if (filter.attributes) {
        Object.keys(filter.attributes).forEach(key => {
          filters.push(stateObj => _complexCompare(stateObj.attributes[key], filter.attributes[key]));
        });
      }
      if (filter.entity_id) {
        filters.push(stateObj => _filterEntityId(stateObj, filter.entity_id));
      }
      if (filter.name) {
        filters.push(stateObj => _filterName(stateObj, filter.name));
      }
      if (filter.state) {
        filters.push(stateObj => _complexCompare(stateObj.state, filter.state));
      }

      const options = filter.options ? filter.options : {}

      Object.keys(hass.states).sort().forEach(key => {
        if (filters.every(filterFunc => filterFunc(hass.states[key]))) {
          entities.set(hass.states[key].entity_id, Object.assign({ "entity": hass.states[key].entity_id }, options));
        }
      });
    });
    return Array.from(entities.values());
  }

  setConfig(config) {
    if (!config.filter.include || !Array.isArray(config.filter.include)) {
      throw new Error('Please define filters');
    }

    if (config.sort) {
      if (!config.sort.value || (config.sort.value != 'state' && config.sort.value != 'friendly_name' && config.sort.value != 'entity_id')) {
        throw new Error('Invalid sort value option');
      }

      if (config.sort.method && config.sort.method != 'string' && config.sort.method != 'upper' && config.sort.method != 'lower' && config.sort.method != 'number') {
        throw new Error('Invalid sort method option');
      }

      if (config.sort.order && config.sort.order != 'up' && config.sort.order != 'down') {
        throw new Error('Invalid sort method option');
      }
    }

    if (this.lastChild) this.removeChild(this.lastChild);

    const cardConfig = Object.assign({}, config);
    if (!cardConfig.card) cardConfig.card = {};
    if (config.card.entities) delete config.card.entities;
    if (!cardConfig.card.type) cardConfig.card.type = 'entities';

    const element = document.createElement(`hui-${cardConfig.card.type}-card`);
    this.appendChild(element);

    this._config = cardConfig;
  }

  set hass(hass) {
    const config = this._config;
    let entities = this._getEntities(hass, config.filter.include);
    if (config.filter.exclude) {
      const excludeEntities = this._getEntities(hass, config.filter.exclude).map(entity => entity.entity);
      entities = entities.filter(entity => !excludeEntities.includes(entity.entity));
    }

    if (config.sort) {

      function sort_entities(a, b) {
        var aa;
        var bb;

        if (config.sort.value == 'state') {
          aa = hass.states[a.entity].state;
          bb = hass.states[b.entity].state;
        }
        else if (config.sort.value == 'entity_id') {
          aa = a.entity;
          bb = b.entity;
        }
        else if (config.sort.value == 'friendly_name') {
          aa = hass.states[a.entity].attributes.friendly_name;
          bb = hass.states[b.entity].attributes.friendly_name;
        }

        if (!config.sort.method || config.sort.method == 'string' || config.sort.method == 'upper' || config.sort.method == 'lower') {

          if (config.sort.method && config.sort.method == 'upper') {
              aa = aa.toUpperCase();
              bb = bb.toUpperCase();
	  }
          else if (config.sort.method && config.sort.method == 'lower') {
              aa = aa.toLowerCase();
              bb = bb.toLowerCase();
	  }
	      
          if (!config.sort.order || config.sort.order == 'up') {
            if (aa > bb) return 1;
            if (bb > aa) return -1;
          }
          else {
            if (aa > bb) return -1;
            if (bb > aa) return 1;
          }
        }
        else {
          if (!config.sort.order || config.sort.order == 'up') {
            if (Number(aa) > Number(bb)) return 1;
            if (Number(bb) > Number(aa)) return -1;
          }
          else {
            if (Number(aa) > Number(bb)) return -1;
            if (Number(bb) > Number(aa)) return 1;
          }
        }

        return 0;
      }

      entities.sort(sort_entities);
    }

    if (entities.length === 0 && config.show_empty === false) {
      this.style.display = 'none';
    } else {
      if (config.when && (hass.states[config.when.entity].state == config.when.state) || !config.when) {
        this.style.display = 'block';
      } else {
        this.style.display = 'none';
      }
    }

    if (!config.card.entities || config.card.entities.length !== entities.length ||
      !config.card.entities.every((value, index) => value.entity === entities[index].entity)) {
      config.card.entities = entities;
      this.lastChild.setConfig(config.card);
    }
    this.lastChild.hass = hass;
  }

  getCardSize() {
    return 'getCardSize' in this.lastChild ? this.lastChild.getCardSize() : 1;
  }
}

customElements.define('monster-card', MonsterCard);
