# Thermostat Card

A simple thermostat implemented in CSS based on https://codepen.io/dalhundal/pen/KpabZB

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| entity | string | **Required** | `climate.ecobee`

**Example**

```yaml
cards:
  - type: custom:thermostat-card
    entity: climate.ecobee
```
