# SIGIDI

SIGIDI is a local-first macOS desktop development workspace for directing coding agents. It connects to provider CLIs already configured on your machine and keeps agent execution, project files, terminals, and version-control operations on the host environment.

SIGIDI currently supports Codex, Claude Code, Cursor, Grok Build, and OpenCode.

> [!IMPORTANT]
> SIGIDI is in pre-release development. This repository does not currently publish SIGIDI installers, package releases, or a hosted SIGIDI service. Build and run it from source.
> The active release workflow is an unsigned, no-publish macOS rehearsal. Signing, notarization, updater publication, installers, and hosted services require separate release authority.

## Relationship to T3 Code

SIGIDI is a downstream product built from the open-source [T3 Code](https://github.com/pingdotgg/t3code) project. It reuses T3 Code's server, client, provider, and workbench capabilities while keeping SIGIDI product identity, data, releases, policy, and external services separate.

The default `local` profile fixes the customer capability set at compile time. The explicit maintainer-only `upstream` profile keeps inherited integrations testable for upstream sync. It is not a SIGIDI release and grants no deployment or publication authority.

Some internal names remain T3-compatible because changing them would add divergence without changing the SIGIDI experience. A T3 Code command, installer, mobile app, hosted domain, or managed service is an upstream resource unless this repository explicitly documents a SIGIDI-owned replacement.

Read the [SIGIDI downstream boundary](./docs/architecture/sigidi-downstream-boundary.md) before adding product state, migrations, external services, or patches to upstream-owned files.

## Run from source

### Requirements

- Node.js `^24.13.1`.
- [Vite+](https://viteplus.dev/guide/) and its global `vp` command.
- At least one supported provider CLI, installed and authenticated.

Install Vite+ on macOS or Linux:

```bash
curl -fsSL https://vite.plus | bash
```

Install Vite+ on Windows:

```powershell
irm https://vite.plus/ps1 | iex
```

Clone the repository and install its pinned workspace dependencies:

```bash
git clone git@github.com:quantipixels/sigidi.git
cd sigidi
vp i
```

Start the server and web client:

```bash
vp run dev
```

The development runner prints a one-time pairing URL. Open that URL rather than the bare local origin.

Start the Electron desktop client:

```bash
vp run dev:desktop
```

See the [development scripts](./docs/internals/scripts.md) for server-only, web-only, desktop, and multi-worktree commands.

## Provider setup

Install and authenticate at least one provider before starting SIGIDI:

- Codex: install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`.
- Claude: install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`.
- Cursor: install [Cursor CLI](https://cursor.com/cli) and run `agent login`.
- Grok Build: install [Grok Build CLI](https://x.ai/cli) and run `grok login`.
- OpenCode: install [OpenCode](https://opencode.ai) and run `opencode auth login`.

## Architecture

SIGIDI reuses T3 Code's source architecture:

- `apps/server` owns provider processes, orchestration, terminals, persistence, and version control.
- `apps/web` provides the browser client.
- `apps/desktop` packages the web client with the Electron host.
- `apps/mobile` contains a source-only inherited React Native client. It is not a published `local` mobile product.
- `packages/contracts` defines typed client-server contracts.
- `packages/client-runtime` contains runtime behavior shared by web and mobile.

SIGIDI-specific features should use standalone `sigidi` modules and narrow registration seams. Reuse stable upstream capabilities instead of copying them.

## Documentation

- [Install and first run](./docs/user/install.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Keyboard shortcuts](./docs/user/keybindings.md)
- [Source-control integrations](./docs/user/source-control.md)
- [Internal architecture](./docs/internals/overview.md)
- [SIGIDI downstream boundary](./docs/architecture/sigidi-downstream-boundary.md)
- [Approved SIGIDI identity](./docs/brand/approved/README.md)

Source-only maintainer documents describe inherited T3 Code services and compatibility identifiers. They are not shipped SIGIDI behavior.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request. Keep changes focused and include visual evidence for user-interface work.

## License and attribution

This repository is distributed under the [MIT License](./LICENSE). SIGIDI includes work derived from T3 Code; preserve the upstream copyright and license notice.
