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
  readonly readCurrent: () => PromptClarificationSnapshot;
  /** This deliberately receives text only; callers preserve all non-text draft fields. */
  readonly applyText: (text: string) => void;
  readonly onApplied?: (result: PromptClarificationRewriteResult) => void;
  readonly offerReview?: (result: PromptClarificationRewriteResult) => void;
  readonly onError?: (error: unknown) => void;
}

export const promptClarificationRequestKey = (
  snapshot: Pick<PromptClarificationSnapshot, "environmentId" | "draftKey">,
) => `${snapshot.environmentId}\u0000${snapshot.draftKey}`;

const matches = (left: PromptClarificationSnapshot, right: PromptClarificationSnapshot) =>
  left.environmentId === right.environmentId &&
  left.draftKey === right.draftKey &&
  left.text === right.text &&
  left.revision === right.revision;

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
        if (matches(snapshot, options.readCurrent())) {
          options.applyText(result.text);
          options.onApplied?.(result);
        } else {
          options.offerReview?.(result);
        }
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
