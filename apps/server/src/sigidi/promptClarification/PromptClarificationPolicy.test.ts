import { expect, it } from "vite-plus/test";

import { buildPromptClarificationPayload } from "./PromptClarificationPolicy.ts";

it("requires a text-only rewrite that preserves intent without answering or adding scope", () => {
  const payload = buildPromptClarificationPayload("Keep the existing retry limit at 3.");

  expect(payload).toContain("Preserve intent");
  expect(payload).toContain("Do not answer the request or add scope");
  expect(payload).toContain("The text field must contain only the rewritten prompt.");
});
