# SIGIDI downstream boundary

SIGIDI is a separate product that imports T3 Code. T3 Code supplies reusable capabilities and compatibility. SIGIDI owns its product identity, data, releases, policy, and external services.

This document is the durable boundary for SIGIDI-specific work. The root `AGENTS.md` contains only the rules that apply to most tasks.

## Build-purpose and profile boundary

**Local (`local`)** is the customer profile and the default. The build resolves it once and compiles its capability map into the existing desktop, server, renderer, client-runtime, and packaging owners. It supports LAN pairing, Tailscale endpoints and Serve, direct bearer pairing, desktop-managed SSH, user-configured HTTPS endpoint advertisement, and WSL through the established upstream owners. These capabilities keep their established disabled defaults. Local admits Primary, Bearer, and SSH connection targets, but it rejects Relay targets and does not run Relay discovery. It cannot use hosted authentication, T3 Connect, managed Cloudflare tunnels, managed mobile push, relay Axiom tracing, or inherited hosted-service configuration.

**Upstream (`upstream`)** is the maintainer-only compatibility profile. It preserves the established inherited paths for focused proof and upstream sync. It is not publishable as SIGIDI. A profile selects application composition only; it never authorizes a workflow, credential, deployment, signing operation, notarization submission, or publication.

Stable and Nightly are release channels for `local`. They communicate maturity, not different capability sets. Pull requests are rehearsals, not a release channel. Both channels compile the same `local` capability map.

Apply the profile at the earliest existing lifecycle owner: before persisted target hydration, broker resolution, settings reconciliation, process launch, route generation, IPC/preload exposure, or artifact staging. Do not add a second local registry, resolver, platform implementation, Effect graph, or packaging path. If no existing owner can enforce a capability, record the wall with Atona and obtain a maintainer decision before adding implementation.

Build purposes do not partition local data. Stable and Nightly `local` builds use the established `~/.sigidi/userdata` home so projects, threads, provider state, and settings remain available across compatible builds. The profile still ignores ambient home overrides in the packaged SIGIDI product and supplies the selected shared home explicitly to its child server.

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

### Direct remote capability restoration

The product profile is the policy owner. The existing desktop exposure, Tailscale, connection
runtime, SSH, and WSL modules remain the behavior and lifecycle owners. The local composition
restores their upstream entry points and reverse states without a new protocol, endpoint type,
credential, service, database, or migration.

- Web and desktop expose direct pairing and SSH; desktop also exposes Tailscale and WSL controls.
  The unpublished mobile source and release policy do not change.
- Primary, Bearer, and SSH targets are active in local. Relay records remain durable but inactive.
  Relay discovery and Agent Awareness relay publication remain disabled before credentials or
  network clients are read.
- The user owns Tailscale authentication, SSH identity, custom HTTPS proxy/certificate operation,
  and the remote host. SIGIDI stores only its established pairing sessions and connection catalog.
- Desktop-managed SSH selects the exact matching `@sigidi/cli@<app-version>` package for a packaged
  client, even when the remote host has another `t3` command installed. Development and invalid
  package versions fall back to the matching `nightly` or `latest` SIGIDI dist-tag. The package keeps
  the `t3` executable as an internal compatibility identifier and compiles the `local` product profile.
  Dormant inherited source can remain in the bundle, but Relay commands, discovery, credentials, and
  publication stay inactive. SSH does not configure or use Relay.
- Disable Tailscale Serve through the existing setting or CLI cleanup, remove or disconnect a saved
  remote environment through the existing connection UI, and disable WSL through its existing
  selector. Custom HTTPS entries are removed by changing `T3CODE_DESKTOP_HTTPS_ENDPOINTS` and
  restarting the backend; SIGIDI does not own that proxy.
- Focused proof lives in the product-profile, connection registry/resolver/runtime, Tailscale,
  desktop exposure, SSH, WSL, cloud HTTP, and Agent Awareness relay tests. The boundary was last
  verified against upstream `2db08457f`.
- Publish every desktop version under the same exact `@sigidi/cli` version before enabling desktop
  release delivery. Remove this package adapter only if an upstream-owned remote transfer mechanism
  can run the bundled local-profile server without npm.

## Fork-patch register

Record every non-registration edit to an upstream-owned file in this table. One row can link to a more detailed feature record.

