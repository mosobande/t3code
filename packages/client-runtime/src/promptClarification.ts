import type { PromptClarificationRewriteResult } from "@t3tools/contracts";

export type { PromptClarificationRewriteResult } from "@t3tools/contracts";

export interface PromptClarificationSnapshot {
  readonly environmentId: string;
  readonly draftKey: string;
  readonly text: string;
  /** Increment whenever the user changes the draft, even when text returns to its prior value. */
  readonly revision: number;
}

export interface PromptClarificationControllerOptions {
  readonly rewrite: (
    snapshot: PromptClarificationSnapshot,
  ) => Promise<PromptClarificationRewriteResult>;
  /** Callers replace the matching composer draft when the rewrite completes. */
  readonly onResult?: (
    result: PromptClarificationRewriteResult,
    snapshot: PromptClarificationSnapshot,
  ) => void;
  readonly onError?: (error: unknown) => void;
}

export const promptClarificationRequestKey = (
  snapshot: Pick<PromptClarificationSnapshot, "environmentId" | "draftKey">,
) => `${snapshot.environmentId}\u0000${snapshot.draftKey}`;

/**
 * Owns only ephemeral request lifetime. A cancellation abandons the response
 * locally; it intentionally does not promise to interrupt provider work.
 */
export function createPromptClarificationController(options: PromptClarificationControllerOptions) {
  let nextToken = 0;
  const active = new Map<string, number>();

  const isActive = (snapshot: Pick<PromptClarificationSnapshot, "environmentId" | "draftKey">) =>
    active.has(promptClarificationRequestKey(snapshot));

  const cancel = (snapshot: Pick<PromptClarificationSnapshot, "environmentId" | "draftKey">) => {
    active.delete(promptClarificationRequestKey(snapshot));
  };

  const invalidate = cancel;

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

  return { start, cancel, invalidate, isActive };
}
