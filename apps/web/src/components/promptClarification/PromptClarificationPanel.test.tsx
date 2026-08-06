import { ProviderInstanceId } from "@t3tools/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import type { PromptClarificationPanelState } from "~/promptClarificationPanelState";
import { PromptClarificationPanel } from "./PromptClarificationPanel";

const panelState = (
  overrides: Partial<PromptClarificationPanelState> = {},
): PromptClarificationPanelState => ({
  currentDraft: "Build a focused feature.",
  draftChanged: false,
  result: null,
  isRunning: false,
  disabledReason: null,
  onReplace: vi.fn(),
  onClarifyAgain: vi.fn(),
  onCancel: vi.fn(),
  onDiscard: vi.fn(),
  ...overrides,
});

describe("PromptClarificationPanel", () => {
  it("renders a running review without exposing replacement actions", () => {
    const markup = renderToStaticMarkup(
      <PromptClarificationPanel state={panelState({ isRunning: true })} />,
    );

    expect(markup).toContain("Clarifying your draft…");
    expect(markup).toContain("Cancel");
    expect(markup).not.toContain("Replace current draft");
  });

  it("renders both selectable drafts and explicit review actions", () => {
    const markup = renderToStaticMarkup(
      <PromptClarificationPanel
        state={panelState({
          currentDraft: "Build the thing.",
          draftChanged: true,
          result: {
            text: "Build the focused Clarify panel.",
            providerInstanceId: ProviderInstanceId.make("codex-local"),
            model: "gpt-5.6-sol",
          },
        })}
      />,
    );

    expect(markup).toContain('aria-label="Current draft"');
    expect(markup).toContain('aria-label="Clarified draft"');
    expect(markup).toContain("Draft changed");
    expect(markup).toContain("Provider: codex-local · Model: gpt-5.6-sol");
    expect(markup).toContain("Replace current draft");
    expect(markup).toContain("Clarify again");
    expect(markup).toContain("Discard");
  });

  it("keeps the current draft visible when no rewrite is retained", () => {
    const markup = renderToStaticMarkup(
      <PromptClarificationPanel
        state={panelState({ disabledReason: "Enter text to clarify", currentDraft: "" })}
      />,
    );

    expect(markup).toContain('aria-label="Current draft"');
    expect(markup).toContain("Enter text to clarify");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("Clarified draft");
  });
});
