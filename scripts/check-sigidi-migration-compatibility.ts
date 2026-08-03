// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - This deterministic verifier reads committed Git blobs and the lockfile synchronously.
import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import { sigidiUpstreamCompatibility } from "@t3tools/shared/sigidiMigrationCompatibility";

import { checkSigidiMigrationCompatibility } from "./lib/sigidi-migration-compatibility.ts";

const revisionIndex = process.argv.indexOf("--revision");
const revision = revisionIndex === -1 ? "HEAD" : process.argv[revisionIndex + 1];
if (!revision) throw new Error("--revision requires a Git revision");

const repositoryRoot = NodeChildProcess.execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const readGitBlob = (gitRevision: string, sourcePath: string) =>
  NodeChildProcess.execFileSync("git", ["cat-file", "blob", `${gitRevision}:${sourcePath}`], {
    cwd: repositoryRoot,
  });

const migrationRegistry = readGitBlob(
  revision,
  "apps/server/src/persistence/Migrations.ts",
).toString("utf8");
const currentManifest = Array.from(
  migrationRegistry.matchAll(/^\s*\[(\d+),\s*"([^"]+)",\s*Migration\d+\],$/gm),
  (match) => [Number(match[1]), match[2] ?? ""] as const,
);
if (currentManifest.length === 0) {
  throw new Error(`Could not read the upstream migration manifest at ${revision}`);
}

const readEffectEngine = (gitRevision: string) => {
  const lockfile = readGitBlob(gitRevision, "pnpm-lock.yaml").toString("utf8");
  const version = lockfile.match(/^  effect:\s+([^\s]+)$/m)?.[1];
  const patchHash = lockfile.match(/^  effect@[^:]+:\s+([a-f0-9]{64})$/m)?.[1];
  if (!version || !patchHash) {
    throw new Error(
      `Could not resolve the Effect version and patch hash from pnpm-lock.yaml at ${gitRevision}`,
    );
  }
  return { version, patchHash };
};

try {
  NodeChildProcess.execFileSync(
    "git",
    ["merge-base", "--is-ancestor", sigidiUpstreamCompatibility.testedUpstreamCommit, revision],
    { cwd: repositoryRoot, stdio: "ignore" },
  );
} catch {
  throw new Error(
    `Pinned upstream ${sigidiUpstreamCompatibility.testedUpstreamCommit} is not an ancestor of ${revision}`,
  );
}

const currentSourceHashes = new Map<string, string>();
const pinnedSourceHashes = new Map<string, string>();
for (const migration of sigidiUpstreamCompatibility.migrations) {
  const source = readGitBlob(revision, migration.sourcePath);
  currentSourceHashes.set(
    migration.sourcePath,
    NodeCrypto.createHash("sha256").update(source).digest("hex"),
  );
  const pinnedSource = readGitBlob(
    sigidiUpstreamCompatibility.testedUpstreamCommit,
    migration.sourcePath,
  );
  pinnedSourceHashes.set(
    migration.sourcePath,
    NodeCrypto.createHash("sha256").update(pinnedSource).digest("hex"),
  );
}

const issues = checkSigidiMigrationCompatibility({
  record: sigidiUpstreamCompatibility,
  currentManifest,
  currentSourceHashes,
  pinnedSourceHashes,
  currentEffectEngine: readEffectEngine(revision),
  pinnedEffectEngine: readEffectEngine(sigidiUpstreamCompatibility.testedUpstreamCommit),
});

if (issues.length > 0) {
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(
    `SIGIDI migration compatibility verified at ${revision} against upstream ${sigidiUpstreamCompatibility.testedUpstreamCommit}.`,
  );
}
