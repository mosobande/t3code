import { productProfile } from "@t3tools/shared/productProfile";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { ConnectionsSettings } from "../components/settings/ConnectionsSettings";

export const Route = createFileRoute("/settings/connections")({
  beforeLoad: () => {
    if (!productProfile.capabilities.remoteEnvironments) {
      throw redirect({ to: "/settings/general", replace: true });
    }
  },
  component: ConnectionsSettings,
});
