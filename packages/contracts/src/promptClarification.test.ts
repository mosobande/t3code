import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import {
  COMPOSER_MAX_INPUT_CHARS,
  PromptClarificationError,
  PromptClarificationRewriteInput,
  PromptClarificationRewriteResult,
} from "./index.ts";

const decodeInput = Schema.decodeUnknownSync(PromptClarificationRewriteInput);
const decodeResult = Schema.decodeUnknownSync(PromptClarificationRewriteResult);

describe("prompt clarification contract", () => {
  it("accepts only text and a bounded local draft key", () => {
    expect(decodeInput({ draftKey: "thread:1", text: "Clarify this" })).toEqual({
      draftKey: "thread:1",
      text: "Clarify this",
    });
    expect(() => decodeInput({ draftKey: "thread:1", text: "   " })).toThrow();
    expect(() =>
      decodeInput({ draftKey: "thread:1", text: "x".repeat(COMPOSER_MAX_INPUT_CHARS + 1) }),
    ).toThrow();
    expect(() => decodeInput({ draftKey: "draft key", text: "Clarify this" })).toThrow();
  });

  it("bounds output and exposes no raw error detail", () => {
    expect(() =>
      decodeResult({
        text: "x".repeat(COMPOSER_MAX_INPUT_CHARS + 1),
        providerInstanceId: "codex",
        model: "model",
      }),
    ).toThrow();
    const error = new PromptClarificationError({ category: "provider_failed" });
    expect(error.category).toBe("provider_failed");
    expect(error).not.toHaveProperty("detail");
    expect(error).not.toHaveProperty("cause");
  });
});
