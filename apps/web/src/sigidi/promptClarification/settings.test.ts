import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";

import {
  promptClarificationRestoreContribution,
  resolvePromptClarificationSettingsUnavailableReason,
} from "./settings";

describe("prompt clarification settings", () => {
  it.each([
    [true, "primary", "primary", null],
    [true, "remote", "primary", "Configure this environment from a client where it is primary"],
    [false, "primary", "primary", "Prompt clarification requires a newer server"],
    [false, "remote", "primary", "Configure this environment from a client where it is primary"],
  ] as const)(
    "preserves the environment and capability policy",
    (supportsCapability, settingsContextEnvironmentId, primaryEnvironmentId, expected) => {
      expect(
        resolvePromptClarificationSettingsUnavailableReason({
          supportsCapability,
          settingsContextEnvironmentId,
          primaryEnvironmentId,
        }),
      ).toBe(expected);
    },
  );

  it("contributes the Clarify label and default patch only while editable and dirty", () => {
    const dirtySettings = {
      ...DEFAULT_UNIFIED_SETTINGS,
      promptClarificationModelSelection: {
        ...DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection,
        model: "different-model",
      },
    };

    expect(promptClarificationRestoreContribution(dirtySettings, null)).toEqual({
      changedLabel: "Clarify model",
      patch: {
        promptClarificationModelSelection:
          DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection,
      },
    });
    expect(
      promptClarificationRestoreContribution(
        dirtySettings,
        "Configure this environment from a client where it is primary",
      ),
    ).toEqual({ changedLabel: null, patch: {} });
    expect(promptClarificationRestoreContribution(DEFAULT_UNIFIED_SETTINGS, null)).toEqual({
      changedLabel: null,
      patch: {
        promptClarificationModelSelection:
          DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection,
      },
    });
  });
});
