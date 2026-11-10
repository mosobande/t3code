import {
  CommitDestinationTransitionInput,
  type CommitDestinationTransitionResult,
  type DestinationTransitionBlocker,
  DestinationTransitionReceipt,
  type GetDestinationTransitionInput,
  type GetDestinationTransitionResult,
  isProviderNativeSubagentThread,
  type OrchestrationV2ThreadProjection,
  ScheduledTaskError,
  ScheduledTaskId,
  ThreadId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import type * as SqlError from "effect/sql/SqlError";

import * as ProjectionStore from "../orchestration-v2/ProjectionStore.ts";
import * as ThreadCommandExecutor from "../orchestration-v2/ThreadCommandExecutor.ts";
import {
  isBufferedProviderNotification,
  isUndeliveredMailboxSteer,
} from "../orchestration-v2/NotificationMailbox.ts";
import * as ScheduledTaskService from "./ScheduledTaskService.ts";

export class DestinationTransitionService extends Context.Service<
  DestinationTransitionService,
  {
    readonly commit: (
      input: CommitDestinationTransitionInput,
    ) => Effect.Effect<CommitDestinationTransitionResult, ScheduledTaskError>;
    readonly get: (
      input: GetDestinationTransitionInput,
    ) => Effect.Effect<GetDestinationTransitionResult, ScheduledTaskError>;
  }
>()("t3/scheduledTasks/DestinationTransitionService") {}

const receiptJson = Schema.fromJsonString(DestinationTransitionReceipt);
const decodeReceipt = Schema.decodeUnknownEffect(receiptJson);
const encodeReceipt = Schema.encodeSync(receiptJson);
const encodeInput = Schema.encodeSync(Schema.fromJsonString(CommitDestinationTransitionInput));
const terminal = new Set([
  "completed",
  "interrupted",
  "failed",
  "cancelled",
  "rolled_back",
  "superseded",
]);

const projectionBlockers = (
  projection: OrchestrationV2ThreadProjection,
): DestinationTransitionBlocker[] => {
  const blockers: DestinationTransitionBlocker[] = [];
  const add = (kind: DestinationTransitionBlocker["kind"], count: number) => {
    if (count > 0) blockers.push({ threadId: projection.thread.id, kind, count });
  };
  add(
    "unfinished_runs",
    projection.runs.filter((run) => !terminal.has(run.status) || run.queueHeld === true).length,
  );
  add("unfinished_nodes", projection.nodes.filter((node) => !terminal.has(node.status)).length);
  add(
    "pending_input",
    projection.runtimeRequests.filter((request) => request.status === "pending").length,
  );
  add(
    "provider_work",
    projection.attempts.filter((attempt) => !terminal.has(attempt.status)).length +
      projection.providerTurns.filter((turn) => !terminal.has(turn.status)).length +
      projection.providerSessions.filter((session) =>
        ["starting", "running", "waiting"].includes(session.status),
      ).length +
      projection.providerThreads.filter(
        (thread) =>
          thread.status === "active" ||
          (thread.pendingBackgroundTasks?.length ?? 0) > 0 ||
          thread.goal?.status === "active",
      ).length,
  );
  add(
    "delegated_work",
    projection.subagents.filter(
      (task) =>
        !terminal.has(task.status) ||
        (task.remoteChild !== undefined && task.remoteChild.stoppedThere !== true),
    ).length,
  );
  add(
    "completion_delivery",
    projection.subagents.filter(
      (task) =>
        task.completionDelivery?.state === "pending" ||
        task.completionDelivery?.state === "claimed",
    ).length +
      projection.runs.filter((run) => run.delegatedCompletion?.delivery != null).length +
      projection.messages.filter(
        (message) =>
          (isBufferedProviderNotification(message) && message.runId === null) ||
          isUndeliveredMailboxSteer(projection, message.id),
      ).length,
  );
  add(
    "persistent_watch",
    (projection.thread.pullRequests ?? []).filter((link) => link.watch !== undefined).length,
  );
  return blockers;
};

export const layer = Layer.effect(
  DestinationTransitionService,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const projections = yield* ProjectionStore.ProjectionStoreV2;
    const commands = yield* ThreadCommandExecutor.ThreadCommandExecutor;
    const schedules = yield* ScheduledTaskService.ScheduledTaskService;

    const readOperation = (operationId: string) => sql<{
      arguments_json: string;
      receipt_json: string | null;
    }>`
    SELECT arguments_json, receipt_json FROM thread_destination_transitions WHERE operation_id = ${operationId}`;

    const bindings = (threadId: ThreadId) =>
      sql<{ task_id: string; config_revision: string }>`
    SELECT task_id, config_revision FROM scheduled_tasks WHERE thread_id = ${threadId} ORDER BY task_id`.pipe(
        Effect.map((rows) =>
          rows
            .map((row) => ({
              id: ScheduledTaskId.make(row.task_id),
              configRevision: row.config_revision,
            }))
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
        ),
      );

    const depth = (threadId: ThreadId) =>
      sql<{ depth: number }>`
    WITH RECURSIVE ancestors(thread_id) AS (
      SELECT ${threadId}
      UNION
      SELECT json_extract(t.payload_json, '$.lineage.parentThreadId')
      FROM orchestration_v2_projection_threads t JOIN ancestors a ON t.thread_id = a.thread_id
      WHERE json_extract(t.payload_json, '$.lineage.parentThreadId') IS NOT NULL
    ) SELECT COUNT(*) AS depth FROM ancestors`.pipe(Effect.map((rows) => rows[0]?.depth ?? 0));

    const commit = Effect.fn("DestinationTransitionService.commit")(
      function* (input: CommitDestinationTransitionInput) {
        const expectedScheduleBindings = [...input.expectedScheduleBindings].sort((a, b) =>
          a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
        );
        const argumentsJson = encodeInput({
          operationId: input.operationId,
          sourceThreadId: input.sourceThreadId,
          successorThreadId: input.successorThreadId,
          expectedSourceSequence: input.expectedSourceSequence,
          expectedSuccessorSequence: input.expectedSuccessorSequence,
          expectedScheduleBindings,
        });
        // Reservation commits separately so even a deferred or lost response fixes the operation's arguments.
        const [reserved] = yield* sql.withTransaction(
          Effect.gen(function* () {
            yield* sql`INSERT INTO thread_destination_transitions (operation_id, arguments_json)
        VALUES (${input.operationId}, ${argumentsJson}) ON CONFLICT(operation_id) DO NOTHING`;
            return yield* readOperation(input.operationId);
          }),
        );
        if (reserved?.arguments_json !== argumentsJson)
          return { status: "conflict", reason: "operation_arguments" } as const;
        if (reserved.receipt_json !== null)
          return {
            status: "committed",
            receipt: yield* decodeReceipt(reserved.receipt_json),
          } as const;
        if (input.sourceThreadId === input.successorThreadId)
          return { status: "conflict", reason: "invalid_threads" } as const;

        const endpoints = yield* sql`SELECT thread_id FROM orchestration_v2_projection_threads
          WHERE thread_id IN (${input.sourceThreadId}, ${input.successorThreadId})
            AND deleted_at IS NULL AND archived_at IS NULL
            AND json_extract(payload_json, '$.lineage.parentThreadId') IS NULL
            AND json_extract(payload_json, '$.lineage.relationshipToParent') IS NULL
            AND json_extract(payload_json, '$.delegatedFrom') IS NULL
            AND COALESCE(json_extract(payload_json, '$.lineage.sideChat'), 0) = 0`;
        // Lineage is immutable; missing identities may become side chats with a different lock order.
        if (endpoints.length !== 2)
          return { status: "conflict", reason: "invalid_threads" } as const;

        // Ancestors precede descendants, matching command intake's parent-before-child lock order.
        const order = yield* Effect.forEach([input.sourceThreadId, input.successorThreadId], (id) =>
          depth(id).pipe(Effect.map((depth) => ({ id, depth }))),
        );
        order.sort((a, b) => a.depth - b.depth || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const transition = sql.withTransaction(
          Effect.gen(function* (): Effect.fn.Return<
            CommitDestinationTransitionResult,
            SqlError.SqlError | ProjectionStore.ProjectionStoreV2Error | Schema.SchemaError
          > {
            const [operation] = yield* readOperation(input.operationId);
            if (operation?.receipt_json != null)
              return { status: "committed", receipt: yield* decodeReceipt(operation.receipt_json) };
            const retired = yield* sql<{
              thread_id: string;
              successor_thread_id: string;
            }>`SELECT thread_id, successor_thread_id FROM retired_thread_destinations
        WHERE thread_id IN (${input.sourceThreadId}, ${input.successorThreadId})
          OR successor_thread_id = ${input.successorThreadId}`;
            if (retired.some((row) => row.thread_id === input.sourceThreadId))
              return { status: "conflict", reason: "source_retired" };
            if (retired.length > 0) return { status: "conflict", reason: "successor_unavailable" };
            const available = yield* sql<{
              thread_id: string;
              project_id: string;
            }>`SELECT thread_id, project_id
        FROM orchestration_v2_projection_threads WHERE thread_id IN (${input.sourceThreadId}, ${input.successorThreadId})
        AND deleted_at IS NULL AND archived_at IS NULL`;
            if (available.length !== 2 || available[0]?.project_id !== available[1]?.project_id)
              return { status: "conflict", reason: "invalid_threads" };
            const source = yield* projections.getThreadSnapshot(input.sourceThreadId);
            const successor = yield* projections.getThreadSnapshot(input.successorThreadId);
            if (
              source.projection.thread.lineage.parentThreadId !== null ||
              source.projection.thread.lineage.relationshipToParent !== null ||
              successor.projection.thread.lineage.parentThreadId !== null ||
              successor.projection.thread.lineage.relationshipToParent !== null ||
              source.projection.thread.delegatedFrom != null ||
              successor.projection.thread.delegatedFrom != null ||
              isProviderNativeSubagentThread(source.projection.thread) ||
              isProviderNativeSubagentThread(successor.projection.thread) ||
              source.projection.thread.lineage.sideChat === true ||
              successor.projection.thread.lineage.sideChat === true
            )
              return { status: "conflict", reason: "invalid_threads" };
            if (
              source.snapshotSequence !== input.expectedSourceSequence ||
              successor.snapshotSequence !== input.expectedSuccessorSequence
            )
              return { status: "conflict", reason: "thread_sequence" };
            const currentBindings = yield* bindings(input.sourceThreadId);
            if (
              currentBindings.length !== expectedScheduleBindings.length ||
              currentBindings.some(
                (binding, index) =>
                  binding.id !== expectedScheduleBindings[index]?.id ||
                  binding.configRevision !== expectedScheduleBindings[index]?.configRevision,
              )
            )
              return { status: "conflict", reason: "schedule_manifest" };

            const blockers = [
              ...projectionBlockers(source.projection),
              ...projectionBlockers(successor.projection),
            ];
            if (
              !successor.projection.runs.some(
                (run) =>
                  run.status === "completed" &&
                  run.activeAttemptId !== null &&
                  successor.projection.providerTurns.some(
                    (turn) =>
                      turn.runAttemptId === run.activeAttemptId && turn.status === "completed",
                  ),
              )
            ) {
              blockers.push({
                threadId: input.successorThreadId,
                kind: "successor_not_ready",
                count: 1,
              });
            }
            const children = yield* sql<{
              thread_id: string;
            }>`WITH RECURSIVE children(thread_id) AS (
        SELECT thread_id FROM orchestration_v2_projection_threads
        WHERE json_extract(payload_json, '$.lineage.parentThreadId') IN (${input.sourceThreadId}, ${input.successorThreadId})
          AND json_extract(payload_json, '$.lineage.relationshipToParent') = 'subagent' AND deleted_at IS NULL
        UNION
        SELECT t.thread_id FROM orchestration_v2_projection_threads t JOIN children c
          ON json_extract(t.payload_json, '$.lineage.parentThreadId') = c.thread_id
        WHERE json_extract(t.payload_json, '$.lineage.relationshipToParent') = 'subagent' AND t.deleted_at IS NULL
      ) SELECT thread_id FROM children`;
            for (const child of children) {
              if (
                child.thread_id === input.sourceThreadId ||
                child.thread_id === input.successorThreadId
              )
                continue;
              const snapshot = yield* projections.getThreadSnapshot(ThreadId.make(child.thread_id));
              blockers.push(...projectionBlockers(snapshot.projection));
            }
            const threadIds = [
              input.sourceThreadId,
              input.successorThreadId,
              ...children.map((row) => ThreadId.make(row.thread_id)),
            ];
            for (const threadId of new Set(threadIds)) {
              const [counts] = yield* sql<{ claims: number; effects: number }>`SELECT
          (SELECT COUNT(*) FROM scheduled_task_dispatch_claims WHERE thread_id = ${threadId}) AS claims,
          (SELECT COUNT(*) FROM orchestration_v2_effect_outbox WHERE thread_id = ${threadId} AND status IN ('pending', 'running')) AS effects`;
              if (counts?.claims)
                blockers.push({ threadId, kind: "schedule_claims", count: counts.claims });
              if (counts?.effects)
                blockers.push({ threadId, kind: "effects", count: counts.effects });
            }
            if (blockers.length > 0) return { status: "deferred", blockers };

            const committedAt = DateTime.formatIso(yield* DateTime.now);
            yield* sql`UPDATE scheduled_tasks SET thread_id = ${input.successorThreadId} WHERE thread_id = ${input.sourceThreadId}`;
            const scheduleBindings = yield* bindings(input.successorThreadId).pipe(
              Effect.map((rows) =>
                rows.filter((row) => currentBindings.some((before) => before.id === row.id)),
              ),
            );
            const receipt = { ...input, expectedScheduleBindings, committedAt, scheduleBindings };
            yield* sql`INSERT INTO retired_thread_destinations (thread_id, successor_thread_id, operation_id, retired_at)
        VALUES (${input.sourceThreadId}, ${input.successorThreadId}, ${input.operationId}, ${committedAt})`;
            yield* sql`UPDATE thread_destination_transitions SET receipt_json = ${encodeReceipt(receipt)} WHERE operation_id = ${input.operationId}`;
            return { status: "committed", receipt };
          }),
        );
        const result = yield* commands.withLock(
          order[0]!.id,
          commands.withLock(order[1]!.id, transition),
        );
        if (result.status === "committed") yield* schedules.invalidate;
        yield* Effect.annotateCurrentSpan({ "destination_transition.status": result.status });
        return result;
      },
      Effect.mapError(
        (cause) =>
          new ScheduledTaskError({ message: "Could not commit destination transition.", cause }),
      ),
    );

    const get = Effect.fn("DestinationTransitionService.get")(
      function* (
        input: GetDestinationTransitionInput,
      ): Effect.fn.Return<GetDestinationTransitionResult, SqlError.SqlError | Schema.SchemaError> {
        const [operation] = yield* readOperation(input.operationId);
        return operation?.receipt_json == null
          ? { status: "not_found" }
          : { status: "committed", receipt: yield* decodeReceipt(operation.receipt_json) };
      },
      Effect.mapError(
        (cause) =>
          new ScheduledTaskError({ message: "Could not read destination transition.", cause }),
      ),
    );

    return DestinationTransitionService.of({ commit, get });
  }),
);
