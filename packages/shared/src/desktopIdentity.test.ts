import { describe, expect, it } from "vite-plus/test";

import { resolveDesktopIdentity } from "./desktopIdentity.ts";

describe("resolveDesktopIdentity", () => {
  it.each([
    [
      "latest",
      {
        appId: "com.quantipixels.sigidi",
        electronUserDataDirName: "sigidi",
        protocolScheme: "sigidi",
        linuxExecutableName: "sigidi",
        linuxDesktopEntryName: "sigidi.desktop",
        linuxWmClass: "sigidi",
      },
    ],
    [
      "nightly",
      {
        appId: "com.quantipixels.sigidi.nightly",
        electronUserDataDirName: "sigidi-nightly",
        protocolScheme: "sigidi-nightly",
        linuxExecutableName: "sigidi-nightly",
        linuxDesktopEntryName: "sigidi-nightly.desktop",
        linuxWmClass: "sigidi-nightly",
      },
    ],
    [
      "development",
      {
        appId: "com.quantipixels.sigidi.dev",
        electronUserDataDirName: "sigidi-dev",
        protocolScheme: "sigidi-dev",
        linuxExecutableName: "sigidi-dev",
        linuxDesktopEntryName: "sigidi-dev.desktop",
        linuxWmClass: "sigidi-dev",
      },
    ],
  ] as const)("returns one identity for the %s channel", (channel, expected) => {
    expect(resolveDesktopIdentity(channel)).toEqual(expected);
  });
});
