export const CLARIFY_COMPOSER_ICON_CLASS = "text-current opacity-100";

export function clarifyComposerControlState(input: {
  readonly disabledReason: string | null;
  readonly isRunning: boolean;
}) {
  if (input.isRunning) {
    return {
      disabled: true,
      editorReadOnly: true,
      ariaBusy: true,
      ariaLabel: "Clarifying draft",
      statusLabel: "Clarifying…",
      tooltip: "Clarifying draft…",
    } as const;
  }
  return {
    disabled: input.disabledReason !== null,
    editorReadOnly: false,
    ariaBusy: false,
    ariaLabel: input.disabledReason ?? "Clarify draft",
    statusLabel: "Clarify",
    tooltip: input.disabledReason ?? "Clarify draft",
  } as const;
}

export function clarifyComposerControlClass(isRunning: boolean) {
  return isRunning
    ? "motion-safe:animate-pulse bg-clarify/12 text-clarify"
    : "text-muted-foreground/70 hover:bg-clarify/10 hover:text-clarify";
}
