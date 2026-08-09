# SIGIDI downstream boundary

SIGIDI is a separate product that imports T3 Code. T3 Code supplies reusable capabilities and compatibility. SIGIDI owns its product identity, data, releases, policy, and external services.

This document is the durable boundary for SIGIDI-specific work. The root `AGENTS.md` contains only the rules that apply to most tasks.

## Build-purpose and profile boundary

The **SIGIDI Product Build** is the customer build. Its compatibility identifier is `local-desktop`. The build resolves it once and compiles its capability map into the existing desktop, server, renderer, client-runtime, and packaging owners. It can bind directly to the local network for explicit mobile pairing. It cannot hydrate or register inherited remote targets, start Tailscale or WSL, expose remote IPC or UI, use hosted authentication, or package inherited service configuration.

The **Upstream Integration Build** is a maintainer-only build. Its compatibility identifier is `upstream-full`. It preserves the established inherited paths for focused proof and upstream sync. It is not publishable as SIGIDI. A profile selects application composition only; it never authorizes a workflow, credential, deployment, signing operation, notarization submission, or publication.

Stable and Nightly are release channels for the SIGIDI Product Build. They communicate maturity, not different capability sets. Pull requests are rehearsals, not a release channel. Both channels compile `local-desktop`; Nightly must not unlock remote or hosted capabilities that Stable excludes.

Apply the profile at the earliest existing lifecycle owner: before persisted target hydration, broker resolution, settings reconciliation, process launch, route generation, IPC/preload exposure, or artifact staging. Do not add a second local registry, resolver, platform implementation, Effect graph, or packaging path. If no existing owner can enforce a capability, record the wall with Atona and obtain a maintainer decision before adding implementation.

Build purposes do not partition local data. Stable and Nightly SIGIDI Product Builds use the established `~/.sigidi/userdata` home so projects, threads, provider state, and settings remain available across compatible builds. The profile still ignores ambient home overrides in the packaged SIGIDI product and supplies the selected shared home explicitly to its child server.

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

