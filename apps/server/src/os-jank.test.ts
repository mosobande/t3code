import * as NodeOS from "node:os";
import { assert, it } from "@effect/vitest";

import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";

import { hydratePosixHome, resolveBaseDir } from "./os-jank.ts";

it.effect("uses the SIGIDI home when no base directory is configured", () =>
  Effect.gen(function* () {
    assert.equal(yield* resolveBaseDir(undefined), `${NodeOS.homedir()}/.sigidi`);
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("keeps an explicit home authoritative", () =>
  Effect.gen(function* () {
    assert.equal(yield* resolveBaseDir("~/custom-data"), `${NodeOS.homedir()}/custom-data`);
  }).pipe(Effect.provide(NodeServices.layer)),
);

it("hydrates HOME for minimal service environments from the user account", () => {
  const env: NodeJS.ProcessEnv = {};

  hydratePosixHome(env);

  assert.equal(env.HOME, NodeOS.userInfo().homedir);
});

it("hydrates HOME independently of a blank process HOME", () => {
  const originalHome = process.env.HOME;
  const env: NodeJS.ProcessEnv = { HOME: " " };

  try {
    process.env.HOME = " ";
    hydratePosixHome(env);
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  }

  assert.equal(env.HOME, NodeOS.userInfo().homedir);
});

it("preserves an explicitly configured HOME", () => {
  const env: NodeJS.ProcessEnv = { HOME: "/custom/home" };

  hydratePosixHome(env, () => {
    throw new Error("HOME lookup should not run");
  });

  assert.equal(env.HOME, "/custom/home");
});
