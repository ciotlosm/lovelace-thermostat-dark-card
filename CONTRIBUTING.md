# Contributing

## Branch & PR Workflow

The `main` branch is protected. All changes must go through pull requests.

```
1. Create a feature branch from main
2. Push the branch to origin
3. Create a PR targeting main
4. CI (build.yml) runs automatically on the PR
5. Review and merge the PR
6. CI runs again on the merge commit to main
```

**Never push directly to main.**

## Release Process

Releases are automatic. When a PR is merged to main:

```
1. release.yml triggers automatically
2. It builds the card and runs HACS validation
3. It reads the version from package.json
4. If that version tag doesn't exist yet, it creates a GitHub Release
5. The built JS file is uploaded as a release asset
6. HACS users see the new version
```

To trigger a new release, bump the version in `package.json` as part of your PR.
If the version in `package.json` already has a corresponding tag, no release is created.

## How HACS Installs

HACS uses the following to discover and install the card:

- **Discovery**: `hacs.json` defines the card category (`plugin`) and filename
- **Version**: HACS looks at GitHub Releases (tags) for available versions
- **Download**: HACS downloads `thermostat-dark-card.js` from the release assets
- **README**: `render_readme: true` in `hacs.json` means HACS shows the README content in the store listing

## CI Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `build.yml` | PRs to main | Type check + Build + HACS validation |
| `label.yml` | PR opened/updated | Auto-suggests version label (patch/minor/major) |
| `release.yml` | PR merged to main | Bumps version, builds, creates GitHub Release |

## Versioning

Version is managed **only** in `package.json`. It's injected at build time via Vite — no need to update `src/const.ts`.

Version bumps happen automatically on PR merge based on labels:

| Label | When to use | Example |
|-------|------------|---------|
| `patch` (default) | Bug fixes, tweaks, docs | Fix rounding, adjust position |
| `minor` | New features, new config options | Add readonly mode, new theme |
| `major` | Breaking changes | Config format change, removed options |

The `label.yml` workflow auto-suggests a label based on file changes, but you can override it manually.

## For AI Agents

If you are an AI agent contributing to this repo:

1. **Never push to main directly** — always create a branch and PR
2. **Use `git push -u origin <branch-name>`** for new branches
3. **Use `gh pr create`** to open PRs (use `--body-file` for complex descriptions)
4. **Apply version labels** to your PRs:
   - `patch` — bug fixes, small tweaks (default if no label)
   - `minor` — new features, new options
   - `major` — breaking changes to config or behavior
5. **Do not bump version manually** — the release workflow handles it
6. **Do not create releases** — they're automatic on PR merge
7. **Run `npx tsc --noEmit` and `npm run build`** before committing to verify no errors
8. **Commit messages**: Use conventional style — short title, detailed body if needed

## Development Setup

See [DEVELOPMENT.md](DEVELOPMENT.md) for local dev environment setup.
