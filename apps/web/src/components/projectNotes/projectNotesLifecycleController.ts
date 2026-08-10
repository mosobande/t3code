import type { EnvironmentId, ProjectId, ScopedThreadRef } from "@t3tools/contracts";

import {
  transitionProjectNotesLifecycle,
  type ProjectNotesLifecycleAction,
  type ProjectNotesLifecycleContext,
  type ProjectNotesLifecycleProject,
  type ProjectNotesLifecycleState,
} from "./projectNotesLifecycleState";
import { selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";

export interface ActiveProjectNotesContext {
  readonly projectKey: string;
  readonly project: ProjectNotesLifecycleProject & {
    readonly environmentId: EnvironmentId;
    readonly projectId: ProjectId;
  };
  readonly threadKey: string;
  readonly threadRef: ScopedThreadRef;
}

export function toProjectNotesLifecycleContext(
  active: ActiveProjectNotesContext,
): ProjectNotesLifecycleContext {
  return {
    ...active,
    notesPanelActive:
      selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, active.threadRef) ===
      "notes",
  };
}

function applyPanelEffects(
  effects: ReturnType<typeof transitionProjectNotesLifecycle>["effects"],
): void {
  const store = useRightPanelStore.getState();
  for (const effect of effects) {
    if (effect.type === "open-panel") {
      store.open(effect.threadRef as ScopedThreadRef, "notes");
    } else {
      store.closeSurface(effect.threadRef as ScopedThreadRef, "notes");
    }
  }
}

export function applyProjectNotesLifecycleAction(
  state: ProjectNotesLifecycleState,
  active: ActiveProjectNotesContext,
  action: ProjectNotesLifecycleAction,
): ProjectNotesLifecycleState {
  const next = transitionProjectNotesLifecycle(
    state,
    toProjectNotesLifecycleContext(active),
    action,
  );
  applyPanelEffects(next.effects);
  return next.state;
}
