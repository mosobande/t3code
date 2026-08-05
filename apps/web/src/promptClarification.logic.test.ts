import { describe, expect, it } from "vite-plus/test";
import { promptClarificationDisabledReason } from "./promptClarification.logic";

describe("prompt clarification availability", () => {
  it("uses the exact non-text reason", () => {
    expect(
      promptClarificationDisabledReason({
        text: "  ",
        supportsCapability: true,
        environmentAvailable: true,
        selectionUnavailableReason: null,
        phase: "idle",
      }),
    ).toBe("Enter text to clarify");
  });
  it.each([
    ["approval", "Resolve the approval before clarifying"],
    ["pending-input", "Complete the requested input before clarifying"],
    ["running", "Wait for the running turn before clarifying"],
    ["plan-follow-up", "Finish the plan follow-up before clarifying"],
  ] as const)("uses the exact %s reason", (phase, reason) => {
    expect(
      promptClarificationDisabledReason({
        text: "draft",
        supportsCapability: true,
        environmentAvailable: true,
        selectionUnavailableReason: null,
        phase,
      }),
    ).toBe(reason);
  });

  it.each([
    [
      { supportsCapability: false, environmentAvailable: true, selectionUnavailableReason: null },
      "Prompt clarification requires a newer server",
    ],
    [
      { supportsCapability: true, environmentAvailable: false, selectionUnavailableReason: null },
      "Environment unavailable",
    ],
    [
      {
        supportsCapability: true,
        environmentAvailable: true,
        selectionUnavailableReason: "The selected Clarify model is disabled",
      },
      "The selected Clarify model is disabled",
    ],
    [
      {
        supportsCapability: true,
        environmentAvailable: true,
        selectionUnavailableReason: "The selected Clarify provider is stale",
      },
      "The selected Clarify provider is stale",
    ],
  ])("reports strict availability facts", (availability, reason) => {
    expect(
      promptClarificationDisabledReason({ text: "draft", phase: "idle", ...availability }),
    ).toBe(reason);
  });
});
