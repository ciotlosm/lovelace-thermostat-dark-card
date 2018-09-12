# Alarm control panel card
Alarm control panel card allows you to control [alarm_control_panel](https://www.home-assistant.io/components/alarm_control_panel) domain alarms.

![alarm](https://user-images.githubusercontent.com/7738048/43046718-b51efbc4-8dd5-11e8-83ad-330dbbb51b1a.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:alarm_control_panel-card`
| entity | string | **Required** | An entity_id from `alarm_control_panel` domain. Example: 'alarm_control_panel.alarm'
| title | string | optional | A title for the alarm
| hide_keypad | boolean | false | Force hiding of number keypad
| display_letters | boolean | false | Show letters on keypad
| scale | string | 15px | Allows you to scale the alarm panel
| states | list | optional | A list of possible arm buttons. Supports `arm_home`, `arm_away`, `arm_night`, `arm_custom_bypass`.
| style | string | optional | Allows to override some default styles. Example `--alarm-color-disarmed: var(--label-badge-blue);`
| auto_enter | object | optional | Options to auto arm and disarm. See `auto_enter` options.
| labels | object | optional | Labels that augment/override defaults.
| show_label_ids | boolean | optional | Allow displaying label constants (when setting to `true`) to be able to map your own translations under `labels`. Defaults to `false`.

`auto_enter` options:

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| code_length | integer | Required | When number of digits entered system will arm/disarm
| arm_action | string | Required | Action to invoke when after digits entered. Can be any of the same values as `states` above.

`labels`:
The labels to display. Label name and value. See example.

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
  labels:
    ui.card.alarm_control_panel.code: Inserire un codice a 4 cifre
    state.alarm_control_panel.arm_away: Away!!
```

**Credits**
- [@gwww](https://github.com/gwww) Added translations
- [@gwww](https://github.com/gwww) Awesome refactoring
- [@ciotlosm](https://github.com/ciotlosm)
