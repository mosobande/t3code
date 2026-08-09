import { assert, describe, it } from "@effect/vitest";
import { HostProcessPlatform } from "@t3tools/shared/hostProcess";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { beforeEach, vi } from "vite-plus/test";

const {
  appendSwitchMock,
  getSwitchValueMock,
  hasSwitchMock,
  mkdirSyncMock,
  readFileSyncMock,
  readdirSyncMock,
  registerSchemesMock,
  writeFileSyncMock,
} = vi.hoisted(() => ({
  appendSwitchMock: vi.fn(),
  getSwitchValueMock: vi.fn(),
  hasSwitchMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  readdirSyncMock: vi.fn(() => []),
  registerSchemesMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  mkdirSync: mkdirSyncMock,
  readFileSync: readFileSyncMock,
  readdirSync: readdirSyncMock,
  writeFileSync: writeFileSyncMock,
}));

vi.mock("electron", () => ({
  app: {
    getVersion: () => "0.0.31",
    isPackaged: true,
    commandLine: {
      appendSwitch: appendSwitchMock,
      getSwitchValue: getSwitchValueMock,
      hasSwitch: hasSwitchMock,
    },
  },
  protocol: {
    registerSchemesAsPrivileged: registerSchemesMock,
  },
}));

import * as DesktopPreReadyPlatform from "./DesktopPreReadyPlatform.ts";

describe("DesktopPreReadyPlatform", () => {
  beforeEach(() => {
    appendSwitchMock.mockReset();
    getSwitchValueMock.mockReset();
    hasSwitchMock.mockReset();
    mkdirSyncMock.mockClear();
    readFileSyncMock.mockClear();
    readdirSyncMock.mockClear();
    registerSchemesMock.mockReset();
    writeFileSyncMock.mockClear();
  });

  it("reads an explicit Electron command-line switch value", () => {
    const value = DesktopPreReadyPlatform.readCommandLineSwitchValue(
      {
        hasSwitch: (switchName) => switchName === "password-store",
        getSwitchValue: (switchName) => {
          assert.equal(switchName, "password-store");
          return "basic";
        },
      },
      "password-store",
    );

    assert.equal(value, "basic");
  });

  it("treats valueless Electron command-line switches as absent", () => {
    const value = DesktopPreReadyPlatform.readCommandLineSwitchValue(
      {
        hasSwitch: () => true,
        getSwitchValue: () => "",
      },
      "password-store",
    );

    assert.isNull(value);
  });

  it("returns null for missing Electron command-line switches", () => {
    const value = DesktopPreReadyPlatform.readCommandLineSwitchValue(
      {
        hasSwitch: () => false,
        getSwitchValue: () => {
          throw new Error("Unexpected switch value read.");
        },
      },
      "password-store",
    );

    assert.isNull(value);
  });

  it.effect(
    "configures Electron before asynchronous layers without inspecting the shared data home",
    () =>
      Effect.gen(function* () {
        class ClerkShaped extends Context.Service<ClerkShaped, { readonly ready: true }>()(
          "@t3tools/desktop/app/DesktopPreReadyPlatform.test/ClerkShaped",
        ) {}

        const events: Array<string> = [];
        registerSchemesMock.mockImplementation(() => {
          events.push("pre-ready");
        });

        const preReadyLayer = DesktopPreReadyPlatform.layer.pipe(
          Layer.provide(Layer.succeed(HostProcessPlatform, "darwin")),
        );

        const clerkShapedLayer = Layer.effect(
          ClerkShaped,
          Effect.promise(() => Promise.resolve()).pipe(
            Effect.map(() => {
              events.push("clerk");
              return { ready: true as const };
            }),
          ),
        );

        const runtimeLayer = clerkShapedLayer.pipe(
          Layer.flatMap((clerkContext) => Layer.succeedContext(clerkContext)),
          Layer.provideMerge(preReadyLayer),
        );

        const result = yield* Effect.all({
          clerk: ClerkShaped,
          preReady: DesktopPreReadyPlatform.DesktopPreReadyElectronOptions,
        }).pipe(Effect.provide(runtimeLayer));

        assert.deepEqual(result, {
          clerk: { ready: true },
          preReady: {
            linux: null,
            linuxPasswordStoreCommandLine: null,
          },
        });
        assert.deepEqual(events, ["pre-ready", "clerk"]);
        assert.equal(registerSchemesMock.mock.calls.length, 1);
        assert.equal(mkdirSyncMock.mock.calls.length, 0);
        assert.equal(readFileSyncMock.mock.calls.length, 0);
        assert.equal(readdirSyncMock.mock.calls.length, 0);
        assert.equal(writeFileSyncMock.mock.calls.length, 0);
        assert.deepEqual(
          registerSchemesMock.mock.calls[0]?.[0].map(
            (entry: { readonly scheme: string }) => entry.scheme,
          ),
          ["sigidi", "sigidi-nightly", "sigidi-dev"],
        );
        assert.equal(appendSwitchMock.mock.calls.length, 0);
      }),
  );
});
