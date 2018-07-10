# Entity attributes

Entity attributes allows you to show basic attributes from multiple entities.

![enitty-attributes-card](https://user-images.githubusercontent.com/7738048/42527876-8e9f1206-8482-11e8-9e19-b5ffbfbf8474.png)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:entity-attributes-card`
| entity | string | **Required** | An entity_id: 'media_player.bedroom'
| attributes | list | **Required** | A list of objects or entity attributes in the format <domain>.<entity>.<attribute>.<br/> Example 'climate.heatpump.current_temperature'

**Example**

```yaml
- type: custom:entity-attributes-card
  title: Attributes Card
  attributes:
    - key: media_player.bedroom.app_name
      name: Application
    - key: media_player.bedroom.media_title
      name: Media center
    - climate.heatpump.current_temperature
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
        - media_player.bedroom.app_name
        - media_player.bedroom.media_title
    - sensor.short_name
    - sensor.battery_sensor
```