// @effect-diagnostics nodeBuiltinImport:off - validates the tracked no-publish GitHub workflow through the Node filesystem boundary.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { assert, describe, it } from "@effect/vitest";

const repoRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const releaseWorkflow = NodeFS.readFileSync(
  NodePath.join(repoRoot, ".github/workflows/release.yml"),
  "utf8",
);
const workspaceConfig = NodeFS.readFileSync(NodePath.join(repoRoot, "pnpm-workspace.yaml"), "utf8");
const rootPackage = JSON.parse(NodeFS.readFileSync(NodePath.join(repoRoot, "package.json"), "utf8")) as {
  readonly scripts: Readonly<Record<string, string>>;
};
const projectFile = NodeFS.readFileSync(NodePath.join(repoRoot, "t3.json"), "utf8");
const ciWorkflow = NodeFS.readFileSync(NodePath.join(repoRoot, ".github/workflows/ci.yml"), "utf8");

describe("desktop release rehearsal workflow", () => {
  it("builds only unsigned macOS artifacts without an external write path", () => {
    assert.include(releaseWorkflow, "name: Desktop Release Rehearsal");
    assert.include(releaseWorkflow, "contents: read");
    assert.include(releaseWorkflow, "rehearse:");
    assert.include(releaseWorkflow, "arch: [arm64, x64]");
    assert.include(releaseWorkflow, "--platform mac");
    assert.include(releaseWorkflow, "--target dmg");
    assert.include(releaseWorkflow, "--arch \"${{ matrix.arch }}\"");
    assert.include(releaseWorkflow, "vp run release:smoke");
    assert.notInclude(releaseWorkflow, "tags:");
    assert.notInclude(releaseWorkflow, "schedule:");
    assert.notInclude(releaseWorkflow, "workflow_dispatch:");
    assert.notInclude(releaseWorkflow, "contents: write");
    assert.notInclude(releaseWorkflow, "action-gh-release");
    assert.notInclude(releaseWorkflow, "relay_public_config");
    assert.notInclude(releaseWorkflow, "t3code-relay");
    assert.notInclude(releaseWorkflow, "CLOUDFLARE_");
    assert.notInclude(releaseWorkflow, "CLERK_");
    assert.notInclude(releaseWorkflow, "AXIOM_");
    assert.notInclude(releaseWorkflow, "T3CODE_RELAY");
    assert.notInclude(releaseWorkflow, "--signed");
    assert.notInclude(releaseWorkflow, "notari");
    assert.notInclude(releaseWorkflow, "platform linux");
    assert.notInclude(releaseWorkflow, "platform win");
    assert.notInclude(releaseWorkflow, "AppImage");
    assert.notInclude(releaseWorkflow, "nsis");
    assert.notInclude(releaseWorkflow, "vercel");
    assert.notInclude(releaseWorkflow, "npm publish");
  });

  it("has no deferred deploy workflow", () => {
    for (const workflow of [
      "deploy-relay.yml",
      "mobile-eas-preview.yml",
      "mobile-eas-production.yml",
      "mobile-showcase-screenshots.yml",
    ]) {
      assert.isFalse(NodeFS.existsSync(NodePath.join(repoRoot, ".github/workflows", workflow)));
    }
  });

  it("keeps deferred deployables outside the default workspace and command graph", () => {
    assert.include(workspaceConfig, "  - apps/desktop");
    assert.include(workspaceConfig, "  - apps/marketing");
    assert.include(workspaceConfig, "  - apps/server");
    assert.include(workspaceConfig, "  - apps/web");
    assert.notInclude(workspaceConfig, "  - apps/*");
    assert.notInclude(workspaceConfig, "  - infra/*");
    assert.notInclude(workspaceConfig, "apps/mobile");
    assert.notInclude(workspaceConfig, "infra/relay");
    assert.notProperty(rootPackage.scripts, "dev:share");
    assert.notProperty(rootPackage.scripts, "screenshots:mobile");
    assert.notProperty(rootPackage.scripts, "lint:mobile");
    assert.notProperty(rootPackage.scripts, "dist:desktop:linux");
    assert.notProperty(rootPackage.scripts, "dist:desktop:win");
    assert.notProperty(rootPackage.scripts, "dist:desktop:win:arm64");
    assert.notProperty(rootPackage.scripts, "dist:desktop:win:x64");
    assert.notProperty(rootPackage.scripts, "connect:announce-ga");
    assert.notInclude(rootPackage.scripts.build, "./apps/*");
    assert.notInclude(projectFile, "infra/relay");
    assert.notInclude(ciWorkflow, "mobile_native_static_analysis");
    assert.notInclude(ciWorkflow, "apps/mobile/Brewfile");
  });
});
