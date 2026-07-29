#!/usr/bin/env node
// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - This deterministic asset exporter uses synchronous host file APIs.

import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { PNG } from "pngjs";

import { BRAND_ASSET_PATHS } from "./lib/brand-assets.ts";
import { encodePngIco, WINDOWS_ICON_SIZES } from "./lib/icon-export.ts";

const repositoryRoot = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "..",
);
const checkOnly = process.argv.includes("--check");

interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

interface BrandVariant {
  readonly name: string;
  readonly background: Rgb | null;
  readonly macos: string;
  readonly universal: string;
  readonly appleTouch: string;
  readonly favicon16: string;
  readonly favicon32: string;
  readonly faviconIco: string;
  readonly windowsIco: string;
}

const variants = [
  {
    name: "development",
    background: { red: 0x00, green: 0x63, blue: 0x9b },
    macos: BRAND_ASSET_PATHS.developmentDesktopIconPng,
    universal: BRAND_ASSET_PATHS.developmentUniversalIconPng,
    appleTouch: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
    favicon16: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
    favicon32: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
    faviconIco: BRAND_ASSET_PATHS.developmentWebFaviconIco,
    windowsIco: BRAND_ASSET_PATHS.developmentWindowsIconIco,
  },
  {
    name: "preview",
    background: { red: 0x26, green: 0x4d, blue: 0x3e },
    macos: BRAND_ASSET_PATHS.previewMacIconPng,
    universal: BRAND_ASSET_PATHS.previewLinuxIconPng,
    appleTouch: BRAND_ASSET_PATHS.previewWebAppleTouchIconPng,
    favicon16: BRAND_ASSET_PATHS.previewWebFavicon16Png,
    favicon32: BRAND_ASSET_PATHS.previewWebFavicon32Png,
    faviconIco: BRAND_ASSET_PATHS.previewWebFaviconIco,
    windowsIco: BRAND_ASSET_PATHS.previewWindowsIconIco,
  },
  {
    name: "nightly",
    background: { red: 0x21, green: 0x1b, blue: 0x4d },
    macos: BRAND_ASSET_PATHS.nightlyMacIconPng,
    universal: BRAND_ASSET_PATHS.nightlyLinuxIconPng,
    appleTouch: BRAND_ASSET_PATHS.nightlyWebAppleTouchIconPng,
    favicon16: BRAND_ASSET_PATHS.nightlyWebFavicon16Png,
    favicon32: BRAND_ASSET_PATHS.nightlyWebFavicon32Png,
    faviconIco: BRAND_ASSET_PATHS.nightlyWebFaviconIco,
    windowsIco: BRAND_ASSET_PATHS.nightlyWindowsIconIco,
  },
  {
    name: "production",
    background: null,
    macos: BRAND_ASSET_PATHS.productionMacIconPng,
    universal: BRAND_ASSET_PATHS.productionLinuxIconPng,
    appleTouch: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
    favicon16: BRAND_ASSET_PATHS.productionWebFavicon16Png,
    favicon32: BRAND_ASSET_PATHS.productionWebFavicon32Png,
    faviconIco: BRAND_ASSET_PATHS.productionWebFaviconIco,
    windowsIco: BRAND_ASSET_PATHS.productionWindowsIconIco,
  },
] as const satisfies ReadonlyArray<BrandVariant>;

function absolutePath(relativePath: string): string {
  return NodePath.join(repositoryRoot, relativePath);
}

function readPng(relativePath: string): PNG {
  return PNG.sync.read(NodeFS.readFileSync(absolutePath(relativePath)));
}

function encodePng(image: PNG): Buffer {
  return PNG.sync.write(image, { colorType: 6 });
}

function recolorIron(image: PNG, background: Rgb): PNG {
  const result = new PNG({ width: image.width, height: image.height });
  image.data.copy(result.data);

  for (let offset = 0; offset < result.data.length; offset += 4) {
    const red = result.data[offset] ?? 0;
    const green = result.data[offset + 1] ?? 0;
    const blue = result.data[offset + 2] ?? 0;
    const maximum = Math.max(red, green, blue);
    if (maximum > 105) continue;

    // Keep the approved light figure and ember blade unchanged. Map only the
    // iron-dark treatment, including its dark joint details.
    const shade = Math.min(1, 0.65 + maximum / 100);
    result.data[offset] = Math.round(background.red * shade);
    result.data[offset + 1] = Math.round(background.green * shade);
    result.data[offset + 2] = Math.round(background.blue * shade);
  }

  return result;
}

