import { describe, expect, it } from "vite-plus/test";

import {
  createPromptClarificationController,
  promptClarificationRequestKey,
} from "./promptClarification.ts";

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

  it("applies a fresh result only to the captured text field", async () => {
    const result = deferred<string>();
    let current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const applied: string[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      readCurrent: () => current,
      applyText: (text) => applied.push(text),
    });

    expect(controller.start(current)).toBe(true);
    result.resolve("clear");
    await Promise.resolve();

    expect(applied).toEqual(["clear"]);
  });

  it("rejects duplicate work for one environment and draft but permits another draft", () => {
    const pending = deferred<string>();
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
    const result = deferred<string>();
    let current = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };
    const stale: string[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      readCurrent: () => current,
      applyText: () => {},
      offerReview: (text) => stale.push(text),
    });

    controller.start(current);
    current = { ...current, revision: 3 };
    result.resolve("clear");
    await Promise.resolve();

    expect(stale).toEqual(["clear"]);
  });

  it("abandons a late result after local cancellation", async () => {
    const result = deferred<string>();
    const applied: string[] = [];
    const controller = createPromptClarificationController({
      rewrite: () => result.promise,
      readCurrent: () => ({ environmentId: "env", draftKey: "draft", text: "rough", revision: 1 }),
      applyText: (text) => applied.push(text),
    });
    const snapshot = { environmentId: "env", draftKey: "draft", text: "rough", revision: 1 };

    controller.start(snapshot);
    controller.cancel(snapshot);
    result.resolve("clear");
    await Promise.resolve();

    expect(applied).toEqual([]);
    expect(controller.isActive(snapshot)).toBe(false);
  });

  it("abandons late results when a draft, environment, or unmount invalidates its scope", async () => {
    const results = [deferred<string>(), deferred<string>(), deferred<string>()];
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
      results[index]!.resolve("clear");
    }
    await Promise.resolve();

    expect(applied).toEqual([]);
    expect(snapshots.every((snapshot) => !controller.isActive(snapshot))).toBe(true);
  });
});
