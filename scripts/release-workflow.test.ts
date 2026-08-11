// @effect-diagnostics nodeBuiltinImport:off - validates tracked GitHub workflow files through the Node filesystem boundary.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { assert, describe, it } from "@effect/vitest";
import { fromYaml } from "@t3tools/shared/schemaYaml";
import * as Schema from "effect/Schema";

const WorkflowStep = Schema.Struct({
  name: Schema.String,
  run: Schema.optionalKey(Schema.String),
  uses: Schema.optionalKey(Schema.String),
  with: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
});
const WorkflowJob = Schema.Struct({
  name: Schema.String,
  needs: Schema.optionalKey(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
  if: Schema.optionalKey(Schema.String),
  "runs-on": Schema.optionalKey(Schema.String),
  environment: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Struct({ name: Schema.String })]),
  ),
  permissions: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  env: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  strategy: Schema.optionalKey(
    Schema.Struct({
      matrix: Schema.Struct({
        include: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
      }),
    }),
  ),
  steps: Schema.Array(WorkflowStep),
});
const ReleaseWorkflow = Schema.Struct({
  on: Schema.Struct({
    push: Schema.Struct({ tags: Schema.Array(Schema.String) }),
    pull_request: Schema.Null,
  }),
  permissions: Schema.Record(Schema.String, Schema.String),
  jobs: Schema.Record(Schema.String, WorkflowJob),
});

const repoRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const releaseWorkflowSource = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/release.yml"),
  "utf8",
);
const mobileProductionWorkflowSource = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/mobile-eas-production.yml"),
  "utf8",
);
const mobileFingerprintWorkflowSource = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/mobile-fingerprint-check.yml"),
  "utf8",
);
const webPreviewWorkflowSource = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/web-preview.yml"),
  "utf8",
);
const releaseWorkflow = Schema.decodeUnknownSync(fromYaml(ReleaseWorkflow))(releaseWorkflowSource);

const workflowJob = (name: string) => {
  const job = releaseWorkflow.jobs[name];
  assert.isDefined(job, `missing workflow job ${name}`);
  return job;
};

const workflowStep = (jobName: string, stepName: string) => {
  const step = workflowJob(jobName).steps.find((candidate) => candidate.name === stepName);
  assert.isDefined(step, `missing workflow step ${jobName}/${stepName}`);
  return step;
};

describe("release workflow", () => {
  it("maps rehearsal, nightly, and stable inputs to product-build metadata", () => {
    const metadataScript = workflowStep("release_metadata", "Resolve channel and version").run;
    const rehearsalJob = workflowJob("rehearse");
    const rehearsalBuild = workflowStep("rehearse", "Build unsigned local desktop artifact").run;

    assert.include(metadataScript, "channel=rehearsal");
    assert.include(metadataScript, "channel=nightly");
    assert.include(metadataScript, "channel=stable");
    assert.include(metadataScript, "-nightly.");
    assert.include(metadataScript, "Invalid SIGIDI release tag");
    assert.equal(rehearsalJob.needs, "release_metadata");
    assert.equal(rehearsalJob.env?.SIGIDI_BUILD_PROFILE, "local");
    assert.equal(rehearsalJob.env?.CSC_IDENTITY_AUTO_DISCOVERY, "false");
    assert.include(
      rehearsalBuild,
      '--build-version "${{ needs.release_metadata.outputs.version }}"',
    );
    assert.include(rehearsalBuild, "sigidi-${{ needs.release_metadata.outputs.channel }}");
  });

  it("keeps the release event and inherited publication jobs constrained", () => {
    assert.deepEqual(releaseWorkflow.on.push.tags, ["v*.*.*"]);
    assert.isNull(releaseWorkflow.on.pull_request);
    assert.deepEqual(releaseWorkflow.permissions, { contents: "read", "id-token": "none" });

    for (const name of [
      "check_changes",
      "preflight",
      "relay_public_config",
      "build_wsl_node_pty",
      "build",
      "deploy_web",
      "release",
      "finalize",
      "announce_discord",
    ]) {
      assert.equal(workflowJob(name).if, "${{ false }}", `${name} must remain disabled`);
    }

    assert.include(releaseWorkflowSource, "#   platform: linux");
    assert.include(releaseWorkflowSource, "#   platform: win");
    assert.isFalse(
      NodeFS.existsSync(NodePath.join(repoRoot, ".github/workflows/deploy-marketing.yml")),
    );
  });

  it("keeps inherited mobile and hosted-web workflows source-only", () => {
    assert.include(mobileProductionWorkflowSource, "jobs:\n  production:\n");
    assert.include(mobileProductionWorkflowSource, "    if: ${{ false }}\n");
    assert.include(mobileFingerprintWorkflowSource, "jobs:\n  fingerprint:\n");
    assert.include(mobileFingerprintWorkflowSource, "    if: ${{ false }}\n");
    assert.include(webPreviewWorkflowSource, "    if: >-\n      false &&\n");
  });

  it("builds locked CLI resources and isolates npm publication", () => {
    const resourceJob = workflowJob("build_cli_resource_monitors");
    const resourceKeys = resourceJob.strategy?.matrix.include.map((row) => row.resource_key);
    const runners = resourceJob.strategy?.matrix.include.map((row) => row.runner);
    const resourceBuild = workflowStep("build_cli_resource_monitors", "Build resource monitor").run;
    const publishJob = workflowJob("publish_cli");
    const setupPublish = workflowStep("publish_cli", "Setup Vite+").with;
    const publishCommand = workflowStep("publish_cli", "Publish CLI package").run;

    assert.equal(resourceJob.if, "github.event_name == 'push'");
    assert.deepEqual(resourceKeys, ["darwin-arm64", "darwin-x64", "linux-x64", "win32-x64"]);
    assert.deepEqual(runners, ["macos-15", "macos-15", "ubuntu-latest", "windows-2025"]);
    assert.include(resourceBuild, "cargo build \\\n  --locked \\\n");
    assert.deepEqual(publishJob.needs, [
      "release_metadata",
      "rehearse",
      "build_cli_resource_monitors",
    ]);
    assert.equal(publishJob.if, "github.event_name == 'push'");
    assert.deepEqual(publishJob.environment, { name: "npm" });
    assert.deepEqual(publishJob.permissions, { contents: "read", "id-token": "write" });
    assert.equal(publishJob.env?.SIGIDI_BUILD_PROFILE, "local");
    assert.include(String(setupPublish?.["run-install"]), "--filter=t3...");
    assert.include(String(setupPublish?.["run-install"]), "--filter=@t3tools/web...");
    assert.include(publishCommand, "apps/server/scripts/cli.ts publish");
    assert.notProperty(publishJob.env ?? {}, "T3CODE_CLERK");
    assert.notProperty(publishJob.env ?? {}, "T3CODE_RELAY");
    assert.notProperty(publishJob.env ?? {}, "AXIOM");
  });
});
