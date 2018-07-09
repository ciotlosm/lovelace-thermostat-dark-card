# Big number card

A simple card to display a big number

![big-number](https://user-images.githubusercontent.com/7738048/42440941-ab973cda-836f-11e8-96b4-b809a22e8b30.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:bignumber-card`
| title | string | optional | Name to display on card
| scale | string | 50px | Base scale for card: '50px'
| entity | string | **Required** | `sensor.my_temperature`
| severity | object | optional | Severity object. See below

Severity object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| red | number | **Required** | Value from which to start red color
| green | number | **Required** | Value from which to start green color
| amber | number | **Required** | Value from which to start amber color

**Example**

```yaml
- type: horizontal-stack
  cards:
    - type: custom:bignumber-card
      title: Temperature
      entity: sensor.first_number
    - type: custom:bignumber-card
      title: Oil
      entity: sensor.second_number
  - type: custom:bignumber-card
    title: Oil
    entity: sensor.second_number
    severity:
      red: 50
      green: 0
      amber: 40
```