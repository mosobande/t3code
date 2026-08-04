import { ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { ProjectNoteDraftCoordinator } from "./projectNoteDraftCoordinator";

const firstDraft = { version: 1, markdown: "first", baseRevision: 0 } as const;
const replacementDraft = { version: 1, markdown: "replacement", baseRevision: 0 } as const;
const savedNote = {
  projectId: ProjectId.make("project"),
  markdown: "saved",
  updatedAt: null,
  revision: 2,
} as const;

describe("ProjectNoteDraftCoordinator", () => {
  it("does not let an obsolete surface replace a newer surface draft", () => {
    const coordinator = new ProjectNoteDraftCoordinator();
    const firstOwner = coordinator.createOwner();
    const replacementOwner = coordinator.createOwner();

    coordinator.write("environment:project", firstOwner, firstDraft);
    coordinator.write("environment:project", replacementOwner, replacementDraft);

    expect(coordinator.replaceOwned("environment:project", firstOwner, null)).toBe(false);
    expect(coordinator.read("environment:project")).toEqual(replacementDraft);
  });

  it("lets the current surface update or clear its own draft", () => {
    const coordinator = new ProjectNoteDraftCoordinator();
    const owner = coordinator.createOwner();

    coordinator.write("environment:project", owner, firstDraft);

    expect(coordinator.replaceOwned("environment:project", owner, replacementDraft)).toBe(true);
    expect(coordinator.read("environment:project")).toEqual(replacementDraft);
    expect(coordinator.replaceOwned("environment:project", owner, null)).toBe(true);
    expect(coordinator.read("environment:project")).toBeNull();
  });

  it("hands the latest saved note to a replacement surface after the draft clears", () => {
    const coordinator = new ProjectNoteDraftCoordinator();
    const owner = coordinator.createOwner();

    coordinator.write("environment:project", owner, firstDraft);
    coordinator.writeServer("environment:project", savedNote);
    coordinator.replaceOwned("environment:project", owner, null);

    expect(coordinator.read("environment:project")).toBeNull();
    expect(coordinator.readServer("environment:project")).toEqual(savedNote);
  });

  it("does not replace a newer saved note with a stale response", () => {
    const coordinator = new ProjectNoteDraftCoordinator();

    coordinator.writeServer("environment:project", savedNote);
    coordinator.writeServer("environment:project", {
      ...savedNote,
      markdown: "stale",
      revision: 1,
    });

    expect(coordinator.readServer("environment:project")).toEqual(savedNote);
  });
});
