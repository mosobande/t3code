/**
 * providerSettings.test.ts — Tests for provider profile CRUD operations.
 */
import { describe, it, assert, vi, beforeEach, afterEach } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import {
  type ProviderProfile,
  type ProviderProfilePatch,
  ServerSettings,
} from "@t3tools/contracts";
import { deepMerge } from "@t3tools/shared/Struct";
import { DEFAULT_SERVER_SETTINGS } from "@t3tools/contracts";

import {
  createProfile,
  deleteProfile,
  getProfiles,
  renameProfile,
  setDefaultProfile,
  setServerSettingsContext,
  updateProfile,
} from "./providerSettings";
import { ServerSettingsService } from "./serverSettings";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CODEX_PROFILE_INPUT = {
  name: "My Codex Profile",
  provider: "codex" as const,
  model: "gpt-4o",
  options: { provider: "codex" as const, codex: {} },
  customEndpoint: null,
  isDefault: false,
  description: "A test profile",
};

const CLAUDE_PROFILE_INPUT = {
  name: "My Claude Profile",
  provider: "claudeAgent" as const,
  model: "claude-sonnet-4-20250514",
  options: { provider: "claudeAgent" as const, claudeAgent: {} },
  customEndpoint: null,
  isDefault: false,
  description: "A test profile",
};

/** Make a mock server settings context that stores profiles in memory. */
function makeMockContext(profiles: readonly ProviderProfile[] = []) {
  let currentProfiles = [...profiles];

  const getSettings = Effect.sync(() =>
    deepMerge(DEFAULT_SERVER_SETTINGS, { providerProfiles: currentProfiles }),
  );

  const updateSettings = (patch: { providerProfiles?: readonly ProviderProfile[] }) =>
    Effect.sync(() => {
      if (patch.providerProfiles !== undefined) {
        currentProfiles = [...patch.providerProfiles];
      }
      return deepMerge(DEFAULT_SERVER_SETTINGS, { providerProfiles: currentProfiles });
    });

  return { getSettings, updateSettings };
}

