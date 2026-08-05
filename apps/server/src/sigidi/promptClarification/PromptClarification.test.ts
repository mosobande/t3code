import * as NodeServices from "@effect/platform-node/NodeServices";
import { it } from "@effect/vitest";
import { ProviderInstanceId, type ServerProvider } from "@t3tools/contracts";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import { expect } from "vite-plus/test";

import * as ProviderRegistry from "../../provider/Services/ProviderRegistry.ts";
import * as ServerSettings from "../../serverSettings.ts";
import * as TextGeneration from "../../textGeneration/TextGeneration.ts";
import * as PromptClarification from "./PromptClarification.ts";

const selection = { instanceId: ProviderInstanceId.make("codex"), model: "clarify-model" };
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
    models: [{ slug: selection.model, name: selection.model, isCustom: false, capabilities: null }],
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
  rewrite: NonNullable<TextGeneration.TextGeneration["Service"]["generatePromptClarification"]>,
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
  rewrite: NonNullable<TextGeneration.TextGeneration["Service"]["generatePromptClarification"]>,
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

it.layer(NodeServices.layer)("PromptClarification", (it) => {
  it.effect(
    "rejects missing, disabled, unavailable, and stale selections before provider invocation",
    () =>
      Effect.gen(function* () {
        let calls = 0;
        for (const snapshot of [
          [],
          [provider({ enabled: false })],
          [provider({ availability: "unavailable" })],
          [provider({ status: "warning" })],
          [provider({ models: [] })],
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
});
