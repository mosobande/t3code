# Prompt clarification

Prompt clarification is a SIGIDI-owned, pre-send rewrite feature. Its narrow RPC is `sigidi.promptClarification.rewrite`. The server reuses the public text-generation runtime and the shared utility-model default factory. `promptClarificationModelSelection` is persisted independently from `textGenerationModelSelection`; neither setting follows or overwrites the other.

The web and desktop composer use one client-local controller keyed by initiating environment and draft. A request captures the text and a monotonic draft revision. Each eligible toolbar activation starts one rewrite. The action is disabled and pulses with the Clarify accent while that rewrite runs. The completed result replaces the composer text directly and returns the action to its idle state. The wide composer places the `WandSparkles` trigger after the Task/Plan panel toggle. The compact overflow menu provides the labelled **Clarify** item.

Clarify has no sidebar, result preview, apply step, retry panel, or cancellation control. The command palette and an independently configurable, initially unbound keybinding remain entry points. Built-in slash-command parsing must not add `/clarify` support.

The controller accepts a result only while its request token and environment-draft scope remain active. Send, disconnect, route or environment change, and unmount invalidate the local request. The composer compares the captured text and monotonic revision with the current draft. If either changed before a result returns, it discards the stale result instead of overwriting newer text.

Only the `prompt` field is replaced. The draft snapshot and request state do not persist. The client never creates a thread turn, message, checkpoint, queue item, or synchronized draft record. The mobile composer paths remain deferred.

Older servers do not advertise the capability. The web keeps Clarify visible and disabled rather than falling through to normal send. Provider availability is evaluated against the configured instance without fallback to another configured provider. The configured model goes to the provider adapter even when it is not included in the advertised model catalog, matching title-generation dispatch.

The feature adds no SIGIDI database state or migration.

## Upstream fork patches

The bounded SIGIDI service lives under `apps/server/src/sigidi/promptClarification/`, but the current upstream surface has no stable extension seam for the complete feature. The implementation therefore patches these upstream-owned areas:

- the shared `TextGeneration` service and the Codex, Claude, Cursor, Grok, and OpenCode adapters, to expose provider-neutral structured prompt rewriting with each provider's safest available runtime mode;
- shared contracts, settings, server configuration, authorization, environment capability, RPC, and WebSocket hosts, to register the independent setting and `sigidi.promptClarification.rewrite` operation;
- the web composer, command palette, keybinding settings, general settings, and server-environment client host, to register entry points and preserve the existing draft lifecycle.

The prompt clarification maintainer owns conflicts in these files. The patches were last checked against `upstream/main@41ebf22e` on 2026-08-05. Remove or narrow them when upstream provides stable provider-neutral utility-generation and composer/settings command seams that preserve the independent selection, provider availability, no-send behavior, direct replacement, stale-result protection, and provider-specific isolation policy. No upstream issue or pull request exists yet.

Focused proof covers unsupported slash parsing; controller single-flight and invalidation; direct result delivery; stale-result protection; terminal-context placeholder removal and restoration; disabled and running action states; independent settings; each provider's Clarify isolation path; unadvertised utility-model dispatch; and the WebSocket RPC boundary.

Wide and compact trigger placement, command-palette activation, Settings presentation, the desktop wrapper, and live provider-runtime execution still require integrated client proof. Mobile remains deferred.
