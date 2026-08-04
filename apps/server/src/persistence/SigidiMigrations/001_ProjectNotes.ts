import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS sigidi_project_notes (
      project_id TEXT PRIMARY KEY NOT NULL,
      markdown TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
});
