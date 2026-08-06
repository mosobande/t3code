import { Button } from "../ui/button";
import type { PromptClarificationPanelState } from "~/promptClarificationPanelState";

function SelectableDraft(props: { label: string; text: string; changed?: boolean }) {
  return (
    <section className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">{props.label}</h2>
        {props.changed ? <span className="text-warning text-xs">Draft changed</span> : null}
      </div>
      <div
        aria-label={props.label}
        tabIndex={0}
        className="min-h-32 whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-3 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {props.text}
      </div>
    </section>
  );
}

export function PromptClarificationPanel(props: { state: PromptClarificationPanelState }) {
  const { state } = props;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <div className="mb-4">
        <h1 className="text-base font-semibold text-foreground">Clarify draft</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the rewrite before you replace the composer draft.
        </p>
      </div>

      {state.isRunning ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">Clarifying your draft…</span>
          <Button type="button" size="sm" variant="outline" onClick={state.onCancel}>
            Cancel
          </Button>
        </div>
      ) : null}

      {state.result ? (
        <div className="grid gap-5">
          <SelectableDraft
            label="Current draft"
            text={state.currentDraft}
            changed={state.draftChanged}
          />
          <SelectableDraft label="Clarified draft" text={state.result.text} />
          <p className="text-xs text-muted-foreground">
            Provider: {state.result.providerInstanceId} · Model: {state.result.model}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={state.onReplace}>
              Replace current draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={state.disabledReason !== null}
              aria-label={state.disabledReason ?? "Clarify again"}
              onClick={state.onClarifyAgain}
            >
              Clarify again
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={state.onDiscard}>
              Discard
            </Button>
          </div>
        </div>
      ) : !state.isRunning ? (
        <div className="grid gap-4">
          <SelectableDraft label="Current draft" text={state.currentDraft} />
          <p className="text-sm text-muted-foreground">
            {state.disabledReason ?? "Select Clarify again to create a fresh rewrite."}
          </p>
          <div>
            <Button
              type="button"
              size="sm"
              disabled={state.disabledReason !== null}
              aria-label={state.disabledReason ?? "Clarify again"}
              onClick={state.onClarifyAgain}
            >
              Clarify again
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
