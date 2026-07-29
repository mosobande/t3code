// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vite-plus/test";

import {
  BRAND_ASSET_PATHS,
  DEVELOPMENT_ICON_OVERRIDES,
  DEVELOPMENT_PUBLIC_ICON_OVERRIDES,
  resolveWebAssetBrandForChannel,
  resolveWebAssetBrandForPackageVersion,
  resolveWebIconOverrides,
} from "./brand-assets.ts";

describe("brand-assets", () => {
  const repositoryRoot = NodePath.resolve(import.meta.dirname, "../..");

  function pngChunkTypes(contents: Buffer): ReadonlyArray<string> {
    const chunkTypes: Array<string> = [];
    let offset = 8;
    while (offset + 12 <= contents.length) {
      const length = contents.readUInt32BE(offset);
      chunkTypes.push(contents.toString("ascii", offset + 4, offset + 8));
      offset += length + 12;
    }
    return chunkTypes;
  }

  it("maps production web assets into the server package", () => {
    expect(resolveWebIconOverrides("production", "dist/client")).toEqual([
      {
        sourceRelativePath: BRAND_ASSET_PATHS.productionWebFaviconIco,
        targetRelativePath: "dist/client/favicon.ico",
      },
      {
        sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon16Png,
        targetRelativePath: "dist/client/favicon-16x16.png",
      },
      {
        sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon32Png,
        targetRelativePath: "dist/client/favicon-32x32.png",
      },
      {
        sourceRelativePath: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
        targetRelativePath: "dist/client/apple-touch-icon.png",
      },
    ]);
  });

  it("maps server build web assets to development icons", () => {
    expect(DEVELOPMENT_ICON_OVERRIDES[0]).toEqual({
      sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFaviconIco,
      targetRelativePath: "dist/client/favicon.ico",
    });
  });

  it("maps development web assets to the public splash and favicon files", () => {
    expect(DEVELOPMENT_PUBLIC_ICON_OVERRIDES).toEqual([
      {
        sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFaviconIco,
        targetRelativePath: "apps/web/public/favicon.ico",
      },
      {
        sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
        targetRelativePath: "apps/web/public/favicon-16x16.png",
      },
      {
        sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
        targetRelativePath: "apps/web/public/favicon-32x32.png",
      },
      {
        sourceRelativePath: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
        targetRelativePath: "apps/web/public/apple-touch-icon.png",
      },
    ]);
  });

  it("can target hosted web dist directly", () => {
    expect(resolveWebIconOverrides("production", "apps/web/dist")).toContainEqual({
      sourceRelativePath: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
      targetRelativePath: "apps/web/dist/apple-touch-icon.png",
    });
  });

  it("maps hosted nightly web assets to nightly icons", () => {
    expect(resolveWebIconOverrides("nightly", "apps/web/dist")).toContainEqual({
      sourceRelativePath: BRAND_ASSET_PATHS.nightlyWebFaviconIco,
      targetRelativePath: "apps/web/dist/favicon.ico",
    });
  });

  it("maps hosted release channels to web asset brands", () => {
    expect(resolveWebAssetBrandForChannel("latest")).toBe("production");
    expect(resolveWebAssetBrandForChannel("nightly")).toBe("nightly");
  });

  it("maps package versions to web asset brands", () => {
    expect(resolveWebAssetBrandForPackageVersion("0.0.29")).toBe("production");
    expect(resolveWebAssetBrandForPackageVersion("0.0.29-nightly.20260723.882")).toBe("nightly");
  });

  it("keeps development, preview, nightly, and production icon families separate", () => {
    expect([
      BRAND_ASSET_PATHS.developmentIconComposerProject,
      BRAND_ASSET_PATHS.nightlyIconComposerProject,
      BRAND_ASSET_PATHS.productionIconComposerProject,
    ]).toEqual([
      "assets/dev/app-icon.icon",
      "assets/nightly/app-icon.icon",
      "assets/prod/app-icon.icon",
    ]);
    expect(BRAND_ASSET_PATHS.developmentDesktopIconPng).toMatch(/^assets\/dev\/blueprint-/);
    expect(BRAND_ASSET_PATHS.previewMacIconPng).toMatch(/^assets\/preview\/preview-/);
    expect(BRAND_ASSET_PATHS.nightlyMacIconPng).toMatch(/^assets\/nightly\/nightly-/);
    expect(BRAND_ASSET_PATHS.productionMacIconPng).toMatch(/^assets\/prod\/black-/);
  });

  it("keeps the production mark inside a centered transparent safe area", () => {
    const image = PNG.sync.read(
      NodeFS.readFileSync(NodePath.join(repositoryRoot, BRAND_ASSET_PATHS.productionMacIconPng)),
    );
    let minimumX = image.width;
    let minimumY = image.height;
    let maximumX = -1;
    let maximumY = -1;

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0) continue;
        minimumX = Math.min(minimumX, x);
        minimumY = Math.min(minimumY, y);
        maximumX = Math.max(maximumX, x);
        maximumY = Math.max(maximumY, y);
      }
    }

    expect(image.data[3]).toBe(0);
    expect(maximumX - minimumX + 1).toBeLessThanOrEqual(900);
    expect(maximumY - minimumY + 1).toBeLessThanOrEqual(900);
    expect(Math.abs((minimumX + maximumX) / 2 - (image.width - 1) / 2)).toBeLessThan(32);
    expect(Math.abs((minimumY + maximumY) / 2 - (image.height - 1) / 2)).toBeLessThan(32);
  });

  it("exports the approved sidebar mark through the checked asset pipeline", () => {
    expect(BRAND_ASSET_PATHS.approvedMarkSvg).toBe("docs/brand/approved/sigidi-mark.svg");
  });

  it("keeps generated approved PNG sources free of volatile metadata", () => {
    const generatedSources = [
      BRAND_ASSET_PATHS.approvedProductionIconPng,
      "docs/brand/approved/assets/sigidi-lockup.png",
      "docs/brand/approved/assets/sigidi-mark-1024.png",
      BRAND_ASSET_PATHS.approvedWordmarkPng,
    ];

    for (const relativePath of generatedSources) {
      const contents = NodeFS.readFileSync(NodePath.join(repositoryRoot, relativePath));
      expect(pngChunkTypes(contents)).not.toContain("tIME");
      expect(contents.includes("date:create")).toBe(false);
      expect(contents.includes("date:modify")).toBe(false);
      expect(contents.includes("Thumb::MTime")).toBe(false);
    }
  });
});
