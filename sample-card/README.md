# Sample card

A skeleton to use for simple cards. It doesn't work on Firefox without enabling `dom.webcomponents.customelements.enabled` and `dom.webcomponents.shadowdom.enabled`. 
Please use official custom cards examples [here](https://developers.home-assistant.io/docs/en/lovelace_custom_card.html) if you better portability. 

![sample-card](https://user-images.githubusercontent.com/7738048/42514821-fabb733c-8462-11e8-9dff-0601f1dadbcf.png)

Configuration:

```yaml
- type: custom:sample-card
  title: Sample card
  entity: device_tracker.demo_paulus
```