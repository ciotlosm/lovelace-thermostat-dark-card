## 0.1.1
Add a new `unit` attribute you can define to show a custom string (unit) near the value.

## 0.1.0
- Refactoring to allow dynamic attributes
- Breaking change to allow filters

```yaml
- type: custom:entity-attributes-card
  filter:
    include:
      - climate.hvac.*
    exclude:
      - climate.hvac.friendly_name
```

## 0.0.1
Initial release that supports versioning