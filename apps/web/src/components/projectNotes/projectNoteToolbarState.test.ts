import { describe, expect, it } from "vite-plus/test";

import { resolveProjectNoteSelectionActions } from "./projectNoteToolbarState";

describe("project note selection actions", () => {
  it("disables selection actions when no text is selected", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasExpandedSelection: false,
        selectionContainsLink: true,
      }),
    ).toEqual({
      canRemoveLink: false,
      canClearFormatting: false,
    });
  });

  it("enables clear formatting for selected text", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasExpandedSelection: true,
        selectionContainsLink: false,
      }),
    ).toEqual({
      canRemoveLink: false,
      canClearFormatting: true,
    });
  });

  it("enables link removal only when selected text contains a link", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasExpandedSelection: true,
        selectionContainsLink: true,
      }),
    ).toEqual({
      canRemoveLink: true,
      canClearFormatting: true,
    });
  });
});
