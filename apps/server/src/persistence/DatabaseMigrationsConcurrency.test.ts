// @effect-diagnostics nodeBuiltinImport:off - This test creates two independent SQLite connections to one isolated file.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runDatabaseMigrations } from "./DatabaseMigrations.ts";
import { migrationManifest } from "./Migrations.ts";
import { sigidiMigrationManifest } from "./SigidiMigrations.ts";

const sqliteClient =
  process.versions.bun === undefined
    ? await import("./NodeSqliteClient.ts")
    : await import("@effect/sql-sqlite-bun/SqliteClient");

it("does not report success while another connection owns the migration write lock", async () => {
  const tempDirectory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "sigidi-concurrency-"));
  const databasePath = NodePath.join(tempDirectory, "state.sqlite");
  const layer = () => sqliteClient.layer({ filename: databasePath });

  try {
    await Effect.runPromise(
      Effect.gen(function* () {
        const locked = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const holder = yield* Effect.forkChild(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* sql.withTransaction(
              Effect.gen(function* () {
                yield* sql`CREATE TABLE startup_lock (id INTEGER PRIMARY KEY)`;
                yield* Deferred.succeed(locked, undefined);
                yield* Deferred.await(release);
              }),
            );
          }).pipe(Effect.provide(layer())),
        );

        yield* Deferred.await(locked);
        const contender = yield* Effect.exit(runDatabaseMigrations().pipe(Effect.provide(layer())));
        assert.isTrue(Exit.isFailure(contender));

        yield* Deferred.succeed(release, undefined);
        yield* Fiber.join(holder);

        const result = yield* Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* runDatabaseMigrations();
          const upstream = yield* sql<{ readonly count: number }>`
            SELECT COUNT(*) AS count FROM effect_sql_migrations
          `;
          const sigidi = yield* sql<{ readonly count: number }>`
            SELECT COUNT(*) AS count FROM sigidi_sql_migrations
          `;
          return {
            upstream: upstream[0]?.count,
            sigidi: sigidi[0]?.count,
          };
        }).pipe(Effect.provide(layer()));

        assert.deepStrictEqual(result, {
          upstream: migrationManifest.length,
          sigidi: sigidiMigrationManifest.length,
        });
      }),
    );
  } finally {
    NodeFS.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