| Feature                                                      | Upstream-owned file                                                                                                                                                                       | Upstream base | Purpose                                                                                                                                                                          | Conflict owner                  | Characterization proof                                                                                                                                             | Removal condition                                                                                                                                                                                                                                                | Upstream issue or PR | Last verified upstream |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------- |
| Direct remote capability restoration                         | `packages/shared/src/productProfile.ts`; connection layer/runtime; desktop IPC/preload; server Agent Awareness composition; renderer root and Connections settings                        | `a930ac145`   | Restore established direct Tailscale, Bearer/SSH, custom HTTPS, and WSL paths in local while Relay, hosted authentication, managed tunnels, and relay telemetry remain excluded. | SIGIDI product profile          | Product-profile, connection runtime/registry/resolver, Agent Awareness, CLI config/pair, desktop exposure, SSH, and WSL focused tests; affected package typechecks | Remove the narrow composition edits when upstream exposes independent product-neutral options for direct onboarding, Relay discovery, direct desktop bridges, and managed relay publication.                                                                     | —                    | `2db08457f`            |
| SIGIDI CLI package ownership                                 | `apps/server/scripts/cli.ts`; desktop SSH package selection; server/web update guidance; release workflow                                                                                 | `a930ac145`   | Publish the existing local-profile server as `@sigidi/cli`, retain the `t3` executable, and pin packaged SSH to the exact desktop version without enabling managed services.     | SIGIDI release                  | Package metadata and dry-run tests; SSH package selection; CLI invocation/update guidance; workflow isolation tests; exact-version npm retrieval after publication | Remove the publish adapter only when the server workspace can use its SIGIDI package identity directly or a product-neutral remote transfer owner replaces npm bootstrap.                                                                                        | —                    | `2db08457f`            |
| SIGIDI desktop identity                                      | `apps/desktop/src/app/DesktopEnvironment.ts`                                                                                                                                              | `a483337a`    | Select SIGIDI channel identity, data home, protocol, and Linux identity while retaining upstream runtime paths.                                                                  | SIGIDI                          | `DesktopEnvironment.test.ts`                                                                                                                                       | Upstream accepts injected product identity and data-path policy.                                                                                                                                                                                                 | —                    | `2db08457f`            |
| SIGIDI desktop identity                                      | `apps/desktop/src/app/DesktopStatePaths.ts`                                                                                                                                               | `a483337a`    | Keep implicit desktop state under `.sigidi/userdata` while preserving explicit `T3CODE_HOME`.                                                                                    | SIGIDI                          | `DesktopEarlyElectronStartup.test.ts`, `DesktopEnvironment.test.ts`                                                                                                | Upstream state-path helpers accept downstream defaults.                                                                                                                                                                                                          | —                    | `2db08457f`            |
| SIGIDI desktop identity                                      | `apps/desktop/src/app/DesktopEarlyElectronStartup.ts`                                                                                                                                     | `a483337a`    | Read SIGIDI settings before Electron readiness and select the stable, Nightly, or Dev WM class.                                                                                  | SIGIDI                          | `DesktopEarlyElectronStartup.test.ts`                                                                                                                              | Upstream early-startup API accepts channel identity and state-path policy.                                                                                                                                                                                       | —                    | `2db08457f`            |
| SIGIDI desktop identity                                      | `apps/desktop/src/app/DesktopPreReadyPlatform.ts`                                                                                                                                         | `a483337a`    | Pass the installed app version into early identity selection.                                                                                                                    | SIGIDI                          | `DesktopPreReadyPlatform.test.ts`                                                                                                                                  | Upstream pre-ready layer accepts the selected downstream identity.                                                                                                                                                                                               | —                    | `2db08457f`            |
| SIGIDI desktop identity                                      | `apps/desktop/src/electron/ElectronProtocol.ts`                                                                                                                                           | `a483337a`    | Register `sigidi`, `sigidi-nightly`, and `sigidi-dev` as privileged renderer schemes.                                                                                            | SIGIDI                          | `DesktopPreReadyPlatform.test.ts`                                                                                                                                  | Upstream privileged-scheme registration accepts a downstream scheme list.                                                                                                                                                                                        | —                    | `2db08457f`            |
| SIGIDI desktop identity                                      | `apps/desktop/src/app/DesktopLinuxUrlHandler.ts`                                                                                                                                          | `a483337a`    | Register the selected SIGIDI protocol and SIGIDI-owned desktop entry.                                                                                                            | SIGIDI                          | `DesktopLinuxUrlHandler.test.ts`                                                                                                                                   | Upstream Linux handler accepts downstream protocol and entry identity.                                                                                                                                                                                           | —                    | `2db08457f`            |
| Project Notes                                                | `apps/web/src/components/ChatView.tsx`                                                                                                                                                    | `a483337a`    | Pass active project and thread context to the SIGIDI-owned lifecycle module, then mount its panel and floating presentations beside upstream surfaces.                           | SIGIDI                          | `projectNotesLifecycle.test.ts`, `projectNotesModuleBoundary.test.ts`                                                                                              | A stable upstream surface registration API can mount the lifecycle module without a direct host-file patch.                                                                                                                                                      | —                    | `2db08457f`            |
| Project Notes                                                | `apps/web/src/components/RightPanelTabs.tsx`                                                                                                                                              | `a483337a`    | Register the Notes entry, title, icon, and availability beside upstream Agents.                                                                                                  | SIGIDI                          | `rightPanelStore.test.ts` and web typecheck                                                                                                                        | Upstream provides an external surface descriptor registry.                                                                                                                                                                                                       | —                    | `2db08457f`            |
| Project Notes                                                | `apps/web/src/rightPanelStore.ts`                                                                                                                                                         | `a483337a`    | Persist the Notes singleton surface in thread-scoped panel state.                                                                                                                | SIGIDI                          | `rightPanelStore.test.ts`                                                                                                                                          | Upstream provides an external surface descriptor registry.                                                                                                                                                                                                       | —                    | `2db08457f`            |
| [Prompt clarification](../internals/prompt-clarification.md) | Shared text-generation API and five provider adapters; explicit composer, settings, command, contract, client request-scope helper, and server registrations listed in the feature record | `a483337a`    | Mount the SIGIDI-owned server and web modules for pre-send rewrite lifecycle, independent model selection, and web/desktop entry points without a generic extension framework.   | Prompt clarification maintainer | Focused contract, provider, service, RPC, SIGIDI web controller, composer adapter, settings policy, and keybinding proof listed in the feature record.             | Remove or narrow these edits when upstream exposes stable provider-neutral utility-generation and composer/settings command seams that preserve independent selection, provider availability, no-send behavior, direct replacement, and stale-result protection. | —                    | `2db08457f`            |
| SIGIDI migration lane                                        | `apps/server/src/cloud/servicePreflight.ts`                                                                                                                                               | `a483337a`    | Permit remote replacement only when both upstream and SIGIDI ledgers match exactly.                                                                                              | SIGIDI                          | `servicePreflight.test.ts`                                                                                                                                         | Upstream remote-update policy supports multiple independently owned ledgers.                                                                                                                                                                                     | —                    | `2db08457f`            |
| SIGIDI migration lane                                        | `apps/server/src/persistence/Layers/Sqlite.ts`                                                                                                                                            | `a483337a`    | Run both migration lanes in one startup owner while retaining upstream trial startup.                                                                                            | SIGIDI                          | `DatabaseMigrations.test.ts`, `DatabaseMigrationsConcurrency.test.ts`                                                                                              | Upstream persistence layer exposes a downstream migration-runner seam.                                                                                                                                                                                           | —                    | `2db08457f`            |
| SIGIDI desktop origin                                        | `apps/server/src/http.ts`                                                                                                                                                                 | `a483337a`    | Allow credentialed development requests from SIGIDI renderer schemes while using upstream compression.                                                                           | SIGIDI                          | `server.test.ts`                                                                                                                                                   | Upstream CORS setup accepts downstream desktop origins through configuration.                                                                                                                                                                                    | —                    | `2db08457f`            |

