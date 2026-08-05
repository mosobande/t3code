import { describe, expect, it } from "vite-plus/test";
import { promptClarificationDisabledReason } from "./promptClarification.logic";

describe("prompt clarification availability", () => {
  it("uses the exact non-text reason", () => {
    expect(
      promptClarificationDisabledReason({
        text: "  ",
        supportsCapability: true,
        environmentAvailable: true,
        selectionValid: true,
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
        selectionValid: true,
        phase,
      }),
    ).toBe(reason);
  });

  it.each([
    [
      { supportsCapability: false, environmentAvailable: true, selectionValid: true },
      "Prompt clarification requires a newer server",
    ],
    [
      { supportsCapability: true, environmentAvailable: false, selectionValid: true },
      "Environment unavailable",
    ],
    [
      { supportsCapability: true, environmentAvailable: true, selectionValid: false },
      "Configured Clarify provider or model is unavailable",
    ],
  ])("reports strict availability facts", (availability, reason) => {
    expect(
      promptClarificationDisabledReason({ text: "draft", phase: "idle", ...availability }),
    ).toBe(reason);
  });
});
