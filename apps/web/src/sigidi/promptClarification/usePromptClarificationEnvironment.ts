import type { EnvironmentId, ModelSelection, ServerProvider } from "@t3tools/contracts";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { useMemo } from "react";

import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { promptClarificationSelectionUnavailableReason } from "./logic";
import type { PromptClarificationEnvironmentBinding } from "./types";

export function usePromptClarificationEnvironment(input: {
  readonly environmentId: EnvironmentId;
  readonly supportsCapability: boolean;
  readonly environmentAvailable: boolean;
  readonly selection: ModelSelection;
  readonly providers: ReadonlyArray<ServerProvider>;
}): PromptClarificationEnvironmentBinding {
  const rewriteCommand = useAtomCommand(serverEnvironment.promptClarificationRewrite, {
    reportFailure: false,
  });

  return useMemo(
    () => ({
      supportsCapability: input.supportsCapability,
      environmentAvailable: input.environmentAvailable,
      selectionUnavailableReason: promptClarificationSelectionUnavailableReason({
        selection: input.selection,
        providers: input.providers,
      }),
      rewrite: async (request) => {
        const result = await rewriteCommand({
          environmentId: request.environmentId,
          input: { draftKey: request.draftKey, text: request.text },
        });
        if (result._tag === "Success") return result.value;
        throw squashAtomCommandFailure(result);
      },
    }),
    [
      input.environmentAvailable,
      input.providers,
      input.selection,
      input.supportsCapability,
      rewriteCommand,
    ],
  );
}
