---
name: t3code-sync
description: Safely sync the latest pingdotgg/t3code main branch into the detected default branch of quantipixels/sigidi while preserving merged SIGIDI work, downstream ownership, fork-owned migration history, release policy, and every active worktree.
---

# T3 Code Sync

Sync upstream with a merge commit in an isolated worktree. Preserve SIGIDI history and keep every existing worktree unchanged. This skill does not rebase feature branches or publish unrelated work.

## Repository contract

Use these endpoints unless the repository proves that they changed:

- upstream: `pingdotgg/t3code`, branch `main`, remote `upstream`
- SIGIDI: `quantipixels/sigidi`, target detected from the GitHub default branch, remote `github-sigidi`
- local upstream mirror: `t3code-main`, tracking `upstream/main`

Resolve the target branch from GitHub on every run. Verify remote URLs. Do not infer either identity from stale local configuration. Read `AGENTS.md` and `docs/architecture/sigidi-downstream-boundary.md` before acting.

## Authority and safety rules

- Treat an outline request as read-only. Push only when the user explicitly authorized updating the SIGIDI remote default branch.
- Preserve dirty, untracked, and feature-branch work in every existing worktree.
- Work in one temporary detached worktree created from the current SIGIDI remote default branch.
- Fetch both endpoints before comparison. Merge `upstream/main`; do not rebase or squash merged SIGIDI work.
- Keep `t3code-main` read-only. Keep no local branch named `main`.
- Do not force-push. Fetch the SIGIDI target again immediately before push and rebuild if it moved.
- Run focused proof. Do not run repository-wide checks unless the user asks.
- Remove only the exact temporary worktree created by this run.
- Never create a pull request or publish upstream unless the user explicitly authorizes it.

## 1. Resolve and pin the candidate

Capture the original branch, HEAD, status, and complete worktree inventory. Use an explicit repository path for later commands so a directory change cannot redirect Git operations.

```sh
repo_root=$(git rev-parse --show-toplevel)
root_git() { git -C "$repo_root" "$@"; }
original_branch=$(root_git branch --show-current)
original_head=$(root_git rev-parse HEAD)
original_status=$(root_git status --porcelain=v1 -uall)
original_worktrees=$(root_git worktree list --porcelain)

root_git remote -v
gh auth status
target_branch=$(gh repo view quantipixels/sigidi --json defaultBranchRef --jq .defaultBranchRef.name)
test -n "$target_branch"
root_git fetch github-sigidi "$target_branch"
root_git fetch upstream main
root_git remote set-head github-sigidi -a
target_before=$(root_git rev-parse "github-sigidi/$target_branch")
upstream_head=$(root_git rev-parse upstream/main)
```

Record the full commits for `github-sigidi/$target_branch`, `upstream/main`, their merge base, and the left/right unique commit counts. Inspect unique commits and changed paths before merging. Verify both remote URLs match the repository contract.

## 2. Inspect overlaps and ownership

Intersect paths changed on both sides from the merge base. Compare upstream changes with the uncommitted and branch-only paths in every active worktree. Do not merge active feature work into the sync.

Classify each overlap:

- **upstream-owned:** product-neutral T3 capability; retain current upstream behavior with compatible SIGIDI registration.
- **SIGIDI-owned:** product identity, data, release, policy, or external-service behavior; preserve the accepted SIGIDI contract.
- **adapter boundary:** keep both behaviors behind the smallest adapter or registration seam.
- **generated artifact:** regenerate from the resolved source with the repository command.
- **unknown ownership:** stop and request a decision.

Use the downstream-boundary document and fork-patch register as authority. A missing record does not prove upstream ownership. Update the register when a resolution adds or changes non-registration logic in an upstream-owned file.

Preserve the current release policy: the release workflow publishes macOS desktop artifacts only. Keep Linux, Windows, CLI, hosted-web, finalization, and announcement publication paths disabled. Preserve the repository's existing marketing deployment mechanism without replacing or duplicating it. Expanding either surface requires an explicit maintainer decision.

## 3. Create the isolated merge

Create a temporary directory with `mktemp -d`. Add a detached worktree at the pinned `github-sigidi/$target_branch` commit. Canonicalize its path because macOS may resolve `/var` to `/private/var`.

