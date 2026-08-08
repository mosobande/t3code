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
const workflowJob = (name: string, nextName: string) => {
  const start = releaseWorkflow.indexOf(`  ${name}:`);
  const end = releaseWorkflow.indexOf(`\n  ${nextName}:`, start);

  assert.isAtLeast(start, 0);
  assert.isAbove(end, start);

  return releaseWorkflow.slice(start, end);
};

describe("release workflow", () => {
  it("runs only an unsigned local-desktop macOS rehearsal", () => {
    const rehearsalJob = workflowJob("rehearse", "check_changes");
    const buildJob = workflowJob("build", "publish_cli");

    assert.notInclude(releaseWorkflow, "schedule:");
    assert.notInclude(releaseWorkflow, "workflow_dispatch:");
    assert.include(releaseWorkflow, 'tags: ["v*.*.*"]');
    assert.notInclude(releaseWorkflow, "branches: [main]");
    assert.include(rehearsalJob, "SIGIDI_BUILD_PROFILE: local-desktop");
    assert.include(rehearsalJob, 'CSC_IDENTITY_AUTO_DISCOVERY: "false"');
    assert.include(rehearsalJob, "rust_target: aarch64-apple-darwin");
    assert.include(rehearsalJob, "rust_target: x86_64-apple-darwin");
    assert.include(rehearsalJob, "uses: dtolnay/rust-toolchain@stable");
    assert.include(rehearsalJob, "--platform mac");
    assert.include(rehearsalJob, "--target dmg");
    assert.include(rehearsalJob, "-name '*.yml'");
    assert.notInclude(rehearsalJob, "actions/upload-artifact");
    assert.notInclude(rehearsalJob, "softprops/action-gh-release");
    assert.notInclude(rehearsalJob, "--signed");
    assert.include(releaseWorkflow, "#   platform: linux");
    assert.include(releaseWorkflow, "#   platform: win");
    assert.include(
      releaseWorkflow,
      "check_changes:\n    name: Check for changes since last nightly\n    if: ${{ false }}",
    );
    assert.include(
      releaseWorkflow,
      "preflight:\n    name: Preflight\n    needs: [check_changes]\n    if: ${{ false }}",
    );
    assert.include(
      releaseWorkflow,
      "relay_public_config:\n    name: Resolve T3 Connect public config\n    needs: preflight\n    if: ${{ false }}",
    );
    assert.include(releaseWorkflow, "build_wsl_node_pty:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "publish_cli:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "deploy_web:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "finalize:\n    if: ${{ false }}");
    assert.include(releaseWorkflow, "announce_discord:\n    if: ${{ false }}");
    assert.include(buildJob, "if: ${{ false }}");
    assert.include(buildJob, "needs: [preflight, relay_public_config]");
    assert.include(
      releaseWorkflow,
      "release:\n    name: Publish GitHub Release\n    needs: [preflight, build]\n    if: ${{ false }}",
    );
    assert.isFalse(
      NodeFS.existsSync(NodePath.join(repoRoot, ".github/workflows/deploy-marketing.yml")),
    );
  });
});
