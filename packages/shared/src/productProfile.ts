declare const __SIGIDI_BUILD_PROFILE__: string | undefined;

export const PRODUCT_PROFILE_NAMES = ["local", "upstream"] as const;
export type ProductProfileName = (typeof PRODUCT_PROFILE_NAMES)[number];

/** The customer-facing reason a build exists. Profile names remain compatibility identifiers. */
export const PRODUCT_BUILD_PURPOSES = ["product", "integration"] as const;
export type ProductBuildPurpose = (typeof PRODUCT_BUILD_PURPOSES)[number];

export interface ProductCapabilities {
  readonly inheritedRemoteIntegrations: boolean;
  readonly hostedAuthentication: boolean;
  /** Direct HTTP pairing between the desktop and a client on its local network. */
  readonly lanMobilePairing: boolean;
  /** Tailscale Serve and its advertised private-network endpoints. */
  readonly tailscaleExposure: boolean;
  readonly remoteEnvironments: boolean;
  readonly wsl: boolean;
}

export interface ProductProfile {
  readonly name: ProductProfileName;
  readonly purpose: ProductBuildPurpose;
  readonly productName: "SIGIDI" | "T3 Code";
  readonly cliPackageName: CliPackageName;
  readonly capabilities: ProductCapabilities;
  readonly publishableAsSigidi: boolean;
}

export const SIGIDI_CLI_PACKAGE_NAME = "@sigidi/cli";
export const UPSTREAM_CLI_PACKAGE_NAME = "t3";
export type CliPackageName = typeof SIGIDI_CLI_PACKAGE_NAME | typeof UPSTREAM_CLI_PACKAGE_NAME;

export const isCliPackageName = (value: unknown): value is CliPackageName =>
  value === SIGIDI_CLI_PACKAGE_NAME || value === UPSTREAM_CLI_PACKAGE_NAME;

/** Select the public CLI package owned by the compiled product profile. */
export function resolveCliPackageName(
  profile: Pick<ProductProfile, "cliPackageName">,
): CliPackageName {
  return profile.cliPackageName;
}

const PROFILES: Readonly<Record<ProductProfileName, ProductProfile>> = {
  local: {
    name: "local",
    purpose: "product",
    productName: "SIGIDI",
    cliPackageName: SIGIDI_CLI_PACKAGE_NAME,
    capabilities: {
      inheritedRemoteIntegrations: false,
      hostedAuthentication: false,
      lanMobilePairing: true,
      tailscaleExposure: true,
      remoteEnvironments: true,
      wsl: true,
    },
    publishableAsSigidi: true,
  },
  upstream: {
    name: "upstream",
    purpose: "integration",
    productName: "T3 Code",
    cliPackageName: UPSTREAM_CLI_PACKAGE_NAME,
    capabilities: {
      inheritedRemoteIntegrations: true,
      hostedAuthentication: true,
      lanMobilePairing: true,
      tailscaleExposure: true,
      remoteEnvironments: true,
      wsl: true,
    },
    publishableAsSigidi: false,
  },
};

export class UnknownProductProfileError extends Error {
  override readonly name = "UnknownProductProfileError";
  readonly value: unknown;

  constructor(value: unknown) {
    super(
      `Unknown SIGIDI build profile ${JSON.stringify(value)}. Expected one of: ${PRODUCT_PROFILE_NAMES.join(", ")}.`,
    );
    this.value = value;
  }
}

export function resolveProductProfile(value: unknown): ProductProfile {
  if (value === undefined || value === "") {
    return PROFILES.local;
  }
  if (value === "local" || value === "upstream") {
    return PROFILES[value];
  }
  throw new UnknownProductProfileError(value);
}

export const productProfile = resolveProductProfile(
  typeof __SIGIDI_BUILD_PROFILE__ === "undefined" ? undefined : __SIGIDI_BUILD_PROFILE__,
);

export const cliPackageName = resolveCliPackageName(productProfile);
