import type { ModelSelection, ScopedThreadRef, ServerProvider } from "@t3tools/contracts";
import { scopedThreadKey } from "@t3tools/client-runtime/environment";

import {
  countInlineTerminalContextPlaceholders,
  ensureInlineTerminalContextPlaceholders,
  stripInlineTerminalContextPlaceholders,
} from "../../lib/terminalContext";
import type { PromptClarificationSnapshot } from "./controller";
import type { SessionPhase } from "../../types";

/** A local draft has no provider session yet, so its disconnected phase is expected. */
export function promptClarificationSessionDisconnected(input: {
  readonly isServerThread: boolean;
  readonly phase: SessionPhase;
}): boolean {
  return input.isServerThread && input.phase === "disconnected";
}

export function promptClarificationDraftKey(
  scope:
    | { readonly routeKind: "server"; readonly threadRef: ScopedThreadRef }
    | { readonly routeKind: "draft"; readonly draftId: string },
): string {
  return scope.routeKind === "server"
    ? `server:${scopedThreadKey(scope.threadRef)}`
    : `draft:${scope.draftId}`;
}

/** Provider input contains only visible text, never editor placeholder markers. */
export function promptClarificationRequestText(prompt: string): string {
  return stripInlineTerminalContextPlaceholders(prompt);
}

/** Reattach the current terminal-context chips without changing their stored data or order. */
export function promptClarificationResultText(text: string, terminalContextCount: number): string {
  return ensureInlineTerminalContextPlaceholders(
    stripInlineTerminalContextPlaceholders(text),
    terminalContextCount,
  );
}

/** A revision comparison rejects stale results even when text returns to A after A to B. */
export function promptClarificationDraftChanged(
  request: PromptClarificationSnapshot,
  current: PromptClarificationSnapshot,
): boolean {
  return (
    request.environmentId !== current.environmentId ||
    request.draftKey !== current.draftKey ||
    request.revision !== current.revision ||
    request.text !== current.text
  );
}

/** Return the direct replacement only while the captured draft still owns the result. */
export function promptClarificationReplacementText(input: {
  readonly request: PromptClarificationSnapshot;
  readonly current: PromptClarificationSnapshot;
  readonly resultText: string;
}): string | null {
  if (promptClarificationDraftChanged(input.request, input.current)) return null;
  return promptClarificationResultText(
    input.resultText,
    countInlineTerminalContextPlaceholders(input.current.text),
  );
}

/** Clarify never reroutes to another provider or model. */
export function promptClarificationSelectionUnavailableReason(input: {
  readonly selection: ModelSelection;
  readonly providers: ReadonlyArray<ServerProvider>;
}): string | null {
  const provider = input.providers.find(
    (candidate) => candidate.instanceId === input.selection.instanceId,
  );
  if (!provider) return "Configured Clarify provider is missing";
  if (!provider.enabled || provider.status === "disabled") {
    return "Configured Clarify provider is disabled";
  }
  if (!provider.installed) return "Configured Clarify provider is unavailable";
  if (provider.availability === "unavailable") {
    return "Configured Clarify provider is unavailable";
  }
  if (provider.status !== "ready") return "Configured Clarify provider is stale";
  return null;
}

export function promptClarificationDisabledReason(input: {
  readonly text: string;
  readonly supportsCapability: boolean;
  readonly environmentAvailable: boolean;
  readonly selectionUnavailableReason: string | null;
  readonly phase: "idle" | "approval" | "pending-input" | "running" | "plan-follow-up";
}): string | null {
  if (!input.supportsCapability) return "Prompt clarification requires a newer server";
  if (!input.environmentAvailable) return "Environment unavailable";
  if (input.selectionUnavailableReason !== null) return input.selectionUnavailableReason;
  if (promptClarificationRequestText(input.text).trim().length === 0) {
    return "Enter text to clarify";
  }
  if (input.phase === "approval") return "Resolve the approval before clarifying";
  if (input.phase === "pending-input") {
    return "Complete the requested input before clarifying";
  }
  if (input.phase === "running") return "Wait for the running turn before clarifying";
  if (input.phase === "plan-follow-up") return "Finish the plan follow-up before clarifying";
  return null;
}
