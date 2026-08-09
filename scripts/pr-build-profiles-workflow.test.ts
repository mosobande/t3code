// @effect-diagnostics nodeBuiltinImport:off - validates tracked profile workflows through the Node filesystem boundary.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { assert, describe, it } from "@effect/vitest";

const repoRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const workflow = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/pr-build-profiles.yml"),
  "utf8",
);
const localWorkflow = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/ci.yml"),
  "utf8",
);
const labelWorkflow = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/issue-labels.yml"),
  "utf8",
);

describe("PR build profiles workflow", () => {
  it("defines explicit local and upstream profile labels", () => {
    assert.match(workflow, /workflow_dispatch:/u);
    assert.include(workflow, "github.event.label.name == 'ci:local'");
    assert.include(workflow, "contains(github.event.pull_request.labels.*.name, 'ci:upstream')");
    assert.include(
      workflow,
      "startsWith(github.event.head_commit.message, 'chore: sync latest T3 Code main')",
    );
    assert.include(workflow, "branches: [ori]");
    assert.notMatch(workflow, /tags:/u);
    assert.include(labelWorkflow, 'name: "ci:local"');
    assert.include(labelWorkflow, 'name: "ci:upstream"');
  });

  it("builds local by default and runs the full upstream suite only on demand", () => {
    assert.include(workflow, "SIGIDI_BUILD_PROFILE: local");
    assert.include(workflow, "run: vp run build:desktop");
    assert.include(workflow, "SIGIDI_BUILD_PROFILE: upstream");
    assert.include(workflow, "run: vp run test");
    assert.notMatch(workflow, /upload-artifact|release|deploy|publish|notari|sign/u);
  });

  it("keeps ordinary check and test jobs on the local profile", () => {
    assert.include(localWorkflow, "SIGIDI_BUILD_PROFILE: local");
    assert.notInclude(localWorkflow, "SIGIDI_BUILD_PROFILE: upstream");
  });
});
