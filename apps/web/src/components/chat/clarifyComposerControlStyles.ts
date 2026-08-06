export const CLARIFY_COMPOSER_ICON_CLASS = "text-current opacity-100";

export function clarifyComposerControlClass(panelOpen: boolean) {
  return panelOpen
    ? "bg-clarify/12 text-clarify hover:bg-clarify/16"
    : "text-muted-foreground/70 hover:bg-clarify/10 hover:text-clarify";
}
