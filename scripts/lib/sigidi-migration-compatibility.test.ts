import { describe, expect, it } from "vite-plus/test";

import { checkSigidiMigrationCompatibility } from "./sigidi-migration-compatibility.ts";

const record = {
  testedUpstreamCommit: "upstream-commit",
  effectEngine: { version: "4.0.0", patchHash: "engine-hash" },
  migrations: [
    {
      id: 1,
      name: "Initial",
      sourcePath: "Migrations/001_Initial.ts",
      sha256: "source-hash",
    },
  ],
} as const;

describe("SIGIDI migration compatibility checker", () => {
  it("accepts the pinned manifest, source hashes, and Effect identity", () => {
    expect(
      checkSigidiMigrationCompatibility({
        record,
        currentManifest: [[1, "Initial"]],
        currentSourceHashes: new Map([["Migrations/001_Initial.ts", "source-hash"]]),
        pinnedSourceHashes: new Map([["Migrations/001_Initial.ts", "source-hash"]]),
        currentEffectEngine: { version: "4.0.0", patchHash: "engine-hash" },
        pinnedEffectEngine: { version: "4.0.0", patchHash: "engine-hash" },
      }),
    ).toEqual([]);
  });

  it("reports manifest, source, and Effect drift without rewriting the record", () => {
    expect(
      checkSigidiMigrationCompatibility({
        record,
        currentManifest: [
          [1, "Changed"],
          [2, "Added"],
        ],
        currentSourceHashes: new Map([["Migrations/001_Initial.ts", "changed-hash"]]),
        pinnedSourceHashes: new Map([["Migrations/001_Initial.ts", "source-hash"]]),
        currentEffectEngine: { version: "4.1.0", patchHash: "changed-engine-hash" },
        pinnedEffectEngine: { version: "4.0.0", patchHash: "engine-hash" },
      }),
    ).toEqual([
      "upstream migration manifest mismatch at 1: expected 1_Initial, found 1_Changed",
      "upstream migration manifest has 1 unrecorded entry",
      "upstream migration source changed: Migrations/001_Initial.ts",
      "Effect migrator identity changed: expected 4.0.0 (engine-hash), found 4.1.0 (changed-engine-hash)",
    ]);
  });

  it("rejects a record whose source or engine identity did not come from its tested commit", () => {
    expect(
      checkSigidiMigrationCompatibility({
        record,
        currentManifest: [[1, "Initial"]],
        currentSourceHashes: new Map([["Migrations/001_Initial.ts", "source-hash"]]),
        pinnedSourceHashes: new Map([["Migrations/001_Initial.ts", "pinned-source-hash"]]),
        currentEffectEngine: { version: "4.0.0", patchHash: "engine-hash" },
        pinnedEffectEngine: { version: "3.0.0", patchHash: "pinned-engine-hash" },
      }),
    ).toEqual([
      "recorded upstream source does not match tested commit: Migrations/001_Initial.ts",
      "recorded Effect identity does not match tested commit: expected 4.0.0 (engine-hash), found 3.0.0 (pinned-engine-hash)",
    ]);
  });
});
