---
name: t3code-sync
description: Safely merge the latest pingdotgg/t3code main branch into the detected default branch of quantipixels/sigidi while preserving SIGIDI history, downstream boundaries, migration compatibility, and every active worktree. Use when asked to update, sync, or merge upstream T3 Code into SIGIDI, refresh its integration branch, or outline an upstream sync. Do not use for ordinary SIGIDI feature rebases or for publishing without explicit authority.
---

# T3 Code Sync

Merge upstream with a merge commit in an isolated worktree. Preserve the target branch history and every active checkout. Treat a clean Git merge as only the start of compatibility proof.

## Repository contract

Use these endpoints unless the current repository proves that they changed:

- Upstream repository: `pingdotgg/t3code`.
- Upstream branch: `main`.
- SIGIDI repository: `quantipixels/sigidi`.
- Target branch: the current GitHub default branch, resolved on every run.
- Expected remotes: `upstream` and `github-sigidi`.
- Local read-only upstream mirror: `t3code-main`, tracking `upstream/main`.

Read the repository `AGENTS.md` and `docs/architecture/sigidi-downstream-boundary.md` before acting. Stop if either endpoint, remote URL, default branch, or ownership boundary is missing or unexpected.

## Authority boundary

An outline request authorizes read-only discovery only. A sync request authorizes the isolated merge and focused proof. Push only when the user also authorized updating the SIGIDI remote default branch. Never create a pull request, publish upstream, force-push, rebase the SIGIDI default branch, or squash merged SIGIDI work unless the user explicitly changes that authority.

## Shell and worktree invariant

Resolve the original worktree once. Use an explicit Git directory for every later command. Never depend on the shell's current directory.

```sh
repo_root=$(git rev-parse --show-toplevel)
root_git() { git -C "$repo_root" "$@"; }
original_branch=$(git -C "$repo_root" branch --show-current)
original_head=$(git -C "$repo_root" rev-parse HEAD)
original_status=$(git -C "$repo_root" status --porcelain=v1 -uall)
original_worktrees=$(git -C "$repo_root" worktree list --porcelain)
```

After creating the temporary worktree, canonicalize its root before comparing
paths. This handles macOS paths where `/var` resolves to `/private/var`.
Then define:

```sh
sync_dir=$(git -C "$sync_dir" rev-parse --show-toplevel)
sync_git() { git -C "$sync_dir" "$@"; }
test "$(sync_git rev-parse --show-toplevel)" = "$sync_dir"
verify_original() {
  test "$(root_git branch --show-current)" = "$original_branch" &&
    test "$(root_git rev-parse HEAD)" = "$original_head" &&
    test "$(root_git status --porcelain=v1 -uall)" = "$original_status"
}
```

Use `sync_git` for every merge, conflict inspection, edit check, test-related Git query, commit, and push source. Use `root_git` only for repository-wide fetches, worktree creation or removal, and verification of the original checkout. Use explicit `--dir`, `--cwd`, or absolute paths for non-Git commands. If either root check fails, stop.

## Safety rules

- Record every worktree, branch, HEAD, and dirty or untracked state before changing Git state.
- Preserve dirty, untracked, and active feature-branch work exactly.
- Start the sync worktree from the freshly fetched `github-sigidi/$target_branch`, not a local branch or mirror.
- Merge `upstream/main`. Never merge the local mirror.
- Keep no local branch named `main`.
- Run focused proof. Do not run repository-wide checks unless the user asks.
- Fetch the target branch again before push and stop if it moved.
- Remove only the exact temporary worktree created by this run.
- Report every incomplete sync. Never turn a conflict, failed gate, missing command, or unknown owner into a successful result.

## 1. Resolve and pin current state

Run with explicit roots:

