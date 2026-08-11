import type { DesktopSshEnvironmentTarget } from "@t3tools/contracts";
import { cliPackageName } from "@t3tools/shared/productProfile";
import { assert, describe, it } from "@effect/vitest";
import { buildRemoteLaunchScript, buildRemotePairingScript } from "@t3tools/ssh/tunnel";

import { resolveDesktopSshCliRunner } from "./DesktopSshCliRunner.ts";

const target: DesktopSshEnvironmentTarget = {
  alias: "staging",
  hostname: "staging.example.com",
  username: "julius",
  port: 22,
};

describe("desktop SSH CLI runner", () => {
  it("routes the packaged desktop version into launch and pairing commands", () => {
    const runner = resolveDesktopSshCliRunner({
      appVersion: "1.2.3",
      updateChannel: "latest",
      isDevelopment: false,
      nodeEngineRange: "^24.13.1",
    });
    const packageSpec = `${cliPackageName}@1.2.3`;

    assert.equal(runner.packageSpec, packageSpec);
    for (const script of [
      buildRemoteLaunchScript(runner),
      buildRemotePairingScript(target, runner),
    ]) {
      assert.include(script, `exec npx --yes '${packageSpec}'`);
      assert.notInclude(script, 'exec t3 "$@"');
    }
  });

  it("keeps the development entry override off the npm path", () => {
    assert.deepEqual(
      resolveDesktopSshCliRunner({
        appVersion: "0.0.0-dev",
        updateChannel: "nightly",
        isDevelopment: true,
        devRemoteEntryPath: "/workspace/apps/server/dist/bin.mjs",
        nodeEngineRange: "^24.13.1",
      }),
      {
        nodeScriptPath: "/workspace/apps/server/dist/bin.mjs",
        nodeEngineRange: "^24.13.1",
      },
    );
  });
});
