export interface SigidiUpstreamCompatibilityRecord {
  readonly testedUpstreamCommit: string;
  readonly effectEngine: {
    readonly version: string;
    readonly patchHash: string;
  };
  readonly migrations: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly sourcePath: string;
    readonly sha256: string;
  }>;
}

export function checkSigidiMigrationCompatibility(input: {
  readonly record: SigidiUpstreamCompatibilityRecord;
  readonly currentManifest: ReadonlyArray<readonly [number, string]>;
  readonly currentSourceHashes: ReadonlyMap<string, string>;
  readonly pinnedSourceHashes: ReadonlyMap<string, string>;
  readonly currentEffectEngine: {
    readonly version: string;
    readonly patchHash: string;
  };
  readonly pinnedEffectEngine: {
    readonly version: string;
    readonly patchHash: string;
  };
}): ReadonlyArray<string> {
  const issues: Array<string> = [];

  for (const [index, expected] of input.record.migrations.entries()) {
    const actual = input.currentManifest[index];
    if (actual?.[0] === expected.id && actual[1] === expected.name) continue;
    const actualIdentity = actual ? `${actual[0]}_${actual[1]}` : "missing";
    issues.push(
      `upstream migration manifest mismatch at ${expected.id}: expected ${expected.id}_${expected.name}, found ${actualIdentity}`,
    );
    break;
  }

  const manifestDelta = input.currentManifest.length - input.record.migrations.length;
  if (manifestDelta > 0) {
    issues.push(
      `upstream migration manifest has ${manifestDelta} unrecorded ${manifestDelta === 1 ? "entry" : "entries"}`,
    );
  } else if (manifestDelta < 0) {
    const missing = Math.abs(manifestDelta);
    issues.push(
      `upstream migration manifest is missing ${missing} recorded ${missing === 1 ? "entry" : "entries"}`,
    );
  }

  for (const migration of input.record.migrations) {
    if (input.pinnedSourceHashes.get(migration.sourcePath) === migration.sha256) continue;
    issues.push(`recorded upstream source does not match tested commit: ${migration.sourcePath}`);
  }

  for (const migration of input.record.migrations) {
    if (input.currentSourceHashes.get(migration.sourcePath) === migration.sha256) continue;
    issues.push(`upstream migration source changed: ${migration.sourcePath}`);
  }

  const expectedEngine = input.record.effectEngine;
  const pinnedEngine = input.pinnedEffectEngine;
  if (
    expectedEngine.version !== pinnedEngine.version ||
    expectedEngine.patchHash !== pinnedEngine.patchHash
  ) {
    issues.push(
      `recorded Effect identity does not match tested commit: expected ${expectedEngine.version} (${expectedEngine.patchHash}), found ${pinnedEngine.version} (${pinnedEngine.patchHash})`,
    );
  }

  const actualEngine = input.currentEffectEngine;
  if (
    expectedEngine.version !== actualEngine.version ||
    expectedEngine.patchHash !== actualEngine.patchHash
  ) {
    issues.push(
      `Effect migrator identity changed: expected ${expectedEngine.version} (${expectedEngine.patchHash}), found ${actualEngine.version} (${actualEngine.patchHash})`,
    );
  }

  return issues;
}
