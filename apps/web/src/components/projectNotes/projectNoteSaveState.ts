import type { ProjectNote } from "@t3tools/contracts";

export interface PendingProjectNoteDraft {
  readonly version: 1;
  readonly markdown: string;
  readonly baseRevision: number | null;
}

export interface ProjectNoteSaveRequest {
  readonly markdown: string;
  readonly expectedRevision: number;
}

export interface ProjectNoteSaveSession {
  readonly server: ProjectNote;
  readonly draft: PendingProjectNoteDraft | null;
  readonly inFlight: ProjectNoteSaveRequest | null;
  readonly conflict: ProjectNote | null;
}

export function parsePendingProjectNoteDraft(
  stored: string | null,
): PendingProjectNoteDraft | null {
  if (stored === null) return null;

  try {
    const value = JSON.parse(stored) as Partial<PendingProjectNoteDraft>;
    if (
      value.version === 1 &&
      typeof value.markdown === "string" &&
      (typeof value.baseRevision === "number" || value.baseRevision === null)
    ) {
      return value as PendingProjectNoteDraft;
    }
  } catch {
    // Treat the previous raw Markdown format as a draft with an unknown base.
  }

  return { version: 1, markdown: stored, baseRevision: null };
}

export function serializePendingProjectNoteDraft(draft: PendingProjectNoteDraft): string {
  return JSON.stringify(draft);
}

export interface ProjectNoteDraftStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

export function readPendingProjectNoteDraft(
  storage: ProjectNoteDraftStorage,
  key: string,
): PendingProjectNoteDraft | null {
  try {
    return parsePendingProjectNoteDraft(storage.getItem(key));
  } catch {
    return null;
  }
}

export function storePendingProjectNoteDraft(
  storage: ProjectNoteDraftStorage,
  key: string,
  draft: PendingProjectNoteDraft | null,
): boolean {
  try {
    if (draft === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, serializePendingProjectNoteDraft(draft));
    }
    return true;
  } catch {
    return false;
  }
}

export function initializeProjectNoteSaveSession(
  server: ProjectNote,
  pendingDraft: PendingProjectNoteDraft | null,
): ProjectNoteSaveSession {
  if (pendingDraft === null || pendingDraft.markdown === server.markdown) {
    return { server, draft: null, inFlight: null, conflict: null };
  }

  return {
    server,
    draft: pendingDraft,
    inFlight: null,
    conflict: pendingDraft.baseRevision === server.revision ? null : server,
  };
}

export function reconcileLoadedProjectNote(
  session: ProjectNoteSaveSession,
  server: ProjectNote,
): ProjectNoteSaveSession {
  if (server.revision <= session.server.revision || session.inFlight !== null) return session;

  if (session.draft === null) {
    return { server, draft: null, inFlight: null, conflict: null };
  }

  return {
    ...session,
    server,
    conflict: session.draft.baseRevision === server.revision ? null : server,
  };
}

export function editProjectNoteSaveSession(
  session: ProjectNoteSaveSession,
  markdown: string,
): ProjectNoteSaveSession {
  if (markdown === session.server.markdown && session.inFlight === null) {
    return { ...session, draft: null };
  }

  return {
    ...session,
    draft: {
      version: 1,
      markdown,
      baseRevision: session.server.revision,
    },
  };
}

export function beginProjectNoteSave(session: ProjectNoteSaveSession): {
  readonly session: ProjectNoteSaveSession;
  readonly request: ProjectNoteSaveRequest | null;
} {
  if (session.draft === null || session.inFlight !== null || session.conflict !== null) {
    return { session, request: null };
  }

  const request = {
    markdown: session.draft.markdown,
    expectedRevision: session.server.revision,
  };
  return {
    session: { ...session, inFlight: request },
    request,
  };
}

export function confirmProjectNoteSave(
  session: ProjectNoteSaveSession,
  server: ProjectNote,
): ProjectNoteSaveSession {
  if (session.inFlight === null) return session;

  const draft =
    session.draft?.markdown === session.inFlight.markdown
      ? null
      : session.draft === null
        ? null
        : { ...session.draft, baseRevision: server.revision };

  return { server, draft, inFlight: null, conflict: null };
}

export function failProjectNoteSave(session: ProjectNoteSaveSession): ProjectNoteSaveSession {
  return { ...session, inFlight: null };
}

export function conflictProjectNoteSave(
  session: ProjectNoteSaveSession,
  server: ProjectNote,
): ProjectNoteSaveSession {
  return { ...session, server, inFlight: null, conflict: server };
}

export function reloadProjectNoteSaveSession(
  session: ProjectNoteSaveSession,
): ProjectNoteSaveSession {
  if (session.conflict === null) return session;
  return {
    server: session.conflict,
    draft: null,
    inFlight: null,
    conflict: null,
  };
}

export function keepProjectNoteDraft(session: ProjectNoteSaveSession): ProjectNoteSaveSession {
  if (session.conflict === null || session.draft === null) return session;
  return {
    server: session.conflict,
    draft: { ...session.draft, baseRevision: session.conflict.revision },
    inFlight: null,
    conflict: null,
  };
}
