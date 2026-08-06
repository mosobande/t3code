# Clarify a draft

Clarify rewrites the visible text in the current composer into a clearer technical prompt. It never sends a message or replaces your draft automatically.

Select the Clarify icon in the composer toolbar. In a wide toolbar, the icon is after the **Task** or **Plan** panel toggle. In the compact toolbar, open the overflow menu and select **Clarify**. The icon always opens or closes the right panel. The first eligible use also starts one rewrite.

You can also run **Clarify draft** from the command palette or assign a shortcut in Settings. The `/clarify` command is not supported.

The right panel shows your current text, the clarified text, and the provider and model that produced it. Select **Replace current draft** only when you want to use the clarified text. Select **Clarify again** for a new rewrite, or **Discard** to remove the result. While a rewrite runs, select **Cancel** to stop waiting locally; the provider can still finish work, but SIGIDI ignores that result.

You can keep typing while Clarify works. If the draft changes before the result returns, the panel says **Draft changed**. SIGIDI keeps the current draft unchanged. You can apply the result only with **Replace current draft**.

Set a separate Clarify model in Settings. The panel shows why the rewrite action is unavailable when the server is too old, the environment is unavailable, or the configured provider or model cannot run. A rewrite is available only for an ordinary idle text draft. It is unavailable while an approval, requested input, running turn, or plan follow-up owns the composer.

Clarify sends only the visible draft text for this request. Images, contexts, annotations, review comments, and other draft content stay in place.
