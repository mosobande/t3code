import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { ProjectNoteSaveFailure } from "./ProjectNoteSaveFailure";

describe("ProjectNoteSaveFailure", () => {
  it("shows the save error and an explicit retry action", () => {
    const markup = renderToStaticMarkup(
      <ProjectNoteSaveFailure error="Connection lost" onRetry={() => {}} />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Connection lost");
    expect(markup).toContain(">Retry<");
  });
});
