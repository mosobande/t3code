import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { Maximize2Icon, PanelRightCloseIcon, PanelRightOpenIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { projectEnvironment } from "~/state/projects";
import { useAtomCommand } from "~/state/use-atom-command";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { ProjectNoteEditor } from "./ProjectNoteEditor";
import {
  clampProjectNotesWindowRect,
  DEFAULT_PROJECT_NOTES_WINDOW_RECT,
  type ProjectNotesWindowRect,
  ProjectNotesWindowRect as ProjectNotesWindowRectSchema,
  projectNotesWindowStorageKey,
} from "~/projectNotesWindowState";
import * as Schema from "effect/Schema";

export type ProjectNotesDisplayMode = "panel" | "floating";

interface ProjectNotesSurfaceProps {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly projectName: string;
  readonly mode: ProjectNotesDisplayMode;
  readonly onModeChange: (mode: ProjectNotesDisplayMode) => void;
  readonly onClose: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
const drafts = new Map<string, string>();

function noteKey(environmentId: EnvironmentId, projectId: ProjectId): string {
  return `${environmentId}:${projectId}`;
}

function readSavedRect(key: string): ProjectNotesWindowRect {
  if (typeof window === "undefined") return DEFAULT_PROJECT_NOTES_WINDOW_RECT;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return Schema.decodeUnknownSync(ProjectNotesWindowRectSchema)(parsed);
  } catch {
    return DEFAULT_PROJECT_NOTES_WINDOW_RECT;
  }
}

function errorMessage(error: unknown): string {
  const cause = Cause.squash(error as Cause.Cause<unknown>);
  return cause instanceof Error ? cause.message : "Could not save this note.";
}

export function ProjectNotesSurface({
  environmentId,
  projectId,
  projectName,
  mode,
  onModeChange,
  onClose,
}: ProjectNotesSurfaceProps) {
  const key = noteKey(environmentId, projectId);
  const queryAtom = useMemo(
    () => projectEnvironment.getNote({ environmentId, input: { projectId } }),
    [environmentId, projectId],
  );
  const query = useAtomValue(queryAtom);
  const loaded = Option.getOrNull(AsyncResult.value(query));
  const updateNote = useAtomCommand(projectEnvironment.updateNote, { reportFailure: false });
  const [markdown, setMarkdown] = useState(() => drafts.get(key) ?? "");
  const [initializedKey, setInitializedKey] = useState<string | null>(() =>
    drafts.has(key) ? key : null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveRevision = useRef(0);

  useEffect(() => {
    if (!loaded || initializedKey === key) return;
    const next = drafts.get(key) ?? loaded.markdown;
    drafts.set(key, next);
    setMarkdown(next);
    setInitializedKey(key);
  }, [initializedKey, key, loaded]);

  const handleChange = useCallback(
    (nextMarkdown: string) => {
      drafts.set(key, nextMarkdown);
      setMarkdown(nextMarkdown);
      setSaveStatus("idle");
      setSaveError(null);
      saveRevision.current += 1;
    },
    [key],
  );

  useEffect(() => {
    if (initializedKey !== key || loaded === null || markdown === loaded.markdown) return;
    const revision = saveRevision.current;
    const timer = window.setTimeout(() => {
      setSaveStatus("saving");
      void updateNote({
        environmentId,
        input: { projectId, markdown },
      }).then((result) => {
        if (revision !== saveRevision.current) return;
        if (result._tag === "Success") {
          setSaveStatus("saved");
          return;
        }
        setSaveStatus("error");
        setSaveError(errorMessage(result.cause));
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [environmentId, initializedKey, key, loaded, markdown, projectId, updateNote]);

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
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setRect((current) => ({
        ...current,
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }));
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

  const statusText =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "";
  const queryError = query._tag === "Failure" ? errorMessage(query.cause) : null;

  const surface = (
    <div
      ref={surfaceRef}
      className={
        mode === "floating"
          ? "fixed z-50 flex min-h-70 min-w-80 resize overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          : "flex h-full min-h-0 w-96 max-w-[42vw] border-l border-border bg-background"
      }
      style={
        mode === "floating"
          ? { left: rect.x, top: rect.y, width: rect.width, height: rect.height }
          : undefined
      }
      role="complementary"
      aria-label={`${projectName} notes`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={
            mode === "floating"
              ? "flex cursor-move touch-none items-center gap-2 border-b border-border px-3 py-2"
              : "flex items-center gap-2 border-b border-border px-3 py-2"
          }
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">Project notes</h2>
            <p className="truncate text-xs text-muted-foreground">{projectName}</p>
          </div>
          <span
            className={
              saveStatus === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"
            }
            title={saveError ?? undefined}
            aria-live="polite"
          >
            {statusText}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={mode === "panel" ? "Open as floating window" : "Dock notes in side panel"}
            onClick={() => onModeChange(mode === "panel" ? "floating" : "panel")}
          >
            {mode === "panel" ? <Maximize2Icon /> : <PanelRightOpenIcon />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close project notes"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
        {queryError ? (
          <div className="m-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <p>{queryError}</p>
          </div>
        ) : initializedKey !== key ? (
          <div className="space-y-3 p-4" aria-label="Loading project note">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <ProjectNoteEditor key={key} initialMarkdown={markdown} onChange={handleChange} />
        )}
      </div>
    </div>
  );

  return surface;
}
