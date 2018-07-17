# Thermostat Card

A simple thermostat implemented in CSS based on <a href="https://codepen.io/dalhundal/pen/KpabZB/">Nest Thermostat Control</a> by Dal Hundal
 (<a href="https://codepen.io/dalhundal">@dalhundal</a>) on <a href="https://codepen.io">CodePen</a>

![thermostat](https://user-images.githubusercontent.com/7738048/42817026-7972be8e-89d5-11e8-994f-e5f556fb46fc.png)

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:thermostat-card`
| entity | string | **Required** | The entity id of climate entity. Example: `climate.ecobee`

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
        entity: climate.ecobee
```

⚠️ Make sure you set type to `module` whe including the resource file.

## License
This card uses MIT License as it uses a CodePen gist.

## Credits
[@silasb](https://github.com/silasb)