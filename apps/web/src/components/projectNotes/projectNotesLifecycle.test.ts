import { afterEach, describe, expect, it } from "vite-plus/test";
import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";

import {
  createProjectNotesLifecycleStore,
  type ActiveProjectNotesContext,
} from "~/sigidi/projectNotes/projectNotesLifecycleStore";
import {
  createProjectNotesLifecycleState,
  transitionProjectNotesLifecycle,
  type ProjectNotesLifecycleContext,
} from "~/sigidi/projectNotes/projectNotesLifecycleState";
import { selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";

type LifecycleContextInput = Omit<ProjectNotesLifecycleContext, "notesPanelActive">;

const environmentId = EnvironmentId.make("environment-a");
const projectAId = ProjectId.make("project-a");
const projectBId = ProjectId.make("project-b");

const owner: LifecycleContextInput = {
  projectKey: "environment-a:project-a",
  project: {
    ...scopeProjectRef(environmentId, projectAId),
    projectName: "Project A",
  },
  threadKey: "environment-a:thread-owner",
  threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-owner")),
} as const;

const sibling: LifecycleContextInput = {
  ...owner,
  threadKey: "environment-a:thread-sibling",
  threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-sibling")),
} as const;

const anotherProject: LifecycleContextInput = {
  projectKey: "environment-a:project-b",
  project: {
    ...scopeProjectRef(environmentId, projectBId),
    projectName: "Project B",
  },
  threadKey: "environment-a:thread-other-project",
  threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-other-project")),
} as const;

function context(
  current: LifecycleContextInput,
  notesPanelActive = false,
): ProjectNotesLifecycleContext {
  return { ...current, notesPanelActive };
}

describe("Project Notes lifecycle", () => {
  afterEach(() => useRightPanelStore.setState({ byThreadKey: {} }));

  it("uses current panel state for consecutive toggle actions", () => {
    useRightPanelStore.setState({ byThreadKey: {} });
    const active: ActiveProjectNotesContext = {
      project: owner.project,
      threadRef: owner.threadRef,
    };
    const store = createProjectNotesLifecycleStore();

    store.getState().apply(active, "toggle");
    expect(
      selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, active.threadRef),
    ).toBe("notes");

    store.getState().apply(active, "toggle");
    expect(
      selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, active.threadRef),
    ).toBeNull();
  });

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

  it("restores each thread's floating Notes after another thread floats the same project", () => {
    const ownerFloating = transitionProjectNotesLifecycle(
      createProjectNotesLifecycleState(),
      context(owner),
      "float",
    ).state;
    const bothFloating = transitionProjectNotesLifecycle(
      ownerFloating,
      context(sibling),
      "float",
    ).state;

    expect(
      transitionProjectNotesLifecycle(bothFloating, context(owner), "navigate").presentation,
    ).toEqual({ panel: false, floating: owner.project });
    expect(
      transitionProjectNotesLifecycle(bothFloating, context(sibling), "navigate").presentation,
    ).toEqual({ panel: false, floating: sibling.project });
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
    expect(transition.state).toEqual({ floatingByThreadKey: {}, pinnedProjectKeys: [] });
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
