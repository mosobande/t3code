import { productProfile } from "@t3tools/shared/productProfile";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { ConnectionsSettings } from "../components/settings/ConnectionsSettings";
import { LocalConnectionsSettings } from "../components/settings/LocalConnectionsSettings";

export const Route = createFileRoute("/settings/connections")({
  beforeLoad: () => {
    if (
      !productProfile.capabilities.remoteEnvironments &&
      !productProfile.capabilities.lanMobilePairing
    ) {
      throw redirect({ to: "/settings/general", replace: true });
    }
  },
  component: productProfile.capabilities.remoteEnvironments
    ? ConnectionsSettings
    : LocalConnectionsSettings,
});
