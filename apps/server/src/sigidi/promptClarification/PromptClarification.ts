import {
  COMPOSER_MAX_INPUT_CHARS,
  PromptClarificationError,
  PROMPT_CLARIFICATION_TIMEOUT_MS,
  type PromptClarificationRewriteInput,
  type PromptClarificationRewriteResult,
} from "@t3tools/contracts";
import { isModelSelectionProviderEnabled } from "@t3tools/shared/serverSettings";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";

import * as ProviderRegistry from "../../provider/Services/ProviderRegistry.ts";
import * as ServerSettings from "../../serverSettings.ts";
import * as TextGeneration from "../../textGeneration/TextGeneration.ts";
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
        const snapshot = (yield* providers.getProviders).find(
          (provider) => provider.instanceId === selection.instanceId,
        );
        if (
          !isModelSelectionProviderEnabled(currentSettings, selection) ||
          !snapshot ||
          !snapshot.enabled ||
          !snapshot.installed ||
          snapshot.availability === "unavailable" ||
          !snapshot.models.some((model) => model.slug === selection.model)
        ) {
          return yield* new PromptClarificationError({ category: "invalid_selection" });
        }

        const cwd = yield* fileSystem
          .makeTempDirectoryScoped({ prefix: "sigidi-prompt-clarify-" })
          .pipe(Effect.mapError(() => new PromptClarificationError({ category: "unavailable" })));
        const payload = buildPromptClarificationPayload(input.text);
        if (!textGeneration.generatePromptClarification) {
          return yield* new PromptClarificationError({ category: "unavailable" });
        }
        const generated = yield* textGeneration
          .generatePromptClarification({ cwd, prompt: payload.prompt, modelSelection: selection })
          .pipe(
            Effect.timeoutOption(PROMPT_CLARIFICATION_TIMEOUT_MS),
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.fail(new PromptClarificationError({ category: "timeout" })),
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
      }).pipe(Effect.scoped);
    return PromptClarification.of({ rewrite });
  }),
);
