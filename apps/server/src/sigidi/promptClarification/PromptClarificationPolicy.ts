/** Product policy for a text-only, editor-only rewrite. */
export function buildPromptClarificationPayload(text: string) {
  return [
    "Rewrite the user's draft into a clearer ready-to-send technical prompt.",
    "Return a JSON object with key: text.",
    "Rules:",
    "- Preserve intent, language, names, paths, numbers, exact errors, constraints, UI copy, and acceptance criteria.",
    "- Do not answer the request or add scope, solutions, stack choices, or new requirements.",
    "- The text field must contain only the rewritten prompt.",
    "",
    "Draft:",
    text,
  ].join("\n");
}
