# Group card

Is a simple card that expands a group to a list of entities to be used with `entities`, `glance`, etc. 

## Options

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | `custom:group-card`
| card | object | **Required** | Card object 
| group | string | **Required** | The entity_id of a group

Card object

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| type | string | **Required** | A type of card (ex.`glance`) from lovelace
| title | object | optional | Title of the card
| ... | other | optional | Other parameters supported by card type above

## Examples

Show all with some exceptions:
```yaml
- type: custom:group-card
  card:
    type: entities
    title: Group card
  group: group.bedroom
```

## Credits
- [ciotlosm](https://github.com/ciotlosm)