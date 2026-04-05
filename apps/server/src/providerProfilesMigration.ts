/**
 * providerProfilesMigration.ts — Migration logic for provider profiles.
 *
 * This file ONLY depends on contracts types and is imported by serverSettings.ts
 * to avoid circular dependency issues.
 */
import {
  type ProviderProfile,
  type ServerSettings,
} from "@t3tools/contracts";

export const PROVIDER_PROFILES_MIGRATION_VERSION = 1;

/**
 * Synthesize default profiles from the current provider settings.
 * Creates one default profile per enabled provider.
 */
export function synthesizeDefaultProfiles(settings: ServerSettings): ProviderProfile[] {
  const profiles: ProviderProfile[] = [];
  const now = new Date().toISOString();

  for (const provider of ["codex", "claudeAgent"] as const) {
    const providerSettings = settings.providers[provider];
    if (!providerSettings.enabled) {
      continue;
    }

    // Use the text generation model selection for the default model
    const model =
      settings.textGenerationModelSelection.provider === provider
        ? settings.textGenerationModelSelection.model
        : provider === "codex"
          ? "codex"
          : "claude-sonnet-4-20250514";

    const options =
      provider === "codex"
        ? { provider: "codex" as const, codex: {} }
        : { provider: "claudeAgent" as const, claudeAgent: {} };

    profiles.push({
      id: crypto.randomUUID(),
      name: provider === "codex" ? "Default Codex" : "Default Claude Agent",
      provider,
      model,
      options,
      customEndpoint: null,
      isDefault: true,
      description: `Default profile synthesized from built-in ${provider} settings on migration`,
      createdAt: now,
      updatedAt: now,
    });
  }

  return profiles;
}

/**
 * Performs migration of provider profiles if needed.
 * Called by loadSettingsFromDisk.
 */
export function needsMigration(settings: ServerSettings): boolean {
  const hasProfiles =
    Array.isArray(settings.providerProfiles) && settings.providerProfiles.length > 0;
  const hasMigrationMarker = settings._providerProfilesMigration !== undefined;
  const migrationVersion = settings._providerProfilesMigration?.version;

  // If migration marker exists and version is current, migration is complete — even empty profiles is valid
  if (hasMigrationMarker && migrationVersion === PROVIDER_PROFILES_MIGRATION_VERSION) {
    return false;
  }

  return (
    !hasProfiles &&
    (!hasMigrationMarker ||
      migrationVersion < PROVIDER_PROFILES_MIGRATION_VERSION)
  );
}
