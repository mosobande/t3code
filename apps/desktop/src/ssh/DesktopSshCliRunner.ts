import type { DesktopUpdateChannel } from "@t3tools/contracts";
import { resolveRemoteT3CliPackageSpec } from "@t3tools/ssh/command";
import type { RemoteT3RunnerOptions } from "@t3tools/ssh/tunnel";

export function resolveDesktopSshCliRunner(input: {
  readonly appVersion: string;
  readonly updateChannel: DesktopUpdateChannel;
  readonly isDevelopment: boolean;
  readonly devRemoteEntryPath?: string;
  readonly nodeEngineRange: string;
}): RemoteT3RunnerOptions {
  if (input.isDevelopment && input.devRemoteEntryPath !== undefined) {
    return {
      nodeScriptPath: input.devRemoteEntryPath,
      nodeEngineRange: input.nodeEngineRange,
    };
  }

  return {
    packageSpec: resolveRemoteT3CliPackageSpec({
      appVersion: input.appVersion,
      updateChannel: input.updateChannel,
      isDevelopment: input.isDevelopment,
    }),
    nodeEngineRange: input.nodeEngineRange,
  };
}
