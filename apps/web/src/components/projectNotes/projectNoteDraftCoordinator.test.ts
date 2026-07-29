import { describe, expect, it } from "vite-plus/test";

import { ProjectNoteDraftCoordinator } from "./projectNoteDraftCoordinator";

const firstDraft = { version: 1, markdown: "first", baseRevision: 0 } as const;
const replacementDraft = { version: 1, markdown: "replacement", baseRevision: 0 } as const;

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
});
