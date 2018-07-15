# Alarm control panel card
Alarm control panel card allows you to control [alarm_control_panel.manual](https://www.home-assistant.io/components/alarm_control_panel.manual/)

![alarm](https://user-images.githubusercontent.com/7738048/42731414-6701fa42-8815-11e8-9230-8fbc7db46e2b.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:alarm_control_panel-card`
| entity | string | **Required** | An entity_id: 'media_player.bedroom'
| title | string | optional | A title for the alarm
| states | list | optional | A list of possible arm buttons. Supports `arm_home`, `arm_away`, `arm_night`.

**Example**

```yaml
- type: custom:alarm_control_panel-card
  entity: alarm_control_panel.alarm
  title: My Alarm
  states:
    - arm_home
    - arm_away
```