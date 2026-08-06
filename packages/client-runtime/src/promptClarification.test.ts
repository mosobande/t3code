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
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
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

  it("delivers the result for direct draft replacement", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const completed: Array<{
      result: PromptClarificationRewriteResult;
      snapshot: typeof current;
    }> = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      onResult: (value, snapshot) => completed.push({ result: value, snapshot }),
    });

    expect(controller.start(current)).toBe(true);
    result.resolve(clarified());
    await Promise.resolve();

    expect(completed).toEqual([{ result: clarified(), snapshot: current }]);
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

  it("returns to idle after an error and permits a fresh rewrite", async () => {
    const failed = deferred<PromptClarificationRewriteResult>();
    const pending = deferred<PromptClarificationRewriteResult>();
    const errors: unknown[] = [];
    let rewriteIndex = 0;
    const controller = createPromptClarificationController({
      rewrite: () => (rewriteIndex++ === 0 ? failed.promise : pending.promise),
      onError: (error) => errors.push(error),
    });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const error = new Error("provider failed");

    expect(controller.start(snapshot)).toBe(true);
    failed.reject(error);
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.isActive(snapshot)).toBe(false);
    expect(errors).toEqual([error]);
    expect(controller.start(snapshot)).toBe(true);
  });

  it("returns the captured snapshot so the caller can detect A to B to A edits", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    let current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const completedSnapshots: (typeof current)[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      onResult: (_value, snapshot) => completedSnapshots.push(snapshot),
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
    expect(completedSnapshots).toEqual([requested]);
  });

  it("abandons a late result after local cancellation", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const completed: PromptClarificationRewriteResult[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      onResult: (value) => completed.push(value),
    });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };

    controller.start(snapshot);
    controller.cancel(snapshot);
    result.resolve(clarified());
    await Promise.resolve();

    expect(completed).toEqual([]);
    expect(controller.isActive(snapshot)).toBe(false);
  });

  it("abandons late results when a draft, environment, or unmount invalidates its scope", async () => {
    const results = [
      deferred<PromptClarificationRewriteResult>(),
      deferred<PromptClarificationRewriteResult>(),
      deferred<PromptClarificationRewriteResult>(),
    ];
    const completed: PromptClarificationRewriteResult[] = [];
    let index = 0;
    const controller = createPromptClarificationController({
      rewrite: () => results[index++]!.promise,
      onResult: (value) => completed.push(value),
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

    expect(completed).toEqual([]);
    expect(snapshots.every((snapshot) => !controller.isActive(snapshot))).toBe(true);
  });
});
