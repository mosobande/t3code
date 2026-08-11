import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  createProjectNotesLifecycleStore,
  getProjectNotesPresentation,
  type ActiveProjectNotesContext,
} from "./projectNotesLifecycleStore";
import { selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";

const environmentId = EnvironmentId.make("environment-a");
const projectId = ProjectId.make("project-a");
const projectRef = scopeProjectRef(environmentId, projectId);

const owner: ActiveProjectNotesContext = {
  project: { ...projectRef, projectName: "Project A" },
  threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-owner")),
};

const sibling: ActiveProjectNotesContext = {
  project: owner.project,
  threadRef: scopeThreadRef(environmentId, ThreadId.make("thread-sibling")),
};

beforeEach(() => {
  useRightPanelStore.setState({ byThreadKey: {} });
});

describe("Project Notes lifecycle store", () => {
  it("derives an open panel from the current right-panel state", () => {
    const store = createProjectNotesLifecycleStore();

    expect(getProjectNotesPresentation(store.getState().lifecycle, owner)).toEqual({
      floating: null,
      panel: false,
    });

    store.getState().apply(owner, "open");

    expect(selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, owner.threadRef)).toBe(
      "notes",
    );
    expect(getProjectNotesPresentation(store.getState().lifecycle, owner)).toEqual({
      floating: null,
      panel: true,
    });
  });

  it("retains pin and floating state for a fresh route adapter", () => {
    const store = createProjectNotesLifecycleStore();

    store.getState().apply(owner, "open");
    store.getState().apply(owner, "pin");
    store.getState().apply(owner, "float");

    expect(getProjectNotesPresentation(store.getState().lifecycle, { ...owner })).toEqual({
      floating: owner.project,
      panel: false,
    });

    store.getState().apply(sibling, "navigate");

    expect(
      selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, sibling.threadRef),
    ).toBeNull();
    expect(getProjectNotesPresentation(store.getState().lifecycle, sibling)).toEqual({
      floating: owner.project,
      panel: false,
    });
  });

  it("clears lifecycle metadata after a generic panel close without closing the panel itself", () => {
    const store = createProjectNotesLifecycleStore();
    store.getState().apply(owner, "open");
    store.getState().apply(owner, "pin");

    store.getState().apply(owner, "panel-closed");

    expect(selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, owner.threadRef)).toBe(
      "notes",
    );
    expect(store.getState().lifecycle.pinnedProjectKeys).toEqual([]);
  });
});