```sh
root_git status --short --branch
root_git remote -v
gh auth status
target_branch=$(gh repo view quantipixels/sigidi --json defaultBranchRef --jq .defaultBranchRef.name)
test -n "$target_branch"
root_git fetch github-sigidi "$target_branch"
root_git fetch upstream main
root_git remote set-head github-sigidi -a
target_before=$(root_git rev-parse "github-sigidi/$target_branch")
upstream_head=$(root_git rev-parse upstream/main)
merge_base=$(root_git merge-base "$target_before" "$upstream_head")
```

Record both full commit hashes, their merge base, and:

```sh
root_git rev-list --left-right --count "$target_before...$upstream_head"
root_git log --oneline "$merge_base..$target_before"
root_git log --oneline "$merge_base..$upstream_head"
```

Verify both remote URLs resolve to the expected repositories. Stop if the target branch is absent, the endpoints changed, authentication cannot satisfy the authorized operation, or a local branch named `main` exists.

## 2. Inspect overlaps before merging

List paths changed on each side from the merge base and intersect them. Also inspect every checked-out branch from `root_git worktree list --porcelain`; compare its uncommitted paths and branch-only paths with the upstream range. Do not merge active feature work into the sync.

Classify each overlap before Git chooses a result:

- **upstream-owned:** product-neutral T3 capability; normally accept current upstream behavior while preserving compatible SIGIDI registration.
- **SIGIDI-owned:** identity, data, release, policy, or external-service behavior; preserve the accepted SIGIDI contract.
- **adapter boundary:** both sides are valid; resolve behind the smallest adapter or registration seam.
- **generated artifact:** regenerate from the resolved source with the repository command; do not hand-merge derived output.
- **unknown ownership:** stop and request a decision. Do not guess.

Use the downstream boundary document and its fork-patch register as authority. A missing record does not prove upstream ownership.

## 3. Create and validate an isolated worktree

Create a temporary parent directory. Use a new child path for the detached worktree at the pinned target:

```sh
sync_parent=$(mktemp -d)
sync_dir="$sync_parent/worktree"
root_git worktree add --detach "$sync_dir" "$target_before"
sync_dir=$(git -C "$sync_dir" rev-parse --show-toplevel)
sync_git() { git -C "$sync_dir" "$@"; }
test "$(sync_git rev-parse --show-toplevel)" = "$sync_dir"
test "$(sync_git rev-parse HEAD)" = "$target_before"
```

Run `verify_original` after worktree creation. Confirm that every entry in `original_worktrees` still exists with the same branch and HEAD, plus the new sync worktree. Stop if any captured checkout differs.

## 4. Merge and resolve by ownership

Run only in the sync worktree:

```sh
sync_git merge --no-ff --no-commit upstream/main
```

If Git reports conflicts, inspect all three versions with `sync_git`:

```sh
sync_git diff --cc -- <files>
sync_git show :1:<file>
sync_git show :2:<file>
sync_git show :3:<file>
```

Do not select `ours` or `theirs` across all files. For every conflict:

1. Confirm its ownership class.
2. State the pre-sync SIGIDI behavior.
3. State the imported upstream behavior and owning seam.
4. Choose the smallest combined resolution.
5. Name focused proof that fails if either accepted behavior regresses.
6. Update the fork-patch register when the resolution adds or changes non-registration logic in an upstream-owned file.

Preserve SIGIDI product names, bundle identifiers, protocols, artifact names, release channels, `sigidi` executable or window identities, data namespaces, and SIGIDI-owned service decisions. Retain compatible upstream runtime improvements and tests. Keep distinct test coverage from both sides.

After each merge, abort, conflict-resolution stage, commit, and push attempt, verify the original branch, HEAD, status, and worktree list. Stop on drift. If aborting, use `sync_git merge --abort` and report the incomplete result.

## 5. Run the always-on migration compatibility gate

This gate applies even when Git reports no conflict. Inspect at least:

- `apps/server/src/persistence/Migrations.ts`;
- `apps/server/src/persistence/Migrations/**`;
- `apps/server/src/cloud/servicePreflight.ts` and its tests;
- SQLite startup, migration-engine, ledger, schema-capability, and remote-preflight code changed by either side.

