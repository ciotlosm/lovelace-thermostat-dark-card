# 📣 Card tracker

A card to track updates for custom cards in this repository.
It uses a [custom component](https://github.com/custom-components/custom_cards) that tracks versions and provide a service to update and [a sensor](https://github.com/custom-components/sensor.custom_cards) to track updates.

![card-tracker](https://user-images.githubusercontent.com/7738048/42637020-ce8441fe-85f2-11e8-93ae-1468f64b46aa.png)

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:cardtracker-card`
| entity | string | **Required** | The sensor to use for tracking `sensor.custom_card_tracker`
| title | string | 📣 Updates | Name to display on card

## Installation

>Examples assume `<config directory>` folder is `/config`

1. Install the `custom_cards` component by copying `/custom_components/custom_cards.py` to `<config directory>/custom_components/custom_cards.py`

```bash
git clone https://github.com/custom-components/custom_cards
cp custom_cards/custom_components/custom_cards.py /config/custom_components/custom_cards.py
```

2. Install the `sensor.custom_cards` component by copying `/custom_components/sensor/custom_cards.py` to `<config directory>/custom_components/sensor/custom_cards.py`

```bash
git clone https://github.com/custom-components/sensor.custom_cards
cp sensor.custom_cards/custom_components/sensor/custom_cards.py /config/custom_components/sensor/custom_cards.py
```

3. Install the `cardtracker-card` component by copying `cardtracker-card.js` to `<config directory>/www/cardtracker-card.js`

Example:
```bash
wget https://raw.githubusercontent.com/ciotlosm/custom-lovelace/master/cardtracker-card/cardtracker-card.js
mv cardtracker-card.js /config/www/
```

4. Link `cardtracker-card` inside you `ui-lovelace.yaml` 

```yaml
resources:
  - url: /local/cardtracker-card.js?v=0
    type: js
```

5. Add a custom card in your `ui-lovelace.yaml`

```yaml
      - type: custom:cardtracker-card
        entity: sensor.custom_card_tracker
```