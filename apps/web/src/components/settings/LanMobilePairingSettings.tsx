import { useCallback, useMemo, useState } from "react";
import { productProfile } from "@t3tools/shared/productProfile";

import { createServerPairingCredential } from "~/environments/primary";
import {
  desktopNetworkAccessStateAtom,
  refreshDesktopNetworkAccessState,
} from "~/state/desktopNetworkAccess";
import { useEnvironmentQuery } from "~/state/query";
import { Button } from "../ui/button";
import { QRCodeSvg } from "../ui/qr-code";
import { Switch } from "../ui/switch";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { resolveDesktopPairingUrl } from "./pairingUrls";
import { selectLanMobilePairingEndpoint } from "./LanMobilePairingSettings.logic";
import { SettingsRow, SettingsSection } from "./settingsLayout";

function supportsLanMobilePairing() {
  const bridge = typeof window === "undefined" ? undefined : window.desktopBridge;
  return (
    bridge !== undefined &&
    bridge.getServerExposureState !== undefined &&
    bridge.setServerExposureMode !== undefined &&
    bridge.getAdvertisedEndpoints !== undefined
  );
}

export function LanMobilePairingSettings() {
  const supported =
    productProfile.capabilities.lanMobilePairing &&
    !productProfile.capabilities.inheritedRemoteIntegrations &&
    supportsLanMobilePairing();
  const desktopNetworkAccess = useEnvironmentQuery(
    supported ? desktopNetworkAccessStateAtom : null,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const serverExposureState = desktopNetworkAccess.data?.serverExposureState ?? null;
  const lanEndpoint = useMemo(
    () => selectLanMobilePairingEndpoint(desktopNetworkAccess.data?.advertisedEndpoints ?? []),
    [desktopNetworkAccess.data?.advertisedEndpoints],
  );
  const enabled = serverExposureState?.mode === "network-accessible";

  const updateNetworkAccess = useCallback(async (nextEnabled: boolean) => {
    const bridge = window.desktopBridge;
    if (!bridge?.setServerExposureMode) return;
    setIsUpdating(true);
    setPairingUrl(null);
    try {
      await bridge.setServerExposureMode(nextEnabled ? "network-accessible" : "local-only");
      refreshDesktopNetworkAccessState();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Could not update local network access.";
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not update local network access",
          description,
        }),
      );
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const createPairingLink = useCallback(async () => {
    if (!lanEndpoint) return;
    setIsUpdating(true);
    try {
      const credential = await createServerPairingCredential({ label: "Mobile" });
      setPairingUrl(resolveDesktopPairingUrl(lanEndpoint.httpBaseUrl, credential.credential));
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Could not create a mobile pairing link.";
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not create mobile pairing link",
          description,
        }),
      );
    } finally {
      setIsUpdating(false);
    }
  }, [lanEndpoint]);

  if (!supported) return null;

  return (
    <SettingsSection title="Mobile on local network">
      <SettingsRow
        id="mobile-local-network"
        title="Allow mobile pairing"
        description={
          enabled
            ? lanEndpoint
              ? `Mobile devices on this network can pair with ${lanEndpoint.httpBaseUrl}.`
              : "SIGIDI is restarting local network access."
            : "Allow a phone or tablet on the same Wi-Fi or wired network to pair with this desktop."
        }
        status={
          desktopNetworkAccess.error
            ? desktopNetworkAccess.error
            : enabled
              ? "Relay, hosted access, and managed mobile push remain unavailable in this build."
              : null
        }
        control={
          <Switch
            checked={enabled}
            disabled={isUpdating || desktopNetworkAccess.isPending}
            onCheckedChange={(checked) => void updateNetworkAccess(checked)}
            aria-label="Allow mobile pairing on the local network"
          />
        }
      />
      {enabled && lanEndpoint ? (
        <SettingsRow
          title="Add mobile connection"
          description="Create a one-time QR code. Scan it in the SIGIDI mobile app while the device is on the same local network."
          control={
            <Button size="sm" onClick={() => void createPairingLink()} disabled={isUpdating}>
              {isUpdating ? "Creating…" : "Add connection"}
            </Button>
          }
        >
          {pairingUrl ? (
            <div className="mt-3 flex flex-col items-start gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <QRCodeSvg
                  value={pairingUrl}
                  size={132}
                  level="M"
                  marginSize={2}
                  title="Mobile pairing link"
                />
              </div>
              <code className="min-w-0 break-all text-xs text-muted-foreground">{pairingUrl}</code>
            </div>
          ) : null}
        </SettingsRow>
      ) : null}
    </SettingsSection>
  );
}
