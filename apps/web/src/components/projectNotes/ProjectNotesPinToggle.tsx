import { PinIcon } from "lucide-react";

import { Toggle } from "../ui/toggle";

interface ProjectNotesPinToggleProps {
  readonly pressed: boolean;
  readonly onPressedChange: (pressed: boolean) => void;
}

export function ProjectNotesPinToggle({ pressed, onPressedChange }: ProjectNotesPinToggleProps) {
  return (
    <Toggle
      type="button"
      variant="ghost"
      size="xs"
      aria-label={
        pressed ? "Stop keeping Notes open across threads" : "Keep Notes open across threads"
      }
      pressed={pressed}
      onPressedChange={onPressedChange}
    >
      <PinIcon
        className={
          pressed
            ? "fill-current transition-[fill,color] duration-150"
            : "fill-none transition-[fill,color] duration-150"
        }
      />
    </Toggle>
  );
}
