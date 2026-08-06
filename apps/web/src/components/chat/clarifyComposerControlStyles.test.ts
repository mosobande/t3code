import { describe, expect, it } from "vite-plus/test";

import {
  CLARIFY_COMPOSER_ICON_CLASS,
  clarifyComposerControlClass,
} from "./clarifyComposerControlStyles";

describe("clarify composer control styles", () => {
  it("uses the Clarify accent on hover even when rewriting is unavailable", () => {
    const className = clarifyComposerControlClass(false);

    expect(className).toContain("hover:text-clarify");
    expect(className).toContain("hover:bg-clarify/10");
  });

  it("keeps the Clarify accent while its panel is open", () => {
    const className = clarifyComposerControlClass(true);

    expect(className).toContain("bg-clarify/12");
    expect(className).toContain("text-clarify");
  });

  it("lets the wand inherit the control state color", () => {
    expect(CLARIFY_COMPOSER_ICON_CLASS).toContain("text-current");
  });
});
