# Beer card 🍺

A special card for Toast and his contribution to the community. A card that displays a multiline text in a nicer format and allows for a custom icon either from sensor or specified in the config or if both missing, shows a `mdi:beer`.

![beer-card](https://user-images.githubusercontent.com/7738048/42560625-b7d18226-84ff-11e8-9f0a-59875edd642b.png)

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:beer-card`
| entity | string | **Required** | The sensor to use for the list
| title | string | optional | A card title
| icon | string | mdi:beer | An icon to display

## Configuration

```yaml
- type: custom:beer-card
  entity: sensor.beer_list
  title: Toast Beer List
  icon: mdi:heart
```
❤️ To activate the cards set an attribute called `list` on the `sensor.beer_list` with any state.

![beer-value](https://user-images.githubusercontent.com/7738048/42560596-ac2627ce-84ff-11e8-965b-b82604645086.png)