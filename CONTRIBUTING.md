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

Releases are managed by [Release Please](https://github.com/googleapis/release-please). The flow:

```
1. Write commits with conventional prefixes:
   - fix: ... → patch bump
   - feat: ... → minor bump
   - feat!: ... or BREAKING CHANGE: → major bump
   - chore: ... → no version bump
2. Merge PR to main
3. Release Please creates/updates a "Release PR" with version bump + changelog
4. When ready to ship: merge the Release PR
5. GitHub Release is created → build workflow uploads JS asset
6. HACS sees the new release
```

You do NOT need to manually bump versions. Release Please handles `package.json` and `CHANGELOG.md`.

## Conventional Commits

All PR titles and commits should follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Version bump | Example |
|--------|-------------|---------|
| `fix:` | patch | `fix: rounding error in temperature display` |
| `feat:` | minor | `feat: add status entity display` |
| `feat!:` | major | `feat!: remove legacy config options` |
| `chore:` | none | `chore: update dependencies` |
| `docs:` | none | `docs: update README` |

## How HACS Installs

HACS uses the following to discover and install the card:

- **Discovery**: `hacs.json` defines the card category (`plugin`) and filename
- **Version**: HACS looks at GitHub Releases (tags) for available versions
- **Download**: HACS downloads `thermostat-dark-card.js` from the release assets
- **README**: `render_readme: true` in `hacs.json` means HACS shows the README content in the store listing

## CI Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `build.yml` | PRs to main | Type check + Lint + Build + HACS validation |
| `release.yml` | Push to main | Release Please manages Release PR; uploads JS on release |

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
4. **Use conventional commit prefixes** in PR titles:
   - `fix:` for bug fixes (patch)
   - `feat:` for new features (minor)
   - `feat!:` for breaking changes (major)
   - `chore:` for maintenance (no release)
5. **Do not bump version manually** — Release Please handles it
6. **Do not create releases** — they're automatic via Release PR
7. **Run `npx tsc --noEmit` and `npm run build`** before committing to verify no errors
8. **Commit messages**: Use conventional commits style

## Development Setup

See [DEVELOPMENT.md](DEVELOPMENT.md) for local dev environment setup.
