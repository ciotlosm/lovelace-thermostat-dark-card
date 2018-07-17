# 📣 Card tracker

A card to track updates for custom cards in this repository.
It uses a [custom component](https://github.com/custom-components/custom_cards) that tracks versions.

![card-tracker](https://user-images.githubusercontent.com/7738048/42725289-15563bd0-878a-11e8-93f0-606b19e3da07.png)

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:card-tracker`
| entity | string | **Required** | The sensor to use for tracking `sensor.custom_card_tracker`
| title | string | 📣 Custom Card Updates | Name to display on card

## Installation
Make sure you've installed the custom component `custom_cards` first.

1. Install the `card-tracker` component by copying `card-tracker.js` to `<config directory>/www/card-tracker.js`

Example:
```bash
wget https://raw.githubusercontent.com/ciotlosm/custom-lovelace/master/card-tracker/card-tracker.js
mv card-tracker.js /config/www/
```

2. Link `card-tracker` inside you `ui-lovelace.yaml` 

```yaml
resources:
  - url: /local/card-tracker.js?v=0
    type: js
```

3. Add a custom card in your `ui-lovelace.yaml`

```yaml
      - type: custom:card-tracker
        entity: sensor.custom_card_tracker
```