When the tracked SIGIDI migration checker exists, run its documented command against fresh, oldest-supported, current-SIGIDI, tampered-source, incompatible-schema, repeated-start, concurrent-start, interrupted-start, and remote-preflight fixtures. Require the ordered upstream ID, name, canonical source hash, engine identity, applied-ledger prefix, and schema capabilities before SIGIDI SQL runs. Require both migration lanes to share one critical section and transaction.

Until that checker and the tracked migration ADR exist, any upstream-range change to the files or concerns above is a blocking compatibility gap. Do not push the sync. Report the exact changed paths and the manual proof or migration-lane work still required. The absence of a migration conflict is not a pass.

## 6. Focused proof and merge commit

Check the whole candidate for unresolved markers and whitespace errors:

```sh
sync_git status --short
sync_git grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -- . ':!pnpm-lock.yaml'
sync_git diff --check
```

Install only when focused proof needs dependencies and the isolated worktree lacks them:

```sh
pnpm --dir "$sync_dir" install --frozen-lockfile
```

Use the Node version required by `package.json`. Report an unavailable engine as a gap. Run focused tests from the explicit sync path, for example `pnpm --dir "$sync_dir" exec vp test run <files>`. Cover every conflict, affected boundary, migration gate, and imported behavior at risk. Do not use sleeps or polling as asynchronous proof.

If the merge used `--no-commit`, create the merge commit only after all required proof passes:

```sh
sync_git commit -m "chore: sync latest T3 Code main"
```

Run the focused proof again if a hook changes any file. Record the candidate tree and commit.

## 7. Push without overwriting new work

Push only with explicit user authority. Fetch through `root_git`, then compare the full target hash:

```sh
root_git fetch github-sigidi "$target_branch"
target_now=$(root_git rev-parse "github-sigidi/$target_branch")
test "$target_now" = "$target_before"
sync_git push github-sigidi "HEAD:$target_branch"
```

If the target moved, do not push. Remove the disposable candidate only after recording it, then rebuild from the new target in a fresh isolated worktree. Let Git reject a non-fast-forward update. Never bypass it with force.

After a successful push:

1. Fetch `github-sigidi/$target_branch` again.
2. Confirm its full hash equals the candidate merge commit.
3. Update a same-named local target branch only if no worktree has it checked out and a fast-forward is possible.
4. Fast-forward `t3code-main` to `upstream/main` only if no worktree has it checked out.
5. Recheck every original worktree, branch, HEAD, and dirty state.

## 8. Cleanup and incomplete-sync exit

Remove only the worktree created by this run:

```sh
root_git worktree remove "$sync_dir"
test ! -e "$sync_dir"
test "$(root_git worktree list --porcelain)" = "$original_worktrees"
verify_original
```

Remove `sync_parent` only after confirming it is the exact temporary directory created by this run and contains nothing else. Do not run a repository-wide worktree prune during cleanup; stale entries that predate the sync are outside its authority. Never remove another worktree to make cleanup pass.

An incomplete-sync report must include:

- pinned target and upstream full hashes;
- candidate commit or uncommitted tree, if one exists;
- whether any remote changed;
- conflict classes and unresolved owners;
- passing focused proof and failed, missing, or skipped gates;
- migration compatibility state;
- exact preserved state of the original and other worktrees;
- the smallest next action needed to resume safely.

## Report a completed sync

Give:

- detected default branch;
- old and new target full hashes;
- imported upstream range and commit count;
- merge commit and link;
- overlap and conflict classifications with resolutions;
- fork-patch register changes;
- migration compatibility result;
- focused tests and results;
- residual gaps;
- original-worktree equality proof;
- push and CI state.

When asked only for an outline, group upstream commits by product area. Separate imported upstream work from SIGIDI-specific resolutions and state that no Git or remote mutation occurred.
