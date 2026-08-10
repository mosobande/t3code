import { describe, expect, it } from "vite-plus/test";

import { resolveProjectNoteSelectionActions } from "./projectNoteToolbarState";

describe("project note selection actions", () => {
  it("disables clear formatting when no text is selected", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasExpandedSelection: false,
      }),
    ).toEqual({
      canClearFormatting: false,
    });
  });

  it("enables clear formatting for selected text", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasExpandedSelection: true,
      }),
    ).toEqual({
      canClearFormatting: true,
    });
  });
});
