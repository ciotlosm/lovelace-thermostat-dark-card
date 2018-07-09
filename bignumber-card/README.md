# Big number card

A simple card to display big numbers for sensors. It also supports severity levels as background.

![big-number](https://user-images.githubusercontent.com/7738048/42441033-f4336a04-836f-11e8-906c-6e3ab7f636c2.gif)

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
| normal | number | **Required** | Value from which is classed as a normal color N.B. this cannot be used with red/green/amber


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
