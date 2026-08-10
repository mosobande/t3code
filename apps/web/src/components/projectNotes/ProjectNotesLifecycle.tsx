import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectNotesDisplayMode } from "./projectNotesConstants";
import { subscribeProjectNotesAction } from "./projectNotesActionBus";
import {
  createProjectNotesLifecycleState,
  transitionProjectNotesLifecycle,
  type ProjectNotesLifecycleAction,
  type ProjectNotesLifecycleState,
} from "./projectNotesLifecycleState";
import {
  applyProjectNotesLifecycleAction,
  toProjectNotesLifecycleContext,
  type ActiveProjectNotesContext,
} from "./projectNotesLifecycleController";

const ProjectNotesSurface = lazy(() =>
  import("./ProjectNotesSurface").then((module) => ({ default: module.ProjectNotesSurface })),
);

interface UseProjectNotesLifecycleOptions {
  readonly active: ActiveProjectNotesContext | null;
}

export function useProjectNotesLifecycle({ active }: UseProjectNotesLifecycleOptions) {
  const [state, setState] = useState<ProjectNotesLifecycleState>(createProjectNotesLifecycleState);
  const stateRef = useRef(state);

  const transition = useCallback(
    (action: ProjectNotesLifecycleAction) => {
      if (!active) return;
      const currentState = stateRef.current;
      const nextState = applyProjectNotesLifecycleAction(currentState, active, action);
      stateRef.current = nextState;
      if (nextState !== currentState) setState(nextState);
    },
    [active],
  );

  useEffect(() => {
    if (!active) return;
    transition("navigate");
  }, [active, transition]);

  useEffect(() => subscribeProjectNotesAction(() => transition("toggle")), [transition]);

  const presentation = useMemo(() => {
    if (!active) return { floating: null, panel: false };
    return transitionProjectNotesLifecycle(
      state,
      toProjectNotesLifecycleContext(active),
      "navigate",
    ).presentation;
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
