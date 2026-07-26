import { describe, expect, it } from "vite-plus/test";

import {
  adjustProjectNotesWindowRect,
  clampProjectNotesWindowRect,
  projectNotePendingDraftStorageKey,
  projectNotesWindowStorageKey,
} from "./projectNotesWindowState";

describe("project notes window state", () => {
  it("keeps a restored window inside the viewport", () => {
    expect(
      clampProjectNotesWindowRect(
        { x: 2_000, y: -50, width: 900, height: 900 },
        { width: 800, height: 600 },
      ),
    ).toEqual({
      x: 16,
      y: 16,
      width: 768,
      height: 568,
    });
  });

  it("separates saved window geometry by environment and project", () => {
    expect(projectNotesWindowStorageKey("local", "project-a")).toBe(
      "t3.project-notes.window.v1:local:project-a",
    );
    expect(projectNotesWindowStorageKey("remote", "project-a")).not.toBe(
      projectNotesWindowStorageKey("local", "project-a"),
    );
    expect(projectNotePendingDraftStorageKey("local", "project-a")).not.toBe(
      projectNotePendingDraftStorageKey("local", "project-b"),
    );
  });

  it("fits inside a viewport that is smaller than the normal minimum size", () => {
    expect(
      clampProjectNotesWindowRect(
        { x: 80, y: 80, width: 460, height: 560 },
        { width: 300, height: 240 },
      ),
    ).toEqual({
      x: 16,
      y: 16,
      width: 268,
      height: 208,
    });
  });

  it("moves and resizes a floating notes window with bounded keyboard actions", () => {
    const viewport = { width: 1_000, height: 800 };
    const initial = { x: 100, y: 100, width: 460, height: 560 };

    expect(
      adjustProjectNotesWindowRect(initial, { x: 16, y: -16, width: 0, height: 0 }, viewport),
    ).toEqual({
      x: 116,
      y: 84,
      width: 460,
      height: 560,
    });
    expect(
      adjustProjectNotesWindowRect(initial, { x: 0, y: 0, width: 16, height: -16 }, viewport),
    ).toEqual({
      x: 100,
      y: 100,
      width: 476,
      height: 544,
    });
  });
});
