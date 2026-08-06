import { describe, expect, it } from "vite-plus/test";
import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
  type ServerProvider,
} from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import {
  createPromptClarificationController,
  type PromptClarificationRewriteResult,
} from "@t3tools/client-runtime/promptClarification";
import {
  promptClarificationDisabledReason,
  promptClarificationDraftChanged,
  promptClarificationDraftKey,
  promptClarificationRequestText,
  promptClarificationResultText,
  promptClarificationSelectionUnavailableReason,
} from "./promptClarification.logic";
import { INLINE_TERMINAL_CONTEXT_PLACEHOLDER } from "./lib/terminalContext";

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
  it("marks an A to B to A edit as changed by revision", () => {
    expect(
      promptClarificationDraftChanged(
        { environmentId: "env", draftKey: "draft", text: "A", revision: 1 },
        { environmentId: "env", draftKey: "draft", text: "A", revision: 3 },
      ),
    ).toBe(true);
  });

  it("sends visible text and restores every terminal-context placeholder", () => {
    const requestText = promptClarificationRequestText(
      `Inspect ${INLINE_TERMINAL_CONTEXT_PLACEHOLDER} then ${INLINE_TERMINAL_CONTEXT_PLACEHOLDER}`,
    );
    expect(requestText).toBe("Inspect  then ");

    const resultText = promptClarificationResultText(
      `Inspect${INLINE_TERMINAL_CONTEXT_PLACEHOLDER} both terminals`,
      2,
    );
    expect(promptClarificationRequestText(resultText)).toBe("Inspect both terminals");
    expect(
      [...resultText].filter((character) => character === INLINE_TERMINAL_CONTEXT_PLACEHOLDER),
    ).toHaveLength(2);
  });

  it("isolates same-environment server threads and abandons a late result", async () => {
    const environmentId = EnvironmentId.make("env");
    const threadAKey = promptClarificationDraftKey({
      routeKind: "server",
      threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-a")),
    });
    const threadBKey = promptClarificationDraftKey({
      routeKind: "server",
      threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-b")),
    });
    expect(threadAKey).not.toBe(threadBKey);

    let resolve!: (result: PromptClarificationRewriteResult) => void;
    const resultA = new Promise<PromptClarificationRewriteResult>((nextResolve) => {
      resolve = nextResolve;
    });
    const resultB = new Promise<PromptClarificationRewriteResult>(() => {});
    let rewriteIndex = 0;
    let current = {
      environmentId: String(environmentId),
      draftKey: threadAKey,
      text: "rough",
      revision: 0,
    };
    const offered: string[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => (rewriteIndex++ === 0 ? resultA : resultB),
      offerReview: (rewrite) => offered.push(rewrite.text),
    });

    expect(controller.start(current)).toBe(true);
    controller.invalidate(current);
    current = { ...current, draftKey: threadBKey };
    expect(controller.start(current)).toBe(true);
    resolve({
      text: "clarified A",
      providerInstanceId: ProviderInstanceId.make("codex"),
      model: "gpt-5",
    });
    await Promise.resolve();

    expect(offered).toEqual([]);
  });

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

  it("rejects expired terminal-context placeholders without text", () => {
    expect(
      promptClarificationDisabledReason({
        text: " \uFFFC ",
        supportsCapability: true,
        environmentAvailable: true,
        selectionUnavailableReason: null,
        phase: "idle",
      }),
    ).toBe("Enter text to clarify");
  });

  it("allows text alongside terminal-context placeholders", () => {
    expect(
      promptClarificationDisabledReason({
        text: "Rewrite this \uFFFC",
        supportsCapability: true,
        environmentAvailable: true,
        selectionUnavailableReason: null,
        phase: "idle",
      }),
    ).toBeNull();
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
