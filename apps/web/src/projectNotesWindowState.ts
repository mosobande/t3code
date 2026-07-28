import * as Schema from "effect/Schema";

export const ProjectNotesWindowRect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});
export type ProjectNotesWindowRect = typeof ProjectNotesWindowRect.Type;

export const DEFAULT_PROJECT_NOTES_WINDOW_RECT: ProjectNotesWindowRect = {
  x: 80,
  y: 80,
  width: 460,
  height: 560,
};

const MIN_WIDTH = 320;
const MIN_HEIGHT = 280;
const VIEWPORT_MARGIN = 16;

export function projectNotesWindowStorageKey(environmentId: string, projectId: string): string {
  return `t3.project-notes.window.v1:${environmentId}:${projectId}`;
}

export function projectNotePendingDraftStorageKey(
  environmentId: string,
  projectId: string,
): string {
  return `t3.project-notes.pending-draft.v1:${environmentId}:${projectId}`;
}

export type ProjectNotesNavigationAction = "stay" | "carry" | "leave" | "close";

export function resolveProjectNotesNavigation(input: {
  ownerProjectKey: string | null;
  activeProjectKey: string | null;
  ownerThreadKey: string | null;
  activeThreadKey: string | null;
  keepOpenAcrossThreads: boolean;
}): {
  action: ProjectNotesNavigationAction;
  resetKeepOpen: boolean;
} {
  if (input.ownerProjectKey === null || input.ownerThreadKey === null) {
    return { action: "stay", resetKeepOpen: false };
  }
  if (input.activeProjectKey !== input.ownerProjectKey) {
    return { action: "close", resetKeepOpen: true };
  }
  if (input.activeThreadKey === input.ownerThreadKey) {
    return { action: "stay", resetKeepOpen: false };
  }
  return input.keepOpenAcrossThreads
    ? { action: "carry", resetKeepOpen: false }
    : { action: "leave", resetKeepOpen: false };
}

export function clampProjectNotesWindowRect(
  rect: ProjectNotesWindowRect,
  viewport: { width: number; height: number },
): ProjectNotesWindowRect {
  const maximumWidth = Math.max(1, viewport.width - VIEWPORT_MARGIN * 2);
  const maximumHeight = Math.max(1, viewport.height - VIEWPORT_MARGIN * 2);
  const minimumWidth = Math.min(MIN_WIDTH, maximumWidth);
  const minimumHeight = Math.min(MIN_HEIGHT, maximumHeight);
  const width = Math.min(Math.max(rect.width, minimumWidth), maximumWidth);
  const height = Math.min(Math.max(rect.height, minimumHeight), maximumHeight);
  return {
    x: Math.min(
      Math.max(rect.x, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, viewport.width - width - VIEWPORT_MARGIN),
    ),
    y: Math.min(
      Math.max(rect.y, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, viewport.height - height - VIEWPORT_MARGIN),
    ),
    width,
    height,
  };
}

export function adjustProjectNotesWindowRect(
  rect: ProjectNotesWindowRect,
  adjustment: ProjectNotesWindowRect,
  viewport: { width: number; height: number },
): ProjectNotesWindowRect {
  return clampProjectNotesWindowRect(
    {
      x: rect.x + adjustment.x,
      y: rect.y + adjustment.y,
      width: rect.width + adjustment.width,
      height: rect.height + adjustment.height,
    },
    viewport,
  );
}
