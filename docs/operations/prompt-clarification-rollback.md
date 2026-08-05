# Prompt clarification rollback

An older SIGIDI server may discard `promptClarificationModelSelection` when it rewrites `settings.json`. This is expected compatibility behavior; SIGIDI does not add a settings sidecar or alter upstream unknown-field handling for this preference.

After upgrading the server again:

1. Open Settings from a client where the environment is primary.
2. Select the Clarify provider, model, and traits again.
3. Confirm the Clarify action reports the selected provider and model.

Downgrading removes the capability from the environment probe. The client must keep Clarify disabled and must not send the draft as a fallback.
