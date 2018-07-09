# Entity attributes

Entity attributes allows you to show basic attributes for an entity in a card. 

![enitty-attributes-card](https://user-images.githubusercontent.com/7738048/42425143-1269d5d4-8321-11e8-8a42-136aefb2220a.png)

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

How to embed this inside `entities` card:

![screen shot 2018-07-09 at 13 47 38](https://user-images.githubusercontent.com/7738048/42446481-1ac27c1e-837f-11e8-94e7-02ef35f2d853.png)

```yaml
- type: entities
  title: Entities card
  entities:
    - media_player.bedroom
    - type: custom:entity-attributes-card
      entity: media_player.bedroom
      attributes:
        - media_title
        - app_name
    - sensor.short_name
    - sensor.battery_sensor
```