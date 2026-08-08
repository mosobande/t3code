import { defineConfig } from "astro/config";
import { resolveProductProfile } from "../../packages/shared/src/productProfile.ts";

const productProfile = resolveProductProfile(process.env.SIGIDI_BUILD_PROFILE);

export default defineConfig({
  vite: {
    define: {
      __SIGIDI_BUILD_PROFILE__: JSON.stringify(productProfile.name),
    },
  },
  server: {
    port: Number(process.env.PORT ?? 4173),
  },
});
