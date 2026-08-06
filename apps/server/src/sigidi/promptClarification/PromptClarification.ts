import {
  COMPOSER_MAX_INPUT_CHARS,
  PromptClarificationError,
  PROMPT_CLARIFICATION_TIMEOUT_MS,
  type PromptClarificationRewriteInput,
  type PromptClarificationRewriteResult,
} from "@t3tools/contracts";
import { isModelSelectionProviderEnabled } from "@t3tools/shared/serverSettings";
import * as Context from "effect/Context";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";

import * as ProviderRegistry from "../../provider/Services/ProviderRegistry.ts";
import * as ServerSettings from "../../serverSettings.ts";
import * as TextGeneration from "../../textGeneration/TextGeneration.ts";
import { metricAttributes } from "../../observability/Metrics.ts";
import { buildPromptClarificationPayload } from "./PromptClarificationPolicy.ts";

export class PromptClarification extends Context.Service<
  PromptClarification,
  {
    readonly rewrite: (
      sessionId: string,
      input: PromptClarificationRewriteInput,
    ) => Effect.Effect<PromptClarificationRewriteResult, PromptClarificationError>;
  }
>()("t3/sigidi/promptClarification/PromptClarification") {}

const inFlightKey = (sessionId: string, draftKey: string) => `${sessionId}\u0000${draftKey}`;
const isPromptClarificationError = Schema.is(PromptClarificationError);

export const promptClarificationRequestsTotal = Metric.counter(
  "sigidi_prompt_clarification_requests_total",
  { description: "Total prompt clarification rewrite requests." },
);

export const promptClarificationRequestDuration = Metric.timer(
  "sigidi_prompt_clarification_request_duration",
  { description: "Prompt clarification rewrite request duration." },
);

const sanitizeFailureCategory = (cause: Cause.Cause<unknown>) =>
  Option.match(Cause.findErrorOption(cause), {
    onNone: () => "provider_failed",
    onSome: (error) => (isPromptClarificationError(error) ? error.category : "provider_failed"),
  });

const observeRewrite = <A, R>(
  selection: { readonly instanceId: string; readonly model: string },
  inputChars: number,
  effect: Effect.Effect<A, PromptClarificationError, R>,
): Effect.Effect<A, PromptClarificationError, R> =>
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeNanos;
    const exit = yield* Effect.exit(effect);
    const endedAt = yield* Clock.currentTimeNanos;
    const duration = Duration.nanos(endedAt > startedAt ? endedAt - startedAt : 0n);
    const base = {
      provider: selection.instanceId,
      model: selection.model,
      inputChars,
    };

    if (Exit.isSuccess(exit)) {
      const attributes = metricAttributes({
        ...base,
        outputChars: (exit.value as PromptClarificationRewriteResult).text.length,
        outcome: "success",
        errorCategory: "none",
      });
      yield* Metric.update(Metric.withAttributes(promptClarificationRequestsTotal, attributes), 1);
      yield* Metric.update(
        Metric.withAttributes(promptClarificationRequestDuration, attributes),
        duration,
      );
      return exit.value;
    }

    const attributes = metricAttributes({
      ...base,
      outputChars: 0,
      outcome: "failure",
      errorCategory: sanitizeFailureCategory(exit.cause),
    });
    yield* Metric.update(Metric.withAttributes(promptClarificationRequestsTotal, attributes), 1);
    yield* Metric.update(
      Metric.withAttributes(promptClarificationRequestDuration, attributes),
      duration,
    );
    if (Cause.hasInterruptsOnly(exit.cause)) {
      return yield* Effect.failCause(exit.cause);
    }
    const error = Option.getOrNull(Cause.findErrorOption(exit.cause));
    if (error !== null && isPromptClarificationError(error)) {
      return yield* error;
    }
    return yield* new PromptClarificationError({ category: "provider_failed" });
  });

export const layer = Layer.effect(
  PromptClarification,
  Effect.gen(function* () {
    const settings = yield* ServerSettings.ServerSettingsService;
    const providers = yield* ProviderRegistry.ProviderRegistry;
    const textGeneration = yield* TextGeneration.TextGeneration;
    const fileSystem = yield* FileSystem.FileSystem;
    const inFlight = yield* Ref.make(new Set<string>());

    const rewrite = (sessionId: string, input: PromptClarificationRewriteInput) =>
      Effect.gen(function* () {
        const key = inFlightKey(sessionId, input.draftKey);
        const acquired = yield* Ref.modify(inFlight, (current) =>
          current.has(key) ? [false, current] : [true, new Set(current).add(key)],
        );
        if (!acquired) return yield* new PromptClarificationError({ category: "already_running" });
        yield* Effect.addFinalizer(() =>
          Ref.update(inFlight, (current) => {
            const next = new Set(current);
            next.delete(key);
            return next;
          }),
        );

        const currentSettings = yield* settings.getSettings.pipe(
          Effect.mapError(() => new PromptClarificationError({ category: "unavailable" })),
        );
        const selection = currentSettings.promptClarificationModelSelection;
        return yield* observeRewrite(
          selection,
          input.text.length,
          Effect.gen(function* () {
            const snapshot = (yield* providers.getProviders).find(
              (provider) => provider.instanceId === selection.instanceId,
            );
            if (
              !isModelSelectionProviderEnabled(currentSettings, selection) ||
              !snapshot ||
              !snapshot.enabled ||
              !snapshot.installed ||
              snapshot.status !== "ready" ||
              snapshot.availability === "unavailable" ||
              !snapshot.models.some((model) => model.slug === selection.model)
            ) {
              return yield* new PromptClarificationError({ category: "invalid_selection" });
            }

            const cwd = yield* fileSystem
              .makeTempDirectoryScoped({ prefix: "sigidi-prompt-clarify-" })
              .pipe(
                Effect.mapError(() => new PromptClarificationError({ category: "unavailable" })),
              );
            const prompt = buildPromptClarificationPayload(input.text);
            const generated = yield* textGeneration
              .generatePromptClarification({ cwd, prompt, modelSelection: selection })
              .pipe(
                Effect.timeoutOption(PROMPT_CLARIFICATION_TIMEOUT_MS),
                Effect.flatMap(
                  Option.match({
                    onNone: () =>
                      Effect.fail(new PromptClarificationError({ category: "timeout" })),
                    onSome: Effect.succeed,
                  }),
                ),
                Effect.mapError((error) =>
                  error._tag === "PromptClarificationError"
                    ? error
                    : new PromptClarificationError({ category: "provider_failed" }),
                ),
              );
            const text = generated.text.trim();
            if (!text || text.length > COMPOSER_MAX_INPUT_CHARS) {
              return yield* new PromptClarificationError({ category: "invalid_output" });
            }
            return { text, providerInstanceId: selection.instanceId, model: selection.model };
          }),
        );
      }).pipe(Effect.scoped);
    return PromptClarification.of({ rewrite });
  }),
);