```sh
sync_parent=$(mktemp -d)
sync_dir="$sync_parent/worktree"
root_git worktree add --detach "$sync_dir" "github-sigidi/$target_branch"
sync_dir=$(git -C "$sync_dir" rev-parse --show-toplevel)
sync_git() { git -C "$sync_dir" "$@"; }
test "$(sync_git rev-parse --show-toplevel)" = "$sync_dir"
```

Confirm every original worktree still has the captured branch, HEAD, and status. Merge in the isolated worktree:

```sh
sync_git merge --no-ff upstream/main -m "chore: sync latest T3 Code main"
```

For every conflict, inspect all stages:

```sh
sync_git diff --cc -- <files>
sync_git show :1:<file>
sync_git show :2:<file>
sync_git show :3:<file>
```

State the behavior owned by each side. Keep the smallest combined resolution and name focused proof that fails if either accepted behavior disappears. Never choose one side across all conflicts.

Preserve SIGIDI product names, bundle identifiers, artifact names, release channels, data namespaces, and SIGIDI-owned service decisions. Retain compatible upstream runtime improvements and tests.

## 4. Enforce migration ownership

Treat these paths as two independent lanes:

- upstream: `apps/server/src/persistence/Migrations.ts`, `Migrations/`, `effect_sql_migrations`
- SIGIDI: `apps/server/src/persistence/SigidiMigrations.ts`, `SigidiMigrations/`, `sigidi_sql_migrations`

Never renumber or edit SIGIDI history to make room for upstream. Never allocate an upstream migration ID to a SIGIDI feature. SIGIDI migrations create or alter only `sigidi_*` tables unless a recorded maintainer exception exists.

Reopen migration compatibility proof when the sync changes a migration registry or source directory, `packages/shared/src/sigidiMigrationCompatibility.ts`, `DatabaseMigrations.ts`, a SQLite adapter, startup migration wiring, `servicePreflight.ts`, or the Effect identity in `pnpm-lock.yaml`.

The compatibility record stores the tested upstream commit and full SHA-256 digests of exact committed Git blob bytes. Do not hash converted working-tree files. The checker verifies the record and must never rewrite it.

After creating the merge commit, run:

```sh
pnpm migrations:check -- --revision HEAD
```

If upstream history or the Effect identity changed, keep the merge unpushed. Update the proposed compatibility record only after reviewing the source change and passing the required proof. Then amend or create the integration commit and rerun the checker.

Run the migration runner and compatibility tests under the required Node and Bun engines as documented in `AGENTS.md` and `docs/internals/sigidi-migrations.md`. Include the supported upstream fixture, concurrent startup, rollback, idempotency, capability failure, and both-ledger remote-preflight proof when the affected surfaces require them. Never use sleeps or polling.

## 5. Verify and commit

Check the candidate:

```sh
sync_git status --short
sync_git grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -- . ':!pnpm-lock.yaml'
sync_git diff --check
```

Install with `pnpm --dir "$sync_dir" install --frozen-lockfile` only when focused proof needs dependencies. Run focused tests for every conflict and affected boundary. Commit only after applicable proof passes. Rerun focused tests if hooks change files.

## 6. Push without overwriting new work

Fetch the target branch again and confirm it still equals the commit pinned before the merge. If it moved, rebuild from the new remote commit.

```sh
root_git fetch github-sigidi "$target_branch"
test "$(root_git rev-parse "github-sigidi/$target_branch")" = "$target_before"
sync_git push github-sigidi "HEAD:$target_branch"
```

Let Git reject a moved target. Never bypass rejection with force. After push, fetch the target and confirm the remote commit equals the candidate.

Remove only the worktree created by this run. Confirm every original worktree still has its captured branch, HEAD, and status. Do not prune unrelated worktrees.

## Report

Report the target branch; old and new target commits; imported upstream range and count; merge commit and link; overlap and conflict resolutions; fork-patch register changes; migration compatibility identity; focused tests; residual gaps; original-worktree equality proof; push state; and CI state.

When asked only for an outline, group upstream commits by product area, separate imported work from SIGIDI-specific resolutions, and state that no Git or remote mutation occurred.
