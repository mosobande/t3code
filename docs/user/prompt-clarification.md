# Clarify a draft

Clarify rewrites the text in the current composer into a clearer technical prompt. It never sends a message for you.

Use **Clarify** beside the composer, run **Clarify draft** from the command palette, assign a shortcut to `composer.clarify` in Settings, or enter `/clarify <text>`. A bare `/clarify` asks you to add text after the command.

Review the rewritten text, make any edits you need, then send it normally. Clarify changes only the draft text. Images, contexts, annotations, review comments, and other draft content stay in place.

You can keep typing while Clarify works. If the draft changed, SIGIDI leaves it alone and offers **Review rewrite**. Choose **Cancel clarify** to stop waiting locally; the provider may still finish work, but SIGIDI ignores that result.

Set a separate Clarify model in Settings. The action shows why it is unavailable when the server is too old, the environment is unavailable, or the configured provider or model cannot run. Clarify is available only for an ordinary idle text draft. It is unavailable while an approval, requested input, running turn, or plan follow-up owns the composer.

The configured provider and model are shown with the result. SIGIDI sends only the visible draft text for this request.
