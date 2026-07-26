import { ProjectId } from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SqlitePersistenceMemory } from "../persistence/Layers/Sqlite.ts";
import { ProjectNoteStore } from "./ProjectNoteStore.ts";

const layer = it.layer(ProjectNoteStore.layer.pipe(Layer.provideMerge(SqlitePersistenceMemory)));

layer("ProjectNoteStore", (it) => {
  it.effect("returns saved Markdown on a later read", () =>
    Effect.gen(function* () {
      const store = yield* ProjectNoteStore;
      const projectId = ProjectId.make("project-notes-test");

      const initial = yield* store.get({ projectId });
      assert.strictEqual(initial.markdown, "");
      assert.strictEqual(initial.updatedAt, null);

      const saved = yield* store.update({
        projectId,
        markdown: "# Decisions\n\n- Keep the RPC small.",
        expectedRevision: initial.revision,
      });
      assert.strictEqual(saved.markdown, "# Decisions\n\n- Keep the RPC small.");
      assert.isNotNull(saved.updatedAt);
      assert.strictEqual(saved.revision, 1);

      const loaded = yield* store.get({ projectId });
      assert.deepStrictEqual(loaded, saved);
    }),
  );

  it.effect("rejects a stale update without replacing the current note", () =>
    Effect.gen(function* () {
      const store = yield* ProjectNoteStore;
      const projectId = ProjectId.make("project-notes-conflict-test");

      const first = yield* store.update({
        projectId,
        markdown: "First saved version",
        expectedRevision: 0,
      });
      const current = yield* store.update({
        projectId,
        markdown: "Current saved version",
        expectedRevision: first.revision,
      });

      const conflict = yield* store
        .update({
          projectId,
          markdown: "Stale replacement",
          expectedRevision: first.revision,
        })
        .pipe(Effect.flip);

      assert.strictEqual(conflict._tag, "ProjectNoteConflictError");
      if (conflict._tag === "ProjectNoteConflictError") {
        assert.deepStrictEqual(conflict.current, current);
      }
      const loaded = yield* store.get({ projectId });
      assert.deepStrictEqual(loaded, current);
    }),
  );
});
