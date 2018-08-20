# Plan coordinates

Helper to display `left:` and `top:` to use as coordinates in entities in [picture-elements](https://www.home-assistant.io/lovelace/picture-elements/).

![plan](https://user-images.githubusercontent.com/7738048/42569358-ede62cae-8518-11e8-989e-25812e8b95f8.gif)

## ⚠️ Warning ⚠️
- This feature only works with Chrome that supports Event.path on MouseMove.
- Make sure your browser zoom is at 100% otherwise coordinates will fail to be accurate


**Example**
```yaml
- type: custom:plan-coordinates
```

To use with ```panel: true``` you can use ```vertical-stack``` which will display like normal, or ```horizontal-stack``` which will push the ```picture-elements``` to one side or the other.


```yaml
- title: Main Floor
    id: main-floor
    icon: mdi:wrench
    panel: true
    cards:   
      - type: vertical-stack
        cards: 
          - type: custom:plan-coordinates                    
          - type: picture-elements
            image: /local/floorplan/mainfloor.jpg
            elements:
              - type: state-icon
                entity: light.mudroom_light_level
                tap_action: toggle
                style:
                  top: 60%
                  left: 67%
```

