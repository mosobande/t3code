import { scopedProjectKey, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedProjectRef, ScopedThreadRef } from "@t3tools/contracts";
import { createStore } from "zustand/vanilla";

import {
  createProjectNotesLifecycleState,
  selectProjectNotesLifecyclePresentation,
  transitionProjectNotesLifecycle,
  type ProjectNotesLifecycleAction,
  type ProjectNotesLifecycleContext,
  type ProjectNotesLifecycleProject,
  type ProjectNotesLifecycleState,
} from "./projectNotesLifecycleState";
import { selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";

export interface ActiveProjectNotesContext {
  readonly project: ScopedProjectRef & ProjectNotesLifecycleProject;
  readonly threadRef: ScopedThreadRef;
}

export function toProjectNotesLifecycleContext(
  active: ActiveProjectNotesContext,
  notesPanelActive: boolean,
): ProjectNotesLifecycleContext {
  return {
    projectKey: scopedProjectKey(active.project),
    project: active.project,
    threadKey: scopedThreadKey(active.threadRef),
    threadRef: active.threadRef,
    notesPanelActive,
  };
}

function currentNotesPanelActive(active: ActiveProjectNotesContext): boolean {
  return (
    selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, active.threadRef) === "notes"
  );
}

function applyPanelEffects(
  effects: ReturnType<typeof transitionProjectNotesLifecycle>["effects"],
): void {
  const panelStore = useRightPanelStore.getState();
  for (const effect of effects) {
    if (effect.type === "open-panel") {
      panelStore.open(effect.threadRef, "notes");
    } else {
      panelStore.closeSurface(effect.threadRef, "notes");
    }
  }
}

interface ProjectNotesLifecycleStoreState {
  readonly lifecycle: ProjectNotesLifecycleState;
  readonly apply: (active: ActiveProjectNotesContext, action: ProjectNotesLifecycleAction) => void;
}

export function createProjectNotesLifecycleStore() {
  return createStore<ProjectNotesLifecycleStoreState>()((set, get) => ({
    lifecycle: createProjectNotesLifecycleState(),
    apply: (active, action) => {
      const current = get().lifecycle;
      const transition = transitionProjectNotesLifecycle(
        current,
        toProjectNotesLifecycleContext(active, currentNotesPanelActive(active)),
        action,
      );
      applyPanelEffects(transition.effects);
      if (transition.state !== current) {
        set({ lifecycle: transition.state });
      }
    },
  }));
}

export const projectNotesLifecycleStore = createProjectNotesLifecycleStore();

export function getProjectNotesPresentation(
  state: ProjectNotesLifecycleState,
  active: ActiveProjectNotesContext,
) {
  return selectProjectNotesLifecyclePresentation(
    state,
    toProjectNotesLifecycleContext(active, currentNotesPanelActive(active)),
  );
}
