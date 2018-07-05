# Big number card

A simple card to display a big number

@TODO:
- [ ] Default title to entity friendly name
- [ ] Transform measurement based on user settings
- [ ] Allow color styling
- [ ] Allow size management

![big-number](https://user-images.githubusercontent.com/7738048/42324162-fe8549da-806a-11e8-9ba0-711474b0714a.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:gauge-card`
| title | string | optional | Name to display on card
| entity | string | **Required** | `sensor.my_temperature`


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
```