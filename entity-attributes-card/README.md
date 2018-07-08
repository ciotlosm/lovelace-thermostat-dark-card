# Entity attributes

Entity attributes allows you to show basic attributes for an entity in a card. 

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:entity-attributes-card`
| entity | string | **Required** | An entity_id: 'media_player.bedroom'
| attributes | list | **Required** | A list of entity attributes


**Example**

```yaml
- type: custom:entity-attributes-card
  title: Attributes Card
  entity: media_player.bedroom
  attributes:
    - app_name
    - media_title
```