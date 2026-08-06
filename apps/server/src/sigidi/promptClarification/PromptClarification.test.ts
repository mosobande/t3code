import * as NodeServices from "@effect/platform-node/NodeServices";
import { it } from "@effect/vitest";
import {
  COMPOSER_MAX_INPUT_CHARS,
  DEFAULT_TEXT_GENERATION_REASONING_EFFORT,
  PromptClarificationError,
  ProviderInstanceId,
  TextGenerationError,
  type ServerProvider,
} from "@t3tools/contracts";
import * as Deferred from "effect/Deferred";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import { expect } from "vite-plus/test";

import * as ProviderRegistry from "../../provider/Services/ProviderRegistry.ts";
import * as ServerSettings from "../../serverSettings.ts";
import * as TextGeneration from "../../textGeneration/TextGeneration.ts";
import * as PromptClarification from "./PromptClarification.ts";

const selection = {
  instanceId: ProviderInstanceId.make("codex"),
  model: "clarify-model",
  options: [
    {
      id: "reasoningEffort",
      value: DEFAULT_TEXT_GENERATION_REASONING_EFFORT,
    },
  ],
};
const input = { draftKey: "draft-1", text: "Keep /tmp/example and error E42" };

const provider = (overrides: Partial<ServerProvider> = {}): ServerProvider =>
  ({
    instanceId: selection.instanceId,
    driver: "codex",
    enabled: true,
    installed: true,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-01-01T00:00:00.000Z",
    version: "1",
    models: [
      {
        slug: selection.model,
        name: selection.model,
        isCustom: false,
        capabilities: null,
      },
    ],
    slashCommands: [],
    skills: [],
    ...overrides,
  }) as ServerProvider;

const registry = (
  providers: ReadonlyArray<ServerProvider>,
): ProviderRegistry.ProviderRegistry["Service"] => ({
  getProviders: Effect.succeed(providers),
  refresh: () => Effect.succeed(providers),
  refreshInstance: () => Effect.succeed(providers),
  getProviderMaintenanceCapabilitiesForInstance: () => Effect.die("unused"),
  setProviderMaintenanceActionState: () => Effect.succeed(providers),
  streamChanges: Stream.empty,
});

const textGeneration = (
  rewrite: TextGeneration.TextGeneration["Service"]["generatePromptClarification"],
) =>
  TextGeneration.TextGeneration.of({
    generateCommitMessage: () => Effect.die("unused"),
    generatePrContent: () => Effect.die("unused"),
    generateBranchName: () => Effect.die("unused"),
    generateThreadTitle: () => Effect.die("unused"),
    generatePromptClarification: rewrite,
  });

const layer = (
  providers: ReadonlyArray<ServerProvider>,
  rewrite: TextGeneration.TextGeneration["Service"]["generatePromptClarification"],
) =>
  PromptClarification.layer.pipe(
    Layer.provideMerge(ServerSettings.layerTest({ promptClarificationModelSelection: selection })),
    Layer.provideMerge(Layer.succeed(ProviderRegistry.ProviderRegistry, registry(providers))),
    Layer.provideMerge(Layer.succeed(TextGeneration.TextGeneration, textGeneration(rewrite))),
  );

const rewrite = (sessionId: string, rewriteInput: typeof input) =>
  Effect.flatMap(PromptClarification.PromptClarification, (service) =>
    service.rewrite(sessionId, rewriteInput),
  );

const metricSnapshotsFor = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string) =>
  snapshots.filter((snapshot) => snapshot.id === id);

