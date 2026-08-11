---
name: t3code-sync
description: Safely sync the latest pingdotgg/t3code main branch into an ori-based quantipixels/sigidi candidate, with optional draft-PR delivery. Use for upstream syncs that must preserve SIGIDI work, downstream ownership, migration history, release policy, active worktrees, and Stable or Nightly tag boundaries.
---

# T3 Code Sync

Sync upstream with a merge commit on a named candidate branch in an isolated worktree. Preserve SIGIDI history and keep every existing worktree unchanged. This skill does not rebase feature branches, publish releases, or mirror upstream tags into SIGIDI.

## Repository contract

Use these endpoints unless the repository proves that they changed:

- upstream: `pingdotgg/t3code`, branch `main`, remote `upstream`
- SIGIDI: `quantipixels/sigidi`, integration branch `ori`, remote `github-sigidi`
- local upstream mirror: `t3code-main`, tracking `upstream/main`

Verify that GitHub still reports `ori` as the SIGIDI default branch on every run. Stop if it does not; do not silently integrate into another branch. Verify remote URLs. Do not infer either identity from stale local configuration. Read `AGENTS.md` and `docs/architecture/sigidi-downstream-boundary.md` before acting.

## Authority and safety rules

- Treat an outline request as read-only. Push a candidate branch or create a draft PR only with explicit PR-delivery authority. Update remote `ori` directly only with separate explicit authority.
- Preserve dirty, untracked, and feature-branch work in every existing worktree.
- Create and check out one collision-free candidate branch in a temporary worktree from current `github-sigidi/ori`.
- Fetch both endpoints before comparison. Merge `upstream/main`; do not rebase or squash merged SIGIDI work.
- Keep `t3code-main` read-only. Keep no local branch named `main`.
- Do not force-push. Fetch `ori` again immediately before push and rebuild if it moved.
- Run focused proof. Do not run repository-wide checks unless the user asks.
- Remove only the exact temporary worktree created by this run.
- Never create, move, delete, or push a tag, dispatch a release workflow, publish upstream, or merge a PR unless the user separately authorizes that action.

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
integration_branch=ori
default_branch=$(gh repo view quantipixels/sigidi --json defaultBranchRef --jq .defaultBranchRef.name)
test "$default_branch" = "$integration_branch"
root_git fetch github-sigidi "$integration_branch"
root_git fetch upstream main
root_git remote set-head github-sigidi -a
target_before=$(root_git rev-parse "github-sigidi/$integration_branch")
upstream_head=$(root_git rev-parse upstream/main)
```

Record the full commits for `github-sigidi/ori`, `upstream/main`, their merge base, and the left/right unique commit counts. Inspect unique commits and changed paths before merging. Verify both remote URLs match the repository contract. Fast-forward the local `t3code-main` mirror to `upstream/main` only when it is not checked out in another worktree.

## 2. Inspect overlaps and ownership

Intersect paths changed on both sides from the merge base. Compare upstream changes with the uncommitted and branch-only paths in every active worktree. Do not merge active feature work into the sync.

Classify each overlap:

- **upstream-owned:** product-neutral T3 capability; retain current upstream behavior with compatible SIGIDI registration.
- **SIGIDI-owned:** product identity, data, release, policy, or external-service behavior; preserve the accepted SIGIDI contract.
- **adapter boundary:** keep both behaviors behind the smallest adapter or registration seam.
- **generated artifact:** regenerate from the resolved source with the repository command.
- **unknown ownership:** stop and request a decision.

Use the downstream-boundary document and fork-patch register as authority. A missing record does not prove upstream ownership. Update the register when a resolution adds or changes non-registration logic in an upstream-owned file.

Preserve the current release policy: pull requests and accepted tags rehearse unsigned macOS desktop artifacts; accepted Stable and Nightly tags can also publish the SIGIDI-owned `@sigidi/cli` package. Keep Linux and Windows desktop, mobile distribution, hosted web, GitHub Release, finalization, and announcement publication paths disabled. Preserve the repository's existing marketing deployment mechanism without replacing or duplicating it. Expanding either surface requires an explicit maintainer decision.

## 3. Reconcile Stable and Nightly state

Inspect remote refs without importing one product's tags into the other product's namespace:

```sh
root_git ls-remote --heads github-sigidi
root_git ls-remote --tags github-sigidi
root_git ls-remote --heads upstream
root_git ls-remote --tags upstream
```

Record the latest valid Stable tag (`vX.Y.Z`) and Nightly tag (`vX.Y.Z-nightly.YYYYMMDD.N`) on each remote, their target commits, and whether each commit is an ancestor of the pinned branch or candidate. Report missing, duplicate, moved, legacy, or non-triggering tag patterns such as `nightly-v*`. Stable and Nightly are SIGIDI `local` channels, not permission to copy T3 Code release refs.

Never mirror an upstream tag to `github-sigidi`. A SIGIDI tag push can start artifact and npm publication, so tag creation, movement, deletion, push, and release-workflow dispatch require separate release authority. Ordinary sync reconciliation is read-only even when the user asks to sync channel state.

## 4. Create the isolated merge

Create a temporary directory with `mktemp -d`. Choose the user-requested candidate name or a collision-resistant `sync/t3code-main-<upstream-short-sha>` name. Stop if the branch exists locally or remotely. Add and check out that branch in a worktree at the pinned `github-sigidi/ori` commit. Canonicalize its path because macOS may resolve `/var` to `/private/var`.

```sh
sync_parent=$(mktemp -d)
sync_dir="$sync_parent/worktree"
candidate_branch=${candidate_branch:-"sync/t3code-main-$(root_git rev-parse --short=9 upstream/main)"}
if root_git show-ref --verify --quiet "refs/heads/$candidate_branch" ||
  root_git ls-remote --exit-code --heads github-sigidi "$candidate_branch" >/dev/null 2>&1; then
  echo "Candidate branch already exists: $candidate_branch" >&2
  exit 1
