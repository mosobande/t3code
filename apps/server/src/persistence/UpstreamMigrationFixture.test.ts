// @effect-diagnostics nodeBuiltinImport:off - This fixture test creates an isolated database file for both Node and Bun SQLite.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runDatabaseMigrations } from "./DatabaseMigrations.ts";
import { sigidiMigrationManifest } from "./SigidiMigrations.ts";

const sqliteClient =
  process.versions.bun === undefined
    ? await import("./NodeSqliteClient.ts")
    : await import("@effect/sql-sqlite-bun/SqliteClient");

const initializeDatabase = async (databasePath: string, fixture: string) => {
  if (process.versions.bun !== undefined) {
    const { Database } = await import("bun:sqlite");
    const database = new Database(databasePath, { create: true });
    try {
      database.exec(fixture);
    } finally {
      database.close();
    }
    return;
  }
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(fixture);
  } finally {
    database.close();
  }
};

it("upgrades the pinned upstream-only fixture without losing representative data", async () => {
  const fixture = NodeFS.readFileSync(
    NodePath.join(import.meta.dirname, "fixtures/upstream-f8707481.sql"),
    "utf8",
  );
  const tempDirectory = NodeFS.mkdtempSync(
    NodePath.join(NodeOS.tmpdir(), "sigidi-upstream-upgrade-"),
  );
  const databasePath = NodePath.join(tempDirectory, "state.sqlite");

  try {
    await initializeDatabase(databasePath, fixture);
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const before = yield* sql<{ readonly count: number }>`
          SELECT COUNT(*) AS count
          FROM sqlite_master
          WHERE name IN ('sigidi_sql_migrations', 'sigidi_project_notes')
        `;
        assert.strictEqual(before[0]?.count, 0);

        yield* runDatabaseMigrations();

        const applied = yield* sql<{
          readonly migrationId: number;
          readonly name: string;
        }>`
          SELECT migration_id AS "migrationId", name
          FROM sigidi_sql_migrations
          ORDER BY migration_id
        `;
        assert.deepStrictEqual(
          applied.map(({ migrationId, name }) => [migrationId, name]),
          sigidiMigrationManifest.map(([id, name]) => [id, name]),
        );

        const notesTable = yield* sql<{ readonly count: number }>`
          SELECT COUNT(*) AS count
          FROM sqlite_master
          WHERE type = 'table' AND name = 'sigidi_project_notes'
        `;
        assert.strictEqual(notesTable[0]?.count, 1);

        const events = yield* sql<{ readonly eventId: string }>`
          SELECT event_id AS "eventId"
          FROM orchestration_events
          WHERE event_id = 'fixture-event'
        `;
        assert.deepStrictEqual(events, [{ eventId: "fixture-event" }]);
      }).pipe(Effect.provide(sqliteClient.layer({ filename: databasePath }))),
    );
  } finally {
    NodeFS.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
