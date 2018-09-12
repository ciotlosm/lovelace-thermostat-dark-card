## 0.4.0
- Major refactoring from @gwww
- Add translation support
- Fixes some memory leaks

## 0.3.2
- Fixed javascript error on code clear when no code was used 

## 0.3.1
- Fixed alarm not working with no code
- Fixed bug for auto arm when clicking disarm

## 0.3.0
- Refactoring by [@gwww](https://github.com/gwww)
- Added support for `auto_enter` when pressing a fixed number of diggits
- Swithed from `force_keypad` to `hide_keypad` as most users would want to show they keypad anyway

```yaml
- type: custom:alarm_control_panel-card
  entity: alarm_control_panel.ha_alarm
  auto_enter:
      code_length: 4
      arm_action: arm_away
  title: My Alarm
  states:
    - arm_home
    - arm_away
```

## 0.2.0
- Fixed colors and icons for `armed`, `disarmed`, `pending` to be closer to industry standards
- Add support for style

## 0.1.2
- Fix keypad logic for display (#71) for alarms returning a regex in `code_format`, now you can use config `force_keypad`
- More rebust component - avoid JS error on invalid entity

## 0.1.1
- Fix state of buttons when using Clear key (thanks [@xiidoz](https://github.com/xiidoz))

## 0.1.0
- Improved state icon and switch to a shield
- Allow for custom list of armed button state (based on what your alarm supports)

```yaml
- type: custom:alarm_control_panel-card
  entity: alarm_control_panel.ha_alarm
  title: My Alarm
  states:
    - arm_home
    - arm_away
    - arm_custom_bypass
```

## 0.0.3
Fixed buttons disabled for alarms with no codes and a few other cases

## 0.0.2
Fixed triggered state to display properly

## 0.0.1
Initial release that supports versioning