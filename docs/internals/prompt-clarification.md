# Prompt clarification

Prompt clarification is a SIGIDI-owned, pre-send rewrite feature. Its narrow RPC is `sigidi.promptClarification.rewrite`. The server reuses the public text-generation runtime and the shared utility-model default factory. `promptClarificationModelSelection` is persisted independently from `textGenerationModelSelection`; neither setting follows or overwrites the other.

The web and desktop composer use one client-local controller keyed by initiating environment and draft. A request captures the text and a monotonic draft revision. It applies a result only when the request token, environment, draft key, text, and revision still match. Cancellation, send, disconnect, route or environment change, and unmount invalidate the local request. Cancellation does not promise to stop provider-native work.

Only the `prompt` field is replaced. The client never creates a thread turn, message, checkpoint, queue item, or synchronized draft record. The mobile composer paths remain deferred.

Older servers do not advertise the capability. The web keeps Clarify visible and disabled rather than falling through to normal send. Provider availability is evaluated against the configured instance and model without fallback to another configured provider.

The feature adds no SIGIDI database state or migration. The web host registrations are entry-point wiring only. No non-registration upstream patch is currently required.

Focused proof covers built-in slash parsing, one-request-per-draft behavior, stale revisions including A-to-B-to-A edits, cancellation and late results, non-text preservation, disabled-state reasons, command-palette and keybinding dispatch, and primary-environment-only setting updates.
