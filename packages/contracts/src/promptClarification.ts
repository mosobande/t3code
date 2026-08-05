import * as Schema from "effect/Schema";

import { ProviderInstanceId } from "./providerInstance.ts";
import { TrimmedNonEmptyString } from "./baseSchemas.ts";
import { COMPOSER_MAX_INPUT_CHARS } from "./orchestration.ts";

export const PROMPT_CLARIFICATION_TIMEOUT_MS = 60_000;
export const PROMPT_CLARIFICATION_DRAFT_KEY_MAX_CHARS = 128;

const PromptClarificationDraftKey = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROMPT_CLARIFICATION_DRAFT_KEY_MAX_CHARS),
  Schema.isPattern(/^[a-zA-Z0-9._:-]+$/),
);

export const PromptClarificationRewriteInput = Schema.Struct({
  draftKey: PromptClarificationDraftKey,
  text: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(COMPOSER_MAX_INPUT_CHARS),
    Schema.isPattern(/\S/),
  ),
});
export type PromptClarificationRewriteInput = typeof PromptClarificationRewriteInput.Type;

export const PromptClarificationRewriteResult = Schema.Struct({
  text: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(COMPOSER_MAX_INPUT_CHARS)),
  providerInstanceId: ProviderInstanceId,
  model: TrimmedNonEmptyString,
});
export type PromptClarificationRewriteResult = typeof PromptClarificationRewriteResult.Type;

export const PromptClarificationErrorCategory = Schema.Literals([
  "unavailable",
  "invalid_selection",
  "already_running",
  "timeout",
  "invalid_output",
  "provider_failed",
]);
export type PromptClarificationErrorCategory = typeof PromptClarificationErrorCategory.Type;

/** Safe wire error. Do not add provider or request details to this schema. */
export class PromptClarificationError extends Schema.TaggedErrorClass<PromptClarificationError>()(
  "PromptClarificationError",
  { category: PromptClarificationErrorCategory },
) {}
