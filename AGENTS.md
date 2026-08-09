# SIGIDI

SIGIDI is a local-first desktop development workspace for coding agents. A Node WebSocket server wraps provider CLIs (Codex, Claude Code, Cursor, Grok, and OpenCode) and serves the desktop and web clients. The repository also contains an inherited React Native mobile client.

SIGIDI is a separate downstream product built from its open-source upstream project. Reuse stable, product-neutral upstream capabilities. Keep SIGIDI product identity, data, releases, policy, and external services under SIGIDI ownership. Before adding SIGIDI state, contracts, external services, host-file patches, or multi-surface behavior, read [`docs/architecture/sigidi-downstream-boundary.md`](docs/architecture/sigidi-downstream-boundary.md).

## Product constraints

### Build purposes and profiles

**Local (`local`)** is the canonical customer profile and the default for development, tests, builds, and releases. It is local-first: reuse the established desktop, server, renderer, registry, resolver, configuration, and packaging owners, and enable only the capabilities that the profile explicitly includes. A user setting, CLI argument, persisted record, or runtime environment variable cannot enable a capability that this build excludes.

**Upstream (`upstream`)** is the canonical maintainer compatibility profile. Use it only when an upstream sync, a profile-boundary change, or activation of a previously gated capability requires inherited remote, relay, mobile, hosted-authentication, WSL, or deployment code to be tested. It is not a SIGIDI release and does not authorize an external write.

Stable and Nightly are channels for `local`. They show delivery maturity, not different capability sets. Pull requests are rehearsals, not a release channel. Both Stable and Nightly compile `local`.

Run the full `local` suite for ordinary work. The `ci:local` PR label explicitly requests a fresh local profile build. Run the full `upstream` suite only for a standard T3 Code sync, a change to the profile boundary, activation of a previously gated capability, or an explicit maintainer request. Add the `ci:upstream` PR label when that proof is required; do not spend upstream CI resources on ordinary local-first changes.

Do not add a parallel local implementation when an existing owner can apply the profile. If the existing seam cannot express the required boundary, stop and use Atona to record the gap before adding a new owner.

### 1. Performance without compromise

Audit every change for performance regressions. Common causes include excessive WebSocket traffic, GPU-heavy CSS animation, and poorly bounded list rendering. SIGIDI users drive agents for long sessions and notice dropped frames, stale labels, and excess resource use.

### 2. Remote ready

SIGIDI's WebSocket layer supports local and remote control. Cover local networks, Tailscale, relay or tunnel modes, and multi-device use where applicable. T3 Connect remains an upstream-owned service until the SIGIDI service migration defines and deploys a replacement; do not present it as a SIGIDI service.

### 3. Multi-surface

SIGIDI has three source surfaces: **web**, **desktop**, and **mobile**.

**Web** is locally hosted by the SIGIDI server. No public hosted SIGIDI web service is currently released.

**Desktop** is the primary SIGIDI development surface. The Electron app bundles the server runner and can host remote client connections.

**Mobile** is an inherited React Native client for iOS and Android. SIGIDI does not currently publish a mobile distribution.

### 4. Downstream maintainability

Keep SIGIDI behavior in standalone modules and upstream host edits registration-only where practical. Preserve product-neutral upstream improvements. Record unavoidable fork patches and their removal conditions in the downstream-boundary document.

Changing the established technology stack is a non-goal. Keep the repository's Node, pnpm, Vite+, Electron, Effect, React, Astro, SQLite, Rust, and test/build tool choices unless a maintainer explicitly approves a technology decision.

## Design direction

I like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.

The rest of this document helps you navigate the codebase and make changes effectively. Treat these instructions as strong defaults. A direct developer instruction can override them.

SIGIDI is often developed through a remote client connected to the same server and machine. Protect the running environment. Do not access live data, stop shared servers, or change active worktrees without confirming ownership and scope.

## A small glossary

We need to be on the same page with terminology. When communicating, use this language:

- **you** means the agent reading this file and changing SIGIDI.
- **we, us, and maintainers** mean the people building SIGIDI.
- **user** means the person using SIGIDI to direct coding agents.
- **agent** means the coding agent a user runs inside SIGIDI. Depending on context, that may also include you.
- **provider** means the agent runtime or harness SIGIDI talks to, such as Codex, Claude, Cursor, or OpenCode.
- **client** means the web, desktop, or mobile UI.
- **environment** means one running SIGIDI server and the machine, filesystem, provider credentials, and state it owns.
- **project** means an environment-local workspace record rooted at a directory.
- **thread** means the durable conversation and work history for a project.
- **turn** means one user-to-agent cycle, including follow-up work such as checkpointing.
- **data home** means the base application data directory. The implementation and older documentation may call it **T3 home** for compatibility. Runtime state normally lives below its userdata directory.

## The three ways to hurt yourself

