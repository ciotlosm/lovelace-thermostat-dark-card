# Dark Thermostat by [@ciotlosm](https://www.github.com/ciotlosm) maintained by [@swingerman](https://github.com/swingerman)

A manintaned fork of [Lovelace Thermostat Dark Card](https://github.com/ciotlosm/lovelace-thermostat-dark-card) A simple thermostat implemented in CSS based on [Nest Thermostat Control](https://codepen.io/dalhundal/pen/KpabZB/) by Dal Hundal
[@dalhundal](https://codepen.io/dalhundal) on [CodePen](https://codepen.io)

![card example](https://github.com/swingerman/lovelace-thermostat-dark-card/blob/master/sample.png)

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]

## Options

| Name                 | Type    | Default      | Description                                                                                            |
| -------------------- | ------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| type                 | string  | **Required** | `custom:thermostat-dark-card`                                                                          |
| entity               | string  | **Required** | The entity id of climate entity. Example: `climate.hvac`                                               |
| name                 | string  | optional     | Card title                                                                                             |
| [hvac](#hvac-object) | object  | optional     | Allows mapping of custom states or using a custom sensor/attribute for state                           |
| step                 | number  | 0.5          | The step to use when increasing or decreasing temperature                                              |
| highlight_tap        | boolean | false        | Show the tap area highlight when changing temperature settings                                         |
| chevron_size         | number  | 50           | Size of chevrons for temperature adjustment                                                            |
| pending              | number  | 3            | Seconds to wait in control mode until state changes are sent back to the server                        |
| idle_zone            | number  | 2            | Degrees of minimum difference between set points when thermostat supports both heating and cooling     |
| ambient_temperature  | string  | optional     | An entity id of a sensor to use as `ambient_temperature` instead of the one provided by the thermostat |
| range_min            | number  | optional     | Override thermostat's minimum value                                                                    |
| range_max            | number  | optional     | Override thermostat's maximum value                                                                    |
| show_toggle          | boolean | optional     | Enables/disables the toggle button                                                                     |
| use_theme_color      | boolean | true     | Adapts thermostat to the current themes color                                                                     |
| [away](#away-object) | object  | optional     | Allows usage of a custom sensor/attribute for the away detection.                                      |

### hvac object

| Name                     | Type     | Default     | Description                                                                                         |
| ------------------------ | -------- | ----------- | --------------------------------------------------------------------------------------------------- |
| states                   | optional | optional    | A list of states. See examples.                                                                     |
| attribute                | string   | hvac_action | An attribute of the entity to use as state. This cannot be used in conjunction with sensor.         |
| [sensor](#sensor-object) | object   | optional    | The sensor object which monitors the hvac state. This cannot be used in conjunction with attribute. |

### away object

**NOTE:** If the climate entity already provides an attribute `away_mode`, this configuration is wont apply.

| Name                     | Type   | Default     | Description                                 |
| ------------------------ | ------ | ----------- | ------------------------------------------- |
| [sensor](#sensor-object) | object | optional    | A sensor which provides the away state.     |
| attribute                | string | preset_mode | An attribute of the entity to use as state. |

### sensor object

| Name      | Type   | Default      | Description                                           |
| --------- | ------ | ------------ | ----------------------------------------------------- |
| sensor    | string | **Required** | A sensor which provides the hvac state. See examples. |
| attribute | string | state        | An attribute of the sensor to use as state.           |

## Examples

### Simple example

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.ecobee
```

### Example with custom hvac_states

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.hvac
  chevron_size: 100
  hvac:
    states:
      'Off': 'idle'
      'Cooling': 'cooling'
      'Heating': 'heating'
    attribute: operation_mode
```

### Example with custom hvac_sensor

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.nest
  chevron_size: 100
  hvac:
    states:
      'idle': 'idle'
      'cooling': 'cooling'
      'heating': 'heating'
    sensor:
      sensor: sensor.nest_thermostat_hvac_state
```

### Example with external ambient sensor

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.ecobee
  ambient_temperature: sensor.bedroom_temperature
```

### Custom attribute only

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.bedroom
  away:
    attribute: custom_away_mode
```

#### Sensor only

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.bedroom
  away:
    sensor:
      sensor: input_boolean.climate_bedroom_away
```

#### Sensor with attribute

```yaml
- type: custom:thermostat-dark-card
  title: Bedroom
  entity: climate.bedroom
  away:
    sensor:
      sensor: climate.bedroom
      attribute: away
```

[commits-shield]: https://img.shields.io/github/commit-activity/y/ciotlosm/lovelace-thermostat-dark-card.svg?style=for-the-badge
[commits]: https://github.com/ciotlosm/lovelace-thermostat-dark-card/commits/master
[devcontainer]: https://code.visualstudio.com/docs/remote/containers
[discord]: https://discord.gg/5e9yvq
[discord-shield]: https://img.shields.io/discord/330944238910963714.svg?style=for-the-badge
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/c/projects/frontend
[license-shield]: https://img.shields.io/github/license/ciotlosm/lovelace-thermostat-dark-card.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/maintenance/yes/2022.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/ciotlosm/lovelace-thermostat-dark-card.svg?style=for-the-badge
[releases]: https://github.com/ciotlosm/lovelace-thermostat-dark-card/releases
