import { describe, expect, it } from "vite-plus/test";

import { promptClarificationRequestKey } from "./promptClarification.ts";

describe("prompt clarification request key", () => {
  it("keys scheduled work by environment and draft", () => {
    expect(promptClarificationRequestKey({ environmentId: "env-a", draftKey: "draft" })).toBe(
      "env-a\u0000draft",
    );
    expect(promptClarificationRequestKey({ environmentId: "env-b", draftKey: "draft" })).not.toBe(
      promptClarificationRequestKey({ environmentId: "env-a", draftKey: "draft" }),
    );
  });
});
