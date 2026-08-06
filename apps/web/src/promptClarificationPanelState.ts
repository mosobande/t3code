import type {
  PromptClarificationRewriteResult,
  PromptClarificationSnapshot,
} from "@t3tools/client-runtime/promptClarification";

/**
 * Ephemeral composer-owned state rendered by the singleton right-panel surface.
 * It intentionally contains no persisted data.
 */
export interface PromptClarificationPanelState {
  readonly currentDraft: string;
  /** Monotonic draft revision catches an edit that returns to the same text. */
  readonly draftChanged: boolean;
  readonly requestSnapshot: PromptClarificationSnapshot | null;
  readonly result: PromptClarificationRewriteResult | null;
  readonly isRunning: boolean;
  readonly disabledReason: string | null;
  readonly onReplace: () => void;
  readonly onClarifyAgain: () => void;
  readonly onCancel: () => void;
  readonly onDiscard: () => void;
}
