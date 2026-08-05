import { describe, expect, it } from "vite-plus/test";
import { ProviderDriverKind, ProviderInstanceId, type ServerProvider } from "@t3tools/contracts";
import { promptClarificationDisabledReason } from "./promptClarification.logic";
import { promptClarificationSelectionUnavailableReason } from "./promptClarification.logic";

const provider = (overrides: Partial<ServerProvider> = {}): ServerProvider => ({
  instanceId: ProviderInstanceId.make("codex"),
  driver: ProviderDriverKind.make("codex"),
  enabled: true,
  installed: true,
  version: null,
  status: "ready",
  auth: { status: "authenticated" },
  checkedAt: "2026-08-05T00:00:00.000Z",
  models: [{ slug: "gpt-5", name: "GPT-5", isCustom: false, capabilities: null }],
  slashCommands: [],
  skills: [],
  ...overrides,
});

describe("prompt clarification availability", () => {
  it.each([
    [[], "Configured Clarify provider is missing"],
    [[provider({ enabled: false })], "Configured Clarify provider is disabled"],
    [[provider({ installed: false })], "Configured Clarify provider is unavailable"],
    [[provider({ status: "warning" })], "Configured Clarify provider is stale"],
    [[provider({ availability: "unavailable" })], "Configured Clarify provider is unavailable"],
    [[provider({ models: [] })], "Configured Clarify model is stale"],
  ] as const)("keeps the configured selection exact", (providers, expected) => {
    expect(
      promptClarificationSelectionUnavailableReason({
        selection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5" },
        providers,
      }),
    ).toBe(expected);
  });

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
