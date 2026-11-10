import * as Schema from "effect/Schema";

import { IsoDateTime, ScheduledTaskId, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

export const DestinationTransitionBinding = Schema.Struct({
  id: ScheduledTaskId,
  configRevision: TrimmedNonEmptyString,
});

export const CommitDestinationTransitionInput = Schema.Struct({
  operationId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
  sourceThreadId: ThreadId,
  successorThreadId: ThreadId,
  expectedSourceSequence: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  expectedSuccessorSequence: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  expectedScheduleBindings: Schema.Array(DestinationTransitionBinding),
});
export type CommitDestinationTransitionInput = typeof CommitDestinationTransitionInput.Type;

export const DestinationTransitionReceipt = Schema.Struct({
  ...CommitDestinationTransitionInput.fields,
  committedAt: IsoDateTime,
  scheduleBindings: Schema.Array(DestinationTransitionBinding),
});
export type DestinationTransitionReceipt = typeof DestinationTransitionReceipt.Type;

export const DestinationTransitionBlocker = Schema.Struct({
  threadId: ThreadId,
  kind: Schema.Literals([
    "unfinished_runs",
    "unfinished_nodes",
    "pending_input",
    "provider_work",
    "delegated_work",
    "completion_delivery",
    "effects",
    "schedule_claims",
    "persistent_watch",
    "successor_not_ready",
  ]),
  count: Schema.Int.check(Schema.isGreaterThan(0)),
});
export type DestinationTransitionBlocker = typeof DestinationTransitionBlocker.Type;

export const CommitDestinationTransitionResult = Schema.Union([
  Schema.Struct({ status: Schema.Literal("committed"), receipt: DestinationTransitionReceipt }),
  Schema.Struct({
    status: Schema.Literal("deferred"),
    blockers: Schema.Array(DestinationTransitionBlocker),
  }),
  Schema.Struct({
    status: Schema.Literal("conflict"),
    reason: Schema.Literals([
      "operation_arguments",
      "invalid_threads",
      "source_retired",
      "successor_unavailable",
      "thread_sequence",
      "schedule_manifest",
    ]),
  }),
]);
export type CommitDestinationTransitionResult = typeof CommitDestinationTransitionResult.Type;

export const GetDestinationTransitionInput = Schema.Struct({
  operationId: CommitDestinationTransitionInput.fields.operationId,
});
export type GetDestinationTransitionInput = typeof GetDestinationTransitionInput.Type;

/** not_found does not prove rollback: a concurrent commit may still finish. Retry the same operation. */
export const GetDestinationTransitionResult = Schema.Union([
  Schema.Struct({ status: Schema.Literal("committed"), receipt: DestinationTransitionReceipt }),
  Schema.Struct({ status: Schema.Literal("not_found") }),
]);
export type GetDestinationTransitionResult = typeof GetDestinationTransitionResult.Type;
