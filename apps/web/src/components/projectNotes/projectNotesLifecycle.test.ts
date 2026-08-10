import { describe, expect, it } from "vite-plus/test";

import {
  createProjectNotesLifecycleState,
  transitionProjectNotesLifecycle,
  type ProjectNotesLifecycleContext,
} from "./projectNotesLifecycleState";

const owner = {
  projectKey: "environment-a:project-a",
  project: {
    environmentId: "environment-a",
    projectId: "project-a",
    projectName: "Project A",
  },
  threadKey: "environment-a:thread-owner",
  threadRef: { environmentId: "environment-a", threadId: "thread-owner" },
} as const;

const sibling = {
  ...owner,
  threadKey: "environment-a:thread-sibling",
  threadRef: { environmentId: "environment-a", threadId: "thread-sibling" },
} as const;

const anotherProject = {
  projectKey: "environment-a:project-b",
  project: {
    environmentId: "environment-a",
    projectId: "project-b",
    projectName: "Project B",
  },
  threadKey: "environment-a:thread-other-project",
  threadRef: { environmentId: "environment-a", threadId: "thread-other-project" },
} as const;

function context(
  current: typeof owner | typeof sibling | typeof anotherProject,
  notesPanelOpen = false,
): ProjectNotesLifecycleContext {
  return { ...current, notesPanelOpen };
}

describe("Project Notes lifecycle", () => {
  it("keeps an unpinned Notes panel local to its thread across navigation", () => {
    const state = createProjectNotesLifecycleState();

    const transition = transitionProjectNotesLifecycle(state, context(sibling), "navigate");

    expect(transition.state).toEqual(state);
    expect(transition.effects).toEqual([]);
  });

  it("opens a pinned project in a sibling thread through the existing panel store", () => {
    const pinned = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner, true),
      "pin",
    ).state;

    const transition = transitionProjectNotesLifecycle(pinned, context(sibling), "navigate");

    expect(transition.effects).toEqual([{ type: "open-panel", threadRef: sibling.threadRef }]);
  });

  it("closes the owner docked surface before floating and never opens a hidden owner panel", () => {
    const pinned = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner, true),
      "pin",
    ).state;
    const floating = transitionProjectNotesLifecycle(pinned, context(owner, true), "float");

    expect(floating.effects).toEqual([{ type: "close-panel", threadRef: owner.threadRef }]);
    expect(floating.presentation).toEqual({ panel: false, floating: owner.project });

    const ownerNavigation = transitionProjectNotesLifecycle(
      floating.state,
      context(owner),
      "navigate",
    );
    expect(ownerNavigation.effects).toEqual([]);
    expect(ownerNavigation.presentation).toEqual({ panel: false, floating: owner.project });
  });

  it("shows floating Notes only on the owner thread and opens a pinned sibling in the panel", () => {
    const floating = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner, true),
      "float",
    ).state;
    const pinned = transitionProjectNotesLifecycle(floating, context(owner), "pin").state;

    const transition = transitionProjectNotesLifecycle(pinned, context(sibling), "navigate");

    expect(transition.presentation).toEqual({ panel: false, floating: null });
    expect(transition.effects).toEqual([{ type: "open-panel", threadRef: sibling.threadRef }]);
  });

  it("closes a floating owner and clears its project pin", () => {
    const floating = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner, true),
      "float",
    ).state;
    const pinned = transitionProjectNotesLifecycle(floating, context(owner), "pin").state;

    const transition = transitionProjectNotesLifecycle(pinned, context(owner), "close");

    expect(transition.effects).toEqual([]);
    expect(transition.presentation).toEqual({ panel: false, floating: null });
    expect(transition.state).toEqual({ floating: null, pinnedProjectKeys: [] });
  });

  it("closes active Notes by clearing only its project pin", () => {
    const firstPinned = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner, true),
      "pin",
    ).state;
    const bothPinned = transitionProjectNotesLifecycle(
      firstPinned,
      context(anotherProject, true),
      "pin",
    ).state;

    const transition = transitionProjectNotesLifecycle(bothPinned, context(owner, true), "close");

    expect(transition.effects).toEqual([{ type: "close-panel", threadRef: owner.threadRef }]);
    expect(transition.state.pinnedProjectKeys).toEqual([anotherProject.projectKey]);
  });

  it("unpinning stops later sibling opens without closing existing thread state", () => {
    const pinned = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner, true),
      "pin",
    ).state;
    const unpinned = transitionProjectNotesLifecycle(pinned, context(owner, true), "unpin");

    expect(unpinned.effects).toEqual([]);
    expect(
      transitionProjectNotesLifecycle(unpinned.state, context(sibling), "navigate").effects,
    ).toEqual([]);
  });
});