1. **Killing by pattern.** Never `pkill -f`, `pgrep | kill`, or `kill` a PID you found by matching a name, path, or worktree string. Your own agent process has this worktree's path in its argv, and this machine runs several other dev servers at once. Kill only a PID you captured at spawn, or the owner of your port from `ss -H -ltnp` after confirming `/proc/<pid>/cwd` is your worktree.
2. **Writing to the live install.** `~/.sigidi/userdata` is the developer's real SIGIDI database, in use while you work. Reading it and copying from it are fine, and a good way to get real test data (see Test data). Never start a server against it, never open it read-write, never clean it up.
3. **Baking in origins.** Never set `VITE_HTTP_URL` or `VITE_WS_URL` for dev. Dev is single-origin and Vite proxies `/api`, `/ws`, `/oauth`, and `/.well-known`. Setting them bakes localhost into the bundle and silently breaks every remote browser.

## Hit every surface

The most common defect in this repo is a change that works on the path you tested and is missing everywhere else. Before calling frontend work done, walk this list and say which entries applied:

- **Entry points.** A behavior reachable from the chat view is usually also reachable from Settings, the command palette, and a keybinding. Fixing one is not fixing the feature.
- **Clients.** Web, desktop (wraps web, adds Electron shell/IPC), and mobile (React Native, separate navigation). Shared logic lives in `packages/client-runtime`
- **Providers.** Codex, Claude, Cursor, Grok, and OpenCode each have an adapter. Provider-shaped features need a decision per adapter, even if the decision is "not supported here".
- **Contracts.** Anything crossing the wire is typed in `packages/contracts`. Change the schema and the server, web, mobile, and desktop all follow.
- **Reverse states.** If you added a way in, add the way out and the way to see it. Snooze needs unsnooze. Close needs reopen. A one-way door is a bug.
- **Connection modes.** Local, remote/relay, and tunnel behave differently. Multi-device and multi-environment cases are real.
- **Host integration.** Keep upstream host-file changes registration-only where practical. Import, register, mount, or render a SIGIDI-owned module instead of putting SIGIDI state transitions, persistence, policy, retries, or side-effect sequencing in the host file.
- **Docs.** `docs/` splits by audience. Behavior changes that a user would notice belong in `docs/user/` (shipped-product voice, no repo tooling or source paths); architecture and contributor changes in `docs/internals/`, except SIGIDI downstream ownership and fork patches, which belong in `docs/architecture/sigidi-downstream-boundary.md`; runbooks in `docs/operations/`; new vocabulary in `docs/internals/glossary.md`. Treat tracked instructions, documents, and repository skills as durable authority; treat `.qp/` as working material.

## Dev servers

- `vp i` installs. Worktrees get this from the t3.json setup script; if module resolution looks broken, it probably did not run.
- `vp run dev` starts server and web. In a worktree, state defaults to that worktree's gitignored `.sigidi`, which deliberately outranks an ambient `T3CODE_HOME` so you cannot land on shared state by accident. An explicit `--home-dir` still wins.
- Ports derive from the worktree path and are stable across restarts, but read the real ones from the `[dev-runner]` line since occupied ports shift.
- `--share` publishes over the tailnet. Do not open the URL when you use this, just send it to the user with the pairing code included in url
- The web app requires pairing. Hand over the pairing URL, not the bare origin. A URL without its token is useless to whoever you gave it to.
- Stop what you started, by the PID you tracked. See rule 1.

## Test data

An empty database is a bad test. Seed your worktree's `.sigidi` with a copy of real data instead of pointing at live state:

