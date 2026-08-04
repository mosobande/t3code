import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Migrator from "effect/unstable/sql/Migrator";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runDatabaseMigrationEffects, runDatabaseMigrations } from "./DatabaseMigrations.ts";
import { MigrationCompatibilityError } from "./MigrationCompatibility.ts";
import { migrationEntries } from "./Migrations.ts";
import { sigidiMigrationManifest } from "./SigidiMigrations.ts";

const sqliteClient =
  process.versions.bun === undefined
    ? await import("./NodeSqliteClient.ts")
    : await import("@effect/sql-sqlite-bun/SqliteClient");
const layer = it.layer(Layer.mergeAll(sqliteClient.layer({ filename: ":memory:" })));

layer("database migrations", (it) => {
  it.effect("creates independent upstream and SIGIDI ledgers and is idempotent", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const first = yield* runDatabaseMigrations();
      const second = yield* runDatabaseMigrations();

      const ledgers = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('effect_sql_migrations', 'sigidi_sql_migrations')
        ORDER BY name
      `;

      assert.deepStrictEqual(
        ledgers.map(({ name }) => name),
        ["effect_sql_migrations", "sigidi_sql_migrations"],
      );
      assert.isAbove(first.upstream.length, 0);
      assert.deepStrictEqual(second, { upstream: [], sigidi: [] });
    }),
  );

  it.effect("keeps Project Notes out of the upstream sequence and in SIGIDI IDs 1 and 2", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      yield* runDatabaseMigrations();

      assert.isFalse(migrationEntries.some(([, name]) => name.startsWith("ProjectNote")));
      assert.deepStrictEqual(sigidiMigrationManifest, [
        [1, "ProjectNotes"],
        [2, "ProjectNoteRevision"],
      ]);

      const tables = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE name IN ('project_notes', 'sigidi_project_notes')
        ORDER BY name
      `;
      assert.deepStrictEqual(tables, [{ name: "sigidi_project_notes" }]);

      const columns = yield* sql<{ readonly name: string }>`
        PRAGMA table_info(sigidi_project_notes)
      `;
      assert.isTrue(columns.some(({ name }) => name === "revision"));
    }),
  );

  it.effect("runs upstream, validation, and SIGIDI work in order", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      yield* runDatabaseMigrationEffects({
        runUpstream: sql`CREATE TABLE ordered_upstream (id INTEGER PRIMARY KEY)`,
        validateUpstream: sql`INSERT INTO ordered_upstream (id) VALUES (1)`,
        runSigidi: Effect.gen(function* () {
          const rows = yield* sql<{ readonly id: number }>`SELECT id FROM ordered_upstream`;
          assert.deepStrictEqual(rows, [{ id: 1 }]);
          yield* sql`CREATE TABLE sigidi_ordered (id INTEGER PRIMARY KEY)`;
        }),
      });

      const tables = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE name IN ('ordered_upstream', 'sigidi_ordered')
        ORDER BY name
      `;
      assert.deepStrictEqual(tables, [{ name: "ordered_upstream" }, { name: "sigidi_ordered" }]);
    }),
  );

  it.effect("rolls back both lanes when SIGIDI migration work fails", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const runTestMigrations = Migrator.make({});

      const exit = yield* Effect.exit(
        runDatabaseMigrationEffects({
          runUpstream: sql`CREATE TABLE rollback_upstream (id INTEGER PRIMARY KEY)`,
          validateUpstream: Effect.void,
          runSigidi: runTestMigrations({
            table: "sigidi_test_migrations",
            loader: Migrator.fromRecord({
              "1_Failing": Effect.gen(function* () {
                yield* sql`CREATE TABLE sigidi_rollback (id INTEGER PRIMARY KEY)`;
                return yield* new MigrationCompatibilityError({
                  kind: "capability",
                  expectedUpstreamCommit: "test-upstream",
                  detail: "expected SIGIDI failure",
                  recoveryRunbook: "test-runbook",
                });
              }),
            }),
          }),
        }),
      );

      assert.isTrue(Exit.isFailure(exit));
      const tables = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE name IN ('rollback_upstream', 'sigidi_rollback', 'sigidi_test_migrations')
      `;
      assert.deepStrictEqual(tables, []);
    }),
  );

  it.effect("stops before SIGIDI work and rolls back upstream work when validation fails", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const exit = yield* Effect.exit(
        runDatabaseMigrationEffects({
          runUpstream: sql`CREATE TABLE boundary_upstream (id INTEGER PRIMARY KEY)`,
          validateUpstream: Effect.fail("expected boundary failure"),
          runSigidi: sql`CREATE TABLE sigidi_should_not_run (id INTEGER PRIMARY KEY)`,
        }),
      );

      assert.isTrue(Exit.isFailure(exit));
      const tables = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE name IN ('boundary_upstream', 'sigidi_should_not_run')
      `;
      assert.deepStrictEqual(tables, []);
    }),
  );

  it.effect("serializes concurrent startup attempts and leaves complete ledgers", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      yield* Effect.all([runDatabaseMigrations(), runDatabaseMigrations()], {
        concurrency: "unbounded",
      });

      const upstream = yield* sql<{ readonly count: number }>`
        SELECT COUNT(*) AS count FROM effect_sql_migrations
      `;
      const sigidi = yield* sql<{ readonly count: number }>`
        SELECT COUNT(*) AS count FROM sigidi_sql_migrations
      `;
      assert.isAbove(upstream[0]?.count ?? 0, 0);
      assert.strictEqual(sigidi[0]?.count, sigidiMigrationManifest.length);
    }),
  );
});
