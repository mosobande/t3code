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
  it("keeps special composer states unavailable", () => {
    expect(
      promptClarificationDisabledReason({
        text: "draft",
        supportsCapability: true,
        environmentAvailable: true,
        selectionValid: true,
        phase: "running",
      }),
    ).toBe("Clarify is available only for an idle draft");
  });
});
