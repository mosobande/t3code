import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { ProjectNoteEditor } from "./ProjectNoteEditor";

describe("ProjectNoteEditor", () => {
  it("exposes formatting actions as a regular named group", () => {
    const markup = renderToStaticMarkup(
      <ProjectNoteEditor initialMarkdown="" onChange={() => {}} />,
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Note formatting"');
    expect(markup).not.toContain('role="toolbar"');
  });
});
