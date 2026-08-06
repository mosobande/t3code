import { describe, expect, it } from "vite-plus/test";
import { ProviderInstanceId, type PromptClarificationRewriteResult } from "@t3tools/contracts";

import { createPromptClarificationController } from "./controller";

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
  it("delivers the result with the captured snapshot", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const completed: Array<{
      result: PromptClarificationRewriteResult;
      snapshot: typeof snapshot;
    }> = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      onResult: (value, captured) => completed.push({ result: value, snapshot: captured }),
    });

    expect(controller.start(snapshot)).toBe(true);
    result.resolve(clarified());
    await Promise.resolve();

    expect(completed).toEqual([{ result: clarified(), snapshot }]);
  });

  it("allows one active request per environment and draft", () => {
    const pending = deferred<PromptClarificationRewriteResult>();
    const controller = createPromptClarificationController({ rewrite: () => pending.promise });

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

  it("abandons a late result after lifecycle invalidation", async () => {
    const result = deferred<PromptClarificationRewriteResult>();
    const completed: PromptClarificationRewriteResult[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      onResult: (value) => completed.push(value),
    });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };

    controller.start(snapshot);
    controller.invalidate(snapshot);
    result.resolve(clarified());
    await Promise.resolve();

    expect(completed).toEqual([]);
    expect(controller.isActive(snapshot)).toBe(false);
  });

  it("returns to idle after an error and permits a fresh request", async () => {
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
});
