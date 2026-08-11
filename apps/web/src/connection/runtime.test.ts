import {
  BearerConnectionTarget,
  PrimaryConnectionTarget,
  RelayConnectionTarget,
  SshConnectionTarget,
} from "@t3tools/client-runtime/connection";
import { EnvironmentId } from "@t3tools/contracts";
import { productProfile } from "@t3tools/shared/productProfile";
import { describe, expect, it } from "@effect/vitest";

import { allowsTarget, connectionRuntimeOptions } from "./runtime.ts";

describe("connection runtime product profile", () => {
  it("keeps relay discovery separate from direct remote onboarding", () => {
    expect(connectionRuntimeOptions.remoteEnabled).toBe(
      productProfile.capabilities.remoteEnvironments,
    );
    expect(connectionRuntimeOptions.relayDiscoveryEnabled).toBe(
      productProfile.capabilities.inheritedRemoteIntegrations,
    );
  });

  it("admits only the target kinds selected by the product profile", () => {
    const environmentId = EnvironmentId.make("environment-profile-test");
    const base = { environmentId, label: "Profile test" };

    expect(
      allowsTarget(
        new PrimaryConnectionTarget({
          ...base,
          httpBaseUrl: "http://127.0.0.1:3773",
          wsBaseUrl: "ws://127.0.0.1:3773",
        }),
      ),
    ).toBe(true);
    expect(
      allowsTarget(new BearerConnectionTarget({ ...base, connectionId: "bearer-profile-test" })),
    ).toBe(productProfile.capabilities.remoteEnvironments);
    expect(
      allowsTarget(new SshConnectionTarget({ ...base, connectionId: "ssh-profile-test" })),
    ).toBe(productProfile.capabilities.remoteEnvironments);
    expect(allowsTarget(new RelayConnectionTarget(base))).toBe(
      productProfile.capabilities.inheritedRemoteIntegrations,
    );
  });
});
