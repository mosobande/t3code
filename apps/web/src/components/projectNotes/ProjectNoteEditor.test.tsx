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
    expect(markup).toContain('aria-label="More formatting"');
    expect(markup).not.toContain('role="toolbar"');
  });

  it("does not expose link authoring actions", () => {
    const markup = renderToStaticMarkup(
      <ProjectNoteEditor initialMarkdown="" onChange={() => {}} />,
    );

    expect(markup).not.toContain('aria-label="Link"');
    expect(markup).not.toContain('aria-label="Remove link"');
  });
});
