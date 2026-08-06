import type { PromptClarificationRewriteResult } from "@t3tools/contracts";
import { promptClarificationRequestKey } from "@t3tools/client-runtime/promptClarification";

export interface PromptClarificationSnapshot {
  readonly environmentId: string;
  readonly draftKey: string;
  readonly text: string;
  /** Increment for every prompt mutation, including a return to the same text. */
  readonly revision: number;
}

interface PromptClarificationControllerOptions {
  readonly rewrite: (
    snapshot: PromptClarificationSnapshot,
  ) => Promise<PromptClarificationRewriteResult>;
  readonly onResult?: (
    result: PromptClarificationRewriteResult,
    snapshot: PromptClarificationSnapshot,
  ) => void;
  readonly onError?: (error: unknown) => void;
}

/** Owns the local lifetime of one Clarify request per environment and draft. */
export function createPromptClarificationController(options: PromptClarificationControllerOptions) {
  let nextToken = 0;
  const active = new Map<string, number>();

  const isActive = (snapshot: Pick<PromptClarificationSnapshot, "environmentId" | "draftKey">) =>
    active.has(promptClarificationRequestKey(snapshot));

  const invalidate = (
    snapshot: Pick<PromptClarificationSnapshot, "environmentId" | "draftKey">,
  ) => {
    active.delete(promptClarificationRequestKey(snapshot));
  };

  const start = (snapshot: PromptClarificationSnapshot): boolean => {
    const key = promptClarificationRequestKey(snapshot);
    if (active.has(key)) return false;

    const token = ++nextToken;
    active.set(key, token);
    void options
      .rewrite(snapshot)
      .then((result) => {
        if (active.get(key) !== token) return;
        active.delete(key);
        options.onResult?.(result, snapshot);
      })
      .catch((error: unknown) => {
        if (active.get(key) !== token) return;
        active.delete(key);
        options.onError?.(error);
      });
    return true;
  };

  return { start, invalidate, isActive };
}
