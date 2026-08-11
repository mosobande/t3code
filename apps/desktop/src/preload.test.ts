import { productProfile } from "@t3tools/shared/productProfile";
import { assert, describe, it } from "@effect/vitest";
import { vi } from "vite-plus/test";

const { exposeClerkBridge, exposeInMainWorld } = vi.hoisted(() => ({
  exposeClerkBridge: vi.fn(),
  exposeInMainWorld: vi.fn(),
}));

vi.mock("@clerk/electron/preload", () => ({ exposeClerkBridge }));
vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    sendSync: vi.fn(),
  },
}));

await import("./preload.ts");

describe("desktop preload product profile", () => {
  it("exposes direct remote, Tailscale, WSL, and LAN bridges for the compiled profile", () => {
    const exposure = exposeInMainWorld.mock.calls.find(([name]) => name === "desktopBridge");
    assert.isDefined(exposure);
    const bridge = exposure[1] as Record<string, unknown>;

    for (const key of [
      "getConnectionCatalog",
      "setConnectionCatalog",
      "ensureSshEnvironment",
      "bootstrapSshBearerSession",
      "setTailscaleServeEnabled",
      "getWslState",
      "setWslBackendEnabled",
      "getServerExposureState",
      "setServerExposureMode",
      "getAdvertisedEndpoints",
    ]) {
      assert.isFunction(bridge[key], `${key} must be exposed`);
    }
  });

  it("exposes hosted authentication only when the compiled profile includes it", () => {
    assert.equal(
      exposeClerkBridge.mock.calls.length,
      productProfile.capabilities.hostedAuthentication ? 1 : 0,
    );
  });
});
