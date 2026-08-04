import { describe, expect, it } from "vite-plus/test";

import { isSafeProjectNoteLinkUrl } from "./projectNoteLinks";

describe("project note links", () => {
  it.each([
    "https://example.com",
    "http://example.com",
    "mailto:hello@example.com",
    "sms:+3531234567",
    "tel:+3531234567",
    "example.com",
    "/docs/notes",
    "#next",
  ])("accepts %s", (url) => {
    expect(isSafeProjectNoteLinkUrl(url)).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "file:///tmp/note"])(
    "rejects %s",
    (url) => {
      expect(isSafeProjectNoteLinkUrl(url)).toBe(false);
    },
  );
});
