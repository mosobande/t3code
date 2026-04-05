/**
 * providerProfilesMigration.test.ts — Tests for provider profile migration logic.
 */
import { describe, it, assert } from "@effect/vitest";
import {
  type ServerSettings,
  DEFAULT_SERVER_SETTINGS,
} from "@t3tools/contracts";

import {
  needsMigration,
  synthesizeDefaultProfiles,
  PROVIDER_PROFILES_MIGRATION_VERSION,
} from "./providerProfilesMigration";

function makeSettings(overrides: Partial<ServerSettings> = {}): ServerSettings {
  return deepMerge(DEFAULT_SERVER_SETTINGS, overrides) as ServerSettings;
}

// Simple deep merge for test use (avoid importing Shared internals)
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// ── needsMigration tests ─────────────────────────────────────────────────────

describe("needsMigration", () => {
  it("returns true when providerProfiles is empty and migration marker is absent", () => {
    const settings = makeSettings({ providerProfiles: [] });
    const result = needsMigration(settings);
    assert.equal(result, true);
  });

  it("returns true when providerProfiles is undefined", () => {
    const settings = makeSettings({ providerProfiles: undefined as unknown as [] });
    const result = needsMigration(settings);
    assert.equal(result, true);
  });

  it("returns false when migration marker is present with current version and profiles exist", () => {
    const settings = makeSettings({
      providerProfiles: [
        {
          id: "existing-profile",
          name: "Existing",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      _providerProfilesMigration: {
        version: PROVIDER_PROFILES_MIGRATION_VERSION,
        performedAt: "2025-01-01T00:00:00.000Z",
      },
    });
    const result = needsMigration(settings);
    assert.equal(result, false);
  });

  it("returns true when migration version is stale (lower than current)", () => {
    const settings = makeSettings({
      providerProfiles: [],
      _providerProfilesMigration: {
        version: PROVIDER_PROFILES_MIGRATION_VERSION - 1,
        performedAt: "2024-01-01T00:00:00.000Z",
      },
    });
    const result = needsMigration(settings);
    assert.equal(result, true);
  });

  it("returns true when profiles are lost but migration marker exists (corrupted state)", () => {
    const settings = makeSettings({
      providerProfiles: [],
      _providerProfilesMigration: {
        version: PROVIDER_PROFILES_MIGRATION_VERSION,
        performedAt: "2025-01-01T00:00:00.000Z",
      },
    });
    const result = needsMigration(settings);
    // hasMigrationMarker=true, hasProfiles=false → profilesLostCorrupted=true
    assert.equal(result, true);
  });

  it("returns false when migration is current and profiles exist (normal first-run)", () => {
    const settings = makeSettings({
      providerProfiles: [
        {
          id: "profile-1",
          name: "Default Codex",
          provider: "codex",
          model: "codex",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      _providerProfilesMigration: {
        version: PROVIDER_PROFILES_MIGRATION_VERSION,
        performedAt: "2025-01-01T00:00:00.000Z",
      },
    });
    const result = needsMigration(settings);
    assert.equal(result, false);
  });
});

// ── synthesizeDefaultProfiles tests ────────────────────────────────────────

describe("synthesizeDefaultProfiles", () => {
  it("creates a profile for each enabled provider", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
      textGenerationModelSelection: {
        provider: "codex",
        model: "gpt-4o",
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    assert.equal(profiles.length, 2);
    const codexProfile = profiles.find((p) => p.provider === "codex");
    const claudeProfile = profiles.find((p) => p.provider === "claudeAgent");
    assert.notEqual(codexProfile, undefined);
    assert.notEqual(claudeProfile, undefined);
  });

  it("skips disabled providers", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: false },
        claudeAgent: { enabled: true },
      },
      textGenerationModelSelection: {
        provider: "claudeAgent",
        model: "claude-sonnet-4-20250514",
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].provider, "claudeAgent");
  });

  it("uses the textGenerationModelSelection model when it matches the provider", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
      textGenerationModelSelection: {
        provider: "codex",
        model: "my-custom-model",
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    const codexProfile = profiles.find((p) => p.provider === "codex");
    assert.equal(codexProfile?.model, "my-custom-model");
  });

  it("uses default model when textGenerationModelSelection does not match provider", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
      textGenerationModelSelection: {
        provider: "claudeAgent",
        model: "claude-sonnet-4-20250514",
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    const codexProfile = profiles.find((p) => p.provider === "codex");
    // Default Codex model is "codex"
    assert.equal(codexProfile?.model, "codex");
  });

  it("sets isDefault: true on synthesized profiles", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    for (const profile of profiles) {
      assert.equal(profile.isDefault, true);
    }
  });

  it("sets customEndpoint to null on synthesized profiles", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    for (const profile of profiles) {
      assert.equal(profile.customEndpoint, null);
    }
  });

  it("sets createdAt and updatedAt to current ISO timestamp", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
    });

    const before = new Date().toISOString();
    const profiles = synthesizeDefaultProfiles(settings);
    const after = new Date().toISOString();

    for (const profile of profiles) {
      assert.isTrue(profile.createdAt >= before);
      assert.isTrue(profile.createdAt <= after);
      assert.isTrue(profile.updatedAt >= before);
      assert.isTrue(profile.updatedAt <= after);
    }
  });

  it("generates unique IDs for each profile", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    const ids = new Set(profiles.map((p) => p.id));
    assert.equal(ids.size, profiles.length);
  });

  it("sets correct options branch provider tag", () => {
    const settings = makeSettings({
      providers: {
        codex: { enabled: true },
        claudeAgent: { enabled: true },
      },
    });

    const profiles = synthesizeDefaultProfiles(settings);

    const codexProfile = profiles.find((p) => p.provider === "codex");
    const claudeProfile = profiles.find((p) => p.provider === "claudeAgent");

    assert.deepEqual(codexProfile?.options, { provider: "codex", codex: {} });
    assert.deepEqual(claudeProfile?.options, {
      provider: "claudeAgent",
      claudeAgent: {},
    });
  });
});
