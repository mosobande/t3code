import * as NodeServices from "@effect/platform-node/NodeServices";
import { vi } from "vite-plus/test";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as KeyedLock from "@t3tools/shared/KeyedLock";
import { assert, it } from "@effect/vitest";
import {
  type CommitDestinationTransitionInput,
  type ScheduledTaskUpsertInput,
  CommandId,
  EnvironmentId,
  EventId,
  MessageId,
  NodeId,
  type OrchestrationV2DomainEvent,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderThreadId,
  ProviderTurnId,
  RunAttemptId,
  RunId,
  RuntimeRequestId,
  ScheduledTaskId,
  type ThreadPullRequestLink,
  ThreadId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";
import * as Tracer from "effect/Tracer";

import * as EffectOutbox from "../orchestration-v2/EffectOutbox.ts";
import * as EventSink from "../orchestration-v2/EventSink.ts";
import * as EventStore from "../orchestration-v2/EventStore.ts";
import * as ProjectionStore from "../orchestration-v2/ProjectionStore.ts";
import * as ThreadCommandExecutor from "../orchestration-v2/ThreadCommandExecutor.ts";
import * as ThreadLaunchService from "../orchestration-v2/ThreadLaunchService.ts";
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";
import * as ManagedProjectFolders from "../project/ManagedProjectFolders.ts";
import * as Scheduler from "../scheduling/Scheduler.ts";
import * as SecretRequests from "../secrets/SecretRequests.ts";
import * as Orchestrator from "../orchestration-v2/Orchestrator.ts";
import * as ProviderAdapterRegistry from "../orchestration-v2/ProviderAdapterRegistry.ts";
import * as ProviderReplayHarness from "../orchestration-v2/testkit/ProviderReplayHarness.ts";
import { CodexProviderCapabilitiesV2 } from "../orchestration-v2/Adapters/CodexAdapterV2.ts";
import * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";
import * as DestinationTransitionService from "./DestinationTransitionService.ts";
import * as ScheduledTaskService from "./ScheduledTaskService.ts";

const sourceThreadId = ThreadId.make("thread:transition:source");
const successorThreadId = ThreadId.make("thread:transition:successor");
const instanceId = ProviderInstanceId.make("codex");
const driver = ProviderDriverKind.make("codex");
const modelSelection = { instanceId, model: "test-model" };
const watchedPullRequest: ThreadPullRequestLink = {
  host: "github.com",
  repository: "example/project",
  number: 1,
  url: "https://github.com/example/project/pull/1",
  source: "manual",
  linkedAt: "2026-11-01T00:00:00.000Z",
  snapshot: null,
  stack: null,
  watch: {
    startedAt: "2026-11-01T00:00:00.000Z",
    headSha: null,
    failedChecks: [],
    passed: false,
    passedChecks: [],
    remarksThrough: "2026-11-01T00:00:00.000Z",
    remarkIds: [],
    conflicting: false,
    wakes: 0,
  },
};

const testLayer = <E, R, E2 = never>(
  database: Layer.Layer<SqlClient.SqlClient, E, R>,
  scheduledTasks: Layer.Layer<
    ScheduledTaskService.ScheduledTaskService,
    E2,
    SqlClient.SqlClient
  > = Layer.mock(ScheduledTaskService.ScheduledTaskService)({ invalidate: Effect.void }),
  commands = ThreadCommandExecutor.layer,
) => {
  const stores = Layer.mergeAll(EventStore.layer, ProjectionStore.layer, EffectOutbox.layer).pipe(
    Layer.provideMerge(database),
  );
  const dependencies = Layer.mergeAll(
    stores,
    EventSink.layer.pipe(Layer.provide(stores)),
    commands,
    scheduledTasks.pipe(Layer.provide(stores)),
  );
  return DestinationTransitionService.layer.pipe(Layer.provideMerge(dependencies));
};

const seed = (ready = true) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const sink = yield* EventSink.EventSinkV2;
    const projections = yield* ProjectionStore.ProjectionStoreV2;
    const now = yield* DateTime.now;
    let ordinal = 0;
    const append = (event: OrchestrationV2DomainEvent) => sink.write({ events: [event] });
    const eventId = () => EventId.make(`event:transition:${++ordinal}`);
    for (const threadId of [sourceThreadId, successorThreadId]) {
      yield* append({
        id: eventId(),
        threadId,
        type: "thread.created",
        occurredAt: now,
        payload: {
          id: threadId,
          projectId: ProjectId.make("project:transition"),
          title: "Transition",
          providerInstanceId: instanceId,
          modelSelection,
          runtimeMode: "full-access",
          interactionMode: "default",
          branch: null,
          worktreePath: null,
          activeProviderThreadId: null,
          lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
          forkedFrom: null,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          settledOverride: null,
          settledAt: null,
          lastVisitedAt: null,
          deletedAt: null,
          createdBy: "user",
          creationSource: "web",
        },
      });
    }
    const runId = RunId.make("run:transition:ready");
    const attemptId = RunAttemptId.make("attempt:transition:ready");
    const nodeId = NodeId.make("node:transition:ready");
    const providerThreadId = ProviderThreadId.make("provider-thread:transition:ready");
    const providerTurnId = ProviderTurnId.make("provider-turn:transition:ready");
    const readyRun = {
      id: runId,
      threadId: successorThreadId,
      ordinal: 1,
      providerInstanceId: instanceId,
      modelSelection,
      providerThreadId,
      userMessageId: MessageId.make("message:transition:ready"),
      rootNodeId: nodeId,
      activeAttemptId: attemptId,
      status: "completed" as const,
      requestedAt: now,
      startedAt: now,
      completedAt: now,
      checkpointId: null,
      contextHandoffId: null,
    };
    if (ready) {
      yield* append({
        id: eventId(),
        threadId: successorThreadId,
        type: "run.created",
        occurredAt: now,
        payload: readyRun,
      });
      yield* append({
        id: eventId(),
        threadId: successorThreadId,
        type: "run-attempt.created",
        occurredAt: now,
        payload: {
          id: attemptId,
          runId,
          attemptOrdinal: 1,
          rootNodeId: nodeId,
          providerInstanceId: instanceId,
          providerThreadId,
          providerTurnId,
          reason: "initial",
          status: "completed",
          startedAt: now,
          completedAt: now,
        },
      });
      yield* append({
        id: eventId(),
        threadId: successorThreadId,
        type: "provider-thread.updated",
        occurredAt: now,
        payload: {
          id: providerThreadId,
          driver,
          providerInstanceId: instanceId,
          providerSessionId: null,
          appThreadId: successorThreadId,
          ownerNodeId: null,
          nativeThreadRef: { driver, nativeId: "ready", strength: "strong" },
          nativeConversationHeadRef: null,
          status: "idle",
          firstRunOrdinal: 1,
          lastRunOrdinal: 1,
          handoffIds: [],
          forkedFrom: null,
          pendingBackgroundTasks: [],
          createdAt: now,
          updatedAt: now,
        },
      });
      yield* append({
        id: eventId(),
        threadId: successorThreadId,
        type: "provider-turn.updated",
        occurredAt: now,
        payload: {
          id: providerTurnId,
          providerThreadId,
          nodeId,
          runAttemptId: attemptId,
          nativeTurnRef: { driver, nativeId: "ready-turn", strength: "strong" },
          ordinal: 1,
          status: "completed",
          startedAt: now,
          completedAt: now,
        },
      });
    }
    const insertSchedule = (id: string) =>
      sql`INSERT INTO scheduled_tasks (task_id,title,prompt,enabled,schedule_json,project_id,thread_id,
      thread_mode,workspace_strategy_json,model_selection_json,runtime_mode,interaction_mode,created_by,
      creation_source,created_at,updated_at,next_run_at,last_run_at,last_run_status,last_run_error,run_count,
      webhook_token,webhook_secret)
      VALUES (${id},'Review','Review the project',1,'{"type":"interval","everyMs":60000}','project:transition',${sourceThreadId},
        'continue','{"type":"root"}','{"instanceId":"codex","model":"test-model"}','full-access','default','user',
        'web','2026-11-01T00:00:00.000Z','2026-11-01T00:00:00.000Z','2026-11-02T00:00:00.000Z',NULL,'never',NULL,7,
        'fixture-token','fixture-secret')`;
    for (const id of ["schedule:a", "schedule:b"]) yield* insertSchedule(id);
    const input = (operationId = "transition:one") =>
      Effect.gen(function* () {
        const source = yield* projections.getThreadSnapshot(sourceThreadId);
        const successor = yield* projections.getThreadSnapshot(successorThreadId);
        const rows = yield* sql<{
          task_id: string;
          config_revision: string;
        }>`SELECT task_id,config_revision FROM scheduled_tasks WHERE thread_id = ${sourceThreadId} ORDER BY task_id`;
        return {
          operationId,
          sourceThreadId,
          successorThreadId,
          expectedSourceSequence: source.snapshotSequence,
          expectedSuccessorSequence: successor.snapshotSequence,
          expectedScheduleBindings: rows.map((row) => ({
            id: ScheduledTaskId.make(row.task_id),
            configRevision: row.config_revision,
          })),
        } satisfies CommitDestinationTransitionInput;
      });
    return { sql, sink, projections, now, append, eventId, readyRun, input, insertSchedule };
  });