- Copy from `~/.sigidi/userdata` (the developer's real data, the most realistic test set) or `~/.sigidi/dev`. Worktree state lives at `<worktree>/.sigidi/userdata`.
- Snapshot the database with `VACUUM INTO`, which is safe even while a server has the source open and yields one consistent file:

  ```bash
  mkdir -p .sigidi/userdata
  rm -f .sigidi/userdata/state.sqlite*  # VACUUM INTO refuses to overwrite
  bun -e "new (require('bun:sqlite').Database)(process.env.HOME + '/.sigidi/userdata/state.sqlite', { readonly: true }).run(\"VACUUM INTO '.sigidi/userdata/state.sqlite'\")"
  ```

  A plain `cp` is only safe when no server has the source open, and must bring the `-wal` and `-shm` siblings along. A live file copy is a corrupt copy.

- Bring `secrets` and `settings.json` only if the flow under test needs them.
- Copy in, never symlink. Data flows one way: into your sandbox, never back out.

## Verifying

- Smallest proof that the change works. `vp test run <files>` for the tests you touched, targeted lint and typecheck for the scope you changed.
- **Do not run repo-wide checks.** No `vp check`, no `vp run -r test`, no `vp run -r typecheck` unless I ask. CI owns the full suite.
- Backend behavior changes ship with focused tests for that behavior.
- The server is event-sourced and its async flows emit typed receipts. Wait on receipts and worker drains, never on sleeps or polling. A test that needs a timeout to pass is wrong.
- Upon request, user-visible frontend changes should get one integrated pass in a real client: `test-t3-app` for web, `test-t3-mobile` for mobile. The primary agent does this once after integrating. Subagents do not launch their own dev servers. Ask permission before doing computer use or spinning up browsers.

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Conventional commit titles, plain language: `fix(web): new threads no longer spike CPU`.
- Body: the problem in a sentence or two, then how you fixed it. End with the model and harness that did the work.
- Base normal SIGIDI work on the current SIGIDI default branch. Use the repository `t3code-sync` skill to merge `upstream/main`. Do not rebase or squash the SIGIDI default branch or its sync merges.
- Keep the release workflow macOS-only. Preserve Linux, Windows, CLI, hosted-web, finalization, and announcement publication paths as disabled unless a maintainer explicitly expands the release surface.
- Keep product-neutral changes upstream-ready when reasonable.
- UI changes need before/after images. Motion or timing needs a short video.
- One concern per PR. If the description says "also", split it.
- When babysitting: poll checks and comments newer than the last push, verify each bot finding against the source, fix real ones, dismiss false positives with a written reason. Stay quiet when nothing is new. Stop when the bots are green on the latest commit.

## Migration ownership

- Keep upstream migrations in `apps/server/src/persistence/Migrations.ts`, `Migrations/`, and `effect_sql_migrations`. Do not allocate an upstream migration ID for a SIGIDI feature.
- Keep SIGIDI migrations in `apps/server/src/persistence/SigidiMigrations.ts`, `SigidiMigrations/`, and `sigidi_sql_migrations`. Start and order SIGIDI IDs independently.
- Create or alter only `sigidi_*` tables from a SIGIDI migration unless a maintainer approves and records an explicit exception.
- Run `pnpm migrations:check` after an upstream sync or any change to migration sources, manifests, the Effect engine identity, SQLite adapters, startup migration wiring, or service preflight.
- Update `packages/shared/src/sigidiMigrationCompatibility.ts` only after the focused Node and Bun migration tests, supported upgrade proof, concurrency proof, and two-ledger preflight tests pass.

## How it works

Clients send typed WebSocket requests. The server turns them into _commands_, a pure _decider_ turns commands into persisted _events_, and a _projector_ derives the read model the UI renders. Provider CLIs run as subprocesses; per-provider _adapters_ translate their native protocols into orchestration events. Side effects run in queue-backed _reactors_ that emit _receipts_ when milestones land. Each turn ends with a _checkpoint_, a hidden git ref, so the app can diff and restore.

Keep SIGIDI-owned behavior, persistence, and lifecycle in standalone SIGIDI modules where practical. Use a separate SIGIDI migration lane and `sigidi_*` SQL names for SIGIDI-owned data. Never add SIGIDI migrations to the ordered upstream ledger or automatically mutate installed upstream data without an accepted migration or import decision.

Full glossary with file links: `docs/internals/glossary.md`

## Where code lives

- `apps/server` - WebSocket, orchestration, providers, checkpointing. Effect-heavy: read `.repos/effect-smol/LLMS.md` before writing Effect code.
- `apps/web` - React/Vite UI. `apps/desktop` wraps it, `apps/mobile` is React Native, `apps/marketing` is the site.
- `packages/contracts` - Effect/Schema contracts plus small derived helpers. No heavy runtime logic.
- `packages/shared` - shared runtime utils, subpath exports, no barrel.
- `packages/client-runtime` - client code shared by web and mobile.
- `apps/*/src/sigidi/<feature>` and `packages/sigidi-*` - SIGIDI-owned vertical modules and focused packages. Reuse upstream capabilities through stable public interfaces and keep translation at the SIGIDI adapter boundary.
- `.repos/` - vendored read-only references. Prefer their patterns over invented ones. Never edit or import from them. Sync with `vpr sync:repos` when bumping the matching dependency.

## Taste

- Complexity belongs at the adapter boundary. Orchestration stays pure, UI stays dumb.
- Inferred types over annotations. `any` is the enemy.
- Comments describe how a thing is used, and move when the code moves. To be used mostly to describe functions, not to annotate every line of behavior.
- Our users drive agents all day and notice a dropped frame, a lying spinner, and a stale label. No continuously repainting animations; they peg the GPU on high-refresh displays.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Additional tips

- Don't verify with browsers or computer use unless the user explicitly agrees or requests it.
- Security is important, but should not be over-indexed on, especially for dev mode/maintainer-only features.
- Preserve internal T3 compatibility identifiers when renaming them would only increase sync cost. Do not expose them as SIGIDI product identity.
- Do not publish, deploy, authenticate to, or update a T3-owned service as SIGIDI without an accepted ownership decision.
