import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import {
  MigrationCompatibilityError,
  validateUpstreamMigrationCompatibility,
} from "./MigrationCompatibility.ts";
import { migrationEntries, runMigrations } from "./Migrations.ts";

const sqliteClient =
  process.versions.bun === undefined
    ? await import("./NodeSqliteClient.ts")
    : await import("@effect/sql-sqlite-bun/SqliteClient");
const layer = it.layer(Layer.mergeAll(sqliteClient.layer({ filename: ":memory:" })));

layer("SIGIDI migration compatibility", (it) => {
  it.effect("accepts a matching ledger prefix and required SQLite capabilities", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 2 });

      yield* validateUpstreamMigrationCompatibility({
        expectedUpstreamCommit: "test-upstream",
        expectedMigrationPrefix: migrationEntries.slice(0, 2).map(([id, name]) => [id, name]),
        minimumUpstreamMigrationId: 2,
        requiredCapabilities: [
          { kind: "table", table: "orchestration_events" },
          { kind: "column", table: "orchestration_events", column: "event_id" },
          {
            kind: "index",
            table: "orchestration_events",
            index: "idx_orch_events_stream_version",
          },
          {
            kind: "constraint",
            table: "orchestration_events",
            constraint: { kind: "primary-key", column: "sequence" },
          },
          {
            kind: "data",
            name: "empty orchestration event stream",
            check: Effect.map(
              sql<{ readonly count: number }>`SELECT COUNT(*) AS count FROM orchestration_events`,
              (rows) => rows[0]?.count === 0,
            ),
          },
        ],
      });
    }),
  );

  it.effect("reports the first upstream ledger mismatch before SIGIDI SQL", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 2 });
      const error = yield* sql
        .withTransaction(
          Effect.gen(function* () {
            yield* sql`
              UPDATE effect_sql_migrations
              SET name = 'ChangedMigration'
              WHERE migration_id = 1
            `;
            return yield* validateUpstreamMigrationCompatibility({
              expectedUpstreamCommit: "test-upstream",
              expectedMigrationPrefix: migrationEntries.slice(0, 2).map(([id, name]) => [id, name]),
              minimumUpstreamMigrationId: 2,
              requiredCapabilities: [],
            });
          }),
        )
        .pipe(Effect.flip);

      assert.instanceOf(error, MigrationCompatibilityError);
      assert.strictEqual(error.kind, "ledger");
      assert.include(error.message, "expected upstream test-upstream");
      assert.include(error.message, "1_OrchestrationEvents");
      assert.include(error.message, "1_ChangedMigration");
    }),
  );

  it.effect("reports the first missing capability", () =>
    Effect.gen(function* () {
      yield* runMigrations({ toMigrationInclusive: 2 });

      const error = yield* validateUpstreamMigrationCompatibility({
        expectedUpstreamCommit: "test-upstream",
        expectedMigrationPrefix: migrationEntries.slice(0, 2).map(([id, name]) => [id, name]),
        minimumUpstreamMigrationId: 2,
        requiredCapabilities: [
          { kind: "column", table: "orchestration_events", column: "missing_column" },
        ],
      }).pipe(Effect.flip);

      assert.instanceOf(error, MigrationCompatibilityError);
      assert.strictEqual(error.kind, "capability");
      assert.include(error.message, "orchestration_events.missing_column");
      assert.include(error.message, "docs/operations/sigidi-migration-recovery.md");
    }),
  );

  it.effect("wraps capability query failures with the compatibility recovery diagnostic", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 2 });

      const error = yield* validateUpstreamMigrationCompatibility({
        expectedUpstreamCommit: "test-upstream",
        expectedMigrationPrefix: migrationEntries.slice(0, 2).map(([id, name]) => [id, name]),
        minimumUpstreamMigrationId: 2,
        requiredCapabilities: [
          {
            kind: "data",
            name: "queryable prerequisite",
            check: sql.unsafe("SELECT FROM").pipe(Effect.as(true)),
          },
        ],
      }).pipe(Effect.flip);

      assert.instanceOf(error, MigrationCompatibilityError);
      assert.strictEqual(error.kind, "capability");
      assert.include(error.message, "could not validate data predicate queryable prerequisite");
      assert.include(error.message, "docs/operations/sigidi-migration-recovery.md");
    }),
  );
});
