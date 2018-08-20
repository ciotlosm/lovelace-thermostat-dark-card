# Monster card

Monster card is a magical type of card. Because it's dynamic if you're smart about it, you can have one card that adapts and that you don't need to touch when adding new entities & sensors to your setup.

Supports both inclusion and exclusion filters with wildcard for entity_ids.

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:monster-card`
| card | object | **Required** | Card object 
| filter | object | **Required** | `include` and `exclude` sections
| show_empty | boolean | true | Show/hide empty card
| when | object | optional | Extra condition for show/hide

Card object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | A type of card (ex.`glance`) from lovelace
| title | object | optional | Title of the card
| ... | other | optional | Other parameters supported by card type above

Filter options for `include` and `exclude`:

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| domain | string | optional | Filter all entities that match the domain
| state | string | optional | Match entities that match state. Note, in YAML, make sure you wrap it in quotes to make sure it is parsed as a string.
| entity_id | string | optional | Filter entities by id, supports wildcards (`*living_room*`). Case insensitive
| name | string | optional | Filter entities by friendly_name or title, supports wildcards (`*kitchen*`). Case insensitive
| attributes | object | optional | Filter entities by attributes object
| options| object | optional | Provide additional [configuration options](https://www.home-assistant.io/lovelace/entities/#options-for-entities) to entities

Attributes object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| * | any | **Required** | Any type of attribute that your entity can have (`battery: 50`)

⚠️ Supports comparison only if sensor attribute is `Number` and you send a string like '< 300'. Must have exactly one space between operator and value.
Supported operators: =, <, >, <=, >=

When object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| entity | string | **Required** | Entity to use for state comparison
| state | any | **Required** | The state of the entity to use for showing the monster-card

## Examples

Show all with some exceptions:
```yaml
- type: custom:monster-card
  card:
    type: glance
    title: Monster
  filter:
    include: [{}]
    exclude:
      - entity_id: "*yweather*"
      - domain: group
      - domain: zone
```

Show all in `device_tracker` with battery at 53:
```yaml
- type: custom:monster-card
  card:
    type: glance
    title: Monster
  filter:
    include:
      - domain: device_tracker
        options:
          secondary_info: last-changed
        attributes:
          battery: 53
          source_type: gps
```

Show all lights that are on (two methods):
```yaml
- type: custom:monster-card
  show_empty: false
  card:
    type: entities
    title: Lights On
  filter:
    include:
      - domain: light
        state: 'on'
```

```yaml
- type: custom:monster-card
  show_empty: false
  card:
    type: glance
    title: Lights On
  filter:
    include:
      - domain: light
    exclude:
      - state: 'off'
      - state: 'unavailable'
```


Show all in `device_tracker` with battery lower than 25:
```yaml
- type: custom:monster-card
  card:
    type: glance
    title: Monster
  filter:
    include:
      - domain: device_tracker
        attributes:
          battery: '< 25'
          source_type: gps
```

Snow monster card based on random entity state:
```yaml
- type: custom:monster-card
  card:
    type: glance
  filter:
    include:
      - domain: climate
  when:
    entity: device_tracker.demo_paulus
    state: not_home
```

Show monster card with entities card but without toggle:
```yaml
- type: "custom:monster-card"
  card:
    title: Docker
    type: entities
    show_header_toggle: false
  filter:
    include:
      - domain: media_player
      - domain: camera
```

Provide additional configuration options to entities:
``` yaml
- type: custom:monster-card
  card:
    type: entities
  filter:
    include:
      - entity_id: sensor.my_sensor
        options:
          name: "My super sensor"
      - domain: media_player
        options:
          type: "custom:state-card-custom"
```

## Sorting entities explained

Entities are displayed in the card in the order they are matched by the include filters. I.e. to get a specific order, detailed filters must precede more general ones.

The following example will display `sensor.my_sensor` followed by all other sensors in alphabetical order:
``` yaml
- type: custom:monster-card
  card:
    type: entities
  filter:
    include:
      - entity_id: sensor.my_sensor
      - entity_id: sensor.*
```

The following example will display all sensors in alphabetical order. `sensor.my_sensor` will be included in the sorted list and not be displayed at the end since it has already been matched by `sensor.*`:
``` yaml
- type: custom:monster-card
  card:
    type: entities
  filter:
    include:
      - entity_id: sensor.*
      - entity_id: sensor.my_sensor
```

## Credits
- [c727](https://github.com/c727)
- [thomasloven](https://github.com/thomasloven)
- [minchik](https://github.com/minchik)