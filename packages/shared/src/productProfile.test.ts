import { assert, describe, it } from "@effect/vitest";

import { UnknownProductProfileError, resolveProductProfile } from "./productProfile.ts";

describe("productProfile", () => {
  it("defaults to the publishable local desktop profile", () => {
    const profile = resolveProductProfile(undefined);
    assert.equal(profile.name, "local");
    assert.equal(profile.purpose, "product");
    assert.equal(profile.publishableAsSigidi, true);
    assert.equal(profile.capabilities.inheritedRemoteIntegrations, false);
    assert.equal(profile.capabilities.hostedAuthentication, false);
    assert.equal(profile.capabilities.lanMobilePairing, true);
    assert.equal(profile.capabilities.tailscaleExposure, true);
    assert.equal(profile.capabilities.remoteEnvironments, true);
    assert.equal(profile.capabilities.wsl, true);
  });

  it("enables inherited integrations only in the maintainer profile", () => {
    const profile = resolveProductProfile("upstream");
    assert.equal(profile.purpose, "integration");
    assert.equal(profile.publishableAsSigidi, false);
    assert.equal(profile.capabilities.inheritedRemoteIntegrations, true);
    assert.equal(profile.capabilities.lanMobilePairing, true);
    assert.equal(profile.capabilities.tailscaleExposure, true);
    assert.equal(profile.capabilities.remoteEnvironments, true);
    assert.equal(profile.capabilities.wsl, true);
  });

  it("fails closed for an unknown profile", () => {
    assert.throws(() => resolveProductProfile("remote-from-runtime"), UnknownProductProfileError);
    assert.throws(() => resolveProductProfile("local-desktop"), UnknownProductProfileError);
    assert.throws(() => resolveProductProfile("upstream-full"), UnknownProductProfileError);
  });
});
