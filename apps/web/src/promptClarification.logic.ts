import type { ModelSelection, ScopedThreadRef, ServerProvider } from "@t3tools/contracts";
import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import {
  ensureInlineTerminalContextPlaceholders,
  stripInlineTerminalContextPlaceholders,
} from "./lib/terminalContext";

export function promptClarificationDraftKey(
  scope:
    | { readonly routeKind: "server"; readonly threadRef: ScopedThreadRef }
    | { readonly routeKind: "draft"; readonly draftId: string },
): string {
  return scope.routeKind === "server"
    ? `server:${scopedThreadKey(scope.threadRef)}`
    : `draft:${scope.draftId}`;
}

/** Provider input contains only text the user can see, never editor placeholder markers. */
export function promptClarificationRequestText(prompt: string): string {
  return stripInlineTerminalContextPlaceholders(prompt);
}

/** Reattach the current terminal-context chips without changing their stored data or order. */
export function promptClarificationResultText(text: string, terminalContextCount: number): string {
  return ensureInlineTerminalContextPlaceholders(text, terminalContextCount);
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
  if (!provider.models.some((model) => model.slug === input.selection.model)) {
    return "Configured Clarify model is stale";
  }
  return null;
}

export function promptClarificationDisabledReason(input: {
  readonly text: string;
  readonly supportsCapability: boolean;
  readonly environmentAvailable: boolean;
  /** Exact scoped selection fact from the environment caller. */
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
