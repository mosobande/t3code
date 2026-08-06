import type { UnifiedSettings } from "@t3tools/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import * as Equal from "effect/Equal";

export function resolvePromptClarificationSettingsUnavailableReason(input: {
  readonly supportsCapability: boolean;
  readonly settingsContextEnvironmentId: string | null;
  readonly primaryEnvironmentId: string | null;
}): string | null {
  if (
    input.settingsContextEnvironmentId !== null &&
    input.settingsContextEnvironmentId !== input.primaryEnvironmentId
  ) {
    return "Configure this environment from a client where it is primary";
  }
  return input.supportsCapability ? null : "Prompt clarification requires a newer server";
}

export function promptClarificationRestoreContribution(
  settings: Pick<UnifiedSettings, "promptClarificationModelSelection">,
  unavailableReason: string | null,
): {
  readonly changedLabel: "Clarify model" | null;
  readonly patch: Partial<Pick<UnifiedSettings, "promptClarificationModelSelection">>;
} {
  if (unavailableReason !== null) return { changedLabel: null, patch: {} };

  const isDirty = !Equal.equals(
    settings.promptClarificationModelSelection ?? null,
    DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection ?? null,
  );
  return {
    changedLabel: isDirty ? "Clarify model" : null,
    patch: {
      promptClarificationModelSelection: DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection,
    },
  };
}
