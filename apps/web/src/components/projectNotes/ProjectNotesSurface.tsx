import { useAtomValue } from "@effect/atom-react";
import {
  type EnvironmentId,
  type ProjectId,
  type ProjectNote,
  ProjectNoteConflictError,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { PanelRightIcon, PictureInPicture2Icon, PinIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { cn } from "~/lib/utils";
import { projectEnvironment } from "~/state/projects";
import { useAtomCommand } from "~/state/use-atom-command";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { Toggle } from "../ui/toggle";
import { ProjectNoteEditor } from "./ProjectNoteEditor";
import { ProjectNoteSaveFailure } from "./ProjectNoteSaveFailure";
import { PROJECT_NOTES_SURFACE_ID, type ProjectNotesDisplayMode } from "./projectNotesConstants";
import { projectNotePendingDraftStorageKey } from "~/projectNotesWindowState";
import * as Schema from "effect/Schema";
import {
  beginProjectNoteSave,
  confirmProjectNoteSave,
  conflictProjectNoteSave,
  editProjectNoteSaveSession,
  failProjectNoteSave,
  initializeProjectNoteSaveSession,
  keepProjectNoteDraft,
  readPendingProjectNoteDraft,
  type PendingProjectNoteDraft,
  type ProjectNoteSaveSession,
  reconcileLoadedProjectNote,
  reloadProjectNoteSaveSession,
  storePendingProjectNoteDraft,
} from "./projectNoteSaveState";
import { projectNoteDraftCoordinator } from "./projectNoteDraftCoordinator";
import { useProjectNotesWindow } from "./useProjectNotesWindow";

interface ProjectNotesSurfaceProps {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly projectName: string;
  readonly mode: ProjectNotesDisplayMode;
  readonly keepOpenAcrossThreads: boolean;
  readonly onModeChange: (mode: ProjectNotesDisplayMode) => void;
  readonly onKeepOpenAcrossThreadsChange: (keepOpen: boolean) => void;
  readonly onClose: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";
interface SaveState {
  readonly status: SaveStatus;
  readonly error: string | null;
  readonly conflict: ProjectNote | null;
}
const PROJECT_NOTES_KEYBOARD_HELP_ID = "project-notes-keyboard-help";
const isProjectNoteConflictError = Schema.is(ProjectNoteConflictError);

function noteKey(environmentId: EnvironmentId, projectId: ProjectId): string {
  return `${environmentId}:${projectId}`;
}

function errorMessage(error: unknown): string {
  const cause = Cause.squash(error as Cause.Cause<unknown>);
  return cause instanceof Error ? cause.message : "Could not save this note.";
}

function conflictFromCause(error: Cause.Cause<unknown>): ProjectNoteConflictError | null {
  const failure = Cause.squash(error);
  return isProjectNoteConflictError(failure) ? failure : null;
}

function readPendingDraft(key: string): PendingProjectNoteDraft | null {
  if (typeof window === "undefined") return null;
  return readPendingProjectNoteDraft(window.localStorage, key);
}

function storePendingDraft(key: string, draft: PendingProjectNoteDraft | null): boolean {
  if (typeof window === "undefined") return false;
  return storePendingProjectNoteDraft(window.localStorage, key, draft);
}

interface ProjectNotesHeaderProps {
  readonly projectName: string;
  readonly mode: ProjectNotesDisplayMode;
  readonly saveStatus: SaveStatus;
  readonly statusText: string;
  readonly onModeChange: (mode: ProjectNotesDisplayMode) => void;
  readonly onClose: () => void;
  readonly keepOpenAcrossThreads: boolean;
  readonly onKeepOpenAcrossThreadsChange: (keepOpen: boolean) => void;
  readonly onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

function ProjectNotesHeader({
  projectName,
  mode,
  saveStatus,
  statusText,
  onModeChange,
  onClose,
  keepOpenAcrossThreads,
  onKeepOpenAcrossThreadsChange,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
}: ProjectNotesHeaderProps) {
  const modeAction =
    mode === "panel"
      ? { label: "Open as floating window", next: "floating" as const }
      : { label: "Dock notes in side panel", next: "panel" as const };
  return (
    <>
      <div
        className={cn(
          "surface-subheader gap-1 px-2",
          mode === "floating" && "cursor-move touch-none",
        )}
        data-surface-subheader
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        role="group"
        tabIndex={mode === "floating" ? 0 : undefined}
        aria-label={mode === "floating" ? "Move or resize Project Notes window" : undefined}
        aria-describedby={mode === "floating" ? PROJECT_NOTES_KEYBOARD_HELP_ID : undefined}
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h2 className="shrink-0 text-sm font-medium">Project Notes</h2>
          <span className="truncate text-xs text-muted-foreground" title={projectName}>
            {projectName}
          </span>
        </div>
        {statusText ? (
          <span
            className={cn(
              "whitespace-nowrap text-xs text-muted-foreground",
              saveStatus === "error" && "text-destructive",
            )}
            aria-live="polite"
          >
            {statusText}
          </span>
        ) : null}
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                type="button"
                variant="ghost"
                size="xs"
                aria-label={
                  keepOpenAcrossThreads
                    ? "Stop keeping Notes open across threads"
                    : "Keep Notes open across threads"
                }
                pressed={keepOpenAcrossThreads}
                onPressedChange={onKeepOpenAcrossThreadsChange}
              >
                <PinIcon />
              </Toggle>
            }
          />
          <TooltipPopup>
            {keepOpenAcrossThreads
              ? "Pinned: Notes stay open when you change project threads"
              : "Keep Notes open when you change project threads"}
          </TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={modeAction.label}
                onClick={() => onModeChange(modeAction.next)}
              >
                {mode === "panel" ? <PictureInPicture2Icon /> : <PanelRightIcon />}
              </Button>
            }
          />
          <TooltipPopup>{modeAction.label}</TooltipPopup>
        </Tooltip>
        {mode === "floating" ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Close project notes"
                  onClick={onClose}
                >
                  <XIcon />
                </Button>
              }
            />
            <TooltipPopup>Close project notes</TooltipPopup>
          </Tooltip>
        ) : null}
      </div>
      {mode === "floating" ? (
        <p id={PROJECT_NOTES_KEYBOARD_HELP_ID} className="sr-only">
          Use arrow keys to move the window. Hold Alt and use arrow keys to resize it. Hold Shift
          for larger steps.
        </p>
      ) : null}
    </>
  );
}

