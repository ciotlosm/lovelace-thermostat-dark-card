# Lovelace Custom Cards
Custom cards for lovelace

## How to use

- Copy `css` & `js` files from inside the card folder you like inside you `config/www`
- Add the `js` file as dependency inside you `ui-lovelace.yaml`

```yaml
resources:
  - url: /local/<card>.js
    type: js
```

- Configure the new card inside `ui-lovelace.yaml` according to the instructions provided

## Credits
Marius (@ciotlosm)
