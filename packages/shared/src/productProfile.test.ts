import { assert, describe, it } from "@effect/vitest";

import { UnknownProductProfileError, resolveProductProfile } from "./productProfile.ts";

describe("productProfile", () => {
  it("defaults to the publishable local desktop profile", () => {
    const profile = resolveProductProfile(undefined);
    assert.equal(profile.name, "local-desktop");
    assert.equal(profile.purpose, "product");
    assert.equal(profile.publishableAsSigidi, true);
    assert.equal(profile.capabilities.inheritedRemoteIntegrations, false);
    assert.equal(profile.capabilities.lanMobilePairing, true);
    assert.equal(profile.capabilities.tailscaleExposure, false);
  });

  it("enables inherited integrations only in the maintainer profile", () => {
    const profile = resolveProductProfile("upstream-full");
    assert.equal(profile.purpose, "integration");
    assert.equal(profile.publishableAsSigidi, false);
    assert.equal(profile.capabilities.inheritedRemoteIntegrations, true);
    assert.equal(profile.capabilities.lanMobilePairing, true);
    assert.equal(profile.capabilities.tailscaleExposure, true);
    assert.equal(profile.capabilities.remoteEnvironments, true);
  });

  it("fails closed for an unknown profile", () => {
    assert.throws(() => resolveProductProfile("remote-from-runtime"), UnknownProductProfileError);
  });
});
