/**
 * providerSettings.ts — Provider profiles management with atomic invariant enforcement.
 *
 * ALL profile mutations (create, update, rename, delete, setDefault) go through
 * updateProviderProfiles. This function holds a dedicated write semaphore for the
 * entire read-validate-write cycle, preventing concurrent modification races.
 *
 * The isDefault at-most-one invariant (at most one profile with isDefault: true
 * per provider) is enforced HERE, inside the semaphore, before any write occurs.
 */
import { Effect, Semaphore } from "effect";
import {
  type ProviderProfile,
  type ProviderProfileId,
  type ProviderProfilePatch,
  ServerSettings,
  type ServerSettingsPatch,
} from "@t3tools/contracts";
import {
  needsMigration,
  synthesizeDefaultProfiles,
  PROVIDER_PROFILES_MIGRATION_VERSION,
} from "./providerProfilesMigration";

// ── Semaphore ────────────────────────────────────────────────────────────────

const profileWriteSemaphore = Effect.runSync(Semaphore.make(1));

function withProfileSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  return Effect.runPromise(
    profileWriteSemaphore.withPermits(1)(Effect.sync(fn)),
  );
}

// ── Result type ───────────────────────────────────────────────────────────────

export type ProfileOperationResult =
  | { _tag: "success"; profile: ProviderProfile }
  | { _tag: "successList"; profiles: readonly ProviderProfile[] }
  | { _tag: "error"; message: string };

// ── isDefault invariant ────────────────────────────────────────────────────────

/**
 * Validate that at most one profile per provider has isDefault: true.
 * Returns error message if invariant is violated, null if valid.
 */
