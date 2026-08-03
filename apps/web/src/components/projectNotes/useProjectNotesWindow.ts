import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  adjustProjectNotesWindowRect,
  clampProjectNotesWindowRect,
  DEFAULT_PROJECT_NOTES_WINDOW_RECT,
  type ProjectNotesWindowRect,
  ProjectNotesWindowRect as ProjectNotesWindowRectSchema,
  persistProjectNotesWindowRect,
  projectNotesWindowStorageKey,
} from "~/projectNotesWindowState";

type ProjectNotesWindowMode = "panel" | "floating";

const decodeProjectNotesWindowRect = Schema.decodeUnknownSync(ProjectNotesWindowRectSchema);
const WINDOW_RECT_PERSIST_DELAY_MS = 150;

interface ProjectNotesWindowDrag {
  readonly pointerId: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly startRect: ProjectNotesWindowRect;
  readonly target: HTMLDivElement;
  pendingX: number;
  pendingY: number;
  animationFrameId: number | null;
}

function readSavedRect(key: string): ProjectNotesWindowRect {
  if (typeof window === "undefined") return DEFAULT_PROJECT_NOTES_WINDOW_RECT;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return decodeProjectNotesWindowRect(parsed);
  } catch {
    return DEFAULT_PROJECT_NOTES_WINDOW_RECT;
  }
}

export function useProjectNotesWindow({
  environmentId,
  projectId,
  mode,
}: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly mode: ProjectNotesWindowMode;
}) {
  const storageKey = projectNotesWindowStorageKey(environmentId, projectId);
  const [rect, setRect] = useState(() =>
    clampProjectNotesWindowRect(readSavedRect(storageKey), {
      width: typeof window === "undefined" ? 1280 : window.innerWidth,
      height: typeof window === "undefined" ? 800 : window.innerHeight,
    }),
  );
  const rectRef = useRef(rect);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<ProjectNotesWindowDrag | null>(null);

  useLayoutEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useLayoutEffect(() => {
    if (mode !== "floating" || !surfaceRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const bounds = surfaceRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setRect((current) => {
        const width = Math.round(bounds.width);
        const height = Math.round(bounds.height);
        const next = clampProjectNotesWindowRect(
          { ...current, width, height },
          { width: window.innerWidth, height: window.innerHeight },
        );
        return current.x === next.x &&
          current.y === next.y &&
          current.width === next.width &&
          current.height === next.height
          ? current
          : next;
      });
    });
    observer.observe(surfaceRef.current);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode !== "floating") return;
    const timer = window.setTimeout(() => {
      persistProjectNotesWindowRect(window.localStorage, storageKey, rect);
    }, WINDOW_RECT_PERSIST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mode, rect, storageKey]);

  useEffect(
    () => () => {
      const drag = dragRef.current;
      if (drag && drag.animationFrameId !== null) {
        window.cancelAnimationFrame(drag.animationFrameId);
      }
      if (mode === "floating") {
        persistProjectNotesWindowRect(window.localStorage, storageKey, rectRef.current);
      }
    },
    [mode, storageKey],
  );

  useEffect(() => {
    if (mode !== "floating") return;
    const handleResize = () =>
      setRect((current) =>
        clampProjectNotesWindowRect(current, {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mode]);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      mode !== "floating" ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button")
    ) {
      return;
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.x,
      offsetY: event.clientY - rect.y,
      startRect: rect,
      target: event.currentTarget,
      pendingX: rect.x,
      pendingY: rect.y,
      animationFrameId: null,
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.pendingX = event.clientX - drag.offsetX;
    drag.pendingY = event.clientY - drag.offsetY;
    if (drag.animationFrameId !== null) return;
    drag.animationFrameId = window.requestAnimationFrame(() => {
      const active = dragRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      active.animationFrameId = null;
      setRect((current) =>
        clampProjectNotesWindowRect(
          { ...current, x: active.pendingX, y: active.pendingY },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.animationFrameId !== null) {
      window.cancelAnimationFrame(drag.animationFrameId);
    }
    try {
      if (drag.target.hasPointerCapture(event.pointerId)) {
        drag.target.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The browser may release pointer capture before the terminal event arrives.
    }
    const finalRect =
      event.type === "pointercancel"
        ? drag.startRect
        : clampProjectNotesWindowRect(
            { ...rectRef.current, x: drag.pendingX, y: drag.pendingY },
            { width: window.innerWidth, height: window.innerHeight },
          );
    rectRef.current = finalRect;
    setRect(finalRect);
    persistProjectNotesWindowRect(window.localStorage, storageKey, finalRect);
  };

  const handleWindowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      mode !== "floating" ||
      event.target !== event.currentTarget ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      return;
    }
    event.preventDefault();
    const amount = event.shiftKey ? 48 : 16;
    const horizontal =
      event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const vertical = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    setRect((current) =>
      adjustProjectNotesWindowRect(
        current,
        event.altKey
          ? { x: 0, y: 0, width: horizontal, height: vertical }
          : { x: horizontal, y: vertical, width: 0, height: 0 },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  };

  return {
    rect,
    surfaceRef,
    beginDrag,
    moveDrag,
    endDrag,
    handleWindowKeyDown,
  };
}