| Feature                 | Upstream-owned file                                   | Upstream base | Purpose                                                                                                         | Conflict owner | Characterization proof                                                   | Removal condition                                                             | Upstream issue or PR | Last verified upstream |
| ----------------------- | ----------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------- | ---------------------- |
| SIGIDI desktop identity | `apps/desktop/src/app/DesktopEnvironment.ts`          | `a483337a`    | Select SIGIDI channel identity, data home, protocol, and Linux identity while retaining upstream runtime paths. | SIGIDI         | `DesktopEnvironment.test.ts`                                             | Upstream accepts injected product identity and data-path policy.              | —                    | `a483337a`             |
| SIGIDI desktop identity | `apps/desktop/src/app/DesktopStatePaths.ts`           | `a483337a`    | Keep implicit desktop state under `.sigidi/userdata` while preserving explicit `T3CODE_HOME`.                   | SIGIDI         | `DesktopEarlyElectronStartup.test.ts`, `DesktopEnvironment.test.ts`      | Upstream state-path helpers accept downstream defaults.                       | —                    | `a483337a`             |
| SIGIDI desktop identity | `apps/desktop/src/app/DesktopEarlyElectronStartup.ts` | `a483337a`    | Read SIGIDI settings before Electron readiness and select the stable, Nightly, or Dev WM class.                 | SIGIDI         | `DesktopEarlyElectronStartup.test.ts`                                    | Upstream early-startup API accepts channel identity and state-path policy.    | —                    | `a483337a`             |
| SIGIDI desktop identity | `apps/desktop/src/app/DesktopPreReadyPlatform.ts`     | `a483337a`    | Pass the installed app version into early identity selection.                                                   | SIGIDI         | `DesktopPreReadyPlatform.test.ts`                                        | Upstream pre-ready layer accepts the selected downstream identity.            | —                    | `a483337a`             |
| SIGIDI desktop identity | `apps/desktop/src/electron/ElectronProtocol.ts`       | `a483337a`    | Register `sigidi`, `sigidi-nightly`, and `sigidi-dev` as privileged renderer schemes.                           | SIGIDI         | `DesktopPreReadyPlatform.test.ts`                                        | Upstream privileged-scheme registration accepts a downstream scheme list.     | —                    | `a483337a`             |
| SIGIDI desktop identity | `apps/desktop/src/app/DesktopLinuxUrlHandler.ts`      | `a483337a`    | Register the selected SIGIDI protocol and SIGIDI-owned desktop entry.                                           | SIGIDI         | `DesktopLinuxUrlHandler.test.ts`                                         | Upstream Linux handler accepts downstream protocol and entry identity.        | —                    | `a483337a`             |
| Project Notes           | `apps/web/src/components/ChatView.tsx`                | `a483337a`    | Own project/thread navigation, floating mode, and Notes surface lifecycle beside upstream surfaces.             | SIGIDI         | `projectNotesWindowState.test.ts`, `projectNoteDraftCoordinator.test.ts` | A stable upstream surface registration API owns lifecycle outside `ChatView`. | —                    | `a483337a`             |
| Project Notes           | `apps/web/src/components/RightPanelTabs.tsx`          | `a483337a`    | Register the Notes entry, title, icon, and availability beside upstream Agents.                                 | SIGIDI         | `rightPanelStore.test.ts` and web typecheck                              | Upstream provides an external surface descriptor registry.                    | —                    | `a483337a`             |
| Project Notes           | `apps/web/src/rightPanelStore.ts`                     | `a483337a`    | Persist the Notes singleton surface in thread-scoped panel state.                                               | SIGIDI         | `rightPanelStore.test.ts`                                                | Upstream provides an external surface descriptor registry.                    | —                    | `a483337a`             |
| SIGIDI migration lane   | `apps/server/src/cloud/servicePreflight.ts`           | `a483337a`    | Permit remote replacement only when both upstream and SIGIDI ledgers match exactly.                             | SIGIDI         | `servicePreflight.test.ts`                                               | Upstream remote-update policy supports multiple independently owned ledgers.  | —                    | `a483337a`             |
| SIGIDI migration lane   | `apps/server/src/persistence/Layers/Sqlite.ts`        | `a483337a`    | Run both migration lanes in one startup owner while retaining upstream trial startup.                           | SIGIDI         | `DatabaseMigrations.test.ts`, `DatabaseMigrationsConcurrency.test.ts`    | Upstream persistence layer exposes a downstream migration-runner seam.        | —                    | `a483337a`             |
| SIGIDI desktop origin   | `apps/server/src/http.ts`                             | `a483337a`    | Allow credentialed development requests from SIGIDI renderer schemes while using upstream compression.          | SIGIDI         | `server.test.ts`                                                         | Upstream CORS setup accepts downstream desktop origins through configuration. | —                    | `a483337a`             |

An unknown owner or missing characterization proof blocks automatic conflict resolution. `t3code-sync` must report the sync as incomplete until the owner decides the boundary.

## Data and migration boundary

SIGIDI-owned schema uses a separate migration ledger and `sigidi_*` objects. Never insert SIGIDI migrations into the ordered T3 Code ledger. Run both lanes inside one startup critical section and one SQLite transaction once that lane is implemented.

Migration compatibility is content-sensitive, not order-only. A source hash identifies the canonical bytes of one known migration implementation. The compatibility gate must reject a known migration ID and name when its source hash differs, because identical labels can hide different SQL or data transformations. Engine identity, the applied-ledger prefix, required schema capabilities, supported upgrade baselines, concurrency, rollback, and remote preflight also require proof. The tracked migration ADR will own the complete contract when the lane is implemented.

Do not copy, import, or rewrite an installed database as a profile transition. Compatible SIGIDI and inherited runtime code can read the established shared database in place. A schema or data migration still requires accepted ownership, backup, compatibility, and recovery decisions.

## External services and releases

Classify each endpoint, credential, updater, signing identity, deployment, and release channel as T3-owned, SIGIDI-owned, product-neutral, or unsupported. A T3-owned service is not a SIGIDI service merely because the client code is available. Use a SIGIDI adapter or disable the integration until ownership is accepted.

SIGIDI's current release workflow publishes signed macOS desktop artifacts only. Keep Linux, Windows, CLI, hosted-web, finalization, and announcement publication paths disabled until a maintainer explicitly expands the release surface. Preserve the repository's existing marketing deployment mechanism; an upstream sync must not replace or duplicate it as part of release reconciliation.

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
