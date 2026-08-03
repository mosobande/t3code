import { Button } from "../ui/button";

interface ProjectNoteSaveFailureProps {
  readonly error: string;
  readonly onRetry: () => void;
}

export function ProjectNoteSaveFailure({ error, onRetry }: ProjectNoteSaveFailureProps) {
  return (
    <div
      className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive"
      role="alert"
    >
      <p className="min-w-0 flex-1 break-words text-xs">{error}</p>
      <Button type="button" variant="outline" size="xs" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
