import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";

export const SIGIDI_MIGRATION_RECOVERY_RUNBOOK = "docs/operations/sigidi-migration-recovery.md";

export class MigrationCompatibilityError extends Schema.TaggedErrorClass<MigrationCompatibilityError>()(
  "MigrationCompatibilityError",
  {
    kind: Schema.Literals(["ledger", "minimum", "capability"]),
    expectedUpstreamCommit: Schema.String,
    detail: Schema.String,
    recoveryRunbook: Schema.String,
  },
) {
  override get message(): string {
    return `SIGIDI migration compatibility failed for expected upstream ${this.expectedUpstreamCommit}: ${this.detail}. Recovery: ${this.recoveryRunbook}`;
  }
}

export type UpstreamCapability =
  | {
      readonly kind: "table";
      readonly table: string;
    }
  | {
      readonly kind: "column";
      readonly table: string;
      readonly column: string;
    }
  | {
      readonly kind: "index";
      readonly table: string;
      readonly index: string;
    }
  | {
      readonly kind: "constraint";
      readonly table: string;
      readonly constraint:
        | { readonly kind: "primary-key"; readonly column: string }
        | { readonly kind: "not-null"; readonly column: string }
        | {
            readonly kind: "foreign-key";
            readonly column: string;
            readonly referencesTable: string;
            readonly referencesColumn: string;
          };
    }
  | {
      readonly kind: "data";
      readonly name: string;
      readonly check: Effect.Effect<boolean, SqlError, SqlClient.SqlClient>;
    };

type MigrationIdentity = readonly [id: number, name: string];

const capabilityName = (capability: UpstreamCapability): string => {
  switch (capability.kind) {
    case "table":
      return `table ${capability.table}`;
    case "column":
      return `column ${capability.table}.${capability.column}`;
    case "index":
      return `index ${capability.table}.${capability.index}`;
    case "constraint":
      return `constraint ${capability.table}.${capability.constraint.column} ${capability.constraint.kind}`;
    case "data":
      return `data predicate ${capability.name}`;
  }
};

const checkCapability = Effect.fn("sigidi/checkMigrationCapability")(function* (
  capability: UpstreamCapability,
) {
  const sql = yield* SqlClient.SqlClient;
  switch (capability.kind) {
    case "table": {
      const rows = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${capability.table}
      `;
      return rows.length === 1;
    }
    case "column": {
      const rows = yield* sql<{ readonly name: string }>`
        SELECT name FROM pragma_table_info(${capability.table}) WHERE name = ${capability.column}
      `;
      return rows.length === 1;
    }
    case "index": {
      const rows = yield* sql<{ readonly name: string }>`
        SELECT name FROM pragma_index_list(${capability.table}) WHERE name = ${capability.index}
      `;
      return rows.length === 1;
    }
    case "constraint": {
      const constraint = capability.constraint;
      if (constraint.kind === "foreign-key") {
        const rows = yield* sql<{
          readonly from: string;
          readonly table: string;
          readonly to: string;
        }>`
          SELECT "from", "table", "to"
          FROM pragma_foreign_key_list(${capability.table})
          WHERE "from" = ${constraint.column}
            AND "table" = ${constraint.referencesTable}
            AND "to" = ${constraint.referencesColumn}
        `;
        return rows.length === 1;
      }
      const rows = yield* sql<{
        readonly name: string;
        readonly notnull: number;
        readonly pk: number;
      }>`
        SELECT name, "notnull", pk
        FROM pragma_table_info(${capability.table})
        WHERE name = ${constraint.column}
      `;
      const column = rows[0];
      return constraint.kind === "primary-key" ? (column?.pk ?? 0) > 0 : column?.notnull === 1;
    }
    case "data":
      return yield* capability.check;
  }
});

export const validateUpstreamMigrationCompatibility = Effect.fn(
  "sigidi/validateUpstreamMigrationCompatibility",
)(function* ({
  expectedUpstreamCommit,
  expectedMigrationPrefix,
  minimumUpstreamMigrationId,
  requiredCapabilities,
}: {
  readonly expectedUpstreamCommit: string;
  readonly expectedMigrationPrefix: ReadonlyArray<MigrationIdentity>;
  readonly minimumUpstreamMigrationId: number;
  readonly requiredCapabilities: ReadonlyArray<UpstreamCapability>;
}) {
  const sql = yield* SqlClient.SqlClient;
  const applied = yield* sql<{
    readonly migrationId: number;
    readonly name: string;
  }>`
    SELECT migration_id AS "migrationId", name
    FROM effect_sql_migrations
    ORDER BY migration_id
  `;

  for (const [index, expected] of expectedMigrationPrefix.entries()) {
    const actual = applied[index];
    if (actual?.migrationId === expected[0] && actual.name === expected[1]) continue;
    const actualIdentity = actual ? `${actual.migrationId}_${actual.name}` : "missing";
    return yield* new MigrationCompatibilityError({
      kind: "ledger",
      expectedUpstreamCommit,
      detail: `upstream ledger mismatch at ${expected[0]}: expected ${expected[0]}_${expected[1]}, found ${actualIdentity}`,
      recoveryRunbook: SIGIDI_MIGRATION_RECOVERY_RUNBOOK,
    });
  }

  const latestAppliedId = applied.at(-1)?.migrationId ?? 0;
  if (latestAppliedId < minimumUpstreamMigrationId) {
    return yield* new MigrationCompatibilityError({
      kind: "minimum",
      expectedUpstreamCommit,
      detail: `minimum upstream migration is ${minimumUpstreamMigrationId}, found ${latestAppliedId}`,
      recoveryRunbook: SIGIDI_MIGRATION_RECOVERY_RUNBOOK,
    });
  }

  for (const capability of requiredCapabilities) {
    const name = capabilityName(capability);
    const available = yield* checkCapability(capability).pipe(
      Effect.mapError(
        (cause) =>
          new MigrationCompatibilityError({
            kind: "capability",
            expectedUpstreamCommit,
            detail: `could not validate ${name}: ${String(cause)}`,
            recoveryRunbook: SIGIDI_MIGRATION_RECOVERY_RUNBOOK,
          }),
      ),
    );
    if (available) continue;
    return yield* new MigrationCompatibilityError({
      kind: "capability",
      expectedUpstreamCommit,
      detail: `missing required ${name}`,
      recoveryRunbook: SIGIDI_MIGRATION_RECOVERY_RUNBOOK,
    });
  }
});
