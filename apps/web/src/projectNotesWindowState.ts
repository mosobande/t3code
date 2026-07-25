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

export function clampProjectNotesWindowRect(
  rect: ProjectNotesWindowRect,
  viewport: { width: number; height: number },
): ProjectNotesWindowRect {
  const maximumWidth = Math.max(MIN_WIDTH, viewport.width - VIEWPORT_MARGIN * 2);
  const maximumHeight = Math.max(MIN_HEIGHT, viewport.height - VIEWPORT_MARGIN * 2);
  const width = Math.min(Math.max(rect.width, MIN_WIDTH), maximumWidth);
  const height = Math.min(Math.max(rect.height, MIN_HEIGHT), maximumHeight);
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
