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
4. Approve the held workflow run on the Release PR
5. Merge the Release PR
6. GitHub Release is created → release workflow uploads the JS asset
7. HACS sees the new release
```

You do NOT need to manually bump versions. Release Please handles `package.json` and `CHANGELOG.md`.

### Step 4: approve the held workflow run

`release-please` creates its branch with `GITHUB_TOKEN`. GitHub holds the workflows that run on a branch
created that way in an approval-required state instead of running them, so the `Build & Validate` check
that branch protection requires never reports, and the merge is refused with *"the base branch policy
prohibits the merge"*.

In the GitHub UI this is the **Approve workflows to run** banner on the release PR — one click. From the
command line:

```bash
# 1. Approve the held build run for the release PR
PR=<release-pr-number>
BR=$(gh pr view "$PR" --json headRefName --jq .headRefName)
RUN=$(gh run list --workflow=build.yml --branch "$BR" --limit 5 --json databaseId,status,conclusion \
  --jq '[.[] | select(.status == "action_required" or .conclusion == "action_required")][0].databaseId')
gh api -X POST "repos/ciotlosm/lovelace-thermostat-dark-card/actions/runs/$RUN/approve"

# 2. Wait for it to go green
gh run watch "$RUN" --exit-status

# 3. Merge the release PR
gh pr merge "$PR" --squash
```

Do not reach for `--admin`. It skips the required check instead of producing it, so the release would ship
without the build and without the HACS validation.

If the run already started on its own, there is nothing to approve — skip straight to the merge.

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
| `build.yml` | PRs to main, schedule, manual | Workflow audit (zizmor) + Type check + Lint + Test + Build + HACS validation |
| `release.yml` | Push to main | Release Please manages Release PR; uploads JS on release; validates HACS after the upload |

The HACS validation runs on the PR and on the daily schedule. It does not run
on the push to `main`: that push can publish a new release, and HACS resolves
the card from the asset of the latest release, which `release.yml` uploads in
parallel. `release.yml` therefore validates HACS itself, after the asset is
uploaded.

## CI Security

The workflows are audited with [zizmor](https://zizmor.sh), which runs in a
job of its own. The rules the repository follows:

- **Every action is pinned to a commit SHA**, with the version in a comment.
  Dependabot updates the pins, and reads the comment to know which release
  the SHA belongs to.
- **Every job declares its own permissions**, and the workflows declare
  `permissions: {}` at the top. The job that runs the code of a pull request
  only gets a read-only token; the job that comments on a pull request is the
  only one that can write.
- **The job that may write code scanning results is separate from the job
  that runs the code.** The zizmor job only parses YAML files, so it is the
  one job that gets `security-events: write`. A pull request from a fork gets
  a read-only token, so there the findings are reported as annotations on the
  pull request instead of being uploaded to the Security tab.
- **No data from a pull request is interpolated into a script.** The
  translation warnings reach the comment job as an environment variable, so a
  translation file can not turn into code.
- **`npm ci --ignore-scripts`**, so a compromised package can not run code
  during the install. The job that builds the published file also runs
  without the npm cache.
- **`persist-credentials: false`** on every checkout, so the token does not
  stay in `.git/config`.

`hacs/action` is pinned as well. Its container image floats on purpose, so
the validation keeps picking up new checks — pinning the image would have
hidden the "structure" check that appeared recently.

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
7. **Run `npx tsc --noEmit`, `npm test` and `npm run build`** before committing to verify no errors
8. **Commit messages**: Use conventional commits style

## Development Setup

See [DEVELOPMENT.md](DEVELOPMENT.md) for local dev environment setup.
