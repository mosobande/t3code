import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { ProjectNotesPinToggle } from "./ProjectNotesPinToggle";

function renderPin(pressed: boolean): string {
  return renderToStaticMarkup(
    <ProjectNotesPinToggle pressed={pressed} onPressedChange={() => {}} />,
  );
}

describe("ProjectNotesPinToggle", () => {
  it("gives the active pin icon a distinct static cue", () => {
    expect(renderPin(false)).not.toContain("fill-current");
    expect(renderPin(true)).toContain("fill-current");
  });
});
