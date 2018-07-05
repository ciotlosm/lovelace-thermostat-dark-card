# Gauge card

A simple gauge implemented in CSS based on https://github.com/JohnrBell/Gauge_CSS.

@TODO:
- [ ] Default title to entity friendly name
- [ ] Transform measurement based on user settings

![gauge-card](https://user-images.githubusercontent.com/7738048/42317025-080c6d38-8054-11e8-83c9-4887480d78f4.png)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:monster-card`
| title | string | optional | Name to display on card
| entity | string | **Required** | `sensor.my_temperature`
| min | number | 0 | Minimum value for graph
| max | number | 100 | Maximum value for graph
| scale | string | '50px' | Base value for graph visual size


**Example**

```yaml
- type: horizontal-stack
  cards:
    - type: custom:gauge-card
      title: Temperature
      entity: sensor.random_temperature
      min: -20
      max: 35
    - type: custom:gauge-card
      title: Oil
      entity: sensor.my_oil_sensor
```