import { SIGIDI_CLI_PACKAGE_NAME } from "@t3tools/shared/productProfile";

export interface CliPublishIdentity {
  readonly name: string;
  readonly repository: {
    readonly type: string;
    readonly url: string;
    readonly directory: string;
  };
  readonly bin: Readonly<Record<string, string>>;
}

export interface PublishCommandConfig {
  readonly access: string;
  readonly tag: string;
  readonly provenance: boolean;
  readonly dryRun: boolean;
}

export const resolveSigidiCliPublishMetadata = (source: CliPublishIdentity, version: string) => ({
  name: SIGIDI_CLI_PACKAGE_NAME,
  repository: {
    type: source.repository.type,
    url: "https://github.com/quantipixels/sigidi",
    directory: source.repository.directory,
  },
  bin: source.bin,
  version,
});

export const createVpPmPublishArgs = (config: PublishCommandConfig): ReadonlyArray<string> => {
  const args = [
    "publish",
    "--filter",
    "./apps/server",
    "--access",
    config.access,
    "--tag",
    config.tag,
    "--no-git-checks",
  ];

  if (config.provenance) args.push("--provenance");
  if (config.dryRun) args.push("--dry-run");

  return args;
};
