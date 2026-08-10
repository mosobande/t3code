export interface ProjectNotesLifecycleProject {
  readonly environmentId: string;
  readonly projectId: string;
  readonly projectName: string;
}

export interface ProjectNotesLifecycleContext {
  readonly projectKey: string;
  readonly project: ProjectNotesLifecycleProject;
  readonly threadKey: string;
  readonly threadRef: {
    readonly environmentId: string;
    readonly threadId: string;
  };
  readonly notesPanelActive: boolean;
}

interface ProjectNotesFloatingOwner {
  readonly ownerThreadKey: string;
  readonly project: ProjectNotesLifecycleProject;
}

export interface ProjectNotesLifecycleState {
  readonly floating: ProjectNotesFloatingOwner | null;
  readonly pinnedProjectKeys: readonly string[];
}

export type ProjectNotesLifecycleAction =
  | "close"
  | "float"
  | "navigate"
  | "open"
  | "panel"
  | "pin"
  | "toggle"
  | "unpin";

export type ProjectNotesLifecycleEffect =
  | { readonly type: "close-panel"; readonly threadRef: ProjectNotesLifecycleContext["threadRef"] }
  | { readonly type: "open-panel"; readonly threadRef: ProjectNotesLifecycleContext["threadRef"] };

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
  return { floating: null, pinnedProjectKeys: [] };
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
  return state.floating?.ownerThreadKey === context.threadKey;
}

function presentationFor(
  state: ProjectNotesLifecycleState,
  context: ProjectNotesLifecycleContext,
): ProjectNotesLifecyclePresentation {
  const ownerFloating = isFloatingOwner(state, context);
  return {
    floating: ownerFloating ? (state.floating?.project ?? null) : null,
    panel: context.notesPanelActive && !ownerFloating,
  };
}

function result(
  state: ProjectNotesLifecycleState,
  context: ProjectNotesLifecycleContext,
  effects: readonly ProjectNotesLifecycleEffect[] = [],
): ProjectNotesLifecycleTransition {
  return { state, effects, presentation: presentationFor(state, context) };
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
        isFloatingOwner(state, context) ? { ...state, floating: null } : state,
        context.projectKey,
        false,
      );
      return result(
        nextState,
        context,
        context.notesPanelActive ? [{ type: "close-panel", threadRef: context.threadRef }] : [],
      );
    }
    case "pin":
      return result(withPin(state, context.projectKey, true), context);
    case "unpin":
      return result(withPin(state, context.projectKey, false), context);
    case "float": {
      if (isFloatingOwner(state, context)) return result(state, context);
      const nextState: ProjectNotesLifecycleState = {
        ...state,
        floating: {
          ownerThreadKey: context.threadKey,
          project: context.project,
        },
      };
      return result(
        nextState,
        context,
        context.notesPanelActive ? [{ type: "close-panel", threadRef: context.threadRef }] : [],
      );
    }
    case "panel": {
      const nextState = isFloatingOwner(state, context) ? { ...state, floating: null } : state;
      return result(nextState, context, [{ type: "open-panel", threadRef: context.threadRef }]);
    }
  }
}
