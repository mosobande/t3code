import { productProfile } from "@t3tools/shared/productProfile";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ElectronWindow from "../electron/ElectronWindow.ts";
import * as PreviewManager from "../preview/Manager.ts";
import * as IpcChannels from "./channels.ts";
import * as DesktopIpc from "./DesktopIpc.ts";
import { installDesktopIpcHandlers } from "./DesktopIpcHandlers.ts";

const makeLayer = (channels: Set<string>) =>
  Layer.mergeAll(
    Layer.succeed(
      DesktopIpc.DesktopIpc,
      DesktopIpc.DesktopIpc.of({
        handle: (method) =>
          Effect.sync(() => {
            channels.add(method.channel);
          }),
        handleSync: (method) =>
          Effect.sync(() => {
            channels.add(method.channel);
          }),
      } as DesktopIpc.DesktopIpc["Service"]),
    ),
    Layer.succeed(
      ElectronWindow.ElectronWindow,
      ElectronWindow.ElectronWindow.of({
        sendAll: () => Effect.void,
      } as unknown as ElectronWindow.ElectronWindow["Service"]),
    ),
    Layer.succeed(
      PreviewManager.PreviewManager,
      PreviewManager.PreviewManager.of({
        subscribeStateChanges: () => Effect.void,
        subscribeRecordingFrames: () => Effect.void,
        subscribePointerEvents: () => Effect.void,
      } as unknown as PreviewManager.PreviewManager["Service"]),
    ),
  );

describe("desktop IPC product profile", () => {
  it.effect("registers the compiled profile's direct connection handlers", () => {
    const channels = new Set<string>();
    // The fake registrar records method channels and never executes their handlers.
    // @effect-diagnostics-next-line unsafeEffectTypeAssertion:off
    const install = installDesktopIpcHandlers().pipe(
      Effect.provide(makeLayer(channels)),
      Effect.scoped,
    ) as Effect.Effect<void, DesktopIpc.DesktopIpcRegistrationError>;

    return install.pipe(
      Effect.andThen(
        Effect.sync(() => {
          assert.isTrue(productProfile.capabilities.remoteEnvironments);
          assert.isTrue(productProfile.capabilities.tailscaleExposure);
          assert.isTrue(productProfile.capabilities.wsl);
          for (const channel of [
            IpcChannels.GET_CONNECTION_CATALOG_CHANNEL,
            IpcChannels.ENSURE_SSH_ENVIRONMENT_CHANNEL,
            IpcChannels.BOOTSTRAP_SSH_BEARER_SESSION_CHANNEL,
            IpcChannels.SET_TAILSCALE_SERVE_ENABLED_CHANNEL,
            IpcChannels.GET_WSL_STATE_CHANNEL,
            IpcChannels.SET_WSL_BACKEND_ENABLED_CHANNEL,
          ]) {
            assert.isTrue(channels.has(channel), `${channel} must be registered`);
          }
        }),
      ),
    );
  });
});
