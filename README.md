# Lovelace Custom Cards
Custom cards for lovelace

## How to use

- Copy the `js` file from inside the card folder you like (e.g. monster-card), inside your `config/www`
- Add the `js` file as dependency inside your `ui-lovelace.yaml`

Example:

```yaml
resources:
  - url: /local/monster-card.js?v=1
    type: js
```

> Make sure you change v=1 to a higher number every time you update your card with new code!

- Configure the new card inside `ui-lovelace.yaml` according to the instructions provided

## FAQ

**1. I get a error with `n.setConfig' is undefied`, how do i fix this?**

**Answer:** This is usually caused by running an older frontend. Start by clearing cache in your browsers.

**2. I am running Firefox but custom cards like gauge-card look bad or don't load at all. How do I fix this?**

**Answer:** This is probably because your version of Firefox doesn't have custom components supported or enabled. Please set to `true` in your `about:config` the following settings: `dom.webcomponents.customelements.enabled` and `dom.webcomponents.shadowdom.enabled`

**3. Custom components don't load on my IOS device?**

**Answer:** This is because for IOS devices by default javascript served is `es5`. You can allow custom components to load by forcing `javascript: latest` in your `configuration.yaml` under `frontend:`. 


## Credits
- [@ciotlosm](https://github.com/ciotlosm)
- [@c727](https://github.com/c727)
