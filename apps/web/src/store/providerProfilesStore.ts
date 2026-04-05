/**
 * Zustand store for provider profiles.
 *
 * Holds the list of provider profiles fetched from the server and provides
 * actions for CRUD operations via the WebSocket RPC layer.
 */

import {
  type ProviderProfile,
  type ProviderProfileId,
  type ProviderProfilePatch,
  WS_METHODS,
} from "@t3tools/contracts";
import { create } from "zustand";
import { runRpc } from "~/rpc/client";
import { getWsRpcClient } from "~/wsRpcClient";

// ── State ────────────────────────────────────────────────────────────

export interface ProviderProfilesState {
  profiles: readonly ProviderProfile[];
  loaded: boolean;
  error: string | null;
}

// ── Actions ─────────────────────────────────────────────────────────

interface ProviderProfilesActions {
  /** Fetch all profiles from the server. */
  fetchProfiles: () => Promise<void>;
  /** Create a new profile. */
  createProfile: (
    input: Omit<ProviderProfile, "id" | "createdAt" | "updatedAt">,
  ) => Promise<ProviderProfile>;
  /** Update an existing profile. */
  updateProfile: (
    id: ProviderProfileId,
    patch: ProviderProfilePatch,
  ) => Promise<ProviderProfile>;
  /** Rename a profile. */
  renameProfile: (id: ProviderProfileId, name: string) => Promise<ProviderProfile>;
  /** Delete a profile. */
  deleteProfile: (id: ProviderProfileId) => Promise<void>;
  /** Set a profile as the default for its provider. */
  setDefaultProfile: (id: ProviderProfileId) => Promise<void>;
  /** Clear any error state. */
  clearError: () => void;
}

type ProviderProfilesStore = ProviderProfilesState & ProviderProfilesActions;

const initialState: ProviderProfilesState = {
  profiles: [],
  loaded: false,
  error: null,
};

// ── Store ───────────────────────────────────────────────────────────

export const useProviderProfilesStore = create<ProviderProfilesStore>((set, get) => ({
  ...initialState,

  fetchProfiles: async () => {
    set({ error: null });
    try {
      const profiles = await runRpc((client) =>
        client[WS_METHODS.profileGetAll]({}),
      );
      set({ profiles: profiles as ProviderProfile[], loaded: true });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch profiles",
      });
    }
  },

  createProfile: async (input) => {
    set({ error: null });
    try {
      const result = await runRpc((client) =>
        client[WS_METHODS.profileCreate]({ profile: input }),
      );
      const profile = result as ProviderProfile;
      set((state) => ({
        profiles: [...state.profiles, profile],
      }));
      return profile;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to create profile",
      });
      throw err;
    }
  },

  updateProfile: async (id, patch) => {
    set({ error: null });
    try {
      const result = await runRpc((client) =>
        client[WS_METHODS.profileUpdate]({ id, patch }),
      );
      const profile = result as ProviderProfile;
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? profile : p)),
      }));
      return profile;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update profile",
      });
      throw err;
    }
  },

  renameProfile: async (id, name) => {
    set({ error: null });
    try {
      const result = await runRpc((client) =>
        client[WS_METHODS.profileRename]({ id, name }),
      );
      const profile = result as ProviderProfile;
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? profile : p)),
      }));
      return profile;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to rename profile",
      });
      throw err;
    }
  },

  deleteProfile: async (id) => {
    set({ error: null });
    try {
      await runRpc((client) => client[WS_METHODS.profileDelete]({ id }));
      set((state) => ({
        profiles: state.profiles.filter((p) => p.id !== id),
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete profile",
      });
      throw err;
    }
  },

  setDefaultProfile: async (id) => {
    set({ error: null });
    try {
      await runRpc((client) => client[WS_METHODS.profileSetDefault]({ id }));
      set((state) => {
        const profile = state.profiles.find((p) => p.id === id);
        if (!profile) return state;
        return {
          profiles: state.profiles.map((p) => ({
            ...p,
            isDefault:
              p.provider === profile.provider && p.id === id,
          })),
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to set default profile",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
