"use client";

export type ProjectNotesAction = "toggle";

const EVENT_NAME = "t3code:project-notes-action";

function resolveTarget(target: EventTarget | undefined): EventTarget | null {
  if (target) return target;
  return typeof window === "undefined" ? null : window;
}

export function dispatchProjectNotesAction(action: ProjectNotesAction, target?: EventTarget): void {
  resolveTarget(target)?.dispatchEvent(
    new CustomEvent<ProjectNotesAction>(EVENT_NAME, { detail: action }),
  );
}

export function subscribeProjectNotesAction(
  listener: (action: ProjectNotesAction) => void,
  target?: EventTarget,
): () => void {
  const resolvedTarget = resolveTarget(target);
  if (!resolvedTarget) return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ProjectNotesAction>).detail;
    if (detail === "toggle") listener(detail);
  };
  resolvedTarget.addEventListener(EVENT_NAME, handler);
  return () => resolvedTarget.removeEventListener(EVENT_NAME, handler);
}
