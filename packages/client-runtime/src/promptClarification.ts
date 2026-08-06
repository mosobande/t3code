export interface PromptClarificationRequestScope {
  readonly environmentId: string;
  readonly draftKey: string;
}

export const promptClarificationRequestKey = (snapshot: PromptClarificationRequestScope) =>
  `${snapshot.environmentId}\u0000${snapshot.draftKey}`;
