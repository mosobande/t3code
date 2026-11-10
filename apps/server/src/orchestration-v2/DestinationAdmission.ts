import { ThreadId, type OrchestrationV2DomainEvent } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type * as SqlClient from "effect/sql/SqlClient";

class RetiredDestinationError extends Schema.TaggedError<RetiredDestinationError>()(
  "RetiredDestinationError",
  { threadId: ThreadId },
) {
  override get message(): string {
    return "This thread's destination has been retired.";
  }
}

export const assertDestinationOpen = Effect.fn("DestinationAdmission.assertOpen")(function* (
  sql: SqlClient.SqlClient,
  threadId: ThreadId,
) {
  // Native child conversations belong to their provider parent; app-owned children may continue independently.
  const retired = yield* sql<{ thread_id: string }>`WITH RECURSIVE destinations(thread_id) AS (
    SELECT ${threadId}
    UNION
    SELECT json_extract(t.payload_json, '$.lineage.parentThreadId')
    FROM orchestration_v2_projection_threads t JOIN destinations d ON t.thread_id = d.thread_id
    WHERE json_extract(t.payload_json, '$.creationSource') = 'provider'
      AND json_extract(t.payload_json, '$.lineage.relationshipToParent') = 'subagent'
      AND json_extract(t.payload_json, '$.lineage.parentThreadId') IS NOT NULL
  ) SELECT r.thread_id FROM retired_thread_destinations r JOIN destinations d ON r.thread_id = d.thread_id LIMIT 1`;
  if (retired[0] !== undefined) {
    return yield* new RetiredDestinationError({ threadId: ThreadId.make(retired[0].thread_id) });
  }
});

const allowsRetiredEvent = (event: OrchestrationV2DomainEvent): boolean => {
  switch (event.type) {
    case "thread.archived":
    case "thread.deleted":
    case "thread.settled":
    case "thread.pinned":
    case "thread.unpinned":
    case "thread.pin-reordered":
    case "thread.tags-updated":
    case "thread.visited":
    case "thread.marked-unread":
    case "thread.metadata-updated":
      return !(event.payload.pullRequests ?? []).some((link) => link.watch !== undefined);
    case "thread.pull-request-link-updated":
      return event.payload.watch === undefined;
    default:
      return false;
  }
};

// EventSink calls this inside every event write transaction, including provider batches.
export const assertEventsAllowed = Effect.fn("DestinationAdmission.assertEventsAllowed")(function* (
  sql: SqlClient.SqlClient,
  events: ReadonlyArray<OrchestrationV2DomainEvent>,
) {
  const checked = new Set<ThreadId>();
  for (const event of events) {
    if (!allowsRetiredEvent(event) && !checked.has(event.threadId)) {
      yield* assertDestinationOpen(sql, event.threadId);
      checked.add(event.threadId);
    }
    if (
      event.type === "thread.created" &&
      event.payload.lineage.relationshipToParent === "subagent" &&
      event.payload.lineage.parentThreadId !== null
    ) {
      yield* assertDestinationOpen(sql, event.payload.lineage.parentThreadId);
    }
  }
});
