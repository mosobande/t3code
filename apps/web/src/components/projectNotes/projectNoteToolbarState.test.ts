import { describe, expect, it } from "vite-plus/test";

import { resolveProjectNoteSelectionActions } from "./projectNoteToolbarState";

describe("project note selection actions", () => {
  it("disables formatting actions when the selection is not a range", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasRangeSelection: false,
        hasExpandedSelection: false,
        blockKind: "paragraph",
        bold: false,
        italic: false,
        inlineCode: false,
      }),
    ).toEqual({
      canFormat: false,
      canClearFormatting: false,
      heading2Active: false,
      boldActive: false,
      italicActive: false,
      bulletListActive: false,
      checklistActive: false,
      inlineCodeActive: false,
    });
  });

  it("reports the active block and text formats for a range selection", () => {
    expect(
      resolveProjectNoteSelectionActions({
        hasRangeSelection: true,
        hasExpandedSelection: true,
        blockKind: "check-list",
        bold: true,
        italic: false,
        inlineCode: true,
      }),
    ).toEqual({
      canFormat: true,
      canClearFormatting: true,
      heading2Active: false,
      boldActive: true,
      italicActive: false,
      bulletListActive: false,
      checklistActive: true,
      inlineCodeActive: true,
    });
  });

  it("reports heading and bullet-list blocks independently", () => {
    const base = {
      hasRangeSelection: true,
      hasExpandedSelection: false,
      bold: false,
      italic: false,
      inlineCode: false,
    } as const;

    expect(resolveProjectNoteSelectionActions({ ...base, blockKind: "heading-2" })).toMatchObject({
      heading2Active: true,
      bulletListActive: false,
    });
    expect(resolveProjectNoteSelectionActions({ ...base, blockKind: "bullet-list" })).toMatchObject(
      { heading2Active: false, bulletListActive: true },
    );
  });
});
