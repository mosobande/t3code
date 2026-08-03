// @effect-diagnostics deterministicKeys:off - This fork-owned service intentionally uses the SIGIDI namespace.
import {
  type ProjectNote,
  ProjectNoteConflictError,
  type ProjectNoteGetInput,
  type ProjectNoteUpdateInput,
  ProjectNoteStorageError,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export interface ProjectNoteStoreShape {
  readonly get: (input: ProjectNoteGetInput) => Effect.Effect<ProjectNote, ProjectNoteStorageError>;
  readonly update: (
    input: ProjectNoteUpdateInput,
  ) => Effect.Effect<ProjectNote, ProjectNoteStorageError | ProjectNoteConflictError>;
}

export class ProjectNoteStore extends Context.Service<ProjectNoteStore, ProjectNoteStoreShape>()(
  "sigidi/projectNotes/ProjectNoteStore",
) {
  static readonly layer = Layer.effect(
    ProjectNoteStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const get = Effect.fn("ProjectNoteStore.get")(function* ({ projectId }: ProjectNoteGetInput) {
        const rows = yield* sql<ProjectNote>`
          SELECT
            project_id AS "projectId",
            markdown,
            updated_at AS "updatedAt",
            revision
          FROM sigidi_project_notes
          WHERE project_id = ${projectId}
        `.pipe(
          Effect.mapError(
            (cause) =>
              new ProjectNoteStorageError({
                operation: "get",
                projectId,
                message: String(cause),
              }),
          ),
        );
        return (
          rows[0] ?? {
            projectId,
            markdown: "",
            updatedAt: null,
            revision: 0,
          }
        );
      });

      const update = Effect.fn("ProjectNoteStore.update")(function* ({
        projectId,
        markdown,
        expectedRevision,
      }: ProjectNoteUpdateInput) {
        if (expectedRevision === 0 && markdown === "") {
          const current = yield* get({ projectId });
          if (current.markdown === markdown) return current;
        }
        const updatedAt = DateTime.formatIso(yield* DateTime.now);
        const mapUpdateError = Effect.mapError(
          (cause) =>
            new ProjectNoteStorageError({
              operation: "update",
              projectId,
              message: String(cause),
            }),
        );
        const rows =
          expectedRevision === 0
            ? yield* sql<ProjectNote>`
                INSERT INTO sigidi_project_notes (project_id, markdown, updated_at, revision)
                VALUES (${projectId}, ${markdown}, ${updatedAt}, 1)
                ON CONFLICT (project_id) DO NOTHING
                RETURNING
                  project_id AS "projectId",
                  markdown,
                  updated_at AS "updatedAt",
                  revision
              `.pipe(mapUpdateError)
            : yield* sql<ProjectNote>`
                UPDATE sigidi_project_notes
                SET
                  markdown = ${markdown},
                  updated_at = ${updatedAt},
                  revision = revision + 1
                WHERE project_id = ${projectId}
                  AND revision = ${expectedRevision}
                  AND markdown <> ${markdown}
                RETURNING
                  project_id AS "projectId",
                  markdown,
                  updated_at AS "updatedAt",
                  revision
              `.pipe(mapUpdateError);
        const saved = rows[0];
        if (saved) return saved;

        const current = yield* get({ projectId });
        if (current.markdown === markdown) return current;
        return yield* new ProjectNoteConflictError({
          projectId,
          expectedRevision,
          current,
        });
      });

      return ProjectNoteStore.of({ get, update });
    }),
  );
}