/** Set up the provider settings context before each test. */
function setupContext(profiles: readonly ProviderProfile[] = []) {
  const ctx = makeMockContext(profiles);
  setServerSettingsContext(ctx);
  return ctx;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("providerSettings", () => {
  beforeEach(() => {
    // Reset context before each test
    setServerSettingsContext(makeMockContext([]));
  });

  describe("getProfiles", () => {
    it("returns empty array when no profiles exist", () =>
      Effect.gen(function* () {
        setServerSettingsContext(makeMockContext([]));
        const profiles = yield* Effect.promise(() => getProfiles());
        assert.deepEqual(profiles, []);
      }),
    );

    it("returns all stored profiles", () =>
      Effect.gen(function* () {
        const profiles: ProviderProfile[] = [
          {
            id: "profile-1",
            name: "Profile 1",
            provider: "codex",
            model: "gpt-4o",
            options: { provider: "codex", codex: {} },
            customEndpoint: null,
            isDefault: true,
            description: "",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ];
        setServerSettingsContext(makeMockContext(profiles));
        const result = yield* Effect.promise(() => getProfiles());
        assert.equal(result.length, 1);
        assert.equal(result[0].id, "profile-1");
      }),
    );
  });

  describe("createProfile", () => {
    it("creates a new profile successfully", () =>
      Effect.gen(function* () {
        const ctx = setupContext([]);
        const result = yield* Effect.promise(() => createProfile(CODEX_PROFILE_INPUT));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.equal(result.profile.name, CODEX_PROFILE_INPUT.name);
          assert.equal(result.profile.provider, "codex");
          assert.equal(result.profile.model, CODEX_PROFILE_INPUT.model);
          assert.equal(result.profile.isDefault, false);
          assert.notEqual(result.profile.id, "");
          assert.notEqual(result.profile.createdAt, "");
        }
      }),
    );

    it("uses current timestamp for createdAt/updatedAt", () =>
      Effect.gen(function* () {
        setupContext([]);
        const before = new Date().toISOString();
        const result = yield* Effect.promise(() => createProfile(CODEX_PROFILE_INPUT));
        const after = new Date().toISOString();
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.isTrue(result.profile.createdAt >= before);
          assert.isTrue(result.profile.createdAt <= after);
        }
      }),
    );

    it("generates a UUID for the new profile id", () =>
      Effect.gen(function* () {
        setupContext([]);
        const result = yield* Effect.promise(() => createProfile(CODEX_PROFILE_INPUT));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.isTrue(result.profile.id.length > 0);
          // UUID format check
          assert.isTrue(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              result.profile.id,
            ),
          );
        }
      }),
    );

    it("adds profile to the existing list", () =>
      Effect.gen(function* () {
        const existing: ProviderProfile[] = [
          {
            id: "existing-1",
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
        ];
        setupContext(existing);
        const result = yield* Effect.promise(() => createProfile(CLAUDE_PROFILE_INPUT));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          const profiles = yield* Effect.promise(() => getProfiles());
          assert.equal(profiles.length, 2);
        }
      }),
    );

    it("throws if context not initialized", () =>
      Effect.gen(function* () {
        // Override with noop context that throws
        setServerSettingsContext({
          // @ts-expect-error — intentionally bad context
          getSettings: Effect.sync(() => {
            throw new Error("not initialized");
          }),
          updateSettings: () => Effect.sync(() => DEFAULT_SERVER_SETTINGS),
        });
        const result = yield* Effect.promise(() => createProfile(CODEX_PROFILE_INPUT));
        assert.equal(result._tag, "error");
        if (result._tag === "error") {
          assert.include(result.message, "not initialized");
        }
      }),
    );
  });

  describe("updateProfile", () => {
    it("updates profile fields successfully", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "update-test-id",
          name: "Original Name",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "Original description",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile]);

        const patch: ProviderProfilePatch = {
          name: "Updated Name",
          description: "Updated description",
        };
        const result = yield* Effect.promise(() => updateProfile("update-test-id", patch));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.equal(result.profile.name, "Updated Name");
          assert.equal(result.profile.description, "Updated description");
        }
      }),
    );

    it("returns error for empty patch", () =>
      Effect.gen(function* () {
        setupContext([]);
        const result = yield* Effect.promise(() => updateProfile("any-id", {}));
        assert.equal(result._tag, "error");
        if (result._tag === "error") {
          assert.include(result.message, "Empty patch");
        }
      }),
    );

    it("returns error when profile not found", () =>
      Effect.gen(function* () {
        setupContext([]);
        const result = yield* Effect.promise(() =>
          updateProfile("non-existent-id", { name: "New Name" }),
        );
        assert.equal(result._tag, "error");
        if (result._tag === "error") {
          assert.include(result.message, "not found");
        }
      }),
    );

    it("updates the updatedAt timestamp", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "update-ts-id",
          name: "Test",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile]);

        const before = new Date().toISOString();
        const result = yield* Effect.promise(() =>
          updateProfile("update-ts-id", { description: "Changed" }),
        );
        const after = new Date().toISOString();
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.isTrue(result.profile.updatedAt >= before);
          assert.isTrue(result.profile.updatedAt <= after);
        }
      }),
    );

    it("does not allow changing id or createdAt", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "immutable-id",
          name: "Test",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile]);

        const result = yield* Effect.promise(() =>
          updateProfile("immutable-id", {
            // @ts-expect-error — id is not in patch schema
            id: "hacked-id",
          } as ProviderProfilePatch),
        );
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.equal(result.profile.id, "immutable-id");
        }
      }),
    );
  });

  describe("renameProfile", () => {
    it("renames a profile by id", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "rename-test-id",
          name: "Old Name",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile]);

        const result = yield* Effect.promise(() => renameProfile("rename-test-id", "New Name"));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.equal(result.profile.name, "New Name");
        }
      }),
    );

    it("returns error when profile not found", () =>
      Effect.gen(function* () {
        setupContext([]);
        const result = yield* Effect.promise(() => renameProfile("non-existent", "New Name"));
        assert.equal(result._tag, "error");
        if (result._tag === "error") {
          assert.include(result.message, "not found");
        }
      }),
    );
  });

  describe("deleteProfile", () => {
    it("deletes a non-default profile successfully", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "delete-test-id",
          name: "To Delete",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: false,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        const other: ProviderProfile = {
          id: "other-profile-id",
          name: "Other",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile, other]);

        const result = yield* Effect.promise(() => deleteProfile("delete-test-id"));
        assert.equal(result.success, true);
        const profiles = yield* Effect.promise(() => getProfiles());
        assert.equal(profiles.length, 1);
        assert.equal(profiles[0].id, "other-profile-id");
      }),
    );

    it("returns error when deleting the default profile", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "default-profile-id",
          name: "Default",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        const other: ProviderProfile = {
          id: "other-id",
          name: "Other",
          provider: "claudeAgent",
          model: "claude-sonnet-4-20250514",
          options: { provider: "claudeAgent", claudeAgent: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile, other]);

        const result = yield* Effect.promise(() => deleteProfile("default-profile-id"));
        assert.equal(result.success, false);
        assert.include(result.error, "default profile");
      }),
    );

    it("returns error when deleting the last profile for a provider", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "last-codex-id",
          name: "Last Codex",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: false,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        // Only one codex profile, no other codex profiles
        setupContext([profile]);

        const result = yield* Effect.promise(() => deleteProfile("last-codex-id"));
        assert.equal(result.success, false);
        assert.include(result.error, "last profile");
      }),
    );

    it("allows deleting a non-last profile even if it shares provider with remaining defaults", () =>
      Effect.gen(function* () {
        const toDelete: ProviderProfile = {
          id: "to-delete",
          name: "To Delete",
          provider: "claudeAgent",
          model: "claude-sonnet-4-20250514",
          options: { provider: "claudeAgent", claudeAgent: {} },
          customEndpoint: null,
          isDefault: false,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        const remaining: ProviderProfile = {
          id: "remaining",
          name: "Remaining",
          provider: "claudeAgent",
          model: "claude-sonnet-4-20250514",
          options: { provider: "claudeAgent", claudeAgent: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([toDelete, remaining]);

        const result = yield* Effect.promise(() => deleteProfile("to-delete"));
        assert.equal(result.success, true);
      }),
    );

    it("returns error when profile not found", () =>
      Effect.gen(function* () {
        setupContext([]);
        const result = yield* Effect.promise(() => deleteProfile("non-existent"));
        assert.equal(result.success, false);
        assert.include(result.error, "not found");
      }),
    );
  });

  describe("setDefaultProfile", () => {
    it("sets isDefault: true on the target profile", () =>
      Effect.gen(function* () {
        const profile: ProviderProfile = {
          id: "set-default-id",
          name: "Target",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: false,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([profile]);

        const result = yield* Effect.promise(() => setDefaultProfile("set-default-id"));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          assert.equal(result.profile.isDefault, true);
        }
      }),
    );

    it("unsets isDefault on other profiles of the same provider", () =>
      Effect.gen(function* () {
        const toChange: ProviderProfile = {
          id: "to-change",
          name: "To Change",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: false,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        const existing: ProviderProfile = {
          id: "existing-default",
          name: "Existing Default",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([toChange, existing]);

        const result = yield* Effect.promise(() => setDefaultProfile("to-change"));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          const profiles = yield* Effect.promise(() => getProfiles());
          const changed = profiles.find((p) => p.id === "to-change");
          const existingDefault = profiles.find((p) => p.id === "existing-default");
          assert.equal(changed?.isDefault, true);
          assert.equal(existingDefault?.isDefault, false);
        }
      }),
    );

    it("does not affect profiles of other providers", () =>
      Effect.gen(function* () {
        const toChange: ProviderProfile = {
          id: "claude-to-change",
          name: "Claude To Change",
          provider: "claudeAgent",
          model: "claude-sonnet-4-20250514",
          options: { provider: "claudeAgent", claudeAgent: {} },
          customEndpoint: null,
          isDefault: false,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        const unrelated: ProviderProfile = {
          id: "codex-unrelated",
          name: "Codex Unrelated",
          provider: "codex",
          model: "gpt-4o",
          options: { provider: "codex", codex: {} },
          customEndpoint: null,
          isDefault: true,
          description: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };
        setupContext([toChange, unrelated]);

        const result = yield* Effect.promise(() => setDefaultProfile("claude-to-change"));
        assert.equal(result._tag, "success");
        if (result._tag === "success") {
          const profiles = yield* Effect.promise(() => getProfiles());
          const codexProfile = profiles.find((p) => p.id === "codex-unrelated");
          assert.equal(codexProfile?.isDefault, true); // untouched
        }
      }),
    );

    it("returns error when profile not found", () =>
      Effect.gen(function* () {
        setupContext([]);
        const result = yield* Effect.promise(() => setDefaultProfile("non-existent"));
        assert.equal(result._tag, "error");
        if (result._tag === "error") {
          assert.include(result.message, "not found");
        }
      }),
    );
  });
});
