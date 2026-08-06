import { EnvironmentId } from "@t3tools/contracts";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { toastManager } from "../../components/ui/toast";
import {
  createPromptClarificationController,
  type PromptClarificationSnapshot,
} from "./controller";
import {
  promptClarificationDisabledReason,
  promptClarificationReplacementText,
  promptClarificationRequestText,
} from "./logic";
import type {
  PromptClarificationComposerControl,
  PromptClarificationComposerPhase,
  PromptClarificationEnvironmentBinding,
} from "./types";

export function useComposerPromptClarification(input: {
  readonly environmentId: EnvironmentId;
  readonly draftKey: string;
  readonly prompt: string;
  readonly phase: PromptClarificationComposerPhase;
  readonly environmentUnavailable: boolean;
  readonly disconnected: boolean;
  readonly binding: PromptClarificationEnvironmentBinding;
  readonly applyText: (text: string) => void;
}): PromptClarificationComposerControl & {
  readonly notePromptMutation: (text: string) => void;
  readonly invalidate: () => void;
  readonly start: () => boolean;
} {
  const [, setRequestVersion] = useState(0);
  const revisionRef = useRef(0);
  const observedPromptRef = useRef(input.prompt);
  const snapshotRef = useRef<PromptClarificationSnapshot>({
    environmentId: String(input.environmentId),
    draftKey: input.draftKey,
    text: input.prompt,
    revision: 0,
  });
  const rewriteRef = useRef(input.binding.rewrite);
  const applyTextRef = useRef(input.applyText);
  const resultsAllowedRef = useRef(true);

  const notePromptMutation = useCallback((text: string) => {
    revisionRef.current += 1;
    observedPromptRef.current = text;
    snapshotRef.current = {
      ...snapshotRef.current,
      text,
      revision: revisionRef.current,
    };
  }, []);

  const controllerRef = useRef<ReturnType<typeof createPromptClarificationController> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createPromptClarificationController({
      rewrite: (snapshot) =>
        rewriteRef.current({
          environmentId: EnvironmentId.make(snapshot.environmentId),
          draftKey: snapshot.draftKey,
          text: promptClarificationRequestText(snapshot.text),
        }),
      onResult: (result, snapshot) => {
        if (!resultsAllowedRef.current) return;
        const replacementText = promptClarificationReplacementText({
          request: snapshot,
          current: snapshotRef.current,
          resultText: result.text,
        });
        if (replacementText === null) {
          setRequestVersion((version) => version + 1);
          toastManager.add({
            type: "info",
            title: "Clarify result discarded",
            description: "The draft changed while Clarify was running.",
          });
          return;
        }
        applyTextRef.current(replacementText);
        // The accepted rewrite can equal the current text, so the draft store
        // cannot be relied on to render the controller's transition back to idle.
        setRequestVersion((version) => version + 1);
      },
      onError: () => {
        setRequestVersion((version) => version + 1);
        toastManager.add({
          type: "error",
          title: "Unable to clarify draft",
          description: "Your draft was not changed. Try again.",
        });
      },
    });
  }
  const controller = controllerRef.current;

  const disabledReason = promptClarificationDisabledReason({
    text: input.prompt,
    supportsCapability: input.binding.supportsCapability,
    environmentAvailable: input.binding.environmentAvailable && !input.environmentUnavailable,
    selectionUnavailableReason: input.binding.selectionUnavailableReason,
    phase: input.phase,
  });

  useLayoutEffect(() => {
    if (observedPromptRef.current !== input.prompt) {
      notePromptMutation(input.prompt);
    }
    const resultsAllowed =
      input.phase === "idle" && !input.environmentUnavailable && !input.disconnected;
    resultsAllowedRef.current = resultsAllowed;
    const snapshot = {
      environmentId: String(input.environmentId),
      draftKey: input.draftKey,
      text: input.prompt,
      revision: revisionRef.current,
    };
    snapshotRef.current = snapshot;
    if (!resultsAllowed) controller.invalidate(snapshot);
  }, [
    controller,
    input.disconnected,
    input.draftKey,
    input.environmentId,
    input.environmentUnavailable,
    input.phase,
    input.prompt,
    notePromptMutation,
  ]);

  useLayoutEffect(() => {
    rewriteRef.current = input.binding.rewrite;
    applyTextRef.current = input.applyText;
  }, [input.applyText, input.binding.rewrite]);

  const start = useCallback(() => {
    if (disabledReason !== null) return false;
    const started = controller.start(snapshotRef.current);
    if (started) setRequestVersion((version) => version + 1);
    return started;
  }, [controller, disabledReason]);

  const isRunning =
    input.phase === "idle" &&
    !input.environmentUnavailable &&
    !input.disconnected &&
    controller.isActive({
      environmentId: String(input.environmentId),
      draftKey: input.draftKey,
    });

  useEffect(() => {
    const scope = { environmentId: String(input.environmentId), draftKey: input.draftKey };
    return () => controller.invalidate(scope);
  }, [controller, input.draftKey, input.environmentId]);

  const invalidate = useCallback(() => {
    controller.invalidate(snapshotRef.current);
    setRequestVersion((version) => version + 1);
  }, [controller]);

  return useMemo(
    () => ({
      disabledReason,
      isRunning,
      onActivate: () => {
        start();
      },
      notePromptMutation,
      invalidate,
      start,
    }),
    [disabledReason, invalidate, isRunning, notePromptMutation, start],
  );
}
