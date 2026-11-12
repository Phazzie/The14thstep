# Origin CI

GitHub Actions is billing-locked for this account. After the repository is detached from GitHub, Cursor Origin runs CI through the Depot app. Depot reads GitHub Actions YAML from `.depot/workflows/` and runs it on `depot-ubuntu-24.04`. Workflows under `.github/workflows/` stay in the tree. Origin does not execute them after detach, and GitHub cannot run them while billing is locked.

The default branch is `main`. Scheduled workflows start only after they are on `main`. Depot evaluates cron in UTC.

## Workflow map

| GitHub workflow | Depot workflow | What runs |
|---|---|---|
| `.github/workflows/verify.yml` (`Verify`) | `.depot/workflows/ci.yml` (`Verify`) | Same jobs, from `app/`, with `npm ci` against `app/package-lock.json`. |
| `.github/workflows/seam-freshness.yml` (`Continuous Seam Freshness Check`) | `.depot/workflows/seam-freshness.yml` | Daily freshness check. Depot supports `on.schedule`. |
| `.github/workflows/ci-triage-review-comments.yml` | none | GitHub-only. Not ported. |

### Verify

Triggers: every pull request, and pushes to `main`.

The GitHub workflow also ran on pushes to `codex/**`. That filter is not ported. Origin CI follows the default branch plus pull requests.

Each app job pins Node 24 and npm 11.6.2, then installs with `npm ci` (working directory `app/`). npm 10 rejects `app/package-lock.json` because an optional `utf-8-validate` entry is absent. The npm 11.6.2 pin is what makes the locked install succeed.

| Job | Command |
|---|---|
| `lint_and_typecheck` | `npm run lint:verify`, then `npm run check` |
| `fixtures` | `npm run verify:fixtures` |
| `contracts` | `npm run verify:contracts` |
| `core` | `npm run verify:core` |
| `composition` | `npm run verify:composition` |
| `e2e` | `npx playwright install --with-deps chromium`, then `npm run test:e2e` |
| `verify` | Aggregate gate. It needs the six jobs above. |
| `ai-review` | Pull requests only. `node --test scripts/ai-review.test.mjs`, then `node scripts/ai-review.mjs`. It does not gate `verify`. |

On an e2e failure, Playwright output is uploaded with `actions/upload-artifact@v4`. Depot stores that artifact on its own service. Download it with `depot ci artifacts`.

`verify:fixtures` compares each I/O seam's `probedAt` with `freshnessDays` in `seam-registry.json`. Those captures are older than 30 days. Refreshing them needs the live xAI and Supabase backends, which are blocked by [#71](https://github.com/Phazzie/The14thstep/issues/71) and tracked in [#91](https://github.com/Phazzie/The14thstep/issues/91). The fixtures job stays red until that work lands. The other verify commands are the ones that have to pass.

### Seam freshness

Triggers: `0 0 * * *` (midnight UTC) and `workflow_dispatch`.

Commands, from the repo root after a locked install in `tools/seam-cli`:

```sh
npm ci
node tools/seam-cli/index.js freshness
```

The GitHub workflow used Node 20 and `npm install`. The Depot workflow uses Node 24, npm 11.6.2, and `npm ci` so the scheduled job matches the verify toolchain and the committed lockfile. The check itself is unchanged: `tools/seam-cli` compares fixture file modification times with `freshnessDays`. A fresh checkout often makes those times look new even when `probedAt` inside the fixture is stale, so this job and `verify:fixtures` can disagree. That split already existed.

### AI review

`scripts/ai-review.mjs` sends the pull request diff to Grok (`grok-4.5` on the xAI chat API) and posts one comment:

```sh
origin pr comment <PR_NUMBER> --body-file <file> --edit-last --create-if-none
```

When `XAI_API_KEY` is unset, the script prints `AI review skipped: XAI_API_KEY is not set` and exits 0. When a pull request number is set and the `origin` CLI is not on `PATH`, it prints that the CLI is missing and exits 0, without calling xAI. A failed comment is printed to the log and does not fail the job. An xAI error after the key is set still fails the job.

The review is about bugs, privacy leaks, crisis handling, and broken meeting flow. It is not a merge gate.

## GitHub-only, dropped

`.github/workflows/ci-triage-review-comments.yml` is not ported.

- It starts on `pull_request_review` and reads review comments through the GitHub API (`scripts/triage-pr-comments.mjs`).
- It needs `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and the GitHub REST host. Origin does not provide that API.
- It uploads `artifacts/ci-triage-summary.json` as a GitHub Actions artifact for a human to read. The job is informational and already `continue-on-error`.
- The script stays in the repo. Nothing in Depot calls it.

Also left on GitHub only:

- Pushes to `codex/**` as a verify trigger.
- `permissions` blocks that only exist to mint a GitHub token. The Depot verify workflow still sets `contents: read` because Depot accepts that key, and no job reads a token.

## Secrets to re-enter in Depot

The ported GitHub workflows do not reference any repository secret. `GITHUB_TOKEN` is automatic on GitHub and is only used by the triage workflow that was dropped. Do not copy it into Depot.

| Secret | Where | Why |
|---|---|---|
| `XAI_API_KEY` | Depot repository secret, consumed by `.depot/workflows/ci.yml` job `ai-review` | The review calls `https://api.x.ai/v1/chat/completions`. Until this is set, the job skips and exits 0. This key was never a GitHub Actions secret in this repo. It is the same key the app uses locally and on Vercel. |
| `CURSOR_API_KEY` | Depot repository secret, only if a review run prints the note and does not comment | `origin` authenticates with `CURSOR_AUTH_TOKEN`, then `CURSOR_API_KEY`. Do not add this to the workflow file. If the Depot runner already has an Origin session, leave it unset. |

No other secret is required to run lint, typecheck, fixtures, contracts, core, composition, e2e, or the daily freshness check.

Add secrets in the Depot dashboard for this repository (or `depot ci migrate secrets-and-vars --forge=origin` once the Origin remote exists). `XAI_API_KEY` will not import from GitHub, because GitHub Actions never stored it.
