import {
  AuthAdministrativeScopes,
  AuthRelayReadScope,
  AuthRelayWriteScope,
  AuthStandardClientScopes,
  type AuthEnvironmentScope,
} from "@t3tools/contracts";

import { productProfile, type ProductProfile } from "./productProfile.ts";

type AuthProfile = Pick<ProductProfile, "capabilities">;

export function resolveProductAuthScopes<T extends AuthEnvironmentScope>(
  scopes: ReadonlyArray<T>,
  profile: AuthProfile = productProfile,
): ReadonlyArray<T> {
  return profile.capabilities.inheritedRemoteIntegrations
    ? [...scopes]
    : scopes.filter((scope) => scope !== AuthRelayReadScope && scope !== AuthRelayWriteScope);
}

export const resolveProductStandardClientScopes = (
  profile: AuthProfile = productProfile,
): ReadonlyArray<AuthEnvironmentScope> =>
  resolveProductAuthScopes(AuthStandardClientScopes, profile);

export const resolveProductAdministrativeScopes = (
  profile: AuthProfile = productProfile,
): ReadonlyArray<AuthEnvironmentScope> =>
  resolveProductAuthScopes(AuthAdministrativeScopes, profile);

export const productStandardClientScopes = resolveProductStandardClientScopes();
export const productAdministrativeScopes = resolveProductAdministrativeScopes();
