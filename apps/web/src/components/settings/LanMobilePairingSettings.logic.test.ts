import { describe, expect, it } from "vite-plus/test";
import type { AdvertisedEndpoint } from "@t3tools/contracts";

import { selectLanMobilePairingEndpoint } from "./LanMobilePairingSettings.logic";

const endpoint = (overrides: Partial<AdvertisedEndpoint> = {}): AdvertisedEndpoint => ({
  id: "desktop-loopback:3773",
  label: "This machine",
  provider: { id: "desktop-core", label: "Desktop", kind: "core" as const, isAddon: false },
  httpBaseUrl: "http://127.0.0.1:3773/",
  wsBaseUrl: "ws://127.0.0.1:3773/",
  reachability: "loopback" as const,
  compatibility: {
    hostedHttpsApp: "mixed-content-blocked" as const,
    desktopApp: "compatible" as const,
  },
  source: "desktop-core" as const,
  status: "available" as const,
  ...overrides,
});

describe("selectLanMobilePairingEndpoint", () => {
  it("selects only an available direct LAN endpoint", () => {
    expect(
      selectLanMobilePairingEndpoint([
        endpoint(),
        endpoint({
          id: "desktop-lan:http://192.168.1.20:3773",
          reachability: "lan",
          httpBaseUrl: "http://192.168.1.20:3773/",
          wsBaseUrl: "ws://192.168.1.20:3773/",
        }),
        endpoint({ id: "tailscale-ip", reachability: "private-network" }),
      ])?.httpBaseUrl,
    ).toBe("http://192.168.1.20:3773/");
  });

  it("does not fall back to loopback, Tailscale, or an unavailable LAN endpoint", () => {
    expect(
      selectLanMobilePairingEndpoint([
        endpoint(),
        endpoint({ id: "lan-unavailable", reachability: "lan", status: "unavailable" }),
        endpoint({ id: "tailscale-ip", reachability: "private-network" }),
      ]),
    ).toBeNull();
  });
});
