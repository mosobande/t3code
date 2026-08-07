import { describe, expect, it } from "vite-plus/test";

import {
  adjustProjectNotesWindowRect,
  clampProjectNotesWindowRect,
  persistProjectNotesWindowRect,
  projectNotePendingDraftStorageKey,
  projectNotesWindowStorageKey,
  projectNotesTargetMatchesActiveProject,
} from "./projectNotesWindowState";

describe("project notes window state", () => {
  it("hides a floating note synchronously at a project boundary", () => {
    expect(
      projectNotesTargetMatchesActiveProject({
        targetProjectKey: "local:project-a",
        activeProjectKey: "local:project-b",
      }),
    ).toBe(false);
    expect(
      projectNotesTargetMatchesActiveProject({
        targetProjectKey: "local:project-a",
        activeProjectKey: "local:project-a",
      }),
    ).toBe(true);
  });

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

  it("keeps floating notes usable when saved window geometry cannot be persisted", () => {
    const storage = {
      setItem: () => {
        throw new Error("storage unavailable");
      },
    };

    expect(
      persistProjectNotesWindowRect(storage, "project-notes-window", {
        x: 16,
        y: 16,
        width: 460,
        height: 560,
      }),
    ).toBe(false);
  });

  it("serializes saved window geometry through the storage seam", () => {
    const writes: Array<readonly [string, string]> = [];
    const rect = { x: 16, y: 32, width: 460, height: 560 };

    expect(
      persistProjectNotesWindowRect(
        {
          setItem: (key, value) => writes.push([key, value]),
        },
        "project-notes-window",
        rect,
      ),
    ).toBe(true);
    expect(writes).toEqual([["project-notes-window", JSON.stringify(rect)]]);
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
