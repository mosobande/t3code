import type { EnvironmentId, ProjectId, ScopedThreadRef } from "@t3tools/contracts";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectNotesDisplayMode } from "./projectNotesConstants";
import { subscribeProjectNotesAction } from "./projectNotesActionBus";
import {
  createProjectNotesLifecycleState,
  transitionProjectNotesLifecycle,
  type ProjectNotesLifecycleAction,
  type ProjectNotesLifecycleContext,
  type ProjectNotesLifecycleProject,
  type ProjectNotesLifecycleState,
} from "./projectNotesLifecycleState";
import { selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";

const ProjectNotesSurface = lazy(() =>
  import("./ProjectNotesSurface").then((module) => ({ default: module.ProjectNotesSurface })),
);

export interface ActiveProjectNotesContext {
  readonly projectKey: string;
  readonly project: ProjectNotesLifecycleProject & {
    readonly environmentId: EnvironmentId;
    readonly projectId: ProjectId;
  };
  readonly threadKey: string;
  readonly threadRef: ScopedThreadRef;
}

interface UseProjectNotesLifecycleOptions {
  readonly active: ActiveProjectNotesContext | null;
}

function toLifecycleContext(active: ActiveProjectNotesContext): ProjectNotesLifecycleContext {
  return {
    ...active,
    notesPanelOpen:
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
  const next = transitionProjectNotesLifecycle(state, toLifecycleContext(active), action);
  applyPanelEffects(next.effects);
  return next.state;
}

export function useProjectNotesLifecycle({ active }: UseProjectNotesLifecycleOptions) {
  const [state, setState] = useState<ProjectNotesLifecycleState>(createProjectNotesLifecycleState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeRef = useRef(active);
  activeRef.current = active;

  const transition = useCallback((action: ProjectNotesLifecycleAction) => {
    const currentActive = activeRef.current;
    if (!currentActive) return;
    const nextState = applyProjectNotesLifecycleAction(stateRef.current, currentActive, action);
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    if (!active) return;
    transition("navigate");
  }, [active?.projectKey, active?.threadKey, transition]);

  useEffect(() => subscribeProjectNotesAction(() => transition("toggle")), [transition]);

  const presentation = useMemo(() => {
    if (!active) return { floating: null, panel: false };
    return transitionProjectNotesLifecycle(state, toLifecycleContext(active), "navigate")
      .presentation;
  }, [active, state]);
  const pinned = active ? state.pinnedProjectKeys.includes(active.projectKey) : false;
  const mode: ProjectNotesDisplayMode | null = presentation.floating
    ? "floating"
    : presentation.panel
      ? "panel"
      : null;
  const changeMode = useCallback(
    (nextMode: ProjectNotesDisplayMode) => transition(nextMode === "floating" ? "float" : "panel"),
    [transition],
  );
  const setPinned = useCallback(
    (nextPinned: boolean) => transition(nextPinned ? "pin" : "unpin"),
    [transition],
  );
  const close = useCallback(() => transition("close"), [transition]);
  const open = useCallback(() => transition("open"), [transition]);
  const toggle = useCallback(() => transition("toggle"), [transition]);

  const surfaceProps = {
    keepOpenAcrossThreads: pinned,
    onClose: close,
    onKeepOpenAcrossThreadsChange: setPinned,
    onModeChange: changeMode,
  };
  const panel =
    presentation.panel && active ? (
      <Suspense fallback={null}>
        <ProjectNotesSurface
          key={`${active.project.environmentId}:${active.project.projectId}`}
          environmentId={active.project.environmentId}
          projectId={active.project.projectId}
          projectName={active.project.projectName}
          mode="panel"
          {...surfaceProps}
        />
      </Suspense>
    ) : null;
  const floating =
    presentation.floating && active ? (
      <Suspense fallback={null}>
        <ProjectNotesSurface
          key={`${active.project.environmentId}:${active.project.projectId}`}
          environmentId={active.project.environmentId}
          projectId={active.project.projectId}
          projectName={active.project.projectName}
          mode="floating"
          {...surfaceProps}
        />
      </Suspense>
    ) : null;

  return {
    floating,
    mode,
    onPanelClosed: close,
    open,
    panel,
    setPinned,
    toggle,
  };
}
