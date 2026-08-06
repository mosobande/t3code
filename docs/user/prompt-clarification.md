# Clarify a draft

Clarify rewrites the visible text in the current composer into a clearer technical prompt. It replaces only the composer text and never sends a message.

Select the Clarify icon in the composer toolbar. In a wide toolbar, the icon is after the **Task** or **Plan** panel toggle. In the compact toolbar, open the overflow menu and select **Clarify**. You can use it before you send the first prompt for a new thread. The icon pulses and the composer becomes read-only while the rewrite runs. The composer becomes editable again when the clarified text is ready.

You can also run **Clarify draft** from the command palette or assign a shortcut in Settings. The `/clarify` command is not supported.

If another action changes or sends the draft before the result returns, SIGIDI discards the old result instead of overwriting newer text.

Set a separate Clarify model in Settings. The action tooltip shows why the rewrite is unavailable when the server is too old, the environment is unavailable, or the configured provider cannot run. A rewrite is available only for an ordinary idle text draft. It is unavailable while an approval, requested input, running turn, or plan follow-up owns the composer.

Clarify sends only the visible draft text for this request. Images, contexts, annotations, review comments, and other draft content stay in place.