fi
root_git worktree add -b "$candidate_branch" "$sync_dir" "github-sigidi/ori"
sync_dir=$(git -C "$sync_dir" rev-parse --show-toplevel)
sync_git() { git -C "$sync_dir" "$@"; }
test "$(sync_git rev-parse --show-toplevel)" = "$sync_dir"
```

Confirm every original worktree still has the captured branch, HEAD, and status. Merge in the isolated worktree:

```sh
sync_git merge --no-ff upstream/main -m "chore: sync latest T3 Code main"
```

Keep this exact merge subject. A draft PR uses the `ci:upstream` label for the full maintainer compatibility suite; after merge, the push workflow also recognizes this subject. Ordinary SIGIDI commits do not spend those runner resources.

For every conflict, inspect all stages:

```sh
sync_git diff --cc -- <files>
sync_git show :1:<file>
sync_git show :2:<file>
sync_git show :3:<file>
```

State the behavior owned by each side. Keep the smallest combined resolution and name focused proof that fails if either accepted behavior disappears. Never choose one side across all conflicts.

Preserve SIGIDI product names, bundle identifiers, artifact names, release channels, data namespaces, and SIGIDI-owned service decisions. Retain compatible upstream runtime improvements and tests.

## 5. Enforce migration ownership

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

## 6. Verify and commit

Check the candidate:

```sh
sync_git status --short
sync_git grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -- . ':!pnpm-lock.yaml'
sync_git diff --check -- . ':(exclude)patches/*.patch'
```

Imported package patch payloads can contain whitespace that is significant to the target source and makes Git's generic whitespace checker noisy. Do not normalize those payloads only to satisfy `diff --check`; require the frozen install to apply and verify them instead.

Install with `pnpm --dir "$sync_dir" install --frozen-lockfile` only when focused proof needs dependencies. Run focused tests for every conflict and affected boundary. Commit only after applicable proof passes. Rerun focused tests if hooks change files.

## 7. Deliver without overwriting new work

Fetch `ori` again and confirm it still equals the commit pinned before the merge. If it moved, rebuild from the new remote commit. Never retarget a candidate onto the moved branch with a rebase.

```sh
root_git fetch github-sigidi ori
test "$(root_git rev-parse github-sigidi/ori)" = "$target_before"
```

When the user authorized PR delivery, prepare a PR body in a temporary file and set `pr_body` to that path. Push only the candidate branch, verify its remote SHA, open one draft PR to `ori`, and apply `ci:upstream`:

```sh
sync_git push -u github-sigidi "HEAD:refs/heads/$candidate_branch"
test "$(root_git ls-remote github-sigidi "refs/heads/$candidate_branch" | cut -f1)" = "$(sync_git rev-parse HEAD)"
pr_url=$(gh pr create --repo quantipixels/sigidi --draft --base ori --head "$candidate_branch" --title "chore: sync latest T3 Code main" --body-file "$pr_body")
gh pr edit --repo quantipixels/sigidi "$pr_url" --add-label ci:upstream
```

When the user separately authorized a direct `ori` update, push `HEAD:ori` only after the same moved-base check. Let Git reject a moved branch. Never bypass rejection with force. Fetch and verify the exact remote candidate after either route. Do not merge the PR as part of sync delivery.

Remove only the worktree created by this run after the candidate is committed and delivered or retained safely. Keep the named local branch. Confirm every original worktree still has its captured branch, HEAD, and status. Do not prune unrelated worktrees.

## Report

Report `ori`; old and candidate commits; imported upstream range and count; merge commit; candidate branch and PR link; Stable and Nightly ref reconciliation; overlap and conflict resolutions; fork-patch register changes; migration compatibility identity; focused tests; residual gaps; original-worktree equality proof; push state; and CI state.

When asked only for an outline, group upstream commits by product area, separate imported work from SIGIDI-specific resolutions, and state that no Git or remote mutation occurred.
