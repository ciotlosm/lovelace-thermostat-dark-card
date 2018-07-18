## 0.1.0
- Renamed to tracker-card
- Added support for custom_components as well
- Added support for multiple `check`/`update` services
- Add support for multiple type of tracking & updating components
- Configuration breaking change:
```yaml
- type: custom:tracker-card
  title:
  trackers:
    - sensor.custom_card_tracker
    - sensor.custom_component_tracker
```

## 0.0.3
Implemented exception for `homebridge_hidden`

## 0.0.2
Removed obsolete console.log

## 0.0.1
Initial release that supports versioning