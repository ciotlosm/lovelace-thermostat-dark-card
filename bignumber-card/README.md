# Big number card

A simple card to display big numbers for sensors. It also supports severity levels as background.

![bignumber](https://user-images.githubusercontent.com/7738048/42536247-262b74e0-849a-11e8-8ed1-967302b73e03.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:bignumber-card`
| title | string | optional | Name to display on card
| scale | string | 50px | Base scale for card: '50px'
| entity | string | **Required** | `sensor.my_temperature`
| min | number | optional | Minimum value. If specified you get bar display
| max | number | optional | Maximum value. Must be specified if you added min
| from | string | left | Direction from where the bar will start filling (must have min/max specified)
| severity | list | optional | A list of severity objects. Items in list must be ascending based on 'value'

Severity object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| value | number | **Required** | Value until which to use this severity
| style | number | **Required** | Color of severity. Can be either hex or HA variable. Example: 'var(--label-badge-green)'

### WARNINGS
- Make sure you use ascending object values to have consistent behaviour
- Values are the upper limit until which that severity is applied

**Example**

```yaml
- type: custom:bignumber-card
  title: Humidity
  entity: sensor.outside_humidity
  scale: 30px
  from: bottom
  min: 0
  max: 100
  severity:
    - value: 70
      style: 'var(--label-badge-green)'
    - value: 90
      style: 'var(--label-badge-yellow)'
    - value: 100
      style: 'var(--label-badge-red)'
```
