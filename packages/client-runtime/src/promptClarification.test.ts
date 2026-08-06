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

  it("offers the result for explicit review without changing the draft", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const offered: Array<{
      result: PromptClarificationRewriteResult;
      snapshot: typeof current;
    }> = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      offerReview: (value, snapshot) => offered.push({ result: value, snapshot }),
    });

    expect(controller.start(current)).toBe(true);
    result.resolve(clarified());
    await Promise.resolve();

    expect(offered).toEqual([{ result: clarified(), snapshot: current }]);
  });

  it("rejects duplicate work for one environment and draft but permits another draft", () => {
    const pending = deferred<PromptClarificationRewriteResult>();
    const controller = createPromptClarificationController({
      rewrite: () => pending.promise,
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

  it("permits one fresh rewrite after lifecycle invalidation", () => {
    const pending = deferred<PromptClarificationRewriteResult>();
    const controller = createPromptClarificationController({ rewrite: () => pending.promise });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };

    expect(controller.start(snapshot)).toBe(true);
    controller.invalidate(snapshot);
    expect(controller.start(snapshot)).toBe(true);
  });

  it("returns the captured snapshot so the caller can detect A to B to A edits", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    let current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const offeredSnapshots: (typeof current)[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      offerReview: (_value, snapshot) => offeredSnapshots.push(snapshot),
    });

    const requested = current;
    controller.start(requested);
    current = { ...current, text: "edited", revision: 2 };
    current = { ...current, text: "rough", revision: 3 };
    result.resolve(clarified());
    await Promise.resolve();

    expect(current).toEqual({
      environmentId: "env",
      draftKey: "draft",
      text: "rough",
      revision: 3,
    });
    expect(offeredSnapshots).toEqual([requested]);
  });

  it("abandons a late result after local cancellation", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const offered: PromptClarificationRewriteResult[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      offerReview: (value) => offered.push(value),
    });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };

    controller.start(snapshot);
    controller.cancel(snapshot);
    result.resolve(clarified());
    await Promise.resolve();

    expect(offered).toEqual([]);
    expect(controller.isActive(snapshot)).toBe(false);
  });

  it("abandons late results when a draft, environment, or unmount invalidates its scope", async () => {
    const results = [
      deferred<PromptClarificationRewriteResult>(),
      deferred<PromptClarificationRewriteResult>(),
      deferred<PromptClarificationRewriteResult>(),
    ];
    const offered: PromptClarificationRewriteResult[] = [];
    let index = 0;
    const controller = createPromptClarificationController({
      rewrite: () => results[index++]!.promise,
      offerReview: (value) => offered.push(value),
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

    expect(offered).toEqual([]);
    expect(snapshots.every((snapshot) => !controller.isActive(snapshot))).toBe(true);
  });
});
