# Thermostat Card

A simple thermostat implemented in CSS based on <a href="https://codepen.io/dalhundal/pen/KpabZB/">Nest Thermostat Control</a> by Dal Hundal
 (<a href="https://codepen.io/dalhundal">@dalhundal</a>) on <a href="https://codepen.io">CodePen</a>

![thermostat](https://user-images.githubusercontent.com/7738048/42817026-7972be8e-89d5-11e8-994f-e5f556fb46fc.png)

### TODO
There are many things still missing, but I'll add below those that I know of
- [ ] Allow canceling of schedules for thermostats like Ecobee
- [ ] Allow settings Away mode
- [ ] Allow changing of Opration mode
- [ ] Add support for multiple entities for different functions (zwave thermostats hot/cold, tado away mode, etc)
- [ ] Title scaling

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:thermostat-card`
| entity | string | **Required** | The entity id of climate entity. Example: `climate.hvac`
| title | string | optional | Card title
| no_card | boolean | false | Set to true to avoid the card background and use the custom element in picture-elements.
| hvac | object | optional | Allows mapping of custom states or using a custom attribute for state
| step | number | 0.5 | The step to use when increasing or decreasing temperature
| highlight_tap | boolean | false | Show the tap area highlight when changing temperature settings
| chevron_size | number | 50 | Size of chevrons for temperature adjutment
| pending | number | 3 | Seconds to wait in control mode until state changes are sent back to the server
| idle_zone | number | 2 | Degrees of minimum difference between set points when thermostat supports both heating and cooling
| ambient_temperature | string | optional | An entity id of a sensor to use as `ambient_temperature` instead of the one provided by the thermostat

**hvac** object 

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| states | optional | optional | A list of states. See examples.
| attribute | string | optional | An attribute of the entity to use as state

**Example**

```yaml
resources:
  - url: /local/custom-lovelace/thermostat-card/thermostat-card.js?v=1
    type: module
name: My Awesome Home
views:
  - title: Home
    cards:
      - type: custom:thermostat-card
        title: Bedroom
        entity: climate.ecobee
```

**Example with custom hvac_states**

```yaml
resources:
  - url: /local/custom-lovelace/thermostat-card/thermostat-card.js?v=1
    type: module
name: My Awesome Home
views:
  - title: Home
    cards:
      - type: custom:thermostat-card
        title: Bedroom
        entity: climate.hvac
        chevron_size: 100
        hvac:
          states:
            'Off': 'off'
            'Cooling': 'cool'
            'Heating': 'heat'
          attribute: operation_mode
```

Example with external ambient sensor
```yaml
- type: custom:thermostat-card
  title: Bedroom
  entity: climate.ecobee
  ambient_temperature: sensor.bedroom_temperature
```

⚠️ Make sure you set type to `module` when including the resource file.

## License
This card uses MIT License as it uses a CodePen gist.

## Credits
[@silasb](https://github.com/silasb)
[@ciotlosm](https://github.com/ciotlosm)