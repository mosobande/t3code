import { describe, expect, it } from "vite-plus/test";

import chatViewSource from "../ChatView.tsx?raw";
import commandPaletteSource from "../CommandPalette.tsx?raw";
import chatHeaderSource from "../chat/ChatHeader.tsx?raw";
import chatRouteSource from "../../routes/_chat.tsx?raw";
import projectNoteEditorSource from "./ProjectNoteEditor.tsx?raw";
import projectNotesLifecycleSource from "../../sigidi/projectNotes/ProjectNotesLifecycle.tsx?raw";
import projectNotesSurfaceSource from "./ProjectNotesSurface.tsx?raw";

describe("project notes module boundary", () => {
  it("keeps the rich editor behind a lazy Notes lifecycle boundary", () => {
    expect(projectNotesLifecycleSource).toContain("const ProjectNotesSurface = lazy(");
    expect(chatViewSource).not.toMatch(
      /import\s*\{[^}]*ProjectNotesSurface[^}]*\}\s*from\s*["']\.\/projectNotes\/ProjectNotesSurface["']/s,
    );
  });

  it("lets ChatHeader use the surface id without importing the editor graph", () => {
    expect(chatHeaderSource).toContain('from "../projectNotes/projectNotesConstants"');
    expect(chatHeaderSource).not.toContain('from "../projectNotes/ProjectNotesSurface"');
  });

  it("opens or activates project notes from the header without toggling them closed", () => {
    expect(chatHeaderSource).toContain("onOpenProjectNotes");
    expect(chatHeaderSource).not.toContain("onToggleProjectNotes");
    expect(chatViewSource).toContain("onOpenProjectNotes={openProjectNotes}");
  });

  it("registers the Lexical checklist behavior used by the formatting action", () => {
    expect(projectNoteEditorSource).toContain("<CheckListPlugin />");
  });

  it("lets the viewport clamp own floating-window minimum dimensions", () => {
    expect(projectNotesSurfaceSource).not.toContain("min-h-70");
    expect(projectNotesSurfaceSource).not.toContain("min-w-80");
  });

  it("flushes a pending autosave when the notes surface unmounts", () => {
    expect(projectNotesSurfaceSource).toMatch(
      /return \(\) => \{\s*mounted\.current = false;\s*void flushPendingAutosave\(\);\s*\};/,
    );
  });

  it("lets the Notes lifecycle own the action-bus subscription and presentation", () => {
    expect(commandPaletteSource).toContain('shortcutCommand: "projectNotes.toggle"');
    expect(commandPaletteSource).toContain('dispatchProjectNotesAction("toggle")');
    expect(chatRouteSource).toContain('command === "projectNotes.toggle"');
    expect(chatRouteSource).toContain('dispatchProjectNotesAction("toggle")');
    expect(projectNotesLifecycleSource).toContain("subscribeProjectNotesAction");
    expect(projectNotesLifecycleSource).toContain("ProjectNotesSurface");
    expect(chatViewSource).toContain("ProjectNotesLifecycle");
    expect(chatViewSource).not.toContain("subscribeProjectNotesAction");
  });
});
