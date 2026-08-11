import { lazy, Suspense, useCallback, useEffect } from "react";
import { useStore } from "zustand";

import type { ProjectNotesDisplayMode } from "~/components/projectNotes/projectNotesConstants";
import { subscribeProjectNotesAction } from "~/components/projectNotes/projectNotesActionBus";
import {
  projectNotesLifecycleStore,
  toProjectNotesLifecycleContext,
  type ActiveProjectNotesContext,
} from "./projectNotesLifecycleStore";
import { selectProjectNotesLifecyclePresentation } from "./projectNotesLifecycleState";
import { selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";

const ProjectNotesSurface = lazy(() =>
  import("~/components/projectNotes/ProjectNotesSurface").then((module) => ({
    default: module.ProjectNotesSurface,
  })),
);

interface UseProjectNotesLifecycleOptions {
  readonly active: ActiveProjectNotesContext | null;
}

export function useProjectNotesLifecycle({ active }: UseProjectNotesLifecycleOptions) {
  const state = useStore(projectNotesLifecycleStore, (store) => store.lifecycle);
  const apply = useStore(projectNotesLifecycleStore, (store) => store.apply);
  const notesPanelActive = useRightPanelStore((store) =>
    active ? selectActiveRightPanel(store.byThreadKey, active.threadRef) === "notes" : false,
  );

  const transition = useCallback(
    (action: Parameters<typeof apply>[1]) => {
      if (active) apply(active, action);
    },
    [active, apply],
  );

  useEffect(() => {
    if (!active) return;
    transition("navigate");
  }, [active, transition]);

  useEffect(() => subscribeProjectNotesAction(() => transition("toggle")), [transition]);

  const context = active ? toProjectNotesLifecycleContext(active, notesPanelActive) : null;
  const presentation = context
    ? selectProjectNotesLifecyclePresentation(state, context)
    : { floating: null, panel: false };
  const pinned = context ? state.pinnedProjectKeys.includes(context.projectKey) : false;
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
  const onPanelClosed = useCallback(() => transition("panel-closed"), [transition]);

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
    onPanelClosed,
    open,
    panel,
    setPinned,
    toggle,
  };
}
