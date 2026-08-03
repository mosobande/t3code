---
name: t3code-sync
description: Safely sync the latest pingdotgg/t3code main branch into the detected default branch of quantipixels/sigidi while preserving merged SIGIDI work, product identity, fork-owned migration history, and an active feature worktree.
---

# T3 Code Sync

Sync upstream with a merge commit. Preserve SIGIDI history and keep the user's active worktree unchanged. This skill does not rebase feature branches or publish unrelated work.

## Repository contract

Use these endpoints unless the repository proves that they changed:

- upstream: `pingdotgg/t3code`, branch `main`, remote `upstream`
- SIGIDI: `quantipixels/sigidi`, target detected from the GitHub default branch, remote `github-sigidi`
- local upstream mirror: `t3code-main`, tracking `upstream/main`

Resolve the target branch from GitHub on every run. Verify remote URLs. Do not infer either identity from stale local configuration.

## Safety rules

- Read the repository `AGENTS.md` and inspect `git status --short --branch` first.
- Preserve dirty, untracked, and feature-branch work.
- Work in one temporary detached worktree created from the current SIGIDI remote default branch.
- Fetch both endpoints before comparison. Merge `upstream/main`; do not rebase or squash merged SIGIDI work.
- Keep `t3code-main` read-only. Keep no local branch named `main`.
- Do not force-push.
- Fetch the SIGIDI target again immediately before push. Rebuild if it moved.
- Run focused proof. Do not run repository-wide checks unless the user asks.
- Remove only the exact temporary worktree created by this run.

## 1. Resolve and pin the candidate

Run:

```sh
git status --short --branch
git remote -v
gh auth status
target_branch=$(gh repo view quantipixels/sigidi --json defaultBranchRef --jq .defaultBranchRef.name)
test -n "$target_branch"
git fetch github-sigidi "$target_branch"
git fetch upstream main
git remote set-head github-sigidi -a
```

Record the full commits for `github-sigidi/$target_branch`, `upstream/main`, their merge base, and the left/right unique commit counts. Inspect unique commits and changed paths before merging.

## 2. Create the isolated merge

Create a temporary directory with `mktemp -d`. Add a detached worktree at `github-sigidi/$target_branch`.

Merge:

```sh
git merge --no-ff upstream/main -m "chore: sync latest T3 Code main"
```

For every conflict, inspect all stages:

```sh
git diff --cc -- <files>
git show :1:<file>
git show :2:<file>
git show :3:<file>
```

Identify the behavior owned by each side. Keep the smallest combined resolution and name a focused test that fails if either behavior disappears. Never choose one side for all conflicts.

Preserve SIGIDI product identity. Retain compatible upstream runtime improvements. Do not silently restore T3 Code branding on a SIGIDI-owned surface.

## 3. Enforce migration ownership

Treat these paths as two independent lanes:

- upstream: `apps/server/src/persistence/Migrations.ts`, `Migrations/`, `effect_sql_migrations`
- SIGIDI: `apps/server/src/persistence/SigidiMigrations.ts`, `SigidiMigrations/`, `sigidi_sql_migrations`

Never renumber or edit SIGIDI history to make room for upstream. Never allocate an upstream migration ID to a SIGIDI feature. SIGIDI migrations create or alter only `sigidi_*` tables unless a recorded maintainer exception exists.

Reopen migration compatibility proof when the sync changes any of these surfaces:

- either migration registry or source directory
- `packages/shared/src/sigidiMigrationCompatibility.ts`
- `DatabaseMigrations.ts`, SQLite adapters, or startup migration wiring
- `servicePreflight.ts`
- the Effect version or patch identity in `pnpm-lock.yaml`

The compatibility record stores the tested upstream commit and full SHA-256 digests of exact committed Git blob bytes. Do not hash converted working-tree files. Do not shorten a digest. The checker verifies this record and must never rewrite it.

After creating the merge commit, run:

```sh
pnpm migrations:check -- --revision HEAD
```

If it fails because upstream history or the Effect identity changed, keep the merge unpushed. Update the proposed compatibility record against the pinned `upstream/main` only after reviewing the source change and passing the required migration proof. Then amend or create the integration commit and rerun the checker.

Run the migration runner tests under both engines:

```sh
pnpm exec vp test run apps/server/src/persistence/DatabaseMigrations.test.ts
bun node_modules/vite-plus/bin/vp test run apps/server/src/persistence/DatabaseMigrations.test.ts
pnpm exec vp test run apps/server/src/persistence/DatabaseMigrationsConcurrency.test.ts
bun node_modules/vite-plus/bin/vp test run apps/server/src/persistence/DatabaseMigrationsConcurrency.test.ts
pnpm migrations:fixture:check
pnpm exec vp test run apps/server/src/persistence/UpstreamMigrationFixture.test.ts
bun node_modules/vite-plus/bin/vp test run apps/server/src/persistence/UpstreamMigrationFixture.test.ts
pnpm exec vp test run apps/server/src/persistence/MigrationCompatibility.test.ts apps/server/src/cloud/servicePreflight.test.ts
```

Also run the supported upstream-only upgrade fixture when upstream migration sources, the engine, SQLite adapters, startup wiring, or preflight changed. Require order, rollback, idempotency, concurrent startup, capability failure, and both-ledger remote-preflight proof. Do not use sleeps or polling.

## 4. Verify the merge

Check the resolved files:

```sh
git status --short
rg -n '^(<<<<<<<|=======|>>>>>>>)' <resolved-files>
git diff --check -- <resolved-files>
```

Install with `pnpm install --frozen-lockfile` if the temporary worktree has no dependencies. Use the required Node version when available and report an engine mismatch otherwise.

Run focused tests for every conflict. Commit only after applicable proof passes. Rerun focused tests if hooks format files.

## 5. Push without overwriting new work

Fetch the target branch again and confirm it still equals the commit pinned before the merge. If it moved, rebuild from the new remote commit.

Push normally:

```sh
git push github-sigidi "HEAD:$target_branch"
```

Let Git reject a moved target. Never bypass rejection with force.

After push, fetch the target, confirm local and remote commits match, update safe mirrors only when no worktree uses them, remove the exact temporary worktree, and verify the user's original worktree is unchanged.

## Report

Report the target branch; old and new target commits; imported upstream range and count; merge commit and link; conflicts and resolutions; migration compatibility identity; focused tests; validation gaps; and CI state.
