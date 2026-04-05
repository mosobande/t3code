import { createFileRoute } from "@tanstack/react-router";

import { ProviderProfilesPanel } from "../components/settings/SettingsPanels";

export const Route = createFileRoute("/settings/provider-profiles")({
  component: ProviderProfilesPanel,
});
