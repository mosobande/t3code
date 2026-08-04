// @effect-diagnostics nodeBuiltinImport:off - validates tracked GitHub workflow files through the Node filesystem boundary.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { assert, describe, it } from "@effect/vitest";

const repoRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const releaseWorkflow = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/release.yml"),
  "utf8",
);
const marketingWorkflow = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/deploy-marketing.yml"),
  "utf8",
);

const workflowJob = (name: string, nextName: string) => {
  const start = releaseWorkflow.indexOf(`  ${name}:`);
  const end = releaseWorkflow.indexOf(`\n  ${nextName}:`, start);

  assert.isAtLeast(start, 0);
  assert.isAbove(end, start);

  return releaseWorkflow.slice(start, end);
};

describe("release workflow", () => {
  it("runs only the macOS application release and marketing deployment", () => {
    const buildJob = workflowJob("build", "publish_cli");

    assert.notInclude(releaseWorkflow, 'cron: "0 */3 * * *"');
    assert.notInclude(releaseWorkflow, "platform: linux");
    assert.notInclude(releaseWorkflow, "platform: win");
    assert.include(releaseWorkflow, "relay_public_config:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "build_wsl_node_pty:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "publish_cli:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "deploy_web:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "finalize:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "announce_discord:\n    if: ${{ false }}");
    assert.notInclude(buildJob, "Download relay client tracing config");
    assert.notInclude(buildJob, "Load relay client tracing config");
    assert.include(marketingWorkflow, "name: Deploy marketing website");
    assert.include(
      marketingWorkflow,
      "if: ${{ github.ref_name == github.event.repository.default_branch }}",
    );
  });
});
