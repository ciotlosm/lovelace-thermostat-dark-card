# Contributing

## Branch & PR Workflow

The `master` branch is protected. All changes must go through pull requests.

```
1. Create a feature branch from master
2. Push the branch to origin
3. Create a PR targeting master
4. CI (build.yml) runs automatically on the PR
5. Review and merge the PR
6. CI runs again on the merge commit to master
```

**Never push directly to master.**

## Release Process

Merging to master does NOT create a release. Releases are manual:

```
1. Merge your PR to master
2. Go to GitHub → Releases → Create a new release
3. Create a new tag (e.g. v2.0.0) targeting master
4. Publish the release
5. release.yml triggers automatically:
   - Builds the card
   - Uploads thermostat-dark-card.js as a release asset
   - Runs HACS validation
6. HACS users see the new version and can update
```

## How HACS Installs

HACS uses the following to discover and install the card:

- **Discovery**: `hacs.json` defines the card category (`plugin`) and filename
- **Version**: HACS looks at GitHub Releases (tags) for available versions
- **Download**: HACS downloads `thermostat-dark-card.js` from the release assets
- **README**: `render_readme: true` in `hacs.json` means HACS shows the README content in the store listing

## CI Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `build.yml` | Push to master/redesign, PRs to master | Build + HACS validation |
| `release.yml` | Published GitHub Release | Build + upload JS to release assets |

## For AI Agents

If you are an AI agent contributing to this repo:

1. **Never push to master directly** — always create a branch and PR
2. **Use `git push -u origin <branch-name>`** for new branches
3. **Use `gh pr create`** to open PRs (use `--body-file` for complex descriptions)
4. **Do not create releases** — that's a manual step by the maintainer
5. **Run `npx tsc --noEmit` and `npm run build`** before committing to verify no errors
6. **Commit messages**: Use conventional style — short title, detailed body if needed

## Development Setup

See [DEVELOPMENT.md](DEVELOPMENT.md) for local dev environment setup.
