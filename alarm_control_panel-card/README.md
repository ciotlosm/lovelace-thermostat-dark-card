# Alarm control panel card
Alarm control panel card allows you to control [alarm_control_panel.manual](https://www.home-assistant.io/components/alarm_control_panel.manual/)

![alarm](https://user-images.githubusercontent.com/7738048/42747472-2e456128-88e5-11e8-80ba-2521721dd291.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:alarm_control_panel-card`
| entity | string | **Required** | An entity_id from `alarm_control_panel` domain. Example: 'alarm_control_panel.alarm'
| title | string | optional | A title for the alarm
| force_keypad | boolean | true | Force showing of number keypad
| states | list | optional | A list of possible arm buttons. Supports `arm_home`, `arm_away`, `arm_night`, `arm_custom_bypass`.
| style | string | optional | Allows to override some default styles. Example `--alarm-color-disarmed: var(--label-badge-blue);`

**Example**

```yaml
- type: custom:alarm_control_panel-card
  entity: alarm_control_panel.alarm
  show_keypad: true
  title: My Alarm
  style: '--alarm-color-disarmed: var(--label-badge-blue);'
  states:
    - arm_home
    - arm_away
```