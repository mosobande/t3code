# SIGIDI docs

## Using SIGIDI

- [Install and first run](./user/install.md)
- [Permission modes](./user/permission-modes.md)
- [Keyboard shortcuts](./user/keybindings.md)
- [Organizing threads](./user/thread-sidebar.md)
- [Review usage](./user/usage.md)
- [Customize a project icon](./user/project-settings.md)
- [Remote access](./user/remote-access.md)
- [Keeping app and server in sync](./user/updating.md)
- [Source control integrations](./user/source-control.md)
- [Project Notes](./user/project-notes.md)
- Providers: [Codex](./user/providers-codex.md) · [Claude](./user/providers-claude.md)

---

## Working on SIGIDI

Everything below is for maintainers. Setup lives in the [root README](../README.md);
policy in [CONTRIBUTING.md](../CONTRIBUTING.md); agent rules in [AGENTS.md](../AGENTS.md).

- [Architecture overview](./internals/overview.md)
- [Workspace layout](./internals/workspace-layout.md)
- [Glossary](./internals/glossary.md)
- [Scripts](./internals/scripts.md)
- [Connection runtime](./internals/connection-runtime.md)
- [Providers](./internals/providers.md)
- [Server updates](./internals/server-updates.md)
- [Resource telemetry](./internals/resource-telemetry.md)
- [Environment auth](./internals/environment-auth.md)
- [CI gates](./internals/ci.md)
- [Project Notes persistence](./internals/project-notes.md)
- [SIGIDI migration ownership](./internals/sigidi-migrations.md)

### Runbooks

- [SIGIDI service migration](./operations/sigidi-service-migration.md)
- [Release](./operations/release.md)
- [Observability](./operations/observability.md)
- [SIGIDI migration recovery](./operations/sigidi-migration-recovery.md)

### Source-only upstream references

The [Connections and Remote Access](./user/remote-access.md) guide starts with the direct
local-network mobile pairing available in `local`. Its remaining sections help
maintainers test inherited `upstream` remote capabilities. Other maintainer-only references
are [remote environments](./internals/remote.md), [T3 Connect](./internals/t3-connect.md),
[relay observability](./operations/relay-observability.md), [mobile screenshots](./operations/mobile-app-store-screenshots.md),
and the inherited [mobile app](../apps/mobile/README.md).
