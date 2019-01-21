## 0.3.0
Added initial sort support
Credits: [hawk259](https://github.com/hawk259)
``` yaml
- type: custom:monster-card
  card:
    type: entities
  filter:
    include:
      - entity_id: sensor.cert_expiry_*
  sort:
    value: state
    method: number
    order: up
```

## 0.2.3
Fixed exclusion not applied when using entity options (#105).
Credits: [minchik](https://github.com/minchik)

## 0.2.2
Fixed problem with `string` states when using comparison operator

## 0.2.1
Implemented support to use comparison operator in states & attributes (#17)
```yaml
- type: custom:monster-card
  card:
    type: glance
    title: Monster
  filter:
    include:
      - domain: device_tracker
        attributes:
          battery: '< 25'
          source_type: gps
```

## 0.1.1
Implemented support for providing additional configuration options to entities
```yaml
- type: custom:monster-card
  card:
    type: entities
  filter:
    include:
      - entity_id: sensor.my_sensor
        options:
          name: "My super sensor"
      - domain: media_player
        options:
          type: "custom:state-card-custom"
```
Credits: [minchik](https://github.com/minchik)

## 0.0.1
Initial release that supports versioning
