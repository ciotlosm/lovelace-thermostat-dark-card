# Lovelace Swiper card

A hidden card that enables swiping between tabs

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:lovelace-swiper`
| loop | boolean | **Optional** | Continuous swiping loops to the first card

## Example
Add the resource
```yaml
  - url: '/local/swiper.js?v=1.3'
    type: js
```
Add the card
```yaml
- type: custom:lovelace-swiper
  loop: true
```
