# Thermostat Dark Card

A thermostat card with a round dial for Home Assistant — supports both dark and light themes.

> **Status:** Active redesign in progress. This branch contains the new project scaffolding. Card implementation will follow.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

## Tech Stack

- **Lit 3** — Web component framework
- **TypeScript 5** — Strict mode
- **Vite 6** — Build tool
- **ESLint 9** — Flat config with TypeScript support
- **Prettier 3** — Code formatting

## Installation

### HACS (Recommended)

1. Install [HACS](https://hacs.xyz/docs/use/) if you haven't already
2. Open HACS → Frontend → Explore & Download Repositories
3. Search for "Thermostat Dark Card"
4. Click Download

### Manual

1. Download `thermostat-dark-card.js` from the [latest release](https://github.com/ciotlosm/lovelace-thermostat-dark-card/releases)
2. Place it in `config/www/`
3. Add the resource in Settings → Dashboards → Resources:
   ```yaml
   url: /local/thermostat-dark-card.js
   type: module
   ```

## Development

Requires Node.js 24+ and Podman (or any OCI-compatible container runtime).

```bash
npm install
npm run build       # production build → dist/thermostat-dark-card.js
npm run dev         # build with watch mode (rebuilds on save)
npm run preview     # serve dist/ on port 4000
npm run lint        # run eslint
```

### Local testing with HA sandbox

The dev workflow uses a real Home Assistant instance running in a container. No plugins or IDE dependencies needed.

```bash
# Terminal 1: build + serve the card
npm run dev &
npm run preview

# Terminal 2: run Home Assistant
npm run start:hass
```

Open http://localhost:8123.

**First time only:** You'll see the HA onboarding screen. Create any user account (~30 seconds). This is persisted in `.hass_dev/` so you won't see it again on subsequent runs.

After onboarding, the card JS is automatically loaded via `extra_module_url` in `.hass_dev/configuration.yaml`. Add the card to any dashboard to test it.

The sandbox includes pre-configured climate entities for testing (Living Room, Bedroom).

### How it works

```
┌─────────────────┐       ┌──────────────────────────┐
│  Vite preview   │◄──────│  HA frontend (browser)   │
│  :4000          │       │  loads thermostat-dark-   │
│  serves dist/   │       │  card.js from :4000      │
└─────────────────┘       └──────────────────────────┘
                                      ▲
                                      │
                          ┌───────────┴──────────────┐
                          │  HA container :8123      │
                          │  .hass_dev/config mounted│
                          │  climate entities ready  │
                          └──────────────────────────┘
```

### Notes

- `npm run dev` watches for file changes and rebuilds automatically. Reload the browser to pick up changes.
- The `.hass_dev/` directory is gitignored except for `configuration.yaml`. HA runtime data (database, auth, etc.) stays local.
- Port 4000 is used because macOS AirPlay Receiver occupies port 5000.

## Distribution

Built for [HACS](https://hacs.xyz/):
- `hacs.json` defines the card metadata
- GitHub Actions build and attach `thermostat-dark-card.js` to releases
- HACS picks up the file from the release assets

## License

MIT
