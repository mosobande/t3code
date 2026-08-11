export type ProjectNoteBlockKind =
  | "paragraph"
  | "heading-2"
  | "quote"
  | "bullet-list"
  | "numbered-list"
  | "check-list";

export function resolveProjectNoteSelectionActions(input: {
  hasRangeSelection: boolean;
  hasExpandedSelection: boolean;
  blockKind: ProjectNoteBlockKind;
  bold: boolean;
  italic: boolean;
  inlineCode: boolean;
}): {
  canFormat: boolean;
  canClearFormatting: boolean;
  heading2Active: boolean;
  boldActive: boolean;
  italicActive: boolean;
  bulletListActive: boolean;
  checklistActive: boolean;
  inlineCodeActive: boolean;
} {
  const active = input.hasRangeSelection;
  return {
    canFormat: active,
    canClearFormatting: active && input.hasExpandedSelection,
    heading2Active: active && input.blockKind === "heading-2",
    boldActive: active && input.bold,
    italicActive: active && input.italic,
    bulletListActive: active && input.blockKind === "bullet-list",
    checklistActive: active && input.blockKind === "check-list",
    inlineCodeActive: active && input.inlineCode,
  };
}
