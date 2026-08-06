import { useAtomValue } from "@effect/atom-react";
import { ProviderDriverKind } from "@t3tools/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { createModelSelection } from "@t3tools/shared/model";
import * as Equal from "effect/Equal";

import { ProviderModelPicker } from "../../components/chat/ProviderModelPicker";
import { TraitsPicker } from "../../components/chat/TraitsPicker";
import { SettingResetButton, SettingsRow } from "../../components/settings/settingsLayout";
import { searchableSetting } from "../../components/settings/settingsSearch";
import { usePrimarySettings, useUpdatePrimarySettings } from "../../hooks/useSettings";
import { getCustomModelOptionsByInstance } from "../../modelSelection";
import {
  applyProviderInstanceSettings,
  deriveProviderInstanceEntries,
  sortProviderInstanceEntries,
} from "../../providerInstances";
import { lastViewedChatEnvironmentIdAtom } from "../../state/entities";
import { primaryEnvironmentIdAtom } from "../../state/primaryEnvironment";
import { primaryServerConfigAtom, primaryServerProvidersAtom } from "../../state/server";
import { resolvePromptClarificationSettingsUnavailableReason } from "./settings";

const DEFAULT_DRIVER_KIND = ProviderDriverKind.make("codex");

export function PromptClarificationSettingsRow() {
  const settings = usePrimarySettings();
  const updateSettings = useUpdatePrimarySettings();
  const primaryServerConfig = useAtomValue(primaryServerConfigAtom);
  const serverProviders = useAtomValue(primaryServerProvidersAtom);
  const settingsContextEnvironmentId = useAtomValue(lastViewedChatEnvironmentIdAtom);
  const primaryEnvironmentId = useAtomValue(primaryEnvironmentIdAtom);
  const unavailableReason = resolvePromptClarificationSettingsUnavailableReason({
    supportsCapability: primaryServerConfig?.environment.capabilities.promptClarification === true,
    settingsContextEnvironmentId,
    primaryEnvironmentId,
  });
  const selection = settings.promptClarificationModelSelection;
  const instanceEntries = sortProviderInstanceEntries(
    applyProviderInstanceSettings(deriveProviderInstanceEntries(serverProviders), settings),
  );
  const instanceEntry = instanceEntries.find((entry) => entry.instanceId === selection.instanceId);
  const modelOptionsByInstance = getCustomModelOptionsByInstance(
    settings,
    serverProviders,
    selection.instanceId,
    selection.model,
  );
  const isDirty = !Equal.equals(
    selection,
    DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection,
  );

  return (
    <SettingsRow
      {...searchableSetting("prompt-clarification-model")}
      title="Clarify model"
      description={
        unavailableReason ?? "Independent model for rewriting a draft before you send it."
      }
      resetAction={
        unavailableReason === null && isDirty ? (
          <SettingResetButton
            label="Clarify model"
            onClick={() =>
              updateSettings({
                promptClarificationModelSelection:
                  DEFAULT_UNIFIED_SETTINGS.promptClarificationModelSelection,
              })
            }
          />
        ) : null
      }
      control={
        unavailableReason !== null ? null : (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <ProviderModelPicker
              activeInstanceId={selection.instanceId}
              model={selection.model}
              lockedProvider={null}
              instanceEntries={instanceEntries}
              modelOptionsByInstance={modelOptionsByInstance}
              triggerVariant="outline"
              triggerClassName="min-w-0 max-w-none shrink-0 text-foreground/90 hover:text-foreground"
              onInstanceModelChange={(instanceId, model) =>
                updateSettings({
                  promptClarificationModelSelection: createModelSelection(instanceId, model),
                })
              }
            />
            <TraitsPicker
              provider={instanceEntry?.driverKind ?? DEFAULT_DRIVER_KIND}
              models={instanceEntry?.models ?? []}
              model={selection.model}
              prompt=""
              onPromptChange={() => {}}
              modelOptions={selection.options}
              allowPromptInjectedEffort={false}
              triggerVariant="outline"
              triggerClassName="min-w-0 max-w-none shrink-0 text-foreground/90 hover:text-foreground"
              onModelOptionsChange={(nextOptions) =>
                updateSettings({
                  promptClarificationModelSelection: createModelSelection(
                    selection.instanceId,
                    selection.model,
                    nextOptions,
                  ),
                })
              }
            />
          </div>
        )
      }
    />
  );
}
