import { describe, expect, it } from "vite-plus/test";

import {
  CLARIFY_COMPOSER_ICON_CLASS,
  clarifyComposerControlClass,
  clarifyComposerControlState,
} from "./composerControl";

describe("clarify composer control styles", () => {
  it("uses the Clarify accent on hover even when rewriting is unavailable", () => {
    const className = clarifyComposerControlClass(false);

    expect(className).toContain("hover:text-clarify");
    expect(className).toContain("hover:bg-clarify/10");
  });

  it("pulses with the Clarify accent while a rewrite is running", () => {
    const className = clarifyComposerControlClass(true);

    expect(className).toContain("bg-clarify/12");
    expect(className).toContain("text-clarify");
    expect(className).toContain("animate-pulse");
  });

  it("lets the wand inherit the control state color", () => {
    expect(CLARIFY_COMPOSER_ICON_CLASS).toContain("text-current");
  });

  it("makes the editor read-only and labels the action while rewriting", () => {
    expect(clarifyComposerControlState({ disabledReason: null, isRunning: true })).toEqual({
      disabled: true,
      editorReadOnly: true,
      ariaBusy: true,
      ariaLabel: "Clarifying draft",
      statusLabel: "Clarifying…",
      tooltip: "Clarifying draft…",
    });
  });

  it("keeps the idle action available and exposes exact unavailable reasons", () => {
    expect(clarifyComposerControlState({ disabledReason: null, isRunning: false })).toMatchObject({
      disabled: false,
      editorReadOnly: false,
      ariaBusy: false,
      ariaLabel: "Clarify draft",
    });
    expect(
      clarifyComposerControlState({ disabledReason: "Environment unavailable", isRunning: false }),
    ).toMatchObject({
      disabled: true,
      ariaBusy: false,
      ariaLabel: "Environment unavailable",
      tooltip: "Environment unavailable",
    });
  });
});
