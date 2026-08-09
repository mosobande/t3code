import { type AuthSessionId } from "@t3tools/contracts";
import { useCallback, useMemo, useState } from "react";

import {
  revokeOtherServerClientSessions,
  revokeServerClientSession,
  revokeServerPairingLink,
} from "~/environments/primary";
import { authEnvironment } from "~/state/auth";
import {
  desktopNetworkAccessStateAtom,
  refreshDesktopNetworkAccessState,
} from "~/state/desktopNetworkAccess";
import { usePrimaryEnvironment } from "~/state/environments";
import { useEnvironmentQuery } from "~/state/query";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { PairingClientsList } from "./ConnectionsSettings";
import {
  sortDesktopClientSessions,
  sortDesktopPairingLinks,
  toDesktopClientSessionRecord,
  toDesktopPairingLinkRecord,
} from "./ConnectionsSettings.logic";
import { LanMobilePairingSettings } from "./LanMobilePairingSettings";
import { SettingsPageContainer } from "./settingsLayout";

/** Product-build connection controls: direct local-network mobile pairing only. */
export function LocalConnectionsSettings() {
  const primaryEnvironment = usePrimaryEnvironment();
  const [revokingPairingLinkId, setRevokingPairingLinkId] = useState<string | null>(null);
  const [revokingClientSessionId, setRevokingClientSessionId] = useState<string | null>(null);
  const [isClearingOtherConnections, setIsClearingOtherConnections] = useState(false);
  const accessChanges = useEnvironmentQuery(
    primaryEnvironment
      ? authEnvironment.accessChanges({
          environmentId: primaryEnvironment.environmentId,
          input: null,
        })
      : null,
  );
  const networkAccess = useEnvironmentQuery(desktopNetworkAccessStateAtom);
  const pairingLinks = useMemo(() => {
    const event = accessChanges.data;
    if (event?.type !== "snapshot") return [];
    return sortDesktopPairingLinks(event.payload.pairingLinks.map(toDesktopPairingLinkRecord));
  }, [accessChanges.data]);
  const clientSessions = useMemo(() => {
    const event = accessChanges.data;
    if (event?.type !== "snapshot") return [];
    return sortDesktopClientSessions(
      event.payload.clientSessions.map(toDesktopClientSessionRecord),
    );
  }, [accessChanges.data]);

  const refreshConnections = useCallback(() => {
    accessChanges.refresh();
    refreshDesktopNetworkAccessState();
  }, [accessChanges]);

  const revokePairingLink = useCallback(
    async (id: string) => {
      setRevokingPairingLinkId(id);
      try {
        await revokeServerPairingLink(id);
        refreshConnections();
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Could not revoke the pairing link.";
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not revoke pairing link",
            description,
          }),
        );
      } finally {
        setRevokingPairingLinkId(null);
      }
    },
    [refreshConnections],
  );

  const revokeClientSession = useCallback(
    async (sessionId: AuthSessionId) => {
      setRevokingClientSessionId(sessionId);
      try {
        await revokeServerClientSession(sessionId);
        refreshConnections();
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Could not revoke the connection.";
        toastManager.add(
          stackedThreadToast({ type: "error", title: "Could not revoke connection", description }),
        );
      } finally {
        setRevokingClientSessionId(null);
      }
    },
    [refreshConnections],
  );

  const clearOtherConnections = useCallback(async () => {
    setIsClearingOtherConnections(true);
    try {
      await revokeOtherServerClientSessions();
      refreshConnections();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Could not clear other connections.";
      toastManager.add(
        stackedThreadToast({ type: "error", title: "Could not clear connections", description }),
      );
    } finally {
      setIsClearingOtherConnections(false);
    }
  }, [refreshConnections]);

  return (
    <SettingsPageContainer>
      <LanMobilePairingSettings />
      <section className="space-y-3">
        <div className="flex min-h-8 items-center justify-between gap-4 px-3 sm:px-4">
          <h2 className="text-lg font-semibold tracking-[-0.025em] text-foreground">Connections</h2>
          <Button
            size="xs"
            variant="destructive-outline"
            disabled={
              isClearingOtherConnections || clientSessions.every((session) => session.current)
            }
            onClick={() => void clearOtherConnections()}
          >
            {isClearingOtherConnections ? "Clearing…" : "Clear other connections"}
          </Button>
        </div>
        {accessChanges.error ? (
          <p className="px-3 text-xs text-destructive sm:px-4">{accessChanges.error}</p>
        ) : null}
        <ScrollArea scrollFade className="max-h-[22.5rem]">
          <PairingClientsList
            endpointUrl={networkAccess.data?.serverExposureState.endpointUrl}
            endpoints={networkAccess.data?.advertisedEndpoints ?? []}
            defaultEndpointKey={null}
            isLoading={accessChanges.isPending}
            pairingLinks={pairingLinks}
            clientSessions={clientSessions}
            revokingPairingLinkId={revokingPairingLinkId}
            revokingClientSessionId={revokingClientSessionId}
            onRevokePairingLink={(id) => void revokePairingLink(id)}
            onRevokeClientSession={(id) => void revokeClientSession(id)}
          />
        </ScrollArea>
      </section>
    </SettingsPageContainer>
  );
}