function resize(source: PNG, size: number): PNG {
  if (source.width === size && source.height === size) {
    return PNG.sync.read(encodePng(source));
  }

  const result = new PNG({ width: size, height: size });
  const xRatio = source.width / size;
  const yRatio = source.height / size;

  for (let targetY = 0; targetY < size; targetY += 1) {
    const sourceY = (targetY + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(source.height - 1, y0 + 1);
    const yWeight = sourceY - Math.floor(sourceY);

    for (let targetX = 0; targetX < size; targetX += 1) {
      const sourceX = (targetX + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(source.width - 1, x0 + 1);
      const xWeight = sourceX - Math.floor(sourceX);
      const targetOffset = (targetY * size + targetX) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = source.data[(y0 * source.width + x0) * 4 + channel] ?? 0;
        const topRight = source.data[(y0 * source.width + x1) * 4 + channel] ?? 0;
        const bottomLeft = source.data[(y1 * source.width + x0) * 4 + channel] ?? 0;
        const bottomRight = source.data[(y1 * source.width + x1) * 4 + channel] ?? 0;
        const top = topLeft + (topRight - topLeft) * xWeight;
        const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight;
        result.data[targetOffset + channel] = Math.round(top + (bottom - top) * yWeight);
      }
    }
  }

  return result;
}

const generated = new Map<string, Buffer>();
const productionSource = readPng(BRAND_ASSET_PATHS.approvedProductionIconPng);
const channelProofIcons = new Map<string, PNG>();

for (const variant of variants) {
  const icon = variant.background
    ? recolorIron(productionSource, variant.background)
    : productionSource;
  const png1024 = encodePng(icon);
  const png180 = encodePng(resize(icon, 180));
  const png16 = encodePng(resize(icon, 16));
  const png32 = encodePng(resize(icon, 32));
  const icoRenditions = WINDOWS_ICON_SIZES.map((size) => ({
    size,
    contents: encodePng(resize(icon, size)),
  }));
  const ico = encodePngIco(icoRenditions);
  channelProofIcons.set(variant.name, resize(icon, 256));

  generated.set(variant.macos, png1024);
  generated.set(variant.universal, png1024);
  generated.set(variant.appleTouch, png180);
  generated.set(variant.favicon16, png16);
  generated.set(variant.favicon32, png32);
  generated.set(variant.faviconIco, ico);
  generated.set(variant.windowsIco, ico);
}

const channelProof = new PNG({ width: 1104, height: 288, fill: true });
channelProof.data.fill(0xe9);
["production", "development", "preview", "nightly"].forEach((variantName, index) => {
  const icon = channelProofIcons.get(variantName);
  if (!icon) throw new Error(`Missing ${variantName} icon for the channel proof.`);
  PNG.bitblt(icon, channelProof, 0, 0, icon.width, icon.height, 16 + index * 272, 16);
});
generated.set("docs/brand/approved/proofs/channel-app-icon-family.png", encodePng(channelProof));

function requireGenerated(path: string): Buffer {
  const contents = generated.get(path);
  if (!contents) throw new Error(`SIGIDI icon generation did not produce ${path}.`);
  return contents;
}

generated.set(
  "apps/web/public/favicon.ico",
  requireGenerated(BRAND_ASSET_PATHS.developmentWebFaviconIco),
);
generated.set(
  "apps/web/public/favicon-16x16.png",
  requireGenerated(BRAND_ASSET_PATHS.developmentWebFavicon16Png),
);
generated.set(
  "apps/web/public/favicon-32x32.png",
  requireGenerated(BRAND_ASSET_PATHS.developmentWebFavicon32Png),
);
generated.set(
  "apps/web/public/apple-touch-icon.png",
  requireGenerated(BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng),
);
generated.set(
  "apps/marketing/public/favicon.ico",
  requireGenerated(BRAND_ASSET_PATHS.productionWebFaviconIco),
);
generated.set(
  "apps/marketing/public/favicon-16x16.png",
  requireGenerated(BRAND_ASSET_PATHS.productionWebFavicon16Png),
);
generated.set(
  "apps/marketing/public/favicon-32x32.png",
  requireGenerated(BRAND_ASSET_PATHS.productionWebFavicon32Png),
);
generated.set(
  "apps/marketing/public/apple-touch-icon.png",
  requireGenerated(BRAND_ASSET_PATHS.productionWebAppleTouchIconPng),
);
generated.set(
  "apps/marketing/public/icon.png",
  requireGenerated(BRAND_ASSET_PATHS.productionLinuxIconPng),
);
generated.set(
  "apps/desktop/resources/icon.png",
  requireGenerated(BRAND_ASSET_PATHS.productionLinuxIconPng),
);
generated.set(
  "apps/desktop/resources/icon.ico",
  requireGenerated(BRAND_ASSET_PATHS.productionWindowsIconIco),
);
const wordmark = NodeFS.readFileSync(absolutePath(BRAND_ASSET_PATHS.approvedWordmarkPng));
generated.set("apps/web/public/sigidi-wordmark.png", wordmark);
generated.set("apps/marketing/public/sigidi-wordmark.png", wordmark);
const mark = NodeFS.readFileSync(absolutePath(BRAND_ASSET_PATHS.approvedMarkSvg));
generated.set("apps/web/public/sigidi-mark.svg", mark);

const stale: Array<string> = [];
for (const [relativePath, contents] of generated) {
  const target = absolutePath(relativePath);
  if (checkOnly) {
    if (!NodeFS.existsSync(target) || !NodeFS.readFileSync(target).equals(contents)) {
      stale.push(relativePath);
    }
    continue;
  }

  NodeFS.mkdirSync(NodePath.dirname(target), { recursive: true });
  NodeFS.writeFileSync(target, contents);
}

if (stale.length > 0) {
  throw new Error(
    `Generated SIGIDI brand assets are stale:\n${stale.map((path) => `- ${path}`).join("\n")}`,
  );
}

console.log(
  checkOnly
    ? `Checked ${generated.size} SIGIDI brand assets.`
    : `Exported ${generated.size} SIGIDI brand assets.`,
);
