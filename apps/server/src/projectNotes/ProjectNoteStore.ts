import {
  type ProjectNote,
  type ProjectNoteGetInput,
  type ProjectNoteUpdateInput,
  ProjectNoteStorageError,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export interface ProjectNoteStoreShape {
  readonly get: (input: ProjectNoteGetInput) => Effect.Effect<ProjectNote, ProjectNoteStorageError>;
  readonly update: (
    input: ProjectNoteUpdateInput,
  ) => Effect.Effect<ProjectNote, ProjectNoteStorageError>;
}

export class ProjectNoteStore extends Context.Service<ProjectNoteStore, ProjectNoteStoreShape>()(
  "t3/projectNotes/ProjectNoteStore",
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
            updated_at AS "updatedAt"
          FROM project_notes
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
          }
        );
      });

      const update = Effect.fn("ProjectNoteStore.update")(function* ({
        projectId,
        markdown,
      }: ProjectNoteUpdateInput) {
        const updatedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
        yield* sql`
          INSERT INTO project_notes (project_id, markdown, updated_at)
          VALUES (${projectId}, ${markdown}, ${updatedAt})
          ON CONFLICT (project_id)
          DO UPDATE SET
            markdown = excluded.markdown,
            updated_at = excluded.updated_at
        `.pipe(
          Effect.mapError(
            (cause) =>
              new ProjectNoteStorageError({
                operation: "update",
                projectId,
                message: String(cause),
              }),
          ),
        );
        return {
          projectId,
          markdown,
          updatedAt,
        };
      });

      return ProjectNoteStore.of({ get, update });
    }),
  );
}
