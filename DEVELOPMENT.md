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

The demo lets you test all card options without Home Assistant — theme, HVAC state, temperatures, dual mode, presets, and more. Useful for quick visual testing during development.

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
│   └── svg-utils.ts     # Math utilities (rotation, clamping, etc.)
├── editor/
│   └── editor.ts        # Visual config editor
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
| `npm run lint` | ESLint check |
| `npm run clean` | Remove `dist/` |
| `npm run start:hass` | Run HA dev container |

## Testing with Fake Climate Entities

The `.hass_dev/` directory includes a custom component (`fake_climate`) that provides test climate entities with dual mode, presets, and various HVAC states. These are configured in `.hass_dev/configuration.yaml`.

## Build Configuration

- **Vite** for bundling (single JS output)
- **TypeScript** with strict mode
- **Target**: ES2017 for broad browser support
- **Output**: `dist/thermostat-dark-card.js`

## Release

Releases are automated via GitHub Actions (`.github/workflows/release.yml`). Tag a version to trigger a release build.