const configurationTasks = (readOrigin: Effect.Effect<{ relayHookBaseUrl: null }>) =>
  ScheduledTaskService.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        ManagedPolicy.layerTest(),
        Layer.mock(ThreadLaunchService.ThreadLaunchService)({}),
        Layer.mock(ThreadManagementService.ThreadManagementService)({}),
        Layer.mock(SecretRequests.SecretRequests)({}),
        Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({
          namedProjectsRoot: "/projects",
          isScratchProject: () => Effect.succeed(false),
        }),
        NodeCrypto.layer,
        Layer.succeed(Scheduler.Scheduler, { register: () => Effect.void }),
        Layer.succeed(ScheduledTaskService.ScheduledTaskWebhookOrigin, readOrigin),
      ),
    ),
  );

const editInput: ScheduledTaskUpsertInput = {
  id: ScheduledTaskId.make("schedule:a"),
  requireExisting: true,
  title: "Edited",
  prompt: "Edited prompt",
  enabled: true,
  schedule: { type: "interval", everyMs: 60_000 },
  projectId: ProjectId.make("project:transition"),
  threadId: null,
  threadMode: "new_thread",
  workspaceStrategy: { type: "root" },
  modelSelection,
  runtimeMode: "full-access",
  interactionMode: "default",
};

type TransitionFixture = Effect.Success<ReturnType<typeof seed>>;

const createDestination = (fixture: TransitionFixture, id: ThreadId, ready = false) =>
  Effect.gen(function* () {
    const template = yield* fixture.projections.getThreadProjection(successorThreadId);
    const runId = RunId.make(`${id}:run`);
    const attemptId = RunAttemptId.make(`${id}:attempt`);
    const providerThreadId = ProviderThreadId.make(`${id}:provider`);
    const providerTurnId = ProviderTurnId.make(`${id}:turn`);
    const metadata = () => ({ id: fixture.eventId(), threadId: id, occurredAt: fixture.now });
    yield* fixture.append({
      ...metadata(),
      type: "thread.created",
      payload: {
        ...template.thread,
        id,
        lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: id },
      },
    });
    if (!ready) return;
    yield* fixture.append({
      ...metadata(),
      type: "run.created",
      payload: {
        ...template.runs[0]!,
        id: runId,
        threadId: id,
        activeAttemptId: attemptId,
        providerThreadId,
      },
    });
    yield* fixture.append({
      ...metadata(),
      type: "run-attempt.created",
      payload: { ...template.attempts[0]!, id: attemptId, runId, providerThreadId, providerTurnId },
    });
    yield* fixture.append({
      ...metadata(),
      type: "provider-thread.updated",
      payload: { ...template.providerThreads[0]!, id: providerThreadId, appThreadId: id },
    });
    yield* fixture.append({
      ...metadata(),
      type: "provider-turn.updated",
      payload: {
        ...template.providerTurns[0]!,
        id: providerTurnId,
        providerThreadId,
        runAttemptId: attemptId,
      },
    });
  });

const destinationInput = (
  fixture: TransitionFixture,
  source: ThreadId,
  successor: ThreadId,
  operationId: string,
) =>
  Effect.gen(function* () {
    const sourceSnapshot = yield* fixture.projections.getThreadSnapshot(source);
    const successorSnapshot = yield* fixture.projections.getThreadSnapshot(successor);
    const bindings = yield* fixture.sql<{ task_id: string; config_revision: string }>`
      SELECT task_id, config_revision FROM scheduled_tasks WHERE thread_id = ${source} ORDER BY task_id`;
    return {
      operationId,
      sourceThreadId: source,
      successorThreadId: successor,
      expectedSourceSequence: sourceSnapshot.snapshotSequence,
      expectedSuccessorSequence: successorSnapshot.snapshotSequence,
      expectedScheduleBindings: bindings.map((row) => ({
        id: ScheduledTaskId.make(row.task_id),
        configRevision: row.config_revision,
      })),
    };
  });

