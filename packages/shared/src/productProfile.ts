declare const __SIGIDI_BUILD_PROFILE__: string | undefined;

export const PRODUCT_PROFILE_NAMES = ["local-desktop", "upstream-full"] as const;
export type ProductProfileName = (typeof PRODUCT_PROFILE_NAMES)[number];

export interface ProductCapabilities {
  readonly inheritedRemoteIntegrations: boolean;
  readonly hostedAuthentication: boolean;
  readonly networkExposure: boolean;
  readonly remoteEnvironments: boolean;
  readonly wsl: boolean;
}

export interface ProductProfile {
  readonly name: ProductProfileName;
  readonly capabilities: ProductCapabilities;
  readonly publishableAsSigidi: boolean;
}

const PROFILES: Readonly<Record<ProductProfileName, ProductProfile>> = {
  "local-desktop": {
    name: "local-desktop",
    capabilities: {
      inheritedRemoteIntegrations: false,
      hostedAuthentication: false,
      networkExposure: false,
      remoteEnvironments: false,
      wsl: false,
    },
    publishableAsSigidi: true,
  },
  "upstream-full": {
    name: "upstream-full",
    capabilities: {
      inheritedRemoteIntegrations: true,
      hostedAuthentication: true,
      networkExposure: true,
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
    return PROFILES["local-desktop"];
  }
  if (value === "local-desktop" || value === "upstream-full") {
    return PROFILES[value];
  }
  throw new UnknownProductProfileError(value);
}

export const productProfile = resolveProductProfile(
  typeof __SIGIDI_BUILD_PROFILE__ === "undefined" ? undefined : __SIGIDI_BUILD_PROFILE__,
);
