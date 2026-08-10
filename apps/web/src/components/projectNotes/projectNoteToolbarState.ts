export function resolveProjectNoteSelectionActions(input: { hasExpandedSelection: boolean }): {
  canClearFormatting: boolean;
} {
  return {
    canClearFormatting: input.hasExpandedSelection,
  };
}
