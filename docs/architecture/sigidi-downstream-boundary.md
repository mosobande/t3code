# SIGIDI downstream boundary

SIGIDI is a separate product that imports T3 Code. T3 Code supplies reusable capabilities and compatibility. SIGIDI owns its product identity, data, releases, policy, and external services.

This document is the durable boundary for SIGIDI-specific work. The root `AGENTS.md` contains only the rules that apply to most tasks.

## Choose the narrowest ownership boundary

Apply this decision ladder in order:

1. Reuse a stable, product-neutral T3 Code capability unchanged.
2. Add a thin SIGIDI adapter when identity, configuration, service ownership, or policy differs.
3. Build a standalone SIGIDI-owned vertical module for SIGIDI behavior, persistence, and lifecycle.
4. Patch an upstream-owned file only when no stable seam exists. Keep the patch explicit, characterized, registered below, and removable.
5. Keep a product-neutral improvement upstream-ready. Publishing it upstream still requires explicit user authority.

Do not copy upstream behavior into a SIGIDI module to avoid an interface that already fits. Do not add a generic plugin framework solely to eliminate a small, explicit registration patch.

## Standalone module convention

A SIGIDI feature should own its behavior from contract to storage where practical. Use these names so ownership remains visible during an upstream sync:

- SQL tables, columns, indexes, triggers, and ledger names: `sigidi_*`.
- RPC and persisted-storage keys: `sigidi.<feature>.*`.
- Effect service identifiers and log namespaces: `sigidi/<feature>/*`.
- Exported types: `Sigidi*`.
- Code: `apps/*/src/sigidi/<feature>/` or a focused `packages/sigidi-*` package.

Reuse product-neutral contracts and runtime services from T3 Code through their public interfaces. Put translation at the SIGIDI adapter boundary. Do not move SIGIDI policy into shared orchestration or presentation code.

## Upstream host files

A host-file change is registration-only when it does only one or more of the following:

- import a SIGIDI module;
- register a descriptor, handler, route, command, or service;
- mount a SIGIDI lifecycle layer;
- render a SIGIDI entry point.

A host-file change is not registration-only when it owns a SIGIDI state transition, persistence rule, authorization or product policy, retry strategy, recovery rule, or side-effect sequence. Move that logic into the SIGIDI module or register it as a fork patch below.

## Feature boundary record

Before implementing a stateful, external-service, multi-surface, or upstream-patching feature, add or link a short record that states:

- feature owner and module path;
- reused upstream capabilities and why their interfaces are stable enough;
- web, desktop, mobile, provider, local, remote, relay, tunnel, and reverse-state decisions that apply;
- SIGIDI data namespace, migration lane, privacy boundary, recovery behavior, and compatibility proof;
- upstream host registrations and fork patches;
- focused behavior proof;
- upstream contribution candidate, if any;
- removal condition and the upstream base last used to verify the boundary.

The record can live in the feature's tracked architecture document. Link it from this document when the feature adds a fork patch.

## Fork-patch register

Record every non-registration edit to an upstream-owned file in this table. One row can link to a more detailed feature record.

| Feature           | Upstream-owned file | Upstream base | Purpose | Conflict owner | Characterization proof | Removal condition | Upstream issue or PR | Last verified upstream |
| ----------------- | ------------------- | ------------- | ------- | -------------- | ---------------------- | ----------------- | -------------------- | ---------------------- |
| _None registered_ |                     |               |         |                |                        |                   |                      |                        |

An unknown owner or missing characterization proof blocks automatic conflict resolution. `t3code-sync` must report the sync as incomplete until the owner decides the boundary.

## Data and migration boundary

SIGIDI-owned schema uses a separate migration ledger and `sigidi_*` objects. Never insert SIGIDI migrations into the ordered T3 Code ledger. Run both lanes inside one startup critical section and one SQLite transaction once that lane is implemented.

Migration compatibility is content-sensitive, not order-only. A source hash identifies the canonical bytes of one known migration implementation. The compatibility gate must reject a known migration ID and name when its source hash differs, because identical labels can hide different SQL or data transformations. Engine identity, the applied-ledger prefix, required schema capabilities, supported upgrade baselines, concurrency, rollback, and remote preflight also require proof. The tracked migration ADR will own the complete contract when the lane is implemented.

Do not automatically read or mutate an installed T3 database. An import or migration requires an accepted ownership, consent, backup, compatibility, and recovery decision.

## External services and releases

Classify each endpoint, credential, updater, signing identity, deployment, and release channel as T3-owned, SIGIDI-owned, product-neutral, or unsupported. A T3-owned service is not a SIGIDI service merely because the client code is available. Use a SIGIDI adapter or disable the integration until ownership is accepted.

## Upstream sync integration

Normal SIGIDI work starts from the current SIGIDI default branch. Only the tracked `t3code-sync` skill integrates `upstream/main`. Syncs use merge commits, preserve merged SIGIDI history, classify overlaps using this boundary, and run migration compatibility proof even when Git reports no migration-file conflict.

Keep internal compatibility identifiers such as `.t3` or `T3CODE_*` when they are not visible product identity and renaming them would only increase divergence. Keep SIGIDI branding, bundle identity, release artifacts, data, and service ownership separate.

## Current examples

- Project Notes demonstrates a useful deep storage module, but its lifecycle integration is spread through upstream host files. Future delivery should move behavior behind a SIGIDI module and leave host files registration-only where practical.
- Generic icon packaging behavior can remain upstream-ready. SIGIDI icon sources, product identity, and release artifacts remain SIGIDI-owned.
- Thread settlement behavior belongs to upstream T3 Code unless SIGIDI later adopts a distinct product rule. Do not fork it merely because SIGIDI imports the behavior.

## Non-goals

- A generic extension or plugin framework.
- Copies of upstream behavior that already has a stable reusable seam.
- A promise of zero upstream patches.
- A mass rewrite of historical SIGIDI features before they re-enter active scope.

## Verification

For each bounded change:

1. Pin the current SIGIDI base, upstream base, candidate commit, and worktree.
2. Prove reused capability behavior and each applicable surface, provider, connection mode, reverse state, and recovery path.
3. Check SIGIDI namespaces and the fork-patch register.
4. Run focused tests for changed behavior and every resolved sync conflict.
5. Report residual gaps separately from passing tests.
