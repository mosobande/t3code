# SIGIDI migration ownership

> For maintainers. Using T3 Code? See the [user documentation](../README.md#using-t3-code).

SIGIDI uses one SQLite database with two independently numbered migration lanes.

The upstream lane remains unchanged:

- registry: `apps/server/src/persistence/Migrations.ts`
- sources: `apps/server/src/persistence/Migrations/`
- ledger: `effect_sql_migrations`
- ownership: imported upstream schema

The SIGIDI lane is fork-owned:

- registry: `apps/server/src/persistence/SigidiMigrations.ts`
- sources: `apps/server/src/persistence/SigidiMigrations/`
- ledger: `sigidi_sql_migrations`
- ownership: tables prefixed with `sigidi_`

`runDatabaseMigrations` is the only startup owner. It opens one outer transaction, runs upstream migrations, validates the pinned upstream ledger prefix and required schema capabilities, and then runs SIGIDI migrations. Effect migrator transactions nest as savepoints. Failure in either lane or in validation rolls back the complete startup unit.

Each SIGIDI migration declares its minimum upstream migration ID and required upstream capabilities. A newer upstream suffix is not rejected by number alone at runtime. The upstream sync gate must prove and record new source history before it is merged.

`packages/shared/src/sigidiMigrationCompatibility.ts` records the tested upstream commit, ordered migration prefix, exact source path and full SHA-256 digest for each committed Git blob, and the Effect version and patch hash from `pnpm-lock.yaml`. Run `pnpm migrations:check` after upstream or migration-engine changes. The checker verifies; it never rewrites the record.

Remote service replacement is allowed only when both migration ledgers exactly match the candidate manifests. A pending migration in either lane requires a local service update.

The pre-release supported baseline is the deterministic upstream-only fixture in `apps/server/src/persistence/fixtures/upstream-a483337a.sql`. Its metadata records the source revision, both manifests, Effect identity, fixture digest, and representative data case. Run `pnpm migrations:fixture:check` before using it as upgrade proof.

Migrations are forward-only. Prefer additive expand-and-contract changes so an older application can tolerate a newer schema. Follow [the recovery runbook](../operations/sigidi-migration-recovery.md) when validation or migration startup fails.