it.effect.each(["occupied", "deleted", "same batch"] as const)(
  "reserves thread identities against distinct creation events (%s)",
  (kind) =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const sink = yield* EventSink.EventSinkV2;
      const original = yield* fixture.projections.getThread(sourceThreadId);
      if (kind === "deleted")
        yield* fixture.append({
          id: fixture.eventId(),
          threadId: sourceThreadId,
          type: "thread.deleted",
          occurredAt: fixture.now,
          payload: { ...original, deletedAt: fixture.now },
        });
      const threadId =
        kind === "same batch" ? ThreadId.make("thread:transition:duplicate") : sourceThreadId;
      const created = (): OrchestrationV2DomainEvent => ({
        id: fixture.eventId(),
        threadId,
        type: "thread.created",
        occurredAt: fixture.now,
        payload: {
          ...original,
          id: threadId,
          title: "Replacement",
          lineage: {
            parentThreadId: null,
            relationshipToParent: null,
            rootThreadId: threadId,
          },
        },
      });
      const commandId = CommandId.make("command:transition:duplicate");
      const before =
        yield* fixture.sql`SELECT * FROM orchestration_v2_projection_threads ORDER BY thread_id`;
      const sequence = yield* sink.latestSequence();
      const result = yield* sink
        .commitCommand({
          commandId,
          threadId,
          commandType: "thread.create",
          acceptedAt: fixture.now,
          events: kind === "same batch" ? [created(), created()] : [created()],
          effects: [
            {
              id: "effect:transition:duplicate",
              commandId,
              threadId,
              request: { type: "provider-turn.start", runId: RunId.make("run:duplicate") },
            },
          ],
        })
        .pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(result));
      if (Exit.isFailure(result))
        assert.include(Cause.pretty(result.cause), "This thread identity is already in use.");
      assert.equal(yield* sink.latestSequence(), sequence);
      assert.deepEqual(
        yield* fixture.sql`SELECT * FROM orchestration_v2_projection_threads ORDER BY thread_id`,
        before,
      );
      assert.equal(
        (yield* fixture.sql`SELECT * FROM orchestration_v2_command_receipts WHERE command_id = ${commandId}`)
          .length,
        0,
      );
      assert.equal(
        (yield* fixture.sql`SELECT * FROM orchestration_v2_effect_outbox WHERE command_id = ${commandId}`)
          .length,
        0,
      );
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect("replays a creation receipt before checking its now occupied identity", () =>
  Effect.gen(function* () {
    const fixture = yield* seed();
    const sink = yield* EventSink.EventSinkV2;
    const original = yield* fixture.projections.getThread(sourceThreadId);
    const threadId = ThreadId.make("thread:transition:receipt");
    const input = {
      commandId: CommandId.make("command:transition:receipt"),
      threadId,
      commandType: "thread.create",
      acceptedAt: fixture.now,
      effects: [],
      events: [
        {
          id: fixture.eventId(),
          threadId,
          type: "thread.created" as const,
          occurredAt: fixture.now,
          payload: {
            ...original,
            id: threadId,
            lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
          },
        },
      ],
    };
    const first = yield* sink.commitCommand(input);
    const replay = yield* sink.commitCommand(input);
    assert.isTrue(first.committed);
    assert.isFalse(replay.committed);
    assert.deepEqual(replay.receipt, first.receipt);
    assert.deepEqual(replay.storedEvents, first.storedEvents);
  }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect(
  "refuses delegated identity replacement while transition and follow-up acquire opposite locks",
  () => {
    const database = SqlitePersistence.layerMemory;
    const registry = ProviderAdapterRegistry.layerFromAdaptersEffect(
      ProviderAdapter.ProviderAdapterV2.pipe(Effect.map((adapter) => [adapter])),
    ).pipe(
      Layer.provide(
        Layer.mock(ProviderAdapter.ProviderAdapterV2)({
          instanceId,
          driver,
          getCapabilities: () => Effect.succeed(CodexProviderCapabilitiesV2),
          planSelectionTransition: () => Effect.succeed({ type: "apply_on_next_turn" }),
        }),
      ),
    );
    const runtime = ProviderReplayHarness.layerWithRegistry(
      { name: "identity-collision" },
      registry,
      { databaseLayer: database, runEffectWorker: false },
    );
    return Effect.gen(function* () {
      const fixture = yield* seed();
      const orchestrator = yield* Orchestrator.OrchestratorV2;
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const commands = yield* ThreadCommandExecutor.ThreadCommandExecutor;
      const allocator = yield* IdAllocator.IdAllocatorV2;
      const commandId = CommandId.make("command:transition:collision");
      const childId = allocator.derive.delegatedTaskThread({ commandId });
      assert.isTrue(childId < successorThreadId);
      yield* createDestination(fixture, childId);
      const parent = yield* fixture.projections.getThreadProjection(successorThreadId);
      const run = parent.runs[0]!;
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: successorThreadId,
        type: "run.updated",
        occurredAt: fixture.now,
        payload: { ...run, status: "running", completedAt: null },
      });
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: successorThreadId,
        type: "node.updated",
        occurredAt: fixture.now,
        payload: {
          id: run.rootNodeId!,
          threadId: successorThreadId,
          runId: run.id,
          parentNodeId: null,
          rootNodeId: run.rootNodeId!,
          kind: "root_turn",
          status: "running",
          countsForRun: true,
          providerThreadId: run.providerThreadId,
          providerTurnId: null,
          nativeItemRef: null,
          runtimeRequestId: null,
          checkpointScopeId: null,
          startedAt: fixture.now,
          completedAt: null,
        },
      });
      const input = yield* destinationInput(
        fixture,
        childId,
        successorThreadId,
        "identity-lock-race",
      );
      const heldChild = yield* Deferred.make<void>();
      const releaseTransition = yield* Deferred.make<void>();
      const followupTriedChild = yield* Deferred.make<void>();
      const transitionTriedParent = yield* Deferred.make<void>();
      let phase: "transition" | "delegation" | "followup" | "released" = "transition";
      let followupHeldParent = false;
      const withLock = commands.withLock;
      using _locks = vi
        .spyOn(commands, "withLock")
        .mockImplementation(<A, E, R>(key: ThreadId, work: Effect.Effect<A, E, R>) =>
          Effect.gen(function* () {
            if (key === childId && phase === "followup")
              yield* Deferred.succeed(followupTriedChild, undefined);
            if (key === successorThreadId && phase === "released")
              yield* Deferred.succeed(transitionTriedParent, undefined);
            return yield* withLock(
              key,
              Effect.gen(function* () {
                if (key === childId && phase === "transition") {
                  yield* Deferred.succeed(heldChild, undefined);
                  yield* Deferred.await(releaseTransition);
                }
                if (key === successorThreadId && phase === "followup") followupHeldParent = true;
                return yield* work;
              }),
            );
          }),
        );
      const transition = yield* Effect.forkChild(service.commit(input));
      yield* Deferred.await(heldChild);
      phase = "delegation";
      const before = yield* fixture.projections.getThreadSnapshot(childId);
      const parentBefore = yield* fixture.projections.getThreadSnapshot(successorThreadId);
      const sequence = yield* fixture.sink.latestSequence();
      const collision = yield* orchestrator
        .dispatch({
          type: "delegated_task.request",
          commandId,
          parentThreadId: successorThreadId,
          parentRunId: run.id,
          parentNodeId: run.rootNodeId!,
          task: "Work",
          modelSelection,
          runtimeMode: "full-access",
          interactionMode: "default",
          completionWake: "always",
          workspaceStrategy: { type: "root" },
          createdBy: "agent",
          creationSource: "mcp",
        })
        .pipe(Effect.exit);
      const after = yield* fixture.projections.getThreadSnapshot(childId);
      const parentAfter = yield* fixture.projections.getThreadSnapshot(successorThreadId);
      const sequenceAfter = yield* fixture.sink.latestSequence();
      phase = "followup";
      const followup = yield* Effect.forkChild(
        orchestrator.dispatch({
          type: "message.dispatch",
          commandId: CommandId.make("command:transition:followup"),
          threadId: childId,
          messageId: MessageId.make("message:transition:followup"),
          text: "Continue",
          attachments: [],
          dispatchMode: { type: "defer_start" },
          createdBy: "user",
          creationSource: "web",
        }),
      );
      yield* Deferred.await(followupTriedChild);
      phase = "released";
      yield* Deferred.succeed(releaseTransition, undefined);
      yield* Deferred.await(transitionTriedParent);
      if (followupHeldParent) {
        // Both acquisitions were observed while their opposite locks were held.
        yield* Fiber.interrupt(transition);
        yield* Fiber.interrupt(followup);
        assert.fail("Identity replacement allowed the parent/child command-lock cycle");
      }
      const transitioned = yield* Fiber.join(transition);
      assert.equal(transitioned.status, "deferred");
      yield* Fiber.join(followup);
      assert.isTrue(Exit.isFailure(collision));
      if (Exit.isFailure(collision))
        assert.include(Cause.pretty(collision.cause), "This thread identity is already in use.");
      assert.deepEqual(after, before);
      assert.deepEqual(parentAfter, parentBefore);
      assert.equal(sequenceAfter, sequence);
      assert.equal(
        (yield* fixture.sql`SELECT * FROM orchestration_v2_command_receipts WHERE command_id = ${commandId}`)
          .length,
        0,
      );
      assert.equal(
        (yield* fixture.sql`SELECT * FROM orchestration_v2_effect_outbox WHERE command_id = ${commandId}`)
          .length,
        0,
      );
      assert.equal(
        (yield* fixture.sql`SELECT * FROM orchestration_events WHERE command_id = ${commandId}`)
          .length,
        0,
      );
    }).pipe(Effect.provide(Layer.mergeAll(testLayer(database), runtime, IdAllocator.layer)));
  },
);

