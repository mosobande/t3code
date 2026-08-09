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
  readonly capabilities: ProductCapabilities;
  readonly publishableAsSigidi: boolean;
}

const PROFILES: Readonly<Record<ProductProfileName, ProductProfile>> = {
  local: {
    name: "local",
    purpose: "product",
    capabilities: {
      inheritedRemoteIntegrations: false,
      hostedAuthentication: false,
      lanMobilePairing: true,
      tailscaleExposure: false,
      remoteEnvironments: false,
      wsl: false,
    },
    publishableAsSigidi: true,
  },
  upstream: {
    name: "upstream",
    purpose: "integration",
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
