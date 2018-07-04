# Monster card

Also known as `entity-filter` copycat on steroids. It currently supports only `entities` card type and ordering is not yet implemented.

*Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:monster-card`
| title | string | optional | Title of card
| card | string | optional | Type of card `glance` or `entities`
| filter | object | **Required** | `include` and `exclude` sections

Filter options for `include` and `exclude`:

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| domain | string | Optional | Filter all entities that match the domain
| state | string | Optional | Match entities that match state. Note, in YAML, make sure you wrap it in quotes to make sure it is parsed as a string.
| entity_id | string | Optional | Filter entities by id, supports wildcards (`*living_room*`)


Example config:

```yaml
- type: "custom:monster-card"
  title: Monster
  card: glance
  filter:
    include:
      - [{}]
    exclude:
      - entity_id: "*yweather*"
      - domain: group
```