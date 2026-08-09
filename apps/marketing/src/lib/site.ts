import { productProfile } from "@t3tools/shared/productProfile";

export const IS_SIGIDI_MARKETING = productProfile.publishableAsSigidi;

export const GITHUB_REPOSITORY_URL = IS_SIGIDI_MARKETING
  ? "https://github.com/quantipixels/sigidi"
  : "https://github.com/pingdotgg/t3code";

export const IOS_APP_STORE_URL =
  "https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824";

export const ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.t3tools.t3code";

export const MARKETING_STATS = {
  githubStars: IS_SIGIDI_MARKETING ? undefined : "14k+",
  users: IS_SIGIDI_MARKETING ? undefined : "100,000",
} as const;
