# Lovelace Custom Cards
Custom cards for lovelace

## How to use

- Copy the `js` file from inside the card folder you like (e.g. monster-card), inside your `config/www`
- Add the `js` file as dependency inside your `ui-lovelace.yaml`

Example:

```yaml
resources:
  - url: /local/monster-card.js
    type: js
```

- Configure the new card inside `ui-lovelace.yaml` according to the instructions provided

## Credits
- [@ciotlosm](https://github.com/ciotlosm)
- [@c727](https://github.com/c727)
