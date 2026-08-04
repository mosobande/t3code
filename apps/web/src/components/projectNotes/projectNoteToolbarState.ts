export function resolveProjectNoteSelectionActions(input: {
  hasExpandedSelection: boolean;
  selectionContainsLink: boolean;
}): {
  canRemoveLink: boolean;
  canClearFormatting: boolean;
} {
  return {
    canRemoveLink: input.hasExpandedSelection && input.selectionContainsLink,
    canClearFormatting: input.hasExpandedSelection,
  };
}
