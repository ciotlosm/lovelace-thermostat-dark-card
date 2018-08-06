# Home setter card

A card that lets you choose a different homepage to be the default on the current browser.

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:home-setter`
| title | string | optional | A title for the card
| pages | list | **Required** | A list of objects of type 'pages'

Pages object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| title | string | optional | Title of the page to display on the ard
| path | string | **Required** | The path that is used when using this as default

## Example

```yaml
- type: custom:home-setter
  pages:
    - name: Main
      path: lovelace/0
    - name: Mobile
      path: lovelace/mobile
```

## Credits
- [ciotlosm](https://github.com/ciotlosm)