function ProjectNoteConflictNotice({
  onReload,
  onKeepMine,
}: {
  readonly onReload: () => void;
  readonly onKeepMine: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-warning/20 bg-warning/5 px-3 py-2 text-xs"
      role="alert"
    >
      <p className="min-w-48 flex-1 text-warning">This note changed elsewhere.</p>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="xs" onClick={onReload}>
          Reload
        </Button>
        <Button type="button" variant="secondary" size="xs" onClick={onKeepMine}>
          Keep mine
        </Button>
      </div>
    </div>
  );
}

export function ProjectNotesSurface({
  environmentId,
  projectId,
  projectName,
  mode,
  keepOpenAcrossThreads,
  onModeChange,
  onKeepOpenAcrossThreadsChange,
  onClose,
}: ProjectNotesSurfaceProps) {
  const key = noteKey(environmentId, projectId);
  const [draftOwner] = useState(() => projectNoteDraftCoordinator.createOwner());
  const pendingDraftKey = projectNotePendingDraftStorageKey(environmentId, projectId);
  const queryAtom = useMemo(
    () => projectEnvironment.getNote({ environmentId, input: { projectId } }),
    [environmentId, projectId],
  );
  const query = useAtomValue(queryAtom);
  const loaded = Option.getOrNull(AsyncResult.value(query));
  const updateNote = useAtomCommand(projectEnvironment.updateNote, { reportFailure: false });
  const [initialSession] = useState(() => {
    const server = projectNoteDraftCoordinator.readServer(key);
    if (server === null) return null;
    return initializeProjectNoteSaveSession(
      server,
      projectNoteDraftCoordinator.read(key) ?? readPendingDraft(pendingDraftKey),
    );
  });
  const [markdown, setMarkdown] = useState(
    () => initialSession?.draft?.markdown ?? initialSession?.server.markdown ?? "",
  );
  const [saveState, setSaveState] = useState<SaveState>({
    status: initialSession?.conflict ? "conflict" : "idle",
    error: null,
    conflict: initialSession?.conflict ?? null,
  });
  const { status: saveStatus, error: saveError, conflict } = saveState;
  const [editorVersion, setEditorVersion] = useState(0);
  const saveSession = useRef<ProjectNoteSaveSession | null>(initialSession);
  const savePromise = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    if (!loaded) return;
    projectNoteDraftCoordinator.writeServer(key, loaded);
    if (saveSession.current !== null) {
      const current = saveSession.current;
      const next = reconcileLoadedProjectNote(current, loaded);
      if (next === current) return;
      saveSession.current = next;
      if (next.draft === null) {
        projectNoteDraftCoordinator.write(key, draftOwner, null);
        storePendingDraft(pendingDraftKey, null);
        setMarkdown(next.server.markdown);
        setEditorVersion((version) => version + 1);
      }
      setSaveState({
        status: next.conflict === null ? "idle" : "conflict",
        error: null,
        conflict: next.conflict,
      });
      return;
    }
    const session = initializeProjectNoteSaveSession(
      loaded,
      projectNoteDraftCoordinator.read(key) ?? readPendingDraft(pendingDraftKey),
    );
    saveSession.current = session;
    projectNoteDraftCoordinator.write(key, draftOwner, session.draft);
    storePendingDraft(pendingDraftKey, session.draft);
    setMarkdown(session.draft?.markdown ?? loaded.markdown);
    setSaveState({
      status: session.conflict === null ? "idle" : "conflict",
      error: null,
      conflict: session.conflict,
    });
  }, [draftOwner, key, loaded, pendingDraftKey]);

  const handleChange = useCallback(
    (nextMarkdown: string) => {
      const current = saveSession.current;
      if (current === null) return;
      const next = editProjectNoteSaveSession(current, nextMarkdown);
      saveSession.current = next;
      projectNoteDraftCoordinator.write(key, draftOwner, next.draft);
      const draftStored = storePendingDraft(pendingDraftKey, next.draft);
      setMarkdown(nextMarkdown);
      setSaveState((current) => ({
        ...current,
        status: current.conflict ? "conflict" : draftStored ? "idle" : "error",
        error: draftStored ? null : "Local draft recovery is unavailable.",
      }));
    },
    [draftOwner, key, pendingDraftKey],
  );

  const persistLatest = useCallback((): Promise<void> => {
    if (savePromise.current) return savePromise.current;

    const pending = (async () => {
      try {
        while (true) {
          const current = saveSession.current;
          if (current === null) return;
          const started = beginProjectNoteSave(current);
          saveSession.current = started.session;
          if (started.request === null) return;

          if (mounted.current) {
            setSaveState((state) => ({ ...state, status: "saving", error: null }));
          }
          const result = await updateNote({
            environmentId,
            input: { projectId, ...started.request },
          });

          if (result._tag === "Success") {
            const active = saveSession.current;
            if (active === null) return;
            const next = confirmProjectNoteSave(active, result.value);
            saveSession.current = next;
            projectNoteDraftCoordinator.writeServer(key, result.value);
            const stillOwnsDraft = projectNoteDraftCoordinator.replaceOwned(
              key,
              draftOwner,
              next.draft,
            );
            if (!stillOwnsDraft) return;
            storePendingDraft(pendingDraftKey, next.draft);
            if (mounted.current) {
              setSaveState({
                status: next.draft === null ? "saved" : "saving",
                error: null,
                conflict: null,
              });
            }
            continue;
          }

          const nextConflict = conflictFromCause(result.cause);
          if (nextConflict) {
            const active = saveSession.current;
            if (active === null) return;
            const next = conflictProjectNoteSave(active, nextConflict.current);
            saveSession.current = next;
            projectNoteDraftCoordinator.writeServer(key, nextConflict.current);
            if (mounted.current) {
              setSaveState({ status: "conflict", error: null, conflict: next.conflict });
            }
            return;
          }

          const active = saveSession.current;
          if (active === null) return;
          saveSession.current = failProjectNoteSave(active);
          if (mounted.current) {
            setSaveState({
              status: "error",
              error: errorMessage(result.cause),
              conflict: null,
            });
          }
          return;
        }
      } finally {
        savePromise.current = null;
      }
    })();
    savePromise.current = pending;
    return pending;
  }, [draftOwner, environmentId, key, pendingDraftKey, projectId, updateNote]);

  const flushPendingAutosave = useEffectEvent(() => persistLatest());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void flushPendingAutosave();
    };
  }, []);

  const changeMode = useCallback(
    async (nextMode: ProjectNotesDisplayMode) => {
      await persistLatest();
      onModeChange(nextMode);
    },
    [onModeChange, persistLatest],
  );

  useEffect(() => {
    if (saveSession.current === null || loaded === null || conflict !== null) return;
    const timer = window.setTimeout(() => {
      void persistLatest();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [conflict, loaded, markdown, persistLatest]);

  const reloadConflict = () => {
    const current = saveSession.current;
    if (current === null || current.conflict === null) return;
    const next = reloadProjectNoteSaveSession(current);
    saveSession.current = next;
    projectNoteDraftCoordinator.write(key, draftOwner, null);
    storePendingDraft(pendingDraftKey, null);
    setMarkdown(next.server.markdown);
    setSaveState({ status: "idle", error: null, conflict: null });
    setEditorVersion((current) => current + 1);
  };

  const keepLocalDraft = () => {
    const current = saveSession.current;
    if (current === null || current.conflict === null) return;
    const next = keepProjectNoteDraft(current);
    saveSession.current = next;
    if (next.draft !== null) {
      projectNoteDraftCoordinator.write(key, draftOwner, next.draft);
      storePendingDraft(pendingDraftKey, next.draft);
    }
    setSaveState({ status: "saving", error: null, conflict: null });
    void persistLatest();
  };

  const { rect, surfaceRef, beginDrag, moveDrag, endDrag, handleWindowKeyDown } =
    useProjectNotesWindow({ environmentId, projectId, mode });

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
    <aside
      id={PROJECT_NOTES_SURFACE_ID}
      ref={surfaceRef}
      onKeyDownCapture={(event) => {
        if (mode === "floating" && event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      className={
        mode === "floating"
          ? "fixed z-50 flex resize overflow-hidden rounded-xl border border-border bg-background shadow-md"
          : "flex h-full min-h-0 w-full bg-background"
      }
      style={
        mode === "floating"
          ? { left: rect.x, top: rect.y, width: rect.width, height: rect.height }
          : undefined
      }
      aria-label={`${projectName} notes`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <ProjectNotesHeader
          projectName={projectName}
          mode={mode}
          saveStatus={saveStatus}
          statusText={statusText}
          onModeChange={(nextMode) => void changeMode(nextMode)}
          onClose={onClose}
          keepOpenAcrossThreads={keepOpenAcrossThreads}
          onKeepOpenAcrossThreadsChange={onKeepOpenAcrossThreadsChange}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleWindowKeyDown}
        />
        {conflict !== null ? (
          <ProjectNoteConflictNotice onReload={reloadConflict} onKeepMine={keepLocalDraft} />
        ) : null}
        {saveStatus === "error" ? (
          <ProjectNoteSaveFailure
            error={saveError ?? "Could not save this note."}
            onRetry={() => void persistLatest()}
          />
        ) : null}
        {queryError ? (
          <div className="m-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <p>{queryError}</p>
          </div>
        ) : saveSession.current === null ? (
          <div className="space-y-3 p-4" aria-label="Loading project note">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <ProjectNoteEditor
            key={`${key}:${editorVersion}`}
            initialMarkdown={markdown}
            onChange={handleChange}
          />
        )}
      </div>
    </aside>
  );

  return surface;
}
