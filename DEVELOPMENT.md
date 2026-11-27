# Development

## Prerequisites

- Node.js 24+
- Podman (for running Home Assistant dev instance)

## Setup

```bash
npm install
```

## Development Workflow

Start the vite preview server (serves the built card on port 4000):

```bash
npm run build
npm run preview
```

Start Home Assistant dev instance:

```bash
npm run start:hass
```

This runs HA on port 8123 with the config from `.hass_dev/`. The card is loaded from `http://localhost:4000/thermostat-dark-card.js`.

For watch mode (auto-rebuild on file changes):

```bash
npm run dev
```

## Demo Page

A standalone interactive demo is available at `http://localhost:4000/demo.html` after building:

```bash
npm run build
npm run preview
# Open http://localhost:4000/demo.html
```

The demo lets you test all card options without Home Assistant — skin, HVAC state, temperatures, dual mode, presets, and more. Useful for quick visual testing during development.

It drives two independent layers: the **Home Assistant theme** (light/dark, which sets
the page background and the CSS variables the card reads) and the **card skin**
(which sets how the dial draws itself).

A second page, `http://localhost:4000/theme-preview.html`, renders the card in
every skin under a simulated Home Assistant dashboard, with a light/dark switch.
Use it to check a skin against both modes. Add `?skin=<name>` to see one skin
on its own, and `&mode=dark` to start in dark mode.

## Skin Files

Each skin is a JSON file in `src/skins/`, discovered automatically at build
time. A file is a flat map of tokens, where the token name is the CSS variable
without the leading `--`:

```json
{
  "dial-off-fill": "#555",
  "dial-text-color": "#fff"
}
```

A file may add a `modes` object with `light` and `dark` sub-maps. Those
override the flat tokens for that mode, which is how a skin follows the
Home Assistant theme:

```json
{
  "dial-text-color": "var(--primary-text-color, #212121)",
  "modes": {
    "light": { "dial-idle-fill": "var(--secondary-background-color, #e5e5e5)" },
    "dark": { "dial-idle-fill": "var(--secondary-background-color, #282828)" }
  }
}
```

A skin **with** `modes` follows the Home Assistant light/dark mode. A skin
**without** keeps the same colors everywhere.

Two keys are flags rather than colors, so they never become CSS variables:

| Flag | What it does |
|------|--------------|
| `colored-ticks` | The active arc takes the HVAC state color instead of the skin's neutral |
| `state-text` | The center temperature takes the HVAC state color |

Both accept `"true"` and can sit in the flat map or in a `modes` block, so a
skin can use one in light and not in dark.

The mode comes from `hass.themes.darkMode`, which is the effective mode — it
already accounts for the theme the user picked in their profile and for a
theme's own light/dark variants. `src/card/card.ts` passes it to the dial as
`dark_mode`. When it is missing (a standalone demo, or a frontend too old to
report it) the dial falls back to `prefers-color-scheme`.

The CSS defaults in `src/dial/styles.ts` are the `dark` skin. Keep them in sync
with `src/skins/dark.json` — a fixed skin must not pick up the surrounding
Home Assistant theme by accident.

### Where the state color goes

The state colors are the ones the card has always used: `#e36304` for heating,
`#007af1` for cooling, `#a68b00` for drying. Do not tint them. A tinted disc
reads as softer, but it changes the character of the card, and the state color
is what the whole design is built around.

Where the color lands does depend on the mode:

- **Dark dashboard** — the disc is filled with the state color and the text
  stays light on top of it. The classic look.
- **Light dashboard** — the disc keeps its neutral surface and the center
  temperature takes the state color instead. A big saturated disc is heavy on
  a light card, and the number is what the eye goes to anyway.

That split is what the `state-text` flag in a skin file controls. It is a
per-mode flag, so a skin can do one thing in light and another in dark. The
flag is off unless a skin asks for it, and the `dark` and `light` skins leave
it off, so they keep their solid disc.

## Project Structure

```
src/
├── card/
│   └── card.ts          # Main card element, HA integration
├── dial/
│   ├── dial.ts          # Dial component (SVG rendering, interaction)
│   ├── dial-arc.ts      # Ring/arc rendering
│   ├── dial-interaction.ts  # Edit mode controller (timer, adjustments)
│   ├── dial-ticks.ts    # Tick mark rendering
│   ├── styles.ts        # CSS styles
│   ├── svg-utils.ts     # Math utilities (rotation, clamping, etc.)
│   └── temperature-format.ts  # How a temperature is rounded for display
├── localize/
│   ├── index.ts         # Translation lookup
│   └── languages/       # One JSON file per language
├── skins/
│   ├── index.ts         # Skin loading and token resolution
│   └── *.json           # One file per skin
├── const.ts             # Constants and defaults
├── ha-types.ts          # Home Assistant type definitions
├── thermostat-dark-card.ts  # Entry point (registers card)
└── types.ts             # TypeScript interfaces
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build to `dist/` |
| `npm run dev` | Build with file watching |
| `npm run preview` | Serve `dist/` on port 4000 |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests on every change |
| `npm run lint` | Biome lint check |
| `npm run clean` | Remove `dist/` |
| `npm run start:hass` | Run HA dev container |

## Tests

Tests sit next to the code they cover as `*.test.ts` and run with [Vitest](https://vitest.dev/)
in a [happy-dom](https://github.com/capricorn86/happy-dom) document. They mount the real
`thermostat-dark-card` and `thermostat-dial` elements, so they exercise the Lit lifecycle,
shadow DOM and the events between the dial and the card. Home Assistant is a plain object with
a mocked `callService`.

happy-dom has no layout, so anything that depends on rendered sizes (the ring drag, touch target
scaling) needs its geometry stubbed, and a visual check in a real browser is still worth doing.

## Testing with Fake Climate Entities

The `.hass_dev/` directory includes a custom component (`fake_climate`) that provides test climate entities with dual mode, presets, and various HVAC states. These are configured in `.hass_dev/configuration.yaml`.

## Build Configuration

- **Vite** for bundling (single JS output)
- **TypeScript** with strict mode
- **Target**: ES2017 for broad browser support
- **Output**: `dist/thermostat-dark-card.js`

## Release

Releases are automated with [release-please](https://github.com/googleapis/release-please-action) via
`.github/workflows/release.yml`. There is no version to tag:

1. Merge the feature PR. release-please opens a `chore(main): release X.Y.Z` PR.
2. Approve the held workflow run on that PR — see
   [Releasing (maintainers)](README.md#releasing-maintainers) in the README for why and how.
3. Merge the release PR. The GitHub release is created and the built
   `dist/thermostat-dark-card.js` is attached as the asset.
