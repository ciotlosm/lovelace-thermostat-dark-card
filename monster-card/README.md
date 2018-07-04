# Monster card

Also known as `entity-filter` copycat on steroids. It currently supports only `entities` card type and ordering is not yet implemented.

Example config:

```yaml
- type: "custom:monster-card"
  title: Monster
  card: glance
  filter:
    include:
      - [{}]
    exclude:
      - entity_id: "*yweather*"
      - domain: group
```