An unknown owner or missing characterization proof blocks automatic conflict resolution. `t3code-sync` must report the sync as incomplete until the owner decides the boundary.

## Data and migration boundary

SIGIDI-owned schema uses a separate migration ledger and `sigidi_*` objects. Never insert SIGIDI migrations into the ordered T3 Code ledger. Run both lanes inside one startup critical section and one SQLite transaction once that lane is implemented.

Migration compatibility is content-sensitive, not order-only. A source hash identifies the canonical bytes of one known migration implementation. The compatibility gate must reject a known migration ID and name when its source hash differs, because identical labels can hide different SQL or data transformations. Engine identity, the applied-ledger prefix, required schema capabilities, supported upgrade baselines, concurrency, rollback, and remote preflight also require proof. The tracked migration ADR will own the complete contract when the lane is implemented.

Do not copy, import, or rewrite an installed database as a profile transition. Compatible SIGIDI and inherited runtime code can read the established shared database in place. A schema or data migration still requires accepted ownership, backup, compatibility, and recovery decisions.

## External services and releases

Classify each endpoint, credential, updater, signing identity, deployment, and release channel as T3-owned, SIGIDI-owned, product-neutral, or unsupported. A T3-owned service is not a SIGIDI service merely because the client code is available. Use a SIGIDI adapter or disable the integration until ownership is accepted.

SIGIDI's current release workflow rehearses unsigned macOS desktop artifacts and publishes the
SIGIDI-owned `@sigidi/cli` package for accepted Stable and Nightly tags. The CLI is built with the
`local` profile and uses GitHub Actions OIDC through the `npm` environment. Keep Linux and Windows
desktop, hosted-web, GitHub Release, finalization, and announcement publication paths disabled until
a maintainer explicitly expands those surfaces. Preserve the repository's existing marketing
deployment mechanism; an upstream sync must not replace or duplicate it as part of release
reconciliation.

## Upstream sync integration

Normal SIGIDI work starts from the current SIGIDI default branch. Only the tracked `t3code-sync` skill integrates `upstream/main`. Syncs use merge commits, preserve merged SIGIDI history, classify overlaps using this boundary, and run migration compatibility proof even when Git reports no migration-file conflict.

Keep internal compatibility identifiers such as `.t3` or `T3CODE_*` when they are not visible product identity and renaming them would only increase divergence. Keep SIGIDI branding, bundle identity, release artifacts, data, and service ownership separate.

## Current examples

- Project Notes owns its editor, persistence, and panel or floating lifecycle behind SIGIDI modules. Upstream host files retain only the minimum registration and mounting edits while the feature reuses the product-neutral right-panel store, scoped identities, UI primitives, and query or RPC utilities.
- Prompt clarification owns its bounded `sigidi.promptClarification.rewrite` behavior and local draft lifecycle. It reuses the product-neutral text-generation runtime and model-selection machinery. Its shared text-generation, contract, composer, settings, and command edits are registered fork patches pending stable upstream seams. See [the feature record](../internals/prompt-clarification.md).
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
