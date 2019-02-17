## 0.4.1
* Added display_switch; nominates a switch-like entity which will be set on/off depending on whether this card is showing any items.

## 0.3.1
Added in_group to include and exclude filter rules, matching any entities in the named group.
```yaml
filter:
  include:
    - in_group: group.household_trackers
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
