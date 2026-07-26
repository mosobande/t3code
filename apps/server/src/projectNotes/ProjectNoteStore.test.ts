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

  it.effect("returns the saved note without changing it when Markdown is unchanged", () =>
    Effect.gen(function* () {
      const store = yield* ProjectNoteStore;
      const projectId = ProjectId.make("project-notes-unchanged-test");
      const markdown = "# Stable note";

      const saved = yield* store.update({
        projectId,
        markdown,
        expectedRevision: 0,
      });
      const repeatedCreate = yield* store.update({
        projectId,
        markdown,
        expectedRevision: 0,
      });
      const repeatedUpdate = yield* store.update({
        projectId,
        markdown,
        expectedRevision: saved.revision,
      });

      assert.deepStrictEqual(repeatedCreate, saved);
      assert.deepStrictEqual(repeatedUpdate, saved);
      assert.deepStrictEqual(yield* store.get({ projectId }), saved);
    }),
  );

  it.effect("does not create a saved note for unchanged empty Markdown", () =>
    Effect.gen(function* () {
      const store = yield* ProjectNoteStore;
      const projectId = ProjectId.make("project-notes-empty-unchanged-test");

      const unchanged = yield* store.update({
        projectId,
        markdown: "",
        expectedRevision: 0,
      });

      assert.deepStrictEqual(unchanged, {
        projectId,
        markdown: "",
        updatedAt: null,
        revision: 0,
      });
      assert.deepStrictEqual(yield* store.get({ projectId }), unchanged);
    }),
  );
});
