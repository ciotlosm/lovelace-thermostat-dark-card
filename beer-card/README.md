# Beer card 🍺

A special card for Toast and his contribution to the community. A card that displays a multiline text in a nicer format and allows for a custom icon either from sensor or specified in the config or if both missing, shows a `mdi:beer`.

Please use official custom cards examples [here](https://developers.home-assistant.io/docs/en/lovelace_custom_card.html) if you better portability. 

![beer-card](https://user-images.githubusercontent.com/7738048/42560164-b8344dd0-84fe-11e8-9e99-e16bad325c6f.png)


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
  title: Toast Beer LIst
```

❤️ To activate the cards set an attribute called `list` on the `sensor.beer_list` with any state.