it.effect.each(["missing", "stale", "wrong", "current"] as const)(
  "requires a current form revision after transition (%s)",
  (revision) =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const schedules = yield* ScheduledTaskService.ScheduledTaskService;
      const before = (yield* schedules.list()).tasks.find((task) => task.id === editInput.id)!;
      const committed = yield* service.commit(yield* fixture.input());
      assert.equal(committed.status, "committed");
      const current = (yield* schedules.list()).tasks.find((task) => task.id === editInput.id)!;
      const rows = yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`;
      const result = yield* schedules
        .upsert({
          ...editInput,
          ...(revision === "missing"
            ? {}
            : {
                expectedConfigRevision:
                  revision === "stale"
                    ? before.configRevision!
                    : revision === "wrong"
                      ? "wrong-revision"
                      : current.configRevision!,
              }),
        })
        .pipe(Effect.exit);
      assert.equal(Exit.isSuccess(result), revision === "current");
      if (revision !== "current")
        assert.deepEqual(yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`, rows);
      else if (Exit.isSuccess(result)) {
        assert.equal(result.value.task.threadId, null);
        assert.equal(result.value.task.threadMode, "new_thread");
        assert.notEqual(result.value.task.configRevision, current.configRevision);
      }
    }).pipe(
      Effect.provide(
        testLayer(
          SqlitePersistence.layerMemory,
          configurationTasks(Effect.succeed({ relayHookBaseUrl: null })),
        ),
      ),
    ),
);

it.effect("keeps legacy full edits compatible for schedules without a transition", () =>
  Effect.gen(function* () {
    yield* seed();
    const schedules = yield* ScheduledTaskService.ScheduledTaskService;
    const result = yield* schedules.upsert(editInput);
    assert.equal(result.task.threadId, null);
    assert.equal(result.task.title, "Edited");
  }).pipe(
    Effect.provide(
      testLayer(
        SqlitePersistence.layerMemory,
        configurationTasks(Effect.succeed({ relayHookBaseUrl: null })),
      ),
    ),
  ),
);

it.effect("allows exactly one of two queued distinct-source claims on a dedicated successor", () =>
  Effect.gen(function* () {
    const executor = yield* KeyedLock.make<ThreadId>();
    const held = yield* Deferred.make<void>();
    const release = yield* Deferred.make<void>();
    const queued = yield* Deferred.make<void>();
    let requests = 0;
    const commands = Layer.succeed(ThreadCommandExecutor.ThreadCommandExecutor, {
      ...executor,
      withLock: (key, work) =>
        Effect.gen(function* () {
          if (key === successorThreadId && ++requests === 2)
            yield* Deferred.succeed(queued, undefined);
          return yield* executor.withLock(key, work);
        }),
    });
    const holding = yield* Effect.forkChild(
      executor.withLock(
        successorThreadId,
        Deferred.succeed(held, undefined).pipe(Effect.andThen(Deferred.await(release))),
      ),
    );
    yield* Deferred.await(held);
    yield* Effect.gen(function* () {
      const fixture = yield* seed();
      const otherSource = ThreadId.make("thread:transition:other-source");
      yield* createDestination(fixture, otherSource);
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const inputs = [
        yield* fixture.input(),
        yield* destinationInput(fixture, otherSource, successorThreadId, "transition:other"),
      ];
      const pending = yield* Effect.forEach(inputs, (input) =>
        Effect.forkChild(service.commit(input)),
      );
      yield* Deferred.await(queued);
      assert.equal((yield* fixture.sql`SELECT * FROM thread_destination_transitions`).length, 2);
      yield* Deferred.succeed(release, undefined);
      const results = yield* Effect.forEach(pending, Fiber.join);
      assert.equal(results.filter((result) => result.status === "committed").length, 1);
      assert.deepEqual(
        results.find((result) => result.status !== "committed"),
        { status: "conflict", reason: "successor_unavailable" },
      );
      for (let index = 0; index < inputs.length; index++)
        assert.deepEqual(yield* service.commit(inputs[index]!), results[index]);
      assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 1);
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory, undefined, commands)));
    yield* Fiber.join(holding);
  }),
);

it.effect(
  "keeps the dedicated incoming claim after reopen and permits a later outgoing renewal",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-dedicated-successor-" });
      const databasePath = path.join(directory, "state.sqlite");
      const prepared = yield* Effect.scoped(
        Effect.gen(function* () {
          const fixture = yield* seed();
          const otherSource = ThreadId.make("thread:transition:other-source");
          const laterSuccessor = ThreadId.make("thread:transition:later-successor");
          yield* createDestination(fixture, otherSource);
          yield* createDestination(fixture, laterSuccessor, true);
          const service = yield* DestinationTransitionService.DestinationTransitionService;
          const input = yield* fixture.input();
          const committed = yield* service.commit(input);
          if (committed.status !== "committed") return assert.fail("Transition did not commit");
          return {
            input,
            committed,
            competing: yield* destinationInput(
              fixture,
              otherSource,
              successorThreadId,
              "transition:late-incoming",
            ),
            outgoing: yield* destinationInput(
              fixture,
              successorThreadId,
              laterSuccessor,
              "transition:outgoing",
            ),
          };
        }).pipe(Effect.provide(testLayer(SqlitePersistence.layerFromPath(databasePath)))),
      );
      yield* Effect.scoped(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const service = yield* DestinationTransitionService.DestinationTransitionService;
          assert.deepEqual(yield* service.commit(prepared.competing), {
            status: "conflict",
            reason: "successor_unavailable",
          });
          assert.deepEqual(yield* service.commit(prepared.input), prepared.committed);
          assert.deepEqual(
            yield* service.get({ operationId: prepared.input.operationId }),
            prepared.committed,
          );
          const outgoing = yield* service.commit(prepared.outgoing);
          assert.equal(outgoing.status, "committed");
          assert.deepEqual(yield* service.commit(prepared.outgoing), outgoing);
          assert.equal(
            (yield* sql`SELECT * FROM scheduled_tasks WHERE thread_id = ${prepared.outgoing.successorThreadId}`)
              .length,
            2,
          );
          assert.equal((yield* sql`SELECT * FROM retired_thread_destinations`).length, 2);
        }).pipe(Effect.provide(testLayer(SqlitePersistence.layerFromPath(databasePath)))),
      );
    }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect.each([
  { writer: "save", winner: "cutover" },
  { writer: "save", winner: "edit" },
  { writer: "toggle", winner: "cutover" },
  { writer: "toggle", winner: "edit" },
  { writer: "rotate", winner: "cutover" },
  { writer: "rotate", winner: "edit" },
  { writer: "delete", winner: "cutover" },
  { writer: "delete", winner: "edit" },
] as const)(
  "rejects stale configuration when $winner wins the $writer race",
  ({ writer, winner }) =>
    Effect.gen(function* () {
      const read = yield* Deferred.make<void>();
      const proceed = yield* Deferred.make<void>();
      let reads = 0;
      const tasks = configurationTasks(
        Effect.gen(function* () {
          if (++reads === 1) {
            yield* Deferred.succeed(read, undefined);
            yield* Deferred.await(proceed);
          }
          return { relayHookBaseUrl: null };
        }),
      );
      yield* Effect.gen(function* () {
        const fixture = yield* seed();
        if (writer === "rotate")
          yield* fixture.sql`UPDATE scheduled_tasks SET schedule_json = '{"type":"webhook","signature":null}', next_run_at = NULL WHERE task_id = 'schedule:a'`;
        const service = yield* DestinationTransitionService.DestinationTransitionService;
        const schedules = yield* ScheduledTaskService.ScheduledTaskService;
        const input = yield* fixture.input();
        const expectedConfigRevision = input.expectedScheduleBindings.find(
          (binding) => binding.id === editInput.id,
        )!.configRevision;
        const mutation =
          writer === "save"
            ? schedules.upsert({ ...editInput, expectedConfigRevision }).pipe(Effect.asVoid)
            : writer === "toggle"
              ? schedules.setEnabled({ id: editInput.id!, enabled: false }).pipe(Effect.asVoid)
              : writer === "rotate"
                ? schedules.rotateWebhookToken({ id: editInput.id! }).pipe(Effect.asVoid)
                : schedules.delete({ id: editInput.id! }).pipe(Effect.asVoid);
        const saving = yield* Effect.forkChild(mutation.pipe(Effect.exit));
        yield* Deferred.await(read);
        if (winner === "cutover") {
          const committed = yield* service.commit(input);
          if (committed.status !== "committed") return assert.fail("Transition did not commit");
          const after = yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`;
          yield* Deferred.succeed(proceed, undefined);
          assert.isTrue(Exit.isFailure(yield* Fiber.join(saving)));
          assert.deepEqual(
            yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`,
            after,
          );
          assert.deepEqual(yield* service.get({ operationId: input.operationId }), committed);
        } else {
          yield* Deferred.succeed(proceed, undefined);
          assert.isTrue(Exit.isSuccess(yield* Fiber.join(saving)));
          assert.deepEqual(yield* service.commit(input), {
            status: "conflict",
            reason: "schedule_manifest",
          });
          assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 0);
        }
      }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory, tasks)));
    }),
);

