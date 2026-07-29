export type DesktopIdentityChannel = "development" | "latest" | "nightly";

export interface DesktopIdentity {
  readonly appId: string;
  readonly electronUserDataDirName: string;
  readonly protocolScheme: string;
  readonly linuxExecutableName: string;
  readonly linuxDesktopEntryName: string;
  readonly linuxWmClass: string;
}

const APP_ID = "com.quantipixels.sigidi";

export function resolveDesktopIdentity(channel: DesktopIdentityChannel): DesktopIdentity {
  const suffix = channel === "latest" ? "" : channel === "nightly" ? "-nightly" : "-dev";
  const appIdSuffix = channel === "latest" ? "" : channel === "nightly" ? ".nightly" : ".dev";
  const linuxExecutableName = `sigidi${suffix}`;

  return {
    appId: `${APP_ID}${appIdSuffix}`,
    electronUserDataDirName: linuxExecutableName,
    protocolScheme: linuxExecutableName,
    linuxExecutableName,
    linuxDesktopEntryName: `${linuxExecutableName}.desktop`,
    linuxWmClass: linuxExecutableName,
  };
}
