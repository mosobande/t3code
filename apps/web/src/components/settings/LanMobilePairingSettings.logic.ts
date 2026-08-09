import type { AdvertisedEndpoint } from "@t3tools/contracts";

/** A local-only build pairs mobile clients only through its direct LAN endpoint. */
export function selectLanMobilePairingEndpoint(
  endpoints: ReadonlyArray<AdvertisedEndpoint>,
): AdvertisedEndpoint | null {
  return (
    endpoints.find(
      (endpoint) => endpoint.reachability === "lan" && endpoint.status === "available",
    ) ?? null
  );
}
