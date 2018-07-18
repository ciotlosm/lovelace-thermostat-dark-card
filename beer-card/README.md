# Beer card 🍺

A special card for Toast and his contribution to the community. A card that displays a multiline text in a nicer format.

![beer-card](https://user-images.githubusercontent.com/7738048/42560625-b7d18226-84ff-11e8-9f0a-59875edd642b.png)

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:beer-card`
| entity | string | **Required** | The sensor to use for the list
| attribute | string | `list` | The attribute of the entity to list
| title | string | optional | A card title
| style | string | optional | A style to apply to the `ha-card`
| icon | string | `mdi:beer` | An icon to display. Besides mdi icons, it supports images: `png`, `jpg`, `svg`, `gif`
| list_type | string | `none` | Style of list. Options are `none, disc, circle, square`

## Configuration

Example:
```yaml
- type: custom:beer-card
  entity: sensor.beer_list
  attribute: list
  title: Toast Beer List
  icon: mdi:heart
  list_type: disc
```

Example with image icon:
```yaml
- type: custom:beer-card
  title: Untappd Wishlist
  entity: sensor.untappd_wishlist
  icon: /local/icons/untappd.png
```

Example with a background image:
```yaml
- type: custom:beer-card
  title: Untappd Wishlist
  entity: sensor.untappd_wishlist
  icon: mdi:heart
  style: "background-image: url('/local/untapped.png')"
  attribute: list
```

❤️ To activate the cards set an attribute called `list` on the `sensor.beer_list` with any state.

![beer-value](https://user-images.githubusercontent.com/7738048/42560596-ac2627ce-84ff-11e8-965b-b82604645086.png)

## Credits
[ciotlosm](https://github.com/ciotlosm)
[iantrich](https://github.com/iantrich)