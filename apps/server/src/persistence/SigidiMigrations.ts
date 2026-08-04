/**
 * SIGIDI-owned migrations.
 *
 * This manifest and its ledger are independent from the upstream migration
 * sequence so an upstream migration can never reuse a SIGIDI migration ID.
 */
import * as Effect from "effect/Effect";
import * as Migrator from "effect/unstable/sql/Migrator";

import Migration0001 from "./SigidiMigrations/001_ProjectNotes.ts";
import Migration0002 from "./SigidiMigrations/002_ProjectNoteRevision.ts";
import type { UpstreamCapability } from "./MigrationCompatibility.ts";

export const sigidiMigrationEntries = [
  {
    id: 1,
    name: "ProjectNotes",
    minimumUpstreamMigrationId: 35,
    requiredCapabilities: [] satisfies ReadonlyArray<UpstreamCapability>,
    migration: Migration0001,
  },
  {
    id: 2,
    name: "ProjectNoteRevision",
    minimumUpstreamMigrationId: 35,
    requiredCapabilities: [] satisfies ReadonlyArray<UpstreamCapability>,
    migration: Migration0002,
  },
] as const;

export const sigidiMigrationManifest = sigidiMigrationEntries.map(
  ({ id, name }) => [id, name] as const,
);

export const minimumSigidiUpstreamMigrationId = Math.max(
  0,
  ...sigidiMigrationEntries.map(({ minimumUpstreamMigrationId }) => minimumUpstreamMigrationId),
);

export const sigidiRequiredCapabilities: ReadonlyArray<UpstreamCapability> =
  sigidiMigrationEntries.flatMap(({ requiredCapabilities }) => requiredCapabilities);

const makeSigidiMigrationLoader = () =>
  Migrator.fromRecord(
    Object.fromEntries(
      sigidiMigrationEntries.map(({ id, name, migration }) => [`${id}_${name}`, migration]),
    ),
  );

const run = Migrator.make({});

export const runSigidiMigrations = Effect.fn("sigidi/runMigrations")(function* () {
  const executedMigrations = yield* run({
    loader: makeSigidiMigrationLoader(),
    table: "sigidi_sql_migrations",
  });
  const migrations = executedMigrations.map(([id, name]) => `${id}_${name}`);
  yield* migrations.length === 0
    ? Effect.logDebug("SIGIDI database schema is current")
    : Effect.log("SIGIDI migrations ran successfully").pipe(Effect.annotateLogs({ migrations }));
  return executedMigrations;
});
