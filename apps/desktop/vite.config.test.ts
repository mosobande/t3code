import { assert, describe, it } from "@effect/vitest";

import { shouldBundleDesktopMainDependency } from "./vite.config.ts";

describe("desktop main dependency policy", () => {
  it("bundles profile-owned and Clerk main-process imports", () => {
    assert.isTrue(shouldBundleDesktopMainDependency("@t3tools/shared/productProfile"));
    assert.isTrue(shouldBundleDesktopMainDependency("@clerk/electron"));
    assert.isTrue(shouldBundleDesktopMainDependency("@clerk/electron/storage"));
    assert.isFalse(shouldBundleDesktopMainDependency("electron-store"));
  });
});
