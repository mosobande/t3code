// @effect-diagnostics nodeBuiltinImport:off
import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as NodeSqlite from "node:sqlite";

import { migrationManifest } from "../persistence/Migrations.ts";
import { sigidiMigrationManifest } from "../persistence/SigidiMigrations.ts";
import { runServicePreflight } from "./servicePreflight.ts";

it.layer(NodeServices.layer)("service update preflight", (it) => {
  it.effect("requires exact upstream and SIGIDI manifests without mutating the database", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped({ prefix: "t3-service-preflight-test-" });
      const databasePath = path.join(root, "state.sqlite");
      const database = new NodeSqlite.DatabaseSync(databasePath);
      database.exec("CREATE TABLE effect_sql_migrations (migration_id INTEGER, name TEXT)");
      database.exec("CREATE TABLE sigidi_sql_migrations (migration_id INTEGER, name TEXT)");
      const insertUpstream = database.prepare(
        "INSERT INTO effect_sql_migrations (migration_id, name) VALUES (?, ?)",
      );
      for (const [id, name] of migrationManifest) insertUpstream.run(id, name);
      const insertSigidi = database.prepare(
        "INSERT INTO sigidi_sql_migrations (migration_id, name) VALUES (?, ?)",
      );
      for (const [id, name] of sigidiMigrationManifest) insertSigidi.run(id, name);
      database.close();

      expect(runServicePreflight({ databasePath, launcherProtocol: 1, version: "1.2.3" })).toEqual({
        status: "ready",
        version: "1.2.3",
        launcherProtocol: 1,
      });

      const changed = new NodeSqlite.DatabaseSync(databasePath);
      changed.exec("DELETE FROM effect_sql_migrations WHERE migration_id = 35");
      changed.close();
      const blocked = runServicePreflight({
        databasePath,
        launcherProtocol: 1,
        version: "1.2.3",
      });
      expect(blocked.status).toBe("blocked");
      if (blocked.status === "blocked") {
        expect(blocked.reason).toContain("npx t3@1.2.3 service update");
      }

      const missingSigidi = new NodeSqlite.DatabaseSync(databasePath);
      const latestUpstream = migrationManifest.at(-1);
      if (latestUpstream) {
        missingSigidi
          .prepare("INSERT INTO effect_sql_migrations (migration_id, name) VALUES (?, ?)")
          .run(...latestUpstream);
      }
      missingSigidi.exec("DELETE FROM sigidi_sql_migrations WHERE migration_id = 2");
      missingSigidi.close();
      const sigidiBlocked = runServicePreflight({
        databasePath,
        launcherProtocol: 1,
        version: "1.2.3",
      });
      expect(sigidiBlocked.status).toBe("blocked");
    }),
  );
});
