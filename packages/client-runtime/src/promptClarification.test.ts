import { describe, expect, it } from "vite-plus/test";
import { ProviderInstanceId } from "@t3tools/contracts";

import {
  createPromptClarificationController,
  promptClarificationRequestKey,
  type PromptClarificationRewriteResult,
} from "./promptClarification.ts";

const clarified = (text = "clear"): PromptClarificationRewriteResult => ({
  text,
  providerInstanceId: ProviderInstanceId.make("codex"),
  model: "gpt-5",
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("prompt clarification controller", () => {
  it("keys single-flight work by environment and draft", () => {
    expect(promptClarificationRequestKey({ environmentId: "env-a", draftKey: "draft" })).toBe(
      "env-a\u0000draft",
    );
    expect(promptClarificationRequestKey({ environmentId: "env-b", draftKey: "draft" })).not.toBe(
      promptClarificationRequestKey({ environmentId: "env-a", draftKey: "draft" }),
    );
  });

  it("applies text while retaining the effective provider and model", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    let current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const applied: string[] = [];
    const appliedResults: PromptClarificationRewriteResult[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      readCurrent: () => current,
      applyText: (text) => applied.push(text),
      onApplied: (value) => appliedResults.push(value),
    });

    expect(controller.start(current)).toBe(true);
    result.resolve(clarified());
    await Promise.resolve();

    expect(applied).toEqual(["clear"]);
    expect(appliedResults).toEqual([clarified()]);
  });

  it("rejects duplicate work for one environment and draft but permits another draft", () => {
    const pending = deferred<PromptClarificationRewriteResult>();
    const controller = createPromptClarificationController({
      rewrite: () => pending.promise,
      readCurrent: () => ({ environmentId: "env", draftKey: "draft", text: "rough", revision: 1 }),
      applyText: () => {},
    });

    expect(
      controller.start({ environmentId: "env", draftKey: "draft", text: "rough", revision: 1 }),
    ).toBe(true);
    expect(
      controller.start({ environmentId: "env", draftKey: "draft", text: "rough", revision: 1 }),
    ).toBe(false);
    expect(
      controller.start({ environmentId: "env", draftKey: "other", text: "rough", revision: 1 }),
    ).toBe(true);
  });

  it("leaves an edited then restored draft stale because its revision changed", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    let current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const stale: PromptClarificationRewriteResult[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      readCurrent: () => current,
      applyText: () => {},
      offerReview: (value) => stale.push(value),
    });

    controller.start(current);
    current = { ...current, text: "edited", revision: 2 };
    current = { ...current, text: "rough", revision: 3 };
    result.resolve(clarified());
    await Promise.resolve();

    expect(stale).toEqual([clarified()]);
  });

  it("abandons a late result after local cancellation", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const applied: string[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      readCurrent: () => ({ environmentId: "env", draftKey: "draft", text: "rough", revision: 1 }),
      applyText: (text) => applied.push(text),
    });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };

    controller.start(snapshot);
    controller.cancel(snapshot);
    result.resolve(clarified());
    await Promise.resolve();

    expect(applied).toEqual([]);
    expect(controller.isActive(snapshot)).toBe(false);
  });

  it("abandons late results when a draft, environment, or unmount invalidates its scope", async () => {
    const results = [
      deferred<PromptClarificationRewriteResult>(),
      deferred<PromptClarificationRewriteResult>(),
      deferred<PromptClarificationRewriteResult>(),
    ];
    const applied: string[] = [];
    let index = 0;
    const controller = createPromptClarificationController({
      rewrite: () => results[index++]!.promise,
      readCurrent: () => ({ environmentId: "env", draftKey: "draft", text: "rough", revision: 1 }),
      applyText: (text) => applied.push(text),
    });
    const snapshots = [
      { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 },
      { environmentId: "env", draftKey: "other", text: "rough", revision: 1 },
      { environmentId: "other-env", draftKey: "draft", text: "rough", revision: 1 },
    ];

    for (const [index, snapshot] of snapshots.entries()) {
      expect(controller.start(snapshot)).toBe(true);
      controller.invalidate(snapshot);
      results[index]!.resolve(clarified());
    }
    await Promise.resolve();

    expect(applied).toEqual([]);
    expect(snapshots.every((snapshot) => !controller.isActive(snapshot))).toBe(true);
  });
});
