# Prompt clarification

Prompt clarification is a SIGIDI-owned, pre-send rewrite feature. Its narrow RPC is `sigidi.promptClarification.rewrite`. The server reuses the public text-generation runtime and the shared utility-model default factory. `promptClarificationModelSelection` is persisted independently from `textGenerationModelSelection`; neither setting follows or overwrites the other.

The web and desktop composer use one client-local controller keyed by initiating environment and draft. A request captures the text and a monotonic draft revision. It applies a result only when the request token, environment, draft key, text, and revision still match. Cancellation, send, disconnect, route or environment change, and unmount invalidate the local request. Cancellation does not promise to stop provider-native work.

Only the `prompt` field is replaced. The client never creates a thread turn, message, checkpoint, queue item, or synchronized draft record. The mobile composer paths remain deferred.

Older servers do not advertise the capability. The web keeps Clarify visible and disabled rather than falling through to normal send. Provider availability is evaluated against the configured instance and model without fallback to another configured provider.

The feature adds no SIGIDI database state or migration.

## Upstream fork patches

The bounded SIGIDI service lives under `apps/server/src/sigidi/promptClarification/`, but the current upstream surface has no stable extension seam for the complete feature. The implementation therefore patches these upstream-owned areas:

- the shared `TextGeneration` service and the Codex, Claude, Cursor, Grok, and OpenCode adapters, to expose provider-neutral structured prompt rewriting with each provider's safest available runtime mode;
- shared contracts, settings, server configuration, authorization, environment capability, RPC, and WebSocket hosts, to register the independent setting and `sigidi.promptClarification.rewrite` operation;
- the web composer, command palette, keybinding settings, general settings, and server-environment client host, to register entry points and preserve the existing draft lifecycle.

The prompt clarification maintainer owns conflicts in these files. Characterization proof consists of the focused contract, provider, service, RPC, controller, composer-logic, settings, and keybinding tests for this feature. The patches were last checked against `upstream/main@41ebf22e` on 2026-08-05. Remove or narrow them when upstream provides stable provider-neutral utility-generation and composer/settings command seams that preserve the independent selection, strict availability, no-send behavior, stale-result protection, and provider-specific isolation policy. No upstream issue or pull request exists yet.

Focused proof covers built-in slash parsing, one-request-per-draft behavior, stale revisions including A-to-B-to-A edits, cancellation and late results, non-text preservation, disabled-state reasons, command-palette and keybinding dispatch, and primary-environment-only setting updates.