function validateIsDefaultInvariant(profiles: readonly ProviderProfile[]): string | null {
  const byProvider = new Map<string, ProviderProfile[]>();
  for (const profile of profiles) {
    const existing = byProvider.get(profile.provider) ?? [];
    existing.push(profile);
    byProvider.set(profile.provider, existing);
  }

  for (const [provider, providerProfiles] of byProvider) {
    const defaults = providerProfiles.filter((p) => p.isDefault);
    if (defaults.length > 1) {
      return `Invariant violated: ${defaults.length} profiles with isDefault: true for provider '${provider}'`;
    }
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateULID(): string {
  return crypto.randomUUID();
}

// ── Core atomic update ─────────────────────────────────────────────────────────

/**
 * All profile mutations use this entry point.
 * The semaphore ensures atomic read-validate-write.
 *
 * @param mutation - Function that receives current profiles, returns new profiles (or error)
 * @param getSettings - Effect to get current server settings
 * @param updateSettings - Effect to update server settings with a patch
 */
function updateProviderProfiles(
  mutation: (current: readonly ProviderProfile[]) => Promise<readonly ProviderProfile[]>,
  getSettings: Effect.Effect<ServerSettings, never>,
  updateSettings: (patch: ServerSettingsPatch) => Effect.Effect<ServerSettings, never>,
): Effect.Effect<ProfileOperationResult, never> {
  return Effect.gen(function* () {
    try {
      const settings = yield* getSettings;
      const currentProfiles = settings.providerProfiles ?? [];

      // Apply mutation — may throw on validation error
      const nextProfiles = yield* Effect.promise(() => mutation(currentProfiles));

      // Validate isDefault invariant BEFORE writing
      const invariantError = validateIsDefaultInvariant(nextProfiles);
      if (invariantError !== null) {
        return { _tag: "error", message: invariantError };
      }

      // Apply the patch to server settings
      const patch: ServerSettingsPatch = {
        providerProfiles: nextProfiles,
      };

      const updated = yield* updateSettings(patch);

      return { _tag: "successList", profiles: updated.providerProfiles };
    } catch (error) {
      return {
        _tag: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Sets the server settings service context for profile mutations.
 * Called by server during initialization to wire up the dependency.
 */
let _serverSettingsContext: {
  getSettings: Effect.Effect<ServerSettings, never>;
  updateSettings: (patch: ServerSettingsPatch) => Effect.Effect<ServerSettings, never>;
} | null = null;

export function setServerSettingsContext(context: {
  getSettings: Effect.Effect<ServerSettings, never>;
  updateSettings: (patch: ServerSettingsPatch) => Effect.Effect<ServerSettings, never>;
}): void {
  _serverSettingsContext = context;
}

export async function createProfile(
  input: Omit<ProviderProfile, "id" | "createdAt" | "updatedAt">,
): Promise<ProfileOperationResult> {
  if (!_serverSettingsContext) {
    throw new Error("Server settings context not initialized. Call setServerSettingsContext first.");
  }

  const result = await withProfileSemaphore(async () => {
    return Effect.runPromise(
      updateProviderProfiles(
        async (current) => {
          // If new profile is isDefault, unset others for same provider
          let profiles = current;
          if (input.isDefault) {
            profiles = profiles.map((p) =>
              p.provider === input.provider ? { ...p, isDefault: false } : p,
            );
          }

          const newProfile: ProviderProfile = {
            ...input,
            id: generateULID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return [...profiles, newProfile];
        },
        _serverSettingsContext.getSettings,
        _serverSettingsContext.updateSettings,
      ),
    );
  });

  if (result._tag === "successList") {
    const created = result.profiles.find(
      (p) =>
        p.name === input.name &&
        p.provider === input.provider &&
        p.model === input.model,
    );
    return created
      ? { _tag: "success", profile: created }
      : { _tag: "error", message: "Failed to create profile" };
  }
  return result;
}

export async function updateProfile(
  id: ProviderProfileId,
  patch: ProviderProfilePatch,
): Promise<ProfileOperationResult> {
  if (!_serverSettingsContext) {
    throw new Error("Server settings context not initialized. Call setServerSettingsContext first.");
  }

  // Pre-condition: patch must not be empty
  if (Object.keys(patch).length === 0) {
    return {
      _tag: "error",
      message: "Empty patch: no fields to update. Provide at least one field to change.",
    };
  }

  return withProfileSemaphore(async () => {
    return Effect.runPromise(
      updateProviderProfiles(
        async (current) => {
          const idx = current.findIndex((p) => p.id === id);
          if (idx === -1) {
            throw new Error(`Profile '${id}' not found`);
          }

          const existing = current[idx];

          // If isDefault is being set to true, unset others for same provider
          let profiles = current;
          if (patch.isDefault === true) {
            profiles = profiles.map((p) =>
              p.provider === existing.provider && p.id !== id ? { ...p, isDefault: false } : p,
            );
          }

          // CRITICAL: Use patch.options.provider === "codex" (not _tag) to derive provider
          const updated: ProviderProfile = {
            ...existing,
            ...patch,
            id: existing.id, // immutable
            createdAt: existing.createdAt, // immutable
            updatedAt: new Date().toISOString(),
            // Ensure provider field stays consistent with options branch
            provider: patch.options?.provider ?? existing.provider,
          };

          profiles = [...profiles];
          profiles[idx] = updated;
          return profiles;
        },
        _serverSettingsContext.getSettings,
        _serverSettingsContext.updateSettings,
      ),
    );
  });
}

export async function renameProfile(
  id: ProviderProfileId,
  name: string,
): Promise<ProfileOperationResult> {
  return updateProfile(id, { name });
}

export async function deleteProfile(
  id: ProviderProfileId,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!_serverSettingsContext) {
    throw new Error("Server settings context not initialized. Call setServerSettingsContext first.");
  }

  const result = await withProfileSemaphore(async () => {
    return Effect.runPromise(
      updateProviderProfiles(
        async (current) => {
          const profile = current.find((p) => p.id === id);
          if (!profile) {
            throw new Error(`Profile '${id}' not found`);
          }
          if (profile.isDefault) {
            throw new Error("Cannot delete the default profile for a provider");
          }
          const remaining = current.filter((p) => p.provider === profile.provider);
          if (remaining.length === 1) {
            throw new Error(
              "Cannot delete the last profile for a provider — at least one profile must exist",
            );
          }
          return current.filter((p) => p.id !== id);
        },
        _serverSettingsContext.getSettings,
        _serverSettingsContext.updateSettings,
      ),
    );
  });

  if (result._tag === "successList") {
    return { success: true };
  }
  return { success: false, error: result.message };
}

export async function setDefaultProfile(
  id: ProviderProfileId,
): Promise<ProfileOperationResult> {
  if (!_serverSettingsContext) {
    throw new Error("Server settings context not initialized. Call setServerSettingsContext first.");
  }

  return withProfileSemaphore(async () => {
    return Effect.runPromise(
      updateProviderProfiles(
        async (current) => {
          const profile = current.find((p) => p.id === id);
          if (!profile) {
            throw new Error(`Profile '${id}' not found`);
          }
          return current.map((p) => ({
            ...p,
            isDefault: p.provider === profile.provider && p.id === id,
          }));
        },
        _serverSettingsContext.getSettings,
        _serverSettingsContext.updateSettings,
      ),
    );
  });
}

export async function getProfiles(): Promise<readonly ProviderProfile[]> {
  if (!_serverSettingsContext) {
    throw new Error("Server settings context not initialized. Call setServerSettingsContext first.");
  }

  const settings = await Effect.runPromise(_serverSettingsContext.getSettings);
  return settings.providerProfiles ?? [];
}

// ── Migration helpers (used by serverSettings.ts) ───────────────────────────────

export { PROVIDER_PROFILES_MIGRATION_VERSION };

export { needsMigration, synthesizeDefaultProfiles };
