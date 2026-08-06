import type { EnvironmentId, PromptClarificationRewriteResult } from "@t3tools/contracts";

export interface PromptClarificationEnvironmentBinding {
  readonly supportsCapability: boolean;
  readonly environmentAvailable: boolean;
  readonly selectionUnavailableReason: string | null;
  readonly rewrite: (input: {
    readonly environmentId: EnvironmentId;
    readonly draftKey: string;
    readonly text: string;
  }) => Promise<PromptClarificationRewriteResult>;
}

export interface PromptClarificationComposerControl {
  readonly disabledReason: string | null;
  readonly isRunning: boolean;
  readonly onActivate: () => void;
}

export type PromptClarificationComposerPhase =
  | "idle"
  | "approval"
  | "pending-input"
  | "running"
  | "plan-follow-up";
