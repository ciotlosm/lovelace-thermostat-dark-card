# Alarm control panel card
Alarm control panel card allows you to control [alarm_control_panel.manual](https://www.home-assistant.io/components/alarm_control_panel.manual/)

![alarm](https://user-images.githubusercontent.com/7738048/42728238-ed413f7a-87be-11e8-8e94-65e34df9ed8d.gif)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:alarm_control_panel-card`
| entity | string | **Required** | An entity_id: 'media_player.bedroom'
| title | string | optional | A title for the alarm

**Example**

```yaml
- type: custom:alarm_control_panel-card
  entity: alarm_control_panel.alarm
  title: My Alarm
```