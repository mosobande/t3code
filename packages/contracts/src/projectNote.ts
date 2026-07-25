import * as Schema from "effect/Schema";

import { IsoDateTime, ProjectId } from "./baseSchemas.ts";

export const ProjectNote = Schema.Struct({
  projectId: ProjectId,
  markdown: Schema.String,
  updatedAt: Schema.NullOr(IsoDateTime),
});
export type ProjectNote = typeof ProjectNote.Type;

export const ProjectNoteGetInput = Schema.Struct({
  projectId: ProjectId,
});
export type ProjectNoteGetInput = typeof ProjectNoteGetInput.Type;

export const ProjectNoteUpdateInput = Schema.Struct({
  projectId: ProjectId,
  markdown: Schema.String,
});
export type ProjectNoteUpdateInput = typeof ProjectNoteUpdateInput.Type;

export class ProjectNoteStorageError extends Schema.TaggedErrorClass<ProjectNoteStorageError>()(
  "ProjectNoteStorageError",
  {
    operation: Schema.Literals(["get", "update"]),
    projectId: ProjectId,
    message: Schema.String,
  },
) {}
