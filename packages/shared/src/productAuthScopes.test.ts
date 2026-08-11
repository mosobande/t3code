import {
  AuthAccessReadScope,
  AuthAccessWriteScope,
  AuthAdministrativeScopes,
  AuthStandardClientScopes,
} from "@t3tools/contracts";
import { assert, describe, it } from "@effect/vitest";

import { resolveProductProfile } from "./productProfile.ts";
import {
  resolveProductAdministrativeScopes,
  resolveProductAuthScopes,
  resolveProductStandardClientScopes,
} from "./productAuthScopes.ts";

describe("product auth scopes", () => {
  it("removes inherited Relay scopes from the local profile", () => {
    const profile = resolveProductProfile("local");

    assert.deepEqual(resolveProductStandardClientScopes(profile), [
      "orchestration:read",
      "orchestration:operate",
      "terminal:operate",
      "review:write",
    ]);
    assert.deepEqual(resolveProductAdministrativeScopes(profile), [
      "orchestration:read",
      "orchestration:operate",
      "terminal:operate",
      "review:write",
      AuthAccessReadScope,
      AuthAccessWriteScope,
    ]);
    assert.deepEqual(resolveProductAuthScopes(AuthAdministrativeScopes, profile), [
      "orchestration:read",
      "orchestration:operate",
      "terminal:operate",
      "review:write",
      AuthAccessReadScope,
      AuthAccessWriteScope,
    ]);
  });

  it("preserves inherited scopes in the upstream profile without mutating the input", () => {
    const scopes = [...AuthStandardClientScopes];

    assert.deepEqual(resolveProductStandardClientScopes(resolveProductProfile("upstream")), scopes);
    assert.deepEqual(scopes, [...AuthStandardClientScopes]);
  });
});
