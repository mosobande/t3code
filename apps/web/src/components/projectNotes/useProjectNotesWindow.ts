import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  adjustProjectNotesWindowRect,
  clampProjectNotesWindowRect,
  DEFAULT_PROJECT_NOTES_WINDOW_RECT,
  type ProjectNotesWindowRect,
  ProjectNotesWindowRect as ProjectNotesWindowRectSchema,
  projectNotesWindowStorageKey,
} from "~/projectNotesWindowState";

type ProjectNotesWindowMode = "panel" | "floating";

const decodeProjectNotesWindowRect = Schema.decodeUnknownSync(ProjectNotesWindowRectSchema);

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
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

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
    window.localStorage.setItem(storageKey, JSON.stringify(rect));
  }, [mode, rect, storageKey]);

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
    if (mode !== "floating" || (event.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.x,
      offsetY: event.clientY - rect.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setRect((current) =>
      clampProjectNotesWindowRect(
        {
          ...current,
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY,
        },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