it.effect.each(
  (["source", "successor"] as const).flatMap((endpoint) =>
    (
      [
        "missing",
        "deleted",
        "ordinary-fork",
        "side-chat",
        "child",
        "provider-child",
        "remote-child",
      ] as const
    ).map((invalid) => ({ endpoint, invalid })),
  ),
)("rejects $invalid $endpoint before requesting held command locks", ({ endpoint, invalid }) =>
  Effect.gen(function* () {
    const threadId =
      invalid === "missing"
        ? ThreadId.make(`thread:transition:absent-${endpoint}`)
        : endpoint === "source"
          ? sourceThreadId
          : successorThreadId;
    const executor = yield* KeyedLock.make<ThreadId>();
    const attempted = yield* Deferred.make<void>();
    const held = yield* Deferred.make<void>();
    const release = yield* Deferred.make<void>();
    const commands = Layer.succeed(ThreadCommandExecutor.ThreadCommandExecutor, {
      ...executor,
      withLock: (key, work) =>
        Deferred.succeed(attempted, undefined).pipe(Effect.andThen(executor.withLock(key, work))),
    });
    const holding = yield* Effect.forkChild(
      executor.withLock(
        threadId,
        Deferred.succeed(held, undefined).pipe(Effect.andThen(Deferred.await(release))),
      ),
    );
    yield* Deferred.await(held);
    yield* Effect.gen(function* () {
      const fixture = yield* seed();
      if (invalid !== "missing") {
        const thread = yield* fixture.projections.getThread(threadId);
        const parentThreadId = threadId === sourceThreadId ? successorThreadId : sourceThreadId;
        yield* fixture.append({
          id: fixture.eventId(),
          threadId,
          type: invalid === "deleted" ? "thread.deleted" : "thread.metadata-updated",
          occurredAt: fixture.now,
          payload: {
            ...thread,
            ...(invalid === "deleted" ? { deletedAt: fixture.now } : {}),
            ...(invalid === "provider-child" ? { creationSource: "provider" } : {}),
            ...(invalid === "remote-child"
              ? {
                  delegatedFrom: {
                    environmentId: EnvironmentId.make("environment:remote-parent"),
                    threadId: parentThreadId,
                    title: "Remote parent",
                  },
                }
              : {}),
            lineage:
              invalid === "deleted" || invalid === "remote-child"
                ? thread.lineage
                : {
                    parentThreadId,
                    relationshipToParent:
                      invalid === "child" || invalid === "provider-child" ? "subagent" : "fork",
                    rootThreadId: parentThreadId,
                    ...(invalid === "side-chat" ? { sideChat: true } : {}),
                  },
          },
        });
      }
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const input = {
        ...(yield* fixture.input()),
        ...(endpoint === "source" ? { sourceThreadId: threadId } : { successorThreadId: threadId }),
      };
      const result = yield* Effect.raceFirst(
        service.commit(input),
        Deferred.await(attempted).pipe(
          Effect.andThen(Effect.die("Invalid transition endpoint requested a command lock")),
        ),
      );
      assert.deepEqual(result, { status: "conflict", reason: "invalid_threads" });
      assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 0);
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory, undefined, commands)));
    yield* Deferred.succeed(release, undefined);
    yield* Fiber.join(holding);
  }),
);

