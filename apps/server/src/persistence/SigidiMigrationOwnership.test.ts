// @effect-diagnostics nodeBuiltinImport:off - This static ownership test reads the registered migration sources.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { assert, it } from "@effect/vitest";

import { migrationManifest } from "./Migrations.ts";
import { sigidiMigrationEntries } from "./SigidiMigrations.ts";

it("keeps SIGIDI IDs unique and schema writes inside the sigidi_ namespace", () => {
  const ids = sigidiMigrationEntries.map(({ id }) => id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.deepStrictEqual(
    ids,
    [...ids].sort((left, right) => left - right),
  );
  assert.isFalse(migrationManifest.some(([, name]) => name.startsWith("ProjectNote")));

  for (const migration of sigidiMigrationEntries) {
    assert.isAtLeast(migration.minimumUpstreamMigrationId, 0);
    const filename = `${String(migration.id).padStart(3, "0")}_${migration.name}.ts`;
    const source = NodeFS.readFileSync(
      NodePath.join(import.meta.dirname, "SigidiMigrations", filename),
      "utf8",
    );
    const tableWrites = Array.from(
      source.matchAll(
        /\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|DROP\s+TABLE(?:\s+IF\s+EXISTS)?)\s+[`"]?([A-Za-z0-9_]+)/gi,
      ),
      (match) => match[1],
    );
    assert.isAbove(tableWrites.length, 0, `${filename} must contain a schema write`);
    for (const table of tableWrites) {
      assert.match(table ?? "", /^sigidi_/, `${filename} writes outside SIGIDI ownership`);
    }
  }
});
