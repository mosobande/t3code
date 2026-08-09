import { defineConfig } from "vite-plus";
import { resolveProductProfile } from "@t3tools/shared/productProfile";

import { loadRepoEnv } from "../../scripts/lib/public-config.ts";

const repoEnv = loadRepoEnv();
const buildProfile = resolveProductProfile(process.env.SIGIDI_BUILD_PROFILE);
const shouldLaunchElectronAfterPack = process.env.T3CODE_DESKTOP_DEV === "1";
const publicConfigDefine = {
  __SIGIDI_BUILD_PROFILE__: JSON.stringify(buildProfile.name),
  __T3CODE_BUILD_CLERK_PUBLISHABLE_KEY__: JSON.stringify(
    buildProfile.capabilities.hostedAuthentication
      ? (repoEnv.T3CODE_CLERK_PUBLISHABLE_KEY?.trim() ?? "")
      : "",
  ),
};

export const shouldBundleDesktopMainDependency = (id: string): boolean =>
  id.startsWith("@t3tools/") || id === "@clerk/electron" || id.startsWith("@clerk/electron/");

export default defineConfig({
  define: {
    __SIGIDI_BUILD_PROFILE__: JSON.stringify(buildProfile.name),
  },
  run: {
    tasks: {
      build: {
        command: "node scripts/build-preview-annotation-css.mjs && vp pack",
        dependsOn: ["t3#build"],
        cache: false,
      },
      dev: {
        command:
          "node scripts/build-preview-annotation-css.mjs && cross-env T3CODE_DESKTOP_DEV=1 vp pack --watch",
        dependsOn: ["t3#build"],
        cache: false,
      },
      "dev:bundle": {
        command: "node scripts/build-preview-annotation-css.mjs && vp pack --watch",
        cache: false,
      },
      "dev:electron": {
        command: "node scripts/dev-electron.mjs",
        dependsOn: ["t3#build"],
        cache: false,
      },
    },
  },
  pack: [
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      define: publicConfigDefine,
      entry: ["src/main.ts"],
      clean: true,
      deps: {
        alwaysBundle: shouldBundleDesktopMainDependency,
      },
      ...(shouldLaunchElectronAfterPack ? { onSuccess: "node scripts/dev-electron.mjs" } : {}),
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      define: publicConfigDefine,
      entry: ["src/preload.ts"],
      deps: {
        // Sandboxed Electron preloads cannot reliably resolve package imports
        // from inside the packaged ASAR. Bundle Clerk's preload bridge into the
        // preload artifact instead of leaving a runtime require() behind. The
        // product profile must also be bundled so this build's immutable
        // __SIGIDI_BUILD_PROFILE__ define reaches the preload boundary.
        alwaysBundle: (id) =>
          id === "@t3tools/shared/productProfile" ||
          id === "@clerk/electron" ||
          id.startsWith("@clerk/electron/"),
      },
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/preview-pick-preload.ts"],
      deps: {
        alwaysBundle: (id) => id === "react-grab" || id.startsWith("react-grab/"),
      },
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      entry: ["src/preview-pip-preload.ts"],
    },
  ],
});
