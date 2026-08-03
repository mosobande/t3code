import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { sigidiUpstreamCompatibility } from "@t3tools/shared/sigidiMigrationCompatibility";

import { validateUpstreamMigrationCompatibility } from "./MigrationCompatibility.ts";
import { runMigrations } from "./Migrations.ts";
import {
  minimumSigidiUpstreamMigrationId,
  runSigidiMigrations,
  sigidiRequiredCapabilities,
} from "./SigidiMigrations.ts";

export const runDatabaseMigrationEffects = Effect.fn("sigidi/runDatabaseMigrationEffects")(
  function* <
    Upstream,
    UpstreamError,
    UpstreamRequirements,
    Validation,
    ValidationError,
    ValidationRequirements,
    Sigidi,
    SigidiError,
    SigidiRequirements,
  >({
    runUpstream,
    validateUpstream,
    runSigidi,
  }: {
    readonly runUpstream: Effect.Effect<Upstream, UpstreamError, UpstreamRequirements>;
    readonly validateUpstream: Effect.Effect<Validation, ValidationError, ValidationRequirements>;
    readonly runSigidi: Effect.Effect<Sigidi, SigidiError, SigidiRequirements>;
  }) {
    const sql = yield* SqlClient.SqlClient;
    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const upstream = yield* runUpstream;
        yield* validateUpstream;
        const sigidi = yield* runSigidi;
        return { upstream, sigidi } as const;
      }),
    );
  },
);

export const runDatabaseMigrations = Effect.fn("sigidi/runDatabaseMigrations")(function* () {
  return yield* runDatabaseMigrationEffects({
    runUpstream: runMigrations(),
    validateUpstream: validateUpstreamMigrationCompatibility({
      expectedUpstreamCommit: sigidiUpstreamCompatibility.testedUpstreamCommit,
      expectedMigrationPrefix: sigidiUpstreamCompatibility.migrations.map(({ id, name }) => [
        id,
        name,
      ]),
      minimumUpstreamMigrationId: minimumSigidiUpstreamMigrationId,
      requiredCapabilities: sigidiRequiredCapabilities,
    }),
    runSigidi: runSigidiMigrations(),
  });
});
