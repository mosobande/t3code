import { describe, expect, it } from "vite-plus/test";

import chatViewSource from "../ChatView.tsx?raw";
import chatHeaderSource from "../chat/ChatHeader.tsx?raw";

describe("project notes module boundary", () => {
  it("keeps the rich editor behind a lazy ChatView boundary", () => {
    expect(chatViewSource).toContain("const ProjectNotesSurface = lazy(");
    expect(chatViewSource).not.toMatch(
      /import\s*\{[^}]*ProjectNotesSurface[^}]*\}\s*from\s*["']\.\/projectNotes\/ProjectNotesSurface["']/s,
    );
  });

  it("lets ChatHeader use the surface id without importing the editor graph", () => {
    expect(chatHeaderSource).toContain('from "../projectNotes/projectNotesConstants"');
    expect(chatHeaderSource).not.toContain('from "../projectNotes/ProjectNotesSurface"');
  });
});
