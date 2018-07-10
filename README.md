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

⭐️ this repository if you found it useful ❤️

## Contributions

If you'd like to contribute functionality of fixes please make sure you follow a few guidelines:
- Submit your PR against "dev" branch
- Make sure you have configuration example in your PR
- Make sure you include documentation in existing README.md
- If it's a new component make sure it includes README.md

## FAQ

### I get a error with `n.setConfig' is undefied`, how do i fix this?
This is usually caused by running an older frontend. If you're already running 0.73 or newer please make sure you  have cleared browser cache. On mobile app you can also force a few refreshes. 

### I am running Firefox but custom cards like gauge-card look bad or don't load at all. How do I fix this?

This is probably because your version of Firefox doesn't have custom components supported or enabled. Please set to `true` in your `about:config` the following settings: `dom.webcomponents.customelements.enabled` and `dom.webcomponents.shadowdom.enabled`

### Custom components don't load on my IOS device?
This is because for IOS devices by default javascript served is `es5`. You can allow custom components to load by forcing `javascript: latest` in your `configuration.yaml` under `frontend:`. 

> Note: Enabling `latest` on IOS could cause automation and script editor to crash.

### I followed all steps to add custom component but I see javascript errors in my browser. What happend?

It dependso on the errors. 

1. For the following errors:
  - `Cannot call a class constructor without |new|`
  - `Class constructor BigNumberCard cannot be invoked without 'new'`

Please make sure you have `javascript: latest` in your `configuration.yaml` under `frontend:`.

2. For the following errors:
  - `Uncaught SyntaxError: Unexpected token <`

This is most likely because you downloaded the [html](https://github.com/ciotlosm/custom-lovelace/blob/master/gauge-card/gauge-card.js) from gitbut instead of [raw](https://raw.githubusercontent.com/ciotlosm/custom-lovelace/master/gauge-card/gauge-card.js). That is not valid javascript. Always make sure you download using `raw` button.

## Credits
- [@ciotlosm](https://github.com/ciotlosm)
- [@c727](https://github.com/c727)
