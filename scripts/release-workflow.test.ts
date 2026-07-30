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

describe("release workflow", () => {
  it("runs only the macOS application release and marketing deployment", () => {
    assert.notInclude(releaseWorkflow, 'cron: "0 */3 * * *"');
    assert.notInclude(releaseWorkflow, "platform: linux");
    assert.notInclude(releaseWorkflow, "platform: win");
    assert.include(releaseWorkflow, "relay_public_config:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "build_wsl_node_pty:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "publish_cli:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "deploy_web:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "finalize:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "announce_discord:\n    if: ${{ false }}");
    assert.include(marketingWorkflow, "name: Deploy marketing website");
  });
});
