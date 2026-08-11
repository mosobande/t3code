import type { EnvironmentId, ProjectId, ScopedThreadRef } from "@t3tools/contracts";

export interface ProjectNotesLifecycleProject {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly projectName: string;
}

export interface ProjectNotesLifecycleContext {
  readonly projectKey: string;
  readonly project: ProjectNotesLifecycleProject;
  readonly threadKey: string;
  readonly threadRef: ScopedThreadRef;
  readonly notesPanelActive: boolean;
}

export interface ProjectNotesLifecycleState {
  readonly floatingByThreadKey: Readonly<Record<string, ProjectNotesLifecycleProject>>;
  readonly pinnedProjectKeys: readonly string[];
}

export type ProjectNotesLifecycleAction =
  | "close"
  | "float"
  | "navigate"
  | "open"
  | "panel"
  | "panel-closed"
  | "pin"
  | "toggle"
  | "unpin";

export type ProjectNotesLifecycleEffect =
  | { readonly type: "close-panel"; readonly threadRef: ScopedThreadRef }
  | { readonly type: "open-panel"; readonly threadRef: ScopedThreadRef };

export interface ProjectNotesLifecyclePresentation {
  readonly floating: ProjectNotesLifecycleProject | null;
  readonly panel: boolean;
}

export interface ProjectNotesLifecycleTransition {
  readonly effects: readonly ProjectNotesLifecycleEffect[];
  readonly presentation: ProjectNotesLifecyclePresentation;
  readonly state: ProjectNotesLifecycleState;
}

export function createProjectNotesLifecycleState(): ProjectNotesLifecycleState {
  return { floatingByThreadKey: {}, pinnedProjectKeys: [] };
}

function isPinned(state: ProjectNotesLifecycleState, projectKey: string): boolean {
  return state.pinnedProjectKeys.includes(projectKey);
}

function withPin(
  state: ProjectNotesLifecycleState,
  projectKey: string,
  pinned: boolean,
): ProjectNotesLifecycleState {
  const currentlyPinned = isPinned(state, projectKey);
  if (currentlyPinned === pinned) return state;
  return {
    ...state,
    pinnedProjectKeys: pinned
      ? [...state.pinnedProjectKeys, projectKey]
      : state.pinnedProjectKeys.filter((key) => key !== projectKey),
  };
}

function isFloatingOwner(
  state: ProjectNotesLifecycleState,
  context: ProjectNotesLifecycleContext,
): boolean {
  return state.floatingByThreadKey[context.threadKey] !== undefined;
}

function withoutFloatingOwner(
  state: ProjectNotesLifecycleState,
  threadKey: string,
): ProjectNotesLifecycleState {
  if (state.floatingByThreadKey[threadKey] === undefined) return state;
  const { [threadKey]: _removed, ...floatingByThreadKey } = state.floatingByThreadKey;
  return { ...state, floatingByThreadKey };
}

export function selectProjectNotesLifecyclePresentation(
  state: ProjectNotesLifecycleState,
  context: ProjectNotesLifecycleContext,
): ProjectNotesLifecyclePresentation {
  const ownerFloating = isFloatingOwner(state, context);
  return {
    floating: ownerFloating ? (state.floatingByThreadKey[context.threadKey] ?? null) : null,
    panel: context.notesPanelActive && !ownerFloating,
  };
}

function result(
  state: ProjectNotesLifecycleState,
  context: ProjectNotesLifecycleContext,
  effects: readonly ProjectNotesLifecycleEffect[] = [],
): ProjectNotesLifecycleTransition {
  return {
    state,
    effects,
    presentation: selectProjectNotesLifecyclePresentation(state, context),
  };
}

export function transitionProjectNotesLifecycle(
  state: ProjectNotesLifecycleState,
  context: ProjectNotesLifecycleContext,
  action: ProjectNotesLifecycleAction,
): ProjectNotesLifecycleTransition {
  switch (action) {
    case "navigate":
      if (isPinned(state, context.projectKey) && !isFloatingOwner(state, context)) {
        return result(state, context, [{ type: "open-panel", threadRef: context.threadRef }]);
      }
      return result(state, context);
    case "open":
      if (isFloatingOwner(state, context)) return result(state, context);
      return result(state, context, [{ type: "open-panel", threadRef: context.threadRef }]);
    case "toggle":
      return transitionProjectNotesLifecycle(
        state,
        context,
        isFloatingOwner(state, context) || context.notesPanelActive ? "close" : "open",
      );
    case "close": {
      const nextState = withPin(
        withoutFloatingOwner(state, context.threadKey),
        context.projectKey,
        false,
      );
      return result(
        nextState,
        context,
        context.notesPanelActive ? [{ type: "close-panel", threadRef: context.threadRef }] : [],
      );
    }
    case "panel-closed":
      return result(withPin(state, context.projectKey, false), context);
    case "pin":
      return result(withPin(state, context.projectKey, true), context);
    case "unpin":
      return result(withPin(state, context.projectKey, false), context);
    case "float": {
      if (isFloatingOwner(state, context)) return result(state, context);
      const nextState: ProjectNotesLifecycleState = {
        ...state,
        floatingByThreadKey: {
          ...state.floatingByThreadKey,
          [context.threadKey]: context.project,
        },
      };
      return result(
        nextState,
        context,
        context.notesPanelActive ? [{ type: "close-panel", threadRef: context.threadRef }] : [],
      );
    }
    case "panel": {
      const nextState = withoutFloatingOwner(state, context.threadKey);
      return result(nextState, context, [{ type: "open-panel", threadRef: context.threadRef }]);
    }
  }
}
