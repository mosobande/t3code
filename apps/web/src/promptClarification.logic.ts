export function promptClarificationDisabledReason(input: {
  readonly text: string;
  readonly supportsCapability: boolean;
  readonly environmentAvailable: boolean;
  readonly selectionValid: boolean;
  readonly phase: "idle" | "approval" | "pending-input" | "running" | "plan-follow-up";
}): string | null {
  if (!input.supportsCapability) return "Prompt clarification requires a newer server";
  if (!input.environmentAvailable) return "Environment unavailable";
  if (!input.selectionValid) return "Configured Clarify provider or model is unavailable";
  if (input.text.trim().length === 0) return "Enter text to clarify";
  if (input.phase !== "idle") return "Clarify is available only for an idle draft";
  return null;
}
