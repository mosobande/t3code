import type { PendingProjectNoteDraft } from "./projectNoteSaveState";

export type ProjectNoteDraftOwner = symbol;

interface OwnedProjectNoteDraft {
  readonly owner: ProjectNoteDraftOwner;
  readonly draft: PendingProjectNoteDraft;
}

export class ProjectNoteDraftCoordinator {
  readonly #drafts = new Map<string, OwnedProjectNoteDraft>();

  createOwner(): ProjectNoteDraftOwner {
    return Symbol("project-note-draft-owner");
  }

  read(key: string): PendingProjectNoteDraft | null {
    return this.#drafts.get(key)?.draft ?? null;
  }

  write(key: string, owner: ProjectNoteDraftOwner, draft: PendingProjectNoteDraft | null): void {
    if (draft === null) {
      this.#drafts.delete(key);
      return;
    }
    this.#drafts.set(key, { owner, draft });
  }

  replaceOwned(
    key: string,
    owner: ProjectNoteDraftOwner,
    draft: PendingProjectNoteDraft | null,
  ): boolean {
    if (this.#drafts.get(key)?.owner !== owner) return false;
    this.write(key, owner, draft);
    return true;
  }
}

export const projectNoteDraftCoordinator = new ProjectNoteDraftCoordinator();
