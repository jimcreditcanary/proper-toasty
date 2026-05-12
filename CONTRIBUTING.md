# Contributing

Short, opinionated workflow for shipping changes without breaking
production. Tailored to a single-maintainer codebase — adjust if the
team grows.

## TL;DR

```
git checkout -b feat/<short-name>
# ... make changes ...
git push -u origin feat/<short-name>
gh pr create
# wait for CI green (~30-60s), test the Vercel preview URL, merge
```

Direct pushes to `main` are blocked. Every change goes through a
feature branch + PR.

## Why

Before this workflow, every commit went straight to `main` and triggered
a 2-3 minute Vercel build. A missing semicolon burned a full build
cycle. Worse — work-in-progress from multiple unrelated workstreams
stacked up in the same working tree and got tangled together at commit
time (see the post-mortem on the heat-pump redesign / AI visibility /
secrets-handling tangle in May 2026).

PRs solve both problems:
- CI catches lint/type/test failures in 30-60s on GitHub, before
  Vercel ever boots
- Each PR gets its own Vercel preview URL — test the change without
  touching prod
- Branches force you to scope a unit of work; you can't accidentally
  ship six things at once

## Branch naming

- `feat/` — new features
- `fix/` — bug fixes
- `chore/` — tooling, deps, CI, refactor with no functional change
- `docs/` — docs only

Keep the slug short and kebab-case: `feat/heat-pump-report-redesign`,
not `feat/redesign-the-heat-pump-report-page-with-new-design-system`.

## CI

`.github/workflows/ci.yml` runs three checks in parallel on every PR:

| Job | What | Typical duration | Required? |
|---|---|---|---|
| `lint` | `npm run lint` (ESLint) | ~20s | No (baseline broken — see below) |
| `typecheck` | `npx tsc --noEmit` | ~30s | **Yes** |
| `test` | `npm test` (Vitest) | ~30s | No (baseline broken — see below) |

Typecheck must pass before merge. Lint + Test run for visibility but
don't block today — see "Staged rollout" below. The Vercel build runs
on its own schedule (on every push to a PR branch, for preview
deploys, and on merge to main for prod).

## Branch protection setup (one-time)

GitHub Settings → Branches → Add rule, for `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Add status check: `Typecheck` (the only required check for now —
    see "Staged rollout" below)
- [x] Require branches to be up to date before merging
- [x] Require linear history (forces squash/rebase merges — keeps git
      log readable)
- [x] Do not allow bypassing the above settings (applies to admins
      too, including the repo owner — don't bypass yourself)

You'll need to push at least one PR through CI first so GitHub knows
the `Typecheck` check name exists before you can add it as required.

### Staged rollout

Lint and Test are not required-to-merge yet. Reason: as of May 2026
the baseline has 12 lint errors and 10 failing tests in the installer
subsystem (`@typescript-eslint/no-require-imports`, stale
`installer-billing`/`installer-performance` tests, etc.). Vercel's
`next build` ignores both, so they rotted unnoticed.

The CI workflow runs all three jobs on every PR for full visibility,
but only `Typecheck` blocks merges. Follow-up PRs will:

1. Clean the lint baseline → promote `Lint` to required
2. Fix the test baseline → promote `Test` to required

Until then, treat red `Lint` / `Test` rows on your PR as informational
— check whether YOUR change caused them (block your own merge if so)
or whether they were already broken on main (proceed).

## Commit messages

Mirror the existing style — short imperative title, sentence-case,
no trailing period, optional body explaining the why:

```
Heat-pump extract tab: rebuild on design-system primitives

Previous revision strayed too far from the rest of the wizard ...
```

Co-authored-by lines for AI-assisted work are fine but optional.

## When NOT to use a PR

The branch-protection rule applies always, but two cases worth calling
out:

- **Reverting a bad merge to main** — still goes through a PR (`gh
  pr create` after `git revert`). Slower but auditable.
- **Hotfix during a Vercel outage** — Vercel preview deploys won't
  work, but CI on GitHub still does. Merge with status-checks-only,
  skip the preview-URL step.

## Secrets

See `CLAUDE.md` § "Secrets handling" — non-negotiable rules for
handling `.env.local` and any credential. Read those before touching
anything that loads env vars.
