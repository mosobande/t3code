import { type PromptClarificationRewriteInput, WS_METHODS } from "@t3tools/contracts";
import { request } from "../rpc/client.ts";

/** Runs the bounded SIGIDI rewrite RPC without creating a thread turn. */
export function rewritePrompt(input: PromptClarificationRewriteInput) {
  return request(WS_METHODS.promptClarificationRewrite, input);
}
