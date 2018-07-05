# Monster card

Monster card is a magical type of card. Because it's dynamic if you're smart about it, you can have one card that adapts and that you don't need to touch when adding new entities & sensors to your setup.

Supports both inclusion and exclusion filters with wildcard for entity_ids.

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:monster-card`
| card | object | **Required** | Card object 
| filter | object | **Required** | `include` and `exclude` sections

Card object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | A type of card (ex.`glance`) from lovelace
| title | object | optional | Title of the card
| ... | other | optional | Other parameters supported by card type above

Filter options for `include` and `exclude`:

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| domain | string | Optional | Filter all entities that match the domain
| state | string | Optional | Match entities that match state. Note, in YAML, make sure you wrap it in quotes to make sure it is parsed as a string.
| entity_id | string | Optional | Filter entities by id, supports wildcards (`*living_room*`)

**Example**

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