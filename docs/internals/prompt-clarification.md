# Prompt clarification

Prompt clarification is a SIGIDI-owned, pre-send rewrite feature. Its narrow RPC is `sigidi.promptClarification.rewrite`. The server reuses the public text-generation runtime and the shared utility-model default factory. `promptClarificationModelSelection` is persisted independently from `textGenerationModelSelection`; neither setting follows or overwrites the other.

The web and desktop composer use one client-local controller keyed by initiating environment and draft. A request captures the text and a monotonic draft revision. The first eligible activation opens the right-side Clarify panel and starts exactly one rewrite. Later activation of the toolbar icon only toggles that panel; it does not make another request. The wide composer places the icon-only `WandSparkles` trigger after the Task/Plan panel toggle. The compact overflow menu provides the labelled **Clarify** item.

The panel holds the current text, clarified text, provider and model, and its local view state. It provides **Replace current draft**, **Clarify again**, **Discard**, and **Cancel** while a request runs. A result never changes the draft without **Replace current draft**. `Clarify again` is the explicit path that starts a subsequent request. The command palette and an independently configurable, initially unbound keybinding remain entry points. Built-in slash-command parsing must not add `/clarify` support.

The controller offers a result for review only while its request token and environment-draft scope remain active. Cancellation, send, disconnect, route or environment change, and unmount invalidate the local request. Cancellation does not promise to stop provider-native work. The composer compares the captured text and monotonic revision with the current draft. If either changed before a result returns, the panel enters the **Draft changed** state; it keeps the result separate and permits replacement only through the explicit action.

Only the `prompt` field is replaced. The panel descriptor may persist as client UI state, but its draft snapshot, request state, and result do not persist. The client never creates a thread turn, message, checkpoint, queue item, or synchronized draft record. The mobile composer paths remain deferred.

Older servers do not advertise the capability. The web keeps Clarify visible and disabled rather than falling through to normal send. Provider availability is evaluated against the configured instance and model without fallback to another configured provider.

The feature adds no SIGIDI database state or migration.

## Upstream fork patches

The bounded SIGIDI service lives under `apps/server/src/sigidi/promptClarification/`, but the current upstream surface has no stable extension seam for the complete feature. The implementation therefore patches these upstream-owned areas:

- the shared `TextGeneration` service and the Codex, Claude, Cursor, Grok, and OpenCode adapters, to expose provider-neutral structured prompt rewriting with each provider's safest available runtime mode;
- shared contracts, settings, server configuration, authorization, environment capability, RPC, and WebSocket hosts, to register the independent setting and `sigidi.promptClarification.rewrite` operation;
- the web composer, command palette, keybinding settings, general settings, and server-environment client host, to register entry points and preserve the existing draft lifecycle.

The prompt clarification maintainer owns conflicts in these files. The patches were last checked against `upstream/main@41ebf22e` on 2026-08-05. Remove or narrow them when upstream provides stable provider-neutral utility-generation and composer/settings command seams that preserve the independent selection, strict availability, no-send behavior, stale-result protection, explicit replacement, local-only panel state, and provider-specific isolation policy. No upstream issue or pull request exists yet.

Revision 22 requires, but does not yet claim, integrated proof. Required focused automated proof covers unsupported slash parsing; first activation single-flight; later toolbar toggle behavior; cancellation; stale-result handling and **Draft changed**; explicit replacement only; non-persistence of draft, request, and result; terminal-context placeholder removal and restoration; disabled-state reasons; keybinding schema and catalogue visibility; primary-environment settings and restore policy; each provider's Clarify isolation path; and the WebSocket RPC boundary. Required integrated client proof covers the wide composer, compact overflow, panel, command palette, and Settings surfaces separately on web and desktop. Mobile remains deferred.
