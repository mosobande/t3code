import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`CREATE TABLE thread_destination_transitions (
    operation_id TEXT PRIMARY KEY,
    arguments_json TEXT NOT NULL,
    receipt_json TEXT
  )`;
  yield* sql`CREATE TABLE retired_thread_destinations (
    thread_id TEXT PRIMARY KEY,
    successor_thread_id TEXT NOT NULL UNIQUE,
    operation_id TEXT NOT NULL UNIQUE,
    retired_at TEXT NOT NULL
  )`;
  yield* sql`ALTER TABLE scheduled_tasks ADD COLUMN config_revision TEXT NOT NULL DEFAULT ''`;
  yield* sql`UPDATE scheduled_tasks SET config_revision = lower(hex(randomblob(16)))`;
  yield* sql`CREATE TABLE scheduled_task_dispatch_claims (
    task_id TEXT PRIMARY KEY,
    thread_id TEXT,
    config_revision TEXT NOT NULL,
    started_at TEXT NOT NULL
  )`;
  yield* sql`CREATE INDEX scheduled_task_dispatch_claims_thread_idx
    ON scheduled_task_dispatch_claims(thread_id)`;

  yield* sql`CREATE TRIGGER scheduled_tasks_initial_revision AFTER INSERT ON scheduled_tasks
    WHEN NEW.config_revision = ''
    BEGIN
      UPDATE scheduled_tasks SET config_revision = lower(hex(randomblob(16)))
      WHERE task_id = NEW.task_id;
    END`;
  yield* sql`CREATE TRIGGER scheduled_tasks_config_revision AFTER UPDATE OF
    title, prompt, enabled, schedule_json, project_id, thread_id, thread_mode,
    workspace_strategy_json, model_selection_json, runtime_mode, interaction_mode,
    creation_source, webhook_token, webhook_secret ON scheduled_tasks
    WHEN OLD.title IS NOT NEW.title OR OLD.prompt IS NOT NEW.prompt
      OR OLD.enabled IS NOT NEW.enabled OR OLD.schedule_json IS NOT NEW.schedule_json
      OR OLD.project_id IS NOT NEW.project_id OR OLD.thread_id IS NOT NEW.thread_id
      OR OLD.thread_mode IS NOT NEW.thread_mode
      OR OLD.workspace_strategy_json IS NOT NEW.workspace_strategy_json
      OR OLD.model_selection_json IS NOT NEW.model_selection_json
      OR OLD.runtime_mode IS NOT NEW.runtime_mode OR OLD.interaction_mode IS NOT NEW.interaction_mode
      OR OLD.creation_source IS NOT NEW.creation_source
      OR OLD.webhook_token IS NOT NEW.webhook_token OR OLD.webhook_secret IS NOT NEW.webhook_secret
    BEGIN
      UPDATE scheduled_tasks SET config_revision = lower(hex(randomblob(16)))
      WHERE task_id = NEW.task_id;
    END`;

  // Legacy saves have no revision; the destination itself must remain fenced in the write.
  yield* sql`CREATE TRIGGER scheduled_tasks_retired_insert BEFORE INSERT ON scheduled_tasks
    WHEN EXISTS (SELECT 1 FROM retired_thread_destinations WHERE thread_id = NEW.thread_id)
    BEGIN SELECT RAISE(ABORT, 'schedule destination is retired'); END`;
  yield* sql`CREATE TRIGGER scheduled_tasks_retired_update BEFORE UPDATE OF thread_id ON scheduled_tasks
    WHEN EXISTS (SELECT 1 FROM retired_thread_destinations WHERE thread_id = NEW.thread_id)
    BEGIN SELECT RAISE(ABORT, 'schedule destination is retired'); END`;
});
