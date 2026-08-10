import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import type { LexicalEditor } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { clearProjectNoteFormatting } from "./projectNoteEditorActions";

describe("Project Note editor actions", () => {
  it("removes links as part of clearing formatting", () => {
    const dispatchCommand = vi.fn(() => true);
    const update = vi.fn();
    const editor = { dispatchCommand, update } as unknown as LexicalEditor;

    clearProjectNoteFormatting(editor);

    expect(dispatchCommand).toHaveBeenCalledWith(TOGGLE_LINK_COMMAND, null);
    expect(update).toHaveBeenCalledOnce();
  });
});
