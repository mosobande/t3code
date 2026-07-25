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
      });
      assert.strictEqual(saved.markdown, "# Decisions\n\n- Keep the RPC small.");
      assert.isNotNull(saved.updatedAt);

      const loaded = yield* store.get({ projectId });
      assert.deepStrictEqual(loaded, saved);
    }),
  );
});
