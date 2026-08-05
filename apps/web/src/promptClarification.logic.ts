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
  if (input.text.trim().length === 0) return "Enter text to clarify";
  if (input.phase === "approval") return "Resolve the approval before clarifying";
  if (input.phase === "pending-input") {
    return "Complete the requested input before clarifying";
  }
  if (input.phase === "running") return "Wait for the running turn before clarifying";
  if (input.phase === "plan-follow-up") return "Finish the plan follow-up before clarifying";
  return null;
}
