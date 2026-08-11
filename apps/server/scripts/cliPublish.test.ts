import { assert, describe, it } from "@effect/vitest";

import { createVpPmPublishArgs, resolveSigidiCliPublishMetadata } from "./cliPublish.ts";

describe("SIGIDI CLI publication", () => {
  it("owns the public package identity while preserving the compatibility command", () => {
    assert.deepEqual(
      resolveSigidiCliPublishMetadata(
        {
          name: "t3",
          repository: {
            type: "git",
            url: "https://github.com/pingdotgg/t3code",
            directory: "apps/server",
          },
          bin: { t3: "./dist/bin.mjs" },
        },
        "0.0.34-nightly.20260810.3",
      ),
      {
        name: "@sigidi/cli",
        repository: {
          type: "git",
          url: "https://github.com/quantipixels/sigidi",
          directory: "apps/server",
        },
        bin: { t3: "./dist/bin.mjs" },
        version: "0.0.34-nightly.20260810.3",
      },
    );
  });

  it("publishes the server workspace by path after its package name changes", () => {
    assert.deepEqual(
      createVpPmPublishArgs({
        access: "public",
        tag: "nightly",
        provenance: false,
        dryRun: true,
      }),
      [
        "publish",
        "--filter",
        "./apps/server",
        "--access",
        "public",
        "--tag",
        "nightly",
        "--no-git-checks",
        "--dry-run",
      ],
    );
  });
});
