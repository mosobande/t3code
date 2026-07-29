import type { ProjectId, ProjectNote } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  beginProjectNoteSave,
  confirmProjectNoteSave,
  editProjectNoteSaveSession,
  initializeProjectNoteSaveSession,
  parsePendingProjectNoteDraft,
  readPendingProjectNoteDraft,
  reconcileLoadedProjectNote,
  storePendingProjectNoteDraft,
} from "./projectNoteSaveState";

function note(markdown: string, revision: number): ProjectNote {
  return {
    projectId: "project-1" as ProjectId,
    markdown,
    updatedAt: null,
    revision,
  };
}

describe("projectNoteSaveState", () => {
  it("blocks a recovered draft when the server revision changed", () => {
    const session = initializeProjectNoteSaveSession(note("new server text", 4), {
      version: 1,
      markdown: "older local text",
      baseRevision: 3,
    });

    expect(session.conflict).toEqual(note("new server text", 4));
    expect(beginProjectNoteSave(session).request).toBeNull();
  });

  it("treats the previous raw draft format as an unsafe recovery", () => {
    const draft = parsePendingProjectNoteDraft("legacy local text");
    const session = initializeProjectNoteSaveSession(note("server text", 2), draft);

    expect(draft).toEqual({
      version: 1,
      markdown: "legacy local text",
      baseRevision: null,
    });
    expect(session.conflict).toEqual(note("server text", 2));
  });

  it("keeps autosave state usable when browser draft storage fails", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
      removeItem: () => {
        throw new Error("storage unavailable");
      },
    };

    expect(readPendingProjectNoteDraft(storage, "note")).toBeNull();
    expect(
      storePendingProjectNoteDraft(storage, "note", {
        version: 1,
        markdown: "local work",
        baseRevision: 0,
      }),
    ).toBe(false);
    expect(storePendingProjectNoteDraft(storage, "note", null)).toBe(false);
  });

  it("uses the confirmed revision for text typed during an active save", () => {
    let session = initializeProjectNoteSaveSession(note("", 0), null);
    session = editProjectNoteSaveSession(session, "first");
    const first = beginProjectNoteSave(session);
    session = editProjectNoteSaveSession(first.session, "second");
    session = confirmProjectNoteSave(session, note("first", 1));
    const second = beginProjectNoteSave(session);

    expect(first.request).toEqual({ markdown: "first", expectedRevision: 0 });
    expect(second.request).toEqual({ markdown: "second", expectedRevision: 1 });
  });

  it("clears the draft after the current text is confirmed", () => {
    let session = initializeProjectNoteSaveSession(note("", 0), null);
    session = editProjectNoteSaveSession(session, "saved");
    session = beginProjectNoteSave(session).session;
    session = confirmProjectNoteSave(session, note("saved", 1));

    expect(session.draft).toBeNull();
    expect(session.server).toEqual(note("saved", 1));
  });

  it("replaces an idle cached note when revalidation returns a newer revision", () => {
    const cached = initializeProjectNoteSaveSession(note("", 0), null);
    const revalidated = reconcileLoadedProjectNote(cached, note("saved elsewhere", 1));

    expect(revalidated.server).toEqual(note("saved elsewhere", 1));
    expect(revalidated.draft).toBeNull();
    expect(revalidated.conflict).toBeNull();
  });

  it("blocks a local draft when revalidation returns a newer revision", () => {
    let session = initializeProjectNoteSaveSession(note("", 0), null);
    session = editProjectNoteSaveSession(session, "local work");
    session = reconcileLoadedProjectNote(session, note("remote work", 1));

    expect(session.conflict).toEqual(note("remote work", 1));
    expect(beginProjectNoteSave(session).request).toBeNull();
  });
});
