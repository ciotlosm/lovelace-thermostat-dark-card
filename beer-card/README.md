# Beer card 🍺

A special card for Toast and his contribution to the community. A card that displays a multiline text in a nicer format and allows for a custom icon either from sensor or specified in the config or if both missing, shows a `mdi:beer`.

Please use official custom cards examples [here](https://developers.home-assistant.io/docs/en/lovelace_custom_card.html) if you better portability. 

![sample-card](https://user-images.githubusercontent.com/7738048/42514821-fabb733c-8462-11e8-9dff-0601f1dadbcf.png)

## Configuration

```yaml
- type: custom:beer-card
  entity: sensor.beer_list
  title: Toast Beer LIst
```

❤️ To activate the cards set an attribute called `list` on the `sensor.beer_list` with any state.