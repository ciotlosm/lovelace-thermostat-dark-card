# Thermostat Card

A simple thermostat implemented in CSS based on https://codepen.io/dalhundal/pen/KpabZB

**Options**

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| entity | string | **Required** | `climate.ecobee`
| min | number | 60 | Minimum value for graph
| max | number | 80 | Maximum value for graph

**Example**

```yaml
cards:
  - type: custom:thermostat-card
    entity: climate.ecobee
    min: -20
    max: 35
```
