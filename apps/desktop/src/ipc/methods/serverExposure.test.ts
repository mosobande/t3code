import type { DesktopServerExposureState } from "@t3tools/contracts";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as DesktopLifecycle from "../../app/DesktopLifecycle.ts";
import * as DesktopEnvironment from "../../app/DesktopEnvironment.ts";
import * as DesktopShutdown from "../../app/DesktopShutdown.ts";
import * as DesktopState from "../../app/DesktopState.ts";
import * as DesktopServerExposure from "../../backend/DesktopServerExposure.ts";
import * as ElectronApp from "../../electron/ElectronApp.ts";
import * as ElectronTheme from "../../electron/ElectronTheme.ts";
import * as DesktopWindow from "../../window/DesktopWindow.ts";
import { setTailscaleServeEnabled } from "./serverExposure.ts";

const enabledState: DesktopServerExposureState = {
  mode: "network-accessible",
  endpointUrl: "http://127.0.0.1:3773",
  advertisedHost: "127.0.0.1",
  tailscaleServeEnabled: true,
  tailscaleServePort: 443,
};

const unusedLifecycleRuntimeLayer = Layer.mergeAll(
  DesktopShutdown.layer,
  DesktopState.layer,
  Layer.succeed(
    DesktopEnvironment.DesktopEnvironment,
    DesktopEnvironment.DesktopEnvironment.of(
      {} as DesktopEnvironment.DesktopEnvironment["Service"],
    ),
  ),
  Layer.succeed(
    DesktopWindow.DesktopWindow,
    DesktopWindow.DesktopWindow.of({} as DesktopWindow.DesktopWindow["Service"]),
  ),
  Layer.succeed(
    ElectronApp.ElectronApp,
    ElectronApp.ElectronApp.of({} as ElectronApp.ElectronApp["Service"]),
  ),
  Layer.succeed(
    ElectronTheme.ElectronTheme,
    ElectronTheme.ElectronTheme.of({} as ElectronTheme.ElectronTheme["Service"]),
  ),
);

function makeLayer(input: {
  readonly requiresRelaunch: boolean;
  readonly relaunchReasons: Array<string>;
}) {
  return Layer.mergeAll(
    unusedLifecycleRuntimeLayer,
    Layer.succeed(
      DesktopLifecycle.DesktopLifecycle,
      DesktopLifecycle.DesktopLifecycle.of({
        relaunch: (reason) =>
          Effect.sync(() => {
            input.relaunchReasons.push(reason);
          }),
        register: Effect.void,
      }),
    ),
    Layer.succeed(
      DesktopServerExposure.DesktopServerExposure,
      DesktopServerExposure.DesktopServerExposure.of({
        getState: Effect.succeed(enabledState),
        backendConfig: Effect.die("unused"),
        configureFromSettings: () => Effect.die("unused"),
        setMode: () => Effect.die("unused"),
        setTailscaleServeEnabled: () =>
          Effect.succeed({ state: enabledState, requiresRelaunch: input.requiresRelaunch }),
        getAdvertisedEndpoints: Effect.die("unused"),
      }),
    ),
  );
}

describe("server exposure IPC", () => {
  it.effect("relaunches when the exposure owner requests it", () => {
    const relaunchReasons: Array<string> = [];

    return Effect.gen(function* () {
      yield* setTailscaleServeEnabled.handler({ enabled: true, port: 443 });
      assert.deepEqual(relaunchReasons, ["tailscale-serve-enabled"]);
    }).pipe(Effect.provide(makeLayer({ requiresRelaunch: true, relaunchReasons })), Effect.scoped);
  });

  it.effect("does not relaunch for a repeated disable request", () => {
    const relaunchReasons: Array<string> = [];

    return Effect.gen(function* () {
      yield* setTailscaleServeEnabled.handler({ enabled: false, port: 443 });
      assert.deepEqual(relaunchReasons, []);
    }).pipe(Effect.provide(makeLayer({ requiresRelaunch: false, relaunchReasons })), Effect.scoped);
  });
});
