# 📣 Tracker card

A card to track updates for custom cards and custom comopnents. It uses sensors to get various 

![tracker-card](https://user-images.githubusercontent.com/7738048/42875398-50ee1622-8a8c-11e8-97ed-ea6de6843504.png)

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:tracker-card`
| entity | string | **Required** | The sensor to use for tracking `sensor.custom_card_tracker`
| title | string | 📣 Updates | Name to display on card

## Installation

1. Install the `tracker-card` component by copying `tracker-card.js` to `<config directory>/www/tracker-card.js`

Example:
```bash
wget https://raw.githubusercontent.com/ciotlosm/custom-lovelace/master/tracker-card/tracker-card.js
mv tracker-card.js /config/www/
```

2. Link `tracker-card` inside you `ui-lovelace.yaml` 

```yaml
resources:
  - url: /local/tracker-card.js?v=0
    type: js
```

3. Add a custom card in your `ui-lovelace.yaml`

```yaml
- type: custom:tracker-card
  title:
  trackers:
    - sensor.custom_card_tracker
    - sensor.custom_component_tracker
```