// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { describe, expect, it } from "vite-plus/test";

interface ProjectPackage {
  readonly engines: {
    readonly node: string;
  };
  readonly packageManager: string;
}

interface DevContainerConfig {
  readonly name: string;
  readonly features: Record<string, Record<string, unknown>>;
  readonly mounts?: ReadonlyArray<string>;
  readonly postCreateCommand: Record<string, string>;
}

describe("devcontainer", () => {
  const repositoryRoot = NodePath.resolve(import.meta.dirname, "..");
  const projectPackage = JSON.parse(
    NodeFS.readFileSync(NodePath.join(repositoryRoot, "package.json"), "utf8"),
  ) as ProjectPackage;
  const config = JSON.parse(
    NodeFS.readFileSync(
      NodePath.join(repositoryRoot, ".devcontainer", "devcontainer.json"),
      "utf8",
    ),
  ) as DevContainerConfig;

  it("installs the desktop stack with its pinned Node and PNPM versions", () => {
    const nodeVersion = projectPackage.engines.node.replace(/^\^/, "");
    const pnpmVersion = projectPackage.packageManager.replace(/^pnpm@/, "");

    expect(config.features["ghcr.io/devcontainers/features/node:1"]).toMatchObject({
      version: nodeVersion,
      pnpmVersion,
    });
    expect(config.postCreateCommand).toEqual({
      "pnpm-install":
        "NODE_OPTIONS=--max-old-space-size=1536 pnpm install --frozen-lockfile --filter . --filter t3... --filter @t3tools/desktop... --store-dir /pnpm/store --child-concurrency=2 --network-concurrency=8",
    });
  });

  it("uses the operating system Python for native Node modules", () => {
    expect(config.features["ghcr.io/devcontainers/features/python:1"]).toEqual({
      version: "os-provided",
      installTools: false,
    });
  });

  it("keeps Linux dependencies outside the host checkout", () => {
    expect(config.mounts).toContain(
      "source=${devcontainerId}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume",
    );
    expect(config.mounts).toContain(
      "source=${devcontainerId}-pnpm-store,target=/pnpm/store,type=volume",
    );
  });

  it("uses the SIGIDI development name", () => {
    expect(config.name).toBe("SIGIDI Dev");
  });
});