it.layer(NodeServices.layer)("PromptClarification", (it) => {
  it.effect(
    "rejects missing, disabled, unavailable, and stale providers before provider invocation",
    () =>
      Effect.gen(function* () {
        let calls = 0;
        for (const snapshot of [
          [],
          [provider({ enabled: false })],
          [provider({ availability: "unavailable" })],
          [provider({ status: "warning" })],
        ] as const) {
          const result = yield* rewrite("session-a", input).pipe(
            Effect.result,
            Effect.provide(
              layer(snapshot, () => {
                calls++;
                return Effect.succeed({ text: "never" });
              }),
            ),
          );
          expect(result._tag).toBe("Failure");
        }
        expect(calls).toBe(0);
      }),
  );

  it.effect("lets the adapter use a configured utility model omitted from the catalog", () =>
    Effect.gen(function* () {
      const seenSelections: Array<{ instanceId: ProviderInstanceId; model: string }> = [];
      const result = yield* rewrite("session-a", input).pipe(
        Effect.provide(
          layer([provider({ models: [] })], ({ modelSelection }) => {
            seenSelections.push(modelSelection);
            return Effect.succeed({ text: "rewritten" });
          }),
        ),
      );

      expect(result.text).toBe("rewritten");
      expect(seenSelections).toEqual([selection]);
    }),
  );

  it.effect("rejects only same session and draft while allowing a distinct draft", () =>
    Effect.gen(function* () {
      const gate = yield* Deferred.make<void>();
      const live = layer([provider()], () =>
        Deferred.await(gate).pipe(Effect.as({ text: "rewritten" })),
      );
      const context = yield* Layer.build(live);
      const first = yield* Effect.forkScoped(
        rewrite("session-a", input).pipe(Effect.provide(context)),
      );
      yield* Effect.yieldNow;
      const duplicate = yield* rewrite("session-a", input).pipe(
        Effect.provide(context),
        Effect.result,
      );
      expect(duplicate._tag).toBe("Failure");
      const distinct = yield* Effect.forkScoped(
        rewrite("session-a", { ...input, draftKey: "draft-2" }).pipe(Effect.provide(context)),
      );
      yield* Effect.yieldNow;
      yield* Deferred.succeed(gate, undefined);
      expect((yield* Fiber.join(first)).text).toBe("rewritten");
      expect((yield* Fiber.join(distinct)).text).toBe("rewritten");
    }),
  );

  it.effect("records only allowlisted rewrite metrics when the provider echoes private text", () =>
    Effect.gen(function* () {
      const privateInput = {
        draftKey: "draft-secret-key",
        text: "private-input /tmp/secret stderr=secret-detail",
      };
      const privateOutput = "private-output stdout=secret-result";
      const result = yield* rewrite("session-private", privateInput).pipe(
        Effect.provide(layer([provider()], () => Effect.succeed({ text: privateOutput }))),
      );
      expect(result.text).toBe(privateOutput);

      const snapshots = yield* Metric.snapshot;
      const metrics = [
        ...metricSnapshotsFor(snapshots, "sigidi_prompt_clarification_requests_total"),
        ...metricSnapshotsFor(snapshots, "sigidi_prompt_clarification_request_duration"),
      ].filter((metric) => metric.attributes?.inputChars === String(privateInput.text.length));
      expect(metrics).toHaveLength(2);
      for (const metric of metrics) {
        expect(metric.attributes).toMatchObject({
          provider: "codex",
          model: "clarify-model",
          inputChars: String(privateInput.text.length),
          outputChars: String(privateOutput.length),
          outcome: "success",
          errorCategory: "none",
        });
        expect(
          Object.keys(metric.attributes ?? {}).every((key) =>
            [
              "provider",
              "model",
              "inputChars",
              "outputChars",
              "outcome",
              "errorCategory",
              "time_unit",
            ].includes(key),
          ),
        ).toBe(true);
        const values = Object.values(metric.attributes ?? {});
        expect(values).not.toContain(privateInput.draftKey);
        expect(values).not.toContain(privateInput.text);
        expect(values).not.toContain(privateOutput);
      }
    }),
  );

  it.effect("sanitizes provider failure metrics and returns only the error category", () =>
    Effect.gen(function* () {
      const privateInput = {
        draftKey: "draft-failure-key",
        text: "private-failure-input stderr=secret-detail",
      };
      const privateFailure = "private-failure stdout=secret-result";
      const error = yield* rewrite("session-failure", privateInput).pipe(
        Effect.flip,
        Effect.provide(
          layer([provider()], () =>
            Effect.fail(
              new TextGenerationError({
                operation: "generatePromptClarification",
                detail: privateFailure,
              }),
            ),
          ),
        ),
      );
      expect(error.category).toBe("provider_failed");

      const snapshots = yield* Metric.snapshot;
      const metrics = [
        ...metricSnapshotsFor(snapshots, "sigidi_prompt_clarification_requests_total"),
        ...metricSnapshotsFor(snapshots, "sigidi_prompt_clarification_request_duration"),
      ].filter((metric) => metric.attributes?.inputChars === String(privateInput.text.length));
      expect(metrics).toHaveLength(2);
      for (const metric of metrics) {
        expect(metric.attributes).toMatchObject({
          provider: "codex",
          model: "clarify-model",
          inputChars: String(privateInput.text.length),
          outputChars: "0",
          outcome: "failure",
          errorCategory: "provider_failed",
        });
        const values = Object.values(metric.attributes ?? {});
        expect(values).not.toContain(privateInput.draftKey);
        expect(values).not.toContain(privateInput.text);
        expect(values).not.toContain(privateFailure);
      }
    }),
  );

  it.effect("sanitizes provider defects into the public error category", () =>
    Effect.gen(function* () {
      const privateDefect = "private provider defect stdout=secret-result";
      const error = yield* rewrite("session-defect", input).pipe(
        Effect.flip,
        Effect.provide(layer([provider()], () => Effect.die(privateDefect))),
      );

      expect(error).toBeInstanceOf(PromptClarificationError);
      expect(error.category).toBe("provider_failed");
      expect(error).not.toHaveProperty("detail");
    }),
  );

  it.effect("rejects blank and over-limit provider output without returning it", () =>
    Effect.gen(function* () {
      const privateOversizedOutput = `private-provider-output ${"x".repeat(
        COMPOSER_MAX_INPUT_CHARS,
      )}`;

      for (const output of ["   \n\t", privateOversizedOutput]) {
        const error = yield* rewrite("session-invalid-output", input).pipe(
          Effect.flip,
          Effect.provide(layer([provider()], () => Effect.succeed({ text: output }))),
        );
        expect(error._tag).toBe("PromptClarificationError");
        expect(error.category).toBe("invalid_output");
        expect(Object.values(error)).not.toContain(output);
      }
    }),
  );

  it.effect("releases a timed-out session and draft key for a later rewrite", () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      let calls = 0;
      const live = layer([provider()], () => {
        calls += 1;
        return calls === 1
          ? Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never as Effect.Effect<{ readonly text: string }>),
            )
          : Effect.succeed({ text: "second rewrite" });
      });
      const context = yield* Layer.build(live);
      const first = yield* Effect.forkScoped(
        rewrite("session-timeout", input).pipe(Effect.provide(context), Effect.result),
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust(Duration.millis(60_000));
      yield* Effect.yieldNow;
      const firstResult = yield* Fiber.join(first);
      expect(firstResult._tag).toBe("Failure");
      if (firstResult._tag === "Failure") {
        const firstError = firstResult.failure;
        expect(firstError).toBeInstanceOf(PromptClarificationError);
        expect(firstError).toMatchObject({ category: "timeout" });
      }

      const second = yield* rewrite("session-timeout", input).pipe(Effect.provide(context));
      expect(second).toMatchObject({ text: "second rewrite" });
      expect(calls).toBe(2);
    }).pipe(Effect.provide(TestClock.layer())),
  );
});