it.effect(
  "commits all bindings and the fence once, preserves schedule data, and rejects retired admission",
  () =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const input = yield* fixture.input();
      const before = yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`;
      yield* fixture.sql`
        INSERT INTO scheduled_task_webhook_deliveries (
          delivery_id, task_id, received_at, method, query, headers_json, body, body_bytes,
          body_truncated, outcome, signature_verified, missing_fields_json
        ) VALUES ('delivery:before', 'schedule:a', '2026-11-01', 'POST', '', '{}', '{}', 2,
          0, 'started', 1, '[]')
      `;
      const deliveries = yield* fixture.sql`SELECT * FROM scheduled_task_webhook_deliveries`;
      const committed = yield* service.commit(input);
      if (committed.status !== "committed") return assert.fail("Transition did not commit");
      assert.deepEqual(yield* service.commit(input), committed);
      assert.deepEqual(yield* service.get({ operationId: input.operationId }), committed);
      assert.deepEqual(
        yield* service.commit({
          ...input,
          expectedSourceSequence: input.expectedSourceSequence + 1,
        }),
        { status: "conflict", reason: "operation_arguments" },
      );
      const after = yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`;
      for (let index = 0; index < before.length; index++) {
        assert.deepEqual(
          {
            ...after[index],
            thread_id: before[index]!.thread_id,
            config_revision: before[index]!.config_revision,
          },
          before[index],
        );
        assert.equal(after[index]!.thread_id, successorThreadId);
        assert.notEqual(after[index]!.config_revision, before[index]!.config_revision);
      }
      assert.deepEqual(
        yield* fixture.sql`SELECT * FROM scheduled_task_webhook_deliveries`,
        deliveries,
      );
      assert.isTrue(
        Exit.isFailure(
          yield* fixture.sql`UPDATE scheduled_tasks SET thread_id = ${sourceThreadId} WHERE task_id = 'schedule:a'`.pipe(
            Effect.exit,
          ),
        ),
      );
      assert.isTrue(
        Exit.isFailure(
          yield* fixture
            .append({
              id: fixture.eventId(),
              threadId: sourceThreadId,
              type: "run.created",
              occurredAt: fixture.now,
              payload: {
                ...fixture.readyRun,
                id: RunId.make("run:late"),
                threadId: sourceThreadId,
              },
            })
            .pipe(Effect.exit),
        ),
      );
      const outbox = yield* EffectOutbox.EffectOutboxV2;
      assert.isTrue(
        Exit.isFailure(
          yield* outbox
            .enqueue([
              {
                id: "effect:late",
                threadId: sourceThreadId,
                commandId: CommandId.make("command:late"),
                request: { type: "provider-turn.start", runId: RunId.make("run:late") },
              },
            ])
            .pipe(Effect.exit),
        ),
      );
      const thread = yield* fixture.projections.getThread(sourceThreadId);
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "thread.settled",
        occurredAt: fixture.now,
        payload: { ...thread, settledOverride: "settled", settledAt: fixture.now },
      });
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect.each(["create", "edit", "delete", "recreate"] as const)(
  "rejects a changed complete manifest after schedule %s",
  (mutation) =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const input = yield* fixture.input();
      if (mutation === "edit")
        yield* fixture.sql`UPDATE scheduled_tasks SET prompt = 'Changed' WHERE task_id = 'schedule:a'`;
      else if (mutation === "create") yield* fixture.insertSchedule("schedule:c");
      else {
        yield* fixture.sql`DELETE FROM scheduled_tasks WHERE task_id = 'schedule:a'`;
        if (mutation === "recreate") yield* fixture.insertSchedule("schedule:a");
      }
      assert.deepEqual(yield* service.commit(input), {
        status: "conflict",
        reason: "schedule_manifest",
      });
      assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 0);
      const refreshed = yield* fixture.input();
      assert.deepEqual(yield* service.commit(refreshed), {
        status: "conflict",
        reason: "operation_arguments",
      });
      assert.equal(
        (yield* service.commit({ ...refreshed, operationId: "transition:refreshed" })).status,
        "committed",
      );
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect(
  "rolls back an injected failure midway through multiple bindings and safely retries the reserved operation",
  () =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const input = yield* fixture.input();
      const before = yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`;
      yield* fixture.sql`CREATE TRIGGER reject_second_transition BEFORE UPDATE OF thread_id ON scheduled_tasks
    WHEN OLD.task_id = 'schedule:b' BEGIN SELECT RAISE(ABORT,'injected cutover failure'); END`;
      assert.isTrue(Exit.isFailure(yield* service.commit(input).pipe(Effect.exit)));
      assert.deepEqual(yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`, before);
      assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 0);
      assert.deepEqual(yield* service.get({ operationId: input.operationId }), {
        status: "not_found",
      });
      assert.deepEqual(yield* service.commit({ ...input, expectedSourceSequence: 0 }), {
        status: "conflict",
        reason: "operation_arguments",
      });
      yield* fixture.sql`DROP TRIGGER reject_second_transition`;
      assert.equal((yield* service.commit(input)).status, "committed");
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect("defers for a captured dispatch claim after its task is edited and deleted", () =>
  Effect.gen(function* () {
    const fixture = yield* seed();
    const service = yield* DestinationTransitionService.DestinationTransitionService;
    yield* fixture.sql`INSERT INTO scheduled_task_dispatch_claims SELECT task_id,thread_id,config_revision,'2026-11-02T00:00:00.000Z'
    FROM scheduled_tasks WHERE task_id = 'schedule:a'`;
    yield* fixture.sql`UPDATE scheduled_tasks SET thread_id = ${successorThreadId} WHERE task_id = 'schedule:a'`;
    yield* fixture.sql`DELETE FROM scheduled_tasks WHERE task_id = 'schedule:a'`;
    const input = yield* fixture.input();
    assert.deepEqual(yield* service.commit(input), {
      status: "deferred",
      blockers: [{ threadId: sourceThreadId, kind: "schedule_claims", count: 1 }],
    });
    assert.deepEqual(yield* service.get({ operationId: input.operationId }), {
      status: "not_found",
    });
    assert.deepEqual(yield* service.commit({ ...input, expectedSourceSequence: 0 }), {
      status: "conflict",
      reason: "operation_arguments",
    });
    yield* fixture.sql`DELETE FROM scheduled_task_dispatch_claims`;
    assert.equal((yield* service.commit(input)).status, "committed");
  }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect.each(
  (
    [
      ["held queue", "unfinished_runs"],
      ["unfinished tool", "unfinished_nodes"],
      ["approval", "pending_input"],
      ["user input", "pending_input"],
      ["provider background work", "provider_work"],
      ["native child", "unfinished_runs"],
      ["pending completion", "completion_delivery"],
      ["claimed completion", "completion_delivery"],
      ["notification", "completion_delivery"],
      ["pending effect", "effects"],
      ["running effect", "effects"],
      ["PR watch", "persistent_watch"],
      ["launch acknowledgement", "successor_not_ready"],
    ] as const
  ).map(([work, kind]) => ({ work, kind })),
)("defers for $work without moving a destination", ({ work, kind }) =>
  Effect.gen(function* () {
    const fixture = yield* seed(work !== "launch acknowledgement");
    const service = yield* DestinationTransitionService.DestinationTransitionService;
    const source = yield* fixture.projections.getThread(sourceThreadId);
    const successor = yield* fixture.projections.getThreadProjection(successorThreadId);
    let blockedThreadId = sourceThreadId;
    if (work === "held queue" || work === "native child") {
      if (work === "native child") {
        blockedThreadId = ThreadId.make("thread:transition:native-child");
        yield* fixture.append({
          id: fixture.eventId(),
          threadId: blockedThreadId,
          type: "thread.created",
          occurredAt: fixture.now,
          payload: {
            ...source,
            id: blockedThreadId,
            creationSource: "provider",
            lineage: {
              parentThreadId: sourceThreadId,
              relationshipToParent: "subagent",
              rootThreadId: sourceThreadId,
            },
          },
        });
      }
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: blockedThreadId,
        type: "run.created",
        occurredAt: fixture.now,
        payload: {
          ...fixture.readyRun,
          id: RunId.make("run:transition:blocked"),
          threadId: blockedThreadId,
          status: "queued",
          queueHeld: work === "held queue",
          activeAttemptId: null,
          startedAt: null,
          completedAt: null,
        },
      });
    } else if (work === "unfinished tool") {
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "node.updated",
        occurredAt: fixture.now,
        payload: {
          id: NodeId.make("node:transition:tool"),
          threadId: sourceThreadId,
          runId: null,
          parentNodeId: null,
          rootNodeId: NodeId.make("node:transition:tool"),
          kind: "tool_call",
          status: "running",
          countsForRun: true,
          providerThreadId: null,
          providerTurnId: null,
          nativeItemRef: null,
          runtimeRequestId: null,
          checkpointScopeId: null,
          startedAt: fixture.now,
          completedAt: null,
        },
      });
    } else if (work === "approval" || work === "user input") {
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "runtime-request.updated",
        occurredAt: fixture.now,
        payload: {
          id: RuntimeRequestId.make("request:transition:blocked"),
          nodeId: NodeId.make("node:transition:blocked"),
          providerTurnId: null,
          nativeRequestRef: null,
          kind: work === "approval" ? "command" : "user_input",
          status: "pending",
          responseCapability: { type: "message" },
          createdAt: fixture.now,
          resolvedAt: null,
        },
      });
    } else if (work === "provider background work") {
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "provider-thread.updated",
        occurredAt: fixture.now,
        payload: {
          ...successor.providerThreads[0]!,
          id: ProviderThreadId.make("provider-thread:transition:background"),
          appThreadId: sourceThreadId,
          pendingBackgroundTasks: [{ taskId: "background", kind: "command", description: "Build" }],
        },
      });
    } else if (work === "pending completion" || work === "claimed completion") {
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "subagent.updated",
        occurredAt: fixture.now,
        payload: {
          id: NodeId.make("task:transition:completion"),
          threadId: sourceThreadId,
          runId: null,
          parentNodeId: NodeId.make("node:transition:parent"),
          origin: "app_owned",
          createdBy: "agent",
          driver,
          providerInstanceId: instanceId,
          providerThreadId: null,
          childThreadId: null,
          nativeTaskRef: null,
          prompt: "Work",
          title: null,
          model: null,
          status: "completed",
          completionDelivery: {
            state: work === "pending completion" ? "pending" : "claimed",
            observedByRunId: null,
          },
          result: "Done",
          startedAt: fixture.now,
          completedAt: fixture.now,
          updatedAt: fixture.now,
        },
      });
    } else if (work === "notification") {
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "message.updated",
        occurredAt: fixture.now,
        payload: {
          id: MessageId.make("message:transition:notification"),
          threadId: sourceThreadId,
          runId: null,
          nodeId: null,
          role: "user",
          text: "Background work completed",
          attachments: [],
          streaming: false,
          createdAt: fixture.now,
          updatedAt: fixture.now,
          createdBy: "agent",
          creationSource: "provider",
          notification: { source: { kind: "command" }, outcome: "completed", summary: "Done" },
        },
      });
    } else if (work === "pending effect" || work === "running effect") {
      const outbox = yield* EffectOutbox.EffectOutboxV2;
      yield* outbox.enqueue([
        {
          id: "effect:transition:blocked",
          commandId: CommandId.make("command:transition:blocked"),
          threadId: sourceThreadId,
          request: { type: "provider-runtime.continue", sourceRunId: fixture.readyRun.id },
        },
      ]);
      if (work === "running effect") {
        yield* fixture.sql`UPDATE orchestration_v2_effect_outbox SET status = 'running'`;
      }
    } else if (work === "PR watch") {
      yield* fixture.append({
        id: fixture.eventId(),
        threadId: sourceThreadId,
        type: "thread.metadata-updated",
        occurredAt: fixture.now,
        payload: { ...source, pullRequests: [watchedPullRequest] },
      });
    } else {
      blockedThreadId = successorThreadId;
    }
    const input = yield* fixture.input();
    const before = yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`;
    assert.deepEqual(yield* service.commit(input), {
      status: "deferred",
      blockers: [{ threadId: blockedThreadId, kind, count: 1 }],
    });
    assert.deepEqual(yield* fixture.sql`SELECT * FROM scheduled_tasks ORDER BY task_id`, before);
    assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 0);
  }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect("fences native descendants, new children and stale PR watches after cutover", () =>
  Effect.gen(function* () {
    const fixture = yield* seed();
    const service = yield* DestinationTransitionService.DestinationTransitionService;
    const source = yield* fixture.projections.getThread(sourceThreadId);
    const childId = ThreadId.make("thread:transition:native-child");
    const child = {
      ...source,
      id: childId,
      creationSource: "provider" as const,
      lineage: {
        parentThreadId: sourceThreadId,
        relationshipToParent: "subagent" as const,
        rootThreadId: sourceThreadId,
      },
    };
    yield* fixture.append({
      id: fixture.eventId(),
      threadId: childId,
      type: "thread.created",
      occurredAt: fixture.now,
      payload: child,
    });
    assert.equal((yield* service.commit(yield* fixture.input())).status, "committed");
    for (const event of [
      {
        threadId: childId,
        type: "run.created",
        payload: { ...fixture.readyRun, id: RunId.make("run:late-child"), threadId: childId },
      },
      {
        threadId: ThreadId.make("thread:transition:late-child"),
        type: "thread.created",
        payload: { ...child, id: ThreadId.make("thread:transition:late-child") },
      },
      {
        threadId: sourceThreadId,
        type: "thread.metadata-updated",
        payload: { ...source, pullRequests: [watchedPullRequest] },
      },
    ] as const) {
      assert.isTrue(
        Exit.isFailure(
          yield* fixture
            .append({ ...event, id: fixture.eventId(), occurredAt: fixture.now })
            .pipe(Effect.exit),
        ),
      );
    }
    const outbox = yield* EffectOutbox.EffectOutboxV2;
    assert.isTrue(
      Exit.isFailure(
        yield* outbox
          .enqueue([
            {
              id: "effect:late-child",
              commandId: CommandId.make("command:late-child"),
              threadId: childId,
              request: { type: "provider-turn.start", runId: RunId.make("run:late-child") },
            },
          ])
          .pipe(Effect.exit),
      ),
    );
  }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect.each([sourceThreadId, successorThreadId])(
  "rejects provider-owned destination %s",
  (threadId) =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const thread = yield* fixture.projections.getThread(threadId);
      const parentThreadId = threadId === sourceThreadId ? successorThreadId : sourceThreadId;
      yield* fixture.append({
        id: fixture.eventId(),
        threadId,
        type: "thread.metadata-updated",
        occurredAt: fixture.now,
        payload: {
          ...thread,
          creationSource: "provider",
          lineage: {
            parentThreadId,
            relationshipToParent: "subagent",
            rootThreadId: parentThreadId,
          },
        },
      });
      assert.deepEqual(yield* service.commit(yield* fixture.input()), {
        status: "conflict",
        reason: "invalid_threads",
      });
      assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 0);
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect(
  "reads the same receipt after discarding the commit reply and reopening the database",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-destination-restart-" });
      const databasePath = path.join(directory, "state.sqlite");
      const input = yield* Effect.scoped(
        Effect.gen(function* () {
          const fixture = yield* seed();
          const input = yield* fixture.input();
          const service = yield* DestinationTransitionService.DestinationTransitionService;
          yield* service.commit(input);
          return input;
        }).pipe(Effect.provide(testLayer(SqlitePersistence.layerFromPath(databasePath)))),
      );
      yield* Effect.scoped(
        Effect.gen(function* () {
          const service = yield* DestinationTransitionService.DestinationTransitionService;
          const receipt = yield* service.get({ operationId: input.operationId });
          if (receipt.status !== "committed") return assert.fail("Committed receipt was lost");
          assert.deepEqual(yield* service.commit(input), receipt);
          const sql = yield* SqlClient.SqlClient;
          assert.equal((yield* sql`SELECT * FROM retired_thread_destinations`).length, 1);
          assert.equal(
            (yield* sql`SELECT * FROM scheduled_tasks WHERE thread_id = ${sourceThreadId}`).length,
            0,
          );
        }).pipe(Effect.provide(testLayer(SqlitePersistence.layerFromPath(databasePath)))),
      );
    }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("reserves immutable arguments across a lost deferred reply and database reopen", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-destination-deferred-" });
    const databasePath = path.join(directory, "state.sqlite");
    const input = yield* Effect.scoped(
      Effect.gen(function* () {
        const fixture = yield* seed();
        const service = yield* DestinationTransitionService.DestinationTransitionService;
        yield* fixture.sql`INSERT INTO scheduled_task_dispatch_claims
          SELECT task_id,thread_id,config_revision,'2026-11-02T00:00:00.000Z'
          FROM scheduled_tasks WHERE task_id = 'schedule:a'`;
        const input = yield* fixture.input();
        assert.equal((yield* service.commit(input)).status, "deferred");
        return input;
      }).pipe(Effect.provide(testLayer(SqlitePersistence.layerFromPath(databasePath)))),
    );
    yield* Effect.scoped(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const service = yield* DestinationTransitionService.DestinationTransitionService;
        assert.deepEqual(yield* service.get({ operationId: input.operationId }), {
          status: "not_found",
        });
        assert.deepEqual(
          yield* service.commit({
            ...input,
            expectedSourceSequence: input.expectedSourceSequence + 1,
          }),
          {
            status: "conflict",
            reason: "operation_arguments",
          },
        );
        yield* sql`DELETE FROM scheduled_task_dispatch_claims`;
        assert.equal((yield* service.commit(input)).status, "committed");
      }).pipe(Effect.provide(testLayer(SqlitePersistence.layerFromPath(databasePath)))),
    );
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect.each(["same operation", "competing operation"] as const)(
  "serializes concurrent retries for %s into one cutover",
  (retry) =>
    Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const input = yield* fixture.input();
      const results = yield* Effect.all(
        [
          service.commit(input),
          service.commit({
            ...input,
            operationId: retry === "same operation" ? input.operationId : "transition:competing",
          }),
        ],
        { concurrency: "unbounded" },
      );
      if (retry === "same operation") {
        assert.deepEqual(results[0], results[1]);
        assert.equal(results[0]?.status, "committed");
      } else {
        assert.equal(results.filter((result) => result.status === "committed").length, 1);
        assert.deepEqual(
          results.find((result) => result.status === "conflict"),
          {
            status: "conflict",
            reason: "source_retired",
          },
        );
      }
      assert.equal((yield* fixture.sql`SELECT * FROM retired_thread_destinations`).length, 1);
      assert.equal(
        (yield* fixture.sql`SELECT * FROM thread_destination_transitions WHERE receipt_json IS NOT NULL`)
          .length,
        1,
      );
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory))),
);

it.effect.each([
  { winner: "claim", trigger: "scheduled" },
  { winner: "cutover", trigger: "scheduled" },
  { winner: "claim", trigger: "webhook" },
  { winner: "cutover", trigger: "webhook" },
] as const)("preserves the occurrence when $winner wins the $trigger race", ({ winner, trigger }) =>
  Effect.gen(function* () {
    const dueWork = yield* Deferred.make<Effect.Effect<void>>();
    const entered = yield* Deferred.make<void>();
    const proceed = yield* Deferred.make<void>();
    const webhookDone = yield* Deferred.make<void>();
    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);
        const end = span.end.bind(span);
        span.end = (...args) => {
          end(...args);
          if (span.name === "ScheduledTaskService.runWebhookDelivery")
            Deferred.doneUnsafe(webhookDone, Effect.void);
        };
        return span;
      },
    });
    const targets: ThreadId[] = [];
    let reads = 0;
    const scheduler = Layer.succeed(Scheduler.Scheduler, {
      register: <E, R>(name: string, work: Effect.Effect<void, E, R>) =>
        Effect.gen(function* () {
          if (name !== "scheduled-tasks") return;
          const context = yield* Effect.context<R>();
          yield* Deferred.succeed(dueWork, work.pipe(Effect.provideContext(context), Effect.orDie));
        }),
    });
    const scheduledTasks = ScheduledTaskService.layer.pipe(
      Layer.provide(
        Layer.mergeAll(
          ManagedPolicy.layerTest(),
          Layer.mock(ThreadLaunchService.ThreadLaunchService)({}),
          Layer.mock(ThreadManagementService.ThreadManagementService)({
            sendToThread: (input) =>
              Effect.gen(function* () {
                targets.push(input.threadId);
                if (winner === "claim") {
                  yield* Deferred.succeed(entered, undefined);
                  yield* Deferred.await(proceed);
                }
                return {} as never;
              }),
          }),
          Layer.mock(SecretRequests.SecretRequests)({}),
          Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({
            namedProjectsRoot: "/projects",
            isScratchProject: () => Effect.succeed(false),
          }),
          NodeCrypto.layer,
          scheduler,
        ),
      ),
      Layer.provide(
        Layer.succeed(
          ScheduledTaskService.ScheduledTaskWebhookOrigin,
          Effect.gen(function* () {
            reads += 1;
            if (winner === "cutover" && reads === 1) {
              yield* Deferred.succeed(entered, undefined);
              yield* Deferred.await(proceed);
            }
            return { relayHookBaseUrl: null };
          }),
        ),
      ),
    );
    yield* Effect.gen(function* () {
      const fixture = yield* seed();
      yield* fixture.sql`DELETE FROM scheduled_tasks WHERE task_id = 'schedule:b'`;
      if (trigger === "webhook") {
        yield* fixture.sql`UPDATE scheduled_tasks SET schedule_json = '{"type":"webhook","signature":null}', next_run_at = NULL`;
      } else
        yield* fixture.sql`UPDATE scheduled_tasks SET next_run_at = ${DateTime.formatIso(fixture.now)}`;
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const input = yield* fixture.input();
      const before = yield* fixture.sql`SELECT next_run_at, run_count FROM scheduled_tasks`;
      const schedules = yield* ScheduledTaskService.ScheduledTaskService;
      const dispatch =
        trigger === "scheduled"
          ? yield* Effect.forkChild(yield* Deferred.await(dueWork))
          : undefined;
      if (trigger === "webhook") {
        const result = yield* schedules
          .triggerWebhook({
            hookId: "schedule:a",
            token: "fixture-token",
            method: "POST",
            path: "/api/hooks/schedule:a",
            query: "",
            headers: { "content-type": "application/json" },
            body: new TextEncoder().encode("{}"),
            bodyText: "{}",
          })
          .pipe(Effect.withTracer(tracer));
        assert.equal(result._tag, "accepted");
      }
      yield* Deferred.await(entered);
      const result = yield* service.commit(input);
      if (winner === "claim") {
        assert.deepEqual(result, {
          status: "deferred",
          blockers: [{ threadId: sourceThreadId, kind: "schedule_claims", count: 1 }],
        });
      } else assert.equal(result.status, "committed");
      assert.deepEqual(
        yield* fixture.sql`SELECT next_run_at, run_count FROM scheduled_tasks`,
        before,
      );
      yield* Deferred.succeed(proceed, undefined);
      if (dispatch === undefined) yield* Deferred.await(webhookDone);
      else yield* Fiber.join(dispatch);
      assert.deepEqual(targets, [winner === "claim" ? sourceThreadId : successorThreadId]);
      assert.equal(
        (yield* fixture.sql<{ run_count: number }>`SELECT run_count FROM scheduled_tasks`)[0]
          ?.run_count,
        8,
      );
      assert.equal((yield* fixture.sql`SELECT * FROM scheduled_task_dispatch_claims`).length, 0);
      if (trigger === "webhook") {
        assert.equal(
          (yield* schedules.listWebhookDeliveries({ id: ScheduledTaskId.make("schedule:a") }))
            .deliveries.length,
          1,
        );
        assert.deepEqual(
          yield* fixture.sql`SELECT state FROM scheduled_task_webhook_pending WHERE state IN ('pending','running')`,
          [],
        );
      }
      if (winner === "claim") assert.equal((yield* service.commit(input)).status, "committed");
    }).pipe(Effect.provide(testLayer(SqlitePersistence.layerMemory, scheduledTasks)));
  }),
);

it.effect.each([
  { kind: "direct send", retired: false },
  { kind: "direct send", retired: true },
  { kind: "provider notification", retired: false },
  { kind: "provider notification", retired: true },
])(
  "applies the destination fence to $kind through normal intake (retired=$retired)",
  ({ kind, retired }) => {
    const database = SqlitePersistence.layerMemory;
    const registry = ProviderAdapterRegistry.layerFromAdaptersEffect(
      ProviderAdapter.ProviderAdapterV2.pipe(Effect.map((adapter) => [adapter])),
    ).pipe(
      Layer.provide(
        Layer.mock(ProviderAdapter.ProviderAdapterV2)({
          instanceId,
          driver,
          getCapabilities: () => Effect.succeed(CodexProviderCapabilitiesV2),
          planSelectionTransition: () => Effect.succeed({ type: "apply_on_next_turn" }),
        }),
      ),
    );
    const runtime = ProviderReplayHarness.layerWithRegistry(
      { name: "destination-admission" },
      registry,
      {
        databaseLayer: database,
        runEffectWorker: false,
      },
    );
    return Effect.gen(function* () {
      const fixture = yield* seed();
      const service = yield* DestinationTransitionService.DestinationTransitionService;
      const orchestrator = yield* Orchestrator.OrchestratorV2;
      if (retired)
        assert.equal((yield* service.commit(yield* fixture.input())).status, "committed");
      const before = yield* fixture.projections.getThreadSnapshot(sourceThreadId);
      const result = yield* orchestrator
        .dispatch({
          type: "message.dispatch",
          commandId: CommandId.make("command:transition:intake"),
          threadId: sourceThreadId,
          messageId: MessageId.make("message:transition:intake"),
          text: "Work",
          attachments: [],
          dispatchMode: {
            type: kind === "provider notification" ? "queue_after_active" : "defer_start",
          },
          ...(kind === "provider notification"
            ? {
                createdBy: "agent" as const,
                creationSource: "provider" as const,
                notification: {
                  source: { kind: "command" as const },
                  outcome: "completed" as const,
                  summary: "Done",
                },
              }
            : { createdBy: "user" as const, creationSource: "web" as const }),
        })
        .pipe(Effect.exit);
      const after = yield* fixture.projections.getThreadSnapshot(sourceThreadId);
      if (!retired && Exit.isFailure(result)) return yield* Effect.failCause(result.cause);
      assert.equal(Exit.isFailure(result), retired);
      if (retired) assert.deepEqual(after, before);
      else {
        assert.equal(after.projection.messages.length, 1);
        assert.equal(after.projection.runs.length, 1);
        assert.equal((yield* service.commit(yield* fixture.input())).status, "deferred");
      }
    }).pipe(Effect.provide(Layer.mergeAll(testLayer(database), runtime)));
  },
);
