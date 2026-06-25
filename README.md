# Thermostat Dark Card

A thermostat card with a round dial for Home Assistant — supports both dark and light themes.

> **Status:** Active redesign in progress. This branch contains the new project scaffolding. Card implementation will follow.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

## Tech Stack

- **Lit 3** — Web component framework (same as HA core frontend)
- **TypeScript 5** — Strict mode
- **Vite 6** — Build tool (same approach as Mushroom cards)
- **ESLint 9** — Flat config with TypeScript support
- **Prettier 3** — Code formatting

## Development

Requires Node.js 24+.

```bash
npm install
npm run build       # production build → dist/thermostat-dark-card.js
npm run dev         # build with watch mode (rebuilds on save)
npm run preview     # serve dist/ on port 5000
npm run lint        # run eslint
```

### Local HA sandbox

Run a Home Assistant instance with Docker that loads the card from the Vite preview server:

```bash
# Terminal 1: build + serve
npm run dev &
npm run preview

# Terminal 2: Home Assistant
npm run start:hass
```

Then open http://localhost:8123. The HA sandbox config is in `.hass_dev/configuration.yaml`.

No devcontainer, no VS Code dependency — works with any editor and terminal.

## Distribution

Built for [HACS](https://hacs.xyz/) (Home Assistant Community Store):
- `hacs.json` defines the card metadata
- GitHub Actions build and attach `thermostat-dark-card.js` to releases
- HACS picks up the file from the release assets

## License

MIT
